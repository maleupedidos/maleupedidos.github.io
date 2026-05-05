var CN='maleu-panel-v13';
self.addEventListener('install',function(e){e.waitUntil(caches.open(CN).then(function(c){return c.addAll(['/panel.html','/img/favicon.png']);}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CN;}).map(function(k){return caches.delete(k);}));}));self.clients.claim();});
self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);
  if(u.hostname==='script.google.com')return;
  if(e.request.mode==='navigate'||u.pathname.endsWith('.html')){
    e.respondWith(fetch(e.request).then(function(r){var cl=r.clone();caches.open(CN).then(function(c){c.put(e.request,cl);});return r;}).catch(function(){return caches.match(e.request);}));return;
  }
  e.respondWith(caches.match(e.request).then(function(c){return c||fetch(e.request);}));
});
