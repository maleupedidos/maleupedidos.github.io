/* RUTA › «Le di la bolsa a…» AL INSTANTE (2/11/2026).
     BASE=http://localhost:<puerto> [APP=app_viejo_tmp.html] node _tools/pruebas/probar_bolsa_al_instante.js <token> [390|1440]
   Un representante con dos pedidos INVENTADOS (el repo es público) y TODO POST demorado 3 s (también la RPC a la base:
   la planilla y la base no se tocan). Sostiene que la bolsa sale de Ruta al toque y sin loader, que queda en la cola con
   las dos filas, que un refresco con el POST en viaje NO la trae de vuelta, que al confirmar sale UNA sola vez, y que si
   el servidor la rechaza la bolsa vuelve. Con el ruta.html de antes (APP) da MAL: el loader tapaba hasta que contestaba. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080', APP = process.env.APP || 'app.html', DEMORA = 3000;
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const base = o => Object.assign({ oD: {}, oc: [], hr: '10:30', f: dmy(hoyAR), de: DIAS[hoyAR.getDay()], fe: iso(hoyAR), es: 'Pendiente', d: '', t: '', ep: 'No Cobrado', fp: 'Transferencia', b: 'Pilara', sb: 'Pilara', l: '', retira: 'Vendedor Prueba' }, o);
const ENTREGAS = [
  base({ id: 9107, h: 'Red', r: 9007, c: 'Cliente Red Uno', o: 'Deposito', $: 30000, p: [{ a: 'PPM', q: 2 }] }),
  base({ id: 9108, h: 'Red', r: 9008, c: 'Cliente Red Dos', o: 'Deposito', $: 22000, p: [{ a: 'SE', q: 2 }] })
];
const EXTRA = `window.__posts=[]; window.__rechazar=false; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||'');
    if(x&&String(x.method||'').toUpperCase()==='POST'){ var b={}; try{b=JSON.parse(x.body);}catch(e){} if(b&&b.p&&!b.action)b=Object.assign({__rpc:url.split('/rpc/')[1]},b.p); window.__posts.push(b);
      var bolsa=b.action==='marcarEntregadoAVendedor', rep=b.action==='reprogramarEntrega';
      var r=(bolsa&&window.__rechazar)?{ok:false,sinReintento:true,err:'rechazada a propósito'}:{ok:true,n:(b.rows||[]).length};
      /* (325) Reprogramar: la base contesta al toque; Apps Script, demorado (para ver si el loader aparece). */
      if(rep)r={ok:true,directo:!!b.__rpc,movidos:(b.pedidos||[]).length,fecha:b.fecha,resultados:(b.pedidos||[]).map(function(p){return {ok:true,hoja:p.hoja,id:p.id};})};
      if(rep&&b.__rpc&&window.__repNoDirecto)r={ok:false,directo:false,motivo:'pendiente'};
      return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); }, (bolsa||(rep&&!b.__rpc))?${DEMORA}:0); }); }
    if(url.indexOf('action=entregas')>-1) return Promise.resolve(new Response(JSON.stringify({ts:Date.now(),e:${JSON.stringify(ENTREGAS)}}),{status:200,headers:{'Content-Type':'application/json'}}));
    if(url.indexOf('action=pendientesGuardarStock')>-1) return Promise.resolve(new Response('{"ok":true,"deposito":[],"pedidos":[]}',{status:200,headers:{'Content-Type':'application/json'}}));
    return o.apply(this,arguments); }; })();
  window.confirm=function(){return true;};
  window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){p[k]=window.__palForzar[k];});}catch(e){}},200);
  try{ localStorage.removeItem('maleu_ruta'); }catch(e){}`;
const HAY = `getSorted().some(function(x){return x&&x._redAgg&&/Vendedor Prueba/.test(x._vendedor||'');})`;
const TOQUE = `new Promise(function(fin){
  var tap=0, t0=performance.now(), el=document.getElementById('rutLoaderOverlay');
  var iv=setInterval(function(){ if(el&&el.classList.contains('visible'))tap=performance.now()-t0; },16);
  entregarAVendedor('Red|R9007,Red|R9008','','Vendedor Prueba');
  (function mira(){ var fuera=false; try{ fuera=!${HAY}; }catch(e){}
    if(fuera){ requestAnimationFrame(function(){ var ms=performance.now()-t0; clearInterval(iv); fin({ms:Math.round(ms),tapa:Math.round(tap)}); }); return; }
    if(performance.now()-t0>12000){ clearInterval(iv); fin({ms:-1,tapa:Math.round(tap)}); return; }
    requestAnimationFrame(mira); })();
})`;
const BOLSAS = `JSON.stringify(__posts.filter(function(b){return b.action==='marcarEntregadoAVendedor';}).map(function(b){return (b.__rpc||'apps')+':'+JSON.stringify(b.rows)+':'+b.ts;}))`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  if (ANCHO < 500) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== RUTA · la bolsa al representante al instante · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("ruta")'); await pausa(1500);
  await evaluar(cli, 'switchTab("ruta");refresh(true,false)');
  chk('aparece la bolsa del representante', await esperar(cli, HAY, 30000));
  const r = await evaluar(cli, TOQUE);
  chk('la bolsa sale de Ruta al toque (' + r.ms + ' ms, tope 300)', r.ms >= 0 && r.ms <= 300, r);
  chk('  sin tapar la pantalla', r.tapa === 0, r.tapa + ' ms');
  const cola = await evaluar(cli, `JSON.stringify((JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).map(function(x){return x.action+':'+JSON.stringify(x.rows);}))`);
  chk('  la bolsa queda en la cola con las dos filas', /marcarEntregadoAVendedor:\[9007,9008\]/.test(cola), cola);
  chk('  el aviso de arriba dice «Guardando… Bolsa al representante»', /Guardando… Bolsa al representante/.test(await evaluar(cli, `document.getElementById('syncBanner').textContent`)), await evaluar(cli, `document.getElementById('syncBanner').textContent`));
  await evaluar(cli, '_rutFirma="";refresh(true,false)'); await pausa(900);
  chk('un refresco con el POST en viaje no la trae de vuelta', !(await evaluar(cli, HAY)));
  await pausa(DEMORA + 1500);
  const b1 = JSON.parse(await evaluar(cli, BOLSAS));
  chk('salió UNA bolsa con las dos filas (' + (b1[0] || '').split(':')[0] + ')', b1.length === 1 && /:\[9007,9008\]:/.test(b1[0]), b1);
  chk('  sin __keys hacia la base', await evaluar(cli, `__posts.filter(function(b){return b.__rpc&&b.__keys;}).length===0`));
  chk('al confirmar, la cola queda vacía', await evaluar(cli, `(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).length===0`));
  chk('  y la bolsa no vuelve', !(await evaluar(cli, HAY)));
  // El rechazo: el mismo representante, de nuevo en la lista, y el servidor no la acepta.
  await evaluar(cli, `__rechazar=true;delete entregados['Red|R9007'];delete entregados['Red|R9008'];_rutFirma='';rutRender();refresh(true,false)`);
  chk('(de nuevo) la bolsa aparece', await esperar(cli, HAY, 15000));
  await evaluar(cli, TOQUE);
  chk('  se va al toque', !(await evaluar(cli, HAY)));
  chk('si el servidor la rechaza, la bolsa vuelve', await esperar(cli, HAY, DEMORA + 8000));
  // (325) Reprogramar: los dos pedidos de hoy, a mañana. Con REPROG_DIRECTO va a la base y no tapa.
  const man = new Date(hoyAR); man.setDate(man.getDate() + 1);
  const REP = (noDir, espera) => evaluar(cli, `new Promise(function(fin){ __posts.length=0; window.__repNoDirecto=${noDir};
    var el=document.getElementById('rutLoaderOverlay'), tapa=0, t0=performance.now();
    var iv=setInterval(function(){ if(el&&el.classList.contains('visible')&&!tapa)tapa=Math.round(performance.now()-t0); },16);
    _reprogAplicar('${iso(hoyAR)}','${iso(man)}');
    setTimeout(function(){ clearInterval(iv); fin({p:__posts.filter(function(b){return b.action==='reprogramarEntrega';}).map(function(b){return (b.__rpc||'apps')+':'+b.clientOpId;}),tapa:tapa}); }, ${espera}); })`);
  await evaluar(cli, `__rechazar=false; window.__palForzar.directas={marcarEntregadoAVendedor:true,reprogramarEntrega:true}; 1`); await pausa(500);
  let rp = await REP(false, 1500);
  chk('reprogramar con REPROG_DIRECTO: va a pedido_reprog_directo, NO a Apps Script, sin tapar', rp.p.length === 1 && /^pedido_reprog_directo:rep_/.test(rp.p[0]) && rp.tapa === 0, rp);
  await evaluar(cli, `_rutFirma='';refresh(true,false); 1`); await pausa(1500);   // vuelven a estar hoy (la lista local los había movido)
  rp = await REP(true, DEMORA + 1500);
  chk('  directo:false: Apps Script con el MISMO clientOpId (y ahí sí el loader)', rp.p.length === 2 && rp.p[1] === 'apps:' + rp.p[0].split(':')[1] && rp.tapa >= 380, rp);
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
