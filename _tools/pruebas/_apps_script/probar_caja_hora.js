/* La hora de un gasto o un ingreso de Caja (15/10/2026). Backend STUBBEADO con
   datos inventados (el repo es publico): no hace falta token.

   BASE=http://localhost:8150 node probar_caja_hora.js [390|1440]
   APP=app_viejo_tmp.html ...            ← la direccion contraria (rojo)

   El sueldo de Lucas se pago el 14/10 a las 20:36 y cargado «Ayer» quedo a las
   12:00, antes del ajuste de caja de las 15:04: pidio el cartel y dejo un
   «Ajuste de caja» que no hacia falta. Sostiene:
   · el campo Hora esta en el gasto y en el ingreso, se ve y entra en el ancho;
   · con «Ayer» + 20:36, el POST lleva `hora:'20:36'` y la fecha de ayer, y el
     movimiento que se pinta al toque queda a las 20:36 (no a las 12:00);
   · sin hora, el POST va con `hora:''` (el backend pone ahora o las 12:00);
   · despues de guardar, la hora se vacia; sin errores de JS. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};
const pad = n => String(n).padStart(2, '0');
const AYER = new Date(Date.now() - 86400000);
const ayerIso = AYER.getFullYear() + '-' + pad(AYER.getMonth() + 1) + '-' + pad(AYER.getDate());
const ayerDmy = pad(AYER.getDate()) + '/' + pad(AYER.getMonth() + 1) + '/' + AYER.getFullYear();

const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' },
  { id: 'mp', nombre: 'Mercado Pago Prueba', tipo: 'digital', def: true, inv: true, banco: 'Mercado Pago' }
];
const MOVS = [];
for (let i = 0; i < 30; i++) {
  const d = new Date(Date.now() - (i + 2) * 3600000 * 5);
  MOVS.push({ tipo: i % 2 ? 'gasto' : 'cobro', f: pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
    ts: d.getTime(), met: 'Mercado Pago', cta: 'mp', $: 1000 + i, cat: i % 2 ? 'Proveedor' : 'COBRO Home', con: 'Concepto ' + i, not: '' });
}
const CAJA = {
  ts: 1,
  caja: { cobradoEf: 0, cobradoMP: 0, gastosEf: 0, gastosMP: 0, ingresosEf: 0, ingresosMP: 0,
    cobradoPorCuenta: {}, gastosPorCuenta: {}, ingresosPorCuenta: {}, cuentas: CUENTAS },
  saldoBase: { ef: 100000, mp: 500000, bil: 0, sob: 0, inv: 0, fecha: '10/09 16:13', porCuenta: { efectivo: 100000, mp: 500000 }, sinContar: [] },
  gastos: [], ingresos: [], gastosHist: {}, movimientos: MOVS, sobres: [], efMano: [], cajaMode: true
};
const EXTRA = `
  (function(){
    try{ localStorage.removeItem('ma3'); localStorage.removeItem('ma3v3'); localStorage.setItem('maleu_tab','caja'); }catch(e){}
    window.__posts=[];
    var CAJA=${JSON.stringify(CAJA)};
    var o = window.fetch; window.fetch = function(u, x){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
      var resp = function(obj, ms){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}})); }, ms); }); };
      if (x && String(x.method||'').toUpperCase()==='POST') {
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        return resp({ok:true, rows:1}, 50);
      }
      var m = url.match(/action=([a-zA-Z_]+)/); var a = m ? m[1] : '?';
      if (a==='cajaLight'){ window.__cajaVeces=(window.__cajaVeces||0)+1; return resp(CAJA, window.__posts.length ? 8000 : 200); }
      if (a==='pedidosLight') return resp({ts:1, pedidos:[], canales:[], light:true}, 150);
      if (a==='ocLight') return resp({ok:true, oc:{lista:[]}}, 150);
      if (a==='cobrosPendientes') return resp({ok:true, cobros:[]}, 150);
      return resp({ok:false, error:'stub'}, 150);
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const errores = [];
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Caja › la hora del movimiento · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('caja'); 1`);
    if (!await esperar(cli, `document.querySelectorAll('#gList .cj-r').length>0`, 60000)) { console.log('  la caja no se dibujo (sin esto, lo de abajo no mide nada)'); salir(1); }
    await pausa(1500);
    /* A 1440 el ERP puede volver a otra tab al terminar de cargar: se vuelve a Caja y se espera a que SE VEA. */
    await evaluar(cli, `go('caja'); 1`);
    if (!await esperar(cli, `getComputedStyle(document.getElementById('p-caja')).display!=='none'`, 20000)) { console.log('  la tab Caja no queda a la vista'); salir(1); }

    /* 1. El campo, en los dos formularios, visible y dentro del ancho */
    for (const [t, id, form] of [['gasto', 'gHora', 'formGasto'], ['ingreso', 'iHora', 'formIngreso']]) {
      const g = await evaluar(cli, `(()=>{ if(document.getElementById('${form}').classList.contains('hidden')) toggleCajaForm('${t}');
        var h=document.getElementById('${id}'), f=document.getElementById('${form}');
        if(!h) return {existe:false};
        var r=h.getBoundingClientRect(), rf=f.getBoundingClientRect();
        var rfe=document.getElementById('${t === 'gasto' ? 'gFecha' : 'iFecha'}').getBoundingClientRect();
        var o={existe:true, tipo:h.type, w:Math.round(r.width), alto:Math.round(r.height), dentro: r.left>=rf.left-1 && r.right<=rf.right+1, docW:document.documentElement.scrollWidth, vw:innerWidth,
               fechaW:Math.round(rfe.width), formH:Math.round(rf.height),
               ocultaPor:(function(){var x=f,out=[];while(x&&x!==document.body){var cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||x.hidden)out.push((x.id||x.className||x.tagName)+':'+cs.display);x=x.parentElement;}return out;})()};
        toggleCajaForm('${t}'); return o; })()`);
      chk(t + ': campo Hora (time), visible, dentro del formulario y sin scroll horizontal',
        g.existe === true && g.tipo === 'time' && g.w > 60 && g.alto >= 36 && g.dentro === true && g.docW <= g.vw, g);
    }

    /* 2. Ayer a las 20:36 */
    await evaluar(cli, `(()=>{ toggleCajaForm('gasto'); _setFechaDmy('gFecha', new Date(${AYER.getTime()}));
      document.getElementById('gHora').value='20:36'; document.getElementById('gCat').value='Sueldo'; document.getElementById('gCon').value='Prueba Persona';
      document.getElementById('gMP').value='600.000'; window.__posts=[]; guardarGasto({preventDefault:function(){}}); return 1; })()`);
    await esperar(cli, `window.__posts.length>0`, 10000); await pausa(600);
    const p1 = await evaluar(cli, `(window.__posts||[]).filter(function(p){return p.action==='gasto'})[0]||null`);
    chk('el POST del gasto lleva hora 20:36 y la fecha de ayer', !!p1 && p1.hora === '20:36' && p1.fecha === ayerIso, p1);
    const m1 = await evaluar(cli, `(()=>{ var m=(D.movimientos||[]).filter(function(x){return x.con==='Prueba Persona'})[0]; if(!m) return null; var d=new Date(m.ts); return {h:d.getHours(), mi:d.getMinutes(), f:m.f}; })()`);
    chk('el movimiento que se pinta al toque queda a las 20:36 (no a las 12:00)', !!m1 && m1.h === 20 && m1.mi === 36 && m1.f === ayerDmy, m1);
    const vacia = await evaluar(cli, `document.getElementById('gHora').value`);
    chk('después de guardar, la hora se vacía', vacia === '', vacia);

    /* 3. Sin hora */
    await evaluar(cli, `(()=>{ if(document.getElementById('formGasto').classList.contains('hidden')) toggleCajaForm('gasto');
      document.getElementById('gCat').value='Otro'; document.getElementById('gCon').value='Sin hora'; document.getElementById('gEf').value='1.000';
      window.__posts=[]; guardarGasto({preventDefault:function(){}}); return 1; })()`);
    await esperar(cli, `window.__posts.length>0`, 10000);
    const p2 = await evaluar(cli, `(window.__posts||[])[0]||null`);
    chk('sin hora, el POST va con hora vacía', !!p2 && p2.hora === '', p2);

    /* 4. El ingreso */
    await evaluar(cli, `(()=>{ if(document.getElementById('formGasto').classList.contains('hidden')===false) toggleCajaForm('gasto'); toggleCajaForm('ingreso');
      _setFechaDmy('iFecha', new Date(${AYER.getTime()})); document.getElementById('iHora').value='08:05';
      document.getElementById('iCat').value='Otro'; document.getElementById('iCon').value='Ingreso prueba'; document.getElementById('iMP').value='2.000';
      window.__posts=[]; guardarIngreso({preventDefault:function(){}}); return 1; })()`);
    await esperar(cli, `window.__posts.length>0`, 10000);
    const p3 = await evaluar(cli, `(window.__posts||[])[0]||null`);
    chk('el POST del ingreso lleva hora 08:05', !!p3 && p3.action === 'ingreso' && p3.hora === '08:05', p3);

    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
  salir(mal ? 1 : 0);
})();
