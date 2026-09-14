/* COBROS: copiar el detalle para pegarselo al cliente por WhatsApp (14/9/2026).

   node probar_cobros_copiar.js [390|1440] [ruta.html]

   Tadeo: "faltaria en COBROS la opcion de copiar el detalle, asi se lo podemos
   pegar al cliente por wpp". Datos INVENTADOS (este repo es publico), con la forma
   real de `action=cobrosPendientes`. Lo que se sostiene:
     · la card suelta y la del grupo tienen "Copiar detalle", y el cuadro de cobro
       tambien; los tres copian el MISMO texto para los mismos pedidos;
     · el texto: el saludo segun si ya se lo llevo, cada producto con su nombre
       ENTERO, la carne con la pieza, el precio de linea SOLO si suma el subtotal
       guardado, el desglose (subtotal, descuento, envio) cuando lo hay, lo que
       falta si hubo un parcial, varios pedidos con su dia y el total de todos, el
       dia de entrega solo si todavia no se entrego, y los dos alias;
     · lo copiado queda a la vista para seleccionarlo a mano;
     · el nombre del cliente (lo escribe el cliente en la tienda) no se ejecuta;
     · los botones se tocan bien y no desborda;
     · ningun POST sale. */
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

/* Hoy, como lo escribe COBROS: dd/MM/aaaa. */
const hoy = new Date();
const HOY = String(hoy.getDate()).padStart(2, '0') + '/' + String(hoy.getMonth() + 1).padStart(2, '0') + '/' + hoy.getFullYear();
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const HOY_TXT = DIAS[hoy.getDay()] + ' ' + hoy.getDate() + '/' + (hoy.getMonth() + 1);

const c = o => Object.assign({ totalOriginal: o.$, cobradoParcial: 0, parciales: [], es: 'Entregado', fePed: o.fe, feEnt: o.fe, t: '', env: 0, desc: 0 }, o);
const COBROS = [
  /* Suelto, entregado, con envio y descuento, carne con pieza. El nombre trae HTML. */
  c({ key: 'Pilar|201', h: 'Pilar', id: '201', r: 201, c: 'vicky <img src=x onerror="window.__xss=1"> Prueba', t: '1150000081', fp: 'Transferencia', de: 'Sábado', fe: '12/09/2026',
      sub: 62712, env: 5000, desc: 6271, $: 61441, p: [{ a: 'PPM', q: 2 }, { a: 'CEn', q: 0.668 }], pz: [{ a: 'CEn', id: 'P-9101', kg: 0.668 }] }),
  /* Grupo: dos pedidos de dias distintos. */
  c({ key: 'Pilar|202', h: 'Pilar', id: '202', r: 202, c: 'Pablo Prueba', t: '1150000082', fp: 'Transferencia', de: 'Jueves', fe: '03/09/2026',
      sub: 49500, $: 49500, p: [{ a: 'CLo', q: 1.5 }] }),
  c({ key: 'Home|203', h: 'Home', id: '203', r: 203, c: 'Pablo Prueba', t: '1150000082', fp: 'Efectivo', de: 'Sábado', fe: '12/09/2026',
      sub: 77000, $: 77000, p: [{ a: 'SQB', q: 1 }, { a: 'CVa', q: 2.5 }], pz: [{ a: 'CVa', id: 'P-9103', kg: 1.3 }, { a: 'CVa', id: 'P-9102', kg: 1.2 }] }),
  /* El precio de la lista cambio despues de cargarlo: sin precio de linea. */
  c({ key: 'Home|204', h: 'Home', id: '204', r: 204, c: 'Precio Viejo', t: '1150000083', fp: 'Transferencia', de: 'Viernes', fe: '11/09/2026',
      sub: 18000, $: 18000, p: [{ a: 'PPM', q: 1 }] }),
  /* Con un parcial: dice lo que falta. */
  c({ key: 'Pilar|205', h: 'Pilar', id: '205', r: 205, c: 'Parcial Prueba', t: '1150000084', fp: 'Transferencia', de: 'Viernes', fe: '11/09/2026',
      sub: 20000, env: 10000, totalOriginal: 30000, cobradoParcial: 10000, parciales: [{ fecha: '11/09/2026', fp: 'Efectivo', monto: 10000 }], $: 20000, p: [{ a: 'PPM', q: 1 }] }),
  /* Todavia no se entrego: dice cuando se lo llevo y no "cuando puedas me transferis". */
  c({ key: 'Home|206', h: 'Home', id: '206', r: 206, c: 'Reserva Prueba', t: '1150000085', fp: 'Transferencia', de: '', fe: HOY, es: 'Reservado',
      sub: 20000, $: 20000, p: [{ a: 'PPM', q: 1 }] })
];
const PRODS = { CEn: { n: 'Carne Entraña', u: 'kg' }, CLo: { n: 'Carne Lomo', u: 'kg' }, CVa: { n: 'Carne Vacío', u: 'kg' },
  SQB: { n: 'Sorrentinos Queso Brie', u: 'u' }, PPM: { n: 'Pack Muzzarella x2', u: 'u' } };
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, alias: 'maleump', banco: 'Mercado Pago', def: true, inv: true },
  { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', col: 7, alias: 'maleubru', banco: 'Brubank', def: false, inv: false }
];
const PRECIOS = { CEn: { p: 34000, c: 30000 }, CLo: { p: 33000, c: 28500 }, CVa: { p: 26000, c: 18200 }, SQB: { p: 12000, c: 7000 }, PPM: { p: 20000, c: 11000 } };

const PREP = `
  window.__posts=[]; window.__errores=[]; window.__copias=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  try{localStorage.clear();}catch(e){}
  try{ Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:function(t){window.__copias.push(String(t));return Promise.resolve();}}}); }catch(e){}
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST'){ var bd={}; try{bd=JSON.parse(o.body);}catch(e){} window.__posts.push(bd); return J({ok:true}); }
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:[],cuentas:${JSON.stringify(CUENTAS)},arm:{},rep:{},hechas:[]});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:${JSON.stringify(COBROS)},billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)},prods:${JSON.stringify(PRODS)}});
    if(url.indexOf('action=precios')>-1) return J(${JSON.stringify(PRECIOS)});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();`;

/* Toca el boton de copiar de la card que nombra al cliente y devuelve lo copiado. */
async function copiarCard(cli, cliente, re) {
  return ev(cli, `(function(){var antes=window.__copias.length;var cards=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card'));
    for(var i=0;i<cards.length;i++){if(cards[i].textContent.indexOf(${JSON.stringify(cliente)})>-1){var b=[].slice.call(cards[i].querySelectorAll('button')).filter(function(x){return ${re}.test(x.textContent);})[0];if(b){b.click();return {ok:true,antes:antes};}}}return {ok:false};})()`);
}
const ultima = cli => ev(cli, 'window.__copias[window.__copias.length-1]||""');

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
    if (!await esperar(cli, `document.querySelectorAll('#cobrosContent .cobro-card').length>=5`, 20000)) throw new Error('COBROS no pinto las tarjetas');
    await pausa(800);
    if (typeof await ev(cli, 'typeof cobroCopiarDetalle') !== 'string' || await ev(cli, 'typeof cobroCopiarDetalle') !== 'function') {
      chk('existe el boton de copiar el detalle', false, 'no hay cobroCopiarDetalle');
      throw new Error('sin la funcion no hay nada mas que medir');
    }

    console.log('\n── 1. La card suelta · ' + ANCHO + 'px ──');
    const nb = await ev(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter(function(x){return /Precio Viejo/.test(x.textContent);})[0];return c?[].map.call(c.querySelectorAll('button'),function(b){return b.textContent;}):null;})()`);
    chk('la card suelta tiene Copiar detalle, Pedir comprobante y Cobrado', Array.isArray(nb) && nb.some(t => /Copiar detalle/.test(t)) && nb.some(t => /Pedir comprobante/.test(t)) && nb.some(t => /^Cobrado$/.test(t)), nb);
    const r1 = await copiarCard(cli, 'onerror', '/Copiar detalle/');
    await pausa(300);
    const m1 = await ultima(cli);
    chk('toca y copia', r1 && r1.ok === true && !!m1, r1);
    chk('saluda con el nombre de pila en mayúscula y dice que ya se lo llevó', /^¡Hola Vicky! Te dejo el detalle de lo que te llevaste/.test(m1), m1);
    chk('el pack con cantidad, nombre entero y precio', /\n• 2× Pack Muzzarella x2 — \$40\.000\n/.test(m1), m1);
    chk('la carne: nombre, la pieza y su precio', /\n• Carne Entraña — 1 pieza de 0,668 kg · \$22\.712\n/.test(m1), m1);
    chk('el desglose: subtotal, descuento y envío', /Subtotal \$62\.712 · descuento −\$6\.271 · envío \$5\.000/.test(m1), m1);
    chk('el total es lo que figura pendiente', /💳 Total: \$61\.441/.test(m1), m1);
    chk('los dos alias', /Para abonar: maleump \(Mercado Pago\) o maleubru \(Brubank\)/.test(m1), m1);
    chk('ya se lo llevó: "cuando puedas me transferís", sin decir cuándo se lo llevo', /Cuando puedas me transferís/.test(m1) && !/Te lo llevo/.test(m1), m1);
    chk('ni abreviaturas ni un link de WhatsApp', !/\bCEn\b|\bPPM\b|wa\.me/.test(m1), m1);
    const vis = await ev(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter(function(x){return /onerror/.test(x.textContent);})[0];var p=c&&c.querySelector('.cobro-msg pre');return p?p.textContent:null;})()`);
    chk('lo copiado queda a la vista debajo de la card', vis === m1, vis);
    const xss = await ev(cli, `({xss:!!window.__xss, img:!!document.querySelector('#cobrosContent .cobro-card-name img')})`);
    chk('el nombre con HTML se muestra como texto, no se ejecuta', xss && !xss.xss && !xss.img, xss);

    console.log('\n── 2. El precio cambió después de cargar el pedido ──');
    await copiarCard(cli, 'Precio Viejo', '/Copiar detalle/'); await pausa(300);
    const m2 = await ultima(cli);
    chk('sin precio de línea (no cierra con el subtotal), pero con el total', /\n• 1× Pack Muzzarella x2\n/.test(m2) && /Total: \$18\.000/.test(m2), m2);

    console.log('\n── 3. Un parcial ──');
    await copiarCard(cli, 'Parcial Prueba', '/Copiar detalle/'); await pausa(300);
    const m3 = await ultima(cli);
    chk('dice lo que ya pagó y lo que falta', /Ya me pagaste \$10\.000 de \$30\.000: falta \$20\.000/.test(m3) && /💳 Falta: \$20\.000/.test(m3), m3);

    console.log('\n── 4. Todavía no se entregó ──');
    await copiarCard(cli, 'Reserva Prueba', '/Copiar detalle/'); await pausa(300);
    const m4 = await ultima(cli);
    chk('"te paso el detalle de tu pedido" y "te lo llevo *hoy*"', /Te paso el detalle de tu pedido/.test(m4) && new RegExp('Te lo llevo \\*hoy\\*, ' + HOY_TXT.replace(/\//g, '\\/')).test(m4), m4);
    chk('y no le dice "cuando puedas me transferís"', !/Cuando puedas me transferís/.test(m4), m4);

    console.log('\n── 5. El grupo: dos pedidos de días distintos ──');
    const r5 = await copiarCard(cli, 'Pablo Prueba', '/Copiar el detalle de los 2/');
    await pausa(300);
    const m5 = await ultima(cli);
    chk('la card del grupo tiene "Copiar el detalle de los 2"', r5 && r5.ok === true, r5);
    chk('"los 2 pedidos que te llevaste"', /^¡Hola Pablo! Te dejo el detalle de los 2 pedidos que te llevaste/.test(m5), m5);
    chk('cada pedido con su día, su número y su plata', /📦 Jueves 3\/9 · pedido #202 — \$49\.500/.test(m5) && /📦 Sábado 12\/9 · pedido #203 — \$77\.000/.test(m5), m5);
    chk('la carne sin pieza va con los kilos', /• Carne Lomo — 1,5 kg · \$49\.500/.test(m5), m5);
    chk('las dos piezas, de la más liviana a la más pesada', /• Carne Vacío — 2 piezas: 1,200 y 1,300 kg · \$65\.000/.test(m5), m5);
    chk('el total de los dos', /💳 Total de los 2: \$126\.500/.test(m5), m5);
    const pos = m5.indexOf('#202'), pos2 = m5.indexOf('#203');
    chk('el más viejo primero', pos > -1 && pos2 > pos, [pos, pos2]);

    console.log('\n── 6. El cuadro de cobrar juntos copia lo mismo ──');
    await ev(cli, `(function(){var cards=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card'));for(var i=0;i<cards.length;i++){if(/Pablo Prueba/.test(cards[i].textContent)){var b=[].slice.call(cards[i].querySelectorAll('button')).filter(function(x){return /juntos/.test(x.textContent);})[0];if(b)b.click();}}})()`);
    await pausa(700);
    const btnQ = await ev(cli, `(function(){var b=document.querySelector('#cobroRutaProds .cobro-prods-copy');if(!b)return null;var r=b.getBoundingClientRect();return {h:Math.round(r.height),txt:b.textContent};})()`);
    chk('el detalle del cuadro tiene "Copiar para el cliente"', btnQ && /Copiar para el cliente/.test(btnQ.txt), btnQ);
    await ev(cli, `document.querySelector('#cobroRutaProds .cobro-prods-copy').click()`); await pausa(300);
    const m6 = await ultima(cli);
    chk('y copia exactamente lo mismo que la card', m6 === m5, m6);
    chk('el botón del cuadro se toca bien (38px o más)', btnQ && btnQ.h >= 38, btnQ);
    await ev(cli, `typeof cerrarCobroRuta==='function'&&cerrarCobroRuta()`); await pausa(300);

    console.log('\n── 7. Pantalla ──');
    const geo = await ev(cli, `(function(){var o={desborde:document.documentElement.scrollWidth>window.innerWidth+1,chicos:[],n:0};
      [].forEach.call(document.querySelectorAll('#cobrosContent .cobro-card-actions button'),function(b){var r=b.getBoundingClientRect();if(r.width===0)return;o.n++;if(r.height<44)o.chicos.push([b.textContent,Math.round(r.height)]);});
      var t=[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter(function(x){return /Precio Viejo/.test(x.textContent);})[0];
      if(t){var bs=t.querySelectorAll('.cobro-card-actions button');o.fila1=bs.length===3&&Math.abs(bs[0].getBoundingClientRect().top-bs[1].getBoundingClientRect().top)<2;o.cobradoAbajo=bs.length===3&&bs[2].getBoundingClientRect().top>bs[0].getBoundingClientRect().bottom-1;}
      return o;})()`);
    chk('sin desborde a lo ancho', geo && geo.desborde === false, geo);
    chk('los botones de las cards miden 44px o más (' + (geo && geo.n) + ' botones)', geo && geo.n >= 8 && geo.chicos.length === 0, geo);
    chk('copiar y comprobante lado a lado, Cobrado abajo a lo ancho', geo && geo.fila1 === true && geo.cobradoAbajo === true, geo);

    const errs = await ev(cli, 'window.__errores');
    chk('sin errores de JS', Array.isArray(errs) && errs.length === 0, errs);
    chk('ningún POST salió', (await ev(cli, 'window.__posts.length')) === 0, await ev(cli, 'window.__posts'));
  } catch (e) {
    mal++; console.log('  MAL  la prueba se corto: ' + (e && e.message || e));
  } finally {
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    try { cli.matar(); } catch (e) {}
    process.exit(mal ? 1 : 0);
  }
})();
