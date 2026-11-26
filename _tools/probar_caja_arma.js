/* La foto de Caja armada en la base (26/10/2026, 147): la comparacion del modo medir.
     node _tools/probar_caja_arma.js _src/panel.src.html [<caja_apps.json> <caja_base.json>]
   caja_apps.json = cajaLight (Apps Script o el `payload` de la foto); caja_base.json = la
   respuesta de rpc/caja_light_pantalla (o caja_light_base() en la prueba PGlite de la 147).
   Datos de clientes: al scratchpad, nunca a este repo (es publico). */
const fs = require('fs'), vm = require('vm');
const [, , HTML, A, B] = process.argv;
const src = fs.readFileSync(HTML, 'utf8');
const fn = n => { const i = src.indexOf('function ' + n + '('); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(i, j + 1); };
const c = {}; vm.createContext(c); vm.runInContext(fn('_cajaArmaComparar'), c);
let ok = 0, mal = 0; const chk = (t, x, d) => { x ? ok++ : mal++; console.log((x ? '  ok  ' : '  MAL ') + t + (x ? '' : '  -> ' + JSON.stringify(d))); };
if (A && B) {
  const a = JSON.parse(fs.readFileSync(A, 'utf8')), b = JSON.parse(fs.readFileSync(B, 'utf8'));
  const r = c._cajaArmaComparar(a, b);
  console.log('  REAL: ' + a.movimientos.length + ' movimientos · ' + r.diferencias + ' diferencias · ' + JSON.stringify(r.detalle));
}
const M = (o) => Object.assign({ tipo: 'cobro', f: '26/10/2026 14:52', ts: 1793037120000, cat: 'COBRO Home', con: 'Ana #2082', hoja: 'Home', pedido: '2082', fila: 5, met: 'Efectivo', cta: 'efectivo', $: 53000, not: '', q: 'Tadeo' }, o);
const G = (o) => Object.assign({ tipo: 'gasto', f: '26/10/2026 13:17', ts: 1793031445000, r: 385, cat: 'Proveedor', con: 'Pago', met: 'Brubank Lucas', cta: 'brubank', lug: '', $: 737370, not: '', noBorrar: 'proveedor' }, o);
const caja = { cobradoEf: 53000, cobradoMP: 0, totalGastos: 737370, gastosEf: 0, gastosMP: 737370, ingresosEf: 0, ingresosMP: 0, cobradoPorCuenta: { efectivo: 53000 }, gastosPorCuenta: { brubank: 737370 }, ingresosPorCuenta: {} };
const a = { movimientos: [M(), G()], gastos: [{ r: 385, $: 737370 }], ingresos: [], caja };
const b = { movimientos: [M({ ts: 1793037120400 }), G({ $: 737370.004 })], gastos: [{ r: 385, $: 737370 }], ingresos: [], caja: JSON.parse(JSON.stringify(caja)) };
let r = c._cajaArmaComparar(a, b);
chk('iguales: milisegundos y centavos de redondeo no cuentan', r.diferencias === 0, r.detalle);
b.movimientos[0].$ = 50000; r = c._cajaArmaComparar(a, b);
chk('un cobro con otro monto se ve', r.diferencias === 1 && r.detalle.$, r.detalle);
b.movimientos[0].$ = 53000; b.caja.gastosPorCuenta.brubank = 1; r = c._cajaArmaComparar(a, b);
chk('un total por cuenta distinto se ve', r.detalle['caja.gastosPorCuenta.brubank'], r.detalle);
b.caja.gastosPorCuenta.brubank = 737370; b.movimientos.pop(); r = c._cajaArmaComparar(a, b);
chk('un gasto que falta en la base se ve', !!r.detalle._solo_apps_script, r.detalle);
chk('el detalle dice que es caja y no lleva datos del cliente', r.detalle._pantalla.ej === 'caja' && JSON.stringify(r.detalle).indexOf('Ana') < 0, r.detalle);
console.log(ok + ' ok, ' + mal + ' mal');
