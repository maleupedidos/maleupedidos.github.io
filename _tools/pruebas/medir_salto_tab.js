/* CUÁNTO TARDA UNA TAB EN SER TOCABLE DESPUÉS DE SALTAR (18/11/2026). WebKit, perfil de iPhone, sesión del dueño, toda
   escritura cortada. Desde Inicio, para cada tab destino: go(tab) y, cuadro a cuadro, cuándo aparece algo tocable en la
   mitad de la pantalla (un botón, un link, algo con onclick) que no sea una capa de «cargando».
     PW=<playwright-core> SES_ADMIN=<ses.json> BASE=<url app.html> [TABS=ruta,busqueda] [VUELTAS=2] node _tools/pruebas/medir_salto_tab.js
   La primera vuelta es la primera vez que se abre la tab en la sesión; la segunda, la de todo el día (ya pintada).
   Sale con 1 si alguna tab, en la segunda vuelta, tarda más de 150 ms en ser tocable. */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html';
const TABS = (process.env.TABS || 'ruta,busqueda,pedidos,caja,equipo,ventas,stock').split(',');
const VUELTAS = Number(process.env.VUELTAS || 2), TOPE = Number(process.env.TOPE || 150);
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES_ADMIN, 'utf8'));
  const CPU = Number(process.env.CPU || 0);   /* CPU=4: Chrome con la CPU frenada (WebKit no deja) */
  const br = CPU ? await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }) : await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now(),dueno:true}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(); var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage();
  if (CPU) { const c = await ctx.newCDPSession(pg); await c.send('Emulation.setCPUThrottlingRate', { rate: CPU }); }
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && SESSION && SESSION.dueno, null, { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(6000);
  let mal = 0; const filas = [];
  for (let v = 1; v <= VUELTAS; v++) {
    for (const t of TABS) {
      await pg.evaluate(() => { try { document.body.classList.remove('sb-open'); } catch (e) {} go('inicio'); window.scrollTo(0, 0); });
      await pg.waitForTimeout(2500);
      const r = await pg.evaluate((tab) => new Promise((ok) => {
        const t0 = performance.now(); let sinc = 0, primero = null;
        try { go(tab); } catch (e) {}
        sinc = performance.now() - t0;   // lo que go() tuvo el hilo
        const tocable = () => {
          const pgOn = document.querySelector('.pg.on'); if (!pgOn) return '';
          for (const y of [300, 420, 540, 660]) for (const x of [80, 195, 310]) {
            const e = document.elementFromPoint(x, y); if (!e || !pgOn.contains(e)) continue;
            if (e.closest('.loading,[class*="cargando"],.ld,#boot')) continue;
            const c = e.closest('button,a,[onclick],summary,input,select,label,[role="button"],[role="tab"],.tab');
            if (c) return c.tagName + '.' + String(c.className || '').slice(0, 20);
          }
          return '';
        };
        const mira = () => {
          const q = tocable();
          if (q) return ok({ ms: Math.round(performance.now() - t0), sinc: Math.round(sinc), q });
          if (performance.now() - t0 > 8000) return ok({ ms: null, sinc: Math.round(sinc), q: '' });
          requestAnimationFrame(mira);
        };
        requestAnimationFrame(mira);
      }), t);
      const okk = v < VUELTAS || (r.ms !== null && r.ms <= TOPE);
      if (!okk) mal++;
      filas.push(`  ${okk ? 'ok  ' : 'MAL '} vuelta ${v} ${t.padEnd(9)} go() ${String(r.sinc).padStart(4)} ms · tocable a los ${r.ms === null ? 'NUNCA (8 s)' : r.ms + ' ms'}${r.q ? ' (' + r.q + ')' : ''}`);
    }
  }
  filas.forEach((f) => console.log(f));
  await br.close();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
