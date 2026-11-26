// Solo lectura. Abre la tarjeta real; intercepta el guardado para no modificar el pedido.
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),cdp=require('./cdp');
const c=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.maleu/robot.json'),'utf8'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const cli=await cdp.abrir();try{
 const ev=x=>cdp.evaluar(cli,x);const wait=async x=>{for(let i=0;i<160;i++){if(await ev(x).catch(()=>false))return;await sleep(250);}throw Error('No cargó el pedido');};
 await cli.enviar('Page.enable',{});await cli.enviar('Page.navigate',{url:process.env.BASE_URL||'http://localhost:8573/app.html'});
 await wait("typeof panelDoLogin==='function'");
 await ev(`document.getElementById('loginUser').value=${JSON.stringify(c.usuario)};document.getElementById('loginPin').value=${JSON.stringify(String(c.pin))};panelDoLogin();`);
 await wait("typeof D!=='undefined'&&D&&D.pedidos&&D.pedidos.some(p=>p.h==='Red'&&String(p.n)==='2365')");
 await ev("go('pedidos');");
 await wait("Array.from(document.querySelectorAll('#pList .pc')).some(c=>c.textContent.includes('Gaston Schisano'))");
 const result=await ev(`(async function(){
  var card=Array.from(document.querySelectorAll('#pList .pc')).find(c=>c.textContent.includes('Gaston Schisano'));
  _pcCuerpo(card);card.classList.remove('collapsed');
  var box=document.getElementById('orig-Red2365');if(!box)throw Error('Falta el selector de origen');
  var rows=Array.from(box.querySelectorAll('.origen-prod'));
  var valores=rows.map(r=>({a:r.dataset.a,d:Number(r.querySelector('[data-role=d]').value),oc:Number(r.querySelector('[data-role=oc]').value)}));
  window.confirm=()=>true;window.__origenPrueba=null;
  _ordenPost=function(p){window.__origenPrueba=p;return Promise.resolve({json:()=>Promise.resolve({ok:false,err:'prueba sin escribir'})});};
  _recargarPedidos=()=>Promise.resolve();confirmarOrigen(box.querySelector('button[data-uid]'));
  await new Promise(r=>setTimeout(r,300));
  return {valores,pedido:window.__origenPrueba&&window.__origenPrueba.id,hoja:window.__origenPrueba&&window.__origenPrueba.hoja,accion:window.__origenPrueba&&window.__origenPrueba.action,productos:window.__origenPrueba&&window.__origenPrueba.productos};
 })()`);
 if(result.pedido!=='2365'||result.hoja!=='Red'||result.accion!=='setOrigenProductos'||result.productos?.length!==2)throw Error(JSON.stringify(result));
 console.log('OK selector y solicitud sin escribir: '+JSON.stringify(result));
 }finally{cli.matar();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
