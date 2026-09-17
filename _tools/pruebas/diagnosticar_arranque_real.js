/*
  Diagnóstico de arranque real, sin escribir nada en el ERP.
  Usa un token de sesión vigente y Chrome real contra el panel local para medir
  exactamente qué queda pendiente cuando Inicio no sale de "Cargando Maleu".
  Uso: node _tools/pruebas/diagnosticar_arranque_real.js <token>
*/
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const token = process.argv[2];
if (!token) { console.error('Falta token'); process.exit(1); }

function dormir(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) });
    await cli.enviar('Page.navigate', { url: process.env.URL || 'http://localhost:8080/app.html' });
    const limite = Date.now() + 70000;
    let estado = null;
    while (Date.now() < limite) {
      estado = await evaluar(cli, `(function(){return {
        listo: !!(window.D && Array.isArray(D.pedidos) && D.pedidos.length),
        pedidos: window.D && Array.isArray(D.pedidos) ? D.pedidos.length : 0,
        loader: (document.getElementById('ld')||{}).textContent || '',
        loaderVisible: (function(){var e=document.getElementById('ld');return !!e && getComputedStyle(e).display!=='none';})(),
        dEstado: window._dEstado || '', dPidiendo: !!window._dPidiendo,
        cola: (window.__colaGet||[]).length,
        enVuelo: window.__enVueloGet || 0,
        cortes: window.__corteGet || null,
        errores: (window.__err||[]).slice(0,8)
      };})()`);
      if (estado.listo) break;
      await dormir(500);
    }
    console.log(JSON.stringify(estado));
    process.exitCode = estado && estado.listo ? 0 : 1;
  } finally { cli.matar(); }
})().catch(e => { console.error('Diagnóstico falló:', e.message); process.exit(1); });
