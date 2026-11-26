/* Abastecimiento, la tanda del 9/10/2026 (/mejora). Backend STUBBEADO, datos inventados.

   BASE=http://localhost:8142 node probar_abast_tanda1.js [390|1440]
   APP=app_viejo_tmp.html ...      ← contra el codigo de antes tiene que dar rojo

   Sostiene:
   · Recibir lista los productos en el orden de la tarjeta (el del WhatsApp), no alfabetico;
   · el WhatsApp dice la semana que se mira y los kilos van con coma;
   · el tacho del WhatsApp vale para ese proveedor EN ESA SEMANA, y una marca vieja
     sin semana no esconde el boton;
   · despues de copiar, el paso que sigue lo dice ("Ya se lo mandé");
   · PAGOS: lo que se suma al recibir, el total con eso, la semana vieja lo dice y va
     arriba; sin las pastillas del total historico;
   · catalogo y faltantes no se vuelven a pedir en cada cambio de sub-tab o de semana,
     pero SI despues de mandar algo y con el ↻;
   · un resumen muestra los kilos con un decimal; el cartel de la carne sale una vez. */
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
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
};
const CUENTAS = [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', def: false }, { id: 'mp', nombre: 'Mercado Pago', tipo: 'digital', def: true }];
const oc = (id, r, prov, prod, abbr, q, est, sem, ent, ct) => ({ oc: id, r, prov, prod, abbr, q, est, canal: 'Depósito', cliente: 'Depósito Maleu', nped: '', semEnt: sem, vend: '', ent, ct });
const BUSQ = {
  ts: 1, total: 0, semActual: 37, anioActual: 2026, stocksProductos: {}, cuentas: CUENTAS,
  provs: [
    { n: 'Prov Uno', costo: 198000, fProg: '', cats: [
      { cat: 'Pack Pizzas', items: [{ v: 'Muzzarella', a: 'PPM', q: 10, qDep: 10, ct: 90000, sem: 37, anio: 2026 }, { v: 'Jamón y Queso', a: 'PPJyQ', q: 4, qDep: 4, ct: 36000, sem: 38, anio: 2026 }] },
      { cat: 'Empanadas', items: [{ v: 'Carne a Cuchillo', a: 'ECaC', q: 6, qDep: 6, ct: 72000, sem: 37, anio: 2026 }] }] },
    { n: 'Prov Dos', costo: 50000, fProg: '', cats: [
      { cat: 'Tartas', items: [{ v: 'Verdura', a: 'TV', q: 3, qDep: 3, ct: 30000, sem: 37, anio: 2026 }, { v: 'Calabaza', a: 'TCa', q: 2, qDep: 2, ct: 20000, sem: 38, anio: 2026 }] }] },
    { n: 'Caco', costo: 30000, fProg: '', cats: [
      { cat: 'Carnes', items: [{ v: 'Lomo', a: 'CLo', q: 1.5, qDep: 1.5, ct: 30000, sem: 38, anio: 2026 }] }] }
  ],
  ocs: [
    oc('OC-501', 101, 'Prov Uno', 'Pack Pizzas — Muzzarella', 'PPM', 10, 'Pedido', 37, false, 90000),
    oc('OC-502', 102, 'Prov Uno', 'Pack Pizzas — Jamón y Queso', 'PPJyQ', 4, 'Pedido', 38, false, 36000),
    oc('OC-503', 103, 'Prov Uno', 'Empanadas — Carne a Cuchillo', 'ECaC', 6, 'Pedido', 37, false, 72000),
    oc('OC-601', 201, 'Prov Dos', 'Tartas — Verdura', 'TV', 3, 'Pendiente', 37, false, 30000),
    oc('OC-602', 202, 'Prov Dos', 'Tartas — Calabaza', 'TCa', 2, 'Pendiente', 38, false, 20000),
    oc('OC-701', 301, 'Caco', 'Carnes — Lomo', 'CLo', 1.5, 'Pendiente', 38, false, 30000)
  ],
  clientes: [], enPoderVend: [],
  deudas: [
    { n: 'Prov Uno', total: 50000, original: 150000, pagado: 100000, pagosLibres: [{ fecha: 'Mar 28/04 16:12', ef: 100, mp: 0, bonif: 0, tot: 100, notas: '' }], saldoLibreSobrante: 0, semanas: [
      { sem: '35', original: 100000, pagado: 100000, pendiente: 0, pagadoFifo: 0, pagosImp: [], items: [] },
      { sem: '36', original: 50000, pagado: 0, pendiente: 50000, pagadoFifo: 0, pagosImp: [], items: [] }] },
    { n: 'Prov Viejo', total: 20000, original: 20000, pagado: 0, pagosLibres: [], saldoLibreSobrante: 0, semanas: [
      { sem: '34', original: 20000, pagado: 0, pendiente: 20000, pagadoFifo: 0, pagosImp: [], items: [] }] }
  ]
};
const CAT = {
  ts: 1, proveedores: ['Prov Uno', 'Caco', 'Prov Dos'],
  deps: [{ id: 'ustariz', nombre: 'Depósito Ustariz', dueno: 'Tadeo' }],
  productos: {
    'Prov Uno': [{ a: 'PPM', n: 'Pack Pizzas — Muzzarella', cat: 'Pack Pizzas', c: 9000, s: 0, u: 'u', dem: 10, wk: [9, 10, 11], dep: 'ustariz', pd: { ustariz: 0 } }],
    'Caco': [{ a: 'CLo', n: 'Carnes — Lomo', cat: 'Carnes', c: 28500, s: 15.776, u: 'kg', dem: 1, wk: [1, 1, 1], dep: 'ustariz', pd: { ustariz: 15.776 } },
             { a: 'CVa', n: 'Carnes — Vacío', cat: 'Carnes', c: 20000, s: 8.371, u: 'kg', dem: 1, wk: [1, 1, 1], dep: 'ustariz', pd: { ustariz: 8.371 } }],
    'Prov Dos': [{ a: 'TV', n: 'Tartas — Verdura', cat: 'Tartas', c: 10000, s: 4, u: 'u', dem: 0, wk: [0, 0, 0], dep: 'ustariz', pd: { ustariz: 4 } }]
  }
};
const EXTRA = `
  (function(){
    window.__gets=[]; window.__posts=[]; window.__clip=[];
    try{ localStorage.setItem('maleu_busqueda', JSON.stringify({ waCopied: { 'Prov Dos': 'dismissed' } }));
         localStorage.removeItem('maleu_faltantes');
         localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_busqueda_tab','proveedores'); localStorage.setItem('maleu_busqueda_sem','actual'); }catch(e){}
    try{ navigator.clipboard.writeText=function(t){ window.__clip.push(String(t)); return Promise.resolve(); }; }catch(e){}
    try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){ window.__clip.push(String(t)); return Promise.resolve(); }},configurable:true}); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(post){ var b={}; try{ b=JSON.parse(x.body); }catch(e){} window.__posts.push(b);
        return Promise.resolve(new Response(JSON.stringify({ok:true,updated:1,avisos:[]}),{status:200,headers:{'Content-Type':'application/json'}})); }
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo = a==='busqueda' ? ${JSON.stringify(BUSQ)} : a==='catalogo' ? ${JSON.stringify(CAT)}
        : a==='faltantes' ? {ok:true,faltan:[],pedidos:3,lineas:5,productos:10,ts:1}
        : a==='vendedores' ? {ts:1,vendedores:[]} : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true}
        : a==='cajaLight' ? {ts:1,caja:{},saldoBase:{},movimientos:[]} : {ok:false,error:'stub'};
      var txt=JSON.stringify(cuerpo);
      return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); }, 80); });
    };
  })();
`;
const N = a => `window.__gets.filter(function(x){return x===${JSON.stringify(a)}}).length`;
const TXT = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.innerText.replace(/\\s+/g,' '):'';})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: 1, mobile: CEL });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Abastecimiento, tanda 9/10 · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(4000);   // el panel termina de arrancar despues de que `go` existe: ir antes deja la tab en display:none
    await evaluar(cli, `go('busqueda'); 1`);
    if (!await esperar(cli, `document.querySelectorAll('#provList .prov-card').length>=2 && document.getElementById('p-busqueda').getBoundingClientRect().width>0`, 30000)) { console.log('  BUSQUEDA no pinto (sin esto no se mide nada)'); salir(1); }
    await pausa(600);

    console.log('\n-- BUSQUEDA --');
    const tarjetas = await evaluar(cli, `[].slice.call(document.querySelectorAll('#provList .prov-card')).map(function(c){return c.querySelector('.prov-name').innerText})`);
    chk('se ven las tarjetas de esta semana', tarjetas.length === 2, tarjetas);
    // 1 · orden de Recibir
    const nomRec = await evaluar(cli, `[].slice.call(document.querySelectorAll('#provList .prov-card')[0].querySelectorAll('.recibir-name')).map(function(e){return e.innerText.trim()})`);
    chk('Recibir va en el orden de la tarjeta (Pack Pizzas antes que Empanadas)', nomRec.length === 2 && /Pack Pizzas/.test(nomRec[0]) && /Empanadas/.test(nomRec[1]), nomRec);
    // 3 · una marca vieja sin semana no esconde el boton
    const waDos = await evaluar(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#provList .prov-card')).filter(function(c){return /Prov Dos/.test(c.innerText)})[0];return c?c.querySelectorAll('.btn-wa').length:-1})()`);
    chk('una marca vieja (sin semana) no esconde «Copiar para WhatsApp»', waDos === 1, waDos);
    const txtPed0 = await evaluar(cli, `(function(){var b=document.querySelector('#provList .btn-pedido');return b?b.innerText:''})()`);
    chk('antes de copiar el boton dice «Marcar como pedido»', /^Marcar como pedido$/i.test(txtPed0.trim()), txtPed0);
    // copiar a Prov Dos
    await evaluar(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#provList .prov-card')).filter(function(c){return /Prov Dos/.test(c.innerText)})[0];c.querySelector('.btn-wa').click();return 1})()`);
    await pausa(1700);
    const clip1 = await evaluar(cli, `window.__clip[window.__clip.length-1]||''`);
    chk('el WhatsApp de esta semana dice «esta semana»', /pedido de esta semana/.test(clip1) && /3 × Verdura/.test(clip1) && !/Calabaza/.test(clip1), clip1);
    const txtPed1 = await evaluar(cli, `(function(){var b=document.querySelector('#provList .btn-pedido');return b?b.innerText:''})()`);
    chk('despues de copiar, el paso que sigue lo dice', /Ya se lo mand/i.test(txtPed1), txtPed1);
    // tacho: solo esta semana
    await evaluar(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#provList .prov-card')).filter(function(c){return /Prov Dos/.test(c.innerText)})[0];var b=c.querySelectorAll('.btn-wa');b[b.length-1].click();return b.length})()`);
    await pausa(300);
    const waTras = await evaluar(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#provList .prov-card')).filter(function(c){return /Prov Dos/.test(c.innerText)})[0];return c.querySelectorAll('.btn-wa').length})()`);
    chk('el tacho saca el boton en la semana que se mira', waTras === 0, waTras);
    const f0 = await evaluar(cli, N('faltantes')); const b0 = await evaluar(cli, N('busqueda'));
    await evaluar(cli, `switchSemSel('prox'); 1`);
    await pausa(700);
    const waProx = await evaluar(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#provList .prov-card')).filter(function(c){return /Prov Dos/.test(c.innerText)})[0];return c?c.querySelectorAll('.btn-wa').length:-1})()`);
    chk('…y la semana que viene lo sigue teniendo', waProx === 1, waProx);
    await evaluar(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#provList .prov-card')).filter(function(c){return /Caco/.test(c.innerText)})[0];c.querySelector('.btn-wa').click();return 1})()`);
    await pausa(300);
    const clip2 = await evaluar(cli, `window.__clip[window.__clip.length-1]||''`);
    chk('el WhatsApp de la proxima dice «la semana que viene» y los kilos con coma', /la semana que viene/.test(clip2) && /1,5 kg × Lomo/.test(clip2), clip2);
    await pausa(1500);
    await evaluar(cli, `switchSemSel('actual'); 1`);
    await pausa(700);
    const f1 = await evaluar(cli, N('faltantes'));
    chk('cambiar de semana no vuelve a pedir «faltantes»', f1 === f0 && f0 >= 1, { antes: f0, despues: f1, busqueda: b0 });

    console.log('\n-- RESUMEN y + NUEVO --');
    await evaluar(cli, `abaSwitchTab('nuevo'); 1`); await pausa(500);
    const c0 = await evaluar(cli, N('catalogo'));
    await evaluar(cli, `abaSwitchTab('resumen'); 1`); await pausa(400);
    await evaluar(cli, `abaSwitchTab('nuevo'); 1`); await pausa(400);
    await evaluar(cli, `abaSwitchTab('resumen'); 1`); await pausa(500);
    const c1 = await evaluar(cli, N('catalogo'));
    chk('ir y volver entre RESUMEN y + NUEVO no vuelve a pedir el catalogo', c1 === c0 && c0 >= 1, { antes: c0, despues: c1 });
    const res = await evaluar(cli, TXT('#resumenView'));
    chk('RESUMEN muestra los kilos con un decimal', /15,8 kg/.test(res) && !/15,776/.test(res) && /8,4 kg/.test(res), res.slice(0, 700));
    chk('RESUMEN: el total de kilos tambien', /24,1 kg/.test(res), (res.match(/Stock hoy[^|]{0,80}/) || [''])[0]);
    await evaluar(cli, `abaSwitchTab('nuevo'); 1`); await pausa(300);
    await evaluar(cli, `(function(){var p=document.getElementById('npProv');p.value='Caco';p.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`);
    await pausa(500);
    const nvo = await evaluar(cli, TXT('#abaNuevoView'));
    const veces = (nvo.match(/no se compra desde acá/g) || []).length + (nvo.match(/Se le pide a/g) || []).length;
    chk('+ NUEVO con la carne: el cartel sale una sola vez (hay 2 cortes)', veces === 1, { veces, nvo: nvo.slice(0, 600) });
    chk('…y manda a Productos, que es como se llama la tab', /Productos → RECIBIR CARNE/.test(nvo) && !/Stock → RECIBIR CARNE/.test(nvo), nvo.slice(0, 300));
    // el ↻ fuerza
    await evaluar(cli, `abaRefresh(false); 1`); await pausa(900);
    const c2 = await evaluar(cli, N('catalogo')); const f2 = await evaluar(cli, N('faltantes'));
    chk('el ↻ si los vuelve a pedir', c2 === c1 + 1 && f2 === f1 + 1, { cat: [c1, c2], falt: [f1, f2] });

    console.log('\n-- PAGOS --');
    await evaluar(cli, `abaSwitchTab('pagos'); 1`); await pausa(500);
    const pg = await evaluar(cli, TXT('#pagosList'));
    chk('PAGOS dice lo que se suma al recibir ($192.000 = 90 + 72 + 30 mil de esta semana)', /Se suma al recibir: \$192\.000/.test(pg), pg.slice(0, 300));
    chk('…y el total con eso ($70.000 + $192.000)', /Deuda total \$70\.000/.test(pg) && /Con lo que falta recibir \$262\.000/.test(pg), pg.slice(-200));
    chk('la deuda mas vieja va arriba', pg.indexOf('Prov Viejo') >= 0 && pg.indexOf('Prov Viejo') < pg.indexOf('Prov Uno $50.000'), [pg.indexOf('Prov Viejo'), pg.indexOf('Prov Uno $50.000')]);
    chk('una semana de hace 3 lo dice; la de la semana pasada no', /Semana 34 hace 3 semanas/.test(pg) && !/Semana 36 hace/.test(pg), (pg.match(/Semana 3\d[^$]{0,30}/g) || []));
    chk('sin las pastillas del total historico arriba', !/Original \$150\.000/.test(pg) && /En total le compraste \$150\.000 y le pagaste \$100\.000/.test(pg), pg.slice(0, 400));
    const ordenUno = await evaluar(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#pagosList .deuda-card')).filter(function(c){return /Prov Uno/.test(c.innerText)})[0];var t=c.innerText;return [t.indexOf('Pagar semana 36'), t.indexOf('pago a cuenta sin semana')]})()`);
    chk('los pagos a cuenta viejos van despues de lo que se debe', ordenUno[0] >= 0 && ordenUno[1] > ordenUno[0], ordenUno);
    // el pago sigue yendo al proveedor correcto despues de ordenar
    const btnProv = await evaluar(cli, `[].slice.call(document.querySelectorAll('#pagosList .deuda-card')).map(function(c){var b=c.querySelector('[data-prov]');return [c.querySelector('.deuda-prov').innerText, b?b.getAttribute('data-prov'):null]})`);
    chk('cada boton de pago lleva el proveedor de SU tarjeta', btnProv.length === 2 && btnProv.every(x => x[0] === x[1]), btnProv);

    console.log('\n-- despues de mandar algo --');
    await evaluar(cli, `abaSwitchTab('proveedores'); 1`); await pausa(400);
    const f3 = await evaluar(cli, N('faltantes'));
    await evaluar(cli, `(function(){var b=document.querySelector('#provList .btn-pedido');if(b)b.click();return !!b})()`);
    await pausa(1500);
    const posts = await evaluar(cli, `window.__posts.map(function(p){return p.action})`);
    await evaluar(cli, `abaFaltCargar(); 1`); await pausa(500);
    const f4 = await evaluar(cli, N('faltantes'));
    chk('despues de un envio, «faltantes» se pide de nuevo', posts.indexOf('marcarOC') >= 0 && f4 > f3, { posts, f3, f4 });

    const errs = await evaluar(cli, `window.__err`);
    chk('sin errores en consola', errs.length === 0, errs);
  } catch (e) { mal++; console.log('  ERROR ' + e.stack); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
