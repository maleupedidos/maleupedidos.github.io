/* LA BANDEJA DE RED NO DEVUELVE LO CONFIRMADO (2/11/2026).

   node _tools/pruebas/probar_rb_ops.js [archivo]      (_src/panel.src.html por defecto)

   Confirmar y Cambiar de representante van por Apps Script; la bandeja de la base las ve con la replica. `rbPintar`
   soltaba la op con la primera respuesta fresca y la fila volvia. Saca _rbOp, _rbOpFin y rbPintar tal cual:
   · una op `porApps` terminada NO se suelta con una respuesta fresca;
   · una op directa (sin `porApps`) se suelta como antes;
   · pasados 5 min se sueltan todas.
   Con el panel de antes la primera da MAL. */
'use strict';
const fs = require('fs'), path = require('path');
const ARCH = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', '_src', 'panel.src.html'));
const src = fs.readFileSync(ARCH, 'utf8');
function sacar(nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) return '';
  let j = src.indexOf('{', i), n = 0;
  for (; j < src.length; j++) { if (src[j] === '{') n++; else if (src[j] === '}' && --n === 0) break; }
  return src.slice(i, j + 1);
}
let ok = 0, mal = 0;
const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
let reloj = 1000000;
const m = new Function('reloj', `
  var Date = { now: function () { return reloj(); } };
  var _rbOps = [], _rbDatos = null, _rbInfo = null, _rbPidioEn = 0;
  function _rbDibujar() {} var fpPintar;
  ${sacar('_rbOp')}
  ${sacar('_rbOpFin')}
  ${sacar('rbPintar')}
  return { op: _rbOp, fin: _rbOpFin, pintar: rbPintar, pidio: function (t) { _rbPidioEn = t; }, n: function () { return _rbOps.length; } };
`)(() => reloj);
const a = m.op(function () {}); a.porApps = true;
const b = m.op(function () {});
m.fin(a); m.fin(b);
reloj += 2000; m.pidio(reloj);
m.pintar({ ok: true, pendientes: [] }, {});
chk('Confirmar (por Apps Script) sigue aplicada despues de una respuesta fresca', m.n() === 1, m.n());
chk('   y la directa se suelta como antes', m.n() === 1, m.n());
reloj += 301000;
m.pintar({ ok: true, pendientes: [] }, {});
chk('pasados 5 min se sueltan todas', m.n() === 0, m.n());
console.log('\n' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
