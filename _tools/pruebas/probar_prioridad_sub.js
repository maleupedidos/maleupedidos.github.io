/**
 * ¿La cola prioriza el endpoint de la SUB-tab que se esta mirando?
 *
 * `_PINTA_TAB` mapea tab -> endpoint, y Stock es la unica tab cuyas sub-tabs
 * piden endpoints distintos: PRODUCTOS el volcado, CONTAR y MOVER `depositos`,
 * RECIBIR CARNE `carnePiezas`. Sin `_PINTA_SUB`, entrar a CONTAR priorizaba
 * `admin` (28 s) por delante del `depositos` (3-5 s) que es lo unico que esa
 * pantalla dibuja.
 *
 * EL METODO ES EL DEL 10/9/2026 y no se cambia: medir el tiempo total da verde
 * con el bug adentro, porque la varianza de Apps Script (24, 57, 121 s para el
 * mismo `admin`) es mas grande que el efecto. Lo determinista es **el orden en
 * que la cola elige**: con un mock lento (15 s) la fila queda quieta con los
 * cupos ocupados, se entra a la sub-tab ahi, y al liberarse un cupo la cola
 * tiene que elegir el endpoint de esa sub-tab.
 *
 *   node probar_prioridad_sub.js <token>
 *
 * Para ver el orden de ANTES hay que reinyectar el bug EN LA FUENTE (dejar
 * `_PINTA_SUB` vacio en `_src/panel.src.html` y recompilar) y correrlo de nuevo:
 * `_PINTA_SUB` vive en el IIFE de la cola, asi que apagarlo desde `window` no
 * cambia nada y el test daria verde con el bug adentro. Medido: con el bug sale
 * `admin` primero y `depositos` no sale — 2 ok · 2 MAL.
 */
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')(process.argv[2]);

const DEMORA = 15000;
let ok = 0, mal = 0;
const chk = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (x ? '   ' + x : '')); } };

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  /* Todo GET al backend tarda DEMORA y anota cuando SALIO. Lo que se mide es el
     orden de salida, no el de llegada. */
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + `
    window.__salidas = [];
    window.__t0 = Date.now();
    (function(){ var o = window.fetch; window.fetch = function (u, x) {
      var url = String(u || '');
      var esGet = !(x && String(x.method||'').toUpperCase() === 'POST');
      if (esGet && url.indexOf('script.google.com/macros') >= 0) {
        var m = url.match(/[?&]action=([a-zA-Z_]+)/);
        window.__salidas.push({ a: m ? m[1] : '?', ms: Date.now() - window.__t0 });
        return new Promise(function (res) {
          setTimeout(function () {
            res(new Response(JSON.stringify({ ok: true, deps: [], productos: [], cortes: [], piezas: [], porCorte: {} }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }, ${DEMORA});
        });
      }
      return o.apply(this, arguments); }; })();
  ` });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
  await new Promise(r => setTimeout(r, 2500));

  const listo = await evaluar(cli, `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      if (typeof window.go === 'function' && typeof window.stSwitchTab === 'function'
          && typeof window.__colaGet === 'function') return 'listo';
      await new Promise(r => setTimeout(r, 150));
    }
    return 'el ERP no arranco';
  })()`);
  if (listo !== 'listo') { console.log('  MAL  ' + listo); process.exit(1); }

  console.log('\n== La cola prioriza la SUB-tab que se esta mirando ==\n');

  /* La fila tiene que estar QUIETA antes de entrar: si todavia se esta vaciando,
     la decision ya se tomo y el test mide su propia impaciencia. */
  const fila = await evaluar(cli, `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) {
      const c = window.__colaGet();
      if (c.vuelo > 0 && c.cola > 0) return c;
      await new Promise(r => setTimeout(r, 120));
    }
    return window.__colaGet();
  })()`);
  chk(fila.cola > 0 && fila.vuelo > 0, 'la fila quedo quieta: ' + fila.vuelo + ' en vuelo, ' + fila.cola + ' esperando',
      JSON.stringify(fila));
  if (!fila.cola) { console.log('\n  sin cola no hay prioridad que medir\n'); process.exit(1); }

  const orden = await evaluar(cli, `(async () => {
    go('stock'); stSwitchTab('contar');
    const antes = window.__salidas.length;
    const t0 = Date.now();
    /* Esperar a que la cola suelte DOS mas: el primero es la decision. */
    while (Date.now() - t0 < ${DEMORA * 3}) {
      if (window.__salidas.length >= antes + 2) break;
      await new Promise(r => setTimeout(r, 120));
    }
    return { antes: antes, todas: window.__salidas,
             nuevas: window.__salidas.slice(antes).map(x => x.a) };
  })()`);

  const nuevas = orden.nuevas || [];
  console.log('  orden de salida completo: ' + orden.todas.map(x => x.a + '@' + Math.round(x.ms / 1000) + 's').join(' -> '));
  console.log('  lo que solto DESPUES de entrar a CONTAR: ' + JSON.stringify(nuevas));

  const iDep = nuevas.indexOf('depositos');
  const iAdm = nuevas.indexOf('admin');
  chk(iDep >= 0, '`depositos` sale: es el endpoint de CONTAR', JSON.stringify(nuevas));
  chk(iDep === 0, '  y sale PRIMERO de la fila', 'salio en la posicion ' + iDep);
  /* Con `depositos` ausente, iDep = -1 pasaba este chequeo por ser < iAdm: un
     verde sobre algo que nunca salio. Tiene que estar Y estar antes. */
  chk(iDep >= 0 && (iAdm < 0 || iDep < iAdm), '  antes que el volcado, que esa sub-tab no dibuja',
      'depositos=' + iDep + ' admin=' + iAdm);

  /* ── RUTA: la tab que se usa MANEJANDO, y que tampoco estaba en `_PINTA_TAB`.
     Sus sub-tabs viven en `ruta.html` y usan `.tab.active` con `data-tab`, o sea
     otro selector: si `_subAbierta` no lo contempla, la prioridad queda muerta y
     el sintoma es solo que la pantalla tarda. */
  console.log('\n-- y la tab RUTA, con sus cuatro sub-tabs --');
  const rutaOrden = await evaluar(cli, `(async () => {
    /* switchTab la publica la sub-app al ARRANCAR, o sea al entrar a la tab:
       preguntar por ella antes del go da siempre "no arranco".
       (Nada de backticks aca: estamos dentro de un template literal.) */
    go('ruta');
    const t1 = Date.now();
    while (Date.now() - t1 < 20000 && typeof window.switchTab !== 'function') {
      await new Promise(r => setTimeout(r, 150));
    }
    if (typeof window.switchTab !== 'function') return { err: 'la sub-app de ruta no arranco en 20 s' };
    /* COBROS pide un endpoint DISTINTO que ARMADO: es el caso que prueba que la
       prioridad mira la sub-tab y no la tab. */
    switchTab('cobros');
    const antes = window.__salidas.length;
    const t0 = Date.now();
    while (Date.now() - t0 < ${DEMORA * 3}) {
      if (window.__salidas.length >= antes + 1) break;
      await new Promise(r => setTimeout(r, 120));
    }
    const act = document.querySelector('#p-ruta .tab.active');
    return { nuevas: window.__salidas.slice(antes).map(x => x.a),
             sub: act ? act.getAttribute('data-tab') : '(sin sub-tab activa)' };
  })()`);
  if (rutaOrden.err) {
    console.log('  --   ' + rutaOrden.err + ' (RUTA se mide en otra corrida)');
  } else {
    chk(rutaOrden.sub === 'cobros', 'la sub-tab abierta es COBROS', JSON.stringify(rutaOrden));
    console.log('  solto: ' + JSON.stringify(rutaOrden.nuevas));
    chk((rutaOrden.nuevas || [])[0] === 'cobrosPendientes',
      '  y la cola suelta `cobrosPendientes`, el endpoint de COBROS', JSON.stringify(rutaOrden.nuevas));
  }

  console.log('\n' + (mal ? '  ' + ok + ' ok · ' + mal + ' MAL' : '  ' + ok + ' ok, todo bien') + '\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('revento el test:', e); process.exit(2); });
