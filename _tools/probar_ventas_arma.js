/* La foto de Ventas armada en la base (26/10/2026, 148): la comparacion del modo medir.
     node _tools/probar_ventas_arma.js _src/panel.src.html [<ventas_apps.json> <ventas_base.json>]
   Datos de clientes: al scratchpad, nunca a este repo (es publico). */
const fs = require('fs'), vm = require('vm');
const [, , HTML, A, B] = process.argv;
const src = fs.readFileSync(HTML, 'utf8');
const fn = n => { const i = src.indexOf('function ' + n + '('); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(i, j + 1); };
const c = {}; vm.createContext(c); vm.runInContext(fn('_ventasArmaComparar'), c);
let ok = 0, mal = 0; const chk = (t, x, d) => { x ? ok++ : mal++; console.log((x ? '  ok  ' : '  MAL ') + t + (x ? '' : '  -> ' + JSON.stringify(d))); };
if (A && B) {
  const a = JSON.parse(fs.readFileSync(A, 'utf8')), b = JSON.parse(fs.readFileSync(B, 'utf8'));
  const r = c._ventasArmaComparar(a, b);
  console.log('  REAL: Apps Script ' + a.v.length + ' · base ' + b.v.length + ' · ' + r.diferencias + ' diferencias · ' + JSON.stringify(r.detalle));
}
const V = (o) => Object.assign({ canal: 'Venta Directa', h: 'Home', n: '1', cliente: 'Ana', fecha: '20/10/2026', $: 1000, rg: { F: 2 }, cta: 'mp' }, o);
const a = { v: [V(), V({ canal: 'B2B', h: undefined, n: undefined, cliente: 'Edu', rg: undefined, cta: undefined })] };
const b = { v: [V({ $: 1000.004, rg: { F: 2 } }), V({ canal: 'B2B', h: undefined, n: undefined, cliente: 'Edu', rg: undefined, cta: undefined })] };
let r = c._ventasArmaComparar(a, b);
chk('iguales: centavos de redondeo y el orden de las claves no cuentan', r.diferencias === 0, r.detalle);
b.v[0].cta = 'brubank'; r = c._ventasArmaComparar(a, b);
chk('otra cuenta se ve', r.diferencias === 1 && r.detalle.cta, r.detalle);
b.v.pop(); r = c._ventasArmaComparar(a, b);
chk('una venta que falta en la base se ve', !!r.detalle._solo_apps_script, r.detalle);
chk('el detalle no lleva nombres de clientes', JSON.stringify(r.detalle).indexOf('Ana') < 0 && JSON.stringify(r.detalle).indexOf('Edu') < 0, r.detalle);
console.log(ok + ' ok, ' + mal + ' mal');
