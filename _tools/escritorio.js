#!/usr/bin/env node
/*
 * escritorio.js — el ERP mirado en la COMPUTADORA, no solo en el celular.
 *
 *   node _tools/escritorio.js          (o: npm run escritorio)
 *
 * Por que existe. El 3/9/2026 se publico el desglose de una venta verificado a
 * 390px. En el celular se veia bien; en la computadora era ilegible. Causa: las
 * filas usaban `justify-content:space-between` adentro de un ancho de ~1100px,
 * asi que el label quedaba a ~1000px de su numero y la vista no puede
 * emparejarlos. Tadeo: "en la computadora estos datos son IMPOSIBLES de ver...
 * para un señor es inviable".
 *
 * Eso NO lo agarra ninguna otra red: parsea perfecto, no tira un error, y
 * `auditar-tabs.js` mira las tres sub-apps a 390px — no el panel en escritorio.
 *
 * Que mide, y por que estas dos cosas:
 *
 *   1. El HUECO entre un label y su valor. Es la forma medible de "no se puede
 *      leer": arriba de ~250px el ojo tiene que barrer la pantalla para juntar
 *      dos datos que van juntos. Se mide en px reales, en un Chrome de verdad.
 *   2. Que la pagina no desborde a lo ancho en ninguna de las dos anchuras.
 *
 * Los datos son SINTETICOS a proposito: los nombres, telefonos y direcciones de
 * clientes no entran a este repo, que es publico por GitHub Pages. Para el
 * layout lo unico que importa es el largo de los textos, y por eso los casos
 * incluyen el nombre y la direccion mas largos que se dan en la practica.
 *
 * Cero dependencias, igual que humo.js: Chrome ya esta instalado y Node trae
 * WebSocket. Lee `app.html` por file:// — no hace falta levantar el servidor.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const VER = '\x1b[32m', RED = '\x1b[31m', AM = '\x1b[33m', DIM = '\x1b[2m', B = '\x1b[1m', RST = '\x1b[0m';
const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

/* El tope. Una tarjeta de ~340px con un label de ~90px deja un hueco maximo de
   ~250px: mas que eso significa que el par se estiro a lo ancho de la pantalla. */
const TOPE_HUECO = 250;

/* Huecos ya vistos y aceptados. Ponerlos ACA con el motivo escrito, no bajar el
   tope: el dia que aparezca uno nuevo tiene que cortar. */
const ACEPTADAS = [
  // 'clase :: motivo por el que este par puede estar separado'
];

/* Ventas sinteticas. Cubren las ramas de _vtDetalle: propina en efectivo,
   propina en MP, sin costo cargado (Red, con sus dos notas) y cobrado != facturado.
   El nombre y la direccion son los mas largos que se dan en la practica. */
const VENTAS = [
  { cliente: 'Cliente Uno', canal: 'Venta Directa', zona: 'Home', h: 'Home', n: '901',
    fecha: '02/09/2026', fCob: '02/09/2026', mes: '2026-09', sem: 36, ep: 'Cobrado', fp: 'Efectivo',
    $: 50000, ef: 49410, tr: 0, pEf: 590, pTr: 0, costo: 39900, margen: 10100,
    tel: '1100000001', dir: 'Champagnat Alto · Lote 289' },
  { cliente: 'Familia De Nombre Muy Largo Etchenique', canal: 'Venta Directa', zona: 'Pilar', h: 'Pilar', n: '902',
    fecha: '01/09/2026', fCob: '01/09/2026', mes: '2026-09', sem: 36, ep: 'Cobrado', fp: 'Transferencia',
    $: 107100, ef: 0, tr: 105000, pEf: 0, pTr: 2100, costo: 61300, margen: 45800,
    tel: '1100000002', dir: 'Estancias del Río · Townhouses 4' },
  { cliente: 'Cliente Tres', canal: 'Red', zona: 'Ayres del Pilar', h: 'Red', n: '903',
    fecha: '30/08/2026', fCob: '', mes: '2026-08', sem: 35, ep: 'Pendiente', fp: 'Efectivo',
    $: 114540, ef: 0, tr: 0, pEf: 0, pTr: 0, costo: 0, margen: 114540,
    tel: '1100000003', dir: 'Ayres del Pilar' },
  { cliente: 'Cliente Cuatro', canal: 'Venta Directa', zona: 'Home', h: 'Home', n: '904',
    fecha: '23/08/2026', fCob: '23/08/2026', mes: '2026-08', sem: 34, ep: 'Pendiente', fp: 'Mixto',
    $: 38100, ef: 20000, tr: 18070, pEf: -30, pTr: 0, costo: 22860, margen: 15240,
    tel: '-', dir: 'Champagnat Alto · Lote 291' },
];

/* Un volcado chico y sintetico. No es decorativo: el boton "Ver el pedido
   completo" del desglose se dibuja solo si D ya llego, asi que sin esto no se
   mediria. (Para pintar la tab Pedidos no alcanza: rPedidos filtra estas filas.) */
const PEDIDOS = [];
for (let i = 0; i < 12; i++) {
  PEDIDOS.push({
    h: i % 3 === 0 ? 'Pilar' : 'Home', n: String(800 + i), c: 'Cliente ' + (i + 1),
    dee: '2026-09-0' + (1 + (i % 3)), de: 'Martes 0' + (1 + (i % 3)) + '/09',
    es: i % 4 === 0 ? 'Pendiente' : 'Entregado', fp: i % 2 ? 'Transferencia' : 'Efectivo',
    ep: i % 4 === 0 ? 'Pendiente' : 'Cobrado', o: 'Deposito',
    $: 40000 + i * 1500, subt: 40000 + i * 1500, env: 0, desc: 0,
    ef: i % 2 ? 0 : 40000 + i * 1500, tr: i % 2 ? 40000 + i * 1500 : 0,
    co: 22000 + i * 700, mg: 18000 + i * 800,
    br: 'Champagnat Alto', bar: 'Estancias del Pilar', crd: 0, p: [], r: i + 2, tel: '110000000' + (i % 10),
  });
}

const PREPARAR = `
(function(){
  /* Sin esto la pagina se RECARGA a mitad de la medicion y el test se cae con
     "go is not defined". El ERP, al ver un authRequired, borra el token y hace
     alert + location.reload() — que es lo correcto en produccion. Aca no hay
     backend, asi que tarde o temprano pasa, y location.reload no se puede
     neutralizar (no es configurable en Chrome). La palanca es la que ya usa
     _tools/servir.js: con __maleuAuth puesto ANTES del ERP, no instala su
     interceptor de sesion, y sin interceptor no hay alert ni recarga. */
  window.__maleuAuth = true;
  /* Y ninguna llamada sale de verdad: el test no depende de la red ni le pega
     al Apps Script de produccion. */
  var _f = window.fetch;
  var _VENTAS = ${JSON.stringify(VENTAS)};
  window.fetch = function(u, o){
    var s = String((u && u.url) || u || '');
    if (s.indexOf('script.google.com') < 0) return _f.apply(this, arguments);
    /* action=ventas tiene que contestar como el backend de verdad: el front hace
       VD = d.v || [], asi que un {ok:true} pelado le VACIA la lista y despues no
       hay nada que medir. Ya me paso: un stub que contesta de menos hace fallar
       codigo que esta bien. */
    var cuerpo = (s.indexOf('action=ventas') > -1) ? JSON.stringify({ok:true, v:_VENTAS}) : '{"ok":true}';
    return Promise.resolve(new Response(cuerpo, {status:200, headers:{'Content-Type':'application/json'}}));
  };
  try{
    localStorage.setItem('maleu_panel_session', JSON.stringify({
      usuario:'escritorio', nombre:'Test Escritorio', rol:'admin',
      tabs:['inicio','pedidos','pedidoshome','caja','pagos','ruta','busqueda','miportal',
            'bbdd','ventas','ajustes','estancias','proveedores','clientes','planificacion']
    }));
    localStorage.setItem('maleu_token','escritorio-token-de-prueba');
    // La cache del SWR de Ventas: asi VD se llena sin backend y por el mismo
    // camino que usa el ERP de verdad cuando abre de la copia guardada.
    localStorage.setItem('ma3v2', ${JSON.stringify(JSON.stringify(VENTAS))});
  }catch(e){}
  window.alert = function(){};
  window.confirm = function(){ return false; };
  window.prompt = function(){ return null; };
})();
`;

/* ── Lo que corre adentro del navegador ─────────────────────────────────────
   Devuelve, de cada par label/valor que este en la misma linea, el hueco que
   los separa. Solo mira lo que de verdad esta renderizado. */
/* Que cuenta como "par label -> valor" y que no. Las dos exclusiones salieron de
   medir de verdad, no de suponer:
   · si a la derecha hay un BOTON o un link, no es un valor que haya que
     emparejar con nada: es una accion, y su lugar natural es la punta.
   · si el par esta SOLO —el encabezado de una tarjeta, con el titulo a un lado y
     su total al otro— la vista lo resuelve de una. Lo que no se puede leer es una
     LISTA de pares estirados: ahi el ojo tiene que cruzar la pantalla en zigzag,
     una vez por renglon, y eso fue exactamente el bug del 3/9/2026 (9 renglones
     con el label a 1189px de su numero).
   Por eso se exige que haya 2 o mas hermanos con la misma pinta. */
const MEDIR_PARES = `(function(raiz, tope){
  var cand = [], vistos = 0;
  [].forEach.call(document.querySelectorAll(raiz + ' div, ' + raiz + ' li, ' + raiz + ' tr'), function(e){
    var cs = getComputedStyle(e);
    var reparte = cs.display === 'flex' && cs.justifyContent === 'space-between';
    var esGrid  = cs.display === 'grid' && /auto|max-content/.test(cs.gridTemplateColumns);
    if (!reparte && !esGrid) return;
    var hijos = [].filter.call(e.children, function(c){
      var r = c.getBoundingClientRect(); return r.width > 0 && c.textContent.trim(); });
    if (hijos.length !== 2) return;
    var esControl = function(c){
      return /^(BUTTON|A|INPUT|SELECT|LABEL)$/.test(c.tagName) || !!c.querySelector('button,a,input,select'); };
    if (esControl(hijos[1])) return;
    var a = hijos[0].getBoundingClientRect(), b = hijos[1].getBoundingClientRect();
    if (Math.abs(a.top - b.top) > 6) return;      // no comparten linea: no es un par
    vistos++;
    var hueco = Math.round(b.left - a.right);
    if (hueco <= tope) return;
    cand.push({ e: e, clase: String(e.className || '(sin clase)'), hueco: hueco,
      lbl: hijos[0].textContent.trim().slice(0,30), val: hijos[1].textContent.trim().slice(0,20) });
  });
  /* Solo los que forman LISTA: 2 o mas hermanos con la misma clase. */
  var fuera = cand.filter(function(c){
    var p = c.e.parentNode; if (!p) return false;
    var n = 0;
    [].forEach.call(p.children, function(x){ if (String(x.className||'') === c.clase) n++; });
    return n >= 2;
  }).map(function(c){ return { clase:c.clase, hueco:c.hueco, lbl:c.lbl, val:c.val }; });
  return { fuera: fuera, vistos: vistos, sueltos: cand.length - fuera.length };
})`;

const MEDIR_DESGLOSE = `(function(){
  var det = document.querySelector('.vt.abierta .vt-det');
  if (!det) return { error: 'no hay ningun desglose abierto' };
  var blqs = [].map.call(det.querySelectorAll('.vt-blq'), function(b){
    var r = b.getBoundingClientRect();
    return { ancho: Math.round(r.width), top: Math.round(r.top), izq: Math.round(r.left) };
  });
  var filas = [].map.call(det.querySelectorAll('.vt-det-r'), function(f){
    var hijos = [].filter.call(f.children, function(c){ return c.getBoundingClientRect().width > 0; });
    if (hijos.length < 2) return null;
    var a = hijos[0].getBoundingClientRect(), b = hijos[hijos.length-1].getBoundingClientRect();
    return { lbl: hijos[0].textContent.trim(), hueco: Math.round(b.left - a.right),
             px: parseFloat(getComputedStyle(hijos[0]).fontSize) };
  }).filter(Boolean);
  return { blqs: blqs, filas: filas,
    hileras: (function(){ var s={}; blqs.forEach(function(b){ s[b.top]=1; }); return Object.keys(s).length; })(),
    columnas: (function(){ var s={}; blqs.forEach(function(b){ s[b.izq]=1; }); return Object.keys(s).length; })(),
    desborde: document.documentElement.scrollWidth - window.innerWidth };
})()`;

function buscarChrome() {
  for (const c of CHROMES) if (fs.existsSync(c)) return c;
  console.error(RED + 'X No encontre Chrome ni Edge.' + RST);
  process.exit(1);
}
async function esperarPagina(puerto) {
  for (let i = 0; i < 80; i++) {
    try {
      const lista = await (await fetch('http://127.0.0.1:' + puerto + '/json/list')).json();
      const p = lista.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (p) return p.webSocketDebuggerUrl;
    } catch (err) { /* todavia no levanto */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrio el puerto de depuracion');
}
function conectar(url) {
  const ws = new WebSocket(url); let id = 0; const pend = new Map(); const oyentes = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { const { ok, mal } = pend.get(m.id); pend.delete(m.id); m.error ? mal(new Error(m.error.message)) : ok(m.result); }
    else if (m.method) oyentes.forEach((f) => f(m.method, m.params));
  });
  const listo = new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', () => j(new Error('no conecta'))); });
  return { listo, enviar: (me, pa) => new Promise((ok, mal) => { const i = ++id; pend.set(i, { ok, mal }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }),
    escuchar: (f) => oyentes.push(f), cerrar: () => { try { ws.close(); } catch (e) { /* ya cerrado */ } } };
}

let mal = 0;
const chequeo = (ok, txt) => { if (!ok) mal++; console.log('    ' + (ok ? VER + 'OK  ' : RED + 'MAL ') + RST + txt); };

async function main() {
  const archivo = path.join(RAIZ, 'app.html');
  if (!fs.existsSync(archivo)) { console.error(RED + 'X No existe app.html — corre el build primero.' + RST); process.exit(1); }
  const chrome = buscarChrome();
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'maleu-escritorio-'));
  const puerto = 9800 + Math.floor(Math.random() * 300);
  const url = 'file:///' + archivo.replace(/\\/g, '/');

  console.log('\n== ESCRITORIO: el panel en la computadora, no solo en el celular ==');
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + puerto, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });

  const reloj = setTimeout(() => { console.error(RED + '\nX No termino en 3 minutos.' + RST); try { proc.kill(); } catch (e) {} process.exit(1); }, 180000);
  let cli;
  try {
    cli = conectar(await esperarPagina(puerto)); await cli.listo;
    await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREPARAR });

    const ev = async (expr) => {
      const r = await cli.enviar('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        const detalle = (d.exception && (d.exception.description || d.exception.value)) || d.text;
        throw new Error(String(detalle).split('\n')[0] + '  ::  ' + String(expr).slice(0, 90));
      }
      return r.result.value;
    };
    const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

    const anchos = [
      { w: 1440, h: 900, mob: false, nom: 'ESCRITORIO 1440px' },
      { w: 1180, h: 820, mob: false, nom: 'NOTEBOOK 1180px' },
      { w: 390, h: 844, mob: true, nom: 'IPHONE 390px' },
    ];

    for (const c of anchos) {
      await cli.enviar('Emulation.setDeviceMetricsOverride', { width: c.w, height: c.h, deviceScaleFactor: 1, mobile: c.mob });
      await cli.enviar('Page.navigate', { url });
      // Esperar a que el ERP haya arrancado DE VERDAD (las tres sub-apps se
      // definen al final del bundle: si estan, todo lo anterior ya corrio).
      let arranco = false;
      for (let i = 0; i < 80 && !arranco; i++) {
        arranco = !!(await ev("typeof window._SUBAPP_ruta==='function'&&typeof rVentas==='function'").catch(() => false));
        if (!arranco) await pausa(300);
      }
      console.log('\n  ' + B + c.nom + RST);
      chequeo(arranco, 'el ERP arranco');
      if (!arranco) continue;

      // El volcado no llega (no hay backend): se lo ponemos. D es una global de
      // verdad del panel, asi que setearla es lo mismo que si hubiera llegado.
      await ev('D = { pedidos: ' + JSON.stringify(PEDIDOS) + ' };');
      await ev('VD = ' + JSON.stringify(VENTAS) + '; if(typeof buildVFilters==="function")buildVFilters(); rVentas();');
      /* Setear D no pinta nada: las secciones se dibujan por _pintarSeccion, y
         _pintadas marca las que ya estan al dia. Sin esto la tab Pedidos queda
         vacia y barrerla no mide nada (lo agarro el chequeo de "esta pintada"). */
      await ev('go("ventas")'); await pausa(700);

      const n = await ev("document.querySelectorAll('#vList .vt').length");
      chequeo(n === VENTAS.length, 'la tab Ventas pinta las ' + VENTAS.length + ' filas (' + n + ')');

      for (let i = 0; i < VENTAS.length; i++) {
        await ev(`(function(){ vtToggle(document.querySelectorAll('#vList .vt')[${i}]); return 1; })()`);
        await pausa(260);
        const m = await ev(MEDIR_DESGLOSE);
        if (m.error) { chequeo(false, 'venta ' + (i + 1) + ': ' + m.error); continue; }
        const peor = m.filas.reduce((a, f) => Math.max(a, f.hueco), 0);
        const minPx = m.filas.reduce((a, f) => Math.min(a, f.px), 99);
        const ancho = m.blqs.reduce((a, b) => Math.max(a, b.ancho), 0);
        chequeo(peor <= TOPE_HUECO, 'venta ' + (i + 1) + ': el par label→valor más separado son ' + peor + 'px (tope ' + TOPE_HUECO + ')');
        chequeo(minPx >= 12, 'venta ' + (i + 1) + ': el label más chico mide ' + minPx + 'px');
        chequeo(m.desborde <= 0, 'venta ' + (i + 1) + ': no desborda a lo ancho (' + m.desborde + 'px)');
        if (c.mob) chequeo(m.columnas === 1, 'venta ' + (i + 1) + ': en el celular los bloques se apilan');
        else {
          chequeo(ancho <= 380, 'venta ' + (i + 1) + ': la tarjeta más ancha mide ' + ancho + 'px (tope 380)');
          chequeo(m.hileras === 1, 'venta ' + (i + 1) + ': los ' + m.blqs.length + ' bloques van en una sola hilera');
        }
        await ev(`(function(){ vtToggle(document.querySelectorAll('#vList .vt')[${i}]); return 1; })()`);
        await pausa(120);
      }

      /* El barrido: el MISMO patron en todo lo que esta pintado de esa tab, no
         solo en el desglose. Va sobre Ventas, que es la que se puede poblar con
         datos inventados.
         Por que no barre Pedidos: rPedidos filtra las filas sinteticas y la
         pantalla queda vacia (lo agarro el chequeo de "esta pintada"), y poblarla
         de verdad pide el volcado con nombres y telefonos de clientes — que no
         entran a este repo, que es publico. Para eso esta el barrido con datos
         reales que se corre a mano desde el scratchpad. */
      if (!c.mob) {
        await ev('go("ventas")'); await pausa(700);
        const pintado = await ev(`(function(){var e=document.querySelector('#p-ventas');
          return e ? e.querySelectorAll('div,li,tr').length : -1;})()`);
        chequeo(pintado > 20, 'la tab Ventas esta pintada (' + pintado + ' elementos)');
        const r = await ev(MEDIR_PARES + `('#p-ventas', ${TOPE_HUECO})`);
        const fuera = [...new Set((r.fuera || [])
          .filter((x) => !ACEPTADAS.some((a) => a.split(' :: ')[0] === x.clase))
          .map((x) => x.clase + ' · ' + x.hueco + 'px · ' + x.lbl + ' → ' + x.val))];
        /* El verde tiene que decir cuantos pares miro: "0 fuera de tope" sobre 0
           pares examinados no prueba nada. */
        chequeo(r.vistos >= 8, 'examino ' + r.vistos + ' pares label→valor de la tab Ventas');
        chequeo(fuera.length === 0, fuera.length + ' listas de pares más separadas de ' + TOPE_HUECO + 'px' +
          (r.sueltos ? DIM + '  (' + r.sueltos + ' par/es sueltos, no en lista: no cuentan)' + RST : ''));
        fuera.slice(0, 10).forEach((f) => console.log('        ' + AM + f + RST));
      }
    }
  } finally {
    clearTimeout(reloj);
    if (cli) cli.cerrar();
    try { proc.kill(); } catch (e) { /* ya murio */ }
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* despues */ }
  }

  console.log('\n  ' + (mal ? RED + mal + ' MAL — no lo publiques asi' : VER + 'todo verde') + RST + '\n');
  process.exit(mal ? 1 : 0);
}
main().catch((e) => { console.error(RED + '\nX ' + e.message + RST); process.exit(1); });
