/* (6/11/2026) «Se me congeló Pedidos en Buscando… y conectando…» (Tadeo y Lucas, 10:00). Entra con el robot a producción,
   abre Pedidos, toca «Actualizar pedidos» y anota cada pedido de red que sale y cuánto tarda / si nunca vuelve. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const cli = await cdp.abrir();
  const ev = (e) => cdp.evaluar(cli, e);
  const reqs = {}, t0 = Date.now(), errs = [];
  await cli.enviar('Network.enable', {}); await cli.enviar('Runtime.enable', {}); await cli.enviar('Page.enable', {});
  cli.escuchar((m, p) => {
    if (m === 'Network.requestWillBeSent') reqs[p.requestId] = { u: p.request.url.replace(/apikey=[^&]+/, '').slice(0, 110), m: p.request.method, t: Date.now() - t0 };
    if (m === 'Network.loadingFinished' && reqs[p.requestId]) reqs[p.requestId].fin = Date.now() - t0;
    if (m === 'Network.loadingFailed' && reqs[p.requestId]) reqs[p.requestId].err = p.errorText;
    if (m === 'Runtime.exceptionThrown') errs.push(String(p.exceptionDetails.exception && p.exceptionDetails.exception.description || p.exceptionDetails.text).slice(0, 200));
    if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
  await cli.enviar('Page.navigate', { url: URL_APP });
  for (let i = 0; i < 120; i++) { try { if (await ev(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`)) break; } catch (e) {} await pausa(500); }
  await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)};document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))};document.getElementById('loginRemember').checked=true;panelDoLogin();1`);
  for (let i = 0; i < 80; i++) { try { if (await ev(`typeof SESSION!=='undefined'&&!!(SESSION&&SESSION.usuario)`)) break; } catch (e) {} await pausa(500); }
  await pausa(4000);
  await ev(`go('pedidos');1`);
  await pausa(3000);
  const tA = Date.now() - t0;
  await ev(`(function(){var b=document.getElementById('btnReloadPed'); if(b)b.click(); return !!b;})()`);
  let lbl = '';
  for (let i = 0; i < 60; i++) { lbl = await ev(`(function(){var b=document.getElementById('btnReloadPed');return b?(b.disabled+'|'+(b.textContent||'').trim()):'sin boton';})()`); if (/^false/.test(lbl)) break; await pausa(1000); }
  console.log('botón a los', Math.round((Date.now() - t0 - tA) / 1000), 's →', lbl);
  console.log('vivo:', await ev(`(function(){try{return JSON.stringify(_enVivoEstado());}catch(e){return 'err '+e.message;}})()`));
  const pend = Object.values(reqs).filter((r) => r.t >= tA - 500);
  pend.forEach((r) => console.log((r.fin ? (r.fin - r.t) + 'ms' : (r.err ? 'FALLÓ ' + r.err : 'SIN VOLVER')).padEnd(18), r.m, r.u));
  console.log('errores JS:', errs.slice(0, 6));
  cli.matar ? cli.matar() : cli.cerrar(); process.exit(0);
})().catch((e) => { console.log('FALLÓ', e.message); process.exit(1); });
