/* La tab Caja, auditada el 13/9/2026. Backend STUBBEADO con datos inventados
   (el repo es publico): no hace falta token.

   node probar_caja_tab.js [390|1440]
   APP=app_viejo_tmp.html node probar_caja_tab.js 390    ← la direccion contraria

   Sostiene:
   · Efectivo en mano NO desaparece cuando llega el volcado. El volcado real
     (`action=admin`) no trae `efMano` —solo `cajaLight`— y `load()` reemplazaba D
     entero: al abrir la app la tarjeta se iba sola a los ~28 s. El stub del admin
     imita eso; la prueba vieja (probar_efmano_quien) le ponia efMano y no lo veia.
   · Movimientos se dibuja DE A TRAMOS (120 + "Ver mas"), y un filtro repinta solo
     la lista: con 1.479 movimientos reales eran 11.476 nodos y 1,8 s de CPU de
     celular por toque.
   · el dia se elige con un select, sin <input type="date"> (Caja y Pagos);
   · "150.000" es ciento cincuenta mil, no 150;
   · Invertir no infla la Posicion total mientras vuelve la caja;
   · el aviso del ajuste no inventa una diferencia si se deja la caja fuerte vacia;
   · la clase del monto es valida (`.gl-$` no lo era y el navegador tiraba la regla);
   · Analisis de Cobranzas no cuenta los vueltos;
   · la fecha del gasto pasa a hoy al abrir el formulario, si nadie la toco;
   · el nombre de un sobre va escapado; sin errores de JS; minimo tactil. */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

/* ── Los datos inventados ── */
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' },
  { id: 'mp', nombre: 'Mercado Pago Prueba', tipo: 'digital', def: true, inv: true, banco: 'Mercado Pago' },
  { id: 'brubank', nombre: 'Brubank Prueba', tipo: 'digital', banco: 'Brubank' }
];
const pad = n => String(n).padStart(2, '0');
const MOVS = [];
let vueltosIn = 0, vueltosOut = 0, nVueltos = 0;
/* El movimiento mas nuevo que fabrica esta prueba tiene que quedar SIEMPRE en
   el pasado. (23/9/2026)

   Estaba anclado a hoy a las 20:00 a secas, asi que corriendola de dia el
   movimiento mas nuevo del stub quedaba EN EL FUTURO. La lista de movimientos
   ordena por `ts` de mas nuevo a mas viejo, y entonces el gasto que la prueba
   carga —con la hora de ahora— quedaba debajo de un cobro fechado a las 20:00.
   El chequeo "el gasto recien cargado queda ARRIBA de la lista" se ponia rojo
   acusando al ERP, que hacia lo correcto: a las 13:08 un movimiento de las
   20:00 va primero. La prueba solo pasaba despues de las 20:00.

   Se mantienen las 20:00 como hora base —hay chequeos que cuentan 15
   movimientos por dia, con media hora entre uno y otro— pero si esa hora
   todavia no llego, la tanda se corre al dia anterior. */
const hoy = new Date(); hoy.setHours(20, 0, 0, 0);
if (hoy.getTime() >= Date.now() - 60000) hoy.setDate(hoy.getDate() - 1);
for (let i = 0; i < 1500; i++) {
  const d = new Date(hoy.getTime() - Math.floor(i / 15) * 86400000 - (i % 15) * 1800000);
  const f = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const k = i % 3;
  const tipo = k === 0 ? 'cobro' : (k === 1 ? 'gasto' : 'ingreso');
  const cta = ['efectivo', 'mp', 'brubank'][i % 3 === 0 ? 0 : (i % 2 ? 1 : 2)];
  const met = cta === 'efectivo' ? 'Efectivo' : (cta === 'mp' ? 'Mercado Pago' : 'Brubank Prueba');
  const esVuelto = (i < 60 && i % 10 === 4);
  const m = {
    tipo, f, ts: d.getTime(), met, cta, $: 1000 + (i % 7) * 500,
    cat: esVuelto ? 'Cambio cruzado' : (tipo === 'cobro' ? 'COBRO Home' : (tipo === 'gasto' ? 'Proveedor' : 'Rendimientos')),
    con: tipo === 'cobro' ? ('Cliente ' + i + ' #' + (9000 + i)) : ('Concepto ' + i), not: ''
  };
  if (esVuelto) { nVueltos++; if (tipo === 'gasto') vueltosOut += m.$; else vueltosIn += m.$; }
  MOVS.push(m);
}
/* Lo que Analisis de Cobranzas tiene que decir que ENTRO: cobros + ingresos, sin vueltos. */
const ENTRO_ESPERADO = MOVS.filter(m => m.tipo !== 'gasto' && m.cat !== 'Cambio cruzado').reduce((a, m) => a + m.$, 0);
const hoyDmy = pad(hoy.getDate()) + '/' + pad(hoy.getMonth() + 1) + '/' + hoy.getFullYear();
const EFMANO = [{ f: hoyDmy.slice(0, 10), cobrado: 50000, bil: 0, cambioMP: 0, cruzado: 0, entro: 50000, salio: 0, neto: 50000,
  porQuien: [{ q: 'Persona Uno', e: 50000, s: 0, n: 1 }],
  det: [{ c: 'Cliente Uno', id: '9001', h: 'Home', cobro: 50000, vto: 0, tipo: '', q: 'Persona Uno' }] }];
const SALDO_BASE = { ef: 1000000, mp: 5000000, bil: 5000, sob: 1000, inv: 500000, fecha: '10/09 16:13',
  porCuenta: { efectivo: 1000000, mp: 5000000, brubank: 500000 }, sinContar: [] };
const CAJA = {
  ts: 1,
  caja: { cobradoEf: 200000, cobradoMP: 300000, gastosEf: 0, gastosMP: 100000, ingresosEf: 0, ingresosMP: 0,
    cobradoPorCuenta: { efectivo: 200000, mp: 200000, brubank: 100000 }, gastosPorCuenta: { mp: 100000 }, ingresosPorCuenta: {}, cuentas: CUENTAS },
  saldoBase: SALDO_BASE, gastos: [], ingresos: [], gastosHist: {}, movimientos: MOVS,
  sobres: [{ r: 5, prov: '<img src=x onerror="window.__xss=1">Proveedor Raro', monto: 1000 }],
  efMano: EFMANO, cajaMode: true
};
/* El volcado como lo manda el backend DE VERDAD: mismos datos de caja, SIN efMano. */
const ADMIN = Object.assign({}, CAJA, { pedidos: [], canales: [], stock: [], oc: { lista: [] }, proveedores: ['Proveedor A'], vendedores: [] });
delete ADMIN.efMano; delete ADMIN.cajaMode;
// efectivo 1.2M · mp 5.1M · brubank 0.6M · inversiones 0.5M
const TOTAL = 7400000;

const EXTRA = `
  (function(){
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v3'); localStorage.setItem('maleu_tab','caja'); }catch(e){}
    window.__posts=[]; window.__cajaVeces=0; window.__adminLlego=false;
    var CAJA=${JSON.stringify(CAJA)}, ADMIN=${JSON.stringify(ADMIN)};
    var o = window.fetch; window.fetch = function(u, x){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
      var resp = function(obj, ms, cb){ return new Promise(function(res){ setTimeout(function(){ if(cb)cb(); res(new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}})); }, ms); }); };
      if (x && String(x.method||'').toUpperCase()==='POST') {
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        if (b.action==='invertir') return resp({ok:true, mp: CAJA.saldoBase.mp - Number(b.monto), inv: CAJA.saldoBase.inv + Number(b.monto)}, 50);
        if (b.action==='gasto'||b.action==='ingreso') return resp({ok:true, rows:1}, 50);
        return resp({ok:true}, 50);
      }
      var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
      (window.__gets=window.__gets||[]).push(a);
      if (a==='cajaLight'){ window.__cajaVeces++; return resp(CAJA, window.__cajaVeces===1 ? 300 : 15000); }
      if (a==='admin') return resp(ADMIN, 2500, function(){ window.__adminLlego=true; });
      if (a==='pedidosLight') return resp({ts:1, pedidos:[], canales:[], light:true}, 150);
      if (a==='ocLight') return resp({ok:true, oc:{lista:[]}}, 150);
      if (a==='cobrosPendientes') return resp({ok:true, cobros:[]}, 150);
      return resp({ok:false, error:'stub'}, 150);
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const errores = [];
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Caja · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('caja'); 1`);
    if (!await esperar(cli, `document.querySelectorAll('#gList .gl').length>0 && document.querySelectorAll('#cBal .bal-card').length>=4`, 30000)) {
      console.log('  la caja no se dibujo (sin esto, lo de abajo no mide nada)'); salir(1);
    }

    /* ── Las tarjetas ── */
    const tarj = await evaluar(cli, `(()=>{ var c=[].slice.call(document.querySelectorAll('#cBal .bal-card')); return c.map(function(x){return x.textContent.replace(/\\s+/g,' ').trim();}); })()`);
    chk('una tarjeta por cuenta y la Posicion total (4)', tarj.length === 4, tarj);
    chk('Posicion total $7.400.000 (efectivo 1,2M + MP 5,1M + Brubank 0,6M + inversiones 0,5M)', /7\.400\.000/.test(tarj[3] || ''), tarj[3]);

    /* ── Efectivo en mano, despues de que llega el volcado ── */
    const llego = await esperar(cli, `window.__adminLlego===true`, 30000);
    await pausa(1800);
    const efm = await evaluar(cli, `!!document.querySelector('#efManoCard .efm') && document.getElementById('efManoCard').textContent.indexOf('50.000')>=0`);
    chk('el volcado llego (sin esto, lo de abajo no mide nada)', llego === true);
    chk('Efectivo en mano SIGUE en pantalla despues del volcado (que no trae efMano)', efm === true);

    /* ── Movimientos de a tramos ── */
    const lista = await evaluar(cli, `(()=>{ var g=document.getElementById('gList'); var mas=g.querySelector('.mov-mas');
      return { filas:g.querySelectorAll('.gl').length, nodos:g.querySelectorAll('*').length, hdr:(g.firstElementChild||{}).textContent||'',
               mas: mas?mas.textContent:'', masH: mas?Math.round(mas.getBoundingClientRect().height):0 }; })()`);
    chk('dibuja 120 movimientos de 1.500, no todos', lista.filas === 120, lista.filas);
    chk('la lista pesa menos de 2.000 nodos (eran 11.476 con los datos reales)', lista.nodos < 2000, lista.nodos);
    chk('el encabezado cuenta los 1.500 y dice que es entro menos salio', /1\.500 movimientos/.test(lista.hdr) && /entró menos salió/.test(lista.hdr), lista.hdr);
    chk('hay un "Ver 120 mas" que dice cuantos quedan', /Ver 120 más/.test(lista.mas) && /1\.380/.test(lista.mas), lista.mas);
    chk('el boton mide 44px o mas', lista.masH >= 44, lista.masH);

    await evaluar(cli, `(()=>{ var b=document.querySelector('#gList .mov-mas'); if(b) b.click(); return 1; })()`);  // contra la version vieja no existe: tiene que dar MAL, no reventar
    await pausa(200);
    const l2 = await evaluar(cli, `(()=>{ var g=document.getElementById('gList');
      var dias=[].slice.call(g.children).filter(function(e){return /^\\u{1F4C5}/u.test((e.textContent||'').trim());}).map(function(e){return (e.textContent||'').trim().slice(0,16);});
      return { filas:g.querySelectorAll('.gl').length, dias:dias, unicos:Array.from(new Set(dias)).length }; })()`);
    chk('"Ver mas" agrega el tramo siguiente (240)', l2.filas === 240, l2.filas);
    chk('ningun dia repite su encabezado al cortar el tramo (' + l2.dias.length + ' dias)', l2.dias.length === l2.unicos && l2.dias.length >= 16, l2);

    /* ── Un filtro repinta SOLO la lista ── */
    await evaluar(cli, `(()=>{ var t=document.querySelector('#cBal .bal-card'); t.__marca=1; return 1; })()`);
    await evaluar(cli, `document.querySelector('#movFilter button[data-t="gasto"]').click(); 1`);
    await pausa(250);
    const fg = await evaluar(cli, `(()=>{ var t=document.querySelector('#cBal .bal-card'); var g=document.getElementById('gList');
      var cats=[].slice.call(g.querySelectorAll('.gl-cat')).map(function(c){return c.textContent.trim().charAt(0);});
      return { marca: !!(t&&t.__marca), filas:g.querySelectorAll('.gl').length, todosGasto: cats.length>0 && cats.every(function(c){return c==='➖';}) }; })()`);
    chk('tocar GASTOS no redibuja las tarjetas de saldo', fg.marca === true, fg);
    chk('y deja solo gastos, volviendo al primer tramo', fg.todosGasto === true && fg.filas === 120, fg);
    await evaluar(cli, `document.querySelector('#movFilter button[data-t="gasto"]').click(); 1`);
    await pausa(250);

    /* ── El dia, con un select ── */
    const dia = await evaluar(cli, `(()=>{ var s=document.getElementById('movDiaSel'); if(!s) return null;
      var r=s.getBoundingClientRect(); return { n:s.options.length, v:s.options[2]?s.options[2].value:'', h:Math.round(r.height),
        fechas: document.querySelectorAll('#p-caja input[type=date]').length }; })()`);
    chk('no queda ningun <input type="date"> en Caja', !!dia && dia.fechas === 0, dia);
    chk('el filtro de dia es un select con los 100 dias que tienen movimientos', !!dia && dia.n === 101, dia && dia.n);
    if (ANCHO <= 560) chk('el select mide 38px o mas en el celular', !!dia && dia.h >= 38, dia && dia.h);
    await evaluar(cli, `(()=>{ var s=document.getElementById('movDiaSel'); if(!s||!s.options[2]) return 1; s.value=s.options[2].value; s.onchange(); return 1; })()`);
    await pausa(250);
    const d2 = await evaluar(cli, `(()=>{ var g=document.getElementById('gList'); var v='${''}'+window._movPeriodo;
      var p=v.slice(6).split('-'); var dmy=p[2]+'/'+p[1]+'/'+p[0];
      var metas=[].slice.call(g.querySelectorAll('.gl-meta')).map(function(m){return m.textContent;});
      return { per:v, filas:metas.length, todas: metas.length>0 && metas.every(function(m){return m.indexOf(dmy)===0;}), hdr:(g.firstElementChild||{}).textContent||'' }; })()`);
    chk('elegir un dia deja solo ese dia (15 movimientos)', d2.todas === true && d2.filas === 15 && /15 movimientos/.test(d2.hdr), d2);
    await evaluar(cli, `(()=>{ var s=document.getElementById('movDiaSel'); if(!s) return 1; s.value=''; s.onchange(); return 1; })()`);

    /* ── Invertir: la Posicion total no sube mientras vuelve la caja ── */
    await evaluar(cli, `(()=>{ toggleInvertir(); document.getElementById('invMonto').value='100000'; window.__posts=[]; guardarInvertir(); return 1; })()`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='invertir';})`, 5000);
    await pausa(700);
    const inv = await evaluar(cli, `(()=>{ var c=[].slice.call(document.querySelectorAll('#cBal .bal-card')).map(function(x){return x.textContent.replace(/\\s+/g,' ');}); return { mp:c[1]||'', total:c[3]||'', veces:window.__cajaVeces }; })()`);
    chk('antes de que vuelva la caja (15 s), la Posicion total sigue en $7.400.000', /7\.400\.000/.test(inv.total), inv);
    chk('y Mercado Pago baja a $5.000.000 con Inversiones en $600.000', /5\.000\.000/.test(inv.mp) && /600\.000/.test(inv.mp), inv.mp);

    /* ── El monto se lee en castellano ── */
    const pm = await evaluar(cli, `[parseM('150.000'), parseM('1.250.000'), parseM('1.500,50'), parseM('12.5'), parseM('150000'), parseM('$ 35.600')]`);
    chk('"150.000" es 150000 y "1.250.000" es 1250000', pm[0] === 150000 && pm[1] === 1250000, pm);
    chk('"1.500,50" es 1500,5 · "12.5" sigue siendo 12,5 · "150000" y "$ 35.600" bien', pm[2] === 1500.5 && pm[3] === 12.5 && pm[4] === 150000 && pm[5] === 35600, pm);
    await evaluar(cli, `(()=>{ toggleCajaForm('gasto'); document.getElementById('gCat').value='Otro'; document.getElementById('gCon').value='Prueba'; document.getElementById('gEf').value='150.000'; window.__posts=[]; guardarGasto({preventDefault:function(){}}); return 1; })()`);
    await esperar(cli, `window.__posts.length>0`, 5000);
    const pg = await evaluar(cli, `window.__posts[0]||null`);
    chk('un gasto de "150.000" en efectivo viaja como 150000', !!pg && pg.action === 'gasto' && Number(pg.montoEf) === 150000, pg);
    await pausa(400);
    const opt = await evaluar(cli, `(()=>{ var m=(D.movimientos||[])[0]||{}; return { ts: typeof m.ts, cta: m.cta, con: m.con, primero: ((document.querySelector('#gList .gl-con')||{}).textContent||'') }; })()`);
    chk('el gasto recien cargado tiene hora y cuenta, y queda ARRIBA de la lista', opt.ts === 'number' && opt.cta === 'efectivo' && /Prueba/.test(opt.primero), opt);
    await evaluar(cli, `(()=>{ if(!document.getElementById('formGasto').classList.contains('hidden')) toggleCajaForm('gasto'); return 1; })()`);

    /* ── La fecha del formulario, en una app abierta desde hace dias ── */
    const fch = await evaluar(cli, `(()=>{ window._fechaCajaInit='01/01/2020'; document.getElementById('iFecha').value='01/01/2020';
      toggleCajaForm('ingreso'); var a=document.getElementById('iFecha').value; toggleCajaForm('ingreso');
      window._fechaCajaInit='01/01/2020'; document.getElementById('iFecha').value='02/02/2020';
      toggleCajaForm('ingreso'); var b=document.getElementById('iFecha').value; toggleCajaForm('ingreso'); return {a:a,b:b}; })()`);
    const n = new Date(), hoyTxt = pad(n.getDate()) + '/' + pad(n.getMonth() + 1) + '/' + n.getFullYear();
    chk('si nadie toco la fecha, al abrir el ingreso pasa a hoy', fch.a === hoyTxt, fch);
    chk('si la cambiaron a mano, no se la pisa', fch.b === '02/02/2020', fch);

    /* ── Formularios de a uno ── */
    const forms = await evaluar(cli, `(()=>{ var h=function(id){return document.getElementById(id).classList.contains('hidden');};
      if(h('invertirForm')) toggleInvertir(); toggleMover(); var r={inv:h('invertirForm'), mov:h('moverForm')}; toggleMover(); return r; })()`);
    chk('abrir Mover cierra Invertir', forms.inv === true && forms.mov === false, forms);

    /* ── El aviso del ajuste ── */
    const aj = await evaluar(cli, `(()=>{ toggleAjuste(); var c=_calcSaldo(); document.getElementById('ajCF').value=''; document.getElementById('ajBil').value=String(Math.round(c.bil)); chkAjuste();
      var w=document.getElementById('ajWarn').classList.contains('hidden'); document.getElementById('ajBil').value=''; toggleAjuste(); return w; })()`);
    chk('contar solo la billetera (igual a lo calculado) no avisa una diferencia falsa', aj === true, aj);

    /* ── Sobres ── */
    const sob = await evaluar(cli, `(()=>{ toggleSobres(); var t=document.getElementById('sobresList').textContent; var x=window.__xss; toggleSobres(); return {t:t, xss:x===1, img:!!document.querySelector('#sobresList img')}; })()`);
    chk('el nombre del sobre va escapado (no se ejecuta ni dibuja un <img>)', sob.xss === false && sob.img === false && /<img/.test(sob.t), sob);

    /* ── La clase del monto ── */
    const gm = await evaluar(cli, `(()=>{ var e=document.querySelector('#gList .gl-m'); if(!e) return null; var cs=getComputedStyle(e); return {ws:cs.whiteSpace, fw:cs.fontWeight}; })()`);
    chk('el monto de cada movimiento tiene su estilo (no se parte en dos renglones)', !!gm && gm.ws === 'nowrap' && Number(gm.fw) >= 700, gm);

    /* ── Analisis de Cobranzas ── */
    const cob = await evaluar(cli, `(()=>{ window._cobrOpen=true; rCobranzas(); var b=document.getElementById('cobranzasCard'); return b?b.textContent.replace(/\\s+/g,' '):''; })()`);
    const fmt = x => Math.round(x).toLocaleString('es-AR');
    chk('Analisis de Cobranzas no cuenta los vueltos (entro $' + fmt(ENTRO_ESPERADO) + ')', cob.indexOf('$' + fmt(ENTRO_ESPERADO)) >= 0, cob.slice(0, 200));
    chk('y lo dice: "No cuenta ' + nVueltos + ' vueltos"', cob.indexOf('No cuenta ' + nVueltos + ' vueltos') >= 0, cob.slice(-260));
    chk('ya no dice "sobra"/"falta" sobre toda la historia', !/sobra \$|falta \$|queda \$/.test(cob), cob.slice(-400));

    /* ── Pagos usa el mismo select ── */
    await evaluar(cli, `go('egresos'); 1`);
    await esperar(cli, `!!document.getElementById('egrDiaSel') || document.querySelectorAll('#p-egresos input[type=date]').length>0`, 8000);
    const eg = await evaluar(cli, `({ sel: !!document.getElementById('egrDiaSel'), fechas: document.querySelectorAll('#p-egresos input[type=date]').length })`);
    chk('Pagos tampoco tiene <input type="date"> y usa el select de dia', eg.sel === true && eg.fechas === 0, eg);
    await evaluar(cli, `go('caja'); 1`);
    await pausa(300);

    /* ── Escritorio: el concepto no queda a un metro de su monto ── */
    if (ANCHO >= 1100) {
      const an = await evaluar(cli, `(()=>{ var g=document.getElementById('gList'), e=document.getElementById('efManoCard'); return { g:Math.round(g.getBoundingClientRect().width), e:Math.round(e.getBoundingClientRect().width) }; })()`);
      chk('a 1440 la lista y Efectivo en mano van a un ancho de lectura (880 px o menos)', an.g <= 880 && an.e <= 880 && an.g > 500, an);
    }

    /* ── Volver a la app estando en Caja pide SOLO la caja ── */
    await pausa(16000);   // que vuelvan los recargas en vuelo (15 s)
    const rf = await evaluar(cli, `(()=>{ window.__gets=[]; var dn=Date.now; Date.now=function(){return dn()+100000;};
      try{ window._refrescarSiEstaViejo(); } finally { Date.now=dn; } return 1; })()`);
    await pausa(400);
    const gets = await evaluar(cli, `window.__gets.slice()`);
    chk('volver a la app estando en Caja pide solo cajaLight (no pedidos, cobros ni OCs)', gets.length === 1 && gets[0] === 'cajaLight', gets);

    /* ── Celular: nada se sale ── */
    const desb = await evaluar(cli, `document.documentElement.scrollWidth - window.innerWidth`);
    chk('la pagina no se desborda a lo ancho', desb <= 1, desb);

    /* ── La cuarta copia de la formula vieja de la caja (Cierre) ── */
    const html = fs.readFileSync(path.join(__dirname, '..', '..', APP), 'utf8');
    const viejas = (html.match(/Number\(sb\.mp\|\|0\)\+Number\(cj\.cobradoMP\|\|0\)/g) || []).length;
    chk('la formula vieja de la caja queda solo en el fallback de _saldoLiquido (1)', viejas === 1, viejas);

    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
  } catch (e) {
    console.log('  REVENTO: ' + (e && e.message || e)); mal++;
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  salir(mal ? 1 : 0);
})();
