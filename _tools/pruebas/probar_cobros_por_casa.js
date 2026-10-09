/* Ruta > COBROS: una tarjeta por CASA, no por nombre tipeado. (9/10/2026)

     node probar_cobros_por_casa.js [ancho] [archivo]
     node probar_cobros_por_casa.js 390 ruta_viejo_tmp.html   ← la contraria

   El 9/10/2026 la misma clienta salía en dos tarjetas: un pedido a nombre de
   "Vicky ..." y otro de "Victoria ...", mismo lote y el mismo teléfono escrito
   con y sin el 549. La pantalla agrupaba por nombre + teléfono.

   La clave la manda el backend en `ck` (barrio | sub barrio | lote; sin lote,
   el teléfono normalizado del CRM) y el nombre del CRM en `cn`.

   Sostiene:
   · dos pedidos de la misma casa con nombres distintos = UNA tarjeta, con el
     total sumado, los dos números, y cobrar y comprobante por pedido;
   · el nombre de la tarjeta es el del CRM, y el otro va chico en su renglón;
   · el mismo apellido en OTRA casa sigue aparte;
   · Clubes (sin `ck`) sigue como estaba;
   · nada se sale de la tarjeta ni de la pantalla.

   Nombres inventados: este repo es público. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'ruta.html';
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

const c = o => Object.assign({ totalOriginal: o.$, cobradoParcial: 0, parciales: [], es: 'Entregado', fp: 'Transferencia', de: 'Viernes', fe: '09/10/2026', fePed: '08/10/2026', feEnt: '09/10/2026', env: 0, desc: 0, sub: o.$, p: [{ a: 'PPM', q: 1 }] }, o);
const CASA_A = 'c:barrio uno|sub alto|72', CASA_B = 'c:barrio uno|sub bajo|5';
const COBROS = [
  /* La misma casa, dos nombres y el teléfono escrito de dos formas. */
  c({ key: 'Home|901', h: 'Home', id: '901', r: 901, c: 'Vera Pruebaz', t: '5491150000072', $: 69455, ck: CASA_A, cn: 'Verónica Prueba' }),
  c({ key: 'Home|902', h: 'Home', id: '902', r: 902, c: 'veronica prueba', t: '1150000072', $: 48015.5, ck: CASA_A, cn: 'Verónica Prueba' }),
  /* El mismo apellido, otra casa. */
  c({ key: 'Home|903', h: 'Home', id: '903', r: 903, c: 'Sofi Prueba', t: '1150000005', $: 20000, ck: CASA_B, cn: 'Sofi Prueba' }),
  /* Clubes no trae casa. */
  c({ key: 'Clubes|77', h: 'Clubes', id: '77', r: 77, c: 'Plantel Prueba', t: '', $: 91000 })
];
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Cuenta Prueba', tipo: 'digital', col: 3, alias: 'aliasprueba', banco: 'Banco', def: true, inv: true }
];
const PREP = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  try{localStorage.clear();}catch(e){}
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST'){ var bd={}; try{bd=JSON.parse(o.body);}catch(e){} window.__posts.push(bd); return J({ok:true}); }
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:[],cuentas:${JSON.stringify(CUENTAS)},arm:{},rep:{},hechas:[]});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:${JSON.stringify(COBROS)},billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)},prods:{PPM:{n:'Pack Prueba',u:'u'}}});
    if(url.indexOf('action=precios')>-1) return J({PPM:{p:17000,c:9200}});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();`;

const LEER = `(function(){
  var cards=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card'));
  var vw=document.documentElement.clientWidth;
  return { n: cards.length, vw: vw, cards: cards.map(function(k){
    var r=k.getBoundingClientRect();
    var bs=[].slice.call(k.querySelectorAll('button')).filter(function(b){return b.getBoundingClientRect().width>0;});
    return { txt:k.textContent.replace(/\\s+/g,' ').trim(),
      nombre:(k.querySelector('.cobro-card-name')||{}).textContent||'',
      total:(k.querySelector('.cobro-card-total')||{}).textContent||'',
      cobrar:bs.filter(function(b){return /^Cobrar$/.test(b.textContent.trim());}).length,
      comp:bs.filter(function(b){return /abrirCobroPendiente|cobroPedirComprobante/.test(b.getAttribute('onclick')||'')&&/cobroPedirComprobante/.test(b.getAttribute('onclick'));}).length,
      chico:[].map.call(k.querySelectorAll('.cobro-otro-nombre'),function(x){return x.textContent;}),
      afuera:bs.filter(function(b){var q=b.getBoundingClientRect();return q.right>r.right+1||q.left<r.left-1;}).length,
      ancho:Math.round(r.right), izq:Math.round(r.left) }; }) };
})()`;

(async () => {
  const cli = await abrir();
  const salir = x => { try { cli.matar(); } catch (e) {} process.exit(x); };
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    console.log('\n== Ruta > COBROS: una tarjeta por casa · ' + ARCH + ' · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE });
    if (!await esperar(cli, "typeof switchTab==='function' && typeof abrirCobroComboCobros==='function'")) throw new Error('la sub-app no arranco');
    await pausa(600);
    await ev(cli, `switchTab('cobros')`);
    if (!await esperar(cli, `document.querySelectorAll('#cobrosContent .cobro-card').length>=3`, 20000)) throw new Error('COBROS no pinto las tarjetas');
    await pausa(800);
    const L = await ev(cli, LEER);
    console.log('  (tarjetas en pantalla: ' + L.n + ', sobre ' + COBROS.length + ' pedidos)');
    chk('4 pedidos, 3 tarjetas: la casa repetida es UNA', L.n === 3, L.cards && L.cards.map(x => x.nombre));
    const casa = (L.cards || []).filter(x => /#901/.test(x.txt))[0] || {};
    chk('la tarjeta de la casa trae los DOS pedidos', /#901/.test(casa.txt || '') && /#902/.test(casa.txt || ''), casa.txt);
    chk('   y suma los dos montos ($117.470,50)', /117\.470/.test(casa.total || ''), casa.total);
    chk('   con el nombre del CRM arriba', /Verónica Prueba/.test(casa.nombre || ''), casa.nombre);
    chk('   y el nombre distinto, chico, en su renglón', (casa.chico || []).length === 1 && /Vera Pruebaz/.test(casa.chico[0]), casa.chico);
    chk('   "veronica prueba" es el mismo nombre: no se repite', !(casa.chico || []).some(x => /veronica prueba/i.test(x)), casa.chico);
    chk('   un Cobrar por pedido', casa.cobrar === 2, casa.cobrar);
    chk('   un Pedir comprobante por pedido', casa.comp === 2, casa.comp);
    const otra = (L.cards || []).filter(x => /Sofi Prueba/.test(x.txt))[0] || {};
    chk('el mismo apellido en OTRA casa sigue en su tarjeta', !!otra.txt && !/#901|#902/.test(otra.txt), otra.txt);
    chk('Clubes, sin casa, sigue saliendo', (L.cards || []).some(x => /Plantel Prueba/.test(x.txt)));
    chk('ningún botón se sale de su tarjeta', (L.cards || []).every(x => x.afuera === 0), (L.cards || []).map(x => x.afuera));
    chk('ninguna tarjeta se sale de la pantalla', (L.cards || []).every(x => x.ancho <= L.vw + 1 && x.izq >= -1), { vw: L.vw, a: (L.cards || []).map(x => [x.izq, x.ancho]) });
    /* Cobrar sigue siendo por pedido: el Cobrar del segundo abre SU cuadro. */
    await ev(cli, `(function(){var k=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter(function(x){return /#902/.test(x.textContent);})[0];
      var b=[].slice.call(k.querySelectorAll('button')).filter(function(x){return /^Cobrar$/.test(x.textContent.trim());})[1]; b.click();})()`);
    await pausa(500);
    const st = await ev(cli, `(function(){try{return {key:String(_cobroRutaState&&_cobroRutaState.key||''),tot:Number(_cobroRutaState&&(_cobroRutaState.total||_cobroRutaState.monto)||0)};}catch(e){return {err:String(e)};}})()`);
    chk('el Cobrar de un pedido abre el cuadro de ESE pedido', /902/.test(String(st.key || '')) && !/901/.test(String(st.key || '')), st);
    const errs = await ev(cli, 'window.__errores');
    chk('sin errores de JS', Array.isArray(errs) && errs.length === 0, errs);
    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
