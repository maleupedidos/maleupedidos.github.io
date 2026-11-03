/* SIN_APPS_LECTURAS POR APARATO (3/11/2026). node _tools/pruebas/probar_sin_apps_por_aparato.js <token>
   BASE_URL=http://localhost:8171/app.html para lo local. Solo lee (POST cortados por sesion_prep).
   Con `sinApps=si` (simulada en las palancas de la página):
     A) aparato SIN sesión de la base → no corta: un GET a Apps Script sale como siempre.
     B) aparato CON sesión de la base (simulada) → corta: el GET no sale y queda en window.__sinApps.
     C) el medidor anota «sesion-base» con usuario y aparato, una vez por día. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
const ESPIA = `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u,x){var s=String(u&&u.url||u);try{if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push(s.slice(0,120));}catch(e){}return f.apply(this,arguments);};})();`;
const GET = `(async function(){ window.__aApps=[]; window.__sinApps={}; var r='?'; try{ await fetch(API+'?action=ver&t='+Date.now()); r='salio'; }catch(e){ r='cortado: '+e.message; }
  return {r:r, apps:window.__aApps.length, cort:JSON.stringify(window.__sinApps)}; })()`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ESPIA });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  let listo = false; for (let i = 0; i < 60 && !listo; i++) { await pausa(1000); try { listo = await cdp.evaluar(cli, `!!(window._palancaVal&&_palancaVal('stockArma'))&&typeof _sinApps==='function'`); } catch (e) {} }
  chk('el ERP arranca', listo, '');
  await cdp.evaluar(cli, `_sbPerm.pal.lecArma=Object.assign({},_sbPerm.pal.lecArma,{sinapps:'si'}); 1`);
  console.log('\n== A) sinApps=si, aparato sin sesión de la base ==');
  chk('_sinApps() da false', (await cdp.evaluar(cli, `_sinApps()`)) === false, '');
  const a = await cdp.evaluar(cli, GET);
  chk('el GET a Apps Script sale como siempre', a.r === 'salio' && a.apps === 1, a);
  console.log('\n== B) sinApps=si, aparato con sesión de la base ==');
  await cdp.evaluar(cli, `window.__sesOrig=_sbSesLeer; window._sbSesLeer=function(){ return {modo:'si',u:'tadeo',todos:true}; }; 1`);
  chk('_sinApps() da true', (await cdp.evaluar(cli, `_sinApps()`)) === true, '');
  const b = await cdp.evaluar(cli, GET);
  chk('el GET no sale y queda contado', /^cortado/.test(b.r) && b.apps === 0 && /ver/.test(b.cort), b);
  console.log('\n== C) el medidor de sesión de la base ==');
  await cdp.evaluar(cli, `localStorage.removeItem('mc_sesbase_tadeo'); window.__med=[]; _sesionBaseAnotar(); _sesionBaseAnotar(); 1`);
  await pausa(3000);
  const m = await cdp.evaluar(cli, `(window.__med||[]).filter(function(x){ return x.boton==='sesion-base'; }).map(function(x){ return x.ref+' / '+x.resultado; })`);
  chk('anota una sola vez (' + m.length + ')', m.length === 1, m);
  chk('con usuario, rol y aparato', m.length === 1 && /con · tadeo · admin · aparato [a-z0-9]{6}/.test(m[0]), m);
  await cdp.evaluar(cli, `window._sbSesLeer=window.__sesOrig; 1`);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('REVENTO', e); process.exit(2); });
