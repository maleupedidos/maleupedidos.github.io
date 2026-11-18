/* MI PORTAL NO VA A APPS SCRIPT NI CUANDO LA BASE FALLA (18/11/2026). El robot «Sin Apps Script» marcó en la v1256
   (run 44340785642) «miportal › … → Apps Script: GET dashboardVendedor»: cuando la lectura del tablero de la base fallaba
   (en el robot de GitHub, contra producción), `_fetchDashboardRetry` caía a Apps Script, apagado desde el corte. Acá no se
   reproduce porque la base contesta: esta prueba la HACE FALLAR a propósito y cuenta lo que sale a script.google.com.
     SBSES=<ses.json de sesion_prueba.py crear … fede vendedor> USU=fede NOMBRE="Federico D'Andrea" [BASE=http://localhost:8090]
       node _tools/pruebas/probar_portal_sin_apps.js
   Tiene que dar 0 pedidos a Apps Script, con la lectura de la base fallando (500) y con la base andando. Cuenta como el robot:
   MODO ENSAYO (`maleu_ensayo`) y `window.__ensayoApps`, más lo que llegue a la red. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js'), prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8090';
const USU = process.env.USU || 'fede', NOMBRE = process.env.NOMBRE || "Federico D'Andrea";
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c || d === undefined ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
async function una(falla) {
  process.env.PREP_SESION = JSON.stringify({ usuario: USU, rol: 'vendedor', nombre: NOMBRE, ts: Date.now(), tabs: ['miportal'] });
  const red = JSON.stringify({ ok: true, nombre: NOMBRE, usuario: USU });
  const INY = ';window.__apps=[];(function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u);'
    + 'if(/script\\.google\\.com|googleusercontent/.test(s)){window.__apps.push(s.replace(/^.*\\?/,"?").slice(0,80));return Promise.reject(new TypeError("Apps Script cortado (prueba)"));}'
    + (falla ? 'if(/\\/rpc\\/dashboard_vendedor_pantalla/.test(s))return Promise.resolve(new Response("{}",{status:500}));' : '')
    + 'return f.apply(this,arguments);};})();'
    + ';try{localStorage.setItem("maleu_red_session",' + JSON.stringify(red) + ');localStorage.setItem("maleu_ensayo","1");}catch(e){}';
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, USU) + INY });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 150; i++) { try { if (await ev(`typeof go==='function'&&typeof SESSION!=='undefined'&&!!SESSION`)) break; } catch (e) {} await pausa(200); }
    await pausa(2000);
    try { await ev(`go('miportal');1`); } catch (e) {}
    for (const t of ['hoy', 'clientes', 'plata']) { await pausa(5000); try { await ev(`setMainTab('${t}');1`); } catch (e) {} }
    await pausa(16000);   /* el respaldo viejo reintentaba a los 2, 4 y 8 s */
    /* Lo que intentó ir a Apps Script: lo que cortó el modo ensayo (como el robot) + lo que llegó a la red. */
    const apps = (await ev('(window.__ensayoApps||[]).map(function(x){return x.m+" "+x.a;})')).concat(await ev('window.__apps||[]'));
    const dv = apps.filter(a => /dashboardVendedor/.test(a));
    chk((falla ? 'con la base FALLANDO' : 'con la base andando') + ': 0 pedidos a Apps Script (' + apps.length + ')', apps.length === 0, apps.slice(0, 6));
    if (dv.length) console.log('     de esos, dashboardVendedor: ' + dv.length);
  } finally { cli.matar ? cli.matar() : cli.cerrar(); }
}
(async () => {
  if (!process.env.SBSES) { console.log('Falta SBSES'); process.exit(2); }
  try { await una(true); await una(false); } catch (e) { mal++; console.log('  MAL  ' + e.message); }
  console.log('\n' + ok + ' ok, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
