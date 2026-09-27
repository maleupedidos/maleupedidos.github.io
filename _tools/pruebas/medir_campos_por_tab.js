/* QUE CAMPOS DEL VOLCADO LEE CADA TAB, DE VERDAD. (27/9/2026)
 *
 *   node _tools/servir.js        (en otra terminal)
 *   node medir_campos_por_tab.js [390|1440]
 *
 * Por que existe. El 27/9/2026 la tab Stock salio del volcado: pedia 1,29 MB y
 * 28 s para usar CUATRO de sus 23 claves. La pregunta obvia es cuales de las
 * otras tabs estan en la misma. Buscar `D.algo` con una expresion regular
 * dentro de cada funcion de render NO contesta eso: una tab llama helpers, y un
 * helper que lee `D.pedidos` cuenta igual aunque este escrito 3.000 lineas mas
 * abajo.
 *
 * Asi que se mide leyendo. `window.D` se reemplaza por un par get/set, y el set
 * envuelve el objeto en un Proxy que anota cada campo que alguien toca. Despues
 * se entra tab por tab y se lee la lista.
 *
 * Lo que sale de aca decide DOS caminos distintos:
 *   · un campo que ya viene en un endpoint liviano  -> la tab se despega hoy,
 *     sin tocar la base (es lo que se hizo con Stock);
 *   · un campo que hay que CALCULAR recorriendo los 1.288 pedidos -> ese es el
 *     trabajo que en Supabase no existe, porque lo hace la base.
 *
 * Solo lee. Todo el backend va stubbeado: no toca produccion ni necesita token.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

/* Las tabs que al 27/9/2026 siguen en _TABS_CON_DATOS, o sea las que hacen que
   el ERP pida el volcado entero. 'stock' ya no esta: salio ese mismo dia. */
const TABS = ['inicio', 'pedidos', 'pedidoshome', 'caja', 'egresos',
              'proveedores', 'planificacion', 'estancias', 'mireparto'];

/* Que trae cada endpoint liviano. Salido de pedirselos a produccion ese dia.
   Es lo que permite decir "esta tab ya podria vivir sin el volcado". */
const LIVIANOS = {
  pedidosLight: ['ts', 'pedidos', 'canales', 'saludSem', 'saludMes', 'ventasExtra'],
  cajaLight: ['ts', 'caja', 'saldoBase', 'movimientos', 'gastos', 'gastosHist',
              'ingresos', 'efMano', 'efHuerfanos', 'sobres', 'cuentas',
              'provisiones', 'config', 'cajaMode'],
  ocLight: ['oc'],
  stockTab: ['stock', 'stockDeps', 'stockCierre']
};

/* El espia.
 *
 * Primero se intento definir `window.D` como un par get/set, para envolver en
 * un Proxy cada objeto que le asignaran. **No funciona**: el ERP declara
 * `var D=null` en el nivel superior de su script, y esa declaracion redefine la
 * propiedad como un dato comun — el accessor se pierde sin avisar y el espia
 * queda mudo. (Verificado: el descriptor de `window.D` termina con `value` y
 * `writable`, no con `get`.)
 *
 * Asi que se envuelve a mano, con `__espiar()`, justo antes de entrar a cada
 * tab. Si el ERP reasigna D mientras tanto el Proxy se cae, y por eso se vuelve
 * a llamar en cada vuelta. */
const ESPIA = `
(function(){
  window.__leidos={};          /* tab -> {campo: veces} */
  window.__tabAhora='(arranque)';
  window.__crudo=null;         /* el objeto de verdad, sin el Proxy encima */
  /* GUARDAR LA COPIA NO ES USAR UN CAMPO.
     El ERP guarda D entero en localStorage (la copia "ma3") con JSON.stringify, y eso
     toca las 34 claves una por una. Sin este freno, cada tab que se abriera
     despues de un guardado aparecia usando el volcado completo — que es
     exactamente la conclusion contraria a la verdadera. */
  var serializando=0;
  var st=JSON.stringify;
  JSON.stringify=function(){ serializando++; try{ return st.apply(JSON,arguments); } finally{ serializando--; } };

  var anotar=function(k){
    if(serializando)return;
    if(typeof k!=='string')return;
    if(k==='then'||k==='toJSON'||k==='constructor')return;
    var t=window.__tabAhora;
    (window.__leidos[t]=window.__leidos[t]||{});
    window.__leidos[t][k]=(window.__leidos[t][k]||0)+1;
  };
  window.__espiar=function(){
    var o=window.D;
    if(!o||typeof o!=='object')return false;
    if(o.__esEspia)return true;
    window.__crudo=o;
    window.D=new Proxy(o,{ get:function(t,k,r){
      if(k==='__esEspia')return true;
      anotar(k); return Reflect.get(t,k,r);
    }});
    return true;
  };
})();
`;

/* Datos de mentira, pero con la FORMA de los de verdad: si a una tab le falta
   un array que espera, revienta antes de leer los campos que vinimos a medir. */
const hoy = new Date();
const iso = d => d.toISOString().slice(0, 10);
/* Los cuatro canales, y estados distintos, A PROPOSITO. Con puros pedidos de
   Home entregados y pagados, las ramas de Red (que leen `D.vendedores`), las de
   pendiente de cobro y las canceladas no se ejecutan — y un campo que no se
   ejecuta no se mide. La medicion diria "esta tab no usa ese campo" sobre un
   camino que en la vida real se recorre todos los dias. */
const CANALES = ['Home', 'Pilar', 'Clubes', 'Red'];
const ESTADOS = [['Entregado', 'Pagado'], ['Entregado', 'Pendiente'],
                 ['Pendiente', 'Pendiente'], ['Cancelado', 'Pendiente'],
                 ['Entregado', 'Parcial']];
const MEDIOS = ['Efectivo', 'Mercado Pago Tadeo', 'Brubank Lucas', ''];
const PEDIDO = (i) => {
  const h = CANALES[i % CANALES.length];
  const st = ESTADOS[i % ESTADOS.length];
  return {
    n: 'P' + i, h: h, f: iso(hoy), fe: iso(hoy), es: st[0], ep: st[1],
    c: 'Cliente ' + i, t: '11' + (30000000 + i), dir: 'Los Robles ' + i,
    $: 12000 + i, subt: 12000 + i, env: h === 'Red' ? 3000 : 0, co: 0,
    mp: MEDIOS[i % MEDIOS.length], d: [{ a: 'PMu', q: 1, p: 11200 }],
    row: i + 1, br: h === 'Red' ? ('Vendedor ' + (i % 3)) : '',
    ev: h === 'Red' ? iso(hoy) : '', hist: false, ocs: [], vu: 0
  };
};
const STUB = {
  ts: Date.now(),
  pedidos: Array.from({ length: 40 }, (_, i) => PEDIDO(i)),
  canales: CANALES.map(h => ({ h: h, n: 10, $: 120000 })),
  saludSem: { casas: 4, ventas: 12, $: 144000 },
  saludMes: { casas: 9, ventas: 30, $: 360000 },
  ventasExtra: [],
  totales: { vendido: 144000, cobrado: 120000, pendiente: 24000 },
  vueltos: [{ c: 'Cliente 3', t: '1130000003', $: 2000 }],
  vendedores: [{ v: 'Vendedor 0', deuda: 45000, ped: 4 },
               { v: 'Vendedor 1', deuda: 0, ped: 2 }],
  proveedores: [{ p: 'Caco', deuda: 120000 }],
  liquidaciones: [{ v: 'Vendedor 0', f: iso(hoy), $: 20000 }],
  billetera: [{ c: 'Cliente 1', $: 5000 }],
  saldoEf: 50000, saldoMP: 20000, saldo: 80000,
  caja: { efectivo: 50000, mp: 20000, brubank: 10000 },
  saldoBase: { efectivo: 0, mp: 0, brubank: 0 },
  movimientos: [{ f: iso(hoy), t: 'Ingreso', c: 'Efectivo', $: 12000, det: 'x' }],
  gastos: [{ f: iso(hoy), cat: 'Insumos', $: 3000, det: 'y' }],
  gastosHist: [], ingresos: [], efMano: [], efHuerfanos: [], sobres: [],
  cuentas: [], provisiones: [], config: {},
  oc: { pend: 0, total: 0, lista: [] },
  stock: [], stockDeps: [], stockCierre: ''
};

const EXTRA = `
(function(){
  var S=${JSON.stringify(STUB)};
  try{ localStorage.clear(); localStorage.setItem('maleu_tab','inicio'); }catch(e){}
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST')
        return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}}));
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      var c;
      if(a==='admin')            c=S;
      else if(a==='pedidosLight')c={ts:S.ts,pedidos:S.pedidos,canales:S.canales,saludSem:S.saludSem,saludMes:S.saludMes,ventasExtra:[],light:true};
      else if(a==='cajaLight')   c={ts:S.ts,caja:S.caja,saldoBase:S.saldoBase,movimientos:S.movimientos,gastos:S.gastos,gastosHist:[],ingresos:[],efMano:[],efHuerfanos:[],sobres:[],cuentas:[],provisiones:[],config:{}};
      else if(a==='ocLight')     c={ok:true,oc:S.oc};
      else if(a==='stockTab')    c={ok:true,ts:S.ts,stock:[],stockDeps:[],stockCierre:''};
      else                       c={ok:true,ts:S.ts,lista:[],datos:[],items:[],v:[],cobros:[],deps:[],piezas:[]};
      return Promise.resolve(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}}));
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

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => {
    if (met === 'Runtime.exceptionThrown')
      errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion');
  });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };

  /* Sin estos dos, `addScriptToEvaluateOnNewDocument` se acepta y no hace nada:
     el script no aparece nunca en la pagina y el ERP arranca sin el espia. */
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride',
    { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: ESPIA + EXTRA });
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });

  if (!await esperar(cli, `typeof go==='function' && !!window.__leidos`, 60000)) {
    console.log('el ERP no arranco'); salir(1);
  }
  /* Hasta que el volcado no llego no hay nada que espiar: envolver `null` no
     mide nada y la medicion saldria vacia con todo en verde. */
  if (!await esperar(cli, `!!window.D && typeof window.D==='object' && Array.isArray(window.D.pedidos)`, 60000)) {
    console.log('el volcado no llego al front: sin eso no se mide nada'); salir(1);
  }
  await pausa(2000);

  for (const t of TABS) {
    /* HAY QUE FORZAR EL REPINTADO. El ERP dibuja cada seccion UNA vez y la marca
       en `_pintadas`; al arrancar ya las dibujo casi todas en segundo plano. Sin
       borrar esa marca, `go(tab)` no vuelve a leer nada y la medicion da cero
       campos para todas — que se leeria como "ninguna tab usa el volcado". */
    await evaluar(cli, `try{ Object.keys(_pintadas).forEach(function(k){ delete _pintadas[k]; }); }catch(e){} 1`);
    await evaluar(cli, `window.__tabAhora=${JSON.stringify(t)}; window.__espiar(); 1`);
    await evaluar(cli, `try{ go(${JSON.stringify(t)}); }catch(e){ window.__errTab=String(e); } 1`);
    await pausa(1000);
    /* Y llamar al render de la tab, que es quien lee de verdad. */
    await evaluar(cli, `window.__espiar();
      try{ if(typeof _SECCION==='object'&&_SECCION[${JSON.stringify(t)}])_SECCION[${JSON.stringify(t)}](); }catch(e){}
      1`);
    await pausa(1400);
    await evaluar(cli, `window.__espiar(); 1`);
    await pausa(600);
  }
  await pausa(1200);

  const leidos = await evaluar(cli, `window.__leidos`);

  const enLiviano = {};
  for (const ep of Object.keys(LIVIANOS))
    for (const c of LIVIANOS[ep]) (enLiviano[c] = enLiviano[c] || []).push(ep);

  console.log(`\n== QUE LEE CADA TAB DEL VOLCADO · ${ANCHO}px ==\n`);
  const faltantes = {};
  for (const t of TABS) {
    const c = leidos[t] || {};
    const campos = Object.keys(c).sort((a, b) => c[b] - c[a]);
    if (!campos.length) { console.log(`${t.padEnd(14)} — no leyo nada de D`); continue; }
    const cubiertos = campos.filter(k => enLiviano[k]);
    const faltan = campos.filter(k => !enLiviano[k]);
    faltan.forEach(k => (faltantes[k] = faltantes[k] || []).push(t));
    console.log(`${t.padEnd(14)} ${campos.length} campos`);
    console.log(`  ya en un liviano : ${cubiertos.join(', ') || '—'}`);
    console.log(`  SOLO en el volcado: ${faltan.join(', ') || '— (esta tab ya se puede despegar)'}`);
  }

  console.log(`\n== LO QUE FALTA, Y A QUIEN LE FALTA ==`);
  const ord = Object.keys(faltantes).sort((a, b) => faltantes[b].length - faltantes[a].length);
  if (!ord.length) console.log('  nada: todas las tabs se pueden despegar con lo que ya existe');
  for (const k of ord) console.log(`  ${k.padEnd(16)} ${faltantes[k].join(', ')}`);

  if (errores.length) {
    console.log(`\n${errores.length} error(es) en consola (el stub es minimo, puede ser eso):`);
    errores.slice(0, 6).forEach(e => console.log('  ' + String(e).split('\n')[0]));
  }
  salir(0);
})();
