/* ¿El atajo de Supabase se usa de verdad, y cuánto tarda cada mitad? (23/9/2026)
 *
 *   node _tools/pruebas/medir_refresco_supabase.js <token>
 *
 * Abre el ERP en un Chrome real con la sesión de verdad, cronometra por
 * separado las dos llamadas que hace un refresco de Pedidos —la de Supabase y
 * la de Apps Script— y mira si la lista llegó a pintarse con la de Supabase.
 *
 * Existe porque el 23/9 a la noche se publicó el atajo, Tadeo dijo "sigue
 * tardando 10 segundos", y la primera explicación fue una CONJETURA. Medir en
 * el navegador es lo único que distingue "no se disparó" de "se disparó pero no
 * se nota". Ver la memoria `verificar-front-en-navegador`.
 *
 * Sólo LEE: engancha `fetch` para cronometrar, no cambia ningún POST.
 */
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
if (!token) { console.error('Falta el token de sesión'); process.exit(1); }
const URL = process.env.URL || 'https://app.maleu.com.ar/app.html';
const dormir = ms => new Promise(r => setTimeout(r, ms));

/* El cronómetro se instala ANTES de que cargue el ERP. */
const ESPIA = `
window.__sb = { llamadas: [], pinto: null, t0: Date.now() };
(function(){
  var orig = window.fetch;
  window.fetch = function(u, i){
    var url = (typeof u === 'string') ? u : ((u && u.url) || '');
    var que = url.indexOf('supabase.co') > -1 ? 'SUPABASE'
            : (url.indexOf('action=sbToken') > -1 ? 'TOKEN'
            : (url.indexOf('script.google.com') > -1 ? 'GOOGLE' : ''));
    if (!que) return orig.apply(this, arguments);
    var t = Date.now();
    return orig.apply(this, arguments).then(function(r){
      window.__sb.llamadas.push({ que: que, ms: Date.now() - t,
        desde: t - window.__sb.t0, cod: r.status, url: url.slice(0, 90) });
      return r;
    }, function(e){
      window.__sb.llamadas.push({ que: que, ms: Date.now() - t,
        desde: t - window.__sb.t0, cod: 'ERROR ' + (e && e.message), url: url.slice(0, 90) });
      throw e;
    });
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

    /* Esperar a que el ERP esté arriba y con pedidos. */
    const limite = Date.now() + 40000;
    while (Date.now() < limite) {
      const e = await evaluar(cli, `(function(){return !!(window.D && D.pedidos && D.pedidos.length);})()`);
      if (e) break;
      await dormir(500);
    }

    /* ESPERAR A QUE ESTÉ QUIETO. Disparar un refresco encima del arranque deja
       el contador de "en vuelo" en 2, y entonces el -1 del atajo no lo lleva a
       cero: la medición dice que el cartel no se apagó cuando en realidad sí lo
       haría con un solo refresco, que es lo que hace Tadeo al tocar el botón.
       Medir sobre un estado sucio es medir otra cosa. */
    const quieto = Date.now() + 40000;
    while (Date.now() < quieto) {
      const v = await evaluar(cli, `(function(){return (window._frescoVuelo&&window._frescoVuelo.pedidos)||0;})()`);
      if (!v) break;
      await dormir(500);
    }
    await dormir(1500);

    /* El refresco, igual que tocar el botón. Se limpia el cronómetro primero
       para medir SOLO este refresco y no el arranque. */
    await evaluar(cli, `(function(){ window.__sb.llamadas=[]; window.__sb.t0=Date.now();
      window.__sb.antes = (window.D&&D.pedidos)?D.pedidos.length:0;
      window.__sb.deSbAntes = (window.D&&D._pedidosDeSupabase)||0;
      try{ loadRapido({soloPedidos:true}); }catch(e){ window.__sb.crash=String(e); }
      return 1; })()`);

    /* Se mira cada 200 ms QUIÉN pintó primero. */
    const marcas = [];
    for (let i = 0; i < 90; i++) {
      await dormir(200);
      const m = await evaluar(cli, `(function(){return {
        t: Date.now()-window.__sb.t0,
        deSb: (window.D&&D._pedidosDeSupabase)||0,
        n: (window.D&&D.pedidos)?D.pedidos.length:0,
        enVuelo: (window._frescoVuelo&&window._frescoVuelo.pedidos)||0,
        listas: window.__sb.llamadas.length
      };})()`);
      marcas.push(m);
      if (m.t > 16000) break;
    }

    const fin = await evaluar(cli, `(function(){return {
      llamadas: window.__sb.llamadas,
      crash: window.__sb.crash||'',
      errores: (window.__err||[]).slice(0,5),
      deSbFinal: (window.D&&D._pedidosDeSupabase)||0
    };})()`);

    console.log('\n== Las llamadas de UN refresco de Pedidos ==');
    if (!fin.llamadas.length) console.log('  (ninguna) — el refresco no salió a la red');
    fin.llamadas.forEach(l => console.log(
      `  ${String(l.que).padEnd(9)} arrancó a los ${String(l.desde).padStart(5)} ms · tardó ${String(l.ms).padStart(6)} ms · ${l.cod}`));

    const prim = marcas.find(m => m.deSb === 1);
    const fresco = marcas.find(m => m.enVuelo === 0 && m.t > 300);
    console.log('\n== Qué vio la pantalla ==');
    console.log('  la lista se pintó con Supabase:', prim ? `SÍ, a los ${prim.t} ms` : 'NO');
    console.log('  el cartel "Actualizando…" se apagó a los:', fresco ? fresco.t + ' ms' : 'no se apagó en 16 s');
    console.log('  al final la lista es de Supabase:', fin.deSbFinal === 1 ? 'sí' : 'no (la pisó Google, como debe)');
    if (fin.crash) console.log('  CRASH:', fin.crash);
    if (fin.errores.length) console.log('  errores en consola:', JSON.stringify(fin.errores));
  } finally {
    try { cli.matar(); } catch (e) {}
    process.exit(0);
  }
})();
