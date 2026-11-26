/* ORIGEN POR PRODUCTO EN UN TOQUE (11/11/2026, encargo A del Organizador).
     SBSES=<sbses.json> node _tools/pruebas/probar_origen_toque.js <token> [ancho] [Hoja|N]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado
   Abre la tarjeta de un pedido real y, con el guardado INTERCEPTADO (no se escribe nada en la base):
     · cada producto tiene su selector (freezers · OC · Partido) con uno solo marcado;
     · un toque guarda, sin botón Guardar y sin cartel, y se mide cuánto tarda en salir (meta: < 5 s);
     · lo que viaja es ese producto con el freezer tocado y el resto como estaba;
     · la caja sigue a la vista y con el toque marcado (no se cierra la tarjeta ni sube la pantalla);
     · Partido abre el reparto y NO guarda solo por abrirlo;
     · «Todo: OC» guarda todo el pedido a compra en un toque;
     · nada se sale de la pantalla a ese ancho. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const a = process.argv.slice(2), TOKEN = a[0], ANCHO = Number(a[1] || 390), K = a[2] || 'Pilar|2444';
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
/* El guardado no sale: se anota lo que se habría mandado y contesta ok a los 700 ms, como la base. La recarga de
   después tampoco (traería lo de la base, que no cambió, y taparía lo que se está midiendo). */
const ATAJO = `(function(){
  window.__orPost=[];
  _ordenPost=function(b){ window.__orPost.push({t:performance.now(),b:JSON.parse(JSON.stringify(b))});
    return new Promise(function(ok){ setTimeout(function(){ ok({json:function(){return {ok:true};}}); },700); }); };
  _recargarPedidos=function(){ return Promise.resolve(); };
  _pfAplicar=function(){ return Promise.resolve(); };
})()`;
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } };
const card = `document.querySelector('.pc[data-pc-key="${K}"]')`;

async function tocar(cli, sel) {
  const r = await evaluar(cli, `(function(){var e=${sel};if(!e)return null;e.scrollIntoView({block:'center'});return 1;})()`);
  if (!r) return false;
  await T(350);
  const p = await evaluar(cli, `(function(){var e=${sel};var b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()`);
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
  return true;
}
const leer = (cli) => evaluar(cli, `(function(){var c=${card};if(!c)return null;var b=c.querySelector('.origen-box');
  return {abierta:!c.classList.contains('collapsed'),caja:!!b,
    filas:[].slice.call(c.querySelectorAll('.origen-prod')).map(function(r){return {a:r.dataset.a,q:+r.dataset.q,
      on:[].slice.call(r.querySelectorAll('.or-seg-b.on')).map(function(x){return x.dataset.m}),
      part:!(r.querySelector('.or-part')||{hidden:true}).hidden}}),
    ancho:b?{sw:b.scrollWidth,cw:b.clientWidth}:null, guardar:!!(b&&[].slice.call(b.querySelectorAll('button')).some(function(x){return x.offsetParent&&/guardar|confirmar/i.test(x.textContent)})),
    est:(c.querySelector('.or-est')||{}).textContent||''};})()`);

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  await evaluar(cli, "fC='Todos';fE='Todos';go('pedidos')"); await T(9000);
  await evaluar(cli, ATAJO);
  await evaluar(cli, 'pedBuscar(' + JSON.stringify(K.split('|')[1]) + ',false)'); await T(900);
  chk(!!(await evaluar(cli, `!!${card}`)), `${K}: la tarjeta está en la lista`);
  await evaluar(cli, `(function(){var c=${card};if(c&&c.classList.contains('collapsed'))c.querySelector('.pc-summary').click();})()`); await T(1500);
  let e = await leer(cli);
  chk(!!(e && e.caja), `${K}: abierta, está el selector de origen`, e);
  if (!e || !e.caja) { console.log(`\n${ok} ok · ${mal} mal`); process.exit(1); }
  chk(e.filas.length > 0 && e.filas.every((f) => f.on.length === 1), `cada producto (${e.filas.length}) con UNO marcado: ${e.filas.map((f) => f.a + '=' + f.on[0]).join(' ')}`, e.filas);
  chk(!e.guardar, 'no hay botón Guardar/Confirmar a la vista', e);
  chk(e.ancho && e.ancho.sw <= e.ancho.cw + 1, `a ${ANCHO}px nada se sale de la caja (${e.ancho && e.ancho.sw} ≤ ${e.ancho && e.ancho.cw})`, e.ancho);
  const antes = e.filas;

  /* 1) Un toque en un freezer distinto del marcado, en el primer producto. */
  const f0 = antes[0], deps = await evaluar(cli, `[].slice.call(${card}.querySelectorAll('.origen-prod')[0].querySelectorAll('.or-seg-b')).map(function(b){return b.dataset.m}).filter(function(m){return /^f:/.test(m)})`);
  const meta = deps.find((m) => m !== f0.on[0]) || deps[0];
  const y0 = await evaluar(cli, 'window.scrollY');
  const t0 = await evaluar(cli, 'performance.now()');
  await tocar(cli, `${card}.querySelectorAll('.origen-prod')[0].querySelector('.or-seg-b[data-m="${meta}"]')`);
  let posts = [];
  for (let i = 0; i < 50 && !posts.length; i++) { await T(100); posts = await evaluar(cli, 'window.__orPost'); }
  chk(posts.length === 1, `un toque = un guardado (${posts.length})`, posts.length);
  if (posts.length) {
    const ms = Math.round(posts[0].t - t0), pr = posts[0].b.productos, x = pr.find((p) => p.a === f0.a), fz = meta.slice(2);
    chk(ms < 5000, `del toque al guardado: ${ms} ms (meta < 5 s)`, ms);
    chk(posts[0].b.action === 'setOrigenProductos' && pr.length === antes.length, `viaja el pedido entero (${pr.length} productos) por setOrigenProductos`, posts[0].b);
    chk(x && x.d === f0.q && x.oc === 0 && x.w && x.w[fz] === f0.q && Object.keys(x.w).length === 1, `${f0.a}: ${f0.q} de ${fz}, nada a OC`, x);
    const resto = antes.slice(1).every((f) => { const p = pr.find((y) => y.a === f.a); if (!p) return false; return f.on[0] === 'oc' ? p.oc === f.q && p.d === 0 : (f.on[0].indexOf('f:') === 0 ? p.d === f.q && p.w && p.w[f.on[0].slice(2)] === f.q : true); });
    chk(resto, 'los otros productos viajan como estaban marcados', pr);
  }
  await T(1500);
  e = await leer(cli);
  chk(!!(e && e.abierta && e.caja), 'después de guardar la tarjeta sigue abierta y con el selector', e);
  chk(e && e.filas[0] && e.filas[0].on[0] === meta, `y el primero quedó marcado en ${meta}`, e && e.filas[0]);
  const y1 = await evaluar(cli, 'window.scrollY');
  chk(Math.abs(y1 - y0) < 300, `la pantalla no salta arriba (${Math.round(y0)} → ${Math.round(y1)})`, { y0, y1 });

  /* 2) Partido abre y no guarda solo por abrirlo. */
  if (e.filas.length > 1) {
    await evaluar(cli, 'window.__orPost=[]');
    await tocar(cli, `${card}.querySelectorAll('.origen-prod')[1].querySelector('.or-seg-b[data-m="part"]')`); await T(1800);
    e = await leer(cli);
    chk(e.filas[1].part === true && e.filas[1].on[0] === 'part', 'Partido abre el reparto', e.filas[1]);
    chk((await evaluar(cli, 'window.__orPost.length')) === 0, 'abrir Partido no guarda');
  }

  /* 3) «Todo: OC». */
  await evaluar(cli, 'window.__orPost=[]');
  await tocar(cli, `${card}.querySelector('.or-todo .or-seg-b:last-child')`);
  posts = [];
  for (let i = 0; i < 50 && !posts.length; i++) { await T(100); posts = await evaluar(cli, 'window.__orPost'); }
  chk(posts.length === 1 && posts[0].b.productos.every((p) => p.d === 0 && p.oc > 0), '«Todo: OC» guarda el pedido entero a compra en un toque', posts.map((p) => p.b.productos));
  await T(1500);
  e = await leer(cli);
  chk(e && e.filas.every((f) => f.on[0] === 'oc'), 'y todos quedan marcados en OC', e && e.filas);

  const err = (await evaluar(cli, 'window.__err||[]')).filter((x) => !/ResizeObserver/.test(x));
  chk(err.length === 0, 'sin errores de JS', err);
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
