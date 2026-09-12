/**
 * Los carteles de "saldo a favor" salen del MAPA, sin pedir un GET por cliente.
 *
 * Hasta el 11/9/2026 los tres consumidores —el badge de ARMADO, el banner de
 * RUTA y el modal de cobro— pedian `action=saldoCliente` **uno por cliente**, y
 * sin guard de "ya lo estoy pidiendo" (el cache se escribe recien en el
 * `.then()`): medido en una corrida, **15 GET** con 7 clientes pendientes. La
 * cola del panel tiene 2 cupos, asi que esos 15 tapaban la fila y el ↻ de
 * COBROS tardaba **47 s** — el dato llegaba, pero detras de 15 consultas de un
 * cartelito. Hoy el mapa viene en `entregas` y en `cobrosPendientes`.
 *
 *   node probar_saldos_ruta.js <token> [390|1440]
 *
 * Datos INVENTADOS a proposito (este repo es publico): lo que se prueba es que
 * el cartel salga del mapa con el monto correcto, no quien tiene saldo hoy.
 * Los POST van interceptados: no se escribe un solo dato.
 *
 * Va en DOS FASES, cada una con su navegacion, y no es por prolijidad: el
 * fallback (un Apps Script que no manda el mapa) NO se puede probar desde
 * `Runtime.evaluate`, porque `RUT_SALDOS` vive en el IIFE de la sub-app y
 * asignarla desde afuera crea otra en `window`. La de adentro sigue con los
 * datos y el test da un verde falso: "0 pedidos de saldoCliente" sobre un
 * camino que nunca se ejercito.
 */
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')(process.argv[2]);
const ANCHO = Number(process.argv[3] || 390);

let ok = 0, mal = 0;
const chk = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (x !== undefined ? '   ' + x : '')); } };

/* Dos clientes con saldo y uno sin, para que el cartel tenga que DECIDIR. Si
   todos tuvieran saldo, "sale el cartel" no probaria que mira el monto. */
const SALDOS = { 'perez juan': 6000, 'gomez ana': 4855 };

/* La forma REAL de una entrega, copiada de `action=entregas` en produccion: el
   cliente es `c`, el estado `es`, el total `$`, el sub-barrio `sb`. La primera
   version de este test uso nombres inventados (`cli`, `est`, `tot`) y dio NUEVE
   rojos que eran del test — el badge nace con data-cliente vacio y
   `_populateArmadoSaldos` lo saltea sin dibujar nada.

   Y el primero va 100% ORDEN DE COMPRA a proposito: `getSorted()` deja entrar a
   RUTA lo que esta tildado en ARMADO **o** lo que es 100% OC, que pasa directo
   porque no hay nada que sacar del freezer. Sin eso, RUTA dice "Falta armar 1
   bolsa" y medirla da "el banner no aparece" sin haber mirado nada. */
const ENTREGAS = [
  { id: '901', h: 'Home', c: 'Perez Juan', t: '1130000001', b: 'Estancias del Pilar',
    sb: 'Golf', l: '10', d: 'Golf - Lote 10', f: '11/09/2026', fe: HOY(),
    de: 'Viernes', es: 'Pendiente', ep: 'No Cobrado', fp: 'Efectivo', '$': 20000,
    p: [{ a: 'PPM', q: 2 }], oc: [{ a: 'PPM', q: 2 }], oD: { PPM: 'OC' },
    o: 'Orden de Compra', r: 901 },
  { id: '902', h: 'Home', c: 'Gomez Ana', t: '1130000002', b: 'Estancias del Pilar',
    sb: 'La Pionera', l: '4', d: 'La Pionera - Lote 4', f: '11/09/2026', fe: HOY(),
    de: 'Viernes', es: 'Pendiente', ep: 'No Cobrado', fp: 'Transferencia', '$': 31000,
    p: [{ a: 'PPJyQ', q: 1 }], o: 'Deposito', r: 902 },
  { id: '903', h: 'Home', c: 'Sin Saldo Lopez', t: '1130000003', b: 'Estancias del Pilar',
    sb: 'Golf', l: '7', d: 'Golf - Lote 7', f: '11/09/2026', fe: HOY(),
    de: 'Viernes', es: 'Pendiente', ep: 'No Cobrado', fp: 'Efectivo', '$': 15000,
    p: [{ a: 'PPM', q: 1 }], o: 'Deposito', r: 903 },
];

/* La entrega tiene que ser de HOY o RUTA no la toma (getHoyPendientes). Con una
   fecha fija el test envejeceria al dia siguiente. */
function HOY() {
  const d = new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  return d.slice(0, 10);
}

const STUB = `
  window.__saldoGets = [];
  window.__ENTREGAS = ${JSON.stringify(ENTREGAS)};
  window.__SALDOS = ${JSON.stringify(SALDOS)};
  /* El flag va por la URL y no por una inyeccion nueva:
     addScriptToEvaluateOnNewDocument ACUMULA, y una segunda inyeccion
     envuelve el fetch dos veces y deja la sub-app sin arrancar. */
  window.__SIN_MAPA = location.search.indexOf('sinmapa=1') >= 0;
  (function(){ var o = window.fetch; window.fetch = function (u, x) {
    var url = String(u || '');
    var esGet = !(x && String(x.method||'').toUpperCase() === 'POST');
    if (esGet && url.indexOf('action=saldoCliente') >= 0) {
      /* Se anota Y se contesta: si el front igual cae al camino viejo el cartel
         sale, y lo que falla es el chequeo de "no lo pidio" — que es justo lo
         que se quiere distinguir. */
      window.__saldoGets.push(url);
      var m = url.match(/cliente=([^&]*)/);
      var nom = m ? decodeURIComponent(m[1]).toLowerCase() : '';
      return Promise.resolve(new Response(
        JSON.stringify({ ok: true, saldo: window.__SALDOS[nom] || 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    if (esGet && url.indexOf('action=entregas') >= 0) {
      var r = { ts: Date.now(), e: window.__ENTREGAS,
        prods: { PPM: { n: 'Pack Muzzarella x2', u: 'u' }, PPJyQ: { n: 'Pack J&Q x2', u: 'u' } },
        cuentas: [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' },
                  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', def: true }] };
      /* Un Apps Script anterior al 11/9/2026 no manda el mapa. */
      if (!window.__SIN_MAPA) r.saldos = window.__SALDOS;
      return Promise.resolve(new Response(JSON.stringify(r),
        { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return o.apply(this, arguments); }; })();
`;

/** Abre el ERP, entra a RUTA y espera a que las entregas del stub esten
 *  adentro. Devuelve cuantos badges nacieron con nombre: si son 0, los datos
 *  del test no tienen la forma real y todo lo de abajo mide una pantalla vacia. */
let _inyectado = false;
async function abrirRuta(cli, sinMapa) {
  if (!_inyectado) {
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + STUB });
    _inyectado = true;
  }
  await cli.enviar('Page.navigate', {
    url: 'http://localhost:8080/app.html?t=' + Date.now() + (sinMapa ? '&sinmapa=1' : '') });
  await new Promise(r => setTimeout(r, 2800));
  return await evaluar(cli, `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 40000 && typeof window.go !== 'function')
      await new Promise(r => setTimeout(r, 200));
    if (typeof window.go !== 'function') return { err: 'el ERP no arranco' };
    go('ruta');
    const t1 = Date.now();
    while (Date.now() - t1 < 30000 && typeof window.switchTab !== 'function')
      await new Promise(r => setTimeout(r, 150));
    if (typeof window.switchTab !== 'function') {
      /* Decir POR QUE no arranco: _abrirSubapp se traga la excepcion y pinta un
         cartel, asi que "no arranco" a secas manda a buscar donde no es. */
      var c = document.getElementById('pg-ruta') || document.body;
      return { err: 'la sub-app de RUTA no arranco',
               pantalla: (c.innerText || '').replace(/\\s+/g, ' ').slice(0, 220),
               consola: (window.__err || []).slice(0, 4) };
    }
    const t2 = Date.now();
    while (Date.now() - t2 < 30000) {
      try { if (getPendientes().length >= 3) break; } catch (e) {}
      await new Promise(r => setTimeout(r, 200));
    }
    switchTab('armado');
    await new Promise(r => setTimeout(r, 1200));
    /* Los dias arrancan PLEGADOS en cada refresh (deliberado, ruta.html:1156):
       sin abrirlos, medir ARMADO da "no aparece" sin mirar nada. */
    document.querySelectorAll('#armadoView .day-header, #armadoView [onclick*="toggleCollapse"]')
      .forEach(function (h) { try { h.click(); } catch (e) {} });
    await new Promise(r => setTimeout(r, 1800));
    const conNombre = [...document.querySelectorAll('#armadoView .armado-saldo[data-cliente]')]
      .filter(function (x) { return (x.getAttribute('data-cliente') || '').trim(); }).length;
    return { n: getPendientes().length, sorted: getSorted().length, conNombre: conNombre };
  })()`);
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride',
    { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });

  /* ══ FASE 1: el backend manda el mapa ═════════════════════════════════════ */
  console.log('\n== Los saldos salen del mapa · ' + ANCHO + 'px ==\n');
  let a = await abrirRuta(cli, false);
  if (a.err) { console.log('  MAL  ' + a.err); process.exit(1); }
  chk(a.n >= 3, 'entraron las ' + ENTREGAS.length + ' entregas del stub', a.n);
  chk(a.sorted >= 1, 'y RUTA tiene al menos una parada (la 100% OC)', a.sorted);
  if (a.conNombre < 2) {
    console.log('\n  REVENTO EL HARNESS: solo ' + a.conNombre + ' badge(s) con data-cliente.');
    console.log('  Los datos del test no tienen la forma de action=entregas');
    console.log('  (el cliente es `c`, no `cli`). Lo de abajo mediria una pantalla vacia.\n');
    process.exit(2);
  }

  const armado = await evaluar(cli, `(() => {
    const els = [...document.querySelectorAll('#armadoView .armado-saldo')];
    const vis = els.filter(e => e.offsetParent !== null && (e.textContent || '').trim());
    return { total: els.length, txt: vis.map(e => e.textContent.trim()),
             cuerpo: (document.getElementById('armadoView') || {}).innerText || '' };
  })()`);
  /* Perez no esta en ARMADO: es 100% OC y pasa directo a RUTA (ahi se lo mide).
     Lo que ARMADO tiene que mostrar es el badge de Gomez y NINGUNO en Lopez. */
  chk(armado.txt.some(t => /4\.855/.test(t)), 'el badge de ARMADO dice los $4.855 de Gomez', JSON.stringify(armado.txt));
  chk(armado.txt.length === 1, 'y NO le pone badge al que no tiene saldo',
    armado.txt.length + ' badges: ' + JSON.stringify(armado.txt));
  chk(/a favor/.test(armado.cuerpo), 'se lee "a favor" en la pantalla');

  const ruta = await evaluar(cli, `(async () => {
    switchTab('ruta');
    await new Promise(r => setTimeout(r, 2000));
    const els = [...document.querySelectorAll('#rutaView .ruta-saldo-previo')];
    const vis = els.filter(e => e.offsetParent !== null && (e.innerHTML || '').trim());
    return { total: els.length, txt: vis.map(e => (e.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 70)),
             cuerpo: ((document.getElementById('rutaView') || {}).innerText || '').replace(/\\s+/g, ' ') };
  })()`);
  chk(ruta.total >= 1, 'RUTA dibuja el lugar del banner', ruta.total);
  chk(/6\.000/.test(ruta.txt.join(' ')), 'y el banner de la parada dice sus $6.000', JSON.stringify(ruta.txt));

  const gets = await evaluar(cli, `window.__saldoGets.slice()`);
  chk(gets.length === 0, 'no se pidio NI UN action=saldoCliente (antes eran 15)',
    gets.length + ': ' + JSON.stringify(gets.map(u => (u.match(/cliente=([^&]*)/) || [])[1])));

  const ls = await evaluar(cli, `(() => {
    try { return JSON.parse(localStorage.getItem('maleu_ruta_saldos') || 'null'); }
    catch (e) { return null; }
  })()`);
  chk(ls && Number(ls['perez juan']) === 6000,
    'el mapa se guarda: la 1ra pintada ya sale bien, antes del fetch', JSON.stringify(ls));

  /* ══ FASE 2: el backend NO manda el mapa (Apps Script viejo) ══════════════ */
  console.log('\n-- reabriendo la app, con un backend que no manda el mapa --');
  await evaluar(cli, `(() => { try { localStorage.removeItem('maleu_ruta_saldos'); } catch (e) {} return 1; })()`);
  a = await abrirRuta(cli, true);
  /* Esta reapertura vale por si sola, y es el hallazgo mas grave del 11/9/2026:
     el telefono ya tiene paradas guardadas y la sub-tab RUTA abierta, que es el
     estado de cualquier viernes a la noche. Hasta ese dia la primera pintada
     corria ANTES de declarar `_RTC_ICO` (L1604 contra L3447), asi que
     `rutRender()` reventaba con "Cannot read properties of undefined (reading
     'izq')", `_abrirSubapp` se tragaba la excepcion y la sub-app NUNCA publicaba
     sus globales: la tab quedaba muerta y el ↻ no actualizaba nada. */
  chk(!a.err, 'la sub-app ARRANCA con paradas ya guardadas en el telefono',
    a.err ? a.err + ' | ' + (a.consola || []).join(' / ') : '');
  if (a.err) {
    console.log('  MAL  ' + a.err);
    if (a.pantalla) console.log('       pantalla: ' + a.pantalla);
    if (a.consola && a.consola.length) console.log('       consola: ' + JSON.stringify(a.consola));
    process.exit(1);
  }

  const fb = await evaluar(cli, `(async () => {
    /* Por este camino el badge se llena cuando VUELVE el fetch, no al pintar:
       medir enseguida da "el cartel no sale" y es del test. */
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      const hay = [...document.querySelectorAll('#armadoView .armado-saldo')]
        .some(e => (e.textContent || '').trim());
      if (hay) break;
      await new Promise(r => setTimeout(r, 200));
    }
    const els = [...document.querySelectorAll('#armadoView .armado-saldo')]
      .filter(e => e.offsetParent !== null && (e.textContent || '').trim());
    return { pedidos: window.__saldoGets.length, txt: els.map(e => e.textContent.trim()) };
  })()`);
  chk(fb.pedidos > 0, 'cae al GET de antes: nadie se queda sin ver su saldo', fb.pedidos + ' pedidos');
  chk(fb.txt.some(t => /4\.855/.test(t)), '  y el cartel sale igual', JSON.stringify(fb.txt));
  /* Ese camino tenia el bug del guard: N renders = N fetches del mismo cliente,
     porque el cache se escribe recien al volver la respuesta. Con 2 clientes
     con saldo, tres renders seguidos tienen que pedir 2 y no 6. */
  chk(fb.pedidos <= 3, '  y no pide el mismo cliente una vez por render',
    fb.pedidos + ' pedidos (ARMADO tiene 2 clientes)');

  console.log('\n  ' + (mal ? ok + ' ok · ' + mal + ' MAL' : ok + ' ok, todo bien') + '\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('revento el test:', e); process.exit(2); });
