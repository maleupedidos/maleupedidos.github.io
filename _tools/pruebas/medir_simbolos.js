/* SÍMBOLOS A LA VISTA (12/11/2026): recorre las tabs del menú y cuenta, en el texto VISIBLE, flechas, tildes,
   cruces, estrellas, ↻ y emojis. La «→» de «de A → B» se deja: es tipografía (Dux: «Ver movimientos →»). El ERP no lleva símbolos tipográficos (Tadeo, 10/11/2026): íconos de trazo o nada.
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/medir_simbolos.js [ancho]
   Sale con 1 si encuentra alguno. Los POST se cortan. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const SB = require(path.join(__dirname, 'sbses_guarda.js'))(process.env.SBSES, process.env.USUARIO || 'tadeo');
if (!SB) { console.error('falta SBSES'); process.exit(2); }
const W = Number(process.argv[2] || 1440);
const CORTE = "(function(){var of=window.fetch;window.fetch=function(u,o){var url=String((u&&u.url)||u||'');if(o&&String(o.method||'').toUpperCase()==='POST'&&!/rpc\\/(.*_pantalla|.*_base|mi_sesion|palancas.*|permiso.*|lectura.*|ventas.*|admin.*|eerr.*)/.test(url)&&!/auth\\/v1/.test(url))return Promise.reject(new TypeError('cortado'));return of.apply(this,arguments);};})()";
const MIRAR = "(function(){var pg=document.querySelector('.pg.on');if(!pg)return '{}';var w=document.createTreeWalker(pg,NodeFilter.SHOW_TEXT),n,o={};" +
  "while(n=w.nextNode()){var p=n.parentElement;if(!p||!p.getClientRects().length)continue;var cs=getComputedStyle(p);if(cs.visibility==='hidden')continue;" +
  "var m=n.nodeValue.match(/[\\u25BE\\u25B4\\u2190\\u25B8\\u25C2\\u21C4\\u2713\\u2715\\u2605\\u26A0\\u21BB\\u270E\\u25C0\\u25B6]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/g);" +
  "if(m)m.forEach(function(ch){var k=ch+' '+String(p.className||p.tagName).split(' ')[0];o[k]=(o[k]||0)+1;});}return JSON.stringify(o);})()";
(async () => {
  const c = await abrir(); const ev = (e) => evaluar(c, e);
  await c.enviar('Runtime.enable'); await c.enviar('Page.enable');
  await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SB });
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 700 });
  await c.enviar('Page.navigate', { url: process.env.BASE_URL || 'http://localhost:8080/app.html' });
  for (let i = 0; i < 40 && !(await ev("typeof go==='function'")); i++) await T(250);
  await T(3000); await ev(CORTE);
  const tabs = await ev('(function(){var s={};[].slice.call(document.querySelectorAll(".bn[data-p]")).forEach(function(e){s[e.getAttribute("data-p")]=1});return Object.keys(s);})()');
  let tot = 0;
  for (const t of tabs) {
    await ev(`try{go(${JSON.stringify(t)})}catch(e){}`); await T(4500);
    const o = JSON.parse(await ev(MIRAR)); const n = Object.values(o).reduce((a, b) => a + b, 0); tot += n;
    console.log(t.padEnd(13), n ? JSON.stringify(o) : '0');
  }
  console.log('\n  total: ' + tot);
  try { c.matar(); } catch (e) {}
  process.exit(tot ? 1 : 0);
})();
