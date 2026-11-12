/* EDITAR UN PEDIDO DESDE EL PANEL CON LAS ÓRDENES (15/10/2026, regla de v636).

     BASE=http://localhost:8157 node _tools/pruebas/probar_editar_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página. Llama a
   `guardarEditor` como el botón (con la previa ya contestada) y mira el orden de
   lo que sale:
   · prendida (la base contesta `diferida`): el POST lleva `clientOpId`, después
     `pedidosFuenteAplicar`, y RECIÉN después la recarga de pedidos (si no, el
     pedido volvería a aparecer sin el cambio); el toast dice el plan de las OC,
     que en una orden viene en `ocTexto`;
   · apagada: ningún `pedidosFuenteAplicar`, recarga igual, y el plan sale de `aviso`.
   (El portal hace lo mismo en red.html; el pesaje sigue por el camino de siempre.) */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const PLAN = '1× Pack Muzzarella ya pedido a Sevuchitas pasa a tu stock ($9.200)';

const STUB = modo => `(function(){
  window.__log=[]; window.__toasts=[]; var modo=${JSON.stringify(modo)}, PLAN=${JSON.stringify(PLAN)};
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){ var m=url.match(/action=([A-Za-z]+)/); if(window.__mirar) window.__log.push('GET '+(m?m[1]:'?')); return resp({ok:true,pedidos:[],canales:{}}); }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':'')+(b.previa?' (previa)':''));
      if(b.action==='editarPedido'){
        if(modo==='si') return resp({ok:true,ocTexto:PLAN,aceptada:true,diferida:true,orden:9});
        return resp({ok:true,total:22400,costo:12400,margen:10000,origenReseteado:false,origen:'OC',oDet:'',aviso:PLAN});
      }
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
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof guardarEditor==='function' && typeof _pfAplicar==='function' && typeof toast==='function'")) break; await pausa(250); }
  await pausa(3000);
  await evaluar(cli, `(function(){
    var t=toast; window.toast=function(m){ window.__toasts.push(String(m)); return t.apply(this,arguments); };
    window._ed_PRUEBA={hoja:'Home',id:'9001',row:5,es:'Pendiente',fp:'',lineas:[{a:'PPM',q:2,qOrig:1,precio:17000,costo:9200}]};
    /* el confirm lo contesta servir.js con ?prueba=1: se prende con la pagina ya cargada */
    window.__confirmDevuelve=true; window.__confirms=[]; window.__avisos=[];
    window.__mirar=1; window.__log=[];
    try { guardarEditor('PRUEBA',''); } catch (e) { return 'tiro: ' + e.message; }
    return window.__log.join(',') || 'nada salio'; })()`).then((x) => { if (process.env.VER) console.log('     guardarEditor → ' + x); });
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "window.__log.indexOf('GET pedidosLight')>-1")) break; await pausa(250); }
  await pausa(1000);
  const r = await evaluar(cli, '({ log: window.__log.slice(), toasts: window.__toasts.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return r;
}

(async () => {
  console.log('\n== Editar desde el panel con las órdenes de pedido (' + ANCHO + ' px) ==\n');
  let r = await correr('si');
  const iP = r.log.indexOf('POST editarPedido (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
  const iG = r.log.indexOf('GET pedidosLight', iA);
  chk('prendida: editar manda su id', iP >= 0, r.log);
  chk('prendida: empuja al aplicador ANTES de recargar los pedidos', iA > iP && iG > iA, r.log);
  chk('prendida: el toast dice el plan de las OC (viene en ocTexto)', r.toasts.some(t => t.indexOf('OC: ' + PLAN) >= 0), r.toasts);
  chk('sin errores', JSON.stringify(r.err) === '[]', r.err);
  r = await correr('no');
  chk('apagada: ningún pedidosFuenteAplicar, y recarga igual', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.indexOf('GET pedidosLight') > -1, r.log);
  chk('apagada: el toast dice el plan de las OC (viene en aviso)', r.toasts.some(t => t.indexOf('OC: ' + PLAN) >= 0), r.toasts);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
