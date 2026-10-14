/* EL PAGO DE LOS VENDEDORES A MALEU CON LAS ÓRDENES DE PEDIDO (4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_pago_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página. Las tres pantallas que
   anotan un pago del vendedor:
   · Ruta › Cobros (cobrarVendedorRed);
   · Billeteras del panel, «Recibí de un vendedor» (guardarMoverLug → cobrarVendedorRed);
   · el portal del vendedor (registrarPagoParcial → marcarSemanaPagadaRed); en
     modo prueba el panel es admin, así que se entra con «Ver como».
   Prendida (la base contesta `diferida`): el POST lleva su id, después sale
   `pedidosFuenteAplicar`, y RECIÉN después la pantalla vuelve a pedir datos.
   Apagada: ningún `pedidosFuenteAplicar`, y la pantalla recarga igual. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const STUB = (modo, pantalla) => `(function(){
  window.__log=[]; var modo=${JSON.stringify(modo)};
  try{
    if(${JSON.stringify(pantalla)}==='ruta'){
      var L=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); L._v='v2-row-keyed'; L.currentTab='cobros'; L.syncQueue=[];
      localStorage.setItem('maleu_ruta',JSON.stringify(L)); localStorage.setItem('maleu_ruta_purge_v58',String(Date.now()));
    }
    if(${JSON.stringify(pantalla)}==='portal'){
      localStorage.setItem('maleu_token','x');
      localStorage.setItem('maleu_red_session',JSON.stringify({ok:true,nombre:'Rufino Ardanaz',usuario:'rufino',wa:'',comision:0}));
    }
  }catch(e){}
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){ var m=url.match(/action=([A-Za-z]+)/); if(window.__mirar) window.__log.push('GET '+(m?m[1]:'?')); return resp({ok:true,pedidos:[],canales:{},pendientes:[],cobros:[],semanas:[]}); }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action==='cobrarVendedorRed'||b.action==='marcarSemanaPagadaRed'){
        var r={ok:true,total:1000,updated:0,saldoPendiente:5000,parcial:true,detalle:[],semanaCerrada:false,saldoRestante:5000,acumTotal:1000};
        if(modo==='si'){ r.aceptada=true; r.diferida=true; r.orden=9; }
        return resp(r);
      }
      if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(ok,800); }).then(function(){ return resp({ok:true,hechas:1,quedan:0}); });
      return resp({ok:true});
    });
  };
})();`;

const DISPARO = {
  ruta: "cobrarVendedorRed('Rufino Ardanaz',1000,0,false,'','')",
  billeteras: "(function(){function el(t,id,v){var e=document.getElementById(id);if(!e){e=document.createElement(t);e.id=id;document.body.appendChild(e);}if(t==='select'){e.innerHTML='<option value=\"'+v+'\" selected>x</option>';}else if(v!=null)e.value=v;return e;}"
    + "el('button','lugMvBtn').disabled=false;el('select','lugMvVendSel','Rufino Ardanaz');el('input','lugMvMonto','1000');el('input','lugMvNota','');"
    + "_lugMv.modo='vendedor';_lugMv.quien='Tadeo';guardarMoverLug();})()",
  portal: 'redVerComoEntrar("Rufino Ardanaz"); registrarPagoParcial(2026,42,1000,0,"")'
};
const LISTO = {
  ruta: "typeof cobrarVendedorRed==='function'",
  billeteras: "typeof guardarMoverLug==='function' && typeof _pfAplicar==='function'",
  portal: "typeof registrarPagoParcial==='function'"
};

async function correr(modo, pantalla) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo, pantalla) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  if (pantalla === 'ruta') await evaluar(cli, 'go("ruta"); 1');
  if (pantalla === 'portal') await evaluar(cli, 'go("miportal"); 1');
  let listo = false;
  for (let i = 0; i < 80; i++) { if ((listo = await evaluar(cli, LISTO[pantalla]))) break; await pausa(250); }
  await pausa(3000);
  await evaluar(cli, 'window.__mirar=1; window.__log=[]; try{' + DISPARO[pantalla] + ';}catch(e){window.__log.push("EXPLOTO "+e.message);} 1');
  await pausa(4000);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return Object.assign(r, { listo });
}

(async () => {
  console.log('\n== El pago de los vendedores con las órdenes de pedido (' + ANCHO + ' px) ==');
  for (const [pantalla, accion] of [['ruta', 'cobrarVendedorRed'], ['billeteras', 'cobrarVendedorRed'], ['portal', 'marcarSemanaPagadaRed']]) {
    console.log('\n · ' + pantalla);
    let r = await correr('si', pantalla);
    chk('la pantalla arrancó', r.listo === true);
    const iP = r.log.indexOf('POST ' + accion + ' (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
    const iG = r.log.findIndex((x, i) => i > iP && x.indexOf('GET ') === 0);
    chk('prendida: el pago manda su id', iP >= 0, r.log);
    chk('prendida: empuja al aplicador y recién después vuelve a pedir datos', iA > iP && iG > iA, r.log);
    chk('prendida: sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
    r = await correr('no', pantalla);
    chk('apagada: ningún pedidosFuenteAplicar, y vuelve a pedir datos', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.some((x) => x.indexOf('GET ') === 0), r.log);
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
