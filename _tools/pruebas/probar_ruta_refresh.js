/* El ↻ de RUTA sin recalcular de mas (12/9/2026).

   node probar_ruta_refresh.js [390|1440]
   APP=app_viejo_tmp.html node probar_ruta_refresh.js 390    ← la direccion contraria

   Tadeo, entregando: "Tab ruta > Ruta cuando pongo actualizar tarda MUCHISIMO".
   Medido con la sesion real: el ↻ pedia `entregas` con `fresh=1` y tardaba 8 a
   11 s SIEMPRE, mientras la sincronizacion cada 15 s —sin `fresh`— volvia en 2 s
   del cache. `fresh` no agregaba nada: el cache de `entregas` se keyea por una
   version que cambia con cada escritura del ERP. Y si la sincronizacion ya tenia
   un pedido en vuelo, el ↻ sumaba otro calculo de 9 s en paralelo.

   `entregas` va STUBBEADO con datos inventados y una demora, para que "hay uno
   en vuelo" sea observable. No hace falta token. Sostiene:
   · el ↻ del panel, el ↻ propio de la sub-app y la sincronizacion piden
     `entregas` SIN fresh=1;
   · con la sincronizacion en vuelo, el ↻ NO manda otro pedido: usa el mismo;
   · y aun asi el ↻ repinta con lo que llego (aparece el pedido nuevo);
   · despues de terminar, un ↻ nuevo si vuelve a pedir (no se queda pegado). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const HOY = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
const ped = (id, c) => ({ id, h: 'Home', r: id, c, t: '11' + id, b: 'Estancias del Pilar', sb: 'Golf', l: String(id % 300), o: 'Orden de Compra',
  oD: {}, oc: [], hr: '10:00', f: '', de: '', fe: HOY, es: 'Pendiente', d: '', ep: 'No Cobrado', fp: 'Transferencia', $: 20000, p: [{ a: 'PMu', q: 1 }] });

const EXTRA = `
  window.__ent = []; window.__cob = []; window.__version = 1;
  try{ localStorage.removeItem('maleu_ruta'); localStorage.setItem('maleu_tab','ruta'); }catch(e){}
  (function(){ var o = window.fetch; window.fetch = function(u, x){
    var url = String((u && u.url) || u || '');
    if (url.indexOf('script.google.com') > -1 && !(x && String(x.method||'').toUpperCase()==='POST')) {
      var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
      var cuerpo;
      if (a === 'entregas') {
        window.__ent.push({fresh: /fresh=1/.test(url), t: performance.now(), v: window.__version});
        var e = [${JSON.stringify(ped(9201, 'Prueba Uno'))}];
        if (window.__version >= 2) e.push(${JSON.stringify(ped(9202, 'Prueba Nueva'))});
        cuerpo = {ts: Date.now(), e: e};
      } else if (a === 'pendientesGuardarStock') cuerpo = {ok:true, items:[]};
      else if (a === 'cobrosPendientes') { window.__cob.push({fresh:/fresh=1/.test(url),t:performance.now()}); cuerpo = {ok:true, ts:Date.now(), cobros:[]}; }
      else cuerpo = {ok:false, error:'stub'};
      var txt = JSON.stringify(cuerpo), dem = (a === 'entregas') ? (window.__demoraEnt||300) : 150;
      return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); }, dem); });
    }
    return o.apply(this, arguments); }; })();
`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    console.log('\n== RUTA · el ↻ sin recalcular de mas · ' + ANCHO + 'px · ' + APP + ' ==');
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('ruta')`);
    if (!await esperar(cli, `typeof getPendientes==='function' && typeof rutSincronizar==='function' && window.__ent.length>0`, 60000)) {
      console.log('  la sub-app de RUTA no arranco'); salir(1);
    }
    await evaluar(cli, `(()=>{ try{ switchTab('ruta'); }catch(e){} return 1; })()`);
    await pausa(2500);

    // 1. el ↻ del panel
    const r1 = await evaluar(cli, `(async()=>{ var d=window.__ent.length; refreshContextual();
      var b=document.getElementById('hdrRefresh'); var t=performance.now();
      await new Promise(r=>setTimeout(r,80)); while(performance.now()-t<10000){ if(!b.classList.contains('spinning'))break; await new Promise(r=>setTimeout(r,40)); }
      return window.__ent.slice(d); })()`);
    chk('el ↻ del panel pide entregas', r1.length >= 1, r1);
    chk('el ↻ del panel NO pide fresh=1', r1.length >= 1 && r1.every(x => !x.fresh), r1);

    // 2. el ↻ propio de la sub-app
    await pausa(600);
    const r2 = await evaluar(cli, `(async()=>{ var d=window.__ent.length; manualRefresh(); await new Promise(r=>setTimeout(r,1500)); return window.__ent.slice(d); })()`);
    chk('el ↻ de la sub-app NO pide fresh=1', r2.length >= 1 && r2.every(x => !x.fresh), r2);

    // 3. con la sincronizacion en vuelo, el ↻ reusa el pedido
    await pausa(1200);
    const r3 = await evaluar(cli, `(async()=>{
      window.__demoraEnt = 2500; window.__version = 2;
      var d = window.__ent.length;
      var pS = rutSincronizar('prueba');
      await new Promise(r=>setTimeout(r,300));
      var enVuelo = window.__ent.length - d;
      refreshContextual();
      var b=document.getElementById('hdrRefresh'); var t=performance.now();
      await new Promise(r=>setTimeout(r,80)); while(performance.now()-t<12000){ if(!b.classList.contains('spinning'))break; await new Promise(r=>setTimeout(r,40)); }
      var giro = Math.round(performance.now()-t);
      await pS; await new Promise(r=>setTimeout(r,400));
      var nombres = getPendientes().map(function(e){return e.c;});
      window.__demoraEnt = 300;
      return {enVuelo: enVuelo, pedidos: window.__ent.length - d, giro: giro, nueva: nombres.indexOf('Prueba Nueva') > -1}; })()`);
    chk('la sincronizacion arranco su pedido (si no, esto no mide nada)', r3.enVuelo === 1, r3);
    chk('con la sincronizacion en vuelo el ↻ NO manda otro pedido', r3.pedidos === 1, r3);
    chk('y el ↻ repinta con lo que llego (aparece el pedido nuevo)', r3.nueva === true, r3);
    chk('el ↻ espera al pedido que ya viajaba, no uno nuevo desde cero', r3.giro < 2600, r3);

    // 4. no se queda pegado
    await pausa(800);
    const r4 = await evaluar(cli, `(async()=>{ var d=window.__ent.length; refreshContextual(); await new Promise(r=>setTimeout(r,1200)); return window.__ent.length-d; })()`);
    chk('terminado, un ↻ nuevo si vuelve a pedir', r4 === 1, r4);

    // 5. Cobros no tiene que esperar la lectura de entregas: es otra fuente y
    // el usuario está mirando plata, no Armado/Ruta.
    await evaluar(cli, `switchTab('cobros')`);
    /* switchTab('cobros') termina una sincronización que podía venir pendiente
       de la prueba anterior. La dejamos cerrar antes de medir ESTE click: no
       queremos atribuirle al ↻ una entrega que ya estaba en vuelo. */
    await pausa(1200);
    /* La condición que decide el destino del botón es el estado de la sub-tab.
       La fijamos explícitamente después de dejar cerrar el trabajo anterior. */
    await evaluar(cli, `rutCurrentTab='cobros'`);
    const r5 = await evaluar(cli, `(async()=>{ var c=window.__cob.length, propias=0, original=refresh;
      /* No contamos __ent: una entrega iniciada ANTES de este click puede
         terminar mientras medimos. Interceptamos la función que el ↻ usaría
         para iniciar una NUEVA entrega. */
      window.refresh=function(){propias++;return Promise.resolve(true);};
      try { refreshContextual();
        var b=document.getElementById('hdrRefresh'),t=performance.now();
        while(performance.now()-t<10000){if(!b.classList.contains('spinning'))break;await new Promise(r=>setTimeout(r,40));}
        return {entregasPropias:propias,cobros:window.__cob.length-c,giro:Math.round(performance.now()-t)};
      } finally { window.refresh=original; } })()`);
    chk('en COBROS el ↻ no inicia entregas ajenas', r5.entregasPropias === 0, r5);
    chk('en COBROS el ↻ pide cobrosPendientes', r5.cobros === 1, r5);
    chk('en COBROS el ↻ termina con la fuente de esa pantalla', r5.giro < 1000, r5);

    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(1); }
})();
