/* Sin red: conserva cantidades y deuda al completar bolsas y mostrar pendientes. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),acorn=require('acorn'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'), ruta=fs.readFileSync(path.join(root,'ruta.html'),'utf8'),aba=fs.readFileSync(path.join(root,'busqueda.html'),'utf8');
function fn(src,n){const i=src.indexOf('function '+n+'(');assert(i>=0,n);return src.slice(i,acorn.parseExpressionAt(src,i,{ecmaVersion:'latest'}).end);}
function ctx(src,names,extra){const c=vm.createContext(Object.assign({Date,Promise,JSON,console,window:{},setTimeout,clearTimeout},extra));names.forEach(n=>vm.runInContext(fn(src,n),c));return c;}
let n=0;function ok(t,c){assert(c,t);n++;console.log('OK '+t);}
const sum=(xs,a)=>xs.filter(x=>x.abbr===a).reduce((s,x)=>s+x.q,0);
(async()=>{
  const c=ctx(aba,['_abaRedCompletarClientes'],{PROD_NAMES:{CVa:'Vacío',WPo:'Wrap Pollo x2',SCo:'Sorrentinos'}});
  const compras=[{canal:'Red',ped:'1',n:'Prueba',vendedor:'Representante Prueba',semEnt:44,items:[{abbr:'WPo',prod:'Wraps — Pollo x2',q:1,est:'Pedido'}]},
    {canal:'Red',ped:'2',items:[{abbr:'SCo',prod:'Sorrentinos — Prueba',q:2,est:'Recibido'}]}];
  const pedidos=[{h:'Red',n:'1',c:'Prueba',retira:'Representante Prueba',es:'Pendiente',dee:'2026-10-31',o:'Mixto',oDet:'{"CVa":{"d":0.969,"oc":0},"WPo":{"d":0,"oc":1}}',p:[{a:'WPo',q:1},{a:'CVa',q:0.969}]},
    {h:'Red',n:'2',retira:'Representante Prueba',es:'Pendiente',o:'Mixto',oDet:{SCo:{d:3,oc:2}},p:[{a:'SCo',q:5}]},
    {h:'Red',n:'3',retira:'Representante Prueba',es:'Pendiente',dee:'2026-10-31',o:'Deposito',p:[{a:'WVe',q:2}]},
    {h:'Red',n:'4',retira:'Representante Prueba',es:'Pendiente',dee:'2026-10-31',o:'Pendiente',p:[{a:'NUEVO',q:2}]},
    {h:'Red',n:'5',retira:'Representante Prueba',es:'Pendiente',ev:'Entregado',dee:'2026-10-31',p:[{a:'WPo',q:3}]},
    {h:'Red',n:'6',retira:'Representante Prueba',es:'Cancelado',dee:'2026-10-31',p:[{a:'WPo',q:3}]}];
  const antes=JSON.stringify({compras,pedidos}),out=c._abaRedCompletarClientes(compras,pedidos);
  const uno=out.find(x=>x.ped==='1'),dos=out.find(x=>x.ped==='2'),tres=out.find(x=>x.ped==='3');
  ok('el wrap de la OC aparece una vez',sum(uno.items,'WPo')===1);
  ok('la bolsa incluye los 0,969 kg del deposito',sum(uno.items,'CVa')===0.969&&uno.items.find(x=>x.abbr==='CVa').deDeposito);
  ok('la compra y el freezer suman el pedido sin duplicarlo',sum(dos.items,'SCo')===5&&dos.items.filter(x=>x.deDeposito)[0].q===3);
  ok('un pedido enteramente del freezer tambien tiene bolsa',tres&&sum(tres.items,'WVe')===2&&tres.semEnt===44);
  ok('un SKU nuevo no desaparece y no se inventa disponibilidad',out.find(x=>x.ped==='4').items[0].revisarOrigen===true);
  ok('no se vuelven a armar bolsas entregadas ni canceladas',!out.some(x=>x.ped==='5'||x.ped==='6'));
  ok('la vista no escribe ni modifica compras o pedidos',JSON.stringify({compras,pedidos})===antes);
  const otra=c._abaRedCompletarClientes(out,pedidos);ok('repintar no vuelve a sumar la carne',sum(otra.find(x=>x.ped==='1').items,'CVa')===0.969);

  const base={nueva:true,ep:'No Cobrado',debe:0,cobro:100,row:2,n:'1',c:'Cliente Prueba',es:'Entregado'};
  const cobrar=ctx(ruta,['_rutCVLista','_rutCVMonto','_rutRedBloqueHTML'],{
    _rutCV:{vendedores:[{nombre:'Representante Prueba',pedidos:[base,{...base,n:'2',row:3,es:'Pendiente',cobro:200},{...base,n:'3',es:'Cancelado'},{...base,n:'4',nueva:false}]}]},
    _vendNombreLimpio:s=>s,_rtcEsc:s=>s,formatMoney:n=>'$'+n,_cobroVendedorHTML:()=>'',_rutCVCliK:x=>x.p.n,
    _rutCVItemHTML:x=>'<p>'+x.p.n+' '+x.p.es+'</p>'});
  ok('la deuda sigue contando solo lo entregado',cobrar._rutCVLista().length===1);
  ok('los pendientes de entrega se pueden ver sin incluir cancelados',cobrar._rutCVLista(true).length===2);
  const html=cobrar._rutRedBloqueHTML([]);
  ok('el total de deuda no suma el pedido por entregar',html.includes('<span>$100</span>')&&!html.includes('$300'));
  ok('el cliente pendiente queda visible por separado',html.includes('Por entregar y sin cobrar')&&html.includes('2 Pendiente'));
  cobrar._rutCV.vendedores[0].pedidos=[{...base,es:'Pendiente'}];
  ok('Red se dibuja aunque aun no haya deuda de entregados',cobrar._rutRedBloqueHTML([]).includes('1 Pendiente'));

  const p=ctx(ruta,['_rutRedProximosHTML'],{getHoyISO:()=> '2026-10-30',_rtcEsc:s=>s,_sortProds:x=>x||[],_rtcProdFila:p=>'<p>'+p.a+' '+p.q+'</p>'});
  const futuro=p._rutRedProximosHTML([{h:'Red',id:1,retira:'Representante Prueba',fe:'2026-10-31',p:[{a:'WPo',q:1},{a:'CVa',q:0.969}]},
    {h:'Red',id:2,retira:'Otro',fe:'2026-10-30',p:[{a:'NUEVO',q:4}]}]);
  ok('Ruta muestra carne y wraps de manana con su fecha',futuro.includes('31/10/2026')&&futuro.includes('WPo 1')&&futuro.includes('CVa 0.969'));
  ok('mostrar proximos no los mete en el boton de entrega de hoy',!futuro.includes('<button')&&!futuro.includes('NUEVO'));
  const viejo={vendedores:[{nombre:'cache'}]};let resolver;
  const carga=ctx(ruta,['rutCliVendCargar'],{_rutCV:viejo,_rutCVts:0,_rutCVcargando:false,_rutCVvuelo:null,_rutCVerror:'',
    RUT_APPS_SCRIPT_URL:'apps',LEC_ARMA:{redPedidosAbiertos:{}},_lecJson:()=>new Promise(r=>resolver=r),
    document:{getElementById:()=>null},rutCurrentTab:'cobros',renderCobrosFromServer:()=>{},localStorage:{setItem:()=>{}}});
  const a=carga.rutCliVendCargar(),b=carga.rutCliVendCargar();ok('los refrescos de clientes de Red comparten la lectura en vuelo',a===b);
  resolver({ok:false});await a;ok('un fallo de lectura no borra clientes del cache ni se interpreta como lista vacia',carga._rutCV===viejo&&!!carga._rutCVerror);
  console.log(n+' verificaciones correctas');
})().catch(e=>{console.error(e);process.exitCode=1;});
