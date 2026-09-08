/* El PREP correcto. La clave es `maleu_panel_session` (no `maleu_sesion`): con la
   clave equivocada el ERP carga los datos igual —el token viaja aparte— pero deja
   la pantalla de LOGIN encima, con z-index 9999. No se nota con .click()
   programatico, que ignora el hit-testing; si con un click de mouse de verdad. */
module.exports = function prep(token, extra) {
  return 'try{'
    + 'localStorage.setItem("maleu_token","' + token + '");'
    + 'localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:"tadeo",rol:"admin",nombre:"Tadeo Ustariz",ts:Date.now()}));'
    + '}catch(e){}'
    + 'window.__err=[];window.__warn=[];window.__clicks=[];'
    + 'window.addEventListener("error",function(e){window.__err.push(String(e.message));});'
    + 'window.addEventListener("unhandledrejection",function(e){window.__err.push("promise: "+String(e.reason));});'
    + '(function(){var ce=console.error;console.error=function(){window.__err.push([].slice.call(arguments).join(" ").slice(0,140));return ce.apply(this,arguments);};})();'
    + 'document.addEventListener("click",function(e){window.__clicks.push((e.target.id?"#"+e.target.id:"")+"."+String(e.target.className||"").split(" ")[0]);},true);'
    + '(function(){var o=window.fetch;window.fetch=function(u,x){'
    + 'if(x&&String(x.method||"").toUpperCase()==="POST")return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{"Content-Type":"application/json"}}));'
    + 'return o.apply(this,arguments);};})();'
    + (extra || '');
};
