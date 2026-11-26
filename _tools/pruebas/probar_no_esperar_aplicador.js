/* NADIE ESPERA LA APLICACION A LA PLANILLA (28/10/2026). Hoy alguien toco tres veces el mismo pase porque la
   pantalla tardaba hasta 65 s: `_pdPost` (bandeja «Por decidir») y `rutaReclamar` (red.html) esperaban
   `pedidosFuenteAplicar` aunque la base ya tuviera el pedido escrito.
   node _tools/pruebas/probar_no_esperar_aplicador.js [panel.src.html] [red.html]
   Saca las dos funciones de sus archivos y las corre con un servidor simulado: la orden se acepta al instante y
   el aplicador tarda 30 s (reloj falso). Sostiene: con `baseEscribio: true` la pantalla termina SIN esperar al
   aplicador (y igual se lo manda); sin `baseEscribio`, lo espera como antes. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..', '..');
const panel = fs.readFileSync(process.argv[2] || path.join(R, '_src', 'panel.src.html'), 'utf8');
const red = fs.readFileSync(process.argv[3] || path.join(R, 'red.html'), 'utf8');
const saca = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) throw new Error('no esta ' + n); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && !--d) return src.slice(i, k + 1); } };
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
/* Reloj falso: nada tarda de verdad; el aplicador «tarda 30 s» en el tiempo simulado. */
function entorno(respuesta) {
  let ahora = 0; const pendientes = [];
  const log = [];
  const ctx = {
    console, JSON, Promise, Date: { now: () => ahora }, Math, String, Number, Object, Array, Set, setTimeout: (f, ms) => pendientes.push({ t: ahora + (ms || 0), f }),
    API: 'x', APPS_SCRIPT_URL: 'x', confirm: () => true, renderRuta: () => {}, loadDashboard: () => {},
    redToast: (m) => log.push({ t: ahora, toast: m }),
    fetch: (u, x) => {
      const b = JSON.parse(x.body);
      log.push({ t: ahora, post: b.action });
      if (b.action === 'pedidosFuenteAplicar') return new Promise((ok) => pendientes.push({ t: ahora + 30000, f: () => { log.push({ t: ahora, aplicado: 1 }); ok({ json: () => ({ ok: true }) }); } }));
      return Promise.resolve({ json: () => respuesta });
    },
  };
  ctx.avanzar = async (ms) => { const fin = ahora + ms; for (;;) { await new Promise((r) => setImmediate(r)); pendientes.sort((a, b) => a.t - b.t); const p = pendientes[0]; if (!p || p.t > fin) break; pendientes.shift(); ahora = p.t; p.f(); } ahora = fin; await new Promise((r) => setImmediate(r)); };
  ctx.log = log;
  return ctx;
}
(async () => {
  for (const base of [true, false]) {
    const resp = { ok: true, diferida: true, baseEscribio: base, rc: { estado: 'Pendiente' } };
    /* _pdPost */
    const E = entorno(resp); vm.createContext(E);
    vm.runInContext(saca(panel, '_pfAplicar') + '\n' + saca(panel, '_pdPost') + '\nthis.fin=null; _pdPost({action:"pasarAVendedor"}).then(function(){ fin=Date.now(); });', E);
    await E.avanzar(1000);
    const t1 = E.fin;
    await E.avanzar(40000);
    if (base) chk('Por decidir, con baseEscribio: la pantalla termina sin esperar al aplicador (' + t1 + ' ms)', t1 !== null && t1 < 1000, { t1, log: E.log });
    else chk('Por decidir, SIN baseEscribio: espera al aplicador como antes (' + E.fin + ' ms)', E.fin >= 30000, { fin: E.fin, log: E.log });
    chk('   y en los dos casos se le manda pedidosFuenteAplicar', E.log.some((x) => x.post === 'pedidosFuenteAplicar'), E.log);
    /* rutaReclamar */
    const F = entorno(resp); vm.createContext(F);
    vm.runInContext(`var session={nombre:'Marcos'}, lastDashboardData=null, redReclamoEnVuelo=new Set(); var P={n:'12',row:5,c:'Ana'};
      function _rutaCurrent(){ return P; } function _normN(n){ return String(n); }
      ` + saca(red, 'rutaReclamar') + '\nrutaReclamar();', F);
    await F.avanzar(1000);
    const toast1 = F.log.find((x) => x.toast);
    await F.avanzar(40000);
    const toast = F.log.find((x) => x.toast);
    if (base) chk('Reclamo en Red, con baseEscribio: «✓ Le avisamos» sin esperar al aplicador', toast1 && /Le avisamos/.test(toast1.toast) && toast1.t < 1000, F.log);
    else chk('Reclamo en Red, SIN baseEscribio: espera al aplicador como antes', toast && /Le avisamos/.test(toast.toast) && toast.t >= 30000, F.log);
    chk('   y se le manda pedidosFuenteAplicar', F.log.some((x) => x.post === 'pedidosFuenteAplicar'), F.log);
  }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  process.exit(mal ? 1 : 0);
})();
