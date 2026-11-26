/* AJUSTES › REPRESENTANTES COMO LISTA CON FICHA COMERCIAL (18/11/2026). Sesión real, de solo lectura.
     SBSES=<sbses.json> node _tools/pruebas/probar_representantes_ficha.js <token> [390|1440] [puerto] [--foto carpeta]
   Sostiene: la lista (un renglón por representante, sin el robot, nada cortado, ≤ 720 px); la ficha con Guardar apagado
   hasta que algo cambie (y de nuevo apagado al volver); «Agregar un barrio» lo suma a la lista y prende Guardar; Guardar
   manda el NOMBRE como estaba (la clave con Equipo y con la liquidación de Red) y los barrios; en el celular, controles
   de 44 px. Salida 1 si algo falla. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const a = process.argv.slice(2), TOKEN = a[0], ANCHO = Number(a[1] || 390), PUERTO = Number(a[2] || 8080);
const FOTO = a.includes('--foto') ? a[a.indexOf('--foto') + 1] : '';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const SIN_APPS = process.env.SBSES ? ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" : '';
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : '';
/* Todo POST que guarda un representante (por la base o por Apps Script) se anota entero y contesta ok. */
const ESPIA = `;(function(){var f=window.fetch;window.__guarda=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(),b=String((x&&x.body)||'');
  if(m==='POST'&&(/vendedor_set_directo|orden_/.test(s)||/"action":"vendedorSet"/.test(b))){var j={};try{j=JSON.parse(b)}catch(e){}window.__guarda.push(j.p||j);
    return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));}
  return f.apply(this,arguments);};})();`;
const mal = [], ok = [];
const chk = (c, m) => (c ? ok : mal).push(m);
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + SIN_APPS + CAJON + ESPIA });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: `http://localhost:${PUERTO}/app.html` });
  await T(12000);
  const E = (js) => evaluar(cli, js);
  for (let i = 0; i < 6; i++) { await E(`try{go('ajustes')}catch(e){}`); await T(i ? 3000 : 6000); if (await E(`(document.querySelector('.pg.on')||{}).id`) === 'p-ajustes') break; }
  for (let i = 0; i < 60 && !(await E(`_esDueno()`)); i++) await T(500);
  await E(`ajGo('vendedores')`);
  for (let i = 0; i < 80; i++) { await T(500); if (await E(`!!(document.querySelectorAll('#ajBody .aju-r').length&&_AJ_UPER)`)) break; }
  await T(800);
  const L = await E(`(function(){var rs=[].slice.call(document.querySelectorAll('#ajBody .aju-r'));
    var cort=[].slice.call(document.querySelectorAll('#ajBody .aju-n,#ajBody .aju-m')).filter(function(e){return e.scrollWidth>e.clientWidth+1;}).map(function(e){return e.textContent;});
    return {n:rs.length,noms:rs.map(function(r){return r.querySelector('.aju-n').textContent}),cort:cort,hs:document.documentElement.scrollWidth>window.innerWidth+1,
      ancho:(document.querySelector('#ajBody .aju')||{}).offsetWidth,viejo:!!document.querySelector('#ajBody .aj-acc,#ajBody .aj-row.v')}})()`);
  chk(L.n >= 5, `lista: ${L.n} representantes`);
  chk(!L.noms.some((n) => /robot|prueba/i.test(n)), 'lista: sin el robot de pruebas');
  chk(!L.cort.length && !L.hs, `lista: nada cortado ni scroll horizontal${L.cort.length ? ' — ' + L.cort.join(' | ') : ''}`);
  chk(ANCHO < 760 || L.ancho <= 722, `lista: columna de ${L.ancho} px`);
  chk(!L.viejo, 'lista: sin los formularios abiertos de antes');
  if (FOTO) { const r = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(FOTO, `rep_lista_${ANCHO}.png`), Buffer.from(r.data, 'base64')); }

  await E(`ajVAbrir('fini')`); await T(1500);
  const F = await E(`(function(){var b=document.getElementById('ajVFok'),e=document.getElementById('ajVFest');
    var ctl=[].slice.call(document.querySelectorAll('#ajVF input:not([type=hidden]),#ajVF select,#ajVF textarea,#ajVF .aj-btn,#ajVF .aju-back')).filter(function(x){return x.offsetParent;});
    var bajos=ctl.filter(function(x){return x.getBoundingClientRect().height<43.5;}).map(function(x){return (x.id||x.textContent||x.tagName).trim().slice(0,20)});
    var cort=[].slice.call(document.querySelectorAll('#ajVF .aju-fn,#ajVF .aju-fs,#ajVF label')).filter(function(e){return e.scrollWidth>e.clientWidth+1;}).map(function(e){return e.textContent.slice(0,30)});
    return {nom:(document.querySelector('#ajVF .aju-fn')||{}).textContent,dis:b&&b.disabled,est:e&&e.textContent,bajos:bajos,cort:cort,hs:document.documentElement.scrollWidth>window.innerWidth+1,
      clave:(document.querySelector('#ajVF [data-k=nombre]')||{}).value}})()`);
  chk(/Mihailovitch/.test(F.nom || ''), `ficha: «${F.nom}»`);
  chk(F.dis === true && F.est === 'Sin cambios', `ficha: Guardar apagado y «${F.est}» al abrir`);
  chk(!F.cort.length && !F.hs, `ficha: nada cortado ni scroll horizontal${F.cort.length ? ' — ' + F.cort.join(' | ') : ''}`);
  chk(ANCHO >= 760 || !F.bajos.length, `ficha (celular): controles de 44 px${F.bajos.length ? ' — bajos: ' + F.bajos.join(', ') : ''}`);
  if (FOTO) { const r = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(FOTO, `rep_ficha_${ANCHO}.png`), Buffer.from(r.data, 'base64')); }

  const W = await E(`(function(){var i=document.getElementById('ajVF_wa'),antes=i.value;i.value=antes+'9';i.dispatchEvent(new Event('input',{bubbles:true}));
    var on=!document.getElementById('ajVFok').disabled;i.value=antes;i.dispatchEvent(new Event('input',{bubbles:true}));return {on:on,off:document.getElementById('ajVFok').disabled}})()`);
  chk(W.on && W.off, 'WhatsApp: Guardar se prende con el cambio y se apaga al volver');

  const B = await E(`(function(){var b0=document.getElementById('ajVF_barrios').value,i=document.querySelector('#ajVF .aju-in');i.value='Barrio de la prueba';
    i.dispatchEvent(new Event('change',{bubbles:true}));var b1=document.getElementById('ajVF_barrios').value;return {suma:b1.indexOf('Barrio de la prueba')>=0&&b1.indexOf(b0.split(',')[0])>=0,on:!document.getElementById('ajVFok').disabled}})()`);
  chk(B.suma && B.on, 'Agregar un barrio: se suma a los que tenía y prende Guardar');

  await E(`ajSaveVend(document.getElementById('ajVFok'))`); await T(2500);
  const G = await E(`window.__guarda`);
  const p = G[0] || {};
  chk(G.length === 1, `guardar: una sola llamada (${G.length})`);
  chk(p.nombre === F.clave && p.nombre, `guardar: Nombre «${p.nombre}» como estaba (la clave)`);
  chk(/Barrio de la prueba/.test(p.barrios || ''), 'guardar: manda los barrios con el nuevo');
  chk(p.usuario === 'fini' && p.origUsuario === 'fini', 'guardar: usuario y origUsuario');

  for (let i = 0; i < 40; i++) { await T(500); if (await E(`!!(AJ_DATA&&document.getElementById('ajVF'))`)) break; }
  await E(`window.confirm=function(){return true};ajVCerrar()`); await T(600);
  chk(await E(`!document.getElementById('ajVF')&&document.querySelectorAll('#ajBody .aju-r').length>0`), '‹ Representantes vuelve a la lista');
  await E(`ajVAbrir('nuevo')`); await T(800);
  const N = await E(`(function(){var b=document.getElementById('ajVFok');var n=document.getElementById('ajVF_nombre');return {hay:!!n,dis:b&&b.disabled}})()`);
  chk(N.hay && N.dis, 'nuevo: pide nombre y no deja guardar vacío');
  await E(`ajVCerrar()`);
  const errs = await E(`(window.__err||[]).slice(0,5)`).catch(() => []);
  chk(!errs || !errs.length, `sin errores de JS${errs && errs.length ? ' — ' + errs.join(' | ') : ''}`);
  console.log(`\nAjustes › Representantes a ${ANCHO} px: ${ok.length} bien, ${mal.length} mal`);
  ok.forEach((m) => console.log('  ok  ' + m)); mal.forEach((m) => console.log('  MAL ' + m));
  process.exit(mal.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
