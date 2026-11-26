/* MI PORTAL, pasada de la auditoría (11/11/2026): entra como el representante de prueba (login real, ~/.maleu/robot.json
   › pinRep) y recorre Hoy, Pedidos, Clientes, Plata y el alta (nuevo).
     BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_portal_pantallas.js [ancho]
   En cada pantalla: sin símbolos (✓ ✕ ★ ⚠ ↻ ◀ ▶ ✎ emojis), sin códigos (MAYUS_CON_GUION), nada se sale, y los botones
   visibles miden ≥ 40 px. Toda escritura a la base se corta en el navegador. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const RJ = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
let ok = 0, mal = 0;
const chk = (c, m, x) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, x !== undefined ? JSON.stringify(x).slice(0, 700) : ''); } };
(async () => {
  const cli = await abrir(); const ev = (e) => evaluar(cli, e);
  try {
    await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 60 && !(await ev("typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')")); i++) await T(500);
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(RJ.repUsuario || 'pruebarobot')};document.getElementById('loginPin').value=${JSON.stringify(String(RJ.pinRep))};panelDoLogin();1`);
    for (let i = 0; i < 60 && !(await ev("typeof SESSION!=='undefined'&&SESSION&&SESSION.rol==='vendedor'")); i++) await T(500);
    await ev(`(function(){var of=window.fetch;window.fetch=function(u,o){var url=String((u&&u.url)||u||'');if(o&&String(o.method||'').toUpperCase()==='POST'&&/rpc\\//.test(url)&&!/(_pantalla|login_pin|mi_sesion|palancas|permiso|lectura)/.test(url))return Promise.reject(new TypeError('cortado'));return of.apply(this,arguments);};})()`);
    await T(4000); await ev("go('miportal')"); await T(5000);
    for (const s of ['hoy', 'pedidos', 'clientes', 'plata', 'nuevo']) {
      await ev(`try{${s === 'nuevo' ? "showScreen('nuevo')" : "showScreen('dashboard');setMainTab('" + s + "')"}}catch(e){}`); await T(3500);
      const r = JSON.parse(await ev(`JSON.stringify((function(){var p=document.getElementById('p-miportal')||document.body,t=p.innerText;
        var bs=[].filter.call(p.querySelectorAll('button'),function(b){var r=b.getBoundingClientRect();return r.width>0&&r.height>0&&b.offsetParent!==null;});
        var chicos=bs.filter(function(b){var r=b.getBoundingClientRect();return r.height<39.5&&r.width<200;}).map(function(b){return (b.innerText||b.getAttribute('aria-label')||'?').slice(0,24)+' '+Math.round(b.getBoundingClientRect().height);});
        return {n:t.length,sim:(t.match(/[\\u25C0\\u25B6\\u25BE\\u25B4\\u270E\\u21BB\\u2713\\u2715\\u2717\\u2605\\u26a0\\u2716]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/g)||[]),
          cod:(t.match(/\\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{3,}\\b/g)||[]), sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, chicos:chicos.slice(0,8)};})())`));
      chk(!r.sim.length && !r.cod.length, `${s}: sin símbolos ni códigos`, r);
      chk(r.sw <= r.cw + 1, `${s}: nada se sale a ${ANCHO} px`, { sw: r.sw, cw: r.cw });
      chk(!r.chicos.length, `${s}: botones de ≥ 40 px`, r.chicos);
    }
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
