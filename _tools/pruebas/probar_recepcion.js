/**
 * Recepción sin quilombo (16/10/2026): las tres pantallas, en un Chrome de verdad.
 *
 *   node probar_recepcion.js [390|1440] [puerto]
 *
 * Sin token y SIN tocar producción: todo pedido al backend se intercepta y los
 * datos son inventados con la forma que devuelve el backend (las decisiones del
 * backend se prueban en `estancias/_tools/probar_recepcion_reparto.js`).
 *
 *   1. CARGA: con «Ideal Ustariz» los freezers se llenan solos con el reparto,
 *      «Si llega lo pedido, a Moresco…» se ve antes de tipear, y corregir un
 *      freezer recalcula el otro.
 *   2. Abastecimiento › Recibir: el bloque «Qué va a Moresco» con el número
 *      editable, y la recepción viaja con `pases`.
 *   3. Ruta: «📥 Llegó Sevuchitas» abre Recibir de ese proveedor.
 *   4. Ruta: la bolsa con carne pide «Va / No va» por pieza, no deja confirmar
 *      sin decidir todas, y viaja `carneNoVa`. Arriba de ARMADO aparece la carne
 *      pendiente con «Ya se la di», que manda `entregarCarnePendiente`.
 */
const { abrir, evaluar } = require('./cdp.js');

const ANCHO = Number(process.argv[2] || 390);
const PUERTO = Number(process.argv[3] || 8080);
let ok = 0, mal = 0;
const chk = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (x !== undefined ? '\n         -> ' + JSON.stringify(x).slice(0, 700) : '')); } };
const espera = ms => new Promise(r => setTimeout(r, ms));
const HOY = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz', dueno: 'Tadeo Ustariz', user: 'tadeo' }, { id: 'moresco', nombre: 'Deposito Moresco', dueno: 'Lucas Moresco', user: 'luqui' }];
/* PPM: hay 9 en Ustariz, 2 reservados → libre 7; ideal 22 → faltan 15; llegan 35 → 20 a Moresco. */
const GRILLA = { ok: true, ts: 1, apartado: 'si', guardar: true, deps: DEPS,
  proveedores: [{ nombre: 'Sevuchitas', productos: [
    { a: 'PPM', n: 'Pack Pizzas x2 Muzzarella', u: 'u', ini: { ustariz: 9, moresco: 0 }, ped: { dep: 35, cli: 0, de: [] }, ap: {}, apDe: [], res: { ustariz: 2, moresco: 0 }, ideal: { ustariz: 22 }, dep: 'ustariz' },
    { a: 'EV', n: 'Empanadas Verdura x8', u: 'u', ini: { ustariz: 4, moresco: 0 }, ped: { dep: 6, cli: 0, de: [] }, ap: {}, apDe: [], res: { ustariz: 0, moresco: 0 }, ideal: {}, dep: 'ustariz' }] }] };
const BUSQ = { semActual: 42, clientes: [], total: 0,
  provs: [{ n: 'Sevuchitas', cats: [{ cat: 'Pack Pizzas x2', items: [{ a: 'PPM', v: 'Muzzarella', q: 35, ct: 315000, sem: 42, qDep: 35 }] },
                                    { cat: 'Empanadas', items: [{ a: 'EV', v: 'Verdura', q: 6, ct: 60000, sem: 42, qDep: 6 }] }] }],
  ocs: [{ r: 10, oc: 'OC-1', prov: 'Sevuchitas', prod: 'Pack Pizzas x2 — Muzzarella', abbr: 'PPM', q: 35, est: 'Pedido', sem: 42, cliente: 'Tadeo — Stock', canal: 'Deposito', nped: '' },
        { r: 11, oc: 'OC-2', prov: 'Sevuchitas', prod: 'Empanadas — Verdura', abbr: 'EV', q: 6, est: 'Pedido', sem: 42, cliente: 'Tadeo — Stock', canal: 'Deposito', nped: '' }] };
const CATALOGO = { ts: 1, deps: DEPS, proveedores: ['Sevuchitas'], productos: { Sevuchitas: [
  { a: 'PPM', n: 'Pack Pizzas x2 — Muzzarella', cat: 'Pack Pizzas x2', c: 9000, s: 7, u: 'u', dem: 10, wk: [10, 10, 10], dep: 'ustariz', pd: { ustariz: 9, moresco: 0 }, pr: { ustariz: 2, moresco: 0 }, idl: { ustariz: 22 } },
  { a: 'EV', n: 'Empanadas — Verdura', cat: 'Empanadas', c: 10000, s: 4, u: 'u', dem: 2, wk: [2, 2, 2], dep: 'ustariz', pd: { ustariz: 4, moresco: 0 }, pr: {}, idl: {} }] } };
const ROJO = { id: 121, h: 'Red', r: 2, c: 'Pia Raimondo', t: '', d: 'Rufino Ardanaz · Pia Raimondo', b: 'Rufino Ardanaz', sb: 'Rufino Ardanaz', l: '',
  de: '', fe: HOY, es: 'Pendiente', o: 'Deposito', fp: '', ep: '', $: 90000, p: [{ a: 'PPM', q: 2 }, { a: 'CPi', q: 1.215 }, { a: 'CBC', q: 3.215 }],
  oD: {}, retira: 'Rufino Ardanaz', hr: '', f: '', pz: [{ a: 'CPi', id: 'PZ-1', kg: 1.215 }, { a: 'CBC', id: 'PZ-2', kg: 3.215 }] };
const ENTREGAS = { ts: Date.now(), e: [ROJO], prods: { CPi: { n: 'Carne Picaña', u: 'kg' }, CBC: { n: 'Carne Bife de Chorizo', u: 'kg' } }, saldos: {}, cuentas: [], arm: {}, rep: {}, reps: [], hechas: [],
  carnePend: [{ id: 118, h: 'Red', r: 5, c: 'Juana Pérez', b: 'Fini Mihailovitch', fe: HOY, pz: [{ a: 'CVa', id: 'PZ-7', kg: 2.1 }] }] };

const PREP = `
  try { localStorage.clear(); localStorage.setItem('maleu_token','prueba');
    localStorage.setItem('maleu_panel_session', JSON.stringify({ usuario: 'tadeo', rol: 'admin', nombre: 'Tadeo Ustariz', ts: Date.now() }));
    localStorage.setItem('maleu_busqueda', JSON.stringify({ busqueda: ${JSON.stringify(BUSQ)}, catalogo: ${JSON.stringify(CATALOGO)}, syncQueue: [], marcadosPedido: {}, marcadosRecibido: {}, waCopied: {}, armadoChecked: {}, ts: Date.now() }));
  } catch (e) {}
  window.__err = []; window.addEventListener('error', function (e) { window.__err.push(String(e.message)); });
  window.__posts = []; window.__afuera = [];
  window.confirm = function () { return true; }; window.alert = function (m) { (window.__alerts = window.__alerts || []).push(String(m)); };
  function __resp(o) { return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
  (function () { var o = window.fetch; window.fetch = function (u, x) {
    var url = String(u || '');
    if (!/script\\.google(usercontent)?\\.com/.test(url)) {
      if (/^https?:/.test(url) && url.indexOf(location.origin) !== 0) { window.__afuera.push(url.slice(0, 80)); return __resp({ ok: false }); }
      return o.apply(this, arguments);
    }
    if (x && String(x.method || '').toUpperCase() === 'POST') {
      var b = null; try { b = JSON.parse(x.body); } catch (e) { b = { crudo: String(x.body) }; }
      window.__posts.push(b);
      if (b && b.action === 'recibirMercaderia') return __resp({ ok: true, updated: 2, avisos: [], pases: (b.pases || []).map(function (p) { return { abbr: p.abbr, cant: p.cant, hacia: p.hacia, ok: true }; }) });
      if (b && b.action === 'marcarEntregadoAVendedor') return __resp({ ok: true, n: 1, carnePendiente: (b.carneNoVa || []).length });
      if (b && b.action === 'entregarCarnePendiente') return __resp({ ok: true, n: 1, kg: 2.1, quedan: 0 });
      return __resp({ ok: false, error: 'prueba' });
    }
    var act = (url.match(/action=([A-Za-z]+)/) || [])[1] || '';
    if (act === 'cargaGrilla') return __resp(${JSON.stringify(GRILLA)});
    if (act === 'entregas') { var en = ${JSON.stringify(ENTREGAS)};
      if (window.__posts.some(function (b) { return b && b.action === 'entregarCarnePendiente'; })) en.carnePend = [];
      return __resp(en); }
    if (act === 'busqueda') return __resp(${JSON.stringify(BUSQ)});
    if (act === 'catalogo') return __resp(${JSON.stringify(CATALOGO)});
    return __resp({ ok: false, error: 'prueba' });
  }; })();
`;
const tipear = (sel, txt) => `(function(){ var e=document.querySelector(${JSON.stringify(sel)}); if(!e)return 'no esta'; e.focus(); e.value=${JSON.stringify(txt)}; e.dispatchEvent(new Event('input',{bubbles:true})); e.blur(); return 'ok'; })()`;
const posts = acc => `JSON.stringify(window.__posts.filter(function(b){return b&&b.action===${JSON.stringify(acc)};}))`;
const desborda = sel => `(function(){ var c=document.querySelector(${JSON.stringify(sel)}); if(!c)return 'no esta'; var f=[]; [].forEach.call(c.querySelectorAll('*'),function(e){var b=e.getBoundingClientRect(); if(b.width>0&&b.right>window.innerWidth+1)f.push(e.className||e.tagName);}); return JSON.stringify({fuera:f.slice(0,4), scrollX:document.documentElement.scrollWidth-window.innerWidth}); })()`;

async function pagina(url) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
  await cli.enviar('Page.navigate', { url });
  await espera(2500);
  const listo = await evaluar(cli, `(async () => { const t0 = Date.now();
    while (Date.now() - t0 < 40000) { if (typeof window.go === 'function' && typeof window.renderStCarga === 'function') return 'listo';
      await new Promise(r => setTimeout(r, 200)); } return 'el ERP no arranco'; })()`);
  if (listo !== 'listo') { console.log('  MAL  ' + listo); process.exit(1); }
  return cli;
}
const hasta = (cli, expr, ms) => evaluar(cli, `(async () => { const t0 = Date.now(); while (Date.now() - t0 < ${ms || 15000}) { try { if (${expr}) return true; } catch (e) {} await new Promise(r => setTimeout(r, 150)); } return false; })()`);

(async () => {
  console.log('\n== Recepción sin quilombo · ' + ANCHO + 'px ==\n');
  const base = 'http://localhost:' + PUERTO + '/app.html?prueba=1&carga=1';
  const cli = await pagina(base);
  /* El confirm de ?prueba=1 lo pone servir.js y contesta «no»: se prende acá (memoria el-confirm-lo-responde-servir-js). */
  await evaluar(cli, `window.__confirmDevuelve=true; window.__confirms=[]; window.__avisos=[]; 1`);

  /* ── 1. CARGA con el ideal ── */
  await evaluar(cli, `(function(){ go('stock'); stSwitchTab('carga'); })()`);
  await hasta(cli, `document.querySelector('#stCarga .stg-row')`);
  let r = JSON.parse(await evaluar(cli, `JSON.stringify({ tot: (document.getElementById('stgRepTot')||{}).textContent||'', sub: (document.getElementById('stgRep_PPM')||{}).textContent||'', subEV: (document.getElementById('stgRep_EV')||{}).textContent||'' })`));
  chk(/Si llega lo pedido, a Moresco: 20 Pack Pizzas x2 Muzzarella/.test(r.tot), 'antes de tipear: «Si llega lo pedido, a Moresco: 20 Pack…»', r);
  chk(/ideal Ustariz 22 \(libre 7\)/.test(r.sub) && /20 a Moresco/.test(r.sub), 'la fila dice el ideal, lo libre y cuánto va a Moresco', r.sub);
  chk(r.subEV === '', 'un producto sin ideal no dice nada', r.subEV);
  await evaluar(cli, tipear('#stgR_PPM label:nth-of-type(1) input', '35'));
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ us: document.getElementById('stgF_PPM_ustariz').value, mo: document.getElementById('stgF_PPM_moresco').value, e: document.getElementById('stgE_PPM').textContent, tot: document.getElementById('stgRepTot').textContent })`));
  chk(r.us === '24' && r.mo === '20' && /cuadra/.test(r.e), 'llegaron 35: Ustariz 9+15 = 24, Moresco 20, y cuadra', r);
  chk(/^.*A Moresco: 20 Pack/.test(r.tot) && !/Si llega/.test(r.tot), 'el total pasa a decir lo que llegó', r.tot);
  await evaluar(cli, tipear('#stgR_PPM label:nth-of-type(1) input', '10'));
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ us: document.getElementById('stgF_PPM_ustariz').value, mo: document.getElementById('stgF_PPM_moresco').value, tot: document.getElementById('stgRepTot').textContent })`));
  chk(r.us === '19' && r.mo === '0' && r.tot === '', 'llegaron 10 (menos que lo que falta para el ideal): todo a Ustariz', r);
  await evaluar(cli, tipear('#stgR_PPM label:nth-of-type(1) input', '35'));
  await evaluar(cli, tipear('#stgR_PPM label:nth-of-type(3) input', '13'));
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ us: document.getElementById('stgF_PPM_ustariz').value, e: document.getElementById('stgE_PPM').textContent, sub: document.getElementById('stgRep_PPM').textContent })`));
  chk(r.us === '31' && /cuadra/.test(r.e) && /13 a Moresco/.test(r.sub), 'puse Moresco 13: Ustariz se recalcula a 31, cuadra y la fila dice 13', r);
  r = JSON.parse(await evaluar(cli, desborda('#stCarga')));
  chk(r.fuera.length === 0 && r.scrollX <= 1, 'CARGA: nada desborda a lo ancho', r);

  /* ── 2. Abastecimiento › Recibir ── */
  await evaluar(cli, `go('busqueda')`);
  await hasta(cli, `typeof window.abaAbrirRecibir==='function'`, 20000);
  await espera(1500);
  r = await evaluar(cli, `window.abaAbrirRecibir('Sevuchitas')`);
  await hasta(cli, `document.querySelector('.recibir-panel.open #recMor_0_0')`, 10000);
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ abierto: !!document.querySelector('.recibir-panel.open'), mor: (document.getElementById('recMor_0_0')||{}).value, ev: !!document.getElementById('recMor_0_1'), pie: (document.getElementById('recRepPie_0')||{}).textContent||'' })`));
  chk(r.abierto === true, 'abaAbrirRecibir abre el panel de Sevuchitas', r);
  chk(r.mor === '20' && r.ev === false, 'Qué va a Moresco: PPM 20; EV sin ideal no aparece', r);
  chk(/Separá: 20 PPM/.test(r.pie), 'el pie dice qué separar', r.pie);
  await evaluar(cli, tipear('#recQty_0_0', '30'));
  r = await evaluar(cli, `(document.getElementById('recMor_0_0')||{}).value`);
  chk(r === '15', 'llegaron 30: el reparto se recalcula a 15', r);
  await evaluar(cli, tipear('#recMor_0_0', '13'));
  await evaluar(cli, tipear('#recQty_0_0', '35'));
  r = await evaluar(cli, `(document.getElementById('recMor_0_0')||{}).value`);
  chk(r === '13', 'lo que corregí a mano no se pisa al cambiar la cantidad', r);
  r = JSON.parse(await evaluar(cli, desborda('#p-busqueda .recibir-panel.open')));
  chk(r.fuera.length === 0 && r.scrollX <= 1, 'Recibir: nada desborda a lo ancho', r);
  await evaluar(cli, `confirmarRecibir(0, document.querySelector('.recibir-panel.open .btn-confirmar-recibir'))`);
  await hasta(cli, `window.__posts.some(function(b){return b&&b.action==='recibirMercaderia';})`, 10000);
  r = JSON.parse(await evaluar(cli, posts('recibirMercaderia')));
  const rec = r[0] || {};
  chk(rec.pases && rec.pases.length === 1 && rec.pases[0].abbr === 'PPM' && rec.pases[0].cant === 13 && rec.pases[0].hacia === 'moresco',
    'la recepción viaja con pases [{PPM, 13, moresco}]', rec.pases);
  chk((rec.groups || []).length === 2 && rec.groups[0].qtyRecibida === 35, 'y con lo recibido de siempre', rec.groups);

  /* ── 3 y 4. Ruta ── */
  await evaluar(cli, `go('ruta')`);
  await hasta(cli, `typeof window.entregarAVendedor==='function' && document.getElementById('rutLlegan')`, 20000);
  await espera(2500);
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ ll: (document.getElementById('rutLlegan')||{}).textContent||'', vis: getComputedStyle(document.getElementById('rutLlegan')).display })`));
  chk(/Llegó/.test(r.ll) && /Sevuchitas/.test(r.ll) && r.vis !== 'none', 'arriba de Ruta: «📥 Llegó Sevuchitas»', r);
  await evaluar(cli, `(function(){ if(typeof switchTab==='function')switchTab('armado'); })()`);
  await hasta(cli, `document.querySelector('.rcp-box')`, 8000);
  r = await evaluar(cli, `(document.querySelector('.rcp-box')||{}).textContent||''`);
  chk(/Carne que no salió con la bolsa/.test(r) && /Fini/.test(r) && /2,100 kg/.test(r), 'ARMADO muestra la carne pendiente de la bolsa de Fini', r);
  await evaluar(cli, `document.querySelector('.rcp-btn').click()`);
  await hasta(cli, `window.__posts.some(function(b){return b&&b.action==='entregarCarnePendiente';})`, 8000);
  r = JSON.parse(await evaluar(cli, posts('entregarCarnePendiente')));
  chk(r.length === 1 && r[0].row === 5, '«Ya se la di» manda entregarCarnePendiente con la fila', r);
  r = await evaluar(cli, `!!document.querySelector('.rcp-box')`);
  chk(r === false, 'y el bloque se va', r);

  /* La bolsa con carne */
  await evaluar(cli, `entregarAVendedor('Red|R2','','Rufino Ardanaz')`);
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ t: (document.querySelector('.rcb-box')||{}).textContent||'', dis: (document.querySelector('.rcb-box .btn-si')||{}).disabled })`));
  chk(/Esta bolsa lleva carne/.test(r.t) && /Picaña/.test(r.t) && /3,215 kg/.test(r.t), 'marcar la bolsa abre «Esta bolsa lleva carne» con las dos piezas', r.t);
  chk(r.dis === true, 'sin decidir cada pieza no se puede confirmar', r);
  await evaluar(cli, `(function(){ var b=[].slice.call(document.querySelectorAll('.rcb-fila')); b.filter(function(f){return /Picaña/.test(f.textContent);})[0].querySelectorAll('.rcb-b')[0].click(); })()`);
  r = await evaluar(cli, `document.querySelector('.rcb-box .btn-si').disabled`);
  chk(r === true, 'con una sola decidida, sigue sin dejar', r);
  await evaluar(cli, `(function(){ var b=[].slice.call(document.querySelectorAll('.rcb-fila')); b.filter(function(f){return /Bife/.test(f.textContent);})[0].querySelectorAll('.rcb-b')[1].click(); })()`);
  r = JSON.parse(await evaluar(cli, `JSON.stringify({ dis: document.querySelector('.rcb-box .btn-si').disabled, txt: document.querySelector('.rcb-box .btn-si').textContent, av: (document.querySelector('.rcb-aviso')||{}).textContent||'' })`));
  chk(r.dis === false && /sin 1 pieza/.test(r.txt) && /se queda en el freezer/.test(r.av), 'Bife «No va»: «Le di la bolsa sin 1 pieza» y el aviso', r);
  r = JSON.parse(await evaluar(cli, `(function(){ var b=document.querySelector('.rcb-box'); var f=[]; [].forEach.call(b.querySelectorAll('button'),function(e){var x=e.getBoundingClientRect(); if(x.height<40-0.5)f.push(e.textContent+' '+Math.round(x.height));}); var bb=b.getBoundingClientRect(); return JSON.stringify({chicos:f, fuera: bb.right>window.innerWidth+1}); })()`));
  chk(r.chicos.length === 0 && !r.fuera, 'los botones de la carne miden 40 px o más y la caja entra', r);
  await evaluar(cli, `document.querySelector('.rcb-box .btn-si').click()`);
  await hasta(cli, `window.__posts.some(function(b){return b&&b.action==='marcarEntregadoAVendedor';})`, 8000);
  r = JSON.parse(await evaluar(cli, posts('marcarEntregadoAVendedor')));
  chk(r.length === 1 && JSON.stringify(r[0].carneNoVa) === '["PZ-2"]' && r[0].rows.join() === '2', 'viaja marcarEntregadoAVendedor con carneNoVa [PZ-2]', r);

  /* La puerta: Llegó → Recibir */
  await evaluar(cli, `go('ruta')`);
  await espera(800);
  await evaluar(cli, `(function(){ var b=document.querySelector('.rut-llegan-b'); if(b)b.click(); })()`);
  r = await hasta(cli, `document.querySelector('#p-busqueda .recibir-panel.open')`, 10000);
  chk(r === true, 'tocar «Sevuchitas» abre Abastecimiento › Recibir de ese proveedor', r);

  const err = JSON.parse(await evaluar(cli, `JSON.stringify(window.__err)`));
  chk(err.length === 0, 'cero errores de página', err);
  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log('  MAL  ' + (e && e.stack || e)); process.exit(1); });
