/* «CAMBIAR DÍA DE ENTREGA» EN LA FICHA DE UN PEDIDO DE RED (26/11/2026, 875). Chromium, 390 y 1440, SOLO LECTURA
   (la guarda de sbses_guarda.js corta toda directa: el Guardar tiene que terminar en «No se cambió el día»).
     PW=<playwright-core> SBSES=<sesion.json> BASE=http://localhost:8155/app.html node probar_red_dia.js
   Casos: un Red vivo sin la bolsa dada (admin: botón; el cuadro dice a qué viernes va; Guardar manda updateDiaEntrega
   con diaAntes), el mismo con rol «equipo» (sin botón), un Red entregado (sin botón) y un Home (sin el botón de Red). */
'use strict';
const pw = require(process.env.PW || 'playwright-core');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155/app.html';
let ok = 0, mal = 0;
const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 400))); };
(async () => {
  const br = await pw.chromium.launch();
  for (const ancho of [390, 1440]) {
    const ctx = await br.newContext({ viewport: { width: ancho, height: 900 }, isMobile: ancho < 500, hasTouch: ancho < 500 });
    await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));}catch(e){}
      window.confirm=function(){return false;}; window.alert=function(){};` + sbses(process.env.SBSES, 'tadeo'));
    const pg = await ctx.newPage();
    const err = []; pg.on('pageerror', (e) => err.push(String(e.message).slice(0, 160)));
    console.log('\n=== Red: cambiar día · ' + ancho + 'px ===');
    await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.go === 'function' && window.D && (D.pedidos || []).length > 500, null, { timeout: 150000 }).catch(() => {});
    await pg.evaluate(() => go('pedidos')); await pg.waitForTimeout(1500);
    const casos = await pg.evaluate(() => {
      const L = D.pedidos || [], f = (x) => x ? { h: x.h, n: String(x.n), r: Number(x.r) || 0, dee: x.dee, ev: x.ev, es: x.es } : null;
      return { vivo: f(L.filter((y) => y.h === 'Red' && y.es !== 'Entregado' && y.es !== 'Cancelado' && String(y.ev || '').trim() !== 'Entregado' && /^\d{4}-/.test(String(y.dee || ''))).slice(-1)[0]),
               ent: f(L.filter((y) => y.h === 'Red' && y.es === 'Entregado').slice(-1)[0]),
               home: f(L.filter((y) => y.h === 'Home' && y.es !== 'Entregado' && y.es !== 'Cancelado').slice(-1)[0]) };
    });
    const mas = async (p) => {
      await pg.evaluate((p) => { try { closeOrdDetail(); } catch (e) {} openOrdDetail(p.h, p.n, p.r); }, p);
      await pg.waitForTimeout(2500);
      return pg.evaluate(() => [].slice.call(document.querySelectorAll('#ordMas .ofx-mas-b button')).map((b) => b.textContent.trim()));
    };
    chk('hay un Red vivo, un Red entregado y un Home para mirar', !!(casos.vivo && casos.ent && casos.home), casos);
    if (casos.vivo) {
      const m = await mas(casos.vivo);
      chk('admin, Red #' + casos.vivo.n + ' vivo: «Cambiar día de entrega» en Más opciones', m.indexOf('Cambiar día de entrega') >= 0, m);
      /* el cuadro, abierto con un clic real */
      await pg.evaluate(() => { const s = document.querySelector('#ordMas > summary'); if (s && !document.getElementById('ordMas').open) s.click(); });
      await pg.waitForTimeout(300);
      const b = pg.locator('#ordMas .ofx-mas-b button', { hasText: 'Cambiar día de entrega' });
      await b.scrollIntoViewIfNeeded(); await b.click();
      await pg.waitForTimeout(400);
      const c = await pg.evaluate(() => ({ v: (document.getElementById('redDiaD') || {}).value, nota: (document.getElementById('redDiaN') || {}).textContent }));
      chk('el cuadro trae la fecha del pedido (' + casos.vivo.dee + ')', c.v === String(casos.vivo.dee).slice(0, 10), c);
      chk('dice a qué viernes de bolsa va', /bolsa del viernes \d{2}\/\d{2}/.test(c.nota || ''), c);
      await pg.fill('#redDiaD', '2026-12-09');
      await pg.dispatchEvent('#redDiaD', 'input');
      const n2 = await pg.evaluate(() => document.getElementById('redDiaN').textContent);
      chk('miércoles 09/12 → bolsa del viernes 04/12', /viernes 04\/12/.test(n2), n2);
      await pg.click('#redDiaOk'); await pg.waitForTimeout(2500);
      const bl = await pg.evaluate(() => (window.__bloqueados || []).filter((x) => /updateDiaEntrega|pedido_dia_directo/.test(x)));
      chk('Guardar manda updateDiaEntrega (cortado por la prueba) con diaAntes', bl.length > 0 && bl.some((x) => /diaAntes/.test(x) || /pedido_dia_directo/.test(x)), bl);
      const t = await pg.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent : ''; });
      const sigue = await pg.evaluate(() => !!document.getElementById('entFechaOv'));
      chk('con la base cortada, avisa que no se cambió y no cierra el cuadro', /No se cambió el día/.test(t) && sigue, { t, sigue });
      await pg.evaluate(() => { const o = document.getElementById('entFechaOv'); if (o) o.remove(); });
      /* otro rol */
      await pg.evaluate(() => { window.__rolAntes = SESSION.rol; SESSION.rol = 'equipo'; });
      const m2 = await mas(casos.vivo);
      chk('rol equipo: sin el botón', m2.indexOf('Cambiar día de entrega') < 0, m2);
      await pg.evaluate(() => { SESSION.rol = window.__rolAntes; });
    }
    if (casos.ent) { const m = await mas(casos.ent); chk('Red entregado #' + casos.ent.n + ': sin el botón', m.indexOf('Cambiar día de entrega') < 0, m); }
    if (casos.home) { const m = await mas(casos.home); chk('Home #' + casos.home.n + ': sin el botón de Red', m.indexOf('Cambiar día de entrega') < 0, m); }
    /* la tarjeta de Pedidos: la fecha del Red vivo se edita (admin) */
    if (casos.vivo) {
      const inp = await pg.evaluate((n) => { try { closeOrdDetail(); } catch (e) {} const e = document.getElementById('fe-Red' + n); return e ? e.getAttribute('onchange') : null; }, casos.vivo.n);
      chk('tarjeta de Pedidos: la fecha del Red vivo es editable para el admin (o la tarjeta no está pintada)', inp === null || /cambiarFechaEntrega/.test(inp), inp);
    }
    chk('sin errores de página', err.length === 0, err);
    await ctx.close();
  }
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
