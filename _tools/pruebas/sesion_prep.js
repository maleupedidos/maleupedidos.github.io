/* El PREP correcto. La clave es `maleu_panel_session` (no `maleu_sesion`): con la
   clave equivocada el ERP carga los datos igual —el token viaja aparte— pero deja
   la pantalla de LOGIN encima, con z-index 9999. No se nota con .click()
   programatico, que ignora el hit-testing; si con un click de mouse de verdad. */
module.exports = function prep(token, extra) {
  return 'try{'
    + 'localStorage.setItem("maleu_token","' + token + '");'
    /* (8/11/2026) Las pruebas simulan datos imitando a Apps Script: sin esto el ERP corta esas llamadas (APPS_APAGADO). */
    + 'localStorage.setItem("maleu_apps_prueba","1");'
    + 'localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:"tadeo",rol:"admin",nombre:"Tadeo Ustariz",ts:Date.now()}));'
    + '}catch(e){}'
    + 'window.__err=[];window.__warn=[];window.__clicks=[];'
    + 'window.addEventListener("error",function(e){window.__err.push(String(e.message));});'
    + 'window.addEventListener("unhandledrejection",function(e){window.__err.push("promise: "+String(e.reason));});'
    + '(function(){var ce=console.error;console.error=function(){window.__err.push([].slice.call(arguments).join(" ").slice(0,140));return ce.apply(this,arguments);};})();'
    + 'document.addEventListener("click",function(e){window.__clicks.push((e.target.id?"#"+e.target.id:"")+"."+String(e.target.className||"").split(" ")[0]);},true);'
    /* (27/10/2026) Las LECTURAS de la base tambien son POST (`/rest/v1/rpc/<algo>_pantalla|_datos|_base`):
       interceptadas, la prueba recibia {ok:true} en vez de la caja o las ventas y concluia «la base no
       armo». Esas pasan; todo otro POST (Apps Script, rpc que escriben) sigue interceptado.
       (3/11/2026) Tambien las tienda_* de solo lectura (STABLE; tienda_cumple escribe y NO pasa) y la previa de
       noSeCobro: cortadas, «Ver como» decia «No pude traer la lista» sobre una base que contestaba bien. */
    + '(function(){var o=window.fetch;window.fetch=function(u,x){'
    + 'var _u=String((u&&u.url)||u||"");'
    + 'if(x&&String(x.method||"").toUpperCase()==="POST"&&!/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+_(pantalla|datos|base)|tienda_(vendedores|pedido_entro|ruleta|saldo_cliente|seguimiento|stock|piezas|validar_cupon)|pedido_no_se_cobro_previa|prov_costos_previa|red_efectivo_pantalla)(\\?|$)/.test(_u))return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{"Content-Type":"application/json"}}));'
    + 'return o.apply(this,arguments);};})();'
    + (extra || '');
};
