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

/* ── MODO PRUEBA: /app.html?prueba=1 ─────────────────────────────────────────
 *
 * Deja mirar las pantallas del ERP sin usuario, sin PIN y sin backend valido.
 * Existe para poder revisar el ERP ANTES de pedirle a nadie que lo pruebe.
 *
 * Sin esto la revision visual es imposible: el ERP arranca, le pega al backend
 * con un token que no vale, el backend contesta "no autorizado", y el ERP hace
 * lo correcto — te avisa con un alert y recarga para que entres de nuevo. Un
 * alert sin cerrar BLOQUEA el hilo de la pagina, y la recarga borra todo lo que
 * habias abierto. La revision se corta siempre en el mismo lugar.
 *
 * La clave es `window.__maleuAuth`. El ERP instala su interceptor de sesion asi:
 *
 *     (function(){ if (window.__maleuAuth) return; window.__maleuAuth = true; ... })
 *
 * O sea que si la bandera YA esta puesta, el interceptor no se instala. Se
 * aprovecha ese mismo mecanismo en vez de parchar nada: sin interceptor no hay
 * alert ni recarga, y las pantallas se dejan mirar. Los datos no llegan igual
 * —no hay backend— pero el layout, el CSS y el scroll son los de verdad, que es
 * lo que se viene a revisar.
 *
 * NO cambia el app.html: se inyecta al servirlo, y solo con ?prueba=1.
 */
const PREPARAR_PRUEBA = `<script>
(function(){
  window.__maleuAuth = true;              /* el ERP no instala su interceptor */
  window.alert = function(m){ (window.__avisos = window.__avisos || []).push(String(m)); };
  window.confirm = function(){ return false; };
  try{
    localStorage.setItem('maleu_panel_session', JSON.stringify({
      usuario:'prueba', nombre:'Modo Prueba', rol:'admin',
      /* Van TODAS las tabs de Maleu a proposito: una que falte no se puede
         revisar en localhost — el ERP la marca role-hidden y queda en display:none,
         asi que la pantalla sale en blanco y parece un bug del ERP. Paso con
         'estancias' el 2/9/2026. */
      tabs:['inicio','ventas','planificacion','pedidos','pedidoshome','mireparto','caja','egresos',
            'stock','metricas','resumen','pagos','ruta','busqueda','miportal','bbdd','estancias',
            'proveedores','ajustes'],
      token:'modo-prueba', exp: Date.now()+86400000
    }));
    localStorage.setItem('maleu_token','modo-prueba');
  }catch(e){}
  /* Quien engancha eventos de scroll, y si puede cancelarlos.
     Un listener de wheel/touchmove con {passive:false} PUEDE llamar
     preventDefault() y trabar el scroll. Con passive:true el navegador ni lo
     escucha para eso. Como se instalan adentro del ERP y en varias fuentes
     distintas, la unica forma de saber cuales hay es anotarlos al vuelo.
     Se lee desde afuera con window.__scrollHooks. */
  window.__scrollHooks = [];
  var _add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(tipo, fn, opts){
    if(/^(wheel|mousewheel|touchmove|touchstart|scroll)$/.test(tipo)){
      var pasivo = (opts && typeof opts === 'object') ? opts.passive : undefined;
      var quien = (this === document) ? 'document'
                : (this === window)   ? 'window'
                : (this.id ? '#'+this.id : (this.tagName||'?'));
      var pila = '';
      try { pila = (new Error()).stack.split('\\n').slice(2,4).join(' | ').slice(0,160); } catch(e){}
      window.__scrollHooks.push({ tipo: tipo, pasivo: pasivo, donde: quien, pila: pila });
    }
    return _add.apply(this, arguments);
  };

  console.log('[servir.js] MODO PRUEBA: sin backend, sin alerts. Los datos no llegan; el layout si.');
})();
</script>`;

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
  const partes = req.url.split('?');
  let ruta = decodeURIComponent(partes[0]);
  const prueba = /(^|&)prueba=1(&|$)/.test(partes[1] || '');
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
    // El script de prueba va lo mas arriba posible: tiene que correr ANTES que
    // cualquier linea del ERP, o el interceptor de sesion ya se instalo.
    if (prueba && path.extname(destino).toLowerCase() === '.html') {
      const html = buf.toString('utf8');
      const i = html.search(/<head[^>]*>/i);
      buf = Buffer.from(
        i >= 0 ? html.slice(0, html.indexOf('>', i) + 1) + '\n' + PREPARAR_PRUEBA + html.slice(html.indexOf('>', i) + 1)
               : PREPARAR_PRUEBA + html,
        'utf8');
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
