/* Stock > MOVER y RECIBIR CARNE, del lado de la pantalla (13/9/2026).

   node probar_mover_carne.js [390|1440]
   APP=app_viejo_tmp.html node probar_mover_carne.js 390    <- la direccion contraria

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). Sin token.
   Sostiene:
   · MOVER mueve con un BOTON (no al salir del campo), las unidades van enteras, dar
     vuelta el sentido borra lo tipeado, y la carne se mueve eligiendo PIEZAS;
   · un corte de red no deja un numero listo para moverse dos veces;
   · lo que se esta tipeando sobrevive a que lleguen los datos de ahora;
   · el ↻ en MOVER y RECIBIR CARNE pide lo que esas pantallas dibujan, no el volcado;
   · la carne pesada sin guardar no la borra el podador de copias ni un logout, cada
     pieza viaja con su uid, lo que se pesa mientras se guarda no se pierde, y lo que
     el backend rechaza se queda en la cola con su motivo;
   · las 4 sub-tabs entran en el celular. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
const CEL = ANCHO <= 560;
const PISO = CEL ? 38 : 26;

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
};

const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz', dueno: 'Persona A', col: 18 },
              { id: 'moresco', nombre: 'Deposito Moresco', dueno: 'Persona B', col: 19 }];
const PZ_CCO = [{ id: 'P-9001', kg: 1.1, d: 'ustariz', p: '' }, { id: 'P-9002', kg: 1.891, d: 'ustariz', p: 'Home #1' },
                { id: 'P-9003', kg: 2, d: 'ustariz', p: '' }];
const DEPOSITOS = { deps: DEPS, productos: [
  { a: 'PPM', n: 'Pack de prueba', u: 'u', f: 5, dep: 'ustariz', porDep: { ustariz: 5, moresco: 0 }, pz: 0, pzDep: { ustariz: 0, moresco: 0 }, pzs: [] },
  { a: 'PJyQ', n: 'Pizza de prueba', u: 'u', f: 4, dep: 'ustariz', porDep: { ustariz: 3, moresco: 1 }, pz: 0, pzDep: { ustariz: 0, moresco: 0 }, pzs: [] },
  { a: 'CCo', n: 'Carne Corte Uno', u: 'kg', f: 4.991, dep: 'moresco', porDep: { ustariz: 4.991, moresco: 0 }, pz: 3, pzDep: { ustariz: 3, moresco: 0 }, pzs: PZ_CCO },
  { a: 'CEn', n: 'Carne Corte Dos', u: 'kg', f: 2, dep: 'moresco', porDep: { ustariz: 2, moresco: 0 }, pz: 0, pzDep: { ustariz: 0, moresco: 0 }, pzs: [] },
] };
const CARNE = { ok: true, ts: 1, deps: DEPS,
  cortes: [{ a: 'CCo', n: 'Carne Corte Uno', dep: 'moresco' }, { a: 'CEn', n: 'Carne Corte Dos', dep: 'moresco' }, { a: 'CLo', n: 'Carne Corte Tres', dep: 'moresco' }],
  porCorte: { CCo: { abbr: 'CCo', nombre: 'Carne Corte Uno', piezas: [
    { id: 'P-9001', abbr: 'CCo', peso: 1.1, estado: 'Disponible', dep: 'ustariz' },
    { id: 'P-9002', abbr: 'CCo', peso: 1.891, estado: 'Asignada', dep: 'ustariz', pedido: 'Home #1' },
    { id: 'P-9003', abbr: 'CCo', peso: 2, estado: 'Disponible', dep: 'ustariz' }] } },
  difer: [] };
const ADMIN = { ts: Date.now(), pedidos: [], canales: [], totales: {}, oc: { lista: [] }, caja: { cuentas: [] }, stock: [],
  stockDeps: DEPS };

const EXTRA = `
  (function(){
    window.__listo=1;
    /* Lo que en localhost pone _tools/servir.js con ?prueba=1: contra el ERP
       publicado (BASE=https://app.maleu.com.ar) hace falta ponerlo aca. */
    window.__maleuAuth=true;
    if(!window.__confirms){ window.__confirms=[]; window.__confirmDevuelve=false;
      window.confirm=function(m){ window.__confirms.push(String(m)); return !!window.__confirmDevuelve; }; }
    try{
      localStorage.setItem('maleu_tab','stock');
      var sembrar=location.search.indexOf('sembrar=1')>-1;
      if(!sessionStorage.getItem('__semb')){
        Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0||k.indexOf('maleu_carne')===0) localStorage.removeItem(k); });
        if(sembrar){
          /* una cola pesada con la clave VIEJA: se tiene que mudar, no perder */
          localStorage.setItem('mc_carneCola', JSON.stringify([{abbr:'CCo',peso:1.234},{abbr:'CEn',peso:0.5}]));
          localStorage.setItem('mc_carneProv', 'Proveedor viejo');
        }
        sessionStorage.setItem('__semb','1');
      }
    }catch(e){}
    var DEPOSITOS=${JSON.stringify(DEPOSITOS)}, CARNE=${JSON.stringify(CARNE)}, ADMIN=${JSON.stringify(ADMIN)};
    window.__posts=[]; window.__gets=[]; window.__demoraGet={}; window.__demoraPost=0; window.__modoPost='ok';
    window.__depositos=DEPOSITOS; window.__carne=CARNE;
    var resp=function(obj,ms){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||80); }); };
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      if(post){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        if(window.__modoPost==='red') return new Promise(function(_,rej){ setTimeout(function(){ rej(new TypeError('Failed to fetch')); }, window.__demoraPost||60); });
        var d={ok:true};
        if(b.action==='stockTraspaso'){
          if(window.__modoPost==='faltan') d={ok:false,porPieza:true,faltan:['P-9003'],error:'la pieza P-9003 ya no esta'};
          else if(b.ids){ var kg=0; (DEPOSITOS.productos[2].pzs||[]).forEach(function(p){ if(b.ids.indexOf(p.id)>-1)kg+=p.kg; });
            kg=Math.round(kg*1000)/1000;
            d={ok:true,porPieza:true,abbr:b.abbr,ids:b.ids,piezas:b.ids.length,cant:kg,ahoraDesde:Math.round((4.991-kg)*1000)/1000,ahoraHacia:kg,total:4.991}; }
          else { var pr=DEPOSITOS.productos.filter(function(p){return p.a===b.abbr;})[0]||{porDep:{}};
            d={ok:true,abbr:b.abbr,cant:b.cantidad,ahoraDesde:(pr.porDep[b.desde]||0)-b.cantidad,ahoraHacia:(pr.porDep[b.hacia]||0)+b.cantidad}; }
        } else if(b.action==='piezasRecibir'){
          var ag=[], ma=[];
          (b.piezas||[]).forEach(function(p,i){
            if(window.__malaAbbr&&p.abbr===window.__malaAbbr){ ma.push({i:i,uid:p.uid,abbr:p.abbr,error:'no es un producto por kilo'}); return; }
            ag.push({i:i,uid:p.uid,id:'P-T'+(7000+i+window.__posts.length*10),abbr:p.abbr,peso:p.peso,dep:b.deposito||'moresco'}); });
          d={ok:true,agregadas:ag.length,piezas:ag,repetidas:[],malas:ma,stock:[]};
        } else if(b.action==='piezasBaja'){ d={ok:true,id:b.id}; (CARNE.porCorte.CCo.piezas)=CARNE.porCorte.CCo.piezas.filter(function(z){return z.id!==b.id;}); }
        return resp(d, window.__demoraPost||60);
      }
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      window.__gets.push(a);
      var cuerpo = a==='admin' ? ADMIN
        : a==='depositos' ? DEPOSITOS
        : a==='carnePiezas' ? CARNE
        : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true}
        : a==='cajaLight' ? {ts:1,caja:{},saldoBase:{},gastos:[],ingresos:[],movimientos:[],efMano:[],cuentas:[]}
        : a==='ocLight' ? {ok:true,oc:{lista:[]}} : a==='cobrosPendientes' ? {ok:true,cobros:[]}
        : a==='ventas' ? {ok:true,v:[]} : {ok:false,error:'stub'};
      return resp(JSON.parse(JSON.stringify(cuerpo)), window.__demoraGet[a]||120);
    };
  })();
`;

const TOAST = `(document.getElementById('toast')||{}).textContent||''`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: 1, mobile: CEL });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Stock > MOVER y RECIBIR CARNE · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&sembrar=1' });
    if (!await esperar(cli, `typeof go==='function' && typeof stSwitchTab==='function' && window.__listo===1`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `window.__confirmDevuelve=true; go('stock'); 1`);
    await pausa(600);

    // ── Las sub-tabs en el celular ──
    const tabs = await evaluar(cli, `(function(){ stSwitchTab('carne');
      return [].map.call(document.querySelectorAll('#p-stock>.v-tabs>.v-tab'),function(b){var r=b.getBoundingClientRect();
        return {t:b.getAttribute('data-stt'),l:Math.round(r.left),r:Math.round(r.right),h:Math.round(r.height),on:b.classList.contains('on')};}); })()`);
    chk('las 4 sub-tabs entran en la pantalla (ninguna se sale por la derecha)', tabs.length === 4 && tabs.every(t => t.r <= ANCHO && t.l >= 0), tabs);
    chk('RECIBIR CARNE, abierta, se ve', tabs.some(t => t.t === 'carne' && t.on && t.r <= ANCHO), tabs);
    chk('las sub-tabs se tocan (>=' + PISO + 'px)', tabs.every(t => t.h >= PISO), tabs);

    // ══ RECIBIR CARNE ══
    if (!await esperar(cli, `document.querySelectorAll('#stCarne .stcar-corte').length===3`)) { console.log('  RECIBIR CARNE no pinto'); salir(1); }
    const mud = await evaluar(cli, `({cola:(window.CARNE_COLA||[]).map(function(p){return {a:p.abbr,peso:p.peso,uid:p.uid};}),
      nueva:localStorage.getItem('maleu_carneCola'), vieja:localStorage.getItem('mc_carneCola'), prov:(document.getElementById('stcarProv')||{}).value})`);
    chk('la cola vieja (mc_carneCola) se mudo: siguen las 2 piezas', mud.cola.length === 2 && !!mud.nueva && mud.vieja === null, mud);
    chk('cada pieza de la cola tiene su uid', mud.cola.every(p => /^pz/.test(p.uid || '')), mud.cola);
    chk('el proveedor viejo tambien se mudo', mud.prov === 'Proveedor viejo', mud.prov);

    const podar = await evaluar(cli, `(function(){ try{ _swrPodar(); }catch(e){} return {cola:localStorage.getItem('maleu_carneCola')}; })()`);
    chk('el podador de copias NO borra la carne pesada', !!podar.cola && JSON.parse(podar.cola).length === 2, podar);

    const ayuda = await evaluar(cli, `document.querySelector('#stCarne .stcar-ayuda').textContent`);
    chk('la ayuda dice + Agregar (el teclado del iPhone no tiene Enter)', /\+ Agregar/.test(ayuda) && !/Enter/.test(ayuda), ayuda);
    const foco0 = await evaluar(cli, `document.activeElement&&document.activeElement.id`);
    chk('entrar a RECIBIR CARNE no abre el teclado solo', foco0 !== 'stcarPeso', foco0);

    // lo tipeado sobrevive a los datos de ahora
    await evaluar(cli, `window.__demoraGet.carnePiezas=700; var i=document.getElementById('stcarPeso'); i.focus(); i.value='1,2'; stCarnePedir(true); 1`);
    await pausa(1300);
    const tip = await evaluar(cli, `({v:(document.getElementById('stcarPeso')||{}).value, foco:document.activeElement&&document.activeElement.id, gets:window.__gets.filter(function(g){return g==='carnePiezas';}).length})`);
    chk('llegan los cortes de ahora y lo tipeado en el peso sigue ahi', tip.v === '1,2', tip);
    chk('y el cursor sigue en el campo', tip.foco === 'stcarPeso', tip);

    // agregar y guardar con el POST lento, pesando mientras viaja
    await evaluar(cli, `window.__demoraGet.carnePiezas=4000; document.getElementById('stcarPeso').value=''; stCarneElegir('CEn'); document.getElementById('stcarPeso').value='0,842'; stCarneAgregar(); stCarneDep('ustariz'); window.__posts=[]; window.__demoraPost=2500; stCarneGuardar(); 1`);
    await pausa(400);
    const viaje = await evaluar(cli, `(function(){ var b=document.getElementById('stcarGuardar');
      document.getElementById('stcarPeso').value='3,5'; stCarneAgregar();
      var b2=document.getElementById('stcarGuardar');
      var chipsViaja=document.querySelectorAll('#stCarne .stcar-pz.viaja').length;
      var equisViaja=document.querySelectorAll('#stCarne .stcar-pz.viaja button').length;
      return {txt:b2&&b2.textContent, dis:!!(b2&&b2.disabled), chipsViaja:chipsViaja, equisViaja:equisViaja,
        post:(window.__posts.filter(function(p){return p.action==='piezasRecibir';})[0]||{})}; })()`);
    chk('mientras guarda, el boton dice Guardando y no se toca', /Guardando/.test(viaje.txt || '') && viaje.dis, viaje);
    chk('las piezas que viajan no tienen la x (ya se estan guardando)', viaje.chipsViaja === 3 && viaje.equisViaja === 0, viaje);
    chk('el POST manda cada pieza con su uid', (viaje.post.piezas || []).length === 3 && viaje.post.piezas.every(p => /^pz/.test(p.uid || '')), viaje.post);
    await esperar(cli, `!CARNE_GUARDANDO`, 8000);
    const tras = await evaluar(cli, `({cola:CARNE_COLA.map(function(p){return p.peso;}),
      lista:[].map.call(document.querySelectorAll('#stCarne .stcar-depgrp'),function(x){return x.textContent;}),
      freezer:document.getElementById('stCarne').textContent, t:${TOAST}})`);
    chk('lo que se peso MIENTRAS guardaba sigue en la cola', tras.cola.length === 1 && Math.abs(tras.cola[0] - 3.5) < 1e-9, tras.cola);
    chk('lo guardado aparece YA en lo que hay en el freezer', /0,842/.test(tras.freezer) && /1,234/.test(tras.freezer), tras.freezer.slice(-400));
    chk('el aviso cuenta las 3 guardadas', /3 piezas/.test(tras.t), tras.t);

    // rechazo del backend: la pieza se queda con su motivo
    await evaluar(cli, `window.__demoraGet.carnePiezas=120; window.__demoraPost=60; window.__malaAbbr='CLo'; stCarneElegir('CLo'); document.getElementById('stcarPeso').value='1'; stCarneAgregar(); stCarneDep('ustariz'); stCarneGuardar(); 1`);
    await esperar(cli, `!CARNE_GUARDANDO`, 5000); await pausa(200);
    const malas = await evaluar(cli, `({cola:CARNE_COLA.map(function(p){return {a:p.abbr,err:p.err};}), txt:document.getElementById('stCarne').textContent})`);
    chk('lo que el backend rechaza se queda en la cola con su motivo', malas.cola.some(p => p.a === 'CLo' && /por kilo/.test(p.err)), malas.cola);
    chk('y la pantalla dice por que no entro', /No entr[oó]/.test(malas.txt), malas.txt.slice(0, 300));
    chk('lo que si entro salio de la cola (el 3,5 de antes)', !malas.cola.some(p => p.a === 'CEn'), malas.cola);

    // corte de red: la cola se queda y el reintento manda los MISMOS uid
    await evaluar(cli, `window.__malaAbbr=''; window.__modoPost='red'; window.__posts=[]; stCarneDep('ustariz'); stCarneGuardar(); 1`);
    await esperar(cli, `!CARNE_GUARDANDO`, 5000); await pausa(200);
    const red1 = await evaluar(cli, `({cola:CARNE_COLA.length, uids:(window.__posts[0]&&window.__posts[0].piezas||[]).map(function(p){return p.uid;}), t:${TOAST}})`);
    chk('con un corte de red lo pesado sigue en la cola', red1.cola === 1, red1);
    chk('y el aviso dice que no sabe si llego y que reintentar no carga dos veces', /no s[eé] si lleg/.test(red1.t) && /dos veces/.test(red1.t), red1.t);
    await evaluar(cli, `window.__modoPost='ok'; window.__posts=[]; stCarneGuardar(); 1`);
    await esperar(cli, `!CARNE_GUARDANDO`, 5000);
    const red2 = await evaluar(cli, `(window.__posts[0]&&window.__posts[0].piezas||[]).map(function(p){return p.uid;})`);
    chk('el reintento manda los MISMOS uid (el backend no la carga dos veces)', red1.uids.length === 1 && JSON.stringify(red1.uids) === JSON.stringify(red2), { red1: red1.uids, red2 });

    // baja de una pieza pedida
    await evaluar(cli, `window.__confirms=[]; window.__demoraPost=1200; stCarneBaja('P-9002'); 1`);
    await pausa(250);
    const bj = await evaluar(cli, `({conf:window.__confirms[0]||'', viaja:document.querySelectorAll('#stCarne .stcar-pz.viaja').length})`);
    chk('sacar una pieza PEDIDA avisa de que pedido es', /Home #1/.test(bj.conf) && /pedido/.test(bj.conf), bj.conf);
    chk('mientras se da de baja, la pieza se ve en camino', bj.viaja >= 1, bj);
    await pausa(1600);
    const bj2 = await evaluar(cli, `document.getElementById('stCarne').textContent`);
    chk('y despues sale de la lista', !/1,891/.test(bj2), bj2.slice(-300));

    // logout con carne pesada
    /* El confirm contesta que NO: con el codigo viejo el logout sigue de largo y
       recarga la pagina, y el resto de la prueba no mediria nada. */
    await evaluar(cli, `window.__demoraPost=60; window.__confirmDevuelve=false; window.__confirms=[]; stCarneElegir('CEn'); document.getElementById('stcarPeso').value='0,7'; stCarneAgregar(); ajCerrarSesion(); 1`);
    const lo = await evaluar(cli, `({conf:(window.__confirms||[]).length, t:${TOAST}})`);
    chk('cerrar sesion con carne sin guardar se frena ANTES de preguntar, y lo dice', lo.conf === 0 && /carne pesada/.test(lo.t), lo);
    await evaluar(cli, `window.__confirmDevuelve=true; CARNE_COLA=[]; try{_carneColaGuardar();}catch(e){} 1`);

    // ══ MOVER ══
    await evaluar(cli, `window.__gets=[]; stSwitchTab('mover'); 1`);
    if (!await esperar(cli, `document.querySelectorAll('#stMover .stm-row, #stMover .stc-row').length>=4`)) { console.log('  MOVER no pinto'); salir(1); }
    if (!await evaluar(cli, `typeof stMoverEnviar==='function'`)) {
      chk('MOVER mueve con un boton (stMoverEnviar)', false, 'no existe: se mueve al salir del campo');
      await evaluar(cli, `window.__gets=[]; refreshContextual(); 1`);
      await pausa(3000);
      const g0 = await evaluar(cli, `window.__gets.slice()`);
      chk('el ↻ en MOVER pide los depositos y NO el volcado', g0.indexOf('depositos') > -1 && g0.indexOf('admin') < 0, g0);
      throw new Error('MOVER viejo: el resto no se puede medir');
    }
    const filas = await evaluar(cli, `[].map.call(document.querySelectorAll('#stMover .stm-row'),function(f){return f.id;})`);
    chk('MOVER lista los 4 productos con algo en Ustariz', filas.length === 4, filas);

    // el ↻ pide lo que se ve
    await evaluar(cli, `window.__gets=[]; refreshContextual(); 1`);
    await esperar(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`, 10000);
    const gM = await evaluar(cli, `({gets:window.__gets.slice(), tit:(document.getElementById('hdrRefresh')||{}).title||''})`);
    chk('el ↻ en MOVER pide los depositos y NO el volcado', gM.gets.indexOf('depositos') > -1 && gM.gets.indexOf('admin') < 0, gM.gets);
    chk('y el boton dice que son los depositos', /Dep[oó]sitos/.test(gM.tit), gM.tit);

    // salir del campo NO mueve
    await evaluar(cli, `window.__posts=[]; var i=document.getElementById('stmIn_PPM'); i.focus(); i.value='2'; i.blur(); 1`);
    await pausa(300);
    chk('salir del campo no mueve nada', await evaluar(cli, `window.__posts.length`) === 0);

    // unidades enteras
    await evaluar(cli, `document.getElementById('stmIn_PPM').value='2,5'; stMoverEnviar('PPM'); 1`);
    await pausa(200);
    const ent = await evaluar(cli, `({n:window.__posts.length, t:${TOAST}})`);
    chk('2,5 packs no se mandan y se dice por que', ent.n === 0 && /enteras/.test(ent.t), ent);
    await evaluar(cli, `document.getElementById('stmIn_PPM').value='9'; stMoverEnviar('PPM'); 1`);
    await pausa(200);
    chk('mas de lo que hay no se manda', await evaluar(cli, `window.__posts.length`) === 0);

    // dar vuelta borra lo tipeado
    await evaluar(cli, `document.getElementById('stmIn_PJyQ').value='3'; stMoverDarVuelta(); 1`);
    const vu = await evaluar(cli, `({v:(document.getElementById('stmIn_PJyQ')||{}).value, n:window.__posts.length, de:(document.querySelector('#stMover .stm-lado b')||{}).textContent})`);
    chk('dar vuelta el sentido borra lo tipeado y no manda nada', vu.v === '' && vu.n === 0 && /Moresco/.test(vu.de), vu);
    await evaluar(cli, `stMoverDarVuelta(); 1`);

    // lo tipeado sobrevive a los datos de ahora
    await evaluar(cli, `window.__demoraGet.depositos=600; var i=document.getElementById('stmIn_PPM'); i.focus(); i.value='2'; stDepPedir(true); 1`);
    await pausa(1100);
    const sob = await evaluar(cli, `({v:(document.getElementById('stmIn_PPM')||{}).value, foco:document.activeElement&&document.activeElement.id})`);
    chk('llegan los depositos de ahora y el 2 tipeado sigue ahi, con el cursor', sob.v === '2' && sob.foco === 'stmIn_PPM', sob);

    // mover con el boton
    await evaluar(cli, `window.__demoraGet.depositos=120; window.__posts=[]; window.__demoraPost=600; stMoverEnviar('PPM'); 1`);
    await pausa(150);
    const va = await evaluar(cli, `({b:(document.getElementById('stmB_PPM')||{}).textContent, dis:!!(document.getElementById('stmB_PPM')||{}).disabled})`);
    chk('mientras viaja dice Moviendo y no se toca de nuevo', /Moviendo/.test(va.b || '') && va.dis, va);
    await pausa(900);
    const mv = await evaluar(cli, `({post:window.__posts[0]||{}, sub:(document.querySelector('#stmR_PPM .stm-sub')||{}).textContent, v:(document.getElementById('stmIn_PPM')||{}).value})`);
    chk('el boton manda 2 packs de Ustariz a Moresco', mv.post.action === 'stockTraspaso' && mv.post.cantidad === 2 && mv.post.desde === 'ustariz' && mv.post.hacia === 'moresco', mv.post);
    chk('la fila dice lo nuevo y el campo quedo vacio', /ten[eé]s 3/.test(mv.sub || '') && /all[aá] 2/.test(mv.sub || '') && mv.v === '', mv);

    // corte de red: se borra lo tipeado y se traen los numeros
    await evaluar(cli, `window.__modoPost='red'; window.__gets=[]; window.__posts=[]; document.getElementById('stmIn_PJyQ').value='1'; stMoverEnviar('PJyQ'); 1`);
    await pausa(900);
    const rr = await evaluar(cli, `({v:(document.getElementById('stmIn_PJyQ')||{}).value, gets:window.__gets.slice(), t:${TOAST}})`);
    chk('con un corte de red se borra lo tipeado (reintentar a ciegas lo moveria dos veces)', rr.v === '', rr);
    chk('y se traen los depositos de ahora', rr.gets.indexOf('depositos') > -1, rr.gets);
    chk('y el aviso dice que no sabe si se movio', /no s[eé] si se movi/.test(rr.t), rr.t);
    await evaluar(cli, `window.__modoPost='ok'; 1`);

    // la carne, por pieza
    const pz0 = await evaluar(cli, `(function(){ var f=document.getElementById('stmR_CCo'); return {chips:f?f.querySelectorAll('.stm-pzb').length:0,
      input:f?f.querySelectorAll('input').length:-1, b:(document.getElementById('stmB_CCo')||{}).textContent, dis:!!(document.getElementById('stmB_CCo')||{}).disabled,
      txt:f?f.textContent:''}; })()`);
    chk('la carne se ofrece por pieza: 3 piezas y ningun campo de kilos', pz0.chips === 3 && pz0.input === 0, pz0);
    chk('la pieza pedida dice de que pedido es', /Home #1/.test(pz0.txt), pz0.txt);
    chk('sin elegir, el boton pide que se toquen las piezas', pz0.dis && /Toc[aá] las piezas/.test(pz0.b || ''), pz0);
    await evaluar(cli, `window.__posts=[]; stMoverPieza('CCo','P-9001'); stMoverPieza('CCo','P-9003'); 1`);
    const pz1 = await evaluar(cli, `({b:(document.getElementById('stmB_CCo')||{}).textContent, dis:!!(document.getElementById('stmB_CCo')||{}).disabled, on:document.querySelectorAll('#stmR_CCo .stm-pzb.on').length})`);
    chk('elegidas 2, el boton dice 2 piezas y 3,1 kg', pz1.on === 2 && !pz1.dis && /2 piezas/.test(pz1.b) && /3,1 kg/.test(pz1.b), pz1);
    await evaluar(cli, `stMoverEnviar('CCo'); 1`);
    await esperar(cli, `!STM_VIAJA.CCo`, 5000); await pausa(200);
    const pz2 = await evaluar(cli, `({post:window.__posts.filter(function(p){return p.abbr==='CCo';})[0]||{}, chips:document.querySelectorAll('#stmR_CCo .stm-pzb').length, sub:(document.querySelector('#stmR_CCo .stm-sub')||{}).textContent})`);
    chk('manda los ids de las elegidas', JSON.stringify((pz2.post.ids || []).slice().sort()) === JSON.stringify(['P-9001', 'P-9003']), pz2.post);
    chk('y queda 1 pieza en Ustariz', pz2.chips === 1 && /1 pieza/.test(pz2.sub || ''), pz2);
    await evaluar(cli, `stMoverTodas('CCo'); 1`);
    chk('Todas elige la que queda', await evaluar(cli, `document.querySelectorAll('#stmR_CCo .stm-pzb.on').length`) === 1);

    // un producto por kilo sin piezas se mueve por kilos
    chk('un producto por kilo sin piezas tiene su campo de kilos', await evaluar(cli, `!!document.getElementById('stmIn_CEn')`) === true);

    // piezas que ya no estan -> se traen los depositos
    await evaluar(cli, `window.__modoPost='faltan'; window.__gets=[]; stMoverEnviar('CCo'); 1`);
    await pausa(700);
    const fal = await evaluar(cli, `({gets:window.__gets.slice(), t:${TOAST}})`);
    chk('si una pieza ya no esta, lo dice y trae los depositos de ahora', fal.gets.indexOf('depositos') > -1 && /ya no esta/.test(fal.t), fal);
    await evaluar(cli, `window.__modoPost='ok'; 1`);

    // un backend viejo (sin pzs): la carne se pasa entera
    await evaluar(cli, `DEP_DATA.productos.forEach(function(p){ delete p.pzs; }); renderStMover(); window.__posts=[]; 1`);
    const vj = await evaluar(cli, `({b:(document.getElementById('stmB_CCo')||{}).textContent, input:document.querySelectorAll('#stmR_CCo input').length})`);
    chk('con un Apps Script viejo la carne ofrece Pasar todas (lo que acepta)', /Pasar todas/.test(vj.b || '') && vj.input === 0, vj);
    await evaluar(cli, `stDepPedir(true); 1`); await pausa(600);

    // tamanos y desborde
    const geo = await evaluar(cli, `(function(){ var c=document.getElementById('stMover');
      var ctrls=[].filter.call(c.querySelectorAll('button,input'),function(e){var r=e.getBoundingClientRect();return r.width>0&&r.height>0;})
        .map(function(e){var r=e.getBoundingClientRect();return {id:e.id||e.className,h:Math.round(r.height)};});
      var gaps=[].map.call(c.querySelectorAll('.stm-row'),function(f){var n=f.querySelector('.stm-n'),k=f.querySelector('.stm-ctl'); if(!n||!k)return 0;
        var nn=document.createRange(); nn.selectNodeContents(n.firstChild); var tr=nn.getBoundingClientRect(); return Math.round(k.getBoundingClientRect().left-tr.right);});
      return {chicos:ctrls.filter(function(x){return x.h<${PISO};}), n:ctrls.length, desborde:document.documentElement.scrollWidth-window.innerWidth, gapMax:Math.max.apply(null,gaps.concat([0]))}; })()`);
    chk('ningun control de MOVER por debajo de ' + PISO + 'px (' + geo.n + ' medidos)', geo.n > 8 && geo.chicos.length === 0, geo.chicos);
    chk('no desborda a lo ancho', geo.desborde <= 1, geo.desborde);
    if (!CEL) chk('en la compu el nombre no queda a un metro de su campo (<= 460 px)', geo.gapMax <= 460, geo.gapMax);
    const carneGeo = await evaluar(cli, `(function(){ stSwitchTab('carne'); var c=document.getElementById('stCarne');
      var bs=[].filter.call(c.querySelectorAll('.stcar-pz button'),function(e){return e.getBoundingClientRect().width>0;}).map(function(e){var r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};});
      return {bs:bs}; })()`);
    if (CEL) chk('las x de las piezas se tocan con el dedo (>=36 de ancho, >=38 de alto)', carneGeo.bs.length > 0 && carneGeo.bs.every(b => b.w >= 36 && b.h >= 38), carneGeo.bs);

    chk('sin errores de JavaScript', errores.length === 0, errores.slice(0, 3));
  } catch (e) {
    mal++; console.log('  REVENTO ' + (e && e.stack || e));
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal   (' + ANCHO + 'px)');
  salir(mal ? 1 : 0);
})();
