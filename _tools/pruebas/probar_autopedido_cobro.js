/* «Ya me pagó» en el autopedido abre el cuadro de cobro completo (8/11/2026). Base simulada: el alta contesta un
   número, el cobro se captura y no viaja. node _tools/pruebas/probar_autopedido_cobro.js <ancho> [prefijo]
   Env: SBSES (estancias/scripts/migraciones/sesion_prueba.py), TOKEN, y para un repartidor ROLSES + SBUSU. ORDEN=billete|propina.
   Necesita `npm run dev` (localhost:8080). Nada viaja a la base: el alta y el cobro se contestan desde la página. */
'use strict';
const fs = require('fs');
const P = __dirname + '/';
const { abrir, evaluar } = require(P + 'cdp.js');
const ANCHO = Number(process.argv[2] || 390), PRE = process.argv[3] || 'e2e';
const S = require('os').tmpdir() + '/';
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (n, c, extra) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (extra ? '  ' + extra : '')); };
(async () => {
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') { const d = (p || {}).exceptionDetails || {}; errores.push(((d.exception || {}).description || d.text || '').split('\n')[0]); } });
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  const hoy = new Date(); const iso = hoy.getFullYear() + '-' + ('0' + (hoy.getMonth() + 1)).slice(-2) + '-' + ('0' + hoy.getDate()).slice(-2);
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: require(P + 'sesion_prep.js')(process.env.TOKEN, process.env.ROLSES ? 'try{localStorage.setItem("maleu_panel_session",' + JSON.stringify(process.env.ROLSES) + ');}catch(e){}' : '') + require(P + 'sbses_guarda.js')(process.env.SBSES, process.env.SBUSU || 'tadeo') + ';try{localStorage.removeItem("maleu_apps_prueba");localStorage.removeItem("maleu_np_borrador");localStorage.removeItem("maleu_np_cola");}catch(e){}' });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){window.confirm=function(){return true;};window.alert=function(){};window.prompt=function(){return null;};
    try{localStorage.setItem('maleu_bil_dia',JSON.stringify({f:'${iso}',q:'Tadeo Ustariz'}));}catch(e){}
    var of=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||''), m=((x&&x.method)||'GET').toUpperCase(), b=String((x&&x.body)||'');
      if(m==='POST'&&/rest.v1.rpc.pedido_alta_directo/.test(url)){ (window.__alta=window.__alta||[]).push(b); return new Promise(function(r){setTimeout(function(){r(new Response(JSON.stringify({ok:true,n:999777,ref:'Home #999777',aceptada:true,diferida:true,directo:true,baseEscribio:true,orden:1}),{status:200,headers:{'Content-Type':'application/json'}}));},600);}); }
      if(m==='POST'&&(/rest.v1.rpc.[a-z_]*(cobrar|cobro)[a-z_]*/.test(url)||/script\\.google/.test(url)&&/marcarCobrado|cobrarParcial/.test(b))){ (window.__cobro=window.__cobro||[]).push({url:url.slice(-40),b:b}); return Promise.resolve(new Response('{"ok":true,"directo":true,"aceptada":true}',{status:200,headers:{'Content-Type':'application/json'}})); }
      if(m==='POST'&&(/script\\.google/.test(url)||/rest.v1.rpc.[a-z_]*(directo|anotar|registrar)/.test(url)&&!/ui_medicion/.test(url))){ (window.__otros=window.__otros||[]).push(url.slice(-50)+' '+b.slice(0,120)); return Promise.resolve(new Response('{"ok":false,"bloqueado":true}',{status:200,headers:{'Content-Type':'application/json'}})); }
      return of.apply(this,arguments); }; })();` });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
  for (let i = 0; i < 80; i++) { if (await ev(`typeof go==='function'`).catch(() => false)) break; await pausa(250); }
  await pausa(3000); await ev(`go('ruta')`); await pausa(1500); await ev(`switchTab('ruta')`); await pausa(1500);
  const bd = await ev(`(function(){var b=document.getElementById('rutBilDia'); return {vis:!!b&&!b.hidden, txt:b?b.innerText.replace(/\\s+/g,' '):''};})()`);
  chk('la billetera se ve en la sub-tab RUTA y dice «salís a entregar»', bd.vis && /Tadeo/.test(bd.txt) && /a entregar/.test(bd.txt) && !/hoy/i.test(bd.txt), bd.txt.slice(0, 90));
  await ev(`switchTab('nuevo')`); await pausa(4500);
  chk('el cartel de la billetera NO está en + PEDIDO (solo en la sub-tab RUTA)', await ev(`(function(){var b=document.getElementById('rutBilDia');return !b||!b.offsetParent;})()`));
  const r1 = await ev(`(function(){var o={};
    npSetZona('Home'); var n=document.getElementById('npNombre'); n.value='PRUEBA Cobro'; document.getElementById('npLote').value='9';
    var hoyIso=npIsoDe(new Date()); var fb=Array.from(document.querySelectorAll('#npFechas [onclick^="npSetFecha"]')).filter(function(b){var m=(b.getAttribute('onclick')||'').match(/'(\\d{4}-\\d{2}-\\d{2})'/);return m&&m[1]>=hoyIso;}); if(fb[0])fb[0].click();
    npQty(1,1); npQty(1,1); npQty(13,1); npSetPago('Efectivo');
    var yc=document.getElementById('npYaCobrado'); yc.checked=true; npToggleYaCobrado();
    o.ctaVisible=!document.getElementById('npCtaWrap').classList.contains('hidden'); o.quienVisible=!document.getElementById('npQuienWrap').classList.contains('hidden');
    o.total=document.getElementById('npTotalValue').textContent; return o;})()`);
  await pausa(1200);
  chk('con «Ya me pagó» ya no aparecen cuenta/quién/mixto sueltos', !r1.ctaVisible && !r1.quienVisible);
  chk('el total es $32.000', r1.total === '$32.000', r1.total);
  await ev(`npGuardar()`);
  await pausa(3500);
  const r2 = await ev(`(function(){var ov=document.getElementById('cobroRutaOverlay'); var st=window._cobroRutaState||null;
    var alta=(window.__alta||[]).map(function(b){try{return JSON.parse(b)}catch(e){return {}}}).map(function(x){var p=x.p||x; return {estadoPago:p.estadoPago, propina:p.propina}})[0]||null;
    return {abierto:!!ov&&getComputedStyle(ov).display!=='none'&&!ov.classList.contains('hidden'), titulo:(document.getElementById('cobroRutaTitle')||{}).textContent, sub:(document.getElementById('cobroRutaSub')||{}).textContent, alta:alta, quien:st&&st.quien, prods:(document.getElementById('cobroRutaProds')||{}).innerText};})()`);
  chk('el alta viaja como «No Cobrado» y sin propina', r2.alta && r2.alta.estadoPago === 'No Cobrado' && !(r2.alta.propina > 0), JSON.stringify(r2.alta));
  chk('se abre el cuadro de cobro del pedido recién creado', r2.abierto && /PRUEBA/.test(r2.titulo || '') && /999777/.test(r2.sub || ''), (r2.titulo || '') + ' · ' + (r2.sub || ''));
  chk('el cuadro trae el detalle de productos', /Margarita|Franui|PMa/i.test(r2.prods || ''), (r2.prods || '').replace(/\s+/g, ' ').slice(0, 80));
  let s1 = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(S + PRE + '_cuadro.png', Buffer.from(s1.data, 'base64'));
  // El cliente da $40.000 y deja $1.000 de propina: vuelto $7.000 en efectivo
  const ORDEN = process.env.ORDEN || 'billete';
  const r3 = await ev(`(function(){
    var poner=function(id,v){var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));};
    var abrir=function(id){var b=document.getElementById(id); if(b&&!b.classList.contains('on')) b.click();};
    if('${ORDEN}'==='billete'){ poner('cobroRecEf','40000'); abrir('cobroToggleCambio'); abrir('cobroTogglePropina'); poner('cobroPropinaInp','1000'); }
    else { abrir('cobroTogglePropina'); poner('cobroPropinaInp','1000'); poner('cobroRecEf','40000'); abrir('cobroToggleCambio'); }
    var r=_recalcCobroRuta();
    return {camEf:r&&r.camEf, prop:r&&r.propina, rec:(document.getElementById('cobroRecEf')||{}).value, errs:r&&r.errors};})()`);
  console.log('   orden: ' + ORDEN + ' -> ' + JSON.stringify(r3));
  chk('calcula el vuelto en efectivo ($7.000)', Number(r3.camEf) === 7000, 'camEf=' + r3.camEf + ' prop=' + r3.prop + ' errs=' + JSON.stringify(r3.errs));
  let s2 = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(S + PRE + '_cuadro2.png', Buffer.from(s2.data, 'base64'));
  await ev(`confirmarCobroRuta()`);
  await pausa(3500);
  const r4 = await ev(`(function(){ var c=(window.__cobro||[]).map(function(x){try{var j=JSON.parse(x.b);return j.p||j;}catch(e){return {raw:x.b.slice(0,200)}}});
    var q=[]; try{ q=JSON.parse(localStorage.getItem('maleu_ruta_sync')||'[]'); }catch(e){}
    var sq=(typeof syncQueue!=='undefined'?syncQueue:[]).filter(function(x){return x&&x.action==='marcarCobrado';});
    return {posts:c, cola:sq.slice(-1), otros:window.__otros||[]}; })()`);
  const pay = (r4.posts.filter(x => x.action === 'marcarCobrado')[0]) || r4.cola[0] || null;
  chk('sale un marcarCobrado del pedido #999777', pay && String(pay.id) === '999777' && pay.hoja === 'Home', pay ? (pay.hoja + ' #' + pay.id) : JSON.stringify(r4).slice(0, 300));
  if (pay) {
    chk('con la billetera del día como «quién»', pay.quien === 'Tadeo Ustariz', pay.quien);
    chk('con el billete que dio el cliente ($40.000)', Number(pay.recibidoEf) === 40000, pay.recibidoEf);
    chk('con la propina ($1.000)', Number(pay.propina) === 1000, pay.propina + ' ' + pay.propMet);
    chk('con el vuelto que sale de la billetera ($7.000)', Number(pay.cambioBilletera) === 7000, pay.cambioBilletera);
    chk('el pedido se cobra $32.000 en efectivo', Number(pay.ef) === 32000 && Number(pay.tr) === 0, 'ef=' + pay.ef + ' tr=' + pay.tr);
  }
  console.log('errores JS:', JSON.stringify(Array.from(new Set(errores)).slice(0, 8)));
  console.log(mal ? 'MAL (' + mal + ' de ' + (ok + mal) + ')' : 'TODO OK (' + ok + ')');
  try { await ev(`localStorage.removeItem('maleu_np_cola');localStorage.removeItem('maleu_ruta_sync')`); } catch (e) {}
  cli.matar(); process.exit(mal ? 1 : 0);
})();
