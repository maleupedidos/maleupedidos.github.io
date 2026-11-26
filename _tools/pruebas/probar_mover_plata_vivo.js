/* MOVER PLATA SE VE AL INSTANTE Y SOBREVIVE A ACTUALIZAR (2/11/2026).

   BASE_URL=http://localhost:8157/app.html node _tools/pruebas/probar_mover_plata_vivo.js <token>

   Caja › Mover: $1.111 de la caja fuerte a la billetera de Tadeo, con el boton de verdad (`guardarMoverLug`). El POST lo
   corta sesion_prep ({ok:true}: no se mueve nada). Despues la recarga de la base, que no lo trae. La caja fuerte tiene
   que bajar $1.111, la billetera subir $1.111, el movimiento quedar primero en los ultimos, y seguir asi despues de
   Actualizar. Con el panel de antes no cambiaba nada hasta la replica. */
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
    for (let i = 0; i < 90; i++) { await pausa(1000); if (await cdp.evaluar(cli, 'typeof go==="function"&&!!(window.D&&D.lugares&&D.lugares.activo)')) break; }
    await cdp.evaluar(cli, 'go("caja")'); await pausa(2500);
    const a = await cdp.evaluar(cli, `(function(){
      var L=D.lugares, p=(L.personas||[])[0]; if(!p)return {sin:true};
      var antes={cf:L.cf, bil:(L.bil||{})[p]};
      abrirMoverLug();
      _lugMv.desde='cf'; _lugMv.hacia='bil:'+p; _lugMv.modo='';
      $('lugMvMonto').value='1111'; $('lugMvBtn').disabled=false;
      guardarMoverLug();
      return new Promise(function(r){ setTimeout(function(){ var L2=D.lugares; r({p:p, antes:antes, cf:L2.cf, bil:(L2.bil||{})[p], primero:(L2.movsUlt||[])[0]}); }, 2000); });
    })()`);
    if (a.sin) throw new Error('sin personas en los lugares');
    chk('al mover, la caja fuerte baja $1.111', Math.round(a.antes.cf - a.cf) === 1111, a);
    chk('   y la billetera de ' + a.p + ' sube $1.111', Math.round(a.bil - a.antes.bil) === 1111, a);
    chk('   y el movimiento queda primero en los ultimos', a.primero && a.primero.desde === 'cf' && a.primero.$ === 1111, a.primero);
    const r = await cdp.evaluar(cli, `actualizarCaja().then(function(){ var L=D.lugares; return {cf:L.cf, bil:(L.bil||{})[${JSON.stringify(a.p)}], primero:(L.movsUlt||[])[0]}; })`);
    chk('tocando Actualizar (la base no lo trae) sigue movido', Math.round(a.antes.cf - r.cf) === 1111 && Math.round(r.bil - a.antes.bil) === 1111, Object.assign({ antes: a.antes }, r));
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores en la consola', !err.length, err.slice(0, 5));
  } catch (e) { chk('la prueba corrio', false, String(e.message)); }
  finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
