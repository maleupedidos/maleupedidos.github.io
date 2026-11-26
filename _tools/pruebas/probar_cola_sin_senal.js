/* LO QUE QUEDA SIN GUARDAR EN RUTA (15/11/2026, 721). WebKit 390×844, sin backend (?prueba=1): toda escritura se intercepta.
 *
 *   node _tools/servir.js     (en otra terminal)
 *   PW=<playwright-core> [SESION=<ses.json de sesion_prueba.py, santos repartidor>] node _tools/pruebas/probar_cola_sin_senal.js
 *   (con SESION la pantalla es la de verdad y sirven las capturas; sin SESION, la lógica sola sobre ?prueba=1)
 *
 * Eugenia #2479: Lucas tocó Cobrar y Entregar a las 11:20 sin señal, iOS suspendió la app y la cola recién lo vio a las
 * 17:55 (más de 30 min): «No se pudo guardar», con la hora de la detección. Se prueba, con un pedido PRUEBA:
 *   1. sin señal el encabezado dice «Sin señal · N sin guardar»;
 *   2. con señal a los 5 min (al volver la app a primer plano) se manda sola, con el ts ORIGINAL;
 *   3. a los 40 min: el cartel dice «PRUEBA Cola · Cobro $1.000 por efectivo · lo marcaste hoy HH:MM» (la hora del toque),
 *      y «Reintentar» manda la operación ORIGINAL (mismo ts = mismo id en la base);
 *   4. si la base dice que ya estaba entregada y cobrada, sale sola: «PRUEBA Cola ya estaba entregada y cobrada en el sistema».
 */
'use strict';
const fs = require('fs'), os = require('os');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || (process.env.SESION ? 'http://localhost:8080/app.html' : 'http://localhost:8080/app.html?prueba=1');
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); } };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
/* Toda ESCRITURA queda anotada y contesta lo que diga window.__resp(accion): nada sale. Las lecturas (*_pantalla, *_datos,
   *_base, permiso_base) y la sesión pasan, para que la pantalla sea la de verdad. */
const INTERCEPTA = String.raw`(function(){var f=window.fetch;window.__posts=[];window.__resp=function(b){return {ok:true};};
  window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(),r=/\/rest\/v1\/rpc\/([a-z0-9_]+)/.exec(s);
    var lee=r&&/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$|^demanda_por_deposito$/.test(r[1]);
    if(m==='POST'&&!lee&&!/auth\/v1\/token/.test(s)){var b={};try{b=JSON.parse((x&&x.body)||'{}');}catch(e){} if(b&&b.p&&typeof b.p==='object')b=Object.assign({},b.p,{__rpc:r&&r[1]});
      if(r&&r[1]==='ruta_cobro_ya')b.action='cobroYa'; window.__posts.push(b);
      return Promise.resolve(new Response(JSON.stringify(window.__resp(b)),{status:200,headers:{'Content-Type':'application/json'}}));}
    return f.apply(this,arguments);};})();`;
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const SES = process.env.SESION ? JSON.parse(fs.readFileSync(process.env.SESION, 'utf8')) : null;
const SESJS = SES ? `try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'santos',rol:'repartidor',ts:Date.now()}));
  localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'santos', url: SB, key: PUB, access: SES.access_token, refresh: SES.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}` : '';
const PED = { h: 'Home', id: '99991', r: -99991, c: 'PRUEBA Cola', t: '1100000000', $: 1000, fp: 'Efectivo', ep: 'No Cobrado', es: 'Pendiente', fe: '' };
(async () => {
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(SESJS + INTERCEPTA + `try{localStorage.setItem('maleu_ruta_purge_v58',String(Date.now()));}catch(e){}`);
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 150)));
  const abrirRuta = async () => {
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.abrirTab === 'function', null, { timeout: 60000 });
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => { try { abrirTab('ruta'); } catch (e) {} });
    await pg.waitForFunction(() => typeof window.processSyncQueue === 'function' && typeof window._rutPintarBanner === 'function', null, { timeout: 60000 });
    await pg.waitForTimeout(1500);
  };
  try {
    await abrirRuta();
    const hoy = await pg.evaluate(() => getHoyISO());
    const ped = Object.assign({}, PED, { fe: hoy });
    console.log('\n== 1. Sin señal ==\n');
    await ctx.setOffline(true); await pg.waitForTimeout(300);
    await pg.evaluate((p) => { window.__posts = []; entregas.push(p); var k = eKey(p); cobrados[k] = true;
      syncQueue.push({ action: 'marcarCobrado', hoja: p.h, id: p.id, row: p.r, formaPago: 'Efectivo', ef: 1000, tr: 0, propina: 0, repartidor: 'PRUEBA', ts: Date.now() });
      _entregarCore(p); saveLocal(); _rutPintarBanner(); }, ped);
    const b1 = await pg.evaluate(() => ({ txt: (document.getElementById('syncBanner') || {}).textContent, n: syncQueue.length, posts: __posts.length }));
    chk('el encabezado dice «Sin señal · 2 cosas sin guardar · se manda sola cuando vuelva»', /Sin señal · 2 cosas sin guardar/.test(b1.txt || ''), b1);
    chk('no salió nada (sin señal)', b1.posts === 0, b1);
    await pg.evaluate(() => { const b = document.getElementById('syncBanner'); if (b) b.scrollIntoView({ block: 'center' }); });
    await pg.screenshot({ path: os.tmpdir() + '/cola_sin_senal_390.png' });
    console.log('\n== 2. Vuelve la señal a los 5 min, con la app volviendo a primer plano ==\n');
    const ts5 = await pg.evaluate(() => { const t = Date.now() - 5 * 60e3; syncQueue.forEach((x) => { x.ts = t; }); saveLocal(); return t; });
    await ctx.setOffline(false);
    await pg.evaluate(() => { isOnline = true; document.dispatchEvent(new Event('visibilitychange')); });
    await pg.waitForFunction(() => syncQueue.length === 0, null, { timeout: 20000 }).catch(() => {});
    const b2 = await pg.evaluate(() => ({ n: syncQueue.length, posts: __posts.map((x) => ({ a: x.action, ts: x.ts, id: x.id })) }));
    chk('se mandaron solas las dos (cobro y entrega)', b2.n === 0 && b2.posts.filter((x) => x.a === 'marcarCobrado' || x.a === 'marcarEntregado').length === 2, b2);
    chk('con el ts ORIGINAL del toque (mismo id en la base, la hora real)', b2.posts.filter((x) => x.a === 'marcarCobrado' || x.a === 'marcarEntregado').every((x) => Number(x.ts) === ts5), { ts5, posts: b2.posts });

    console.log('\n== 3. A los 40 min: el cartel con la hora del toque, y «Reintentar» manda la original ==\n');
    const ts40 = Date.now() - 40 * 60e3;
    await pg.evaluate(([p, t]) => { syncQueue.length = 0; rutSyncRechazados.length = 0;
      syncQueue.push({ action: 'marcarCobrado', hoja: p.h, id: p.id, row: p.r, cliente: p.c, formaPago: 'Efectivo', ef: 1000, tr: 0, propina: 0, repartidor: 'PRUEBA', ts: t });
      syncQueue.push({ action: 'marcarEntregado', hoja: p.h, id: p.id, row: p.r, cobrado: true, propina: 0, repartidor: 'PRUEBA', ts: t });
      saveLocal(); }, [ped, ts40]);
    /* Reabre la app (la regla de 30 min corre al cargar). La base todavía no lo tiene hecho. */
    await pg.addInitScript(`window.__resp=function(b){return b.action==='cobroYa'?{ok:true,cobrados:[],entregados:[]}:{ok:true};};`);
    await abrirRuta();
    await pg.waitForTimeout(2500);
    const hhmm = await pg.evaluate((t) => { const d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }, ts40);
    const c3 = await pg.evaluate(() => ({ rech: rutSyncRechazados.length, cola: syncQueue.length, banner: (document.getElementById('syncBanner') || {}).textContent }));
    chk('las dos pasaron a «No se pudo guardar» (más de 30 min, con plata: decide la persona)', c3.rech === 2 && c3.cola === 0, c3);
    await pg.evaluate(() => rutVerRechazados()); await pg.waitForTimeout(400);
    const txt = await pg.evaluate(() => Array.from(document.querySelectorAll('.rut-rech-tit')).map((e) => e.textContent));
    chk('el cartel dice «PRUEBA Cola · Cobro $1.000 por efectivo · lo marcaste hoy ' + hhmm + '»', txt.some((t) => /^PRUEBA Cola · Cobro \$\s?1\.000 por efectivo · lo marcaste hoy /.test(t) && t.indexOf(hhmm) >= 0), txt);
    chk('y la entrega: «PRUEBA Cola · Entrega (con el cobro) · lo marcaste hoy ' + hhmm + '»', txt.some((t) => /^PRUEBA Cola · Entrega \(con el cobro\) · lo marcaste hoy/.test(t) && t.indexOf(hhmm) >= 0), txt);
    await pg.screenshot({ path: os.tmpdir() + '/cola_cartel_390.png' });
    await pg.evaluate(() => { window.__posts = []; });
    await pg.evaluate(() => rutReintentarRechazado(0)); await pg.waitForTimeout(3000);
    const r3 = await pg.evaluate(() => __posts.filter((x) => x.action === 'marcarCobrado' || x.action === 'marcarEntregado').map((x) => ({ a: x.action, ts: x.ts })));
    chk('«Reintentar» manda la operación ORIGINAL (el ts del toque, no el de ahora)', r3.length >= 1 && r3.every((x) => Number(x.ts) === ts40), { ts40, r3 });

    console.log('\n== 4. Si ya estaba hecho en el sistema, sale sola ==\n');
    await pg.evaluate(([p, t]) => { syncQueue.length = 0; rutSyncRechazados.length = 0;
      syncQueue.push({ action: 'marcarCobrado', hoja: p.h, id: p.id, row: p.r, cliente: p.c, formaPago: 'Transferencia', ef: 0, tr: 1000, propina: 0, ts: t });
      syncQueue.push({ action: 'marcarEntregado', hoja: p.h, id: p.id, row: p.r, cobrado: true, propina: 0, ts: t }); saveLocal(); }, [ped, ts40]);
    await pg.addInitScript(`window.__resp=function(b){return b.action==='cobroYa'?{ok:true,cobrados:['Home|99991'],entregados:['Home|99991']}:{ok:true};};`);
    let toast = '';
    await abrirRuta();
    for (let i = 0; i < 20 && !toast; i++) { toast = await pg.evaluate(() => { const t = document.getElementById('rutToast'); return t ? t.textContent : ''; }); if (!/ya estaba/.test(toast)) toast = ''; await pg.waitForTimeout(300); }
    const c4 = await pg.evaluate(() => ({ rech: rutSyncRechazados.length, cola: syncQueue.length }));
    chk('las dos salieron solas (nunca dos veces)', c4.rech === 0 && c4.cola === 0, c4);
    chk('con una línea: «PRUEBA Cola ya estaba entregada y cobrada en el sistema»', /PRUEBA Cola ya estaba entregada y cobrada en el sistema/.test(toast), toast);
    const propios = errs.filter((e) => !/script\.google\.com/.test(e));   /* ?prueba=1 no tiene backend: esas lecturas fallan a propósito */
    chk('ni un error de la página', propios.length === 0, propios.slice(0, 3));
  } catch (e) { console.log('  reventó la prueba: ' + (e && e.stack || e)); mal++; }
  finally { await br.close(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n  capturas: ' + os.tmpdir() + '/cola_sin_senal_390.png · ' + os.tmpdir() + '/cola_cartel_390.png\n');
  process.exitCode = mal ? 1 : 0;
})();
