/* «SALE DE: USTARIZ · MI FREEZER» EN RUTA (734, 16/11/2026), con datos reales y SIN escribir nada.
     SBSES=<ses.json> ROL=<rol> NOMBRE=<nombre> node _tools/pruebas/probar_sale_de_ruta.js <salida.png> [--elegir] [--entregar] [--forzar-jueves]
   Entra como esa persona (sesión temporal de sesion_prueba.py), abre Ruta › RUTA a 390 px y mira la tarjeta del pedido
   que esté en pantalla. Toda escritura se CORTA y se anota (la base no se entera): así se puede tocar «Mi freezer» y
   «Entregado» sobre un pedido real y leer qué habría mandado (`saleDe`). Lo que deja marcado en ese celular de prueba
   (entregados en localStorage) muere con el perfil temporal del Chrome. */
'use strict';
const fs = require('fs');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const a = process.argv.slice(2), OUT = a[0];
const URL = process.env.BASE_URL || 'http://localhost:8173/app.html';
const j = JSON.parse(fs.readFileSync(process.env.SBSES, 'utf8'));
const g = { u: j.usuario, url: 'https://xhaxmyvhygxynwjqrarm.supabase.co', key: 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG',
  access: j.access_token, refresh: j.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true };
const PANEL = { usuario: j.usuario, rol: process.env.ROL || 'admin', nombre: process.env.NOMBRE || j.usuario, ts: Date.now() };
const SEMBRAR = `;try{localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify(g))});localStorage.setItem('maleu_panel_session',${JSON.stringify(JSON.stringify(PANEL))});`
  + (a.includes('--forzar-jueves') ? `localStorage.setItem('maleu_frzrec_forzar','1');` : '') + `}catch(e){}
  ;(function(){var f=window.fetch;window.__cortadas=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
    var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
    var lee=m==='GET'||m==='HEAD'||/auth\\/v1\\/token/.test(s)||(r&&/(_pantalla|_datos|_base)$|^permiso_base$|^mi_deposito$|^tienda_vendedores$/.test(r[1]));
    if(!lee){window.__cortadas.push((r?r[1]:s.slice(0,60))+' '+String((x&&x.body)||'').slice(0,400));return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
    return f.apply(this,arguments);};})();`;
const clic = async (cli, sel) => {
  const b = await evaluar(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e||!e.offsetParent)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:e.innerText};})()`);
  if (!b) return null;
  await T(400);
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await T(1200); return b.t;
};
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SEMBRAR });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.navigate', { url: URL });
  await T(14000);
  /* --armar-local: marca armada la primera bolsa en ESTE celular (la escritura se corta) para que haya una parada en RUTA. */
  if (a.includes('--armar-local')) {
    await evaluar(cli, `try{go('ruta')}catch(e){}`); await T(4000);
    await evaluar(cli, `try{switchTab('armado')}catch(e){}`); await T(4000);
    let arm = await clic(cli, '#armadoView .armado-head');
    if (!arm) arm = await evaluar(cli, `(function(){try{var ps=getPendientes().filter(function(p){return p&&p.h!=='Red'&&!/PRUEBA/i.test(p.c||'')});if(!ps.length)return 'sin pendientes';var k=eKey(ps[0]);toggleArmado(k);return 'toggleArmado '+k;}catch(e){return 'err '+e.message}})()`);
    await T(800); await clic(cli, '#confirmOverlay .btn-si');   // «Sí, armado» (la escritura se corta)
    console.error('armé (local): ' + String(arm || 'nada').slice(0, 60));
    await T(2000);
  }
  for (let i = 0; i < 5; i++) {
    await evaluar(cli, `try{go('ruta')}catch(e){}`); await T(4000);
    await evaluar(cli, `try{switchTab('ruta')}catch(e){}`); await T(3000);
    const ok = await evaluar(cli, `(function(){var v=document.getElementById('rutaView');return !!(v&&!v.classList.contains('hidden')&&v.offsetParent)})()`).catch(() => false);
    if (ok) break;
  }
  await T(4000);
  const info = await evaluar(cli, `JSON.stringify({otro:(typeof RUT_MIDEP_INFO!=='undefined'&&RUT_MIDEP_INFO)?RUT_MIDEP_INFO.otro:'(sin dato)',sel:!!document.querySelector('.rtc-sale'),rec:(function(){var r=document.getElementById('rutFrzRec');return r&&!r.hidden?r.innerText.replace(/\\s+/g,' '):''})()})`).catch(() => '{}');
  let eligio = null, entrego = null;
  if (a.includes('--elegir')) eligio = await clic(cli, '.rtc-sale-seg button:not(.on)');
  let abrio = null;
  if (a.includes('--tocar-rec')) {   // el recordatorio abre Productos › Conteo con su freezer elegido
    await clic(cli, '.rut-frzrec-b'); await T(5000);
    abrio = await evaluar(cli, `(function(){var p=document.querySelector('.pg.on');return (p?p.id:'')+' · '+(typeof ST_TAB!=='undefined'?ST_TAB:'?')+' · '+(typeof DEP_SEL!=='undefined'?DEP_SEL:'?')})()`).catch(() => null);
  }
  if (a.includes('--entregar')) { entrego = await clic(cli, '.rtc-cta.entregar'); await clic(cli, '#confirmOverlay .btn-si'); await T(2500); }
  await evaluar(cli, `(function(){var r=document.getElementById('rutFrzRec');if(r&&!r.hidden){window.scrollTo(0,0);return}var s=document.querySelector('.rtc-sale')||document.querySelector('.rtc-bar');if(s)s.scrollIntoView({block:'center'});})()`);
  await T(800);
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
  const cortadas = await evaluar(cli, `JSON.stringify((window.__cortadas||[]).filter(function(x){return /marcarEntregado|entregar/.test(x)}))`).catch(() => '[]');
  const despues = await evaluar(cli, `JSON.stringify({sel:!!document.querySelector('.rtc-sale'),on:(document.querySelector('.rtc-sale-seg button.on')||{}).innerText||''})`).catch(() => '{}');
  console.log(JSON.stringify({ antes: JSON.parse(info), abrio, eligio, despues: JSON.parse(despues), entrego, mandaria: JSON.parse(cortadas), foto: OUT }));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
