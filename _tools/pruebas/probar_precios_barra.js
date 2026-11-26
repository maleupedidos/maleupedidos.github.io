/* AJUSTES › PRECIOS, CUENTAS Y PRODUCTO NUEVO (18/11/2026). Sesión real, de solo lectura: toda escritura se corta.
     SBSES=<sbses.json> node _tools/pruebas/probar_precios_barra.js <token> [390|1440] [puerto] [--foto carpeta]
   Sostiene: ningún «Guardar» por renglón; la barra aparece con lo cambiado, dice cuántos son y se va al volver a lo de
   antes; Guardar manda UNA llamada por producto cambiado (y ninguna por los otros) con el número que escribiste;
   Descartar vuelve todo; Cuentas tiene su pantalla con el mismo patrón; Producto nuevo en la columna (2 columnas en la
   compu, 1 en el celular); nada cortado, sin scroll horizontal, campos de 44 px. Salida 1 si algo falla. */
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
const ESPIA = `;(function(){var f=window.fetch;window.__pr=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
  var r=s.match(/\\/rpc\\/(producto_precio_directo|combo_precio_directo|cuenta_set_directo)/);
  if(m==='POST'&&r){var b={};try{b=JSON.parse(x.body||'{}')}catch(e){}var p=b.p||b;window.__pr.push({rpc:r[1],p:p});
    return Promise.resolve(new Response(JSON.stringify({ok:true,antes:{},despues:p}),{status:200,headers:{'Content-Type':'application/json'}}));}
  return f.apply(this,arguments);};})();`;
const mal = [], ok = [];
const chk = (c, m) => (c ? ok : mal).push(m);
const foto = async (cli, n) => { if (!FOTO) return; const r = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(FOTO, n + '_' + ANCHO + '.png'), Buffer.from(r.data, 'base64')); };
const MIRA = `(function(){var cort=[].slice.call(document.querySelectorAll('#ajBody .pr-nom,#ajBody .pr-c span,#ajBody .aj-f label,#ajBody .pr-barra span')).filter(function(e){return e.offsetParent&&e.scrollWidth>e.clientWidth+1;}).map(function(e){return e.textContent.slice(0,30)});
  var bajos=[].slice.call(document.querySelectorAll('#ajBody input:not([type=checkbox]),#ajBody select,#ajBody .pr-barra .aj-btn')).filter(function(x){return x.offsetParent&&x.getBoundingClientRect().height<43.5;}).map(function(x){return x.id||x.placeholder||x.textContent});
  return {cort:cort,bajos:bajos,hs:document.documentElement.scrollWidth>window.innerWidth+1,ancho:(document.querySelector('#ajBody .aju')||{}).offsetWidth}})()`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + SIN_APPS + CAJON + ESPIA });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: `http://localhost:${PUERTO}/app.html` });
  await T(12000);
  const E = (js) => evaluar(cli, js);
  for (let i = 0; i < 6; i++) { await E(`try{go('ajustes')}catch(e){}`); await T(i ? 3000 : 6000); if (await E(`(document.querySelector('.pg.on')||{}).id`) === 'p-ajustes') break; }
  await E(`ajGo('precios')`);
  for (let i = 0; i < 60; i++) { await T(500); if (await E(`document.querySelectorAll('#prProds .pr-fila').length>5`)) break; }
  await T(600);
  const L = await E(`(function(){return {n:document.querySelectorAll('#prProds .pr-fila').length,btn:document.querySelectorAll('#ajBody .pr-fila .aj-btn').length,
    barra:document.getElementById('prBarra').hidden,ctas:document.querySelectorAll('#ajBody .pr-cta').length}})()`);
  const M0 = await E(MIRA);
  chk(L.n > 5, `precios: ${L.n} productos`);
  chk(L.btn === 0, `precios: sin Guardar por renglón (${L.btn})`);
  chk(L.barra === true, 'precios: la barra no está hasta que cambiás algo');
  chk(L.ctas === 0, 'precios: las cuentas ya no están acá');
  chk(!M0.cort.length && !M0.hs, `precios: nada cortado ni scroll horizontal${M0.cort.length ? ' — ' + M0.cort.join(' | ') : ''}`);
  chk(ANCHO >= 760 || !M0.bajos.length, `precios (celular): campos de 44 px${M0.bajos.length ? ' — ' + M0.bajos.slice(0, 4).join(', ') : ''}`);
  chk(ANCHO < 760 || M0.ancho <= 722, `precios: columna de ${M0.ancho} px`);

  const C = await E(`(function(){var fs=[].slice.call(document.querySelectorAll('#prProds .pr-fila'));var a=fs[0].querySelector('input'),b=fs[1].querySelector('input');
    var a0=a.value,b0=b.value;window.__sk=[fs[0].dataset.k,fs[1].dataset.k];window.__v0=[a0,b0];
    a.value=String(Number(a0||0)+100);a.dispatchEvent(new Event('input',{bubbles:true}));
    var r={uno:document.getElementById('prBarra').textContent,vis:!document.getElementById('prBarra').hidden,marca:fs[0].classList.contains('pr-cambio')};
    a.value=a0;a.dispatchEvent(new Event('input',{bubbles:true}));r.vuelve=document.getElementById('prBarra').hidden;
    a.value=String(Number(a0||0)+100);a.dispatchEvent(new Event('input',{bubbles:true}));b.value=String(Number(b0||0)+200);b.dispatchEvent(new Event('input',{bubbles:true}));
    r.dos=document.getElementById('prBarra').textContent;return r})()`);
  chk(C.vis && /1 cambio sin/.test(C.uno) && C.marca, `un cambio: barra «${C.uno.replace(/Descartar|Guardar/g, '').trim()}» y el renglón marcado`);
  chk(C.vuelve, 'volver al precio de antes: la barra se va');
  chk(/2 cambios/.test(C.dos), 'dos cambios: «2 cambios»');
  await foto(cli, 'precios');
  await E(`document.querySelector('#prBarra .aj-btn:not(.ghost)').click()`); await T(2500);
  const G = await E(`({l:window.__pr,sk:window.__sk,v0:window.__v0})`);
  const sk = G.sk.map((k) => k.slice(2));
  chk(G.l.length === 2 && G.l.every((x) => x.rpc === 'producto_precio_directo'), `guardar: dos llamadas, una por producto (${G.l.length})`);
  chk(G.l.some((x) => x.p.sku === sk[0] && Number(x.p.precio) === Number(G.v0[0] || 0) + 100), 'guardar: el primero con su precio nuevo');
  chk(G.l.every((x) => sk.indexOf(x.p.sku) >= 0), 'guardar: ningún producto que no tocaste');
  chk(await E(`document.getElementById('prBarra').hidden`), 'guardado: la barra se va');

  await E(`(function(){var i=document.querySelectorAll('#prProds .pr-fila')[2].querySelector('input');i.value='1';i.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#prBarra .aj-btn.ghost').click()})()`); await T(600);
  chk(await E(`document.getElementById('prBarra').hidden&&!Object.keys(PR.ed).some(function(k){return k.charAt(0)==='p'&&k===document.querySelectorAll('#prProds .pr-fila')[2].dataset.k})`), 'Descartar: vuelve y la barra se va');

  await E(`window.__pr=[];ajGo('cuentas')`); await T(1500);
  const Q = await E(`(function(){var f=document.querySelectorAll('#ajBody .pr-cta');var i=f.length&&f[0].querySelectorAll('input')[1];var v=i&&i.value;
    if(i){i.value=v+'x';i.dispatchEvent(new Event('input',{bubbles:true}));}var on=!document.getElementById('prBarra').hidden;if(i){i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));}
    return {n:f.length,on:on,off:document.getElementById('prBarra').hidden}})()`);
  const M1 = await E(MIRA);
  chk(Q.n >= 2, `cuentas: ${Q.n} cuentas en su pantalla`);
  chk(Q.on && Q.off, 'cuentas: la barra con el cambio y sin él');
  chk(!M1.cort.length && !M1.hs, `cuentas: nada cortado ni scroll horizontal${M1.cort.length ? ' — ' + M1.cort.join(' | ') : ''}`);
  await foto(cli, 'cuentas');

  await E(`ajGo('alta')`); await T(2000);
  const A = await E(`(function(){var g=document.querySelector('#ajBody .ap-grid');return {cols:g?getComputedStyle(g).gridTemplateColumns.split(' ').length:0}})()`);
  const M2 = await E(MIRA);
  chk(A.cols === (ANCHO < 560 ? 1 : 2), `producto nuevo: ${A.cols} columna(s)`);
  chk(!M2.cort.length && !M2.hs, `producto nuevo: nada cortado ni scroll horizontal${M2.cort.length ? ' — ' + M2.cort.join(' | ') : ''}`);
  chk(ANCHO < 760 || M2.ancho <= 722, `producto nuevo: columna de ${M2.ancho} px`);
  await foto(cli, 'alta');
  const errs = await E(`(window.__err||[]).slice(0,5)`).catch(() => []);
  chk(!errs || !errs.length, `sin errores de JS${errs && errs.length ? ' — ' + errs.join(' | ') : ''}`);
  console.log(`\nAjustes › Precios, Cuentas y Producto nuevo a ${ANCHO} px: ${ok.length} bien, ${mal.length} mal`);
  ok.forEach((m) => console.log('  ok  ' + m)); mal.forEach((m) => console.log('  MAL ' + m));
  process.exit(mal.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
