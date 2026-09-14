/* COBROS: el detalle del cobro con la carne, y cobrar juntos pedidos de dias
   distintos (14/9/2026).

   node probar_cobros_detalle.js [390|1440] [ruta.html]

   Tadeo: "en el detalle de cobros de un cliente no aparece la carne", y con un
   cliente que compro dos veces ("Cobrar los 2 juntos") queria "ver todo el detalle
   de ambos pedidos en uno". Datos INVENTADOS (este repo es publico), con la forma
   real de `action=cobrosPendientes`:
     · un cliente con DOS pedidos de dias distintos, uno SOLO de carne (sin piezas:
       es de antes de las piezas) y otro mixto con dos piezas;
     · otro cliente con dos pedidos de dias distintos, cada uno con su envio;
     · otro con dos pedidos del MISMO dia, cada uno con envio.
   Lo que se sostiene:
     · el cuadro de cobrar juntos muestra los DOS pedidos, cada uno con su dia y
       su plata, y sus productos con nombre, kilos y la pieza;
     · un pedido solo de carne no desaparece del detalle;
     · los nombres y las unidades llegan con COBROS, sin haber abierto RUTA;
     · dos pedidos de DIAS distintos cobran los dos envios; del mismo dia, uno;
     · el cobro suelto de un pedido de carne tambien la muestra.
   Los POST se interceptan: nada llega al backend. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));

const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'ruta.html';
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

const c = o => Object.assign({ totalOriginal: o.$, cobradoParcial: 0, parciales: [], es: 'Entregado', fePed: o.fe, feEnt: o.fe, t: '' }, o);
const COBROS = [
  /* El cliente de carne: dos pedidos, dias distintos. */
  c({ key: 'Pilar|152', h: 'Pilar', id: '152', r: 52, c: 'Cliente Carne', t: '1150000071', $: 79693, fp: 'Efectivo', de: 'Jueves', fe: '03/09/2026',
      sub: 79693, env: 0, desc: 0, p: [{ a: 'CCo', q: 1.245 }, { a: 'CVa', q: 1.868 }] }),
  c({ key: 'Pilar|166', h: 'Pilar', id: '166', r: 66, c: 'Cliente Carne', t: '1150000071', $: 145130, fp: 'Transferencia', de: 'Sábado', fe: '12/09/2026',
      sub: 145130, env: 0, desc: 0, p: [{ a: 'SQB', q: 1 }, { a: 'CEn', q: 0.668 }, { a: 'CVa', q: 1.843 }],
      pz: [{ a: 'CEn', id: 'P-9045', kg: 0.668 }, { a: 'CVa', id: 'P-9020', kg: 1.843 }] }),
  /* Dos entregas en dias distintos, cada una con su envio. */
  c({ key: 'Pilar|170', h: 'Pilar', id: '170', r: 70, c: 'Dos Envios', t: '1150000072', $: 25000, fp: 'Transferencia', de: 'Viernes', fe: '04/09/2026',
      sub: 20000, env: 5000, desc: 0, p: [{ a: 'PPM', q: 1 }] }),
  c({ key: 'Pilar|171', h: 'Pilar', id: '171', r: 71, c: 'Dos Envios', t: '1150000072', $: 25000, fp: 'Transferencia', de: 'Viernes', fe: '11/09/2026',
      sub: 20000, env: 5000, desc: 0, p: [{ a: 'PPM', q: 1 }] }),
  /* Dos pedidos del MISMO dia con envio: una sola entrega. */
  c({ key: 'Pilar|180', h: 'Pilar', id: '180', r: 80, c: 'Mismo Dia', t: '1150000073', $: 25000, fp: 'Transferencia', de: 'Sábado', fe: '12/09/2026',
      sub: 20000, env: 5000, desc: 0, p: [{ a: 'PPM', q: 1 }] }),
  c({ key: 'Pilar|181', h: 'Pilar', id: '181', r: 81, c: 'Mismo Dia', t: '1150000073', $: 25000, fp: 'Transferencia', de: 'Sábado', fe: '12/09/2026',
      sub: 20000, env: 5000, desc: 0, p: [{ a: 'PPM', q: 1 }] })
];
const PRODS = { CCo: { n: 'Carne Colita de Cuadril', u: 'kg' }, CVa: { n: 'Carne Vacío', u: 'kg' }, CEn: { n: 'Carne Entraña', u: 'kg' },
  SQB: { n: 'Sorrentinos Queso Brie', u: 'u' }, PPM: { n: 'Pack Muzzarella x2', u: 'u' } };
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, alias: 'maleump', banco: 'Mercado Pago', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', col: 7, alias: 'maleubru', banco: 'Brubank', def: false, inv: false }
];
const PRECIOS = { CCo: { p: 25000, c: 18800 }, CVa: { p: 26000, c: 18200 }, CEn: { p: 34000, c: 30000 }, SQB: { p: 12000, c: 7000 }, PPM: { p: 20000, c: 11000 } };

const PREP = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  try{localStorage.clear();}catch(e){}
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST'){ var bd={}; try{bd=JSON.parse(o.body);}catch(e){} window.__posts.push(bd); return J({ok:true}); }
    /* entregas SIN prods: los nombres tienen que llegar con COBROS */
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:[],cuentas:${JSON.stringify(CUENTAS)},arm:{},rep:{},hechas:[]});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:window.__COBROS_OFF?[]:${JSON.stringify(COBROS)},billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)},prods:window.__SIN_PRODS?undefined:${JSON.stringify(PRODS)}});
    if(url.indexOf('action=precios')>-1) return J(${JSON.stringify(PRECIOS)});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();`;

const texto = (cli, sel) => ev(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent:null;})()`);
async function abrirGrupo(cli, cliente) {
  return ev(cli, `(function(){var cards=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card'));
    for(var i=0;i<cards.length;i++){if(cards[i].textContent.indexOf(${JSON.stringify(cliente)})>-1){var b=[].slice.call(cards[i].querySelectorAll('button')).filter(function(x){return /juntos/.test(x.textContent);})[0];if(b){b.click();return true;}}}return false;})()`);
}
const cerrar = cli => ev(cli, `typeof cerrarCobroRuta==='function'&&cerrarCobroRuta()`);

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE });
    if (!await esperar(cli, "typeof switchTab==='function' && typeof abrirCobroComboCobros==='function'")) throw new Error('la sub-app no arranco');
    await pausa(600);
    await ev(cli, `switchTab('cobros')`);
    if (!await esperar(cli, `document.querySelectorAll('#cobrosContent .cobro-card').length>=3`, 20000)) throw new Error('COBROS no pinto las tarjetas');
    await pausa(500);

    console.log('\n── 1. Cobrar juntos: dos pedidos de dias distintos, uno solo de carne · ' + ANCHO + 'px ──');
    chk('la tarjeta del cliente ofrece cobrar los 2 juntos', await abrirGrupo(cli, 'Cliente Carne') === true);
    await pausa(600);
    const pr = await texto(cli, '#cobroRutaProds') || '';
    chk('el detalle se ve', await ev(cli, `(function(){var e=document.getElementById('cobroRutaProds');return !!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;})()`) === true, pr);
    chk('dice que son los 2 pedidos (no "una sola entrega": son de dias distintos)', /Los 2 pedidos/.test(pr) && !/una sola entrega/.test(pr), pr);
    chk('el pedido SOLO de carne esta, con su dia y su plata', /Pilar #152 · jue 3\/9/.test(pr) && /\$79\.693/.test(pr), pr);
    chk('y el otro, con su dia y su plata', /Pilar #166 · sáb 12\/9/.test(pr) && /\$145\.130/.test(pr), pr);
    chk('la carne dice los kilos con coma y el nombre del corte', /1,245 kg Carne Colita de Cuadril/.test(pr) && /1,868 kg Carne Vacío/.test(pr), pr);
    chk('la pieza que se llevo', /Carne Entraña · 1 pieza de 0,668 kg/.test(pr) && /1 pieza de 1,843 kg/.test(pr), pr);
    chk('y lo que no es carne, por unidad', /1x Sorr. Queso Brie/.test(pr), pr);
    chk('ninguna abreviatura suelta', !/\bCCo\b|\bCVa\b|\bCEn\b|\bSQB\b/.test(pr), pr);
    const anchoOk = await ev(cli, `(function(){var e=document.getElementById('cobroRutaProds');return e.scrollWidth<=e.clientWidth+1;})()`);
    chk('el detalle no desborda a lo ancho', anchoOk === true, anchoOk);
    await cerrar(cli); await pausa(300);

    console.log('\n── 2. El envio: uno por dia de entrega ──');
    chk('dos entregas de dias distintos: abre', await abrirGrupo(cli, 'Dos Envios') === true);
    await pausa(600);
    const d2 = await texto(cli, '#cobroRutaDescInfo') || '', s2 = await texto(cli, '#cobroRutaSub') || '';
    chk('cobra los DOS envios ($10.000) y el total es $50.000', /envío \$10\.000/.test(d2) && /Total \$50\.000/.test(s2), { d2, s2 });
    chk('y no dice que el envio va una sola vez', !/una sola vez/.test(d2), d2);
    await cerrar(cli); await pausa(300);
    chk('dos pedidos del MISMO dia: abre', await abrirGrupo(cli, 'Mismo Dia') === true);
    await pausa(600);
    const d3 = await texto(cli, '#cobroRutaDescInfo') || '', s3 = await texto(cli, '#cobroRutaSub') || '', p3 = await texto(cli, '#cobroRutaProds') || '';
    chk('un solo envio ($5.000) y total $45.000', /envío \$5\.000/.test(d3) && /Total \$45\.000/.test(s3), { d3, s3 });
    chk('dice que el envio va una sola vez', /una sola vez/.test(d3), d3);
    chk('el detalle dice "una sola entrega" y no repite el dia', /2 pedidos, una sola entrega/.test(p3) && !/· sáb/.test(p3), p3);
    await cerrar(cli); await pausa(300);

    console.log('\n── 3. El cobro suelto de un pedido de carne ──');
    const idx = await ev(cli, `(function(){for(var i=0;i<pendientesCobro.length;i++){if(String(pendientesCobro[i].id)==='152')return i;}return -1;})()`);
    await ev(cli, `abrirCobroPendiente(${idx})`);
    await pausa(600);
    const p4 = await texto(cli, '#cobroRutaProds') || '';
    chk('muestra la carne del pedido', /Pedido/.test(p4) && /1,245 kg Carne Colita de Cuadril/.test(p4), p4);
    await cerrar(cli);

    const errs = await ev(cli, 'window.__errores');
    chk('sin errores de JS', Array.isArray(errs) && errs.length === 0, errs);
    chk('ningun POST salio', (await ev(cli, 'window.__posts.length')) === 0, await ev(cli, 'window.__posts'));
  } catch (e) {
    mal++; console.log('  MAL  la prueba se corto: ' + (e && e.message || e));
  } finally {
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    try { cli.matar(); } catch (e) {}
    process.exit(mal ? 1 : 0);
  }
})();
