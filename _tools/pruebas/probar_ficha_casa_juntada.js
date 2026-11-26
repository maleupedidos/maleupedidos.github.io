/* FICHA DEL PEDIDO: «Paga en … · falta cobrar» y Casa / Juntada o evento (21/11/2026).
   SBSES=<sbses.json> BASE=http://localhost:8155 [APP=app.html] node probar_ficha_casa_juntada.js [390|1440]
   Sesión real en solo lectura; pedido_grupal_directo se corta y contesta OK. Pedidos REALES, nada se escribe. */
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
const STUB = `window.__posts=[];window.confirm=function(){return true;};
 (function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||'');
  if(/\\/rest\\/v1\\/rpc\\/pedido_grupal_directo/.test(s)){var b={};try{b=JSON.parse(x.body).p||{};}catch(e){} window.__posts.push(b.valor);
   return new Promise(function(res){setTimeout(function(){res(new Response(JSON.stringify({ok:true,aceptada:true,directo:true,baseEscribio:true,orden:1}),{status:200,headers:{'Content-Type':'application/json'}}));},500);});}
  return o.apply(this,arguments);};})();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', sbses(process.env.SBSES, 'tadeo') + STUB) });
  console.log('\n=== Ficha: falta cobrar y Casa / Juntada · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("pedidos")');
  if (!await esperar(cli, `(D&&D.pedidos||[]).length>20&&typeof openOrdDetail==='function'`, 60000)) { console.log('no cargaron los pedidos'); process.exit(1); }
  await pausa(3000);
  // 1) El renglón del cobro: un Home entregado, no cobrado, con el medio elegido.
  let s = await evaluar(cli, `(function(){var p=(D.pedidos||[]).filter(function(x){return (x.h==='Home'||x.h==='Pilar')&&x.es==='Entregado'&&x.ep!=='Cobrado'&&(Number(x.ef)||0)+(Number(x.tr)||0)>0;})[0];return p?JSON.stringify({h:p.h,n:String(p.n),r:p.r||0,ef:p.ef,tr:p.tr}):'';})()`);
  let html;
  if (s) { const p = JSON.parse(s); html = await evaluar(cli, `_fichaCobroHTML((D.pedidos||[]).filter(function(x){return x.h===${JSON.stringify(p.h)}&&String(x.n)===${JSON.stringify(p.n)};})[0],90000,{total:90000})`); console.log('  (pedido real ' + p.h + ' #' + p.n + ')'); }
  else html = await evaluar(cli, `_fichaCobroHTML({h:'Home',n:'1',r:1,es:'Entregado',ep:'No Cobrado',ef:90000,tr:0,pef:0,ptr:0},90000,{total:90000})`);
  chk('no cobrado: NO dice «Pagó en…»', !/Pagó en/.test(html), html);
  chk('  dice «Paga en efectivo · falta cobrar» (o transferencia)', /Paga en [a-z ]+ · falta cobrar/.test(html), html);
  const htmlC = await evaluar(cli, `_fichaCobroHTML({h:'Home',n:'1',r:1,es:'Entregado',ep:'Cobrado',ef:90000,tr:0,pef:0,ptr:0},90000,{total:90000})`);
  chk('cobrado: sigue diciendo «Pagó en efectivo»', /Pagó en efectivo/.test(htmlC) && !/falta cobrar/.test(htmlC), htmlC);
  // 2) Casa / Juntada o evento en la ficha.
  s = await evaluar(cli, `(function(){var p=(D.pedidos||[]).filter(function(x){return (x.h==='Home'||x.h==='Pilar')&&x.es!=='Cancelado'&&!String(x.grp||'').trim()&&x.r;})[0];return p?JSON.stringify({h:p.h,n:String(p.n),r:p.r}):'';})()`);
  if (!s) chk('hay un pedido Home sin juntada', false); else {
    const p = JSON.parse(s);
    await evaluar(cli, `openOrdDetail(${JSON.stringify(p.h)},${JSON.stringify(p.n)},${p.r})`);
    await esperar(cli, `!!document.querySelector('#ordBody .ord-trajo')`, 15000);
    const caja = await evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('#ordBody .ord-trajo')).filter(function(e){return /Para dónde es/.test(e.textContent);})[0];return b?b.textContent.replace(/\\s+/g,' '):'';})()`);
    chk('la ficha pregunta «¿Para dónde es?» con Casa y Juntada o evento', /Para dónde es/.test(caja) && /Casa/.test(caja) && /Juntada o evento/.test(caja), caja);
    chk('  sin «Nombre de la juntada» ni «Nueva juntada»', !(await evaluar(cli, `/Nombre de la juntada|Nueva juntada|No hay juntadas/.test(document.getElementById('ordBody').innerHTML)`)));
    chk('  Casa elegida por defecto', await evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('#ordBody .ord-trajo-op.on')).map(function(x){return x.textContent;});return b.indexOf('Casa')>=0;})()`));
    await evaluar(cli, `[].slice.call(document.querySelectorAll('#ordBody .ord-trajo-op')).filter(function(b){return b.textContent==='Juntada o evento';})[0].click()`);
    const v = await esperar(cli, `String(((D.pedidos||[]).filter(function(x){return x.h===${JSON.stringify(p.h)}&&String(x.n)===${JSON.stringify(p.n)};})[0]||{}).grp||'')==='Sí'`, 5000);
    chk('  un toque en «Juntada o evento» guarda la marca «Sí»', v && (await evaluar(cli, `__posts[0]`)) === 'Sí', await evaluar(cli, `JSON.stringify(__posts)`));
  }
  // 3) El alta (vive en Ruta, que arranca al abrirla) y Clientes.
  await evaluar(cli, `closeOrdDetail();go('ruta')`); await esperar(cli, `typeof npSetDestino==='function'`, 30000);
  chk('el alta tiene Casa / Juntada o evento', await evaluar(cli, `typeof npSetDestino==='function'&&document.querySelectorAll('.np-dest .np-chip').length===2`));
  await evaluar(cli, `npSetDestino('juntada')`);
  chk('  elegir Juntada tilda la casilla que lee el guardado', await evaluar(cli, `document.getElementById('npGrupal').checked===true`));
  await evaluar(cli, `npSetDestino('casa')`);
  chk('  y Casa la destilda', await evaluar(cli, `document.getElementById('npGrupal').checked===false`));
  await evaluar(cli, `go('estancias')`); await pausa(6000);
  const err = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__err||[]).filter(function(e){return !/cortado por la prueba|Failed to load|net::/.test(e);}).slice(0,5))'));
  chk('sin errores de JS (incluido Clientes)', err.length === 0, err);
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
