/* EL ORIGEN DE UN PEDIDO CON LAS ÓRDENES (4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_origen_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página. Arma la caja de
   origen de un pedido inventado y toca CONFIRMAR ORIGEN como lo hace el botón:
   · prendida: el POST lleva `clientOpId`, después `pedidosFuenteAplicar`, y
     RECIÉN después la recarga de pedidos (si no, volvería el origen viejo);
   · con una OC ya pedida, el backend pide confirmar (sin orden): al confirmar sale
     el segundo POST con `force` y su propio id, y recién ahí el aplicador;
   · apagada: ningún `pedidosFuenteAplicar`, y recarga igual. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const STUB = (modo, pideConfirmar) => `(function(){
  window.__log=[]; var modo=${JSON.stringify(modo)}, pide=${JSON.stringify(pideConfirmar)};
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){ var m=url.match(/action=([A-Za-z]+)/); if(window.__mirar) window.__log.push('GET '+(m?m[1]:'?')); return resp({ok:true,pedidos:[],canales:{}}); }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.force?' force':'')+(b.clientOpId?' (id)':''));
      if(b.action==='setOrigenProductos'){
        if(pide&&!b.force) return resp({ok:false,needsConfirm:true,warn:[{abbr:'PMu',estado:'Pedido',accion:'quitar'}]});
        var r={ok:true,origen:'Orden de Compra',ocCreadas:1,ocActualizadas:0,ocBorradas:0,aviso:''};
        if(modo==='si'){r.aceptada=true;r.diferida=true;r.orden=9;} return resp(r);
      }
      if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(ok,800); }).then(function(){ return resp({ok:true,hechas:1,quedan:0}); });
      return resp({ok:true});
    });
  };
})();`;

const ARMAR = "(function(){var b=document.createElement('button');b.dataset.h='Home';b.dataset.n='9001';b.dataset.r='5';b.dataset.uid='zz';"
  + "var box=document.createElement('div');box.id='orig-zz';box.innerHTML='<div class=\"origen-prod\" data-a=\"PMu\" data-q=\"2\"><input data-role=\"d\" value=\"0\"><input data-role=\"oc\" value=\"2\"></div>';"
  + "document.body.appendChild(box);document.body.appendChild(b);window.__confirmDevuelve=true;window.confirm=function(){return true;};confirmarOrigen(b);})()";

async function correr(modo, pide) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo, pide) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof confirmarOrigen==='function' && typeof _pfAplicar==='function'")) break; await pausa(250); }
  await pausa(3000);
  await evaluar(cli, 'window.__mirar=1; window.__log=[]; try{' + ARMAR + ';}catch(e){window.__log.push("EXPLOTO "+e.message);} 1');
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "window.__log.indexOf('GET pedidosLight')>-1")) break; await pausa(250); }
  await pausa(1000);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return r;
}

(async () => {
  console.log('\n== El origen con las órdenes de pedido (' + ANCHO + ' px) ==\n');
  let r = await correr('si', false);
  let iP = r.log.indexOf('POST setOrigenProductos (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar'), iG = r.log.indexOf('GET pedidosLight', iA);
  chk('prendida: confirmar origen manda su id', iP >= 0, r.log);
  chk('prendida: empuja al aplicador ANTES de recargar los pedidos', iA > iP && iG > iA, r.log);
  chk('sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
  r = await correr('si', true);
  const iF = r.log.indexOf('POST setOrigenProductos force (id)'); iA = r.log.indexOf('POST pedidosFuenteAplicar'); iG = r.log.indexOf('GET pedidosLight', iA);
  chk('con una OC ya pedida: pregunta, y al confirmar sale con force y su id', r.log.indexOf('POST setOrigenProductos (id)') >= 0 && iF > r.log.indexOf('POST setOrigenProductos (id)'), r.log);
  chk('y recién después del force empuja al aplicador y recarga', iA > iF && iG > iA, r.log);
  r = await correr('no', false);
  chk('apagada: ningún pedidosFuenteAplicar, y recarga igual', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.indexOf('GET pedidosLight') > -1, r.log);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
