/* LA BANDEJA DE RED CON LAS ÓRDENES DE PEDIDO (Pedidos 4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_bandeja_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página. La planilla simulada
   recién se "escribe" cuando corre el aplicador (`pedidosFuenteAplicar`, que tarda
   2,5 s): hasta ahí `redBandeja` sigue trayendo el pedido como pendiente, que es
   lo que pasa de verdad con la palanca prendida.
   · prendida (`diferida`): Confirmar y Pasar a otro vendedor mandan `clientOpId`,
     empujan al aplicador, y la fila confirmada NO vuelve a aparecer en ningún
     momento (la capa optimista se suelta recién cuando el aplicador terminó);
   · apagada (sin `diferida`): ningún `pedidosFuenteAplicar`, y la fila tampoco vuelve. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ROW = 121;

const STUB = modo => `(function(){
  window.__log=[]; var modo=${JSON.stringify(modo)}; var escrito=false;
  var P={row:${ROW},n:'120',c:'Cliente de prueba',tot:50000,pago:'Transferencia',b:'Barrio',l:'1',de:'Viernes 16/10',v:'Rufino Ardanaz',desde:Date.now()-60000};
  var V=[{nombre:'Rufino Ardanaz',dias:['Viernes'],tg:true},{nombre:'Fini Mihailovitch',dias:['Viernes'],tg:true}];
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){
      var m=url.match(/action=([A-Za-z]+)/), ac=m?m[1]:'?';
      if(window.__mirar) window.__log.push('GET '+ac);
      if(ac==='redBandeja') return resp({ok:true,horas:2,pendientes:escrito?[]:[P],vendedores:V,recientes:[]});
      return resp({ok:true,pedidos:[],canales:{}});
    }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action==='redConfirmar'||b.action==='redCambiarVendedor'){
        var r={ok:true,vendedor:b.vendedor||P.v,antes:P.v,aviso:'avisado',avisoOk:true,avisoAntes:'avisado'};
        if(modo==='si'){ r.aceptada=true; r.diferida=true; r.orden=9; } else escrito=true;
        return resp(r);
      }
      if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(function(){ escrito=true; ok(); },2500); }).then(function(){ return resp({ok:true,hechas:1,quedan:0}); });
      return resp({ok:true});
    });
  };
})();`;

async function correr(modo, accion) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof rbConfirmar==='function' && typeof _pfAplicar==='function' && !!document.getElementById('rbBox')")) break; await pausa(250); }
  await pausa(2500);
  await evaluar(cli, 'try{localStorage.clear();}catch(e){} rbPedir(); 1');
  let antes = false;
  for (let i = 0; i < 40; i++) { if ((antes = await evaluar(cli, "!!document.getElementById('rbp-" + ROW + "')"))) break; await pausa(250); }
  /* Pasar a otro vendedor: pdCambiar lee el select `pdc-<rk>` y pregunta con confirm. */
  const disparo = accion === 'confirmar'
    ? 'rbConfirmar(' + ROW + ')'
    : "(function(){var s=document.createElement('select');s.id='pdc-x';s.innerHTML='<option value=\"Fini Mihailovitch\" selected>F</option>';document.body.appendChild(s);window.confirm=function(){return true;};pdCambiar('120'," + ROW + ",'x');})()";
  await evaluar(cli, 'window.__mirar=1; window.__log=[]; ' + disparo + '; 1');
  /* Cada 150 ms durante 7 s: ¿la fila volvió a aparecer? */
  let volvio = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 7000) {
    if (await evaluar(cli, "!!document.getElementById('rbp-" + ROW + "')")) volvio++;
    await pausa(150);
  }
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return Object.assign(r, { antes, volvio });
}

(async () => {
  console.log('\n== La bandeja de Red con las órdenes de pedido (' + ANCHO + ' px) ==\n');
  for (const accion of ['confirmar', 'cambiar']) {
    const ac = accion === 'confirmar' ? 'redConfirmar' : 'redCambiarVendedor';
    console.log(' · ' + ac);
    let r = await correr('si', accion);
    chk('el pedido estaba en la bandeja antes de tocar', r.antes === true);
    const iP = r.log.indexOf('POST ' + ac + ' (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
    const iG = r.log.indexOf('GET redBandeja', iA);
    chk('prendida: manda su id', iP >= 0, r.log);
    chk('prendida: empuja al aplicador y recién después pide la bandeja', iA > iP && iG > iA, r.log);
    if (accion === 'confirmar') chk('prendida: la fila confirmada no vuelve a aparecer nunca', r.volvio === 0, r.volvio + ' muestras con la fila');
    chk('sin errores de consola', JSON.stringify(r.err) === '[]', r.err);
    r = await correr('no', accion);
    chk('apagada: ningún pedidosFuenteAplicar', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.indexOf('GET redBandeja') > -1, r.log);
    if (accion === 'confirmar') chk('apagada: la fila tampoco vuelve', r.volvio === 0, r.volvio);
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
