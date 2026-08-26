#!/usr/bin/env node
/*
 * despegar.js — saca a una sub-app de las manos del renombrador del build.
 *
 *   node _tools/despegar.js abast --probar   → muestra que haria, no toca nada
 *   node _tools/despegar.js abast            → lo escribe en la fuente
 *
 * ── El problema que viene a resolver ────────────────────────────────────────
 *
 * Las cuatro fuentes del ERP declaran nombres iguales (render, refresh,
 * showLoader...). Como todo tiene que vivir en window para que un onclick lo
 * encuentre, chocan. Hasta hoy eso lo arreglaba el build: fusionar.js renombra
 * las globales de cada sub-app con acorn, EN CADA COMPILADA, y les pone
 * prefijo RUT$ / ABA$ / RED$.
 *
 * Eso funciona hasta que no. Las sub-apps dibujan su pantalla desde JS:
 *
 *     html += '<button onclick="rutaGo(-1)">Anterior</button>';
 *
 * Para el renombrador ese onclick es un string cualquiera: no lo ve. La
 * funcion pasaba a llamarse RED$rutaGo y el boton seguia llamando a rutaGo.
 * No tiraba error. El boton simplemente no hacia nada. Fueron 311 botones y
 * se descubrieron semanas despues. (25/08/2026)
 *
 * ── Por que esto es mejor que seguir parchando el renombrador ───────────────
 *
 * De 128 globales de Abastecimiento, chocan 21. El build renombraba las 128
 * para resolver 21: el 84% del renombrado era daño colateral, y cada nombre
 * tocado era una chance mas de romper un onclick que vive adentro de un string.
 *
 * Este script renombra SOLO los que chocan, UNA VEZ, y deja el resultado
 * escrito en la fuente. A partir de ahi el nombre que se lee en el archivo es
 * el mismo que corre en el navegador. Se puede buscar con Ctrl+F, aparece en
 * el diff de git, y no hay build que lo cambie a tus espaldas.
 *
 * El renombrado sigue siendo CONSCIENTE DE SCOPE (acorn + eslint-scope), no un
 * buscar-y-reemplazar: una propiedad que se llame igual (obj.render) o una
 * variable local que tape a la global quedan intactas.
 *
 * Y ademas reescribe los onclick — los del markup Y los que el JS arma adentro
 * de strings — que es justo lo que el build no podia hacer bien.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const escope = require('eslint-scope');

const RAIZ = path.resolve(__dirname, '..');
const RED = '[31m', GRN = '[32m', YEL = '[33m', DIM = '[2m', RST = '[0m';

const SUBAPPS = {
  abast:    { archivo: 'busqueda.html', pref: 'aba' },
  ruta:     { archivo: 'ruta.html',     pref: 'rut' },
  miportal: { archivo: 'red.html',      pref: 'red' },
};
const FUENTES = { panel: '_src/panel.src.html', ruta: 'ruta.html', miportal: 'red.html', abast: 'busqueda.html' };

// Nombres que el motor de sub-apps del build pone en window. Chocar con uno de
// estos es igual de malo que chocar con el panel.
const MOTOR = ['_subappsVivas', '_abrirSubapp', '_recargarApp'];

/** El nombre nuevo. Legible a proposito: `abaRefresh` se entiende leyendolo,
 *  `ABA$refresh` parece basura de compilador — y este nombre queda escrito en
 *  la fuente para siempre, lo va a leer una persona. */
function bautizar(nombre, pref) {
  const guion = nombre.startsWith('_') ? '_' : '';
  const base = guion ? nombre.slice(1) : nombre;
  // SCREAMING_SNAKE (APPS_SCRIPT_URL) se mantiene gritando: ABA_APPS_SCRIPT_URL
  if (/^[A-Z0-9_]+$/.test(base)) return guion + pref.toUpperCase() + '_' + base;
  return guion + pref + base[0].toUpperCase() + base.slice(1);
}

// El guardia de "si me abris suelto, andate al ERP". El build lo DESCARTA al
// fusionar (fusionar.js, despiezar), asi que nunca llega a app.html: sus
// nombres no chocan con nadie y no hay que renombrarlos. Se lo saltea con el
// mismo criterio, para que las dos herramientas vean exactamente el mismo
// codigo — si una mira un bloque que la otra tira, los conteos mienten.
const ES_GUARDIA = /location\.replace\(\s*['"]\/(app|panel)\.html['"]\s*\)/;

/** Los <script> inline que de verdad se compilan, con su posicion en el HTML. */
function scriptsInline(html) {
  const out = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc=/i.test(m[1])) continue;
    if (ES_GUARDIA.test(m[2])) continue;
    const ini = m.index + m[0].indexOf('>') + 1;
    out.push({ ini, fin: ini + m[2].length, js: m[2] });
  }
  return out;
}

function globalesDe(html) {
  const js = scriptsInline(html).map((s) => s.js).join('\n;\n');
  const ast = acorn.parse(js, { ecmaVersion: 2022, sourceType: 'script', ranges: true });
  const g = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' }).scopes[0];
  const out = new Set();
  g.variables.forEach((v) => { if (v.name !== 'arguments' && v.defs.length) out.add(v.name); });
  return out;
}

/** Todas las posiciones donde un nombre global aparece COMO variable. */
function ubicarGlobales(js, aRenombrar) {
  const ast = acorn.parse(js, { ecmaVersion: 2022, sourceType: 'script', ranges: true });
  const mgr = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  const g = mgr.scopes[0];
  const puntos = [];

  g.variables.forEach((v) => {
    if (!aRenombrar.has(v.name)) return;
    const nuevo = aRenombrar.get(v.name);
    v.defs.forEach((d) => { if (d.name && d.name.range) puntos.push({ a: d.name.range[0], b: d.name.range[1], nuevo }); });
    v.references.forEach((r) => { if (r.identifier && r.identifier.range) puntos.push({ a: r.identifier.range[0], b: r.identifier.range[1], nuevo }); });
  });

  // En sourceType 'script' eslint-scope NO cuelga las referencias a globales de
  // variable.references: las deja sin resolver en globalScope.through. Si solo
  // miraramos .references renombrariamos la declaracion y ninguna de las
  // llamadas — la app compila y despues explota con "X is not defined".
  // Lo bueno de 'through': una local que tape a una global NO aparece ahi, asi
  // que el shadowing se respeta solo.
  g.through.forEach((r) => {
    const id = r.identifier;
    if (!id || !id.range) return;
    const nuevo = aRenombrar.get(id.name);
    if (nuevo) puntos.push({ a: id.range[0], b: id.range[1], nuevo });
  });

  return puntos;
}

/** Reescribe identificadores adentro del codigo de un handler. */
function reescribirHandler(codigo, aRenombrar, contador) {
  return codigo.replace(/(^|[^\w$.'"])([A-Za-z_$][\w$]*)/g, (todo, antes, id) => {
    const nuevo = aRenombrar.get(id);
    if (!nuevo) return todo;
    contador.n++;
    return antes + nuevo;
  });
}

function main() {
  const clave = process.argv[2];
  const probar = process.argv.includes('--probar');
  const app = SUBAPPS[clave];
  if (!app) { console.error('Uso: node _tools/despegar.js <' + Object.keys(SUBAPPS).join('|') + '> [--probar]'); process.exit(1); }

  const ruta = path.join(RAIZ, app.archivo);
  let html = fs.readFileSync(ruta, 'utf8');

  console.log('\n== DESPEGAR ' + clave + ' (' + app.archivo + ') ==' + (probar ? DIM + '  [solo prueba]' + RST : ''));

  // 1. Quien choca con quien
  const mias = globalesDe(html);
  const afuera = new Set(MOTOR);
  for (const [k, f] of Object.entries(FUENTES)) {
    if (k === clave) continue;
    globalesDe(fs.readFileSync(path.join(RAIZ, f), 'utf8')).forEach((n) => afuera.add(n));
  }
  const chocan = [...mias].filter((n) => afuera.has(n)).sort();

  console.log('  ' + mias.size + ' globales propias, ' + chocan.length + ' chocan con el resto del ERP');
  if (!chocan.length) { console.log(GRN + '  Ya esta despegada: no choca con nadie.' + RST + '\n'); return; }

  const aRenombrar = new Map();
  for (const n of chocan) {
    const nuevo = bautizar(n, app.pref);
    if (mias.has(nuevo) || afuera.has(nuevo)) {
      console.error(RED + '  x el nombre nuevo "' + nuevo + '" YA EXISTE. Renombralo a mano.' + RST);
      process.exit(1);
    }
    aRenombrar.set(n, nuevo);
  }

  // 2. El JS: renombrado consciente de scope
  const bloques = scriptsInline(html);
  if (bloques.length !== 1) {
    // El analisis de scope se hace sobre los bloques concatenados; con mas de
    // uno habria que mapear offsets de vuelta a cada bloque. Hoy las tres
    // sub-apps tienen exactamente uno, asi que corto antes de hacer macanas.
    console.error(RED + '  x esperaba 1 bloque <script> inline, encontre ' + bloques.length + RST);
    process.exit(1);
  }
  const b = bloques[0];
  const puntos = ubicarGlobales(b.js, aRenombrar);

  // de atras para adelante, asi los offsets no se corren
  puntos.sort((x, y) => y.a - x.a);
  let jsNuevo = b.js, ultimo = Infinity, nVars = 0;
  for (const p of puntos) {
    if (p.a >= ultimo) continue;               // duplicado (una def es tambien referencia)
    jsNuevo = jsNuevo.slice(0, p.a) + p.nuevo + jsNuevo.slice(p.b);
    ultimo = p.a; nVars++;
  }

  // 3. Los onclick que el JS arma adentro de strings — lo que el build no ve
  const cJS = { n: 0 };
  for (const re of [/(\son[a-z]+\s*=\s*")([^"]*)(")/gi, /(\son[a-z]+\s*=\s*')([^']*)(')/gi]) {
    jsNuevo = jsNuevo.replace(re, (todo, cab, val, cierre) => {
      if (!val.includes('(')) return todo;     // sin llamada no es un handler
      return cab + reescribirHandler(val, aRenombrar, cJS) + cierre;
    });
  }

  // 4. Los onclick del markup estatico (lo de afuera del <script>)
  const cMK = { n: 0 };
  const arreglarMarkup = (txt) => txt.replace(/\b(on[a-z]+|href)\s*=\s*"([^"]*)"/gi, (todo, attr, val) => {
    if (attr.toLowerCase() === 'href' && !/^javascript:/i.test(val)) return todo;
    return attr + '="' + reescribirHandler(val, aRenombrar, cMK) + '"';
  });
  const nuevoHtml = arreglarMarkup(html.slice(0, b.ini)) + jsNuevo + arreglarMarkup(html.slice(b.fin));

  console.log('  ' + nVars + ' referencias de variable renombradas');
  console.log('  ' + cJS.n + ' en onclick que el JS dibuja en runtime  ' + DIM + '(lo que el build no veia)' + RST);
  console.log('  ' + cMK.n + ' en onclick del markup estatico');
  console.log('\n  ' + DIM + 'nombres:' + RST);
  for (const [v, n] of aRenombrar) console.log('    ' + v.padEnd(22) + ' ->  ' + n);

  if (probar) { console.log(YEL + '\n  No escribi nada (--probar).' + RST + '\n'); return; }

  // el JS resultante tiene que parsear, si o si
  try { acorn.parse(jsNuevo, { ecmaVersion: 2022, sourceType: 'script' }); }
  catch (e) { console.error(RED + '\n  x el JS quedo roto: ' + e.message + RST); process.exit(1); }

  fs.writeFileSync(ruta, nuevoHtml);
  console.log(GRN + '\n  Escrito en ' + app.archivo + RST);
  console.log('  Corre el build: chequearColisiones() te marca lo que haya quedado.\n');
}

main();
