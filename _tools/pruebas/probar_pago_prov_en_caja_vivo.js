/* EL PAGO A UN PROVEEDOR SE VE EN CAJA AL INSTANTE (2/11/2026).

   BASE_URL=http://localhost:8157/app.html node _tools/pruebas/probar_pago_prov_en_caja_vivo.js <token>

   Abastecimiento › Pagos › «+ Pago a cuenta» del primer proveedor: llena $777 por la digital y toca «Confirmar pago»
   con el boton de verdad. El POST lo corta sesion_prep ({ok:true}: no se escribe nada). Despues va a Caja, corre la
   recarga de la base (que no lo trae, porque no existe) y mira que siga en la lista y en el total. Con el panel de
   antes no aparecia en Caja hasta la replica de Egresos. 390 px. */
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
    await cdp.evaluar(cli, 'go("busqueda")');
    for (let i = 0; i < 60; i++) { await pausa(1000); if (await cdp.evaluar(cli, 'typeof abaSwitchTab==="function"&&typeof togglePagoForm==="function"')) break; }
    await cdp.evaluar(cli, 'abaSwitchTab("pagos")');
    for (let i = 0; i < 40; i++) { await pausa(1000); if (await cdp.evaluar(cli, `[].some.call(document.querySelectorAll('[onclick]'),function(e){return e.getAttribute('onclick').indexOf("togglePagoForm('libre_0')")>=0;})`)) break; }
    const prov = await cdp.evaluar(cli, `(function(){
      togglePagoForm('libre_0');
      var mp=document.getElementById('pagoMp_libre_0'); if(!mp)return {sin:'no hay formulario libre_0'};
      mp.value='777'; mp.dispatchEvent(new Event('input',{bubbles:true}));
      var ef=document.getElementById('pagoEf_libre_0'); if(ef){ef.value='';}
      if(typeof abaPagoCuenta==='function')abaPagoCuenta('libre_0','mp');
      var b=document.getElementById('btnPagar_libre_0'); if(!b)return {sin:'no hay boton'};
      window.__antesMp=D.caja.gastosMP||0;
      window.__toasts=[];var _t=window.abaShowToast;if(_t)window.abaShowToast=function(m){window.__toasts.push(String(m));return _t.apply(this,arguments);};
      b.click();
      return {ok:true};
    })()`);
    if (prov.sin) { chk('el formulario de pago a cuenta se abre', false, prov); throw new Error('sin formulario'); }
    await pausa(1500);
    console.log('     avisos:', JSON.stringify(await cdp.evaluar(cli, '({t:window.__toasts, btn:(document.getElementById("btnPagar_libre_0")||{}).textContent, abierto:!!document.getElementById("pagoMp_libre_0")})')));
    const con = await cdp.evaluar(cli, '(function(){var m=(D.movimientos||[]).filter(function(x){return Number(x.$)===777&&/^Pago a /.test(x.con||"");})[0];return m?m.con:"(no entro)";})()');
    const en = await cdp.evaluar(cli, `({en:(D.movimientos||[]).filter(function(m){return m.con===${JSON.stringify(con)}&&Number(m.$)===777;}).length, mp:D.caja.gastosMP||0, antes:window.__antesMp})`);
    chk('al confirmar, el pago entra en los movimientos de Caja (' + con + ' $777)', en.en === 1 && Math.round(en.mp - en.antes) === 777, en);
    await cdp.evaluar(cli, 'go("caja")');
    await pausa(1500);
    const vis = await cdp.evaluar(cli, `document.getElementById('gList').innerText.indexOf(${JSON.stringify(con)})>=0&&document.getElementById('gList').innerText.indexOf('777')>=0`);
    chk('   y se ve en la lista de Caja', vis, vis);
    const r = await cdp.evaluar(cli, `actualizarCaja().then(function(){return {en:(D.movimientos||[]).filter(function(m){return m.con===${JSON.stringify(con)}&&Number(m.$)===777;}).length, mp:D.caja.gastosMP||0, antes:window.__antesMp};})`);
    chk('   tocando Actualizar (la base no lo trae) sigue, y el total tambien', r.en === 1 && Math.round(r.mp - r.antes) === 777, r);
    await cdp.evaluar(cli, 'go("egresos")');
    await pausa(1500);
    const pg = await cdp.evaluar(cli, `(function(){var t=document.getElementById('p-egresos').innerText;return {con:t.indexOf(${JSON.stringify(con.replace('Pago a ', ''))})>=0, monto:t.indexOf('777')>=0, muestra:t.slice(0,400)};})()`);
    chk('   y aparece en Pagos (el proveedor y $777)', pg.con && pg.monto, pg);
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores en la consola', !err.length, err.slice(0, 5));
  } catch (e) { if (String(e.message) !== 'sin formulario') chk('la prueba corrio', false, String(e.message)); }
  finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
