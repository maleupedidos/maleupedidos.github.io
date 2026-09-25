/* CERRAR Y ABRIR LA APP: ¿cuándo queda al día la pantalla que estoy mirando?
 * (25/9/2026)
 *
 *   node _tools/pruebas/medir_arranque_hasta_fresco.js <token> [tab]
 *
 * Tadeo: *"cada vez que cierro y abro la app en el celular —que es igual a
 * refrescar la página en la compu— TODO el ERP, cualquier tab, tarda un montón
 * de segundos en actualizarse"*.
 *
 * El número que importa NO es "cuándo terminan los 11 pedidos", es **cuándo la
 * tab que tiene abierta deja de decir "Actualizando…"**. Todo lo que se pida de
 * más entre medio es un cupo que esa tab necesitaba: Apps Script atiende de a
 * DOS por cuenta.
 *
 * Mide tres cosas y las cruza:
 *   1. cuándo quedó fresca la tab abierta;
 *   2. cuándo terminó todo el arranque;
 *   3. **quién pidió cada cosa**, con la pila completa — para separar lo que
 *      esta pantalla necesita de lo que se está trayendo para otra.
 *
 * Sólo LEE: el PREP intercepta los POST.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
const TAB = process.argv[3] || '';
if (!token) { console.error('Falta el token: node medir_arranque_hasta_fresco.js <token> [tab]'); process.exit(1); }
const URL = process.env.URL || 'https://app.maleu.com.ar/app.html';
const ESPERA = parseInt(process.env.ESPERA || '45000', 10);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return null; } };

const ESPIA = `
window.__ar = { t0: Date.now(), gets: [], fresco: 0, muestras: [] };
(function(){
  var orig = window.fetch;
  window.fetch = function(u, i){
    var url = (typeof u === 'string') ? u : ((u && u.url) || '');
    var post = !!(i && String(i.method || '').toUpperCase() === 'POST');
    var quien = '';
    if (url.indexOf('supabase.co') > -1) quien = 'SUPABASE';
    else if (url.indexOf('script.google.com') > -1) {
      var m = url.match(/[?&]action=([a-zA-Z0-9_]+)/);
      quien = (post ? 'POST ' : '') + (m ? m[1] : '(sin action)');
    }
    if (!quien) return orig.apply(this, arguments);
    /* La pila COMPLETA de nombres propios. La version anterior cortaba en 5
       frames y se quedaba con el envoltorio de la cola (_pedir, _pedirConCorte),
       que es igual para todos y no dice nada. Lo que se busca es el nombre de
       arriba: quien decidio pedirlo. */
    var pila = [];
    try {
      pila = (new Error()).stack.split('\\n').slice(1)
        .map(function(l){ return l.trim().replace(/^at /, '').split(' (')[0]; })
        .filter(function(l){ return l && !/^https?:/.test(l) && l.indexOf('fetch') < 0
                                    && l !== 'Object.fn' && l.indexOf('Promise') < 0; });
    } catch(e){}
    var t = Date.now(), reg = { quien: quien, desde: t - window.__ar.t0, ms: -1,
      cod: 0, pila: pila.join(' < ') };
    window.__ar.gets.push(reg);
    return orig.apply(this, arguments).then(function(r){
      reg.ms = Date.now() - t; reg.cod = r.status; return r;
    }, function(e){ reg.ms = Date.now() - t; reg.cod = 'ERROR'; throw e; });
  };

  /* El cartel de la tab abierta, cada 100 ms. Es lo unico que Tadeo mira. */
  setInterval(function(){
    var st = document.getElementById('hdrRefreshTime');
    var txt = st ? String(st.textContent || '') : '';
    var u = window.__ar.muestras[window.__ar.muestras.length - 1];
    if (!u || u.txt !== txt) {
      window.__ar.muestras.push({ t: Date.now() - window.__ar.t0, txt: txt,
        tab: (typeof window._tabActual === 'function') ? window._tabActual() : '' });
    }
    /* Fresco = ya no dice "Actualizando..." Y llego a decir algo. El primer
       instante que cumple las dos y no vuelve atras. */
    if (txt && !/Actualizando/.test(txt) && !window.__ar.fresco) {
      window.__ar.fresco = Date.now() - window.__ar.t0;
    } else if (/Actualizando/.test(txt)) {
      window.__ar.fresco = 0;   // volvio a girar: no estaba fresca
    }
  }, 100);
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
      /* Se entra APENAS se puede, que es lo que hace Tadeo: abre la app y toca
         la tab. Esperar a que cargue todo mediría otra cosa. */
      const lim = Date.now() + 20000;
      while (Date.now() < lim) {
        if (await ev(cli, `(function(){return typeof go==='function';})()`) === true) break;
        await dormir(200);
      }
      await ev(cli, `(function(){ try{ go('${TAB}'); }catch(e){} return 1; })()`);
    }
    await dormir(ESPERA);

    const r = await ev(cli, `(function(){ return window.__ar; })()`) || { gets: [], muestras: [] };

    console.log(`\n════ ABRIR LA APP${TAB ? ' Y ENTRAR A ' + TAB.toUpperCase() : ''} ════\n`);
    console.log(`  ${'desde'.padStart(7)} │ ${'tardó'.padStart(7)} │ ${'qué'.padEnd(20)} │ quién lo pidió`);
    console.log('  ' + '─'.repeat(7) + '─┼─' + '─'.repeat(7) + '─┼─' + '─'.repeat(20) + '─┼' + '─'.repeat(44));
    r.gets.forEach(g => console.log(
      `  ${String(g.desde).padStart(7)} │ ${String(g.ms < 0 ? '(colgado)' : g.ms).padStart(7)} │ ${String(g.quien).padEnd(20)} │ ${String(g.pila).slice(0, 44)}`));

    console.log('\n════ EL CARTEL DE LA TAB ABIERTA ════');
    r.muestras.forEach(m => console.log(`  ${String(m.t).padStart(7)} ms │ ${String(m.tab).padEnd(14)} │ ${m.txt || '—'}`));

    const google = r.gets.filter(g => g.quien !== 'SUPABASE' && !/^POST/.test(g.quien));
    const ultimo = google.length ? Math.max(...google.map(g => g.desde + Math.max(0, g.ms))) : 0;

    console.log('\n════ LOS DOS NÚMEROS ════');
    console.log(`  la tab abierta quedó al día a los: ${r.fresco ? r.fresco + ' ms' : 'no llegó a estarlo'}`);
    console.log(`  el último pedido del arranque terminó a los: ${ultimo} ms`);
    console.log(`  pedidos a Apps Script: ${google.length} · ${google.reduce((a, g) => a + Math.max(0, g.ms), 0)} ms sumados`);
    console.log(`  (con 2 cupos, el piso teórico de la cola es ~${Math.round(google.reduce((a, g) => a + Math.max(0, g.ms), 0) / 2)} ms)`);
  } finally {
    try { cli.matar(); } catch (e) {}
    process.exit(0);
  }
})();
