/**
 * probar-carne-repo.js — el bloque de carne de Inicio, ¿dice la verdad sobre la
 * reposición?
 *
 * POR QUE EXISTE:
 *   Hasta el 10/9/2026 el cartel afirmaba *"el pedido de esta semana ya tendría
 *   que estar hecho"* mirando **sólo el día de la semana**. Ese jueves la última
 *   compra cargada era del 25/8 —hace 16 días— y el cartel seguía diciendo que
 *   la mercadería llegaba ese día. Un aviso que afirma algo sin mirar el dato
 *   tapa justo lo que tiene que mostrar.
 *
 *   Saca `_semprepOtrosProv` y sus helpers del panel.src.html REAL y los corre
 *   con el reloj congelado, así el resultado no depende del día en que se corra.
 *
 *   node _tools/probar-carne-repo.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const V = '\x1b[32m', R = '\x1b[31m', D = '\x1b[2m', B = '\x1b[1m', X = '\x1b[0m';
const SRC = path.join(__dirname, '..', '_src', 'panel.src.html');
const src = fs.readFileSync(SRC, 'utf8');

/* Saca `function NOMBRE(...){...}` contando llaves. */
function sacar(nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no encuentro function ' + nombre);
  let j = src.indexOf('{', i), prof = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') prof++;
    else if (src[k] === '}') { prof--; if (prof === 0) break; }
  }
  return src.slice(i, k + 1);
}
/* Y la declaración de `var NOMBRE={...};` */
function sacarVar(nombre) {
  const i = src.indexOf('var ' + nombre + '=');
  if (i < 0) throw new Error('no encuentro var ' + nombre);
  let j = src.indexOf('{', i), prof = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') prof++;
    else if (src[k] === '}') { prof--; if (prof === 0) break; }
  }
  return src.slice(i, k + 1) + ';';
}

const FNS = ['_proxDiaSem', '_semprepUltDiaPedido', '_semprep2', '_semprepDMY',
  '_semprepHace', '_semprepEsc', '_semprepNum', '_semprepQuedan',
  '_semprepPorSem', '_semprepOtrosProv'].map(sacar).join('\n');
const CFG = sacarVar('SEMPREP_OTRO_PROV');

let ok = 0, mal = 0;
function chk(t, c, x) {
  if (c) { ok++; console.log('  ' + V + 'ok  ' + X + t); }
  else { mal++; console.log('  ' + R + 'MAL ' + X + t + (x !== undefined ? '\n        -> ' + String(x).slice(0, 300) : '')); }
}

/* Corre el bloque con el reloj congelado en `hoy` y los datos sembrados. */
function correr(hoy, repo, depTs, stock) {
  const ctx = { console };
  vm.createContext(ctx);
  const RealDate = Date;
  const src2 = CFG + '\n' + FNS + `
    SEMPREP_REPO = ${JSON.stringify(repo)};
    SEMPREP_DEPTS = ${JSON.stringify(depTs)};
    var RealDate = Date;
    var HOY = new RealDate(${hoy[0]}, ${hoy[1]}, ${hoy[2]}, 9, 0).getTime();
    function Fake(a, b, c, d, e) {
      if (arguments.length === 0) return new RealDate(HOY);
      if (arguments.length === 1) return new RealDate(a);
      if (arguments.length === 3) return new RealDate(a, b, c);
      return new RealDate(a, b, c, d, e);
    }
    Fake.UTC = RealDate.UTC; Fake.parse = RealDate.parse; Fake.now = function(){return HOY;};
    Fake.prototype = RealDate.prototype;
    Date = Fake;
    var __r = _semprepOtrosProv(${JSON.stringify(stock)}, new Date());
    Date = RealDate;
    __r;`;
  return vm.runInContext(src2, ctx);
}

/* El estado real del 10/9/2026: los 5 cortes por debajo de una semana. */
const STOCK = {
  'Maleu Carnes': [
    { n: 'Carne Lomo', d: 0, dem: 19, u: 'kg' },
    { n: 'Carne Colita de Cuadril', d: 0, dem: 16.5, u: 'kg' },
    { n: 'Carne Vacío', d: 5.61, dem: 16.1, u: 'kg' },
    { n: 'Carne Entraña', d: 1.163, dem: 10.2, u: 'kg' },
    { n: 'Carne Picaña', d: 0, dem: 5.7, u: 'kg' }
  ]
};
const JUE = [2026, 8, 10];      // jueves 10/9/2026
const MAR = [2026, 8, 8];       // martes 8/9/2026
const SAB = [2026, 8, 12];      // sábado 12/9/2026

console.log('\n' + B + '== El bloque de carne: ¿mira la compra o sólo el calendario? ==' + X + '\n');

// ── 1. EL CASO REAL: jueves, última compra del 25/8 ────────────────────────
console.log(D + '  【1】 jueves 10/9 · última compra 25/8 (hace 16 días) — el caso real' + X);
let h = correr(JUE, { carne: { ultCompra: '2026-08-25', ultVenta: '2026-09-08', compras: 5 } },
  { moresco: '2026-09-09' }, STOCK);
chk('avisa que no hay compra cargada esta semana', /No hay ninguna compra cargada/.test(h), h.slice(0, 400));
chk('  y dice de cuándo es la última', /25\/8/.test(h) && /hace 16 días/.test(h));
chk('  sin afirmar si repuso o no', /Si repuso, falta cargarla/.test(h));
chk('  la caja va en urgente', /class="semprep urg"/.test(h));
chk('  NO dice que la mercadería llega hoy', !/llega <b>hoy<\/b>/.test(h), h.slice(0, 400));
chk('dice de cuándo es el número del freezer', /Contado <b>ayer<\/b>/.test(h), h.slice(-300));
chk('  y no dice que Lucas vendió después (el conteo es posterior)',
  !/cargó ventas después/.test(h));
chk('los 5 cortes salen como cortos', /5 cortes no llegan/.test(h), h.slice(0, 300));

// ── 2. CON LA COMPRA CARGADA: el mensaje de siempre ────────────────────────
console.log('\n' + D + '  【2】 jueves 10/9 · con la compra del martes 8/9 cargada' + X);
h = correr(JUE, { carne: { ultCompra: '2026-09-08', ultVenta: '2026-09-09', compras: 6 } },
  { moresco: '2026-09-10' }, STOCK);
chk('dice que el pedido ya está cargado', /ya está cargado/.test(h), h.slice(-400));
chk('  y que la mercadería llega hoy', /llega <b>hoy<\/b>/.test(h));
chk('  NO va en urgente', !/class="semprep urg"/.test(h));
chk('  el freezer se contó hoy', /Contado <b>hoy<\/b>/.test(h), h.slice(-300));

// ── 3. VENTAS DESPUÉS DEL CONTEO: el número ya no vale ─────────────────────
console.log('\n' + D + '  【3】 Lucas cargó ventas después del último conteo' + X);
h = correr(JUE, { carne: { ultCompra: '2026-09-08', ultVenta: '2026-09-10', compras: 6 } },
  { moresco: '2026-09-09' }, STOCK);
chk('avisa que ya vendió parte de eso', /cargó ventas después/.test(h), h.slice(-350));
chk('  nombrando a quién', /Lucas cargó ventas/.test(h));

// ── 4. SIN DATO: se comporta como antes ────────────────────────────────────
console.log('\n' + D + '  【4】 la planilla de Lucas no se pudo leer' + X);
h = correr(JUE, {}, {}, STOCK);
chk('no inventa ninguna alarma', !/No hay ninguna compra cargada/.test(h), h.slice(-350));
chk('  y sigue diciendo que la mercadería llega hoy', /llega <b>hoy<\/b>/.test(h));
chk('  sin sello de conteo (no lo sabe)', !/Contado/.test(h));
chk('  y NO va en urgente', !/class="semprep urg"/.test(h));

// ── 5. MARTES: es el día de pedido ─────────────────────────────────────────
console.log('\n' + D + '  【5】 martes 8/9 · el día de pedido' + X);
h = correr(MAR, { carne: { ultCompra: '2026-08-25', ultVenta: '2026-09-08', compras: 5 } },
  { moresco: '2026-09-07' }, STOCK);
chk('dice que hoy es el día de pedido', /<b>Hoy<\/b> es el día de pedido/.test(h), h.slice(-350));
chk('  y va en urgente', /class="semprep urg"/.test(h));

// ── 6. SÁBADO con la compra MUY vieja ──────────────────────────────────────
console.log('\n' + D + '  【6】 sábado 12/9 · la última compra es de hace 18 días' + X);
h = correr(SAB, { carne: { ultCompra: '2026-08-25', ultVenta: '2026-09-11', compras: 5 } },
  { moresco: '2026-09-09' }, STOCK);
chk('dice cuándo es el próximo pedido', /próximo pedido es el <b>martes/.test(h), h.slice(-400));
chk('  y avisa que la última compra pasó la vida útil', /última compra cargada es del <b>25\/8/.test(h));
chk('  en urgente', /class="semprep urg"/.test(h));

// ── 7. SÁBADO con una compra reciente: nada que alarmar ────────────────────
console.log('\n' + D + '  【7】 sábado 12/9 · con la compra del 8/9 cargada' + X);
h = correr(SAB, { carne: { ultCompra: '2026-09-08', ultVenta: '2026-09-11', compras: 6 } },
  { moresco: '2026-09-11' }, STOCK);
chk('no alarma', !/⚠️/.test(h), h.slice(-350));
chk('  y NO va en urgente', !/class="semprep urg"/.test(h));

// ── 8. EL FREEZER LLENO: el bloque no grita ────────────────────────────────
console.log('\n' + D + '  【8】 el freezer cubierto' + X);
const LLENO = {
  'Maleu Carnes': [
    { n: 'Carne Lomo', d: 40, dem: 19, u: 'kg' },
    { n: 'Carne Vacío', d: 35, dem: 16.1, u: 'kg' }
  ]
};
h = correr(JUE, { carne: { ultCompra: '2026-09-08', ultVenta: '2026-09-09', compras: 6 } },
  { moresco: '2026-09-10' }, LLENO);
chk('dice que está cubierto', /está cubierto/.test(h), h.slice(0, 300));
chk('  y no lista cortes cortos', !/no llegan a la próxima/.test(h));

// ── 9. Higiene del HTML ────────────────────────────────────────────────────
console.log('\n' + D + '  【9】 higiene' + X);
h = correr(JUE, { carne: { ultCompra: '2026-08-25', ultVenta: '2026-09-08', compras: 5 } },
  { moresco: '2026-09-09' }, STOCK);
chk('no quedó ningún "undefined" ni "NaN" en el HTML',
  !/undefined|NaN/.test(h), (h.match(/.{0,60}(undefined|NaN).{0,60}/) || [''])[0]);
chk('  las etiquetas abren y cierran parejo',
  (h.match(/<div/g) || []).length === (h.match(/<\/div>/g) || []).length,
  (h.match(/<div/g) || []).length + ' <div> vs ' + (h.match(/<\/div>/g) || []).length + ' </div>');
chk('  los kilos van con coma, no con punto', !/\d+\.\d+ kg/.test(h),
  (h.match(/.{0,40}\d+\.\d+ kg.{0,20}/) || [''])[0]);
/* El aviso de la compra faltante termina en punto y el pie agregaba otro: se
   veía "hoy no llega nada.. Contado ayer". Lo encontró leer el texto, no un
   número — los tests miden lo que se les pide. */
chk('  sin puntuación doble', !/\.\.|\. \./.test(h.replace(/<[^>]*>/g, '')),
  (h.replace(/<[^>]*>/g, '').match(/.{0,50}\.\..{0,30}/) || [''])[0]);

console.log('\n' + (mal ? R : V) + '  ' + ok + ' ok · ' + mal + ' mal' + X + '\n');
process.exit(mal ? 1 : 0);
