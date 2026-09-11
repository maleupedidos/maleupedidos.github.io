/* _crmCategoriaDe sacada del Code.js REAL: la carne existe como categoria y las
   tortas siguen cayendo en Postres (el segmento no cambia de nombre).
   La hoja Proveedores esta simulada con la estructura de la de verdad
   (col B producto base, col E abreviatura).  node probar_cross_cat.js */
'use strict';
const fs = require('fs'), vm = require('vm');
const ARCHIVO = process.argv[2] || 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/estancias/.clasp-src/Code.js';
let ok = 0, mal = 0;
function chk(t, c, d) { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } }

/* La hoja Proveedores, como esta de verdad: el producto base solo en la primera
   fila de su grupo (el resto vacio) y la abreviatura en la col E. */
const GRUPOS = [
  ['Pack Pizzas x2', ['PPM', 'PPJyQ', 'PPCyQ']],
  ['Pizzas Individuales', ['PMu', 'PMa', 'PJyQ', 'PCC', 'PJyM']],
  ['Sorrentinos', ['SCo', 'SJyQ', 'SCa', 'SQB', 'SL', 'SPyP', 'SE']],
  ['Empanadas', ['ECaC', 'EJyQ', 'ECyQ', 'EV']],
  ['Tartas', ['TP', 'TJyQ', 'TCa', 'TV']],
  ['Wraps', ['RC', 'RP']],
  ['Tortas', ['TG', 'TLC', 'TC']],
  ['Franuis', ['F']],
  ['Carnes', ['CCo', 'CEn', 'CLo', 'CPi', 'CVa']],
];
const filas = [['Proveedor', 'Producto', 'x', 'y', 'Abreviatura', 'z']];
GRUPOS.forEach(([prod, abs]) => abs.forEach((a, i) => filas.push(['Caco', i === 0 ? prod : '', '', '', a, ''])));

function comodin(n) {
  const f = function () { return comodin(n); };
  return new Proxy(f, { get(_t, p) { if (p === Symbol.toPrimitive) return () => ''; if (p === 'then') return undefined; if (p === 'toString') return () => ''; return comodin(n + '.' + String(p)); }, apply() { return comodin(n + '()'); }, construct() { return comodin('new ' + n); } });
}
let lecturasCache = 0, revienta = false;
/* SS es un `const` del Code.js: no se puede reasignar despues de cargar, asi que
   la hoja se sirve desde SpreadsheetApp y lo que cambia es esta bandera. */
const SS_SIM = { getSheetByName(n) {
  if (revienta) throw new Error('boom');
  if (n !== 'Proveedores') return null;
  return { getLastRow: () => filas.length, getDataRange: () => ({ getValues: () => filas }) };
} };
const sandbox = {
  console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error,
  isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, setTimeout, Proxy, Symbol,
  SpreadsheetApp: { getActiveSpreadsheet: () => SS_SIM, openById: () => SS_SIM },
  CacheService: {
    getScriptCache: () => ({
      get(k) { lecturasCache++; return null; },     // cache siempre vacio: cada llamada relee la hoja
      put() {}, remove() {}, removeAll() {},
    }),
  },
};
['PropertiesService', 'LockService', 'ScriptApp', 'Utilities', 'ContentService', 'HtmlService',
  'UrlFetchApp', 'MailApp', 'GmailApp', 'DriveApp', 'Session', 'Logger', 'CalendarApp'].forEach(s => { sandbox[s] = comodin(s); });

vm.createContext(sandbox);
console.log('\n== _crmCategoriaDe: la categoria sale de la hoja Proveedores ==\n');
vm.runInContext(fs.readFileSync(ARCHIVO, 'utf8'), sandbox, { filename: 'Code.js' });

const cat = (a, m) => vm.runInContext('_crmCategoriaDe(' + JSON.stringify(a) + (m ? ',' + JSON.stringify(m) : '') + ')', sandbox);

// ── la carne, que es lo que no existia ──
['CCo', 'CEn', 'CLo', 'CPi', 'CVa'].forEach(a => chk('la carne ' + a + ' es Carnes', cat(a) === 'Carnes', cat(a)));

// ── lo que ya andaba no se movio ──
const IGUAL = { SCo: 'Sorrentinos', SE: 'Sorrentinos', ECaC: 'Empanadas', EV: 'Empanadas',
  PMu: 'Pizzas', PPM: 'Pizzas', PPCyQ: 'Pizzas', TP: 'Tartas', TV: 'Tartas', RC: 'Wraps', RP: 'Wraps' };
Object.keys(IGUAL).forEach(a => chk(a + ' sigue siendo ' + IGUAL[a], cat(a) === IGUAL[a], cat(a)));

// ── la normalizacion propia del cross-sell: el segmento no cambia de nombre ──
['TG', 'TLC', 'TC'].forEach(a => chk('la torta ' + a + ' cae en Postres (la hoja dice Tortas, pero es el mismo template)', cat(a) === 'Postres', cat(a)));
chk('el Franui sigue en Postres', cat('F') === 'Postres', cat('F'));
chk('el pack y la individual son la MISMA categoria (Pizzas)', cat('PPM') === cat('PMu'));

// ── no inventa ──
chk('una abreviatura que no esta en la hoja devuelve "" (el caller hace if(cat))', cat('ZZZ') === '', cat('ZZZ'));
chk('vacio devuelve ""', cat('') === '', cat(''));
chk('null devuelve ""', vm.runInContext('_crmCategoriaDe(null)', sandbox) === '');
chk('los espacios no cuentan', cat('  CLo  ') === 'Carnes', cat('  CLo  '));

// ── el catMap se respeta (y es lo que evita las ~1.500 lecturas) ──
chk('con un catMap pasado, no toca la hoja', cat('XX', { XX: 'Carnes' }) === 'Carnes', cat('XX', { XX: 'Carnes' }));
chk('  y la normalizacion tambien aplica al catMap pasado', cat('YY', { YY: 'Tortas' }) === 'Postres', cat('YY', { YY: 'Tortas' }));

// ── la trampa de performance: una lectura por request, no una por producto ──
const src = fs.readFileSync(ARCHIVO, 'utf8');
chk('_doGetCrmClientes lee el catMap UNA vez, fuera del loop', /var _catMap = _catPorAbbr_\(\);/.test(src));
chk('  y el caller de adentro del loop se lo pasa', /_crmCategoriaDe\(ab, _catMap\)/.test(src));
chk('  no queda ningun _crmCategoriaDe(ab) sin catMap', !/_crmCategoriaDe\(ab\)/.test(src));

// Contador: con el cache vacio, cada llamada SIN catMap relee. Con catMap, cero.
lecturasCache = 0;
for (let i = 0; i < 20; i++) cat('CLo', { CLo: 'Carnes' });
chk('20 llamadas con catMap no leen el cache ni una vez', lecturasCache === 0, lecturasCache);
lecturasCache = 0;
for (let i = 0; i < 20; i++) cat('CLo');
chk('  20 llamadas SIN catMap leen 20 veces (por eso se pasa)', lecturasCache === 20, lecturasCache);

// ── la hoja caida no rompe el CRM ──
revienta = true;
chk('si la hoja Proveedores revienta, devuelve "" y no propaga', cat('CLo') === '', cat('CLo'));

console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
