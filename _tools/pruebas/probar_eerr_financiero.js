/* Inicio > EERR > Financiero, rehecho el 8/10/2026.

   node probar_eerr_financiero.js [390|1440]
   APP=app_viejo_tmp.html node probar_eerr_financiero.js 1440   ← la direccion contraria

   Backend STUBBEADO con datos inventados (repo publico) y el reloj congelado en el
   jueves 8/10/2026 20:00. No hace falta token.

   Sostiene:
   · HOY: la caja suma las inversiones (el mismo numero que la tab Caja) y "libre"
     es caja − proveedores − sueldos (lo trabajado por dias, se pagan del 1 al 5
     del mes siguiente) − planes del mes sin pagar; el piso; lo que te deben aparte;
   · el freezer al costo sale de `action=stockTab` (antes: "Stock al costo $0") y
     no entra en "libre";
   · la foto de hoy NO aparece en un mes cerrado;
   · entro / salio / quedo = `eerrFlujoMes`, y los rubros de "Salio" suman TODO lo
     que salio (faltaban las campañas); la devolucion tiene su renglon;
   · el mes en curso se compara por dia, no 8 dias contra 30;
   · el puente con el economico cierra renglon por renglon: la columna Resultado
     da `eerrKpisMes().resNeto` y la columna Caja da el flujo;
   · se fueron el programa quincenal, el ciclo de caja, el glosario y la jerga;
   · dos graficos de linea; a 390 nada se sale y los renglones se pueden tocar. */
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
const MM = { Agosto: '08', Septiembre: '09', Octubre: '10' };
const V = (mes, canal, zona, $, costo) => ({ mes: mes, anio: 2026, mc: '2026-' + MM[mes], canal: canal, zona: zona, $: $, costo: costo, fecha: '05/' + MM[mes] + '/2026' });
const VENTAS = [
  V('Septiembre', 'Venta Directa', 'Estancias del Pilar', 6000000, 4200000),
  V('Octubre', 'Venta Directa', 'Estancias del Pilar', 2000000, 1400000)
];
let n = 900;
const dm = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);
const P = (dee, h, $, extra) => Object.assign({ n: String(n++), h: h, es: 'Entregado', c: 'Cliente Prueba', dee: dee, mc: dee.slice(0, 7), f: dm(dee), fe: dm(dee), fc: dm(dee), $: $, co: Math.round($ * 0.7), ep: 'Cobrado', fp: 'Efectivo', p: [{ a: 'PPM', q: 1 }], r: n }, extra || {});
const PEDIDOS = [
  P('2026-09-10', 'Home', 4000000), P('2026-09-12', 'Pilar', 1500000), P('2026-09-15', 'Clubes', 500000),
  P('2026-10-02', 'Home', 1500000), P('2026-10-05', 'Clubes', 300000),
  /* entregado y sin cobrar: te lo deben */
  P('2026-10-06', 'Home', 40000, { ep: 'No Cobrado', fc: '', c: 'Deudor Prueba' })
];
const G = (f, mes, cat, con, $, not) => ({ f: f, fFull: f + ' 10:00', ts: 1, mes: mes, anio: 2026, cat: cat, con: con, met: 'Mercado Pago', $: $, not: not || '' });
const GASTOS = [
  G('03/09/2026', 'Septiembre', 'Herramienta', 'Claude · Mensual', 310000),
  G('10/09/2026', 'Septiembre', 'Nafta', 'Shell', 155000),
  G('20/09/2026', 'Septiembre', 'Sueldo', 'Uno Prueba', 1000000),
  G('21/09/2026', 'Septiembre', 'Sueldo', 'Dos Prueba', 1200000),
  G('22/09/2026', 'Septiembre', 'Proveedor', 'Pago a Proveedor Uno', 3000000),
  G('02/10/2026', 'Octubre', 'Otro', 'Devolvi a Club Prueba', 44000, 'Me pagaron de más y le devolví el restante'),
  G('02/10/2026', 'Octubre', 'Sueldo', 'Uno Prueba', 200000),
  G('03/10/2026', 'Octubre', 'Proveedor', 'Pago a Proveedor Uno', 900000),
  G('04/10/2026', 'Octubre', 'Herramienta', 'WATI · Créditos', 62000),
  G('05/10/2026', 'Octubre', 'Cambio cruzado', 'Vuelto por transferencia', 5000),
  G('05/10/2026', 'Octubre', 'Otro', 'Libreria', 10000)
];
const INGRESOS = [G('06/10/2026', 'Octubre', 'Rendimientos', 'Rendimiento MP', 3000)];
const PROV = [
  { concepto: 'Sueldo Uno', cat: 'sueldo', monto: 1200000, desde: '2026-09', hasta: null },
  { concepto: 'Sueldo Dos', cat: 'sueldo', monto: 1200000, desde: '2026-09', hasta: null },
  { concepto: 'Ocupación imputada', cat: 'ocupacion', monto: 62000, desde: '2026-01', hasta: null },
  { concepto: 'Amortización freezers', cat: 'amortizacion', monto: 31000, desde: '2026-01', hasta: null },
  { concepto: 'Monotributo', cat: 'impuesto_monotributo', monto: 46500, desde: '2026-01', hasta: null }];
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [], light: true, saludSem: {}, saludSemM: {}, saludMes: {}, ventasExtra: [] };
const CAJA = { ts: 1, caja: { cobradoEf: 0, cobradoMP: 0, gastosEf: 0, gastosMP: 0, ingresosEf: 0, ingresosMP: 0 },
  saldoBase: { ef: 1000000, mp: 2000000, inv: 500000, fecha: '08/10 18:30' }, movimientos: [], efMano: [], gastos: GASTOS, ingresos: INGRESOS, provisiones: PROV,
  config: [{ param: 'COSTO_PACKAGING_PEDIDO', valor: 1000, desde: '2026-01' }, { param: 'CAJA_MINIMA', valor: 1500000, desde: '2026-01' }] };
const DEUDA = { ok: true, deudas: [{ n: 'Proveedor Uno', total: 300000, semanas: [{ sem: 39, pendiente: 300000 }] }, { n: 'Proveedor Dos', total: 100000, semanas: [{ sem: 40, pendiente: 100000 }] }] };
const STOCK = { ok: true, ts: 1, stock: [{ a: 'PPM', n: 'Pack', f: 10, iv: 250000 }, { a: 'CLo', n: 'Lomo', f: 2, iv: 50000 }], stockDeps: [] };

/* Lo esperado, a mano (octubre al dia 8 de 31). */
const FR = 8 / 31;
const ESP = {
  caja: 1000000 + 2000000 + 500000,
  deuda: 400000,
  sueldos: 2400000 * FR,          // septiembre quedo pago con el giro del 2/10
  planes: 310000,
  stock: 300000,
  entOct: 1500000 + 300000 + 3000, salOct: 44000 + 200000 + 900000 + 62000 + 10000,
  entSep: 6000000, salSep: 310000 + 155000 + 1000000 + 1200000 + 3000000
};
ESP.libre = ESP.caja - ESP.deuda - ESP.sueldos - ESP.planes;

const RELOJ = `(function(){var AH=new Date(2026,9,8,20,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__err=[];
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  if(window.top===window){ try{ localStorage.removeItem('ma3'); localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_eerr_modo','financiero'); }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo=${JSON.stringify(CAJA)};
      else if(a==='ventas') cuerpo={ok:true,v:${JSON.stringify(VENTAS)}};
      else if(a==='busqueda') cuerpo=${JSON.stringify(DEUDA)};
      else if(a==='stockTab') cuerpo=${JSON.stringify(STOCK)};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='tendencia') cuerpo={ok:true,meses:[],base:{total:1}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},120);});
    }
    return o.apply(this,arguments); }; })();`;
/* innerText de un nodo, con "$1.234" → numero */
const NUM = `function(s){var m=String(s||'').replace(/\\s/g,'').match(/(-?)\\$([\\d.]+)/);return m?(m[1]?-1:1)*Number(m[2].replace(/\\./g,'')):null;}`;
const TABLA = (id) => `(function(){var num=${NUM};var t=document.getElementById('${id}');if(!t)return null;
  return [].slice.call(t.querySelectorAll('tbody tr')).map(function(tr){var c=tr.children;return {cls:tr.className,txt:(c[0]?c[0].innerText:'').replace(/[▸▾]/g,'').replace(/\\s+/g,' ').trim(),monto:c[1]?num(String(c[1].innerText).trim().split('\\n')[0]):null,alto:Math.round(tr.getBoundingClientRect().height)};});})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    console.log('\n== EERR financiero · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    if (!await esperar(cli, `typeof go==='function' && window.D && D.pedidos && D.pedidos.length===${PEDIDOS.length} && Array.isArray(D.gastos)`, 90000)) throw new Error('el ERP no cargo los datos stubbeados');
    await ev(cli, `document.querySelector('#p-inicio .ist[data-st="eerr"]').click()`);
    if (!await esperar(cli, `!!window.VD && document.getElementById('eerrBody').innerText.length>200`, 60000)) throw new Error('el EERR no pinto');
    await esperar(cli, `window.__gets.indexOf('busqueda')>=0 && window.__gets.indexOf('stockTab')>=0`, 15000);
    await pausa(1200);
    const fila = (T, re) => (T || []).filter(f => re.test(f.txt))[0] || {};

    /* ── 1 · hoy: cuanta plata hay y cuanta esta libre ── */
    console.log('\n-- hoy --');
    const hoy = await ev(cli, `(function(){var h=document.getElementById('eerrHoy');return h?h.innerText.replace(/\\s+/g,' '):'';})()`);
    chk('arriba dice la caja con las inversiones: $3.500.000', /Hay \$3\.500\.000 en caja/.test(hoy), hoy);
    chk('y lo libre: caja − proveedores − sueldos por dias − planes', hoy.indexOf('libres $' + Math.round(ESP.libre).toLocaleString('es-AR')) >= 0, { hoy, espero: Math.round(ESP.libre) });
    chk('dice cuanto esta por encima del piso de $1.500.000', /por encima del piso de \$1\.500\.000/.test(hoy), hoy);
    chk('las cuentas, una por una, con Inversiones', /Inversiones \$500\.000/.test(await ev(cli, `document.getElementById('eerrCuentas').innerText.replace(/\\s+/g,' ')`)));
    let L = await ev(cli, TABLA('eerrLibre'));
    chk('renglon Proveedores: lo que se debe ($400.000)', cerca(fila(L, /^− Proveedores/).monto, -ESP.deuda), fila(L, /^− Proveedores/));
    chk('renglon Sueldos: 2.400.000 × 8/31, y dice cuando se pagan', cerca(fila(L, /^− Sueldos/).monto, -Math.round(ESP.sueldos)) && /se pagan del 1 al 5 de noviembre/.test(fila(L, /^− Sueldos/).txt), fila(L, /^− Sueldos/));
    chk('renglon Planes sin pagar: lo de septiembre', cerca(fila(L, /^− Planes del mes/).monto, -ESP.planes), fila(L, /^− Planes del mes/));
    chk('= Libre hoy', cerca(fila(L, /^= Libre hoy/).monto, Math.round(ESP.libre)), fila(L, /^= Libre hoy/));
    const pc = await ev(cli, `Math.round(_porCobrar().total)`);
    chk('Te deben = la misma cuenta que el resto del ERP, y es mas que cero', pc > 0 && cerca(fila(L, /^\+ Te deben/).monto, pc), { pc, f: fila(L, /^\+ Te deben/) });
    chk('= Cobrando todo = libre + te deben', cerca(fila(L, /^= Cobrando todo/).monto, Math.round(ESP.libre) + pc) || cerca(fila(L, /^= Cobrando todo/).monto, Math.round(ESP.libre + pc)), fila(L, /^= Cobrando todo/));
    const pie = await ev(cli, `document.getElementById('eerrStockPie').innerText`);
    chk('el freezer al costo ($300.000), fuera de la cuenta', /al costo: \$300\.000/.test(pie) && /No entra en la cuenta/.test(pie), pie);
    /* abrir Proveedores con un click de verdad */
    const pt = await ev(cli, `(function(){var e=document.querySelector('#eerrLibre tr[data-eg="f:prov"]');e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();var t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {x:r.left+r.width/2,y:r.top+r.height/2,h:Math.round(r.height),llega:!!t&&e.contains(t)};})()`);
    chk('el renglon Proveedores se puede tocar y mide >= 38', pt.llega === true && pt.h >= 38, pt);
    await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await pausa(300);
    L = await ev(cli, TABLA('eerrLibre'));
    chk('con un click de verdad abre a quien se le debe, completo', !!fila(L, /^Proveedor Uno/).txt && !!fila(L, /^Proveedor Dos/).txt, (L || []).map(f => f.txt));
    await ev(cli, `eerrTogTodo(false)`);

    /* ── 2 · el mes: entro, salio, quedo ── */
    console.log('\n-- octubre (en curso) --');
    const fm = await ev(cli, `(function(){var f=eerrFlujoMes(10,2026),c=_finCalc(10,2026);return {e:f.entradas,s:f.salidas,ce:c.entradas,cs:c.salidas,rub:c.rubros.reduce(function(a,r){return a+r.m;},0)};})()`);
    chk('entro y salio = eerrFlujoMes = lo esperado', cerca(fm.e, ESP.entOct) && cerca(fm.s, ESP.salOct) && cerca(fm.ce, fm.e) && cerca(fm.cs, fm.s), { fm, ESP });
    chk('los rubros suman TODO lo que salio', cerca(fm.rub, fm.s), fm);
    let M = await ev(cli, TABLA('eerrMesTbl'));
    chk('la tabla del mes arranca plegada: 3 renglones', (M || []).length === 3, (M || []).map(f => f.txt));
    chk('= La caja subió, con el numero', /^= La caja subió/.test((M[2] || {}).txt) && cerca(M[2].monto, ESP.entOct - ESP.salOct), M[2]);
    await ev(cli, `eerrTog('f:sal')`); await pausa(250);
    M = await ev(cli, TABLA('eerrMesTbl'));
    const hij = (M || []).filter(f => /^h\b/.test(f.cls));
    chk('Salió abierto: los renglones suman el total', cerca(hij.reduce((s, f) => s + (f.monto || 0), 0), -ESP.salOct), hij.map(f => [f.txt, f.monto]));
    chk('las campañas tienen su renglon (faltaban arriba)', cerca(fila(M, /^Campañas y mensajería/).monto, -62000), fila(M, /^Campañas y mensajería/));
    chk('la devolucion tiene su renglon, no es "estructura"', cerca(fila(M, /^Devoluciones a clientes/).monto, -44000), fila(M, /^Devoluciones a clientes/));
    chk('el vuelto por transferencia no es una salida', !/Vuelto/.test(JSON.stringify(M)) && !/Vuelto/.test(await ev(cli, `(function(){window.__eerrTodo=true;rEERR();var t=document.getElementById('eerrMesTbl').innerText;window.__eerrTodo=false;rEERR();return t;})()`)));
    const tl = await ev(cli, `[].map.call(document.querySelectorAll('#eerrBody .eerr-t'),function(e){return e.innerText.replace(/\\s+/g,' ');})`);
    chk('tres numeros, y el mes en curso se compara POR DIA', tl.length === 3 && tl.every(t => /por día .* septiembre/.test(t)) && !/% contra/.test(tl.join(' ')), tl);
    const g = await ev(cli, `(function(){var s=document.querySelectorAll('#eerrGraf svg');return {n:s.length,rect:document.querySelectorAll('#eerrGraf rect').length,punteado:s.length?s[0].querySelectorAll('line[stroke-dasharray="5 5"]').length:0,w:s.length?Math.round(s[0].getBoundingClientRect().width):0};})()`);
    chk('dos graficos de linea, el mes en curso punteado', g.n === 2 && g.rect === 0 && g.punteado === 1 && g.w >= 300, g);

    /* ── 3 · sueldos ── */
    const su = await ev(cli, `(document.getElementById('eerrSueldos')||{}).innerText||''`);
    chk('sueldos: fijo, girado y cuando se pagan', /Sueldos fijos\s*\$2\.400\.000/.test(su) && /Girado en octubre\s*\$200\.000/.test(su) && /se paga del 1 al 5 del mes siguiente/.test(su), su);
    chk('ya no hay programa quincenal ni "sueldo del dueño"', !/día 5|día 20|quincenal|DEL DUEÑO/i.test(su), su);

    /* ── 4 · el puente con el economico ── */
    console.log('\n-- el puente --');
    for (const m of [10, 9]) {
      const pu = await ev(cli, `(function(){eerrMes=new Date(2026,${m - 1},1);window.__eerrTodo=true;rEERR();var num=${NUM};var tot=document.getElementById('eerrPuenteTot');var c=tot?tot.children:[];
        var r={ok:(document.getElementById('eerrPuenteOk')||{getAttribute:function(){return null;}}).getAttribute('data-ok'),res:c[1]?num(c[1].innerText):null,caja:c[2]?num(c[2].innerText):null,
          kpi:Math.round(eerrKpisMes(${m},2026).resNeto),flujo:Math.round(eerrFlujoMes(${m},2026).flujo),filas:document.querySelectorAll('#eerrPuente tbody tr.h').length};
        window.__eerrTodo=false;return r;})()`);
      chk('mes ' + m + ': el puente cierra', pu.ok === '1' && pu.filas >= 5, pu);
      chk('mes ' + m + ': la columna Resultado da el del Economico y la columna Caja, el flujo', cerca(pu.res, pu.kpi) && cerca(pu.caja, pu.flujo), pu);
    }

    /* ── 5 · un mes cerrado no muestra la caja de hoy ── */
    console.log('\n-- septiembre (cerrado) --');
    await ev(cli, `eerrMes=new Date(2026,8,1);rEERR()`); await pausa(250);
    const sep = await ev(cli, `({hoy:!!document.getElementById('eerrHoy'),libre:!!document.getElementById('eerrLibre'),hero:(document.querySelector('.eerr-hero')||{}).innerText||'',tl:[].map.call(document.querySelectorAll('#eerrBody .eerr-t'),function(e){return e.innerText.replace(/\\s+/g,' ');})})`);
    chk('septiembre no muestra la foto de hoy', sep.hoy === false && sep.libre === false, sep);
    chk('dice cuanto subio la caja en septiembre', /La caja subió\s*\$335\.000/.test(sep.hero.replace(/\s+/g, ' ')), sep.hero);
    chk('entro y salio de septiembre', (function () { return /\$6,00M/.test(sep.tl[0] || '') && /\$5,67M/.test(sep.tl[1] || ''); })(), sep.tl);

    /* ── 6 · lo que se fue, y que nada se salga ── */
    await ev(cli, `eerrMes=new Date(2026,9,1);window.__eerrTodo=true;rEERR()`); await pausa(300);
    const d = await ev(cli, `(function(){var vw=document.documentElement.clientWidth,b=document.getElementById('eerrBody'),t=b.innerText;
      var f=[].slice.call(document.querySelectorAll('#eerrTool *,#eerrBody *')).filter(function(e){var r=e.getBoundingClientRect();if(!r.width||e.closest('.eerr-6w'))return false;return r.right>vw+1||r.left<-1;}).map(function(e){return e.tagName+'.'+String(e.className).slice(0,30);});
      var ch=[].slice.call(b.querySelectorAll('*')).filter(function(e){if(e.children.length)return false;var s=parseFloat(getComputedStyle(e).fontSize);return (e.innerText||'').trim()&&s<11;}).length;
      var tr=[].map.call(b.querySelectorAll('tr.abre'),function(e){return Math.round(e.getBoundingClientRect().height);});
      return {vw:vw,scrollW:document.documentElement.scrollWidth,nFuera:f.length,fuera:f.slice(0,6),letraChica:ch,minTr:Math.min.apply(null,tr),nTr:tr.length,
        jerga:(t.match(/EOAF|CAPEX|Ciclo de Caja|Glosario|calibrado|Cobertura FC|GOBIERNO DE RETIROS|Stock al costo|auto-sostenible/gi)||[])};})()`);
    chk('sin jerga (EOAF, CAPEX, ciclo de caja, glosario…)', d.jerga.length === 0, d.jerga);
    chk('nada se sale de la pantalla (' + d.vw + 'px)', d.nFuera === 0 && d.scrollW <= d.vw, d);
    chk('ningun texto en letra de menos de 11px', d.letraChica === 0, d);
    chk('los ' + d.nTr + ' renglones que se abren llegan a 38px', d.nTr >= 4 && d.minTr >= 38, d);
    const err = await ev(cli, 'window.__err');
    chk('sin errores en consola', Array.isArray(err) && err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL  la prueba se corto: ' + (e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
