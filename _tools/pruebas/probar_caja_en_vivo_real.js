/* CAJA EN VIVO, CONTRA PRODUCCION (27/10/2026).
   node _tools/pruebas/probar_caja_en_vivo_real.js <token> [minutos]
   UNA sola ventana con la sesion real (los POST van interceptados por sesion_prep: no escribe nada). Abre Caja
   y sostiene: el ↻ de la tab trae la caja DE LA BASE (no de Apps Script); Caja queda anotada en erp:pedidos y
   erp:fotos sin sacar a Pedidos ni a Abastecimiento; con una señal real relee de la base y repinta. */
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
  chk('la conexion en vivo queda «vivo»', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 60000), '');
  await evaluar(cli, `go('caja'); 1`);
  chk('Caja se anota en erp:pedidos y erp:fotos', await esperar(cli, `!!(_ENV.canales['erp:pedidos'] && _ENV.canales['erp:pedidos'].oyentes.some(function(o){return o.alCambio===_cjVivoSenal;}) && _ENV.canales['erp:fotos'] && _ENV.canales['erp:fotos'].oyentes.some(function(o){return o.alCambio===_cjVivoFoto;}))`, 30000), await evaluar(cli, `Object.keys(_ENV.canales).map(function(k){return k+':'+_ENV.canales[k].oyentes.length;})`));
  chk('   y Pedidos sigue anotado en erp:pedidos', await evaluar(cli, `_ENV.canales['erp:pedidos'].oyentes.some(function(o){return o.alCambio===_pedVivoSenal;})`), '');
  /* El ↻ de la tab: con CAJA_BASE_ARMA=si tiene que venir de la base. */
  await evaluar(cli, `window.__cajaFuente = null; window.__r = null; _recargarCaja().then(function(r){ window.__r = r; }); 1`);
  chk('el ↻ de Caja trae la caja', await esperar(cli, `!!window.__r`, 40000), await evaluar(cli, `window.__r`));
  const f = await evaluar(cli, `window.__cajaFuente`), r = await evaluar(cli, `window.__r`);
  chk('   DE LA BASE (no de Apps Script)', f && f.de === 'base' && r && r.ok, { f, r });
  chk('   y se pinta (hay movimientos)', await evaluar(cli, `!!(D && Array.isArray(D.movimientos) && D.movimientos.length)`), '');
  await evaluar(cli, `window.__cajaVivo = null; 1`);
  const fin = Date.now() + (Number(MIN) || 12) * 60000;
  let vio = false;
  while (Date.now() < fin) {
    await pausa(15000);
    let v = null; try { v = await evaluar(cli, `window.__cajaVivo||null`); } catch (e) { continue; }
    console.log('  ' + new Date().toTimeString().slice(0, 8) + ' __cajaVivo ' + JSON.stringify(v));
    if (v && v.hizo === 'caja de la base') { vio = true; break; }
  }
  chk('con una señal real, Caja releyo DE LA BASE y repinto', vio, await evaluar(cli, `window.__cajaVivo||null`));
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
