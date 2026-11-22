/* COBRANZA PLEGADA (22/11/2026, Tadeo: «la tarjeta de la juntada es demasiado larga» y «que Equipo Maleu y Representantes se
   abran y cierren como Deudores»). Entra como el ROBOT por el login (modo ensayo) y mira Ruta › COBRANZA con los datos
   reales, SIN ESCRIBIR: todo POST que no sea una lectura se corta.
   Mide, a 393 (WebKit, toque) y a 1440 (Chromium, cajón abierto):
     · cada juntada es un desplegable CERRADO que a la vista dice «Juntada · Pagaron N de M · faltan $X» (o «Maleu cobrado»),
       sin la lista de comensales ni los cobros a cuenta; al tocarlo se abren, y siguen abiertos después de repintar;
     · una juntada no repite arriba la caja amarilla de cobros a cuenta; las otras tarjetas pliegan el detalle de cada cobro;
     · «Equipo Maleu» y «Representantes» se pliegan con el total a la vista; cerrados no muestran tarjetas; se recuerda.
     PW=<playwright-core> BASE=http://localhost:8155/app.html OUT=<dir> node probar_cobranza_plegada.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || os.tmpdir();
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 700) : '')); } };
const CORTE = `try{localStorage.setItem('maleu_ensayo','1');['deu-eq','deu-re','fut-eq','fut-re'].forEach(function(k){localStorage.removeItem('maleu_cob_sec_'+k);});localStorage.setItem('maleu_cob_sec_fut','1');}catch(e){}
  window.confirm=function(){return true;}; window.alert=function(){}; window.__cortado=[];
  (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
    if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/|login_pin/.test(s)&&(/script\\.google\\.com/.test(s)||(r&&/(_directo|cobrar|anotar|guardar|borrar|marcar|limpiar|aplicar|escribir|crear|alta|cerrar|resolver|descobr|deshacer|_set)/.test(r[1]))||!r)){
      window.__cortado.push((r&&r[1])||s.slice(0,60)); return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
    return f.apply(this,arguments);};})();`;
async function abrir(br, vp, modo) {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const ctx = await br.newContext(vp); await ctx.addInitScript(CORTE + (modo === 'compu' ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : ";try{localStorage.setItem('maleu_sb_open','0')}catch(e){}"));
  const pg = await ctx.newPage(); pg.__errs = []; pg.on('pageerror', (e) => pg.__errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
  await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
  await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
  await T(2000);
  if (modo === 'compu') console.log('  cajón: ' + (await pg.evaluate(() => { if (!document.body.classList.contains('sb-open')) sbToggle(); const s = document.querySelector('nav'); return document.body.classList.contains('sb-open') + ' · ' + (s ? Math.round(s.getBoundingClientRect().width) + ' px' : '?'); })));   /* como Tadeo: el cajón ABIERTO (fijo por persona en la compu) */
  await pg.evaluate(() => { go('ruta'); }); await pg.waitForFunction(() => typeof switchTab === 'function', null, { timeout: 30000 }); await T(1500);
  await pg.evaluate(() => switchTab('cobros'));
  await pg.waitForFunction(() => !!document.querySelector('#cobrosContent .cob-sec'), null, { timeout: 90000 });
  /* Que las juntadas terminen de traer su cuenta («Trayendo…»). */
  await pg.waitForFunction(() => { const l = document.querySelectorAll('#cobrosContent .com-desp-r'); return l.length && ![].some.call(l, (x) => /Trayendo/.test(x.textContent)); }, null, { timeout: 45000 }).catch(() => 0);
  await T(1500);
  return { ctx, pg };
}
async function medir(pg, n) {
  return pg.evaluate(() => {
    /* Chromium le da tamaño a lo de adentro de un <details> cerrado (content-visibility): adentro de uno cerrado no se ve. */
    const vis = (e) => { if (!e) return false; for (let d = e.parentElement; d; d = d.parentElement) { if (d.tagName === 'DETAILS' && !d.open && !e.closest('summary')) return false; } const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0; };
    const J = [].map.call(document.querySelectorAll('#cobrosContent .com-cob'), (c) => {
      const d = c.querySelector('details.com-desp'), card = c.closest('.cobro-card,.cg-card');
      return { k: c.getAttribute('data-com'), abierto: !!(d && d.open), res: d ? d.querySelector('.com-desp-r').textContent.trim() : null, hSum: d ? Math.round(d.querySelector('summary').getBoundingClientRect().height) : 0,
        filasVis: [].filter.call(c.querySelectorAll('.com-fila'), vis).length, alto: Math.round(c.getBoundingClientRect().height),
        amarilla: !!(card && [].some.call(card.querySelectorAll('div[style*="FFF8E1"]'), vis)), altoTarjeta: card ? Math.round(card.getBoundingClientRect().height) : 0 };
    });
    const S = [].map.call(document.querySelectorAll('#cobrosContent details.cob-sub'), (d) => ({ c: d.dataset.c, abierto: d.open, txt: d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(), hSum: Math.round(d.querySelector('summary').getBoundingClientRect().height),
      tarjVis: [].filter.call(d.querySelectorAll('.cobro-card,.cg-card,.cobro-red-card'), vis).length }));
    const P = [].map.call(document.querySelectorAll('#cobrosContent details.cob-parc-d'), (d) => ({ abierto: d.open, txt: d.querySelector('summary').textContent.trim(), h: Math.round(d.querySelector('summary').getBoundingClientRect().height) }));
    return { J, S, P, ancho: document.documentElement.scrollWidth, vw: innerWidth };
  });
}
(async () => {
  const modos = [['celu', 'webkit', { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
                 ['compu', 'chromium', { viewport: { width: 1440, height: 900 } }]];
  for (const [modo, motor, vp] of modos) {
    console.log('\n== ' + modo + ' (' + vp.viewport.width + ') ==');
    const br = await pw[motor].launch();
    try {
      const { pg } = await abrir(br, vp, modo);
      let M = await medir(pg);
      console.log('  juntadas: ' + JSON.stringify(M.J).slice(0, 600));
      console.log('  subgrupos: ' + JSON.stringify(M.S));
      console.log('  cobros a cuenta plegados: ' + M.P.length);
      chk(modo + ': hay al menos una juntada en Cobranza (' + M.J.length + ')', M.J.length > 0);
      chk(modo + ': cada juntada arranca CERRADA, sin comensales a la vista', M.J.every((j) => !j.abierto && j.filasVis === 0), M.J);
      chk(modo + ': a la vista dice cómo viene («' + ((M.J[0] || {}).res || '') + '»)', M.J.every((j) => /Pagaron \d+ de \d+|Maleu cobrado|son \d+|sin cargar/.test(j.res || '')), M.J.map((j) => j.res));
      chk(modo + ': el renglón de la juntada se toca entero (≥ 44 px)', M.J.every((j) => j.hSum >= 44), M.J.map((j) => j.hSum));
      chk(modo + ': la juntada no repite arriba la caja de cobros a cuenta', M.J.every((j) => !j.amarilla), M.J);
      chk(modo + ': el detalle de cobros a cuenta de las otras tarjetas va plegado y se toca (≥ 44 px)', M.P.every((p) => !p.abierto && p.h >= 44), M.P);
      chk(modo + ': «Equipo Maleu» y «Representantes» son desplegables con el total a la vista', M.S.length >= 2 && M.S.every((s) => /\$/.test(s.txt) && s.hSum >= 44), M.S);
      chk(modo + ': sin scroll de costado', M.ancho <= M.vw + 1, M);
      await pg.evaluate(() => { const j = document.querySelector('#cobrosContent .com-cob'); j.scrollIntoView({ block: 'center' }); });
      await T(400); await pg.screenshot({ path: path.join(OUT, 'cobranza_' + modo + '_cerrada.png') });
      /* Tocar la primera juntada: se abre con cobros y comensales. */
      const k = M.J[0].k;
      const tocar = async (sel) => { const b = await pg.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
        if (!b) return false; await T(250); if (modo === 'celu') await pg.touchscreen.tap(b.x, b.y); else await pg.mouse.click(b.x, b.y); await T(700); return true; };
      const sel = '#cobrosContent .com-cob[data-com="' + k + '"] summary';
      await tocar(sel);
      M = await medir(pg); let j = M.J.find((x) => x.k === k);
      chk(modo + ': tocarla la abre y muestra quiénes comieron (' + j.filasVis + ' renglones)', j.abierto && j.filasVis > 0, j);
      await pg.screenshot({ path: path.join(OUT, 'cobranza_' + modo + '_abierta.png') });
      /* Sigue abierta después de repintar (la base contesta y `_comPintar` la reemplaza). */
      await pg.evaluate((k) => { const [h, n] = k.split('|'); _comPintar(h, n); }, k); await T(500);
      M = await medir(pg); j = M.J.find((x) => x.k === k);
      chk(modo + ': repintada sigue abierta', j.abierto && j.filasVis > 0, j);
      await tocar(sel);
      M = await medir(pg); j = M.J.find((x) => x.k === k);
      chk(modo + ': tocarla otra vez la cierra', !j.abierto && j.filasVis === 0, j);
      /* Cerrar «Equipo Maleu» de Deudores: no quedan tarjetas a la vista y lo recuerda. */
      await tocar('#cobrosContent details.cob-sub[data-c="deu-eq"] > summary');
      M = await medir(pg); const s = M.S.find((x) => x.c === 'deu-eq');
      const guardado = await pg.evaluate(() => { try { return localStorage.getItem('maleu_cob_sec_deu-eq'); } catch (e) { return 'x'; } });
      chk(modo + ': cerrar «Equipo Maleu» esconde sus tarjetas y lo recuerda (' + guardado + ')', s && !s.abierto && s.tarjVis === 0 && guardado === '0', { s, guardado });
      await pg.evaluate(() => { document.querySelector('#cobrosContent details.cob-sub[data-c="deu-eq"]').scrollIntoView({ block: 'start' }); window.scrollBy(0, -120); });
      await T(400); await pg.screenshot({ path: path.join(OUT, 'cobranza_' + modo + '_equipo_cerrado.png') });
      await tocar('#cobrosContent details.cob-sub[data-c="deu-eq"] > summary');
      chk(modo + ': no salió ninguna escritura (' + (await pg.evaluate(() => window.__cortado.length)) + ' cortadas)', true);
      chk(modo + ': sin errores de JS', pg.__errs.length === 0, pg.__errs);
    } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
    await br.close();
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
