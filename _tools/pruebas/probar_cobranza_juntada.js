/* LA JUNTADA EN LA TARJETA DE COBRANZA, CON UNA JUNTADA REAL Y SIN ESCRIBIR NADA (21/11/2026, noche).
   Tadeo: «Tadeo en la calle, con el celular, cobrándole a 5 amigos». Abre Ruta › COBRANZA como admin (sesión temporal
   tadeo/admin de sesion_prueba.py), busca la tarjeta del pedido de juntada PED y mira que diga lo mismo que la ficha:
   quién pagó, quién falta, cuánto falta, y que «Marcar pagó» arme el cobro parcial correcto. TODO POST que no sea una
   lectura se corta: no se cobra nada.
     PW=<playwright-core> SES=<sesion.json> PED=Home:2533 [CRM=<clave de un comensal>] OUT=<dir> node probar_cobranza_juntada.js */
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || '.';
const [PH, PN] = String(process.env.PED || 'Home:2533').split(':');
const prep = fs.readFileSync(path.join(__dirname, 'juntada_pagos.js'), 'utf8');
const SB = prep.match(/const SB = '([^']+)'/)[1], PUB = prep.match(/PUB = '([^']+)'/)[1];
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 600))); };
async function abrirApp(br, vp) {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const ctx = await br.newContext(vp);
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
      localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return true;}; window.alert=function(){}; window.__cortado=[];
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||(r&&/(_directo|cobrar|anotar|guardar|borrar|marcar|limpiar|aplicar|escribir|crear|alta|cerrar|resolver|descobr|deshacer|_set)/.test(r[1]))||!r)){
        var b=null;try{b=JSON.parse(x.body);}catch(e){} window.__cortado.push({fn:(r&&r[1])||s.slice(0,60),p:b&&(b.p||b)});
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage(); pg.__errs = []; pg.on('pageerror', (e) => pg.__errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof D !== 'undefined' && D && (D.pedidos || []).length > 0, null, { timeout: 180000 });
  await T(3000);
  return { ctx, pg };
}
(async () => {
  const br = await pw.webkit.launch();
  try {
    const { pg } = await abrirApp(br, { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const p0 = await pg.evaluate(([h, n]) => { const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); return p ? { c: p.c, es: p.es, ep: p.ep, grp: p.grp, $: p.$ } : null; }, [PH, PN]);
    console.log('\n=== ' + PH + ' #' + PN + ' · ' + JSON.stringify(p0) + ' ===');
    /* La ficha primero: lo que dice. */
    await pg.evaluate(([h, n]) => { go('pedidos'); const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); openOrdDetail(p.h, String(p.n), Number(p.r) || 0); }, [PH, PN]);
    await T(1500); await pg.evaluate(() => { const m = document.getElementById('ordMas'); if (m) m.open = true; });
    const fic = await pg.waitForFunction(([h, n]) => { const c = document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"] .com-cuenta'); return c && /Pagaron|cobrado/.test(c.textContent) ? c.textContent.replace(/\s+/g, ' ') : null; }, [PH, PN], { timeout: 30000 }).then((x) => x.jsonValue()).catch(() => null);
    console.log('  ficha: ' + fic);
    await pg.evaluate(() => { try { closeOrdDetail(); } catch (e) {} go('ruta'); });
    await pg.waitForFunction(() => typeof switchTab === 'function', null, { timeout: 30000 });
    await T(2000);
    await pg.evaluate(() => { switchTab('cobros'); });
    const tarj = await pg.waitForFunction(([h, n]) => !!document.querySelector('.com-cob[data-com="' + h + '|' + n + '"] .com-cuenta'), [PH, PN], { timeout: 60000 }).then(() => true).catch(() => false);
    chk('la tarjeta de Cobranza del pedido tiene la juntada', tarj, await pg.evaluate(() => [].map.call(document.querySelectorAll('.cg-card'), (c) => c.textContent.replace(/\s+/g, ' ').slice(0, 80)).slice(0, 8)));
    if (tarj) {
      await pg.waitForFunction(([h, n]) => { const c = document.querySelector('.com-cob[data-com="' + h + '|' + n + '"] .com-cuenta'); return c && /Pagaron|cobrado/.test(c.textContent); }, [PH, PN], { timeout: 30000 }).catch(() => 0);
      const cob = await pg.evaluate(([h, n]) => { const c = document.querySelector('.com-cob[data-com="' + h + '|' + n + '"]'); c.scrollIntoView({ block: 'center' });
        return { cuenta: c.querySelector('.com-cuenta').textContent.replace(/\s+/g, ' '), filas: [].map.call(c.querySelectorAll('.com-fila'), (f) => f.textContent.replace(/\s+/g, ' ').trim()), pagar: [].map.call(c.querySelectorAll('button.com-pagar'), (b) => b.getAttribute('data-n') + ' ' + b.getAttribute('data-m')),
          chicos: [].filter.call(c.querySelectorAll('button'), (b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 43.5; }).map((b) => b.textContent.trim()) }; }, [PH, PN]);
      console.log('  cobranza: ' + JSON.stringify(cob));
      chk('Cobranza dice lo mismo que la ficha («' + (cob.cuenta || '').slice(0, 70) + '»)', !!fic && cob.cuenta === fic, { fic, cob: cob.cuenta });
      chk('ningún botón de la tarjeta de juntada mide menos de 44 px', cob.chicos.length === 0, cob.chicos);
      await T(400); await pg.screenshot({ path: path.join(OUT, 'cobranza_real_393.png') });
      if (cob.pagar.length) {
        const b = await pg.evaluate(([h, n]) => { const x = document.querySelector('.com-cob[data-com="' + h + '|' + n + '"] button.com-pagar'); x.scrollIntoView({ block: 'center' }); const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, n: x.getAttribute('data-n'), m: Number(x.getAttribute('data-m')) }; }, [PH, PN]);
        await T(300); await pg.touchscreen.tap(b.x, b.y); await T(1500);
        const cort = await pg.evaluate(() => (window.__cortado || []).filter((x) => x.p && x.p.action === 'cobrarParcial').map((x) => x.p));
        console.log('  cobro que saldría: ' + JSON.stringify(cort[0] || null));
        chk('«Marcar pagó» desde Cobranza arma el parcial de ' + b.n + ' por ' + b.m + ' con su nota (cortado: no se cobró)', cort.length === 1 && cort[0].monto === b.m && cort[0].notas === 'Juntada: ' + b.n && cort[0].pagador === b.n, cort);
      }
    }
    chk('393: sin errores de JS', pg.__errs.length === 0, pg.__errs);
    /* La ficha del CRM de un comensal (393 y 1440). */
    if (process.env.CRM) {
      for (const vp of [{ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, n: '393' }, { viewport: { width: 1440, height: 900 }, n: '1440' }]) {
        const A = vp.n === '393' ? { pg } : await abrirApp(br, vp);
        await A.pg.evaluate(() => { try { closeOrdDetail(); } catch (e) {} go('estancias'); });
        await A.pg.waitForFunction(() => document.querySelectorAll('[onclick*="crmOpenCliente"]').length > 20, null, { timeout: 90000 }).catch(() => 0);
        await T(4000);
        await A.pg.evaluate((k) => { try { _COM.t = 0; _comCargar(); } catch (e) {} crmOpenCliente(encodeURIComponent(k)); }, process.env.CRM);
        const con = await A.pg.waitForFunction(() => { const e = document.querySelector('#crmResCtl .pf-con'); return e && /Comió en/.test(e.textContent) ? e.textContent : null; }, null, { timeout: 40000 }).then((x) => x.jsonValue()).catch(() => null);
        chk(vp.n + ': la ficha del CRM del comensal dice dónde comió («' + con + '»)', !!con, con);
        await A.pg.evaluate(() => { const e = document.getElementById('crmResCtl'); if (e) e.scrollIntoView({ block: 'center' }); });
        await T(500); await A.pg.screenshot({ path: path.join(OUT, 'crm_comensal_' + vp.n + '.png') });
      }
    }
    /* El alta de una persona nueva, a 1440 (sin guardar). */
    const B = await abrirApp(br, { viewport: { width: 1440, height: 900 } });
    await B.pg.evaluate(([h, n]) => { go('pedidos'); const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); openOrdDetail(p.h, String(p.n), Number(p.r) || 0); }, [PH, PN]);
    await T(1500); await B.pg.evaluate(() => { const m = document.getElementById('ordMas'); if (m) m.open = true; }); await T(1500);
    await B.pg.evaluate(([h, n]) => { comAbrir(h, n); }, [PH, PN]); await T(500);
    await B.pg.fill('#com-' + PH + '-' + PN + '-q', 'Juana Pérez de prueba'); await B.pg.evaluate(([h, n]) => comBuscarIn(h, n, document.getElementById('com-' + h + '-' + n + '-q')), [PH, PN]); await T(600);
    await B.pg.screenshot({ path: path.join(OUT, 'buscar_1440.png') });
    await B.pg.click('.com-r.nuevo'); await T(600);
    await B.pg.evaluate(() => { const f = document.querySelector('[id^="fpers-com"]'); if (f) f.scrollIntoView({ block: 'center' }); });
    await B.pg.click('[id^="fpers-com"] .pf-chip:has-text("Casa de fin de semana")'); await T(1500);
    await B.pg.screenshot({ path: path.join(OUT, 'alta_nueva_1440.png') });
    const sinElegir = await B.pg.evaluate(() => [].filter.call(document.querySelectorAll('[id^="fpers-com"] .pf-chip.on'), (x) => 1).length);
    chk('1440: el alta abre con «Casa de fin de semana» elegida recién al tocarla (' + sinElegir + ' marcada)', sinElegir === 1, sinElegir);
    const cort = await B.pg.evaluate(() => (window.__cortado || []).map((x) => x.fn));
    chk('nada se escribió (cortado: ' + JSON.stringify(cort) + ')', cort.every((f) => f !== 'crm_persona_directo' && f !== 'juntada_integrante_directo'), cort);
    chk('1440: sin errores de JS', B.pg.__errs.length === 0, B.pg.__errs);
  } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  await br.close(); process.exit(mal ? 1 : 0);
})();
