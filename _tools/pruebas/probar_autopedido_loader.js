/* Confirmaciones simuladas: no crea pedidos ni consulta produccion. */
'use strict';
const {abrir,evaluar}=require('./cdp'),assert=require('assert/strict');
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const c=await abrir();try{
  await c.enviar('Page.enable');c.escuchar(m=>{if(m==='Page.javascriptDialogOpening')c.enviar('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});});
  await c.enviar('Page.addScriptToEvaluateOnNewDocument',{source:`window.fetch=function(u,o){
   if(o&&o.method==='POST')return new Promise(function(){});
   return Promise.resolve({ok:true,json:function(){return Promise.resolve({});},text:function(){return Promise.resolve('{}');}});
  };`});
  await c.enviar('Page.navigate',{url:(process.env.BASE||'http://localhost:8167')+'/ruta.html?standalone=1'});
  for(let i=0;i<100;i++){if(await evaluar(c,"typeof npGuardar==='function'"))break;await pausa(100);}
  const armar=`npZona='Home';npPago='Efectivo';npCart={1:1};NP_PRECIOS.PPM={p:17000};npFechaSel=new Date(Date.now()+86400000).toISOString().slice(0,10);document.getElementById('npNombre').value='Prueba simulada';document.getElementById('npSubBarrio').value='Prueba';document.getElementById('npLote').value='1';_rutAltaDirecta=function(){return new Promise(function(resolve){window.__confirmar=resolve;});};npGuardar();1`;
  await evaluar(c,armar);
  assert(await evaluar(c,"npSaving&&document.getElementById('npGuardar').disabled&&document.getElementById('nuevoView').inert"),'bloquea doble envio y edicion mientras confirma');
  assert(await evaluar(c,"!document.getElementById('rutLoaderOverlay').classList.contains('visible')"),'respuesta rapida no tapa pantalla');
  await evaluar(c,"__confirmar({ok:true,n:9999,diferida:true});1");await pausa(1100);
  assert(await evaluar(c,"!npSaving&&!document.getElementById('nuevoView').inert&&!document.getElementById('rutLoaderOverlay').classList.contains('visible')"),'confirmado libera pantalla aunque el aplicador no responda');
  await evaluar(c,"clearTimeout(_npSaltoT);npListo=function(){};1");
  await evaluar(c,armar);await pausa(950);
  assert(await evaluar(c,"document.getElementById('rutLoaderOverlay').classList.contains('visible')"),'confirmacion lenta muestra loader');
  await evaluar(c,"__confirmar({ok:true,n:10000});1");await pausa(100);
  assert(await evaluar(c,"!npSaving&&!document.getElementById('rutLoaderOverlay').classList.contains('visible')"),'loader termina apenas se confirma, sin espera minima');
  console.log('OK loader: guardado rapido, demorado, bloqueo de edicion y aplicacion en segundo plano');
 }finally{c.matar();}
})().catch(e=>{console.error(e);process.exitCode=1;});
