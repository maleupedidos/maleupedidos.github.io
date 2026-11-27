/* MI PORTAL › HOY: EL REPRESENTANTE RINDE SIN WHATSAPP (910, 27/11/2026, encargo F C.2, caso Lou). En WebKit a 390 con
   toques, entrando como el representante robot (pruebarobot). Los pedidos son INVENTADOS (990001-990003, inyectados en
   el portal) y la base de la 910 está SIMULADA con page.route: no se escribe nada real.
     1. Cada pedido sin cobrar trae los 4 caminos en 2×2, todos de 44 px o más y adentro de los 390; el alias de Maleu.
     2. «Me va a transferir» → redPromesa; la fila lo dice y ofrece deshacer.
     3. «Me transfirió a mí» → redTrAMi; la fila dice «Te transfirió a vos» y lo en mano lo separa.
     4. «Le pasé plata a Maleu» → viene tildado lo en mano; se tilda la promesa; el total se suma solo; N.º de operación;
        «Avisar» → redRendirAvisar con esos pedidos, ese monto y esa referencia; las filas dicen «Se lo pasaste a Maleu» y
        aparece la rendición con Deshacer.
     5. La ficha del pedido ya no dice «no le cobrás».
   PW=<playwright-core> BASE=http://localhost:8177/app.html node probar_rendicion_portal.js   (MOTOR=chromium para comparar) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8177/app.html';
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let bien = 0, mal = 0; const chk = (t, ok, x) => { ok ? bien++ : mal++; console.log((ok ? '  BIEN ' : '  MAL  ') + t + (x !== undefined && !ok ? ' · ' + JSON.stringify(x).slice(0, 400) : '')); return ok; };
const PED = [
  { n: '990001', c: 'PRUEBA Ana', $: 47000, env: 3000, es: 'Entregado', ep: 'No Cobrado', fe: '2026-11-25', row: -990001, t: '5490000000001' },
  { n: '990002', c: 'PRUEBA Bea', $: 27000, env: 3000, es: 'Entregado', ep: 'No Cobrado', fe: '2026-11-26', row: -990002, t: '5490000000002' },
  { n: '990003', c: 'PRUEBA Caro', $: 17000, env: 3000, es: 'Entregado', ep: 'No Cobrado', fe: '2026-11-27', row: -990003, t: '5490000000003' }
];
(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const br = await pw[process.env.MOTOR || 'webkit'].launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_ensayo','1');}catch(e){} window.confirm=function(){return true;}; window.alert=function(){};`);
  /* La base de la 910, simulada. */
  const est = { enMano: {}, promesas: [], rendiciones: [], llamadas: [] };
  let yo = '';
  const pantalla = () => ({ ok: true, palanca: true, enMano: Object.keys(est.enMano).length ? { [yo]: { total: 0, pedidos: Object.values(est.enMano) } } : {},
    recibidos: [], avisosTr: {}, rendiciones: est.rendiciones, promesas: est.promesas });
  await ctx.route(/\/rest\/v1\/rpc\/(red_efectivo_pantalla|red_rendicion_directo|red_efectivo_directo|red_aviso_tr_directo)/, async (route) => {
    const u = route.request().url(), fn = /rpc\/([a-z_]+)/.exec(u)[1];
    let r = { ok: true };
    if (fn === 'red_efectivo_pantalla') r = pantalla();
    else if (fn === 'red_rendicion_directo') {
      const p = JSON.parse(route.request().postData() || '{}').p || {}; est.llamadas.push(p);
      const ped = PED.find((x) => x.n === String(p.n));
      if (p.action === 'redPromesa') { est.promesas.push({ n: p.n, representante: yo, cliente: ped.c, monto: ped.$ + ped.env }); r = { ok: true, n: p.n, monto: ped.$ + ped.env }; }
      else if (p.action === 'redPromesaDeshacer') { est.promesas = est.promesas.filter((x) => x.n !== p.n); r = { ok: true, deshecho: true }; }
      else if (p.action === 'redTrAMi') { est.enMano[p.n] = { n: p.n, cliente: ped.c, monto: ped.$ + ped.env, pedido: ped.$ + ped.env, medio: 'transferencia' }; r = { ok: true, n: p.n, monto: ped.$ + ped.env, medio: 'transferencia' }; }
      else if (p.action === 'redRendirAvisar') {
        est.rendiciones.push({ id: 7, representante: yo, monto: p.monto, pedidos: p.pedidos, referencia: p.referencia, estado: 'avisada', at: '27/11 18:40',
          clientes: p.pedidos.map((n) => { const q = PED.find((x) => x.n === n); return { n: n, cliente: q.c, monto: q.$ + q.env }; }) });
        est.promesas = est.promesas.filter((x) => p.pedidos.indexOf(x.n) < 0);
        r = { ok: true, id: 7, monto: p.monto, pedidos: p.pedidos };
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
  });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
  await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, ['pruebarobot', String(cred.pinRep)]);
  await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario, null, { timeout: 120000 });
  yo = await pg.evaluate(() => SESSION.nombre);
  for (let i = 0; i < 30; i++) {
    if (await pg.evaluate(() => (document.querySelector('.pg.on') || {}).id === 'p-miportal' && typeof renderCobHoy === 'function')) break;
    await pg.evaluate(() => { try { go('miportal'); } catch (e) {} }); await T(1500);
  }
  /* Los pedidos inventados, sobre lo último que armó el portal. */
  const inyectar = () => pg.evaluate(([P, nom]) => {
    const c = JSON.parse(localStorage.getItem('maleu_red_dash_' + nom) || 'null'); if (!c || !c.data) return 'sin datos del portal';
    const d = c.data; d.pedidos = (d.pedidos || []).filter((x) => !/^9900/.test(String(x.n))).concat(P);
    renderDashboard(d); return 'ok';
  }, [PED, yo]);
  await pg.waitForFunction((nom) => !!localStorage.getItem('maleu_red_dash_' + nom), yo, { timeout: 90000 }).catch(() => {});
  chk('se inyectan los pedidos en el portal', (await inyectar()) === 'ok');
  await pg.evaluate(() => { try { _redEfLeer(true).then(_redCobRepintar); } catch (e) { window.__e = String(e); } });
  await pg.waitForFunction(() => document.querySelectorAll('#cb-card .cb-fila .cb-acc4').length >= 3, null, { timeout: 30000 }).catch(() => {});
  const filas = await pg.evaluate(() => [...document.querySelectorAll('#cb-card .cb-fila[data-n^="9900"]')].map((f) => ({
    n: f.dataset.n, bts: [...f.querySelectorAll('.cb-acc button')].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right) }; }) })));
  chk('las 3 filas, con 4 botones cada una', filas.length === 3 && filas.every((f) => f.bts.length === 4), filas);
  chk('los 4 caminos: efectivo, transfirió a mí, a Maleu, va a transferir', filas.length && filas[0].bts.map((b) => b.t).join('|') === 'Me pagó en efectivo|Me transfirió a mí|Le transfirió a Maleu|Me va a transferir', filas[0] && filas[0].bts.map((b) => b.t));
  chk('todos de 44 px o más y adentro de los 390', filas.every((f) => f.bts.every((b) => b.h >= 44 && b.l >= 0 && b.r <= 390)), filas.map((f) => f.bts));
  chk('el alias de Maleu para pasarle al cliente', await pg.evaluate(() => /maleu26/i.test((document.querySelector('#cb-card .cb-alias') || {}).textContent || '')));
  /* Centrado (al borde lo tapa la barra fija de abajo) y con hit-testing: el dedo toca lo que está arriba de todo. */
  const tocar = async (sel) => { const el = await pg.$(sel); if (!el) return false; await el.evaluate((e) => e.scrollIntoView({ block: 'center' })); await T(250);
    const b = await el.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
    const arriba = await pg.evaluate(([s, x, y]) => { const t = document.elementFromPoint(x, y), e = document.querySelector(s); return !!t && (t === e || e.contains(t) || (t.tagName === 'LABEL' && t.contains(e))); }, [sel, x, y]);
    if (!arriba) console.log('  (aviso) algo tapa ' + sel);
    await pg.touchscreen.tap(x, y); return arriba; };
  /* 2. La promesa */
  await tocar('#cb-card .cb-fila[data-n="990003"] .cb-acc button:nth-child(4)');
  await pg.waitForFunction(() => /va a transferir más adelante/.test((document.querySelector('#cb-card .cb-fila[data-n="990003"]') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  chk('«Me va a transferir» → redPromesa del 990003', est.llamadas.some((p) => p.action === 'redPromesa' && p.n === '990003'), est.llamadas);
  chk('  la fila dice «Te va a transferir más adelante» y ofrece deshacer', await pg.evaluate(() => { const f = document.querySelector('#cb-card .cb-fila[data-n="990003"]'); return !!f && /va a transferir más adelante/.test(f.textContent) && /Ya no: deshacer/.test(f.textContent); }));
  /* 3. Me transfirió a mí */
  await tocar('#cb-card .cb-fila[data-n="990002"] .cb-acc button:nth-child(2)');
  await pg.waitForFunction(() => /Te transfirió a vos/.test((document.querySelector('#cb-card .cb-fila[data-n="990002"]') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  chk('«Me transfirió a mí» → redTrAMi del 990002', est.llamadas.some((p) => p.action === 'redTrAMi' && p.n === '990002' && /^rtm_/.test(p.clientOpId || '')), est.llamadas);
  chk('  la fila dice «Te transfirió a vos» y lo en mano lo separa', await pg.evaluate(() => /Te transfirió a vos/.test(document.querySelector('#cb-card .cb-fila[data-n="990002"]').textContent)
    && /transfirieron a vos/.test(document.getElementById('cb-card').textContent)), await pg.evaluate(() => document.getElementById('cb-card').innerText.slice(0, 600)));
  /* 4. Le pasé plata a Maleu */
  chk('«Le pasé plata a Maleu» a la vista', await tocar('#cb-card .cb-rendir'));
  await pg.waitForSelector('#redRendOv input[type=checkbox]', { timeout: 10000 }).catch(async () => {
    console.log('DIAG', JSON.stringify(await pg.evaluate(() => { let e = ''; try { redRendirAbrir(); } catch (x) { e = String(x); } return { e: e, ov: !!document.getElementById('redRendOv'), btn: (document.querySelector('#cb-card .cb-rendir') || {}).outerHTML }; })), errs);
  });
  const sel0 = await pg.evaluate(() => [...document.querySelectorAll('#redRendOv input[type=checkbox]')].filter((c) => c.checked).map((c) => c.dataset.n));
  chk('viene tildado solo lo que tiene en mano (990002)', sel0.join() === '990002', sel0);
  await tocar('#redRendOv input[data-n="990003"]');
  const tot = await pg.evaluate(() => (document.getElementById('redRendOk') || {}).textContent || '');
  chk('  tildar la promesa suma sola: $50.000', /50\.000/.test(tot), tot);
  await tocar('#redRendRef'); await pg.keyboard.type('190816850643');
  const bh = await pg.evaluate(() => Math.round(document.getElementById('redRendOk').getBoundingClientRect().height));
  chk('  el botón de avisar, 44 px o más', bh >= 44, bh);
  await tocar('#redRendOk');
  await pg.waitForFunction(() => !document.getElementById('redRendOv'), null, { timeout: 15000 }).catch(() => {});
  const av = est.llamadas.find((p) => p.action === 'redRendirAvisar');
  chk('«Avisar» → redRendirAvisar con los dos pedidos, $50.000 y la referencia', !!av && av.pedidos.slice().sort().join() === '990002,990003' && av.monto === 50000 && av.referencia === '190816850643' && /^rend_/.test(av.clientOpId || ''), av);
  await pg.waitForFunction(() => /Le pasaste \$\s?50\.000 a Maleu/.test(document.getElementById('cb-card').textContent), null, { timeout: 15000 }).catch(() => {});
  chk('  aparece la rendición avisada con Deshacer', await pg.evaluate(() => { const r = document.querySelector('#cb-card .cb-rend'); return !!r && /falta que confirme/.test(r.textContent) && /Deshacer/.test(r.textContent); }),
    await pg.evaluate(() => document.getElementById('cb-card').innerText.slice(0, 800)));
  chk('  las dos filas dicen «Se lo pasaste a Maleu», sin botones', await pg.evaluate(() => ['990002', '990003'].every((n) => { const f = document.querySelector('#cb-card .cb-fila[data-n="' + n + '"]'); return f && /Se lo pasaste a Maleu/.test(f.textContent) && !f.querySelector('.cb-acc'); })));
  chk('  lo ya rendido no queda en «Tenés para darle a Maleu»', await pg.evaluate(() => !/Tenés para darle a Maleu/.test(document.getElementById('cb-card').textContent)));
  chk('  la 990001 sigue con sus 4 botones', await pg.evaluate(() => document.querySelectorAll('#cb-card .cb-fila[data-n="990001"] .cb-acc button').length === 4));
  /* 5. La ficha */
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'red.html'), 'utf8');
  chk('la ficha del pedido ya no dice «no le cobrás»', !/Vos coordinás la entrega: no le cobrás/.test(src));
  if (process.env.OUT) await pg.screenshot({ path: path.join(process.env.OUT, 'rendicion_portal.png'), fullPage: false });
  chk('sin errores de JS', !errs.length, errs);
  console.log('\n' + bien + ' bien · ' + mal + ' mal');
  await br.close(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
