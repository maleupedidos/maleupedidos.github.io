/* ¿POR QUÉ "Chart is not defined" EN PROVEEDORES? (25/9/2026)
 *
 *   node _tools/pruebas/diagnosticar_chart.js <token> [--sin-cdn]
 *
 * Apareció midiendo las tabs contra producción:
 *
 *     errores: ["traer/prov_analisis ReferenceError: Chart is not defined"]
 *
 * El ERP carga Chart.js desde `cdn.jsdelivr.net` con un `<script src>` normal,
 * o sea bloqueante: cuando corre el JS de abajo, `Chart` ya tendría que estar.
 * Así que si falta, o la CDN no respondió, o algo lo pintó antes de tiempo.
 *
 * Eso son dos causas con arreglos distintos, y adivinar cuál es sale caro:
 *
 *   · **la CDN falló** → `Chart` no existe NUNCA, y la pantalla se queda sin
 *     gráfico para siempre, en silencio. Lo mismo valdría para html2canvas,
 *     jspdf y leaflet-draw, que vienen del mismo lugar.
 *   · **se pintó antes** → `traer()` dibuja la copia guardada al instante, y
 *     puede llegar antes que el script.
 *
 * `--sin-cdn` bloquea jsdelivr a propósito para ver qué pasa cuando la CDN no
 * está: es el escenario que nadie prueba y el que deja la pantalla muda.
 *
 * Sólo LEE.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
const SIN_CDN = process.argv.includes('--sin-cdn');
if (!token) { console.error('Falta el token: node diagnosticar_chart.js <token> [--sin-cdn]'); process.exit(1); }
const URL = process.env.URL || 'https://app.maleu.com.ar/app.html';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return { __err: String(x.message) }; } };

const ESPIA = `
window.__ch = { libs: [], errores: [], chartCuando: 0, t0: Date.now() };
(function(){
  /* Cuándo aparece Chart en window. Un intervalo corto: la diferencia entre
     "llegó tarde" y "no llegó" son unos cientos de ms. */
  var iv = setInterval(function(){
    if (typeof window.Chart !== 'undefined' && !window.__ch.chartCuando) {
      window.__ch.chartCuando = Date.now() - window.__ch.t0;
      clearInterval(iv);
    }
  }, 30);
  setTimeout(function(){ clearInterval(iv); }, 60000);
  window.addEventListener('error', function(e){
    /* Un <script src> que no carga dispara un error SIN mensaje, con el
       elemento como target. Es la unica senal de que una lib externa falto. */
    var t = e.target;
    if (t && t.tagName === 'SCRIPT' && t.src) {
      window.__ch.libs.push({ src: String(t.src).slice(0, 80), ok: false, ms: Date.now() - window.__ch.t0 });
    }
  }, true);
})();
`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Network.enable');
    if (SIN_CDN) {
      await cli.enviar('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*'] });
      console.log('\n  (jsdelivr BLOQUEADA a propósito)');
    }
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: ESPIA });

    /* Las respuestas de la CDN, medidas por la red y no por el JS. */
    const cdn = [];
    cli.escuchar((m, p) => {
      if (m === 'Network.responseReceived' && /jsdelivr|cdnjs/.test(p.response.url)) {
        cdn.push({ url: p.response.url.split('/').pop(), cod: p.response.status });
      }
      if (m === 'Network.loadingFailed' && p.type === 'Script') {
        cdn.push({ url: '(script que falló)', cod: p.errorText });
      }
    });

    await cli.enviar('Page.navigate', { url: URL });
    const lim = Date.now() + 45000;
    while (Date.now() < lim) {
      if (await ev(cli, `(function(){return !!(window.D&&D.pedidos&&D.pedidos.length);})()`) === true) break;
      await dormir(400);
    }
    await ev(cli, `(function(){ try{ go('proveedores'); }catch(e){} return 1; })()`);
    await dormir(12000);

    const r = await ev(cli, `(function(){ return {
      chartCuando: window.__ch.chartCuando,
      chartHay: (typeof window.Chart !== 'undefined'),
      libsMal: window.__ch.libs,
      err: (window.__err||[]).slice(0, 8),
      /* ¿El gráfico se dibujó de verdad? Un canvas en blanco no tiene contexto
         pintado, así que se mira si el canvas tiene tamaño y si hay algo. */
      canvas: (function(){
        var c = document.getElementById('pvChart');
        if (!c) return 'no existe el canvas';
        return c.width + 'x' + c.height;
      })(),
      titulo: (document.getElementById('pvChartTitle')||{}).textContent || '(sin nodo)',
      otras: {
        html2canvas: (typeof window.html2canvas !== 'undefined'),
        jspdf: (typeof window.jspdf !== 'undefined'),
        leaflet: (typeof window.L !== 'undefined')
      }
    };})()`);

    console.log('\n════ LAS LIBRERÍAS EXTERNAS ════');
    cdn.forEach(c => console.log(`  ${String(c.cod).padEnd(22)} ${c.url}`));
    if (!cdn.length) console.log('  (ninguna respuesta de CDN vista)');

    console.log('\n════ CHART ════');
    console.log(`  ¿está en window?: ${r.chartHay ? 'SÍ' : 'NO'}`);
    console.log(`  apareció a los: ${r.chartCuando ? r.chartCuando + ' ms' : 'nunca'}`);
    console.log(`  el canvas del gráfico: ${r.canvas}`);
    console.log(`  el título dice: "${String(r.titulo).slice(0, 60)}"`);
    if (r.libsMal && r.libsMal.length) {
      console.log('\n  scripts que NO cargaron:');
      r.libsMal.forEach(l => console.log(`    ${l.src}  (a los ${l.ms} ms)`));
    }

    console.log('\n════ LAS OTRAS TRES DEL MISMO LUGAR ════');
    console.log(`  html2canvas: ${r.otras.html2canvas ? 'sí' : 'NO'} · jspdf: ${r.otras.jspdf ? 'sí' : 'NO'} · leaflet: ${r.otras.leaflet ? 'sí' : 'NO'}`);

    console.log('\n════ ERRORES EN CONSOLA ════');
    if (!r.err.length) console.log('  ninguno');
    r.err.forEach(e => console.log(`  ${String(e).slice(0, 110)}`));

    console.log('\n════ VEREDICTO ════');
    if (!r.chartHay) {
      console.log('  Chart NO está: la pantalla de Proveedores se queda SIN GRÁFICO,');
      console.log('  y el try/catch del render se traga el error — no se ve nada raro.');
    } else if (r.err.some(e => /Chart is not defined/.test(String(e)))) {
      console.log(`  Chart llegó (a los ${r.chartCuando} ms) pero ALGO lo usó antes.`);
      console.log('  Es la copia guardada pintándose al instante, antes que el script.');
    } else {
      console.log('  Sin error en esta corrida. Probá con --sin-cdn, que es el');
      console.log('  escenario que nadie mira: la CDN caída o bloqueada.');
    }
  } finally {
    try { cli.matar(); } catch (e) {}
    process.exit(0);
  }
})();
