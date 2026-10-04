/* EL AUTOPEDIDO NO SE PUEDE COLGAR PARA SIEMPRE (28/9/2026).

     node probar_autopedido_reloj.js

   Tadeo cargo el autopedido de Tobias Ambrosiano con dos piezas de carne y el
   loader se quedo girando. El pedido no entro: no aparece en Home, ni en Pilar,
   ni en Red, ni en `Log Pedidos`, ni en `Log Errores`.

   La causa no fue el pedido sino el momento: se habian publicado TRES versiones
   del backend en media hora (@726, @727, @728), y cada publicacion obliga a
   Apps Script a arrancar de cero. Pero que el backend tarde es normal y pasa
   solo; lo que no es normal es que `npGuardar` mandara el POST con un `fetch`
   SIN `signal`, o sea sin forma de cortarlo. Un loader mudo a los 40 segundos
   es indistinguible de uno colgado, y lo unico que se puede hacer con el es
   cerrar la app — que es perder el pedido.

   Lo que tiene que ser cierto:
   · el POST viaja con `signal`, o sea que se puede cortar;
   · a los 6 s el loader DICE que sigue vivo, en vez de quedarse mudo;
   · el pedido viaja con `clientOrderId`, que es lo que hace seguro reintentar;
   · ese id SOBREVIVE al corte —si cambiara, el reintento seria un pedido nuevo—
     y se limpia cuando el pedido entra de verdad;
   · y al fallar, el mensaje dice que se puede reintentar sin duplicar.

   Se prueba con el backend COLGADO a proposito: un fetch que no resuelve nunca.
   Es exactamente lo que vio Tadeo. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
/* Se prueba contra ruta.html AISLADA (?standalone=1), no contra el app.html
   fusionado, y no es por comodidad: al fusionar, las variables de la sub-app
   quedan dentro de su modulo. Solo las FUNCIONES se publican en window para
   que los onclick las encuentren. O sea que desde CDP se puede llamar a
   npGuardar pero no se puede armarle el carrito: asignar npCart crea otra
   variable y la de adentro sigue vacia — el primer intento de esta prueba
   moria con 'Agrega al menos un producto' y parecia un bug del ERP.
   El codigo que corre es el mismo: el build no reescribe nada desde el
   26/8/2026. */
const APP = process.env.APP || 'ruta.html?standalone=1&';
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

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + 'prueba=1' });
    await esperar(cli, `typeof npGuardar==='function'`, 60000);
    await pausa(400);

    console.log('\n== El autopedido con el backend colgado ==\n');

    chk('npGuardar existe y npCoid arranca vacío',
      await evaluar(cli, `typeof npGuardar==='function' && typeof npCoid!=='undefined' && npCoid===''`),
      { npCoid: await evaluar(cli, `typeof npCoid`) });

    /* ── El backend que no contesta nunca ──
       Se captura lo que npGuardar le pasa al fetch, y se devuelve una promesa
       que solo se resuelve si alguien la aborta. */
    await evaluar(cli, `(function(){
      window.__cap=[];
      window.__fetchReal=window.fetch;
      window.fetch=function(u,o){
        if(String(u).indexOf('script.google')<0)return window.__fetchReal.apply(this,arguments);
        window.__cap.push({url:String(u),tieneSignal:!!(o&&o.signal),body:(o&&o.body)||''});
        return new Promise(function(_,rej){
          if(o&&o.signal)o.signal.addEventListener('abort',function(){
            var e=new Error('abortado');e.name='AbortError';rej(e);
          });
        });
      };
      /* npGuardar pregunta hasta tres veces antes de guardar (precios sin
         confirmar, stock excedido, origen). No son lo que se mide aca, y el
         que contesta es servir.js: tiene su propio confirm con una palanca,
         y un override propio pierde contra el suyo. Sin esto vuelve false,
         npGuardar sale por un return mudo y el POST no se manda nunca — que
         es como esta prueba fallo la primera vez.
         (Y el comentario va SIN acentos graves a proposito: esta adentro de
         un template literal, y un acento grave lo cierra.) */
      window.__confirmDevuelve=true;
      /* Desde el 4/10/2026, antes de decir "no se pudo" npGuardar le pregunta
         al backend si el pedido entro, durante 75 s. Aca se achica: lo que se
         mide es el mensaje del final, no la espera. */
      try{ NP_ENTRO_MS=1500; NP_ENTRO_CADA=300; }catch(e){}
      return 1;
    })()`);

    /* ── Estado mínimo para que npGuardar llegue al POST ── */
    const listo = await evaluar(cli, `(function(){
      try{
        var n=document.getElementById('npNombre'); if(!n)return 'sin npNombre';
        n.value='Tobias Ambrosiano (prueba)';
        npZona='Home'; npPago='Efectivo';
        npCart={}; var k=Object.keys(NP_PRECIOS||{})[0];
        if(k===undefined){ npCart[1]=2; } else { npCart[k]=2; }
        npFechaSel=new Date(Date.now()+86400000).toISOString().slice(0,10);
        var b=document.getElementById('npBarrioPrivado'); if(b)b.value='Estancias del Pilar';
        var sb=document.getElementById('npSubBarrio'); if(sb)sb.value='Prueba';
        var lo=document.getElementById('npLote'); if(lo)lo.value='1';
        return 'ok';
      }catch(e){return String(e&&e.message);}
    })()`);
    chk('se pudo armar un pedido de prueba', listo === 'ok', { listo });

    await evaluar(cli, `try{npGuardar();}catch(e){window.__errNp=String(e&&e.message);} 1`);
    await pausa(700);

    const cap = await evaluar(cli, `(window.__cap||[]).length?window.__cap[0]:null`);
    chk('el POST salió', !!cap, { cap, err: await evaluar(cli, `window.__errNp||''`) });
    chk('   y viaja con signal: se PUEDE cortar', !!(cap && cap.tieneSignal), cap);

    let coid = null;
    if (cap && cap.body) {
      try { coid = JSON.parse(cap.body).clientOrderId || null; } catch (e) {}
    }
    chk('   y con clientOrderId, que es lo que hace seguro reintentar', !!coid, { coid });

    /* ── A los 6 s el loader tiene que hablar ── */
    const msg0 = await evaluar(cli, `(document.getElementById('rutLoaderMsg')||{}).textContent||''`);
    chk('al principio dice "Guardando pedido..."', /Guardando pedido/i.test(msg0), { msg0 });
    await pausa(6200);
    const msg1 = await evaluar(cli, `(document.getElementById('rutLoaderMsg')||{}).textContent||''`);
    chk('a los 6 s deja de estar mudo y explica la demora',
      msg1 !== msg0 && /tarda|despertar|Sigue/i.test(msg1), { msg0, msg1 });

    /* ── EL REINTENTO, QUE ES EL PUNTO ──
       No se puede abortar la señal desde afuera (solo la tiene el
       AbortController que vive dentro de npGuardar), asi que el corte se
       reproduce con un backend que rechaza con AbortError — que es
       exactamente lo que ve el `.catch`. */
    await evaluar(cli, `(function(){
      /* El toast NO se puede interceptar: showToast es una funcion suelta de
         ruta.html, no window.showToast. Se lee del DOM, que ademas es lo que
         ve Tadeo. */
      window.fetch=function(u,o){
        if(String(u).indexOf('script.google')<0)return window.__fetchReal.apply(this,arguments);
        window.__cap.push({url:String(u),tieneSignal:!!(o&&o.signal),body:(o&&o.body)||''});
        var e=new Error('abortado'); e.name='AbortError';
        return Promise.reject(e);
      };
      return 1;
    })()`);

    await evaluar(cli, `try{npSaving=false;npGuardar();}catch(e){} 1`);
    await esperar(cli, `/no se duplica/i.test((document.getElementById('rutToast')||{}).textContent||'')`, 6000);

    const toast = await evaluar(cli, `(document.getElementById('rutToast')||{}).textContent||''`);
    chk('al cortarse, el mensaje dice que se puede reintentar sin duplicar',
      /no se duplica/i.test(toast), { toast });
    chk('   y nombra la causa, no un "error" generico', /90s|servidor/i.test(toast), { toast });

    /* El ultimo POST con cuerpo: las preguntas "¿entro?" son GET sin cuerpo. */
    const cap2 = await evaluar(cli, `(function(){for(var i=window.__cap.length-1;i>=0;i--)if(window.__cap[i].body)return window.__cap[i];return null})()`);
    let coid2 = null;
    if (cap2 && cap2.body) { try { coid2 = JSON.parse(cap2.body).clientOrderId || null; } catch (e) {} }
    chk('EL REINTENTO MANDA EL MISMO id: no crea un pedido gemelo',
      !!coid2 && coid2 === coid, { primero: coid, reintento: coid2 });

    chk('el loader quedo cerrado, no girando', await evaluar(cli,
      `!((document.getElementById('rutLoaderOverlay')||{}).classList||{contains:function(){return false}}).contains('visible')`));
    chk('y el boton volvio a estar usable', await evaluar(cli,
      `!(document.getElementById('npGuardar')||{}).disabled`));

    /* ── Y cuando por fin entra, el id se limpia ──
       Si no se limpiara, el pedido SIGUIENTE viajaria con el id del anterior y
       el backend lo descartaria como repetido: se perderia un pedido real. */
    await evaluar(cli, `(function(){
      window.fetch=function(u,o){
        if(String(u).indexOf('script.google')<0)return window.__fetchReal.apply(this,arguments);
        window.__cap.push({url:String(u),tieneSignal:!!(o&&o.signal),body:(o&&o.body)||''});
        return Promise.resolve({json:function(){return Promise.resolve({ok:true,n:999});}});
      };
      return 1;
    })()`);
    await evaluar(cli, `try{npSaving=false;npGuardar();}catch(e){} 1`);
    await pausa(900);
    /* Con guarda: contra el ruta.html anterior npCoid no existe, y leerlo pelado
       tiraba un ReferenceError que cortaba la corrida entera. La contraria
       tiene que dar ROJOS, no reventar. */
    const coidFinal = await evaluar(cli,
      `(typeof npCoid==='undefined')?'(no existe)':npCoid`);
    chk('con el pedido guardado, el id se limpia para el proximo',
      coidFinal === '', { npCoid: coidFinal });

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
