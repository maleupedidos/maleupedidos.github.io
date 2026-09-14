/* Abastecimiento entera (13/9/2026, /auditoria): BUSQUEDA, ARMADO, PAGOS,
   RESUMEN y + NUEVO.

   node probar_abast_tab.js [390|1440]
   APP=app_viejo_tmp.html node probar_abast_tab.js 390     ← la direccion contraria
   BASE=https://app.maleu.com.ar node probar_abast_tab.js 390   ← contra lo publicado

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). Sin token.
   Sostiene:
   · RECIBIR con compras de dos semanas: la cantidad tipeada cae en SU producto y no
     se reciben las de la semana que viene; cada fila viaja con su N° de OC;
   · MARCAR COMO PEDIDO marca solo la semana que se mira, con el N° de cada OC;
   · la compra de un pedido que ya salio lo dice (la mercaderia llego y no esta en la deuda);
   · RESUMEN dice los kilos con coma y "kg", y no suma kilos con unidades;
   · + NUEVO: nombres y no abreviaturas; "Pedido" y el sugerido cuentan lo ya pedido
     para el deposito ('Depósito' con tilde); la reposicion no ofrece "sale del
     deposito"; la carne no se compra por aca; dos toques rapidos en + son dos;
   · un pago y una compra llevan clientOpId y el reintento manda EL MISMO; "150.000"
     tipeado es ciento cincuenta mil;
   · PAGOS: dice la cuenta (Brubank), dibuja el detalle recien al abrirlo, muestra
     al proveedor con plata a cuenta que sobra y avisa las compras sin recibir;
   · ARMADO: ni un link wa.me, el nombre de la tienda no se ejecuta, la bolsa del
     vendedor no hereda el tilde de otra semana, la banda dice lo NETO;
   · tirar para refrescar no tapa el ERP con el loader de pantalla completa;
   · con el servidor caido y nada guardado NO dice "no hay nada": dice que no pudo;
   · el ERP sabe cuando hay una compra a medio cargar (abaHayEditor);
   · minimo tactil en el celular. */
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
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
};

/* ── datos inventados ── */
const XSS = 'Cliente <img src=x onerror="window.__xss=1">';
const CUENTAS = [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', def: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', def: false }];
const oc = (id, r, prov, prod, abbr, q, est, canal, cli, nped, sem, ent, ct) => ({ oc: id, r, prov, prod, abbr, q, est, canal, cliente: cli, nped, semEnt: sem, vend: canal === 'Red' ? 'Vend Prueba' : '', ent, ct });
const BUSQ = {
  ts: 1, total: 248000, semActual: 37, anioActual: 2026, stocksProductos: { ECaC: 1 }, cuentas: CUENTAS,
  provs: [
    { n: 'Prov Uno', costo: 198000, fProg: '', cats: [
      { cat: 'Pack Pizzas', items: [{ v: 'Muzzarella', a: 'PPM', q: 10, qDep: 0, ct: 90000, sem: 37, anio: 2026 },
                                    { v: 'Jamón y Queso', a: 'PPJyQ', q: 4, qDep: 0, ct: 36000, sem: 38, anio: 2026 }] },
      { cat: 'Empanadas', items: [{ v: 'Carne a Cuchillo', a: 'ECaC', q: 6, qDep: 6, ct: 72000, sem: 37, anio: 2026 }] }] },
    { n: 'Prov Dos', costo: 50000, fProg: '', cats: [
      { cat: 'Tartas', items: [{ v: 'Verdura', a: 'TV', q: 3, qDep: 0, ct: 30000, sem: 37, anio: 2026 },
                               { v: 'Calabaza', a: 'TCa', q: 2, qDep: 0, ct: 20000, sem: 38, anio: 2026 }] }] }
  ],
  ocs: [
    oc('OC-501', 101, 'Prov Uno', 'Pack Pizzas — Muzzarella', 'PPM', 10, 'Pedido', 'Clubes', 'Club Prueba', '7', 37, true, 90000),
    oc('OC-502', 102, 'Prov Uno', 'Pack Pizzas — Jamón y Queso', 'PPJyQ', 4, 'Pedido', 'Home', 'Cliente Semana Que Viene', '900', 38, false, 36000),
    oc('OC-503', 103, 'Prov Uno', 'Empanadas — Carne a Cuchillo', 'ECaC', 6, 'Pedido', 'Depósito', 'Depósito Maleu', '', 37, false, 72000),
    oc('OC-601', 201, 'Prov Dos', 'Tartas — Verdura', 'TV', 3, 'Pendiente', 'Home', 'Cliente Tres', '901', 37, false, 30000),
    oc('OC-602', 202, 'Prov Dos', 'Tartas — Calabaza', 'TCa', 2, 'Pendiente', 'Home', 'Cliente Cuatro', '902', 38, false, 20000)
  ],
  clientes: [
    { n: XSS, canal: 'Home', dir: 'Golf · Lote 5', tel: '11 5555-1234', ped: '905', items: [{ prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 2, pv: 0, est: 'Pedido' }], semEnt: 37, anioEnt: 2026 },
    { n: 'Final Uno', canal: 'Red', dir: '', tel: '', ped: '50', items: [{ prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 2, pv: 0, est: 'Pedido' }], semEnt: 37, anioEnt: 2026, vendedor: 'Vend Prueba' },
    { n: 'Final Dos', canal: 'Red', dir: '', tel: '', ped: '51', items: [{ prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 1, pv: 0, est: 'Pedido' }], semEnt: 38, anioEnt: 2026, vendedor: 'Vend Prueba' },
    { n: 'Depósito Maleu', canal: 'Depósito', dir: 'Depósito Maleu', tel: '', ped: '', items: [{ prod: 'Empanadas — Carne a Cuchillo', abbr: 'ECaC', q: 6, pv: 0, est: 'Pedido' }], semEnt: 37, anioEnt: 2026 }
  ],
  enPoderVend: [{ n: '49', vend: 'Vend Prueba', cli: 'Final Cero', sem: 37, anio: 2026, monto: 8300, fact: 10000 }],
  deudas: [
    { n: 'Prov Uno', total: 50000, original: 150000, pagado: 100000, pagosLibres: [], saldoLibreSobrante: 0, semanas: [
      { sem: '36', original: 100000, pagado: 100000, pendiente: 0, pagadoFifo: 0,
        pagosImp: [{ fecha: 'Vie 04/09 10:00', ef: 0, mp: 100000, bonif: 0, tot: 100000, notas: '<b>nota</b>', cta: 'brubank' }],
        items: [{ r: 90, prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 10, costoU: 10000, costo: 100000, sem: '36', canal: 'Clubes', cliente: 'Club <img src=x onerror="window.__xss2=1">', nped: '6' }] },
      { sem: '37', original: 50000, pagado: 0, pendiente: 50000, pagadoFifo: 0, pagosImp: [],
        items: [{ r: 91, prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 5, costoU: 10000, costo: 50000, sem: '37', canal: 'Home', cliente: 'Otro', nped: '8' }] }] },
    { n: 'Prov Tres', total: 0, original: 0, pagado: 0, semanas: [], saldoLibreSobrante: 5000,
      pagosLibres: [{ fecha: 'Sáb 05/09 10:00', ef: 5000, mp: 0, bonif: 0, tot: 5000, notas: 'a cuenta' }] }
  ]
};
// Muchas semanas saldadas, para medir que no se dibujan de entrada
for (let w = 17; w < 36; w++) {
  BUSQ.deudas[0].semanas.unshift({ sem: String(w), original: 10000, pagado: 10000, pendiente: 0, pagadoFifo: 0, pagosImp: [],
    items: Array.from({ length: 12 }, (_, i) => ({ r: 1000 + w * 20 + i, prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 1, costoU: 833, costo: 833, sem: String(w), canal: 'Home', cliente: 'Cliente ' + i, nped: String(i) })) });
}
const BUSQ_VIEJO = JSON.parse(JSON.stringify(BUSQ));
BUSQ_VIEJO.enPoderVend = [{ n: '49', vend: 'Vend Prueba', cli: 'Final Cero', sem: 37, anio: 2026, monto: 10000 }];
const CAT = {
  ts: 1, proveedores: ['Prov Uno', 'Caco', 'Prov Dos'],
  deps: [{ id: 'ustariz', nombre: 'Depósito Ustariz', dueno: 'Tadeo' }, { id: 'moresco', nombre: 'Depósito Moresco', dueno: 'Lucas' }],
  productos: {
    'Prov Uno': [
      { a: 'PPM', n: 'Pack Pizzas — Muzzarella', cat: 'Pack Pizzas', c: 9000, s: 0, u: 'u', dem: 10, wk: [9, 10, 11], dep: 'ustariz', pd: { ustariz: 0, moresco: 0 } },
      { a: 'PPJyQ', n: 'Pack Pizzas — Jamón y Queso', cat: 'Pack Pizzas', c: 9000, s: 2, u: 'u', dem: 4, wk: [4, 4, 4], dep: 'ustariz', pd: { ustariz: 2, moresco: 0 } },
      { a: 'ECaC', n: 'Empanadas — Carne a Cuchillo', cat: 'Empanadas', c: 12000, s: 1, u: 'u', dem: 8, wk: [8, 8, 8], dep: 'ustariz', pd: { ustariz: 1, moresco: 0 } }],
    'Caco': [{ a: 'CLo', n: 'Carnes — Lomo', cat: 'Carnes', c: 28500, s: 3.89, u: 'kg', dem: 19, wk: [17.2, 15, 24.872], dep: 'moresco', pd: { ustariz: 3.89, moresco: 0 } }],
    'Prov Dos': [{ a: 'TV', n: 'Tartas — Verdura', cat: 'Tartas', c: 10000, s: 4, u: 'u', dem: 0, wk: [0, 0, 0], dep: 'ustariz', pd: { ustariz: 4, moresco: 0 } }]
  }
};
const VEND = { ts: 1, vendedores: [{ nombre: 'Vend Prueba', wa: '1144443333', alias: '', barrios: [] }] };

const EXTRA = `
  (function(){
    var fase=(location.search.match(/fase=([a-z])/)||[])[1]||'a';
    window.__fase=fase; window.__gets=[]; window.__posts=[]; window.__modoPost='ok'; window.__demora=120;
    try{ localStorage.removeItem('maleu_busqueda'); localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_busqueda_tab','proveedores'); localStorage.setItem('maleu_busqueda_sem','actual'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(post){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){ b={crudo:String(x.body)}; }
        window.__posts.push(b);
        if(window.__modoPost==='red') return Promise.reject(new TypeError('Failed to fetch'));
        var r={ok:true,updated:1,avisos:[],total:1,filas:1};
        return Promise.resolve(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}}));
      }
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
      if(fase==='b' && (a==='busqueda'||a==='catalogo')) return new Promise(function(res,rej){ setTimeout(function(){ rej(new TypeError('Failed to fetch')); },80); });
      var cuerpo = a==='busqueda' ? (fase==='c' ? ${JSON.stringify(BUSQ_VIEJO)} : ${JSON.stringify(BUSQ)})
        : a==='catalogo' ? ${JSON.stringify(CAT)} : a==='vendedores' ? ${JSON.stringify(VEND)}
        : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true} : a==='cajaLight' ? {ts:1,caja:{},saldoBase:{},movimientos:[]}
        : {ok:false,error:'stub'};
      var txt=JSON.stringify(cuerpo);
      return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); }, a==='busqueda' ? window.__demora : 80); });
    };
  })();
`;

const TXT = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent.replace(/\\s+/g,' '):'';})()`;
const VIS = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';})()`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async fase => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&fase=' + fase });
    if (!await esperar(cli, `typeof go==='function' && window.__fase===${JSON.stringify(fase)}`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('busqueda'); 1`);
    if (!await esperar(cli, `typeof abaSwitchTab==='function'`, 20000)) { console.log('  la tab no arranco'); salir(1); }
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: 1, mobile: CEL });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Abastecimiento · ' + ANCHO + 'px · ' + APP + ' ==');

    /* ═════════ FASE A ═════════ */
    await ir('a');
    if (!await esperar(cli, `!!document.querySelector('#provList .prov-card')`, 20000)) { console.log('  BUSQUEDA no pinto (sin esto no se mide nada)'); salir(1); }

    console.log('\n-- BUSQUEDA --');
    const card1 = await evaluar(cli, `(function(){ var c=[].filter.call(document.querySelectorAll('#provList .prov-card'),function(x){return /Prov Uno/.test(x.textContent)})[0]; if(!c)return null;
      var b=c.querySelector('.btn-recibir'); return { txt:c.textContent.replace(/\\s+/g,' '), idx: b ? Number((b.getAttribute('onclick')||'').replace(/\\D/g,'')) : -1 }; })()`);
    chk('Prov Uno: esta semana muestra Muzzarella y NO el Jamón y Queso de la semana que viene', !!card1 && /Muzzarella/.test(card1.txt) && !/Jamón y Queso/.test(card1.txt), card1 && card1.txt.slice(0, 300));
    chk('avisa que la compra es de un pedido que ya entregaste (y no esta en la deuda)', !!card1 && /ya entregaste/i.test(card1.txt) && /deuda/i.test(card1.txt), card1 && card1.txt.slice(0, 400));
    if (card1 && card1.idx >= 0) {
      await evaluar(cli, `toggleRecibir(${card1.idx}); 1`);
      const inputs = await evaluar(cli, `[].map.call(document.querySelectorAll('#recPanel_${card1.idx} .recibir-row'),function(r){ return {n:r.querySelector('.recibir-name').textContent, id:(r.querySelector('input')||{}).id}; })`);
      const muz = inputs.find(x => /Muzzarella/.test(x.n));
      chk('el panel de recibir lista solo lo de esta semana (2 productos)', inputs.length === 2 && !!muz, inputs);
      if (muz) {
        await evaluar(cli, `window.__posts=[]; document.getElementById(${JSON.stringify(muz.id)}).value='12'; confirmarRecibir(${card1.idx}); 1`);
        await esperar(cli, `window.__posts.some(function(p){return p.action==='recibirMercaderia'})`, 8000);
        const pr = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='recibirMercaderia'})[0]||null`);
        const gs = (pr && pr.groups) || [];
        const gMuz = gs.find(g => /Muzzarella/.test(g.prod));
        /* Un SOBRANTE a proposito: con un faltante se abre (bien) el cuadro de repartirlo y no sale ningun POST. */
        chk('los 12 tipeados caen en Muzzarella, no en otro producto', !!gMuz && gMuz.qtyRecibida === 12, gs.map(g => [g.prod, g.qtyRecibida]));
        chk('no se reciben las compras de la semana que viene', !gs.some(g => /Jamón y Queso/.test(g.prod)) && !gs.some(g => (g.rows || []).indexOf(102) >= 0), gs.map(g => g.rows));
        chk('cada fila viaja con su N° de OC', !!gMuz && Array.isArray(gMuz.ocs) && gMuz.ocs[0] === 'OC-501', gMuz);
        await esperar(cli, `!document.querySelector('#abaLoaderOverlay:not(.hidden)')`, 15000);
      }
    } else chk('Prov Uno tiene el boton Recibir', false, card1);

    const card2 = await evaluar(cli, `(function(){ var c=[].filter.call(document.querySelectorAll('#provList .prov-card'),function(x){return /Prov Dos/.test(x.textContent)})[0]; var b=c&&c.querySelector('.btn-pedido'); return b?b.getAttribute('onclick'):null; })()`);
    if (card2) {
      await evaluar(cli, `window.__posts=[]; ${card2.replace(/this\)$/, 'null)')}; 1`);
      await esperar(cli, `window.__posts.some(function(p){return p.action==='marcarOC'})`, 8000);
      const mo = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='marcarOC'})[0]||null`);
      chk('marcar como pedido manda SOLO la OC de esta semana', !!mo && mo.rows.length === 1 && mo.rows[0].r === 201, mo);
      chk('con su N° de OC', !!mo && mo.rows[0] && mo.rows[0].oc === 'OC-601', mo);
      await esperar(cli, `!document.querySelector('#abaLoaderOverlay:not(.hidden)')`, 15000);
    } else chk('Prov Dos tiene "Marcar como pedido"', false);

    /* Recibir y pasar enseguida a otra sub-tab: el repintado de 500 ms despues
       mostraba BUSQUEDA encima (14/9/2026). Proveedor inventado para no mover
       nada de lo que miden los chequeos de abajo. */
    await evaluar(cli, `abaSwitchTab('proveedores'); enviarGroups('Prov Zeta', 99, []); abaSwitchTab('resumen'); 1`);
    await pausa(900);
    const tapa = await evaluar(cli, `({prov:!document.getElementById('provView').classList.contains('hidden'), res:!document.getElementById('resumenView').classList.contains('hidden')})`);
    chk('recibir y cambiar de sub-tab no deja BUSQUEDA encima de la otra', !tapa.prov && tapa.res, tapa);
    await esperar(cli, `!document.querySelector('#abaLoaderOverlay:not(.hidden)')`, 15000);

    console.log('\n-- RESUMEN --');
    await evaluar(cli, `abaSwitchTab('resumen'); 1`);
    await esperar(cli, `!!document.querySelector('#resumenList .res-prov-card')`, 10000);
    const res = await evaluar(cli, TXT('#resumenList'));
    chk('la carne dice los kilos con coma y "kg" (3,89 kg)', /3,89 kg/.test(res) && !/3\.89/.test(res), res.slice(0, 500));
    chk('el renglon de arriba no suma kilos con unidades: "Stock hoy: 7 u."', /Stock hoy: 7 u\./.test(res), (res.match(/Stock hoy[^·]*·[^·]*/) || [''])[0]);
    chk('"Voy a tener" cuenta lo pedido para el depósito (13 u.)', /Voy a tener: 13 u\./.test(res), (res.match(/Voy a tener[^A-Z]*/) || [''])[0]);

    console.log('\n-- + NUEVO --');
    await evaluar(cli, `abaSwitchTab('nuevo'); 1`);
    await esperar(cli, `!!document.querySelector('#npStockOverview .stock-table')`, 10000);
    const ov = await evaluar(cli, `[].map.call(document.querySelectorAll('#npStockOverview .stock-table tbody tr'),function(tr){ return [].map.call(tr.children,function(td){return td.textContent.trim();}); })`);
    const filaEcac = ov.find(r => /Carne a Cuchillo/.test(r[0]));
    chk('la tabla dice el nombre del producto, no la abreviatura', ov.some(r => r[0] === 'Muzzarella') && !ov.some(r => r[0] === 'PPM'), ov.slice(0, 6));
    chk('"Pedido" cuenta lo pedido para el depósito (canal con tilde): +6', !!filaEcac && filaEcac[2] === '+6', filaEcac);
    chk('y el sugerido lo descuenta: pedir 5, no 11 (8 x 1,5 - 1 en stock - 6 en camino)', !!filaEcac && filaEcac[4] === '5', filaEcac);
    await evaluar(cli, `var s=document.getElementById('npProv'); s.value='Prov Uno'; s.dispatchEvent(new Event('change')); 1`);
    await esperar(cli, `!!document.getElementById('npq_PPM')`, 5000);
    chk('una compra para el depósito no ofrece "sale del depósito"', await evaluar(cli, `document.querySelectorAll('#npProductsList .np-origen-toggle').length===0`));
    // dos toques rapidos en +
    const plus = await evaluar(cli, `(function(){ var b=[].filter.call(document.querySelectorAll('#npProductsList .np-qty-btn'),function(x){ var oc=x.getAttribute('onclick')||''; return oc.indexOf('PPM')>=0 && oc.slice(-3)===',1)'; })[0];
      if(!b)return null; b.scrollIntoView({block:'center'}); var r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,h:r.height}; })()`);
    if (plus) {
      for (let i = 0; i < 2; i++) {
        await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: plus.x, y: plus.y }] });
        await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await pausa(180);
      }
      await pausa(500);
      const v = await evaluar(cli, `document.getElementById('npq_PPM').value`);
      chk('dos toques rapidos en + suman dos', v === '2', v);
      if (CEL) chk('el + mide 44 px en el celular', plus.h >= 44, plus.h);
    } else chk('encuentro el + de Muzzarella', false);
    chk('el ERP sabe que hay una compra a medio cargar', await evaluar(cli, `typeof abaHayEditor==='function' && abaHayEditor()===true`));
    await evaluar(cli, `var s=document.getElementById('npProv'); s.value='Caco'; s.dispatchEvent(new Event('change')); 1`);
    await pausa(300);
    const carne = await evaluar(cli, `({nota:!!document.querySelector('#npProductsList .np-carne-nota'), input:!!document.getElementById('npq_CLo'), btnOculto:document.getElementById('npConfirm').classList.contains('hide'), txt:document.getElementById('npProductsList').textContent.replace(/\\s+/g,' ')})`);
    chk('la carne no se compra por acá: sin cantidad y lo dice', carne.nota && !carne.input, carne);
    chk('y no hay botón de confirmar para un proveedor de carne', carne.btnOculto, carne);
    chk('la carne dice sus kilos con coma', !/3\.89/.test(carne.txt) && /kg/.test(carne.txt), carne.txt.slice(0, 300));
    // compra que se corta: reintento con EL MISMO id
    await evaluar(cli, `var s=document.getElementById('npProv'); s.value='Prov Uno'; s.dispatchEvent(new Event('change')); 1`);
    await esperar(cli, `!!document.getElementById('npq_PPM')`, 5000);
    await evaluar(cli, `npChangeQty('PPM',1); npChangeQty('PPM',1); npChangeQty('PPM',1); window.__posts=[]; window.__modoPost='red'; document.getElementById('npConfirm').click(); 1`);
    await esperar(cli, `window.__posts.filter(function(p){return p.action==='compraManual'}).length>=2`, 12000);
    const cms = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='compraManual'})`);
    chk('la compra lleva clientOpId', cms.length > 0 && /^cm_/.test(String(cms[0].clientOpId || '')), cms[0]);
    chk('y el reintento manda EL MISMO (el servidor no la carga dos veces)', cms.length >= 2 && cms.every(c => c.clientOpId === cms[0].clientOpId), cms.map(c => c.clientOpId));
    chk('lo cargado se borra al mandarla (un segundo toque no arma otra compra)', await evaluar(cli, `typeof abaHayEditor==='function' && abaHayEditor()===false`));
    await evaluar(cli, `window.__modoPost='ok'; 1`);
    await esperar(cli, `!document.querySelector('#abaLoaderOverlay:not(.hidden)')`, 40000);
    await evaluar(cli, `var v=document.getElementById('npVendedor'); v.value='Vend Prueba'; v.dispatchEvent(new Event('change')); 1`);
    await pausa(300);
    const tog = await evaluar(cli, `(function(){ var t=document.querySelectorAll('#npProductsList .np-origen-toggle'); var b=document.querySelector('#npProductsList .np-origen-opt'); return {n:t.length, h:b?Math.round(b.getBoundingClientRect().height):0}; })()`);
    chk('para un vendedor sí se elige de dónde sale', tog.n === 3, tog);
    if (CEL) chk('y el selector mide 38 px o más', tog.h >= 38, tog.h);
    await evaluar(cli, `var v=document.getElementById('npVendedor'); v.value='Tadeo — Stock'; v.dispatchEvent(new Event('change')); var s=document.getElementById('npProv'); s.value=''; s.dispatchEvent(new Event('change')); 1`);

    console.log('\n-- PAGOS --');
    await evaluar(cli, `abaSwitchTab('pagos'); 1`);
    await esperar(cli, `!!document.querySelector('#pagosList .deuda-card')`, 10000);
    const p0 = await evaluar(cli, `({nodos:document.getElementById('pagosList').querySelectorAll('*').length, txt:document.getElementById('pagosList').textContent.replace(/\\s+/g,' ')})`);
    chk('las semanas saldadas y los detalles no se dibujan de entrada (< 400 nodos)', p0.nodos < 400, p0.nodos);
    chk('avisa las compras de pedidos entregados que no están en la deuda ($90.000)', /90\.000/.test(p0.txt) && /no están en esta deuda/i.test(p0.txt), p0.txt.slice(0, 300));
    chk('aparece el proveedor que no debe pero tiene plata a cuenta que sobra', /Prov Tres/.test(p0.txt) && /sobran \$5\.000/.test(p0.txt), p0.txt.slice(-400));
    await evaluar(cli, `(function(){ var d=document.querySelector('#pagosList .sems-saldadas-acc'); if(d) d.open=true; return 1; })()`);
    await esperar(cli, `!!document.querySelector('#pagosList .sems-saldadas-acc .sem-card')`, 5000);
    await evaluar(cli, `[].forEach.call(document.querySelectorAll('#pagosList .sems-saldadas-acc .sem-items-acc'),function(d){ d.open=true; }); 1`);
    await pausa(500);
    const p1 = await evaluar(cli, `({txt:document.getElementById('pagosList').textContent.replace(/\\s+/g,' '), xss:!!window.__xss2, img:!!document.querySelector('#pagosList img')})`);
    chk('al abrir, se dibujan las semanas saldadas y su detalle', /Semana 36/.test(p1.txt) && /Desglose por pedido cliente/.test(p1.txt), p1.txt.slice(0, 200));
    chk('un pago dice de qué cuenta salió (Brubank Lucas, no "MP")', /Brubank Lucas/.test(p1.txt) && !/· MP/.test(p1.txt), (p1.txt.match(/Vie 04\/09[^$]*/) || [''])[0]);
    chk('lo que viene de la planilla no se ejecuta como HTML', !p1.xss && !p1.img, p1);
    // pago que se corta: "150.000" y el mismo id
    const btnSem = await evaluar(cli, `(function(){ var b=[].filter.call(document.querySelectorAll('#pagosList .btn-pago-sem'),function(x){return /Pagar semana 37/.test(x.textContent)})[0]; return b?b.getAttribute('onclick'):null; })()`);
    if (btnSem) {
      const key = (btnSem.match(/'([^']+)'/) || [])[1];
      await evaluar(cli, `${btnSem}; var e=document.getElementById('pagoEf_${key}'); e.value='50.000'; e.dispatchEvent(new Event('input')); 1`);
      const lab = await evaluar(cli, `document.getElementById('pagoTotalLabel_${key}').textContent`);
      chk('"50.000" tipeado es cincuenta mil', /\$50\.000/.test(lab), lab);
      if (CEL) chk('los botones de forma de pago miden 38 px o más', await evaluar(cli, `[].every.call(document.querySelectorAll('#pagoForm_${key} .pago-fp-pill'),function(b){return b.getBoundingClientRect().height>=38})`));
      await evaluar(cli, `window.__posts=[]; window.__modoPost='red'; document.getElementById('btnPagar_${key}').click(); 1`);
      await esperar(cli, `window.__posts.filter(function(p){return p.action==='pagarProveedor'}).length>=2`, 12000);
      const pps = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='pagarProveedor'})`);
      chk('el pago manda 50000 y lleva clientOpId', pps.length > 0 && pps[0].efectivo === 50000 && /^pp_/.test(String(pps[0].clientOpId || '')), pps[0]);
      chk('y el reintento manda EL MISMO id', pps.length >= 2 && pps.every(x => x.clientOpId === pps[0].clientOpId), pps.map(x => x.clientOpId));
      await evaluar(cli, `window.__modoPost='ok'; 1`);
      await esperar(cli, `!document.querySelector('#abaLoaderOverlay:not(.hidden)')`, 40000);
    } else chk('encuentro "Pagar semana 37"', false);
    if (CEL) {
      const sum = await evaluar(cli, `[].map.call(document.querySelectorAll('#pagosList summary'),function(s){return Math.round(s.getBoundingClientRect().height)}).filter(function(h){return h>0})`);
      chk('los desplegables de PAGOS miden 38 px o más en el celular', sum.length > 0 && sum.every(h => h >= 38), sum);
    }

    console.log('\n-- ARMADO --');
    await evaluar(cli, `abaSwitchTab('pedidos'); pedNav('root'); 1`);
    await esperar(cli, `!!document.querySelector('#pedidosList .nav-card')`, 8000);
    const arm0 = await evaluar(cli, TXT('#pedidosList'));
    chk('la banda del vendedor dice lo neto: $8.300 a rendir', /8\.300 a rendir/.test(arm0), (arm0.match(/Ya lo tiene[^.]*\.[^.]*/) || [''])[0]);
    await evaluar(cli, `pedNav('zone:Estancias del Pilar'); 1`);
    await pausa(200);
    const arm1 = await evaluar(cli, `({txt:document.getElementById('pedidosList').textContent.replace(/\\s+/g,' '), wa:document.querySelectorAll('#pg-abast a[href*="wa.me"]').length, copiar:document.querySelectorAll('#pedidosList .aba-copiar').length, xss:!!window.__xss, img:!!document.querySelector('#pedidosList img')})`);
    chk('ni un link wa.me en la tarjeta del cliente', arm1.wa === 0, arm1.wa);
    chk('el teléfono y el aviso se copian', arm1.copiar === 2, arm1.copiar);
    chk('el nombre que viene de la tienda no se ejecuta y se lee como texto', !arm1.xss && !arm1.img && /onerror/.test(arm1.txt), { xss: arm1.xss, img: arm1.img });
    await evaluar(cli, `pedNav('redv:Vend Prueba'); 1`);
    await pausa(200);
    chk('ni un link wa.me en la bolsa del vendedor', await evaluar(cli, `document.querySelectorAll('#pg-abast a[href*="wa.me"]').length===0 && document.querySelectorAll('#pedidosList .aba-copiar').length===2`));
    await evaluar(cli, `toggleArmadoRedConsolidado('Vend Prueba'); pedNav('zone:Red'); 1`);
    await pausa(200);
    const act = await evaluar(cli, TXT('#pedidosList'));
    chk('esta semana la bolsa queda armada', /Armado ✓/.test(act) || /1\/1/.test(act), act.slice(0, 200));
    await evaluar(cli, `switchSemSel('prox'); pedNav('zone:Red'); 1`);
    await pausa(200);
    const prox = await evaluar(cli, TXT('#pedidosList'));
    chk('la bolsa del mismo vendedor la semana que viene NO hereda el tilde', /0\/1/.test(prox) && !/Armado ✓/.test(prox), prox.slice(0, 200));
    await evaluar(cli, `switchSemSel('actual'); pedNav('root'); 1`);

    console.log('\n-- tirar para refrescar --');
    await evaluar(cli, `abaSwitchTab('proveedores'); window.scrollTo(0,0); window.__demora=3000; window.__gets=[]; 1`);
    await pausa(300);
    const tp = (type, y) => cli.enviar('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: ANCHO / 2, y }] });
    await tp('touchStart', 230);
    for (let y = 240; y <= 470; y += 15) { await tp('touchMove', y); await pausa(16); }
    await tp('touchEnd', 470);
    await pausa(900);
    const ptr = await evaluar(cli, `({gets:window.__gets.slice(), tapa:(function(){var e=document.getElementById('abaLoadingView');return !!e && !e.classList.contains('hidden');})()})`);
    chk('tirar para abajo actualiza', ptr.gets.indexOf('busqueda') >= 0, ptr.gets);
    chk('y no tapa el ERP con el loader de pantalla completa', !ptr.tapa, ptr);
    await evaluar(cli, `window.__demora=120; 1`);
    await pausa(3500);

    const desb = await evaluar(cli, `document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    chk('nada desborda a lo ancho', desb <= 0, desb);

    /* ═════════ FASE B: el servidor no contesta y no hay nada guardado ═════════ */
    console.log('\n-- servidor caído, nada guardado --');
    await ir('b');
    await pausa(1500);
    for (const sub of ['proveedores', 'pedidos', 'pagos']) {
      await evaluar(cli, `abaSwitchTab('${sub}'); 1`);
      await pausa(300);
      const st = await evaluar(cli, `({err:(function(){var e=document.getElementById('abaErrorView');return !!e && !e.classList.contains('hidden');})(),
        txt:document.getElementById('pg-abast').textContent.replace(/\\s+/g,' '),
        vacio:(function(){var e=document.getElementById('abaEmptyView');return !!e && !e.classList.contains('hidden');})(),
        tapa:(function(){var e=document.getElementById('abaLoadingView');return !!e && !e.classList.contains('hidden');})()})`);
      chk(sub + ': dice que no pudo traer los datos', st.err && /No pude traer/.test(st.txt), st.txt.slice(0, 200));
      chk(sub + ': y NO afirma que no hay nada', !st.vacio && !/Al día con todos/.test(st.txt) && !/Sin pedidos para armar/.test(st.txt), { vacio: st.vacio });
      chk(sub + ': sin loader de pantalla completa', !st.tapa);
    }
    await evaluar(cli, `abaSwitchTab('resumen'); 1`);
    await esperar(cli, `/No pude traer el catálogo/.test(document.getElementById('resumenList').textContent)`, 8000);
    chk('RESUMEN: dice que no pudo traer el catálogo y ofrece Reintentar', await evaluar(cli, `/No pude traer el catálogo/.test(document.getElementById('resumenList').textContent) && !!document.querySelector('#resumenList .aba-reintentar')`));

    /* ═════════ FASE C: un backend anterior ═════════ */
    console.log('\n-- backend anterior --');
    await ir('c');
    await evaluar(cli, `abaSwitchTab('pedidos'); pedNav('root'); 1`);
    await esperar(cli, `/Ya lo tiene el vendedor/.test(document.getElementById('pedidosList').textContent)`, 10000);
    const c0 = await evaluar(cli, TXT('#pedidosList'));
    chk('sin el dato nuevo no dice "a rendir" sobre el facturado', /10\.000/.test(c0) && !/a rendir/.test(c0), (c0.match(/Ya lo tiene[^.]*/) || [''])[0]);

    const errs = errores.filter(e => !/stub/.test(e));
    chk('sin excepciones', errs.length === 0, errs.slice(0, 3));
  } catch (e) {
    console.log('  la prueba revento: ' + (e && e.stack || e));
    mal++;
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  salir(mal ? 1 : 0);
})();
