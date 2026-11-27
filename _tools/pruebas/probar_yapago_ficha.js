/* «YA ME PAGÓ» COMO FICHA DE COBRO ANTES DE GUARDAR (27/11/2026, B.6). Con el ROBOT y de verdad: cliente «PRUEBA Robot»,
   producto PRUEBA a $1.000, depósito «prueba», Entregado. A 390 con toques (Chromium emulando el celular: WebKit está
   bloqueado por Windows desde el 23/11; MOTOR=webkit si vuelve).
   Lo que mide, en orden:
     0. Tildar abre el cuadro ANTES de guardar; la × lo cierra y destilda. GUARDAR con el tilde y sin cobro no guarda.
     Cada caso: tildar → cobrar en el cuadro → resumen abajo del tilde → GUARDAR → el alta vuelve → el cobro sale → la base.
       justo   efectivo $1.000
       menos   efectivo $600 + «Pago parcial» → queda debiendo $400
       propina efectivo $1.200 + «Es propina» → propina $200
       vuelto  efectivo $2.000 + «Le di vuelto» → vuelto $1.000
     Y un caso de freno: cobrar y después cambiar el carrito → el resumen en rojo y GUARDAR no sigue.
   CASOS=justo,menos → solo esos. LIMPIAR=1 → robot_limpiar (corrélo siempre al terminar).
   PW=<playwright-core> BASE=http://localhost:8155/app.html OUT=<dir> node probar_yapago_ficha.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || os.tmpdir();
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const CASOS = (process.env.CASOS || 'justo,menos,propina,vuelto').split(',');
let bien = 0, mal = 0; const chk = (txt, ok, extra) => { ok ? bien++ : mal++; console.log((ok ? '  BIEN ' : '  MAL  ') + txt + (extra ? ' · ' + extra : '')); };
(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const motor = process.env.MOTOR || 'chromium';
  const br = await pw[motor].launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: motor !== 'firefox', hasTouch: true });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_ensayo','1');localStorage.removeItem('maleu_np_borrador');localStorage.removeItem('maleu_np_cola');}catch(e){}
    window.__confirms=[]; window.confirm=function(m){window.__confirms.push(String(m).slice(0,160));return true;}; window.alert=function(m){window.__confirms.push('ALERT '+String(m).slice(0,160));};`);
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
  await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
  await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
  const rpc = (fn, p) => pg.evaluate(async ([fn, p]) => { const sb = await _sbPermiso(true); const r = await fetch(sb.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify(p || {}) });
    const t = await r.text(); try { return Object.assign({ http: r.status }, JSON.parse(t)); } catch (e) { return { http: r.status, texto: t.slice(0, 300) }; } }, [fn, p]);
  if (process.env.LIMPIAR) { console.log('limpiar', JSON.stringify(await rpc('robot_limpiar', { p_corrida: 'yapago-' + Date.now() })).slice(0, 500)); await br.close(); return; }
  const E = await rpc('robot_entidades_pantalla', {}); console.log('E', JSON.stringify(E).slice(0, 200));
  if (!(E && E.producto_id > 0)) { console.log('sin producto PRUEBA: no sigo'); await br.close(); return; }
  await pg.evaluate(() => go('ruta'));
  await pg.waitForFunction(() => typeof switchTab === 'function' && typeof npSetPago === 'function', null, { timeout: 60000 });
  await pg.evaluate(() => switchTab('nuevo')); await T(4000);

  async function tocar(sel, txt) {
    const b = await pg.evaluate(([sel, txt]) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!txt || x.textContent.trim().indexOf(txt) >= 0); })[0];
      if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [sel, txt || '']);
    if (!b) { console.log('    (no encontré ' + sel + ' ' + (txt || '') + ')'); return null; }
    await T(250); await pg.touchscreen.tap(b.x, b.y); await T(450); return b;
  }
  const tipear = (id, v) => pg.evaluate(([id, v]) => { const x = document.getElementById(id); x.value = String(v); x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  const cuadro = () => pg.evaluate(() => { const o = document.getElementById('cobroRutaOverlay'); return !!o && !o.classList.contains('hidden'); });
  const llenar = () => pg.evaluate((E) => {
    npReset(); npSetZona('Home');
    const pid = Number(E.producto_id);
    if (!NP_CAT_FLAT.some((x) => x.id === pid)) { const itP = { id: pid, abbr: 'PRUEBA', n: 'PRUEBA' }; NP_CAT.push({ cat: 'PRUEBA', items: [itP] }); NP_CAT_FLAT.push(itP); }
    try { window.NP_PRECIOS.PRUEBA = { p: 1000, c: 500, pc: 1000 }; } catch (e) {}
    document.getElementById('npNombre').value = 'PRUEBA Robot'; document.getElementById('npTel').value = String(E.telefono || '5490000000001');
    document.getElementById('npLote').value = '9';
    npQty(pid, 1);
    const hoy = npIsoDe(new Date()); const fb = [].filter.call(document.querySelectorAll('#npFechas [onclick^="npSetFecha"]'), (b) => (b.getAttribute('onclick') || '').indexOf(hoy) >= 0); if (fb[0]) fb[0].click();
    const ee = document.getElementById('npEstadoEntrega'); ee.value = 'Entregado'; ee.dispatchEvent(new Event('change', { bubbles: true }));
    if (typeof npDepElegir === 'function') npDepElegir(E.deposito);
    const og = document.getElementById('npOrigen'); og.value = 'Pendiente'; og.dispatchEvent(new Event('change', { bubbles: true }));
    npSetPago('Efectivo'); npUpdateTotal();
    return { tot: _npTotalActual().total, dep: npDepElegido() };
  }, E);
  const quienYBoton = () => pg.evaluate(async () => {
    const qsec = document.getElementById('cobroQuienSection'); const qs = (qsec && qsec.style.display !== 'none') ? [].slice.call(qsec.querySelectorAll('#cobroQuien .cobro-pill')) : [];
    const q = qs.filter((b) => (b.getAttribute('data-p') || '') === 'PRUEBA Robot')[0] || qs.filter((b) => b.classList.contains('on'))[0] || qs[0];
    if (q && !q.classList.contains('on')) q.click(); await new Promise((r) => setTimeout(r, 300));
    const bl = [].filter.call(document.querySelectorAll('#cobroRutaOverlay [onclick*="Bil"]'), (b) => /PRUEBA Robot/.test(b.textContent) && b.offsetParent)[0]; if (bl && !bl.classList.contains('on')) bl.click();
    await new Promise((r) => setTimeout(r, 300));
    const b = document.getElementById('btnCobroRutaOk'), er = document.getElementById('cobroRutaErr');
    return { txt: b ? b.textContent.trim() : '', dis: !!(b && b.disabled), err: er ? er.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : '' };
  });

  /* 0. El tilde abre el cuadro antes de guardar; la × destilda; GUARDAR sin cobro no guarda. */
  console.log('— 0. tildar / × / GUARDAR sin cobro');
  const f0 = await llenar(); console.log('  form', JSON.stringify(f0));
  await tocar('#npYaCobrado');
  chk('tildar abre el cuadro de cobro', await cuadro());
  const sub0 = await pg.evaluate(() => (document.getElementById('cobroRutaSub') || {}).textContent || '');
  chk('el cuadro dice que se registra al guardar', /GUARDAR/.test(sub0), sub0);
  await pg.screenshot({ path: path.join(OUT, 'yf_0_cuadro.png') });
  await tocar('.cobro-ruta-close');
  const d0 = await pg.evaluate(() => ({ abierto: !document.getElementById('cobroRutaOverlay').classList.contains('hidden'), yc: document.getElementById('npYaCobrado').checked }));
  chk('la × cierra y destilda', !d0.abierto && !d0.yc, JSON.stringify(d0));
  /* El tilde puesto sin pasar por el cuadro (borrador restaurado): GUARDAR no sigue y abre el cuadro. */
  await pg.evaluate(() => { document.getElementById('npYaCobrado').checked = true; });
  const c0 = await pg.evaluate(() => _npColaLeer().length);
  await tocar('button', 'GUARDAR'); await T(800);
  const g0 = await pg.evaluate(() => ({ cola: _npColaLeer().length, cuadro: !document.getElementById('cobroRutaOverlay').classList.contains('hidden') }));
  chk('GUARDAR con el tilde y sin cobro no guarda y abre el cuadro', g0.cola === c0 && g0.cuadro, JSON.stringify(g0));
  await pg.evaluate(() => { try { cerrarCobroRuta(); } catch (e) {} });

  /* Freno: cobrar y después cambiar el carrito. */
  console.log('— freno: cobro y después cambia el total');
  await llenar(); await tocar('#npYaCobrado'); await tipear('cobroRecEf', 1000); await T(400);
  let qb = await quienYBoton(); if (!qb.dis) await tocar('#btnCobroRutaOk'); await T(600);
  const r1 = await pg.evaluate(() => { const w = document.getElementById('npCobroRes'); return { vis: !!w && !w.hidden, txt: w ? w.innerText.replace(/\s+/g, ' ') : '' }; });
  chk('después de cobrar, el resumen abajo del tilde', r1.vis && /Cobrado/.test(r1.txt), r1.txt);
  await pg.evaluate((E) => { npQty(Number(E.producto_id), 1); }, E); await T(300);
  const r2 = await pg.evaluate(() => { const w = document.getElementById('npCobroRes'); return { mal: !!w && w.classList.contains('mal'), txt: w ? w.innerText.replace(/\s+/g, ' ') : '' }; });
  chk('al cambiar el carrito el resumen se pone en rojo', r2.mal, r2.txt);
  const c1 = await pg.evaluate(() => _npColaLeer().length);
  await tocar('button', 'GUARDAR'); await T(800);
  const g1 = await pg.evaluate(() => ({ cola: _npColaLeer().length, cuadro: !document.getElementById('cobroRutaOverlay').classList.contains('hidden') }));
  chk('con el total cambiado GUARDAR no guarda y reabre el cobro', g1.cola === c1 && g1.cuadro, JSON.stringify(g1));
  await pg.evaluate(() => { try { cerrarCobroRuta(); } catch (e) {} npReset(); });

  /* Los cuatro casos de verdad. */
  for (const caso of CASOS) {
    console.log('— ' + caso);
    const f = await llenar();
    if (f.dep !== E.deposito || f.tot !== 1000) { chk(caso + ': formulario con PRUEBA a $1.000 en el depósito prueba', false, JSON.stringify(f)); continue; }
    await tocar('#npYaCobrado');
    if (!(await cuadro())) { chk(caso + ': se abrió el cuadro', false); continue; }
    const rec = { justo: 1000, menos: 600, propina: 1200, vuelto: 2000 }[caso];
    /* «Pago parcial» limpia el monto: primero el modo, después lo que pagó. */
    if (caso === 'menos') { await tocar('#cobroMasBtn'); await tocar('#cobroTogglePartial'); }
    await tipear('cobroRecEf', rec); await T(400);
    if (caso === 'propina') await pg.evaluate(() => _marcarSobranteComoPropina());
    if (caso === 'vuelto') await pg.evaluate(() => _marcarSobranteVuelto());
    await T(400);
    qb = await quienYBoton();
    await pg.screenshot({ path: path.join(OUT, 'yf_' + caso + '_1_cuadro.png') });
    if (qb.dis) { chk(caso + ': el cuadro deja confirmar', false, qb.txt + ' · ' + qb.err); await pg.evaluate(() => { try { cerrarCobroRuta(); } catch (e) {} }); continue; }
    await tocar('#btnCobroRutaOk'); await T(600);
    const res = await pg.evaluate(() => { const w = document.getElementById('npCobroRes'); return { vis: !!w && !w.hidden, txt: w ? w.innerText.replace(/\s+/g, ' ') : '', pre: window.__npCobroPre && window.__npCobroPre.tipo, cuadro: !document.getElementById('cobroRutaOverlay').classList.contains('hidden') }; });
    chk(caso + ': el cuadro se cierra y queda el resumen', res.vis && !res.cuadro, res.txt);
    await pg.screenshot({ path: path.join(OUT, 'yf_' + caso + '_2_resumen.png') });
    await pg.evaluate(() => { window.__npCobroPreEnviado = null; });
    await tocar('button', 'GUARDAR');
    let env = null; for (let k = 0; k < 60 && !env; k++) { await T(1000); env = await pg.evaluate(() => window.__npCobroPreEnviado); }
    if (!env) { chk(caso + ': el alta volvió y el cobro salió', false, JSON.stringify(await pg.evaluate(() => ({ cola: _npColaLeer(), err: window.__npCobroPreErr })))); continue; }
    chk(caso + ': el alta volvió (#' + env.n + ') y el cobro salió por ' + env.payload.action, true);
    let vp = null; for (let k = 0; k < 15; k++) { await T(1500); const v = await rpc('robot_verificar', { p: { pedido: 'Home|' + env.n } }).catch(() => null); vp = v && v.pedido; if (vp && (caso === 'menos' ? Number(vp.cobrado_parcial || vp.parcial || 0) > 0 || vp.estado_pago === 'Parcial' : vp.estado_pago === 'Cobrado')) break; }
    const vs = JSON.stringify(vp || {}).slice(0, 400);
    if (caso === 'menos') chk('menos: quedó con $600 a cuenta y sin cerrar', !!vp && vp.estado_pago !== 'Cobrado', vs);
    else {
      chk(caso + ': quedó Cobrado en Efectivo', !!vp && vp.estado_pago === 'Cobrado' && vp.forma === 'Efectivo', vs);
      if (caso === 'propina') chk('propina: $200 de propina', !!vp && Math.round(Number(vp.propina_ef || vp.propina || 0)) === 200, vs);
      if (caso === 'vuelto') chk('vuelto: sin propina (el vuelto salió de la billetera)', !!vp && Math.round(Number(vp.propina_ef || vp.propina || 0)) === 0, vs);
    }
  }
  const ex = errs.filter((e) => !/favicon|ResizeObserver/.test(e));
  chk('sin errores de JS', !ex.length, ex.slice(0, 5).join(' | '));
  console.log('\n' + bien + ' bien · ' + mal + ' mal');
  await br.close();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('REVENTÓ', e && e.stack || e); process.exit(2); });
