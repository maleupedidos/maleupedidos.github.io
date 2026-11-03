/* EL LOGIN SIN APPS SCRIPT (3/11/2026, corte). node _tools/pruebas/probar_login_base.js
   BASE_URL=http://localhost:8173/app.html para lo local. No usa ningún PIN real: las respuestas de Apps Script
   (`loginUsuario`) y de la base (`login_pin`, Auth y `mi_sesion_pantalla`) son simuladas en la página. Usa el formulario
   de login de verdad (loginUser, loginPin, panelDoLogin).
     A) los dos contestan bien → entra como siempre, con el token de Apps Script y la sesión de la base ya guardada.
     B) Apps Script no contesta y la base sí → entra con la base (rol y tabs de mi_sesion).
     C) modo ensayo → no le pide nada a Apps Script y entra con la base.
     D) los dos dicen incorrecto → no entra y lo dice.
     E) representante con Apps Script caído → no entra (su portal todavía necesita a Apps Script).
     F) Apps Script dice LOGIN_BASE «no» → entra, pero la sesión de la base se borra (la vuelta atrás). */
'use strict';
const cdp = require('./cdp.js');
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
/* window.__sim = {apps: 'ok'|'mal'|'red'|'no-base', base: 'ok'|'mal', rol}. Todo lo demás a la red sale como siempre
   (la página es la real; sin sesión no carga datos). */
const SIM = `;(function(){var f=window.fetch;window.__sim={apps:'ok',base:'ok',rol:'admin'};window.__vio=[];
  var J=function(o){return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}}));};
  window.fetch=function(u,x){var s=String(u&&u.url||u),b=String((x&&x.body)||''),S=window.__sim;
    if(/script\\.google|\\/exec/.test(s)&&/loginUsuario/.test(b)){window.__vio.push('apps');
      if(S.apps==='red')return Promise.reject(new TypeError('Failed to fetch'));
      if(S.apps==='mal')return J({ok:false,err:'Usuario o PIN incorrectos'});
      return J({ok:true,token:'tok-apps',usuario:'robotito',rol:S.rol,nombre:'Robotito',tabs:['inicio','caja'],loginBase:S.apps==='no-base'?'no':'si',loginBaseTodos:true,sbUrl:'https://xhaxmyvhygxynwjqrarm.supabase.co',sbPub:'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG'});}
    if(/rpc\\/login_pin/.test(s)){window.__vio.push('login_pin'); return S.base==='ok'?J({ok:true,usuario:'robotito',rol:S.rol,email:'robotito@maleu.local',clave:'x'}):J({ok:false,err:'Usuario o PIN incorrectos'});}
    if(/auth\\/v1\\/token\\?grant_type=password/.test(s)){window.__vio.push('auth'); return J({access_token:'acc-base',refresh_token:'ref-base',expires_in:3600});}
    if(/rpc\\/mi_sesion_pantalla/.test(s)){window.__vio.push('mi_sesion'); return J({ok:true,rol:S.rol,nombre:'Robotito Base',tabs:['inicio','stock'],activo:true});}
    if(/script\\.google|\\/exec/.test(s))return Promise.reject(new TypeError('cortado por la prueba'));
    if(x&&String(x.method||'').toUpperCase()==='POST')return J({ok:true});
    return f.apply(this,arguments);};})();`;
const CASO = (sim, ensayo) => `(async function(){
  try{ localStorage.clear(); }catch(e){} ${ensayo ? `localStorage.setItem('maleu_ensayo','1');` : ''}
  window.__sim=${JSON.stringify(sim)}; window.__vio=[]; SESSION=null; window.__loginDe=null;
  var btn=document.getElementById('loginBtn'); btn.disabled=false; btn.textContent='Entrar';
  var er=document.getElementById('loginErr'); er.classList.remove('show'); er.textContent='';
  window._enterApp=function(){ window.__entro=true; }; window.__entro=false;
  document.getElementById('loginUser').value='robotito'; document.getElementById('loginPin').value='123456';
  panelDoLogin();
  for(var i=0;i<40&&!window.__entro&&!er.classList.contains('show');i++)await new Promise(function(r){setTimeout(r,100);});
  var g=null; try{ g=JSON.parse(localStorage.getItem('mc_sbses')||'null'); }catch(e){}
  return {entro:window.__entro, err:er.classList.contains('show')?er.textContent:'', rol:SESSION&&SESSION.rol, nombre:SESSION&&SESSION.nombre,
    tabs:SESSION&&SESSION.tabs, token:localStorage.getItem('maleu_token'), ses:g?{u:g.u,access:g.access,modo:g.modo}:null, vio:window.__vio.slice(), de:window.__loginDe};
})()`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SIM });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  let listo = false; for (let i = 0; i < 60 && !listo; i++) { await pausa(1000); try { listo = await cdp.evaluar(cli, `typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`); } catch (e) {} }
  chk('el ERP muestra el login', listo, '');
  const ver = async (t, sim, ens) => { const r = await cdp.evaluar(cli, CASO(sim, ens)); console.log('\n== ' + t + ' ==  ' + JSON.stringify(r.de)); return r; };
  let r = await ver('A) los dos bien', { apps: 'ok', base: 'ok', rol: 'admin' });
  chk('entra con el token de Apps Script', r.entro && r.token === 'tok-apps', r);
  chk('la sesión de la base queda guardada, sin pedir login_pin dos veces', r.ses && r.ses.access === 'acc-base' && r.vio.filter((x) => x === 'login_pin').length === 1, r);
  r = await ver('B) Apps Script no contesta', { apps: 'red', base: 'ok', rol: 'admin' });
  chk('entra con la base', r.entro && r.rol === 'admin' && r.nombre === 'Robotito Base' && Array.isArray(r.tabs), r);
  chk('sin token de Apps Script, con la sesión de la base', !r.token && r.ses && r.ses.access === 'acc-base', r);
  r = await ver('C) modo ensayo', { apps: 'ok', base: 'ok', rol: 'admin' }, true);
  chk('no le pidió nada a Apps Script y entró con la base', r.entro && r.vio.indexOf('apps') < 0 && r.nombre === 'Robotito Base', r);
  r = await ver('D) los dos dicen incorrecto', { apps: 'mal', base: 'mal', rol: 'admin' });
  chk('no entra y lo dice', !r.entro && /incorrectos/.test(r.err), r);
  r = await ver('E) representante con Apps Script caído', { apps: 'red', base: 'ok', rol: 'vendedor' });
  chk('no entra (su portal necesita a Apps Script)', !r.entro && !!r.err, r);
  r = await ver('F) Apps Script dice LOGIN_BASE «no»', { apps: 'no-base', base: 'ok', rol: 'admin' });
  chk('entra con Apps Script y la sesión de la base se borra', r.entro && r.token === 'tok-apps' && !r.ses, r);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('REVENTO', e); process.exit(2); });
