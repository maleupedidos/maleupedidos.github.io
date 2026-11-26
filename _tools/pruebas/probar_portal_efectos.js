/* MI PORTAL › LO QUE HACE ABRIR EL PORTAL, POR LA BASE (329, 2/11/2026).
     BASE=http://localhost:<puerto> [APP=…] node _tools/pruebas/probar_portal_efectos.js <token>
   Sesión real; la RPC y el GET a Apps Script (`dashboardVendedorEfectos`, que ESCRIBE) interceptados: no se toca nada.
   Sostiene: con PORTAL_EFECTOS_DIRECTO `_dvEfectos` va a red_portal_efectos_directo con las tareas del motor ({id, n}) y el
   «por venta», y NO a Apps Script; si la base dice directo:false (o se corta), Apps Script como siempre; apagada, ni la base.
   Con el red.html de antes da MAL. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2];
const BASE = process.env.BASE || 'http://localhost:8080', APP = process.env.APP || 'app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 500))); };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
const EXTRA = `window.__envios=[]; window.__base=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){p[k]=window.__palForzar[k];});}catch(e){}},200);
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var s=String((u&&u.url)||u||''), b=x&&x.body?String(x.body):'';
    if(/\\/rpc\\/red_portal_efectos_directo/.test(s)){ var p=JSON.parse(b).p; window.__envios.push({a:'base',p:p}); var r=window.__base.shift()||'ok';
      if(r==='corte')return Promise.reject(new TypeError('Failed to fetch'));
      var d=r==='nodirecto'?{ok:false,directo:false,motivo:'palanca'}:{ok:true,directo:true,hecho:{}};
      return Promise.resolve(new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}})); }
    if(/action=dashboardVendedorEfectos/.test(s)){ window.__envios.push({a:'apps'}); return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}})); }
    return o.apply(this,arguments); }; })();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== MI PORTAL · los efectos por la base · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, 'typeof window.go==="function" && !!window._sbPerm')) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("miportal")');
  chk('Mi Portal arranca (_dvEfectos)', await esperar(cli, 'typeof window._dvEfectos==="function"', 60000));
  const D = `{base:'ef', tareas:{lista:[{id:'cobrar',items:[1,2]},{id:'segunda',items:[]}]}, objetivo:{porVenta:15000}}`;
  const ef = (r) => evaluar(cli, `window.__envios=[]; window.__base=${JSON.stringify(r)}; _dvEfectos(${D}, 'Vendedor Prueba'); 1`).then(() => pausa(4000)).then(() => evaluar(cli, 'window.__envios'));
  await evaluar(cli, `window.__palForzar.directas={redPortalEfectos:true}; 1`); await pausa(500);
  let e = await ef(['ok']);
  chk('prendida: va a red_portal_efectos_directo con las tareas {id, n} y el por venta, NO a Apps Script',
    e.length === 1 && e[0].a === 'base' && JSON.stringify(e[0].p.tareas) === '[{"id":"cobrar","n":2},{"id":"segunda","n":1}]' && e[0].p.porVenta === 15000 && /^pe_/.test(e[0].p.clientOpId), e);
  e = await ef(['nodirecto']);
  chk('la base dice directo:false: Apps Script como siempre', e.length === 2 && e[0].a === 'base' && e[1].a === 'apps', e);
  e = await ef(['corte']);
  chk('un corte de la base: Apps Script', e.some((x) => x.a === 'apps'), e);
  await evaluar(cli, `window.__palForzar.directas={}; 1`); await pausa(500);
  e = await ef(['ok']);
  chk('apagada: Apps Script y ni se llama a la base', e.length === 1 && e[0].a === 'apps', e);
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
