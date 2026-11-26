'use strict';
// Uso: S=<scratchpad con q.py y ses_tadeo|luqui|santos.json de sesion_prueba.py> PW=<playwright-core 1.62.1> BASE=http://localhost:8155/app.html
//      node _tools/pruebas/probar_tandas.js   (antes: tandas_fixture.py sembrar; después: borrar y sesion_prueba.py borrar)
// Las tandas (804) de punta a punta con los TRES usuarios (tadeo dueño, luqui admin/bodega, santos equipo), WebKit 390 con
// touch, sin service worker. Día de prueba 2099-01-08 con pedidos PRUEBA (tandas_fixture.py). Solo pasan las escrituras
// del reparto (reparto_cuadre_*) y las lecturas; todo lo demás se corta.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const pw = require(process.env.PW);
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const S = process.env.S, OUT = path.join(S, 'cap_tandas'), BASE = process.env.BASE, DIA = '2099-01-08';
const FIX = process.env.FIX || path.join(__dirname, '../../../estancias/scripts/migraciones/tandas_fixture.py');
fs.mkdirSync(OUT, { recursive: true });
let ok = 0, mal = 0; const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d ? ' → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const fixture = (...a) => execFileSync('python', [FIX, ...a], { env: Object.assign({}, process.env, { QPY: S }) }).toString();
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const bloq = [];
async function abrir(br, usuario, rol, ses, W) {
  const j = JSON.parse(fs.readFileSync(path.join(S, ses), 'utf8'));
  const cel = W < 600;
  const ctx = await br.newContext(Object.assign({ serviceWorkers: 'block' }, cel ? { viewport: { width: W, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: W, height: 900 } }));
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'${usuario}',rol:'${rol}',ts:Date.now(),dueno:${usuario === 'tadeo'}}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: usuario, url: SB, key: PUB, access: j.access_token, refresh: j.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}`);
  await ctx.route(/script\.google\.com|\/rest\/v1\//, (r) => {
    const u = r.request().url(), m = r.request().method();
    if (m !== 'POST') return r.continue();
    if (/\/rpc\/(reparto_cuadre_[a-z]+|[a-z0-9_]*_pantalla|permiso_base|tienda_vendedores|mi_deposito[a-z_]*|en_vuelo[a-z_]*)$/.test(u.split('?')[0])) return r.continue();
    if (/script\.google/.test(u)) { const b = r.request().postData() || ''; if (/"action":"(busqueda|catalogo|[a-z]*Light|admin|ruta[a-zA-Z]*)"/.test(b) || !/"action"/.test(b)) return r.continue(); }
    bloq.push(usuario + ' ' + u.split('/').pop().slice(0, 40)); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false,"err":"cortado por la prueba"}' });
  });
  const pg = await ctx.newPage(); pg._errs = []; pg.on('pageerror', (e) => pg._errs.push(String(e)));
  await pg.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(9000);
  await pg.evaluate(() => go('ruta')); await pg.waitForTimeout(5000);
  await pg.evaluate(() => { const t = document.querySelector('#pg-ruta .tab[data-tab="armado"]') || document.querySelector('.tab[data-tab="armado"]'); t && t.click(); }); await pg.waitForTimeout(4000);
  await pg.evaluate((d) => rutCuadreDia(d), DIA); await pg.waitForTimeout(3500);
  pg._u = usuario; return { ctx, pg };
}
const datos = (pg) => pg.evaluate(() => { const d = rutCuadreDatos(); return { estado: d.cu && d.cu.estado, tanda: d.cu && d.cu.actual && d.cu.actual.tanda, rep: d.cu && d.cu.repartidor, err: d.cu && d.cu.err,
  libres: ((d.cu && d.cu.actual && d.cu.actual.libres) || []).map((b) => b.k), her: ((d.cu && d.cu.actual && d.cu.actual.heredadas) || []).map((b) => b.k),
  tandas: ((d.cu && d.cu.tandas) || []).map((t) => t.tanda + ':' + t.diferencia), nuevos: ((d.cu && d.cu.nuevos) || []).map((x) => x.k), proxima: (d.cu && d.cu.proxima) || [],
  orden: d.orden && { tot: d.orden.tot, grupos: d.orden.grupos.map((g) => g.depNom + '/' + g.cat + ': ' + g.filas.map((f) => f.sku + (f.pz.length ? ' ' + f.pz.map((p) => p.id).join('+') : ' ' + f.q + (f.an ? '+' + f.an : ''))).join(', ')) },
  cuenta: d.cuenta && { sinDec: d.cuenta.sinDec.length, mal: d.cuenta.mal.map((l) => l.sku + ' ' + l.dif) } }; });
const texto = (pg) => pg.evaluate(() => (document.getElementById('rutCuadre') || {}).innerText || '');
const recargar = async (pg) => { await pg.evaluate(() => { rutCuadrePedir(true); }); await pg.waitForTimeout(3500); };
const shot = async (pg, n) => { const c = pg.locator('#rutCuadre .rcu').first(); await c.scrollIntoViewIfNeeded().catch(() => {}); await c.screenshot({ path: path.join(OUT, n + '.png') }).catch((e) => console.log('captura', n, String(e).slice(0, 80))); };
const tocar = async (pg, sel, txt) => { const l = txt ? pg.locator(sel, { hasText: txt }).first() : pg.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.tap(); await pg.waitForTimeout(500); };
const bolsa = (pg, cli) => tocar(pg, '#rutCuadre label.rcu-bol', cli);
const decidir = (pg, cli, que) => tocar(pg, '#rutCuadre .rcu-bv:has-text("' + cli + '") .rcu-bvb button', que);
const mandar = async (pg, txt) => { await tocar(pg, '#rutCuadre .rcu-acc button', txt); await pg.waitForTimeout(5000); };

(async () => {
  const br = await pw.webkit.launch();
  const W = 390;
  const T = await abrir(br, 'tadeo', 'admin', 'ses_tadeo.json', W);
  const N = await abrir(br, 'santos', 'equipo', 'ses_santos.json', W);
  const L = await abrir(br, 'luqui', 'admin', 'ses_luqui.json', W);
  let d;
  console.log('— 1. Tadeo carga la tanda 1 (A y B)');
  d = await datos(T.pg); chk('Tadeo ve tanda 1 sin salir con 3 bolsas libres', d.estado === 'sin_salir' && d.tanda === 1 && d.libres.length === 3, d);
  chk('nada tildado de entrada (sin nombre)', !(await datos(T.pg)).orden || (await datos(T.pg)).orden.grupos.length === 0, d.orden);
  await bolsa(T.pg, 'Tanda A'); await bolsa(T.pg, 'Tanda B');
  d = await datos(T.pg); const tx = await texto(T.pg);
  chk('orden de carga: depósito y categoría, la carne por pieza', d.orden && d.orden.grupos.some((g) => /PRUEBA\/Carnes: .*CAB P-R91A2\+P-R91A1/.test(g)) && /Asado Banderita · 2 piezas/.test(tx) && /P-R91A1\s+2,146 kg/.test(tx), { o: d.orden, tx: tx.slice(tx.indexOf('ORDEN'), tx.indexOf('ORDEN') + 400) });
  chk('total «Sale: 2 piezas · 5 u.»', /Sale: 2 piezas · 5 u\./.test(tx), tx.slice(-300));
  chk('sin la tabla de kg', !(await T.pg.$('#rutCuadre table')), '');
  await shot(T.pg, '01_tadeo_orden_de_carga');
  await mandar(T.pg, 'Salgo con esto');
  d = await datos(T.pg); chk('Tadeo en la calle (tanda 1)', d.estado === 'salio' && d.tanda === 1, d);
  await shot(T.pg, '02_tadeo_en_la_calle');

  console.log('— 2. Santos (equipo) carga la tanda 1 suya: solo le queda C');
  await recargar(N.pg); d = await datos(N.pg);
  chk('Santos ve solo C (A y B ya las cargó Tadeo)', d.rep === 'Santos Bullrich' && d.libres.length === 1 && d.libres[0] === 'Home|R9103', d);
  await bolsa(N.pg, 'Tanda C');
  await tocar(N.pg, '#rutCuadre .rcu-mas button[aria-label^="Uno más"]'); await tocar(N.pg, '#rutCuadre .rcu-mas button[aria-label^="Uno más"]');
  const tn = await texto(N.pg); chk('Santos: «2 piezas» de Entraña y la Morcilla con 2 de más', /Entraña · 2 piezas/.test(tn) && /armado 1 \+ de más 2/.test(tn), tn.slice(0, 600));
  await shot(N.pg, '03_santos_orden_de_carga');
  await mandar(N.pg, 'Salgo con esto'); d = await datos(N.pg); chk('Santos en la calle', d.estado === 'salio', d);

  console.log('— 3. Entra D para el día con los dos en la calle');
  fixture('nuevo');
  await recargar(T.pg); d = await datos(T.pg);
  chk('Tadeo (afuera) ve el aviso del pedido nuevo', d.nuevos.includes('Home|R9104') && /Entró un pedido para hoy/.test(await texto(T.pg)), d);
  chk('«proxima» trae D', d.proxima.includes('Home|R9104'), d.proxima);
  await shot(T.pg, '04_tadeo_entro_un_pedido');
  await T.pg.evaluate(() => { try { _rutArmadoListaSola(); } catch (e) {} }); await T.pg.waitForTimeout(800);
  /* Ruta no trae pedidos PRUEBA de 2099 (bien: nadie de verdad los ve). El chip se prueba sobre un pedido real de la lista,
     marcando su clave como «próxima tanda» solo en este navegador (no se escribe nada). */
  const chip = await T.pg.evaluate(() => { const p = getPendientes()[0]; if (!p) return { sin: 1 }; const cu = rutCuadreDatos().cu; cu.proxima = (cu.proxima || []).concat([p.h + '|' + p.id]);
    const dk = 'dia:' + entregaKey(p); const c = getArmadoCollapse(); c[dk] = false; saveArmadoCollapse(c); _rutArmadoListaSola();
    return { k: p.h + '|' + p.id, chips: [].map.call(document.querySelectorAll('#armadoList .arm-tanda'), (x) => x.textContent) }; });
  chk('Armado: «Para la próxima tanda · Santos y Tadeo están en la calle»', (chip.chips || []).some((t) => /^Para la próxima tanda · .* en la calle/.test(t)), chip);
  await T.pg.locator('#armadoList .arm-tanda').first().scrollIntoViewIfNeeded().catch(() => {});
  await T.pg.locator('#armadoList .arm-tanda').first().evaluate((el) => el.closest('.armado-card').scrollIntoView({ block: 'center' })).catch(() => {});
  await T.pg.screenshot({ path: path.join(OUT, '04b_armado_proxima_tanda.png') });
  const av = await L.pg.evaluate(() => _baseRpc('avisos_erp_pantalla', {}).then((r) => (r.avisos || []).map((a) => a.titulo)));
  chk('campanita de bodega (Lucas): «Entró un pedido … en la calle»', av.some((t) => /Entró un pedido para el 08\/01 con .* en la calle/.test(t)), av);

  console.log('— 4. A entregada; Tadeo vuelve: B sigue en el auto; cierra en 0; tanda 2 con B sola + D');
  fixture('entregar', 'R9101', 'Tadeo Ustariz');
  await recargar(T.pg);
  chk('sin decidir B: «Falta decir qué pasó» y el botón apagado', /Falta decir qué pasó con 1 bolsa/.test(await texto(T.pg)) && await T.pg.locator('#rutCuadre .rcu-acc button', { hasText: 'Cerrar la tanda' }).isDisabled(), '');
  chk('sin decidir, «Lo de más» no aparece (lo de las bolsas no es suelto)', !/Lo de más/i.test(await texto(T.pg)), (await texto(T.pg)).slice(-400));
  await decidir(T.pg, 'Tanda B', 'Sigue en el auto');
  chk('preview: cierra en 0', /Así como está, cierra en 0/.test(await texto(T.pg)), (await datos(T.pg)).cuenta);
  await shot(T.pg, '05_tadeo_vuelve_tanda1');
  await mandar(T.pg, 'Cerrar la tanda 1');
  d = await datos(T.pg); chk('tanda 1 cerrada en 0 y tanda 2 con B heredada', d.tandas.join() === '1:0' && d.tanda === 2 && d.her.join() === 'Home|R9102' && d.libres.includes('Home|R9104'), d);
  await bolsa(T.pg, 'Tanda D');
  await shot(T.pg, '06_tadeo_tanda2_orden');
  await mandar(T.pg, 'Salgo con esto'); d = await datos(T.pg); chk('tanda 2 en la calle', d.estado === 'salio' && d.tanda === 2, d);
  await mandar(T.pg, 'Cambiar la carga'); d = await datos(T.pg);
  chk('«Cambiar la carga»: la misma tanda 2 con D tildada y B fija', d.estado === 'sin_salir' && d.tanda === 2 && d.her.join() === 'Home|R9102' && /cambiá la carga/.test(await texto(T.pg)) && d.orden && d.orden.grupos.some((g) => /P-R91D1/.test(g)), d);
  await shot(T.pg, '06b_tadeo_cambiar_la_carga');
  await mandar(T.pg, 'No cambio nada'); d = await datos(T.pg); chk('«No cambio nada»: vuelve a la tanda 2 en la calle', d.estado === 'salio' && d.tanda === 2, d);
  await decidir(T.pg, 'Tanda B', 'Volvió al freezer'); await decidir(T.pg, 'Tanda D', 'Volvió al freezer');
  chk('D volvió sin tildar la pieza: no cierra (falta tildar P-R91D1)', /falta tildar P-R91D1/.test(await texto(T.pg)), (await datos(T.pg)).cuenta);
  await tocar(T.pg, '#rutCuadre label.rcu-pzc', 'P-R91D1');
  chk('con la pieza tildada: cierra en 0', /cierra en 0/.test(await texto(T.pg)), (await datos(T.pg)).cuenta);
  await shot(T.pg, '07_tadeo_tanda2_vuelve');
  await mandar(T.pg, 'Cerrar la tanda 2');
  d = await datos(T.pg); chk('Tadeo: dos tandas cerradas en 0', d.tandas.join() === '1:0,2:0', d);
  await shot(T.pg, '08_tadeo_dos_tandas');

  console.log('— 5. Santos vuelve: C volvió con 1 de 2 piezas, cuenta la Morcilla → no cierra');
  await recargar(N.pg);
  await decidir(N.pg, 'Tanda C', 'Volvió al freezer');
  await tocar(N.pg, '#rutCuadre label.rcu-pzc', 'P-R91C1');
  await tocar(N.pg, '#rutCuadre .rcu-r button[aria-label^="Uno más de Morcilla"]'); await tocar(N.pg, '#rutCuadre .rcu-r button[aria-label^="Uno más de Morcilla"]');
  const tv = await texto(N.pg); chk('preview de Santos: no cierra, falta tildar P-R91C2', /no cierra/.test(tv) && /falta tildar P-R91C2/.test(tv), tv.slice(-500));
  await shot(N.pg, '09_santos_vuelve_no_cierra');
  await mandar(N.pg, 'Cerrar la tanda 1');
  d = await datos(N.pg); chk('Santos: tanda 1 cerrada con diferencia 1', d.tandas.join() === '1:1', d);
  await shot(N.pg, '10_santos_tanda_no_cerro');

  console.log('— 6. Lucas (bodega): la campanita y el reparto de Santos; Revisado');
  const av2 = await L.pg.evaluate(() => _baseRpc('avisos_erp_pantalla', {}).then((r) => (r.avisos || []).filter((a) => a.tipo === 'cuadre').map((a) => a.titulo + ' | ' + (a.lineas || []).join(' / '))));
  chk('campanita: «La tanda 1 de Santos del 08/01 no cerró» con P-R91C2', av2.some((t) => /La tanda 1 de Santos del 08\/01 no cerró.*P-R91C2/.test(t)), av2);
  await L.pg.evaluate(() => rutCuadreRep('Santos Bullrich')); await L.pg.waitForTimeout(3500);
  const tl = await texto(L.pg); chk('Lucas ve la tanda de Santos que no cerró', /no cerró/.test(tl) && /P-R91C2/.test(tl), tl.slice(0, 600));
  await shot(L.pg, '11_lucas_ve_a_santos');
  await mandar(L.pg, 'Revisado');
  const rv = await L.pg.evaluate(() => { const t = document.querySelector('#rutCuadre details.rcu-tc'); return t ? t.textContent : ''; });
  chk('Revisado por Lucas', /revisada/.test(rv) && /Revisado por luqui/.test(rv), rv.slice(0, 300));
  await shot(L.pg, '12_lucas_revisado');

  for (const P of [T, N, L]) chk(P.pg._u + ': 0 errores de página', P.pg._errs.length === 0, P.pg._errs);
  console.log('escrituras cortadas:', bloq.length, JSON.stringify(bloq.slice(0, 8)));
  for (const P of [T, N, L]) await P.ctx.close();
  // escritorio: lo mismo se ve bien a 1366
  const T2 = await abrir(br, 'tadeo', 'admin', 'ses_tadeo.json', 1366);
  await shot(T2.pg, '13_tadeo_1366'); await T2.ctx.close();
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
