/* LA TAB PRODUCTOS DESDE SUPABASE (5/10/2026, rama supabase).

   node _tools/pruebas/probar_productos_pg.js [390|1440]      (con `npm run dev`)

   Todo va STUBBEADO con datos inventados (el repo es publico): Apps Script y
   Supabase estan interceptados en la pagina. No toca produccion.

   La base simulada se arma desde LA MISMA foto que devuelve la planilla
   simulada (`pgDesde`, la inversa de `_stDesdePg`). Asi la prueba contesta:
   «con los mismos datos en las dos fuentes, ¿la pantalla es IDENTICA?».
   Que los datos de verdad sean los mismos en las dos fuentes lo contesta otra
   prueba, contra produccion: `estancias/_tools/comparar_productos_pg.py`.

   Sostiene:
   · palanca en «no»: ni una consulta a la base, pantalla de siempre, sin linea nueva;
   · palanca en «si»: la tabla sale de la base, NO se pide stockTab, y la pantalla
     (cards, tabla, reparto por freezer, avisos) es identica a la de la planilla;
   · dice de donde salio y de cuando es;
   · el valor del stock usa el costo de la planilla (la base no lo trae);
   · vuelve SOLA a la planilla, y dice por que, si: la base da 500 · la base da
     400 (031 sin aplicar) · el latido es viejo · falta el latido · la base no
     contesta en 6 s · no hay un costo de hoy · moviste stock despues de la copia;
   · el entregable de Ustariz NO descuenta lo reservado en Moresco (el bug del
     30/9/2026), que es lo que la 031 trae de la base. Reinyectado, da rojo. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

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
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
};

/* La foto de la planilla. Inventada, con los casos que importan:
   · Pizza: 9 en total, 3 en Ustariz y 6 en Moresco, y 1 reservado EN MORESCO.
     El entregable de Ustariz es 3 (no 2): el reservado de Lucas no se le resta.
   · Lomo: va por pieza, se pesa, y su "comprado" son kilos de piezas.
   · Wrap: todo en lo de Lucas. */
const P = (n, a, i, c, v, f, r, u, pd, pr, pz, co) => {
  const pdd = {}; Object.keys(pd).forEach(k => { pdd[k] = Math.max(0, Math.round((pd[k] - (pr[k] || 0)) * 1000) / 1000); });
  return { n, a, i, c, v, f, r, d: Math.round((f - r) * 1000) / 1000, u, p: 1000, co, iv: Math.max(0, f) * co, pd, pr, pdd, pz: pz ? 1 : 0 };
};
const STOCK = [
  P('Pizza Muzzarella', 'PMu', 9, 0, 0, 9, 1, 'u', { ustariz: 3, moresco: 6 }, { ustariz: 0, moresco: 1 }, 0, 6200),
  P('Carne Lomo', 'CLo', 0, 3.89, 0, 3.89, 0.5, 'kg', { ustariz: 3.89, moresco: 0 }, { ustariz: 0.5, moresco: 0 }, 1, 28500),
  P('Wrap Pollo', 'WPo', 10, 0, 2, 8, 0, 'u', { ustariz: 0, moresco: 8 }, { ustariz: 0, moresco: 0 }, 0, 3100),
  P('Sorrentinos', 'SL', 0, 3, 0, 3, 0, 'u', { ustariz: 3, moresco: 0 }, { ustariz: 0, moresco: 0 }, 0, 4000),
];
const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz', user: 'tadeo' }, { id: 'moresco', nombre: 'Deposito Moresco', user: 'luqui' }];

/* La inversa de `_stDesdePg`: lo que la replica escribiria con la 031. */
function pgDesde(stock, deps) {
  return {
    prods: stock.map((s, ix) => ({ sku: s.a, name: s.n, unit: s.u, sale_price: s.p,
      observed_physical_quantity: s.f, observed_reserved_quantity: s.r, observed_available_quantity: s.d,
      weekly_initial_quantity: s.i, weekly_sold_quantity: s.v, sheet_order: ix + 1,
      screen_purchased_quantity: s.c, tracked_by_piece: !!s.pz })),
    snaps: [].concat(...stock.map(s => deps.map(d => ({ product_sku: s.a, warehouse_key: d.id,
      physical_quantity: s.pd[d.id], reserved_quantity: s.pr[d.id] })))),
    deps: deps.map((d, ix) => ({ warehouse_key: d.id, name: d.nombre, sort_order: ix + 1, user_key: d.user })),
  };
}
const PG = pgDesde(STOCK, DEPS);
// La base devuelve los productos DESORDENADOS a proposito: el orden es el de la hoja.
PG.prods = PG.prods.slice().reverse();

/* Escenarios (por la URL, porque addScriptToEvaluateOnNewDocument ACUMULA). */
const EXTRA = `
(function(){
  var q=location.search;
  var esc=(q.match(/esc=([a-z0-9]+)/)||[])[1]||'off';
  window.__esc=esc; window.__gets=[]; window.__pg=[];
  try{ localStorage.setItem('maleu_tab','stock');
       Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0) localStorage.removeItem(k); }); }catch(e){}
  var STOCK=${JSON.stringify(STOCK)}, DEPS=${JSON.stringify(DEPS)}, PG=${JSON.stringify(PG)};
  var CIERRE=new Date(Date.now()-2*86400e3).toISOString();
  /* El costo de la planilla de hoy, guardado como lo guarda la tab (salvo 'sincosto'). */
  if(esc!=='sincosto'){
    try{ localStorage.setItem('mc_stockTab1',JSON.stringify({t:Date.now()-3600e3,
      d:{ok:true,ts:Date.now()-3600e3,stock:STOCK,stockDeps:DEPS,stockCierre:CIERRE}})); }catch(e){}
  }
  var latido=Date.now()-2*60e3;
  if(esc==='vieja')latido=Date.now()-40*60e3;
  /* EL SELLO DE ESCRITURA (9/10/2026): la ultima vez que ALGUIEN escribio.
     Por defecto, antes del latido: la copia sirve. */
  var sello=latido-60e3;
  if(esc==='escrito')sello=Date.now()-30e3;
  try{ if(esc==='post')localStorage.setItem('maleu_ult_post',String(Date.now()-20e3)); else localStorage.removeItem('maleu_ult_post'); }catch(e){}
  function resp(txt,ms,st){ return new Promise(function(ok){ setTimeout(function(){
    ok(new Response(txt,{status:st||200,headers:{'Content-Type':'application/json'}})); },ms); }); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase.co')>-1){
      /* Solo las de esta tab: Pedidos y OC tienen sus propios atajos. */
      if(/inventory_|replica_status/.test(url))window.__pg.push(url.split('/rest/v1/')[1]||url);
      if(esc==='e500')return resp('{"message":"boom"}',60,500);
      if(esc==='e400')return resp('{"code":"42703","message":"column inventory_product.sheet_order does not exist"}',60,400);
      if(esc==='colgada')return new Promise(function(ok,no){
        var s=x&&x.signal; if(s)s.addEventListener('abort',function(){ var e=new Error('aborted'); e.name='AbortError'; no(e); }); });
      var cuerpo='[]';
      if(url.indexOf('inventory_product')>-1)cuerpo=JSON.stringify(PG.prods);
      else if(url.indexOf('inventory_stock_snapshot')>-1)cuerpo=JSON.stringify(PG.snaps);
      else if(url.indexOf('inventory_warehouse')>-1)cuerpo=JSON.stringify(PG.deps);
      else if(url.indexOf('replica_status')>-1)cuerpo=(esc==='sinlatido')?'[]'
        :JSON.stringify([{domain:'inventario',confirmed_at:new Date(latido).toISOString(),detail:{cierre:CIERRE}}]);
      return resp(cuerpo,60);
    }
    if(url.indexOf('script.google.com')>-1){
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
      var c = a==='stockTab' ? {ok:true,ts:Date.now(),stock:STOCK,stockDeps:DEPS,stockCierre:CIERRE}
        : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true}
        : a==='cajaLight' ? {ts:1,caja:{},saldoBase:{},gastos:[],ingresos:[],movimientos:[],efMano:[],cuentas:[]}
        : a==='ver' ? (esc==='sinsello' ? {ok:false,error:'stub'} : {ok:true,ver:String(sello)+'-x',t:Date.now(),fotos:{}})
        : a==='ocLight' ? {ok:true,oc:{lista:[]}} : a==='cobrosPendientes' ? {ok:true,cobros:[]}
        : {ok:false,error:'stub'};
      return resp(JSON.stringify(c), a==='stockTab'?400:100);
    }
    return o.apply(this,arguments);
  };
})();`;

/* Lo que la persona ve, sin la linea de "de donde salio" ni el sello del
   costo: eso es lo unico que puede (y tiene que) cambiar entre caminos. */
const LEER = `(function(){
  var k={}; document.querySelectorAll('#sKpi .card').forEach(function(c){ var l=c.querySelector('.kl'),v=c.querySelector('.kv'),s=c.querySelector('.ks');
    if(l)k[l.textContent.trim()]={v:v?v.textContent:'',s:s?s.textContent.replace(/ \\u00b7 costo de la planilla.*$/,''):''}; });
  var filas=[].map.call(document.querySelectorAll('#sList .si'),function(f){ return [].map.call(f.children,function(c){return c.textContent;}).join(' | '); });
  var sello=[].map.call(document.querySelectorAll('#sKpi > .st-sello'),function(a){return a.textContent;});
  return { k:k, filas:filas, avisos:[].map.call(document.querySelectorAll('#sKpi > .st-aviso'),function(a){return a.textContent;}),
    dep:(document.getElementById('sKpiDep')||{}).textContent||'', titulo:(document.getElementById('sTitulo')||{}).textContent||'',
    sello:sello, valorKs:((document.querySelector('#sKpi .card .ks')||{}).textContent||''), gets:window.__gets.slice(), pg:window.__pg.slice(), fuente:(D&&D.stockFuente)||'' };
})()`;

async function correr(esc, opts) {
  opts = opts || {};
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: EXTRA });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&esc=' + esc });
    if (!await esperar(cli, `typeof go==='function' && typeof loadStockTab==='function' && window.__esc===${JSON.stringify(esc)}`, 60000))
      return { error: 'el ERP no arranco' };
    /* El permiso de Supabase, con o sin la palanca. Directo en memoria: es lo
       que `_sbPermiso` devuelve, sin pasar por `sbToken`. */
    const pal = esc === 'off' ? '{}' : '{productosPg:true}';
    await evaluar(cli, `_sbPerm={token:'jwt',url:'https://x.supabase.co',key:'pk',pal:${pal}}; _sbPermHasta=Date.now()+3600e3; 1`);
    if (opts.reinyectar) await evaluar(cli, opts.reinyectar);
    if (opts.sucio) await evaluar(cli, `ST_SUCIO=Date.now(); 1`);
    await evaluar(cli, `go('stock'); 1`);
    const espera = esc === 'colgada' ? 15000 : 8000;
    if (!await esperar(cli, `window.D && Array.isArray(D.stock) && D.stock.length===${STOCK.length} && document.querySelectorAll('#sList .si').length===${STOCK.length} && !!D.stockFuente`, espera))
      return { error: 'la tabla no se pinto', estado: await evaluar(cli, LEER).catch(() => null) };
    await pausa(esc === 'off' ? 900 : 700);   // que llegue lo que tenga que llegar despues
    const r = await evaluar(cli, LEER);
    r.errores = errores.concat(await evaluar(cli, 'window.__err?window.__err.slice():[]').catch(() => []));
    return r;
  } finally { try { cli.matar(); } catch (e) {} }
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const vista = r => ({ k: r.k, filas: r.filas, avisos: r.avisos, dep: r.dep, titulo: r.titulo });

(async () => {
  console.log('\n== Productos desde Supabase (' + ANCHO + 'px) ==\n');
  const off = await correr('off');
  if (off.error) { chk('la pantalla de siempre se pinta', false, off); process.exit(1); }
  chk('palanca en «no»: ni una consulta a las tablas de inventario', off.pg.length === 0, off.pg);
  chk('palanca en «no»: la foto sale de stockTab, como siempre', off.gets.indexOf('stockTab') >= 0 && off.fuente === 'planilla', off.gets);
  chk('palanca en «no»: no aparece ninguna linea nueva', off.sello.length === 0, off.sello);
  chk('   (y la pantalla tiene que mirar algo: ' + off.filas.length + ' filas, ' + Object.keys(off.k).length + ' cards)', off.filas.length === STOCK.length && Object.keys(off.k).length >= 3, off);

  const on = await correr('on');
  if (on.error) { chk('palanca en «si»: se pinta', false, on); }
  else {
    chk('palanca en «si»: la tabla sale de la base', on.fuente === 'pg', on.fuente);
    chk('palanca en «si»: NO se le pide stockTab a Apps Script', on.gets.indexOf('stockTab') < 0, on.gets);
    chk('palanca en «si»: cuatro consultas a la base', on.pg.length === 4, on.pg);
    chk('LA PANTALLA ES IDENTICA a la de la planilla (cards, tabla, reparto, avisos)', igual(vista(on), vista(off)),
      { planilla: vista(off), base: vista(on) });
    chk('dice de donde salio y de cuando es', on.sello.length === 1 && /Copia de Supabase/.test(on.sello[0]) && /hace 2 min/.test(on.sello[0]), on.sello);
    chk('el valor del stock dice de cuando es el costo', /costo de la planilla hace 1 hora/.test(on.valorKs), on.valorKs);
    chk('y cuando termina de preguntar, deja de decir que esta mirando', !/mirando si hubo cambios/.test(on.sello[0] || ''), on.sello);
    chk('pregunto por el sello de escritura', on.gets.indexOf('ver') >= 0, on.gets);
    chk('sin excepciones', on.errores.length === 0, on.errores);
  }

  const vuelve = async (esc, patron, nombre, opts) => {
    const r = await correr(esc, opts);
    if (r.error) { chk(nombre + ': se pinta', false, r); return; }
    chk(nombre + ': vuelve a la planilla (stockTab)', r.fuente === 'planilla' && r.gets.indexOf('stockTab') >= 0, { fuente: r.fuente, gets: r.gets });
    chk(nombre + ': y lo dice', r.sello.length === 1 && /De la planilla/.test(r.sello[0]) && patron.test(r.sello[0]), r.sello);
    chk(nombre + ': la pantalla es la de siempre', igual(vista(r), vista(off)), vista(r));
    chk(nombre + ': sin excepciones', r.errores.length === 0, r.errores);
  };
  console.log('');
  await vuelve('e500', /contestó 500/, 'la base da 500');
  await vuelve('e400', /contestó 400/, 'la base da 400 (031 sin aplicar)');
  await vuelve('vieja', /copia de la base es de hace 40 min/, 'latido de hace 40 min');
  await vuelve('sinlatido', /le falta latido/, 'sin latido');
  await vuelve('colgada', /no contestó en 6 s/, 'la base no contesta');
  await vuelve('sincosto', /costo/, 'sin costo de hoy');
  await vuelve('on', /moviste stock/, 'moviste stock despues de la copia', { sucio: true });
  /* 9/10/2026: lo que escribio OTRO aparato, y este mismo antes de recargar. */
  await vuelve('escrito', /se escribió algo/, 'otro aparato escribio despues de la copia');
  await vuelve('sinsello', /no se pudo saber si hubo cambios/, 'no se pudo preguntar si hubo cambios');
  await vuelve('post', /guardaste algo después de la copia/, 'este aparato guardo algo y se recargo');

  /* LA REINYECCION. El bug del 30/9: el reservado de Moresco se le restaba a
     Ustariz. Si `_stDesdePg` armara `pdd` con el reservado TOTAL, la pantalla
     tiene que dejar de ser identica — y esta prueba, ponerse roja. */
  console.log('\n-- el bug reinyectado --');
  const roto = await correr('on', { reinyectar:
    `_stDesdePg=(function(f){ return function(x){ var o=f(x); (o.stock||[]).forEach(function(s){ Object.keys(s.pdd).forEach(function(k){ s.pdd[k]=Math.max(0,Math.round((s.pd[k]-s.r)*1000)/1000); }); }); return o; }; })(_stDesdePg); 1` });
  chk('con el reservado total en vez del de cada freezer, la pantalla deja de ser identica',
    !roto.error && roto.fuente === 'pg' && !igual(vista(roto), vista(off)), roto.error ? roto : { fuente: roto.fuente });

  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log('EXPLOTO: ' + (e && e.stack)); process.exit(1); });
