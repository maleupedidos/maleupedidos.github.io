/* CRM: LA BASE ES LA FUENTE, el front (15/10/2026).

     BASE=http://localhost:8163 node _tools/pruebas/probar_crm_ordenes_front.js [390|1440]

   Las diez escrituras del CRM que pueden ir como orden se resuelven en el
   interceptor de fetch (`_CRM_ORDEN`), no pantalla por pantalla. Sin `?prueba=1`
   (con prueba=1 el interceptor no se instala) y con Apps Script SIMULADO adentro
   de la página: una sesión inventada, ningún dato real, ningún viaje a producción.
   · prendida (`diferida`): el POST sale con su `clientOpId`, después
     `pedidosFuenteAplicar`, y RECIÉN después la pantalla recibe la respuesta;
   · apagada: el POST sale con su id igual, y ningún `pedidosFuenteAplicar`;
   · si el aplicador no contesta, la respuesta sale igual (con reloj);
   · un POST que no es del CRM no recibe id. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8163';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const API = 'https://script.google.com/macros/s/PRUEBA/exec';

const STUB = (modo, aplicadorMs) => `(function(){
  try{ localStorage.setItem('maleu_token','tok-prueba');
       localStorage.setItem('maleu_panel_session', JSON.stringify({usuario:'prueba',rol:'admin',nombre:'Prueba',ts:Date.now()})); }catch(e){}
  window.__log=[]; var modo=${JSON.stringify(modo)};
  window.alert=function(){}; window.confirm=function(){ return true; };
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST') return resp({ok:true,pedidos:[],canales:{},clientes:[],interacciones:[],leads:[]});
    var t=(x&&typeof x.body==='string')?x.body:'';
    var b={}; try{ b=JSON.parse(t); }catch(e){}
    if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id '+String(b.clientOpId).slice(0,4)+')':'')+(b.token?' (token)':''));
    if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(ok,${aplicadorMs}); }).then(function(){ window.__log.push('APLICADO'); return resp({ok:true,hechas:1,quedan:0}); });
    var r={ok:true,tel:b.tel||''};
    if(modo==='si' && b.clientOpId){ r.aceptada=true; r.diferida=true; r.orden=7; }
    return resp(r);
  };
})();`;

async function correr(modo, accion, aplicadorMs) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo, aplicadorMs || 600) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  await pausa(2500);
  await evaluar(cli, `window.__mirar=1; window.__log=[];
    fetch(${JSON.stringify(API)},{method:'POST',body:JSON.stringify({action:${JSON.stringify(accion)},tel:'1199990002',notas:'x'})})
      .then(function(r){ return r.json(); }).then(function(j){ window.__log.push('RESPUESTA '+(j.diferida?'diferida':'')+(j.ok?' ok':'')); })
      .catch(function(e){ window.__log.push('EXPLOTO '+e.message); }); 1`);
  await pausa((aplicadorMs || 600) + 2500);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5), ordenes: window.__crmOrdenes||0 })');
  cli.matar();
  return r;
}

(async () => {
  console.log('\n== Las órdenes del CRM en el interceptor (' + ANCHO + ' px) ==');
  for (const accion of ['crmSetNotasTags', 'crmLeadSet', 'crmLogInteraccion']) {
    console.log('\n · ' + accion);
    let r = await correr('si', accion);
    const iP = r.log.findIndex((x) => x.indexOf('POST ' + accion + ' (id crm_)') === 0);
    const iA = r.log.indexOf('POST pedidosFuenteAplicar (token)'), iAp = r.log.indexOf('APLICADO'), iR = r.log.findIndex((x) => x.indexOf('RESPUESTA') === 0);
    chk('prendida: sale con su clientOpId y el token', iP >= 0 && /\(token\)/.test(r.log[iP]), r.log);
    chk('prendida: empuja al aplicador, y la pantalla recibe la respuesta recién después', iA > iP && iAp > iA && iR > iAp, r.log);
    chk('prendida: sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
    r = await correr('no', accion);
    chk('apagada: sale con id, ningún aplicador, y la respuesta llega', r.log.some((x) => x.indexOf('POST ' + accion + ' (id crm_)') === 0) && r.log.indexOf('POST pedidosFuenteAplicar (token)') < 0 && r.log.some((x) => x.indexOf('RESPUESTA') === 0), r.log);
  }
  console.log('\n · el aplicador colgado');
  let r = await correr('si', 'crmSetNotasTags', 40000);
  {
    const iR = r.log.findIndex((x) => x.indexOf('RESPUESTA') === 0), iAp = r.log.indexOf('APLICADO');
    chk('la respuesta sale al vencer el reloj (25 s), antes de que el aplicador de 40 s conteste', iR >= 0 && (iAp < 0 || iR < iAp), r.log);
  }
  console.log('\n · un POST que no es del CRM');
  r = await correr('si', 'gasto');
  chk('no recibe clientOpId del interceptor', r.log.some((x) => x === 'POST gasto (token)'), r.log);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
