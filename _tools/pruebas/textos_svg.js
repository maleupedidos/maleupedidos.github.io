/* DÓNDE CAE CADA TEXTO DE LOS GRÁFICOS (16/11/2026): para entender una pisada que `pisadas.js` informa dentro de un SVG.
     SBSES=<ses.json> node _tools/pruebas/textos_svg.js <token> <tab> <ancho> <texto1> [texto2 …]
   Lista los <text> de la tab cuyo contenido incluye alguno de los textos, con su caja en la página y su clase. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, TAB, ANCHO_S, ...BUSCA] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const PREP = require('./sesion_prep.js')(TOKEN || 'x');
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  await evaluar(cli, `try{go(${JSON.stringify(TAB)})}catch(e){}`);
  await T(9000);
  const r = await evaluar(cli, `(function(){var B=${JSON.stringify(BUSCA)};var out=[];document.querySelectorAll('.pg.on svg text').forEach(function(t){var s=(t.textContent||'').trim();if(!B.some(function(b){return s.indexOf(b)>=0;}))return;var r=t.getBoundingClientRect();if(!r.width)return;var sv=t.closest('svg');var lab=sv?(sv.getAttribute('aria-label')||''):'';out.push(lab.slice(0,30)+' | '+t.getAttribute('class')+' | «'+s+'» | x '+Math.round(r.left)+'-'+Math.round(r.right)+' y '+Math.round(r.top+scrollY)+'-'+Math.round(r.bottom+scrollY));});return out.join('\\n');})()`);
  console.log(r);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
