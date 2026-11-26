/* CUÁNTAS VARIANTES DE BOTÓN, TARJETA Y TÍTULO HAY EN EL ERP (11/11/2026).
     SBSES=<sbses.json> node _tools/pruebas/medir_escala.js <token> [ancho] [tabs,separadas] [--json salida.json]
     BASE_URL=http://localhost:8080/app.html (default)
   Recorre las tabs del menú con la sesión real (POST cortados, guarda de solo lectura) y, por cada
   botón VISIBLE de la página activa, anota su firma: alto · tamaño/peso de letra · radio · tipo
   (relleno / borde / plano). Lo mismo con las tarjetas (caja con fondo blanco y radio >= 6) y los títulos.
   Sirve para ver cuántas variantes hay antes de llevarlas a la escala única, y cuántas quedan después.
   «0 variantes sobre 0 botones» es un verde falso: la salida dice cuántos examinó. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const TOKEN = args[0], ANCHO = Number(args[1] || 1440), SOLO = args[2] && !args[2].startsWith('--') ? args[2].split(',') : null;
const JSONOUT = args.includes('--json') ? args[args.indexOf('--json') + 1] : '';
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');

const MEDIR = `(function(){
  var pg=document.querySelector('.pg.on'); if(!pg) return null;
  function vis(el){ for(var n=el;n&&n!==document.body;n=n.parentElement){var cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05) return false;} return true; }
  function tr(c){ return !c||c==='transparent'||/rgba\\([^)]*,\\s*0\\)$/.test(c); }
  var btn={}, nb=0, card={}, nc=0, tit={};
  pg.querySelectorAll('button').forEach(function(el){
    var r=el.getBoundingClientRect(); if(r.width<=0||r.height<=0||!vis(el)) return;
    var cs=getComputedStyle(el), txt=(el.textContent||'').trim();
    if(!txt) return; /* solo íconos: otra familia */
    nb++;
    var tipo = !tr(cs.backgroundColor)&&cs.backgroundColor!=='rgb(255, 255, 255)' ? 'relleno' : (parseFloat(cs.borderTopWidth)>0&&!tr(cs.borderTopColor) ? 'borde':'plano');
    var k=Math.round(r.height)+'px '+cs.fontSize+'/'+cs.fontWeight+' r'+cs.borderTopLeftRadius+' '+tipo;
    var c=String(el.className||'').split(' ')[0]||('('+(String(el.parentElement&&el.parentElement.className||'').split(' ')[0]||'?')+'>button)');
    btn[k]=btn[k]||{n:0,cl:{}}; btn[k].n++; btn[k].cl[c]=1;
  });
  pg.querySelectorAll('div,section,article').forEach(function(el){
    var cs=getComputedStyle(el); if(cs.backgroundColor!=='rgb(255, 255, 255)') return;
    if(parseFloat(cs.borderTopLeftRadius)<6||parseFloat(cs.paddingTop)<6) return;
    var r=el.getBoundingClientRect(); if(r.width<120||r.height<40||!vis(el)) return;
    nc++;
    var k='r'+cs.borderTopLeftRadius+' p'+cs.paddingTop+'/'+cs.paddingLeft+' bt'+cs.borderTopWidth+' '+(cs.boxShadow==='none'?'sin-sombra':'sombra');
    var c=String(el.className||'').split(' ')[0]||'(sin clase)';
    card[k]=card[k]||{n:0,cl:{}}; card[k].n++; card[k].cl[c]=1;
  });
  pg.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="titulo"],[class*="-h"]').forEach(function(el){
    var r=el.getBoundingClientRect(); if(r.width<=0||!vis(el)||!(el.textContent||'').trim()) return;
    var cs=getComputedStyle(el); var k=cs.fontSize+'/'+cs.fontWeight; tit[k]=(tit[k]||0)+1;
  });
  return {nb:nb,btn:btn,nc:nc,card:card,tit:tit,base:getComputedStyle(pg).fontSize};
})()`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  const lg = await evaluar(cli, '(function(){var e=document.getElementById("loginScreen");return !!e&&getComputedStyle(e).display!=="none";})()');
  if (lg) { console.error('ABORTA: quedó el login encima'); process.exit(3); }
  const tabs = (await evaluar(cli, '(function(){var s={};[].slice.call(document.querySelectorAll(".bn[data-p]")).forEach(function(e){s[e.getAttribute("data-p")]=1});return Object.keys(s);})()'))
    .filter((k) => k.indexOf('dg') !== 0 && (!SOLO || SOLO.includes(k)));
  const tot = { btn: {}, card: {}, tit: {}, nb: 0, nc: 0 };
  for (const k of tabs) {
    await evaluar(cli, `try{go(${JSON.stringify(k)})}catch(e){}`);
    await T(5000);
    const m = await evaluar(cli, MEDIR);
    if (!m) { console.log(k.padEnd(14), 'sin página'); continue; }
    console.log(k.padEnd(14), 'botones', String(m.nb).padStart(4), '→', Object.keys(m.btn).length, 'variantes · tarjetas', String(m.nc).padStart(3), '→', Object.keys(m.card).length);
    tot.nb += m.nb; tot.nc += m.nc;
    for (const [s, v] of Object.entries(m.btn)) { const t = (tot.btn[s] = tot.btn[s] || { n: 0, cl: {} }); t.n += v.n; Object.assign(t.cl, v.cl); }
    for (const [s, v] of Object.entries(m.card)) { const t = (tot.card[s] = tot.card[s] || { n: 0, cl: {} }); t.n += v.n; Object.assign(t.cl, v.cl); }
    for (const [s, n] of Object.entries(m.tit)) tot.tit[s] = (tot.tit[s] || 0) + n;
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1].n - a[1].n).slice(0, n).map(([s, v]) => '  ' + String(v.n).padStart(4) + '  ' + s.padEnd(40) + Object.keys(v.cl).slice(0, 5).join(' ')).join('\n');
  console.log(`\nBOTONES con texto: ${tot.nb} examinados, ${Object.keys(tot.btn).length} variantes\n` + top(tot.btn, 25));
  console.log(`\nTARJETAS: ${tot.nc} examinadas, ${Object.keys(tot.card).length} variantes\n` + top(tot.card, 20));
  console.log('\nTÍTULOS (tamaño/peso):', Object.entries(tot.tit).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([s, n]) => s + '×' + n).join('  '));
  if (JSONOUT) require('fs').writeFileSync(JSONOUT, JSON.stringify(tot, null, 1));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
