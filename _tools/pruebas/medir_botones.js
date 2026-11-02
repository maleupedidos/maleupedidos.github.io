/* CUÁNTO TARDA LA PANTALLA EN CAMBIAR DESPUÉS DE CADA BOTÓN (2/11/2026).
     node _tools/pruebas/medir_botones.js <token> <tab> [--max 30] [--json salida.json] [--solo <regex>]
     BASE_URL=http://localhost:8150/app.html node …   ← para medir lo local antes de publicar
   Sesión real con sesion_prep (todo POST cortado: no escribe nada), 390 px, CPU ×4, la tab abierta por SEGUNDA vez.
   Junta los botones visibles de #p-<tab> (uno por tipo: el onclick sin números ni textos entre comillas), y por cada
   uno: vuelve a la tab, lo toca con un toque real de CDP y mide en la página:
     · cambia: del toque al primer cuadro pintado después del primer cambio del DOM (doble rAF). Es lo que ve el dedo.
     · evento: la duración que da el navegador para ese click (PerformanceEventTiming: handler + estilo + pintado).
     · largas: ms de tareas largas (> 50 ms) en los 1,5 s después del toque: trabajo de fondo encima del toque.
   «sin cambio» = el DOM no se movió en 2 s (un botón que no hace nada visible, o que espera la red).
   Afuera, a propósito: la barra de tabs, salir, recargar, links externos, archivos, imprimir, y en Ruta los cinco de Supa
   (entregar, cobrar, descargar, parcial, bolsa) y cancelar en todas. */
'use strict';
const fs = require('fs');
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const args = process.argv.slice(2), [TOKEN, TAB] = args;
const MAX = Number(args.includes('--max') ? args[args.indexOf('--max') + 1] : 30) || 30;
const SALIDA = args.includes('--json') ? args[args.indexOf('--json') + 1] : '';
const SOLO = args.includes('--solo') ? new RegExp(args[args.indexOf('--solo') + 1], 'i') : null;
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
if (!TOKEN || !TAB) { console.error('uso: medir_botones.js <token> <tab>'); process.exit(2); }
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
/* --perfil: el Profiler de CDP alrededor de cada toque; imprime las funciones que mas tiempo se llevan (con lo que llaman). */
const PERFIL = args.includes('--perfil');
function imprimirPerfil(profile, que) {
  const nodos = new Map(profile.nodes.map((n) => [n.id, n])), padre = new Map(), cnt = new Map();
  profile.nodes.forEach((n) => (n.children || []).forEach((c) => padre.set(c, n.id)));
  profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  const nombre = (n) => { const f = n.callFrame; return (f.functionName || '(anónima)') + (f.url ? ' ' + f.url.split('/').pop().split('?')[0] + ':' + (f.lineNumber + 1) : ''); };
  const self = new Map(), total = new Map();
  for (const [id, us] of cnt) {
    const k = nombre(nodos.get(id)); self.set(k, (self.get(k) || 0) + us);
    const vistos = new Set(); let x = id; while (x) { const kk = nombre(nodos.get(x)); if (!vistos.has(kk)) { vistos.add(kk); total.set(kk, (total.get(kk) || 0) + us); } x = padre.get(x); }
  }
  const top = (m, n) => [...m.entries()].filter(([k]) => !/^\((program|idle|root|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => '        ' + String(Math.round(us / 1000)).padStart(5) + ' ms  ' + k).join('\n');
  console.log('     perfil de «' + String(que).slice(0, 40) + '» · TOTAL\n' + top(total, 14) + '\n     PROPIO\n' + top(self, 8));
}
const AFUERA = /logout|cerrarSesion|refreshDuro|recargar|location\.|window\.open|print\(|wa\.me|tel:|mailto|share|navigator\.|\.pdf|descargarPdf|sbToggle|cancel/i;
const AFUERA_RUTA = /entreg|cobr|descarg|parcial|bolsa|vendedor/i;
/* Lo que cambia de sub-tab: despues de medirlo se recorre tambien lo que aparece adentro. */
const SUBTAB = /switchTab\(|SwitchTab\(|[sS]ubTab|setTab\(|cjTab\(|pedTab\(|stockTab\(|toggleSem\(/;
const esRutaSupa = (b) => TAB === 'ruta' && !SUBTAB.test(b.oc) && AFUERA_RUTA.test(b.oc + ' ' + b.tx);

const OBS = `(function(){
  window.__lt=[]; window.__ev=[]; window.__m=null;
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ __lt.push({s:e.startTime,d:e.duration}); }); }).observe({type:'longtask',buffered:true}); }catch(e){}
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ if(e.name==='click'||e.name==='pointerup'||e.name==='pointerdown') __ev.push({n:e.name,s:e.startTime,d:e.duration}); }); }).observe({type:'event',durationThreshold:16,buffered:true}); }catch(e){}
  document.addEventListener('pointerdown',function(){ window.__m={t:performance.now(),mut:null,frame:null}; },true);
  function mo(){ new MutationObserver(function(){ var m=window.__m; if(m&&m.mut==null){ m.mut=performance.now(); requestAnimationFrame(function(){ requestAnimationFrame(function(){ m.frame=performance.now(); }); }); } })
    .observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true}); }
  if(document.documentElement) mo(); else document.addEventListener('DOMContentLoaded',mo);
})();`;

async function centro(cli, sel) {
  return cdp.evaluar(cli, `(function(){var el=${sel};if(!el)return null;el.scrollIntoView({block:'center'});var r=el.getBoundingClientRect();if(!r.width||!r.height)return null;return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
}
async function tocarXY(cli, c) { for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: 'left', clickCount: 1 }); }
async function tocar(cli, sel) { const c = await centro(cli, sel); if (!c) return false; await pausa(120); const c2 = await centro(cli, sel); if (!c2) return false; await tocarXY(cli, c2); return true; }
const BN = (tab) => `(function(){var b=document.querySelector('.bn[data-p="${tab}"]');if(!b)return null;var r=b.getBoundingClientRect();return r.left>=0&&r.width>0?b:null})()`;
async function irA(cli, tab) {
  if (!(await centro(cli, BN(tab)))) { await tocar(cli, `[].slice.call(document.querySelectorAll('[onclick*="sbToggle"]')).filter(function(b){return !/backdrop/.test(b.className)&&b.getBoundingClientRect().width>0})[0]||null`); await pausa(700); }
  return tocar(cli, BN(tab));
}
/* Los botones de la tab, uno por tipo, en el orden de la pantalla. */
const JUNTAR = (tab, max) => `(function(){
  var raiz=document.getElementById('p-${tab}'); if(!raiz) return [];
  var vis=function(el){ var r=el.getBoundingClientRect(); if(!r.width||!r.height) return false; var s=getComputedStyle(el); return s.visibility!=='hidden'&&s.display!=='none'&&s.pointerEvents!=='none'&&!el.disabled; };
  var els=[].slice.call(raiz.querySelectorAll('button,[onclick],a[href],.chip,.tab,[role=button],input[type=checkbox],select'));
  var vistos={}, out=[];
  els.forEach(function(el,i){
    if(out.length>=${max}||!vis(el)) return;
    if(el.closest('[onclick]')&&el.closest('[onclick]')!==el&&!el.getAttribute('onclick')) return;
    var oc=el.getAttribute('onclick')||'', tx=(el.innerText||el.value||el.getAttribute('aria-label')||el.title||'').trim().replace(/\\s+/g,' ').slice(0,40);
    if(!oc&&el.tagName!=='SELECT'&&el.tagName!=='INPUT'&&!(el.tagName==='A'&&/^#|javascript/.test(el.getAttribute('href')||''))&&el.tagName!=='BUTTON') return;
    var firma=el.tagName+'|'+oc.replace(/\\d+/g,'N').replace(/'[^']{13,}'|"[^"]{13,}"/g,'S').slice(0,90)+'|'+(oc?'':tx);
    if(vistos[firma]) return; vistos[firma]=1;
    out.push({i:out.length,firma:firma,oc:oc.slice(0,120),tx:tx,tag:el.tagName});
  });
  return out;
})()`;
const ELEM = (tab, firma) => `(function(){
  var raiz=document.getElementById('p-${tab}'); if(!raiz) return null; var f=${JSON.stringify(firma)};
  var els=[].slice.call(raiz.querySelectorAll('button,[onclick],a[href],.chip,.tab,[role=button],input[type=checkbox],select'));
  for(var i=0;i<els.length;i++){ var el=els[i], r=el.getBoundingClientRect(); if(!r.width||!r.height) continue;
    var oc=el.getAttribute('onclick')||'', tx=(el.innerText||el.value||el.getAttribute('aria-label')||el.title||'').trim().replace(/\\s+/g,' ').slice(0,40);
    if(el.tagName+'|'+oc.replace(/\\d+/g,'N').replace(/'[^']{13,}'|"[^"]{13,}"/g,'S').slice(0,90)+'|'+(oc?'':tx)===f) return el; }
  return null; })()`;
/* Lo que el toque dejó abierto: modales y overlays fijos que no estaban antes. */
const FOTO_FIJOS = `(function(){ window.__fijosAntes=[].slice.call(document.querySelectorAll('body *')).filter(function(e){var s=getComputedStyle(e);return (s.position==='fixed')&&e.getBoundingClientRect().height>0;}); return window.__fijosAntes.length; })()`;
const CERRAR = `(function(){ var antes=window.__fijosAntes||[], n=0;
  [].slice.call(document.querySelectorAll('body *')).forEach(function(e){ var s=getComputedStyle(e); if(s.position==='fixed'&&e.getBoundingClientRect().height>0&&antes.indexOf(e)<0){ e.style.display='none'; n++; } });
  try{ document.activeElement&&document.activeElement.blur(); }catch(e){}
  return n; })()`;

async function irTab(cli, camino) {
  await cdp.evaluar(cli, `go('${TAB}')`).catch(() => {}); await pausa(1500);
  await cdp.evaluar(cli, `window.scrollTo(0,0)`).catch(() => {});
  for (const f of camino || []) { const c = await centro(cli, ELEM(TAB, f)); if (c) { await tocarXY(cli, c); await pausa(1500); } }
}
async function arrancar(cli) {
  await cli.enviar('Page.navigate', { url: URL });
  for (let i = 0; i < 200 && !(await cdp.evaluar(cli, `typeof go==='function'&&!!window._sbPerm&&window.D&&(D.pedidos||[]).length>0&&document.documentElement.classList.contains('listo')`).catch(() => false)); i++) await pausa(500);
  await pausa(4000);
  await irTab(cli); await pausa(8000); await cdp.evaluar(cli, `go('${TAB === 'pedidos' ? 'caja' : 'pedidos'}')`).catch(() => {}); await pausa(4000);
}

(async () => {
  const cli = await cdp.abrir();
  const filas = [];
  try {
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ';' + OBS });
    await cli.enviar('Page.enable', {});
    cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: false }).catch(() => {}); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
    await arrancar(cli);
    await irTab(cli); await pausa(3000);
    const filtrar = (l) => l.filter((b) => b.tag !== 'SELECT' && !AFUERA.test(b.oc + ' ' + b.tx) && !esRutaSupa(b) && (!SOLO || SOLO.test(b.oc + ' ' + b.tx)));
    const vistas = new Set();
    let cola = filtrar(await cdp.evaluar(cli, JUNTAR(TAB, 200))).map((b) => ({ ...b, camino: [] }));
    cola.forEach((b) => vistas.add(b.firma));
    console.log('== ' + TAB + ' (' + URL.replace(/^https?:\/\//, '') + ')');
    let desdeRecarga = 0, medidos = 0;
    while (cola.length && medidos < MAX) {
      const b = cola.shift();
      if (desdeRecarga >= 10) { await arrancar(cli); desdeRecarga = 0; }
      await irTab(cli, b.camino);
      const c = await centro(cli, ELEM(TAB, b.firma));
      if (!c) { filas.push({ b, err: 'no visible' }); console.log('   --   ' + (b.tx || b.oc).slice(0, 50) + '  (no lo encontré visible)'); continue; }
      await cdp.evaluar(cli, FOTO_FIJOS); await pausa(400);
      const c2 = await centro(cli, ELEM(TAB, b.firma)) || c;
      await cdp.evaluar(cli, 'window.__m=null;window.__ev=[];window.__lt=[]');
      if (PERFIL) { await cli.enviar('Profiler.enable', {}); await cli.enviar('Profiler.setSamplingInterval', { interval: 200 }); await cli.enviar('Profiler.start', {}); }
      await tocarXY(cli, c2);
      await pausa(2000);
      if (PERFIL) imprimirPerfil((await cli.enviar('Profiler.stop', {})).profile, b.tx || b.oc);
      const m = await cdp.evaluar(cli, `(function(){var m=window.__m||{};var t=m.t||0;
        var ev=(window.__ev||[]).filter(function(e){return e.s>=t-5;}).reduce(function(a,e){return Math.max(a,e.d);},0);
        var lt=(window.__lt||[]).filter(function(e){return e.s>=t-5&&e.s<t+1500;}).reduce(function(a,e){return a+e.d;},0);
        return {cambia:m.frame?Math.round(m.frame-t):null,evento:Math.round(ev),largas:Math.round(lt),err:(window.__err||[]).slice(-1)[0]||''};})()`);
      medidos++; desdeRecarga++;
      filas.push({ b: { firma: b.firma, oc: b.oc, tx: b.tx, camino: b.camino }, ...m });
      const tCambia = m.cambia == null ? 'sin cambio' : (m.cambia + ' ms');
      const peor = Math.max(m.cambia || 0, m.evento || 0);
      const donde = b.camino.length ? '[' + b.camino.map((f) => f.split('|')[1].slice(0, 22)).join(' > ') + '] ' : '';
      console.log('  ' + (peor > 300 ? 'LENTO' : ' ok  ') + ' ' + String(tCambia).padStart(10) + ' · evento ' + String(m.evento).padStart(4) + ' · largas ' + String(m.largas).padStart(4) + '  ' + donde + (b.tx || '').slice(0, 30).padEnd(30) + '  ' + b.oc.slice(0, 60));
      /* Una sub-tab: lo nuevo que aparece adentro va a la cola, con el camino para volver. */
      if (SUBTAB.test(b.oc) && b.camino.length < 2) {
        const nuevos = filtrar(await cdp.evaluar(cli, JUNTAR(TAB, 200))).filter((x) => !vistas.has(x.firma));
        nuevos.forEach((x) => { vistas.add(x.firma); cola.push({ ...x, camino: b.camino.concat([b.firma]) }); });
      }
      await cdp.evaluar(cli, CERRAR); await cli.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' }).catch(() => {});
    }
  } finally {
    if (SALIDA) fs.writeFileSync(SALIDA, JSON.stringify({ tab: TAB, url: URL, filas }, null, 1));
    cli.matar();
  }
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
