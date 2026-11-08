/* APPS SCRIPT APAGADO (8/11/2026): ninguna llamada del ERP sale a script.google.com. node _tools/pruebas/probar_apps_apagado.js
   Una escritura contesta {ok:false, apagado:true} sin viajar y queda anotada; una lectura falla al instante; una directa que la
   lista de palancas no nombra va a la base. Contra la version anterior (v989) da MAL. */
const { abrir, evaluar } = require('./cdp.js');
const T = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const cli = await abrir(); await cli.enviar('Page.enable'); await cli.enviar('Network.enable');
  const salieron = [];
  cli.escuchar((m, e) => { if (m !== 'Network.requestWillBeSent') return; if (/script\.google\.com/.test(e.request.url)) salieron.push(e.request.url.slice(0, 120)); });
  /* Sin servidor: el archivo (como humo.js). BASE=http://localhost:8080 para probar contra el servidor local. */
  const url = process.env.BASE ? process.env.BASE + '/' + (process.env.APP || 'app.html')
    : 'file:///' + require('path').join(__dirname, '..', '..', process.env.APP || 'app.html').split(require('path').sep).join('/');
  await cli.enviar('Page.navigate', { url });
  await T(6000);
  const r = await evaluar(cli, `(async function(){
    var o={};
    o.instalado = !!window.__maleuAuth;
    o.hayCorte = typeof APPS_APAGADO!=='undefined' ? APPS_APAGADO : 'no existe';
    /* Anotar en la base: se intercepta para no escribir nada */
    var anot=[]; _directaNoAnotar=function(a,m,d){ anot.push(a+'|'+m); };
    var t0=Date.now();
    var r1 = await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'accionInventadaPrueba',x:1})}).then(function(r){return r.json();});
    o.post = r1; o.postMs = Date.now()-t0;
    var t1=Date.now(), err='';
    try{ await fetch(API+'?action=lecturaInventadaPrueba'); err='NO FALLO'; }catch(e){ err=String(e.message||e); }
    o.get = err; o.getMs = Date.now()-t1;
    o.anot = anot;
    o.contador = window.__appsApagado;
    /* _ordenDirectaOn: palancas que no nombran la accion */
    var pv=_palancaVal;
    _palancaVal=function(n){ return n==='directas' ? {crmSetNotasTags:false} : null; };
    o.onNoNombrada = _ordenDirectaOn('segLlegando');
    o.onFalse = _ordenDirectaOn('crmSetNotasTags');
    o.onSinRpc = _ordenDirectaOn('accionSinRpc');
    _palancaVal=function(n){ return n==='directas' ? {segLlegando:true} : null; };
    o.onTrue = _ordenDirectaOn('segLlegando');
    _palancaVal=pv;
    return o; })()`);
  await T(500);
  console.log(JSON.stringify(r, null, 1)); console.log('salieron a Apps Script:', salieron);
  const ok = r.instalado && r.hayCorte === true && r.post && r.post.ok === false && r.post.apagado === true && /accionInventadaPrueba/.test(r.post.err)
    && r.postMs < 300 && /apagado/.test(r.get) && r.getMs < 300 && r.anot.some(x => /accionInventadaPrueba\|apps apagado/.test(x))
    && r.onNoNombrada === true && r.onFalse === false && r.onSinRpc === false && r.onTrue === true && salieron.length === 0;
  console.log(ok ? 'OK' : 'MAL'); cli.matar(); process.exit(ok ? 0 : 1);
})();
