#!/usr/bin/env node
/*
 * build.js — arma app.html: UN archivo con todo el ERP adentro.
 *
 *   node _tools/build.js                 → fusiona las 3 sub-apps
 *   node _tools/build.js miportal        → solo esa (para ir de a poco)
 *
 * SE EDITAN:  _src/panel.src.html, ruta.html, red.html, busqueda.html
 * SE PUBLICA: app.html — lo genera este script, NO se toca a mano.
 *
 * El fuente vive en _src/ a proposito: GitHub Pages corre Jekyll, que no
 * publica las carpetas que empiezan con guion bajo. Asi el codigo del ERP
 * deja de estar servido dos veces (una compilado y otra en crudo).
 *
 * Si un anclaje no aparece EXACTAMENTE una vez, el build corta con error.
 * Prefiero que no compile a que publique un ERP roto un viernes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { fusionar, APPS, globalesDe } = require('./fusionar');

const RAIZ = path.resolve(__dirname, '..');
const FUENTE = path.join(RAIZ, '_src', 'panel.src.html');   // el que se edita
// /app.html ES el ERP. (25/8/2026)
//
// El 21/8 esto fue una vuelta atras temporal: el ERP fusionado se le quedaba
// sin responder a los toques en el celular de Tadeo, no se pudo reproducir
// (aca solo hay Chromium; su telefono es WebKit) y se publico aparte en
// /app.html para no bloquear a nadie. El 25/8 Tadeo lo probo en su iPhone,
// instalado como app: responde bien. El bug era el de los manejadores de
// touch (commit d375429) y ya estaba arreglado.
//
// Se queda en /app.html en vez de volver a 'panel.html' porque el icono que
// Tadeo tiene hoy en el celular apunta aca. /panel.html quedo como puente
// que redirige, para los iconos viejos de repartidores y vendedores.
const SALIDA = path.join(RAIZ, 'app.html');

// tab del panel  →  clave de la sub-app
const TAB = { miportal: 'miportal', ruta: 'ruta', busqueda: 'abast' };

function unaVez(s, aguja, quien) {
  const n = s.split(aguja).length - 1;
  if (n !== 1) {
    console.error('\n✗ ANCLAJE ROTO (' + quien + '): esperaba 1 aparicion, encontre ' + n);
    console.error('  ' + JSON.stringify(aguja.slice(0, 110)));
    process.exit(1);
  }
}

function reemplazar(s, viejo, nuevo, quien) {
  unaVez(s, viejo, quien);
  return s.replace(viejo, nuevo);
}

/* Donde va cada tab adentro del panel.
 *
 * Esto es lo UNICO que el build reemplaza del panel, y es legitimo: pega el
 * contenido de otro archivo en un lugar marcado. No reescribe logica.
 *
 * Hasta el 27/8/2026 tambien reescribia el lazy-load, el boton actualizar y
 * la lista de service workers. Eso hacia que panel.src.html mintiera: lo que
 * leias no era lo que corria. El sintoma clasico fue el loader de Ruta, que
 * se saco de la fuente el 22/8 y siguio saliendo tres dias porque el build lo
 * volvia a inyectar. Hoy todo eso vive en la fuente. */
const COLA = `
/* -- Si tocaste una tab antes de que llegara este script -----------------
   El panel la anoto en _tabPendiente en vez de reventar (ver abrirTab() en
   panel.src.html). Se abre ahora.

   Va aca abajo de todo A PROPOSITO: el motor se define arriba, pero el codigo
   de cada tab se define en los bloques de recien. Desencolar al final del
   MOTOR dejaba "tab desconocida: ruta" en la consola y la pantalla vacia,
   porque _SUBAPP_ruta todavia no existia. */
if(typeof _tabPendiente !== 'undefined' && _tabPendiente){
  var _pend = _tabPendiente; _tabPendiente = null; _abrirSubapp(_pend);
}
`;

const IFRAMES = {
  miportal: { iframe: `<iframe id="miPortalFrame" src="about:blank" style="width:100%;height:calc(100vh - 70px);border:none;background:#fff;border-radius:8px"></iframe>` },
  ruta:     { iframe: `<iframe id="rutaFrame" src="about:blank" style="width:100%;height:calc(100vh - 80px);border:none;background:#fff;border-radius:8px"></iframe>` },
  busqueda: { iframe: `<iframe id="busquedaFrame" src="about:blank" style="width:100%;height:calc(100vh - 70px);border:none;background:#fff;border-radius:8px"></iframe>` }
};

/** Encuentra la rama `if(active==='X'){ ... }` completa dentro de
 *  refreshContextual y devuelve [desde, hasta) contando llaves.
 *
 *  Antes esto pegaba el texto EXACTO de cada rama. Cada vez que se tocaba el
 *  ↻ en panel.src.html habia que venir a copiar el bloque nuevo aca adentro,
 *  y si te olvidabas el build cortaba. Contando llaves alcanza con que la rama
 *  exista. Igual sigue cortando fuerte si no la encuentra: prefiero no
 *  compilar antes que publicar un ERP con el boton actualizar roto.
 *  (Tadeo, 22/8/2026) */
function cortarRama(html, clave, quien) {
  const marca = "  if(active==='" + clave + "'){";
  const i = html.indexOf(marca);
  if (i < 0) { console.error('\n✗ No encontre la rama ' + quien + ' del ↻'); process.exit(1); }
  if (html.indexOf(marca, i + 1) >= 0) { console.error('\n✗ La rama ' + quien + ' del ↻ aparece mas de una vez'); process.exit(1); }
  let n = 0, j = i;
  for (; j < html.length; j++) {
    const c = html[j];
    if (c === '{') n++;
    else if (c === '}') { n--; if (n === 0) { j++; break; } }
  }
  if (n !== 0) { console.error('\n✗ No pude cerrar la rama ' + quien + ' del ↻'); process.exit(1); }
  while (html[j] === '\n') j++;
  return [i, j];
}

/** El ↻ mandaba postMessage a iframes y recargaba URLs. Ahora Ruta,
 *  Abastecimiento y Mi Portal son modulos: se les llama la funcion y listo.
 *  Ademas hay UNA sola version que chequear, no tres. */
/* A que funcion le pide datos frescos el ↻ de cada tab.
 *
 * Esto ya NO se inyecta: las tres ramas estan escritas en panel.src.html, que
 * es donde se leen y se tocan. Aca queda solo la lista de nombres, para que
 * chequearCosturas() los verifique contra el bundle antes de publicar. */
const REFRESCO = {
  miportal: { fn: 'refreshPortal',     args: '',          quien: 'Mi Portal',      cierre: 'lo' },
  busqueda: { fn: 'abaRefresh',        args: 'true',      quien: 'Abastecimiento', cierre: 'lo' },
  ruta:     { fn: 'refresh',           args: 'true,true', quien: 'Ruta',           cierre: 'la' },
};

/* Corta el build si dos fuentes declaran el mismo nombre global.
 *
 * ESTE ES EL CANDADO QUE REEMPLAZA AL RENOMBRADOR. (26/08/2026)
 *
 * Antes, dos `render` no eran un problema: el build les ponia prefijo y listo.
 * Ese arreglo automatico costaba caro — renombraba 538 nombres para resolver
 * 24 colisiones, y rompia los onclick escritos adentro de strings (311 botones
 * muertos, sin un error en consola).
 *
 * Ahora los nombres vienen unicos desde la fuente, asi que nadie los arregla
 * en el camino: dos globales iguales se PISAN, gana la ultima que carga, y la
 * otra sub-app se rompe de una forma dificil de rastrear.
 *
 * Por eso esto corta la compilada y dice exactamente que hacer. Cambiamos un
 * arreglo silencioso por un error ruidoso: el build se niega a publicar un ERP
 * con dos funciones peleandose el mismo nombre.
 */
function chequearColisiones(fus) {
  const donde = {};   // nombre → [sub-apps que lo declaran]
  for (const [tab, r] of Object.entries(fus)) {
    for (const n of r.globales) (donde[n] = donde[n] || []).push(tab);
  }
  // El panel tambien juega: sus globales viven en el mismo window.
  const panel = new Set(globalesDelPanel());
  const choques = Object.entries(donde)
    .filter(([n, apps]) => apps.length > 1 || panel.has(n))
    .map(([n, apps]) => [n, panel.has(n) ? ['panel', ...apps] : apps]);

  if (!choques.length) return;
  console.error('\n✗ ' + choques.length + ' nombre(s) declarados en mas de un lugar:');
  choques.forEach(([n, apps]) => console.error('    ' + n.padEnd(24) + apps.join(' + ')));
  console.error('\n  Sin renombrador estos se pisan en silencio: gana el ultimo que carga.');
  console.error('  Arreglalo renombrando en la FUENTE:  node _tools/despegar.js <tab>');
  process.exit(1);
}

/* Lo mismo que chequearColisiones, pero para los ids del HTML. Es un candado
 * aparte porque la forma de fallar es distinta y bastante peor.
 *
 * Dos funciones con el mismo nombre al menos se pisan: gana una, y si te fijas
 * en consola algo raro ves. Dos ELEMENTOS con el mismo id no se pisan: conviven
 * los dos en el documento, y getElementById devuelve siempre el primero. O sea
 * que la tab que va segunda le habla a los elementos de la primera —que estan
 * en display:none— y su propia pantalla no se entera de nada.
 *
 * No hay error, no hay warning, no hay nada. La pantalla sale EN BLANCO.
 *
 * Paso de verdad: Ruta y Abastecimiento declaraban los dos un id="nuevoView", y
 * la sub-tab "+ NUEVO" de Abastecimiento salia vacia. Eran 14 ids compartidos, y
 * Abastecimiento perdia los 14 por ir ultimo en el documento — incluidas las
 * cuatro vistas (loadingView, emptyView, errorView, nuevoView), que es tambien
 * por que habia que tocar el ↻ una vez para que la tab arrancara. (26/08/2026)
 */
function chequearIds(fus) {
  const donde = {};   // id → [tabs que lo declaran]
  for (const [tab, r] of Object.entries(fus)) {
    for (const id of r.ids) (donde[id] = donde[id] || []).push(tab);
  }
  const panel = leerIds(fs.readFileSync(FUENTE, 'utf8'));
  const choques = Object.entries(donde)
    .filter(([id, tabs]) => tabs.length > 1 || panel.has(id))
    .map(([id, tabs]) => [id, panel.has(id) ? ['panel', ...tabs] : tabs]);

  if (!choques.length) return;
  console.error('\n✗ ' + choques.length + ' id(s) declarados en mas de un lugar:');
  choques.forEach(([id, tabs]) => console.error('    ' + id.padEnd(24) + tabs.join(' + ')));
  console.error('\n  En el ERP fusionado los dos elementos existen a la vez y');
  console.error('  getElementById devuelve el primero. La tab que va segunda le');
  console.error('  habla a la pantalla de la otra: sale en blanco, sin ningun error.');
  console.error('\n  Arreglalo renombrando en la FUENTE:  node _tools/despegar-ids.js <tab>');
  process.exit(1);
}

/** Los ids que declara el markup de un archivo (sin <script> ni <style>). */
function leerIds(html) {
  const cuerpo = html.replace(/<style[\s\S]*?<\/style>/gi, '')
                     .replace(/<script[\s\S]*?<\/script>/gi, '');
  const s = new Set(); let m;
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  while ((m = re.exec(cuerpo))) s.add(m[1]);
  return s;
}

/** Las globales del panel — comparten window con las sub-apps. */
function globalesDelPanel() {
  const html = fs.readFileSync(FUENTE, 'utf8');
  const js = [];
  html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (t, attrs, codigo) => {
    if (!/\bsrc=/i.test(attrs)) js.push(codigo);
    return '';
  });
  try { return globalesDe(js.join('\n;\n')); }
  catch (e) { console.error('\n✗ No pude leer las globales del panel: ' + e.message); process.exit(1); }
}

/** Corta el build si el panel llama a algo que no llego al bundle.
 *
 * Son las dos costuras entre el panel y las tabs, y las dos erran CALLADAS:
 *
 *  - el ↻ hace `typeof X!=='function'` y, si el nombre no existe, muestra
 *    "Entra una vez a X antes de actualizarlo". Un mensaje que miente, sobre
 *    un boton que no anda. Paso al despegar Abastecimiento (25/8/2026).
 *  - `_abrirSubapp` la define el motor, que se pega al final del body. Si le
 *    cambian el nombre ahi, la tab no abre nunca y tampoco hay error: esa
 *    funcion ya se traga las excepciones en un try/catch.
 *
 * Ninguna de las dos la agarran verificar.js ni humo.js, porque no son
 * onclick. Por eso se chequean aca. */
function chequearCosturas(html) {
  const faltan = Object.values(REFRESCO)
    .filter((r) => !html.includes('window["' + r.fn + '"]='))
    .map((r) => [r.quien + ' (↻)', r.fn]);
  if (!/function\s+_abrirSubapp\s*\(/.test(html)) {
    faltan.push(['abrir una tab', '_abrirSubapp']);
  }
  // El amortiguador: sin el, tocar una tab en el primer segundo revienta.
  if (!/function\s+abrirTab\s*\(/.test(html)) faltan.push(['abrir una tab (cola)', 'abrirTab']);
  if (!/_tabPendiente\s*=\s*null;\s*_abrirSubapp\(_pend\)/.test(html)) {
    faltan.push(['vaciar la cola de tabs', 'el final del MOTOR']);
  }
  if (!faltan.length) return;
  console.error('\n✗ El panel llama a funciones que NO existen en el bundle:');
  faltan.forEach(([quien, fn]) => console.error('    ' + quien.padEnd(24) + fn));
  console.error('  Se renombro la funcion y quedo el nombre viejo escrito.');
  console.error('  Eso no tira error en consola: la tab simplemente no responde.');
  process.exit(1);
}

/** Reemplaza la ULTIMA aparicion (la que cierra el documento de verdad). */
function enElUltimo(s, aguja, nuevo) {
  const i = s.lastIndexOf(aguja);
  if (i < 0) { console.error('\n✗ No encontre ' + aguja); process.exit(1); }
  return s.slice(0, i) + nuevo + s.slice(i + aguja.length);
}

function main() {
  const pedidas = process.argv.slice(2).filter((a) => TAB[a] || APPS[a]);
  const tabs = pedidas.length
    ? pedidas.map((a) => (TAB[a] ? a : Object.keys(TAB).find((t) => TAB[t] === a)))
    : Object.keys(TAB);

  console.log('\n╔══ BUILD app.html ══╗');
  console.log('  fusionando: ' + tabs.join(', ') + '\n');

  let html = fs.readFileSync(FUENTE, 'utf8');
  const cssTodo = [];
  const jsTodo = [];

  // (se fusiona una sola vez y se guarda: fusionar() no es barato)
  const _fus = {};
  tabs.forEach((tab) => { _fus[tab] = fusionar(TAB[tab]); });
  if (tabs.length === Object.keys(TAB).length) { chequearColisiones(_fus); chequearIds(_fus); }

  tabs.forEach((tab) => {
    const clave = TAB[tab];
    const r = _fus[tab];

    // 1) el iframe se vuelve un div con la app adentro
    const ifr = IFRAMES[tab];
    html = reemplazar(html, ifr.iframe,
      '<div id="' + r.cont + '" class="subapp ' + (r.clasesBody || '') + '">\n' + r.markup + '\n</div>',
      tab + ': iframe → div');

    // 2) CSS y JS
    cssTodo.push('/* ═══ ' + clave + ' (de ' + APPS[clave].archivo + ') ═══ */\n' + r.css);
    jsTodo.push(envolver(clave, r));
    console.log('');
  });

  // 3) el CSS de las tabs, al final del head
  //    Ojo: "</head>" y "</body>" tambien aparecen adentro de strings del JS
  //    del panel. El que cierra el documento de verdad es SIEMPRE el ultimo.
  html = enElUltimo(html, '</head>',
    '<style id="css-subapps">\n' + cssTodo.join('\n\n') + '\n</style>\n</head>');

  // 4) el motor de tabs + el JS de cada una, al final del body
  html = enElUltimo(html, '</body>',
    '<script>\n' + MOTOR + '\n' + jsTodo.join('\n') + '\n' + COLA + '\n</script>\n</body>');

  // Se chequea recien aca porque el JS de las tabs y el motor se agregan en
  // los pasos 3 y 4: antes de eso todavia no hay window a que mirar.
  if (tabs.length === Object.keys(TAB).length) chequearCosturas(html);

  fs.writeFileSync(SALIDA, html);

  // panel.html YA NO SE GENERA. (25/8/2026)
  // Mientras el ERP fusionado estaba en prueba, aca se copiaba panel.src.html
  // encima de panel.html para que el icono de Tadeo siguiera abriendo la
  // version con iframes. Ahora /app.html ES el ERP, y /panel.html es un
  // redirect de 30 lineas escrito a mano — si el build lo volviera a pisar,
  // publicaria el ERP entero en crudo por segunda vez y sin compilar.
  console.log('╚══ app.html: ' + Math.round(html.length / 1024) + ' KB ══╝\n');
}

/** Cada sub-app queda adentro de una funcion que corre la primera vez que
 *  abris su tab — igual que hoy, que el iframe no carga hasta que entras.
 *  Al final se exportan sus nombres a window porque los onclick del markup
 *  viven en el HTML y solo ven lo global. */
function envolver(clave, r) {
  // Los onclick del HTML solo ven lo global, pero el codigo de la sub-app vive
  // adentro de una funcion. Por eso cada global se publica en window.
  //
  // Antes aca habia tambien un ALIAS del nombre viejo, porque el build
  // renombraba las globales y los onclick armados por concatenacion —
  //     onclick="'+(x?'unaFuncion()':'otraFuncion()')+'"
  // — seguian nombrando el viejo. Ya no hay renombrado ni nombres viejos: el
  // nombre de la fuente es el que va a window. Se fueron 62 KB de alias.
  const exports = r.globales
    .map((n) => 'try{window[' + JSON.stringify(n) + ']=' + n + ';}catch(e){}')
    .join('');
  return `
/* ═══════════ ${clave} ═══════════ */
window._SUBAPP_${clave} = function(){
var _cont${r.cont.replace(/-/g, '_')} = document.getElementById(${JSON.stringify(r.cont)});
${r.js}
${exports}
};`;
}


// Motor comun: arranca cada sub-app una sola vez y le da un reload honesto.
const MOTOR = `
/* ══════════════════════════════════════════════════════════
   MOTOR DE SUB-APPS — generado por _tools/build.js, no editar
   Ruta, Abastecimiento y Mi Portal ya no son tres paginas en
   tres iframes: son tres modulos de esta misma app. Cada uno
   arranca la primera vez que abris su tab, igual que antes.
   ══════════════════════════════════════════════════════════ */
var _subappsVivas = {};
function _abrirSubapp(clave){
  if(_subappsVivas[clave])return;
  var f = window['_SUBAPP_' + clave];
  if(typeof f !== 'function'){ console.error('tab desconocida:', clave); return; }
  _subappsVivas[clave] = true;
  try{ f(); }
  catch(e){
    _subappsVivas[clave] = false;
    console.error('La tab ' + clave + ' no arranco:', e);
    if(typeof toast === 'function') toast('No pude abrir esa seccion — mante apretado el boton de actualizar');
  }
}
/* Una sub-app pedia location.reload() cuando se le vencia la sesion. Ahora
   eso reinicia el ERP entero, asi que pasa por el mismo camino del panel. */
function _recargarApp(){ location.reload(); }
`;

main();
