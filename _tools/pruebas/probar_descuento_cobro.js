/* El descuento de un cobro, en un solo lugar (12/9/2026).

   node probar_descuento_cobro.js [390|1440] [ruta.html]

   El caso que lo motivo, con datos inventados: un pedido cargado en EFECTIVO
   con el 10% (subtotal $125.000, total $112.500) que el cliente termina pagando
   por TRANSFERENCIA. El cuadro de la card de RUTA pedia $112.500 —tenia que
   pedir $125.000— y no mostraba ningun descuento para sacar o poner.

   Lo que se sostiene, en las dos direcciones:
     · el total de la pantalla sigue a la forma de pago (el 10% es solo efectivo);
     · se puede elegir Sin descuento · 10% · el del pedido · Otro, y lo elegido
       manda aunque despues cambie la forma de pago;
     · el POST dice EXACTAMENTE lo que dice la pantalla (noDescuento o un monto),
       y si no cambio nada no recalcula;
     · un pedido sin subtotal (copia vieja) se cobra como antes, sin bloque.

   El POST contesta al toque: aca se mide lo que SALE, no la cola.
   Los datos son INVENTADOS: este repo es publico. */
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
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };

const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOY = iso(hoyAR), HOYd = dmy(hoyAR), DIA = DIAS[hoyAR.getDay()];

/* 100% Orden de Compra para entrar a RUTA sin ARMADO; un telefono y un lugar
   por cliente salvo el combo, que comparte los dos. */
const b = o => Object.assign({ oD: {}, oc: [], hr: '10:30', f: HOYd, de: DIA, fe: HOY, es: 'Pendiente',
  d: '', ep: 'No Cobrado', o: 'Orden de Compra', b: 'Estancias del Pilar', p: [{ a: 'PPM', q: 2 }] }, o);
const ENTREGAS = [
  b({ id: 9551, h: 'Home', r: 9551, c: 'Pago Transferencia', t: '1150000001', sb: 'Champagnat Alto', l: '1', fp: 'Efectivo', sub: 125000, env: 0, desc: 12500, $: 112500 }),
  b({ id: 9552, h: 'Home', r: 9552, c: 'Transferencia Con Diez', t: '1150000002', sb: 'Golf', l: '2', fp: 'Efectivo', sub: 125000, env: 0, desc: 12500, $: 112500 }),
  b({ id: 9553, h: 'Home', r: 9553, c: 'Sigue Efectivo', t: '1150000003', sb: 'La Pionera', l: '3', fp: 'Efectivo', sub: 125000, env: 0, desc: 12500, $: 112500 }),
  b({ id: 9554, h: 'Home', r: 9554, c: 'Veinte Por Ciento', t: '1150000004', sb: 'El Recuerdo', l: '4', fp: 'Transferencia', sub: 50000, env: 0, desc: 10000, $: 40000 }),
  b({ id: 9555, h: 'Home', r: 9555, c: 'Copia Vieja', t: '1150000005', sb: 'Santa Elena', l: '5', fp: 'Efectivo', $: 30000 }),
  b({ id: 9556, h: 'Pilar', r: 9556, c: 'Otro Descuento', t: '1150000006', b: 'Pilar', sb: 'Pilara', l: '6', fp: 'Transferencia', sub: 40000, env: 5000, desc: 0, $: 45000 }),
  b({ id: 9557, h: 'Home', r: 9557, c: 'Bulk Viejo', t: '1150000007', sb: 'Argentina 3', l: '7', fp: 'Transferencia', sub: 150000, env: 0, desc: 15000, $: 135000 }),
  b({ id: 9558, h: 'Home', r: 9558, c: 'Combo Efectivo', t: '1150000008', sb: 'Champagnat Bajo', l: '8', fp: 'Efectivo', sub: 20000, env: 0, desc: 2000, $: 18000 }),
  b({ id: 9559, h: 'Home', r: 9559, c: 'Combo Efectivo', t: '1150000008', sb: 'Champagnat Bajo', l: '8', fp: 'Efectivo', sub: 10000, env: 0, desc: 1000, $: 9000 })
];
const COBROS = [
  { h: 'Home', id: '9601', r: 9601, c: 'Cobros Efectivo', t: '1150000011', $: 54000, totalOriginal: 54000, fp: 'Efectivo', sub: 60000, env: 0, desc: 6000, cobradoParcial: 0, dir: 'Golf · Lote 11' },
  { h: 'Home', id: '9602', r: 9602, c: 'Con Parcial', t: '1150000012', $: 20000, totalOriginal: 30000, fp: 'Efectivo', sub: 33330, env: 0, desc: 3333, cobradoParcial: 10000, dir: 'Golf · Lote 12' }
];
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, alias: 'maleump', banco: 'Mercado Pago', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', col: 7, alias: 'maleubru', banco: 'Brubank', def: false, inv: false }
];

const PREP = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST'){
      var bd={}; try{bd=JSON.parse(o.body);}catch(e){}
      window.__posts.push(bd);
      return J({ok:true,restante:0,cerrado:true,cuenta:bd.cuenta||''});
    }
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:${JSON.stringify(ENTREGAS)},cuentas:${JSON.stringify(CUENTAS)},arm:{},hechas:[]});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:${JSON.stringify(COBROS)},billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)}});
    if(url.indexOf('action=pendientesGuardarStock')>-1) return J({ok:true,items:[]});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();
  window.confirm=function(){return true;}; window.alert=function(){};
  try{ if(!sessionStorage.getItem('__descSembrado')){ localStorage.clear(); sessionStorage.setItem('__descSembrado','1'); } }catch(e){}
`;

const CUADRO = `(function(){
  var el=document.getElementById('cobroRutaDescInfo'), on=el?el.querySelector('.cobro-desc-chip.on'):null;
  var chips=el?[].slice.call(el.querySelectorAll('.cobro-desc-chip')):[];
  var r=el?el.getBoundingClientRect():null;
  var ov=document.getElementById('cobroRutaOverlay');
  return { abierto:!!(ov&&!ov.classList.contains('hidden')),
    sub:(document.getElementById('cobroRutaSub')||{}).textContent||'',
    bloque:!!(el&&el.style.display!=='none'), texto:el?el.textContent.replace(/\\s+/g,' ').trim():'',
    on:on?on.getAttribute('data-desc'):'', chips:chips.map(function(c){return c.getAttribute('data-desc');}),
    chipMin:chips.length?Math.min.apply(null,chips.map(function(c){return Math.round(c.getBoundingClientRect().height);})):0,
    ancho:r?Math.round(r.right):0,
    otro:(document.getElementById('cobroDescSection')||{style:{}}).style.display!=='none',
    total:(_cobroRutaState||{}).total, recEf:_parseMoneyInput(document.getElementById('cobroRecEf')), recMP:_parseMoneyInput(document.getElementById('cobroRecMP')) };
})()`;
/* Deja lo recibido igual al total en el metodo elegido (en efectivo, un total
   que no es redondo no se autocarga a proposito) y confirma. */
const CONFIRMAR = `(function(){ var st=_cobroRutaState; if(!st)return 'sin cuadro';
  if(st.fp==='Efectivo'){_setMoneyInput('cobroRecEf',st.total);_setMoneyInput('cobroRecMP',0);}
  else if(st.fp==='Transferencia'){_setMoneyInput('cobroRecEf',0);_setMoneyInput('cobroRecMP',st.total);}
  var r=_recalcCobroRuta(); if(r&&r.errors&&r.errors.length)return 'errores: '+r.errors.join(' | ');
  confirmarCobroRuta(); return 'ok'; })()`;
const POST = id => `(window.__posts.filter(function(p){return p.action==='marcarCobrado'&&String(p.id)==='${id}';})[0]||null)`;
const MONEY = n => '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
  console.log('\n=== El descuento de un cobro · ' + ANCHO + 'px ===');
  await cli.enviar('Page.navigate', { url: BASE });
  try {
    if (!await esperar(cli, '(function(){try{return getPendientes().length===' + ENTREGAS.length + '}catch(e){return false}})()')) {
      console.log('no llegaron las entregas stubbeadas'); process.exit(1);
    }
    await evaluar(cli, 'switchTab("ruta")');
    await esperar(cli, '(RUT_CTAS||[]).length===3', 20000);
    await pausa(600);
    let c, r, p;

    console.log('\n-- 1. cargado en efectivo, paga por transferencia --');
    await evaluar(cli, 'abrirCobroRuta("Home|R9551")'); await pausa(500);
    c = await evaluar(cli, CUADRO);
    chk('el cuadro abre', c.abierto, c);
    chk('en efectivo pide $112.500', /112\.500/.test(c.sub), c.sub);
    chk('el bloque DESCUENTO se ve', c.bloque, c);
    chk('  prende "10%" y dice por que', c.on === 'diez' && /efectivo/i.test(c.texto), { on: c.on, t: c.texto });
    chk('  ofrece Sin descuento · 10% · Otro', JSON.stringify(c.chips) === '["sin","diez","otro"]', c.chips);
    chk('  los botones llegan a 40px', c.chipMin >= 40, c.chipMin);
    chk('  y no se sale del ancho', c.ancho <= ANCHO, c.ancho);
    await evaluar(cli, '_setCobroFpCta("mp")'); await pausa(400);
    c = await evaluar(cli, CUADRO);
    chk('al tocar Mercado Pago pide $125.000', /125\.000/.test(c.sub) && c.total === 125000, c.sub);
    chk('  "¿Cuánto recibiste?" se carga con $125.000', c.recMP === 125000 && c.recEf === 0, c);
    chk('  prende "Sin descuento" y dice que el 10% es solo efectivo', c.on === 'sin' && /solo pagando en efectivo/i.test(c.texto), { on: c.on, t: c.texto });
    r = await evaluar(cli, CONFIRMAR); await pausa(700);
    p = await evaluar(cli, POST(9551));
    chk('confirma', r === 'ok', r);
    chk('el POST cobra $125.000 por transferencia', p && p.tr === 125000 && p.ef === 0 && p.formaPago === 'Transferencia', p);
    chk('  y le dice al backend que SAQUE el descuento', p && p.recalcular === true && p.noDescuento === true && !p.descuentoManual, p);
    chk('  a la cuenta elegida', p && p.cuenta === 'mp', p && p.cuenta);

    console.log('\n-- 2. transferencia, pero le deja el 10% --');
    await evaluar(cli, 'abrirCobroRuta("Home|R9552")'); await pausa(400);
    await evaluar(cli, '_setCobroFpCta("brubank")'); await pausa(300);
    await evaluar(cli, '_setCobroDesc("diez")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('"10%" con transferencia vuelve a $112.500', c.total === 112500 && c.on === 'diez', c);
    chk('  y dice que lo eligio la persona', /lo elegiste vos/i.test(c.texto), c.texto);
    r = await evaluar(cli, CONFIRMAR); await pausa(700);
    p = await evaluar(cli, POST(9552));
    chk('el POST manda el 10% como monto explicito', p && p.recalcular === true && p.descuentoManual && p.descuentoManual.monto === 12500 && p.tr === 112500 && !p.noDescuento, p);

    console.log('\n-- 3. sigue en efectivo: no hay nada que recalcular --');
    await evaluar(cli, 'abrirCobroRuta("Home|R9553")'); await pausa(400);
    r = await evaluar(cli, CONFIRMAR); await pausa(700);
    p = await evaluar(cli, POST(9553));
    chk('cobra $112.500 en efectivo', p && p.ef === 112500 && p.formaPago === 'Efectivo', p);
    chk('  sin recalcular (nada cambio)', p && !p.recalcular && !p.noDescuento && !p.descuentoManual, p);

    console.log('\n-- 4. un descuento especial con el que se cargo --');
    await evaluar(cli, 'abrirCobroRuta("Home|R9554")'); await pausa(400);
    await evaluar(cli, '_setCobroFpCta("mp")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('respeta el 20% del pedido: $40.000', c.total === 40000 && c.on === 'pedido', c);
    chk('  y lo ofrece como chip propio', c.chips.indexOf('pedido') > -1 && /20%/.test(c.texto), c.chips);
    await evaluar(cli, '_setCobroDesc("sin")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('"Sin descuento" lo lleva a $50.000', c.total === 50000 && c.on === 'sin', c);
    await evaluar(cli, '_setCobroDesc("pedido")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('"El del pedido" lo devuelve a $40.000', c.total === 40000 && c.on === 'pedido', c);
    await evaluar(cli, '_setCobroDesc("sin")'); await pausa(200);
    r = await evaluar(cli, CONFIRMAR); await pausa(700);
    p = await evaluar(cli, POST(9554));
    chk('el POST saca el descuento especial', p && p.noDescuento === true && p.tr === 50000, p);

    console.log('\n-- 5. copia vieja, sin subtotal --');
    await evaluar(cli, 'abrirCobroRuta("Home|R9555")'); await pausa(400);
    c = await evaluar(cli, CUADRO);
    chk('sin subtotal no dibuja el bloque', !c.bloque && !c.otro, c);
    chk('  y cobra lo guardado: $30.000', c.total === 30000, c.total);
    await evaluar(cli, '_setCobroFpCta("mp")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('  aunque cambie a transferencia (no inventa)', c.total === 30000, c.total);
    r = await evaluar(cli, CONFIRMAR); await pausa(700);
    p = await evaluar(cli, POST(9555));
    chk('  y el POST no pide recalcular', p && !p.recalcular && p.tr === 30000, p);

    console.log('\n-- 6. Otro: % y $ fijo, con envio --');
    await evaluar(cli, 'abrirCobroRuta("Pilar|R9556")'); await pausa(400);
    await evaluar(cli, '_setCobroFpCta("mp")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('Pilar con envio, sin descuento: $45.000', c.total === 45000 && c.on === 'sin' && /envío/.test(c.texto), c);
    await evaluar(cli, '_setCobroDesc("otro")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('"Otro" abre el campo y le da el foco', c.otro && c.on === 'otro' && await evaluar(cli, 'document.activeElement&&document.activeElement.id==="cobroDescInp"'), c);
    await evaluar(cli, `(function(){var i=document.getElementById('cobroDescInp');i.value='1';i.dispatchEvent(new Event('input'));i.value='15';i.dispatchEvent(new Event('input'));return true;})()`);
    await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('15% del SUBTOTAL: $6.000 → $39.000', c.total === 39000, c.total);
    chk('  el campo NO pierde el foco mientras escribis', await evaluar(cli, 'document.activeElement&&document.activeElement.id==="cobroDescInp"'));
    chk('  y el bloque dice el nuevo numero', /6\.000/.test(c.texto) && /39\.000/.test(c.texto), c.texto);
    await evaluar(cli, `(function(){_setCobroDescTipo('monto');var i=document.getElementById('cobroDescInp');i.value='5.000';i.dispatchEvent(new Event('input'));return true;})()`);
    await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('$ fijo "5.000" (con punto de miles): $40.000', c.total === 40000, c.total);
    await evaluar(cli, '_setCobroFp("Efectivo")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('lo elegido MANDA aunque pase a efectivo', c.total === 40000 && c.on === 'otro', c);
    r = await evaluar(cli, CONFIRMAR); await pausa(700);
    p = await evaluar(cli, POST(9556));
    chk('el POST manda el monto elegido', p && p.descuentoManual && p.descuentoManual.monto === 5000 && p.ef === 40000 && p.recalcular === true, p);

    console.log('\n-- 7. el 10% de +$100.000 que ya traia --');
    await evaluar(cli, 'abrirCobroRuta("Home|R9557")'); await pausa(400);
    await evaluar(cli, '_setCobroFpCta("mp")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('cargado por transferencia con el 10%: lo conserva ($135.000)', c.total === 135000 && c.on === 'diez' && /con el que se cargó/.test(c.texto), c);
    r = await evaluar(cli, CONFIRMAR); await pausa(700);
    p = await evaluar(cli, POST(9557));
    chk('  y no recalcula', p && !p.recalcular && p.tr === 135000, p);

    console.log('\n-- 8. el combo sigue la misma regla --');
    const kCombo = await evaluar(cli, `(function(){var s=getSorted();for(var i=0;i<s.length;i++)if(s[i]._combo)return s[i]._key;return null;})()`);
    chk('los dos pedidos son una parada', !!kCombo, kCombo);
    if (kCombo) {
      await evaluar(cli, 'abrirCobroRuta(' + JSON.stringify(kCombo) + ')'); await pausa(400);
      c = await evaluar(cli, CUADRO);
      chk('en efectivo, $27.000 (los dos con su 10%)', c.total === 27000, c.total);
      await evaluar(cli, '_setCobroFpCta("mp")'); await pausa(300);
      c = await evaluar(cli, CUADRO);
      chk('por transferencia, $30.000', c.total === 30000 && /30\.000/.test(c.sub), c);
      r = await evaluar(cli, CONFIRMAR); await pausa(900);
      const p1 = await evaluar(cli, POST(9558)), p2 = await evaluar(cli, POST(9559));
      chk('  cada POST saca su descuento', p1 && p2 && p1.noDescuento && p2.noDescuento && p1.tr === 20000 && p2.tr === 10000, [p1, p2]);
    }

    console.log('\n-- 9. desde COBROS --');
    await evaluar(cli, 'switchTab("cobros")');
    await esperar(cli, '(pendientesCobro||[]).some(function(x){return String(x.id)==="9601";})', 20000);
    await pausa(500);
    const idx1 = await evaluar(cli, '(pendientesCobro||[]).findIndex(function(x){return String(x.id)==="9601";})');
    await evaluar(cli, 'abrirCobroPendiente(' + idx1 + ')'); await pausa(400);
    c = await evaluar(cli, CUADRO);
    chk('abre con $54.000 y el 10% prendido', c.total === 54000 && c.on === 'diez', c);
    await evaluar(cli, '_setCobroFpCta("brubank")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('por transferencia: $60.000', c.total === 60000 && c.on === 'sin', c);
    r = await evaluar(cli, CONFIRMAR); await pausa(900);
    p = await evaluar(cli, POST(9601));
    chk('el POST de COBROS tambien saca el descuento', p && p.noDescuento === true && p.recalcular === true && p.tr === 60000 && p.cuenta === 'brubank', p);
    const idx2 = await evaluar(cli, '(pendientesCobro||[]).findIndex(function(x){return String(x.id)==="9602";})');
    await evaluar(cli, 'abrirCobroPendiente(' + idx2 + ')'); await pausa(400);
    await evaluar(cli, '_setCobroFpCta("mp")'); await pausa(300);
    c = await evaluar(cli, CUADRO);
    chk('con un parcial previo cobra el saldo sin recalcular ($20.000)', c.total === 20000 && /ya tiene el descuento/.test(c.texto), c);
    await evaluar(cli, 'cerrarCobroRuta()');

    console.log('\n-- 10. nada roto --');
    const desb = await evaluar(cli, 'Math.max(0,document.documentElement.scrollWidth-window.innerWidth)');
    chk('no desborda a lo ancho', desb <= 1, desb);
    const errs = await evaluar(cli, 'window.__errores');
    chk('sin errores de JS', errs.length === 0, errs);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTÓ: ' + e.message); process.exit(1); });
