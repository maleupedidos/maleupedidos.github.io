/* La ficha del pedido: DERIVAR A UN REPRESENTANTE, «venía de», y «de dónde sale» (10/11/2026).

     SBSES=<archivo> node _tools/pruebas/probar_derivar.js [ancho]

   Con la sesión de la base y la guarda de solo lectura (sbses_guarda.js): los representantes y los pedidos son los
   de verdad, pero el pase NO se manda: `_ordenPost` está simulado y anota lo que mandaría. Los pedidos de prueba se
   inyectan en D (nombres inventados).

   Sostiene:
   · un pedido de Home sin entregar ni cobrar ofrece «🛵 Derivar a representante»; uno cobrado, no;
   · el panel trae los representantes de la base, los que reparten ese día primero y los otros apagados;
   · elegir representante → aparecen «De <rep>» (comisión + envío, elegido) y «De Maleu» (solo envío);
   · el botón dice «Derivar a <rep>» y manda UN `pasarAVendedor` con hoja, N°, vendedor y quién trajo, sin confirm;
   · el original sale de la lista de Pedidos al toque, y si la base dice que no, vuelve;
   · un pedido de Red nacido de un pase dice «↪ venía de Home #N» en la ficha y en su tarjeta;
   · el original derivado no se lista en Pedidos;
   · un pedido con el origen sin decidir muestra el editor «¿De dónde sale?» en la ficha, con su propio id;
   · nada se sale de la pantalla y los botones del panel miden ≥ 44 px. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const SB = require('./sbses_guarda.js');
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 600) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

(async () => {
  if (!process.env.SBSES) { console.log('falta SBSES'); process.exit(2); }
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', '') + SB(process.env.SBSES, 'tadeo') + ';window.__errs=[];window.addEventListener("error",function(e){if(!/ResizeObserver/.test(String(e.message)))window.__errs.push(String(e.message))});' });
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
    if (!(await SB.verificarGuarda(cli, evaluar))) { console.log('ABORTA: la guarda no corta'); process.exit(3); }
    console.log('\n== Derivar · ' + ANCHO + 'px ==');
    if (!await esperar(cli, `typeof D!=='undefined'&&D&&D.pedidos&&D.pedidos.length>50&&typeof openOrdDetail==='function'&&typeof SESSION!=='undefined'&&SESSION&&SESSION.rol==='admin'`, 120000)) throw new Error('el ERP no cargó');
    await ev(cli, `window._reentradaHaceFalta=function(){return false};
      window.__posts=[];window.__resp={ok:true,red:{n:'990777'},vendedor:'x'};
      window._ordenPost=function(b){window.__posts.push(JSON.parse(JSON.stringify(b)));var r=window.__resp;return new Promise(function(res){setTimeout(function(){res(new Response(JSON.stringify(r),{status:200}));},150);});};
      window.__abiertos=[];var _oo=window.openOrdDetail;window.openOrdDetail=function(h,n,r){window.__abiertos.push(h+'#'+n);return _oo.apply(this,arguments);};
      window.confirm=function(){window.__confirms=(window.__confirms||0)+1;return true;};
      window.__inyectar=function(){var _ya={};D.pedidos.forEach(function(x){if(/^990/.test(String(x.n)))_ya[x.h+x.n]=1;});var _push=D.pedidos.push.bind(D.pedidos);var _P={push:function(o){if(!_ya[o.h+o.n])_push(o);}};
        var dee=(function(){var d=new Date();d.setDate(d.getDate()+((5-d.getDay()+7)%7||7));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
      _P.push({h:'Home',n:'990001',r:0,c:'Prueba Derivar',es:'Pendiente',ep:'No Cobrado',fp:'Transferencia',dee:dee,de:'Viernes',f:'10/11',hr:'10:00',p:[{a:'Cho',q:2}],$:20000,o:'Deposito',tel:'1100000001'});
      _P.push({h:'Home',n:'990002',r:0,c:'Prueba Cobrada',es:'Pendiente',ep:'Cobrado',fp:'Transferencia',dee:dee,f:'10/11',p:[{a:'Cho',q:1}],$:10000,o:'Deposito'});
      _P.push({h:'Home',n:'990003',r:0,c:'Prueba Origen',es:'Pendiente',ep:'No Cobrado',fp:'Efectivo',dee:dee,f:'10/11',p:[{a:'Cho',q:3}],$:30000,o:'Pendiente'});
      _P.push({h:'Home',n:'990004',r:0,c:'Prueba Ya Derivada',es:'Cancelado',ep:'No Cobrado',pas:'Pasado a Red #990555 (Representante X)',f:'09/11',p:[{a:'Cho',q:1}],$:10000});
      _P.push({h:'Red',n:'990555',r:0,c:'Prueba Ya Derivada (Red: Representante X)',br:'Representante X',es:'Pendiente',ep:'No Cobrado',f:'09/11',p:[{a:'Cho',q:1}],$:9000});
      };window.__inyectar();
      1`);

    console.log('\n-- quién puede derivar --');
    await ev(cli, `window.__inyectar();openOrdDetail('Home','990002',0)`); await pausa(500);
    chk('un pedido COBRADO no ofrece derivar', (await ev(cli, `!/Derivar a representante/.test(document.getElementById('ordBody').textContent)`)) === true);
    await ev(cli, `window.__inyectar();openOrdDetail('Home','990001',0)`); await pausa(500);
    chk('uno sin entregar ni cobrar ofrece «🛵 Derivar a representante»', (await ev(cli, `!![].filter.call(document.querySelectorAll('#ordBody .ord-actions .ord-btn'),function(b){return /Derivar a representante/.test(b.textContent);})[0]`)) === true);

    console.log('\n-- el panel --');
    await ev(cli, `[].filter.call(document.querySelectorAll('#ordBody .ord-actions .ord-btn'),function(b){return /Derivar a representante|Cerrar/.test(b.textContent);})[0].click()`);
    const llego = await esperar(cli, `document.querySelectorAll('#ordDer .ofx-chip').length>0||/No pude traer/.test((document.getElementById('ordDer')||{}).textContent||'')`, 30000);
    console.log('     panel:', JSON.stringify(await ev(cli, `(document.getElementById('ordDer')||{}).textContent||'(sin panel)'`)).slice(0,300));
    const chips = await ev(cli, `[].map.call(document.querySelectorAll('#ordDer .ofx-chip'),function(b){return {t:b.textContent,dis:b.disabled};})`);
    chk('trae los representantes de la base (' + (Array.isArray(chips) ? chips.length : 0) + ')', llego && Array.isArray(chips) && chips.length > 0, chips);
    const vivos = (chips || []).filter(c => !c.dis);
    chk('los que reparten el viernes, primero y prendidos; los otros apagados al final', vivos.length > 0 && chips.findIndex(c => c.dis) === -1 || chips.findIndex(c => c.dis) >= vivos.length, chips);
    chk('todavía no hay botón para derivar (falta elegir)', (await ev(cli, `!document.querySelector('#ordDer .ofx-der-ok')`)) === true);
    await ev(cli, `document.querySelector('#ordDer .ofx-chip:not([disabled])').click()`); await pausa(300);
    const rep = await ev(cli, `(document.querySelector('#ordDer .ofx-chip.on')||{}).textContent||''`);
    const ops = await ev(cli, `[].map.call(document.querySelectorAll('#ordDer .ofx-op'),function(b){return {t:b.textContent,on:b.classList.contains('on')};})`);
    chk('elegido «' + rep + '»: «De ' + String(rep).split(' ')[0] + '» (elegido) y «De Maleu»', rep && Array.isArray(ops) && ops.length === 2 && ops[0].on && /comisión \+ envío/.test(ops[0].t) && /solo el envío/.test(ops[1].t), ops);
    await ev(cli, `document.querySelector('#ordDer .ofx-op[data-t="Maleu"]').click()`); await pausa(300);
    if (process.env.SHOT) { await ev(cli, `document.getElementById('ordDer').scrollIntoView({block:'center'})`); await pausa(300); const sh = await cli.enviar('Page.captureScreenshot', { format: 'png' }); require('fs').writeFileSync(process.env.SHOT, Buffer.from(sh.data, 'base64')); }
    const boton = await ev(cli, `(document.querySelector('#ordDer .ofx-der-ok')||{}).textContent||''`);
    chk('el botón dice «Derivar a ' + String(rep).split(' ')[0] + '»', boton === 'Derivar a ' + String(rep).split(' ')[0], boton);
    const geo = await ev(cli, `(function(){var b=document.getElementById('ordBody');var o={chicos:[],afuera:b.scrollWidth>b.clientWidth+1};[].forEach.call(document.querySelectorAll('#ordDer button'),function(x){var r=x.getBoundingClientRect();if(r.height&&r.height<44&&!x.disabled)o.chicos.push(x.textContent.slice(0,20)+' '+Math.round(r.height));});return o;})()`);
    chk('los botones del panel miden ≥ 44 px y nada se sale', geo && geo.chicos.length === 0 && geo.afuera === false, geo);

    console.log('\n-- derivar --');
    await ev(cli, `document.querySelector('#ordDer .ofx-der-ok').click()`);
    await pausa(60);
    chk('al toque: el original sale de la lista (queda Cancelado y «Pasado a Red»)', (await ev(cli, `(function(){var p=D.pedidos.filter(function(x){return x.n==='990001';})[0];return p.es==='Cancelado'&&/^Pasado a Red/.test(p.pas);})()`)) === true);
    await esperar(cli, 'window.__posts.length>0', 5000); await pausa(800);
    const post = await ev(cli, 'window.__posts');
    chk('UN `pasarAVendedor` con hoja, N°, vendedor y «Maleu»', Array.isArray(post) && post.length === 1 && post[0].action === 'pasarAVendedor' && post[0].hoja === 'Home' && post[0].id === '990001' && post[0].vendedor === rep && post[0].trajo === 'Maleu' && /^pav_/.test(post[0].clientOpId), post);
    chk('sin cartel de confirmación', !(await ev(cli, 'window.__confirms')));
    chk('al terminar abre la ficha del pedido de Red', (await ev(cli, `window.__abiertos.indexOf('Red#990777')>=0`)) === true, await ev(cli, 'window.__abiertos'));

    console.log('\n-- si la base dice que no --');
    await ev(cli, `closeOrdDetail();window.__posts=[];window.__resp={ok:false,err:'el representante no está activo'};
      window.__inyectar();var q=D.pedidos.filter(function(x){return x.n==='990001';})[0];q.es='Pendiente';delete q.pas;openOrdDetail('Home','990001',0)`); await pausa(400);
    await ev(cli, `[].filter.call(document.querySelectorAll('#ordBody .ord-actions .ord-btn'),function(b){return /Derivar a representante|Cerrar/.test(b.textContent);})[0].click()`);
    await esperar(cli, `document.querySelectorAll('#ordDer .ofx-chip:not([disabled])').length>0`, 15000);
    await ev(cli, `document.querySelector('#ordDer .ofx-chip:not([disabled])').click()`); await pausa(250);
    await ev(cli, `document.querySelector('#ordDer .ofx-der-ok').click()`);
    await esperar(cli, 'window.__posts.length>0', 5000); await pausa(800);
    chk('vuelve como estaba (Pendiente, sin «Pasado»)', (await ev(cli, `(function(){var p=D.pedidos.filter(function(x){return x.n==='990001';})[0];return p.es==='Pendiente'&&!p.pas;})()`)) === true);

    console.log('\n-- un solo pedido a la vista --');
    await esperar(cli, `(function(){closeOrdDetail();window.__inyectar();openOrdDetail('Red','990555',0);return /venía de/.test(document.getElementById('ordBody').textContent);})()`, 8000);
    chk('el de Red dice «↪ venía de Home #990004»', (await ev(cli, `/venía de Home #990004/.test(document.getElementById('ordBody').textContent)`)) === true);
    await ev(cli, `closeOrdDetail();window.__inyectar();go('pedidos')`); await pausa(1200);
    await esperar(cli, `(function(){window.__inyectar();try{rPedidos();}catch(e){}return /venía de Home #990004/.test((document.getElementById('pList')||{}).textContent||'');})()`, 10000);
    const lista = await ev(cli, `(function(){var t=(document.getElementById('pList')||{}).textContent||'';return {veces:(t.match(/Prueba Ya Derivada/g)||[]).length,vino:/venía de Home #990004/.test(t)};})()`);
    chk('en Pedidos, el original derivado no está y el de Red dice de dónde vino', lista && lista.vino === true && lista.veces === 1, lista);

    console.log('\n-- de dónde sale --');
    await esperar(cli, `(function(){window.__inyectar();openOrdDetail('Home','990003',0);return !!document.querySelector('#ordBody .ofx-orig');})()`, 8000);
    const orig = await ev(cli, `(function(){var b=document.getElementById('ordBody');var box=b.querySelector('.ofx-orig .origen-box');return {hay:!!box,id:box&&box.id,ok:!!(box&&box.querySelector('[onclick="ordOrigenOk(this)"]')),inputs:box?box.querySelectorAll('input[data-role]').length:0};})()`);
    chk('con el origen sin decidir, el editor está en la ficha (id propio ' + (orig && orig.id) + ')', !!(orig && orig.hay && /^orig-ofx/.test(orig.id) && orig.ok && orig.inputs >= 2), orig);

    const err = await ev(cli, 'window.__errs');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL  la prueba se cortó: ' + (e && e.message || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
