/* El sueldo fijo separado de la ganancia (15/9/2026).

   node probar_sueldo_fijo.js [390|1440]
   APP=app_viejo_tmp.html node probar_sueldo_fijo.js     ← la direccion contraria (tiene que dar rojo)

   Fede: el sueldo paga el TRABAJO y va arriba del resultado; lo que queda es del
   negocio. Hasta ese dia el EERR cargaba max(girado, piso) — girarse de mas le
   bajaba la ganancia a Maleu — con un piso de $1.000.000 escrito en el codigo,
   aunque la hoja Provisiones_Fijas dijera $1.200.000.

   Backend STUBBEADO con datos inventados y el reloj en el martes 15/9/2026 15:00.
   Sostiene:
   · `provisiones` llega en `cajaLight` y el EERR usa ESE monto, no el del codigo;
   · la linea del sueldo es el fijo en todos los meses (julio: se giro 1.400.000);
   · LA PROPIEDAD: girarse distinto no cambia el EBITDA del mes;
   · la cuenta del sueldo desde marzo: te tocaba, te giraste, Maleu te debe; un
     giro paga primero lo atrasado y lo que pasa de ahi es adelanto;
   · un cambio de sueldo con "Activa desde/hasta" se respeta mes a mes;
   · el financiero: EOAF con "te giraste mas que el fijo", el adelanto aparte, y el
     Estado de Caja con el fijo de la hoja, el quincenal = fijo/2 y la cuenta. */
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

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const G = (f, cat, con, $) => ({ f: f, fFull: f + ' 10:00', ts: 1, mes: MESES[Number(f.slice(3, 5)) - 1], anio: 2026, cat: cat, con: con, met: 'Mercado Pago', $: $, not: '' });
/* Giros inventados: mar 700.000 · abr 800.000 · may 1.000.000 · jun 1.000.000 ·
   jul 1.400.000 (en dos) · ago 1.200.000 · sep 500.000. Total 6.600.000. */
const GASTOS = [
  G('10/03/2026', 'Sueldo', 'Tadeo Ustariz', 700000),
  G('08/04/2026', 'Sueldo', 'Tadeo Ustariz', 800000),
  G('05/05/2026', 'Sueldo', 'Tadeo Ustariz', 1000000),
  G('08/06/2026', 'Sueldo', 'Tadeo Ustariz', 1000000),
  G('04/07/2026', 'Sueldo', 'Tadeo Ustariz', 900000),
  G('18/07/2026', 'Sueldo', 'Tadeo Ustariz', 500000),
  G('02/08/2026', 'Sueldo', 'Tadeo Ustariz', 1200000),
  G('01/09/2026', 'Sueldo', 'Tadeo Ustariz', 500000),
  G('09/07/2026', 'Herramienta', 'Canva', 20000)
];
const PROV = [
  { concepto: 'Sueldo dueño imputado', cat: 'sueldo', monto: 1200000, desde: '2026-01', hasta: null },
  { concepto: 'Ocupación imputada', cat: 'ocupacion', monto: 50000, desde: '2026-01', hasta: null },
  { concepto: 'Amortización freezers', cat: 'amortizacion', monto: 35000, desde: '2026-01', hasta: null },
  { concepto: 'Monotributo', cat: 'impuesto_monotributo', monto: 42386.74, desde: '2026-01', hasta: null }
];
const CONFIG = [{ param: 'CAJA_MINIMA', valor: 1500000, desde: '2026-01' }, { param: 'SUELDO_MENSUAL', valor: 1200000, desde: '2026-01' },
  { param: 'GIRO_QUINCENAL', valor: 500000, desde: '2026-01' }, { param: 'DIA_GIRO_1', valor: 5, desde: '2026-01' }, { param: 'DIA_GIRO_2', valor: 20, desde: '2026-01' }];
const CAJA = { ts: 1, caja: { cobradoEf: 0, cobradoMP: 0, gastosEf: 0, gastosMP: 0, ingresosEf: 0, ingresosMP: 0 }, saldoBase: { ef: 0, mp: 0, fecha: '' },
  movimientos: [], efMano: [], ingresos: [], gastos: GASTOS, provisiones: PROV, config: CONFIG };
const LIGHT = { ts: 1, pedidos: [], canales: [], light: true, saludSem: {}, saludMes: {}, ventasExtra: [] };
const VENTAS = { ok: true, v: [
  { mes: 'Julio', h: 'Home', $: 5000000, costo: 3000000 },
  { mes: 'Septiembre', h: 'Home', $: 2000000, costo: 1300000 }] };

const RELOJ = `(function(){var AH=new Date(2026,8,15,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio'); localStorage.removeItem('ma3'); }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo=${JSON.stringify(CAJA)};
      else if(a==='ventas') cuerpo=${JSON.stringify(VENTAS)};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='busqueda') cuerpo={ok:true,deuda:0,proveedores:[]};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},100);});
    }
    return o.apply(this,arguments); }; })();`;

/* El numero de una fila de la tabla del EERR por el comienzo de su etiqueta. */
const FILA = `function(pref){var rs=[].slice.call(document.querySelectorAll('#eerrBody tr'));
  for(var i=0;i<rs.length;i++){var td=rs[i].querySelectorAll('td');if(td.length<2)continue;
    var t=td[0].textContent.replace(/\\s+/g,' ').trim();if(t.indexOf(pref)===0){var m=td[td.length-1].textContent.match(/([−-])?\\$\\s*([\\d.]+)/);return m?Number((m[1]?'-':'')+m[2].replace(/\\./g,'')):null;}}
  return null;}`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    console.log('\n== Sueldo fijo · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    if (!await esperar(cli, `typeof go==='function' && window.D && Array.isArray(D.gastos) && D.gastos.length===${GASTOS.length}`, 90000)) throw new Error('el ERP no cargo la caja stubbeada');

    console.log('\n-- la regla --');
    const R = await ev(cli, `(function(){
      var c=_sueldoCuenta(9,2026), j=c.meses.filter(function(x){return x.ym==='2026-07';})[0];
      return {prov:Array.isArray(D.provisiones)&&D.provisiones.length, fijo7:_sueldoFijoMes(7,2026),
        L3:_eerrMesGastos(3,2026).L.sueldo, L7:_eerrMesGastos(7,2026).L.sueldo, L8:_eerrMesGastos(8,2026).L.sueldo,
        dev:c.devengado, gir:c.girado, saldo:c.saldo, jul:j, antes:_sueldoCuenta(2,2026), txt:_sueldoCuentaTxt(c)};})()`);
    const RR = (R && !R.__err) ? R : null;
    chk('provisiones llega en cajaLight', !!RR && RR.prov === 4, R);
    chk('el fijo de julio es el de la hoja: 1.200.000 (no el 1.000.000 del codigo)', !!RR && RR.fijo7 === 1200000, RR && RR.fijo7);
    chk('_eerrMesGastos: marzo, julio y agosto cargan 1.200.000 (julio se giro 1.400.000)', !!RR && RR.L3 === 1200000 && RR.L7 === 1200000 && RR.L8 === 1200000, RR && [RR.L3, RR.L7, RR.L8]);
    chk('cuenta mar-sep: te tocaban 8.400.000, te giraste 6.600.000, Maleu te debe 1.800.000', !!RR && RR.dev === 8400000 && RR.gir === 6600000 && RR.saldo === 1800000, RR && [RR.dev, RR.gir, RR.saldo]);
    chk('julio: los 1.400.000 pagan sueldo (habia 1.300.000 atrasado), adelanto 0, queda 1.100.000', !!RR && RR.jul && RR.jul.sueldo === 1400000 && RR.jul.adelanto === 0 && RR.jul.saldo === 1100000, RR && RR.jul);
    chk('antes de marzo no hay cuenta', !!RR && RR.antes === null, RR && RR.antes);
    chk('la frase dice cuanto debe Maleu', !!RR && /Maleu te debe \$1\.800\.000/.test(RR.txt), RR && RR.txt);

    const A = await ev(cli, `(function(){var g0=D.gastos;
      D.gastos=g0.concat([{f:'10/09/2026',mes:'Septiembre',cat:'Sueldo',con:'Tadeo Ustariz',$:3000000,not:''}]);
      var c=_sueldoCuenta(9,2026);var r={mes:c.mes,saldo:c.saldo,txt:_sueldoCuentaTxt(c)};D.gastos=g0;return r;})()`);
    chk('adelanto: septiembre con 3.500.000 cubre 2.300.000 y adelanta 1.200.000', !!A && A.mes && A.mes.sueldo === 2300000 && A.mes.adelanto === 1200000 && A.saldo === -1200000, A);
    chk('y la frase lo dice como adelanto, no como costo', !!A && /te adelantaste \$1\.200\.000/.test(A.txt) && /No es costo/.test(A.txt), A && A.txt);

    const H = await ev(cli, `(function(){var p0=D.provisiones;
      D.provisiones=[{concepto:'Sueldo',cat:'sueldo',monto:1200000,desde:'2026-01',hasta:'2026-07'},{concepto:'Sueldo',cat:'sueldo',monto:1500000,desde:'2026-08',hasta:null}];
      var r=[_sueldoFijoMes(7,2026),_sueldoFijoMes(8,2026),_sueldoCuenta(9,2026).devengado];D.provisiones=p0;return r;})()`);
    chk('un aumento con Activa desde/hasta: julio 1.200.000, agosto 1.500.000, devengado 9.000.000', JSON.stringify(H) === '[1200000,1500000,9000000]', H);

    console.log('\n-- el EERR economico de julio --');
    const pint = async (mes, modo) => {
      await ev(cli, `eerrMes=new Date(2026,${mes},1);eerrModo='${modo}';if(cur!=='inicio')go('inicio');goSubInicio('eerr');rEERR();`);
      await pausa(600);
    };
    await pint(6, 'economico');
    const E1 = await ev(cli, `(function(){var f=${FILA};var b=document.getElementById('eerrBody').textContent;
      return {sueldo:f('Tu sueldo fijo'),ebitda:f('= EBITDA'),mes:(document.querySelector('.eerr-sueldo-mes')||{}).innerText||'',mil:b.indexOf('1.000.000')>=0};})()`);
    chk('la linea "Tu sueldo fijo" dice -1.200.000', !!E1 && Math.abs(E1.sueldo) === 1200000, E1);
    chk('dice que te giraste 1.400.000, 200.000 mas que el fijo, y que Maleu te debe 1.100.000', !!E1 && /Te giraste \$1\.400\.000 en julio: \$200\.000 más que el fijo/.test(E1.mes) && /Maleu te debe \$1\.100\.000/.test(E1.mes), E1 && E1.mes);
    chk('ya no aparece el piso de $1.000.000', !!E1 && E1.mil === false, E1);
    await ev(cli, `D.gastos=D.gastos.map(function(g){return (g.cat==='Sueldo'&&g.mes==='Julio')?Object.assign({},g,{$:g.$/2}):g;});`);
    await pint(6, 'economico');
    const E2 = await ev(cli, `(function(){var f=${FILA};return {sueldo:f('Tu sueldo fijo'),ebitda:f('= EBITDA'),mes:(document.querySelector('.eerr-sueldo-mes')||{}).innerText||''};})()`);
    chk('LA PROPIEDAD: con la mitad de giros en julio el EBITDA es el mismo (' + (E1 && E1.ebitda) + ')', !!E1 && !!E2 && E1.ebitda !== null && E1.ebitda === E2.ebitda && Math.abs(E2.sueldo) === 1200000, [E1 && E1.ebitda, E2 && E2.ebitda]);
    chk('y ahora dice que Maleu te queda debiendo 500.000 del mes', !!E2 && /\$500\.000 menos, que Maleu te queda debiendo/.test(E2.mes), E2 && E2.mes);
    await ev(cli, `D.gastos=${JSON.stringify(GASTOS)};`);

    console.log('\n-- el financiero --');
    await pint(6, 'financiero');
    const F1 = await ev(cli, `(function(){var b=document.getElementById('eerrBody').textContent;
      return {demas:/Te giraste más que el sueldo fijo/.test(b),girado:/Sueldo girado a Tadeo/.test(b),viejo:/Retiros del dueño/.test(b),adel:/adelanto: más de lo que te tocaba/.test(b)};})()`);
    chk('julio: el EOAF muestra "Te giraste más que el sueldo fijo" y el renglon se llama "Sueldo girado a Tadeo"', !!F1 && F1.demas && F1.girado && !F1.viejo, F1);
    chk('julio: sin adelanto (pago sueldo atrasado)', !!F1 && F1.adel === false, F1);
    await pint(8, 'financiero');
    const F2 = await ev(cli, `(function(){var b=document.getElementById('eerrBody').textContent;var c=document.querySelector('.eerr-sueldo-cuenta');
      return {fijo:/Sueldo fijo\\s*\\$1\\.200\\.000/.test(b),quinc:/\\$600\\.000 día 5/.test(b),cuenta:c?c.innerText:''};})()`);
    chk('Estado de Caja de septiembre: sueldo fijo 1.200.000 y quincenal 600.000', !!F2 && F2.fijo && F2.quinc, F2);
    chk('y la cuenta: Maleu te debe 1.800.000', !!F2 && /Maleu te debe \$1\.800\.000/.test(F2.cuenta), F2 && F2.cuenta);
    await ev(cli, `D.gastos=D.gastos.concat([{f:'10/09/2026',fFull:'10/09/2026 10:00',ts:1,mes:'Septiembre',cat:'Sueldo',con:'Tadeo Ustariz',$:3000000,not:''}]);`);
    await pint(8, 'financiero');
    const F3 = await ev(cli, `(function(){var b=document.getElementById('eerrBody').textContent;return {adel:/adelanto: más de lo que te tocaba/.test(b)};})()`);
    chk('septiembre con 3.500.000 girados: aparece el adelanto aparte', !!F3 && F3.adel === true, F3);

    const err = await ev(cli, `(window.__err||[]).filter(function(e){return /sueldo|eerr|EERR|_sueldo/i.test(e);})`);
    chk('sin errores de JS del EERR', Array.isArray(err) && err.length === 0, err);
  } catch (e) { console.log('  REVENTO: ' + (e && e.message)); mal++; }
  console.log(`\n${ok} ok · ${mal} mal`);
  salir(mal ? 1 : 0);
})();
