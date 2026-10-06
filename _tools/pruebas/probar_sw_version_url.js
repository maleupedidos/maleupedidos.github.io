/* El service worker se registra con la VERSION en la direccion (5/10/2026).

   Cloudflare guarda los .js 4 horas: `reg.update()` sobre `/sw-panel.js` pelado
   recibia el viejo y el celular seguia con la version anterior hasta 4 h. Con
   `/sw-panel.js?v=<version de la pagina>` cada version es una direccion nueva.

     node _tools/servir.js 8098 --con-sw        (en otra terminal: el SW REAL)
     node _tools/pruebas/probar_sw_version_url.js [http://localhost:8098]
     APP=app_viejo_tmp.html node …              (la direccion contraria)

   Sostiene:
   · la pagina registra `/sw-panel.js?v=<su _APP_CN_PAGINA>` y ese queda activo;
   · un celular que venia con el viejo (`/sw-panel.js` pelado) pasa al de la
     version apenas abre la pagina nueva, sin esperar a nadie;
   · recargar la misma version no cambia la direccion (no reinstala de mas). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.argv[2] || process.env.BASE || 'http://localhost:8098';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const activo = (cli) => evaluar(cli, `navigator.serviceWorker.getRegistration('/').then(function(r){ return r && r.active ? r.active.scriptURL : ''; })`);
async function esperarActivo(cli, cond, ms) {
  const t0 = Date.now(); let u = '';
  while (Date.now() - t0 < ms) { try { u = await activo(cli); if (cond(u)) return u; } catch (e) {} await pausa(300); }
  return u;
}
async function ir(cli, url) {
  await cli.enviar('Page.navigate', { url });
  for (let i = 0; i < 150; i++) { try { if (await evaluar(cli, "document.readyState==='complete'")) break; } catch (e) {} await pausa(200); }
}

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    console.log('\n== Service worker con la version en la direccion · ' + BASE + '/' + APP + ' ==');
    /* Un celular que venia con el service worker de antes: direccion pelada. */
    await ir(cli, BASE + '/panel-manifest.json');
    await evaluar(cli, "navigator.serviceWorker.register('/sw-panel.js').then(function(){return 1;})");
    const viejo = await esperarActivo(cli, (u) => /\/sw-panel\.js$/.test(u), 30000);
    chk('arranca con el service worker viejo (direccion pelada)', /\/sw-panel\.js$/.test(viejo), viejo);

    await ir(cli, BASE + '/' + APP + '?prueba=1');
    const cn = await evaluar(cli, "typeof _APP_CN_PAGINA==='string' ? _APP_CN_PAGINA : ''");
    chk('la pagina sabe que version es', /^maleu-panel-v\d+$/.test(cn), cn);
    const nuevo = await esperarActivo(cli, (u) => /\?v=/.test(u), 30000);
    chk('al abrir la pagina nueva, queda activo /sw-panel.js?v=' + cn, nuevo.endsWith('/sw-panel.js?v=' + encodeURIComponent(cn)), nuevo);
    const cachesV = await evaluar(cli, "caches.keys().then(function(k){return k.join(',');})");
    chk('y su copia es la de esa version (el menu dice la version nueva)', cachesV.split(',').indexOf(cn) >= 0, cachesV);

    await ir(cli, BASE + '/' + APP + '?prueba=1');
    await pausa(3000);
    const otra = await activo(cli);
    chk('recargar la misma version no cambia la direccion', otra === nuevo, [otra, nuevo]);
  } catch (e) {
    chk('corre sin reventar', false, String(e && e.stack || e));
  } finally { cli.matar(); }
  console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
  process.exit(mal ? 1 : 0);
})();
