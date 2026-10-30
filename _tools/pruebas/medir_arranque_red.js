/* QUÉ PIDE EL ARRANQUE, EN QUÉ ORDEN Y CUÁNTO TARDA CADA COSA (30/10/2026).
     node _tools/pruebas/medir_arranque_red.js <token> [--celu] [--url http://localhost:8163/app.html]
   Tadeo: «arrancar la app tarda 60 a 80 s hasta tener los datos». Sesión real con sesion_prep (los POST que escriben
   quedan cortados; las lecturas `_pantalla|_datos|_base` de la base pasan). Abre la app DOS veces con el mismo perfil:
   en frío (sin copia) y en tibio (con la copia guardada: lo que pasa al cerrar y abrir la app). Por cada vuelta:
     · los hitos: sin splash, la tab con contenido, D con pedidos, el permiso de la base (`_sbPerm`), y «usable» = sin
       splash + contenido + 400 ms sin tareas largas;
     · cada pedido de red: a quién (Apps Script con su action, la base con su rpc/tabla), cuándo arrancó, cuánto tardó y
       quién lo pidió (la función de arriba de la pila). Lo que arranca tarde porque esperó a otro se ve en la columna «arranca».
   --celu: CPU x4 y 4G como medir_rapidez. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const args = process.argv.slice(2), TOKEN = args[0];
const CELU = args.includes('--celu');
const URL = args.includes('--url') ? args[args.indexOf('--url') + 1] : (process.env.BASE_URL || 'https://app.maleu.com.ar/app.html');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const OBS = `;window.__lt=[];try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){__lt.push(e.startTime+e.duration)})}).observe({type:'longtask'})}catch(e){}`;
const HITOS = `(function(){var b=document.getElementById('boot');var c=(typeof cur==='string')?cur:'';var pg=c?document.getElementById('p-'+c):null;
  return {t:performance.now(), sinSplash:!b||document.documentElement.classList.contains('listo')||getComputedStyle(b).display==='none', tab:c,
    contenido:!!(pg&&pg.innerText&&pg.innerText.replace(/\\s+/g,' ').length>300),
    pedidos:!!(window.D&&Array.isArray(D.pedidos)&&D.pedidos.length>0), perm:!!window._sbPerm,
    quieto:performance.now()-(__lt.length?Math.max.apply(null,__lt):0)}})()`;

function nombre(u, m) {
  let x;
  if (/script\.google(usercontent)?\.com/.test(u)) { x = (u.match(/[?&]action=([A-Za-z_]+)/) || [])[1]; return 'Apps ' + (m === 'POST' ? 'POST' : 'GET') + ' ' + (x || '(sin action)'); }
  if ((x = u.match(/\/rest\/v1\/rpc\/([a-z0-9_]+)/))) return 'base rpc ' + x[1];
  if ((x = u.match(/\/rest\/v1\/([a-z0-9_]+)/))) return 'base tabla ' + x[1];
  if (/supabase\.co\/realtime/.test(u)) return 'base en vivo (ws)';
  if (/supabase\.co\/auth/.test(u)) return 'base auth';
  return null;   /* html, js, css, fuentes, imagenes: no son datos */
}

async function vuelta(cli, titulo) {
  const red = new Map();
  let t0 = null;
  cli.escuchar((m, p) => {
    if (!p) return;
    if (m === 'Network.requestWillBeSent') {
      const n = nombre(p.request.url, p.request.method); if (!n) return;
      const st = p.initiator && p.initiator.stack;
      const fr = st && (st.callFrames || []).find((f) => f.functionName && !/^(fetch|window\.fetch|o|_pedir)$/.test(f.functionName));
      red.set(p.requestId, { n, ini: p.timestamp, fin: null, quien: fr ? fr.functionName : '', ok: null, kb: 0 });
    } else if (m === 'Network.responseReceived' && red.has(p.requestId)) {
      red.get(p.requestId).ok = p.response.status;
    } else if (m === 'Network.loadingFinished' && red.has(p.requestId)) {
      const r = red.get(p.requestId); r.fin = p.timestamp; r.kb = Math.round((p.encodedDataLength || 0) / 1024);
    } else if (m === 'Network.loadingFailed' && red.has(p.requestId)) {
      const r = red.get(p.requestId); r.fin = p.timestamp; r.ok = 'falló';
    } else if (m === 'Page.frameStartedLoading' && t0 === null) {
      t0 = Date.now();
    }
  });
  const tNav = Date.now(); let navTs = null;
  cli.escuchar((m, p) => { if (m === 'Network.requestWillBeSent' && navTs === null && p && p.type === 'Document') navTs = p.timestamp; });
  await cli.enviar('Page.navigate', { url: URL });
  const hit = {};
  const marcar = (k, ms) => { if (hit[k] === undefined) hit[k] = ms; };
  let ult = null;
  while (Date.now() - tNav < 120000) {
    await pausa(100);
    let h; try { h = await cdp.evaluar(cli, HITOS); } catch (e) { continue; }
    if (!h) continue;
    const ms = Date.now() - tNav;
    if (h.sinSplash) marcar('sin splash', ms);
    if (h.contenido) marcar('la tab (' + h.tab + ') con contenido', ms);
    if (h.pedidos) marcar('D con pedidos', ms);
    if (h.perm) marcar('permiso de la base', ms);
    if (h.sinSplash && h.contenido && h.quieto > 400) marcar('USABLE (contenido + 400 ms sin trabarse)', ms);
    ult = h;
    if (h.pedidos && h.perm && h.sinSplash && h.contenido && h.quieto > 3000) break;
  }
  await pausa(2000);
  console.log('\n══ ' + titulo + ' ══');
  Object.entries(hit).sort((a, b) => a[1] - b[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(6) + ' ms  ' + k));
  ['sin splash', 'D con pedidos', 'permiso de la base'].forEach((k) => { if (hit[k] === undefined) console.log('  NUNCA (120 s)  ' + k); });
  const base = navTs || Math.min(...[...red.values()].map((r) => r.ini));
  const filas = [...red.values()].sort((a, b) => a.ini - b.ini);
  console.log('  ' + 'arranca'.padStart(7) + ' ' + 'tarda'.padStart(7) + '  ' + 'termina'.padStart(7) + '  estado  KB    pedido  ←  quién');
  filas.forEach((r) => {
    const a = Math.round((r.ini - base) * 1000), d = r.fin ? Math.round((r.fin - r.ini) * 1000) : null;
    console.log('  ' + String(a).padStart(7) + ' ' + (d === null ? '  (sin fin)' : String(d).padStart(7)) + '  ' + (d === null ? '' : String(a + d).padStart(7)) + '  ' + String(r.ok).padEnd(6) + ' ' + String(r.kb).padStart(4) + '  ' + r.n + (r.quien ? '  ←  ' + r.quien : ''));
  });
  return { hit, filas };
}

(async () => {
  if (!TOKEN) { console.error('Falta el token'); process.exit(1); }
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Network.enable', {});
    cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + OBS });
    await cli.enviar('Emulation.setDeviceMetricsOverride', CELU ? { width: 390, height: 844, deviceScaleFactor: 3, mobile: true } : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    if (CELU) {
      await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cli.enviar('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 });
    }
    console.log('URL ' + URL + (CELU ? ' · celu (CPU x4, 4G)' : ' · escritorio'));
    await vuelta(cli, 'EN FRÍO (sin copia guardada)');
    await vuelta(cli, 'EN TIBIO (con la copia guardada: cerrar y abrir la app)');
  } finally { cli.matar(); }
})().catch((e) => { console.error(e); process.exit(1); });
