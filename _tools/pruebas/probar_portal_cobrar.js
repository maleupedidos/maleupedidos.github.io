/* MI PORTAL › HOY › «Lo que vas a cobrar» (18/11/2026). Como un representante, con la sesión de la base de ese usuario y la
   guarda de solo lectura (no se escribe nada).
     SBSES=<ses.json de sesion_prueba.py crear … lou vendedor> USUARIO=lou BASE_URL=<app.html> node _tools/pruebas/probar_portal_cobrar.js [ancho]
   Los pedidos que todavía no se le despacharon (falta='bolsa', 664) dicen «Se despacha el <día dd/mm>», sin pedirle nada, y
   NINGÚN texto le pide marcar un cobro (cobra Maleu). Antes decían «Entregado sin cobrar · falta marcar el cobro». */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const U = process.env.USUARIO || 'lou';
process.env.PREP_SESION = process.env.PREP_SESION || `{usuario:${JSON.stringify(U)},rol:"vendedor",nombre:${JSON.stringify(U)},ts:Date.now()}`;
const PREP = require('./sesion_prep.js')('x');
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, U);
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba');localStorage.setItem('maleu_red_main_tab','hoy')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 2, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(9000);
  await evaluar(cli, `try{go('miportal')}catch(e){}`);
  let txt = '';
  for (let i = 0; i < 40; i++) { txt = await evaluar(cli, `(function(){var b=document.getElementById('cob-card');return b&&!b.classList.contains('hidden')?b.innerText:''})()`); if (txt) break; await T(800); }
  const t1 = txt.replace(/\s+/g, ' ');
  console.log('   tarjeta:', t1.slice(0, 600));
  chk(!!txt, 'la tarjeta «Lo que vas a cobrar» se ve');
  chk(!/falta marcar el cobro|Entregado sin cobrar|marcar el cobro/i.test(t1), 'ningún texto le pide marcar un cobro');
  const n = (t1.match(/Se despacha el (lunes|martes|miércoles|jueves|viernes|sábado|domingo) \d{1,2}\/\d{1,2}/g) || []).length;
  console.log('   pedidos que se despachan:', n);
  chk(n > 0 || !/Se despacha/.test(t1), 'los que no se despacharon dicen «Se despacha el <día dd/mm>» (' + n + ')');
  const venc = await evaluar(cli, `(function(){var b=document.getElementById('venc-card');return b&&!b.classList.contains('hidden')?b.innerText:''})()`);
  chk(!/marcar el cobro/i.test(venc || ''), 'tampoco los vencidos piden marcar un cobro');
  const errs = JSON.parse(await evaluar(cli, `JSON.stringify((window.__err||[]).filter(function(e){return !/cortado por la prueba|solo lectura|ResizeObserver/i.test(e)}))`));
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
