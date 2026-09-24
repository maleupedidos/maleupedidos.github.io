/* LA SEGUNDA APERTURA: la que hace Tadeo todo el día. (24/9/2026)
 *
 *   node _tools/pruebas/medir_segunda_apertura.js <token>
 *
 * Las mediciones de arranque se hacen en un Chrome limpio, y eso **no es el
 * caso de Tadeo**: su teléfono ya tiene el permiso de Supabase guardado (dura
 * una hora) y la copia de los datos. Medir sólo el navegador virgen mide el
 * peor caso y deja sin mirar el que pasa veinte veces por día.
 *
 * Importa desde el 24/9/2026, cuando el atajo dejó de pedir el permiso en el
 * camino crítico: si el permiso guardado no se encontrara, el atajo quedaría
 * apagado **para siempre y en silencio**, que es peor que el bug que vino a
 * arreglar. Esto lo verifica de punta a punta.
 *
 * Abre la app, espera a que el pedido tibio traiga el permiso, y la **vuelve a
 * abrir** — que es cerrar y reabrir la PWA. En esa segunda vuelta mide:
 *   · si el atajo corrió (tiene que correr, y sin pedir permiso);
 *   · a los cuántos ms se pintó la lista;
 *   · y si `sbToken` volvió a salir (no tiene que salir).
 *
 * Sólo LEE: el PREP intercepta los POST.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
if (!token) { console.error('Falta el token: node medir_segunda_apertura.js <token>'); process.exit(1); }
const URL = process.env.URL || 'https://app.maleu.com.ar/app.html';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return null; } };

const ESPIA = `
window.__ap = { t0: Date.now(), llam: [], sbListaEn: 0 };
(function(){
  var orig = window.fetch;
  window.fetch = function(u, i){
    var url = (typeof u === 'string') ? u : ((u && u.url) || '');
    var que = url.indexOf('supabase.co') > -1 ? 'SUPABASE'
            : (url.indexOf('action=sbToken') > -1 ? 'TOKEN'
            : (url.indexOf('script.google.com') > -1 ? 'GOOGLE' : ''));
    if (!que) return orig.apply(this, arguments);
    var t = Date.now();
    window.__ap.llam.push({ que: que, desde: t - window.__ap.t0 });
    return orig.apply(this, arguments);
  };
  /* Cuándo la lista pasó a ser de Supabase. Se mira el dato, no el cartel: el
     cartel puede apagarse por otra razón. */
  var iv = setInterval(function(){
    if (window.D && window.D._pedidosDeSupabase && !window.__ap.sbListaEn) {
      window.__ap.sbListaEn = Date.now() - window.__ap.t0;
      clearInterval(iv);
    }
  }, 50);
})();
`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: ESPIA });

    /* ── PRIMERA APERTURA: la del navegador virgen ─────────────────────── */
    await cli.enviar('Page.navigate', { url: URL });
    const lim = Date.now() + 45000;
    while (Date.now() < lim) {
      if (await ev(cli, `(function(){return !!(window.D&&D.pedidos&&D.pedidos.length);})()`) === true) break;
      await dormir(400);
    }
    /* El pedido tibio sale a los 12 s. Se le dan 20 para que además vuelva. */
    await dormir(20000);
    const guardado = await ev(cli, `(function(){ try{
      var g = JSON.parse(localStorage.getItem('mc_sbtok')||'null');
      return !!(g && g.sb && g.sb.token && Number(g.hasta) > Date.now());
    }catch(e){ return false; } })()`);
    const uno = await ev(cli, `(function(){ return window.__ap; })()`) || { llam: [] };

    console.log('\n════ 1ª APERTURA (navegador virgen) ════');
    console.log(`  sbToken salió: ${uno.llam.filter(l => l.que === 'TOKEN').map(l => l.desde + ' ms').join(', ') || 'no salió'}`);
    console.log(`  el atajo pintó la lista: ${uno.sbListaEn ? 'sí, a los ' + uno.sbListaEn + ' ms' : 'no (esperado: sin permiso guardado no corre)'}`);
    console.log(`  ¿quedó el permiso guardado para la próxima?: ${guardado === true ? 'SÍ' : 'NO'}`);

    if (guardado !== true) {
      console.log('\n  ⚠ Sin permiso guardado la 2ª apertura no prueba lo que tiene que probar.');
      console.log('    Puede ser que el pedido tibio no haya llegado todavía, o que el');
      console.log('    backend no le dé permiso a este usuario. Mirá la línea de sbToken.');
    }

    /* ── SEGUNDA APERTURA: la de todos los días ────────────────────────── */
    await cli.enviar('Page.navigate', { url: URL });
    await dormir(14000);
    const dos = await ev(cli, `(function(){ return window.__ap; })()`) || { llam: [] };
    const tok2 = dos.llam.filter(l => l.que === 'TOKEN');

    console.log('\n════ 2ª APERTURA (con el permiso ya guardado) ════');
    console.log(`  el atajo pintó la lista: ${dos.sbListaEn ? 'SÍ, a los ' + dos.sbListaEn + ' ms' : 'NO'}`);
    console.log(`  sbToken volvió a salir: ${tok2.length ? 'sí, a los ' + tok2.map(l => l.desde).join(', ') + ' ms' : 'no — usó el guardado'}`);
    console.log(`  primeros pedidos: ${dos.llam.slice(0, 5).map(l => l.que + '@' + l.desde).join(' · ')}`);

    console.log('\n════ VEREDICTO ════');
    if (guardado !== true) {
      console.log('  NO PUDE MEDIRLO: no quedó permiso guardado (ver arriba).');
    } else if (dos.sbListaEn && dos.sbListaEn < 3000) {
      console.log(`  BIEN. Con el permiso guardado el atajo corre y pinta a los ${dos.sbListaEn} ms,`);
      console.log('  sin gastar un cupo de Apps Script en pedir permiso.');
    } else if (dos.sbListaEn) {
      console.log(`  El atajo corrió pero tardó ${dos.sbListaEn} ms — revisá si algo lo está frenando.`);
    } else {
      console.log('  MAL: con el permiso guardado el atajo NO corrió. Eso lo deja apagado');
      console.log('  en silencio, que es peor que el bug que vino a arreglar.');
    }
  } finally {
    try { cli.matar(); } catch (e) {}
    process.exit(0);
  }
})();
