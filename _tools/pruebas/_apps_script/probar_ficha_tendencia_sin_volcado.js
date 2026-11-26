/* LA FICHA DEL PEDIDO Y LAS UNIDADES DE TENDENCIA NO PIDEN EL VOLCADO. (7/10/2026)
 *
 *   node _tools/servir.js 8095          (en otra terminal)
 *   BASE=http://localhost:8095 node _tools/pruebas/probar_ficha_tendencia_sin_volcado.js [390|1440]
 *   APP=app_viejo_tmp.html ...          <- la direccion contraria: con el codigo de antes, rojo
 *
 * Por que existe. Eran los dos ultimos lugares que, sin que nadie tocara ↻,
 * pedian `action=admin`: 1,6 MB y ~35 s medidos ese dia, sin cache del lado
 * del servidor. Los dos usan `D.pedidos` (la ficha, ademas, `D.oc.lista`), y
 * `pedidosLight` + `ocLight` traen eso identico. (CRUCE, el tercero que estaba
 * anotado, no tiene boton desde el 20/9 y dibuja con lo suyo.)
 *
 * Las dos mitades:
 *   1. sin pedidos cargados, abrir la ficha / Unidades **no pide `admin`** y si
 *      pide `pedidosLight`;
 *   2. **la ficha se abre sola y el grafico se dibuja** cuando llegan. Sin esto,
 *      "no pide el volcado" se cumpliria con la pantalla esperando para siempre.
 *
 * Todo el backend va stubbeado. No toca produccion ni necesita token.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8095';
const APP = process.env.APP || 'app.html';

const hoy = new Date();
const iso = d => d.toISOString().slice(0, 10);
const CAN = ['Home', 'Pilar', 'Clubes', 'Red'];
const PEDIDOS = Array.from({ length: 12 }, (_, i) => {
  const h = CAN[i % CAN.length];
  return { n: 'P' + i, h: h, f: iso(hoy), fe: iso(hoy), de: iso(hoy), es: 'Entregado', ep: 'Pagado',
    c: 'Cliente ' + i, t: '11' + (30000000 + i), dir: 'Los Robles ' + i, $: 10000, subt: 10000, env: 0, co: 0,
    mp: 'Efectivo', d: [{ a: 'PMu', q: 2, p: 5000 }], row: i + 1, br: '', ev: '', hist: false, ocs: [] };
});

const EXTRA = `
(function(){
  window.__gets=[]; window.__nAdmin=0;
  try{ localStorage.clear();
       localStorage.setItem('maleu_token','x');
       localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
       localStorage.setItem('maleu_tab','inicio');
       localStorage.setItem('mc_catalogoProd_v2',JSON.stringify({PMu:{n:'Pizza Muzza',cat:'Pizzas',u:'u'}})); }catch(e){}
  var S={ ts: Date.now(), pedidos: ${JSON.stringify(PEDIDOS)}, canales: [], ventasExtra: [],
    totales: {pedidos:12,entregados:12,facturado:120000}, vendedores: [], saludSem:{}, saludMes:{},
    caja:{cuentas:[]}, saldoBase:{}, movimientos:[], gastos:[], gastosHist:[], ingresos:[], efMano:[],
    efHuerfanos:[], sobres:[], provisiones:[], config:{}, vueltos:[], oc:{pend:0,total:0,lista:[]} };
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST')
        return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}}));
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      window.__gets.push(a);
      var c;
      if(a==='admin'){ window.__nAdmin++; window.__pilaAdmin=(window.__pilaAdmin||[]).concat([String(new Error().stack).split('\\n').slice(2,7).join(' | ')]); c=S; }
      else if(a==='pedidosLight')c={ts:S.ts,pedidos:S.pedidos,canales:[],saludSem:{},saludMes:{},ventasExtra:[],totales:S.totales,vendedores:[],light:true};
      else if(a==='cajaLight')   c={ts:S.ts,caja:S.caja,saldoBase:{},movimientos:[],gastos:[],gastosHist:[],ingresos:[],efMano:[],efHuerfanos:[],sobres:[],cuentas:[],provisiones:[],config:{},vueltos:[]};
      else if(a==='ocLight')     c={ok:true,oc:S.oc};
      else                       c={ok:true,ts:S.ts,lista:[],datos:[],items:[],v:[],cobros:[],deps:[],piezas:[]};
      return new Promise(function(res){ setTimeout(function(){
        res(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}}));
      },300); });
    }
    return o.apply(this,arguments); };
})();
`;

const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms) => {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await evaluar(cli, expr)) return true; await pausa(120); }
  return false;
};
let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); }
};

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => {
    if (met === 'Runtime.exceptionThrown')
      errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion');
  });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Ficha y Tendencia sin el volcado · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && !!window.__gets && typeof openOrdDetail==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    if (!await esperar(cli, `!!(window.D && Array.isArray(D.pedidos) && D.pedidos.length===${PEDIDOS.length})`, 30000)) { console.log('  el arranque no trajo los pedidos'); salir(1); }
    await pausa(3000);

    /* ── 1. La ficha, con los pedidos todavia sin llegar ── */
    await evaluar(cli, `window.__gets=[]; window.__nAdmin=0; delete D.pedidos; 1`);
    await evaluar(cli, `try{ openOrdDetail('Home','P0'); }catch(e){ window.__errFicha=String(e); } 1`);
    const abrio = await esperar(cli, `!!(document.getElementById('ordDrawer')&&document.getElementById('ordDrawer').classList.contains('open'))`, 20000);
    await pausa(800);
    let g = await evaluar(cli, `window.__gets.slice()`);
    chk('la ficha sin pedidos NO pide el volcado', g.indexOf('admin') < 0, { g, pila: await evaluar(cli, `window.__pilaAdmin||[]`) });
    chk('y si pide pedidosLight', g.indexOf('pedidosLight') > -1, { g, err: await evaluar(cli, `window.__errFicha||''`), lr: await evaluar(cli, `typeof loadRapido`) });
    const head = await evaluar(cli, `(document.getElementById('ordHeadId')||{}).textContent||''`);
    chk('la ficha se abre sola cuando llegan, con el pedido pedido', abrio && /P0/.test(head), { abrio, head });
    await evaluar(cli, `try{ document.getElementById('ordDrawer').classList.remove('open'); document.getElementById('ordBg').classList.remove('open'); document.body.style.overflow=''; }catch(e){} 1`);

    /* ── 2. Unidades de Tendencia, con los pedidos todavia sin llegar ── */
    await evaluar(cli, `try{ go('ventas'); vSwitchTab('tendencia'); }catch(e){} 1`);
    await pausa(1500);
    await evaluar(cli, `window.__gets=[]; window.__nAdmin=0; delete D.pedidos;
      document.getElementById('vtMetric').value='prod'; try{ rTendencia(); }catch(e){ window.__errTend=String(e); } 1`);
    const espera = await evaluar(cli, `(document.getElementById('vtChart')||{}).textContent||''`);
    chk('mientras tanto dice que esta trayendo los pedidos', /Trayendo los pedidos/.test(espera) || /volcado/.test(espera), espera.slice(0, 120));
    const dibujo = await esperar(cli, `!!(D&&D.pedidos&&D.pedidos.length) && !/Trayendo|volcado|No pude/.test((document.getElementById('vtChart')||{}).textContent||'')`, 20000);
    await pausa(800);
    g = await evaluar(cli, `window.__gets.slice()`);
    chk('Unidades sin pedidos NO pide el volcado', g.indexOf('admin') < 0, { g, pila: await evaluar(cli, `window.__pilaAdmin||[]`) });
    chk('y si pide pedidosLight', g.indexOf('pedidosLight') > -1, g);
    chk('el grafico se dibuja cuando llegan (no queda esperando)', dibujo,
        (await evaluar(cli, `(document.getElementById('vtChart')||{}).textContent||''`)).slice(0, 120));

    chk('sin errores de JS', !errores.length && !(await evaluar(cli, `window.__errFicha||window.__errTend||''`)), errores.slice(0, 3));
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
