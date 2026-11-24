/* AUDITORÍA DE FLUJOS CON TOQUES REALES (22-23/11/2026, Organizador: «escanear sin escribir NO prueba nada»).
   Entra como el ROBOT (modo ensayo: nada a Apps Script; las directas de la base SÍ viajan) y recorre lo que Tadeo usa todos
   los días tocando la pantalla como él: WebKit a 393 con toque (MOTOR=chromium → 1440 con mouse y el cajón abierto).
   Solo entidades PRUEBA (cliente «PRUEBA Robot», teléfono del robot, depósito «prueba»). Al final: robot_limpiar.
   Cada toque comprueba que debajo del dedo esté el botón (elementFromPoint): si una capa lo tapa, es un hallazgo.
     FLUJO=cobranza   + Pedido «Lo cobro después» con Efectivo / Transferencia / Mixto → cobrarlo desde la tab COBRANZA
                      (24/11/2026: tab propia, al lado de Caja; se entra por el menú)
                      (la pantalla manda Galicia; la base guarda «prueba» en todo pedido PRUEBA).
     FLUJO=yapago     + Pedido «Ya me pagó» con cada medio, tocando «Listo →» apenas guarda (Home #2567).
     FLUJO=juntada    alta «Juntada o evento», «Cobrar a… (3)», «Marcar pagó», «Cobrar a X», deshacer un pago y volver a
                      marcarlo (JNT_OTRO=1: como si se hubiera deshecho en otro celular) → Cobrado. La línea dice quién falta.
     FLUJO=ruta       ARMADO (la casilla) → RUTA «Entregado» → Cobranza; y sin señal: la cola sobrevive a recargar y sale sola.
     FLUJO=red        el representante carga su autopedido (su usuario y PIN) → la OC en Abastecimiento (Marcar como pedido,
                      la hoja de RECIBIR) → la bolsa en ARMADO y RUTA (el reloj de la página en el viernes) → el
                      representante marca «Entregado» en Mi Portal.
     FLUJO=todo       todos.   MEDIOS=Efectivo,Mixto (opcional) solo esos medios.   LIMPIAR=1 solo robot_limpiar.
   PW=<playwright-core> BASE=http://localhost:8155/app.html OUT=<dir> node auditoria_flujos.js
   En el robot nocturno (GitHub) corre contra app.maleu.com.ar, a 393 (WebKit) y a 1440 (Chromium). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || os.tmpdir();
const MOTOR = process.env.MOTOR || 'webkit', COMPU = MOTOR === 'chromium' && !process.env.CEL;   /* CEL=1 con chromium: el celular a 393 (si WebKit no anda en la máquina) */
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const hall = [];
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; hall.push(t); console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 700) : '')); } return !!c; };

const INIT = `try{localStorage.setItem('maleu_ensayo','1');localStorage.removeItem('maleu_np_borrador');localStorage.removeItem('maleu_np_cola');}catch(e){}
  window.__confirms=[]; window.__confirmResp=true; window.confirm=function(m){window.__confirms.push(String(m).slice(0,200));return window.__confirmResp;};
  window.alert=function(m){window.__confirms.push('ALERT '+String(m).slice(0,200));};
  /* (24/11/2026) «Marcar pagó» pregunta cuánto pagó (831): contesta lo que diga __promptResp, o lo que propone la pantalla. */
  window.__promptResp=null; window.prompt=function(m,d){window.__confirms.push('PROMPT '+String(m).slice(0,200));return window.__promptResp!=null?String(window.__promptResp):(d==null?'':String(d));};
  window.__posts=[]; (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
    if(m!=='POST'||/auth\\/v1\\//.test(s)||/ui_medicion/.test(s))return f.apply(this,arguments);
    var it={u:s.replace(/^.*\\/rpc\\//,'rpc/').slice(0,70),b:String((x&&x.body)||'').slice(0,900),t:Date.now()}; window.__posts.push(it);
    return f.apply(this,arguments).then(function(r){ try{ r.clone().text().then(function(tx){it.r=r.status+' '+tx.slice(0,400);}); }catch(e){} return r; });};})();
  window.__shares=[]; window.__copiado=[]; window.__enToque=false;
  document.addEventListener('click',function(){ window.__enToque=true; setTimeout(function(){ window.__enToque=false; },0); },true);
  try{ Object.defineProperty(Navigator.prototype,'canShare',{configurable:true,value:function(d){ return !window.__sinShare&&!!(d&&d.files&&d.files.length); }});
    Object.defineProperty(Navigator.prototype,'share',{configurable:true,value:function(d){ window.__shares.push({d:d,toque:window.__enToque}); return Promise.resolve(); }}); }catch(e){}
  try{ Object.defineProperty(Navigator.prototype,'clipboard',{configurable:true,get:function(){ return {writeText:function(t){ window.__copiado.push(String(t)); return Promise.resolve(); }}; }}); }catch(e){}`;

let pg, br, errs = [];
/* Las credenciales: los secrets de GitHub (ROBOT_USUARIO, ROBOT_PIN, ROBOT_PIN_REP) o ~/.maleu/robot.json. Nunca se imprimen. */
function credRobot() {
  if (process.env.ROBOT_USUARIO && process.env.ROBOT_PIN) return { usuario: process.env.ROBOT_USUARIO, pin: process.env.ROBOT_PIN, repUsuario: process.env.ROBOT_REP_USUARIO || 'pruebarobot', pinRep: process.env.ROBOT_PIN_REP || '' };
  return JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
}
async function abrir() {
  br = await pw[MOTOR].launch();
  const ctx = await br.newContext(COMPU ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(INIT);
  pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push('JS: ' + String(e.message).slice(0, 200)));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push('consola: ' + m.text().slice(0, 200)); });
  pg.on('response', (r) => { if (r.status() >= 400 && /supabase\.co\/rest/.test(r.url())) errs.push('base ' + r.status() + ': ' + r.url().replace(/^.*\/rest\/v1\//, '').split('?')[0]); });
  const cred = credRobot();
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
/* El carrito de + Pedido con SOLO el producto PRUEBA, o un error: nunca un producto real (regla del 24/11/2026). */
function robotSoloPrueba([pid, q]) {
  pid = Number(pid);
  if (!(pid > 0)) return { err: 'falta el id de tienda de PRUEBA (robot_entidades_pantalla.producto_id): no uso un producto real' };
  if (!NP_CAT_FLAT.some((x) => x.id === pid)) { const it = { id: pid, abbr: 'PRUEBA', n: 'PRUEBA' }; NP_CAT.push({ cat: 'PRUEBA', items: [it] }); NP_CAT_FLAT.push(it); }
  if (!(npLineUnit('PRUEBA', '') > 0)) { try { window.NP_PRECIOS.PRUEBA = { p: 1000, c: 500, pc: 1000 }; } catch (e) {} }
  /* `npCart` NO se lee de window: npReset lo reasigna y la copia publicada queda vieja. Se mira el contador de cada tarjeta. */
  const otros = () => [].filter.call(document.querySelectorAll('[id^="npQty_"]'), (x) => x.id !== 'npQty_' + pid && Number(x.textContent) > 0).map((x) => x.id);
  if (otros().length) return { err: 'el carrito ya traía productos reales: ' + otros().join() };
  const t0 = (npDiscountInfo() || {}).total || 0;
  npQty(pid, q);
  const tot = (npDiscountInfo() || {}).total || 0, u = npLineUnit('PRUEBA', '');
  if (otros().length) return { err: 'el carrito no quedó solo con PRUEBA: ' + otros().join() };
  if (!(tot > 0) || t0 !== 0 || tot > u * q + 0.5) return { err: 'el total no es solo PRUEBA (antes ' + t0 + ', ahora ' + tot + ', PRUEBA ' + u + ' x ' + q + '): no uso un producto real' };
  return { id: String(pid), total: tot };
}
async function cargarPedido(medio, yaPago, opt) {
  opt = opt || {};
  await irNuevo();
  /* El robot no recibe las cuentas de cobro (vienen con la lectura de Red, solo admin/gerente): la suya, como única. */
  /* (23/11) Sin sembrar: las cuentas reales, como las ve Tadeo. Un cobro PRUEBA en «galicia» no entra a su caja
     (caja_light_base lee sales_order_real y order_payment_real, que dejan afuera lo PRUEBA). */
  await tocar('.np-zona [onclick*="Home"], [onclick^="npSetZona(\'Home\'"]', '', '', { callado: true }) || await pg.evaluate(() => npSetZona('Home'));
  await pg.fill('#npNombre', 'PRUEBA Robot'); await pg.fill('#npTel', String(E.telefono || '5490000000001')); await pg.fill('#npLote', '9');
  /* (24/11/2026) SOLO el producto PRUEBA. Hasta hoy, si PRUEBA no daba precio se caía a los ids 14, 1, 19 y 3: el 14 es la
     Torta Golosa y el robot le sacó 4 reales a ustariz (pedidos 905093-905098) más ~300 sin depósito. PRUEBA no tiene
     tarjeta en + Pedido (`catalogo_ruta` lo deja afuera a propósito): se la agrega el robot en SU navegador. */
  const prod = await pg.evaluate(robotSoloPrueba, [E.producto_id, opt.qty || 1]);
  if (prod && prod.err) return { err: prod.err };
  if (opt.juntada) {
    /* Vive en «Más opciones» (plegado): primero se abre. */
    if (!(await pg.evaluate(() => { const d = document.querySelector('details.np-extras'); return !d || d.open; }))) await tocar('details.np-extras > summary', '');
    await tocar('.np-dest .np-chip', 'Juntada o evento'); chk('+ Pedido: «Juntada o evento» queda elegido', await pg.evaluate(() => !!(document.getElementById('npGrupal') || {}).checked)); }
  if (!prod) return { err: 'sin producto con precio' };
  const hoy = await pg.evaluate(() => npIsoDe(new Date()));
  await tocar('#npFechas [onclick*="' + hoy + '"]', '', '', { callado: true }) || await pg.evaluate((hoy) => { const b = document.querySelector('#npFechas [onclick*="' + hoy + '"]'); if (b) b.click(); }, hoy);
  const depOk = await pg.evaluate((DEP) => {
    const ee = document.getElementById('npEstadoEntrega'); ee.value = 'Entregado'; ee.dispatchEvent(new Event('change', { bubbles: true }));
    const dp = document.getElementById('npDeposito'); if (dp && [].some.call(dp.options, (o) => o.value === DEP)) { dp.value = DEP; dp.dispatchEvent(new Event('change', { bubbles: true })); }
    const og = document.getElementById('npOrigen'); og.value = 'Pendiente'; og.dispatchEvent(new Event('change', { bubbles: true }));
    return !!dp && dp.value === DEP;
  }, E.deposito || 'prueba');
  /* (24/11/2026) Sin el depósito prueba, el pedido Entregado saldría del freezer por defecto (ustariz): corta. */
  if (!depOk) return { err: 'el selector «Sale de» no tiene el depósito prueba: no guardo (saldría de un freezer real)' };
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
/* (24/11/2026, Home 2574) DOS MIXTOS CON PROPINA, los que mordían. Ruta repartía el TOTAL en proporción a lo recibido:
   85.090 pagados con 80.000 en efectivo + 5.100 transferidos daba ef 79.991 / tr 5.099. Acá: 1.250 transferidos (exacto) y
   el resto en un billete redondeado a los $100 → sobran $50 de propina, que tienen que quedar en el EFECTIVO.
   «Mixto propina»: el billete justo. «Mixto vuelto»: un billete de mil de más y el vuelto. Esperado: tr 1.250 exacto,
   ef = total − 1.250, propina 50 en efectivo. Con el reparto viejo, con 4.000: ef 2.765 / tr 1.235. */
const MX_TR = 1250, MX_PROP = 50;
const esMixtoProp = (m) => m === 'Mixto propina' || m === 'Mixto vuelto';
const medioBase = (m) => (m.indexOf('Mixto') === 0 ? 'Mixto' : m);
async function cobrarEnCuadro(medio, tot) {
  const mb = medioBase(medio);
  let ef = mb === 'Efectivo' ? tot : mb === 'Mixto' ? Math.round(tot / 2) : 0, tr = tot - ef, recEf = ef, camEf = 0;
  if (esMixtoProp(medio)) {
    tr = MX_TR; ef = tot - MX_TR;
    recEf = Math.ceil((ef + 1) / 100) * 100; if (recEf - ef !== MX_PROP) recEf = ef + MX_PROP;   /* sobra justo la propina */
    if (medio === 'Mixto vuelto') { camEf = 1000; recEf += 1000; }
  }
  const pre = await pg.evaluate(() => [].map.call(document.querySelectorAll('#cobroRutaFp .cobro-pill.on'), (b) => b.textContent.trim()).join());
  chk(medio + ': el cuadro viene con «' + mb + '» elegido (lo que se cargó)', pre === mb, pre);
  if (pre !== mb) await tocar('#cobroRutaFp .cobro-pill', mb);
  if (mb === 'Mixto') { await pg.fill('#cobroRecEf', String(recEf)); await pg.fill('#cobroRecMP', String(tr)); await T(400); }
  if (camEf) {
    if (!(await visible('#cobroCamEf'))) await tocar('#cobroToggleCambio', '');
    await pg.fill('#cobroCamEf', String(camEf)); await T(400);
  }
  /* Lo que sobra: «Es propina», el botón que tocó Santos en el 2574. */
  if (esMixtoProp(medio)) { await tocar('button', 'Es propina', '#cobroRutaOverlay'); await T(400); }
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
  return { ef, tr, ok: !!cerro, cta, exacto: esMixtoProp(medio), prop: esMixtoProp(medio) ? MX_PROP : 0 };
}
async function chequearCobrado(h, n, medio, ef, tr, cta, ex) {
  ex = ex || {}; const tolEf = ex.exacto ? 0.5 : 100;
  const vp = await verPedido(h, n, (v) => v.estado_pago === 'Cobrado', 25000);
  const post = await pg.evaluate((n) => (window.__posts.filter((x) => /cobrar/i.test(x.u) && x.b.indexOf(String(n)) >= 0).pop() || {}), n);
  const mc = /"cuenta"\s*:\s*"([^"]*)"/.exec(post.b || ''); console.log('       POST ' + (post.u || '?') + ' cuenta=«' + (mc ? mc[1] : '?') + '»');
  if (!chk(medio + ': #' + n + ' en la base Cobrado', vp && vp.estado_pago === 'Cobrado', vp)) return;
  chk(medio + ': forma «' + vp.forma + '»', vp.forma === medioBase(medio), vp);
  chk(medio + ': importes ef ' + vp.efectivo + ' / tr ' + vp.transferencia + ' (esperaba ' + ef + ' / ' + tr + ')', Math.abs(Number(vp.efectivo) - ef) <= tolEf && Math.abs(Number(vp.transferencia) - tr) <= 0.5, vp);
  if (ex.exacto) chk(medio + ': propina ' + JSON.stringify(vp.propina) + ' (esperaba ' + ex.prop + ' en efectivo)', JSON.stringify(vp.propina || '').indexOf(String(ex.prop)) >= 0, vp);
  chk(medio + ': quién cobró «' + (vp.cobrador || '') + '»', !!vp.cobrador, vp);
  /* La pantalla tiene que mandar Galicia; la base guarda «prueba» en todo pedido PRUEBA (triggers _so/_op_cuenta_prueba). */
  if (tr > 0) chk(medio + ': la pantalla manda la cuenta «' + (mc ? mc[1] : '?') + '» (Galicia) y la base la guardó («' + vp.cuenta + '», PRUEBA → prueba)', mc && mc[1] === 'galicia' && cta === 'galicia' && vp.cuenta === 'prueba', { post: post.b && post.b.slice(0, 300), vp });
  const cj = await cajaDe(h, n);
  chk(medio + ': en la caja ef ' + cj.ef + ' / digital ' + cj.dig + ' (' + cj.cta + ')', !cj.err && cj.n > 0 && Math.abs(cj.ef - ef - (ex.prop || 0)) <= tolEf && Math.abs(cj.dig - tr) <= 0.5, cj);
  await pg.evaluate(() => { try { _recargarPedidos(); } catch (e) {} });
  const pd = await esperar(([h, n]) => { const p = (D.pedidos || []).find((x) => x.h === h && String(x.n) === String(n)); return p && p.ep === 'Cobrado' ? { es: p.es, ep: p.ep } : null; }, [h, n], 15000);
  chk(medio + ': la pantalla lo muestra Entregado + Cobrado', pd && pd.es === 'Entregado', pd);
}

/* ── FLUJO 1: «Lo cobro después» y cobrar desde COBRANZA ───────────────────────────────────────────────────────── */
async function flujoCobranza() {
  const medios = (process.env.MEDIOS || 'Efectivo,Transferencia,Mixto,Mixto propina,Mixto vuelto').split(',');
  for (const medio of medios) {
    console.log('\n── ' + medio + ' · Lo cobro después → Cobranza');
    const f = await cargarPedido(medioBase(medio), false, esMixtoProp(medio) ? { qty: 4 } : undefined);
    if (f.err) { chk(medio + ': cargar el formulario', false, f); continue; }
    await foto('np_' + medio);
    const al = await guardar(f.antes);
    if (!chk(medio + ': GUARDAR da el alta', al && al.n, al)) continue;
    const n = al.n, tot = f.prod.total;
    /* Sin «Ya me pagó» no tiene que abrirse ningún cuadro de cobro. */
    await T(2500);
    chk(medio + ': sin «Ya me pagó» no se abre el cobro', !(await visible('#cobroRutaOverlay')));
    const v0 = await verPedido('Home', n, (v) => !!v.estado_pago, 15000);
    chk(medio + ': #' + n + ' quedó Entregado + No Cobrado, forma ' + (v0 && v0.forma), v0 && v0.estado_pago !== 'Cobrado' && v0.forma === medioBase(medio), v0);
    /* Listo → y a COBRANZA, con el toque en la pestaña. */
    await tocar('button', 'Listo', '#nuevoView', { callado: true });
    await irCobranza();
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
    await chequearCobrado('Home', n, medio, c.ef, c.tr, c.cta, c);
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
    /* SIN_SENAL=1: dos fallas a la vez. GUARDAR sin red (el alta queda en la cola de + Pedido), «Listo →», COBRANZA, y la
       señal vuelve a los 8 s: el cuadro se tiene que abrir solo, esté donde esté. */
    if (process.env.SIN_SENAL) { await pg.context().setOffline(true); await pg.evaluate(() => window.dispatchEvent(new Event('offline'))); }
    const g = await tocar('button', 'GUARDAR', '#nuevoView', { espera: 150 });
    if (!g) { chk(medio + ': GUARDAR', false); continue; }
    await tocar('button', 'Listo', '#nuevoView', { callado: true, espera: 200 });
    if (process.env.SIN_SENAL) {
      await irCobranza({ callado: true, espera: 1000 });
      const cola = await pg.evaluate(() => { try { return (JSON.parse(localStorage.getItem('maleu_np_cola') || '[]') || []).length; } catch (e) { return -1; } });
      chk(medio + ' sin señal: el alta quedó en la cola de + Pedido (' + cola + ')', cola > 0, cola);
      await T(8000);
      await pg.context().setOffline(false); await pg.evaluate(() => window.dispatchEvent(new Event('online')));
    }
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
const esperarLinea = (sel, re, ms) => esperar(([sel, src]) => { const n = (sel.match(/"(\d+)"/) || [])[1]; const c = [].slice.call(document.querySelectorAll('.cobro-card')).find((c) => c.offsetParent && c.textContent.indexOf('#' + n) >= 0 && /PRUEBA Robot/.test(c.textContent)); if (c) { document.querySelectorAll('[data-au="' + n + '"]').forEach((x) => { if (x !== c) x.removeAttribute('data-au'); }); c.setAttribute('data-au', n); } const r = c && c.querySelector('.com-desp-r'); return r && new RegExp(src).test(r.textContent) ? r.textContent.trim() : null; }, [sel, re.source], ms || 30000);
/* (23/11/2026) «Mandar la cuenta»: el toque abre el compartir (simulado: WebKit de prueba no lo tiene) con un PNG y el
   texto, y los montos cierran contra lo que muestra la juntada en pantalla (`cont`: la tarjeta o '#ordBody'). */
const leerCuenta = (txt) => { const L = txt.split('\n'), num = (s) => Number(String(s || '').replace(/\./g, ''));
  const bl = []; let b = null;
  L.forEach((l) => { const m = /^\*(Le pasan a [^*]+)\*(?: \(alias ([^)]+)\))?:$/.exec(l); if (m) { b = { t: m[1], al: m[2] || '', f: [] }; bl.push(b); return; }
    const f = /^• (~)?(.+) \$([\d.]+)~?$/.exec(l); if (f && b) b.f.push({ ya: !!f[1], n: f[2], m: num(f[3]) }); });
  const iT = L.findIndex((l) => /^\*Total: /.test(l));
  return { cada: num((/cada uno \$([\d.]+)/.exec(txt) || [])[1]), total: num((/^\*Total: \$([\d.]+)\*$/m.exec(txt) || [])[1]), n: Number((/^Son (\d+) ·/m.exec(txt) || [])[1]),
    lineas: L.slice(0, Math.max(0, iT)).map((l) => num((/: \$([\d.]+)$/.exec(l) || [])[1])).filter((x) => x > 0), bl }; };
const cuentaDom = (cont) => pg.evaluate((cont) => { const c = document.querySelector(cont + ' .com'); if (!c) return null;
  const per = [].filter.call(c.querySelectorAll('.com-fila'), (f) => /Le toca/.test((f.querySelector('.com-sub') || {}).textContent || ''));
  const est = per.map((f) => ((f.querySelector('.com-est') || {}).textContent || '').trim());
  return { cada: Number(((c.querySelector('.com-cuenta b') || {}).textContent || '').replace(/\D/g, '')), n: per.length,
    falta: est.filter((t) => /^Falta/.test(t)).map((t) => Number(t.replace(/\D/g, ''))).sort((a, b) => a - b), pago: est.filter((t) => /^Pagó/.test(t)).length }; }, cont);
async function mandarCuenta(cont, nombre, totalEsperado) {
  const s0 = await pg.evaluate(() => window.__shares.length);
  /* La juntada se repinta cuando llegan sus datos (y la ficha, su cobro): se toca cuando el botón quedó quieto 1,5 s. */
  /* (24/11/2026) En COBRANZA la juntada va plegada y «Mandar la cuenta» queda AFUERA de la tarjeta, a la vista (.cobz-jnt). */
  const fuera = await pg.evaluate((cont) => { const c = document.querySelector(cont), j = c && c.closest('.cobz-jnt'); if (!j) return false; document.querySelectorAll('[data-aumandar]').forEach((x) => x.removeAttribute('data-aumandar')); j.setAttribute('data-aumandar', '1'); return true; }, cont);
  const sel = fuera ? '.cobz-jnt[data-aumandar="1"] > .com-mandar-ficha .com-mandar' : cont + ' .com-mandar';
  for (let k = 0; k < 20; k++) { const quieto = await pg.evaluate(async (sel) => { const a = document.querySelector(sel); if (!a) return false; await new Promise((r) => setTimeout(r, 1500)); return document.querySelector(sel) === a; }, sel); if (quieto) break; }
  const b = await tocar(sel, 'Mandar la cuenta');
  if (!chk(nombre + ': «Mandar la cuenta» a la vista y sin nada encima', !!b)) { await foto('mandar_' + nombre.replace(/\W+/g, '_')); return null; }
  await esperar((s0) => window.__shares.length > s0, s0, 5000);
  const r = await pg.evaluate(async (s0) => { const x = window.__shares[s0]; if (!x) return null; const f = x.d.files && x.d.files[0];
    const url = f ? await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(f); }) : '';
    const dim = url ? await new Promise((ok) => { const im = new Image(); im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => ok(null); im.src = url; }) : null;
    return { toque: x.toque, txt: String(x.d.text || ''), tipo: f && f.type, url, dim }; }, s0);
  if (!chk(nombre + ': el toque abre el compartir en el mismo toque, con un PNG y el texto', r && r.toque && r.tipo === 'image/png' && r.txt.length > 20, r && { toque: r.toque, tipo: r.tipo, txt: r.txt.slice(0, 80) })) return null;
  fs.writeFileSync(path.join(OUT, 'au_' + (COMPU ? '1440' : '393') + '_cuenta_' + nombre.replace(/\W+/g, '_') + '.png'), Buffer.from(r.url.split(',')[1], 'base64'));
  console.log('       texto:\n         ' + r.txt.replace(/\n/g, '\n         '));
  chk(nombre + ': la imagen es angosta (720 px = 360 a 2×, se lee a 393 sin zoom) · ' + (r.dim && r.dim.w + '×' + r.dim.h), r.dim && r.dim.w === 720 && r.dim.h > 300 && r.dim.h < 720 * 4, r.dim);
  const C = leerCuenta(r.txt), D0 = await cuentaDom(cont), M = C.bl.find((x) => /Maleu/.test(x.t));
  chk(nombre + ': «Son ' + C.n + ' · cada uno $' + C.cada + '» = la pantalla (' + (D0 && D0.n) + ', $' + (D0 && D0.cada) + ')', D0 && C.n === D0.n && C.cada === D0.cada, { C, D0 });
  chk(nombre + ': total $' + C.total + (totalEsperado ? ' = $' + totalEsperado : '') + ' y los renglones suman el total', C.total > 0 && (!totalEsperado || C.total === totalEsperado) && C.lineas.reduce((a, x) => a + x, 0) === C.total, C);
  if (M) chk(nombre + ': «Le pasan a Maleu (alias ' + M.al + ')»: lo que falta = los «Falta» de la pantalla, y ' + M.f.filter((x) => x.ya).length + ' tachados = los «Pagó»',
    M.al === 'maleu26' && JSON.stringify(M.f.filter((x) => !x.ya).map((x) => x.m).sort((a, b) => a - b)) === JSON.stringify(D0.falta) && M.f.filter((x) => x.ya).length === D0.pago, { M, D0 });
  chk(nombre + ': sin número de pedido ni «Home» (es para el cliente)', !/#\d|\bHome\b|PRUEBA Robot.*pidió/.test(r.txt), r.txt);
  return C;
}
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
  /* COBRANZA se repinta sola y la marca de la tarjeta se pierde: se vuelve a ubicar y se reintenta el toque (hasta 3). */
  const tocarT = async (sub, txt) => { for (let k = 0; k < 3; k++) { await re(); await abrirJnt(sel); const b = await tocar(sel + sub, txt || '', '', { callado: k < 2 }); if (b) return b; await T(800); } return null; };
  if (!chk('juntada: #' + n + ' en COBRANZA', !!sel)) return foto('jnt_sin_tarjeta');
  let L0 = await esperarLinea(sel, /falta/);
  let L = await lineaDe(sel);
  chk('juntada: con 3 debiendo, la línea lo dice en una línea («' + (L && L.t) + '»)', !!L0 && /faltan 3/.test(L.t) && L.cabe, L);
  await foto('jnt_1_tres');
  /* ¿Cuántas veces se REEMPLAZA la tarjeta estando quieto? En el iPhone, un toque cuyo elemento se reemplaza entre que el
     dedo baja y sube no hace clic. */
  const rep = await pg.evaluate(async (n) => { const box = document.getElementById('cobrosView') || document.body; let k = 0, f = 0;
    const mo = new MutationObserver((ms) => { ms.forEach((m) => { [].forEach.call(m.removedNodes, (x) => { if (x.nodeType === 1 && (x.matches && x.matches('.cobro-card') || x.querySelector && x.querySelector('.cobro-card')) && x.textContent.indexOf('#' + n) >= 0) k++; else if (x.nodeType === 1 && x.querySelector && x.querySelector('.com-pagar')) f++; }); }); });
    mo.observe(box, { childList: true, subtree: true }); await new Promise((r) => setTimeout(r, 20000)); mo.disconnect(); return { tarjeta: k, juntada: f }; }, n);
  console.log('       en 20 s quieto: la tarjeta se reemplazó ' + rep.tarjeta + ' veces, la juntada adentro ' + rep.juntada);
  chk('juntada: quieto 20 s, la tarjeta no se reemplaza sola más de 1 vez (' + rep.tarjeta + ' / ' + rep.juntada + ')', rep.tarjeta + rep.juntada <= 1, rep);
  /* (23/11) Guardó en + PEDIDO y se fue a COBRANZA: el salto automático de los 6 s a ARMADO no lo tiene que arrancar de acá. */
  const tabAhora = await pg.evaluate(() => (document.querySelector('#pg-ruta .tab.active') || {}).getAttribute ? document.querySelector('#pg-ruta .tab.active').getAttribute('data-tab') : '?');
  chk('juntada: guardé y me fui a COBRANZA: 20 s después sigo en COBRANZA (no me lleva a ARMADO)', tabAhora === 'cobros', tabAhora);
  /* «Mandar la cuenta» con los 3 debiendo, desde la tarjeta de COBRANZA (sin abrir la juntada). */
  await re(); const M1 = await mandarCuenta(sel, 'cuenta con 3 debiendo', tot);
  if (M1) {
    const M = M1.bl.find((x) => /Maleu/.test(x.t));
    chk('cuenta con 3 debiendo: 3 a Maleu, ninguno tachado, ningún otro bloque', M && M.f.length === 3 && !M.f.some((x) => x.ya) && M1.bl.length === 1, M1.bl);
    /* Sin compartir archivos (la compu vieja, otro navegador): copia el texto y avisa «Copiado». */
    const c0 = await pg.evaluate(() => { window.__sinShare = true; return window.__copiado.length; });
    await re(); await tocar(sel + ' .com-mandar', 'Mandar la cuenta', '', { callado: true }) || await tocar('.cobz-jnt[data-aumandar="1"] > .com-mandar-ficha .com-mandar', 'Mandar la cuenta');
    const cop = await esperar((c0) => window.__copiado.length > c0 ? window.__copiado[window.__copiado.length - 1] : null, c0, 4000);
    const toastT = await pg.evaluate(() => [].map.call(document.querySelectorAll('.toast,#toast,[id$="toast"],[id$="Toast"]'), (t) => t.textContent.trim()).join(' | '));
    chk('cuenta: sin compartir archivos copia el mismo texto y avisa «Copiado» (' + toastT.slice(0, 60) + ')', !!cop && leerCuenta(cop).total === tot && /Copiado/.test(toastT), { cop: cop && cop.slice(0, 80), toastT });
    await pg.evaluate(() => { window.__sinShare = false; });
  }
  await re(); const b3 = await tocar(sel + ' .com-cobrar button', 'Cobrar a');
  if (!chk('juntada: con 3 debiendo, «Cobrar a… (3)»', b3 && /\(3\)/.test(b3.txt), b3)) {
    console.log('       GEOMETRÍA ' + JSON.stringify(await pg.evaluate((sel) => { const c = document.querySelector(sel); if (!c) return 'sin tarjeta'; const b = c.querySelector('.com-cobrar button');
      const anc = []; let e = b; while (e && e !== document.body) { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); anc.push((e.id || e.className || e.tagName).toString().slice(0, 30) + ' ' + cs.display + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (e.hidden ? ' HIDDEN' : '')); e = e.parentElement; }
      return { n: document.querySelectorAll(sel).length, tab: typeof rutCurrentTab !== 'undefined' ? rutCurrentTab : '?', pg: (document.querySelector('.pg.on') || {}).id, anc: anc.slice(0, 12) }; }, sel)));
    await foto('jnt_geometria');
  }
  await T(600);
  chk('juntada: «Cobrar a…» abre la juntada', await pg.evaluate((sel) => { const d = document.querySelector(sel + ' details.com-desp'); return !!(d && d.open); }, sel));
  await pg.evaluate(() => { window.__confirmResp = true; });
  await re(); const aj = await abrirJnt(sel);
  await esperar((sel) => !!document.querySelector(sel + ' .com-pagar[data-n="PRUEBA Ana"]') || (document.querySelector(sel + ' details.com-desp:not([open])') && (document.querySelector(sel + ' details.com-desp').open = true, false)), sel, 20000);
  /* (24/11/2026, 831) Ana paga $11 de más («mis amigos me pagan un poco de más»): su parte + $11 de propina. */
  const parteAna = await pg.evaluate((sel) => Number((document.querySelector(sel + ' .com-pagar[data-n="PRUEBA Ana"]') || {}).getAttribute && document.querySelector(sel + ' .com-pagar[data-n="PRUEBA Ana"]').getAttribute('data-m')) || 0, sel);
  await pg.evaluate((v) => { window.__promptResp = v; }, parteAna > 0 ? parteAna + 11 : null);
  const ana = await tocarT(' .com-pagar[data-n="PRUEBA Ana"]');
  await pg.evaluate(() => { window.__promptResp = null; });
  chk('juntada: «Marcar pagó» de Ana a la vista', !!ana, aj);
  const pg1 = await pagos(1);
  const conf1 = await pg.evaluate(() => window.__confirms.filter((x) => /^PROMPT/.test(x)).slice(-1)[0] || '');
  const confP = await pg.evaluate(() => window.__confirms.slice(-1)[0] || '');
  chk('juntada: «Marcar pagó» pregunta cuánto pagó y nombra Galicia («' + conf1.replace(/\s+/g, ' ').slice(0, 80) + '»)', /Galicia/i.test(conf1) && /Cuánto/.test(conf1), conf1);
  chk('juntada: $11 de más → «de su parte y $11 de propina» («' + confP.replace(/\s+/g, ' ').slice(0, 90) + '»)', /\$\s?11 de propina/.test(confP), confP);
  chk('juntada: el pago de Ana está en la base, con $11 de propina aparte (' + pg1.map((x) => x.nota + ' ' + x.monto + (x.propina ? '+' + x.propina : '')).join(', ') + ')',
    pg1.length === 1 && /PRUEBA Ana/.test(pg1[0].nota || '') && Math.abs(Number(pg1[0].monto) - Number(pg1[0].propina || 0) - tot / 3) < 1 && Number(pg1[0].propina) === 11, pg1);
  await irCobranza(); await tarjetaDe(n);
  L = await esperarLinea(sel, /falta(?!n 3)/);
  chk('juntada: con 2 debiendo, la línea no nombra a Ana («' + L + '»)', !!L && !/Ana/.test(L), L);
  await re(); const bts = await botonesCobrar(sel);
  chk('juntada: con 2 debiendo, un «Cobrar a» por persona (' + bts.join(' | ') + ')', bts.length === 2 && bts.every((t) => /^Cobrar a .*\$/.test(t)), bts);
  /* Los botones llevan el nombre entero en data-n (el texto usa el corto: «PRUEBA B.»). */
  const cobrarA = async (nm) => { const b = await tocarT(' .com-cobrar button[data-n="' + nm + '"]'); return b; };
  const bB = await cobrarA('PRUEBA Beto');
  chk('juntada: botón «Cobrar a» de Beto (' + (bB && bB.txt) + ')', !!bB);
  const pg2 = await pagos(2);
  chk('juntada: «Cobrar a Beto» deja su pago a su nombre (' + pg2.map((x) => x.nota).join(', ') + ')', pg2.length === 2 && pg2.some((x) => /PRUEBA Beto/.test(x.nota || '')), pg2);
  const post = await pg.evaluate(() => window.__posts.filter((x) => /cobrarParcial|cobro_parcial/i.test(x.u + x.b)).slice(-1).map((x) => x.b)[0] || '');
  chk('juntada: fue un pago a cuenta a nombre de Beto, a Galicia, sin marcarCobrado', /"pagador":"PRUEBA Beto"/.test(post) && /"cuenta":"galicia"/.test(post) && !(await pg.evaluate((p0) => window.__posts.slice(p0).some((x) => /marcarCobrado|pedido_cobrar_directo/.test(x.u + x.b)), p0)), post.slice(0, 300));
  await irCobranza(); await tarjetaDe(n);
  L = await esperarLinea(sel, /falta /);
  chk('juntada: queda uno y la línea lo nombra («' + L + '»)', !!L && /Robot/.test(L), L);
  /* Se rearma con el estado de ahora: Ana y Beto pagaron → tachados. */
  await re(); const M2 = await mandarCuenta(sel, 'cuenta con 2 pagados', tot);
  if (M2) { const M = M2.bl.find((x) => /Maleu/.test(x.t)); chk('cuenta con 2 pagados: 2 tachados y 1 que falta', M && M.f.filter((x) => x.ya).length === 2 && M.f.filter((x) => !x.ya).length === 1, M); }
  await re(); const aj2 = await abrirJnt(sel);
  const dsh = await tocarT(' [onclick*="comPagoInfo"][data-n="PRUEBA Ana"]');
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
  /* Cobrada, con un gasto de afuera de Beto (verduras): desde la FICHA, Maleu todo tachado y «Le pasan a Beto». El gasto
     es del robot (created_by): robot_limpiar lo borra. */
  const VERD = 3000, rg = await rpc('juntada_gasto_directo', { p: { grp: 'Pedido Home ' + n, quien: 'PRUEBA Beto', que: 'Verduras', monto: VERD } });
  if (chk('cuenta: gasto de afuera de Beto (Verduras $' + VERD + ')', rg && rg.ok !== false && rg.http === 200, rg)) {
    await pg.evaluate((n) => { go('pedidos'); const p = (D.pedidos || []).find((x) => x.h === 'Home' && String(x.n) === String(n)); if (p) { openOrdDetail(p.h, String(p.n), Number(p.r) || 0); _comDatos(p, true).then(() => _comPintar(p.h, String(p.n))); } }, n);
    await esperar(() => /Verduras/.test((document.querySelector('#ordBody .com') || {}).textContent || ''), null, 20000);
    const M3 = await mandarCuenta('#ordBody', 'cuenta cobrada con verduras', tot + VERD);
    if (M3) {
      const M = M3.bl.find((x) => /Maleu/.test(x.t)), Bt = M3.bl.find((x) => /Le pasan a PRUEBA B/.test(x.t));
      chk('cuenta cobrada: Maleu todo tachado; «Le pasan a Beto» con lo de los otros dos ($' + (Bt ? Bt.f.map((x) => x.m).join(' + $') : '?') + ')',
        M && M.f.length && M.f.every((x) => x.ya) && Bt && Bt.f.length === 2 && !Bt.f.some((x) => x.ya) && Math.abs(Bt.f.reduce((a, x) => a + x.m, 0) - Math.round(VERD * 2 / 3)) <= 2, M3.bl);
      await foto('cuenta_ficha');
    }
    await pg.evaluate(() => { try { closeOrdDetail(); } catch (e) {} });
  }
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
  while (Date.now() - t0 < 90000) { c = await marcar(); if (c) break; if (!(await pg.evaluate(() => [].some.call(document.querySelectorAll('#armadoView .armado-card'), (x) => x.getClientRects().length)))) await tocar('[onclick*="toggleCollapse"]', 'HOY', '#armadoView', { callado: true, espera: 300 }); c = await marcar(); if (c) break; await T(1000); }
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
  /* Y el cobro, todavía sin señal (el repartidor en la calle): COBRANZA lo tiene en el celular, «Cobrar» → Efectivo →
     Confirmar → a la cola. */
  const enColaDe = (accion) => pg.evaluate(([n, accion]) => { try { const q = (JSON.parse(localStorage.getItem('maleu_ruta') || '{}').syncQueue || []); return q.some((x) => x.action === accion && String(x.id) === String(n)); } catch (e) { return false; } }, [b.n, accion]);
  await irCobranza();
  const selB = await tarjetaDe(b.n);
  if (chk('sin señal: el entregado aparece en COBRANZA sin red', !!selB)) {
    await tocar(selB + ' .cobro-btn-cobrado', 'Cobrar');
    const ab = await esperar(() => { const o = document.getElementById('cobroRutaOverlay'); return o && !o.classList.contains('hidden') ? 1 : null; }, null, 8000);
    if (chk('sin señal: «Cobrar» abre el cuadro', !!ab)) {
      const cb = await cobrarEnCuadro('Efectivo', b.total);
      chk('sin señal: el cobro quedó en la cola del celular', cb.ok && await enColaDe('marcarCobrado'), await pg.evaluate(() => (JSON.parse(localStorage.getItem('maleu_ruta') || '{}').syncQueue || []).map((x) => x.action + ' ' + x.id)));
    }
  }
  await pg.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await T(4000);
  const cola2 = await pg.evaluate((n) => (()=>{ try { const q = (JSON.parse(localStorage.getItem('maleu_ruta') || '{}').syncQueue || []); return q.some((x) => x.action === 'marcarEntregado' && String(x.id) === String(n)); } catch (e) { return false; } })(), b.n).catch(() => null);
  /* Chromium sin service worker (el servidor local lo apaga) recarga sin red a su página de error: ahí no se puede leer la
     cola. Que sobrevivió lo prueban los dos chequeos de abajo (sale sola después de recargar y la base la tiene). */
  const errPage = await pg.evaluate(() => /^chrome-error:/.test(location.href)).catch(() => true);
  if (errPage && COMPU) console.log('       (Chromium sin service worker: la recarga sin red no carga la app; la cola se comprueba al volver la señal)');
  else chk('sin señal: después de recargar la página la entrega sigue en la cola', cola2 === true, cola2);
  await pg.context().setOffline(false);
  await pg.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await pg.waitForFunction(() => typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 }).catch(() => {});
  await pg.evaluate(() => { try { go('ruta'); } catch (e) {} });
  const vacia = await esperar((n) => { try { if (typeof processSyncQueue === 'function') processSyncQueue(); } catch (e) {} return (()=>{ try { const q = (JSON.parse(localStorage.getItem('maleu_ruta') || '{}').syncQueue || []); return q.some((x) => x.action === 'marcarEntregado' && String(x.id) === String(n)); } catch (e) { return false; } })() ? null : 1; }, b.n, 60000);
  chk('sin señal: al volver la señal la cola se vacía sola', !!vacia);
  chk('sin señal: #' + b.n + ' quedó Entregado en la base', !!(await esEntregadoEnBase(b.n, 30000)));
  const cobV = await esperar(() => null, null, 1) || !(await enColaDe('marcarCobrado'));
  chk('sin señal: el cobro también salió de la cola', cobV);
  const vb = await verPedido('Home', b.n, (v) => v.estado_pago === 'Cobrado', 30000);
  chk('sin señal: #' + b.n + ' quedó Cobrado en la base, efectivo $' + (vb && vb.efectivo), vb && vb.estado_pago === 'Cobrado' && Math.abs(Number(vb.efectivo) - b.total) <= 100, vb);
}
/* ── FLUJO 4: Red. El representante PRUEBA carga su autopedido con SU usuario y PIN (como el nocturno); después, con
   toques: la bolsa en ARMADO, «Le falta marcar entregado» en Equipo, la excepción de comisión y que él marque entregado. */
async function autopedidoRep() {
  const cred = credRobot();
  if (!cred.pinRep) return { err: 'falta pinRep en robot.json' };
  const pidRed = Number(E.producto_red || E.producto_id);   /* (24/11/2026) SOLO PRUEBA: nada de la Torta Golosa (id 14) ni del 46 a ciegas */
  if (!(pidRed > 0)) return { err: 'falta el id de Red de PRUEBA (robot_entidades_pantalla.producto_red): no uso un producto real' };
  const prod = { id: pidRed, nombre: 'PRUEBA' };
  for (const dias of [2, 4, 6, 8, 10, 12]) {
    const F = new Date(Date.now() + dias * 86400000), d = F.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
    const body = { action: 'redAutopedido', clientOrderId: 'robot-' + Date.now() + '-aud-red-' + dias, canal: 'Red', vendedor: 'PRUEBA Robot', nombre: 'PRUEBA Robot', telefono: String(E.telefono || '5490000000001'),
      barrioPrivado: 'PRUEBA', lote: '', dia: d.charAt(0).toUpperCase() + d.slice(1), fechaEntrega: F.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }), horario: 'A coordinar', pago: 'Transferencia', envio: 0,
      items: [{ id: pidRed, nombre: 'PRUEBA', qty: 1, precio: 1000 }], total: 1000, trajo: 'Vendedor', telCliente: String(E.telefono || '5490000000001') };
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
  const cred = credRobot();
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
/* (24/11/2026) COBRANZA es una tab del menú (al lado de Caja), ya no una sub-tab de Ruta: se entra por el menú, como Tadeo
   (en el celular, la hamburguesa y después «Cobranza»). Si el menú no la tiene, es un hallazgo: no se esquiva con go(). */
/* ── FLUJO 6: «Unir con otra persona» (24/11/2026, Tadeo 12:49). Dos pedidos PRUEBA de la MISMA casa (barrio PRUEBA, lote
   9) a nombre de dos personas (PRUEBA Robot y PRUEBA Ana, los dos teléfonos del robot). Desde la tarjeta de PRUEBA Robot:
   «Unir con otra persona» → Ana arriba, «De la misma casa» → tildarla → «¿Quién pagó?» Ana → «Cobrar 2 pedidos» → el cuadro
   combinado → transferencia con $72 de más (el caso de Nani: $96.700 por $96.628) → «va de propina», sin preguntar →
   Confirmar. En la base: los dos Cobrado. Y el recordatorio de todo junto, con lo de cada uno y sin número de pedido. */
async function flujoUnir() {
  console.log('\n── Unir con otra persona');
  const altaDe = (nombre, tel, k) => rpc('pedido_alta_directo', { p: { canal: 'Home', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }), dia: '', horario: '',
    nombre, telefono: tel, pago: 'Transferencia', envio: 0, items: [{ id: E.producto_id, qty: k }], total: 1000 * k, subtotalSinDescuento: 1000 * k, descuento: 0, descuentoManual: 0, descuentoGlobalPct: 0, descuentoReceta: null,
    propina: 0, tipoPedido: '', deposito: E.deposito || 'prueba', barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '9', estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: 'robot-' + Date.now() + '-unir-' + k } });
  if (!(Number(E.producto_id) > 0)) return chk('unir: el id de tienda de PRUEBA', false, E);
  /* Lo de una corrida anterior (la limpieza protege 30 min lo que no es de su corrida): «-unir-» lo deja sin protección. */
  await rpc('robot_limpiar', { p_corrida: '-unir-' }).catch(() => null);
  const a = await altaDe('PRUEBA Robot', String(E.telefono || '5490000000001'), 1), b = await altaDe('PRUEBA Ana', String(E.telefono_representante || '5490000000002'), 2);
  if (!chk('unir: dos pedidos PRUEBA de la misma casa (#' + (a && a.n) + ' y #' + (b && b.n) + ')', a && a.ok && a.n && b && b.ok && b.n, { a, b })) return;
  /* La casa (barrio + lote) sale de los pedidos del panel: se espera a que los dos estén ahí, como en la vida real. */
  const enD = await esperar(([na, nb]) => { try { _recargarPedidos && _recargarPedidos(); } catch (e) {} const ps = (D.pedidos || []); return ps.some((x) => String(x.n) === String(na)) && ps.some((x) => String(x.n) === String(nb)) ? 1 : null; }, [a.n, b.n], 60000);
  chk('unir: los dos pedidos llegan a los pedidos del panel', !!enD);
  await irCobranza();
  const tarj = await esperar(([na, nb]) => { try { fetchCobrosPendientes(true); } catch (e) {} const t = (document.getElementById('cobrosContent') || {}).textContent || ''; return t.indexOf('#' + na) >= 0 && t.indexOf('#' + nb) >= 0 ? 1 : null; }, [a.n, b.n], 60000);
  if (!chk('unir: Cobranza muestra los dos pedidos', !!tarj)) { await foto('unir_sin'); return; }
  await T(1500);
  /* Las tarjetas siguen siendo una por cliente: nada se juntó solo. */
  const dos = await pg.evaluate(([na, nb]) => { const cs = [].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter((c) => c.textContent.indexOf('#' + na) >= 0 || c.textContent.indexOf('#' + nb) >= 0); return cs.length + (cs.some((c) => c.textContent.indexOf('#' + na) >= 0 && c.textContent.indexOf('#' + nb) >= 0) ? ' (juntas)' : ''); }, [a.n, b.n]);
  chk('unir: cada persona en su tarjeta, nada se agrupa solo (' + dos + ')', dos === '2', dos);
  /* El botón de la tarjeta de PRUEBA Robot. */
  await pg.evaluate((na) => { document.querySelectorAll('[data-au="unir"]').forEach((x) => x.removeAttribute('data-au')); const c = [].find.call(document.querySelectorAll('#cobrosContent .cobro-card'), (c) => c.getClientRects().length && c.textContent.indexOf('#' + na) >= 0); for (let d = c && c.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; const bt = c && c.querySelector('.cobz-unir'); if (bt) bt.setAttribute('data-au', 'unir'); }, a.n);
  if (!chk('unir: la tarjeta tiene «Unir con otra persona»', !!(await tocar('[data-au="unir"]', 'Unir con otra persona', '', { espera: 800 })))) { await foto('unir_boton'); return; }
  const ov = await esperar(() => { const o = document.getElementById('cobUnirOv'); if (!o) return null; const hs = [].map.call(o.querySelectorAll('.cob-unir-h'), (x) => x.textContent); const f = [].map.call(o.querySelectorAll('.cob-unir-f'), (x) => x.textContent.replace(/\s+/g, ' ').trim()); return { hs, f }; }, null, 8000);
  if (process.env.EXPLORAR) console.log('       D: ' + JSON.stringify(await pg.evaluate(([na,nb]) => (D.pedidos||[]).filter((x) => String(x.n)===String(na)||String(x.n)===String(nb)||/Basualdo|Delfino/.test(x.c||'')).slice(0,4).map((x) => { const o = {}; Object.keys(x).forEach((k) => { if (typeof x[k] !== 'object' && String(x[k]).length < 40) o[k] = x[k]; }); return o; }), [a.n, b.n])));
  if (process.env.EXPLORAR) console.log('       casas: ' + JSON.stringify(await pg.evaluate(() => _cobUnirClientes().filter((c) => /PRUEBA/.test(c.nm)).map((c) => ({ nm: c.nm, casa: c.casa, l: c.lote, sb: c.barrio, raw: (c.items[0] || {}).l, ck: (c.items[0] || {}).ck, keys: Object.keys(c.items[0] || {}).join() })))));
  chk('unir: Ana sugerida arriba, «De la misma casa»', ov && ov.hs[0] === 'De la misma casa' && /PRUEBA Ana/.test(ov.f[0] || '') && /Misma casa/.test(ov.f[0] || ''), ov && { hs: ov.hs, f: ov.f.slice(0, 3) });
  await foto('unir_buscador');
  await tocar('#cobUnirOv .cob-unir-f', 'PRUEBA Ana', '', { espera: 500 });
  await tocar('#cobUnirOv .cob-unir-chip', 'PRUEBA', '', { callado: true, espera: 300 });
  await tocar('#cobUnirOv .cob-unir-chip:not(.on)', '', '', { espera: 400 });   /* «¿Quién pagó?» → Ana (el que no está elegido) */
  const pie = await pg.evaluate(() => { const o = document.getElementById('cobUnirOv'); return o && { paga: (o.querySelector('.cob-unir-chip.on') || {}).textContent, ok: (o.querySelector('.cob-unir-ok') || {}).textContent }; });
  chk('unir: «¿Quién pagó?» Ana y «Cobrar 2 pedidos · $3.000»', pie && /PRUEBA/.test(pie.paga || '') && /Cobrar 2 pedidos/.test(pie.ok || '') && /3\.000/.test(pie.ok || ''), pie);
  /* El recordatorio de todo junto. */
  await pg.evaluate(() => { window.__copiado = []; });
  await tocar('#cobUnirOv .cob-unir-rec', 'Copiar recordatorio', '', { espera: 600 });
  const rec = await pg.evaluate(() => (window.__copiado || []).slice(-1)[0] || '');
  chk('unir: recordatorio con lo de cada uno y el total, sin número de pedido', /Lo tuyo/.test(rec) && /Lo de PRUEBA/.test(rec) && /Total: \$3\.000/.test(rec) && !/#\d/.test(rec), rec);
  /* El cobro. */
  await tocar('#cobUnirOv .cob-unir-ok', 'Cobrar 2 pedidos', '', { espera: 1200 });
  const cu = await esperar(() => { const o = document.getElementById('cobroRutaOverlay'); return o && !o.classList.contains('hidden') ? (document.getElementById('cobroRutaTitle') || {}).textContent : null; }, null, 10000);
  chk('unir: abre UN cobro «Cobrar a PRUEBA Ana (paga)»', /Cobrar a PRUEBA Ana \(paga\)/.test(cu || ''), cu);
  if (!cu) return;
  await tocar('#cobroRutaFp .cobro-pill', 'Transferencia', '', { callado: true, espera: 400 });
  if (await visible('#cobroRecEf')) await pg.fill('#cobroRecEf', ''); await pg.fill('#cobroRecMP', '3072');
  await pg.evaluate(() => { ['cobroRecMP', 'cobroRecEf'].forEach((id) => { const x = document.getElementById(id); x.dispatchEvent(new Event('input', { bubbles: true })); }); });
  await T(500);
  const cuad = await pg.evaluate(() => ({ err: ((document.getElementById('cobroRutaErr') || {}).textContent || '').replace(/\s+/g, ' ').trim(), btn: (document.getElementById('btnCobroRutaOk') || {}).textContent, dis: !!(document.getElementById('btnCobroRutaOk') || {}).disabled,
    lbl: (document.getElementById('cobroSumPropLbl') || {}).textContent }));
  chk('unir: $72 de más en la transferencia → «va de propina», sin preguntar', /Sobran \$\s?72: va de propina/.test(cuad.err) && !cuad.dis && cuad.lbl === 'Propina', cuad);
  await foto('unir_cuadro');
  const ok = await tocar('#btnCobroRutaOk', '', '', { espera: 1500 });
  chk('unir: «Confirmar cobro»', !!ok);
  const va = await verPedido('Home', a.n, (v) => v.estado_pago === 'Cobrado', 40000), vb = await verPedido('Home', b.n, (v) => v.estado_pago === 'Cobrado', 40000);
  chk('unir: los dos pedidos Cobrado en la base', va && vb && va.estado_pago === 'Cobrado' && vb.estado_pago === 'Cobrado', { va, vb });
  console.log('       base: ' + JSON.stringify({ va, vb }).slice(0, 600));
  console.log('       limpieza: ' + JSON.stringify(await rpc('robot_limpiar', { p_corrida: '-unir-' }).catch((e) => String(e))).slice(0, 300));
}
/* ── FLUJO 7: la propina en el pago a cuenta (24/11/2026, 831). Juntada de 3 ($1.000 cada uno): Ana paga $1.011 (parte +
   $11 de propina), Beto y Robot lo justo → el pedido se cierra con facturado $3.011, propina $11 y la Caja con $3.011 y
   la fila de cierre en 0. Después se deshace EL PAGO DE ANA → el pedido vuelve a «No Cobrado», facturado $3.000 exacto,
   propina 0 y la Caja con $2.000. Las tres llamadas son las de la pantalla (`cobrar_parcial_directo`). */
async function flujoPropina() {
  console.log('\n── Propina en el pago a cuenta');
  if (!(Number(E.producto_id) > 0)) return chk('propina: el id de tienda de PRUEBA', false, E);
  await rpc('robot_limpiar', { p_corrida: '-prop-' }).catch(() => null);
  const op = 'robot-' + Date.now() + '-prop-';
  const al = await rpc('pedido_alta_directo', { p: { canal: 'Home', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }), dia: '', horario: '',
    nombre: 'PRUEBA Robot', telefono: String(E.telefono || '5490000000001'), pago: 'Transferencia', envio: 0, items: [{ id: E.producto_id, qty: 3 }], total: 3000, subtotalSinDescuento: 3000, descuento: 0, descuentoManual: 0,
    descuentoGlobalPct: 0, descuentoReceta: null, propina: 0, tipoPedido: '', deposito: E.deposito || 'prueba', barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '9', estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: op + 'alta' } });
  if (!chk('propina: pedido PRUEBA de $3.000 (#' + (al && al.n) + ')', al && al.ok && al.n, al)) return;
  const n = String(al.n);
  const pagar = (quien, monto, prop, k) => rpc('cobrar_parcial_directo', { p: Object.assign({ action: 'cobrarParcial', hoja: 'Home', id: n, row: 0, formaPago: 'Transferencia', cuenta: E.cuenta || 'prueba', monto, pagador: quien,
    notas: 'Juntada: ' + quien, quien: 'Tadeo Ustariz', ts: Date.now(), clientOpId: op + k }, prop ? { propina: prop } : {}) });
  const p1 = await pagar('PRUEBA Ana', 1000, 11, 'ana'), p2 = await pagar('PRUEBA Beto', 1000, 0, 'beto');
  chk('propina: con Ana (+$11) y Beto falta $1.000, no $989 (la propina no paga el pedido)', p2 && p2.ok && Number(p2.restante) === 1000 && !p2.cerrado, { p1, p2 });
  const p3 = await pagar('PRUEBA Robot', 1000, 0, 'robot');
  chk('propina: con el tercero se cierra', p3 && p3.ok && p3.cerrado, p3);
  const lee = async () => {
    const v = await rpc('robot_verificar', { p: { pedido: 'Home|' + n } }).catch(() => null);
    return { estado: v && v.pedido && v.pedido.estado_pago, propina: v && v.pedido && v.pedido.propina, total: v && v.pedido && v.pedido.total, transf: v && v.pedido && v.pedido.transferencia };
  };
  const a = await lee();
  console.log('       cerrado: ' + JSON.stringify(a));
  chk('propina: cerrado con propina $11 (la Caja no ve lo PRUEBA: el facturado y los pagos se miden en la base)', a.estado === 'Cobrado' && Number(a.propina) === 11, a);
  if (process.env.PAUSA_PROP) { console.log('       PAUSA #' + n); await T(Number(process.env.PAUSA_PROP)); }
  /* Deshacer el pago de Ana (el de la propina). */
  const d = await rpc('cobro_parcial_deshacer_directo', { p: { action: 'cobroParcialDeshacer', hoja: 'Home', id: n, row: 0, pago: 'parcial|op:' + op + 'ana', motivo: 'prueba 831', clientOpId: op + 'desh', ts: Date.now() } });
  chk('propina: deshacer el pago de Ana reabre el pedido', d && d.ok && d.reabre, d);
  const b = await lee();
  console.log('       deshecho: ' + JSON.stringify(b));
  chk('propina: reabierto y propina 0', b.estado === 'No Cobrado' && !(Number(b.propina) > 0), b);
  if (process.env.PAUSA_PROP) { console.log('       PAUSA2 #' + n); await T(Number(process.env.PAUSA_PROP)); }
  console.log('       limpieza: ' + JSON.stringify(await rpc('robot_limpiar', { p_corrida: '-prop-' }).catch((e) => String(e))).slice(0, 200));
  return n;
}
/* ── FLUJO 8: Compras › PEDIR, un negativo sin pedido abierto (24/11/2026). Si hay un freezer con físico negativo y nada
   reservado ni en camino, va en ámbar arriba de «Para reponer», con «Contar» → Productos › Contar en ese freezer, con el
   producto buscado. Solo lee: no cuenta nada. Sin negativos en ese momento, lo dice y no falla. */
async function flujoNegativo() {
  console.log('\n── Compras › PEDIR: el negativo sin pedido');
  await pg.evaluate(() => go('busqueda')); await T(5000);
  await pg.evaluate(() => { try { abaSwitchTab('proveedores'); } catch (e) {} });
  const neg = await esperar(() => { const b = document.querySelector('#pg-abast .aba-neg'); if (b && b.getClientRects().length) return { lin: [].map.call(b.querySelectorAll('.aba-neg-l'), (l) => l.innerText.replace(/\s+/g, ' ').trim()) };
    const r = document.querySelector('#pg-abast .aba-sec-t'); return r && /Para reponer/.test(r.textContent) ? { lin: [] } : null; }, null, 40000);
  if (!neg) { await foto('pedir_sin'); return chk('pedir: la pantalla PEDIR cargó', false, await pg.evaluate(() => ({ cur: typeof cur !== 'undefined' ? cur : '?', tab: (document.querySelector('#pg-abast .tab.active') || {}).textContent, txt: ((document.getElementById('pg-abast') || {}).innerText || '').replace(/s+/g, ' ').slice(0, 400), prov: typeof catalogo !== 'undefined' ? (catalogo.proveedores || []).length : 'sin catalogo' }))); }
  if (!neg.lin.length) { console.log('       (no hay ningún negativo sin pedido ahora: nada que mirar)'); return; }
  chk('pedir: el negativo sin pedido va aparte, en ámbar («' + neg.lin.join(' | ').slice(0, 120) + '»)', neg.lin.length > 0 && /−|-\d/.test(neg.lin[0]), neg);
  await foto('pedir_negativo');
  const t = await tocar('#pg-abast .aba-neg-b', 'Contar', '', { espera: 2500 });
  chk('pedir: «Contar» a la vista y sin nada encima', !!t);
  const ct = await esperar(() => { const q = document.getElementById('stcQ'); return (typeof cur !== 'undefined' && cur === 'stock') && q && q.getClientRects().length ? { q: q.value, dep: ((document.querySelector('.stc-dep-btn.on') || {}).textContent || '').trim().slice(0, 30) } : null; }, null, 30000);
  chk('pedir: «Contar» abre Productos › Contar con el producto buscado (' + JSON.stringify(ct) + ')', !!ct && ct.q.length > 1 && neg.lin[0].indexOf(ct.q.split(' ')[0]) >= 0, { ct, lin: neg.lin[0] });
  await foto('pedir_contar');
}
async function irCobranza(opt) {
  opt = opt || {};
  if (!COMPU && !(await pg.evaluate(() => document.body.classList.contains('sb-open')))) await tocar('.hdr-burger', '', '', { callado: true, espera: 600 });
  const t = await tocar('.snav .bn[data-p="cobranza"]', '', '', { callado: !!opt.callado, espera: opt.espera || 1500 });
  if (!t) chk('el menú tiene «Cobranza»', false);
  if (!COMPU) await pg.evaluate(() => { if (document.body.classList.contains('sb-open') && typeof sbToggle === 'function' && innerWidth < 1024) sbToggle(); });
  await esperar(() => (typeof cur !== 'undefined' && cur === 'cobranza' && !!document.querySelector('#cobrosContent .cobz-res')) || null, null, 30000);
}
async function tarjetaDe(n) {
  /* (24/11/2026) La juntada va PLEGADA en Cobranza: se abre tocando su línea, como Tadeo. */
  const est = await esperar((n) => {
    /* `offsetParent` NO alcanza: adentro de un <details> cerrado sigue teniendo uno (y medidas), pero no se pinta ni se toca. */
    const vis = [].some.call(document.querySelectorAll('.cobro-card'), (c) => { const dj = c.closest('details.cobz-jnt-d'); return c.offsetParent && (!dj || dj.open) && c.textContent.indexOf('#' + n) >= 0 && /PRUEBA Robot/.test(c.textContent); });
    if (vis) return 'visible';
    const d = [].find.call(document.querySelectorAll('#cobrosContent details.cobz-jnt-d'), (x) => x.textContent.indexOf('#' + n) >= 0);
    if (!d) return null;
    document.querySelectorAll('[data-aujnt]').forEach((x) => x.removeAttribute('data-aujnt')); d.setAttribute('data-aujnt', '1');
    return d.open ? 'visible' : 'cerrada';
  }, n, 30000);
  if (est === 'cerrada') await tocar('details[data-aujnt="1"] > summary', '', '', { espera: 900 });
  const ok = await esperar((n) => { const c = [].slice.call(document.querySelectorAll('.cobro-card')).find((c) => c.offsetParent && c.textContent.indexOf('#' + n) >= 0 && /PRUEBA Robot/.test(c.textContent)); if (!c) return null; document.querySelectorAll('[data-au="' + n + '"]').forEach((x) => { if (x !== c) x.removeAttribute('data-au'); }); c.setAttribute('data-au', String(n)); return 1; }, n, 30000);
  return ok ? '.cobro-card[data-au="' + n + '"]' : null;
}

/* (23/11/2026) El flujo de Red deja el producto PRUEBA en -1 en ustariz por corrida (la bolsa sale de ustariz y la recepción
   entra a prueba). robot_limpiar lo vuelve a 3 en prueba y 0 en el resto, pero solo con 10 min sin órdenes del robot: se
   espera (hasta 12 min) para no dejarle el residuo al próximo deploy (su paso «traspaso» pide 0 en ustariz). */
async function libroEnSuLugar() {
  const t0 = Date.now();
  while (Date.now() - t0 < 12 * 60000) { const r = await rpc('robot_limpiar', { p_corrida: 'audit-libro-' + Date.now() }).catch(() => null); const lp = r && r.libroPrueba;
    if (lp && lp.ok) { console.log('libro PRUEBA en su lugar: ' + JSON.stringify(lp)); return true; }
    console.log('libro PRUEBA todavía no: ' + JSON.stringify(lp || r).slice(0, 160)); await T(60000); }
  return false;
}
(async () => {
  await abrir();
  console.log('robot: ' + (await pg.evaluate(() => SESSION.nombre + ' / ' + SESSION.usuario + ' / ' + SESSION.rol)) + ' · ' + MOTOR);
  if (process.env.LIMPIAR) { console.log('limpiar', JSON.stringify(await rpc('robot_limpiar', { p_corrida: 'audit-' + Date.now() })).slice(0, 500)); if (process.env.LIBRO) await libroEnSuLugar(); await br.close(); return; }
  E = await rpc('robot_entidades_pantalla', {}); if (process.env.EXPLORAR) console.log('E ' + JSON.stringify(E).slice(0, 600)); if (process.env.EXPLORAR) console.log('PRUEBA en D.stock ' + JSON.stringify(await pg.evaluate((sku) => (D.stock || []).filter((x) => /PRUEBA/i.test(JSON.stringify(x).slice(0, 300))).slice(0, 3), E.producto)).slice(0, 600));
  const fl = (process.env.FLUJO || 'cobranza').replace(/^todo$/, 'cobranza,yapago,juntada,ruta,red,unir,propina');
  try {
    if (/cobranza/.test(fl)) await flujoCobranza();
    if (/yapago/.test(fl)) await flujoYaPago();
    if (/juntada/.test(fl)) await flujoJuntada();
    if (/ruta/.test(fl)) await flujoRuta();
    if (/red/.test(fl)) await flujoRed();
    if (/unir/.test(fl)) await flujoUnir();
    if (/propina/.test(fl)) await flujoPropina();
    if (/negativo/.test(fl)) await flujoNegativo();
  } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); await foto('revento'); }
  const ej = errs.filter((e) => !/favicon|ERR_ABORTED|WebKit encountered an internal error|ERR_INTERNET_DISCONNECTED/.test(e));
  chk('sin errores de JS ni de la base', ej.length === 0, [...new Set(ej)].slice(0, 12));
  if (!process.env.SIN_LIMPIAR) console.log('limpiar: ' + JSON.stringify(await rpc('robot_limpiar', { p_corrida: 'audit-' + Date.now() })).slice(0, 300));
  if (!process.env.SIN_LIMPIAR && /red/.test(process.env.FLUJO === 'todo' ? 'red' : (process.env.FLUJO || ''))) chk('el stock PRUEBA vuelve a su lugar (robot_limpiar con 10 min quietos)', await libroEnSuLugar());
  console.log('\n' + ok + ' ok · ' + mal + ' mal' + (hall.length ? '\n  · ' + hall.join('\n  · ') : ''));
  await br.close(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('REVENTÓ', e && e.stack || e); process.exit(1); });
