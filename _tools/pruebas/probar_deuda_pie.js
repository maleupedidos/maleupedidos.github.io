/* Los cuadritos de Inicio y la deuda con proveedores (15/9/2026).

   node probar_deuda_pie.js [390|1440]
   APP=app_viejo_tmp.html node probar_deuda_pie.js 1440    ← la direccion contraria

   Backend STUBBEADO con datos inventados (repo publico) y el reloj en el lunes
   14/9/2026 15:00 (semana ISO 38). No hace falta token. `action=busqueda` (la
   deuda FIFO) contesta a los 3 s, bien o con error segun la fase.

   Sostiene:
   · los 7 cuadritos, sin "Cobrado mes" y con "Margen mes" = facturado − costo de
     los mismos pedidos entregados del mes, y su % en el pie;
   · con la deuda bien: el pie dice la semana MAS VIEJA que tiene algo pendiente
     (una semana ya pagada no cuenta) y Cierre > Estado patrimonial dice lo mismo;
   · con la deuda en ERROR y sin copia guardada: NO dice "al día" ni muestra $0
     como si no se debiera nada, dice que no se pudo calcular, la respuesta mala
     no queda guardada, y Cierre dice lo mismo. Antes del 15/9/2026 decia
     "$0 · al día" y guardaba el {ok:false} como copia;
   · con una copia MALA ya guardada (de antes del arreglo) y el backend en error:
     tampoco dice "al día";
   · la deuda se pide una sola vez, y despues de un error no se reintenta en loop
     (los que la usan la vuelven a pedir cuando esta vacia).

   Contra la v342: 22 ok / 8 mal (el pie de Cierre y las dos fases de error). */
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
  o, { dee: o.fex, fe: dm(o.fex).slice(0, 5), mc: o.fex.slice(0, 7), f: dm(o.fex) });
const PEDIDOS = [
  H({ c: 'Ana Prueba', fex: '2026-09-03', $: 100000, co: 70000 }),
  H({ c: 'Beto Prueba', fex: '2026-09-11', $: 50000, co: 40000, ep: 'Pendiente' }),
  H({ h: 'Pilar', c: 'Caro Prueba', bar: 'Pilara', fex: '2026-09-12', $: 30000, co: 12000 }),
  H({ c: 'Dani Prueba', fex: '2026-08-28', $: 999000, co: 1000 }),                 // agosto: no cuenta
  H({ c: 'Eli Prueba', fex: '2026-09-13', $: 77000, co: 7000, es: 'Pendiente' })   // sin entregar: no cuenta
];
// Facturado sep = 180.000 · costo 122.000 · margen 58.000 · 32%
const VENTAS = PEDIDOS.filter(p => p.es === 'Entregado').map(p => ({ mes: p.mc === '2026-09' ? 'Septiembre' : 'Agosto', $: p.$, costo: p.co, f: p.f, fe: p.f, c: p.c, h: p.h, n: p.n, bar: p.bar, ep: p.ep, fp: p.fp }));
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [], light: true, saludSem: {}, saludMes: {}, ventasExtra: [] };
const DEUDA_OK = { ok: true, deudas: [
  { n: 'Prov A', total: 1000, semanas: [{ sem: '35', pendiente: 0 }, { sem: '37', pendiente: 1000 }] },
  { n: 'Prov B', total: 500, semanas: [{ sem: '38', pendiente: 500 }] }] };

const RELOJ = `(function(){var AH=new Date(2026,8,14,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__err=[];
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  var __fase=(location.search.match(/fase=(\\w+)/)||[])[1]||'ok';
  if(window.top===window){ try{
    localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_cierre_sec','resumen');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0||k==='ma3') localStorage.removeItem(k); });
    if(__fase==='copiamala') localStorage.setItem('mc_deudaprov',JSON.stringify({t:Date.now(),d:{ok:false,error:'guardada antes del arreglo'}}));
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'}, demora=150;
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='catalogo') cuerpo={ok:true,productos:{Prueba:[{a:'PPM',n:'Pack Muzzarella',cat:'Pack Pizzas x2',u:'u',dem:1}]}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      else if(a==='ventas') cuerpo={v:${JSON.stringify(VENTAS)}};
      else if(a==='busqueda'){ demora=3000; cuerpo=(__fase!=='ok')?{ok:false,error:'Exceeded maximum execution time'}:${JSON.stringify(DEUDA_OK)}; }
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},demora);});
    }
    return o.apply(this,arguments); }; })();`;

const LEER = `(function(){var r={cards:{},n:0};
  [].forEach.call(document.querySelectorAll('#hSnap .snap-c'),function(c){r.n++;
    var l=((c.querySelector('.snap-l')||{}).textContent||'').trim().toUpperCase();
    r.cards[l]={v:((c.querySelector('.snap-v')||{}).textContent||'').trim(),s:((c.querySelector('.snap-s')||{}).textContent||'').trim()};});
  r.busq=window.__gets.filter(function(g){return g==='busqueda';}).length;
  r.copia=localStorage.getItem('mc_deudaprov'); return r;})()`;
const CIERRE = `(function(){var out=null;[].forEach.call(document.querySelectorAll('.ck-card'),function(k){
  if(/Deuda proveedores/.test((k.querySelector('.ck-card-t')||{}).textContent||''))out={v:((k.querySelector('.ck-card-v')||{}).textContent||'').trim(),s:((k.querySelector('.ck-card-s')||{}).textContent||'').trim()};});
  return {c:out,busq:window.__gets.filter(function(g){return g==='busqueda';}).length};})()`;

async function fase(cli, nombre) {
  console.log('\n-- deuda ' + ({ ok: 'BIEN', error: 'con ERROR', copiamala: 'con ERROR y una copia mala guardada' })[nombre] + ' --');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?fase=' + nombre });
  const pinto = await esperar(cli, `!!document.querySelector('#hSnap .snap-c')`, 60000);
  chk('Inicio pinta los cuadritos', pinto);
  if (!pinto) return;
  // que la deuda conteste (3 s) y pasen varios repintados
  await esperar(cli, `(function(){var c=[].filter.call(document.querySelectorAll('#hSnap .snap-s'),function(e){return /cargando/.test(e.textContent);});return c.length===0;})()`, 20000);
  await pausa(4000);
  const r = await ev(cli, LEER);
  const d = r.cards['DEUDA PROVEEDORES'] || {};
  console.log('     ' + JSON.stringify({ deuda: d, pedidos_busqueda: r.busq, copia: r.copia ? r.copia.length + ' bytes' : null }));
  chk('la deuda se pide UNA sola vez mientras carga', r.busq === 1, r.busq);
  if (nombre === 'ok') {
    chk('son 7 cuadritos', r.n === 7, Object.keys(r.cards));
    chk('ya NO esta "Cobrado mes"', !r.cards['COBRADO MES']);
    const m = r.cards['MARGEN MES'] || {};
    chk('"Margen mes" = facturado − costo de los entregados del mes ($58.000)', m.v === '$58.000', m);
    chk('y el pie dice 32% de lo facturado', m.s === '32% de lo facturado', m.s);
    chk('Facturado mes da $180.000 (sin agosto ni lo pendiente)', (r.cards['FACTURADO MES'] || {}).v === '$180.000', r.cards['FACTURADO MES']);
    chk('la deuda suma $1.500', d.v === '$1.500', d.v);
    chk('el pie dice la semana MAS VIEJA con algo pendiente (la 35 ya pagada no cuenta)', d.s === 'la más vieja: semana del 7/9', d.s);
    chk('la respuesta buena queda guardada', !!r.copia);
  } else {
    chk('con el error NO dice "al día"', !/al día/.test(d.s || ''), d.s);
    chk('dice que no se pudo calcular', /no se pudo calcular/.test(d.s || ''), d.s);
    chk('y no muestra $0 como si no se debiera nada', d.v !== '$0', d.v);
    if (nombre === 'error') chk('la respuesta con error NO queda guardada', !r.copia, r.copia && r.copia.slice(0, 80));
  }
  await ev(cli, "goSubInicio('cierre')");
  await esperar(cli, `(function(){var r=${CIERRE};return !!(r.c&&r.c.s&&r.c.s!=='cargando');})()`, 15000);
  await pausa(1500);
  const c = await ev(cli, CIERRE);
  console.log('     Cierre: ' + JSON.stringify(c));
  chk('Cierre dice lo mismo que Inicio', !!c.c && c.c.s === d.s, c.c);
  chk('entrar al Cierre no vuelve a pedir la deuda', c.busq === 1, c.busq);
  await ev(cli, "goSubInicio('resumen')");
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
    console.log('\n== Cuadritos de Inicio y deuda · ' + ANCHO + 'px · ' + APP + ' ==');
    await fase(cli, 'ok');
    await fase(cli, 'error');
    await fase(cli, 'copiamala');
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(2); }
})();
