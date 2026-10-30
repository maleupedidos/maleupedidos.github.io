/* Fecha de pedido distinta de entrega: navegador real, datos inventados y POST
   de escritura interceptados. No modifica pedidos ni la base. */
'use strict';
const {execFileSync}=require('child_process'),path=require('path');
const {abrir,evaluar}=require('./cdp'),prep=require('./sesion_prep');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function esperar(c,e,ms=60000){const t=Date.now();while(Date.now()-t<ms){if(await evaluar(c,e))return true;await pause(250);}throw Error('No se cumplio: '+e);}
function chk(n,c){if(!c)throw Error(n);console.log('OK '+n);}
(async()=>{
  const token=execFileSync('python',[path.join(__dirname,'leer_sesion.py')],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const cli=await abrir();
  try{
    await cli.enviar('Page.enable');
    cli.escuchar(m=>{if(m==='Page.javascriptDialogOpening')cli.enviar('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});});
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument',{source:prep(token)});
    await cli.enviar('Page.navigate',{url:process.env.BASE_URL||'http://localhost:8167/app.html'});
    await esperar(cli,'!!(window.D&&D.pedidos&&D.pedidos.length&&typeof openOrdDetail==="function")');
    await evaluar(cli,`window.__fechaPrueba={h:'Home',n:'999301',r:9001,c:'Prueba fecha del pedido',f:'28/10/2026',hr:'19:01',dee:'2026-10-30',de:'Viernes',es:'Pendiente',ep:'No Cobrado',fp:'Efectivo',o:'Deposito',oDet:'{}',br:'Barrio de prueba',lo:'2',$:45000,p:[{a:'PMu',q:1}]};
      D.pedidos.push(__fechaPrueba);go('pedidos');render();1`);
    await esperar(cli,`[].slice.call(document.querySelectorAll('.pc-pedido-fecha')).some(function(e){return /Pedido: 28 .*19:01/.test(e.textContent);})`);
    chk('la fecha del pedido se ve con la tarjeta plegada',true);
    for(const width of [390,1440]){
      await cli.enviar('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
      await evaluar(cli,`openOrdDetail('Home','999301');1`);
      const rows=await evaluar(cli,`[].slice.call(document.querySelectorAll('#ordBody .ord-cli-meta .row')).map(function(e){return e.textContent;})`);
      chk(width+'px: la fecha de entrega tiene su propio renglon',rows.some(t=>/Entrega: 30\/10\/2026/.test(t)&&!t.includes('19:01')));
      chk(width+'px: la fecha y hora del pedido van juntas',rows.some(t=>/Pedido realizado: 28\/10\/2026 · 19:01/.test(t)));
      chk(width+'px: el texto no desborda de la ficha',await evaluar(cli,`(function(){var e=document.querySelector('#ordBody .ord-pedido-fecha'),p=e.parentElement;return e.getBoundingClientRect().right<=p.getBoundingClientRect().right+1;})()`));
      await evaluar(cli,'closeOrdDetail();1');
    }
    await evaluar(cli,`(function(){var f=window.fetch;window.fetch=function(u,o){var s=String(u);if(s.includes('ruta_entregas_pantalla')||s.includes('action=entregas'))return Promise.resolve(new Response(JSON.stringify({e:[{h:'Home',id:'999301',r:9001,c:'Prueba fecha del pedido',f:'28/10/2026',hr:'19:01',fe:getHoyISO(),de:'Viernes',es:'Pendiente',ep:'No Cobrado',fp:'Efectivo',o:'Orden de Compra',b:'Barrio de prueba',sb:'Barrio de prueba',l:'2',$:45000,p:[{a:'PMu',q:1}],oD:{},oc:[]}],hechas:[]}),{headers:{'Content-Type':'application/json'}}));return f.apply(this,arguments);};})();go('ruta');1`);
    await esperar(cli,`typeof getPendientes==='function'&&getPendientes().some(function(p){return p.id==='999301';})`);
    await evaluar(cli,`confirmarArmado('Home|R9001');switchTab('ruta');1`);
    await esperar(cli,`!!document.querySelector('#rutaBody .rtc-pedido-fecha')`);
    chk('Ruta: pedido realizado conserva el 28/10 a las 19:01',await evaluar(cli,`document.querySelector('#rutaBody .rtc-pedido-fecha').textContent==='Pedido realizado: 28/10/2026 · 19:01'`));
    chk('Ruta: la entrega tiene otro renglon',await evaluar(cli,`!!document.querySelector('#rutaBody .rtc-entrega-fecha')&&!document.querySelector('#rutaBody .rtc-entrega-fecha').textContent.includes('19:01')`));
    console.log('Fechas verificadas; ninguna escritura llego a produccion.');
  }finally{cli.matar();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
