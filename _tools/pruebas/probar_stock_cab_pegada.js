/* Stock > PRODUCTOS: el encabezado de la tabla queda pegado al scrollear (13/9/2026).

   node probar_stock_cab_pegada.js [390|1440]
   APP=app_viejo_tmp.html node probar_stock_cab_pegada.js 390    ← la direccion contraria

   Tadeo: "scrolleo para abajo y no se en que columna estoy". Todo el backend va
   STUBBEADO con 34 productos inventados (el repo es publico). Sin token. Sostiene:
   · bajando la pagina, Inicial/Comprado/.../Disponible quedan pegados JUSTO abajo del
     header (ni tapados ni con un hueco), y se ven: lo que hay en ese punto es el
     encabezado y no una fila que pasa por abajo;
   · las 8 columnas del encabezado caen exactamente sobre las de las filas;
   · deslizando la tabla de costado (el celular) el encabezado se desliza con ella, y
     deslizando el encabezado se desliza la tabla;
   · la columna Producto sigue clavada a la izquierda en el encabezado;
   · pasada la tabla, el encabezado se va con ella (no flota encima de lo de abajo);
   · el header del ERP mide lo mismo que antes (52 px en el celular, 48 en la compu). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
const CEL = ANCHO <= 560;

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 500) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const ABR = ['PPM', 'PPJyQ', 'PPCyQ', 'PMu', 'PMa', 'PJyQ', 'PCC', 'PJyM', 'SCo', 'SJyQ', 'SCa', 'SQB', 'SL', 'SPyP', 'SE',
  'ECaC', 'EJyQ', 'ECyQ', 'EV', 'TP', 'TJyQ', 'TCa', 'TV', 'RC', 'RP', 'TG', 'TLC', 'TC', 'F'];
const STOCK = ABR.map((a, i) => ({ n: 'Producto de prueba ' + (i + 1), a, i: 10, c: 5, v: 8, f: 7, r: 1, d: 6, u: 'u',
  p: 1000, co: 500, iv: 3500, pd: { ustariz: 7, moresco: 0 }, pz: 0 }))
  .concat(['CCo', 'CEn', 'CLo', 'CPi', 'CVa'].map((a, i) => ({ n: 'Carne de prueba ' + (i + 1), a, i: 0, c: 12.5, v: 8.25, f: 4.25, r: 0, d: 4.25, u: 'kg',
    p: 30000, co: 20000, iv: 85000, pd: { ustariz: 4.25, moresco: 0 }, pz: 1 })));
const ahora = new Date();
const dn = ahora.getDay() || 7;
const lunes = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (dn - 1));
const ADMIN = { ts: Date.now(), pedidos: [], canales: [], totales: {}, oc: { lista: [] }, caja: { cuentas: [] }, stock: STOCK,
  stockDeps: [{ id: 'ustariz', nombre: 'Deposito Ustariz' }, { id: 'moresco', nombre: 'Deposito Moresco' }],
  stockCierre: new Date(lunes.getTime() + 40 * 60e3).toISOString() };

const EXTRA = `
  (function(){
    window.__listo=1;
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v2'); localStorage.setItem('maleu_tab','stock');
         Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0) localStorage.removeItem(k); }); }catch(e){}
    var ADMIN=${JSON.stringify(ADMIN)};
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')>-1&&post) return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}}));
      if(url.indexOf('script.google.com')>-1){
        var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
        var cuerpo = a==='admin' ? ADMIN
          : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true}
          : a==='cajaLight' ? {ts:1,caja:{},saldoBase:{},gastos:[],ingresos:[],movimientos:[],efMano:[],cuentas:[]}
          : a==='ocLight' ? {ok:true,oc:{lista:[]}} : a==='cobrosPendientes' ? {ok:true,cobros:[]}
          : a==='ventas' ? {ok:true,v:[]} : {ok:false,error:'stub'};
        return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(cuerpo),{status:200,headers:{'Content-Type':'application/json'}})); },150); });
      }
      return o.apply(this,arguments); };
  })();
`;

/* Lee la geometria: el header del ERP, el encabezado de la tabla, y las celdas del
   encabezado contra las de la primera fila VISIBLE debajo de el. */
const GEO = `(function(){
  var hdr=document.querySelector('.hdr').getBoundingClientRect();
  var cab=document.querySelector('#sList .st-cab'); if(!cab) return {sinCab:true};
  var cr=cab.getBoundingClientRect();
  var celdasCab=[].map.call(cab.children,function(c){var r=c.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right)};});
  var fila=[].filter.call(document.querySelectorAll('#sList .si'),function(f){return f.getBoundingClientRect().top>=cr.bottom;})[0]
    ||document.querySelector('#sList .si');
  var celdasFila=[].map.call(fila.children,function(c){var r=c.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right)};});
  var medio=document.elementFromPoint(Math.round(cr.left+cr.width/2), Math.round(cr.top+cr.height/2));
  var fijaCab=cab.querySelector('.st-fija').getBoundingClientRect();
  var cu=document.querySelector('#sList .st-cuerpo')||document.querySelector('#sList .st-carril');
  var cabCarril=cab.closest('.st-carril');
  var sl=document.getElementById('sList').getBoundingClientRect();
  return { hdrH:Math.round(hdr.height), hdrBottom:Math.round(hdr.bottom), cabTop:Math.round(cr.top), cabBottom:Math.round(cr.bottom),
    celdasCab:celdasCab, celdasFila:celdasFila, medioEsCab:!!(medio&&medio.closest&&medio.closest('.st-cab')),
    medio:medio?(medio.className||medio.tagName):null, fijaIzq:Math.round(fijaCab.left), carrilIzq:cabCarril?Math.round(cabCarril.getBoundingClientRect().left):null,
    cabDentroDelCuerpo:!!(cu&&cu.contains(cab)), slCuerpo:cu?cu.scrollLeft:null, slCab:cabCarril?cabCarril.scrollLeft:null,
    desliza:cu?cu.scrollWidth>cu.clientWidth:null, slTop:Math.round(sl.top), slBottom:Math.round(sl.bottom),
    y:Math.round(window.scrollY), altoDoc:document.documentElement.scrollHeight, vh:window.innerHeight };
})()`;

const alinea = g => {
  if (!g.celdasCab || !g.celdasFila || g.celdasCab.length !== g.celdasFila.length) return false;
  return g.celdasCab.every((c, i) => Math.abs(c.l - g.celdasFila[i].l) <= 1 && Math.abs(c.r - g.celdasFila[i].r) <= 1);
};

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: 1, mobile: CEL });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Stock > PRODUCTOS · encabezado pegado · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && window.__listo===1`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('stock'); 1`);
    if (!await esperar(cli, `window.D && Array.isArray(D.stock) && D.stock.length===${STOCK.length} && document.querySelectorAll('#sList .si').length===${STOCK.length}`, 30000)) {
      console.log('  la tabla no pinto (sin esto lo de abajo no mide nada)'); salir(1);
    }
    await pausa(800);

    let g = await evaluar(cli, GEO);
    chk('se examinaron las ' + STOCK.length + ' filas y el encabezado', !g.sinCab, g);
    chk('el header del ERP mide lo de siempre (' + g.hdrH + ' px)', g.hdrH === (CEL ? 52 : 48), g.hdrH);
    chk('la tabla es mas larga que la pantalla (si no, no hay nada que pegar)', g.altoDoc > g.vh + 600, { altoDoc: g.altoDoc, vh: g.vh });
    chk('arriba de todo, las columnas del encabezado caen sobre las de las filas', alinea(g), { cab: g.celdasCab, fila: g.celdasFila });
    chk('el encabezado NO vive adentro del carril del cuerpo (ahi no se puede pegar)', g.cabDentroDelCuerpo === false);

    /* Bajar la pagina hasta la mitad de la tabla */
    await evaluar(cli, `window.scrollTo(0, window.scrollY + document.getElementById('sList').getBoundingClientRect().top + 700); 1`);
    await pausa(500);
    g = await evaluar(cli, GEO);
    chk('bajando, el encabezado queda pegado JUSTO abajo del header (' + g.cabTop + ' vs ' + g.hdrBottom + ')', Math.abs(g.cabTop - g.hdrBottom) <= 1, g);
    chk('y se ve: en el medio del encabezado esta el encabezado, no una fila', g.medioEsCab === true, g.medio);
    chk('y las columnas siguen cayendo sobre las filas de abajo', alinea(g), { cab: g.celdasCab, fila: g.celdasFila });
    /* Solo en el celular: en la compu la tabla no se desliza y la celda lleva el mismo
       relleno de 14px que las filas (lo que importa ahi ya lo mide "alinea"). */
    if (CEL) chk('la columna Producto del encabezado esta clavada a la izquierda', Math.abs(g.fijaIzq - g.carrilIzq) <= 1, { fija: g.fijaIzq, carril: g.carrilIzq });

    if (CEL) {
      chk('en el celular la tabla se desliza de costado', g.desliza === true, g);
      /* Deslizar el cuerpo */
      await evaluar(cli, `(function(){ var c=document.querySelector('#sList .st-cuerpo')||document.querySelector('#sList .st-carril'); c.scrollLeft=140; return 1; })()`);
      await pausa(400);
      g = await evaluar(cli, GEO);
      chk('deslizando la tabla, el encabezado se desliza con ella (' + g.slCab + ' / ' + g.slCuerpo + ')', g.slCuerpo > 0 && g.slCab === g.slCuerpo, g);
      chk('y las columnas siguen alineadas', alinea(g), { cab: g.celdasCab, fila: g.celdasFila });
      chk('y Producto sigue clavado a la izquierda', Math.abs(g.fijaIzq - g.carrilIzq) <= 1, { fija: g.fijaIzq, carril: g.carrilIzq });
      /* Deslizar el encabezado */
      const cabDesliza = await evaluar(cli, `(function(){ var cab=document.querySelector('#sList .st-cab').closest('.st-carril');
        cab.dispatchEvent(new Event('pointerdown')); cab.dispatchEvent(new Event('touchstart')); cab.scrollLeft=40; return cab.scrollLeft; })()`);
      await pausa(400);
      g = await evaluar(cli, GEO);
      chk('deslizando el encabezado, la tabla se desliza con el', cabDesliza === 40 && g.slCuerpo === 40 && g.slCab === 40, { cabDesliza, g });
      chk('y las columnas siguen alineadas', alinea(g), { cab: g.celdasCab, fila: g.celdasFila });
      /* Volver a tocar el cuerpo le devuelve el mando */
      await evaluar(cli, `(function(){ var c=document.querySelector('#sList .st-cuerpo'); if(!c) return 0; c.dispatchEvent(new Event('touchstart')); c.scrollLeft=90; return 1; })()`);
      await pausa(400);
      g = await evaluar(cli, GEO);
      chk('volver a deslizar la tabla le devuelve el mando', g.slCuerpo === 90 && g.slCab === 90, g);
    }

    /* Pasada la tabla, el encabezado se va con ella */
    await evaluar(cli, `window.scrollTo(0, window.scrollY + document.getElementById('sList').getBoundingClientRect().bottom - 20); 1`);
    await pausa(500);
    g = await evaluar(cli, GEO);
    chk('pasada la tabla, el encabezado no flota encima de lo de abajo', g.cabBottom <= g.slBottom + 1, g);

    /* Repintar (llega un volcado nuevo) no rompe el pegado */
    await evaluar(cli, `window.scrollTo(0,0); rStock(); window.scrollTo(0, window.scrollY + document.getElementById('sList').getBoundingClientRect().top + 500); 1`);
    await pausa(500);
    g = await evaluar(cli, GEO);
    chk('despues de repintar sigue pegado', Math.abs(g.cabTop - g.hdrBottom) <= 1 && alinea(g), g);

    const desb = await evaluar(cli, `document.documentElement.scrollWidth-document.documentElement.clientWidth`);
    chk('la pagina no desborda a lo ancho', desb <= 0, desb);
    const propios = errores.filter(e => /rStock|_stCabSeguir|stSwitchTab/.test(e));
    chk('ni un error propio de Stock en la consola', propios.length === 0, propios);
  } catch (e) {
    console.log('  EXCEPCION ' + (e && e.stack || e)); mal++;
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal  (' + ANCHO + 'px)');
  salir(mal ? 1 : 0);
})();
