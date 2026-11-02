/* MOVER PLATA DIRECTO A LA BASE (318, 2/11/2026): `guardarMoverLug` y `_ordenPost` del panel, sacadas del app.html
   COMPILADO tal cual. Sin navegador y sin red: la base, Apps Script y la pantalla son de mentira.
   node _tools/pruebas/probar_mover_directa.js [--reinyectar]
   Sostiene:
     · con MOVER_DIRECTO apagada, «Guardé $X» va a Apps Script como siempre;
     · prendida, va a caja_mover_directo con su clientOpId, sus cobros marcados y sin token; el ok cierra y recarga la caja;
     · el freno de la base («En lo sin guardar de Tadeo hay $…») llega a la pantalla tal cual y NO cae a Apps Script;
     · `directo:false` (palanca de la base, lugares sin arrancar) y un corte de red: Apps Script, con el MISMO cuerpo;
     · «Recibí de un representante» (cobrarVendedorRed) no va a caja_mover_directo.
   --reinyectar: el app.html con el fetch directo a Apps Script de antes: la prueba lo agarra. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RAIZ = path.join(__dirname, '..', '..');
let html = fs.readFileSync(path.join(RAIZ, 'app.html'), 'utf8');
if (process.argv[2] === '--reinyectar') html = html.replace(/_ordenPost\(payload\)(\s*\n\s*\.then\(function\(r\)\{return r\.json\(\);\}\))/, "fetch(API,{method:'POST',body:JSON.stringify(payload)})$1");
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + String(JSON.stringify(d)).slice(0, 500))); };
const bloque = (pre) => { const i = html.indexOf(pre); if (i < 0) throw new Error('no está: ' + pre); let d = 0, j = html.indexOf('{', i); for (; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) break; } return html.slice(i, j + 1); };
const iMapa = html.indexOf('var ORD_DIRECTAS_RPC={'), mapa = html.slice(iMapa, html.indexOf('};', iMapa) + 2);
const G = { Promise, JSON, Object, TypeError, Math, console }; vm.createContext(G);
vm.runInContext(`var __pal = {}, __envios = [], __resp = 'ok', __toasts = [], __cerro = 0, __recargo = 0, window = {}, API = 'https://apps';
  var __dom = { lugMvBtn: { disabled: false, textContent: 'Guardé $160.700' }, lugMvMonto: { value: '160700' }, lugMvNota: { value: '' },
                lugMvProv: { value: '' }, lugMvVendSel: { value: 'Rufino' } };
  function $(id) { return __dom[id]; }
  var _lugMv = { modo: '', desde: 'cob:Tadeo Ustariz', hacia: 'cf', quien: 'Tadeo Ustariz' };
  function parseM(v) { return Number(String(v).replace(/[^0-9.-]/g, '')) || 0; }
  function f$(n) { return String(n); }
  function _lugNombre(x) { return x; } function _lugCorto(x) { return x; }
  function _lugCobrosMarcados() { return ['Home|2148|1793'] ; }
  function _movClientOp() { return 'mov_prueba318'; } function _movClientOpLimpiar() {}
  function toast(t) { __toasts.push(t); } function cerrarMoverLug() { __cerro++; }
  function _pfAplicar() { return Promise.resolve(); } function _recargarCaja() { __recargo++; }
  function _palancaVal(k) { return k === 'directas' ? __pal : undefined; }
  function _ordenConfirmada() {}
  function _sbPermiso() { return Promise.resolve({ url: 'https://base', key: 'k', token: 't' }); }
  function Response(b, o) { this.status = o && o.status || 200; this.ok = this.status < 300; this._b = b; }
  Response.prototype.json = function () { return Promise.resolve(JSON.parse(this._b)); };
  function fetch(u, x) {
    var m = /\\/rpc\\/(\\w+)$/.exec(u), b = JSON.parse(x.body);
    __envios.push({ a: m ? m[1] : 'apps', p: m ? b.p : b });
    if (!m) return Promise.resolve(new Response(JSON.stringify({ ok: true, de: 'apps' }), { status: 200 }));
    if (__resp === 'corte') return Promise.reject(new TypeError('Failed to fetch'));
    var d = __resp === 'nodirecto' ? { ok: false, directo: false, motivo: 'palanca' }
      : __resp === 'frena' ? { ok: false, err: 'En lo sin guardar de Tadeo hay $160700' }
      : { ok: true, desde: b.p.desde, hacia: b.p.hacia, monto: b.p.monto, reserva: '', aceptada: true, diferida: true, directo: true, orden: 9 };
    return Promise.resolve(new Response(JSON.stringify(d), { status: 200 }));
  }
  ${mapa}
  ${bloque('function _ordenDirectaOn(')}
  ${bloque('function _ordenDirecta(')}
  ${bloque('function _ordenPost(')}
  ${bloque('function guardarMoverLug(')}`, G);
const espera = () => new Promise((r) => setTimeout(r, 20));
(async () => {
  const run = async (pal, resp, modo) => {
    vm.runInContext(`__pal = ${JSON.stringify(pal)}; __resp = ${JSON.stringify(resp)}; __envios = []; __toasts = []; __cerro = 0; __recargo = 0;
      __dom.lugMvBtn.disabled = false; _lugMv.modo = ${JSON.stringify(modo || '')};`, G);
    G.guardarMoverLug(); await espera();
    return JSON.parse(JSON.stringify({ env: G.__envios, toasts: G.__toasts, cerro: G.__cerro, recargo: G.__recargo }));
  };
  let x = await run({}, 'ok');
  chk('apagada: va a Apps Script', x.env.length === 1 && x.env[0].a === 'apps' && x.env[0].p.action === 'moverPlata' && x.cerro === 1, x);
  x = await run({ moverPlata: true }, 'ok');
  chk('prendida: va a caja_mover_directo con su clientOpId y los cobros marcados, sin token', x.env.length === 1 && x.env[0].a === 'caja_mover_directo'
    && x.env[0].p.clientOpId === 'mov_prueba318' && x.env[0].p.cobros === 'Home|2148|1793' && x.env[0].p.monto === 160700 && !('token' in x.env[0].p), x.env);
  chk('el ok de la base cierra el cuadro y recarga la caja', x.cerro === 1 && x.recargo === 1 && /cob:Tadeo Ustariz → cf/.test(x.toasts[0] || ''), x);
  x = await run({ moverPlata: true }, 'frena');
  chk('el freno de la base llega tal cual y no cae a Apps Script', x.env.length === 1 && x.env[0].a === 'caja_mover_directo' && x.cerro === 0
    && x.toasts[0] === 'No se movió: En lo sin guardar de Tadeo hay $160700', x);
  for (const resp of ['nodirecto', 'corte']) {
    x = await run({ moverPlata: true }, resp);
    chk(`la base contesta ${resp}: Apps Script con el mismo cuerpo`, x.env.length === 2 && x.env[1].a === 'apps' && x.env[1].p.clientOpId === 'mov_prueba318' && x.cerro === 1, x.env);
  }
  x = await run({ moverPlata: true }, 'ok', 'vendedor');
  chk('«Recibí de un representante» no va a caja_mover_directo', x.env.length === 1 && x.env[0].a === 'apps' && x.env[0].p.action === 'cobrarVendedorRed', x.env);
  console.log(`\n${ok} ok · ${mal} MAL`);
  process.exit(mal ? 1 : 0);
})();
