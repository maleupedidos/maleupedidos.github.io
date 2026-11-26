/* DESHACER UN PAGO DE LA JUNTADA, DE VERDAD (823, 22/11/2026). WebKit 393 con toque, como el ROBOT (su cuenta aislada
   «prueba»). Pedido PRUEBA de juntada con 3 comensales; los 3 pagan → Cobrado. Se deshace el del medio desde la ficha (el
   pedido se reabre, esa persona vuelve a «Falta») y otro desde el bloque de Cobranza. Se mide contra la base.
     PW=<playwright-core> BASE=http://localhost:8155/app.html OUT=<dir> node probar_deshacer_pago_real.js
   Escribe OUT/limpieza.json para jc_limpiar (pedido, grupo). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || os.tmpdir();
/* Empieza con número: `robot_limpiar` de OTRA corrida protege solo `robot-<dígito>` (el 22/11 una corrida «dp…» se borró en el medio). */
const CORRIDA = Date.now() + 'dp', PREFIJO = 'robot-' + CORRIDA + '-';
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 600) : '')); } };
const LIMPIA = { corrida: CORRIDA, pedido: null, grupo: null, claves: [], nombres: [] };
(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const br = await pw.webkit.launch();
  let pg = null, P = null, n = '';
  try {
    const ctx = await br.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await ctx.addInitScript(`try{localStorage.setItem('maleu_ensayo','1');localStorage.setItem('maleu_sb_open','1');}catch(e){} window.__conf=[]; window.confirm=function(t){window.__conf.push(String(t));return true;};`);
    pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
    await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
    await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
    await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
    await T(2500);
    const rpc = (fn, p) => pg.evaluate(async ([fn, p]) => { const sb = await _sbPermiso(true); const r = await fetch(sb.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify(p || {}) });
      const t = await r.text(); try { return Object.assign({ http: r.status }, JSON.parse(t)); } catch (e) { return { http: r.status, texto: t.slice(0, 200) }; } }, [fn, p]);
    const directa = (accion, b) => pg.evaluate(async ([accion, b]) => { b.ts = b.ts || Date.now(); try { const d = await _ordenDirecta(b, null, accion); return d ? { d } : { fue: 'apps' }; } catch (e) { return { error: String(e.message || e) }; } }, [accion, b]);
    const tocar = async (sel) => { const b = await pg.evaluate((sel) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => x.getBoundingClientRect().height > 0)[0]; if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
      if (!b) return null; await T(250); await pg.touchscreen.tap(b.x, b.y); return b; };
    const estado = async () => { const d = await rpc('pedido_cobro_pantalla', { p: { h: P.h, n, r: P.r } }); await pg.evaluate(() => _recargarPedidos()).catch(() => 0); await T(1500);
      const ep = await pg.evaluate(([h, n]) => { const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); return p && p.ep; }, [P.h, n]);
      return { ep, pagos: (d.pagos || []).map((x) => ({ m: x.monto, nota: x.nota })) }; };
    console.log('\n== 1. Pedido PRUEBA de juntada (' + CORRIDA + ') ==');
    const E = await rpc('robot_entidades_pantalla', {});
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
    const al = await directa('altaPedido', { canal: 'Pilar', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: hoy, dia: '', horario: '', nombre: E.cliente || 'PRUEBA Robot', telefono: String(E.telefono || '5490000000001'),
      pago: '', envio: 0, items: [{ id: E.producto_id, qty: 30 }], repartidor: '', total: 30000, subtotalSinDescuento: 30000, descuento: 0, descuentoManual: 0, descuentoGlobalPct: 0, descuentoReceta: null,
      propina: 0, tipoPedido: '', deposito: E.deposito || 'prueba', barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '', origen: 'Pendiente', estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: PREFIJO + 'alta' });
    if (!(al.d && al.d.ok)) throw new Error('alta: ' + JSON.stringify(al).slice(0, 200));
    n = String(al.d.n || al.d.ref); await pg.evaluate(() => _recargarPedidos()).catch(() => 0);
    P = await pg.waitForFunction((n) => { const p = D.pedidos.find((x) => String(x.n) === n && /PRUEBA Robot/.test(x.c || '')); return p ? { h: p.h, n: p.n, r: p.r || 0, $: p.$ } : null; }, n, { timeout: 30000 }).then((h) => h.jsonValue());
    LIMPIA.pedido = P.h + '|' + n; LIMPIA.grupo = ('pedido ' + P.h + ' ' + n).toLowerCase();
    if (Number(P.$) > 100000) throw new Error('total raro: ' + P.$);
    await directa('marcarArmado', { action: 'marcarArmado', pedidos: [{ h: P.h, id: n, r: P.r, c: 'PRUEBA Robot' }], armado: true, usuario: 'robot', clientOpId: PREFIJO + 'armar' });
    await directa('marcarEntregado', { action: 'marcarEntregado', hoja: P.h, id: n, row: P.r, cobrado: false, propina: 0, repartidor: '', clientOpId: PREFIJO + 'entregar' });
    await directa('pedidoGrupal', { action: 'pedidoGrupal', hoja: P.h, row: P.r, id: n, valor: 'Sí', clientOpId: PREFIJO + 'grupal' });
    for (const nm of ['PRUEBA Ana DP', 'PRUEBA Beto DP']) await rpc('juntada_integrante_directo', { p: { action: 'juntadaIntegrante', grp: 'Pedido ' + P.h + ' ' + n, nombre: nm } });
    await pg.evaluate(() => _recargarPedidos()).catch(() => 0);
    const listo = await pg.waitForFunction(([h, n]) => { const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); return !!(p && p.es === 'Entregado' && String(p.grp || '').trim()); }, [P.h, n], { timeout: 40000 }).then(() => true).catch(() => false);
    chk('PRUEBA #' + n + ' · ' + P.$ + ' · entregado y de juntada con 3', listo);
    const abrir = async () => { await pg.evaluate(([h, n, r]) => { go('pedidos'); openOrdDetail(h, n, r); }, [P.h, n, P.r]); await T(1500); await pg.evaluate(() => { const m = document.getElementById('ordMas'); if (m) m.open = true; }); await T(1500); };
    console.log('\n== 2. Los 3 pagan ==');
    for (let i = 0; i < 3; i++) {
      await abrir(); await pg.waitForFunction(() => !!document.querySelector('#ordBody button.com-pagar'), null, { timeout: 30000 }).catch(() => 0);
      const ver = await pg.evaluate(() => { const c = document.querySelector('#ordBody .com'); return c ? c.textContent.replace(/\s+/g, ' ').slice(0, 260) : 'sin .com'; });
      if (i === 0) console.log('       juntada: ' + ver);
      await pg.evaluate(() => { window.__t = []; const t = window.toast; if (!t.__w) { window.toast = function (m) { window.__t.push(String(m)); return t.apply(this, arguments); }; window.toast.__w = 1; } });
      const bb = await tocar('#ordBody button.com-pagar'); await T(2500);
      if (i === 0) console.log('       toque: ' + JSON.stringify(bb) + ' · avisos: ' + JSON.stringify(await pg.evaluate(() => window.__t)));
      for (let k = 0; k < 20; k++) { const d = await rpc('pedido_cobro_pantalla', { p: { h: P.h, n, r: P.r } }); if ((d.pagos || []).length >= i + 1) break; await T(800); }
    }
    let S = await estado();
    chk('3 pagos y el pedido Cobrado (' + S.ep + ')', S.ep === 'Cobrado' && S.pagos.length === 3, S);
    console.log('\n== 3. Deshacer el de Ana desde la ficha ==');
    await abrir();
    await pg.waitForFunction(() => !!document.querySelector('#ordBody button.com-est.ok[data-n="PRUEBA Ana DP"]'), null, { timeout: 30000 }).catch(() => 0);
    await pg.evaluate(() => { window.__conf = []; });
    let b = await tocar('#ordBody button.com-est.ok[data-n="PRUEBA Ana DP"]');
    await T(4000);
    const conf = await pg.evaluate(() => window.__conf.slice());
    chk('tocar «Pagó» de Ana pide «¿Deshacer este pago?»', !!b && conf.some((c) => /Deshacer este pago/.test(c)), conf);
    S = await estado();
    chk('la base: quedan 2 pagos (sin el de Ana) y el pedido vuelve a «No Cobrado» (' + S.ep + ')', S.ep !== 'Cobrado' && S.pagos.length === 2 && !S.pagos.some((x) => x.nota === 'Juntada: PRUEBA Ana DP'), S);
    const del = await rpc('pedido_cobro_pantalla', { p: { h: P.h, n, r: P.r } });
    await abrir();
    const fila = await pg.waitForFunction(() => { const f = [].find.call(document.querySelectorAll('#ordBody .com-fila'), (x) => /PRUEBA Ana DP/.test(x.textContent)); return f && /Falta/.test(f.textContent) && f.querySelector('button.com-pagar') ? f.textContent.replace(/\s+/g, ' ') : null; }, null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
    chk('la ficha: Ana vuelve a «Falta» con «Marcar pagó»', !!fila, fila);
    console.log('\n== 4. Deshacer el de Beto desde el bloque de Cobranza ==');
    await pg.evaluate(([h, n]) => { try { closeOrdDetail(); } catch (e) {} const p = D.pedidos.find((x) => x.h === h && String(x.n) === n);
      let box = document.getElementById('__cob'); if (!box) { box = document.createElement('div'); box.id = '__cob'; box.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:auto;background:#fff;padding:16px'; document.body.appendChild(box); }
      box.innerHTML = window.comCobranzaHTML({ h: p.h, id: String(p.n), c: p.c, $: 0, totalOriginal: Number(p.$) || 0, cobradoParcial: 0, grp: p.grp, es: p.es, r: p.r }); }, [P.h, n]);
    await pg.waitForFunction(() => !!document.querySelector('.com-cob button.com-est.ok[data-n="PRUEBA Beto DP"]'), null, { timeout: 30000 }).catch(() => 0);
    await pg.evaluate(() => { window.__conf = []; });
    b = await tocar('.com-cob button.com-est.ok[data-n="PRUEBA Beto DP"]'); await T(4000);
    S = await estado();
    chk('desde Cobranza: queda 1 pago (el del que pidió) y sigue «No Cobrado»', S.ep !== 'Cobrado' && S.pagos.length === 1 && /PRUEBA Robot/.test(S.pagos[0].nota), S);
    await pg.evaluate(() => { const b = document.getElementById('__cob'); if (b) b.remove(); });
    const bd = await rpc('pedido_cobro_pantalla', { p: { h: P.h, n, r: P.r } });
    chk('sin errores de JS', errs.length === 0, errs);
  } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
  finally {
    if (P && pg) { const li = await pg.evaluate(async (c) => { const sb = await _sbPermiso(true); const r = await fetch(sb.url + '/rest/v1/rpc/robot_limpiar', { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_corrida: c }) }); return r.text(); }, CORRIDA).catch((e) => String(e)); console.log('       robot_limpiar: ' + String(li).slice(0, 200)); }
    fs.writeFileSync(path.join(OUT, 'limpieza.json'), JSON.stringify(LIMPIA, null, 1));
    console.log('\n' + ok + ' ok · ' + mal + ' mal'); await br.close(); process.exit(mal ? 1 : 0);
  }
})();
