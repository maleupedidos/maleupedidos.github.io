/**
 * medir_abastecimiento_foto.js — Abastecimiento: cuánto tarda en tener los datos
 * por Apps Script y cuánto leyendo la foto de PostgreSQL.
 *
 * Mide el ANTES y el DESPUÉS del mismo ERP, en un Chrome de verdad, con el
 * payload real (`fixtures-pagos/busqueda.json`, 181,6 KB, producido por
 * producción) y con los tiempos de red reales medidos el 2/10/2026:
 *
 *     action=busqueda          9.237 ms   (medido contra producción)
 *     erp_screen_snapshot        260 ms   (estimado desde los 203 ms que tardan
 *                                          los 99 pagos + 100 líneas: 30,7 KB.
 *                                          Se usa un número PEOR que el medido
 *                                          para no inflar la mejora.)
 *
 * NO toca producción: los dos endpoints están interceptados dentro de la página.
 * Lo que se mide de verdad es lo que el ERP hace con cada respuesta — en qué
 * momento `busqueda.deudas` tiene las tres deudas y la pantalla puede pintar.
 *
 * Y de paso contesta la pregunta que no se puede contestar leyendo el código:
 * si `_sbPermiso` y `_hace`, que viven en el panel, son alcanzables desde
 * Abastecimiento una vez fusionado.
 *
 *   node _tools/pruebas/medir_abastecimiento_foto.js
 *
 * Necesita el servidor de dev levantado:  npm run dev
 */
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');

const AQUI = __dirname;
const FIX = path.join(AQUI, '..', '..', '..', 'estancias', '_tools', 'fixtures-pagos', 'busqueda.json');
const URL_ERP = process.env.ERP || 'http://localhost:8080/app.html?prueba=1';
const MS_APPS_SCRIPT = 9237;   // medido el 2/10 en producción
const MS_FOTO = 260;           // peor que los 203 ms medidos, a propósito
const RED = '\x1b[31m', VER = '\x1b[32m', AMA = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';

if (!fs.existsSync(FIX)) {
  console.log(AMA + 'falta ' + FIX + RST);
  console.log('corré: python ../../estancias/_tools/bajar_fuentes_pagos.py');
  process.exit(2);
}
const PAYLOAD = fs.readFileSync(FIX, 'utf8');

/* El interceptor. Se inyecta ANTES de que corra una línea del ERP
   (`Page.addScriptToEvaluateOnNewDocument`): si se inyectara después, el
   arranque ya habría pedido los datos y no se mediría nada. */
function interceptor(conFoto) {
  return `(function(){
  window.__maleuAuth = true;           /* lo mismo que hace ?prueba=1 */
  /* Se CLASIFICA el pedido, no se guarda la URL. La del Apps Script pasa los
     100 caracteres antes del query, asi que recortarla se come el ?action= y el
     instrumento informa 'no lo pidio' sobre algo que si pidio. Ya paso. */
  window.__marcas = { t0: performance.now(), datos: null,
                      vioFoto: false, vioBusqueda: false, vioToken: false, n: 0 };
  var PAYLOAD = ${JSON.stringify(PAYLOAD)};
  var CON_FOTO = ${conFoto ? 'true' : 'false'};
  var MS_AS = ${MS_APPS_SCRIPT}, MS_FOTO = ${MS_FOTO};
  var _f = window.fetch;
  function resp(cuerpo, ms) {
    return new Promise(function(ok){
      setTimeout(function(){
        ok(new Response(cuerpo, { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }, ms);
    });
  }
  window.fetch = function(u, o) {
    var url = String((u && u.url) || u || '');
    window.__marcas.n++;
    if (url.indexOf('erp_screen_snapshot') >= 0) window.__marcas.vioFoto = true;
    if (url.indexOf('action=busqueda') >= 0) window.__marcas.vioBusqueda = true;
    if (url.indexOf('action=sbToken') >= 0) window.__marcas.vioToken = true;
    if (url.indexOf('erp_screen_snapshot') >= 0) {
      if (!CON_FOTO) return resp('[]', MS_FOTO);
      /* 'computed_at' como lo manda PostgREST: UTC con offset. Doce minutos
         atrás, para que el sello tenga algo que decir y para quedar DEBAJO del
         umbral de 15 min que dispara el pedido fresco. */
      var cuando = new Date(Date.now() - 12 * 60000).toISOString().replace('Z', '+00:00');
      return resp(JSON.stringify([{ payload: JSON.parse(PAYLOAD),
        computed_at: cuando, warning: '', source: 'post' }]), MS_FOTO);
    }
    if (url.indexOf('action=sbToken') >= 0) {
      return resp(JSON.stringify({ ok: true, sb: { token: 'jwt.de.prueba',
        url: 'https://x.supabase.co', key: 'publishable', seg: 43200 } }), 40);
    }
    if (url.indexOf('action=busqueda') >= 0) return resp(PAYLOAD, MS_AS);
    /* Todo lo demás, en blanco y al instante: no es lo que se mide y no tiene
       que hacer que la medición espere. */
    if (url.indexOf('/exec') >= 0 || url.indexOf('script.google') >= 0) {
      return resp('{"ok":true}', 5);
    }
    return _f.apply(this, arguments);
  };
  /* El reloj lo toma la PÁGINA, no Node: así no se mide el ida y vuelta del CDP.
     Se marca cuando aparece el SELLO del encabezado, que es la señal de que los
     datos se aplicaron — la escriben los dos caminos (_abaSello en el de la foto,
     abaUpdateLastSync en el fresco).

     Y NO se mira window.busqueda, que fue el primer intento y medía mal: la
     variable de la sub-app vive adentro de _SUBAPP_abast, y el build la copia a
     window UNA vez, al final del cuerpo. Después _abaAplicarBusqueda reasigna la
     local y la copia de window se queda con el objeto viejo. Daba 0 deudas
     siempre, por los dos caminos. Las deudas se cuentan al final, en el DOM. */
  var iv = setInterval(function(){
    try {
      var el = document.getElementById('abaLastSync');
      if (el && el.textContent && !window.__marcas.datos) {
        window.__marcas.datos = performance.now();
        clearInterval(iv);
      }
    } catch(e){}
  }, 10);
})();`;
}

/* El permiso tiene que estar GUARDADO antes de arrancar: `_sbPermiso(true)` sólo
   usa el que ya tiene, y es correcto que sea así (pedirlo cuesta 3,5 s y se
   lleva uno de los dos pedidos en vuelo). En el ERP de verdad lo deja
   `_sbPermisoTibio` 12 s después de abrir, o la apertura anterior. Acá se
   siembra en localStorage, que es de donde el front lo lee. */
function sembrarPermiso() {
  return `(function(){
    try {
      var sb = { token:'jwt.de.prueba', url:'https://x.supabase.co', key:'publishable', seg:43200 };
      var hasta = Date.now() + 11*60*60*1000;
      var puesto = [];
      Object.keys(localStorage).forEach(function(k){ if(/sb|supa|tok/i.test(k)) puesto.push(k); });
      /* No se adivina la clave: se usa la función del panel, que es la que sabe
         cuál es. Si no existiera, la prueba lo dice en vez de medir de más. */
      if (typeof _sbTokGuardar === 'function') { _sbTokGuardar(sb, hasta); return 'ok'; }
      return 'sin _sbTokGuardar';
    } catch(e){ return 'error: ' + e.message; }
  })()`;
}

async function corrida(conFoto) {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    const errores = [];
    cli.escuchar((m, p) => {
      if (m === 'Runtime.exceptionThrown') {
        const d = p.exceptionDetails || {};
        errores.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 160));
      }
    });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: interceptor(conFoto) });
    await cli.enviar('Page.navigate', { url: URL_ERP });

    /* A que el ERP termine de arrancar. */
    for (let i = 0; i < 200; i++) {
      const listo = await evaluar(cli, "typeof window._abrirSubapp==='function' && typeof window._SUBAPP_abast==='function'");
      if (listo) break;
      await new Promise(r => setTimeout(r, 100));
    }

    const alcanzables = await evaluar(cli, `JSON.stringify({
      sbPermiso: typeof window._sbPermiso, hace: typeof window._hace,
      sbTokGuardar: typeof window._sbTokGuardar, abrir: typeof window._abrirSubapp })`);

    const sembrado = await evaluar(cli, sembrarPermiso());
    /* Y que el front lo VEA: _sbPermiso(true) sale de localStorage, y si
       devolviera null la foto no se pediría. Medir eso como si fuera el camino
       nuevo sería medir el de siempre. */
    const loVe = await evaluar(cli,
      '_sbPermiso(true).then(function(s){ return !!(s && s.url); })');

    /* Se arranca Abastecimiento y se pone el reloj a cero en el mismo momento. */
    await evaluar(cli, "window.__marcas.t0 = performance.now(); window._abrirSubapp('abast');");

    let ms = null;
    for (let i = 0; i < 300; i++) {
      const m = await evaluar(cli, 'JSON.stringify(window.__marcas)');
      const marcas = JSON.parse(m || '{}');
      if (marcas.datos) { ms = Math.round(marcas.datos - marcas.t0); break; }
      await new Promise(r => setTimeout(r, 100));
    }

    /* PAGOS se abre como la abre Tadeo: tocando su sub-tab. Y las deudas se
       cuentan en el DOM, que es lo que él ve, y no en una variable. */
    await evaluar(cli, `(function(){
      var t = document.querySelector('#pg-abast [data-tab="pagos"]')
           || document.querySelector('[data-tab="pagos"]');
      if (t) t.click();
      return !!t;
    })()`);
    await new Promise(r => setTimeout(r, 600));

    const est = JSON.parse(await evaluar(cli, `JSON.stringify({
      deudas: document.querySelectorAll('#pg-abast .deuda-card, .deuda-card').length,
      sello: (document.getElementById('abaLastSync')||{}).textContent || '',
      /* Por que la foto no se uso. Lo escribe _abaFotoNota, que existe
         justamente para que un fallback no sea mudo. Sin acentos ni backticks:
         esto viaja adentro de un template literal. */
      nota: window.__abaFoto || null,
      viva: !!(window._subappsVivas && window._subappsVivas.abast),
      pidioFoto: !!window.__marcas.vioFoto,
      pidioAppsScript: !!window.__marcas.vioBusqueda,
      pedidos: window.__marcas.n
    })`));

    return { ms, est, errores, alcanzables: JSON.parse(alcanzables), sembrado, loVe };
  } finally { cli.matar(); }
}

(async () => {
  console.log();
  console.log('Abastecimiento, el mismo ERP por los dos caminos');
  console.log(DIM + '  payload real de 181,6 KB · Apps Script a ' + MS_APPS_SCRIPT
    + ' ms (medido en producción) · la foto a ' + MS_FOTO + ' ms' + RST);
  console.log();

  let fallas = 0;
  const ok = (b, msg) => { console.log((b ? VER + '  ok  ' : RED + '  MAL ') + RST + msg); if (!b) fallas++; };

  console.log('ANTES — sin foto (la 030 sin aplicar, o un usuario sin permiso)');
  const a = await corrida(false);
  console.log('  los datos estuvieron en ' + (a.ms === null ? 'NUNCA' : a.ms + ' ms'));
  ok(a.est.viva, 'la sub-app arrancó');
  ok(a.est.pidioAppsScript, 'cayó a `action=busqueda`, como siempre');
  ok(a.est.deudas === 3, 'pintó las 3 deudas');
  ok(a.errores.length === 0, 'sin errores en consola' + (a.errores.length ? ': ' + a.errores[0] : ''));

  console.log();
  console.log('Lo que el panel le presta a Abastecimiento (la duda que no se puede');
  console.log('leer en el código, porque el build fusiona todo en un documento):');
  console.log('  ' + JSON.stringify(a.alcanzables));
  ok(a.alcanzables.sbPermiso === 'function', '`_sbPermiso` es alcanzable desde la sub-app');
  ok(a.alcanzables.hace === 'function', '`_hace` es alcanzable desde la sub-app');

  console.log();
  console.log('El permiso de Supabase, que es lo que habilita el atajo');
  console.log('  sembrado: ' + a.sembrado + '   ·   el front lo ve: ' + a.loVe);
  ok(a.loVe === true, 'el front encuentra el permiso guardado (sin esto no hay atajo que medir)');

  console.log();
  console.log('DESPUÉS — con la foto en PostgreSQL');
  const b = await corrida(true);
  console.log('  los datos estuvieron en ' + (b.ms === null ? 'NUNCA' : b.ms + ' ms'));
  console.log('  el sello del encabezado dice: ' + JSON.stringify(b.est.sello));
  ok(b.est.viva, 'la sub-app arrancó');
  console.log('  motivo que anoto el front: ' + JSON.stringify(b.est.nota));
  ok(b.est.pidioFoto, 'pidió la foto');
  ok(b.est.deudas === 3, 'pintó las 3 deudas, las mismas');
  ok(!b.est.pidioAppsScript, 'NO fue a Apps Script: la foto de 12 min alcanza');
  ok(/hace 12 min/.test(b.est.sello), 'el sello dice de cuándo es el número, no la hora de ahora');
  ok(b.errores.length === 0, 'sin errores en consola' + (b.errores.length ? ': ' + b.errores[0] : ''));

  console.log();
  if (a.ms && b.ms) {
    const veces = (a.ms / b.ms);
    console.log('  ANTES   ' + String(a.ms).padStart(6) + ' ms');
    console.log('  DESPUÉS ' + String(b.ms).padStart(6) + ' ms');
    console.log(VER + '  ' + veces.toFixed(1) + '× más rápido  (' + (a.ms - b.ms)
      + ' ms menos de espera)' + RST);
  }

  console.log();
  console.log(fallas === 0
    ? VER + 'los dos caminos andan, y el sello no miente' + RST
    : RED + fallas + ' control(es) en rojo' + RST);
  process.exit(fallas === 0 ? 0 : 1);
})().catch(e => { console.error(RED + 'la medición falló: ' + e.message + RST); process.exit(3); });
