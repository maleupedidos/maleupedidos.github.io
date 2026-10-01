/* EL VUELTO NO SE PODIA EDITAR NI BORRAR EN EL ERP FUSIONADO. (1/10/2026)
 *
 *   node _tools/servir.js                        (en otra terminal)
 *   node _tools/pruebas/probar_vuelto_trabado.js [390|1440] [app.html]
 *
 * Lucas, cobrando en efectivo: "Cambio que le devolviste" quedaba trabado en
 * $9.900. Lo borraba y volvia; tipeaba en la transferencia y el efectivo
 * volvia a $9.900.
 *
 * La causa no esta en la cuenta: esta en el BUILD. Los campos del vuelto
 * decian `oninput="..._camTocado=true..."`. En `ruta.html` suelto
 * `_camTocado` es global y anda. Fusionado en `app.html`, RUTA vive adentro de
 * una funcion y el build publica en `window` una COPIA de cada variable: el
 * handler inline escribia `window._camTocado` y `_sugerirVuelto` leia la de
 * adentro, que seguia en `false`. Cada tecla re-sugeria el vuelto y pisaba lo
 * tipeado.
 *
 * Por eso esta prueba corre sobre `app.html` y TIPEA de verdad (eventos
 * `input` que disparan el handler del HTML): `probar_vuelto_redondeo.js` corre
 * sobre `ruta.html` suelto y asigna la bandera desde afuera — da verde con el
 * bug adentro.
 *
 * Datos inventados y ningun fetch sale de la maquina: el repo es publico.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'app.html';
const BASE = process.env.BASE || 'http://localhost:8080';

let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 40000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr) === true) return true; } catch (e) {} await pausa(200); }
  return false;
};

/* El caso de la foto de Lucas: $70.600 con 15% = $60.010. Recibio $64.000
   en efectivo + $6.000 por transferencia. */
const PEND = [{ h: 'Home', id: '99001', r: 2, c: 'Cliente Prueba', fp: 'Efectivo', $: 60010,
  totalOriginal: 60010, ep: 'Pendiente', f: '2026-10-01' }];

const PREP = `
(function(){
  try{
    localStorage.setItem('maleu_ruta',JSON.stringify({_v:'v2-row-keyed',
      entregas:[],entregados:{},cobrados:{},propinas:{},syncQueue:[],armadoDone:{},
      pendientesCobro:${JSON.stringify(PEND)}}));
    /* Las cuentas como las guarda el ERP cuando llegan con cobrosPendientes. */
    localStorage.setItem('maleu_ruta_ctas',JSON.stringify([
      {id:'efectivo',nombre:'Efectivo',tipo:'efectivo'},
      {id:'mp',nombre:'Mercado Pago Tadeo',tipo:'digital',def:true},
      {id:'brubank',nombre:'Brubank Lucas',tipo:'digital'}]));
  }catch(e){}
  window.__posts=[];
  var real=window.fetch;
  window.fetch=function(u,i){
    var url=(typeof u==='string')?u:((u&&u.url)||'');
    if(/script\\.google|supabase/.test(url)){
      if(i&&String(i.method||'').toUpperCase()==='POST'){window.__posts.push(url);}
      return new Promise(function(){}); // nunca vuelve: no pisa los datos sembrados
    }
    return real.apply(this,arguments);
  };
})();`;

/* Tipear como una persona: valor + evento input, que corre el oninput del HTML. */
const tipear = (id, txt) => `(function(){
  var el=document.getElementById('${id}'); el.focus(); el.value='${txt}';
  el.dispatchEvent(new Event('input',{bubbles:true})); return el.value; })()`;
const val = id => `String(document.getElementById('${id}').value||'')`;
const LEER = `(function(){
  var b=document.getElementById('cobroCamCtaBox');
  return {camEf:${val('cobroCamEf')},camMP:${val('cobroCamMP')},
    ctaVisible:!!b&&b.style.display!=='none',
    pills:Array.prototype.map.call(document.querySelectorAll('#cobroCamCta .cobro-pill-cta'),
      function(p){return {cta:p.dataset.cta,on:p.classList.contains('on'),h:p.getBoundingClientRect().height};}),
    err:(document.getElementById('cobroRutaErr')||{}).textContent||'',
    lbl:(document.getElementById('cobroSumPropLbl')||{}).textContent||''};})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE + '/' + ARCH + '?prueba=1' });
    /* _SUBAPP_ruta se define MAS ABAJO que go(): pedir la tab apenas existe go()
       da "tab desconocida" y RUTA no arranca nunca. */
    if (!await esperar(cli, `typeof window._abrirSubapp==='function'&&typeof window._SUBAPP_ruta==='function'`)) throw new Error('el ERP no arranco');
    await evaluar(cli, `(function(){try{go('ruta');}catch(e){} return true;})()`); // entrar a la tab: si no, #pg-ruta queda oculto y todo mide 0
    if (!await esperar(cli, `typeof window.abrirCobroPendiente==='function'`)) throw new Error('RUTA no arranco');
    await evaluar(cli, 'abrirCobroPendiente(0)');
    await pausa(400);
    const abierto = await evaluar(cli, `!!document.getElementById('cobroRecEf')&&document.getElementById('cobroRutaSub').textContent`);
    chk('el cuadro de cobro abre con el pedido sembrado', /60\.010/.test(String(abierto)), abierto);

    console.log(`\n== El vuelto en el ERP fusionado (${ARCH}, ${ANCHO}px) ==\n`);
    // Como Lucas: abre "Devolvi cambio" y tipea lo que recibio.
    await evaluar(cli, `_toggleCobroSec('cobroCambioSection',document.getElementById('cobroToggleCambio'))`);
    await evaluar(cli, tipear('cobroRecEf', '64000'));
    await evaluar(cli, tipear('cobroRecMP', '6000'));
    let r = await evaluar(cli, LEER);
    chk('sugiere el vuelto en billetes: $9.900 (70.000 - 60.010 = 9.990, redondeado a $100)',
      r.camEf === '9.900', r);

    // 1. Corregirlo a mano.
    await evaluar(cli, tipear('cobroCamEf', '9990'));
    r = await evaluar(cli, LEER);
    chk('el vuelto en efectivo se puede EDITAR (queda 9.990)', r.camEf === '9.990', r);

    // 2. Borrarlo.
    await evaluar(cli, tipear('cobroCamEf', ''));
    r = await evaluar(cli, LEER);
    chk('el vuelto en efectivo se puede BORRAR', r.camEf === '' || r.camEf === '0', r);

    // 3. Pasarlo a transferencia: el efectivo no vuelve solo.
    await evaluar(cli, tipear('cobroCamMP', '9990'));
    r = await evaluar(cli, LEER);
    chk('tipeando el vuelto por transferencia, el efectivo NO vuelve a $9.900',
      r.camEf === '' || r.camEf === '0', r);
    chk('el vuelto por transferencia queda en 9.990', r.camMP === '9.990', r);

    // 4. Pregunta de que cuenta salio, ninguna elegida, y frena hasta elegir.
    chk('pregunta de que cuenta salio el vuelto por transferencia', r.ctaVisible === true, r);
    chk('con las dos cuentas como opcion', r.pills.length >= 2, r.pills);
    chk('ninguna viene elegida', r.pills.length > 0 && r.pills.every(p => !p.on), r.pills);
    chk('y el cobro no cierra sin elegirla', /De qu[eé] cuenta sali[oó] el vuelto/.test(r.err), r.err);
    chk('las pastillas llegan al piso tactil (>= 38px)', r.pills.length > 0 && r.pills.every(p => p.h >= 38), r.pills);
    if (r.pills.length) {
      await evaluar(cli, `document.querySelector('#cobroCamCta .cobro-pill-cta[data-cta="${r.pills[0].cta}"]').click()`);
      r = await evaluar(cli, LEER);
      chk('elegida una, la pastilla queda marcada y el error se va',
        r.pills.some(p => p.on) && !/vuelto por transferencia\?/.test(r.err), r);
    }
    chk('ningun POST salio', (await evaluar(cli, 'window.__posts.length')) === 0);
  } catch (e) {
    mal++; console.log('  MAL  la prueba revento: ' + (e && e.message));
  }
  console.log(`\n${ok} ok · ${mal} mal`);
  salir(mal ? 1 : 0);
})();
