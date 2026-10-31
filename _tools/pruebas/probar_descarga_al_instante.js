/* RUTA › «Descargué todo» AL INSTANTE (31/10/2026).
     BASE=http://localhost:<puerto> [APP=app_viejo_tmp.html] node _tools/pruebas/probar_descarga_al_instante.js <token> [390|1440]
   El auto con mercadería INVENTADA (el repo es público) y el POST demorado 3 s. Sostiene que la card del depósito se
   va al toque y sin loader, que la descarga queda en la cola, que un refresco con el POST en viaje NO la trae de vuelta,
   que al confirmar se avisa «Descarga guardada», y que si el servidor la rechaza la card vuelve. Con el ruta.html de
   antes (APP) da MAL: tapaba la pantalla hasta que contestaba Apps Script. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080', APP = process.env.APP || 'app.html', DEMORA = 3000;
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
const PGS = { ok: true, deposito: [{ abbr: 'PMu', qty: 4, rows: [90501, 90502] }], pedidos: [], atrasado: null };
const EXTRA = `window.__posts=[]; window.__rechazar=false; window.__toasts=[];
  /* La lectura de pendientes va a Apps Script (stubbeada): las otras lecturas siguen por la base. */
  (function(){ var real; Object.defineProperty(window,'LEC_ARMA',{configurable:false,get:function(){ if(!real||typeof real!=='object')return real; var o=Object.assign({},real); delete o.pendientesGuardarStock; return o; },set:function(v){ real=v; }}); })();
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||'');
    if(x&&String(x.method||'').toUpperCase()==='POST'){ var b={}; try{b=JSON.parse(x.body);}catch(e){} window.__posts.push(b);
      var r=(b.action==='marcarGuardadoEnStock'&&window.__rechazar)?{ok:false,sinReintento:true,err:'rechazada a propósito'}:{ok:true,n:2,stock:{PMu:true}};
      if(b.action==='marcarGuardadoEnStock'&&!window.__rechazar)window.__descargado=true;
      return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); }, ${DEMORA}); }); }
    if(url.indexOf('action=pendientesGuardarStock')>-1) return Promise.resolve(new Response(JSON.stringify(window.__descargado?{ok:true,deposito:[],pedidos:[]}:(window.__tanda2?${JSON.stringify(Object.assign({}, PGS, { deposito: [{ abbr: 'PMu', qty: 4, rows: [90601, 90602] }] }))}:${JSON.stringify(PGS)})),{status:200,headers:{'Content-Type':'application/json'}}));
    if(url.indexOf('action=entregas')>-1) return Promise.resolve(new Response(JSON.stringify({ts:Date.now(),e:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
    return o.apply(this,arguments); }; })();
  window.confirm=function(){return true;};
  try{ localStorage.removeItem('maleu_ruta'); localStorage.removeItem('maleu_pgs_v1'); }catch(e){}`;
const HAY_DEP = `getSorted().some(function(x){return x&&x._depAgg;})`;
const TOQUE = (filas) => `new Promise(function(fin){
  var tap=0, t0=performance.now(), el=document.getElementById('rutLoaderOverlay');
  var iv=setInterval(function(){ if(el&&el.classList.contains('visible'))tap=performance.now()-t0; },16);
  confirmarGuardadoStock('${filas}',1,4,0);
  (function mira(){ var fuera=false; try{ fuera=!${HAY_DEP}; }catch(e){}
    if(fuera){ requestAnimationFrame(function(){ var ms=performance.now()-t0; clearInterval(iv); fin({ms:Math.round(ms),tapa:Math.round(tap)}); }); return; }
    if(performance.now()-t0>12000){ clearInterval(iv); fin({ms:-1,tapa:Math.round(tap)}); return; }
    requestAnimationFrame(mira); })();
})`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  if (ANCHO < 500) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== RUTA · Descargué todo al instante · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("ruta")'); await pausa(1500);
  await evaluar(cli, 'switchTab("ruta");fetchPendientesGuardarStock(true)');
  chk('aparece la card del depósito', await esperar(cli, HAY_DEP, 30000));
  const r = await evaluar(cli, TOQUE('90501,90502'));
  chk('la card se va al toque (' + r.ms + ' ms, tope 300)', r.ms >= 0 && r.ms <= 300, r);
  chk('  sin tapar la pantalla', r.tapa === 0, r.tapa + ' ms');
  const cola = await evaluar(cli, `JSON.stringify((JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).map(function(x){return x.action;}))`);
  chk('  la descarga queda en la cola', /marcarGuardadoEnStock/.test(cola), cola);
  chk('  el aviso de arriba dice «Guardando…»', /Guardando… Descarga al freezer/.test(await evaluar(cli, `document.getElementById('syncBanner').textContent`)), await evaluar(cli, `document.getElementById('syncBanner').textContent`));
  await evaluar(cli, '_pgsUltimo=0;fetchPendientesGuardarStock(true)'); await pausa(900);
  chk('un refresco con el POST en viaje no la trae de vuelta', !(await evaluar(cli, HAY_DEP)));
  await pausa(DEMORA + 1500);
  const posts = await evaluar(cli, `JSON.stringify(__posts.filter(function(b){return b.action==='marcarGuardadoEnStock';}).map(function(b){return b.rows;}))`);
  chk('salió UNA descarga con las dos filas', posts === '[[90501,90502]]', posts);
  chk('al confirmar, la cola queda vacía', await evaluar(cli, `(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).length===0`));
  chk('  y la card no vuelve', !(await evaluar(cli, HAY_DEP)));
  // El rechazo: otra tanda, que el servidor no acepta.
  await evaluar(cli, `__descargado=false;__rechazar=true;__tanda2=true;_pgsUltimo=0;fetchPendientesGuardarStock(true)`);
  chk('(otra tanda) la card vuelve a aparecer', await esperar(cli, HAY_DEP, 15000));
  await evaluar(cli, TOQUE('90601,90602'));
  chk('  se va al toque', !(await evaluar(cli, HAY_DEP)));
  chk('si el servidor la rechaza, la card vuelve', await esperar(cli, HAY_DEP, DEMORA + 8000));
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
