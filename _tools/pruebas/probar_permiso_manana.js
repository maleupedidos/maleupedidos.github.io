/**
 * probar_permiso_manana.js — la PRIMERA apertura del día (5/10/2026).
 *
 * Tadeo, 8:10: abrió Objetivo en el celular y tardó muchísimo en actualizarse.
 * La app estuvo cerrada toda la noche, así que el permiso de Supabase (dura
 * 1 h) estaba vencido: sin permiso no se lee la foto de `pedidosLight`, y la
 * pantalla espera a Google en frío. El permiso se pedía recién a los 12 s.
 *
 * Desde v514, si la copia de pedidos es VIEJA (>10 min) y no hay permiso, se
 * pide YA y la foto pinta apenas llega. Con copia fresca, igual que antes.
 * El «no» del backend se recuerda 12 h (Lucas y los vendedores no pagan una
 * llamada de más en cada apertura); el de la red, no.
 *
 * NO toca producción: Apps Script y Supabase están interceptados en la página.
 * Usa el payload real de `estancias/_tools/fixtures-pagos/pedidosLight.json`.
 *
 *   node _tools/pruebas/probar_permiso_manana.js [archivo-erp]
 *
 * Necesita `npm run dev` (o ERP=<url>).
 */
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');

const FIX = path.join(__dirname, '..', '..', '..', 'estancias', '_tools', 'fixtures-pagos', 'pedidosLight.json');
const URL_ERP = process.env.ERP || 'http://localhost:8080/app.html?prueba=1';
const MS_GOOGLE = 15371, MS_TOKEN = 3500, MS_FOTO = 600;
const RED = '\x1b[31m', VER = '\x1b[32m', AMA = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';
if (!fs.existsSync(FIX)) { console.log(AMA + 'falta ' + FIX + RST); process.exit(2); }
const PAYLOAD = fs.readFileSync(FIX, 'utf8');

/* esc: { copiaHaceMin, token: 'si'|'no'|'red', noGuardado: bool } */
function preparar(esc) {
  return `(function(){
  window.__maleuAuth = true;
  var ESC = ${JSON.stringify(esc)};
  var P = ${PAYLOAD};
  try {
    if (!sessionStorage.getItem('__limpio')) {
      localStorage.clear(); sessionStorage.setItem('__limpio','1');
      var C = JSON.parse(JSON.stringify(P));
      C.pedidos = C.pedidos.slice(0, 1); C.totales.facturado = 1;
      C._lightTs = Date.now() - ESC.copiaHaceMin * 60000;
      localStorage.setItem('ma3', JSON.stringify(C));
      localStorage.setItem('maleu_fresco', JSON.stringify({ ok: { pedidos: Date.now() - ESC.copiaHaceMin * 60000 }, err: {} }));
      if (ESC.noGuardado) localStorage.setItem('mc_sbtok_no', JSON.stringify({ u: 'prueba', hasta: Date.now() + 3600e3 }));
    }
  } catch (e) {}
  window.__m = { t0: performance.now(), completo: null, tokenEn: null, tokens: 0, foto: false };
  function resp(cuerpo, ms, st) {
    return new Promise(function (ok) { setTimeout(function () {
      ok(new Response(cuerpo, { status: st || 200, headers: { 'Content-Type': 'application/json' } }));
    }, ms); });
  }
  var _f = window.fetch;
  window.fetch = function (u, o) {
    var url = String((u && u.url) || u || '');
    if (url.indexOf('action=sbToken') >= 0) {
      window.__m.tokens++; if (window.__m.tokenEn == null) window.__m.tokenEn = performance.now() - window.__m.t0;
      if (ESC.token === 'red') return new Promise(function (_, no) { setTimeout(function () { no(new TypeError('Failed to fetch')); }, 300); });
      if (ESC.token === 'no') return resp('{"ok":true,"sb":null}', ${MS_TOKEN});
      return resp(JSON.stringify({ ok: true, sb: { token: 'jwt.de.prueba', seg: 3600, url: 'https://x.supabase.co', key: 'publishable' } }), ${MS_TOKEN});
    }
    if (url.indexOf('erp_screen_snapshot') >= 0) {
      window.__m.foto = true;
      var cuando = new Date(Date.now() - 5 * 60000).toISOString().replace('Z', '+00:00');
      return resp(JSON.stringify([{ payload: P, computed_at: cuando }]), ${MS_FOTO});
    }
    if (url.indexOf('supabase') >= 0) return resp('[]', 30);
    if (url.indexOf('action=lote') >= 0) return resp('{"ok":false}', 5);
    if (url.indexOf('action=pedidosLight') >= 0) {
      var g = JSON.parse(JSON.stringify(P)); g.ts = Date.now() + ${MS_GOOGLE};
      return resp(JSON.stringify(g), ${MS_GOOGLE});
    }
    if (url.indexOf('/exec') >= 0 || url.indexOf('script.google') >= 0) return resp('{"ok":true}', 5);
    return _f.apply(this, arguments);
  };
  var iv = setInterval(function () {
    try {
      if (typeof D !== 'undefined' && D && D.totales && D.totales.facturado > 1
          && D.pedidos && D.pedidos.length === P.pedidos.length && !window.__m.completo) {
        window.__m.completo = performance.now() - window.__m.t0; clearInterval(iv);
      }
    } catch (e) {}
  }, 10);
})();`;
}

const LEER = `JSON.stringify({
  completo: window.__m.completo ? Math.round(window.__m.completo) : null,
  tokenEn: window.__m.tokenEn == null ? null : Math.round(window.__m.tokenEn), tokens: window.__m.tokens,
  foto: window.__m.foto, nota: window.__fotoPed || null,
  no: localStorage.getItem('mc_sbtok_no'), guardado: !!localStorage.getItem('mc_sbtok'),
  cartel: (document.getElementById('hdrRefreshTime') || {}).textContent || '',
  tab: (typeof _tabActual === 'function') ? _tabActual() : '',
  vuelo: (typeof _frescoVuelo !== 'undefined') ? _frescoVuelo : null,
  fuentes: (typeof _fuentesDeTab === 'function' && typeof _tabActual === 'function') ? _fuentesDeTab(_tabActual()) : null
})`;

async function escenario(esc, ms, recargar) {
  const cli = await abrir();
  const errores = [];
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((m, p) => { if (m === 'Runtime.exceptionThrown') { const d = p.exceptionDetails || {}; errores.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 160)); } });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: preparar(esc) });
    await cli.enviar('Page.navigate', { url: URL_ERP });
    const t0 = Date.now();
    if (esc.tab) {
      /* Como Tadeo: abre la app y toca la tab apenas se puede. */
      for (let i = 0; i < 100; i++) {
        if (await evaluar(cli, "typeof go==='function' && document.readyState!=='loading' && !!document.querySelector('.pg.on')")) break;
        await new Promise(r => setTimeout(r, 100));
      }
      await evaluar(cli, "go('" + esc.tab + "'), 1");
    }
    await new Promise(r => setTimeout(r, Math.max(0, ms - (Date.now() - t0))));
    let l = JSON.parse(await evaluar(cli, LEER));
    if (recargar) {
      await cli.enviar('Page.reload', {});
      await new Promise(r => setTimeout(r, recargar));
      l = { antes: l, despues: JSON.parse(await evaluar(cli, LEER)) };
    }
    return { l, errores };
  } finally { cli.matar(); }
}

(async () => {
  let fallas = 0;
  const ok = (b, msg) => { console.log((b ? VER + '  ok  ' : RED + '  MAL ') + RST + msg); if (!b) fallas++; };
  const sinErr = (r) => ok(r.errores.length === 0, 'sin errores en consola' + (r.errores.length ? ': ' + r.errores[0] : ''));
  console.log('\nLa primera apertura del día: sin permiso de Supabase, Google en frío');
  console.log(DIM + '  pedidosLight ' + MS_GOOGLE + ' ms · sbToken ' + MS_TOKEN + ' ms · foto ' + MS_FOTO + ' ms' + RST);

  console.log('\n1) copia de anoche (12 h), sin permiso: pide el permiso YA y pinta la foto');
  const a = await escenario({ copiaHaceMin: 720, token: 'si', tab: 'planificacion' }, 7000);
  console.log('   ' + JSON.stringify(a.l));
  ok(a.l.tokenEn !== null && a.l.tokenEn < 2500, 'el permiso salió en el arranque: ' + a.l.tokenEn + ' ms (antes: a los 12 s)');
  ok(a.l.foto && a.l.nota && a.l.nota.estado === 'ok', 'la foto se leyó y pintó');
  ok(a.l.completo !== null && a.l.completo < 6500, 'Inicio/Objetivo completos a los ' + a.l.completo + ' ms (Google en frío: ' + MS_GOOGLE + ')');
  ok(a.l.guardado, 'y el permiso queda guardado para el resto del día');
  ok(a.l.tab === 'planificacion' && a.l.cartel && !/Actualizando/.test(a.l.cartel), 'Objetivo deja de decir «Actualizando…» antes que Google: «' + a.l.cartel + '»');
  sinErr(a);

  console.log('\n2) copia de hace 2 min: no adelanta el permiso (sigue a los 12 s)');
  const b = await escenario({ copiaHaceMin: 2, token: 'si' }, 6000);
  console.log('   ' + JSON.stringify(b.l));
  ok(b.l.tokens === 0, 'no pidió sbToken en los primeros 6 s');
  sinErr(b);

  console.log('\n3) el backend dice que no (Lucas, un vendedor): se recuerda');
  const c = await escenario({ copiaHaceMin: 720, token: 'no' }, 7500, 6000);
  console.log('   ' + JSON.stringify(c.l));
  ok(c.l.antes.tokens === 1 && !!c.l.antes.no, 'la primera vez pregunta y guarda el «no»');
  ok(c.l.despues.tokens === 0, 'al reabrir no vuelve a preguntar en el arranque');
  sinErr(c);

  console.log('\n4) falla la RED al pedir el permiso: NO se guarda un «no»');
  const d = await escenario({ copiaHaceMin: 720, token: 'red' }, 4000);
  console.log('   ' + JSON.stringify(d.l));
  ok(d.l.tokens === 1 && !d.l.no, 'pidió una vez y no quedó un «no» falso');

  console.log('\n5) con el «no» ya guardado: cero llamadas en el arranque');
  const e = await escenario({ copiaHaceMin: 720, token: 'si', noGuardado: true }, 5000);
  console.log('   ' + JSON.stringify(e.l));
  ok(e.l.tokens === 0, 'no pidió sbToken');
  sinErr(e);

  console.log();
  console.log(fallas === 0 ? VER + 'la mañana ya no espera a Google en frío' + RST : RED + fallas + ' control(es) en rojo' + RST);
  process.exit(fallas === 0 ? 0 : 1);
})().catch(e => { console.error(RED + 'la prueba falló: ' + e.message + RST); process.exit(3); });
