/* EL CUADRO DE PIEZAS EN ARMADO (22/11/2026, Tadeo 13:03: «hay mucho bug en el cuadro de las piezas de carne en armado»).
   Datos reales (las piezas de PED), SIN escribir: `pieza_confirmar_directo` y el armado se cortan y contestan como la base
   (confirmada / cambiada), así se recorre el flujo entero como en el iPhone. WebKit 393 con toque y Chromium 1440 con mouse.
     PW=<playwright-core> SES=<sesion tadeo/admin> PED=Home:2558 [BASE=…] [SOLO_FOTO=1] OUT=<dir> node probar_piezas_armado_22.js <prefijo>
   Mide: una acción clara por pieza (Confirmar) y un estado de un vistazo (por confirmar / confirmada); «Sacá la de X kg»
   en un renglón; sin «Están todas bien»; el armado no se tilda con piezas sin confirmar y SÍ cuando están todas;
   «Agarré otra» → elegir otra → el peso y el total cambian; «Deshacer» vuelve a «por confirmar». */
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || '.', PRE = process.argv[2] || 'pz';
const [PH, PN] = String(process.env.PED || 'Home:2558').split(':');
const prep = fs.readFileSync(path.join(__dirname, 'juntada_pagos.js'), 'utf8');
const SB = prep.match(/const SB = '([^']+)'/)[1], PUB = prep.match(/PUB = '([^']+)'/)[1];
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 500))); };
async function app(br, vp) {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const ctx = await br.newContext(vp);
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
      localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.__conf=[]; window.confirm=function(t){window.__conf.push(String(t));return true;}; window.alert=function(){}; window.__cortado=[];
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      /* La lectura de piezas: la real, con lo que «confirmó» o «cambió» la prueba encima (como la contestaría la base). */
      if(r&&r[1]==='pieza_armado_pantalla'){ return f.apply(this,arguments).then(function(res){ return res.json(); }).then(function(d){
        try{ Object.keys((d&&d.pedidos)||{}).forEach(function(k){ Object.keys(d.pedidos[k]).forEach(function(a){ var ps=d.pedidos[k][a].piezas||[];
          ps.forEach(function(q){ if(window.__pzOk&&(q.id in window.__pzOk))q.ok=window.__pzOk[q.id];
            if(window.__pzSale&&window.__pzSale[q.id]){q.de='';q.ok=false;} if(window.__pzEntra&&window.__pzEntra[q.id]){q.de='este';q.ok=true;} }); }); }); }catch(e){}
        return new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}); }); }
      if(r&&r[1]==='pieza_confirmar_directo'){var b={};try{b=JSON.parse(x.body).p||{};}catch(e){} window.__cortado.push({fn:r[1],p:b});
        window.__pzOk=window.__pzOk||{}; window.__pzSale=window.__pzSale||{}; window.__pzEntra=window.__pzEntra||{};
        var resp=(window.__simular||function(){return {ok:true,accion:b.deshacer?'desconfirmada':'confirmada'};})(b);
        if(resp.accion==='cambiada'){ window.__pzEntra[b.pieza]=1; if(window.__pzVaSale)window.__pzSale[window.__pzVaSale]=1; }
        else window.__pzOk[b.pieza]=!b.deshacer;
        return new Promise(function(ok){setTimeout(function(){ok(new Response(JSON.stringify(resp),{status:200,headers:{'Content-Type':'application/json'}}));},300);});}
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||/(_directo|cobrar|anotar|guardar|borrar|marcar|limpiar|aplicar|escribir|crear|alta|cerrar|resolver|descobr|deshacer|_set)/.test(r[1]))){
        var b2=null;try{b2=JSON.parse(x.body);}catch(e){} window.__cortado.push({fn:(r&&r[1])||s.slice(0,80),p:b2&&(b2.p||b2)});
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage(); pg.__errs = []; pg.on('pageerror', (e) => pg.__errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof D !== 'undefined' && D && (D.pedidos || []).length > 0, null, { timeout: 180000 });
  await T(2000);
  await pg.evaluate(() => { go('ruta'); });
  await pg.waitForFunction(() => typeof switchTab === 'function' && typeof renderArmado === 'function', null, { timeout: 40000 });
  await pg.evaluate(() => { switchTab('armado'); }); await T(1500);
  /* El día viene plegado («Domingo 22/11 · 0 de 1 armada»): se abre tocando el encabezado, como Tadeo. */
  const hd = await pg.evaluate(() => { const e = [].find.call(document.querySelectorAll('#armadoView *'), (x) => /HOY/.test(x.textContent) && /armad/.test(x.textContent) && x.getBoundingClientRect().height > 30 && x.getBoundingClientRect().height < 200 && !x.querySelector('.arm-pz'));
    if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 }; });
  if (hd) { if (vp.hasTouch) await pg.touchscreen.tap(hd.x, hd.y); else await pg.mouse.click(hd.x, hd.y); }
  await T(1500);
  return { ctx, pg };
}
/* El cuadro de piezas de la tarjeta del pedido. */
const CUADRO = ([h, n]) => { const box = [].find.call(document.querySelectorAll('.arm-pz'), (b) => { const c = b.closest('[data-key],.arm-card,.armado-item,.ruta-card,li,div'); return true; });
  const all = [].slice.call(document.querySelectorAll('.arm-pz')); return all.length; };
async function verCuadro(pg) {
  return pg.evaluate(([h, n]) => {
    /* La tarjeta: la que tiene el nombre del cliente y un cuadro .arm-pz adentro. */
    const pz = [].slice.call(document.querySelectorAll('.arm-pz')).filter((b) => b.getBoundingClientRect().height > 0);
    const de = pz.filter((b) => { let c = b.parentElement; for (let i = 0; i < 6 && c; i++, c = c.parentElement) if (c.textContent.indexOf(window.__cli || '') >= 0) return true; return false; })[0] || pz[0];
    if (!de) return null;
    const txt = (e) => (e && e.textContent || '').replace(/\s+/g, ' ').trim();
    const btn = [].slice.call(de.querySelectorAll('button')).filter((b) => b.getBoundingClientRect().height > 0).map((b) => { const cs = getComputedStyle(b), r = b.getBoundingClientRect();
      return { t: txt(b), cls: b.className, dis: b.disabled, op: Number(cs.opacity), bg: cs.backgroundColor, color: cs.color, h: Math.round(r.height) }; });
    const filas = [].slice.call(de.querySelectorAll('.arm-pz-va,.arm-pz-fila')).map((f) => ({ t: txt(f), lineas: (() => { const e = f.querySelector('.arm-pz-va-t,.arm-pz-fila-t'); if (!e) return 0; const lh = parseFloat(getComputedStyle(e).lineHeight) || 20; return Math.round(e.getBoundingClientRect().height / lh); })() }));
    de.scrollIntoView({ block: 'center' });
    return { txt: txt(de), btn, filas };
  }, [PH, PN]);
}
async function tocar(pg, sel, txt, mouse) {
  const b = await pg.evaluate(([sel, txt]) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.height > 0 && (!txt || x.textContent.indexOf(txt) >= 0); })[0];
    if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [sel, txt || '']);
  if (!b) return null; await T(250);
  b.mismo = await pg.evaluate(([sel, txt, x, y]) => { const h = document.elementFromPoint(x, y); return [].slice.call(document.querySelectorAll(sel)).some((e) => (!txt || e.textContent.indexOf(txt) >= 0) && (e === h || e.contains(h))); }, [sel, txt || '', b.x, b.y]);
  if (mouse) await pg.mouse.click(b.x, b.y); else await pg.touchscreen.tap(b.x, b.y);
  await T(900); return b;
}
(async () => {
  for (const modo of [{ n: '393', br: 'webkit', vp: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, mouse: false },
                      { n: '1440', br: 'chromium', vp: { viewport: { width: 1440, height: 900 } }, mouse: true }]) {
    if (process.env.SOLO_FOTO && modo.n === '1440') continue;
    console.log('\n=== ' + modo.n + ' ===');
    const br = await pw[modo.br].launch();
    try {
      const { pg } = await app(br, modo.vp);
      const cli = await pg.evaluate(([h, n]) => { const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); return p ? String(p.c || '') : ''; }, [PH, PN]);
      await pg.evaluate((c) => { window.__cli = c; }, cli);
      const hay = await pg.waitForFunction((c) => [].some.call(document.querySelectorAll('.arm-pz'), (b) => { let x = b.parentElement; for (let i = 0; i < 6 && x; i++, x = x.parentElement) if (x.textContent.indexOf(c) >= 0) return /kg/.test(b.textContent); return false; }), cli, { timeout: 60000 }).then(() => true).catch(() => false);
      chk(modo.n + ': la tarjeta de ' + cli + ' tiene el cuadro de piezas', hay);
      if (!hay) { await pg.screenshot({ path: path.join(OUT, PRE + '_sin_cuadro_' + modo.n + '.png') }); continue; }
      let V = await verCuadro(pg); await T(400);
      await pg.screenshot({ path: path.join(OUT, PRE + '_inicio_' + modo.n + '.png') });
      console.log('       cuadro: ' + V.txt.slice(0, 200));
      console.log('       botones: ' + JSON.stringify(V.btn.map((b) => b.t + (b.dis ? ' [deshab]' : '') + ' op' + b.op)));
      if (process.env.SOLO_FOTO) continue;
      /* 1. Una acción clara por pieza, nada que parezca hecho antes de tocar, «Sacá la de X kg» en un renglón. */
      const conf = V.btn.filter((b) => /^Confirmar/.test(b.t));
      chk(modo.n + ': cada pieza por confirmar tiene UN botón «Confirmar» habilitado y lleno (sin tilde de hecho)', conf.length >= 1 && conf.every((b) => !b.dis && b.op === 1 && b.h >= 44) && !V.btn.some((b) => /Es esta/.test(b.t)), V.btn);
      chk(modo.n + ': sin «Están todas bien» (un solo camino)', !V.btn.some((b) => /todas bien/i.test(b.t)), V.btn.map((b) => b.t));
      chk(modo.n + ': «Sacá la de X kg» entero en UN renglón', V.filas.length >= 1 && V.filas.every((f) => /Sacá la de \d/.test(f.t) && f.lineas === 1), V.filas);
      /* 2. El armado no se tilda con piezas sin confirmar. */
      await pg.evaluate(() => { window.__toasts = []; const t = window.showToast; if (!t.__w) { window.showToast = function (m) { window.__toasts.push(String(m)); return t.apply(this, arguments); }; window.showToast.__w = 1; } });
      const armK = await pg.evaluate(([h, n]) => { const e = (typeof findByKey === 'function') ? null : null; return null; }, [PH, PN]);
      /* 2b. Tildar el armado con piezas sin confirmar: no se tilda y dice qué falta. */
      await pg.evaluate(() => { const c = [].find.call(document.querySelectorAll('.armado-card'), (c) => c.textContent.indexOf(window.__cli) >= 0); const k = c && c.querySelector('.armado-check'); if (k) k.scrollIntoView({ block: 'center' }); });
      let ck = await pg.evaluate(() => { const c = [].find.call(document.querySelectorAll('.armado-card'), (c) => c.textContent.indexOf(window.__cli) >= 0); const k = c && c.querySelector('.armado-check'); if (!k) return null; const r = k.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (ck) { if (modo.mouse) await pg.mouse.click(ck.x, ck.y); else await pg.touchscreen.tap(ck.x, ck.y); await T(900); }
      let st = await pg.evaluate(() => { const c = [].find.call(document.querySelectorAll('.armado-card'), (c) => c.textContent.indexOf(window.__cli) >= 0); const t = document.getElementById('rutToast'); return { done: !!(c && c.classList.contains('done')), toast: t ? t.textContent.replace(/\s+/g, ' ').trim() : '' }; });
      chk(modo.n + ': tildar el armado con piezas sin confirmar NO lo tilda y dice «' + st.toast.slice(0, 60) + '»', !!ck && !st.done && /Primero confirmá las piezas/.test(st.toast), st);
      /* 3. Confirmar la primera pieza. */
      let b = await tocar(pg, '.arm-pz button.arm-pz-si', 'Confirmar', modo.mouse); await T(800);
      V = await verCuadro(pg);
      chk(modo.n + ': «Confirmar» la primera: queda «Confirmada» con «Deshacer» aparte', !!b && b.mismo && /Confirmada/.test(V.txt) && V.btn.some((x) => /Deshacer/.test(x.t)), V.txt.slice(0, 200));
      await pg.screenshot({ path: path.join(OUT, PRE + '_una_' + modo.n + '.png') });
      /* 4. Deshacer: vuelve a «por confirmar». */
      b = await tocar(pg, '.arm-pz button', 'Deshacer', modo.mouse); await T(800);
      V = await verCuadro(pg);
      const desh = await pg.evaluate(() => window.__cortado.filter((x) => x.fn === 'pieza_confirmar_directo').map((x) => x.p.deshacer));
      chk(modo.n + ': «Deshacer» manda deshacer y vuelve a «Confirmar»', desh.slice(-1)[0] === true && V.btn.filter((x) => /^Confirmar/.test(x.t)).length === conf.length, { desh, btn: V.btn.map((x) => x.t) });
      /* 5. «Agarré otra» → elegir otra → el peso y el total cambian. */
      b = await tocar(pg, '.arm-pz button.arm-pz-otra', '', modo.mouse);
      const chips = await pg.evaluate(() => [].map.call(document.querySelectorAll('.arm-pz .arm-pz-chips button.arm-pz-c'), (x) => x.textContent.trim()));
      chk(modo.n + ': «Agarré otra» abre las piezas libres de peso parecido (' + chips.join(', ') + ')', chips.length >= 1, chips);
      if (chips.length) {
        await pg.evaluate(() => { const o = document.querySelector('.arm-pz button.arm-pz-otra.on'); const m = o && /armPzOtra\('([^']+)'\)/.exec(o.getAttribute('onclick')); window.__pzVaSale = m ? m[1].split('|').pop() : '';
          window.__simular = function (b) { return { ok: true, accion: 'cambiada', kgEntra: 1.234, kgSale: 1.149, importe: { dPlata: 1000, total: 51000 } }; }; });
        b = await tocar(pg, '.arm-pz .arm-pz-chips button.arm-pz-c', '', modo.mouse); await T(1500);
        /* El aviso de Ruta se lee de la pantalla (su `showToast` vive adentro de la sub-app). */
        const tos = await pg.evaluate(() => { const t = document.getElementById('rutToast'); return t ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
        const mandada = await pg.evaluate(() => window.__cortado.filter((x) => x.fn === 'pieza_confirmar_directo').slice(-1)[0]);
        chk(modo.n + ': elegir otra manda ESA pieza y dice el peso nuevo y el total («' + tos + '»)', /1,234 kg/.test(tos) && /51\.000/.test(tos) && !!mandada && !mandada.p.deshacer, { tos, mandada });
        await pg.evaluate(() => { window.__simular = null; });
      }
      /* 6. Confirmar todas, una por una, y tildar el armado. */
      for (let i = 0; i < 6; i++) { const bb = await tocar(pg, '.arm-pz button.arm-pz-si', 'Confirmar', modo.mouse); if (!bb) break; await T(600); }
      V = await verCuadro(pg);
      chk(modo.n + ': todas confirmadas: el cuadro lo dice de un vistazo («Piezas listas: ya podés tildar el armado») y cada renglón en ≤ 2 líneas', /Piezas listas/.test(V.txt) && !V.btn.some((x) => /^Confirmar/.test(x.t)) && V.filas.every((f) => f.lineas <= 2), { txt: V.txt.slice(0, 200), filas: V.filas });
      await pg.screenshot({ path: path.join(OUT, PRE + '_todas_' + modo.n + '.png') });
      /* 7. Con todas confirmadas, el casillero sí arma (la orden de armado se corta: no se escribe). */
      await pg.evaluate(() => { const c = [].find.call(document.querySelectorAll('.armado-card'), (c) => c.textContent.indexOf(window.__cli) >= 0); const k = c && c.querySelector('.armado-check'); if (k) k.scrollIntoView({ block: 'center' }); });
      ck = await pg.evaluate(() => { const c = [].find.call(document.querySelectorAll('.armado-card'), (c) => c.textContent.indexOf(window.__cli) >= 0); const k = c && c.querySelector('.armado-check'); if (!k) return null; const r = k.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (ck) { if (modo.mouse) await pg.mouse.click(ck.x, ck.y); else await pg.touchscreen.tap(ck.x, ck.y); await T(1200); }
      /* Pregunta «¿Pedido armado?»: «Sí, armado», como Tadeo. */
      const si = await pg.evaluate(() => { const b = [].find.call(document.querySelectorAll('button'), (x) => /S[ií], armado/.test(x.textContent) && x.getBoundingClientRect().height > 0); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (si) { if (modo.mouse) await pg.mouse.click(si.x, si.y); else await pg.touchscreen.tap(si.x, si.y); await T(1500); }
      st = await pg.evaluate(() => { const c = [].find.call(document.querySelectorAll('.armado-card'), (c) => c.textContent.indexOf(window.__cli) >= 0); return { done: !!(c && c.classList.contains('done')), armado: window.__cortado.filter((x) => /armado/i.test(x.fn) || (x.p && /armado/i.test(String(x.p.action || '')))).length }; });
      chk(modo.n + ': con todas confirmadas, tildar el armado lo tilda (y manda el armado, cortado)', st.done || st.armado > 0, st);
      await pg.screenshot({ path: path.join(OUT, PRE + '_armado_' + modo.n + '.png') });
      chk(modo.n + ': sin errores de JS', pg.__errs.length === 0, pg.__errs);
    } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
    await br.close();
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
