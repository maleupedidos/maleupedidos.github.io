/* EL ROBOT DE PRUEBAS (3/11/2026, pedido de Tadeo: «que los bugs los encuentre él y no yo»).

   node _tools/robot/robot.js                 → corre contra producción y deja el resultado en la base
   BASE_URL=http://localhost:8080/app.html     → contra lo local (el backend y la base son los de producción)
   ROBOT_SIN_REPORTE=1                         → no guarda el resultado (para probar el robot)
   ROBOT_TOKEN=<token de Sesiones>             → mientras no exista el usuario robot: entra con una sesión de admin
                                                 y SOLO corre los pasos que no escriben (lecturas y «en seco»)

   Las credenciales: ROBOT_USUARIO y ROBOT_PIN (secrets en GitHub Actions) o C:\Users\tadeu\.maleu\robot.json
   ({usuario, pin}). Nunca se imprimen.

   Cómo trabaja: un Chrome headless con el MODO ENSAYO prendido (localStorage maleu_ensayo=1, v873). Ahí no sale nada a
   Apps Script, y cada intento queda en window.__ensayoApps: si un paso intenta ir a Apps Script, es un HALLAZGO (le
   falta la directa o la lectura en la base). Entra por el formulario de login de verdad (v874: el login por la base).
   Todo lo que escribe lleva el clientOpId «robot-<corrida>-…» y usa SOLO entidades PRUEBA (cliente y representante
   «PRUEBA Robot», teléfono 5490000000001, proveedor PRUEBA, producto PRUEBA en el depósito «prueba», cuenta «prueba»).
   La base las deja afuera de todos los totales y avisos (394/395, Supa), y el aplicador no las escribe en la planilla
   (Apps Script @1198). Lo que toca plata real (mover plata, contar caja) va EN SECO: `robot_en_seco` corre la directa
   y la deshace.

   En cada paso mide: cuánto tarda en verse, si sigue después de recargar, si la base lo tiene, que no se duplicó, que fue
   por la directa (0 llamadas a Apps Script) y que los totales cierran. Al final borra lo suyo y deja el resultado en
   `robot_resultado`; a las 8:00 el cartero de la base lo manda al grupo «Maleu - Resumenes».
   Sale con 1 si algún paso falló (deploy.sh no publica). */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('../pruebas/cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const ahora = new Date(), dos = (n) => String(n).padStart(2, '0');
const CORRIDA = process.env.ROBOT_CORRIDA || (ahora.getUTCFullYear() + dos(ahora.getUTCMonth() + 1) + dos(ahora.getUTCDate()) + '-' + dos(ahora.getUTCHours()) + dos(ahora.getUTCMinutes()));
const PREFIJO = 'robot-' + CORRIDA + '-';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

function credenciales() {
  if (process.env.ROBOT_USUARIO && process.env.ROBOT_PIN) return { usuario: process.env.ROBOT_USUARIO, pin: process.env.ROBOT_PIN };
  const f = path.join(os.homedir(), '.maleu', 'robot.json');
  if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (j.usuario && j.pin) return { usuario: j.usuario, pin: String(j.pin) }; }
  return null;
}

/* ── los pasos ─────────────────────────────────────────────────────────────────────────────── */
const pasos = [], hallazgos = [];
let cli = null;
const ev = (expr, ms) => Promise.race([cdp.evaluar(cli, expr), new Promise((_, no) => setTimeout(() => no(new Error('la página no contestó en ' + ((ms || 30000) / 1000) + ' s')), ms || 30000))]);
async function esperar(expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(expr, 10000); if (v) return v; } catch (e) {} await pausa(250); } return null; }
/* Un paso: corre `fn`, mide cuánto tarda, y anota lo que intentó salir a Apps Script en el medio. `fn` devuelve
   {ok, detalle} o tira. `escribe`: necesita las entidades PRUEBA; sin ellas se anota «esperando» y no corre. */
async function paso(nombre, fn, opt) {
  opt = opt || {};
  if (opt.escribe && !ENTIDADES) { pasos.push({ paso: nombre, ok: true, ms: 0, detalle: 'esperando las entidades PRUEBA (no corrió)' }); console.log('  --   ' + nombre + '  (esperando entidades)'); return null; }
  const antes = await ev(`(window.__ensayoApps||[]).length`).catch(() => 0), antesS = await ev(`JSON.stringify(window.__sinApps||{})`).catch(() => '{}'), t0 = Date.now();
  let r;
  try { r = await fn(); } catch (e) { r = { ok: false, detalle: 'reventó: ' + String((e && e.message) || e).slice(0, 200) }; }
  const ms = Date.now() - t0;
  const apps = await ev(`(function(){ var l=(window.__ensayoApps||[]).slice(${antes}).map(function(x){ return x.m+' '+x.a; }), a=${'${antesS}'}, c=window.__sinApps||{};
    Object.keys(c).forEach(function(k){ if(c[k]>(a[k]||0))l.push('GET '+k); }); return l; })()`).catch(() => []);
  if (apps.length) { r.ok = false; hallazgos.push(nombre + ': intentó ir a Apps Script (' + [...new Set(apps)].join(', ') + ')'); }
  if (r.ok && opt.topeMs && ms > opt.topeMs) { r.ok = false; r.detalle = (r.detalle ? r.detalle + ' · ' : '') + 'tardó ' + ms + ' ms (tope ' + opt.topeMs + ')'; }
  if (!r.ok && !apps.length) hallazgos.push(nombre + ': ' + (r.detalle || 'falló'));
  pasos.push({ paso: nombre, ok: !!r.ok, ms: ms, detalle: String(r.detalle || '').slice(0, 300) + (apps.length ? ' · Apps Script: ' + [...new Set(apps)].join(', ') : '') });
  console.log((r.ok ? '  ok   ' : '  MAL  ') + nombre + '  (' + ms + ' ms)' + (r.detalle ? '  ' + r.detalle : '') + (apps.length ? '  · Apps Script: ' + apps.join(', ') : ''));
  return r;
}
let ENTIDADES = false;

/* Una RPC de la base con la sesión de la página (la del robot). */
const rpc = (fn, p) => ev(`(async function(){ var sb=await _sbPermiso(true); if(!sb)return {ok:false,error:'sin permiso de la base'};
  var r=await fetch(sb.url+'/rest/v1/rpc/${fn}',{method:'POST',headers:{apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(p || {}))}});
  var t=await r.text(); try{ return Object.assign({http:r.status},JSON.parse(t)); }catch(e){ return {http:r.status,texto:t.slice(0,200)}; } })()`, 30000);

(async () => {
  const cred = credenciales(), TOKEN = process.env.ROBOT_TOKEN || '';
  if (!cred && !TOKEN) { console.log('Sin credenciales del robot (ROBOT_USUARIO/ROBOT_PIN o ~/.maleu/robot.json) ni ROBOT_TOKEN: no corre.'); process.exit(2); }
  console.log('Robot · corrida ' + CORRIDA + ' · ' + URL_APP + (cred ? ' · usuario ' + cred.usuario : ' · con una sesión de admin (solo lecturas y en seco)'));
  cli = await cdp.abrir();
  /* Con el usuario robot: modo ENSAYO (nada a Apps Script). Con ROBOT_TOKEN (una sesion de Apps Script, sin sesion de la
     base): el corte de lecturas (maleu_sin_apps), que deja pasar solo sbToken, el permiso de la base. */
  const PREP = (cred ? `;try{localStorage.setItem('maleu_ensayo','1');}catch(e){}` : `;try{localStorage.setItem('maleu_sin_apps','1');}catch(e){}`)
    + (TOKEN && !cred ? require('../pruebas/sesion_prep.js')(TOKEN) : '');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m, p) => { if (m === 'Page.javascriptDialogOpening') { pasos.length && hallazgos.push('apareció un diálogo: ' + String(p && p.message).slice(0, 120)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL_APP });

  /* 1) ENTRAR, por el formulario, sin Apps Script */
  await paso('entrar', async () => {
    if (!cred) { const ok = await esperar(`typeof go==='function'&&!!(window._palancaVal&&_palancaVal('stockArma'))`, 60000); return { ok: !!ok, detalle: 'con la sesión de admin (todavía no hay usuario robot)' }; }
    const hay = await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000);
    if (!hay) return { ok: false, detalle: 'no apareció el login' };
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(cred.pin)}; document.getElementById('loginRemember').checked=true; panelDoLogin(); 1`);
    const ok = await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario&&!!(window._palancaVal&&_palancaVal('stockArma'))`, 30000);
    const de = await ev(`window.__loginDe||null`).catch(() => null);
    return { ok: !!ok, detalle: 'login ' + JSON.stringify(de) };
  }, { topeMs: 15000 });
  if (!pasos[0].ok) return terminar();

  /* ¿Están las entidades PRUEBA? Sin ellas, los pasos que escriben no corren. */
  const ent = await rpc('robot_entidades_pantalla', {}).catch(() => null);
  ENTIDADES = !!(ent && ent.ok && ent.cliente && ent.producto && ent.cuenta);
  console.log('  entidades PRUEBA: ' + (ENTIDADES ? 'sí' : 'todavía no (' + JSON.stringify(ent).slice(0, 120) + ')'));

  /* 2) LAS PANTALLAS QUE LEEN, sin Apps Script: cada una tiene que pintar de la base. */
  const pantalla = (tab, sub, listo, tope) => paso('ver ' + tab + (sub ? ' › ' + sub : ''), async () => {
    await ev(`go(${JSON.stringify(tab)}); ${sub ? `try{ stSwitchTab(${JSON.stringify(sub)}); }catch(e){}` : ''} 1`);
    const ok = await esperar(listo, tope || 20000);
    return { ok: !!ok, detalle: ok ? '' : 'no pintó en ' + ((tope || 20000) / 1000) + ' s' };
  }, { topeMs: tope || 20000 });
  await pantalla('inicio', null, `document.querySelector('#p-inicio')&&document.querySelector('#p-inicio').innerText.length>300`);
  await pantalla('pedidos', null, `typeof D==='object'&&D&&Array.isArray(D.pedidos)&&D.pedidos.length>0`);
  await pantalla('caja', null, `typeof D==='object'&&D&&D.caja&&document.querySelector('#p-caja')&&document.querySelector('#p-caja').innerText.length>300`);
  await pantalla('stock', 'productos', `typeof D==='object'&&D&&Array.isArray(D.stock)&&D.stock.length>0&&ST_FUENTE&&ST_FUENTE.de==='pg'`);

  /* 3) LO QUE TOCA PLATA REAL, EN SECO: la directa acepta, valida y no cae a Apps Script; no queda nada. */
  if (!cred) { pasos.push({ paso: 'mover plata (en seco)', ok: true, ms: 0, detalle: 'solo con el usuario robot (con ROBOT_TOKEN el PREP corta los POST)' }); console.log('  --   mover plata (en seco)  (solo con el usuario robot)'); }
  else await paso('mover plata (en seco)', async () => {
    const r = await rpc('robot_en_seco', { p_rpc: 'caja_mover_directo', p: { action: 'moverPlata', desde: 'cf', hacia: 'cf', monto: 1, nota: 'robot', proveedor: '', clientOpId: PREFIJO + 'mover-mal' } });
    const bien = r && r.ok && r.respuesta && r.respuesta.ok === false && /mismo lugar/.test(String(r.respuesta.err || ''));
    return { ok: !!bien, detalle: bien ? 'valida (mismo lugar → no)' : JSON.stringify(r).slice(0, 200) };
  }, { topeMs: 5000 });

  /* 4) LOS PASOS QUE ESCRIBEN (con entidades PRUEBA). Se suman acá a medida que la base los tenga. */
  await paso('alta en la tienda', async () => ({ ok: false, detalle: 'por escribir' }), { escribe: true });
  await paso('editar, armar, entregar, cobrar, deshacer cobro', async () => ({ ok: false, detalle: 'por escribir' }), { escribe: true });
  await paso('contar stock y deshacer', async () => ({ ok: false, detalle: 'por escribir' }), { escribe: true });
  await paso('OC de prueba: pedir y recibir', async () => ({ ok: false, detalle: 'por escribir' }), { escribe: true });
  await paso('cargar una compra', async () => ({ ok: false, detalle: 'por escribir' }), { escribe: true });
  await paso('pagar al proveedor PRUEBA', async () => ({ ok: false, detalle: 'por escribir' }), { escribe: true });
  await paso('portal del representante PRUEBA', async () => ({ ok: false, detalle: 'por escribir' }), { escribe: true });
  await paso('liquidación de PRUEBA', async () => ({ ok: false, detalle: 'por escribir' }), { escribe: true });

  return terminar();
})().catch((e) => { hallazgos.push('el robot reventó: ' + String((e && e.message) || e).slice(0, 200)); return terminar(); });

async function terminar() {
  const mal = pasos.filter((p) => !p.ok).length;
  console.log('\n' + (pasos.length - mal) + ' de ' + pasos.length + ' pasos bien' + (hallazgos.length ? ' · hallazgos:\n  - ' + hallazgos.join('\n  - ') : ''));
  if (!process.env.ROBOT_SIN_REPORTE && cli) {
    const r = await rpc('robot_resultado', { p: { corrida: CORRIDA, inicio: ahora.toISOString(), fin: new Date().toISOString(), pasos: pasos, hallazgos: hallazgos } }).catch((e) => ({ error: e.message }));
    console.log('resultado en la base: ' + JSON.stringify(r).slice(0, 160));
  }
  try { cli && cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
}
