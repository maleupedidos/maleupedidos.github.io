/* La pagina se entera sola de que hay version nueva (13/9/2026).

   node probar_version_nueva.js [390|1440]
   APP=app_viejo_tmp.html node probar_version_nueva.js   ← la direccion contraria

   Tadeo, domingo 13:43: su compu mostraba SEM 38, el puntito naranja y la hora
   pelada del ↻ — tres cosas arregladas esa madrugada (v321-v323). La pestaña
   seguia en una version vieja y no habia forma de que se enterara: el aviso se
   enganchaba a un evento del service worker que salia antes de que alguien lo
   escuchara, y el chequeo del ↻ comparaba contra lo publicado al abrir.

   Sin token y sin backend (`?prueba=1`). Se simula la publicacion interceptando
   `sw-panel.js` (la version publicada) y `app.html` (el HTML que se descarga),
   con el dominio Fetch de CDP: la respuesta del servidor de desarrollo se
   modifica en vuelo, asi no se pierde lo que el servidor inyecta con prueba=1.

   Sostiene:
   · con la misma version no hace nada;
   · con GitHub todavia sin el HTML nuevo, NO recarga (no hay bucle): reintenta;
   · con un carrito del AUTOPEDIDO a medio cargar NO recarga, y avisa;
   · la funcion del carrito es la de verdad (se carga un producto y se pregunta);
   · al vaciarse el carrito se actualiza sola: UNA recarga, y la pagina queda en
     la version nueva, con el HTML nuevo guardado en la cache;
   · ya en la nueva, no vuelve a recargar;
   · si recargar no trae la version (la copia vieja sigue), para a las 2 recargas
     y avisa que se puede recargar de cero. */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const html0 = fs.readFileSync(path.join(__dirname, '..', '..', APP), 'utf8');
const mPag = html0.match(/_APP_CN_PAGINA='([^']+)'/);
const CN_PAG = mPag ? mPag[1] : null;

(async () => {
  console.log('\n== VERSION NUEVA — ' + ANCHO + 'px · ' + APP + ' ==\n');
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });

  /* Lo que "esta publicado" en cada momento de la prueba. */
  const pub = { sw: CN_PAG || 'maleu-panel-v1', fresco: null, nav: null };
  let navs = 0;
  cli.escuchar((m, p) => { if (m === 'Page.frameNavigated' && !p.frame.parentId) navs++; });

  await cli.enviar('Fetch.enable', { patterns: [
    { urlPattern: '*sw-panel.js*', requestStage: 'Request' },
    { urlPattern: '*app.html*', requestStage: 'Response' },
  ] });
  cli.escuchar(async (m, p) => {
    if (m !== 'Fetch.requestPaused') return;
    try {
      const u = p.request.url;
      if (/sw-panel\.js/.test(u)) {
        const body = Buffer.from("var CN='" + pub.sw + "';\n").toString('base64');
        await cli.enviar('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body });
        return;
      }
      const cn = /[?&]fresco=/.test(u) ? pub.fresco : pub.nav;
      if (!cn || !CN_PAG) { await cli.enviar('Fetch.continueRequest', { requestId: p.requestId }); return; }
      const r = await cli.enviar('Fetch.getResponseBody', { requestId: p.requestId });
      let txt = r.base64Encoded ? Buffer.from(r.body, 'base64').toString('utf8') : r.body;
      txt = txt.split("_APP_CN_PAGINA='" + CN_PAG + "'").join("_APP_CN_PAGINA='" + cn + "'");
      await cli.enviar('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }, { name: 'Cache-Control', value: 'no-store' }],
        body: Buffer.from(txt, 'utf8').toString('base64') });
    } catch (e) { try { await cli.enviar('Fetch.continueRequest', { requestId: p.requestId }); } catch (e2) {} }
  });

  /* Los avisos se escuchan desde que carga CADA pagina: el del tope sale en el
     chequeo automatico de los 4 s, antes de que la prueba pueda engancharse. */
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source:
    "window.__toasts=[];document.addEventListener('DOMContentLoaded',function(){var t=document.getElementById('toast');if(!t)return;" +
    "new MutationObserver(function(){window.__toasts.push(t.textContent)}).observe(t,{childList:true,characterData:true,subtree:true});});" });
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
  const arranco = await esperar(cli, `typeof go==='function' && typeof _chequearVersiones==='function' && typeof _aplicarVersionNueva==='function'`, 60000);
  const pagCN = `(typeof _APP_CN_PAGINA==='undefined'?null:_APP_CN_PAGINA)`;
  chk('el ERP arranca', arranco);
  if (!arranco) { cli.matar(); process.exit(1); }
  chk('la pagina trae su version escrita por el build', !!CN_PAG && await evaluar(cli, pagCN) === CN_PAG,
    { html: CN_PAG, pagina: await evaluar(cli, `typeof _APP_CN_PAGINA==='undefined'?null:_APP_CN_PAGINA`) });
  const chequear = `_chequearVersiones().then(function(c){ _aplicarVersionNueva(c); return c.length; })`;

  // 1) misma version
  await pausa(4500);   // que pase el chequeo automatico de los 4 s
  let n0 = navs;
  chk('con la misma version publicada no ve nada nuevo', await evaluar(cli, chequear) === 0);
  await pausa(2500);
  chk('y no recarga', navs === n0, { navs: navs - n0 });

  // 2) GitHub todavia sin el HTML nuevo
  pub.sw = 'maleu-panel-v999'; pub.fresco = null;   // fresco = el HTML de siempre (viejo)
  n0 = navs;
  chk('con una version publicada distinta la detecta', await evaluar(cli, chequear) === 1);
  await pausa(5000);
  chk('pero si el HTML descargado todavia es el viejo, NO recarga (no hay bucle)', navs === n0, { navs: navs - n0 });
  chk('y queda libre para reintentar', await evaluar(cli, `typeof _verAplicando!=='undefined' && _verAplicando===false`));

  // 3) el carrito de verdad
  pub.fresco = 'maleu-panel-v999'; pub.nav = 'maleu-panel-v999';
  await evaluar(cli, `go('ruta')`);
  await esperar(cli, `typeof switchTab==='function'`, 20000);
  await evaluar(cli, `(function(){ var b=document.querySelector('#p-ruta .tab[data-tab="nuevo"]'); if(b)b.click(); return 1; })()`);
  await esperar(cli, `!!document.querySelector('#npProductos [onclick^="npQty"]')`, 15000);
  const cargo = await evaluar(cli, `(function(){ var b=[].slice.call(document.querySelectorAll('#npProductos [onclick^="npQty"]')).find(function(x){return /,\\s*1\\)/.test(x.getAttribute('onclick'));}); if(!b)return false; b.click(); return typeof npHayCarrito==='function' && npHayCarrito(); })()`);
  chk('cargar un producto en el AUTOPEDIDO cuenta como carrito a medio cargar', cargo === true, cargo);
  chk('y el panel lo toma como "estas en el medio de algo"', await evaluar(cli, `typeof _hayEditorAbierto==='function' && _hayEditorAbierto()===true`));
  n0 = navs;
  await evaluar(cli, chequear);
  await pausa(4000);
  chk('con el carrito cargado NO recarga', navs === n0, { navs: navs - n0 });
  const avisos1 = await evaluar(cli, `(window.__toasts||[]).join('|')`);
  chk('y avisa que se actualiza cuando termines', /cuando termines/.test(avisos1), avisos1);

  // vaciar el carrito: se actualiza sola al reintento (15 s)
  await evaluar(cli, `(function(){ var b=[].slice.call(document.querySelectorAll('#npProductos [onclick^="npQty"]')).find(function(x){return /-\\s*1\\)/.test(x.getAttribute('onclick'));}); if(b)b.click(); return typeof npHayCarrito==='function' && npHayCarrito(); })()`);
  const recargo = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 25000) { if (navs > n0) return true; await pausa(200); } return false; })();
  chk('al vaciar el carrito se actualiza SOLA (sin tocar nada)', recargo, { navs: navs - n0 });
  await esperar(cli, `typeof go==='function'`, 60000); await pausa(1500);
  chk('y la pagina queda en la version nueva', await evaluar(cli, pagCN) === 'maleu-panel-v999');
  chk('una sola recarga', navs - n0 === 1, { navs: navs - n0 });
  chk('el HTML nuevo quedo en la copia guardada', await evaluar(cli, `(function(){ if(!('caches' in window))return 'sin caches'; return caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.open(k).then(function(c){ return c.match('/app.html'); }).then(function(r){ return r?r.text():''; }); })); }).then(function(ts){ return ts.length===0 ? 'sin copias (dev: sin service worker)' : ts.every(function(t){ return t.indexOf("_APP_CN_PAGINA='maleu-panel-v999'")>=0; }); }); })()`) !== false);

  // 4) ya en la nueva: no recarga
  n0 = navs;
  await pausa(7000);
  chk('ya en la version nueva, no vuelve a recargar', navs === n0, { navs: navs - n0 });

  // 5) recargar no trae la version: tope
  pub.sw = 'maleu-panel-v1000'; pub.fresco = 'maleu-panel-v1000'; pub.nav = 'maleu-panel-v999';
  n0 = navs;
  await evaluar(cli, chequear);
  const t5 = Date.now();
  while (Date.now() - t5 < 40000) { await pausa(500); }
  const vueltas = navs - n0;
  chk('si recargar no la trae, para a las 2 recargas', vueltas === 2, { navs: vueltas });
  await esperar(cli, `typeof go==='function'`, 30000); await pausa(1500);
  n0 = navs;
  await evaluar(cli, chequear);
  await pausa(4000);
  chk('y avisa que se puede recargar de cero', /recargar de cero/.test(await evaluar(cli, `(window.__toasts||[]).join('|')`)),
    await evaluar(cli, `(window.__toasts||[]).join('|')`));
  chk('sin recargar mas', navs === n0, { navs: navs - n0 });

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
