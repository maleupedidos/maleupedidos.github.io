/* LA COLA DE RUTA ESPERA A TENER SESIÓN (22/11/2026). El 15/11 un celular sin sesión vació su cola en 33 s contra Apps
   Script apagado (36 registros en `directa_no`, usuario «tienda»). Con el ROBOT y un pedido PRUEBA de verdad:
     1. sin sesión (SESSION=null), processSyncQueue NO manda nada: ni a la base ni a Apps Script, y el ítem sigue en la cola
        y guardado en el celular (maleu_ruta);
     2. con la sesión de vuelta, manda: la cola queda vacía y la base tiene la orden UNA vez;
     3. el mismo ítem otra vez (mismo clientOpId) no duplica.
   Al final robot_limpiar de esta corrida. Escribe OUT/cola.json con la corrida para verificar en la base.
     PW=<playwright-core> BASE=http://localhost:8155/app.html OUT=<dir> node probar_cola_sin_sesion.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || os.tmpdir();
const CORRIDA = Date.now() + 'cs', PREFIJO = 'robot-' + CORRIDA + '-';   /* empieza con número: robot_limpiar la protege mientras corre */
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 600) : '')); } };
(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const br = await pw.webkit.launch(); let pg = null, P = null;
  try {
    const ctx = await br.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    /* Se cuentan los POST que salen (a la base y a Apps Script). Nada se corta: la prueba es que no salgan. */
    await ctx.addInitScript(`try{localStorage.setItem('maleu_ensayo','1');}catch(e){} window.confirm=function(){return true;}; window.alert=function(){}; window.__posts=[];
      (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(); if(m==='POST'&&!/auth\\/v1\\//.test(s))window.__posts.push({u:s.replace(/^.*\\/rpc\\//,'rpc/').slice(0,80),t:Date.now()}); return f.apply(this,arguments);};})();`);
    pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
    await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
    await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
    await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
    const rpc = (fn, p) => pg.evaluate(async ([fn, p]) => { const sb = await _sbPermiso(true); const r = await fetch(sb.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify(p || {}) });
      const t = await r.text(); try { return Object.assign({ http: r.status }, JSON.parse(t)); } catch (e) { return { http: r.status, texto: t.slice(0, 200) }; } }, [fn, p]);
    const E = await rpc('robot_entidades_pantalla', {});
    const al = await pg.evaluate(async (b) => { b.ts = Date.now(); try { const d = await _ordenDirecta(b, null, 'altaPedido'); return d ? { d } : { fue: 'apps' }; } catch (e) { return { error: String(e.message || e) }; } },
      { canal: 'Pilar', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }), dia: '', horario: '', nombre: E.cliente || 'PRUEBA Robot', telefono: String(E.telefono || '5490000000001'),
        pago: '', envio: 0, items: [{ id: E.producto_id, qty: 1 }], repartidor: '', total: 1000, subtotalSinDescuento: 1000, descuento: 0, descuentoManual: 0, descuentoGlobalPct: 0, descuentoReceta: null,
        propina: 0, tipoPedido: '', deposito: E.deposito || 'prueba', barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '', origen: 'Pendiente', estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: PREFIJO + 'alta' });
    if (!(al.d && al.d.ok)) throw new Error('alta: ' + JSON.stringify(al).slice(0, 200));
    const n = String(al.d.n || al.d.ref); await pg.evaluate(() => _recargarPedidos()).catch(() => 0);
    P = await pg.waitForFunction((n) => { const p = D.pedidos.find((x) => String(x.n) === n && /PRUEBA Robot/.test(x.c || '')); return p ? { h: p.h, n: String(p.n), r: p.r || 0, c: p.c } : null; }, n, { timeout: 30000 }).then((h) => h.jsonValue());
    console.log('  PRUEBA ' + P.h + ' #' + P.n);
    await pg.evaluate(() => go('ruta')); await pg.waitForFunction(() => typeof processSyncQueue === 'function' && typeof syncQueue !== 'undefined', null, { timeout: 60000 }); await T(4000);
    const item = { action: 'marcarArmado', pedidos: [{ h: P.h, id: P.n, r: P.r, c: P.c }], armado: true, usuario: 'robot', ts: Date.now(), clientOpId: PREFIJO + 'cola' };

    console.log('\n== 1. Sin sesión ==');
    const s1 = await pg.evaluate((it) => { window.__S = SESSION; SESSION = null; const n0 = window.__posts.length; syncQueue.push(it); saveLocal(); processSyncQueue(); return { n0 }; }, item);
    await T(5000);
    const r1 = await pg.evaluate((n0) => { let g = null; try { g = JSON.parse(localStorage.getItem('maleu_ruta') || '{}').syncQueue; } catch (e) {} return { posts: window.__posts.slice(n0), cola: syncQueue.length, guardada: (g || []).length, espera: window.__colaEspera || 0 }; }, s1.n0);
    chk('sin sesión no sale nada (' + r1.posts.length + ' POST) y la cola espera (' + r1.espera + ' vez)', r1.posts.length === 0 && r1.espera > 0, r1);
    chk('el ítem sigue en la cola (' + r1.cola + ') y guardado en el celular (' + r1.guardada + ')', r1.cola >= 1 && r1.guardada >= 1, r1);

    console.log('\n== 2. Con la sesión de vuelta ==');
    const n1 = await pg.evaluate(() => { SESSION = window.__S; const n = window.__posts.length; processSyncQueue(); return n; });
    const vacia = await pg.waitForFunction(() => syncQueue.length === 0, null, { timeout: 60000 }).then(() => true).catch(() => false);
    const r2 = await pg.evaluate((n1) => ({ posts: window.__posts.slice(n1).map((x) => x.u), cola: syncQueue.length }), n1);
    chk('con sesión manda (' + r2.posts.join(', ') + ') y la cola queda vacía', vacia && r2.posts.length >= 1 && !r2.posts.some((u) => /script\.google/.test(u)), r2);

    console.log('\n== 3. El mismo ítem otra vez ==');
    await pg.evaluate((it) => { syncQueue.push(Object.assign({}, it, { __attempts: 0 })); saveLocal(); processSyncQueue(); }, item);
    await pg.waitForFunction(() => syncQueue.length === 0, null, { timeout: 60000 }).catch(() => 0);
    chk('sin errores de JS', errs.length === 0, errs);
  } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
  finally {
    fs.writeFileSync(path.join(OUT, 'cola.json'), JSON.stringify({ corrida: CORRIDA, pedido: P }, null, 1));
    console.log('\n' + ok + ' ok · ' + mal + ' mal · corrida ' + CORRIDA + ' (la base y la limpieza se verifican aparte)');
    await br.close(); process.exit(mal ? 1 : 0);
  }
})();
