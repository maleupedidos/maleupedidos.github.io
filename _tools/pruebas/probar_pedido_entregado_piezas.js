/* Un pedido que se CARGA ya Entregado: sus piezas pasan a Entregada (13/9/2026).
   _doPostPedido del Code.js real, con _doPostHome stubbeado y Piezas Carne simulada.
     node probar_pedido_entregado_piezas.js [Code.js] */
'use strict';
const fs = require('fs'), vm = require('vm');
const ARCHIVO = process.argv[2] || 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/estancias/.clasp-src/Code.js';
let ok = 0, mal = 0;
function chk(t, c, d) { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } }
const COLS = 12;
const filas = [
  ['P-0200', 'CEn', 'Entraña', 2.301, 'Disponible', 'ustariz', '11/09/2026', 'Caco', 30000, '', '', ''],
  ['P-0201', 'CVa', 'Vacío', 2.447, 'Disponible', 'ustariz', '11/09/2026', 'Caco', 18200, '', '', ''],
  ['P-0202', 'CLo', 'Lomo', 3.433, 'Disponible', 'ustariz', '11/09/2026', 'Caco', 28500, '', '', ''],
  ['P-0203', 'CCo', 'Colita', 2.670, 'Disponible', 'ustariz', '11/09/2026', 'Caco', 18800, '', '', ''],
];
const hoja = {
  getName: () => 'Piezas Carne', getLastRow: () => filas.length + 1, getLastColumn: () => COLS,
  getRange(f, c, nf, nc) {
    return {
      getValues() { const out = []; for (let i = 0; i < (nf || 1); i++) out.push((filas[f - 2 + i] || []).slice(c - 1, c - 1 + (nc || 1))); return out; },
      getValue() { return (filas[f - 2] || [])[c - 1]; },
      setValue(v) { filas[f - 2][c - 1] = v; return this; },
      setValues(v) { v.forEach((r, i) => r.forEach((x, j) => { filas[f - 2 + i][c - 1 + j] = x; })); return this; },
      clearContent() { filas[f - 2][c - 1] = ''; return this; }, setNumberFormat() { return this; }, setFontWeight() { return this; },
    };
  },
  setFrozenRows() {}, getMaxRows: () => 60,
};
function comodin(n) { const f = function () { return comodin(n); }; return new Proxy(f, { get(_t, p) { if (p === Symbol.toPrimitive) return () => ''; if (p === 'then') return undefined; if (p === 'toString') return () => ''; return comodin(n + '.' + String(p)); }, apply() { return comodin(n + '()'); }, construct() { return comodin('new ' + n); } }); }
const SS_SIM = { getSheetByName: n => (n === 'Piezas Carne' ? hoja : null), insertSheet: () => hoja };
const sb = { console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error, isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, setTimeout, Proxy, Symbol,
  SpreadsheetApp: { getActiveSpreadsheet: () => SS_SIM, openById: () => SS_SIM, flush() {} },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  Utilities: { formatDate: () => '12/09/2026' },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {}, removeAll() {} }) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => { const o = { t, setMimeType: () => o }; return o; } } };
['PropertiesService', 'ScriptApp', 'HtmlService', 'UrlFetchApp', 'MailApp', 'GmailApp', 'DriveApp', 'Session', 'Logger', 'CalendarApp'].forEach(s => { sb[s] = comodin(s); });
vm.createContext(sb);
vm.runInContext(fs.readFileSync(ARCHIVO, 'utf8'), sb, { filename: 'Code.js' });
/* lo que no se prueba aca: grabar la fila, el log, el WhatsApp, el aviso */
let proximoN = 65;
vm.runInContext(`
  _doPostHome = function(){ return { n: __n() }; };
  _logPedidoRecibido = function(){}; _confirmarPedidoWA_ = function(){}; _guardarCumpleCliente = function(){};
  _avisar_ = function(){}; _logError_ = function(m){ __errores.push(String(m)); };
`, Object.assign(sb, { __n: () => proximoN++, __errores: [] }));
const pieza = id => filas.find(f => f[0] === id);
console.log('\n== Un pedido cargado ya Entregado ==  (' + ARCHIVO.split(/[\\/]/).pop() + ')');

vm.runInContext(`_doPostPedido({canal:'Pilar', nombre:'Prueba', estadoEntrega:'Entregado', items:[{id:31,qty:2.301,unidad:'kg',piezas:['P-0200']},{id:34,qty:2.447,unidad:'kg',piezas:['P-0201']}]})`, sb);
chk('las piezas de un pedido cargado ENTREGADO quedan Entregada', pieza('P-0200')[4] === 'Entregada' && pieza('P-0201')[4] === 'Entregada', [pieza('P-0200')[4], pieza('P-0201')[4]]);
chk('  con el pedido que se las llevo', pieza('P-0200')[9] === 'Pilar #65', pieza('P-0200')[9]);
chk('  y la fecha de Salida sellada', pieza('P-0200')[10] === '12/09/2026', pieza('P-0200')[10]);

vm.runInContext(`_doPostPedido({canal:'Pilar', nombre:'Prueba', estadoEntrega:'Pendiente', items:[{id:32,qty:3.433,unidad:'kg',piezas:['P-0202']}]})`, sb);
chk('un pedido Pendiente deja su pieza Asignada (sale al entregar)', pieza('P-0202')[4] === 'Asignada' && pieza('P-0202')[10] === '', pieza('P-0202'));

vm.runInContext(`_doPostPedido({canal:'Home', nombre:'Prueba', estadoEntrega:'Reservado', items:[{id:30,qty:2.67,unidad:'kg',piezas:['P-0203']}]})`, sb);
chk('un pedido Reservado tambien la deja Asignada', pieza('P-0203')[4] === 'Asignada', pieza('P-0203')[4]);
chk('ningun error registrado', sb.__errores.length === 0, sb.__errores);
console.log('\n' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
