#!/usr/bin/env node
/*
 * build.js — arma panel.html: UN archivo con todo el ERP adentro.
 *
 *   node _tools/build.js                 → fusiona las 3 sub-apps
 *   node _tools/build.js miportal        → solo esa (para ir de a poco)
 *
 * SE EDITAN:  panel.src.html, ruta.html, red.html, busqueda.html
 * SE PUBLICA: panel.html — lo genera este script, NO se toca a mano.
 *             Se llama asi para que el icono que ya esta instalado en el
 *             celular siga abriendo la misma URL de siempre.
 *
 * Si un anclaje no aparece EXACTAMENTE una vez, el build corta con error.
 * Prefiero que no compile a que publique un ERP roto un viernes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { fusionar, APPS } = require('./fusionar');

const RAIZ = path.resolve(__dirname, '..');
const FUENTE = path.join(RAIZ, 'panel.src.html');   // el que se edita
const SALIDA = path.join(RAIZ, 'panel.html');       // el que se publica

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

// ── Los bloques del panel que hoy prenden un iframe ──
const IFRAMES = {
  miportal: {
    iframe: `<iframe id="miPortalFrame" src="about:blank" style="width:100%;height:calc(100vh - 70px);border:none;background:#fff;border-radius:8px"></iframe>`,
    lazy: `    if(fr&&(fr.src==='about:blank'||fr.src.indexOf('about:blank')>=0)){
      fr.src='/red.html?embed=1&_t='+Date.now();
    }`,
    lazyNuevo: `    _abrirSubapp('miportal');`
  },
  ruta: {
    iframe: `<iframe id="rutaFrame" src="about:blank" style="width:100%;height:calc(100vh - 80px);border:none;background:#fff;border-radius:8px"></iframe>`,
    lazy: `    if(fr2&&(fr2.src==='about:blank'||fr2.src.indexOf('about:blank')>=0)){
      fr2.src='/ruta.html?embed=1&_t='+Date.now();
    }
    // Pedir counter actualizado al iframe (B opción 2: mostrar en statusbar)
    setTimeout(function(){try{fr2.contentWindow.postMessage({type:'maleu_ruta_get_counter'},'*');}catch(e){}},800);`,
    lazyNuevo: `    _abrirSubapp('ruta');`
  },
  busqueda: {
    iframe: `<iframe id="busquedaFrame" src="about:blank" style="width:100%;height:calc(100vh - 70px);border:none;background:#fff;border-radius:8px"></iframe>`,
    lazy: `    if(fr3&&(fr3.src==='about:blank'||fr3.src.indexOf('about:blank')>=0)){
      fr3.src='/busqueda.html?embed=1';
    }`,
    lazyNuevo: `    _abrirSubapp('abast');`
  }
};

/** El ↻ mandaba postMessage a iframes y recargaba URLs. Ahora Ruta,
 *  Abastecimiento y Mi Portal son modulos: se les llama la funcion y listo.
 *  Ademas hay UNA sola version que chequear, no tres. */
function arreglarRefresh(html) {
  // ── rama Ruta: todo el baile de postMessage + fallback ──
  const iniRuta = html.indexOf("  if(active==='ruta'){\n    var frR=");
  const finRuta = html.indexOf("  if(active==='busqueda'){", iniRuta);
  if (iniRuta < 0 || finRuta < 0) { console.error('\n✗ No encontre la rama Ruta del ↻'); process.exit(1); }
  html = html.slice(0, iniRuta) + `  // Ruta ya no es un iframe: es un modulo de esta misma app. En vez de
  // recargar una URL y esperar un postMessage, le pedimos los datos frescos
  // y esperamos SU promesa. Si falla, el boton lo dice.
  if(active==='ruta'){
    if(typeof RUT$refresh!=='function'){ done(false,'Entra una vez a Ruta antes de actualizarla'); return; }
    showLoader('Actualizando Ruta...', true);
    Promise.resolve(RUT$refresh(true,true))
      .then(function(){done(true);},function(){done(false);});
    return;
  }
` + html.slice(finRuta);

  // ── rama Abastecimiento ──
  html = reemplazar(html,
    `  if(active==='busqueda'){
    refreshIframe('busquedaFrame','/busqueda.html?embed=1','Recargando Abastecimiento...').then(function(){done(true);});
    return;
  }`,
    `  if(active==='busqueda'){
    if(typeof ABA$refresh!=='function'){ done(false,'Entra una vez a Abastecimiento antes de actualizarlo'); return; }
    showLoader('Actualizando Abastecimiento...', true);
    Promise.resolve(ABA$refresh(true))
      .then(function(){done(true);},function(){done(false);});
    return;
  }`, '↻ Abastecimiento');

  // ── rama Mi Portal ──
  html = reemplazar(html,
    `    refreshIframe('miPortalFrame','/red.html?embed=1','Actualizando Mi Portal...').then(function(){done(true);});
    return;`,
    `    if(typeof RED$refreshPortal!=='function'){ done(false,'Entra una vez a Mi Portal antes de actualizarlo'); return; }
    Promise.resolve(RED$refreshPortal())
      .then(function(){done(true);},function(){done(false);});
    return;`, '↻ Mi Portal');

  // ── una sola app = una sola version que mirar ──
  const iniApps = html.indexOf('var _APPS=[');
  const finApps = html.indexOf('];', iniApps);
  if (iniApps < 0) { console.error('\n✗ No encontre _APPS'); process.exit(1); }
  html = html.slice(0, iniApps) + `/* Antes esto miraba tres service workers, uno por app. Ahora el ERP es un
   solo archivo con un solo SW: si cambia, se recarga y punto. */
var _APPS=[
  {k:'panel', sw:'/sw-panel.js', re:/CN\\s*=\\s*'([^']+)'/, frame:null, url:null}
` + html.slice(finApps);

  return html;
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

  console.log('\n╔══ BUILD panel.html ══╗');
  console.log('  fusionando: ' + tabs.join(', ') + '\n');

  let html = fs.readFileSync(FUENTE, 'utf8');
  const cssTodo = [];
  const jsTodo = [];

  tabs.forEach((tab) => {
    const clave = TAB[tab];
    const r = fusionar(clave);

    // 1) el iframe se vuelve un div con la app adentro
    const ifr = IFRAMES[tab];
    html = reemplazar(html, ifr.iframe,
      '<div id="' + r.cont + '" class="subapp ' + (r.clasesBody || '') + '">\n' + r.markup + '\n</div>',
      tab + ': iframe → div');

    // 2) el lazy-load ahora arranca la sub-app en vez de cargar una URL
    html = reemplazar(html, ifr.lazy, ifr.lazyNuevo, tab + ': lazy-load');

    // 3) CSS y JS
    cssTodo.push('/* ═══ ' + clave + ' (de ' + APPS[clave].archivo + ') ═══ */\n' + r.css);
    jsTodo.push(envolver(clave, r));
    console.log('');
  });

  // 3b) el boton ↻ hablaba con iframes que ya no existen
  if (tabs.length === Object.keys(TAB).length) html = arreglarRefresh(html);

  // 4) el CSS de las sub-apps, al final del head
  //    Ojo: "</head>" y "</body>" tambien aparecen adentro de strings del JS
  //    del panel. El que cierra el documento de verdad es SIEMPRE el ultimo.
  html = enElUltimo(html, '</head>',
    '<style id="css-subapps">\n' + cssTodo.join('\n\n') + '\n</style>\n</head>');

  // 5) el motor de sub-apps + el JS de cada una, al final del body
  html = enElUltimo(html, '</body>',
    '<script>\n' + MOTOR + '\n' + jsTodo.join('\n') + '\n</script>\n</body>');

  fs.writeFileSync(SALIDA, html);
  console.log('╚══ panel.html: ' + Math.round(html.length / 1024) + ' KB ══╝\n');
}

/** Cada sub-app queda adentro de una funcion que corre la primera vez que
 *  abris su tab — igual que hoy, que el iframe no carga hasta que entras.
 *  Al final se exportan sus nombres a window porque los onclick del markup
 *  viven en el HTML y solo ven lo global. */
function envolver(clave, r) {
  // Los onclick del HTML solo ven lo global, pero el codigo de la sub-app vive
  // adentro de una funcion. Por eso se publica cada nombre YA RENOMBRADO.
  // (r.renombrados guarda los nombres VIEJOS: el nuevo es pref + viejo.)
  const exports = r.renombrados
    .map((n) => { const N = r.pref + n; return 'try{window[' + JSON.stringify(N) + ']=' + N + ';}catch(e){}'; })
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
  if(typeof f !== 'function'){ console.error('sub-app desconocida:', clave); return; }
  _subappsVivas[clave] = true;
  try{ f(); }
  catch(e){
    _subappsVivas[clave] = false;
    console.error('La sub-app ' + clave + ' no arranco:', e);
    if(typeof toast === 'function') toast('No pude abrir esa seccion — mante apretado el boton de actualizar');
  }
}
/* Una sub-app pedia location.reload() cuando se le vencia la sesion. Ahora
   eso reinicia el ERP entero, asi que pasa por el mismo camino del panel. */
function _recargarApp(){ location.reload(); }
`;

main();
