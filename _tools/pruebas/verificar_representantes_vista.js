/* Solo lecturas reales. Comprueba que las listas visibles incluyan los pedidos
   pendientes de un representante; los POST de escritura quedan interceptados. */
'use strict';
const path=require('path'),{execFileSync}=require('child_process'),{abrir,evaluar}=require('./cdp'),prep=require('./sesion_prep');
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
async function esperar(c,e,ms=60000){const t=Date.now();while(Date.now()-t<ms){if(await evaluar(c,e))return true;await pausa(300);}throw Error('No se cumplio: '+e);}
function ok(n,c){if(!c)throw Error(n);console.log('OK '+n);}
(async()=>{
  const filtro=process.argv[2];if(!filtro)throw Error('Falta parte del nombre del representante');
  const token=execFileSync('python',[path.join(__dirname,'leer_sesion.py')],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const c=await abrir();try{
    await c.enviar('Page.enable');c.escuchar(m=>{if(m==='Page.javascriptDialogOpening')c.enviar('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});});
    await c.enviar('Page.addScriptToEvaluateOnNewDocument',{source:prep(token)});
    await c.enviar('Page.navigate',{url:process.env.BASE_URL||'http://localhost:8167/app.html'});
    await esperar(c,`!!(window.D&&D.pedidos&&D.pedidos.length&&_palancaVal('pedidosArma'))`);
    await evaluar(c,`window.__repFiltro=${JSON.stringify(filtro)};window.__repNombre=(D.pedidos.find(function(p){return p.h==='Red'&&String(p.retira||'').toLowerCase().includes(__repFiltro.toLowerCase());})||{}).retira;go('ruta');1`);
    await esperar(c,`typeof rutCliVendCargar==='function'&&!!window.__repNombre`);
    await evaluar(c,`switchTab('cobros');rutCliVendCargar()`);
    await esperar(c,`!!document.querySelector('#cobrosContent .cobro-red-card')`);
    const cob=await evaluar(c,`({n:_rutCVLista(true).length,deuda:_rutCVLista().length,html:document.getElementById('cobrosContent').textContent.includes('Por entregar y sin cobrar')})`);
    ok('Cobros incluye a los clientes por entregar, separados de la deuda',cob.n>cob.deuda&&cob.html);
    await evaluar(c,`switchTab('ruta');refresh(true,true)`);
    await esperar(c,`getSorted().some(function(e){return e._redAgg&&e._vendedor===__repNombre;})`);
    const bolsa=await evaluar(c,`(function(){var b=getSorted().find(function(e){return e._redAgg&&e._vendedor===__repNombre;});return {wrap:b.p.some(function(p){return p.a==='WPo'&&p.q>0;}),carne:b.p.some(function(p){return p.a==='CVa'&&p.q>0;}),n:b._keys.length};})()`);
    ok('la bolsa del retiro incluye wraps del pedido futuro',bolsa.wrap);
    ok('la bolsa del retiro incluye la carne y todos los pedidos pendientes',bolsa.carne&&bolsa.n>=2);
    await evaluar(c,`go('busqueda');1`);
    await esperar(c,`typeof abaSwitchTab==='function'&&typeof pedNav==='function'`);
    await evaluar(c,`window.__ordenVistas.busqueda()`);
    await evaluar(c,`abaSwitchTab('pedidos');pedNav('redv:'+__repNombre);1`);
    await esperar(c,`/Del depósito/.test(document.getElementById('pedidosList').textContent)`);
    for(const width of [390,1440]){
      await c.enviar('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
      const ui=await evaluar(c,`(function(){var e=document.querySelector('#pedidosList .cliente-card');return {wrap:/wraps/i.test(e.textContent),carne:/carnes/i.test(e.textContent),deposito:/Del depósito/.test(e.textContent),ancho:e.scrollWidth<=e.clientWidth+1};})()`);
      ok(width+'px: el consolidado incluye wraps, carne y su origen',ui.wrap&&ui.carne&&ui.deposito);
      ok(width+'px: la bolsa completa no desborda la tarjeta',ui.ancho);
    }
    console.log('Verificacion de las tres vistas correcta; sin escrituras operativas.');
  }finally{c.matar();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
