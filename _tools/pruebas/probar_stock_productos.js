/* Stock > PRODUCTOS (13/9/2026, /auditoria).

   node probar_stock_productos.js [390|1440]
   APP=app_viejo_tmp.html node probar_stock_productos.js 390    ← la direccion contraria

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). Sin token.
   Sostiene:
   · la columna Ajuste: Inicial + Comprado − Vendidos ± Ajuste = Fisico, fila por fila;
   · la carne muestra lo comprado en kilos (y cierra) y no cuenta como "3 o menos";
   · "Donde esta" sale del MISMO volcado que la tabla, sin pedir action=depositos;
   · si el total de un producto no da lo que suman sus depositos, lo avisa y lo nombra;
   · con un backend viejo (sin reparto en el volcado) se sigue pidiendo depositos;
   · el nombre de un producto no se ejecuta como HTML;
   · despues de contar en CONTAR, volver a PRODUCTOS trae el stock nuevo UNA vez, lo
     dice mientras viaja, y si falla lo dice sin reintentar en bucle;
   · la foto de la semana pasada y el cierre del lunes que no corrio se avisan;
   · tocar una sub-tab de Ventas no le apaga el resaltado a Stock;
   · en escritorio el encabezado no tiene la barra blanca; minimo tactil; sin desborde. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

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

// El lunes de esta semana, 00:00 local (el test corre en hora argentina).
const ahora = new Date();
const dn = ahora.getDay() || 7;
const lunes = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (dn - 1));
const madrugadaDelLunes = ahora.getTime() < lunes.getTime() + 2 * 3600e3;

const P = (n, a, i, c, v, f, r, u, pd, pz) => ({ n, a, i, c, v, f, r, d: Math.round((f - r) * 1000) / 1000, u: u || 'u',
  p: 1000, co: 500, iv: Math.max(0, f) * 500, pd, pz: pz ? 1 : 0 });
const STOCK = [
  P('Pack Muzzarella x2', 'PPM', 7, 18, 25, 0, 0, 'u', { ustariz: 0, moresco: 0 }),          // cierra, sin nada
  P('Pack Jamon y Queso x2', 'PPJyQ', 10, 7, 15, 0, 0, 'u', { ustariz: 0, moresco: 0 }),     // conteo: -2
  P('Empanadas Jamon y Queso x8', 'EJyQ', 8, 2, 10, 1, 1, 'u', { ustariz: 0, moresco: 0 }),  // +1 y el total no da los depositos
  P('Sorrentinos Langostinos', 'SL', 0, 3, 0, 3, 0, 'u', { ustariz: 3, moresco: 0 }),         // cierra, 3 o menos
  P('<img src=x onerror="window.__xss=1">Tarta', 'TV', 4, 0, 0, 4, 0, 'u', { ustariz: 4, moresco: 0 }),
  P('Carne Lomo', 'CLo', 0, 25.025, 21.135, 3.89, 0, 'kg', { ustariz: 3.89, moresco: 0 }, true),
  P('Carne Picaña', 'CPi', 0, 0, 0, 0, 0, 'kg', { ustariz: 0, moresco: 0 }, false)
];
const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz' }, { id: 'moresco', nombre: 'Deposito Moresco' }];
const DEPOSITOS = { deps: [{ id: 'ustariz', nombre: 'Deposito Ustariz', col: 18 }, { id: 'moresco', nombre: 'Deposito Moresco', col: 19 }],
  productos: STOCK.map(s => ({ a: s.a, n: s.n, u: s.u, f: s.f, dep: 'ustariz', porDep: Object.assign({}, s.pd), pz: s.pz ? 1 : 0, pzDep: {} })) };
const ADMIN = (extra) => Object.assign({ ts: Date.now(), pedidos: [], canales: [], totales: {}, oc: { lista: [] },
  caja: { cuentas: [] }, stock: STOCK, stockDeps: DEPS, stockCierre: new Date(lunes.getTime() + 40 * 60e3).toISOString() }, extra || {});

/* Fases (por la URL, porque addScriptToEvaluateOnNewDocument ACUMULA):
   a = backend nuevo · b = el volcado de despues de contar falla · c = el cierre no corrio
   d = la foto es de la semana pasada · e = backend viejo, sin reparto en el volcado */
const EXTRA = `
  (function(){
    var fase=(location.search.match(/fase=([a-z])/)||[])[1]||'a';
    window.__fase=fase; window.__gets=[]; window.__posts=[]; window.__nAdmin=0;
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v2'); localStorage.setItem('maleu_tab','stock');
         Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0) localStorage.removeItem(k); }); }catch(e){}
    var ADMIN_A=${JSON.stringify(ADMIN())};
    var cuerpoAdmin=function(){
      window.__nAdmin++;
      if(fase==='b'&&window.__nAdmin>1) return {ok:false,error:'stub caido'};
      if(fase==='c') return Object.assign({},ADMIN_A,{stockCierre:${JSON.stringify(new Date(lunes.getTime() - 86400e3).toISOString())}});
      if(fase==='d') return Object.assign({},ADMIN_A,{ts:${lunes.getTime() - 3600e3}});
      if(fase==='e'){ var o=Object.assign({},ADMIN_A); delete o.stockDeps; o.stock=o.stock.map(function(s){ var x=Object.assign({},s); delete x.pd; delete x.pz; return x; }); return o; }
      if(window.__nAdmin>1){ var n=JSON.parse(JSON.stringify(ADMIN_A)); n.stock.forEach(function(s){ if(s.a==='SL'){ s.f=4; s.d=4; s.pd.ustariz=4; } }); n.ts=Date.now(); return n; }
      return ADMIN_A;
    };
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')>-1&&post){ var b={}; try{ b=JSON.parse(x.body); }catch(e){ b={crudo:String(x.body)}; } window.__posts.push(b);
        return Promise.resolve(new Response(JSON.stringify({ok:true,abbr:b.abbr,total:Number(b.cantidad)||0}),{status:200,headers:{'Content-Type':'application/json'}})); }
      if(url.indexOf('script.google.com')>-1){
        var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
        var cuerpo = a==='admin' ? cuerpoAdmin()
          : a==='depositos' ? ${JSON.stringify(DEPOSITOS)}
          : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true}
          : a==='cajaLight' ? {ts:1,caja:{},saldoBase:{},gastos:[],ingresos:[],movimientos:[],efMano:[],cuentas:[]}
          : a==='ocLight' ? {ok:true,oc:{lista:[]}} : a==='cobrosPendientes' ? {ok:true,cobros:[]}
          : a==='ventas' ? {ok:true,v:[]}
          : {ok:false,error:'stub'};
        var txt=JSON.stringify(cuerpo);
        var demora = (a==='admin'&&window.__nAdmin>1) ? 2500 : 150;
        return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); },demora); });
      }
      return o.apply(this,arguments); };
  })();
`;

const LEER = `(function(){
  var k={}; document.querySelectorAll('#sKpi .card').forEach(function(c){ var l=c.querySelector('.kl'),v=c.querySelector('.kv'),s=c.querySelector('.ks');
    if(l)k[l.textContent.trim()]={v:v?v.textContent:'',s:s?s.textContent:''}; });
  var filas={}; document.querySelectorAll('#sList .si').forEach(function(f){ var cs=[].map.call(f.children,function(c){return c.textContent;}); filas[cs[0]]={celdas:cs.slice(1), cls:f.lastElementChild.className}; });
  var cab=[].map.call(document.querySelectorAll('#sList .st-cab > div'),function(c){ var s=c.querySelector('.st-lg'); return (s||c).textContent.trim(); });
  return { k:k, filas:filas, cab:cab, avisos:[].map.call(document.querySelectorAll('#sKpi > .st-aviso'),function(a){return a.textContent;}),
    pie:(document.querySelector('#sList .st-pie')||{}).textContent||'', titulo:(document.getElementById('sTitulo')||{}).textContent||'',
    dep:(document.getElementById('sKpiDep')||{}).textContent||'', xss:!!window.__xss, img:!!document.querySelector('#sList img'),
    gets:window.__gets.slice(), nAdmin:window.__nAdmin };
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
    if (!await esperar(cli, `window.D && Array.isArray(D.stock) && D.stock.length===${STOCK.length} && document.querySelectorAll('#sList .si').length===${STOCK.length}`, 30000)) {
      console.log('  la tabla no pinto (sin esto lo de abajo no mide nada)'); salir(1);
    }
    await pausa(600);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Stock > PRODUCTOS · ' + ANCHO + 'px · ' + APP + ' ==');

    /* ── a: el backend nuevo ── */
    await ir('a');
    let L = await evaluar(cli, LEER);
    chk('se examinaron las ' + STOCK.length + ' filas', Object.keys(L.filas).length === STOCK.length, Object.keys(L.filas));
    chk('el encabezado tiene la columna Ajuste entre Vendidos y Fisico', L.cab.join('|').indexOf('Vendidos|Ajuste|Físico') > -1, L.cab);
    const fila = n => (Object.keys(L.filas).find(k => k.indexOf(n) === 0) && L.filas[Object.keys(L.filas).find(k => k.indexOf(n) === 0)]) || { celdas: [], cls: '' };
    // celdas: Inicial, Comprado, Vendidos, Ajuste, Fisico, Reservado, Disponible
    chk('Pack Muzzarella cierra: el ajuste es un punto', fila('Pack Muzzarella').celdas[3] === '·', fila('Pack Muzzarella').celdas);
    chk('Pack Jamon y Queso: 10 + 7 − 15 = 2 y hay 0, ajuste −2', fila('Pack Jamon').celdas[3] === '−2', fila('Pack Jamon').celdas);
    chk('Empanadas Jamon y Queso: ajuste +1', fila('Empanadas Jamon').celdas[3] === '+1', fila('Empanadas Jamon').celdas);
    chk('la carne muestra lo comprado en kilos, con coma (25,025)', fila('Carne Lomo').celdas[1] === '25,025', fila('Carne Lomo').celdas);
    chk('y la cuenta de la carne cierra al gramo', fila('Carne Lomo').celdas[3] === '·', fila('Carne Lomo').celdas);
    chk('3,89 kg de lomo no se pinta como "3 o menos" (es una cuenta de unidades)', /\bok\b/.test(fila('Carne Lomo').cls), fila('Carne Lomo').cls);
    chk('3 u de sorrentinos si', /\blow\b/.test(fila('Sorrentinos Langostinos').cls), fila('Sorrentinos Langostinos').cls);
    chk('el pie explica la cuenta y cuantos productos tuvieron ajuste (2)', /Inicial \+ Comprado − Vendidos ± Ajuste = Físico/.test(L.pie) && /\(2 productos esta semana\)/.test(L.pie), L.pie);
    chk('y dice que en la carne lo comprado son las piezas recibidas', /piezas recibidas en la semana/.test(L.pie), L.pie);
    chk('el nombre de un producto no se ejecuta como HTML', !L.xss && !L.img);
    chk('y se lee como texto', Object.keys(L.filas).some(k => /onerror/.test(k)));
    chk('KPI "Sin disponible" = 4', L.k['Sin disponible'] && L.k['Sin disponible'].v === '4', L.k);
    chk('dice 3 sin nada en el freezer, 1 todo reservado y 1 con 3 u o menos', !!L.k['Sin disponible'] && /3 sin nada en el freezer · 1 todo reservado · 1 con 3 u o menos/.test(L.k['Sin disponible'].s), L.k['Sin disponible']);
    chk('KPI "Vendido esta semana": unidades y kilos separados', !!L.k['Vendido esta semana'] && /^50 u · 21,135 kg$/.test(L.k['Vendido esta semana'].v) && /entró 30 u · 25,025 kg · arrancó con 29 u/.test(L.k['Vendido esta semana'].s), L.k['Vendido esta semana']);
    chk('el titulo dice la semana y va de lunes a domingo', /^📦 Semana \d+ · lun \d+\/\d+ → dom \d+\/\d+$/.test(L.titulo.trim()), L.titulo);
    chk('"Donde esta" sale del volcado: Ustariz 7 u · 3,89 kg · Moresco 0 u', /Ustariz 7 u · 3,89 kg\s*Moresco 0 u/.test(L.dep), L.dep);
    chk('sin pedir action=depositos', L.gets.indexOf('depositos') < 0, L.gets);
    chk('avisa que el total de las Empanadas no da lo de los depositos, y lo nombra', /Empanadas Jamon y Queso x8: el total dice 1 y los depósitos suman 0/.test(L.dep) && /CONTAR/.test(L.dep), L.dep);
    chk('y no avisa por los que si cierran', !/Pack Jamon|Sorrentinos|Carne Lomo/.test(L.dep.split('⚠')[1] || ''), L.dep);
    chk('sin avisos de semana ni de cierre', L.avisos.length === 0, L.avisos);

    const geo = await evaluar(cli, `(function(){
      var b=document.querySelector('#sKpiDep .st-contar'); var cab=document.querySelector('#sList .st-cab .st-fija');
      return { btn:b?Math.round(b.getBoundingClientRect().height):0, bgCab:cab?getComputedStyle(cab).backgroundColor:'',
        desborde: document.documentElement.scrollWidth-document.documentElement.clientWidth,
        carril: (function(c){ return c? c.scrollWidth>c.clientWidth : null; })(document.querySelector('#sList .st-carril')) }; })()`);
    chk('el boton Contar de "Donde esta" se toca (' + geo.btn + 'px)', geo.btn >= (ANCHO <= 560 ? 38 : 26), geo);
    chk('el encabezado de la columna Producto no es una barra blanca', geo.bgCab && geo.bgCab !== 'rgb(255, 255, 255)', geo.bgCab);
    chk('la pagina no desborda a lo ancho', geo.desborde <= 0, geo.desborde);
    if (ANCHO <= 560) chk('en el celular la tabla se desliza en su carril', geo.carril === true, geo);

    /* Tocar una sub-tab de Ventas no le apaga el resaltado a Stock */
    await evaluar(cli, `go('ventas'); try{ vSwitchTab('tendencia'); }catch(e){} try{ vSwitchTab('ventas'); }catch(e){} go('stock'); 1`);
    await pausa(400);
    const on = await evaluar(cli, `(document.querySelector('#p-stock .v-tab[data-stt="productos"]')||{}).className||''`);
    chk('volver de Ventas deja PRODUCTOS resaltado en Stock', /\bon\b/.test(on), on);

    /* Contar en CONTAR y volver a PRODUCTOS */
    await evaluar(cli, `window.__gets=[]; stSwitchTab('contar'); 1`);
    const hayIn = await esperar(cli, `!!document.querySelector('#stcR_SL input.stc-in')`, 15000);
    chk('CONTAR pinta el campo de los sorrentinos', hayIn);
    if (hayIn) {
      const n0 = await evaluar(cli, `window.__nAdmin`);
      await evaluar(cli, `(function(){ var i=document.querySelector('#stcR_SL input.stc-in'); i.value='4'; /* el mismo manejador del onblur: en headless sin foco de ventana, blur() no dispara */ stContarBlur('SL', i); return 1; })()`);
      await esperar(cli, `window.__posts.some(function(p){return p.action==='stockContar'&&p.abbr==='SL';})`, 8000);
      await pausa(400);
      await evaluar(cli, `stSwitchTab('productos'); 1`);
      await pausa(600);
      L = await evaluar(cli, LEER);
      chk('al volver, dice que esta trayendo el stock nuevo', L.avisos.some(a => /trayendo el stock nuevo/.test(a)), L.avisos);
      chk('y lo pide UNA vez', L.nAdmin === n0 + 1, { antes: n0, ahora: L.nAdmin });
      await esperar(cli, `window.__nAdmin===${n0 + 1} && !document.querySelector('#sKpi .st-aviso')`, 15000);
      await pausa(300);
      L = await evaluar(cli, LEER);
      chk('cuando llega, el aviso se va', L.avisos.length === 0, L.avisos);
      chk('y la tabla muestra lo contado (4 sorrentinos)', fila('Sorrentinos Langostinos').celdas[4] === '4', fila('Sorrentinos Langostinos').celdas);
      await evaluar(cli, `rStock(); rStock(); 1`);
      await pausa(800);
      chk('repintar no vuelve a pedirlo', (await evaluar(cli, `window.__nAdmin`)) === n0 + 1);
    }

    /* ── b: el volcado de despues de contar falla ── */
    await ir('b');
    await evaluar(cli, `stSwitchTab('contar'); 1`);
    if (await esperar(cli, `!!document.querySelector('#stcR_SL input.stc-in')`, 15000)) {
      await evaluar(cli, `(function(){ var i=document.querySelector('#stcR_SL input.stc-in'); i.value='5'; /* el mismo manejador del onblur: en headless sin foco de ventana, blur() no dispara */ stContarBlur('SL', i); return 1; })()`);
      await esperar(cli, `window.__posts.some(function(p){return p.action==='stockContar';})`, 8000);
      await pausa(400);
      await evaluar(cli, `stSwitchTab('productos'); 1`);
      await esperar(cli, `window.__nAdmin>=2`, 8000);
      await pausa(3500);
      await evaluar(cli, `rStock(); rStock(); 1`);
      await pausa(1500);
      L = await evaluar(cli, LEER);
      chk('si falla, lo dice', L.avisos.some(a => /no se pudieron traer/.test(a)), L.avisos);
      chk('y no reintenta en bucle (2 volcados: el de arranque y uno)', L.nAdmin === 2, L.nAdmin);
    } else chk('fase b: CONTAR pinta', false);

    /* ── c: el cierre del lunes no corrio ── */
    if (!madrugadaDelLunes) {
      await ir('c');
      L = await evaluar(cli, LEER);
      chk('si el cierre del lunes no corrio, lo avisa', L.avisos.some(a => /cierre de semana del lunes no corrió/.test(a)), L.avisos);
    }

    /* ── d: la foto es de la semana pasada ── */
    await ir('d');
    L = await evaluar(cli, LEER);
    chk('si la foto es de la semana pasada, lo avisa', L.avisos.some(a => /semana pasada/.test(a)), L.avisos);

    /* ── e: backend viejo ── */
    await ir('e');
    await esperar(cli, `/Ustariz/.test((document.getElementById('sKpiDep')||{}).textContent||'')`, 15000);
    L = await evaluar(cli, LEER);
    chk('con un backend sin reparto en el volcado, pide action=depositos', L.gets.indexOf('depositos') > -1, L.gets);
    chk('y "Donde esta" se dibuja igual', /Ustariz 7 u · 3,89 kg\s*Moresco 0 u/.test(L.dep), L.dep);
    chk('y no inventa un aviso de descuadre con otra foto', !/el total dice/.test(L.dep), L.dep);

    const propios = errores.filter(e => /rStock|rStockReparto|_stAjuste|_stTienePd|stSwitchTab/.test(e));
    chk('ni un error propio de Stock en la consola', propios.length === 0, propios);
  } catch (e) {
    console.log('  EXCEPCION ' + (e && e.stack || e)); mal++;
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal  (' + ANCHO + 'px)');
  salir(mal ? 1 : 0);
})();
