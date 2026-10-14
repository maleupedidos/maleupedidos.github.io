/* MÁS ACCIONES DEL PANEL CON LAS ÓRDENES DE PEDIDO (4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_panel_ordenes2.js [390|1440] [caso]

   Sin token y con Apps Script SIMULADO adentro de la página. Por caso, se dispara la
   acción como lo hace el botón y se mira el orden de lo que sale:
   · prendida (la base contesta `diferida`): el POST lleva `clientOpId`, después
     `pedidosFuenteAplicar`, y RECIÉN después lo que la pantalla vuelve a pedir;
   · apagada: ningún `pedidosFuenteAplicar`, y vuelve a pedir igual.
   Los casos se van sumando a medida que cada acción pasa a ser una orden. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
const SOLO = process.argv[3] || '';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

/* `resp`: lo que contesta el backend simulado a la acción; `sigue`: el GET que la
   pantalla tiene que pedir DESPUÉS del aplicador. */
const CASOS = [
  { id: 'trajo', nom: 'quién trajo al cliente (ficha del pedido de Red)', accion: 'redTrajoCliente',
    resp: { ok: true, valor: 'Maleu', row: 121, comision: { pendiente: true } },
    disparo: "_ordTrajoCliente(121,'Maleu')", sigue: 'pedidosLight' }
];

const STUB = (modo, caso) => `(function(){
  window.__log=[]; var modo=${JSON.stringify(modo)}, RESP=${JSON.stringify(caso.resp)}, ACC=${JSON.stringify(caso.accion)};
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){ var m=url.match(/action=([A-Za-z]+)/); if(window.__mirar) window.__log.push('GET '+(m?m[1]:'?')); return resp({ok:true,pedidos:[],canales:{},pendientes:[],vendedores:[],recientes:[],horas:2}); }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action===ACC){ var r=JSON.parse(JSON.stringify(RESP)); if(modo==='si'){r.aceptada=true;r.diferida=true;r.orden=9;} return resp(r); }
      if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(ok,800); }).then(function(){ return resp({ok:true,hechas:1,quedan:0}); });
      return resp({ok:true});
    });
  };
})();`;

async function correr(modo, caso) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo, caso) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  const fn = caso.disparo.match(/^([A-Za-z_$]+)\(/)[1];
  let listo = false;
  for (let i = 0; i < 120; i++) { if ((listo = await evaluar(cli, "typeof " + fn + "==='function' && typeof _pfAplicar==='function'"))) break; await pausa(250); }
  await pausa(3000);
  await evaluar(cli, "window.__mirar=1; window.__log=[]; window.__confirmDevuelve=true; window.confirm=function(){return true;}; try{" + caso.disparo + ";}catch(e){window.__log.push('EXPLOTO '+e.message);} 1");
  await pausa(4500);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return Object.assign(r, { listo });
}

(async () => {
  console.log('\n== Más acciones del panel con las órdenes de pedido (' + ANCHO + ' px) ==');
  for (const caso of CASOS.filter((c) => !SOLO || c.id === SOLO)) {
    console.log('\n · ' + caso.nom);
    let r = await correr('si', caso);
    chk('la función existe', r.listo === true);
    const iP = r.log.indexOf('POST ' + caso.accion + ' (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
    const iG = r.log.indexOf('GET ' + caso.sigue, iA);
    chk('prendida: manda su id', iP >= 0, r.log);
    chk('prendida: empuja al aplicador y recién después pide ' + caso.sigue, iA > iP && iG > iA, r.log);
    chk('sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
    r = await correr('no', caso);
    const iP2 = r.log.indexOf('POST ' + caso.accion + ' (id)');
    chk('apagada: ningún pedidosFuenteAplicar, y pide ' + caso.sigue + ' igual', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.indexOf('GET ' + caso.sigue, iP2) > iP2, r.log);
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
