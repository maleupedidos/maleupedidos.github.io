/* FICHA DEL PEDIDO: la tarjeta cambia con la respuesta, sin esperar la relectura (21/11/2026).
   SBSES=<sbses.json> BASE=http://localhost:8155 [APP=app.html] node probar_ficha_al_instante.js [390|1440]
   Sesión real en solo lectura; las cuatro directas se cortan y contestan OK a los 800 ms; las relecturas de Pedidos se
   anulan A PROPÓSITO (se mide que la tarjeta cambie sin ellas, no la reconciliación). Pedidos REALES; nada se escribe. */
'use strict';
const P = './';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const STUB = `window.__posts=[];window.confirm=function(){return true;};window.prompt=function(){return window.__prompt||'';};window.alert=function(){};
 (function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||'');
  var m=/\\/rest\\/v1\\/rpc\\/(pedido_entregar_directo|red_devolucion_directo|pedido_deshacer_entrega_directo|pedido_fecha_real_directo)/.exec(s);
  if(m){var b={};try{b=JSON.parse(x.body).p||{};}catch(e){} window.__posts.push(m[1]);
   var r={ok:true,aceptada:true,directo:true,baseEscribio:true,orden:1};
   if(m[1]==='red_devolucion_directo')r.stock=true;
   if(m[1]==='pedido_fecha_real_directo'){ r.ahora=b.fecha; r.antes='x'; r.cliente='c'; }
   return new Promise(function(res){setTimeout(function(){res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}}));},800);});}
  return o.apply(this,arguments);};})();`;
const SIN_RELEER = `window._recargarPedidos=function(){return Promise.resolve();};window._pedVivoTodo=function(){return Promise.resolve(true);};window._ordenVistaPedir=function(){};window.loadRapido=function(){return Promise.resolve({ok:true});};`;
const PED = (h, n) => `((D.pedidos||[]).filter(function(x){return x.h===${JSON.stringify(h)}&&String(x.n)===${JSON.stringify(String(n))};})[0]||{})`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  if (ANCHO < 500) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', sbses(process.env.SBSES, 'tadeo') + STUB) });
  console.log('\n=== Ficha del pedido al instante · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("pedidos")');
  if (!await esperar(cli, `(D&&D.pedidos||[]).length>20&&typeof _ordMarcarEntregadoRed==='function'`, 60000)) { console.log('no cargaron los pedidos'); process.exit(1); }
  await pausa(4000);
  await evaluar(cli, SIN_RELEER);
  const elegir = (cond) => evaluar(cli, `(function(){var p=(D.pedidos||[]).filter(function(x){return ${cond};})[0];return p?JSON.stringify({h:p.h,n:String(p.n),r:p.r||0,es:p.es,ev:p.ev,fe:p.fe}):'';})()`);
  // 1) Entregado de Red
  let s = await elegir(`x.h==='Red'&&x.n&&x.r&&x.es!=='Entregado'&&x.es!=='Cancelado'`);
  if (!s) chk('hay un pedido de Red sin entregar', false); else {
    const p = JSON.parse(s);
    await evaluar(cli, `_ordMarcarEntregadoRed(${p.r})`);
    const v = await esperar(cli, `${PED('Red', p.n)}.es==='Entregado'`, 4000);
    chk('Red #' + p.n + ': «ya lo entregó» → la tarjeta dice Entregado sin relectura', v, await evaluar(cli, `JSON.stringify(${PED('Red', p.n)}.es)`));
  }
  // 2) Devolución de Red (con bolsa)
  s = await elegir(`x.h==='Red'&&x.r&&x.ev&&x.es!=='Cancelado'`);
  if (!s) console.log('  (sin pedido de Red con bolsa para la devolución: se saltea)'); else {
    const p = JSON.parse(s);
    await evaluar(cli, `_ordDevolucionRed(${p.r})`);
    const v = await esperar(cli, `!${PED('Red', p.n)}.ev`, 4000);
    chk('Red #' + p.n + ': devolución → la bolsa ya no figura en manos del representante', v, await evaluar(cli, `JSON.stringify(${PED('Red', p.n)}.ev)`));
  }
  // 3) Deshacer entrega (Home/Pilar)
  s = await elegir(`(x.h==='Home'||x.h==='Pilar')&&x.es==='Entregado'&&x.n`);
  if (!s) chk('hay un pedido entregado de Home/Pilar', false); else {
    const p = JSON.parse(s);
    await evaluar(cli, `_ordDeshacerEntrega(${JSON.stringify(p.h)},${JSON.stringify(p.n)},${p.r})`);
    const v = await esperar(cli, `${PED(p.h, p.n)}.es==='Pendiente'`, 4000);
    chk(p.h + ' #' + p.n + ': «no se entregó» → vuelve a Pendiente sin relectura', v, await evaluar(cli, `JSON.stringify(${PED(p.h, p.n)}.es)`));
  }
  // 4) Se entregó otro día
  s = await elegir(`(x.h==='Home'||x.h==='Pilar')&&x.es==='Entregado'&&x.n&&x.fe`);
  if (!s) chk('hay otro pedido entregado para la fecha real', false); else {
    const p = JSON.parse(s);
    await evaluar(cli, `window.__prompt='02/11/2026';_ordFechaEntregaReal(${JSON.stringify(p.h)},${JSON.stringify(p.n)},${p.r})`);
    const v = await esperar(cli, `${PED(p.h, p.n)}.fe==='02/11'`, 5000);
    chk(p.h + ' #' + p.n + ': «se entregó el 02/11» → la fecha cambia sin esperar al aplicador', v, await evaluar(cli, `JSON.stringify(${PED(p.h, p.n)}.fe)`));
  }
  chk('salieron las escrituras (cortadas)', (await evaluar(cli, `__posts.length`)) >= 3, await evaluar(cli, `JSON.stringify(__posts)`));
  const err = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__err||[]).filter(function(e){return !/cortado por la prueba|Failed to load|net::/.test(e);}).slice(0,5))'));
  chk('sin errores de JS', err.length === 0, err);
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
