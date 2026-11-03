/* RUTA › COBROS LEE DE LA BASE, TAMBIEN CON EL ↻ (2/11/2026).

   BASE_URL=http://localhost:8157/app.html node _tools/pruebas/probar_cobros_de_la_base_vivo.js <token> [hoja#id]

   Tadeo deshizo un cobro (Home #2115) a las 23:34 y Cobros no lo mostro: leia la foto de Apps Script o Apps Script
   directo. Abre Ruta › Cobros con la sesion real, toca el ↻ de verdad (`fetchCobrosPendientes(true)`) y mira a quien le
   pidio: tiene que ser `cobros_pendientes_pantalla` (la base), no Apps Script; y el pedido (por defecto Home#2115)
   tiene que estar en la lista. Solo lee. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], URL = process.env.BASE_URL || 'http://localhost:8157/app.html', PED = process.argv[3] || 'Home#2115';
const pausa = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const cli = await cdp.abrir();
  let ok = 0, mal = 0;
  const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, 'window.__urls=[];(function(){var o=window.fetch;window.fetch=function(u,x){window.__urls.push(String((u&&u.url)||u).replace(/[?].*$/,""));return o.apply(this,arguments);};})();') });
    await cli.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 90; i++) { await pausa(1000); if (await cdp.evaluar(cli, 'typeof go==="function"&&!!(window.D&&D.pedidos&&D.pedidos.length)')) break; }
    await cdp.evaluar(cli, 'go("ruta")');
    for (let i = 0; i < 40; i++) { await pausa(1000); if (await cdp.evaluar(cli, 'typeof rutSwitchTab==="function"||typeof fetchCobrosPendientes==="function"')) break; }
    await cdp.evaluar(cli, 'try{switchTab("cobros")}catch(e){}');
    await pausa(3000);
    const r = await cdp.evaluar(cli, `(function(){
      window.__urls=[]; var t0=Date.now();
      return fetchCobrosPendientes(true).then(function(okk){
        var u=window.__urls.slice(), txt=(document.getElementById("cobrosContent")||document.body).innerText;
        return {ok:okk, ms:Date.now()-t0, urls:u, base:u.some(function(x){return /cobros_pendientes_pantalla/.test(x);}), apps:u.some(function(x){return /script\\.google/.test(x);}),
                esta:${JSON.stringify(PED)}.split('#')[1] ? txt.indexOf(${JSON.stringify(PED)}.split('#')[1])>=0 : false};
      });
    })()`);
    chk('el ↻ de Cobros le pide a la base (cobros_pendientes_pantalla), en ' + r.ms + ' ms', r.base, r);
    chk('   los cobros no salen de Apps Script (la otra llamada es rutCliVendCargar, los clientes del representante)', r.urls.filter(function (x) { return /script\.google/.test(x); }).length <= 1, r.urls);
    chk('   ' + PED + ' (el cobro que deshizo Tadeo) esta en la lista', r.esta, r);
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores en la consola', !err.length, err.slice(0, 5));
  } catch (e) { chk('la prueba corrio', false, String(e.message)); }
  finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
