/* Backend simulado: ninguna lectura ni escritura sale a produccion. */
'use strict';
const {abrir,evaluar}=require('./cdp'),assert=require('assert/strict');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const c=await abrir();try{
  await c.enviar('Page.enable');
  await c.enviar('Page.addScriptToEvaluateOnNewDocument',{source:`
   window.__stock={PPM:{f:7,p:9}};window.__piezas={base:true,CVa:[{id:'pieza-a',kg:1.2}]};
   window.__resolverStock=null;window.__demorar=true;window.__fallar=false;
   window.fetch=function(u,o){
    var action=(new URL(String(u),location.href)).searchParams.get('action');
    if(action==='stock_full'&&window.__demorar)return new Promise(function(resolve){window.__resolverStock=function(){resolve({json:function(){return Promise.resolve(window.__stock);}});};});
    if(action==='stock_full'&&window.__fallar)return Promise.reject(Error('sin red'));
    var d=action==='stock_full'?window.__stock:action==='piezas_full'?window.__piezas:action==='precios'?{PPM:{p:17000}}:{ok:true};
    return Promise.resolve({ok:true,json:function(){return Promise.resolve(d);},text:function(){return Promise.resolve('{}');}});
   };`});
  await c.enviar('Page.navigate',{url:(process.env.BASE||'http://localhost:8167')+'/ruta.html?standalone=1'});
  for(let i=0;i<100;i++){if(await evaluar(c,"typeof switchTab==='function'"))break;await pause(100);}
  await evaluar(c,"npStockMode=function(){return 'proyectado';};switchTab('nuevo');1");
  assert(await evaluar(c,"document.getElementById('npProductos').textContent.includes('Consultando stock')"),'la carga no queda vacia');
  await evaluar(c,"window.__demorar=false;window.__resolverStock();1");await pause(100);
  assert(await evaluar(c,"document.getElementById('npProductos').textContent.includes('quedan 9')"),'muestra stock proyectado');
  assert(await evaluar(c,"npPzDisp('CVa').length===1"),'acepta piezas de Supabase con base:true');
  await evaluar(c,"window.__pid=NP_CAT_FLAT.find(function(p){return p.abbr==='PPM';}).id;npQty(__pid,1);window.__stock={PPM:{f:3,p:4}};_rutVivoSenal();1");await pause(2200);
  assert(await evaluar(c,"document.getElementById('npProductos').textContent.includes('quedan 4')"),'senal actualiza stock con formulario abierto');
  assert(await evaluar(c,"npCart[__pid]===1"),'actualizacion conserva carrito');
  await evaluar(c,"npStockMode=function(){return 'ilimitado';};npRenderCatalogo();1");
  assert(await evaluar(c,"document.getElementById('npProd_'+__pid).textContent.includes('hay 3 en el freezer')"),'fechas sin tope tambien muestran stock fisico');
  await evaluar(c,"window.__fallar=true;npFetchStock(true)");
  assert(await evaluar(c,"document.getElementById('npInvEstado').textContent.includes('No se pudo')"),'error visible y reintentable');
  assert(await evaluar(c,"npFisico('PPM')===3"),'fallo no borra ultimo stock');
  console.log('OK navegador: stock visible, carga, Supabase, señal en vivo, carrito, fechas y errores');
 }finally{c.matar();}
})().catch(e=>{console.error(e);process.exitCode=1;});
