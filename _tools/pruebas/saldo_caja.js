/* EL SALDO DE CADA CUENTA, COMO LO VE TADEO EN CAJA (16/11/2026). Abre el ERP con la sesión de la base (guarda de solo
   lectura), entra a Caja y lee `_calcSaldo()`, la misma cuenta que dibuja las tarjetas. Para mostrar un antes y después
   de cargar un movimiento.
     SBSES=<ses.json> node _tools/pruebas/saldo_caja.js <token>   → {"efectivo":…, "mp":…, "brubank":…} */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const TOKEN = process.argv[2] || 'x';
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1362, height: 900, deviceScaleFactor: 1, mobile: false });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  await evaluar(cli, `try{go('caja')}catch(e){}`);
  let r = null;
  for (let i = 0; i < 30; i++) {
    await T(1000);
    r = await evaluar(cli, `(function(){try{if(!D||!D.caja||!D.saldoBase)return null;var c=_calcSaldo();return JSON.stringify({porCuenta:c.porCuenta,mp:Math.round(c.mp*100)/100,ef:Math.round(c.ef*100)/100,gastosMP:D.caja.gastosMP});}catch(e){return 'err '+e.message}})()`).catch(() => null);
    if (r && r.indexOf('porCuenta') >= 0) break;
  }
  console.log(r);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
