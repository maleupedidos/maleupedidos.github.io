/* El estimativo de carne en el aviso del proveedor (15/9/2026).

   node probar_carne_estimativo.js [390|1440]
   APP=app_viejo_tmp.html node probar_carne_estimativo.js   ← la direccion contraria

   Tadeo: "debería saltar un estimativo a pedir de carnes". La cuenta, por corte:
   venta por semana (promedio de las semanas CON venta de las 3 de `catalogo`) ×
   semanas hasta la llegada siguiente a la de este pedido − el FISICO del freezer,
   redondeado a medio kilo para arriba.

   Backend STUBBEADO. Las semanas de venta son las del 15/9/2026 (no son datos de
   clientes); los costos son inventados (el repo es publico). A mano, martes 15/9
   (llega el jueves 17, la siguiente el 24: 9 dias = 1,2857 semanas):
     colita  12,386 18,566 17,358 → 16,103 × 1,2857 = 20,70 − 0      → 21
     entraña  9,939 15,352  9,749 → 11,680 × 1,2857 = 15,02 − 5,182  → 10
     lomo    15,004 24,872 21,135 → 20,337 × 1,2857 = 26,15 − 3,890  → 22,5
     picaña   7,265  9,771  0     →  8,518 × 1,2857 = 10,95 − 0      → 11   (con el promedio de 3 serian 7,5)
     vacio   12,634 20,928 13,555 → 15,706 × 1,2857 = 20,19 − 7,318  → 13
     total 77,5 kg · $1.875.000 con los costos inventados.
   El lomo tiene 3 kg RESERVADOS (disponible 0,89, fisico 3,89): tiene que usar el
   fisico — con el disponible pediria 25,5. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 700) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(250); }
  return false;
};

const CORTES = [
  { a: 'CCo', n: 'Carnes · Colita de Cuadril', c: 20000, wk: [12.386, 18.566, 17.358], f: 0, d: 0 },
  { a: 'CEn', n: 'Carnes · Entraña', c: 30000, wk: [9.939, 15.352, 9.749], f: 5.182, d: 5.182 },
  { a: 'CLo', n: 'Carnes · Lomo', c: 30000, wk: [15.004, 24.872, 21.135], f: 3.89, d: 0.89 },
  { a: 'CPi', n: 'Carnes · Picaña', c: 20000, wk: [7.265, 9.771, 0], f: 0, d: 0 },
  { a: 'CVa', n: 'Carnes · Vacío', c: 20000, wk: [12.634, 20.928, 13.555], f: 7.318, d: 7.318 }
];
const avg3 = w => Math.round((w[0] + w[1] + w[2]) / 3 * 10) / 10;
const catalogo = compra => ({ ts: 1, deps: [], depTs: {}, repo: { carne: { ultCompra: compra, ultVenta: '', compras: 2 } }, proveedores: [],
  productos: {
    Caco: CORTES.map(x => ({ a: x.a, n: x.n, cat: 'Carnes', c: x.c, s: x.d, u: 'kg', dem: avg3(x.wk), wk: x.wk, dep: 'moresco', pd: { ustariz: x.f, moresco: 0 } })),
    'Proveedor Prueba': [{ a: 'PPM', n: 'Pack Muzzarella', cat: 'Pizzas', c: 5000, s: 20, u: 'u', dem: 10, wk: [10, 10, 10], dep: 'ustariz', pd: { ustariz: 20 } }]
  } });
const ADMIN = { ts: 1, pedidos: [], canales: [], totales: {}, oc: { pendientes: 0, costo: 0, lista: [] }, gastos: [], ingresos: [], movimientos: [], caja: {}, saldoBase: {},
  stock: CORTES.map(x => ({ n: x.n, a: x.a, f: x.f, r: Math.round((x.f - x.d) * 1000) / 1000, d: x.d, u: 'kg', pd: { ustariz: x.f }, pz: 1 }))
    .concat([{ n: 'Pack Muzzarella', a: 'PPM', f: 20, r: 0, d: 20, u: 'u', pd: { ustariz: 20 } }]) };

const reloj = iso => `(function(){var p='${iso}'.split(/[-T:]/).map(Number);var AH=new Date(p[0],p[1]-1,p[2],p[3],p[4],0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const stub = compra => `
  window.__copiado=null;
  if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio'); Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0||k==='ma3')localStorage.removeItem(k); }); }catch(e){} }
  try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){window.__copiado=t;return Promise.resolve();}},configurable:true}); }catch(e){}
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
      var cuerpo={ok:false,error:'stub'};
      if(a==='admin') cuerpo=${JSON.stringify(ADMIN)};
      else if(a==='pedidosLight') cuerpo={ts:1,pedidos:[],canales:[],light:true};
      else if(a==='catalogo') cuerpo=${JSON.stringify(catalogo('__C__'))};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},gastos:[],ingresos:[],movimientos:[],efMano:[]};
      var t=JSON.stringify(cuerpo).replace('__C__','${compra}');
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},80);});
    }
    return o.apply(this,arguments); }; })();`;

async function abrirEn(cli, iso, compra) {
  const id = await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: reloj(iso) + prep('x') + stub(compra) });
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?c=' + Date.now() });
  const listo = await esperar(cli, `!!document.querySelector('[data-semprep="carne"]')`, 90000);
  await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: id.identifier });
  return listo;
}
const LEER = `(function(){var b=document.querySelector('[data-semprep="carne"]');if(!b)return null;
  var e=b.querySelector('.semprep-estim');
  var celdas=e?[].slice.call(e.querySelectorAll('.semprep-est>*')).map(function(x){return x.textContent.trim();}):[];
  var filas=[];for(var i=0;i+2<celdas.length;i+=3)filas.push(celdas[i]+'|'+celdas[i+1]+'|'+celdas[i+2]);
  return {abierto:b.getAttribute('data-abierto'),min:b.classList.contains('semprep-min')?b.textContent:'',
    tit:e?e.querySelector('.semprep-t').textContent:'',filas:filas,texto:b.textContent,
    boton:!!b.querySelector('button[onclick^="_semprepCopiarCarne"]')};})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Estimativo de carne · ' + ANCHO + 'px · ' + APP + ' ==');

    console.log('\n-- martes 15/9 (dia de pedido), ultima compra el 11/9 --');
    chk('aparece el aviso de la carne', await abrirEn(cli, '2026-09-15T15:00', '2026-09-11'));
    let R = await ev(cli, LEER);
    chk('el dia de pedido se abre solo', !!R && R.abierto === '1', R && R.abierto);
    chk('titulo: ~77,5 kg · $1.875.000', !!R && /~77,5 kg · \$1\.875\.000/.test(R.tit), R && R.tit);
    const esperadas = ['Lomo|22,5 kg|$675.000', 'Colita de Cuadril|21 kg|$420.000', 'Vacío|13 kg|$260.000', 'Picaña|11 kg|$220.000', 'Entraña|10 kg|$300.000'];
    chk('los 5 cortes, de mayor a menor, con kilos y plata (lomo con el FISICO, picaña sin la semana en cero)', !!R && JSON.stringify(R.filas) === JSON.stringify(esperadas), R && R.filas);
    chk('dice hasta cuando cubre: el jueves 24/9, 9 dias', !!R && /reposición del jueves 24\/9 \(9 días\)/.test(R.texto), R && R.texto.slice(0, 600));
    chk('no mete la pizza de Maleu', !!R && R.texto.indexOf('Muzzarella') < 0, R && R.texto.slice(0, 300));
    chk('hay boton para copiar el pedido', !!R && R.boton, R);
    await ev(cli, `document.querySelector('button[onclick^="_semprepCopiarCarne"]').click()`);
    await pausa(300);
    const C = await ev(cli, `window.__copiado`);
    chk('copia el pedido para WhatsApp, con el dia de llegada y sin precios',
      typeof C === 'string' && /^Hola! Te paso el pedido de carne para el jueves 17\/9:/.test(C) && C.indexOf('• Lomo: 22,5 kg') > 0 && C.indexOf('• Entraña: 10 kg') > 0 && C.indexOf('$') < 0, C);
    const W = await ev(cli, `(function(){var e=document.querySelector('.semprep-estim');if(!e)return null;var r=e.getBoundingClientRect();return {w:r.width,sw:e.scrollWidth,cw:e.clientWidth,vw:innerWidth};})()`);
    chk('el estimativo no se sale del ancho', !!W && W.sw <= W.cw + 1 && W.w <= W.vw, W);
    await ev(cli, `_semprepTog('carne')`); await pausa(200);
    R = await ev(cli, LEER);
    chk('plegado dice "pedir ~77,5 kg"', !!R && /pedir ~77,5 kg/.test(R.min), R && R.min);

    console.log('\n-- martes 15/9 con la compra de hoy ya cargada --');
    await abrirEn(cli, '2026-09-15T20:00', '2026-09-15');
    R = await ev(cli, LEER);
    chk('sin estimativo: ya no hay nada que pedir', !!R && R.filas.length === 0 && !R.boton && R.texto.indexOf('Estimativo') < 0, R);

    console.log('\n-- miercoles 16/9 --');
    await abrirEn(cli, '2026-09-16T10:00', '2026-09-11');
    R = await ev(cli, LEER);
    chk('sin estimativo fuera del dia de pedido y del anterior', !!R && R.texto.indexOf('Estimativo') < 0, R && R.texto.slice(0, 300));

    console.log('\n-- lunes 14/9 (el dia anterior) --');
    await abrirEn(cli, '2026-09-14T10:00', '2026-09-01');
    R = await ev(cli, LEER);
    chk('plegado (no es urgente) pero el resumen ya dice cuanto pedir', !!R && /pedir ~\d/.test(R.min), R && R.min);
    await ev(cli, `_semprepTog('carne')`); await pausa(200);
    R = await ev(cli, LEER);
    chk('el dia anterior tambien, con 10 dias a cubrir', !!R && /\(10 días\)/.test(R.texto) && R.filas.length === 5, R && [R.filas, R.texto.slice(0, 400)]);

    const err = await ev(cli, `(window.__err||[]).filter(function(e){return /semprep|estim|carne/i.test(e);})`);
    chk('sin errores de JS del aviso', Array.isArray(err) && err.length === 0, err);
  } catch (e) { console.log('  REVENTO: ' + (e && e.message)); mal++; }
  console.log(`\n${ok} ok · ${mal} mal`);
  salir(mal ? 1 : 0);
})();
