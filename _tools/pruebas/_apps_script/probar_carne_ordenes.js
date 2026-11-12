/* LA COMPRA DE CARNE CON LAS ÓRDENES (4d-2, 14/10/2026).

     BASE=http://localhost:8157 node _tools/pruebas/probar_carne_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO (datos inventados: el repo es público).
   Abastecimiento → + NUEVO → Caco → corregir la compra CC-0006 → Guardar:
   · prendida (`diferida`): el POST lleva su `clientOpId`, después
     `pedidosFuenteAplicar`, y RECIÉN después se vuelve a pedir el libro
     (`comprasCarne`): si no, la lista no traería la compra todavía;
   · apagada: ningún `pedidosFuenteAplicar`, y vuelve a pedir el libro igual. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8157';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const lin = [{ abbr: 'CCo', corte: 'Carne Colita de Cuadril', det: '', kg: 17.02, precio: 19000, total: 323380 }];
const COMPRAS = { ok: true, ts: Date.now(), pzError: '',
  compras: [{ id: 'CC-0006', fecha: '11/09/2026', t: 1, sem: 37, prov: 'Caco', estado: 'Recibida', fuera: false, nota: '', cargo: 'Lucas', lineas: lin, kg: 17.02, total: 323380, piezas: { n: 0, kg: 0, porCorte: {} } }],
  cortes: [{ abbr: 'CCo', nombre: 'Carne Colita de Cuadril', costo: 19000, prov: 'Caco' }], provs: ['Caco'], precios: { 'Caco|CCo|': { precio: 19000, fecha: '11/09/2026' } } };
const CAT = { ts: 1, proveedores: ['Caco'], deps: [{ id: 'ustariz', nombre: 'Depósito Ustariz', dueno: 'Tadeo' }],
  productos: { Caco: [{ a: 'CCo', n: 'Carnes — Colita de Cuadril', cat: 'Carnes', c: 19000, s: 2, u: 'kg', dem: 10, wk: [9, 10, 11], dep: 'ustariz', pd: { ustariz: 2 } }] } };
const BUSQ = { ts: Date.now() + 60000, provs: [], clientes: [], total: 0, ocs: [], semActual: 42, anioActual: 2026, stocksProductos: {}, enPoderVend: [], ccError: '', deudas: [], cuentas: [] };

const STUB = modo => `(function(){
  window.__log=[]; var modo=${JSON.stringify(modo)};
  try{ localStorage.removeItem('maleu_busqueda'); localStorage.removeItem('maleu_compras_carne'); localStorage.setItem('maleu_busqueda_tab','proveedores'); }catch(e){}
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST'){
      var m=url.match(/action=([A-Za-z_]+)/), a=m?m[1]:'?'; if(window.__mirar) window.__log.push('GET '+a);
      return resp(a==='comprasCarne' ? ${JSON.stringify(COMPRAS)} : a==='catalogo' ? ${JSON.stringify(CAT)} : a==='busqueda' ? ${JSON.stringify(BUSQ)}
        : a==='ocLight' ? {ok:true,oc:{lista:[]}} : {ok:true,pedidos:[],canales:{},oc:{lista:[]},stock:[]});
    }
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      if(window.__mirar) window.__log.push('POST '+b.action+(b.clientOpId?' (id)':''));
      if(b.action==='compraCarneGuardar'){ var r={ok:true,id:b.id||'CC-0008',editada:!!b.id,fuera:false,total:323380,estado:'Recibida',modo:'factura',kgPed:0,kg:17.02,lineas:1,costos:[],costeo:{piezas:0,pedidos:[],error:''}};
        if(modo==='si'){r.aceptada=true;r.diferida=true;r.orden=9;} return resp(r); }
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
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof abaSwitchTab==='function' && typeof abaCcAbrir==='function'")) break; await pausa(250); }
  await evaluar(cli, "abaSwitchTab('nuevo'); 1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "[].some.call(document.querySelectorAll('#npProv option'),function(o){return o.value==='Caco';})")) break; await pausa(250); }
  await evaluar(cli, "(function(){var s=document.getElementById('npProv'); s.value='Caco'; s.dispatchEvent(new Event('change',{bubbles:true}));})(); 1");
  /* Se abre la correccion de CC-0006 cuando el libro ya llego (antes avisa y no abre). */
  let abierto = false;
  for (let i = 0; i < 40 && !abierto; i++) { await evaluar(cli, "abaCcAbrir('CC-0006'); 1"); await pausa(400); abierto = await evaluar(cli, "!!document.getElementById('abaCcGuardar')"); }
  await pausa(500);
  await evaluar(cli, "window.__mirar=1; window.__log=[]; try{ abaCcGuardar(); }catch(e){ window.__log.push('EXPLOTO '+e.message); } 1");
  await pausa(4500);
  const r = await evaluar(cli, '({ log: window.__log.slice(), err: (window.__err||[]).slice(0,5) })');
  cli.matar();
  return Object.assign(r, { abierto });
}

(async () => {
  console.log('\n== La compra de carne con las órdenes de pedido (' + ANCHO + ' px) ==\n');
  let r = await correr('si');
  chk('se abrió la corrección de la compra', r.abierto === true);
  const iP = r.log.indexOf('POST compraCarneGuardar (id)'), iA = r.log.indexOf('POST pedidosFuenteAplicar');
  const iG = r.log.indexOf('GET comprasCarne', iP);
  chk('prendida: guardar manda su id', iP >= 0, r.log);
  chk('prendida: empuja al aplicador y recién después vuelve a pedir el libro', iA > iP && iG > iA, r.log);
  chk('sin errores', JSON.stringify(r.err) === '[]' && !r.log.some((x) => /EXPLOTO/.test(x)), [r.err, r.log]);
  r = await correr('no');
  const iP2 = r.log.indexOf('POST compraCarneGuardar (id)');
  chk('apagada: ningún pedidosFuenteAplicar, y vuelve a pedir el libro', r.log.indexOf('POST pedidosFuenteAplicar') < 0 && r.log.indexOf('GET comprasCarne', iP2) > iP2, r.log);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
