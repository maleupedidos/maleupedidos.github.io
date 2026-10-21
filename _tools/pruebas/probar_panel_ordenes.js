/* EL PANEL CON LAS ÓRDENES DE PEDIDO (Pedidos 4d, 14/10/2026).

     BASE=http://localhost:8133 node _tools/pruebas/probar_panel_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página. Llama a
   `cambiarEstado` (Reservar) como lo hace el botón y mira el orden de lo que sale:
   · prendida (la base contesta `diferida`): el POST lleva `clientOpId`, después
     `pedidosFuenteAplicar`, y RECIÉN después la recarga de pedidos;
   · apagada (sin `diferida`): ningún `pedidosFuenteAplicar`. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8133';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const STUB = modo => `(function(){
  window.__log=[]; var modo=${JSON.stringify(modo)};
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){ var m=url.match(/action=([A-Za-z]+)/); if(window.__mirar) window.__log.push('GET '+(m?m[1]:'?')); return resp({ok:true,pedidos:[],canales:{}}); }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action==='cambiarEstadoEntrega') return resp(modo==='si'?{ok:true,aceptada:true,diferida:true,orden:9}:{ok:true});
      return resp({ok:true,hechas:1,quedan:0});
    });
  };
})();`;

async function correr(modo) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof cambiarEstado==='function' && typeof _pfAplicar==='function'")) break; await pausa(250); }
  await pausa(3000);
  await evaluar(cli, "window.__mirar=1; window.__log=[]; cambiarEstado({dataset:{h:'Home',n:'9001',r:'5',est:'Reservado'}}); 1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "window.__log.indexOf('GET pedidosLight')>-1")) break; await pausa(250); }
  await pausa(1000);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return r;
}

(async () => {
  console.log('\n== El panel con las órdenes de pedido (' + ANCHO + ' px) ==\n');
  let r = await correr('si');
  const iP = r.log.indexOf('POST cambiarEstadoEntrega (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
  /* La recarga es la de pedidos: la pantalla pide otras cosas sola, de fondo (tendencia). */
  const iG = r.log.indexOf('GET pedidosLight');
  chk('prendida: Reservar manda su id', iP >= 0, r.log);
  chk('prendida: empuja al aplicador ANTES de recargar los pedidos', iA > iP && iG > iA, r.log);
  r = await correr('no');
  chk('apagada: ningún pedidosFuenteAplicar, y recarga igual', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.indexOf('GET pedidosLight') > -1, r.log);
  chk('sin errores de consola', JSON.stringify(r.err) === '[]', r.err);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
