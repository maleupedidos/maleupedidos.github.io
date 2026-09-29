/* LAS OCs DEJAN DE FRENAR LA TAB PEDIDOS (29/9/2026).

     node probar_oc_supabase.js

   La tab Pedidos tenia 6,5 s de piso: `pedidosLight` 3,5 s MAS `ocLight` 3,0 s,
   porque el boton "Actualizar pedidos" colgaba de un `Promise.all` con las dos
   adentro. Y las ordenes de compra ya estaban en Supabase desde la migracion
   015 (979 filas) sin que nadie las leyera.

   Lo que tiene que ser cierto:
   · existe el atajo y pide SOLO las 7 columnas del contrato de `ocLight`
     (`total_cost` esta fuera del permiso del navegador a proposito);
   · las filas sin canal o sin pedido se descartan, igual que en `ocLight`;
   · `ocLight` YA NO esta en el Promise.all que libera el boton;
   · Google le GANA a Supabase, y si Google ya llego el adelanto no repinta
     (seria volver a una foto mas vieja);
   · y `_ocFrescas` —la bandera que habilita el aviso "OC sin generar"— NO se
     enciende con una copia de Supabase que pueda estar atrasada. Un aviso
     falso ahi termina en una orden de compra DUPLICADA al proveedor.

   Se mide sobre el texto compilado y sobre el comportamiento de las funciones
   en un navegador. Contra el app.html anterior tiene que dar ROJOS. */
'use strict';
const fs = require('fs');
const path = require('path');

const APP = process.env.APP ||
  path.join(__dirname, '..', '..', 'app.html');
const src = fs.readFileSync(APP, 'utf8');
let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 220) : '')); }
};

/* El cuerpo de una funcion del bundle, por llaves balanceadas. */
function cuerpo(nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) return null;
  let n = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) {
    if (src[k] === '{') n++;
    else if (src[k] === '}') { n--; if (n === 0) break; }
  }
  return src.slice(i, k + 1);
}

console.log('\n== Las OCs por el atajo ==\n');

const sb = cuerpo('_sbOCs');
chk('existe el atajo _sbOCs', !!sb);

if (sb) {
  const COLS = ['channel', 'source_order_number', 'customer_name',
                'product_abbr', 'quantity', 'supplier', 'state'];
  chk('pide las 7 columnas del contrato de ocLight',
    COLS.every(c => sb.includes(c)), { faltan: COLS.filter(c => !sb.includes(c)) });
  chk('   contra la tabla purchase_order_line', sb.includes('purchase_order_line'));
  chk('   y NO pide total_cost, que el navegador no puede ver',
    !sb.includes('total_cost') && !sb.includes('unit_cost'));
  chk('descarta las filas sin canal o sin pedido, igual que ocLight',
    /if\(!canal\|\|!pedido\)continue/.test(sb.replace(/\s/g, '')), {});
  chk('arma las claves que el front espera (canal, pedido, abbr, estado)',
    ['canal:', 'pedido:', 'abbr:', 'estado:', 'proveedor:'].every(k => sb.includes(k)));
  chk('un fallo devuelve null y no rompe: el atajo se apaga solo',
    /catch\(function\(\)\{\s*return null;?\s*\}\)/.test(sb), {});
}

console.log('\n-- el boton ya no espera a las OCs --');
const all = src.indexOf('var _rapido=Promise.all([');
chk('existe el Promise.all que libera el boton', all > 0);
if (all > 0) {
  const bloque = src.slice(all, all + 400);
  chk('ocLight YA NO esta adentro', !/_L\.ocLight/.test(bloque), { bloque: bloque.slice(0, 200) });
  chk('   pero los pedidos SI siguen adentro', bloque.includes('_pedPromesa'));
  chk('   y la caja tambien', bloque.includes('cajaLight'));
}
chk('ocLight se sigue PIDIENDO en el mismo lote', /_accs\.push\('ocLight'\)/.test(src));

console.log('\n-- quien gana y quien adelanta --');
const pinta = src.indexOf('var _ocPinta=');
chk('existe _ocPinta', pinta > 0);
if (pinta > 0) {
  const b = src.slice(pinta - 900, pinta + 1400);
  chk('Google marca que llego (_ocDeGoogle)', /_ocDeGoogle=true/.test(b));
  chk('y el adelanto de Supabase NO repinta si Google ya llego',
    /!_ocDeGoogle/.test(b), {});
  chk('_ocFrescas se enciende con Google SIEMPRE',
    /deGoogle\|\|/.test(b.replace(/\s/g, '')), {});
  chk('   y con Supabase SOLO si la copia es confiable (_sbPuedePisar)',
    /_sbPuedePisar\(\)/.test(b), {});
}

console.log('\n' + ok + ' ok, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
