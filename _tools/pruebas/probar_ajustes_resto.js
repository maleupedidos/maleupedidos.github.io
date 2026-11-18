/* AJUSTES: LA PORTADA Y LAS SEIS DE CONFIGURACIÓN (18/11/2026). Sesión real, de solo lectura.
     SBSES=<sbses.json> node _tools/pruebas/probar_ajustes_resto.js <token> [390|1440] [puerto] [--foto carpeta]
   Sostiene:
   · la portada: cuatro áreas en el orden de uso (Gente, Productos, Sistema, Plata), cada sub-pantalla una sola vez y
     todas las del menú presentes (ninguna perdida), «Textos cambiados» solo para el dueño;
   · Parámetros, Saldos a favor, Provisiones, Permisos, Textos cambiados y Sesión en la columna (≤ 720 px), sin scroll
     horizontal ni nada cortado;
   · Provisiones como lista con ficha: Guardar apagado al abrir, prendido con un cambio, apagado al volver; Guardar manda
     el concepto original (origConcepto) y lo cambiado; Borrar en «…»;
   · Saldos: la lista arriba y «Dar crédito» plegado.
   Salida 1 si algo falla. */
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
/* Lo que guarda una provisión (Apps Script o la base) se anota y contesta ok. */
const ESPIA = `;(function(){var f=window.fetch;window.__prov=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(),b=String((x&&x.body)||'');
  if(m==='POST'&&(/provision/i.test(s)||/"action":"provision/.test(b))){var j={};try{j=JSON.parse(b)}catch(e){}window.__prov.push(j.p||j);
    return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));}
  return f.apply(this,arguments);};})();`;
const mal = [], ok = [];
const chk = (c, m) => (c ? ok : mal).push(m);
const foto = async (cli, n) => { if (!FOTO) return; const r = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(FOTO, n + '_' + ANCHO + '.png'), Buffer.from(r.data, 'base64')); };
const MIRA = `(function(){var b=document.getElementById('ajBody');var vis=function(e){return e.checkVisibility?e.checkVisibility({contentVisibilityAuto:true}):!!e.offsetParent};
  var cort=[].slice.call(b.querySelectorAll('h3,label,.aju-n,.aju-m,.aj-rol summary b,.ajp-acc button,summary span')).filter(function(e){return vis(e)&&e.scrollWidth>e.clientWidth+1;}).map(function(e){return e.textContent.slice(0,30)});
  var c=b.querySelector('.aju');return {cort:cort,hs:document.documentElement.scrollWidth>window.innerWidth+1,ancho:c?c.offsetWidth:0}})()`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + SIN_APPS + CAJON + ESPIA });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: `http://localhost:${PUERTO}/app.html` });
  await T(12000);
  const E = (js) => evaluar(cli, js);
  for (let i = 0; i < 6; i++) { await E(`try{go('ajustes')}catch(e){}`); await T(i ? 3000 : 6000); if (await E(`(document.querySelector('.pg.on')||{}).id`) === 'p-ajustes') break; }
  for (let i = 0; i < 60 && !(await E(`_esDueno()&&!!AJ_DATA`)); i++) await T(500);
  await E(`ajGo('inicio')`); await T(800);
  const Pt = await E(`(function(){var cs=[].slice.call(document.querySelectorAll('#ajBody .ajp-card'));
    var tit=cs.map(function(c){return c.querySelector('b').textContent});var secs=[].slice.call(document.querySelectorAll('#ajBody .ajp-acc button')).map(function(x){return (x.getAttribute('onclick').match(/ajGo\\('(\\w+)'\\)/)||[])[1]});
    var menu=[].slice.call(document.querySelectorAll('#p-ajustes .aj-pill[data-sec]')).map(function(p){return p.dataset.sec}).filter(function(s){return s!=='inicio'});
    return {tit:tit,secs:secs,faltan:menu.filter(function(s){return secs.indexOf(s)<0}),dup:secs.filter(function(s,i){return secs.indexOf(s)!==i})}})()`);
  chk(Pt.tit.join(',') === 'Gente,Productos,Sistema,Plata', `portada: áreas «${Pt.tit.join(', ')}»`);
  chk(!Pt.faltan.length, `portada: están todas las sub-pantallas${Pt.faltan.length ? ' — faltan: ' + Pt.faltan.join(', ') : ''}`);
  chk(!Pt.dup.length, 'portada: ninguna repetida');
  chk(Pt.secs.indexOf('textos') >= 0, 'portada: el dueño ve «Textos cambiados»');
  const M0 = await E(MIRA);
  chk(!M0.cort.length && !M0.hs, `portada: nada cortado ni scroll horizontal${M0.cort.length ? ' — ' + M0.cort.join(' | ') : ''}`);
  await foto(cli, 'portada');
  for (const sec of ['params', 'saldos', 'provisiones', 'permisos', 'textos', 'sesion']) {
    await E(`ajGo('${sec}')`); await T(sec === 'saldos' ? 2500 : 1200);
    const M = await E(MIRA);
    chk(!M.cort.length && !M.hs, `${sec}: nada cortado ni scroll horizontal${M.cort.length ? ' — ' + M.cort.join(' | ') : ''}`);
    chk(ANCHO < 760 || (M.ancho > 0 && M.ancho <= 722), `${sec}: columna de ${M.ancho} px`);
    await foto(cli, sec);
  }
  await E(`ajGo('saldos')`); await T(1500);
  const Sd = await E(`(function(){var c=[].slice.call(document.querySelectorAll('#ajBody .aj-card'));return {primero:c[0]&&c[0].querySelector('h3').textContent,cred:(document.getElementById('ajCredBox')||{}).open}})()`);
  chk(/saldo a favor/.test(Sd.primero || '') && Sd.cred === false, 'saldos: la lista arriba y «Dar crédito» plegado');

  await E(`ajGo('provisiones')`); await T(1200);
  const Pl = await E(`(function(){var r=document.querySelectorAll('#ajBody .aju-r');return {n:r.length,form:document.querySelectorAll('#ajBody .aj-row.pr').length,c:r[0]&&r[0].dataset.i,con:r[0]&&(AJ_DATA.provisiones[r[0].dataset.i]||{}).concepto}})()`);
  chk(Pl.n > 0 && Pl.form === 0, `provisiones: ${Pl.n} renglones y ningún formulario abierto`);
  /* El monto que se lee es el de la planilla (numAR), y la categoría por su nombre, no su código. */
  const Pm = await E(`(function(){var mal=[];(AJ_DATA.provisiones||[]).forEach(function(p,i){var r=document.querySelector('#ajBody .aju-r[data-i="'+i+'"] .aju-m');if(!r)return;
    var n=numAR(p.monto),txt=r.textContent;if(isFinite(n)&&txt.indexOf('$'+Math.round(n).toLocaleString('es-AR')+' ')<0)mal.push(p.concepto+': '+txt);if(/_/.test(txt))mal.push(p.concepto+' con código: '+txt);});return mal})()`);
  chk(!Pm.length, `provisiones: montos y categorías bien leídos${Pm.length ? ' — ' + Pm.slice(0, 3).join(' | ') : ''}`);
  await E(`ajPAbrir(${JSON.stringify(Pl.c || '')})`); await T(800);
  const Pf = await E(`(function(){var b=document.getElementById('ajPFok'),m=document.getElementById('ajPF_m'),a=m.value,r={dis:b.disabled,est:document.getElementById('ajPFest').textContent};
    m.value=String(Number(String(a).replace(/\\D/g,''))+1000);m.dispatchEvent(new Event('input',{bubbles:true}));r.on=!b.disabled;r.nuevo=m.value;
    m.value=a;m.dispatchEvent(new Event('input',{bubbles:true}));r.off=b.disabled;m.value=r.nuevo;m.dispatchEvent(new Event('input',{bubbles:true}));
    r.borrar=!!document.querySelector('#ajPF .k-menu .k-menu-peligro');return r})()`);
  chk(Pf.dis && Pf.est === 'Sin cambios', `provisión: Guardar apagado y «${Pf.est}» al abrir`);
  chk(Pf.on && Pf.off, 'provisión: Guardar se prende con el cambio y se apaga al volver');
  chk(Pf.borrar, 'provisión: Borrar en «…»');
  await foto(cli, 'provision_ficha');
  await E(`ajSaveProv(document.getElementById('ajPFok'))`); await T(2500);
  const G = await E(`window.__prov`), p = G[0] || {};
  chk(G.length === 1 && p.origConcepto === Pl.con && String(p.monto) === Pf.nuevo, `provisión: guarda con origConcepto «${p.origConcepto}» y el monto nuevo (${p.monto})`);
  await E(`window.confirm=function(){return true};AJ_PF=null;ajRender()`);
  const errs = await E(`(window.__err||[]).slice(0,5)`).catch(() => []);
  chk(!errs || !errs.length, `sin errores de JS${errs && errs.length ? ' — ' + errs.join(' | ') : ''}`);
  console.log(`\nAjustes › portada y configuración a ${ANCHO} px: ${ok.length} bien, ${mal.length} mal`);
  ok.forEach((m) => console.log('  ok  ' + m)); mal.forEach((m) => console.log('  MAL ' + m));
  process.exit(mal.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
