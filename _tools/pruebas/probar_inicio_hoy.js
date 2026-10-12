/* Inicio > Resumen despues de la /mejora del 12/10/2026: primero lo que hay que
   hacer, despues lo que paso.

   node probar_inicio_hoy.js [390|1440]
   APP=app_viejo_tmp.html node probar_inicio_hoy.js 1440    ← la direccion contraria

   Backend STUBBEADO con datos inventados (repo publico), sin token. Dos relojes:
   el VIERNES 2/10/2026 (sem 1 de octubre, jue 1 a dom 4, semana ISO 40) y el
   LUNES 5/10/2026 (sem 2, sin ninguna entrega todavia).

   Sostiene:
   · HOY y los avisos estan ARRIBA de Total Maleu (en el celular arrancaban a
     3.021 px);
   · el aviso de cobranza dice cuantos y CUANTA plata, un toque lleva a Ventas >
     COBROS, y los nombres quedan a un toque;
   · el aviso de la deuda con proveedores sale solo si hay deuda de una semana
     anterior, y un toque lleva a Abastecimiento;
   · los cuadritos A cobrar y Deuda proveedores se pueden tocar;
   · la tarjeta de la semana ya no repite "por cobrar";
   · Total Maleu dice el objetivo del mes y el ritmo (dias cerrados); sin meta
     cargada no dibuja nada;
   · "Esta semana" sin entregas muestra lo cargado, dia por dia (antes decia
     "todavia no hay entregas" y nada mas);
   · la semana actual abierta no dibuja los dias vacios;
   · de las semanas anteriores se ven 4 y el resto a un toque;
   · el grafico usa la cuenta de Total Maleu: septiembre con su catering, y la
     comparacion ya no repite el facturado.

   Contra la v585: 8 ok / 22 mal. */
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
const PEDIDOS = [
  H({ c: 'Ana Prueba', fex: '2026-10-01', $: 100000, co: 60000 }),
  H({ c: 'Beto Prueba', fex: '2026-10-02', $: 50000, co: 30000, ep: 'Pendiente' }),                  // entregado sin cobrar
  H({ c: 'Caro Prueba', fex: '2026-10-03', $: 10000, co: 6000, es: 'Pendiente', ep: 'Pendiente' }),  // sabado, sem 1
  H({ c: 'Dani Prueba', fex: '2026-10-06', $: 99000, co: 50000, es: 'Pendiente', ep: 'Pendiente' })  // martes, sem 2
].concat(['2026-09-22', '2026-09-15', '2026-09-08', '2026-09-01', '2026-08-25', '2026-08-18'].map((f, i) =>
  H({ c: 'Viejo ' + i, fex: f, $: 40000, co: 20000 })));   // seis semanas anteriores con un cobro cada una
const EXTRA = [{ h: 'Catering', c: 'Evento Prueba', fx: '2026-09-10', $: 300000, co: 200000 }];
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [], light: true, saludSem: {}, saludMes: {}, ventasExtra: EXTRA };
const VENTAS = PEDIDOS.filter(p => p.es === 'Entregado').map(p => ({ mes: 'Octubre', $: p.$, costo: p.co, f: p.f, fe: p.f, c: 'x', h: p.h, n: p.n, bar: p.bar, ep: p.ep, fp: p.fp }));
/* El servidor NO cuenta el catering: septiembre le da 160.000 (son 460.000). */
const TEND = { ok: true, ts: 1, base: { total: 10, activos: 5, enfriando: 2, dormidos: 2, perdidos: 1 },
  meses: [{ mes: '2026-08', label: 'Ago 26', pedidos: 2, facturado: 80000, clientes: 2, nuevos: 2 },
          { mes: '2026-09', label: 'Sep 26', pedidos: 4, facturado: 160000, clientes: 4, nuevos: 1 },
          { mes: '2026-10', label: 'Oct 26', pedidos: 2, facturado: 150000, clientes: 2, nuevos: 1, enCurso: true }],
  comparable: { dia: 2, actual: { label: 'Oct 26', pedidos: 2, facturado: 150000, clientes: 2, nuevos: 1 }, previo: { label: 'Sep 26', pedidos: 1, facturado: 40000, clientes: 1, nuevos: 1 } } };

const RELOJ = `(function(){var lunes=/fase=lunes/.test(location.search);
  var AH=(lunes?new Date(2026,9,5,10,0,0):new Date(2026,9,2,15,0,0)).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__err=[];
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  var __fase=(location.search.match(/fase=(\\w+)/)||[])[1]||'viernes';
  if(window.top===window){ try{
    localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_subinicio','resumen');
    localStorage.removeItem('maleu_rt_per'); localStorage.removeItem('maleu_seismeses');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0||k==='ma3') localStorage.removeItem(k); });
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase')>-1) return Promise.reject(new Error('sin base en la prueba'));
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'}, demora=150, lun=(__fase==='lunes');
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='catalogo') cuerpo={ok:true,productos:{Prueba:[{a:'PPM',n:'Pack Muzzarella',cat:'Pack Pizzas x2',u:'u',dem:1}]}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      else if(a==='ventas') cuerpo={v:${JSON.stringify(VENTAS)}};
      else if(a==='tendencia') cuerpo=${JSON.stringify(TEND)};
      else if(a==='planMes') cuerpo={ok:true,metas:lun?{}:{'Total|':{metaFact:1000000}}};
      else if(a==='busqueda'){ demora=600; cuerpo={ok:true,deudas:[{n:'Prov A',total:1500,semanas:[{sem:lun?'41':'38',pendiente:1500}]}]}; }
      else if(a==='stockTab'){ demora=400; cuerpo={ok:true,ts:1,stockDeps:[],stock:[{a:'PPM',n:'Pack',u:'u',f:2,co:1000,iv:2000,pd:{}}]}; }
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},demora);});
    }
    return o.apply(this,arguments); }; })();`;

const T = sel => `((document.querySelector(${JSON.stringify(sel)})||{}).textContent||'').replace(/\\s+/g,' ').trim()`;
const listo = `(function(){var s=document.getElementById('hSnap');return !!(s&&s.querySelector('.snap-c')&&!/cargando/.test(s.textContent)&&document.querySelector('#hTend svg'));})()`;

async function viernes(cli) {
  console.log('\n-- viernes 2/10: hay entregas, algo sin cobrar y deuda vieja --');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?fase=viernes' });
  chk('Inicio termina de pintar', await esperar(cli, listo, 60000));
  await pausa(2500);

  /* ── el orden ── */
  const ord = await ev(cli, `JSON.stringify(['heroBox','hAlerts','hRetail','hSnap','hCaja'].map(function(i){var e=document.getElementById(i);return e?Math.round(e.getBoundingClientRect().top+window.scrollY):-1;}))`);
  const o = JSON.parse(typeof ord === 'string' ? ord : '[]');
  console.log('     alturas hero/avisos/retail/cuadritos/caja: ' + ord);
  chk('HOY esta arriba de Total Maleu', o[0] >= 0 && o[0] < o[2], o);
  chk('y los avisos tambien, pegados a HOY', o[1] > o[0] && o[1] < o[2], o);

  /* ── el aviso de cobranza ── */
  const av = await ev(cli, T('#hAlerts .hoy-av-f'));
  console.log('     aviso: ' + JSON.stringify(av));
  chk('el aviso dice cuantos y cuanta plata: 1 entregado sin cobrar · $50.000', /1 entregado sin cobrar/.test(av) && /\$50\.000/.test(av), av);
  chk('los nombres arrancan plegados', (await ev(cli, `(function(){var b=document.getElementById('hoyQuienesBox');return !!b&&b.classList.contains('hidden');})()`)) === true);
  await ev(cli, `document.querySelector('#hAlerts .hoy-av-q').click();1`);
  chk('"ver quiénes" los abre y dice el nombre', (await ev(cli, `(function(){var b=document.getElementById('hoyQuienesBox');return !!b&&!b.classList.contains('hidden')&&/Beto Prueba/.test(b.textContent);})()`)) === true);
  await ev(cli, `document.querySelector('#hAlerts .hoy-av-f').click();1`);
  chk('tocar el aviso lleva a Ventas > COBROS', await esperar(cli, `cur==='ventas'&&((document.querySelector('#p-ventas .v-tab.on')||{}).dataset||{}).vt==='cobros'`, 6000), await ev(cli, `cur+'/'+(((document.querySelector('#p-ventas .v-tab.on')||{}).dataset||{}).vt)`));
  await ev(cli, `go('inicio');1`); await pausa(900);

  /* ── la deuda vieja ── */
  const de = await ev(cli, T('#hDeudaAviso'));
  console.log('     deuda: ' + JSON.stringify(de));
  chk('el aviso de la deuda dice desde cuando y cuanto ($1.500, semana del 14/9)', /Deuda con proveedores/.test(de) && /semana del 14\/9/.test(de) && /\$1\.500/.test(de), de);
  await ev(cli, `document.querySelector('#hDeudaAviso .hoy-av-f').click();1`);
  chk('tocarlo lleva a Abastecimiento', await esperar(cli, `cur==='busqueda'`, 6000), await ev(cli, 'cur'));
  await ev(cli, `go('inicio');1`); await pausa(900);

  /* ── los cuadritos ── */
  const cu = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#hSnap .snap-c'),function(c){return ((c.querySelector('.snap-l')||{}).textContent||'').trim()+'|'+(c.getAttribute('onclick')||'');}))`);
  console.log('     cuadritos: ' + cu);
  const cus = JSON.parse(typeof cu === 'string' ? cu : '[]');
  chk('son 5 cuadritos, sin Facturado mes ni Margen mes', cus.length === 5 && !cus.some(x => /^(Facturado|Margen) mes/i.test(x)), cus);
  chk('A cobrar se toca y va a COBROS', cus.some(x => /^A cobrar\|irACobros\(\)$/.test(x)), cus);
  chk('Deuda proveedores se toca y va a Pagos', cus.some(x => /^Deuda proveedores\|_gProvIrAbast\(\)$/.test(x)), cus);
  chk('la tarjeta de la semana ya no repite "por cobrar"', !/por cobrar/i.test(await ev(cli, T('#hCaja'))) && (await ev(cli, `document.querySelectorAll('#hCaja .card').length`)) >= 2, await ev(cli, T('#hCaja')));

  /* ── el objetivo ── */
  const ob = await ev(cli, T('#hRetail .mt-obj'));
  console.log('     objetivo: ' + JSON.stringify(ob));
  chk('Total Maleu dice el objetivo del mes ($1.000.000)', /Objetivo de octubre \$1\.000\.000/.test(ob), ob);
  chk('y el ritmo con los dias CERRADOS: el jueves 1 se entregaron $100.000 = 10%', /ibas en 10%/.test(ob) && /tocaba \d+%/.test(ob), ob);

  /* ── semanas anteriores ── */
  const se = await ev(cli, `JSON.stringify({vista:document.querySelectorAll('#sem-body-prev > .card').length,mas:document.querySelectorAll('#sem-body-mas > .card').length,oculto:!!document.querySelector('#sem-body-mas.hidden'),btn:((document.querySelector('#sem-body-prev .sem-mas')||{}).textContent||'').trim()})`);
  console.log('     semanas anteriores: ' + se);
  chk('se ven 4 semanas y las otras 2 quedan a un toque', se === '{"vista":4,"mas":2,"oculto":true,"btn":"Ver las 2 semanas anteriores"}', se);
  await ev(cli, `document.querySelector('#sem-body-prev .sem-mas').click();1`);
  chk('el toque las muestra y saca el boton', (await ev(cli, `!document.querySelector('#sem-body-mas.hidden')&&!document.querySelector('#sem-body-prev .sem-mas')&&document.querySelectorAll('#sem-body-mas > .card').length===2`)) === true);

  /* ── el grafico ── */
  const gr = await ev(cli, `JSON.stringify({txt:[].map.call(document.querySelectorAll('#hTend svg text'),function(t){return t.textContent;}).join(' '),comp:${T('#hTend .tend-comp')}})`);
  console.log('     grafico: ' + String(gr).slice(0, 300));
  const g = JSON.parse(typeof gr === 'string' ? gr : '{}');
  chk('septiembre suma su catering: 160.000 + 300.000 = 460k (el servidor mandaba 160k)', /460k/.test(g.txt || '') && !/160k/.test(g.txt || ''), g.txt);
  chk('los meses sin catering quedan como los mandó el servidor (agosto 80k, octubre 150k)', /80k/.test(g.txt || '') && /150k/.test(g.txt || ''), g.txt);
  chk('la comparacion ya no repite el Facturado (esta en Total Maleu)', /Pedidos/.test(g.comp || '') && !/Facturado/.test(g.comp || ''), g.comp);

  const errs = await ev(cli, 'JSON.stringify(window.__err||[])');
  chk('sin errores en consola', errs === '[]', errs);
}

async function lunes(cli) {
  console.log('\n-- lunes 5/10: la semana todavia no tiene entregas --');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?fase=lunes' });
  chk('Inicio termina de pintar', await esperar(cli, listo, 60000));
  await pausa(2500);
  await ev(cli, `rtPer('sem');1`); await pausa(500);
  const va = await ev(cli, `JSON.stringify({vacio:${T('#hRetail .rt-vacio')},carg:${T('#hRetail .rt-carg')},kpis:document.querySelectorAll('#hRetail .rt-kpis').length})`);
  console.log('     esta semana: ' + va);
  const v = JSON.parse(typeof va === 'string' ? va : '{}');
  chk('"Esta semana" dice que todavia no hay entregas', /Todavía no hay entregas/.test(v.vacio || '') && v.kpis === 0, v);
  chk('y muestra lo cargado: 1 pedido · $99.000', /Cargado para entregar · 1 pedido · \$99\.000/.test(v.carg || ''), v.carg);
  chk('con su dia: mar 6/10', /mar 6\/10 · 1 pedido/.test(v.carg || ''), v.carg);

  const sa = await ev(cli, `JSON.stringify({cards:document.querySelectorAll('#sem-body-actual > .card').length,txt:${T('#sem-body-actual')}})`);
  console.log('     semana actual: ' + String(sa).slice(0, 330));
  const s = JSON.parse(typeof sa === 'string' ? sa : '{}');
  chk('la semana actual dibuja solo hoy y el martes (que tiene un pedido): 2 tarjetas, no 7', s.cards === 2 && /Lun 05\/10/.test(s.txt || '') && /Mar 06\/10/.test(s.txt || ''), s);
  chk('y dice que los otros 5 dias no tienen nada', /Los otros 5 días de la semana no tienen/.test(s.txt || ''), s.txt);

  chk('sin meta cargada, Total Maleu no dibuja el objetivo', (await ev(cli, `document.querySelectorAll('#hRetail .mt-obj').length`)) === 0);
  chk('con toda la deuda de esta semana no hay aviso arriba (todavia no vencio)', (await ev(cli, T('#hDeudaAviso'))) === '' && /toda de esta semana/.test(await ev(cli, T('#hSnap'))), await ev(cli, T('#hDeudaAviso')));
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
    console.log('\n== Inicio: primero lo que hay que hacer · ' + ANCHO + 'px · ' + APP + ' ==');
    await viernes(cli);
    await lunes(cli);
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(2); }
})();
