/* CANCELAR UN PEDIDO COBRADO: QUE PASO CON LA PLATA (7/10/2026) — fase 4, paso 2.
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_cancelar_cobrado.js [390|1440]
 *   APP=app_viejo_tmp.html ...                <- con el codigo de antes, rojo
 *
 * Lo que tiene que ser cierto:
 *   · panel, pedido COBRADO: Cancelar abre el cuadro ANTES de mandar nada; «La
 *     devolví» manda plata=devolvi, «Queda a favor» plata=a_favor, «No
 *     cancelar» no manda nada y el pedido sigue como estaba;
 *   · panel, pedido SIN cobrar: como siempre (confirm), sin `plata`;
 *   · panel, copia local vieja (no sabia que estaba cobrado): el servidor
 *     contesta necesitaPlata, el pedido vuelve a su estado y se abre el cuadro;
 *   · Ruta: un cancelarPedido que el servidor contesta `sinReintento` sale de
 *     la cola al primer intento (no 5) y avisa que se cancela desde el panel.
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

const hoy = new Date().toISOString().slice(0, 10);
const ped = (n, es, ep) => ({ n, h: 'Home', f: hoy, fe: hoy, de: hoy, es, ep, c: 'Cliente ' + n, t: '1130000000', dir: 'Lote ' + n,
  $: 12000, subt: 12000, env: 0, co: 0, mp: 'Transferencia', d: [{ a: 'PMu', q: 1, p: 12000 }], row: Number(n) - 898, br: '', ev: '', hist: false, ocs: [] });
const PEDIDOS = [ped('900', 'Pendiente', 'Cobrado'), ped('901', 'Pendiente', 'No Cobrado'), ped('902', 'Pendiente', 'No Cobrado')];

const EXTRA = `
(function(){
  window.__posts=[]; window.__resp={};
  try{ localStorage.clear(); localStorage.setItem('maleu_token','x');
       localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
       localStorage.setItem('maleu_tab','inicio'); }catch(e){}
  /* El confirm lo pone servir.js con ?prueba=1: anota en __confirms y devuelve __confirmDevuelve. */
  var S={ts:Date.now(),pedidos:${JSON.stringify(PEDIDOS)},canales:[],light:true,totales:{},vendedores:[],ventasExtra:[]};
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    if(x&&String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      var r=(window.__resp[b.action]||{ok:true});
      return Promise.resolve(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
    var c = a==='pedidosLight' ? S : a==='ocLight' ? {ok:true,oc:{lista:[]}} : {ok:true,ts:S.ts,lista:[],datos:[],items:[],v:[],cobros:[],caja:{cuentas:[]},movimientos:[]};
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}})); },60); });
  };
})();
`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const boton = n => `(function(){ var b=document.createElement('button'); b.dataset.h='Home'; b.dataset.n='${n}'; b.dataset.r='${Number(n) - 898}'; b.dataset.c='Cliente ${n}'; return b; })()`;
  const cuadro = () => evaluar(cli, `(function(){ var b=document.querySelector('.cpl-bg'); if(!b) return null; var x=b.querySelector('.cpl-box').getBoundingClientRect(); return { txt: b.textContent, dentro: x.left>=0 && x.right<=window.innerWidth }; })()`);
  const tocar = v => evaluar(cli, `(function(){ var b=document.querySelector('.cpl-bg [data-v="${v}"]'); if(b) b.click(); return !!b; })()`);
  const cancelPosts = () => evaluar(cli, `window.__posts.filter(function(p){return p.action==='cancelarPedido'})`);
  const esLocal = n => evaluar(cli, `(function(){ var p=(D.pedidos||[]).filter(function(x){return x.n==='${n}'})[0]; return p?p.es:null; })()`);
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Cancelar un pedido cobrado · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof confirmarCancelarPed==='function' && !!(window.D&&D.pedidos&&D.pedidos.length===3)`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(2000);

    console.log('\n-- panel, pedido COBRADO --');
    await evaluar(cli, `window.__posts=[]; window.__confirms=[]; window.__confirmDevuelve=true; confirmarCancelarPed(${boton('900')}); 1`);
    let q = await cuadro();
    chk('abre el cuadro antes de mandar nada', !!q && /cobrado/i.test(q.txt) && /12\.000/.test(q.txt), q);
    chk('el cuadro entra en la pantalla', !!q && q.dentro === true, q);
    chk('no pregunta con confirm() ni manda el cancelar todavia', (await evaluar(cli, `window.__confirms.length`)) === 0 && (await cancelPosts()).length === 0);
    await tocar('');
    await pausa(400);
    chk('«No cancelar»: cierra, no manda nada y el pedido sigue Pendiente', !(await cuadro()) && (await cancelPosts()).length === 0 && (await esLocal('900')) === 'Pendiente');
    await evaluar(cli, `confirmarCancelarPed(${boton('900')}); 1`);
    await tocar('devolvi');
    await esperar(cli, `window.__posts.some(function(p){return p.action==='cancelarPedido'})`, 5000);
    let cp = await cancelPosts();
    chk('«La devolví» manda plata=devolvi', cp.length === 1 && cp[0].plata === 'devolvi' && cp[0].id === '900', cp);
    await evaluar(cli, `window.__posts=[]; D.pedidos.forEach(function(p){ if(p.n==='900'){p.es='Pendiente';} }); confirmarCancelarPed(${boton('900')}); 1`);
    await tocar('a_favor');
    await esperar(cli, `window.__posts.some(function(p){return p.action==='cancelarPedido'})`, 5000);
    cp = await cancelPosts();
    chk('«Queda a favor» manda plata=a_favor', cp.length === 1 && cp[0].plata === 'a_favor', cp);

    console.log('\n-- panel, pedido SIN cobrar --');
    await evaluar(cli, `window.__posts=[]; window.__confirms=[]; window.__confirmDevuelve=true; confirmarCancelarPed(${boton('901')}); 1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='cancelarPedido'})`, 5000);
    cp = await cancelPosts();
    chk('como siempre: confirm y sin plata', (await evaluar(cli, `window.__confirms.length`)) === 1 && cp.length === 1 && !('plata' in cp[0]) && !(await cuadro()), cp);

    console.log('\n-- panel, la copia local no sabia que estaba cobrado --');
    await evaluar(cli, `window.__posts=[]; window.__resp.cancelarPedido={ok:false,necesitaPlata:true,sinReintento:true,cobrado:12000,err:'cobrado'}; confirmarCancelarPed(${boton('902')}); 1`);
    await esperar(cli, `!!document.querySelector('.cpl-bg')`, 6000);
    chk('el servidor dice necesitaPlata: se abre el cuadro', !!(await cuadro()));
    chk('y el pedido vuelve a Pendiente (se deshace lo optimista)', (await esLocal('902')) === 'Pendiente', await esLocal('902'));
    await evaluar(cli, `window.__resp.cancelarPedido={ok:true}; window.__posts=[]; 1`);
    await tocar('devolvi');
    await esperar(cli, `window.__posts.some(function(p){return p.action==='cancelarPedido'})`, 5000);
    cp = await cancelPosts();
    chk('y al elegir, se manda de nuevo con la plata', cp.length === 1 && cp[0].plata === 'devolvi' && cp[0].id === '902', cp);

    console.log('\n-- Ruta: sinReintento sale de la cola al primer intento --');
    await evaluar(cli, `try{ go('ruta'); }catch(e){} 1`);
    const hay = await esperar(cli, `typeof window.processSyncQueue==='function' || typeof processSyncQueue==='function'`, 20000);
    if (!hay) chk('Ruta arranco', false);
    else {
      await evaluar(cli, `window.__posts=[]; window.__resp.cancelarPedido={ok:false,necesitaPlata:true,sinReintento:true,err:'El pedido está cobrado'};
        (function(){ var q=(typeof syncQueue!=='undefined')?syncQueue:window.syncQueue; q.push({action:'cancelarPedido',hoja:'Home',id:'900',row:2,ts:Date.now()}); (window.processSyncQueue||processSyncQueue)(); })(); 1`);
      await pausa(5000);
      const n = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='cancelarPedido'}).length`);
      const cola = await evaluar(cli, `(function(){ var q=(typeof syncQueue!=='undefined')?syncQueue:window.syncQueue; return q.filter(function(i){return i.action==='cancelarPedido'}).length; })()`);
      const toastTxt = await evaluar(cli, `(document.getElementById('rutToast')||{}).textContent||''`);
      chk('UN intento y la cola queda sin el cancelar', n === 1 && cola === 0, { n, cola });
      chk('y avisa que se cancela desde el panel', /desde el panel/.test(toastTxt), toastTxt);
    }
    chk('sin errores de JS', !errores.length, errores.slice(0, 3));
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
