/* El ERP al día y sin colgarse (15/9/2026).

   node probar_erp_al_dia.js
   APP=app_viejo_tmp.html node probar_erp_al_dia.js   ← la direccion contraria

   Dos cosas, con el backend STUBBEADO (nada sale a produccion):

   1) UNA LECTURA TRABADA SE CORTA Y SE PIDE DE NUEVO. Medido contra produccion
      esa noche: 2 de 42 pedidos se colgaron en la entrega de Google (117 s para
      traer algo calculado en 10 s, y 137 s para terminar en 404). El navegador
      no puede cortar solo la entrega: corta el pedido entero y lo repite. Un
      POST no se toca (repetir una escritura seria cobrar dos veces) y `fresh=1`
      tampoco (ese si obliga a recalcular).

   2) EL VIGIA: si alguien mas escribe, la pantalla abierta se renueva sola.
      `action=ver` devuelve la version de los datos; cuando cambia, el ERP
      refresca lo que se esta mirando. Salvo que este aparato acabe de escribir
      (esa pantalla ya se refresco): ahi el cambio queda PENDIENTE y entra en la
      vuelta siguiente.

   Tarda ~2 min: el vigia mira cada 40 s y el corte es a los 20. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 500) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(500); }
  return false;
};

/* El stub respeta `signal`: sin eso, cortar el pedido no se nota y la prueba
   daria verde con el bug adentro. */
const STUB = `
  window.__ver = 'v1'; window.__lento = {}; window.__pedidos = []; window.__posts = 0;
  (function(){ var o = window.fetch; window.fetch = function(u, x){
    var url = String((u && u.url) || u || '');
    if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
    if (x && String(x.method || '').toUpperCase() === 'POST'){
      window.__posts++;
      var dP = (window.__lento.POST || 0);
      return new Promise(function(res, rej){
        var t = setTimeout(function(){ res(new Response('{"ok":true}', {status:200, headers:{'Content-Type':'application/json'}})); }, dP || 60);
        if (x.signal) x.signal.addEventListener('abort', function(){ clearTimeout(t); var e = new Error('abortado'); e.name = 'AbortError'; rej(e); });
      });
    }
    var m = url.match(/action=([a-zA-Z_]+)/), a = m ? m[1] : '?';
    window.__pedidos.push(a + (url.indexOf('fresh=1') > -1 ? '&fresh' : ''));
    var n = window.__pedidos.filter(function(z){ return z.indexOf(a) === 0; }).length;
    var cuerpo = {ok:false, error:'stub'};
    if (a === 'ver') cuerpo = {ok:true, ver: window.__ver, t: Date.now()};
    else if (a === 'admin') cuerpo = {ts:1, pedidos:[], canales:[], totales:{}, oc:{pendientes:0,costo:0,lista:[]}, gastos:[], ingresos:[], movimientos:[], caja:{}, saldoBase:{}, stock:[]};
    else if (a === 'pedidosLight') cuerpo = {ts:1, pedidos:[], canales:[], light:true};
    else if (a === 'ocLight') cuerpo = {ok:true, oc:{lista:[]}};
    else if (a === 'cobrosPendientes') cuerpo = {ts:1, cobros:[]};
    else if (a === 'cajaLight') cuerpo = {ts:1, caja:{}, saldoBase:{}, gastos:[], ingresos:[], movimientos:[], efMano:[]};
    else if (a === 'ventas') cuerpo = {ok:true, ventas:[]};
    else if (a === 'entregas') cuerpo = {ok:true, intento:n, entregas:[]};
    else cuerpo = {ok:true, a:a};
    /* Se traba solo la PRIMERA vez: asi se ve que el segundo pedido la salva. */
    var d = (window.__lento[a] && n === 1) ? window.__lento[a] : 60;
    var txt = JSON.stringify(cuerpo);
    return new Promise(function(res, rej){
      var t = setTimeout(function(){ res(new Response(txt, {status:200, headers:{'Content-Type':'application/json'}})); }, d);
      if (x && x.signal) x.signal.addEventListener('abort', function(){ clearTimeout(t); var e = new Error('abortado'); e.name = 'AbortError'; rej(e); });
    });
  }; })();`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    console.log('\n== El ERP al dia · ' + APP + ' ==');

    const id = await cli.enviar('Page.addScriptToEvaluateOnNewDocument', {
      source: 'try{localStorage.setItem("maleu_tab","inicio");}catch(e){}' + prep('x') + STUB
    });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?c=' + Date.now() });
    const listo = await esperar(cli, `!!document.querySelector('#p-inicio') && typeof window.__vigia === 'object'`);
    await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: id.identifier });
    chk('el ERP abre con el vigia puesto', listo);
    if (!listo) { console.log('\n' + ok + ' ok, ' + mal + ' mal'); salir(1); }
    await pausa(3000);

    console.log('\n-- 1. una lectura trabada se corta a los 20 s y se vuelve a pedir --');
    await ev(cli, `window.__lento={entregas:600000}; window.__pedidos=[]; window.__corteGet.cortes=0; window.__corteGet.salvados=0;
      window.__r1=null; window.__t1=Date.now();
      fetch(API+'?action=entregas&t='+Date.now()).then(function(r){return r.json();}).then(function(d){window.__r1={ms:Date.now()-window.__t1, d:d};}); 1;`);
    const vino = await esperar(cli, `!!window.__r1`, 45000);
    const r1 = await ev(cli, `window.__r1`);
    const c1 = await ev(cli, `window.__corteGet`);
    const p1 = await ev(cli, `window.__pedidos`);
    chk('la lectura llega igual', vino === true && !!r1 && r1.d && r1.d.ok === true, r1);
    chk('llega en 20-26 s, no a los 10 min', !!r1 && r1.ms >= 19000 && r1.ms <= 26000, r1 && r1.ms);
    chk('la salva el SEGUNDO pedido', !!r1 && r1.d && r1.d.intento === 2, r1 && r1.d);
    chk('queda contado (cortes 1, salvados 1)', c1 && c1.cortes === 1 && c1.salvados === 1, c1);
    chk('fueron dos pedidos, no mas', (p1 || []).filter(x => x === 'entregas').length === 2, p1);

    console.log('\n-- 2. con fresh=1 NO se corta (ese si obliga a recalcular) --');
    await ev(cli, `window.__lento={entregas:600000}; window.__pedidos=[]; window.__corteGet.cortes=0;
      window.__r2='pendiente'; fetch(API+'?action=entregas&fresh=1&t='+Date.now()).then(function(r){return r.json();}).then(function(d){window.__r2=d;}); 1;`);
    await pausa(24000);
    const r2 = await ev(cli, `window.__r2`);
    const c2 = await ev(cli, `window.__corteGet`);
    const p2 = await ev(cli, `window.__pedidos`);
    chk('sigue esperando al primero', r2 === 'pendiente', r2);
    chk('no lo corto', c2 && c2.cortes === 0, c2);
    chk('un solo pedido', (p2 || []).filter(x => x.indexOf('entregas') === 0).length === 1, p2);

    console.log('\n-- 3. un POST no se corta nunca (repetirlo seria cobrar dos veces) --');
    await ev(cli, `window.__lento={POST:600000}; window.__posts=0;
      window.__r3='pendiente'; fetch(API,{method:'POST',body:JSON.stringify({action:'marcarCobrado'})}).then(function(r){return r.json();}).then(function(d){window.__r3=d;}); 1;`);
    await pausa(23000);
    const r3 = await ev(cli, `window.__r3`);
    const n3 = await ev(cli, `window.__posts`);
    chk('el POST sigue en camino, sin repetirse', r3 === 'pendiente' && n3 === 1, { r3, n3 });

    console.log('\n-- 4. el vigia: si escribio OTRO, la pantalla se renueva sola --');
    await ev(cli, `window.__lento={}; window.__pedidos=[]; window.__vigia.cambios=0; window.__vigia.refrescos=0;
      window.__ultimoPostBackend=Date.now(); window.__ver='v2';`);
    const hubo = await esperar(cli, `window.__vigia.cambios > 0`, 60000);
    const v4 = await ev(cli, `window.__vigia`);
    const p4 = await ev(cli, `window.__pedidos`);
    chk('ve el cambio de version', hubo === true, v4);
    chk('pero NO refresca: este aparato acaba de escribir', v4 && v4.refrescos === 0, v4);
    chk('y no pidio datos por eso', (p4 || []).filter(x => x === 'pedidosLight').length === 0, p4);

    console.log('\n-- 5. pasada la escritura propia, el cambio pendiente entra solo --');
    await ev(cli, `window.__ultimoPostBackend=0; window.__pedidos=[];`);
    const refresco = await esperar(cli, `window.__vigia.refrescos > 0`, 60000);
    await pausa(2500);
    const v5 = await ev(cli, `window.__vigia`);
    const p5 = await ev(cli, `window.__pedidos`);
    chk('el cambio no se perdio: refresca en la vuelta siguiente', refresco === true, v5);
    chk('y pide los datos de la pantalla abierta', (p5 || []).filter(x => x === 'pedidosLight').length >= 1, p5);

    console.log('\n-- 6. sin cambios, no molesta a nadie --');
    await ev(cli, `window.__pedidos=[]; window.__vigia.refrescos=0;`);
    await pausa(45000);
    const v6 = await ev(cli, `window.__vigia`);
    const p6 = await ev(cli, `window.__pedidos`);
    chk('sigue mirando', v6 && v6.miradas > 0, v6);
    chk('sin refrescar nada', v6 && v6.refrescos === 0, v6);
    chk('lo unico que pidio fue la version', (p6 || []).every(x => x === 'ver'), p6);

    /* Lo que se exige es que el CORTE no deje nada suelto: un AbortError que
       llegue a la pantalla o una promesa sin atrapar. Los otros errores de esta
       corrida son del simulador, que devuelve pantallas a medias a proposito. */
    const errs = await ev(cli, `window.__err||[]`);
    const sueltos = (errs || []).filter(x => /abort|promise:/i.test(String(x)));
    chk('el corte no deja errores sueltos', sueltos.length === 0, sueltos);
    if ((errs || []).length) console.log('       (del simulador, no del ERP: ' + errs.length + ' avisos)');

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.error('reventó: ' + (e.message || e));
    salir(2);
  }
})();
