/* DESHACER UN PAGO A PROVEEDOR (17/11/2026, 746). Sesión del dueño con la guarda de solo lectura: el deshacer de verdad no
   sale (la escritura la prueba `estancias/scripts/migraciones/vivo746.py`); acá se mide la pantalla.
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_deshacer_pago.js <token> <proveedor> [ancho] [carpeta]
   Caja y Compras esconden lo de PRUEBA, así que el pago de hoy se INYECTA en la copia de la pantalla (D.movimientos, un gasto
   «Proveedor» con fila 999999): no se toca la base. <proveedor> es el nombre que se le pone.
   1) Caja › libro: el renglón del pago tiene «Deshacer» (≥ 44 px en el celular) y no el candado; el toque pregunta y sale a
      caja_pago_deshacer_directo con la fila de Egresos (la guarda lo corta).
   2) Compras › Pagar: «Pagos de hoy» lo lista con «Deshacer», que sale al mismo lugar.
   Consola sin errores. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, PROV, ANCHO_S, DIR] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : '';
const INY = (prov) => `(function(){if(!D||!Array.isArray(D.movimientos))return false;D.movimientos=D.movimientos.filter(function(m){return m.r!==999999});
  var b=D.movimientos.filter(function(m){return m.tipo==='gasto'&&m.f})[0]||{f:'01/01/2026 12:00'},h=new Date(),dd=('0'+h.getDate()).slice(-2)+'/'+('0'+(h.getMonth()+1)).slice(-2)+'/'+h.getFullYear();
  D.movimientos.unshift({tipo:'gasto',f:[dd].concat(String(b.f).split(' ').slice(1)).join(' '),ts:Date.now(),r:999999,cat:'Proveedor',con:${JSON.stringify(prov)},met:'Mercado Pago',$:1000,noBorrar:'proveedor'});return true;})()`;
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
async function foto(cli, n) { if (!DIR) return; const r = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(DIR, n), Buffer.from(r.data, 'base64')); }
async function clicEl(cli, expr) {
  const r = JSON.parse(await evaluar(cli, `(function(){var e=${expr};if(!e)return 'null';e.scrollIntoView({block:'center'});var b=e.getBoundingClientRect();return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2,h:b.height});})()`));
  if (!r) return null;
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
  return r;
}
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" + CAJON
    + ";window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(String(e.message).slice(0,160))});"
    + ";window.__conf=[];window.confirm=function(m){window.__conf.push(String(m));return true};" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: ANCHO < 700 ? 2 : 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(8000);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(typeof SESSION!=='undefined'&&SESSION&&SESSION.dueno)`)) break; await T(500); }
  // 1) Caja
  for (let i = 0; i < 6; i++) {
    await evaluar(cli, `try{go('caja')}catch(e){}`); await T(i ? 2000 : 4000);
    if ((await evaluar(cli, `(document.querySelector('.pg.on')||{}).id||''`)) === 'p-caja') break;
  }
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(D&&Array.isArray(D.movimientos)&&D.movimientos.length&&document.querySelector('#p-caja .cj-r'))`)) break; await T(700); }
  await T(1500);
  chk(await evaluar(cli, INY(PROV)), 'pago de hoy inyectado en la copia de Caja');
  await evaluar(cli, `try{rMovimientos()}catch(e){window.__errs.push('rMov '+e.message)}`); await T(500);
  const rowExpr = `[].filter.call(document.querySelectorAll('#p-caja .cj-r.t-gasto'),function(r){return r.innerText.indexOf(${JSON.stringify(PROV)})>=0})[0]`;
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(${rowExpr})`)) break; await T(700); }
  const R = JSON.parse(await evaluar(cli, `(function(){var r=${rowExpr};if(!r)return JSON.stringify({});var b=r.querySelector('.cj-deshacer');
    return JSON.stringify({txt:r.innerText.replace(/\\s+/g,' ').slice(0,140),boton:b?b.textContent:'',candado:!!r.querySelector('.gl-x-no')});})()`));
  console.log('   renglón:', JSON.stringify(R));
  chk(R.boton === 'Deshacer' && !R.candado, 'Caja › libro: el pago de hoy tiene «Deshacer» y no el candado');
  const b1 = await clicEl(cli, `(${rowExpr}||document).querySelector('.cj-deshacer')`);
  if (ANCHO < 700) chk(b1 && b1.h >= 44, 'el botón mide ' + (b1 && Math.round(b1.h)) + ' px (≥ 44)');
  await T(1500);
  let conf = JSON.parse(await evaluar(cli, `JSON.stringify(window.__conf)`));
  let bl = JSON.parse(await evaluar(cli, `JSON.stringify(window.__bloqueados||[])`));
  chk(conf.length === 1 && conf[0].indexOf(PROV) >= 0, 'pregunta antes, con el proveedor: ' + (conf[0] || '').replace(/\n+/g, ' · ').slice(0, 120));
  chk(bl.some((x) => /caja_pago_deshacer_directo/.test(x)), 'salió a caja_pago_deshacer_directo (la guarda lo cortó: no se escribió nada)');
  await foto(cli, 'deshacer_caja.png');
  // 2) Compras › Pagar
  await evaluar(cli, `window.__conf=[];window.__bloqueados=[];try{go('busqueda')}catch(e){}`); await T(5000);
  await evaluar(cli, INY(PROV)); await evaluar(cli, `try{abaSwitchTab('pagos')}catch(e){}`);
  const hoyExpr = `[].filter.call(document.querySelectorAll('#pg-abast .aba-pagoshoy-f'),function(r){return r.innerText.indexOf(${JSON.stringify(PROV)})>=0})[0]`;
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(${hoyExpr})`)) break; await evaluar(cli, INY(PROV) + `&&(function(){try{abaSwitchTab('pagos')}catch(e){}})()`); await T(1000); }
  const H = await evaluar(cli, `(function(){var r=${hoyExpr};return r?r.innerText.replace(/\\s+/g,' '):''})()`);
  console.log('   pagos de hoy:', H);
  chk(/Deshacer/.test(H), 'Compras › Pagar: «Pagos de hoy» lo lista con «Deshacer»');
  const b2 = await clicEl(cli, `(${hoyExpr}||document).querySelector('.aba-pagoshoy-x')`);
  if (ANCHO < 700) chk(b2 && b2.h >= 44, 'el botón mide ' + (b2 && Math.round(b2.h)) + ' px (≥ 44)');
  await T(1500);
  bl = JSON.parse(await evaluar(cli, `JSON.stringify(window.__bloqueados||[])`));
  chk(bl.some((x) => /caja_pago_deshacer_directo/.test(x)), 'y sale al mismo lugar');
  await foto(cli, 'deshacer_compras.png');
  const errs = JSON.parse(await evaluar(cli, `JSON.stringify(window.__errs||[])`));
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
