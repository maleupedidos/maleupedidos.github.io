/* Un pago a proveedor no deja el ERP trabado (15/9/2026).

   node probar_pago_no_traba.js [390|1440]
   APP=app_viejo_tmp.html node probar_pago_no_traba.js 1440    ← la direccion contraria

   Backend STUBBEADO con datos inventados. No hace falta token.

   El caso real: Tadeo le pago $1.000.000 a Sevuchitas desde Abastecimiento >
   PAGOS justo despues de publicar el backend (cache frio). El pago se registro,
   pero la lista de deudas tardo mas de 12 s: el ERP descarto esa respuesta y dejo
   el formulario ABIERTO con el monto tipeado. `abaHayEditor()` lo leia como "esta
   editando" y `_hayEditorAbierto()` frenaba todo repintado: la tab Caja traia la
   caja nueva y NO la dibujaba. "NO SE ACTUALIZA LA TAB CAJA".

   Sostiene:
   · con el pago confirmado por el servidor, el formulario se cierra y se vacia
     aunque la lista de deudas tarde (aca, 15 s);
   · el ERP ya no cree que hay algo a medio editar;
   · la lista que llega TARDE igual se aplica (el pago desaparece de PAGOS);
   · despues, "Actualizar" en Caja dibuja la caja nueva (efectivo $500.000 ->
     $400.000);
   · un pago que el servidor RECHAZA deja el formulario abierto con el monto,
     para corregirlo. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(250); }
  return false;
};

const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Prueba', tipo: 'digital', col: 3, alias: '', banco: 'Mercado Pago', def: true, inv: true }];

const STUB = `
  window.__gets=[]; window.__posts=[]; window.__err=[]; window.__pagado=false;
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  var __lenta=Number((location.search.match(/lenta=(\\d+)/)||[])[1]||15000);
  var __rechaza=/rechaza=1/.test(location.search);
  if(window.top===window){ try{
    localStorage.setItem('maleu_tab','inicio');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0||k==='ma3'||k.indexOf('aba')===0||k.indexOf('maleu_busq')===0) localStorage.removeItem(k); });
  }catch(e){} }
  function __caja(){ var P=window.__pagado, ts=Date.now();
    return {ts:ts,cajaMode:true,
      caja:{cobradoEf:0,cobradoMP:0,gastosEf:P?100000:0,gastosMP:0,totalGastos:P?100000:0,ingresosEf:0,ingresosMP:0,
            cobradoPorCuenta:{},gastosPorCuenta:P?{efectivo:100000}:{},ingresosPorCuenta:{},cuentas:${JSON.stringify(CUENTAS)}},
      saldoBase:{ef:500000,mp:200000,bil:0,sob:0,inv:0,fecha:'10/09 16:13',fechaDate:'2026-09-10T19:13:16.000Z',porCuenta:{efectivo:500000,mp:200000},sinContar:[]},
      movimientos:P?[{tipo:'gasto',f:'14/09/2026 11:04',ts:ts-60000,cat:'Proveedor',con:'Pago a Prov Prueba',met:'Efectivo',cta:'efectivo',$:100000,not:''}]:[],
      gastos:P?[{f:'14/09/2026',fFull:'14/09/2026 11:04',ts:ts-60000,sem:'38',mes:'Septiembre',anio:2026,cat:'Proveedor',con:'Pago a Prov Prueba',met:'Efectivo',$:100000,not:''}]:[],
      ingresos:[],gastosHist:[],sobres:[],efMano:[]}; }
  function __busq(){ var P=window.__pagado;
    return {ok:true,ts:Date.now(),provs:[],ocs:[],clientes:[],enPoderVend:[],
      deudas:P?[]:[{n:'Prov Prueba',total:100000,original:100000,pagado:0,
        semanas:[{sem:'37',original:100000,pagado:0,pendiente:100000,pagosImp:[],pagadoFifo:0,items:[]}],pagosLibres:[],saldoLibreSobrante:0}]}; }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){} window.__posts.push(b.action||'?');
        if(b.action==='pagarProveedor'){
          if(__rechaza) return new Promise(function(r){setTimeout(function(){r(new Response('{"ok":false,"error":"prueba: rechazado"}',{status:200}));},300);});
          return new Promise(function(r){setTimeout(function(){window.__pagado=true;r(new Response(JSON.stringify({ok:true,total:b.efectivo+b.mp,filas:1}),{status:200}));},300);});
        }
        return Promise.resolve(new Response('{"ok":true}',{status:200}));
      }
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'}, demora=150;
      if(a==='pedidosLight') cuerpo={ts:1,pedidos:[],canales:[],light:true,saludSem:{},saludMes:{},ventasExtra:[]};
      else if(a==='cajaLight') cuerpo=__caja();
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='catalogo') cuerpo={ok:true,productos:{Prueba:[{a:'PPM',n:'Pack Muzzarella',cat:'Pack Pizzas x2',u:'u',dem:1}]}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      else if(a==='busqueda'){ cuerpo=__busq(); if(window.__pagado) demora=__lenta; }
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},demora);});
    }
    return o.apply(this,arguments); }; })();`;

const EFECTIVO = `(function(){var o='';document.querySelectorAll('#cBal .bal-card').forEach(function(c){
  var lb=c.querySelector('.bal-label');if(lb&&/^\\s*Efectivo/i.test(lb.textContent)){var v=c.querySelector('.bal-val');o=v?v.textContent.trim():'';}});return o;})()`;

async function pagar(cli, url) {
  await cli.enviar('Page.navigate', { url });
  await esperar(cli, `typeof go==='function' && !!document.getElementById('p-inicio')`, 30000);
  await pausa(1500);
  await ev(cli, `go('busqueda')`);
  await esperar(cli, `typeof abaSwitchTab==='function'`, 20000);
  await ev(cli, `abaSwitchTab('pagos')`);
  const hay = await esperar(cli, `!!document.querySelector('#pagosView .btn-pago-sem')`, 20000);
  chk('PAGOS muestra la semana a pagar', hay);
  if (!hay) return false;
  await ev(cli, `document.querySelector('#pagosView .btn-pago-sem').click()`);
  await ev(cli, `(function(){var i=document.querySelector('#pagosView .pago-form.open input[id^="pagoEf_"]');i.value='100000';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const listo = await ev(cli, `(function(){var b=document.querySelector('#pagosView .pago-form.open .btn-pagar');return !!b&&!b.disabled;})()`);
  chk('el formulario deja confirmar $100.000 en efectivo', listo === true, listo);
  await ev(cli, `document.querySelector('#pagosView .pago-form.open .btn-pagar').click()`);
  return true;
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + STUB });
    console.log('\n== Un pago no traba el ERP · ' + ANCHO + 'px · ' + APP + ' ==');

    console.log('\n-- pago confirmado, la lista de deudas tarda 15 s --');
    if (await pagar(cli, BASE + '/' + APP + '?lenta=15000')) {
      await esperar(cli, `window.__pagado===true`, 10000);
      await pausa(13500);   // pasa el tope de 12 s del loader, la lista todavia no llego
      const t = await ev(cli, `({abiertos:document.querySelectorAll('.pago-form.open').length,
        conMonto:[].filter.call(document.querySelectorAll('.pago-form.open input'),function(i){return String(i.value||'').trim();}).length,
        editando:_hayEditorAbierto()})`);
      console.log('     a los 13,5 s: ' + JSON.stringify(t));
      chk('el formulario del pago ya no queda abierto', t.abiertos === 0, t);
      chk('el ERP no cree que hay algo a medio editar', t.editando === false, t);
      const llego = await esperar(cli, `!document.querySelector('#pagosView .btn-pago-sem')`, 10000);
      chk('la lista que llega TARDE igual se aplica (el pago ya no figura para pagar)', llego);
      await ev(cli, `go('caja')`);
      await esperar(cli, `!!document.querySelector('#cBal .bal-card')`, 20000);
      const antes = await ev(cli, EFECTIVO);
      await ev(cli, `actualizarCaja()`);
      await esperar(cli, `(function(){var b=document.getElementById('btnReloadCaja');return !!b&&!b.disabled;})()`, 15000);
      await pausa(800);
      const despues = await ev(cli, EFECTIVO);
      const datos = await ev(cli, `(D&&D.caja)?D.caja.gastosEf:null`);
      console.log('     Caja: efectivo antes "' + antes + '" · despues de Actualizar "' + despues + '" · D.caja.gastosEf ' + datos);
      chk('Actualizar en Caja trae la caja nueva', datos === 100000, datos);
      chk('y la DIBUJA: el efectivo pasa a $400.000', despues === '$400.000', despues);
    }

    console.log('\n-- un pago a MEDIO TIPEAR en Abastecimiento no congela la Caja --');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?lenta=150' });
    await esperar(cli, `typeof go==='function' && !!document.getElementById('p-inicio')`, 30000);
    await pausa(1500);
    await ev(cli, `go('busqueda')`);
    await esperar(cli, `typeof abaSwitchTab==='function'`, 20000);
    await ev(cli, `abaSwitchTab('pagos')`);
    if (await esperar(cli, `!!document.querySelector('#pagosView .btn-pago-sem')`, 20000)) {
      await ev(cli, `document.querySelector('#pagosView .btn-pago-sem').click()`);
      await ev(cli, `(function(){var i=document.querySelector('#pagosView .pago-form.open input[id^="pagoEf_"]');i.value='55555';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await ev(cli, `window.__pagado=true`);   // otro celular registro un gasto: la caja del servidor cambio
      await ev(cli, `go('caja')`);
      await esperar(cli, `!!document.querySelector('#cBal .bal-card')`, 20000);
      await ev(cli, `actualizarCaja()`);
      await esperar(cli, `(function(){var b=document.getElementById('btnReloadCaja');return !!b&&!b.disabled;})()`, 15000);
      await pausa(800);
      const ef2 = await ev(cli, EFECTIVO);
      chk('con un pago a medio tipear en OTRA tab, Actualizar igual dibuja la caja nueva ($400.000)', ef2 === '$400.000', ef2);
      await ev(cli, `go('busqueda')`);
      await pausa(800);
      const sigue = await ev(cli, `(function(){var i=document.querySelector('#pagosView .pago-form.open input[id^="pagoEf_"]');return i?i.value:null;})()`);
      chk('y lo tipeado en Abastecimiento sigue ahi', sigue === '55555', sigue);
    } else chk('PAGOS muestra la semana a pagar', false);

    console.log('\n-- pago RECHAZADO por el servidor --');
    if (await pagar(cli, BASE + '/' + APP + '?rechaza=1')) {
      await pausa(1500);
      const r = await ev(cli, `(function(){var f=document.querySelector('#pagosView .pago-form.open');var i=f&&f.querySelector('input[id^="pagoEf_"]');
        return {abierto:!!f,monto:i?i.value:null};})()`);
      chk('queda abierto con el monto, para corregirlo', r.abierto === true && r.monto === '100000', r);
    }

    const errs = await ev(cli, 'JSON.stringify(window.__err||[])');
    chk('sin errores en consola', errs === '[]', errs);
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(2); }
})();
