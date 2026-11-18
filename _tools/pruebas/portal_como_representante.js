/* MI PORTAL VISTO POR UN REPRESENTANTE, EN EL CELULAR (18/11/2026, auditoría de Mi Portal).

   SBSES=<sesión de prueba del representante> USU=marcos NOMBRE="Marcos Bottcher" \
     node _tools/pruebas/portal_como_representante.js [base=http://localhost:8090] [carpeta de capturas]

   La sesión se arma con `estancias/scripts/migraciones/sesion_prueba.py crear <archivo> marcos vendedor`
   (usuario temporal de Auth, solo lectura por la guarda de sbses_guarda.js: ninguna escritura sale).
   Abre el ERP a 390×844 con touch, entra al portal como ese representante y en cada tab (Hoy, Pedidos,
   Clientes, Plata › Caja y Plata › Pagos):
     · cuenta palabras y controles con la MISMA cuenta de texto.js (se lee de ese archivo, no se copia);
     · saca la captura de la primera pantalla (lo que ve en 5 segundos) y la de la página entera.
   Sirve para el antes y el después: la cuenta tiene que ser la misma en las dos. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8090';
const OUT = process.argv[3] || '';
const USU = process.env.USU || 'marcos', NOMBRE = process.env.NOMBRE || 'Marcos Bottcher';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const src = fs.readFileSync(path.join(__dirname, 'texto.js'), 'utf8');
const m = /const CONTAR = `([\s\S]*?)`;\r?\n/.exec(src);
if (!m) { console.log('no encontré CONTAR en texto.js'); process.exit(1); }
const CONTAR = eval('`' + m[1] + '`');

(async () => {
  if (!process.env.SBSES) { console.log('Falta SBSES'); process.exit(1); }
  process.env.PREP_SESION = JSON.stringify({ usuario: USU, rol: 'vendedor', nombre: NOMBRE, ts: Date.now(), tabs: ['miportal'] });
  const red = JSON.stringify({ ok: true, nombre: NOMBRE, usuario: USU, wa: '', aliasMp: '', comision: 17, barrios: [], partido: '', localidad: '' });
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  const res = [];
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, USU)
      + `;try{localStorage.setItem('maleu_red_session',${JSON.stringify(red)});}catch(e){}`
      + ';window.confirm=function(){return false;};window.alert=function(){};window.prompt=function(){return null;};' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 150; i++) { try { if (await ev(`typeof go==='function'&&typeof SESSION!=='undefined'&&!!SESSION`)) break; } catch (e) {} await pausa(200); }
    await pausa(3000);
    try { await ev(`go('miportal'); 1`); } catch (e) {}
    for (let i = 0; i < 120; i++) { try { if (await ev(`typeof setMainTab==='function'&&!!document.querySelector('#pg-miportal #mview-inicio')&&(document.querySelector('#pg-miportal #mview-inicio').innerText||'').length>80`)) break; } catch (e) {} await pausa(500); }
    await pausa(4000);
    const foto = async (nombre) => {
      if (!OUT) return;
      fs.mkdirSync(OUT, { recursive: true });
      const a = await cli.enviar('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, nombre + '-pantalla.png'), Buffer.from(a.data, 'base64'));
      const h = await ev(`Math.min(document.documentElement.scrollHeight, 9000)`);
      const b = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h, scale: 1 } });
      fs.writeFileSync(path.join(OUT, nombre + '-entera.png'), Buffer.from(b.data, 'base64'));
    };
    const PANT = [['hoy', `setMainTab('hoy')`], ['pedidos', `setMainTab('pedidos')`], ['clientes', `setMainTab('clientes')`],
      ['plata-caja', `setMainTab('plata');setPlataSub('caja')`], ['plata-pagos', `setMainTab('plata');setPlataSub('pagos')`]];
    for (const [n, js] of PANT) {
      try { await ev(js + '; window.scrollTo(0,0); 1'); } catch (e) { res.push({ donde: n, err: String(e.message) }); continue; }
      await pausa(3500);
      let c = null; for (let i = 0; i < 30; i++) { c = await ev(CONTAR); if (!c.carg) break; await pausa(500); }
      const extra = await ev(`(function(){var pg=document.querySelector('.pg.on');var t=(pg&&pg.innerText)||'';
        return {alto:document.documentElement.scrollHeight, pantallas:Math.round(document.documentElement.scrollHeight/844*10)/10,
          primera:t.replace(/\\s+/g,' ').slice(0,700)};})()`);
      res.push({ donde: n, ...c, ...extra });
      await foto(n);
    }
    const bloq = await ev('window.__bloqueados||[]');
    const err = await ev('window.__err||[]');
    console.log('pantalla'.padEnd(16) + 'palabras controles  pantallas de alto');
    res.forEach(r => console.log('  ' + r.donde.padEnd(14) + String(r.n).padStart(8) + String(r.ctrl || 0).padStart(10) + String(r.pantallas).padStart(11) + (r.carg ? '  (sin cargar)' : '')));
    console.log('  ' + 'TOTAL'.padEnd(14) + String(res.reduce((a, r) => a + (r.n || 0), 0)).padStart(8) + String(res.reduce((a, r) => a + (r.ctrl || 0), 0)).padStart(10));
    console.log('bloqueados (escrituras cortadas): ' + bloq.length + (bloq.length ? ' ' + JSON.stringify(bloq.slice(0, 5)) : ''));
    console.log('errores de consola: ' + err.length + (err.length ? ' ' + JSON.stringify(err.slice(0, 5)) : ''));
    if (OUT) fs.writeFileSync(path.join(OUT, 'cuenta.json'), JSON.stringify(res, null, 1));
  } finally { cli.matar ? cli.matar() : cli.cerrar(); }
})().catch(e => { console.error(e); process.exit(1); });
