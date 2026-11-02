/* RUTA › COBROS › «Recibí de …» (el cobro al representante) POR LA BASE (322, 2/11/2026).
     BASE=http://localhost:<puerto> [APP=app_viejo_tmp.html] node _tools/pruebas/probar_cobro_representante.js <token> [390|1440]
   Sesión real; todo POST interceptado (la RPC y Apps Script): no se escribe nada. La base simulada contesta 'ok', 'nodirecto',
   'corte' o 'freno' (supera el saldo). Sostiene: con RENDICION_DIRECTO va a red_cobro_directo y NO a Apps Script, sin
   tapar la pantalla (el loader recién a los 400 ms; Apps Script demorado 3 s lo muestra); con directo:false o un corte, a
   Apps Script con el MISMO clientOpId; el freno de la base llega a la pantalla tal cual (alert) y no se pregunta a Apps
   Script; con la palanca apagada, ni se llama a la base. Con el ruta.html de antes (APP) da MAL: iba directo a Apps Script. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080', APP = process.env.APP || 'app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 500))); };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
const EXTRA = `window.__envios=[]; window.__base=[]; window.__alerts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  window.alert=function(m){window.__alerts.push(String(m));}; window.confirm=function(){return true;};
  window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){p[k]=window.__palForzar[k];});}catch(e){}},200);
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var s=String((u&&u.url)||u||''), b=x&&x.body?String(x.body):'';
    if(/\\/rpc\\/(red_cobro_directo|red_carne_pend_directo|red_cerrar_rendidos_directo)/.test(s)){ var p=JSON.parse(b).p; window.__envios.push({a:'base',acc:p.action,id:p.clientOpId||String(p.ts||'')}); var r=window.__base.shift()||'ok';
      if(r==='corte')return Promise.reject(new TypeError('Failed to fetch'));
      var d=r==='nodirecto'?{ok:false,directo:false,motivo:'pendiente'}:r==='freno'?{ok:false,err:'El monto ($90000) supera el saldo pendiente ($80000)',saldoPendiente:80000}
        :{ok:true,aceptada:true,directo:true,orden:1,diferida:false,updated:1,pedidosPendientes:1,total:1000,saldoPendiente:0,parcial:false,semanas:1,detalle:[]};
      return Promise.resolve(new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}})); }
    if(x&&String(x.method||'').toUpperCase()==='POST'&&/cobrarVendedorRed|entregarCarnePendiente|cerrarRendidosRed/.test(b)){ var q=JSON.parse(b); window.__envios.push({a:'apps',acc:q.action,id:q.clientOpId||String(q.ts||'')});
      return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify({ok:true,updated:1,total:1000,saldoPendiente:0}),{status:200,headers:{'Content-Type':'application/json'}})); },3000); }); }
    return o.apply(this,arguments); }; })();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== RUTA · el cobro al representante por la base · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, 'typeof window.go==="function" && !!window._sbPerm')) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("ruta")'); await pausa(1500);
  chk('Ruta arranca (cobrarVendedorRed)', await esperar(cli, 'typeof window.cobrarVendedorRed==="function"', 60000));
  const pal = (o) => evaluar(cli, `window.__palForzar.directas=${JSON.stringify(o)}; 1`).then(() => pausa(400));
  /* Un cobro: devuelve qué salió, si el loader tapó y en cuánto. */
  const cobrar = (r, espera) => evaluar(cli, `new Promise(function(fin){ window.__envios=[]; window.__alerts=[]; window.__base=${JSON.stringify(r)};
    var el=document.getElementById('rutLoaderOverlay'), tapa=0, t0=performance.now();
    var iv=setInterval(function(){ if(el&&el.classList.contains('visible')&&!tapa)tapa=Math.round(performance.now()-t0); },16);
    cobrarVendedorRed('Vendedor Prueba',1000,0,true,'','Tadeo Ustariz');
    setTimeout(function(){ clearInterval(iv); fin({e:window.__envios,tapa:tapa,alerts:window.__alerts}); }, ${espera}); })`);
  await pal({ cobrarVendedorRed: true });
  let x = await cobrar(['ok'], 1500);
  chk('prendida: va a red_cobro_directo y NO a Apps Script', x.e.length === 1 && x.e[0].a === 'base' && x.e[0].acc === 'cobrarVendedorRed' && /^cvr_/.test(x.e[0].id), x);
  chk('  sin tapar la pantalla', x.tapa === 0, x.tapa + ' ms');
  x = await cobrar(['nodirecto'], 4500);
  const b1 = x.e.find((y) => y.a === 'base'), a1 = x.e.find((y) => y.a === 'apps');
  chk('directo:false (algo de Red pendiente): Apps Script con el MISMO clientOpId', b1 && a1 && b1.id === a1.id, x);
  chk('  y ahí sí aparece el loader (Apps Script tarda)', x.tapa >= 380, x.tapa + ' ms');
  x = await cobrar(['corte'], 4500);
  const b2 = x.e.find((y) => y.a === 'base'), a2 = x.e.find((y) => y.a === 'apps');
  chk('un corte de la base: Apps Script con el MISMO clientOpId', b2 && a2 && b2.id === a2.id, x);
  x = await cobrar(['freno'], 1500);
  chk('el freno de la base (supera el saldo) llega a la pantalla y NO se pregunta a Apps Script',
    x.e.length === 1 && x.e[0].a === 'base' && x.alerts.some((m) => /supera el saldo pendiente/.test(m)), x);
  /* (323) «Ya se la di»: la carne que no fue con la bolsa. */
  const carne = (r, espera) => evaluar(cli, `new Promise(function(fin){ window.__envios=[]; window.__base=${JSON.stringify(r)};
    var el=document.getElementById('rutLoaderOverlay'), tapa=0, t0=performance.now();
    var iv=setInterval(function(){ if(el&&el.classList.contains('visible')&&!tapa)tapa=Math.round(performance.now()-t0); },16);
    rutCarnePendDar(9007,'Vendedor Prueba');
    setTimeout(function(){ clearInterval(iv); fin({e:window.__envios,tapa:tapa}); }, ${espera}); })`);
  await pal({ entregarCarnePendiente: true });
  x = await carne(['ok'], 1500);
  chk('«Ya se la di» prendida: va a red_carne_pend_directo, NO a Apps Script, sin tapar', x.e.length === 1 && x.e[0].a === 'base' && x.e[0].acc === 'entregarCarnePendiente' && x.tapa === 0, x);
  x = await carne(['nodirecto'], 4500);
  const b3 = x.e.find((y) => y.a === 'base'), a3 = x.e.find((y) => y.a === 'apps');
  chk('  directo:false: Apps Script con el MISMO ts (el mismo id de orden)', b3 && a3 && b3.id && b3.id === a3.id, x);
  /* (324) Cerrar los rendidos NO se prueba acá: rutCerrarRendidos busca al representante en _rutSinCerrar, que vive en la
     sub-app y se llena de tres fuentes (foto, lectura, Apps Script); la copia de window no sirve para sembrarlo. */
  await pal({});
  x = await carne(['ok'], 4500);
  chk('  apagada: Apps Script y ni se llama a la base', x.e.length === 1 && x.e[0].a === 'apps', x);
  x = await cobrar(['ok'], 4500);
  chk('apagada: Apps Script y ni se llama a la base', x.e.length === 1 && x.e[0].a === 'apps', x);
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
