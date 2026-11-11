/* FILTROS PLEGABLES (11/11/2026): Egresos y Proveedores.
     SBSES=<sbses.json> node _tools/pruebas/probar_filtros_plegables.js <token> [ancho]
   Con clics reales sobre la barra (no llamando funciones), sostiene:
     EGRESOS — arranca plegado y dice «Sin filtros»; «Filtros» los muestra; tocar un proveedor
       lo nombra en «Filtros aplicados» con el contador en 1 y achica la lista; plegado, el
       aplicado SIGUE a la vista; «Limpiar filtros» vuelve a la lista entera; el estado plegado
       sobrevive a recargar la pantalla.
     PROVEEDORES — arranca abierto (el selector de proveedor es la pantalla); cambiar «Agrupar
       por» lo nombra; el proveedor NO cuenta como filtro; «Limpiar filtros» vuelve a Semana. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2);
const ANCHO = Number(ANCHO_S || 1440);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{if(!sessionStorage.getItem('fpPrueba')){sessionStorage.setItem('fpPrueba','1');localStorage.removeItem('maleu_fp_egr');localStorage.removeItem('maleu_fp_pv');localStorage.setItem('maleu_egr_dummy','');}}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(14000);
  const tocar = async (sel) => {
    const c = await evaluar(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return r.width?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`);
    if (!c) return false;
    for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: 'left', clickCount: 1 });
    await T(600); return true;
  };
  const estado = (id, panel) => evaluar(cli, `(function(){var b=document.getElementById('fp-${id}'),p=document.querySelector(${JSON.stringify(panel)});
    if(!b)return {err:'sin barra'};var n=b.querySelector('.fp-n');
    return {abierto:!!p&&getComputedStyle(p).display!=='none',tog:(b.querySelector('.fp-tog-t')||{}).textContent,n:n?+n.textContent:0,
      chips:[].slice.call(b.querySelectorAll('.fp-chip')).map(function(c){return c.textContent}),nada:!!b.querySelector('.fp-nada'),limpiar:!!b.querySelector('.fp-limpiar'),
      barraVisible:b.getBoundingClientRect().height>0}})()`);

  /* ── EGRESOS ── */
  await evaluar(cli, "window._egrCats=[];window._egrPeriodo='';window._egrSearch='';go('egresos')"); await T(6000);
  let e = await estado('egr', '#egrFilterInner');
  chk(e.barraVisible === true && e.abierto === false && e.nada === true, 'Egresos arranca plegado y dice «Sin filtros»', e);
  const filas0 = await evaluar(cli, "document.querySelectorAll('#egrBreakdown .card').length");
  await tocar('#fp-egr .fp-tog');
  e = await estado('egr', '#egrFilterInner');
  chk(e.abierto === true && e.tog === 'Ocultar filtros', '«Filtros» los muestra y el botón pasa a «Ocultar filtros»', e);
  const prov = await evaluar(cli, "(function(){var b=document.querySelector('#egrFilterInner button[data-c]');return b?b.getAttribute('data-c'):null})()");
  await tocar(`#egrFilterInner button[data-c="${String(prov).replace(/"/g, '\\"')}"]`); await T(500);
  e = await estado('egr', '#egrFilterInner');
  const filas1 = await evaluar(cli, "document.querySelectorAll('#egrBreakdown .card').length");
  chk(e.n === 1 && e.chips.some((c) => c.indexOf(prov) >= 0) && e.limpiar, `tocar «${prov}» lo nombra en Filtros aplicados (1)`, e);
  chk(filas0 > 1 && filas1 === 1, `la lista se achica a ese proveedor (${filas0} → ${filas1})`);
  await tocar('#fp-egr .fp-tog');
  e = await estado('egr', '#egrFilterInner');
  chk(e.abierto === false && e.chips.length === 1, 'plegado, el filtro aplicado sigue a la vista', e);
  /* Limpiar con los filtros PLEGADOS: es justo el caso para el que existe la línea de aplicados. */
  await tocar('#fp-egr .fp-limpiar'); await T(500);
  e = await estado('egr', '#egrFilterInner');
  const filas2 = await evaluar(cli, "document.querySelectorAll('#egrBreakdown .card').length");
  chk(e.n === 0 && e.nada === true && filas2 === filas0, `«Limpiar filtros» vuelve a la lista entera (${filas2})`, e);
  await cli.enviar('Page.reload'); await T(14000);
  await evaluar(cli, "go('egresos')"); await T(6000);
  e = await estado('egr', '#egrFilterInner');
  chk(e.abierto === false, 'el plegado sobrevive a recargar', e);

  /* ── PROVEEDORES ── */
  await evaluar(cli, "go('proveedores')"); await T(8000);
  let p = await estado('pv', '#p-proveedores .pv-filters');
  chk(p.barraVisible === true && p.abierto === true && p.n === 0, 'Proveedores arranca abierto y sin filtros (el proveedor no cuenta)', p);
  await evaluar(cli, "(function(){var s=document.getElementById('pvGran');var o=[].slice.call(s.options).filter(function(x){return x.value!=='week'})[0];s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));})()"); await T(1500);
  p = await estado('pv', '#p-proveedores .pv-filters');
  chk(p.n === 1 && /^Agrupar por: /.test(p.chips[0] || ''), 'cambiar «Agrupar por» lo nombra', p);
  await tocar('#fp-pv .fp-limpiar'); await T(1500);
  p = await estado('pv', '#p-proveedores .pv-filters');
  const gran = await evaluar(cli, "document.getElementById('pvGran').value");
  chk(p.n === 0 && gran === 'week', '«Limpiar filtros» vuelve a Semana', { p, gran });

  const err = await evaluar(cli, 'window.__err||[]');
  chk(!err.length, 'sin errores en la consola', err);
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
