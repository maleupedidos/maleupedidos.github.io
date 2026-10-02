/**
 * probar_sello_no_retrocede.js — el adelanto de Supabase no vuelve atrás lo
 * que ya se ve, ni el sello. (2/10/2026)
 *
 * Tadeo: *"una tab dice recién y otra hoy 15:28, aunque actualicé hace 2 min"*.
 * Con la réplica parada (cupo de urlfetch agotado) `sales_order` tiene filas de
 * hace horas, y el adelanto que sale con cada ↻ las fusionaba encima de la
 * lista que Google había traído un minuto antes: el pedido volvía a
 * "No Cobrado" y el sello retrocedía a la edad de la base.
 *
 *   APP=app_viejo_tmp.html node probar_sello_no_retrocede.js   <- la contraria
 *   node probar_sello_no_retrocede.js                          (con `npm run dev`)
 */
const { abrir, evaluar } = require('./cdp.js');
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d ? '\n         ' + JSON.stringify(d) : '')); } };

const caso = (filaHaceMin) => `(async function(){
  var ahora=Date.now();
  D={pedidos:[{h:'Home',n:'900001',c:'Prueba',ep:'Cobrado',es:'Entregado',$:1000,r:2}]};
  _sbCambioLocal=0; if(typeof _sbCambiosPed==='object')_sbCambiosPed={};
  _marcarFresco(['pedidos'], ahora - 60000);          /* Google trajo hace 1 min */
  var fila={h:'Home',n:'900001',c:'Prueba',ep:'No Cobrado',es:'Pendiente',$:1000,r:2,
            _ts:new Date(ahora-${filaHaceMin}*60000).toISOString()};
  _sbPedidos=function(){ return Promise.resolve([fila]); };
  var pinto=await _sbRefrescoPedidos({llego:false});
  return JSON.stringify({pinto:pinto, ep:D.pedidos[0].ep,
    selloMin:Math.round((Date.now()-_frescoTs('pedidos'))/60000)});
})()`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    console.log('\n== El adelanto de Supabase no vuelve atrás · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/' + APP + '?prueba=1' });
    for (let i = 0; i < 300; i++) { if (await evaluar(cli, "typeof _sbRefrescoPedidos==='function'")) break; await new Promise(r => setTimeout(r, 100)); }
    await new Promise(r => setTimeout(r, 1500));

    const v = JSON.parse(await evaluar(cli, caso(95)));
    console.log('   fila de hace 95 min sobre una lista de hace 1: ' + JSON.stringify(v));
    chk('la fila vieja NO vuelve el pedido a "No Cobrado"', v.ep === 'Cobrado', v);
    chk('   y el sello no retrocede (sigue en ~1 min)', v.selloMin <= 2, v);

    const n = JSON.parse(await evaluar(cli, caso(0.2)));
    console.log('   fila de hace 12 s sobre una lista de hace 1 min: ' + JSON.stringify(n));
    chk('una fila MAS NUEVA sí pisa (el freno no es un candado)', n.pinto === true && n.ep === 'No Cobrado', n);
    chk('   y el sello avanza a su hora', n.selloMin === 0, n);
  } catch (e) { mal++; console.log('  EXPLOTO ' + (e && e.message)); }
  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
