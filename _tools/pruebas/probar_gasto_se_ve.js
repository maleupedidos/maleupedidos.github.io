/* LO QUE SE CARGA EN CAJA SE VE AL INSTANTE, AUNQUE SE TOQUE ACTUALIZAR (2/11/2026).

   node _tools/pruebas/probar_gasto_se_ve.js [archivo]      (_src/panel.src.html por defecto)

   El caso de Tadeo, 22:31: cargo un gasto (Sueldo, $600.000 MP), toco Actualizar y no estaba. La caja viene de la
   base, y el renglon llega a `cash_movement` cuando pasa la replica (3 min). `_cajaCampos` reemplazaba la lista y los
   totales y se llevaba lo pintado. Saca del archivo, tal cual, aplicarMovLocal, _movCajaSumar, _movLocalDescartar,
   _movLocalesReponer y _cajaCampos, y sostiene:
   · el gasto recien cargado sigue en la lista y en los totales despues de una lectura que todavia no lo trae;
   · cuando la lectura lo trae, queda UNA vez (no se suma dos veces);
   · un gasto que fallo y se descarto no vuelve;
   · pasados 15 min ya no se repone (la lectura manda);
   · lo mismo con un ingreso, y con la cuenta (Brubank) en el mapa por cuenta.
   Con el panel de antes (sin _movLocalesReponer) el primero da MAL. */
'use strict';
const fs = require('fs'), path = require('path');
const ARCH = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', '_src', 'panel.src.html'));
const src = fs.readFileSync(ARCH, 'utf8');
function sacar(nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) return null;
  let j = src.indexOf('{', i), n = 0;
  for (; j < src.length; j++) { if (src[j] === '{') n++; else if (src[j] === '}' && --n === 0) break; }
  return src.slice(i, j + 1);
}
const piezas = ['_movCajaSumar', '_movLocalDescartar', '_movLocalesReponer', 'aplicarMovLocal', '_cajaCampos'].map(sacar);
let ok = 0, mal = 0;
const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
if (piezas.some(p => !p)) { chk('el panel tiene _movLocalesReponer (lo cargado vuelve despues de una lectura)', false, piezas.map(p => !!p)); console.log('\n' + ok + ' ok · ' + mal + ' mal'); process.exit(1); }
let reloj = Date.parse('2026-11-02T22:31:31-03:00');
const mundo = new Function('reloj', 'Date_', `
  var D = null; var MOV_LOC_MS = 15*60*1000, _movLocales = [];
  var Date = function (x) { return x === undefined ? new Date_(reloj()) : new Date_(x); };
  Date.now = function () { return reloj(); }; Date.parse = Date_.parse;
  function _cajaCuentas() { return [{ id: 'efectivo', tipo: 'efectivo' }, { id: 'mp', def: true }, { id: 'brubank' }]; }
  function _horaMov() { return ''; }
  ${piezas.join('\n')}
  return { set D(v) { D = v; }, get D() { return D; }, aplicarMovLocal, _cajaCampos, _movLocalDescartar, locales: function () { return _movLocales.length; } };
`)(() => reloj, Date);
const leer = () => JSON.parse(JSON.stringify({ caja: { gastosEf: 0, gastosMP: 5000, ingresosEf: 0, ingresosMP: 0, gastosPorCuenta: { mp: 5000 } },
  movimientos: [{ tipo: 'gasto', f: '02/11/2026', ts: Date.parse('2026-11-02T17:15:07-03:00'), cat: 'Proveedor', con: 'Pago a Le Unike', met: 'Mercado Pago', cta: 'mp', $: 5000 }] }));
const cuantos = (con) => mundo.D.movimientos.filter(m => m.con === con).length;

// 1. El caso de Tadeo
mundo.D = leer();
mundo.aplicarMovLocal('gasto', '2026-11-02', 'Sueldo', 'Tadeo Ustariz', 'Mercado Pago', 600000, '2da parte del Sueldo Octubre', 'mp');
chk('al guardar se ve en la lista', cuantos('Tadeo Ustariz') === 1 && mundo.D.caja.gastosMP === 605000, mundo.D.caja);
reloj += 20000;
mundo._cajaCampos(leer());   /* Actualizar: la base todavia no lo trae */
chk('Actualizar con la base atrasada: el gasto SIGUE en la lista', cuantos('Tadeo Ustariz') === 1, mundo.D.movimientos.map(m => m.con));
chk('   y en los totales (gastos MP $605.000 y la cuenta mp)', mundo.D.caja.gastosMP === 605000 && mundo.D.caja.gastosPorCuenta.mp === 605000, mundo.D.caja);
reloj += 20000;
mundo._cajaCampos(leer());
chk('una segunda lectura atrasada tampoco lo duplica', cuantos('Tadeo Ustariz') === 1 && mundo.D.caja.gastosMP === 605000, mundo.D.caja);
reloj += 140000;
const conElGasto = leer();
conElGasto.caja.gastosMP = 605000; conElGasto.caja.gastosPorCuenta.mp = 605000;
conElGasto.movimientos.unshift({ tipo: 'gasto', f: '02/11/2026', ts: Date.parse('2026-11-02T22:31:31-03:00'), cat: 'Sueldo', con: 'Tadeo Ustariz', met: 'Mercado Pago', cta: 'mp', $: 600000 });
mundo._cajaCampos(conElGasto);   /* paso la replica: la lectura lo trae */
chk('cuando la lectura lo trae queda UNA vez, con los totales de la lectura', cuantos('Tadeo Ustariz') === 1 && mundo.D.caja.gastosMP === 605000, { n: cuantos('Tadeo Ustariz'), caja: mundo.D.caja });
chk('   y deja de estar anotado', mundo.locales() === 0, mundo.locales());

// 2. Un gasto que fallo no vuelve
mundo.D = leer();
const toque = reloj;
mundo.aplicarMovLocal('gasto', '2026-11-02', 'Insumos', 'Bolsas', 'Efectivo', 3000, '', '');
mundo._movLocalDescartar(toque);
mundo._cajaCampos(leer());
chk('un gasto que fallo y se descarto no vuelve', cuantos('Bolsas') === 0 && mundo.D.caja.gastosEf === 0, mundo.D.caja);

// 3. Pasados 15 min manda la lectura
mundo.D = leer();
mundo.aplicarMovLocal('ingreso', '2026-11-02', 'Otros', 'Devolucion', 'Brubank', 7000, '', 'brubank');
reloj += 16 * 60000;
mundo._cajaCampos(leer());
chk('pasados 15 min ya no se repone', cuantos('Devolucion') === 0, mundo.D.movimientos.map(m => m.con));

// 4. Ingreso a otra cuenta, con una lectura atrasada
mundo.D = leer();
mundo.aplicarMovLocal('ingreso', '2026-11-02', 'Otros', 'Reintegro', 'Brubank', 7000, '', 'brubank');
reloj += 30000;
mundo._cajaCampos(leer());
chk('un ingreso a Brubank sigue en la lista y en su cuenta', cuantos('Reintegro') === 1 && mundo.D.caja.ingresosMP === 7000 && (mundo.D.caja.ingresosPorCuenta || {}).brubank === 7000, mundo.D.caja);

console.log('\n' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
