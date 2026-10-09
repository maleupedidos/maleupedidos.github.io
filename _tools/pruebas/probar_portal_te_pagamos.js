/* Mi Portal: «Te pagamos $X el dd/mm», una linea por liquidacion (9/10/2026).

     node _tools/pruebas/probar_portal_te_pagamos.js [puerto]

   Reusa el dashboard inventado y el PREP de probar_portal_pulido.js (mismo
   portal, mismos datos) y le agrega `liqs`, que es lo que manda el backend con
   la palanca LIQUIDACION_RED prendida. Sin `liqs` (palanca apagada) no tiene que
   aparecer nada. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const PUERTO = Number(process.argv[2] || 8080);
const src = fs.readFileSync(path.join(__dirname, 'probar_portal_pulido.js'), 'utf8');
const trozo = src.slice(src.indexOf('const hoyAr ='), src.indexOf('let _prepId'));
const { DASH, prep } = new Function(trozo + '; return { DASH: DASH, prep: prep };')();
const T = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const LINEAS = `[].map.call(document.querySelectorAll('.rlq-pagamos'),function(e){return e.textContent.replace(/\\s+/g,' ').trim();})`;

async function cargar(cli, dash) {
  const id = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(dash) })).identifier;
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
  for (let i = 0; i < 100; i++) { await T(200); try { if (await evaluar(cli, `!!document.querySelector('#obj-card .ob-head')`)) break; } catch (e) {} }
  await T(600);
  /* La caja se dibuja al abrir «Plata», no al cargar. */
  await evaluar(cli, `(function(){var t=document.querySelector('.mtab[data-mtab="plata"]'); if(t)t.click(); return !!t;})()`);
  for (let i = 0; i < 30; i++) { await T(150); try { if (await evaluar(cli, `!!document.querySelector('.caja-hero')`)) break; } catch (e) {} }
  await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: id });
}
(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cargar(cli, DASH);
    chk('el portal dibujó la caja', await evaluar(cli, `!!document.querySelector('.caja-hero')`));
    chk('sin liquidaciones no dice «Te pagamos»', (await evaluar(cli, LINEAS)).length === 0);
    const con = Object.assign({}, DASH, { liqs: [
      { id: 'LQ-0002', f: '02/11/2026', total: 45000, com: 39000, env: 6000, n: 3, q: '16 al 31 de octubre' },
      { id: 'LQ-0001', f: '16/10/2026', total: 123700, com: 123700, env: 0, n: 2, q: '1 al 15 de octubre' }] });
    await cargar(cli, con);
    const l = await evaluar(cli, LINEAS);
    chk('una línea por liquidación (2)', l.length === 2, l);
    chk('«Te pagamos $45.000 el 02/11», con su quincena', /Te pagamos \$45\.000 el 02\/11 · 16 al 31 de octubre/.test(l[0] || ''), l[0]);
    chk('«Te pagamos $123.700 el 16/10»', /Te pagamos \$123\.700 el 16\/10 · 1 al 15 de octubre/.test(l[1] || ''), l[1]);
    const err = await evaluar(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
    console.log('\n' + ok + ' ok · ' + mal + ' MAL');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('ERROR ' + (e && e.stack || e)); salir(2); }
})();
