/* LA LÍNEA DE LA JUNTADA PINTADA OCULTA (23/11/2026, auditoría). COBRANZA se repinta mientras estás en otra tab (+ PEDIDO):
   la línea «Pagaron 4 de 5 · falta Benja Villanueva $18.000» no tenía ancho y quedaba la versión más larga, cortada
   (92 px de más a 393). Con datos reales, solo lectura (toda escritura se corta), WebKit a 393 con toque.
     PW=<playwright-core> SES=<ses.json de sesion_prueba.py> BASE=<url del app.html> node probar_juntada_oculta.js */
'use strict';
const pw = require(process.env.PW || 'playwright-core'); const fs = require('fs');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8')), BASE = process.env.BASE || 'http://localhost:8155/app.html';
const T = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await pw.webkit.launch(); const ctx = await br.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',${JSON.stringify(JSON.stringify({ usuario: 'tadeo', rol: 'admin', ts: Date.now() }))});
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$/.test(r[1])))return Promise.resolve(new Response('{"ok":false,"err":"cortado"}',{status:200}));
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof go === 'function' && typeof SESSION !== 'undefined' && !!SESSION, null, { timeout: 90000 });
  await T(5000); await pg.evaluate(() => go('ruta')); await T(3000);
  await pg.evaluate(() => switchTab('cobros')); await T(6000);
  const medir = () => pg.evaluate(() => [].map.call(document.querySelectorAll('#pg-ruta .com-desp-r[data-alt]'), (r) => ({ t: r.textContent.trim(), w: r.clientWidth, sobra: r.scrollWidth - r.clientWidth })).filter((x) => x.w > 0));
  const a = await medir();
  console.log('a la vista: ' + a.length + ' líneas · cortadas ' + a.filter((x) => x.sobra > 1).length);
  /* Se va a + PEDIDO y COBRANZA se repinta oculta; después vuelve. */
  await pg.evaluate(() => switchTab('nuevo')); await T(1500);
  await pg.evaluate(() => { try { renderCobrosFromServer(); } catch (e) { try { renderCobros(); } catch (e2) {} } }); await T(1500);
  await pg.evaluate(() => switchTab('cobros')); await T(1500);
  const b = await medir();
  const cort = b.filter((x) => x.sobra > 1);
  console.log('después de repintar oculta: ' + b.length + ' líneas · cortadas ' + cort.length + (cort.length ? ' · ' + JSON.stringify(cort.slice(0, 3)) : ''));
  console.log(b.length && !cort.length ? 'OK' : (b.length ? 'MAL' : 'SIN JUNTADAS A LA VISTA (no prueba nada)'));
  if (errs.length) console.log('errores ' + JSON.stringify(errs.slice(0, 3)));
  await br.close(); process.exit(b.length && !cort.length ? 0 : 1);
})();
