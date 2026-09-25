/* El conteo del deposito y su reparto entre OC (25/9/2026).

   node _tools/pruebas/probar_conteo_descarga.js [ruta/al/ruta.html]

   POR QUE ES DELICADO. Al descargar el auto, Tadeo cuenta y puede corregir lo
   que el proveedor trajo de verdad. La pantalla muestra el producto SUMADO —27
   empanadas— pero en la planilla eso pueden ser dos ordenes de compra distintas
   (15 + 12). Corregir 27 a 25 obliga a decidir de cual de las dos se descuenta,
   y esa decision cambia el Costo Total de una OC concreta: o sea, cambia lo que
   despues le paga al proveedor. Un reparto mal hecho no rompe nada visible,
   descuadra la deuda.

   La regla: se llena desde la PRIMERA orden hacia adelante, asi que la mas vieja
   queda intacta y la diferencia cae en la mas reciente. A prorrata daria
   decimales sobre unidades que no se parten.

   Corre sin navegador y sin sesion: saca `_rdepAjustes` del archivo y la ejecuta.
   No toca produccion. */
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

/** Saca una `function nombre(...)` completa contando llaves, respetando strings
 *  y comentarios. Sacarla del archivo y no copiarla es lo que evita que el test
 *  siga probando una version vieja cuando alguien cambie la de verdad. */
function sacar(nombre) {
  const i = SRC.indexOf('\nfunction ' + nombre + '(');
  if (i < 0) return null;
  let k = SRC.indexOf('{', i), n = 0, str = null;
  for (; k < SRC.length; k++) {
    const ch = SRC[k];
    if (str) { if (ch === '\\') { k++; continue; } if (ch === str) str = null; continue; }
    if (ch === '/' && SRC[k + 1] === '/') { k = SRC.indexOf('\n', k); continue; }
    if (ch === '/' && SRC[k + 1] === '*') { k = SRC.indexOf('*/', k) + 1; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { str = ch; continue; }
    if (ch === '{') n++; else if (ch === '}') { n--; if (n === 0) break; }
  }
  return SRC.slice(i, k + 1);
}

const fuente = sacar('_rdepAjustes');
if (!fuente) {
  console.log('  ' + ROJO + 'MAL' + RST + ' no encontre _rdepAjustes en ' + ARCHIVO);
  process.exit(1);
}

const caja = { pendientesGuardarStock: [], _rdepConteo: {} };
vm.createContext(caja);
vm.runInContext(fuente, caja);

/** Corre el reparto con un escenario y devuelve los ajustes ordenados por fila. */
function repartir(items, conteo) {
  caja.pendientesGuardarStock = items;
  caja._rdepConteo = conteo;
  return caja._rdepAjustes().sort((a, b) => a.r - b.r);
}

const UNA = [{ abbr: 'PMa', qty: 17, rows: [10], qtys: [17] }];
const DOS = [{ abbr: 'ECaC', qty: 27, rows: [4, 9], qtys: [15, 12] }];

console.log('\n══ El conteo del depósito ══\n');

console.log('1. Cuando NO hay nada que corregir');
chk('sin contar nada, no se manda ningun ajuste', repartir(DOS, {}).length === 0);
chk('contando lo mismo que pediste, tampoco', repartir(DOS, { ECaC: 27 }).length === 0);
chk('un conteo de un producto que ya no esta en la lista se ignora',
  repartir(DOS, { TG: 3 }).length === 0);

console.log('\n2. Una sola orden de compra');
{
  const menos = repartir(UNA, { PMa: 14 });
  chk('contaste menos: corrige esa fila', menos.length === 1 && menos[0].r === 10 && menos[0].qty === 14, menos);
  const mas = repartir(UNA, { PMa: 20 });
  chk('contaste de mas: tambien, porque entro al freezer igual',
    mas.length === 1 && mas[0].qty === 20, mas);
  const cero = repartir(UNA, { PMa: 0 });
  chk('no vino nada: queda en 0 y no se borra la fila', cero.length === 1 && cero[0].qty === 0, cero);
}

console.log('\n3. Dos ordenes del mismo producto (27 = 15 + 12)');
{
  const a = repartir(DOS, { ECaC: 25 });
  chk('contaste 25: la orden vieja queda intacta y descuenta la nueva',
    a.length === 1 && a[0].r === 9 && a[0].qty === 10, a);
  chk('y el total repartido da exactamente lo contado', 15 + a[0].qty === 25);

  const b = repartir(DOS, { ECaC: 12 });
  chk('contaste 12: la vieja se recorta y la nueva queda en cero',
    b.length === 2 && b[0].r === 4 && b[0].qty === 12 && b[1].r === 9 && b[1].qty === 0, b);
  chk('y sigue sumando lo contado', b[0].qty + b[1].qty === 12);

  const c = repartir(DOS, { ECaC: 30 });
  chk('contaste 30: el sobrante va a la ultima orden',
    c.length === 1 && c[0].r === 9 && c[0].qty === 15, c);
  chk('y el total da 30', 15 + c[0].qty === 30);

  const d = repartir(DOS, { ECaC: 0 });
  chk('no vino nada: las dos a cero', d.length === 2 && d.every((x) => x.qty === 0), d);
}

console.log('\n4. Bordes que no pueden romper');
{
  chk('una linea sin filas no genera ajustes',
    repartir([{ abbr: 'X', qty: 5, rows: [], qtys: [] }], { X: 3 }).length === 0);
  /* El backend publicado puede ser anterior a `qtys`. Sin el no se puede
     repartir sin inventar, asi que va todo a la primera y las otras a cero: es
     lo unico que no miente el total. */
  const viejo = repartir([{ abbr: 'Y', qty: 27, rows: [4, 9] }], { Y: 25 });
  chk('sin `qtys` (backend viejo) igual reparte sin perder unidades',
    viejo.length === 2 && viejo[0].qty === 25 && viejo[1].qty === 0, viejo);
  chk('y la suma sigue siendo la contada', viejo.reduce((a, x) => a + x.qty, 0) === 25);

  const tres = repartir([{ abbr: 'Z', qty: 30, rows: [1, 2, 3], qtys: [10, 10, 10] }], { Z: 14 });
  chk('con tres ordenes se llena en orden: 10 · 4 · 0',
    tres.length === 2 && tres[0].qty === 4 && tres[1].qty === 0, tres);
  chk('y la suma da 14', 10 + tres[0].qty + tres[1].qty === 14);
}

console.log('\n5. Reinyección — si rompo el reparto, ¿se pone rojo?');
if (process.env.MALEU_HIJO) {
  console.log(GRIS + '  (soy el hijo de una reinyeccion: no reinyecto)' + RST);
} else {
  const casos = [
    ['tirando el sobrante cuando contaste de mas',
      'if (resto > 0) nuevas[rows.length - 1] += resto;', ''],
    ['repartiendo desde la ultima orden en vez de la primera',
      'for (var i = 0; i < rows.length; i++){', 'for (var i = rows.length - 1; i >= 0; i--){'],
    ['mandando el total a todas las filas',
      'var toma = Math.min(qtys[i], resto);', 'var toma = cont;'],
  ];
  casos.forEach(([nombre, de, a]) => {
    if (SRC.split(de).length - 1 !== 1) {
      chk('[NO PUDE MEDIR: el ancla no esta o no es unica] ' + nombre, false, de.slice(0, 50));
      return;
    }
    const tmp = path.join(require('os').tmpdir(), 'ruta_cont_' + Math.random().toString(36).slice(2, 8) + '.html');
    fs.writeFileSync(tmp, SRC.replace(de, a), 'utf8');
    const r = require('child_process').spawnSync('node', [__filename, tmp],
      { encoding: 'utf8', env: Object.assign({}, process.env, { MALEU_HIJO: '1' }) });
    chk(nombre + ' → rojo', /MAL/.test((r.stdout || '') + (r.stderr || '')) || r.status !== 0);
    try { fs.unlinkSync(tmp); } catch (e) {}
  });
}

console.log('\n' + (mal === 0 ? VER + 'TODO EN VERDE' : ROJO + mal + ' MAL') + RST +
  GRIS + '   (' + ok + ' ok)' + RST + '\n');
process.exit(mal === 0 ? 0 : 1);
