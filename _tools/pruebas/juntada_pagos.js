/* LA CUENTA DE LOS QUE COMIERON EN LA FICHA (21/11/2026). WebKit 390, toque real, NADA SE ESCRIBE.
   PW=<playwright-core> SES=<sesion.json> BASE=http://localhost:8155/app.html PED=Home:2533 [OUT=<carpeta>] node juntada_pagos.js
   1. Sin la 821 (como hoy): «Cada uno: $X · son N» (quien pidió + los cargados), sin «Pagó/Falta» (no se podría saber
      después quién pagó), y «Copiar para el grupo» con maleu26.
   2. Como con la 821: la respuesta de pedido_cobro_pantalla trae pagos con nota «Juntada: <nombre>» para todos menos uno.
      «Pagaron N-1 de N · falta X», y tocar «Falta» arma el cobrarParcial correcto (se corta: no escribe). */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || '.';
const [PH, PN] = String(process.env.PED || 'Home:2533').split(':');
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const br = await pw.webkit.launch();
  for (const con821 of [false, true]) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
      localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
      window.confirm=function(){return true;}; window.alert=function(){}; window.__parciales=[]; window.__copiado=[];
      try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){window.__copiado.push(String(t));return Promise.resolve();}},configurable:true});}catch(e){}
      (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
        if(r&&r[1]==='cobrar_parcial_directo'){var b={};try{b=JSON.parse(x.body).p||{};}catch(e){} window.__parciales.push(b);
          return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
        if(window.__con821&&r&&r[1]==='pedido_cobro_pantalla'){return Promise.resolve(new Response(JSON.stringify(window.__con821),{status:200,headers:{'Content-Type':'application/json'}}));}
        if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^tienda_cuentas$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))
          return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
        return f.apply(this,arguments);};})();`);
    const pg = await ctx.newPage();
    const errores = []; pg.on('pageerror', (e) => errores.push(String(e.message).slice(0, 160)));
    console.log('\n=== ' + (con821 ? 'como con la 821 (pagos con nota)' : 'sin la 821 (como hoy)') + ' · ' + PH + ' #' + PN + ' ===');
    await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(([h, n]) => window.D && (D.pedidos || []).some((x) => x.h === h && String(x.n) === n && String(x.grp || '').trim()), [PH, PN], { timeout: 150000 }).catch(() => {});
    if (con821) {
      /* 4 de 5 pagaron: todos menos el último cargado. */
      await pg.evaluate(async ([h, n]) => { await _comCargar(); const p = D.pedidos.filter((x) => x.h === h && String(x.n) === n)[0]; const C = _comCuenta(p);
        const pagos = C.gente.slice(0, C.gente.length - 1).map((g) => ({ monto: g.toca, nota: 'Juntada: ' + g.nombre, cuenta: 'galicia', fecha: '21/11 18:00', forma: 'Transferencia', cobro: 'Tadeo Ustariz' }));
        window.__con821 = { ok: true, total: C.tot, ef: p.ef, tr: p.tr, pagos: pagos, cuenta: '', cobradoPor: '', cobro: null, entregado: null, repartidor: p.rep || '' }; window.__falta = C.gente[C.gente.length - 1].nombre; }, [PH, PN]);
    }
    await pg.evaluate(([h, n]) => { go('pedidos'); const p = D.pedidos.filter((x) => x.h === h && String(x.n) === n)[0]; openOrdDetail(p.h, String(p.n), Number(p.r) || 0); }, [PH, PN]);
    await pg.waitForTimeout(3000);
    await pg.evaluate(() => { const m = document.getElementById('ordMas'); if (m) m.open = true; const c = document.querySelector('#ordBody .com'); if (c) c.scrollIntoView({ block: 'center' }); });
    await pg.waitForTimeout(2500);
    const T = await pg.evaluate(() => ({ cuenta: (document.querySelector('#ordBody .com-cuenta') || {}).textContent || '', chips: [].slice.call(document.querySelectorAll('#ordBody .com-chip')).map((c) => c.textContent.replace(/\s+/g, ' ').trim()), faltaBtns: document.querySelectorAll('#ordBody button.com-pago').length }));
    console.log('  ' + JSON.stringify(T));
    if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await pg.screenshot({ path: path.join(OUT, 'juntada_' + (con821 ? 'con821' : 'hoy') + '.png') }); }
    chk('«Cada uno: $18.000 · son 5»', /Cada uno: \$18\.000/.test(T.cuenta) && /son 5/.test(T.cuenta), T.cuenta);
    if (!con821) {
      chk('sin la 821 no se ofrece «Pagó/Falta» (no se podría saber después)', T.faltaBtns === 0 && !/Pagaron/.test(T.cuenta), T);
      const b = await pg.evaluate(() => { const x = document.querySelector('#ordBody .com-grupo'); if (!x) return null; x.scrollIntoView({ block: 'center' }); const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (b) { await pg.waitForTimeout(300); await pg.touchscreen.tap(b.x, b.y); await pg.waitForTimeout(600); }
      const txt = await pg.evaluate(() => window.__copiado.join('\n'));
      console.log('  copiado:\n    ' + txt.replace(/\n/g, '\n    '));
      chk('«Copiar para el grupo»: cada uno $18.000 y el alias maleu26, un monto por renglón', /\$18\.000 cada uno/.test(txt) && /maleu26/.test(txt) && txt.split('\n').every((l) => (l.match(/\$/g) || []).length <= 1), txt);
    } else {
      const falta = await pg.evaluate(() => window.__falta);
      chk('«Pagaron 4 de 5 · falta ' + falta.split(' ')[0] + ' $18.000»', /Pagaron 4 de 5/.test(T.cuenta) && new RegExp('falta ' + falta.split(' ')[0] + ' \\$18\\.000').test(T.cuenta), T.cuenta);
      chk('4 dicen «Pagó» y uno tiene el botón «Falta»', T.chips.filter((c) => /Pagó/.test(c)).length === 4 && T.faltaBtns === 1, T);
      const b = await pg.evaluate(() => { const x = document.querySelector('#ordBody button.com-pago'); x.scrollIntoView({ block: 'center' }); const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await pg.waitForTimeout(300); await pg.touchscreen.tap(b.x, b.y); await pg.waitForTimeout(1500);
      const pp = await pg.evaluate(() => window.__parciales[0] || null);
      console.log('  cobro parcial que saldría: ' + JSON.stringify(pp));
      chk('tocar «Falta» arma el cobro parcial: $18.000, Transferencia a galicia, pagador y nota de ' + falta.split(' ')[0] + ', clientOpId fijo',
        pp && Number(pp.monto) === 18000 && pp.cuenta === 'galicia' && pp.formaPago === 'Transferencia' && pp.pagador === falta && pp.notas === 'Juntada: ' + falta && /^jp-/.test(pp.clientOpId || ''), pp);
    }
    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
    await ctx.close();
  }
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
