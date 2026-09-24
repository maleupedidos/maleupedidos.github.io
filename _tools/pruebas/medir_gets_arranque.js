/* ¿QUÉ LE PIDE EL ERP A GOOGLE AL ABRIRSE, Y CUÁNTAS VECES? (24/9/2026)
 *
 *   node _tools/pruebas/medir_gets_arranque.js <token> [tab]
 *
 * Apps Script atiende **de a dos por cuenta**. Todo lo que se pida de más no es
 * "un poco más de tráfico": es un cupo que otro necesitaba, y el que espera es
 * Tadeo mirando el cartel girar.
 *
 * Este cuenta los GET por acción durante un arranque real. Una acción que
 * aparece dos veces es un cupo tirado, salvo que haya una razón escrita.
 *
 * Por qué existe: midiendo el cartel de Pedidos apareció `_frescoVuelo.pedidos`
 * en **2** durante todo el arranque — dos cosas pidiendo pedidos a la vez. La
 * sospecha es que `loadRapido` guarda su promesa en dos claves distintas
 * (`soloPedidos` y `completo`), así que dos llamadas con opciones distintas no
 * se fusionan y las dos salen a la red. Pero eso es leer el código: acá se
 * cuenta lo que de verdad viaja.
 *
 * También mide CUÁNDO arrancó cada uno y cuánto tardó, que es lo que muestra si
 * uno esperó a otro en la cola.
 *
 * Sólo LEE: el PREP intercepta los POST.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
const TAB = process.argv[3] || '';
if (!token) { console.error('Falta el token: node medir_gets_arranque.js <token> [tab]'); process.exit(1); }
const URL = process.env.URL || 'https://app.maleu.com.ar/app.html';
const ESPERA = parseInt(process.env.ESPERA || '40000', 10);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return null; } };

/* Se engancha ANTES del ERP para no perder los primeros, que son los que
   importan: el arranque es donde la cola está más apretada. */
const ESPIA = `
window.__gets = { t0: Date.now(), lista: [] };
(function(){
  var orig = window.fetch;
  window.fetch = function(u, i){
    var url = (typeof u === 'string') ? u : ((u && u.url) || '');
    var post = !!(i && String(i.method || '').toUpperCase() === 'POST');
    var quien = '';
    if (url.indexOf('supabase.co') > -1) quien = 'SUPABASE ' + (url.split('/rest/v1/')[1] || '').split('?')[0];
    else if (url.indexOf('script.google.com') > -1) {
      var m = url.match(/[?&]action=([a-zA-Z0-9_]+)/);
      quien = (post ? 'POST ' : '') + (m ? m[1] : '(sin action)');
    }
    if (!quien) return orig.apply(this, arguments);
    /* La pila de quién lo pidió. Es lo que convierte "se pidió dos veces" en
       "lo pidieron estos dos". Sin esto hay que adivinar. */
    var pila = '';
    try { pila = (new Error()).stack.split('\\n').slice(2, 7)
      .map(function(l){ return l.trim().replace(/^at /, '').split(' (')[0]; })
      .filter(function(l){ return l && l.indexOf('fetch') < 0; }).join(' < '); } catch(e){}
    var t = Date.now(), reg = { quien: quien, desde: t - window.__gets.t0, ms: -1, cod: 0, pila: pila };
    window.__gets.lista.push(reg);
    return orig.apply(this, arguments).then(function(r){
      reg.ms = Date.now() - t; reg.cod = r.status; return r;
    }, function(e){ reg.ms = Date.now() - t; reg.cod = 'ERROR'; throw e; });
  };
})();
`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: ESPIA });
    await cli.enviar('Page.navigate', { url: URL });

    if (TAB) {
      /* Esperar a tener datos antes de cambiar de tab: entrar a una tab vacía
         dispara su propia carga y mezclaría dos arranques en la misma cuenta. */
      const lim = Date.now() + 45000;
      while (Date.now() < lim) {
        if (await ev(cli, `(function(){return !!(window.D&&D.pedidos&&D.pedidos.length);})()`) === true) break;
        await dormir(400);
      }
      await ev(cli, `(function(){ try{ go('${TAB}'); }catch(e){} return 1; })()`);
    }
    await dormir(ESPERA);

    const r = await ev(cli, `(function(){ return window.__gets.lista; })()`) || [];

    console.log(`\n════ LOS ${r.length} PEDIDOS DEL ARRANQUE${TAB ? ' (y entrar a ' + TAB + ')' : ''} ════\n`);
    console.log(`  ${'desde'.padStart(7)} │ ${'tardó'.padStart(7)} │ ${'qué'.padEnd(26)} │ quién lo pidió`);
    console.log('  ' + '─'.repeat(7) + '─┼─' + '─'.repeat(7) + '─┼─' + '─'.repeat(26) + '─┼' + '─'.repeat(40));
    r.forEach(g => console.log(
      `  ${String(g.desde).padStart(7)} │ ${String(g.ms < 0 ? '(colgado)' : g.ms).padStart(7)} │ ${String(g.quien).padEnd(26)} │ ${String(g.pila).slice(0, 60)}`));

    /* Lo que importa: quién salió más de una vez. */
    const veces = {};
    r.forEach(g => { veces[g.quien] = (veces[g.quien] || 0) + 1; });
    const repes = Object.keys(veces).filter(k => veces[k] > 1);

    console.log('\n════ CUPOS TIRADOS ════');
    if (!repes.length) {
      console.log('  Ninguna acción salió dos veces.');
    } else {
      repes.forEach(k => {
        const cuales = r.filter(g => g.quien === k);
        const gastado = cuales.slice(1).reduce((a, g) => a + Math.max(0, g.ms), 0);
        console.log(`  ${k} salió ${veces[k]} veces — ${gastado} ms de cupo de más:`);
        cuales.forEach(g => console.log(`      a los ${String(g.desde).padStart(6)} ms · ${String(g.pila).slice(0, 70)}`));
      });
    }

    const google = r.filter(g => !/^SUPABASE/.test(g.quien) && !/^POST/.test(g.quien));
    const sb = r.filter(g => /^SUPABASE/.test(g.quien));
    console.log('\n════ EL REPARTO ════');
    console.log(`  a Apps Script: ${google.length} pedidos · ${google.reduce((a, g) => a + Math.max(0, g.ms), 0)} ms sumados`);
    console.log(`  a Supabase:    ${sb.length} pedidos · ${sb.reduce((a, g) => a + Math.max(0, g.ms), 0)} ms sumados`);
    const colgados = r.filter(g => g.ms < 0);
    if (colgados.length) console.log(`  ${colgados.length} quedaron sin responder dentro de la ventana medida`);
  } finally {
    try { cli.matar(); } catch (e) {}
    process.exit(0);
  }
})();
