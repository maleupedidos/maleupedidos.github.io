#!/usr/bin/env node
/*
 * servir.js — el ERP en localhost, para verlo y tocarlo mientras se edita.
 *
 *   npm run dev              → http://localhost:8080/app.html
 *   node _tools/servir.js 3000
 *
 * ── Por que existe (26/08/2026) ─────────────────────────────────────────────
 *
 * Hasta hoy la unica forma de mirar el ERP era publicarlo. O sea: push a
 * GitHub Pages —que ES la publicacion, con vendedores y repartidores adentro—,
 * esperar un minuto de propagacion, y despues pasar el login de Cloudflare
 * Access. Tres cosas que no tienen nada que ver con "quiero ver si esto anda".
 *
 * Aca no hay nada de eso: el archivo que se sirve es el mismo que se publica,
 * sin Access, sin espera y sin riesgo. Y como corre en localhost, Claude lo
 * puede abrir en un navegador, tocar botones y leer la consola sin depender de
 * que Tadeo verifique a mano.
 *
 * ── Dos decisiones que importan ─────────────────────────────────────────────
 *
 * 1. NADA se cachea. `Cache-Control: no-store` en todo. Si no, editas, refrescas
 *    y ves lo de antes — que es exactamente el problema que ya nos costo tres
 *    dias con el loader del ↻ en produccion.
 *
 * 2. El service worker se DESACTIVA. `/sw-panel.js` no sirve el real: sirve uno
 *    que se desregistra solo y borra los caches. En produccion el SW es lo que
 *    hace que la PWA ande offline; en desarrollo es lo que te muestra la version
 *    de ayer y te hace perder la tarde. Para probar el SW de verdad: --con-sw.
 *
 * Cero dependencias: Node alcanza.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const GRN = '\x1b[32m', YEL = '\x1b[33m', DIM = '\x1b[2m', RED = '\x1b[31m', RST = '\x1b[0m';

const args = process.argv.slice(2);
const CON_SW = args.includes('--con-sw');
const PUERTO = Number(args.find((a) => /^\d+$/.test(a))) || 8080;

// Las cuatro fuentes: si cambia alguna, hay que rearmar app.html.
const FUENTES = ['_src/panel.src.html', 'ruta.html', 'red.html', 'busqueda.html']
  .map((f) => path.join(RAIZ, f));

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

// Un service worker que se suicida. Se sirve en lugar del real.
const SW_SUICIDA = `/* servir.js: SW desactivado en desarrollo.
   El real cachea por CACHE_NAME y en local eso solo sirve para mostrarte la
   version de antes. Este se desregistra y limpia todo. (--con-sw para el real) */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll()) c.navigate(c.url);
  })());
});
`;

function armar(motivo) {
  const t0 = Date.now();
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { cwd: RAIZ, stdio: 'pipe' });
    console.log(GRN + '  ✓ ' + RST + motivo + DIM + '  (' + (Date.now() - t0) + ' ms)' + RST);
    return true;
  } catch (e) {
    const salida = (e.stdout || '') + (e.stderr || '');
    console.log(RED + '  ✗ el build corto — se sigue sirviendo el app.html anterior' + RST);
    console.log(DIM + String(salida).split('\n').filter(Boolean).slice(-6).map((l) => '    ' + l).join('\n') + RST);
    return false;
  }
}

// ── Rearmar cuando cambia una fuente ────────────────────────────────────────
// fs.watch dispara varias veces por un solo guardado (el editor escribe, renombra,
// toca mtime), asi que se espera a que se quede quieto 150 ms.
let pendiente = null;
FUENTES.forEach((f) => {
  if (!fs.existsSync(f)) return;
  fs.watch(f, () => {
    clearTimeout(pendiente);
    pendiente = setTimeout(() => armar('rearmado por ' + path.basename(f)), 150);
  });
});

const servidor = http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split('?')[0]);
  if (ruta === '/') ruta = '/app.html';

  if (ruta === '/sw-panel.js' && !CON_SW) {
    res.writeHead(200, { 'Content-Type': TIPOS['.js'], 'Cache-Control': 'no-store' });
    return res.end(SW_SUICIDA);
  }

  // No salirse del repo (un ../../ en la URL no puede leer C:\)
  const destino = path.join(RAIZ, path.normalize(ruta).replace(/^([/\\])+/, ''));
  if (!destino.startsWith(RAIZ)) { res.writeHead(403); return res.end('no'); }

  fs.readFile(destino, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': TIPOS['.html'], 'Cache-Control': 'no-store' });
      return res.end('<h1>404</h1><p>No existe <code>' + ruta + '</code> en el repo.</p>');
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    });
    res.end(buf);
  });
});

console.log('\n╔══ ERP en localhost ══╗');
armar('app.html armado');
servidor.listen(PUERTO, () => {
  console.log('\n  ' + GRN + 'http://localhost:' + PUERTO + '/app.html' + RST + '   ← el ERP');
  console.log('  ' + DIM + 'http://localhost:' + PUERTO + '/         (lo mismo)' + RST);
  console.log('\n  ' + DIM + 'Se rearma solo al guardar cualquiera de las cuatro fuentes.' + RST);
  console.log('  ' + (CON_SW ? YEL + 'Service worker REAL (--con-sw): puede servirte cache vieja.'
                             : DIM + 'Service worker desactivado. Para probarlo: --con-sw') + RST);
  console.log('  ' + DIM + 'Sin Cloudflare Access y sin esperar a GitHub Pages.' + RST + '\n');
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(RED + '\n  El puerto ' + PUERTO + ' ya esta ocupado.' + RST);
    console.error('  Probablemente ya haya un servidor andando: abri http://localhost:' + PUERTO + '/app.html');
    console.error('  O usa otro:  node _tools/servir.js 8081\n');
    process.exit(1);
  }
  throw e;
});
