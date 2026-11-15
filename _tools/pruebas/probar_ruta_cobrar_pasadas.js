/* EL REPARTIDOR COBRA ENTREGAS PASADAS (15/11/2026, 718). En WebKit (el motor del iPhone), 390×844.
 *
 *   python ../estancias/scripts/migraciones/sesion_prueba.py crear <ses.json> santos repartidor
 *   PW=<carpeta de playwright-core> SESION=<ses.json> [BASE=https://app.maleu.com.ar/app.html] node _tools/pruebas/probar_ruta_cobrar_pasadas.js
 *
 * Tadeo: «el usuario de Tatu no tiene para cobrar entregas pasadas, solo entregas futuras». Entra como santos (repartidor)
 * a Ruta › COBRANZA, busca en «Deudores» a #2500 Lucia Noriega (entregado el 14/11, $26.000 sin cobrar), abre el cuadro de
 * cobro y se frena ANTES de cobrar. Toda escritura se corta (solo pasan lecturas *_pantalla, *_datos, *_base).
 */
'use strict';
const fs = require('fs');
const { webkit } = require(process.env.PW || 'playwright-core');
const S = process.env.SESION, BASE = process.env.BASE || 'http://localhost:8080/app.html';
if (!S || !fs.existsSync(S)) { console.log('falta SESION=<archivo de sesion_prueba.py>'); process.exit(1); }
const ses = JSON.parse(fs.readFileSync(S, 'utf8'));
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const CLIENTE = process.env.CLIENTE || 'Lucia Noriega';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); } };
(async () => {
  const br = await webkit.launch();
  try {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'santos',rol:'repartidor',ts:Date.now()}));
      localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'santos', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
      (function(){var f=window.fetch;window.__cortados=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
        var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
        if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$/.test(r[1]))){window.__cortados.push((r&&r[1])||s.slice(0,60));return Promise.resolve(new Response('{"ok":false,"err":"cortado por la prueba"}',{status:200,headers:{'Content-Type':'application/json'}}));}
        return f.apply(this,arguments);};})();`);
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message || e)));
    await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.abrirTab === 'function', null, { timeout: 90000 });
    await pg.waitForTimeout(3000);
    await pg.evaluate(() => { try { abrirTab('ruta'); } catch (e) {} });
    await pg.waitForFunction(() => typeof window.switchTab === 'function' && typeof window.renderCobros === 'function', null, { timeout: 60000 });
    await pg.evaluate(() => switchTab('cobros'));
    const hay = await pg.waitForFunction((c) => { const el = document.getElementById('cobrosContent'); return el && el.textContent.indexOf(c) >= 0; }, CLIENTE, { timeout: 60000 }).then(() => true, () => false);
    const vista = await pg.evaluate((c) => {
      const el = document.getElementById('cobrosContent'); const t = el ? el.innerText : '';
      const sec = Array.from(el.querySelectorAll('*')).filter((e) => e.children.length === 0 && /Deudores/.test(e.textContent))[0];
      const card = Array.from(el.querySelectorAll('.cobro-card,[class*="cobro"]')).filter((e) => e.textContent.indexOf(c) >= 0 && e.querySelector('button'))
        .sort((a, b) => a.textContent.length - b.textContent.length)[0];
      return { deudores: !!sec, card: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 160) : '', boton: card ? Array.from(card.querySelectorAll('button')).map((b) => b.textContent.trim()) : [],
        scroll: document.documentElement.scrollWidth > innerWidth + 1, txt: t.slice(0, 200) };
    }, CLIENTE);
    chk('santos ve a ' + CLIENTE + ' en COBRANZA', hay, vista.txt);
    chk('está en «Deudores» con su monto', vista.deudores && /26\.000/.test(vista.card), vista.card);
    chk('tiene el botón para cobrar', vista.boton.some((b) => /Cobrar/i.test(b)), vista.boton);
    chk('sin scroll de costado a 390 px', !vista.scroll);
    if (vista.boton.some((b) => /Cobrar/i.test(b))) {
      await pg.evaluate((c) => {
        const el = document.getElementById('cobrosContent');
        const card = Array.from(el.querySelectorAll('.cobro-card,[class*="cobro"]')).filter((e) => e.textContent.indexOf(c) >= 0 && e.querySelector('button'))
          .sort((a, b) => a.textContent.length - b.textContent.length)[0];
        Array.from(card.querySelectorAll('button')).filter((b) => /Cobrar/i.test(b.textContent))[0].click();
      }, CLIENTE);
      await pg.waitForTimeout(1200);
      const cuadro = await pg.evaluate(() => {
        const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const bs = Array.from(document.querySelectorAll('button')).filter(vis).map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
        /* El cuadro: el contenedor visible más chico que tiene el título «Cobrar a …» y «¿Cómo te pagó?». */
        const ov = Array.from(document.querySelectorAll('div')).filter((e) => vis(e) && /Cobrar a /.test(e.textContent) && /C[oó]mo te pag[oó]/i.test(e.textContent) && !e.querySelector('#cobrosContent') && e.id !== 'cobrosContent')
          .sort((a, b) => a.textContent.length - b.textContent.length)[0];
        return { abierto: !!ov, txt: ov ? ov.innerText.replace(/\s+/g, ' ').slice(0, 260) : '', botones: bs.slice(-8) };
      });
      chk('se abre el cuadro de cobro de siempre (Efectivo / Transferencia)', cuadro.abierto, cuadro);
      chk('el cuadro dice el monto ($26.000)', /26\.000/.test(cuadro.txt), cuadro.txt);
      await pg.screenshot({ path: require('os').tmpdir() + '/ruta_cobro_santos.png' });
      console.log('  (captura: ' + require('os').tmpdir() + '/ruta_cobro_santos.png · NO se tocó «Confirmar»)');
    }
    const cort = await pg.evaluate(() => window.__cortados || []);
    chk('no salió ninguna escritura', cort.length === 0, cort);
    chk('ni un error de la página', errs.length === 0, errs.slice(0, 3));
  } catch (e) { console.log('  reventó la prueba: ' + (e && e.stack || e)); mal++; }
  finally { await br.close(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  process.exitCode = mal ? 1 : 0;
})();
