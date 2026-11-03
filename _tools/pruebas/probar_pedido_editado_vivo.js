/* LO EDITADO EN UN PEDIDO NO SE PIERDE CON LA LISTA SIGUIENTE (2/11/2026).

   BASE_URL=http://localhost:8157/app.html node _tools/pruebas/probar_pedido_editado_vivo.js <token>

   La devolucion, el pesaje, el telefono o la edicion con piezas van por Apps Script y pintan con `_patchPedidoLocal`
   despues del OK. La lista de la base los ve con la replica, y `_volcarLight` reemplazaba D.pedidos entero. Aca: a un
   pedido real se le cambia el total en pantalla con `_patchPedidoLocal` (lo que hace la devolucion; no se manda nada),
   y se corre la recarga de pedidos DE VERDAD (`_recargarPedidos`). El cambio tiene que seguir; un pedido que no se toco
   tiene que quedar como lo trae la base. Con el panel de antes, la recarga lo borraba. 390 px. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], URL = process.env.BASE_URL || 'http://localhost:8157/app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const cli = await cdp.abrir();
  let ok = 0, mal = 0;
  const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 90; i++) { await pausa(1000); if (await cdp.evaluar(cli, 'typeof go==="function"&&!!(window.D&&D.pedidos&&D.pedidos.length>50)')) break; }
    await cdp.evaluar(cli, 'go("pedidos")');
    await pausa(2000);
    const a = await cdp.evaluar(cli, `(function(){
      var ps=D.pedidos.filter(function(p){return p&&p.h==='Home'&&p.n&&p.n!=='-'&&typeof p.$==='number';});
      var p=ps[0], q=ps[1]; if(!p||!q)return {sin:true};
      window.__prueba={h:p.h,n:p.n,$:p.$,otro:{h:q.h,n:q.n,$:q.$}};
      _patchPedidoLocal(p.h,p.n,{$:p.$+11,_prueba:1});
      return window.__prueba;
    })()`);
    if (a.sin) throw new Error('sin pedidos de Home');
    const r = await cdp.evaluar(cli, `_recargarPedidos().then(function(x){
      var P=window.__prueba, p=D.pedidos.filter(function(z){return z.h===P.h&&String(z.n)===String(P.n);})[0],
          q=D.pedidos.filter(function(z){return z.h===P.otro.h&&String(z.n)===String(P.otro.n);})[0];
      return {r:x, $:p&&p.$, marca:p&&p._prueba, otro:q&&q.$, otroAntes:P.otro.$, fuente:window.__pedidosFuente||null};
    })`);
    chk('el pedido editado (' + a.h + ' #' + a.n + ') sigue con su cambio despues de la recarga', r.$ === a.$ + 11 && r.marca === 1, r);
    chk('   y uno que no se toco queda como lo trae la base', r.otro === r.otroAntes, r);
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores en la consola', !err.length, err.slice(0, 5));
  } catch (e) { chk('la prueba corrio', false, String(e.message)); }
  finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
