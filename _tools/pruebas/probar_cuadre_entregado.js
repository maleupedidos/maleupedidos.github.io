/* RUTA › ARMADO › «Reparto del día»: un pedido entregado no va en «lo que cargás» (21/11/2026, Elena #2543). SOLO LECTURA.
   SBSES=<sbses.json> BASE=http://localhost:8155 [APP=app.html] PED=Home:2543 node probar_cuadre_entregado.js
   Reproduce la captura de Tadeo de las 17:59: la copia del cuadro de hace un minuto trae la bolsa de Elena como libre,
   pero el pedido ya está Entregado (17:58). Se siembra esa copia (`_rutCu`) y se pinta: antes decía «0 bolsas de 1 para
   cargar» con Elena en gris; ahora no la muestra ni la cuenta, y sin nada para cargar el bloque no se dibuja. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html';
const [PH, PN] = String(process.env.PED || 'Home:2543').split(':');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  /* Con `__congelar`, la respuesta REAL de reparto_cuadre_pantalla vuelve como la de las 17:59: sin salir, tanda 1 y la bolsa
     de Elena como única libre (la base de ahora ya no la trae: está entregada). Así entra por el camino de verdad. */
  const CONGELAR = `(function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||'');
    if(window.__congelar&&/rpc\\/reparto_cuadre_pantalla/.test(s))return o.apply(this,arguments).then(function(r){return r.json();}).then(function(d){
      d=d||{};d.ok=true;d.estado='sin_salir';d.tandas=[];d.enCalle=[];
      d.actual=Object.assign({},d.actual||{},{tanda:1,heredadas:[],cambiando:false,libres:[{k:${JSON.stringify(PH)}+'|'+${JSON.stringify(PN)},h:${JSON.stringify(PH)},n:${JSON.stringify(PN)},cliente:'Elena Charchu',rep:'',items:{TPO:1,TV:2,TCA:2,TJQ:1}}]});
      return new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}});});
    return o.apply(this,arguments);};})();`;
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', sbses(process.env.SBSES, 'tadeo') + CONGELAR) });
  console.log('\n=== Reparto del día sin el entregado · ' + PH + ' #' + PN + ' · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await esperar(cli, `(D&&D.pedidos||[]).length>1000`, 150000);
  const p = JSON.parse(await evaluar(cli, `JSON.stringify(((D.pedidos||[]).filter(function(x){return x.h===${JSON.stringify(PH)}&&String(x.n)===${JSON.stringify(PN)};})[0])||null)`));
  console.log('  el pedido en la base: ' + (p ? p.c + ' · ' + p.es + ' · ' + p.rep : '(no está)'));
  chk('el pedido figura Entregado', p && p.es === 'Entregado', p && p.es);
  await evaluar(cli, `go('ruta')`); await esperar(cli, `typeof rutCuadrePintar==='function'&&!!document.getElementById('rutCuadre')`, 30000);
  await evaluar(cli, `try{switchTab('armado')}catch(e){}`); await pausa(2500);
  const antes = await evaluar(cli, `((document.getElementById('rutCuadre')||{}).innerText||'').replace(/\\s+/g,' ')`);
  console.log('  con la copia de la base de ahora: «' + (antes || '(no se dibuja)') + '»');
  await evaluar(cli, `window.__congelar=1; try{rutCuadrePedir(true)}catch(e){}`); await pausa(3500);
  const sembrado = 'por la respuesta de la base';
  const txt = await evaluar(cli, `((document.getElementById('rutCuadre')||{}).innerText||'').replace(/\\s+/g,' ')`);
  console.log('  con la copia de las 17:59 (sembrada: ' + sembrado + '): «' + (txt || '(no se dibuja)') + '»');
  chk('no dice «bolsas de 1 para cargar»', !/de 1 para cargar/.test(txt), txt);
  chk('no nombra al pedido entregado en «lo que cargás»', !new RegExp('#' + PN).test(txt), txt);
  chk('sin nada para cargar, el bloque no se dibuja (o queda en una línea)', !txt || !/lo que cargás/.test(txt), txt);
  const err = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__err||[]).filter(function(e){return !/cortado por la prueba|Failed to load|net::/.test(e);}).slice(0,5))'));
  chk('sin errores de JS', err.length === 0, err);
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
