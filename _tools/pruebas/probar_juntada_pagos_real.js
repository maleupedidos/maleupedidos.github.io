/* LA CUENTA DE LA JUNTADA, DE PUNTA A PUNTA Y DE VERDAD (21/11/2026). Chrome como el ROBOT (~/.maleu/robot.json), 390 px,
   clics de mouse reales. OK de Tadeo en la sesión Backend, 20:27: «hacé la prueba de la juntada con un pedido PRUEBA en
   Galicia, borrándola después».
     BASE_URL=http://localhost:8150/app.html [OUT=<carpeta>] node _tools/pruebas/probar_juntada_pagos_real.js
   1. Alta «PRUEBA Robot» en Pilar por la directa (producto y depósito «prueba»: no toca stock real), entregado, marcado
      «Juntada o evento» y con 4 comensales «PRUEBA Comensal N» → somos 5.
   2. La ficha: «Cada uno», y «Falta» de 4 personas con el mouse → cada uno es un cobro parcial A GALICIA con su nota.
      Mide: «Pagaron 4 de 5», la base trae los 4 pagos con nota y cuenta galicia, el pedido sigue sin cobrar.
   3. El 5.º → la base lo cierra: Cobrado.
   4. Deshace el cobro, `robot_limpiar`, e imprime el order_key para borrar a mano lo de Galicia (robot_limpiar solo borra
      la cuenta «prueba») y los comensales. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'http://localhost:8150/app.html';
const OUT = process.env.OUT || os.tmpdir();
const CORRIDA = 'junt' + Date.now().toString(36), PREFIJO = 'robot-' + CORRIDA + '-';
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let cli, ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 600) : '')); } };
const ev = (e, ms) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('sin respuesta')), ms || 30000))]);
async function esperar(e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(e, 10000); if (v) return v; } catch (x) {} await T(300); } return null; }
const rpc = (fn, p) => ev(`(async function(){ var sb=await _sbPermiso(true); if(!sb)return {ok:false,error:'sin permiso'};
  var r=await fetch(sb.url+'/rest/v1/rpc/${fn}',{method:'POST',headers:{apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(p || {}))}});
  var t=await r.text(); try{ return Object.assign({http:r.status},JSON.parse(t)); }catch(e){ return {http:r.status,texto:t.slice(0,200)}; } })()`);
const directa = (accion, body) => ev(`(async function(){ var b=${JSON.stringify(body)}; if(!b.ts)b.ts=Date.now();
  try{ var d=await _ordenDirecta(b,null,${JSON.stringify(accion)}); return d?{d:d}:{fueApps:b._noDirecto||'?'}; }catch(e){ return {error:String(e&&e.message||e)}; } })()`);
async function clic(sel, txt) {
  const b = await ev(`(function(){ var l=[].slice.call(document.querySelectorAll(${JSON.stringify(sel)})).filter(function(x){ var r=x.getBoundingClientRect(); return r.width>0&&r.height>0&&(!${JSON.stringify(txt || '')}||x.textContent.indexOf(${JSON.stringify(txt || '')})>=0); });
    var e=l[0]; if(!e)return null; e.scrollIntoView({block:'center'}); var r=e.getBoundingClientRect(); var x=r.left+r.width/2, y=r.top+r.height/2, h=document.elementFromPoint(x,y);
    return {x:x,y:y,mismo:!!h&&(h===e||e.contains(h))}; })()`);
  if (!b) return null;
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
  return b;
}
async function foto(nom) { const r = await cli.enviar('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, nom + '.png'); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); console.log('       ' + f); }
const COM = `(function(){ var c=document.querySelector('#ordBody .com'); if(!c)return null; return { cuenta:((c.querySelector('.com-cuenta')||{}).textContent||'').replace(/\\s+/g,' '),
  pagaron:[].filter.call(c.querySelectorAll('.com-est.ok'),function(x){return x.getClientRects().length;}).length, faltas:c.querySelectorAll('button.com-pagar').length }; })()`;

(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `;try{localStorage.setItem('maleu_ensayo','1');localStorage.setItem('maleu_sb_open','1');}catch(e){}` });
  await cli.enviar('Page.enable', {});
  /* Los «¿confirmás?» del pago se aceptan, como Tadeo. */
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cli.enviar('Page.navigate', { url: URL_APP });
  let P = null, n = '';
  try {
    if (!await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000)) throw new Error('no apareció el login');
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))}; panelDoLogin(); 1`);
    if (!await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario&&window.D&&Array.isArray(D.pedidos)&&D.pedidos.length>50`, 90000)) throw new Error('no entró o no cargó los pedidos');
    await T(2000);
    console.log('\n== 1. El pedido PRUEBA (corrida ' + CORRIDA + ') ==');
    const E = await rpc('robot_entidades_pantalla', {});
    if (!E || !E.ok || (E.faltan || []).length) throw new Error('sin las entidades PRUEBA: ' + JSON.stringify(E).slice(0, 200));
    const prod = await ev(`(function(){ var p=(D.stock||[]).find(function(x){return String(x.a||'').trim()===${JSON.stringify(E.producto || 'PRUEBA')};}); return p?{precio:Number(p.p)||1}:null; })()`);
    const precio = (prod && prod.precio) || 1, tot = precio * 5;
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
    const al = await directa('altaPedido', { canal: 'Pilar', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: hoy, dia: '', horario: '', nombre: E.cliente || 'PRUEBA Robot', telefono: String(E.telefono || '5490000000001'),
      pago: 'Transferencia', envio: 0, items: [{ id: E.producto_id, qty: 5 }], repartidor: '', total: tot, subtotalSinDescuento: tot, descuento: 0, descuentoManual: 0, descuentoGlobalPct: 0, descuentoReceta: null,
      propina: 0, tipoPedido: '', deposito: E.deposito || 'prueba', barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '', origen: 'Pendiente', estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: PREFIJO + 'alta' });
    if (!(al && al.d && al.d.ok)) throw new Error('alta PRUEBA: ' + JSON.stringify(al).slice(0, 200));
    n = String(al.d.n || al.d.ref);
    await ev(`_recargarPedidos(); 1`).catch(() => 0);
    P = await esperar(`(function(){ var p=(D.pedidos||[]).find(function(x){return String(x.n)===${JSON.stringify(n)}&&String(x.c||'').indexOf('PRUEBA Robot')>=0;}); return p?{h:p.h,n:p.n,r:p.r||0,$:p.$}:null; })()`, 20000);
    if (!P) throw new Error('el alta ' + n + ' no apareció');
    console.log('       ' + P.h + ' #' + n + ' · total $' + tot + ' (5 × ' + precio + ')');
    const base = { hoja: P.h, id: String(P.n), row: P.r };
    await directa('marcarArmado', { action: 'marcarArmado', pedidos: [{ h: P.h, id: String(P.n), r: P.r, c: 'PRUEBA Robot' }], armado: true, usuario: 'robot', clientOpId: PREFIJO + 'armar' });
    const en = await directa('marcarEntregado', Object.assign({ action: 'marcarEntregado', cobrado: false, propina: 0, repartidor: '', clientOpId: PREFIJO + 'entregar' }, base));
    chk('entregado', en && en.d && en.d.ok, en);
    const gr = await directa('pedidoGrupal', { action: 'pedidoGrupal', hoja: P.h, row: P.r, id: String(P.n), valor: 'Sí', clientOpId: PREFIJO + 'grupal' });
    chk('marcado «Juntada o evento»', gr && gr.d && gr.d.ok, gr);
    for (let i = 1; i <= 4; i++) {
      const r = await rpc('juntada_integrante_directo', { p: { action: 'juntadaIntegrante', grp: 'Pedido ' + P.h + ' ' + n, nombre: 'PRUEBA Comensal ' + i } });
      if (!(r && r.ok)) chk('comensal ' + i, false, r);
    }
    await ev(`_recargarPedidos(); _COM.t=0; 1`).catch(() => 0);
    await esperar(`(function(){ var p=(D.pedidos||[]).find(function(x){return x.h===${JSON.stringify(P.h)}&&String(x.n)===${JSON.stringify(n)};}); return p&&p.es==='Entregado'&&String(p.grp||'').trim(); })()`, 20000);

    console.log('\n== 2. «Falta» de 4 personas, con el mouse ==');
    const abrir = async () => { await ev(`go('inicio'); openOrdDetail(${JSON.stringify(P.h)},${JSON.stringify(n)},${P.r}); 1`); await T(1500);
      await ev(`(function(){ var m=document.getElementById('ordMas'); if(m)m.open=true; return 1; })()`); };
    await abrir();
    let c0 = await esperar(`(function(){ var c=${COM}; return c&&c.faltas>=5?c:null; })()`, 20000);
    chk('la ficha: «' + (c0 && c0.cuenta) + '» y 5 «Falta»', !!c0 && /Cada uno: \$/.test(c0.cuenta) && /son 5/.test(c0.cuenta) && /Pagaron 0 de 5/.test(c0.cuenta), c0 || await ev(COM));
    await foto('juntada_prueba_0');
    for (let i = 0; i < 4; i++) {
      const b = await clic('#ordBody button.com-pagar');
      if (!b || !b.mismo) { chk('toque en «Falta» ' + (i + 1), false, b); break; }
      const c = await esperar(`(function(){ var c=${COM}; return c&&c.pagaron>=${i + 1}?c:null; })()`, 20000);
      if (!c) { chk('pago ' + (i + 1) + ' se ve', false, await ev(COM)); break; }
    }
    const c4 = await ev(COM);
    chk('«Pagaron 4 de 5 · falta …» en la ficha (' + (c4 && c4.cuenta) + ')', !!c4 && /Pagaron 4 de 5/.test(c4.cuenta) && c4.faltas === 1, c4);
    await foto('juntada_prueba_4');
    const d4 = await rpc('pedido_cobro_pantalla', { p: { h: P.h, n: n, r: P.r } });
    const pg4 = (d4 && d4.pagos) || [];
    console.log('       pagos en la base: ' + JSON.stringify(pg4.map((x) => ({ monto: x.monto, cuenta: x.cuenta, nota: x.nota }))));
    /* La cuenta es la por defecto de QUIEN COBRA: Galicia para Tadeo; para el robot, «prueba» (aislada a propósito: sus
       pruebas no tocan la plata de verdad). */
    const defCta = await ev(`(function(){ var c=((_cajaCuentas()||[]).filter(function(x){return x&&x.def&&x.tipo!=='efectivo';})[0]||{}); return String(c.nombre||c.id||''); })()`);
    chk('la base tiene 4 pagos a cuenta, a la cuenta por defecto (' + defCta + '), con la nota de cada uno', pg4.length === 4 && pg4.every((x) => String(x.cuenta).toLowerCase() === defCta.toLowerCase() && /^Juntada: /.test(x.nota)), pg4);
    const p4 = await ev(`(function(){ var p=(D.pedidos||[]).find(function(x){return x.h===${JSON.stringify(P.h)}&&String(x.n)===${JSON.stringify(n)};}); return p?p.ep:''; })()`);
    chk('el pedido sigue sin cobrar (' + p4 + ')', p4 !== 'Cobrado', p4);

    console.log('\n== 3. El 5.º ==');
    const b5 = await clic('#ordBody button.com-pagar');
    chk('toque en el último «Falta»', !!b5 && b5.mismo, b5);
    let d5 = null; for (let k = 0; k < 15; k++) { d5 = await rpc('pedido_cobro_pantalla', { p: { h: P.h, n: n, r: P.r } }); if (d5 && (d5.pagos || []).length >= 5) break; await T(1000); }
    await ev(`_recargarPedidos(); 1`).catch(() => 0);
    const p5 = await esperar(`(function(){ var p=(D.pedidos||[]).find(function(x){return x.h===${JSON.stringify(P.h)}&&String(x.n)===${JSON.stringify(n)};}); return p&&p.ep==='Cobrado'?p.ep:null; })()`, 25000);
    chk('con el último, el pedido queda Cobrado (' + (p5 || 'no') + ') · 5 pagos en la base', p5 === 'Cobrado' && (d5 && d5.pagos || []).length === 5, { ep: p5, pagos: d5 && d5.pagos && d5.pagos.length });
    await abrir(); await T(1500);
    const c5 = await ev(COM);
    chk('la ficha dice «Cobrado» y nadie con «Falta»', !!c5 && /Cobrado/.test(c5.cuenta) && c5.faltas === 0, c5);
    await foto('juntada_prueba_5');
  } catch (e) { mal++; console.log('  MAL  reventó: ' + e.message); }
  finally {
    if (P) {
      console.log('\n== 4. Limpieza ==');
      const d = await directa('descobrar', { action: 'descobrar', motivo: 'prueba de la juntada', clientOpId: PREFIJO + 'descobrar', hoja: P.h, id: String(P.n), row: P.r }).catch((e) => ({ error: e.message }));
      console.log('       deshacer el cobro: ' + JSON.stringify(d && (d.d || d)).slice(0, 160));
      const li = await rpc('robot_limpiar', { p_corrida: CORRIDA }).catch((e) => ({ error: e.message }));
      console.log('       robot_limpiar: ' + JSON.stringify(li).slice(0, 300));
      console.log('       PEDIDO=' + P.h + '|' + n + ' · CORRIDA=' + CORRIDA);
    }
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    try { cli.matar(); } catch (e) {}
    process.exit(mal ? 1 : 0);
  }
})();
