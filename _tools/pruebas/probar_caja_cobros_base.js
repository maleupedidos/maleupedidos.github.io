/* (207, 27/10/2026) El panel de Caja toma `cobrosPendientes` de la base (203) y no de la foto de Apps Script
   cuando `LECTURAS_BASE_ARMA` dice cobrosPendientes=si. Saca `_lotePedidosPg0` de _src/panel.src.html y la
   corre con todo lo de afuera simulado.
     node _tools/pruebas/probar_caja_cobros_base.js [panel.src.html] */
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', '..', '_src', 'panel.src.html'), 'utf8').replace(/\r\n/g, '\n');
const i = src.indexOf('function _lotePedidosPg0('), j = src.indexOf('\n}\n', i);
if (i < 0) { console.log('MAL: no encontré _lotePedidosPg0'); process.exit(1); }
let ok = 0, mal = 0; const chk = (c, t, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
let modo = 'si', baseAnda = true, pedidosApps = [];
const mundo = {
  _lecModo: () => modo,
  _lecArmaBase: (acc) => baseAnda ? Promise.resolve({ d: { cobros: ['base'], de: acc } }) : Promise.reject(new Error('503')),
  _loteGets: (accs) => { pedidosApps.push(accs.join(',')); const o = {}; accs.forEach(a => { o[a] = Promise.resolve({ de: 'apps', a }); }); return o; },
  _palancaYa: () => false, window: {}
};
const f = new Function(...Object.keys(mundo), src.slice(i, j + 2) + '\nreturn _lotePedidosPg0;')(...Object.values(mundo));
(async () => {
  pedidosApps = []; let r = f(['cajaLight', 'cobrosPendientes'], 1, false);
  chk((await r.cobrosPendientes).cobros[0] === 'base', 'con «si», los cobros salen de la base', await r.cobrosPendientes);
  chk((await r.cajaLight).de === 'apps' && pedidosApps.join() === 'cajaLight', 'y lo demás sigue su camino (sin pedirle los cobros a Apps Script)', pedidosApps);
  baseAnda = false; pedidosApps = []; r = f(['cobrosPendientes'], 1, false);
  chk((await r.cobrosPendientes).de === 'apps', 'si la base no contesta, Apps Script', await r.cobrosPendientes);
  baseAnda = true; modo = 'medir'; pedidosApps = []; r = f(['cobrosPendientes'], 1, false);
  chk((await r.cobrosPendientes).de === 'apps', 'con «medir», como siempre', await r.cobrosPendientes);
  modo = 'si'; pedidosApps = []; r = f(['cobrosPendientes'], 1, true);
  chk((await r.cobrosPendientes).de === 'apps', 'con el ↻ (de la planilla), como siempre', await r.cobrosPendientes);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL'); process.exit(mal ? 1 : 0);
})();
