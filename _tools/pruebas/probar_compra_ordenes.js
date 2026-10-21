/* LA COMPRA A MANO DE ABASTECIMIENTO CON LAS ÓRDENES (4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_compra_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO (datos inventados). + NUEVO → Prov Uno →
   2 de PPM para un vendedor → Confirmar compra:
   · prendida (`diferida`): el POST lleva su id, después `pedidosFuenteAplicar`, y
     RECIÉN después se pide la lista (`busqueda`); el aviso nombra el pedido de Red
     SIN número (todavía no existe: lo crea el aplicador) y con el facturado;
   · apagada: ningún `pedidosFuenteAplicar`, y el aviso trae el número. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const CAT = { ts: 1, proveedores: ['Prov Uno'], deps: [{ id: 'ustariz', nombre: 'Depósito Ustariz', dueno: 'Tadeo' }],
  productos: { 'Prov Uno': [{ a: 'PPM', n: 'Pack Pizzas — Muzzarella', cat: 'Pack Pizzas', c: 9000, s: 0, u: 'u', dem: 10, wk: [9, 10, 11], dep: 'ustariz', pd: { ustariz: 0 } }] } };
const BUSQ = { ts: Date.now() + 60000, provs: [], clientes: [], total: 0, ocs: [], semActual: 42, anioActual: 2026, stocksProductos: {}, enPoderVend: [], ccError: '', deudas: [], cuentas: [] };

const STUB = modo => `(function(){
  window.__log=[]; window.__toasts=[]; var modo=${JSON.stringify(modo)};
  try{ localStorage.removeItem('maleu_busqueda'); localStorage.setItem('maleu_busqueda_tab','proveedores'); }catch(e){}
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){
      var m=url.match(/action=([A-Za-z_]+)/), a=m?m[1]:'?'; if(window.__mirar) window.__log.push('GET '+a);
      return resp(a==='catalogo' ? ${JSON.stringify(CAT)} : a==='busqueda' ? ${JSON.stringify(BUSQ)} : a==='comprasCarne' ? {ok:true,compras:[],cortes:[],provs:[],precios:{}}
        : a==='vendedores' ? {ok:true,vendedores:[{nombre:'Rufino Ardanaz'}]} : {ok:true,pedidos:[],canales:{},oc:{lista:[]},stock:[]});
    }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action==='compraManual'){
        var r={ok:true,filas:1,totalCosto:18000,primerOC:'OC-900',ultimoOC:'OC-900',pedidoRed:(modo==='si'?null:121),facturadoVendedor:23000};
        if(modo==='si'){ r.aceptada=true; r.diferida=true; r.orden=9; r.pedidoRedPendiente=true; }
        return resp(r);
      }
      if(b.action==='pedidosFuenteAplicar') return new Promise(function(ok){ setTimeout(ok,800); }).then(function(){ return resp({ok:true,hechas:1,quedan:0}); });
      return resp({ok:true});
    });
  };
})();`;

async function correr(modo) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  await evaluar(cli, "go('busqueda'); 1");
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof abaSwitchTab==='function' && typeof confirmarCompra==='function'")) break; await pausa(250); }
  await evaluar(cli, "abaSwitchTab('nuevo'); 1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "[].some.call(document.querySelectorAll('#npProv option'),function(o){return o.value==='Prov Uno';})")) break; await pausa(250); }
  await evaluar(cli, "(function(){var s=document.getElementById('npProv'); s.value='Prov Uno'; s.dispatchEvent(new Event('change',{bubbles:true}));})(); 1");
  await pausa(600);
  /* Para un vendedor: se agrega la opcion si la lista de vendedores no la trajo. */
  const vend = await evaluar(cli, "(function(){var s=document.getElementById('npVendedor'); if(!s) return 'sin select'; if(![].some.call(s.options,function(o){return o.value==='Rufino Ardanaz';})){var op=document.createElement('option');op.value='Rufino Ardanaz';op.textContent='Rufino';s.appendChild(op);} s.value='Rufino Ardanaz'; s.dispatchEvent(new Event('change',{bubbles:true})); return s.value;})()");
  await evaluar(cli, "npSetQty('PPM', 2); 1");
  await pausa(400);
  /* Los avisos que da la pantalla, para mirar que dice del pedido de Red. */
  /* Los avisos se leen del DOM (#abaToast): la sub-app llama a su propio abaShowToast,
     asi que reemplazar el de window no los veria. */
  await evaluar(cli, "(function(){var t=document.getElementById('abaToast'); if(t) new MutationObserver(function(){ window.__toasts.push(t.textContent); }).observe(t,{childList:true,characterData:true,subtree:true});})(); window.__mirar=1; window.__log=[]; try{ confirmarCompra(); }catch(e){ window.__log.push('EXPLOTO '+e.message); } 1");
  await pausa(4500);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5), toasts: window.__toasts.slice() })');
  cli.matar();
  return Object.assign(r, { vend });
}

(async () => {
  console.log('\n== La compra a mano con las órdenes de pedido (' + ANCHO + ' px) ==\n');
  let r = await correr('si');
  chk('la compra es para el vendedor', r.vend === 'Rufino Ardanaz', r.vend);
  const iP = r.log.indexOf('POST compraManual (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
  const iG = r.log.indexOf('GET busqueda', iP);
  chk('prendida: confirmar manda su id', iP >= 0, r.log);
  chk('prendida: empuja al aplicador y recién después pide la lista', iA > iP && iG > iA, r.log);
  chk('prendida: el aviso dice la venta sin inventar el N° del pedido', r.toasts.some((t) => /^Pedido Red creado — .*23\.000/.test(t)), r.toasts);
  chk('sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
  r = await correr('no');
  const iP2 = r.log.indexOf('POST compraManual (id)');
  chk('apagada: ningún pedidosFuenteAplicar, pide la lista, y el aviso trae el N°', iP2 >= 0 && r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.indexOf('GET busqueda', iP2) > iP2 && r.toasts.some((t) => /^Pedido Red #121 creado/.test(t)), [r.log, r.toasts]);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
