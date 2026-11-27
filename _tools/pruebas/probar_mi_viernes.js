/* RUTA › MI VIERNES CON TOQUES DE VERDAD (27/11/2026, 877). Recorre el viernes como Lucas: tilda cada renglón, pasa de
   paso con el botón de abajo, da cada bolsa y termina en «Al llegar a lo de Tadeo» tocando «Recibir de …».
     PW=<playwright-core> SBSES=<sesion.json> BASE=http://localhost:8155/app.html [MODO=real|prueba] [ANCHOS=390,1440]
       [OUT=<dir>] [USUARIO=luqui] node probar_mi_viernes.js
   MODO=real    los datos reales del viernes, SOLO LECTURA: la guarda de sbses_guarda.js corta toda escritura (la bolsa
                y el recibir quedan en el intento; se verifica QUÉ se habría mandado).
   MODO=prueba  un viernes armado con datos PRUEBA (2 representantes, un renglón en Moresco, uno en Ustariz, uno de
                proveedor y un Home sin entregar), servido como respuesta de `mi_viernes_pantalla`: nunca stock real.
   En cada paso verifica: (1) cada parte de cada renglón tiene UN origen; (2) cada bolsa cierra contra sus pedidos;
   (3) salió de los freezers + retirado = bolsas y entregas + lo que se deja (sin la carne, que va por pieza).
   Cero errores de consola. Cada toque comprueba que debajo del dedo esté el botón (elementFromPoint). */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', MODO = process.env.MODO || 'real';
const ANCHOS = String(process.env.ANCHOS || '390,1440').split(',').map(Number), OUT = process.env.OUT || '';
const USUARIO_R = { v: process.env.USUARIO || 'luqui' };
let ok = 0, mal = 0;
const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d).slice(0, 600))); return !!c; };
const T = (ms) => new Promise((r) => setTimeout(r, ms));

/* El viernes de PRUEBA: Rep A (2 pedidos: Moresco + Ustariz + proveedor + carne), Rep B (1 pedido, proveedor), un Home. */
function fixture(dia) {
  const it = (a, nom, q, deps, provs, pieza) => ({ a, nom, q, pieza: !!pieza, deps: deps || {}, provs: provs || [], falta: 0 });
  return { ok: true, dia, hoy: dia,
    depositos: { moresco: { nom: 'Deposito Moresco', de: 'Lucas Moresco', usuario: 'luqui' }, ustariz: { nom: 'Deposito Ustariz', de: 'Tadeo Ustariz', usuario: 'tadeo' } },
    capacidad: { moresco: null, ustariz: null },
    pedidos: [
      { k: 'Red|990001', h: 'Red', n: '990001', r: -990001, c: 'PRUEBA Cliente Uno', quien: 'PRUEBA Rep A', red: true, dada: false, ent: false, lote: '', barrio: '', reparte: '',
        items: [it('ECaC', 'Empanadas Carne a Cuchillo x8', 2, { moresco: 2 }), it('PMa', 'Pizza Margarita', 1, { ustariz: 1 }),
                it('TJyQ', 'Tarta Jamón y Queso', 3, {}, [{ prov: 'PRUEBA Proveedor', oc: 'OC-PR1', q: 3, cli: false }]),
                it('CLo', 'Carne Lomo', 1.5, { ustariz: 1.5 }, [], true)],
        pz: [{ id: 'P-PR01', a: 'CLo', corte: 'Carne Lomo', kg: 1.5, dep: 'ustariz' }] },
      { k: 'Red|990002', h: 'Red', n: '990002', r: -990002, c: 'PRUEBA Cliente Dos', quien: 'PRUEBA Rep A', red: true, dada: false, ent: false, lote: '', barrio: '', reparte: '',
        items: [it('TJyQ', 'Tarta Jamón y Queso', 1, { ustariz: 1 }), it('SCo', 'Sorrentinos Cordero al Malbec', 1, {}, [{ prov: 'PRUEBA Proveedor', oc: 'OC-PR2', q: 1, cli: true }])], pz: [] },
      { k: 'Red|990003', h: 'Red', n: '990003', r: -990003, c: 'PRUEBA Cliente Tres', quien: 'PRUEBA Rep B', red: true, dada: false, ent: false, lote: '', barrio: '', reparte: '',
        items: [it('TJyQ', 'Tarta Jamón y Queso', 2, {}, [{ prov: 'PRUEBA Proveedor', oc: 'OC-PR1', q: 2, cli: false }])], pz: [] },
      /* (879) Igual al Red #2590: el representante lo marco entregado SIN la bolsa. Tiene que seguir en la bolsa. */
      { k: 'Red|990005', h: 'Red', n: '990005', r: -990005, c: 'PRUEBA Cliente Cinco', quien: 'PRUEBA Rep B', red: true, dada: false, ent: true, lote: '', barrio: '', reparte: '',
        items: [it('TP', 'Tarta Pollo', 3, { ustariz: 3 }), it('TV', 'Tarta Verdura', 2, { moresco: 2 })], pz: [] },
      { k: 'Home|990004', h: 'Home', n: '990004', r: -990004, c: 'PRUEBA Robot', quien: 'Estancias del Pilar', red: false, dada: false, ent: false, lote: '9', barrio: 'Estancias del Pilar', reparte: '',
        items: [it('PMa', 'Pizza Margarita', 2, { ustariz: 2 })], pz: [] }],
    provs: [{ prov: 'PRUEBA Proveedor', total: 100000, lineas: [
      { oc: 'OC-PR1', a: 'TJyQ', nom: 'Tarta Jamón y Queso', q: 12, est: 'Pedido', cli: false, destino: 'ustariz', llega: dia, para: [{ k: 'Red|990001', q: 3 }, { k: 'Red|990003', q: 2 }] },
      { oc: 'OC-PR2', a: 'SCo', nom: 'Sorrentinos Cordero al Malbec', q: 1, est: 'Pedido', cli: true, destino: '', llega: null, para: [{ k: 'Red|990002', q: 1 }] }] },
      /* (892) Ya recibido y con más de lo pedido: la OC era de 11 y llegaron 16 ($9.200 c/u). El estimado va con lo que llegó. */
      { prov: 'PRUEBA Recibido', total: 147200, lineas: [
      { oc: 'OC-PR3', a: 'PPM', nom: 'Pack Muzzarella x2', q: 16, est: 'Recibido', rec: true, total: 147200, cli: false, destino: 'ustariz', llega: dia, para: [] }] }] };
}

/* Las tres verificaciones, sobre lo que la pantalla armó (`_mvPasos`) y los datos que trajo. */
async function verificar(pg, cuando) {
  const v = await pg.evaluate(() => {
    const d = _mv.d, ps = _mvPasos(d), out = { origen: [], bolsas: [], cuadre: null };
    ps.forEach((p) => {
      if (p.tipo === 'dep') p.filas.forEach((f) => { if (!(f.q > 0)) out.origen.push(p.id + ' ' + f.nom + ' sin cantidad'); });
      if (p.tipo === 'bolsa') p.filas.forEach((f) => {
        const partes = Object.keys(f.de).reduce((a, o) => a + f.de[o], 0) + (f.falta || 0);
        if (Math.abs(partes - f.q) > 0.001) out.origen.push(p.rep + ' · ' + f.nom + ': ' + f.q + ' ≠ partes ' + partes);
      });
    });
    d.pedidos.forEach((p) => (p.items || []).forEach((it) => {
      const dep = Object.keys(it.deps || {}).reduce((a, k) => a + Number(it.deps[k]), 0), pr = (it.provs || []).reduce((a, x) => a + Number(x.q), 0);
      if (Math.abs(dep + pr + Number(it.falta || 0) - Number(it.q)) > 0.001) out.origen.push(p.k + ' ' + it.a + ': ' + it.q + ' ≠ ' + dep + '+' + pr + '+' + it.falta);
      (it.provs || []).forEach((x) => { if (!x.prov) out.origen.push(p.k + ' ' + it.a + ': una parte de OC sin proveedor'); });
    }));
    /* (2) cada bolsa = la suma de sus pedidos, producto por producto */
    ps.filter((p) => p.tipo === 'bolsa').forEach((p) => {
      const sum = {}; p.peds.forEach((x) => (x.items || []).forEach((it) => { sum[it.a] = (sum[it.a] || 0) + Number(it.q); }));
      const bol = {}; p.filas.forEach((f) => { bol[f.a] = f.q; });
      Object.keys(sum).concat(Object.keys(bol)).forEach((a) => { if (Math.abs((sum[a] || 0) - (bol[a] || 0)) > 0.001) out.bolsas.push(p.rep + ' ' + a + ': pedidos ' + (sum[a] || 0) + ' bolsa ' + (bol[a] || 0)); });
    });
    const fin = ps[ps.length - 1]; out.cuadre = fin.cuadre;
    out.cuadreTexto = /cierra/.test(document.querySelector('.mv-cuadre') ? document.querySelector('.mv-cuadre').textContent : 'cierra');
    out.pasos = ps.map((p) => p.tipo + ':' + (p.dep || p.prov || p.rep || p.id));
    return out;
  });
  chk(cuando + ': cada parte de cada renglón tiene un origen (' + v.pasos.length + ' pasos)', !v.origen.length, v.origen);
  chk(cuando + ': cada bolsa cierra contra sus pedidos', !v.bolsas.length, v.bolsas);
  const c = v.cuadre;
  chk(cuando + ': salió ' + c.salio + ' + retirado ' + c.retiro + ' = bolsas ' + c.bolsas + ' + dejás ' + c.dejas, Math.abs(c.salio + c.retiro - c.bolsas - c.dejas) < 0.01, c);
  return v;
}
/* Un toque con el dedo, comprobando que no haya nada encima. */
async function tocar(pg, sel, i) {
  const loc = pg.locator(sel).nth(i || 0);
  if (!(await loc.count())) return { ok: false, motivo: 'no está ' + sel };
  await pg.evaluate(([s, i]) => { const el = document.querySelectorAll(s)[i]; if (el) el.scrollIntoView({ block: 'center' }); }, [sel, i || 0]);
  await T(150);
  const b = await loc.boundingBox(); if (!b) return { ok: false, motivo: 'sin caja ' + sel };
  const x = b.x + b.width / 2, y = b.y + Math.min(b.height / 2, 30);
  const tapa = await pg.evaluate(([s, i, x, y]) => { const el = document.querySelectorAll(s)[i]; const top = document.elementFromPoint(x, y); return el && top && (el === top || el.contains(top)) ? '' : (top ? (top.className || top.tagName) : 'nada'); }, [sel, i || 0, x, y]);
  if (tapa) return { ok: false, motivo: 'tapado por ' + String(tapa).slice(0, 60) };
  if (pg.__movil) await pg.touchscreen.tap(x, y); else await pg.mouse.click(x, y);
  await T(250);
  return { ok: true };
}

/* Sin SBSES (el robot nocturno de GitHub): entra como el ERP, con el usuario y PIN del robot (`login_pin` + la clave
   interna), y la sesión va a un archivo temporal para la guarda de solo lectura. */
async function sesionRobot() {
  const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
  let u = process.env.ROBOT_USUARIO, pin = process.env.ROBOT_PIN;
  if (!u || !pin) { try { const j = JSON.parse(fs.readFileSync(path.join(require('os').homedir(), '.maleu', 'robot.json'), 'utf8')); u = j.usuario; pin = String(j.pin); } catch (e) {} }
  if (!u || !pin) throw new Error('sin SBSES ni credenciales del robot');
  const H = { apikey: PUB, Authorization: 'Bearer ' + PUB, 'Content-Type': 'application/json' };
  const lp = await (await fetch(SB + '/rest/v1/rpc/login_pin', { method: 'POST', headers: H, body: JSON.stringify({ p_usuario: u, p_pin: pin }) })).json();
  if (!lp || !lp.ok) throw new Error('login_pin: ' + JSON.stringify(lp).slice(0, 120));
  const t = await (await fetch(SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: PUB, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: lp.email, password: lp.clave }) })).json();
  if (!t || !t.access_token) throw new Error('token: ' + JSON.stringify(t).slice(0, 120));
  const f = path.join(require('os').tmpdir(), 'mv_ses_' + Date.now() + '.json');
  fs.writeFileSync(f, JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, usuario: lp.usuario || u }));
  return { f, u: lp.usuario || u };
}

(async () => {
  if (!process.env.SBSES) { const s = await sesionRobot(); process.env.SBSES = s.f; if (!process.env.USUARIO) USUARIO_R.v = s.u; }
  const br = await pw.chromium.launch();
  const dia = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  for (const ancho of ANCHOS) {
    const movil = ancho < 500;
    console.log('\n=== Mi viernes · ' + MODO + ' · ' + ancho + 'px ===');
    const ctx = await br.newContext(Object.assign({ timezoneId: 'America/Argentina/Buenos_Aires' },
      movil ? { viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: ancho, height: 900 } }));
    await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:${JSON.stringify(USUARIO_R.v)},rol:'admin',nombre:'Lucas Moresco',ts:Date.now()}));}catch(e){}
      window.__confirms=[]; window.confirm=function(m){window.__confirms.push(String(m).slice(0,160));return true;}; window.alert=function(m){window.__confirms.push('ALERT '+String(m).slice(0,160));};
      try{ Object.defineProperty(window.navigator,'standalone',{get:function(){return true;}}); }catch(e){}` + sbses(process.env.SBSES, USUARIO_R.v));
    if (MODO === 'prueba') {
      await ctx.route(/\/rest\/v1\/rpc\/mi_viernes_pantalla/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(dia)) }));
      /* Los mismos pedidos PRUEBA en Ruta, para que «Le di la bolsa» los encuentre (`findByKey`). La escritura la corta la guarda. */
      await ctx.route(/\/rest\/v1\/rpc\/ruta_entregas_pantalla/, async (r) => {
        let j = {}; try { const res = await r.fetch(); j = await res.json(); } catch (e) {}
        const F = fixture(dia); j.e = (Array.isArray(j.e) ? j.e : []).concat(F.pedidos.filter((p) => p.red).map((p) => ({
          h: 'Red', r: p.r, id: Number(p.n), c: p.c, b: p.quien, sb: p.quien, fe: dia, de: 'Viernes', es: 'Pendiente', ep: 'No Cobrado', o: 'Deposito',
          p: p.items.map((it) => ({ a: it.a, q: it.q })), oD: {}, pz: p.pz.map((z) => ({ a: z.a, id: z.id, kg: z.kg })), $: 0, t: '5490000000002' })));
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(j) });
      });
    }
    const pg = await ctx.newPage(); pg.__movil = movil;
    const err = []; pg.on('pageerror', (e) => err.push(String(e.message).slice(0, 200)));
    pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|cortado por la prueba/.test(m.text())) err.push('consola: ' + m.text().slice(0, 200)); });
    await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.go === 'function', null, { timeout: 90000 });
    await T(2500);
    await pg.evaluate(() => { try { Object.keys(localStorage).forEach((k) => { if (/^mv_/.test(k)) localStorage.removeItem(k); }); } catch (e) {} go('ruta'); });
    await pg.waitForFunction(() => typeof window.switchTab === 'function' && document.getElementById('viernesView'), null, { timeout: 90000 }).catch(() => {});
    await T(2000);
    const tab = await tocar(pg, '.tab[data-tab="viernes"]');
    chk('la tab VIERNES se toca', tab.ok, tab);
    await pg.waitForFunction(() => document.querySelector('#mvBody .mv-paso'), null, { timeout: 60000 }).catch(() => {});
    const n = await pg.evaluate(() => (_mv.d ? _mvPasos(_mv.d).length : 0));
    if (!chk('arma el recorrido (' + n + ' pasos)', n > 1, await pg.evaluate(() => (document.getElementById('mvBody') || {}).textContent))) { await ctx.close(); continue; }
    await verificar(pg, 'al abrir');
    const enviados = [];
    for (let i = 0; i < n; i++) {
      const P = await pg.evaluate(() => { const ps = _mvPasos(_mv.d), i = _mvPaso(_mv.d.dia, ps.length), P = ps[i]; return { i, tipo: P.tipo, t: P.t, filas: P.filas.length, dada: !!P.dada, rep: P.rep, prov: P.prov, recs: (P.provs || []).filter((v) => !v.rec).map((v) => v.prov) }; });
      chk('paso ' + (i + 1) + ' «' + P.t + '» se ve el título grande', await pg.evaluate((t) => (document.querySelector('.mv-donde h2') || {}).textContent === t, P.t));
      if (OUT && (i === 0 || P.tipo === 'bolsa')) await pg.screenshot({ path: path.join(OUT, 'mi_viernes_' + MODO + '_' + ancho + '_paso' + (i + 1) + '.png'), fullPage: false });
      if (P.tipo === 'dep' || P.tipo === 'prov') {
        const filas = await pg.locator('.mv-paso li.mv-f[role="checkbox"]').count();
        for (let j = 0; j < filas; j++) {
          const ya = await pg.locator('.mv-paso li.mv-f[role="checkbox"]').nth(j).getAttribute('aria-checked');
          if (ya === 'true') continue;
          const r = await tocar(pg, '.mv-paso li.mv-f[role="checkbox"]', j);
          if (!r.ok) { chk('paso ' + (i + 1) + ' renglón ' + (j + 1) + ' se toca', false, r); continue; }
        }
        const t = await pg.evaluate(() => [].map.call(document.querySelectorAll('.mv-paso li.mv-f[role="checkbox"]'), (x) => x.getAttribute('aria-checked')));
        chk('paso ' + (i + 1) + ': los ' + t.length + ' renglones quedaron tildados', t.every((x) => x === 'true'), t);
        /* (892) «Pagás al retirar»: el total del proveedor; recibido entero, «con lo que llegó» (no «estimado»). */
        if (P.tipo === 'prov') {
          const pg2 = await pg.evaluate((prov) => { const v = (_mv.d.provs || []).find((x) => x.prov === prov) || {}; const ls = v.lineas || [];
            const e = document.querySelector('.mv-paso .mv-pagar'); return { txt: e ? e.textContent : '', total: Number(v.total) || 0,
              todo: ls.length > 0 && ls.every((l) => l.rec) }; }, P.prov);
          const monto = pg2.total ? String(pg2.total).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
          if (pg2.total) chk('paso ' + (i + 1) + ': «Pagás al retirar» de ' + P.prov + ' dice $' + monto + (pg2.todo ? ', con lo que llegó' : ' (estimado)'),
            pg2.txt.indexOf(monto) >= 0 && (pg2.todo ? /con lo que lleg/.test(pg2.txt) && !/estimado/.test(pg2.txt) : /estimado/.test(pg2.txt)), pg2);
        }
      }
      if (P.tipo === 'bolsa' && !P.dada) {
        const antes = await pg.evaluate(() => ({ q: (window.syncQueue || []).length, b: (window.__bloqueados || []).length }));
        const r = await tocar(pg, '.mv-paso .mv-dar');
        chk('paso ' + (i + 1) + ': «Le di la bolsa a …» se toca', r.ok, r);
        await T(1500);
        /* La carne pregunta pieza por pieza: va todo. */
        /* La carne pregunta pieza por pieza (`_rutCarneBolsaAbrir`): cada una «Va», con el dedo, y después confirmar. */
        const nVa = await pg.evaluate(() => { const o = document.getElementById('confirmOverlay'); if (!o || o.classList.contains('hidden') || !o.getClientRects().length || getComputedStyle(o).display === 'none') return 0;
          return [].filter.call(o.querySelectorAll('.rcb-b'), (b) => b.textContent.trim() === 'Va').length; });
        if (nVa) {
          for (let k = 0; k < nVa; k++) {
            const idx = await pg.evaluate(() => [].findIndex.call(document.querySelectorAll('#confirmOverlay .rcb-b'), (b) => b.textContent.trim() === 'Va' && !b.classList.contains('on')));
            if (idx < 0) break;
            const rv = await tocar(pg, '#confirmOverlay .rcb-b', idx); if (!rv.ok) break;
          }
          const rs = await tocar(pg, '#confirmOverlay .btn-si');
          chk('paso ' + (i + 1) + ': la carne de la bolsa — ' + nVa + ' pieza(s) «Va» y confirmar', rs.ok, rs);
          await T(1200);
        }
        const des = await pg.evaluate((a) => {
          const q = (window.syncQueue || []).slice(a.q).map((x) => ({ action: x.action, rows: x.rows, vendedor: x.vendedor }));
          const b = (window.__bloqueados || []).slice(a.b).filter((x) => /bolsa|Entregado/i.test(x));
          return { q, b, alertas: (window.__confirms || []).filter((m) => /^ALERT/.test(m)) };
        }, antes);
        const env = des.q.filter((x) => x.action === 'marcarEntregadoAVendedor');
        chk('paso ' + (i + 1) + ': la bolsa de ' + P.rep + ' sale (marcarEntregadoAVendedor, sin «Faltan productos de OC»)', env.length === 1 && !des.alertas.some((m) => /Faltan/.test(m)), des);
        if (env.length) enviados.push({ rep: P.rep, rows: env[0].rows });
        /* (879) Lo que el representante ya marco entregado sin la bolsa va igual, y se avisa. */
        const yaEnt = await pg.evaluate((rep) => (_mv.d.pedidos || []).filter((p) => p.red && p.quien === rep && p.ent && !p.dada).map((p) => p.r), P.rep);
        if (yaEnt.length) {
          const av = await pg.evaluate(() => [].map.call(document.querySelectorAll('.mv-paso .mv-aviso'), (x) => x.textContent).join(' | '));
          chk('paso ' + (i + 1) + ': avisa que ' + P.rep + ' ya marco entregado ' + yaEnt.length + ' sin la bolsa', /ya lo marc|ya los marc/.test(av), av);
          const filas = String((env[0] && env[0].rows) || '');
          chk('paso ' + (i + 1) + ': esos pedidos van en la bolsa (' + yaEnt.join(',') + ')', yaEnt.every((r) => filas.split(',').map(Number).indexOf(Number(r)) >= 0 || filas.indexOf(String(r)) >= 0), { filas, yaEnt });
        }
      }
      if (i === n - 1) {
        await verificar(pg, 'en el paso final');
        const recibir = await pg.locator('.mv-paso button', { hasText: 'Recibir de' }).count();
        chk('paso final: un «Recibir de …» por proveedor sin recibir (' + recibir + ')', recibir === P.recs.length, P.recs);
        if (OUT) await pg.screenshot({ path: path.join(OUT, 'mi_viernes_' + MODO + '_' + ancho + '_final.png'), fullPage: true });
        if (recibir) {
          const prov = await pg.locator('.mv-paso button', { hasText: 'Recibir de' }).first().textContent();
          const r = await tocar(pg, '.mv-paso button.mv-full', 0);
          chk('«' + prov.trim() + '» se toca', r.ok, r);
          const sel = await pg.waitForFunction(() => { const b = document.querySelector('#pg-abast .hj-prov.on, #pg-abast .hj h3, #pg-abast #recibirList'); return b && b.getClientRects().length ? (document.querySelector('#pg-abast .hj-prov.on') || {}).textContent || 'abierta' : null; }, null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
          chk('lleva a Compras › Recibir con ese proveedor (' + sel + ')', !!sel && (MODO === 'prueba' || prov.indexOf(String(sel).split(' · ')[0].trim()) >= 0), sel);   /* (27/11, 878) el botón dice «· llega hoy» */
        }
      } else {
        const r = await tocar(pg, '.mv-pie .mv-sig');
        chk('paso ' + (i + 1) + ': el botón de abajo pasa al siguiente', r.ok && await pg.evaluate((i) => _mvPaso(_mv.d.dia, 99) === i + 1, i), r);
      }
    }
    if (MODO === 'prueba') chk('se dieron las 2 bolsas de PRUEBA (Rep A con 2 pedidos, Rep B con 2: uno ya marcado entregado sin la bolsa, 879)', enviados.length === 2 && enviados.some((e) => /Rep A/.test(e.rep) && e.rows.length === 2) && enviados.some((e) => /Rep B/.test(e.rep) && e.rows.length === 2), enviados);
    chk('cero errores de consola', err.length === 0, err);
    await ctx.close();
  }
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
