/* REPRO: contar SOLO Brubank y mirar si la tarjeta muestra el número nuevo sin ↻ (21/11/2026).
   SBSES=<sbses.json> BASE=http://localhost:8155 node repro_contar_brubank.js [390|1440]
   Sesión real de la base en SOLO LECTURA (sbses_guarda). La escritura `caja_contar_directo` se corta y contesta lo que
   contesta la base de verdad ({ok, aceptada, diferida:true, directo, orden}) a los 800 ms. Las lecturas de la caja son
   REALES: traen el Saldo Base de antes (en la vida real el aplicador lo escribe 10-50 s después). Se fuerzan relecturas
   como las del «en vivo» y se mira la tarjeta durante 40 s. */
'use strict';
const P = './';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
const CONTAR = `window.__posts=[];window.confirm=function(){return true;};window.__alertas=[];window.alert=function(m){window.__alertas.push(String(m));};
 (function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||'');
  if(/\\/rest\\/v1\\/rpc\\/caja_contar_directo/.test(s)){var b={};try{b=JSON.parse(x.body).p||{};}catch(e){} window.__posts.push(b);
   return new Promise(function(res){setTimeout(function(){res(new Response(JSON.stringify({ok:true,aceptada:true,diferida:true,directo:true,orden:999999,repetida:false}),{status:200,headers:{'Content-Type':'application/json'}}));},800);});}
  return o.apply(this,arguments);};})();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', sbses(process.env.SBSES, 'tadeo') + CONTAR) });
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("caja")');
  const ok = await esperar(cli, `(function(){var c=typeof _cajaCuentas==='function'&&_cajaCuentas();return !!(c&&c.some(function(x){return x.id==='brubank';})&&D&&D.saldoBase&&D.saldoBase.porCuenta);})()`, 60000);
  if (!ok) { console.log('la caja no cargó', await evaluar(cli, 'JSON.stringify(window.__err||[])')); process.exit(1); }
  await pausa(3000);
  const BRU = `(function(){var c=_cajaCuentas().filter(function(x){return x.id==='brubank';})[0];var card=[].slice.call(document.querySelectorAll('#p-caja *')).filter(function(e){return e.children.length<6&&/brubank/i.test(e.textContent)&&e.textContent.length<200;}).map(function(e){return e.textContent.replace(/\\s+/g,' ').trim();}).sort(function(a,b){return a.length-b.length;})[0]||'';return JSON.stringify({calc:Math.round(c.saldo),sb:Math.round((D.saldoBase.porCuenta||{}).brubank||0),card:card.slice(0,120),local:!!_saldoLocal});})()`;
  const antes = JSON.parse(await evaluar(cli, BRU));
  console.log('antes:', antes);
  const nuevo = antes.calc + 12345;
  await evaluar(cli, `toggleAjuste()`);
  await pausa(600);
  const hay = await evaluar(cli, `!!document.getElementById('ajCta_brubank')`);
  if (!hay) { console.log('no hay campo ajCta_brubank'); process.exit(1); }
  await evaluar(cli, `(function(){var i=document.getElementById('ajCta_brubank');i.value='${nuevo}';i.dataset.erp='';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluar(cli, `guardarAjuste()`);
  const t0 = Date.now();
  let ult = '';
  for (let s = 0; s <= 40; s += 1) {
    if (s === 3 || s === 8 || s === 15 || s === 25) await evaluar(cli, `_recargarCaja(true)`);   // como el «en vivo»
    const r = JSON.parse(await evaluar(cli, BRU));
    const linea = 'calc ' + r.calc + ' · sb ' + r.sb + ' · local ' + r.local + ' · ' + r.card;
    if (linea !== ult) { console.log(String(((Date.now() - t0) / 1000).toFixed(1)).padStart(5) + ' s  ' + linea + (r.calc === nuevo ? '   ← NUEVO' : '   ← viejo')); ult = linea; }
    await pausa(1000);
  }
  console.log('posts:', JSON.stringify(await evaluar(cli, 'JSON.stringify(__posts.map(function(b){return {contadas:b.contadas,cta_brubank:b.cta_brubank};}))')));
  console.log('errores:', await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))'));
  process.exit(0);
})();
