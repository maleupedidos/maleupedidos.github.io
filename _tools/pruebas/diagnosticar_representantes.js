/* Solo lecturas y cantidades: compara las pantallas con los productos guardados.
   Uso: node diagnosticar_representantes.js <parte del nombre del representante> */
'use strict';
const {execFileSync}=require('child_process'),path=require('path');
const {abrir,evaluar}=require('./cdp'),prep=require('./sesion_prep');
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const token=execFileSync('python',[path.join(__dirname,'leer_sesion.py')],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const c=await abrir();
  try{
    await c.enviar('Page.enable');c.escuchar(m=>{if(m==='Page.javascriptDialogOpening')c.enviar('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});});
    await c.enviar('Page.addScriptToEvaluateOnNewDocument',{source:prep(token)});
    await c.enviar('Page.navigate',{url:process.env.BASE_URL||'http://localhost:8167/app.html'});
    for(let i=0;i<90;i++){if(await evaluar(c,`!!(window.D&&D.pedidos&&D.pedidos.length&&_palancaVal('pedidosArma'))`))break;await pausa(1000);}
    await evaluar(c,`window.__repFiltro=${JSON.stringify(process.argv[2]||'')};1`);
    console.log(JSON.stringify(await evaluar(c,`(async function(){
      var sb=await _sbPermiso(true), H={apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'};
      var rpc=async function(n){var r=await fetch(sb.url+'/rest/v1/rpc/'+n,{method:'POST',headers:H,body:'{}'});if(!r.ok)throw Error(n+' HTTP '+r.status);return r.json();};
      var ruta=await rpc('ruta_entregas_pantalla');
      var cob=await _lecArmaBase('cobrosPendientes',{});
      var aba=await _lecArmaBase('busqueda',{});
      var raw=await rpc('cobros_pendientes_pantalla');
      var abiertos=await rpc('red_pedidos_abiertos_pantalla');
      var faltantes=(abiertos.vendedores||[]).flatMap(function(v){return (v.pedidos||[]).map(function(p){return {v:v.nombre,n:p.n,es:p.es,ep:p.ep,nueva:p.nueva,sinCta:p.sinCta,debePositivo:Number(p.debe)>0};});});
      window.__diagRep={ruta:ruta,cob:cob.d,aba:aba.d,raw:raw};
      var es=function(x){return JSON.stringify(x).toLowerCase().includes(__repFiltro.toLowerCase());};
      var resumen=function(e){return {h:e.h,id:e.id||e.n,r:e.r,es:e.es,ev:e.ev,retira:e.retira,p:e.p,oD:e.oD,ocF:e.ocF,fe:e.fe};};
      return {abiertos:{ok:abiertos.ok,rep:(abiertos.vendedores||[]).length,clientes: faltantes.map(function(p){return {n:p.n,es:p.es,ep:p.ep,nueva:p.nueva,sinCta:p.sinCta,debePositivo:p.debePositivo};})},pal:{rutaCobrosPg:sb.pal.rutaCobrosPg,cobros:_lecModo('cobrosPendientes'),busqueda:_lecModo('busqueda')},
        pedidosGuardados:D.pedidos.filter(function(p){return p.h==='Red'&&es(p);}).slice(-8).map(resumen),
        ruta:ruta.e.filter(function(e){return e.h==='Red'&&es(e);}).map(resumen),
        cobros:{campos:Object.keys(cob.d),clientes:(cob.d.cobros||[]).filter(function(e){return e.h==='Red'||e.vendedor;}).map(function(e){return {h:e.h,id:e.id,vendedor:e.vendedor,n:e.ids&&e.ids.length,campos:Object.keys(e)};})},
        crudo:{red:raw.red&&raw.red.length,cabRed:raw.cab&&raw.cab.Red&&raw.cab.Red.length,rol:sb.rol},
        aba:{campos:Object.keys(aba.d),clientes:(aba.d.clientes||[]).filter(es).map(function(x){return {n:x.n,ped:x.ped,canal:x.canal,items:x.items};})}};
    })()`),null,2));
  }finally{c.matar();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
