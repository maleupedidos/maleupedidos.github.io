/* LA SESIÓN VIEJA SE CIERRA (4/11/2026). Prueba la reentrada con el usuario robot, con Apps Script CORTADO en la red:
     A) un aparato con la sesión de antes (sin `mc_sbses`): ve «Entrá de nuevo con tu PIN», no puede seguir, entra con
        el PIN y queda con la sesión de la base y sus palancas;
     B) lo mismo con un movimiento de Ruta sin subir (un asignarReparto de un pedido PRUEBA): la cola no se pierde y,
        al entrar, sube por la base (0 POST a Apps Script).
   node _tools/robot/reentrada.js   (BASE_URL=http://localhost:8080/app.html para lo local) */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('../pruebas/cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ahora = new Date(), dos = (n) => String(n).padStart(2, '0');
const CORRIDA = 'reent' + dos(ahora.getUTCHours()) + dos(ahora.getUTCMinutes()) + dos(ahora.getUTCSeconds());
let ok = 0, mal = 0;
const ver = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c || d === undefined ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
function cred() {
  if (process.env.ROBOT_USUARIO && process.env.ROBOT_PIN) return { usuario: process.env.ROBOT_USUARIO, pin: process.env.ROBOT_PIN };
  const j = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8')); return { usuario: j.usuario, pin: String(j.pin) };
}
(async () => {
  const C = cred();
  const cli = await cdp.abrir();
  const ev = (e, ms) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 30000))]);
  const esperar = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(expr, 10000); if (v) return v; } catch (e) {} await pausa(300); } return null; };
  const cortadas = [];
  await cli.enviar('Fetch.enable', { patterns: [{ urlPattern: '*script.google.com*' }, { urlPattern: '*script.googleusercontent.com*' }] });
  cli.escuchar((m, p) => {
    if (m === 'Fetch.requestPaused') { cortadas.push((p.request.method || '') + ' ' + String(p.request.url).slice(0, 100)); cli.enviar('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }).catch(() => {}); }
    if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('maleu_ensayo','1');}catch(e){} window.__reentradaProbar=true;` });
  await cli.enviar('Page.enable', {});
  await cli.enviar('Page.navigate', { url: URL_APP });
  await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000);
  await ev(`document.getElementById('loginUser').value=${JSON.stringify(C.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(C.pin)}; document.getElementById('loginRemember').checked=true; panelDoLogin(); 1`);
  ver('el robot entra con PIN (sesión de la base)', !!(await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario&&!!localStorage.getItem('mc_sbses')`, 30000)));
  await pausa(3000);
  const rpc = (fn, p, crudo) => ev(`(async function(){ var sb=await _sbPermiso(true); var r=await fetch(sb.url+'/rest/v1/rpc/${fn}',{method:'POST',headers:{apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(crudo ? (p || {}) : { p: p || {} }))}});
    var t=await r.text(); try{ return Object.assign({http:r.status},JSON.parse(t)); }catch(e){ return {http:r.status,texto:t.slice(0,200)}; } })()`);

  /* La sesión vieja: sin la sesión de la base y con el token de Apps Script de antes. Se recarga. */
  const viejo = async (cola) => {
    await ev(`localStorage.removeItem('mc_sbses'); localStorage.removeItem('mc_sbtok'); localStorage.setItem('maleu_token','viejo-de-prueba');
      ${cola ? `var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); d.syncQueue=${JSON.stringify(cola)}; localStorage.setItem('maleu_ruta',JSON.stringify(d));` : ''} 1`);
    await cli.enviar('Page.reload', {});
    await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario`, 60000);
  };
  const entrarConPin = async (pin) => {
    await ev(`document.getElementById('reentradaPin').value=${JSON.stringify(pin)}; document.getElementById('reentradaForm').requestSubmit(); 1`);
  };

  /* ── A ── */
  console.log('A) sesión vieja, sin cola');
  await viejo(null);
  ver('A: aparece «Entrá de nuevo con tu PIN»', !!(await esperar(`!!document.getElementById('reentrada')`, 15000)));
  ver('A: tapa toda la app (lo de atrás no se toca)', !!(await ev(`(function(){ var r=document.getElementById('reentrada'); if(!r)return false; var e=document.elementFromPoint(innerWidth/2,innerHeight-5); return r.contains(e); })()`)));
  ver('A: el usuario va fijo', !!(await ev(`(function(){ var u=document.getElementById('reentradaUser'); return u&&u.readOnly&&u.value===${JSON.stringify(C.usuario)}; })()`)));
  await entrarConPin('000000');
  ver('A: con un PIN mal, no entra y lo dice', !!(await esperar(`(function(){ var e=document.getElementById('reentradaErr'); return !!(document.getElementById('reentrada')&&e&&e.textContent.length>3); })()`, 15000)));
  await entrarConPin(C.pin);
  ver('A: con su PIN entra y el cartel se va', !!(await esperar(`!document.getElementById('reentrada')`, 20000)));
  ver('A: queda con la sesión de la base y sus palancas', !!(await ev(`!!_sbSesLeer()&&!!(_palancaVal('lecArma'))`)));
  await cli.enviar('Page.reload', {}); await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario`, 60000); await pausa(3000);
  ver('A: al volver a abrir no lo pide otra vez (una sola vez)', !(await ev(`!!document.getElementById('reentrada')`)));

  /* ── B ── */
  console.log('B) sesión vieja con un movimiento de Ruta sin subir');
  const E = (await rpc('robot_entidades_pantalla', {}, true)) || {};
  const ent2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const alta = await rpc('pedido_alta_directo', { canal: 'Pilar', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: ent2, dia: '', horario: '', nombre: E.cliente || 'PRUEBA Robot',
    telefono: String(E.telefono || '5490000000001'), pago: 'Transferencia', envio: 0, items: [{ id: E.producto_id, qty: 1 }], total: 1000, subtotalSinDescuento: 1000, descuento: 0, descuentoManual: 0,
    descuentoGlobalPct: 0, descuentoReceta: null, propina: 0, tipoPedido: '', deposito: E.deposito || 'prueba', barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '', origen: 'Pendiente',
    estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: 'robot-' + CORRIDA + '-alta' });
  ver('B: el pedido PRUEBA para la cola', !!(alta && alta.ok && alta.n), alta);
  const item = { action: 'asignarReparto', pedidos: [{ h: 'Pilar', id: String(alta.n), r: -Number(alta.n), c: E.cliente || 'PRUEBA Robot' }], quien: C.usuario, usuario: C.usuario, ts: Date.now(), clientOpId: 'robot-' + CORRIDA + '-reparto' };
  const nCortadas = cortadas.length;
  await viejo([item]);
  ver('B: aparece el cartel y dice que hay 1 movimiento sin subir', !!(await esperar(`(function(){ var r=document.getElementById('reentrada'); return !!(r&&/1<\\/b> movimiento/.test(r.innerHTML)); })()`, 15000)));
  await entrarConPin(C.pin);
  ver('B: entra', !!(await esperar(`!document.getElementById('reentrada')`, 20000)));
  ver('B: la cola sigue en el teléfono (no se perdió)', (await ev(`(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).length`)) === 1);
  await ev(`go('ruta'); 1`);
  const subio = await esperar(`(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).length===0`, 45000);
  ver('B: al abrir Ruta, la cola sube', !!subio, await ev(`JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue`).catch(() => null));
  const enBase = await rpc('robot_orden_existe', { client_op_id: item.clientOpId }, false).catch(() => null);
  const aps = (await ev(`(window.__ensayoApps||[]).filter(function(x){return x.m==='POST'&&x.a==='asignarReparto';}).length`)) || 0;
  ver('B: subió por la base, no por Apps Script (0 POST asignarReparto a Apps Script)', aps === 0 && !cortadas.slice(nCortadas).some((x) => /^POST/.test(x)), { aps, cortadas: cortadas.slice(nCortadas), enBase });
  const li = await rpc('robot_limpiar', { p_corrida: CORRIDA }, true).catch((e) => ({ error: e.message }));
  console.log('  limpieza: ' + JSON.stringify(li).slice(0, 160));
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('reventó: ' + (e && e.message)); process.exit(1); });
