/* EL VENDEDOR PERDONA EL ENVÍO, CON LAS ÓRDENES (4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_envio_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO (datos inventados). Mi Portal, «Ver como»
   un vendedor con un pedido con envío, y `rutaEnvioAnular(true)`:
   · prendida (`diferida`): el POST lleva su id y después sale `pedidosFuenteAplicar`;
   · EL CANDADO: mientras el aplicador no contestó, Cobrado sigue trabado
     (`_envioTrabado`). Si se soltara antes, un cobro inmediato leería el Total
     todavía CON envío — el caso que encontró Codex el 1/10/2026. Al final se suelta;
   · apagada: ningún `pedidosFuenteAplicar`, y el candado se suelta igual. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const PED = { n: '120', row: 121, r: 121, es: 'Pendiente', ep: 'No Cobrado', env: 3000, envAnu: '', c: 'Cliente Prueba', vi: true, t: '1199990000', tc: 53000, fp: 'Efectivo', items: [], b: 'Barrio', l: '1' };
const STUB = modo => `(function(){
  window.__log=[]; window.__trabadoAlAplicar=null; var modo=${JSON.stringify(modo)};
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){ var m=url.match(/action=([A-Za-z]+)/), a=m?m[1]:'?'; if(window.__mirar) window.__log.push('GET '+a);
      if(a==='dashboardVendedor') return resp({ok:true,pedidos:[${JSON.stringify(PED)}],semanas:[],vendedor:'Rufino Ardanaz'});
      return resp({ok:true,pedidos:[],lista:[]}); }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action==='redEnvioAnular'){ var r={ok:true,row:121,n:'120',anulado:true,envio:0,quitado:3000,sello:'3000 | rufino | 14/10/2026 19:00'}; if(modo==='si'){r.aceptada=true;r.diferida=true;r.orden=9;} return resp(r); }
      if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(function(){
          /* Justo antes de que el aplicador conteste: ¿Cobrado sigue trabado? */
          try{ window.__trabadoAlAplicar=_envioTrabado({n:'120'}); }catch(e){ window.__trabadoAlAplicar='err '+e.message; }
          ok(); },800); }).then(function(){ return resp({ok:true,hechas:1,quedan:0}); });
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
  await evaluar(cli, "go('miportal'); 1");
  for (let i = 0; i < 80; i++) { if (await evaluar(cli, "typeof redVerComoEntrar==='function' && typeof rutaEnvioAnular==='function'")) break; await pausa(250); }
  await pausa(1500);
  await evaluar(cli, "redVerComoEntrar('Rufino Ardanaz'); 1");
  let hay = false;
  for (let i = 0; i < 40; i++) { if ((hay = await evaluar(cli, "!!(_rutaCurrent()&&String(_rutaCurrent().n)==='120')"))) break; await pausa(250); }
  await evaluar(cli, "window.__mirar=1; window.__log=[]; window.__confirmDevuelve=true; window.confirm=function(){return true;}; try{ rutaEnvioAnular(true); }catch(e){ window.__log.push('EXPLOTO '+e.message); } 1");
  await pausa(3500);
  const r = await evaluar(cli, "({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5), alAplicar: window.__trabadoAlAplicar, alFinal: _envioTrabado({n:'120'}) })");
  cli.matar();
  return Object.assign(r, { hay });
}

(async () => {
  console.log('\n== El vendedor perdona el envío, con las órdenes (' + ANCHO + ' px) ==\n');
  let r = await correr('si');
  chk('el portal tiene el pedido #120 con envío', r.hay === true);
  const iP = r.log.indexOf('POST redEnvioAnular (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
  chk('prendida: anular manda su id y después empuja al aplicador', iP >= 0 && iA > iP, r.log);
  chk('prendida: mientras el aplicador no contestó, Cobrado SIGUE trabado', r.alAplicar === true, r.alAplicar);
  chk('y al final el candado se suelta', r.alFinal === false, r.alFinal);
  chk('sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
  r = await correr('no');
  chk('apagada: ningún pedidosFuenteAplicar, y el candado se suelta', r.log.indexOf('POST redEnvioAnular (id)') >= 0 && r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.alFinal === false, [r.log, r.alFinal]);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
