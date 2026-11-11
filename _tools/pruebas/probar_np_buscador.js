/* EL BUSCADOR DE CLIENTES DE RUTA › + PEDIDO (11/11/2026, Tadeo: «Su» no aparecía).
     SBSES=<sbses> node _tools/pruebas/probar_np_buscador.js <token> [admin|rep]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado
   La lista tenía a los 463 clientes; el problema era el orden (por pedidos) y el corte en 8. Sostiene, tipeando de
   verdad en el campo del nombre:
     · «Su» trae primero a Su (el nombre exacto) y antes a Susini (empieza con «Su») que a Basualdo (lo tiene en el medio);
     · clientes inactivos de una sola compra, por una palabra de su nombre y por un pedazo de su teléfono, aparecen;
     · sin costos en la lista. Para el repartidor (rep) igual. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, QUIEN] = process.argv.slice(2);
const REP = QUIEN === 'rep';
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const extra = REP ? ';try{localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:"santos",rol:"repartidor",nombre:"Santos",tabs:["pedidoshome","mireparto","ruta"],ts:Date.now()}))}catch(e){}' : '';
const PREP = require('./sesion_prep.js')(TOKEN, extra);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, REP ? 'santos' : 'tadeo');
/* Inactivos de UNA compra, elegidos al azar de la base el 11/11/2026 (crm_foto_base, pedidos <= 1). */
const CASOS = [
  { q: 'Su', primero: 'Su' },
  { q: 'Vicky', tiene: 'Vicky Demartini' }, { q: '22763393', tiene: 'Vicky Demartini' },
  { q: 'Moro', tiene: 'Juan Pablo Moro' }, { q: '5018900', tiene: 'Juan Pablo Moro' },
  { q: 'Hitce', tiene: 'Miguel Hitce' }, { q: '1151189', tiene: 'Miguel Hitce' },
];
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ';try{localStorage.removeItem("maleu_np_clientes_v1")}catch(e){}' });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  await evaluar(cli, "go('ruta')"); await T(6000);
  await evaluar(cli, "switchTab('nuevo')"); await T(9000);
  for (const c of CASOS) {
    await evaluar(cli, "(function(){var i=document.getElementById('npNombre');i.value='';i.focus();})()");
    await cli.enviar('Input.insertText', { text: c.q }); await T(600);
    await evaluar(cli, "(function(){var i=document.getElementById('npNombre');i.dispatchEvent(new Event('input',{bubbles:true}));})()"); await T(500);
    const r = await evaluar(cli, "[].slice.call(document.querySelectorAll('#npClientesDropdown .np-cli-item')).map(function(e){return {n:e.querySelector('.np-cli-name').textContent.trim(),m:e.querySelector('.np-cli-meta').textContent}})");
    const ns = r.map((x) => x.n);
    if (c.primero) {
      chk(ns[0] === c.primero, `«${c.q}»: primero ${c.primero}`, ns);
      const iS = ns.findIndex((x) => /^susini|^jeronimo susini/i.test(x) || / susini/i.test(x)), iB = ns.findIndex((x) => /basualdo/i.test(x));
      chk(iS >= 0 && (iB < 0 || iS < iB), `«${c.q}»: Susini (palabra que empieza) antes que Basualdo (en el medio)`, ns);
    } else chk(ns.indexOf(c.tiene) >= 0, `«${c.q}» trae a ${c.tiene}`, ns);
    chk(!r.some((x) => /costo|margen/i.test(x.m)), `«${c.q}»: sin costos en la lista`);
  }
  const err = (await evaluar(cli, 'window.__err||[]')).filter((x) => !/ResizeObserver loop/.test(x));
  chk(!err.length, 'sin errores en la consola', err);
  console.log(`\n${ok} ok · ${mal} mal  (${REP ? 'santos/repartidor' : 'admin'})`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
