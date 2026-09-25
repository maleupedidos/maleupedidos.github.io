/* LA FILA DE GETs: ¿sale primero lo que pinta la tab abierta? (25/9/2026)
 *
 *   node _tools/pruebas/probar_cola_prioridad.js
 *
 * Apps Script atiende **de a dos por cuenta**, así que el orden de la fila ES el
 * tiempo que Tadeo espera mirando el cartel. Hasta hoy la fila ordenaba bien…
 * a partir del tercero: `_encolar` llamaba a `_bombear()` en la misma línea del
 * push, así que **los dos primeros en encolarse salían sin compararse con
 * nadie**, porque cuando llegaba el tercero ya no había cupo.
 *
 * Medido al abrir la app con Inicio: salían `pedidosLight` y `cobrosPendientes`
 * — y **Inicio no dibuja los cobros pendientes**. Ese cupo era de `cajaLight` o
 * de `ventas`.
 *
 * Saca del `panel.src.html` REAL la fila entera y la corre con un backend
 * simulado. Lo que cuida:
 *
 * · lo que encola junto compite junto (y no gana el que llegó primero);
 * · la tab abierta manda, y si cambia de tab a mitad de la fila, manda la nueva;
 * · dos pedidos iguales al mismo tiempo siguen siendo uno solo;
 * · nunca hay más de dos en vuelo;
 * · y al terminar uno, el siguiente entra **sin esperar** (ese bombeo no se
 *   difiere, que es la mitad que un "arreglo" apurado rompería).
 *
 * No toca la red ni el backend.
 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, '..', '..', '_src', 'panel.src.html');
const src = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); }
};

/* El bloque de la fila, tal como está en el archivo. Se saca por sus dos
   extremos y no función por función: `_cola`, `_enVuelo`, `_bombear`,
   `_sacarMejor`, `_prioridadDe` y los mapas se necesitan entre sí, y sacarlos
   sueltos obligaría a reescribir el pegamento — que es justo lo que se quiere
   probar. */
function bloque(desde, hasta) {
  const i = src.indexOf(desde);
  if (i < 0) throw new Error('no encontré el inicio: ' + desde.slice(0, 40));
  const j = src.indexOf(hasta, i);
  if (j < 0) throw new Error('no encontré el final: ' + hasta.slice(0, 40));
  return src.slice(i, j + hasta.length);
}

const codigo = bloque('var _enVuelo = 0, _cola = [];', 'var _enVueloUrl = {};')
  + '\n' + bloque('function _claveVuelo(url){', '_enVueloUrl[k] = p;')
  + '\n  return p;\n}\n';

/* Lo que la fila necesita de afuera. Se define con el comportamiento real, no
   con stubs vacíos: un `_prioridadDe` que devuelva siempre 0 haría pasar
   cualquier orden. */
let TAB = 'inicio', SUB = '';
const salidas = [];      /* el orden en que la fila los soltó */
let enVueloMax = 0, enVueloAhora = 0;
const pendientes = {};   /* url -> resolver, para terminarlos a mano */

/* Las constantes que el bloque usa y viven unas lineas mas arriba en el
   archivo. Se leen de la fuente en vez de copiarlas: escritas a mano, la prueba
   correria con numeros viejos el dia que alguien los cambie, y ese es
   exactamente el tipo de test que envejece sin avisar. */
function constante(nombre, porDefecto) {
  const m = src.match(new RegExp('\\b' + nombre + '\\s*=\\s*(\\d+)'));
  return m ? Number(m[1]) : porDefecto;
}

const ctx = {
  console, Promise, Date, String, Number, Math, JSON, Error, setTimeout, clearTimeout,
  _TOPE_GET: constante('_TOPE_GET', 2),
  /* `_tabAbierta` y `_subAbierta` NO van aca: el bloque las define y pisaria
     estos stubs. Se reasignan DESPUES de correr el bloque — ver abajo. */
  document: { querySelector: function(){ return null; } },
  _MAX_VUELO_MS: constante('_MAX_VUELO_MS', 100000),
  CORTE_GET_MS: constante('CORTE_GET_MS', 45000),
  CORTE_GET_INTENTOS: constante('CORTE_GET_INTENTOS', 2),
  CORTE_GET_FINAL_MS: constante('CORTE_GET_FINAL_MS', 25000),
  /* El que de verdad sale a la red. Se stubea `_pedir` y NO `_pedirConCorte`:
     este ultimo viene adentro del bloque que se extrae del archivo, asi que un
     stub suyo lo pisaria y la prueba correria sobre su propia version en vez de
     sobre la del ERP — justo lo contrario de lo que se busca. Stubeando el
     nivel de abajo, la cadena real (cortes y reintentos incluidos) queda viva.

     Aca se anota y se deja colgado: cada caso decide cuando termina, que es lo
     que hace observable el orden. */
  _pedir: function (url) {
    salidas.push(String(url).match(/action=([a-zA-Z0-9_]+)/)[1]);
    enVueloAhora++;
    if (enVueloAhora > enVueloMax) enVueloMax = enVueloAhora;
    return new Promise(function (res) { pendientes[url] = res; });
  }
};
/* El bloque publica contadores en `window` (`__corteGet`, `__colaGet`), que es
   como el ERP los deja a mano para diagnosticar. Se apunta al propio contexto,
   igual que en el navegador, en vez de borrarlos del codigo: lo que corre aca
   tiene que ser lo mismo que corre alla. */
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(codigo, ctx);

/* DESPUES del bloque, nunca antes.

   El bloque declara `function _tabAbierta()` y `function _subAbierta()`, asi que
   cualquier stub puesto en el contexto ANTES queda pisado. La real mira
   `document.querySelector('.pg.on')`; sin DOM devuelve '', una tab que no esta
   en ningun mapa, y entonces **todo queda en prioridad 0** y la fila corre sin
   priorizar. Medido: con el stub puesto antes, las cuatro prioridades daban 0 y
   el test medía el orden de llegada creyendo que medía prioridad.

   Es el mismo error que con `_pedirConCorte`, dos veces en la misma prueba:
   stubear al nivel equivocado deja correr otra cosa de la que se cree. */
vm.runInContext('_tabAbierta = function(){ return globalThis.__TAB; };', ctx);
vm.runInContext('_subAbierta = function(){ return globalThis.__SUB; };', ctx);
Object.defineProperty(ctx, '__TAB', { get: () => TAB });
Object.defineProperty(ctx, '__SUB', { get: () => SUB });

/* EL CONTROL DE QUE HAY PRIORIDADES.
   Sin esto, el dia que alguien vuelva a romper el stub los chequeos de abajo
   miden una fila plana y dan verde igual. Se planta antes de medir nada. */
(function () {
  TAB = 'inicio';
  const p = a => ctx._prioridadDe('https://x/exec?action=' + a + '&t=1');
  const esperado = { pedidosLight: 2, cajaLight: 2, ventas: 2, cobrosPendientes: 0 };
  const mal = Object.keys(esperado).filter(a => p(a) !== esperado[a]);
  if (mal.length) {
    console.log('\n  ‼ NO PUEDO MEDIR: la fila no esta priorizando.');
    mal.forEach(a => console.log(`      ${a}: esperaba ${esperado[a]} y da ${p(a)}`));
    console.log('    Con todo en 0 la fila corre por orden de llegada y los');
    console.log('    chequeos de abajo dirian cualquier cosa. Revisa los stubs.\n');
    process.exit(1);
  }
})();

const encolar = a => ctx._encolar('https://x/exec?action=' + a + '&t=' + Date.now());
const terminar = a => {
  const k = Object.keys(pendientes).find(u => u.indexOf('action=' + a + '&') >= 0);
  if (!k) return false;
  enVueloAhora--;
  pendientes[k]({ ok: true, clone: function () { return this; } });
  delete pendientes[k];
  return true;
};
const limpiar = () => {
  salidas.length = 0; enVueloMax = 0; enVueloAhora = 0;
  Object.keys(pendientes).forEach(k => delete pendientes[k]);
  vm.runInContext('_enVuelo = 0; _cola.length = 0; _enVueloUrl = {};', ctx);
};
/* Dos ticks: uno para el microtask del bombeo, otro por las dudas. */
const tick = () => Promise.resolve().then(() => {}).then(() => {});

(async () => {
  console.log('\n== La fila de GETs ==\n');

  /* ══ LO QUE LLEGA JUNTO, COMPITE JUNTO ═══════════════════════════════════
     El caso exacto del arranque: `loadRapido` encola sus cuatro lecturas en el
     mismo tick, y `cobrosPendientes` va SEGUNDO en el array. Antes salía por
     haber llegado segundo; ahora tiene que perder contra las que Inicio dibuja. */
  console.log('-- lo que se encola junto compite junto --');
  limpiar(); TAB = 'inicio';
  encolar('pedidosLight'); encolar('cobrosPendientes');
  encolar('cajaLight'); encolar('ventas');
  await tick();
  chk('salen DOS, que es el tope', salidas.length === 2, salidas);
  /* `indexOf(...) < 0` sobre una lista VACIA da true: sin exigir que haya
     salido algo, este chequeo daba ok sin mirar nada. */
  chk('y son las dos que Inicio dibuja, no la que llegó segunda',
    salidas.length > 0 && salidas.indexOf('cobrosPendientes') < 0, salidas);
  chk('pedidosLight entre ellas', salidas.indexOf('pedidosLight') >= 0, salidas);
  chk('nunca hubo más de dos en vuelo', enVueloMax === 2, enVueloMax);

  /* Y al liberarse un cupo, entra el que sigue por prioridad — no el más viejo. */
  terminar('pedidosLight');
  await tick();
  chk('al terminar uno entra otro de la tab abierta antes que los cobros',
    salidas.length === 3 && salidas[2] !== 'cobrosPendientes', salidas);

  /* ══ LA TAB ABIERTA MANDA, Y PUEDE CAMBIAR ══════════════════════════════
     La prioridad se calcula al SACAR y no al encolar, justamente para esto:
     si entrás a Caja con la fila llena, lo de Caja se adelanta. */
  console.log('\n-- si cambiás de tab, manda la nueva --');
  limpiar(); TAB = 'inicio';
  encolar('busqueda'); encolar('cajaLight'); encolar('tendencia');
  await tick();
  const primeras = salidas.slice();
  TAB = 'busqueda';                       // se va a Abastecimiento
  terminar(primeras[0]); terminar(primeras[1]);
  await tick();
  chk('lo que pinta la tab NUEVA se adelanta',
    salidas.indexOf('busqueda') >= 0, salidas);

  /* ══ DOS IGUALES SON UNO ════════════════════════════════════════════════ */
  console.log('\n-- dos pedidos iguales al mismo tiempo son uno solo --');
  limpiar(); TAB = 'inicio';
  const a = ctx._encolar('https://x/exec?action=ocLight&t=1&token=AAA');
  const b = ctx._encolar('https://x/exec?action=ocLight&t=2&token=BBB');
  await tick();
  chk('salió UNA sola vez a la red',
    salidas.filter(x => x === 'ocLight').length === 1, salidas);
  terminar('ocLight');
  const [ra, rb] = await Promise.all([a, b]);
  chk('y las dos promesas reciben respuesta', !!(ra && rb), { ra: !!ra, rb: !!rb });

  /* ══ EL TOPE NO SE PASA NI CON UNA AVALANCHA ════════════════════════════ */
  console.log('\n-- el tope de dos aguanta una avalancha --');
  limpiar(); TAB = 'inicio';
  ['pedidosLight', 'cajaLight', 'ventas', 'ocLight', 'busqueda', 'tendencia',
   'admin', 'ver', 'miSesion', 'cobrosPendientes'].forEach(encolar);
  await tick();
  chk('con diez encolados, sólo dos en vuelo', enVueloMax === 2, enVueloMax);
  chk('y los dos son de la tab abierta',
    salidas.length === 2 && salidas.every(x => ['pedidosLight', 'cajaLight', 'ventas'].indexOf(x) >= 0),
    salidas);

  /* Se vacía entera sin trabarse: el bombeo diferido no puede dejar la fila
     quieta con cupos libres. */
  let vueltas = 0;
  while (salidas.length < 10 && vueltas++ < 40) {
    const vivos = Object.keys(pendientes);
    if (!vivos.length) break;
    terminar(String(vivos[0]).match(/action=([a-zA-Z0-9_]+)/)[1]);
    await tick();
  }
  chk('la fila se vacía entera, sin trabarse', salidas.length === 10, salidas.length);

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})();
