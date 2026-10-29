/* EL ALTA DIRECTO A LA BASE (287, 29/10/2026): `_ordenDirecta(data, ctl, 'altaPedido')` del panel y `_rutAltaDirecta`
   de Ruta, sacadas del app.html COMPILADO tal cual. Sin navegador y sin red: la base y Apps Script son de mentira.
   node _tools/pruebas/probar_alta_directa.js [--reinyectar]
   Sostiene:
     · con ALTA_DIRECTO apagada ni se llama a la base (va por Apps Script);
     · prendida: llama a pedido_alta_directo SIN token y SIN action (la base frena un alta con action), y lo que contesta
       la base llega tal cual (ok, n, ref, diferida);
     · `directo:false`, 404, 401 y un corte de red → null: Ruta va por Apps Script con el mismo clientOrderId;
     · las otras directas siguen por su `action`;
     · npGuardar pasa por `_rutAltaDirecta` antes de Apps Script.
   --reinyectar: el app.html con `_ordenDirecta` de antes (sin el tercer argumento): la prueba lo tiene que agarrar. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RAIZ = path.join(__dirname, '..', '..');
let html = fs.readFileSync(path.join(RAIZ, 'app.html'), 'utf8');
if (process.argv[2] === '--reinyectar') html = html.replace("function _ordenDirecta(body,ctl,accion){\r\n  var a=accion||(body&&body.action)", "function _ordenDirecta(body,ctl,accion){\r\n  var a=(body&&body.action)")
  .replace("function _ordenDirecta(body,ctl,accion){\n  var a=accion||(body&&body.action)", "function _ordenDirecta(body,ctl,accion){\n  var a=(body&&body.action)");
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 500))); };
const bloque = (pre) => { const i = html.indexOf(pre); if (i < 0) throw new Error('no está: ' + pre); let d = 0, j = html.indexOf('{', i); for (; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) break; } return html.slice(i, j + 1); };
const iMapa = html.indexOf('var ORD_DIRECTAS_RPC={'), mapa = html.slice(iMapa, html.indexOf('};', iMapa) + 2);
const G = { Promise, JSON, Object, TypeError, console }; vm.createContext(G);
vm.runInContext(`var __pal = {}, __envios = [], __resp = 'ok', window = {};
  function _palancaVal(k) { return k === 'directas' ? __pal : undefined; }
  function _sbPermiso() { return Promise.resolve({ url: 'https://base', key: 'k', token: 't' }); }
  function Response(b, o) { this.status = o && o.status || 200; this.ok = this.status < 300; this._b = b; }
  Response.prototype.json = function () { return Promise.resolve(JSON.parse(this._b)); };
  function fetch(u, x) {
    var m = /\\/rpc\\/(\\w+)$/.exec(u), p = JSON.parse(x.body).p; __envios.push({ fn: m && m[1], p: p });
    if (__resp === 'corte') return Promise.reject(new TypeError('Failed to fetch'));
    if (/^\\d+$/.test(__resp)) return Promise.resolve(new Response('{}', { status: Number(__resp) }));
    var d = __resp === 'nodirecto' ? { ok: false, directo: false, motivo: 'piezas' } : { ok: true, n: 2401, ref: 'Home #2401', aceptada: true, diferida: true, oc: 'diferida', directo: true };
    return Promise.resolve(new Response(JSON.stringify(d), { status: 200 }));
  }
  ${mapa}
  ${bloque('function _ordenDirectaOn(')}
  ${bloque('function _ordenDirecta(')}
  ${bloque('function _rutAltaDirecta(')}`, G);
const alta = { canal: 'Home', clientOrderId: 'np-1', items: [{ id: 5, qty: 2 }], total: 23000, token: 'secreto', __interno: 1 };
(async () => {
  const run = async (pal, resp, f) => { vm.runInContext(`__pal = ${JSON.stringify(pal)}; __resp = ${JSON.stringify(resp)}; __envios = [];`, G); const r = await f(); return { r, env: JSON.parse(JSON.stringify(G.__envios)) }; };
  let x = await run({}, 'ok', () => G._rutAltaDirecta(alta));
  chk('ALTA_DIRECTO apagada: null y ni se llama a la base', x.r === null && x.env.length === 0, x);
  x = await run({ altaPedido: true }, 'ok', () => G._rutAltaDirecta(alta));
  chk('prendida: pedido_alta_directo, sin token, sin action, sin lo interno', x.env.length === 1 && x.env[0].fn === 'pedido_alta_directo' && !('token' in x.env[0].p)
    && !('action' in x.env[0].p) && !('__interno' in x.env[0].p) && x.env[0].p.clientOrderId === 'np-1', x.env);
  chk('la respuesta de la base llega tal cual (n, ref, diferida)', x.r && x.r.n === 2401 && x.r.ref === 'Home #2401' && x.r.diferida === true, x.r);
  for (const resp of ['nodirecto', '404', '401', 'corte']) {
    x = await run({ altaPedido: true }, resp, () => G._rutAltaDirecta(alta));
    chk(`la base contesta ${resp}: null (Ruta va por Apps Script con el mismo id)`, x.r === null && x.env.length === 1, x);
  }
  x = await run({ altaPedido: true }, 'ok', () => G._ordenDirecta({ action: 'marcarEntregado', hoja: 'Home', id: '1' }));
  chk('prender el alta no prende la entrega', x.r === null && x.env.length === 0, x);
  x = await run({ marcarEntregado: true }, 'ok', () => G._ordenDirecta({ action: 'marcarEntregado', hoja: 'Home', id: '1' }));
  chk('las otras directas siguen por su action', x.env.length === 1 && x.env[0].fn === 'pedido_entregar_directo', x.env);
  const ng = bloque('function npGuardar(');
  chk('npGuardar pasa por _rutAltaDirecta antes de Apps Script', /_rutAltaDirecta\(data,_npCtrl\)[\s\S]*fetch\(RUT_APPS_SCRIPT_URL,_npOpts\)/.test(ng));
  console.log(`\n${ok} ok · ${mal} MAL`);
  process.exit(mal ? 1 : 0);
})();
