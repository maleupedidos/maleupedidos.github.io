/* EDITAR UN PEDIDO DIRECTO A LA BASE (315, 31/10/2026): `_ocPrevia` y `_ordenPost` del panel, sacadas del app.html
   COMPILADO tal cual. Sin navegador y sin red: la base y Apps Script son de mentira.
   node _tools/pruebas/probar_editar_directa.js [--reinyectar]
   Sostiene:
     · con EDITAR_DIRECTO apagada, la previa y el guardado van a Apps Script como siempre;
     · prendida: la previa va a pedido_editar_directo con `previa:true`, SIN clientOpId ni piezas, y el plan de la base
       llega a la pantalla; el guardado va a la base con su clientOpId y la respuesta llega tal cual;
     · `directo:false` (piezas, pesaje, devolución) y un corte de red: Apps Script, con el MISMO cuerpo;
     · guardarEditor guarda por `_ordenPost`.
   --reinyectar: el app.html con la previa y el guardado de antes (fetch directo a Apps Script): la prueba lo agarra. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RAIZ = path.join(__dirname, '..', '..');
let html = fs.readFileSync(path.join(RAIZ, 'app.html'), 'utf8');
if (process.argv[2] === '--reinyectar') html = html.replace('return _ordenPost(b).then(function(r){return r.json();})', 'return fetch(API,{method:\'POST\',body:JSON.stringify(b)}).then(function(r){return r.json();})')
  .replace(/_ordenPost\(_cuerpo\)\s*\n(\s*)\.then\(function\(r\)\{return r\.json\(\);\}\)/, "fetch(API,{method:'POST',body:JSON.stringify(_cuerpo)})\n$1.then(function(r){return r.json();})");
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + String(JSON.stringify(d)).slice(0, 500))); };
const bloque = (pre) => { const i = html.indexOf(pre); if (i < 0) throw new Error('no está: ' + pre); let d = 0, j = html.indexOf('{', i); for (; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) break; } return html.slice(i, j + 1); };
const iMapa = html.indexOf('var ORD_DIRECTAS_RPC={'), mapa = html.slice(iMapa, html.indexOf('};', iMapa) + 2);
const G = { Promise, JSON, Object, TypeError, console }; vm.createContext(G);
vm.runInContext(`var __pal = {}, __envios = [], __resp = 'ok', window = {}, API = 'https://apps';
  function _palancaVal(k) { return k === 'directas' ? __pal : undefined; }
  function _ordenConfirmada() {}
  function _sbPermiso() { return Promise.resolve({ url: 'https://base', key: 'k', token: 't' }); }
  function Response(b, o) { this.status = o && o.status || 200; this.ok = this.status < 300; this._b = b; }
  Response.prototype.json = function () { return Promise.resolve(JSON.parse(this._b)); };
  function fetch(u, x) {
    var m = /\\/rpc\\/(\\w+)$/.exec(u), b = JSON.parse(x.body);
    __envios.push({ a: m ? m[1] : 'apps', p: m ? b.p : b });
    if (!m) return Promise.resolve(new Response(JSON.stringify({ ok: true, ocTexto: 'de Apps Script', de: 'apps' }), { status: 200 }));
    if (__resp === 'corte') return Promise.reject(new TypeError('Failed to fetch'));
    var d = __resp === 'nodirecto' ? { ok: false, directo: false, motivo: 'piezas' }
      : b.p.previa ? { ok: true, ocTexto: '2× Ravioles sale del freezer' }
      : { ok: true, ocTexto: '2× Ravioles sale del freezer', aceptada: true, diferida: true, directo: true, orden: 9, baseEscribio: true };
    return Promise.resolve(new Response(JSON.stringify(d), { status: 200 }));
  }
  ${mapa}
  ${bloque('function _ordenDirectaOn(')}
  ${bloque('function _ordenDirecta(')}
  ${bloque('function _ordenPost(')}
  ${bloque('function _ocPrevia(')}`, G);
const prev = { action: 'editarPedido', hoja: 'Home', id: '2148', row: 1277, lineas: [{ a: 'RV', q: 2 }], clientOpId: 'x', piezas: { agregar: [] } };
const guardar = { action: 'editarPedido', hoja: 'Home', id: '2148', row: 1277, lineas: [{ a: 'RV', q: 2 }], formaPago: 'Efectivo', clientOpId: 'pf_1' };
(async () => {
  const run = async (pal, resp, f) => { vm.runInContext(`__pal = ${JSON.stringify(pal)}; __resp = ${JSON.stringify(resp)}; __envios = [];`, G); const r = await f(); return { r, env: JSON.parse(JSON.stringify(G.__envios)) }; };
  let x = await run({}, 'ok', () => G._ocPrevia(prev));
  chk('apagada: la previa va a Apps Script', x.r === 'de Apps Script' && x.env.length === 1 && x.env[0].a === 'apps', x);
  x = await run({ editarPedido: true }, 'ok', () => G._ocPrevia(prev));
  chk('prendida: la previa va a pedido_editar_directo con previa, sin clientOpId ni piezas', x.env.length === 1 && x.env[0].a === 'pedido_editar_directo'
    && x.env[0].p.previa === true && !('clientOpId' in x.env[0].p) && !('piezas' in x.env[0].p), x.env);
  chk('el plan de la base llega a la pantalla', x.r === '2× Ravioles sale del freezer', x.r);
  x = await run({ editarPedido: true }, 'nodirecto', () => G._ocPrevia(prev));
  chk('directo:false: la previa cae a Apps Script', x.r === 'de Apps Script' && x.env.length === 2 && x.env[1].a === 'apps' && x.env[1].p.previa === true, x.env);
  x = await run({ editarPedido: true }, 'ok', () => G._ordenPost(guardar).then(r => r.json()));
  chk('prendida: el guardado va a la base con su clientOpId y la respuesta llega tal cual', x.env.length === 1 && x.env[0].a === 'pedido_editar_directo'
    && x.env[0].p.clientOpId === 'pf_1' && x.r.diferida === true && x.r.baseEscribio === true && x.r.ocTexto === '2× Ravioles sale del freezer', x);
  for (const resp of ['nodirecto', 'corte']) {
    x = await run({ editarPedido: true }, resp, () => G._ordenPost(guardar).then(r => r.json()));
    chk(`la base contesta ${resp}: Apps Script con el mismo cuerpo`, x.env.length === 2 && x.env[1].a === 'apps' && x.env[1].p.clientOpId === 'pf_1' && x.r.de === 'apps', x.env);
  }
  const ge = bloque('function guardarEditor(');
  chk('guardarEditor guarda por _ordenPost', /_ordenPost\(_cuerpo\)\s*\n\s*\.then\(function\(r\)\{return r\.json\(\);\}\)/.test(ge));
  console.log(`\n${ok} ok · ${mal} MAL`);
  process.exit(mal ? 1 : 0);
})();
