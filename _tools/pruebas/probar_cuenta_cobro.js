/**
 * El cuadro de Cobros preguntando a que cuenta entro la transferencia.
 *
 * Corre en un Chrome de verdad con TODOS los POST interceptados: la planilla
 * no se toca.
 *
 * Los clientes y las direcciones son inventados: este repo es publico por
 * Pages y no entra ningun dato de un cliente real.
 *
 * Se abre `ruta.html?standalone=1` a proposito: en el `app.html` fusionado el
 * estado de la sub-app (`_cobroRutaState`, `RUT_CTAS`) vive dentro de un IIFE
 * y no se puede leer desde afuera. `npm run auditar` ya verifica que suelta y
 * fusionada se ven igual.
 *
 * CADA CASO ARRANCA EN UNA PAGINA NUEVA, y no es por prolijidad: confirmar un
 * cobro deja una cadena de promesas que termina llamando a `cerrarCobroRuta()`,
 * y esa llamada le pone `null` al cuadro que el caso siguiente acaba de abrir.
 * Encadenar los casos hacia que fallara uno distinto en cada corrida.
 *
 *   node probar_cta_cobro.js [ancho]
 */
const path = require('path');
const PRU = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas';
const { abrir, evaluar } = require(path.join(PRU, 'cdp.js'));

const ANCHO = Number(process.argv[2]) || 390;
/* `&prueba=1` NO es opcional: sin el, el interceptor de sesion ve un
   authRequired, hace alert + location.reload() y la pagina se recarga a
   mitad de la medicion. El sintoma es que `_cobroRutaState` pasa a null
   sin que nadie llame a cerrarCobroRuta, y falla un caso distinto en cada
   corrida. Es la trampa ya anotada del 3/9/2026. */
/* El archivo a servir. Se parametriza para poder correr el MISMO test
   sobre una copia con un bug adentro: un test que da verde con el bug
   puesto no prueba nada. */
const ARCH = process.argv[3] || 'ruta.html';
const BASE = 'http://localhost:8080/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chequear = (cond, txt, det) => {
  if (cond) { ok++; console.log('  ok    ' + txt); }
  else { mal++; console.log('  MAL   ' + txt + (det !== undefined ? '  -> ' + det : '')); }
};

/* Dos pedidos pendientes, inventados. Nombres y direcciones falsos a proposito:
   este archivo puede terminar en el repo, que es publico por Pages. */
const COBROS = [
  { h: 'Home', id: '9001', r: 900, c: 'Prueba Uno', t: '', $: 50000,
    totalOriginal: 50000, fp: 'Transferencia', dir: 'Golf · Lote 1' },
  { h: 'Home', id: '9002', r: 901, c: 'Prueba Dos', t: '', $: 30000,
    totalOriginal: 30000, fp: 'Efectivo', dir: 'Golf · Lote 2' }
];

const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', col: 7, def: false, inv: false }
];

/** El PREP: intercepta la red ANTES de que corra el ERP.
 *  `cts` es la lista de cuentas que va a "mandar" el backend. */
function prep(cts) {
  return `
    window.__posts = []; window.__avisos = []; window.__errores = [];
    window.addEventListener('error', function(e){ window.__errores.push(String(e.message)); });
    (function(){
      var of = window.fetch;
      window.fetch = function(u, o){
        var url = String((u && u.url) || u || '');
        if (o && String(o.method || '').toUpperCase() === 'POST') {
          var b = o.body;
          try { b = (typeof b === 'string') ? JSON.parse(b) : b; } catch(e){}
          window.__posts.push(b);
          /* Se contesta lo que el ERP espera de verdad: un {ok:true} pelado
             hace fallar codigo que anda. Ya paso tres veces. */
          return Promise.resolve(new Response(
            JSON.stringify({ ok: true, total: null, aFavor: 0, aplicacion: 0,
                             cambioMP: 0, cambioEf: 0,
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

/** Pagina nueva, con las cuentas que se le indiquen, ya parada en COBROS.
 *
 *  Quita el PREP anterior antes de poner el nuevo: los scripts de
 *  `addScriptToEvaluateOnNewDocument` se ACUMULAN, asi que sin esto la cuarta
 *  navegacion corre cuatro interceptores de fetch anidados. Eso hacia que
 *  fallara un caso distinto en cada corrida.
 */
let _prepId = null;
async function arrancar(cli, cts) {
  if (_prepId) {
    try { await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: _prepId }); }
    catch (e) { /* si no se puede quitar, igual seguimos */ }
  }
  const r = await cli.enviar('Page.addScriptToEvaluateOnNewDocument',
    { source: 'try{localStorage.clear()}catch(e){}\n' + prep(cts) });
  _prepId = r && r.identifier;
  await cli.enviar('Page.navigate', { url: BASE });
  await dormir(3200);
  if (!await esperar(cli, 'typeof window.switchTab === "function"'))
    throw new Error('la sub-app no arranco');
  await evaluar(cli, 'switchTab("cobros")');
  if (!await esperar(cli,
      '(function(){try{return pendientesCobro && pendientesCobro.length===2}catch(e){return false}})()'))
    throw new Error('los pedidos de prueba no llegaron');
  /* Que no quede ningun fetch de cobrosPendientes en vuelo: si uno llega
     despues de abrir el cuadro, repinta la lista debajo. */
  await dormir(1500);
}

/** El indice de un pedido por su N. La lista se ordena, asi que asumir que [0]
 *  es tal pedido es asumir un orden que nadie promete. */
async function idxDe(cli, id) {
  const i = await evaluar(cli,
    '(function(){try{for(var i=0;i<pendientesCobro.length;i++)' +
    'if(String(pendientesCobro[i].id)==="' + id + '")return i;return -1}catch(e){return -1}})()');
  if (i < 0) throw new Error('no encontre el pedido ' + id);
  return i;
}

/** Abre el cuadro y EXIGE que quede abierto: con el estado en null, "el
 *  selector no aparece" da ok — y es un ok falso. */
async function abrirCuadro(cli, id) {
  await evaluar(cli, 'abrirCobroPendiente(' + (await idxDe(cli, id)) + ')');
  if (!await esperar(cli, '!!_cobroRutaState', 8000)) {
    const t = await evaluar(cli,
      '(function(){var e=document.getElementById("rutToast")||document.getElementById("toast");return e?e.textContent:"-"})()');
    throw new Error('el cuadro de ' + id + ' no abrio (toast: ' + t + ')');
  }
  await dormir(300);
}

/** Confirma y devuelve lo que quedo REGISTRADO: la cola o el POST, lo que
 *  aparezca primero. `marcarCobrado` es optimista —marca local, encola, guarda
 *  y despues manda—, y la cola procesa de a uno: exigir que el POST ya haya
 *  salido es medir la impaciencia del test. (Leccion del 3/9/2026.) */
async function confirmarYEsperar(cli, accion) {
  await evaluar(cli, 'window.__posts=[]; window.__avisos=[];');
  /* El cuadro tiene que seguir abierto: `confirmarCobroRuta` arranca con
     `if(!st)return`, asi que con el estado en null no hace NADA y el test
     reporta un rojo que es suyo, no del ERP. */
  if (!await evaluar(cli, '!!_cobroRutaState'))
    throw new Error('el cuadro se cerro antes de confirmar: el test perdio el estado');
  const r = await evaluar(cli,
    '(function(){try{confirmarCobroRuta();return "OK"}catch(e){return "THROW: "+e.message}})()');
  const leer = async () => {
    const txt = await evaluar(cli,
      '(function(){var a=(window.__posts||[]).filter(function(p){return p&&p.action==="' + accion + '"});' +
      'var b=[];try{b=(syncQueue||[]).filter(function(q){return q&&q.action==="' + accion + '"})}catch(e){}' +
      'return JSON.stringify(a.length?a:b)})()');
    try { return JSON.parse(txt || '[]'); } catch (e) { return []; }
  };
  const t0 = Date.now();
  let out = [];
  while (Date.now() - t0 < 12000) {
    out = await leer();
    if (out.length) break;
    await dormir(200);
  }
  if (!out.length) {
    console.log('       (nada registrado) confirmar=' + r +
      ' estado=' + await evaluar(cli, '(_cobroRutaState?"abierto":"null")') +
      ' avisos=' + await evaluar(cli, 'JSON.stringify(window.__avisos||[])'));
  }
  return out;
}

/** Carga en el input el total QUE EL ERP dice, no uno adivinado: al cambiar de
 *  metodo el total se recalcula (el 10% OFF de efectivo), y un monto de menos
 *  hace que `confirmarCobroRuta` frene sin decir nada al test. */
async function cargarTotal(cli, campo) {
  const t = await evaluar(cli, '_cobroRutaState.total');
  await evaluar(cli, '_setMoneyInput("' + campo + '", ' + Number(t) + '); _recalcCobroRuta();');
  await dormir(400);
  return Number(t);
}

const display = cli => evaluar(cli,
  'document.getElementById("cobroCtaSection").style.display');

(async () => {
  const cli = await abrir({});
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride',
      { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });

    console.log('\n' + '='.repeat(70));
    console.log('LA CUENTA DEL COBRO  ·  ' + ANCHO + 'px');
    console.log('='.repeat(70));

    // ── 1. las cuentas llegan y se leen bien ────────────────────────────────
    console.log('\n-- las cuentas llegan por cobrosPendientes --');
    await arrancar(cli, CUENTAS);
    chequear(await evaluar(cli, '(RUT_CTAS||[]).length') === 3,
      'llegan las 3 cuentas');
    chequear(await evaluar(cli, '_ctasDigitales().length') === 2,
      'y 2 son digitales: el efectivo no se elige');
    chequear(await evaluar(cli, '_ctaDefault()') === 'mp',
      'la default sale de la marca `def` del backend, no del orden de la hoja');

    // ── 2. un pedido por transferencia ──────────────────────────────────────
    console.log('\n-- un pedido por TRANSFERENCIA --');
    await abrirCuadro(cli, '9001');
    chequear(await display(cli) !== 'none', 'el selector APARECE',
      await evaluar(cli, '"["+document.getElementById("cobroCtaSection").style.display+"] fp="+_cobroRutaState.fp'));
    const pills = await evaluar(cli,
      'Array.prototype.map.call(document.querySelectorAll("#cobroRutaCta .cobro-pill"),' +
      'function(p){return p.getAttribute("data-cta")}).join(",")');
    chequear(pills === 'mp,brubank', 'con las 2 cuentas digitales', pills);
    const txt = await evaluar(cli, 'document.getElementById("cobroRutaCta").textContent');
    chequear(/Mercado Pago Tadeo/.test(txt) && /Brubank Lucas/.test(txt),
      'y con el nombre de cada una, no el id', txt);
    chequear(await evaluar(cli,
      '!!document.querySelector("#cobroRutaCta .cobro-pill.on[data-cta=mp]")'),
      'la default viene preseleccionada');

    const altos = await evaluar(cli,
      'Array.prototype.map.call(document.querySelectorAll("#cobroRutaCta .cobro-pill"),' +
      'function(p){return Math.round(p.getBoundingClientRect().height)}).join(",")');
    chequear(Math.min(...String(altos).split(',').map(Number)) >= 38,
      'los pills llegan al minimo tactil del ERP (38px)', altos);
    chequear(!await evaluar(cli,
      '(function(){var b=document.getElementById("cobroRutaCta");return b.scrollWidth>b.clientWidth+2})()'),
      'y no desbordan la caja');

    // ── 3. elegir el Brubank ────────────────────────────────────────────────
    console.log('\n-- elegir el Brubank y cobrar --');
    await evaluar(cli, '_setCobroCta("brubank")');
    chequear(await evaluar(cli, '_cobroRutaState.cta') === 'brubank',
      'el estado guarda la eleccion');
    chequear(await evaluar(cli,
      '!!document.querySelector("#cobroRutaCta .cobro-pill.on[data-cta=brubank]")'),
      'y el pill queda marcado');
    await cargarTotal(cli, 'cobroRecMP');
    const c1 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c1.length === 1, 'quedo UN cobro registrado', c1.length);
    chequear(c1.length === 1 && c1[0].cuenta === 'brubank',
      'y lleva cuenta:"brubank"', c1.length ? JSON.stringify(c1[0].cuenta) : '-');
    chequear(c1.length === 1 && c1[0].formaPago === 'Transferencia',
      'con la forma de pago intacta', c1.length ? c1[0].formaPago : '-');

    // ── 4. un pedido en efectivo (pagina nueva) ─────────────────────────────
    console.log('\n-- un pedido en EFECTIVO: no se pregunta nada --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9002');
    chequear(await display(cli) === 'none', 'el selector NO aparece',
      await evaluar(cli, '"fp="+_cobroRutaState.fp'));
    await cargarTotal(cli, 'cobroRecEf');
    const c2 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c2.length === 1 && c2[0].cuenta === '',
      'y manda cuenta VACIA: el efectivo no elige cuenta',
      c2.length ? JSON.stringify(c2[0].cuenta) : '-');

    // ── 5. cambiar de metodo prende y apaga el selector ─────────────────────
    console.log('\n-- cambiar de metodo prende y apaga el selector --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9002');
    chequear(await display(cli) === 'none', 'arranca escondido (pedido en efectivo)');
    await evaluar(cli, '_setCobroFp("Transferencia")'); await dormir(300);
    chequear(await display(cli) !== 'none', 'al pasar a Transferencia APARECE',
      await evaluar(cli, '"["+document.getElementById("cobroCtaSection").style.display+"] fp="+_cobroRutaState.fp'));
    chequear(await evaluar(cli, '_cobroRutaState.cta') === 'mp',
      'y se preselecciona la default');
    await evaluar(cli, '_setCobroFp("Mixto")'); await dormir(300);
    chequear(await display(cli) !== 'none', 'en Mixto tambien: hay una parte digital');
    await evaluar(cli, '_setCobroFp("Efectivo")'); await dormir(300);
    chequear(await display(cli) === 'none', 'y al volver a Efectivo se esconde');

    // ── 5b. elegir una cuenta y DESPUES pasar a efectivo ───────────────────
    /* El caso real: te equivocas de metodo, elegis el Brubank, y despues lo
       corregis a Efectivo. La cuenta ya quedo en el estado, asi que el payload
       tiene que mandarla VACIA igual — si no, un cobro en efectivo le suma
       plata al Brubank. */
    console.log('\n-- elegir Brubank y despues corregir a EFECTIVO --');
    await arrancar(cli, CUENTAS);
    await abrirCuadro(cli, '9001');
    await evaluar(cli, '_setCobroCta("brubank")');
    chequear(await evaluar(cli, '_cobroRutaState.cta') === 'brubank',
      'la cuenta quedo elegida');
    await evaluar(cli, '_setCobroFp("Efectivo")'); await dormir(300);
    chequear(await display(cli) === 'none', 'y al corregir a Efectivo se esconde');
    chequear(await evaluar(cli, '_cobroRutaState.cta') === 'brubank',
      'el estado CONSERVA la eleccion (por si vuelve a Transferencia)');
    await cargarTotal(cli, 'cobroRecEf');
    const c2b = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c2b.length === 1 && c2b[0].cuenta === '',
      'pero el payload manda cuenta VACIA: en efectivo no se imputa a ninguna',
      c2b.length ? JSON.stringify(c2b[0].cuenta) : '-');

    // ── 6. una sola cuenta digital: nada que elegir ─────────────────────────
    console.log('\n-- con UNA sola cuenta digital no hay nada que elegir --');
    await arrancar(cli, CUENTAS.filter(c => c.id !== 'brubank'));
    chequear(await evaluar(cli, '_ctasDigitales().length') === 1,
      'llego una sola cuenta digital');
    await abrirCuadro(cli, '9001');
    chequear(await display(cli) === 'none',
      'el selector NO se dibuja: un boton que se contesta solo es friccion sin dato');
    await cargarTotal(cli, 'cobroRecMP');
    const c3 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c3.length === 1 && c3[0].cuenta === '',
      'y manda cuenta vacia: el backend la resuelve al default, que es esa misma',
      c3.length ? JSON.stringify(c3[0].cuenta) : '-');

    // ── 7. sin cuentas: como antes del 10/9 ─────────────────────────────────
    console.log('\n-- sin cuentas (un backend viejo): todo como antes del 10/9 --');
    await arrancar(cli, []);
    await abrirCuadro(cli, '9001');
    chequear(await display(cli) === 'none', 'no se dibuja nada');
    await cargarTotal(cli, 'cobroRecMP');
    const c4 = await confirmarYEsperar(cli, 'marcarCobrado');
    chequear(c4.length === 1 && c4[0].cuenta === '',
      'y el cobro sale igual, con cuenta vacia',
      c4.length ? JSON.stringify(c4[0].cuenta) : '-');

    // ── 8. la consola ───────────────────────────────────────────────────────
    console.log('\n-- la consola --');
    const errs = await evaluar(cli,
      '(window.__errores||[]).filter(function(e){return /_ctaDe|_pintarCobroCtas|RUT_CTAS|_ctasDigitales|_mostrarCuadroCobro/.test(e)}).length');
    chequear(Number(errs || 0) === 0, 'sin errores de las piezas nuevas', errs);

  } finally {
    cli.matar();
  }

  console.log('\n=== ' + ok + ' ok · ' + mal + ' mal ===');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('\nREVENTO: ' + e.message); process.exit(2); });
