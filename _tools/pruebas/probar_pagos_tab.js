/* La tab Pagos (egresos) y el pago a proveedor de Abastecimiento (13/9/2026,
   la primera corrida de /auditoria).

   node probar_pagos_tab.js [390|1440]
   APP=app_viejo_tmp.html node probar_pagos_tab.js 390    ← la direccion contraria

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). Sin token.
   Sostiene:
   · Gastos no suma los vueltos, y lo dice;
   · un mes EN CURSO se compara contra los mismos dias del anterior, no contra el
     mes entero (septiembre al 13 contra agosto entero decia −68% y era +25%);
   · la semana 1 se compara contra la 53 cuando el año anterior la tiene;
   · un pago partido en efectivo + transferencia a la misma hora es UN pago, sin
     "seña" ni "saldo", y el ticket promedio divide por pagos;
   · "Pago a Le Unike" y "le unike" son un solo proveedor, y "Pago Alfajores" no
     pierde la A;
   · lo que viene de la planilla no se ejecuta como HTML;
   · el buscador deja escribir espacios y mayusculas, tecla por tecla;
   · el ↻ en Pagos pide solo la caja;
   · en Caja, elegir la categoria Proveedor avisa que la deuda no baja;
   · en Abastecimiento → Pagos, con dos cuentas digitales, una transferencia pide
     de cual salio, no deja confirmar sin elegir, y el POST lleva la cuenta;
   · minimo tactil y nada desbordado. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

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

/* ── Fechas relativas a HOY, para que el test de lo mismo cualquier dia ── */
const hoy = new Date(); hoy.setHours(10, 0, 0, 0);
const p2 = n => String(n).padStart(2, '0');
const dmy = (d, h) => p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + (h ? ' ' + h : '');
const mk = (d, h, cat, con, met, $, not) => {
  const [hh, mm] = (h || '10:00').split(':').map(Number);
  const x = new Date(d); x.setHours(hh, mm, 0, 0);
  return { tipo: 'gasto', f: dmy(x, h), ts: x.getTime(), cat, con, met, $, not: not || '' };
};
const diaHoy = hoy.getDate();
const iniMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
const antDia1 = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
const ultAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
const hayFueraDelCorte = diaHoy < ultAnt.getDate();
const antFuera = new Date(hoy.getFullYear(), hoy.getMonth() - 1, Math.min(diaHoy + 1, ultAnt.getDate()));
const mesKey = hoy.getFullYear() + '-' + p2(hoy.getMonth() + 1);

const MOVS = [
  // este mes: compras
  mk(iniMes, '11:20', 'Proveedor', 'Pago a Le Unike', 'Efectivo', 30000),
  mk(iniMes, '11:20', 'Proveedor', 'Pago a Le Unike', 'Brubank Lucas', 70000),      // mismo pago, otro metodo
  mk(hoy, '09:00', 'Proveedor', 'le unike', 'Mercado Pago', 50000),                    // mismo proveedor, escrito distinto
  mk(hoy, '09:30', 'Proveedor', 'Pago Alfajores Sur', 'Mercado Pago', 12000),
  mk(hoy, '09:40', ' PROVEEDOR ', 'Pago a Otro <img src=x onerror="window.__xss=1">', 'Efectivo', 5000, '<b>nota</b>'),
  // este mes: gastos y vueltos
  mk(iniMes, '12:00', 'Nafta', 'YPF', 'Mercado Pago', 40000),
  mk(hoy, '08:00', 'Sueldo', 'Lucas', 'Mercado Pago', 60000),
  mk(hoy, '08:30', 'Cambio cruzado', 'Vuelto por transferencia — Cliente Uno #901', 'Mercado Pago', 7000),
  mk(hoy, '08:31', 'Cambio cruzado', 'Vuelto por transferencia — Cliente Dos #902', 'Mercado Pago', 3000),
  // mes anterior: el dia 1 (dentro del corte) y despues de hoy (fuera)
  mk(antDia1, '10:00', 'Proveedor', 'Pago a Le Unike', 'Mercado Pago', 80000),
  mk(antFuera, '10:00', 'Proveedor', 'Pago a Le Unike', 'Mercado Pago', hayFueraDelCorte ? 900000 : 0),
  mk(antDia1, '10:05', 'Nafta', 'YPF', 'Mercado Pago', 20000),
  // semana 53 de 2026 y semana 1 de 2027
  mk(new Date(2026, 11, 29), '10:00', 'Herramienta', 'Sem53', 'Mercado Pago', 53000),
  mk(new Date(2027, 0, 5), '10:00', 'Herramienta', 'Sem1', 'Mercado Pago', 10000)
];
// 9 proveedores mas, para que aparezca el buscador (>8 grupos)
['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'].forEach((x, i) =>
  MOVS.push(mk(new Date(2026, 6, 10 + i), '10:00', 'Proveedor', 'Pago a Prov ' + x, 'Mercado Pago', 1000)));

const CAJA = { ts: 1, caja: { ef: 0, mp: 0 }, saldoBase: {}, gastos: [], ingresos: [], gastosHist: [], movimientos: MOVS, efMano: [],
  cuentas: [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 'B', def: false },
            { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 'C', def: true, inv: true },
            { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', col: 'G', def: false }] };
const LIGHT = { ts: 1, pedidos: [], canales: [], light: true };
const BUSQ = (dos) => ({ ts: 1, provs: [], clientes: [], total: 0, ocs: [], semActual: 37, anioActual: 2026, stocksProductos: {}, enPoderVend: [],
  deudas: [{ n: 'Proveedor Prueba', total: 100000, original: 100000, pagado: 0, semanas: [], libres: [] }],
  cuentas: dos ? CAJA.cuentas : CAJA.cuentas.filter(c => c.id !== 'brubank') });

const EXTRA = `
  (function(){
    var fase=(location.search.match(/fase=([a-z])/)||[])[1]||'a';
    window.__fase=fase; window.__gets=[]; window.__posts=[];
    /* La copia de Abastecimiento se borra: si no, la fase c pinta el formulario con las
       cuentas de la fase a antes de que llegue la respuesta nueva. */
    try{ localStorage.removeItem('maleu_busqueda'); localStorage.removeItem('ma3'); localStorage.removeItem('ma3v2'); localStorage.setItem('maleu_tab','egresos'); localStorage.setItem('maleu_egr_sub','gastos'); localStorage.setItem('maleu_egr_viewby','cat'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')>-1&&post){ try{ window.__posts.push(JSON.parse(x.body)); }catch(e){ window.__posts.push({crudo:String(x.body)}); }
        return Promise.resolve(new Response('{"ok":true,"total":1,"filas":1}',{status:200,headers:{'Content-Type':'application/json'}})); }
      if(url.indexOf('script.google.com')>-1){
        var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
        var cuerpo = a==='cajaLight' ? ${JSON.stringify(CAJA)}
          : a==='pedidosLight' ? ${JSON.stringify(LIGHT)}
          : a==='admin' ? Object.assign({}, ${JSON.stringify(LIGHT)}, ${JSON.stringify(CAJA)}, {oc:{lista:[]}, stock:[]})
          : a==='busqueda' ? (fase==='c' ? ${JSON.stringify(BUSQ(false))} : ${JSON.stringify(BUSQ(true))})
          : a==='ocLight' ? {ok:true,oc:{lista:[]}} : a==='cobrosPendientes' ? {ok:true,cobros:[]}
          : {ok:false,error:'stub'};
        var txt=JSON.stringify(cuerpo);
        return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); },150); });
      }
      return o.apply(this,arguments); };
  })();
`;

const KPI = `(()=>{ var o={}; document.querySelectorAll('#egrKpi .card').forEach(function(c){ var l=c.querySelector('.kl'),v=c.querySelector('.kv');
  if(l)o[l.textContent.trim()]={v:v?v.textContent:'', s:[].map.call(c.querySelectorAll('.ks'),function(x){return x.textContent;})}; }); return o; })()`;
const num = t => Number(String(t || '').replace(/[^\d]/g, '')) || 0;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async fase => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&fase=' + fase });
    if (!await esperar(cli, `typeof go==='function' && window.__fase===${JSON.stringify(fase)}`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Pagos · ' + ANCHO + 'px · ' + APP + ' ==');

    await ir('a');
    await evaluar(cli, `go('egresos'); 1`);
    if (!await esperar(cli, `window.D && Array.isArray(D.movimientos) && D.movimientos.length>20 && document.querySelector('#egrKpi .card')`, 30000)) {
      console.log('  la tab no pinto (sin esto lo de abajo no mide nada)'); salir(1);
    }

    /* ── Gastos del mes ── */
    await evaluar(cli, `egrSwitch('gastos'); window._egrPeriodo='mes:${mesKey}'; rEgresos(); 1`);
    let k = await evaluar(cli, KPI);
    chk('Gastos del mes = Nafta + Sueldo ($100.000), sin los vueltos', num(k['Total Gastos'] && k['Total Gastos'].v) === 100000, k['Total Gastos']);
    chk('y lo dice: "No incluye 2 vueltos ($10.000)"', !!k['Total Gastos'] && k['Total Gastos'].s.some(x => /No incluye 2 vueltos \(\$10\.000\)/.test(x)), k['Total Gastos'] && k['Total Gastos'].s);
    const cats = await evaluar(cli, `[].map.call(document.querySelectorAll('#egrBreakdown .card'),function(c){return c.textContent})`);
    chk('ningun grupo "Cambio cruzado" en el desglose', !cats.some(c => /Cambio cruzado/i.test(c)), cats);
    chk('Gastos vs los mismos dias del mes anterior (Nafta del dia 1: $20.000, +400%)', !!k['Total Gastos'] && k['Total Gastos'].s.some(x => /\+400% vs el 1 al \d+ de/.test(x) && /20\.000/.test(x)), k['Total Gastos'] && k['Total Gastos'].s);

    /* ── Compras del mes ── */
    await evaluar(cli, `egrSwitch('compras'); window._egrPeriodo='mes:${mesKey}'; rEgresos(); 1`);
    k = await evaluar(cli, KPI);
    const tc = k['Total Compras'] || { v: '', s: [] };
    chk('Compras del mes: $167.000 en 4 pagos (el partido cuenta uno)', num(tc.v) === 167000 && tc.s.some(x => /^4 pagos$/.test(x.trim())), tc);
    chk('una categoria " PROVEEDOR " (mayusculas y espacios) tambien es una compra, como en el EERR', num(tc.v) === 167000);
    if (hayFueraDelCorte) chk('vs los mismos dias: el pago de despues del corte ($900.000) no entra', tc.s.some(x => /vs el 1 al \d+ de/.test(x) && /\(\$80\.000\)/.test(x)), tc.s);
    chk('el ticket promedio divide por pagos ($41.750)', num((k['Ticket promedio'] || {}).v) === 41750, k['Ticket promedio']);
    const lista = await evaluar(cli, `(function(){ var L=document.getElementById('egrList');
      return { txt:L.textContent, grupos:[].map.call(L.querySelectorAll(':scope > div'),function(d){return d.textContent.replace(/\\s+/g,' ').slice(0,160);}),
               xss: !!window.__xss, img: !!L.querySelector('img'),
               donde: [].map.call(document.querySelectorAll('img[src="x"]'),function(i){ var p=i, cam=[]; while(p&&cam.length<6){ cam.push((p.id||p.className||p.tagName)); p=p.parentElement; } return cam.join(' < '); }) }; })()`);
    chk('ni "seña" ni "saldo"', !/seña|saldo/i.test(lista.txt), lista.grupos);
    chk('Le Unike es UN grupo con 2 pagos ($150.000)', lista.grupos.filter(g => /Le Unike/i.test(g)).length === 1 && lista.grupos.some(g => /Le Unike.*2 pagos.*150\.000/i.test(g)), lista.grupos);
    chk('el pago partido dice los dos metodos', /Efectivo \$30\.000 \+ Brubank Lucas \$70\.000/.test(lista.txt), lista.txt.slice(0, 300));
    chk('"Pago Alfajores Sur" queda "Alfajores Sur", con la A', /Alfajores Sur/.test(lista.txt) && !/lfajores Sur/.test(lista.txt.replace(/Alfajores Sur/g, '')), lista.grupos);
    chk('lo que viene de la planilla no se ejecuta como HTML', !lista.xss && !lista.img, {xss:lista.xss, img:lista.img, donde:lista.donde});
    chk('y se lee como texto', /onerror/.test(lista.txt), lista.txt.slice(-200));

    /* ── Semana 1 contra la 53 ── */
    await evaluar(cli, `egrSwitch('gastos'); window._egrPeriodo='sem:2027-01'; rEgresos(); 1`);
    k = await evaluar(cli, KPI);
    chk('la semana 1 de 2027 se compara contra la 53 de 2026 ($53.000)', !!k['Total Gastos'] && k['Total Gastos'].s.some(x => /53\.000/.test(x)), k['Total Gastos']);

    /* ── Buscador ── */
    await evaluar(cli, `egrSwitch('compras'); window._egrPeriodo=''; rEgresos(); 1`);
    const hayBusq = await evaluar(cli, `!!document.getElementById('egrSearchInp')`);
    chk('con mas de 8 proveedores aparece el buscador', hayBusq);
    if (hayBusq) {
      await evaluar(cli, `document.getElementById('egrSearchInp').focus(); 1`);
      for (const ch of 'Prov T') { await cli.enviar('Input.insertText', { text: ch }); await pausa(60); }
      const b = await evaluar(cli, `(function(){ var i=document.getElementById('egrSearchInp'); return {v:i.value, foco:document.activeElement===i,
        chips:[].map.call(document.querySelectorAll('#egrCatFilter button[data-c]'),function(x){return x.textContent;}), h:Math.round(i.getBoundingClientRect().height)}; })()`);
      chk('tecla por tecla queda "Prov T" (espacio y mayusculas)', b.v === 'Prov T', b.v);
      chk('filtra: Prov Tres', b.chips.length === 1 && b.chips[0] === 'Prov Tres', b.chips);
      chk('no pierde el foco', b.foco);
      if (ANCHO <= 560) chk('el buscador mide 38px o mas en el celular', b.h >= 38, b.h);
      await evaluar(cli, `window._egrSearch=''; rEgresos(); 1`);
    }

    /* ── El ↻ ── */
    await evaluar(cli, `window.__gets=[]; 1`);
    await evaluar(cli, `refreshContextual(); 1`);
    await esperar(cli, `window.__gets.length>0`, 8000);
    await pausa(2500);
    const gets = await evaluar(cli, `window.__gets.slice()`);
    chk('el ↻ en Pagos pide la caja y no los pedidos, cobros ni OCs', gets.indexOf('cajaLight') >= 0 && !gets.some(a => ['pedidosLight', 'cobrosPendientes', 'ocLight', 'admin'].indexOf(a) >= 0), gets);

    /* ── Tamaños ── */
    const tam = await evaluar(cli, `(function(){ var desb=document.documentElement.scrollWidth>window.innerWidth+1; return {desb:desb}; })()`);
    chk('la pagina no se desborda a lo ancho', !tam.desb);

    /* ── Caja: el aviso de Proveedor ── */
    await evaluar(cli, `go('caja'); 1`);
    await esperar(cli, `!!document.getElementById('gCat')`, 10000);
    await evaluar(cli, `toggleCajaForm('gasto'); var s=document.getElementById('gCat'); s.value='Proveedor'; s.dispatchEvent(new Event('change',{bubbles:true})); 1`);
    const av1 = await evaluar(cli, `(function(){ var a=document.getElementById('gProvAviso'); return a? {vis:!a.hidden && a.getBoundingClientRect().height>0, txt:a.textContent} : null; })()`);
    chk('en Caja, la categoria Proveedor avisa que la deuda no baja', !!av1 && av1.vis && /la deuda no baja/.test(av1.txt), av1);
    await evaluar(cli, `var s=document.getElementById('gCat'); s.value='Nafta'; s.dispatchEvent(new Event('change',{bubbles:true})); 1`);
    chk('con otra categoria el aviso se va', await evaluar(cli, `(document.getElementById('gProvAviso')||{hidden:true}).hidden===true`));

    /* ── Abastecimiento → Pagos, con dos cuentas digitales ── */
    const abrirPago = async () => {
      await evaluar(cli, `go('busqueda'); 1`);
      await esperar(cli, `typeof abaSwitchTab==='function'`, 30000);
      await evaluar(cli, `abaSwitchTab('pagos'); 1`);
      return esperar(cli, `!!document.getElementById('pagoForm_libre_0')`, 20000);
    };
    chk('Abastecimiento → Pagos dibuja la deuda', await abrirPago());
    await evaluar(cli, `togglePagoForm('libre_0'); var m=document.getElementById('pagoMp_libre_0'); m.value='40000'; m.dispatchEvent(new Event('input',{bubbles:true})); 1`);
    let f = await evaluar(cli, `(function(){ var b=document.getElementById('pagoCta_libre_0'), btn=document.getElementById('btnPagar_libre_0');
      return { box: !!b && !b.hidden, bs: b? [].map.call(b.querySelectorAll('button'),function(x){return {t:x.textContent,on:x.classList.contains('on'),h:Math.round(x.getBoundingClientRect().height)};}):[],
               dis: btn.disabled, txt: btn.textContent, lbl: [].map.call(document.querySelectorAll('#pagoForm_libre_0 .pago-input-label'),function(x){return x.textContent;}) }; })()`);
    chk('el campo dice "Transferencia", no "Mercado Pago"', f.lbl.indexOf('Transferencia') >= 0 && f.lbl.indexOf('Mercado Pago') < 0, f.lbl);
    chk('con una transferencia pregunta de que cuenta salio', f.box && f.bs.length === 2, f);
    chk('ninguna cuenta viene elegida', f.bs.every(x => !x.on), f.bs);
    chk('y no deja confirmar sin elegir', f.dis === true && /Elegí de qué cuenta/.test(f.txt), { dis: f.dis, txt: f.txt });
    if (ANCHO <= 560) chk('los botones de cuenta miden 44px', f.bs.every(x => x.h >= 44), f.bs.map(x => x.h));
    await evaluar(cli, `window.__posts=[]; document.querySelector('#pagoCta_libre_0 .aba-pago-cta-b[data-cta="brubank"]').click(); 1`);
    f = await evaluar(cli, `(function(){ var btn=document.getElementById('btnPagar_libre_0'); return {dis:btn.disabled, txt:btn.textContent}; })()`);
    chk('elegido el Brubank, se puede confirmar', f.dis === false && /Confirmar pago/.test(f.txt), f);
    await evaluar(cli, `document.getElementById('btnPagar_libre_0').click(); 1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='pagarProveedor';})`, 8000);
    const post = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='pagarProveedor';})[0]||null`);
    chk('el POST lleva la cuenta "brubank" y la plata en mp', !!post && post.cuenta === 'brubank' && Number(post.mp) === 40000, post);

    /* sin transferencia no pregunta */
    await abrirPago();
    await evaluar(cli, `togglePagoForm('libre_0'); var e=document.getElementById('pagoEf_libre_0'); e.value='15000'; e.dispatchEvent(new Event('input',{bubbles:true})); 1`);
    f = await evaluar(cli, `(function(){ var b=document.getElementById('pagoCta_libre_0'), btn=document.getElementById('btnPagar_libre_0'); return {box:!!b&&!b.hidden, dis:btn.disabled}; })()`);
    chk('todo en efectivo: no pregunta la cuenta y se puede confirmar', !f.box && f.dis === false, f);

    /* ── Con una sola cuenta digital ── */
    await ir('c');
    chk('con una sola cuenta digital Abastecimiento dibuja la deuda', await abrirPago());
    await evaluar(cli, `window.__posts=[]; togglePagoForm('libre_0'); var m=document.getElementById('pagoMp_libre_0'); m.value='20000'; m.dispatchEvent(new Event('input',{bubbles:true})); 1`);
    f = await evaluar(cli, `(function(){ var btn=document.getElementById('btnPagar_libre_0'); return {box:!!document.getElementById('pagoCta_libre_0'), dis:btn.disabled}; })()`);
    chk('no hay nada que elegir: no pregunta', !f.box && f.dis === false, f);
    await evaluar(cli, `document.getElementById('btnPagar_libre_0').click(); 1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='pagarProveedor';})`, 8000);
    const post2 = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='pagarProveedor';})[0]||null`);
    chk('y el POST va con la cuenta vacia (la de siempre)', !!post2 && post2.cuenta === '' && Number(post2.mp) === 20000, post2);

    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
  } catch (e) {
    console.log('  REVENTO: ' + (e && e.message || e)); mal++;
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  salir(mal ? 1 : 0);
})();
