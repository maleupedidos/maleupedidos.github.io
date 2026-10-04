/* El confirm de "Descargué todo" dice cuánto suma de verdad (4/10/2026).

   node _tools/pruebas/probar_confirm_descarga.js [ruta/al/ruta.html]

   POR QUE EXISTE. El 4/10 la descarga mostraba 135 unidades y el confirm decía
   "Esto lo marca recibido: suma el stock y habilita el pago". Tadeo no se animó
   a tocarlo, con razón: las 16 filas ya estaban recibidas desde el viernes 2/10,
   su +REC ya estaba en el Kardex, y el botón sumaba CERO. El cartel mentía en la
   dirección que más asusta.

   Ahora el confirm dice una línea por producto, con la misma cuenta que hace el
   backend (`marcarGuardadoEnStock`): sin recibir suma lo contado; ya recibida
   suma solo la diferencia del conteo; lo que no es del freezer no mueve nada.

   Corre sin navegador y sin sesión: saca las funciones del archivo, stubea
   `confirm` para leer el mensaje y no manda nada. No toca producción. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ARCHIVO = process.argv[2] || path.join(__dirname, '..', '..', 'ruta.html');
const SRC = fs.readFileSync(ARCHIVO, 'utf8').replace(/\r\n/g, '\n');
const VER = '\x1b[32m', ROJO = '\x1b[31m', GRIS = '\x1b[90m', RST = '\x1b[0m';
let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ' + VER + 'ok ' + RST + t); }
  else { mal++; console.log('  ' + ROJO + 'MAL' + RST + ' ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }
};

/** Saca una `function nombre(...)` completa contando llaves (igual que
 *  probar_conteo_descarga.js): probar la copia del archivo, no una propia. */
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

function montar(src) {
  const nombres = ['_rdepAjustes', '_rdepFechaCorta', '_rdepEfecto', 'confirmarGuardadoStock'];
  const partes = nombres.map((n) => sacar(src, n));
  const falta = nombres.filter((n, i) => !partes[i]);
  if (falta.length) return { error: 'no encontre ' + falta.join(', ') };
  const m = /var _RDEP_DIAS=\[[^\]]*\];/.exec(src);
  if (!m) return { error: 'no encontre _RDEP_DIAS' };
  const caja = {
    pendientesGuardarStock: [], pendientesPedidosOC: [], _rdepConteo: {}, _rdepLucas: {},
    PROD_NAMES: {}, _ultimoConfirm: null, _posts: 0,
    confirm: function (t) { caja._ultimoConfirm = t; return false; },   // NO manda nada
    fetch: function () { caja._posts++; return new Promise(() => {}); },
    rutShowLoader: () => {}, rutHideLoader: () => {}, _rutaUser: () => 'test', RUT_APPS_SCRIPT_URL: 'x',
  };
  vm.createContext(caja);
  vm.runInContext(m[0] + '\n' + partes.join('\n'), caja);
  return { caja };
}

const { caja, error } = montar(SRC);
if (error) { console.log('  ' + ROJO + 'MAL' + RST + ' ' + error); process.exit(1); }

/** Abre el confirm con un escenario y devuelve el texto (sin mandar el POST). */
function leer(items, conteo, pedidos) {
  caja.pendientesGuardarStock = items;
  caja.pendientesPedidosOC = pedidos || [];
  caja._rdepConteo = conteo || {};
  caja._rdepLucas = {};
  caja._ultimoConfirm = null;
  const rows = [];
  items.forEach((i) => i.rows.forEach((r) => rows.push(r)));
  const tot = items.reduce((a, i) => a + i.qty, 0);
  caja.confirmarGuardadoStock(rows.join(','), items.length, tot, 0);
  return caja._ultimoConfirm || '';
}

/* Una línea del depósito como la manda el GET. */
const L = (abbr, prod, filas) => ({
  abbr, prod, qty: filas.reduce((a, f) => a + f.q, 0),
  rows: filas.map((f) => f.r), qtys: filas.map((f) => f.q),
  recs: filas.map((f) => (f.rec ? 1 : 0)), fRecs: filas.map((f) => f.rec || ''),
  mueve: filas.map((f) => (f.mueve === 0 ? 0 : 1)),
});

/* EL CASO REAL DEL 4/10/2026: las 16 filas, todas recibidas (13 el vie 02/10,
   las 3 tortas el dom 04/10), medidas en la hoja ese día. */
const V = '2026-10-02', D = '2026-10-04';
const REAL = [
  L('PPM', 'Pack Pizzas x2 — Muzzarella', [{ r: 1010, q: 20, rec: V }]),
  L('PPJyQ', 'Pack Pizzas x2 — Jamón y Queso', [{ r: 1011, q: 7, rec: V }]),
  L('PPCyQ', 'Pack Pizzas x2 — Cebolla y Queso', [{ r: 1012, q: 4, rec: V }]),
  L('ECaC', 'Empanadas — Carne a Cuchillo', [{ r: 1013, q: 20, rec: V }]),
  L('EJyQ', 'Empanadas — Jamón y Queso', [{ r: 1014, q: 15, rec: V }]),
  L('ECyQ', 'Empanadas — Cebolla y Queso', [{ r: 1015, q: 6, rec: V }]),
  L('EV', 'Empanadas — Verdura', [{ r: 1016, q: 3, rec: V }]),
  L('PMu', 'Pizzas Individuales — Muzzarella', [{ r: 1017, q: 3, rec: V }]),
  L('PMa', 'Pizzas Individuales — Margarita', [{ r: 1018, q: 6, rec: V }]),
  L('SQB', 'Sorrentinos — Queso Brie', [{ r: 1019, q: 1, rec: V }]),
  L('SCo', 'Sorrentinos — Cordero al Malbec', [{ r: 1021, q: 1, rec: V }]),
  L('SJyQ', 'Sorrentinos — Jamón y Queso', [{ r: 1022, q: 15, rec: V }]),
  L('SCa', 'Sorrentinos — Calabaza', [{ r: 1023, q: 9, rec: V }]),
  L('TG', 'Tortas — Golosa', [{ r: 964, q: 15, rec: D }]),
  L('TLC', 'Tortas — Lemon Crumble', [{ r: 965, q: 3, rec: D }]),
  L('TC', 'Tortas — Coco', [{ r: 966, q: 7, rec: D }]),
];

console.log('\n══ El confirm de "Descargué todo" ══\n');

console.log('1. El caso real del 4/10: 135 unidades, todas ya recibidas');
{
  const t = leer(REAL);
  console.log(GRIS + t.split('\n').map((l) => '       ' + l).join('\n') + RST);
  chk('ya NO dice "suma el stock"', t.indexOf('suma el stock') < 0, t.slice(-120));
  chk('una línea por producto (16)', (t.match(/\n· [^\n]*: ya estaba/g) || []).length === 16);
  chk('Pack Muzza: ya estaba, recibido vie 02/10, solo se guarda',
    t.indexOf('Pack Pizzas x2 — Muzzarella: ya estaba (recibido vie 02/10), solo se guarda') >= 0);
  chk('las tortas dicen dom 04/10, que es cuando entraron',
    t.indexOf('Tortas — Golosa: ya estaba (recibido dom 04/10), solo se guarda') >= 0);
  chk('ninguna línea promete sumar', !/\+\d+ al stock/.test(t));
  chk('y cierra diciendo que no cambia la fecha ni el pago',
    t.indexOf('Ya estaba todo recibido: no cambia la fecha de recibido ni el pago') >= 0);
  chk('no mandó nada (el confirm devolvió "cancelar")', caja._posts === 0, caja._posts);
}

console.log('\n2. Una fila SIN recibir');
{
  const t = leer([L('PPM', 'Pack Pizzas x2 — Muzzarella', [{ r: 10, q: 20 }])]);
  chk('dice +20 al stock', t.indexOf('Pack Pizzas x2 — Muzzarella: +20 al stock') >= 0, t);
  chk('y avisa que queda recibido con fecha de hoy y habilita el pago',
    t.indexOf('queda recibido (con fecha de hoy) y se habilita el pago') >= 0);
  const t2 = leer([L('PPM', 'Pack Pizzas x2 — Muzzarella', [{ r: 10, q: 20 }])], { PPM: 18 });
  chk('contada distinto (20 → 18): +18, con lo pedido y lo contado',
    t2.indexOf('Pack Pizzas x2 — Muzzarella: +18 al stock · pediste 20, contaste 18') >= 0, t2);
}

console.log('\n3. Una fila YA recibida, contada distinto');
{
  const t = leer([L('PPM', 'Pack Pizzas x2 — Muzzarella', [{ r: 10, q: 20, rec: V }])], { PPM: 18 });
  chk('dice que ya estaba y que el conteo baja 2',
    t.indexOf('Pack Pizzas x2 — Muzzarella: ya estaba (recibido vie 02/10) · pediste 20, contaste 18 → -2 al stock') >= 0, t);
  chk('avisa que corrige la orden de compra', t.indexOf('corrige la orden de compra y su costo') >= 0);
  /* Hallazgo de Codex (4/10/2026): todo recibido + conteo corregido decia
     "no cambia el pago", y SI cambia: baja el costo de la OC y la deuda. */
  chk('NO dice "ni el pago" cuando el conteo corrige la OC', t.indexOf('ni el pago') < 0, t.slice(-160));
  chk('dice que cambia el costo y lo que se le debe al proveedor',
    t.indexOf('SÍ cambia el costo de la orden de compra y lo que le debés al proveedor') >= 0, t.slice(-160));
  const t2 = leer([L('PPM', 'Pack Pizzas x2 — Muzzarella', [{ r: 10, q: 20, rec: V }])], { PPM: 22 });
  chk('contada de más (20 → 22): +2', t2.indexOf('contaste 22 → +2 al stock') >= 0, t2);
}

console.log('\n4. Mezclas');
{
  /* El mismo producto en dos OC: una recibida el viernes, otra que llega hoy. */
  const t = leer([L('ECaC', 'Empanadas — Carne a Cuchillo', [{ r: 4, q: 15, rec: V }, { r: 9, q: 12 }])]);
  chk('dos OC, una ya recibida: +12, y dice cuántas ya estaban',
    t.indexOf('Empanadas — Carne a Cuchillo: +12 al stock (15 ya estaba, recibido vie 02/10)') >= 0, t);
  const t2 = leer([L('TG', 'Tortas — Golosa', [{ r: 5, q: 6, mueve: 0 }])]);
  chk('lo que no es del freezer no promete stock', t2.indexOf('Tortas — Golosa: no mueve el stock, solo se guarda') >= 0, t2);
  const t3 = leer(REAL, {}, [{ cliente: 'X', sinRecibir: 2, items: [] }]);
  chk('si hay bolsas de pedidos sin recibir, NO dice "ya estaba todo recibido"',
    t3.indexOf('Ya estaba todo recibido') < 0 && t3.indexOf('queda recibido') >= 0);
}

console.log('\n5. Backend viejo (sin `recs`)');
{
  const viejo = [{ abbr: 'PPM', prod: 'Pack', qty: 20, rows: [10], qtys: [20] }];
  const t = leer(viejo);
  chk('no inventa números: vuelve al mensaje de antes', t.indexOf('suma el stock y habilita el pago') >= 0 && t.indexOf('Al stock:') < 0, t);
}

if (process.env.MALEU_HIJO) {
  console.log(GRIS + '  (soy el hijo de una reinyeccion: no reinyecto)' + RST);
} else {
  console.log('\n6. Reinyección — si rompo la cuenta, ¿se pone rojo?');
  const casos = [
    ['sumando lo ya recibido como si fuera nuevo', 'suma+=n-q; yaEstaba+=q;', 'suma+=n; yaEstaba+=q;'],
    ['ignorando el conteo sobre lo recibido', 'suma+=n-q; yaEstaba+=q;', 'yaEstaba+=q;'],
    ['volviendo al cartel fijo', 'var ef=_rdepEfecto(ajustes);', 'var ef=null;'],
    ['volviendo a "no cambia el pago" con conteo corregido', "else if(ef.hayAjuste) msg+=", "else if(false) msg+="],
  ];
  casos.forEach(([nombre, de, a]) => {
    if (SRC.split(de).length - 1 !== 1) { chk('[NO PUDE MEDIR: ancla] ' + nombre, false, de); return; }
    const tmp = path.join(require('os').tmpdir(), 'ruta_conf_' + Math.random().toString(36).slice(2, 8) + '.html');
    fs.writeFileSync(tmp, SRC.replace(de, a), 'utf8');
    const r = require('child_process').spawnSync('node', [__filename, tmp],
      { encoding: 'utf8', env: Object.assign({}, process.env, { MALEU_HIJO: '1' }) });
    chk(nombre + ' → rojo', /MAL/.test((r.stdout || '') + (r.stderr || '')) || r.status !== 0);
    try { fs.unlinkSync(tmp); } catch (e) {}
  });
}

console.log('\n' + (mal === 0 ? VER + 'TODO EN VERDE' : ROJO + mal + ' MAL') + RST + GRIS + '   (' + ok + ' ok)' + RST + '\n');
process.exit(mal === 0 ? 0 : 1);
