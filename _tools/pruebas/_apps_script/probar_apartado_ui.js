/* Productos > Stock y Contar con la regla nueva de lo comprado por orden de compra
   para un pedido (9/10/2026, palanca STOCK_OC_AL_FREEZER del backend).

     node _tools/servir.js 8095      (en otra terminal)
     BASE=http://localhost:8095 node _tools/pruebas/probar_apartado_ui.js [390|1440]
     APP=app_viejo_tmp.html ...                                    ← la direccion contraria

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). Sin token.
   Cuatro fases, por la URL:
     a  palanca en «si»: lo recibido para un pedido esta en el Fisico y en el
        Reservado. No hay columna «Apartado»; el Reservado se toca y dice de
        quien es y en que freezer. Contar dice que eso tambien se cuenta.
     b  palanca en «no»: la pantalla del 9/10 a la tarde (v573), con «Apartado».
     c  palanca en «si» pero la lista de OC viene de otra fuente y no dice que
        entro al freezer: no se afirma nada (ni Apartado ni de quien es).
     d  palanca en «si» y quedo una linea recibida con la regla vieja: la
        columna «Apartado» sigue, solo con esa. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};
const ahora = new Date();
const dn = ahora.getDay() || 7;
const lunes = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (dn - 1));

/* Con la regla nueva (fases a, c, d) lo de los pedidos YA esta en f y en r:
   Sorrentinos Calabaza 15 libres + 3 de pedidos = 18 fisico, 3 reservado. */
const P = (n, a, f, r, pd) => ({ n, a, i: f, c: 0, v: 0, f, r, d: f - r, u: 'u', p: 1000, co: 500, iv: f * 500, pd, pz: 0 });
const STOCK_NUEVA = [
  P('Sorrentinos Calabaza', 'SCa', 18, 3, { ustariz: 17, moresco: 1 }),
  P('Pack Muzzarella x2', 'PPM', 12, 4, { ustariz: 12, moresco: 0 }),     // 2 de un pedido por OC + 2 de un pedido del stock
  P('Tarta Verdura', 'TV', 5, 0, { ustariz: 5, moresco: 0 })
];
const STOCK_VIEJA = [
  P('Sorrentinos Calabaza', 'SCa', 15, 0, { ustariz: 15, moresco: 0 }),
  P('Pack Muzzarella x2', 'PPM', 10, 2, { ustariz: 10, moresco: 0 }),
  P('Tarta Verdura', 'TV', 5, 0, { ustariz: 5, moresco: 0 })
];
const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz', user: 'x' }, { id: 'moresco', nombre: 'Deposito Moresco', user: '' }];
const PEDIDOS = [
  { h: 'Home', n: '501', c: 'Ana Prueba', es: 'Pendiente', o: 'Orden de Compra', p: [] },
  { h: 'Home', n: '502', c: 'Beto Ensayo', es: 'Pendiente', o: 'Orden de Compra', p: [] },
  { h: 'Home', n: '503', c: 'Ya Entregado', es: 'Entregado', o: 'Orden de Compra', p: [] }
];
const LIN = (pedido, cliente, abbr, q, estado, dep, ap) => ({ canal: 'Home', pedido, cliente, abbr, q, proveedor: 'Prov', estado, dep, ap });
const OC_NUEVA = [
  LIN('501', 'Ana Prueba', 'SCa', 2, 'Recibido', 'ustariz', 2),
  LIN('502', 'Beto Ensayo', 'SCa', 1, 'Recibido', 'moresco', 1),
  LIN('501', 'Ana Prueba', 'PPM', 2, 'Recibido', 'ustariz', 2),
  LIN('503', 'Ya Entregado', 'TV', 4, 'Recibido', 'ustariz', 0),          // ya salio: no es de nadie
  LIN('502', 'Beto Ensayo', 'TV', 1, 'Pedido', '', 0)                     // todavia no llego
];
const sinDep = l => { const o = Object.assign({}, l); delete o.dep; delete o.ap; return o; };
const OC = {
  a: { lista: OC_NUEVA, alFreezer: 'si' },
  b: { lista: OC_NUEVA.map(l => Object.assign({}, l, { dep: '', ap: 0 })), alFreezer: 'no' },
  c: { lista: OC_NUEVA.map(sinDep) },                                     // otra fuente: sin la clave ni la palanca
  d: { lista: OC_NUEVA.concat([LIN('502', 'Beto Ensayo', 'TV', 2, 'Recibido', '', 0)]), alFreezer: 'si' }
};
const DEPOSITOS = s => ({ deps: [{ id: 'ustariz', nombre: 'Deposito Ustariz', col: 18 }, { id: 'moresco', nombre: 'Deposito Moresco', col: 19 }],
  productos: s.map(x => ({ a: x.a, n: x.n, u: x.u, f: x.f, dep: 'ustariz', porDep: Object.assign({}, x.pd), pz: 0, pzDep: {} })) });

const EXTRA = `
  (function(){
    var fase=(location.search.match(/fase=([a-z])/)||[])[1]||'a';
    window.__fase=fase; window.__gets=[]; window.__posts=[];
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v2'); localStorage.setItem('maleu_tab','stock');
         /* c: la palanca se recuerda de una respuesta anterior del backend */
         if(fase==='c')localStorage.setItem('maleu_oc_alfreezer','si'); else localStorage.removeItem('maleu_oc_alfreezer');
         Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0) localStorage.removeItem(k); }); }catch(e){}
    var OC=${JSON.stringify(OC)}[fase];
    var STOCK=(fase==='b')?${JSON.stringify(STOCK_VIEJA)}:${JSON.stringify(STOCK_NUEVA)};
    var PED=${JSON.stringify(PEDIDOS)}, DEPS=${JSON.stringify(DEPS)};
    var DEPOSITOS=(fase==='b')?${JSON.stringify(DEPOSITOS(STOCK_VIEJA))}:${JSON.stringify(DEPOSITOS(STOCK_NUEVA))};
    var CIERRE=${JSON.stringify(new Date(lunes.getTime() + 40 * 60e3).toISOString())};
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')>-1&&post){ window.__posts.push(String(x.body).slice(0,200));
        return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}})); }
      if(url.indexOf('script.google.com')>-1){
        var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
        var cuerpo = a==='admin' ? {ts:Date.now(),pedidos:PED,canales:[],totales:{},oc:OC,caja:{cuentas:[]},stock:STOCK,stockDeps:DEPS,stockCierre:CIERRE}
          : a==='stockTab' ? {ok:true,ts:Date.now(),stock:STOCK,stockDeps:DEPS,stockCierre:CIERRE}
          : a==='depositos' ? DEPOSITOS
          : a==='pedidosLight' ? {ts:Date.now(),pedidos:PED,canales:[],light:true}
          : a==='cajaLight' ? {ts:1,caja:{},saldoBase:{},gastos:[],ingresos:[],movimientos:[],efMano:[],cuentas:[]}
          : a==='ocLight' ? {ok:true,oc:OC} : a==='cobrosPendientes' ? {ok:true,cobros:[]}
          : a==='ventas' ? {ok:true,v:[]}
          : {ok:false,error:'stub'};
        var txt=JSON.stringify(cuerpo);
        return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); },150); });
      }
      return o.apply(this,arguments); };
  })();
`;

const LEER = `(function(){
  var cab=[].map.call(document.querySelectorAll('#sList .st-cab > div'),function(c){ var s=c.querySelector('.st-lg'); return (s||c).textContent.trim(); });
  var filas={};
  document.querySelectorAll('#sList .si').forEach(function(f){
    var cs=[].map.call(f.children,function(c){return c.textContent.trim();});
    var bot=[].map.call(f.querySelectorAll('button.st-ap-btn'),function(b){ var r=b.getBoundingClientRect(); return {txt:b.textContent.trim(), aria:b.getAttribute('aria-label')||'', oc:b.getAttribute('onclick')||'', alto:Math.round(r.height), ancho:Math.round(r.width)}; });
    filas[cs[0]]={celdas:cs.slice(1), bot:bot};
  });
  var det={}; document.querySelectorAll('#sList .st-ap-det').forEach(function(d){ var r=d.getBoundingClientRect(); det[d.id]={txt:d.textContent.trim(), visible:getComputedStyle(d).display!=='none', izq:Math.round(r.left), der:Math.round(r.right)}; });
  return { cab:cab, filas:filas, det:det, pie:(document.querySelector('#sList .st-pie')||{}).textContent||'',
    anchoPag:document.documentElement.scrollWidth, anchoVent:window.innerWidth,
    modo:(typeof _ocAlFreezerModo==='function')?_ocAlFreezerModo():'(no existe)',
    ocLista:!!(window.D&&D.oc&&D.oc.lista&&D.oc.lista.length), peds:!!(window.D&&D.pedidos&&D.pedidos.length), posts:window.__posts.length };
})()`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async fase => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&fase=' + fase });
    if (!await esperar(cli, `typeof go==='function' && window.__fase===${JSON.stringify(fase)}`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('stock'); 1`);
    if (!await esperar(cli, `window.D && Array.isArray(D.stock) && D.stock.length===3 && document.querySelectorAll('#sList .si').length===3 && D.oc && Array.isArray(D.oc.lista) && D.oc.lista.length>=5 && Array.isArray(D.pedidos) && D.pedidos.length===3`, 30000)) {
      console.log('  la tabla no pinto con stock + pedidos + OC (sin esto lo de abajo no mide nada)'); salir(1);
    }
    await pausa(500);
    await evaluar(cli, `if(!document.getElementById('p-stock').classList.contains('on'))go('stock'); try{rStock();}catch(e){} 1`);
    await pausa(400);
    if (ANCHO >= 1000) {   // como lo usa Tadeo: con el cajon DESPLEGADO
      await evaluar(cli, `if(!document.body.classList.contains('sb-open')&&typeof sbToggle==='function')sbToggle(); 1`);
      await pausa(400);
    }
    return evaluar(cli, LEER);
  };
  const cel = (L, nf, nc) => { const i = L.cab.indexOf(nc); const f = L.filas[nf] || { celdas: [] }; return i > 0 ? (f.celdas[i - 1] || '') : ('(sin columna ' + nc + ')'); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Stock con lo de los pedidos adentro del freezer · ' + ANCHO + 'px · ' + APP + ' ==');

    /* ── a: palanca prendida ── */
    console.log('-- a: palanca en «si» --');
    let L = await ir('a');
    chk('se examinaron las 3 filas, con pedidos y ordenes de compra cargados', Object.keys(L.filas).length === 3 && L.ocLista && L.peds, Object.keys(L.filas));
    chk('la pantalla sabe que la palanca esta en «si»', L.modo === 'si', L.modo);
    chk('NO hay columna «Apartado»', L.cab.indexOf('Apartado') < 0 && L.cab.indexOf('Reservado') > 0, L.cab);
    chk('Sorrentinos Calabaza: Fisico 18 y Reservado 3 (lo de los pedidos esta adentro)', cel(L, 'Sorrentinos Calabaza', 'Físico') === '18' && cel(L, 'Sorrentinos Calabaza', 'Reservado') === '3', L.filas['Sorrentinos Calabaza']);
    const bSCa = (L.filas['Sorrentinos Calabaza'] || { bot: [] }).bot;
    chk('el Reservado es un boton que dice para que es', bSCa.length === 1 && bSCa[0].txt === '3' && /reservado/i.test(bSCa[0].aria), bSCa);
    /* 38 px: es el mismo boton que el «Apartado» de v573 (.st-ap-btn), no uno nuevo. */
    chk('  y mide lo mismo que el boton de Apartado de v573 (38 px en el celular, 30 en escritorio)', bSCa.length === 1 && bSCa[0].alto >= (ANCHO <= 560 ? 38 : 28) && bSCa[0].ancho >= (ANCHO <= 560 ? 38 : 28), bSCa);
    chk('una fila sin nada de pedidos no tiene boton (Tarta Verdura: lo de #503 ya salio y lo de #502 no llego)', (L.filas['Tarta Verdura'] || { bot: [1] }).bot.length === 0, L.filas['Tarta Verdura']);
    chk('el detalle arranca cerrado', L.det['stApD_r_SCa'] && L.det['stApD_r_SCa'].visible === false, L.det);
    await evaluar(cli, `[].filter.call(document.querySelectorAll('#sList .si button.st-ap-btn'),function(b){return /Sorrentinos Calabaza/.test(b.getAttribute('aria-label'));})[0].click(); 1`);
    await pausa(200);
    L = await evaluar(cli, LEER);
    const dSCa = L.det['stApD_r_SCa'] || { txt: '' };
    chk('al tocarlo dice de quien es, con el pedido y el freezer', dSCa.visible === true && /2 de Ana Prueba \(Home #501\), en Ustariz/.test(dSCa.txt) && /1 de Beto Ensayo \(Home #502\), en Moresco/.test(dSCa.txt), dSCa);
    chk('  y entra en la pantalla', dSCa.izq >= 0 && dSCa.der <= L.anchoVent + 1, dSCa);
    const dPPM = L.det['stApD_r_PPM'] || { txt: '' };
    chk('Pack Muzzarella (4 reservados, 2 por OC): dice que el resto son pedidos del stock', /2 de Ana Prueba/.test(dPPM.txt) && /el resto \(2\) son pedidos que salen del stock/.test(dPPM.txt), dPPM);
    chk('el pie explica la regla nueva y ya no habla de «Apartado»', /entra al Físico/.test(L.pie) && /Reservado/.test(L.pie) && !/Apartado/.test(L.pie), L.pie);
    chk('la pagina no desborda', L.anchoPag <= L.anchoVent + 1, { pag: L.anchoPag, vent: L.anchoVent });
    /* Contar */
    await evaluar(cli, `stSwitchTab('contar'); 1`);
    await esperar(cli, `document.querySelectorAll('.stc-ap').length>0 || document.querySelectorAll('[id^="stcIn_"],.stc-fila,.stc-row').length>0`, 15000);
    await pausa(800);
    const C = await evaluar(cli, `(function(){ return { ap:[].map.call(document.querySelectorAll('.stc-ap'),function(e){return e.textContent.trim();}), ayuda:[].map.call(document.querySelectorAll('.stc-ayuda'),function(e){return e.textContent.trim();}) }; })()`);
    chk('Contar (freezer Ustariz): «Incluye 2 guardado para pedidos (… Ana Prueba …). Contalo tambien» en los dos productos', C.ap.length === 2 && C.ap.every(t => /Incluye 2/.test(t) && /Ana Prueba/.test(t) && /Contalo/.test(t)) && !C.ap.some(t => /Beto/.test(t)), C.ap);
    chk('Contar ya no dice «escribi solo lo del stock» ni «apartada para pedidos»', !C.ap.some(t => /solo lo del stock/.test(t)) && !C.ayuda.some(t => /apartada para pedidos/.test(t)), C);

    /* ── b: palanca apagada = v573 ── */
    console.log('-- b: palanca en «no» (como hoy) --');
    L = await ir('b');
    chk('la pantalla sabe que la palanca esta en «no»', L.modo === 'no', L.modo);
    chk('la columna «Apartado» sigue, entre Reservado y Disponible', L.cab.indexOf('Apartado') === L.cab.indexOf('Reservado') + 1 && L.cab.indexOf('Disponible') === L.cab.indexOf('Apartado') + 1, L.cab);
    chk('Sorrentinos Calabaza: Fisico 15, Reservado 0, Apartado 3', cel(L, 'Sorrentinos Calabaza', 'Físico') === '15' && cel(L, 'Sorrentinos Calabaza', 'Reservado') === '0' && cel(L, 'Sorrentinos Calabaza', 'Apartado') === '3', L.filas['Sorrentinos Calabaza']);
    chk('el Reservado NO es un boton; el Apartado si', (L.filas['Sorrentinos Calabaza'] || { bot: [] }).bot.length === 1 && /apartado/i.test(L.filas['Sorrentinos Calabaza'].bot[0].aria), (L.filas['Sorrentinos Calabaza'] || {}).bot);
    chk('el pie es el de hoy: «Apartado … no cuenta en el Fisico»', /Apartado/.test(L.pie) && /no cuenta en el Físico/.test(L.pie) && !/entra al Físico/.test(L.pie), L.pie);

    /* ── c: no se sabe ── */
    console.log('-- c: palanca en «si», la lista de OC no dice que entro --');
    L = await ir('c');
    chk('recuerda la palanca de la ultima respuesta del backend', L.modo === 'si', L.modo);
    chk('no inventa una columna «Apartado» con lineas que no sabe si entraron', L.cab.indexOf('Apartado') < 0, L.cab);
    chk('ni afirma de quien es el Reservado: sin boton', Object.keys(L.filas).every(k => L.filas[k].bot.length === 0), L.filas);

    /* ── d: quedo algo de la regla vieja ── */
    console.log('-- d: palanca en «si» y una linea recibida con la regla vieja --');
    L = await ir('d');
    chk('la columna «Apartado» sigue mientras quede algo viejo', L.cab.indexOf('Apartado') > 0, L.cab);
    chk('  y cuenta SOLO la linea vieja (Tarta Verdura 2), no lo que ya entro al Fisico', cel(L, 'Tarta Verdura', 'Apartado') === '2' && cel(L, 'Sorrentinos Calabaza', 'Apartado') === '·', { tv: L.filas['Tarta Verdura'], sca: L.filas['Sorrentinos Calabaza'] });
    chk('  y el Reservado de lo nuevo sigue teniendo su boton', (L.filas['Sorrentinos Calabaza'] || { bot: [] }).bot.some(b => /reservado/i.test(b.aria)), (L.filas['Sorrentinos Calabaza'] || {}).bot);

    chk('ningun POST en toda la corrida', L.posts === 0, L.posts);
    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  REVENTO: ' + (e && e.stack || e)); salir(1); }
})();
