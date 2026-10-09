/* Inicio > EERR > Economico, rehecho el 8/10/2026.

   node probar_eerr_economico.js [390|1440]
   APP=app_viejo_tmp.html node probar_eerr_economico.js 1440   ← la direccion contraria

   Backend STUBBEADO con datos inventados (repo publico) y el reloj congelado en el
   jueves 8/10/2026 20:00. No hace falta token.

   Sostiene:
   · el mes EN CURSO carga los fijos por los dias que pasaron (8/31), no el mes
     entero: sueldos, alquiler, desgaste, monotributo; planes y nafta, lo pagado o
     lo del mes anterior por esos dias;
   · un mes CERRADO no cambia un peso (septiembre, la cuenta a mano);
   · la pantalla y `eerrKpisMes` (Objetivo, tendencia, Lectura) dan lo mismo;
   · devolver un cobro de mas no es un gasto;
   · la cuenta del sueldo no da por adeudado el mes que no cerro;
   · un mes que no empezo no muestra una perdida y la flecha no avanza;
   · la tabla arranca plegada (8 renglones), cada grupo abre con un toque de
     verdad y los hijos suman al grupo;
   · hay comparacion contra el mes anterior, margen por canal y dos graficos de
     linea con el valor escrito;
   · a 390 nada se sale de la pantalla (el boton Financiero se salia 37px) y los
     renglones que se tocan llegan al piso tactil. */
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
const cerca = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1;

/* ── Datos inventados ─────────────────────────────────────────────────────── */
const V = (mes, canal, zona, $, costo) => ({ mes: mes, anio: 2026, mc: '2026-' + (mes === 'Octubre' ? '10' : (mes === 'Septiembre' ? '09' : '08')), canal: canal, zona: zona, $: $, costo: costo, fecha: '05/' + (mes === 'Octubre' ? '10' : (mes === 'Septiembre' ? '09' : '08')) + '/2026' });
const VENTAS = [
  V('Agosto', 'Venta Directa', 'Estancias del Pilar', 8000000, 6000000),
  V('Septiembre', 'Venta Directa', 'Estancias del Pilar', 6000000, 4200000),
  V('Septiembre', 'Venta Directa', 'Pilar', 2000000, 1500000),
  V('Septiembre', 'Red', '', 1000000, 800000),
  V('Septiembre', 'Clubes', '', 1000000, 700000),
  V('Octubre', 'Venta Directa', 'Estancias del Pilar', 2000000, 1400000),
  V('Octubre', 'Clubes', '', 1000000, 800000)
];
let n = 900;
const P = (dee, h) => ({ n: String(n++), h: h, es: 'Entregado', c: 'Cliente Prueba', dee: dee, mc: dee.slice(0, 7), f: dee.slice(8, 10) + '/' + dee.slice(5, 7), fe: dee.slice(8, 10) + '/' + dee.slice(5, 7), $: 10000, co: 7000, ep: 'Cobrado', fp: 'Efectivo', p: [{ a: 'PPM', q: 1 }], r: n });
const PEDIDOS = [];
for (let i = 0; i < 10; i++) PEDIDOS.push(P('2026-09-1' + i, i < 7 ? 'Home' : 'Pilar'));   // 10 bolsas en septiembre
for (let i = 0; i < 4; i++) PEDIDOS.push(P('2026-10-0' + (i + 2), 'Home'));                   // 4 en octubre
const G = (f, mes, cat, con, $, not) => ({ f: f, fFull: f + ' 10:00', ts: 1, mes: mes, anio: 2026, cat: cat, con: con, met: 'Mercado Pago', $: $, not: not || '' });
const GASTOS = [
  G('03/09/2026', 'Septiembre', 'Herramienta', 'Claude · Mensual', 310000),
  G('10/09/2026', 'Septiembre', 'Nafta', 'Shell', 155000),
  G('12/09/2026', 'Septiembre', 'Repartidor', 'Repartidor Prueba', 50000),
  G('15/09/2026', 'Septiembre', 'Herramienta', 'WATI · Créditos', 100000),
  G('20/09/2026', 'Septiembre', 'Sueldo', 'Uno Prueba', 1000000),
  G('21/09/2026', 'Septiembre', 'Sueldo', 'Dos Prueba', 1200000),
  G('22/09/2026', 'Septiembre', 'Proveedor', 'Pago a Proveedor Prueba', 3000000),
  G('02/10/2026', 'Octubre', 'Otro', 'Devolvi a Club Prueba', 44000, 'Me pagaron de más y le devolví el restante'),
  G('02/10/2026', 'Octubre', 'Sueldo', 'Uno Prueba', 200000),
  G('04/10/2026', 'Octubre', 'Herramienta', 'WATI · Créditos', 62000),
  G('05/10/2026', 'Octubre', 'Otro', 'Libreria', 10000)
];
const PROV = [
  { concepto: 'Sueldo Uno', cat: 'sueldo', monto: 1200000, desde: '2026-09', hasta: null },
  { concepto: 'Sueldo Dos', cat: 'sueldo', monto: 1200000, desde: '2026-09', hasta: null },
  { concepto: 'Ocupación imputada', cat: 'ocupacion', monto: 62000, desde: '2026-01', hasta: null },
  { concepto: 'Amortización freezers', cat: 'amortizacion', monto: 31000, desde: '2026-01', hasta: null },
  { concepto: 'Monotributo', cat: 'impuesto_monotributo', monto: 46500, desde: '2026-01', hasta: null }];
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [], light: true, saludSem: {}, saludSemM: {}, saludMes: {}, ventasExtra: [] };
const CAJA = { ts: 1, caja: {}, saldoBase: {}, movimientos: [], efMano: [], gastos: GASTOS, ingresos: [], provisiones: PROV,
  config: [{ param: 'COSTO_PACKAGING_PEDIDO', valor: 1000, desde: '2026-01' }] };

/* Lo esperado, a mano. Octubre al dia 8 de 31. */
const FR = 8 / 31;
const ESP = {
  sep: { ventas: 10000000, mb: 2800000, vars: 50000 + 10 * 1000 + 100000, estr: 310000 + 155000 + 62000 + 2400000, amort: 31000, imp: 46500 },
  oct: { ventas: 3000000, mb: 800000, vars: 4 * 1000 + 62000,
    estr: 2400000 * FR + 62000 * FR + 310000 * FR + 155000 * FR + 10000, amort: 31000 * FR, imp: 46500 * FR }
};
ESP.sep.res = ESP.sep.mb - ESP.sep.vars - ESP.sep.estr - ESP.sep.amort - ESP.sep.imp;
ESP.oct.res = ESP.oct.mb - ESP.oct.vars - ESP.oct.estr - ESP.oct.amort - ESP.oct.imp;

const RELOJ = `(function(){var AH=new Date(2026,9,8,20,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__err=[];
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_eerr_modo','economico'); localStorage.removeItem('ma3'); }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo=${JSON.stringify(CAJA)};
      else if(a==='ventas') cuerpo={ok:true,v:${JSON.stringify(VENTAS)}};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='tendencia') cuerpo={ok:true,meses:[],base:{total:1}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},120);});
    }
    return o.apply(this,arguments); }; })();`;

/* Lee la tabla tal como se ve: renglon → {txt, monto} */
const LEER = `(function(){
  function num(s){var m=String(s).trim().split('\\n')[0].replace(/\\s/g,'').match(/^(-?)\\$([\\d.]+)/);return m?(m[1]?-1:1)*Number(m[2].replace(/\\./g,'')):null;}
  var b=document.getElementById('eerrBody');
  var filas=[].slice.call(b.querySelectorAll('.eerr-tblw tbody tr')).map(function(tr){var c=tr.children;return {cls:tr.className,eg:tr.getAttribute('data-eg'),txt:(c[0]?c[0].innerText:'').replace(/[▸▾]/g,'').replace(/\\s+/g,' ').trim(),monto:c[1]?num(c[1].innerText):null,ant:c[2]?num(c[2].innerText):null,alto:Math.round(tr.getBoundingClientRect().height)};});
  return {filas:filas,txt:b.innerText,vw:document.documentElement.clientWidth};
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    console.log('\n== EERR economico · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    if (!await esperar(cli, `typeof go==='function' && window.D && D.pedidos && D.pedidos.length===${PEDIDOS.length} && Array.isArray(D.gastos)`, 90000)) throw new Error('el ERP no cargo los datos stubbeados');
    await ev(cli, `document.querySelector('#p-inicio .ist[data-st="eerr"]').click()`);
    if (!await esperar(cli, `!!window.VD && document.getElementById('eerrBody').innerText.length>200`, 60000)) throw new Error('el EERR no pinto');
    await pausa(400);

    /* ── 1 · octubre, el mes en curso ── */
    console.log('\n-- octubre (en curso, dia 8 de 31) --');
    const k10 = await ev(cli, `eerrKpisMes(10,2026)`);
    chk('KPIs: ventas de octubre', cerca(k10.totFact, ESP.oct.ventas), k10);
    chk('KPIs: los fijos van por 8/31, no el mes entero', cerca(k10.totEstr, ESP.oct.estr), { da: k10.totEstr, espero: ESP.oct.estr });
    chk('KPIs: resultado de octubre por dias', cerca(k10.resNeto, ESP.oct.res), { da: k10.resNeto, espero: ESP.oct.res });
    let T = await ev(cli, LEER);
    const fila = (re) => (T.filas || []).filter(f => re.test(f.txt))[0] || {};
    chk('la tabla arranca plegada: 8 renglones', (T.filas || []).length === 8, (T.filas || []).map(f => f.txt));
    chk('pantalla: resultado del mes = KPIs', cerca(fila(/^= Resultado del mes/).monto, Math.round(ESP.oct.res)), fila(/^= Resultado del mes/));
    chk('pantalla: gastos fijos = estructura + desgaste, por dias', cerca(fila(/^− Gastos fijos/).monto, -Math.round(ESP.oct.estr + ESP.oct.amort)), fila(/^− Gastos fijos/));
    chk('pantalla: impuestos por dias', cerca(fila(/^− Impuestos/).monto, -Math.round(ESP.oct.imp)), fila(/^− Impuestos/));
    chk('dice que el mes esta en curso y el dia', /día 8 de 31/.test(await ev(cli, `(document.getElementById('eerrEnCurso')||{}).textContent||''`)));
    chk('ya no manda a volver el mes que viene', !/primer lunes del mes siguiente/.test(T.txt));
    chk('la devolucion de un cobro de mas no esta en ningun renglon', !/Devolvi a Club/i.test(await ev(cli, `(function(){eerrTogTodo(true);var t=document.getElementById('eerrBody').innerText;eerrTogTodo(false);return t;})()`)));
    const lin = await ev(cli, `[_gastoLinea({cat:'Otro',con:'Devolvi a Club Prueba',not:'Me pagaron de más'}).tipo,_gastoLinea({cat:'Otro',con:'Libreria',not:''}).linea,_gastoLinea({cat:'Proveedor',con:'Devolucion parcial',not:''}).linea]`);
    chk('la regla: devolucion fuera; lo demas no se mueve', JSON.stringify(lin) === '["fuera","otros","proveedor"]', lin);

    /* el sueldo: abrir Gastos fijos con un toque de verdad y leer */
    const pt = await ev(cli, `(function(){var e=document.querySelector('#eerrBody tr[data-eg="fij"]');e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();var t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {x:r.left+r.width/2,y:r.top+r.height/2,h:Math.round(r.height),llega:!!t&&e.contains(t)};})()`);
    chk('el renglon Gastos fijos se puede tocar (nada encima) y mide >= 38', pt.llega === true && pt.h >= 38, pt);
    await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await pausa(300);
    T = await ev(cli, LEER);
    const hijos = (T.filas || []).filter(f => /^h\b/.test(f.cls));
    chk('con un click de verdad Gastos fijos se abre', hijos.length >= 5, (T.filas || []).map(f => f.cls + ' | ' + f.txt));
    const sumH = hijos.reduce((s, f) => s + (f.monto || 0), 0);
    chk('los renglones de adentro suman el grupo (±2 por redondeo)', Math.abs(sumH - fila(/^− Gastos fijos/).monto) <= 4, { sumH, grupo: fila(/^− Gastos fijos/).monto, hijos: hijos.map(f => [f.txt, f.monto]) });
    chk('sueldos: 2.400.000 × 8/31', cerca(fila(/^Sueldos/).monto, -Math.round(2400000 * FR)), fila(/^Sueldos/));
    chk('planes: estimado con septiembre por los dias', cerca(fila(/Planes mensuales/).monto, -Math.round(310000 * FR)), fila(/Planes mensuales/));
    const st = await ev(cli, `(document.getElementById('eerrSueldoTxt')||{}).innerText||''`);
    chk('el sueldo de octubre NO figura como deuda', !/le debe \$1\.200\.000/.test(st) && !/2\.400\.000 y se gir/.test(st), st);
    chk('Uno: lo de septiembre quedo pago con el giro de octubre', /Uno: lo que Maleu le debía de meses anteriores \(\$200\.000\) quedó pago · de octubre va girado \$0 de \$1\.200\.000/.test(st), st);
    chk('Dos: al dia hasta septiembre', /Dos: al día hasta septiembre · de octubre va girado \$0 de \$1\.200\.000/.test(st), st);
    await ev(cli, `eerrTogTodo(false)`);

    /* ── 2 · graficos, resumen, comparacion ── */
    const g = await ev(cli, `(function(){var s=document.querySelectorAll('#eerrGraf svg');return {n:s.length,lineas:s.length?s[0].querySelectorAll('line').length:0,punteado:s.length?s[0].querySelectorAll('line[stroke-dasharray="5 5"]').length:0,rect:document.querySelectorAll('#eerrGraf rect').length,txt:s.length?[].map.call(s[0].querySelectorAll('text'),function(t){return t.textContent;}):[],w:s.length?Math.round(s[0].getBoundingClientRect().width):0,h:s.length?Math.round(s[0].getBoundingClientRect().height):0};})()`);
    chk('dos graficos de linea (sin barras)', g.n === 2 && g.rect === 0, g);
    chk('el mes en curso va punteado', g.punteado === 1, g);
    chk('cada punto tiene su valor escrito', g.txt.indexOf('$10,0M') >= 0 && g.txt.indexOf('$3,00M') >= 0 && g.txt.indexOf('Oct') >= 0, g.txt);
    chk('el grafico ocupa su caja (no queda chiquito)', g.w >= (ANCHO <= 560 ? 300 : 340) && g.h >= 110, g);
    const tl = await ev(cli, `[].map.call(document.querySelectorAll('#eerrBody .eerr-t'),function(e){return e.innerText.replace(/\\s+/g,' ');})`);
    chk('cuatro numeros arriba, con septiembre al lado', tl.length === 4 && tl.every(t => /septiembre/.test(t)), tl);
    chk('punto de equilibrio en palabras', /Para no perder plata en octubre hay que vender/.test(await ev(cli, `(document.getElementById('eerrEquilibrio')||{}).innerText||''`)));
    chk('sin metas de EBITDA, glosario ni signos de pregunta', await ev(cli, `!/EBITDA|GLOSARIO|Aspiracional/i.test(document.getElementById('eerrBody').innerText) && document.querySelectorAll('#eerrBody .eerr-help-i').length===0`));

    /* ── 3 · septiembre, cerrado: la cuenta a mano ── */
    console.log('\n-- septiembre (cerrado) --');
    await ev(cli, `document.querySelector('.eerr-mes-btn').click()`); await pausa(300);
    const k9 = await ev(cli, `eerrKpisMes(9,2026)`);
    chk('KPIs de septiembre: estructura entera', cerca(k9.totEstr, ESP.sep.estr), { da: k9.totEstr, espero: ESP.sep.estr });
    chk('KPIs de septiembre: resultado', cerca(k9.resNeto, ESP.sep.res), { da: k9.resNeto, espero: ESP.sep.res });
    T = await ev(cli, LEER);
    chk('pantalla septiembre: resultado', cerca(fila(/^= Resultado del mes/).monto, ESP.sep.res), fila(/^= Resultado del mes/));
    chk('pantalla septiembre: margen bruto', cerca(fila(/^= Margen bruto/).monto, ESP.sep.mb), fila(/^= Margen bruto/));
    chk('no dice "en curso"', await ev(cli, `!document.getElementById('eerrEnCurso')`));
    if (ANCHO > 640) chk('columna del mes anterior (agosto) con su numero', cerca(fila(/^Ventas/).ant, 8000000), fila(/^Ventas/));
    await ev(cli, `document.querySelector('#eerrBody tr[data-eg="ven"]').click()`); await pausa(200);
    T = await ev(cli, LEER);
    const can = (T.filas || []).filter(f => /^h\b/.test(f.cls));
    chk('ventas abre por canal y suma el total', can.length === 4 && can.reduce((s, f) => s + f.monto, 0) === 10000000, can.map(f => [f.txt, f.monto]));
    chk('cada canal dice su margen', /margen 30,0%/.test(await ev(cli, `document.querySelector('#eerrBody tr.h').innerText`)), can[0]);
    await ev(cli, `document.querySelector('#eerrBody tr[data-eg="fij"]').click()`); await pausa(200);
    const st9 = await ev(cli, `(document.getElementById('eerrSueldoTxt')||{}).innerText||''`);
    chk('septiembre cerrado: Maleu le debe $200.000 a Uno', /Uno — cuenta del sueldo[^\n]*Maleu le debe \$200\.000/.test(st9), st9);
    await ev(cli, `eerrTogTodo(false)`);

    /* ── 4 · un mes que no empezo ── */
    console.log('\n-- noviembre --');
    await ev(cli, `eerrMov(1)`); await pausa(200);
    chk('volvio a octubre y la flecha de adelante esta apagada', await ev(cli, `document.querySelector('.eerr-mes-lbl').innerText==='Octubre 2026' && document.getElementById('eerrSig').disabled===true`));
    await ev(cli, `eerrMov(1)`); await pausa(200);
    chk('la flecha no pasa de hoy', await ev(cli, `document.querySelector('.eerr-mes-lbl').innerText`) === 'Octubre 2026');
    chk('noviembre, pedido a mano, no inventa una perdida', await ev(cli, `(function(){var k=eerrKpisMes(11,2026);return k.totEstr===0&&k.resNeto===0;})()`));
    chk('la cuenta del sueldo de un mes futuro no dice nada', await ev(cli, `_sueldoCuentasTxt(11,2026).length===0`));

    /* ── 5 · que nada se salga de la pantalla ── */
    await ev(cli, `eerrTogTodo(true)`); await pausa(300);
    const d = await ev(cli, `(function(){var vw=document.documentElement.clientWidth;
      var f=[].slice.call(document.querySelectorAll('#eerrTool *,#eerrBody *')).filter(function(e){var r=e.getBoundingClientRect();if(!r.width||e.closest('.eerr-6w'))return false;return r.right>vw+1||r.left<-1;}).map(function(e){return e.tagName+'.'+String(e.className).slice(0,30);});
      var b=[].map.call(document.querySelectorAll('#eerrTool button'),function(e){return Math.round(e.getBoundingClientRect().height);});
      var tr=[].map.call(document.querySelectorAll('#eerrBody tr.abre'),function(e){return Math.round(e.getBoundingClientRect().height);});
      return {vw:vw,scrollW:document.documentElement.scrollWidth,fuera:f.slice(0,6),nFuera:f.length,botones:b,minTr:Math.min.apply(null,tr),nTr:tr.length};})()`);
    chk('nada se sale de la pantalla (' + d.vw + 'px)', d.nFuera === 0 && d.scrollW <= d.vw, d);
    chk('los ' + d.nTr + ' renglones que se abren llegan a 38px', d.nTr >= 8 && d.minTr >= 38, d);
    const err = await ev(cli, 'window.__err');
    chk('sin errores en consola', Array.isArray(err) && err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL  la prueba se corto: ' + (e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
