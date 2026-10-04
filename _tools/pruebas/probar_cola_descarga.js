/* Una descarga que entra por la COLA de reintentos también avisa (4/10/2026).

   node _tools/pruebas/probar_cola_descarga.js [ruta/al/ruta.html]

   POR QUE EXISTE (hallazgo de Codex sobre v505). Si "Descargué todo" no
   recibía respuesta, el payload iba a `syncQueue`. Cuando el reintento volvía
   con ok:true, `processSyncQueue` lo sacaba de la cola y no miraba nada más:
   un movimiento de stock que falló (`stockErr`) o un reparto a Lucas que no se
   hizo pasaban callados justo en el caso más probable de que pasen.

   Corre sin navegador: saca `processSyncQueue` y `_rdepAvisosDescarga` del
   archivo, stubea fetch/alert/toast y mide qué se le mostró al usuario. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ARCHIVO = process.argv[2] || path.join(__dirname, '..', '..', 'ruta.html');
const SRC = fs.readFileSync(ARCHIVO, 'utf8').replace(/\r\n/g, '\n');
let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); }
};

/** Saca una `function nombre(...)` completa contando llaves. */
function sacar(src, nombre) {
  const i = src.indexOf('\nfunction ' + nombre + '(');
  if (i < 0) return null;
  let k = src.indexOf('{', i), n = 0, str = null;
  for (; k < src.length; k++) {
    const ch = src[k];
    if (str) { if (ch === '\\') { k++; continue; } if (ch === str) str = null; continue; }
    if (ch === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); continue; }
    if (ch === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k) + 1; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { str = ch; continue; }
    if (ch === '{') n++; else if (ch === '}') { n--; if (n === 0) break; }
  }
  return src.slice(i, k + 1);
}

const partes = ['processSyncQueue', '_rdepAvisosDescarga'].map((n) => [n, sacar(SRC, n)]);
const falta = partes.filter((p) => !p[1]).map((p) => p[0]);
chk('encuentro processSyncQueue y _rdepAvisosDescarga en ruta.html', falta.length === 0, falta);
if (falta.length) { console.log('\n' + ok + ' ok, ' + mal + ' mal'); process.exit(1); }

/** Corre la cola una vez con UN ítem y la respuesta dada. Devuelve lo mostrado. */
function correrCola(item, respuesta) {
  const vistos = { alerts: [], toasts: [] };
  const caja = {
    isOnline: true, syncQueue: [item], syncBusy: false, syncBackoffMs: 2000,
    _rutFirma: '', _cobFirma: '', rutHechas: [], _desRecientes: [],
    PROD_NAMES: { PMa: 'Pizzas Individuales — Margarita' },
    RUT_APPS_SCRIPT_URL: 'x', AbortController: undefined,
    _armarGuardLoaderSync() {}, _limpiarGuardLoaderSync() {}, rutHideLoader() {},
    _armConfirmado() {}, _repConfirmado() {}, _cobConfirmado() {}, _estConfirmado() {}, saveLocal() {},
    document: { getElementById: () => ({ className: '' }) },
    console: { warn() {}, log() {} },
    alert: (t) => vistos.alerts.push(t),
    showToast: (t) => vistos.toasts.push(t),
    setTimeout: () => 0, clearTimeout: () => {},
    fetch: () => Promise.resolve({ json: () => Promise.resolve(respuesta) }),
  };
  vm.createContext(caja);
  vm.runInContext(partes.map((p) => p[1]).join('\n'), caja);
  caja.processSyncQueue();
  return new Promise((res) => setImmediate(() => setImmediate(() => res({ vistos, cola: caja.syncQueue }))));
}

const DESCARGA = { action: 'marcarGuardadoEnStock', rows: [4], aLucas: { PMa: 5 }, ts: 1 };

(async () => {
  console.log('\n== La cola recibe ok:true CON una falla de stock ==');
  let r = await correrCola(Object.assign({}, DESCARGA), {
    ok: true, n: 1, stockErr: [{ abbr: 'PMa', qty: 17, movido: 0, ref: 'OC-3', tipo: '+REC', err: 'timeout' }],
    repartoErr: [], repartoOmitido: '' });
  chk('sale de la cola', r.cola.length === 0, r.cola.length);
  chk('y el alert lo dice, con el producto y la OC',
    r.vistos.alerts.length === 1 && /Margarita/.test(r.vistos.alerts[0]) && /OC-3/.test(r.vistos.alerts[0]), r.vistos.alerts);

  console.log('\n== La cola recibe ok:true con el reparto salteado ==');
  r = await correrCola(Object.assign({}, DESCARGA), {
    ok: true, n: 0, stockErr: [], repartoErr: [], repartoOmitido: 'ya estaba guardado: el reparto no se repite' });
  chk('el toast dice que el reparto no se repitió', r.vistos.toasts.some((t) => /NO se repiti/.test(t)), r.vistos.toasts);

  console.log('\n== La cola recibe ok:true con un reparto que falló ==');
  r = await correrCola(Object.assign({}, DESCARGA), {
    ok: true, n: 1, stockErr: [], repartoErr: ['PMa: no hay suficiente'], repartoOmitido: '' });
  chk('el toast dice que no pudo repartir', r.vistos.toasts.some((t) => /NO pude repartir/.test(t)), r.vistos.toasts);

  console.log('\n== Todo bien: no molesta ==');
  r = await correrCola(Object.assign({}, DESCARGA), { ok: true, n: 1, stockErr: [], repartoErr: [], repartoOmitido: '' });
  chk('ni alert ni toast', r.vistos.alerts.length === 0 && r.vistos.toasts.length === 0, r.vistos);

  console.log('\n== Otra acción de la cola no dispara estos avisos ==');
  r = await correrCola({ action: 'marcarEntregado', hoja: 'Home', row: 5 }, {
    ok: true, stockErr: [{ abbr: 'PMa', qty: 1, ref: 'x', tipo: '-SAL', err: 'x' }] });
  chk('marcarEntregado con un stockErr ajeno: no muestra el aviso de descarga', r.vistos.alerts.length === 0, r.vistos);

  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
