/* VENTAS › VENTAS: EL PERÍODO DE INICIO Y LA HOJA DE FILTROS (15/11/2026). WebKit 390×844, sesión temporal, toda
 * escritura cortada (solo lee).
 *
 *   PW=<playwright-core> SES_ADMIN=<ses.json de sesion_prueba.py, admin> [BASE=http://localhost:8080/app.html] node _tools/pruebas/probar_ventas_filtros.js
 *
 * Lo que prueba, tocando como una persona:
 *   1. arranca en «Mes» con la etiqueta de Inicio, y ‹ › mueven por las claves de Inicio (s:/m:)
 *   2. «Filtros» abre la hoja; tocar un día es BORRADOR (la tarjeta no cambia); «Ver N ventas» = lo que queda aplicado
 *   3. cerrar con la × descarta el borrador
 *   4. lo aplicado sale como chip quitable debajo del control, y el botón dice «Filtros 1»; la × del chip lo saca
 *   5. el calendario: un rango a medida, y «Toda la historia»
 *   6. el período se recuerda en la sesión (al recargar sigue el mismo)
 */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d) : '')); } };
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES_ADMIN, 'utf8'));
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(String.raw`try{if(!sessionStorage.getItem('__ini')){sessionStorage.setItem('__ini','1');sessionStorage.removeItem('maleu_v_perk');}
    localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now()}));
    localStorage.setItem('mc_sbses',` + JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true })) + String.raw`);}catch(e){}
    window.confirm=function(){return false;};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(),r=/\/rest\/v1\/rpc\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\/v1\/token/.test(s)&&(/script\.google\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))return Promise.resolve(new Response('{"ok":false}',{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  const abrir = async () => {
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.go === 'function', null, { timeout: 90000 });
    await pg.evaluate(() => { go('ventas'); try { vSwitchTab('ventas'); } catch (e) {} });
    await pg.waitForFunction(() => typeof VD !== 'undefined' && VD && VD.length && document.querySelector('#vSum .v-kpi'), null, { timeout: 90000 });
    await pg.waitForTimeout(800);
  };
  const tarjeta = () => pg.evaluate(() => { const k = document.querySelectorAll('#vSum .vs-top .v-kpi')[1]; return k ? Number(k.querySelector('.v-kpi-v').textContent.replace(/\D/g, '')) : -1; });
  const lab = () => pg.evaluate(() => (document.querySelector('#vfPer .k-per-l') || {}).textContent || '');
  try {
    await abrir();
    console.log('\n== 1. El período, como Inicio ==\n');
    const st = await pg.evaluate(() => ({ q: vRango && vRango.q, lab: document.querySelector('#vfPer .k-per-l').textContent, on: (document.querySelector('#vfPer .k-per-seg .on') || {}).textContent, ini: _semCorto(_rtPeriodo('mes', _vHoyAR()).tit) }));
    chk('arranca en «Mes» con la etiqueta de Inicio («' + st.ini + '»)', st.q === 'mes' && st.on === 'Mes' && st.lab === st.ini, st);
    await pg.tap('#vfPer .k-per-seg button:first-child'); await pg.waitForTimeout(400);
    const s1 = await pg.evaluate(() => ({ q: vRango.q, lab: document.querySelector('#vfPer .k-per-l').textContent, ini: _semCorto(_rtPeriodo('sem', _vHoyAR()).tit) }));
    chk('«Semana» pone la semana de Inicio («' + s1.ini + '»)', s1.q === 'sem' && s1.lab === s1.ini, s1);
    const n1 = await tarjeta();
    await pg.tap('#vfPer .k-per-b[aria-label="Anterior"]'); await pg.waitForTimeout(400);
    const s2 = await pg.evaluate(() => ({ q: vRango.q, lab: document.querySelector('#vfPer .k-per-l').textContent, ini: _semCorto(_rtPeriodo(_rtMover('sem', _vHoyAR(), -1), _vHoyAR()).tit), adelante: !document.querySelector('#vfPer .k-per-b[aria-label="Siguiente"]').disabled }));
    chk('‹ va a la semana anterior de Inicio («' + s2.ini + '») y › se habilita', /^s:/.test(s2.q) && s2.lab === s2.ini && s2.adelante, s2);
    await pg.tap('#vfPer .k-per-b[aria-label="Siguiente"]'); await pg.waitForTimeout(400);
    chk('› vuelve a la semana en curso (la tarjeta, igual que antes)', (await tarjeta()) === n1 && !(await pg.evaluate(() => !document.querySelector('#vfPer .k-per-b[aria-label="Siguiente"]').disabled)), { n1, ahora: await tarjeta() });

    console.log('\n== 2. La hoja: borrador y «Ver N ventas» ==\n');
    await pg.tap('#vfPer .k-per-seg button:last-child'); await pg.waitForTimeout(400);
    const nMes = await tarjeta();
    await pg.tap('#vfBtn'); await pg.waitForTimeout(500);
    const h0 = await pg.evaluate(() => { const h = document.getElementById('vfHoja'); const r = h.getBoundingClientRect(); return { vis: !h.hidden && r.height > 200, abajo: Math.round(r.bottom) >= innerHeight - 1, ok: h.querySelector('.vf-h-ok').textContent, secs: [].map.call(h.querySelectorAll('.vf-sec .vf-h'), (x) => x.textContent) }; });
    chk('la hoja sale desde abajo, con Canal, Barrio, Día, Medio de pago y Cobro', h0.vis && h0.abajo && ['Canal', 'Barrio', 'Día de la semana', 'Medio de pago', 'Cobro'].every((x) => h0.secs.indexOf(x) >= 0), h0);
    chk('«Ver ' + nMes + ' ventas» = la tarjeta, sin nada elegido', h0.ok === 'Ver ' + nMes.toLocaleString('es-AR') + ' ventas', { ok: h0.ok, nMes });
    await pg.tap('#vfHoja .vf-dow [data-v="5"]'); await pg.waitForTimeout(300);
    const b1 = await pg.evaluate(() => ({ ok: document.querySelector('#vfHoja .vf-h-ok').textContent, on: document.querySelector('#vfHoja .vf-dow [data-v="5"]').classList.contains('on'), aplicado: vFilt.dow.slice() }));
    const nVie = await pg.evaluate(() => { const l = _vCalcular().lista.filter((v) => _vDer(v).dow === 5); return _vEntregas(l); });
    chk('tocar «V» es borrador: el botón dice «Ver ' + nVie + ' ventas» y todavía no se aplicó', b1.on && b1.ok === 'Ver ' + nVie.toLocaleString('es-AR') + (nVie === 1 ? ' venta' : ' ventas') && b1.aplicado.length === 0 && (await tarjeta()) === nMes, { b1, nVie });
    await pg.tap('#vfHoja .vf-h-x'); await pg.waitForTimeout(300);
    chk('cerrar con la × descarta el borrador', (await pg.evaluate(() => vFilt.dow.length)) === 0 && (await tarjeta()) === nMes && (await pg.evaluate(() => document.getElementById('vfHoja').hidden)));

    console.log('\n== 3. Aplicar, el chip quitable y «Filtros 1» ==\n');
    await pg.tap('#vfBtn'); await pg.waitForTimeout(400);
    await pg.tap('#vfHoja .vf-dow [data-v="5"]'); await pg.waitForTimeout(300);
    await pg.tap('#vfHoja .vf-h-ok'); await pg.waitForTimeout(500);
    const a1 = await pg.evaluate(() => ({ pills: [].map.call(document.querySelectorAll('#vfActivos .vf-pill span'), (x) => x.textContent), btn: document.getElementById('vfBtn').textContent, hoja: document.getElementById('vfHoja').hidden }));
    chk('aplicado: la tarjeta dice ' + nVie + ', el chip «Viernes ×» y el botón «Filtros 1»', (await tarjeta()) === nVie && a1.pills.join() === 'Viernes' && /Filtros\s*1/.test(a1.btn) && a1.hoja, a1);
    await pg.screenshot({ path: process.env.OUT ? process.env.OUT + '/filtro_aplicado_390.png' : require('os').tmpdir() + '/filtro_aplicado_390.png' });
    await pg.tap('#vfActivos .vf-pill'); await pg.waitForTimeout(400);
    chk('la × del chip lo saca y vuelve a ' + nMes, (await tarjeta()) === nMes && (await pg.evaluate(() => document.getElementById('vfActivos').hidden)));

    console.log('\n== 4. El calendario ==\n');
    await pg.tap('#vfPer .k-per-cal'); await pg.waitForTimeout(400);
    await pg.fill('#vfDesde', '03/11/2026'); await pg.fill('#vfHasta', '07/11/2026');
    await pg.tap('#vfHoja .vf-h-ok'); await pg.waitForTimeout(500);
    const c1 = await pg.evaluate(() => ({ r: vRango, lab: document.querySelector('#vfPer .k-per-l').textContent, ref: _rtSumar('2026-11-03', '2026-11-07').tot.ent }));
    chk('un rango a medida: 3/11 a 7/11, la tarjeta = Inicio sobre esos días (' + c1.ref + ')', c1.r && c1.r.d === '2026-11-03' && c1.r.h === '2026-11-07' && (await tarjeta()) === c1.ref, c1);
    await pg.tap('#vfPer .k-per-cal'); await pg.waitForTimeout(400);
    await pg.tap('#vfHoja [data-acc="atajo"][data-v="todo"]'); await pg.waitForTimeout(600);
    chk('«Toda la historia»', (await pg.evaluate(() => vRango === null)) && (await lab()) === 'Toda la historia');
    await pg.tap('#vfPer .k-per-cal'); await pg.waitForTimeout(400);
    await pg.tap('#vfHoja [data-acc="atajo"][data-v="mesAnt"]'); await pg.waitForTimeout(600);
    const lMa = await lab();

    console.log('\n== 5. Se recuerda en la sesión ==\n');
    await abrir();
    chk('al recargar sigue «' + lMa + '»', (await lab()) === lMa, { antes: lMa, ahora: await lab() });
    chk('ni un error de la página', errs.length === 0, errs.slice(0, 3));
  } catch (e) { console.log('  reventó la prueba: ' + (e && e.stack || e)); mal++; }
  finally { await br.close(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  process.exitCode = mal ? 1 : 0;
})();
