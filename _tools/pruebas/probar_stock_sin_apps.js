/* STOCK SIN APPS SCRIPT (3/11/2026, corte a Supabase: pieza 8).
   node _tools/pruebas/probar_stock_sin_apps.js <token>
   BASE_URL=http://localhost:8163/app.html para probar lo local (el backend es producción; los POST van cortados).
   Con STOCK_BASE_ARMA = si, Stock › Productos y el valor del freezer de Inicio/Cierre NUNCA piden `stockTab` a
   Apps Script. Tres casos: (1) la base al día, (2) la foto atrasada (un guardado de este aparato posterior),
   (3) la base que no contesta. En cada uno: 0 pedidos `stockTab` y el sello de la tab dice lo que pasa.
   Contra el código viejo (la URL publicada antes de v867) los casos 2 y 3 tienen que dar MAL: así se sabe que la
   prueba agarra el bug. */
'use strict';
const cdp = require('./cdp.js');
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; }
/* Anota todo pedido a Apps Script y deja cortar la RPC del stock (`window.__cortarStockBase`). */
const ESPIA = `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u){var s=String(u&&u.url||u);
  try{if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push(s.slice(0,160));}catch(e){}
  if(window.__cortarStockBase&&/rpc\\/stock_tab_pantalla/.test(s))return Promise.reject(new TypeError('Failed to fetch (cortado por la prueba)'));
  return f.apply(this,arguments);};})();`;
const STOCKTAB = `window.__aApps.filter(function(u){return /action=stockTab/.test(u);}).length`;
const SELLO = `(document.querySelector('#p-stock .st-sello')||{}).innerText||''`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ESPIA });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m, p) => { if (m === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof loadStockTab==='function'`, 60000), '');
  chk('la palanca STOCK_BASE_ARMA llega en «si»', await esperar(cli, `typeof _palancaVal==='function' && _palancaVal('stockArma')==='si'`, 30000),
    await evaluar(cli, `typeof _palancaVal==='function'?_palancaVal('stockArma'):'?'`));
  await evaluar(cli, `go('stock'); try{ if(typeof stSwitchTab==='function')stSwitchTab('productos'); }catch(e){} 1`);
  const pinto = `!!(D && Array.isArray(D.stock) && D.stock.length && document.querySelector('#p-stock').innerText.length > 200)`;
  chk('Productos pinta', await esperar(cli, pinto, 60000), '');
  const filas = await evaluar(cli, `D.stock.length`);
  console.log('  (' + filas + ' productos en la tabla)');

  console.log('\n== 1) la base al día ==');
  await evaluar(cli, `window.__aApps=[]; loadStockTab(true).then(function(r){window.__r1=r;}); 1`);
  await esperar(cli, `window.__r1!==undefined`, 20000); await pausa(5000);   // la pregunta del sello llega 2-4 s después
  chk('sale de la base', await evaluar(cli, `ST_FUENTE && ST_FUENTE.de==='pg' && D.stockFuente==='pg'`), await evaluar(cli, `ST_FUENTE`));
  chk('0 pedidos stockTab a Apps Script', (await evaluar(cli, STOCKTAB)) === 0, await evaluar(cli, `window.__aApps`));
  console.log('  sello: ' + await evaluar(cli, SELLO));

  console.log('\n== 2) la foto atrasada: guardaste algo después de la copia ==');
  await evaluar(cli, `window.__aApps=[]; window.__r2=undefined; localStorage.setItem('maleu_ult_post', String(Date.now()+3600e3)); loadStockTab(true).then(function(r){window.__r2=r;}); 1`);
  await esperar(cli, `window.__r2!==undefined`, 20000); await pausa(5000);
  chk('0 pedidos stockTab a Apps Script', (await evaluar(cli, STOCKTAB)) === 0, await evaluar(cli, `window.__aApps`));
  chk('se muestra la base con el aviso', await evaluar(cli, `ST_FUENTE && ST_FUENTE.de==='pg' && /guardaste/.test(ST_FUENTE.atraso||'')`), await evaluar(cli, `ST_FUENTE`));
  chk('el sello lo dice', /guardaste algo/.test(await evaluar(cli, SELLO)), await evaluar(cli, SELLO));
  await evaluar(cli, `localStorage.removeItem('maleu_ult_post'); 1`);

  console.log('\n== 3) la base no contesta ==');
  await evaluar(cli, `window.__aApps=[]; window.__r3=undefined; window.__cortarStockBase=true; loadStockTab(true).then(function(r){window.__r3=r;}); 1`);
  await esperar(cli, `window.__r3!==undefined`, 20000); await pausa(3000);
  chk('0 pedidos stockTab a Apps Script', (await evaluar(cli, STOCKTAB)) === 0, await evaluar(cli, `window.__aApps`));
  chk('ST_FUENTE dice que la base falló', await evaluar(cli, `ST_FUENTE && ST_FUENTE.de==='basefallo'`), await evaluar(cli, `ST_FUENTE`));
  chk('la tabla sigue con lo que había', await evaluar(cli, `D.stock.length`) === filas, await evaluar(cli, `D.stock.length`));
  chk('el sello lo dice', /No se pudo leer la base/.test(await evaluar(cli, SELLO)), await evaluar(cli, SELLO));

  console.log('\n== 4) el valor del freezer (Inicio/Cierre) con la base caída ==');
  await evaluar(cli, `window.__aApps=[]; window.__cb4=0; var _dS=D.stock; D.stock=[]; _eerrStockVal=null; _eerrStockFallo=0; eerrFetchStock(function(){window.__cb4++;}, true); D.stock=_dS; 1`);
  await esperar(cli, `window.__cb4>0`, 20000); await pausa(3000);
  chk('0 pedidos stockTab a Apps Script', (await evaluar(cli, STOCKTAB)) === 0, await evaluar(cli, `window.__aApps`));
  chk('dice «no se pudo calcular» en vez de $0', await evaluar(cli, `_eerrStockPie()`) === 'no se pudo calcular', await evaluar(cli, `_eerrStockPie()`));
  await evaluar(cli, `window.__cortarStockBase=false; 1`);

  const err = await evaluar(cli, `window.__err.filter(function(e){return !/cortado por la prueba|Failed to fetch/.test(e);})`);
  chk('sin errores de JS', !err.length, err);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('REVENTO', e); process.exit(2); });
