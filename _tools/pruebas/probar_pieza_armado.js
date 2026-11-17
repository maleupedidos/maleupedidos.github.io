/* «TOCÁ EL PESO DE LA ETIQUETA» EN ARMADO (739, 17/11/2026), con datos reales y SIN escribir nada.
     SBSES=<ses.json> ROL=<rol> NOMBRE=<nombre> [ANCHO=390] [BASE_URL=…] node _tools/pruebas/probar_pieza_armado.js <prefijo_fotos> [PEDIDO=Pilar|2512]
   Entra como esa persona (sesión temporal de sesion_prueba.py), abre Ruta › ARMADO, busca la tarjeta del pedido que tiene
   piezas y prueba, en orden:
     1. el bloque: cuántos cortes y chips, y que ninguno venga marcado;                                  → <prefijo>_bloque.png
     2. tocar la tarjeta para marcarla armada: con piezas sin confirmar NO se tiene que marcar (ni local ni en la cola);
     3. tocar el chip libre de peso más cercano a una del pedido: la orden que saldría (`pieza_confirmar_directo`);
     4. tocar un chip que pesa más de un 10 % distinto: tiene que preguntar antes («¿Es la de …?»).     → <prefijo>_pregunta.png
   Toda escritura se CORTA (la base no se entera): queda «en vuelo» y se anota en `__cortadas`. */
'use strict';
const fs = require('fs');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const PRE = process.argv[2];
const PEDIDO = process.env.PEDIDO || 'Pilar|2512';
const URL = process.env.BASE_URL || 'http://localhost:8173/app.html';
const j = JSON.parse(fs.readFileSync(process.env.SBSES, 'utf8'));
const g = { u: j.usuario, url: 'https://xhaxmyvhygxynwjqrarm.supabase.co', key: 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG',
  access: j.access_token, refresh: j.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true };
const PANEL = { usuario: j.usuario, rol: process.env.ROL || 'equipo', nombre: process.env.NOMBRE || j.usuario, ts: Date.now() };
const SEMBRAR = `;try{localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify(g))});localStorage.setItem('maleu_panel_session',${JSON.stringify(JSON.stringify(PANEL))});}catch(e){}
  ;(function(){var f=window.fetch;window.__cortadas=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
    var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
    var lee=m==='GET'||m==='HEAD'||/auth\\/v1\\/token/.test(s)||(r&&/(_pantalla|_datos|_base)$|^permiso_base$|^mi_deposito$|^ruta_ultima_salida$|^tienda_vendedores$/.test(r[1]));
    if(!lee){window.__cortadas.push((r?r[1]:s.slice(0,60))+' '+String((x&&x.body)||'').slice(0,400));return new Promise(function(){});}
    return f.apply(this,arguments);};})();`;
const clicEn = async (cli, b) => { for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 }); };
const foto = async (cli, f) => { const r = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); return f; };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SEMBRAR });
  const ANCHO = Number(process.env.ANCHO || 390);
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.navigate', { url: URL });
  await T(14000);
  for (let i = 0; i < 5; i++) {
    await evaluar(cli, `try{go('ruta')}catch(e){}`); await T(3000);
    await evaluar(cli, `try{switchTab('armado')}catch(e){}`); await T(3000);
    const ok = await evaluar(cli, `!!document.querySelector('#armadoView .arm-pz-c')`).catch(() => false);
    if (ok) break;
  }
  /* Los días arrancan plegados: se abren todos (Tatu toca el del día que arma). */
  const VIS = (sel) => `[].filter.call(document.querySelectorAll('${sel}'),function(h){var r=h.getBoundingClientRect();return r.width>0&&r.height>0;})`;
  for (let i = 0; i < 20; i++) {   // primero que la lista termine de pintar (encabezados visibles)
    if (await evaluar(cli, `${VIS('#armadoView [data-collapse-key]')}.length`).catch(() => 0)) break;
    await T(1000);
  }
  for (let i = 0, vacias = 0; i < 8 && vacias < 2; i++) {   // el día, y adentro los grupos («Venta Directa», el barrio…): de a una capa
    const n = await evaluar(cli, `(function(){var hs=${VIS('#armadoView [data-collapse-key].collapsed')};hs.forEach(function(h){h.click();});return hs.length;})()`).catch(() => 0);
    vacias = n ? 0 : vacias + 1; await T(1200);
  }
  await evaluar(cli, `(function(){var st=document.createElement('style');st.textContent='.toast,[id$="Toast"],[id$="toast"],[class*="toast"]{display:none!important}';document.head.appendChild(st);})()`);
  /* La tarjeta del pedido: la que tiene el bloque de piezas con chips de ESE pedido. */
  const CARD = `(function(){var bs=[].slice.call(document.querySelectorAll('#armadoView .arm-pz'));for(var i=0;i<bs.length;i++){var b=bs[i];var rr=b.getBoundingClientRect();if(!(rr.width>0&&rr.height>0))continue;var c=b.closest('.armado-card');var t=b.querySelector('[onclick*="${PEDIDO}"]');if(t)return c||b;}return null;})()`;
  const bloque = await evaluar(cli, `JSON.stringify((function(){var c=${CARD};if(!c)return null;var b=c.querySelector('.arm-pz');c.scrollIntoView({block:'start'});window.scrollBy(0,-60);
    return {cortes:b.querySelectorAll('.arm-pz-corte').length,chips:[].map.call(b.querySelectorAll('.arm-pz-c'),function(x){return x.textContent.trim()}),
      marcados:b.querySelectorAll('.arm-pz-c.on,.arm-pz-c[aria-pressed="true"]').length,texto:b.innerText.replace(/\\s+/g,' ').slice(0,200),
      tarjeta:(c.querySelector('.armado-name')||{}).textContent||''};})())`).then(JSON.parse).catch((e) => ({ err: String(e) }));
  await T(600);
  const fBloque = await foto(cli, PRE + '_bloque.png');
  /* 2. Marcar armada tocando el nombre de la tarjeta: no se tiene que marcar. */
  const armar = await evaluar(cli, `JSON.stringify((function(){var c=${CARD};if(!c)return null;var h=c.querySelector('.armado-check')||c.querySelector('.armado-head');var r=h.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})())`).then(JSON.parse).catch(() => null);
  if (armar) { await clicEn(cli, armar); await T(1500); }
  const trasArmar = await evaluar(cli, `JSON.stringify({confirmAbierto:(function(){var o=document.getElementById('confirmOverlay');return !!(o&&!o.classList.contains('hidden'))})(),
    toast:(document.getElementById('rutToast')||{}).textContent||'',
    marcarArmadoEnCola:((JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue)||[]).filter(function(q){return q&&q.action==='marcarArmado'}).length,
    tarjetaDone:(function(){var c=${CARD};return !!(c&&c.classList.contains('done'))})()})`).then(JSON.parse).catch((e) => ({ err: String(e) }));
  /* 3 y 4: los chips con su id (lee ARM_PZ por la función publicada en window). */
  const piezas = await evaluar(cli, `JSON.stringify((function(){try{var d=ARM_PZ['${PEDIDO}'];return d;}catch(e){return {err:e.message}}})())`).then(JSON.parse).catch((e) => ({ err: String(e) }));
  let cerca = null, lejos = null;
  try {
    const a = Object.keys(piezas)[0], ps = piezas[a].piezas, este = ps.filter((p) => p.de === 'este' && !p.ok);
    const otras = ps.filter((p) => p.de !== 'este');
    const dist = (p) => Math.min(...este.map((e) => Math.abs(e.kg - p.kg) / e.kg));
    otras.sort((p, q) => dist(p) - dist(q));
    cerca = otras[0]; lejos = otras.filter((p) => dist(p) > 0.10).pop() || null;
  } catch (e) { /* sin piezas */ }
  const tocar = async (id) => {
    /* Solo el VISIBLE: el mismo pedido también se pinta en una sección oculta, y el primero que encuentra querySelector
       es esa copia (0×0): el «toque» caía en (0,0), sobre el encabezado. */
    const b = await evaluar(cli, `JSON.stringify((function(){var x=[].filter.call(document.querySelectorAll(${JSON.stringify('#armadoView .arm-pz-c[onclick*="' + "'" + id + "'" + '"]')}),function(e){var r=e.getBoundingClientRect();return r.width>0&&r.height>0;})[0];if(!x)return null;x.scrollIntoView({block:'center'});var r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:x.textContent.trim()};})())`).then(JSON.parse).catch(() => null);
    if (!b) return null; await T(400); await clicEn(cli, b); await T(1500); return b.t;
  };
  let toqueCerca = null, ordenCerca = null, toqueLejos = null, pregunta = {}, fPregunta = null;
  /* 4 primero: la lejana abre la pregunta (no manda nada); foto y «Volver». */
  if (lejos) {
    toqueLejos = await tocar(lejos.id);
    pregunta.alTocarLejos = String(await evaluar(cli, `(document.getElementById('armPzOv')||{}).innerText||''`).catch(() => '')).replace(/\s+/g, ' ');
    fPregunta = await foto(cli, PRE + '_pregunta.png');
    pregunta.ordenesTrasLaPregunta = await evaluar(cli, `(window.__cortadas||[]).filter(function(x){return /pieza_confirmar_directo/.test(x)}).length`).catch(() => null);
    await evaluar(cli, `(function(){var b=document.querySelector('#armPzOv .rut-frz-volver');if(b)b.click();})()`); await T(800);
    pregunta.ordenesTrasVolver = await evaluar(cli, `(window.__cortadas||[]).filter(function(x){return /pieza_confirmar_directo/.test(x)}).length`).catch(() => null);
  }
  /* 3: la cercana va directo (sin pregunta): la orden queda cortada «en vuelo». */
  if (cerca) {
    toqueCerca = await tocar(cerca.id);
    pregunta.alTocarCerca = await evaluar(cli, `(document.getElementById('armPzOv')||{}).innerText||''`).catch(() => '');
    ordenCerca = await evaluar(cli, `JSON.stringify((window.__cortadas||[]).filter(function(x){return /pieza_confirmar_directo/.test(x)}))`).then(JSON.parse).catch(() => []);
  }
  const medir = fs.readFileSync(require('path').join(__dirname, 'pisadas.js'), 'utf8');
  const ini = medir.indexOf('const MEDIR = String(') + 'const MEDIR = String('.length, fin = medir.indexOf('\n});\n', ini) + 2;
  await evaluar(cli, `(function(){var o=document.getElementById('armPzOv');if(o)o.remove();var c=${CARD};if(c){c.scrollIntoView({block:'start'});window.scrollBy(0,-60);}})()`); await T(600);
  const pis = await evaluar(cli, `JSON.stringify((function(){var m=(${medir.slice(ini, fin)})(true);return {pisadas:m.pisadas,cortados:m.cortados,scroll:m.scroll,botonesChicos:m.botones.filter(function(b){return /arm-pz/.test(b.el)}),espaciado:m.espaciado.length};})())`).catch((e) => 'err ' + e.message);
  console.log(JSON.stringify({ ancho: ANCHO, pedido: PEDIDO, bloque, trasArmar, piezas, cerca, lejos, toqueCerca, ordenCerca, toqueLejos, pregunta, pisadas: pis, fotos: [fBloque, fPregunta] }, null, 1));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
