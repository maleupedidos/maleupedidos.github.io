/* REPROGRAMAR UNA ENTREGA DESDE RUTA CON LAS ÓRDENES (4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_reprog_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página. Se deja una entrega
   pendiente en la copia local de Ruta (`maleu_ruta.entregas`) y los GET
   contestan sin lista (así el refresco no la pisa). Llama a
   `_reprogAplicar` como lo hace el botón:
   · prendida: el POST lleva `clientOpId`, después `pedidosFuenteAplicar`, y RECIÉN
     después el refresco (si no, traería la fecha vieja);
   · apagada: ningún `pedidosFuenteAplicar`, y refresca igual. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const DIA = '2026-10-16';

const STUB = modo => `(function(){
  window.__log=[]; var modo=${JSON.stringify(modo)};
  try{ var L=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); L._v='v2-row-keyed'; L.syncQueue=[];
       L.entregas=[{h:'Home',id:'9001',r:5,fe:${JSON.stringify(DIA)},de:'Viernes',es:'Pendiente',c:'Cliente Prueba'}];
       localStorage.setItem('maleu_ruta',JSON.stringify(L)); localStorage.setItem('maleu_ruta_purge_v58',String(Date.now())); }catch(e){}
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){ var m=url.match(/action=([A-Za-z]+)/); if(window.__mirar) window.__log.push('GET '+(m?m[1]:'?'));
      /* entregas contesta sin lista: Ruta no pisa la copia local con eso (y no queda un GET colgado que el refresco reuse) */
      return resp({ok:false}); }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action==='reprogramarEntrega'){ var r={ok:true,movidos:1,fecha:'2026-10-23',fechaArg:'23/10/2026',resultados:[{ok:true,hoja:'Home',id:'9001',row:5}],err:''}; if(modo==='si'){r.aceptada=true;r.diferida=true;r.orden=9;} return resp(r); }
      if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(ok,800); }).then(function(){ return resp({ok:true,hechas:1,quedan:0}); });
      return resp({ok:true});
    });
  };
})();`;

async function correr(modo) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  await evaluar(cli, 'go("ruta"); 1');
  let listo = false;
  for (let i = 0; i < 80; i++) { if ((listo = await evaluar(cli, "typeof _reprogAplicar==='function'"))) break; await pausa(250); }
  await pausa(2500);
  await evaluar(cli, "window.__mirar=1; window.__log=[]; window.__confirmDevuelve=true; window.confirm=function(){return true;}; try{_reprogAplicar(" + JSON.stringify(DIA) + ",'2026-10-23',null);}catch(e){window.__log.push('EXPLOTO '+e.message);} 1");
  await pausa(4000);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return Object.assign(r, { listo });
}

(async () => {
  console.log('\n== Reprogramar desde Ruta con las órdenes de pedido (' + ANCHO + ' px) ==\n');
  let r = await correr('si');
  chk('Ruta arrancó', r.listo === true);
  const iP = r.log.indexOf('POST reprogramarEntrega (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
  const iG = r.log.indexOf('GET entregas', iP);
  chk('prendida: reprogramar manda su id', iP >= 0, r.log);
  chk('prendida: empuja al aplicador y recién después refresca', iA > iP && iG > iA, r.log);
  chk('sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
  r = await correr('no');
  const iP2 = r.log.indexOf('POST reprogramarEntrega (id)');
  chk('apagada: ningún pedidosFuenteAplicar, y refresca igual', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.indexOf('GET entregas', iP2) > iP2, r.log);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
