/* EL LOGIN QUE APARECE CON LA SESIÓN GUARDADA (26/11/2026, v1355). Chromium 390, SOLO LECTURA (guarda de sbses_guarda).
     PW=<playwright-core> SBSES=<sesion.json> BASE=http://localhost:8155/app.html node probar_login_oculta.js
   Reproduce lo de Tadeo a las 23:10: la página arranca OCULTA (la versión nueva se instaló sola en segundo plano) y no
   puede leer la sesión de la base. Tiene que: mostrar el login, NO borrar la sesión del ERP guardada, anotar por qué
   (maleu_login_motivo) y, al volver al frente con la sesión ya legible, recargar sola y entrar sin PIN. */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155/app.html';
let ok = 0, mal = 0;
const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 400))); };
const T = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const guarda = sbses(process.env.SBSES, 'tadeo');
  const br = await pw.chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  /* Fase 1: oculta y SIN mc_sbses (la lectura que no llegó). Fase 2 (sessionStorage): visible, con la sesión. */
  await ctx.addInitScript(`(function(){
    var f2=false; try{ f2=sessionStorage.getItem('__fase')==='2'; }catch(e){}
    window.__vis=f2?'visible':'hidden';
    try{ Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){return window.__vis;}});
         Object.defineProperty(document,'hidden',{configurable:true,get:function(){return window.__vis==='hidden';}}); }catch(e){}
    try{ if(!localStorage.getItem('maleu_panel_session'))localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()})); }catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){};
  })();` + guarda.replace(/;try\{localStorage\.setItem\('mc_sbses'/, ";try{if(sessionStorage.getItem('__fase')==='2')localStorage.setItem('mc_sbses'"));
  const pg = await ctx.newPage();
  const err = []; pg.on('pageerror', (e) => err.push(String(e.message).slice(0, 160)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await T(4000);
  const f1 = await pg.evaluate(() => ({ login: !document.getElementById('loginScreen').classList.contains('hidden'), panel: !!localStorage.getItem('maleu_panel_session'),
    sbses: !!localStorage.getItem('mc_sbses'), motivo: localStorage.getItem('maleu_login_motivo') }));
  console.log('\n── arranque oculto sin la sesión de la base');
  chk('muestra el login (no hay con qué entrar)', f1.login, f1);
  chk('NO borra la sesión del ERP guardada (maleu_panel_session sigue)', f1.panel, f1);
  chk('anota por qué: «sin sesion de la base (oculta: no se borro)»', /sin sesion de la base \(oculta: no se borro\)/.test(f1.motivo || ''), f1.motivo);
  console.log('\n── vuelve al frente y la sesión ya se lee');
  /* La sesión de la base vuelve a leerse (en el iPhone: el almacenamiento ya está), y la página vuelve al frente. */
  const j = JSON.parse(fs.readFileSync(process.env.SBSES, 'utf8'));
  const g = { u: 'tadeo', url: j.url || 'https://xhaxmyvhygxynwjqrarm.supabase.co', key: j.key || 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG',
    access: j.access_token || j.access, refresh: j.refresh_token || j.refresh, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true };
  await pg.evaluate((g) => { localStorage.setItem('mc_sbses', JSON.stringify(g)); sessionStorage.setItem('__fase', '2'); window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); }, g);
  await pg.waitForLoadState('domcontentloaded').catch(() => {});
  await T(6000);
  const f2 = await pg.evaluate(() => ({ login: !document.getElementById('loginScreen').classList.contains('hidden'), usuario: (window.SESSION || {}).usuario || null,
    motivo: localStorage.getItem('maleu_login_motivo'), fase: sessionStorage.getItem('__fase') }));
  chk('recargó sola y entró sin PIN (sin login, SESSION tadeo)', !f2.login && f2.usuario === 'tadeo', f2);
  chk('el motivo dice «recargo sola»', /recargo sola/.test(f2.motivo || ''), f2.motivo);
  await T(9000);
  const f3 = await pg.evaluate(() => ({ motivo: localStorage.getItem('maleu_login_motivo') }));
  chk('con sesión, el motivo se sube y se borra del teléfono', f3.motivo === null, f3);
  chk('sin errores de página', err.length === 0, err);
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
