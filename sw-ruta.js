/* ═══════════════════════════════════════════════════════════
   MALEU RUTA — Service Worker (offline-first)
   ═══════════════════════════════════════════════════════════ */

var CACHE_NAME = 'maleu-ruta-v1';
var PRECACHE = [
  '/ruta.html',
  '/img/favicon.png',
  '/img/logo-icono.png'
];

// Install: pre-cache the shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
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

// Fetch: cache-first for app shell, network-first for API
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API calls (Apps Script) → network only, never cache
  if (url.hostname === 'script.google.com') {
    return; // let browser handle normally
  }

  // Everything else → cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Cache new resources dynamically
        if (response.ok && event.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(function() {
      // Offline and not in cache — return offline page if it's a navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/ruta.html');
      }
    })
  );
});
