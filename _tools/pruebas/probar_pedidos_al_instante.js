/* PEDIDOS: reservar y cambiar la fecha de entrega SIN loader (31/10/2026).
     BASE=http://localhost:<puerto> [APP=app_viejo_tmp.html] node _tools/pruebas/probar_pedidos_al_instante.js <token> [390|1440]
   Sesión real con un pedido REAL: solo se cortan las dos escrituras (contestan a los 3 s, aceptadas o rechazadas a
   propósito), así que no cambia nada. Sostiene que el cambio se ve al toque y la pantalla no queda tapada, y que si la
   base lo rechaza (o se corta) vuelve como estaba. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080', APP = process.env.APP || 'app.html', DEMORA = 3000;
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
const EXTRA = `window.__posts=[]; window.__rechazar=false; window.__tapo=0;
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||'');
    if(x&&String(x.method||'').toUpperCase()==='POST'&&!/\\/rest\\/v1\\/rpc\\/[a-z0-9_]+_(pantalla|datos|base)(\\?|$)/.test(url)){
      var b={}; try{b=JSON.parse(x.body);}catch(e){} var a=b.action||(b.p&&b.p.action)||'';
      if(a==='cambiarEstadoEntrega'||a==='updateDiaEntrega'){ window.__posts.push(a);
        var r=window.__rechazar?{ok:false,err:'rechazado a propósito'}:{ok:true};
        return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); }, ${DEMORA}); }); }
    }
    return o.apply(this,arguments); }; })();
  setInterval(function(){ var el=document.getElementById('loaderOverlay'); if(el&&el.classList.contains('visible'))window.__tapo++; },16);`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  if (ANCHO < 500) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== PEDIDOS · reservar y fecha sin loader · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("pedidos")');
  chk('llegan los pedidos reales', await esperar(cli, `!!(window.D&&D.pedidos&&D.pedidos.filter(function(p){return p.es==='Pendiente'&&p.h==='Home';}).length)`, 60000));
  const P = JSON.parse(await evaluar(cli, `JSON.stringify((function(){var p=D.pedidos.filter(function(p){return p.es==='Pendiente'&&p.h==='Home';})[0];return {h:p.h,n:String(p.n),r:p.r||0,dee:p.dee||''};})())`));
  const ES = `((D.pedidos||[]).filter(function(x){return x.h===${JSON.stringify(P.h)}&&String(x.n)===${JSON.stringify(P.n)};})[0]||{})`;
  const BTN = (est) => `{dataset:{h:${JSON.stringify(P.h)},n:${JSON.stringify(P.n)},r:${P.r},est:${JSON.stringify(est)}}}`;
  // Reservar, aceptado.
  await evaluar(cli, `__tapo=0;cambiarEstado(${BTN('Reservado')})`);
  chk('RESERVAR: al toque queda «Reservado»', (await evaluar(cli, `${ES}.es`)) === 'Reservado', await evaluar(cli, `${ES}.es`));
  await pausa(DEMORA + 800);
  chk('  y la pantalla no quedó tapada mientras guardaba', (await evaluar(cli, '__tapo')) === 0, await evaluar(cli, '__tapo'));
  // Reservar, rechazado: vuelve.
  await esperar(cli, `${ES}.es==='Pendiente'`, 30000);   // la recarga trae lo de verdad (no se reservó)
  await evaluar(cli, `__rechazar=true;cambiarEstado(${BTN('Reservado')})`);
  chk('RESERVAR rechazado: al toque «Reservado»', (await evaluar(cli, `${ES}.es`)) === 'Reservado');
  chk('  y cuando la base lo rechaza vuelve a «Pendiente»', await esperar(cli, `${ES}.es==='Pendiente'`, DEMORA + 10000), await evaluar(cli, `${ES}.es`));
  // Fecha de entrega, rechazada: vuelve la de antes.
  const nueva = '2027-01-15';
  await evaluar(cli, `__tapo=0;window.__inp={dataset:{h:${JSON.stringify(P.h)},n:${JSON.stringify(P.n)},r:'${P.r}',orig:${JSON.stringify(P.dee)},uid:''},value:${JSON.stringify(nueva)},disabled:false,style:{}};cambiarFechaEntrega(__inp)`);
  chk('FECHA: al toque cambia', (await evaluar(cli, `${ES}.dee`)) === nueva, await evaluar(cli, `${ES}.dee`));
  chk('  y cuando la base la rechaza vuelve la de antes', await esperar(cli, `${ES}.dee===${JSON.stringify(P.dee)}`, DEMORA + 10000), await evaluar(cli, `${ES}.dee`));
  chk('  sin tapar la pantalla', (await evaluar(cli, '__tapo')) === 0, await evaluar(cli, '__tapo'));
  chk('salieron las tres escrituras (cortadas)', (await evaluar(cli, '__posts.length')) === 3, await evaluar(cli, 'JSON.stringify(__posts)'));
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
