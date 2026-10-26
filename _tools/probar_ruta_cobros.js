/* Ruta › COBROS desde la base (26/10/2026): la comparacion del modo medir (_rutCobrosComparar).
     node _tools/probar_ruta_cobros.js ruta.html <cobros_apps.json> <cobros_base.json>
   cobros_apps.json = la respuesta de action=cobrosPendientes; cobros_base.json = el payload de
   erp_screen_snapshot (screen = cobrosPendientes). Son datos de clientes: al scratchpad, nunca a
   este repo (es publico). El 26/10 16:35: 16 contra 16, cero diferencias. */
const fs = require('fs'), vm = require('vm');
const [, , HTML, A, B] = process.argv;
const src = fs.readFileSync(HTML, 'utf8');
const fn = n => { const i = src.indexOf('function ' + n + '('); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(i, j + 1); };
const c = {}; vm.createContext(c); vm.runInContext(fn('_rutBaseNorm') + '\n' + fn('_rutCobrosComparar'), c);
let ok = 0, mal = 0; const chk = (t, x, d) => { x ? ok++ : mal++; console.log((x ? '  ok  ' : '  MAL ') + t + (x ? '' : '  -> ' + JSON.stringify(d))); };
const a = JSON.parse(fs.readFileSync(A, 'utf8')), b = JSON.parse(fs.readFileSync(B, 'utf8'));
const r = c._rutCobrosComparar(a, b);
console.log('  REAL: Apps Script ' + a.cobros.length + ' · base ' + b.cobros.length + ' · ' + JSON.stringify(r));
const b2 = JSON.parse(JSON.stringify(a));
chk('igual consigo mismo: cero', c._rutCobrosComparar(a, b2).diferencias === 0);
b2.cobros[0]['$'] = 1;
chk('un monto distinto se ve', c._rutCobrosComparar(a, b2).diferencias === 1);
b2.cobros.pop();
chk('un cobro que falta en la base se ve', !!c._rutCobrosComparar(a, b2).detalle._solo_apps_script);
chk('el detalle dice que es COBROS y no lleva datos del cliente', r.detalle._pantalla.ej === 'cobros' && JSON.stringify(r.detalle).length < 2000);
console.log(ok + ' ok, ' + mal + ' mal');
