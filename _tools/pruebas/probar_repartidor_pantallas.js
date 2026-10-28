/* PEDIDOS HOME Y RUTA ANDAN SIN EL COSTO (28/10/2026, antes de darle token de la base a un repartidor).
   node _tools/pruebas/probar_repartidor_pantallas.js <token-de-un-repartidor> <usuario> <nombre>
   (los saca la prueba de Python: estancias/_tools/probar_repartidor_sin_costo.py no los imprime; esta los recibe)
   Abre el ERP con la sesion REAL de un repartidor (los POST interceptados por sesion_prep: no escribe nada) y
   sostiene: abre en sus tabs, Pedidos Home y Ruta pintan con datos, no hay errores de JS, y ninguna respuesta
   de precios/pedidosLight/stockTab/carnePiezas/ocLight que le llego trae los campos de costo. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN, USUARIO, NOMBRE] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (c, e) => Promise.race([cdp.evaluar(c, e), new Promise((_, no) => setTimeout(() => no(new Error('20 s')), 20000))]);
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
async function esperar(cli, e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(cli, e)) return true; } catch (x) {} await pausa(500); } return false; }
const sesion = JSON.stringify({ usuario: USUARIO, rol: 'repartidor', nombre: NOMBRE, ts: Date.now() });
/* Mira cada respuesta de Apps Script de esas acciones y cuenta los campos de costo (las rutas medidas el 28/10). */
const espia = `;window.__costos=[];(function(){var f=window.fetch;window.fetch=function(u){var s=String(u&&u.url||u),m=s.match(/[?&]action=(precios|pedidosLight|stockTab|carnePiezas|ocLight)\\b/);var p=f.apply(this,arguments);if(m)p.then(function(r){return r.clone().json();}).then(function(d){var n=0,a=m[1];
  if(a==='precios')Object.keys(d||{}).forEach(function(k){if(d[k]&&typeof d[k]==='object'&&'c' in d[k])n++;});
  if(a==='pedidosLight')(d.pedidos||[]).forEach(function(x){if('co' in x||'mg' in x)n++;});
  if(a==='stockTab')(d.stock||[]).forEach(function(x){if('co' in x||'iv' in x)n++;});
  if(a==='ocLight'&&d.oc&&'costo' in d.oc)n++;
  if(a==='carnePiezas'){(d.cortes||[]).forEach(function(x){if('costo' in x)n++;});if(d.costos)n++;}
  window.__costos.push({a:a,n:n,ok:d&&d.ok!==false});}).catch(function(){});return p;};})();`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;localStorage.setItem("maleu_panel_session",JSON.stringify(Object.assign(JSON.parse(localStorage.getItem("maleu_panel_session")||"{}"),${sesion})));` + espia });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m, p) => { if (m === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca como repartidor', await esperar(cli, `typeof go==='function' && SESSION && SESSION.rol==='repartidor'`, 60000), await ev(cli, `typeof SESSION!=='undefined'?SESSION:null`).catch(() => null));
  await esperar(cli, `Array.isArray(SESSION.tabs) && SESSION.tabs.length>0`, 60000);
  console.log('  tabs del repartidor:', JSON.stringify(await ev(cli, `SESSION.tabs`)));
  await ev(cli, `go('pedidoshome'); 1`);
  chk('Pedidos Home pinta con pedidos', await esperar(cli, `cur==='pedidoshome' && !!(D && Array.isArray(D.pedidos) && D.pedidos.length) && document.getElementById('p-pedidoshome').innerText.length > 200`, 90000),
    await ev(cli, `[cur, D&&D.pedidos&&D.pedidos.length, (document.getElementById('p-pedidoshome')||{}).innerText.length]`).catch(() => null));
  await ev(cli, `go('ruta'); 1`);
  chk('Ruta pinta', await esperar(cli, `cur==='ruta' && document.querySelector('#pg-ruta') && document.querySelector('#pg-ruta').innerText.length > 100`, 90000), '');
  await pausa(8000);
  const err = await ev(cli, `(window.__err||[]).filter(function(x){ return !/favicon|ResizeObserver/.test(x); })`);
  chk('sin errores de JS', err.length === 0, err);
  const cs = await ev(cli, `window.__costos`);
  console.log('  respuestas miradas:', JSON.stringify(cs.map((x) => x.a + (x.ok ? '' : '(error)'))));
  chk('le llego al menos una de esas respuestas', cs.length > 0, cs);
  chk('ninguna con campos de costo', cs.every((x) => x.n === 0), cs.filter((x) => x.n));
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
