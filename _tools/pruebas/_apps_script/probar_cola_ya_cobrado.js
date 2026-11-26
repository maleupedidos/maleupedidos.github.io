/* RUTA: UN COBRO QUE YA ESTÁ COBRADO SALE SOLO DE LA COLA (18/10/2026)
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_cola_ya_cobrado.js [390|1440]
 *   APP=app_viejo_tmp.html ...                <- con el codigo de antes, rojo
 *
 * El viernes 16/10 tres cobros de Vicky (#1120, #1123, #1170) quedaron en «No se
 * pudo guardar» en el iPhone estando ya Cobrado en la planilla. Lo que tiene que
 * ser cierto (el backend va stubbeado: `cobroYa` contesta lo que dice cada caso):
 *   · un cobro rechazado que el servidor dice Cobrado: no aparece, no avisa a
 *     Log Errores y el banner no se pone rojo;
 *   · uno que NO está cobrado: queda en la lista y avisa, como siempre;
 *   · al abrir la app, la cola vieja con los tres de Vicky: quedan solo los que
 *     no están cobrados, y solo esos van a Log Errores;
 *   · lo que ya estaba en la lista de antes también se limpia al abrir;
 *   · Reintentar un cobro que ya está cobrado: lo saca y NO lo reenvía;
 *   · si el servidor no contesta, no se saca nada (no saber no es estar cobrado).
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(120); } return false; };

const VIEJA = Date.now() - 4 * 60 * 60 * 1000;
const EXTRA = `
(function(){
  window.__posts=[];
  try{ window.__resp=JSON.parse(sessionStorage.getItem('resp')||'{}'); }catch(e){ window.__resp={}; }
  try{
    if(!sessionStorage.getItem('noLimpiar')){ localStorage.clear(); }
    localStorage.setItem('maleu_token','x');
    localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
    localStorage.setItem('maleu_tab','inicio');
    localStorage.setItem('maleu_ruta_purge_v58','1');
  }catch(e){}
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    if(x&&String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      var r=(window.__resp[b.action]||{ok:true});
      return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); },150); });
    }
    var c={ok:true,ts:Date.now(),pedidos:[],lista:[],datos:[],items:[],v:[],cobros:[],caja:{cuentas:[]},movimientos:[],oc:{lista:[]}};
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}})); },60); });
  };
})();
`;
const cobro = (id, row, ts) => `{action:'marcarCobrado',hoja:'Home',id:'${id}',row:${row},formaPago:'Efectivo',ef:1000,tr:0,propina:0,propMet:'Efectivo',repartidor:'Tadeo Ustariz',ts:${ts}}`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const lista = () => evaluar(cli, `(window.rutSyncRechazados||[]).map(function(r){return r.item.action+' '+r.item.id+' '+r.por})`);
  const posts = a => evaluar(cli, `window.__posts.filter(function(p){return p.action==='${a}'})`);
  const banner = () => evaluar(cli, `(function(){var b=document.getElementById('syncBanner');return {cls:b.className,txt:b.textContent};})()`);
  const tocarBoton = txt => evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('#confirmOverlay button')).filter(function(x){return x.textContent.trim()==='${txt}'})[0];if(b)b.click();return !!b;})()`);
  const entrarRuta = async () => {
    await evaluar(cli, `try{ go('ruta'); }catch(e){} 1`);
    return esperar(cli, `typeof window.processSyncQueue==='function' && Array.isArray(window.syncQueue)`, 30000);
  };
  const arrancar = async (resp) => {
    await evaluar(cli, `sessionStorage.setItem('resp',${JSON.stringify(JSON.stringify(resp))}); 1`);
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    await pausa(1500);
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { chk('el ERP arranco', false); salir(1); }
    if (!await entrarRuta()) { chk('Ruta arranco', false); salir(1); }
  };
  const rechazar = async (id, row) => {
    await evaluar(cli, `window.syncQueue.push(Object.assign(${cobro(id, row, 'Date.now()')},{__attempts:4})); window.processSyncQueue(); 1`);
    await esperar(cli, `(window.syncQueue||[]).length===0`, 8000);
    await pausa(1200);
  };
  const sembrar = async (cola, rech) => {
    await evaluar(cli, `sessionStorage.setItem('noLimpiar','1');
      var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}');
      d.syncQueue=${cola}; d.rutSyncRechazados=${rech}; localStorage.setItem('maleu_ruta',JSON.stringify(d)); 1`);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Ruta: un cobro ya cobrado sale solo · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(1500);
    if (!await entrarRuta()) { chk('Ruta arranco', false); salir(1); }
    await pausa(1500);

    console.log('\n-- rechazo de un cobro que YA está cobrado --');
    await evaluar(cli, `window.__posts=[]; window.__resp.marcarCobrado={ok:false,err:'Timeout'}; window.__resp.cobroYa={ok:true,cobrados:['Home|1123']}; 1`);
    await rechazar('1123', 1140);
    chk('le preguntó al servidor por ese pedido', (await posts('cobroYa')).some(p => (p.pedidos || []).some(x => x.hoja === 'Home' && x.id === '1123' && x.row === 1140)), await posts('cobroYa'));
    chk('no queda en «No se pudo guardar»', (await lista()).length === 0, await lista());
    chk('no avisa a Log Errores', (await posts('syncRechazado')).length === 0, await posts('syncRechazado'));
    chk('el banner no se pone rojo', !/sync-rechazo/.test((await banner()).cls), await banner());
    const guard = await evaluar(cli, `(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').rutSyncRechazados||[]).length`);
    chk('y tampoco queda guardado en el celular', guard === 0, guard);

    console.log('\n-- rechazo de un cobro que NO está cobrado --');
    await evaluar(cli, `window.__posts=[]; window.__resp.cobroYa={ok:true,cobrados:[]}; 1`);
    await rechazar('1170', 1180);
    chk('queda en la lista, como siempre', JSON.stringify(await lista()) === JSON.stringify(['marcarCobrado 1170 rechazo']), await lista());
    chk('y avisa a Log Errores', (await posts('syncRechazado')).length === 1);
    chk('con el banner rojo', /sync-rechazo/.test((await banner()).cls), await banner());

    console.log('\n-- Reintentar un cobro que mientras tanto se cobró --');
    await evaluar(cli, `window.__posts=[]; window.__resp.cobroYa={ok:true,cobrados:['Home|1170']}; document.getElementById('syncBanner').click(); 1`);
    await tocarBoton('Reintentar');
    await esperar(cli, `(window.rutSyncRechazados||[]).length===0`, 8000); await pausa(800);
    chk('sale de la lista', (await lista()).length === 0, await lista());
    chk('y NO se reenvía el cobro', (await posts('marcarCobrado')).length === 0, await posts('marcarCobrado'));
    await evaluar(cli, `try{cerrarConfirm();}catch(e){} 1`);

    console.log('\n-- al abrir la app: la cola vieja de Vicky (#1120 y #1123 cobrados, #1170 no) --');
    await sembrar(`[${cobro('1120', 1137, VIEJA)},${cobro('1123', 1140, VIEJA)},${cobro('1170', 1180, VIEJA)}]`, '[]');
    await arrancar({ cobroYa: { ok: true, cobrados: ['Home|1120', 'Home|1123'] } });
    await esperar(cli, `window.__posts.some(function(p){return p.action==='cobroYa'})`, 10000); await pausa(2000);
    chk('quedan solo los que no están cobrados', JSON.stringify(await lista()) === JSON.stringify(['marcarCobrado 1170 vieja']), await lista());
    const sr = await posts('syncRechazado');
    chk('y solo ese va a Log Errores', sr.length === 1 && sr[0].item.id === '1170', sr.map(p => p.item && p.item.id));
    chk('ningún cobro se reenvió solo', (await posts('marcarCobrado')).length === 0);

    console.log('\n-- al abrir la app: lo que ya estaba en la lista de antes --');
    await sembrar('[]', `[{item:${cobro('1120', 1137, VIEJA)},motivo:'x',por:'vieja',t:${VIEJA}},{item:${cobro('1123', 1140, VIEJA)},motivo:'x',por:'vieja',t:${VIEJA}},{item:${cobro('1170', 1180, VIEJA)},motivo:'x',por:'vieja',t:${VIEJA}}]`);
    await arrancar({ cobroYa: { ok: true, cobrados: ['Home|1120', 'Home|1123', 'Home|1170'] } });
    await esperar(cli, `window.__posts.some(function(p){return p.action==='cobroYa'})`, 10000); await pausa(2000);
    chk('los tres de Vicky salen solos', (await lista()).length === 0, await lista());
    chk('el banner no queda rojo', !/sync-rechazo/.test((await banner()).cls), await banner());

    console.log('\n-- el servidor no contesta bien --');
    await sembrar('[]', `[{item:${cobro('1120', 1137, VIEJA)},motivo:'x',por:'vieja',t:${VIEJA}}]`);
    await arrancar({ cobroYa: { ok: false, err: 'Service Spreadsheets timed out' } });
    await esperar(cli, `window.__posts.some(function(p){return p.action==='cobroYa'})`, 10000); await pausa(2000);
    chk('no se saca nada (no saber no es estar cobrado)', (await lista()).length === 1, await lista());
    await evaluar(cli, `sessionStorage.removeItem('noLimpiar'); sessionStorage.removeItem('resp'); 1`);

    chk('sin errores de JS', !errores.length, errores.slice(0, 3));
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
