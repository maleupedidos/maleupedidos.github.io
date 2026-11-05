/* Login normal (sin modo ensayo): ninguna credencial sale a Apps Script.
 * node _tools/pruebas/probar_login_solo_base.js [panel.src.html]
 */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const src=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../_src/panel.src.html'),'utf8');
const start=src.indexOf('function panelDoLogin(){'),end=src.indexOf('function panelDoLogout()',start);
const code=src.slice(start,end);
async function caso(name,response,wanted){
 const store=new Map([['maleu_ruta',JSON.stringify({syncQueue:[{id:'pendiente'}]})]]);
 const elements={}; for(const id of ['loginUser','loginPin','loginErr','loginBtn','loginRemember'])elements[id]={value:'',textContent:'',disabled:false,checked:true,classList:{add(){},remove(){}}};
 elements.loginUser.value='usuario-prueba';elements.loginPin.value='123456';
 let entered=0,apps=0,base=0;
 const ctx={document:{getElementById:id=>elements[id]},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 window:{},SESSION:null,API:'https://script.google.com/NO-REAL',Promise,setTimeout:()=>0,Date,console,
 fetch:()=>{apps++;return Promise.resolve({json:async()=>({ok:true,usuario:'otro',rol:'admin',token:'viejo'})});},
 _loginBase:async()=>{base++;if(response instanceof Error)throw response;return response;},
 _tabsExpandir:x=>x,_sbPermiso:async()=>({}),_enterApp:()=>entered++};
 vm.createContext(ctx);vm.runInContext(code,ctx);ctx.panelDoLogin();
 await new Promise(r=>setImmediate(r));
 assert.equal(apps,0,name+': envió el PIN a Apps Script');assert.equal(base,1);
 assert.equal(entered,wanted?1:0,name+': entrada incorrecta');
 assert.equal(store.get('maleu_ruta'),JSON.stringify({syncQueue:[{id:'pendiente'}]}),'perdió la cola');
 if(!wanted){assert.equal(elements.loginBtn.disabled,false);assert.ok(elements.loginErr.textContent);}
 if(response?.rol==='vendedor'&&wanted)assert.equal(JSON.parse(store.get('maleu_red_session')).usuario,'usuario-prueba');
 console.log('ok '+name);
}
(async()=>{
 for(const rol of ['admin','empleado','repartidor','vendedor'])await caso(rol,{ok:true,usuario:'usuario-prueba',rol,tabs:['inicio'],viaBase:true,barrios:[]},true);
 await caso('PIN incorrecto',{ok:false,err:'PIN incorrecto'},false);
 await caso('red caída',new Error('sin conexión'),false);
 await caso('sin respuesta',null,false);
 await caso('vendedor incompleto',{ok:true,rol:'vendedor',viaBase:true},false);
 console.log('8/8: login solo base, errores visibles y cola preservada');
})().catch(e=>{console.error(e.message);process.exit(1);});
