/**
 * probar_foto_pedidos.js — Inicio / Pedidos / Estancias: la foto de
 * `pedidosLight` en PostgreSQL adelanta, y nunca vuelve atrás.
 *
 * En un Chrome de verdad, con el payload real (`fixtures-pagos/pedidosLight.json`,
 * 1.354 pedidos, del repo privado `estancias` — acá no se versiona) y los tiempos
 * medidos en producción el 2/10/2026:
 *
 *     action=pedidosLight     15.371 ms   (la más rápida de dos corridas)
 *     erp_screen_snapshot        260 ms   (el mismo número que usa la prueba de
 *                                          Abastecimiento: peor que lo medido)
 *
 * NO toca producción: Apps Script y Supabase están interceptados en la página.
 * Cada escenario es un Chrome nuevo. Los que importan son los que la foto NO
 * tiene que pintar: un adelanto que vuelve atrás miente en verde.
 *
 *   node _tools/pruebas/probar_foto_pedidos.js
 *
 * Necesita el servidor de dev levantado (`npm run dev`, o ERP=<url>).
 */
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');

const FIX = path.join(__dirname, '..', '..', '..', 'estancias', '_tools', 'fixtures-pagos', 'pedidosLight.json');
const URL_ERP = process.env.ERP || 'http://localhost:8080/app.html?prueba=1';
const MS_GOOGLE = 15371, MS_FOTO = 260;
const RED = '\x1b[31m', VER = '\x1b[32m', AMA = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';

if (!fs.existsSync(FIX)) {
  console.log(AMA + 'falta ' + FIX + RST);
  console.log('corré: python ../../estancias/_tools/bajar_fuentes_pagos.py');
  process.exit(2);
}
const PAYLOAD = fs.readFileSync(FIX, 'utf8');

/* `esc`: { foto: {edadMin, ms} | null, googleMs, copia: {pedidosHaceMin, lightHaceMin} | null } */
function preparar(esc) {
  return `(function(){
  window.__maleuAuth = true;
  var ESC = ${JSON.stringify(esc)};
  var P = ${PAYLOAD};
  try {
    if (!sessionStorage.getItem('__limpio')) { localStorage.clear(); sessionStorage.setItem('__limpio','1'); }
    /* El permiso de Supabase ya guardado: _sbPermiso(true) sólo usa el que hay. */
    localStorage.setItem('mc_sbtok', JSON.stringify({ u: 'prueba', hasta: Date.now() + 3600e3,
      sb: { token: 'jwt.de.prueba', url: 'https://x.supabase.co', key: 'publishable' } }));
    if (ESC.copia) {
      /* Una copia guardada en el celular, MARCADA: totales.facturado = 1 y un
         solo pedido. Si algo la pisa, se ve. */
      var C = JSON.parse(JSON.stringify(P));
      C.pedidos = C.pedidos.slice(0, 1); C.totales.facturado = 1;
      if (ESC.copia.lightHaceMin != null) C._lightTs = Date.now() - ESC.copia.lightHaceMin * 60000;
      localStorage.setItem('ma3', JSON.stringify(C));
      localStorage.setItem('maleu_fresco', JSON.stringify({ ok: { pedidos: Date.now() - ESC.copia.pedidosHaceMin * 60000 }, err: {} }));
    }
  } catch (e) {}
  window.__m = { t0: performance.now(), completo: null, foto: false, google: false, googleLlego: null };
  function resp(cuerpo, ms) {
    return new Promise(function (ok) { setTimeout(function () {
      ok(new Response(cuerpo, { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }, ms); });
  }
  var _f = window.fetch;
  window.fetch = function (u, o) {
    var url = String((u && u.url) || u || '');
    if (url.indexOf('erp_screen_snapshot') >= 0) {
      window.__m.foto = true;
      if (!ESC.foto) return resp('[]', ${MS_FOTO});
      var cuando = new Date(Date.now() - ESC.foto.edadMin * 60000).toISOString().replace('Z', '+00:00');
      return resp(JSON.stringify([{ payload: P, computed_at: cuando }]), ESC.foto.ms);
    }
    if (url.indexOf('supabase') >= 0) return resp('[]', 30);        /* sales_order, OCs: aislado */
    if (url.indexOf('action=lote') >= 0) return resp('{"ok":false}', 5);  /* cae a los sueltos */
    if (url.indexOf('action=pedidosLight') >= 0) {
      window.__m.google = true;
      /* El ts de AHORA: lo que el servidor calcularía al contestar. */
      var g = JSON.parse(JSON.stringify(P)); g.ts = Date.now() + ESC.googleMs;
      return resp(JSON.stringify(g), ESC.googleMs).then(function (r) { window.__m.googleLlego = performance.now(); return r; });
    }
    if (url.indexOf('/exec') >= 0 || url.indexOf('script.google') >= 0) return resp('{"ok":true}', 5);
    return _f.apply(this, arguments);
  };
  /* El reloj lo toma la página: Inicio puede pintar cuando están la lista entera
     Y los totales del negocio. */
  var iv = setInterval(function () {
    try {
      if (typeof D !== 'undefined' && D && D.totales && D.totales.facturado > 1
          && D.pedidos && D.pedidos.length === P.pedidos.length && !window.__m.completo) {
        window.__m.completo = performance.now(); clearInterval(iv);
      }
    } catch (e) {}
  }, 10);
})();`;
}

const LEER = `JSON.stringify({
  nota: window.__fotoPed || null,
  n: (D && D.pedidos) ? D.pedidos.length : -1,
  facturado: (D && D.totales) ? D.totales.facturado : null,
  deSb: D ? D._pedidosDeSupabase : null,
  frescoHaceMin: Math.round((Date.now() - (_fresco.ok.pedidos || 0)) / 60000),
  lightHaceMin: D && D._lightTs ? Math.round((Date.now() - D._lightTs) / 60000) : null,
  completo: window.__m.completo ? Math.round(window.__m.completo - window.__m.t0) : null,
  google: window.__m.googleLlego ? Math.round(window.__m.googleLlego - window.__m.t0) : null,
  pidioFoto: window.__m.foto, pidioGoogle: window.__m.google
})`;

async function escenario(esc, opts) {
  const cli = await abrir();
  const errores = [];
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((m, p) => {
      if (m === 'Runtime.exceptionThrown') {
        const d = p.exceptionDetails || {};
        errores.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 160));
      }
    });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: preparar(esc) });
    await cli.enviar('Page.navigate', { url: URL_ERP });
    for (let i = 0; i < 200; i++) {
      if (await evaluar(cli, "typeof loadRapido==='function' && typeof _fotoPedidos==='function'")) break;
      await new Promise(r => setTimeout(r, 50));
    }
    if (opts && opts.alArrancar) await evaluar(cli, opts.alArrancar);
    const hasta = Date.now() + ((opts && opts.esperarMs) || 3000);
    let antes = null;
    while (Date.now() < hasta) {
      await new Promise(r => setTimeout(r, 100));
      const l = JSON.parse(await evaluar(cli, LEER));
      if (opts && opts.hasta && opts.hasta(l)) break;
    }
    antes = JSON.parse(await evaluar(cli, LEER));
    let despues = null;
    if (opts && opts.despuesDeGoogle) {
      for (let i = 0; i < 400; i++) {
        const l = JSON.parse(await evaluar(cli, LEER));
        if (l.google) { await new Promise(r => setTimeout(r, 300)); break; }
        await new Promise(r => setTimeout(r, 100));
      }
      despues = JSON.parse(await evaluar(cli, LEER));
    }
    return { antes, despues, errores };
  } finally { cli.matar(); }
}

(async () => {
  let fallas = 0;
  const ok = (b, msg) => { console.log((b ? VER + '  ok  ' : RED + '  MAL ') + RST + msg); if (!b) fallas++; };
  const sinErr = (r) => ok(r.errores.length === 0, 'sin errores en consola' + (r.errores.length ? ': ' + r.errores[0] : ''));
  const N = JSON.parse(PAYLOAD).pedidos.length;

  console.log();
  console.log('Inicio / Pedidos con la foto de `pedidosLight` (' + N + ' pedidos reales)');
  console.log(DIM + '  Apps Script a ' + MS_GOOGLE + ' ms (medido) · la foto a ' + MS_FOTO + ' ms' + RST);

  console.log('\n1) ANTES — sin foto, sin copia: espera a Google');
  const a = await escenario({ foto: null, googleMs: MS_GOOGLE, copia: null },
    { esperarMs: MS_GOOGLE + 6000, hasta: l => l.completo });
  console.log('   ' + JSON.stringify(a.antes));
  ok(a.antes.completo !== null && a.antes.completo >= MS_GOOGLE, 'Inicio completo recién con Google: ' + a.antes.completo + ' ms');
  ok(a.antes.nota && a.antes.nota.estado === 'no hay foto', 'y la nota dice por qué no hubo foto');
  sinErr(a);

  console.log('\n2) DESPUÉS — foto de hace 12 min, sin copia');
  const b = await escenario({ foto: { edadMin: 12, ms: MS_FOTO }, googleMs: MS_GOOGLE, copia: null },
    { esperarMs: 4000, hasta: l => l.completo });
  console.log('   ' + JSON.stringify(b.antes));
  ok(b.antes.completo !== null && b.antes.completo < 3000, 'Inicio completo con la foto: ' + b.antes.completo + ' ms');
  ok(b.antes.nota && b.antes.nota.estado === 'ok' && /lista e Inicio/.test(b.antes.nota.motivo), 'la foto pintó la lista y lo de Inicio');
  ok(b.antes.n === N && b.antes.deSb === 1, 'los ' + N + ' pedidos, marcados como copia');
  ok(b.antes.frescoHaceMin === 12, 'el sello dice «hace 12 min», no «recién»');
  ok(b.antes.pidioGoogle, 'y Google se pidió igual: adelanta, no reemplaza');
  sinErr(b);
  if (a.antes.completo && b.antes.completo) {
    console.log(VER + '   ' + a.antes.completo + ' ms → ' + b.antes.completo + ' ms  ('
      + (a.antes.completo / b.antes.completo).toFixed(0) + '×)' + RST);
  }

  console.log('\n3) la foto primero, Google después: gana Google');
  const c = await escenario({ foto: { edadMin: 12, ms: MS_FOTO }, googleMs: 1500, copia: null },
    { esperarMs: 800, despuesDeGoogle: true });
  console.log('   ' + JSON.stringify(c.despues));
  ok(c.antes.nota.estado === 'ok', 'la foto pintó antes');
  ok(c.despues.deSb === 0 && c.despues.frescoHaceMin === 0, 'Google pisó: ya no es copia y el sello es «recién»');
  ok(c.despues.lightHaceMin === 0, 'y la edad de lo de Inicio es la de Google');
  sinErr(c);

  console.log('\n4) Google llega antes que la foto: la foto no pinta');
  const d = await escenario({ foto: { edadMin: 12, ms: 1500 }, googleMs: 200, copia: null },
    { esperarMs: 2500 });
  console.log('   ' + JSON.stringify(d.antes));
  ok(d.antes.nota && d.antes.nota.estado === 'Google llego antes', 'la nota: «Google llego antes»');
  ok(d.antes.deSb === 0 && d.antes.frescoHaceMin === 0, 'queda lo de Google');
  sinErr(d);

  console.log('\n5) la copia del celular es de hace 1 min: la foto de 12 es más vieja');
  const e = await escenario({ foto: { edadMin: 12, ms: MS_FOTO }, googleMs: MS_GOOGLE, copia: { pedidosHaceMin: 1 } },
    { esperarMs: 1500 });
  console.log('   ' + JSON.stringify(e.antes));
  ok(e.antes.nota && e.antes.nota.estado === 'mas vieja', 'la nota: «mas vieja»');
  ok(e.antes.n === 1 && e.antes.facturado === 1, 'la copia marcada sigue intacta: ni lista ni totales');
  ok(e.antes.frescoHaceMin === 1, 'y el sello no vuelve atrás');
  sinErr(e);

  console.log('\n6) lista vieja (30 min) pero totales nuevos (1 min): pinta SOLO la lista');
  const f = await escenario({ foto: { edadMin: 12, ms: MS_FOTO }, googleMs: MS_GOOGLE, copia: { pedidosHaceMin: 30, lightHaceMin: 1 } },
    { esperarMs: 1500 });
  console.log('   ' + JSON.stringify(f.antes));
  ok(f.antes.nota && f.antes.nota.motivo === 'solo la lista', 'la nota: «solo la lista»');
  ok(f.antes.n === N, 'la lista es la de la foto');
  ok(f.antes.facturado === 1 && f.antes.lightHaceMin === 1, 'los totales más nuevos NO se pisaron');
  sinErr(f);

  console.log('\n7) un cambio hecho acá mientras la foto viaja: no pinta');
  const g = await escenario({ foto: { edadMin: 12, ms: 1500 }, googleMs: MS_GOOGLE, copia: null },
    /* El cambio entra cuando la foto YA salio: si entrara antes, frena el primer
       control (`_sbPuedePisar` al arrancar) y no el de la vuelta. Ya paso. */
    { alArrancar: "new Promise(function(r){ var iv=setInterval(function(){ if(window.__m.foto){ clearInterval(iv); _patchPedidoLocal('Home','1',{}); r(1); } },5); })",
      esperarMs: 2500 });
  console.log('   ' + JSON.stringify(g.antes));
  ok(g.antes.pidioFoto, 'la foto se pidió (el cambio fue DURANTE el viaje)');
  ok(g.antes.nota && g.antes.nota.estado === 'cambio local', 'la nota: «cambio local»');
  ok(g.antes.deSb !== 1, 'la lista no es la de la foto');
  sinErr(g);

  console.log();
  console.log(fallas === 0 ? VER + 'la foto adelanta y no vuelve atrás nunca' + RST : RED + fallas + ' control(es) en rojo' + RST);
  process.exit(fallas === 0 ? 0 : 1);
})().catch(e => { console.error(RED + 'la prueba falló: ' + e.message + RST); process.exit(3); });
