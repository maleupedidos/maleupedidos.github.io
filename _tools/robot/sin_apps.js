/* EL RECORRIDO SIN APPS SCRIPT (4/11/2026, pedido de Tadeo vía el Organizador: «el ERP no puede leer ni escribir nada
   por Apps Script»). Abre el ERP con el usuario robot, en MODO ENSAYO (nada sale a Apps Script y cada intento queda en
   window.__ensayoApps) y además con script.google.com y googleusercontent CORTADOS en la red, como el 4/11 sin cuota.
   Pasa por todas las tabs y sub-tabs de su rol y anota, por pantalla:
     · las acciones que intentaron ir a Apps Script (GET = lectura, POST = escritura);
     · si quedó un cartel de error («No se pudo», «Sin conexión»…).
   No escribe nada: solo navega y lee.

   node _tools/robot/sin_apps.js            → contra producción (app.maleu.com.ar)
   BASE_URL=http://localhost:8080/app.html  → contra lo local
   SIN_APPS_ROL=rep                         → con el representante PRUEBA en vez del usuario robot
   Sale con 1 si alguna pantalla intentó ir a Apps Script. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('../pruebas/cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

function credenciales() {
  let c = null;
  if (process.env.ROBOT_USUARIO && process.env.ROBOT_PIN) c = { usuario: process.env.ROBOT_USUARIO, pin: process.env.ROBOT_PIN, repUsuario: process.env.ROBOT_REP_USUARIO || 'pruebarobot', repPin: process.env.ROBOT_PIN_REP || '' };
  else {
    const f = path.join(os.homedir(), '.maleu', 'robot.json');
    if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); c = { usuario: j.usuario, pin: String(j.pin), repUsuario: j.repUsuario || 'pruebarobot', repPin: j.pinRep ? String(j.pinRep) : '' }; }
  }
  if (c && process.env.SIN_APPS_ROL === 'rep') return { usuario: c.repUsuario, pin: c.repPin };
  return c;
}

/* Las pantallas: [tab, función de sub-tab, [sub-tabs]]. Las que el rol no ve se saltean solas. */
const PANTALLAS = [
  ['ruta', 'switchTab', ['armado', 'ruta', 'cobros', 'nuevo']],
  ['mireparto', null, []],
  ['pedidoshome', null, []],
  ['inicio', null, []],
  ['pedidos', null, []],
  ['caja', null, []],
  ['egresos', null, []],
  ['catering', null, []],
  ['stock', 'stSwitchTab', ['productos', 'contar', 'mover', 'carga', 'carne', 'catalogo']],
  ['ventas', 'vSwitchTab', ['ventas', 'cobros', 'productos', 'red', 'tendencia', 'comparar']],
  ['resumen', null, []],
  ['evolucion', null, []],
  ['planificacion', null, []],
  ['estancias', 'estSwitch', ['hoy', 'semana', 'pulso', 'clientes', 'hogares', 'barrios', 'mapa', 'segmentos', 'leads', 'jugadas', 'recorrida']],
  ['miportal', 'setMainTab', ['hoy', 'pedidos', 'clientes', 'plata']],
  ['busqueda', 'abaSwitchTab', ['resumen', 'pedidos', 'proveedores', 'costos', 'pagos', 'nuevo']],
  ['proveedores', null, []],
  /* Ajustes no: el robot no la ve a propósito (usuarios y PIN). La cubre el paso «ajustes en la base» del robot (437). */
];
const ERROR_RE = /No se pudo|Sin conexi[oó]n|fijate la conexi[oó]n|Error al cargar|no responde/i;

(async () => {
  const cred = credenciales();
  if (!cred || !cred.pin) { console.log('Sin credenciales del robot (~/.maleu/robot.json): no corre.'); process.exit(2); }
  const cli = await cdp.abrir();
  const ev = (expr, ms) => Promise.race([cdp.evaluar(cli, expr), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 30000))]);
  const esperar = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(expr, 10000); if (v) return v; } catch (e) {} await pausa(250); } return null; };
  /* El corte de red: lo que vaya a Google Apps Script no sale (y se cuenta, por si algo esquiva el modo ensayo). */
  const cortadas = [];
  await cli.enviar('Fetch.enable', { patterns: [{ urlPattern: '*script.google.com*' }, { urlPattern: '*script.googleusercontent.com*' }] });
  cli.escuchar((m, p) => {
    if (m === 'Fetch.requestPaused') { cortadas.push(String(p.request.url).replace(/token=[^&]*/, 'token=…').slice(0, 160)); cli.enviar('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }).catch(() => {}); }
    if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.removeItem('maleu_ensayo');}catch(e){}` });
  await cli.enviar('Page.enable', {});
  await cli.enviar('Page.navigate', { url: URL_APP });
  const hay = await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000);
  if (!hay) { console.log('no apareció el login'); process.exit(1); }
  await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(cred.pin)}; document.getElementById('loginRemember').checked=true; panelDoLogin(); 1`);
  const ok = await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario`, 30000);
  if (!ok) { console.log('no entró'); process.exit(1); }
  if (cortadas.length) { console.log('MAL: el login normal intentó llamar a Apps Script'); cli.matar(); process.exit(1); }
  await ev(`localStorage.setItem('maleu_ensayo','1'); 1`);
  const rol = await ev(`SESSION.rol||''`);
  console.log('Sin Apps Script · ' + URL_APP + ' · rol ' + rol);
  await pausa(8000);
  const filas = [];
  const mirar = async (nombre, accion) => {
    const antes = await ev(`(window.__ensayoApps||[]).length`).catch(() => 0), nc = cortadas.length;
    try { await ev(accion + '; 1', 15000); } catch (e) {}
    await pausa(7000);
    const apps = await ev(`(window.__ensayoApps||[]).slice(${antes}).map(function(x){return x.m+' '+x.a;})`).catch(() => []);
    const err = await ev(`(function(){ var t=''; document.querySelectorAll('.pg.on, .pg.active, .pg[style*="block"]').forEach(function(p){ t+=p.innerText; });
      if(!t){ var c=document.querySelector('#p-${nombre.split(' ')[0]}'); t=c?c.innerText:''; } var m=t.match(${ERROR_RE}); return m?t.slice(Math.max(0,m.index-40),m.index+80).replace(/\\s+/g,' '):''; })()`).catch(() => '');
    const red = cortadas.slice(nc);
    const u = [...new Set(apps.concat(red.map((x) => 'RED ' + (x.match(/action=([a-zA-Z]+)/) || [, x])[1])))];
    filas.push({ pantalla: nombre, apps: u, error: err });
    console.log((u.length || err ? '  MAL  ' : '  ok   ') + nombre + (u.length ? '  → Apps Script: ' + u.join(', ') : '') + (err ? '  · cartel: «' + err.trim() + '»' : ''));
  };
  for (const [tab, fn, subs] of PANTALLAS) {
    if (!(await ev(`!!document.getElementById('p-${tab}')`).catch(() => false))) continue;
    await mirar(tab, `go(${JSON.stringify(tab)})`);
    /* La que el rol no ve no se abre: go() la deja oculta. */
    if (!(await ev(`(function(){ var p=document.getElementById('p-${tab}'); return !!(p&&p.offsetParent!==null); })()`).catch(() => false))) { filas.pop(); console.log('  --   ' + tab + '  (este rol no la ve)'); continue; }
    for (const s of subs) await mirar(tab + ' › ' + s, `if(typeof ${fn}==='function')${fn}(${JSON.stringify(s)})`);
  }
  const malas = filas.filter((f) => f.apps.length || f.error);
  console.log('\n' + (filas.length - malas.length) + ' de ' + filas.length + ' pantallas sin Apps Script');
  const acc = {};
  filas.forEach((f) => f.apps.forEach((a) => { (acc[a] = acc[a] || []).push(f.pantalla); }));
  console.log('Acciones que todavía van a Apps Script:');
  Object.keys(acc).sort().forEach((a) => console.log('  ' + a + '  ←  ' + [...new Set(acc[a])].join(', ')));
  /* (5/11/2026, Organizador) erp_screen_snapshot (las fotos de Apps Script) no lo lee NINGUNA pantalla: el ERP corta esa
     lectura en su fetch y anota en window.__fotoApps quién lo intentó. */
  const fotos = JSON.parse(await ev(`JSON.stringify(window.__fotoApps||[])`).catch(() => '[]'));
  console.log(fotos.length ? 'Pantallas que intentaron leer la foto de Apps Script: ' + [...new Set(fotos)].join(', ') : 'Ninguna pantalla intentó leer la foto de Apps Script');
  if (fotos.length) malas.push({ pantalla: 'fotos de Apps Script', apps: [], error: [...new Set(fotos)].join(', ') });
  if (process.env.SIN_APPS_JSON) fs.writeFileSync(process.env.SIN_APPS_JSON, JSON.stringify({ rol, filas, acciones: acc }, null, 1));
  try { cli.matar(); } catch (e) {}
  process.exit(malas.length ? 1 : 0);
})().catch((e) => { console.log('reventó: ' + (e && e.message)); process.exit(1); });
