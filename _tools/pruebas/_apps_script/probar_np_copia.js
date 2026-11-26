/* El AUTOPEDIDO abre con el stock guardado y no decide nada con el (13/9/2026).

   node probar_np_copia.js [390|1440]
   APP=app_viejo_tmp.html node probar_np_copia.js   ← la direccion contraria

   Tadeo: "Entro a la app desde el celu y en AUTOPEDIDO me tarda 10 segundos en
   ver el stock real". Medido con la app recien abierta: 26 s. El stock no vivia
   en ningun lado del celular.

   Todo el backend va STUBBEADO con datos inventados; `stock_full` tarda 6 s a
   proposito, que es lo que deja ver la ventana en que se muestra la copia. Una
   sola inyeccion que lee `?fase=` (addScriptToEvaluateOnNewDocument acumula).

   Sostiene:
   · con una copia guardada, el stock se ve AL INSTANTE y dice de cuando es;
   · mientras la copia esta en pantalla, NO decide el origen (no manda a
     Deposito algo que la copia dice que hay) ni avisa "te pasaste del stock";
   · cuando llega el de ahora, reemplaza la copia, se va el sello, el origen se
     decide y la copia guardada queda al dia;
   · sin copia, no inventa nada: espera el dato;
   · si el servidor contesta un error, la copia sigue y el sello tambien. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
async function esperar(cli, expr, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
}

const INYECTAR = `
(function(){
  var fase = (location.search.match(/fase=(\\w+)/) || [])[1] || 'a';
  try {
    if (!sessionStorage.getItem('__sembrado')) {
      sessionStorage.setItem('__sembrado', '1');
      localStorage.removeItem('mc_np_stock'); localStorage.removeItem('mc_np_piezas');
      if (fase === 'a' || fase === 'c') {
        localStorage.setItem('mc_np_stock', JSON.stringify({ ts: Date.now() - 12 * 60000,
          d: { PPM: { f: 10, p: 10, dep: 'ustariz', pd: { ustariz: 10 } } } }));
      }
    }
  } catch (e) {}
  var DEMORA = 6000;
  var o = window.fetch;
  window.__stockPedidos = 0;
  window.fetch = function (u, x) {
    var url = String(u || '');
    var esPost = x && String(x.method || '').toUpperCase() === 'POST';
    if (url.indexOf('script.google.com/macros') < 0) return o.apply(this, arguments);
    if (esPost) return Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    var a = (url.match(/[?&]action=([a-zA-Z_]+)/) || [])[1] || '';
    var body = { ok: true };
    var espera = 50;
    if (a === 'stock_full') {
      window.__stockPedidos++;
      espera = DEMORA;
      body = fase === 'c' ? { ok: false, error: 'se cayo' } : { PPM: { f: 3, p: 3, dep: 'ustariz', pd: { ustariz: 3 } } };
    } else if (a === 'piezas_full') { body = {}; }
    else if (a === 'entregas') { body = { ts: Date.now(), entregas: [], hechas: [], arm: {}, rep: {}, reps: [], prods: {} }; }
    else if (a === 'cobrosPendientes') { body = { ts: Date.now(), cobros: [], sinCerrar: [], saldos: {}, cuentas: [] }; }
    return new Promise(function (res) {
      setTimeout(function () { res(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })); }, espera);
    });
  };
})();`;

async function abrirAutopedido(cli, fase) {
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?fase=' + fase });
  if (!await esperar(cli, `typeof go==='function' && typeof window._abrirSubapp==='function'`, 60000)) return false;
  await evaluar(cli, `go('ruta')`);
  if (!await esperar(cli, `typeof switchTab==='function'`, 20000)) return false;
  await evaluar(cli, `(function(){ var b=document.querySelector('#p-ruta .tab[data-tab="nuevo"]'); if(b)b.click(); else switchTab('nuevo'); return 1; })()`);
  return await esperar(cli, `!!document.querySelector('#npProductos [onclick^="npQty"]')`, 15000);
}

(async () => {
  console.log('\n== AUTOPEDIDO: el stock abre de la copia — ' + ANCHO + 'px · ' + APP + ' ==\n');
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('tok-prueba') + INYECTAR });
  await cli.enviar('Page.navigate', { url: 'about:blank' });

  // ── A: hay copia guardada ──
  console.log('-- con una copia de hace 12 min --');
  chk('el AUTOPEDIDO abre', await abrirAutopedido(cli, 'a'));
  const t0 = Date.now();
  const vio = await esperar(cli, `typeof npFisico==='function' && npFisico('PPM')===10`, 2500);
  chk('el stock de la copia se ve al instante (sin esperar al servidor)', vio, { ms: Date.now() - t0, pedidos: await evaluar(cli, `window.__stockPedidos`) });
  const sello = await evaluar(cli, `(function(){ var e=document.getElementById('npCopiaSello'); return e?e.textContent:''; })()`);
  chk('y dice de cuando es', /hace 12 min/.test(sello), sello);
  await evaluar(cli, `npQty(5,1); npUpdateTotal(); 1`);
  const orgCopia = await evaluar(cli, `(function(){ var e=document.getElementById('npOrigen'); return {sug: npOrigenSugerido(), val: e?e.value:null}; })()`);
  chk('con la copia en pantalla NO manda el pedido a Deposito', orgCopia.sug !== 'Deposito' && orgCopia.val !== 'Deposito', orgCopia);
  const llego = await esperar(cli, `npFisico('PPM')===3`, 12000);
  chk('cuando llega el de ahora, lo reemplaza', llego, await evaluar(cli, `npFisico('PPM')`));
  await pausa(300);
  chk('y se va el sello', await evaluar(cli, `!document.getElementById('npCopiaSello')`));
  const orgAhora = await evaluar(cli, `(function(){ var e=document.getElementById('npOrigen'); return {sug: npOrigenSugerido(), val: e?e.value:null}; })()`);
  chk('recien ahi decide el origen: Deposito', orgAhora.sug === 'Deposito' && orgAhora.val === 'Deposito', orgAhora);
  const guardada = await evaluar(cli, `(function(){ try{ var o=JSON.parse(localStorage.getItem('mc_np_stock')); return {f:o.d.PPM.f, hace:Date.now()-o.ts}; }catch(e){ return null; } })()`);
  chk('y la copia guardada queda al dia', guardada && guardada.f === 3 && guardada.hace < 20000, guardada);

  // ── B: sin copia ──
  console.log('\n-- sin copia guardada --');
  await evaluar(cli, `sessionStorage.removeItem('__sembrado'); 1`);
  chk('el AUTOPEDIDO abre', await abrirAutopedido(cli, 'b'));
  await pausa(800);
  chk('no inventa un stock mientras espera', await evaluar(cli, `npFisico('PPM')===null`), await evaluar(cli, `npFisico('PPM')`));
  chk('ni pone un sello de copia', await evaluar(cli, `!document.getElementById('npCopiaSello')`));
  chk('y cuando llega, lo muestra', await esperar(cli, `npFisico('PPM')===3`, 12000));

  // ── C: el servidor contesta un error ──
  console.log('\n-- el servidor contesta {ok:false} --');
  await evaluar(cli, `sessionStorage.removeItem('__sembrado'); 1`);
  chk('el AUTOPEDIDO abre', await abrirAutopedido(cli, 'c'));
  await esperar(cli, `window.__stockPedidos>0`, 5000);
  await pausa(7500);
  chk('la copia sigue (un error no la borra)', await evaluar(cli, `npFisico('PPM')===10`), await evaluar(cli, `npFisico('PPM')`));
  chk('y el sello tambien: sigue siendo de antes', await evaluar(cli, `!!document.getElementById('npCopiaSello')`));

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
