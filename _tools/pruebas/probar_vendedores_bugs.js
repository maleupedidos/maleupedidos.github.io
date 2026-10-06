// node probar_vendedores_bugs.js <token> [390|1440] [puerto|URL] — 6/10/2026. Contra producción (v533) da 3 MAL.
// Bugs 1 y 2 con la sesión REAL y los datos de producción (solo GET; los POST se interceptan).
const path = require('path');
const T = __dirname + '/';
const { abrir, evaluar } = require(T + 'cdp.js');
const PREP = require(T + 'sesion_prep.js')(process.argv[2]);
const W = Number(process.argv[3] || 390);
const URL = /^http/.test(process.argv[4]||'') ? process.argv[4] : 'http://localhost:' + (process.argv[4] || 8117) + '/app.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return Date.now() - t0; } catch (e) {} await sleep(400); } return -1; }
setTimeout(()=>{console.log("TIMEOUT global");process.exit(2)},240000);
(async () => {
  console.log("abriendo chrome");
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    cli.escuchar((m, pa) => { if (m === 'Page.javascriptDialogOpening') { console.log('   [dialogo] ' + pa.type + ': ' + String(pa.message).slice(0, 160)); cli.enviar('Page.handleJavaScriptDialog', { accept: false }); } });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: 844, deviceScaleFactor: 1, mobile: W < 800 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: URL });
    console.log("cargando", await esperar(cli, `typeof go==="function"&&document.readyState==="complete"`, 30000));
    console.log('Bug 1 · Ajustes › Usuarios (' + W + 'px)');
    await evaluar(cli, 'setTimeout(function(){go("ajustes")},0),1');
    const t1 = await esperar(cli, 'typeof AJ_DATA!=="undefined"&&AJ_DATA&&(AJ_DATA.vendedores||[]).length>0', 60000);
    await evaluar(cli, 'ajGo("usuarios")');
    await sleep(800);
    const u = await evaluar(cli, `(function(){var c=document.querySelector('#p-ajustes .aj-card');var rows=[].slice.call(c?c.querySelectorAll('.aj-row'):[]);
      return {n:rows.length, vend:(AJ_DATA.vendedores||[]).length, us:(AJ_DATA.usuarios||[]).length, txt:rows.map(function(r){return r.textContent.replace(/\\s+/g,' ').slice(0,90)}),
      ancho:document.documentElement.scrollWidth}})()`);
    console.log('   datos en ' + t1 + ' ms · filas: ' + u.n);
    chk('la lista "Usuarios del ERP" tiene filas (' + u.n + ')', u.n > 0, u);
    chk("Federico D'Andrea está en la lista de usuarios", u.txt.some((t) => /D'Andrea/.test(t) && /fede/.test(t)), u.txt);
    chk('una fila por usuario + solo Fede de más (sin repetir a Marcos, Fini, Rufino)', u.n === (u.us + 1), [u.n, u.us]);
    chk('sin scroll horizontal', u.ancho <= W, u.ancho);

    console.log('Bug 2 · Ruta › COBROS, tarjeta de Fede');
    await evaluar(cli, 'setTimeout(function(){go("ruta")},0),1');
    await esperar(cli, 'typeof switchTab==="function"', 30000);
    await evaluar(cli, 'switchTab("cobros")');
    const t2 = await esperar(cli, `[].some.call(document.querySelectorAll('.cobro-card'),function(c){return /D'Andrea/.test(c.textContent)})`, 90000);
    console.log('   tarjeta en ' + t2 + ' ms');
    chk('aparece la tarjeta de Fede', t2 >= 0);
    const r = await evaluar(cli, `(function(){var c=[].filter.call(document.querySelectorAll('.cobro-card'),function(c){return /D'Andrea/.test(c.textContent)})[0];
      if(!c)return {err:'sin tarjeta'};var b=c.querySelector('.cobro-btn-cobrado');b.click();
      var o=document.querySelector('#pg-ruta #confirmOverlay, #confirmOverlay');var t=document.querySelector('#rutToast, .toast');
      return {btn:b.textContent, modal:o?o.textContent.replace(/\\s+/g,' ').slice(0,200):'', toast:t?t.textContent:'', card:c.textContent.replace(/\\s+/g,' ').slice(0,260)}})()`);
    console.log('   ' + JSON.stringify(r).slice(0, 400));
    chk('al tocar abre el cuadro con su nombre', /Federico D'Andrea/.test(r.modal || ''), r);
    chk('no sale "No tengo los datos"', !/No tengo los datos/.test((r.toast || '') + (r.modal || '')), r.toast);
    const err = await evaluar(cli, 'window.__err');
    chk('sin errores de JS', !err.length, err);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  process.exit(mal ? 1 : 0);
})();
