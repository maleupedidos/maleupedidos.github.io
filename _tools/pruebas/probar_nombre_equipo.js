/* EL NOMBRE QUE SE VE (18/11/2026, 755). WebKit con perfil de iPhone (390×844, táctil) y la sesión del dueño. Toda escritura
   cortada MENOS `equipo_dato_directo` (el nombre): la prueba renombra de verdad y lo vuelve atrás al final.
     PW=<playwright-core> SES_ADMIN=<ses.json> BASE=<url app.html> node _tools/pruebas/probar_nombre_equipo.js
   1) Ficha de «Alfonso»: el lápiz al lado del nombre (≥ 44 px), un toque abre el campo, se escribe el nombre nuevo y se
      guarda al salir. La ficha y la lista dicen el nombre nuevo; la clave (data-p) sigue siendo «Alfonso».
   2) Ruta › Cobranza › Sueldos lo muestra con el nombre nuevo (si esta quincena está en la lista).
   3) El recibo dice el nombre que se ve (con Lucas, que tiene pagos: se le pone uno de prueba y se le devuelve).
   4) Vacío: vuelve a «Alfonso». Consola sin errores. */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html';
const APE = 'Prueba Apellido', NUEVO = 'Alfonso Prueba Apellido', APODO = 'Fonsi', SANTOS_APE = 'Prueba Recibo', SANTOS = 'Lucas Prueba Recibo';
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES_ADMIN, 'utf8'));
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now(),dueno:true}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){}; window.print=function(){};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(); var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$|^equipo_dato_directo$/.test(r[1])))
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();
    window.__errs=[];window.addEventListener('error',function(e){if(!/ResizeObserver/.test(e.message))window.__errs.push(String(e.message).slice(0,160));});`);
  const pg = await ctx.newPage();
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && SESSION && SESSION.dueno, null, { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(3000);
  const nombrar = (per, v, campo) => pg.evaluate((a) => _baseRpc('equipo_dato_directo', { p: { persona: a.per, campo: a.c, valor: a.v } }).then((r) => r.completo || ''), { per, v, c: campo || 'apellido' });
  const limpiar = async (per) => { for (const c of ['nombre', 'apellido', 'apodo']) await nombrar(per, '', c); };
  const recargarEq = () => pg.evaluate(() => eqCargar(true).then(() => { eqPintar(); return true; }));
  await limpiar('Alfonso'); await limpiar('Lucas Moresco'); // limpio de corridas anteriores
  await pg.evaluate(() => go('equipo'));
  await pg.waitForFunction(() => EQ.d && document.querySelector('#eqBody .eq-row[data-p="Alfonso"]'), null, { timeout: 40000 }).catch(() => {});
  await recargarEq(); await pg.waitForTimeout(800);
  await pg.evaluate(() => eqAbrir('Alfonso')); await pg.waitForTimeout(900);
  const fa = await pg.evaluate(() => !!document.querySelector('#eqFicha .eqf-falta-ape'));
  chk(fa, '0) la ficha de Alfonso dice «Falta apellido»');
  // 1) El lápiz y los campos.
  const L = await pg.evaluate(() => { const b = document.querySelector('#eqFicha .eqf-nom-ed'); const r = b && b.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, h: Math.round(r.height), w: Math.round(r.width) } : null; });
  chk(!!L && L.h >= 44 && L.w >= 44, '1) el lápiz al lado del nombre (' + (L ? L.w + '×' + L.h : 'no está') + ' px)');
  if (L) await pg.touchscreen.tap(L.x, L.y);
  await pg.waitForTimeout(600);
  const inp = await pg.evaluate(() => ['nombre', 'apellido', 'apodo'].map((c) => { const i = document.getElementById('eqd_' + c); return i ? i.value : null; }));
  chk(inp[0] === 'Alfonso' && inp[1] === '' && inp[2] === '', '   un toque abre Nombre, Apellido y Apodo (' + JSON.stringify(inp) + ')');
  await pg.fill('#eqd_apellido', APE); await pg.evaluate(() => document.getElementById('eqd_apellido').blur()); await pg.waitForTimeout(1500);
  if (process.env.DEBUG) console.log('   dbg', await pg.evaluate(() => JSON.stringify({ edit: EQ.edit, ab: EQ.abierto, on: !!document.querySelector('#eqFicha.on'), ins: [].map.call(document.querySelectorAll('#eqFicha input'), (i) => i.id), nom: (document.getElementById('eqfNom') || {}).textContent })));
  await pg.fill('#eqd_apodo', APODO); await pg.evaluate(() => document.getElementById('eqd_apodo').blur()); await pg.waitForTimeout(1500);
  const lb = await pg.evaluate(() => { const b = document.querySelector('#eqFicha .eqf-nom-listo'); const r = b && b.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; });
  if (lb) await pg.touchscreen.tap(lb.x, lb.y);
  await pg.waitForTimeout(1500);
  const F = await pg.evaluate(() => ({ ficha: (document.getElementById('eqfNom') || {}).textContent || '', fila: [].map.call(document.querySelectorAll('#eqBody .eq-row'), (r) => ({ p: r.dataset.p, n: (r.querySelector('.eq-nom') || {}).textContent })).filter((x) => /Alfonso/.test(x.n || '') || x.p === 'Alfonso')[0] || null }));
  console.log('   después de guardar:', JSON.stringify(F));
  chk(F.ficha.trim() === NUEVO, '   la ficha dice «' + F.ficha.trim() + '»');
  chk(F.fila && F.fila.n === NUEVO && F.fila.p === 'Alfonso', '   la lista también (sin el apodo), y la clave sigue siendo «Alfonso»');
  const ap = await pg.evaluate(() => ({ apodo: (document.querySelector('#eqFicha .eqf-apodo') || {}).textContent || '', falta: !!document.querySelector('#eqFicha .eqf-falta-ape') }));
  chk(/Fonsi/.test(ap.apodo) && !ap.falta, '   el apodo va aparte en la ficha («' + ap.apodo + '») y ya no falta el apellido');
  // 2) Ruta › Cobranza › Sueldos.
  await pg.evaluate(() => { eqCerrar(); go('ruta'); });
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { try { switchTab('cobros'); } catch (e) {} }); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const c = [].filter.call(document.querySelectorAll('#pg-ruta .cobros-chips button, #pg-ruta .cobros-chips [onclick]'), (b) => /Sueldos/.test(b.textContent))[0]; if (c) c.click(); });
  let sq = '';
  for (let i = 0; i < 20; i++) { sq = await pg.evaluate(() => [].map.call(document.querySelectorAll('#pg-ruta .sq-nom, #pg-ruta .sq-c-h'), (e) => e.textContent).join(' | ')); if (sq) break; await pg.waitForTimeout(700); }
  const enLista = /Alfonso/.test(sq);
  console.log('   Sueldos:', sq.slice(0, 200));
  chk(!enLista || sq.indexOf(NUEVO) >= 0, '2) Ruta › Sueldos: ' + (enLista ? 'dice «' + NUEVO + '»' : 'Alfonso no tiene quincena en la lista (no se mira)'));
  // 3) El recibo, con Santos (tiene pagos).
  await nombrar('Lucas Moresco', SANTOS_APE);
  await pg.evaluate(() => go('equipo')); await recargarEq(); await pg.waitForTimeout(800);
  await pg.evaluate(() => eqAbrir('Lucas Moresco')); await pg.waitForTimeout(1500);
  console.log('   botones de la ficha de Santos:', await pg.evaluate(() => [].map.call(document.querySelectorAll('#eqFicha button'), (b) => b.textContent.trim()).filter(Boolean).slice(0, 30).join(' | ')));
  const rb = await pg.evaluate(() => { const b = [].filter.call(document.querySelectorAll('#eqFicha button'), (x) => /^Recibo$/.test(x.textContent.trim()))[0]; if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (rb) await pg.touchscreen.tap(rb.x, rb.y);
  await pg.waitForTimeout(2500);
  const rec = await pg.evaluate((n) => { const t = document.body.innerText; return { esta: t.indexOf(n) >= 0, sinViejo: !/Santos Bullrich/.test([].map.call(document.querySelectorAll('[class*="recibo"], [id*="recibo"], [id*="Recibo"]'), (e) => e.innerText).join(' ')) }; }, SANTOS);
  chk(!!rb && rec.esta, '3) el recibo dice «' + SANTOS + '»' + (rb ? '' : ' (no encontré un pago con recibo)'));
  await limpiar('Lucas Moresco');
  // 4) Vacío: vuelve.
  await limpiar('Alfonso'); const v = await nombrar('Alfonso', '', 'apodo');
  await pg.evaluate(() => { try { document.querySelectorAll('[id*="ecibo"]').forEach((e) => e.remove()); } catch (e) {} eqCerrar(); go('equipo'); });
  await recargarEq(); await pg.waitForTimeout(800);
  const back = await pg.evaluate(() => { const r = document.querySelector('#eqBody .eq-row[data-p="Alfonso"] .eq-nom'); return r ? r.textContent : ''; });
  chk(v === 'Alfonso' && back === 'Alfonso', '4) vacío: vuelve a «' + back + '»');
  const errs = await pg.evaluate(() => window.__errs);
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  await br.close();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
