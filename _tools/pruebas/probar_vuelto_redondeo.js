/* EL CUADRO DE COBRO CUANDO EL CLIENTE PAGA CON UN BILLETE GRANDE. (28/9/2026)
 *
 *   node _tools/servir.js                        (en otra terminal)
 *   node _tools/pruebas/probar_vuelto_redondeo.js
 *
 * Tadeo, contando la recaudacion de la semana con Lucas: *"Victoria Fernandez
 * en tab caja dice (le diste $4.000 de vuelto -> quedan $56.675) $60.675,
 * cuando es imposible que me haya dado $75 pesos en efectivo porque eso en
 * Argentina NO existe mas."*
 *
 * No se abre el modal por la pantalla: se le pone el estado y los inputs, que
 * es donde vive la cuenta. Lo que se mide es **cuanta plata queda en la mano**
 * contra **cuanta dice el ERP**, que es la pregunta que no cerraba contando.
 *
 * Ningun fetch sale de esta maquina y los datos son inventados: este repo es
 * publico.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'ruta.html';

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
    var url=(typeof u==='string')?u:((u&&u.url)||'');
    var post=!!(i&&String(i.method||'').toUpperCase()==='POST');
    var cuerpo=null;
    if(post){ try{ cuerpo=JSON.parse(i.body); }catch(e){ cuerpo=String(i.body||''); } }
    window.__fetches.push({url:url,post:post,body:cuerpo});
    return Promise.resolve({ok:true,status:200,
      json:function(){return Promise.resolve({ok:true});},
      text:function(){return Promise.resolve('{"ok":true}');}});
  };
})();
`;

/* Un cobro: se le pone el estado que arma `abrirCobroRuta` y los inputs que
   tipearia una persona, y se lee lo que decide el cuadro. */
const cobrar = (total, recEf, camEf, opts) => `(function(){
  var o=${JSON.stringify(opts || {})};
  window._cobroRutaState={key:'k1',combo:false,
    ent:{h:'Home',id:'999',r:2,c:'Prueba',fp:'Efectivo','$':${total}},
    total:${total},totalOriginal:${total},fp:'Efectivo',
    cambioOpen:true,aFavOpen:false,entregar:true,
    aceptaDescuento:!!o.aceptaDescuento};
  document.getElementById('cobroCambioSection').style.display='block';
  _setMoneyInput('cobroRecEf',${recEf});
  _setMoneyInput('cobroRecMP',0);
  /* El vuelto lo pone una PERSONA en estos casos, asi que se marca tocado:
     desde el 28/9/2026 el ERP sugiere uno y solo pisa el que puso el. */
  try{ _camTocado=true; }catch(e){}
  _setMoneyInput('cobroCamEf',${camEf});
  _setMoneyInput('cobroCamMP',0);
  _setMoneyInput('cobroAFavInp',0);
  if(o.propina!==undefined){
    document.getElementById('cobroPropinaSection').style.display='block';
    _setMoneyInput('cobroPropinaInp',o.propina);
  }
  var r=_recalcCobroRuta();
  return {
    propina:r.propina, neto:r.neto, errores:r.errors.length,
    /* Lo que se ESCRIBE: el backend pone Total a cobrar en la col Efectivo y la
       propina en su columna aparte (confirmarCobroRuta: ef=total, propina). */
    colEfectivo:${total}, colPropina:Math.max(0,r.propina),
    vuelto:${camEf},
    /* Lo que el cuadro le muestra a la persona. */
    etiqueta:(document.getElementById('cobroSumPropLbl')||{}).textContent||'',
    valor:(document.getElementById('cobroSumProp')||{}).textContent||'',
    boton:(document.getElementById('btnCobroRutaOk')||{}).textContent||''
  };
})()`;

/* El flujo de VERDAD: se abre el cuadro, se toca "Devolvi cambio" y se tipea
   el billete como lo haria una persona. El helper de arriba setea los inputs a
   mano —que es como los deja el ERP al precargarlos— y este pasa por los
   manejadores, que es donde vive el arreglo. */
const conElBoton = (total, billete) => `(function(){
  window._cobroRutaState={key:'k1',combo:false,
    ent:{h:'Home',id:'999',r:2,c:'Prueba',fp:'Efectivo','$':${total}},
    total:${total},totalOriginal:${total},fp:'Efectivo',
    cambioOpen:false,aFavOpen:false,entregar:true,aceptaDescuento:false};
  _resetCobroSeccionesColapsables();
  document.getElementById('cobroCambioSection').style.display='none';
  document.getElementById('cobroPropinaSection').style.display='none';
  document.getElementById('cobroAFavSection').style.display='none';
  // Como lo deja abrirCobroRuta: el recibido precargado con el total.
  _setMoneyInput('cobroRecEf',${total});
  _setMoneyInput('cobroRecMP',0);
  _recalcCobroRuta();
  // 1) Tocar "Devolvi cambio".
  _toggleCobroSec('cobroCambioSection',document.getElementById('cobroToggleCambio'));
  if(typeof _camTocado==='undefined')window._camTocado=false;
  var vacioAlAbrir=String(document.getElementById('cobroRecEf').value||'')==='';
  // 2) Tipear el billete, como el oninput del campo.
  var inp=document.getElementById('cobroRecEf');
  inp.value=String(${billete});
  /* Contra un ruta.html anterior al 28/9/2026 estas funciones no existen. Se
     tolera a proposito: sin esto el ReferenceError corta la corrida entera y
     esconde los rojos que la contraprueba viene a mostrar. */
  _fmtMoneyInput(inp); if(typeof _cobroRecTocado==='function')_cobroRecTocado();
  var r=_recalcCobroRuta();
  return {
    vacioAlAbrir:vacioAlAbrir,
    vuelto:_parseMoneyInput(document.getElementById('cobroCamEf')),
    neto:r.neto, propina:r.propina, errores:r.errors.length,
    etiqueta:(document.getElementById('cobroSumPropLbl')||{}).textContent||'',
    pista:(document.getElementById('cobroRecHint')||{}).textContent||''
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

    console.log('\n== El vuelto, el redondeo y la plata que queda en la mano ==\n');

    /* ── 1. EL CASO DE TADEO (28/9/2026) ────────────────────────────────
       Pedido $26.025, el cliente da $30.000, Tadeo devuelve $3.000. En la
       mano le quedan $27.000. */
    let A = await evaluar(cli, cobrar(26025, 30000, 3000));
    /* Sin decir a donde van los $975 que sobran, el cuadro FRENA. Eso esta
       bien: plata sin destino es justo lo que no se puede dejar pasar. El
       problema es que los unicos destinos son "propina" y "a favor", y esto
       no fue ninguno de los dos — fue que no habia cambio. */
    chk('sin destino para lo que sobra, el cuadro frena', A.errores > 0, A);
    chk('y lo llama "Sobra", que no dice que hacer', /Sobra/.test(A.etiqueta), A);
    A = await evaluar(cli, cobrar(26025, 30000, 3000, { propina: 975 }));
    chk('marcandolo como propina, recien ahi cierra', A.errores === 0, A);
    chk('la plata que queda en la mano es la de verdad: 30.000 - 3.000 = 27.000',
        A.neto === 27000, A);
    /* Y aca esta el nudo. */
    chk('PERO los $975 que sobran se guardan como PROPINA', A.colPropina === 975, A);
    chk('y el cuadro se los muestra a Tadeo como propina, no como redondeo',
        /Propina|Sobra/.test(A.etiqueta), A);

    /* ── 2. EL CASO DE VICTORIA, COMO PASO DE VERDAD ────────────────────
       Pedido $56.675. Un cliente paga con billetes: $60.000. Tadeo devuelve
       $4.000 y se queda con $56.000, o sea $675 MENOS que el pedido: ese es
       el redondeo que el recuerda como "le hice un descuento". */
    let B = await evaluar(cli, cobrar(56675, 60000, 4000));
    chk('con billetes de verdad (60.000) y 4.000 de vuelto, el cuadro FRENA',
        B.errores > 0, B);
    chk('y avisa que falta, en vez de dejarlo pasar', /Falta/.test(B.etiqueta), B);
    chk('lo que falta son los $675 del redondeo', B.neto === 56000, B);

    /* ── 3. LO QUE QUEDO REGISTRADO ─────────────────────────────────────
       En la planilla, el pedido #1032 tiene Total $56.675, Efectivo $56.675,
       Descuento $0 y Propina $0, con un vuelto de $4.000. La UNICA forma de
       llegar a eso por este cuadro es haber tipeado $60.675 recibidos — un
       numero que no existe en billetes. */
    let C = await evaluar(cli, cobrar(56675, 60675, 4000));
    chk('tipeando $60.675 el cuadro cierra justo y no dice nada',
        C.errores === 0 && C.propina === 0 && /Cierra justo/.test(C.etiqueta), C);
    chk('y esos $60.675 son los que la tab Caja despues muestra como recibidos',
        C.colEfectivo + C.vuelto === 60675, C);

    /* ── 4. EL CAMINO QUE SI REGISTRA LA VERDAD ─────────────────────────
       "Aceptar descuento" con los $60.000 reales: el faltante se anota como
       descuento en vez de desaparecer. */
    let D = await evaluar(cli, cobrar(56675, 60000, 4000, { aceptaDescuento: true }));
    chk('aceptando el descuento, el cobro se puede cerrar con los 60.000 reales',
        D.errores === 0, D);
    chk('y el faltante queda ANOTADO como descuento aceptado',
        /Descuento aceptado/.test(D.etiqueta), D);

    /* ── 5. EL ARREGLO (28/9/2026) ──────────────────────────────────────
       El vuelto se calcula desde el billete. Mientras "¿Cuanto recibiste?"
       venia precargado con el total, la unica forma de apagar el cartel rojo
       era subirlo hasta total + vuelto — el numero imposible. */
    let E = await evaluar(cli, conElBoton(56675, 60000));
    chk('al tocar "Devolvi cambio", el recibido se vacia y pide el billete',
        E.vacioAlAbrir === true, E);
    chk('y el campo dice que espera el billete', /billete/.test(E.pista), E);
    chk('tipeando los $60.000 de verdad, el ERP calcula el vuelto solo',
        E.vuelto === 3300, E);
    chk('en billetes que existen: $3.300, no $3.325', E.vuelto % 100 === 0, E);
    chk('y los $25 que no se pueden dar quedan como sobrante, con destino a elegir',
        E.propina === 25 && E.errores > 0, E);

    /* El caso de Tadeo por el mismo camino: $30.000 sobre $26.025. */
    let F = await evaluar(cli, conElBoton(26025, 30000));
    chk('con el pedido de hoy, el vuelto sale $3.900 (26.025 + 3.900 = 29.925)',
        F.vuelto === 3900, F);
    chk('la plata que queda en la mano son $26.100, no $27.000',
        F.neto === 26100, F);

    /* Y lo que tipea una persona no se pisa nunca. */
    let G = await evaluar(cli, `(function(){
      var r=${JSON.stringify('')};
      _camTocado=true;
      _setMoneyInput('cobroCamEf',4000);
      var rr=_recalcCobroRuta();
      return {vuelto:_parseMoneyInput(document.getElementById('cobroCamEf')),neto:rr.neto};
    })()`);
    chk('el vuelto que pone una persona a mano manda sobre el sugerido',
        G.vuelto === 4000, G);

    console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.log('  revento la prueba: ' + (e && e.stack || e));
    salir(1);
  }
})();
