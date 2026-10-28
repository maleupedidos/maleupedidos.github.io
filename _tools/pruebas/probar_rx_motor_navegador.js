/* EL MOTOR DE LOS RECLAMOS EN EL NAVEGADOR (246, 28/10/2026).
   node _tools/pruebas/probar_rx_motor_navegador.js <token-admin>   (BASE_URL=http://localhost:PUERTO/app.html)
   1) `rx_motor.js` se baja por `_motorArmar` y arma con los datos de la base: sin la 246 pegada se usan los de
      `red_escala_pantalla` (201, los mismos que da la 246 sin los links). Tiene que devolver {ok, reclamos} sin error.
   2) La bandeja de Red sigue andando (con la palanca como esté) y trae sus links. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('20 s')), 20000))]);
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
async function esperar(cli, e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(cli, e)) return true; } catch (x) {} await pausa(500); } return false; }
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof _motorArmar==='function' && typeof _sbPermiso==='function'`, 60000), '');
  /* El permiso de la base llega despues del arranque: sin esperarlo, `sb` es null y la prueba miente. */
  chk('llega el permiso de la base', await esperar(cli, `(function(){ _sbPermiso(true).then(function(sb){ window.__sbOk = !!(sb && sb.url); }); return window.__sbOk === true; })()`, 60000), '');
  await ev(cli, `window.__rx = null; _sbPermiso(true).then(function(sb){
      return fetch(sb.url + '/rest/v1/rpc/red_escala_pantalla', { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: '{}' }).then(function(r){ return r.json(); });
    }).then(function(d){ d.links = { 'Prueba': '' }; return _motorArmar('RX_MOTOR', 'rx_motor.js', d, {}); })
      .then(function(o){ window.__rx = o; }, function(e){ window.__rx = { err: String(e && e.message || e) }; }); 1`);
  chk('rx_motor.js se baja y arma con los datos de la base', await esperar(cli, `window.__rx`, 40000), '');
  const rx = await ev(cli, `window.__rx`);
  chk('devuelve {ok, links, reclamos:{pendientes, decididos}} sin error', rx && rx.ok && rx.links && rx.reclamos && Array.isArray(rx.reclamos.pendientes) && Array.isArray(rx.reclamos.decididos) && !rx.reclamosErr && !rx.err, rx);
  console.log(`     (reclamos en producción hoy: ${rx && rx.reclamos ? rx.reclamos.pendientes.length + ' pendientes, ' + rx.reclamos.decididos.length + ' decididos' : '?'})`);
  await ev(cli, `go('pedidos'); 1`);
  await ev(cli, `window.__rbd = null; try { _rbDeLaBase().then(function(d){ window.__rbd = d; }, function(e){ window.__rbd = { err: String(e && e.message || e) }; }); } catch (e) { window.__rbd = { err: String(e) }; } 1`);
  chk('la bandeja de la base arma, con los links de los vendedores', await esperar(cli, `window.__rbd && (window.__rbd.err || Array.isArray(window.__rbd.vendedores))`, 60000) && await ev(cli, `!window.__rbd.err && window.__rbd.vendedores.some(function(v){ return 'link' in v; })`), await ev(cli, `window.__rbd && (window.__rbd.err || Object.keys(window.__rbd))`));
  console.log(`\n${ok} ok · ${mal} MAL`); cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + e.message); process.exit(2); });
