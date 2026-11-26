/* FOTO DE UNA TAB, COMO LA USA TADEO (11/11/2026): sesión real, POST cortados, cajón lateral ABIERTO en la compu.
     SBSES=<sbses.json> node _tools/pruebas/foto_tab.js <token> <tab> <ancho> <salida.png> [--alto 1800] [--js "código a correr antes"]
     BASE_URL=https://app.maleu.com.ar/app.html  ← para la foto del "antes" (lo publicado)
   La foto es de toda la página hasta --alto px. Sirve para el antes/después de un cambio de diseño. */
'use strict';
const fs = require('fs');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const a = process.argv.slice(2), [TOKEN, TAB, ANCHO_S, OUT] = a;
const ANCHO = Number(ANCHO_S || 1440), ALTO = Number(a.includes('--alto') ? a[a.indexOf('--alto') + 1] : 1800);
const JS = a.includes('--js') ? a[a.indexOf('--js') + 1] : '';
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN || !TAB || !OUT) { console.error('uso: foto_tab.js <token> <tab> <ancho> <salida.png>'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
/* CAJON=0 → la foto con el cajón lateral CERRADO (como Tadeo a 1362 px, 16/11/2026). */
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open'," + (process.env.CAJON === '0' ? "'0'" : "'1'") + ")}catch(e){}" : '';
/* (16/11/2026) Con una sesión de la base de verdad, SIN la marca «Apps Script vive» del PREP: con ella el arranque no pide la
   historia a la base y la foto sale con los 400 del adelanto (Total Maleu daba ↗ 96% en vez de ↘ 23%). */
const SIN_APPS = process.env.SBSES ? ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" : '';
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + SIN_APPS + CAJON });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  /* (16/11/2026) `go` a veces no llega (el arranque todavía repinta Inicio): se insiste hasta que la tab quede activa. */
  for (let i = 0; i < 6; i++) {
    await evaluar(cli, `try{go(${JSON.stringify(TAB)})}catch(e){}`);
    await T(i ? 3000 : 7000);
    const on = await evaluar(cli, `(function(){var p=document.querySelector('.pg.on');return p?p.id:''})()`).catch(() => '');
    if (on === 'p-' + TAB) break;
  }
  if (JS) { await evaluar(cli, JS); await T(1500); }
  await evaluar(cli, 'window.scrollTo(0,0)');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await T(1500);
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
  console.log('foto:', OUT, ANCHO + 'x' + ALTO);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
