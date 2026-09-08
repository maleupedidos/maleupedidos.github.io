/* Cliente CDP minimo, copiado de _tools/humo.js para reusarlo en diagnosticos. */
const fs = require('fs'); const os = require('os'); const path = require('path');
const { spawn } = require('child_process');
const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];
function buscarChrome(){ for(const c of CHROMES) if(fs.existsSync(c)) return c; throw new Error('no hay Chrome'); }
async function esperarPagina(puerto, intentos=60){
  for(let i=0;i<intentos;i++){
    try{ const r=await fetch('http://127.0.0.1:'+puerto+'/json/list'); const l=await r.json();
      const p=l.find(t=>t.type==='page'&&t.webSocketDebuggerUrl); if(p) return p.webSocketDebuggerUrl; }catch(e){}
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error('Chrome no abrio el puerto');
}
function conectar(url){
  const ws=new WebSocket(url); let id=0; const pend=new Map(); const oy=[];
  ws.addEventListener('message',ev=>{ const m=JSON.parse(ev.data);
    if(m.id&&pend.has(m.id)){ const{ok,mal}=pend.get(m.id); pend.delete(m.id); m.error?mal(new Error(m.error.message)):ok(m.result); }
    else if(m.method) oy.forEach(f=>f(m.method,m.params)); });
  const listo=new Promise((res,rej)=>{ ws.addEventListener('open',res); ws.addEventListener('error',()=>rej(new Error('no conecte'))); });
  return { listo,
    enviar(method,params){ return new Promise((ok,mal)=>{ const i=++id; pend.set(i,{ok,mal}); ws.send(JSON.stringify({id:i,method,params:params||{}})); }); },
    escuchar(f){ oy.push(f); }, cerrar(){ try{ws.close();}catch(e){} } };
}
async function abrir(opts){
  const chrome=buscarChrome();
  const perfil=fs.mkdtempSync(path.join(os.tmpdir(),'maleu-diag-'));
  const puerto=9222+Math.floor(Math.random()*500);
  const args=['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
    '--remote-debugging-port='+puerto,'--user-data-dir='+perfil,'about:blank'];
  const proc=spawn(chrome,args,{stdio:'ignore'});
  const wsUrl=await esperarPagina(puerto);
  const cli=conectar(wsUrl); await cli.listo;
  cli.matar=()=>{ try{cli.cerrar();}catch(e){} try{proc.kill();}catch(e){} try{fs.rmSync(perfil,{recursive:true,force:true});}catch(e){} };
  return cli;
}
async function evaluar(cli, expr){
  const r=await cli.enviar('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails){ const d=r.exceptionDetails; throw new Error((d.exception&&(d.exception.description||d.exception.value))||d.text); }
  return r.result.value;
}
module.exports={abrir,evaluar};
