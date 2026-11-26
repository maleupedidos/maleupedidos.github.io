/* TEXTOS LARGOS A LA VISTA (12/11/2026): por cada tab del menú, los bloques de texto corrido de más de 140
   caracteres (sin contar listas ni números). Un software comprado explica en una línea; lo demás va al «?».
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/medir_textos_largos.js [ancho] [tabs]
   Solo lectura: los POST se cortan. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const SB = require(path.join(__dirname, 'sbses_guarda.js'))(process.env.SBSES, process.env.USUARIO || 'tadeo');
if (!SB) { console.error('falta SBSES'); process.exit(2); }
const W = Number(process.argv[2] || 1440), SOLO = process.argv[3] ? process.argv[3].split(',') : null;
const CORTE = "(function(){var of=window.fetch;window.fetch=function(u,o){var url=String((u&&u.url)||u||'');if(o&&String(o.method||'').toUpperCase()==='POST'&&!/rpc\\/(.*_pantalla|.*_base|mi_sesion|palancas.*|permiso.*|lectura.*|ventas.*|admin.*|eerr.*)/.test(url)&&!/auth\\/v1/.test(url))return Promise.reject(new TypeError('cortado'));return of.apply(this,arguments);};})()";
const MIRAR = "(function(){var pg=document.querySelector('.pg.on');if(!pg)return '[]';var o=[],vistos=new Set();" +
  "pg.querySelectorAll('p,div,span,small,li').forEach(function(e){if(!e.getClientRects().length)return;" +
  "var t='';e.childNodes.forEach(function(n){if(n.nodeType===3)t+=n.nodeValue;else if(n.nodeType===1&&/^(B|I|EM|STRONG|SPAN|A|SMALL|CODE)$/.test(n.tagName)&&n.childElementCount===0)t+=n.textContent;});" +
  "t=t.replace(/\\s+/g,' ').trim();if(t.length<140)return;var dig=(t.match(/[0-9$]/g)||[]).length;if(dig>t.length*0.08)return;" +
  "var k=t.slice(0,60);if(vistos.has(k))return;vistos.add(k);o.push({c:String(e.className||e.tagName).split(' ')[0],n:t.length,t:t.slice(0,110)});});return JSON.stringify(o);})()";
(async () => {
  const c = await abrir(); const ev = (e) => evaluar(c, e);
  await c.enviar('Runtime.enable'); await c.enviar('Page.enable');
  await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SB });
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 700 });
  await c.enviar('Page.navigate', { url: process.env.BASE_URL || 'http://localhost:8080/app.html' });
  for (let i = 0; i < 40 && !(await ev("typeof go==='function'")); i++) await T(250);
  await T(3000); await ev(CORTE);
  const tabs = (await ev('(function(){var s={};[].slice.call(document.querySelectorAll(".bn[data-p]")).forEach(function(e){s[e.getAttribute("data-p")]=1});return Object.keys(s);})()')).filter((t) => !SOLO || SOLO.includes(t));
  let tot = 0;
  for (const t of tabs) {
    await ev(`try{go(${JSON.stringify(t)})}catch(e){}`); await T(4500);
    const l = JSON.parse(await ev(MIRAR)); tot += l.length;
    console.log(t.padEnd(13), l.length);
    l.forEach((x) => console.log('    ' + String(x.n).padStart(4) + '  ' + x.c.padEnd(22) + x.t));
  }
  console.log('\n  total: ' + tot);
  try { c.matar(); } catch (e) {}
  process.exit(0);
})();
