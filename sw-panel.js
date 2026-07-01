var CN='maleu-panel-v76';
self.addEventListener('install',function(e){e.waitUntil(caches.open(CN).then(function(c){return c.addAll(['/panel.html','/panel-manifest.json','/img/favicon.png']);}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CN;}).map(function(k){return caches.delete(k);}));}));self.clients.claim();});
self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);
  if(u.hostname==='script.google.com')return;
  if(e.request.mode==='navigate'||u.pathname.endsWith('.html')){
    // Siempre traer la versión fresca del server (cache:'reload' saltea la caché HTTP del
    // navegador). La caché del SW queda solo como fallback offline. Así un refresh normal
    // muestra el último deploy sin quedar pegado en una versión vieja.
    e.respondWith(fetch(e.request,{cache:'reload'}).then(function(r){var cl=r.clone();caches.open(CN).then(function(c){c.put(e.request,cl);});return r;}).catch(function(){return caches.match(e.request);}));return;
  }
  e.respondWith(caches.match(e.request).then(function(c){return c||fetch(e.request);}));
});
