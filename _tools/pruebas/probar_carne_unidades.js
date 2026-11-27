/* LO QUE VA POR UNIDAD EN LA TANDA DE CARNE (27/11/2026, encargo D ítem 18, 907). Con el ROBOT y de verdad: proveedor
   PRUEBA, producto PRUEBA, depósito «prueba» (la base los deja afuera de todo y robot_limpiar los borra). A 390 con toques.
   La lista por unidad se inyecta (PRUEBA no tiene compras viejas de donde sacar el costo): PRUEBA a $500.
     1. Recibir › Carne con proveedor y depósito: aparece «Por unidad» con − / +; − arranca apagado.
     2. + + → «Recibir 2 paquetes · $1.000 en …» → compra (compra_manual_directo) y recepción (compra_recibir_directo):
        las líneas de la compra quedan «Recibido» en el depósito prueba.
     3. CORTE: con compra_lineas_pantalla bloqueado, «Recibir» deja la compra hecha y anotada (maleu_carne_uni_pend); se
        recarga la app (como cerrarla) y, al volver a la tanda, se retoma sola y la recibe.
   PW=<playwright-core> BASE=http://localhost:8177/app.html OUT=<dir> node probar_carne_unidades.js   ·   LIMPIAR=1 al final */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8177/app.html', OUT = process.env.OUT || os.tmpdir();
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let bien = 0, mal = 0; const chk = (t, ok, x) => { ok ? bien++ : mal++; console.log((ok ? '  BIEN ' : '  MAL  ') + t + (x ? ' · ' + x : '')); return ok; };
(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const motor = process.env.MOTOR || 'webkit';
  const br = await pw[motor].launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_ensayo','1');}catch(e){} window.confirm=function(){return true;}; window.alert=function(){};`);
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  const entrar = async () => {
    await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof panelDoLogin === 'function' && (!!document.getElementById('loginUser') || (typeof SESSION !== 'undefined' && SESSION && SESSION.usuario)), null, { timeout: 90000 });
    const yaDentro = await pg.evaluate(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario);
    if (!yaDentro) await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
    await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof renderStCarne === 'function', null, { timeout: 150000 });
  };
  const rpc = (fn, p) => pg.evaluate(async ([fn, p]) => { const sb = await _sbPermiso(true); const r = await fetch(sb.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify(p || {}) });
    const t = await r.text(); try { return Object.assign({ http: r.status }, JSON.parse(t)); } catch (e) { return { http: r.status, texto: t.slice(0, 300) }; } }, [fn, p]);
  await entrar();
  if (process.env.LIMPIAR) { console.log('limpiar', JSON.stringify(await rpc('robot_limpiar', { p_corrida: 'carneuni-' + Date.now() })).slice(0, 400)); await br.close(); return; }
  const abrirTanda = async () => {
    /* applyRoles vuelve a llamar a go() un rato después de entrar: se insiste hasta quedar en Compras. */
    for (let i = 0; i < 30; i++) {
      if (await pg.evaluate(() => (document.querySelector('.pg.on') || {}).id === 'p-busqueda')) break;
      await pg.evaluate(() => { try { go('busqueda'); } catch (e) {} }); await T(1500);
    }
    await pg.waitForFunction(() => typeof abaRecibirCarne === 'function', null, { timeout: 60000 });
    /* La sub-app arranca en su pestaña por defecto: se insiste hasta que Recibir › Carne esté a la vista. */
    for (let i = 0; i < 20; i++) {
      const vis = await pg.evaluate(() => { const c = document.getElementById('stCarne'); return !!c && !!c.offsetParent; });
      if (vis) break;
      await pg.evaluate(() => { try { abaRecibirCarne(); } catch (e) {} }); await T(1500);
    }
    await pg.waitForFunction(() => { const c = document.getElementById('stCarne'); return !!c && !!c.offsetParent && typeof CARNE_DATA !== 'undefined' && !!CARNE_DATA; }, null, { timeout: 60000 }).catch(async () => { console.log('DIAG', JSON.stringify(await pg.evaluate(() => ({ tab: typeof abaCurrentTab !== 'undefined' ? abaCurrentTab : '?', pgOn: ((document.querySelector('.pg.on') || {}).id || ''), host: (function () { const h = document.getElementById('abaCarneHost'); return h ? { hidden: h.hidden, vis: !!h.offsetParent, padre: h.parentElement && h.parentElement.id } : null; })(), recV: (function () { const v = document.getElementById('recibirView'); return v ? v.className + ' vis=' + !!v.offsetParent : null; })(), stPadre: (document.getElementById('stCarne') || {}).parentElement && document.getElementById('stCarne').parentElement.id, stDisp: (document.getElementById('stCarne') || {}).style && document.getElementById('stCarne').style.display, st: !!document.getElementById('stCarne'), vis: !!(document.getElementById('stCarne') || {}).offsetParent, data: typeof CARNE_DATA !== 'undefined' ? !!CARNE_DATA : 'undef', info: typeof CARNE_INFO !== 'undefined' ? JSON.stringify(CARNE_INFO).slice(0, 200) : '', modo: (document.getElementById('abaRecModo') || {}).innerText, rol: SESSION.rol, tabs: SESSION.tabs })))); throw new Error('no abrió la tanda'); });
    const r = await pg.evaluate(() => {
      CARNE_VISTA = 'recibir';
      stCarneProv('PRUEBA');
      const deps = stCarneDepsTodos().map((d) => d.id);
      if (deps.indexOf('prueba') < 0) return { err: 'el depósito prueba no está en la tanda: ' + deps.join() };
      stCarneDep('prueba');
      return { prov: CARNE_PROV, dep: CARNE_DEP };
    });
    if (r.err) return r;
    /* La lectura real de PRUEBA (vacía) tiene que volver ANTES de inyectar la lista: si no, la pisa. */
    await pg.waitForFunction(() => CARNE_UNI.prov === 'PRUEBA' && !CARNE_UNI.cargando, null, { timeout: 20000 }).catch(() => {});
    r.real = await pg.evaluate(() => JSON.stringify(CARNE_UNI.items));
    await pg.evaluate(() => { CARNE_UNI.prov = 'PRUEBA'; CARNE_UNI.items = [{ a: 'PRUEBA', n: 'PRUEBA', costo: 500 }]; CARNE_UNI.err = ''; renderStCarne(); });
    return r;
  };
  async function tocar(sel, txt) {
    const b = await pg.evaluate(([sel, txt]) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!txt || x.textContent.indexOf(txt) >= 0); })[0];
      if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, dis: !!e.disabled }; }, [sel, txt || '']);
    if (!b) return null; await T(250); await pg.touchscreen.tap(b.x, b.y); await T(400); return b;
  }
  const leerBloque = () => pg.evaluate(() => { const b = document.getElementById('stcarUni'); return b ? { txt: b.innerText.replace(/\s+/g, ' ').trim(), menosOff: !!(b.querySelector('.stcar-uni-q button') || {}).disabled } : null; });
  const ledger = () => pg.evaluate(async () => { try { const d = await _baseRpc('robot_verificar', { p: { producto: 'PRUEBA', deposito: 'prueba' } }); return d; } catch (e) { return { err: String(e.message || e) }; } });

  console.log('— 1. el bloque');
  const t1 = await abrirTanda(); if (!chk('tanda con PRUEBA → depósito prueba', !t1.err && t1.dep === 'prueba', JSON.stringify(t1))) { await br.close(); process.exit(1); }
  await T(500);
  let b = await leerBloque();
  chk('aparece «Por unidad» con PRUEBA $500', !!b && /Por unidad/.test(b.txt) && /PRUEBA/.test(b.txt) && /\$500/.test(b.txt), b && b.txt);
  chk('el − arranca apagado', !!b && b.menosOff);
  await pg.screenshot({ path: path.join(OUT, 'cu_1_bloque.png') });

  console.log('— 2. recibir 2');
  await tocar('#stcarUni .stcar-uni-q button', '+'); await tocar('#stcarUni .stcar-uni-q button', '+');
  b = await leerBloque(); chk('dos toques en + → «Recibir 2 paquetes · $1.000»', !!b && /Recibir 2 paquetes/.test(b.txt) && /\$1\.000/.test(b.txt), b && b.txt);
  await pg.screenshot({ path: path.join(OUT, 'cu_2_dos.png') });
  await pg.evaluate(() => { window.__carneUniOk = null; });
  await tocar('#stcarUniOk');
  let ok = null; for (let i = 0; i < 60 && !ok; i++) { await T(1000); ok = await pg.evaluate(() => window.__carneUniOk); }
  b = await leerBloque();
  if (chk('compra y recepción hechas', !!ok, b && b.txt)) {
    const ls = await rpc('compra_lineas_pantalla', { p: { desde: ok.pend.desde, hasta: ok.pend.hasta } });
    chk('las líneas de la compra quedaron «Recibido» (' + ok.pend.desde + ')', (ls.lineas || []).length === 1 && ls.lineas.every((l) => l.st === 'Recibido' && l.a === 'PRUEBA' && Number(l.q) === 2), JSON.stringify(ls.lineas));
    chk('el bloque dice «Listo»', /Listo: 2 prueba/.test(b.txt), b.txt);
    chk('sin compra a medias anotada', await pg.evaluate(() => !localStorage.getItem('maleu_carne_uni_pend')));
  }
  await pg.screenshot({ path: path.join(OUT, 'cu_3_listo.png') });

  console.log('— 3. corte a la mitad y retomar');
  await pg.evaluate(() => { CARNE_UNI.msg = ''; renderStCarne(); });
  await pg.route(/compra_lineas_pantalla/, (r) => r.abort());
  await tocar('#stcarUni .stcar-uni-q button', '+');
  await tocar('#stcarUniOk');
  let pend = null; for (let i = 0; i < 30 && !pend; i++) { await T(500); pend = await pg.evaluate(() => localStorage.getItem('maleu_carne_uni_pend')); }
  chk('con la lectura cortada, la compra quedó hecha y anotada', !!pend, pend);
  await pg.unroute(/compra_lineas_pantalla/);
  await entrar();   /* recargar = cerrar y abrir la app */
  await pg.evaluate(() => { window.__carneUniOk = null; });
  await abrirTanda();
  ok = null; for (let i = 0; i < 60 && !ok; i++) { await T(1000); ok = await pg.evaluate(() => window.__carneUniOk); }
  b = await leerBloque();
  if (chk('al volver a la tanda se retomó sola y la recibió', !!ok, b && b.txt)) {
    const ls = await rpc('compra_lineas_pantalla', { p: { desde: ok.pend.desde, hasta: ok.pend.hasta } });
    chk('la compra cortada quedó «Recibido» (' + ok.pend.desde + ')', (ls.lineas || []).length === 1 && ls.lineas.every((l) => l.st === 'Recibido'), JSON.stringify(ls.lineas));
  }
  await pg.screenshot({ path: path.join(OUT, 'cu_4_retomada.png') });
  const ex = errs.filter((e) => !/favicon|ResizeObserver/.test(e));
  chk('sin errores de JS', !ex.length, ex.slice(0, 4).join(' | '));
  console.log('\n' + bien + ' bien · ' + mal + ' mal');
  await br.close(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('REVENTÓ', e && e.stack || e); process.exit(2); });
