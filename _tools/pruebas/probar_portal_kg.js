/* El portal del vendedor muestra la carne en KILOS (4/10/2026).

   node _tools/pruebas/probar_portal_kg.js [ruta/al/red.html]

   POR QUE EXISTE. El primer pedido de Fede (#112) eran 14,9 kg de Colita y
   27,42 kg de Vacio. El backend no mandaba la carne y, cuando la manda, el
   portal la mostraba como "CCo x14.9": sin nombre y con kilos como unidades.
   Ademas el editor del pedido no conoce la carne: guardar una edicion la
   habria sacado del pedido y del total sin avisar, asi que se bloquea.

   Corre sin navegador: saca las piezas del archivo y las evalua. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ARCHIVO = process.argv[2] || path.join(__dirname, '..', '..', 'red.html');
const SRC = fs.readFileSync(ARCHIVO, 'utf8').replace(/\r\n/g, '\n');
let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); }
};

function bloque(desde, hasta) {
  const i = SRC.indexOf(desde);
  if (i < 0) return null;
  const j = SRC.indexOf(hasta, i);
  return j < 0 ? null : SRC.slice(i, j + hasta.length);
}
const nombres = bloque('const PROD_NAME_BY_ABBR = {', '\n};');
const kg = bloque('const RED_CARNE_KG', '\n}\n');
const editar = bloque('function rutaEditar() {', 'editPedidoRef = p;');

chk('encuentro las tres piezas en red.html', !!(nombres && kg && editar), { nombres: !!nombres, kg: !!kg, editar: !!editar });
if (!(nombres && kg && editar)) { console.log('\n' + ok + ' ok, ' + mal + ' mal'); process.exit(1); }

const caja = { toasts: [], actual: null };
vm.createContext(caja);
vm.runInContext(nombres.replace('const ', 'var ') + '\n' +
  kg.replace('const RED_CARNE_KG', 'var RED_CARNE_KG') + '\n' +
  "function redToast(t){ toasts.push(t); }\nfunction _rutaCurrent(){ return actual; }\n" +
  editar + ' return "abrio"; }', caja);

console.log('\n== Nombres y cantidades ==');
chk('la carne tiene nombre (CCo -> Carne Colita de Cuadril)', caja.PROD_NAME_BY_ABBR.CCo === 'Carne Colita de Cuadril');
chk('las cinco carnes tienen nombre', ['CCo', 'CEn', 'CLo', 'CPi', 'CVa'].every((a) => !!caja.PROD_NAME_BY_ABBR[a]));
const kgCo = caja.redCantProd({ a: 'CCo', q: 14.9 });
chk('14,9 kg se muestra "14,9 kg"', kgCo === '14,9 kg', kgCo);
const kgVa = caja.redCantProd({ a: 'CVa', q: 27.42 });
chk('27,42 kg se muestra "27,42 kg"', kgVa === '27,42 kg', kgVa);
chk('lo que no es carne sigue en unidades ("x2")', caja.redCantProd({ a: 'PPM', q: 2 }) === 'x2');
chk('los dos lugares que muestran productos usan redCantProd',
  (SRC.match(/' \+ redCantProd\(pr\) \+ '/g) || []).length === 2);

console.log('\n== El editor no toca un pedido con carne ==');
caja.actual = { es: 'Pendiente', ep: 'No Cobrado', prods: [{ a: 'PPM', q: 2 }, { a: 'CVa', q: 27.42 }] };
const r1 = caja.rutaEditar();
chk('con carne: no abre el editor', r1 !== 'abrio', r1);
chk('y dice por que', /carne/i.test(caja.toasts[caja.toasts.length - 1] || ''), caja.toasts);
caja.actual = { es: 'Pendiente', ep: 'No Cobrado', prods: [{ a: 'PPM', q: 2 }] };
chk('sin carne: abre como siempre', caja.rutaEditar() === 'abrio');

console.log('\n' + ok + ' ok, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
