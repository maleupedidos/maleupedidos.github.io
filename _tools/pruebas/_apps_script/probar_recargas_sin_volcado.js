/* EL ↻, LA TECLA R, «SYNC» Y EL REFRESCO AUTOMATICO NO PIDEN EL VOLCADO. (7/10/2026)
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_recargas_sin_volcado.js [390|1440]
 *   APP=app_viejo_tmp.html ...                <- la direccion contraria: con el codigo de antes, rojo
 *
 * Por que existe. Eran los ultimos caminos al `action=admin` (1,6 MB, ~35 s,
 * sin cache del servidor): el `else` del ↻ (Ajustes y toda tab sin rama propia),
 * la tecla R (que ademas pedia DOS recargas: el ↻ de la tab y el volcado),
 * y «sync» de la paleta. Ahora van por `_recargarSinVolcado()`: pedidosLight + cajaLight + ocLight.
 *
 * Las dos mitades:
 *   1. ninguno pide `admin`, y el ↻, la R y «sync» piden `pedidosLight`;
 *   2. RED sigue dibujando con lo que llega (sin esto, "no pide el volcado"
 *      se cumpliria con la pantalla en blanco).
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
    c: 'Cliente ' + i, t: '11' + (30000000 + i), dir: 'Los Robles ' + i, $: 10000, subt: 10000, env: h === 'Red' ? 3000 : 0, co: 0,
    mp: 'Efectivo', d: [{ a: 'PMu', q: 2, p: 5000 }], row: i + 1, br: h === 'Red' ? 'Vendedor 0' : '', ev: h === 'Red' ? iso(hoy) : '', hist: false, ocs: [] };
});

const EXTRA = `
(function(){
  window.__gets=[];
  try{ localStorage.clear();
       localStorage.setItem('maleu_token','x');
       localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
       localStorage.setItem('maleu_tab','inicio'); }catch(e){}
  var S={ ts: Date.now(), pedidos: ${JSON.stringify(PEDIDOS)}, canales: [], ventasExtra: [],
    totales: {pedidos:12,entregados:12,facturado:120000}, vendedores: [{nombre:'Vendedor 0',com:17,estado:'Activo',deuda:0,pedidos:[],deudaPorSemana:{},liquidaciones:[]}],
    saludSem:{}, saludMes:{}, caja:{cuentas:[]}, saldoBase:{}, movimientos:[], gastos:[], gastosHist:[], ingresos:[], efMano:[],
    efHuerfanos:[], sobres:[], provisiones:[], config:{}, vueltos:[], oc:{pend:0,total:0,lista:[]}, stock:[], stockDeps:[], stockCierre:'' };
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST')
        return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}}));
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      window.__gets.push(a);
      var c;
      if(a==='admin') c=S;
      else if(a==='pedidosLight')c={ts:S.ts,pedidos:S.pedidos,canales:[],saludSem:{},saludMes:{},ventasExtra:[],totales:S.totales,vendedores:S.vendedores,light:true};
      else if(a==='cajaLight')   c={ts:S.ts,caja:S.caja,saldoBase:{},movimientos:[],gastos:[],gastosHist:[],ingresos:[],efMano:[],efHuerfanos:[],sobres:[],cuentas:[],provisiones:[],config:{},vueltos:[]};
      else if(a==='ocLight')     c={ok:true,oc:S.oc};
      else if(a==='stockTab')    c={ok:true,ts:S.ts,stock:[],stockDeps:[],stockCierre:''};
      else                       c={ok:true,ts:S.ts,lista:[],datos:[],items:[],v:[],cobros:[],deps:[],piezas:[]};
      return new Promise(function(res){ setTimeout(function(){
        res(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}}));
      },200); });
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
  /* Corre `accion` con la lista de GETs vacia y devuelve lo que se pidio. */
  const medir = async (accion, ms) => {
    await evaluar(cli, `window.__gets=[]; 1`);
    await evaluar(cli, `try{ ${accion} }catch(e){ window.__errPrueba=(window.__errPrueba||'')+String(e); } 1`);
    await esperar(cli, `window.__gets.indexOf('pedidosLight')>-1 || window.__gets.indexOf('admin')>-1`, ms || 8000);
    await pausa(1500);
    return evaluar(cli, `window.__gets.slice()`);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Recargas sin el volcado · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && !!window.__gets && typeof refreshContextual==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    if (!await esperar(cli, `!!(window.D && Array.isArray(D.pedidos) && D.pedidos.length===${PEDIDOS.length})`, 30000)) { console.log('  el arranque no trajo los pedidos'); salir(1); }
    await pausa(3000);

    // 1. el ↻ en Ajustes (una tab sin rama propia)
    await evaluar(cli, `try{ go('ajustes'); }catch(e){} 1`); await pausa(1500);
    let g = await medir(`refreshContextual();`);
    chk('↻ en Ajustes no pide el volcado', g.indexOf('admin') < 0, g);
    chk('y pide pedidosLight', g.indexOf('pedidosLight') > -1, g);

    // 2. la tecla R (en Inicio)
    await evaluar(cli, `try{ go('inicio'); }catch(e){} 1`); await pausa(1500);
    g = await medir(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'r',bubbles:true}));`);
    chk('la tecla R no pide el volcado', g.indexOf('admin') < 0, g);
    chk('y la tecla R recarga (pide pedidosLight)', g.indexOf('pedidosLight') > -1, g);

    // 3. «sync» de la paleta
    g = await medir(`cmdAct('sync');`);
    chk('«sync» de la paleta no pide el volcado', g.indexOf('admin') < 0, g);
    chk('y pide pedidosLight', g.indexOf('pedidosLight') > -1, g);

    // 4. el refresco automatico en Ventas > RED: tiene su rama (loadVentas) y no
    //    llega al volcado. La rama del volcado queda SOLO para una tab anotada en
    //    _TABS_CON_DATOS (la red de seguridad: ahi el volcado si hace falta).
    await evaluar(cli, `try{ go('ventas'); vSwitchTab('red'); }catch(e){} 1`); await pausa(2000);
    g = await medir(`window._refrescarSiEstaViejo(true);`);
    chk('refresco automatico en Ventas > RED no pide el volcado', g.indexOf('admin') < 0, g);
    const red = await evaluar(cli, `(function(){ var e=document.getElementById('vRed'); return e?e.textContent.replace(/\\s+/g,' ').length:-1; })()`);
    chk('Ventas > RED sigue dibujada', red > 100, red);

    /* `window.__err` es del ERP (anota ahi sus errores de render): se muestra
       aparte, para comparar contra el codigo de antes. Los de la prueba van en
       `__errPrueba`. */
    console.log('    errores de render que anoto el ERP: ' + JSON.stringify(await evaluar(cli, `(window.__err||[]).length`)));
    const _err = await evaluar(cli, `window.__errPrueba||''`);
    chk('sin errores de JS', !errores.length && !_err, { errores: errores.slice(0, 3), err: _err });
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
