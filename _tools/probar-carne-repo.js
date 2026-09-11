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
function correr(hoy, repo, depTs, stock, ver) {
  if (ver === undefined) ver = null;
  const ctx = { console };
  vm.createContext(ctx);
  const RealDate = Date;
  const src2 = CFG + '\n' + FNS + `
    SEMPREP_REPO = ${JSON.stringify(repo)};
    SEMPREP_DEPTS = ${JSON.stringify(depTs)};
    /* Desde el 10/9/2026 el detalle arranca plegado o abierto segun la
       urgencia. \`null\` = "decidilo vos", que es como lo ve alguien que abre
       la app; \`ver\` fuerza el otro estado para probar el toggle. */
    var SEMPREP_VER = {jueves:null, carne:${JSON.stringify(ver)}};
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
  'moresco': [
    { n: 'Carne Lomo', d: 0, dem: 19, u: 'kg', prov: 'Caco' },
    { n: 'Carne Colita de Cuadril', d: 0, dem: 16.5, u: 'kg', prov: 'Caco' },
    { n: 'Carne Vacío', d: 5.61, dem: 16.1, u: 'kg', prov: 'Caco' },
    { n: 'Carne Entraña', d: 1.163, dem: 10.2, u: 'kg', prov: 'Caco' },
    { n: 'Carne Picaña', d: 0, dem: 5.7, u: 'kg', prov: 'Caco' }
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
/* El conteo es de AYER. Desde el 10/9/2026 el sello sale solo desde 2 dias:
   "ultimo movimiento ayer" es lo esperable y no cambia como se lee el
   numero, y este bloque es lo primero que se ve al abrir el ERP. Lo que el
   cartel SI tiene que decir es que falta cargar la compra (chequeo de arriba). */
chk('  NO pone el sello con un conteo de ayer (es lo esperable)',
  !/Último movimiento/.test(h), h.slice(-300));
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
chk('  NO pone el sello con un conteo de hoy (idem)',
  !/Último movimiento/.test(h), h.slice(-300));
chk('  y el pie entra en un renglon', h.indexOf('semprep-pie') > 0
  && h.split('semprep-pie')[1].split('</div>')[0].length < 160,
  h.split('semprep-pie')[1] ? h.split('semprep-pie')[1].split('</div>')[0] : '?');

/* ── 3. EL CASO DE "VENTAS DESPUÉS DEL CONTEO" YA NO EXISTE (11/9/2026) ────
   Hasta ese día el bloque avisaba *"pero Lucas cargó ventas después, así que ya
   vendió parte de esto"*, comparando `repo.ultVenta` contra el conteo. Ese aviso
   era necesario SÓLO mientras las ventas de carne vivían en la planilla de
   Lucas: el stock del ERP no las veía y el número quedaba viejo sin que nadie se
   enterara.
   Hoy los pedidos de carne están en Home y Pilar, y una venta descuenta el
   depósito como cualquier otro producto. `repo.ultVenta` vuelve siempre vacío y
   el aviso se sacó, así que este caso no tiene nada que verificar: dejar el
   chequeo sería exigir un aviso que ya no tiene por qué existir.
   Y el sello del último movimiento se verifica en el caso 【11】, que es donde
   se ejercitan las dos ramas: un conteo fresco no lo muestra y uno de hace 10
   días sí. */

// ── 4. SIN DATO: se comporta como antes ────────────────────────────────────
console.log('\n' + D + '  【4】 la planilla de Lucas no se pudo leer' + X);
h = correr(JUE, {}, {}, STOCK);
chk('no inventa ninguna alarma', !/No hay ninguna compra cargada/.test(h), h.slice(-350));
chk('  y sigue diciendo que la mercadería llega hoy', /llega <b>hoy<\/b>/.test(h));
chk('  sin sello de movimiento (no lo sabe)', !/Último movimiento/.test(h));
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
  'moresco': [
    { n: 'Carne Lomo', d: 40, dem: 19, u: 'kg', prov: 'Caco' },
    { n: 'Carne Vacío', d: 35, dem: 16.1, u: 'kg', prov: 'Caco' }
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
   veía "hoy no llega nada.. Último movimiento ayer". Lo encontró leer el texto, no un
   número — los tests miden lo que se les pide. */
chk('  sin puntuación doble', !/\.\.|\. \./.test(h.replace(/<[^>]*>/g, '')),
  (h.replace(/<[^>]*>/g, '').match(/.{0,50}\.\..{0,30}/) || [''])[0]);


// ── 10. El plegado: el detalle depende de la URGENCIA (10/9/2026) ──────
/* Tadeo: "Demasiada info al principio de todo". El bloque es lo primero que se
   ve al abrir el ERP y mostraba la lista completa siempre. Ahora el dia del
   pedido (urgente) se abre solo, y el resto de la semana quedan los titulos. */
console.log('\n' + D + '  【10】 el detalle se pliega cuando NO es urgente' + X);

// martes = dia de pedido = urgente → abierto solo
h = correr(MAR, { carne: { ultCompra: '2026-09-01', ultVenta: '2026-09-07', compras: 5 } },
  { moresco: '2026-09-07' }, STOCK);
chk('el martes (dia de pedido) se abre solo', /data-abierto="1"/.test(h), h.slice(0, 260));
chk('  y nombra los cortes', /Carne Lomo/.test(h));
chk('  sin boton de "ver"', !/Ver los \d+ cortes/.test(h));
chk('  y da el consejo de no pedir de mas', /no conviene pedir de más/.test(h));

// sabado con la compra al dia = no urgente → plegado
h = correr(SAB, { carne: { ultCompra: '2026-09-08', ultVenta: '2026-09-11', compras: 5 } },
  { moresco: '2026-09-11' }, STOCK);
chk('el sabado (sin urgencia) arranca plegado', /data-abierto="0"/.test(h), h.slice(0, 260));
chk('  NO nombra ningun corte', !/Carne Lomo/.test(h));
chk('  pero el titulo sigue diciendo cuantos', /5 cortes no llegan/.test(h));
chk('  y ofrece el boton para abrirlos', /Ver los 5 cortes/.test(h));
chk('  sin el consejo de no pedir de mas (no hay nada que pedir)',
  !/no conviene pedir de más/.test(h));

// el toque a mano pisa a la urgencia, en las dos direcciones
h = correr(SAB, { carne: { ultCompra: '2026-09-08', ultVenta: '2026-09-11', compras: 5 } },
  { moresco: '2026-09-11' }, STOCK, true);
chk('un toque a mano lo ABRE aunque no sea urgente', /data-abierto="1"/.test(h));
chk('  y aparecen los cortes', /Carne Lomo/.test(h));
chk('  con el boton para ocultarlos', /Ocultar los cortes/.test(h));
h = correr(MAR, { carne: { ultCompra: '2026-09-01', ultVenta: '2026-09-07', compras: 5 } },
  { moresco: '2026-09-07' }, STOCK, false);
chk('y un toque lo CIERRA aunque sea el dia del pedido', /data-abierto="0"/.test(h));
chk('  sin nombrar los cortes', !/Carne Lomo/.test(h));

// ── 11. El sello del freezer no repite lo obvio ───────────────────
console.log('\n' + D + '  【11】 el sello solo si el conteo es viejo' + X);
h = correr(SAB, { carne: { ultCompra: '2026-09-08', ultVenta: '', compras: 5 } },
  { moresco: '2026-09-12' }, STOCK);
chk('contado hoy: no dice "último movimiento" (es lo esperable)',
  !/Último movimiento/.test(h), h.slice(-320));
h = correr(SAB, { carne: { ultCompra: '2026-09-08', ultVenta: '', compras: 5 } },
  { moresco: '2026-09-02' }, STOCK);
chk('contado hace 10 dias: SI lo dice', /Último movimiento/.test(h) && /hace 10 días/.test(h));

console.log('\n' + (mal ? R : V) + '  ' + ok + ' ok · ' + mal + ' mal' + X + '\n');
process.exit(mal ? 1 : 0);
