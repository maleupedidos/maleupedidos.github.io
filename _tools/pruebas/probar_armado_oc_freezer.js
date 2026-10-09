/* ARMADO con la regla nueva (9/10/2026, palanca STOCK_OC_AL_FREEZER): lo comprado
   por orden de compra que YA LLEGO esta en el freezer y se arma como todo lo
   demas; «del proveedor» queda solo para lo que todavia no llego.

     BASE=http://localhost:<puerto> node _tools/pruebas/probar_armado_oc_freezer.js
     APP=app_viejo_tmp.html ...     ← la direccion contraria

   Sin token y sin backend (?prueba=1): corre las funciones de ARMADO del ERP
   compilado sobre entregas inventadas. `ocF` es lo que manda el backend por
   entrega cuando la palanca esta prendida; sin `ocF` todo tiene que dar lo de
   siempre. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => { if (cond === true) { ok++; console.log('  ok   ' + nom); } else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };

const CASOS = `(function(){
  var r={};
  var ped=function(extra){ return Object.assign({h:'Home',id:501,o:'Orden de Compra',p:[{a:'SCa',q:2},{a:'PPM',q:2}],oD:{}},extra||{}); };
  var ver=function(e){ var s=function(l){return l.map(function(x){return x.a+':'+x.q;}).sort().join(',');}; return {dep:s(_itemsDepDe(e)), oc:s(_itemsOCDe(e)), tipo:_origenTipo(e)}; };
  r.existe=(typeof _ocEnFreezer==='function');
  r.sinOcF=ver(ped());                                       // palanca apagada
  r.nadaLlego=ver(ped({ocF:{}}));                            // prendida, no llego nada
  r.llegoTodo=ver(ped({ocF:{SCa:2,PPM:2}}));                 // prendida, llego todo
  r.llegoParte=ver(ped({ocF:{SCa:2}}));                      // llego un producto
  r.llegoMenos=ver(ped({ocF:{SCa:1}}));                      // llego 1 de 2
  r.mixto=ver(ped({o:'Mixto',oD:{SCa:{d:1,oc:1},PPM:'D'},ocF:{SCa:1}}));   // 1 del stock + 1 por OC que ya llego
  r.titulo=(typeof _ocBloque==='function')?_ocBloque([{a:'PPM',q:2}],2,'k',false):'';
  return r;
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('ruta'); 1`);
    if (!await esperar(cli, `typeof _itemsDepDe==='function' && typeof _origenTipo==='function'`, 30000)) { console.log('  RUTA no arranco'); salir(1); }
    console.log('\n== ARMADO: lo que llego por orden de compra se arma · ' + APP + ' ==');
    const R = await evaluar(cli, CASOS);
    chk('sin `ocF` (palanca apagada) es lo de siempre: todo «del proveedor», nada para armar', R.sinOcF.dep === '' && R.sinOcF.oc === 'PPM:2,SCa:2' && R.sinOcF.tipo === 'oc', R.sinOcF);
    chk('existe la lectura de lo que ya esta en el freezer', R.existe === true);
    chk('prendida y no llego nada: sigue todo del proveedor', R.nadaLlego.dep === '' && R.nadaLlego.oc === 'PPM:2,SCa:2' && R.nadaLlego.tipo === 'oc', R.nadaLlego);
    chk('llego todo: se arma entero como un pedido del freezer', R.llegoTodo.dep === 'PPM:2,SCa:2' && R.llegoTodo.oc === '' && R.llegoTodo.tipo === 'dep', R.llegoTodo);
    chk('llego un producto: ese se arma, el otro todavia no llego', R.llegoParte.dep === 'SCa:2' && R.llegoParte.oc === 'PPM:2' && R.llegoParte.tipo === 'mixto', R.llegoParte);
    chk('llego 1 de 2: 1 se arma y 1 falta', R.llegoMenos.dep === 'SCa:1' && R.llegoMenos.oc === 'PPM:2,SCa:1', R.llegoMenos);
    chk('un mixto (1 del stock + 1 por OC que ya llego): se arman los 2 y lo del stock', R.mixto.dep === 'PPM:2,SCa:2' && R.mixto.oc === '' && R.mixto.tipo === 'dep', R.mixto);
    chk('sin entregas con `ocF` el cartel dice lo de siempre', /del proveedor · no sale del freezer/.test(R.titulo), R.titulo);
    await evaluar(cli, `entregas.push({h:'Home',id:9001,o:'Orden de Compra',p:[{a:'PPM',q:1}],oD:{},ocF:{}}); 1`).catch(() => {});
    const T = await evaluar(cli, `(typeof _rutOcAlFreezer==='function'&&_rutOcAlFreezer())?_ocBloque([{a:'PPM',q:2}],2,'k',false):'(la palanca no se ve)'`);
    chk('con la palanca prendida el cartel dice «todavía no llegó» y ya no «no sale del freezer»', /todav.a no lleg/.test(T) && !/no sale del freezer/.test(T), T);
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  REVENTO: ' + (e && e.stack || e)); salir(1); }
})();
