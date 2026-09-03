/**
 * probar-stock-modo.js — ¿la tab "+" del ERP decide el tope de stock igual que la
 * tienda?
 *
 * POR QUE EXISTE:
 *   La regla de "cuanto se puede vender" (ilimitado / proyectado / real) vive dos
 *   veces: getStockMode() en tienda/app.js y npStockMode() en ruta.html. Son repos
 *   distintos, asi que no se puede compartir el codigo. Lo unico que evita que se
 *   despeguen es este test: saca las DOS funciones de sus archivos y las corre
 *   sobre todas las combinaciones de dia, hora y fecha de entrega.
 *
 *   No reimplementa la regla. Si la reimplementara, estaria comparando mi copia
 *   contra si misma.
 *
 *   node _tools/probar-stock-modo.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VER = '\x1b[32m', RED = '\x1b[31m', DIM = '\x1b[2m', B = '\x1b[1m', RST = '\x1b[0m';
const AQUI = path.join(__dirname, '..', 'ruta.html');
const TIENDA = path.join(__dirname, '..', '..', 'tienda', 'app.js');

/* Saca `function NOMBRE(...){...}` contando llaves. */
function sacar(src, nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no encuentro function ' + nombre);
  let j = src.indexOf('{', i), prof = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') prof++;
    else if (src[k] === '}') { prof--; if (prof === 0) break; }
  }
  return src.slice(i, k + 1);
}

if (!fs.existsSync(TIENDA)) {
  console.log('\n' + DIM + '  (salteado: no encuentro ' + TIENDA + ' — el repo de la tienda no esta al lado)' + RST + '\n');
  process.exit(0);
}

const srcRuta = fs.readFileSync(AQUI, 'utf8');
const srcTienda = fs.readFileSync(TIENDA, 'utf8');

/* Un contexto con el reloj congelado en `ahoraMs`. Solo se falsea Date.now():
   las dos funciones usan Date.UTC y new Date(ms), que no dependen del reloj. */
function contexto(ahoraMs, extra) {
  const RealDate = Date;
  class D extends RealDate { static now() { return ahoraMs; } }
  const ctx = { Date: D, console };
  Object.assign(ctx, extra);
  vm.createContext(ctx);
  return ctx;
}

const fnsTienda = ['getStockMode', '_todayARMidnightMs', '_isoToUTCMidnightMs',
  'isPilarRestricted', '_deliveryStartMs'].map((n) => {
    try { return sacar(srcTienda, n); } catch (e) { return null; }
  }).filter(Boolean).join('\n');
const fnsRuta = ['npStockMode', '_npHoyAR', '_npIsoUTC'].map((n) => sacar(srcRuta, n)).join('\n');

function modoTienda(ahoraMs, iso, zona, pilarRed) {
  const ctx = contexto(ahoraMs, {
    currentZone: zona, selectedDeliveryDate: iso, selectedDateIsFlexible: false,
    PILAR_RESTRICCION_HASTA_MS: 0,
    _pilarBarrioIsRed: () => !!pilarRed,
  });
  vm.runInContext(fnsTienda + '\n;__r = getStockMode();', ctx);
  return ctx.__r;
}
function modoRuta(ahoraMs, iso, npZona) {
  const ctx = contexto(ahoraMs, { npZona, npFechaSel: iso });
  vm.runInContext(fnsRuta + '\n;__r = npStockMode();', ctx);
  return ctx.__r;
}

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

let casos = 0, malos = [];
// 8 semanas de "hoy", a 4 horas del dia (una de cada lado del cutoff del jueves 12hs AR).
const base = Date.UTC(2026, 8, 1); // 1/9/2026
for (let d = 0; d < 56; d++) {
  for (const hUTC of [3, 14, 16, 23]) {            // 00, 11, 13 y 20 hs AR
    const ahora = base + d * 86400000 + hUTC * 3600000;
    for (let e = -2; e <= 16; e++) {
      const entrega = iso(base + (d + e) * 86400000);
      for (const [zt, zr] of [['estancias', 'Home'], ['pilar', 'Pilar']]) {
        const a = modoTienda(ahora, entrega, zt, false);
        const b = modoRuta(ahora, entrega, zr);
        casos++;
        if (a !== b) malos.push({ hoy: new Date(ahora).toISOString(), entrega, zona: zt, tienda: a, erp: b });
      }
    }
  }
}

console.log('\n' + B + '== MODO DE STOCK: la tab "+" contra la tienda ==' + RST);
console.log(DIM + '  ' + casos + ' combinaciones de (hoy x hora x fecha de entrega x zona)' + RST);

// Que el test ejercite de verdad los tres modos, o no probaria nada.
const cuenta = {};
for (let d = 0; d < 56; d++) {
  const ahora = base + d * 86400000 + 16 * 3600000;
  for (let e = -1; e <= 12; e++) {
    const m = modoRuta(ahora, iso(base + (d + e) * 86400000), 'Home');
    cuenta[m] = (cuenta[m] || 0) + 1;
  }
}
console.log(DIM + '  modos ejercitados: ' + Object.keys(cuenta).map((k) => k + ' ' + cuenta[k]).join(' · ') + RST);
const tresModos = ['ilimitado', 'proyectado', 'real'].every((m) => cuenta[m] > 0);

// Clubes va ilimitado en los dos lados.
const clubOk = modoRuta(base + 16 * 3600000, iso(base + 3 * 86400000), 'Clubes') === 'ilimitado'
  && modoTienda(base + 16 * 3600000, iso(base + 3 * 86400000), 'clubes', false) === 'ilimitado';

let mal = 0;
const chequeo = (ok, txt) => { if (!ok) mal++; console.log('  ' + (ok ? VER + 'ok  ' : RED + 'MAL ') + RST + txt); };
chequeo(tresModos, 'el test recorre los tres modos (si no, no probaria nada)');
chequeo(clubOk, 'Clubes va ilimitado en los dos');
chequeo(malos.length === 0, malos.length + ' diferencias entre la tienda y el ERP');
malos.slice(0, 10).forEach((m) => console.log('     ' + RED + m.hoy + '  entrega ' + m.entrega + '  ' + m.zona +
  '  tienda=' + m.tienda + '  erp=' + m.erp + RST));

console.log('\n  ' + (mal ? RED + mal + ' MAL' + RST : VER + 'las dos reglas dicen lo mismo' + RST) + '\n');
process.exit(mal ? 1 : 0);
