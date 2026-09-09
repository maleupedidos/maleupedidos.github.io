/**
 * probar-depositos.js — ¿el AUTOPEDIDO reparte el stock entre depósitos igual
 * que Abastecimiento?
 *
 * POR QUE EXISTE:
 *   La regla de "cuánto de este producto está en SU depósito y cuánto en el
 *   otro" vive dos veces: npDispDep() en busqueda.html (Abastecimiento) y
 *   npDepStock() en ruta.html (la tab «+»). No se puede compartir la función:
 *   las dos sub-apps se fusionan en UN documento, así que dos nombres iguales
 *   se pisan en silencio —lo corta chequearColisiones()— y llamar a la global
 *   de la otra vía window depende de que alguien haya abierto esa tab.
 *
 *   Y no es cosmético: de ese número sale el ORIGEN del pedido. Si se despegan,
 *   una pantalla dice "sale del freezer" y la otra "hay que comprarlo" sobre el
 *   mismo producto — y con Origen: Depósito el backend descuenta stock que no
 *   existe, sin dar ningún error.
 *
 *   No reimplementa la regla. Si la reimplementara, estaría comparando mi copia
 *   contra sí misma.
 *
 *   Lo que NO compara es `txt`: Abastecimiento nombra al dueño ("3 en lo de
 *   Lucas") porque action=catalogo se lo manda, y la tab «+» capitaliza el id
 *   ("3 en lo de Moresco") porque stock_full no trae esa lista. Los dos nombran
 *   el mismo freezer; la diferencia es deliberada.
 *
 *   node _tools/probar-depositos.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VER = '\x1b[32m', RED = '\x1b[31m', DIM = '\x1b[2m', B = '\x1b[1m', RST = '\x1b[0m';
const RUTA = path.join(__dirname, '..', 'ruta.html');
const BUSQ = path.join(__dirname, '..', 'busqueda.html');

/* Saca `function NOMBRE(...){...}` contando llaves. */
function sacar(src, nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no encuentro function ' + nombre);
  let j = src.indexOf('{', i), prof = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') prof++;
    else if (src[k] === '}') { prof--; if (prof === 0) break; }
  }
  return src.slice(i, k + 1);
}

const srcRuta = fs.readFileSync(RUTA, 'utf8');
const srcBusq = fs.readFileSync(BUSQ, 'utf8');

/* El nombre corto se stubea a la identidad en los dos lados: sólo afecta a
   `txt`, que difiere a propósito (ver arriba). */
const STUB = 'function npDepCorto(id){return String(id||"")}\n' +
             'function npDepNombre(id){return String(id||"")}\n';

/* `sacar` devuelve una DECLARACION de función, y `return function f(){}` no la
   devuelve: hay que nombrarla explícitamente en el return. */
function cargar(src, nombre, extra) {
  const ctx = { console };
  Object.assign(ctx, extra || {});
  vm.createContext(ctx);
  return vm.runInContext(
    '(function(){' + STUB + sacar(src, nombre) + '; return ' + nombre + ';})()', ctx);
}

const aba = cargar(srcBusq, 'npDispDep');
// npDepStock lee de NP_STOCK, así que el contexto lleva el objeto y se muta.
const ctxRuta = { NP_STOCK: {} };
const rut = cargar(srcRuta, 'npDepStock', ctxRuta);

/* ── los casos ──────────────────────────────────────────────────────────────
   Se barre pd × disponible × depósito. `disp` es la col H (físico − reservado),
   así que se prueban también los casos en que hay reservado. */
const PDS = [
  { ustariz: 0,     moresco: 0 },
  { ustariz: 5,     moresco: 0 },
  { ustariz: 0,     moresco: 5.61 },      // la carne de hoy
  { ustariz: 2,     moresco: 3 },
  { ustariz: 0.5,   moresco: 1.723 },     // kilos, al gramo
  { ustariz: 10,    moresco: 1 },
  { ustariz: 1,     moresco: 10 },
];
const DEPS = ['ustariz', 'moresco', ''];
const casos = [];
for (const pd of PDS) {
  const fis = pd.ustariz + pd.moresco;
  // sin reservado, con reservado parcial, con todo reservado, y un disp
  // incoherente (mayor que el físico) que no puede pasar pero no debe romper
  for (const disp of [fis, Math.max(0, fis - 1), 0, fis + 2]) {
    for (const dep of DEPS) casos.push({ pd, disp, dep });
  }
}
// Y el caso sin desglose: un Apps Script anterior al 9/9/2026, o la hoja
// Depositos vacía. Los dos tienen que devolver todo en `aca`.
casos.push({ pd: {}, disp: 7, dep: '' });
casos.push({ pd: {}, disp: 7, dep: 'ustariz' });
casos.push({ pd: { ustariz: 3 }, disp: 3, dep: '' });

let ok = 0, mal = 0;
const difs = [];
for (const c of casos) {
  const it = { s: c.disp, dep: c.dep, pd: c.pd };
  const a = aba(it);
  ctxRuta.NP_STOCK.X = { f: c.disp, p: c.disp, dep: c.dep, pd: c.pd };
  const r = rut('X');
  const igual = Math.abs(a.aca - r.aca) < 1e-9 && Math.abs(a.otros - r.otros) < 1e-9;
  if (igual) ok++;
  else {
    mal++;
    difs.push({ c, a, r });
  }
}

/* Control: que los casos ejerciten de verdad las dos ramas. "0 diferencias"
   sobre casos que siempre dan aca=0 no probaría nada. */
let conAca = 0, conOtros = 0;
for (const c of casos) {
  ctxRuta.NP_STOCK.X = { f: c.disp, p: c.disp, dep: c.dep, pd: c.pd };
  const r = rut('X');
  if (r.aca > 0) conAca++;
  if (r.otros > 0) conOtros++;
}

console.log('\n' + B + '== DEPOSITOS: ¿la tab «+» reparte igual que Abastecimiento? ==' + RST);
console.log(DIM + '  ' + casos.length + ' casos · ' + conAca + ' con stock en su depósito · '
  + conOtros + ' con stock en el otro' + RST + '\n');

if (conAca < 10 || conOtros < 5) {
  console.log(RED + '  Los casos no ejercitan las dos ramas: el verde no probaría nada.' + RST);
  process.exit(1);
}

for (const d of difs.slice(0, 12)) {
  console.log(RED + '  MAL' + RST + '  pd=' + JSON.stringify(d.c.pd) + ' disp=' + d.c.disp
    + ' dep="' + d.c.dep + '"');
  console.log('       Abastecimiento: aca=' + d.a.aca + ' otros=' + d.a.otros);
  console.log('       tab «+»       : aca=' + d.r.aca + ' otros=' + d.r.otros);
}

if (mal) {
  console.log('\n' + RED + '  ' + mal + ' de ' + casos.length + ' difieren.' + RST);
  console.log(DIM + '  Las dos funciones se despegaron: npDispDep (busqueda.html) y '
    + 'npDepStock (ruta.html).' + RST + '\n');
  process.exit(1);
}
console.log(VER + '  OK: ' + ok + ' casos, 0 diferencias' + RST + '\n');
