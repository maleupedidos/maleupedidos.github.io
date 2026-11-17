/* LEER CAJA Y LA DEUDA CON PROVEEDORES COMO LAS VE TADEO (17/11/2026). Sesión real con la guarda de solo lectura.
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/leer_caja_y_deuda.js <token> [ancho] [proveedor1,proveedor2]
   Imprime los lugares del efectivo (_lugAct), «Hoy» de Caja, y el renglón de cada proveedor en Compras › Pagar. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S, PROVS] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  for (let i = 0; i < 6; i++) {
    await evaluar(cli, `try{go('caja')}catch(e){}`); await T(i ? 3000 : 7000);
    if ((await evaluar(cli, `(document.querySelector('.pg.on')||{}).id||''`).catch(() => '')) === 'p-caja') break;
  }
  for (let i = 0; i < 30; i++) { if ((await evaluar(cli, `!!(typeof _lugAct==='function'&&_lugAct())`))) break; await T(1000); }
  await T(3000);
  console.log('lugares:', await evaluar(cli, `JSON.stringify((function(L){return {cf:L.cf,bil:L.bil,cob:L.cob,total:L.total,reservado:L.reservado}})(_lugAct()))`));
  console.log('hoy:', await evaluar(cli, `JSON.stringify(window._cjHoyDato||null)`));
  console.log('efectivo (texto):', await evaluar(cli, `(document.querySelector('#cBal')||{}).innerText.replace(/\\s+/g,' ').slice(0,420)`));
  const provs = (PROVS || 'Sevuchitas,Bernardo Pisano').split(',');
  await evaluar(cli, `try{go('busqueda')}catch(e){}`); await T(9000);
  await evaluar(cli, `try{abaSwitchTab('pagos')}catch(e){}`); await T(6000);
  for (const p of provs) {
    const t = await evaluar(cli, `(function(){var r=[].filter.call(document.querySelectorAll('#pg-abast *'),function(e){return e.children.length<40&&e.innerText&&e.innerText.indexOf(${JSON.stringify(p)})===0&&e.innerText.length<400;});r.sort(function(a,b){return a.innerText.length-b.innerText.length});return r.length?r[r.length-1].innerText.replace(/\\s+/g,' '):'(no aparece en Pagar)';})()`);
    console.log('Compras ›', p, '::', t);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
