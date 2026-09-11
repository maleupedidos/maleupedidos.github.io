/**
 * El flujo de cobro con dos cuentas (Mercado Pago Tadeo y Brubank Lucas).
 *
 * Corre en un Chrome de verdad con TODOS los POST interceptados: la planilla
 * no se toca. Clientes, vendedores y direcciones son inventados: este repo es
 * publico por Pages.
 *
 * Lo que exige (11/9/2026):
 *   · NINGUNA cuenta viene elegida de antemano. Desde que la tienda le ofrece
 *     al cliente los dos alias, preseleccionar Mercado Pago imputaba ahi cada
 *     pago al Brubank que nadie corregia, sin un solo error.
 *   · En "¿Cómo te pagó?" cada cuenta es su pastilla: un toque dice que fue
 *     transferencia Y a donde. Mixto pregunta aparte a donde fue lo digital.
 *   · Sin cuenta, el cobro NO se confirma: ni el cuadro, ni el parcial, ni el
 *     combo, ni la rendicion del vendedor, ni el "Ya me pagó" del AUTOPEDIDO.
 *   · El mensaje al cliente lleva los dos alias, y "Pedir comprobante" copia el
 *     texto en vez de abrir un link wa.me (prohibido).
 *
 * Se abre `ruta.html?standalone=1`: en el `app.html` fusionado el estado de la
 * sub-app vive dentro de un IIFE y no se puede leer desde afuera.
 *
 * CADA CASO ARRANCA EN UNA PAGINA NUEVA: confirmar un cobro deja una cadena de
 * promesas que termina en `cerrarCobroRuta()`, y esa llamada le pone `null` al
 * cuadro que el caso siguiente acaba de abrir.
 *
 *   node probar_cuenta_cobro.js [ancho] [archivo]
 */
const path = require('path');
const PRU = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas';
const { abrir, evaluar } = require(path.join(PRU, 'cdp.js'));

const ANCHO = Number(process.argv[2]) || 390;
/* `&prueba=1` NO es opcional: sin el, el interceptor de sesion ve un
   authRequired, hace alert + location.reload() y la pagina se recarga a mitad
   de la medicion. */
const ARCH = process.argv[3] || 'ruta.html';
const BASE = 'http://localhost:8080/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chequear = (cond, txt, det) => {
  if (cond) { ok++; console.log('  ok    ' + txt); }
  else { mal++; console.log('  MAL   ' + txt + (det !== undefined ? '  -> ' + det : '')); }
};

const COBROS = [
  { h: 'Home', id: '9001', r: 900, c: 'Prueba Uno', t: '1100000001', $: 50000,
    totalOriginal: 50000, fp: 'Transferencia', dir: 'Golf · Lote 1' },
  /* Con subtotal: asi el cuadro puede recalcular el 10% de efectivo al pasar
     a transferencia, que es lo que hace con un pedido real. */
  { h: 'Home', id: '9002', r: 901, c: 'Prueba Dos', t: '', $: 29997, sub: 33330, env: 0, desc: 3333,
    totalOriginal: 29997, fp: 'Efectivo', dir: 'Golf · Lote 2' }
];

const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, alias: 'maleump', banco: 'Mercado Pago', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', col: 7, alias: 'maleubru', banco: 'Brubank', def: false, inv: false }
];
const UNA_SOLA = CUENTAS.filter(c => c.id !== 'brubank');

function prep(cts) {
  return `
    window.__posts = []; window.__avisos = []; window.__errores = []; window.__copiado = null;
    window.addEventListener('error', function(e){ window.__errores.push(String(e.message)); });
    try {
      Object.defineProperty(navigator, 'clipboard', { configurable: true,
        value: { writeText: function(t){ window.__copiado = String(t); return Promise.resolve(); } } });
    } catch(e) {}
    (function(){
      var of = window.fetch;
      window.fetch = function(u, o){
        var url = String((u && u.url) || u || '');
        if (o && String(o.method || '').toUpperCase() === 'POST') {
          var b = o.body;
          try { b = (typeof b === 'string') ? JSON.parse(b) : b; } catch(e){}
          window.__posts.push(b);
          return Promise.resolve(new Response(
            /* Lo que el backend de verdad contesta: cobrarParcial devuelve
               restante, y sin el el aviso revienta y el parcial se re-encola —
               un rojo que seria del stub, no del ERP. */
            JSON.stringify({ ok: true, n: 999, total: (b && (Number(b.ef||0)+Number(b.tr||0))) || null,
                             restante: 30000, cerrado: false, totalCobrado: 20000,
                             aFavor: 0, aplicacion: 0, cambioMP: 0, cambioEf: 0,
                             cuenta: (b && b.cuenta) || '' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (url.indexOf('action=cobrosPendientes') > -1) {
          return Promise.resolve(new Response(JSON.stringify({
            ts: Date.now(), cobros: ${JSON.stringify(COBROS)},
            billetera: 5080, sinCerrar: [], cuentas: ${JSON.stringify(cts)}
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (url.indexOf('action=entregas') > -1) {
          return Promise.resolve(new Response(JSON.stringify({
            ts: Date.now(), e: [], cuentas: ${JSON.stringify(cts)}
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return of.apply(this, arguments);
      };
      window.alert = function(m){ window.__avisos.push('ALERT: ' + String(m)); };
      window.__confirmDevuelve = true;
      window.confirm = function(m){ window.__avisos.push('CONFIRM: ' + String(m));
                                    return window.__confirmDevuelve; };
    })();
  `;
}

const dormir = ms => new Promise(r => setTimeout(r, ms));
async function esperar(cli, expr, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) {
    if (await evaluar(cli, expr)) return true;
    await dormir(200);
  }
  return false;
}

/* Los scripts de `addScriptToEvaluateOnNewDocument` se ACUMULAN: sin quitar el
   anterior, la cuarta navegacion corre cuatro interceptores anidados. */
let _prepId = null;
async function arrancar(cli, cts, tab) {
  if (_prepId) {
    try { await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: _prepId }); }
    catch (e) { }
  }
  const r = await cli.enviar('Page.addScriptToEvaluateOnNewDocument',
    { source: 'try{localStorage.clear()}catch(e){}\n' + prep(cts) });
  _prepId = r && r.identifier;
  await cli.enviar('Page.navigate', { url: BASE });
  await dormir(3200);
  if (!await esperar(cli, 'typeof window.switchTab === "function"'))
    throw new Error('la sub-app no arranco');
  /* `_tools/servir.js` inyecta su propio `window.confirm` DESPUES del PREP y
     arranca contestando que NO: sin esto, cada pregunta del AUTOPEDIDO (los
     precios sin confirmar, el stock) frena el guardado y el test mide su
     propio freno. */
  await evaluar(cli, 'window.__confirmDevuelve = true');
  await evaluar(cli, 'switchTab("' + (tab || 'cobros') + '")');
  if (!await esperar(cli,
      '(function(){try{return pendientesCobro && pendientesCobro.length===2}catch(e){return false}})()'))
    throw new Error('los pedidos de prueba no llegaron');
  await dormir(1500);
}

async function idxDe(cli, id) {
  const i = await evaluar(cli,
    '(function(){try{for(var i=0;i<pendientesCobro.length;i++)' +
    'if(String(pendientesCobro[i].id)==="' + id + '")return i;return -1}catch(e){return -1}})()');
  if (i < 0) throw new Error('no encontre el pedido ' + id);
  return i;
}

/** Abre el cuadro y EXIGE que quede abierto: con el estado en null, "no hay
 *  error" da ok — y es un ok falso. */
async function abrirCuadro(cli, id) {
  await evaluar(cli, 'abrirCobroPendiente(' + (await idxDe(cli, id)) + ')');
  if (!await esperar(cli, '!!_cobroRutaState', 8000))
    throw new Error('el cuadro de ' + id + ' no abrio');
  await dormir(300);
}

/** Lo que quedo REGISTRADO: la cola o el POST, lo que aparezca primero. */
async function registrado(cli, accion, ms) {
  const leer = async () => {
    const txt = await evaluar(cli,
      '(function(){var a=(window.__posts||[]).filter(function(p){return p&&p.action==="' + accion + '"});' +
      'var b=[];try{b=(syncQueue||[]).filter(function(q){return q&&q.action==="' + accion + '"})}catch(e){}' +
      'return JSON.stringify(a.length?a:b)})()');
    try { return JSON.parse(txt || '[]'); } catch (e) { return []; }
  };
  const t0 = Date.now();
  let out = [];
  while (Date.now() - t0 < (ms || 12000)) {
    out = await leer();
    if (out.length) break;
    await dormir(200);
  }
  return out;
}
async function confirmarYEsperar(cli, accion) {
  await evaluar(cli, 'window.__posts=[]; window.__avisos=[];');
  if (!await evaluar(cli, '!!_cobroRutaState'))
    throw new Error('el cuadro se cerro antes de confirmar: el test perdio el estado');
  await evaluar(cli, '(function(){try{confirmarCobroRuta()}catch(e){window.__errores.push("CONF: "+e.message)}})()');
  return registrado(cli, accion);
}

/** El total QUE EL ERP dice, no uno adivinado: al cambiar de metodo el total
 *  se recalcula (el 10% OFF de efectivo). */
async function cargarTotal(cli, campo) {
  const t = await evaluar(cli, '_cobroRutaState.total');
  await evaluar(cli, '_setMoneyInput("' + campo + '", ' + Number(t) + '); _recalcCobroRuta();');
  await dormir(300);
  return Number(t);
}

const J = o => JSON.stringify(o);
const filaFp = cli => evaluar(cli,
  'Array.prototype.map.call(document.querySelectorAll("#cobroRutaFp .cobro-pill"),function(p){' +
  'return (p.getAttribute("data-fp")||("cta:"+p.getAttribute("data-cta")))+(p.classList.contains("on")?"*":"")}).join(",")');
const seccion = cli => evaluar(cli, 'document.getElementById("cobroCtaSection").style.display');
const boton = cli => evaluar(cli,
  '(function(){var b=document.getElementById("btnCobroRutaOk");return (b.disabled?"OFF:":"ON:")+b.textContent})()');
const tocar = (cli, sel) => evaluar(cli,
  '(function(){var e=document.querySelector(' + J(sel) + ');if(!e)return false;e.click();return true})()');

(async () => {
  const cli = await abrir({});
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride',
      { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });

    console.log('\n' + '='.repeat(70));
    console.log('EL COBRO CON DOS CUENTAS  ·  ' + ANCHO + 'px  ·  ' + ARCH);
    console.log('='.repeat(70));

    // ── 1. las cuentas llegan con sus alias ─────────────────────────────────
    console.log('\n-- las cuentas llegan por cobrosPendientes --');
    await arrancar(cli, CUENTAS);
    chequear(await evaluar(cli, '(RUT_CTAS||[]).length') === 3, 'llegan las 3 cuentas');
    chequear(await evaluar(cli, '_ctasDigitales().length') === 2, 'y 2 son digitales');
    chequear(await evaluar(cli, '(RUT_CTAS||[])[2].alias') === 'maleubru', 'con su alias');

    // ── 2. un pedido por transferencia: nada elegido de antemano ───────────
    console.log('\n-- un pedido por TRANSFERENCIA: ninguna cuenta preseleccionada --');
    await abrirCuadro(cli, '9001');
    const f2 = await filaFp(cli);
    chequear(f2 === 'Efectivo,Mixto,cta:mp,cta:brubank',
      'en "¿Cómo te pagó?" cada cuenta es su pastilla', f2);
    chequear(!/\*/.test(f2), 'y NINGUNA viene prendida', f2);
    chequear(await evaluar(cli, 'document.getElementById("cobroRutaFp").classList.contains("falta")'),
      'la fila avisa que falta elegir');
    chequear(await seccion(cli) === 'none', 'la seccion de Mixto no aparece en una transferencia');
    const b2 = await boton(cli);
    chequear(/^OFF:Elegí a qué cuenta entró/.test(b2), 'el boton se traba y dice que falta', b2);
    chequear(/A qué cuenta entró/.test(await evaluar(cli, 'document.getElementById("cobroRutaErr").textContent')),
      'y el cartel lo explica nombrando las dos');
    const c2 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c2.length === 0, 'confirmar sin cuenta NO registra nada', c2.length);
    const txt2 = await evaluar(cli, 'document.getElementById("cobroRutaFp").textContent');
    chequear(/Mercado Pago Tadeo/.test(txt2) && /Brubank Lucas/.test(txt2), 'las pastillas dicen el nombre', txt2);
    const alt = await evaluar(cli,
      'Array.prototype.map.call(document.querySelectorAll("#cobroRutaFp .cobro-pill"),' +
      'function(p){return Math.round(p.getBoundingClientRect().height)}).join(",")');
    chequear(Math.min(...String(alt).split(',').map(Number)) >= 38, 'todas llegan al minimo tactil (38px)', alt);
    chequear(!await evaluar(cli,
      '(function(){var b=document.getElementById("cobroRutaFp");return b.scrollWidth>b.clientWidth+2})()'),
      'y no desbordan la caja');

    // un monto ya tipeado no se pierde al elegir la cuenta
    const tot2 = await evaluar(cli, '_cobroRutaState.total');
    await evaluar(cli, '_setMoneyInput("cobroRecMP",' + (Number(tot2) + 1000) + ');_recalcCobroRuta();');
    chequear(await tocar(cli, '#cobroRutaFp [data-cta=brubank]'), 'toco "Brubank Lucas"');
    await dormir(300);
    chequear(await evaluar(cli, '_parseMoneyInput(document.getElementById("cobroRecMP"))') === Number(tot2) + 1000,
      'el monto que habia tipeado NO se pisa', await evaluar(cli, 'document.getElementById("cobroRecMP").value'));
    await cargarTotal(cli, 'cobroRecMP');
    const f2b = await filaFp(cli);
    chequear(/cta:brubank\*/.test(f2b) && !/cta:mp\*/.test(f2b), 'queda prendida SOLO la elegida', f2b);
    chequear(!await evaluar(cli, 'document.getElementById("cobroRutaFp").classList.contains("falta")'),
      'y deja de avisar');
    chequear(/^ON:/.test(await boton(cli)), 'el boton se destraba', await boton(cli));
    const c2b = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c2b.length === 1 && c2b[0].cuenta === 'brubank' && c2b[0].formaPago === 'Transferencia',
      'se registra con cuenta:"brubank" y forma Transferencia', J(c2b[0] && { c: c2b[0].cuenta, fp: c2b[0].formaPago }));
    await dormir(600);
    const toast2 = await evaluar(cli, '(document.getElementById("rutToast")||{}).textContent||""');
    chequear(/Brubank Lucas/.test(toast2), 'y el aviso nombra la cuenta', toast2);

    // ── 3. un pedido en efectivo ────────────────────────────────────────────
    console.log('\n-- un pedido en EFECTIVO: no se pregunta nada --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9002');
    const f3 = await filaFp(cli);
    chequear(f3 === 'Efectivo*,Mixto,cta:mp,cta:brubank', 'Efectivo prendido, las cuentas apagadas', f3);
    /* $29.997 no es un monto "redondo", asi que el cuadro no lo precarga: se
       carga el total que el ERP dice, como haria la persona. */
    await cargarTotal(cli, 'cobroRecEf');
    chequear(/^ON:/.test(await boton(cli)), 'y se puede cobrar directo', await boton(cli));
    const c3 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c3.length === 1 && c3[0].cuenta === '', 'cuenta VACIA: el efectivo no elige', J(c3[0] && c3[0].cuenta));

    // ── 4. un pedido en efectivo que te pagaron por MP: UN toque ───────────
    console.log('\n-- era efectivo y te transfirio a Mercado Pago: un solo toque --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9002');
    const antes4 = await evaluar(cli, '_cobroRutaState.total');
    await tocar(cli, '#cobroRutaFp [data-cta=mp]');
    await dormir(300);
    chequear(await evaluar(cli, '_cobroRutaState.fp') === 'Transferencia' && await evaluar(cli, '_cobroRutaState.cta') === 'mp',
      'queda Transferencia a Mercado Pago');
    chequear(await evaluar(cli, '_cobroRutaState.total') > antes4, 'y el total pierde el 10% de efectivo',
      antes4 + ' -> ' + await evaluar(cli, '_cobroRutaState.total'));
    chequear(await evaluar(cli, '_parseMoneyInput(document.getElementById("cobroRecMP"))') === await evaluar(cli, '_cobroRutaState.total'),
      '"¿Cuánto recibiste?" se carga en la parte digital');
    const c4 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c4.length === 1 && c4[0].cuenta === 'mp', 'se registra con cuenta:"mp"', J(c4[0] && c4[0].cuenta));

    // ── 5. Mixto elegido ────────────────────────────────────────────────────
    console.log('\n-- MIXTO: pregunta a donde fue lo transferido --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9001');
    await tocar(cli, '#cobroRutaFp [data-fp=Mixto]');
    await dormir(300);
    chequear(await seccion(cli) !== 'none', 'aparece "¿A qué cuenta entró lo transferido?"');
    chequear(!await evaluar(cli, '!!document.querySelector("#cobroRutaCta .on")'), 'sin nada elegido');
    const t5 = await evaluar(cli, '_cobroRutaState.total');
    await evaluar(cli, '_setMoneyInput("cobroRecEf",20000);_setMoneyInput("cobroRecMP",' + (Number(t5) - 20000) + ');_recalcCobroRuta();');
    await dormir(300);
    chequear(/^OFF:Elegí a qué cuenta entró/.test(await boton(cli)), 'traba el boton', await boton(cli));
    await tocar(cli, '#cobroRutaCta [data-cta=brubank]');
    await dormir(300);
    chequear(/^ON:/.test(await boton(cli)), 'al elegir se destraba', await boton(cli));
    const c5 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c5.length === 1 && c5[0].formaPago === 'Mixto' && c5[0].cuenta === 'brubank',
      'se registra Mixto con cuenta:"brubank"', J(c5[0] && { fp: c5[0].formaPago, c: c5[0].cuenta }));

    // ── 5b. Mixto DEDUCIDO de los montos ───────────────────────────────────
    console.log('\n-- con plata en los dos campos es Mixto aunque diga Efectivo --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9002');
    const t5b = await evaluar(cli, '_cobroRutaState.total');
    await evaluar(cli, '_setMoneyInput("cobroRecEf",10000);_setMoneyInput("cobroRecMP",' + (Number(t5b) - 10000) + ');_recalcCobroRuta();');
    await dormir(300);
    chequear(await seccion(cli) !== 'none', 'aparece la pregunta de la cuenta, aunque el pill diga Efectivo');
    chequear(/^OFF:/.test(await boton(cli)), 'y traba hasta que se conteste', await boton(cli));
    await tocar(cli, '#cobroRutaCta [data-cta=mp]');
    await dormir(300);
    const c5b = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c5b.length === 1 && c5b[0].formaPago === 'Mixto' && c5b[0].cuenta === 'mp',
      'se registra Mixto con cuenta:"mp"', J(c5b[0] && { fp: c5b[0].formaPago, c: c5b[0].cuenta }));

    // ── 5c. elegir Brubank y corregir a efectivo ───────────────────────────
    console.log('\n-- elegir Brubank y despues corregir a EFECTIVO --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9001');
    await tocar(cli, '#cobroRutaFp [data-cta=brubank]');
    await tocar(cli, '#cobroRutaFp [data-fp=Efectivo]');
    await dormir(300);
    chequear(await seccion(cli) === 'none', 'no queda nada preguntando');
    await cargarTotal(cli, 'cobroRecEf');
    const c5c = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c5c.length === 1 && c5c[0].cuenta === '',
      'y el payload manda cuenta VACIA: en efectivo no se imputa a ninguna', J(c5c[0] && c5c[0].cuenta));

    // ── 6. el PARCIAL tambien exige la cuenta ──────────────────────────────
    console.log('\n-- un pago PARCIAL por transferencia --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9001');
    await tocar(cli, '#cobroTogglePartial');
    await dormir(300);
    await evaluar(cli, '_setMoneyInput("cobroRecMP",20000);_recalcCobroRuta();');
    await dormir(300);
    chequear(/^OFF:Elegí a qué cuenta entró/.test(await boton(cli)), 'sin cuenta no se registra el parcial', await boton(cli));
    await tocar(cli, '#cobroRutaFp [data-cta=brubank]');
    await dormir(300);
    const c6 = await confirmarYEsperar(cli, 'cobrarParcial');
    chequear(c6.length === 1 && c6[0].cuenta === 'brubank' && Number(c6[0].monto) === 20000,
      'el parcial va con cuenta:"brubank"', J(c6[0] && { c: c6[0].cuenta, m: c6[0].monto }));

    // ── 7. una sola cuenta digital / sin cuentas ───────────────────────────
    console.log('\n-- con UNA sola cuenta digital: como siempre --');
    await arrancar(cli, UNA_SOLA);
    await abrirCuadro(cli, '9001');
    const f7 = await filaFp(cli);
    chequear(f7 === 'Efectivo,Transferencia*,Mixto', 'la fila de siempre, con Transferencia prendida', f7);
    chequear(/^ON:/.test(await boton(cli)), 'nada que elegir: se cobra directo', await boton(cli));
    const c7 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c7.length === 1 && c7[0].cuenta === '', 'cuenta vacia: el backend la resuelve', J(c7[0] && c7[0].cuenta));

    console.log('\n-- sin cuentas (un backend viejo) --');
    await arrancar(cli, []);
    await abrirCuadro(cli, '9001');
    chequear(await filaFp(cli) === 'Efectivo,Transferencia*,Mixto', 'la fila de siempre');
    const c7b = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c7b.length === 1 && c7b[0].cuenta === '', 'y el cobro sale igual', J(c7b[0] && c7b[0].cuenta));

    // ── 8. la rendicion del vendedor ────────────────────────────────────────
    console.log('\n-- la RENDICION de un vendedor --');
    await arrancar(cli, CUENTAS);
    await evaluar(cli, '_cobroVendReg["Prueba Vendedor"]={$:100000,totalBruto:120482,comision:20482,yaPagado:0,' +
      'pedidosIds:["1","2"],sems:[{sem:36,y:2026,saldo:100000,n:2}]};confirmarCobroVendedor("Prueba Vendedor")');
    await dormir(400);
    await evaluar(cli, '_cvQuick("tr")');
    await dormir(300);
    chequear(await evaluar(cli, 'document.getElementById("cvCtaSec").style.display') !== 'none', 'pregunta a que cuenta');
    chequear(!await evaluar(cli, '!!_cvCtx.cta'), 'sin ninguna elegida');
    chequear(await evaluar(cli, 'document.getElementById("cvOk").disabled'), 'el boton queda trabado');
    chequear(/Elegí a qué cuenta/.test(await evaluar(cli, 'document.getElementById("cvSumLbl").textContent')),
      'y dice por que', await evaluar(cli, 'document.getElementById("cvSumLbl").textContent'));
    await tocar(cli, '#cvCtaBox [data-cvcta=brubank]');
    await dormir(300);
    chequear(!await evaluar(cli, 'document.getElementById("cvOk").disabled'), 'al elegir se destraba');
    await evaluar(cli, 'window.__posts=[];_cvConfirm()');
    const c8 = await registrado(cli, 'cobrarVendedorRed');
    chequear(c8.length === 1 && c8[0].cuenta === 'brubank', 'la rendicion va con cuenta:"brubank"', J(c8[0] && c8[0].cuenta));
    await dormir(800);
    chequear(/Brubank Lucas/.test(await evaluar(cli, '(document.getElementById("rutToast")||{}).textContent||""')),
      'y el aviso la nombra', await evaluar(cli, '(document.getElementById("rutToast")||{}).textContent||""'));

    // ── 9. COBROS: nada de wa.me ────────────────────────────────────────────
    console.log('\n-- "Pedir comprobante" copia el mensaje, no abre WhatsApp --');
    await arrancar(cli, CUENTAS);
    chequear(await evaluar(cli, 'document.querySelectorAll("a[href*=\'wa.me\']").length') === 0,
      'no queda ningun link wa.me en la pantalla');
    const nb = await evaluar(cli, 'Array.prototype.filter.call(document.querySelectorAll("#cobrosContent button"),function(b){return /Pedir comprobante/.test(b.textContent)}).length');
    chequear(nb >= 2, 'cada pedido tiene "Pedir comprobante", tenga telefono o no', nb);
    await evaluar(cli, 'cobroPedirComprobante(' + (await idxDe(cli, '9001')) + ')');
    await dormir(500);
    const cop = await evaluar(cli, 'window.__copiado');
    chequear(/maleump/.test(cop || '') && /maleubru/.test(cop || ''), 'el mensaje lleva los dos alias', cop);
    chequear(/comprobante/.test(cop || ''), 'y pide el comprobante');

    // ── 10. AUTOPEDIDO ──────────────────────────────────────────────────────
    console.log('\n-- AUTOPEDIDO: "Ya me pagó" por transferencia --');
    await arrancar(cli, CUENTAS, 'nuevo');
    await evaluar(cli, 'document.getElementById("npNombre").value="Prueba Autopedido";' +
      'npCart={5:1};npFechaSel=(function(){var d=new Date();d.setDate(d.getDate()+1);' +
      'return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})();' +
      'npSetPago("Transferencia");npUpdateTotal();');
    const msg10 = await evaluar(cli, 'npResumenTextoWA()');
    chequear(/maleump/.test(msg10) && /maleubru/.test(msg10), 'el mensaje al cliente lleva los dos alias', msg10.split('\n').slice(-4).join(' | '));
    await evaluar(cli, 'var y=document.getElementById("npYaCobrado");y.checked=true;npToggleYaCobrado();');
    await dormir(200);
    chequear(!await evaluar(cli, 'document.getElementById("npCtaWrap").classList.contains("hidden")'),
      'al marcar "Ya me pagó" pregunta a que cuenta');
    chequear(await evaluar(cli, 'document.querySelectorAll("#npCtaChips .np-chip").length') === 2 &&
      !await evaluar(cli, '!!document.querySelector("#npCtaChips .active")'), 'con las 2, ninguna elegida');
    await evaluar(cli, 'window.__posts=[];npGuardar()');
    await dormir(1200);
    chequear((await evaluar(cli, 'window.__posts.length')) === 0, 'sin cuenta NO guarda el pedido');
    chequear(/A qué cuenta/.test(await evaluar(cli, '(document.getElementById("rutToast")||{}).textContent||""')), 'y dice que falta');
    await tocar(cli, '#npCtaChips [data-cta=brubank]');
    await evaluar(cli, 'window.__posts=[];npGuardar()');
    await esperar(cli, 'window.__posts.length>0', 8000);
    const p10 = await evaluar(cli, 'JSON.stringify(window.__posts[0]||{})');
    let o10 = {}; try { o10 = JSON.parse(p10); } catch (e) { }
    chequear(o10.estadoPago === 'Cobrado' && o10.cuenta === 'brubank',
      'el pedido se guarda cobrado con cuenta:"brubank"', J({ ep: o10.estadoPago, c: o10.cuenta }));

    console.log('\n-- AUTOPEDIDO: "Ya me pagó" en EFECTIVO no pregunta --');
    await arrancar(cli, CUENTAS, 'nuevo');
    await evaluar(cli, 'document.getElementById("npNombre").value="Prueba Efectivo";npCart={5:1};' +
      'npFechaSel=(function(){var d=new Date();d.setDate(d.getDate()+1);' +
      'return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})();' +
      'npSetPago("Efectivo");npUpdateTotal();var y=document.getElementById("npYaCobrado");y.checked=true;npToggleYaCobrado();');
    chequear(await evaluar(cli, 'document.getElementById("npCtaWrap").classList.contains("hidden")'), 'no aparece la pregunta');
    await evaluar(cli, 'window.__posts=[];npGuardar()');
    await esperar(cli, 'window.__posts.length>0', 8000);
    let o11 = {}; try { o11 = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__posts[0]||{})')); } catch (e) { }
    chequear(o11.estadoPago === 'Cobrado' && !o11.cuenta, 'se guarda cobrado y sin cuenta', J({ ep: o11.estadoPago, c: o11.cuenta }));

    console.log('\n-- AUTOPEDIDO con UNA sola cuenta: el alias de siempre --');
    await arrancar(cli, UNA_SOLA, 'nuevo');
    await evaluar(cli, 'npCart={5:1};npSetPago("Transferencia");npUpdateTotal();');
    const msg12 = await evaluar(cli, 'npResumenTextoWA()');
    chequear(/alias: \*maleump\*/.test(msg12) && !/maleubru/.test(msg12), 'un solo alias, con el formato de siempre',
      msg12.split('\n').slice(-2).join(' | '));

    // ── 11. la consola ──────────────────────────────────────────────────────
    console.log('\n-- la consola --');
    const errs = await evaluar(cli, 'JSON.stringify(window.__errores||[])');
    chequear(errs === '[]', 'sin errores en la consola', errs);

  } finally {
    cli.matar();
  }

  console.log('\n=== ' + ok + ' ok · ' + mal + ' mal ===');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('\nREVENTO: ' + e.message); process.exit(2); });
