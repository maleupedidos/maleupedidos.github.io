/* EL BOTON «ACTUALIZAR» Y LAS LECTURAS DE INICIO Y STOCK (28/10/2026).
   node _tools/pruebas/probar_boton_y_lecturas.js <token>
   BASE_URL=http://localhost:8163/app.html para probarlo local antes de publicar (el backend es producción).
   UNA ventana con la sesion real (los POST interceptados por sesion_prep: no escribe nada). Lo que no esta en
   «si» en la planilla se fuerza SOLO en la memoria de esta ventana (y se reaplica cuando el ERP renueva el
   permiso). Sostiene:
     · el boton se esconde en una tab que se actualiza sola (Catering) y se ve en una que no (Objetivo con
       PLAN_BASE_ARMA en medir); con la palanca en «si», Objetivo tambien lo esconde; con el en vivo cortado,
       vuelve a aparecer;
     · el ↻ de Pedidos, con PEDIDOS_BASE_ARMA en «si», no le pide pedidosLight a Apps Script;
     · eerrFetchStock, _inMetaPedir y stDepPedir salen de la base con su palanca en «si». */
'use strict';
const cdp = require('./cdp.js'), abrir = cdp.abrir;
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; }
const oculto = `!!document.getElementById('hdrRefresh').hidden`;
const apps = (re) => `window.__aApps.filter(function(x){ return ${re}.test(x.u) && !x.cola; }).map(function(x){ return x.u.slice(0,120); })`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u){try{var s=String(u&&u.url||u);if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push({t:Date.now(),u:s.slice(0,200),cola:/_bombear/.test(String(new Error().stack))});}catch(e){}return f.apply(this,arguments);};})();window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){var v=window.__palForzar[k];if(k==='lecArma'){p.lecArma=Object.assign({},p.lecArma||{},v);}else p[k]=v;});}catch(e){}},300);` });
  await cli.enviar('Page.enable', {});
  cli.escuchar((metodo, p) => { if (metodo === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _tabSeActualizaSola==='function'`, 60000), '');
  chk('la conexion en vivo queda «vivo»', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 60000), await evaluar(cli, `window.__enVivo||null`));
  await evaluar(cli, `window.__palForzar.cateringEnVivo = true; window.__palForzar.planEnVivo = true; window.__palForzar.planArma = 'medir'; 1`);
  await pausa(800); await evaluar(cli, `window.dispatchEvent(new Event('maleu:palancas')); 1`);

  console.log('\n== el boton ==');
  await evaluar(cli, `go('catering'); 1`);
  chk('en Catering (se actualiza sola) el boton se esconde', await esperar(cli, oculto, 15000), await evaluar(cli, `window.__vivoTabs ? Object.keys(window.__vivoTabs) : null`));
  await evaluar(cli, `go('planificacion'); 1`);
  chk('en Objetivo con PLAN_BASE_ARMA en «medir» el boton se ve', await esperar(cli, `!(${oculto})`, 15000), '');
  await evaluar(cli, `window.__palForzar.planArma = 'si'; 1`);
  chk('   con PLAN_BASE_ARMA en «si», Objetivo tambien lo esconde', await esperar(cli, oculto, 15000), await evaluar(cli, `window.__botonActualizar||null`));
  await evaluar(cli, `go('catering'); 1`); await esperar(cli, oculto, 10000);
  await evaluar(cli, `window.__enVivoGuardado = window.__enVivo; window.__enVivo = { estado: 'cortado' }; 1`);
  chk('con el en vivo cortado, el boton vuelve (es la red)', await esperar(cli, `!(${oculto})`, 15000), '');
  await evaluar(cli, `window.__enVivo = window.__enVivoGuardado; 1`);
  chk('   y al reconectar se vuelve a esconder', await esperar(cli, oculto, 15000), '');

  console.log('\n== el ↻ ==');
  chk('PEDIDOS_BASE_ARMA esta en «si» en la planilla', await evaluar(cli, `_palancaVal('pedidosArma')==='si'`), await evaluar(cli, `_palancaVal('pedidosArma')`));
  await evaluar(cli, `go('pedidos'); 1`);
  await pausa(4000);
  await evaluar(cli, `window.__aApps = []; window.__rf = null; Promise.resolve(refreshContextual()).then(function(r){ window.__rf = r === undefined ? 'listo' : r; }); 1`);
  await esperar(cli, `window.__rf !== null`, 60000); await pausa(3000);
  const a1 = await evaluar(cli, apps('/action=pedidosLight\\b/'));
  chk('el ↻ de Pedidos no le pide pedidosLight a Apps Script', a1.length === 0, a1);

  console.log('\n== las lecturas de Inicio y Stock ==');
  await evaluar(cli, `window.__palForzar.stockArma = 'si'; 1`); await pausa(800);
  await evaluar(cli, `window.__aApps = []; window.__eerrStockDe = null; eerrFetchStock(function(){}, true); 1`);
  chk('eerrFetchStock sale de la base', await esperar(cli, `window.__eerrStockDe==='base' && _eerrStockVal!==null`, 30000), await evaluar(cli, `[window.__eerrStockDe, _eerrStockVal]`));
  await evaluar(cli, `window.__inMetaDe = null; _inMetaPedir(true); 1`);
  chk('_inMetaPedir sale de la base', await esperar(cli, `window.__inMetaDe==='base' && !!_inMeta`, 30000), await evaluar(cli, `[window.__inMetaDe, typeof _inMeta!=='undefined'?_inMeta:null]`));
  chk('RUTA_DEP_PG esta en «si» en la planilla', await evaluar(cli, `_palancaVal('rutaDepPg')==='si'`), await evaluar(cli, `_palancaVal('rutaDepPg')`));
  await evaluar(cli, `window.__depDe = null; stDepPedir(true); 1`);
  chk('stDepPedir sale de la base', await esperar(cli, `window.__depDe==='base' && !!(DEP_DATA && DEP_DATA.deps && DEP_DATA.deps.length)`, 30000), await evaluar(cli, `window.__depDe`));
  await pausa(2000);
  const a2 = await evaluar(cli, apps('/action=(stockTab|planMes|depositos)\\b/'));
  chk('   y ninguna de las tres fue a Apps Script', a2.length === 0, a2);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
