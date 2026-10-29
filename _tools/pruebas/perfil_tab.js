/* QUÉ FUNCIÓN SE COME EL TIEMPO al abrir una tab o la ficha (29/10/2026). Complemento de medir_rapidez.js.
     node _tools/pruebas/perfil_tab.js <token> <tab|ficha> [--sin-freno]
   Sesión real con sesion_prep (POST cortados), 390 px, CPU x4. Prende el Profiler de CDP, toca la tab (o el nombre del
   primer pedido) y lo apaga cuando el hilo queda 1 s quieto. Imprime el tiempo PROPIO por función (con su línea en
   app.html) y el total por función contando lo que llama (las 15 primeras de cada una). */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN, QUE] = process.argv.slice(2), SIN_FRENO = process.argv.includes('--sin-freno');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
async function centro(cli, sel) {
  return cdp.evaluar(cli, `(function(){var el=${sel};if(!el)return null;el.scrollIntoView({block:'center'});var r=el.getBoundingClientRect();if(!r.width||!r.height)return null;return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
}
async function tocar(cli, sel) {
  const c = await centro(cli, sel); if (!c) return false; await pausa(150);
  const c2 = await centro(cli, sel); if (!c2) return false;
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: c2.x, y: c2.y, button: 'left', clickCount: 1 });
  return true;
}
const BN = (tab) => `(function(){var b=document.querySelector('.bn[data-p="${tab}"]');if(!b)return null;var r=b.getBoundingClientRect();return r.left>=0&&r.width>0?b:null})()`;
async function irA(cli, tab) {
  if (!(await centro(cli, BN(tab)))) { await tocar(cli, `[].slice.call(document.querySelectorAll('[onclick*="sbToggle"]')).filter(function(b){return !/backdrop/.test(b.className)&&b.getBoundingClientRect().width>0})[0]||null`); await pausa(700); }
  return tocar(cli, BN(tab));
}
(async () => {
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;window.__lt=[];try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){__lt.push(e.startTime+e.duration)})}).observe({type:'longtask'})}catch(e){}` });
    await cli.enviar('Page.enable', {});
    cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    if (!SIN_FRENO) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cli.enviar('Page.navigate', { url: process.env.BASE_URL || 'https://app.maleu.com.ar/app.html' });
    for (let i = 0; i < 160 && !(await cdp.evaluar(cli, `typeof go==='function'&&!!window._sbPerm&&window.D&&(D.pedidos||[]).length>0&&!document.getElementById('boot')`).catch(() => false)); i++) await pausa(500);
    await pausa(5000);
    if (QUE === 'ficha') { await irA(cli, 'pedidos'); await pausa(6000); }
    /* La tab ya abierta una vez (la segunda es la que importa: la primera arma la sub-app). */
    if (QUE !== 'ficha' && process.argv.includes('--segunda')) { await irA(cli, QUE); await pausa(8000); await irA(cli, 'inicio'); await pausa(4000); }
    await cli.enviar('Profiler.enable', {}); await cli.enviar('Profiler.setSamplingInterval', { interval: 200 }); await cli.enviar('Profiler.start', {});
    const ok = QUE === 'ficha'
      ? await tocar(cli, `(function(){var l=[].slice.call(document.querySelectorAll('#p-pedidos [onclick*="openOrdDetail"]'));return l.filter(function(x){return x.getBoundingClientRect().height>0})[0]||null})()`)
      : await irA(cli, QUE);
    if (!ok) { console.log('no pude tocar', QUE); return; }
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) { await pausa(250); const q = await cdp.evaluar(cli, `performance.now()-(__lt.length?Math.max.apply(null,__lt):0)`); if (q > 1000 && Date.now() - t0 > 1500) break; }
    const { profile } = await cli.enviar('Profiler.stop', {});
    const nodos = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map(), dt = profile.timeDeltas; const cnt = new Map();
    profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)));
    const nombre = (n) => { const f = n.callFrame; return (f.functionName || '(anónima)') + (f.url ? ' ' + f.url.split('/').pop().split('?')[0] + ':' + (f.lineNumber + 1) : ''); };
    for (const [id, us] of cnt) { const k = nombre(nodos.get(id)); self.set(k, (self.get(k) || 0) + us); }
    /* total = propio + hijos */
    const padre = new Map(); profile.nodes.forEach((n) => (n.children || []).forEach((c) => padre.set(c, n.id)));
    const total = new Map();
    for (const [id, us] of cnt) { const vistos = new Set(); let x = id; while (x) { const k = nombre(nodos.get(x)); if (!vistos.has(k)) { vistos.add(k); total.set(k, (total.get(k) || 0) + us); } x = padre.get(x); } }
    const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, us]) => '  ' + String(Math.round(us / 1000)).padStart(6) + ' ms  ' + k).join('\n');
    console.log('== ' + QUE + ' · PROPIO\n' + top(self) + '\n== ' + QUE + ' · TOTAL (con lo que llama)\n' + top(total));
  } finally { cli.matar(); }
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
