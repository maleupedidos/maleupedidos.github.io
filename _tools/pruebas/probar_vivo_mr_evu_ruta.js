/* MI REPARTO, EVOLUCION Y RUTA EN VIVO (28/10/2026).
   node _tools/pruebas/probar_vivo_mr_evu_ruta.js <token>
   BASE_URL=http://localhost:8163/app.html para probarlo local antes de publicar (el backend es producción).
   UNA ventana con la sesion real (los POST interceptados por sesion_prep: no escribe nada). Lo que no esta
   prendido en la planilla (las palancas nuevas, y las lecturas que hoy estan en «medir») se pone SOLO en la
   memoria de esta ventana. Sostiene:
     · Mi Reparto: con miReparto en «medir» una señal no relee; en «si» relee el DIA de la base sin el
       «Cargando...» y sin Apps Script; en el Historial relee el historial (238); con otra tab, nada.
     · Evolucion: una señal de erp:pedidos hace que Ventas en vivo relea y Evolucion se repinte; la meta,
       con PLAN_BASE_ARMA en «si», sale de la base (no de planMes en Apps Script).
     · Ruta: se anota en erp:pedidos; una señal sincroniza; conectado, el reloj de 15 s no pide nada. */
'use strict';
const cdp = require('./cdp.js'), abrir = cdp.abrir;
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; }
const senal = `(function(){ var c=_ENV.canales['erp:pedidos']; c.oyentes.forEach(function(o){ try{ o.alCambio({tabla:'pedido',op:'update',n:1,ids:['Home|1']}); }catch(e){} }); })(); 1`;
const apps = (re) => `window.__aApps.filter(function(x){ return ${re}.test(x.u) && !x.cola; }).map(function(x){ return x.u.slice(0,120); })`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u){try{var s=String(u&&u.url||u);if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push({t:Date.now(),u:s.slice(0,200),cola:/_bombear/.test(String(new Error().stack))});}catch(e){}return f.apply(this,arguments);};})();window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){var v=window.__palForzar[k];if(k==='lecArma'){p.lecArma=Object.assign({},p.lecArma||{},v);}else p[k]=v;});}catch(e){}},300);` });
  await cli.enviar('Page.enable', {});
  cli.escuchar((metodo, p) => { if (metodo === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _enVivoEscuchar==='function'`, 60000), '');
  chk('la conexion en vivo queda «vivo»', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 60000), await evaluar(cli, `window.__enVivo||null`));
  /* Las palancas nuevas, en la memoria de esta ventana (si el backend no las manda todavia). */
  await evaluar(cli, `window.__palForzar.mirepartoEnVivo = true; window.__palForzar.rutaEnVivo = true; 1`); await pausa(800); await evaluar(cli, `window.dispatchEvent(new Event('maleu:palancas')); 1`);

  console.log('\n== Mi Reparto ==');
  await evaluar(cli, `go('mireparto'); try{ mrShowSub('dia'); }catch(e){} 1`);
  chk('la tab pinta el dia', await esperar(cli, `!!document.getElementById('mrList') && !/Cargando/.test(document.getElementById('p-mireparto').innerText)`, 60000), '');
  chk('se anota en erp:pedidos', await esperar(cli, `_ENV.canales['erp:pedidos'].oyentes.some(function(o){ return o.alCambio===_mrVivoSenal; })`, 15000), '');
  await evaluar(cli, `window.__palForzar.lecArma = { miReparto: 'medir' }; window.__mrVivo = null; 1`);
  await pausa(500); await evaluar(cli, senal);
  chk('con miReparto en «medir», la señal NO relee', await esperar(cli, `window.__mrVivo && /no esta en si/.test(window.__mrVivo.hizo)`, 40000), await evaluar(cli, `window.__mrVivo||null`));
  await evaluar(cli, `window.__palForzar.lecArma = { miReparto: 'si', miRepartoHistorial: 'si' }; window.__mrVivo = null; window.__aApps = []; window.__vioCargando = false;
    (function(){ var l=document.getElementById('mrList'); if(l) new MutationObserver(function(){ if(/Cargando/.test(l.innerText)) window.__vioCargando = true; }).observe(l,{childList:true,subtree:true,characterData:true}); })(); 1`);
  await pausa(500); await evaluar(cli, senal);
  chk('con «si», una señal relee el dia DE LA BASE', await esperar(cli, `window.__mrVivo && window.__mrVivo.hizo==='reparto de la base'`, 45000), await evaluar(cli, `window.__mrVivo||null`));
  chk('   sin mostrar «Cargando...»', !(await evaluar(cli, `window.__vioCargando`)), '');
  const a1 = await evaluar(cli, apps('/action=miReparto\\b/'));
  chk('   y sin ir a Apps Script', a1.length === 0, a1);
  await evaluar(cli, `mrShowSub('hist'); 1`);
  await esperar(cli, `!/Cargando/.test((document.getElementById('mrhList')||{}).innerText||'Cargando')`, 60000);
  await evaluar(cli, `window.__mrVivo = null; window.__aApps = []; 1`);
  await pausa(25000);   /* el minimo entre relecturas */
  await evaluar(cli, senal);
  chk('en el Historial, una señal relee el historial DE LA BASE (238)', await esperar(cli, `window.__mrVivo && window.__mrVivo.hizo==='historial de la base'`, 45000), await evaluar(cli, `window.__mrVivo||null`));
  const a2 = await evaluar(cli, apps('/action=miRepartoHistorial\\b/'));
  chk('   y sin ir a Apps Script', a2.length === 0, a2);
  await evaluar(cli, `mrShowSub('dia'); go('inicio'); window.__mrVivo = null; 1`);
  await evaluar(cli, senal);
  chk('con otra tab a la vista, nada', await esperar(cli, `window.__mrVivo && /^nada:/.test(window.__mrVivo.hizo)`, 45000), await evaluar(cli, `window.__mrVivo||null`));

  console.log('\n== Evolucion ==');
  await evaluar(cli, `window.__palForzar.planArma = 'si'; 1`); await pausa(800); await evaluar(cli, `go('evolucion'); 1`);
  chk('la tab pinta', await esperar(cli, `!!document.getElementById('evuBody') && document.getElementById('evuBody').innerText.length > 100`, 60000), '');
  chk('la meta sale DE LA BASE (plan_mes_pantalla), no de planMes', await esperar(cli, `window._evuMeta && _evuMeta.de==='base'`, 30000), await evaluar(cli, `window._evuMeta||null`));
  await evaluar(cli, `window.__evuPintes = 0; var _r0 = rEvolucion; window.rEvolucion = function(){ window.__evuPintes++; return _r0.apply(this, arguments); }; window.__ventasVivo = null; window.__aApps = []; 1`);
  chk('Ventas en vivo esta anotada (Evolucion usa sus señales)', await evaluar(cli, `_ENV.canales['erp:pedidos'].oyentes.some(function(o){ return o.alCambio===_vVivoSenal; })`), '');
  await pausa(21000); await evaluar(cli, senal);
  chk('con una señal, Ventas relee DE LA BASE con Evolucion a la vista', await esperar(cli, `window.__ventasVivo && window.__ventasVivo.hizo==='ventas de la base'`, 45000), await evaluar(cli, `window.__ventasVivo||null`));
  chk('   y Evolucion se repinta', await esperar(cli, `window.__evuPintes > 0`, 10000), await evaluar(cli, `window.__evuPintes`));
  const a3 = await evaluar(cli, apps('/action=(ventas|planMes)\\b/'));
  chk('   sin ir a Apps Script (ventas ni planMes)', a3.length === 0, a3);

  console.log('\n== Ruta ==');
  await evaluar(cli, `go('ruta'); 1`);
  chk('Ruta arranca', await esperar(cli, `typeof rutSincronizar==='function' || !!document.querySelector('#pg-ruta .tab')`, 60000), '');
  await evaluar(cli, `window.dispatchEvent(new Event('maleu:palancas')); 1`);
  chk('se anota en erp:pedidos', await esperar(cli, `_ENV.canales['erp:pedidos'].oyentes.some(function(o){ return String(o.alCambio).indexOf('_rutVivoSincronizar')>=0; })`, 20000), await evaluar(cli, `_ENV.canales['erp:pedidos'].oyentes.length`));
  await esperar(cli, `!!document.querySelector('#pg-ruta') && document.querySelector('#pg-ruta').innerText.length > 50`, 60000);
  await pausa(5000);
  await evaluar(cli, `window.__rutaVivo = null; 1`);
  await evaluar(cli, senal);
  chk('una señal sincroniza Ruta', await esperar(cli, `window.__rutaVivo && /sincronizo por una señal/.test(window.__rutaVivo.hizo)`, 45000), await evaluar(cli, `window.__rutaVivo||null`));
  /* Con el en vivo conectado, el reloj de 15 s no pide entregas durante 40 s. */
  await pausa(3000);
  await evaluar(cli, `window.__aApps = []; window.__rutPide = 0; 1`);
  await pausa(40000);
  const a4 = await evaluar(cli, apps('/action=entregas\\b/'));
  chk('conectado, el reloj de 15 s no pide entregas (40 s mirando)', a4.length === 0, a4);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
