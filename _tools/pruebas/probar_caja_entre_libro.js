/* MOVER ENTRE CUENTAS EN EL LIBRO Y EN RESULTADOS (17/11/2026, v1241). Sesión real con la guarda de solo lectura.
     SBSES=<ses.json> BASE_URL=http://localhost:8163/app.html node _tools/pruebas/probar_caja_entre_libro.js <token> <ancho>
   Mete en D (solo en el navegador) un par «Entre cuentas» de hoy (salida MP + entrada Galicia, como los manda la base) y mide:
   · el libro lo muestra como UN renglón «t-entre» con «Deshacer» y sin la ✕;
   · «entró / salió» de HOY y de la semana no cambian;
   · Resultados (eerrFlujoMes y _eerrMesGastos del mes) dan exactamente lo mismo que sin el par;
   · los saldos: MP baja y Galicia sube lo mismo (_cajaCuentas). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : '';
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" + CAJON });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  for (let i = 0; i < 6; i++) {
    await evaluar(cli, `try{go('caja')}catch(e){}`); await T(i ? 3000 : 7000);
    if ((await evaluar(cli, `(document.querySelector('.pg.on')||{}).id||''`).catch(() => '')) === 'p-caja') break;
  }
  for (let i = 0; i < 30; i++) { if ((await evaluar(cli, `((D&&D.movimientos)||[]).length`)) > 3) break; await T(1000); }
  const r = JSON.parse(await evaluar(cli, `(function(){
    var hoy=new Date(),mn=hoy.getMonth()+1,an=hoy.getFullYear();
    var foto=function(){
      var c=_cajaCuentas()||[],s={};c.forEach(function(x){s[x.id]=Math.round(x.saldo*100)/100;});
      var e=eerrFlujoMes(mn,an),g=_eerrMesGastos(mn,an),vu=(g.L&&g.L.vuelto)||0;if(g.L)delete g.L.vuelto;
      rMovimientos();
      return {sal:s,eerr:JSON.stringify(e),gas:JSON.stringify(g),vu:vu,hoy:JSON.stringify(window._cjHoyDato),
              sem:(document.querySelector('#cjSemBar .cj-sem-s')||{}).textContent||'',filas:document.querySelectorAll('#gList .cj-r').length};
    };
    var a=foto();
    var pad=function(n){return String(n).padStart(2,'0');},f=pad(hoy.getDate())+'/'+pad(hoy.getMonth()+1)+'/'+an+' 09:15';
    var t=new Date(an,mn-1,hoy.getDate(),9,15).getTime(),con='Mercado Pago Tadeo → Galicia Maleu';
    var g={tipo:'gasto',f:f,ts:t,r:99998,cat:'Entre cuentas',con:con,met:'Mercado Pago',cta:'mp',$:12345,not:''};
    var i={tipo:'ingreso',f:f,ts:t,r:99999,cat:'Entre cuentas',con:con,met:'Galicia Maleu',cta:'galicia',$:12345,not:''};
    D.movimientos.unshift(g,i);
    var fd=f.slice(0,10),mes=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mn-1];
    (D.gastos=D.gastos||[]).push({f:fd,cat:'Entre cuentas',con:con,met:'Mercado Pago',$:12345,mes:mes,anio:an,r:99998});
    (D.ingresos=D.ingresos||[]).push({f:fd,cat:'Entre cuentas',con:con,met:'Galicia Maleu',$:12345,mes:mes,anio:an,r:99999});
    D.caja.gastosPorCuenta=Object.assign({},D.caja.gastosPorCuenta);D.caja.gastosPorCuenta.mp=(D.caja.gastosPorCuenta.mp||0)+12345;
    D.caja.ingresosPorCuenta=Object.assign({},D.caja.ingresosPorCuenta);D.caja.ingresosPorCuenta.galicia=(D.caja.ingresosPorCuenta.galicia||0)+12345;
    var b=foto();
    var fila=[].filter.call(document.querySelectorAll('#gList .cj-r'),function(x){return x.textContent.indexOf('Galicia Maleu')>=0&&x.textContent.indexOf('12.345')>=0;});
    return JSON.stringify({a:a,b:b,n:fila.length,cls:fila[0]?fila[0].className:'',txt:fila[0]?fila[0].textContent:'',
      desh:fila[0]?!!fila[0].querySelector('.cj-deshacer'):false,x:fila[0]?!!fila[0].querySelector('.gl-x'):false,
      dh:fila[0]&&fila[0].querySelector('.cj-deshacer')?Math.round(fila[0].querySelector('.cj-deshacer').getBoundingClientRect().height):0,
      vuelto:_esVuelto({cat:'Entre cuentas'})});
  })()`));
  console.log('fila:', r.cls, '|', r.txt);
  chk(r.n === 1, 'el par es UN renglón en el libro (' + r.n + ')');
  chk(/t-entre/.test(r.cls), 'renglón de tipo entre cuentas');
  chk(r.desh && !r.x, 'con «Deshacer» y sin la ✕');
  chk(r.dh >= 44, '«Deshacer» de ' + r.dh + ' px');
  chk(r.b.filas === r.a.filas + 1, 'el libro suma 1 renglón, no 2 (' + r.a.filas + ' → ' + r.b.filas + ')');
  chk(r.a.hoy === r.b.hoy, 'HOY entró/salió igual: ' + r.b.hoy);
  chk(r.a.sem.replace(/\d+ movimientos?/, '') === r.b.sem.replace(/\d+ movimientos?/, ''), 'semana entró/salió igual');
  chk(r.a.eerr === r.b.eerr, 'Resultados (flujo del mes) idéntico');
  chk(r.a.gas === r.b.gas, 'Resultados (gastos del mes: todas las líneas y totales menos la de afuera) idéntico');
  chk(Math.round(r.b.vu - r.a.vu) === 12345, 'el par va a la línea «vuelto», la de afuera del resultado (+' + Math.round(r.b.vu - r.a.vu) + ')');
  chk(r.vuelto === true, '_esVuelto(Entre cuentas)');
  chk(Math.round((r.a.sal.mp - r.b.sal.mp) * 100) === 1234500 && Math.round((r.b.sal.galicia - r.a.sal.galicia) * 100) === 1234500,
    'MP baja $12.345 y Galicia sube $12.345 (' + r.a.sal.mp + ' → ' + r.b.sal.mp + ' · ' + r.a.sal.galicia + ' → ' + r.b.sal.galicia + ')');
  console.log(mal ? '\n' + mal + ' MAL, ' + ok + ' ok' : '\nTODO OK (' + ok + ')');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
