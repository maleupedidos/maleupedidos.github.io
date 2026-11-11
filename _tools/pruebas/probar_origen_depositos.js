/* PEDIDOS SIN PASAR POR PRODUCTOS: ¿se puede decidir de dónde sale? (11/11/2026, Jerónimo Susini, Home #2439)
     SBSES=<sbses.json> node _tools/pruebas/probar_origen_depositos.js <token> [pedido Hoja|N]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado (la v1057 da rojo)
   Desde el corte la lista de depósitos (D.stockDeps) llegaba solo al abrir Productos: sin ella Pedidos creía que
   había un freezer y escondía «De qué freezer sale» y el reparto por freezer del editor de origen. Sostiene:
     · abriendo la app directo en Pedidos, los depósitos llegan solos (≥ 2) en menos de 8 s;
     · la tarjeta del pedido muestra «De qué freezer sale» con un botón por freezer;
     · si la tarjeta estaba abierta cuando llegan, sigue abierta (el repintado no se la cierra a nadie). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, PED_A] = process.argv.slice(2);
const PED = PED_A || 'Home|2439';
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const CARD = `document.querySelector('.pc[data-pc-key="${PED}"]')`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";(function(){var ce=console.error;window.__stk=[];console.error=function(){try{for(var i=0;i<arguments.length;i++){var a=arguments[i];if(a&&a.stack)window.__stk.push(String(a.stack).slice(0,600));}}catch(e){}return ce.apply(console,arguments);};})();" + ";try{localStorage.setItem('maleu_tab','pedidos')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cli.enviar('Page.navigate', { url: URL });
  /* Se abre la tarjeta APENAS aparece, antes de que lleguen los depósitos: es el caso que el repintado rompía. */
  let abierta = false, t0 = Date.now();
  for (let i = 0; i < 60 && !abierta; i++) {
    await T(500);
    await evaluar(cli, "if(cur!=='pedidos')go('pedidos')");
    abierta = await evaluar(cli, `(function(){var c=${CARD};if(!c)return false;if(c.classList.contains('collapsed')){var s=c.querySelector('.pc-summary')||c;s.click();}return !c.classList.contains('collapsed');})()`);
  }
  chk(abierta === true, `la tarjeta de ${PED} aparece y se abre`);
  let deps = null, ms = 0;
  for (let i = 0; i < 16; i++) { deps = await evaluar(cli, "(D&&Array.isArray(D.stockDeps))?D.stockDeps.map(function(d){return d.id}):null"); if (deps && deps.length) { ms = Date.now() - t0; break; } await T(500); }
  chk(!!deps && deps.length >= 2, `los depósitos llegan solos, sin abrir Productos: ${deps && deps.join(', ')}`, deps);
  await T(1200);
  const r = await evaluar(cli, `(function(){var c=${CARD};if(!c)return {err:'sin tarjeta'};var d=c.querySelector('.ped-dep');
    return {abierta:!c.classList.contains('collapsed'),dep:!!d,botones:d?[].slice.call(d.querySelectorAll('.ped-dep-x')).map(function(b){return b.textContent.trim()}):[]};})()`);
  chk(r.dep === true && r.botones.length >= 3, `la tarjeta muestra «De qué freezer sale»: ${r.botones.join(' · ')}`, r);
  chk(r.abierta === true, 'la tarjeta sigue abierta después de que llegaron los depósitos', r);
  const err = (await evaluar(cli, 'window.__err||[]')).filter((x) => !/ResizeObserver loop/.test(x));
  chk(!err.length, 'sin errores en la consola', err);
  if (err.length) console.log(await evaluar(cli, 'window.__stk||[]'));
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
