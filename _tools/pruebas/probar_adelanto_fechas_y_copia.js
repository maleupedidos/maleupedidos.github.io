/**
 * probar_adelanto_fechas_y_copia.js — los dos agujeros que Codex marcó sobre
 * 6abf333 (2/10/2026). Tiene que dar ROJO contra 6abf333 y verde con el arreglo.
 *
 *  A) La lista de `sales_order` pisaba un cobro hecho acá si pasaron 6 min, aunque
 *     la réplica (cada 10 min) todavía no lo hubiera copiado. Volvía «No Cobrado».
 *     Ahora pisa solo si las filas son POSTERIORES al cambio, como la foto.
 *     Se prueba en las dos direcciones: fila vieja NO pisa, fila nueva SÍ.
 *
 *  B) La foto de `pedidosLight` sellaba `_fresco` (que se guarda) sin guardar `D`
 *     en `ma3`. Al cerrar la app antes de Google y reabrir: pedidos viejos con el
 *     sello nuevo, y la misma foto rechazada por «mas vieja».
 *     Se reproduce de verdad: la foto pinta, Google nunca llega, se RECARGA la
 *     página (mismo localStorage) y se mira qué quedó.
 *
 * NO toca producción: Apps Script y Supabase interceptados en la página.
 *
 *   node _tools/pruebas/probar_adelanto_fechas_y_copia.js
 *
 * Necesita `npm run dev` (o ERP=<url>) y el payload real de `pedidosLight`
 * (`estancias/_tools/fixtures-pagos/pedidosLight.json`, repo privado).
 */
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');

const FIX = path.join(__dirname, '..', '..', '..', 'estancias', '_tools', 'fixtures-pagos', 'pedidosLight.json');
const URL_ERP = process.env.ERP || 'http://localhost:8080/app.html?prueba=1';
const RED = '\x1b[31m', VER = '\x1b[32m', AMA = '\x1b[33m', RST = '\x1b[0m';

if (!fs.existsSync(FIX)) { console.log(AMA + 'falta ' + FIX + RST); process.exit(2); }
const PAYLOAD = fs.readFileSync(FIX, 'utf8');
const N = JSON.parse(PAYLOAD).pedidos.length;
/* Fija, para que la foto sea LA MISMA antes y después de recargar. */
const FOTO_TS = new Date(Date.now() - 12 * 60000).toISOString().replace('Z', '+00:00');

function preparar(conFoto) {
  return `(function(){
  window.__maleuAuth = true;
  try {
    if (!sessionStorage.getItem('__limpio')) { localStorage.clear(); sessionStorage.setItem('__limpio','1'); }
    localStorage.setItem('mc_sbtok', JSON.stringify({ u: 'prueba', hasta: Date.now() + 3600e3,
      sb: { token: 'jwt.de.prueba', url: 'https://x.supabase.co', key: 'publishable' } }));
  } catch (e) {}
  var P = ${conFoto ? PAYLOAD : 'null'};
  function resp(c, ms) { return new Promise(function (ok) { setTimeout(function () {
    ok(new Response(c, { status: 200, headers: { 'Content-Type': 'application/json' } })); }, ms); }); }
  var _f = window.fetch;
  window.fetch = function (u) {
    var url = String((u && u.url) || u || '');
    if (url.indexOf('erp_screen_snapshot') >= 0) {
      return P ? resp(JSON.stringify([{ payload: P, computed_at: '${FOTO_TS}' }]), 200) : resp('[]', 50);
    }
    if (url.indexOf('supabase') >= 0) return resp('[]', 30);
    if (url.indexOf('/exec') >= 0 || url.indexOf('script.google') >= 0 || url.indexOf('action=') >= 0)
      return new Promise(function () {});                 /* Google no llega nunca */
    return _f.apply(this, arguments);
  };
})();`;
}

async function pagina(conFoto) {
  const cli = await abrir();
  const errores = [];
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  cli.escuchar((m, p) => {
    if (m === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails || {};
      errores.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 160));
    }
  });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: preparar(conFoto) });
  const cargar = async () => {
    for (let i = 0; i < 200; i++) {
      if (await evaluar(cli, "typeof _sbRefrescoPedidos==='function' && typeof _fotoPedidos==='function'")) return;
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error('el ERP no cargó');
  };
  await cli.enviar('Page.navigate', { url: URL_ERP });
  await cargar();
  return { cli, errores, cargar };
}

const LEER = `JSON.stringify({
  nota: window.__fotoPed || null,
  n: (typeof D!=='undefined' && D && D.pedidos) ? D.pedidos.length : -1,
  deSb: (typeof D!=='undefined' && D) ? D._pedidosDeSupabase : null,
  ma3: (function(){ try{ var c=JSON.parse(localStorage.getItem('ma3')||'null'); return c&&c.pedidos?c.pedidos.length:0; }catch(e){ return 'ilegible'; } })(),
  frescoHaceMin: Math.round((Date.now() - (_fresco.ok.pedidos || 0)) / 60000)
})`;

async function esperar(cli, cond, ms) {
  const hasta = Date.now() + ms;
  let l;
  while (Date.now() < hasta) {
    l = JSON.parse(await evaluar(cli, LEER));
    if (cond(l)) return l;
    await new Promise(r => setTimeout(r, 100));
  }
  return l;
}

/* A: un pedido cobrado acá hace 7 min; la base trae la fila sin el cobro. */
function adelanto(filaHaceMin) {
  return `(async function(){
    var ahora = Date.now();
    D = { pedidos: [{ h:'Home', n:'900001', c:'Prueba', ep:'Cobrado', $:1000, r:2 }] };
    _sbCambioLocal = ahora - 7*60000;
    /* Desde 1573aa3 la regla es POR PEDIDO: un cobro real pasa por
       _patchPedidoLocal, que anota las dos marcas. Con solo la global la prueba
       simulaba un cobro que el ERP ya no hace. */
    if (typeof _sbCambiosPed === 'object') { _sbCambiosPed = {}; _sbCambiosPed[_sbClavePedido(D.pedidos[0])] = _sbCambioLocal; }
    var fila = { h:'Home', n:'900001', c:'Prueba', ep:'No Cobrado', $:1000, r:2,
                 _ts: new Date(ahora - ${filaHaceMin}*60000).toISOString() };
    _sbPedidos = function(){ return Promise.resolve([fila]); };
    var pinto = await _sbRefrescoPedidos(null);
    return JSON.stringify({ pinto: pinto, ep: D.pedidos[0].ep });
  })()`;
}

(async () => {
  let fallas = 0;
  const ok = (b, msg) => { console.log((b ? VER + '  ok  ' : RED + '  MAL ') + RST + msg); if (!b) fallas++; };

  console.log('\nA) cobro hecho acá hace 7 min — la réplica corre cada 10');
  {
    const { cli, errores } = await pagina(false);
    try {
      const viejo = JSON.parse(await evaluar(cli, adelanto(8)));
      console.log('   fila de hace 8 min (réplica ANTES del cobro): ' + JSON.stringify(viejo));
      /* Desde 1573aa3 la lista SÍ se pinta (las otras filas pueden ser nuevas);
         lo que no puede pasar es que ESTE pedido vuelva a "No Cobrado". */
      ok(viejo.ep === 'Cobrado', 'la fila vieja NO pisa el cobro');
      const nuevo = JSON.parse(await evaluar(cli, adelanto(1)));
      console.log('   fila de hace 1 min (réplica DESPUÉS del cobro): ' + JSON.stringify(nuevo));
      ok(nuevo.pinto === true && nuevo.ep === 'No Cobrado', 'la fila posterior SÍ pisa (el freno no es un candado)');
      ok(errores.length === 0, 'sin errores en consola' + (errores.length ? ': ' + errores[0] : ''));
    } finally { cli.matar(); }
  }

  console.log('\nB) la foto pinta, Google no llega, se cierra y se reabre');
  {
    const { cli, errores, cargar } = await pagina(true);
    try {
      const a = await esperar(cli, l => l.nota && l.nota.estado !== 'sin intentar' && l.n === N, 4000);
      console.log('   antes de cerrar: ' + JSON.stringify(a));
      ok(a.nota && a.nota.estado === 'ok' && a.n === N, 'la foto pintó los ' + N + ' pedidos');
      ok(a.ma3 === N, 'y los guardó en ma3 junto con el sello (ma3=' + a.ma3 + ')');
      await cli.enviar('Page.reload', {});
      await cargar();
      const b = await esperar(cli, l => l.nota && l.nota.estado !== 'sin intentar', 4000);
      console.log('   al reabrir:      ' + JSON.stringify(b));
      ok(b.n === N, 'al reabrir se ven los ' + N + ' pedidos de la foto, no una copia vieja (n=' + b.n + ')');
      ok(b.frescoHaceMin === 12, 'con su sello de hace 12 min');
      ok(errores.length === 0, 'sin errores en consola' + (errores.length ? ': ' + errores[0] : ''));
    } finally { cli.matar(); }
  }

  console.log();
  console.log(fallas === 0 ? VER + 'los adelantos respetan las fechas y guardan lo que sellan' + RST : RED + fallas + ' control(es) en rojo' + RST);
  process.exit(fallas === 0 ? 0 : 1);
})().catch(e => { console.error(RED + 'la prueba falló: ' + e.message + RST); process.exit(3); });
