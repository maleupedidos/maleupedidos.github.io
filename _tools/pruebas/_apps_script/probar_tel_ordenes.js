/* CAMBIAR EL TELÉFONO CON LAS ÓRDENES DE PEDIDO (4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_tel_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página (una ficha inventada,
   ningún dato real). Las tres pantallas que cambian un teléfono:
   · la ficha del pedido (ordTelefono → crmTelDesdePedido);
   · la ficha del cliente sin teléfono (crmAgregarTel → crmCambiarTelefono);
   · Editar ficha del cliente (crmGuardarMeta → crmCambiarTelefono y DESPUÉS
     crmUpdateClienteMeta contra la key nueva).
   Prendida (`diferida`): el POST lleva su id, después `pedidosFuenteAplicar`, y
   RECIÉN después lo que sigue (reabrir, recargar, o guardar el resto de la ficha:
   si la ficha se guardara antes, quedaria escrita en una identidad que todavía
   no se mudó). Apagada: ningún `pedidosFuenteAplicar`, y lo que sigue sale igual. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const TEL = '1199990003';

const STUB = (modo, sinTel) => `(function(){
  window.__log=[]; var modo=${JSON.stringify(modo)};
  window.prompt=function(){ return ${JSON.stringify(TEL)}; }; window.confirm=function(){ return true; };
  var CLI={key:${JSON.stringify(sinTel ? 'NOMBRE:cliente prueba' : '1199990002')},nombre:'Cliente Prueba',tel:${JSON.stringify(sinTel ? '' : '1199990002')},telDisplay:${JSON.stringify(sinTel ? '' : '1199990002')},countPedidos:2,countEntregados:2,pedidos:[],canales:{},clubes:{},barrios:{},subBarrios:{},domicilios:{},telefonos:[],nombresVariantes:[],topProductos:[],kpis:{vip:false},meta:{},deuda:0,totalCobrado:0,totalFacturado:0,primeraFecha:'',ultimaFecha:''};
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){
      var m=url.match(/action=([A-Za-z]+)/), ac=m?m[1]:'?';
      if(window.__mirar) window.__log.push('GET '+ac);
      if(ac==='crmCliente') return resp({ok:true,cliente:CLI});
      return resp({ok:true,pedidos:[],canales:{},clientes:[]});
    }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action==='crmCambiarTelefono'||b.action==='crmTelDesdePedido'){
        var r={ok:true,telNuevo:b.telNuevo,keyVieja:CLI.key,filas:{Home:2},totalFilas:2,metaFusionada:true};
        if(modo==='si'){ r.aceptada=true; r.diferida=true; r.orden=9; }
        return resp(r);
      }
      if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(ok,800); }).then(function(){ return resp({ok:true,hechas:1,quedan:0}); });
      return resp({ok:true});
    });
  };
})();`;

const CASOS = [
  { nom: 'la ficha del pedido (ordTelefono)', accion: 'crmTelDesdePedido', sinTel: false,
    prep: '1', disparo: "ordTelefono('Home','9001','Cliente Prueba','1199990002')", sigue: (x) => x.indexOf('GET ') === 0 },
  { nom: 'agregar el teléfono (crmAgregarTel)', accion: 'crmCambiarTelefono', sinTel: true,
    prep: "go('estancias'); setTimeout(function(){crmOpenCliente(encodeURIComponent('NOMBRE:cliente prueba'));},1500); 1",
    listo: "!!document.querySelector('#crmDrawerBody .crm-ficha-name')",
    disparo: 'crmAgregarTel()', sigue: (x) => x === 'GET crmCliente' },
  { nom: 'Editar ficha (crmGuardarMeta)', accion: 'crmCambiarTelefono', sinTel: false,
    prep: "go('estancias'); setTimeout(function(){crmOpenCliente(encodeURIComponent('1199990002'));},1500); 1",
    listo: "!!document.querySelector('#crmDrawerBody .crm-ficha-name')",
    disparo: "crmEditarMeta(); document.getElementById('metaTel').value=" + JSON.stringify(TEL) + '; crmGuardarMeta()', sigue: (x) => x === 'POST crmUpdateClienteMeta' }
];

async function correr(modo, caso) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo, caso.sinTel) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function' && typeof _pfAplicar==='function'")) break; await pausa(250); }
  await pausa(2500);
  await evaluar(cli, caso.prep);
  let listo = true;
  if (caso.listo) { listo = false; for (let i = 0; i < 60; i++) { if ((listo = await evaluar(cli, caso.listo))) break; await pausa(250); } }
  await pausa(800);
  await evaluar(cli, 'window.__confirmDevuelve=true; window.confirm=function(){return true;}; window.prompt=function(){return ' + JSON.stringify(TEL) + ';}; window.__mirar=1; window.__log=[]; try{' + caso.disparo + ';}catch(e){window.__log.push("EXPLOTO "+e.message);} 1');
  await pausa(4500);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return Object.assign(r, { listo });
}

(async () => {
  console.log('\n== Cambiar el teléfono con las órdenes de pedido (' + ANCHO + ' px) ==');
  for (const caso of CASOS) {
    console.log('\n · ' + caso.nom);
    let r = await correr('si', caso);
    chk('la pantalla quedó lista', r.listo === true);
    const iP = r.log.indexOf('POST ' + caso.accion + ' (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
    const iS = r.log.findIndex((x, i) => i > iP && caso.sigue(x));
    chk('prendida: el cambio manda su id', iP >= 0, r.log);
    chk('prendida: empuja al aplicador y recién después sigue', iA > iP && iS > iA, r.log);
    chk('prendida: sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
    r = await correr('no', caso);
    const iP2 = r.log.indexOf('POST ' + caso.accion + ' (id)');
    chk('apagada: ningún pedidosFuenteAplicar, y sigue igual', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.findIndex((x, i) => i > iP2 && caso.sigue(x)) > iP2, r.log);
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
