/* Después de escribir, el panel se adelanta y deja hecha la lectura pesada.

     node probar_precalentar.js
     APP=app_viejo_tmp.html node probar_precalentar.js   ← la contraria

   Medido contra producción el 19 y el 20/9/2026: toda escritura deja frías las
   lecturas, y la primera que entra paga el recálculo entero (`admin` 28-33 s).
   El calentador del backend lo rehace, pero llega ~2 minutos tarde: si Tadeo
   cobra y toca ↻ enseguida, lo paga él.

   Sostiene:
   · tras un POST que salió bien, sale UNA lectura sola, por atrás;
   · y es la de la pantalla abierta (Stock pide `admin`, Caja pide `cajaLight`);
   · si el POST falló, no se precalienta nada;
   · una ráfaga de POSTs precalienta UNA vez, no una por escritura;
   · el ↻ que llega mientras está en vuelo se ENGANCHA al mismo pedido en vez
     de arrancar otra ejecución — que es lo que lo hace valer la pena. */
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
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};

/* Backend simulado: anota cada GET por accion y deja controlar la demora.
   Los POST contestan {ok:true} salvo que se pida lo contrario. */
const EXTRA = `
  (function(){
    window.__gets=[]; window.__posts=[]; window.__demoraGet=0; window.__postOk=true;
    var o=window.fetch;
    window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      var esPost=!!(x&&String(x.method||'').toUpperCase()==='POST');
      if(esPost){
        var a='?'; try{ a=(JSON.parse(x.body)||{}).action||'?'; }catch(e){}
        window.__posts.push(a);
        return Promise.resolve(new Response(JSON.stringify({ok:window.__postOk}),
          {status:200,headers:{'Content-Type':'application/json'}}));
      }
      var m=url.match(/[?&]action=([a-zA-Z_]+)/); var ac=m?m[1]:'?';
      window.__gets.push({a:ac,t:Date.now()});
      var ms=window.__demoraGet||0;
      return new Promise(function(res){
        setTimeout(function(){
          res(new Response(JSON.stringify({ok:true,a:ac,ts:1,pedidos:[],canales:[],stock:[],movimientos:[]}),
            {status:200,headers:{'Content-Type':'application/json'}}));
        },ms);
      });
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const limpiar = () => evaluar(cli, `window.__gets=[]; window.__posts=[]; 1`);
  /* `ver` se filtra: es el vigía, que pregunta la versión cada 40 s haya o no
     escrituras. Contarlo hacía que una ráfaga "disparara" un precalentamiento
     que nunca existió. */
  const gets = () => evaluar(cli, `window.__gets.map(function(g){return g.a;}).filter(function(a){return a!=='ver';})`);
  /* Un POST cualquiera, por el camino real del interceptor. */
  const escribir = (accion) => evaluar(cli,
    `fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
       body:JSON.stringify({action:'${accion || 'gasto'}'})}).then(function(r){return r.json();}).catch(function(){}); 1`);

  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Precalentar despues de escribir · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    if (!await esperar(cli, `typeof go==='function'&&typeof API!=='undefined'`, 60000)) {
      console.log('  el ERP no arranco'); salir(1);
    }
    await pausa(1500);

    /* ── 1. Parado en STOCK, un POST deja pedido `admin` ──────────────── */
    await evaluar(cli, `try{go('stock')}catch(e){}; 1`);
    await pausa(1200);
    await evaluar(cli, `window.__prewarmUltReset=1; 1`);
    await limpiar();
    await escribir('gasto');
    await pausa(3000);
    const g1 = await gets();
    chk('tras escribir sale UNA sola lectura por atras', g1.length === 1, g1);
    chk('   y en Stock es `admin` (el volcado, la que duele)', g1[0] === 'admin', g1);

    /* ── 2. Una rafaga precalienta UNA vez ────────────────────────────── */
    await limpiar();
    await escribir('gasto'); await pausa(300);
    await escribir('gasto'); await pausa(300);
    await escribir('gasto');
    await pausa(3000);
    const g2 = await gets();
    chk('una rafaga de 3 POSTs no dispara 3 precalentamientos', g2.length === 0, g2);

    /* ── 3. Si el POST fallo, no se precalienta ───────────────────────── */
    await evaluar(cli, `window.__postOk=false; 1`);
    await pausa(21000);                                  /* que pase el freno de 20 s */
    await limpiar();
    await escribir('gasto');
    await pausa(3000);
    const g3 = await gets();
    chk('si la escritura fallo, no se precalienta nada', g3.length === 0, g3);
    await evaluar(cli, `window.__postOk=true; 1`);

    /* ── 4. En CAJA precalienta `cajaLight`, no el volcado ────────────── */
    /* Hay que dejar pasar el freno de 20 s del caso anterior: sin esto el test
       medía el freno y no la elección de lectura. */
    await pausa(21000);
    await evaluar(cli, `try{go('caja')}catch(e){}; 1`);
    await pausa(1500);
    await limpiar();
    await escribir('gasto');
    await pausa(3000);
    const g4 = await gets();
    chk('en Caja precalienta `cajaLight`, no el volcado', g4.length === 1 && g4[0] === 'cajaLight', g4);

    /* ── 5. LO QUE LO HACE VALER: el ↻ se engancha al precalentamiento ── */
    await pausa(21000);
    await evaluar(cli, `try{go('stock')}catch(e){}; 1`);
    await pausa(1200);
    await evaluar(cli, `window.__demoraGet=10000; 1`);   /* un recalculo lento */
    await limpiar();
    await escribir('gasto');
    await pausa(4000);                                    /* el precalentamiento ya salio */
    const enVuelo = await gets();
    const t0 = Date.now();
    const r5 = await evaluar(cli, `(async()=>{ const t=Date.now();
      try{ const r=await fetch(API+'?action=admin'); await r.text(); return {ms:Date.now()-t,ok:true}; }
      catch(e){ return {ms:Date.now()-t,err:String(e&&e.message||e)}; } })()`, 60000);
    const g5 = await gets();
    chk('el precalentamiento ya estaba en vuelo', enVuelo.length === 1 && enVuelo[0] === 'admin', enVuelo);
    chk('el ↻ NO arranca otra ejecucion: sigue habiendo 1 sola', g5.length === 1, g5);
    /* Arrancó 1,2 s después del POST y el ↻ llegó a los 4 s: le quedaban ~7,2 s
       de los 10. Sin engancharse serían 10 s NUEVOS, y una segunda ejecución en
       un servidor que atiende de a una. El margen es generoso a propósito: lo
       que se prueba es que esperó MENOS que un cálculo entero, no un número
       exacto que depende del reloj de la máquina. */
    chk('   y vuelve esperando solo lo que faltaba, no un calculo entero',
        r5.ok === true && r5.ms < 8500, r5);

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
