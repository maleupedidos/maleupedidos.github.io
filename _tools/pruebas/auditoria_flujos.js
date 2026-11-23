/* AUDITORÍA DE FLUJOS CON TOQUES REALES (22-23/11/2026, Organizador: «escanear sin escribir NO prueba nada»).
   Entra como el ROBOT (modo ensayo: nada a Apps Script; las directas de la base SÍ viajan) y recorre lo que Tadeo usa todos
   los días tocando la pantalla como él: WebKit a 393 con toque (MOTOR=chromium → 1440 con mouse y el cajón abierto).
   Solo entidades PRUEBA (cliente «PRUEBA Robot», teléfono del robot, depósito «prueba»). Al final: robot_limpiar.
   Cada toque comprueba que debajo del dedo esté el botón (elementFromPoint): si una capa lo tapa, es un hallazgo.
     FLUJO=cobranza   + Pedido «Lo cobro después» con Efectivo / Transferencia / Mixto → cobrarlo desde COBRANZA.
     MEDIOS=Efectivo,Mixto   (opcional) solo esos.
     LIMPIAR=1        solo robot_limpiar.
   PW=<playwright-core> BASE=http://localhost:8155/app.html OUT=<dir> node auditoria_flujos.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || os.tmpdir();
const MOTOR = process.env.MOTOR || 'webkit', COMPU = MOTOR === 'chromium';
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const hall = [];
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; hall.push(t); console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 700) : '')); } return !!c; };

const INIT = `try{localStorage.setItem('maleu_ensayo','1');localStorage.removeItem('maleu_np_borrador');localStorage.removeItem('maleu_np_cola');}catch(e){}
  window.__confirms=[]; window.__confirmResp=true; window.confirm=function(m){window.__confirms.push(String(m).slice(0,200));return window.__confirmResp;};
  window.alert=function(m){window.__confirms.push('ALERT '+String(m).slice(0,200));};
  window.__posts=[]; (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
    if(m!=='POST'||/auth\\/v1\\//.test(s)||/ui_medicion/.test(s))return f.apply(this,arguments);
    var it={u:s.replace(/^.*\\/rpc\\//,'rpc/').slice(0,70),b:String((x&&x.body)||'').slice(0,900),t:Date.now()}; window.__posts.push(it);
    return f.apply(this,arguments).then(function(r){ try{ r.clone().text().then(function(tx){it.r=r.status+' '+tx.slice(0,400);}); }catch(e){} return r; });};})();`;

let pg, br, errs = [];
async function abrir() {
  br = await pw[MOTOR].launch();
  const ctx = await br.newContext(COMPU ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(INIT);
  pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push('JS: ' + String(e.message).slice(0, 200)));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push('consola: ' + m.text().slice(0, 200)); });
  pg.on('response', (r) => { if (r.status() >= 400 && /supabase\.co\/rest/.test(r.url())) errs.push('base ' + r.status() + ': ' + r.url().replace(/^.*\/rest\/v1\//, '').split('?')[0]); });
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
  await pg.fill('#loginUser', cred.usuario); await pg.fill('#loginPin', String(cred.pin));
  await pg.evaluate(() => panelDoLogin());
  await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
  if (COMPU) await pg.evaluate(() => { if (!document.body.classList.contains('sb-open') && typeof sbToggle === 'function') sbToggle(); });
}
const rpc = (fn, p) => pg.evaluate(async ([fn, p]) => { const sb = await _sbPermiso(true); const r = await fetch(sb.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify(p || {}) });
  const t = await r.text(); try { return Object.assign({ http: r.status }, JSON.parse(t)); } catch (e) { return { http: r.status, texto: t.slice(0, 300) }; } }, [fn, p]);
async function esperar(fn, arg, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await pg.evaluate(fn, arg); if (v) return v; } catch (e) {} await T(300); } return null; }

/* Un toque de verdad: el elemento visible que matchea (y contiene `txt`, dentro de `dentro`), centrado en pantalla, y
   comprobando que el punto del toque caiga en él. Devuelve {txt} o null. */
async function tocar(sel, txt, dentro, opt) {
  opt = opt || {};
  const b = await pg.evaluate(([sel, txt, dentro]) => {
    const raiz = dentro ? document.querySelector(dentro) : document; if (!raiz) return { no: 'sin ' + dentro };
    const e = [].slice.call(raiz.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden' && (!txt || x.textContent.replace(/\s+/g, ' ').trim().indexOf(txt) >= 0); })[0];
    if (!e) return { no: 'no encontré ' + sel + (txt ? ' «' + txt + '»' : '') };
    e.scrollIntoView({ block: 'center', inline: 'center' }); return { ok: 1 };
  }, [sel, txt || '', dentro || '']);
  if (!b || b.no) { if (!opt.callado) console.log('       (toque) ' + (b && b.no)); return null; }
  await T(350);
  const p = await pg.evaluate(([sel, txt, dentro]) => {
    const raiz = dentro ? document.querySelector(dentro) : document;
    const e = [].slice.call(raiz.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden' && (!txt || x.textContent.replace(/\s+/g, ' ').trim().indexOf(txt) >= 0); })[0];
    if (!e) return null; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const h = document.elementFromPoint(x, y); const tapa = h && h !== e && !e.contains(h) && !(e.tagName === 'INPUT' && h.tagName === 'LABEL' && h.contains(e)) && !(h.tagName === 'LABEL' && h.control === e);
    const fuera = x < 0 || y < 0 || x > innerWidth || y > innerHeight;
    return { x, y, txt: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 50), tapa: tapa ? (h.id ? '#' + h.id : h.tagName.toLowerCase() + '.' + String(h.className || '').split(' ').slice(0, 2).join('.')) + ' «' + String(h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) + '»' : '', fuera };
  }, [sel, txt || '', dentro || '']);
  if (!p) return null;
  if (p.tapa || p.fuera) chk('toque «' + (txt || sel) + '» sin nada encima' + (COMPU ? ' (1440)' : ' (393)'), false, { tapa: p.tapa, fuera: p.fuera, x: Math.round(p.x), y: Math.round(p.y) });
  if (COMPU) await pg.mouse.click(p.x, p.y); else await pg.touchscreen.tap(p.x, p.y);
  await T(opt.espera || 500); return p;
}
const visible = (sel) => pg.evaluate((sel) => { const e = document.querySelector(sel); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.classList.contains('hidden'); }, sel);
const foto = (n) => pg.screenshot({ path: path.join(OUT, 'au_' + (COMPU ? '1440' : '393') + '_' + n + '.png') }).catch(() => {});
async function verPedido(h, n, hasta, ms) {
  let vp = null; const t0 = Date.now();
  while (Date.now() - t0 < (ms || 20000)) { const v = await rpc('robot_verificar', { p: { pedido: h + '|' + n } }).catch(() => null); vp = v && v.pedido; if (vp && (!hasta || hasta(vp))) break; await T(1500); }
  return vp;
}
async function cajaDe(h, n) {
  const cjr = await rpc('caja_light_pantalla', { p_desde: new Date(Date.now() - 86400000).toISOString() }).catch((e) => ({ err: String(e.message || e) }));
  if (!cjr || cjr.err || !Array.isArray(cjr.movimientos)) return { err: (cjr && (cjr.err || cjr.message || cjr.http)) || 'sin movimientos' };
  const m = cjr.movimientos.filter((x) => x.hoja === h && String(x.pedido || '') === String(n));
  return { n: m.length, ef: m.filter((x) => x.met === 'Efectivo').reduce((a, x) => a + (Number(x.$) || 0), 0), dig: m.filter((x) => x.met !== 'Efectivo').reduce((a, x) => a + (Number(x.$) || 0), 0), cta: m.map((x) => x.cta).join(',') };
}

/* ── + PEDIDO: el formulario. Lo que Tadeo tipea va con fill; lo que toca, con toques. ─────────────────────────────── */
let E = null;
async function irNuevo() {
  await pg.evaluate(() => { try { cerrarCobroRuta(); } catch (e) {} go('ruta'); });
  await pg.waitForFunction(() => typeof switchTab === 'function' && typeof npSetPago === 'function', null, { timeout: 60000 });
  await tocar('.tab[data-tab="nuevo"]', '', '', { callado: true }) || await pg.evaluate(() => switchTab('nuevo'));
  await T(2500); await pg.evaluate(() => { try { npReset(); } catch (e) {} });
}
async function cargarPedido(medio, yaPago, opt) {
  opt = opt || {};
  await irNuevo();
  /* El robot no recibe las cuentas de cobro (vienen con la lectura de Red, solo admin/gerente): la suya, como única. */
  /* (23/11) Sin sembrar: las cuentas reales, como las ve Tadeo. Un cobro PRUEBA en «galicia» no entra a su caja
     (caja_light_base lee sales_order_real y order_payment_real, que dejan afuera lo PRUEBA). */
  await tocar('.np-zona [onclick*="Home"], [onclick^="npSetZona(\'Home\'"]', '', '', { callado: true }) || await pg.evaluate(() => npSetZona('Home'));
  await pg.fill('#npNombre', 'PRUEBA Robot'); await pg.fill('#npTel', String(E.telefono || '5490000000001')); await pg.fill('#npLote', '9');
  const prod = await pg.evaluate(([pid, q]) => { const ids = [String(pid || ''), '14', '1', '19', '3'].filter(Boolean); for (const i of ids) { try { npQty(Number(i), 1); } catch (e) {} if ((npDiscountInfo() || {}).total > 0) { for (let k = 1; k < q; k++) npQty(Number(i), 1); return { id: i, total: npDiscountInfo().total }; } try { npQty(Number(i), -1); } catch (e) {} } return null; }, [E.producto_id, opt.qty || 1]);
  if (opt.juntada) {
    /* Vive en «Más opciones» (plegado): primero se abre. */
    if (!(await pg.evaluate(() => { const d = document.querySelector('details.np-extras'); return !d || d.open; }))) await tocar('details.np-extras > summary', '');
    await tocar('.np-dest .np-chip', 'Juntada o evento'); chk('+ Pedido: «Juntada o evento» queda elegido', await pg.evaluate(() => !!(document.getElementById('npGrupal') || {}).checked)); }
  if (!prod) return { err: 'sin producto con precio' };
  const hoy = await pg.evaluate(() => npIsoDe(new Date()));
  await tocar('#npFechas [onclick*="' + hoy + '"]', '', '', { callado: true }) || await pg.evaluate((hoy) => { const b = document.querySelector('#npFechas [onclick*="' + hoy + '"]'); if (b) b.click(); }, hoy);
  await pg.evaluate((DEP) => {
    const ee = document.getElementById('npEstadoEntrega'); ee.value = 'Entregado'; ee.dispatchEvent(new Event('change', { bubbles: true }));
    const dp = document.getElementById('npDeposito'); if (dp && [].some.call(dp.options, (o) => o.value === DEP)) { dp.value = DEP; dp.dispatchEvent(new Event('change', { bubbles: true })); }
    const og = document.getElementById('npOrigen'); og.value = 'Pendiente'; og.dispatchEvent(new Event('change', { bubbles: true }));
  }, E.deposito || 'prueba');
  await tocar('.np-pago .np-chip', medio);
  const pagoSel = await pg.evaluate(() => [].map.call(document.querySelectorAll('.np-chip[data-pago].active'), (b) => b.dataset.pago).join());
  chk(medio + ': tocar el chip deja elegido «' + medio + '»', pagoSel === medio, pagoSel);
  if (yaPago) await tocar('#npYaCobrado');
  const antes = await pg.evaluate(() => (D.pedidos || []).filter((x) => /PRUEBA Robot/.test(x.c || '')).map((x) => x.h + '|' + x.n));
  return { prod, antes };
}
async function guardar(antes) {
  const n0 = await pg.evaluate(() => window.__posts.length);
  const g = await tocar('button', 'GUARDAR', '#nuevoView', { espera: 300 }) || await tocar('button', 'GUARDAR');
  if (!g) return { err: 'no encontré GUARDAR' };
  /* El número: lo que devuelve el alta. */
  const alta = await esperar((n0) => { const p = window.__posts.slice(n0).find((x) => /alta/i.test(x.u) && x.r); if (!p) return null; const m = /"n"\s*:\s*"?(\d+)/.exec(p.r) || /"ref"\s*:\s*"?(\d+)/.exec(p.r); return { u: p.u, r: p.r.slice(0, 200), n: m && m[1] }; }, n0, 30000);
  return alta || { err: 'el alta no volvió en 30 s', posts: await pg.evaluate((n0) => window.__posts.slice(n0).map((p) => p.u + ' → ' + (p.r || '…').slice(0, 80)), n0) };
}

/* El cuadro de cobro abierto: elegir medio (si hace falta), montos de Mixto, quién cobró, y Confirmar. */
async function cobrarEnCuadro(medio, tot) {
  const ef = medio === 'Efectivo' ? tot : medio === 'Mixto' ? Math.round(tot / 2) : 0, tr = tot - ef;
  const pre = await pg.evaluate(() => [].map.call(document.querySelectorAll('#cobroRutaFp .cobro-pill.on'), (b) => b.textContent.trim()).join());
  chk(medio + ': el cuadro viene con «' + medio + '» elegido (lo que se cargó)', pre === medio, pre);
  if (pre !== medio) await tocar('#cobroRutaFp .cobro-pill', medio);
  if (medio === 'Mixto') { await pg.fill('#cobroRecEf', String(ef)); await pg.fill('#cobroRecMP', String(tr)); await T(400); }
  if (medio === 'Efectivo') {
    /* Lo que te dio el cliente: si lo pide, el total justo. */
    if (await visible('#cobroRecEf')) { const v = await pg.inputValue('#cobroRecEf').catch(() => ''); if (!v) { await pg.fill('#cobroRecEf', String(tot)); await T(300); } }
  }
  if (await visible('#cobroQuienSection')) {
    const q = await pg.evaluate(() => { const qs = [].slice.call(document.querySelectorAll('#cobroQuien .cobro-pill')).filter((b) => b.offsetParent); return { hay: qs.length, on: qs.filter((b) => b.classList.contains('on')).map((b) => b.textContent.trim()) }; });
    if (q.hay && !q.on.length) await tocar('#cobroQuien .cobro-pill', '');
  }
  const b = await pg.evaluate(() => { const b = document.getElementById('btnCobroRutaOk'); const er = document.getElementById('cobroRutaErr'); return { txt: b ? b.textContent.trim() : '', dis: !!(b && b.disabled), err: er ? er.innerText.replace(/\s+/g, ' ').trim().slice(0, 160) : '' }; });
  if (!chk(medio + ': «Confirmar cobro» habilitado', !b.dis, b)) { await foto('cuadro_trabado_' + medio); return { ef, tr, ok: false }; }
  await foto('cuadro_' + medio);
  /* La cuenta que va a mandar la pantalla, leída justo antes de confirmar (después Cobranza recarga las cuentas). */
  const cta = await pg.evaluate((m) => { try { return _ctaDeCobro(_cobroRutaState || { cta: '' }, m) || ''; } catch (e) { return '?'; } }, medio);
  await tocar('#btnCobroRutaOk', '', '', { espera: 800 });
  const cerro = await esperar(() => { const o = document.getElementById('cobroRutaOverlay'); return !o || o.classList.contains('hidden'); }, null, 15000);
  chk(medio + ': el cuadro se cierra después de confirmar', !!cerro, await pg.evaluate(() => ({ err: (document.getElementById('cobroRutaErr') || {}).innerText, c: window.__confirms.slice(-2) })));
  return { ef, tr, ok: !!cerro, cta };
}
async function chequearCobrado(h, n, medio, ef, tr, cta) {
  const vp = await verPedido(h, n, (v) => v.estado_pago === 'Cobrado', 25000);
  const post = await pg.evaluate((n) => (window.__posts.filter((x) => /cobrar/i.test(x.u) && x.b.indexOf(String(n)) >= 0).pop() || {}), n);
  const mc = /"cuenta"\s*:\s*"([^"]*)"/.exec(post.b || ''); console.log('       POST ' + (post.u || '?') + ' cuenta=«' + (mc ? mc[1] : '?') + '»');
  if (!chk(medio + ': #' + n + ' en la base Cobrado', vp && vp.estado_pago === 'Cobrado', vp)) return;
  chk(medio + ': forma «' + vp.forma + '»', vp.forma === medio, vp);
  chk(medio + ': importes ef ' + vp.efectivo + ' / tr ' + vp.transferencia + ' (esperaba ' + ef + ' / ' + tr + ')', Math.abs(Number(vp.efectivo) - ef) <= 100 && Math.abs(Number(vp.transferencia) - tr) <= 0.5, vp);
  chk(medio + ': quién cobró «' + (vp.cobrador || '') + '»', !!vp.cobrador, vp);
  /* La pantalla tiene que mandar Galicia; la base guarda «prueba» en todo pedido PRUEBA (triggers _so/_op_cuenta_prueba). */
  if (tr > 0) chk(medio + ': la pantalla manda la cuenta «' + (mc ? mc[1] : '?') + '» (Galicia) y la base la guardó («' + vp.cuenta + '», PRUEBA → prueba)', mc && mc[1] === 'galicia' && cta === 'galicia' && vp.cuenta === 'prueba', { post: post.b && post.b.slice(0, 300), vp });
  const cj = await cajaDe(h, n);
  chk(medio + ': en la caja ef ' + cj.ef + ' / digital ' + cj.dig + ' (' + cj.cta + ')', !cj.err && cj.n > 0 && Math.abs(cj.ef - ef) <= 100 && Math.abs(cj.dig - tr) <= 0.5, cj);
  await pg.evaluate(() => { try { _recargarPedidos(); } catch (e) {} });
  const pd = await esperar(([h, n]) => { const p = (D.pedidos || []).find((x) => x.h === h && String(x.n) === String(n)); return p && p.ep === 'Cobrado' ? { es: p.es, ep: p.ep } : null; }, [h, n], 15000);
  chk(medio + ': la pantalla lo muestra Entregado + Cobrado', pd && pd.es === 'Entregado', pd);
}

/* ── FLUJO 1: «Lo cobro después» y cobrar desde COBRANZA ───────────────────────────────────────────────────────── */
async function flujoCobranza() {
  const medios = (process.env.MEDIOS || 'Efectivo,Transferencia,Mixto').split(',');
  for (const medio of medios) {
    console.log('\n── ' + medio + ' · Lo cobro después → Cobranza');
    const f = await cargarPedido(medio, false);
    if (f.err) { chk(medio + ': cargar el formulario', false, f); continue; }
    await foto('np_' + medio);
    const al = await guardar(f.antes);
    if (!chk(medio + ': GUARDAR da el alta', al && al.n, al)) continue;
    const n = al.n, tot = f.prod.total;
    /* Sin «Ya me pagó» no tiene que abrirse ningún cuadro de cobro. */
    await T(2500);
    chk(medio + ': sin «Ya me pagó» no se abre el cobro', !(await visible('#cobroRutaOverlay')));
    const v0 = await verPedido('Home', n, (v) => !!v.estado_pago, 15000);
    chk(medio + ': #' + n + ' quedó Entregado + No Cobrado, forma ' + (v0 && v0.forma), v0 && v0.estado_pago !== 'Cobrado' && v0.forma === medio, v0);
    /* Listo → y a COBRANZA, con el toque en la pestaña. */
    await tocar('button', 'Listo', '#nuevoView', { callado: true });
    await tocar('.tab[data-tab="cobros"]', '');
    const card = await esperar((n) => {
      const cs = [].slice.call(document.querySelectorAll('#cobrosView .cobro-card, #cobrosList .cobro-card, .cobro-card')).filter((c) => c.offsetParent && /PRUEBA Robot/.test(c.textContent) && c.textContent.indexOf('#' + n) >= 0);
      return cs.length ? { cg: cs[0].classList.contains('cg-card'), txt: cs[0].innerText.replace(/\s+/g, ' ').slice(0, 200), casa: cs[0].getAttribute('data-casa') || '' } : null;
    }, n, 30000);
    if (!chk(medio + ': #' + n + ' aparece en COBRANZA', !!card)) { await foto('cobranza_sin_' + medio); continue; }
    console.log('       tarjeta: ' + (card.cg ? '(agrupada) ' : '') + card.txt.slice(0, 140));
    if (/Es un pedido tuyo/.test(card.txt)) { chk(medio + ': la tarjeta deja cobrar (dice «Es un pedido tuyo»)', false, card); continue; }
    if (card.cg) {
      /* Agrupada: tildar el renglón de este pedido y «Cobrar…». */
      const sel = '.cg-card[data-casa="' + card.casa.replace(/"/g, '\\"') + '"]';
      const on = await pg.evaluate(([sel, n]) => { const r = [].slice.call(document.querySelectorAll(sel + ' .cg-row')); return r.map((x) => ({ n: (x.textContent.match(/#(\d+)/) || [])[1], on: x.classList.contains('on') })); }, [sel, n]);
      for (const r of on) { if ((r.n === String(n)) !== r.on) await tocar(sel + ' .cg-row', '#' + r.n); }
      await tocar(sel + ' .cg-cobrar', 'Cobrar');
    } else {
      await pg.evaluate((n) => { const c = [].slice.call(document.querySelectorAll('.cobro-card')).find((c) => c.offsetParent && c.textContent.indexOf('#' + n) >= 0); if (c) c.setAttribute('data-au', 'x'); }, n);
      await tocar('.cobro-card[data-au="x"] .cobro-btn-cobrado', 'Cobrar');
    }
    const abierto = await esperar(() => { const o = document.getElementById('cobroRutaOverlay'); return o && !o.classList.contains('hidden') ? (document.getElementById('cobroRutaSub') || {}).textContent || 'abierto' : null; }, null, 10000);
    if (!chk(medio + ': «Cobrar» abre el cuadro (' + (abierto || '') + ')', !!abierto)) { await foto('no_abre_' + medio); continue; }
    const c = await cobrarEnCuadro(medio, tot);
    if (!c.ok) { await pg.evaluate(() => { try { cerrarCobroRuta(); } catch (e) {} }); continue; }
    await chequearCobrado('Home', n, medio, c.ef, c.tr, c.cta);
    const sigue = await esperar((n) => ![].slice.call(document.querySelectorAll('.cobro-card')).some((c) => c.offsetParent && c.textContent.indexOf('#' + n) >= 0 && /PRUEBA Robot/.test(c.textContent)), n, 20000);
    chk(medio + ': ya no figura en COBRANZA', !!sigue);
    await foto('cobranza_despues_' + medio);
  }
}

/* ── FLUJO 1b: «Ya me pagó» por la pantalla, tocando «Listo →» apenas guarda (como Tadeo) ─────────────────────── */
async function flujoYaPago() {
  const medios = (process.env.MEDIOS || 'Efectivo,Transferencia,Mixto').split(',');
  for (const medio of medios) {
    console.log('\n── ' + medio + ' · Ya me pagó');
    const f = await cargarPedido(medio, true);
    if (f.err) { chk(medio + ': cargar el formulario', false, f); continue; }
    chk(medio + ': el toque en «Ya me pagó» la tilda', await pg.evaluate(() => !!(document.getElementById('npYaCobrado') || {}).checked));
    if (medio === 'Mixto' && await visible('#npEfMixto')) { await pg.fill('#npEfMixto', String(Math.round(f.prod.total / 2))); await pg.fill('#npTrMixto', String(f.prod.total - Math.round(f.prod.total / 2))); }
    const n0 = await pg.evaluate(() => window.__posts.length);
    const g = await tocar('button', 'GUARDAR', '#nuevoView', { espera: 150 });
    if (!g) { chk(medio + ': GUARDAR', false); continue; }
    await tocar('button', 'Listo', '#nuevoView', { callado: true, espera: 200 });
    const cu = await esperar(() => { const o = document.getElementById('cobroRutaOverlay'); if (!o || o.classList.contains('hidden')) return null; const s = (document.getElementById('cobroRutaSub') || {}).textContent || ''; const m = s.match(/#(\d+)/); return /PRUEBA Robot/.test((document.getElementById('cobroRutaTitle') || {}).textContent || '') && m ? m[1] : null; }, null, 60000);
    if (!chk(medio + ': después de GUARDAR y «Listo →» se abre el cobro', !!cu, await pg.evaluate((n0) => window.__posts.slice(n0).map((p) => p.u + ' → ' + (p.r || '…').slice(0, 80)), n0))) continue;
    const c = await cobrarEnCuadro(medio, f.prod.total);
    if (!c.ok) { await pg.evaluate(() => { window.__confirmResp = true; try { cerrarCobroRuta(); } catch (e) {} }); continue; }
    await chequearCobrado('Home', cu, medio, c.ef, c.tr, c.cta);
  }
}

/* ── FLUJO 2: la juntada. Alta por la pantalla («Juntada o evento»), comensales con la directa del robot (una
   «Nueva persona» crearía una ficha real en el CRM que robot_limpiar no borra), y lo demás con toques: «Cobrar a…»,
   «Marcar pagó», la línea de quién falta y deshacer un pago. */
const lineaDe = (sel) => pg.evaluate((sel) => { const c = document.querySelector(sel); if (!c) return null; const r = c.querySelector('.com-desp-r'); return r ? { t: r.textContent.trim(), cabe: r.scrollWidth <= r.clientWidth + 1 } : { t: '(sin línea)', cabe: true }; }, sel);
const esperarLinea = (sel, re, ms) => esperar(([sel, src]) => { const n = (sel.match(/"(\d+)"/) || [])[1]; const c = [].slice.call(document.querySelectorAll('.cobro-card')).find((c) => c.offsetParent && c.textContent.indexOf('#' + n) >= 0 && /PRUEBA Robot/.test(c.textContent)); if (c) c.setAttribute('data-au', n); const r = c && c.querySelector('.com-desp-r'); return r && new RegExp(src).test(r.textContent) ? r.textContent.trim() : null; }, [sel, re.source], ms || 30000);
const botonesCobrar = (sel) => pg.evaluate((sel) => [].map.call(document.querySelectorAll(sel + ' .com-cobrar button'), (b) => b.textContent.trim()), sel);
async function flujoJuntada() {
  console.log('\n── Juntada');
  const p0 = await pg.evaluate(() => window.__posts.length);
  const f = await cargarPedido('Transferencia', false, { qty: 3, juntada: true });
  if (f.err) return chk('juntada: cargar el formulario', false, f);
  const al = await guardar(f.antes);
  if (!chk('juntada: GUARDAR da el alta', al && al.n, al)) return;
  const n = al.n, tot = f.prod.total;
  await pg.evaluate(() => { try { _recargarPedidos(); } catch (e) {} });
  const P = await esperar((n) => { const p = (D.pedidos || []).find((x) => x.h === 'Home' && String(x.n) === String(n)); return p && p.grp ? { h: p.h, n: p.n, r: p.r || p.row || 0, grp: p.grp || '', $: p.$ } : null; }, n, 20000);
  if (!chk('juntada: #' + n + ' en Pedidos con su juntada («' + (P && P.grp) + '»)', P && P.grp, P)) return;
  for (const nm of ['PRUEBA Ana', 'PRUEBA Beto']) {
    const ri = await rpc('juntada_integrante_directo', { p: { action: 'juntadaIntegrante', grp: 'Pedido Home ' + n, nombre: nm } });
    chk('juntada: sumar a ' + nm, ri && ri.ok, ri);
  }
  const cobro = () => rpc('pedido_cobro_pantalla', { p: { h: 'Home', n: String(n), r: P.r } });
  const pagos = async (cuantos, ms) => { let c = null; const t0 = Date.now(); while (Date.now() - t0 < (ms || 60000)) { c = await cobro().catch(() => null); if (c && (c.pagos || []).length === cuantos) break; await T(2000); } return ((c && c.pagos) || []); };
  await pg.evaluate(() => { try { _recargarPedidos(); } catch (e) {} });
  await irCobranza(); await tarjetaDe(n);
  const sel = await tarjetaDe(n);
  const re = () => tarjetaDe(n);
  if (!chk('juntada: #' + n + ' en COBRANZA', !!sel)) return foto('jnt_sin_tarjeta');
  let L0 = await esperarLinea(sel, /falta/);
  let L = await lineaDe(sel);
  chk('juntada: con 3 debiendo, la línea lo dice en una línea («' + (L && L.t) + '»)', !!L0 && /faltan 3/.test(L.t) && L.cabe, L);
  await foto('jnt_1_tres');
  await re(); const b3 = await tocar(sel + ' .com-cobrar button', 'Cobrar a');
  chk('juntada: con 3 debiendo, «Cobrar a… (3)»', b3 && /\(3\)/.test(b3.txt), b3);
  await T(600);
  chk('juntada: «Cobrar a…» abre la juntada', await pg.evaluate((sel) => { const d = document.querySelector(sel + ' details.com-desp'); return !!(d && d.open); }, sel));
  await pg.evaluate(() => { window.__confirmResp = true; });
  await re(); const aj = await abrirJnt(sel);
  await esperar((sel) => !!document.querySelector(sel + ' .com-pagar[data-n="PRUEBA Ana"]') || (document.querySelector(sel + ' details.com-desp:not([open])') && (document.querySelector(sel + ' details.com-desp').open = true, false)), sel, 20000);
  const ana = await tocar(sel + ' .com-pagar[data-n="PRUEBA Ana"]', '');
  chk('juntada: «Marcar pagó» de Ana a la vista', !!ana, aj);
  const pg1 = await pagos(1);
  const conf1 = await pg.evaluate(() => window.__confirms.slice(-1)[0] || '');
  chk('juntada: «Marcar pagó» pregunta y nombra Galicia («' + conf1.replace(/\s+/g, ' ').slice(0, 80) + '»)', /Galicia/i.test(conf1), conf1);
  chk('juntada: el pago de Ana está en la base (' + pg1.map((x) => x.nota + ' ' + x.monto).join(', ') + ')', pg1.length === 1 && /PRUEBA Ana/.test(pg1[0].nota || '') && Math.abs(Number(pg1[0].monto) - tot / 3) < 1, pg1);
  await irCobranza(); await tarjetaDe(n);
  L = await esperarLinea(sel, /falta(?!n 3)/);
  chk('juntada: con 2 debiendo, la línea no nombra a Ana («' + L + '»)', !!L && !/Ana/.test(L), L);
  await re(); const bts = await botonesCobrar(sel);
  chk('juntada: con 2 debiendo, un «Cobrar a» por persona (' + bts.join(' | ') + ')', bts.length === 2 && bts.every((t) => /^Cobrar a .*\$/.test(t)), bts);
  /* Los botones llevan el nombre entero en data-n (el texto usa el corto: «PRUEBA B.»). */
  const cobrarA = async (nm) => { await re(); const b = await tocar(sel + ' .com-cobrar button[data-n="' + nm + '"]', ''); return b; };
  const bB = await cobrarA('PRUEBA Beto');
  chk('juntada: botón «Cobrar a» de Beto (' + (bB && bB.txt) + ')', !!bB);
  const pg2 = await pagos(2);
  chk('juntada: «Cobrar a Beto» deja su pago a su nombre (' + pg2.map((x) => x.nota).join(', ') + ')', pg2.length === 2 && pg2.some((x) => /PRUEBA Beto/.test(x.nota || '')), pg2);
  const post = await pg.evaluate(() => window.__posts.filter((x) => /cobrarParcial|cobro_parcial/i.test(x.u + x.b)).slice(-1).map((x) => x.b)[0] || '');
  chk('juntada: fue un pago a cuenta a nombre de Beto, a Galicia, sin marcarCobrado', /"pagador":"PRUEBA Beto"/.test(post) && /"cuenta":"galicia"/.test(post) && !(await pg.evaluate((p0) => window.__posts.slice(p0).some((x) => /marcarCobrado|pedido_cobrar_directo/.test(x.u + x.b)), p0)), post.slice(0, 300));
  await irCobranza(); await tarjetaDe(n);
  L = await esperarLinea(sel, /falta /);
  chk('juntada: queda uno y la línea lo nombra («' + L + '»)', !!L && /Robot/.test(L), L);
  await re(); const aj2 = await abrirJnt(sel);
  await re(); const dsh = await tocar(sel + ' [onclick*="comPagoInfo"][data-n="PRUEBA Ana"]', '');
  if (!chk('juntada: el pago de Ana tiene para deshacer (el «Pagó» de su renglón)', !!dsh, aj2)) await foto('jnt_sin_deshacer');
  const pg3 = await pagos(1);
  chk('juntada: deshecho, queda solo el de Beto (' + pg3.map((x) => x.nota).join(', ') + ')', pg3.length === 1 && /Beto/.test(pg3[0].nota || ''), pg3);
  /* JNT_OTRO=1: como si se hubiera deshecho en OTRO celular (este no se entera): se borra lo que anotó el deshacer. */
  if (process.env.JNT_OTRO) await pg.evaluate(() => { try { localStorage.removeItem('maleu_jnt_desh'); } catch (e) {} });
  await irCobranza(); await tarjetaDe(n);
  L = await esperarLinea(sel, /faltan /);
  chk('juntada: Ana vuelve a faltar: la línea nombra a 2 («' + L + '»)', !!L && /A\.|Ana/.test(L) && /R\.|Robot/.test(L), L);
  for (const nm of ['PRUEBA Ana', 'PRUEBA Robot']) {
    const b = await cobrarA(nm);
    if (!chk('juntada: «Cobrar a» de ' + nm, !!b, await botonesCobrar(sel))) continue;
    await T(2500); await irCobranza(); await tarjetaDe(n);
  }
  const vp = await verPedido('Home', n, (v) => v.estado_pago === 'Cobrado', 60000);
  const pfin = await cobro().catch(() => null);
  const resp = await pg.evaluate(() => window.__posts.filter((x) => /cobrarParcial|cobro_parcial/i.test(x.u + x.b)).map((x) => ((/"pagador":"([^"]*)"/.exec(x.b) || [])[1] || '') + ' op=' + ((/"clientOpId":"([^"]*)"/.exec(x.b) || [])[1] || '') + ' → ' + String(x.r || '').slice(0, 160)));
  resp.forEach((x) => console.log("       resp " + x));
  chk('juntada: pagaron los 3 → el pedido queda Cobrado', vp && vp.estado_pago === 'Cobrado', { ep: vp && vp.estado_pago, pagos: pfin && (pfin.pagos || []).map((x) => x.nota + ' ' + x.monto), resp });
  const fuera = await esperar((n) => ![].slice.call(document.querySelectorAll('.cobro-card')).some((c) => c.offsetParent && c.textContent.indexOf('#' + n) >= 0), n, 30000);
  chk('juntada: ya no figura en COBRANZA', !!fuera);
  await foto('jnt_fin');
}
async function abrirJnt(sel) {
  const st = await pg.evaluate((sel) => { const c = document.querySelector(sel); const d = c && c.querySelector('details.com-desp'); return { hay: !!c, d: !!d, open: !!(d && d.open) }; }, sel);
  if (st.d && !st.open) await tocar(sel + ' details.com-desp > summary', '');
  return pg.evaluate((sel) => { const c = document.querySelector(sel); const d = c && c.querySelector('details.com-desp'); return { hay: !!c, open: !!(d && d.open), pagar: c ? [].map.call(c.querySelectorAll('.com-pagar'), (b) => b.getAttribute('data-n')) : [], txt: d ? d.innerText.replace(/\s+/g, ' ').slice(0, 300) : '' }; }, sel);
}
/* ── FLUJO 3: Ruta y Armado (EXPLORAR=1 vuelca lo que se ve para armar los toques) ─────────────────────────────── */
async function pedidoPendiente(medio) {
  const f = await cargarPedido(medio || 'Transferencia', false);
  if (f.err) return f;
  await pg.evaluate(() => { const ee = document.getElementById('npEstadoEntrega'); ee.value = 'Pendiente'; ee.dispatchEvent(new Event('change', { bubbles: true })); });
  const al = await guardar(f.antes);
  return al && al.n ? { n: al.n, total: f.prod.total } : (al || { err: 'sin alta' });
}
async function volcar(et) {
  const v = await pg.evaluate(() => {
    const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const prueba = [].slice.call(document.querySelectorAll('#pg-ruta *')).filter((e) => vis(e) && e.children.length < 40 && /PRUEBA Robot/.test(e.textContent || '') && e.textContent.length < 600).slice(-6).map((e) => e.tagName + '.' + String(e.className).slice(0, 40) + ' «' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) + '»');
    const btns = [].slice.call(document.querySelectorAll('#pg-ruta [onclick]')).filter(vis).slice(0, 40).map((e) => (e.getAttribute('onclick') || '').slice(0, 60) + ' «' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) + '»');
    return { tab: typeof rutCurrentTab !== 'undefined' ? rutCurrentTab : '?', prueba, btns };
  });
  console.log('   [' + et + '] tab=' + v.tab + '\n     PRUEBA: ' + v.prueba.join('\n             ') + '\n     botones: ' + v.btns.join(' | ').slice(0, 2500));
}
async function armarPrueba(n) {
  /* La tarjeta del pedido PRUEBA en Armado (el día puede venir plegado). Solo se toca la que dice «PRUEBA Robot». */
  const marcar = () => pg.evaluate(() => { const c = [].slice.call(document.querySelectorAll('#armadoView .armado-card')).find((c) => c.offsetParent && /PRUEBA Robot/.test((c.querySelector('.armado-name') || {}).textContent || '')); if (!c) return null; document.querySelectorAll('[data-au="arm"]').forEach((x) => x.removeAttribute('data-au')); c.setAttribute('data-au', 'arm'); return { done: c.classList.contains('done'), txt: c.innerText.replace(/\s+/g, ' ').slice(0, 120) }; });
  const t0 = Date.now(); let c = null;
  while (Date.now() - t0 < 90000) { c = await marcar(); if (c) break; await tocar('[onclick*="toggleCollapse"]', 'HOY', '#armadoView', { callado: true, espera: 300 }); c = await marcar(); if (c) break; await T(1000); }
  if (c) { c.seg = Math.round((Date.now() - t0) / 1000); console.log('       en ARMADO a los ' + c.seg + ' s'); }
  return c;
}
async function entregarEnRuta(et) {
  /* La parada del pedido PRUEBA en RUTA: «Entregado» y la confirmación (o la pregunta del freezer). */
  await tocar('.tab[data-tab="ruta"]', '', '', { espera: 2500 });
  const parada = await esperar(() => { const t = (document.getElementById('rutaView') || {}).innerText || ''; return /PRUEBA Robot/.test(t) ? t.replace(/\s+/g, ' ').slice(0, 160) : null; }, null, 15000);
  if (!chk(et + ': la parada de PRUEBA Robot está en RUTA', !!parada)) { await volcar(et + ' ruta'); return false; }
  const e1 = await tocar('.rtc-cta.entregar', 'Entregado');
  if (!chk(et + ': botón «Entregado»', !!e1)) return false;
  const ov = await esperar(() => {
    const f = document.getElementById('rutFrzOv');
    if (f && f.getClientRects().length) return 'FREEZER ' + f.innerText.replace(/\s+/g, ' ').slice(0, 160) + ' · deps=' + [].map.call(f.querySelectorAll('[data-dep]'), (b) => b.getAttribute('data-dep')).join(',');
    const o = document.getElementById('confirmOverlay'); return o && !o.classList.contains('hidden') && o.getClientRects().length ? o.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; }, null, 8000);
  console.log('       cartel: ' + ov);
  if (!ov) { await foto('sin_cartel'); console.log('       ' + JSON.stringify(await pg.evaluate(() => ({ ovs: [].slice.call(document.querySelectorAll('[class*="overlay"],[class*="modal-ov"],[role="dialog"]')).filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed' && e.getClientRects().length).map((e) => (e.id || e.className) + ' «' + e.innerText.replace(/\s+/g, ' ').slice(0, 120) + '»').slice(0, 6), toast: [].map.call(document.querySelectorAll('.toast.show,#rutToast.show,#toast.show'), (t) => t.textContent.trim()), conf: window.__confirms.slice(-3) })))); }
  if (!chk(et + ': pregunta antes de entregar', !!ov)) return false;
  if (/^FREEZER/.test(ov)) {
    /* SOLO el depósito prueba: con otro, la entrega del pedido PRUEBA movería stock real. */
    if (!/deps=(.*,)?prueba(,|$)/.test(ov)) { chk(et + ': la pregunta del freezer ofrece el depósito prueba (si no, no se toca)', false, ov); await pg.evaluate(() => { const f = document.getElementById('rutFrzOv'); if (f) f.remove(); }); return false; }
    await tocar('#rutFrzOv [data-dep="prueba"]', '');
  } else await tocar('#confirmOverlay .btn-si', '');
  await T(800);
  const ov2 = await pg.evaluate(() => { const o = document.getElementById('confirmOverlay'); return o && !o.classList.contains('hidden') && o.getClientRects().length ? o.innerText.replace(/\s+/g, ' ').slice(0, 200) : ''; });
  if (ov2) { console.log('       2º cartel: ' + ov2); await tocar('#confirmOverlay .btn-si', ''); await T(800); }
  return true;
}
async function esEntregadoEnBase(n, ms) {
  return esperar((n) => { try { _recargarPedidos(); } catch (e) {} const p = (D.pedidos || []).find((x) => x.h === 'Home' && String(x.n) === String(n)); return p && p.es === 'Entregado' ? p.es : null; }, n, ms || 30000);
}
async function flujoRuta() {
  console.log('\n── Ruta y Armado');
  const a = await pedidoPendiente('Transferencia');
  if (!chk('ruta: alta Pendiente para hoy', a && a.n, a)) return;
  const n = a.n;
  await pg.evaluate(() => { try { _recargarPedidos(); } catch (e) {} });
  await tocar('.tab[data-tab="armado"]', '', '', { espera: 3000 });
  let c = await armarPrueba(n);
  if (!chk('armado: la tarjeta de PRUEBA Robot (#' + n + ') está en ARMADO', !!c, c)) { await volcar('armado'); return; }
  const n0 = await pg.evaluate(() => window.__posts.length);
  await tocar('.armado-card[data-au="arm"] .armado-check', '');
  const pre = await esperar(() => { const o = document.getElementById('confirmOverlay'); return o && !o.classList.contains('hidden') ? o.innerText.replace(/\s+/g, ' ').slice(0, 140) : null; }, null, 5000);
  chk('armado: pregunta «Pedido armado?» (' + pre + ')', /armado/i.test(pre || ''), pre);
  await tocar('#confirmOverlay .btn-si', 'armado');
  c = await esperar(() => { const c = [].slice.call(document.querySelectorAll('#armadoView .armado-card')).find((c) => /PRUEBA Robot/.test(c.textContent)); return c && c.classList.contains('done') ? 1 : null; }, null, 8000);
  chk('armado: la tarjeta queda tildada', !!c);
  const pa = await esperar((n0) => { const p = window.__posts.slice(n0).find((x) => /armad/i.test(x.u + x.b) && x.r); return p ? p.u + ' → ' + p.r.slice(0, 120) : null; }, n0, 20000);
  chk('armado: la base lo aceptó (' + (pa || 'sin respuesta') + ')', !!pa && /→ 200 /.test(pa) && !/"ok": ?false/.test(pa), pa);
  await foto('armado');
  if (!(await entregarEnRuta('ruta'))) return;
  chk('ruta: #' + n + ' quedó Entregado en la base', !!(await esEntregadoEnBase(n, 30000)));
  await foto('ruta_entregado');
  await irCobranza();
  chk('ruta: entregado sin cobrar → aparece en COBRANZA', !!(await tarjetaDe(n)));

  /* SIN SEÑAL: entregar con el celular sin red. La marca queda en la cola (localStorage), sobrevive a recargar la
     página y sale sola cuando vuelve la señal. */
  console.log('\n── Ruta sin señal');
  const b = await pedidoPendiente('Efectivo');
  if (!chk('sin señal: alta Pendiente', b && b.n, b)) return;
  await pg.evaluate(() => { try { _recargarPedidos(); } catch (e) {} });
  await tocar('.tab[data-tab="armado"]', '', '', { espera: 3000 });
  c = await armarPrueba(b.n);
  if (!chk('sin señal: tarjeta en ARMADO', !!c)) return;
  await tocar('.armado-card[data-au="arm"] .armado-check', ''); await tocar('#confirmOverlay .btn-si', 'armado'); await T(4000);
  await pg.context().setOffline(true);
  await pg.evaluate(() => { try { window.dispatchEvent(new Event('offline')); } catch (e) {} });
  const ok1 = await entregarEnRuta('sin señal');
  const cola = await pg.evaluate((n) => ({ enCola: (()=>{ try { const q = (JSON.parse(localStorage.getItem('maleu_ruta') || '{}').syncQueue || []); return q.some((x) => x.action === 'marcarEntregado' && String(x.id) === String(n)); } catch (e) { return false; } })() }), b.n);
  chk('sin señal: la entrega quedó en la cola del celular', ok1 && cola.enCola, cola);
  await foto('sin_senal');
  await pg.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await T(4000);
  const cola2 = await pg.evaluate((n) => (()=>{ try { const q = (JSON.parse(localStorage.getItem('maleu_ruta') || '{}').syncQueue || []); return q.some((x) => x.action === 'marcarEntregado' && String(x.id) === String(n)); } catch (e) { return false; } })(), b.n).catch(() => null);
  chk('sin señal: después de recargar la página la entrega sigue en la cola', cola2 === true, cola2);
  await pg.context().setOffline(false);
  await pg.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await pg.waitForFunction(() => typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 }).catch(() => {});
  await pg.evaluate(() => { try { go('ruta'); } catch (e) {} });
  const vacia = await esperar((n) => { try { if (typeof processSyncQueue === 'function') processSyncQueue(); } catch (e) {} return (()=>{ try { const q = (JSON.parse(localStorage.getItem('maleu_ruta') || '{}').syncQueue || []); return q.some((x) => x.action === 'marcarEntregado' && String(x.id) === String(n)); } catch (e) { return false; } })() ? null : 1; }, b.n, 60000);
  chk('sin señal: al volver la señal la cola se vacía sola', !!vacia);
  chk('sin señal: #' + b.n + ' quedó Entregado en la base', !!(await esEntregadoEnBase(b.n, 30000)));
}
/* ── FLUJO 4: Red. El representante PRUEBA carga su autopedido con SU usuario y PIN (como el nocturno); después, con
   toques: la bolsa en ARMADO, «Le falta marcar entregado» en Equipo, la excepción de comisión y que él marque entregado. */
async function autopedidoRep() {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  if (!cred.pinRep) return { err: 'falta pinRep en robot.json' };
  const prod = await pg.evaluate((pid) => { const s = (D.stock || []).find((x) => String(x.id) === String(pid) || String(x.a || x.abbr || '').toUpperCase() === 'TG'); return s ? { id: s.id, nombre: s.n || s.nombre || '', precio: Number(s.p || s.precio || 0) } : null; }, 14);
  for (const dias of [2, 4, 6, 8, 10, 12]) {
    const F = new Date(Date.now() + dias * 86400000), d = F.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
    const body = { action: 'redAutopedido', clientOrderId: 'robot-' + Date.now() + '-aud-red-' + dias, canal: 'Red', vendedor: 'PRUEBA Robot', nombre: 'PRUEBA Robot', telefono: String(E.telefono || '5490000000001'),
      barrioPrivado: 'PRUEBA', lote: '', dia: d.charAt(0).toUpperCase() + d.slice(1), fechaEntrega: F.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }), horario: 'A coordinar', pago: 'Transferencia', envio: 0,
      items: [{ id: Number(E.producto_red || E.producto_id || 46), nombre: 'PRUEBA', qty: 1, precio: 1000 }], total: 1000, trajo: 'Vendedor', telCliente: String(E.telefono || '5490000000001') };
    const r = await pg.evaluate(async ([u, pin, body]) => { const c = _sbCfgLogin(), H = (t) => ({ apikey: c.key, Authorization: 'Bearer ' + (t || c.key), 'Content-Type': 'application/json' });
      const lp = await (await fetch(c.url + '/rest/v1/rpc/login_pin', { method: 'POST', headers: H(), body: JSON.stringify({ p_usuario: u, p_pin: pin }) })).json();
      if (!lp || !lp.ok) return { paso: 'login', r: lp && { ok: lp.ok, err: lp.err } };
      const t = await _sbAuth(c.url, c.key, 'password', { email: lp.email, password: lp.clave });
      const x = await fetch(c.url + '/rest/v1/rpc/red_autopedido_directo', { method: 'POST', headers: H(t.access_token), body: JSON.stringify({ p: body }) });
      let j = null; try { j = await x.json(); } catch (e) {} return { http: x.status, r: j, dia: body.dia, fecha: body.fechaEntrega }; }, [cred.repUsuario || 'pruebarobot', String(cred.pinRep), body]);
    if (r && r.r && r.r.ok === false && /ya tiene el pedido|van desde el|reparte/.test(String(r.r.err || ''))) continue;
    return Object.assign({ prod }, r);
  }
  return { err: 'ningún día le sirvió al autopedido' };
}
async function libroPrueba() { const v = await rpc('robot_verificar', { p: {} }).catch(() => null); return v && v.libro && v.libro[E.deposito || 'prueba'] ? Number(v.libro[E.deposito || 'prueba'].q) : null; }
async function flujoRed() {
  console.log('\n── Red');
  const ap = await autopedidoRep();
  console.log('       autopedido: ' + JSON.stringify(ap).slice(0, 300));
  if (!chk('red: el representante carga su autopedido', ap && ap.r && ap.r.ok, ap)) return;
  const n = String(ap.r.n || '').replace(/\D/g, '') || String(ap.r.ref || '').replace(/\D/g, '');
  /* ── ABASTECIMIENTO: sin stock, el pedido abrió una OC al proveedor PRUEBA. Pedirla y recibirla con toques. */
  console.log('\n── Abastecimiento: la OC del pedido de Red');
  const la = await libroPrueba();
  await pg.evaluate(() => go('busqueda')); await T(7000);
  await tocar('#pg-abast .tab[data-tab="proveedores"]', '', '', { espera: 3000 });
  const ped = await tocar('[onclick^="abaPcPedido(\'PRUEBA\'"]', 'Marcar como pedido', '', { espera: 3000 });
  chk('abast: «Marcar como pedido» en la tarjeta del proveedor PRUEBA', !!ped);
  await tocar('#pg-abast .tab[data-tab="recibir"]', '', '', { espera: 4000 });
  if (process.env.EXPLORAR) await volcarAba('recibir después de pedir');
  /* La hoja de RECIBIR (19/11/2026): Había + Llega = Total → el freezer del producto (PRUEBA → prueba). */
  await tocar('.hj-prov', 'PRUEBA', '#pg-abast', { callado: true, espera: 1500 });
  const hj = await pg.evaluate(() => { const b = document.querySelector('#recibirList .hj'); if (!b) return null;
    return { cab: (b.querySelector('.hj-cab') || {}).innerText, pasos: (b.querySelector('.hj-pasos') || {}).innerText,
      filas: [].map.call(b.querySelectorAll('.hj-f'), (f) => ({ t: f.innerText.replace(/\s+/g, ' ').slice(0, 80), ins: [].map.call(f.querySelectorAll('input'), (i) => (i.id || i.className) + '=' + i.value + (i.disabled ? '[dis]' : '')) })),
      conf: (document.getElementById('hjConf') || {}).outerHTML ? document.getElementById('hjConf').textContent + (document.getElementById('hjConf').disabled ? ' [dis]' : '') : null, pie: (document.getElementById('hjPie') || {}).innerText }; });
  console.log('       hoja: ' + JSON.stringify(hj).slice(0, 1500));
  if (!chk('abast: la hoja de RECIBIR muestra a PRUEBA', hj && /PRUEBA/.test(hj.cab || ''), hj)) return;
  /* «Había»: lo que dice el libro (la cuenta de verdad); «Llega»: lo que dice la OC. */
  const fila = await pg.evaluate(() => { const f = [].find.call(document.querySelectorAll('#recibirList .hj-f'), (x) => /PRUEBA/.test(x.textContent)); if (!f) return null; f.setAttribute('data-au', 'hj'); return [].map.call(f.querySelectorAll('input:not([disabled])'), (i) => ({ id: i.id, cls: i.className, v: i.value, ph: i.placeholder })); });
  console.log('       fila PRUEBA: ' + JSON.stringify(fila));
  if (!fila || !fila.length) return chk('abast: la fila de PRUEBA tiene para cargar', false, fila);
  const hab = fila[0];
  if (hab && hab.id && !hab.v) await pg.fill('#' + hab.id, String(la == null ? 0 : la));
  await T(600);
  /* Tildar el renglón (controlado). */
  await tocar('.hj-f[data-au="hj"] .hj-top', '');
  await T(500);
  const n0 = await pg.evaluate(() => window.__posts.length);
  const hab2 = await pg.evaluate(() => { const b = document.getElementById('hjConf'); return b && !b.disabled; });
  const rv = hab2 ? await tocar('#hjConf', 'Revisar') : null;
  if (!chk('abast: «Revisar y confirmar» habilitado', !!rv, await pg.evaluate(() => ({ pie: (document.getElementById('hjPie') || {}).innerText, err: (document.querySelector('.hj-err') || {}).innerText })))) return;
  await T(1200);
  const res = await pg.evaluate(() => { const r = document.querySelector('#recibirList .hj-res, #recibirList [class*="resumen"]'); return { txt: r ? r.innerText.replace(/\s+/g, ' ').slice(0, 300) : '', btns: [].map.call(document.querySelectorAll('#recibirList button'), (b) => b.textContent.trim()).filter((t) => t).slice(0, 12) }; });
  console.log('       resumen: ' + JSON.stringify(res));
  const ok2 = await tocar('#recibirList button', 'Confirmar', '', { callado: true }) || await tocar('#recibirList button', 'confirmar', '', { callado: true });
  chk('abast: botón final para confirmar', !!ok2, res);
  await T(1500);
  /* Si pregunta (falta la mitad, etc.), «Cerrar con lo que llegó». */
  await tocar('button', 'Cerrar con lo que llegó', '', { callado: true });
  const rr = await esperar((n0) => { const p = window.__posts.slice(n0).find((x) => /recibirMercaderia|recepci|recibir_/i.test(x.u + x.b.slice(0, 200)) && !/ui_uso/.test(x.u) && x.r); return p ? p.u + ' → ' + p.r.slice(0, 160) : null; }, n0, 60000);
  chk('abast: la recepción llegó a la base (' + rr + ')', !!rr && /→ 200 /.test(rr) && !/"ok": ?false/.test(rr), rr);
  let lq = null; const tL = Date.now(); while (Date.now() - tL < 60000) { lq = await libroPrueba(); if (la != null && lq === la + 1) break; await T(3000); }
  chk('abast: el stock PRUEBA del freezer prueba subió 1 (' + la + ' → ' + lq + ')', la != null && lq === la + 1, { la, lq });
  await foto('abast_recibido');
  /* ── LA BOLSA: en ARMADO, el pedido de Red del representante. */
  console.log('\n── Red: la bolsa');
  await pg.evaluate(() => { try { _recargarPedidos(); } catch (e) {} go('ruta'); }); await T(2500);
  await tocar('.tab[data-tab="armado"]', '', '', { espera: 4000 });
  await tocar('[onclick*="toggleCollapse"]', '27/11', '#armadoView', { callado: true, espera: 1000 });
  if (process.env.EXPLORAR) await volcar('red armado');
  /* Armar la bolsa del representante (toggleArmadoMasivo → «Sí, listos») y dársela (entregarAVendedor). */
  const rc = await pg.evaluate(() => { const c = [].find.call(document.querySelectorAll('#armadoView .armado-card.red'), (x) => /PRUEBA Robot/.test(x.textContent)); if (!c) return null; c.setAttribute('data-au', 'red'); return c.innerText.replace(/\s+/g, ' ').slice(0, 200); });
  if (!chk('red: la bolsa de PRUEBA Robot está en ARMADO («' + rc + '»)', !!rc)) return;
  await tocar('.armado-card[data-au="red"] .armado-check', '', '', { callado: true }) || await tocar('.armado-card[data-au="red"] .armado-prods', '');
  const pre = await esperar(() => { const o = document.getElementById('confirmOverlay'); return o && !o.classList.contains('hidden') && o.getClientRects().length ? o.innerText.replace(/\s+/g, ' ').slice(0, 160) : null; }, null, 6000);
  chk('red: pregunta «Listo para PRUEBA Robot?» (' + pre + ')', /Listo para/.test(pre || ''), pre);
  await tocar('#confirmOverlay .btn-si', '');
  await T(2500);
  if (process.env.EXPLORAR) await volcar('red armada');
  const cartel = await pg.evaluate(() => { const c = document.querySelector('.armado-card[data-au="red"]') || [].find.call(document.querySelectorAll('#armadoView .armado-card.red'), (x) => /PRUEBA Robot/.test(x.textContent)); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
  chk('red: armada para otro día, el cartel dice cuándo aparece en RUTA (no «pasá a RUTA»)', /Aparece en RUTA el viernes 27\/11/i.test(cartel), cartel.slice(-120));
  /* La bolsa se da en RUTA el día de la bolsa (el viernes): el reloj de la PÁGINA va a ese día; la base sigue en la hora real. */
  const fe = ap.fecha; await pg.clock.setSystemTime(new Date(fe + 'T10:00:00-03:00'));
  console.log('       reloj de la página: ' + (await pg.evaluate(() => new Date().toString())));
  await pg.evaluate(() => { try { rutRender(); } catch (e) {} });
  await tocar('.tab[data-tab="ruta"]', '', '', { espera: 3000 });
  if (process.env.EXPLORAR) { await volcar('red en RUTA'); await foto('red_ruta'); }
  const n1 = await pg.evaluate(() => window.__posts.length);
  const eb = await tocar('[onclick^="entregarAVendedor("]', '', '#rutaView', { callado: true, espera: 1500 }) || await tocar('[onclick^="entregarAVendedor("]', '', '', { espera: 1500 });
  if (!chk('red: botón para darle la bolsa', !!eb, await pg.evaluate(() => [].map.call(document.querySelectorAll('[onclick^="entregarAVendedor("]'), (b) => b.textContent.trim().slice(0, 40))))) { await volcar('red sin bolsa'); return; }
  console.log('       bolsa: «' + eb.txt + '» · ' + (await pg.evaluate(() => window.__confirms.slice(-1)[0] || '')).replace(/\s+/g, ' ').slice(0, 160));
  const pb = await esperar((n1) => { const p = window.__posts.slice(n1).find((x) => /EntregadoAVendedor|bolsa/i.test(x.u + x.b.slice(0, 200)) && x.r); return p ? p.u + ' → ' + p.r.slice(0, 200) : null; }, n1, 30000);
  chk('red: la bolsa llegó a la base (' + pb + ')', !!pb && /→ 200 /.test(pb) && !/"ok": ?false/.test(pb), pb);
  const ev = await esperar((n) => { try { _recargarPedidos(); } catch (e) {} const p = (D.pedidos || []).find((x) => x.h === 'Red' && String(x.n) === String(n)); return p && (p.ev === 'Entregado' || p.entVend === 'Entregado') ? { ev: p.ev, es: p.es } : null; }, n, 30000);
  chk('red: #' + n + ' quedó «Entregado a vendedor» en Pedidos', !!ev, await pg.evaluate((n) => { const p = (D.pedidos || []).find((x) => x.h === 'Red' && String(x.n) === String(n)); return p ? { ev: p.ev, es: p.es, keys: Object.keys(p).join(',') } : null; }, n));
  await foto('red_bolsa');
  await pg.clock.setSystemTime(new Date());   /* la página vuelve a la hora real */
  /* ── EL REPRESENTANTE, en SU celular: entra con su usuario y PIN y marca «Entregado» en Mi Portal (el viernes). */
  console.log('\n── Mi Portal del representante PRUEBA');
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const ctx2 = await br.newContext(COMPU ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx2.addInitScript(INIT);
  const pr = await ctx2.newPage(); const errs2 = [];
  pr.on('pageerror', (e) => errs2.push('JS: ' + String(e.message).slice(0, 200)));
  await pr.clock.setSystemTime(new Date(fe + 'T18:00:00-03:00'));
  await pr.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pr.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
  await pr.fill('#loginUser', cred.repUsuario || 'pruebarobot'); await pr.fill('#loginPin', String(cred.pinRep));
  await pr.evaluate(() => panelDoLogin());
  const filaRep = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 120000) { const r = await pr.evaluate((n) => { const b = [].find.call(document.querySelectorAll('.hy-bt'), (x) => { const f = x.closest('.hy-f, .hy-filaRep, div'); return f && /PRUEBA Robot/.test(f.textContent) && x.tagName === 'BUTTON' && x.getClientRects().length; }); if (!b) return null; b.setAttribute('data-au', 'rep'); return { txt: b.closest('div').innerText.replace(/\s+/g, ' ').slice(0, 160) }; }, n).catch(() => null); if (r) return r; await T(1500); } return null; })();
  if (!chk('portal: el representante ve el pedido con «Entregado» para tocar', !!filaRep, await pr.evaluate(() => (document.getElementById('p-miportal') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 500)).catch(() => ''))) { await pr.screenshot({ path: path.join(OUT, 'au_portal_sin.png') }); await ctx2.close(); return; }
  console.log('       filaRep: ' + filaRep.txt);
  const b = await pr.evaluate(() => { const e = document.querySelector('.hy-bt[data-au="rep"]'); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await T(400); if (COMPU) await pr.mouse.click(b.x, b.y); else await pr.touchscreen.tap(b.x, b.y);
  await T(1500);
  const cf = await pr.evaluate(() => window.__confirms.slice(-1)[0] || '');
  console.log('       confirmación: ' + cf.replace(/\s+/g, ' ').slice(0, 140));
  await pr.screenshot({ path: path.join(OUT, 'au_' + (COMPU ? '1440' : '393') + '_portal.png') });
  const pe = await esperar((n) => { try { _recargarPedidos(); } catch (e) {} const p = (D.pedidos || []).find((x) => x.h === 'Red' && String(x.n) === String(n)); return p && p.es === 'Entregado' ? 1 : null; }, n, 40000);
  chk('portal: lo que marcó el representante quedó Entregado en la base (Red #' + n + ')', !!pe, await pr.evaluate(() => window.__posts.slice(-3).map((x) => x.u + ' → ' + String(x.r || '').slice(0, 120))));
  chk('portal: sin errores de JS', !errs2.length, errs2);
  await ctx2.close();
}
async function volcarAba(et) {
  const v = await pg.evaluate(() => {
    const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const R = document.getElementById('pg-abast') || document;
    const prueba = [].slice.call(R.querySelectorAll('*')).filter((e) => vis(e) && /PRUEBA/.test(e.textContent || '') && e.textContent.length < 400 && e.children.length < 30).slice(-5).map((e) => e.tagName + '.' + String(e.className).slice(0, 40) + ' «' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 220) + '»');
    const btns = [].slice.call(R.querySelectorAll('[onclick]')).filter((e) => vis(e) && /PRUEBA|Recib|recib|Pedir|OC/.test(e.textContent + (e.getAttribute('onclick') || ''))).slice(0, 25).map((e) => (e.getAttribute('onclick') || '').slice(0, 70) + ' «' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) + '»');
    return { prueba, btns };
  });
  console.log('   [' + et + ']\n     PRUEBA: ' + v.prueba.join('\n             ') + '\n     botones: ' + v.btns.join(' | ').slice(0, 2500));
}
async function irCobranza() {
  await pg.evaluate(() => { if (typeof go === 'function' && !(document.getElementById('pg-ruta') || {}).offsetParent) go('ruta'); });
  await tocar('.tab[data-tab="cobros"]', '', '', { callado: true, espera: 1500 });
}
async function tarjetaDe(n) {
  const ok = await esperar((n) => { const c = [].slice.call(document.querySelectorAll('.cobro-card')).find((c) => c.offsetParent && c.textContent.indexOf('#' + n) >= 0 && /PRUEBA Robot/.test(c.textContent)); if (!c) return null; c.setAttribute('data-au', String(n)); return 1; }, n, 30000);
  return ok ? '.cobro-card[data-au="' + n + '"]' : null;
}

(async () => {
  await abrir();
  console.log('robot: ' + (await pg.evaluate(() => SESSION.nombre + ' / ' + SESSION.usuario + ' / ' + SESSION.rol)) + ' · ' + MOTOR);
  if (process.env.LIMPIAR) { console.log('limpiar', JSON.stringify(await rpc('robot_limpiar', { p_corrida: 'audit-' + Date.now() })).slice(0, 500)); await br.close(); return; }
  E = await rpc('robot_entidades_pantalla', {}); if (process.env.EXPLORAR) console.log('E ' + JSON.stringify(E).slice(0, 600)); if (process.env.EXPLORAR) console.log('PRUEBA en D.stock ' + JSON.stringify(await pg.evaluate((sku) => (D.stock || []).filter((x) => /PRUEBA/i.test(JSON.stringify(x).slice(0, 300))).slice(0, 3), E.producto)).slice(0, 600));
  const fl = process.env.FLUJO || 'cobranza';
  try {
    if (/cobranza/.test(fl)) await flujoCobranza();
    if (/yapago/.test(fl)) await flujoYaPago();
    if (/juntada/.test(fl)) await flujoJuntada();
    if (/ruta/.test(fl)) await flujoRuta();
    if (/red/.test(fl)) await flujoRed();
  } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); await foto('revento'); }
  const ej = errs.filter((e) => !/favicon|ERR_ABORTED|WebKit encountered an internal error|ERR_INTERNET_DISCONNECTED/.test(e));
  chk('sin errores de JS ni de la base', ej.length === 0, [...new Set(ej)].slice(0, 12));
  if (!process.env.SIN_LIMPIAR) console.log('limpiar: ' + JSON.stringify(await rpc('robot_limpiar', { p_corrida: 'audit-' + Date.now() })).slice(0, 300));
  console.log('\n' + ok + ' ok · ' + mal + ' mal' + (hall.length ? '\n  · ' + hall.join('\n  · ') : ''));
  await br.close(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('REVENTÓ', e && e.stack || e); process.exit(1); });
