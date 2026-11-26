/* Las cuatro fotos simples del CRM armadas en la base (26/10/2026, 149): la comparacion del modo medir.
     node _tools/probar_crm_arma.js _src/panel.src.html [<fotos.json> <base.json>]
   fotos.json / base.json = {crmInteracciones, crmLotes, crmPuntos, crmZonas}: el payload de cada
   foto y la respuesta de crm_foto_pantalla. Datos de clientes: al scratchpad, nunca a este repo. */
const fs = require('fs'), vm = require('vm');
const [, , HTML, A, B] = process.argv;
const src = fs.readFileSync(HTML, 'utf8');
const blk = (ini, fin) => { const i = src.indexOf(ini), j = src.indexOf(fin, i); return src.slice(i, j); };
const c = {}; vm.createContext(c);
vm.runInContext(blk('  var CRM_ARMA_PANT =', '  var _crmArmaM') + '\n' + blk('  function _crmArmaComparar(', '  function _crmArmaMedir(') + '\nthis.f=_crmArmaComparar;', c);
let ok = 0, mal = 0; const chk = (t, x, d) => { x ? ok++ : mal++; console.log((x ? '  ok  ' : '  MAL ') + t + (x ? '' : '  -> ' + JSON.stringify(d))); };
if (A && B) {
  const a = JSON.parse(fs.readFileSync(A, 'utf8')), b = JSON.parse(fs.readFileSync(B, 'utf8'));
  Object.keys(a).forEach(s => { const r = c.f(s, a[s], b[s]); console.log('  REAL ' + s + ': ' + r.pedidos + ' · ' + r.diferencias + ' diferencias · ' + JSON.stringify(r.detalle)); });
}
const a = { lotes: [{ sub: 'El Recuerdo', lote: '42', familia: 'Del Piano', composicion: { tipo: 'familia', n: 2 }, tel: '' }] };
const b = { lotes: [{ sub: 'El Recuerdo', lote: '42', familia: 'Del Piano', composicion: { n: 2, tipo: 'familia' }, tel: null }] };
chk('iguales: el orden de las claves y vacío = falta no cuentan', c.f('crmLotes', a, b).diferencias === 0, c.f('crmLotes', a, b));
b.lotes[0].familia = 'Otra';
chk('otra familia se ve', c.f('crmLotes', a, b).detalle.familia, c.f('crmLotes', a, b));
const r = c.f('crmLotes', a, { lotes: [] });
chk('un lote que falta se ve, sin nombres en el detalle', r.detalle._solo_apps_script && JSON.stringify(r.detalle).indexOf('Del Piano') < 0, r.detalle);
console.log(ok + ' ok, ' + mal + ' mal');
