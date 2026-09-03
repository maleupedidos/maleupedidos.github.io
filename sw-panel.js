/* Service worker del ERP.
 *
 * ── El cambio del 27/8/2026: la app abre de la copia guardada ───────────────
 *
 * Hasta hoy esto iba SIEMPRE a la red a buscar app.html, y recien cuando lo
 * tenia entero se lo entregaba a la pagina. app.html pesa 2 MB. Medido en el
 * iPhone de Tadeo, con un video cuadro por cuadro: **4,2 segundos de pantalla
 * blanca** cada vez que abria la app.
 *
 * Y lo peor: como el service worker devuelve la respuesta completa de una vez,
 * el navegador no puede ir pintando mientras baja. Ni siquiera alcanzaba a
 * mostrar la pantalla de "Cargando Maleu..." — aparecia 0,2 s antes del final,
 * cuando ya no servia para nada.
 *
 * Ahora: **primero la copia guardada, la red despues**. La app abre al toque y
 * la version nueva se descarga en segundo plano para la proxima vez.
 *
 * Lo que hace que esto sea seguro y no te deje pegado en una version vieja:
 * el ERP chequea solo si hay version nueva —leyendo este mismo archivo, que
 * pesa nada— y avisa. Si estas editando algo, espera a que termines. Ese
 * mecanismo ya existia (_chequearVersiones); antes se disparaba solo al tocar
 * el boton actualizar, ahora tambien al arrancar.
 *
 * Y si alguien igual queda pegado: mantener apretado el ↻ borra todo y
 * recarga de cero (refreshDuro).
 */
var CN='maleu-panel-v218';

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CN).then(function(c){
    // Estos tres SON la app: si falta uno, la instalacion tiene que fallar.
    return c.addAll(['/app.html','/panel-manifest.json','/img/favicon.png']).then(function(){
      // El indice de ubicaciones va aparte y con catch a proposito: es lo que
      // hace andar el boton "Ubicacion" de Ruta sin senal (Tadeo maneja por
      // adentro del barrio). Pero addAll es atomico: si este 404eara, se caeria
      // la instalacion entera del service worker y la app se quedaria sin PWA.
      // Que falte el indice tiene que degradar el boton, no romper la app.
      return c.add('/data/lotes-ubicacion.json').catch(function(){});
    });
  }));
  self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CN;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});

self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);

  // El backend nunca se cachea: los datos tienen que ser los de ahora.
  if(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com')return;

  // Este archivo tampoco: es justo el que el ERP lee para saber si hay version
  // nueva. Servirlo de la copia guardada seria decirle "no cambio nada" para
  // siempre.
  if(u.pathname==='/sw-panel.js')return;

  if(e.request.mode==='navigate'||u.pathname.endsWith('.html')){
    e.respondWith(caches.open(CN).then(function(c){
      return c.match(e.request).then(function(guardado){
        // La red corre igual, pero NO la esperamos si ya tenemos copia:
        // actualiza la copia para la proxima apertura.
        var red=fetch(e.request,{cache:'reload'}).then(function(r){
          if(r&&r.ok)c.put(e.request,r.clone());
          return r;
        }).catch(function(){return null;});

        if(guardado)return guardado;                       // ← instantaneo
        return red.then(function(r){                        // primera vez: hay que esperarla
          return r||c.match('/app.html')||Response.error();
        });
      });
    }));
    return;
  }

  e.respondWith(caches.match(e.request).then(function(c){return c||fetch(e.request);}));
});
