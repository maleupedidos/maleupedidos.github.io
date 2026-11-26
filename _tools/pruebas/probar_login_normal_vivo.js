/* Prueba solo el login normal contra la base: sin modo ensayo, Google bloqueado.
 * BASE_URL=http://localhost:8573/app.html node ... [rep]
 * No crea pedidos, cobros ni movimientos. Usa las cuentas PRUEBA existentes.
 */
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),cdp=require('./cdp');
const c=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.maleu/robot.json'),'utf8'));
const rep=process.argv.includes('rep');const usuario=rep?c.repUsuario||'pruebarobot':c.usuario,pin=String(rep?c.pinRep:c.pin);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const cli=await cdp.abrir();try{
 let intentos=0, acciones=[];await cli.enviar('Fetch.enable',{patterns:[{urlPattern:'*script.google.com*'},{urlPattern:'*script.googleusercontent.com*'}]});
 cli.escuchar((m,p)=>{if(m==='Fetch.requestPaused'){intentos++;let a='?';try{a=new URL(p.request.url).searchParams.get('action')||JSON.parse(p.request.postData||'{}').action||'?';}catch(e){}acciones.push(a);cli.enviar('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'}).catch(()=>{});}});
 await cli.enviar('Page.enable',{});await cli.enviar('Page.navigate',{url:process.env.BASE_URL||'https://app.maleu.com.ar/app.html'});
 const ev=x=>cdp.evaluar(cli,x);const wait=async x=>{for(let i=0;i<120;i++){if(await ev(x).catch(()=>false))return true;await sleep(250);}return false;};
 if(!await wait("typeof panelDoLogin==='function'"))throw Error('no apareció el login');
 await ev(`document.getElementById('loginUser').value=${JSON.stringify(usuario)};document.getElementById('loginPin').value=${JSON.stringify(pin)};panelDoLogin();`);
 if(!await wait("typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario"))throw Error('no entró');
 await sleep(2500);
 const result=await ev("({rol:SESSION.rol,base:!!localStorage.getItem('mc_sbses'),ensayo:localStorage.getItem('maleu_ensayo'),fuente:window.__loginDe})");
 if(intentos||!result.base||result.ensayo==='1')throw Error('login no independiente: '+JSON.stringify({intentos,acciones,...result}));
 console.log('OK login normal '+JSON.stringify({intentosApps:intentos,...result}));
 }finally{cli.matar();}})().catch(e=>{console.error(e.message);process.exit(1);});
