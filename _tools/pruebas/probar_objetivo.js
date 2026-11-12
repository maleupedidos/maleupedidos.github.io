/* OBJETIVO (tab planificacion), auditoría del 11/11/2026.
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_objetivo.js [ancho]
   Sesión de la base con la guarda de solo lectura. Sostiene:
     · el «actualizando…» se va (no queda colgado esperando a Apps Script);
     · nada sale a Apps Script al abrir la tab;
     · sin símbolos (◀ ▶ ✎ ↻ ✓ ✕), sin códigos;
     · «Planificar el mes» no aparece tres veces;
     · los totales: Retail + Clubes + Red (+ catering) = el total de arriba;
     · a 390 px el mes se lee entero y nada se sale. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const guarda = require(path.join(__dirname, 'sbses_guarda.js'));
const SBSES = guarda(process.env.SBSES, process.env.USUARIO || 'tadeo');
if (!SBSES) { console.error('falta SBSES'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (c, m, x) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };
(async () => {
  const cli = await abrir();
  const ev = (e) => evaluar(cli, e);
  const apps = [];
  try {
    await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
    await cli.enviar('Fetch.enable', { patterns: [{ urlPattern: '*script.google.com*' }] });
    cli.escuchar((m, p) => { if (m === 'Fetch.requestPaused') { apps.push((String(p.request.url).match(/action=([a-zA-Z]+)/) || [, p.request.url])[1]); cli.enviar('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }).catch(() => {}); } });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.navigate', { url: URL });
    await T(3000);
    if (!(await guarda.verificarGuarda(cli, evaluar))) throw new Error('la guarda de solo lectura no corta');
    await T(8000);
    const antes = apps.length;
    await ev("go('planificacion')");
    let colgado = true;
    for (let i = 0; i < 50; i++) { await T(500); if (await ev("(function(){var b=document.getElementById('planRefreshBadge');return !b||b.style.display==='none'||b.offsetParent===null;})()")) { colgado = false; break; } }
    await T(1500);
    chk(!colgado, 'el «actualizando…» se va solo (no queda colgado)');
    chk(apps.length === antes, 'abrir Objetivo no llama a Apps Script', apps.slice(antes));
    const r = JSON.parse(await ev(`JSON.stringify((function(){var p=document.getElementById('p-planificacion'),t=p.innerText;
      var plan=(t.match(/Planificar/g)||[]).length, sel=document.getElementById('planMesSel');
      return {t:t.length,sim:(t.match(/[\\u25C0\\u25B6\\u270E\\u21BB\\u2713\\u2715\\u2717\\u2605\\u26a0]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/g)||[]),
        cod:(t.match(/\\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{3,}\\b/g)||[]), plan:plan, sw:p.scrollWidth, cw:p.clientWidth,
        sel:sel?{sw:sel.scrollWidth,cw:sel.clientWidth,txt:sel.options[sel.selectedIndex]&&sel.options[sel.selectedIndex].text}:null};})())`));
    chk(r.t > 100 && !r.sim.length && !r.cod.length, 'sin símbolos ni códigos', r);
    chk(r.plan <= 2, `«Planificar» aparece ${r.plan} veces (máx. 2: arriba y en el plan vacío)`, r.plan);
    chk(r.sw <= r.cw + 1, `a ${ANCHO} px nada se sale`, { sw: r.sw, cw: r.cw });
    chk(!!r.sel && r.sel.sw <= r.sel.cw + 2, `el mes se lee entero (${r.sel && r.sel.txt})`, r.sel);
    // Los totales: lo de arriba = la suma de los canales.
    const tot = JSON.parse(await ev(`JSON.stringify((function(){var n=function(s){return Number(String(s||'').replace(/[^0-9]/g,''))||0;};
      var box=document.getElementById('planTotal'); if(!box)return null; var big=box.querySelector('.plan-tot-v,.pt-v,[class*="big"]');
      var txt=box.innerText, m=txt.match(/\\$[0-9.]+/g)||[];
      return {txt:txt.slice(0,400),montos:m.map(n)};})())`));
    if (tot && tot.montos.length >= 4) {
      const [total, a, b, c] = tot.montos;
      chk(total === a + b + c, `el total ($${total}) = Retail + Clubes + Red ($${a} + $${b} + $${c})`, tot);
    } else chk(false, 'no encontré el total y los canales', tot);
    /* Octubre (el mes con plan): sin símbolos, sin el chequeo interno cuando cierra, y el total contra la base
       (planCerrarMes con ROLLBACK dio 25.936.697 el 11/11). */
    await ev('planMesShift(-1)');
    for (let i = 0; i < 40; i++) { await T(500); if (await ev("/OCTUBRE/i.test((document.getElementById('planTotal')||{}).innerText||'')")) break; }
    await T(2500);
    const oc = JSON.parse(await ev(`JSON.stringify((function(){var p=document.getElementById('p-planificacion'),t=p.innerText;
      return {sim:(t.match(/[\\u25C0\\u25B6\\u25BE\\u25B4\\u270E\\u21BB\\u2713\\u2715\\u2717\\u2605\\u26a0]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/g)||[]),
        control:/Objetivo cargado|cierran al peso/.test(t), tot:(t.match(/FACTURACI[ÓO]N DE OCTUBRE[^$]*\\$([0-9.]+)/i)||[])[1]||'', sw:p.scrollWidth, cw:p.clientWidth};})())`));
    chk(!oc.sim.length, 'octubre: sin símbolos (tampoco en las metas ni en los plegables)', oc.sim);
    chk(!oc.control, 'octubre: sin el chequeo «Objetivo cargado / cierran al peso» (cierran)');
    chk(oc.tot === '25.936.697', `octubre: facturación $${oc.tot} = la de la base ($25.936.697)`, oc.tot);
    chk(oc.sw <= oc.cw + 1, `octubre a ${ANCHO} px: nada se sale`, oc);
    const errs = JSON.parse(await ev('JSON.stringify(window.__errores||[])') || '[]');
    chk(!errs.length, 'sin errores de JS', errs);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
