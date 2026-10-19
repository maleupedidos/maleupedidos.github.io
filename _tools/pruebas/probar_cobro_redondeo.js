/* El cartel de cobro de Ruta con el redondeo (19/10/2026). Ruta suelta, sesion real,
   POST interceptados y anotados en window.__posts.  node ruta_rd_test.js <token> [ancho] */
'use strict';
const P = __dirname + '/';
const { abrir, evaluar } = require(P + 'cdp.js');
const prep = require(P + 'sesion_prep.js');
const fs = require('fs');
const [token, anchoS] = process.argv.slice(2);
const ANCHO = parseInt(anchoS, 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APAGADA = process.env.APAGADA === '1';
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + '  -> ' + JSON.stringify(d)); } };
const GRAB = '(function(){var o=window.fetch;window.fetch=function(u,x){if(x&&String(x.method||"").toUpperCase()==="POST"){(window.__posts=window.__posts||[]).push(String(x.body||""));}return o.apply(this,arguments);};})();';
(async () => {
  const cli = await abrir();
  const ev = async e => { try { return await evaluar(cli, e); } catch (x) { return { __err: String(x.message) }; } };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(token) + GRAB });
    await cli.enviar('Page.navigate', { url: BASE + '/ruta.html?standalone=1' });
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) { if (await ev('typeof abrirCobroRuta==="function"&&typeof entregas!=="undefined"&&!!_rutFirma') === true) break; await pausa(500); }
    await pausa(1500);
    await ev('RUT_RED_EF=' + (APAGADA ? 'false' : 'true') + ';window.__posts=[];');
    /* un pedido de carne de prueba: no existe en la planilla y el POST no sale */
    const ENT = "{h:'Home',id:'99997',r:99997,c:'Prueba Redondeo',t:'',$:60824.25,sub:60824.25,env:0,desc:0,fp:'Efectivo',ep:'No Cobrado',es:'Pendiente',dia:'Lunes',p:[{a:'CCo',q:0.859},{a:'PMa',q:2},{a:'ECaC',q:1}]}";
    await ev('entregas.push(' + ENT + ');abrirCobroRuta(eKey(entregas[entregas.length-1]));');
    await pausa(500);
    await ev("var _i=document.getElementById('cobroRecEf');_i.value='60.800';_i.dispatchEvent(new Event('input',{bubbles:true}));_recalcCobroRuta();");
    await pausa(300);
    const v = await ev(`(function(){var g=function(id){var e=document.getElementById(id);return e?{t:e.textContent,vis:e.offsetParent!==null||(e.closest('[style*="display: none"]')==null)}:null;};
      var r=_recalcCobroRuta();return {rd:g('cobroSumRd'),aCob:g('cobroSumACob'),rdRow:document.getElementById('cobroSumRdRow').style.display,
      prop:document.getElementById('cobroSumPropLbl').textContent,btn:document.getElementById('btnCobroRutaOk').textContent,dis:document.getElementById('btnCobroRutaOk').disabled,
      errs:r.errors,rdR:r.rd,req:r.requerido,propina:r.propina}})()`);
    if (!APAGADA) {
      chk('el cartel dice Redondeo −$24,25', v.rdRow !== 'none' && /24,25/.test(v.rd.t) && /−/.test(v.rd.t), v);
      chk('y A cobrar en efectivo $60.800', /60\.800/.test(v.aCob.t), v.aCob);
      chk('con $60.800 recibidos cierra justo (sin Falta ni propina)', v.prop === 'Cierra justo' && Math.abs(v.propina) < 0.001, v);
    } else {
      chk('palanca apagada: no hay fila de redondeo y faltan $24,25', v.rdRow === 'none' && /Falta/.test(v.prop), v);
    }
    /* elegir quien cobro si lo pide */
    await ev("(function(){var b=document.querySelector('#cobroQuienChips button, .cobro-quien-chip, [data-quien]');if(b)b.click();})()");
    await pausa(200);
    const r2 = await ev('(function(){var r=_recalcCobroRuta();return r.errors;})()');
    if (!APAGADA) {
      await ev('confirmarCobroRuta()');
      const t1 = Date.now(); let posts = [];
      while (Date.now() - t1 < 15000) { posts = await ev('window.__posts'); if (Array.isArray(posts) && posts.some(p => /marcarCobrado/.test(p))) break; await pausa(300); }
      const mc = (posts || []).map(p => { try { return JSON.parse(p); } catch (e) { return null; } }).filter(p => p && p.action === 'marcarCobrado')[0];
      chk('el POST de marcarCobrado lleva redondeo 24,25 y ef 60.824,25 (el backend resta)', !!mc && mc.redondeo === 24.25 && mc.ef === 60824.25 && mc.formaPago === 'Efectivo', { mc, r2 });
      chk('sin propina negativa (no se descuenta dos veces)', !!mc && !(mc.propina < 0), mc && mc.propina);
    }
    /* Transferencia: no se redondea */
    await ev("entregas.push(Object.assign({}," + ENT + ",{id:'99998',r:99998,fp:'Transferencia'}));abrirCobroRuta(eKey(entregas[entregas.length-1]));");
    await pausa(400);
    const t = await ev("(function(){var r=_recalcCobroRuta();return {rd:r.rd,row:document.getElementById('cobroSumRdRow').style.display};})()");
    chk('transferencia: sin redondeo', t.rd === 0 && t.row === 'none', t);
    /* Mixto (plata en los dos): no */
    await ev("entregas.push(Object.assign({}," + ENT + ",{id:'99996',r:99996}));abrirCobroRuta(eKey(entregas[entregas.length-1]));"
      + "var a=document.getElementById('cobroRecEf');a.value='30.000';a.dispatchEvent(new Event('input',{bubbles:true}));var b=document.getElementById('cobroRecMP');b.value='30.824,25';b.dispatchEvent(new Event('input',{bubbles:true}));");
    await pausa(300);
    const mx = await ev('_recalcCobroRuta().rd');
    chk('efectivo + transferencia: sin redondeo', mx === 0, mx);
    /* el combo: el redondeo es del total, en UN pedido */
    const cb = await ev(`(function(){document.getElementById('cobroRecMP').value='';var st={combo:true,fp:'Efectivo',total:225000,pedidos:[{h:'Pilar'},{h:'Pilar'}]};var a=_rdCobro(st);st.total=225024.25;var b=_rdCobro(st);st.pedidos=[{h:'Pilar'},{h:'Clubes'}];var c=_rdComboIdx(st);return {a:a,b:b,c:c};})()`);
    chk('combo de chester ($225.000): nada que redondear', cb.a === 0, cb);
    chk('combo de $225.024,25: 24,25 en el pedido de Home/Pilar', cb.b === 24.25 && cb.c === 0, cb);
    const err = await ev('window.__err');
    chk('sin errores de consola', !err || !err.length || err.every(e => !/redondeo|_rd|RUT_RED/i.test(e)), err);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
