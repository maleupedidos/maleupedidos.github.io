/* Los pedidos «en vuelo» en los cruces del modo medir (26/10/2026, migracion 133).
     node _tools/probar_en_vuelo.js [ruta.html] [_src/panel.src.html]
   Ruta, COBROS y Pedidos dejan afuera los pedidos con una orden sin aplicar (o de los ultimos
   3 min) y los cuentan en `_en_vuelo`; sin la 133 (vuelo null) comparan todo, como antes.
   Datos inventados: el repo es publico. Con el ruta.html / panel de antes da rojo. */
const fs = require('fs'), vm = require('vm');
const RUTA = fs.readFileSync(process.argv[2] || 'ruta.html', 'utf8');
const PANEL = fs.readFileSync(process.argv[3] || '_src/panel.src.html', 'utf8');
const fn = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(i, j + 1); };
const c = { RUT_MEDIR_CANALES: ['Home', 'Pilar'] }; vm.createContext(c);
vm.runInContext(['_rutBaseNorm', '_rutVueloSet', '_rutMedirComparar', '_rutCobrosComparar'].map(n => fn(RUTA, n)).join('\n'), c);
vm.runInContext(fn(PANEL, '_pedArmaComparar') + ';' + fn(PANEL, '_ventasArmaComparar'), c);
let ok = 0, mal = 0; const chk = (t, x, d) => { x ? ok++ : mal++; console.log((x ? '  ok  ' : '  MAL ') + t + (x ? '' : '  -> ' + JSON.stringify(d))); };
const vu = { claves: ['Home|2101', 'Red|2102'], total: 3 };
// Ruta: el alta nueva esta en Apps Script y todavia no en la base
const ea = { e: [{ h: 'Home', id: 2001, $: 100 }, { h: 'Home', id: 2101, $: 11500 }] }, eb = { canales: ['Home'], e: [{ h: 'Home', id: 2001, $: 100 }] };
let r = c._rutMedirComparar(ea, eb, vu);
chk('Ruta: el pedido en vuelo no es diferencia', r.diferencias === 0 && r.detalle._en_vuelo && r.detalle._en_vuelo.n === 1, r);
r = c._rutMedirComparar(ea, eb, null);
chk('Ruta: sin la 133, se ve como antes (solo en Apps Script)', r.diferencias === 1 && !!r.detalle._solo_apps_script, r);
r = c._rutMedirComparar({ e: [{ h: 'Home', id: 2001, $: 100 }] }, { canales: ['Home'], e: [{ h: 'Home', id: 2001, $: 200 }] }, vu);
chk('Ruta: un pedido que NO esta en vuelo sigue contando', r.diferencias === 1, r);
// COBROS: la base ya lo cobro (va adelante)
const ca = { cobros: [{ h: 'Home', id: 2101, $: 11500 }, { h: 'Pilar', id: 2050, $: 900 }] }, cb = { cobros: [{ h: 'Pilar', id: 2050, $: 900 }] };
r = c._rutCobrosComparar(ca, cb, vu);
chk('COBROS: el cobrado en vuelo no es diferencia', r.diferencias === 0 && r.detalle._en_vuelo.n === 1, r);
chk('COBROS: sin la 133 se ve', c._rutCobrosComparar(ca, cb, null).diferencias === 1);
// Pedidos: la base ya lo cancelo (por clave hoja|fila; en vuelo por canal|N°)
const pa = { pedidos: [{ h: 'Red', r: 140, n: '2102', es: 'Pendiente', $: 11500, p: [] }, { h: 'Home', r: 5, n: '2001', es: 'Pendiente', $: 1, p: [] }] };
const pb = { pedidos: [{ h: 'Red', r: 140, n: '2102', es: 'Cancelado', $: 11500, p: [] }, { h: 'Home', r: 5, n: '2001', es: 'Pendiente', $: 1, p: [] }] };
r = c._pedArmaComparar(pa, pb, vu);
chk('Pedidos: el cancelado en vuelo no es diferencia', r.diferencias === 0 && r.detalle._en_vuelo.n === 1 && r.pedidos === 1, r);
chk('Pedidos: sin la 133 se ve (es)', c._pedArmaComparar(pa, pb, null).diferencias === 1);
// Ventas: la base ya tiene el cobro del alta nueva
const va = { v: [{ canal: 'Home', h: 'Home', n: '2101', cliente: 'X', fecha: '26/10', $: 11500 }, { canal: 'Home', h: 'Home', n: '2001', cliente: 'Y', fecha: '20/10', $: 1 }] };
const vb = { v: [{ canal: 'Home', h: 'Home', n: '2101', cliente: 'X', fecha: '26/10', $: 0 }, { canal: 'Home', h: 'Home', n: '2001', cliente: 'Y', fecha: '20/10', $: 1 }] };
r = c._ventasArmaComparar(va, vb, vu);
chk('Ventas: el pedido en vuelo no es diferencia', r.diferencias === 0 && r.detalle._en_vuelo.n === 1, r);
chk('Ventas: sin la 133 se ve', c._ventasArmaComparar(va, vb, null).diferencias === 1);
console.log(ok + ' ok, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
