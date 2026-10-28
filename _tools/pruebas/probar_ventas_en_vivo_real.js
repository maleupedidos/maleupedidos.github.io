/* VENTAS Y PEDIDOS EN VIVO A LA VEZ, CONTRA PRODUCCION (27/10/2026).
   node _tools/pruebas/probar_ventas_en_vivo_real.js <token> [minutos]
   UNA sola ventana con la sesion real (los POST van interceptados por sesion_prep: no escribe nada). Abre
   Pedidos y despues Ventas, y espera las señales REALES de erp:pedidos (un pedido que cambia en sales_order).
   Sostiene: los dos quedan anotados en erp:pedidos; cada señal le llega a los dos; Ventas relee DE LA BASE
   (ventas_pantalla) y repinta. */
'use strict';
const cdp = require('./cdp.js'), abrir = cdp.abrir;
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN, MIN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; }
(async () => {
  const cli = await abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
  await cli.enviar('Page.enable', {});
  cli.escuchar((metodo, p) => { if (metodo === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _enVivoEscuchar==='function'`, 60000), '');
  chk('la conexion en vivo queda «vivo»', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 60000), await evaluar(cli, `window.__enVivo||null`).catch(() => null));
  await evaluar(cli, `go('pedidos'); 1`);
  chk('Pedidos se anota en erp:pedidos', await esperar(cli, `!!(_ENV.canales['erp:pedidos'] && _ENV.canales['erp:pedidos'].oyentes.some(function(o){return o.alCambio===_pedVivoSenal;}))`, 60000), '');
  await evaluar(cli, `go('ventas'); vSwitchTab('ventas'); 1`);
  chk('Ventas se anota en erp:pedidos', await esperar(cli, `!!(_ENV.canales['erp:pedidos'] && _ENV.canales['erp:pedidos'].oyentes.some(function(o){return o.alCambio===_vVivoSenal;}))`, 30000), '');
  chk('   y Pedidos SIGUE anotado', await evaluar(cli, `_ENV.canales['erp:pedidos'].oyentes.some(function(o){return o.alCambio===_pedVivoSenal;})`), '');
  chk('la lista de Ventas esta pintada', await esperar(cli, `!!(VD && VD.length)`, 60000), '');
  await evaluar(cli, `window.__llega = {}; _ENV.canales['erp:pedidos'].oyentes.forEach(function(o){ var f = o.alCambio, n = f===_pedVivoSenal ? 'ped' : (f===_vVivoSenal ? 'ventas' : 'otro');
    o.alCambio = function(d){ (window.__llega[n] = window.__llega[n] || []).push(new Date().toISOString().slice(11,19)); return f(d); }; }); window.__ventasVivo = null; 1`);
  const fin = Date.now() + (Number(MIN) || 12) * 60000;
  let vio = false;
  while (Date.now() < fin) {
    await pausa(15000);
    let l = {}, v = null;
    try { l = await evaluar(cli, `window.__llega`); v = await evaluar(cli, `window.__ventasVivo||null`); } catch (e) { console.log('  (la pagina no contesto: ' + e.message + ')'); continue; }
    console.log('  ' + new Date().toTimeString().slice(0, 8) + ' llegaron: pedidos ' + ((l.ped || []).length) + ' · ventas ' + ((l.ventas || []).length) + ' · __ventasVivo ' + JSON.stringify(v));
    if (v && v.hizo === 'ventas de la base') { vio = true; break; }
  }
  const l = await evaluar(cli, `window.__llega`);
  chk('llegaron señales reales de erp:pedidos', (l.ped || []).length > 0, l);
  chk('cada señal le llego a Pedidos Y a Ventas', (l.ped || []).length === (l.ventas || []).length, l);
  chk('Ventas releyo DE LA BASE y repinto', vio, await evaluar(cli, `window.__ventasVivo||null`));
  chk('la lista de Ventas sigue pintada', await evaluar(cli, `!!(VD && VD.length)`), '');
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
