/* LOS TOQUES EN EL IPHONE (17/11/2026). Tadeo: «desde el celular tarda un poquito cada toque, a veces tengo que tocar 2 o
   3 veces». WebKit de Playwright con perfil de iPhone (390×844, táctil), sesión temporal del dueño, toda escritura cortada.
     PW=<playwright-core> SES_ADMIN=<ses.json> BASE=<url app.html> [SOLO=inicio,caja] node _tools/pruebas/probar_toques.js
   En Inicio, Pedidos, Ruta, Caja y Equipo toca (UN toque, `touchscreen.tap`) hasta 6 controles de navegación cada una
   (pestañas, chips, filas, desplegables; nunca Pagar/Cobrar/Guardar/Borrar) y mide:
     · que el toque llegue como CLIC al control (si no llega, en el iPhone hay que tocar dos veces);
     · cuánto pasa del toque al clic (el «retraso del doble toque»: con touch-action: manipulation es ~0);
     · cuánto tarda en pintar después del clic (el trabajo del manejador: lo que se siente como «tarda»).
   Además cuenta, en las hojas de estilo, las reglas :hover fuera de @media (hover: hover) que cambian display, visibility,
   opacity o content: en iOS esas hacen que el primer toque sea solo «hover» y recién el segundo haga clic.
   Sale con 1 si algún toque no llegó o tardó más de 100 ms en pintar (el tope del Organizador). */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html';
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
const TOPE = Number(process.env.TOPE || 100);
const PANT = [
  ['inicio', `go('inicio')`],
  ['pedidos', `go('pedidos')`],
  ['ruta', `go('ruta'); setTimeout(function(){ try{ switchTab('ruta'); }catch(e){} },1500)`],
  ['caja', `go('caja')`],
  ['equipo', `go('equipo')`],
];
const NO = /pagar|cobrar|guardar|borrar|eliminar|deshacer|confirmar|recib[ií]|entreg|cancelar|anular|mover|cargar|contar|ajust|nuevo|\+|salir|cerrar sesi|llamar|whatsapp|compartir|descargar|subir|foto/i;
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES_ADMIN, 'utf8'));
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){}; window.prompt=function(){return null;};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(); var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))return Promise.resolve(new Response('{"ok":false}',{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();
    /* El instrumento: hora del toque, hora del clic y hora del primer cuadro pintado después del clic. */
    window.__t={};
    document.addEventListener('touchstart',function(){window.__t={ts:performance.now()};},true);
    document.addEventListener('click',function(e){ if(!window.__t||window.__t.click)return; var t=window.__t; t.click=performance.now(); t.blanco=e.target&&e.target.closest?(e.target.closest('[data-qa]')?1:0):0;
      requestAnimationFrame(function(){ setTimeout(function(){ t.pinta=performance.now(); },0); }); },true);`);
  const pg = await ctx.newPage();
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && typeof SESSION !== 'undefined' && SESSION && SESSION.dueno, null, { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(4000);
  /* Las reglas :hover que pueden comerse el primer toque en iOS. */
  const hov = await pg.evaluate(() => {
    let tot = 0, peli = 0, ej = [];
    const mira = (rules, enHover) => { for (const r of rules) {
      if (r.type === 4) { mira(r.cssRules, enHover || /hover\s*:\s*hover/.test(r.conditionText || r.media.mediaText)); continue; }
      if (r.selectorText && r.selectorText.indexOf(':hover') >= 0 && !enHover) {
        tot++;
        if (/display|visibility|opacity|content/.test(r.style.cssText)) { peli++; if (ej.length < 6) ej.push(r.selectorText.slice(0, 70) + ' {' + r.style.cssText.slice(0, 50) + '}'); }
      } } };
    for (const s of document.styleSheets) { try { mira(s.cssRules, false); } catch (e) {} }
    return { tot, peli, ej, ta: getComputedStyle(document.documentElement).touchAction };
  });
  console.log(`  :hover fuera de @media(hover:hover): ${hov.tot} · de esas, ${hov.peli} cambian display/visibility/opacity/content · touch-action del html: ${hov.ta}`);
  hov.ej.forEach((x) => console.log('     ' + x));
  let mal = 0, n = 0; const filas = [];
  for (const [nom, js] of PANT) {
    if (SOLO && SOLO.indexOf(nom) < 0) continue;
    await pg.evaluate(js); await pg.waitForTimeout(7000);
    /* Los controles: visibles, en pantalla, de navegación. Se marcan con data-qa para volver a encontrarlos. */
    const cands = await pg.evaluate((src) => {
      const NO = new RegExp(src, 'i'); const out = []; let k = 0;
      const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 20 || r.height < 20 || r.bottom < 60 || r.top > 800) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return null; return r; };
      document.querySelectorAll('.pg.on .eq-row, .pg.on button, .pg.on summary, .pg.on [onclick], #pg-ruta button, #pg-ruta [onclick], .pg.active button, .pg.active [onclick]').forEach((e) => {
        if (out.length >= 6) return;
        const t = (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        if (!t || NO.test(t) || e.disabled) return;
        const r = vis(e); if (!r) return;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!hit || !(hit === e || e.contains(hit))) return;
        e.setAttribute('data-qa', 'q' + (++k)); out.push({ q: 'q' + k, t, x: r.left + r.width / 2, y: r.top + r.height / 2 });
      });
      return out;
    }, NO.source);
    console.log(`  ${nom}: ${cands.length} controles para tocar`);
    for (const c of cands) {
      await pg.evaluate((js2) => { window.__t = {}; }, js);
      /* La pantalla se vuelve a pintar entre toque y toque: el control se busca de nuevo por su texto. */
      const r0 = await pg.evaluate((c) => { let e = document.querySelector('[data-qa="' + c.q + '"]');
        if (!e) e = [].filter.call(document.querySelectorAll('.pg.on .eq-row, .pg.on button, .pg.on summary, .pg.on [onclick], #pg-ruta button, #pg-ruta [onclick]'),
          (x) => (x.innerText || x.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) === c.t && x.getBoundingClientRect().width > 0)[0];
        if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, c);
      if (!r0) { console.log('  (no encontré «' + c.t + '» después de volver)'); continue; }
      await pg.waitForTimeout(250);
      await pg.touchscreen.tap(r0.x, r0.y);
      await pg.waitForTimeout(700);
      const t = await pg.evaluate(() => window.__t);
      n++;
      const llego = !!(t && t.click), demora = llego ? Math.round(t.click - t.ts) : null, pinta = llego && t.pinta ? Math.round(t.pinta - t.click) : null;
      const okk = llego && pinta !== null && pinta <= TOPE;
      if (!okk) mal++;
      filas.push(`  ${okk ? 'ok  ' : 'MAL '} ${nom.padEnd(8)} «${c.t}»  ${llego ? 'toque→clic ' + demora + ' ms · pinta ' + pinta + ' ms' : 'EL TOQUE NO LLEGÓ COMO CLIC'}`);
      /* Volver a la pantalla como estaba (una ficha o un menú abierto no deben tapar el próximo). */
      await pg.keyboard.press('Escape').catch(() => {});
      await pg.evaluate(() => { try { if (typeof eqCerrar === 'function') eqCerrar(); } catch (e) {} });
      await pg.evaluate(js); await pg.waitForTimeout(1200);
    }
  }
  filas.forEach((f) => console.log(f));
  console.log(`\n  ${n - mal} de ${n} toques bien (un toque, pinta en ≤ ${TOPE} ms)`);
  await br.close();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
