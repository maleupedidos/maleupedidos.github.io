/* La foto de pedidos armada en la base (26/10/2026, 145): la comparacion del modo medir.
     node _tools/probar_pedidos_arma.js _src/panel.src.html [<light_apps.json> <light_base.json>]
   light_apps.json = pedidosLight (de Apps Script, o el `payload` de la foto `pedidos`);
   light_base.json = la respuesta de rpc/pedidos_light_pantalla (o pedidos_light_base() en la
   prueba PGlite de la 145). Son datos de clientes: al scratchpad, nunca a este repo (es
   publico). Sin archivos, solo las reglas con pedidos armados. */
const fs = require('fs'), vm = require('vm');
const [, , HTML, A, B] = process.argv;
const src = fs.readFileSync(HTML, 'utf8');
const fn = n => { const i = src.indexOf('function ' + n + '('); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(i, j + 1); };
const c = {}; vm.createContext(c); vm.runInContext(fn('_pedArmaComparar'), c);
let ok = 0, mal = 0; const chk = (t, x, d) => { x ? ok++ : mal++; console.log((x ? '  ok  ' : '  MAL ') + t + (x ? '' : '  -> ' + JSON.stringify(d))); };
if (A && B) {
  const a = JSON.parse(fs.readFileSync(A, 'utf8')), b = JSON.parse(fs.readFileSync(B, 'utf8'));
  const r = c._pedArmaComparar(a, b);
  console.log('  REAL: Apps Script ' + a.pedidos.length + ' · base ' + b.pedidos.length + ' · ' + r.diferencias + ' diferencias · ' + JSON.stringify(r.detalle));
}
const P = (o) => Object.assign({ n: '2093', h: 'Red', r: 137, c: 'Emilia (Red: Fini)', $: 76000, p: [{ a: 'PMu', q: 1 }, { a: 'CVa', q: 2.034 }], fc: '', es: 'Pendiente' }, o);
const a = { pedidos: [P(), P({ h: 'Home', r: 5, n: '2001' }), P({ h: 'Pilar', r: 118, n: '-', es: 'Cancelado', pas: 'Pasado a Red #2017 (Fini)' })] };
const b = { pedidos: [P({ p: [{ a: 'CVa', q: 2.034 }, { a: 'PMu', q: 1 }], $: 76000.004 }), P({ h: 'Home', r: 5, n: '2001', fc: undefined })] };
let r = c._pedArmaComparar(a, b);
chk('iguales: productos en otro orden, centavos de redondeo y vacío = falta', r.diferencias === 0, r);
chk('la fila «Pasado a Red» se cuenta aparte, sin sumar diferencias', r.detalle._pasados_a_red && r.detalle._pasados_a_red.n === 1, r.detalle);
b.pedidos[0].$ = 75000; r = c._pedArmaComparar(a, b);
chk('un monto distinto se ve', r.diferencias === 1 && r.detalle.$, r.detalle);
b.pedidos[0].$ = 76000; b.pedidos[0].p = [{ a: 'PMu', q: 2 }, { a: 'CVa', q: 2.034 }]; r = c._pedArmaComparar(a, b);
chk('una cantidad distinta se ve', r.diferencias === 1 && r.detalle.p, r.detalle);
b.pedidos.pop(); r = c._pedArmaComparar(a, b);
chk('un pedido que falta en la base se ve', !!r.detalle._solo_apps_script, r.detalle);
b.pedidos.push(P({ h: 'Home', r: 9, n: '2009' })); r = c._pedArmaComparar(a, b);
chk('uno que está solo en la base se ve', !!r.detalle._solo_base, r.detalle);
chk('el detalle no lleva datos del cliente', JSON.stringify(r.detalle).indexOf('Emilia') < 0);
console.log(ok + ' ok, ' + mal + ' mal');
