/* El cuadro de cobro: el combo como UN cobro y el vuelto por transferencia con
   su cuenta (12/9/2026).

   node probar_cobro_combo.js [390|1440] [ruta.html]

   El caso que lo motivo, con datos INVENTADOS (este repo es publico): dos pedidos
   del mismo cliente para la misma entrega, uno cargado en EFECTIVO con el 10% y
   $5.000 de envio, el otro por TRANSFERENCIA con $5.000 de envio. Al cliente le
   dijeron el subtotal pelado por el Brubank. El cuadro viejo pedia otra cosa:
   tomaba la forma de pago del primero (10% a los dos), cobraba el envio dos veces,
   y con el cuadro recien abierto decia "Propina automatica $-229.623" y ofrecia
   "Aceptar descuento" por el total.

   Lo que se sostiene:
     · con formas de pago distintas NO elige: pregunta, y el boton lo dice;
     · el envio va una sola vez, y se puede regalar;
     · el total y los POST dicen lo mismo, pedido por pedido;
     · el vuelto por transferencia pregunta de que cuenta salio (ninguna elegida);
     · con nada tipeado, no hay faltante ni propina negativa.
   Los POST se interceptan: nada llega al backend. */
'use strict';
const path = require('path');
const PRU = __dirname;
const { abrir, evaluar } = require(path.join(PRU, 'cdp.js'));

const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'ruta.html';
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOY = iso(hoyAR), HOYd = dmy(hoyAR), DIA = DIAS[hoyAR.getDay()];

const b = o => Object.assign({ oD: {}, oc: [], hr: '10:30', f: HOYd, de: DIA, fe: HOY, es: 'Pendiente', d: '', ep: 'No Cobrado', o: 'Deposito', cobradoParcial: 0 }, o);
const ENTREGAS = [
  /* El combo: misma persona, mismo lugar, formas de pago distintas. */
  b({ id: 9701, h: 'Pilar', r: 9701, c: 'Combo Distinto', t: '1150000091', b: 'Pilar', sb: 'Barrio Prueba', l: '22', fp: 'Efectivo',
      sub: 66750, env: 5000, desc: 6675, $: 65075, p: [{ a: 'CCo', q: 2.67 }],
      pz: [{ a: 'CCo', id: 'P-9001', kg: 1.154 }, { a: 'CCo', id: 'P-9002', kg: 1.516 }] }),
  b({ id: 9702, h: 'Pilar', r: 9702, c: 'Combo Distinto', t: '1150000091', b: 'Pilar', sb: 'Barrio Prueba', l: '22', fp: 'Transferencia',
      sub: 177276, env: 5000, desc: 0, $: 182276, p: [{ a: 'CLo', q: 5.372 }],
      pz: [{ a: 'CLo', id: 'P-9003', kg: 1.572 }, { a: 'CLo', id: 'P-9004', kg: 1.801 }, { a: 'CLo', id: 'P-9005', kg: 1.999 }] }),
  /* Un combo con la misma forma de pago: esa sí viene elegida. */
  b({ id: 9703, h: 'Pilar', r: 9703, c: 'Combo Igual', t: '1150000092', b: 'Pilar', sb: 'Otro Barrio', l: '5', fp: 'Efectivo',
      sub: 40000, env: 5000, desc: 4000, $: 41000, p: [{ a: 'PPM', q: 2 }] }),
  b({ id: 9704, h: 'Pilar', r: 9704, c: 'Combo Igual', t: '1150000092', b: 'Pilar', sb: 'Otro Barrio', l: '5', fp: 'Efectivo',
      sub: 20000, env: 5000, desc: 2000, $: 23000, p: [{ a: 'PPM', q: 1 }] }),
  /* El vuelto por transferencia: paga en efectivo de más. */
  b({ id: 9705, h: 'Home', r: 9705, c: 'Vuelto Transf', t: '1150000093', b: 'Estancias del Pilar', sb: 'Golf', l: '7', fp: 'Efectivo',
      sub: 25000, env: 0, desc: 2500, $: 22500, p: [{ a: 'PPM', q: 1 }] })
];
const ARM = {}; ENTREGAS.forEach(e => { ARM[e.h + '|R' + e.r] = { u: 'Prueba', hr: '10:00' }; });
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, alias: 'maleump', banco: 'Mercado Pago', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', col: 7, alias: 'maleubru', banco: 'Brubank', def: false, inv: false }
];
const PRECIOS = { CCo: { p: 25000, c: 18800 }, CLo: { p: 33000, c: 28500 }, PPM: { p: 20000, c: 11000 } };

const PREP = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  try{localStorage.clear();}catch(e){}
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST'){
      var bd={}; try{bd=JSON.parse(o.body);}catch(e){}
      window.__posts.push(bd);
      return J({ok:true,restante:0,cerrado:true,cuenta:bd.cuenta||'',cuentaCambio:bd.cuentaCambio||''});
    }
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:${JSON.stringify(ENTREGAS)},cuentas:${JSON.stringify(CUENTAS)},arm:${JSON.stringify(ARM)},rep:{},hechas:[]});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:[],billetera:5080,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)}});
    if(url.indexOf('action=precios')>-1) return J(${JSON.stringify(PRECIOS)});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();`;

/* Cada caso en una pagina nueva: confirmar un cobro deja promesas que cierran el
   cuadro del caso siguiente (anotado en probar_cta_cobro). */
let prepId = null;
async function arrancar(cli) {
  if (prepId) { try { await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: prepId }); } catch (e) {} }
  const r = await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
  prepId = r && r.identifier;
  await cli.enviar('Page.navigate', { url: BASE });
  if (!await esperar(cli, "typeof abrirCobroRuta==='function' && typeof getSorted==='function' && getSorted().length>=3"))
    throw new Error('la sub-app no arranco o no llegaron las entregas');
  await pausa(800);
}
const abrirCombo = (cli, cliente) => ev(cli, `(function(){var s=getSorted();for(var i=0;i<s.length;i++){var x=s[i];if(x._combo&&x._pedidos[0].c===${JSON.stringify(cliente)}){abrirCobroRuta(x._key);return x._key;}}return null;})()`);
const texto = (cli, sel) => ev(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent:null;})()`);
const valor = (cli, id) => ev(cli, `(document.getElementById(${JSON.stringify(id)})||{}).value`);
const boton = cli => ev(cli, `(function(){var b=document.getElementById('btnCobroRutaOk');return {dis:b.disabled,txt:b.textContent};})()`);
const visible = (cli, id) => ev(cli, `(function(){var e=document.getElementById(${JSON.stringify(id)});if(!e)return false;var s=getComputedStyle(e);return s.display!=='none'&&e.getBoundingClientRect().height>0;})()`);
const tocarCta = (cli, cont, id) => ev(cli, `(function(){var b=document.querySelector('#${cont} [data-cta="${id}"]');if(!b)return false;b.click();return true;})()`);

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.enable');

    console.log('\n── 1. Combo con formas de pago distintas ──');
    await arrancar(cli);
    const k1 = await abrirCombo(cli, 'Combo Distinto');
    chk('el combo se abre', !!k1, k1);
    await pausa(600);
    chk('el encabezado nombra los pedidos', /Pilar #9701 \+ #9702/.test(await texto(cli, '#cobroRutaSub') || ''), await texto(cli, '#cobroRutaSub'));
    const on1 = await ev(cli, `document.querySelectorAll('#cobroRutaFp .cobro-pill.on').length`);
    chk('NO viene ninguna forma de pago elegida', on1 === 0, on1);
    chk('dice que cada pedido se cargó distinto', /se cargó distinto/.test(await texto(cli, '#cobroFpHint') || '') && await visible(cli, 'cobroFpHint'), await texto(cli, '#cobroFpHint'));
    const prods = await texto(cli, '#cobroRutaProds') || '';
    chk('los productos dicen las piezas', /2 piezas: 1,154 y 1,516 kg/.test(prods) && /3 piezas: 1,572, 1,801 y 1,999 kg/.test(prods), prods);
    chk('y el precio de cada linea', /\$66\.750/.test(prods) && /\$177\.276/.test(prods), prods);
    const desc1 = await texto(cli, '#cobroRutaDescInfo') || '';
    chk('el envio va una sola vez', /\+ envío \$5\.000/.test(desc1) && /va una sola vez/.test(desc1), desc1);
    let bt = await boton(cli);
    chk('el boton frena y dice que falta elegir cómo pagó', bt.dis && /Elegí cómo te pagó/.test(bt.txt), bt);
    const err1 = await texto(cli, '#cobroRutaErr') || '';
    chk('con nada tipeado NO ofrece "Aceptar descuento"', !/Aceptar descuento/.test(err1), err1);
    chk('ni una propina negativa', !(await visible(cli, 'cobroSumPropRow')) && !/Propina automática/.test(await texto(cli, '.cobro-ruta-summary') || ''), await texto(cli, '.cobro-ruta-summary'));

    chk('tocar Brubank Lucas', await tocarCta(cli, 'cobroRutaFp', 'brubank') === true);
    await pausa(300);
    chk('queda elegida la pastilla del Brubank', await ev(cli, `!!document.querySelector('#cobroRutaFp [data-cta="brubank"].on')`));
    chk('transferencia: sin el 10% → subtotal + un envío = $249.026', /Total \$249\.026/.test(await texto(cli, '#cobroRutaSub') || ''), await texto(cli, '#cobroRutaSub'));
    chk('"¿Cuánto recibiste?" se carga en transferencia', await valor(cli, 'cobroRecMP') === '249.026', await valor(cli, 'cobroRecMP'));
    chk('el chip del envío de regalo mide al menos 38px', await ev(cli, `document.getElementById('cobroEnvRegalo').getBoundingClientRect().height>=38`) === true);
    await ev(cli, `document.getElementById('cobroEnvRegalo').click()`);
    await pausa(300);
    chk('envío de regalo → $244.026, lo que se le dijo', /Total \$244\.026/.test(await texto(cli, '#cobroRutaSub') || ''), await texto(cli, '#cobroRutaSub'));
    chk('la cuenta lo dice', /envío de regalo = \$244\.026/.test(await texto(cli, '#cobroRutaDescInfo') || ''), await texto(cli, '#cobroRutaDescInfo'));
    chk('y "recibiste" acompaña', await valor(cli, 'cobroRecMP') === '244.026', await valor(cli, 'cobroRecMP'));
    chk('el resumen: cierra justo', /Cierra justo/.test(await texto(cli, '#cobroSumPropRow') || '') && await visible(cli, 'cobroSumPropRow'), await texto(cli, '#cobroSumPropRow'));
    bt = await boton(cli);
    chk('el boton se habilita', !bt.dis, bt);
    await ev(cli, `window.__posts=[]; confirmarCobroRuta()`);
    await esperar(cli, `window.__posts.filter(function(p){return p.action==='marcarCobrado'}).length>=2`, 15000);
    const ps = await ev(cli, `window.__posts.filter(function(p){return p.action==='marcarCobrado'})`) || [];
    const p1 = (ps.find ? ps.find(p => p.id === '9701') : null) || {}, p2 = (ps.find ? ps.find(p => p.id === '9702') : null) || {};
    chk('salen los dos POST', ps.length === 2, ps.length);
    chk('#9701: transferencia al Brubank, $66.750, sin descuento y sin envío', p1.formaPago === 'Transferencia' && p1.cuenta === 'brubank' && p1.tr === 66750 && p1.ef === 0 && p1.recalcular === true && p1.noDescuento === true && p1.envio === 0, p1);
    chk('#9702: $177.276, sin envío', p2.tr === 177276 && p2.recalcular === true && p2.noDescuento === true && p2.envio === 0 && p2.cuenta === 'brubank', p2);
    chk('la plata de los POST suma lo que dijo la pantalla ($244.026)', (Number(p1.tr) || 0) + (Number(p2.tr) || 0) === 244026, [p1.tr, p2.tr]);

    console.log('\n── 2. Combo con la misma forma de pago ──');
    await arrancar(cli);
    await abrirCombo(cli, 'Combo Igual');
    await pausa(600);
    chk('viene elegido Efectivo', await ev(cli, `!!document.querySelector('#cobroRutaFp [data-fp="Efectivo"].on')`));
    chk('no dice que se cargaron distinto', !(await visible(cli, 'cobroFpHint')));
    chk('10% a los dos y un solo envío: 60.000 − 6.000 + 5.000 = $59.000', /Total \$59\.000/.test(await texto(cli, '#cobroRutaSub') || ''), await texto(cli, '#cobroRutaSub'));
    await ev(cli, `document.querySelector('#cobroRutaDescInfo [data-desc="sin"]').click()`);
    await pausa(250);
    chk('"Sin descuento" en el combo: $65.000', /Total \$65\.000/.test(await texto(cli, '#cobroRutaSub') || ''), await texto(cli, '#cobroRutaSub'));
    await ev(cli, `document.querySelector('#cobroRutaDescInfo [data-desc="otro"]').click()`);
    await ev(cli, `_setCobroDescTipo('monto'); var i=document.getElementById('cobroDescInp'); i.value='3000'; _onDescManualChange();`);
    await pausa(250);
    chk('"Otro" $3.000 repartido: $62.000', /Total \$62\.000/.test(await texto(cli, '#cobroRutaSub') || ''), await texto(cli, '#cobroRutaSub'));
    await ev(cli, `_setMoneyInput('cobroRecEf',62000);_recalcCobroRuta();`);
    await ev(cli, `window.__posts=[]; confirmarCobroRuta()`);
    await esperar(cli, `window.__posts.filter(function(p){return p.action==='marcarCobrado'}).length>=2`, 15000);
    const qs = await ev(cli, `window.__posts.filter(function(p){return p.action==='marcarCobrado'})`) || [];
    const dm = qs.reduce ? qs.reduce((a, p) => a + ((p.descuentoManual && p.descuentoManual.monto) || 0), 0) : -1;
    const efS = qs.reduce ? qs.reduce((a, p) => a + (Number(p.ef) || 0), 0) : -1;
    chk('los descuentos de los POST suman $3.000', dm === 3000, qs);
    chk('y el efectivo registrado suma $62.000', efS === 62000, efS);
    chk('un solo POST baja el envío', qs.filter ? qs.filter(p => p.envio === 0).length === 1 : false, qs.map ? qs.map(p => p.envio) : qs);

    console.log('\n── 3. El vuelto por transferencia ──');
    await arrancar(cli);
    await ev(cli, `abrirCobroRuta('Home|R9705')`);
    await pausa(500);
    chk('pedido suelto en efectivo abierto', /Vuelto Transf/.test(await texto(cli, '#cobroRutaTitle') || ''), await texto(cli, '#cobroRutaTitle'));
    await ev(cli, `_setMoneyInput('cobroRecEf',30000);_recalcCobroRuta();`);
    await ev(cli, `document.getElementById('cobroToggleCambio').click()`);
    await pausa(250);
    chk('al abrir "Devolví cambio" propone el vuelto en efectivo ($7.500)', await valor(cli, 'cobroCamEf') === '7.500', await valor(cli, 'cobroCamEf'));
    chk('en efectivo NO pregunta cuenta', !(await visible(cli, 'cobroCamCtaBox')));
    await ev(cli, `_setMoneyInput('cobroCamEf',0);_setMoneyInput('cobroCamMP',7500);_recalcCobroRuta();`);
    await pausa(200);
    chk('por transferencia SÍ pregunta de qué cuenta salió', await visible(cli, 'cobroCamCtaBox'));
    chk('ninguna cuenta viene elegida', await ev(cli, `document.querySelectorAll('#cobroCamCta .cobro-pill.on').length`) === 0);
    bt = await boton(cli);
    chk('el boton frena y lo dice', bt.dis && /de qué cuenta salió el vuelto/.test(bt.txt), bt);
    chk('las dos cuentas miden al menos 38px', await ev(cli, `[].every.call(document.querySelectorAll('#cobroCamCta .cobro-pill'),function(b){return b.getBoundingClientRect().height>=38})`) === true);
    chk('tocar Brubank en el vuelto', await tocarCta(cli, 'cobroCamCta', 'brubank') === true);
    await pausa(200);
    bt = await boton(cli);
    chk('el boton se habilita', !bt.dis, bt);
    await ev(cli, `window.__posts=[]; confirmarCobroRuta()`);
    await esperar(cli, `window.__posts.filter(function(p){return p.action==='marcarCobrado'}).length>=1`, 15000);
    const pv = ((await ev(cli, `window.__posts.filter(function(p){return p.action==='marcarCobrado'})`)) || [])[0] || {};
    chk('el POST lleva el vuelto y su cuenta', pv.cambioMP === 7500 && pv.cuentaCambio === 'brubank', pv);
    chk('y el cobro sigue en efectivo, sin cuenta', pv.formaPago === 'Efectivo' && pv.cuenta === '', pv);

    console.log('\n── 4. Sin desbordes ──');
    await arrancar(cli);
    await abrirCombo(cli, 'Combo Distinto');
    await pausa(500);
    const des = await ev(cli, `(function(){var box=document.querySelector('.cobro-ruta-box');var r=box.getBoundingClientRect();var n=0,malos=[];box.querySelectorAll('*').forEach(function(e){var q=e.getBoundingClientRect();if(q.width&&(q.right>r.right+1||q.left<r.left-1)){n++;malos.push((e.id||e.className||e.tagName)+' '+Math.round(q.right))}});return {n:n,malos:malos.slice(0,5),box:box.scrollWidth<=box.clientWidth+1};})()`);
    chk('nada se sale del cuadro', des && des.n === 0 && des.box, des);
    const errs = await ev(cli, 'window.__errores');
    chk('sin errores de consola', Array.isArray(errs) && errs.length === 0, errs);
  } catch (e) {
    mal++; console.log('  MAL  el test revento: ' + e.message);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
