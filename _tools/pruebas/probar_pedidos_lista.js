/* La tab Pedidos, rapida (12/9/2026).

   node probar_pedidos_lista.js [390|1440]
   APP=app_viejo_tmp.html node probar_pedidos_lista.js 390    ← la direccion contraria

   Tadeo: "ANDA LENTISIMO TAB PEDIDOS ACTUALIZADA". Medido con la sesion real y la
   CPU de un celular (x4): `rPedidos` armaba las ~1.200 tarjetas con el cuerpo
   entero adentro —aunque nacen plegadas—, en un solo bloque, y el navegador
   calculaba el layout de TODAS. "Actualizar pedidos" pintaba ademas la lista de
   Pedidos Home, y el ↻ de arriba pedia 4 endpoints y despues OTRA VEZ los 4.

   Todo el backend va STUBBEADO con 1.200 pedidos inventados (este repo es
   publico): no depende de lo lento que este Apps Script ni de los datos del dia.
   No hace falta token.

   Sostiene:
   · la primera tanda son las de arriba (<=40) y despues llegan TODAS, sin repetir;
   · ninguna tarjeta trae el cuerpo hasta que se abre, y al abrirla aparece con
     sus controles; cerrarla y abrirla no lo duplica;
   · dos pintadas seguidas no se intercalan (la tanda vieja se descarta);
   · `_ordGo` encuentra y abre una tarjeta del FONDO de la lista;
   · `content-visibility:auto` en las tarjetas;
   · ningun bloque de JS de mas de 400 ms pintando la lista con CPU x4;
   · "Actualizar pedidos" NO pinta Pedidos Home estando en Pedidos;
   · el ↻ en Pedidos pide solo pedidos y OCs, y no lo vuelve a pedir al terminar;
   · el pintado en segundo plano no corre mientras se toca la pantalla;
   · `tendencia` (Inicio) no se vuelve a pedir estando en Pedidos. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
const N = 1200;

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

/* ── 1.200 pedidos inventados ── */
const ESTADOS = ['Entregado', 'Entregado', 'Entregado', 'Pendiente', 'Reservado', 'Cancelado'];
const HOJAS = ['Home', 'Home', 'Home', 'Pilar', 'Clubes', 'Red'];
const PEDIDOS = [];
for (let i = 0; i < N; i++) {
  const d = new Date(2026, 8, 12); d.setDate(d.getDate() - Math.floor(i / 12));
  const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0');
  const h = HOJAS[i % HOJAS.length];
  PEDIDOS.push({
    h, n: String(5000 + i), c: 'Cliente Prueba ' + i, $: 10000 + (i * 137) % 90000,
    es: ESTADOS[i % ESTADOS.length], o: (i % 7 === 0) ? 'Pendiente' : 'Deposito', ep: (i % 3 === 0) ? 'Cobrado' : 'No Cobrado',
    fp: (i % 2) ? 'Transferencia' : 'Efectivo', f: dd + '/' + mm + '/2026', hr: '1' + (i % 10) + ':' + String(i % 60).padStart(2, '0'),
    dee: '2026-' + mm + '-' + dd, de: 'Viernes', br: 'Zona ' + (i % 9) + ' · Lote ' + i, r: 10 + i, mc: '2026-' + mm,
    p: [{ a: 'PPM', q: 1 + i % 3 }, { a: 'SE', q: 1 + i % 2 }]
  });
}
const CANALES = [{ nombre: 'Home', pedidos: 600 }, { nombre: 'Pilar', pedidos: 200 }, { nombre: 'Clubes', pedidos: 200 }, { nombre: 'Red', pedidos: 200 }];
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: CANALES, light: true };
const OCS = { ok: true, oc: { lista: [] } };
const TEND = { ok: true, meses: [{ m: '2026-09', facturado: 1000, nuevos: 1 }], base: { total: 1 } };

const EXTRA = `
  window.__gets = []; window.__lt = [];
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ window.__lt.push({t:e.startTime,d:Math.round(e.duration)}); }); }).observe({entryTypes:['longtask']}); }catch(e){}
  try{ localStorage.setItem('maleu_tab','pedidos'); localStorage.removeItem('maleu_seismeses'); localStorage.removeItem('ma3'); }catch(e){}
  (function(){ var o = window.fetch; window.fetch = function(u, x){
    var url = String((u && u.url) || u || '');
    if (url.indexOf('script.google.com') > -1 && !(x && String(x.method||'').toUpperCase()==='POST')) {
      var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
      window.__gets.push({a:a, t:performance.now()});
      var cuerpo = null;
      if (a === 'pedidosLight') cuerpo = window.__LIGHT;
      else if (a === 'pedidosNew') cuerpo = {ts:2, pedidos: window.__LIGHT.pedidos.slice(-10), tail:10};
      else if (a === 'ocLight') cuerpo = ${JSON.stringify(OCS)};
      else if (a === 'tendencia') cuerpo = ${JSON.stringify(TEND)};
      else if (a === 'admin') { window.__adminPedido = (window.__adminPedido||0) + 1;
        cuerpo = window.__ADMIN_OK ? Object.assign({}, window.__LIGHT, {oc:{lista:[]}}) : {ok:false, forbidden:true, err:'stub: el volcado contesta un error'}; }
      else cuerpo = {ok:false, error:'stub'};
      var txt = JSON.stringify(cuerpo);
      return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); }, window.__demora||200); });
    }
    return o.apply(this, arguments); }; })();
  window.__LIGHT = ${JSON.stringify(LIGHT)};
`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    /* ADMIN_OK=1: el volcado contesta bien. Sirve para correr el resto de los
       chequeos contra una version vieja, que con el error se queda sin datos. */
    const ADMIN_OK = process.env.ADMIN_OK === '1';
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA + (ADMIN_OK ? ';window.__ADMIN_OK=true;' : '') });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    const tNav = Date.now();

    console.log('\n== Pedidos rapido · ' + ANCHO + 'px · ' + APP + ' ==');
    const ESPERADAS = PEDIDOS.filter(p => p.c && p.$).length;
    if (!await esperar(cli, `typeof go==='function' && window.D && D.pedidos && D.pedidos.length===${N}`, 90000)) {
      console.log('  el ERP no cargo los pedidos stubbeados'); salir(1);
    }
    /* El volcado (`admin`) contesta {ok:false, forbidden:true}. Hasta el 12/9/2026
       load() hacia D=d con eso y el ERP se quedaba sin datos. */
    await esperar(cli, `(window.__adminPedido||0) >= 1`, 30000);
    await pausa(1500);
    if (!ADMIN_OK) chk('un volcado que contesta error NO borra los datos del ERP',
      await evaluar(cli, `!!(window.D && Array.isArray(D.pedidos) && D.pedidos.length===${N} && Array.isArray(D.canales))`),
      await evaluar(cli, `window.D ? Object.keys(D).slice(0,8) : null`));
    await evaluar(cli, `go('pedidos')`);
    if (!await esperar(cli, `document.querySelectorAll('#pList>.pc').length===${ESPERADAS}`, 30000)) {
      console.log('  la lista no llego a ' + ESPERADAS + ': ' + await evaluar(cli, `document.querySelectorAll('#pList>.pc').length`));
    }
    await pausa(1500);

    // ── tandas ──
    const t1 = await evaluar(cli, `(()=>{ rPedidos(); return document.querySelectorAll('#pList>.pc').length; })()`);
    chk('la primera tanda son las de arriba (<=40), no la lista entera', t1 > 0 && t1 <= 40, t1);
    chk('despues llegan todas', await esperar(cli, `document.querySelectorAll('#pList>.pc').length===${ESPERADAS}`, 20000),
      await evaluar(cli, `document.querySelectorAll('#pList>.pc').length`));
    const rep = await evaluar(cli, `(()=>{ var k={},d=0; document.querySelectorAll('#pList>.pc').forEach(function(c){ if(k[c.dataset.pcKey])d++; k[c.dataset.pcKey]=1; }); return d; })()`);
    chk('ninguna repetida', rep === 0, rep);

    // dos pintadas seguidas
    await evaluar(cli, `(()=>{ rPedidos(); rPedidos(); return 1; })()`);
    await esperar(cli, `document.querySelectorAll('#pList>.pc').length>=${ESPERADAS}`, 20000);
    await pausa(800);
    const tras2 = await evaluar(cli, `(()=>{ var k={},d=0,n=0; document.querySelectorAll('#pList>.pc').forEach(function(c){ n++; if(k[c.dataset.pcKey])d++; k[c.dataset.pcKey]=1; }); return {n:n,d:d}; })()`);
    chk('dos pintadas seguidas no se intercalan (misma cantidad, sin repetidas)', tras2.n === ESPERADAS && tras2.d === 0, tras2);

    // ── cuerpo al abrir ──
    chk('ninguna tarjeta trae el cuerpo armado de entrada',
      await evaluar(cli, `document.querySelectorAll('#pList>.pc .pc-body').length===0`), await evaluar(cli, `document.querySelectorAll('#pList>.pc .pc-body').length`));
    const abierta = await evaluar(cli, `(()=>{
      var c=[].find.call(document.querySelectorAll('#pList>.pc'),function(x){return /Decidir Origen/.test(x.textContent) && !/Cobrado/.test(x.textContent);});   /* cobrada no se edita: el ERP no ofrece el boton, y esta bien */
      if(!c) return {err:'no hay una Pendiente de origen'};
      c.querySelector('.pc-summary').click();
      var b=c.querySelector('.pc-body');
      var r={abierta:!c.classList.contains('collapsed'), cuerpo:!!b, alto:b?Math.round(b.getBoundingClientRect().height):0,
             confirmar:/CONFIRMAR ORIGEN/.test(c.textContent), fecha:!!c.querySelector('.pc-fe-input'), editar:/Editar productos/.test(c.textContent)};
      c.querySelector('.pc-summary').click(); c.querySelector('.pc-summary').click();
      r.cuerpos=c.querySelectorAll('.pc-body').length; r.abiertaOtraVez=!c.classList.contains('collapsed');
      return r; })()`);
    chk('al abrir la tarjeta aparece el cuerpo, visible', abierta.abierta === true && abierta.cuerpo === true && abierta.alto > 40, abierta);
    chk('el cuerpo trae sus controles (CONFIRMAR ORIGEN, la fecha, Editar productos)', abierta.confirmar === true && abierta.fecha === true && abierta.editar === true, abierta);
    chk('cerrar y abrir no duplica el cuerpo', abierta.cuerpos === 1 && abierta.abiertaOtraVez === true, abierta);

    // ── _ordGo a una del fondo ──
    await evaluar(cli, `rPedidos()`);
    const fondo = PEDIDOS.filter(p => p.c && p.$)[ESPERADAS - 5];
    await evaluar(cli, `window._ordGo('pedidos', ${JSON.stringify(fondo.h)}, ${JSON.stringify(fondo.n)})`);
    const og = await esperar(cli, `(()=>{ var c=document.querySelector('.pc[data-pc-key="${fondo.h}|${fondo.n}"]'); return !!c && !c.classList.contains('collapsed') && !!c.querySelector('.pc-body'); })()`, 8000);
    chk('_ordGo abre una tarjeta del fondo de la lista, aunque todavia no exista al llamarlo', og === true);

    chk('content-visibility:auto en las tarjetas',
      await evaluar(cli, `getComputedStyle(document.querySelector('#pList>.pc')).contentVisibility==='auto'`));

    // ── bloques de JS con CPU x4 ──
    await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
    const lt = await evaluar(cli, `(async()=>{ window.__lt=[]; var t=performance.now(); rPedidos();
      while(performance.now()-t<30000){ if(document.querySelectorAll('#pList>.pc').length>=${ESPERADAS})break; await new Promise(r=>setTimeout(r,30)); }
      await new Promise(r=>setTimeout(r,400)); var l=window.__lt.filter(function(x){return x.t>=t;});
      return {max:l.reduce(function(m,x){return Math.max(m,x.d);},0), total:l.reduce(function(a,x){return a+x.d;},0)}; })()`);
    await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 1 });
    chk('pintar la lista con CPU x4: ningun bloque de mas de 400 ms', lt.max < 400, lt);

    // ── Actualizar pedidos ──
    const act = await evaluar(cli, `(async()=>{ var n=0, o=window.rPedidosHome; window.rPedidosHome=function(){n++; return o.apply(this,arguments);};
      var marca=document.querySelector('#pList>.pc'); marca.__viejo=true; actualizarPedidos();
      var t=performance.now(); while(performance.now()-t<8000){ var p=document.querySelector('#pList>.pc'); if(p&&!p.__viejo)break; await new Promise(r=>setTimeout(r,50)); }
      await new Promise(r=>setTimeout(r,600)); var p2=document.querySelector('#pList>.pc');
      window.rPedidosHome=o; return {home:n, repinto:!!p2&&!p2.__viejo}; })()`);
    chk('"Actualizar pedidos" repinta la lista abierta', act.repinto === true, act);
    chk('"Actualizar pedidos" NO pinta Pedidos Home estando en Pedidos', act.home === 0, act);

    // ── el ↻ de arriba ──
    /* El doble pedido de la version vieja solo aparece si pasaron mas de 90 s del
       ultimo refresco automatico (el arranque): antes de eso el test daria verde
       con el bug adentro. Y el grafico de Inicio tiene que haber bajado una vez,
       o "no se vuelve a pedir" no mide nada. */
    await evaluar(cli, `(()=>{ if(typeof M6!=='undefined' && !M6 && typeof rSeisMeses==='function') rSeisMeses(); return 1; })()`);
    chk('el grafico de Inicio bajo una vez (si no, lo de tendencia no mide nada)', await esperar(cli, `typeof M6!=='undefined' && !!M6`, 15000));
    const falta = 95000 - (Date.now() - tNav);
    if (falta > 0) { console.log('  (espero ' + Math.round(falta / 1000) + ' s: el freno del refresco automatico es de 90 s)'); await pausa(falta); }
    const ref = await evaluar(cli, `(async()=>{ window.__demora=1500; var desde=window.__gets.length; var t=performance.now();
      refreshContextual(); var b=document.getElementById('hdrRefresh');
      await new Promise(r=>setTimeout(r,100));
      while(performance.now()-t<20000){ if(!b.classList.contains('spinning'))break; await new Promise(r=>setTimeout(r,50)); }
      var giro=Math.round(performance.now()-t);
      await new Promise(r=>setTimeout(r,6000));
      var g=window.__gets.slice(desde).map(function(x){return x.a;}); window.__demora=200;
      return {giro:giro, gets:g}; })()`);
    const cuenta = a => ref.gets.filter(x => x === a).length;
    chk('el ↻ en Pedidos pide pedidos y OCs', cuenta('pedidosLight') >= 1 && cuenta('ocLight') >= 1, ref);
    chk('el ↻ en Pedidos NO pide la caja ni los cobros pendientes', cuenta('cajaLight') === 0 && cuenta('cobrosPendientes') === 0, ref);
    chk('el ↻ no vuelve a pedir los pedidos al terminar', cuenta('pedidosLight') === 1, ref);
    chk('el ↻ gira lo que tardan pedidos+OCs, no los 4 endpoints', ref.giro < 2700, ref.giro);
    chk('tendencia no se vuelve a pedir estando en Pedidos', cuenta('tendencia') === 0, ref);

    // ── el pintado de fondo espera a que no se toque la pantalla ──
    const fondoP = await evaluar(cli, `(async()=>{ var pint=[], o=_SECCION.inicio; _SECCION.inicio=function(){ pint.push(performance.now()); return o.apply(this,arguments); };
      var t=performance.now(); render();
      for(var i=0;i<6;i++){ window.dispatchEvent(new Event('pointerdown')); await new Promise(r=>setTimeout(r,700)); }
      var mientras=pint.length;
      var t2=performance.now(); while(performance.now()-t2<9000){ if(pint.length)break; await new Promise(r=>setTimeout(r,100)); }
      _SECCION.inicio=o; return {mientras:mientras, despues:pint.length, espero:pint.length?Math.round(pint[0]-t2):null}; })()`);
    chk('mientras se toca la pantalla no se pintan tabs cerradas', fondoP.mientras === 0, fondoP);
    chk('cuando se deja de tocar, se pintan', fondoP.despues >= 1, fondoP);

    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(1); }
})();
