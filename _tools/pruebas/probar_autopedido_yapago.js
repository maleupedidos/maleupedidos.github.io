/* + PEDIDO CON «YA ME PAGÓ», A MANO Y CON LAS TRAMPAS (22/11/2026, Home #2567: quedó Entregado + No Cobrado).
   Con el ROBOT y de verdad (el alta y el cobro viajan; cliente «PRUEBA Robot», depósito «prueba»). WebKit a 393 con toque
   (MOTOR=chromium → 1440 con mouse). Anota cada POST con su respuesta y saca capturas en OUT (yp_*.png).
     TRAMPA=1  → apenas se toca GUARDAR, «Listo →» y Cobranza (antes el cuadro ya no se abría), y después la × con «no»
                 (tiene que preguntar y seguir abierto). Después cobra.
     PROD=14   → el producto del carrito (el PRUEBA de la tienda vale $0 y el cuadro pide «cuánto recibiste»).
     LIMPIAR=1 → solo corre robot_limpiar (hacelo siempre al terminar).
   PW=<playwright-core> BASE=http://localhost:8155/app.html OUT=<dir> node probar_autopedido_yapago.js
   El recorrido por los tres medios con la base y la caja lo hace el robot (paso «+ pedido «Ya me pagó» · <medio>»). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW);
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || os.tmpdir();
const T = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const br = await pw[process.env.MOTOR || 'webkit'].launch();
  const ctx = await br.newContext(process.env.MOTOR === 'chromium' ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(`window.__PROD='${process.env.PROD||''}';try{localStorage.setItem('maleu_ensayo','1');localStorage.removeItem('maleu_np_borrador');localStorage.removeItem('maleu_np_cola');}catch(e){}
    window.__confirms=[]; window.confirm=function(m){window.__confirms.push(String(m).slice(0,160));return true;}; window.alert=function(m){window.__confirms.push('ALERT '+String(m).slice(0,160));};
    window.__posts=[]; (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
      if(m!=='POST'||/auth\\/v1\\//.test(s)||/ui_medicion/.test(s))return f.apply(this,arguments);
      var it={u:s.replace(/^.*\\/rpc\\//,'rpc/').slice(0,70),b:String((x&&x.body)||'').slice(0,700),t:Date.now()}; window.__posts.push(it);
      return f.apply(this,arguments).then(function(r){ try{ r.clone().text().then(function(tx){it.r=r.status+' '+tx.slice(0,300);}); }catch(e){} return r; });};})();`);
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push('consola ' + m.type() + ': ' + m.text().slice(0, 200)); });
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
  await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
  await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
  const rpc = (fn, p) => pg.evaluate(async ([fn, p]) => { const sb = await _sbPermiso(true); const r = await fetch(sb.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify(p || {}) });
    const t = await r.text(); try { return Object.assign({ http: r.status }, JSON.parse(t)); } catch (e) { return { http: r.status, texto: t.slice(0, 300) }; } }, [fn, p]);
  if (process.env.LIMPIAR) {
    const li = await rpc('robot_limpiar', { p_corrida: 'manual-' + Date.now() }); console.log('limpiar', JSON.stringify(li).slice(0, 600));
    const re = await rpc('robot_residuos', {}).catch((e) => ({ e: String(e) })); console.log('residuos', JSON.stringify(re).slice(0, 400));
    await br.close(); return;
  }
  const E = await rpc('robot_entidades_pantalla', {}); console.log('E', JSON.stringify(E).slice(0, 300));
  await pg.evaluate(() => go('ruta'));
  await pg.waitForFunction(() => typeof switchTab === 'function' && typeof npSetPago === 'function', null, { timeout: 60000 });
  await pg.evaluate(() => switchTab('nuevo')); await T(5000);
  const f = await pg.evaluate((E) => {
    npSetZona('Home'); document.getElementById('npNombre').value = 'PRUEBA Robot'; document.getElementById('npTel').value = String(E.telefono || '5490000000001');
    try { document.getElementById('npTel').dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    document.getElementById('npLote').value = '9';
    npQty(Number(window.__PROD||E.producto_id), 1);
    const hoyIso = npIsoDe(new Date()); const fb = Array.from(document.querySelectorAll('#npFechas [onclick^="npSetFecha"]')).filter((b) => (b.getAttribute('onclick') || '').indexOf(hoyIso) >= 0); if (fb[0]) fb[0].click();
    const ee = document.getElementById('npEstadoEntrega'); ee.value = 'Entregado'; ee.dispatchEvent(new Event('change', { bubbles: true }));
    /* (27/11/2026) «Sale de» son botones en el pie: se elige el del robot. */
    const depOpts = [].map.call(document.querySelectorAll('.np-dep-op'), (o) => o.getAttribute('data-dep'));
    if (depOpts.indexOf(E.deposito) >= 0) npDepElegir(E.deposito);
    const dep = { value: npDepElegido() };
    const og = document.getElementById('npOrigen'); const ogOpts = [].map.call(og.options, (o) => o.value);
    return { fecha: npFechaSel, hoyIso, depOpts, dep: dep && dep.value, origen: og.value, ogOpts, cart: JSON.stringify(npCart) };
  }, E);
  console.log('form', JSON.stringify(f));
  async function tocar(sel, txt) {
    const b = await pg.evaluate(([sel, txt]) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!txt || x.textContent.trim().indexOf(txt) >= 0); })[0];
      if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, txt: e.textContent.trim().slice(0, 40) }; }, [sel, txt || '']);
    if (!b) { console.log('  NO ENCONTRÉ ' + sel + ' ' + (txt || '')); return null; } await T(300);
    if (process.env.MOTOR === 'chromium') await pg.mouse.click(b.x, b.y); else await pg.touchscreen.tap(b.x, b.y); await T(500); return b;
  }
  await tocar('.np-pago .np-chip', 'Transferencia'); console.log('pago tras tocar', await pg.evaluate(() => npPago));
  const yc = await pg.evaluate(() => { const c = document.getElementById('npYaCobrado'); const l = c && (c.closest('label') || c.parentElement); return { checked: c && c.checked, lab: l && l.tagName }; });
  console.log('yaCobrado antes', JSON.stringify(yc));
  await tocar('#npYaCobrado');
  console.log('yaCobrado después', JSON.stringify(await pg.evaluate(() => ({ c: document.getElementById('npYaCobrado').checked, pago: npPago }))));
  await pg.screenshot({ path: path.join(OUT, 'yp_1_form.png') });
  const n0 = await pg.evaluate(() => window.__posts.length);
  const g = await tocar('button', 'GUARDAR');
  console.log('guardar', JSON.stringify(g));
  if (process.env.TRAMPA) { await T(150); console.log('trampa: Listo + Cobranza', await pg.evaluate(() => { try { npListo(); } catch (e) { return 'listo: ' + e.message; } switchTab('cobros'); return rutCurrentTab; })); }
  await T(9000);
  if (process.env.TRAMPA) {
    const ab = await pg.evaluate(() => { const o = document.getElementById('cobroRutaOverlay'); return !!o && !o.classList.contains('hidden'); });
    console.log('TRAMPA 1 · el cuadro se abrió igual después de irme a Cobranza:', ab);
    await pg.evaluate(() => { window.confirm = function (m) { window.__confirms.push('NO ' + String(m).slice(0, 160)); return false; }; });
    await tocar('.cobro-ruta-close');
    const sigue = await pg.evaluate(() => { const o = document.getElementById('cobroRutaOverlay'); return { abierto: !!o && !o.classList.contains('hidden'), pregunto: window.__confirms.slice(-1)[0] || '' }; });
    console.log('TRAMPA 3 · la × pregunta y con «no» sigue abierto:', JSON.stringify(sigue));
    await pg.evaluate(() => { window.confirm = function (m) { window.__confirms.push(String(m).slice(0, 160)); return true; }; });
  }
  await pg.screenshot({ path: path.join(OUT, 'yp_2_tras_guardar.png') });
  const st = await pg.evaluate((n0) => {
    const ov = document.getElementById('cobroRutaOverlay') || document.querySelector('.cobro-overlay, #cobroRuta');
    const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const btn = document.getElementById('btnCobroRutaOk');
    const toast = [].map.call(document.querySelectorAll('.toast.show, #rutToast.show, #toast.show'), (t) => t.textContent.trim().slice(0, 160));
    return { cuadro: vis(ov), ovId: ov && ov.id, btn: btn && vis(btn) ? btn.textContent.trim() + (btn.disabled ? ' [disabled]' : '') : null, toast, tab: rutCurrentTab,
      succ: (document.getElementById('npSuccess') || {}).innerText, posts: window.__posts.slice(n0).map((p) => p.u + ' → ' + (p.r || '…')), confirms: window.__confirms,
      cola: localStorage.getItem('maleu_np_cola'), nombre: document.getElementById('npNombre').value, yc: document.getElementById('npYaCobrado').checked };
  }, n0);
  console.log('tras guardar', JSON.stringify(st, null, 1));
  if (st.btn) {
    const fp = await pg.evaluate(() => [].map.call(document.querySelectorAll('#cobroRutaFp .cobro-pill.on'), (b) => b.textContent.trim()).join());
    console.log('pastilla marcada:', fp);
    if (!/Transferencia/.test(fp)) await tocar('#cobroRutaFp .cobro-pill', 'Transferencia');
    console.log('botón:', await pg.evaluate(() => { const b = document.getElementById('btnCobroRutaOk'); return b.textContent.trim() + (b.disabled ? ' [disabled]' : ''); }));
    await pg.screenshot({ path: path.join(OUT, 'yp_3_cuadro.png') });
    const n1 = await pg.evaluate(() => window.__posts.length);
    await tocar('#btnCobroRutaOk');
    await T(8000);
    await pg.screenshot({ path: path.join(OUT, 'yp_4_tras_cobrar.png') });
    console.log('tras cobrar', JSON.stringify(await pg.evaluate((n1) => ({ posts: window.__posts.slice(n1).map((p) => p.u + ' ' + p.b.slice(0, 250) + ' → ' + (p.r || '…')), confirms: window.__confirms,
      toast: [].map.call(document.querySelectorAll('.toast.show, #rutToast.show, #toast.show'), (t) => t.textContent.trim().slice(0, 160)), cola: (typeof syncQueue !== 'undefined' ? syncQueue.length : null), espera: window.__colaEspera || 0,
      cuadro: !!document.getElementById('btnCobroRutaOk') && document.getElementById('btnCobroRutaOk').getClientRects().length > 0 }), n1), null, 1));
  }
  console.log('errores', JSON.stringify(errs.filter((e) => !/Failed to load resource.*favicon/.test(e)).slice(0, 15), null, 1));
  await br.close();
})().catch((e) => { console.log('REVENTÓ', e && e.stack || e); process.exit(1); });
