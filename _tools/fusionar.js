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
 * Por que no se puede pegar y ya:
 *   · Los cuatro archivos declaran nombres iguales (render, showLoader,
 *     APPS_SCRIPT_URL...). Con const, declarar dos veces es error de sintaxis:
 *     la app entera deja de arrancar. Por eso el renombrado es CONSCIENTE DE
 *     SCOPE (acorn + eslint-scope): renombra la variable, no el texto. Una
 *     propiedad que se llame igual (obj.render) queda intacta.
 *   · Cada uno trae su propio CSS con .card, .btn, .row. Se limita cada hoja
 *     de estilos a su contenedor con postcss, incluyendo @media y @keyframes.
 *   · Cada uno cree que es dueño de la pagina: registra su service worker,
 *     redirige, toca document.body. Todo eso se desactiva al fusionar.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const escope = require('eslint-scope');
const postcss = require('postcss');

const RAIZ = path.resolve(__dirname, '..');

// ── Que sub-app va en que tab del panel ──
// `pref`    → prefijo del JS. Vacio = esta sub-app YA viene con nombres unicos
//              desde la fuente y no hay que renombrarle nada (ver mas abajo).
// `prefCss` → prefijo de los @keyframes y de los ids que chocan con el panel.
//              Ese trabajo hay que hacerlo igual, este despegada o no: son
//              nombres del HTML y del CSS, no variables de JavaScript.
const APPS = {
  miportal: { archivo: 'red.html',      frame: 'miPortalFrame', cont: 'pg-miportal', pref: 'RED$', prefCss: 'RED$' },
  abast:    { archivo: 'busqueda.html', frame: 'busquedaFrame', cont: 'pg-abast',    pref: '',     prefCss: 'ABA$' },
  ruta:     { archivo: 'ruta.html',     frame: 'rutaFrame',     cont: 'pg-ruta',     pref: 'RUT$', prefCss: 'RUT$' }
};

/* ── Por que abast tiene el prefijo vacio (26/08/2026) ───────────────────────
 *
 * Hasta hoy este archivo renombraba las globales de las tres sub-apps EN CADA
 * COMPILADA. Eran 538 nombres tocados para resolver 24 colisiones reales: el
 * 95% del renombrado era daño colateral. Y cada nombre tocado era una chance
 * de romper un onclick escrito adentro de un string, que el renombrador no ve
 * — fueron 311 botones muertos, sin un solo error en consola. (25/08/2026)
 *
 * Abastecimiento ya no pasa por ahi. Sus 21 nombres que chocaban se
 * renombraron UNA VEZ en busqueda.html con `_tools/despegar.js`, y quedaron
 * escritos en la fuente: abaRefresh, abaRender, ABA_APPS_SCRIPT_URL. Lo que
 * se lee en el archivo es lo que corre en el navegador.
 *
 * Con pref vacio el renombrado se vuelve la identidad, asi que el codigo de
 * abajo sigue andando sin ramas nuevas: recorre los mismos nombres, no cambia
 * ninguno, y devuelve la lista completa de globales — que es justo lo que
 * build.js necesita para publicarlas en window.
 *
 * Las otras dos siguen con prefijo hasta que les toque su turno.
 */

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

  return out;
}

// ════════════════════════════════════════════════════════
//  3. Renombrar los globales del JS (consciente de scope)
// ════════════════════════════════════════════════════════
// No se comparte NADA entre el panel y la sub-app: cada una queda con sus
// propios nombres. Compartir "solo un par" es lo que despues explota de
// noche, cuando uno de los dos cambia y el otro no se entera.
const NO_TOCAR = new Set([]);

function renombrarGlobales(js, pref) {
  let ast;
  try {
    ast = acorn.parse(js, { ecmaVersion: 2022, sourceType: 'script', ranges: true });
  } catch (e) {
    throw new Error('No pude parsear el JS de la sub-app: ' + e.message);
  }
  const manager = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
  const global = manager.scopes[0];

  const cambios = [];   // {start, end, nuevo}
  const renombrados = [];

  // 1) que nombres declara esta app a nivel global
  const mios = new Map();               // nombre → nombre nuevo
  global.variables.forEach((v) => {
    if (v.name === 'arguments') return;
    if (NO_TOCAR.has(v.name)) return;
    if (!v.defs.length) return;          // no lo declara esta app: es de afuera
    mios.set(v.name, pref + v.name);
    renombrados.push(v.name);
    v.defs.forEach((d) => {
      if (d.name && d.name.range) cambios.push({ start: d.name.range[0], end: d.name.range[1], nuevo: pref + v.name });
    });
    v.references.forEach((r) => {
      const id = r.identifier;
      if (id && id.range) cambios.push({ start: id.range[0], end: id.range[1], nuevo: pref + v.name });
    });
  });

  // 2) En sourceType 'script' eslint-scope NO cuelga las referencias a globales
  //    de variable.references: las deja sin resolver en globalScope.through.
  //    Si solo miraramos .references renombrabamos la declaracion y ninguna de
  //    las llamadas — la app compila y despues explota con "X is not defined".
  //    (Me paso: NP_CAT, loadLocal y renderProducts. 21/8/2026.)
  //    Lo bueno de 'through': una variable local que tape a una global NO
  //    aparece ahi, asi que el shadowing se respeta solo.
  global.through.forEach((r) => {
    const id = r.identifier;
    if (!id || !id.range) return;
    const nuevo = mios.get(id.name);
    if (!nuevo) return;                  // es de afuera (window, document, fetch…)
    cambios.push({ start: id.range[0], end: id.range[1], nuevo });
  });

  // de atras para adelante, asi los offsets no se corren
  cambios.sort((a, b) => b.start - a.start);
  let out = js;
  let ultimo = Infinity;
  cambios.forEach((c) => {
    if (c.start >= ultimo) return;       // duplicado (una def es tambien referencia)
    out = out.slice(0, c.start) + c.nuevo + out.slice(c.end);
    ultimo = c.start;
  });

  return { js: out, renombrados };
}

// ════════════════════════════════════════════════════════
//  3b. Los onclick del markup apuntan a los nombres viejos
// ════════════════════════════════════════════════════════
/** Reescribe SOLO adentro de los atributos on*="..." y href="javascript:..." */
function acotarMarkup(markup, renombrados, pref) {
  const set = new Set(renombrados);
  let n = 0;
  const reescribir = (codigo) => codigo.replace(/(^|[^\w$.'"])([A-Za-z_$][\w$]*)/g, (todo, antes, id) => {
    if (!set.has(id)) return todo;
    n++;
    return antes + pref + id;
  });
  const out = markup.replace(/\b(on[a-z]+|href)\s*=\s*"([^"]*)"/gi, (todo, attr, val) => {
    if (attr.toLowerCase() === 'href' && !/^javascript:/i.test(val)) return todo;
    return attr + '="' + reescribir(val) + '"';
  });
  return { markup: out, tocados: n };
}

// ════════════════════════════════════════════════════════
//  3c. Los onclick que el JS DIBUJA en runtime
// ════════════════════════════════════════════════════════
/* acotarMarkup() arriba solo toca el markup ESTATICO. Pero las sub-apps dibujan
   casi toda su pantalla desde JavaScript:

       html += '<button onclick="rutaGo(-1)">Anterior</button>';

   Ese onclick es un string comun para el renombrador: no lo ve. Entonces la
   funcion pasaba a llamarse RED$rutaGo y el boton seguia invocando rutaGo, que
   ya no existia. No tiraba error visible: el boton simplemente no hacia nada.
   Eran 311 botones en 148 funciones, casi todos de Ruta y Abastecimiento, que
   son las dos que mas markup arman por JS. (25/8/2026) */
function acotarHandlersEnJS(js, renombrados, pref) {
  const set = new Set(renombrados);
  let n = 0;
  const reescribir = (codigo) => codigo.replace(/(^|[^\w$.'"])([A-Za-z_$][\w$]*)/g, (todo, antes, id) => {
    if (!set.has(id)) return todo;
    n++;
    return antes + pref + id;
  });
  // Las dos formas que este codigo usa de verdad (verificado: 0 handlers con
  // comillas escapadas en ruta/red/busqueda, 28 con comilla simple en ruta). Se
  // exige un '(' en el cuerpo: sin llamada no es un handler, y asi no tocamos
  // cosas como  var onclick = "algo".
  const FORMAS = [
    /(\son[a-z]+\s*=\s*")([^"]*)(")/gi,
    /(\son[a-z]+\s*=\s*')([^']*)(')/gi,
  ];
  for (const re of FORMAS) {
    js = js.replace(re, (todo, cab, val, cierre) => {
      if (!val.includes('(')) return todo;
      return cab + reescribir(val) + cierre;
    });
  }
  return { js, tocados: n };
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

  // JS: se une todo y se renombra de una, asi las apps ven sus propias globales
  const jsCrudo = p.scripts.join('\n;\n');
  const { js: jsRen, renombrados } = renombrarGlobales(jsCrudo, app.pref);

  // los onclick del HTML todavia nombran las funciones viejas
  const mk = acotarMarkup(p.cuerpo, renombrados, app.pref);

  // ...y los que el JS dibuja en runtime, tambien
  const hj = acotarHandlersEnJS(jsRen, renombrados, app.pref);

  // ids que ya existen en el panel
  const idsPanel = leerIds(fs.readFileSync(path.join(RAIZ, '_src', 'panel.src.html'), 'utf8'));
  const mios = leerIds(p.cuerpo);
  const chocan = [...mios].filter((x) => idsPanel.has(x));
  const ai = acotarIds(mk.markup, hj.js, chocan, app.prefCss);

  const { js: jsFinal, tocados } = domesticar(ai.js, app.cont);

  console.log('  ' + renombrados.length + ' globales renombradas');
  console.log('  ' + mk.tocados + ' referencias reescritas en los onclick del markup');
  console.log('  ' + hj.tocados + ' en los onclick que el JS dibuja en runtime');
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
    renombrados,          // nombres ORIGINALES (los usa el markup)
    pref: app.pref,       // para reconstruir el nombre nuevo: pref + original
    idsRenombrados: chocan
  };
}

function leerIds(html) {
  const s = new Set(); let m;
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  while ((m = re.exec(html))) s.add(m[1]);
  return s;
}

module.exports = { fusionar, APPS, acotarCss, renombrarGlobales, despiezar, domesticar, acotarMarkup, acotarIds };

if (require.main === module) {
  const clave = process.argv[2];
  if (!clave) { console.error('Uso: node _tools/fusionar.js <miportal|abast|ruta>'); process.exit(1); }
  const r = fusionar(clave);
  const salida = path.join(require('os').tmpdir(), 'fusion-' + clave + '.json');
  fs.writeFileSync(salida, JSON.stringify(r, null, 1));
  console.log('  → ' + salida);
}
