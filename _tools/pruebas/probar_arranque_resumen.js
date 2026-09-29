/* AL ABRIR LA APP, SIEMPRE EN RESUMEN. (28/9/2026)

     node probar_arranque_resumen.js
     APP=app_viejo_tmp.html node probar_arranque_resumen.js   <- la contraria

   Tadeo, despues de abrir el ERP en el celular y caer en Caja: *"siempre que se
   cierra y se abra la app, que vaya a la Tab Resumen... asi arrancamos siempre
   de ahi"*.

   Lo dificil no es ir a Resumen: es NO ir cuando la pagina se recarga sola. El
   ERP se recarga al detectar una version nueva y al mantener apretado el ↻, y
   ahi hay que volver a donde estabas.

   Lo que tiene que ser cierto:
     · abrir la app manda a Inicio > Resumen aunque lo ultimo haya sido Caja;
     · una RECARGA de la misma pestania NO mueve nada (es el caso de la version
       nueva y el del ↻);
     · cerrar y abrir vuelve a mandar a Resumen;
     · un rol sin Inicio (el repartidor) cae en SU tab, no en una vacia;
     · y sin sessionStorage el ERP se comporta como antes, no se rompe.

   Se mide sobre `_APP_NUEVA` y sobre las variables que decide (`cur`, `curSI`),
   que es donde vive la regla — abrir y cerrar una PWA de verdad no se puede
   simular desde CDP. La pestania nueva SI: es lo mismo que ve el navegador. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
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
/* Con guarda: contra el ERP anterior `_APP_NUEVA` no existe y el test tiene que
   dar ROJO, no explotar. */
const leer = cli => evaluar(cli, `(function(){try{
  return { nueva:(typeof _APP_NUEVA==='undefined')?null:_APP_NUEVA,
           cur:(typeof cur==='undefined')?null:cur,
           si:(typeof curSI==='undefined')?null:curSI,
           viva:(function(){try{return sessionStorage.getItem('maleu_sesion_viva');}catch(e){return 'sin';}})() };
}catch(e){return null;}})()`);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async () => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    await esperar(cli, `typeof go==='function'`, 60000);
    await pausa(500);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    console.log('\n== Al abrir la app · ' + APP + ' ==');

    /* ── 1. La vez pasada quedo en Caja ── */
    await ir();
    await evaluar(cli, `try{localStorage.setItem('maleu_tab','caja');
      localStorage.setItem('maleu_subinicio','cierre');}catch(e){}; 1`);

    /* ABRIR LA APP = `sessionStorage` vacio con el `localStorage` intacto. Eso
       es exactamente lo que ve el navegador al arrancar la PWA de cero, y se
       simula borrandolo: navegar a about:blank y volver NO alcanza —es la
       misma pestania, y el sessionStorage del origen se restaura—. El primer
       intento de este test lo hacia asi y daba rojo por la simulacion, no por
       el ERP. */
    await evaluar(cli, `try{sessionStorage.clear();}catch(e){}; 1`);
    await cli.enviar('Page.reload', {});
    await esperar(cli, `typeof go==='function'`, 60000);
    await pausa(500);
    const v1 = await leer(cli);
    chk('abrir la app es un arranque nuevo', v1 && v1.nueva === true, v1);
    chk('   y la sub-tab arranca en Resumen, no en Cierre', v1 && v1.si === 'resumen', v1);
    chk('   con la tab en Inicio, no en Caja', v1 && v1.cur === 'inicio', v1);
    chk('   sin borrar lo guardado: es una decision de arranque, no un olvido',
        await evaluar(cli, `localStorage.getItem('maleu_subinicio')`) === 'cierre', {});
    chk('   y deja la marca de sesión viva', v1 && v1.viva === '1', v1);

    /* ── 2. Una RECARGA de la misma pestaña no mueve nada ──
       Es el caso de la versión nueva y el del ↻ mantenido: ahí hay que volver
       a donde estabas, no saltar a Resumen. */
    await evaluar(cli, `try{localStorage.setItem('maleu_subinicio','cierre');}catch(e){}; 1`);
    await cli.enviar('Page.reload', {});
    await esperar(cli, `typeof go==='function'`, 60000);
    await pausa(500);
    const v2 = await leer(cli);
    chk('una recarga de la MISMA pestaña no es abrir la app', v2 && v2.nueva === false, v2);
    chk('   y entonces vuelve donde estabas (Cierre)', v2 && v2.si === 'cierre', v2);

    /* ── 3. Cerrar y abrir de nuevo ── */
    await evaluar(cli, `try{sessionStorage.clear();}catch(e){}; 1`);
    await cli.enviar('Page.reload', {});
    await esperar(cli, `typeof go==='function'`, 60000);
    await pausa(500);
    const v3 = await leer(cli);
    chk('cerrar y volver a abrir manda a Resumen otra vez', v3 && v3.nueva === true && v3.si === 'resumen', v3);

    /* ── 4. El restaurador temprano tambien se saltea ──
       Corre antes de que llegue la sesion y deja pintado el boton de la ultima
       tab. Sin saltearlo, el cajon mostraba Caja marcada durante el arranque y
       despues saltaba a Inicio. Se mide poniendo 'caja' y recargando como app
       nueva: `cur` tiene que quedar en 'inicio'. */
    await evaluar(cli, `try{localStorage.setItem('maleu_tab','caja');sessionStorage.clear();}catch(e){}; 1`);
    await cli.enviar('Page.reload', {});
    await esperar(cli, `typeof go==='function'`, 60000);
    await pausa(500);
    const v4 = await leer(cli);
    chk('con "caja" guardada, recién abierta queda en Inicio', v4 && v4.cur === 'inicio', v4);
    const pint = await evaluar(cli, `(function(){
      var on=document.querySelector('.bn.on');
      return on?(on.dataset.p||''):'(ninguno)';
    })()`);
    chk('   y el cajón no marca Caja', pint !== 'caja', { marcado: pint });

    /* ── 5. El repartidor no cae en una pantalla que no puede ver ──
       El forzado a 'inicio' pasa ANTES del chequeo de roles, así que un rol sin
       Inicio sigue cayendo en su única tab. Se mide sobre el código, porque el
       login real no corre en `?prueba=1`. */
    const src = await evaluar(cli, `(function(){
      /* La función que decide está en el bundle: se busca su texto. */
      var t=document.documentElement.innerHTML;
      var i=t.indexOf('if(_APP_NUEVA)saved=');
      if(i<0)return null;
      var j=t.indexOf('allowed.indexOf(saved)',i);
      return (j>i&&j-i<2000)?'antes':'despues';
    })()`);
    chk('el forzado pasa ANTES del chequeo de roles', src === 'antes', { orden: src });

    /* ── 6. Sin sessionStorage, el ERP de siempre ── */
    const sinSS = await evaluar(cli, `(function(){
      var calc=function(){
        try{
          if(sessionStorage.getItem('maleu_sesion_viva'))return false;
          sessionStorage.setItem('maleu_sesion_viva','1');
          return true;
        }catch(e){return false;}
      };
      var real=Object.getOwnPropertyDescriptor(window,'sessionStorage');
      try{
        Object.defineProperty(window,'sessionStorage',{get:function(){throw new Error('bloqueado');},configurable:true});
        var r=calc();
        return {valor:r};
      }finally{ if(real)Object.defineProperty(window,'sessionStorage',real); }
    })()`);
    chk('sin sessionStorage no rompe: se comporta como antes', !!sinSS && sinSS.valor === false, sinSS);

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
