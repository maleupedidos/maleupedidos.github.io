/* LA BOLSA NO SALE COMPLETA CON OC SIN RECIBIR (2/11/2026). `_bolsaOcFaltan` y `_bolsaOcTxt` de ruta.html, sacadas tal
   cual, con `_rutOcEstado`/`_rutOcDe` de verdad y la lista de OC de mentira.
     node _tools/pruebas/probar_bolsa_oc.js [ruta.html]
   Sostiene: dos productos por OC sin recibir → «Faltan 2 productos de OC por recibir: …»; recibidos → 0; uno a medias
   cuenta; sin la lista de OC (Ruta suelta) → 0 (no saber no es «no llegó»); la guarda de `entregarAVendedor` corta antes
   de mandar nada; y la tarjeta muestra el aviso en vez del botón. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', '..', 'ruta.html'), 'utf8');
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
const bloque = (pre) => { const i = SRC.indexOf(pre); if (i < 0) return ''; let d = 0, j = SRC.indexOf('{', i); for (; j < SRC.length; j++) { if (SRC[j] === '{') d++; else if (SRC[j] === '}' && --d === 0) break; } return SRC.slice(i, j + 1); };
const fns = ['function _rutOcEstado(', 'function _rutOcDe(', 'function _bolsaOcFaltan(', 'function _bolsaOcTxt(', 'function entregarAVendedor('].map(bloque);
if (!fns[2]) { console.log('  MAL este ruta.html no tiene _bolsaOcFaltan\n\n0 ok · 1 mal'); process.exit(1); }
const ENT = { 'k1': { h: 'Red', id: 2103, r: 141, c: 'Francisco Hock' }, 'k2': { h: 'Red', id: 2109, r: 144, c: 'Salvador Wehbe' } };
const OCS = { 'k1': [{ a: 'SCo', q: 2 }, { a: 'WPo', q: 1 }], 'k2': [{ a: 'ECaC', q: 2 }] };
const G = { window: { D: { oc: { lista: [] } } }, PROD_NAMES: { SCo: 'Sorrentinos Cordero', WPo: 'Wrap Pollo', ECaC: 'Empanadas Carne' },
  findByKey: (k) => ENT[k] || null, _itemsOCDe: (e) => OCS[Object.keys(ENT).find((k) => ENT[k] === e)] || [],
  alerts: [], enviados: [], alert(m) { G.alerts.push(m); }, confirm() { return true; }, syncQueue: [], saveLocal() {}, processSyncQueue() {}, rutCarnePend: null, _rutaUser: () => 'x' };
G.window.D.oc.lista = [];
vm.createContext(G); vm.runInContext(fns.join('\n'), G);
const lista = (rec) => [{ canal: 'Red', pedido: '2103', abbr: 'SCo', q: 2, estado: rec.SCo }, { canal: 'Red', pedido: '2103', abbr: 'WPo', q: 1, estado: rec.WPo },
  { canal: 'Red', pedido: '2109', abbr: 'ECaC', q: 2, estado: rec.ECaC }];
G.window.D.oc.lista = lista({ SCo: 'Pedido', WPo: 'Pedido', ECaC: 'Recibido' });
let f = G._bolsaOcFaltan(['k1', 'k2']);
chk('dos productos sin recibir: n = 2', f.n === 2, f);
chk('   «Faltan 2 productos de OC por recibir: Sorrentinos Cordero, Wrap Pollo»', G._bolsaOcTxt(f) === 'Faltan 2 productos de OC por recibir: Sorrentinos Cordero, Wrap Pollo', G._bolsaOcTxt(f));
G.window.D.oc.lista = lista({ SCo: 'Recibido', WPo: 'Recibido', ECaC: 'Recibido' });
chk('todo recibido: 0, la bolsa sale', G._bolsaOcFaltan(['k1', 'k2']).n === 0, G._bolsaOcFaltan(['k1', 'k2']));
G.window.D.oc.lista = [{ canal: 'Red', pedido: '2103', abbr: 'SCo', q: 1, estado: 'Recibido' }, { canal: 'Red', pedido: '2103', abbr: 'SCo', q: 1, estado: 'Pedido' }];
chk('uno a medias (llegó 1 de 2) cuenta', G._bolsaOcFaltan(['k1']).n === 1, G._bolsaOcFaltan(['k1']));
delete G.window.D.oc;
chk('sin la lista de OC (Ruta suelta): no frena', G._bolsaOcFaltan(['k1', 'k2']).n === 0, G._bolsaOcFaltan(['k1', 'k2']));
G.window.D.oc = { lista: lista({ SCo: 'Pedido', WPo: 'Recibido', ECaC: 'Recibido' }) };
G.entregarAVendedor('k1,k2', '', "Federico D'Andrea", []);
chk('«Le di la bolsa» con una OC sin recibir: avisa y no manda nada', G.alerts.length === 1 && /Faltan 1 producto de OC por recibir/.test(G.alerts[0]) && G.syncQueue.length === 0, { alerts: G.alerts, cola: G.syncQueue });
chk('la tarjeta muestra el aviso en vez del botón', /_fOcB\.n>0\s*\?\s*'<div class="rtc-bar"><div class="rtc-nota"/.test(SRC), '');
console.log('\n' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
