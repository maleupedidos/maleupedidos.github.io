/* ARRANQUE EN FRÍO (12/11/2026): qué pedidos salen a Apps Script (script.google.com) y cuáles a la base, por tab, con
   un perfil de Chrome nuevo y sin cache. Saca `maleu_apps_prueba`, que el PREP prende para las pruebas con datos
   simulados: con esa bandera el ERP SÍ va a Apps Script y la medición da un rojo falso (pasó el 12/11).
     SBSES=<json> USUARIO=<u> [PREP_SESION='{usuario:"santos",rol:"repartidor",...}'] BASE_URL=http://localhost:PUERTO/app.html        TABS=inicio,ventas node _tools/pruebas/medir_arranque_as.js
   Una línea «<fase> AS» es una lectura que salió a Apps Script, con la acción y la pila de quién la pidió. */
const R=__dirname+'/';
const {abrir,evaluar}=require(R+'cdp.js');const T=(ms)=>new Promise(r=>setTimeout(r,ms));
const PREP=require(R+'sesion_prep.js')('x');const SB=require(R+'sbses_guarda.js')(process.env.SBSES,process.env.USUARIO||'tadeo');
(async()=>{const c=await abrir();const ev=e=>evaluar(c,e);
await c.enviar('Runtime.enable');await c.enviar('Page.enable');await c.enviar('Network.enable');
await c.enviar('Network.setCacheDisabled',{cacheDisabled:true});
let fase='arranque';const vistos=[];
c.escuchar((mt,p)=>{if(mt!=='Network.requestWillBeSent')return;const u=p.request.url;
  if(/script\.google(usercontent)?\.com/.test(u)){let a='';try{a=new URL(u).searchParams.get('action')||'';}catch(e){}
    if(!a&&p.request.postData){const m=String(p.request.postData).match(/"action"\s*:\s*"([^"]+)"/);a=m?m[1]+'(POST)':'POST';}
    let st='';try{let f=[];let k=p.initiator&&p.initiator.stack;while(k){f=f.concat(k.callFrames||[]);k=k.parent;}st=f.slice(3,12).map(x=>x.functionName+':'+x.lineNumber).join('<');}catch(e){}
    let q='';try{q=new URL(u).searchParams.get('acciones')||'';}catch(e){}
    vistos.push({fase,lado:'AS',a:a+'['+q+']{'+st+'}'+(p.request.method)});}
  else if(/supabase\.co\/rest\/v1\/rpc\//.test(u)){vistos.push({fase,lado:'base',a:u.split('/rpc/')[1].split('?')[0]});}});
await c.enviar('Page.addScriptToEvaluateOnNewDocument',{source:PREP+SB+';try{localStorage.removeItem("maleu_apps_prueba");}catch(e){}'});
await c.enviar('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await c.enviar('Page.navigate',{url:process.env.BASE_URL});for(let i=0;i<40&&!(await ev("typeof go==='function'"));i++)await T(250);
await T(Number(process.env.ESPERA0||9000));
for(const t of (process.env.TABS||'').split(',').filter(Boolean)){fase=t;await ev(`try{go(${JSON.stringify(t)})}catch(e){}`);await T(Number(process.env.ESPERA||6000));}
const err=await ev("(document.querySelector('.toast.show,#toast.show')||{}).innerText||''");
const by={};for(const v of vistos){const k=v.fase+' '+v.lado;(by[k]=by[k]||[]).push(v.a);}
for(const k of Object.keys(by))console.log(k.padEnd(22),by[k].join(', '));
console.log('rol', await ev("(window.SESSION||{}).rol+' '+(window.SESSION||{}).usuario"),'toast:',err);
c.matar();process.exit(0);})();
