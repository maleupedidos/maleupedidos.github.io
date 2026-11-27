/* + PEDIDO: UN PEDIDO HOME COMÚN, ANTES Y DESPUÉS, A 390 (27/11/2026). Mide toques y tiempo con los datos reales.
 *   PW=<playwright-core> SBSES=<sesion.json> BASE=http://localhost:8155/app.html [USUARIO=luqui] node medir_np_home_comun.js
 * SOLO LECTURA: la guarda de sbses_guarda.js corta toda escritura; GUARDAR no se toca (se cuenta como 1 toque).
 * Elige una casa real de Home con varios pedidos, y hace el mismo pedido de dos maneras:
 *   ANTES  buscar el cliente + por cada producto de su último pedido: buscador, tipear, «+» (las veces que lleve).
 *   AHORA  buscar el cliente + «Repetir su último pedido».
 * Las dos con «Sale de» (Lucas lo elige) y GUARDAR. Cada toque comprueba que debajo del dedo esté el control. */
'use strict';
const pw = require(process.env.PW || 'playwright-core');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', U = process.env.USUARIO || 'luqui';
let ok = 0, mal = 0;
const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 500))); return !!c; };
const T = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const br = await pw.chromium.launch();
  const ctx = await br.newContext({ timezoneId: 'America/Argentina/Buenos_Aires', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:${JSON.stringify(U)},rol:'admin',nombre:'Lucas Moresco',ts:Date.now()}));localStorage.removeItem('maleu_np_cola');localStorage.setItem('maleu_np_footer_collapsed','0');}catch(e){}
    window.confirm=function(){return true;}; window.alert=function(){};` + sbses(process.env.SBSES, U));
  const pg = await ctx.newPage(); const err = [];
  pg.on('pageerror', (e) => err.push(String(e.message).slice(0, 200)));
  let toques = 0;
  const tocar = async (sel, txt) => {
    const b = await pg.evaluate(([sel, txt]) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!txt || x.textContent.indexOf(txt) >= 0); })[0];
      if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y);
      return { x, y, es: !!(h && (h === e || e.contains(h) || h.contains(e))) }; }, [sel, txt || '']);
    if (!b || !b.es) { console.log('    no pude tocar ' + sel + ' ' + (txt || '') + ' ' + JSON.stringify(b)); return false; }
    await pg.touchscreen.tap(b.x, b.y); toques++; await T(250); return true;
  };
  const tipear = async (sel, s) => { await pg.fill(sel, ''); await pg.type(sel, s, { delay: 40 }); toques++; await T(400); };
  try {
    await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.go === 'function', null, { timeout: 90000 });
    await T(2500);
    await pg.evaluate(() => { go('ruta'); });
    await pg.waitForFunction(() => typeof window.switchTab === 'function' && typeof window.npRepetirPedir === 'function', null, { timeout: 90000 });
    await pg.evaluate(() => switchTab('nuevo'));
    /* Las variables de la sub-app que quedan en window son copias (memoria «las globales de una sub-app en window son
       copias»): los clientes se leen de lo que arma el desplegable (`__matches`), que es el objeto de verdad. */
    await pg.waitForFunction(() => document.querySelectorAll('#npProductos [onclick^="npQty("]').length > 10, null, { timeout: 90000 });
    let cands = [];
    for (let k = 0; k < 40 && cands.length < 25; k++) {
      const letras = ['ma', 'an', 'ar', 'la', 'ro', 'ca', 'pa', 'ju', 'so', 'va'][k % 10];
      cands = cands.concat(await pg.evaluate((q) => { const i = document.getElementById('npNombre'); i.value = q; npFiltrarClientes(); const dd = document.getElementById('npClientesDropdown');
        return ((dd && dd.__matches) || []).filter((c) => c.pedidos >= 4 && String(c._st || '').length >= 10 && c.lote && /estancias/i.test(c.barrio || '') && !/prueba/i.test(c.nombre))
          .map((c) => ({ n: c.nombre, tel: c.tel, sub: c.subBarrio, lote: c.lote, barrio: c.barrio })); }, letras));
      if (k >= 9 && !cands.length) await T(2000);
    }
    await pg.evaluate(() => { npReset(); });
    /* Una casa de Home con varios pedidos, teléfono y lote, cuyo último pedido tenga 2 o más productos que no son carne. */
    let cli = null, ult = null;
    for (const c of cands) {
      const d = await pg.evaluate((c) => _baseRpc('np_ultimo_pedido_pantalla', { p: { tel: c.tel, casa: { sub: c.sub, barrio: c.barrio, lote: c.lote } } }).catch((e) => ({ err: String(e.message || e) })), c);
      if (d && d.hay && (d.items || []).filter((i) => !i.kg).length >= 2) { cli = c; ult = d; break; }
    }
    if (!chk('una casa real con último pedido de 2+ productos', !!cli, cands.length)) throw new Error('sin casa');
    console.log('    casa: ' + cli.n.split(' ')[0] + '… · último ' + ult.h + ' #' + ult.n + ' (' + ult.dia + ') · ' + ult.items.map((i) => i.q + ' ' + i.a).join(', '));
    const items = await pg.evaluate((u) => u.items.filter((i) => !i.kg).map((i) => { const p = NP_CAT_FLAT.filter((x) => x.abbr === i.a)[0]; return p ? { id: p.id, n: p.n, q: Math.max(1, Math.round(i.q)) } : null; }).filter(Boolean), ult);
    const buscarCliente = async () => {
      await tocar('#npNombre'); await tipear('#npNombre', cli.n.slice(0, 6));
      return tocar('#npClientesDropdown [onclick^="npSelectCliente"], #npClientesDropdown .np-dd-item', cli.n.split(' ')[0]);
    };
    const reset = async () => { await pg.evaluate(() => { npReset(); window.scrollTo(0, 0); }); await T(400); toques = 0; };

    /* ANTES: producto por producto con el buscador. */
    await reset(); let t0 = Date.now();
    chk('ANTES: elegí el cliente de la lista', await buscarCliente());
    console.log('    después de elegir el cliente: ' + await pg.evaluate(() => [].filter.call(document.querySelectorAll('[id^="npQty_"]'), (x) => Number(x.textContent) > 0).map((x) => x.id + '=' + x.textContent).join(',')));
    for (const it of items) {
      await tocar('#npBuscarProd'); await tipear('#npBuscarProd', it.n.split(' ').slice(0, 2).join(' '));
      for (let k = 0; k < it.q; k++) { await tocar('#npProd_' + it.id + ' [onclick*="npQty(' + it.id + ',1)"]'); console.log('    ' + it.n + ' toque ' + (k + 1) + ' → ' + await pg.evaluate((id) => (document.getElementById('npQty_' + id) || {}).textContent, it.id)); }
    }
    await pg.evaluate(() => { const b = document.getElementById('npBuscarProd'); b.value = ''; npFiltrarProd(); });
    await tocar('.np-dep-op[data-dep="ustariz"]');
    toques++;   /* GUARDAR, sin tocarlo */
    const antes = { toques, ms: Date.now() - t0, cart: await pg.evaluate(() => [].filter.call(document.querySelectorAll('[id^="npQty_"]'), (x) => Number(x.textContent) > 0).map((x) => x.id.slice(6) + 'x' + x.textContent).sort().join(',')) };
    console.log('    ANTES: ' + antes.toques + ' toques · ' + (antes.ms / 1000).toFixed(1) + ' s · ' + antes.cart);

    /* AHORA: «Repetir su último pedido». */
    await reset(); t0 = Date.now();
    chk('AHORA: elegí el cliente de la lista', await buscarCliente());
    const tR = Date.now();
    const apareció = await pg.waitForFunction(() => { const b = document.getElementById('npRepetir'); return b && !b.hidden && b.querySelector('.np-repetir-btn'); }, null, { timeout: 15000 }).then(() => true, () => false);
    const msRep = Date.now() - tR;
    chk('aparece «Repetir su último pedido» (' + msRep + ' ms)', apareció);
    await tocar('.np-repetir-btn');
    await tocar('.np-dep-op[data-dep="ustariz"]');
    toques++;   /* GUARDAR */
    const ahora = { toques, ms: Date.now() - t0, cart: await pg.evaluate(() => [].filter.call(document.querySelectorAll('[id^="npQty_"]'), (x) => Number(x.textContent) > 0).map((x) => x.id.slice(6) + 'x' + x.textContent).sort().join(',')) };
    console.log('    AHORA: ' + ahora.toques + ' toques · ' + (ahora.ms / 1000).toFixed(1) + ' s · ' + ahora.cart);
    chk('el mismo carrito de las dos maneras', antes.cart === ahora.cart, { antes: antes.cart, ahora: ahora.cart });
    chk('menos toques', ahora.toques < antes.toques, { antes: antes.toques, ahora: ahora.toques });
    const bloq = await pg.evaluate(() => (window.__bloqueados || []).filter((b) => /directo|altaPedido|pedidoDeposito|apps\.script|macros/.test(b))   /* tienda_cuentas, catalogo_ruta y mi_deposito son lecturas sin el sufijo _pantalla */);
    chk('no se escribió nada (la guarda no cortó ninguna escritura de + PEDIDO)', bloq.length === 0, bloq);
    chk('cero errores de JavaScript', err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  await br.close(); process.exit(mal ? 1 : 0);
})();
