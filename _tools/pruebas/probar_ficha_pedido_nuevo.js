/* La ficha de un pedido MAS NUEVO que la copia de pedidos (24/10/2026).

     node _tools/servir.js <puerto>     (en otra terminal)
     BASE=http://localhost:<puerto> node _tools/pruebas/probar_ficha_pedido_nuevo.js [390|1440] [app.html]

   Tadeo toco a un cliente en ARMADO (#2054, recien cargado) y le salio «No tengo
   el pedido #2054 en la copia de pedidos — actualizá con ↻». La ficha sale de
   `D.pedidos`, que no se rehace con cada pedido nuevo.

   Sostiene:
   · con la copia sin ese pedido, avisa «Trayendo…» y pide los pedidos de este
     minuto (`dePlanilla`, lo mismo que el ↻), no se queda en el cartel;
   · cuando el pedido llega, la ficha se abre sola;
   · si no llega, lo dice («todavía no está en la planilla»);
   · si en el medio cambiaste de pantalla, no se abre encima de otra cosa;
   · un pedido que ya esta en la copia abre como siempre, sin pedir nada.

   `loadRapido` se reemplaza por uno que simula la respuesta: es global del panel
   (no vive en un IIFE), asi que reemplazarlo desde aca es reemplazar el que llama
   la ficha. Sin backend, con `?prueba=1`. Datos inventados: el repo es publico. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = Number(process.argv[2]) || 390;
const APP = process.argv[3] || 'app.html';
const BASE = process.env.BASE || 'http://localhost:8080';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); } return false; };

const ped = o => Object.assign({ h: 'Home', o: 'Deposito', oDet: '', es: 'Pendiente', ep: 'No Cobrado', fp: 'Efectivo',
  bp: 'Barrio Prueba', lo: '67', br: 'Estancias del Pilar', tel: '1100000067', hr: '12:30', desc: 0, env: 0, co: 0, mg: 0,
  p: [{ a: 'PPM', q: 1 }], subt: 17000, $: 17000, dee: '2026-10-24' }, o);
const VIEJO = ped({ n: '8001', r: 8001, c: 'Cliente Viejo Prueba' });
const NUEVO = ped({ n: '8054', r: 8054, c: 'Cliente Nuevo Prueba' });

/* El loadRapido simulado: anota con que lo llamaron y, si `__traer`, agrega el
   pedido nuevo antes de avisar que llegaron los pedidos. */
const PREPARAR = `(function(){
  if(typeof D==='undefined'||!D) window.D={};
  D.pedidos=[${JSON.stringify(VIEJO)}]; D.oc=D.oc||{lista:[]};
  window.__lr=[]; window.__toasts=[]; window.__traer=true;
  window.toast=function(t){window.__toasts.push(String(t));};
  /* Solo se anota lo que pide la ficha (trae alLlegarPedidos): el ERP llama
     a loadRapido por su cuenta, y eso no es de esta prueba. */
  window.loadRapido=function(o){ if(o&&o.alLlegarPedidos) window.__lr.push(o);
    return new Promise(function(res){ setTimeout(function(){
      if(window.__traer && !D.pedidos.some(function(p){return p.n==='8054';})) D.pedidos.push(${JSON.stringify(NUEVO)});
      if(o&&o.alLlegarPedidos) o.alLlegarPedidos(true);
      res({ok:true});
    },400); });
  };
  try{ if(typeof closeOrdDetail==='function')closeOrdDetail(); }catch(e){}
  return 1;
})()`;
/* Abierta = el drawer con `open`; el encabezado conserva el texto del anterior. */
const ABIERTA = `(function(){var h=document.getElementById('ordHeadId'), d=document.getElementById('ordDrawer');
  var on=!!(d&&d.classList.contains('open'));
  return {head:on&&h?h.textContent:'', open:on};})()`;

(async () => {
  const cli = await abrir();
  const salir = x => { try { cli.matar(); } catch (e) {} process.exit(x); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    console.log('\n== La ficha de un pedido más nuevo que la copia · ' + APP + ' · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof openOrdDetail==='function' && typeof go==='function'`, 60000)) throw new Error('el ERP no arranco');
    await pausa(1500);

    console.log('\n-- el pedido ya está en la copia --');
    await evaluar(cli, PREPARAR);
    await evaluar(cli, `openOrdDetail('Home','8001',8001); 1`);
    await pausa(300);
    let a = await evaluar(cli, ABIERTA), lr = await evaluar(cli, `window.__lr.length`);
    chk('abre como siempre, sin pedir nada', /8001/.test(a.head) && lr === 0, { a, lr });

    console.log('\n-- un pedido más nuevo que la copia --');
    await evaluar(cli, PREPARAR);
    await evaluar(cli, `openOrdDetail('Home','8054',8054); 1`);
    await pausa(100);
    let t = await evaluar(cli, `window.__toasts.slice()`);
    chk('avisa que lo está trayendo (no «actualizá con ↻»)', t.some(x => /Trayendo el pedido #8054/.test(x)) && !t.some(x => /actualizá con/.test(x)), t);
    let o = await evaluar(cli, `window.__lr.map(function(x){return {sp:!!x.soloPedidos,dp:!!x.dePlanilla};})`);
    chk('pide los pedidos de este minuto (solo pedidos, de la planilla)', o.length === 1 && o[0].sp && o[0].dp, o);
    const abrio = await esperar(cli, `/8054/.test((document.getElementById('ordHeadId')||{}).textContent||'')`, 5000);
    chk('cuando llega, la ficha se abre sola', abrio === true, await evaluar(cli, ABIERTA));

    console.log('\n-- no llega --');
    await evaluar(cli, PREPARAR);
    await evaluar(cli, `window.__traer=false; openOrdDetail('Home','8054',8054); 1`);
    await pausa(900);
    t = await evaluar(cli, `window.__toasts.slice()`);
    a = await evaluar(cli, ABIERTA);
    chk('dice que todavía no está en la planilla', t.some(x => /#8054 todavía no está en la planilla/.test(x)) && !/8054/.test(a.head), { t, a });

    console.log('\n-- cambiaste de pantalla en el medio --');
    await evaluar(cli, PREPARAR);
    await evaluar(cli, `openOrdDetail('Home','8054',8054); try{go(cur==='inicio'?'pedidos':'inicio');}catch(e){} 1`);
    await pausa(900);
    a = await evaluar(cli, ABIERTA);
    chk('no se abre encima de otra pantalla', !/8054/.test(a.head), a);

    console.log('\n-- tocaste otro pedido en el medio --');
    await evaluar(cli, PREPARAR);
    await evaluar(cli, `openOrdDetail('Home','8054',8054); openOrdDetail('Home','8001',8001); 1`);
    await pausa(900);
    a = await evaluar(cli, ABIERTA);
    chk('queda abierto el último que tocaste', /8001/.test(a.head), a);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
