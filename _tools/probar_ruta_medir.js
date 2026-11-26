/* Ruta desde la base, modo medir (26/10/2026): la comparacion que hace el celular (_rutMedirComparar en ruta.html).
     node _tools/probar_ruta_medir.js ruta.html <entregas.json> <ruta_base.json>
   entregas.json = la respuesta de action=entregas; ruta_base.json = la de ruta_entregas_base (rpc).
   Son datos de clientes: van al scratchpad, nunca a este repo (es publico). */
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(process.argv[2], 'utf8');
const fn = n => { const i = src.indexOf('function ' + n + '('); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(i, j + 1); };
const c = {}; vm.createContext(c);
vm.runInContext("var RUT_MEDIR_CANALES=['Home','Pilar'];\n" + fn('_rutBaseNorm') + '\n' + fn('_rutMedirComparar'), c);
const a = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), b = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
let ok = 0, mal = 0; const chk = (t, x, d) => { x ? ok++ : mal++; console.log((x ? '  ok  ' : '  MAL ') + t + (x ? '' : '  -> ' + JSON.stringify(d))); };
const r = c._rutMedirComparar(a, b);
console.log('  REAL:', JSON.stringify(r));
chk('con los datos reales ve los 5 campos que faltan, y solo esos', r.entregas === 1 && Object.keys(r.detalle).sort().join(',') === 'desc,env,oD,sAp,sub', r);
const b2 = JSON.parse(JSON.stringify(b)); Object.assign(b2.hechas[0], { sub: 18000, env: 0, desc: 0, sAp: 0, oD: { ECyQ: 'D' } });
chk('con los cinco cargados: cero diferencias', c._rutMedirComparar(a, b2).diferencias === 0, c._rutMedirComparar(a, b2));
b2.hechas[0].$ = 1;
chk('un importe distinto se ve', c._rutMedirComparar(a, b2).detalle['$'].n === 1);
b2.hechas = [];
chk('un pedido que falta en la base se ve', c._rutMedirComparar(a, b2).detalle._solo_apps_script.n === 1);
chk('en el detalle va la clave, no el valor', JSON.stringify(r.detalle).indexOf('achaval') < 0 && /Pilar#2094/.test(JSON.stringify(r.detalle)));
console.log(ok + ' ok, ' + mal + ' mal');
