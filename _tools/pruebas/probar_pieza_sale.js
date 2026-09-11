/* La pieza de carne sale del freezer al entregar (11/9/2026), con las funciones
   sacadas del Code.js REAL y la hoja Piezas Carne simulada.
     node probar_pieza_sale.js [Code.js] */
'use strict';
const fs = require('fs'), vm = require('vm');
const ARCHIVO = process.argv[2] || 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/estancias/.clasp-src/Code.js';
let ok = 0, mal = 0;
function chk(t, c, d) { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } }

// ── la hoja Piezas Carne, simulada: ID Abbr Corte Peso Estado Dep Recibida Prov Costo Pedido Salida Nota
const COLS = 12;
let filas, lockLibre = true, hojaExiste = true;
function reset() {
  filas = [
    ['P-0004', 'CVa', 'Vacío', 1.922, 'Asignada', 'ustariz', '10/09/2026', 'Caco', 18200, 'Home #937', '', ''],
    ['P-0042', 'CEn', 'Entraña', 1.442, 'Asignada', 'ustariz', '10/09/2026', 'Caco', 30000, 'Home #937', '', ''],
    ['P-0011', 'CCo', 'Colita', 1.221, 'Asignada', 'ustariz', '10/09/2026', 'Caco', 18800, 'Home #938', '', ''],
    ['P-0099', 'CCo', 'Colita', 1.100, 'Disponible', 'ustariz', '10/09/2026', 'Caco', 18800, '', '', ''],
    ['P-0100', 'CLo', 'Lomo', 2.000, 'Asignada', 'ustariz', '10/09/2026', 'Caco', 28500, 'Home #93', '', ''],   // ref PARECIDA
    ['P-0101', 'CLo', 'Lomo', 1.500, 'Entregada', 'ustariz', '10/09/2026', 'Caco', 28500, 'Home #900', '11/09/2026', ''],
  ];
}
reset();
const hoja = {
  getName: () => 'Piezas Carne',
  getLastRow: () => filas.length + 1,
  getLastColumn: () => COLS,
  getRange(f, c, nf, nc) {
    return {
      getValues() {
        const out = [];
        for (let i = 0; i < (nf || 1); i++) out.push((filas[f - 2 + i] || []).slice(c - 1, c - 1 + (nc || 1)));
        return out;
      },
      getValue() { return (filas[f - 2] || [])[c - 1]; },
      setValue(v) { filas[f - 2][c - 1] = v; return this; },
      clearContent() { filas[f - 2][c - 1] = ''; return this; },
      setValues(v) { v.forEach((r, i) => r.forEach((x, j) => { filas[f - 2 + i][c - 1 + j] = x; })); return this; },
      setNumberFormat() { return this; }, setFontWeight() { return this; },
    };
  },
  setFrozenRows() {}, getMaxRows: () => filas.length + 50,
};
function comodin(n) {
  const f = function () { return comodin(n); };
  return new Proxy(f, { get(_t, p) { if (p === Symbol.toPrimitive) return () => ''; if (p === 'then') return undefined; if (p === 'toString') return () => ''; return comodin(n + '.' + String(p)); }, apply() { return comodin(n + '()'); }, construct() { return comodin('new ' + n); } });
}
const SS_SIM = { getSheetByName: n => (n === 'Piezas Carne' ? (hojaExiste ? hoja : null) : null), insertSheet: () => hoja };
const sandbox = {
  console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error,
  isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, setTimeout, Proxy, Symbol,
  SpreadsheetApp: { getActiveSpreadsheet: () => SS_SIM, openById: () => SS_SIM, flush() {} },
  LockService: { getScriptLock: () => ({ tryLock: () => lockLibre, releaseLock() {} }) },
  Utilities: { formatDate: (d, tz, f) => (f === 'dd/MM/yyyy' ? '11/09/2026' : '11/09/2026') },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {}, removeAll() {} }) },
};
['PropertiesService', 'ScriptApp', 'ContentService', 'HtmlService', 'UrlFetchApp',
  'MailApp', 'GmailApp', 'DriveApp', 'Session', 'Logger', 'CalendarApp'].forEach(s => { sandbox[s] = comodin(s); });
vm.createContext(sandbox);
console.log('\n== La pieza de carne sale del freezer al entregar ==\n');
vm.runInContext(fs.readFileSync(ARCHIVO, 'utf8'), sandbox, { filename: 'Code.js' });

/* Aguanta que la función no exista: corriendo contra un Code.js anterior el test
   tiene que dar ROJOS legibles, no reventar. */
const call = (expr) => {
  try { return vm.runInContext(expr, sandbox); }
  catch (e) { return { n: 0, kg: 0, ids: [], error: String(e.message || e), _revento: true }; }
};
const pieza = id => filas.find(f => f[0] === id);
const enFreezer = () => filas.filter(f => ['Asignada', 'Disponible'].indexOf(f[4]) >= 0)
  .reduce((a, f) => Math.round((a + f[3]) * 1000) / 1000, 0);

chk('las tres funciones del ciclo existen',
  call('typeof _piezasEntregar_ === "function" && typeof _piezasDesentregar_ === "function" && typeof _piezasLiberar_ === "function"'));

// ══ entregar ══
const kgAntes = enFreezer();
let r = call('_piezasEntregar_("Home", "937")');
chk('entregar Home #937 mueve sus 2 piezas', r.n === 2, r);
chk('  y devuelve los kilos exactos (1,922 + 1,442 = 3,364)', r.kg === 3.364, r.kg);
chk('  P-0004 queda Entregada', pieza('P-0004')[4] === 'Entregada', pieza('P-0004')[4]);
chk('  con la fecha de Salida sellada', pieza('P-0004')[10] === '11/09/2026', pieza('P-0004')[10]);
chk('  y sigue diciendo de qué pedido fue', pieza('P-0004')[9] === 'Home #937', pieza('P-0004')[9]);
chk('la pieza de OTRO pedido no se toca', pieza('P-0011')[4] === 'Asignada', pieza('P-0011')[4]);
chk('la Disponible no se toca', pieza('P-0099')[4] === 'Disponible', pieza('P-0099')[4]);
chk('una ref PARECIDA ("Home #93") no matchea: es exacta', pieza('P-0100')[4] === 'Asignada', pieza('P-0100')[4]);
chk('LA PROPIEDAD: el freezer baja exactamente esos 3,364 kg',
  Math.round((kgAntes - enFreezer()) * 1000) / 1000 === 3.364, { antes: kgAntes, ahora: enFreezer() });
r = call('_piezasEntregar_("Home", "937")');
chk('es idempotente: la segunda vez no mueve nada', r.n === 0, r);

// ══ deshacer ══
r = call('_piezasDesentregar_("Home", "937")');
chk('deshacer la entrega devuelve las 2 piezas al freezer', r.n === 2, r);
chk('  vuelven a Asignada (siguen siendo de ese pedido)', pieza('P-0004')[4] === 'Asignada', pieza('P-0004')[4]);
chk('  y se borra la Salida', pieza('P-0004')[10] === '', pieza('P-0004')[10]);
chk('  el freezer queda como al principio', enFreezer() === kgAntes, { ahora: enFreezer(), antes: kgAntes });
chk('deshacer una que NO estaba entregada no hace nada', call('_piezasDesentregar_("Home", "938")').n === 0);

// ══ cancelar ══
reset();
r = call('_piezasLiberar_("Home", "937")');
chk('cancelar libera las 2 piezas', r.n === 2, r);
chk('  quedan Disponible: vuelven a la tienda', pieza('P-0004')[4] === 'Disponible', pieza('P-0004')[4]);
chk('  y se les borra el pedido', pieza('P-0004')[9] === '', pieza('P-0004')[9]);
chk('  pero queda el rastro en la Nota (de dónde venía)',
  /liberada de Home #937/.test(String(pieza('P-0004')[11])), pieza('P-0004')[11]);
reset();
filas.find(f => f[0] === 'P-0004')[11] = 'el paquete son 2 tiras';
call('_piezasLiberar_("Home", "937")');
chk('  sin pisar la nota que ya tenía',
  /2 tiras/.test(String(pieza('P-0004')[11])) && /liberada de/.test(String(pieza('P-0004')[11])), pieza('P-0004')[11]);
reset();
r = call('_piezasLiberar_("Home", "900")');
chk('cancelar un pedido YA ENTREGADO también libera su pieza', r.n === 1 && pieza('P-0101')[4] === 'Disponible', { r: r, e: pieza('P-0101')[4] });
chk('  (si quedara Entregada, el stock devuelto se perdería en la próxima sync)', pieza('P-0101')[10] === '', pieza('P-0101')[10]);

// ══ los bordes ══
reset();
chk('sin ref no toca nada', call('_piezasEntregar_("Home", "")').n === 0);
chk('un pedido inexistente no toca nada', call('_piezasEntregar_("Home", "99999")').n === 0);
lockLibre = false;
r = call('_piezasEntregar_("Home", "937")');
chk('con el lock ocupado NO escribe y lo dice', r.n === 0 && /lock/.test(r.error) && pieza('P-0004')[4] === 'Asignada', r);
lockLibre = true;
hojaExiste = false;
r = call('_piezasEntregar_("Home", "937")');
chk('sin la hoja de piezas devuelve 0 y no rompe (el ERP de antes del 10/9)', r.n === 0 && !r.error, r);
hojaExiste = true;

// ══ los CUATRO caminos, en el archivo ══
const src = fs.readFileSync(ARCHIVO, 'utf8');
chk('camino 1: el POST marcarEntregado la saca', /_pz = _piezasEntregar_\(hoja, pedidoId\)/.test(src));
chk('camino 2: el POST deshacerEntrega la devuelve', /_pz = _piezasDesentregar_\(hoja, pedidoId\)/.test(src));
chk('camino 3: cancelar la libera', /pzLib = _piezasLiberar_\(hoja, pedidoId\)/.test(src));
chk('camino 4: la edición a mano de la celda, en el onEdit', /_piezasEntregar_\(sheetName,/.test(src) && /_piezasDesentregar_\(sheetName,/.test(src));
/* El orden se mide DENTRO de la funcion: en el archivo hay CUATRO
   setValue('-') -el POST y los tres onEdit- y un indexOf global toma el primero.
   Ese detalle es el que destapo que faltaban tres caminos. */
const fnCancel = src.slice(src.indexOf('function _doPostCancelarPedido'));
const fnCancelFin = fnCancel.indexOf('\nfunction ', 10);
const cuerpoCancel = fnCancel.slice(0, fnCancelFin > 0 ? fnCancelFin : 4000);
chk('en cancelar va ANTES de que el N° pase a "-"',
  cuerpoCancel.indexOf('pzLib = _piezasLiberar_') >= 0 &&
  cuerpoCancel.indexOf('pzLib = _piezasLiberar_') < cuerpoCancel.indexOf("sh.getRange(row, 2).setValue('-')"));
// Sin contar la declaración de la función: lo que se cuenta son las LLAMADAS.
const llamadasLib = (src.match(/(?<!function )_piezasLiberar_\(/g) || []).length;
chk('los CUATRO caminos de cancelación liberan la pieza (el POST y los 3 onEdit)',
  llamadasLib === 4, { llamadas: llamadasLib, donde: (src.match(/_piezasLiberar_\([^)]*\)?/g) || []) });
src.split("sh.getRange(row, 2).setValue('-')").slice(0, -1).forEach(function (trozo, i) {
  chk('  camino ' + (i + 1) + ': libera antes de borrar el N°',
    /_piezasLiberar_\(/.test(trozo.slice(-600)), trozo.slice(-200));
});
/* La consecuencia del estado nuevo en la pantalla: las `Entregada` se acumulan
   para siempre, y carnePiezas las mandaba todas. El panel ya filtra por
   Disponible/Asignada, asi que no se ve nada raro — lo que crece es el payload. */
chk('carnePiezas manda solo las piezas del freezer (el push va dentro del if)',
  /if \(_piezaEnFreezer_\(p\)\) \{[\s\S]{0,200}g\.piezas\.push\(p\);/.test(src));
chk('  y las que salieron quedan contadas en `hist`, no borradas',
  /g\.hist = \(g\.hist \|\| 0\) \+ 1;/.test(src) && /hist: piezas\.length - _enFreezer/.test(src));
chk('  el front sigue filtrando igual, así que un backend viejo tampoco muestra las entregadas',
  /pz\.estado==='Disponible'\|\|pz\.estado==='Asignada'/.test(
    fs.readFileSync('c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_src/panel.src.html', 'utf8')));

chk('marcarEntregado la llama adentro de un try (no puede voltear la entrega)',
  /try \{\s*_pz = _piezasEntregar_/.test(src.replace(/\r?\n\s*/g, ' ')));
chk('y si falla avisa nombrando el pedido', /Carne: no pude sacar la pieza del freezer/.test(src));

console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
