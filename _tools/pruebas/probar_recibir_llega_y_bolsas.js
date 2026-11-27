/* COMPRAS › RECIBIR Y «POR RECIBIR» DE RUTA: CUÁNDO LLEGA Y LAS BOLSAS DE RED (27/11/2026, 878).
     PW=<playwright-core> SBSES=<sesion_prueba.py de luqui/admin> BASE=<app.html> [ANCHOS=390,1440] node _tools/pruebas/probar_recibir_llega_y_bolsas.js
   Sesión real, toda escritura cortada (sbses_guarda). Mide:
     · el cartel «Por recibir» de Ruta (ARMADO) dice cuándo llega cada proveedor que tiene fecha en la 878;
     · en Recibir, el proveedor elegido dice cuándo llega en el título;
     · una bolsa de Red dada hoy (se agrega, SOLO en este navegador, a la respuesta de la 878: 2 del primer producto de la
       hoja) aparece como «salió del auto» con el nombre del representante; tildarla pasa 2 de «Llega» a «Había» y el Total
       no cambia; con «Había» en negativo se tilda sola. */
'use strict';
const pw = require(process.env.PW || 'playwright-core');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8080/app.html', ANCHOS = (process.env.ANCHOS || '390,1440').split(',').map(Number);
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) ok++; else mal++; console.log('  ' + (c ? 'ok ' : 'MAL') + '  ' + n + (d !== undefined ? '  ' + JSON.stringify(d).slice(0, 300) : '')); return c; };
(async () => {
  const br = await pw.chromium.launch();
  for (const w of ANCHOS) {
    console.log('── ' + w + ' px');
    const ctx = await br.newContext(w < 800 ? { viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'America/Argentina/Buenos_Aires' } : { viewport: { width: w, height: 900 }, timezoneId: 'America/Argentina/Buenos_Aires' });
    await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'luqui',rol:'admin',nombre:'Lucas Moresco',ts:Date.now()}));}catch(e){} window.confirm=function(){return false;}; window.alert=function(){}; window.__hj=function(){var b=document.querySelector('#recibirList .hj-cab b');if(!b)return null;var pv=b.textContent.replace(/^Recibir de /,'').split(' · ')[0].trim();return _abaHjEstado(pv,_abaHjArmar(pv));};` + sbses(process.env.SBSES, 'luqui'));
    let sku = null;
    await ctx.route('**/rest/v1/rpc/compras_llegadas_pantalla', async (route) => {
      const r = await route.fetch(); const d = await r.json();
      if (sku) d.bolsas = (d.bolsas || []).concat([{ k: 'Red|999001', n: '999001', cli: 'Cliente de prueba', rep: 'Lourdes Thomas', sku: sku.sku, q: 2, dep: sku.dep }]);
      await route.fulfill({ response: r, json: d });
    });
    const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message.slice(0, 200)));
    await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.go === 'function', null, { timeout: 60000 });
    await pg.waitForTimeout(2500);
    // Ruta › ARMADO: el cartel
    await pg.evaluate(() => go('ruta')); await pg.waitForTimeout(2500);
    await pg.evaluate(() => switchTab('armado'));
    const ll = await pg.waitForFunction(() => window.__comprasLlegadas, null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
    chk('la 878 contesta', !!(ll && ll.ok), ll && Object.keys(ll.llegan || {}));
    await pg.waitForTimeout(1500);
    const cartel = await pg.evaluate(() => { const e = document.getElementById('rutLlegan'); return e && e.getClientRects().length ? [].map.call(e.querySelectorAll('.rut-llegan-b'), (b) => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) })) : null; });
    const conFecha = Object.keys((ll && ll.llegan) || {}).filter((p) => ll.llegan[p].llega);
    chk('Ruta: el cartel «Por recibir» se ve', !!(cartel && cartel.length), cartel);
    chk('Ruta: cada proveedor con fecha dice cuándo llega («llega …»)', !!cartel && cartel.filter((b) => conFecha.some((p) => b.t.indexOf(p) === 0 || b.t.toLowerCase().indexOf(p.toLowerCase().split(' ')[0]) >= 0)).every((b) => /· llega(ba)? /.test(b.t)) && cartel.some((b) => /· llega/.test(b.t)), cartel && cartel.map((b) => b.t));
    chk('Ruta: los botones del cartel miden 44 px o más', !!cartel && cartel.every((b) => b.h >= 44), cartel && cartel.map((b) => b.h));
    // Compras › Recibir
    await pg.evaluate(() => go('busqueda')); await pg.waitForTimeout(2500);
    await pg.evaluate(() => abaSwitchTab('recibir'));
    await pg.waitForFunction(() => document.querySelector('#recibirList .hj-f'), null, { timeout: 60000 });
    const cab = await pg.evaluate(() => { const b = document.querySelector('#recibirList .hj-cab b'); return b ? b.textContent.trim() : ''; });
    const prov = await pg.evaluate(() => (__hj() || {}).prov);
    const esperado = ll && ll.llegan && ll.llegan[prov] && ll.llegan[prov].llega ? _esp(ll.llegan[prov].llega) : null;
    chk('Recibir: el título dice cuándo llega «' + prov + '»', esperado ? cab.indexOf(esperado) >= 0 : !/· Llega/.test(cab), { cab, esperado });
    const chips = await pg.evaluate(() => [].map.call(document.querySelectorAll('#recibirList .hj-prov'), (b) => b.textContent.trim()));
    if (chips.length) chk('Recibir: los proveedores dicen cuándo llegan', chips.every((t) => /· (llega|lun|mar|mié|jue|vie|sáb|dom)/i.test(t) || !conFecha.some((p) => t.indexOf(p) === 0)), chips);
    // La bolsa: se elige el primer producto de la hoja y se vuelve a pedir el camino con la bolsa agregada.
    sku = await pg.evaluate(() => { const S = __hj(); const a = Object.keys(S.f)[0]; return { sku: a, dep: S.dep }; });
    const antes = await pg.evaluate((a) => { const f = __hj().f[a]; return { h: f.h, l: f.l, t: Math.round((f.h + f.l) * 1000) / 1000 }; }, sku.sku);
    await pg.evaluate((prov) => { delete _abaHjCam[prov]; abaRenderRecibir(true); }, prov);
    const fila = await pg.waitForFunction((a) => { const n = document.getElementById('hjF_' + a); const c = n && n.parentNode && [].slice.call(document.querySelectorAll('#recibirList .hj-cam label')).find((l) => /La bolsa de Lourdes Thomas/.test(l.textContent)); return c ? c.textContent.replace(/\s+/g, ' ').trim() : null; }, sku.sku, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
    chk('Recibir: la bolsa de Red de hoy aparece como «salió del auto»', !!fila && /salió del auto/.test(fila), fila);
    const yaTil = await pg.evaluate((a) => !!__hj().f[a].cam['bolsa|Red|999001'], sku.sku);
    if (antes.h >= 0) {
      chk('Recibir: con «Había» en cero o más, la bolsa NO viene tildada', !yaTil, antes);
      await pg.evaluate((a) => { const cb = [].slice.call(document.querySelectorAll('#recibirList .hj-cam label')).find((l) => /La bolsa de Lourdes/.test(l.textContent)).querySelector('input'); cb.click(); }, sku.sku);
      await pg.waitForTimeout(400);
    }
    const desp = await pg.evaluate((a) => { const f = __hj().f[a], x = _abaHjArmar(__hj().prov).filter((y) => y.abbr === a)[0], c = _abaHjCalc(x, f); return { h: f.h, l: f.l, t: c.t, rec: c.rec, cam: c.cam }; }, sku.sku);
    chk('Recibir: tildarla pasa 2 de «Llega» a «Había»', desp.h === Math.round((antes.h + 2) * 1000) / 1000 && desp.l === Math.max(0, Math.round((antes.l - 2) * 1000) / 1000), { antes, desp });
    chk('Recibir: el Total no cambia', desp.t === antes.t, { antes: antes.t, despues: desp.t });
    chk('Recibir: lo recibido de la OC suma lo que salió del auto', desp.cam === 2 && desp.rec === Math.round((desp.l + 2 + (desp.rec - desp.l - 2)) * 1000) / 1000, desp);
    // Había negativo → se tilda sola (estado nuevo, Había del ERP forzado a −2)
    const auto = await pg.evaluate((a) => { const f = __hj().f[a]; f.cam = {}; f.h = -2; f.camAuto = false; f.hMano = false; f.lMano = false; const l0 = f.l; _abaHjCamAuto(__hj().prov); return { h: f.h, l: f.l, l0, til: !!f.cam['bolsa|Red|999001'] }; }, sku.sku);
    chk('Recibir: con «Había» −2, la bolsa se tilda sola y «Había» queda en 0', auto.til && auto.h === 0 && auto.l === Math.max(0, auto.l0 - 2), auto);
    chk('sin errores de JS', !err.length, err);
    await ctx.close();
  }
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
function _esp(iso) { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/); const d = new Date(+m[1], +m[2] - 1, +m[3]); const h = new Date(); const h0 = new Date(h.getFullYear(), h.getMonth(), h.getDate());
  const dias = Math.round((d - h0) / 86400000), dd = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()] + ' ' + m[3] + '/' + m[2];
  return dias === 0 ? 'Llega hoy' : dias === 1 ? 'Llega mañana' : dias < 0 ? 'Llegaba el ' + dd : 'Llega ' + dd; }
