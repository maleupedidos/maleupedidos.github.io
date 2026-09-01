/**
 * probar-semana.js — prueba _entregaEsDeSemanaVieja DENTRO del ERP compilado.
 *
 * Por que existe: marcar entregado un pedido de una semana anterior descontaba
 * stock que el conteo semanal ya habia absorbido (1/9/2026: sobraban 11 unidades
 * en el freezer al dia siguiente de regularizar 7 pedidos de Fini). El ERP ahora
 * avisa ANTES de apretar, y esa cuenta tiene que coincidir con la del backend.
 *
 * `node --check` no alcanza: la funcion tiene que existir en window DESPUES de
 * pasar por el fusionador y contestar bien. Se congela el reloj al 1/9/2026 para
 * que la prueba no cambie de resultado segun el dia que se corra.
 *
 * Cero dependencias, mismo enfoque que humo.js: CDP directo contra Chrome.
 *
 *   node _tools/probar-semana.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const RED = '\x1b[31m', VER = '\x1b[32m', DIM = '\x1b[2m', RST = '\x1b[0m';

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

/* [fecha de entrega, semana que debe reportar como vieja, o null si es de ahora].
   Las cinco primeras son las semanas reales de los pedidos de Fini que causaron
   el descuadre. */
const CASOS = [
  ['26/07/2026', 30],
  ['09/08/2026', 32],
  ['16/08/2026', 33],
  ['23/08/2026', 34],
  ['30/08/2026', 35],
  ['31/08/2026', null],   // lunes de esta semana
  ['01/09/2026', null],   // hoy
  ['04/09/2026', null],   // el viernes que viene, misma semana
  ['07/09/2026', 37],     // ya es otra semana
  ['02/09/2025', 36],     // misma semana ISO, OTRO anio
  ['', null],             // sin dia de entrega cargado
  ['no es una fecha', null],
];

function buscarChrome() {
  for (const c of CHROMES) if (fs.existsSync(c)) return c;
  console.error(RED + 'X No encontre Chrome ni Edge.' + RST);
  process.exit(1);
}

async function esperarPagina(puerto, intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + puerto + '/json/list');
      const pag = (await r.json()).find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pag) return pag.webSocketDebuggerUrl;
    } catch (err) { /* todavia no levanto */ }
    await new Promise((res) => setTimeout(res, 250));
  }
  throw new Error('Chrome no abrio el puerto de depuracion');
}

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
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'maleu-semana-'));
  const puerto = 9222 + Math.floor(Math.random() * 500);

  console.log('\n== SEMANA: el ERP avisa antes de descontar stock de mas ==');
  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + puerto, '--user-data-dir=' + perfil, 'about:blank'
  ], { stdio: 'ignore' });

  let cli;
  const limpiar = () => {
    if (cli) cli.cerrar();
    try { proc.kill(); } catch (err) { /* ya murio */ }
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (err) { /* ocupado */ }
  };
  const RELOJ = setTimeout(() => {
    console.error(RED + 'X tardo demasiado' + RST); limpiar(); process.exit(1);
  }, 90000);

  try {
    cli = conectar(await esperarPagina(puerto));
    await cli.listo;
    const errores = [];
    await cli.enviar('Runtime.enable');
    await cli.enviar('Page.enable');


    await cli.enviar('Page.navigate', { url: 'file:///' + archivo.replace(/\\/g, '/') + '?prueba=1' });

    // esperar a que exista la funcion
    let listo = false;
    for (let i = 0; i < 120 && !listo; i++) {
      const r = await cli.enviar('Runtime.evaluate', {
        expression: "typeof window._entregaEsDeSemanaVieja === 'function'",
        returnByValue: true,
      });
      listo = r.result && r.result.value === true;
      if (!listo) await new Promise((res) => setTimeout(res, 250));
    }
    if (!listo) throw new Error('_entregaEsDeSemanaVieja nunca aparecio en window');

    const expr = `(function(){
      var RealDate = Date;
      var HOY = new RealDate(2026, 8, 1).getTime();     // martes 1/9/2026
      function Fake(a,b,c){
        if (arguments.length === 0) return new RealDate(HOY);
        if (arguments.length === 1) return new RealDate(a);
        return new RealDate(a,b,c);
      }
      Fake.now = function(){ return HOY; };
      Fake.UTC = RealDate.UTC;
      Fake.parse = RealDate.parse;
      Fake.prototype = RealDate.prototype;
      Date = Fake;
      var casos = ${JSON.stringify(CASOS)};
      var out = [];
      for (var i = 0; i < casos.length; i++) {
        var got;
        try { got = window._entregaEsDeSemanaVieja(casos[i][0]); }
        catch (e) { got = 'ERROR: ' + e.message; }
        out.push({ txt: casos[i][0], esperado: casos[i][1], got: got });
      }
      Date = RealDate;
      return JSON.stringify(out);
    })()`;

    const r = await cli.enviar('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    const res = JSON.parse(r.result.value);

    let mal = 0;
    console.log(DIM + '  reloj congelado en martes 1/9/2026 (semana ISO 36)' + RST + '\n');
    console.log('  dia de entrega        que dice el ERP        esperado');
    console.log('  ' + '-'.repeat(58));
    for (const c of res) {
      const ok = c.got === c.esperado;
      if (!ok) mal++;
      const dice = c.got === null ? 'es de esta semana' : 'VIEJA, semana ' + c.got;
      const esp = c.esperado === null ? 'esta semana' : 'semana ' + c.esperado;
      console.log('  ' + (c.txt || '(sin fecha)').padEnd(21) +
        dice.padEnd(23) + esp.padEnd(14) +
        (ok ? VER + 'ok' + RST : RED + '<-- FALLA' + RST));
    }

    // el toast largo tiene que aceptar duracion sin romper
    const t = await cli.enviar('Runtime.evaluate', {
      expression: "(function(){try{toast('aviso largo de prueba',6000);return 'ok';}catch(e){return String(e);}})()",
      returnByValue: true,
    });
    const toastOK = t.result.value === 'ok';
    console.log('\n  toast con duracion:  ' + (toastOK ? VER + 'ok' + RST : RED + t.result.value + RST));

    clearTimeout(RELOJ);
    limpiar();
    const fallo = mal > 0 || !toastOK || errores.length > 0;
    console.log('\n  ' + (fallo
      ? RED + 'HAY PROBLEMAS' + RST
      : VER + 'los ' + res.length + ' casos dan bien' + RST) + '\n');
    process.exit(fallo ? 1 : 0);
  } catch (e) {
    clearTimeout(RELOJ);
    console.error(RED + 'X ' + e.message + RST);
    limpiar();
    process.exit(1);
  }
}

main();
