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
   · los clientes salen de `saludSem`;
   · gastos SIN pagos a proveedores, sin Catering y sin vueltos; otros ingresos sin
     vueltos ni liquidaciones de Red;
   · la carne en kilos, aparte de las unidades — y si el catalogo llega tarde se lo
     espera; si no llega, un producto sin unidad no se suma con nada;
   · lo cobrado es la tarjeta "Cobrado en la semana" de Inicio, y una fecha de cobro
     sin año cae en la semana correcta aunque cruce de año;
   · el boton de cada semana manda el LUNES con su año, Ventas retail ofrece el PDF
     en las dos semanas, y el PDF se genera sin pedirle nada al servidor. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
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
  H({ c: 'Beto Prueba', tel: '1100000002', bar: 'Estancias del Pilar', fex: '2026-09-11', $: 50000, co: 35000, ep: 'Cobrado', fc: '11/09', p: [{ a: 'CLo', q: 1.5 }, { a: 'PPM', q: 1 }] }),
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
const SALUD = { '2026-37': { total: 4, nuevos: 1, recompra: 2, react: 1, nuevosL: [{ c: 'Fede Prueba', r: ['Pilar|77'] }] } };
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [], light: true, saludSem: SALUD, saludMes: {}, ventasExtra: EXTRA };
const G = (f, cat, con, $) => ({ f: f, fFull: f + ' 10:00', ts: 1, mes: 'Septiembre', anio: 2026, cat: cat, con: con, met: 'Mercado Pago', $: $, not: '' });
const CAJA = { ts: 1, caja: {}, saldoBase: {}, movimientos: [], efMano: [],
  gastos: [G('09/09/2026', 'Herramienta', 'WATI', 10000), G('10/09/2026', 'Proveedor', 'Pago Le Unike', 50000), G('11/09/2026', 'Cambio cruzado', 'Vuelto', 3000), G('12/09/2026', 'Catering', 'Evento', 7000), G('03/09/2026', 'Nafta', 'Shell', 99999)],
  ingresos: [G('10/09/2026', 'Rendimientos', 'MP', 1200), G('11/09/2026', 'Liquidación Red', 'Vendedor Uno', 40000), G('11/09/2026', 'Cambio cruzado', 'Vuelto', 3000)] };
const CATALOGO = { ok: true, productos: { Prueba: [{ a: 'PPM', n: 'Pack Muzzarella', cat: 'Pack Pizzas x2', u: 'u', dem: 1 }, { a: 'CLo', n: 'Carne Lomo', cat: 'Carnes', u: 'kg', dem: 1 }] } };

const RELOJ = `(function(){var AH=new Date(2026,8,14,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
/* fase a: el catalogo llega enseguida · b: llega a los 12 s · c: no llega */
const STUB = `
  window.__gets=[]; window.__err=[]; window.__pdf=null; window.__toasts=[];
  var __fase=(location.search.match(/fase=(\\w)/)||[])[1]||'a';
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  try{ localStorage.setItem('maleu_tab','inicio'); localStorage.removeItem('ma3'); localStorage.removeItem('mc_catalogoProd_v2'); }catch(e){}
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
      else if(a==='catalogo'){ if(__fase==='c') cuerpo={ok:false,error:'caido'}; else { cuerpo=${JSON.stringify(CATALOGO)}; if(__fase==='b') demora=12000; } }
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},demora);});
    }
    return o.apply(this,arguments); }; })();
  /* jsPDF: se intercepta el guardado (el archivo no hace falta, alcanza con saber que salio) */
  (function w(){ if(window.jspdf&&window.jspdf.jsPDF&&!window.jspdf.__w){ var J=window.jspdf.jsPDF;
      window.jspdf.jsPDF=function(op){var p=new J(op);p.save=function(nm){window.__pdf={nombre:nm,paginas:p.getNumberOfPages()};return p;};return p;};
      window.jspdf.__w=1; } else setTimeout(w,100); })();`;

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
        dias:R.dias.reduce(function(a,x){return [a[0]+x.ent,a[1]+x.f];},[0,0]),cl:R.cl,
        gas:[R.gas.tot,R.gas.prov,R.gas.catering,R.gas.vueltos],ing:R.ing.tot,cob:[R.cob.tot,R.cob.ef,R.cob.tr,R.cob.n],
        u:R.prodU.map(function(o){return o.a+':'+o.q;}),k:R.prodK.map(function(o){return o.a+':'+o.q;}),x:R.prodX.length,pend:R.pendTot,
        pendYa:R.pendYa,pendL:R.pend.map(function(o){return o.c+'|'+o.h+'|'+o.f+'|'+o.cob;}),redSin:R.redSin,
        carne:[R.carne.cli,R.carne.solo,R.carne.ambos,R.carne.siempre],carneL:R.carne.lista.map(function(o){return o.c+'|'+o.h+'|'+o.kg+'|'+o.u;}),
        nuevos:R.nuevos,
        top:R.topCli.map(function(o){return o.c+':'+o.ent;})};})()`).then(x => (x && !x.__err) ? x : null);
    chk('semana 37', !!R && R.semN === 37, R);
    chk('lo mismo que Ventas retail: $389.500 (B2B incluido, Catering no) · costo $280.800 · 6 entregas', !!R && JSON.stringify(R.tot) === JSON.stringify(R.rt) && R.tot[0] === 389500 && R.tot[1] === 280800 && R.tot[2] === 6, R && [R.tot, R.rt]);
    chk('contra la semana 36: $120.000 · 2 entregas', !!R && R.ant[0] === 120000 && R.ant[1] === 2, R && R.ant);
    chk('los dias suman la semana', !!R && R.dias[0] === 6 && R.dias[1] === 389500, R && R.dias);
    chk('clientes de saludSem: 4 · 1 · 2 · 1', !!R && R.cl && R.cl.total === 4 && R.cl.nuevos === 1, R && R.cl);
    chk('gastos $10.000 (sin proveedores $50.000, Catering $7.000 ni vueltos $3.000, y sin la Nafta de otra semana)', !!R && JSON.stringify(R.gas) === '[10000,50000,7000,3000]', R && R.gas);
    chk('otros ingresos $1.200 (sin la liquidacion de Red ni el vuelto)', !!R && R.ing === 1200, R && R.ing);
    chk('la carne en kilos (2,25) y las unidades aparte (6 packs)', !!R && JSON.stringify(R.k) === '["CLo:2.25"]' && JSON.stringify(R.u) === '["PPM:6"]' && R.x === 0, R && [R.u, R.k, R.x]);
    chk('Ana dos pedidos del mismo viaje = 1 entrega; Red afuera del top', !!R && R.top.indexOf('Ana Prueba:1') >= 0 && !R.top.some(t => /Red/.test(t)), R && R.top);
    chk('cobrado en la semana: $126.000 en 4 cobros · EF $56.000 (el Mixto del club parte 6.000/20.000) · TR $70.000', !!R && JSON.stringify(R.cob) === '[126000,56000,70000,4]', R && R.cob);
    chk('por cobrar de lo entregado: $91.500 (Ana 10.000 + Fede 40.000 + Red 41.500)', !!R && R.pend === 91500, R && R.pend);
    /* 14/9/2026: al CIERRE de la semana, no el estado de ahora. Abierto el lunes, lo
       cobrado el lunes desaparecia de la lista (la 37 real decia 2 clientes y eran 6). */
    chk('al cierre: el pedido de Ana cobrado el lunes 14/9 SIGUE en la lista, con la fecha en que entro', !!R && Array.isArray(R.pendL) && R.pendL.indexOf('Ana Prueba|Home|10000|2026-09-14') >= 0 && R.pendYa === 10000, R && [R.pendL, R.pendYa]);
    chk('primero lo que sigue sin cobrar (Red 41.500, Fede 40.000), despues lo ya cobrado; Pilara es Otras zonas', !!R && Array.isArray(R.pendL) && R.pendL.length === 3 && /^Final Uno/.test(R.pendL[0]) && R.pendL[1] === 'Fede Prueba|Otras zonas|40000|', R && R.pendL);
    chk('Red Pendiente sin pagarle a Maleu va aparte, por vendedor ($30.000); el Pendiente que ya pago no', !!R && JSON.stringify(R.redSin) === JSON.stringify([{ v: 'Vendedor Dos', n: 1, f: 30000 }]), R && R.redSin);
    chk('carne: 5 clientes · 1 solo carne (Fede) · 1 las dos cosas (Beto) · 3 solo lo de siempre', !!R && JSON.stringify(R.carne) === '[5,1,1,3]', R && R.carne);
    chk('la lista de carne: primero el que llevo las dos cosas, con kilos y unidades aparte', !!R && JSON.stringify(R.carneL) === JSON.stringify(['Beto Prueba|Home|1.5|1', 'Fede Prueba|Otras zonas|0.75|0']), R && R.carneL);
    chk('los nuevos salen de saludSem y se cruzan por REFERENCIA: Fede, Otras zonas, $40.000, 0,75 kg', !!R && Array.isArray(R.nuevos) && R.nuevos.length === 1 && R.nuevos[0].c === 'Fede Prueba' && R.nuevos[0].h === 'Otras zonas' && R.nuevos[0].f === 40000 && R.nuevos[0].kg === 0.75 && R.nuevos[0].u === 0 && R.nuevos[0].ok === true, R && R.nuevos);
    const card = await ev(cli, `(function(){try{go('inicio');}catch(e){}var c=[].slice.call(document.querySelectorAll('#sem-body-prev .card')).filter(function(x){return /Semana 37/.test(x.textContent);})[0];if(!c)return null;
      var m=c.textContent.match(/Cobrado en la semana\\s*\\$([\\d.]+)/),e=c.textContent.match(/EF \\$([\\d.]+) · TR \\$([\\d.]+)/);
      return {t:m?Number(m[1].replace(/\\./g,'')):null,ef:e?Number(e[1].replace(/\\./g,'')):null,tr:e?Number(e[2].replace(/\\./g,'')):null,
        pdf:(c.innerHTML.match(/descargarPDFSemana\\(([^)]*)\\)/)||[])[1]};})()`);
    chk('lo cobrado = la tarjeta "Cobrado en la semana" (total, EF y TR)', !!R && !!card && card.t === R.cob[0] && card.ef === R.cob[1] && card.tr === R.cob[2] && R.cob[0] === 126000, [R && R.cob, card]);
    chk('el boton de la semana manda el lunes con su año', !!card && /2026-09-07/.test(card.pdf || ''), card && card.pdf);
    const s53 = await ev(cli, `(function(){var R=_rsArmar('2026-12-28');return {semN:R.semN,cob:R.cob.tot,h:R.h,pend:R.pendTot};})()`);
    chk('semana 53 (28/12 a 3/1): el cobro del "02/01" sin año cae adentro, y no queda por cobrar', s53 && s53.semN === 53 && s53.cob === 7000 && s53.h === '2027-01-03' && s53.pend === 0, s53);

    const doc = await ev(cli, `(function(){var w=document.getElementById('rsHiddenWrap');w.innerHTML=_rsRender(_rsArmar('2026-09-07'));var t=w.textContent;w.innerHTML='';return t;})()`);
    const T = typeof doc === 'string' ? doc : '';
    chk('el documento: portada, facturado y margen', /Semana 37/.test(T) && /Facturado \$389\.500/.test(T) && /margen \$108\.700 \(28%\)/.test(T), T.slice(0, 300));
    chk('el documento: la carne "2,25 kg" y "Carne Lomo"', /Carne Lomo/.test(T) && /2,25 kg/.test(T));
    chk('el documento dice lo que NO cuenta como gasto', /pagos a proveedores \$50\.000/.test(T) && /vueltos \$3\.000/.test(T) && /Catering \$7\.000/.test(T));
    chk('el documento: margen menos gastos $99.900 ($108.700 − $10.000 + $1.200)', /Margen menos gastos\s*\$99\.900/.test(T), (T.match(/Margen menos gastos.{0,20}/) || [])[0]);
    chk('sin undefined, NaN ni centavos', T.length > 500 && !/undefined|NaN|\[object/.test(T) && !/\$\s?\d{1,3}(\.\d{3})*,\d/.test(T));
    chk('el documento: "Al cierre de la semana quedó por cobrar" $91.500, "cobrado Lun 14/9" y cuanto falta', /Al cierre de la semana quedó por cobrar de lo entregado: \$91\.500/.test(T) && /cobrado Lun 14\/9/.test(T) && /De eso ya entró \$10\.000 después del domingo; falta \$81\.500/.test(T), (T.match(/Al cierre.{0,300}/) || [])[0]);
    chk('el documento: Red en poder del vendedor, "Vendedor Dos 1 pedido $30.000"', /Red en poder del vendedor.{0,80}Vendedor Dos 1 pedido \$30\.000/.test(T) && !/Final Tres/.test(T), (T.match(/Aparte, Red.{0,160}/) || [])[0]);
    chk('el documento: quienes son los nuevos, con lo que llevaron', /Quiénes son los nuevos/.test(T) && /Fede PruebaOtras zonas🥩 0,75 kg\$40\.000/.test(T), (T.match(/Quiénes son los nuevos.{0,120}/) || [])[0]);
    chk('el documento: "Carne y lo de siempre" con la lista', /Carne y lo de siempre/.test(T) && /Beto PruebaHome1,5 kg1 u\. · Pack Pizzas x2/.test(T) && /Fede PruebaOtras zonas0,75 kg—/.test(T), (T.match(/Carne y lo de siempre.{0,300}/) || [])[0]);
    /* Si el servidor no manda los nombres (copia vieja) o el pedido no esta en el celular, se dice. */
    const nv = await ev(cli, `(function(){var s=D.saludSem['2026-37'],w=document.getElementById('rsHiddenWrap'),bk=s.nuevosL;
      s.nuevosL=[{c:'Fede Prueba',r:['Pilar|77']},{c:'Lejano Prueba',r:['Home|99999']}];w.innerHTML=_rsRender(_rsArmar('2026-09-07'));var a=w.textContent;
      delete s.nuevosL;w.innerHTML=_rsRender(_rsArmar('2026-09-07'));var b=w.textContent;s.nuevosL=bk;w.innerHTML='';
      return {sinPed:/Lejano Prueba——/.test(a)&&/De 1 no llegó el pedido/.test(a),viejo:/Los nombres de los nuevos no llegaron/.test(b)&&!/Quiénes son los nuevos/.test(b)};})()`);
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

    await ev(cli, `window.__gets=[];var _b=document.querySelector('#hRetail .rt-pdf');if(_b)_b.click();`);
    const salio = await esperar(cli, `!!window.__pdf`, 60000);
    const pdf = await ev(cli, `({pdf:window.__pdf,gets:window.__gets,toasts:window.__toasts})`);
    chk('el PDF sale: "Maleu - Resumen Semana 37 (07-09-2026 a 13-09-2026).pdf"', salio && pdf.pdf && pdf.pdf.nombre === 'Maleu - Resumen Semana 37 (07-09-2026 a 13-09-2026).pdf' && pdf.pdf.paginas >= 1, pdf);
    chk('sin pedirle el resumen al servidor', !!pdf && Array.isArray(pdf.gets) && pdf.gets.indexOf('resumenSemanal') < 0, pdf && pdf.gets);

    console.log('\n-- fase b: el catalogo tarda 12 s --');
    await abrirFase(cli, 'b');
    await ev(cli, `descargarPDFSemana('2026-09-07')`);
    const salioB = await esperar(cli, `!!window.__pdf`, 60000);
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
