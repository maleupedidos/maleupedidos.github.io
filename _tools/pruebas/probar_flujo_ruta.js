/* RUTA > RUTA: el flujo de la parada, con el backend LENTO (12/9/2026).

   node probar_flujo_ruta.js <token> [390|1440]

   Mide lo que ningún otro instrumento mira: **cuánto tiempo cada acción de la
   card deja la pantalla TAPADA** con el loader de Ruta.

   El criterio es el del 3/9/2026 y vale para las cinco acciones por igual: la
   marca ya está en `localStorage` antes del POST, sobrevive a que se cierre la
   app, y los endpoints son idempotentes — así que tapar la pantalla hasta que
   conteste Apps Script (5-25 s) no protege de nada y es lo que hace sentir
   lento el flujo. Lo que avisa que falta sincronizar es el syncBanner.

   Entregado se arregló ese día. `confirmarCobroRuta`, `cambiarEstadoRuta` y
   `cancelarRuta` quedaron afuera: el comentario de `_armarGuardLoaderSync`
   dice *"desde que Entregado y Cobrado no lo ponen"* y el cobro SÍ lo ponía.
   (Lo que se arregló entonces fue `marcarCobrado`, que no la llama nadie.)

   Por qué el POST se demora a propósito: con un backend instantáneo las cinco
   acciones dan 0 ms de tapado y el test da verde con el bug adentro.

   Y exige que la acción quede en la COLA de `localStorage`, no que el POST ya
   haya salido: la cola procesa de a uno, así que con el primer fetch colgado el
   segundo espera su turno — y eso es correcto.

   Los datos son INVENTADOS: este repo es público. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const DEMORA = 8000;          // lo que tarda el POST stubbeado
const TOPE_TAPA = 1200;       // más que esto es "tapa la pantalla"
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};

const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOY = iso(hoyAR), HOYd = dmy(hoyAR), DIA = DIAS[hoyAR.getDay()];

/* Cinco paradas, todas 100% Orden de Compra para que entren a RUTA sin pasar
   por ARMADO, y cada una en su zona para que el orden por zona sea estable. */
const base = (o) => Object.assign({ oD: {}, oc: [], hr: '10:30', f: HOYd, de: DIA, fe: HOY, es: 'Pendiente',
  d: '', t: '1156000000', ep: 'No Cobrado', fp: 'Efectivo', o: 'Orden de Compra', b: 'Estancias del Pilar' }, o);
const ENTREGAS = [
  base({ id: 9201, h: 'Home', r: 9201, c: 'Flujo Entregar', sb: 'Champagnat Alto', l: '11', $: 12000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9202, h: 'Home', r: 9202, c: 'Flujo Cobrar', sb: 'Golf', l: '22', $: 25000, p: [{ a: 'PMu', q: 2 }] }),
  base({ id: 9203, h: 'Home', r: 9203, c: 'Flujo Reservar', sb: 'La Pionera', l: '33', $: 18000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9204, h: 'Home', r: 9204, c: 'Flujo Cancelar', sb: 'El Recuerdo', l: '44', $: 9000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9205, h: 'Home', r: 9205, c: 'Flujo Ultima', sb: 'Santa Elena', l: '55', $: 7000, p: [{ a: 'PMu', q: 1 }] })
];
const K = { entregar: 'Home|R9201', cobrar: 'Home|R9202', reservar: 'Home|R9203', cancelar: 'Home|R9204', ultima: 'Home|R9205' };

const EXTRA = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(x && String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      /* El POST tarda ${DEMORA} ms: con un backend instantaneo, un loader que
         tapa hasta que la cola se vacia no se distingue de uno que no tapa. */
      return new Promise(function(res){ setTimeout(function(){
        res(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));
      }, ${DEMORA}); });
    }
    if(url.indexOf('action=entregas')>-1){
      return Promise.resolve(new Response(JSON.stringify({ts:Date.now(), e:${JSON.stringify(ENTREGAS)}}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    if(url.indexOf('action=pendientesGuardarStock')>-1){
      return Promise.resolve(new Response(JSON.stringify({ok:true,items:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    return o.apply(this,arguments);};})();
  window.__confirmDevuelve=true;
  window.confirm=function(m){ return window.__confirmDevuelve; };
  /* Solo en la PRIMERA carga: el script inyectado corre en CADA navegacion, asi
     que sin la marca el reload borraba lo que se venia a comprobar y el test
     media su propia siembra. (Y ojo: un backtick aca cierra el template.) */
  try{ if(!sessionStorage.getItem('__rutTestSembrado')){
    localStorage.removeItem('maleu_ruta'); localStorage.removeItem('maleu_ruta_orden_modo');
    sessionStorage.setItem('__rutTestSembrado','1');
  } }catch(e){}
`;

/* El sampler del tapado: corre EN el navegador y anota el ultimo instante en que
   el overlay estaba visible. Asi "cuanto duro el tapado" no depende de cada
   cuanto pregunte el test desde afuera. */
const ARRANCAR = `(function(){
  window.__tapT0=Date.now(); window.__tapMax=0;
  if(window.__tapI)clearInterval(window.__tapI);
  window.__tapI=setInterval(function(){
    var el=document.getElementById('rutLoaderOverlay');
    if(el&&el.classList.contains('visible')) window.__tapMax=Date.now()-window.__tapT0;
  },40);
  return true;
})()`;
const LEER_TAPA = `(function(){ if(window.__tapI)clearInterval(window.__tapI); return window.__tapMax||0; })()`;
const COLA = `(function(){ try{ var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}');
  return (d.syncQueue||[]).map(function(x){return x.action+':'+(x.hoja||'')+'#'+(x.id||'');}); }catch(e){ return ['ERROR']; } })()`;

/* Mide una accion: arranca el sampler, la dispara, y lee la cola MIENTRAS el
   POST viaja — leerla despues da [] siempre, porque al volver el ok la accion
   sale de la cola y el test no distingue "se guardo" de "no se guardo nunca".
   Recien entonces espera a que el POST conteste y devuelve el tapado. */
async function medir(cli, disparar) {
  await evaluar(cli, ARRANCAR);
  await evaluar(cli, disparar);
  await pausa(900);
  const cola = await evaluar(cli, COLA);
  await pausa(DEMORA + 2000);
  return { tapa: await evaluar(cli, LEER_TAPA), cola: cola };
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== RUTA · el flujo de la parada con el backend a ' + (DEMORA / 1000) + ' s · ' + ANCHO + 'px ===');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  try {
    if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arrancó'); process.exit(1); }
    await evaluar(cli, 'go("ruta")');
    if (!await esperar(cli, '(function(){try{return getPendientes().length===' + ENTREGAS.length + '}catch(e){return false}})()', 60000)) {
      console.log('no llegaron las entregas stubbeadas'); process.exit(1);
    }
    await evaluar(cli, 'switchTab("ruta")');
    await pausa(900);
    const N0 = await evaluar(cli, 'getSorted().length');
    chk('arranca con las 5 paradas', N0 === 5, N0);

    // ── 1. Entregado: ya no tapa desde el 3/9/2026 (es el control del test) ──
    let r = await medir(cli, 'marcarEntregado(' + JSON.stringify(K.entregar) + ')');
    chk('ENTREGADO no tapa la pantalla', r.tapa <= TOPE_TAPA, r.tapa + ' ms');
    chk('  y queda en la cola de localStorage', r.cola.some(x => /marcarEntregado.*9201/.test(x)), r.cola);

    // ── 2. Cobrar desde la card ──
    await evaluar(cli, 'abrirCobroRuta(' + JSON.stringify(K.cobrar) + ')');
    await pausa(700);
    const abrio = await evaluar(cli, `!document.getElementById('cobroRutaOverlay').classList.contains('hidden')`);
    chk('el cuadro de cobro abre', abrio);
    const tot = await evaluar(cli, `document.getElementById('cobroRutaSub').textContent`);
    chk('  y dice el pedido y el monto', /\$/.test(tot), tot);
    r = await medir(cli, 'confirmarCobroRuta()');
    chk('COBRAR no tapa la pantalla', r.tapa <= TOPE_TAPA, r.tapa + ' ms');
    chk('  y queda en la cola de localStorage', r.cola.some(x => /marcarCobrado.*9202/.test(x)), r.cola);
    chk('  el cuadro se cerró', await evaluar(cli, `document.getElementById('cobroRutaOverlay').classList.contains('hidden')`));

    // ── 3. Reservar ──
    r = await medir(cli, 'cambiarEstadoRuta(' + JSON.stringify(K.reservar) + ',"Reservado")');
    chk('RESERVAR no tapa la pantalla', r.tapa <= TOPE_TAPA, r.tapa + ' ms');
    chk('  y queda en la cola de localStorage', r.cola.some(x => /cambiarEstadoEntrega.*9203/.test(x)), r.cola);

    // ── 4. Cancelar ──
    r = await medir(cli, 'cancelarRuta(' + JSON.stringify(K.cancelar) + ')');
    chk('CANCELAR no tapa la pantalla', r.tapa <= TOPE_TAPA, r.tapa + ' ms');
    chk('  y queda en la cola de localStorage', r.cola.some(x => /cancelarPedido.*9204/.test(x)), r.cola);

    // ── 5. El loader nunca queda pegado ──
    chk('el loader no quedó pegado al final', await evaluar(cli, `!document.getElementById('rutLoaderOverlay').classList.contains('visible')`));

    /* ── 6. Entregar la ÚLTIMA parada no te devuelve a la primera ──
       `rutRenderRuta` hacia `if(rutaIndex>=sorted.length)rutaIndex=0`: entregabas
       la ultima y la card saltaba al principio del recorrido, que en la calle se
       lee como que el ERP perdio el hilo. */
    const nAntes = await evaluar(cli, 'getSorted().length');
    await evaluar(cli, '(function(){while(!/Flujo Ultima/.test(document.getElementById("rutaBody").innerText))rutaNext();})()');
    await pausa(400);
    const barraAntes = await evaluar(cli, `document.getElementById('rutaHeader').innerText.replace(/\\s+/g,' ')`);
    chk('está parado en la última', new RegExp('Parada ' + nAntes + ' de ' + nAntes).test(barraAntes), { barraAntes, nAntes });
    await evaluar(cli, 'marcarEntregado(' + JSON.stringify(K.ultima) + ')');
    await pausa(900);
    const barraDesp = await evaluar(cli, `document.getElementById('rutaHeader').innerText.replace(/\\s+/g,' ')`);
    const nDesp = await evaluar(cli, 'getSorted().length');
    chk('al entregar la última, queda en la nueva última y no salta a la 1ª',
      new RegExp('Parada ' + nDesp + ' de ' + nDesp).test(barraDesp), { barraDesp, nDesp });

    /* ── 7. La vuelta atras: "Ya entregadas hoy" en el recorrido ──
       Un toque equivocado en la calle no tenia arreglo desde RUTA: la parada
       desaparece y habia que ir al panel > Pedidos > la ficha. */
    await evaluar(cli, 'rutaModoLista=false');           // por si quedo abierta
    await evaluar(cli, 'toggleRutaListaModo()');
    await pausa(600);
    const lista = () => evaluar(cli, `document.getElementById('rutaBody').innerText.replace(/\\s+/g,' ')`);
    let L = await lista();
    chk('el recorrido lista lo ya entregado', /Ya entregadas hoy/i.test(L), L.slice(0, 200));
    chk('  con el cliente, la zona y el monto',
      /Flujo Entregar/.test(L) && /Champagnat Alto/.test(L) && /\$12\.000/.test(L), L.slice(0, 300));
    chk('  y las 2 entregadas (Entregar y Ultima), no las canceladas ni las reservadas',
      /Ya entregadas hoy . 2/i.test(L) && !/Flujo Cancelar/.test(L), L.slice(0, 300));
    const tamDes = await evaluar(cli, `(function(){
      var b=[].slice.call(document.querySelectorAll('.rtc-hecha .rtc-mini'));
      return b.length?Math.min.apply(null,b.map(function(x){return Math.round(x.getBoundingClientRect().height);})):0; })()`);
    chk('  "No se entregó" llega al mínimo táctil', tamDes >= 38, tamDes);

    /* Sobrevive al refresh y a cerrar la app: `action=entregas` no devuelve los
       Entregado, asi que si esto viviera en `entregas` la lista se vaciaria. */
    await cli.enviar('Page.reload');
    if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('no recargó'); process.exit(1); }
    await evaluar(cli, 'go("ruta")');
    await esperar(cli, '(function(){try{return getPendientes().length>0}catch(e){return false}})()', 60000);
    await evaluar(cli, 'switchTab("ruta")');
    await pausa(900);
    await evaluar(cli, 'toggleRutaListaModo()');
    await pausa(600);
    L = await lista();
    chk('sobrevive a recargar la app', /Ya entregadas hoy . 2/i.test(L) && /Flujo Entregar/.test(L), L.slice(0, 220));

    // Deshacer: la parada vuelve al recorrido y sale el POST
    const nAntesD = await evaluar(cli, 'getSorted().length');
    const tocado = await evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('.rtc-hecha')).filter(function(f){return /Flujo Entregar/.test(f.innerText);})[0];
      if(!b) return 'no esta la fila de Flujo Entregar en Ya entregadas';
      b.querySelector('.rtc-mini').click(); return true; })()`);
    chk('la fila de "Flujo Entregar" está para deshacer', tocado === true, tocado);
    await pausa(1200);
    const nDespD = await evaluar(cli, 'getSorted().length');
    chk('deshacer devuelve la parada al recorrido', nDespD === nAntesD + 1, { nAntesD, nDespD });
    const colaD = await evaluar(cli, COLA);
    chk('  y encola deshacerEntrega del pedido', colaD.some(x => /deshacerEntrega.*9201/.test(x)), colaD);
    L = await lista();
    chk('  y sale de "Ya entregadas"', !/Flujo Entregar/.test(L.split('Ya entregadas')[1] || ''), L.slice(0, 220));
    const vuelta = await evaluar(cli, `(function(){ try{
      /* rutaModoLista vive en el IIFE: desde aca se lee la copia de window, que
         no se actualiza. Si estoy en la lista se sabe por el DOM. */
      if(document.querySelector('#rutaBody .rtc-filas')) toggleRutaListaModo();
      for(var i=0;i<40;i++){
        var t=document.getElementById('rutaBody').innerText;
        /* innerText devuelve el texto YA transformado por CSS: el rotulo lleva
           text-transform:uppercase y llega como LLEVAS. */
        if(/Flujo Entregar/.test(t)) return /llev/i.test(t) ? true : ('sin la lista de productos: '+t.slice(0,120));
        rutaNext();
      }
      return 'no la encontre en 40 vueltas';
    }catch(e){ return 'EXPLOTO: '+e.message; } })()`);
    chk('  la parada vuelve pintable sin reventar', vuelta === true, vuelta);

    chk('sin errores de JS', (await evaluar(cli, 'window.__err.concat(window.__errores)')).length === 0,
      await evaluar(cli, 'window.__err.concat(window.__errores)'));
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTÓ: ' + e.message); process.exit(1); });
