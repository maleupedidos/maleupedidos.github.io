/* ARMADO cuenta ENTREGAS, no filas de la planilla (12/9/2026).

   node probar_conteo_armado.js <token> [390|1440]

   Tadeo, con la foto de un sabado al mediodia: "dice que el domingo tenemos 2
   pedidos cuando en realidad es 1 pedido hecho en 2. Deberia decir 1" y
   "'4 pedidos 1 del proveedor' queda feisimo. Son 4 pedidos que hay que llevar
   hoy sabado".

   El 11/9 se unifico la cuenta de BOLSAS, pero los rotulos seguian mostrando
   `pedidos` crudos: dos pedidos del mismo cliente el mismo dia son UNA entrega
   -- la misma parada de RUTA y la misma bolsa de ARMADO.

   Corre sobre el ERP FUSIONADO con la sesion real y `action=entregas`
   STUBBEADO, con datos INVENTADOS (este repo es publico). Los POST van
   interceptados.

   Va en DOS FASES con navegacion propia, con una sola inyeccion que lee
   `location.search`: `addScriptToEvaluateOnNewDocument` ACUMULA, y una segunda
   inyeccion envuelve el fetch dos veces y deja la sub-app sin arrancar.
   · fase 1: el escenario completo (atrasados, hoy, tres dias futuros)
   · fase 2: un solo dia futuro, para el tile que nombra ese dia

   Mide:
   · el tile de atrasados, el de hoy y el de otros dias;
   · el encabezado de cada dia y su contador de bolsas;
   · el contador por canal;
   · que una bolsa con dos pedidos NO figure lista si falta tildar uno (el bug
     del orden: `!bol[k]` pisaba un false ya puesto);
   · que dos tandas del mismo vendedor Red en dias distintos sean DOS entregas. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};

const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const mas = n => { const d = new Date(hoyAR); d.setDate(d.getDate() + n); return d; };
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/* La misma cuenta que labelFecha() del ERP, para no comparar contra un texto
   escrito a mano que se desfasa el dia que cambie el formato. */
const label = d => DIAS[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);

const AYER = mas(-1), HOY = mas(0), D1 = mas(1), D2 = mas(2), D3 = mas(3), D4 = mas(4);
const EP = 'Estancias del Pilar';
const base = (o) => Object.assign({
  oD: {}, oc: [], hr: '10:30', es: 'Pendiente', t: '', ep: 'No Cobrado',
  fp: 'Transferencia', o: 'Deposito', b: EP, h: 'Home'
}, o);
/* Un pedido normal: sale del freezer, asi que entra a ARMADO. */
const ped = (d, o) => base(Object.assign({ fe: iso(d), f: dmy(d), de: DIAS[d.getDay()], d: (o.sb || EP) + (o.l ? ' · Lote ' + o.l : '') }, o));
/* 100% del proveedor: no se arma aca. `oc` con la cantidad entera del item. */
const pedOC = (d, o) => ped(d, Object.assign({ o: 'Orden de Compra', oc: (o.p || []).map(x => ({ a: x.a, q: x.q })) }, o));

const T = n => '11' + String(40000000 + n);
const ENTREGAS = [
  // ── ATRASADO (ayer): el mismo cliente con DOS pedidos = 1 entrega atrasada
  ped(AYER, { id: 8101, r: 8101, c: 'Prueba Atrasada', t: T(1), sb: 'Golf', l: '5', $: 40000, p: [{ a: 'PMu', q: 1 }] }),
  ped(AYER, { id: 8102, r: 8102, c: 'Prueba Atrasada', t: T(1), sb: 'Golf', l: '5', $: 12000, p: [{ a: 'PMa', q: 1 }] }),

  // ── HOY: el escenario de la foto -> 4 entregas, 3 bolsas
  ped(HOY, { id: 8201, r: 8201, c: 'Prueba Uno', t: T(2), sb: 'La Pionera', l: '10', $: 51000, p: [{ a: 'PPM', q: 3 }] }),
  ped(HOY, { id: 8202, r: 8202, c: 'Prueba Dos', t: T(3), sb: 'La Paz', l: '20', $: 34000, p: [{ a: 'PMu', q: 2 }] }),
  ped(HOY, { id: 8203, r: 8203, c: 'Prueba Tres', t: T(4), sb: 'Argentina 1', l: '30', $: 22000, p: [{ a: 'PMa', q: 1 }] }),
  pedOC(HOY, { id: 8204, r: 8204, c: 'Prueba Proveedor', t: T(5), sb: 'Golf', l: '40', $: 96000, p: [{ a: 'SE', q: 3 }] }),

  // ── D1: el caso que marco Tadeo -> 1 cliente, 2 pedidos, 1 entrega
  ped(D1, { id: 8301, r: 8301, c: 'Prueba Combo', t: T(6), sb: 'La Pionera', l: '72', $: 84600, p: [{ a: 'PMu', q: 2 }] }),
  ped(D1, { id: 8302, r: 8302, c: 'Prueba Combo', t: T(6), sb: 'La Pionera', l: '72', $: 21240, p: [{ a: 'PPM', q: 1 }] }),

  // ── D2: dos canales el mismo dia, para los contadores por canal.
  // La tanda de Red son DOS clientes finales del mismo vendedor = 1 entrega.
  ped(D2, { id: 8401, r: 8401, c: 'Prueba Cuatro', t: T(9), sb: 'La Paz', l: '60', $: 19000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 8402, r: 8402, h: 'Red', c: 'Cliente final A', retira: 'Prueba Vendedora', fe: iso(D2), f: dmy(D2), de: DIAS[D2.getDay()], b: 'Pilar', sb: 'Pilar', l: '', d: 'Pilar', $: 30000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 8403, r: 8403, h: 'Red', c: 'Cliente final B', retira: 'Prueba Vendedora', fe: iso(D2), f: dmy(D2), de: DIAS[D2.getDay()], b: 'Pilar', sb: 'Pilar', l: '', d: 'Pilar', $: 12000, p: [{ a: 'PMa', q: 1 }] }),

  // ── D3: dos entregas y NINGUNA se arma (todo del proveedor)
  pedOC(D3, { id: 8501, r: 8501, c: 'Prueba OC Uno', t: T(7), sb: 'Golf', l: '50', $: 60000, p: [{ a: 'SE', q: 2 }] }),
  pedOC(D3, { id: 8502, r: 8502, c: 'Prueba OC Dos', t: T(8), sb: 'Golf', l: '51', $: 30000, p: [{ a: 'SQB', q: 1 }] }),

  // ── D4: la MISMA vendedora otro dia. Sin la fecha en la clave, las dos
  // tandas de Red se contaban como UNA sola entrega en el tile de otros dias.
  base({ id: 8601, r: 8601, h: 'Red', c: 'Cliente final C', retira: 'Prueba Vendedora', fe: iso(D4), f: dmy(D4), de: DIAS[D4.getDay()], b: 'Pilar', sb: 'Pilar', l: '', d: 'Pilar', $: 25000, p: [{ a: 'PMa', q: 1 }] }),
];
const SOLO_D1 = ENTREGAS.filter(e => e.fe === iso(D1));

const EXTRA = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  (function(){
    var TODAS=${JSON.stringify(ENTREGAS)}, SOLO=${JSON.stringify(SOLO_D1)};
    var o=window.fetch;
    window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(x && String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));
      }
      if(url.indexOf('action=entregas')>-1){
        /* La fase sale de la URL y no de una variable: una segunda inyeccion
           envolveria el fetch dos veces y la sub-app no arranca. */
        var lista=(location.search.indexOf('fase=2')>-1)?SOLO:TODAS;
        return Promise.resolve(new Response(JSON.stringify({ts:Date.now(), e:lista}),{status:200,headers:{'Content-Type':'application/json'}}));
      }
      if(url.indexOf('action=pendientesGuardarStock')>-1){
        return Promise.resolve(new Response(JSON.stringify({ok:true,items:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
      }
      return o.apply(this,arguments);};
  })();
  window.__confirmDevuelve=true;
  window.confirm=function(){ return true; };
  try{ localStorage.removeItem('maleu_ruta'); localStorage.removeItem('maleu_ruta_orden_modo'); }catch(e){}
`;

/* Lo que dicen los tiles del resumen y cada encabezado de dia. Se lee del DOM
   renderizado: `_armCuenta` vive en el IIFE de la sub-app y desde afuera se
   leeria una copia. */
const LEER = `(function(){
  function txt(el){ return el?String(el.textContent||'').replace(/\\s+/g,' ').trim():''; }
  var tiles=[].map.call(document.querySelectorAll('#armadoSummary .arm-res-t'),function(t){
    return {n:txt(t.querySelector('b')), lbl:txt(t.querySelector('span')), cls:t.className};
  });
  var dias=[].map.call(document.querySelectorAll('#armadoList .armado-day-header'),function(h){
    return {k:h.getAttribute('data-collapse-key')||'',
            dia:txt(h.querySelector('.dh-dia')),
            meta:txt(h.querySelector('.dh-meta')),
            cnt:txt(h.querySelector('.day-count'))};
  });
  var canales=[].map.call(document.querySelectorAll('#armadoList .armado-canal-header'),function(h){
    return {k:h.getAttribute('data-collapse-key')||'', nom:txt(h.querySelector('.ch-nom')),
            sub:txt(h.querySelector('.ch-sub')), cnt:txt(h.querySelector('.ch-count'))};
  });
  return {tiles:tiles, dias:dias, canales:canales};
})()`;

const ANCHOS = `(function(){
  var out=[];
  [].forEach.call(document.querySelectorAll('#armadoSummary .arm-res-t, #armadoList .armado-day-header'),function(el){
    var r=el.getBoundingClientRect();
    out.push({cls:el.className.split(' ')[0], w:Math.round(r.width), h:Math.round(r.height)});
  });
  return {items:out, doc:document.documentElement.scrollWidth, win:window.innerWidth};
})()`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });

  console.log('\n=== ARMADO cuenta entregas · ' + ANCHO + 'px ===');
  console.log('--- fase 1: atrasados + hoy + tres dias futuros ---');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arranco'); process.exit(1); }
  await evaluar(cli, 'go("ruta")');
  if (!await esperar(cli, '(function(){try{return getPendientes().length===' + ENTREGAS.length + '}catch(e){return false}})()', 60000)) {
    console.log('no llegaron las entregas stubbeadas'); process.exit(1);
  }
  // El harness revienta si los datos inventados no llegaron al markup: sin esto
  // los chequeos de abajo miden una pantalla vacia y dan verdes falsos.
  if (!await esperar(cli, 'document.querySelectorAll("#armadoList .armado-day-header").length>=5', 20000)) {
    console.log('ARMADO no dibujo los 4 dias: los datos inventados no llegaron'); process.exit(1);
  }

  // Tildar UNA de las tres bolsas de hoy (reproduce el "1/3 bolsas" de la foto)
  await evaluar(cli, 'confirmarArmado("Home|R8201")');
  await pausa(400);
  let R = await evaluar(cli, LEER);

  // ── Los tiles ──
  const tAtr = R.tiles.find(t => /atr/.test(t.cls));
  chk('tile de atrasados: 1 entrega (2 pedidos del mismo cliente)',
    tAtr && tAtr.n === '1' && /^entrega atrasada$/.test(tAtr.lbl), tAtr);
  const tHoy = R.tiles.find(t => /hoy/.test(t.cls));
  chk('tile de hoy: 2 bolsas por armar, sin repetir el progreso del contador',
    tHoy && tHoy.n === '2' && tHoy.lbl === 'bolsas por armar hoy', tHoy);
  const tProx = R.tiles.find(t => /prox/.test(t.cls));
  /* 1 (el combo) + 2 (D2: un pedido y la tanda de Red) + 2 (D3, todo del
     proveedor) + 1 (D4: la MISMA vendedora otro dia). Sin la fecha en la
     clave de Red, las dos tandas contaban como una y esto daba 5. */
  chk('tile de otros dias: 6 entregas (el combo cuenta 1, y Red cuenta 1 POR DIA)',
    tProx && tProx.n === '6', tProx);
  chk('  y dice en cuantos dias caen: "en 4 dias"', tProx && /en 4 d[ií]as/.test(tProx.lbl), tProx && tProx.lbl);

  // ── El encabezado de cada dia ──
  const dia = k => R.dias.find(d => d.k === 'dia:' + k);
  const dAyer = dia(iso(AYER));
  chk('dia atrasado: "1 sin entregar", no 2', dAyer && /^⚠️?\s*1 sin entregar/.test(dAyer.meta), dAyer);
  chk('  y dice de cuando era', dAyer && /era para ayer|hace \d+ d[ií]as/.test(dAyer.meta), dAyer && dAyer.meta);

  const dHoy = dia(iso(HOY));
  chk('HOY dice "4 entregas" (lo que hay que llevar)', dHoy && dHoy.meta === '4 entregas', dHoy);
  chk('  y NO arrastra el "1 del proveedor" en el encabezado', dHoy && !/proveedor/.test(dHoy.meta), dHoy && dHoy.meta);
  chk('  el contador cuenta BOLSAS y va aparte: "1/3 bolsas"', dHoy && /1\/3 bolsas/.test(dHoy.cnt), dHoy && dHoy.cnt);

  const dD1 = dia(iso(D1));
  chk('el dia del combo dice "1 entrega": 1 cliente con 2 pedidos se lleva junto',
    dD1 && dD1.meta === '1 entrega', dD1);
  const dD2 = dia(iso(D2)), dD4 = dia(iso(D4));
  chk('el dia de dos canales dice "2 entregas": un pedido + la tanda de Red (2 clientes finales)',
    dD2 && dD2.meta === '2 entregas', dD2);
  chk('la 2da tanda de la MISMA vendedora, otro dia, es OTRA entrega',
    dD4 && dD4.meta === '1 entrega', dD4);
  const dD3 = dia(iso(D3));
  chk('el dia 100% proveedor: "2 entregas · todo del proveedor"',
    dD3 && dD3.meta === '2 entregas · todo del proveedor', dD3);
  chk('  y su contador dice "sin armado"', dD3 && /sin armado/.test(dD3.cnt), dD3 && dD3.cnt);

  // ── El bug del orden: tildar SOLO el segundo pedido de una bolsa ──
  chk('la bolsa del combo arranca sin armar: "0/1 bolsa"', dD1 && /0\/1 bolsa/.test(dD1.cnt), dD1 && dD1.cnt);
  await evaluar(cli, 'confirmarArmado("Home|R8302")');   // el SEGUNDO de los dos
  await pausa(400);
  R = await evaluar(cli, LEER);
  const dD1b = R.dias.find(d => d.k === 'dia:' + iso(D1));
  chk('tildando solo el 2do pedido, la bolsa NO figura lista (el bug del orden)',
    dD1b && /0\/1 bolsa/.test(dD1b.cnt), dD1b && dD1b.cnt);
  await evaluar(cli, 'confirmarArmado("Home|R8301")');
  await pausa(400);
  R = await evaluar(cli, LEER);
  const dD1c = R.dias.find(d => d.k === 'dia:' + iso(D1));
  chk('  con los dos tildados si queda lista', dD1c && /1\/1/.test(dD1c.cnt), dD1c && dD1c.cnt);

  // ── El contador por canal ──
  const cRe = R.canales.find(c => /can:.*:re$/.test(c.k) && c.k.indexOf(iso(D2)) > -1);
  chk('el canal Red cuenta 1 entrega (la tanda), no sus 2 clientes finales',
    cRe && cRe.cnt === '1', R.canales);
  const cVd = R.canales.find(c => /can:.*:vd$/.test(c.k) && c.k.indexOf(iso(D2)) > -1);
  chk('el canal Venta Directa del mismo dia cuenta su entrega', cVd && cVd.cnt === '1', R.canales);
  chk('  y ningun canal arrastra el "N del proveedor"',
    R.canales.every(c => !c.sub || c.sub === 'todo del proveedor'), R.canales.map(c => c.sub));

  // ── Nada se desborda ni queda apretado ──
  const A = await evaluar(cli, ANCHOS);
  chk('no desborda a lo ancho', A.doc <= A.win + 1, A);
  chk('ningun tile ni encabezado queda por debajo de 44px de alto',
    A.items.every(i => i.h >= 44), A.items.filter(i => i.h < 44));

  // ── fase 2: un solo dia futuro ──
  console.log('--- fase 2: un solo dia futuro ---');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?fase=2' });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arranco en la fase 2'); process.exit(1); }
  await evaluar(cli, 'go("ruta")');
  if (!await esperar(cli, '(function(){try{return getPendientes().length===' + SOLO_D1.length + '}catch(e){return false}})()', 60000)) {
    console.log('la fase 2 no recibio su lista'); process.exit(1);
  }
  await pausa(600);
  const R2 = await evaluar(cli, LEER);
  const t2 = R2.tiles.find(t => /prox/.test(t.cls));
  chk('con todo en un solo dia, el tile NOMBRA ese dia en vez de "otros dias"',
    t2 && new RegExp(label(D1).toLowerCase().replace('/', '\\/')).test(t2.lbl), t2 && t2.lbl);
  chk('  y cuenta 1 entrega: los 2 pedidos del combo se llevan juntos', t2 && t2.n === '1', t2);
  const err = await evaluar(cli, 'window.__errores||[]');
  chk('sin errores de consola', err.length === 0, err);
  const posts = await evaluar(cli, 'window.__posts||[]');
  chk('los POST fueron interceptados (la planilla no se toco)', Array.isArray(posts), posts.length);

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal');
  await cli.cerrar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
