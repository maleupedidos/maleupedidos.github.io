/* EL BENEFICIO DE EMPLEADO (15/11/2026, 724). WebKit 390×844, sesiones temporales, toda escritura cortada.
 *
 *   PW=<playwright-core> SES_ADMIN=<ses tadeo admin> SES_EQUIPO=<ses santos equipo> [OUT=<carpeta>] node _tools/pruebas/probar_beneficio.js
 *
 *   · + PEDIDO: con «Santos Bullrich» (o su teléfono) el % al pedido entra solo y dice «Beneficio empleado −15%»; el admin lo
 *     saca y lo vuelve a poner; con otro cliente se va solo
 *   · la ficha de #2454 dice «Beneficio empleado −15% · aplicado»
 *   · Ajustes › Usuarios: santos con «Beneficio» Sí y su teléfono; guardar NO manda el PIN
 *   · como santos (equipo): el chip sin «Sacar», y una tarjeta de Cobranza suya dice «lo cobran Tadeo o Lucas»
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html', OUT = process.env.OUT || os.tmpdir();
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const INIT = (usuario, rol, ses) => String.raw`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'` + usuario + `',rol:'` + rol + String.raw`',ts:Date.now()}));
  localStorage.setItem('mc_sbses',` + JSON.stringify(JSON.stringify({ u: usuario, url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true })) + String.raw`);}catch(e){}
  window.confirm=function(){return false;}; window.__posts=[];
  (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(),r=/\/rest\/v1\/rpc\/([a-z0-9_]+)/.exec(s);
    if(m!=='GET'&&m!=='HEAD'&&!/auth\/v1\/token/.test(s)&&(/script\.google\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1]))){
      var b={};try{b=JSON.parse((x&&x.body)||'{}');}catch(e){} window.__posts.push({rpc:r?r[1]:s,body:b}); return Promise.resolve(new Response('{"ok":false,"err":"cortado por la prueba"}',{status:200,headers:{'Content-Type':'application/json'}}));}
    return f.apply(this,arguments);};})();`;
const foto = async (pg, nom) => {
  await pg.evaluate(() => Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(w + ' 16px Montserrat'))).then(() => document.fonts.ready)).catch(() => {});
  await pg.waitForFunction(() => document.getAnimations().filter((x) => x.playState === 'running').length === 0, null, { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(400); const f = path.join(OUT, nom + '.png'); await pg.screenshot({ path: f }); console.log('       ' + f);
};
const masPedido = async (pg) => {
  await pg.evaluate(() => { go('ruta'); });
  await pg.waitForFunction(() => typeof window.switchTab === 'function' && document.getElementById('npNombre'), null, { timeout: 60000 });
  await pg.evaluate(() => { switchTab('nuevo'); }); await pg.waitForTimeout(2500);
  await pg.waitForFunction(() => window._npBenef && window._npBenef.ok, null, { timeout: 20000 }).catch(() => {});
};
(async () => {
  const br = await pw.webkit.launch();
  for (const [rol, sesF, usuario] of [['admin', process.env.SES_ADMIN, 'tadeo'], ['equipo', process.env.SES_EQUIPO, 'santos']]) {
    console.log('\n== ' + rol + ' (' + usuario + ') ==\n');
    const ses = JSON.parse(fs.readFileSync(sesF, 'utf8'));
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await ctx.addInitScript(INIT(usuario, rol, ses));
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
    try {
      await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => typeof window.go === 'function' && window.D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 90000 });
      await pg.waitForTimeout(2000);
      await masPedido(pg);
      await pg.fill('#npNombre', 'Santos Bullrich'); await pg.waitForTimeout(500);
      let b = await pg.evaluate(() => ({ vis: !document.getElementById('npBenef').hidden, txt: document.getElementById('npBenef').textContent, pct: document.getElementById('npGlobalPct').value, sacar: !!document.querySelector('#npBenef .np-benef-x') }));
      chk('«Santos Bullrich» → «Beneficio empleado −15%» y el % al pedido en 15', b.vis && /Beneficio empleado −15%/.test(b.txt) && b.pct === '15', b);
      chk(rol === 'admin' ? 'el admin lo puede sacar' : 'el equipo no lo puede sacar', rol === 'admin' ? b.sacar : !b.sacar, b);
      await pg.evaluate(() => { const d = document.getElementById('npBenef'); d.scrollIntoView({ block: 'center' }); });
      await foto(pg, 'mas_pedido_beneficio_' + rol + '_390');
      if (rol === 'admin') {
        await pg.tap('#npBenef .np-benef-x'); await pg.waitForTimeout(300);
        b = await pg.evaluate(() => ({ txt: document.getElementById('npBenef').textContent, pct: document.getElementById('npGlobalPct').value }));
        chk('«Sacar»: el % vuelve a vacío y ofrece «Volver a ponerlo»', b.pct === '' && /Volver a ponerlo/.test(b.txt), b);
        await pg.tap('#npBenef .np-benef-x'); await pg.waitForTimeout(300);
        chk('«Volver a ponerlo»: 15 de nuevo', (await pg.evaluate(() => document.getElementById('npGlobalPct').value)) === '15');
        await pg.fill('#npNombre', 'Rodrigo Amadeo'); await pg.waitForTimeout(400);
        b = await pg.evaluate(() => ({ vis: !document.getElementById('npBenef').hidden, pct: document.getElementById('npGlobalPct').value }));
        chk('con otro cliente se va solo (y el % también)', !b.vis && b.pct === '', b);
        await pg.fill('#npNombre', 'Tatu'); await pg.fill('#npTel', '11 2388-3544'); await pg.waitForTimeout(400);
        chk('por el TELÉFONO también («Tatu» + 11 2388-3544)', (await pg.evaluate(() => document.getElementById('npGlobalPct').value)) === '15');
        try { await pg.evaluate(() => npReset()); } catch (x) {}
        // La ficha de #2454
        await pg.evaluate(() => { openOrdDetail('Home', '2454', 0); }); await pg.waitForTimeout(2500);
        const f = await pg.evaluate(() => (document.querySelector('#ordDrawer .ofx-benef') || {}).textContent || '');
        chk('la ficha de #2454: «Beneficio empleado −15% · Santos Bullrich · aplicado»', /Beneficio empleado −15%/.test(f) && /aplicado/.test(f), f);
        await pg.evaluate(() => { const e = document.querySelector('#ordDrawer .ofx-benef'); if (e) e.scrollIntoView({ block: 'center' }); });
        await foto(pg, 'ficha_2454_beneficio_390');
        await pg.evaluate(() => closeOrdDetail());
        // Ajustes › Usuarios
        await pg.evaluate(() => { go('ajustes'); setTimeout(function () { try { ajGo('usuarios'); } catch (e) {} }, 800); });
        await pg.waitForFunction(() => [].some.call(document.querySelectorAll('.aj-row.u'), (r) => r.getAttribute('data-orig') === 'santos'), null, { timeout: 40000 }).catch(() => {});
        const a = await pg.evaluate(() => { const r = [].find.call(document.querySelectorAll('.aj-row.u'), (x) => x.getAttribute('data-orig') === 'santos'); if (!r) return null;
          return { ben: r.querySelector('[data-k="beneficio"]').value, tel: r.querySelector('[data-k="telefono"]').value, rol: r.querySelector('[data-k="rol"]').value }; });
        chk('Ajustes: santos con «Beneficio» Sí, su teléfono y rol equipo', a && a.ben === 'si' && a.tel === '1123883544' && a.rol === 'equipo', a);
        await pg.evaluate(() => { window.__posts = []; const r = [].find.call(document.querySelectorAll('.aj-row.u'), (x) => x.getAttribute('data-orig') === 'santos'); r.querySelector('.aj-actions .aj-btn').click(); });
        await pg.waitForTimeout(1500);
        const po = await pg.evaluate(() => window.__posts.filter((x) => /usuario_set/.test(x.rpc)).map((x) => x.body));
        const body = po[0] && (po[0].p || po[0]);
        chk('guardar a santos NO manda el PIN (y sí beneficio y teléfono)', !!body && !('pin' in body) && body.beneficio === true && body.telefono === '1123883544', po);
      } else {
        const mio = await pg.evaluate(() => ({ mio: _rutEsMio('Santos Bullrich', ''), porTel: _rutEsMio('Tatu', '1123883544'), otro: _rutEsMio('Rodrigo Amadeo', ''),
          card: _cobroCardHTML({ c: 'Santos Bullrich', t: '1123883544', h: 'Home', id: '9999', $: 1000, es: 'Entregado', sub: 1000 }, 0) }));
        chk('Cobranza: una tarjeta suya dice «Es un pedido tuyo: lo cobran Tadeo o Lucas», sin «Cobrar»', mio.mio && mio.porTel && !mio.otro && /lo cobran Tadeo o Lucas/.test(mio.card) && !/cobro-btn-cobrado/.test(mio.card), { mio: mio.mio, porTel: mio.porTel, otro: mio.otro });
      }
      chk('ni un error de la página', errs.filter((x) => !/mapaMap|extend/.test(x)).length === 0, errs.slice(0, 3));
    } catch (x) { console.log('  reventó: ' + (x && x.stack || x)); mal++; }
    await ctx.close();
  }
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  process.exitCode = mal ? 1 : 0;
})();
