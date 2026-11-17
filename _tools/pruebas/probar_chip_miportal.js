/* MI PORTAL (vista admin): el chip «Maleu le debe $X de comisión · quincena del …» no se corta (17/11/2026).
     SBSES=<ses.json> BASE_URL=http://localhost:8163/app.html node _tools/pruebas/probar_chip_miportal.js <token> <ancho>
   Mide cada `.va-chip` visible de Mi Portal: el texto entero adentro (scrollWidth ≤ clientWidth) y el chip adentro de su caja. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  for (let i = 0; i < 6; i++) {
    await evaluar(cli, `try{go('miportal')}catch(e){}`); await T(i ? 3000 : 7000);
    if ((await evaluar(cli, `(document.querySelector('.pg.on')||{}).id||''`).catch(() => '')) === 'p-miportal') break;
  }
  let r = null;
  for (let i = 0; i < 40; i++) {
    r = JSON.parse(await evaluar(cli, `JSON.stringify([].filter.call(document.querySelectorAll('.va-chip'),function(c){return c.offsetParent&&/Maleu le debe/.test(c.textContent);}).map(function(c){
      var b=c.getBoundingClientRect(),p=c.parentElement.getBoundingClientRect();
      return {t:c.textContent.slice(0,70),sw:c.scrollWidth,cw:c.clientWidth,der:Math.round(b.right-p.right),h:Math.round(b.height)};}))`));
    if (r.length) break;
    await T(1000);
  }
  console.log(JSON.stringify(r));
  const malos = r.filter((c) => c.sw > c.cw + 1 || c.der > 1);
  if (!r.length) { console.log('SIN CHIPS para medir (0 elementos): no prueba nada'); process.exit(2); }
  console.log(malos.length ? 'MAL: ' + malos.length + ' de ' + r.length + ' cortados' : 'OK: ' + r.length + ' chips enteros');
  process.exit(malos.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
