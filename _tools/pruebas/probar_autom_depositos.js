/* AJUSTES › AUTOMATIZACIONES Y DEPÓSITOS (18/11/2026). Sesión real, de solo lectura.
     SBSES=<sbses.json> node _tools/pruebas/probar_autom_depositos.js <token> [390|1440] [puerto] [--foto carpeta]
   Sostiene: las dos en la columna (≤ 720 px en la compu), sin scroll horizontal ni nada cortado; Automatizaciones con
   los grupos de «Lo que corre solo» PLEGADOS salvo los que tienen algo para mirar, y que un grupo que abriste siga abierto
   cuando la pantalla se actualiza sola; menos palabras a la vista que antes con todo abierto. Salida 1 si algo falla. */
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
const mal = [], ok = [];
const chk = (c, m) => (c ? ok : mal).push(m);
const foto = async (cli, n) => { if (!FOTO) return; const r = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(FOTO, n + '_' + ANCHO + '.png'), Buffer.from(r.data, 'base64')); };
const MIRA = `(function(){var b=document.getElementById('ajBody');var cort=[].slice.call(b.querySelectorAll('.au-q,.au-cuando,summary span,h3,.st-oc-n,b')).filter(function(e){return e.offsetParent&&e.scrollWidth>e.clientWidth+1;}).map(function(e){return e.textContent.slice(0,30)});
  var vis=function(e){return e.checkVisibility?e.checkVisibility({contentVisibilityAuto:true,visibilityProperty:true}):!!e.offsetParent};var w=0;(function c(n){if(n.nodeType===3){if(n.parentElement&&vis(n.parentElement))w+=(n.nodeValue.match(/[A-Za-zÁÉÍÓÚáéíóúñÑüÜ]{2,}/g)||[]).length;}else if(n.nodeType===1&&getComputedStyle(n).display!=='none')[].forEach.call(n.childNodes,c);})(b);
  return {cort:cort,hs:document.documentElement.scrollWidth>window.innerWidth+1,ancho:(b.querySelector('.aju')||{}).offsetWidth,palabras:w}})()`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + SIN_APPS + CAJON });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: `http://localhost:${PUERTO}/app.html` });
  await T(12000);
  const E = (js) => evaluar(cli, js);
  for (let i = 0; i < 6; i++) { await E(`try{go('ajustes')}catch(e){}`); await T(i ? 3000 : 6000); if (await E(`(document.querySelector('.pg.on')||{}).id`) === 'p-ajustes') break; }
  await E(`ajGo('autom')`);
  for (let i = 0; i < 60; i++) { await T(500); if (await E(`document.querySelectorAll('#ajBody details.au-g').length>0`)) break; }
  await T(800);
  const A = await E(`(function(){var g=[].slice.call(document.querySelectorAll('#ajBody details.au-g'));
    return {n:g.length,mal:g.map(function(d){return !!d.querySelector('.au-g-mal')}),open:g.map(function(d){return d.open})}})()`);
  const M = await E(MIRA);
  chk(A.n >= 2, `autom: ${A.n} grupos plegables`);
  chk(A.open.every((o) => !o), 'autom: los grupos arrancan plegados (lo que falla ya está en «para mirar»)');
  chk(!M.cort.length && !M.hs, `autom: nada cortado ni scroll horizontal${M.cort.length ? ' — ' + M.cort.join(' | ') : ''}`);
  chk(ANCHO < 760 || M.ancho <= 722, `autom: columna de ${M.ancho} px`);
  await foto(cli, 'autom');
  const P = await E(`(function(){[].forEach.call(document.querySelectorAll('#ajBody details.au-g,#ajBody details.au-plega'),function(d){d.open=true;});return 1})()`); await T(300);
  const Mabierto = await E(MIRA);
  chk(M.palabras < Mabierto.palabras * 0.5, `autom: plegado se leen ${M.palabras} palabras, todo abierto ${Mabierto.palabras}`);
  const k = await E(`(function(){var d=document.querySelectorAll('#ajBody details.au-g');var x=[].filter.call(d,function(e){return !e.querySelector('.au-g-mal')})[0];
    [].forEach.call(d,function(e){e.open=false;});if(!x)return '';x.open=true;x.dispatchEvent(new Event('toggle'));return x.dataset.g})()`);
  await T(300); await E(`document.getElementById('ajBody').innerHTML=ajAutomHTML()`); await T(300);
  chk(!k || await E(`(document.querySelector('#ajBody details.au-g[data-g="'+${JSON.stringify(k)}+'"]')||{}).open===true`), `autom: «${k}» sigue abierto después de actualizarse`);

  await E(`ajGo('depositos')`);
  for (let i = 0; i < 40; i++) { await T(500); if (await E(`!!document.querySelector('#ajBody .aj-dep')`)) break; }
  await T(800);
  const D = await E(MIRA);
  chk(!D.cort.length && !D.hs, `depósitos: nada cortado ni scroll horizontal${D.cort.length ? ' — ' + D.cort.join(' | ') : ''}`);
  chk(ANCHO < 760 || (D.ancho > 0 && D.ancho <= 722), `depósitos: columna de ${D.ancho} px`);
  await foto(cli, 'depositos');
  const errs = await E(`(window.__err||[]).slice(0,5)`).catch(() => []);
  chk(!errs || !errs.length, `sin errores de JS${errs && errs.length ? ' — ' + errs.join(' | ') : ''}`);
  console.log(`\nAjustes › Automatizaciones y Depósitos a ${ANCHO} px: ${ok.length} bien, ${mal.length} mal`);
  ok.forEach((m) => console.log('  ok  ' + m)); mal.forEach((m) => console.log('  MAL ' + m));
  process.exit(mal.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
