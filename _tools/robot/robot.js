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
/* ROBOT_LOCAL=1 (deploy.sh, 4/11/2026): levanta su propio servidor con el app.html recién armado y prueba ESO, lo que se
   va a publicar. El backend y la base siguen siendo los de producción. */
let URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html', SERVIDOR = null;
async function servirLocal() {
  const puerto = 8300 + Math.floor(Math.random() * 600);
  SERVIDOR = require('child_process').spawn(process.execPath, [path.join(__dirname, '..', 'servir.js'), String(puerto)], { stdio: 'ignore' });
  URL_APP = 'http://localhost:' + puerto + '/app.html';
  for (let i = 0; i < 80; i++) { try { const r = await fetch(URL_APP); if (r.ok) return; } catch (e) {} await pausa(250); }
  throw new Error('el servidor local no arrancó');
}
const ahora = new Date(), dos = (n) => String(n).padStart(2, '0');
const CORRIDA = process.env.ROBOT_CORRIDA || (ahora.getUTCFullYear() + dos(ahora.getUTCMonth() + 1) + dos(ahora.getUTCDate()) + '-' + dos(ahora.getUTCHours()) + dos(ahora.getUTCMinutes()) + dos(ahora.getUTCSeconds()));   /* (4/11) con segundos: dos corridas en el mismo minuto compartian id y la segunda recibia los pedidos ya borrados de la primera */
const PREFIJO = 'robot-' + CORRIDA + '-';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

function credenciales() {
  /* repUsuario/repPin: el representante «PRUEBA Robot» (ROBOT_REP_USUARIO y ROBOT_PIN_REP en Actions; pinRep en el archivo). */
  if (process.env.ROBOT_USUARIO && process.env.ROBOT_PIN) return { usuario: process.env.ROBOT_USUARIO, pin: process.env.ROBOT_PIN, repUsuario: process.env.ROBOT_REP_USUARIO || 'pruebarobot', repPin: process.env.ROBOT_PIN_REP || '' };
  const f = path.join(os.homedir(), '.maleu', 'robot.json');
  if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (j.usuario && j.pin) return { usuario: j.usuario, pin: String(j.pin), repUsuario: j.repUsuario || 'pruebarobot', repPin: j.pinRep ? String(j.pinRep) : '' }; }
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
  /* ROBOT_SOLO_LECTURA=1 (los deploy.sh, 4/11/2026): los pasos que escriben quedan para el nocturno hasta que den verde
     completo; si no, una falla del robot recién estrenado frenaría cualquier arreglo urgente. */
  if (opt.escribe && process.env.ROBOT_SOLO_LECTURA) { pasos.push({ paso: nombre, ok: true, salteado: true, ms: 0, detalle: 'en el deploy solo lecturas (corre de noche)' }); console.log('  --   ' + nombre + '  (solo lecturas en el deploy)'); return null; }
  if (opt.escribe && !ENTIDADES) { pasos.push({ paso: nombre, ok: true, salteado: true, ms: 0, detalle: 'esperando las entidades PRUEBA (no corrió)' }); console.log('  --   ' + nombre + '  (esperando entidades)'); return null; }
  const antes = await ev(`(window.__ensayoApps||[]).length`).catch(() => 0), antesS = await ev(`JSON.stringify(window.__sinApps||{})`).catch(() => '{}'), t0 = Date.now();
  let r;
  try { r = await fn(); } catch (e) { r = { ok: false, detalle: 'reventó: ' + String((e && e.message) || e).slice(0, 200) }; }
  const ms = Date.now() - t0;
  const apps = await ev(`(function(){ var l=(window.__ensayoApps||[]).slice(${antes}).map(function(x){ return x.m+' '+x.a; }), a=${'${antesS}'}, c=window.__sinApps||{};
    Object.keys(c).forEach(function(k){ if(c[k]>(a[k]||0))l.push('GET '+k); }); return l; })()`).catch(() => []);
  if (apps.length) { r.ok = false; hallazgos.push(nombre + ': intentó ir a Apps Script (' + [...new Set(apps)].join(', ') + ')'); }
  if (r.ok && opt.topeMs && ms > opt.topeMs) { r.ok = false; r.detalle = (r.detalle ? r.detalle + ' · ' : '') + 'tardó ' + ms + ' ms (tope ' + opt.topeMs + ')'; }
  if (!r.ok && !apps.length) hallazgos.push(nombre + ': ' + (r.detalle || 'falló'));
  pasos.push({ paso: nombre, ok: !!r.ok, ms: ms, salteado: r.salteado || undefined, detalle: String(r.detalle || '').slice(0, 300) + (apps.length ? ' · Apps Script: ' + [...new Set(apps)].join(', ') : '') });
  console.log((r.ok ? '  ok   ' : '  MAL  ') + nombre + '  (' + ms + ' ms)' + (r.detalle ? '  ' + r.detalle : '') + (apps.length ? '  · Apps Script: ' + apps.join(', ') : ''));
  return r;
}
let ENTIDADES = false;
/* Números que se siguen corrida a corrida (van en robot_resultado.metricas): la espera de «se está acomodando» entre dos
   movimientos de stock del mismo producto (4/11/2026: 30-90 s por el aplicador; tiene que bajar con el Kardex paso c). */
const METRICAS = {};
/* EL PROGRAMADO DE GITHUB LLEGA CUANDO QUIERE (4/11/2026): el de las 3:30 arrancó a las 11:46, en plena operación, y su
   limpieza (que barre lo PRUEBA por cliente y teléfono) se llevó las 24 altas que Supa estaba midiendo. Un disparo
   `schedule` fuera de la madrugada (1 a 8 h de Argentina) no corre: sale en 0 diciendo por qué. A mano (workflow_dispatch)
   y desde los deploy corre siempre. */
if (process.env.GITHUB_EVENT_NAME === 'schedule') {
  const _h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hour12: false }));
  if (!(_h >= 1 && _h < 8)) { console.log('programado fuera de la madrugada (' + _h + ' h de Argentina): no corre. GitHub lo largó tarde.'); process.exit(0); }
}
const CRED = credenciales();

/* Una RPC de la base con la sesión de la página (la del robot). */
const rpc = (fn, p) => ev(`(async function(){ var sb=await _sbPermiso(true); if(!sb)return {ok:false,error:'sin permiso de la base'};
  var r=await fetch(sb.url+'/rest/v1/rpc/${fn}',{method:'POST',headers:{apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(p || {}))}});
  var t=await r.text(); try{ return Object.assign({http:r.status},JSON.parse(t)); }catch(e){ return {http:r.status,texto:t.slice(0,200)}; } })()`, 30000);

(async () => {
  const cred = CRED, TOKEN = process.env.ROBOT_TOKEN || '';
  if (!cred && !TOKEN) { console.log('Sin credenciales del robot (ROBOT_USUARIO/ROBOT_PIN o ~/.maleu/robot.json) ni ROBOT_TOKEN: no corre.'); process.exit(2); }
  /* EL CUPO DE URLFETCH (4/11/2026): el robot no va a Apps Script, pero sus órdenes las procesa el aplicador, y el 4/11 la
     cuota del día se agotó con un pedido real esperando. Pasado el tope de las pruebas (UF_TOPE_PRUEBAS) no corre: sale
     en 0 diciendo por qué. Preguntarlo no gasta UrlFetch. Si no contesta, corre igual. */
  try {
    const cp = await (await fetch('https://script.google.com/macros/s/AKfycbxmrG5YVSshcYezk8lXFx_uxb7NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec?action=cupoPruebas', { signal: AbortSignal.timeout(20000) })).json();
    /* (4/11/2026, 17:45, Organizador) El robot va en MODO ENSAYO: no llama a Apps Script. Lo único que le cuesta a la cuota
       es que el aplicador marque sus órdenes (una llamada cada una, desde @1210 también las borradas). El freno queda
       del lado del servidor para lo que sí gasta (el alta en seco); acá se avisa y se corre. */
    if (cp && cp.frenado) console.log('Cupo de UrlFetch del día: ' + cp.total + ' de un tope de ' + cp.tope + '. El robot corre igual (ensayo, sin Apps Script); el seco sigue frenado.');
  } catch (eCp) {}
  if (process.env.ROBOT_LOCAL) await servirLocal();
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
  /* EL EFECTIVO REAL NO SE MUEVE (4/11/2026, Organizador; Supa 441). Se mide la caja como la ve Tadeo (sin lo PRUEBA) al
     entrar y al terminar: tiene que dar igual. Si cambió por un movimiento real en el medio (`ult_real`, cuando la base
     lo mande, posterior al arranque), no se puede comparar y se dice. */
  const EFECTIVO_ANTES = await rpc('robot_saldo_efectivo', {}).catch(() => null), T_EFECTIVO = new Date().toISOString();
  const ent = await rpc('robot_entidades_pantalla', {}).catch(() => null);
  ENTIDADES = !!(ent && ent.ok && Array.isArray(ent.faltan) && ent.faltan.length === 0);
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
  if (!cred) { pasos.push({ paso: 'mover plata (en seco)', ok: true, salteado: true, ms: 0, detalle: 'solo con el usuario robot (con ROBOT_TOKEN el PREP corta los POST)' }); console.log('  --   mover plata (en seco)  (solo con el usuario robot)'); }
  else await paso('mover plata (en seco)', async () => {
    const r = await rpc('robot_en_seco', { p_rpc: 'caja_mover_directo', p: { action: 'moverPlata', desde: 'cf', hacia: 'cf', monto: 1, nota: 'robot', proveedor: '', clientOpId: PREFIJO + 'mover-mal' } });
    const bien = r && r.ok && r.respuesta && r.respuesta.ok === false && /mismo lugar/.test(String(r.respuesta.err || ''));
    return { ok: !!bien, detalle: bien ? 'valida (mismo lugar → no)' : JSON.stringify(r).slice(0, 200) };
  }, { topeMs: 5000 });

  /* 3b) CONTAR UN PRODUCTO REAL, EN SECO (4/11/2026, con Supa): la directa corre y se deshace. Mide si la base frena
     («se está acomodando») y cuánto tarda con los productos de verdad: es el antes/después del Kardex paso c. Cuenta lo
     mismo que hay (delta 0) en el depósito donde más tiene. */
  if (cred) await paso('contar en seco (producto real)', async () => {
    const pr = await ev(`(function(){ var l=(typeof D==='object'&&D&&Array.isArray(D.stock))?D.stock:[], m=null;
      l.forEach(function(x){ if(String(x.a||'')==='PRUEBA'||x.u==='kg')return; Object.keys(x.pd||{}).forEach(function(d){ var q=Number(x.pd[d])||0; if(d!=='prueba'&&q>0&&(!m||q>m.q))m={a:x.a,d:d,q:q}; }); });
      return m; })()`);
    if (!pr) return { ok: false, detalle: 'no hay un producto real con stock en D.stock' };
    const t0 = Date.now();
    const r = await rpc('robot_en_seco', { p_rpc: 'stock_contar_directo', p: { abbr: pr.a, deposito: pr.d, cantidad: pr.q, clientOpId: PREFIJO + 'seco-contar', cv: 'robot' } });
    METRICAS.contar_real_seco_ms = Date.now() - t0;
    if (r && r.ok === false && /no se prueba en seco/.test(String(r.error || ''))) { delete METRICAS.contar_real_seco_ms; return { ok: true, salteado: true, detalle: 'robot_en_seco todavía no acepta stock_contar_directo (pedido a Supa)' }; }
    const resp = (r && r.respuesta) || {};
    METRICAS.contar_real_frenado = !!resp.acomodando;
    return { ok: !!(r && r.ok) && !resp.acomodando, detalle: pr.a + ' en ' + pr.d + ' (' + pr.q + ') · ' + (resp.acomodando ? 'FRENADO: se está acomodando' : (resp.ok ? 'aceptado' : JSON.stringify(resp).slice(0, 150))) + ' · ' + METRICAS.contar_real_seco_ms + ' ms' };
  }, { topeMs: 5000 });

  /* 4) LOS PASOS QUE ESCRIBEN (4/11/2026). Escritos contra los NOMBRES que da robot_entidades_pantalla (cliente y
     representante «PRUEBA Robot», su teléfono, proveedor «PRUEBA», sku «PRUEBA», depósito y cuenta «prueba») y se
     prenden solos cuando `faltan` queda vacío. Cada uno va por `_ordenDirecta`, el mismo camino que el botón: si
     devuelve null, la orden habría caído a Apps Script (y el motivo queda en `_noDirecto`). Todo lleva `robot-<corrida>-`
     en su id: la base lo saca de los totales y robot_limpiar lo borra. */
  const E = ent || {}, TEL = String(E.telefono || '5490000000001'), CLI = E.cliente || 'PRUEBA Robot', REP = E.representante || 'PRUEBA Robot';
  const PROV = E.proveedor || 'PRUEBA', SKU = E.producto || 'PRUEBA', DEP = E.deposito || 'prueba', CTA = E.cuenta || 'prueba';
  /* La directa desde la página. Devuelve {d} o {fueApps:motivo}. */
  const directa = (accion, body) => ev(`(async function(){ var b=${JSON.stringify(body)}; if(!b.ts)b.ts=Date.now();
    try{ var d=await _ordenDirecta(b,null,${JSON.stringify(accion)}); return d?{d:d}:{fueApps:b._noDirecto||'?'}; }catch(e){ return {error:String(e&&e.message||e)}; } })()`, 30000);
  const mal = (r, que) => ({ ok: false, detalle: que + ': ' + (r.fueApps ? 'habría ido a Apps Script (' + r.fueApps + ')' : JSON.stringify(r.error || r.d || r).slice(0, 200)) });
  const bien = (r) => !!(r && r.d && r.d.ok);
  /* El pedido del robot en D.pedidos (h = hoja, n = número). Espera hasta `ms` a que la pantalla lo tenga. */
  const buscarPedido = (n, ms) => esperar(`(function(){ if(typeof D!=='object'||!D||!Array.isArray(D.pedidos))return null;
    var p=D.pedidos.find(function(x){ return String(x.n)===${JSON.stringify(String(n))}&&String(x.c||'').indexOf('PRUEBA Robot')>=0; });
    return p?{h:p.h,n:p.n,r:(p.r||p.row||p.fila||0),$:p.$,ep:p.ep,es:p.es}:null; })()`, ms);
  let PED = null;
  /* El producto PRUEBA como lo ve Stock › Productos (D.stock, claves cortas: a = sigla, n = nombre, p = precio, pd = físico
     por depósito). El id de tienda no viaja en la foto de stock: lo da robot_entidades_pantalla (producto_id). */
  const prodPrueba = () => ev(`(function(){ var l=(typeof D==='object'&&D&&Array.isArray(D.stock))?D.stock:[];
    var p=l.find(function(x){ return String(x.a||'').trim()===${JSON.stringify(SKU)}; }); if(!p)return null;
    return {id:${JSON.stringify(E.producto_id == null ? null : E.producto_id)}, nombre:p.n||${JSON.stringify(SKU)}, precio:Number(p.p)||1, stock:Number((p.pd||{})[${JSON.stringify(DEP)}])||0}; })()`);

  await paso('alta en la tienda', async () => {
    const prod = await prodPrueba();
    if (!prod) return { ok: false, detalle: 'el producto ' + SKU + ' no está en D.stock (Stock › Productos)' };
    if (prod.id == null) return { ok: false, detalle: 'falta el id de tienda del producto ' + SKU + ' (robot_entidades_pantalla.producto_id)' };
    const hoy = new Date(), ent2 = new Date(hoy.getTime() + 2 * 86400000).toISOString().slice(0, 10);
    const body = { canal: 'Pilar', fecha: hoy.toLocaleString('es-AR'), fechaEntrega: ent2, dia: '', horario: '', nombre: CLI, telefono: TEL,
      pago: 'Transferencia', envio: 0, items: [{ id: prod.id, qty: 1 }], repartidor: '', total: Number(prod.precio) || 1, subtotalSinDescuento: Number(prod.precio) || 1,
      descuento: 0, descuentoManual: 0, descuentoGlobalPct: 0, descuentoReceta: null, propina: 0, tipoPedido: '', deposito: DEP,
      barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '', origen: 'Pendiente', estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: PREFIJO + 'alta' };
    const r = await directa('altaPedido', body);
    if (!bien(r)) return mal(r, 'alta');
    const n = r.d.n || r.d.ref;
    const t0 = Date.now(); await ev(`_recargarPedidos(); 1`).catch(() => 0);
    PED = await buscarPedido(n, 10000); const ver = Date.now() - t0;
    if (!PED) return { ok: false, detalle: 'la base dio el ' + n + ' pero no apareció en Pedidos en 10 s' };
    const otra = await directa('altaPedido', Object.assign({}, body));   // el mismo id: no tiene que duplicar
    const dup = bien(otra) && String(otra.d.n || otra.d.ref) !== String(n) && !otra.d.dedup;
    /* El tope de «se ve»: 1,5 s desde acá. En GitHub Actions (CI) el runner está lejos de la base y suma ~1 s de red que
       Tadeo no tiene: 3 s. El número medido va igual en el detalle y en métricas. */
    const TOPE_VER = process.env.CI ? 3000 : 1500; METRICAS.alta_se_ve_ms = ver;
    return { ok: !dup && ver < TOPE_VER, detalle: 'pedido ' + n + ' · se vio en ' + ver + ' ms (tope ' + TOPE_VER + ')' + (dup ? ' · DUPLICÓ con el mismo id' : ' · sin duplicar') };
  }, { escribe: true, topeMs: 15000 });

  /* EL ALTA COMPLETA (4/11/2026, Supa, 418/419). La base hace 3 altas del robot como la tienda (Home, Pilar y Red → Pilar
     Por decidir), controla cada pedido campo por campo y deshace todo antes de volver. Con ok=false ella misma pasa
     ALTA_COMPLETA a «medir» y anota la alerta: acá sale en rojo. Con la palanca apagada, gris. */
  await paso('alta completa en la base (3 canales)', async () => {
    const r = await rpc('robot_alta_completa_probar', {});
    if (!r || r.http >= 300) return { ok: false, detalle: 'la base contestó ' + (r && r.http) + ' ' + String((r && (r.message || r.texto)) || '').slice(0, 150) };
    if (r.palanca === false) return { ok: true, salteado: true, detalle: 'ALTA_COMPLETA apagada: no hay nada que probar' };
    const al = Array.isArray(r.altas) ? r.altas : [];
    const txt = al.map((a) => a.canal + ' #' + a.pedido + (a.completo ? ' completo (' + a.campos + ' campos)' : ' INCOMPLETO: ' + JSON.stringify(a.diffs).slice(0, 120))).join(' · ');
    return { ok: !!r.ok && al.length === 3 && al.every((a) => a.completo), detalle: (txt || 'sin altas') + (r.volvio_a_medir ? ' · la base volvió ALTA_COMPLETA a «medir»' : '') };
  }, { escribe: true, topeMs: 20000 });

  /* AJUSTES SIN APPS SCRIPT (4/11/2026, Supa 437). El robot no ve Ajustes (están los usuarios y los PIN): la base corre
     ajustesData como admin, devuelve solo conteos y comprueba que al robot le da 403. */
  await paso('ajustes en la base (como admin, solo conteos)', async () => {
    const r = await rpc('robot_ajustes_probar', {});
    if (!r || r.http >= 300) return { ok: false, detalle: 'la base contestó ' + (r && r.http) + ' ' + String((r && (r.message || r.texto)) || '').slice(0, 150) };
    const f = r.filas || {};
    return { ok: !!r.ok && !!r.admin_ok && !!r.robot_403, detalle: 'admin ' + (r.admin_ok ? 'ok' : 'MAL') + ' · robot 403 ' + (r.robot_403 ? 'sí' : 'NO') + ' · ' + (f.usuarios || 0) + ' usuarios, ' + (f.configMaleu || 0) + ' de Config' };
  }, { topeMs: 15000 });

  /* La tienda en el barrio de un representante (4/11/2026, con Supa). Hoy (PEDIDOS_POR_DECIDIR sin fila = sí) cae en
     Pilar «Por decidir» y se pasa a un representante con «Pasar a un vendedor» (pedido_pase_directo): ese es el camino vivo,
     no la bandeja «Por confirmar». El cuerpo es el de la tienda (tienda/app.js ~7590). Entrega a 3 días: la del portal va a
     2 y la base deja una entrega por cliente y por día. */
  await paso('tienda → Por decidir → pasar al representante', async () => {
    const prod = await prodPrueba();
    if (!prod || prod.id == null) return { ok: false, detalle: 'sin el producto PRUEBA o su id' };
    /* (4/11/2026) El representante PRUEBA reparte los VIERNES y el pase lo valida («PRUEBA reparte viernes, y este pedido es
       para el Sábado»): «hoy + 3» andaba solo cuando el robot corría un martes. Va el viernes de la semana que viene: el de
       esta semana puede chocar con el autopedido del portal (a 2 días), y la base deja una entrega por cliente y por día. */
    const _hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const F3 = new Date(Date.now() + (((5 - _hoyAR.getDay() + 7) % 7) + 7) * 86400000), _d3 = F3.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
    /* «al» (dd/MM HH:mm del alta, hora de Argentina): el pase lo pide (_pase_seco: «falta la fecha y hora del pedido»). */
    const _ah = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }).formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
    const AL = _ah.day + '/' + _ah.month + ' ' + _ah.hour + ':' + _ah.minute;
    const r1 = await directa('altaPedido', { canal: 'Red', fecha: new Date().toLocaleString('es-AR'), vendedor: REP, nombre: CLI, telefono: TEL, barrioPrivado: 'PRUEBA', lote: '',
      dia: _d3.charAt(0).toUpperCase() + _d3.slice(1), horario: '', fechaEntrega: F3.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }),
      pago: 'Transferencia', envio: 0, items: [{ id: prod.id, qty: 1, precio: prod.precio }], total: prod.precio, mail: '', clientOrderId: PREFIJO + 'decidir' });
    if (!bien(r1)) return mal(r1, 'alta de la tienda');
    const n = r1.d.n || r1.d.ref;
    await ev(`_recargarPedidos(); 1`).catch(() => 0);
    const p = await esperar(`(function(){ var x=(D.pedidos||[]).find(function(y){ return String(y.n)===${JSON.stringify(String(n))}&&String(y.c||'').indexOf('PRUEBA Robot')>=0; });
      return x?{h:x.h,n:x.n,r:(x.r||x.row||0),es:x.es,al:x.al||''}:null; })()`, 10000);
    if (!p) return { ok: false, detalle: 'la base dio el ' + n + ' pero no apareció en Pedidos' };
    const t0 = Date.now();
    const r2 = await directa('pasarAVendedor', { action: 'pasarAVendedor', hoja: p.h, id: String(p.n), row: p.r, al: p.al || AL, vendedor: REP, trajo: 'Vendedor', clientOpId: PREFIJO + 'pase' });
    /* El pase es de admin: hasta que la base deje al robot pasar lo PRUEBA (pedido a Supa), sale salteado y no frena el deploy. */
    if (r2 && r2.d && r2.d.forbidden) return { ok: true, salteado: true, detalle: 'el alta cayó en ' + p.h + ' #' + p.n + '; el pase es solo de admin (pedido a Supa: que el robot pase lo PRUEBA)' };
    /* El hueco del corte (un pedido nacido en la base, fila negativa, daba «no encontrado») lo cerró Supa con la 427: el
       pase lo busca por hoja + N° + hora del alta. Desde el 4/11/2026 ya no se saltea: si vuelve, sale en rojo. */
    if (!bien(r2)) return mal(r2, 'pasar a ' + REP + ' (estaba en ' + p.h + ' #' + p.n + ' fila ' + p.r + ' al ' + (p.al || AL) + ' · ' + (p.es || '?') + ')');
    const nRed = r2.d.red && r2.d.red.n;
    await ev(`_recargarPedidos(); 1`).catch(() => 0);
    const enRed = nRed ? await esperar(`(D.pedidos||[]).some(function(y){ return y.h==='Red'&&String(y.n)===${JSON.stringify(String(nRed))}; })`, 10000) : null;
    METRICAS.pase_se_ve_ms = Date.now() - t0;
    return { ok: !!enRed, detalle: p.h + ' #' + p.n + ' (' + (p.es || '?') + ') → Red #' + (nRed || '?') + (enRed ? ' · se vio en ' + METRICAS.pase_se_ve_ms + ' ms' : ' · no apareció en Red') };
  }, { escribe: true, topeMs: 25000 });

  await paso('armar, entregar, cobrar, deshacer cobro', async () => {
    if (!PED) return { ok: false, detalle: 'sin el pedido del alta' };
    const base = { hoja: PED.h, id: String(PED.n), row: PED.r }, hechos = [];
    let r = await directa('marcarArmado', { action: 'marcarArmado', pedidos: [{ h: PED.h, id: String(PED.n), r: PED.r, c: CLI }], armado: true, usuario: 'robot', clientOpId: PREFIJO + 'armar' });
    if (!bien(r)) return mal(r, 'armar'); hechos.push('armado');
    r = await directa('marcarEntregado', Object.assign({ action: 'marcarEntregado', cobrado: false, propina: 0, repartidor: '' }, base));
    if (!bien(r)) return mal(r, 'entregar'); hechos.push('entregado');
    r = await directa('marcarCobrado', Object.assign({ action: 'marcarCobrado', quien: 'robot', fechaCobro: '', formaPago: 'Transferencia', cuenta: CTA, ef: 0, tr: Number(PED.$) || 1, propina: 0, cliente: CLI, repartidor: '' }, base));
    if (!bien(r)) return mal(r, 'cobrar'); hechos.push('cobrado');
    /* (5/11, Organizador + Supa 501) «Se guardó» no alcanza: la cuenta y quién cobró tienen que quedar en el pedido. */
    let vp = null; for (let k = 0; k < 5; k++) { const v = await rpc('robot_verificar', { p: { pedido: PED.h + '|' + PED.n } }).catch(() => null); vp = v && v.pedido; if (vp && vp.cuenta && vp.cobrador) break; await pausa(1500); }
    const faltan = !vp ? ['el pedido'] : ['cuenta', 'cobrador', 'forma'].filter((c) => !vp[c]);
    if (vp && !(Number(vp.transferencia) > 0)) faltan.push('transferencia');
    hechos.push(faltan.length ? 'en la base FALTA ' + faltan.join(', ') : 'en la base: ' + vp.forma + ' · ' + vp.cuenta + ' · ' + vp.cobrador);
    await ev(`_recargarPedidos(); 1`).catch(() => 0);
    const cob = await esperar(`(function(){ var p=(D.pedidos||[]).find(function(x){ return String(x.n)===${JSON.stringify(String(PED.n))}; }); return p&&p.ep==='Cobrado'; })()`, 8000);
    r = await directa('descobrar', Object.assign({ action: 'descobrar' }, base));
    if (!bien(r)) return mal(r, 'deshacer cobro'); hechos.push('descobrado');
    return { ok: !!cob && !faltan.length, detalle: hechos.join(' → ') + (cob ? '' : ' · después de cobrar la pantalla no lo mostró Cobrado en 8 s') };
  }, { escribe: true, topeMs: 30000 });

  await paso('contar stock y deshacer', async () => {
    const pp = await prodPrueba(), antes = pp ? pp.stock : null;
    if (antes == null) return { ok: false, detalle: 'el producto ' + SKU + ' no está en D.stock' };
    const contar = (cant, id, extra) => rpc('stock_contar_directo', { p: Object.assign({ abbr: SKU, deposito: DEP, cantidad: cant, clientOpId: PREFIJO + id, cv: 'robot' }, extra || {}) });
    const r1 = await contar(antes + 1, 'contar');
    if (!r1 || !r1.ok) return { ok: false, detalle: 'contar: ' + JSON.stringify(r1).slice(0, 200) };
    /* «Se está acomodando»: el movimiento anterior todavía no terminó de entrar. Se reintenta hasta 2 min. */
    let r2 = null; const tE = Date.now(); for (let k = 0; k < 12; k++) { r2 = await contar(antes, 'descontar', { desmarcar: true }); if (!(r2 && r2.acomodando)) break; await pausa(10000); }
    METRICAS.espera_contar_ms = Date.now() - tE;
    if (!r2 || !r2.ok) return { ok: false, detalle: 'deshacer: ' + JSON.stringify(r2).slice(0, 200) };
    return { ok: true, detalle: antes + ' → ' + (antes + 1) + ' → ' + antes + ' · el deshacer esperó ' + Math.round(METRICAS.espera_contar_ms / 1000) + ' s («se está acomodando»)' };
  }, { escribe: true, topeMs: 130000 });

  /* (5/11/2026, Supa) TRASPASO de ida y vuelta, sin entidades nuevas: PRUEBA de 'prueba' a 'ustariz' y de vuelta. El libro
     tiene que mostrar prueba −1 / ustariz +1 en la ida y el neto en 0 a la vuelta. Solo toca el SKU PRUEBA, nunca stock
     real. Si en 'prueba' no hay ni 1, se cuenta 1 antes y se deshace al final (como el paso de contar). */
  /* (5/11/2026, Organizador) «Se guardó» no alcanza: el stock que muestra el ERP tiene que quedar movido y SEGUIR igual a los
     2 minutos (la foto se recalcula del libro y antes de la 497 lo pisaba). STOCK_ESPERADO guarda lo último que tiene que
     verse; el paso «stock a los 2 min» lo vuelve a leer antes de la limpieza. */
  const stockPd = async () => { const d = await rpc('stock_tab_pantalla', {}); const p = ((d && d.stock) || []).find((x) => String(x.a || x.abbr || '').trim() === SKU);
    const pd = (p && (p.pd || p.porDep)) || {}; return { prueba: Number(pd[DEP]) || 0, ustariz: Number(pd.ustariz) || 0 }; };
  let STOCK_ESPERADO = null, T_ULTIMO_MOV = 0;
  await paso('traspaso PRUEBA ida y vuelta', async () => {
    const libro = stockPd;
    const reintentar = async (fn) => { let r = null; for (let k = 0; k < 12; k++) { r = await fn(); if (!(r && r.acomodando)) break; await pausa(10000); } return r; };
    const tras = (desde, hacia, id) => reintentar(() => rpc('stock_traspaso_directo', { p: { action: 'stockTraspaso', abbr: SKU, desde: desde, hacia: hacia, cantidad: 1, clientOpId: PREFIJO + id } }));
    const a0 = await libro(); let contado = false;
    if (a0.prueba < 1) {
      const c = await rpc('stock_contar_directo', { p: { abbr: SKU, deposito: DEP, cantidad: 1, clientOpId: PREFIJO + 'tr-contar', cv: 'robot' } });
      if (!c || !c.ok) return { ok: false, detalle: 'no pude poner 1 en ' + DEP + ': ' + JSON.stringify(c).slice(0, 160) };
      contado = true;
    }
    const a = await libro();
    const r1 = await tras(DEP, 'ustariz', 'tr-ida');
    if (!r1 || !r1.ok) return { ok: false, detalle: 'ida: ' + JSON.stringify(r1).slice(0, 200) };
    const b = await libro();
    const idaBien = b.prueba === a.prueba - 1 && b.ustariz === a.ustariz + 1;
    const r2 = await tras('ustariz', DEP, 'tr-vuelta');
    if (!r2 || !r2.ok) return { ok: false, detalle: 'vuelta (¡PRUEBA quedó 1 en ustariz!): ' + JSON.stringify(r2).slice(0, 200) };
    const c2 = await libro();
    let des = null;
    if (contado) des = await reintentar(() => rpc('stock_contar_directo', { p: { abbr: SKU, deposito: DEP, cantidad: a0.prueba, clientOpId: PREFIJO + 'tr-descontar', cv: 'robot', desmarcar: true } }));
    const netoBien = c2.prueba === a.prueba && c2.ustariz === a.ustariz;
    const det = DEP + '/ustariz ' + a.prueba + '/' + a.ustariz + ' → ' + b.prueba + '/' + b.ustariz + ' → ' + c2.prueba + '/' + c2.ustariz + (contado ? ' (se contó 1 antes' + (des && des.ok ? ' y se deshizo)' : ', NO se deshizo: ' + JSON.stringify(des).slice(0, 80) + ')') : '');
    if (!idaBien) return { ok: false, detalle: 'la ida no movió el libro como debía: ' + det };
    if (!netoBien) return { ok: false, detalle: 'el neto no quedó en 0: ' + det };
    STOCK_ESPERADO = { prueba: contado ? a0.prueba : c2.prueba, ustariz: c2.ustariz, de: 'traspaso' }; T_ULTIMO_MOV = Date.now();
    if (c2.ustariz !== 0) hallazgos.push('traspaso: PRUEBA tiene ' + c2.ustariz + ' en ustariz (tiene que ser 0)');
    return { ok: !contado || !!(des && des.ok), detalle: det };
  }, { escribe: true, topeMs: 280000 });

  let COMPRA = null;
  await paso('cargar una compra', async () => {
    const r = await directa('compraManual', { action: 'compraManual', proveedor: PROV, vendedor: 'robot', items: [{ abbr: SKU, nombre: SKU, costo: 1, qty: 1, origen: 'Orden de Compra' }], confirmarDuplicada: true, clientOpId: PREFIJO + 'compra' });   /* (5/11) cada corrida es una compra nueva: como tocar «es otra» */
    if (!bien(r)) return mal(r, 'compra');
    COMPRA = r.d;
    return { ok: true, detalle: 'cargada' + (r.d.hora ? ' (' + r.d.hora + ')' : '') };
  }, { escribe: true, topeMs: 10000 });

  await paso('OC de prueba: pedir y recibir', async () => {
    if (!COMPRA) return { ok: false, detalle: 'sin la compra del paso anterior' };
    /* La línea de la compra en la lectura de Abastecimiento: un objeto con el proveedor PRUEBA y su fila. */
    const bq = await rpc('busqueda_pantalla', {});
    /* La línea de la compra en bq.oc: {n: número de OC, q, abbr, prov, est, row, fc}. Lo del robot nunca llega a la planilla,
       así que row viene en 0: se identifica por el número de OC. La más nueva de PRUEBA que no esté recibida. */
    const lin = (bq && Array.isArray(bq.oc) ? bq.oc : []).filter((x) => String(x.prov || '').trim() === PROV && String(x.abbr || '').trim() === SKU && x.est !== 'Recibida')
      .sort((a, b) => String(b.fc || '').localeCompare(String(a.fc || '')))[0];
    if (!lin) { const ej = (bq && Array.isArray(bq.oc) ? bq.oc.filter((x) => JSON.stringify(x).indexOf(SKU) >= 0).slice(0, 2) : []);
      return { ok: false, detalle: 'la compra no aparece en busqueda_pantalla' + (ej.length ? ' · oc con PRUEBA: ' + JSON.stringify(ej).slice(0, 250) : ' · ninguna línea de oc con PRUEBA') }; }
    const oc = lin.n, q = Number(lin.q) || 1, hechos = [];
    /* (5/11, Supa) Una línea de OC sin fila no se recibe: rows:[0] contesta ok sin recibir nada. Rojo antes de mandar. */
    if (!(Number(lin.row) > 0)) return { ok: false, detalle: oc + ': la línea vino con fila ' + JSON.stringify(lin.row) + ' en busqueda_pantalla · no se recibe una OC sin fila · línea ' + JSON.stringify(lin).slice(0, 200) };
    const sa = await stockPd();
    let r;
    if (lin.est !== 'Pedido') {
      r = await directa('marcarOC', { action: 'marcarOC', rows: [{ r: lin.row || 0, oc: oc, estado: 'Pedido' }], clientOpId: PREFIJO + 'pedir' });
      if (!bien(r)) return mal(r, 'pedir'); hechos.push('pedida');
    } else hechos.push('ya en Pedido');
    /* Mismo «se está acomodando» que el conteo (el movimiento de stock anterior espera al aplicador): hasta 2 min. */
    const tR = Date.now(); for (let k = 0; k < 12; k++) { r = await directa('recibirMercaderia', { action: 'recibirMercaderia', deposito: DEP, groups: [{ prov: PROV, prod: SKU, abbr: SKU, qtyRecibida: q, pedido: q, rows: [lin.row || 0], ocs: [oc] }], clientOpId: PREFIJO + 'recibir' });
      if (!(r && r.d && r.d.ok === false && /acomodando/.test(String(r.d.err || r.d.error || '')))) break; await pausa(10000); }
    METRICAS.espera_recibir_ms = Date.now() - tR;
    if (!bien(r)) return mal(r, 'recibir'); hechos.push('recibida (esperó ' + Math.round(METRICAS.espera_recibir_ms / 1000) + ' s)');
    /* (5/11, Supa 497) Recibir mueve el libro: el stock de PRUEBA en el depósito prueba sube lo recibido. */
    let sb = null; for (let k = 0; k < 6; k++) { sb = await stockPd(); if (sb.prueba === sa.prueba + q) break; await pausa(2000); }
    const lv = await rpc('robot_verificar', { p: {} }).catch(() => null), lq = lv && lv.libro && lv.libro[DEP] ? Number(lv.libro[DEP].q) : null;
    STOCK_ESPERADO = { prueba: sa.prueba + q, ustariz: sa.ustariz, de: 'recepción' }; T_ULTIMO_MOV = Date.now();
    const subio = sb.prueba === sa.prueba + q;
    return { ok: subio, detalle: oc + ': ' + hechos.join(' → ') + ' · stock ' + DEP + ' ' + sa.prueba + ' → ' + sb.prueba + (subio ? ' (+' + q + ')' : ' · tenía que dar ' + (sa.prueba + q)) + ' · libro ' + lq + ' · op ' + PREFIJO + 'recibir' + ' · fila ' + lin.row + (subio ? '' : ' · respuesta ' + JSON.stringify(r && r.d ? r.d : r).slice(0, 400)) };
  }, { escribe: true, topeMs: 130000 });

  /* (5/11/2026, Supa 492) CARGA de mercadería por la base: previa → guardar 1 PRUEBA → el libro total sube 1 → el reintento
     con el mismo clientOpId contesta repetida y no suma otra vez. El libro se lee con robot_verificar (501). */
  await paso('carga de mercadería PRUEBA', async () => {
    const libroTotal = async () => { const v = await rpc('robot_verificar', { p: {} }); return v && v.total ? Number(v.total.q) || 0 : null; };
    const ahora = Date.now();
    const pv = await rpc('carga_guardar_directo', { p: { action: 'cargaGuardar', proveedor: PROV, filas: [], previa: true, ocurrio: ahora } });
    /* La previa sin filas contesta ok:false («no cambiaste nada») pero trae el inicial por depósito: es lo que usa el ERP. */
    const ini = pv && pv.inicial && pv.inicial[SKU];
    if (!ini || typeof ini !== 'object') return { ok: false, detalle: 'la previa no trajo el inicial de ' + SKU + ': ' + JSON.stringify(pv).slice(0, 200) };
    const fin = Object.assign({}, ini); fin[DEP] = (Number(ini[DEP]) || 0) + 1;
    const t0 = await libroTotal();
    const cuerpo = { action: 'cargaGuardar', proveedor: PROV, ocurrio: ahora, filas: [{ a: SKU, recibido: 1, final: fin, inicialVisto: ini, deMas: { que: 'compra', costo: 1 } }]   /* la OC ya se recibió: llega «de más» y se contesta como en el ERP, «Compra nueva» a $1 */, clientOpId: PREFIJO + 'carga' };
    const rv = await rpc('carga_guardar_directo', { p: Object.assign({}, cuerpo, { previa: true }) });
    if (!rv || rv.ok === false) return { ok: false, detalle: 'revisar: ' + JSON.stringify(rv).slice(0, 220) };
    const g = await rpc('carga_guardar_directo', { p: cuerpo });
    if (!g || !g.carga) return { ok: false, detalle: 'guardar: ' + JSON.stringify(g).slice(0, 220) };
    const g2 = await rpc('carga_guardar_directo', { p: cuerpo });
    const t1 = await libroTotal();
    const rep = !!(g2 && g2.repetida), subio = t0 != null && t1 === t0 + 1;
    if (g.ok) { const lv = await rpc('robot_verificar', { p: {} }).catch(() => null); if (lv && lv.libro) { STOCK_ESPERADO = { prueba: Number((lv.libro[DEP] || {}).q) || 0, ustariz: Number((lv.libro.ustariz || {}).q) || 0, de: 'carga (el libro al guardar)' }; T_ULTIMO_MOV = Date.now(); } }
    const det = 'carga ' + g.carga + (g.ok ? '' : ' (a medias: ' + JSON.stringify(g.errores || g.sinGuardar || '').slice(0, 80) + ')') + ' · libro total ' + t0 + ' → ' + t1 + ' · reintento ' + (rep ? 'repetida' : 'NO repetida: ' + JSON.stringify(g2).slice(0, 80));
    return { ok: !!g.ok && rep && subio, detalle: det + (subio ? '' : ' · ¡el libro no subió 1!') };
  }, { escribe: true, topeMs: 30000 });

  await paso('pagar al proveedor PRUEBA', async () => {
    const r = await directa('pagarProveedor', { action: 'pagarProveedor', proveedor: PROV, efectivo: 0, mp: 1, bonif: 0, semana: '', notas: 'robot', cuenta: CTA, clientOpId: PREFIJO + 'pago' });
    if (!bien(r)) return mal(r, 'pago');
    /* (5/11, Supa 501/499) El pago tiene que aparecer en Caja y en el EERR del mes. */
    let g = null; for (let k = 0; k < 5; k++) { const v = await rpc('robot_verificar', { p: { gasto_op: PREFIJO + 'pago' } }).catch(() => null); g = v && v.gasto; if (g && g.en_caja && g.en_eerr) break; await pausa(1500); }
    const okG = !!(g && g.en_caja && g.en_eerr);
    return { ok: okG, detalle: '$1 desde la cuenta ' + CTA + ' · ' + (g ? 'en Caja ' + (g.en_caja ? 'sí' : 'NO') + ' · en el EERR ' + (g.mes || '') + ' ' + (g.en_eerr ? 'sí' : 'NO') : 'robot_verificar no encontró el pago') };
  }, { escribe: true, topeMs: 5000 });

  await paso('portal del representante PRUEBA', async () => {
    const prod = await prodPrueba();
    if (!prod) return { ok: false, detalle: 'el producto ' + SKU + ' no está en D.stock (Stock › Productos)' };
    if (prod.id == null) return { ok: false, detalle: 'falta el id de tienda del producto ' + SKU + ' (robot_entidades_pantalla.producto_id)' };
    /* Como en la vida real: el representante entra con SU usuario y PIN (por la base: login_pin + auth) y carga el
       autopedido con SU token. La base toma el vendedor de la sesión, no del cuerpo. No se guarda: la sesión de la página
       sigue siendo la del robot. */
    /* El día de entrega es el de la semana de la fecha (en Argentina), con mayúscula: «Viernes». */
    if (!CRED.repPin) return { ok: false, detalle: 'falta el PIN del representante PRUEBA Robot (ROBOT_PIN_REP / pinRep)' };
    /* Una entrega por cliente y por día: si una corrida anterior dejó un pedido del cliente PRUEBA ese día (sin limpieza),
       se prueba con 4, 6 y 8 días en vez de fallar y frenar un deploy. */
    const cargar = (dias) => {
      const FECHA_ENT = new Date(Date.now() + dias * 86400000), _d = FECHA_ENT.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }), DIA_ENT = _d.charAt(0).toUpperCase() + _d.slice(1);
      const body = { action: 'redAutopedido', clientOrderId: PREFIJO + 'red-' + dias, canal: 'Red', vendedor: REP, nombre: CLI, telefono: TEL,
        barrioPrivado: 'PRUEBA', lote: '', dia: DIA_ENT, fechaEntrega: FECHA_ENT.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }), horario: 'A coordinar', pago: 'Transferencia', envio: 0,
        items: [{ id: prod.id, nombre: prod.nombre, qty: 1, precio: prod.precio }], total: prod.precio, trajo: 'Vendedor', telCliente: TEL };
      return ev(`(async function(){ var c=_sbCfgLogin(), H=function(t){ return {apikey:c.key,Authorization:'Bearer '+(t||c.key),'Content-Type':'application/json'}; };
      var lp=await (await fetch(c.url+'/rest/v1/rpc/login_pin',{method:'POST',headers:H(),body:JSON.stringify({p_usuario:${JSON.stringify(CRED.repUsuario)},p_pin:${JSON.stringify(CRED.repPin)}})})).json();
      if(!lp||!lp.ok||!lp.email)return {paso:'login',r:lp?{ok:lp.ok,err:lp.err}:null};
      var t=await _sbAuth(c.url,c.key,'password',{email:lp.email,password:lp.clave});
      var x=await fetch(c.url+'/rest/v1/rpc/red_autopedido_directo',{method:'POST',headers:H(t.access_token),body:JSON.stringify({p:${JSON.stringify(body)}})});
      var j=null; try{ j=await x.json(); }catch(e){} return {paso:'autopedido',http:x.status,r:j,rol:lp.rol}; })()`, 30000);
    };
    let r = null;
    for (const dias of [2, 4, 6, 8]) { r = await cargar(dias); if (!(r && r.r && r.r.ok === false && /ya tiene el pedido/.test(String(r.r.err || '')))) break; }
    if (r.paso === 'login') return { ok: false, detalle: 'el representante no pudo entrar por la base: ' + JSON.stringify(r.r).slice(0, 150) };
    const d = r.r || {};
    return d.ok ? { ok: true, detalle: 'entró como ' + CRED.repUsuario + ' (rol ' + r.rol + ') · autopedido ' + (d.ref || (d.sumarA && d.sumarA.n) || '') }
      : { ok: false, detalle: 'autopedido: http ' + r.http + ' ' + JSON.stringify(d).slice(0, 180) };
  }, { escribe: true, topeMs: 10000 });

  await paso('liquidación de PRUEBA', async () => {
    const liq = await rpc('red_liquidacion_pantalla', {});
    let fila = null; (function mirar(o) { if (fila || !o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(mirar);
      if (String(o.vendedor || o.Vendedor || o.nombre || '').trim() === REP && (o.quincena || o.q)) { fila = o; return; } Object.keys(o).forEach((k) => mirar(o[k])); })(liq);
    if (!fila) return { ok: true, detalle: REP + ' no tiene nada a liquidar en la quincena (no se pagó nada)' };
    const total = Number(fila.total || fila.aPagar || 0);
    if (!(total > 0)) return { ok: true, detalle: 'quincena ' + (fila.quincena || fila.q) + ' en $0: nada que pagar' };
    const r = await directa('redLiquidacionPagar', { action: 'redLiquidacionPagar', vendedor: REP, quincena: fila.quincena || fila.q, cuenta: CTA, lugar: '', totalVisto: total, clientOpId: PREFIJO + 'liq' });
    return bien(r) ? { ok: true, detalle: '$' + total + ' desde la cuenta ' + CTA } : mal(r, 'liquidación');
  }, { escribe: true, topeMs: 10000 });

  await paso('stock a los 2 min (recepción y traspaso)', async () => {
    if (!STOCK_ESPERADO) return { ok: false, detalle: 'no hubo movimiento de stock que mirar (falló un paso anterior)' };
    const falta = 120000 - (Date.now() - T_ULTIMO_MOV); if (falta > 0) await pausa(falta);
    /* Dos cosas a los 2 min: el LIBRO sigue en lo esperado (nadie lo devolvió) y la PANTALLA muestra lo mismo que el libro. */
    const v = await stockPd(), e = STOCK_ESPERADO, lv = await rpc('robot_verificar', { p: {} }).catch(() => null);
    const lb = lv && lv.libro ? { prueba: Number((lv.libro[DEP] || {}).q) || 0, ustariz: Number((lv.libro.ustariz || {}).q) || 0 } : null;
    const libroOk = !!lb && lb.prueba === e.prueba && lb.ustariz === e.ustariz, pantallaOk = !!lb && v.prueba === lb.prueba && v.ustariz === lb.ustariz;
    return { ok: libroOk && pantallaOk, detalle: 'después de ' + e.de + ': ' + DEP + '/ustariz esperado ' + e.prueba + '/' + e.ustariz + ' · libro a los 2 min ' + (lb ? lb.prueba + '/' + lb.ustariz : '?') + ' · el ERP muestra ' + v.prueba + '/' + v.ustariz
      + (libroOk ? '' : ' · ¡EL LIBRO VOLVIÓ PARA ATRÁS!') + (pantallaOk ? '' : ' · ¡EL ERP NO MUESTRA EL LIBRO!') };
  }, { escribe: true, topeMs: 150000 });

  /* Lo que se frenó (WhatsApp, Telegram, mails) y la limpieza de todo lo de esta corrida. */
  if (ENTIDADES) {
    const fr = await rpc('robot_avisos_frenados', { p_corrida: CORRIDA }).catch(() => null);
    if (fr) console.log('  avisos frenados: ' + JSON.stringify(fr).slice(0, 160));
    /* robot_limpiar (401): {ok, borrado:{tabla:n}, residuos:{tabla:n}}. ok:false = un paso pasaba las 300 filas y no
       borró nada (falla); residuos = una tabla con algo del robot que la limpieza no conoce (hallazgo para Supa). */
    /* ROBOT_SIN_LIMPIEZA=1: deja lo de la corrida para mirarlo (una orden trabada, por ejemplo); el reloj de las 05:00 limpia. */
    const li = process.env.ROBOT_SIN_LIMPIEZA ? { ok: true, borrado: {}, residuos: {}, salteada: true } : await rpc('robot_limpiar', { p_corrida: CORRIDA }).catch((e) => ({ ok: false, error: e.message }));
    /* (4/11/2026, Supa 443) Lo que la limpieza deja A PROPÓSITO (órdenes pendientes de esta corrida, < 30 min) viene
       aparte en `pendientes` y no cuenta: `residuos` es solo lo que no conoce, y eso sale rojo. */
    if (li && li.pendientes) console.log('  pendientes (protegidas a propósito, las barre la noche): ' + JSON.stringify(li.pendientes).slice(0, 120));
    const res = (li && li.residuos) || {}, conRes = Object.keys(res).filter((k) => Number(res[k]) > 0);
    pasos.push({ paso: 'limpieza', ok: !!(li && li.ok) && !conRes.length, ms: 0,
      detalle: li && li.ok ? 'borrado ' + JSON.stringify(li.borrado || {}).slice(0, 200) + (conRes.length ? ' · residuos en ' + conRes.join(', ') : '') : JSON.stringify(li).slice(0, 200) });
    if (!(li && li.ok)) hallazgos.push('limpieza: robot_limpiar no borró (' + JSON.stringify(li).slice(0, 120) + ')');
    if (conRes.length) hallazgos.push('limpieza: quedaron residuos en ' + conRes.join(', ') + ' (pasarle a Supa)');
    /* (402) Las fotos de pantalla que arma Apps Script con la planilla y traen algo del robot: una fuga de ese lado. */
    const fotos = (li && li.fotos) || {}; if (Object.keys(fotos).length) hallazgos.push('fotos de Apps Script con lo del robot: ' + JSON.stringify(fotos).slice(0, 200));
    console.log('  limpieza: ' + JSON.stringify(li).slice(0, 200));
  }
  /* LAS ESCRITURAS QUE TODAVÍA LLEGAN A APPS SCRIPT (4/11/2026, Organizador; meta 0). Los pasos del robot ya van con 0
     (cada uno sale rojo si intenta ir a Apps Script). Esto es lo de la GENTE: Apps Script cuenta por día y por acción lo
     que le entra por el web app (`postsFront`, sin el aplicador). Hoy es informativo: sale gris con el número y las
     acciones, y se pone rojo cuando llegue a 0 y alguien vuelva a escribir por ahí. */
  await paso('escrituras que todavía llegan a Apps Script', async () => {
    const pf = await (await fetch('https://script.google.com/macros/s/AKfycbxmrG5YVSshcYezk8lXFx_uxb7NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec?action=postsFront', { signal: AbortSignal.timeout(20000) })).json().catch(() => null);
    if (!pf || !pf.ok) return { ok: true, salteado: true, detalle: 'postsFront no contestó' };
    const dias = pf.dias || {}, ks = Object.keys(dias).sort(), ayer = ks.length > 1 ? dias[ks[ks.length - 2]] : null;
    const top = (o) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0] + ' ' + e[1]).join(', ');
    const tot = (o) => Object.values(o || {}).reduce((s, n) => s + (Number(n) || 0), 0);
    METRICAS.posts_apps_hoy = pf.totalHoy;
    return { ok: true, salteado: pf.totalHoy > 0, detalle: 'hoy ' + pf.totalHoy + (pf.totalHoy ? ' (' + top(pf.hoy) + ')' : '') + (ayer ? ' · ayer ' + tot(ayer) + ' (' + top(ayer) + ')' : '') };
  });
  /* LA PLATA DE RED EN LA BASE (4/11/2026, Supa 483). Corre como admin, en un bloque que se deshace, sobre sus propios
     datos PRUEBA: cambiar vendedor, anular y devolver el envío, comisión fuera de escala y sacarla, anular la liquidación
     LQ-9991, y la comisión como robot (403). La liquidación tiene que dar igual al peso. Rojo si algo no da. */
  await paso('plata de Red en la base (como admin, se deshace)', async () => {
    const r = await rpc('robot_red_plata_probar', {});
    if (!r || r.http >= 300) return { ok: false, detalle: 'la base contestó ' + (r && r.http) + ' ' + String((r && (r.message || r.texto)) || '').slice(0, 150) };
    const casos = Array.isArray(r.casos) ? r.casos : [], malos = casos.filter((c) => !c.ok), L = r.liquidacion || {};
    return { ok: !!r.ok && !malos.length && casos.length >= 7 && L.igual === true,
      detalle: (casos.length - malos.length) + ' de ' + casos.length + ' casos · liquidación ' + (L.igual ? 'igual al peso' : 'DISTINTA') + ' ($' + (L.total || 0) + ')' + (malos.length ? ' · mal: ' + malos.map((c) => c.accion + (c.err ? ' (' + String(c.err).slice(0, 60) + ')' : '')).join(', ') : '') };
  }, { topeMs: 20000 });
  /* CUÁNTAS ESCRITURAS DEL ERP TODAVÍA SALEN POR APPS SCRIPT (4/11/2026, Organizador: «de 50 a menos de 10»). Sin tocar
     botones: toda `action:'X'` del app.html publicado contra el mapa de directas y la palanca REAL de cada una (la que le da
     la base al robot). Sin los despertadores (no viajan) ni el login (el respaldo sigue a propósito). Informativo. */
  await paso('escrituras del ERP por Apps Script', async () => {
    const r = JSON.parse(await ev(`(async function(){ await _sbPermiso(true); var t=await (await fetch('app.html',{cache:'no-store'})).text(), s={};
      t.replace(/action\\s*:\\s*['"]([A-Za-z]+)['"]/g,function(m,a){ s[a]=1; return m; }); /* (5/11) también las que arma un helper: ajPost('usuarioSet',…) y cuerpo.action='X' (se escapaban del contador). */ t.replace(/\\bajPost\\(\\s*'([A-Za-z]+)'/g,function(m,a){ s[a]=1; return m; }); t.replace(/\\.action\\s*=\\s*'([A-Za-z]+)'/g,function(m,a){ s[a]=1; return m; });
      var fuera={pedidosFuenteAplicar:1,altaPgAplicar:1,difAplicar:1,loginUsuario:1,logout:1,loginVendedor:1}, on=_palancaVal('directas')||{};
      var todas=Object.keys(s).filter(function(a){ return !fuera[a]; });
      /* juntadaIntegrante va por su propia RPC desde Ruta (juntada_integrante_directo), no por el mapa ni por Apps Script. */
      var base=function(a){ if(a==='stockContar')return _palancaVal('contarDirecto')===true; if(a==='juntadaIntegrante')return true; /* (5/11) Ajustes › Precios: fetch directo a su RPC (Supa 490). */ if(a==='precioProducto'||a==='precioCombo'||a==='cuentaSet'||a==='configMaleuSet'||a==='cargaGuardar')return true; if(typeof AJ_BASE_RPC==='object'&&AJ_BASE_RPC[a])return true; return !!(ORD_DIRECTAS_RPC[a]&&on[a]===true); };
      var cortadas=todas.filter(function(a){ return !base(a)&&typeof ACCIONES_CORTADAS==='object'&&ACCIONES_CORTADAS[a]; });
      var apps=todas.filter(function(a){ return !base(a)&&!(typeof ACCIONES_CORTADAS==='object'&&ACCIONES_CORTADAS[a]); });
      return JSON.stringify({n:todas.length,apps:apps.sort(),cortadas:cortadas.length}); })()`, 30000));
    METRICAS.escrituras_apps = r.apps.length;
    return { ok: true, salteado: r.apps.length > 0, detalle: r.apps.length + ' de ' + r.n + ' (cortadas por uso 0: ' + r.cortadas + ')' + (r.apps.length ? ': ' + r.apps.join(', ') : '') };
  });
  /* POR QUÉ NO FUE DIRECTA (Supa 444): cada caída a Apps Script anota su motivo en la base; acá se leen los de 7 días. */
  await paso('por qué no fueron directas (7 días)', async () => {
    const r = await rpc('directa_no_motivos', { p_dias: 7 }).catch(() => null);
    if (!r || r.http >= 300 || !r.ok) return { ok: true, salteado: true, detalle: 'directa_no_motivos no contestó: ' + JSON.stringify(r).slice(0, 120) };
    const l = [];
    (r.acciones || []).forEach((a) => (a.motivos || []).forEach((m) => l.push({ a: a.accion, m: m.motivo, n: m.n, u: m.usuarios })));
    l.sort((x, y) => y.n - x.n);
    const txt = l.slice(0, 8).map((x) => x.a + ' · ' + x.m + ' ×' + x.n + (x.u ? ' (' + x.u + ')' : '')).join(' | ');
    return { ok: true, salteado: l.length > 0, detalle: l.length ? txt : 'ninguna' };
  });
  await paso('el efectivo real no se movió', async () => {
    const a = EFECTIVO_ANTES, d = await rpc('robot_saldo_efectivo', {}).catch(() => null);
    if (!a || !a.ok || !d || !d.ok) return { ok: false, detalle: 'robot_saldo_efectivo no contestó: ' + JSON.stringify(d || a).slice(0, 120) };
    const fmt = (x) => '$' + Math.round(Number(x) || 0).toLocaleString('es-AR');
    if (Number(a.efectivo) === Number(d.efectivo)) return { ok: true, detalle: fmt(a.efectivo) + ' antes y después' };
    /* `ult_real` llega en milisegundos (442); `ult_real_txt`, en hora argentina para leer. */
    if (Number(d.ult_real) > Date.parse(T_EFECTIVO)) return { ok: true, salteado: true, detalle: 'hubo un movimiento real de efectivo durante la corrida (' + (d.ult_real_txt || d.ult_real) + '): ' + fmt(a.efectivo) + ' → ' + fmt(d.efectivo) };
    return { ok: false, detalle: 'cambió: ' + fmt(a.efectivo) + ' → ' + fmt(d.efectivo) + ' (cf ' + fmt(a.cf) + ' → ' + fmt(d.cf) + ')' };
  });

  return terminar();
})().catch((e) => { hallazgos.push('el robot reventó: ' + String((e && e.message) || e).slice(0, 200)); return terminar(); });

async function terminar() {
  const mal = pasos.filter((p) => !p.ok).length;
  if (Object.keys(METRICAS).length) console.log('métricas: ' + JSON.stringify(METRICAS));
  console.log('\n' + (pasos.length - mal) + ' de ' + pasos.length + ' pasos bien' + (hallazgos.length ? ' · hallazgos:\n  - ' + hallazgos.join('\n  - ') : ''));
  if (!process.env.ROBOT_SIN_REPORTE && cli) {
    const r = await rpc('robot_resultado', { p: { corrida: CORRIDA, inicio: ahora.toISOString(), fin: new Date().toISOString(), pasos: pasos, hallazgos: hallazgos, metricas: METRICAS } }).catch((e) => ({ error: e.message }));
    console.log('resultado en la base: ' + JSON.stringify(r).slice(0, 160));
  }
  try { cli && cli.matar(); } catch (e) {}
  try { SERVIDOR && SERVIDOR.kill(); } catch (e) {}
  process.exit(mal ? 1 : 0);
}
