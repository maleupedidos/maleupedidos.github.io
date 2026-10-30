/* Solo lecturas; no imprime tokens ni datos de pedidos. */
'use strict';
const {execFileSync}=require('child_process');
const {abrir,evaluar}=require('./cdp');
const prep=require('./sesion_prep');
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
async function esperar(cli,expr,ms=45000){const t=Date.now();while(Date.now()-t<ms){if(await evaluar(cli,expr))return true;await pausa(300);}return false;}
(async()=>{
  const token=execFileSync('python',[require('path').join(__dirname,'leer_sesion.py')],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  console.log('Sesion leida; abriendo navegador (solo lecturas).');
  const cli=await abrir();
  try{
    await cli.enviar('Page.enable');
    cli.escuchar((m)=>{if(m==='Page.javascriptDialogOpening')cli.enviar('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});});
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument',{source:prep(token)});
    await cli.enviar('Page.navigate',{url:process.env.BASE_URL||'http://localhost:8167/app.html'});
    console.log('Navegando al ERP.');
    for(let i=0;i<90;i++){
      await new Promise(r=>setTimeout(r,1000));
      if(await evaluar(cli,`!!(window.D&&D.pedidos&&D.pedidos.length&&window.__enVivo)`))break;
    }
    console.log(JSON.stringify(await evaluar(cli,`(function(){var p=typeof _palancaVal==='function'?_palancaVal:null;return {estado:document.readyState,pedidos:window.D&&D.pedidos&&D.pedidos.length,pal:p?Object.fromEntries(['pedidosArma','cajaArma','rutaPg','rutaEnVivo','cajaEnVivo','abaEnVivo'].map(function(k){return [k,p(k)];})):null,vivo:window.__enVivo&&window.__enVivo.estado,errores:(window.__err||[]).slice(0,5)};})()`),null,2));
    await evaluar(cli,`window.__syncLecturas=[];(function(){var f=fetch;window.fetch=function(u,o){var s=String(u),m=s.match(/rest\\/v1\\/rpc\\/([a-z_]+)/);if(m)__syncLecturas.push(m[1]);return f.apply(this,arguments);};})();1`);
    for(const tab of ['pedidos','caja','ruta','busqueda']){
      await evaluar(cli,`go('${tab}');1`);
      if(!await esperar(cli,`!!(window.__ordenVistas&&__ordenVistas['${tab}'])`))throw Error('No arranco '+tab);
      await evaluar(cli,`window.__syncLecturas=[];_ordenCambios['${tab}']=(_ordenCambios['${tab}']||0)+1;_ordenVistaPedir();1`);
      const ok=await esperar(cli,`!_ordenCambios['${tab}']`,60000);
      console.log(tab+': '+(ok?'actualizada':'NO actualizada')+'; RPC: '+JSON.stringify(await evaluar(cli,'window.__syncLecturas')));
      if(!ok)throw Error('La vista quedo pendiente: '+tab);
      if(tab==='ruta'){
        const fuente=await evaluar(cli,'window.__rutaFuente||null');
        console.log('Fuente de Ruta: '+JSON.stringify(fuente));
        if(!fuente||fuente.de!=='base')throw Error('Ruta no vino de Supabase');
      }
    }
    console.log('Las cuatro vistas releen Supabase. Todos los POST de escritura estuvieron interceptados.');
  }finally{cli.matar();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
