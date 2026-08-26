#!/usr/bin/env node
/*
 * fusionar.js — mete una sub-app (ruta.html, red.html, busqueda.html) ADENTRO
 * de app.html, para que el ERP sea una sola aplicacion en vez de tres.
 *
 *   node _tools/fusionar.js miportal      → fusiona red.html
 *   node _tools/fusionar.js abast         → fusiona busqueda.html
 *   node _tools/fusionar.js ruta          → fusiona ruta.html
 *
 * Los archivos fuente NO se tocan: se siguen editando por separado. Este
 * script es el que arma el archivo unico que se publica. Si mañana editas
 * ruta.html, corres el build y listo.
 *
 * Lo que hace falta hacerle a una sub-app para que conviva con las otras:
 *   · Su CSS trae .card, .btn, .row igual que el panel. Se encierra cada hoja
 *     de estilos en su contenedor con postcss, incluyendo @media y @keyframes.
 *   · Sus ids del HTML (toast, loaderOverlay) chocan con los del panel. Se
 *     les pone prefijo en el markup y en el JS que los busca.
 *   · Cree que es dueña de la pagina: registra su service worker, redirige,
 *     toca document.body, cuelga manejadores de dedo del documento. Todo eso
 *     se desactiva al fusionar.
 *
 * ── Lo que este archivo YA NO HACE (26/08/2026) ─────────────────────────────
 *
 * Hasta hoy tambien RENOMBRABA las globales de cada sub-app en cada compilada,
 * con acorn, para que no chocaran entre si: RUT$render, ABA$refresh, RED$toast.
 *
 * Eran 538 nombres tocados para resolver 24 colisiones reales — el 95% era
 * daño colateral. Y cada nombre tocado era una chance de romper un onclick
 * escrito adentro de un string, porque las sub-apps dibujan su pantalla asi:
 *
 *     html += '<button onclick="rutaGo(-1)">Anterior</button>';
 *
 * Para el renombrador ese onclick es un string cualquiera: no lo ve. Fueron
 * 311 botones muertos, sin un solo error en consola. (25/08/2026)
 *
 * Hoy los nombres vienen unicos DESDE LA FUENTE. Se renombraron una vez con
 * `_tools/despegar.js` y quedaron escritos: abaRefresh, rutRender, redToast.
 * Lo que se lee en el archivo es lo que corre en el navegador.
 *
 * Eso no se sostiene solo: si mañana alguien declara un `render` en dos
 * fuentes, sin renombrador se pisan en silencio y gana el ultimo que carga.
 * Por eso build.js corta la compilada si detecta un nombre repetido
 * (chequearColisiones). El renombrado en silencio se cambio por un error
 * ruidoso, que es lo que uno quiere de un build.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const escope = require('eslint-scope');
const postcss = require('postcss');

const RAIZ = path.resolve(__dirname, '..');

// ── Que sub-app va en que tab del panel ──
// `prefCss` → prefijo de los @keyframes y de los ids que chocan con el panel.
//              Son nombres del HTML y del CSS, no variables de JavaScript: el
//              renombrado del JS nunca los cubrio y esto sigue haciendo falta.
const APPS = {
  miportal: { archivo: 'red.html',      frame: 'miPortalFrame', cont: 'pg-miportal', prefCss: 'RED$' },
  abast:    { archivo: 'busqueda.html', frame: 'busquedaFrame', cont: 'pg-abast',    prefCss: 'ABA$' },
  ruta:     { archivo: 'ruta.html',     frame: 'rutaFrame',     cont: 'pg-ruta',     prefCss: 'RUT$' }
};

/** Las globales que declara este JS. No las toca: solo las lista, para que
 *  build.js sepa cuales publicar en window y pueda detectar repetidas. */
function globalesDe(js) {
  let ast;
  try {
    ast = acorn.parse(js, { ecmaVersion: 2022, sourceType: 'script', ranges: true });
  } catch (e) {
    throw new Error('No pude parsear el JS de la sub-app: ' + e.message);
  }
  const global = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' }).scopes[0];
  const out = [];
  global.variables.forEach((v) => {
    if (v.name === 'arguments' || !v.defs.length) return;   // sin defs = es de afuera
    out.push(v.name);
  });
  return out;
}

// ════════════════════════════════════════════════════════
//  1. Despiezar el HTML de la sub-app
// ════════════════════════════════════════════════════════
function despiezar(html) {
  const estilos = [];
  const scripts = [];

  // <style>…</style>
  let sinEstilos = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    estilos.push(css);
    return '';
  });

  // <script> inline (los que tienen src se conservan tal cual en el head)
  const externos = [];
  let descartados = 0;
  let sinScripts = sinEstilos.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (todo, attrs, js) => {
    if (/\bsrc=/i.test(attrs)) { externos.push(todo); return ''; }
    // El guardia de "si me abris suelto, mandame al ERP". Fusionada, la sub-app
    // YA es el ERP: si lo dejabamos, abrir la tab Ruta recargaba el ERP entero
    // y parecia que no pasaba nada. (Lo encontre probando.)
    // Se aceptan los dos destinos: /app.html es el de hoy, /panel.html quedo en
    // sub-apps que todavia no se actualizaron. (25/8/2026)
    if (/location\.replace\(\s*['"]\/(app|panel)\.html['"]\s*\)/.test(js)) { descartados++; return ''; }
    scripts.push(js);
    return '';
  });

  // cuerpo
  const m = sinScripts.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const cuerpo = m ? m[1] : sinScripts;

  // clases que el <body> original traia puestas (ej: class="app")
  const mb = html.match(/<body([^>]*)>/i);
  const clasesBody = mb && /class\s*=\s*["']([^"']*)["']/i.test(mb[1])
    ? mb[1].match(/class\s*=\s*["']([^"']*)["']/i)[1] : '';

  return { estilos, scripts, externos, cuerpo, clasesBody, descartados };
}

// ════════════════════════════════════════════════════════
//  2. Encerrar el CSS adentro del contenedor
// ════════════════════════════════════════════════════════
function acotarCss(css, cont, pref) {
  const sel = '#' + cont;
  const keyframes = new Set();

  const raiz = postcss.parse(css);

  // 2a. @keyframes: renombrar para que no pise los del panel
  raiz.walkAtRules(/^(-webkit-)?keyframes$/, (at) => {
    const viejo = at.params.trim();
    const nuevo = pref.replace(/\$$/, '') + '-' + viejo;
    keyframes.add(viejo);
    at.params = nuevo;
  });

  // 2b. selectores
  raiz.walkRules((regla) => {
    // los de adentro de @keyframes son 0%/from/to: no se tocan
    let p = regla.parent;
    let dentroKf = false;
    while (p) {
      if (p.type === 'atrule' && /keyframes$/.test(p.name)) { dentroKf = true; break; }
      p = p.parent;
    }
    if (dentroKf) return;

    regla.selectors = regla.selectors.map((s) => {
      s = s.trim();
      if (!s) return s;
      // :root / html / body → el contenedor mismo (asi las variables CSS y el
      // fondo siguen valiendo, pero solo adentro de la sub-app)
      if (/^(:root|html|body)$/i.test(s)) return sel;
      // body.algo → #cont.algo   |   html.x body → #cont
      s = s.replace(/^(?::root|html|body)\b/i, sel);
      if (s.startsWith(sel)) return s;
      if (s === '*') return sel + ' *';
      return sel + ' ' + s;
    });
  });

  let out = raiz.toString();

  // 2c. las referencias a los keyframes renombrados
  keyframes.forEach((k) => {
    const re = new RegExp('(animation(?:-name)?\\s*:[^;}]*?)\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    out = out.replace(re, (m0, antes) => antes + pref.replace(/\$$/, '') + '-' + k);
  });

  /* ── EL CONTENEDOR NO ES UNA PAGINA ──────────────────────────────────────
   * Arriba, `body{...}` de la sub-app se convirtio en `#pg-ruta{...}`. Para
   * los colores y el tipo de letra eso es justo lo que se quiere. Para el
   * SCROLL es una trampa, y bastante fea:
   *
   *     body { overflow-y:auto; overscroll-behavior:none }   ← en la pagina suelta
   *     #pg-ruta { overflow-y:auto; overscroll-behavior:none } ← fusionada
   *
   * En una pagina suelta eso esta bien: el body ES lo que scrollea. Fusionado,
   * `#pg-ruta` es un div que crece con su contenido — no le sobra nada para
   * scrollear. Pero al navegador le sigue diciendo "yo manejo mi scroll", asi
   * que cuando el puntero cae encima le entrega la rueda a el; el no puede
   * scrollear, y con overscroll-behavior:none tampoco se la pasa al documento.
   * El scroll muere ahi.
   *
   * Sintoma: la rueda anda o no anda segun DONDE tengas el puntero. Sobre una
   * fila de producto anda, sobre el fondo de la tab no. Lo reporto Tadeo como
   * "a veces se me traba para scrollear" el 26/8/2026 — y era literal.
   *
   * Va al final y con la misma especificidad, asi que gana por orden. Se
   * resetea solo lo que hace de una caja "una pagina": el resto del body
   * (fondo, color, fuente) se respeta. */
  out += '\n/* el contenedor de la sub-app NO scrollea solo: scrollea la pagina */\n' +
         sel + '{overflow:visible;overscroll-behavior:auto;height:auto;max-height:none;' +
         'position:static;touch-action:auto}\n';

  return out;
}

/** Los ids que chocan con el panel se renombran en el markup Y en el JS. */
function acotarIds(markup, js, idsChocan, pref) {
  let nM = 0, nJ = 0;
  const nuevo = (id) => pref.replace(/\$$/, '_') + id;

  idsChocan.forEach((id) => {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    markup = markup.replace(new RegExp('(\\bid\\s*=\\s*["\'])' + esc + '(["\'])', 'g'),
      (m0, a, b) => { nM++; return a + nuevo(id) + b; });
    // en el JS: solo strings exactamente iguales al id, o selectores "#id"
    js = js.replace(new RegExp('(["\'])' + esc + '\\1', 'g'),
      (m0, q) => { nJ++; return q + nuevo(id) + q; });
    js = js.replace(new RegExp('(["\'])#' + esc + '\\1', 'g'),
      (m0, q) => { nJ++; return q + '#' + nuevo(id) + q; });
  });
  return { markup, js, nM, nJ };
}

// ════════════════════════════════════════════════════════
//  4. Desactivar lo que asume "soy dueño de la pagina"
// ════════════════════════════════════════════════════════
function domesticar(js, cont) {
  let n = 0;
  const marca = (txt) => { n++; return txt; };

  // 4a. service worker propio: ahora hay uno solo, el del panel
  js = js.replace(/navigator\.serviceWorker\s*\.\s*register\s*\(/g,
    () => marca('(function(){}) && navigator.serviceWorker && false && navigator.serviceWorker.register('));

  // 4b. document.body → el contenedor de la sub-app
  js = js.replace(/\bdocument\.body\b/g, () => marca('_cont' + cont.replace(/-/g, '_')));

  // 4c. recargar la pagina entera: la sub-app ya no manda sobre eso
  js = js.replace(/\blocation\.reload\s*\(\s*\)/g, () => marca('_recargarApp()'));

  // 4c-bis. LO QUE MAS DOLIO. Ruta y Abastecimiento cuelgan del DOCUMENTO sus
  //   manejadores de dedo. Adentro de un iframe eso solo las afectaba a ellas.
  //   Fusionadas, pasan a gobernar el ERP entero. El peor:
  //       document.addEventListener('touchend', function(e){
  //         if (now - lastTouchEnd <= 350) e.preventDefault();   // anti zoom
  //       }, {passive:false});
  //   preventDefault() en touchend CANCELA EL CLICK. O sea: con solo haber
  //   entrado una vez a Ruta, cualquier toque que caiga a menos de 350ms del
  //   anterior se comia el clic en CUALQUIER tab. Navegando se tapea mas
  //   rapido que eso, asi que la app se sentia muerta aunque los datos se
  //   actualizaran. Lo mismo el pull-to-refresh, que secuestraba el scroll.
  //   Ojo: esto NO se ve clickeando con el mouse — solo con el dedo. Por eso
  //   se me paso en las pruebas. (21/8/2026)
  var _EV_DEDO = ['touchstart','touchmove','touchend','touchcancel',
                  'gesturestart','gesturechange','gestureend',
                  'dblclick','click','contextmenu','wheel',
                  'pointerdown','pointerup','pointermove',
                  'mousedown','mouseup','mousemove'];
  var _destino = '_cont' + cont.replace(/-/g, '_');
  _EV_DEDO.forEach(function (ev) {
    ['\'', '"'].forEach(function (q) {
      var re = new RegExp('document\\.addEventListener\\(\\s*' + q + ev + q, 'g');
      js = js.replace(re, function () { n++; return _destino + '.addEventListener(' + q + ev + q; });
    });
  });

  // 4d. cada sub-app se pregunta "¿estoy embebida?" mirando la URL. Fusionada
  //     siempre lo esta: sin esto se dibuja el header propio y el boton de
  //     salir, duplicando los del panel.
  js = js.replace(/\blocation\.search\b/g, () => marca("'?embed=1&standalone=1'"));

  return { js, tocados: n };
}

// ════════════════════════════════════════════════════════
//  5. Armar todo
// ════════════════════════════════════════════════════════
function fusionar(clave) {
  const app = APPS[clave];
  if (!app) { console.error('No conozco la sub-app "' + clave + '". Son: ' + Object.keys(APPS).join(', ')); process.exit(1); }

  const rutaSub = path.join(RAIZ, app.archivo);
  const html = fs.readFileSync(rutaSub, 'utf8');
  const p = despiezar(html);

  console.log('→ ' + app.archivo);
  console.log('  ' + p.estilos.length + ' bloque(s) de CSS, ' + p.scripts.length + ' de JS, ' +
              Math.round(p.cuerpo.length / 1024) + ' KB de markup');

  // CSS
  const css = p.estilos.map((c) => acotarCss(c, app.cont, app.prefCss)).join('\n');

  // JS: se une todo, asi las apps ven sus propias globales. NO se renombra
  // nada — los nombres ya vienen unicos desde la fuente.
  const jsCrudo = p.scripts.join('\n;\n');
  const globales = globalesDe(jsCrudo);

  // ids que ya existen en el panel. Esto SI sigue: son nombres del HTML, no
  // variables de JavaScript, y el renombrado nunca los cubrio.
  const idsPanel = leerIds(fs.readFileSync(path.join(RAIZ, '_src', 'panel.src.html'), 'utf8'));
  const mios = leerIds(p.cuerpo);
  const chocan = [...mios].filter((x) => idsPanel.has(x));
  const ai = acotarIds(p.cuerpo, jsCrudo, chocan, app.prefCss);

  const { js: jsFinal, tocados } = domesticar(ai.js, app.cont);

  console.log('  ' + globales.length + ' globales, sin renombrar');
  console.log('  ' + chocan.length + ' id(s) que chocaban con el panel: ' + (chocan.join(', ') || '—') +
              '  (' + ai.nM + ' en markup, ' + ai.nJ + ' en JS)');
  console.log('  ' + tocados + ' asunciones de "dueño de la pagina" desactivadas');

  return {
    cont: app.cont,
    frame: app.frame,
    clasesBody: p.clasesBody,
    css,
    markup: ai.markup,
    js: jsFinal,
    globales,             // para publicarlas en window: el nombre es el que es
    idsRenombrados: chocan
  };
}

function leerIds(html) {
  const s = new Set(); let m;
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  while ((m = re.exec(html))) s.add(m[1]);
  return s;
}

module.exports = { fusionar, APPS, acotarCss, globalesDe, despiezar, domesticar, acotarIds };

if (require.main === module) {
  const clave = process.argv[2];
  if (!clave) { console.error('Uso: node _tools/fusionar.js <miportal|abast|ruta>'); process.exit(1); }
  const r = fusionar(clave);
  const salida = path.join(require('os').tmpdir(), 'fusion-' + clave + '.json');
  fs.writeFileSync(salida, JSON.stringify(r, null, 1));
  console.log('  → ' + salida);
}
