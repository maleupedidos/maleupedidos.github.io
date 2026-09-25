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
var CN='maleu-panel-v437';

/* LAS LIBRERIAS DE AFUERA (25/9/2026).
 *
 * El ERP las carga de `cdn.jsdelivr.net` y hasta hoy **no entraban a la cache**:
 * una PWA que abre sin red con tres piezas que no. Medido bloqueando la CDN, el
 * grafico de Proveedores quedaba vacio con el titulo prometiendolo, y en consola
 * no habia nada — el try/catch del render se traga el ReferenceError.
 *
 * Lo que se rompe sin ellas: el grafico de Proveedores (chart.js), el PDF
 * semanal (html2canvas + jspdf) y el dibujo de zonas del mapa (leaflet-draw,
 * que se pide recien al abrir el mapa).
 *
 * La version va clavada en la URL, asi que no hay riesgo de quedarse con una
 * vieja; al subir CN se limpian con el resto. Si alguna vez se cambia una
 * version en el HTML, hay que cambiarla ACA TAMBIEN o se sirve la anterior. */
var LIBS=[
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CN).then(function(c){
    // Estos tres SON la app: si falta uno, la instalacion tiene que fallar.
    /* `cache:'reload'` (13/9/2026): sin eso el service worker nuevo podia llenar
       su copia con el app.html que el navegador tenia en su cache HTTP —GitHub
       Pages lo sirve con max-age=600—, o sea con la version VIEJA. La app nueva
       habria abierto la pagina anterior. */
    return c.addAll(['/app.html','/panel-manifest.json','/img/favicon.png'].map(function(u){
      return new Request(u,{cache:'reload'});
    })).then(function(){
      // El indice de ubicaciones va aparte y con catch a proposito: es lo que
      // hace andar el boton "Ubicacion" de Ruta sin senal (Tadeo maneja por
      // adentro del barrio). Pero addAll es atomico: si este 404eara, se caeria
      // la instalacion entera del service worker y la app se quedaria sin PWA.
      // Que falte el indice tiene que degradar el boton, no romper la app.
      return c.add('/data/lotes-ubicacion.json').catch(function(){});
    }).then(function(){
      /* LAS LIBRERIAS, CADA UNA CON SU CATCH.
         No van en el `addAll` de arriba, que es atomico: si jsdelivr estuviera
         caida en el momento exacto de instalar, se caeria la instalacion entera
         y **el ERP se quedaria sin PWA**. Un grafico que falta degrada una
         pantalla; eso dejaria la app sin abrir offline.

         `mode:'cors'` explicito: sin eso el pedido sale no-cors y se guarda una
         respuesta OPACA, con `status 0`, que no se distingue de un 404.
         Verificado que jsdelivr manda `Access-Control-Allow-Origin: *`.

         Se hacen en el install y no al pasar por `fetch` porque en la PRIMERA
         visita los `<script>` salen antes de que el service worker tome
         control: no pasarian por el, y la visita siguiente —que es cuando no
         hay red— no tendria nada guardado. Medido. */
      return Promise.all(LIBS.map(function(u){
        return c.add(new Request(u,{mode:'cors'})).catch(function(){});
      }));
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

  /* `?fresco=` es el pedido con el que la pagina trae el HTML nuevo antes de
     recargarse (13/9/2026): va derecho a la red. Pasarlo por aca devolveria la
     copia vieja y, peor, guardaria 2 MB nuevos en la cache por cada chequeo. */
  if(u.searchParams.has('fresco'))return;

  /* LAS LIBRERIAS DE AFUERA SE GUARDAN (25/9/2026).

     El ERP cachea `app.html` entero para abrir sin red, pero chart.js,
     html2canvas y jspdf venian de `cdn.jsdelivr.net` y **nunca entraban a la
     cache**: pasaban derecho por el `fetch` de mas abajo. O sea una PWA que
     "anda offline" con tres piezas que no.

     Lo que se rompe sin ellas, y no avisa: el grafico de Proveedores, el PDF
     semanal y el dibujo de zonas del mapa. Medido bloqueando la CDN: el canvas
     queda vacio, el titulo sigue prometiendo el grafico, y en consola no hay
     nada porque el try/catch del render se traga el ReferenceError.

     Cache-first y se guarda lo que pase por la red. Las URLs tienen la version
     clavada (`chart.js@4.4.0`), asi que no hay riesgo de quedarse con una
     vieja; y al subir CN se limpian solas con el resto.

     **Se guarda solo si `r.ok`**, y eso necesita que el `<script>` tenga
     `crossorigin="anonymous"` — si no, la respuesta es OPACA, `status` es 0, y
     guardariamos un 404 como si fuera la libreria. */
  if(u.hostname==='cdn.jsdelivr.net'){
    e.respondWith(caches.open(CN).then(function(c){
      return c.match(e.request).then(function(guardado){
        if(guardado)return guardado;
        return fetch(e.request).then(function(r){
          if(r&&r.ok)c.put(e.request,r.clone());
          return r;
        });
        /* Sin catch a proposito: si no hay copia y no hay red, que falle como
           fallaba antes. Tapar el error aca devolveria un 200 vacio y el
           `typeof Chart === 'undefined'` del panel no llegaria a correr. */
      });
    }));
    return;
  }

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
