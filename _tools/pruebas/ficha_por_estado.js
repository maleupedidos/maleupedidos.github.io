/* LA FICHA DEL PEDIDO MUESTRA LO QUE SIRVE EN ESE ESTADO (21/11/2026, Tadeo 19:59). WebKit 390, toque real, SOLO LECTURA.
   PW=<playwright-core> SES=<sesion.json> BASE=http://localhost:8155/app.html OUT=<carpeta> PREFIJO=nuevo [VIEJO=1]
     node ficha_por_estado.js
   Cuatro pedidos reales: pendiente (Home 2541), entregado sin cobrar (Home 2533), cobrado (Home 2537, Sofía Bas, Galicia,
   Santos 21/11 19:41) y uno cancelado. De cada uno: el chip del cobro, el bloque COBRO, la fila del teléfono, «De qué
   freezer», la botonera y «Más opciones» (abierto con el dedo). Captura de cada ficha y de «Más opciones».
   Con VIEJO=1 solo informa (es el build de antes, para comparar). */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || '.', PREF = process.env.PREFIJO || 'ficha';
const VIEJO = !!process.env.VIEJO;
let ok = 0, mal = 0; const chk = (n, c, d) => { if (VIEJO) return; c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
/* El pendiente se busca en el momento (los de hoy se entregan mientras se corre). */
const CASOS = [['pendiente', null, 'PEND'], ['entregado_sin_cobrar', 'Home', '2533'], ['cobrado', 'Home', '2537'], ['cancelado', null, null]];
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^tienda_cuentas$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage();
  const errores = []; pg.on('pageerror', (e) => errores.push(String(e.message).slice(0, 160)));
  console.log('\n=== Ficha por estado · ' + BASE.split('/').pop() + (VIEJO ? ' (build anterior, solo informa)' : '') + ' ===');
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && window.D && (D.pedidos || []).length > 1000 && (D.pedidos || []).some((x) => x.grp), null, { timeout: 150000 }).catch(() => {});
  await pg.evaluate(() => go('pedidos')); await pg.waitForTimeout(2000);
  for (const [est, h0, n0] of CASOS) {
    const p = await pg.evaluate(([h, n]) => { const L = D.pedidos || []; const x = h ? L.filter((y) => y.h === h && String(y.n) === n)[0]
        : (n === 'PEND' ? L.filter((y) => (y.h === 'Home' || y.h === 'Pilar') && y.es !== 'Entregado' && y.es !== 'Cancelado' && y.ep !== 'Cobrado' && y.n && y.n !== '-' && Number(y.$) > 0).slice(-1)[0]
        : L.filter((y) => y.es === 'Cancelado' && (y.h === 'Home' || y.h === 'Pilar') && y.n && y.n !== '-')[0]); return x ? { h: x.h, n: String(x.n), r: Number(x.r) || 0, c: x.c, es: x.es, ep: x.ep } : null; }, [h0, n0]);
    if (!p) { console.log('  --   ' + est + ': no encontré el pedido'); continue; }
    await pg.evaluate((p) => { try { closeOrdDetail(); } catch (e) {} openOrdDetail(p.h, p.n, p.r); }, p);
    await pg.waitForTimeout(4500);   /* el cobro y «salió de» llegan de la base */
    await pg.evaluate(() => Promise.all(['400', '600', '700', '800'].map((w) => document.fonts.load(w + ' 16px Montserrat'))).then(() => document.fonts.ready)).catch(() => {});
    await pg.screenshot({ path: path.join(OUT, PREF + '_' + est + '.png') });
    /* «Más opciones» con un toque de verdad. */
    const s = await pg.evaluate(() => { const e = document.querySelector('#ordMas > summary'); if (!e) return null; e.scrollIntoView({ block: 'center' }); return true; });
    if (s) { await pg.waitForTimeout(400); const r = await pg.evaluate(() => { const b = document.querySelector('#ordMas > summary').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); await pg.touchscreen.tap(r.x, r.y); await pg.waitForTimeout(600);
      await pg.evaluate(() => { const m = document.querySelector('#ordMas .ofx-mas-b'); if (m) m.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(400);
      await pg.screenshot({ path: path.join(OUT, PREF + '_' + est + '_mas.png') }); }
    const F = await pg.evaluate(() => {
      const t = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
      const fuera = (e) => !e.closest('#ordMas');
      return {
        chip: t('#ordBody .ofx-est'), cobro: t('#ordBody #ofxCobro'),
        tel: t('#ordBody .ofx-datos'), telHref: (document.querySelector('#ordBody .ord-tel') || {}).getAttribute ? document.querySelector('#ordBody .ord-tel').getAttribute('href') : '',
        cambiarVisible: [].slice.call(document.querySelectorAll('#ordBody button')).filter((b) => fuera(b) && /^cambiar$/i.test(b.textContent.trim())).length,
        dep: [].slice.call(document.querySelectorAll('#ordBody .ped-dep')).filter(fuera).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '),
        depBotones: [].slice.call(document.querySelectorAll('#ordBody .ped-dep-x')).filter(fuera).length,
        botonera: [].slice.call(document.querySelectorAll('.ord-drawer.open .ord-actions button')).map((b) => b.textContent.trim()),
        mas: [].slice.call(document.querySelectorAll('#ordMas .ofx-mas-b button')).map((b) => b.textContent.trim()),
      };
    });
    console.log('\n  [' + est + '] ' + p.h + ' #' + p.n + ' · ' + p.c + ' · ' + p.es + ' / ' + p.ep);
    console.log('    chip: ' + F.chip + '\n    cobro: ' + (F.cobro || '—') + '\n    tel: ' + F.tel.slice(0, 80) + ' (' + F.telHref + ')\n    freezer: ' + (F.dep || '—') + ' · botones ' + F.depBotones
      + '\n    botonera: ' + JSON.stringify(F.botonera) + '\n    más opciones: ' + JSON.stringify(F.mas));
    chk(est + ': el teléfono no tiene «cambiar» a la vista y se toca para llamar', F.cambiarVisible === 0 && (!F.telHref || /^tel:/.test(F.telHref)), F);
    if (est !== 'cancelado' && F.telHref) chk(est + ': «Cambiar teléfono» está en Más opciones', F.mas.indexOf('Cambiar teléfono') >= 0, F.mas);
    if (est === 'cobrado') {
      chk('cobrado: el chip dice la cuenta (Galicia)', /Galicia/.test(F.chip), F.chip);
      if (!VIEJO) chk('cobrado: el chip NO repite la línea del bloque Cobro (sin quién ni cuándo)', !/Santos|19:41|Maleu/.test(F.chip.split('Cobrado')[1] || ''), F.chip);
      chk('cobrado: el bloque COBRO dice cuenta, quién y cuándo', /Galicia/.test(F.cobro) && /Santos/.test(F.cobro) && /21\/11 19:41/.test(F.cobro), F.cobro);
    }
    if (est === 'entregado_sin_cobrar' || est === 'cobrado') {
      chk(est + ': «De qué freezer salió» sin botones a la vista', F.depBotones === 0, F);
      chk(est + ': sin «Pesar» ni «Editar productos» en la botonera', !F.botonera.some((b) => /Pesar|Editar productos/.test(b)), F.botonera);
      chk(est + ': «Editar productos» y «Corregir de qué freezer salió» en Más opciones', F.mas.indexOf('Editar productos') >= 0 && (F.dep === '' || F.mas.indexOf('Corregir de qué freezer salió') >= 0), F.mas);
    }
    if (est === 'pendiente') {
      chk('pendiente: «Editar productos» a la vista', F.botonera.indexOf('Editar productos') >= 0, F.botonera);
      chk('pendiente: el freezer se elige con los botones a la vista', F.dep === '' || F.depBotones > 0, F);
      if (!VIEJO) chk('pendiente: el freezer no se repite como texto encima de los botones', F.dep === '' || (F.dep.match(/Ustariz/g) || []).length <= 1, F.dep);
    }
  }
  chk('sin errores de JS', errores.length === 0, errores.slice(0, 4));
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
