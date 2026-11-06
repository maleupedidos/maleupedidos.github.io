/* El aviso «Mostrando lo guardado…» al reabrir (5/11/2026): aparece y SE VA cuando llega lo de ahora.
   node _tools/pruebas/probar_aviso_copia.js            → producción
   BASE_URL=http://localhost:8091/app.html …            → local
   Entra con el robot, deja que cargue (queda la copia `ma3`), recarga la página (= cerrar y abrir la app) y mira el
   aviso en Inicio cada 500 ms durante 30 s. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
(async () => {
  const cli = await cdp.abrir();
  const ev = (expr, ms) => Promise.race([cdp.evaluar(cli, expr), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 20000))]);
  const esperar = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(expr, 10000); if (v) return v; } catch (e) {} await pausa(250); } return null; };
  let mal = 0;
  try {
    await cli.enviar('Page.navigate', { url: URL_APP });
    await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000);
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))}; document.getElementById('loginRemember').checked=true; panelDoLogin(); 1`);
    await esperar(`typeof SESSION!=='undefined'&&SESSION&&!!SESSION.usuario`, 60000);
    await ev(`go('inicio'); 1`);
    await pausa(15000);
    console.log('version', await ev(`(function(){try{return CACHE_VERSION_PANEL||'';}catch(e){return '';}})()||document.documentElement.innerHTML.match(/maleu-panel-v\\d+/)?.[0]||'?'`).catch(() => '?'),
      '· copia guardada', await ev(`!!localStorage.getItem('ma3')`), '· hora', await ev(`localStorage.getItem('ma3t')||'sin hora'`));
    await ev(`localStorage.setItem('ma3t', String(Date.now() - 3*3600*1000)); 1`);   // como el celular de Tadeo: lo guardado es de hace horas
    // Cerrar y abrir.
    await cli.enviar('Page.reload', { ignoreCache: false });
    await esperar(`typeof SESSION!=='undefined'&&SESSION&&!!SESSION.usuario&&!!document.getElementById('hAlerts')`, 60000);
    const t0 = Date.now(); let visto = null, seFue = null;
    while (Date.now() - t0 < 30000) {
      const hay = await ev(`(document.getElementById('hAlerts')||{}).textContent.indexOf('Mostrando lo guardado')>-1`).catch(() => null);
      if (hay && visto === null) visto = Date.now() - t0;
      if (!hay && visto !== null) { seFue = Date.now() - t0; break; }
      await pausa(500);
    }
    const txt = await ev(`((document.getElementById('hAlerts')||{}).textContent||'').slice(0,120)`).catch(() => '');
    console.log('aviso visto a los', visto === null ? '—' : visto + ' ms', '· se fue a los', seFue === null ? 'NUNCA (30 s)' : seFue + ' ms');
    if (visto !== null && seFue === null) { mal++; console.log('MAL: el aviso quedó pegado →', txt); }
    else console.log('OK');
  } catch (e) { mal++; console.log('MAL', e.message); }
  finally { cli.matar(); }
  process.exit(mal ? 1 : 0);
})();
