/* ¿LA FICHA DEL PEDIDO RESPONDE AL DEDO? (21/11/2026, Tadeo 18:49: «ni scrollear ni botones. Nada de nada»). WebKit 390.
   PW=<playwright-core> SES=<sesion.json> BASE=http://localhost:8155/app.html PED=Home:2533 node ficha_toque_webkit.js
   Abre la ficha (con «Más opciones» abierto, como en la captura) y mide:
     · si el hilo de la página contesta (un bucle de JS congela todo: scroll y botones);
     · qué hay ENCIMA del centro de la ficha y de cada botón de abajo (una capa invisible se come los toques);
     · que un toque de verdad (touchscreen.tap) en «Copiar el detalle» haga algo, y que el dedo scrollee el cuerpo.
   Sesión real en SOLO LECTURA. */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8155/app.html';
const [PH, PN] = String(process.env.PED || 'Home:2533').split(':');
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const conTope = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('la página no contesta en ' + ms + ' ms')), ms))]);
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){}; window.__copiado=[];
    try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){window.__copiado.push(String(t));return Promise.resolve();}},configurable:true});}catch(e){}
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^tienda_cuentas$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage();
  const errores = []; pg.on('pageerror', (e) => errores.push(String(e.message).slice(0, 160)));
  console.log('\n=== Ficha con el dedo · ' + PH + ' #' + PN + ' · ' + BASE.split('/').pop() + ' ===');
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(([h, n]) => typeof window.go === 'function' && window.D && (D.pedidos || []).some((x) => x.h === h && String(x.n) === n && String(x.grp || '').trim()), [PH, PN], { timeout: 150000 }).catch(() => {});
  await pg.evaluate(() => go('pedidos')); await pg.waitForTimeout(1500);
  await pg.evaluate(([h, n]) => { const p = (D.pedidos || []).filter((x) => x.h === h && String(x.n) === n)[0]; openOrdDetail(p.h, String(p.n), Number(p.r) || 0); }, [PH, PN]);
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { const m = document.getElementById('ordMas'); if (m) m.open = true; });
  await pg.waitForTimeout(4000);   /* que lleguen las lecturas de atrás (comensales, alias, cuadro…) */
  /* 1. El hilo contesta, cinco veces seguidas a lo largo de 5 s. */
  let vivo = true, peor = 0;
  for (let i = 0; i < 5; i++) { const t0 = Date.now(); try { await conTope(pg.evaluate(() => 1), 4000); } catch (e) { vivo = false; break; } peor = Math.max(peor, Date.now() - t0); await pg.waitForTimeout(1000); }
  chk('la página contesta (sin bucle de JS)', vivo, 'peor ' + peor + ' ms');
  if (!vivo) { console.log('\n' + ok + ' ok · ' + mal + ' mal'); process.exit(1); }
  /* 2. Qué hay encima. */
  const E = await pg.evaluate(() => {
    const d = (x, y) => { const t = document.elementFromPoint(x, y); if (!t) return '(nada)'; const dr = document.getElementById('ordDrawer'); return (dr && dr.contains(t) ? 'FICHA ' : 'AFUERA ') + (t.id ? '#' + t.id : '') + '.' + String(t.className || t.tagName).split(' ')[0]; };
    const btns = [].slice.call(document.querySelectorAll('.ord-drawer.open .ord-actions button'));
    return { centro: d(195, 500), arriba: d(195, 300), botones: btns.map((b) => { const r = b.getBoundingClientRect(); return b.textContent.trim().slice(0, 22) + ' → ' + d(r.left + r.width / 2, r.top + r.height / 2); }) };
  });
  console.log('  encima: centro ' + E.centro + ' · arriba ' + E.arriba); E.botones.forEach((b) => console.log('         ' + b));
  chk('en el centro de la ficha está la ficha', /^FICHA/.test(E.centro), E.centro);
  chk('cada botón de abajo recibe su toque', E.botones.length > 0 && E.botones.every((b) => /→ FICHA/.test(b)), E.botones);
  /* 3. El dedo: scrollear el cuerpo y tocar «Copiar el detalle». */

  /* WebKit móvil de Playwright no tiene deslizamiento ni rueda. Lo que decide en el iPhone si el dedo scrollea: que el
     cuerpo tenga recorrido y overflow auto, y que ni él ni nadie arriba tenga touch-action:none o pointer-events:none. */
  const T = await pg.evaluate(() => { const b = document.querySelector('.ord-drawer.open .ord-body'); if (!b) return { falta: true };
    const malos = []; for (let x = b; x; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.touchAction === 'none' || cs.pointerEvents === 'none') malos.push((x.id ? '#' + x.id : x.tagName.toLowerCase()) + '.' + String(x.className || '').split(' ')[0] + ' touch=' + cs.touchAction + ' pe=' + cs.pointerEvents); }
    return { recorrido: b.scrollHeight - b.clientHeight, oy: getComputedStyle(b).overflowY, malos, html: document.documentElement.className.slice(0, 80), body: document.body.className.slice(0, 80) }; });
  console.log('  scroll: ' + JSON.stringify(T));
  chk('el cuerpo de la ficha se puede scrollear con el dedo', !T.falta && T.recorrido > 0 && /auto|scroll/.test(T.oy) && T.malos.length === 0, T);
  const b = await pg.evaluate(() => { const x = [].slice.call(document.querySelectorAll('.ord-drawer.open .ord-actions button')).filter((b) => /Copiar el detalle/.test(b.textContent))[0]; if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (b) { await pg.touchscreen.tap(b.x, b.y); await pg.waitForTimeout(800); }
  chk('un toque en «Copiar el detalle» copia', (await pg.evaluate(() => window.__copiado.length)) > 0);
  chk('sin errores de JS', errores.length === 0, errores.slice(0, 4));
  await pg.screenshot({ path: process.env.FOTO || 'ficha_toque.png' });
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
