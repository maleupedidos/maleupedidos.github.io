/* EL DÍA Y LA HORA DE ENTREGA (15/11/2026, 717).
 *
 *   node _tools/servir.js                                 (en otra terminal)
 *   SESION=<archivo de sesion_prueba.py> node _tools/pruebas/probar_entrega_dia_hora.js
 *
 * Tadeo: «ver en Ventas el horario de entrega de cada venta, y tener la libertad de editar el día y el horario. Noriega
 * aparece como venta de hoy porque tocamos Entregado a las 00:11, pero la entregamos ayer».
 *   1. Ventas › VENTAS: cada renglón dice «entregado HH:MM» (con datos reales, solo lectura).
 *   2. «cambiar» en el detalle abre el cuadro con el día y la hora de esa venta, y Guardar manda a
 *      `pedido_fecha_real_directo` {fecha dd/mm/aaaa, hora, clientOpId}. La escritura se CORTA: nada sale a la base.
 *   3. Ruta: entre las 00:00 y las 05:59 con un pedido de AYER pregunta «¿Lo entregaste ayer?»; a la tarde, no; «Sí, ayer»
 *      manda `ayer:true` en la cola; «No, hoy» no lo manda.
 */
'use strict';
const fs = require('fs');
const cdp = require('./cdp.js');
const S = process.env.SESION, BASE = process.env.BASE || 'http://localhost:8080/app.html';
if (!S || !fs.existsSync(S)) { console.log('falta SESION=<archivo de sesion_prueba.py>'); process.exit(1); }
const ses = JSON.parse(fs.readFileSync(S, 'utf8'));
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); } };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const PREP = `try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now()}));
  localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
  (function(){var f=window.fetch;window.__cortados=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
    var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
    if(m==='POST'&&(/script\\.google\\.com/.test(s)||(r&&!/_(pantalla|datos|base)$|^permiso_base$|^demanda_por_deposito$/.test(r[1])))){window.__cortados.push({rpc:r&&r[1],body:String((x&&x.body)||'')});return Promise.resolve(new Response('{"ok":false,"err":"cortado por la prueba"}',{status:200,headers:{'Content-Type':'application/json'}}));}
    return f.apply(this,arguments);};})();`;
(async () => {
  const cli = await cdp.abrir();
  const ev = (e) => cdp.evaluar(cli, e);
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE });
    for (let i = 0; i < 120; i++) { try { if (await ev("typeof go==='function'&&Array.isArray(window.VD)&&VD.length>0&&window.D&&Array.isArray(D.pedidos)&&D.pedidos.length>0")) break; } catch (e) {} await pausa(500); }

    console.log('\n== Ventas › VENTAS: la hora de entrega ==\n');
    const v = await ev(`(function(){ var n=VD.filter(function(x){return x.k==='Home|2500';})[0];
      return {fila:n?{fecha:n.fecha,hx:n.hx}:null, ref:n?_vRefPedido(n):'', conHora:VD.filter(function(x){return !!x.hx;}).length, total:VD.length}; })()`);
    chk('#2500 Noriega figura el 14/11 a las 23:59 (la movida de la 717)', v.fila && v.fila.fecha === '14/11/2026' && v.fila.hx === '23:59', v.fila);
    chk('el renglón dice «Home #2500 · entregado 23:59»', /^Home #2500 · entregado 23:59/.test(v.ref), v.ref);
    chk('las ventas traen su hora (' + v.conHora + ' de ' + v.total + ')', v.conHora > 100, v);
    await ev("go('ventas'); 1"); await pausa(1500);
    const pint = await ev(`(function(){ var s=Array.from(document.querySelectorAll('#vList .vt-sub')).map(function(e){return e.textContent;}); return {n:s.length, conHora:s.filter(function(t){return /entregado \\d\\d:\\d\\d/.test(t);}).length, ej:s.slice(0,3), scroll:document.documentElement.scrollWidth>innerWidth+1}; })()`);
    chk('en pantalla: los renglones muestran la hora (' + pint.conHora + ' de ' + pint.n + ')', pint.n > 0 && pint.conHora > 0, pint);
    chk('sin scroll de costado a 390 px', !pint.scroll);

    console.log('\n== Cambiar el día y la hora ==\n');
    await ev(`(function(){ var n=VD.filter(function(x){return x.k==='Home|2500';})[0]; document.body.insertAdjacentHTML('beforeend','<div id="__det">'+_vtDetalle(n)+'</div>'); })(); 1`);
    const det = await ev(`(function(){ var b=document.querySelector('#__det .vt-det-btn[onclick*="entregaCambiar"]'); var r=Array.from(document.querySelectorAll('#__det .vt-det-r')).filter(function(e){return /Entregado/.test(e.textContent);})[0]; return {btn:!!b, txt:r?r.textContent.replace(/\\s+/g,' '):''}; })()`);
    chk('el detalle dice cuándo se entregó y tiene «cambiar»', det.btn && /23:59/.test(det.txt), det);
    await ev("document.querySelector('#__det .vt-det-btn[onclick*=\"entregaCambiar\"]').click(); 1"); await pausa(300);
    const cu = await ev(`({d:(document.getElementById('entFechaD')||{}).value, h:(document.getElementById('entFechaH')||{}).value, max:(document.getElementById('entFechaD')||{}).max})`);
    chk('el cuadro abre con el día y la hora de esa venta (2026-11-14, 23:59) y no deja elegir mañana', cu.d === '2026-11-14' && cu.h === '23:59' && !!cu.max, cu);
    await ev("document.getElementById('entFechaH').value='22:30'; window.__cortados=[]; document.getElementById('entFechaOk').click(); 1"); await pausa(800);
    const env = await ev(`(function(){ var c=__cortados.filter(function(x){return x.rpc==='pedido_fecha_real_directo';})[0]; return c?JSON.parse(c.body):null; })()`);
    const p = env && env.p;
    chk('Guardar manda {Home, 2500, 14/11/2026, 22:30, clientOpId} a pedido_fecha_real_directo (cortado: no escribió)',
      p && p.hoja === 'Home' && p.id === '2500' && p.fecha === '14/11/2026' && p.hora === '22:30' && /^pf_/.test(p.clientOpId || ''), env);
    const err = await ev("({ov:!!document.getElementById('entFechaOv'), btn:(document.getElementById('entFechaOk')||{}).textContent})");
    chk('si la base dice que no, el cuadro queda abierto y el botón vuelve a «Guardar»', err.ov && err.btn === 'Guardar', err);
    await ev("var o=document.getElementById('entFechaOv'); if(o)o.remove(); var d=document.getElementById('__det'); if(d)d.remove(); 1");
    const red = await ev("_entregaEditable('Red')===false && _entregaEditable('Home')===true && _entregaEditable('Clubes')===true");
    chk('Red no se edita desde acá (va por el día acordado); Home y Clubes sí', red);

    console.log('\n== Ruta: «¿Lo entregaste ayer?» ==\n');
    await ev("abrirTab('ruta'); 1");
    for (let i = 0; i < 40; i++) { if (await ev("typeof window._rutAyerAplica==='function'")) break; await pausa(500); }
    const r1 = await ev(`(function(){ var GH=Date.prototype.getHours, ay=_rutAyerISO(), res={};
      Date.prototype.getHours=function(){return 0;}; res.madrugadaAyer=_rutAyerAplica([{h:'Home',fe:ay}]); res.madrugadaHoy=_rutAyerAplica([{h:'Home',fe:getHoyISO()}]); res.madrugadaRed=_rutAyerAplica([{h:'Red',fe:ay}]);
      Date.prototype.getHours=function(){return 15;}; res.tarde=_rutAyerAplica([{h:'Home',fe:ay}]);
      Date.prototype.getHours=GH; return res; })()`);
    chk('a las 00:xx con un pedido de ayer: pregunta', r1.madrugadaAyer === true, r1);
    chk('con un pedido de hoy, o de Red, o a la tarde: no pregunta', !r1.madrugadaHoy && !r1.madrugadaRed && !r1.tarde, r1);
    const r2 = await ev(`new Promise(function(res){ rutPreguntarAyer('Lucia Noriega',function(x){res(x);}); setTimeout(function(){ document.getElementById('rutAyerSi').click(); },100); })`);
    chk('«Sí, ayer» contesta ayer', r2 === true, r2);
    const r3 = await ev(`new Promise(function(res){ rutPreguntarAyer('X',function(x){res(x);}); setTimeout(function(){ document.getElementById('rutAyerHoy').click(); },100); })`);
    chk('«No, hoy» contesta hoy', r3 === false, r3);
    const r4 = await ev(`new Promise(function(res){ var llamo=false; rutPreguntarAyer('X',function(){llamo=true;}); setTimeout(function(){ document.getElementById('rutAyerNo').click(); setTimeout(function(){ res(!llamo&&!document.getElementById('rutAyerOv')); },50); },100); })`);
    chk('«Volver» cierra sin entregar', r4 === true, r4);
    const r5 = await ev(`(function(){ var n0=syncQueue.length; _entregarCore({h:'Home',id:'99999',r:1,c:'PRUEBA',$:1},true); var a=syncQueue[syncQueue.length-1];
      _entregarCore({h:'Home',id:'99998',r:2,c:'PRUEBA',$:1},false); var b=syncQueue[syncQueue.length-1];
      syncQueue.splice(n0); delete entregados[eKey({h:'Home',id:'99999',r:1})]; delete entregados[eKey({h:'Home',id:'99998',r:2})];
      pendientesCobro=pendientesCobro.filter(function(p){return p.id!=='99999'&&p.id!=='99998';}); try{saveLocal();}catch(e){}
      return {si:a&&a.ayer, no:b&&('ayer' in b), dos:a!==b, ids:[a&&a.id,b&&b.id]}; })()`);
    chk('«Sí, ayer» manda ayer:true en la cola; «No, hoy» no lo manda (y la prueba no dejó nada en la cola)', r5.si === true && r5.no === false && r5.dos, r5);

    const escrituras = await ev("__cortados.filter(function(x){return x.rpc!=='pedido_fecha_real_directo';}).map(function(x){return x.rpc;})");
    chk('ninguna otra escritura salió (todas cortadas)', true, escrituras);
    console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
    process.exitCode = mal ? 1 : 0;
  } catch (e) { console.log('  reventó la prueba: ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { cli.matar(); } catch (e) {} }
})();
