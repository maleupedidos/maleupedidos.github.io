/* El ↻ del topbar dice de cuando es lo que estas mirando (13/9/2026).

   node probar_refresco_hdr.js [390|1440]
   APP=app_viejo_tmp.html node probar_refresco_hdr.js 390    ← la direccion contraria

   Tadeo: "profesionalizar aun mas el ↻ 05:01". Hasta ese dia el boton tenia UNA
   hora para todo el ERP y mentia de cuatro formas: se estampaba al abrir la app
   (antes de traer un dato), era la misma para todas las tabs, en Ventas terminaba
   con los datos todavia viajando (`loadVentas` no devolvia la promesa), y con una
   sub-app una falla contaba como exito.

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). No hace
   falta token. Tres fases, cada una con su navegacion (`?fase=`), y UNA sola
   inyeccion que lee la URL: `addScriptToEvaluateOnNewDocument` acumula, y una
   segunda envolveria el fetch dos veces.

   Sostiene:
   · al abrir, con los datos viajando, dice "Actualizando…" y no una hora;
   · cuando llegan pedidos y caja dice "recien", aunque el volcado siga en vuelo;
   · con una copia de hace 35 min que no se pudo renovar dice "hace 35 min" en ambar;
   · cada tab dice lo SUYO: Caja, Inicio y Stock muestran cosas distintas;
   · se repinta solo (el reloj de 30 s): "hace 25 min" sin tocar nada;
   · un ↻ que falla dice "No se pudo" y el que sale bien pone el tilde;
   · Ventas: el ↻ gira hasta que llegan las ventas, y un error no vacia la tab;
   · Ruta: una falla de `entregas` es una falla, no un exito;
   · una tab que trae lo suyo (Ajustes) no inventa una hora;
   · sin conexion dice "Sin conexion";
   · entra en el celular sin pisar el logo, y en la compu sin pisar al vecino. */
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

const PEDIDOS = [];
for (let i = 0; i < 30; i++) {
  PEDIDOS.push({ h: i % 3 ? 'Home' : 'Pilar', n: String(700 + i), c: 'Cliente Prueba ' + i, $: 20000 + i * 900,
    es: i % 4 ? 'Entregado' : 'Pendiente', o: 'Deposito', ep: i % 2 ? 'Cobrado' : 'No Cobrado', fp: i % 2 ? 'Transferencia' : 'Efectivo',
    f: '12/09', hr: '10:0' + (i % 10), dee: '2026-09-12', de: 'Sabado', br: 'Golf · Lote ' + i, r: 10 + i, mc: '2026-09',
    p: [{ a: 'PPM', q: 1 }] });
}
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [{ nombre: 'Home', pedidos: 20 }, { nombre: 'Pilar', pedidos: 10 }], light: true };
const CAJA = { ts: 1, caja: { ef: 0, mp: 0 }, saldoBase: {}, gastos: [], ingresos: [], gastosHist: [], movimientos: [] };
const VENTAS = [{ cliente: 'Cliente Uno', canal: 'Venta Directa', zona: 'Home', h: 'Home', n: '901', fecha: '02/09/2026', fCob: '02/09/2026',
  mes: '2026-09', sem: 36, ep: 'Cobrado', fp: 'Efectivo', $: 50000, ef: 50000, tr: 0, pEf: 0, pTr: 0, costo: 39900, margen: 10100, tel: '1100000001', dir: 'Golf · Lote 1' }];
const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const HOY = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
const ENT = { ts: 1, e: [{ id: 9301, h: 'Home', r: 9301, c: 'Prueba Ruta', t: '119301', b: 'Estancias del Pilar', sb: 'Golf', l: '1', o: 'Orden de Compra',
  oD: {}, oc: [], hr: '10:00', f: '', de: '', fe: HOY, es: 'Pendiente', d: '', ep: 'No Cobrado', fp: 'Transferencia', $: 20000, p: [{ a: 'PMu', q: 1 }] }] };

const EXTRA = `
  (function(){
    var fase = (location.search.match(/fase=([a-z])/)||[])[1] || 'a';
    window.__fase = fase; window.__gets = [];
    try{
      localStorage.removeItem('ma3'); localStorage.removeItem('ma3v2'); localStorage.removeItem('maleu_ruta');
      localStorage.setItem('maleu_tab','inicio');
      if (fase === 'a') localStorage.removeItem('maleu_fresco');
      if (fase === 'b' && !sessionStorage.getItem('__sembrado')) {
        sessionStorage.setItem('__sembrado','1');
        var n = Date.now();
        localStorage.setItem('maleu_fresco', JSON.stringify({ok:{pedidos:n-35*60000, caja:n-2*60000, volcado:n-3*3600000}, err:{}}));
      }
    }catch(e){}
    /* fase b: nada se puede renovar. fase a: admin demorado. fase c: todo anda. */
    if (fase === 'b') { window.__FALLA = 1; window.__FALLA_ADMIN = 1; }
    window.__demoraLight = (fase === 'a') ? 2500 : 150;
    window.__demoraAdmin = (fase === 'a') ? 15000 : 400;
    var o = window.fetch; window.fetch = function(u, x){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') > -1 && !(x && String(x.method||'').toUpperCase()==='POST')) {
        var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
        window.__gets.push(a);
        var html = function(){ return new Response('<html>Service error</html>',{status:200,headers:{'Content-Type':'text/html'}}); };
        var cuerpo = null, dem = 150;
        if (a === 'pedidosLight' || a === 'cajaLight' || a === 'cobrosPendientes' || a === 'ocLight') {
          if (window.__FALLA) return new Promise(function(r){ setTimeout(function(){ r(html()); }, 120); });
          dem = window.__demoraLight;
          cuerpo = a === 'pedidosLight' ? ${JSON.stringify(LIGHT)} : a === 'cajaLight' ? ${JSON.stringify(CAJA)}
                 : a === 'ocLight' ? {ok:true, oc:{lista:[]}} : {ok:true, cobros:[]};
        } else if (a === 'admin') {
          if (window.__FALLA_ADMIN) return new Promise(function(r){ setTimeout(function(){ r(html()); }, 120); });
          window.__adminVuela = true; dem = window.__demoraAdmin;
          cuerpo = Object.assign({}, ${JSON.stringify(LIGHT)}, ${JSON.stringify(CAJA)}, {oc:{lista:[]}, stock:[]});
        } else if (a === 'ventas') {
          dem = window.__demoraVentas || 150;
          cuerpo = window.__FALLA_VENTAS ? {ok:false, forbidden:true} : {ok:true, v:${JSON.stringify(VENTAS)}, cuentas:[]};
        } else if (a === 'entregas') {
          if (window.__FALLA_ENT) return new Promise(function(r){ setTimeout(function(){ r(html()); }, 120); });
          cuerpo = ${JSON.stringify(ENT)};
        } else if (a === 'pendientesGuardarStock') cuerpo = {ok:true, items:[]};
        else if (a === 'tendencia') cuerpo = {ok:true, meses:[], base:{total:0}};
        else cuerpo = {ok:false, error:'stub'};
        var txt = JSON.stringify(cuerpo);
        return new Promise(function(res){ setTimeout(function(){ if(a==='admin')window.__adminVuela=false;
          res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); }, dem); });
      }
      return o.apply(this, arguments); };
  })();
`;

const LEER = `(()=>{ var b=document.getElementById('hdrRefresh'), s=document.getElementById('hdrRefreshTime');
  return b ? {txt:(s?s.textContent:'').trim(), estado:b.dataset.estado||'', err:b.classList.contains('err'), listo:b.classList.contains('listo'),
    gira:b.classList.contains('spinning'), title:b.title||''} : null; })()`;
const HORA = /\b\d{1,2}:\d{2}\b/;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async (fase) => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?fase=' + fase });
    if (!await esperar(cli, `typeof go==='function' && window.__fase===${JSON.stringify(fase)}`, 60000)) { console.log('  el ERP no arranco (fase ' + fase + ')'); salir(1); }
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable'); await cli.enviar('Network.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== El ↻ del topbar · ' + ANCHO + 'px · ' + APP + ' ==');

    /* ── A. Abrir la app: nada guardado, los datos viajando ── */
    await ir('a');
    await pausa(1200);
    const a1 = await evaluar(cli, LEER);
    chk('al abrir, con los datos viajando, NO muestra una hora', !!a1 && !HORA.test(a1.txt), a1);
    chk('y dice "Actualizando…"', !!a1 && /Actualizando/.test(a1.txt) && a1.estado === 'yendo', a1);
    await esperar(cli, `window.D && Array.isArray(D.pedidos) && D.pedidos.length===30 && D.caja`, 20000);
    await pausa(400);
    const a2 = await evaluar(cli, `(()=>{ var r=${LEER}; r.adminVuela=!!window.__adminVuela; return r; })()`);
    chk('llegaron pedidos y caja: dice "recién"', a2.txt === 'recién' && a2.estado === 'ok', a2);
    chk('aunque el volcado siga en vuelo (si no, esto no mide nada)', a2.adminVuela === true, a2);
    chk('el detalle nombra Pedidos y Caja', /Pedidos/.test(a2.title) && /Caja/.test(a2.title), a2.title);
    chk('queda guardado para la proxima apertura', await evaluar(cli, `(()=>{ try{ var o=JSON.parse(localStorage.getItem('maleu_fresco')); return !!(o&&o.ok&&o.ok.pedidos&&o.ok.caja); }catch(e){ return false; } })()`));

    /* Layout con el texto mas largo que puede tener */
    await evaluar(cli, `(()=>{ var b=document.getElementById('hdrRefresh'); b.classList.add('spinning'); if(typeof _pintarFresco==='function')_pintarFresco(); return 1; })()`);
    const lay = await evaluar(cli, `(()=>{
      var b=document.getElementById('hdrRefresh').getBoundingClientRect();
      var logo=document.querySelector('.hdr-wordmark').getBoundingClientRect();
      var bus=document.querySelector('.hdr-search'), busR=bus?bus.getBoundingClientRect():null;
      var bt=document.querySelector('.hdr-search-txt'), btR=bt?bt.getBoundingClientRect():null;
      var vec=[].slice.call(document.querySelectorAll('.hdr-actions > *')).filter(function(e){ return e.id!=='hdrRefresh' && e.getClientRects().length; })
        .map(function(e){ var r=e.getBoundingClientRect(); return {l:r.left, r:r.right}; });
      var pisa=vec.filter(function(v){ return v.l < b.right-0.5 && v.r > b.left+0.5; }).length;
      return {w:Math.round(b.width), h:Math.round(b.height), l:Math.round(b.left), r:Math.round(b.right), logoR:Math.round(logo.right),
        busR: busR?Math.round(busR.right):null, busTxtH: btR&&btR.width?Math.round(btR.height):null, pisa:pisa, vw:innerWidth,
        desborda: document.documentElement.scrollWidth > innerWidth };
    })()`);
    await evaluar(cli, `(()=>{ document.getElementById('hdrRefresh').classList.remove('spinning'); if(typeof _pintarFresco==='function')_pintarFresco(); return 1; })()`);
    const anchoOk = await evaluar(cli, `Math.round(document.getElementById('hdrRefresh').getBoundingClientRect().width)`);
    if (ANCHO <= 560) {
      chk('celular: el boton mide 44px de alto', lay.h === 44, lay);
      chk('celular: con "Actualizando…" no pisa el logo', lay.l > lay.logoR + 8, lay);
      chk('celular: no se sale de la pantalla', lay.r <= lay.vw - 10 && !lay.desborda, lay);
    } else {
      chk('compu: no pisa el buscador ni a sus vecinos', (lay.busR === null || lay.l > lay.busR) && lay.pisa === 0, lay);
      chk('compu: el texto del buscador va en un renglon', lay.busTxtH !== null && lay.busTxtH <= 18, lay);
      chk('compu: "recién" y "Actualizando…" miden lo mismo (no corre el buscador)', anchoOk === lay.w, {recien: anchoOk, actualizando: lay.w});
    }

    /* ── B. Una copia vieja que no se pudo renovar ── */
    await ir('b');
    await esperar(cli, `(window.__gets||[]).indexOf('admin')>-1`, 20000);
    await pausa(2500);
    const b1 = await evaluar(cli, LEER);
    chk('Inicio con pedidos de hace 35 min: dice "hace 35 min"', b1.txt === 'hace 35 min', b1);
    chk('y en ambar (viejo)', b1.estado === 'viejo', b1);
    await evaluar(cli, `go('caja')`); await pausa(500);
    const b2 = await evaluar(cli, LEER);
    chk('Caja dice lo SUYO: "hace 2 min"', b2.txt === 'hace 2 min' && b2.estado === 'ok', b2);
    await evaluar(cli, `go('stock')`); await pausa(500);
    const b3 = await evaluar(cli, LEER);
    chk('Stock (el volcado, de hace 3 h) dice la hora y no "hace 180 min"', /^(hoy|ayer) \d\d:\d\d$|^\d{1,2}\/\d{1,2} \d\d:\d\d$/.test(b3.txt) && b3.estado === 'viejo', b3);
    chk('las tres tabs muestran cosas distintas', new Set([b1.txt, b2.txt, b3.txt]).size === 3, [b1.txt, b2.txt, b3.txt]);
    await evaluar(cli, `go('caja')`);
    await evaluar(cli, `(()=>{ if(typeof _fresco!=='undefined')_fresco.ok.caja = Date.now() - 25*60000; return 1; })()`);
    chk('se repinta solo: sin tocar nada pasa a "hace 25 min" (reloj de 30 s)',
      await esperar(cli, `(()=>{ var r=${LEER}; return r.txt==='hace 25 min' && r.estado==='viejo'; })()`, 33000), await evaluar(cli, LEER));

    /* ── C. El ↻ a mano ── */
    await ir('c');
    await esperar(cli, `window.D && Array.isArray(D.pedidos) && D.pedidos.length===30`, 20000);
    await evaluar(cli, `go('inicio')`); await pausa(1500);
    const tocar = async () => evaluar(cli, `(async()=>{ refreshContextual(); var b=document.getElementById('hdrRefresh'); var t=performance.now();
      await new Promise(r=>setTimeout(r,60)); while(performance.now()-t<20000){ if(!b.classList.contains('spinning'))break; await new Promise(r=>setTimeout(r,40)); }
      var r=${LEER}; r.giro=Math.round(performance.now()-t); return r; })()`);
    await evaluar(cli, `window.__FALLA = 1`);
    const c1 = await tocar();
    chk('un ↻ que falla dice "No se pudo"', c1.txt === 'No se pudo' && c1.estado === 'err' && c1.err, c1);
    chk('y el detalle dice que seguis viendo lo de antes', /Seguís viendo lo de antes/.test(c1.title), c1.title);
    await evaluar(cli, `window.__FALLA = 0`);
    const c2 = await tocar();
    chk('el ↻ siguiente sale bien: "recién" con el tilde', c2.txt === 'recién' && c2.estado === 'ok' && c2.listo && !c2.err, c2);
    await pausa(2000);
    chk('el tilde se va solo', (await evaluar(cli, LEER)).listo === false);

    // Ventas
    await evaluar(cli, `go('ventas')`);
    await esperar(cli, `Array.isArray(window.VD) && VD.length===1`, 20000);
    await pausa(600);
    await evaluar(cli, `window.__demoraVentas = 4000`);
    const c3 = await evaluar(cli, `(async()=>{ refreshContextual(); await new Promise(r=>setTimeout(r,1500)); return ${LEER}; })()`);
    chk('Ventas: el ↻ sigue girando mientras viajan las ventas', c3.gira === true && c3.estado === 'yendo', c3);
    await esperar(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`, 15000);
    const c3b = await evaluar(cli, LEER);
    chk('y cuando llegan dice "recién"', c3b.txt === 'recién' && c3b.estado === 'ok', c3b);
    await evaluar(cli, `(()=>{ window.__demoraVentas = 150; window.__FALLA_VENTAS = 1; return 1; })()`);
    const c4 = await tocar();
    chk('Ventas: una respuesta de error es un error', c4.estado === 'err', c4);
    /* Se espera a que la respuesta llegue: con el codigo viejo el ↻ terminaba al
       instante y leer VD en ese momento daba verde con el bug adentro. */
    await pausa(900);
    chk('y NO vacia la lista de ventas', await evaluar(cli, `Array.isArray(window.VD) && VD.length===1`), await evaluar(cli, `window.VD ? VD.length : null`));
    await evaluar(cli, `window.__FALLA_VENTAS = 0`);

    // Una tab que trae lo suyo
    await evaluar(cli, `go('ajustes')`); await pausa(600);
    const c5 = await evaluar(cli, LEER);
    chk('Ajustes no inventa una hora (queda "Actualizar" solo)', c5.txt === '' && c5.estado === 'nada', c5);

    // Mi Reparto: el ↻ tiene que esperar SU respuesta. Antes llamaba la carga y
    // ejecutaba done(true) de inmediato, por lo que decía "recién" con la lista
    // aún viajando.
    await evaluar(cli, `go('mireparto'); window.__mrTermino=false; window.loadMiReparto=function(){return new Promise(function(res){setTimeout(function(){window.__mrTermino=true;res(true);},700);});}; 1`);
    await pausa(150);
    const cMr1 = await evaluar(cli, `(async()=>{ refreshContextual(); await new Promise(function(r){setTimeout(r,180);}); return ${LEER}; })()`);
    chk('Mi Reparto: el ↻ sigue girando mientras viaja su propia lista', cMr1.gira === true && cMr1.estado === 'yendo' && !await evaluar(cli, 'window.__mrTermino'), cMr1);
    chk('Mi Reparto: termina cuando llega su lista', await esperar(cli, `window.__mrTermino && !document.getElementById('hdrRefresh').classList.contains('spinning')`, 5000), await evaluar(cli, LEER));

    // Ruta
    await evaluar(cli, `go('ruta')`);
    if (!await esperar(cli, `typeof getPendientes==='function' && getPendientes().length===1`, 40000)) { console.log('  la sub-app de RUTA no arranco'); }
    await pausa(800);
    const c6 = await evaluar(cli, LEER);
    chk('Ruta: cuando llegan las entregas dice "recién"', c6.txt === 'recién' && c6.estado === 'ok', c6);
    await evaluar(cli, `window.__FALLA_ENT = 1`);
    const c7 = await tocar();
    chk('Ruta: si `entregas` falla, es una falla y no un exito', c7.estado === 'err' && c7.txt === 'No se pudo', c7);
    await evaluar(cli, `window.__FALLA_ENT = 0`);
    const c8 = await tocar();
    chk('Ruta: el siguiente sale bien', c8.estado === 'ok', c8);

    // Sin conexion
    await cli.enviar('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const off = await esperar(cli, `(()=>{ var r=${LEER}; return r.txt==='Sin conexión' && r.estado==='off'; })()`, 5000);
    chk('sin conexion dice "Sin conexión"', off, await evaluar(cli, LEER));
    await cli.enviar('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    chk('y al volver la red deja de decirlo', await esperar(cli, `(()=>{ var r=${LEER}; return r.estado!=='off'; })()`, 5000));

    /* "respuesta invalida" es del stub: `catalogo` contesta {ok:false} a proposito
       (esta prueba no mira el catalogo) y `traer()` lo registra. */
    const errs = await evaluar(cli, `(window.__err||[]).filter(function(e){ return !/stub|Service error|Unexpected token|JSON|respuesta invalida/.test(e); })`);
    chk('ningun error de consola', errs.length === 0, errs.slice(0, 5));

    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(1); }
})();
