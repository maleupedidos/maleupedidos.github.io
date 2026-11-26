/* CONTAR: EL ✓ SE PUEDE DESHACER (3/11/2026, v856).
     BASE=http://localhost:8157 node _tools/pruebas/probar_contar_deshacer.js <token> [390|1440]
   Tadeo: «si toco el ✓ por error queda fijo en contado y no puedo volver atrás». Sesion real; TODA escritura se corta
   (el PREP le contesta {ok:true} a lo que no es una lectura) y se cuentan los conteos que salen, a Apps Script o a la
   base. Sostiene:
     · el ✓ marca «contado» al toque y aparece la barra «Deshacer», y en la ventana de 5 s NO sale nada;
     · «Deshacer» dentro de la ventana deja la fila sin marcar, el numero como estaba, y no sale NINGUN conteo;
     · sin deshacer, a los 5 s sale UN conteo;
     · tocar el «✓ contado» ya enviado manda el numero de antes y deja la fila sin marcar;
     · contar dos veces el mismo producto dentro de la ventana manda UN solo conteo, con el ultimo numero. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = (c, e) => evaluar(c, e);
const esperar = async (c, e, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(c, e)) return true; } catch (x) {} await pausa(250); } return false; };
/* Cuenta los conteos que SALEN (a Apps Script o a la base), por encima del PREP. */
const ESPIA = `(function(){ window.__conteos=[]; var o=window.fetch; window.fetch=function(u,x){ try{ var s=String((u&&u.url)||u||''), b=x&&x.body?String(x.body):'';
  if(/stock_contar_directo/.test(s)||/"action":"stockContar"/.test(b)){ var j={}; try{ j=JSON.parse(b); j=j.p||j; }catch(e){} window.__conteos.push({abbr:j.abbr, v:j.cantidad, t:Date.now()}); } }catch(e){} return o.apply(this,arguments); }; })();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ';localStorage.removeItem("maleu_stcCola");' + ESPIA });
  console.log('\n=== CONTAR · deshacer el ✓ · ' + ANCHO + ' px ===');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await ev(cli, `go('stock'); try{ stSwitchTab('contar'); }catch(e){} 1`);
  chk('Contar pinta', await esperar(cli, `ST_TAB==='contar' && document.querySelectorAll('#stContar .stc-row .stc-ok:not(.ok)').length>=3`, 60000));
  const filas = await ev(cli, `[].slice.call(document.querySelectorAll('#stContar .stc-row .stc-ok:not(.ok)')).slice(0,3).map(function(b){ return b.closest('.stc-row').id.replace('stcR_',''); })`);
  const [A, Bb, C] = filas;
  const M = (a) => `!!document.querySelector('#stcR_${a} .stc-ok.ok')`;
  const V = (a) => `(document.getElementById('stcIn_${a}')||{}).value`;

  /* 1) ✓ y deshacer dentro de la ventana: no sale nada. */
  const v0 = await ev(cli, V(A));
  await ev(cli, `stContarOk('${A}'); 1`);
  chk('el ✓ marca «contado» al toque', await ev(cli, M(A)));
  chk('  y aparece «Deshacer»', await ev(cli, `(function(){var b=document.getElementById('stcDeshacer');return !!(b&&b.style.display!=='none'&&/Deshacer/.test(b.textContent));})()`));
  await pausa(2000);
  chk('  en la ventana no salió ningún conteo', (await ev(cli, `window.__conteos.length`)) === 0, await ev(cli, `window.__conteos`));
  await ev(cli, `(function(){var b=document.querySelector('#stcDeshacer button');b&&b.click();return 1;})()`);
  chk('«Deshacer»: la fila queda sin marcar', !(await ev(cli, M(A))));
  chk('  y el número como estaba', (await ev(cli, V(A))) === v0, [await ev(cli, V(A)), v0]);
  await pausa(6000);
  chk('  y no salió NINGÚN conteo', (await ev(cli, `window.__conteos.length`)) === 0, await ev(cli, `window.__conteos`));

  /* 2) ✓ sin deshacer: sale uno a los 5 s; tocar el verde manda el de antes y desmarca. */
  await ev(cli, `window.__conteos=[]; stContarOk('${Bb}'); 1`);
  chk('sin deshacer, a los 5 s sale UN conteo', await esperar(cli, `window.__conteos.length===1`, 12000), await ev(cli, `window.__conteos`));
  await pausa(1500);
  chk('  y la fila sigue «contado»', await ev(cli, M(Bb)));
  await ev(cli, `(function(){var b=document.querySelector('#stcR_${Bb} .stc-ok.ok');b&&b.click();return 1;})()`);
  chk('tocar el «✓ contado» ya enviado: la fila queda sin marcar', await esperar(cli, `!(${M(Bb)})`, 3000));
  chk('  y manda el número de antes (un segundo conteo)', await esperar(cli, `window.__conteos.length===2`, 8000), await ev(cli, `window.__conteos`));
  await pausa(1500);
  chk('  y cuando vuelve, la fila sigue sin marcar', !(await ev(cli, M(Bb))));

  /* 3) Contar dos veces dentro de la ventana: UN solo conteo, con el ultimo numero. */
  await ev(cli, `window.__conteos=[]; (function(){ var i=document.getElementById('stcIn_${C}'); i.value='7'; stContarBlur('${C}',i); })(); 1`);
  await pausa(1000);
  await ev(cli, `(function(){ var i=document.getElementById('stcIn_${C}'); i.value='9'; stContarBlur('${C}',i); })(); 1`);
  await pausa(7500);
  const cs = await ev(cli, `window.__conteos`);
  chk('dos conteos del mismo producto en la ventana: sale UNO', cs.length === 1, cs);
  chk('  con el último número (9)', cs.length === 1 && Number(cs[0].v) === 9, cs);
  const err = await ev(cli, `(window.__err||[]).filter(function(x){ return !/favicon|ResizeObserver/.test(x); })`);
  chk('sin errores de JS', err.length === 0, err);
  await ev(cli, `localStorage.removeItem('maleu_stcCola'); 1`);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
