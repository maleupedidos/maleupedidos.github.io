/* LA JUNTADA COMPLETA, DE PUNTA A PUNTA Y DE VERDAD (21/11/2026, noche). Encargo de Tadeo, 22:11: «Quiero que
   profesionalicemos todo… No quiero errores ni bugs». OK de Tadeo para la prueba que escribe en Caja (20:27): «la prueba de
   la juntada con un pedido PRUEBA… borrándola después». El ROBOT cobra a su cuenta aislada «prueba» (no toca Galicia).
     PW=<playwright-core> BASE=http://localhost:8155/app.html [VIEJO=http://localhost:8155/app_viejo_tmp.html] OUT=<dir> \
       node _tools/pruebas/probar_juntada_completa.js
   1. Alta «PRUEBA Robot» (Pilar, producto y depósito «prueba»), entregado y «Juntada o evento».
   2. WebKit 393×852, TOQUE real: suma 1 cliente del CRM (buscador) y 3 personas nuevas con su ficha (vive en Estancias,
      casa de fin de semana, visita sin teléfono) → somos 5 con el que pidió. 2 gastos de afuera (pan $3.000, carbón $20.000).
   3. La cuenta peso por peso contra un cálculo propio: cada uno, quién le pasa a quién (Maleu primero) y «Copiar para el grupo».
   4. «Marcar pagó» de a uno (3 desde la ficha, el último desde Cobranza en Ruta): cada uno es un parcial con su nota y su
      monto; con el último, el pedido queda Cobrado. «Ya se lo pasó» entre dos personas: no toca la caja.
   5. Las fichas del CRM: creadas, con dónde está y «Lo conocimos en…»; la visita sin teléfono con clave sn-.
   6. Chromium 1440 con mouse: la misma ficha. Y el build viejo: tiene que dar rojo en lo nuevo.
   Al final escribe OUT/limpieza.json (pedido, grupo, claves del CRM) para la limpieza de la base. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', VIEJO = process.env.VIEJO || '', OUT = process.env.OUT || os.tmpdir();
/* Empieza con número: `robot_limpiar` de OTRA corrida protege solo `robot-<dígito>`. */
const CORRIDA = Date.now() + 'jc', PREFIJO = 'robot-' + CORRIDA + '-';
const SUF = CORRIDA.slice(-4).toUpperCase();
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 700) : '')); } };
const f$ = (v) => '$' + Math.round(v).toLocaleString('es-AR');
const LIMPIA = { corrida: CORRIDA, pedido: null, grupo: null, claves: [], nombres: [] };

async function entrar(br, ctxOpts) {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const ctx = await br.newContext(ctxOpts);
  await ctx.addInitScript(`try{localStorage.setItem('maleu_ensayo','1');localStorage.setItem('maleu_sb_open','1');}catch(e){}
    window.__copiado=[]; try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){window.__copiado.push(String(t));return Promise.resolve();}},configurable:true});}catch(e){}`);
  const pg = await ctx.newPage();
  pg.on('dialog', (d) => d.accept().catch(() => {}));
  pg.__errs = []; pg.on('pageerror', (e) => pg.__errs.push(String(e.message).slice(0, 200)));
  await pg.goto(ctxOpts.__url + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
  await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
  await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
  await T(2500);
  return { ctx, pg };
}
const rpc = (pg, fn, p) => pg.evaluate(async ([fn, p]) => { const sb = await _sbPermiso(true); if (!sb) return { ok: false, error: 'sin permiso' };
  const r = await fetch(sb.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify(p || {}) });
  const t = await r.text(); try { return Object.assign({ http: r.status }, JSON.parse(t)); } catch (e) { return { http: r.status, texto: t.slice(0, 200) }; } }, [fn, p]);
const directa = (pg, accion, body) => pg.evaluate(async ([accion, b]) => { if (!b.ts) b.ts = Date.now();
  try { const d = await _ordenDirecta(b, null, accion); return d ? { d } : { fueApps: b._noDirecto || '?' }; } catch (e) { return { error: String(e && e.message || e) }; } }, [accion, body]);
/* Un toque (WebKit) o un clic (Chromium) sobre el elemento visible que matchea; dice qué había bajo el dedo. */
async function tocar(pg, sel, txt, modo) {
  const b = await pg.evaluate(([sel, txt]) => { const l = [].slice.call(document.querySelectorAll(sel)).filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!txt || x.textContent.indexOf(txt) >= 0); });
    const e = l[0]; if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: Math.round(r.height) }; }, [sel, txt || '']);
  if (!b) return null;
  await T(250);
  b.mismo = await pg.evaluate(([sel, txt, x, y]) => { const h = document.elementFromPoint(x, y); const l = [].slice.call(document.querySelectorAll(sel)).filter((e) => !txt || e.textContent.indexOf(txt) >= 0); return !!h && l.some((e) => e === h || e.contains(h)); }, [sel, txt || '', b.x, b.y]);
  if (modo === 'mouse') await pg.mouse.click(b.x, b.y); else await pg.touchscreen.tap(b.x, b.y);
  return b;
}
async function esperar(pg, fn, arg, ms) { try { return await pg.waitForFunction(fn, arg, { timeout: ms || 20000 }).then((h) => h.jsonValue()); } catch (e) { return null; } }
const LEER = ([h, n]) => { const c = document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"]'); if (!c) return null;
  const t = (s) => ((c.querySelector(s) || {}).textContent || '').replace(/\s+/g, ' ').trim();
  return { cuenta: t('.com-cuenta'), filas: [].map.call(c.querySelectorAll('.com-lista')[0] ? c.querySelectorAll('.com-lista')[0].querySelectorAll('.com-fila') : [], (f) => f.textContent.replace(/\s+/g, ' ').trim()),
    trans: [].map.call(c.querySelectorAll('.com-sec'), (s) => s.textContent).indexOf('Quién le pasa a quién') >= 0 ? [].map.call(c.querySelectorAll('.com-lista')[1].querySelectorAll('.com-fila'), (f) => f.textContent.replace(/\s+/g, ' ').trim()) : [],
    pagar: [].map.call(c.querySelectorAll('button.com-pagar'), (b) => ({ n: b.getAttribute('data-n'), m: Number(b.getAttribute('data-m')) })),
    pase: c.querySelectorAll('button.com-pase').length, chicos: [].filter.call(c.querySelectorAll('button'), (b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 43.5; }).map((b) => b.textContent.trim().slice(0, 30)) }; };

/* La cuenta esperada, calculada aparte (no con la función del ERP). */
function corto(nom, todos) { const w = nom.trim().split(/\s+/), k = w[0].toLowerCase(); const m = todos.filter((x) => x.trim().split(/\s+/)[0].toLowerCase() === k);
  if (m.length <= 1) return w[0]; const ini = w[1] ? w[0] + ' ' + w[1].charAt(0).toUpperCase() + '.' : w[0];
  return m.filter((x) => { const v = x.trim().split(/\s+/); return (v[0] + ' ' + (v[1] || '').charAt(0)).toLowerCase() === (w[0] + ' ' + (w[1] || '').charAt(0)).toLowerCase(); }).length <= 1 ? ini : nom.trim(); }
function esperada(totMaleu, gente, gastos) {
  const total = totMaleu + gastos.reduce((s, g) => s + g.monto, 0), n = gente.length, base = Math.floor(total / n), resto = total - base * n;
  const P = gente.map((nm, i) => ({ nm, toca: base + (i < resto ? 1 : 0), puso: gastos.filter((g) => g.quien === nm).reduce((s, g) => s + g.monto, 0) }));
  P.forEach((x) => { x.saldo = x.puso - x.toca; });
  const acre = [{ maleu: true, cobra: totMaleu }].concat(P.filter((x) => x.saldo > 0).map((x) => ({ x, cobra: x.saldo })));
  const tr = [];
  P.forEach((x) => { let debe = -x.saldo; for (const a of acre) { if (debe <= 0) break; if (a.cobra <= 0) continue; const m = Math.min(debe, a.cobra); debe -= m; a.cobra -= m; tr.push({ de: x.nm, a: a.maleu ? 'Maleu' : a.x.nm, m }); } });
  return { total, cada: base + (resto ? 1 : 0), P, tr };
}

(async () => {
  let wk = null, A = null, P = null, n = '';
  const fid = () => 'comcom' + P.h + n;
  try {
    wk = await pw.webkit.launch();
    A = await entrar(wk, { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, __url: BASE });
    const pg = A.pg;
    console.log('\n== 1. El pedido PRUEBA (corrida ' + CORRIDA + ') ==');
    const E = await rpc(pg, 'robot_entidades_pantalla', {});
    if (!E || !E.ok || (E.faltan || []).length) throw new Error('sin las entidades PRUEBA: ' + JSON.stringify(E).slice(0, 200));
    /* El precio del producto PRUEBA, de la base (D.stock puede no tenerlo): 1 unidad y se escala a ~$60.000. */
    /* El producto PRUEBA la base lo cobra a $1.000 (D.stock dice 1: el 21/11 eso armó un pedido de $60.000.000). */
    const precio = Number(process.env.PRECIO_PRUEBA || 1000);
    const qty = precio > 0 ? Math.max(1, Math.round(60000 / precio)) : 1;
    let tot = (precio || 1) * qty;
    if (tot > 500000) throw new Error('el pedido PRUEBA saldría de ' + tot + ': no lo armo');
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
    const al = await directa(pg, 'altaPedido', { canal: 'Pilar', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: hoy, dia: '', horario: '', nombre: E.cliente || 'PRUEBA Robot', telefono: String(E.telefono || '5490000000001'),
      pago: 'Transferencia', envio: 0, items: [{ id: E.producto_id, qty }], repartidor: '', total: tot, subtotalSinDescuento: tot, descuento: 0, descuentoManual: 0, descuentoGlobalPct: 0, descuentoReceta: null,
      propina: 0, tipoPedido: '', deposito: E.deposito || 'prueba', barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '', origen: 'Pendiente', estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: PREFIJO + 'alta' });
    if (!(al && al.d && al.d.ok)) throw new Error('alta PRUEBA: ' + JSON.stringify(al).slice(0, 200));
    n = String(al.d.n || al.d.ref);
    await pg.evaluate(() => _recargarPedidos()).catch(() => 0);
    P = await esperar(pg, (n) => { const p = (D.pedidos || []).find((x) => String(x.n) === n && String(x.c || '').indexOf('PRUEBA Robot') >= 0); return p ? { h: p.h, n: p.n, r: p.r || 0, c: p.c, $: p.$ } : null; }, n, 25000);
    if (!P) throw new Error('el alta ' + n + ' no apareció');
    tot = Math.round(Number(P.$) || tot);
    if (tot > 500000) throw new Error('el pedido PRUEBA salió de ' + tot + ': freno antes de cobrar nada');
    LIMPIA.pedido = P.h + '|' + n; LIMPIA.grupo = ('pedido ' + P.h + ' ' + n).toLowerCase();
    const base = { hoja: P.h, id: String(P.n), row: P.r };
    await directa(pg, 'marcarArmado', { action: 'marcarArmado', pedidos: [{ h: P.h, id: String(P.n), r: P.r, c: 'PRUEBA Robot' }], armado: true, usuario: 'robot', clientOpId: PREFIJO + 'armar' });
    const en = await directa(pg, 'marcarEntregado', Object.assign({ action: 'marcarEntregado', cobrado: false, propina: 0, repartidor: '', clientOpId: PREFIJO + 'entregar' }, base));
    chk('PRUEBA #' + n + ' · total ' + f$(tot) + ' · entregado', en && en.d && en.d.ok, en);
    const gr = await directa(pg, 'pedidoGrupal', { action: 'pedidoGrupal', hoja: P.h, row: P.r, id: String(P.n), valor: 'Sí', clientOpId: PREFIJO + 'grupal' });
    chk('marcado «Juntada o evento»', gr && gr.d && gr.d.ok, gr);
    await pg.evaluate(() => _recargarPedidos()).catch(() => 0);
    await esperar(pg, ([h, n]) => { const p = (D.pedidos || []).find((x) => x.h === h && String(x.n) === n); return p && p.es === 'Entregado' && String(p.grp || '').trim(); }, [P.h, n], 25000);
    const abrir = async (pgx) => { await pgx.evaluate(([h, n, r]) => { go('pedidos'); openOrdDetail(h, n, r); }, [P.h, n, P.r]); await T(1500);
      await pgx.evaluate(() => { const m = document.getElementById('ordMas'); if (m) m.open = true; }); await T(800); };
    await abrir(pg);

    console.log('\n== 2. Quiénes comieron, con el dedo (WebKit 393) ==');
    const pidio = String(P.c).replace(/\s*\(Red:[^)]*\)\s*$/, '').trim();
    /* 2a. Uno del CRM, por el buscador. */
    let b = await tocar(pg, '#ordBody .com button.com-mas', '+ Agregar persona'); chk('«+ Agregar persona» se toca (alto ' + (b && b.h) + ' px)', !!b && b.mismo && b.h >= 44, b);
    const qid = '#com-' + P.h + '-' + n + '-q';
    const foco0 = await pg.evaluate((q) => document.activeElement && ('#' + document.activeElement.id) === q, qid);
    chk('sin foco automático: el teclado no se abre solo', !foco0, foco0);
    await tocar(pg, qid); await pg.keyboard.type('Iñaki', { delay: 40 }); await T(1200);
    await esperar(pg, (q) => { const b = document.querySelector(q + '-res .com-r:not(.nuevo)'); return !!b; }, qid.slice(0), 20000);
    const crm1 = await pg.evaluate((q) => { const b = document.querySelector(q.replace('-q', '-res') + ' .com-r:not(.nuevo)'); return b ? { n: b.getAttribute('data-n'), k: b.getAttribute('data-k') } : null; }, qid);
    chk('el buscador encuentra a un cliente del CRM (' + (crm1 && crm1.n) + ')', !!crm1, crm1);
    if (!crm1) throw new Error('sin cliente del CRM para sumar');
    b = await tocar(pg, qid.replace('-q', '-res') + ' .com-r:not(.nuevo)'); chk('se suma con un toque', !!b && b.mismo, b);
    await esperar(pg, ([h, n, nm]) => { const c = document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"]'); return c && c.textContent.indexOf(nm) >= 0 && !c.querySelector('.com-fila.pend'); }, [P.h, n, crm1.n], 20000);
    /* 2b. Tres nuevos. */
    const NUE = [{ nom: 'PRUEBA Vive ' + SUF, donde: 'Vive en Estancias', tel: '1199' + String(Date.now()).slice(-6) },
                 { nom: 'PRUEBA Finde ' + SUF, donde: 'Casa de fin de semana', tel: '1198' + String(Date.now() + 7).slice(-6) },
                 { nom: 'PRUEBA Visita ' + SUF, donde: 'Visita', tel: '' }];
    for (const x of NUE) {
      await tocar(pg, '#ordBody .com button.com-mas', '+ Agregar persona');
      await tocar(pg, qid); await pg.keyboard.type(x.nom, { delay: 25 }); await T(500);
      b = await tocar(pg, qid.replace('-q', '-res') + ' .com-r.nuevo'); if (!b || !b.mismo) { chk('«Nueva persona» para ' + x.nom, false, b); continue; }
      await esperar(pg, (f) => !!document.getElementById('fpers-' + f), fid(), 8000);
      if (x === NUE[0]) await pg.screenshot({ path: path.join(OUT, 'alta_nueva_393.png') });
      const chips = await pg.evaluate((f) => [].map.call(document.querySelectorAll('#fpers-' + f + ' .pf-chip'), (c) => c.textContent), fid());
      if (x === NUE[0]) chk('el alta ofrece las 3 opciones: ' + chips.join(' / '), chips.join('|') === 'Vive en Estancias|Casa de fin de semana|Visita', chips);
      await tocar(pg, '#fpers-' + fid() + ' .pf-chip', x.donde);
      if (x.tel) { await tocar(pg, '#fpers-' + fid() + '-tel'); await pg.keyboard.type(x.tel, { delay: 15 }); }
      if (x.donde !== 'Visita') {
        await esperar(pg, (f) => { const s = document.getElementById('fpers-' + f + '-barrio'); return s && s.options.length > 1; }, fid(), 15000);
        const bar = await pg.evaluate((f) => { const s = document.getElementById('fpers-' + f + '-barrio'); return s && s.options.length > 1 ? s.options[1].value || s.options[1].text : ''; }, fid());
        await pg.selectOption('#fpers-' + fid() + '-barrio', { label: bar }); await T(400);
        await tocar(pg, '#fpers-' + fid() + '-lote'); await pg.keyboard.type('9' + (x === NUE[0] ? '1' : '2'), { delay: 30 });
        x.barrio = bar;
      }
      b = await tocar(pg, '#fpers-' + fid() + ' .pf-acc .jnt-btn.prim'); chk('«Sumarla» (' + x.nom + ', ' + x.donde + ')', !!b && b.mismo, b);
      const lleg = await esperar(pg, ([h, n, nm]) => { const c = document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"]'); return c && !document.querySelector('[id^="fpers-com"]') && c.textContent.toLowerCase().indexOf(nm.toLowerCase()) >= 0 && !c.querySelector('.com-fila.pend'); }, [P.h, n, x.nom], 25000);
      chk('  ' + x.nom + ' quedó en la lista', !!lleg, await pg.evaluate(LEER, [P.h, n]));
    }
    /* El CRM guarda los nombres a su manera («PRUEBA Vive» → «Prueba Vive»): de acá en más, los de la base. */
    const Jn = await rpc(pg, 'juntada_pantalla', { p: { grp: 'Pedido ' + P.h + ' ' + n } });
    NUE.forEach((x) => { const m = ((Jn && Jn.integrantes) || []).find((y) => y.nombre.toLowerCase() === x.nom.toLowerCase()); if (m) x.nom = m.nombre; });
    const gente = [pidio, crm1.n].concat(NUE.map((x) => x.nom));
    let L = await pg.evaluate(LEER, [P.h, n]);
    chk('somos 5: ' + L.filas.map((f) => f.split(' Le toca')[0]).join(' · '), L.filas.length === 5, L.filas);

    console.log('\n== 3. Gastos de afuera ==');
    const GAS = [{ quien: NUE[0].nom, que: 'Pan', monto: 3000 }, { quien: crm1.n, que: 'Carbón', monto: 20000 }];
    for (const g of GAS) {
      b = await tocar(pg, '#ordBody .com button.com-mas', '+ Agregar gasto de afuera'); if (!b) { chk('«+ Agregar gasto»', false); break; }
      await tocar(pg, '#ordBody .com-gf .pf-chip[data-v="' + g.quien.replace(/"/g, '\\"') + '"]');
      await tocar(pg, '#ordBody .com-gf .pf-chip', g.que);
      await tocar(pg, '#com-' + P.h + '-' + n + '-gm'); await pg.keyboard.type(String(g.monto), { delay: 30 });
      b = await tocar(pg, '#ordBody .com-gf .jnt-btn.prim'); chk('gasto ' + g.que + ' ' + f$(g.monto) + ' de ' + g.quien.split(' ')[0], !!b && b.mismo, b);
      await esperar(pg, ([h, n, q]) => { const c = document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"]'); return c && !c.querySelector('.com-gf') && c.textContent.indexOf(q) >= 0; }, [P.h, n, g.que], 20000);
    }
    /* Cambiar un gasto (editar) y volverlo: el carbón a 21.000 y de nuevo a 20.000. */
    b = await tocar(pg, '#ordBody .com button.com-ed1');
    await esperar(pg, () => !!document.querySelector('#ordBody .com-gf'), null, 5000);
    const edTit = await pg.evaluate(() => (document.querySelector('#ordBody .com-gf .jnt-btn.prim') || {}).textContent);
    chk('«Cambiar» abre el gasto para editar («' + edTit + '») con «Borrar este gasto» aparte', /Guardar el cambio/.test(edTit || '') && !!(await pg.$('#ordBody .com-pie-borrar .com-x')), edTit);
    await tocar(pg, '#ordBody .com-gf .jnt-btn', 'Cancelar');

    console.log('\n== 4. La cuenta, peso por peso ==');
    await esperar(pg, ([h, n]) => { const c = document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"] .com-cuenta'); return c && /Pagaron 0 de/.test(c.textContent); }, [P.h, n], 25000);
    L = await pg.evaluate(LEER, [P.h, n]);
    const X = esperada(tot, gente, GAS);
    console.log('       esperado: cada uno ' + f$(X.cada) + ' · ' + X.tr.map((t) => t.de + '→' + t.a + ' ' + f$(t.m)).join(' · '));
    console.log('       pantalla: ' + L.cuenta + ' | ' + L.trans.join(' | '));
    chk('«Cada uno: ' + f$(X.cada) + ' · son 5» y el total ' + f$(X.total), L.cuenta.indexOf('Cada uno: ' + f$(X.cada)) >= 0 && /son 5/.test(L.cuenta) && L.cuenta.indexOf('Total ' + f$(X.total)) >= 0, L.cuenta);
    const aMaleu = X.tr.filter((t) => t.a === 'Maleu'), aOtros = X.tr.filter((t) => t.a !== 'Maleu');
    chk('«Pagaron 0 de ' + aMaleu.length + ' · faltan ' + f$(tot) + '»', L.cuenta.indexOf('Pagaron 0 de ' + aMaleu.length + ' · faltan ' + f$(tot)) >= 0, L.cuenta);
    chk('cada «Marcar pagó» es lo que esa persona le debe a Maleu', aMaleu.length === L.pagar.length && aMaleu.every((t) => L.pagar.some((q) => q.n === t.de && q.m === t.m)), { esperado: aMaleu, pantalla: L.pagar });
    const C2 = (nm) => nm === 'Maleu' ? 'Maleu' : corto(nm, gente);
    chk('quién le pasa a quién: ' + X.tr.length + ' renglones, iguales al cálculo', X.tr.length === L.trans.length && X.tr.every((t, i) => L.trans[i].indexOf(C2(t.de) + ' → ' + C2(t.a)) === 0 && L.trans[i].indexOf(f$(t.m)) >= 0), { X: X.tr, L: L.trans });
    chk('los pases entre ellos tienen «Ya se lo pasó» (' + aOtros.length + ')', L.pase === aOtros.length && aOtros.length >= 1, L.pase);
    chk('ningún botón de la juntada mide menos de 44 px', L.chicos.length === 0, L.chicos);
    await pg.evaluate(() => { window.__copiado = []; });
    await tocar(pg, '#ordBody .com button.com-grupo'); await T(600);
    const txt = await pg.evaluate(() => (window.__copiado || []).join('\n'));
    console.log('       copiado:\n         ' + txt.replace(/\n/g, '\n         '));
    chk('«Copiar para el grupo»: cada transferencia, el alias maleu26 y un $ por renglón', X.tr.every((t) => txt.indexOf(C2(t.de) + ' → ' + C2(t.a) + ': ' + f$(t.m)) >= 0) && /maleu26/.test(txt) && txt.split('\n').every((l) => (l.match(/\$/g) || []).length <= 1), txt);
    await pg.screenshot({ path: path.join(OUT, 'juntada_cuenta_393.png'), fullPage: false });
    await pg.evaluate(() => { const c = document.querySelector('#ordBody .com'); if (c) c.scrollIntoView({ block: 'start' }); }); await T(300);
    await pg.screenshot({ path: path.join(OUT, 'juntada_cuenta_393_b.png') });

    console.log('\n== 5. Chromium 1440, con mouse (y el build viejo) ==');
    const cr = await pw.chromium.launch();
    try {
      const B = await entrar(cr, { viewport: { width: 1440, height: 900 }, __url: BASE });
      await abrir(B.pg);
      const L2 = await esperar(B.pg, ([h, n]) => { const c = document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"] .com-cuenta'); return c && /Pagaron/.test(c.textContent) ? c.textContent : null; }, [P.h, n], 30000);
      const LL = await B.pg.evaluate(LEER, [P.h, n]);
      chk('1440: la misma cuenta y los mismos «Marcar pagó»', !!L2 && LL.pagar.length === L.pagar.length && LL.trans.join('|') === L.trans.join('|'), { L2, LL });
      const bb = await tocar(B.pg, '#ordBody .com button.com-mas', '+ Agregar persona', 'mouse');
      chk('1440: «+ Agregar persona» con mouse, el puntero cae en el botón', !!bb && bb.mismo, bb);
      await B.pg.screenshot({ path: path.join(OUT, 'juntada_cuenta_1440.png') });
      await tocar(B.pg, '#ordBody .com button.com-mas', 'Cerrar', 'mouse');
      chk('1440: sin errores de JS', B.pg.__errs.length === 0, B.pg.__errs);
      if (VIEJO) {
        const V = await entrar(cr, { viewport: { width: 1440, height: 900 }, __url: VIEJO });
        await abrir(V.pg); await T(4000);
        const LV = await V.pg.evaluate(([h, n]) => { const c = document.querySelector('#ordBody .com'); return c ? { gasto: c.textContent.indexOf('+ Agregar gasto de afuera') >= 0, trans: c.textContent.indexOf('Quién le pasa a quién') >= 0, cuenta: ((c.querySelector('.com-cuenta') || {}).textContent || '') } : null; }, [P.h, n]);
        console.log('       build viejo: ' + JSON.stringify(LV));
        chk('el build VIEJO no tiene gastos de afuera ni «quién le pasa a quién» (la prueba lo agarra)', !!LV && !LV.gasto && !LV.trans, LV);
        await V.ctx.close();
      }
      await B.ctx.close();
    } finally { await cr.close(); }

    console.log('\n== 6. Los pagos a Maleu, de a uno ==');
    const pagos = [];
    for (let i = 0; i < aMaleu.length - 1; i++) {
      await abrir(pg);
      await esperar(pg, ([h, n]) => !!document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"] button.com-pagar'), [P.h, n], 25000);
      const t = aMaleu[i];
      b = await tocar(pg, '#ordBody button.com-pagar[data-n="' + t.de.replace(/"/g, '\\"') + '"]');
      chk('«Marcar pagó» de ' + t.de.split(' ')[0] + ' (' + f$(t.m) + ')', !!b && b.mismo, b);
      let d = null; for (let k = 0; k < 20; k++) { d = await rpc(pg, 'pedido_cobro_pantalla', { p: { h: P.h, n, r: P.r } }); if (d && (d.pagos || []).length >= i + 1) break; await T(800); }
      pagos.push(t);
      const pg_ = (d && d.pagos) || [];
      chk('  la base: ' + pg_.length + ' pago(s), el último ' + f$((pg_[pg_.length - 1] || {}).monto || 0) + ' con la nota «Juntada: ' + t.de.split(' ')[0] + '…»', pg_.length === i + 1 && pg_.some((x) => Math.round(x.monto) === t.m && x.nota === 'Juntada: ' + t.de), pg_.map((x) => ({ m: x.monto, nota: x.nota, cta: x.cuenta })));
      await esperar(pg, ([h, n, k]) => { const c = document.querySelector('#ordBody .com[data-com="' + h + '|' + n + '"] .com-cuenta'); return c && c.textContent.indexOf('Pagaron ' + k) >= 0; }, [P.h, n, i + 1], 25000);
    }
    L = await pg.evaluate(LEER, [P.h, n]);
    const falta = aMaleu[aMaleu.length - 1];
    chk('«Pagaron ' + (aMaleu.length - 1) + ' de ' + aMaleu.length + ' · faltan ' + f$(falta.m) + '»', L.cuenta.indexOf('Pagaron ' + (aMaleu.length - 1) + ' de ' + aMaleu.length + ' · faltan ' + f$(falta.m)) >= 0, L.cuenta);
    chk('a los que faltan no les cambió el monto (Maleu primero, en orden)', L.pagar.length === 1 && L.pagar[0].n === falta.de && L.pagar[0].m === falta.m, L.pagar);
    const ep1 = await pg.evaluate(([h, n]) => { const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); return p && p.ep; }, [P.h, n]);
    chk('el pedido sigue sin cobrar (' + ep1 + ')', ep1 !== 'Cobrado', ep1);
    /* El pase entre ellos: no toca la caja. */
    const antesPagos = ((await rpc(pg, 'pedido_cobro_pantalla', { p: { h: P.h, n, r: P.r } })).pagos || []).length;
    b = await tocar(pg, '#ordBody button.com-pase'); chk('«Ya se lo pasó» (' + aOtros[0].de.split(' ')[0] + ' → ' + aOtros[0].a.split(' ')[0] + ')', !!b && b.mismo, b);
    await esperar(pg, () => !document.querySelector('#ordBody button.com-pase') && !!document.querySelector('#ordBody .com-fila.hecho'), null, 20000);
    const despPagos = ((await rpc(pg, 'pedido_cobro_pantalla', { p: { h: P.h, n, r: P.r } })).pagos || []).length;
    chk('el pase queda «ya se lo pasó» y NO es un pago a Maleu (' + antesPagos + ' → ' + despPagos + ')', antesPagos === despPagos, { antesPagos, despPagos });

    console.log('\n== 7. El último, desde el bloque de Cobranza (comCobranzaHTML, lo que dibuja la tarjeta de Ruta) ==');
    /* El robot no ve este pedido en su Cobranza (su lista es otra): el bloque se pone en la pantalla tal cual lo pone Ruta,
       con el renglón que trae la tarjeta (h, id, c, $ = saldo, cobradoParcial, grp). La tarjeta de Ruta de verdad se prueba
       aparte, sin escribir, con una juntada real (probar_cobranza_juntada.js). */
    await pg.evaluate(([h, n]) => { try { closeOrdDetail(); } catch (e) {} const p = D.pedidos.find((x) => x.h === h && String(x.n) === n);
      let box = document.getElementById('__cobPrueba'); if (!box) { box = document.createElement('div'); box.id = '__cobPrueba'; box.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:auto;background:#fff;padding:16px'; document.body.appendChild(box); }
      box.innerHTML = window.comCobranzaHTML({ h: p.h, id: String(p.n), c: p.c, $: 0, totalOriginal: Number(p.$) || 0, cobradoParcial: 0, grp: p.grp, es: p.es, r: p.r }); }, [P.h, n]);
    const enCob = await esperar(pg, ([h, n]) => !!document.querySelector('.com-cob[data-com="' + h + '|' + n + '"] button.com-pagar'), [P.h, n], 30000);
    chk('el bloque de Cobranza muestra la juntada con «Marcar pagó» de ' + corto(falta.de, gente), !!enCob, await pg.evaluate(([h, n]) => { const c = document.querySelector('.com-cob[data-com="' + h + '|' + n + '"]'); return c ? c.textContent.slice(0, 300) : 'no está'; }, [P.h, n]));
    if (enCob) {
      const cobTxt = await pg.evaluate(([h, n]) => document.querySelector('.com-cob[data-com="' + h + '|' + n + '"]').textContent.replace(/\s+/g, ' '), [P.h, n]);
      chk('  Cobranza dice lo mismo que la ficha (Pagaron ' + (aMaleu.length - 1) + ' de ' + aMaleu.length + ')', cobTxt.indexOf('Pagaron ' + (aMaleu.length - 1) + ' de ' + aMaleu.length + ' · faltan ' + f$(falta.m)) >= 0, cobTxt.slice(0, 300));
      await pg.screenshot({ path: path.join(OUT, 'cobranza_bloque_393.png') });
      b = await tocar(pg, '.com-cob[data-com="' + P.h + '|' + n + '"] button.com-pagar'); chk('  «Marcar pagó» desde Cobranza, con el dedo', !!b && b.mismo, b);
    }
    await T(1500);
    await pg.evaluate(() => { const b = document.getElementById('__cobPrueba'); if (b) b.remove(); });
    let d5 = null; for (let k = 0; k < 20; k++) { d5 = await rpc(pg, 'pedido_cobro_pantalla', { p: { h: P.h, n, r: P.r } }); if (d5 && (d5.pagos || []).length >= aMaleu.length) break; await T(1000); }
    await pg.evaluate(() => _recargarPedidos()).catch(() => 0);
    const p5 = await esperar(pg, ([h, n]) => { const p = D.pedidos.find((x) => x.h === h && String(x.n) === n); return p && p.ep === 'Cobrado' ? p.ep : null; }, [P.h, n], 30000);
    const sumP = ((d5 && d5.pagos) || []).reduce((s, x) => s + Math.round(x.monto), 0);
    chk('con el último el pedido queda Cobrado (' + (p5 || 'no') + '); los pagos suman ' + f$(sumP) + ' = el pedido', p5 === 'Cobrado' && sumP === tot, { ep: p5, sumP, tot, pagos: d5 && d5.pagos });
    const ctaDef = await pg.evaluate(() => String(((_cajaCuentas() || []).filter((x) => x && x.def && x.tipo !== 'efectivo')[0] || {}).id || ''));
    chk('todos a la misma cuenta: la por defecto (' + ctaDef + ') o, para el robot, su cuenta aislada «prueba» (la base la fuerza)', ((d5 && d5.pagos) || []).every((x) => [ctaDef.toLowerCase(), 'prueba'].indexOf(String(x.cuenta).toLowerCase()) >= 0), (d5 && d5.pagos || []).map((x) => x.cuenta));
    await abrir(pg); await T(1500);
    L = await pg.evaluate(LEER, [P.h, n]);
    chk('la ficha: «Maleu cobrado» y nadie con «Marcar pagó»', /Maleu cobrado/.test(L.cuenta) && L.pagar.length === 0, L);

    console.log('\n== 8. Las fichas del CRM ==');
    const J = await rpc(pg, 'juntada_pantalla', { p: { grp: 'Pedido ' + P.h + ' ' + n } });
    const integ = (J && J.integrantes) || [];
    LIMPIA.claves = integ.map((m) => m.tel).filter((k) => k && k !== crm1.k);
    LIMPIA.nombres = NUE.map((x) => x.nom);
    console.log('       integrantes: ' + JSON.stringify(integ));
    chk('cada comensal quedó con su clave del CRM (el sin teléfono, sn-)', integ.length === 4 && integ.every((m) => m.tel) && integ.some((m) => m.nombre === NUE[2].nom && /^sn-/.test(m.tel)), integ);
    for (const x of NUE) {
      const m = integ.find((y) => y.nombre === x.nom); if (!m) continue;
      const fic = await pg.evaluate(async (k) => { const sb = await _sbPermiso(true); const r = await fetch(sb.url + '/rest/v1/rpc/crm_persona_directo', { method: 'POST', headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: { key: k } }) }); return r.json(); }, m.tel);
      const esp = x.donde === 'Visita' ? 'visita' : (x.donde === 'Vive en Estancias' ? 'vive' : 'finde');
      chk('  ' + x.nom + ': ficha en el CRM, «' + (fic && fic.donde) + '», conocida en «' + (fic && fic.juntada) + '»', fic && fic.ok && fic.donde === esp && /^Pedido /.test(String(fic.juntada || '')), fic);
    }
    const dc = await pg.evaluate(([nm, k]) => { _COM.t = 0; return _comCargar().then(() => ({ por: _COM.claves ? 'clave' : 'nombre', ck: _comDondeComio(nm, k) })); }, [NUE[0].nom, integ.find((m) => m.nombre === NUE[0].nom).tel]);
    chk('el CRM la ve en la juntada (une por ' + dc.por + ')', dc.ck.indexOf('g:' + LIMPIA.grupo) >= 0, dc);
    chk('sin errores de JS', pg.__errs.length === 0, pg.__errs);
  } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
  finally {
    if (P && A) {
      console.log('\n== 9. Limpieza (la parte del ERP) ==');
      const d = await directa(A.pg, 'descobrar', { action: 'descobrar', motivo: 'prueba de la juntada completa', clientOpId: PREFIJO + 'descobrar', hoja: P.h, id: String(P.n), row: P.r }).catch((e) => ({ error: e.message }));
      console.log('       deshacer el cobro: ' + JSON.stringify(d && (d.d || d)).slice(0, 160));
      const li = await rpc(A.pg, 'robot_limpiar', { p_corrida: CORRIDA }).catch((e) => ({ error: e.message }));
      console.log('       robot_limpiar: ' + JSON.stringify(li).slice(0, 300));
    }
    fs.writeFileSync(path.join(OUT, 'limpieza.json'), JSON.stringify(LIMPIA, null, 1));
    console.log('       ' + path.join(OUT, 'limpieza.json') + ' → ' + JSON.stringify(LIMPIA));
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    try { if (wk) await wk.close(); } catch (e) {}
    process.exit(mal ? 1 : 0);
  }
})();
