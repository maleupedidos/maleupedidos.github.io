/* Billeteras de cambio en la tab Caja (5/10/2026). Backend STUBBEADO con datos
   inventados: no toca produccion ni necesita token.

   node probar_billeteras.js [390|1440]
   BASE=http://localhost:8095 node probar_billeteras.js 390

   Sostiene:
   · con billeteras arrancadas, la tarjeta de Efectivo muestra cada lugar
     (billetera y sin guardar de cada uno, caja fuerte, reservas, libre) y ya no
     los botones viejos (Di cambio, Mover, Sobres);
   · si los lugares no suman el total, lo dice en vez de esconderlo;
   · Mover efectivo: ningun lugar viene elegido; los atajos completan lo obvio;
     "Guardé lo cobrado" trae el monto puesto; no se puede sacar mas de lo que
     hay; la plata del OTRO no se puede tocar; el POST lleva desde/hacia/monto;
   · reservar pide proveedor; "Recibí de un vendedor" pide quien lo recibio y
     manda la rendicion de siempre (cobrarVendedorRed) con `quien`;
   · un gasto en efectivo no se guarda sin decir de donde salio, y lo manda;
   · Contar: con billeteras andando, lo vacio va con lo que dice el ERP y el
     total no cambia; sin arrancar, tocar un campo de persona exige los de todos
     y la caja fuerte vacia es lo que queda (el total no cambia);
   · sin errores de JS, nada desborda a lo ancho, minimo tactil 44px. */
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

const T = 'Tadeo Ustariz', L = 'Lucas Moresco';
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' },
  { id: 'mp', nombre: 'Mercado Pago Prueba', tipo: 'digital', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Prueba', tipo: 'digital' }
];
// Efectivo vivo: 1.000.000 + 135.000 cobrado = 1.135.000
const SB = { ef: 1000000, mp: 5000000, bil: 35000, sob: 0, inv: 500000, fecha: '08/10 20:00',
  porCuenta: { efectivo: 1000000, mp: 5000000, brubank: 500000 }, sinContar: [] };
const LUG = { activo: true, personas: [T, L],
  bil: { [T]: 20000, [L]: 15000 }, cob: { '': 0, [T]: 120000, [L]: 80000 },
  cf: 900000, reservas: [{ id: 'R-abc12345', prov: 'Proveedor <b>A</b>', monto: 300000 }],
  reservado: 300000, cfLibre: 600000, total: 1135000, efVivo: 1135000, descuadre: 0,
  movsUlt: [{ f: '08/10 21:00', desde: 'cob:' + T, hacia: 'cf', $: 50000, q: T, nota: '' }] };
const caja = (lug) => ({
  ts: 1,
  caja: { cobradoEf: 135000, cobradoMP: 0, gastosEf: 0, gastosMP: 0, ingresosEf: 0, ingresosMP: 0,
    cobradoPorCuenta: { efectivo: 135000 }, gastosPorCuenta: {}, ingresosPorCuenta: {}, cuentas: CUENTAS },
  saldoBase: SB, gastos: [], ingresos: [], gastosHist: {}, movimientos: [], sobres: [], efMano: [],
  proveedores: ['Proveedor A', 'Proveedor B'], lugares: lug, cajaMode: true
});
const VENDEDORES = [{ nombre: 'Vendedor Uno', deuda: 42000 }, { nombre: 'Vendedor Dos', deuda: 0 }];

function stub(lug) {
  return `
  (function(){
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v3'); localStorage.setItem('maleu_tab','caja'); }catch(e){}
    window.__posts=[];
    var CAJA=${JSON.stringify(caja(lug))}, VEND=${JSON.stringify(VENDEDORES)};
    var o = window.fetch; window.fetch = function(u, x){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
      var resp = function(obj, ms){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}})); }, ms); }); };
      if (x && String(x.method||'').toUpperCase()==='POST') {
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        /* La primera rendicion se pierde en la red: la pantalla tiene que poder
           reintentar con el MISMO clientOpId (hallazgo de Codex sobre v519). */
        if (b.action==='cobrarVendedorRed' && !window.__cvrPerdida) { window.__cvrPerdida=true; return Promise.reject(new TypeError('Failed to fetch')); }
        if (b.action==='gasto'||b.action==='ingreso') return resp({ok:true, rows:1}, 30);
        return resp({ok:true}, 30);
      }
      var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
      if (a==='cajaLight') return resp(CAJA, 200);
      if (a==='admin') return resp(Object.assign({}, CAJA, {pedidos:[],canales:[],stock:[],oc:{lista:[]},vendedores:VEND}), 99999);
      if (a==='pedidosLight') return resp({ts:1, pedidos:[], canales:[], light:true}, 100);
      if (a==='ocLight') return resp({ok:true, oc:{lista:[]}}, 100);
      return resp({ok:false, error:'stub'}, 100);
    };
  })();`;
}

async function abrirCon(cli, lug) {
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + stub(lug) });
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
  if (!await esperar(cli, `typeof go==='function'`, 60000)) return false;
  await evaluar(cli, `go('caja'); 1`);
  return await esperar(cli, `document.querySelectorAll('#cBal .bal-card').length>=4`, 30000);
}
const texto = (cli, sel) => evaluar(cli, `(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`);
const click = (cli, js) => evaluar(cli, `(()=>{ var e=${js}; if(!e) return false; e.click(); return true; })()`);
const ultimoPost = (cli) => evaluar(cli, `JSON.stringify(window.__posts[window.__posts.length-1]||null)`).then(s => JSON.parse(s));

(async () => {
  const cli = await abrir();
  const errores = [];
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Billeteras · ' + ANCHO + 'px · ' + APP + ' ==');
    if (!await abrirCon(cli, LUG)) { console.log('  la caja no se dibujo (sin esto, lo de abajo no mide nada)'); salir(1); }
    await evaluar(cli, `D.vendedores=${JSON.stringify(VENDEDORES)}; 1`);
    /* `?prueba=1` loguea a "Modo Prueba", que no tiene billetera: se le pone el
       nombre de Tadeo para probar lo que ve cada uno. */
    await evaluar(cli, `SESSION.nombre=${JSON.stringify(T)}; rCaja(); 1`);

    /* ── La tarjeta ── */
    const ef = (await texto(cli, '#cBal .bal-card')).replace(/\s+/g, ' ');
    chk('la tarjeta de Efectivo dice $1.135.000', /1\.135\.000/.test(ef), ef);
    for (const [t, re] of [['Billetera Tadeo $20.000', /Billetera Tadeo\s*\$20\.000/], ['Billetera Lucas $15.000', /Billetera Lucas\s*\$15\.000/],
      ['Sin guardar · Tadeo $120.000', /Sin guardar · Tadeo\s*\$120\.000/], ['Sin guardar · Lucas $80.000', /Sin guardar · Lucas\s*\$80\.000/],
      ['Caja fuerte $900.000', /Caja fuerte\s*\$900\.000/], ['la reserva del proveedor $300.000 (el nombre llega sin < > &, como en todo el panel)', /Proveedor bA\/b\s*\$300\.000/], ['libre $600.000', /libre\s*\$600\.000/]]) {
      chk('muestra ' + t, re.test(ef), ef);
    }
    chk('el nombre del proveedor va escapado (no hay <b> adentro de la tarjeta)', await evaluar(cli, `!document.querySelector('#cBal .bal-card b b')`) === true);
    chk('no estan los botones viejos (Di cambio, Mover, Sobres)', !/Di cambio|Sobres|↔ Mover/.test(ef), ef);
    chk('Tadeo tiene cobrado sin guardar: aparece "Guardé lo cobrado"', /Guardé lo cobrado/.test(ef), ef);
    chk('sin descuadre no hay aviso', !/no suman el total/.test(ef));

    /* ── Mover efectivo: abrir sin atajo ── */
    await click(cli, `[].slice.call(document.querySelectorAll('#cBal button')).filter(function(b){return /Mover efectivo/.test(b.textContent);})[0]`);
    await pausa(150);
    const m0 = await evaluar(cli, `(()=>({ abierto: !document.getElementById('lugMoverForm').classList.contains('hidden'),
      elegidos: document.querySelectorAll('#lugMoverForm .lug-chip.on').length,
      desde: [].slice.call(document.querySelectorAll('#lugMvDesde .lug-chip')).map(function(b){return {t:b.textContent,dis:b.disabled};}),
      hacia: [].slice.call(document.querySelectorAll('#lugMvHacia .lug-chip')).map(function(b){return b.textContent;}),
      btn: document.getElementById('lugMvBtn').textContent, dis: document.getElementById('lugMvBtn').disabled }))()`);
    chk('Mover efectivo abre', m0.abierto === true);
    chk('ningun lugar viene elegido', m0.elegidos === 0, m0);
    chk('el boton dice que falta el origen y esta trabado', m0.dis === true && /De dónde/.test(m0.btn), m0.btn);
    const ajenos = m0.desde.filter(d => /Lucas/.test(d.t));
    chk('la plata de Lucas no se puede sacar (Tadeo esta logueado) y dice quien la mueve', ajenos.length === 2 && ajenos.every(d => d.dis && /lo mueve Lucas/.test(d.t)), ajenos);
    chk('desde la caja fuerte se ofrece lo LIBRE ($600.000)', m0.desde.some(d => /Caja fuerte\s*\$600\.000 libre/.test(d.t)), m0.desde);
    chk('hacia ofrece "Nueva reserva"', m0.hacia.some(h => /Nueva reserva/.test(h)), m0.hacia);

    // Elegir de mi billetera a la de Lucas, monto mayor que lo que hay
    await click(cli, `document.querySelector('#lugMvDesde .lug-chip[data-l="bil:${T}"]')`);
    await click(cli, `document.querySelector('#lugMvHacia .lug-chip[data-l="bil:${L}"]')`);
    await evaluar(cli, `(()=>{ var i=document.getElementById('lugMvMonto'); i.value='25000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    let b = await evaluar(cli, `({t:document.getElementById('lugMvBtn').textContent, d:document.getElementById('lugMvBtn').disabled})`);
    chk('no deja sacar $25.000 de una billetera con $20.000', b.d === true && /hay \$20\.000/.test(b.t), b);
    await evaluar(cli, `(()=>{ var i=document.getElementById('lugMvMonto'); i.value='5.000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    b = await evaluar(cli, `({t:document.getElementById('lugMvBtn').textContent, d:document.getElementById('lugMvBtn').disabled})`);
    chk('con $5.000 se destraba: "Mover $5.000"', b.d === false && /Mover \$5\.000/.test(b.t), b);
    await click(cli, `document.getElementById('lugMvBtn')`);
    await pausa(300);
    let p = await ultimoPost(cli);
    chk('manda moverPlata bil:Tadeo → bil:Lucas $5.000 con clientOpId', p && p.action === 'moverPlata' && p.desde === 'bil:' + T && p.hacia === 'bil:' + L && p.monto === 5000 && !!p.clientOpId, p);
    chk('al mover, la pantalla se cierra', await evaluar(cli, `document.getElementById('lugMoverForm').classList.contains('hidden')`) === true);

    /* ── Atajo: Guardé lo cobrado ── */
    await click(cli, `[].slice.call(document.querySelectorAll('#cBal button')).filter(function(b){return /Guardé lo cobrado/.test(b.textContent);})[0]`);
    await pausa(150);
    const g = await evaluar(cli, `({ monto: document.getElementById('lugMvMonto').value,
      d: (document.querySelector('#lugMvDesde .lug-chip.on')||{}).getAttribute ? document.querySelector('#lugMvDesde .lug-chip.on').getAttribute('data-l') : '',
      h: (document.querySelector('#lugMvHacia .lug-chip.on')||{}).getAttribute ? document.querySelector('#lugMvHacia .lug-chip.on').getAttribute('data-l') : '',
      btn: document.getElementById('lugMvBtn').textContent })`);
    chk('"Guardé lo cobrado" trae sin guardar · Tadeo → caja fuerte con $120.000 puesto', g.d === 'cob:' + T && g.h === 'cf' && /120000/.test(g.monto.replace(/\D/g, '')), g);
    await evaluar(cli, `(()=>{ var i=document.getElementById('lugMvMonto'); i.value='100000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    await click(cli, `document.getElementById('lugMvBtn')`); await pausa(300);
    p = await ultimoPost(cli);
    chk('el monto se puede cambiar: guarda $100.000', p && p.action === 'moverPlata' && p.desde === 'cob:' + T && p.hacia === 'cf' && p.monto === 100000, p);

    /* ── Atajo: Reservar para un proveedor ── */
    await evaluar(cli, `abrirMoverLug('reservar'); 1`); await pausa(150);
    await evaluar(cli, `(()=>{ var i=document.getElementById('lugMvMonto'); i.value='200000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    b = await evaluar(cli, `({t:document.getElementById('lugMvBtn').textContent, d:document.getElementById('lugMvBtn').disabled, prov:!document.getElementById('lugMvProvFg').classList.contains('hidden')})`);
    chk('reservar pide el proveedor antes de dejar mover', b.prov === true && b.d === true && /proveedor/.test(b.t), b);
    await evaluar(cli, `(()=>{ var i=document.getElementById('lugMvProv'); i.value='Proveedor B'; i.dispatchEvent(new Event('input')); return 1; })()`);
    await click(cli, `document.getElementById('lugMvBtn')`); await pausa(300);
    p = await ultimoPost(cli);
    chk('manda cf → res:nuevo con el proveedor', p && p.desde === 'cf' && p.hacia === 'res:nuevo' && p.proveedor === 'Proveedor B' && p.monto === 200000, p);

    /* ── Atajo: Recibí de un vendedor ── */
    await evaluar(cli, `abrirMoverLug('vendedor'); 1`); await pausa(150);
    const v0 = await evaluar(cli, `({ vend: !document.getElementById('lugMvVend').classList.contains('hidden'), tras: !document.getElementById('lugMvTraspaso').classList.contains('hidden'),
      quien: document.querySelectorAll('#lugMvQuien .lug-chip').length, on: document.querySelectorAll('#lugMvQuien .lug-chip.on').length,
      opts: [].slice.call(document.querySelectorAll('#lugMvVendSel option')).map(function(o){return o.textContent;}) })`);
    chk('"Recibí de un vendedor" muestra vendedor y quien lo recibio, sin nadie elegido', v0.vend && !v0.tras && v0.quien === 2 && v0.on === 0, v0);
    chk('el que debe va primero y dice cuanto', /Vendedor Uno · debe \$42\.000/.test(v0.opts[1] || ''), v0.opts);
    await evaluar(cli, `(()=>{ var s=document.getElementById('lugMvVendSel'); s.value='Vendedor Uno'; s.dispatchEvent(new Event('change')); var i=document.getElementById('lugMvMonto'); i.value='42000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    b = await evaluar(cli, `({t:document.getElementById('lugMvBtn').textContent, d:document.getElementById('lugMvBtn').disabled})`);
    chk('sin decir quien lo recibio, no se confirma', b.d === true && /Quién/.test(b.t), b);
    await click(cli, `document.querySelector('#lugMvQuien .lug-chip[data-l="${L}"]')`);
    await click(cli, `document.getElementById('lugMvBtn')`); await pausa(400);
    // la primera se perdio: la pantalla queda abierta y se toca de nuevo
    await click(cli, `document.getElementById('lugMvBtn')`); await pausa(400);
    const cvr = JSON.parse(await evaluar(cli, `JSON.stringify(window.__posts.filter(function(x){return x.action==='cobrarVendedorRed';}))`));
    chk('si se pierde la respuesta, el reintento manda el MISMO clientOpId (el backend no la registra dos veces)', cvr.length === 2 && !!cvr[0].clientOpId && cvr[0].clientOpId === cvr[1].clientOpId, cvr.map(function (x) { return x.clientOpId; }));
    p = await ultimoPost(cli);
    chk('manda la rendicion de siempre con quien: Lucas', p && p.action === 'cobrarVendedorRed' && p.vendedor === 'Vendedor Uno' && p.ef === 42000 && p.tr === 0 && p.quien === L, p);

    /* ── Gasto en efectivo: de donde salio ── */
    await evaluar(cli, `toggleCajaForm('gasto'); 1`); await pausa(150);
    await evaluar(cli, `(()=>{ document.getElementById('gCat').value='Nafta'; document.getElementById('gCon').value='Shell'; var i=document.getElementById('gEf'); i.value='5000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    const gl = await evaluar(cli, `({ ver: !document.getElementById('gLug').classList.contains('hidden'), n: document.querySelectorAll('#gLug .lug-chip').length, on: document.querySelectorAll('#gLug .lug-chip.on').length })`);
    chk('con efectivo, el gasto pregunta de donde salio (5 lugares, ninguno elegido)', gl.ver && gl.n === 5 && gl.on === 0, gl);
    const nPosts = await evaluar(cli, `window.__posts.length`);
    await evaluar(cli, `document.getElementById('gBtn').click(); 1`); await pausa(200);
    chk('sin elegir el lugar, el gasto NO se manda', await evaluar(cli, `window.__posts.length`) === nPosts);
    await click(cli, `document.querySelector('#gLug .lug-chip[data-l="bil:${T}"]')`);
    await evaluar(cli, `document.getElementById('gBtn').click(); 1`); await pausa(400);
    p = await ultimoPost(cli);
    chk('el gasto viaja con lugar: bil:Tadeo', p && p.action === 'gasto' && p.montoEf === 5000 && p.lugar === 'bil:' + T, p);
    chk('despues de guardar, el lugar se limpia', await evaluar(cli, `document.querySelectorAll('#gLug .lug-chip.on').length===0`) === true);

    /* ── Contar con billeteras andando: lo vacio es lo del ERP ── */
    await evaluar(cli, `toggleCajaForm('gasto'); toggleAjuste(); 1`); await pausa(200);
    const aj = await evaluar(cli, `({ campos: document.querySelectorAll('#ajLugares input').length, bilVieja: document.getElementById('ajBilFg').style.display })`);
    chk('Contar muestra billetera y sin guardar de cada uno (4) y esconde la billetera vieja', aj.campos === 4 && aj.bilVieja === 'none', aj);
    await evaluar(cli, `(()=>{ var i=document.getElementById('ajLb1'); i.value='14000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    await evaluar(cli, `window.confirm=function(){return true;}; guardarAjuste(); 1`); await pausa(300);
    p = await ultimoPost(cli);
    const lg = p && p.lugares || {};
    chk('el conteo del sabado manda las 4 personas: Lucas tipeado, el resto del ERP', lg['bil:' + L] === 14000 && lg['bil:' + T] === 20000 && lg['cob:' + T] === 120000 && lg['cob:' + L] === 80000, lg);
    chk('el efectivo total baja exactamente lo que falto ($1.000): $1.134.000', p && p.efectivo === 1134000, p && p.efectivo);
    chk('la col D (billetera) = las dos billeteras: $34.000', p && p.billetera === 34000, p && p.billetera);

    /* ── Descuadre a la vista ── */
    await evaluar(cli, `D.lugares.descuadre=1500; rCaja(); 1`); await pausa(100);
    chk('si los lugares no suman el total, la tarjeta lo dice', /no suman el total/.test(await texto(cli, '#cBal .bal-card')));

    /* ── Medidas ── */
    await evaluar(cli, `D.lugares.descuadre=0; rCaja(); abrirMoverLug(''); 1`); await pausa(200);
    const med = await evaluar(cli, `(()=>{ var doc=document.documentElement; var chicos=[].slice.call(document.querySelectorAll('#lugMoverForm button, #cBal .lug-boton')).filter(function(b){var r=b.getBoundingClientRect(); return r.width>0 && r.height<36;}).map(function(b){return b.textContent.trim().slice(0,20)+':'+Math.round(b.getBoundingClientRect().height);});
      return { desborda: doc.scrollWidth-doc.clientWidth, chicos: chicos }; })()`);
    chk('nada desborda a lo ancho', med.desborda <= 0, med.desborda);
    chk('los botones nuevos miden 36px o mas (chips y atajos 44)', med.chicos.length === 0, med.chicos);
    const chips = await evaluar(cli, `[].slice.call(document.querySelectorAll('#lugMoverForm .lug-chip, #lugMoverForm .lug-atajo')).filter(function(b){var r=b.getBoundingClientRect();return r.width>0&&r.height<44;}).map(function(b){return b.textContent.trim().slice(0,24)+':'+Math.round(b.getBoundingClientRect().height);})`);
    chk('chips y atajos de Mover efectivo miden 44px o mas', chips.length === 0, chips);

    /* ── Sin arrancar: el conteo de arranque ── */
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: '' });
    if (!await abrirCon(cli, { activo: false, personas: [T, L], sinAsignar: true })) { console.log('  la caja (sin arrancar) no se dibujo'); salir(1); }
    const ef2 = (await texto(cli, '#cBal .bal-card')).replace(/\s+/g, ' ');
    chk('sin arrancar: la tarjeta de siempre con "Arrancar billeteras"', /Arrancar billeteras/.test(ef2) && /Caja fuerte/.test(ef2), ef2);
    await evaluar(cli, `toggleAjuste(); 1`); await pausa(200);
    await evaluar(cli, `(()=>{ var i=document.getElementById('ajMP'); i.value='5000000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    await evaluar(cli, `window.confirm=function(){return true;}; guardarAjuste(); 1`); await pausa(300);
    p = await ultimoPost(cli);
    chk('sin tocar los campos de persona, es el conteo de siempre (sin lugares)', p && p.action === 'ajusteSaldo' && p.lugares === undefined, p);
    await evaluar(cli, `toggleAjuste(); toggleAjuste(); 1`); await pausa(150);
    const nAntes = await evaluar(cli, `window.__posts.length`);
    await evaluar(cli, `(()=>{ var i=document.getElementById('ajLb0'); i.value='20000'; i.dispatchEvent(new Event('input')); return 1; })()`);
    await evaluar(cli, `guardarAjuste(); 1`); await pausa(200);
    chk('arrancando con una sola persona cargada, frena y no manda nada', await evaluar(cli, `window.__posts.length`) === nAntes);
    await evaluar(cli, `(()=>{ [['ajLc0','120000'],['ajLb1','15000'],['ajLc1','80000']].forEach(function(x){ var i=document.getElementById(x[0]); i.value=x[1]; i.dispatchEvent(new Event('input')); }); return 1; })()`);
    await evaluar(cli, `guardarAjuste(); 1`); await pausa(300);
    p = await ultimoPost(cli);
    chk('el arranque manda las 4 personas', p && p.lugares && p.lugares['bil:' + T] === 20000 && p.lugares['cob:' + L] === 80000, p && p.lugares);
    chk('y el efectivo total NO cambia: la caja fuerte es lo que queda ($1.135.000)', p && p.efectivo === 1135000, p && p.efectivo);

    const err = await evaluar(cli, `JSON.stringify(window.__err||[])`);
    chk('sin errores de JS', errores.length === 0 && err === '[]', { errores, err });
  } catch (e) {
    console.log('  REVENTO: ' + (e && e.stack || e)); mal++;
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
  salir(mal ? 1 : 0);
})();
