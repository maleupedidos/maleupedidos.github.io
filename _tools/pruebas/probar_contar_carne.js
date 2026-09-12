/* Un producto que se lleva POR PIEZA no se cuenta por kilos (11/9/2026).

   `stockContar` fijaba los kilos de un deposito sin mirar las piezas, y
   `_piezasSincronizarStock_` los pisa con la suma de lo pesado en la proxima
   tanda de RECIBIR CARNE: el numero contado duraba hasta entonces, sin un solo
   error. Es el mismo agujero que tenia MOVER (`_traspasarPiezas_`).

   Corre `_doPostStockContar` ENTERA, sacada del Code.js real, con las tres hojas
   que toca simuladas (Piezas Carne, Productos, Depositos). La propiedad que
   importa: **con un producto por pieza, la columna del deposito no se escribe.**

     node probar_contar_carne.js [Code.js]

   Contra un Code.js anterior al arreglo tiene que dar ROJOS, no reventar. */
'use strict';
const fs = require('fs'), vm = require('vm');
const ARCHIVO = process.argv[2] || 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/estancias/.clasp-src/Code.js';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } };

// ─── Piezas Carne: ID Abbr Corte Peso Estado Dep Recibida Prov Costo Pedido Salida Nota
const PZ_COLS = 12;
// ─── Productos: 21 cols. 2=abbr, 3=nombre(idx1), 5=F(idx5), 17=R Ustariz, 18=S Moresco, 16=Unidad, 20=Deposito
const PR_COLS = 21;
let piezas, prod, kardex, lockLibre;

function reset() {
  piezas = [
    // Colita: 3 en Ustariz (4,991 kg) + 1 entregada que no cuenta
    ['P-0001', 'CCo', 'Colita de Cuadril', 1.100, 'Disponible', 'ustariz', '10/09/2026', 'Caco', 18800, '', '', ''],
    ['P-0002', 'CCo', 'Colita de Cuadril', 1.891, 'Asignada', 'ustariz', '10/09/2026', 'Caco', 18800, 'Home #940', '', ''],
    ['P-0003', 'CCo', 'Colita de Cuadril', 2.000, 'Disponible', 'ustariz', '10/09/2026', 'Caco', 18800, '', '', ''],
    ['P-0004', 'CCo', 'Colita de Cuadril', 9.999, 'Entregada', 'ustariz', '10/09/2026', 'Caco', 18800, 'Home #938', '11/09/2026', ''],
    // Lomo: 1 en Moresco, ninguna en Ustariz
    ['P-0005', 'CLo', 'Lomo', 1.500, 'Disponible', 'moresco', '10/09/2026', 'Caco', 28500, '', '', ''],
  ];
  prod = [];
  const fila = (abbr, nom, f, ust, mor, uni, dep) => {
    const r = new Array(PR_COLS).fill('');
    r[1] = nom; r[2] = abbr; r[5] = f; r[16] = uni; r[17] = ust; r[18] = mor; r[20] = dep;
    return r;
  };
  prod.push(new Array(PR_COLS).fill('enc'));                            // encabezados
  prod.push(fila('CCo', 'Colita de Cuadril', 4.991, 4.991, 0, 'kg', 'ustariz'));
  prod.push(fila('CLo', 'Lomo', 1.5, 0, 1.5, 'kg', 'moresco'));
  prod.push(fila('CPi', 'Picaña', 3, 3, 0, 'kg', 'ustariz'));           // por kilo, SIN piezas
  prod.push(fila('PPM', 'Pack Muzzarella x2', 18, 18, 0, 'u', 'ustariz')); // por unidad
  kardex = [];
  lockLibre = true;
}
reset();

function hojaDe(getFilas, nCols, primeraFila) {
  const off = primeraFila;   // 2 = con encabezado aparte (Piezas), 1 = la matriz entera (Productos)
  return {
    getName: () => 'sim',
    getLastRow: () => getFilas().length + (off === 2 ? 1 : 0),
    getLastColumn: () => nCols,
    getDataRange() { return this.getRange(1, 1, getFilas().length + (off === 2 ? 1 : 0), nCols); },
    appendRow(r) { getFilas().push(r.slice()); },
    getRange(f, c, nf, nc) {
      const F = getFilas();
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < (nf || 1); i++) {
            if (off === 2 && f + i === 1) { out.push(new Array(nc || 1).fill('enc')); continue; }
            out.push((F[f - off + i] || new Array(nCols).fill('')).slice(c - 1, c - 1 + (nc || 1)));
          }
          return out;
        },
        getValue() { return (F[f - off] || [])[c - 1]; },
        setValue(v) { if (!F[f - off]) F[f - off] = new Array(nCols).fill(''); F[f - off][c - 1] = v; return this; },
        setValues(v) { v.forEach((r, i) => r.forEach((x, j) => { if (!F[f - off + i]) F[f - off + i] = new Array(nCols).fill(''); F[f - off + i][c - 1 + j] = x; })); return this; },
        clearContent() { if (F[f - off]) F[f - off][c - 1] = ''; return this; },
        setNumberFormat() { return this; }, setFontWeight() { return this; }, setNote() { return this; },
      };
    },
    setFrozenRows() {}, getMaxRows: () => getFilas().length + 50, insertRowBefore() {},
  };
}

const hPiezas = hojaDe(() => piezas, PZ_COLS, 2);
const hProd = hojaDe(() => prod, PR_COLS, 1);
const hKardex = hojaDe(() => kardex, 10, 1);
const DEPOSITOS = [
  ['id', 'Nombre', 'Dueño', 'Col', 'Activo'],
  ['ustariz', 'Depósito Ustariz', 'Tadeo', 'R', 'Si'],
  ['moresco', 'Depósito Moresco', 'Lucas', 'S', 'Si'],
];
const hDeps = hojaDe(() => DEPOSITOS.slice(1), 5, 1);
hDeps.getDataRange = () => ({ getValues: () => DEPOSITOS });

const SS_SIM = {
  getSheetByName(n) {
    if (n === 'Piezas Carne') return hPiezas;
    if (n === 'Productos') return hProd;
    if (n === 'Depositos') return hDeps;
    if (n === 'Kardex') return hKardex;
    return null;
  },
  insertSheet: () => hPiezas,
};

function comodin(n) {
  const f = function () { return comodin(n); };
  return new Proxy(f, { get(_t, p) { if (p === Symbol.toPrimitive) return () => ''; if (p === 'then') return undefined; if (p === 'toString') return () => ''; return comodin(n + '.' + String(p)); }, apply() { return comodin(n + '()'); }, construct() { return comodin('new ' + n); } });
}
const sandbox = {
  console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error,
  isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, setTimeout, Proxy, Symbol,
  SpreadsheetApp: { getActiveSpreadsheet: () => SS_SIM, openById: () => SS_SIM, flush() {} },
  LockService: { getScriptLock: () => ({ tryLock: () => lockLibre, releaseLock() {} }) },
  Utilities: { formatDate: () => '11/09/2026' },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {}, removeAll() {} }) },
  /* `_jsonOut_` devuelve un ContentService; para el test alcanza con el objeto. */
  ContentService: { createTextOutput: (t) => ({ setMimeType: () => ({ __txt: t }) }), MimeType: { JSON: 'json' } },
};
['PropertiesService', 'ScriptApp', 'HtmlService', 'UrlFetchApp',
  'MailApp', 'GmailApp', 'DriveApp', 'Session', 'Logger', 'CalendarApp'].forEach(s => { sandbox[s] = comodin(s); });
vm.createContext(sandbox);
console.log('\n== La carne se cuenta por PIEZA, no por kilo ==\n');
vm.runInContext(fs.readFileSync(ARCHIVO, 'utf8'), sandbox, { filename: 'Code.js' });

/* Corre el endpoint y devuelve el JSON ya parseado. Aguanta que la funcion no
   exista: contra un Code.js anterior el test tiene que dar rojos legibles. */
function contar(abbr, deposito, cantidad) {
  try {
    sandbox.__d = { abbr: abbr, deposito: deposito, cantidad: cantidad };
    const out = vm.runInContext('_doPostStockContar(__d)', sandbox);
    const txt = out && out.__txt;
    return txt ? JSON.parse(txt) : { ok: false, error: 'sin salida', _raro: true };
  } catch (e) { return { ok: false, error: String(e.message || e), _revento: true }; }
}
const colUstariz = abbr => (prod.find(r => r[2] === abbr) || [])[17];
const colMoresco = abbr => (prod.find(r => r[2] === abbr) || [])[18];
const colF = abbr => (prod.find(r => r[2] === abbr) || [])[5];

// ══ 1. La colita: 3 piezas en Ustariz que suman 4,991 ═══════════════════════
console.log('-- un corte con piezas, contado DISTINTO de lo que suman --');
reset();
let r = contar('CCo', 'ustariz', 6.2);
chk('lo rechaza: no escribe un numero que la proxima tanda pisa', r.ok === false, r);
chk('  dice que es por pieza', r.porPieza === true, r);
chk('  y la col del deposito NO se toco', colUstariz('CCo') === 4.991, colUstariz('CCo'));
chk('  ni el total F', colF('CCo') === 4.991, colF('CCo'));
chk('  ni se escribio una fila de Kardex', kardex.length === 0, kardex.length);
chk('  cuenta las piezas que de verdad estan en el freezer (3, no 4)', r.piezas === 3, r);
chk('  la Entregada no cuenta como stock', r.kg === 4.991, r);
chk('  el mensaje nombra el corte', /Colita de Cuadril/.test(r.error || ''), r.error);
chk('  nombra el deposito por su nombre, no por su id', /Dep.sito Ustariz/.test(r.error || ''), r.error);
chk('  dice cuanto conto', /6,2/.test(r.error || ''), r.error);
chk('  y que hacer si SOBRA (contaste mas)', /pesala en RECIBIR CARNE/i.test(r.error || ''), r.error);
chk('  devuelve los ids para poder mirarlos', (r.ids || []).length === 3, r.ids);

console.log('\n-- contado de MENOS: el consejo es el otro --');
reset();
r = contar('CCo', 'ustariz', 3.1);
chk('lo rechaza igual', r.ok === false, r);
chk('  dice que se da de baja con la x', /dala de baja/i.test(r.error || ''), r.error);
chk('  NO dice que la pese', !/pesala en RECIBIR/i.test(r.error || ''), r.error);

console.log('\n-- contado IGUAL a lo que suman las piezas --');
reset();
r = contar('CCo', 'ustariz', 4.991);
chk('lo confirma en vez de dar error: el que conto quiere saber', r.ok === true, r);
chk('  y lo dice explicito (cuadrado)', r.cuadrado === true, r);
chk('  el mensaje dice los kilos', /4,991/.test(r.msg || ''), r.msg);
chk('  tampoco escribio nada', colUstariz('CCo') === 4.991 && kardex.length === 0, [colUstariz('CCo'), kardex.length]);

console.log('\n-- el mismo corte, contado en el deposito donde NO tiene piezas --');
reset();
r = contar('CCo', 'moresco', 2);
chk('lo rechaza: el corte se lleva por pieza, este freezer o el otro', r.ok === false, r);
chk('  y lo dice sin inventar piezas', r.piezas === 0 && r.kg === 0, r);
chk('  el mensaje no miente con un plural', /no hay ninguna pieza/i.test(r.error || ''), r.error);
chk('  la col de Moresco quedo intacta', colMoresco('CCo') === 0, colMoresco('CCo'));
reset();
r = contar('CCo', 'moresco', 0);
chk('contar CERO donde no hay piezas cuadra, no es un error', r.ok === true && r.cuadrado === true, r);

console.log('\n-- un corte con piezas en el OTRO deposito --');
reset();
r = contar('CLo', 'moresco', 1.5);
chk('cuadra contra la pieza que esta en Moresco', r.ok === true && r.cuadrado === true, r);
chk('  y su nombre de deposito es el correcto', /Moresco/.test(r.msg || ''), r.msg);

// ══ 2. Lo que NO tiene que cambiar ══════════════════════════════════════════
console.log('\n-- un producto por UNIDAD sigue contandose como siempre --');
reset();
r = contar('PPM', 'ustariz', 16);
chk('lo escribe', r.ok === true, r);
chk('  no lo trata como pieza', !r.porPieza && !r.cuadrado, r);
chk('  la col del deposito quedo en lo contado', colUstariz('PPM') === 16, colUstariz('PPM'));
chk('  y el total F bajo lo mismo', colF('PPM') === 16, colF('PPM'));
chk('  dejo su fila de Kardex', kardex.length === 1, kardex.length);

console.log('\n-- un producto por KILO que nunca se llevo por pieza (un granel) --');
reset();
r = contar('CPi', 'ustariz', 2.4);
chk('sigue contandose por kilos: la regla es tener piezas, no la unidad', r.ok === true, r);
chk('  la escribio', colUstariz('CPi') === 2.4, colUstariz('CPi'));
chk('  y no lo trato como pieza', !r.porPieza, r);

console.log('\n-- los bordes que ya tenia el endpoint --');
reset();
chk('sin producto, corta', contar('', 'ustariz', 1).ok === false);
chk('sin deposito, corta', contar('CCo', '', 1).ok === false);
chk('cantidad negativa, corta', contar('CCo', 'ustariz', -1).ok === false);
chk('un deposito que no existe, corta', contar('CCo', 'inventado', 1).ok === false);
chk('un producto que no existe, corta', contar('XXX', 'ustariz', 1).ok === false);
reset();
lockLibre = false;
r = contar('CCo', 'ustariz', 6.2);
chk('sin el lock no escribe nada', r.ok === false && colUstariz('CCo') === 4.991, [r, colUstariz('CCo')]);
lockLibre = true;

console.log('\n-- idempotencia: dos toques iguales no mueven nada dos veces --');
reset();
contar('PPM', 'ustariz', 16);
const kn = kardex.length;
contar('PPM', 'ustariz', 16);
chk('el segundo toque no escribe otra fila de Kardex', kardex.length === kn, [kn, kardex.length]);

console.log('\n' + (mal ? '  ' + ok + ' ok · ' + mal + ' MAL' : '  ' + ok + ' ok, todo bien') + '\n');
process.exit(mal ? 1 : 0);
