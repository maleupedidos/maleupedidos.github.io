/* EL ↻ CON UN ROL DE UNA SOLA TAB (6/10/2026)
 *
 *   node _tools/pruebas/probar_refresco_rol.js <token-admin> [url] [tab]
 *
 * Joaquín entra con el rol `joaquin`, que solo tiene Proveedores. La pantalla
 * cargaba bien, pero el ↻ quedaba en "No se pudo": pedía el volcado (`admin`)
 * y `cajaLight`, que su rol no tiene, y el forbidden lo marcaba como fallo.
 *
 * Sin la sesión de él: arranca el ERP con sus tabs y le pone adelante un
 * portero que contesta `forbidden` a toda acción que el backend no le daría.
 * El mapa NO está copiado a mano: sale de ACCION_TABS en ../estancias/Code.js,
 * el mismo que usa el backend. Lo permitido sale al servidor de verdad (con el
 * token admin, solo lecturas: el PREP intercepta los POST).
 *
 * Verde = después de tocar ↻ el botón NO queda en rojo y no se pidió ninguna
 * acción prohibida para el rol.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
if (!token) { console.error('Falta el token: node probar_refresco_rol.js <token> [url] [tab]'); process.exit(1); }
const URL = process.argv[3] || 'http://localhost:8080/app.html';
const TAB = process.argv[4] || 'proveedores';
const ROL = 'joaquin', TABS = [TAB];
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return null; } };

/* El mapa del backend, leído del Code.js de estancias (repo privado: se lee
   en el momento, no se copia nada acá). */
const CODE = path.join(__dirname, '..', '..', '..', 'estancias', '.clasp-src', 'Code.js');
const src = fs.readFileSync(CODE, 'utf8');
const i = src.indexOf('var ACCION_TABS = {');
if (i < 0) { console.error('No encontre ACCION_TABS en ' + CODE); process.exit(1); }
const j = src.indexOf('\n};', i);
const ACCION_TABS = (new Function('return ' + src.slice(i + 'var ACCION_TABS = '.length, j + 2)))();

const PORTERO = `
(function(){
  var MAPA = ${JSON.stringify(ACCION_TABS)}, TABS = ${JSON.stringify(TABS)};
  window.__forb = []; window.__pedidas = [];
  var o = window.fetch;
  window.fetch = function(u, x){
    var url = (typeof u === 'string') ? u : ((u && u.url) || '');
    var m = url.match(/[?&]action=([A-Za-z]+)/);
    if (!m || url.indexOf('script.google') < 0 && url.indexOf('/exec') < 0) return o.apply(this, arguments);
    var a = m[1];
    window.__pedidas.push(a);
    var json = function(obj){ return Promise.resolve(new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } })); };
    if (a === 'miSesion') return json({ ok: true, rol: '${ROL}', tabs: TABS, nombre: 'Prueba ${ROL}', activo: true });
    var tabs = MAPA[a];
    if (tabs && !tabs.some(function(t){ return TABS.indexOf(t) >= 0; })) {
      window.__forb.push(a);
      return json({ ok: false, forbidden: true, rol: '${ROL}', action: a });
    }
    return o.apply(this, arguments);
  };
})();
`;
const SESION = `try{localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:"${ROL}",rol:"${ROL}",nombre:"Prueba",tabs:${JSON.stringify(TABS)},ts:Date.now()}));}catch(e){}`;

(async () => {
  const cli = await abrir();
  let fallas = 0;
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token, SESION) });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PORTERO });
    await cli.enviar('Page.navigate', { url: URL });
    const lim = Date.now() + 60000;
    while (Date.now() < lim) {
      if (await ev(cli, `typeof refreshContextual==='function' && typeof go==='function'`) === true) break;
      await dormir(300);
    }
    await ev(cli, `go(${JSON.stringify(TAB)})`);
    /* Que la tab cargue lo suyo antes de tocar el ↻: si no, se mide el arranque. */
    const lim2 = Date.now() + 60000;
    while (Date.now() < lim2) {
      const n = await ev(cli, `(document.querySelector('#p-${TAB}')||{}).innerText||''`);
      if (n && n.length > 200 && !/Cargando/.test(n.slice(0, 300))) break;
      await dormir(500);
    }
    await dormir(2000);
    const tabsVistas = await ev(cli, `JSON.stringify(SESSION&&SESSION.tabs)`);
    const antes = await ev(cli, `document.getElementById('hdrRefresh').dataset.estado`);
    await ev(cli, `window.__forb=[]; window.__pedidas=[]; refreshContextual();`);
    const lim3 = Date.now() + 120000;
    await dormir(500);
    while (Date.now() < lim3) {
      if (await ev(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`) === true) break;
      await dormir(400);
    }
    await dormir(1500);
    const r = await ev(cli, `({ estado: document.getElementById('hdrRefresh').dataset.estado,
      txt: (document.getElementById('hdrRefreshTime')||{}).textContent,
      forb: window.__forb, pedidas: window.__pedidas, err: (window.__err||[]).slice(0,5),
      ok: (document.querySelector('#p-${TAB}')||{}).innerText.length })`) || {};
    console.log(`URL ${URL} · tab ${TAB} · rol ${ROL} · tabs en la sesión ${tabsVistas}`);
    console.log(`  ↻ antes de tocarlo: ${antes}`);
    console.log(`  ↻ después: ${r.estado} ("${r.txt}")`);
    console.log(`  pidió: ${(r.pedidas || []).join(', ') || 'nada'}`);
    console.log(`  prohibidas para el rol: ${(r.forb || []).join(', ') || 'ninguna'}`);
    if (r.err && r.err.length) console.log(`  errores en consola: ${r.err.join(' | ')}`);
    const chk = (c, ok, mal) => { if (c) console.log('  \x1b[32mOK\x1b[0m — ' + ok); else { fallas++; console.log('  \x1b[31mFALLA\x1b[0m — ' + mal); } };
    chk(tabsVistas === JSON.stringify(TABS), 'la app corre con el rol de una sola tab', 'la sesión no quedó con el rol: ' + tabsVistas);
    chk(r.estado !== 'err', 'el ↻ no queda en "No se pudo"', 'el ↻ quedó en rojo: ' + r.txt);
    chk(!(r.forb || []).length, 'el ↻ no pidió nada que el rol no tiene', 'pidió ' + (r.forb || []).join(', '));
    chk((r.pedidas || []).length > 0, 'y sí pidió algo (no es un verde por no hacer nada)', 'el ↻ no pidió nada');
  } finally {
    try { cli.matar(); } catch (e) {}
    console.log(fallas ? `\n  ${fallas} falla(s)\n` : '');
    process.exit(fallas ? 1 : 0);
  }
})();
