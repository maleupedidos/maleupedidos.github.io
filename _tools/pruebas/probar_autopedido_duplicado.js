/* EL MISMO AUTOPEDIDO NO PUEDE ENTRAR DOS VECES (4/10/2026).

     node probar_autopedido_duplicado.js

   Sabado 3/10, Lucas, Pilar #92 y #93 (Marcelo Moresco, $9.000). Medido en
   Log Tiempos y Log Errores: el candado del backend estuvo tomado ~4 minutos;
   el celular corto a los 90 s y dijo "no contesto" mientras el tercer
   reintento del interceptor ya estaba adentro y guardo el pedido 20 s despues.
   Lucas volvio a CARGAR el pedido (con telefono y otra forma de pago) y ese
   pedido nuevo nacio con otro clientOrderId: el dedup no lo podia reconocer.

   Lo que tiene que ser cierto:
   · si el POST se corta, ANTES de decir "no se pudo" se le pregunta al backend
     si el pedido entro (`pedidoEntro`), y si entro se muestra como guardado,
     con cual es;
   · se sigue preguntando mientras un intento puede estar en vuelo;
   · si el backend contesto un error, alcanza con una pregunta;
   · si se carga de nuevo el MISMO pedido despues de un intento sin confirmar
     —aunque se haya cerrado la app— viaja con el MISMO id;
   · despues de un pedido CONFIRMADO, el mismo pedido otra vez es otro pedido:
     id nuevo (si no, el backend tiraria un pedido real como repetido).

   Backend simulado: no toca produccion. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'ruta.html?standalone=1&';   // ver probar_autopedido_reloj.js
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 300) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};

/* El backend simulado. `modo` decide que contesta el POST; `entro` es la
   lista de respuestas a "¿entro?", en orden (la ultima se repite). */
const BACKEND = `(function(modo, entro){
  window.__posts=[]; window.__gets=[];
  window.fetch=function(u,o){
    u=String(u);
    if(u.indexOf('script.google')<0)return window.__fetchReal.apply(this,arguments);
    if(u.indexOf('action=pedidoEntro')>=0){
      window.__gets.push(u);
      var r=entro[Math.min(window.__gets.length-1, entro.length-1)];
      return Promise.resolve({json:function(){return Promise.resolve(r);}});
    }
    var body={}; try{body=JSON.parse((o&&o.body)||'{}')}catch(e){}
    window.__posts.push(body);
    if(modo==='corte'){ var e=new Error('abortado'); e.name='AbortError'; return Promise.reject(e); }
    if(modo==='error')return Promise.resolve({json:function(){return Promise.resolve({ok:false,error:'Fallo el stock'});}});
    return Promise.resolve({json:function(){return Promise.resolve({ok:true,n:93});}});
  };
  return 1;
})`;

const ARMAR = `(function(){
  try{
    var n=document.getElementById('npNombre'); if(!n)return 'sin npNombre';
    n.value='Marcelo Moresco (prueba)';
    npZona='Home'; npPago='Efectivo';
    npCart={}; var k=Object.keys(NP_PRECIOS||{})[0];
    if(k===undefined){ npCart[1]=1; } else { npCart[k]=1; }
    npFechaSel=new Date(Date.now()+86400000).toISOString().slice(0,10);
    var b=document.getElementById('npBarrioPrivado'); if(b)b.value='Estancias del Pilar';
    var sb=document.getElementById('npSubBarrio'); if(sb)sb.value='Prueba';
    var lo=document.getElementById('npLote'); if(lo)lo.value='59';
    return 'ok';
  }catch(e){return String(e&&e.message);}
})()`;
const GUARDAR = `try{npSaving=false;npGuardar();}catch(e){window.__errNp=String(e&&e.message);} 1`;
const TOAST = `(document.getElementById('rutToast')||{}).textContent||''`;
const EXITO = `(function(){var s=document.getElementById('npSuccess');return (s&&!s.classList.contains('hidden'))?s.textContent:''})()`;
const LIMPIAR = `(function(){
  var s=document.getElementById('npSuccess'); if(s){s.classList.add('hidden'); s.innerHTML='';}
  var t=document.getElementById('rutToast'); if(t)t.textContent='';
  if(typeof _npSaltoT!=='undefined'&&_npSaltoT){clearTimeout(_npSaltoT);}
  return 1;})()`;
/* El ultimo POST que es un PEDIDO: despues de guardar, la pantalla manda otros
   (stock, piezas) sin clientOrderId, y leer "el ultimo" a secas daba vacio. */
const COID_ULTIMO = `(function(){for(var i=window.__posts.length-1;i>=0;i--)if(window.__posts[i].clientOrderId)return window.__posts[i].clientOrderId;return null})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + 'prueba=1' });
    await esperar(cli, `typeof npGuardar==='function'`, 60000);
    await pausa(400);
    await evaluar(cli, `window.__fetchReal=window.fetch; window.__confirmDevuelve=true;
      try{localStorage.removeItem('maleu_np_pendiente')}catch(e){}
      /* Los plazos reales son 75 s / 5 s: en la prueba, 3 s / 0,5 s. */
      try{ NP_ENTRO_MS=3000; NP_ENTRO_CADA=500; }catch(e){} 1`);

    console.log('\n== 1. Se corta, pero el pedido HABIA entrado (el sabado) ==\n');
    await evaluar(cli, BACKEND + `('corte', [{ok:true,entro:false},{ok:true,entro:true,ref:'Pilar #92'}])`);
    chk('se pudo armar el pedido', await evaluar(cli, ARMAR) === 'ok');
    await evaluar(cli, GUARDAR);
    await pausa(2500);
    const gets1 = await evaluar(cli, `window.__gets.length`);
    chk('pregunta si entro antes de decir que no', gets1 >= 1, { gets: gets1 });
    chk('   y sigue preguntando mientras puede haber un intento en vuelo', gets1 >= 2, { gets: gets1 });
    const ex1 = await evaluar(cli, EXITO), to1 = await evaluar(cli, TOAST);
    chk('lo muestra como GUARDADO, no como error', /guardado/i.test(ex1) && !/no se pudo|no contest/i.test(to1), { ex1, to1 });
    chk('   y dice cual es, para que nadie lo cargue de nuevo', /Pilar #92/.test(ex1) && /ya hab/i.test(ex1), { ex1 });
    chk('   y el id queda libre para el proximo pedido', await evaluar(cli, `typeof npCoid!=='undefined'&&npCoid===''`));
    await evaluar(cli, LIMPIAR);

    console.log('\n== 2. Se corta y NO entro: el error sale, y el mismo pedido cargado de nuevo lleva el mismo id ==\n');
    await evaluar(cli, BACKEND + `('corte', [{ok:true,entro:false}])`);
    await evaluar(cli, ARMAR);
    await evaluar(cli, GUARDAR);
    await esperar(cli, `/no se duplica/i.test(${TOAST})`, 8000);
    const to2 = await evaluar(cli, TOAST);
    chk('si no entro, dice que se puede reintentar sin duplicar', /no se duplica/i.test(to2), { to2 });
    const coidA = await evaluar(cli, COID_ULTIMO);
    /* Lo que hizo Lucas: no tocar GUARDAR, sino volver a cargar el pedido.
       Se simula lo peor —la app cerrada y abierta—: npCoid se pierde. */
    await evaluar(cli, `npCoid=''; 1`);
    await evaluar(cli, BACKEND + `('ok', [{ok:true,entro:false}])`);
    await evaluar(cli, ARMAR);
    await evaluar(cli, `document.getElementById('npNombre').value='  marcelo  MORESCO (prueba) '; 1`);
    await evaluar(cli, GUARDAR);
    await pausa(1000);
    const coidB = await evaluar(cli, COID_ULTIMO);
    chk('EL PEDIDO CARGADO DE NUEVO VIAJA CON EL MISMO id (aunque se haya cerrado la app)',
      !!coidA && coidA === coidB, { primero: coidA, cargadoDeNuevo: coidB });
    await evaluar(cli, LIMPIAR);

    console.log('\n== 3. Despues de uno CONFIRMADO, el mismo pedido es otro pedido ==\n');
    await evaluar(cli, BACKEND + `('ok', [{ok:true,entro:false}])`);
    await evaluar(cli, ARMAR);
    await evaluar(cli, GUARDAR);
    await pausa(1000);
    const coidC = await evaluar(cli, COID_ULTIMO);
    chk('id nuevo: no se tira un pedido real como repetido',
      !!coidC && coidC !== coidB, { anterior: coidB, nuevo: coidC });
    await evaluar(cli, LIMPIAR);

    console.log('\n== 4. El backend contesto un error: una sola pregunta ==\n');
    await evaluar(cli, BACKEND + `('error', [{ok:true,entro:false}])`);
    await evaluar(cli, ARMAR);
    await evaluar(cli, GUARDAR);
    await esperar(cli, `/no se duplica/i.test(${TOAST})`, 5000);
    const g4 = await evaluar(cli, `window.__gets.length`), to4 = await evaluar(cli, TOAST);
    chk('pregunta una vez (la fila pudo escribirse antes del error)', g4 === 1, { gets: g4 });
    chk('   y como no entro, muestra el error', /Fallo el stock/.test(to4) && /no se duplica/i.test(to4), { to4 });
    chk('el loader quedo cerrado', await evaluar(cli,
      `!document.getElementById('rutLoaderOverlay').classList.contains('visible')`));
    chk('el boton volvio a estar usable', await evaluar(cli, `!document.getElementById('npGuardar').disabled`));

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
