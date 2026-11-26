/* «¿DE QUÉ FREEZER LO SACASTE?» EN RUTA (735, 16/11/2026; antes el selector «Sale de», 734), con datos reales y SIN escribir nada.
     SBSES=<ses.json> ROL=<rol> NOMBRE=<nombre> [ANCHO=390] node _tools/pruebas/probar_sale_de_ruta.js <salida.png>
       [--armar-local] [--entregar [--cerrar | --elegir=ustariz|moresco]] [--intro-ok] [--forzar-jueves] [--tocar-rec] [--medir] [--mitad]
   Entra como esa persona (sesión temporal de sesion_prueba.py), abre Ruta › RUTA y mira la tarjeta del pedido que esté en
   pantalla. Toda escritura se CORTA y se anota (la base no se entera): así se puede tocar «Entregado» y la respuesta a la
   pregunta sobre un pedido real y leer qué habría mandado (`saleDe`).
     --entregar         toca Entregado y anota lo que aparece (`alTocar`): a Lucas la hoja, a Tatu el «¿Entregado?» de siempre
                        (que se confirma). Sin --cerrar ni --elegir la foto sale con la hoja abierta.
     --cerrar           toca «Volver» en la hoja: no se tiene que haber mandado ninguna entrega.
     --elegir=<dep>     toca el botón de ese freezer: tiene que salir UNA entrega con ese `saleDe`.
     --intro-ok         toca «Entendido» en la presentación, recarga la app y anota si volvió a salir (`introAlRecargar`).
   Lo que deja marcado en ese celular de prueba (entregados en localStorage) muere con el perfil temporal del Chrome. */
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
  + (a.includes('--forzar-jueves') ? `localStorage.setItem('maleu_frzrec_forzar','1');` : '')
  /* --midep-guardado: la copia de `mi_deposito` que dejó una sesión anterior en el celular (735). Con --sin-midep (la base
     no contesta `mi_deposito`, como sin señal) es la única forma de saber que hay otro freezer. */
  + (a.includes('--midep-guardado') ? `localStorage.setItem('maleu_rut_midep',${JSON.stringify(JSON.stringify({ u: String(process.env.MIDEP_U || j.usuario).toLowerCase(), d: { ok: true, principal: 'ustariz', otro: 'moresco', otroNombre: 'Moresco', otroN: 1 } }))});` : '')
  + `}catch(e){}
  ;window.__sinMidep=${a.includes('--sin-midep') ? 'true' : 'false'};
  ;(function(){var f=window.fetch;window.__cortadas=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
    var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
    var lee=m==='GET'||m==='HEAD'||/auth\\/v1\\/token/.test(s)||(r&&/(_pantalla|_datos|_base)$|^permiso_base$|^mi_deposito$|^ruta_ultima_salida$|^tienda_vendedores$/.test(r[1]));
    if(window.__sinMidep&&r&&r[1]==='mi_deposito')return new Promise(function(){});   /* --sin-midep: nunca contesta */
    if(!lee){window.__cortadas.push((r?r[1]:s.slice(0,60))+' '+String((x&&x.body)||'').slice(0,400));return new Promise(function(){});}   /* «en vuelo» para siempre: queda en la cola sin marcarse como falla (sin cartel rojo) y la base no se entera */
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
  const ANCHO = Number(process.env.ANCHO || 390);
  /* El armado local se hace a 390 (a 375 no prende: la herramienta, no la app) y después se pasa al ancho pedido. */
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: a.includes('--armar-local') ? 390 : ANCHO, height: 844, deviceScaleFactor: 1, mobile: true });
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
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: true });
    await T(2000);
  }
  for (let i = 0; i < 5; i++) {
    await evaluar(cli, `try{go('ruta')}catch(e){}`); await T(4000);
    await evaluar(cli, `try{switchTab('ruta')}catch(e){}`); await T(3000);
    const ok = await evaluar(cli, `(function(){var v=document.getElementById('rutaView');return !!(v&&!v.classList.contains('hidden')&&v.offsetParent)})()`).catch(() => false);
    if (ok) break;
  }
  await T(4000);
  const irRuta = async () => {
    for (let i = 0; i < 5; i++) {
      await evaluar(cli, `try{go('ruta')}catch(e){}`); await T(4000);
      await evaluar(cli, `try{switchTab('ruta')}catch(e){}`); await T(3000);
      const ok = await evaluar(cli, `(function(){var v=document.getElementById('rutaView');return !!(v&&!v.classList.contains('hidden')&&v.offsetParent)})()`).catch(() => false);
      if (ok) break;
    }
    await T(3000);
  };
  const ESTADO = `JSON.stringify({otro:(typeof RUT_MIDEP_INFO!=='undefined'&&RUT_MIDEP_INFO)?RUT_MIDEP_INFO.otro:'(sin dato)',
    selectorViejo:!!document.querySelector('.rtc-sale'),
    intro:(function(){var r=document.getElementById('rutFrzIntro');return r&&!r.hidden&&r.offsetParent?r.innerText.replace(/\\s+/g,' '):''})(),
    rec:(function(){var r=document.getElementById('rutFrzRec');return r&&!r.hidden?r.innerText.replace(/\\s+/g,' '):''})(),
    hoja:(function(){var o=document.getElementById('rutFrzOv');return o?o.innerText.replace(/\\s+/g,' '):''})(),
    confirma:(function(){var o=document.getElementById('confirmOverlay');return o&&!o.classList.contains('hidden')?o.innerText.replace(/\\s+/g,' '):''})(),
    entregas:(window.__cortadas||[]).filter(function(x){return /marcarEntregado/.test(x)}).length,
    botonEntregado:!!document.querySelector('.rtc-cta.entregar'),
    preguntaria:(typeof _rutFrzPregunta==='function')?_rutFrzPregunta([{h:'Home',id:'0'}]):'(no está)'})`;
  const estado = () => evaluar(cli, ESTADO).then(JSON.parse).catch((e) => ({ err: String(e) }));
  const info = await estado();
  let introAlRecargar = null, alTocar = null, alResponder = null, entrego = null;
  if (a.includes('--intro-ok')) {
    await evaluar(cli, `window.scrollTo(0,0)`);
    await clic(cli, '.rut-frzintro-b');
    const tras = await estado();
    await cli.enviar('Page.reload', {}); await T(14000); await irRuta();
    introAlRecargar = { alTocarEntendido: tras.intro, alRecargar: (await estado()).intro };
  }
  let abrio = null;
  if (a.includes('--tocar-rec')) {   // el recordatorio abre Productos › Conteo con su freezer elegido
    await clic(cli, '.rut-frzrec-b'); await T(5000);
    abrio = await evaluar(cli, `(function(){var p=document.querySelector('.pg.on');return (p?p.id:'')+' · '+(typeof ST_TAB!=='undefined'?ST_TAB:'?')+' · '+(typeof DEP_SEL!=='undefined'?DEP_SEL:'?')})()`).catch(() => null);
  }
  const elegir = (a.find((x) => x.startsWith('--elegir=')) || '').split('=')[1] || '';
  if (a.includes('--entregar')) {
    /* --cobrar: el cuarto camino, Cobrar con «también entregado» (viene tildado): abre el cobro y lo confirma. */
    if (a.includes('--cobrar')) { const c1 = await clic(cli, '#btnCobrado'); await T(1500); await evaluar(cli, `(function(){var t=(document.getElementById('cobroSumPed')||{}).textContent||'',i=document.getElementById('cobroRecEf');if(!i)return;i.value=t.replace(/[^0-9]/g,'');i.dispatchEvent(new Event('input',{bubbles:true}));var o=document.getElementById('cobroRutaOverlay');[].some.call(o?o.querySelectorAll('button'):[],function(x){if(String(x.innerText||'').trim()==='Lucas'){x.click();return true;}return false;});})()`); await T(800); const c2 = await clic(cli, '#btnCobroRutaOk'); entrego = (c1 && c2) ? 'Cobrar → ' + String(c2).replace(/\s+/g, ' ') : null; }
    else entrego = await clic(cli, '.rtc-cta.entregar');
    /* Sin parada en pantalla (el armado local lo pisa Ruta en vivo cuando hay reparto real andando): lo mismo que hace el
       botón, sobre el primer pedido pendiente que no es de Red. Pasa por la misma hoja, los mismos botones y la misma cola. */
    if (!entrego && !a.includes('--cobrar')) entrego = await evaluar(cli, `(function(){try{var ps=getPendientes().filter(function(p){return p&&p.h!=='Red'&&!/PRUEBA/i.test(p.c||'')});if(!ps.length)return null;confirmarEntregado(eKey(ps[0]));return 'confirmarEntregado('+eKey(ps[0])+') directo';}catch(e){return 'err '+e.message}})()`).catch(() => null);
    await T(1500);
    alTocar = await estado();
    if (alTocar.hoja) {
      if (a.includes('--cerrar')) { await clic(cli, '#rutFrzOv .rut-frz-volver'); await T(2500); alResponder = await estado(); }
      else if (elegir) { await clic(cli, '#rutFrzOv .rut-frz-b[data-dep="' + elegir + '"]'); await T(2500); alResponder = await estado(); }
    } else if (alTocar.confirma && !a.includes('--cerrar')) { await clic(cli, '#confirmOverlay .btn-si'); await T(2500); alResponder = await estado(); }
  }
  await evaluar(cli, `(function(){var i=document.getElementById('rutFrzIntro'),r=document.getElementById('rutFrzRec');if((i&&!i.hidden)||(r&&!r.hidden)){window.scrollTo(0,0);return}var s=document.querySelector('.rtc-bar');if(s)s.scrollIntoView({block:'center'});})()`);
  await evaluar(cli, `(function(){var st=document.createElement('style');st.textContent='.toast,[id$="Toast"],[id$="toast"],[class*="toast"]{display:none!important}';document.head.appendChild(st);})()`);
  if (a.includes('--mitad')) await evaluar(cli, `(function(){var c=document.querySelector('#rutaBody article')||document.getElementById('rutaBody');if(!c)return;var r=c.getBoundingClientRect();window.scrollTo(0,scrollY+r.top+r.height/2-innerHeight/2);})()`);
  await T(800);
  let medida = null;
  if (a.includes('--medir')) {
    const src = fs.readFileSync(require('path').join(__dirname, 'pisadas.js'), 'utf8');
    const ini = src.indexOf('const MEDIR = String(') + 'const MEDIR = String('.length, fin = src.indexOf('\n});\n', ini) + 2;
    const fn = src.slice(ini, fin);
    medida = await evaluar(cli, `JSON.stringify((function(){var m=(${fn})(true);return {pisadas:m.pisadas,cortados:m.cortados,scroll:m.scroll,botones:m.botones.filter(function(b){return /rut-frz|rtc-cta|rtc-bar/.test(b.el)}),espaciado:m.espaciado.length};})())`).catch((e) => 'err ' + e.message);
    /* La barra fija contra el contenido: el final de la tarjeta tiene que quedar arriba de la barra al llegar al fondo. */
    const tapa = await evaluar(cli, `(function(){window.scrollTo(0,document.documentElement.scrollHeight);var b=document.getElementById('rutaActions'),c=document.querySelector('#rutaBody article');if(!b||!c)return 'sin barra o tarjeta';var rb=b.getBoundingClientRect(),rc=c.getBoundingClientRect();return 'barra '+Math.round(rb.height)+'px · fin de la tarjeta '+Math.round(rc.bottom)+' · arranque de la barra '+Math.round(rb.top)+(rc.bottom<=rb.top+1?' · NO tapa':' · TAPA '+Math.round(rc.bottom-rb.top)+'px');})()`).catch(() => null);
    medida = String(medida) + ' | ' + tapa;
    if (a.includes('--mitad')) await evaluar(cli, `(function(){var c=document.querySelector('#rutaBody article');if(!c)return;var r=c.getBoundingClientRect();window.scrollTo(0,scrollY+r.top+r.height/2-innerHeight/2);})()`);
    await T(500);
  }
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
  const cortadas = await evaluar(cli, `JSON.stringify((window.__cortadas||[]).filter(function(x){return /marcarEntregado/.test(x)}).map(function(x){var m=/"saleDe":"([a-z]+)"/.exec(x);return {saleDe:m?m[1]:'(no viaja)',orden:x.slice(0,160)};}))`).catch(() => '[]');
  /* La cola manda de a una: si antes quedó una escritura cortada «en vuelo» (el Armado de --armar-local), la entrega
     espera detrás y nunca llega a `__cortadas`. Lo que importa es lo que quedó en la cola (`maleu_ruta.syncQueue`). */
  const enCola = await evaluar(cli, `JSON.stringify(((JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue)||[]).filter(function(q){return q&&/^marcar(Entregado|Cobrado)$/.test(q.action)}).map(function(q){return {action:q.action,hoja:q.hoja,id:q.id,saleDe:q.saleDe||'(no viaja)'};}))`).catch(() => '[]');
  const lleva = await evaluar(cli, `(document.querySelector('#rutaBody .rtc-grp.dep')||{}).textContent||''`).catch(() => '');
  console.log(JSON.stringify({ medida, antes: info, introAlRecargar, abrio, entrego, alTocar, alResponder, lleva, mandaria: JSON.parse(cortadas), enCola: JSON.parse(enCola), foto: OUT }, null, 1));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
