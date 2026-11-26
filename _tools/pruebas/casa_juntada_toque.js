/* (21/11/2026) «Entre tocar Casa o Juntada se me congela la pantalla» (Tadeo, iPhone 16, PWA, v1312).
   WebKit 393×852 con toque real: alterna Casa ↔ Juntada en la ficha (Más opciones abierto) y mide:
   - el hilo: un latido cada 50 ms; el hueco más largo entre latidos (un congelamiento real son segundos);
   - cuántas veces se pinta la ficha (openOrdDetail) y la juntada (_comPintar) por toque: un bucle se ve acá;
   - si después del toque la pantalla responde: qué elemento recibe un toque en el medio y si el body quedó trabado.
   La marca NO se escribe: `pedido_grupal_directo` contesta ok falso. Todo POST que no sea lectura se corta.
   Uso: PW=<playwright-core> SES=<sesion.json> [PED=Home:2533] [VUELTAS=5] [OUT=dir] node casa_juntada_toque.js */
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || '';
const PEDS = String(process.env.PED || 'Home:2533').split(',');
const VUELTAS = Number(process.env.VUELTAS || 5);
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co';
const prep = fs.readFileSync(path.join(__dirname, 'juntada_pagos.js'), 'utf8');
const PUB = prep.match(/PUB = '([^']+)'/)[1];
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){window.__conf=(window.__conf||0)+1;return true;}; window.alert=function(){};
    window.__grp={}; window.__cortado=[];
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(r&&r[1]==='pedido_grupal_directo'){var b={};try{b=JSON.parse(x.body).p||{};}catch(e){} window.__grpUlt=b;
        return new Promise(function(ok){setTimeout(function(){ok(new Response(JSON.stringify({ok:true,directo:true,aceptada:true,orden:1}),{status:200,headers:{'Content-Type':'application/json'}}));},400);});}
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^tienda_cuentas$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1]))){
        window.__cortado.push((r&&r[1])||s.slice(0,60));
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
      return f.apply(this,arguments);};})();
    /* El latido: un setTimeout de 50 ms; el hueco más largo es el tiempo que el hilo estuvo trabado. */
    window.__lat={max:0,ult:0,huecos:[]};(function tic(){var a=performance.now();if(window.__lat.ult){var g=a-window.__lat.ult;if(g>window.__lat.max)window.__lat.max=g;if(g>300)window.__lat.huecos.push(Math.round(g));}window.__lat.ult=a;setTimeout(tic,50);})();`);
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof D !== 'undefined' && D && (D.pedidos || []).length > 0 && typeof openOrdDetail === 'function', null, { timeout: 180000 });
  await pg.waitForTimeout(4000);
  /* Contadores: cada pintado de la ficha y de la juntada. */
  await pg.evaluate(() => { window.__n = { ficha: 0, com: 0, render: 0 };
    const o = window.openOrdDetail; window.openOrdDetail = function () { window.__n.ficha++; return o.apply(this, arguments); };
    if (typeof _comPintar === 'function') { const c = _comPintar; window._comPintar = function () { window.__n.com++; return c.apply(this, arguments); }; }
    if (typeof render === 'function') { const r = render; window.render = function () { window.__n.render++; return r.apply(this, arguments); }; } });
  const tap = async (sel, filtro) => {
    const b = await pg.evaluate(([s, f]) => { const x = [].slice.call(document.querySelectorAll(s)).filter((e) => !f || e.textContent.indexOf(f) >= 0)[0]; if (!x) return null;
      x.scrollIntoView({ block: 'center' }); const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, on: x.classList.contains('on') }; }, [sel, filtro]);
    if (!b) return null; await pg.waitForTimeout(250);
    b.antes = await pg.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? ((e.textContent || '').trim().slice(0, 30) + ' <' + e.tagName + '.' + String(e.className).slice(0, 30) + '>') : null; }, [b.x, b.y]);
    await pg.touchscreen.tap(b.x, b.y); return b; };
  const abrir = async (h, n) => {
    await pg.evaluate(([h, n]) => { go('pedidos'); const p = D.pedidos.filter((x) => x.h === h && String(x.n) === n)[0]; openOrdDetail(p.h, String(p.n), Number(p.r) || 0); }, [h, n]);
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => { const m = document.getElementById('ordMas'); if (m && !m.open) { m.open = true; } });
    await pg.waitForTimeout(600);
  };
  const estado = () => pg.evaluate(() => { const dr = document.getElementById('ordDrawer'), cx = innerWidth / 2, cy = innerHeight / 2, el = document.elementFromPoint(cx, cy);
    return { mas: !!(document.getElementById('ordMas') || {}).open, abierta: !!(dr && dr.classList.contains('open')), bodyOv: document.body.style.overflow, enMedio: el ? (el.id || el.className || el.tagName).toString().slice(0, 50) : null,
      esJ: !!document.querySelector('#ordBody .ord-trajo-op.on') && /Juntada/.test(document.querySelector('#ordBody .ord-trajo-op.on').textContent),
      lat: Math.round(window.__lat.max), huecos: window.__lat.huecos.slice(), n: Object.assign({}, window.__n), conf: window.__conf || 0, act: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }; });
  for (const ph of PEDS) {
    const [H, N] = ph.split(':');
    const p0 = await pg.evaluate(([h, n]) => { const p = D.pedidos.filter((x) => x.h === h && String(x.n) === n)[0]; return p ? { c: p.c, es: p.es, ep: p.ep, grp: p.grp || '' } : null; }, [H, N]);
    console.log('\n=== ' + H + ' #' + N + ' · ' + JSON.stringify(p0) + ' ===');
    if (!p0) { chk('el pedido existe', false, ph); continue; }
    await abrir(H, N);
    for (let i = 0; i < VUELTAS * 2; i++) {
      const s0 = await estado();
      await pg.evaluate(() => { window.__lat.max = 0; window.__lat.huecos = []; window.__n = { ficha: 0, com: 0, render: 0 }; });
      const quiero = s0.esJ ? 'Casa' : 'Juntada';
      if (!s0.abierta) await abrir(H, N);
      const t0 = Date.now();
      const b = await tap('#ordBody .ord-trajo-op', quiero);
      if (!b) { chk('vuelta ' + (i + 1) + ': está el botón «' + quiero + '»', false, s0); break; }
      await pg.waitForTimeout(2500);
      const s1 = await estado();
      console.log('  bajo el dedo al tocar: ' + b.antes);
      console.log('  ' + (i + 1) + '. ' + quiero + ' → ' + JSON.stringify(s1) + ' (' + (Date.now() - t0) + ' ms)');
      if (OUT) await pg.screenshot({ path: path.join(OUT, 'cj_' + N + '_' + (i + 1) + '_' + quiero + '.png') });
      chk('  el hilo no se traba más de 1 s', s1.lat < 1000, s1);
      chk('  sin bucle: la ficha se pinta ≤ 3 veces y la juntada ≤ 4', s1.n.ficha <= 3 && s1.n.com <= 4, s1.n);
      chk('  el dedo cae sobre «' + quiero + '» (nada se corrió debajo)', (b.antes || '').indexOf(quiero) === 0, b.antes);
      chk('  la ficha sigue abierta, con «Más opciones» abierto, y marcada en ' + quiero, s1.abierta && s1.mas && (quiero === 'Casa' ? !s1.esJ : s1.esJ), s1);
      chk('  no se abrió nada encima (el cobro)', !/cobro/i.test(String(s1.enMedio)), s1.enMedio);
    }
    /* Que responda después: un toque en «Copiar el detalle» o el scroll de la ficha. */
    /* (El requestAnimationFrame no sirve: el WebKit sin pantalla espacia los cuadros ~550 ms aun sin tocar nada.) */
    await pg.evaluate(() => { window.__lat.max = 0; window.__lat.huecos = []; });
    await pg.waitForTimeout(2000);
    const resp = await pg.evaluate(() => Math.round(window.__lat.max));
    chk('después de las vueltas, 2 s quieto: el hilo late sin huecos de más de 300 ms', resp < 300, resp);
  }
  chk('sin errores de JS', errs.length === 0, errs);
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  await br.close(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
