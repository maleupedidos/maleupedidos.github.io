/* Ruta › depositos desde la base (26/10/2026, 143): la comparacion del modo medir (_rutDepComparar).
     node _tools/probar_ruta_depositos.js ruta.html <dep_apps.json> <dep_base.json>
   dep_apps.json = la respuesta de action=depositos; dep_base.json = la de rpc/depositos_pantalla
   (o depositos_base() en la prueba PGlite de la 143). Es stock, no clientes, pero igual al
   scratchpad. El 26/10 18:00: 44 productos contra 44, cero diferencias. */
const fs = require('fs'), vm = require('vm');
const [, , HTML, A, B] = process.argv;
const src = fs.readFileSync(HTML, 'utf8');
const fn = n => { const i = src.indexOf('function ' + n + '('); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(i, j + 1); };
const c = {}; vm.createContext(c); vm.runInContext(fn('_rutBaseNorm') + '\n' + fn('_rutDepComparar'), c);
let ok = 0, mal = 0; const chk = (t, x, d) => { x ? ok++ : mal++; console.log((x ? '  ok  ' : '  MAL ') + t + (x ? '' : '  -> ' + JSON.stringify(d))); };
const a = JSON.parse(fs.readFileSync(A, 'utf8')), b = JSON.parse(fs.readFileSync(B, 'utf8'));
const r = c._rutDepComparar(a, b);
console.log('  REAL: Apps Script ' + a.productos.length + ' · base ' + b.productos.length + ' · ' + JSON.stringify(r));
chk('datos reales: cero diferencias (col no cuenta, el orden de claves tampoco)', r.diferencias === 0, r.detalle);
const b2 = JSON.parse(JSON.stringify(b));
const pr = b2.productos.find(p => Object.keys(p.porDep).length > 1);
pr.porDep[Object.keys(pr.porDep)[0]] += 1;
chk('un stock por deposito distinto se ve', c._rutDepComparar(a, b2).detalle.porDep && c._rutDepComparar(a, b2).diferencias === 1);
b2.productos.pop();
chk('un producto que falta en la base se ve', !!c._rutDepComparar(a, b2).detalle._solo_apps_script);
b2.deps[0].dueno = 'Otro';
chk('un deposito distinto se ve', !!c._rutDepComparar(a, b2).detalle['deps.dueno']);
chk('el detalle dice que es depositos', r.detalle._pantalla.ej === 'depositos');
console.log(ok + ' ok, ' + mal + ' mal');
