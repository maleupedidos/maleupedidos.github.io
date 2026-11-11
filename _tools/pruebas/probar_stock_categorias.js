/* PRODUCTOS > STOCK: ningún producto con stock se queda sin fila, y «contado hoy» es por día de calendario
   (11/11/2026, /auditoria Productos).

   node _tools/pruebas/probar_stock_categorias.js [base=http://localhost:8173] [app=app.html]
   node _tools/pruebas/probar_stock_categorias.js http://localhost:8173 app_viejo_tmp.html   ← la dirección contraria

   Sin token y sin backend: corre las funciones de pantalla del app.html servido con datos inventados
   (el repo es público). Sostiene:
   · el chorizo y la morcilla («Carnes (por paquete)») salen en la tabla de todos los depósitos Y en la de uno
     solo; hasta v1045 contaban en los totales y no tenían fila;
   · una categoría que ninguna lista conoce sale igual, antes de «Otros»;
   · lo contado ayer a las 23:59 dice «ayer», no «contado hoy» (antes contaba bloques de 24 h).
   Contra la versión anterior tiene que dar rojos. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.argv[2] || 'http://localhost:8173';
const APP = process.argv[3] || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (c, t, extra) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (extra ? ' · ' + extra : '')); } };

(async () => {
  const cli = await abrir();
  const ev = e => evaluar(cli, e);
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    /* Nada sale a la red: la prueba no necesita backend. */
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__maleuAuth=true;window.alert=function(){};window.confirm=function(){return false;};
      var o=window.fetch;window.fetch=function(u){var s=String((u&&u.url)||u||''); if(/supabase|script\\.google/.test(s))return Promise.resolve(new Response('{}',{status:200,headers:{'Content-Type':'application/json'}})); return o.apply(this,arguments);};` });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    for (let i = 0; i < 100; i++) { try { if (await ev(`typeof rStock==='function'&&typeof _stcHace==='function'&&typeof PROD_CATS==='object'`)) break; } catch (e) {} await pausa(200); }
    /* Una foto de stock inventada, con la forma de stock_tab_base. */
    const sembrar = `(function(){
      var fila=function(a,n,f,u,pd){return {a:a,n:n,f:f,r:0,d:f,p:0,co:1000,i:0,v:0,c:0,iv:f*1000,u:u,pd:pd,pdd:pd,pr:{},pz:0,vd:0.5};};
      var st=[fila('PM','Pizza Muzzarella',5,'u',{ustariz:3,moresco:2}),fila('Cho','Chorizo',4,'u',{ustariz:4,moresco:0}),
              fila('Mor','Morcilla',3,'u',{ustariz:3,moresco:0}),fila('ZZnuevo','Producto de categoria nueva',2,'u',{ustariz:2,moresco:0})];
      PROD_CATS['ZZnuevo']='Categoria Inventada';
      D=D||{}; D.stock=st; D.stockDeps=[{id:'ustariz',n:'Ustariz'},{id:'moresco',n:'Moresco'}];
      return st.length;})()`;
    await ev(sembrar);
    const leer = `(function(){var c=document.getElementById('stockTable')||document.querySelector('#p-stock'); var t=(c&&c.textContent)||''; return t;})()`;
    /* Todos los depósitos */
    let txt = await ev(`(function(){ try{ if(typeof ST_DEP!=='undefined')ST_DEP=''; }catch(e){} try{ go('stock'); }catch(e){} try{ rStock(); }catch(e){ return 'ERR '+e.message; } return 'ok'; })()`);
    await pausa(600);
    let t = await ev(leer);
    chk(/Chorizo/.test(t), 'todos los depósitos: el chorizo tiene fila', txt);
    chk(/Morcilla/.test(t), 'todos los depósitos: la morcilla tiene fila');
    chk(/Carnes \(por paquete\)/i.test(t), 'todos los depósitos: sale la categoría «Carnes (por paquete)»');
    chk(/Producto de categoria nueva/.test(t), 'una categoría que ninguna lista conoce sale igual');
    const orden = await ev(`(function(){var t=(document.querySelector('#p-stock')||{}).textContent||''; var a=t.indexOf('Categoria Inventada'), b=t.lastIndexOf('Otros'); return {a:a,b:b};})()`);
    chk(orden.a >= 0 && (orden.b < 0 || orden.a < orden.b), 'la categoría nueva va antes de «Otros»', JSON.stringify(orden));
    /* Un solo depósito */
    txt = await ev(`(function(){ try{ if(typeof _rStockDep!=='function')return 'sin _rStockDep'; if(typeof stDep==='function'){ stDep('ustariz'); } else return 'sin stDep'; }catch(e){ return 'ERR '+e.message; } return 'ok'; })()`);
    await pausa(600);
    t = await ev(leer);
    chk(/Ustariz/.test(txt) || txt === 'ok', 'se pudo abrir la vista de un solo depósito', txt);
    chk(/Chorizo/.test(t) && /Morcilla/.test(t), 'un solo depósito: el chorizo y la morcilla tienen fila');
    /* Contado hoy / ayer: un momento que en Argentina es AYER a las 23:59. */
    const hace = await ev(`(function(){
      var ahora=new Date(Date.now()-3*3600e3);   /* hora argentina en campos UTC */
      var medianoche=Date.UTC(ahora.getUTCFullYear(),ahora.getUTCMonth(),ahora.getUTCDate())+3*3600e3;   /* 00:00 AR en ms reales */
      var ayer2359=medianoche-60e3, hoy0001=medianoche+60e3;
      var hace3dias=medianoche-2*864e5-60e3;   /* anteayer-1 a las 23:59: 3 días de calendario */
      var txt=function(ts){var d=document.createElement('div'); d.innerHTML=_stcHace(ts); return d.textContent;};
      return {ayer:txt(ayer2359), hoy:Date.now()>hoy0001?txt(hoy0001):'(son las 00:00)', tres:txt(hace3dias)};})()`);
    chk(/ayer/.test(hace.ayer) && !/hoy/.test(hace.ayer), 'lo contado ayer a las 23:59 dice «ayer»', hace.ayer);
    chk(/hoy/.test(hace.hoy) || /00:00/.test(hace.hoy), 'lo contado hoy a las 00:01 dice «contado hoy»', hace.hoy);
    chk(/hace 3 d/.test(hace.tres), 'lo de hace tres noches dice «hace 3 días»', hace.tres);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
