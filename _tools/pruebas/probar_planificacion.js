/* La tab Planificacion (14/9/2026).

   node probar_planificacion.js [390|1440]
   APP=app_viejo_tmp.html node probar_planificacion.js 1440    ← la direccion contraria

   Backend STUBBEADO con datos inventados (repo publico) y el reloj en el lunes
   14/9/2026 15:00. No hace falta token.

   Sostiene:
   · desde septiembre 2026 la meta "Venta Directa | Estancias del Pilar" es la de
     TODO el retail: el hero y la tarjeta la comparan contra Home + Pilar, y los
     barrios son su detalle. Hasta ese dia el hero decia 63% (solo Home) y la
     tarjeta 58% (solo el barrio) con el retail al 89%. En julio sigue siendo la
     meta del barrio;
   · la semana cuenta lo ENTREGADO el dia que se entrego (como Ventas retail y el
     PDF), no el dia elegido;
   · un tramo con meta 0 no corre a los demas un lugar;
   · "Metas del mes" carga plata, pedidos y casas de cada semana desde el ERP, con
     lo vendido en las semanas que ya arrancaron, y manda las curvas en el POST;
     guardar la meta de Clubes NO manda curvas (el backend conserva las que haya);
   · las casas acumuladas no pueden bajar;
   · el origen "cruce" ya no dice que lo deduce una casilla que no existe;
   · con la tab abierta, `planMes` sale de la cola antes que la caja y las OCs. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 700) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(250); }
  return false;
};
const txt = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent.replace(/\\s+/g,' ').trim():null;})()`;

let n = 700;
const dm = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const H = o => Object.assign({ n: String(n++), h: 'Home', es: 'Entregado', de: 'Viernes', o: 'Deposito', ep: 'Cobrado', fp: 'Efectivo', co: 0, p: [{ a: 'PPM', q: 1 }], bar: 'Estancias del Pilar' },
  o, { dee: o.dee || o.fex, mc: String(o.fex || o.dee).slice(0, 7), f: dm(o.fex || o.dee) });
const PEDIDOS = [
  H({ c: 'Ana Prueba', fex: '2026-09-03', $: 100000 }),                                   // tramo 1-6
  H({ c: 'Beto Prueba', fex: '2026-09-09', $: 70000 }),                                   // tramo 7-13
  H({ h: 'Pilar', c: 'Caro Prueba', bar: 'Pilara', fex: '2026-09-10', $: 40000 }),       // tramo 7-13
  // Elegido el domingo 13 y entregado el lunes 14: es venta de la semana 14-20.
  H({ c: 'Dani Prueba', dee: '2026-09-13', fex: '2026-09-14', $: 50000 }),
  H({ c: 'Eli Prueba', es: 'Pendiente', fex: '', dee: '2026-09-18', $: 30000 })           // comprometido 14-20
];
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [], light: true, saludSem: {}, saludMes: {}, ventasExtra: [] };
const RETAIL = 'Venta Directa|Estancias del Pilar';
const REAL = r => ({ fact: r[0], pedidos: r[1], pend: r[2] || 0, pendPedidos: r[3] || 0, clientesUnicos: r[1] });
const PLAN_SEP = { ok: true, mes: 'Septiembre 2026', yyyy: 2026, mm: 9, diasMes: 30, diasTrans: 14,
  metas: {
    [RETAIL]: { canal: 'Venta Directa', barrio: 'Estancias del Pilar', metaFact: 2000000, metaPedidos: 40, metaTicket: 50000, metaClientes: 0, metaCasas: 20,
      semanales: '4,8,12,16,20', semanalesM: '0,400000,600000,600000,400000', semanalesP: '0,10,10,12,8', notas: 'nota de prueba' },
    'Clubes|': { canal: 'Clubes', barrio: '', metaFact: 500000, metaPedidos: 5, metaTicket: 100000, metaClientes: 4, metaCasas: 0, semanales: '', semanalesM: '', semanalesP: '', notas: '' }
  },
  real: {
    '__hoja:Home|Estancias del Pilar': REAL([220000, 3, 30000, 1]), 'Venta Directa|Estancias del Pilar': REAL([220000, 3, 30000, 1]),
    '__hoja:Home|Pilara': REAL([15000, 1]), 'Venta Directa|Pilara': REAL([15000, 1]),
    '__hoja:Pilar|': REAL([40000, 1]), 'Venta Directa|': REAL([40000, 1]),
    'Clubes|': REAL([300000, 2]), 'Red|': REAL([83000, 1]), 'B2B|': REAL([192000, 1])
  },
  acciones: [{ id: 'A-001', mes: 'Septiembre 2026', canal: 'Venta Directa', barrio: 'Estancias del Pilar', desc: 'Campaña de prueba', responsable: 'Tadeo', fechaObjetivo: '06/09/2026', estado: 'Pendiente', impactoEstimado: 100000, impactoReal: 0, casasObjetivo: 5, nivelImpacto: 'Realista', notas: '' }],
  origen: [{ fecha: '05/09/2026', cliente: 'Casa Prueba', sub: 'Golf', lote: '12', quePaso: 'Casa nueva', origen: 'Cruce Diagonal', notas: '' }],
  barriosHome: ['Estancias del Pilar', 'Los Alcanfores', 'Estancias del Río', 'Pilara'], canalesPrincipales: ['Venta Directa', 'Clubes', 'Red', 'Catering', 'B2B'] };
const PLAN_JUL = { ok: true, mes: 'Julio 2026', yyyy: 2026, mm: 7, diasMes: 31, diasTrans: 31,
  metas: { [RETAIL]: { canal: 'Venta Directa', barrio: 'Estancias del Pilar', metaFact: 9000000, metaPedidos: 150, metaTicket: 60000, metaClientes: 0, metaCasas: 0, semanales: '', semanalesM: '', semanalesP: '', notas: 'meta del barrio' } },
  real: { '__hoja:Home|Estancias del Pilar': REAL([5000000, 80]), 'Venta Directa|Estancias del Pilar': REAL([5000000, 80]), '__hoja:Pilar|': REAL([700000, 6]), 'Venta Directa|': REAL([700000, 6]) },
  acciones: [], origen: [], barriosHome: PLAN_SEP.barriosHome, canalesPrincipales: PLAN_SEP.canalesPrincipales };

const RELOJ = `(function(){var AH=new Date(2026,8,14,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__posts=[]; window.__err=[]; window.__toasts=[];
  var __demora=Number((location.search.match(/demora=(\\d+)/)||[])[1]||150);
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  if(window.top===window){ try{
    localStorage.setItem('maleu_tab', (location.search.match(/tab=(\\w+)/)||[])[1]||'inicio');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('maleu_plan_cache_')===0||k.indexOf('mc_')===0) localStorage.removeItem(k); });
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST'){ try{ window.__posts.push(JSON.parse(x.body)); }catch(e){ window.__posts.push({crudo:String(x.body)}); }
        return Promise.resolve(new Response('{"ok":true}',{status:200})); }
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='planMes') cuerpo=(/mes=Julio/.test(decodeURIComponent(url))) ? ${JSON.stringify(PLAN_JUL)} : ${JSON.stringify(PLAN_SEP)};
      else if(a==='catalogo') cuerpo={ok:true,productos:{Prueba:[{a:'PPM',n:'Pack Muzzarella',cat:'Pack Pizzas x2',u:'u',dem:1}]}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},__demora);});
    }
    return o.apply(this,arguments); }; })();`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    console.log('\n== Planificacion · ' + ANCHO + 'px · ' + APP + ' ==');

    /* ── la cola: con la tab abierta y todo lento, planMes va primero ── */
    console.log('\n-- la cola --');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?tab=planificacion&demora=2500' });
    await esperar(cli, `Array.isArray(window.__gets) && window.__gets.indexOf('planMes')>=0`, 60000);
    await pausa(1500);
    const orden = await ev(cli, 'JSON.stringify(window.__gets)');
    const O = JSON.parse(typeof orden === 'string' ? orden : '[]');
    /* Los dos primeros cupos salen al arrancar, antes de que la tab pida nada: la decision
       que importa es que planMes pase adelante de lo que la tab no dibuja. */
    chk('con la tab abierta, planMes sale antes que la caja y las OCs (que la tab no dibuja)', O.indexOf('planMes') >= 0 && (O.indexOf('cajaLight') < 0 || O.indexOf('planMes') < O.indexOf('cajaLight')) && (O.indexOf('ocLight') < 0 || O.indexOf('planMes') < O.indexOf('ocLight')), O);

    /* ── septiembre ── */
    console.log('\n-- septiembre: la meta del retail --');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?tab=inicio' });
    if (!await esperar(cli, `typeof go==='function' && window.D && D.pedidos && D.pedidos.length===${PEDIDOS.length}`, 90000)) throw new Error('el ERP no cargo los pedidos stubbeados');
    await ev(cli, `window.__toasts=[];var _t=window.toast;window.toast=function(m){window.__toasts.push(String(m));return _t.apply(this,arguments);};go('planificacion')`);
    if (!await esperar(cli, `!!document.querySelector('#planResumen .plan-kpi') && !!document.querySelector('#planObjetivo .plan-sm-g')`, 30000)) throw new Error('la tab no pinto');
    const hero = await ev(cli, txt('#planResumen .plan-progress-row'));
    chk('el hero compara la meta del retail contra Home + Pilar: $275.000 / $2.000.000 (14%)', /Retail · Home \+ Pilar/.test(hero || '') && /\$275\.000 \/ \$2\.000\.000 \(14%\)/.test(hero || ''), hero);
    const kpis = await ev(cli, txt('#planResumen .plan-resumen-grid'));
    chk('los KPIs dicen retail, con tildes', /Retail entregado\s*\$275\.000/.test(kpis || '') && /Meta retail/.test(kpis || '') && /Proyección retail/.test(kpis || '') && /Días restantes/.test(kpis || ''), kpis);
    const tarjetas = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#planCanales .plan-canal-card'),function(c){return c.textContent.replace(/\\s+/g,' ').trim().slice(0,160);}))`);
    const T = JSON.parse(typeof tarjetas === 'string' ? tarjetas : '[]');
    chk('la primera tarjeta es el Retail: real $275.000 contra la meta de $2.000.000', !!T[0] && /^Retail/.test(T[0]) && /Real\s*\$275\.000/.test(T[0]) && /Meta\s*\$2\.000\.000/.test(T[0]), T[0]);
    const tEst = T.find(x => /^Home\s*Estancias del Pilar/.test(x));
    chk('Estancias del Pilar es detalle del retail: su real, sin la meta de todo', !!tEst && /parte del retail/.test(tEst) && !/2\.000\.000/.test(tEst), tEst);
    chk('el boton "Metas del mes" se ve', await ev(cli, `(function(){var b=document.getElementById('planBtnMetas');return !!b&&!b.hidden&&b.getBoundingClientRect().height>0;})()`) === true);

    console.log('\n-- la semana --');
    const sem = await ev(cli, txt('#planObjetivo .plan-sm-g'));
    chk('la semana 14-20 cuenta lo que se ENTREGO el lunes 14 (elegido el domingo): $50.000 de $600.000', /Facturado\s*\$50\.000 de \$600\.000/.test(sem || ''), sem);
    const tira = await ev(cli, txt('#planObjetivo .plan-tira'));
    chk('la tira: 1-6 sin meta muestra la plata, 7-13 al 28% y 14-20 al 8% (un 0 no corre los tramos)', /1-6\s*\$100\.000/.test(tira || '') && /7-13\s*28%/.test(tira || '') && /14-20\s*8%/.test(tira || ''), tira);

    console.log('\n-- el origen --');
    const org = await ev(cli, txt('#planOrigen .plan-org'));
    chk('el cruce se llama "Cruce con la carne" y cuenta la fila anotada como Diagonal', /Cruce con la carne\s*1/.test(org || '') && !/Diagonal/.test(org || ''), org);
    const src = await ev(cli, `document.documentElement.innerHTML.indexOf('lo deduce solo de la casilla')<0 && document.documentElement.innerHTML.indexOf('Esta lo deduce el ERP de la casilla')<0`);
    chk('ningun texto promete deducir el cruce de la casilla dada de baja', src === true, src);

    console.log('\n-- metas del mes --');
    await ev(cli, `planEditarMetasMes()`);
    await esperar(cli, `document.querySelectorAll('#planMetaBody .plan-tramo').length>0`, 5000);
    const nT = await ev(cli, `document.querySelectorAll('#planMetaBody .plan-tramo').length`);
    chk('el editor trae un recuadro por semana del mes (5)', nT === 5, nT);
    const pre = await ev(cli, `JSON.stringify({m0:el0('tM0'),m1:el0('tM1'),p4:el0('tP4'),c4:el0('tC4'),casas:el0('metaCasas')});function el0(i){var e=document.getElementById(i);return e?e.value:null;}`);
    chk('con lo cargado en su lugar y la plata con puntos: semana 1 vacia, semana 2 400.000, semana 5 8 pedidos y 20 casas', pre === JSON.stringify({ m0: '', m1: '400.000', p4: '8', c4: '20', casas: '20' }), pre);
    const r2 = await ev(cli, txt('#planMetaBody .plan-tramo[data-tramo="1"] .plan-tramo-r'));
    chk('la semana cerrada dice lo que se vendio: $110.000 en 2 pedidos', /Vendido:\s*\$110\.000 · 2 ped/.test(r2 || ''), r2);
    await ev(cli, `planTramosCerradosReal(); planTramosUsarSuma();`);
    const post0 = await ev(cli, `JSON.stringify({m0:document.getElementById('tM0').value,m1:document.getElementById('tM1').value,fact:document.getElementById('metaFact').value,ped:document.getElementById('metaPed').value,suma:document.getElementById('planTramosSuma').textContent})`);
    const Q = JSON.parse(typeof post0 === 'string' ? post0 : '{}');
    chk('"las semanas cerradas = lo vendido" y "usar la suma": 1.810.000 y 33 pedidos, y coincide', Q.m0 === '100.000' && Q.m1 === '110.000' && Q.fact === '1.810.000' && Q.ped === '33' && /coincide/.test(Q.suma || ''), Q);
    /* casas que bajan: no se guarda */
    await ev(cli, `window.__posts=[];document.getElementById('tC2').value='3';_planTramosSumaSafe();planGuardarMeta('Venta Directa','Estancias del Pilar')`);
    await pausa(400);
    const bajo = await ev(cli, `JSON.stringify({posts:window.__posts.length,toast:window.__toasts.slice(-1)[0]||'',aviso:document.getElementById('planTramosSuma').className})`);
    chk('si las casas acumuladas bajan, avisa y no guarda', /"posts":0/.test(bajo) && /acumuladas/.test(bajo) && /mal/.test(bajo), bajo);
    await ev(cli, `document.getElementById('tC2').value='12';window.__posts=[];planGuardarMeta('Venta Directa','Estancias del Pilar')`);
    await esperar(cli, `window.__posts.length>0`, 5000);
    const body = await ev(cli, `JSON.stringify(window.__posts[0]||null)`);
    const B = JSON.parse(typeof body === 'string' ? body : 'null') || {};
    chk('el POST lleva las tres curvas por posicion y la meta de casas',
      B.action === 'planMetaSet' && B.semanalesM === '100000,110000,600000,600000,400000' && B.semanalesP === '1,2,10,12,8' && B.semanales === '4,8,12,16,20' && B.metaCasas === 20 && B.metaFact === 1810000 && B.metaPedidos === 33, B);
    await ev(cli, `planEditarMeta('Clubes','','Clubes')`);
    await pausa(300);
    await ev(cli, `window.__posts=[];planGuardarMeta('Clubes','')`);
    await esperar(cli, `window.__posts.length>0`, 5000);
    const bc = await ev(cli, `JSON.stringify(window.__posts[0]||null)`);
    const BC = JSON.parse(typeof bc === 'string' ? bc : 'null') || {};
    chk('la meta de Clubes NO manda curvas (el backend conserva lo que haya)', BC.action === 'planMetaSet' && BC.canal === 'Clubes' && !('semanalesM' in BC) && !('metaCasas' in BC) && BC.metaFact === 500000, BC);
    await ev(cli, `planCerrarMeta()`);

    if (ANCHO <= 560) {
      await ev(cli, `planEditarMetasMes()`);
      await pausa(500);
      const med = await ev(cli, `(function(){var d=document.getElementById('planMetaDrawer');var b=document.getElementById('planMetaBody');var chicos=[].map.call(d.querySelectorAll('button,input'),function(x){var r=x.getBoundingClientRect();return (r.height>0&&r.height<38)?(x.id||x.textContent.trim().slice(0,12))+' '+Math.round(r.height):null;}).filter(Boolean);return JSON.stringify({desborde:b.scrollWidth-b.clientWidth,chicos:chicos});})()`);
      chk('en el celular el editor no desborda y ningun control baja de 38px', /"desborde":0/.test(med) && /"chicos":\[\]/.test(med), med);
      await ev(cli, `planCerrarMeta()`);
    }

    console.log('\n-- julio: la meta era del barrio --');
    await ev(cli, `document.getElementById('planMesSel').value='Julio 2026';planLoad()`);
    await esperar(cli, `/Julio/.test((document.querySelector('#planMetaTitle')||{}).textContent||'') || /\\$5\\.000\\.000/.test((document.querySelector('#planResumen')||{}).textContent||'')`, 20000);
    await pausa(500);
    const heroJ = await ev(cli, txt('#planResumen .plan-progress-row'));
    chk('en julio el hero sigue siendo "Retail Home" contra la meta del barrio', /Retail Home/.test(heroJ || '') && /\$5\.000\.000 \/ \$9\.000\.000/.test(heroJ || ''), heroJ);
    chk('y el boton "Metas del mes" no esta (julio no tiene tramos)', await ev(cli, `document.getElementById('planBtnMetas') ? document.getElementById('planBtnMetas').hidden===true : false`) === true);

    const errs = await ev(cli, 'JSON.stringify(Array.isArray(window.__err)?window.__err:["NO HAY __err"])');
    chk('sin errores de JS', errs === '[]', errs);
  } catch (e) { console.log('se corto: ' + e.message); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
