/* CORTE, PARTE 1: LAS PANTALLAS NO LEEN LA PLANILLA (2/11/2026).
     BASE=http://localhost:<puerto> [APP=app_viejo_tmp.html] node _tools/pruebas/probar_parte1_sin_planilla.js <token> [390|1440]
   Sesión real; TODO lo que va a Apps Script (script.google.com) se anota y se contesta vacío, y las RPC de la base que
   se prueban se contestan simuladas (la base y la planilla no se tocan). Sostiene:
     · las mermas del EERR (326) con «mermas=si» van a `mermas_pantalla`, NO a Apps Script;
     · el buscador de clientes de Ruta con CRM_BASE_ARMA en «si» va a `crm_foto_pantalla('crmClientes')`, NO a Apps Script,
       y si la base no contesta cae a Apps Script;
     · después de una escritura NO sale el precalentado a Apps Script;
     · `load()` NO pide `action=admin` (dado de baja).
   Con el front de antes (APP) da MAL. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080', APP = process.env.APP || 'app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 500))); };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
const EXTRA = `window.__apps=[]; window.__rpc=[]; window.__baseFalla=false; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){p[k]=window.__palForzar[k];});}catch(e){}},200);
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var s=String((u&&u.url)||u||'');
    var m=/\\/rpc\\/(mermas_pantalla|crm_foto_pantalla)/.exec(s);
    if(m){ window.__rpc.push(m[1]); if(window.__baseFalla)return Promise.resolve(new Response('{}',{status:500}));
      var d=m[1]==='mermas_pantalla'?{ok:true,mermas:[{id:'P-PRUEBA',abbr:'CCo',corte:'Colita',kg:1,ckg:1000,iso:'2026-11-01',nota:'Merma: prueba'}]}
        :{clientes:[{key:'5490000000000',nombre:'Cliente Prueba Base',tel:'5490000000000',barrio:'Prueba',pedidos:3}]};
      return Promise.resolve(new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}})); }
    if(/script\\.google(usercontent)?\\.com/.test(s)){ var a=(/[?&]action=([A-Za-z_]+)/.exec(s)||[])[1]||''; if(!a&&x&&x.body){try{a='POST:'+JSON.parse(x.body).action;}catch(e){}}
      window.__apps.push(a);
      /* Las que no se miden (sbToken, miSesion, las lecturas de arranque) van al Apps Script de verdad: son GET. Un POST nunca. */
      if(!/^(crmClientes|mermas|admin|pedidosLight|cajaLight|ventas|entregas|busqueda)$/.test(a)&&!(x&&String(x.method||'').toUpperCase()==='POST'))return o.apply(this,arguments);
      var r=a==='crmClientes'?{clientes:[{nombre:'Cliente Apps',tel:'1',pedidos:1}]}:a==='mermas'?{ok:true,mermas:[]}:{ok:true};
      return Promise.resolve(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); }
    return o.apply(this,arguments); }; })();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== CORTE · parte 1: las pantallas no leen la planilla · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, 'typeof window.go==="function" && !!window._sbPerm')) { console.log('el ERP no arrancó'); process.exit(1); }
  await pausa(3000);
  // Mermas
  await evaluar(cli, `window.__palForzar.lecArma=Object.assign({}, (window._sbPerm.pal||{}).lecArma||{}, {mermas:'si'}); 1`); await pausa(500);
  await evaluar(cli, `__apps.length=0; __rpc.length=0; _MERMAS_T=0; _MERMAS_VUELO=false; _mermasCargar(); 1`); await pausa(1500);
  let x = await evaluar(cli, `({apps:__apps.slice(), rpc:__rpc.slice(), m:(window._MERMAS||[]).map(function(m){return m.id;})})`);
  chk('mermas con «mermas=si»: van a mermas_pantalla y NO a Apps Script', x.rpc.includes('mermas_pantalla') && !x.apps.includes('mermas') && x.m[0] === 'P-PRUEBA', x);
  // Buscador de clientes de Ruta
  await evaluar(cli, 'go("ruta")'); await esperar(cli, 'typeof window.npFetchClientes==="function"', 60000);
  await evaluar(cli, `window.__palForzar.crmArma='si'; 1`); await pausa(500);
  await evaluar(cli, `__apps.length=0; __rpc.length=0; npFetchClientes(true); 1`); await pausa(2000);
  x = await evaluar(cli, `({apps:__apps.slice(), rpc:__rpc.slice(), de:window.__npClientesDe})`);
  chk('buscador de Ruta con CRM_BASE_ARMA=si: va a crm_foto_pantalla y NO a Apps Script', x.rpc.includes('crm_foto_pantalla') && !x.apps.includes('crmClientes') && x.de === 'base', x);
  await evaluar(cli, `__apps.length=0; __rpc.length=0; __baseFalla=true; npFetchClientes(true); 1`); await pausa(2000);
  x = await evaluar(cli, `({apps:__apps.slice(), rpc:__rpc.slice(), de:window.__npClientesDe})`);
  chk('  si la base no contesta: cae a Apps Script (lite)', x.rpc.includes('crm_foto_pantalla') && x.apps.includes('crmClientes') && x.de === 'apps', x);
  await evaluar(cli, `__baseFalla=false; 1`);
  // Precalentado y load()
  await evaluar(cli, 'go("pedidos")'); await pausa(1500);
  await evaluar(cli, `__apps.length=0; window.__prewarm=null; if(typeof _precalentarTrasEscribir==='function')_precalentarTrasEscribir(); 1`); await pausa(2500);
  x = await evaluar(cli, `({apps:__apps.slice(), pw:window.__prewarm})`);
  chk('después de escribir NO sale el precalentado a Apps Script', !x.pw && !x.apps.some(function (a) { return /^(pedidosLight|cajaLight|ventas|entregas|busqueda)$/.test(a); }), x);
  await evaluar(cli, `__apps.length=0; load(); 1`); await pausa(2500);
  x = await evaluar(cli, `({apps:__apps.slice()})`);
  chk('load() NO pide action=admin (dado de baja)', !x.apps.includes('admin'), x);
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
