/* PEDIDO REPETIDO (11/11/2026, 658).
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_pedido_repetido.js [ancho]
   Con la sesión de la base y la guarda de solo lectura; la decisión se intercepta (NO se decide nada: Mercedes la decide
   Tadeo). Sostiene:
     · en Pedidos aparece «Pedido repetido» con lo que dice la base (pedidos_repetidos_pantalla), cada par con «Sumar» y
       «Quedarse con el último», botones de ≥ 44 px;
     · «Quedarse con el último» pregunta y manda {vieja, nueva, decision:'ultimo'}; «Sumar» manda 'sumar';
     · decidido, la tarjeta se va. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const guarda = require(path.join(__dirname, 'sbses_guarda.js'));
const SBSES = guarda(process.env.SBSES, 'tadeo');
if (!SBSES) { console.error('falta SBSES'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (c, m, x) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };
(async () => {
  const cli = await abrir();
  const ev = (e) => evaluar(cli, e);
  try {
    await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.navigate', { url: URL });
    await T(3000);
    if (!(await guarda.verificarGuarda(cli, evaluar))) throw new Error('la guarda de solo lectura no corta');
    await T(9000);
    await ev("go('pedidos')");
    for (let i = 0; i < 40 && !(await ev("!!document.querySelector('#prepBox .prep-p')")); i++) { await T(500); if (i === 10) await ev('try{prepPedir(true)}catch(e){}'); }
    const base = JSON.parse(await ev("(async function(){return JSON.stringify(await _baseRpc('pedidos_repetidos_pantalla',{}));})()"));
    const tarj = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#prepBox .prep-p'),function(p){return {t:p.innerText.replace(/\\s+/g,' '),h:[].map.call(p.querySelectorAll('button'),function(b){return b.getBoundingClientRect().height;})};}))`));
    chk(base.length >= 1 && tarj.length === base.length, `aparecen ${tarj.length} pedidos repetidos, los mismos que la base (${base.length})`, { base: base.map((x) => x.c + ' ' + x.vieja + '→' + x.nueva), tarj });
    const merc = tarj.filter((x) => /Mercedes Girado/.test(x.t))[0];
    chk(!!merc && /2 pedidos en 5 min/.test(merc.t) && /#2446/.test(merc.t) && /#2447/.test(merc.t), 'Mercedes: 2 pedidos en 5 min, #2446 y #2447', merc);
    chk(!!merc && /Sumar/.test(merc.t) && /Quedarse con el último \(Home #2447\)/.test(merc.t), 'con «Sumar» y «Quedarse con el último (Home #2447)»', merc && merc.t);
    chk(tarj.every((x) => x.h.length === 2 && x.h.every((v) => v >= 43.5)), 'botones de 44 px', tarj.map((x) => x.h));
    // La decisión, interceptada.
    await ev(`window.__dec=[];window.__conf=[];window.confirm=function(m){window.__conf.push(m);return true;};
      var _o=_baseRpc;_baseRpc=function(rpc,a){ if(rpc==='pedido_repetido_decidir'){window.__dec.push(a.p);return Promise.resolve({ok:true});} return _o.apply(this,arguments); };`);
    const i = await ev(`(function(){var ps=[].slice.call(document.querySelectorAll('#prepBox .prep-p'));for(var k=0;k<ps.length;k++)if(/Mercedes/.test(ps[k].innerText))return k;return -1;})()`);
    await ev(`document.querySelectorAll('#prep-${i} button')[1].click()`); await T(600);
    const d = JSON.parse(await ev("JSON.stringify({dec:window.__dec,conf:window.__conf,queda:!!document.querySelector('#prepBox')&&/Mercedes/.test(document.getElementById('prepBox').innerText)})"));
    chk(d.conf.length === 1 && /Se cancela Home #2446/.test(d.conf[0]), 'pregunta antes de cancelar el anterior', d.conf);
    chk(d.dec.length === 1 && d.dec[0].vieja === 'Home|2446' && d.dec[0].nueva === 'Home|2447' && d.dec[0].decision === 'ultimo', 'manda quedarse con el último (#2446 → #2447)', d.dec);
    chk(!d.queda, 'decidido, la tarjeta se va');
    const errs = JSON.parse(await ev('JSON.stringify(window.__errores||[])') || '[]');
    chk(!errs.length, 'sin errores de JS', errs);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
