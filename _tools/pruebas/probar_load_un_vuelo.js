/* UN SOLO VOLCADO EN VUELO. (1/10/2026)
 *
 *   node _tools/servir.js                      (en otra terminal, o npm run dev)
 *   node _tools/pruebas/probar_load_un_vuelo.js
 *   APP=app_viejo_tmp.html node ...            <- la contraria
 *
 * Cada CONFIRMAR ORIGEN de la tab Pedidos —y otras 14 acciones— termina en un
 * load(), y load() arrancaba un volcado nuevo (1 MB, ~32 s) aunque ya hubiera
 * uno andando. Tres confirmaciones seguidas = tres volcados contra el mismo
 * Apps Script, y el proximo guardado esperando en la cola.
 *
 * Lo que tiene que ser cierto:
 *   · N pedidos mientras hay uno en vuelo -> UN volcado mas, no N.
 *   · Ese volcado de mas sale DESPUES de que termina el primero (el primero
 *     pudo salir antes del cambio recien guardado).
 *   · Todos los que llamaron reciben {ok:true} y D queda con el ULTIMO.
 *   · Un load() suelto, sin nadie en vuelo, sale al instante como siempre.
 *   · Si el volcado falla, el siguiente load() no queda trabado.
 *
 * Ningun fetch sale de esta maquina: `action=admin` se contesta aca, con demora.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const STUB = `
  window.__adm = []; window.__admFalla = false;
  (function(){ var o = window.fetch; window.fetch = function(u, x){
    var s = String(u);
    if (x && String(x.method||'').toUpperCase() === 'POST') return Promise.resolve(new Response('{"ok":true}'));
    if (/action=admin/.test(s)) {
      var n = window.__adm.length + 1, rec = { n: n, ini: performance.now(), fin: null };
      window.__adm.push(rec);
      return new Promise(function(res, rej){ setTimeout(function(){ rec.fin = performance.now();
        if (window.__admFalla) return rej(new TypeError('red'));
        res(new Response(JSON.stringify({ ok: true, pedidos: [], volcado: n }), { headers: { 'Content-Type': 'application/json' } })); }, 700); });
    }
    if (/script\\.google|supabase/.test(s)) return Promise.resolve(new Response('{"ok":false}'));
    return o.apply(this, arguments); }; })();`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
  let listo = false;
  for (let i = 0; i < 150 && !listo; i++) { await pausa(200); try { listo = await evaluar(cli, 'typeof load === "function"'); } catch (e) {} }
  console.log('\n== UN SOLO VOLCADO EN VUELO ==  (' + APP + ')');
  chk('el ERP arranco y load() existe', listo);
  await pausa(2500);   // que termine lo que el arranque haya pedido

  const r = await evaluar(cli, `(async () => {
    const espera = () => new Promise(r => { const t = setInterval(() => { if (window.__adm.every(a => a.fin !== null)) { clearInterval(t); r(); } }, 50); });
    await espera(); window.__adm.length = 0;
    const out = {};

    /* 1. Un load suelto */
    let t = performance.now(); const r1 = await load();
    out.suelto = { volcados: window.__adm.length, ok: r1 && r1.ok };
    window.__adm.length = 0;

    /* 2. Cinco seguidos, como cinco CONFIRMAR ORIGEN */
    const ps = []; for (let i = 0; i < 5; i++) { ps.push(load()); await new Promise(r => setTimeout(r, 30)); }
    const rs = await Promise.all(ps);
    out.cinco = { volcados: window.__adm.length, oks: rs.map(x => !!(x && x.ok)),
      segundoDespuesDelPrimero: window.__adm.length < 2 || window.__adm[1].ini >= window.__adm[0].fin,
      dVolcado: D && D.volcado, ultimo: window.__adm.length };
    window.__adm.length = 0;

    /* 3. Un volcado que falla no traba al siguiente */
    window.__admFalla = true; const rf = await load(); window.__admFalla = false;
    const rd = await load();
    out.falla = { rf: rf && rf.ok, rd: rd && rd.ok, volcados: window.__adm.length };
    return out;
  })()`);

  chk('un load() suelto hace UN volcado y contesta ok', r.suelto.volcados === 1 && r.suelto.ok === true, r.suelto);
  chk('cinco load() seguidos hacen DOS volcados, no cinco', r.cinco.volcados === 2, r.cinco);
  chk('el segundo sale recien cuando termino el primero', r.cinco.segundoDespuesDelPrimero === true, r.cinco);
  chk('los cinco que llamaron reciben ok', r.cinco.oks.length === 5 && r.cinco.oks.every(Boolean), r.cinco.oks);
  chk('D queda con el ULTIMO volcado', r.cinco.dVolcado === r.cinco.ultimo, r.cinco);
  chk('un volcado que falla contesta ok:false', r.falla.rf === false, r.falla);
  chk('y el siguiente load() sale y anda', r.falla.rd === true && r.falla.volcados === 2, r.falla);

  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
