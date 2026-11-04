// El interceptor del CRM (4/11/2026): sin token de Apps Script y en ENSAYO, la orden del CRM prueba primero la directa;
// el ensayo corta solo su respaldo a Apps Script. Lo que no es del CRM se corta como siempre.
'use strict';
const cdp = require('./cdp.js');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const PUERTO = process.argv[2] || '8157';
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `;try{localStorage.setItem('maleu_ensayo','1');localStorage.removeItem('maleu_token');}catch(e){}` });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html?v=' + Date.now() });
  await pausa(7000);
  const r = await cdp.evaluar(cli, `(async function(){
    var o={}, vistos=[], resp=null;
    window._ordenDirecta=function(b){ vistos.push(b.action); return Promise.resolve(resp); };
    var post=function(a){ return fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:a,tel:'5490000000001'})})
      .then(function(r){ return r.json(); }).then(function(d){ return 'ok:'+JSON.stringify(d); },function(e){ return 'cortado:'+e.message; }); };
    var n0=(window.__ensayoApps||[]).length;
    resp={ok:true,directo:true};
    o.a=await post('crmSetNotasTags'); o.aVistos=vistos.slice(); o.aApps=(window.__ensayoApps||[]).slice(n0).map(function(x){return x.a;});
    vistos.length=0; resp=null; var n1=(window.__ensayoApps||[]).length;
    o.b=await post('crmSetNotasTags'); o.bVistos=vistos.slice(); o.bApps=(window.__ensayoApps||[]).slice(n1).map(function(x){return x.a;});
    vistos.length=0; var n2=(window.__ensayoApps||[]).length;
    o.c=await post('redConfirmar'); o.cVistos=vistos.slice(); o.cApps=(window.__ensayoApps||[]).slice(n2).map(function(x){return x.a;});
    var L=['crmZonaSave','crmZonaDelete','crmPuntoSave','crmJugadaRespAtendida','crmNoEscribir','crmProgramarJugada','crmCancelarJugadaProg','crmCambiarTelefono','crmTelDesdePedido','hogaresMergeSave','crmLotesSaveBatch','ruletaCuponUsar'];
    vistos.length=0; resp={ok:true}; for(var i=0;i<L.length;i++){ await post(L[i]); } o.doce=vistos.slice();
    var m=ORD_DIRECTAS_RPC; o.sinRpc=L.filter(function(a){ return !m[a]; });
    return o; })()`);
  console.log(JSON.stringify(r));
  const casos = [
    ['CRM con directa: va a la base y no toca Apps Script', /^ok:/.test(r.a) && r.aVistos.includes('crmSetNotasTags') && !r.aApps.length],
    ['CRM sin directa: el ensayo corta el respaldo y lo anota', /^cortado:/.test(r.b) && r.bVistos.includes('crmSetNotasTags') && r.bApps.includes('crmSetNotasTags')],
    ['lo que no es del CRM: cortado de entrada, sin probar el interceptor', /^cortado:/.test(r.c) && !r.cVistos.length && r.cApps.includes('redConfirmar')]];
  casos.push(['las 12 del CRM llegan a la directa y tienen RPC', r.doce.length===12 && !r.sinRpc.length]);
  let mal = 0; for (const [n, ok] of casos) { if (!ok) mal++; console.log((ok ? 'ok   ' : 'MAL  ') + n); }
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
