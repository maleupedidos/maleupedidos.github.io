/* Tres arreglos del domingo 22/11/2026, sin escribir nada (todo POST que escribe se corta), a 393 con toque (WebKit) y a
   1440 con mouse (Chromium). Usa la juntada real PED (por defecto el #2533 de Tadeo) solo para MIRAR.
     PW=<playwright-core> SES=<sesion tadeo/admin> [PED=Home:2533] [BASE=…] OUT=<dir> node probar_domingo_22.js
   1. «Pagó · Galicia» de un comensal → «Deshacer este pago». Sin la 823 aplicada: el aviso de siempre y nada más. Con la
      823 (simulada: la RPC contesta como la función): pide confirmar y manda {nota:'Juntada: <nombre>'} al deshacer.
   2. La juntada en la tarjeta de COBRANZA con el mismo margen interno que la tarjeta (antes, pegada al borde).
   3. «¿Cuándo cobraste?» se ve dd/mm/aaaa, con el selector nativo encima (tocar el recuadro toca el input de fecha). */
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || '.';
const [PH, PN] = String(process.env.PED || 'Home:2533').split(':');
const prep = fs.readFileSync(path.join(__dirname, 'juntada_pagos.js'), 'utf8');
const SB = prep.match(/const SB = '([^']+)'/)[1], PUB = prep.match(/PUB = '([^']+)'/)[1];
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 500))); };
async function app(br, vp, sim) {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const ctx = await br.newContext(vp);
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
      localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.__conf=[]; window.confirm=function(t){window.__conf.push(String(t));return true;}; window.alert=function(){}; window.__cortado=[]; window.__toasts=[];
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(r&&r[1]==='cobro_parcial_deshacer_directo'){var b={};try{b=JSON.parse(x.body).p||{};}catch(e){} window.__cortado.push({fn:r[1],p:b});
        if(!${sim ? 'true' : 'false'})return f.apply(this,arguments);   /* sin simular: la base de verdad (sin la 823 contesta 404) */
        var resp=b.action==='probar'?{ok:false,directo:true,motivo:'datos',existe:true}:{ok:true,directo:true,pago:'parcial|op:x',monto:18000,reabre:false};
        return Promise.resolve(new Response(JSON.stringify(resp),{status:200,headers:{'Content-Type':'application/json'}}));}
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||/(_directo|cobrar|anotar|guardar|borrar|marcar|limpiar|aplicar|escribir|crear|alta|cerrar|resolver|descobr|deshacer|_set)/.test(r[1]))){
        var b2=null;try{b2=JSON.parse(x.body);}catch(e){} window.__cortado.push({fn:(r&&r[1])||s.slice(0,60),p:b2&&(b2.p||b2)});
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage(); pg.__errs = []; pg.on('pageerror', (e) => pg.__errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof D !== 'undefined' && D && (D.pedidos || []).length > 0, null, { timeout: 180000 });
  await pg.evaluate(() => { const t = window.toast; window.toast = function (m) { window.__toasts.push(String(m)); return t && t.apply(this, arguments); }; });
  await T(2500);
  return { ctx, pg };
}
async function tocar(pg, sel, mouse) {
  const b = await pg.evaluate((sel) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; })[0];
    if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  if (!b) return null; await T(250);
  b.encima = await pg.evaluate(([x, y]) => { const h = document.elementFromPoint(x, y); return h ? (h.id || h.tagName) : null; }, [b.x, b.y]);
  if (mouse) await pg.mouse.click(b.x, b.y); else await pg.touchscreen.tap(b.x, b.y);
  await T(1200); return b;
}
const abrirFicha = async (pg) => { await pg.evaluate(([h, n]) => { go('pedidos'); const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); openOrdDetail(p.h, String(p.n), Number(p.r) || 0); }, [PH, PN]);
  await T(1500); await pg.evaluate(() => { const m = document.getElementById('ordMas'); if (m) m.open = true; });
  await pg.waitForFunction(([h, n]) => !!document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"] button.com-est.ok'), [PH, PN], { timeout: 30000 }).catch(() => 0); };
(async () => {
  for (const modo of [{ n: '393', br: 'webkit', vp: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, mouse: false },
                      { n: '1440', br: 'chromium', vp: { viewport: { width: 1440, height: 900 } }, mouse: true }]) {
    console.log('\n=== ' + modo.n + ' ===');
    const br = await pw[modo.br].launch();
    try {
      /* 1a. Sin la 823 (la base de hoy): el aviso de siempre, sin confirmar ni deshacer nada. */
      let A = await app(br, modo.vp, false);
      await abrirFicha(A.pg);
      let b = await tocar(A.pg, '#ordBody .com button.com-est.ok', modo.mouse);
      let R = await A.pg.evaluate(() => ({ conf: window.__conf.length, toasts: window.__toasts.slice(-2), envios: window.__cortado.filter((x) => x.p && x.p.action === 'cobroParcialDeshacer').length }));
      chk(modo.n + ': sin la 823, tocar «Pagó» da el aviso de siempre y no deshace nada', !!b && R.conf === 0 && R.envios === 0 && R.toasts.some((t) => /Deshacer el cobro/.test(t)), R);
      await A.ctx.close();
      /* 1b. Con la 823 (simulada). */
      A = await app(br, modo.vp, true);
      await abrirFicha(A.pg);
      const quien = await A.pg.evaluate(() => (document.querySelector('#ordBody .com button.com-est.ok') || {}).getAttribute('data-n'));
      b = await tocar(A.pg, '#ordBody .com button.com-est.ok', modo.mouse);
      R = await A.pg.evaluate(() => ({ conf: window.__conf.slice(-1)[0] || '', env: window.__cortado.filter((x) => x.p && x.p.action === 'cobroParcialDeshacer').map((x) => x.p), toasts: window.__toasts.slice(-2) }));
      chk(modo.n + ': con la 823, «Pagó» de ' + quien + ' pide confirmar «¿Deshacer este pago?»', /Deshacer este pago/.test(R.conf) && R.conf.indexOf(String(quien).split(' ')[0]) >= 0, R.conf);
      chk(modo.n + ': y manda deshacer ESE pago (nota «Juntada: ' + quien + '», hoja/n° del pedido, con motivo)', R.env.length === 1 && R.env[0].nota === 'Juntada: ' + quien && R.env[0].hoja === PH && R.env[0].id === PN && R.env[0].motivo.length >= 4, R.env);
      chk(modo.n + ': avisa «vuelve a Falta»', R.toasts.some((t) => /vuelve a «Falta»/.test(t)), R.toasts);
      await A.ctx.close();
      /* 2. La tarjeta de Cobranza. */
      A = await app(br, modo.vp, false);
      await A.pg.evaluate(() => { go('ruta'); });
      await A.pg.waitForFunction(() => typeof switchTab === 'function', null, { timeout: 30000 }); await T(1500);
      await A.pg.evaluate(() => switchTab('cobros'));
      const hay = await A.pg.waitForFunction(([h, n]) => !!document.querySelector('.com-cob[data-com="' + h + '|' + n + '"] button.com-est.ok'), [PH, PN], { timeout: 60000 }).then(() => true).catch(() => false);
      const M = hay ? await A.pg.evaluate(([h, n]) => { const c = document.querySelector('.com-cob[data-com="' + h + '|' + n + '"]'); c.scrollIntoView({ block: 'center' });
        const rc = c.getBoundingClientRect(), t = c.querySelector('.com-t').getBoundingClientRect(), f = c.querySelector('.com-fila'), nom = f.querySelector('.com-nom').getBoundingClientRect(), fr = f.getBoundingClientRect();
        const est = c.querySelector('button.com-est.ok'); return { titulo: Math.round(t.left - rc.left), fila: Math.round(fr.left - rc.left), nombre: Math.round(nom.left - fr.left), derecha: Math.round(rc.right - fr.right), fuente: est ? getComputedStyle(est).fontSize : null }; }, [PH, PN]) : null;
      console.log('       márgenes: ' + JSON.stringify(M));
      chk(modo.n + ': Cobranza: el título y la lista con margen interno (≥ 12 px) y el nombre adentro de su renglón (≥ 10 px)', !!M && M.titulo >= 12 && M.fila >= 12 && M.nombre >= 10 && M.derecha >= 12, M);
      chk(modo.n + ': «Pagó · Galicia» a 12 px como en la ficha (Ruta lo forzaba a 16)', !!M && M.fuente === '12px', M && M.fuente);
      await T(300); await A.pg.screenshot({ path: path.join(OUT, 'cobranza_margen_' + modo.n + '.png') });
      /* 3. La fecha del cobro. */
      /* `_npAbrirCobro` abre solo desde + PEDIDO (si no, deja el aviso «está en COBRANZA»). */
      await A.pg.evaluate(() => { switchTab('nuevo'); }); await T(800);
      await A.pg.evaluate(() => { _npAbrirCobro({ d: { canal: 'Home', nombre: 'PRUEBA Fecha', telefono: '1100000000', pago: '', subtotalSinDescuento: 38000, envio: 0, estadoEntrega: 'Pendiente', items: [] }, total: 38000, nom: 'PRUEBA' }, { n: 999992 }); });
      await T(1200);
      const F = await A.pg.evaluate(() => { const v = document.getElementById('cobroFechaVer'), i = document.getElementById('cobroFecha'), tx = document.getElementById('cobroFechaTxt');
        const box = i && i.parentElement.getBoundingClientRect(), ir = i && i.getBoundingClientRect();
        return { ver: v && v.textContent, tx: tx && tx.textContent, tipo: i && i.type, op: i && getComputedStyle(i).opacity, cubre: !!(box && ir && Math.abs(box.width - ir.width) <= 4 && Math.abs(box.height - ir.height) <= 4), alto: box && Math.round(box.height) }; });
      const hoy = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric' });
      chk(modo.n + ': «¿Cuándo cobraste?» se ve ' + hoy + ' (dd/mm/aaaa) y al lado «Hoy»', !!F.ver && F.ver === hoy && F.tx === 'Hoy', F);
      /* El WebKit de pruebas en Windows no tiene <input type=date> (lo baja a texto); Safari del iPhone sí. */
      const conFecha = await A.pg.evaluate(() => { const x = document.createElement('input'); x.setAttribute('type', 'date'); return x.type === 'date'; });
      chk(modo.n + ': el selector nativo sigue: un input de fecha transparente que cubre el recuadro (' + F.alto + ' px' + (conFecha ? '' : ', este WebKit no tiene type=date') + ')', (F.tipo === 'date' || !conFecha) && F.op === '0' && F.cubre && F.alto >= 44, F);
      const tb = await tocar(A.pg, '.cob-fecha-box', modo.mouse);
      chk(modo.n + ': tocar el recuadro cae sobre el input de fecha (abre el selector del ' + (modo.mouse ? 'navegador' : 'celular') + ')', !!tb && tb.encima === 'cobroFecha', tb);
      const ay = await A.pg.evaluate(() => { const i = document.getElementById('cobroFecha'); const d = new Date(Date.now() - 86400000); const iso = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        if (i.min && iso < i.min) i.min = iso; i.value = iso; i.dispatchEvent(new Event('change', { bubbles: true })); return { ver: document.getElementById('cobroFechaVer').textContent, tx: document.getElementById('cobroFechaTxt').textContent, iso }; });
      chk(modo.n + ': eligiendo ayer se ve ' + ay.ver + ' y «' + ay.tx + '»', /^\d{2}\/\d{2}\/\d{4}$/.test(ay.ver) && ay.ver === ay.iso.split('-').reverse().join('/') && /^Ayer/.test(ay.tx), ay);
      await A.pg.screenshot({ path: path.join(OUT, 'cobro_fecha_' + modo.n + '.png') });
      const esc = await A.pg.evaluate(() => window.__cortado.filter((x) => /^(cobrar_parcial_directo|cobro_parcial_deshacer_directo|pedido_cobrar_directo|cobrar_pedido_directo)$/.test(x.fn) || (x.p && /cobrar|cobroParcialDeshacer/.test(String(x.p.action || '')))).length);
      chk(modo.n + ': nada se cobró ni se deshizo y sin errores de JS', esc === 0 && A.pg.__errs.length === 0, { esc, errs: A.pg.__errs });
      await A.ctx.close();
    } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
    await br.close();
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
