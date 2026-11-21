/* LA VERSIÓN MÍNIMA (21/11/2026). WebKit 390, sin sesión (no hace falta: corre antes que todo).
   PW=<playwright-core> BASE=http://localhost:8155/app.html node probar_version_minima.js
   1. Con la mínima por debajo de este build: sin cartel, y copiar copia.
   2. Con la mínima POR ENCIMA (se contesta `version-min.json` con v9999): el cartel fijo, se recarga de cero sola como
      mucho dos veces (no queda en bucle), y mientras tanto el portapapeles NO copia. */
'use strict';
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html';
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
(async () => {
  const br = await pw.webkit.launch();
  for (const min of [null, 'maleu-panel-v9999']) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(`window.confirm=function(){return true;}; window.alert=function(){};`);
    if (min) await ctx.route('**/version-min.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ min }) }));
    const pg = await ctx.newPage();
    let cargas = 0; pg.on('load', () => { cargas++; });
    console.log('\n=== mínima ' + (min || '(la publicada)') + ' ===');
    await pg.goto(BASE + '?prueba=1&v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(16000);   /* el chequeo corre a los 3 s; con recargas, varias vueltas */
    const E = await pg.evaluate(async () => {
      const b = document.getElementById('verVieja');
      let copia = 'ok';
      try { await navigator.clipboard.writeText('x'); } catch (e) { copia = String(e && e.message || e); }
      return { propia: typeof _APP_CN_PAGINA === 'string' ? _APP_CN_PAGINA : '', vieja: !!window.__verVieja, cartel: !!(b && !b.hidden), copia };
    });
    console.log('  ' + JSON.stringify(E) + ' · cargas ' + cargas);
    if (!min) {
      chk('build ' + E.propia + ' con la mínima publicada: sin cartel', !E.vieja && !E.cartel, E);
      chk('  y copiar no lo frena la mínima', !/version vieja/.test(E.copia), E.copia);
    } else {
      chk('con la mínima por encima: queda marcada vieja y con el cartel fijo', E.vieja && E.cartel, E);
      chk('  el portapapeles NO copia («version vieja»)', /version vieja/.test(E.copia), E.copia);
      chk('  se recargó sola, y no más de dos veces (sin bucle)', cargas >= 2 && cargas <= 3, cargas);
    }
    await ctx.close();
  }
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
