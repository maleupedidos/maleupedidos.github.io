/* EL GASTO SE VE AL GUARDAR, CON LA SESION REAL Y LA CAJA DE LA BASE (2/11/2026).

   BASE_URL=http://localhost:8157/app.html node _tools/pruebas/probar_gasto_se_ve_vivo.js <token>

   Llena el formulario de gasto de Caja y toca Guardar, como Tadeo. El POST lo corta sesion_prep (contesta {ok:true}:
   no se escribe nada) y despues corre la recarga DE VERDAD (`_recargarCaja`, la base), que no trae el gasto porque no
   existe. Mide cuanto tarda en verse y si sigue despues de la recarga y de tocar Actualizar. Con el panel de antes,
   la recarga lo borraba. 390 px. */
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
    for (let i = 0; i < 90; i++) { await pausa(1000); if (await cdp.evaluar(cli, 'typeof go==="function"&&!!(window.D&&D.movimientos&&D.movimientos.length)')) break; }
    await cdp.evaluar(cli, 'go("caja")');
    for (let i = 0; i < 60; i++) { await pausa(1000); if (await cdp.evaluar(cli, '!!document.querySelector("#gList")&&document.querySelector("#gList").innerText.length>20')) break; }
    const CON = 'PRUEBA Backend no se guarda ' + Date.now();
    const antes = await cdp.evaluar(cli, 'D.caja.gastosMP||0');
    const t = await cdp.evaluar(cli, `(function(){
      var t0=performance.now();
      document.getElementById('gCat').value='Otro';
      document.getElementById('gCon').value=${JSON.stringify(CON)};
      document.getElementById('gEf').value='';
      document.getElementById('gMP').value='1234';
      document.getElementById('gMP').dispatchEvent(new Event('input',{bubbles:true}));
      var f=document.getElementById('gBtn').form; f.requestSubmit?f.requestSubmit(document.getElementById('gBtn')):document.getElementById('gBtn').click();
      return new Promise(function(r){ var i=setInterval(function(){ if(document.getElementById('gList').innerText.indexOf(${JSON.stringify(CON)})>=0){clearInterval(i);r(Math.round(performance.now()-t0));} },20); setTimeout(function(){clearInterval(i);r(-1);},5000); });
    })()`);
    chk('al tocar Guardar se ve en la lista (' + t + ' ms)', t >= 0 && t < 1500, t);
    await pausa(6000);   /* el _recargarCaja que dispara el guardado, contra la base */
    const tras = await cdp.evaluar(cli, `({lista:document.getElementById('gList').innerText.indexOf(${JSON.stringify(CON)})>=0, mp:D.caja.gastosMP||0, fuente:window.__cajaFuente||null})`);
    chk('despues de la recarga de la base sigue en la lista', tras.lista, tras);
    chk('   y en el total de gastos MP (+1234)', Math.round(tras.mp - antes) === 1234, { antes, despues: tras.mp });
    const r = await cdp.evaluar(cli, 'actualizarCaja().then(function(x){return {r:x, lista:document.getElementById("gList").innerText.indexOf(' + JSON.stringify(CON) + ')>=0};})');
    chk('tocando Actualizar tambien sigue', r.lista, r);
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores en la consola', !err.length, err.slice(0, 5));
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
