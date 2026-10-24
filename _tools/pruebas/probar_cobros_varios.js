/* Ruta > COBROS: un cliente que debe VARIOS pedidos. (24/10/2026)

     node _tools/servir.js <puerto>     (en otra terminal)
     BASE=http://localhost:<puerto> node _tools/pruebas/probar_cobros_varios.js [ancho] [archivo]
     ... probar_cobros_varios.js 390 ruta_viejo_tmp.html   <- la contraria, rojo

   El caso real fue el de una casa con 7 pedidos de cuatro fechas, cargados en
   efectivo y en transferencia: la tarjeta solo dejaba cobrar de a uno o todos.

   Sostiene:
   · una tarjeta para la casa, con lo que debe (sin centavos) y desde cuándo;
   · cada pedido es un renglón que se tilda; arranca todo tildado;
   · el botón cobra LO TILDADO: el texto dice cuántos y cuánto, y abre el cuadro
     de esos pedidos (uno solo = el cuadro del pedido; dos o más = el combo);
   · lo tildado sobrevive al repintado de la lista (por pedido, no por índice);
   · «Ninguno» deja el botón apagado; «Todos» vuelve;
   · «Me pagó $» tilda los más viejos que entran enteros y dice lo que sobra;
     si no alcanza para el más viejo, lo dice y no toca nada;
   · con una sola forma de pago, lo que pagó ya viene escrito en el cuadro;
   · «Copiar detalle» copia solo lo tildado;
   · los renglones se pueden tocar (≥ 44 px) y nada se sale de la pantalla.

   Nombres inventados: este repo es público. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'ruta.html';
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

const CASA = 'c:barrio prueba|sub alto|289';
const c = o => Object.assign({ totalOriginal: o.$, cobradoParcial: 0, parciales: [], es: 'Entregado', env: 0, desc: 0, sub: o.$, p: [{ a: 'PPM', q: 1 }], ck: CASA, cn: 'Padre Prueba', t: '1150000289', r: Number(o.id) }, o);
/* Desordenados a proposito: la tarjeta los tiene que ordenar del mas viejo al mas nuevo. */
const COBROS = [
  c({ key: 'Home|7005', h: 'Home', id: '7005', c: 'Hijo Prueba', $: 18000, fp: 'Efectivo', de: 'Martes', fe: '20/10/2026', fePed: '20/10/2026' }),
  c({ key: 'Home|7001', h: 'Home', id: '7001', c: 'Padre Prueba', $: 18000, fp: 'Efectivo', de: 'Viernes', fe: '16/10/2026', fePed: '16/10/2026' }),
  c({ key: 'Home|7002', h: 'Home', id: '7002', c: 'Padre Prueba', $: 56943.9, fp: 'Transferencia', de: 'Domingo', fe: '18/10/2026', fePed: '16/10/2026' }),
  c({ key: 'Home|7003', h: 'Home', id: '7003', c: 'Padre Prueba', $: 56304, fp: 'Efectivo', de: 'Domingo', fe: '18/10/2026', fePed: '18/10/2026' }),
  c({ key: 'Home|7004', h: 'Home', id: '7004', c: 'Padre Prueba', $: 36000, fp: 'Efectivo', de: 'Domingo', fe: '18/10/2026', fePed: '18/10/2026' }),
  c({ key: 'Home|7006', h: 'Home', id: '7006', c: 'Hijo Prueba', $: 86013, fp: 'Transferencia', de: 'Jueves', fe: '22/10/2026', fePed: '22/10/2026', es: 'Pendiente' }),
  /* Otra casa con un solo pedido: tarjeta suelta, como siempre. */
  c({ key: 'Home|7100', h: 'Home', id: '7100', c: 'Vecina Prueba', $: 20000, fp: 'Efectivo', de: 'Viernes', fe: '23/10/2026', fePed: '23/10/2026', ck: 'c:barrio prueba|sub bajo|5', cn: 'Vecina Prueba' })
];
const TOTAL = 18000 + 56943.9 + 56304 + 36000 + 18000 + 86013;   // 271.260,9 -> $271.261
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Cuenta Prueba', tipo: 'digital', col: 3, alias: 'aliasprueba', banco: 'Banco', def: true, inv: true },
  /* Una segunda cuenta digital que NO es la principal: al cliente no se le nombra. */
  { id: 'otra', nombre: 'Otra Prueba', tipo: 'digital', col: 7, alias: 'aliasotra', banco: 'Otro Banco', def: false, inv: false }
];
const PREP = `
  window.__posts=[]; window.__errores=[]; window.__copiado='';
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  try{localStorage.clear();}catch(e){}
  try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:function(t){window.__copiado=String(t);return Promise.resolve();}}});}catch(e){}
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST'){ var bd={}; try{bd=JSON.parse(o.body);}catch(e){} window.__posts.push(bd); return J({ok:true}); }
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:[],cuentas:${JSON.stringify(CUENTAS)},arm:{},rep:{},hechas:[]});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:${JSON.stringify(COBROS)},billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)},prods:{PPM:{n:'Pack Prueba',u:'u'}}});
    if(url.indexOf('action=precios')>-1) return J({PPM:{p:17000,c:9200}});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();`;

/* La tarjeta de la casa, leida del DOM. */
const LEER = `(function(){
  var k=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter(function(x){return /#7001/.test(x.textContent);})[0];
  if(!k)return {n:0};
  var vw=document.documentElement.clientWidth, r=k.getBoundingClientRect();
  var rows=[].slice.call(k.querySelectorAll('[role=checkbox]'));
  var bs=[].slice.call(k.querySelectorAll('button')).filter(function(b){return b.getBoundingClientRect().width>0;});
  var cob=bs.filter(function(b){return /cobGrpCobrar/.test(b.getAttribute('onclick')||'');})[0];
  return { n:document.querySelectorAll('#cobrosContent .cobro-card').length, txt:k.textContent.replace(/\\s+/g,' '),
    ids: rows.map(function(x){return (x.textContent.match(/#(\\d+)/)||[])[1];}),
    on: rows.map(function(x){return x.getAttribute('aria-checked')==='true';}),
    altos: rows.map(function(x){return Math.round(x.getBoundingClientRect().height);}),
    boton: cob?{txt:cob.textContent.trim(),dis:!!cob.disabled}:null,
    afuera: bs.filter(function(b){var q=b.getBoundingClientRect();return q.right>r.right+1||q.left<r.left-1;}).length,
    der: Math.round(r.right), izq: Math.round(r.left), vw: vw, sw: document.documentElement.scrollWidth };
})()`;
const TOCAR = id => `(function(){var b=[].slice.call(document.querySelectorAll('#cobrosContent [role=checkbox]')).filter(function(x){return x.textContent.indexOf('#${id}')>=0;})[0]; if(b)b.click(); return !!b;})()`;
const BOTON = re => `(function(){var k=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter(function(x){return /#7001/.test(x.textContent);})[0];
  var b=[].slice.call(k.querySelectorAll('button')).filter(function(x){return ${re}.test(x.getAttribute('onclick')||'')||${re}.test(x.textContent);})[0]; if(b)b.click(); return !!b;})()`;
const ESTADO = `(function(){try{var s=_cobroRutaState;if(!s)return null;var ov=document.getElementById('cobroRutaOverlay');
  return {key:String(s.key||''),combo:!!s.combo,ids:(s.pedidos||[]).map(function(p){return String(p.id);}),fp:s.fp||'',
    ef:(document.getElementById('cobroRecEf')||{}).value||'',mp:(document.getElementById('cobroRecMP')||{}).value||''};}catch(e){return {err:String(e)};}})()`;
const CERRAR = `(function(){try{cerrarCobroRuta();}catch(e){} return 1;})()`;
const pesos = n => '$' + Math.round(n).toLocaleString('es-AR');

(async () => {
  const cli = await abrir();
  const salir = x => { try { cli.matar(); } catch (e) {} process.exit(x); };
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    console.log('\n== Ruta > COBROS: un cliente que debe varios · ' + ARCH + ' · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE });
    if (!await esperar(cli, "typeof switchTab==='function' && typeof abrirCobroComboCobros==='function'")) throw new Error('la sub-app no arranco');
    await pausa(600);
    await ev(cli, `switchTab('cobros')`);
    if (!await esperar(cli, `/#7001/.test((document.getElementById('cobrosContent')||{}).textContent||'')`, 20000)) throw new Error('COBROS no pinto la casa');
    await pausa(600);

    console.log('\n-- la tarjeta --');
    let L = await ev(cli, LEER);
    chk('la casa es UNA tarjeta con sus 6 pedidos (y la vecina aparte)', L.n === 2 && (L.ids || []).length === 6, L);
    chk('del más viejo al más nuevo', JSON.stringify(L.ids) === '["7001","7002","7003","7004","7005","7006"]', L.ids);
    chk('dice lo que debe, sin centavos', (L.txt || '').indexOf(pesos(TOTAL)) >= 0 && !/,9\b/.test(L.txt || ''), (L.txt || '').slice(0, 200));
    chk('y desde cuándo debe', /debe desde vie 16\/10/.test(L.txt || ''), (L.txt || '').slice(0, 200));
    chk('dice cuál falta entregar', /Sin entregar/.test(L.txt || ''));
    chk('arranca todo tildado', (L.on || []).length === 6 && L.on.every(Boolean), L.on);
    chk('el botón dice cobrar los 6 y cuánto', !!L.boton && /Cobrar los 6/.test(L.boton.txt) && L.boton.txt.indexOf(pesos(TOTAL)) >= 0, L.boton);
    chk('los renglones se pueden tocar (≥ 44 px)', (L.altos || []).length === 6 && L.altos.every(h => h >= 44), L.altos);
    chk('nada se sale de la tarjeta ni de la pantalla', L.afuera === 0 && L.der <= L.vw + 1 && L.izq >= -1 && L.sw <= L.vw + 1, { a: L.afuera, der: L.der, vw: L.vw, sw: L.sw });

    console.log('\n-- tildar --');
    await ev(cli, TOCAR('7003'));
    L = await ev(cli, LEER);
    const sin3 = TOTAL - 56304;
    chk('destildar uno lo saca del botón', L.on && L.on[2] === false && /Cobrar 5 de 6/.test(L.boton.txt) && L.boton.txt.indexOf(pesos(sin3)) >= 0, L.boton);
    chk('y dice lo que queda debiendo', /Quedan 1 sin cobrar/.test(L.txt) && L.txt.indexOf(pesos(56304)) >= 0);
    await ev(cli, `(function(){var el=document.getElementById('cobrosContent');el.__sig=null;renderCobrosFromServer();return 1;})()`);
    await ev(cli, `fetchCobrosPendientes(true)`);
    await pausa(1200);
    L = await ev(cli, LEER);
    chk('lo tildado sobrevive al repintado y a volver a pedir la lista', L.on && L.on[2] === false && L.on.filter(Boolean).length === 5, L.on);

    await ev(cli, BOTON('/cobGrpTodos\\(this,false\\)/'));
    L = await ev(cli, LEER);
    chk('«Ninguno» destilda todo y apaga el botón', L.on.every(x => !x) && L.boton.dis === true && /Tildá/.test(L.boton.txt), L.boton);
    await ev(cli, BOTON('/cobGrpTodos\\(this,true\\)/'));
    L = await ev(cli, LEER);
    chk('«Todos» los vuelve a tildar', L.on.every(Boolean) && /Cobrar los 6/.test(L.boton.txt), L.boton);

    console.log('\n-- cobrar uno solo --');
    await ev(cli, BOTON('/cobGrpTodos\\(this,false\\)/'));
    await ev(cli, TOCAR('7004'));
    L = await ev(cli, LEER);
    chk('con uno tildado el botón dice «Cobrar 1 pedido»', /Cobrar 1 pedido/.test(L.boton.txt) && L.boton.txt.indexOf(pesos(36000)) >= 0, L.boton);
    await ev(cli, BOTON('/cobGrpCobrar/'));
    await pausa(500);
    let st = await ev(cli, ESTADO);
    chk('abre el cuadro de ESE pedido, no un combo', !!st && !st.combo && /7004/.test(st.key), st);
    await ev(cli, CERRAR); await pausa(300);

    console.log('\n-- me pagó un monto --');
    await ev(cli, `(function(){var i=document.querySelector('#cobrosContent .cg-pago input');i.value='100000';i.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()`);
    await ev(cli, BOTON('/cobGrpElegirPago/'));
    L = await ev(cli, LEER);
    /* 18.000 + 56.944 = 74.944; el tercero (56.304) ya no entra. */
    chk('tilda los más viejos que entran enteros', JSON.stringify(L.on) === '[true,true,false,false,false,false]', L.on);
    chk('y dice lo que sobra y lo que queda', /cubrís los 2 más viejos/.test(L.txt) && L.txt.indexOf('Sobran ' + pesos(100000 - 18000 - 56943.9)) >= 0 && /Queda debiendo/.test(L.txt), L.txt.slice(L.txt.indexOf('Con $'), L.txt.indexOf('Con $') + 200));
    await ev(cli, BOTON('/cobGrpCobrar/'));
    await pausa(600);
    st = await ev(cli, ESTADO);
    chk('el cuadro es el combo de esos dos', !!st && st.combo && JSON.stringify(st.ids) === '["7001","7002"]', st);
    chk('con formas de pago distintas no elige por vos', !!st && !st.fp, st);
    await ev(cli, CERRAR); await pausa(300);

    await ev(cli, `(function(){var i=document.querySelector('#cobrosContent .cg-pago input');i.value='5000';i.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()`);
    const antes = (await ev(cli, LEER)).on;
    await ev(cli, BOTON('/cobGrpElegirPago/'));
    L = await ev(cli, LEER);
    chk('si no alcanza para el más viejo lo dice y no toca lo tildado', /No alcanza para el más viejo/.test(L.txt) && JSON.stringify(L.on) === JSON.stringify(antes), L.on);

    console.log('\n-- una sola forma de pago --');
    await ev(cli, BOTON('/cobGrpTodos\\(this,false\\)/'));
    await ev(cli, `(function(){var i=document.querySelector('#cobrosContent .cg-pago input');i.value='60000';i.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()`);
    await ev(cli, BOTON('/cobGrpElegirPago/'));
    /* 18.000 entra, 56.944 no: queda solo el #7001 (efectivo). */
    await ev(cli, BOTON('/cobGrpCobrar/'));
    await pausa(600);
    st = await ev(cli, ESTADO);
    chk('lo que pagó ya viene escrito en el cuadro ($60.000 en efectivo)', !!st && /7001/.test(st.key) && Number(String(st.ef).replace(/[^0-9]/g, '')) === 60000, st);
    await ev(cli, CERRAR); await pausa(300);
    /* Se suma el #7004 a mano. */
    await ev(cli, TOCAR('7004'));
    await ev(cli, BOTON('/cobGrpCobrar/'));
    await pausa(600);
    st = await ev(cli, ESTADO);
    chk('dos en efectivo: el combo elige efectivo', !!st && st.combo && st.fp === 'Efectivo' && JSON.stringify(st.ids) === '["7001","7004"]', st);
    await ev(cli, CERRAR); await pausa(300);

    console.log('\n-- copiar --');
    await ev(cli, BOTON('/cobGrpTodos\\(this,false\\)/'));
    await ev(cli, TOCAR('7002')); await ev(cli, TOCAR('7006'));
    await ev(cli, `window.__copiado=''; 1`);
    await ev(cli, BOTON('/cobGrpCopiar/'));
    await pausa(500);
    const cp = await ev(cli, `window.__copiado`);
    chk('«Copiar detalle» copia solo lo tildado', /7002/.test(cp) && /7006/.test(cp) && !/7001|7003|7004|7005/.test(cp), String(cp).slice(0, 300));
    chk('el detalle da solo el alias de la cuenta principal', /Para abonar: aliasprueba \(Banco\)\n/.test(cp) && !/aliasotra/.test(cp), String(cp).slice(String(cp).indexOf('Para abonar'), String(cp).indexOf('Para abonar') + 80));
    await ev(cli, `window.__copiado=''; 1`);
    await ev(cli, BOTON('/cobGrpComprobante/'));
    await pausa(500);
    const cc = await ev(cli, `window.__copiado`);
    chk('el pedido de comprobante también', /aliasprueba/.test(cc) && !/aliasotra/.test(cc), cc);

    const errs = await ev(cli, 'window.__errores');
    chk('sin errores de JS', Array.isArray(errs) && errs.length === 0, errs);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); mal++; }
  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
