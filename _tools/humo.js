#!/usr/bin/env node
/*
 * humo.js — abre el ERP en un Chrome de verdad y mira si arranca.
 *
 *   node _tools/humo.js
 *
 * Por que existe. `node --check` dice si el JS parsea, no si la app arranca.
 * Un `foo.bar` sobre un undefined parsea perfecto y revienta al correr. Ya
 * rompi Ruta y Abastecimiento pasando el chequeo de sintaxis. (19/8/2026)
 *
 * Que prueba: que el ERP cargue sin excepciones y que las TRES sub-apps
 * arranquen — el momento exacto en que se rompian. NO prueba que los datos
 * lleguen: no hay backend, y no hace falta para lo que esto cuida.
 *
 * ── Tres trampas que me costaron encontrar, para que nadie las repita ──
 *
 * 1. Un alert() sin nadie que lo cierre BLOQUEA el hilo de la pagina para
 *    siempre. Desde afuera parece que el ERP se colgo. Mi Portal lo hace al
 *    arrancar sin sesion: "Tu sesion vencio...".
 *
 * 2. Ese alert viene seguido de location.reload(). O sea: la pagina se
 *    RECARGA a mitad del test y borra las sub-apps que ya habian arrancado.
 *    El test daba verde con Ruta y Abastecimiento muertas.
 *
 * 3. `_abrirSubapp` se traga los errores en un try/catch, asi que llamarla
 *    devuelve OK aunque la sub-app haya reventado. Lo unico que dice la
 *    verdad es `_subappsVivas`: hay que mirarlo, no confiar en el retorno.
 *
 * Por eso: sesion falsa inyectada antes de que corra una linea del ERP,
 * dialogos anulados, y CADA SUB-APP EN SU PROPIA CARGA — que es lo unico que
 * esquiva la recarga, porque location.reload no se puede neutralizar (no es
 * configurable en Chrome: el defineProperty falla callado). El test no puede
 * sabotearse a si mismo.
 *
 * Y espera a que el ERP este listo DE VERDAD, no a que el documento cargue:
 * son 2 MB y 28.000 lineas, y midiendo antes de tiempo reportaba botones
 * muertos que estaban perfectos.
 *
 * Cero dependencias: Chrome ya esta instalado y Node 24 trae WebSocket.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
];

// clave del build - como se llama - el div donde el build la mete
const SUBAPPS = [
  ['ruta', 'Ruta', 'pg-ruta'],
  ['abast', 'Abastecimiento', 'pg-abast'],
  ['miportal', 'Mi Portal', 'pg-miportal']
];

// Palabras del lenguaje que caen en el regex de "algo seguido de parentesis"
// y no son funciones que alguien tenga que haber definido.
const RESERVADAS = ['if', 'return', 'typeof', 'new', 'this', 'event', 'var', 'let', 'const',
  'function', 'else', 'for', 'while', 'switch', 'try', 'catch', 'delete', 'void', 'in', 'of'];

/* Arma la expresion que busca botones muertos adentro de un pedazo del DOM.
 *
 * Se recorren los ATRIBUTOS de los elementos que existen de verdad, no el
 * innerHTML como texto: el innerHTML incluye el contenido de los <script>, y
 * ahi los handlers estan a medio armar
 *     onclick="toggleDiaPeds('+detId+')"
 * que no son botones, son codigo fuente. Leyendolo asi daba 5 muertos que no
 * existian. El regex se compila una sola vez, afuera del bucle: armarlo
 * adentro (uno por atributo por elemento) hacia que este paso solo tardara
 * mas que todo el resto junto.
 */
function huerfanosEn(raiz, excluirSel) {
  return `(function(){
    var raiz = ${raiz};
    if (!raiz) return [];
    var excluir = ${excluirSel || 'null'};
    var falta = [], vistos = {};
    var ri = /(^|[^\\w$.])([A-Za-z_$][\\w$]*)\\s*\\(/g;
    var els = raiz.querySelectorAll('*'), n;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.tagName === 'SCRIPT') continue;
      if (excluir && el.closest(excluir)) continue;
      var attrs = el.attributes;
      for (var j = 0; j < attrs.length; j++) {
        var at = attrs[j];
        if (at.name.charCodeAt(0) !== 111 || at.name.charCodeAt(1) !== 110) continue; // "on"
        var cod = at.value;
        if (cod.indexOf('(') < 0) continue;
        ri.lastIndex = 0;
        while ((n = ri.exec(cod))) {
          var id = n[2];
          if (vistos[id]) continue;
          vistos[id] = 1;
          if (typeof window[id] === 'undefined') falta.push(id);
        }
      }
    }
    return falta;
  })()`;
}

// Ruido esperable al abrir el ERP como archivo suelto, sin backend ni service
// worker. Nada de esto es un bug del codigo.
const RUIDO = [
  /Failed to fetch/i, /net::ERR_/i, /NetworkError/i, /Access to fetch/i, /CORS/i,
  /service ?worker/i, /Failed to load resource/i, /manifest/i, /favicon/i,
  // El panel entra a pintar sus tabs con la sesion falsa pero sin datos (`D`
  // nunca llega, no hay backend) y revienta ahi. Es el precio de inyectar la
  // sesion, no un bug. Se filtra SOLO este prefijo: cualquier otro TypeError
  // sigue siendo rojo.
  // (el texto llega sin el prefijo "console.error: ", que se agrega despues)
  /^render -> \w+ TypeError/
];
const esRuido = (t) => RUIDO.some((re) => re.test(t));

/* Lo que se ejecuta ANTES que cualquier linea del ERP, en cada carga. */
const PREPARAR = `
(function(){
  // 1. sesion falsa: sin esto el ERP se va por el camino de "sesion vencida",
  //    que termina en un alert + reload y arruina la medicion.
  try{
    localStorage.setItem('maleu_panel_session', JSON.stringify({
      usuario:'humo', nombre:'Test Humo', rol:'admin',
      tabs:['inicio','pedidos','pedidoshome','caja','pagos','ruta','busqueda','miportal','bbdd','ventas','ajustes']
    }));
    localStorage.setItem('maleu_token','humo-token-de-prueba');
    localStorage.setItem('maleu_red_session', JSON.stringify({vendedor:'humo', nombre:'Test Humo'}));
  }catch(e){}

  // 2. dialogos que no frenen el hilo
  //    (location.reload NO se puede neutralizar: no es configurable en Chrome,
  //     el defineProperty falla callado. Por eso cada sub-app va en su propia
  //     carga en vez de pelear con la recarga.)
  window.__humoDialogos = [];
  window.alert = function(m){ window.__humoDialogos.push('alert: '+m); };
  window.confirm = function(m){ window.__humoDialogos.push('confirm: '+m); return false; };
  window.prompt = function(m){ window.__humoDialogos.push('prompt: '+m); return null; };
})();
`;

function buscarChrome() {
  for (const c of CHROMES) if (fs.existsSync(c)) return c;
  console.error(RED + 'X No encontre Chrome ni Edge. Buscados:\n  ' + CHROMES.join('\n  ') + RST);
  process.exit(1);
}

async function esperarPagina(puerto, intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + puerto + '/json/list');
      const lista = await r.json();
      const pag = lista.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pag) return pag.webSocketDebuggerUrl;
    } catch (err) { /* todavia no levanto */ }
    await new Promise((res) => setTimeout(res, 250));
  }
  throw new Error('Chrome no abrio el puerto de depuracion');
}

/* Cliente CDP minimo. Se conecta DIRECTO al websocket de la pestaña, asi no
   hacen falta Target.attachToTarget ni sessionId. */
function conectar(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pendientes = new Map();
  const oyentes = [];

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendientes.has(msg.id)) {
      const { ok, mal } = pendientes.get(msg.id);
      pendientes.delete(msg.id);
      msg.error ? mal(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method) {
      oyentes.forEach((f) => f(msg.method, msg.params));
    }
  });

  const listo = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('no pude conectar a Chrome')));
  });

  return {
    listo,
    enviar(method, params) {
      return new Promise((ok, mal) => {
        const i = ++id;
        pendientes.set(i, { ok, mal });
        ws.send(JSON.stringify({ id: i, method, params: params || {} }));
      });
    },
    escuchar(f) { oyentes.push(f); },
    cerrar() { try { ws.close(); } catch (err) { /* ya cerrado */ } }
  };
}

async function main() {
  const archivo = path.join(RAIZ, 'app.html');
  if (!fs.existsSync(archivo)) {
    console.error(RED + 'X No existe app.html - corre el build primero.' + RST);
    process.exit(1);
  }

  const chrome = buscarChrome();
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'maleu-humo-'));
  const puerto = 9222 + Math.floor(Math.random() * 500);
  const url = 'file:///' + archivo.replace(/\\/g, '/');

  console.log('\n== HUMO: abrir el ERP en Chrome y ver si arranca ==');
  console.log(DIM + '  ' + path.basename(chrome) + ' - puerto ' + puerto + RST);

  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + puerto, '--user-data-dir=' + perfil, 'about:blank'
  ], { stdio: 'ignore' });

  const problemas = [];
  const ruidoVisto = [];
  let cli;

  const limpiar = () => {
    clearTimeout(RELOJ);
    if (cli) cli.cerrar();
    try { proc.kill(); } catch (err) { /* ya murio */ }
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (err) { /* despues */ }
  };

  // Un test que no termina es peor que un test que falla.
  const RELOJ = setTimeout(() => {
    console.error(RED + '\n  X El test tardo mas de 180s: lo corto.' + RST);
    limpiar();
    process.exit(1);
  }, 180000);

  try {
    const wsUrl = await esperarPagina(puerto);
    cli = conectar(wsUrl);
    await cli.listo;

    cli.escuchar((method, params) => {
      if (method === 'Page.javascriptDialogOpening') {
        // por las dudas: si alguno se escapa del stub de arriba, se cierra igual
        cli.enviar('Page.handleJavaScriptDialog', { accept: true, promptText: '' }).catch(() => {});
      }
      if (method === 'Runtime.exceptionThrown') {
        const d = params.exceptionDetails || {};
        const txt = (d.exception && (d.exception.description || d.exception.value)) || d.text || 'excepcion';
        (esRuido(String(txt)) ? ruidoVisto : problemas).push('EXCEPCION: ' + String(txt).split('\n')[0]);
      }
      if (method === 'Runtime.consoleAPICalled' && (params.type === 'error' || params.type === 'assert')) {
        const txt = (params.args || []).map((a) => a.description || a.value || a.type).join(' ');
        (esRuido(txt) ? ruidoVisto : problemas).push('console.error: ' + txt.slice(0, 220));
      }
    });

    await cli.enviar('Runtime.enable');
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREPARAR });

    /* Carga la pagina y espera el load DE VERDAD. Con un timeout fijo, el
       app.html (2 MB) a veces no habia terminado y el test reportaba que una
       sub-app "no existe" cuando lo que pasaba es que el documento estaba a
       medio cargar. */
    const cargar = async () => {
      const cargado = new Promise((res) => {
        const off = (method) => { if (method === 'Page.loadEventFired') res(true); };
        cli.escuchar(off);
        setTimeout(() => res(false), 20000);
      });
      await cli.enviar('Page.navigate', { url });
      await cargado;

      // Y ahora esperar a que el JS haya corrido DE VERDAD. El load del
      // documento no alcanza: son 2 MB y 28.000 lineas, y con un respiro fijo
      // de 2,5s el test medía una pagina a medio arrancar. Sintomas: "Mi
      // Portal no existe" (intermitente) y 44 botones del panel "muertos" que
      // estaban perfectos — todavia no se habian definido.
      //
      // La señal es que existan las tres sub-apps: se definen al final del
      // ultimo <script>, asi que si estan, todo lo anterior ya corrio.
      const SEÑAL = "typeof window._SUBAPP_ruta==='function'&&typeof window._SUBAPP_abast==='function'&&typeof window._SUBAPP_miportal==='function'";
      for (let i = 0; i < 80; i++) {
        const r = await cli.enviar('Runtime.evaluate', { expression: SEÑAL, returnByValue: true }).catch(() => null);
        if (r && r.result && r.result.value === true) return true;
        await new Promise((res) => setTimeout(res, 300));
      }
      return false;   // no termino de arrancar en 24s
    };

    const evaluar = async (expr, segs) => {
      const pedido = cli.enviar('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
      const reloj = new Promise((res) => setTimeout(() => res('__TIMEOUT__'), (segs || 15) * 1000));
      const r = await Promise.race([pedido, reloj]);
      if (r === '__TIMEOUT__') return { error: 'no contesto en ' + (segs || 15) + 's' };
      if (r && r.exceptionDetails) return { error: r.exceptionDetails.text };
      return { valor: r && r.result ? r.result.value : undefined };
    };

    // ── 1. cargar el ERP ──
    const arranco1 = await cargar();
    if (!arranco1) problemas.push('el ERP no termino de arrancar en 24s (las tres sub-apps nunca aparecieron)');
    const vive = await evaluar('1+1', 20);
    if (vive.error || vive.valor !== 2) {
      problemas.push('la pagina no responde despues de cargar (' + (vive.error || 'valor raro') + ')');
      console.log('  [1/3] cargar: ' + RED + 'la pagina no responde' + RST);
    } else {
      console.log('  [1/3] cargar: ' + GRN + 'OK' + RST +
        (problemas.length ? RED + ' (' + problemas.length + ' problema/s en consola)' + RST : ''));
    }

    // ── 2. arrancar las tres sub-apps, UNA POR CARGA ──
    //
    //    Las tres en la misma carga NO sirve, y da un verde mentiroso: alguna
    //    termina pidiendo location.reload() y la recarga borra las que ya
    //    habian arrancado. `_subappsVivas` quedaba en {miportal:true} — las
    //    otras dos muertas — y el test lo cantaba como OK.
    //
    //    Bloquear la recarga no es opcion: location.reload no es configurable
    //    en Chrome, asi que el Object.defineProperty falla callado adentro del
    //    try/catch y uno se queda creyendo que la freno.
    //
    //    Una carga por sub-app ademas prueba lo que importa de verdad: que
    //    cada una arranque SOLA, sin que otra le haya dejado el terreno listo.
    for (const [clave, nombre, cont] of SUBAPPS) {
      if (!(await cargar())) { problemas.push('antes de probar ' + nombre + ', el ERP no termino de arrancar'); continue; }

      const existe = await evaluar("typeof window['_SUBAPP_" + clave + "']");
      if (existe.error) { problemas.push('no pude preguntar por ' + nombre + ': la pagina ' + existe.error); continue; }
      if (existe.valor !== 'function') { problemas.push('la sub-app ' + nombre + ' no existe (_SUBAPP_' + clave + ')'); continue; }

      // Se arranca y se lee el estado en la MISMA evaluacion: si la pagina se
      // recarga despues, el resultado ya esta afuera.
      const r = await evaluar(`(function(){
        var err = null;
        try { _abrirSubapp('` + clave + `'); } catch(e){ err = e.message; }
        return JSON.stringify({
          viva: window._subappsVivas && window._subappsVivas['` + clave + `'] === true,
          err: err
        });
      })()`, 30);

      let est = {};
      try { est = JSON.parse(r.valor || '{}'); } catch (err) { /* queda vacio */ }
      const ok = est.viva === true;
      if (!ok) {
        problemas.push('la sub-app ' + nombre + ' NO arranco' + (est.err ? ': ' + est.err : '') +
                       (r.error ? ' (' + r.error + ')' : ''));
      }
      // Y con ESTA sub-app viva, sus botones resuelven?
      //
      //    Tiene que medirse aca adentro y no al final, sobre todo el DOM: el
      //    markup de las tres esta SIEMPRE en la pagina (lo inserto el build),
      //    pero `RUT$algo` solo existe en window despues de que _SUBAPP_ruta()
      //    corrio entera. Mirando el DOM completo, una sub-app que todavia no
      //    arranco se reporta como 27 botones muertos que no lo son.
      let huerfanos = '(no se pudo medir)';
      if (ok) {
        const h = await evaluar(huerfanosEn("document.getElementById('" + cont + "')"), 30);
        if (h.error) {
          problemas.push('no pude revisar los botones de ' + nombre + ': ' + h.error);
        } else {
          const lista = (h.valor || []).filter((x) => !RESERVADAS.includes(x));
          huerfanos = lista.length ? RED + lista.length + ' boton/es muerto/s' + RST : GRN + 'botones OK' + RST;
          if (lista.length) {
            problemas.push(nombre + ': ' + lista.length + ' boton(es) llaman a algo que no existe: ' + lista.slice(0, 10).join(', '));
          }
        }
      }
      console.log('  [2/3] ' + nombre.padEnd(16) + (ok ? GRN + 'arranco' + RST : RED + 'NO arranco' + RST) + '   ' + (ok ? huerfanos : ''));
    }

    // ── 3. los botones del PANEL (todo lo que no es sub-app) ──
    if (!(await cargar())) problemas.push('antes de revisar el panel, el ERP no termino de arrancar');
    const hp = await evaluar(huerfanosEn('document', "'#pg-ruta,#pg-abast,#pg-miportal'"), 30);
    if (hp.error) {
      problemas.push('el chequeo de botones del panel ' + hp.error);
      console.log('  [3/3] botones del panel: ' + YEL + hp.error + RST);
    } else {
      const lista = (hp.valor || []).filter((x) => !RESERVADAS.includes(x));
      if (lista.length) {
        problemas.push('el panel tiene ' + lista.length + ' boton(es) que llaman a algo que no existe: ' + lista.slice(0, 12).join(', '));
        console.log('  [3/3] botones del panel: ' + RED + lista.length + ' muerto/s' + RST);
      } else {
        console.log('  [3/3] botones del panel: ' + GRN + 'todos resuelven' + RST);
      }
    }

    // contexto: no son errores, pero explican lo que se ve
    const dlg = await evaluar('JSON.stringify(window.__humoDialogos||[])', 10);
    let listaDlg = [];
    try { listaDlg = JSON.parse(dlg.valor || '[]'); } catch (err) { /* queda vacia */ }
    if (listaDlg.length) {
      console.log(DIM + '  dialogos que el ERP intento abrir:' + RST);
      listaDlg.slice(0, 5).forEach((d) => console.log(DIM + '     ' + d + RST));
    }
  } catch (err) {
    problemas.push('el test no pudo correr: ' + err.message);
  } finally {
    limpiar();
  }

  if (ruidoVisto.length) {
    console.log(DIM + '  (' + ruidoVisto.length + ' mensaje/s de red o service worker ignorados: no hay backend en file://)' + RST);
  }

  if (problemas.length === 0) {
    console.log(GRN + '\n  OK: el ERP arranca y las tres tabs tambien.\n' + RST);
    process.exit(0);
  }
  console.log(RED + '\n  X ' + problemas.length + ' problema/s:' + RST);
  problemas.forEach((p) => console.log(RED + '     - ' + p + RST));
  console.log('');
  process.exit(1);
}

main();
