/* ¿El AUTOPEDIDO de Ruta llega a la base, de punta a punta, en un navegador? (6/11/2026, Lucas: «no me funcionan los
   autopedidos, no aparecen en pedidos y no reservan stock»).
     node _tools/pruebas/probar_autopedido_ruta_ui.js            → contra producción
     BASE_URL=http://localhost:8080/app.html node …              → contra lo local
   Entra con el usuario robot, abre Ruta y manda un pedido PRUEBA por la MISMA cola del celular (`_npColaPoner` +
   `_npColaProcesar`, lo que hace «Guardar»). Mira qué contesta, si sale de la cola, si la base lo tiene y si apartó el
   stock. Al final lo cancela. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let cli;
const ev = (e, ms) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 30000))]);
async function esperar(e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(e, 10000); if (v) return v; } catch (x) {} await pausa(300); } return null; }
const rpc = (fn, p) => ev(`(async function(){ var sb=await _sbPermiso(true); var r=await fetch(sb.url+'/rest/v1/rpc/${fn}',{method:'POST',headers:{apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(p || {}))}}); return r.json(); })()`, 30000);

(async () => {
  cli = await cdp.abrir();
  await cli.enviar('Page.enable', {});
  const errores = [];
  await cli.enviar('Runtime.enable', {});
  cli.escuchar((m, p) => {
    if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    if (m === 'Runtime.exceptionThrown') errores.push(String(p.exceptionDetails && (p.exceptionDetails.exception && p.exceptionDetails.exception.description || p.exceptionDetails.text)).slice(0, 200));
  });
  await cli.enviar('Page.navigate', { url: URL_APP });
  await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000);
  await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))}; document.getElementById('loginRemember').checked=true; panelDoLogin(); 1`);
  const ok = await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario&&!!(window._palancaVal&&_palancaVal('stockArma'))`, 40000);
  console.log('login:', !!ok);
  await ev(`go('ruta'); 1`);
  const hayNp = await esperar(`typeof _npColaPoner==='function'&&typeof _npColaProcesar==='function'`, 40000);
  console.log('Ruta lista (cola del autopedido):', !!hayNp);
  const ent = await rpc('robot_entidades_pantalla', {});
  const E = (ent && ent.entidades) || ent || {};
  const pid = E.producto_id != null ? E.producto_id : 46;
  const coid = 'robot-np-' + Date.now();
  const fe = new Date(Date.now() + 2 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const data = { canal: 'Home', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: fe, dia: '', horario: '', nombre: 'PRUEBA Robot', telefono: '5490000000001',
    pago: 'Transferencia', envio: 0, items: [{ id: pid, qty: 1 }], repartidor: 'robot', total: 1000, subtotalSinDescuento: 1000, descuento: 0, descuentoManual: 0,
    descuentoManualEsAutoridad: false, descuentoGlobalPct: 0, descuentoReceta: '', propina: 0, tipoPedido: '', deposito: 'prueba', origen: 'Pendiente',
    estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', barrioPrivado: 'PRUEBA', subBarrio: '', barrio: 'PRUEBA', lote: 'PRUEBA', clientOrderId: coid };
  const t0 = Date.now();
  await ev(`_npColaPoner({coid:${JSON.stringify(coid)},d:${JSON.stringify(data)},nom:'PRUEBA Robot',total:1000,resumen:'',t:Date.now(),est:'enviando',intentos:0}); _npColaProcesar(); 1`);
  let est = null;
  for (let k = 0; k < 60; k++) {
    est = JSON.parse(await ev(`JSON.stringify({cola:_npColaLeer().map(function(x){return {coid:x.coid,est:x.est,err:x.err,int:x.intentos,fallos:x.fallos};}), de:window.__altaDe||null, nd:null})`));
    if (!est.cola.some((x) => x.coid === coid)) break;
    await pausa(1000);
  }
  console.log('después de', Math.round((Date.now() - t0) / 1000), 's →', JSON.stringify(est));
  const v = await rpc('robot_verificar', { p: { pedido: 'buscar:' + coid } }).catch(() => null);
  const enBase = await rpc('robot_verificar', { p: {} }).catch(() => null);
  console.log('errores JS en la página:', errores.length ? errores.slice(0, 5) : 'ninguno');
  console.log('para cancelar: clientOrderId', coid);
  await cli.cerrar();
  process.exit(0);
})().catch((e) => { console.log('FALLÓ', e && e.message); process.exit(1); });
