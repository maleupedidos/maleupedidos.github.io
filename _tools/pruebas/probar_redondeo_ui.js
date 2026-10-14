/**
 * «Es redondeo, no lo cuentes» en la pantalla (14/10/2026). Chrome de verdad,
 * sin backend: se le dan los datos y se intercepta el POST.
 *   · Proveedores: con $9 que sobran y tope $500, el botón aparece, manda
 *     provRedondeo con proveedor, semana y monto; «le pagaste» dice lo pagado de verdad;
 *   · con $600 que sobran (más que el tope) el botón no aparece;
 *   · EERR: un redondeo de octubre suma $9 a Mercadería (las dos cuentas).
 *
 *   BASE=http://localhost:8161 node probar_redondeo_ui.js [ancho]
 */
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const ANCHO = Number(process.argv[2]) || 390;
const BASE = (process.env.BASE || 'http://localhost:8080') + '/app.html?prueba=1';
let ok = 0, mal = 0;
const chequear = (c, t, d) => { if (c) { ok++; console.log('  ok    ' + t); } else { mal++; console.log('  MAL   ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const deuda = (sobra) => ({ n: 'LM Carnes', total: 0, original: 2856672, pagado: 2856672, neto: 0, aFavor: 0, aFavorDe: [], saldoLibreSobrante: sobra,
  pagosLibres: [{ fecha: 'Mié 14/10 17:49', tot: 1620100, ef: 1620100, mp: 0, notas: '' }],
  semanas: [{ sem: '41', original: 1236581, pagado: 1236581, pendiente: 0, pagosImp: [], items: [] }, { sem: '42', original: 1620091, pagado: 1620091, pendiente: 0, pagosImp: [], pagadoFifo: 1620091, items: [] }],
  redondeos: [] });
(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.enable');
    /* Proveedores, suelta: en app.html las globales de la sub-app son copias. */
    await cli.enviar('Page.navigate', { url: BASE.replace('/app.html?prueba=1', '/busqueda.html?standalone=1&prueba=1') });
    for (let i = 0; i < 40; i++) { await espera(500); if (await evaluar(cli, 'typeof abaRedondeo==="function"&&typeof _renderPagosInner==="function"&&!!document.getElementById("pagosList")')) break; }
    const pinta = (sobra) => evaluar(cli, `(function(){
      busqueda=Object.assign({},busqueda,{redondeoMax:500,deudas:[${JSON.stringify(deuda(0))}].map(function(d){d.saldoLibreSobrante=${sobra};return d;})});
      try{ _renderPagosInner(); }catch(e){ return {err:String(e)}; }
      var b=document.querySelector('.btn-redondeo'); var h=[].map.call(document.querySelectorAll('.deuda-historia'),function(x){return x.innerText;}).join(' | ');
      return {boton:!!b, sem:b&&b.getAttribute('data-sem'), monto:b&&b.getAttribute('data-monto'), hist:h, sum:(document.querySelector('.pago-libre-acc summary')||{}).innerText||''};
    })()`);
    const a = await pinta(9);
    chequear(!a.err && /sobran \$\s?9/.test(a.sum), 'Proveedores muestra «sobran $9»', a);
    chequear(a.boton && a.sem === '42' && Number(a.monto) === 9, 'con $9 aparece «Es redondeo, no lo cuentes» para la semana 42', a);
    chequear(/le pagaste \$\s?2\.856\.681/.test(a.hist), '«le pagaste» dice lo pagado de verdad ($2.856.681)', a.hist);
    const post = await evaluar(cli, `(function(){
      var cuerpos=[]; window.confirm=function(){return true;}; var fo=window.fetch;
      window.fetch=function(u,o){ try{var b=JSON.parse(o.body); if(b.action==='provRedondeo'){cuerpos.push(b); return Promise.resolve({json:function(){return {ok:true,id:'RD-0001'};}});}}catch(e){} return fo.apply(this,arguments); };
      abaRedondeo(document.querySelector('.btn-redondeo'));
      return new Promise(function(res){ setTimeout(function(){ window.fetch=fo; res(cuerpos); },300); });
    })()`);
    chequear(post.length === 1 && post[0].prov === 'LM Carnes' && post[0].sem === '42' && post[0].monto === 9, 'tocarlo manda provRedondeo con proveedor, semana y monto', post);
    const b600 = await pinta(600);
    chequear(!b600.boton, 'con $600 (más que el tope de $500) no se ofrece', b600);
    await cli.enviar('Page.navigate', { url: BASE });
    for (let i = 0; i < 60; i++) { await espera(500); if (await evaluar(cli, 'typeof _eerrCalc==="function"&&typeof eerrKpisMes==="function"')) break; }
    const e = await evaluar(cli, `(function(){
      if(!window.VD)window.VD=[]; if(!D)D={};
      var antes=D.redondeosProv; D.redondeosProv=[];
      var r0=_eerrCalc(10,2026), k0=eerrKpisMes(10,2026);
      D.redondeosProv=[{id:'RD-0001',f:'14/10/2026',mes:'Octubre',anio:2026,$:9,cat:'Redondeo proveedor',con:'Redondeo LM Carnes (semana 42)'}];
      var r1=_eerrCalc(10,2026), k1=eerrKpisMes(10,2026), r9=_eerrCalc(9,2026);
      D.redondeosProv=antes;
      return {cmv0:r0&&r0.totCMV, cmv1:r1&&r1.totCMV, red:r1&&r1.cmvRed, sep:r9&&r9.cmvRed, k0:k0&&k0.totCMV, k1:k1&&k1.totCMV, kk:k0&&Object.keys(k0).slice(0,12)};
    })()`);
    chequear(e.cmv1 - e.cmv0 === 9 && e.red === 9 && !e.sep, 'EERR de octubre: Mercadería suma $9 (y septiembre no)', e);
    chequear(e.k1 === undefined || e.k1 - e.k0 === 9, 'y la cuenta de Inicio (eerrKpisMes) también', e);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal  (ancho ' + ANCHO + ')');
  process.exit(mal ? 1 : 0);
})();
