/* La tab Caja rediseñada (5/10/2026). Backend STUBBEADO con datos inventados:
   no toca produccion ni necesita token.

   node probar_caja_rediseno.js [390|1440]
   BASE=http://localhost:8113 node probar_caja_rediseno.js 1440
   FOTO=ruta.png  → guarda una captura de la pantalla entera

   Sostiene:
   · los saldos: lo mio grande (billetera y sin guardar, con "Guardé lo
     cobrado"), lo del otro chico, la caja fuerte con sus reservas;
   · compu: saldos en una columna fija de 380px a la izquierda del libro;
     celular: los 4 botones en una barra fija al pie;
   · el libro: una semana por vez, renglones de 2 lineas, de que lugar sale
     cada movimiento, los traspasos adentro, el encabezado del dia con quien
     cobro cuanto en efectivo y sus avisos; ‹ › cambia de semana; buscar mira
     toda la historia; Efectivo / Digital / persona filtran;
   · los 4 botones abren su formulario (y cierran los otros);
   · el Analisis de Cobranzas esta en Ventas > COBROS y ya no en Caja;
   · sin errores de JS y nada desborda a lo ancho. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const fs = require('fs');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 500) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const T = 'Tadeo Ustariz', L = 'Lucas Moresco';
const pad = n => String(n).padStart(2, '0');
const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
// El lunes de esta semana: lo de "la semana pasada" va 3 dias antes de el.
const lun = new Date(hoy); lun.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
const dia = (base, dd, h, m) => { const d = new Date(base); d.setDate(d.getDate() + dd); d.setHours(h, m, 0, 0); return d; };
const fmt = d => pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
const mov = (d, o) => Object.assign({ f: fmt(d), ts: d.getTime(), not: '' }, o);
const dHoy = (h, m) => dia(hoy, 0, h, m);
const MOVS = [
  mov(dHoy(13, 53), { tipo: 'cobro', cat: 'COBRO Home', con: 'Agus #1071', hoja: 'Home', pedido: '1071', met: 'Efectivo', cta: 'efectivo', $: 123136, q: T }),
  mov(dHoy(14, 10), { tipo: 'cobro', cat: 'COBRO Home', con: 'Flor #1072', hoja: 'Home', pedido: '1072', met: 'Mercado Pago', cta: 'mp', $: 50000 }),
  mov(dHoy(15, 0), { tipo: 'cobro', cat: 'COBRO Pilar', con: 'Juana #P-88', hoja: 'Pilar', pedido: 'P-88', met: 'Efectivo', cta: 'efectivo', $: 42000, q: L }),
  mov(dHoy(21, 0), { tipo: 'gasto', cat: 'Proveedor', con: 'Pago Proveedor Uno', met: 'Efectivo', cta: 'efectivo', $: 446800, r: 40, lug: 'cf', noBorrar: 'proveedor' }),
  mov(dHoy(18, 0), { tipo: 'gasto', cat: 'Otro', con: 'Nafta', met: 'Efectivo', cta: 'efectivo', $: 12000, r: 41, lug: 'bil:' + T }),
  mov(dHoy(12, 0), { tipo: 'ingreso', cat: 'Rendimientos', con: 'Rendimiento Brubank', met: 'Brubank Prueba', cta: 'brubank', $: 9000, r: 12 }),
  mov(dia(lun, -3, 11, 0), { tipo: 'gasto', cat: 'Otro', con: 'Gasto de la semana pasada', met: 'Efectivo', cta: 'efectivo', $: 5000, r: 30 }),
  mov(dia(lun, -9, 11, 0), { tipo: 'gasto', cat: 'Imprenta/Diseño', con: 'Imprenta Lejana', met: 'Mercado Pago', cta: 'mp', $: 7000, r: 20 })
];
const TRASP = [
  mov(dHoy(20, 30), { tipo: 'traspaso', desde: 'cob:' + T, hacia: 'cf', $: 40000, q: T })
];
const fHoy = pad(hoy.getDate()) + '/' + pad(hoy.getMonth() + 1) + '/' + hoy.getFullYear();
const EFMANO = [{ f: fHoy, entro: 165136, salio: 0, neto: 165136, cobrado: 165136,
  porQuien: [{ q: T, e: 123136, s: 0, n: 1 }, { q: L, e: 42000, s: 0, n: 1 }],
  det: [], _det: [{ c: 'Cliente Raro', rec: 10000, vto: 0, cobro: 9000 }] }];
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital' }
];
const SB = { ef: 1000000, mp: 5000000, bil: 35000, sob: 0, inv: 500000, fecha: '05/10 20:14',
  porCuenta: { efectivo: 1000000, mp: 5000000, brubank: 500000 }, sinContar: [] };
const LUG = { activo: true, personas: [T, L],
  bil: { [T]: 20000, [L]: 15000 }, cob: { '': 0, [T]: 120000, [L]: 80000 },
  cf: 900000, reservas: [{ id: 'R-abc12345', prov: 'Proveedor Uno', monto: 300000 }],
  reservado: 300000, cfLibre: 600000, total: 1135000, efVivo: 1135000, descuadre: 0, movsUlt: [] };
const CAJA = {
  ts: 1,
  caja: { cobradoEf: 135000, cobradoMP: 0, gastosEf: 0, gastosMP: 0, ingresosEf: 0, ingresosMP: 0,
    cobradoPorCuenta: { efectivo: 135000 }, gastosPorCuenta: {}, ingresosPorCuenta: {}, cuentas: CUENTAS },
  saldoBase: SB, gastos: [], ingresos: [], gastosHist: {}, movimientos: MOVS, traspasos: TRASP, sobres: [], efMano: EFMANO,
  proveedores: ['Proveedor Uno'], lugares: LUG, cajaMode: true
};

const stub = `
  (function(){
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v3'); localStorage.setItem('maleu_tab','caja'); }catch(e){}
    window.__posts=[];
    var CAJA=${JSON.stringify(CAJA)};
    var o = window.fetch; window.fetch = function(u, x){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
      var resp = function(obj, ms){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}})); }, ms); }); };
      if (x && String(x.method||'').toUpperCase()==='POST') { try{ window.__posts.push(JSON.parse(x.body)); }catch(e){} return resp({ok:true}, 30); }
      var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
      if (a==='cajaLight') return resp(CAJA, 150);
      if (a==='admin') return resp(Object.assign({}, CAJA, {pedidos:[],canales:[],stock:[],oc:{lista:[]}}), 99999);
      if (a==='pedidosLight') return resp({ts:1, pedidos:[], canales:[], light:true}, 100);
      if (a==='ventas') return resp({ok:true, ventas:[]}, 100);
      return resp({ok:false, error:'stub'}, 100);
    };
  })();`;

const txt = (cli, sel) => evaluar(cli, `((document.querySelector(${JSON.stringify(sel)})||{}).textContent||'').replace(/\\s+/g,' ')`);
const filas = cli => evaluar(cli, `[].slice.call(document.querySelectorAll('#gList .cj-r')).map(function(r){return r.textContent.replace(/\\s+/g,' ').trim();})`);
const visible = (cli, id) => evaluar(cli, `(function(){var f=document.getElementById(${JSON.stringify(id)});return !!(f&&!f.classList.contains('hidden')&&f.getBoundingClientRect().height>0);})()`);

(async () => {
  const cli = await abrir();
  const errores = [];
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
    const alto = ANCHO <= 560 ? 844 : 900;
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: alto, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Caja rediseñada · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + stub });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  la app no arranco'); salir(1); }
    await evaluar(cli, `go('caja'); 1`);
    if (!await esperar(cli, `document.querySelectorAll('#gList .cj-r').length>0 && !!document.querySelector('#cBal .cj-ef')`, 30000)) {
      console.log('  la caja nueva no se dibujo (sin esto, lo de abajo no mide nada)'); salir(1);
    }
    /* `?prueba=1` loguea a "Modo Prueba", que no tiene billetera: se le pone el
       nombre de Tadeo para ver lo que ve el. */
    /* Al terminar de arrancar la app vuelve a la tab guardada: se espera a que
       eso pase y se entra a Caja de nuevo, o todo lo que sigue mide una tab
       escondida (alto 0) y miente. */
    await pausa(2500);
    await evaluar(cli, `go('caja'); 1`);
    if (!await esperar(cli, `document.getElementById('p-caja').classList.contains('on') && document.querySelector('#p-caja .cj-izq').getBoundingClientRect().width>0`, 15000)) {
      console.log('  Caja no quedo visible'); salir(1);
    }
    await evaluar(cli, `SESSION.nombre=${JSON.stringify(T)}; rCaja(); 1`); await pausa(150);

    /* ── Saldos ── */
    const mio = await txt(cli, '#cBal .cj-mio'), otro = await txt(cli, '#cBal .cj-otro');
    chk('lo mio: "Lo mío · Tadeo" con billetera $20.000 y sin guardar $120.000', /Lo mío · Tadeo/.test(mio) && /20\.000/.test(mio) && /120\.000/.test(mio), mio);
    chk('lo mio trae "Guardé lo cobrado"', /Guardé lo cobrado/.test(mio), mio);
    chk('lo de Lucas en chico: 👛 $15.000 · 💰 $80.000', /Lucas/.test(otro) && /15\.000/.test(otro) && /80\.000/.test(otro), otro);
    const tam = await evaluar(cli, `({mio:parseFloat(getComputedStyle(document.querySelector('#cBal .cj-mio-g b')).fontSize), otro:parseFloat(getComputedStyle(document.querySelector('#cBal .cj-otro span:last-child')).fontSize)})`);
    chk('lo mio es grande y lo del otro chico (letra al menos el doble)', tam.mio >= 2 * tam.otro, tam);
    const ef = await txt(cli, '#cBal .cj-ef');
    chk('caja fuerte $900.000', /Caja fuerte\s*\$900\.000/.test(ef), ef);

    /* ── Layout ── */
    if (ANCHO >= 1000) {
      const lay = await evaluar(cli, `(function(){var i=document.querySelector('#p-caja .cj-izq').getBoundingClientRect(),d=document.querySelector('#p-caja .cj-der').getBoundingClientRect();return {iw:Math.round(i.width),ix:Math.round(i.left),dx:Math.round(d.left),pos:getComputedStyle(document.querySelector('#p-caja .cj-izq')).position};})()`);
      chk('compu: saldos en una columna de 380px a la izquierda del libro', lay.iw === 380 && lay.ix < lay.dx, lay);
      chk('compu: la columna de saldos queda fija (sticky)', lay.pos === 'sticky', lay);
      chk('compu: el detalle de cuentas se ve sin tocar nada', /Brubank Lucas/.test(await txt(cli, '#cBal .cj-dig')) && await evaluar(cli, `document.querySelector('#cBal .cj-dig .cj-abre').getBoundingClientRect().height>0`) === true);
    } else {
      const bar = await evaluar(cli, `(function(){var a=document.getElementById('cjAcc'),r=a.getBoundingClientRect();return {pos:getComputedStyle(a).position,abajo:Math.round(innerHeight-r.bottom),botones:a.querySelectorAll('button').length,alto:Math.round(r.height)};})()`);
      chk('celular: los 4 botones en una barra fija al pie', bar.pos === 'fixed' && bar.abajo === 0 && bar.botones === 4, bar);
      chk('celular: las cuentas digitales plegadas en una linea', await evaluar(cli, `document.querySelector('#cBal .cj-dig .cj-abre').getBoundingClientRect().height===0`) === true);
      await evaluar(cli, `document.querySelector('#cBal .cj-plega').click(); 1`); await pausa(100);
      chk('celular: tocando la linea se abren', await evaluar(cli, `document.querySelector('#cBal .cj-dig .cj-abre').getBoundingClientRect().height>0`) === true);
      await evaluar(cli, `document.querySelector('#cBal .cj-plega').click(); 1`);
      const chicos = await evaluar(cli, `[].slice.call(document.querySelectorAll('#cjAcc button, #cjLibroBar button, #cjSemBar button')).filter(function(b){var r=b.getBoundingClientRect();return r.width>0&&r.height<34;}).map(function(b){return b.textContent.trim()+':'+Math.round(b.getBoundingClientRect().height);})`);
      chk('celular: ningun boton del libro ni de la barra mide menos de 34px', chicos.length === 0, chicos);
    }

    /* ── El libro: esta semana ── */
    let fs1 = await filas(cli);
    chk('esta semana: 7 renglones (6 movimientos + 1 traspaso)', fs1.length === 7, fs1);
    chk('lo de la semana pasada no aparece', !fs1.some(f => /semana pasada|Imprenta Lejana/.test(f)), fs1);
    chk('cada renglon tiene 2 lineas', await evaluar(cli, `[].slice.call(document.querySelectorAll('#gList .cj-r')).every(function(r){return r.querySelector('.cj-r1')&&r.querySelector('.cj-r2');})`) === true);
    const gasto = fs1.find(f => /Pago Proveedor Uno/.test(f)) || '';
    chk('el gasto en efectivo dice de que lugar sale (caja fuerte)', /sale de 🔒 Caja fuerte/.test(gasto), gasto);
    const nafta = fs1.find(f => /Nafta/.test(f)) || '';
    chk('el de la billetera dice "sale de 👛 Billetera Tadeo"', /sale de 👛 Billetera Tadeo/.test(nafta), nafta);
    const tr = fs1.find(f => /Guardé lo cobrado/.test(f)) || '';
    chk('el traspaso esta en el libro: 💰 Sin guardar Tadeo → 🔒 Caja fuerte', /Sin guardar Tadeo → 🔒 Caja fuerte/.test(tr) && /40\.000/.test(tr), tr);
    const cobro = fs1.find(f => /Agus/.test(f)) || '';
    chk('el cobro en efectivo dice quien lo cobro y la hora', /cobró Tadeo/.test(cobro) && /13:53/.test(cobro), cobro);
    const dig = fs1.find(f => /Flor/.test(f)) || '';
    chk('el cobro digital dice la cuenta', /Mercado Pago Tadeo/.test(dig), dig);
    const cab = await txt(cli, '#gList .cj-dia');
    chk('encabezado del dia: quien cobro cuanto en efectivo', /cobró Tadeo \$123\.136 · Lucas \$42\.000/.test(cab), cab);
    chk('encabezado del dia: el aviso del cobro que no cierra', /no cierra/.test(cab), cab);
    const sem = await txt(cli, '#cjSemBar');
    chk('la barra dice "Esta semana" y entró / salió', /Esta semana/.test(sem) && /entró/.test(sem) && /salió/.test(sem), sem);
    chk('el traspaso no suma a entró ni a salió (salió = $458.800)', /salió \$458\.800/.test(sem), sem);

    /* ── Semana anterior ── */
    await evaluar(cli, `document.querySelector('#cjSemBar .cj-nav').click(); 1`); await pausa(150);
    fs1 = await filas(cli);
    chk('‹ trae la semana pasada (y solo eso)', fs1.length === 1 && /semana pasada/.test(fs1[0]), fs1);
    await evaluar(cli, `cjLibro('sem',-1); 1`); await pausa(100);

    /* ── Filtros ── */
    await evaluar(cli, `document.querySelector('#cjLibroBar button[data-met="ef"]').click(); 1`); await pausa(100);
    fs1 = await filas(cli);
    chk('Efectivo: sin lo digital y con el traspaso', !fs1.some(f => /Flor|Brubank/.test(f)) && fs1.some(f => /Guardé lo cobrado/.test(f)), fs1);
    await evaluar(cli, `document.querySelector('#cjLibroBar button[data-met="dig"]').click(); 1`); await pausa(100);
    fs1 = await filas(cli);
    chk('Digital: solo lo digital', fs1.length === 2 && fs1.every(f => /Flor|Brubank/.test(f)), fs1);
    await evaluar(cli, `document.querySelector('#cjLibroBar button[data-met="dig"]').click(); 1`); await pausa(100);
    await evaluar(cli, `document.querySelector('#cjPers button[data-per="${L}"]').click(); 1`); await pausa(100);
    fs1 = await filas(cli);
    chk('Lucas: su cobro y su cuenta (Juana, Brubank Lucas), nada de Tadeo', fs1.length === 2 && fs1.some(f => /Juana/.test(f)) && fs1.some(f => /Brubank/.test(f)), fs1);
    const yoBtn = await evaluar(cli, `document.querySelector('#cjPers button').textContent`);
    chk('el primer boton de persona es "Yo"', yoBtn === 'Yo', yoBtn);
    await evaluar(cli, `document.querySelector('#cjPers button[data-per="${L}"]').click(); 1`); await pausa(100);

    /* ── Buscar en toda la historia ── */
    await evaluar(cli, `(function(){var i=document.getElementById('cjBusq');i.focus();i.value='imprenta';i.dispatchEvent(new Event('input'));return 1;})()`);
    await pausa(450);
    fs1 = await filas(cli);
    chk('buscar encuentra lo de hace dos semanas', fs1.length === 1 && /Imprenta Lejana/.test(fs1[0]), fs1);
    chk('y el buscador no pierde el foco al repintar', await evaluar(cli, `document.activeElement&&document.activeElement.id==='cjBusq'`) === true);
    await evaluar(cli, `(function(){var i=document.getElementById('cjBusq');i.value='';i.dispatchEvent(new Event('input'));return 1;})()`);
    await pausa(450);

    /* ── Los 4 botones ── */
    for (const [a, id] of [['gasto', 'formGasto'], ['ingreso', 'formIngreso'], ['mover', 'lugMoverForm'], ['contar', 'ajusteForm']]) {
      await evaluar(cli, `cjAccion('${a}'); 1`); await pausa(150);
      const otros = await evaluar(cli, `['formGasto','formIngreso','lugMoverForm','ajusteForm'].filter(function(x){return x!=='${id}'&&!document.getElementById(x).classList.contains('hidden');})`);
      chk('el boton ' + a + ' abre su formulario y cierra los otros', await visible(cli, id) === true && otros.length === 0, otros);
    }
    await evaluar(cli, `cjAccion('contar'); 1`); await pausa(100);

    const desb = await evaluar(cli, `document.documentElement.scrollWidth-document.documentElement.clientWidth`);
    chk('nada desborda a lo ancho', desb <= 0, desb);
    if (process.env.FOTO) {
      await evaluar(cli, `window.scrollTo(0,0); 1`); await pausa(200);
      const alt = await evaluar(cli, `Math.min(4000, document.documentElement.scrollHeight)`);
      const shot = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: ANCHO >= 1000 ? false : true, clip: { x: 0, y: 0, width: ANCHO, height: ANCHO >= 1000 ? alto : Math.min(alt, 2200), scale: 1 } });
      fs.writeFileSync(process.env.FOTO, Buffer.from(shot.data, 'base64'));
    }

    /* ── Cobranzas a Ventas ── */
    chk('Caja ya no tiene el Análisis de Cobranzas', await evaluar(cli, `!document.querySelector('#p-caja #cobranzasCard')`) === true);
    await evaluar(cli, `go('ventas'); vSwitchTab('cobros'); 1`); await pausa(300);
    const cob = await evaluar(cli, `(function(){var b=document.getElementById('cobranzasCard');return {txt:b?b.textContent:'',alto:b?b.getBoundingClientRect().height:0};})()`);
    chk('Ventas > COBROS muestra el Análisis de Cobranzas', /Análisis de Cobranzas/.test(cob.txt) && cob.alto > 0, cob);
    await evaluar(cli, `vSwitchTab('ventas'); 1`); await pausa(100);
    chk('y Ventas > VENTAS no', await evaluar(cli, `document.getElementById('cobranzasCard').getBoundingClientRect().height===0`) === true);

    const err = await evaluar(cli, `JSON.stringify(window.__err||[])`);
    chk('sin errores de JS', errores.length === 0 && err === '[]', { errores, err });
  } catch (e) {
    console.log('  REVENTO: ' + (e && e.stack || e)); mal++;
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
  salir(mal ? 1 : 0);
})();
