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
const piezas = ['_medVersion', '_medEmpezar', '_medCerrar', '_movCajaSumar', '_movLocalDescartar', '_movEsElBorrado', '_movBorradoAnotar', '_movBorradoOlvidar', '_movSacar', '_saldoLocalAnotar', '_saldoIgual', '_cajaRestar', '_saldoLocalReponer', '_movLocalesReponer', 'aplicarMovLocal', '_cajaCampos'].map(sacar);
let ok = 0, mal = 0;
const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
if (piezas.some(p => !p)) { chk('el panel tiene _movLocalesReponer (lo cargado vuelve despues de una lectura)', false, piezas.map(p => !!p)); console.log('\n' + ok + ' ok · ' + mal + ' mal'); process.exit(1); }
let reloj = Date.parse('2026-11-02T22:31:31-03:00');
const mundo = new Function('reloj', 'Date_', `
  var D = null; var MOV_LOC_MS = 15*60*1000, _movLocales = [], _movBorrados = [], _saldoLocal = null;
  var window = {}, document = { documentElement: { getAttribute: function () { return ''; } } }, cur = 'caja';
  var MED_TOPE = 300, _medCola = [], _medTimer = 1; function _medMandar() {}
  function requestAnimationFrame(f) { f(); }
  var Date = function (x) { return x === undefined ? new Date_(reloj()) : new Date_(x); };
  Date.now = function () { return reloj(); }; Date.parse = Date_.parse;
  function _cajaCuentas() { return [{ id: 'efectivo', tipo: 'efectivo' }, { id: 'mp', def: true }, { id: 'brubank' }]; }
  function _horaMov() { return ''; }
  ${piezas.join('\n')}
  return { set D(v) { D = v; }, get D() { return D; }, aplicarMovLocal, _cajaCampos, _movLocalDescartar, _movSacar, _movBorradoAnotar, _movBorradoOlvidar, borrados: function () { return _movBorrados.length; }, _saldoLocalAnotar, saldoLocal: function () { return _saldoLocal; }, locales: function () { return _movLocales.length; }, med: function () { return _medCola; } };
`)(() => reloj, Date);
const leer = () => JSON.parse(JSON.stringify({ caja: { gastosEf: 0, gastosMP: 5000, ingresosEf: 0, ingresosMP: 0, gastosPorCuenta: { mp: 5000 } },
  movimientos: [{ tipo: 'gasto', r: 399, f: '02/11/2026', ts: Date.parse('2026-11-02T17:15:07-03:00'), cat: 'Proveedor', con: 'Pago a Le Unike', met: 'Mercado Pago', cta: 'mp', $: 5000 }] }));
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

// 5. BORRAR un movimiento: resta del saldo y la lectura atrasada no lo devuelve
mundo.D = leer();
let m5 = mundo.D.movimientos[0];
mundo._movSacar(m5); mundo._movBorradoAnotar(m5);
chk('al borrar sale de la lista y resta del total (gastos MP 5000 -> 0)', cuantos('Pago a Le Unike') === 0 && mundo.D.caja.gastosMP === 0 && mundo.D.caja.gastosPorCuenta.mp === 0, mundo.D.caja);
reloj += 20000;
mundo._cajaCampos(leer());   /* la base todavia lo trae */
chk('una lectura que todavia lo trae NO lo devuelve, y el total sigue en 0', cuantos('Pago a Le Unike') === 0 && mundo.D.caja.gastosMP === 0, { lista: mundo.D.movimientos.map(m => m.con), caja: mundo.D.caja });
reloj += 20000;
const sinEl = leer(); sinEl.movimientos = []; sinEl.caja.gastosMP = 0; sinEl.caja.gastosPorCuenta.mp = 0;
mundo._cajaCampos(sinEl);   /* paso la replica: ya no esta */
chk('cuando la base ya no lo trae, no resta dos veces', mundo.D.caja.gastosMP === 0 && mundo.borrados() === 0, { caja: mundo.D.caja, borrados: mundo.borrados() });
// 6. Un borrado que fallo se olvida: la lectura lo muestra de nuevo
mundo.D = leer();
m5 = mundo.D.movimientos[0];
mundo._movSacar(m5); mundo._movBorradoAnotar(m5); mundo._movBorradoOlvidar('gasto', 399);
mundo._cajaCampos(leer());
chk('un borrado que fallo vuelve a mostrar el movimiento y su total', cuantos('Pago a Le Unike') === 1 && mundo.D.caja.gastosMP === 5000, mundo.D.caja);

// 7. CONTAR: el saldo nuevo no vuelve atras y los totales cuentan desde el conteo
const conSaldo = () => { const x = leer(); x.saldoBase = { ef: 100000, mp: 2000000, inv: 0, fecha: '21/10/2026', porCuenta: { efectivo: 100000, mp: 2000000 } }; return x; };
mundo.D = conSaldo();
mundo._saldoLocalAnotar({ ef: 150000, mp: 1900000, inv: 0, fecha: '02/11/2026', porCuenta: { efectivo: 150000, mp: 1900000 } }, mundo.D.caja);
mundo.D.saldoBase = { ef: 150000, mp: 1900000, inv: 0, fecha: '02/11/2026', porCuenta: { efectivo: 150000, mp: 1900000 } };
mundo.D.caja = { cobradoEf: 0, cobradoMP: 0, gastosEf: 0, gastosMP: 0, ingresosEf: 0, ingresosMP: 0, gastosPorCuenta: {}, ingresosPorCuenta: {} };
reloj += 20000;
const vieja = conSaldo(); vieja.caja.gastosMP = 5000 + 800; vieja.caja.gastosPorCuenta.mp = 5800;   /* despues del conteo hubo un gasto de $800 */
mundo._cajaCampos(vieja);   /* la base todavia tiene el saldo del 21/10 */
chk('Contar: una lectura con el saldo viejo no lo vuelve atras', mundo.D.saldoBase.ef === 150000 && mundo.D.saldoBase.mp === 1900000, mundo.D.saldoBase);
chk('   y los totales cuentan desde el conteo (gastos MP $800, no $5.800)', mundo.D.caja.gastosMP === 800 && mundo.D.caja.gastosPorCuenta.mp === 800, mundo.D.caja);
reloj += 20000;
const nueva = conSaldo(); nueva.saldoBase = { ef: 150000, mp: 1900000, inv: 0, fecha: '02/11/2026 22:50', porCuenta: { efectivo: 150000, mp: 1900000 } };
nueva.caja.gastosMP = 800; nueva.caja.gastosPorCuenta.mp = 800;
mundo._cajaCampos(nueva);   /* la base ya tiene el conteo */
chk('   cuando la base trae el conteo, manda la lectura y se suelta', mundo.D.caja.gastosMP === 800 && mundo.saldoLocal() === null, { caja: mundo.D.caja, local: mundo.saldoLocal() });

// 8. INVERTIR: el saldo nuevo se queda, los totales no se tocan
mundo.D = conSaldo();
mundo._saldoLocalAnotar({ ef: 100000, mp: 1500000, inv: 500000, fecha: '21/10/2026', porCuenta: { efectivo: 100000, mp: 1500000 } }, null);
reloj += 20000;
mundo._cajaCampos(conSaldo());
chk('Invertir: una lectura vieja no devuelve el MP de antes, y los totales quedan como los trae', mundo.D.saldoBase.mp === 1500000 && mundo.D.saldoBase.inv === 500000 && mundo.D.caja.gastosMP === 5000, { sb: mundo.D.saldoBase, caja: mundo.D.caja });

// 9. EL MEDIDOR: cada caso cierra con su resultado, sin datos del cliente
const M = mundo.med();
const de = (b) => M.filter(r => r.boton === b);
chk('medidor: el gasto de Tadeo cierra «base» con 2 lecturas que vinieron sin el', de('gasto').some(r => r.resultado === 'base' && r.relecturas_sin === 2 && r.ms_base > 0 && r.ms_visto != null), de('gasto'));
chk('medidor: el gasto que fallo cierra «fallo»', de('gasto').some(r => r.resultado === 'fallo'), de('gasto'));
chk('medidor: el ingreso que no llego en 15 min cierra «perdido»', de('ingreso').some(r => r.resultado === 'perdido'), de('ingreso'));
chk('medidor: el borrado cierra «base» con 1 lectura atrasada, y el que fallo «fallo»', de('borrarMov').some(r => r.resultado === 'base' && r.relecturas_sin === 1) && de('borrarMov').some(r => r.resultado === 'fallo'), de('borrarMov'));
chk('medidor: contar cierra «base» cuando la base trae el conteo', de('contar').some(r => r.resultado === 'base' && r.relecturas_sin === 1), de('contar'));
chk('medidor: ninguna fila lleva el concepto, notas ni nombres', !JSON.stringify(M).match(/Tadeo|Le Unike|Sueldo|Bolsas|Reintegro/), M.map(r => r.ref));

console.log('\n' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
