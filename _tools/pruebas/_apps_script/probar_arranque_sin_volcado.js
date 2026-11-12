/* ABRIR LA APP NO PIDE EL VOLCADO. (27/9/2026)
 *
 *   node _tools/servir.js          (en otra terminal)
 *   node probar_arranque_sin_volcado.js [390|1440]
 *   APP=app_viejo_tmp.html node probar_arranque_sin_volcado.js   <- la direccion contraria
 *
 * Por que existe. `action=admin` es lo mas caro del ERP: medido contra
 * produccion ese dia, **28 s con la foto hecha y 404 a los 55 y 70 s sin
 * ella** — o sea que a veces directamente no vuelve. Y lo pedia **Inicio**,
 * que es la tab con la que arranca la app: daba lo mismo despegar las otras,
 * abrir el ERP lo pedia igual.
 *
 * Inicio lee 12 campos de D y solo tres no estaban en un endpoint liviano:
 * `totales`, `vendedores` y `vueltos`. Los tres se agregaron a `pedidosLight`
 * y `cajaLight` (backend @710) y se verificaron IDENTICOS a los del volcado.
 *
 * Esto sostiene las dos mitades del cambio:
 *   1. arrancar en Inicio **no pide `admin`**, y si pide las livianas;
 *   2. **Inicio se dibuja igual**: los KPIs que salen de los tres campos
 *      nuevos tienen el numero correcto. Sin esta mitad, "no pide el volcado"
 *      se cumpliria tambien con la pantalla en blanco.
 *
 * Y sostiene el borde: Objetivo y Proveedores **si** lo necesitan todavia, y
 * tienen que poder pedirlo aunque `D` ya exista (armado por las livianas). Ese
 * caso rompio al hacer el cambio: la guarda de `_pedirD` preguntaba por `D`.
 *
 * Todo el backend va stubbeado. No toca produccion ni necesita token.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

const hoy = new Date();
const iso = d => d.toISOString().slice(0, 10);
const CAN = ['Home', 'Pilar', 'Clubes', 'Red'];
const PEDIDO = (i) => {
  const h = CAN[i % CAN.length];
  return {
    n: 'P' + i, h: h, f: iso(hoy), fe: iso(hoy), de: iso(hoy),
    es: (i % 5 === 3) ? 'Cancelado' : 'Entregado', ep: (i % 2) ? 'Pendiente' : 'Pagado',
    c: 'Cliente ' + i, t: '11' + (30000000 + i), dir: 'Los Robles ' + i,
    $: 10000, subt: 10000, env: h === 'Red' ? 3000 : 0, co: 0,
    mp: 'Efectivo', d: [{ a: 'PMu', q: 1, p: 10000 }], row: i + 1,
    br: h === 'Red' ? 'Vendedor 0' : '', ev: h === 'Red' ? iso(hoy) : '',
    hist: false, ocs: []
  };
};
const PEDIDOS = Array.from({ length: 20 }, (_, i) => PEDIDO(i));

/* Los tres campos que antes obligaban a pedir el volcado. Los numeros son
   distintivos a proposito: si la pantalla los dibuja, vinieron de aca. */
const TOTALES = { pedidos: 20, entregados: 16, pendientes: 0, cancelados: 4,
                  reservados: 0, facturado: 7654321, cobrado: 7000000,
                  noCobrado: 654321, ticket: 382716 };
const VENDEDORES = [{ nombre: 'Vendedor 0', wa: '', com: 17, estado: 'Activo',
                      deuda: 123456, pedidos: [], deudaPorSemana: {}, liquidaciones: [] }];
const VUELTOS = [{ f: '27/09', h: '10:00', c: 'Cliente 3', $: 2500, tipo: 'Billetera' }];

const EXTRA = `
(function(){
  window.__gets=[]; window.__nAdmin=0;
  /* Arranque EN FRIO: sin la copia \`ma3\` el ERP no tiene nada que pintar y
     esta obligado a pedir. Con copia, el que refresca es
     \`_refrescarSiEstaViejo\` y el arranque no se mide. */
  try{ localStorage.clear();
       localStorage.setItem('maleu_token','x');
       localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
       localStorage.setItem('maleu_tab','inicio'); }catch(e){}
  var S={
    ts: Date.now(),
    pedidos: ${JSON.stringify(PEDIDOS)},
    canales: ${JSON.stringify(CAN.map(h => ({ h: h, pedidos: 5, entregados: 4, pendientes: 0, cancelados: 1, reservados: 0, facturado: 1913580, cobrado: 1750000, noCobrado: 163580 })))},
    saludSem: { casas: 4, ventas: 12, monto: 144000 },
    saludMes: { casas: 9, ventas: 30, monto: 360000 },
    ventasExtra: [],
    totales: ${JSON.stringify(TOTALES)},
    vendedores: ${JSON.stringify(VENDEDORES)},
    vueltos: ${JSON.stringify(VUELTOS)},
    caja: { cuentas: [] }, saldoBase: {}, movimientos: [], gastos: [],
    gastosHist: [], ingresos: [], efMano: [], efHuerfanos: [], sobres: [],
    provisiones: [], config: {},
    oc: { pend: 0, total: 0, lista: [] },
    stock: [], stockDeps: [], stockCierre: ''
  };
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST')
        return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}}));
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      window.__gets.push(a);
      var c;
      if(a==='admin'){ window.__nAdmin++; c=S; }
      else if(a==='pedidosLight')c={ts:S.ts,pedidos:S.pedidos,canales:S.canales,saludSem:S.saludSem,saludMes:S.saludMes,ventasExtra:[],totales:S.totales,vendedores:S.vendedores,light:true};
      else if(a==='cajaLight')   c={ts:S.ts,caja:S.caja,saldoBase:S.saldoBase,movimientos:S.movimientos,gastos:S.gastos,gastosHist:[],ingresos:[],efMano:[],efHuerfanos:[],sobres:[],cuentas:[],provisiones:[],config:{},vueltos:S.vueltos};
      else if(a==='ocLight')     c={ok:true,oc:S.oc};
      else if(a==='stockTab')    c={ok:true,ts:S.ts,stock:[],stockDeps:[],stockCierre:''};
      else                       c={ok:true,ts:S.ts,lista:[],datos:[],items:[],v:[],cobros:[],deps:[],piezas:[]};
      return new Promise(function(res){ setTimeout(function(){
        res(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}}));
      },150); });
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
    await cli.enviar('Emulation.setDeviceMetricsOverride',
      { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Arrancar sin el volcado · ' + ANCHO + 'px · ' + APP + ' ==');

    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && !!window.__gets`, 60000)) {
      console.log('  el ERP no arranco'); salir(1);
    }
    /* Que llegue la lista: es lo que dice que el arranque termino de verdad, y
       sin ella los KPIs de abajo no miden nada. */
    if (!await esperar(cli, `!!(window.D && Array.isArray(D.pedidos) && D.pedidos.length===${PEDIDOS.length})`, 30000)) {
      console.log('  los pedidos no llegaron (sin esto lo de abajo no mide nada)'); salir(1);
    }
    await pausa(3500);

    const gets = await evaluar(cli, `window.__gets.slice()`);
    chk('arrancar en Inicio NO pide el volcado', gets.indexOf('admin') < 0, gets);
    chk('y si pide las lecturas chicas', gets.indexOf('pedidosLight') > -1, gets);

    /* Los tres campos que antes solo venian en el volcado. */
    const tiene = await evaluar(cli, `({
      totales: !!(D&&D.totales&&D.totales.facturado===${TOTALES.facturado}),
      vendedores: !!(D&&Array.isArray(D.vendedores)&&D.vendedores.length===1&&D.vendedores[0].deuda===123456),
      vueltos: !!(D&&Array.isArray(D.vueltos)&&D.vueltos.length===1)
    })`);
    chk('`totales` llego por pedidosLight', tiene.totales === true, tiene);
    chk('`vendedores` tambien', tiene.vendedores === true, tiene);
    chk('`vueltos` llego por cajaLight', tiene.vueltos === true, tiene);

    /* Y la pantalla los DIBUJA. Sin esto, "no pide el volcado" se cumpliria
       igual con Inicio en blanco. */
    const pinto = await evaluar(cli, `(function(){
      var t=document.getElementById('p-inicio');
      return { hay: !!t, texto: (t?t.textContent:'').replace(/\\s+/g,' ').length };
    })()`);
    chk('Inicio se dibujo (no quedo en blanco)', pinto.hay && pinto.texto > 400, pinto);

    /* Objetivo y Proveedores tampoco lo piden ya (27/9/2026, de noche): fueron
       las dos ultimas en salir, cuando `cajaLight` empezo a mandar la lista de
       `proveedores`. */
    await evaluar(cli, `window.__gets=[]; 1`);
    await evaluar(cli, `try{ go('planificacion'); }catch(e){} 1`);
    await pausa(2500);
    await evaluar(cli, `try{ go('proveedores'); }catch(e){} 1`);
    await pausa(2500);
    const gPP = await evaluar(cli, `window.__gets.slice()`);
    chk('Objetivo y Proveedores tampoco piden el volcado', gPP.indexOf('admin') < 0, gPP);

    /* LA RED DE SEGURIDAD SIGUE VIVA. `_TABS_CON_DATOS` quedo vacia, pero el
       mecanismo no se borro: una pantalla nueva que necesite algo que ningun
       liviano trae se agrega ahi y tiene que andar.
       Y prueba de paso el bug que aparecio al despegar Inicio: `_pedirD` se
       frenaba con `if(D)`, y con las livianas armando `D` sin que el volcado
       saliera nunca, una tab agregada a esa lista **no lo pedia jamas**. La
       pregunta correcta es por `_volcadoPedidoEn`. */
    await evaluar(cli, `window.__gets=[]; _TABS_CON_DATOS.push('planificacion'); 1`);
    await evaluar(cli, `try{ go('inicio'); go('planificacion'); }catch(e){} 1`);
    const vino = await esperar(cli, `window.__nAdmin>0`, 25000);
    await pausa(1200);
    const g2 = await evaluar(cli, `window.__gets.slice()`);
    chk('una tab puesta en _TABS_CON_DATOS SI lo pide (la red de seguridad)',
        vino && g2.indexOf('admin') > -1, g2);

    /* Y una vez que llego, no se vuelve a pedir en cada entrada. */
    const n1 = await evaluar(cli, `window.__nAdmin`);
    await evaluar(cli, `try{ go('inicio'); }catch(e){} 1`);
    await pausa(800);
    await evaluar(cli, `try{ go('planificacion'); }catch(e){} 1`);
    await pausa(2000);
    const n2 = await evaluar(cli, `window.__nAdmin`);
    chk('y no lo vuelve a pedir al reentrar', n2 === n1, { antes: n1, ahora: n2 });

    /* Despues de ESCRIBIR desde la ficha del pedido (2/10/2026): 17 botones
       terminaban en load() = el volcado en frio, 34 s. Se toca uno real. */
    await evaluar(cli, `try{ go('inicio'); }catch(e){} 1`);
    await pausa(800);
    const nA = await evaluar(cli, `window.__nAdmin`);
    const desde = await evaluar(cli, `window.__gets.length`);
    await evaluar(cli, `try{ pedDep('Home', 5, ''); }catch(e){ window.__errPD=String(e); } 1`);
    await pausa(2500);
    const gW = await evaluar(cli, `window.__gets.slice(${desde})`);
    const nB = await evaluar(cli, `window.__nAdmin`);
    chk('cambiar el deposito de un pedido NO pide el volcado', nB === nA && gW.indexOf('admin') < 0, gW);
    chk('y si recarga los pedidos por lo liviano', gW.indexOf('pedidosLight') > -1 || gW.indexOf('lote') > -1, gW);

    const propios = errores.filter(e => !/favicon|manifest/i.test(String(e)));
    chk('ni un error en la consola', propios.length === 0, propios.slice(0, 3));

    console.log('\n' + ok + ' ok · ' + mal + ' mal  (' + ANCHO + 'px)\n');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.log('  revento la prueba: ' + e);
    salir(1);
  }
})();
