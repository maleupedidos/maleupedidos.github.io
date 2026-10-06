/* AJUSTES: ¿abre al instante con la copia, o se queda en "Cargando…"? (6/10/2026)
 *
 *   node _tools/pruebas/medir_ajustes_apertura.js <token> [url]
 *
 * Simula el celular (390x844, táctil, 4G lenta) y abre la tab Ajustes DOS
 * veces, con una recarga en el medio (= cerrar y reabrir la PWA):
 *   · 1ª: navegador virgen, sin copia → espera al servidor sí o sí;
 *   · 2ª: con la copia ya guardada en `mc_ajustes` → tiene que pintar al toque.
 * En cada una mide cuándo apareció contenido y si en algún momento DESPUÉS de
 * tener contenido la pantalla volvió a "Cargando configuración…" (el bug del
 * 6/10: el refresco automático al entrar llamaba a ajReload(), que tiraba la
 * copia y dejaba la pantalla en blanco 15-25 s).
 *
 * Solo LEE: el PREP intercepta los POST.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
if (!token) { console.error('Falta el token: node medir_ajustes_apertura.js <token> [url]'); process.exit(1); }
const URL = process.argv[3] || 'https://app.maleu.com.ar/app.html';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return null; } };

/* Arranca a mirar #ajBody recién cuando se toca la tab (window.__ajT0). */
const ESPIA = `
window.__aj = { contenidoEn: 0, vaciosDespues: 0, frescoEn: 0, pedidos: 0, traza: [] };
(function(){
  var orig = window.fetch;
  window.fetch = function(u){
    var url = (typeof u === 'string') ? u : ((u && u.url) || '');
    if (url.indexOf('action=ajustesData') > -1 && window.__ajT0) window.__aj.pedidos++;
    return orig.apply(this, arguments);
  };
  setInterval(function(){
    if (!window.__ajT0) return;
    var b = document.getElementById('ajBody'); if (!b) return;
    var t = b.innerText || '', cargando = /Cargando configuraci/.test(t);
    var a = window.__aj, ms = Date.now() - window.__ajT0;
    var corto = t.replace(/\s+/g, ' ').slice(0, 50) + ' | pg-on=' + (document.querySelector('#p-ajustes.on') ? 1 : 0);
    if (!a.traza.length || a.traza[a.traza.length - 1][1] !== corto) a.traza.push([ms, corto]);
    if (!cargando && t.trim().length > 40 && !a.contenidoEn) a.contenidoEn = ms;
    if (cargando && a.contenidoEn) a.vaciosDespues++;
    if (/Actualizado/.test(t) && !a.frescoEn) a.frescoEn = ms;
  }, 50);
})();
`;

async function abrirAjustes(cli, etiqueta) {
  await cli.enviar('Page.navigate', { url: URL });
  const lim = Date.now() + 60000;
  while (Date.now() < lim) {
    if (await ev(cli, `typeof go==='function' && !!document.getElementById('ajBody')`) === true) break;
    await dormir(300);
  }
  await dormir(3000);
  const conCopia = await ev(cli, `!!localStorage.getItem('mc_ajustes')`);
  await ev(cli, `window.__ajT0=Date.now(); go('ajustes');`);
  const fin = Date.now() + 70000;
  let a = null;
  while (Date.now() < fin) {
    a = await ev(cli, `window.__aj`);
    if (a && a.frescoEn) break;
    await dormir(300);
  }
  await dormir(1500);
  a = await ev(cli, `window.__aj`) || {};
  console.log(`\n── ${etiqueta} (copia guardada al tocar: ${conCopia ? 'sí' : 'no'}) ──`);
  console.log(`  contenido en pantalla: ${a.contenidoEn ? a.contenidoEn + ' ms' : 'NUNCA'}`);
  console.log(`  datos del servidor ("Actualizado"): ${a.frescoEn ? a.frescoEn + ' ms' : 'no llegaron en 70 s'}`);
  console.log(`  volvió a "Cargando…" después de tener contenido: ${a.vaciosDespues ? 'SÍ (' + (a.vaciosDespues * 50) + ' ms)' : 'no'}`);
  console.log(`  pedidos de ajustesData: ${a.pedidos}`);
  if (process.env.TRAZA) (a.traza || []).slice(0, 12).forEach(function (x) { console.log('    ' + x[0] + ' ms  ' + x[1]); });
  return a;
}

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Network.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true });
    await cli.enviar('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: ESPIA });
    console.log('URL: ' + URL);
    await abrirAjustes(cli, '1ª apertura');
    const dos = await abrirAjustes(cli, '2ª apertura (reabrir la PWA)');
    console.log('\n════ VEREDICTO ════');
    if (dos.contenidoEn && dos.contenidoEn < 1000 && !dos.vaciosDespues)
      console.log(`  BIEN: con la copia abre en ${dos.contenidoEn} ms y actualiza por detrás sin taparla.`);
    else
      console.log(`  MAL: con la copia guardada tardó ${dos.contenidoEn || '∞'} ms en mostrar algo` +
                  (dos.vaciosDespues ? ' y volvió a "Cargando…" encima de la copia' : '') + '.');
  } finally {
    try { cli.matar(); } catch (e) {}
    process.exit(0);
  }
})();
