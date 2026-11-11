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
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : '';
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + CAJON });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  await evaluar(cli, `try{go(${JSON.stringify(TAB)})}catch(e){}`);
  await T(7000);
  if (JS) { await evaluar(cli, JS); await T(1500); }
  await evaluar(cli, 'window.scrollTo(0,0)');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await T(1500);
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
  console.log('foto:', OUT, ANCHO + 'x' + ALTO);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
