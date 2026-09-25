/* EL ERP SIN LA CDN: ¿avisa, y sobrevive? (25/9/2026)
 *
 *   node _tools/pruebas/probar_cdn_sin_red.js <token>
 *   (necesita el servidor local CON service worker:
 *      node _tools/servir.js 8099 --con-sw
 *    y URL=http://localhost:8099/app.html)
 *
 * El ERP carga tres librerías de `cdn.jsdelivr.net` — chart.js, html2canvas y
 * jspdf — y hasta el 25/9/2026 **ninguna entraba a la cache de la PWA**. Una
 * app que abre sin red con tres piezas que no.
 *
 * Medido bloqueando la CDN: el gráfico de Proveedores quedaba vacío, el título
 * seguía diciendo "Unidades pedidas a Sevuchitas — por semana", y en consola no
 * había nada, porque el try/catch del render se traga el ReferenceError.
 *
 * Dos fases, porque son dos propiedades distintas y las dos importan:
 *
 *   1. **SIN la librería, la pantalla AVISA.** Es la primerísima vez sin red,
 *      y el arreglo del cache no la cubre. Una pantalla que promete algo que
 *      no puede dar es peor que una que avisa.
 *   2. **Con la librería ya guardada, el gráfico ANDA aunque la CDN se caiga.**
 *      Es lo que arregla el service worker, y es el caso que pasa de verdad:
 *      Tadeo abrió el ERP con wifi y después sale a repartir.
 *
 * Sólo LEE.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
if (!token) { console.error('Falta el token: node probar_cdn_sin_red.js <token>'); process.exit(1); }
const URL = process.env.URL || 'http://localhost:8099/app.html';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return { __err: String(x.message) }; } };

let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 180) : '')); }
};

/* Se espera A QUE PINTE, no un rato fijo.
 *
 * La primera version dormia 9 s despues de entrar a la tab, y daba 8 rojos
 * —incluido el CONTROL, o sea con la CDN abierta— porque `pvChartTitle` seguia
 * en "—", el valor que trae el HTML de fabrica: la pantalla no habia pintado.
 * `analisisProveedor` tarda **9.670 ms** medidos, el endpoint mas lento del ERP.
 *
 * Subir el numero lo arreglaria hoy y volveria a fallar el dia que el backend
 * este cargado. Se espera la condicion, con tope. Y si el tope se cumple, se
 * DICE: una prueba que mide una pantalla en blanco tiene que avisar que eso
 * fue lo que midio, no tirar rojos sobre codigo sano. */
async function irAProveedores(cli) {
  const lim = Date.now() + 45000;
  while (Date.now() < lim) {
    if (await ev(cli, `(function(){return !!(window.D&&D.pedidos&&D.pedidos.length);})()`) === true) break;
    await dormir(400);
  }
  await ev(cli, `(function(){ try{ go('proveedores'); }catch(e){} return 1; })()`);

  const hasta = Date.now() + 40000;
  while (Date.now() < hasta) {
    const t = await ev(cli, `(function(){ var e=document.getElementById('pvChartTitle');
      return e ? String(e.textContent||'').trim() : ''; })()`);
    /* "—" es el valor de fabrica. Cualquier otra cosa significa que el render
       corrio: el titulo de verdad, o el aviso de que falto la libreria. */
    if (t && t !== '\u2014' && t !== '-') return true;
    await dormir(400);
  }
  console.log('  ‼ la tab Proveedores no pinto en 40 s — lo de abajo mide una pantalla en blanco');
  return false;
}

const MIRAR = `(function(){ return {
  chart: (typeof window.Chart !== 'undefined'),
  titulo: (document.getElementById('pvChartTitle')||{}).textContent || '',
  sub: (document.getElementById('pvChartSub')||{}).textContent || '',
  /* El KPI de arriba: tiene que seguir bien aunque el dibujo falte. Si el
     aviso tapara los números, el arreglo sería peor que el bug. */
  total: (document.getElementById('pvTotalQty')||{}).textContent || '',
  err: (window.__err||[]).filter(function(e){ return /Chart is not defined/.test(String(e)); }).length
};})()`;

(async () => {
  console.log('\n== El ERP sin la CDN ==');

  /* ── FASE 1: la CDN bloqueada desde el arranque ─────────────────────── */
  console.log('\n-- 1. sin la librería, la pantalla avisa --');
  let cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable'); await cli.enviar('Network.enable');
    /* Aca `setBlockedURLs` SI sirve: el navegador es nuevo, la cache esta
       vacia, y lo que se prueba es que la pantalla avise. Con nada guardado,
       cortar antes o despues del service worker da lo mismo. (En la fase 2 no
       da lo mismo — ver el comentario de alla.) */
    await cli.enviar('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*'] });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) });
    await cli.enviar('Page.navigate', { url: URL });
    await irAProveedores(cli);
    const r = await ev(cli, MIRAR);

    chk('la librería no está (control: el bloqueo funcionó)', r.chart === false, r.chart);
    chk('el título NO promete un gráfico que no puede dibujar',
      /no se pudo cargar/i.test(String(r.titulo)), r.titulo);
    chk('y dice por qué, en una línea', /internet|conexi/i.test(String(r.sub)), r.sub);
    /* Lo que NO puede pasar: que el aviso se lleve puestos los números. */
    chk('los números de arriba siguen estando',
      String(r.total).trim() !== '' && String(r.total).trim() !== '—', r.total);
    chk('y ya no tira el ReferenceError', r.err === 0, r.err);
  } finally { try { cli.matar(); } catch (e) {} }

  /* ── FASE 2: se cachea con red, y después se corta ───────────────────
     Navegador NUEVO: el de la fase 1 tiene la CDN bloqueada desde el inicio y
     nunca pudo guardar nada. Medir la fase 2 ahí diría que el cache no sirve,
     cuando lo que pasó es que nunca hubo qué cachear. */
  console.log('\n-- 2. ya guardada, el gráfico sobrevive a quedarse sin CDN --');
  cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable'); await cli.enviar('Network.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) });

    /* Vuelta 1: CON la CDN, para que el service worker la guarde. */
    await cli.enviar('Page.navigate', { url: URL });
    await irAProveedores(cli);
    const r1 = await ev(cli, MIRAR);
    chk('control: con la CDN abierta el gráfico se dibuja', r1.chart === true, r1);

    /* ¿Quedó guardada de verdad? Se le pregunta a la cache, no se supone. */
    const enCache = await ev(cli, `(async function(){ try{
      var ks = await caches.keys();
      for (var i=0;i<ks.length;i++){
        var c = await caches.open(ks[i]);
        var m = await c.match('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
        if (m) return { cache: ks[i], status: m.status, tipo: m.type };
      }
      return null;
    }catch(e){ return { err: String(e) }; } })()`);
    chk('chart.js quedó guardada en la cache de la PWA', !!(enCache && enCache.status === 200), enCache);
    /* Opaca NO sirve: con status 0 no se puede distinguir la librería de un
       404, y guardaríamos el error como si fuera buena. */
    chk('y con la respuesta transparente, no opaca',
      !!(enCache && enCache.tipo !== 'opaque'), enCache && enCache.tipo);

    /* Vuelta 2: SIN RED, y esto es `emulateNetworkConditions` y no
       `setBlockedURLs` a proposito.

       `setBlockedURLs` corta **antes del service worker**: el SW nunca llega a
       responder de su cache y el pedido falla aunque la libreria este guardada.
       Verificado preguntandole a la pagina — con el SW controlando y
       `status=200 tipo=cors` en la cache, un `fetch` manual daba
       "Failed to fetch". Eso no pasa en la vida real: una CDN caida, un DNS que
       no resuelve o un celular sin señal fallan DESPUES del service worker, que
       es justo para lo que esta.

       Con el bloqueo, esta fase daba dos rojos sobre un arreglo que funciona.
       Un simulador que corta en otro lado que el original no prueba lo que dice
       probar. */
    await cli.enviar('Network.emulateNetworkConditions',
      { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await cli.enviar('Page.navigate', { url: URL });
    await irAProveedores(cli);
    const r2 = await ev(cli, MIRAR);
    /* El control de que el corte fue de verdad: sin esto, un `offline` que no
       se aplico dejaria pasar los tres chequeos de abajo por el motivo
       equivocado. */
    chk('control: la red esta cortada de verdad',
      (await ev(cli, `navigator.onLine`)) === false,
      await ev(cli, `navigator.onLine`));

    chk('sin CDN pero con la copia guardada, la librería está', r2.chart === true, r2.chart);
    chk('y el gráfico se dibuja igual', !/no se pudo cargar/i.test(String(r2.titulo)), r2.titulo);
    chk('sin ReferenceError', r2.err === 0, r2.err);
  } finally { try { cli.matar(); } catch (e) {} }

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})();
