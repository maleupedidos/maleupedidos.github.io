/* RUTA: LA COLA NO TIRA ESCRITURAS (7/10/2026) — Diagnóstico ERP, Ruta 1.
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_cola_no_tira.js [390|1440]
 *   APP=app_viejo_tmp.html ...                <- con el codigo de antes, rojo
 *
 * Lo que tiene que ser cierto:
 *   · una escritura rechazada 5 veces sale de la cola pero NO se pierde: queda
 *     en rutSyncRechazados (y en localStorage), avisa a Log Errores con
 *     syncRechazado, y el banner se pone rojo;
 *   · tocar el banner muestra qué fue, de quién y por qué, con Reintentar y
 *     Descartar; Reintentar la vuelve a mandar; Descartar pide confirmación;
 *   · al abrir la app, lo que quedó en la cola más de 30 min no se reenvía solo
 *     (la purga de la v58) pero tampoco se tira: va a la misma lista.
 * Todo el backend va stubbeado. No toca produccion ni necesita token.
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

const VIEJA = Date.now() - 60 * 60 * 1000;
const EXTRA = `
(function(){
  window.__posts=[]; window.__resp={};
  try{
    if(!sessionStorage.getItem('noLimpiar')){
      localStorage.clear();
    }
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
      return Promise.resolve(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    var c={ok:true,ts:Date.now(),pedidos:[],lista:[],datos:[],items:[],v:[],cobros:[],caja:{cuentas:[]},movimientos:[],oc:{lista:[]}};
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}})); },60); });
  };
})();
`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const lista = () => evaluar(cli, `(window.rutSyncRechazados||[]).map(function(r){return {a:r.item.action,m:r.motivo,por:r.por}})`);
  const cola = () => evaluar(cli, `(window.syncQueue||[]).length`);
  const posts = a => evaluar(cli, `window.__posts.filter(function(p){return p.action==='${a}'})`);
  const banner = () => evaluar(cli, `(function(){var b=document.getElementById('syncBanner');return {cls:b.className,txt:b.textContent,vis:getComputedStyle(b).display!=='none'};})()`);
  const overlay = () => evaluar(cli, `(function(){var o=document.getElementById('confirmOverlay');if(!o||o.classList.contains('hidden'))return null;var x=(o.querySelector('.confirm-box')||o).getBoundingClientRect();return {txt:o.textContent,dentro:x.left>=0&&x.right<=window.innerWidth};})()`);
  const tocarBoton = txt => evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('#confirmOverlay button')).filter(function(x){return x.textContent.trim()==='${txt}'})[0];if(b)b.click();return !!b;})()`);
  const entrarRuta = async () => {
    await evaluar(cli, `try{ go('ruta'); }catch(e){} 1`);
    return esperar(cli, `typeof window.processSyncQueue==='function' && Array.isArray(window.syncQueue)`, 30000);
  };
  const encolarRechazo = async (id) => {
    await evaluar(cli, `window.__resp.marcarEntregado={ok:false,err:'La fila ya no es de ese pedido'};
      window.syncQueue.push({action:'marcarEntregado',hoja:'Home',id:'${id}',row:5,repartidor:'Tadeo',ts:Date.now(),__attempts:4});
      window.processSyncQueue(); 1`);
    await esperar(cli, `(window.syncQueue||[]).length===0`, 8000);
    await pausa(500);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Ruta: la cola no tira escrituras · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(1500);
    if (!await entrarRuta()) { chk('Ruta arranco', false); salir(1); }
    await pausa(1500);

    console.log('\n-- 5° rechazo --');
    await evaluar(cli, `window.__posts=[]; 1`);
    await encolarRechazo('900');
    let l = await lista();
    chk('sale de la cola (no traba al resto)', (await cola()) === 0);
    chk('pero queda en «No se pudo guardar» con el motivo', l.length === 1 && l[0].a === 'marcarEntregado' && /fila ya no es/.test(l[0].m), l);
    const sr = await posts('syncRechazado');
    chk('y avisa a Log Errores (syncRechazado con la escritura adentro)', sr.length === 1 && sr[0].item && sr[0].item.action === 'marcarEntregado' && sr[0].item.id === '900' && !('__attempts' in sr[0].item), sr);
    const guardado = await evaluar(cli, `(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').rutSyncRechazados||[]).length`);
    chk('sobrevive a cerrar la app (localStorage)', guardado === 1, guardado);
    let b = await banner();
    chk('el banner queda rojo y a la vista', b.vis && /sync-rechazo/.test(b.cls) && /no se pudo guardar/i.test(b.txt), b);

    console.log('\n-- tocar el aviso --');
    await evaluar(cli, `document.getElementById('syncBanner').click(); 1`);
    let ov = await overlay();
    chk('muestra qué fue y por qué', !!ov && /Entregado/.test(ov.txt) && /fila ya no es/.test(ov.txt), ov);
    chk('el cuadro entra en la pantalla', !!ov && ov.dentro === true, ov);

    console.log('\n-- Descartar pide confirmación --');
    await tocarBoton('Descartar');
    ov = await overlay();
    chk('pregunta antes', !!ov && /Descartar\?/.test(ov.txt) && (await lista()).length === 1, ov);
    await tocarBoton('Volver');
    chk('«Volver» no borra nada', (await lista()).length === 1);

    console.log('\n-- Reintentar --');
    await evaluar(cli, `window.__posts=[]; window.__resp.marcarEntregado={ok:true}; 1`);
    await tocarBoton('Reintentar');
    await esperar(cli, `window.__posts.some(function(p){return p.action==='marcarEntregado'})`, 8000);
    const me = await posts('marcarEntregado');
    chk('la vuelve a mandar, de cero', me.length === 1 && me[0].id === '900', me);
    await esperar(cli, `(window.syncQueue||[]).length===0`, 8000);
    chk('y la lista queda vacía', (await lista()).length === 0);
    b = await banner();
    chk('el banner deja de estar rojo', !/sync-rechazo/.test(b.cls), b);
    await evaluar(cli, `cerrarConfirm(); 1`);

    console.log('\n-- Descartar de verdad --');
    await encolarRechazo('901');
    await evaluar(cli, `document.getElementById('syncBanner').click(); 1`);
    await tocarBoton('Descartar');
    await tocarBoton('Sí, descartar');
    chk('con el sí, sale de la lista', (await lista()).length === 0);
    await evaluar(cli, `cerrarConfirm(); 1`);

    console.log('\n-- al abrir la app, lo viejo de la cola --');
    await evaluar(cli, `sessionStorage.setItem('noLimpiar','1');
      var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}');
      d.syncQueue=[{action:'marcarArmado',pedidos:[{h:'Home',id:'903',r:7,c:'Cliente 903'}],armado:true,usuario:'Tadeo',ts:${VIEJA}}];
      d.rutSyncRechazados=[]; localStorage.setItem('maleu_ruta',JSON.stringify(d)); 1`);
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    await pausa(1500);
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { chk('el ERP rearranco', false); salir(1); }
    if (!await entrarRuta()) { chk('Ruta rearranco', false); salir(1); }
    await pausa(3500);
    l = await lista();
    chk('no se tira: va a «No se pudo guardar» como vieja', l.length === 1 && l[0].a === 'marcarArmado' && l[0].por === 'vieja', l);
    chk('no se reenvía sola', (await posts('marcarArmado')).length === 0 && (await cola()) === 0);
    const sr2 = await posts('syncRechazado');
    chk('y queda en Log Errores', sr2.length === 1 && sr2[0].por === 'vieja', sr2);
    b = await banner();
    chk('con el banner rojo', /sync-rechazo/.test(b.cls), b);
    await evaluar(cli, `sessionStorage.removeItem('noLimpiar'); 1`);

    chk('sin errores de JS', !errores.length, errores.slice(0, 3));
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
