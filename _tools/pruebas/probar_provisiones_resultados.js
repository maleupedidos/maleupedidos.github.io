/* LAS PROVISIONES EN RESULTADOS › GASTOS (18/11/2026, 782). Sesión real, de solo lectura: toda escritura se corta.
     SBSES=<sbses.json> node _tools/pruebas/probar_provisiones_resultados.js <token> [390|1440] [puerto] [--foto carpeta]
   Sostiene:
   · Resultados › Gastos tiene al pie «Gastos fijos que se provisionan»: un renglón por provisión, monto leído con numAR y
     la categoría por su nombre; la ficha con Guardar apagado al abrir y prendido con un cambio;
   · Guardar manda la `clave` de ESA fila (782) y el origConcepto; con un concepto repetido y SIN clave (la 782 todavía
     no está) Guardar no se prende y Borrar no manda nada: pisaría la otra fila;
   · Ajustes › Plata › «Provisiones › en Resultados» lleva ahí;
   · nada cortado, sin scroll horizontal, campos de 44 px en el celular. Salida 1 si algo falla. */
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
const ESPIA = `;(function(){var f=window.fetch;window.__prov=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(),b=String((x&&x.body)||'');
  if(m==='POST'&&(/provision_(set|delete)_directo/.test(s)||/"action":"provision/.test(b))){var j={};try{j=JSON.parse(b)}catch(e){}window.__prov.push(j.p||j);
    return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));}
  return f.apply(this,arguments);};})();`;
const mal = [], ok = [];
const chk = (c, m) => (c ? ok : mal).push(m);
const foto = async (cli, n) => { if (!FOTO) return; const r = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(FOTO, n + '_' + ANCHO + '.png'), Buffer.from(r.data, 'base64')); };
const MIRA = `(function(){var b=document.getElementById('resProv');if(!b)return {no:true};var cort=[].slice.call(b.querySelectorAll('h3,label,.aju-n,.aju-m,.aju-fn,.aju-est')).filter(function(e){return e.offsetParent&&e.scrollWidth>e.clientWidth+1;}).map(function(e){return e.textContent.slice(0,30)});
  var bajos=[].slice.call(b.querySelectorAll('input:not([type=hidden]),select,.aj-btn')).filter(function(x){return x.offsetParent&&x.getBoundingClientRect().height<43.5;}).map(function(x){return x.id||x.textContent});
  return {cort:cort,bajos:bajos,hs:document.documentElement.scrollWidth>window.innerWidth+1}})()`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + SIN_APPS + CAJON + ESPIA });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: `http://localhost:${PUERTO}/app.html` });
  await T(12000);
  const E = (js) => evaluar(cli, js);
  for (let i = 0; i < 60 && !(await E(`_esDueno()`)); i++) await T(500);
  for (let i = 0; i < 6; i++) { await E(`try{go('resultados');resVer('gas')}catch(e){}`); await T(i ? 3000 : 6000); if (await E(`!!document.getElementById('resProv')`)) break; }
  for (let i = 0; i < 80; i++) { await T(500); if (await E(`document.querySelectorAll('#resProv .aju-r').length>0`)) break; }
  await T(600);
  /* SIN_CLAVE=1: como si la 782 no estuviera (la base no manda la clave), para probar el blindaje. */
  if (process.env.SIN_CLAVE === '1') { await E(`(AJ_DATA.provisiones||[]).forEach(function(p){delete p.clave});_ajPPintarRes()`); await T(400); }
  const L = await E(`(function(){var r=[].slice.call(document.querySelectorAll('#resProv .aju-r')),P=AJ_DATA.provisiones||[],mal=[];
    P.forEach(function(p,i){var m=document.querySelector('#resProv .aju-r[data-i="'+i+'"] .aju-m');if(!m){mal.push('falta '+p.concepto);return;}var n=numAR(p.monto),t=m.textContent;
      if(isFinite(n)&&t.indexOf('$'+Math.round(n).toLocaleString('es-AR')+' ')<0)mal.push(p.concepto+': '+t);if(/_/.test(t))mal.push('código: '+t);});
    var cuenta={};P.forEach(function(p){cuenta[p.concepto]=(cuenta[p.concepto]||0)+1});
    var rep=P.map(function(p,i){return {i:i,c:p.concepto,cl:p.clave||''}}).filter(function(x){return cuenta[x.c]>1});
    var uni=P.map(function(p,i){return {i:i,c:p.concepto,cl:p.clave||''}}).filter(function(x){return cuenta[x.c]===1});
    return {n:r.length,total:P.length,mal:mal,rep:rep,uni:uni,con782:P.length>0&&P.every(function(p){return !!p.clave})}})()`);
  chk(L.n === L.total && L.n > 0, `Resultados › Gastos: ${L.n} de ${L.total} provisiones al pie`);
  chk(!L.mal.length, `montos y categorías bien leídos${L.mal.length ? ' — ' + L.mal.slice(0, 3).join(' | ') : ''}`);
  const M0 = await E(MIRA);
  chk(!M0.cort.length && !M0.hs, `lista: nada cortado ni scroll horizontal${(M0.cort || []).length ? ' — ' + M0.cort.join(' | ') : ''}`);
  await foto(cli, 'res_provisiones');

  /* Una con el concepto único: se guarda con su clave (si la base ya la manda) y su origConcepto. */
  const u = L.uni[0];
  await E(`ajPAbrir('${u.i}')`); await T(800);
  const F = await E(`(function(){var b=document.getElementById('ajPFok'),m=document.getElementById('ajPF_m'),a=m.value,r={dis:b.disabled,est:document.getElementById('ajPFest').textContent};
    m.value=String(Math.round(numAR(a)||0)+1000);m.dispatchEvent(new Event('input',{bubbles:true}));r.on=!b.disabled;r.nuevo=m.value;return r})()`);
  const M1 = await E(MIRA);
  chk(F.dis && F.est === 'Sin cambios' && F.on, `ficha: apagado al abrir («${F.est}») y prendido con un cambio`);
  chk(!M1.cort.length && !M1.hs, `ficha: nada cortado ni scroll horizontal${(M1.cort || []).length ? ' — ' + M1.cort.join(' | ') : ''}`);
  chk(ANCHO >= 760 || !M1.bajos.length, `ficha (celular): campos de 44 px${(M1.bajos || []).length ? ' — ' + M1.bajos.join(', ') : ''}`);
  await foto(cli, 'res_provision_ficha');
  await E(`ajSaveProv(document.getElementById('ajPFok'))`); await T(2500);
  const G = await E(`window.__prov`), p = G[0] || {};
  chk(G.length === 1 && p.origConcepto === u.c && String(p.monto) === F.nuevo, `guardar: origConcepto «${p.origConcepto}» y el monto nuevo`);
  chk(L.con782 ? p.clave === u.cl : !('clave' in p), L.con782 ? `guardar: manda la clave «${p.clave}»` : 'guardar: sin la 782 no hay clave que mandar');

  /* Una con el concepto repetido */
  for (let i = 0; i < 40; i++) { await T(500); if (await E(`!!(AJ_DATA&&document.getElementById('resProv'))`)) break; }
  if (L.rep.length) {
    const r0 = L.rep[0];
    /* guardar recargó Ajustes de la base (con la clave): sin la 782 de mentira, se la vuelve a sacar */
    if (process.env.SIN_CLAVE === '1') await E(`(AJ_DATA.provisiones||[]).forEach(function(p){delete p.clave})`);
    await E(`window.__prov=[];AJ_PF=null;ajPAbrir('${r0.i}')`); await T(800);
    const R = await E(`(function(){var b=document.getElementById('ajPFok'),m=document.getElementById('ajPF_m');m.value=String(Math.round(numAR(m.value)||0)+5);m.dispatchEvent(new Event('input',{bubbles:true}));
      return {on:!b.disabled,est:document.getElementById('ajPFest').textContent}})()`);
    if (L.con782) chk(R.on, `repetida «${r0.c}» con la 782: se puede guardar (va por su clave)`);
    else {
      chk(!R.on && /pisar/.test(R.est), `repetida «${r0.c}» sin la 782: Guardar no se prende («${R.est}»)`);
      await E(`window.confirm=function(){return true};ajPBorrar()`); await T(1200);
      chk((await E(`window.__prov.length`)) === 0, `repetida «${r0.c}» sin la 782: Borrar no manda nada`);
    }
  }
  /* Desde Ajustes */
  await E(`window.confirm=function(){return true};AJ_PF=null;go('ajustes');ajGo('inicio')`); await T(1500);
  const Pt = await E(`[].slice.call(document.querySelectorAll('#ajBody .ajp-acc button')).map(function(b){return b.textContent}).join(' | ')`);
  chk(/Provisiones › en Resultados/.test(Pt), 'Ajustes › Plata: «Provisiones › en Resultados»');
  await E(`ajGo('provisiones')`); await T(3000);
  chk(await E(`(document.querySelector('.pg.on')||{}).id==='p-resultados'&&!!document.getElementById('resProv')`), '«Provisiones › en Resultados» lleva a Resultados › Gastos');
  const errs = await E(`(window.__err||[]).slice(0,5)`).catch(() => []);
  chk(!errs || !errs.length, `sin errores de JS${errs && errs.length ? ' — ' + errs.join(' | ') : ''}`);
  console.log(`\nProvisiones en Resultados a ${ANCHO} px (${L.con782 ? 'con' : 'sin'} la 782): ${ok.length} bien, ${mal.length} mal`);
  ok.forEach((m) => console.log('  ok  ' + m)); mal.forEach((m) => console.log('  MAL ' + m));
  process.exit(mal.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
