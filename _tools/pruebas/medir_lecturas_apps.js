/* ¿QUÉ LECTURAS LE SIGUE PIDIENDO EL ERP A APPS SCRIPT? (3/11/2026, corte a Supabase: pieza 4 del Organizador)
   node _tools/pruebas/medir_lecturas_apps.js <token> [segundos-por-tab]
   BASE_URL=http://localhost:8171/app.html para lo local (el backend es producción; los POST van cortados por sesion_prep).
   UNA ventana con la sesión real. Abre cada tab (y las sub-tabs de Stock y Ventas), espera, y anota cada GET a Apps Script
   por acción: en qué tab salió y si salió con la base contestando (= el front no usó la base, o la base no tiene esa lectura).
   Sale una tabla «acción → tabs» al final. Las que no aparecen no se pidieron en este recorrido: NO quiere decir que no existan. */
'use strict';
const cdp = require('./cdp.js');
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN, SEG] = process.argv.slice(2);
const ESPERA = (Number(SEG) || 15) * 1000;
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ESPIA = `;(function(){var f=window.fetch;window.__aApps=[];window.__tabMedida='arranque';window.fetch=function(u,x){var s=String(u&&u.url||u);
  try{if(/script\\.google(usercontent)?\\.com|\\/exec(\\?|$)/.test(s)&&!(x&&String(x.method||'').toUpperCase()==='POST')){var m=/[?&]action=([A-Za-z0-9_]+)/.exec(s);if(m&&m[1]==='lote'){var q=/acciones=([^&]*)/.exec(s);if(q)m[1]='lote['+decodeURIComponent(q[1])+']';}window.__aApps.push({a:m?m[1]:'(sin action)',tab:window.__tabMedida,ms:Math.round(performance.now()),pal:!!(window._palancaVal&&window._palancaVal('stockArma')),pila:String(new Error().stack).split(String.fromCharCode(10)).slice(2,6).map(function(x){return x.trim().replace(/^at /,'').replace(/[(].*app[.]html[^:]*:/,'(:');}).join(' < ')});}}catch(e){}
  return f.apply(this,arguments);};})();`;
const TABS = process.env.SOLO_ARRANQUE ? [] : [
  ['inicio'], ['pedidos'], ['pedidoshome'], ['caja'], ['egresos'], ['pagos'], ['ruta'], ['busqueda'], ['miportal'], ['bbdd'],
  ['estancias'], ['proveedores'], ['ajustes'], ['planificacion'], ['metricas'], ['resumen'], ['mireparto'], ['catering'],
  ['ventas', 'ventas'], ['ventas', 'cobros'], ['ventas', 'tendencia'], ['ventas', 'productos'], ['ventas', 'combos'],
  ['stock', 'productos'], ['stock', 'contar'], ['stock', 'mover'], ['stock', 'carne'], ['stock', 'carga'], ['stock', 'catalogo'],
];
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ESPIA });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m, p) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  await pausa(ESPERA + 10000);
  for (const [tab, sub] of TABS) {
    const nombre = tab + (sub ? '›' + sub : '');
    try {
      await evaluar(cli, `window.__tabMedida=${JSON.stringify(nombre)}; go(${JSON.stringify(tab)}); 1`);
      if (sub) {
        await pausa(1500);
        await evaluar(cli, tab === 'stock'
          ? `try{ stShowSub(${JSON.stringify(sub)}); }catch(e){} 1`
          : `try{ var b=document.querySelector('[data-vt="${sub}"]'); if(b)b.click(); }catch(e){} 1`);
      }
    } catch (e) { console.log('  (' + nombre + ': ' + e.message + ')'); }
    await pausa(ESPERA);
    process.stdout.write('.');
  }
  const l = await evaluar(cli, `window.__aApps`);
  const por = {};
  l.forEach((x) => { (por[x.a] = por[x.a] || {}); por[x.a][x.tab] = (por[x.a][x.tab] || 0) + 1; });
  console.log('\n\n' + Object.keys(por).length + ' acciones GET a Apps Script en el recorrido (' + l.length + ' pedidos):');
  Object.keys(por).sort().forEach((a) => console.log('  ' + a.padEnd(26) + Object.entries(por[a]).map(([t, n]) => t + (n > 1 ? '×' + n : '')).join(', ')));
  if (process.env.PILAS) l.filter((x) => x.tab === 'arranque' || x.a === process.env.PILAS).forEach((x) => console.log('\n  ' + x.a + ' @' + x.ms + 'ms palancas:' + x.pal + '\n     ' + x.pila));
  cli.matar(); process.exit(0);
})().catch((e) => { console.error('REVENTO', e); process.exit(2); });
