/* «ESTE CLIENTE ES MÍO» EN MI PORTAL, DE PUNTA A PUNTA (16/11/2026, la 729).
     SBSES=<ses_rep.json> node _tools/pruebas/probar_reclamo_portal.js <n de Red> <salida.png> [ancho=390]
   Entra como el REPRESENTANTE (sesión de la base de un usuario temporal, sesion_prueba.py crear … pruebarobot vendedor),
   SIN la guarda de solo lectura: el toque escribe de verdad. Usalo SOLO con un pedido PRUEBA del representante «PRUEBA
   Robot» con id robot-<corrida>- (lo borra robot_limpiar). Busca el pedido en Mi Portal, toca el botón con un clic real
   (con hit-testing, no .click()), espera el «Reclamaste este cliente» y saca la foto. Sale con 1 si no lo logra. */
'use strict';
const fs = require('fs');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [N, OUT, ANCHO_S] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
if (!N || !OUT || !process.env.SBSES) { console.error('uso: SBSES=<ses.json> probar_reclamo_portal.js <n> <salida.png> [ancho]'); process.exit(2); }
const j = JSON.parse(fs.readFileSync(process.env.SBSES, 'utf8'));
const g = { u: j.usuario, url: j.url || 'https://xhaxmyvhygxynwjqrarm.supabase.co', key: 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG',
  access: j.access_token, refresh: j.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true };
const PANEL = { usuario: j.usuario, rol: process.env.ROL || 'vendedor', nombre: process.env.NOMBRE || 'PRUEBA Robot', ts: Date.now() };
const SEMBRAR = `;try{localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify(g))});`
  + `localStorage.setItem('maleu_panel_session',${JSON.stringify(JSON.stringify(PANEL))});}catch(e){}`;
const tiene = (n) => `(function(){var t=document.body.innerText||'';return t.indexOf('#${n}')>=0||t.indexOf('${n}')>=0;})()`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  /* El reclamo pregunta con un confirm(): sin responderlo la página queda bloqueada y la prueba se cuelga. Se acepta,
     como lo haría el representante, y se anota qué preguntó. */
  const dialogos = [];
  cli.escuchar((m, p) => { if (m === 'Page.javascriptDialogOpening') { dialogos.push(String(p.message || '').split('\n')[0]); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SEMBRAR });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.navigate', { url: URL });
  await T(14000);
  const tab = await evaluar(cli, `(function(){try{go('miportal');return 'ok'}catch(e){return String(e)}})()`);
  await T(8000);
  /* La tarjeta «Este <día> · N entregas» lleva a la ruta del representante: un clic real. */
  const tar = await evaluar(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#pg-miportal *')).filter(function(e){return e.offsetParent&&/pendientes? de entregar/.test(e.innerText||'')&&(e.onclick||e.getAttribute('onclick')||e.tagName==='BUTTON'||e.getAttribute('role')==='button');});
    var e=c[c.length-1]; if(!e)return null; e.scrollIntoView({block:'center'}); var r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  if (tar) { await T(400); for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: tar.x, y: tar.y, button: 'left', clickCount: 1 }); await T(3000); }
  /* El pedido abierto en la ruta del portal: se avanza con rutaGo hasta que la tarjeta lo muestre. */
  let visto = false;
  for (let i = 0; i < 40 && !visto; i++) {
    visto = await evaluar(cli, `(function(){var b=document.querySelector('.rec-btn');var c=b&&b.closest('.ruta-trajo');var card=document.querySelector('#pg-miportal')||document.body;
      return !!(b&&b.offsetParent&&card.innerText.indexOf(${JSON.stringify(process.env.CLIENTE || 'PRUEBA Cliente Robot')})>=0);})()`);   /* la tarjeta no muestra el N° (a propósito): se busca por el cliente PRUEBA */
    if (!visto) { await evaluar(cli, `try{rutaGo(1)}catch(e){}`); await T(600); }
  }
  if (!visto) { console.error('no encontré el botón del #' + N + ' en Mi Portal (tab: ' + tab + ')'); const r = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(OUT, Buffer.from(r.data, 'base64')); process.exit(1); }
  const box = await evaluar(cli, `(function(){var b=document.querySelector('.rec-btn');b.scrollIntoView({block:'center'});var r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,txt:b.innerText};})()`);
  await T(500);
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) { await T(1000); ok = await evaluar(cli, `(function(){var e=document.querySelector('.ruta-trajo.pend');return !!(e&&e.offsetParent);})()`); }
  await evaluar(cli, `(function(){var e=document.querySelector('.ruta-trajo');if(e)e.scrollIntoView({block:'center'});})()`);
  await T(800);
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
  const txt = await evaluar(cli, `(function(){var e=document.querySelector('.ruta-trajo');return e?e.innerText:'';})()`);
  console.log(JSON.stringify({ boton: box.txt, pregunto: dialogos, pendiente: ok, texto: txt, foto: OUT }));
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
