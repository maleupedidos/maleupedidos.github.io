'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),acorn=require('acorn');
const src=fs.readFileSync(require('path').join(__dirname,'../ruta.html'),'utf8');
const names=['_npPzGuardarOcupadas','_npInvInvalidar','_npPzAceptadas','_npPzFiltrar','_npInvDatos','npFetchPiezas','npPzDisp','npPzTap'];
let pending=[],renders=0,store={};
const c=vm.createContext({Promise,Date,JSON,Object,Array,Number,String,Math,
 localStorage:{getItem:k=>store[k],setItem:(k,v)=>store[k]=v},
 _npInvVersion:0,_npPzVuelo:null,_npPzOcupadas:{},NP_PIEZAS:null,NP_PIEZAS_TS:0,NP_PIEZAS_COPIA:0,NP_STOCK_TS:0,
 _npCopiaLeer:()=>null,_npCopiaGuardar:()=>{},npRenderCatalogo:()=>renders++,npUpdateTotal:()=>{},showToast:()=>{},
 npPzSel:{},npCart:{},RUT_APPS_SCRIPT_URL:'mock',fetch:()=>new Promise(resolve=>pending.push(d=>resolve({json:()=>Promise.resolve(d)})))});
for(const name of names){const i=src.indexOf('function '+name+'(');assert(i>=0,name);vm.runInContext(src.slice(i,acorn.parseExpressionAt(src,i,{ecmaVersion:'latest'}).end),c);}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const old=c.npFetchPiezas(true);assert.equal(c.npFetchPiezas(true),old,'lecturas simultaneas comparten solicitud');
 c._npPzAceptadas({items:[{piezas:['A']}]});
 const fresh=c.npFetchPiezas(true);assert.equal(pending.length,2,'un alta invalida la lectura anterior');
 pending[1]({CVa:[{id:'A',kg:1},{id:'B',kg:2}]});await fresh;
 assert.equal(c.npPzDisp('CVa').map(x=>x.id).join(','),'B','replica atrasada no ofrece la pieza aceptada');
 assert.equal(JSON.parse(store.mc_np_ocupadas).A,true,'proteccion persiste al cerrar');
 pending[0]({CVa:[{id:'A',kg:1},{id:'C',kg:3}]});await old;
 assert.equal(c.npPzDisp('CVa').map(x=>x.id).join(','),'B','respuesta anterior no pisa lista nueva');
 let f=c.npFetchPiezas(true);pending[2]({ok:true});assert.equal(await f,false,'acuse no se confunde con lista vacia');
 assert.equal(c.npPzDisp('CVa').length,1,'error conserva disponibilidad conocida');
 f=c.npFetchPiezas(true);pending[3]({CVa:[{id:'B',kg:2}]});await f;
 assert.equal(c._npPzOcupadas.A,undefined,'reserva observada termina la proteccion local');
 f=c.npFetchPiezas(true);pending[4]({CVa:[{id:'A',kg:1}]});await f;
 assert.equal(c.npPzDisp('CVa')[0].id,'A','pieza liberada vuelve a ofrecerse');
 const el=id=>({getAttribute:k=>({'data-pid':'1','data-pz':id,'data-kg':'1'})[k]});
 c.npPzTap(el('B'));assert.equal(c.npCart[1],undefined,'boton viejo no agrega pieza ausente');
 c.npPzSel[1]=[{id:'B',kg:1}];c.npCart[1]=1;c.npPzTap(el('B'));
 assert.equal(c.npCart[1],undefined,'permite quitar seleccion que dejo de estar disponible');
 assert(src.includes("if(rutCurrentTab==='nuevo')return npFetchStock(true)"),'reloj y regreso actualizan formulario');
 assert(src.includes("if(rutCurrentTab==='nuevo'){_npInvInvalidar();return npFetchStock(true);}"),'escrituras confirmadas actualizan formulario');
 console.log('OK autopedido: concurrencia, reserva diferida, persistencia, respuestas tardias, errores y seleccion');
})().catch(e=>{console.error(e);process.exitCode=1;});
