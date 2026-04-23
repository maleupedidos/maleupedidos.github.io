/* ═══════════════════════════════════════════════════════════
   MALEU RUTA — Service Worker (network-first para HTML)
   ═══════════════════════════════════════════════════════════ */

var CACHE_NAME = 'maleu-ruta-v26';
var PRECACHE = [
  '/ruta.html',
  '/img/favicon.png',
  '/img/logo-icono.png'
];

// Install: pre-cache the shell + activar inmediatamente
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: limpiar caches viejos + tomar control ya
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch strategy:
// - API (Apps Script) → network only
// - HTML (ruta.html) → network-first (siempre la última versión, cache si no hay señal)
// - Assets (imgs) → cache-first (no cambian)
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API calls → network only
  if (url.hostname === 'script.google.com') {
    return;
  }

  // HTML pages → network-first
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request) || caches.match('/ruta.html');
      })
    );
    return;
  }

  // Assets → cache-first
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response.ok && event.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(function() {
      if (event.request.mode === 'navigate') {
        return caches.match('/ruta.html');
      }
    })
  );
});
