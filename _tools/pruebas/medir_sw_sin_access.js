/* ¿UN CELULAR SIN COOKIE DE ACCESS PUEDE ACTUALIZAR EL ERP? (1/10/2026)
 *
 *   node _tools/pruebas/medir_sw_sin_access.js
 *
 * Desde el 29/9/2026 Access protege /app.html, /red.html, /ruta.html… y deja
 * afuera a Marcos, Fini, Rufino, Santos y Agustin. Sus PWAs ya instaladas abren
 * de la copia guardada. La pregunta es si les LLEGA una version nueva.
 *
 * El chequeo de version pide /sw-panel.js (publico). Si cambio, el SW nuevo se
 * instala y en el `install` hace addAll('/app.html', …). Esta prueba hace eso
 * mismo en un Chrome sin cookie, contra PRODUCCION, desde una pagina publica del
 * mismo origen (/img/favicon.png), y mira en que estado termina el SW y que
 * quedo en la cache. No escribe nada en ningun backend.
 *
 * Ojo: Chrome no es WebKit. Los iPhone pueden diferir en detalles, no en que un
 * 302 a otro dominio sin CORS rompe un fetch en modo cors.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Network.enable');
    await cli.enviar('Network.clearBrowserCookies');
    await cli.enviar('Page.navigate', { url: 'https://app.maleu.com.ar/img/favicon.png' });
    await pausa(3000);
    console.log('pagina:', await evaluar(cli, 'location.href'));
    console.log('cookies:', await evaluar(cli, 'document.cookie'));
    await evaluar(cli, `(function(){
      window.__sw={estados:[],err:null};
      navigator.serviceWorker.register('/sw-panel.js').then(function(reg){
        var w=reg.installing||reg.waiting||reg.active;
        if(!w){window.__sw.estados.push('sin worker');return;}
        window.__sw.estados.push(w.state);
        w.addEventListener('statechange',function(){window.__sw.estados.push(w.state);});
      }).catch(function(e){window.__sw.err=String(e);});
      return true;})()`);
    for (let i = 0; i < 40; i++) {
      await pausa(500);
      const e = await evaluar(cli, 'JSON.stringify(window.__sw)');
      if (/activated|redundant/.test(e) || /"err":"/.test(e)) break;
    }
    console.log('estados del SW:', await evaluar(cli, 'JSON.stringify(window.__sw)'));
    const cache = await evaluar(cli, `caches.keys().then(function(ks){return Promise.all(ks.map(function(k){
      return caches.open(k).then(function(c){return c.keys().then(function(rs){
        return Promise.all(rs.map(function(r){return c.match(r).then(function(x){
          return x.text().then(function(t){return {url:r.url.replace(location.origin,''),status:x.status,
            redirected:x.redirected,bytes:t.length,esLogin:/cloudflareaccess|Sign in|cf-access/i.test(t)};});});}));
      }).then(function(l){return {cache:k,items:l};});});}));}).then(JSON.stringify)`, true);
    console.log('cache:', cache);
  } catch (e) { console.log('revento:', e && e.message); }
  try { cli.matar(); } catch (e) {}
  process.exit(0);
})();
