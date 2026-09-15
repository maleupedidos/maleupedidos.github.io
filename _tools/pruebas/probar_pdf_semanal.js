/* El PDF de la semana (14/9/2026).

   node probar_pdf_semanal.js [390|1440]
   APP=app_viejo_tmp.html node probar_pdf_semanal.js 1440    ← la direccion contraria

   Hasta ese dia el PDF lo armaba el servidor (`action=resumenSemanal`) con su propia
   cuenta: la semana 37 decia $6.060.073 en 66 pedidos cuando lo entregado fue
   $5.595.151 en 55 entregas (fecha de PEDIDO, Red en bruto, sin la carne, y los pagos
   a proveedores como gasto). Ahora se arma en el panel con las funciones de Ventas
   retail.

   Backend STUBBEADO con datos inventados (repo publico) y el reloj congelado en el
   lunes 14/9/2026 15:00. No hace falta token.

   Sostiene:
   · el PDF dice lo mismo que `_rtSumar` (Ventas retail) para la semana, y compara
     contra la anterior; los dias suman la semana;
   · ECONOMICO (devengado): margen bruto − bolsas imputadas por entrega − campañas
     (WATI es variable, no un gasto fijo de la semana) − delivery = contribucion,
     menos la parte de los fijos del mes que le toca a la semana por sus dias;
   · FINANCIERO (percibido): lo cobrado (la tarjeta de Inicio) y los pagos de la
     semana, sin vueltos; lo que quedo por cobrar AL CIERRE y Red sin rendir;
   · contra el plan de ventas: el objetivo retail del tramo de la semana;
   · los clientes salen de `saludSem`: quienes son los nuevos y los que volvieron,
     cruzados por referencia, y si faltan los nombres se piden a `saludClientes`;
   · carne y algo mas, con el estado de cada cliente (nuevo, volvio, ya compraba);
   · la carne en kilos, aparte de las unidades — y si el catalogo llega tarde se lo
     espera; si no llega, un producto sin unidad no se suma con nada;
   · el PDF: bloque por bloque a escala 3, ninguna imagen se sale de la hoja y
     ningun corte cae en la mitad de un renglon;
   · el boton de cada semana manda el LUNES con su año, Ventas retail ofrece el PDF
     en las dos semanas, y el PDF no le pide el resumen al servidor. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 700) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(250); }
  return false;
};

let n = 500;
const P = o => Object.assign({ n: String(n++), f: '10/09/2026', de: 'Viernes', o: 'Deposito', ep: 'No Cobrado', fp: 'Transferencia', co: 0, p: [{ a: 'PPM', q: 1 }], r: n }, o);
const dm = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const H = o => P(Object.assign({ h: 'Home', es: 'Entregado' }, o, { dee: o.dee || o.fex, mc: String(o.fex || o.dee).slice(0, 7), fe: dm(o.fex), f: dm(o.fex || o.dee) }));
const PEDIDOS = [
  // Semana 37
  H({ c: 'Ana Prueba', tel: '1100000001', bar: 'Estancias del Pilar', fex: '2026-09-12', he: '19:00', $: 30000, co: 20000, ep: 'Cobrado', fc: '12/09', fp: 'Efectivo', p: [{ a: 'PPM', q: 2 }] }),
  // cobrado el LUNES 14/9, despues del cierre: al cierre del domingo estaba por cobrar
  H({ c: 'Ana Prueba', tel: '1100000001', bar: 'Estancias del Pilar', fex: '2026-09-12', he: '19:20', $: 10000, co: 7000, ep: 'Cobrado', fc: '14/09', fp: 'Transferencia', p: [{ a: 'PPM', q: 1 }] }),
  H({ n: '60', c: 'Beto Prueba', tel: '1100000002', bar: 'Estancias del Pilar', fex: '2026-09-11', $: 50000, co: 35000, ep: 'Cobrado', fc: '11/09', p: [{ a: 'CLo', q: 1.5 }, { a: 'PPM', q: 1 }] }),
  P({ h: 'Pilar', n: '77', es: 'Entregado', c: 'Fede Prueba', bar: 'Pilara', fex: '2026-09-09', dee: '2026-09-09', mc: '2026-09', $: 40000, co: 30000, p: [{ a: 'CLo', q: 0.75 }] }),
  P({ h: 'Clubes', es: 'Entregado', c: 'Socio Club (Champagnat)', br: 'Champagnat', dee: '2026-09-12', mc: '2026-09', $: 26000, co: 18000, ep: 'Cobrado', fc: '13/09', fp: 'Mixto', ef: 6000 }),
  P({ h: 'Red', es: 'Entregado', c: 'Final Uno (Red: Vendedor Uno)', br: 'Vendedor Uno', dee: '2026-09-11', mc: '2026-09', $: 41500, co: 30000 }),
  // Red Pendiente sin pagarle a Maleu: en poder del vendedor. El que ya pago esta entregado y no figura.
  P({ h: 'Red', es: 'Pendiente', c: 'Final Dos (Red: Vendedor Dos)', br: 'Vendedor Dos', dee: '2026-09-10', mc: '2026-09', $: 30000, co: 20000 }),
  P({ h: 'Red', es: 'Pendiente', c: 'Final Tres (Red: Vendedor Dos)', br: 'Vendedor Dos', dee: '2026-09-11', mc: '2026-09', $: 25000, co: 18000, ep: 'Cobrado', fc: '14/09' }),
  // un cobro de esta semana de un pedido de la semana 36
  H({ c: 'Viejo Prueba', bar: 'Estancias del Pilar', fex: '2026-09-02', $: 20000, co: 15000, ep: 'Cobrado', fc: '08/09', fp: 'Efectivo' }),
  // no cuentan
  H({ c: 'Pendiente Prueba', bar: 'Estancias del Pilar', es: 'Pendiente', fex: '', dee: '2026-09-12', $: 99000, co: 50000 }),
  H({ c: 'Cancelado Prueba', bar: 'Estancias del Pilar', es: 'Cancelado', fex: '2026-09-12', $: 88000, co: 40000 }),
  // semana 36
  H({ c: 'Carla Prueba', bar: 'Estancias del Pilar', fex: '2026-09-03', $: 100000, co: 70000 }),
  // semana 53: cobrado el 2 de enero, sin año en la fecha de cobro
  H({ c: 'Enero Prueba', bar: 'Estancias del Pilar', fex: '2027-01-01', $: 7000, co: 5000, ep: 'Cobrado', fc: '02/01', fp: 'Efectivo' })
];
const EXTRA = [{ h: 'B2B', c: 'Empresa Prueba', fx: '2026-09-10', $: 192000, co: 140800 }, { h: 'Catering', c: 'Evento', fx: '2026-09-08', $: 300000, co: 200000 }];
const SALUD = { '2026-37': { total: 4, nuevos: 1, recompra: 2, react: 1,
  nuevosL: [{ c: 'Fede Prueba', r: ['Pilar|77'], luego: 0 }], reactL: [{ c: 'Beto Prueba', r: ['Home|60'], sem: 9, dias: 63, luego: 0 }] } };
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [], light: true, saludSem: SALUD, saludMes: {}, ventasExtra: EXTRA };
const G = (f, cat, con, $) => ({ f: f, fFull: f + ' 10:00', ts: 1, mes: 'Septiembre', anio: 2026, cat: cat, con: con, met: 'Mercado Pago', $: $, not: '' });
const CAJA = { ts: 1, caja: {}, saldoBase: {}, movimientos: [], efMano: [],
  gastos: [G('09/09/2026', 'Herramienta', 'WATI · Mensual', 10000), G('10/09/2026', 'Proveedor', 'Pago Le Unike', 50000), G('11/09/2026', 'Cambio cruzado', 'Vuelto', 3000), G('12/09/2026', 'Catering', 'Evento', 7000), G('03/09/2026', 'Nafta', 'Shell', 99999)],
  ingresos: [G('10/09/2026', 'Rendimientos', 'MP', 1200), G('11/09/2026', 'Liquidación Red', 'Vendedor Uno', 40000), G('11/09/2026', 'Cambio cruzado', 'Vuelto', 3000)],
  /* Desde el 15/9/2026 `cajaLight` trae Provisiones_Fijas: el EERR usa la hoja, no la tabla del codigo. */
  provisiones: [{ concepto: 'Sueldo dueño imputado', cat: 'sueldo', monto: 1200000, desde: '2026-01', hasta: null },
    { concepto: 'Ocupación imputada', cat: 'ocupacion', monto: 50000, desde: '2026-01', hasta: null },
    { concepto: 'Amortización freezers', cat: 'amortizacion', monto: 35000, desde: '2026-01', hasta: null },
    { concepto: 'Monotributo', cat: 'impuesto_monotributo', monto: 42386.74, desde: '2026-01', hasta: null }] };
const CATALOGO = { ok: true, productos: { Prueba: [{ a: 'PPM', n: 'Pack Muzzarella', cat: 'Pack Pizzas x2', u: 'u', dem: 1 }, { a: 'CLo', n: 'Carne Lomo', cat: 'Carnes', u: 'kg', dem: 1 }] } };
const PLAN = { ok: true, mes: 'Septiembre 2026', yyyy: 2026, mm: 9, diasMes: 30, metas: { 'Venta Directa|Estancias del Pilar': { metaFact: 2000000, metaPedidos: 40, semanalesM: '100000,400000,500000,600000,400000', semanalesP: '5,10,10,10,5' } } };

const RELOJ = `(function(){var AH=new Date(2026,8,14,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
/* fase a: el catalogo llega enseguida · b: llega a los 12 s · c: no llega */
const STUB = `
  window.__gets=[]; window.__err=[]; window.__pdf=null; window.__toasts=[]; window.__img=[]; window.__escalas=[];
  var __fase=(location.search.match(/fase=(\\w)/)||[])[1]||'a';
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  /* SOLO en la ventana de arriba: html2canvas captura en un iframe del mismo origen,
     este script corre tambien ahi, y borraba la copia del plan recien guardada. */
  if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio'); localStorage.removeItem('ma3'); localStorage.removeItem('mc_catalogoProd_v2'); localStorage.removeItem('maleu_plan_cache_Septiembre 2026'); }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'}, demora=150;
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo=${JSON.stringify(CAJA)};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='tendencia') cuerpo={ok:true,meses:[],base:{total:1}};
      else if(a==='saludClientes') cuerpo={ok:true,ts:1,sem:${JSON.stringify(SALUD)},mes:{}};
      else if(a==='planMes') cuerpo=${JSON.stringify(PLAN)};
      else if(a==='catalogo'){ if(__fase==='c') cuerpo={ok:false,error:'caido'}; else { cuerpo=${JSON.stringify(CATALOGO)}; if(__fase==='b') demora=12000; } }
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},demora);});
    }
    return o.apply(this,arguments); }; })();
  /* jsPDF: se intercepta el guardado y se anota cada imagen (hoja, y, alto en mm).
     html2canvas: la escala de cada captura. */
  (function w(){ if(window.jspdf&&window.jspdf.jsPDF&&!window.jspdf.__w&&window.html2canvas){ var J=window.jspdf.jsPDF;
      window.jspdf.jsPDF=function(op){var p=new J(op);var ai=p.addImage;
        p.addImage=function(img,fmt,x,y,w,h){window.__img.push({pag:p.getNumberOfPages(),x:x,y:y,w:w,h:h});return ai.apply(p,arguments);};
        p.save=function(nm){window.__pdf={nombre:nm,paginas:p.getNumberOfPages()};return p;};return p;};
      window.jspdf.__w=1;
      var h2=window.html2canvas;window.html2canvas=function(el,op){window.__escalas.push({scale:op&&op.scale,alto:el.getBoundingClientRect().height});return h2.apply(this,arguments);};
    } else setTimeout(w,100); })();`;

async function abrirFase(cli, fase) {
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?fase=' + fase });
  if (!await esperar(cli, `typeof go==='function' && window.D && D.pedidos && D.pedidos.length===${PEDIDOS.length} && Array.isArray(D.gastos)`, 90000)) throw new Error('el ERP no cargo los datos stubbeados');
  await ev(cli, `window.__toasts=[];var _t=window.toast;window.toast=function(m){window.__toasts.push(String(m));return _t.apply(this,arguments);};`);
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    console.log('\n== PDF semanal · ' + ANCHO + 'px · ' + APP + ' ==');

    console.log('\n-- fase a: el catalogo llega --');
    await abrirFase(cli, 'a');
    /* el modulo va despues de html2canvas y jsPDF, que vienen del CDN: puede tardar un poco mas que los datos */
    chk('el PDF se arma en el panel (_rsArmar)', await esperar(cli, `typeof window._rsArmar==='function'`, 30000));
    await ev(cli, `_tendCargarCatalogo()`);
    chk('llega el catalogo', await esperar(cli, `!!_tendCat`, 20000));
    const R = await ev(cli, `(function(){var R=_rsArmar('2026-09-07'),g=R.g,s=_rtSumar('2026-09-07','2026-09-13');
      return {semN:R.semN,tot:[g.tot.f,g.tot.c,g.tot.ent],rt:[s.tot.f,s.tot.c,s.tot.ent],ant:[R.gc.tot.f,R.gc.tot.ent],
        dias:R.dias.reduce(function(a,x){return [a[0]+x.ent,a[1]+x.f];},[0,0]),cl:{total:R.cl.total,nuevos:R.cl.nuevos},
        eco:[R.eco.mb,R.eco.pedPack,R.eco.bolsas,R.eco.camp,R.eco.deliv,R.eco.contrib,R.eco.fijos,R.eco.res],
        fijosMes:R.eco.fijosMes,fin:[R.fin.entro,R.fin.pagos,R.fin.flujo,R.fin.vueltos],porLinea:R.fin.porLinea,ing:R.ing.tot,
        cob:[R.cob.tot,R.cob.ef,R.cob.tr,R.cob.n],plan:R.plan,
        u:R.prodU.map(function(o){return o.a+':'+o.q;}),k:R.prodK.map(function(o){return o.a+':'+o.q;}),x:R.prodX.length,pend:R.pendTot,
        pendYa:R.pendYa,pendL:R.pend.map(function(o){return o.c+'|'+o.h+'|'+o.f+'|'+o.cob;}),redSin:R.redSin,
        carne:[R.carne.cli,R.carne.solo,R.carne.ambos,R.carne.siempre],carneL:R.carne.lista.map(function(o){return o.c+'|'+o.h+'|'+o.kg+'|'+o.u+'|'+o.est.t+'|'+o.ademas;}),
        nuevos:R.nuevos,volvieron:R.volvieron,
        top:R.topCli.map(function(o){return o.c+':'+o.ent;})};})()`).then(x => (x && !x.__err) ? x : x);
    const RR = (R && !R.__err) ? R : null;
    if (!RR) console.log('  (armar revento: ' + JSON.stringify(R) + ')');
    chk('semana 37', !!RR && RR.semN === 37, R);
    chk('lo mismo que Ventas retail: $389.500 (B2B incluido, Catering no) · costo $280.800 · 6 entregas', !!RR && JSON.stringify(RR.tot) === JSON.stringify(RR.rt) && RR.tot[0] === 389500 && RR.tot[1] === 280800 && RR.tot[2] === 6, RR && [RR.tot, RR.rt]);
    chk('contra la semana 36: $120.000 · 2 entregas', !!RR && RR.ant[0] === 120000 && RR.ant[1] === 2, RR && RR.ant);
    chk('los dias suman la semana', !!RR && RR.dias[0] === 6 && RR.dias[1] === 389500, RR && RR.dias);
    chk('clientes de saludSem: 4 · 1 nuevo', !!RR && RR.cl.total === 4 && RR.cl.nuevos === 1, RR && RR.cl);

    /* ECONOMICO. A mano: margen 389.500 − 280.800 = 108.700; bolsas 4 pedidos de Home/Pilar × $850 = 3.400;
       WATI $10.000 es campaña (variable); contribucion 95.300. Fijos de septiembre: nafta 99.999 + sueldo
       (el FIJO de Provisiones_Fijas, 1.200.000, desde el 15/9/2026; antes piso 1.000.000 del codigo) + ocupacion
       50.000 + monotributo 42.386,74 + amortizacion 35.000 = 1.427.385,74; 7 de 30 dias = 333.057.
       Mas rendimientos 1.200: resultado −236.557. */
    chk('economico: margen 108.700 · bolsas 4 × 850 = 3.400 · campañas (WATI) 10.000 · delivery 0 · contribucion 95.300', !!RR && JSON.stringify(RR.eco.slice(0, 6)) === '[108700,4,3400,10000,0,95300]', RR && RR.eco);
    chk('fijos: la parte de la semana de los de septiembre (7/30 de 1.427.386) = 333.057; resultado −236.557', !!RR && RR.eco[6] === 333057 && RR.eco[7] === -236557 && RR.fijosMes.length === 1 && RR.fijosMes[0].dias === 7 && RR.fijosMes[0].diasMes === 30, RR && [RR.eco, RR.fijosMes]);
    chk('WATI NO esta en los fijos: la nafta si (vehiculo es estructura)', !!RR && Math.round(RR.fijosMes[0].total) === 1427386, RR && RR.fijosMes);
    /* FINANCIERO */
    chk('financiero: entro 126.000 + 1.200 = 127.200 · salio 67.000 (sin el vuelto de 3.000) · flujo 60.200', !!RR && JSON.stringify(RR.fin) === '[127200,67000,60200,3000]', RR && RR.fin);
    chk('los pagos por renglon: proveedores 50.000 · campañas 10.000 · catering 7.000', !!RR && JSON.stringify(RR.porLinea) === JSON.stringify({ 'Campañas y mensajería': 10000, 'Proveedores de mercadería': 50000, 'Catering': 7000 }), RR && RR.porLinea);
    chk('otros ingresos $1.200 (sin la liquidacion de Red ni el vuelto)', !!RR && RR.ing === 1200, RR && RR.ing);
    chk('sin plan guardado todavia: dice que falta septiembre', !!RR && RR.plan && RR.plan.falta.length === 1 && RR.plan.falta[0] === 'Septiembre 2026' && RR.plan.tramos.length === 0, RR && RR.plan);

    chk('la carne en kilos (2,25) y las unidades aparte (6 packs)', !!RR && JSON.stringify(RR.k) === '["CLo:2.25"]' && JSON.stringify(RR.u) === '["PPM:6"]' && RR.x === 0, RR && [RR.u, RR.k, RR.x]);
    chk('Ana dos pedidos del mismo viaje = 1 entrega; Red afuera del top', !!RR && RR.top.indexOf('Ana Prueba:1') >= 0 && !RR.top.some(t => /Red/.test(t)), RR && RR.top);
    chk('cobrado en la semana: $126.000 en 4 cobros · EF $56.000 (el Mixto del club parte 6.000/20.000) · TR $70.000', !!RR && JSON.stringify(RR.cob) === '[126000,56000,70000,4]', RR && RR.cob);
    chk('por cobrar de lo entregado: $91.500 (Ana 10.000 + Fede 40.000 + Red 41.500)', !!RR && RR.pend === 91500, RR && RR.pend);
    chk('al cierre: el pedido de Ana cobrado el lunes 14/9 SIGUE en la lista, con la fecha en que entro', !!RR && RR.pendL.indexOf('Ana Prueba|Home|10000|2026-09-14') >= 0 && RR.pendYa === 10000, RR && [RR.pendL, RR.pendYa]);
    chk('primero lo que sigue sin cobrar (Red 41.500, Fede 40.000), despues lo ya cobrado; Pilara es Otras zonas', !!RR && RR.pendL.length === 3 && /^Final Uno/.test(RR.pendL[0]) && RR.pendL[1] === 'Fede Prueba|Otras zonas|40000|', RR && RR.pendL);
    chk('Red Pendiente sin pagarle a Maleu va aparte, por vendedor ($30.000); el Pendiente que ya pago no', !!RR && JSON.stringify(RR.redSin) === JSON.stringify([{ v: 'Vendedor Dos', n: 1, f: 30000 }]), RR && RR.redSin);
    chk('carne: 5 clientes · 1 solo carne (Fede) · 1 carne y algo mas (Beto) · 3 sin carne', !!RR && JSON.stringify(RR.carne) === '[5,1,1,3]', RR && RR.carne);
    chk('la lista de carne: primero Beto (volvio, con el pack), despues Fede (nuevo, solo carne)', !!RR && JSON.stringify(RR.carneL) === JSON.stringify(['Beto Prueba|Home|1.5|1|volvio|Pack Pizzas x2 1', 'Fede Prueba|Otras zonas|0.75|0|nuevo|']), RR && RR.carneL);
    chk('los nuevos se cruzan por REFERENCIA: Fede, en Pilara, $40.000, "Carnes 0,75 kg", todavia no volvio', !!RR && Array.isArray(RR.nuevos) && RR.nuevos.length === 1 && RR.nuevos[0].c === 'Fede Prueba' && RR.nuevos[0].donde === 'Pilara' && RR.nuevos[0].f === 40000 && RR.nuevos[0].det === 'Carnes 0,75 kg' && RR.nuevos[0].luego === 0 && RR.nuevos[0].ok === true, RR && RR.nuevos);
    chk('los que volvieron: Beto, Estancias del Pilar, 63 dias sin comprar, carne primero y el pack', !!RR && Array.isArray(RR.volvieron) && RR.volvieron.length === 1 && RR.volvieron[0].donde === 'Estancias del Pilar' && RR.volvieron[0].dias === 63 && RR.volvieron[0].det === 'Carnes 1,5 kg · Pack Pizzas x2 1', RR && RR.volvieron);

    const card = await ev(cli, `(function(){try{go('inicio');}catch(e){}var c=[].slice.call(document.querySelectorAll('#sem-body-prev .card')).filter(function(x){return /Semana 37/.test(x.textContent);})[0];if(!c)return null;
      var m=c.textContent.match(/Cobrado en la semana\\s*\\$([\\d.]+)/),e=c.textContent.match(/EF \\$([\\d.]+) · TR \\$([\\d.]+)/);
      return {t:m?Number(m[1].replace(/\\./g,'')):null,ef:e?Number(e[1].replace(/\\./g,'')):null,tr:e?Number(e[2].replace(/\\./g,'')):null,
        pdf:(c.innerHTML.match(/descargarPDFSemana\\(([^)]*)\\)/)||[])[1]};})()`);
    chk('lo cobrado = la tarjeta "Cobrado en la semana" (total, EF y TR)', !!RR && !!card && card.t === RR.cob[0] && card.ef === RR.cob[1] && card.tr === RR.cob[2] && RR.cob[0] === 126000, [RR && RR.cob, card]);
    chk('el boton de la semana manda el lunes con su año', !!card && /2026-09-07/.test(card.pdf || ''), card && card.pdf);
    const s53 = await ev(cli, `(function(){var R=_rsArmar('2026-12-28');return {semN:R.semN,cob:R.cob.tot,h:R.h,pend:R.pendTot,meses:R.eco.fijosMes.map(function(x){return x.mn+':'+x.dias;})};})()`);
    chk('semana 53 (28/12 a 3/1): el cobro del "02/01" sin año cae adentro, no queda por cobrar, y los fijos son 4 dias de diciembre y 3 de enero', s53 && s53.semN === 53 && s53.cob === 7000 && s53.h === '2027-01-03' && s53.pend === 0 && JSON.stringify(s53.meses) === '["12:4","1:3"]', s53);

    const doc = await ev(cli, `(function(){var w=document.getElementById('rsHiddenWrap');w.innerHTML=_rsRender(_rsArmar('2026-09-07'));var t=w.textContent;w.innerHTML='';return t;})()`);
    const T = typeof doc === 'string' ? doc : '';
    chk('el documento: portada, facturado y margen', /Semana 37/.test(T) && /Facturado \$389\.500/.test(T) && /margen \$108\.700 \(28%\)/.test(T), T.slice(0, 300));
    chk('el documento: la carne "2,25 kg" y "Carne Lomo"', /Carne Lomo/.test(T) && /2,25 kg/.test(T));
    chk('el documento: resultado economico con contribucion, fijos de septiembre y el resultado', /= Margen de contribución\$95\.300/.test(T) && /7 de 30 días de septiembre/.test(T) && /Resultado económico de la semana−\$236\.557/.test(T), (T.match(/Resultado económico.{0,500}/) || [])[0]);
    chk('el documento: WATI esta en Campañas y mensajería, no en un gasto de la semana', /Campañas y mensajeríaWATI · Mensual−\$10\.000/.test(T) && !/Gastos de la semana/.test(T), (T.match(/Campañas y mensajería.{0,60}/) || [])[0]);
    chk('el documento: el financiero con el flujo de caja y los vueltos aparte', /Flujo de caja de la semana\$60\.200/.test(T) && /Los vueltos \(\$3\.000\) no cuentan/.test(T) && /Los pagos, uno por uno/.test(T), (T.match(/Financiero.{0,400}/) || [])[0]);
    chk('sin undefined, NaN ni centavos', T.length > 500 && !/undefined|NaN|\[object/.test(T) && !/\$\s?\d{1,3}(\.\d{3})*,\d/.test(T));
    chk('el documento: "Al cierre de la semana quedó por cobrar" $91.500, "cobrado Lun 14/9" y cuanto falta', /Al cierre de la semana quedó por cobrar de lo entregado: \$91\.500/.test(T) && /cobrado Lun 14\/9/.test(T) && /De eso ya entró \$10\.000 después del domingo; falta \$81\.500/.test(T), (T.match(/Al cierre.{0,300}/) || [])[0]);
    chk('el documento: Red en poder del vendedor, "Vendedor Dos 1 pedido $30.000"', /Red en poder del vendedor.{0,80}Vendedor Dos 1 pedido \$30\.000/.test(T) && !/Final Tres/.test(T), (T.match(/Aparte, Red.{0,160}/) || [])[0]);
    chk('el documento: quienes son los nuevos, donde viven, que llevaron y si volvieron', /Quiénes son los nuevos/.test(T) && /Fede PruebaPilaraCarnes 0,75 kg\$40\.000todavía no/.test(T), (T.match(/Quiénes son los nuevos.{0,160}/) || [])[0]);
    chk('el documento: quienes volvieron y hace cuanto', /Quiénes volvieron/.test(T) && /Beto PruebaEstancias del PilarCarnes 1,5 kg · Pack Pizzas x2 1\$50\.00063 días/.test(T) && /un dormido que se despertó/.test(T), (T.match(/Quiénes volvieron.{0,160}/) || [])[0]);
    chk('el documento: "Carne y algo más" con el estado de cada cliente', /Carne y algo más/.test(T) && /Beto PruebaHome⏰ volvió tras 63 días1,5 kgPack Pizzas x2 1/.test(T) && /Fede PruebaOtras zonas🆕 nuevo0,75 kg—/.test(T) && !/Lo de siempre/.test(T), (T.match(/Los que llevaron carne.{0,200}/) || [])[0]);
    chk('el documento: el plan que falta se dice', /No llegó el plan de Septiembre 2026/.test(T), (T.match(/Contra el plan.{0,120}/) || [])[0]);
    /* Si el servidor no manda los nombres o el pedido no esta en el celular, se dice. */
    const nv = await ev(cli, `(function(){var s=D.saludSem['2026-37'],w=document.getElementById('rsHiddenWrap'),bk=s.nuevosL,bk2=s.reactL;
      s.nuevosL=[{c:'Fede Prueba',r:['Pilar|77']},{c:'Lejano Prueba',r:['Home|99999']}];w.innerHTML=_rsRender(_rsArmar('2026-09-07'));var a=w.textContent;
      delete s.nuevosL;delete s.reactL;w.innerHTML=_rsRender(_rsArmar('2026-09-07'));var b=w.textContent;s.nuevosL=bk;s.reactL=bk2;w.innerHTML='';
      return {sinPed:/Lejano Prueba———/.test(a)&&/De 1 no llegó el pedido/.test(a),viejo:/no llegaron: tocá ↻/.test(b)&&!/Quiénes son los nuevos/.test(b)};})()`);
    chk('un nuevo sin su pedido en el celular dice el nombre y lo aclara; sin nombres del servidor, lo dice', !!nv && nv.sinPed === true && nv.viejo === true, nv);

    await ev(cli, `try{goSubInicio('resumen');rtPer('semAnt');}catch(e){}`); await pausa(400);
    const b1 = await ev(cli, `(function(){var b=document.querySelector('#hRetail .rt-pdf');return b?b.getAttribute('onclick'):null;})()`);
    await ev(cli, `rtPer('mes')`); await pausa(300);
    const b2 = await ev(cli, `!!document.querySelector('#hRetail .rt-pdf')`);
    await ev(cli, `rtPer('semAnt')`); await pausa(300);
    chk('Ventas retail ofrece el PDF de la semana pasada (y no en un mes)', /2026-09-07/.test(b1 || '') && b2 === false, [b1, b2]);
    const geo = await ev(cli, `(function(){var h=document.querySelector('#hRetail .rt-h'),a=h.querySelector('.rt-hl').getBoundingClientRect(),b=h.querySelector('.rt-hb').getBoundingClientRect();
      return {pisa:a.right>b.left+1&&a.bottom>b.top,alto:[].map.call(h.querySelectorAll('button'),function(x){return Math.round(x.getBoundingClientRect().height);}),desb:document.documentElement.scrollWidth>innerWidth+1};})()`);
    chk('los botones del encabezado no pisan el titulo, se tocan bien y no desborda', !!geo && !geo.__err && !geo.pisa && !geo.desb && Array.isArray(geo.alto) && geo.alto.length === 2 && geo.alto.every(h => h >= (ANCHO <= 560 ? 38 : 30)), geo);

    /* El PDF de verdad: sin los nombres en la copia (los pide a saludClientes) y sin el plan guardado (lo pide). */
    await ev(cli, `delete D.saludSem['2026-37'].nuevosL;delete D.saludSem['2026-37'].reactL;window.__gets=[];window.__img=[];window.__escalas=[];
      var _b=document.querySelector('#hRetail .rt-pdf');if(_b)_b.click();`);
    const salio = await esperar(cli, `!!window.__pdf`, 90000);
    const pdf = await ev(cli, `({pdf:window.__pdf,gets:window.__gets,toasts:window.__toasts,img:window.__img,esc:window.__escalas,
      nuevos:Array.isArray((D.saludSem['2026-37']||{}).nuevosL),plan:!!localStorage.getItem('maleu_plan_cache_Septiembre 2026')})`);
    chk('el PDF sale: "Maleu - Resumen Semana 37 (07-09-2026 a 13-09-2026).pdf"', salio && pdf.pdf && pdf.pdf.nombre === 'Maleu - Resumen Semana 37 (07-09-2026 a 13-09-2026).pdf' && pdf.pdf.paginas >= 2, pdf && pdf.pdf);
    chk('sin pedirle el resumen al servidor; si pide los clientes (faltaban los nombres) y el plan', !!pdf && Array.isArray(pdf.gets) && pdf.gets.indexOf('resumenSemanal') < 0 && pdf.gets.indexOf('saludClientes') >= 0 && pdf.gets.indexOf('planMes') >= 0 && pdf.nuevos === true && pdf.plan === true, pdf && [pdf.gets, pdf.nuevos, pdf.plan]);
    chk('cada bloque se captura a escala 3', !!pdf && Array.isArray(pdf.esc) && pdf.esc.length >= 8 && pdf.esc.every(e => e.scale === 3), pdf && pdf.esc);
    const img = (pdf && pdf.img) || [];
    const dentro = img.every(i => i.x >= 9.9 && i.x + i.w <= 200.1 && i.y >= 9.9 && i.y + i.h <= 297 - 16 + 0.2);
    const porPag = {}; img.forEach(i => { (porPag[i.pag] = porPag[i.pag] || []).push(i); });
    const sinPisar = Object.keys(porPag).every(k => porPag[k].sort((a, b) => a.y - b.y).every((i, j, a) => j === 0 || i.y >= a[j - 1].y + a[j - 1].h - 0.2));
    chk('ninguna imagen se sale de la hoja ni pisa a la de arriba (' + img.length + ' imagenes en ' + Object.keys(porPag).length + ' hojas)', img.length >= 8 && dentro && sinPisar, img.slice(0, 30));
    const docPlan = await ev(cli, `(function(){var R=_rsArmar('2026-09-07');var w=document.getElementById('rsHiddenWrap');w.innerHTML=_rsRender(R);var t=w.textContent;w.innerHTML='';
      return {m:R.plan.m,p:R.plan.p,realM:R.plan.realM,realP:R.plan.realP,mes:R.plan.mes,t:(t.match(/Contra el plan.{0,420}/)||[])[0]};})()`);
    chk('con el plan: objetivo retail del 7 al 13 $400.000 y 10 pedidos; entregado $130.000 (33%) y 4 pedidos; el mes $250.000 de $2.000.000', !!docPlan && docPlan.m === 400000 && docPlan.p === 10 && docPlan.realM === 130000 && docPlan.realP === 4 && docPlan.mes && docPlan.mes.real === 250000 && /del 7 al 13 de septiembre/.test(docPlan.t) && /33% del objetivo/.test(docPlan.t) && /\$250\.000 de \$2\.000\.000 \(13%\)/.test(docPlan.t), docPlan);

    /* Los cortes: bloque por bloque, el PDF mide cada captura. Se rearma el documento y se comprueba que todo lo
       pegado suma el alto de cada bloque y que cada corte interno cae en un renglon. */
    const cortes = await ev(cli, `(function(){var w=document.getElementById('rsHiddenWrap');w.innerHTML=_rsRender(_rsArmar('2026-09-07'));var doc=w.querySelector('#rsDoc');
      var out=[].map.call(doc.children,function(b){return {alto:b.getBoundingClientRect().height,c:_rsPdfCortes(b),filas:[].map.call(b.querySelectorAll('tbody tr'),function(tr){var r=tr.getBoundingClientRect(),t=b.getBoundingClientRect().top;return [r.top-t,r.bottom-t];})};});
      w.innerHTML='';return out;})()`);
    const cortesOk = Array.isArray(cortes) && cortes.length >= 8 && cortes.every(b => b.c.every(y => !b.filas.some(f => y > f[0] + 1 && y < f[1] - 1)));
    chk('ningun corte posible cae en la mitad de un renglon (' + (Array.isArray(cortes) ? cortes.reduce((s, b) => s + b.c.length, 0) : 0) + ' cortes en ' + (Array.isArray(cortes) ? cortes.length : 0) + ' bloques)', cortesOk, cortes && cortes.__err);
    const mmCss = 190 / 800;
    const altoTotal = Array.isArray(cortes) ? cortes.reduce((s, b) => s + b.alto, 0) * mmCss : 0;
    const altoPegado = img.reduce((s, i) => s + i.h, 0);
    chk('lo pegado en el PDF suma el alto del documento (' + Math.round(altoPegado) + ' mm de ' + Math.round(altoTotal) + ')', altoTotal > 0 && Math.abs(altoPegado - altoTotal) < 3, [altoPegado, altoTotal]);

    console.log('\n-- fase b: el catalogo tarda 12 s --');
    await abrirFase(cli, 'b');
    await ev(cli, `descargarPDFSemana('2026-09-07')`);
    const salioB = await esperar(cli, `!!window.__pdf`, 90000);
    const kB = await ev(cli, `(function(){var R=_rsArmar('2026-09-07');return {k:R.prodK.map(function(o){return o.a;}),u:R.prodU.map(function(o){return o.a;})};})()`);
    chk('se espera el catalogo: el PDF sale y la carne sigue en kilos', salioB && kB && JSON.stringify(kB.k) === '["CLo"]' && kB.u.indexOf('CLo') < 0, kB);

    console.log('\n-- fase c: el catalogo no llega --');
    await abrirFase(cli, 'c');
    const dC = await ev(cli, `(function(){var R=_rsArmar('2026-09-07');var w=document.getElementById('rsHiddenWrap');w.innerHTML=_rsRender(R);var t=w.textContent;w.innerHTML='';
      return {u:R.prodU.length,k:R.prodK.length,x:R.prodX.length,totU:R.totU,nota:/No llegó el catálogo de 2 productos/.test(t),
        carne:/no se puede separar quién llevó carne/.test(t)&&!/Solo carne/.test(t)};})()`);
    chk('sin catalogo ni stock: nada se suma con nada, y el PDF lo dice', dC && dC.u === 0 && dC.k === 0 && dC.x === 2 && dC.totU === 0 && dC.nota === true, dC);
    chk('sin catalogo, la carne no dice "0 solo carne": dice que no se puede separar', dC && dC.carne === true, dC);
    const lsC = await ev(cli, `(function(){_tendCargarCatalogo();return new Promise(function(r){setTimeout(function(){r({ls:localStorage.getItem('mc_catalogoProd_v2'),cat:_tendCat,gets:window.__gets.filter(function(g){return g==='catalogo';}).length});},1500);});})()`);
    chk('un catalogo que contesta error NO se guarda como catalogo vacio, y no se vuelve a pedir en cada llamada', lsC && lsC.ls === null && lsC.cat === null && lsC.gets <= 2, lsC);
    const err = await ev(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) {
    mal++; console.log('  MAL  la prueba se corto: ' + (e && e.message || e));
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
