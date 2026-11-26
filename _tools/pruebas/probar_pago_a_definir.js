/* «CÓMO PAGA» A DEFINIR (21/11/2026, Tadeo 23:56: «no se sabe si me paga en transf, en efectivo»). Sin escribir nada:
   todo POST que escribe se corta; el alta contesta un «ok» falso para seguir el camino de «Ya me pagó».
     PW=<playwright-core> SES=<sesion tadeo/admin> [BASE=…] [VIEJO=1] OUT=<dir> node probar_pago_a_definir.js
   1. + PEDIDO: «Cómo paga» arranca sin nada marcado; tocar uno lo marca y tocarlo de nuevo lo desmarca.
   2. El mensaje al cliente con «a definir» lleva el alias (maleu26); con Efectivo, no.
   3. Guardar «a definir» manda `pago: ''` (no inventa un medio).
   4. «Ya me pagó» sin medio: el cuadro de cobro abre SIN nada elegido, solo Efectivo / Transferencia / Mixto (Galicia,
      sin MP ni Brubank), y el botón dice «Elegí cómo te pagó». Con Transferencia, la cuenta es Galicia sin elegirla.
   A 393 con toque real (WebKit) y a 1440 con mouse (Chromium). */
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || '.';
const prep = fs.readFileSync(path.join(__dirname, 'juntada_pagos.js'), 'utf8');
const SB = prep.match(/const SB = '([^']+)'/)[1], PUB = prep.match(/PUB = '([^']+)'/)[1];
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 500))); };
async function app(br, vp) {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const ctx = await br.newContext(vp);
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
      localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});
      localStorage.removeItem('maleu_np_borrador');}catch(e){}
    window.confirm=function(){return true;}; window.alert=function(){}; window.__cortado=[];
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||/(_directo|cobrar|anotar|guardar|borrar|marcar|limpiar|aplicar|escribir|crear|alta|cerrar|resolver|descobr|deshacer|_set)/.test(r[1]))){
        var b=null;try{b=JSON.parse(x.body);}catch(e){} window.__cortado.push({fn:(r&&r[1])||s.slice(0,60),p:b&&(b.p||b)});
        var resp=(r&&r[1]==='pedido_alta_directo')?{ok:true,directo:true,aceptada:true,n:999991,ref:'Home #999991'}:{ok:false,err:'cortado por la prueba'};
        return Promise.resolve(new Response(JSON.stringify(resp),{status:200,headers:{'Content-Type':'application/json'}}));}
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage(); pg.__errs = []; pg.on('pageerror', (e) => pg.__errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof D !== 'undefined' && D && (D.pedidos || []).length > 0, null, { timeout: 180000 });
  await T(2500);
  await pg.evaluate(() => { go('ruta'); });
  await pg.waitForFunction(() => typeof switchTab === 'function' && typeof npSetPago === 'function', null, { timeout: 40000 });
  await pg.evaluate(() => { switchTab('nuevo'); }); await T(2500);
  return { ctx, pg };
}
async function tocar(pg, sel, txt, mouse) {
  const b = await pg.evaluate(([sel, txt]) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!txt || x.textContent.trim() === txt); })[0];
    if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: Math.round(r.height) }; }, [sel, txt || '']);
  if (!b) return null; await T(250);
  b.mismo = await pg.evaluate(([sel, txt, x, y]) => { const h = document.elementFromPoint(x, y); return [].slice.call(document.querySelectorAll(sel)).some((e) => (!txt || e.textContent.trim() === txt) && (e === h || e.contains(h))); }, [sel, txt || '', b.x, b.y]);
  if (mouse) await pg.mouse.click(b.x, b.y); else await pg.touchscreen.tap(b.x, b.y);
  await T(300); return b;
}
const activos = (pg) => pg.evaluate(() => [].filter.call(document.querySelectorAll('.np-pago .np-chip.active'), (b) => b.offsetParent !== null || 1).map((b) => b.dataset.pago));
(async () => {
  for (const modo of [{ n: '393', br: 'webkit', vp: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, mouse: false },
                      { n: '1440', br: 'chromium', vp: { viewport: { width: 1440, height: 900 } }, mouse: true }]) {
    console.log('\n=== ' + modo.n + ' (' + (modo.mouse ? 'mouse' : 'toque') + ') ===');
    const br = await pw[modo.br].launch();
    try {
      const { pg } = await app(br, modo.vp);
      chk(modo.n + ': «Cómo paga» arranca sin nada marcado (npPago vacío)', (await activos(pg)).length === 0 && await pg.evaluate(() => npPago === ''), { act: await activos(pg), np: await pg.evaluate(() => npPago) });
      const nota0 = await pg.evaluate(() => { const e = document.getElementById('npPagoNota'); return e && getComputedStyle(e).display !== 'none' ? e.textContent : ''; });
      chk(modo.n + ': dice «a definir» («' + nota0 + '»)', /a definir/.test(nota0), nota0);
      let b = await tocar(pg, '.np-pago .np-chip', 'Transferencia', modo.mouse);
      chk(modo.n + ': tocar «Transferencia» la marca (el dedo cae en el botón, ' + (b && b.h) + ' px)', !!b && b.mismo && (await activos(pg)).join() === 'Transferencia', { b, act: await activos(pg) });
      await tocar(pg, '.np-pago .np-chip', 'Transferencia', modo.mouse);
      chk(modo.n + ': tocarla otra vez la desmarca (vuelve a «a definir»)', (await activos(pg)).length === 0 && await pg.evaluate(() => npPago === ''), await activos(pg));
      /* Un pedido de verdad en el carrito (sin guardar en la base: el alta está cortada). */
      const prep = await pg.evaluate(() => { document.getElementById('npNombre').value = 'PRUEBA A Definir'; const t = document.getElementById('npTel'); if (t) t.value = '1100000000';
        const p = (NP_CAT_FLAT || []).filter((x) => x && x.id && Number(x.price || x.precio || x.p) > 0)[0] || (NP_CAT_FLAT || [])[0]; if (!p) return null; npQty(p.id, 1);
        try { npRenderFechas(); } catch (e) {} const f = document.querySelector('#npFechas [data-fecha], #npFechas button'); if (f) f.click(); return { id: p.id, fecha: npFechaSel }; });
      await T(600);
      const msgAD = await pg.evaluate(() => npResumenTextoWA());
      chk(modo.n + ': el mensaje al cliente «a definir» lleva el alias maleu26', /maleu26/.test(msgAD) && /Si transferís/.test(msgAD), msgAD.split('\n').slice(-3));
      await tocar(pg, '.np-pago .np-chip', 'Efectivo', modo.mouse);
      const msgEf = await pg.evaluate(() => npResumenTextoWA());
      chk(modo.n + ': con Efectivo no lleva alias', !/maleu26/.test(msgEf), msgEf.split('\n').slice(-3));
      await tocar(pg, '.np-pago .np-chip', 'Efectivo', modo.mouse);
      /* Guardar «a definir». */
      await pg.evaluate(() => { window.__cortado = []; npGuardar(); }); await T(2500);
      const alta = await pg.evaluate(() => (window.__cortado || []).filter((x) => x.fn === 'pedido_alta_directo').map((x) => x.p)[0] || null);
      chk(modo.n + ': guardar «a definir» manda pago vacío (no inventa un medio)', !!alta && alta.pago === '', alta && { pago: alta.pago, total: alta.total });
      if (modo.n === '393') await pg.screenshot({ path: path.join(OUT, 'pedido_a_definir_393.png') });
      /* «Ya me pagó» sin medio → el cuadro de cobro. */
      await pg.evaluate(() => { try { cerrarCobroRuta && cerrarCobroRuta(); } catch (e) {} _cobroRutaState = null; switchTab('nuevo');
        _npAbrirCobro({ d: { canal: 'Home', nombre: 'PRUEBA A Definir', telefono: '1100000000', pago: '', subtotalSinDescuento: 38000, envio: 0, estadoEntrega: 'Pendiente', items: [] }, total: 38000, nom: 'PRUEBA' }, { n: 999991 }); });
      await T(1500);
      const cu = await pg.evaluate(() => { const box = document.getElementById('cobroRutaFp'); if (!box) return null;
        const pills = [].map.call(box.querySelectorAll('.cobro-pill'), (b) => b.textContent.trim()), on = [].filter.call(box.querySelectorAll('.cobro-pill.on'), () => 1).length;
        const btn = [].filter.call(document.querySelectorAll('button'), (b) => /Elegí cómo te pagó/.test(b.textContent) && b.getClientRects().length)[0];
        return { pills, on, btn: btn ? btn.textContent.trim() : null }; });
      console.log('       cuadro: ' + JSON.stringify(cu));
      /* (`_cobroRutaState` leído desde afuera es la copia vieja de la sub-app: se mira la pantalla.) */
      chk(modo.n + ': el cuadro abre SIN medio elegido (ninguna pastilla marcada)', !!cu && cu.on === 0, cu);
      chk(modo.n + ': ofrece Efectivo / Transferencia / Mixto (Galicia: sin MP ni Brubank)', !!cu && cu.pills.join('|') === 'Efectivo|Transferencia|Mixto', cu && cu.pills);
      chk(modo.n + ': el botón dice «Elegí cómo te pagó»', !!cu && !!cu.btn, cu && cu.btn);
      if (modo.n === '393') await pg.screenshot({ path: path.join(OUT, 'cobro_sin_medio_393.png') });
      else await pg.screenshot({ path: path.join(OUT, 'cobro_sin_medio_1440.png') });
      b = await tocar(pg, '#cobroRutaFp .cobro-pill', 'Transferencia', modo.mouse);
      const tr = await pg.evaluate(() => ({ fp: [].map.call(document.querySelectorAll('#cobroRutaFp .cobro-pill.on'), (b) => b.textContent.trim()).join(), cta: _ctaDeCobro({ cta: '' }, 'Transferencia'), mp: (document.getElementById('cobroRecMP') || {}).value, falta: _faltaCtaCobro({ fp: 'Transferencia', cta: '' }), btn: (document.getElementById('cobroRutaConfirm') || {}).textContent }));
      chk(modo.n + ': «Transferencia» → a Galicia sin elegir cuenta, con el total cargado (' + JSON.stringify(tr) + ')', !!b && b.mismo && tr.fp === 'Transferencia' && tr.cta === 'galicia' && !tr.falta && /38/.test(String(tr.mp)), tr);
      const esc = await pg.evaluate(() => (window.__cortado || []).filter((x) => /cobrar|cobro/.test(x.fn)).length);
      chk(modo.n + ': nada se cobró (' + esc + ' cobros cortados) y sin errores de JS', esc === 0 && pg.__errs.length === 0, pg.__errs);
    } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
    await br.close();
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
