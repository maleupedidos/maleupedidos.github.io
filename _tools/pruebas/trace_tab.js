/* EN QUÉ SE VA EL TIEMPO NATIVO (estilos, layout, pintado) al abrir una tab (29/10/2026). Complemento de perfil_tab.js:
   cuando el Profiler dice «(program)», el tiempo no es JavaScript.
     node _tools/pruebas/trace_tab.js <token> <tab|ficha> [--sin-freno]
   390 px, CPU x4, sesión real con POST cortados. Toma un trace (devtools.timeline) del toque hasta 1 s quieto y suma
   por evento: UpdateLayoutTree (recalcular estilos, con cuántos elementos), Layout (con cuántos nodos), Paint,
   Composite, FunctionCall/EvaluateScript (JS) y ParseHTML. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN, QUE] = process.argv.slice(2), SIN_FRENO = process.argv.includes('--sin-freno');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
async function centro(cli, sel) { return cdp.evaluar(cli, `(function(){var el=${sel};if(!el)return null;el.scrollIntoView({block:'center'});var r=el.getBoundingClientRect();if(!r.width||!r.height)return null;return {x:r.left+r.width/2,y:r.top+r.height/2}})()`); }
async function tocar(cli, sel) { const c = await centro(cli, sel); if (!c) return false; await pausa(150); const c2 = await centro(cli, sel); if (!c2) return false; for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: c2.x, y: c2.y, button: 'left', clickCount: 1 }); return true; }
const BN = (tab) => `(function(){var b=document.querySelector('.bn[data-p="${tab}"]');if(!b)return null;var r=b.getBoundingClientRect();return r.left>=0&&r.width>0?b:null})()`;
async function irA(cli, tab) { if (!(await centro(cli, BN(tab)))) { await tocar(cli, `[].slice.call(document.querySelectorAll('[onclick*="sbToggle"]')).filter(function(b){return !/backdrop/.test(b.className)&&b.getBoundingClientRect().width>0})[0]||null`); await pausa(700); } return tocar(cli, BN(tab)); }
(async () => {
  const cli = await cdp.abrir();
  const ev = [];
  try {
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;window.__lt=[];try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){__lt.push(e.startTime+e.duration)})}).observe({type:'longtask'})}catch(e){}` });
    await cli.enviar('Page.enable', {});
    cli.escuchar((m, p) => { if (m === 'Tracing.dataCollected') ev.push(...p.value); if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    if (!SIN_FRENO) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cli.enviar('Page.navigate', { url: process.env.BASE_URL || 'https://app.maleu.com.ar/app.html' });
    for (let i = 0; i < 160 && !(await cdp.evaluar(cli, `typeof go==='function'&&!!window._sbPerm&&window.D&&(D.pedidos||[]).length>0&&document.documentElement.classList.contains('listo')`).catch(() => false)); i++) await pausa(500);
    await pausa(5000);
    if (QUE === 'ficha') { await irA(cli, 'pedidos'); await pausa(6000); }
    if (QUE !== 'ficha' && process.argv.includes('--segunda')) { await irA(cli, QUE); await pausa(8000); await irA(cli, 'inicio'); await pausa(4000); }
    await cli.enviar('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
    const ok = QUE === 'ficha'
      ? await tocar(cli, `(function(){var l=[].slice.call(document.querySelectorAll('#p-pedidos [onclick*="openOrdDetail"]'));return l.filter(function(x){return x.getBoundingClientRect().height>0})[0]||null})()`)
      : await irA(cli, QUE);
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) { await pausa(250); const q = await cdp.evaluar(cli, `performance.now()-(__lt.length?Math.max.apply(null,__lt):0)`); if (q > 1000 && Date.now() - t0 > 1500) break; }
    const fin = new Promise((r) => cli.escuchar((m) => { if (m === 'Tracing.tracingComplete') r(); }));
    await cli.enviar('Tracing.end', {}); await fin;
    if (!ok) { console.log('no pude tocar', QUE); return; }
    const suma = {}, cuenta = {}, extra = {};
    const add = (k, d, x) => { suma[k] = (suma[k] || 0) + d; cuenta[k] = (cuenta[k] || 0) + 1; if (x) (extra[k] = extra[k] || []).push(x); };
    ev.forEach((e) => {
      if (e.ph !== 'X' || !e.dur) return;
      const d = e.dur / 1000, a = e.args || {}, dd = a.data || a.beginData || {};
      if (e.name === 'UpdateLayoutTree') add('Estilos (UpdateLayoutTree)', d, Math.round(d) + 'ms/' + (a.elementCount || dd.elementCount || '?') + 'el');
      else if (e.name === 'Layout') add('Layout', d, Math.round(d) + 'ms/' + ((a.beginData || {}).dirtyObjects || '?') + 'de' + ((a.beginData || {}).totalObjects || '?'));
      else if (e.name === 'Paint' || e.name === 'PaintImage' || e.name === 'RasterTask') add('Pintar', d);
      else if (e.name === 'PrePaint' || e.name === 'Layerize' || e.name === 'UpdateLayer' || e.name === 'CompositeLayers' || e.name === 'Commit') add('Capas/composición', d);
      else if (e.name === 'FunctionCall' || e.name === 'EvaluateScript' || e.name === 'TimerFire' || e.name === 'EventDispatch' || e.name === 'FireAnimationFrame') add('JS (' + e.name + ')', d);
      else if (e.name === 'ParseHTML') add('ParseHTML', d);
      else if (e.name === 'ScheduleStyleRecalculation' || e.name === 'InvalidateLayout') add(e.name, 0);
    });
    console.log('== ' + QUE);
    Object.keys(suma).sort((a, b) => suma[b] - suma[a]).forEach((k) => console.log('  ' + String(Math.round(suma[k])).padStart(6) + ' ms  ×' + String(cuenta[k]).padEnd(4) + k + (extra[k] ? '  ' + extra[k].sort((x, y) => parseInt(y) - parseInt(x)).slice(0, 6).join(' · ') : '')));
  } finally { cli.matar(); }
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
