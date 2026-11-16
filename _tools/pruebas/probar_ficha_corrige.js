/* LA FICHA DEL PEDIDO CORRIGE EL PEDIDO, Y EL ROL «EQUIPO» (15/11/2026, 722). WebKit 390×844, sesiones temporales,
 * toda escritura cortada: se toca como una persona y no sale nada.
 *
 *   PW=<playwright-core> SES_ADMIN=<ses tadeo admin> SES_EQUIPO=<ses santos equipo> [OUT=<carpeta>] node _tools/pruebas/probar_ficha_corrige.js
 *
 * Como tadeo y como santos («equipo»), sobre un pedido de Home entregado y cobrado que no es de Santos:
 *   · «Más opciones» trae «Cambiar fecha y hora del cobro» y «Deshacer el cobro»; la botonera, «Editar productos» (no manda a Pedidos)
 *   · deshacer pide el nombre del cliente escrito tal cual y el motivo: sin eso no sale nada
 *   · el equipo NO ve costo ni margen en la ficha, ni «Lo consiguió»; la base le niega Ventas (403, nunca «sesión vencida»)
 *   · editar un entregado (#2487) dentro de la ficha pide motivo y deja elegir el depósito
 *   · Cobranza del equipo muestra lo que falta cobrar (#2454 y los $17.000 de #2487)
 * Capturas a 390 en OUT (o la carpeta temporal).
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
      window.__posts.push(r?r[1]:s); return Promise.resolve(new Response('{"ok":false,"err":"cortado por la prueba"}',{status:200,headers:{'Content-Type':'application/json'}}));}
    return f.apply(this,arguments);};})();`;
const foto = async (pg, nom) => {
  await pg.evaluate(() => Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(w + ' 16px Montserrat'))).then(() => document.fonts.ready)).catch(() => {});
  await pg.waitForFunction(() => document.getAnimations().filter((x) => x.playState === 'running').length === 0, null, { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(400);
  const f = path.join(OUT, nom + '.png'); await pg.screenshot({ path: f }); console.log('       ' + f);
};
(async () => {
  const br = await pw.webkit.launch();
  let clave = null;
  for (const [rol, sesF, usuario] of [['admin', process.env.SES_ADMIN, 'tadeo'], ['equipo', process.env.SES_EQUIPO, 'santos']]) {
    console.log('\n== ' + rol + ' (' + usuario + ') ==\n');
    const ses = JSON.parse(fs.readFileSync(sesF, 'utf8'));
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await ctx.addInitScript(INIT(usuario, rol, ses));
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
    try {
      await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => typeof window.openOrdDetail === 'function' && window.D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 90000 });
      await pg.waitForTimeout(2500);
      if (!clave) clave = await pg.evaluate(() => { const p = D.pedidos.filter((x) => x.h === 'Home' && x.es === 'Entregado' && x.ep === 'Cobrado' && !/santos|bullrich/i.test(x.c || '')).slice(-1)[0]; return p ? [p.h, p.n, p.r || 0, p.c] : null; });
      await pg.evaluate((k) => { openOrdDetail(k[0], k[1], k[2]); }, clave); await pg.waitForTimeout(1200);
      await pg.evaluate(() => { const d = document.getElementById('ordMas'); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); } });
      await pg.waitForTimeout(400);
      const f = await pg.evaluate(() => { const b = document.getElementById('ordBody') || document.getElementById('ordDrawer'); const t = b ? b.innerText : '';
        return { botones: [].map.call(document.querySelectorAll('#ordDrawer .ord-btn'), (x) => x.textContent.trim()), costo: /Costo\s*\$|Margen bruto/.test(t), mg: !!document.querySelector('#ordDrawer .ofx-mg') }; });
      chk('«Más opciones» con «Cambiar fecha y hora del cobro» y «Deshacer el cobro» (' + clave[3] + ', Home #' + clave[1] + ')', f.botones.indexOf('Cambiar fecha y hora del cobro') >= 0 && f.botones.indexOf('Deshacer el cobro') >= 0, f.botones);
      chk('«Editar productos» en la ficha, y ningún «Editar en Pedidos»', f.botones.indexOf('Editar productos') >= 0 && f.botones.indexOf('Editar en Pedidos') < 0, f.botones);
      if (rol === 'admin') chk('el admin ve costo y margen, y «Lo consiguió…»', f.mg && f.botones.indexOf('Lo consiguió…') >= 0, f);
      else chk('el equipo NO ve costo ni margen, ni «Lo consiguió…»', !f.costo && !f.mg && f.botones.indexOf('Lo consiguió…') < 0, f);
      await foto(pg, 'ficha_mas_' + rol + '_390');
      // Deshacer: el nombre y el motivo
      await pg.evaluate(() => { [].find.call(document.querySelectorAll('#ordDrawer .ord-btn'), (x) => x.textContent.trim() === 'Deshacer el cobro').click(); });
      await pg.waitForTimeout(400);
      await pg.fill('#descobNom', 'otro nombre'); await pg.fill('#descobMot', 'prueba de la ficha');
      await pg.evaluate(() => { window.__posts = []; }); await pg.tap('#descobOk'); await pg.waitForTimeout(500);
      chk('con otro nombre no sale nada', (await pg.evaluate(() => window.__posts.length)) === 0 && !!(await pg.$('#descobOv')));
      await pg.fill('#descobNom', clave[3]); await pg.fill('#descobMot', ''); await pg.tap('#descobOk'); await pg.waitForTimeout(500);
      chk('sin motivo tampoco', (await pg.evaluate(() => window.__posts.length)) === 0);
      await pg.fill('#descobMot', 'prueba de la ficha (cortada)'); await foto(pg, 'ficha_deshacer_' + rol + '_390');
      await pg.tap('#descobOk'); await pg.waitForTimeout(1500);
      chk('con el nombre y el motivo sale la orden (a pedido_descobrar_directo, cortada por la prueba)', (await pg.evaluate(() => window.__posts.join())).indexOf('descobrar') >= 0, await pg.evaluate(() => window.__posts));
      await pg.evaluate(() => { const o = document.getElementById('descobOv'); if (o) o.remove(); });
      // Fecha y hora del cobro
      await pg.evaluate((k) => { openOrdDetail(k[0], k[1], k[2]); }, clave); await pg.waitForTimeout(800);
      await pg.evaluate((k) => cobroCambiar(k[0], k[1], k[2]), clave); await pg.waitForTimeout(400);
      chk('el cuadro de la fecha y hora del cobro, con día y hora', !!(await pg.$('#cobFechaD')) && !!(await pg.$('#cobFechaH')));
      await foto(pg, 'ficha_cobro_fecha_' + rol + '_390');
      await pg.evaluate(() => { const o = document.getElementById('cobFechaOv'); if (o) o.remove(); });
      // Editar un entregado (#2487) dentro de la ficha
      await pg.evaluate(() => { openOrdDetail('Home', '2487', 0); }); await pg.waitForTimeout(1000);
      await pg.evaluate(() => _ordEditar('Home', '2487', 0));
      await pg.waitForFunction(() => !!document.getElementById('ordEd-Home-2487-mot'), null, { timeout: 30000 }).catch(() => {});
      const e = await pg.evaluate(() => ({ mot: !!document.getElementById('ordEd-Home-2487-mot'), dep: !!document.getElementById('ordEd-Home-2487-dep'), dentro: !!document.querySelector('#ordDrawer #ordEd-Home-2487 .ede-t') }));
      chk('#2487 se edita AHÍ en la ficha, con motivo' + (e.dep ? ' y depósito' : ''), e.mot && e.dentro, e);
      await pg.evaluate(() => { const m = document.getElementById('ordEd-Home-2487-mot'); if (m) m.scrollIntoView({ block: 'center' }); });
      await foto(pg, 'ficha_editar_entregado_' + rol + '_390');
      try { await pg.evaluate(() => closeOrdDetail()); } catch (x) {}
      if (rol === 'equipo') {
        const d = await pg.evaluate(() => ({ conCosto: D.pedidos.filter((p) => Number(p.co) > 0 || Number(p.mg) > 0).length, tabs: (SESSION && SESSION.tabs) || null }));
        chk('a la pantalla no le llega ni un costo ni un margen (' + d.conCosto + ' pedidos con costo)', d.conCosto === 0, d);
        const v = await pg.evaluate(() => _baseRpc('ventas_pantalla', {}).then((r) => 'pasó: ' + JSON.stringify(r).slice(0, 80), (er) => 'negado: ' + String(er && (er.message || er)).slice(0, 120)));
        chk('la base le niega Ventas (forbidden, no «sesión vencida»)', /^negado/.test(v) && !/authRequired|vencid/i.test(v), v);
        // Cobranza: lo que falta cobrar
        await pg.evaluate(() => { go('ruta'); });
        await pg.waitForFunction(() => typeof window.switchTab === 'function' && document.getElementById('cobrosContent'), null, { timeout: 60000 }).catch(() => {});
        await pg.evaluate(() => { try { switchTab('cobros'); } catch (x) {} }); await pg.waitForTimeout(4000);
        const c = await pg.evaluate(() => { const t = (document.getElementById('cobrosContent') || {}).innerText || ''; return { santos: /Santos Bullrich/.test(t), mercedes: /Mercedes Ust/.test(t), m17: /17\.000/.test(t) }; });
        chk('Cobranza de Tatu: #2454 (Santos Bullrich) y Mercedes con $17.000', c.santos && c.mercedes && c.m17, c);
        await pg.evaluate(() => { const el = [].find.call(document.querySelectorAll('#cobrosContent *'), (x) => x.children.length === 0 && /Mercedes Ust/.test(x.textContent)); if (el) el.scrollIntoView({ block: 'center' }); });
        await foto(pg, 'cobranza_equipo_mercedes_390');
        await pg.evaluate(() => { const el = [].find.call(document.querySelectorAll('#cobrosContent *'), (x) => x.children.length === 0 && /Santos Bullrich/.test(x.textContent)); if (el) el.scrollIntoView({ block: 'center' }); });
        await foto(pg, 'cobranza_equipo_santos_390');
      }
      chk('ni un error de la página', errs.filter((x) => !/mapaMap|extend/.test(x)).length === 0, errs.slice(0, 3));
    } catch (x) { console.log('  reventó: ' + (x && x.stack || x)); mal++; }
    await ctx.close();
  }
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  process.exitCode = mal ? 1 : 0;
})();
