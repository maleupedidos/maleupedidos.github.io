#!/usr/bin/env node
/*
 * verificar.js — mira el ERP TERMINADO y avisa si tiene botones muertos.
 *
 *   node _tools/verificar.js            → verifica el app.html local
 *   node _tools/verificar.js --vivo     → baja el publicado y verifica ESE
 *
 * Por que existe. `node --check` dice si el JS parsea. No dice si un boton
 * llama a una funcion que no existe: eso parsea perfecto y no tira ni un
 * error en consola. El boton simplemente no hace nada.
 *
 * Ya paso: el fusionador le pone prefijo a las globales de cada sub-app
 * (RUT$, ABA$, RED$) y reescribe los onclick del markup. Pero las sub-apps
 * dibujan casi toda su pantalla desde JS:
 *
 *     html += '<button onclick="rutaGo(-1)">Anterior</button>';
 *
 * Para el renombrador eso es un string cualquiera. La funcion pasaba a
 * llamarse RED$rutaGo y el boton seguia invocando rutaGo. Eran 311 botones
 * en 148 funciones, y me entere semanas despues. (25/8/2026)
 *
 * Este script lo mira al reves: en vez de confiar en que el build renombro
 * bien, agarra el archivo terminado, junta TODO lo que un handler puede
 * llamar, y lo cruza con TODO lo que va a existir en window. Si sobra algo,
 * es un boton muerto.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const escope = require('eslint-scope');

const RAIZ = path.resolve(__dirname, '..');
const RED = '\x1b[31m', GRN = '\x1b[32m', DIM = '\x1b[2m', RST = '\x1b[0m';

// Lo que el navegador ya te da: si un handler llama a esto, no es un boton muerto.
const DEL_NAVEGADOR = new Set([
  'alert', 'confirm', 'prompt', 'console', 'window', 'document', 'location', 'history', 'navigator',
  'localStorage', 'sessionStorage', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'requestAnimationFrame', 'requestIdleCallback', 'JSON', 'Math', 'Date', 'Number', 'String', 'Boolean',
  'Array', 'Object', 'Promise', 'Error', 'RegExp', 'Map', 'Set', 'parseInt', 'parseFloat', 'isNaN',
  'encodeURIComponent', 'decodeURIComponent', 'open', 'close', 'print', 'focus', 'blur', 'scrollTo',
  'getComputedStyle', 'matchMedia', 'this', 'event', 'e', 'true', 'false', 'null', 'undefined',
  'return', 'if', 'else', 'typeof', 'new', 'void', 'delete', 'function', 'var', 'let', 'const',
  'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally'
]);

/** Saca el JS inline y el markup de un HTML. */
function despiezar(html) {
  const scripts = [];
  const sinScripts = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (todo, attrs, js) => {
    if (/\bsrc=/i.test(attrs)) return '';
    scripts.push(js);
    return '';
  });
  const sinEstilos = sinScripts.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  return { js: scripts.join('\n;\n'), markup: sinEstilos };
}

/** Todo lo que va a existir en window cuando la pagina corra. */
function loQueExiste(js) {
  const nombres = new Set();

  // 1. lo declarado a nivel global (function foo(){}, var bar = ...)
  let ast;
  try {
    ast = acorn.parse(js, { ecmaVersion: 2022, sourceType: 'script', ranges: true });
  } catch (err) {
    console.error(RED + 'X El JS del archivo no parsea: ' + err.message + RST);
    process.exit(1);
  }
  const g = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' }).scopes[0];
  g.variables.forEach((v) => { if (v.name !== 'arguments' && v.defs.length) nombres.add(v.name); });

  // 2. lo que el build publica a mano:  window["X"] = Y
  let m;
  const reWin = /window\[\s*(["'])([^"']+)\1\s*\]\s*=/g;
  while ((m = reWin.exec(js))) nombres.add(m[2]);
  const rePunto = /\bwindow\.([A-Za-z_$][\w$]*)\s*=/g;
  while ((m = rePunto.exec(js))) nombres.add(m[1]);

  return nombres;
}

/** Todos los handlers inline: los del markup y los que el JS dibuja en strings. */
function losHandlers(js, markup) {
  const estaticos = [], dinamicos = [];

  const juntar = (txt, destino, origen) => {
    let m;
    for (const q of ['"', "'"]) {
      const re = new RegExp('\\s(on[a-z]+)\\s*=\\s*' + q + '([^' + q + ']*)' + q, 'gi');
      while ((m = re.exec(txt))) if (m[2].includes('(')) destino.push({ attr: m[1], code: m[2], origen });
    }
  };
  juntar(markup, estaticos, 'markup');
  juntar(js, dinamicos, 'dibujado por JS');

  return { estaticos, dinamicos };
}

/** De un pedazo de codigo de handler, que nombres LLAMA. */
function loQueLlama(code) {
  const out = new Set();
  // identificador seguido de "(" y no precedido por un punto (no es obj.metodo())
  const re = /(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(code))) {
    const id = m[2];
    if (DEL_NAVEGADOR.has(id)) continue;
    out.add(id);
  }
  return out;
}

function verificar(html, comoSeLlama) {
  const p = despiezar(html);
  const existe = loQueExiste(p.js);
  const { estaticos, dinamicos } = losHandlers(p.js, p.markup);

  console.log('\n== VERIFICAR ' + comoSeLlama + ' ==');
  console.log('  ' + Math.round(html.length / 1024) + ' KB - ' + existe.size + ' nombres en window');
  console.log('  ' + estaticos.length + ' handlers en el markup - ' + dinamicos.length + ' dibujados por JS');

  const muertos = new Map();   // nombre -> [ejemplos]
  const revisar = (lista) => {
    for (const h of lista) {
      // Un handler armado por concatenacion no se puede verificar leyendolo:
      //     onclick="'+(x?'unaFn()':'otraFn()')+'"
      // Se saltea, pero se cuenta aparte para que no parezca que dio limpio.
      if (h.code.includes("'+") || h.code.includes('"+') || h.code.includes('${')) { h.concatenado = true; continue; }
      for (const id of loQueLlama(h.code)) {
        if (existe.has(id)) continue;
        if (!muertos.has(id)) muertos.set(id, []);
        if (muertos.get(id).length < 3) muertos.get(id).push(h.attr + '="' + h.code.slice(0, 70) + '"');
      }
    }
  };
  revisar(estaticos);
  revisar(dinamicos);

  const concatenados = [...estaticos, ...dinamicos].filter((h) => h.concatenado).length;
  if (concatenados) {
    // Estos eran el punto flojo mientras el build renombraba: el nombre no
    // existe como texto hasta que corre, asi que ni el renombrador ni este
    // chequeo lo ven, y dependian de un alias del nombre viejo para no
    // romperse. Desde el 26/08/2026 no hay renombrado: el nombre que arma el
    // string es el mismo que esta en window. Se siguen contando aparte porque
    // este script no puede leerlos, no porque haya algo que los sostenga.
    console.log(DIM + '  ' + concatenados + ' armados por concatenacion: no se pueden leer aca (ya no hace falta: nadie les cambia el nombre)' + RST);
  }

  if (muertos.size === 0) {
    console.log(GRN + '  OK: 0 botones muertos' + RST);
    return true;
  }
  console.log(RED + '\n  X ' + muertos.size + ' nombre(s) que un handler llama y NO existen en window:' + RST);
  for (const [id, ejemplos] of [...muertos].sort()) {
    console.log(RED + '     ' + id + RST);
    ejemplos.forEach((ej) => console.log(DIM + '        ' + ej + RST));
  }
  console.log(RED + '\n  Estos botones no van a tirar error: simplemente no van a hacer nada.' + RST);
  return false;
}

async function bajarElVivo() {
  const url = 'https://app.maleu.com.ar/app.html';
  const id = process.env.CF_ACCESS_CLIENT_ID;
  const secret = process.env.CF_ACCESS_CLIENT_SECRET;
  const headers = {};
  if (id && secret) {
    headers['CF-Access-Client-Id'] = id;
    headers['CF-Access-Client-Secret'] = secret;
  }
  const r = await fetch(url, { headers, redirect: 'follow' });
  const txt = await r.text();
  if (txt.includes('cloudflareaccess.com') || /<title>[^<]*Access/i.test(txt)) {
    console.error(RED + '\nX Cloudflare Access devolvio la pantalla de login, no el ERP.' + RST);
    console.error('  El ERP esta detras de Access: para leerlo desde la terminal hace falta');
    console.error('  un service token. Se crea una sola vez en el dashboard:');
    console.error('    Zero Trust -> Access -> Service Auth -> Create Service Token');
    console.error('  y despues se agrega a la politica de la app de app.maleu.com.ar.');
    console.error('  Con eso, aca:');
    console.error(DIM + '    export CF_ACCESS_CLIENT_ID=...   export CF_ACCESS_CLIENT_SECRET=...' + RST);
    process.exit(2);
  }
  return txt;
}

async function main() {
  const vivo = process.argv.includes('--vivo');
  let html, comoSeLlama;
  if (vivo) {
    html = await bajarElVivo();
    comoSeLlama = 'app.maleu.com.ar/app.html (PUBLICADO)';
  } else {
    const f = path.join(RAIZ, 'app.html');
    if (!fs.existsSync(f)) { console.error(RED + 'X No existe app.html - corre el build primero.' + RST); process.exit(1); }
    html = fs.readFileSync(f, 'utf8');
    comoSeLlama = 'app.html (local)';
  }
  const ok = verificar(html, comoSeLlama);
  console.log('');
  process.exit(ok ? 0 : 1);
}

main();
