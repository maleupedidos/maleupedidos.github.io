#!/usr/bin/env node
/*
 * despegar-ids.js — le da nombre propio a los ids de una tab, UNA SOLA VEZ.
 *
 *   node _tools/despegar-ids.js abast          ← ve qué haría
 *   node _tools/despegar-ids.js abast --aplicar
 *
 * ── Por que existe (26/08/2026) ─────────────────────────────────────────────
 *
 * Es el hermano de despegar.js. Aquel saco los nombres de JavaScript de las
 * manos del build; este saca los ids del HTML, que era el hueco que quedaba.
 *
 * El sintoma con el que aparecio: la sub-tab "+ NUEVO" de Abastecimiento salia
 * EN BLANCO. La causa: Ruta y Abastecimiento declaran los dos un
 * <div id="nuevoView">, y en el ERP fusionado los dos viven en el mismo
 * documento. document.getElementById('nuevoView') devuelve SIEMPRE el primero
 * del documento — el de Ruta —, que esta adentro de #p-ruta y por lo tanto en
 * display:none. Asi que Abastecimiento le prendia la luz a la pieza de Ruta y
 * su propia pieza no se encendia nunca.
 *
 * No tiraba error. El elemento existe, el codigo corre, y la pantalla queda
 * vacia. Exactamente la misma forma de fallar que los 311 botones muertos.
 *
 * Eran 14 ids, y Abastecimiento perdia los 14 por ir ultimo en el documento:
 *   nuevoView loadingView emptyView errorView   ← las cuatro vistas
 *   btnRefresh statusDot syncBanner lastSync counterBadge   ← el encabezado
 *   confirmOverlay ptrIndicator toast loaderOverlay loaderMsg
 *
 * ── Por que en la fuente y no en el build ───────────────────────────────────
 *
 * El build ya renombraba los ids que chocaban CONTRA EL PANEL (acotarIds), en
 * cada compilada. Nunca comparo una tab contra otra, que es donde estaba el
 * bug. Pero el problema de fondo es el mismo que ya nos costo dos veces caro:
 * un renombrado automatico y silencioso hace que lo que leemos en el archivo
 * no sea lo que corre en el navegador.
 *
 * Entonces se hace al reves: los ids se despegan una vez, quedan escritos, y
 * el build deja de tocarlos. Si dos fuentes vuelven a chocar, chequearIds()
 * CORTA el build y dice cual. Un error ruidoso en vez de un arreglo callado.
 *
 * ── Que toca y que NO ───────────────────────────────────────────────────────
 *
 * Un mismo texto significa cosas distintas segun donde este, asi que el archivo
 * se parte en tres y cada parte se trata aparte:
 *
 *   markup   solo  id="x"          ← NUNCA class="x": .toast es una clase CSS
 *   <script> solo  'x'  "x"  '#x'  ← nunca el identificador suelto
 *   <style>  solo  #x             ← el selector, no la clase .x
 *
 * Por eso `var counterBadge = ...` sobrevive intacto y `class="toast"` tambien.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const GRN = '\x1b[32m', YEL = '\x1b[33m', RED = '\x1b[31m', DIM = '\x1b[2m', RST = '\x1b[0m';

const TABS = {
  abast:    { archivo: 'busqueda.html', pref: 'aba' },
  ruta:     { archivo: 'ruta.html',     pref: 'rut' },
  miportal: { archivo: 'red.html',      pref: 'red' },
};

const FUENTES = { panel: '_src/panel.src.html', ...Object.fromEntries(
  Object.entries(TABS).map(([k, v]) => [k, v.archivo])) };

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Cuando el nombre automatico pisaria una funcion que ya existe, se elige a
 * mano. Pasa con miportal: la funcion global ya se llama redToast desde que se
 * despegaron los nombres de JS, y un id igual haria que window.redToast sea
 * ambiguo — el acceso por nombre del DOM y la funcion pelean por la misma
 * propiedad de window. */
const A_MANO = { miportal: { toast: 'redToastBox' } };

/** aba + nuevoView → abaNuevoView. Si ya arranca con el prefijo, no lo repite. */
function bautizar(id, pref, tab) {
  const elegido = A_MANO[tab] && A_MANO[tab][id];
  if (elegido) return elegido;
  if (id.startsWith(pref) && /^[A-Z]/.test(id.slice(pref.length))) return id;
  return pref + id[0].toUpperCase() + id.slice(1);
}

/** Los ids declarados en el markup de un archivo (sin <script> ni <style>). */
function idsDe(texto) {
  const cuerpo = texto.replace(/<style[\s\S]*?<\/style>/gi, '')
                      .replace(/<script[\s\S]*?<\/script>/gi, '');
  const s = new Set();
  let m; const re = /\bid\s*=\s*["']([^"']+)["']/g;
  while ((m = re.exec(cuerpo))) s.add(m[1]);
  return s;
}

/** Qué ids de esta tab chocan con otra fuente (otra tab o el panel). */
function colisiones(tab) {
  const mios = idsDe(fs.readFileSync(path.join(RAIZ, FUENTES[tab]), 'utf8'));
  const contra = {};
  for (const [otro, arch] of Object.entries(FUENTES)) {
    if (otro === tab) continue;
    const suyos = idsDe(fs.readFileSync(path.join(RAIZ, arch), 'utf8'));
    for (const id of mios) if (suyos.has(id)) (contra[id] = contra[id] || []).push(otro);
  }
  return contra;
}

/** Las globales que declara un archivo, para no bautizar un id con un nombre
 *  que ya es una función. Si coincidieran, window.x sería ambiguo: el acceso
 *  por nombre del DOM y la función pelean por la misma propiedad. */
function globalesDe(texto) {
  const s = new Set();
  (texto.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || []).forEach((b) => {
    const js = b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    let m;
    const re = /^\s*(?:function\s+([A-Za-z_$][\w$]*)|(?:var|let|const)\s+([A-Za-z_$][\w$]*))/gm;
    while ((m = re.exec(js))) s.add(m[1] || m[2]);
  });
  return s;
}

/** Reemplaza un id en las tres zonas, cada una con su regla. */
function renombrar(texto, viejo, nuevo) {
  const e = esc(viejo);
  const cuenta = { markup: 0, js: 0, css: 0 };

  // El archivo se recorre en tramos: dentro de <script>, dentro de <style>,
  // y el resto (markup). Así una regla no se escapa a la zona de al lado.
  const partido = texto.split(/(<script[^>]*>[\s\S]*?<\/script>|<style[^>]*>[\s\S]*?<\/style>)/gi);

  const salida = partido.map((tramo) => {
    if (/^<script/i.test(tramo)) {
      return tramo
        .replace(new RegExp('(["\'])' + e + '\\1', 'g'), (m, q) => { cuenta.js++; return q + nuevo + q; })
        .replace(new RegExp('(["\'])#' + e + '\\1', 'g'), (m, q) => { cuenta.js++; return q + '#' + nuevo + q; });
    }
    if (/^<style/i.test(tramo)) {
      return tramo.replace(new RegExp('#' + e + '(?![\\w-])', 'g'), () => { cuenta.css++; return '#' + nuevo; });
    }
    return tramo.replace(new RegExp('(\\bid\\s*=\\s*["\'])' + e + '(["\'])', 'g'),
      (m, a, b) => { cuenta.markup++; return a + nuevo + b; });
  }).join('');

  return { texto: salida, cuenta };
}

// ── main ────────────────────────────────────────────────────────────────────
const tab = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');

if (!TABS[tab]) {
  console.error('Uso: node _tools/despegar-ids.js <' + Object.keys(TABS).join('|') + '> [--aplicar]');
  process.exit(1);
}

const { archivo, pref } = TABS[tab];
const ruta = path.join(RAIZ, archivo);
let texto = fs.readFileSync(ruta, 'utf8');

const contra = colisiones(tab);
const ids = Object.keys(contra);

console.log('\n╔══ despegar ids: ' + tab + '  (' + archivo + ') ══╗');
if (!ids.length) {
  console.log(GRN + '  Ningun id choca con otra fuente. Nada que hacer.' + RST + '\n');
  process.exit(0);
}

// Ningún nombre nuevo puede pisar una global ya existente en este archivo.
const globales = globalesDe(texto);
const plan = ids.map((id) => {
  const nuevo = bautizar(id, pref, tab);
  return { id, nuevo, contra: contra[id], choca: globales.has(nuevo) };
});
const malos = plan.filter((p) => p.choca);
if (malos.length) {
  console.log(RED + '  El nombre nuevo pisa una global existente: ' +
    malos.map((m) => m.nuevo).join(', ') + RST);
  console.log('  Elegi otro prefijo o renombra esa global primero.\n');
  process.exit(1);
}

let total = { markup: 0, js: 0, css: 0 };
plan.forEach((p) => {
  const r = renombrar(texto, p.id, p.nuevo);
  texto = r.texto;
  total.markup += r.cuenta.markup; total.js += r.cuenta.js; total.css += r.cuenta.css;
  console.log('  ' + p.id.padEnd(16) + '→ ' + p.nuevo.padEnd(20) +
    DIM + '(chocaba con ' + p.contra.join(', ') + ')  ' +
    r.cuenta.markup + ' markup, ' + r.cuenta.js + ' js, ' + r.cuenta.css + ' css' + RST);
});

console.log('  ' + YEL + '─'.repeat(60) + RST);
console.log('  ' + ids.length + ' ids · ' + total.markup + ' en markup, ' +
  total.js + ' en JS, ' + total.css + ' en CSS');

if (!APLICAR) {
  console.log('\n  ' + DIM + 'Nada escrito. Para aplicarlo: --aplicar' + RST + '\n');
  process.exit(0);
}

// Escribir a .tmp y recien despues reemplazar: un fallo a mitad de camino no
// puede dejar el archivo vacio. (Ya paso con un CLAUDE.md, 22/08/2026.)
const tmp = ruta + '.tmp';
fs.writeFileSync(tmp, texto, 'utf8');
fs.renameSync(tmp, ruta);
console.log('\n  ' + GRN + '✓ ' + archivo + ' escrito.' + RST);
console.log('  ' + DIM + 'Ahora: npm run build  y verificar en el navegador.' + RST + '\n');
