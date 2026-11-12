/* MI SESIÓN Y LOS TEMPLATES DE WATI DESDE LA BASE (3/11/2026, corte: 391 y 392).
   node _tools/pruebas/probar_sesion_y_templates_base.js <token>
   BASE_URL=http://localhost:8171/app.html para lo local. Solo lee (los POST que escriben van cortados por sesion_prep).
   A) con la base: miSesion, crmJugadasTpls y watiTemplates salen de la base, sin un GET a Apps Script, y miSesion dice lo
      mismo que Apps Script (rol, activo, tabs, authModo, rolesModo).
   B) con las tres RPC cortadas: caen a Apps Script y la pantalla igual tiene los datos. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
const ESPIA = `;(function(){var f=window.fetch;window.__aApps=[];window.__cortarRpc=false;window.fetch=function(u){var s=String(u&&u.url||u);
  try{if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s)){var m=/[?&]action=([A-Za-z]+)/.exec(s);window.__aApps.push(m?m[1]:s.slice(0,80));}}catch(e){}
  if(window.__cortarRpc&&/rpc\\/(mi_sesion_pantalla|wati_templates_pantalla|crm_jugadas_tpls_pantalla)/.test(s))return Promise.reject(new TypeError('cortado por la prueba'));
  return f.apply(this,arguments);};})();`;
const CORRIDA = `(async function(){
  window.__aApps=[]; window.__miSesionDe=null; _miSesionT=0;
  _refrescarMiSesion(true);
  for(var i=0;i<40&&!window.__miSesionDe;i++)await new Promise(function(r){setTimeout(r,250);});
  await new Promise(function(r){setTimeout(r,1500);});
  localStorage.removeItem('mc_pjTpls'); var tp=await _pjTplsTraer();
  window.__segTpls.cero(); await new Promise(function(r){ segTplsCargar(r); });
  var seg=window.__segTpls.n();
  return {miSesionDe:window.__miSesionDe, tpls:tp?Object.keys(tp).length:0, seg:seg, apps:window.__aApps.slice()};
})()`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ESPIA });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  let listo = false; for (let i = 0; i < 60 && !listo; i++) { await pausa(1000); try { listo = await cdp.evaluar(cli, `!!(window._palancaVal&&_palancaVal('stockArma'))&&typeof _baseRpc==='function'`); } catch (e) {} }
  chk('el ERP arranca con el permiso de la base', listo, '');
  await pausa(5000);
  console.log('\n== A) con la base ==');
  const a = await cdp.evaluar(cli, CORRIDA);
  chk('miSesion sale de la base', a.miSesionDe === 'base', a);
  chk('las jugadas traen templates (' + a.tpls + ')', a.tpls > 0, a);
  chk('Segmentos trae templates (' + a.seg + ')', a.seg > 0, a);
  chk('0 GET de miSesion, crmJugadasTpls o watiTemplates a Apps Script', !a.apps.some((x) => /miSesion|crmJugadasTpls|watiTemplates/.test(x)), a.apps);
  const cmp = await cdp.evaluar(cli, `(async function(){
    var b=await _baseRpc('mi_sesion_pantalla'), s=await fetch(API+'?action=miSesion&t='+Date.now()).then(function(r){return r.json();});
    var k=['ok','rol','activo','authModo','rolesModo']; var dif=k.filter(function(x){ return JSON.stringify(b[x])!==JSON.stringify(s[x]); });
    var tb=JSON.stringify((b.tabs||[]).slice().sort()), ts=JSON.stringify((s.tabs||[]).slice().sort()); if(tb!==ts)dif.push('tabs');
    return {dif:dif, rol:b.rol, ntabs:(b.tabs||[]).length}; })()`);
  chk('miSesion: la base dice lo mismo que Apps Script (rol ' + cmp.rol + ', ' + cmp.ntabs + ' tabs)', cmp.dif.length === 0, cmp);
  console.log('\n== B) con las RPC cortadas ==');
  await cdp.evaluar(cli, `window.__cortarRpc=true; 1`);
  const b = await cdp.evaluar(cli, CORRIDA);
  chk('miSesion cae a Apps Script', b.miSesionDe === 'apps' && b.apps.indexOf('miSesion') > -1, b);
  chk('las jugadas igual traen templates', b.tpls > 0, b);
  chk('Segmentos igual trae templates', b.seg > 0, b);
  const err = await cdp.evaluar(cli, `(window.__err||[]).filter(function(e){return !/cortado por la prueba/.test(e);})`);
  chk('sin errores de JS', !err.length, err);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('REVENTO', e); process.exit(2); });
