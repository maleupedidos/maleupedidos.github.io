/* «Venta Directa», el nombre viejo de Home + Pilar (4/10/2026). Chrome de verdad,
   sesion real, POST interceptados (no escribe nada en la planilla).

     node _tools/pruebas/probar_plan_venta_directa.js <token> [ancho] [puerto] [Code.js alternativo]

   Dos bugs de la misma raiz, los dos con un solo criterio: `Venta Directa` es la
   meta vieja de Domiciliario (alias), en la tab y en «Maleu - Lectura».
   1. Plan_vs_Real de Lectura da EL MISMO desglose que la tab, fila por fila (meta
      y real), en octubre (metas en Home y Pilar) y en septiembre (meta vieja).
      Lectura se corre aca en node con el `planMes` que bajo la pagina: el mismo
      dato, dos codigos. Con el Code.js viejo (4o argumento) tiene que dar rojo.
   2. «Planificar el mes» en septiembre muestra la meta vieja y guardar no la
      duplica: Domiciliario sigue en $10.400.000. Antes el editor la escondia,
      mostraba Home y Pilar vacios, y lo que se cargaba ahi se sumaba a la vieja.
   3. Junio (la vieja partida por barrio): se ve la suma y no se puede tocar. */
const R = __dirname + '/';
const path = require('path');
const { abrir, evaluar } = require(R + 'cdp.js');
const prep = require(R + 'sesion_prep.js');
const L = require(path.join(__dirname, '..', '..', '..', 'estancias', '_tools', 'lectura_comun.js'));
const [tok, anchoS, puertoS, codeAlt] = process.argv.slice(2);
if (!tok) { console.error('falta el token: python _tools/pruebas/leer_sesion.py'); process.exit(2); }
const ancho = Number(anchoS) || 1440, puerto = Number(puertoS) || 8095;
const ctx = L.cargarCode(codeAlt || null);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (c, t, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 700) : '')); } };

/* Guarda cada planMes que baja la pagina y anota los POST (que sesion_prep ya frena). */
const EXTRA = '(function(){window.__pm={};window.__pmU={};window.__posts=[];var o=window.fetch;window.fetch=function(u,x){'
  + 'if(x&&String(x.method||"").toUpperCase()==="POST"){try{window.__posts.push(JSON.parse(x.body));}catch(e){}return o.apply(this,arguments);}'
  + 'if(String(u).indexOf("action=planMes")>=0)return o.apply(this,arguments).then(function(r){return r.clone().json().then(function(d){if(d&&d.mes){window.__pm[String(d.mes).toLowerCase()]=d;window.__pmU[String(d.mes).toLowerCase()]=String(u);}return r;});});'
  + 'return o.apply(this,arguments);};})();'
  + 'try{Object.keys(localStorage).forEach(function(k){if(k.indexOf("maleu_plan_cache_")===0)localStorage.removeItem(k);});}catch(e){}';

/* La tab: el arbol aplanado, sin la raiz. */
const TAB = `(function(){ var T=_planNivelesMes(); if(!T) return null; var out=[];
  (function rec(x){ if(x.prof>0) out.push({t:x.t, mf:x.meta.f, mv:x.meta.v, rf:x.soloMeta?'':x.real.f, vieja:!!x.soloMeta}); x.hijos.forEach(rec); })(T);
  return out; })()`;

/* Lectura: las filas de Plan_vs_Real del mismo planMes, sin «Todos los canales». */
function lectura(pd) {
  const t = ctx._mlPlanVsReal_({ m: JSON.parse(JSON.stringify(pd)) }), c = {};
  t.cols.forEach((x, j) => { c[x[0]] = j; });
  return t.filas.filter(f => f[c.fila] !== 'Todos los canales').map(f => ({
    t: f[c.fila], mf: Number(f[c.meta_facturacion]) || 0, mv: Number(f[c.meta_pedidos]) || 0,
    rf: f[c.real_facturado] === '' ? '' : Number(f[c.real_facturado]), vieja: f[c.meta_vieja] === 'si' }));
}

async function irAMes(cli, label) {
  await evaluar(cli, "document.getElementById('planMesSel').value=" + JSON.stringify(label) + ",planLoad(),1");
  for (let i = 0; i < 90; i++) {
    const listo = await evaluar(cli, "(function(){var T=_planNivelesMes();return !!(T&&document.getElementById('planMesSel').value===" + JSON.stringify(label) + "&&window.__pm[" + JSON.stringify(label.toLowerCase()) + "]&&document.querySelector('#planTotal .pn-row'))})()");
    if (listo) break; await sleep(500);
  }
  await sleep(600);
}

async function desglose(cli, label) {
  /* La tab pide `planMes` con `lite=1` (sin `real`); Lectura lo pide entero. Se
     baja entero el mismo mes, como lo baja el exportador. */
  const tab = await evaluar(cli, TAB);
  const pd = await evaluar(cli, 'fetch(window.__pmU[' + JSON.stringify(label.toLowerCase()) + '].replace(/([?&])lite=1&?/, "$1")).then(function(r){return r.json();})');
  chk(!!tab && tab.length > 0 && !!pd, label + ': la tab dibujo el arbol y llego el planMes', [!!tab, !!pd]);
  if (!tab || !pd) return { pd: pd };
  const lec = lectura(pd);
  const clave = r => r.t + (r.vieja ? ' (vieja)' : '');
  const distintas = [];
  const n = Math.max(tab.length, lec.length);
  for (let i = 0; i < n; i++) {
    const a = tab[i], b = lec[i];
    if (!a || !b || clave(a) !== clave(b) || a.mf !== b.mf || a.mv !== b.mv) distintas.push({ tab: a, lectura: b });
  }
  chk(distintas.length === 0, label + ': Lectura da las mismas ' + tab.length + ' filas que la tab, con la misma meta (plata y ventas)', distintas.slice(0, 4));
  const realDif = [];
  for (let i = 0; i < Math.min(tab.length, lec.length); i++) {
    const a = tab[i], b = lec[i];
    if (a.rf === '' || b.rf === '' ? a.rf !== b.rf : Math.abs(a.rf - b.rf) > 1) realDif.push([a.t, a.rf, b.rf]);
  }
  chk(realDif.length === 0, label + ': y el mismo real por fila (entregado, al peso)', realDif);
  return { tab: tab, lec: lec, pd: pd };
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: ancho < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: ancho < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(tok) + EXTRA });
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + puerto + '/app.html' });
  console.log('\n== Venta Directa = meta vieja de Domiciliario · ' + ancho + 'px' + (codeAlt ? ' · Code.js ' + codeAlt : '') + ' ==\n');
  let listo = false;
  for (let i = 0; i < 150 && !listo; i++) { listo = await evaluar(cli, "!!(window.D&&D.pedidos&&D.pedidos.length&&window.VD&&D.gastos&&Array.isArray(D.ventasExtra))"); if (!listo) await sleep(1000); }
  chk(listo, 'el ERP cargo pedidos, ventas y gastos');
  await evaluar(cli, "go('planificacion'),1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "!!document.querySelector('#planTotal .pn-row')")) break; await sleep(500); }

  /* 1. El desglose, en los dos criterios de carga */
  await irAMes(cli, 'Octubre 2026');
  const O = await desglose(cli, 'Octubre 2026');
  const fo = (O.lec || []).filter(r => r.t === 'Home' || r.t === 'Pilar');
  chk(fo.length === 2 && fo[0].mf === 14229322 && fo[1].mf === 4966086, 'octubre: Home y Pilar llegan a Lectura con su meta', fo);
  await irAMes(cli, 'Septiembre 2026');
  const S = await desglose(cli, 'Septiembre 2026');
  const dom = (S.lec || []).filter(r => r.t === 'Domiciliario')[0];
  chk(!!dom && dom.mf === 10400000, 'septiembre: Domiciliario = la meta vieja de Venta Directa ($10.400.000)', dom);

  /* 2. El editor en septiembre */
  await evaluar(cli, "planPlanificarMes(),1"); await sleep(500);
  const E = await evaluar(cli, `(function(){ var rs=[].map.call(document.querySelectorAll('#planMetaBody .plan-ppc-r'),function(r){
      var i=r.querySelector('input[id^=ppCf]'); return i?{t:r.querySelector('span').textContent.trim(),v:i.value,id:i.id,dis:i.disabled}:null; }).filter(Boolean);
    var b=document.getElementById('planMetaBody'); return {rs:rs, sw:b.scrollWidth, cw:b.clientWidth}; })()`);
  const domIn = E.rs.filter(r => /^(Home|Pilar)/.test(r.t));
  const domSum = domIn.reduce((s, r) => s + (Number(String(r.v).replace(/\./g, '')) || 0), 0);
  chk(domSum === 10400000, 'el editor muestra la meta de Domiciliario que ya existe ($10.400.000), no Home y Pilar vacios', E.rs);
  chk(E.sw <= E.cw + 1, 'el editor entra sin scroll horizontal', [E.sw, E.cw]);
  /* Lo que hace una persona que ve Home vacio: le carga la meta del mes. */
  const homeVacio = E.rs.filter(r => r.t === 'Home' && !r.v)[0];
  if (homeVacio) await evaluar(cli, "var i=document.getElementById('" + homeVacio.id + "');i.value='10.400.000';i.dispatchEvent(new Event('input')),1");
  await evaluar(cli, "window.__posts=[],document.getElementById('ppGuardar').click(),1");
  for (let i = 0; i < 40; i++) { if ((await evaluar(cli, 'window.__posts.filter(function(p){return p.action==="planMetaSet"}).length')) >= 4) break; await sleep(300); }
  await sleep(800);
  const ps = (await evaluar(cli, 'window.__posts')).filter(p => p.action === 'planMetaSet');
  chk(ps.length > 0, 'guardar mando las metas', ps.length);
  /* Lo que quedaria en la planilla: cada POST pisa su fila (mes, canal, barrio). */
  const pd2 = JSON.parse(JSON.stringify(S.pd || { metas: {} }));
  ps.forEach(p => { const k = p.canal + '|' + (p.barrio || ''); pd2.metas[k] = Object.assign({}, pd2.metas[k] || {}, { canal: p.canal, barrio: p.barrio || '', metaFact: p.metaFact, metaPedidos: p.metaPedidos, metaMargen: p.metaMargen }); });
  const dom2 = lectura(pd2).filter(r => r.t === 'Domiciliario')[0];
  chk(!!dom2 && dom2.mf === 10400000, 'despues de guardar, Domiciliario sigue en $10.400.000 (no suma la vieja + Home + Pilar)', [dom2, ps.map(p => p.canal + '|' + (p.barrio || '') + ' ' + p.metaFact)]);
  const vdP = ps.filter(p => p.canal === 'Venta Directa')[0];
  chk(!!vdP && vdP.barrio === 'Estancias del Pilar' && vdP.metaFact === 10400000, 'la meta vieja se guarda en SU fila (Venta Directa | Estancias del Pilar)', vdP);
  chk(!ps.some(p => p.canal === 'Home' || p.canal === 'Pilar'), 'no crea filas de Home ni de Pilar en un mes viejo', ps.map(p => p.canal));
  await evaluar(cli, "planCerrarMeta(),1");

  /* 3. Junio: la vieja partida por barrio */
  await irAMes(cli, 'Junio 2026');
  await evaluar(cli, "planPlanificarMes(),1"); await sleep(500);
  const J = await evaluar(cli, `[].map.call(document.querySelectorAll('#planMetaBody .plan-ppc-r'),function(r){
      var i=r.querySelector('input[id^=ppCf]'); return i?{t:r.querySelector('span').textContent.trim(),v:i.value,dis:i.disabled}:null; }).filter(Boolean)`);
  const jd = J.filter(r => /^(Home|Pilar)/.test(r.t));
  chk(jd.length === 1 && jd[0].v === '10.050.000' && jd[0].dis === true, 'junio: Home + Pilar muestra la suma de los barrios ($10.050.000) y no se puede tocar', J);
  await evaluar(cli, "window.__posts=[],document.getElementById('ppGuardar').click(),1");
  await sleep(2500);
  const pj = (await evaluar(cli, 'window.__posts')).filter(p => p.action === 'planMetaSet');
  chk(!pj.some(p => ['Venta Directa', 'Home', 'Pilar'].indexOf(p.canal) >= 0), 'y guardar junio no toca ninguna fila de Domiciliario', pj.map(p => p.canal + '|' + (p.barrio || '')));

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
