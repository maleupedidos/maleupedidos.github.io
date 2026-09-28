/* JUNTAR EL EFECTIVO Y QUE DE EXACTO. (28/9/2026)
 *
 *   node _tools/servir.js                        (en otra terminal)
 *   node _tools/pruebas/probar_efectivo_exacto.js
 *
 * Tadeo: *"un cliente tiene que pagar el total que sea. Sea $1.999,99 sea
 * $3.075. Despues otra cosa es lo que el cliente elije hacer con ese total:
 * puede redondear para arriba, o que le falte muy poca plata y yo le diga que
 * no pasa nada y se pone como descuento. Pero todo esto, a la hora de juntar la
 * plata en efectivo que realmente recaude, tiene que dar EXACTO."*
 *
 * Asi que el total NO se toca. Lo que se prueba es lo otro: que cada peso de
 * diferencia quede clasificado, y que la plata que queda en la mano sea
 * EXACTAMENTE la que el ERP dice que quedo.
 *
 * La cuenta que tiene que cerrar, en cada caso:
 *
 *     billete que dio  -  vuelto que devolvi  =  lo que el ERP registra
 *
 * Se usa un total que no se puede pagar con billetes a proposito: $47.790, uno
 * de los reales de septiembre (un pedido de $53.100 con el 10%).
 *
 * Ningun fetch sale de esta maquina y los datos son inventados: el repo es
 * publico.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'ruta.html';
const TOTAL = 47790;

let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 40000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const SINRED = `
(function(){
  window.__fetches=[];
  window.fetch=function(u,i){
    var post=!!(i&&String(i.method||'').toUpperCase()==='POST');
    var cuerpo=null;
    if(post){ try{ cuerpo=JSON.parse(i.body); }catch(e){ cuerpo=String(i.body||''); } }
    window.__fetches.push({post:post,body:cuerpo});
    return Promise.resolve({ok:true,status:200,
      json:function(){return Promise.resolve({ok:true});},
      text:function(){return Promise.resolve('{"ok":true}');}});
  };
})();
`;

/* Una parada, como la vive el que cobra: se abre el cuadro, se toca "Devolvi
   cambio" si hace falta, se tipea EL BILLETE y se elige que pasa con lo que no
   cierra. Devuelve la plata que queda en la mano segun el ERP. */
const enLaPuerta = (billete, opts) => `(function(){
  var o=${JSON.stringify(opts || {})};
  window._cobroRutaState={key:'k1',combo:false,
    ent:{h:'Home',id:'999',r:2,c:'Prueba',fp:'Efectivo','$':${TOTAL}},
    total:${TOTAL},totalOriginal:${TOTAL},fp:'Efectivo',
    cambioOpen:false,aFavOpen:false,entregar:true,aceptaDescuento:false};
  _resetCobroSeccionesColapsables();
  _setMoneyInput('cobroRecEf',${TOTAL});
  _setMoneyInput('cobroRecMP',0);
  _recalcCobroRuta();

  if(o.devolvi){
    _toggleCobroSec('cobroCambioSection',document.getElementById('cobroToggleCambio'));
  }
  // EL BILLETE.
  var inp=document.getElementById('cobroRecEf');
  inp.value=String(${billete});
  _fmtMoneyInput(inp);
  if(typeof _cobroRecTocado==='function')_cobroRecTocado();
  _recalcCobroRuta();

  // Y que pasa con lo que no cierra.
  if(o.sobranteA==='propina'){
    try{ _marcarSobranteComoPropina(); }catch(e){}
  } else if(o.sobranteA==='afavor'){
    try{ _marcarSobranteAFavor(); }catch(e){}
  } else if(o.perdonar){
    try{ _toggleAceptaDescuento(); }catch(e){}
  }
  var r=_recalcCobroRuta();

  var vuelto=_parseMoneyInput(document.getElementById('cobroCamEf'));
  return {
    billete:${billete}, vuelto:vuelto,
    /* Lo que el ERP dice que quedo de este cobro. */
    registra:r.neto,
    /* Lo que hay fisicamente en la mano. */
    enLaMano:${billete}-vuelto,
    propina:r.propina, aFav:r.aFav, errores:r.errors.length,
    etiqueta:(document.getElementById('cobroSumPropLbl')||{}).textContent||'',
    boton:(document.getElementById('btnCobroRutaOk')||{}).textContent||''
  };
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SINRED });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?standalone=1' });
    if (!await esperar(cli, `typeof _recalcCobroRuta==='function' && !!document.getElementById('cobroRecEf')`))
      throw new Error('ruta.html no arranco');

    console.log('\n== Un pedido de $47.790 y la plata que queda en la mano ==\n');

    /* ── 1. EL CLIENTE REDONDEA PARA ARRIBA ─────────────────────────────
       Da $50.000, le devolves lo que se puede dar ($2.200) y te quedas con
       $47.800: $10 mas que el pedido. */
    let A = await evaluar(cli, enLaPuerta(50000, { devolvi: true }));
    chk('el vuelto que sugiere se puede dar en billetes', A.vuelto === 2200, A);
    chk('quedan $47.800 en la mano', A.enLaMano === 47800, A);
    chk('el ERP no deja cerrar hasta decir que son esos $10', A.errores > 0, A);
    A = await evaluar(cli, enLaPuerta(50000, { devolvi: true, sobranteA: 'propina' }));
    chk('dicho que se los dejo, el cobro cierra', A.errores === 0, A);
    chk('Y LO QUE REGISTRA ES LO QUE HAY EN LA MANO ($47.800)',
        A.registra === A.enLaMano, A);

    /* ── 2. LE FALTA POCO Y SE LO PERDONAS ──────────────────────────────
       Da $47.700 y no tiene los $90. */
    let B = await evaluar(cli, enLaPuerta(47700, {}));
    chk('con $90 de menos el ERP frena y lo dice', B.errores > 0 && /Falta/.test(B.etiqueta), B);
    B = await evaluar(cli, enLaPuerta(47700, { perdonar: true }));
    chk('perdonados los $90, el cobro cierra', B.errores === 0, B);
    chk('queda anotado como descuento, no perdido',
        /Descuento aceptado/.test(B.etiqueta), B);
    chk('Y LO QUE REGISTRA ES LO QUE HAY EN LA MANO ($47.700)',
        B.registra === B.enLaMano && B.registra === 47700, B);

    /* ── 3. "QUEDATELO" ─────────────────────────────────────────────────
       Da $50.000 y no quiere el vuelto. */
    let C = await evaluar(cli, enLaPuerta(50000, { sobranteA: 'propina' }));
    chk('sin devolver nada, el cobro cierra', C.errores === 0, C);
    chk('los $2.210 quedan como propina', C.propina === 2210, C);
    chk('Y LO QUE REGISTRA ES LO QUE HAY EN LA MANO ($50.000)',
        C.registra === C.enLaMano && C.registra === 50000, C);

    /* ── 4. A FAVOR PARA LA PROXIMA ─────────────────────────────────────
       Da $50.000 y el vuelto se lo guardas para el proximo pedido. */
    let D = await evaluar(cli, enLaPuerta(50000, { sobranteA: 'afavor' }));
    chk('el sobrante puede quedar a favor del cliente', D.errores === 0 && D.aFav === 2210, D);
    chk('Y LO QUE REGISTRA SIGUE SIENDO LO QUE HAY EN LA MANO ($50.000)',
        D.registra === D.enLaMano, D);

    /* ── 5. EL PAGO JUSTO, QUE ES LA MAYORIA ────────────────────────────
       No todo pedido tiene vuelto: el que paga con transferencia paga el
       total exacto y aca no cambia nada. */
    let E = await evaluar(cli, enLaPuerta(TOTAL, {}));
    chk('pagando el total exacto, cierra sin preguntar nada',
        E.errores === 0 && /Cierra justo/.test(E.etiqueta), E);
    chk('y lo que registra es lo que hay en la mano', E.registra === E.enLaMano, E);

    /* ── 6. Y EL BILLETE QUEDA GUARDADO (28/9/2026) ─────────────────────
       Hasta hoy el bruto se reconstruia como cobrado + vuelto, asi que el
       arqueo se comparaba contra si mismo. Con el billete guardado, contar la
       plata pasa a ser una verificacion contra un dato. */
    const post = await evaluar(cli, `(function(){
      window.__fetches=[];
      window._cobroRutaState={key:'k1',combo:false,
        ent:{h:'Home',id:'999',r:2,c:'Prueba',fp:'Efectivo','$':${TOTAL}},
        total:${TOTAL},totalOriginal:${TOTAL},fp:'Efectivo',
        cambioOpen:false,aFavOpen:false,entregar:true,aceptaDescuento:false};
      _resetCobroSeccionesColapsables();
      _setMoneyInput('cobroRecEf',${TOTAL}); _setMoneyInput('cobroRecMP',0);
      _recalcCobroRuta();
      _toggleCobroSec('cobroCambioSection',document.getElementById('cobroToggleCambio'));
      var inp=document.getElementById('cobroRecEf');
      inp.value='50000'; _fmtMoneyInput(inp);
      if(typeof _cobroRecTocado==='function')_cobroRecTocado();
      _recalcCobroRuta();
      try{ _marcarSobranteComoPropina(); }catch(e){}
      _recalcCobroRuta();
      try{ window.confirm=function(){return true}; confirmarCobroRuta(); }catch(e){ window.__revento=String(e); }
      var L=(window.__fetches||[]).filter(function(f){return f.post;});
      return L.length?L[L.length-1].body:{ error: window.__revento||'sin POST' };
    })()`);
    chk('el cobro manda un POST', !!post && !post.error, post);
    chk('y lleva EL BILLETE que dio el cliente ($50.000)',
        !!post && post.recibidoEf === 50000, post);
    chk('junto con el vuelto que salio de la billetera ($2.200)',
        !!post && post.cambioBilletera === 2200, post && post.cambioBilletera);
    chk('y el cobrado del pedido sigue siendo el total, no el billete',
        !!post && post.ef === TOTAL, post && post.ef);
    /* La cuenta que cierra, ahora con datos guardados y no calculados. */
    chk('BILLETE - VUELTO = lo que registra el pedido ($47.800)',
        !!post && (post.recibidoEf - (post.cambioBilletera || 0)) === (post.ef + (post.propina || 0)),
        post && { billete: post.recibidoEf, vuelto: post.cambioBilletera, ef: post.ef, propina: post.propina });

    console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.log('  revento la prueba: ' + (e && e.stack || e));
    salir(1);
  }
})();
