/* Inicio > Resumen: el stock al costo, el refresco de stock y deuda, la proyeccion
   de una semana corta y los nombres que tipea un cliente (12/10/2026).

   node probar_inicio_patrimonio.js [390|1440]
   APP=app_viejo_tmp.html node probar_inicio_patrimonio.js 1440    ← la direccion contraria

   Backend STUBBEADO con datos inventados (repo publico), sin token. El reloj esta
   en el VIERNES 2/10/2026 15:00: la semana 1 de octubre del calendario de Maleu
   va del jueves 1 al domingo 4 (cortada por el fin de mes).

   Sostiene:
   · "Stock (al costo)" sale de `action=stockTab` (D.stock no llega nunca a
     Inicio): $5.000 y "2 productos en freezer", y la Posicion Neta lo suma.
     Antes decia "$0 · 0 productos en freezer" con mercaderia adentro;
   · Cierre > Estado patrimonial dice el mismo stock;
   · Actualizar vuelve a pedir el stock y la deuda (antes quedaban en memoria
     toda la sesion) y los cuadritos cambian;
   · con `stockTab` en error y sin copia: no dice $0, dice que no se pudo
     calcular, no afirma una Posicion Neta y no reintenta en loop;
   · la Proyeccion de la semana corta llega hasta su domingo (4/10), no hasta
     `desde + 6` (7/10): un pedido del martes 6 no entra;
   · llegar a la semana en curso con las flechas sigue diciendo "Proyección" y
     cuenta el pedido del sabado (antes decia "Pendiente" y cortaba en hoy);
   · un nombre de cliente con HTML adentro se ve como texto y no se ejecuta;
   · el boton del PDF de una semana anterior no muestra la clave interna;
   · en escritorio ningun boton de Ventas retail mide menos de 38 px.

   · la fila de cada dia de una semana anterior mide 38 px o mas (media 17).

   Contra la v583: 8 ok / 21 mal. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 500) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(250); }
  return false;
};

let n = 900;
const dm = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const H = o => Object.assign({ n: String(n++), h: 'Home', es: 'Entregado', de: 'Viernes', o: 'Deposito', ep: 'Cobrado', fp: 'Efectivo', p: [{ a: 'PPM', q: 1 }], bar: 'Estancias del Pilar' },
  o, { dee: o.fex, fe: dm(o.fex).slice(0, 5), fc: dm(o.fex).slice(0, 5), mc: o.fex.slice(0, 7), f: dm(o.fex) });
const MALO = '<img src=x onerror="window.__xss=1">';
const PEDIDOS = [
  H({ c: 'Ana Prueba', fex: '2026-10-01', $: 100000, co: 60000 }),
  H({ c: MALO, fex: '2026-10-02', $: 50000.4, co: 30000, ep: 'Pendiente' }),           // entregado sin cobrar
  H({ c: 'Caro Prueba', fex: '2026-10-03', $: 10000, co: 6000, es: 'Pendiente', ep: 'Pendiente' }),   // sabado de ESTA semana
  H({ c: 'Dani Prueba', fex: '2026-10-06', $: 99000, co: 50000, es: 'Pendiente', ep: 'Pendiente' }),  // martes de la QUE VIENE
  H({ c: 'Eli Prueba', fex: '2026-09-22', $: 40000, co: 20000 })                     // una semana anterior
];
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [], light: true, saludSem: {}, saludMes: {}, ventasExtra: [] };
const VENTAS = PEDIDOS.filter(p => p.es === 'Entregado').map(p => ({ mes: p.mc === '2026-10' ? 'Octubre' : 'Septiembre', $: p.$, costo: p.co, f: p.f, fe: p.f, c: 'x', h: p.h, n: p.n, bar: p.bar, ep: p.ep, fp: p.fp }));

const RELOJ = `(function(){var AH=new Date(2026,9,2,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__err=[]; window.__v2=false;
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  var __fase=(location.search.match(/fase=(\\w+)/)||[])[1]||'ok';
  if(window.top===window){ try{
    localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_subinicio','resumen');
    localStorage.setItem('maleu_cierre_sec','resumen'); localStorage.removeItem('maleu_rt_per');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0||k==='ma3') localStorage.removeItem(k); });
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase')>-1) return Promise.reject(new Error('sin base en la prueba'));
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'}, demora=150, k=window.__v2?2:1;
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='catalogo') cuerpo={ok:true,productos:{Prueba:[{a:'PPM',n:'Pack Muzzarella',cat:'Pack Pizzas x2',u:'u',dem:1}]}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      else if(a==='ventas') cuerpo={v:${JSON.stringify(VENTAS)}};
      else if(a==='busqueda'){ demora=1200; cuerpo={ok:true,deudas:[{n:'Prov A',total:k===2?500:1500,semanas:[{sem:'40',pendiente:k===2?500:1500}]}]}; }
      else if(a==='stockTab'){ demora=900; cuerpo=(__fase==='stockmal')?{ok:false,error:'Exceeded maximum execution time'}
        :{ok:true,ts:1,stockDeps:[],stock:[{a:'PPM',n:'Pack Muzzarella',u:'u',f:2*k,co:1000,iv:2000.1*k,pd:{}},{a:'SQB',n:'Sorrentinos',u:'u',f:0,co:500,iv:0,pd:{}},{a:'CLo',n:'Lomo',u:'kg',f:1.5*k,co:2000,iv:3000.1*k,pd:{}}]}; }
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},demora);});
    }
    return o.apply(this,arguments); }; })();`;

const LEER = `(function(){var r={cards:{},n:0};
  [].forEach.call(document.querySelectorAll('#hSnap .snap-c'),function(c){r.n++;
    var l=((c.querySelector('.snap-l')||{}).textContent||'').trim().toUpperCase();
    r.cards[l]={v:((c.querySelector('.snap-v')||{}).textContent||'').trim(),s:((c.querySelector('.snap-s')||{}).textContent||'').trim()};});
  r.neta=(function(){var t=(document.getElementById('hSnap')||{}).textContent||'';var m=t.match(/Posición Neta real:.*?= *(\\$[\\d.\\-]+)/);return m?m[1]:null;})();
  r.stockTab=window.__gets.filter(function(g){return g==='stockTab';}).length;
  r.busq=window.__gets.filter(function(g){return g==='busqueda';}).length;
  return r;})()`;
const PROY = `(function(){var o=null;[].forEach.call(document.querySelectorAll('#hRetail .rt-kpis > *'),function(k){
  var l=((k.querySelector('.rt-kl')||{}).textContent||'').trim();
  if(/^(Proyección|Pendiente)$/i.test(l))o={l:l,v:((k.querySelector('.rt-kv')||{}).textContent||'').trim()};});
  var sub=((document.querySelector('#hRetail .card:nth-of-type(2)')||document.getElementById('hRetail')).textContent||'');
  return {k:o,per:(typeof _rtPer!=='undefined')?_rtPer:null};})()`;
const CIERRE = `(function(){var out=null;[].forEach.call(document.querySelectorAll('.ck-card'),function(k){
  if(/Stock al costo/.test((k.querySelector('.ck-card-t')||{}).textContent||''))out={v:((k.querySelector('.ck-card-v')||{}).textContent||'').trim(),s:((k.querySelector('.ck-card-s')||{}).textContent||'').trim()};});
  return out;})()`;
const sinCargando = `(function(){var c=[].filter.call(document.querySelectorAll('#hSnap .snap-s'),function(e){return /cargando/.test(e.textContent);});return c.length===0&&!!document.querySelector('#hSnap .snap-c');})()`;

async function abrirFase(cli, nombre) {
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?fase=' + nombre });
  const pinto = await esperar(cli, `!!document.querySelector('#hSnap .snap-c')`, 60000);
  chk('Inicio pinta los cuadritos', pinto);
  await esperar(cli, sinCargando, 20000);
  await pausa(3000);
  return pinto;
}

async function faseOk(cli) {
  console.log('\n-- todo contesta bien --');
  if (!await abrirFase(cli, 'ok')) return;
  let r = await ev(cli, LEER);
  const st = r.cards['STOCK (AL COSTO)'] || {};
  console.log('     ' + JSON.stringify({ stock: st, neta: r.neta, stockTab: r.stockTab }));
  chk('son 5 cuadritos (sin Facturado mes ni Margen mes, que estan en Total Maleu)', r.n === 5 && !r.cards['FACTURADO MES'] && !r.cards['MARGEN MES'], Object.keys(r.cards || {}));
  chk('el stock al costo es $5.000 (2.000 + 3.000), no $0', st.v === '$5.000', st);
  chk('y el pie cuenta los 2 productos que tienen algo', st.s === '2 productos en freezer', st.s);
  chk('la Posición Neta suma el stock y lo que MUESTRA (hay centavos adentro): 0 + 50.000 + 5.000 − 1.500 = $53.500', r.neta === '$53.500', r.neta);
  chk('el stock se pidió UNA sola vez', r.stockTab === 1, r.stockTab);

  /* ── la proyeccion de la semana corta ── */
  let p = await ev(cli, PROY);
  console.log('     ' + JSON.stringify(p));
  chk('viernes: Ventas retail abre en "esta semana" y dice Proyección', !!(p.k && p.k.l === 'Proyección'), p);
  chk('proyecta hasta el DOMINGO 4: 150.000 + 10.000 = $160.000 (el martes 6 no entra)', !!(p.k && p.k.v === '$160.000'), p.k);
  await ev(cli, 'rtMover(-1);1'); await pausa(400);
  await ev(cli, 'rtMover(1);1'); await pausa(600);
  p = await ev(cli, PROY);
  console.log('     con flechas: ' + JSON.stringify(p));
  chk('volviendo con las flechas a la semana en curso sigue diciendo Proyección', !!(p.k && p.k.l === 'Proyección'), p);
  chk('y sigue contando el pedido del sábado: $160.000', !!(p.k && p.k.v === '$160.000'), p.k);

  /* ── el nombre con HTML ── */
  const x = await ev(cli, `JSON.stringify({xss:window.__xss||0,img:document.querySelectorAll('#hAlerts img,#hCaja img').length,txt:(document.getElementById('hAlerts').textContent||'').indexOf('<img src=x')>=0})`);
  chk('un nombre con HTML se ve como texto y no se ejecuta', x === '{"xss":0,"img":0,"txt":true}', x);

  /* ── el boton del PDF de una semana anterior ── */
  const pdf = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#hCaja button[onclick*="descargarPDFSemana"]'),function(b){return b.textContent.trim();}))`);
  const pdfs = JSON.parse(typeof pdf === 'string' ? pdf : '[]');
  chk('hay un botón de PDF por semana anterior', pdfs.length >= 1, pdf);
  chk('y ninguno muestra la clave interna ("2026-9-4")', pdfs.length >= 1 && pdfs.every(t => !/\d{4}-\d{1,2}-\d/.test(t)), pdfs);

  /* ── la fila de cada dia, que se toca para ver sus cobros (media 17 px) ── */
  const fl = await ev(cli, `(function(){document.getElementById('sem-body-prev').classList.remove('hidden');
    [].forEach.call(document.querySelectorAll('#sem-body-prev [id^="sem-body-"]'),function(e){e.classList.remove('hidden');});
    var o=[].map.call(document.querySelectorAll('#sem-body-prev [onclick^="toggleDiaPeds"]'),function(e){return Math.round(e.getBoundingClientRect().height);});
    document.getElementById('sem-body-prev').classList.add('hidden'); return JSON.stringify(o);})()`);
  const filas = JSON.parse(typeof fl === 'string' ? fl : '[]');
  chk('la fila de cada día mide 38 px o más (' + filas.length + ' examinadas)', filas.length >= 1 && filas.every(h => h >= 38), filas);

  /* ── escritorio: el piso son 38 px ── */
  if (ANCHO > 700) {
    const ch = await ev(cli, `JSON.stringify((function(){var o=[],n=0;[].forEach.call(document.querySelectorAll('#hRetail button'),function(b){var r=b.getBoundingClientRect();if(!r.width)return;n++;if(r.height<38)o.push(b.textContent.trim().slice(0,14)+' '+Math.round(r.height));});return {n:n,chicos:o};})())`);
    const c = JSON.parse(typeof ch === 'string' ? ch : '{"n":0,"chicos":["?"]}');
    chk('los ' + c.n + ' botones de Total Maleu y Ventas retail miden 38 px o más', c.n >= 8 && c.chicos.length === 0, c);
  }

  /* ── Actualizar vuelve a pedir stock y deuda ── */
  await ev(cli, 'window.__v2=true; refreshContextual(); 1');
  await esperar(cli, `(function(){var r=${LEER};return (r.cards['STOCK (AL COSTO)']||{}).v==='$10.000'&&(r.cards['DEUDA PROVEEDORES']||{}).v==='$500';})()`, 25000);
  await pausa(800);
  r = await ev(cli, LEER);
  console.log('     tras Actualizar: ' + JSON.stringify({ stock: r.cards['STOCK (AL COSTO)'], deuda: r.cards['DEUDA PROVEEDORES'], neta: r.neta, stockTab: r.stockTab, busq: r.busq }));
  chk('Actualizar trae el stock nuevo ($10.000)', (r.cards['STOCK (AL COSTO)'] || {}).v === '$10.000', r.cards['STOCK (AL COSTO)']);
  chk('y la deuda nueva ($500)', (r.cards['DEUDA PROVEEDORES'] || {}).v === '$500', r.cards['DEUDA PROVEEDORES']);
  chk('la Posición Neta se rehace: 0 + 50.000 + 10.000 − 500 = $59.500', r.neta === '$59.500', r.neta);
  chk('fue UN pedido más de cada uno, no una ráfaga', r.stockTab === 2 && r.busq === 2, { stockTab: r.stockTab, busq: r.busq });

  /* ── Cierre dice el mismo stock ── */
  await ev(cli, "goSubInicio('cierre')");
  await esperar(cli, `(function(){var r=${CIERRE};return !!(r&&r.v);})()`, 15000);
  await pausa(1200);
  const c2 = await ev(cli, CIERRE);
  console.log('     Cierre: ' + JSON.stringify(c2));
  chk('Cierre > Estado patrimonial no dice $0 de stock', !!c2 && !/^\$0$/.test(c2.v) && /10/.test(c2.v), c2);
  chk('y su pie dice cuántos productos, igual que Inicio', !!c2 && c2.s === '2 productos en freezer', c2);
  await ev(cli, "goSubInicio('resumen')");
  const errs = await ev(cli, 'JSON.stringify(window.__err||[])');
  chk('sin errores en consola', errs === '[]', errs);
}

async function faseMal(cli) {
  console.log('\n-- el stock no contesta y no hay copia --');
  if (!await abrirFase(cli, 'stockmal')) return;
  const r = await ev(cli, LEER);
  const st = r.cards['STOCK (AL COSTO)'] || {};
  console.log('     ' + JSON.stringify({ stock: st, neta: r.neta, stockTab: r.stockTab }));
  chk('no muestra $0 como si el freezer estuviera vacío', st.v !== '$0' && st.v === '…', st);
  chk('dice que no se pudo calcular', /no se pudo calcular/.test(st.s || ''), st.s);
  chk('y no afirma una Posición Neta sin el stock', r.neta === null, r.neta);
  chk('no reintenta en loop (un solo pedido)', r.stockTab === 1, r.stockTab);
  chk('la respuesta con error no queda guardada', (await ev(cli, `localStorage.getItem('mc_stockTab1')`)) === null);
  const errs = await ev(cli, 'JSON.stringify(window.__err||[])');
  chk('sin errores en consola', errs === '[]', errs);
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    console.log('\n== Inicio: stock, refresco, proyección y nombres · ' + ANCHO + 'px · ' + APP + ' ==');
    await faseOk(cli);
    await faseMal(cli);
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(2); }
})();
