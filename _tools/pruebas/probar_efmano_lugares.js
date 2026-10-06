/* La tarjeta vieja "Efectivo en mano" no contradice a las billeteras (5/10/2026).
   Backend STUBBEADO con datos inventados: no toca produccion ni necesita token.

   node probar_efmano_lugares.js [390|1440]
   BASE=http://localhost:8097 node probar_efmano_lugares.js 390

   El caso real: con las billeteras arrancadas, la tarjeta nueva decia
   "Sin guardar · Tadeo $0" y la vieja, abajo, "Fondo de cambio $30.100" (las DOS
   billeteras sumadas) y "Tenés que tener encima $47.100". Dos tarjetas contando
   lo mismo distinto, y la vieja falsa.

   Sostiene:
   · con billeteras andando, la vieja pasa a ser "Cobrado en efectivo": sin
     "Fondo de cambio", sin "Tenés que tener encima", sin "juntos tienen que dar",
     y manda a mirar la tarjeta de Efectivo;
   · sin billeteras (antes del arranque), la vieja sigue igual que siempre. */
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
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr) === true) return true; } catch (e) {} await pausa(200); }
  return false;
};

const T = 'Tadeo Ustariz', L = 'Lucas Moresco';
const hoy = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric' });
const SB = { ef: 1000000, mp: 0, bil: 30100, sob: 0, inv: 0, fecha: '05/10 20:14',
  porCuenta: { efectivo: 1000000 }, sinContar: [] };
const LUG = { activo: true, personas: [T, L], bil: { [T]: 19630, [L]: 10470 }, cob: { '': 0, [T]: 0, [L]: 0 },
  cf: 969900, reservas: [], reservado: 0, cfLibre: 969900, total: 1000000, efVivo: 1000000, descuadre: 0, movsUlt: [] };
const LUG_NO = { activo: false, personas: [T, L], sinAsignar: false };
const EFMANO = [{ f: hoy, entro: 17000, salio: 0, neto: 17000, cobrado: 17000,
  porQuien: [{ q: L, e: 12000, s: 0, n: 1 }, { q: T, e: 5000, s: 0, n: 1 }],
  det: [{ c: 'Cliente Uno', id: '1', cobro: 12000, vto: 0, q: L }, { c: 'Cliente Dos', id: '2', cobro: 5000, vto: 0, q: T }] }];
const caja = (lug) => ({
  ts: 1,
  caja: { cobradoEf: 0, cobradoMP: 0, gastosEf: 0, gastosMP: 0, ingresosEf: 0, ingresosMP: 0,
    cobradoPorCuenta: {}, gastosPorCuenta: {}, ingresosPorCuenta: {},
    cuentas: [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' }, { id: 'mp', nombre: 'MP Prueba', tipo: 'digital', def: true }] },
  saldoBase: SB, gastos: [], ingresos: [], gastosHist: {}, movimientos: [], sobres: [], efMano: EFMANO,
  proveedores: [], lugares: lug, cajaMode: true
});
function stub(lug) {
  return `(function(){
    try{ localStorage.removeItem('ma3'); localStorage.setItem('maleu_tab','caja'); }catch(e){}
    var CAJA=${JSON.stringify(caja(lug))};
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      var resp=function(obj,ms){return new Promise(function(r){setTimeout(function(){r(new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}}));},ms);});};
      if(x&&String(x.method||'').toUpperCase()==='POST') return resp({ok:true},30);
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      if(a==='cajaLight') return resp(CAJA,200);
      if(a==='admin') return resp(Object.assign({},CAJA,{pedidos:[],canales:[],stock:[],oc:{lista:[]}}),99999);
      if(a==='pedidosLight') return resp({ts:1,pedidos:[],canales:[],light:true},100);
      return resp({ok:false,error:'stub'},100);
    };})();`;
}

async function tarjeta(lug) {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + stub(lug) });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`)) return null;
    await evaluar(cli, `go('caja'); 1`);
    /* Se espera a que la tarjeta tenga el monto del dia: medir una tarjeta vacia
       da "no dice X" sin haber mirado nada. */
    if (!await esperar(cli, `/17\\.000/.test((document.getElementById('efManoCard')||{}).innerText||'')`, 30000)) return null;
    return (await evaluar(cli, `document.getElementById('efManoCard').innerText`)).replace(/\s+/g, ' ');
  } finally { cli.matar(); }
}

(async () => {
  console.log('\n== Efectivo en mano vs billeteras · ' + ANCHO + 'px · ' + APP + ' ==');
  const con = await tarjeta(LUG);
  chk('con billeteras, la tarjeta se dibujo con el dia de hoy ($17.000)', con !== null, con);
  if (con) {
    chk('no dice "Tenés que tener encima"', !/tener encima/i.test(con), con);
    chk('no dice "Fondo de cambio"', !/Fondo de cambio/i.test(con), con);
    chk('no dice "juntos tienen que dar"', !/juntos tienen que dar/i.test(con), con);
    chk('se llama "Cobrado en efectivo"', /Cobrado en efectivo/i.test(con), con);
    chk('manda a la tarjeta de Efectivo para saber dónde está', /Sin guardar de cada uno/.test(con), con);
    chk('sigue diciendo quién cobró cuánto (Lucas $12.000, Tadeo $5.000)', /Lucas Moresco\s*\$12\.000/.test(con) && /Tadeo Ustariz\s*\$5\.000/.test(con), con);
  }
  const sin = await tarjeta(LUG_NO);
  chk('sin billeteras, la tarjeta se dibujo', sin !== null, sin);
  if (sin) {
    chk('sin billeteras sigue "Efectivo en mano" con "Tenés que tener encima $47.100"', /Efectivo en mano/i.test(sin) && /tener encima\s*\$47\.100/i.test(sin), sin);
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
