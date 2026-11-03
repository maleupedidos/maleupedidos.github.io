/* EL PERMISO VENCIDO CON SESIÓN DE LA BASE NO MANDA EL ARRANQUE A APPS SCRIPT (3/11/2026, corte a Supabase).
   node _tools/pruebas/probar_permiso_sesion_propia.js <token>
   BASE_URL=http://localhost:8171/app.html para lo local. No escribe nada (los POST van cortados por sesion_prep).
   `_sbPermiso(true)` («solo si ya lo tengo») lo usan las lecturas del arranque. Con el permiso guardado vencido (dura 1 h)
   devolvía null aunque hubiera sesión propia de la base, y todo salía a Apps Script. Se simula la sesión (no hay PIN acá):
     A) sesión propia en «si», permiso vencido → renueva por la base y devuelve el permiso; 0 pedidos a Apps Script.
     B) sin sesión propia → null, como siempre (no sale a pedir sbToken: cuesta un cupo de Apps Script).
   Contra el código viejo (v867) A da MAL. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
const ESPIA = `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u){var s=String(u&&u.url||u);try{if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push(s.slice(0,120));}catch(e){}return f.apply(this,arguments);};})();`;
const CASO = (conSesion) => `(async function(){
  await (_sbPidiendo||Promise.resolve());
  window.__aApps=[]; window.__propio=0;
  _sbPerm=null; _sbPermHasta=0; _sbPidiendo=null;
  window._sbTokLeer=function(){ return null; };
  window._sbTokGuardar=function(){};
  window._sbCompararConApps=function(){};
  window._sbSesLeer=function(){ return ${conSesion ? `{modo:'si',u:'tadeo'}` : 'null'}; };
  window._sbSesGuardar=function(){};
  window._sbPermisoPropio=function(){ window.__propio++; return new Promise(function(r){ setTimeout(function(){ r({token:'jwt-prueba',url:'https://x.supabase.co',key:'k',seg:3600,pal:{stockArma:'si'}}); },300); }); };
  var sb=await _sbPermiso(true);
  await new Promise(function(r){ setTimeout(r,500); });
  return {sb:sb?sb.token:null, propio:window.__propio, apps:window.__aApps.filter(function(u){return /sbToken/.test(u);}).length};
})()`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ESPIA });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  let listo = false; for (let i = 0; i < 60 && !listo; i++) { await pausa(1000); try { listo = await cdp.evaluar(cli, `typeof _sbPermiso==='function'&&typeof _sbSesLeer==='function'`); } catch (e) {} }
  chk('el ERP arranca', listo, '');
  await pausa(4000);
  console.log('\n== A) sesión propia, permiso vencido ==');
  const a = await cdp.evaluar(cli, CASO(true));
  chk('devuelve el permiso (no null)', a.sb === 'jwt-prueba', a);
  chk('lo renovó por la base', a.propio === 1, a);
  chk('0 sbToken a Apps Script', a.apps === 0, a);
  console.log('\n== B) sin sesión propia ==');
  const b = await cdp.evaluar(cli, CASO(false));
  chk('null, como siempre', b.sb === null, b);
  chk('no tocó la base ni Apps Script', b.propio === 0 && b.apps === 0, b);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('REVENTO', e); process.exit(2); });
