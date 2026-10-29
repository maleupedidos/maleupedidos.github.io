/* CUÁNTO TARDA EL ERP EN SENTIRSE (29/10/2026). Tadeo: «que el ERP se SIENTA rápido».
     node _tools/pruebas/medir_rapidez.js <token> [--sin-freno] [--ancho 390|1440] [--json salida.json]
   Sesión real contra producción, con sesion_prep (todo POST interceptado: no escribe nada). Simula su iPhone: 390 px,
   CPU x4 más lenta (Emulation.setCPUThrottlingRate) y 4G (4 Mbps / 1 Mbps, 150 ms). Mide con lo que mide el navegador:
     · TOQUE → PINTA: `PerformanceEventTiming` del click (handler + estilo + layout + el primer pintado después). Es lo
       que el dedo siente como «respondió». > 200 ms se nota.
     · HASTA PODER TOCAR: desde el toque hasta que (a) está lo que se fue a buscar y (b) el hilo principal queda 400 ms
       sin una tarea larga (`longtask`, > 50 ms). Una tarea larga es un toque que no responde.
     · LA SEÑAL EN VIVO: se dispara por el mismo repartidor que usa el websocket (`_ENV.canales[canal].alCambio`), con
       pedidos reales, y se suma el tiempo bloqueado (longtask) hasta que se calma.
   Cada paso se mide con los toques REALES de CDP (Input.dispatchMouseEvent en el centro del elemento), no con .click(). */
'use strict';
const fs = require('fs');
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const args = process.argv.slice(2), TOKEN = args[0];
const SIN_FRENO = args.includes('--sin-freno');
const ANCHO = Number((args[args.indexOf('--ancho') + 1]) || 0) || 390;
const SALIDA = args.includes('--json') ? args[args.indexOf('--json') + 1] : '';
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const OBS = `(function(){
  window.__lt=[]; window.__ev=[]; window.__tap=0;
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ __lt.push({s:e.startTime,d:e.duration}); }); }).observe({type:'longtask',buffered:true}); }catch(e){}
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ if(e.name==='click'||e.name==='pointerup'||e.name==='pointerdown') __ev.push({n:e.name,s:e.startTime,d:e.duration,ps:e.processingStart,pe:e.processingEnd}); }); }).observe({type:'event',durationThreshold:16,buffered:true}); }catch(e){}
  addEventListener('pointerdown',function(e){ window.__tap=performance.now(); },true);
})();`;
async function centro(cli, sel) {
  return cdp.evaluar(cli, `(function(){var el=${sel};if(!el)return null;el.scrollIntoView({block:'center'});var r=el.getBoundingClientRect();if(!r.width||!r.height)return null;return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
}
async function tocar(cli, sel) {
  const c = await centro(cli, sel); if (!c) return false;
  await pausa(150);
  const c2 = await centro(cli, sel); if (!c2) return false;
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: c2.x, y: c2.y, button: 'left', clickCount: 1 });
  return true;
}
/* Ir a una tab como en el celular: si la barra está escondida (el cajón, a 390 px), primero el botón del cajón; el
   tiempo se mide desde el toque en la TAB. Devuelve false si no la encontró (y entonces no se mide nada). */
const BN = (tab) => `(function(){var b=document.querySelector('.bn[data-p="${tab}"]');if(!b)return null;var r=b.getBoundingClientRect();return r.left>=0&&r.width>0?b:null})()`;
async function irA(cli, tab) {
  if (!(await centro(cli, BN(tab)))) {
    await tocar(cli, `[].slice.call(document.querySelectorAll('[onclick*="sbToggle"]')).filter(function(b){return !/backdrop/.test(b.className)&&b.getBoundingClientRect().width>0})[0]||null`);
    await pausa(700);
  }
  const ok = await tocar(cli, BN(tab));
  if (!ok) console.log('   (no encontré la tab ' + tab + ')');
  return ok;
}
/* Desde el último toque: espera `listo` (una expresión) y 400 ms sin tareas largas. Devuelve tiempos. */
async function medir(cli, listo, tope) {
  const t0 = Date.now(); tope = tope || 45000;
  let ok = false;
  while (Date.now() - t0 < tope) {
    await pausa(100);
    const r = await cdp.evaluar(cli, `(function(){var t=window.__tap||0,now=performance.now();var lt=__lt.filter(function(x){return x.s+x.d>t});var fin=lt.length?Math.max.apply(null,lt.map(function(x){return x.s+x.d})):t;var ok=!!(${listo});return {ok:ok,quieto:now-fin,fin:fin-t}})()`).catch(() => null);
    if (r && r.ok && r.quieto > 400) { ok = true; break; }
  }
  return cdp.evaluar(cli, `(function(){var t=window.__tap||0;var lt=__lt.filter(function(x){return x.s+x.d>t});var ev=__ev.filter(function(x){return x.s>=t-5&&x.n==='click'});var bloq=lt.reduce(function(a,x){return a+x.d},0);var fin=lt.length?Math.max.apply(null,lt.map(function(x){return x.s+x.d})):t;
    return {listo:${ok},toquePinta:ev.length?Math.round(ev[0].d):null,handler:ev.length?Math.round(ev[0].pe-ev[0].ps):null,hastaTocar:Math.round(Math.max(fin-t,0)),bloqueado:Math.round(bloq),tareasLargas:lt.length,mayor:lt.length?Math.round(Math.max.apply(null,lt.map(function(x){return x.d}))):0}})()`);
}
(async () => {
  const cli = await cdp.abrir();
  const out = { cuando: new Date().toISOString(), ancho: ANCHO, freno: !SIN_FRENO, pasos: [] };
  const anotar = (paso, r) => { out.pasos.push(Object.assign({ paso }, r)); console.log(paso.padEnd(44), JSON.stringify(r)); };
  try {
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + '\n' + OBS });
    await cli.enviar('Page.enable', {}); await cli.enviar('Network.enable', {});
    cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 800 ? 844 : 900, deviceScaleFactor: ANCHO < 800 ? 3 : 1, mobile: ANCHO < 800 });
    if (!SIN_FRENO) {
      await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cli.enviar('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 });
    }
    const t0 = Date.now();
    await cli.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 120 && !(await cdp.evaluar(cli, `typeof go==='function'&&!!window._sbPerm&&window.D&&(D.pedidos||[]).length>0&&!document.getElementById('boot')`).catch(() => false)); i++) await pausa(500);
    anotar('arranque (navegar → datos y sin splash)', { ms: Date.now() - t0 });
    await pausa(4000);
    /* LAS CUATRO TABS DE TODOS LOS DÍAS */
    const TABS = [
      ['pedidos', `!!document.querySelector('#p-pedidos .ord-row, #p-pedidos [onclick*="openOrdDetail"]')`],
      ['ruta', `!!document.querySelector('#pg-ruta .tab.active') && (document.querySelector('#pg-ruta')||{}).innerText.length>200`],
      ['busqueda', `!!document.querySelector('#pg-abast') && (document.querySelector('#pg-abast')||{}).innerText.length>200`],
      ['caja', `!!document.querySelector('#p-caja') && (document.querySelector('#p-caja')||{}).innerText.length>200`]
    ];
    for (const [tab, listo] of TABS) {
      if (await irA(cli, tab)) anotar('abrir ' + tab, await medir(cli, listo));
      else anotar('abrir ' + tab, { error: 'no encontré la tab' });
      await pausa(1500);
      await irA(cli, 'inicio'); await medir(cli, 'true'); await pausa(800);
    }
    /* LA FICHA DE UN PEDIDO */
    await irA(cli, 'pedidos'); await medir(cli, 'true'); await pausa(1500);
    const filaSel = `(function(){var l=[].slice.call(document.querySelectorAll('#p-pedidos [onclick*="openOrdDetail"]'));return l.filter(function(x){return x.getBoundingClientRect().height>0})[0]||null})()`;
    if (await tocar(cli, filaSel)) anotar('abrir la ficha de un pedido', await medir(cli, `!!(document.querySelector('.ord-modal.open, #ordDetail.open, .ord-detail.open')||[].slice.call(document.querySelectorAll('.ord-section')).length)`));
    else anotar('abrir la ficha de un pedido', { error: 'no encontré una fila' });
    await cdp.evaluar(cli, `try{closeOrdDetail()}catch(e){};1`); await pausa(1200);
    /* BOTONES: abrir los formularios de todos los días (no guardan nada; los POST igual están cortados) */
    const BOTONES = [
      ['caja', 'Caja › + Gasto', `[].slice.call(document.querySelectorAll('#p-caja button, #p-caja .btn, #p-caja [onclick]')).filter(function(b){return /gasto/i.test(b.innerText)&&b.getBoundingClientRect().height>0})[0]`, `!!document.querySelector('.modal.open, .modal-ov.open, #gastoModal.open, [id*="Gasto"].open')||true`],
      ['busqueda', 'Abastecimiento › PAGOS', `[].slice.call(document.querySelectorAll('#pg-abast .tab')).filter(function(b){return /pagos/i.test(b.innerText)})[0]`, `/Pagar|SALDADAS|deuda/i.test((document.querySelector('#pg-abast')||{}).innerText||'')`],
      ['ruta', 'Ruta › COBROS', `[].slice.call(document.querySelectorAll('#pg-ruta .tab')).filter(function(b){return /cobros/i.test(b.innerText)})[0]`, `true`]
    ];
    for (const [tab, nombre, sel, listo] of BOTONES) {
      await irA(cli, tab); await medir(cli, 'true'); await pausa(1500);
      if (await tocar(cli, `(function(){return ${sel}||null})()`)) anotar('tocar ' + nombre, await medir(cli, listo));
      else anotar('tocar ' + nombre, { error: 'no encontré el botón' });
      await pausa(1000);
    }
    /* LA SEÑAL EN VIVO: 5 pedidos reales por el repartidor del websocket, con Pedidos a la vista */
    await irA(cli, 'pedidos'); await medir(cli, 'true'); await pausa(2000);
    const sen = await cdp.evaluar(cli, `(function(){var c=window._ENV&&_ENV.canales&&_ENV.canales['erp:pedidos'];if(!c)return 'sin canal erp:pedidos';var ids=(D.pedidos||[]).slice(-5).map(function(p){return p.h+'|'+p.n});window.__tap=performance.now();c.alCambio({ids:ids,n:ids.length});return ids.join(',')})()`);
    anotar('señal en vivo (5 pedidos) con Pedidos abierta', Object.assign({ ids: sen }, await medir(cli, 'true', 20000)));
  } catch (e) { console.log('ERR', e.message); }
  finally { cli.matar(); }
  if (SALIDA) fs.writeFileSync(SALIDA, JSON.stringify(out, null, 1));
})();
