/* Regresiones sin red ni datos reales. Las respuestas demoradas reproducen la
   espera de Sheets y las carreras entre una lectura y el siguiente toque. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),acorn=require('acorn'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const leer=f=>process.argv.includes('--anterior')?require('child_process').execFileSync('git',['show','HEAD:'+f],{cwd:root,encoding:'utf8',maxBuffer:12e6}):fs.readFileSync(path.join(root,f),'utf8');
const panel=leer('_src/panel.src.html'), ruta=leer('ruta.html');
function fn(src,name){const i=src.indexOf('function '+name+'(');assert(i>=0,name+' existe');return src.slice(i,acorn.parseExpressionAt(src,i,{ecmaVersion:'latest'}).end);}
function ctx(names,extra={},src=panel){const c=vm.createContext(Object.assign({Promise,Response,TypeError,Date,JSON,console,window:{},document:{hidden:false},setTimeout,clearTimeout},extra));names.forEach(n=>vm.runInContext(fn(src,n),c));return c;}
const tick=()=>new Promise(r=>setImmediate(r));
let n=0;function ok(name,cond){assert(cond,name);n++;console.log('OK '+name);}
(async()=>{
  let finish,calls=0;
  const c=ctx(['_pfAplicar'],{API:'apps',_pfVuelo:null,fetch:()=>{calls++;return new Promise(r=>finish=()=>r(new Response('{"ok":true}')));}});
  let done=false;c._pfAplicar({ok:true,diferida:true,baseEscribio:true}).then(()=>done=true);await tick();
  ok('una escritura confirmada libera la UI aunque Sheets siga pendiente',done&&calls===1);
  await c._pfAplicar({diferida:true,baseEscribio:true});ok('una rafaga no duplica el aplicador en vuelo',calls===1);
  finish();await tick();
  done=false;c._pfAplicar({diferida:true,directo:true}).then(()=>done=true);await tick();
  ok('aceptada sin baseEscribio conserva la espera (directo no basta)',!done);
  finish();await tick();ok('la compatibilidad con Sheets termina al volver el aplicador',done);

  let render=0;
  const p=ctx(['_pedVivoAplicar'],{D:{pedidos:[{h:'Home',n:'1',ep:'Cobrado'},{h:'Pilar',n:'2',ep:'No Cobrado'}]},
    _sbCambiosPed:{'Home|1':100},_SB_ESPERA_TRAS_CAMBIO:360000,_sbClavePedido:q=>q.h+'|'+q.n,
    _sbFusionar:()=>{throw Error('la lectura armada no debe pasar por la replica');},
    _sbCompletar:()=>{},_hayEditorAbierto:()=>false,render:()=>render++,_sbGuardarCopia:()=>{},cur:'pedidos'});
  p._pedVivoAplicar([{h:'Home',n:'1',ep:'No Cobrado'}],101);
  ok('la pantalla armada relee una fila tocada localmente sin esperar seis minutos',p.D.pedidos[0].ep==='No Cobrado'&&render===1);
  ok('no desaparecen pedidos de otros canales',p.D.pedidos.length===2);
  p._sbCambiosPed['Home|1']=103;
  p._pedVivoAplicar([{h:'Home',n:'1',ep:'Cobrado'}],102);
  ok('una lectura iniciada antes del siguiente toque no lo pisa',p.D.pedidos[0].ep==='No Cobrado');
  p._sbCambiosPed['Home|1']=Date.now();
  p._pedVivoAplicar([{h:'Home',n:'1',ep:'Cobrado'}]);
  ok('la replica cruda mantiene su defensa contra datos atrasados',p.D.pedidos[0].ep==='No Cobrado');
  p.D.pedidos=[];p._sbCambiosPed={};p._pedVivoAplicar([{h:'Home',n:'3'}],Date.now());
  ok('Pedidos en vivo tambien llena una lista vacia',p.D.pedidos.length===1);

  let refreshes=0,resolveRead;let scheduled=[];
  const o=ctx(['_ordenConfirmada','_ordenVistaPedir'],{cur:'caja',_ordenCambios:{},_ordenVistaVuelo:{},_ordenVistaTimer:null,
    setTimeout:f=>{scheduled.push(f);return scheduled.length;},clearTimeout:()=>{},
    window:{__ordenVistas:{caja:()=>{refreshes++;return new Promise(r=>resolveRead=r);}}}});
  o._ordenConfirmada({}, {ok:false,baseEscribio:true});ok('un rechazo no invalida ni anuncia cambios',Object.keys(o._ordenCambios).length===0);
  o._ordenConfirmada({}, {ok:true,directo:true});ok('una orden solo encolada no se presenta como escrita',Object.keys(o._ordenCambios).length===0);
  o._ordenConfirmada({}, {ok:true,baseEscribio:true});
  ok('la confirmacion invalida las cuatro tabs y Pagos',Object.keys(o._ordenCambios).length===5);
  o._ordenVistaPedir();await tick();o._ordenVistaPedir();await tick();
  ok('solo se relee la tab visible y no hay dos lecturas paralelas',refreshes===1);
  o._ordenConfirmada({}, {ok:true,baseEscribio:true});resolveRead(true);await tick();
  ok('una segunda escritura durante la lectura sigue pendiente',o._ordenCambios.caja===2);
  o._ordenVistaPedir();await tick();resolveRead(true);await tick();
  ok('al confirmar la nueva lectura se consume solo esa tab',!o._ordenCambios.caja&&o._ordenCambios.ruta===2);
  o.document.hidden=true;o.cur='ruta';o._ordenVistaPedir();await tick();ok('en segundo plano no se solicitan lecturas',refreshes===2);

  let mode='si',base=0,apps=0,fail=false;
  const r=ctx(['_pedirEntregasTxt'],{_rutEntVuelo:null,_rutMsApps:0,RUT_APPS_SCRIPT_URL:'https://apps.invalid',
    _sbPermiso:()=>Promise.resolve({pal:{rutaPg:mode},url:'https://base.invalid',key:'prueba',token:'prueba'}),
    fetch:async url=>{if(url.includes('base.invalid')){base++;if(fail)return new Response('{}',{status:503});return new Response('{"e":[],"hechas":[]}');}apps++;return new Response('{"e":[]}');}},ruta);
  ok('Ruta en modo si se pinta desde Supabase',JSON.parse(await r._pedirEntregasTxt())._rutaBase===true&&base===1&&apps===0);
  mode='medir';await r._pedirEntregasTxt();ok('modo medir sigue mostrando Apps Script',apps===1&&base===1);
  mode='si';fail=true;await r._pedirEntregasTxt();ok('si Supabase falla se conserva la alternativa de Apps Script',apps===2);
  let applied=0,resolveCaja=[];
  const caja=ctx(['_recargarCaja'],{_cajaLectura:0,_frescoEnVuelo:()=>{},_palancaVal:()=> 'si',_sbPermiso:()=>{},
    _cajaArmaTraer:()=>new Promise(res=>resolveCaja.push(res)),_cajaAplicar:d=>applied=d.id,
    _editandoEnCaja:()=>false,rCaja:()=>{},rEgresos:()=>{}});
  const a=caja._recargarCaja(true),b=caja._recargarCaja(true);
  resolveCaja[1]({id:2,movimientos:[]});await b;resolveCaja[0]({id:1,movimientos:[]});await a;
  ok('una lectura vieja de Caja no pisa la que ya vio el nuevo movimiento',applied===2);
  let pushed=0;
  const noop=()=>{};
  const q=ctx(['processSyncQueue'],{isOnline:true,syncQueue:[{action:'marcarEntregado',hoja:'Home',row:1}],syncBusy:false,
    _armarGuardLoaderSync:noop,_limpiarGuardLoaderSync:noop,rutHideLoader:noop,_repConfirmado:noop,
    _cobConfirmado:noop,_estConfirmado:noop,saveLocal:noop,_rutPintarBanner:noop,rutHechas:[],
    _rutDirecta:()=>Promise.resolve({ok:true,diferida:true,baseEscribio:true}),_pfAplicar:()=>{pushed++;return Promise.resolve();},
    setTimeout:()=>1,clearTimeout:noop,RUT_APPS_SCRIPT_URL:'apps',fetch:()=>new Promise(()=>{})},ruta);
  q.processSyncQueue();await tick();
  ok('Ruta confirma y saca de la cola al escribir la base, sin tres reenvios a Sheets',q.syncQueue.length===0&&pushed===1&&!q.syncBusy);
  let opts;const rec=ctx(['_recargarPedidos'],{loadRapido:o=>{opts=o;return Promise.resolve();}});await rec._recargarPedidos();
  ok('un boton de Pedidos no espera a Caja y Cobros para refrescar',opts.soloPedidos===true);
  console.log(n+' verificaciones correctas');
})().catch(e=>{console.error(e);process.exitCode=1;});
