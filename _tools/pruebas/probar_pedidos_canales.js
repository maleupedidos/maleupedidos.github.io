/* LA TAB PEDIDOS PIDE SUS CANALES, NO LA TABLA ENTERA (29/9/2026).

     node probar_pedidos_canales.js

   Desde hoy `sales_order` tambien guarda B2B y Catering. Son ventas —entran
   porque `ventas`, la accion que alimenta Inicio, las necesita para el total
   de Maleu— pero NO son pedidos operativos: no se arman, no se reparten y no
   se cobran en la ruta.

   Sin filtro se colaban en la lista: `_sbPedidosAhora` pide las 400 filas mas
   recientes por `ordered_at`, y el evento de Catering del 25/9 cae adentro.
   Peor que verlas de mas: `pedidosLight` NO las trae, asi que la lista de
   Google y la de Supabase dirian cosas distintas y `_sbFusionar` mezclaria las
   dos listas como si fueran la misma.

   Esto se encontro leyendo el codigo antes de publicar, no en produccion. El
   test existe para que no vuelva: el contrato "que canales son un pedido"
   estaba IMPLICITO —"todo lo que haya en la tabla"— y un contrato implicito es
   exactamente lo que se rompe cuando alguien agrega una fila nueva.

   Contra el app.html anterior tiene que dar ROJOS. */
'use strict';
const fs = require('fs');
const path = require('path');

const APP = process.env.APP || path.join(__dirname, '..', '..', 'app.html');
const src = fs.readFileSync(APP, 'utf8');
let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 220) : '')); }
};

console.log('\n== La tab Pedidos pide SUS canales ==\n');

const m = /_SB_CANALES_PEDIDO\s*=\s*'([^']*)'/.exec(src);
chk('existe la lista de canales que son un pedido', !!m);

if (m) {
  const canales = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  chk('   son los cuatro operativos, y sólo esos',
    canales.length === 4 &&
    ['Home', 'Pilar', 'Clubes', 'Red'].every((c) => canales.indexOf(c) >= 0), canales);
  chk('   y NO incluye B2B ni Catering, que son ventas pero no pedidos',
    canales.indexOf('B2B') < 0 && canales.indexOf('Catering') < 0, canales);
}

/* El filtro tiene que ir en la MISMA consulta que trae los pedidos. Tenerlo
   declarado y no usarlo seria igual de roto que no tenerlo, y se veria igual
   de bien leyendo el archivo por arriba. */
const i = src.indexOf('function _sbPedidosAhora(');
chk('existe _sbPedidosAhora', i > 0);
if (i > 0) {
  let n = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) {
    if (src[k] === '{') n++;
    else if (src[k] === '}') { n--; if (n === 0) break; }
  }
  const cuerpo = src.slice(i, k + 1);
  chk('la consulta de pedidos filtra por canal',
    /channel=in\.\('\+_SB_CANALES_PEDIDO\+'\)/.test(cuerpo.replace(/\s/g, '')), {});
  chk('   sobre sales_order y no sobre otra tabla',
    cuerpo.indexOf('/rest/v1/sales_order?select=') > 0);
  chk('   sin tocar el orden ni el tope que ya tenía',
    cuerpo.indexOf('order=ordered_at.desc') > 0 && cuerpo.indexOf('limit=') > 0);
}

/* El atajo de las OCs lee `purchase_order_line`, que es otra tabla y no tiene
   canales de venta adentro: si alguien le copiara este filtro, se quedaria sin
   ordenes de compra. Queda anotado para que nadie lo "empareje". */
const j = src.indexOf('function _sbOCs(');
if (j > 0) {
  const cuerpoOC = src.slice(j, j + 900);
  chk('las OCs NO llevan este filtro: son otra tabla',
    cuerpoOC.indexOf('_SB_CANALES_PEDIDO') < 0);
}

console.log('\n' + ok + ' ok, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
