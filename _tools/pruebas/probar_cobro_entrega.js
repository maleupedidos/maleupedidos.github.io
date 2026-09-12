/* RUTA: la casilla "Y ya se lo entregué" del cuadro de cobro (12/9/2026).

   node probar_cobro_entrega.js <token> [390|1440]

   Una parada eran 5 toques — Cobrar > método > Confirmar > Entregado > Sí — y
   pasan a 3. En la puerta del cliente cobrar ES entregar.

   Lo que este test tiene que sostener, porque son las dos direcciones del
   mismo riesgo:

     · tildada, marca las DOS cosas (y el pedido NO entra a COBROS, porque no
       quedó debiendo);
     · destildada, marca SOLO el cobro y la parada se queda en el recorrido.
       Marcar entregado algo que no se entregó es peor que un toque de más, así
       que la casilla tiene que poder decir que no.

   Y donde la entrega no es cierta, la casilla no existe: desde COBROS (el
   pedido llegó ahí justamente porque ya se entregó) y en pago parcial.

   El POST se demora a propósito para poder leer la COLA en vuelo: al volver el
   ok la acción sale de la cola, así que leerla después da [] siempre y el test
   no distingue "se guardó" de "no se guardó nunca". De paso verifica que el
   cobro siga sin tapar la pantalla.

   Los datos son INVENTADOS: este repo es público. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const DEMORA = 4000;
const TOPE_TAPA = 1200;
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

/* Todas 100% Orden de Compra para que entren a RUTA sin pasar por ARMADO, y
   cada cliente con su teléfono y su lugar: una parada es cliente + día + lugar,
   así que con el mismo teléfono en el MISMO lugar se fusionan en un combo — que
   es justo lo que hace falta para el caso 6, y lo que hay que evitar en el
   resto. */
const base = (o) => Object.assign({ oD: {}, oc: [], hr: '10:30', f: HOYd, de: DIA, fe: HOY, es: 'Pendiente',
  d: '', ep: 'No Cobrado', fp: 'Efectivo', o: 'Orden de Compra', b: 'Estancias del Pilar' }, o);
const ENTREGAS = [
  base({ id: 9301, h: 'Home', r: 9301, c: 'Cobro Y Entrego', t: '1156000001', sb: 'Champagnat Alto', l: '11', $: 12000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9302, h: 'Home', r: 9302, c: 'Cobro Nomas',     t: '1156000002', sb: 'Golf',            l: '22', $: 25000, p: [{ a: 'PMu', q: 2 }] }),
  base({ id: 9303, h: 'Home', r: 9303, c: 'Entrego Nomas',   t: '1156000003', sb: 'La Pionera',      l: '33', $: 18000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9304, h: 'Home', r: 9304, c: 'Combo Dos',       t: '1156000004', sb: 'El Recuerdo',     l: '44', $: 9000,  p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9305, h: 'Home', r: 9305, c: 'Combo Dos',       t: '1156000004', sb: 'El Recuerdo',     l: '44', $: 7000,  p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9306, h: 'Home', r: 9306, c: 'Cobro Parcial',   t: '1156000006', sb: 'Santa Elena',     l: '55', $: 30000, p: [{ a: 'PMu', q: 2 }] })
];
const K = { ambas: 'Home|R9301', soloCobro: 'Home|R9302', soloEnt: 'Home|R9303', parcial: 'Home|R9306' };

const EXTRA = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(x && String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
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
  /* Solo en la PRIMERA carga: el script inyectado corre en CADA navegación, así
     que sin la marca el reload borraría lo que se viene a comprobar. */
  try{ if(!sessionStorage.getItem('__cobEntSembrado')){
    localStorage.removeItem('maleu_ruta'); localStorage.removeItem('maleu_ruta_orden_modo');
    sessionStorage.setItem('__cobEntSembrado','1');
  } }catch(e){}
`;

/* Lo guardado, que es la única fuente confiable: `entregados`, `cobrados` y
   `pendientesCobro` viven en el IIFE de la sub-app y desde afuera se lee una
   COPIA de `window` que no se actualiza. */
const ESTADO = `(function(){ try{ var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}');
  return { ent:Object.keys(d.entregados||{}), cob:Object.keys(d.cobrados||{}),
    pend:(d.pendientesCobro||[]).map(function(p){return (p.h||'')+'#'+(p.id||'');}),
    hechas:(d.rutHechas||[]).map(function(x){return x.key;}),
    cola:(d.syncQueue||[]).map(function(x){return x.action+':'+(x.id||'');}) };
  }catch(e){ return {ERROR:String(e.message)}; } })()`;

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

const CUADRO = `(function(){
  var sec=document.getElementById('cobroEntSection');
  var chk=document.getElementById('cobroYaEntregado');
  var btn=document.getElementById('btnCobroRutaOk');
  var ov=document.getElementById('cobroRutaOverlay');
  var r=sec?sec.getBoundingClientRect():null;
  return {
    abierto: !!(ov && !ov.classList.contains('hidden')),
    visible: !!(sec && sec.style.display!=='none'),
    tildada: !!(chk && chk.checked),
    alto: r?Math.round(r.height):0,
    ancho: r?Math.round(r.width):0,
    hint: (document.getElementById('cobroEntHint')||{}).textContent||'',
    btn: btn?btn.innerText.replace(/\\s+/g,' ').trim():'',
    btnAncho: btn?Math.round(btn.getBoundingClientRect().width):0,
    btnScroll: btn?btn.scrollWidth:0
  };
})()`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== RUTA · cobrar y entregar en un toque · ' + ANCHO + 'px ===');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  try {
    if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arrancó'); process.exit(1); }
    await evaluar(cli, 'go("ruta")');
    if (!await esperar(cli, '(function(){try{return getPendientes().length===' + ENTREGAS.length + '}catch(e){return false}})()', 60000)) {
      console.log('no llegaron las entregas stubbeadas'); process.exit(1);
    }
    await evaluar(cli, 'switchTab("ruta")');
    await pausa(900);
    /* 6 pedidos y 5 paradas: los dos de "Combo Dos" comparten teléfono, día y
       lugar, así que son UNA parada. Si esto no da 5, los datos no tienen la
       forma real y lo de abajo mide otra cosa. */
    const N0 = await evaluar(cli, 'getSorted().length');
    if (N0 !== 5) { console.log('el escenario no armó las 5 paradas (dio ' + N0 + ')'); process.exit(1); }

    // ── 1. La casilla, tildada por defecto ──────────────────────────────
    await evaluar(cli, 'abrirCobroRuta(' + JSON.stringify(K.ambas) + ')');
    await pausa(700);
    let c = await evaluar(cli, CUADRO);
    chk('el cuadro de cobro abre', c.abierto);
    chk('la casilla "Y ya se lo entregué" está', c.visible, c);
    chk('  y viene TILDADA', c.tildada, c);
    chk('  el área táctil llega a 44px', c.alto >= 44, c.alto);
    chk('  y no se sale del cuadro', c.ancho > 0 && c.ancho <= ANCHO - 20, { ancho: c.ancho, ANCHO });
    chk('  dice qué pasa con la parada', /sale del recorrido/i.test(c.hint), c.hint);
    /* El botón nombra las dos cosas: si dijera sólo COBRADO, la parada saldría
       del recorrido sin que nadie lo hubiera leído. */
    chk('el botón dice COBRADO Y ENTREGADO', /COBRADO Y ENTREGADO/i.test(c.btn), c.btn);
    chk('  y el monto, en el segundo renglón', /\$\s?12\.000/.test(c.btn), c.btn);
    chk('  sin cortarse a lo ancho', c.btnScroll <= c.btnAncho + 1, { btnScroll: c.btnScroll, btnAncho: c.btnAncho });

    // Confirmar: las DOS cosas, y el cobro sigue sin tapar la pantalla
    await evaluar(cli, ARRANCAR);
    await evaluar(cli, 'confirmarCobroRuta()');
    await pausa(900);
    const tapa = await evaluar(cli, LEER_TAPA);
    const e1 = await evaluar(cli, ESTADO);
    chk('COBRAR+ENTREGAR no tapa la pantalla', tapa <= TOPE_TAPA, tapa + ' ms');
    chk('quedó COBRADO', e1.cob.indexOf(K.ambas) > -1, e1.cob);
    chk('  y ENTREGADO, en un solo toque', e1.ent.indexOf(K.ambas) > -1, e1.ent);
    /* El orden importa: `marcarCobrado` primero, así el POST de la entrega
       viaja con cobrado:true y el backend ve las dos cosas en orden. */
    const iCob = e1.cola.findIndex(x => /marcarCobrado:9301/.test(x));
    const iEnt = e1.cola.findIndex(x => /marcarEntregado:9301/.test(x));
    chk('los dos POST están en la cola', iCob > -1 && iEnt > -1, e1.cola);
    chk('  y el cobro va PRIMERO', iCob > -1 && iEnt > iCob, { iCob, iEnt, cola: e1.cola });
    chk('NO entra a COBROS: no quedó debiendo', e1.pend.indexOf('Home#9301') === -1, e1.pend);
    chk('y queda en "Ya entregadas hoy" para poder volver atrás', e1.hechas.indexOf(K.ambas) > -1, e1.hechas);
    await pausa(DEMORA + 1500);
    const posts = await evaluar(cli, 'window.__posts.filter(function(p){return p.action==="marcarEntregado"&&String(p.id)==="9301"})');
    chk('el POST de la entrega dice que ya está cobrado', posts.length === 1 && posts[0].cobrado === true, posts);
    const n1 = await evaluar(cli, 'getSorted().length');
    chk('la parada sale del recorrido', n1 === 4, n1);

    // ── 2. Destildada: SOLO cobra ───────────────────────────────────────
    await evaluar(cli, 'abrirCobroRuta(' + JSON.stringify(K.soloCobro) + ')');
    await pausa(600);
    await evaluar(cli, `(function(){var c=document.getElementById('cobroYaEntregado');c.checked=false;c.onchange({target:c});return true;})()`);
    await pausa(400);
    c = await evaluar(cli, CUADRO);
    chk('destildar la deja destildada', !c.tildada, c);
    chk('  el hint dice que la parada se queda', /se queda en el recorrido/i.test(c.hint), c.hint);
    chk('  y el botón vuelve a decir sólo COBRADO', /COBRADO/i.test(c.btn) && !/ENTREGADO/i.test(c.btn), c.btn);
    await evaluar(cli, 'confirmarCobroRuta()');
    await pausa(1000);
    const e2 = await evaluar(cli, ESTADO);
    chk('quedó cobrado', e2.cob.indexOf(K.soloCobro) > -1, e2.cob);
    chk('  y NO entregado', e2.ent.indexOf(K.soloCobro) === -1, e2.ent);
    chk('  la parada sigue en el recorrido', await evaluar(cli, 'getSorted().length') === 4);
    chk('  y no hay POST de entrega de ese pedido',
      (await evaluar(cli, 'window.__posts.filter(function(p){return p.action==="marcarEntregado"&&String(p.id)==="9302"}).length')) === 0);
    await pausa(DEMORA + 1200);

    // ── 3. Desde COBROS la casilla no existe ────────────────────────────
    /* Entregar sin cobrar es lo que pone un pedido en COBROS, y ahí la entrega
       ya pasó: ofrecer la casilla sería preguntar algo que ya está contestado. */
    await evaluar(cli, 'marcarEntregado(' + JSON.stringify(K.soloEnt) + ')');
    await pausa(1200);
    const e3 = await evaluar(cli, ESTADO);
    chk('entregar sin cobrar manda el pedido a COBROS', e3.pend.indexOf('Home#9303') > -1, e3.pend);
    await evaluar(cli, 'switchTab("cobros")');
    await pausa(700);
    const abrioC = await evaluar(cli, `(function(){ try{ abrirCobroPendiente(0); return true; }catch(e){ return 'EXPLOTO: '+e.message; } })()`);
    await pausa(700);
    c = await evaluar(cli, CUADRO);
    chk('el cuadro abre desde COBROS', abrioC === true && c.abierto, { abrioC, c });
    chk('  y la casilla NO aparece', !c.visible, c);
    chk('  el botón dice sólo COBRADO', !/ENTREGADO/i.test(c.btn), c.btn);
    await evaluar(cli, 'cerrarCobroRuta()');
    await evaluar(cli, 'switchTab("ruta")');
    await pausa(700);
    await pausa(DEMORA + 1200);

    // ── 4. Pago parcial: la casilla se esconde, y volver atrás la trae ──
    /* Ese camino deja el pedido debiendo y el saldo lo reconcilia el backend,
       así que empujarlo a COBROS desde acá le pondría el total en vez del
       saldo. Ahí la entrega se marca con el botón de siempre. */
    await evaluar(cli, 'abrirCobroRuta(' + JSON.stringify(K.parcial) + ')');
    await pausa(600);
    c = await evaluar(cli, CUADRO);
    chk('con el cobro normal la casilla está', c.visible, c);
    await evaluar(cli, `(function(){ _toggleCobroParcial(document.getElementById('cobroTogglePartial')); return true; })()`);
    await pausa(500);
    c = await evaluar(cli, CUADRO);
    chk('al prender "Pago parcial" la casilla se esconde', !c.visible, c);
    await evaluar(cli, `(function(){ _toggleCobroParcial(document.getElementById('cobroTogglePartial')); return true; })()`);
    await pausa(500);
    c = await evaluar(cli, CUADRO);
    chk('  y al apagarlo vuelve, tildada', c.visible && c.tildada, c);
    await evaluar(cli, 'cerrarCobroRuta()');
    await pausa(400);

    // ── 5. El combo: cobra y entrega los N pedidos ──────────────────────
    const kCombo = await evaluar(cli, `(function(){
      var s=getSorted();
      for(var i=0;i<s.length;i++) if(s[i]._combo && /Combo Dos/.test(s[i].c||(s[i]._pedidos&&s[i]._pedidos[0].c))) return s[i]._key;
      return null; })()`);
    chk('los 2 pedidos del mismo cliente y lugar son UNA parada', !!kCombo, kCombo);
    if (kCombo) {
      await evaluar(cli, 'abrirCobroRuta(' + JSON.stringify(kCombo) + ')');
      await pausa(700);
      c = await evaluar(cli, CUADRO);
      chk('el combo también ofrece la casilla', c.visible && c.tildada, c);
      chk('  y el hint nombra los 2 pedidos', /los 2 pedidos/i.test(c.hint), c.hint);
      await evaluar(cli, 'confirmarCobroRuta()');
      await pausa(1200);
      const e5 = await evaluar(cli, ESTADO);
      chk('el combo marca entregados los DOS pedidos',
        e5.ent.indexOf('Home|R9304') > -1 && e5.ent.indexOf('Home|R9305') > -1, e5.ent);
      chk('  y cobrados los dos',
        e5.cob.indexOf('Home|R9304') > -1 && e5.cob.indexOf('Home|R9305') > -1, e5.cob);
      chk('  ninguno entra a COBROS',
        e5.pend.indexOf('Home#9304') === -1 && e5.pend.indexOf('Home#9305') === -1, e5.pend);
      await pausa(DEMORA + 2500);
    }

    // ── 6. Nada roto ────────────────────────────────────────────────────
    chk('el loader no quedó pegado', await evaluar(cli, `!document.getElementById('rutLoaderOverlay').classList.contains('visible')`));
    const desb = await evaluar(cli, `Math.max(0, document.documentElement.scrollWidth - window.innerWidth)`);
    chk('no desborda a lo ancho', desb <= 1, desb);
    const errs = await evaluar(cli, 'window.__err.concat(window.__errores)');
    chk('sin errores de JS', errs.length === 0, errs);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTÓ: ' + e.message); process.exit(1); });
