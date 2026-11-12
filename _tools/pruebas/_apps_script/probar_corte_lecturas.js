/* El reloj de una lectura trabada: ¿cuánto espera antes de cortar y repetir?

     node probar_corte_lecturas.js
     APP=app_viejo_tmp.html node probar_corte_lecturas.js   ← la contraria

   Tadeo, 18/9/2026 de madrugada: *"toco el botón de arriba y no se me actualiza
   la tab… me dice que el servidor no puede"*.

   Medido esa noche en el navegador contra producción: con la foto hecha una
   lectura vuelve en 2,8-5 s, pero la PRIMERA después de una escritura tarda
   **~40 s** (se rehace el volcado). El corte estaba en 20 s: mataba justo el
   cálculo que iba a terminar, y cada corte arranca otra ejecución. Se vio la
   misma lectura cortada cinco veces antes de traer los datos.

   Sostiene:
   · una respuesta de 30 s (un recálculo normal) YA NO se corta: llega entera
     en el primer intento, sin reintentos;
   · una que no vuelve nunca sí se corta, y el pedido termina —no queda colgado;
   · los reintentos siguen siendo cortos (el servidor ya terminó de calcular);
   · un POST nunca se corta por acá (repetir una escritura no es gratis).

   El backend va STUBBEADO y respeta el AbortSignal: sin eso el corte no se
   puede medir, porque el pedido seguiría vivo después del abort. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 300) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};

/* El stub: `demora` dice cuánto tarda en contestar cada accion. `null` = no
   contesta nunca (pero se rinde al abort). Cuenta los intentos por accion. */
const EXTRA = `
  (function(){
    window.__intentos={}; window.__abortos=0;
    /* Arranca todo rapido: las demoras se ponen desde el test, ya cargada la
       app. Y se usan acciones DE VERDAD (cajaLight, pedidosLight): el corte
       solo se aplica a las lecturas de la lista _CORTABLE, asi que con una
       accion inventada el test medía un camino sin reloj y daba 1 intento. */
    window.__demora={};
    var o = window.fetch;
    window.fetch = function(u, x){
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
      var esPost = !!(x && String(x.method||'').toUpperCase()==='POST');
      /* En un POST la accion va en el CUERPO, no en la URL: buscarla en la URL
         daba '?' siempre y el test miraba una clave que no existia. */
      var a = '?';
      if (esPost) { try{ a = (JSON.parse(x.body)||{}).action || '?'; }catch(e){} }
      else { var m = url.match(/[?&]action=([a-zA-Z_]+)/); a = m ? m[1] : '?'; }
      var clave = (esPost?'POST:':'')+a;
      window.__intentos[clave]=(window.__intentos[clave]||0)+1;
      /* Todo lo que el ERP pide al arrancar contesta YA. Si no, se queda colgado
         en la fila (2 cupos) y lo que mide el test es esa espera, no el corte:
         la primera version dio 208 s para una respuesta de 30. */
      var ms = (a in window.__demora) ? window.__demora[a] : 250;
      return new Promise(function(res, rej){
        var reloj = (ms===null||ms===undefined) ? null : setTimeout(function(){
          res(new Response(JSON.stringify({ok:true, a:a, ts:1, pedidos:[], canales:[], movimientos:[]}),
              {status:200, headers:{'Content-Type':'application/json'}}));
        }, ms);
        if (x && x.signal) x.signal.addEventListener('abort', function(){
          window.__abortos++; if(reloj)clearTimeout(reloj);
          rej(new DOMException('abortado','AbortError'));
        });
      });
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== El reloj de una lectura trabada · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    if (!await esperar(cli, `typeof API!=='undefined'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(1500);

    /* 1) Un recalculo normal (30 s) tiene que llegar entero, sin reintentos. */
    await evaluar(cli, `window.__intentos={}; window.__demora={cajaLight:30000}; 1`);
    const lenta = await evaluar(cli, `(async()=>{ const t=Date.now();
      try{ const r=await fetch(API+'?action=cajaLight&zz=1'); await r.text(); return {ms:Date.now()-t, ok:true}; }
      catch(e){ return {ms:Date.now()-t, err:String(e.name||e)}; } })()`, 200000);
    const nLenta = await evaluar(cli, `window.__intentos['cajaLight']||0`);
    chk('un recalculo de 30 s llega entero (antes se cortaba a los 20)', lenta.ok === true, lenta);
    chk('y en UN solo intento: no arranca otra ejecucion', nLenta === 1, { intentos: nLenta });
    chk('tardo lo que tarda el servidor, no mas', lenta.ms >= 29000 && lenta.ms < 40000, lenta);

    /* 2) Una que no vuelve nunca: se corta y el pedido TERMINA. */
    await evaluar(cli, `window.__intentos={}; window.__abortos=0; window.__demora={pedidosLight:null}; 1`);
    const t0 = Date.now();
    const nunca = await evaluar(cli, `(async()=>{ const t=Date.now();
      try{ const r=await fetch(API+'?action=pedidosLight&zz=2'); await r.text(); return {ms:Date.now()-t, ok:true}; }
      catch(e){ return {ms:Date.now()-t, err:String(e.message||e.name||e)}; } })()`, 300000);
    const nNunca = await evaluar(cli, `window.__intentos['pedidosLight']||0`);
    const tardo = (Date.now() - t0) / 1000;
    chk('una lectura que no vuelve NO queda colgada: termina', !!nunca.err, nunca);
    chk('y termina en menos de 2 minutos', tardo < 125, { tardo });
    chk('lo intento 3 veces (45 + 20 + 25) y no mas', nNunca === 3, { intentos: nNunca });

    /* 3) Un POST no se corta nunca por acá. */
    await evaluar(cli, `window.__intentos={}; window.__demora={gasto:null}; 1`);
    await evaluar(cli, `fetch(API,{method:'POST',body:JSON.stringify({action:'gasto'})}).catch(function(){}); 1`);
    await pausa(8000);
    const nPost = await evaluar(cli, `window.__intentos['POST:gasto']||0`);
    chk('un POST no se repite por el corte de lecturas', nPost === 1, { intentos: nPost });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
