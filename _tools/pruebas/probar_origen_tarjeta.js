/* LA TARJETA DICE DE DÓNDE SALE CADA PRODUCTO (11/11/2026, María Paz Martín, Pilar #2440).
     SBSES=<sbses.json> node _tools/pruebas/probar_origen_tarjeta.js <token> [ancho] [Hoja|N ...]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado
   Por cada pedido: lee el origen GUARDADO en la base (sales_order_item.origin, con la sesión de la pantalla) y
   compara con lo que dice la tarjeta:
     · cerrada: el chip de origen («Depósito Ustariz», «4 OC») está y coincide con la base;
     · abierta: un renglón por producto, y cada uno dice el freezer guardado (w) o la OC;
     · «De qué freezer sale» no dice «Sin elegir» si el freezer ya está guardado por producto, y no aparece si todo es OC. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const a = process.argv.slice(2), TOKEN = a[0], ANCHO = Number(a[1] || 1440);
const PEDS = a.slice(2).length ? a.slice(2) : ['Pilar|2440', 'Home|2439'];
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  await evaluar(cli, "fC='Todos';fE='Todos';go('pedidos')"); await T(9000);
  /* SIN_OR=1: la lista llega SIN el origen de cada producto, como la arma pedidos_light_pantalla en producción. La tarjeta lo tiene que sacar igual (_ORI). */
  if (process.env.SIN_OR) { await evaluar(cli, "(D.pedidos||[]).forEach(function(p){(p.p||[]).forEach(function(it){delete it.or;});});render()"); await T(1500); console.log('  (sin origen en la lista: lo tiene que traer aparte)'); }
  for (const K of PEDS) {
    const [H, N] = K.split('|');
    /* La verdad, de la base (con el permiso de la pantalla), sin pasar por el armado del ERP. */
    const base = await evaluar(cli, `(function(){return _sbPermiso(true).then(function(sb){return fetch(sb.url+'/rest/v1/sales_order_item?select=product_sku,quantity,origin&order_key=eq.'+encodeURIComponent(${JSON.stringify(K)}),{headers:{apikey:sb.key,Authorization:'Bearer '+sb.token}}).then(function(r){return r.json();});});})()`, { awaitPromise: true }).catch(() => null);
    await evaluar(cli, 'pedBuscar('+JSON.stringify(N)+',false)'); await T(900);
    const card = `document.querySelector('.pc[data-pc-key="${K}"]')`;
    await evaluar(cli, `(function(){var c=${card};if(c){c.scrollIntoView({block:'center'});}})()`);
    const cerrada = await evaluar(cli, `(function(){var c=${card};if(!c)return null;var t=c.querySelector('.pc-or-chip');return {chip:t?t.textContent:null,abierta:!c.classList.contains('collapsed')};})()`);
    chk(!!cerrada, `${K}: la tarjeta está en la lista`);
    if (!cerrada) continue;
    if (cerrada.abierta) await evaluar(cli, `(function(){var c=${card};c.classList.add('collapsed');})()`);
    const ors = (Array.isArray(base) ? base : []).map((x) => ({ a: x.product_sku, or: typeof x.origin === 'string' ? JSON.parse(x.origin) : x.origin }));
    const todoOc = ors.length && ors.every((x) => x.or && !(Number(x.or.d) > 0));
    const ws = [...new Set(ors.flatMap((x) => (x.or && x.or.w) ? Object.keys(x.or.w).filter((k) => Number(x.or.w[k]) > 0) : []))];
    chk(!!cerrada.chip, `${K}: cerrada, el chip dice de dónde sale: «${cerrada.chip}»`, cerrada);
    if (cerrada.chip) {
      if (todoOc) chk(/OC/.test(cerrada.chip) && !/Dep/.test(cerrada.chip), `${K}: chip OC como en la base`, { chip: cerrada.chip, ors });
      else if (ws.length === 1) chk(cerrada.chip.toLowerCase().indexOf(ws[0]) >= 0, `${K}: el chip nombra el freezer de la base (${ws[0]})`, { chip: cerrada.chip, ors });
    }
    await evaluar(cli, `(function(){var c=${card};var s=c.querySelector('.pc-summary');s.click();})()`); await T(900);
    const ab = await evaluar(cli, `(function(){var c=${card};var rs=[].slice.call(c.querySelectorAll('.pc-orl-r')).map(function(r){return {p:r.querySelector('.pc-orl-p').textContent.trim(),o:[].slice.call(r.querySelectorAll('.pc-orl-x')).map(function(x){return x.textContent.trim()})}});
      var dv=c.querySelector('.ped-dep-v');var on=[].slice.call(c.querySelectorAll('.ped-dep-x.on')).map(function(b){return b.textContent.trim()});
      var bt=[].slice.call(c.querySelectorAll('.ped-dep-x')).map(function(b){return b.textContent.trim()});return {rs:rs,dep:dv?dv.textContent.trim():null,on:on,bt:bt,chip:(c.querySelector('.pc-or-chip')||{}).textContent||''};})()`);
    /* (11/11/2026, segunda vuelta) El freezer SIEMPRE con nombre: ni «Depósito» a secas, ni «Por defecto», ni «Sin elegir». */
    chk(!ab.rs.some((r) => r.o.some((x) => /^Dep[oó]sito( ·|$)/.test(x))) && !/^Dep[oó]sito$/.test(ab.chip), `${K}: ningún «Depósito» sin nombre (renglones y chip «${ab.chip}»)`, { rs: ab.rs, chip: ab.chip });
    if (ab.dep !== null) {
      chk(ab.bt.indexOf('Por defecto') < 0 && !/Sin elegir/.test(ab.dep), `${K}: sin «Por defecto» ni «Sin elegir»: ${ab.bt.join(' · ')} / ${ab.dep}`, ab);
      chk(ab.on.length === 1 || /^Repartido/.test(ab.dep), `${K}: un freezer marcado (${ab.on.join(',')}), salvo repartido`, ab);
    }
    chk(ab.rs.length === ors.length && ors.length > 0, `${K}: abierta, un renglón por producto (${ab.rs.length} de ${ors.length})`, ab);
    const malos = ab.rs.filter((r, i) => {
      const o = ors[i] && ors[i].or; if (!o) return false;
      if (Number(o.d) > 0 && o.w) return !Object.keys(o.w).filter((k) => Number(o.w[k]) > 0).every((k) => r.o.some((x) => x.toLowerCase().indexOf(k) >= 0));
      if (Number(o.oc) > 0) return !r.o.some((x) => /OC/.test(x));
      return false;
    });
    chk(malos.length === 0, `${K}: cada renglón coincide con el origen guardado en la base`, { malos, ors });
    if (todoOc) chk(ab.dep === null, `${K}: todo por OC, no aparece «De qué freezer sale»`, ab.dep);
    else if (ws.length) {
      chk(!!ab.dep && !/Sin elegir/.test(ab.dep), `${K}: «De qué freezer sale» no dice «Sin elegir»: ${ab.dep}`, ab.dep);
      if (ws.length === 1) chk(ab.on.length === 1 && ab.on[0].toLowerCase().indexOf(ws[0]) >= 0, `${K}: el botón marcado es el guardado (${ws[0]}), no «Por defecto»: ${ab.on.join(',')}`, ab.on);
      else chk(ab.on.length === 0, `${K}: repartido entre freezers, ningún botón marcado`, ab.on);
    }
    console.log('     ', JSON.stringify(ab.rs));
  }
  const err = (await evaluar(cli, 'window.__err||[]')).filter((x) => !/ResizeObserver loop/.test(x));
  chk(!err.length, 'sin errores en la consola', err);
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
