/* EL CHECKOUT DE LA TIENDA REAL (4/11/2026, pedido del Organizador). De 15:25 a 16:55 de ese día la base rechazó toda
   alta de maleu.com.ar (un permiso de un disparador nuevo) y ningún control lo vio: el robot prueba el ERP, no la
   tienda. Esto abre maleu.com.ar de verdad y manda un pedido PRUEBA por el mismo camino que un cliente
   (`_postPedidoBase` → `pedido_alta_directo` con la clave anónima).

   node _tools/robot/tienda_checkout.js
   Sale con 1 si la base no lo toma o si la tienda tira un error de JavaScript. El pedido es del robot (cliente y
   teléfono PRUEBA, id «robot-<corrida>-tienda»): la base lo deja fuera de los totales y robot_limpiar lo borra. */
'use strict';
const cdp = require('../pruebas/cdp.js');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ahora = new Date(), dos = (n) => String(n).padStart(2, '0');
const CORRIDA = process.env.ROBOT_CORRIDA || ('t' + ahora.getUTCFullYear() + dos(ahora.getUTCMonth() + 1) + dos(ahora.getUTCDate()) + '-' + dos(ahora.getUTCHours()) + dos(ahora.getUTCMinutes()) + dos(ahora.getUTCSeconds()));
(async () => {
  const cli = await cdp.abrir();
  const errores = [];
  await cli.enviar('Runtime.enable', {});
  cli.escuchar((m, p) => { if (m === 'Runtime.exceptionThrown') errores.push(String((p.exceptionDetails && ((p.exceptionDetails.exception && p.exceptionDetails.exception.description) || p.exceptionDetails.text)) || '?').slice(0, 200)); });
  /* Analytics y Meta no: cada corrida sumaría visitas falsas a las métricas reales. */
  await cli.enviar('Network.enable', {});
  await cli.enviar('Network.setBlockedURLs', { urls: ['*googletagmanager*', '*google-analytics*', '*facebook*'] });
  await cli.enviar('Page.enable', {});
  const t0 = Date.now();
  await cli.enviar('Page.navigate', { url: 'https://maleu.com.ar/' });
  let listo = false;
  for (let i = 0; i < 40 && !listo; i++) {
    await pausa(1000);
    listo = await cdp.evaluar(cli, `typeof _postPedidoBase==='function'&&typeof _altaBaseVa==='function'&&_altaBaseVa()`).catch(() => false);
  }
  if (!listo) { console.log('MAL  la tienda no cargó en 40 s'); cli.matar(); process.exit(1); }
  const r = JSON.parse(await cdp.evaluar(cli, `(async function(){
    var hoy=new Date(), ent=new Date(hoy.getTime()+2*86400000).toISOString().slice(0,10);
    var data={ canal:'Pilar', fecha:hoy.toLocaleString('es-AR'), fechaEntrega:ent, dia:'', horario:'', nombre:'PRUEBA Robot', telefono:'5490000000001',
      pago:'Transferencia', envio:0, items:[{id:46,qty:1}], repartidor:'', total:1000, subtotalSinDescuento:1000, descuento:0, descuentoManual:0,
      descuentoGlobalPct:0, descuentoReceta:null, propina:0, tipoPedido:'', barrio:'PRUEBA', direccion:'PRUEBA', lote:'', mail:'',
      clientOrderId:${JSON.stringify('robot-' + CORRIDA + '-tienda')} };
    var t=Date.now(); var d=await _postPedidoBase(data);
    return JSON.stringify({ms:Date.now()-t, d:d, noDirecto:data._noDirecto||null}); })()`));
  const bien = !!(r.d && r.d.ok && r.d.directo && r.d.n);
  console.log((bien ? 'ok   ' : 'MAL  ') + 'checkout PRUEBA en maleu.com.ar · ' + (bien ? r.d.ref + ' en ' + r.ms + ' ms' : 'la base no lo tomó: ' + (r.noDirecto || JSON.stringify(r.d))) + ' · carga ' + (Date.now() - t0) + ' ms');
  if (errores.length) console.log('MAL  errores de JavaScript en la tienda: ' + errores.slice(0, 3).join(' | '));
  cli.matar();
  process.exit(bien && !errores.length ? 0 : 1);
})().catch((e) => { console.log('MAL  reventó: ' + (e && e.message)); process.exit(1); });
