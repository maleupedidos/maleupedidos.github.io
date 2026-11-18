/* EL SEGUNDO TOQUE (18/11/2026). Tadeo, desde el iPhone: «en Inicio toco un botón, enseguida toco otro y el segundo no
   se lo toma». WebKit de Playwright con perfil de iPhone (390×844, táctil), sesión temporal del dueño, toda escritura cortada.
     PW=<playwright-core> SES_ADMIN=<ses.json> BASE=<url app.html> [SOLO=inicio,ruta] [GAP=150] node _tools/pruebas/probar_doble_toque.js
   Por cada par de controles (A, B) que se ven a la vez en la pantalla: toque A (touchscreen.tap), GAP ms después toque B,
   y mira el registro de clics:
     · B llegó: hubo un clic adentro de B;
     · B perdido: el toque no se convirtió en clic sobre B (cayó en otra cosa, o no llegó).
   Además, de cada A: del toque al clic y del clic al primer cuadro pintado (lo que tarda en «responder»).
   Sale con 1 si se perdió algún B. */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html';
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
const GAP = Number(process.env.GAP || 150);
const NO = /pagar|cobrar|guard|borrar|eliminar|deshacer|confirmar|recib[ií]|entreg|cancelar|anular|mover|cargar|contar|ajust|nuevo|\+|salir|cerrar sesi|llamar|whatsapp|compartir|descargar|subir|foto/i;
/* Cada pantalla: cómo entrar, cuándo está lista y qué controles se tocan. */
const PANT = [
  ['inicio', `window.scrollTo(0,0); go('inicio')`, `!!document.querySelector('#p-inicio button, #p-inicio [onclick]')`,
    '#p-inicio button, #p-inicio [onclick], #p-inicio summary'],
  ['ruta', `go('ruta'); setTimeout(function(){ try{ switchTab('armado'); }catch(e){} },300)`, `!!document.querySelector('#pg-ruta .tab')`,
    '#pg-ruta .tab'],
];
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES_ADMIN, 'utf8'));
  /* CPU=4 → Chrome con la CPU frenada 4 veces (lo más parecido a un iPhone que se puede medir acá: WebKit no deja frenarla). */
  const CPU = Number(process.env.CPU || 0);
  const br = CPU ? await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }) : await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now(),dueno:true}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){}; window.prompt=function(){return null;};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(); var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();
    window.__clics=[];
    document.addEventListener('click',function(e){ var q=e.target&&e.target.closest?e.target.closest('[data-qa]'):null;
      var c={t:performance.now(),qa:q?q.getAttribute('data-qa'):'',tag:(e.target&&e.target.tagName)||''}; window.__clics.push(c);
      requestAnimationFrame(function(){ setTimeout(function(){ c.pinta=performance.now(); },0); }); },true);
    window.__toques=[]; window.__ev=[];
    var _q=function(e){var q=e.target&&e.target.closest?e.target.closest('[data-qa]'):null;return (q?q.getAttribute('data-qa'):'-')+':'+String((e.target&&(e.target.className||e.target.tagName))||'').slice(0,24)+(e.target&&e.target.isConnected===false?'(fuera)':'');};
    ['touchstart','touchend','pointerdown','pointerup','click'].forEach(function(n){document.addEventListener(n,function(e){window.__ev.push(n+'@'+Math.round(performance.now())+' '+_q(e)+(e.defaultPrevented?' prev':''));},true);});
    document.addEventListener('touchstart',function(){ window.__toques.push(performance.now()); },true);`);
  const pg = await ctx.newPage();
  if (CPU) { const c = await ctx.newCDPSession(pg); await c.send('Emulation.setCPUThrottlingRate', { rate: CPU }); }
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && typeof SESSION !== 'undefined' && SESSION && SESSION.dueno, null, { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(4000);
  let perdidos = 0, pares = 0; const filas = [];
  for (const [nom, js, listo, sel] of PANT) {
    if (SOLO && SOLO.indexOf(nom.replace('↓', '')) < 0) continue;
    await pg.evaluate(() => { try { document.body.classList.remove('sb-open'); } catch (e) {} });
    await pg.evaluate(js);
    if (!(await pg.waitForFunction(listo, null, { timeout: 40000 }).then(() => true, () => false))) { perdidos++; console.log('  MAL  ' + nom + ': no cargó'); continue; }
    await pg.waitForTimeout(2500);
    /* Los controles que se ven en la primera pantalla, sin scrollear (A y B se tocan seguidos). */
    const cands = await pg.evaluate((a) => {
      const NO = new RegExp(a.no, 'i'), out = [];
      document.querySelectorAll(a.sel).forEach((e) => {
        if (out.length >= 8) return;
        const t = (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        if (!t || NO.test(t) || e.disabled) return;
        const r = e.getBoundingClientRect(); if (r.width < 20 || r.height < 20 || r.top < 60 || r.bottom > 830) return;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!hit || !(hit === e || e.contains(hit))) return;
        if (out.some((o) => o.t === t)) return;
        out.push({ t });
      });
      return out;
    }, { no: NO.source, sel });
    console.log(`  ${nom}: ${cands.length} controles · pares de a dos, el segundo ${GAP} ms después`);
    for (let i = 0; i + 1 < cands.length; i++) {
      const A = cands[i], B = cands[i + 1];
      await pg.evaluate(() => { try { document.body.classList.remove('sb-open'); } catch (e) {} try { if (typeof eqCerrar === 'function') eqCerrar(); } catch (e) {} });
      await pg.evaluate(js); await pg.waitForFunction(listo, null, { timeout: 20000 }).catch(() => {}); await pg.waitForTimeout(1800);
      /* Marcar A y B por su texto y tomar sus centros. */
      const pos = await pg.evaluate((a) => {
        document.querySelectorAll('[data-qa]').forEach((e) => e.removeAttribute('data-qa'));
        const busca = (t) => [].filter.call(document.querySelectorAll(a.sel), (x) => (x.innerText || x.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) === t && x.getBoundingClientRect().width > 0)[0];
        const ea = busca(a.A), eb = busca(a.B); if (!ea || !eb) return null;
        ea.setAttribute('data-qa', 'A'); eb.setAttribute('data-qa', 'B');
        const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
        window.__clics = []; window.__toques = []; window.__ev = [];
        return { ax: ra.left + ra.width / 2, ay: ra.top + ra.height / 2, bx: rb.left + rb.width / 2, by: rb.top + rb.height / 2 };
      }, { sel, A: A.t, B: B.t });
      if (!pos) { filas.push(`  --   ${nom} «${A.t}» → «${B.t}»: no los encontré a los dos`); continue; }
      const tab0 = await pg.evaluate(() => typeof cur !== 'undefined' ? cur : '');
      await pg.touchscreen.tap(pos.ax, pos.ay);
      await pg.waitForTimeout(GAP);
      const ant = await pg.evaluate((p) => { const e = document.querySelector('[data-qa="B"]'); const r = e && e.isConnected ? e.getBoundingClientRect() : null;
        return { tab: typeof cur !== 'undefined' ? cur : '', mov: r ? Math.round(Math.hypot(r.left + r.width / 2 - p.bx, r.top + r.height / 2 - p.by)) : -1 }; }, pos);
      await pg.touchscreen.tap(pos.bx, pos.by);
      await pg.waitForTimeout(1500);
      const r = await pg.evaluate(() => ({ c: window.__clics, n: window.__toques.length, t0: window.__toques[0], ev: window.__ev }));
      if (process.env.DEBUG) console.log('     ' + r.ev.join(' | ') + ' · tab ' + (await pg.evaluate(() => (typeof cur !== 'undefined' ? cur : '?') + ' ' + ((document.querySelector('.pg.on') || {}).id || ''))));
      pares++;
      const ca = r.c.filter((x) => x.qa === 'A')[0], cb = r.c.filter((x) => x.qa === 'B')[0];
      const okB = !!cb;
      /* Si A llevó a otra pantalla, B cae en la pantalla nueva: no es un toque perdido (es lo que tiene que pasar). Si A
         desplegó algo y B se corrió de abajo del dedo, se cuenta aparte: es un salto de contenido, no el hilo trabado. */
      const navego = ant.tab !== tab0, movio = !navego && (ant.mov < 0 || ant.mov > 8);
      if (!okB && !navego && !movio) perdidos++;
      if (!okB && (navego || movio)) { filas.push(`  --   ${nom.padEnd(6)} «${A.t}» → «${B.t}»  ${navego ? 'A llevó a ' + ant.tab + ': B cae en esa pantalla' : 'A corrió a B ' + ant.mov + ' px (se desplegó algo)'}`); pares++; continue; }
      const aRes = ca ? `A toque→clic ${Math.round(ca.t - r.t0)} ms, pinta ${ca.pinta ? Math.round(ca.pinta - ca.t) : '?'} ms` : 'A sin clic';
      filas.push(`  ${okB ? 'ok  ' : 'MAL '} ${nom.padEnd(6)} «${A.t}» → «${B.t}»  ${aRes} · B ${okB ? 'llegó' : 'PERDIDO (' + r.c.length + ' clics, ' + r.n + ' toques)'}`);
    }
  }
  filas.forEach((f) => console.log(f));
  console.log(`\n  ${pares - perdidos} de ${pares} segundos toques llegaron (gap ${GAP} ms)`);
  await br.close();
  process.exit(perdidos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
