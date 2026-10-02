/**
 * probar_supabase_caido.js — si Supabase no sirve, la pantalla cae a Google
 * sin errores. (2/10/2026)
 *
 * Tadeo, antes de publicar la tanda de las fotos: *"verificá que con
 * REPLICA_PG = no y el cupo agotado la pantalla cae a Google sin errores"*.
 *
 * Con la réplica apagada o el cupo de urlfetch agotado, Apps Script deja de
 * escribir la foto: lo que ve el front es una foto que ENVEJECE, o ninguna.
 * Y si la base misma falla, la lectura revienta. Los tres casos, en Inicio /
 * Pedidos (`pedidosLight`) y en Abastecimiento (`busqueda`):
 *
 *   red     el fetch a Supabase se rechaza (TypeError, como sin conexión)
 *   500     la base contesta error
 *   vieja   la foto existe pero tiene 2 horas (nadie la reescribió)
 *
 * En los tres, lo que tiene que pasar: Google llega y la pantalla queda con
 * los datos completos, y ninguna excepción en la consola.
 *
 * NO toca producción: Apps Script y Supabase están interceptados en la página.
 * Usa los fixtures del repo privado (`estancias/_tools/fixtures-pagos/`).
 *
 *   node _tools/pruebas/probar_supabase_caido.js     (con `npm run dev`)
 */
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');

const DIRF = path.join(__dirname, '..', '..', '..', 'estancias', '_tools', 'fixtures-pagos');
const URL_ERP = process.env.ERP || 'http://localhost:8080/app.html?prueba=1';
const RED = '\x1b[31m', VER = '\x1b[32m', AMA = '\x1b[33m', RST = '\x1b[0m';
for (const f of ['pedidosLight.json', 'busqueda.json']) {
  if (!fs.existsSync(path.join(DIRF, f))) { console.log(AMA + 'falta ' + f + RST); process.exit(2); }
}
const PL = fs.readFileSync(path.join(DIRF, 'pedidosLight.json'), 'utf8');
const BU = fs.readFileSync(path.join(DIRF, 'busqueda.json'), 'utf8');
const N_PED = JSON.parse(PL).pedidos.length;

let ok = 0, mal = 0;
const chk = (nom, c, det) => {
  if (c) { ok++; console.log(VER + '  ok  ' + RST + nom); }
  else { mal++; console.log(RED + '  MAL ' + RST + nom + (det ? '\n       ' + JSON.stringify(det).slice(0, 300) : '')); }
};

function preparar(modo) {
  return `(function(){
  window.__maleuAuth = true;
  var MODO = ${JSON.stringify(modo)};
  var PL = ${PL}, BU = ${BU};
  try {
    if (!sessionStorage.getItem('__limpio')) { localStorage.clear(); sessionStorage.setItem('__limpio','1'); }
    localStorage.setItem('mc_sbtok', JSON.stringify({ u: 'prueba', hasta: Date.now() + 3600e3,
      sb: { token: 'jwt.de.prueba', url: 'https://x.supabase.co', key: 'publishable' } }));
  } catch (e) {}
  window.__vio = { foto: 0, sb: 0, light: 0, busqueda: 0 };
  function resp(cuerpo, ms, st) {
    return new Promise(function (ok) { setTimeout(function () {
      ok(new Response(cuerpo, { status: st || 200, headers: { 'Content-Type': 'application/json' } }));
    }, ms); });
  }
  function base(url) {
    if (MODO === 'red') return new Promise(function (_, no) { setTimeout(function () { no(new TypeError('Failed to fetch')); }, 80); });
    if (MODO === '500') return resp('{"code":"XX000","message":"cupo"}', 80, 500);
    /* vieja: la foto existe pero tiene 2 h; el resto de la base, vacio. */
    if (url.indexOf('erp_screen_snapshot') >= 0) {
      var p = url.indexOf('busqueda') >= 0 ? BU : PL;
      var cuando = new Date(Date.now() - 120 * 60000).toISOString().replace('Z', '+00:00');
      return resp(JSON.stringify([{ payload: p, computed_at: cuando, warning: '', source: 'post' }]), 80);
    }
    return resp('[]', 40);
  }
  var _f = window.fetch;
  window.fetch = function (u, o) {
    var url = String((u && u.url) || u || '');
    if (url.indexOf('supabase') >= 0) {
      window.__vio.sb++; if (url.indexOf('erp_screen_snapshot') >= 0) window.__vio.foto++;
      return base(url);
    }
    if (url.indexOf('action=sbToken') >= 0)
      return resp(JSON.stringify({ ok: true, sb: { token: 'jwt.de.prueba', url: 'https://x.supabase.co', key: 'publishable', seg: 43200 } }), 40);
    if (url.indexOf('action=lote') >= 0) return resp('{"ok":false}', 5);
    if (url.indexOf('action=pedidosLight') >= 0) {
      window.__vio.light++;
      var g = JSON.parse(JSON.stringify(PL)); g.ts = Date.now() + 1500;
      return resp(JSON.stringify(g), 1500);
    }
    if (url.indexOf('action=busqueda') >= 0) { window.__vio.busqueda++; return resp(JSON.stringify(BU), 1500); }
    if (url.indexOf('/exec') >= 0 || url.indexOf('script.google') >= 0) return resp('{"ok":true}', 5);
    return _f.apply(this, arguments);
  };
})();`;
}

async function escenario(modo) {
  console.log('\n== Supabase: ' + modo + ' ==');
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
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: preparar(modo) });
    await cli.enviar('Page.navigate', { url: URL_ERP });
    for (let i = 0; i < 300; i++) {
      if (await evaluar(cli, "typeof loadRapido==='function' && typeof window._abrirSubapp==='function'")) break;
      await new Promise(r => setTimeout(r, 50));
    }
    /* Inicio / Pedidos: a que lleguen los pedidos de Google. */
    let ped = null;
    for (let i = 0; i < 150; i++) {
      ped = JSON.parse(await evaluar(cli, `JSON.stringify({ n: (D&&D.pedidos)?D.pedidos.length:-1,
        fact: (D&&D.totales)?D.totales.facturado:null, nota: window.__fotoPed||null, vio: window.__vio })`));
      if (ped.n === N_PED && ped.fact > 1 && ped.vio.light) break;
      await new Promise(r => setTimeout(r, 100));
    }
    chk('Inicio/Pedidos: quedan los ' + N_PED + ' pedidos con sus totales (de Google)',
        ped && ped.n === N_PED && ped.fact > 1 && ped.vio.light > 0, ped);
    if (modo === 'vieja') chk('   y la foto se pidio (si no, el caso no se probo)', ped && ped.vio.foto > 0, ped);

    /* Abastecimiento. */
    await evaluar(cli, "window._abrirSubapp('abast'); 1");
    let ab = null;
    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, 100));
      ab = JSON.parse(await evaluar(cli, `JSON.stringify({ sello: (document.getElementById('abaLastSync')||{}).textContent||'',
        nota: window.__abaFoto||null, vio: window.__vio })`));
      if (ab.vio.busqueda && ab.sello) break;
    }
    await evaluar(cli, `(function(){ var t=document.querySelector('#pg-abast [data-tab="pagos"]')||document.querySelector('[data-tab="pagos"]'); if(t)t.click(); return 1; })()`);
    await new Promise(r => setTimeout(r, 800));
    const deudas = await evaluar(cli, `document.querySelectorAll('#pg-abast .deuda-card, .deuda-card').length`);
    chk('Abastecimiento: pide a Google y pinta (' + deudas + ' deudas, sello "' + (ab && ab.sello) + '")',
        ab && ab.vio.busqueda > 0 && !!ab.sello && deudas > 0, { ab, deudas });
    /* Una foto de hace 2 h puede pintar primero —dice de cuando es—, pero en
       cuanto llega Google el sello tiene que pasar a la hora de ahora. */
    await new Promise(r => setTimeout(r, 2500));
    const sello2 = await evaluar(cli, `(document.getElementById('abaLastSync')||{}).textContent||''`);
    chk('   y cuando llega Google el sello deja de decir la edad de la foto ("' + sello2 + '")',
        !!sello2 && !/hora|min/.test(sello2), sello2);
    chk('sin excepciones en la consola', errores.length === 0, errores);
  } finally { try { cli.matar(); } catch (e) {} }
}

(async () => {
  try {
    for (const m of ['red', '500', 'vieja']) await escenario(m);
  } catch (e) { console.log('EXPLOTO: ' + (e && e.message)); mal++; }
  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
