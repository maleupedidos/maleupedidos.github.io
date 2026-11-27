/* PLANIFICACIÓN Y PROVEEDORES SOLO DE LA BASE (26/11/2026, cola 17). Chromium 1440, SOLO LECTURA (sbses_guarda).
     PW=<playwright-core> SBSES=<sesion.json> BASE=http://localhost:8155/app.html node probar_plan_prov_sin_apps.js
   1) base andando: Planificación pinta las metas de `plan_mes_pantalla`, Proveedores el resumen de `proveedores_pantalla`
      y Evolución la meta; NINGÚN pedido sale a script.google.com.
   2) base caída (esas dos RPC contestan 500): siguen sin ir a Apps Script; Planificación dice «No se pudo actualizar» con
      la copia y Proveedores «no se pudo actualizar».
   3) base que niega (403): Planificación dice que no tiene permiso; tampoco Apps Script. */
'use strict';
const pw = require(process.env.PW || 'playwright-core');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155/app.html';
let ok = 0, mal = 0;
const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 500))); };
const T = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await pw.chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){};` + sbses(process.env.SBSES, 'tadeo'));
  let modo = 'anda'; const apps = [];
  await ctx.route(/script\.google(usercontent)?\.com/, (r) => { apps.push(modo + ' ' + (r.request().url().match(/action=([a-zA-Z]+)/) || [, '?'])[1]); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false,"err":"apps cortado por la prueba"}' }); });
  await ctx.route(/\/rest\/v1\/rpc\/(plan_mes_pantalla|proveedores_pantalla)/, (r) => {
    if (modo === 'cae') return r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"caida simulada"}' });
    if (modo === 'niega') return r.fulfill({ status: 403, contentType: 'application/json', body: '{"code":"42501","message":"sin permiso"}' });
    return r.continue();
  });
  const pg = await ctx.newPage();
  const err = []; pg.on('pageerror', (e) => err.push(String(e.message).slice(0, 160)));
  /* `planData` vive adentro de la tab (no es global): las metas se cuentan en lo que contestó la base. */
  let metasBase = -1;
  pg.on('response', async (res) => { if (/rpc\/plan_mes_pantalla/.test(res.url()) && res.status() === 200) { try { const j = await res.json(); metasBase = Object.keys(j.metas || {}).length; } catch (e) {} } });
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && typeof window.planLoad === 'function' && window.D && (D.pedidos || []).length > 500, null, { timeout: 150000 }).catch(() => {});
  const plan = async () => { await pg.evaluate(() => go('planificacion')); await T(1000); const r = await pg.evaluate(() => planLoad()); await T(500);
    return pg.evaluate((r) => ({ r, estado: (document.getElementById('planEstado') || {}).hidden === false ? document.getElementById('planEstado').innerText.replace(/\s+/g, ' ') : '' }), r); };
  const prov = async (n) => { await pg.evaluate((n) => { go('proveedores'); if (n) return window.pvRecargar(); }, n); await T(6000);
    return pg.evaluate(() => ({ sello: (document.getElementById('pvFresco') || {}).textContent || '', opts: (document.getElementById('pvProv') || {}).options ? document.getElementById('pvProv').options.length : 0, primera: ((document.getElementById('pvProv') || {}).options || [])[0] ? document.getElementById('pvProv').options[0].text : '' })); };
  /* Con sesión de la base el ERP corta Apps Script EN EL NAVEGADOR (`_sinApps`) y lo cuenta en window.__sinApps: el
     intento no llega a la red. Por eso se cuentan los dos: lo que salió y lo que se intentó. */
  const intentos = () => pg.evaluate(() => { const s = window.__sinApps || {}; return (s.planMes || 0) + (s.analisisProveedor || 0); });
  const evu = async () => { await pg.evaluate(() => { try { _evuMetaPedida = ''; _evuPedirMeta(); } catch (e) {} }); await T(4000); return pg.evaluate(() => ({ meta: window._evuMeta || null, fallo: window._evuMetaFallo })); };

  console.log('\n── 1) la base anda');
  const p1 = await plan(); chk('Planificación: contestó la base (' + metasBase + ' metas este mes; noviembre no tiene cargadas ni en la planilla)', p1.r === true && metasBase >= 0 && !p1.estado, { p1, metasBase });
  const v1 = await prov(); chk('Proveedores: el resumen de la base (' + v1.opts + ' proveedores, «' + v1.sello + '»)', v1.opts > 1 && /recién/.test(v1.sello), v1);
  const e1 = await evu(); chk('Evolución: la meta del mes de la base', !!(e1.meta && e1.meta.de === 'base') && e1.fallo === false, e1);
  const i1 = await intentos();
  chk('nada salió ni se intentó a Apps Script con la base andando', i1 === 0 && apps.filter((x) => /^anda /.test(x) && /planMes|analisisProveedor/.test(x)).length === 0, { apps, intentos: i1 });

  console.log('\n── 2) la base se cae');
  modo = 'cae';
  const p2 = await plan(); chk('Planificación: «No se pudo actualizar» con la copia', p2.r === false && /No se pudo actualizar/.test(p2.estado) && /copia/.test(p2.estado), p2);
  const v2 = await prov(1); chk('Proveedores: sigue con la copia y dice «no se pudo actualizar»', v2.opts > 1 && /no se pudo actualizar/.test(v2.sello), v2);
  const i2 = await intentos();
  chk('con la base caída, tampoco va (ni intenta ir) a Apps Script', i2 === i1 && apps.filter((x) => /^cae /.test(x)).length === 0, { apps, intentos: i2 });

  console.log('\n── 3) la base niega (403)');
  modo = 'niega';
  const p3 = await plan(); chk('Planificación: «tu usuario no tiene permiso»', p3.r === false && /no tiene permiso/.test(p3.estado), p3);
  const i3 = await intentos();
  chk('con la base negando, tampoco va (ni intenta ir) a Apps Script', i3 === i2 && apps.filter((x) => /^niega /.test(x)).length === 0, { apps, intentos: i3 });
  chk('sin errores de página', err.length === 0, err);
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal' + (apps.length ? ' · a Apps Script: ' + apps.join(', ') : ''));
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
