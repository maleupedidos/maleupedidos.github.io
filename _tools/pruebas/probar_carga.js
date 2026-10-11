/**
 * Productos › CARGA: la grilla de la mercadería que llegó (Inventario I2, 11/10/2026).
 *
 *   node probar_carga.js [390|1440] [puerto]
 *
 * Sin token y SIN tocar producción: todo pedido al backend se intercepta. La
 * grilla (`cargaGrilla`) y las respuestas de `cargaGuardar` son inventadas, con
 * la forma que devuelve el backend (ver `estancias/_tools/probar_carga_guardar.js`,
 * que es donde se prueban las decisiones). Acá se prueba la PANTALLA:
 *
 *   · la sub-tab está escondida sin la palanca y aparece con ?carga=1;
 *   · un proveedor que solo vende por kilo no aparece, y un producto por kilo tampoco;
 *   · lo tipeado viaja bien: un freezer vacío = como estaba, lo que no se tocó no viaja;
 *   · «cuadra» / «faltan N» se ve mientras se tipea;
 *   · Revisar no escribe (previa:true) y recién después aparece Guardar;
 *   · Guardar manda el mismo cuerpo con clientOpId, y al volver limpia lo cargado;
 *   · llegó de más: la pregunta dice el producto, el proveedor y el costo, y la
 *     respuesta viaja en la fila;
 *   · con una hora pasada, «había» pasa a ser lo de esa hora;
 *   · los campos llegan al piso táctil y nada desborda a lo ancho.
 */
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')('prueba-sin-backend');

const ANCHO = Number(process.argv[2] || 390);
const PUERTO = Number(process.argv[3] || 8080);
const PISO = 44;
let ok = 0, mal = 0;
const chk = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (x !== undefined ? '\n         -> ' + JSON.stringify(x).slice(0, 700) : '')); } };
const espera = ms => new Promise(r => setTimeout(r, ms));

const p = (a, n, u, us, mo, dep, cli) => ({ a, n, u, ini: { ustariz: us, moresco: mo }, ped: { dep: dep || 0, cli: cli || 0, de: [] }, ap: {}, apDe: [] });
const GRILLA = { ok: true, ts: 1, apartado: 'si',
  deps: [{ id: 'ustariz', nombre: 'Depósito Ustariz', user: 'tadeo' }, { id: 'moresco', nombre: 'Depósito Moresco', user: 'lucas' }],
  proveedores: [
    { nombre: 'Le Unike', productos: [p('SL', 'Sorrentinos Langostinos', 'u', 3, 0), p('SCo', 'Sorrentinos Cordero al Malbec', 'u', 5, 1)] },
    { nombre: 'Sevuchitas', productos: [p('PPM', 'Pack Pizzas x2 Muzzarella', 'u', 5, 3, 4, 2), p('PPJyQ', 'Pack Pizzas x2 Jamón y Queso', 'u', 2, 0, 4, 0),
      p('EV', 'Empanadas Verdura x8', 'u', 4, 4), p('XKG', 'Algo por kilo', 'kg', 1.5, 0)] },
    { nombre: 'LM Carnes', productos: [p('CLo', 'Carne Lomo', 'kg', 2.5, 0)] }] };

/* El backend inventado: contesta según lo que le llega. */
const BACKEND = `
  window.__posts = []; window.__gets = []; window.__afuera = [];
  window.__GRILLA = ${JSON.stringify(GRILLA)};
  function __resp(o){ return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
  function __carga(b){
    var filas = b.filas || [];
    if (b.ocurrio && !filas.length) return { ok: false, errores: ['No cambiaste nada: no hay nada para guardar.'],
      inicial: { PPM: { ustariz: 7, moresco: 3 }, PPJyQ: { ustariz: 2, moresco: 0 }, EV: { ustariz: 4, moresco: 4 } },
      seMovio: { PPM: { post: { ustariz: -2 }, movs: [{ tipo: '-SAL', cant: 2, dep: 'ustariz' }], dudoso: '' } } };
    var sl = filas.filter(function (f) { return f.a === 'SL'; })[0];
    if (sl && !sl.deMas) return { ok: true, previa: true, prendido: true, falta: 'respuesta', lineas: [], movimientos: [], recibir: [],
      preguntas: [{ a: 'SL', n: 'Sorrentinos Langostinos', proveedor: 'Le Unike', llego: 1, pedido: 0, deMas: 1, costo: 17100 }] };
    var lineas = filas.map(function (f) { return { product_sku: f.a, received_quantity: f.recibido }; });
    if (b.previa) return { ok: true, previa: true, prendido: true, avisos: [], preguntas: [], lineas: lineas,
      deMas: sl ? [{ a: 'SL', que: sl.deMas.que, cant: 1 }] : [],
      recibir: sl ? [] : filas.map(function (f) { return { a: f.a, llego: f.recibido, pedido: 6, ocs: ['OC-1'] }; }),
      movimientos: sl ? [{ product_sku: 'SL', kind: 'recepcion', quantity: 1, to_warehouse: 'ustariz' }]
        : [{ product_sku: 'PPM', kind: 'recepcion', quantity: 3, to_warehouse: 'ustariz' }, { product_sku: 'PPM', kind: 'traspaso', quantity: 3, from_warehouse: 'ustariz', to_warehouse: 'moresco' }] };
    return { ok: true, carga: 'CM-20261016-103000-ab12', avisos: [], movimientos: [] };
  }
  (function () { var o = window.fetch; window.fetch = function (u, x) {
    var url = String(u || '');
    if (!/script\\.google(usercontent)?\\.com/.test(url)) {
      if (/^https?:/.test(url) && url.indexOf(location.origin) !== 0) { window.__afuera.push(url.slice(0, 80)); return __resp({ ok: false }); }
      return o.apply(this, arguments);
    }
    if (x && String(x.method || '').toUpperCase() === 'POST') {
      var b = null; try { b = JSON.parse(x.body); } catch (e) { b = { crudo: String(x.body) }; }
      window.__posts.push(b);
      return b && b.action === 'cargaGuardar' ? __resp(__carga(b)) : __resp({ ok: false, error: 'prueba' });
    }
    window.__gets.push((url.match(/action=([A-Za-z]+)/) || [])[1] || '?');
    if (url.indexOf('action=cargaGrilla') >= 0) return __resp(window.__GRILLA);
    return __resp({ ok: false, error: 'prueba' });
  }; })();
`;
const tipear = (sel, txt) => `(function(){ var e=document.querySelector(${JSON.stringify(sel)}); if(!e)return 'no esta ${sel.replace(/'/g, '')}'; e.focus(); e.value=${JSON.stringify(txt)}; e.dispatchEvent(new Event('input',{bubbles:true})); e.blur(); return 'ok'; })()`;
const campo = (a, i) => `#stgR_${a} input:nth-of-type(1)`.replace('input:nth-of-type(1)', `label:nth-of-type(${i}) input`);
const cargas = `JSON.stringify(window.__posts.filter(function(b){return b&&b.action==='cargaGuardar';}))`;

async function pagina(url) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + BACKEND });
  await cli.enviar('Page.navigate', { url });
  await espera(2500);
  const listo = await evaluar(cli, `(async () => { const t0 = Date.now();
    while (Date.now() - t0 < 40000) { if (typeof window.go === 'function' && typeof window.stSwitchTab === 'function' && typeof window.renderStCarga === 'function') return 'listo';
      await new Promise(r => setTimeout(r, 200)); } return 'el ERP no arranco (o no tiene la pantalla de carga)'; })()`);
  if (listo !== 'listo') { console.log('  MAL  ' + listo); process.exit(1); }
  return cli;
}

(async () => {
  console.log('\n== Productos › CARGA · ' + ANCHO + 'px ==\n');
  const base = 'http://localhost:' + PUERTO + '/app.html';

  /* 1. Sin la palanca la sub-tab no se ve. */
  let cli = await pagina(base);
  let r = await evaluar(cli, `(function(){ go('stock'); var b=document.querySelector('#p-stock .v-tab[data-stt="carga"]'); return b ? getComputedStyle(b).display : 'no existe'; })()`);
  chk(r === 'none', 'sin la palanca, la sub-tab CARGA está escondida', r);
  try { cli.cerrar && cli.cerrar(); } catch (e) {}

  /* 2. Con ?carga=1 aparece y pinta. */
  cli = await pagina(base + '?carga=1');
  r = JSON.parse(await evaluar(cli, `(async () => {
    go('stock'); var b=document.querySelector('#p-stock .v-tab[data-stt="carga"]');
    var visible = b && getComputedStyle(b).display !== 'none';
    stSwitchTab('carga');
    var t0 = Date.now(); while (Date.now() - t0 < 8000 && !document.querySelector('#stCarga .stg-row')) await new Promise(r => setTimeout(r, 100));
    var c = document.getElementById('stCarga');
    return JSON.stringify({ visible: visible, provs: [].map.call(c.querySelectorAll('.stc-dep-btn'), function(x){ return x.textContent; }),
      elegido: (c.querySelector('.stc-dep-btn.on') || {}).textContent || '', filas: [].map.call(c.querySelectorAll('.stg-row'), function(x){ return x.id; }),
      selDep: !!c.querySelector('.stg-sel'), tabsAncho: document.querySelector('#p-stock .v-tabs').scrollWidth - document.querySelector('#p-stock .v-tabs').clientWidth });
  })()`));
  chk(r.visible === true, 'con ?carga=1 la sub-tab aparece');
  chk(r.provs.length === 2 && !r.provs.some(x => /LM Carnes/.test(x)), 'dos proveedores: el que solo vende por kilo no está', r.provs);
  chk(/^Sevuchitas/.test(r.elegido) && /10 pedidos sin llegar/.test(r.elegido), 'arranca en el que tiene mercadería pedida sin llegar, y dice cuánta', r.elegido);
  chk(r.filas.join() === 'stgR_PPM,stgR_PPJyQ,stgR_EV', 'una fila por producto por unidad; el de kilo no entra', r.filas);
  chk(r.selDep === true, 'hay algo de clientes: pregunta en qué freezer se guardó');
  chk(r.tabsAncho <= 1, 'las sub-tabs de Stock entran sin scroll a lo ancho', r.tabsAncho);

  /* 3. Medidas: piso táctil y nada desborda. */
  r = JSON.parse(await evaluar(cli, `(function(){ var c=document.getElementById('stCarga'); var ch=[]; var n=0;
    [].forEach.call(c.querySelectorAll('input,button,select'), function(e){ var b=e.getBoundingClientRect(); n++; if(b.width>0 && (b.height<${PISO}-0.5 || b.width<${PISO}-0.5)) ch.push(e.className+' '+Math.round(b.width)+'x'+Math.round(b.height)); });
    var fuera=[]; [].forEach.call(c.querySelectorAll('*'), function(e){ var b=e.getBoundingClientRect(); if(b.width>0 && b.right>window.innerWidth+1) fuera.push(e.className); });
    var nom=c.querySelector('.stg-n').getBoundingClientRect(), inp=c.querySelector('.stg-in').getBoundingClientRect();
    return JSON.stringify({ n:n, chicos:ch, fuera:fuera.slice(0,5), scrollX: document.documentElement.scrollWidth-window.innerWidth, nombreAncho: Math.round(nom.width), campoAncho: Math.round(inp.width) }); })()`));
  chk(r.n >= 12 && r.chicos.length === 0, 'los ' + r.n + ' controles llegan a ' + PISO + ' px', r.chicos);
  chk(r.fuera.length === 0 && r.scrollX <= 1, 'nada desborda a lo ancho', r);
  chk(r.nombreAncho >= 150 && r.campoAncho >= 60, 'el nombre tiene lugar (' + r.nombreAncho + ' px) y el campo también (' + r.campoAncho + ' px)', r);

  /* 4. Tipear: cuadra / faltan. PPM habia 5 y 3; llegaron 6. */
  await evaluar(cli, tipear(campo('PPM', 1), '6'));
  r = await evaluar(cli, `document.getElementById('stgE_PPM').textContent`);
  chk(/faltan 6/.test(r), 'llegaron 6 y todavía no dijo dónde quedaron: «faltan 6»', r);
  await evaluar(cli, tipear(campo('PPM', 2), '8'));
  await evaluar(cli, tipear(campo('PPM', 3), '6'));
  r = await evaluar(cli, `document.getElementById('stgE_PPM').textContent`);
  chk(/cuadra/.test(r), '8 en Ustariz y 6 en Moresco: «cuadra»', r);
  await evaluar(cli, tipear(campo('PPJyQ', 1), '4'));
  await evaluar(cli, tipear(campo('PPJyQ', 3), '4'));
  r = await evaluar(cli, `document.getElementById('stgE_PPJyQ').textContent`);
  chk(/cuadra/.test(r), 'PPJyQ: Ustariz vacío queda como estaba (2) y Moresco 4: «cuadra»', r);

  /* 5. Revisar no escribe. */
  r = JSON.parse(await evaluar(cli, `(async () => { stgRevisar(); var t0=Date.now();
    while (Date.now()-t0<5000 && !document.querySelector('#stgRev .stg-btn')) await new Promise(r=>setTimeout(r,100));
    return JSON.stringify({ posts: JSON.parse(${cargas}), rev: document.getElementById('stgRev').textContent, guardar: !!document.querySelector('#stgRev .stg-btn'),
      revisarVisible: getComputedStyle(document.getElementById('stgBtnRev')).display !== 'none' }); })()`));
  const b1 = r.posts[0] || {};
  chk(r.posts.length === 1 && b1.previa === true && b1.proveedor === 'Sevuchitas', 'Revisar manda UNA vista previa (previa:true)', r.posts);
  chk((b1.filas || []).length === 2 && !b1.filas.some(f => f.a === 'EV'), 'viajan las dos filas tocadas; la que no se tocó no', b1.filas);
  const fP = (b1.filas || []).filter(f => f.a === 'PPJyQ')[0] || {};
  chk(fP.recibido === 4 && fP.final && fP.final.ustariz === 2 && fP.final.moresco === 4 && fP.inicialVisto && fP.inicialVisto.ustariz === 2, 'PPJyQ viaja con Ustariz = 2 (como estaba) y el «había» que se mostró', fP);
  chk(b1.depositoPedidos === 'ustariz' && b1.ocurrio === undefined, 'viaja el freezer de los pedidos (el del usuario) y sin hora (recién)', b1);
  chk(r.guardar && !r.revisarVisible && /pasan 3 de Ustariz a Moresco/.test(r.rev) && /llegaron 6 de 6 pedidos/.test(r.rev), 'muestra qué va a hacer y recién ahí ofrece Guardar', r.rev);

  /* Para mirarla: FOTO=carpeta guarda una captura con la revisión abierta. */
  if (process.env.FOTO) {
    const f = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const d = (f && f.data) || (f && f.result && f.result.data);
    if (d) require('fs').writeFileSync(require('path').join(process.env.FOTO, 'carga_' + ANCHO + '.png'), Buffer.from(d, 'base64'));
  }

  /* 6. Tocar un numero despues de revisar esconde el Guardar. */
  await evaluar(cli, tipear(campo('PPM', 3), '5'));
  r = await evaluar(cli, `JSON.stringify({ g: !!document.querySelector('#stgRev .stg-btn'), rv: getComputedStyle(document.getElementById('stgBtnRev')).display !== 'none' })`);
  chk(r === '{"g":false,"rv":true}', 'cambiar un número después de revisar saca el Guardar: hay que revisar de nuevo', r);
  await evaluar(cli, tipear(campo('PPM', 3), '6'));

  /* 7. Guardar. */
  r = JSON.parse(await evaluar(cli, `(async () => { stgRevisar(); var t0=Date.now();
    while (Date.now()-t0<5000 && !document.querySelector('#stgRev .stg-btn')) await new Promise(r=>setTimeout(r,100));
    document.querySelector('#stgRev .stg-btn').click();
    t0=Date.now(); while (Date.now()-t0<6000 && !/Carga guardada/.test(document.getElementById('stCarga').textContent)) await new Promise(r=>setTimeout(r,100));
    await new Promise(r=>setTimeout(r,400));
    var ps = JSON.parse(${cargas});
    return JSON.stringify({ ultimo: ps[ps.length-1], cuantos: ps.filter(function(b){return !b.previa;}).length, txt: document.getElementById('stgRev').textContent,
      campos: [].map.call(document.querySelectorAll('#stCarga .stg-in'), function(e){ return e.value; }).join(''), grillas: window.__gets.filter(function(a){return a==='cargaGrilla';}).length }); })()`));
  chk(r.cuantos === 1 && r.ultimo.previa === false && /^cg_\d+_/.test(r.ultimo.clientOpId || '') && r.ultimo.filas.length === 2, 'Guardar manda UNA carga, con clientOpId y las mismas filas', r.ultimo);
  chk(/Carga guardada/.test(r.txt) && /CM-20261016/.test(r.txt), 'dice que se guardó, con el número de carga', r.txt);
  chk(r.campos === '' && r.grillas >= 2, 'limpia lo cargado y vuelve a traer la grilla', r);

  /* 8. Llegó de más. */
  r = JSON.parse(await evaluar(cli, `(async () => { stgProvElegir('Le Unike'); await new Promise(r=>setTimeout(r,200));
    return JSON.stringify({ filas: [].map.call(document.querySelectorAll('#stCarga .stg-row'), function(x){ return x.id; }), sel: !!document.querySelector('#stCarga .stg-sel') }); })()`));
  chk(r.filas.join() === 'stgR_SL,stgR_SCo' && r.sel === false, 'Le Unike: sus dos productos, y sin la pregunta del freezer (no hay nada de clientes)', r);
  await evaluar(cli, tipear(campo('SL', 1), '1'));
  await evaluar(cli, tipear(campo('SL', 2), '4'));
  r = JSON.parse(await evaluar(cli, `(async () => { stgRevisar(); var t0=Date.now();
    while (Date.now()-t0<5000 && !document.querySelector('#stgRev .stg-preg')) await new Promise(r=>setTimeout(r,100));
    var q = document.querySelector('#stgRev .stg-preg');
    return JSON.stringify({ txt: q ? q.textContent : '', botones: q ? [].map.call(q.querySelectorAll('button'), function(b){ var r=b.getBoundingClientRect(); return b.textContent+' '+Math.round(r.height); }) : [],
      guardar: !!document.querySelector('#stgRev .stg-btn') }); })()`));
  chk(/Llegó 1 de más de Sorrentinos Langostinos/.test(r.txt) && /le debés a Le Unike/.test(r.txt) && /\$17\.100/.test(r.txt) && /te debían/.test(r.txt), 'pregunta con el producto, el proveedor y el costo ($17.100)', r.txt);
  chk(r.botones.length === 2 && r.botones.every(x => Number(x.split(' ').pop()) >= PISO) && r.guardar === false, 'dos respuestas tocables, y sin Guardar hasta contestar', r);
  r = JSON.parse(await evaluar(cli, `(async () => { stgRta('SL','debian'); var t0=Date.now();
    while (Date.now()-t0<5000 && !document.querySelector('#stgRev .stg-btn')) await new Promise(r=>setTimeout(r,100));
    var ps = JSON.parse(${cargas}); return JSON.stringify({ ultimo: ps[ps.length-1], txt: document.getElementById('stgRev').textContent, guardar: !!document.querySelector('#stgRev .stg-btn') }); })()`));
  const fS = ((r.ultimo || {}).filas || [])[0] || {};
  chk(r.ultimo.previa === true && fS.a === 'SL' && fS.deMas && fS.deMas.que === 'debian', 'la respuesta viaja en la fila (deMas.que = debian) y se revisa de nuevo', r.ultimo);
  chk(r.guardar && /te lo debían/.test(r.txt) && /no suma deuda/.test(r.txt), 'dice que no suma deuda y ofrece Guardar', r.txt);
  await evaluar(cli, tipear(campo('SL', 1), '2'));
  r = JSON.parse(await evaluar(cli, `(async () => { stgRevisar(); await new Promise(r=>setTimeout(r,500)); var ps = JSON.parse(${cargas}); return JSON.stringify(ps[ps.length-1].filas[0]); })()`));
  chk(r.recibido === 2 && r.deMas === undefined, 'si cambia cuánto llegó, la respuesta anterior se olvida: se pregunta de nuevo', r);

  /* 9. Cargar después: «había» pasa a ser lo de esa hora. */
  r = JSON.parse(await evaluar(cli, `(async () => { stgProvElegir('Sevuchitas'); await new Promise(r=>setTimeout(r,200));
    var antes = document.querySelector('#stgR_PPM label:nth-of-type(2) input').placeholder;
    var h = document.querySelector('#stCarga .stg-hora'); h.value = '00:01'; h.dispatchEvent(new Event('change',{bubbles:true}));
    var t0=Date.now(); while (Date.now()-t0<5000 && document.querySelector('#stgR_PPM label:nth-of-type(2) input').placeholder === antes) await new Promise(r=>setTimeout(r,100));
    var ps = JSON.parse(${cargas});
    return JSON.stringify({ antes: antes, despues: document.querySelector('#stgR_PPM label:nth-of-type(2) input').placeholder, ultimo: ps[ps.length-1],
      sub: document.querySelector('#stgR_PPM .stg-n').textContent }); })()`));
  chk(r.antes === '5' && r.despues === '7', 'con una hora pasada el número gris de Ustariz pasa de 5 a 7 (lo que había a esa hora)', r);
  chk(r.ultimo.previa === true && r.ultimo.filas.length === 0 && r.ultimo.ocurrio > 0 && r.ultimo.ocurrio < Date.now(), 'lo pide con una vista previa sin filas y la hora elegida', r.ultimo);
  chk(/después: −2 en Ustariz/.test(r.sub), 'y dice qué se movió después («−2 en Ustariz»)', r.sub);

  /* 10. Nada salió a producción y no hubo errores propios. */
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ err: (window.__err||[]).filter(function(e){ return /stg|carga|Carga/i.test(e); }), otros: window.__posts.filter(function(b){ return !b || b.action !== 'cargaGuardar'; }).length, afuera: window.__afuera.length })`));
  chk(r.err.length === 0, 'sin errores de la pantalla en la consola', r.err);
  console.log('         (POST que no eran de la carga, contestados por el simulador: ' + r.otros + ' · pedidos a otros dominios frenados: ' + r.afuera + ')');

  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
