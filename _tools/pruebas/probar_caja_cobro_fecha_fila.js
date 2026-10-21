/**
 * El 📅 del libro de Caja manda la FILA del cobro (14/10/2026).
 * El N° se repite entre semanas; sin fila, el backend tomaba la ultima con ese
 * N° y le movia el dia de cobro a otro pedido. Chrome de verdad, POST
 * interceptado, sin backend.
 *
 *   · dos cobros de Pilar con el mismo N° y filas distintas: cada 📅 manda la suya;
 *   · un cobro parcial («#N (parcial)») no tiene 📅.
 *
 *   BASE=http://localhost:8150 node probar_caja_cobro_fecha_fila.js [ancho]
 */
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const ANCHO = Number(process.argv[2]) || 390;
const BASE = (process.env.BASE || 'http://localhost:8080') + '/app.html?prueba=1';
let ok = 0, mal = 0;
const chequear = (c, t, d) => { if (c) { ok++; console.log('  ok    ' + t); } else { mal++; console.log('  MAL   ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.navigate', { url: BASE });
    for (let i = 0; i < 60; i++) { await espera(500); if (await evaluar(cli, 'typeof rMovimientos==="function"&&typeof D!=="undefined"')) break; }
    const r = await evaluar(cli, `(function(){
      var p=function(n){return String(n).padStart(2,'0');}, d=new Date(), f=p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' 10:00';
      var base={tipo:'cobro',f:f,ts:Date.now(),cat:'COBRO Pilar',met:'Mercado Pago',cta:'mp',not:''};
      if(!D){ D={}; }
      D.movimientos=[
        Object.assign({},base,{con:'Ana #7',hoja:'Pilar',pedido:'7',fila:40,$:1000}),
        Object.assign({},base,{con:'Beto #7',hoja:'Pilar',pedido:'7',fila:95,$:2000}),
        Object.assign({},base,{con:'Caro #8 (parcial)',hoja:'Pilar',pedido:'8 (parcial)',$:3000})
      ];
      window._cjSem=0; window._cjMet=''; window._cjPer=''; window._cjBusq='';
      try{ rMovimientos(); }catch(e){ return {err:String(e)}; }
      var bs=[].slice.call(document.querySelectorAll('.gl-fx'));
      var cuerpos=[]; window.prompt=function(){return '01/10/2026';}; window.confirm=function(){return true;};
      var fOrig=window.fetch; window.fetch=function(u,o){ try{cuerpos.push(JSON.parse(o.body));}catch(e){} return Promise.resolve({json:function(){return {ok:false,error:'prueba'};}}); };
      window.alert=function(){};
      bs.forEach(function(b){ b.click(); });
      window.fetch=fOrig;
      var filas=[].slice.call(document.querySelectorAll('.gl-fx')).length;
      return {botones:bs.length, cuerpos:cuerpos.filter(function(c){return c.action==='cobroFecha';})};
    })()`);
    if (r.err) { chequear(false, 'el libro se pinta', r.err); }
    else {
      chequear(r.botones === 2, 'hay 📅 en los dos cobros y no en el parcial (' + r.botones + ' de 3 movimientos)', r.botones);
      const filas = r.cuerpos.map((c) => c.row).sort((a, b) => a - b);
      chequear(r.cuerpos.length === 2 && filas[0] === 40 && filas[1] === 95, 'cada 📅 manda la fila de su cobro', r.cuerpos);
      chequear(r.cuerpos.every((c) => c.id === '7' && String(c.clientOpId).indexOf('-' + c.row + '-') > 0), 'el id de la operación lleva la fila (dos cobros, dos operaciones)', r.cuerpos.map((c) => c.clientOpId));
    }
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal  (ancho ' + ANCHO + ')');
  process.exit(mal ? 1 : 0);
})();
