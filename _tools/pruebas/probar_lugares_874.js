/* (874, 26/11/2026) LOS DOS CALCULOS DE LUGARES DAN LO MISMO: `_lugares_saldos` (la base) y el motor del navegador
   (ca_motor.js ← `_lugaresCalcular_` de Code.js), con los datos REALES de la caja.

   Uso:  node _tools/pruebas/probar_lugares_874.js <datos_real.json> <fotos.json> [ca_motor.js]
     datos_real.json  {d: caja_resto_datos(), l: _lugares_saldos(NULL)} de la base, sin tocar nada
     fotos.json       [{lug, sb, mp, mov, guardados, caminos}, ...]: lo que cambió en cada paso de una prueba en seco
                      (las hojas Saldo Base y Movimientos Plata enteras, los egresos con lugar nuevo y los lugares)
   Para cada foto, el motor corre con los datos reales y esa foto encima, y se compara contra la base: caja fuerte,
   billeteras, sin guardar, lugares de guardado, En camino y total. Sale con 1 si algo no da.
   La foto 0 es la de antes (sin lugares nuevos) y prueba que la caja de siempre no cambió. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const [, , fReal, fFotos, fMotor] = process.argv;
const real = JSON.parse(fs.readFileSync(fReal, 'utf8'));
const fotos = JSON.parse(fs.readFileSync(fFotos, 'utf8'));
const motorSrc = fs.readFileSync(fMotor || path.join(__dirname, '..', '..', 'ca_motor.js'), 'utf8');

function motor(datos) {
  /* El mismo cargador que probar_caja_motor_nativos.mjs. */
  const ctx = { console, JSON, Math, Number, String, Object, Array, Date, RegExp, Error, isNaN, isFinite, parseInt, parseFloat,
    encodeURIComponent, decodeURIComponent, Intl, Symbol, Map, Set };
  ctx.G = ctx; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(motorSrc, ctx);
  const M = ctx.CA_MOTOR;
  if (!M) throw new Error('el motor no publicó CA_MOTOR');
  return M.armar(datos, {});
}
const n = (x) => Math.round((Number(x) || 0) * 100) / 100;
let mal = 0, mirados = 0;
fotos.forEach(function (f, i) {
  const d = JSON.parse(JSON.stringify(real.d));
  d.hojas['Saldo Base'] = f.sb; d.hojas['Movimientos Plata'] = f.mp;
  /* Los egresos con lugar nuevo: se agregan con una fila que no choque. */
  let top = 0; d.mov.forEach((x) => { if (x[0] === 'Egresos' && x[1] > top) top = x[1]; });
  (f.mov || []).forEach((x) => { if (!d.mov.some((y) => y[0] === x[0] && y[1] === x[1])) d.mov.push(x); });
  if (f.guardados) d.guardados = f.guardados;
  if (f.caminos) d.caminos = f.caminos;
  const o = motor(d), Lm = o.lugares || {}, Lb = f.lug;
  if (!Lm.activo) { console.log('foto ' + i + ': el motor no armó los lugares', Lm.error || ''); mal++; return; }
  const pares = [['cf', Lm.cf, Lb.cf], ['total', Lm.total, Lb.total], ['descuadre', Lm.descuadre, 0]];
  Object.keys(Lb.bil || {}).forEach((p) => pares.push(['bil:' + p, (Lm.bil || {})[p], Lb.bil[p]]));
  Object.keys(Lb.cob || {}).forEach((p) => pares.push(['cob:' + p, (Lm.cob || {})[p], Lb.cob[p]]));
  Object.keys(Lb.g || {}).forEach((k) => pares.push(['g:' + k, (Lm.g || {})[k], Lb.g[k]]));
  Object.keys(Lm.g || {}).forEach((k) => { if (!(k in (Lb.g || {}))) pares.push(['g:' + k + ' (solo motor)', Lm.g[k], 0]); });
  const camB = {}, camM = {};
  (Lb.caminos || []).forEach((c) => { camB[c.id] = c.saldo; });
  (Lm.caminos || []).forEach((c) => { camM[c.id] = c.saldo; });
  Object.keys(Object.assign({}, camB, camM)).forEach((k) => pares.push(['camino:' + k, camM[k], camB[k]]));
  const malos = pares.filter((p) => Math.abs(n(p[1]) - n(p[2])) > 0.005);
  mirados += pares.length;
  console.log('foto ' + i + ': ' + pares.length + ' lugares · cf ' + n(Lm.cf) + ' · total ' + n(Lm.total)
    + ' · g ' + JSON.stringify(Lm.g || {}) + ' · caminos ' + JSON.stringify(camM) + (malos.length ? '  MAL: ' + JSON.stringify(malos) : '  OK'));
  if (malos.length) mal++;
});
console.log(mal ? (mal + ' foto(s) MAL') : ('OK: ' + fotos.length + ' fotos, ' + mirados + ' comparaciones'));
process.exit(mal ? 1 : 0);
