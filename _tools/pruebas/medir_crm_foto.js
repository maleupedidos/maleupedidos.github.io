/* Cuanto tarda el CRM en tener los clientes al abrirlo, con y sin la foto de
   Supabase (4/10/2026). Datos y backend REALES.

   Un celular SIN copia guardada (perfil limpio): es el caso que espera entero.
   "Sin foto" bloquea la lectura de `erp_screen_snapshot?…crmClientes` con
   Network.setBlockedURLs, asi que el ERP va por Apps Script como antes. Se mide
   desde que se abre el CRM hasta que la lista de Personas tiene filas.

     TOKEN=... BASE=http://localhost:8095 node medir_crm_foto.js [veces] */
'use strict';
const T = 'C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(T + 'cdp.js');
const prep = require(T + 'sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8080';
const VECES = Number(process.argv[2] || 2);
const pausa = ms => new Promise(r => setTimeout(r, ms));

async function una(conFoto) {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable'); await cli.enviar('Network.enable');
    if (!conFoto) await cli.enviar('Network.setBlockedURLs', { urls: ['*erp_screen_snapshot*crmClientes*'] });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(process.env.TOKEN)
      + ';try{localStorage.removeItem("maleu_crm_clientes_v1");localStorage.removeItem("maleu_crm_clientes_ts");}catch(e){}' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
    /* El permiso de Supabase se pide a los 12 s del arranque y queda guardado:
       en el uso real ya esta de la apertura anterior. Se espera a que este. */
    for (let i = 0; i < 80; i++) { if (await evaluar(cli, "!!(window._sbPerm || (localStorage.getItem('sbTok')))") || i > 70) break; await pausa(250); }
    await pausa(16000);
    const t0 = Date.now();
    await evaluar(cli, 'go("estancias"); estSwitch("clientes"); 1');
    let ms = null;
    for (let i = 0; i < 400; i++) {
      const n = await evaluar(cli, "document.querySelectorAll('#estCliList tbody tr, #estCliList .est-cli-card').length");
      if (n > 5) { ms = Date.now() - t0; break; }
      if (i % 8 === 0) await evaluar(cli, 'go("estancias"); estSwitch("clientes"); 1');
      await pausa(150);
    }
    const nota = await evaluar(cli, 'JSON.stringify(window.__fotoCrm||null)');
    return { ms, nota };
  } finally { try { cli.matar(); } catch (e) {} }
}

(async () => {
  const res = { sin: [], con: [] };
  for (let i = 0; i < VECES; i++) {
    const a = await una(false); res.sin.push(a.ms); console.log('  sin foto: ' + a.ms + ' ms  ' + a.nota);
    await pausa(3000);
    const b = await una(true); res.con.push(b.ms); console.log('  con foto: ' + b.ms + ' ms  ' + b.nota);
    await pausa(3000);
  }
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log('\n  mediana  sin foto ' + med(res.sin) + ' ms · con foto ' + med(res.con) + ' ms');
  process.exit(0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
