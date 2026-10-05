/* Abastecimiento: la cola de reintentos, el pago y Recibir con la lista cambiada
   por atrás, y una OC cancelada que escondía Recibir (4/10/2026, /auditoria).

   node probar_abast_cola.js [390|1440]
   BASE=http://localhost:8095 node probar_abast_cola.js 390

   Backend STUBBEADO con datos inventados (el repo es público). Sin token.
   Sostiene:
   · la cola manda UN POST por vez y no pierde ninguno: dos "Marcar como pedido"
     seguidos llegan los dos, una vez cada uno (antes la segunda llamada reenviaba
     el primero y la segunda respuesta borraba el segundo sin mandarlo);
   · un pago va al proveedor del formulario aunque su posición en la lista haya
     cambiado (un proveedor saldado sale de la lista y los de atrás se corren);
   · Recibir no confirma si la lista que se dibujó ya no es la de ahora;
   · una OC Cancelada en la semana no esconde el botón Recibir. */
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

const oc = (id, r, prov, prod, abbr, q, est, canal, cli, sem, ct) => ({ oc: id, r, prov, prod, abbr, q, est, canal, cliente: cli, nped: '', semEnt: sem, vend: '', ent: false, ct });
const semana = (sem, pend) => ({ sem: String(sem), original: pend, pagado: 0, pendiente: pend, pagadoFifo: 0, pagosImp: [],
  items: [{ r: 900 + sem, prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 1, costoU: pend, costo: pend, sem: String(sem), canal: 'Home', cliente: 'Otro', nped: '8' }] });
const deuda = (n, pend) => ({ n, total: pend, original: pend, pagado: 0, pagosLibres: [], saldoLibreSobrante: 0, semanas: [semana(37, pend)] });
const BUSQ = {
  ts: 1, total: 1, semActual: 37, anioActual: 2026, stocksProductos: {}, cuentas: [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' }],
  provs: [
    { n: 'Prov Uno', costo: 90000, fProg: '', cats: [{ cat: 'Pack Pizzas', items: [{ v: 'Muzzarella', a: 'PPM', q: 10, qDep: 0, ct: 90000, sem: 37, anio: 2026 }] }] },
    { n: 'Prov Dos', costo: 30000, fProg: '', cats: [{ cat: 'Tartas', items: [{ v: 'Verdura', a: 'TV', q: 3, qDep: 0, ct: 30000, sem: 37, anio: 2026 }] }] },
    { n: 'Prov Cuatro', costo: 20000, fProg: '', cats: [{ cat: 'Tortas', items: [{ v: 'Coco', a: 'TCo', q: 2, qDep: 0, ct: 20000, sem: 37, anio: 2026 }] }] }
  ],
  ocs: [
    oc('OC-501', 101, 'Prov Uno', 'Pack Pizzas — Muzzarella', 'PPM', 10, 'Pedido', 'Clubes', 'Club Prueba', 37, 90000),
    oc('OC-502', 102, 'Prov Uno', 'Pack Pizzas — Muzzarella', 'PPM', 0, 'Cancelado', 'Home', 'Cliente Cancelado', 37, 0),
    oc('OC-601', 201, 'Prov Dos', 'Tartas — Verdura', 'TV', 3, 'Pendiente', 'Home', 'Cliente Tres', 37, 30000),
    oc('OC-701', 301, 'Prov Cuatro', 'Tortas — Coco', 'TCo', 2, 'Pendiente', 'Home', 'Cliente Cuatro', 37, 20000)
  ],
  clientes: [], enPoderVend: [],
  deudas: [deuda('Prov A', 10000), deuda('Prov B', 20000), deuda('Prov C', 30000)]
};

const EXTRA = `
  (function(){
    window.__fase='a'; window.__posts=[]; window.__demoraPost=80;
    try{ localStorage.removeItem('maleu_busqueda'); localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_busqueda_tab','proveedores'); localStorage.setItem('maleu_busqueda_sem','actual'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        var txt=JSON.stringify({ok:true,updated:1,avisos:[]});
        return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); }, window.__demoraPost); });
      }
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      var cuerpo = a==='busqueda' ? ${JSON.stringify(BUSQ)} : a==='catalogo' ? {ts:1,proveedores:['Prov Uno'],deps:[{id:'ustariz',nombre:'Depósito Ustariz',dueno:'Tadeo'},{id:'moresco',nombre:'Depósito Moresco',dueno:'Lucas'}],productos:{'Prov Uno':[{a:'PMa',n:'Pizzas Individuales — Margarita',cat:'Pizzas Individuales',c:5000,s:9,u:'u',dem:6,wk:[6,6,6],dep:'ustariz',pd:{ustariz:0,moresco:9}}]}} : a==='vendedores' ? {ts:1,vendedores:[]}
        : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true} : {ok:false,error:'stub'};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(res){ setTimeout(function(){ res(new Response(t,{status:200,headers:{'Content-Type':'application/json'}})); }, 80); });
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: 1, mobile: CEL });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Abastecimiento · cola, pago y recibir · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && window.__fase==='a'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('busqueda'); 1`);
    if (!await esperar(cli, `!!document.querySelector('#provList .prov-card')`, 25000)) { console.log('  BUSQUEDA no pinto'); salir(1); }
    await pausa(800);
    const card = (n) => `[].filter.call(document.querySelectorAll('#provList .prov-card'),function(x){return x.querySelector('.prov-name').textContent===${JSON.stringify(n)}})[0]`;

    console.log('\n-- una OC cancelada no esconde Recibir --');
    const uno = await evaluar(cli, `(function(){ var c=${card('Prov Uno')}; if(!c) return null; var b=c.querySelector('.btn-recibir'); return { recibir: !!b, idx: b ? Number((b.getAttribute('onclick')||'').replace(/\\D/g,'')) : -1, pedido: !!c.querySelector('.btn-pedido') }; })()`);
    chk('Prov Uno (una OC Pedido + una Cancelada) muestra "Recibir mercadería"', !!uno && uno.recibir === true, uno);
    chk('y no vuelve a ofrecer "Marcar como pedido"', !!uno && uno.pedido === false, uno);

    console.log('\n-- la cola: dos "Marcar como pedido" seguidos --');
    const on = (n) => evaluar(cli, `(function(){ var c=${card(n)}; var b=c&&c.querySelector('.btn-pedido'); return b?b.getAttribute('onclick'):null; })()`);
    const oDos = await on('Prov Dos'), oCua = await on('Prov Cuatro');
    if (oDos && oCua) {
      await evaluar(cli, `window.__posts=[]; window.__demoraPost=1500; ${oDos.replace(/this\)$/, 'null)')}; ${oCua.replace(/this\)$/, 'null)')}; 1`);
      await esperar(cli, `window.__posts.filter(function(p){return p.action==='marcarOC'}).length>=2`, 9000);
      await pausa(4500);
      const mo = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='marcarOC'}).map(function(p){return (p.rows||[]).map(function(r){return r.oc}).join('+')})`);
      chk('llegan los dos al servidor', mo.indexOf('OC-601') >= 0 && mo.indexOf('OC-701') >= 0, mo);
      chk('y cada uno UNA vez (no se reenvía el primero)', mo.length === 2, mo);
      await evaluar(cli, `window.__demoraPost=80; 1`);
      await esperar(cli, `!document.querySelector('#abaLoaderOverlay:not(.hidden)')`, 15000);
    } else chk('Prov Dos y Prov Cuatro tienen "Marcar como pedido"', false, { oDos, oCua });

    console.log('\n-- Recibir con la lista cambiada por atrás --');
    if (uno && uno.idx >= 0) {
      const otroIdx = uno.idx === 0 ? 1 : 0;
      await evaluar(cli, `toggleRecibir(${uno.idx}); window.__posts=[]; 1`);
      /* El botón de Prov Uno, pero apuntando a OTRA posición: es lo que pasa cuando la
         lista se reemplaza sin repintar y el orden ya no es el mismo. */
      await evaluar(cli, `(function(){ var b=document.querySelector('#recPanel_${uno.idx} .btn-confirmar-recibir'); confirmarRecibir(${otroIdx}, b); })(); 1`);
      await pausa(1500);
      const p1 = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='recibirMercaderia'}).length`);
      chk('con la posición vieja NO recibe nada (ni a otro proveedor)', p1 === 0, p1);
      await evaluar(cli, `toggleRecibir(${uno.idx}); window.__posts=[]; (function(){ var b=document.querySelector('#recPanel_${uno.idx} .btn-confirmar-recibir'); confirmarRecibir(${uno.idx}, b); })(); 1`);
      await esperar(cli, `window.__posts.some(function(p){return p.action==='recibirMercaderia'})`, 8000);
      const p2 = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='recibirMercaderia'})[0]||null`);
      chk('con la lista de verdad recibe Prov Uno, sin la OC cancelada', !!p2 && p2.groups.length === 1 && JSON.stringify(p2.groups[0].ocs) === '["OC-501"]', p2 && p2.groups);
      await esperar(cli, `!document.querySelector('#abaLoaderOverlay:not(.hidden)')`, 15000);
    }

    console.log('\n-- un pago con la lista corrida --');
    await evaluar(cli, `abaSwitchTab('pagos'); 1`);
    await esperar(cli, `!!document.querySelector('.btn-pagar[data-prov]') || document.querySelectorAll('.btn-pagar').length>0`, 8000);
    const b = await evaluar(cli, `(function(){ var bs=[].slice.call(document.querySelectorAll('.btn-pagar')); var b=bs.filter(function(x){return x.getAttribute('data-prov')==='Prov B'})[0];
      if(!b){ b=bs.filter(function(x){return /,1,/.test(x.getAttribute('onclick')||'')})[0]; }
      return b ? { id: b.id, on: b.getAttribute('onclick') } : null; })()`);
    if (b) {
      const key = b.id.replace(/^btnPagar_/, '');
      /* Prov B estaba en la posición 1. Prov A se saldó y salió de la lista: la
         posición 1 ahora es Prov C. Se simula con el onclick apuntando a 2 (Prov C)
         sobre el formulario de Prov B. */
      const llamada = b.on.replace(/,\s*1\s*,/, ',2,');
      await evaluar(cli, `(function(){ window.__posts=[]; var e=document.getElementById('pagoEf_${key}'); e.value='5000'; e.dispatchEvent(new Event('input',{bubbles:true}));
        var bt=document.getElementById('btnPagar_${key}'); bt.disabled=false; ${llamada}; })(); 1`);
      await esperar(cli, `window.__posts.some(function(p){return p.action==='pagarProveedor'})`, 8000);
      const pg = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='pagarProveedor'})[0]||null`);
      chk('el pago tipeado en el formulario de Prov B va a Prov B', !!pg && pg.proveedor === 'Prov B', pg && { prov: pg.proveedor, total: pg.total });
    } else chk('PAGOS dibuja el formulario de Prov B', false);

    console.log('\n-- + NUEVO: "Tendría" cuenta lo de este depósito --');
    await evaluar(cli, `abaSwitchTab('nuevo'); 1`);
    await pausa(1500);
    await evaluar(cli, `(function(){ var s=document.getElementById('npProv'); s.value='Prov Uno'; s.dispatchEvent(new Event('change',{bubbles:true})); })(); 1`);
    await esperar(cli, `!!document.getElementById('npf_PMa')`, 6000);
    await evaluar(cli, `npChangeQty('PMa',1); npChangeQty('PMa',1); npChangeQty('PMa',1); 1`);
    await pausa(300);
    const tend = await evaluar(cli, `(document.getElementById('npf_PMa')||{}).textContent||''`);
    chk('con 0 a mano, 9 en el otro freezer y 3 cargadas dice Tendría 3 (+9*), no 12', /Tendría: 3 \+9\*/.test(tend), tend);
  } catch (e) { console.log('  REVENTO: ' + (e && e.message)); mal++; }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  salir(mal ? 1 : 0);
})();
