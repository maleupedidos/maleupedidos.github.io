/* «LISTO» CON EL FOCO EN UN CAMPO, UN SOLO TOQUE (18/11/2026). Tadeo: en la ficha de Equipo, con Nombre/Apellido/Apodo
   abiertos, «Listo» había que tocarlo más de una vez. WebKit con perfil de iPhone (touch) o 1440 con mouse; la sesión del
   dueño, con todo cortado MENOS `equipo_dato_directo` (se escribe un apodo de prueba y se borra al final).
     PW=<playwright-core> SES_ADMIN=<ses.json> BASE=<url> [ANCHO=390] node _tools/pruebas/probar_listo_un_toque.js
   1) Ficha de Rufino › lápiz › foco en Apodo, se escribe, UN toque a «Listo»: los campos se cierran y el apodo quedó.
   2) El mismo patrón en una página chica armada en la pantalla (campo que repinta al perder el foco + botón al lado):
      UN toque al botón hace lo suyo y el campo igual guardó.
   3) Un toque fuera de un botón (en texto) sigue sacando el foco como siempre. */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html';
const ANCHO = Number(process.env.ANCHO || 390), MOVIL = ANCHO < 700, PER = process.env.PERSONA || 'Rufino Ardanaz';
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES_ADMIN, 'utf8'));
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: ANCHO, height: MOVIL ? 844 : 900 }, deviceScaleFactor: MOVIL ? 3 : 1, isMobile: MOVIL, hasTouch: MOVIL });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now(),dueno:true}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(); var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$|^equipo_dato_directo$/.test(r[1])))
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage();
  const tocar = async (x, y) => { if (MOVIL) await pg.touchscreen.tap(x, y); else await pg.mouse.click(x, y); };
  const centro = (sel) => pg.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && SESSION && SESSION.dueno, null, { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(3000);
  await pg.evaluate((p) => _baseRpc('equipo_dato_directo', { p: { persona: p, campo: 'apodo', valor: '' } }), PER);
  await pg.evaluate(() => go('equipo'));
  await pg.waitForFunction(() => EQ.d && document.querySelector('#eqBody .eq-row'), null, { timeout: 40000 }).catch(() => {});
  await pg.evaluate(() => eqCargar(true).then(() => eqPintar()));
  await pg.evaluate((p) => eqAbrir(p), PER); await pg.waitForTimeout(1200);
  // 1) Ficha › lápiz › foco en Apodo › escribir › UN toque a Listo.
  let c = await centro('#eqFicha .eqf-nom-ed'); if (c) await tocar(c.x, c.y);
  await pg.waitForTimeout(500);
  c = await centro('#eqd_apodo');
  if (process.env.DEBUG) console.log('   dbg', JSON.stringify(c), await pg.evaluate((q) => { const e = q && document.elementFromPoint(q.x, q.y); return JSON.stringify({ act: (document.activeElement || {}).id, hit: e && (e.id || e.className || e.tagName), ins: [].map.call(document.querySelectorAll('#eqFicha input'), (i) => i.id).slice(0, 5) }); }, c));
  if (c) await tocar(c.x, c.y);
  await pg.keyboard.type('Rufi', { delay: 30 });
  const foco = await pg.evaluate(() => (document.activeElement || {}).id);
  chk(foco === 'eqd_apodo', '1) el foco está en Apodo (' + foco + ')');
  c = await centro('#eqFicha .eqf-nom-listo');
  if (c) await tocar(c.x, c.y);
  await pg.waitForTimeout(2500);
  const R = await pg.evaluate(() => ({ abierto: !!document.getElementById('eqd_apodo'), edit: !!EQ.edit.nombre, apodo: (document.querySelector('#eqFicha .eqf-apodo') || {}).textContent || '' }));
  console.log('   después de UN toque a Listo:', JSON.stringify(R));
  chk(!R.abierto && !R.edit, '   un toque a «Listo» cierra los campos');
  chk(/Rufi/.test(R.apodo), '   y el apodo quedó guardado («' + R.apodo + '»)');
  // 2) El patrón genérico: un campo que repinta al perder el foco y un botón al lado.
  await pg.evaluate(() => { eqCerrar(); const d = document.createElement('div'); d.id = 'lpPrueba'; d.style.cssText = 'position:fixed;left:0;right:0;top:120px;z-index:99999;background:#fff;padding:16px';
    window.__lp = { guardado: '', accion: 0 };
    window.lpPintar = function () { d.innerHTML = '<input id="lpIn" value="' + (window.__lp.guardado || '') + '" onblur="window.__lp.guardado=this.value;lpPintar()" style="font-size:16px;height:44px;width:200px">'
      + '<button id="lpBtn" style="height:44px;margin-left:8px" onclick="window.__lp.accion++">Guardar</button><p id="lpTxt" style="margin-top:12px">Texto suelto</p>'; };
    document.body.appendChild(d); lpPintar(); });
  c = await centro('#lpIn'); await tocar(c.x, c.y); await pg.keyboard.type('hola', { delay: 30 });
  c = await centro('#lpBtn'); await tocar(c.x, c.y); await pg.waitForTimeout(500);
  const G = await pg.evaluate(() => window.__lp);
  chk(G.accion === 1 && G.guardado === 'hola', '2) campo que repinta al salir + botón: UN toque hace la acción (' + G.accion + ') y el campo guardó («' + G.guardado + '»)');
  // 3) Un toque en texto (no un botón) saca el foco como siempre.
  c = await centro('#lpIn'); await tocar(c.x, c.y); await pg.keyboard.type('!', { delay: 30 });
  c = await centro('#lpTxt'); await tocar(c.x, c.y); await pg.waitForTimeout(400);
  const T3 = await pg.evaluate(() => ({ foco: (document.activeElement || {}).id || '', g: window.__lp.guardado }));
  if (MOVIL) chk(T3.foco === 'lpIn' || T3.g === 'hola!', '3) un toque en texto: WebKit táctil deja el foco donde estaba, como siempre (' + JSON.stringify(T3) + ')');
  else chk(T3.foco !== 'lpIn' && T3.g === 'hola!', '3) un clic en texto saca el foco y guarda como siempre (' + JSON.stringify(T3) + ')');
  await pg.evaluate(() => { try { document.activeElement.blur(); } catch (e) {} });
  // 4) Una carga de fondo que repinta justo debajo del dedo: el botón tocado ya no existe al soltar.
  await pg.evaluate(() => { window.__lp.accion = 0; document.getElementById('lpPrueba').addEventListener('pointerdown', function () { setTimeout(lpPintar, 0); }, true); });
  c = await centro('#lpBtn');
  if (MOVIL) await pg.touchscreen.tap(c.x, c.y); else { await pg.mouse.move(c.x, c.y); await pg.mouse.down(); await pg.waitForTimeout(80); await pg.mouse.up(); }
  await pg.waitForTimeout(600);
  const A4 = await pg.evaluate(() => window.__lp.accion);
  chk(A4 === 1, '4) repintado de fondo debajo del dedo: UN toque hace la acción una vez (' + A4 + ')');
  // 5) Un arrastre sobre el botón no es un toque.
  await pg.evaluate(() => { window.__lp.accion = 0; });
  c = await centro('#lpBtn');
  await pg.mouse.move(c.x, c.y); await pg.mouse.down(); await pg.mouse.move(c.x + 60, c.y + 40, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(500);
  const A5 = await pg.evaluate(() => window.__lp.accion);
  chk(A5 === 0, '5) un arrastre que sale del botón no lo aprieta (' + A5 + ')');
  await pg.evaluate(() => { const d = document.getElementById('lpPrueba'); if (d) d.remove(); });
  await pg.evaluate((p) => _baseRpc('equipo_dato_directo', { p: { persona: p, campo: 'apodo', valor: '' } }), PER);
  console.log(`\n${ok} ok, ${mal} mal`);
  await br.close();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
