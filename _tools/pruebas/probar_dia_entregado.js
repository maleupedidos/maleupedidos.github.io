/* Inicio > Resumen: lo de cada dia de la semana (14/9/2026; desde el 10/11/2026, el detalle
   que se abre tocando el cuadrado del dia en Ventas retail — el desplegable «📅 Sem N» se saco).

   node probar_dia_entregado.js [390|1440]
   APP=app_viejo_tmp.html node probar_dia_entregado.js 390    ← la direccion contraria

   Tadeo: "Lun 14/09 · HOY · 1 entrega · Pilar 1 · Entregado ese dia $97.600 — pero
   todavia no fue entregado el pedido de Carolina". La tarjeta contaba como entregado
   todo pedido con entrega ELEGIDA ese dia, entregado o no.

   Backend STUBBEADO con datos inventados (repo publico) y el reloj congelado en el
   miercoles 16/9/2026 15:00, para tener un dia pasado, hoy y uno que viene. Sin token.

   Sostiene:
   · "N entregas" y "Entregado ese dia" cuentan SOLO lo entregado, por el dia de la
     venta (el sello de entrega en Home/Pilar): un pedido elegido para el lunes y
     entregado el martes cuenta el martes; dos pedidos del mismo viaje son una
     entrega; en Red, una bolsa por vendedor por dia;
   · lo que no se entrego va aparte, con su nombre segun el dia: "Quedo sin marcar
     entregado" (pasado), "Falta entregar hoy", "Para entregar" (futuro), con el
     monto y si ya esta cobrado; un cancelado no aparece;
   · la suma de lo entregado de los dias = "Esta semana" de Ventas retail;
   · el Cobrado del dia no se toca (Carolina pago el lunes y sigue ahi);
   · celular: sin desborde y el renglon de lo que falta no pisa el monto. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); }
  return false;
};
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

let n = 300;
const P = o => Object.assign({ n: String(n++), f: '10/09/2026', de: 'Lunes', o: 'Deposito', ep: 'No Cobrado', fp: 'Transferencia', co: 0, p: [{ a: 'PPM', q: 1 }], r: n }, o);
const dm = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
/* Como el volcado real: Home y Pilar traen `fex` (el sello de entrega, vacio si no se
   entrego); `fe` y `f` van en "dd/MM". */
const HP = o => P(Object.assign({ h: 'Home', es: 'Entregado', bar: 'Estancias del Pilar' }, o, { dee: o.dee || o.fex, mc: String(o.fex || o.dee).slice(0, 7), fe: dm(o.fex), fex: o.fex || '' }));
const PEDIDOS = [
  // Lunes 14: Carolina, Reservado y pagado por adelantado. NO se entrego.
  HP({ h: 'Pilar', c: 'Carolina Prueba', bar: 'Pilara', es: 'Reservado', dee: '2026-09-14', $: 97600, co: 60000, ep: 'Cobrado', fc: '14/09', fp: 'Transferencia', tr: 97600 }),
  // Elegido para el lunes y entregado el martes: cuenta el martes. Y otro del mismo viaje.
  HP({ c: 'Ana Prueba', dee: '2026-09-14', fex: '2026-09-15', he: '19:00', $: 30000, co: 20000 }),
  HP({ c: 'Ana Prueba', dee: '2026-09-15', fex: '2026-09-15', he: '19:20', $: 10000, co: 7000 }),
  // Red el martes: dos clientes finales del mismo vendedor = una bolsa
  P({ h: 'Red', es: 'Entregado', c: 'Final Uno (Red: Vendedor Uno)', br: 'Vendedor Uno', dee: '2026-09-15', mc: '2026-09', $: 41500, co: 30000 }),
  P({ h: 'Red', es: 'Entregado', c: 'Final Dos (Red: Vendedor Uno)', br: 'Vendedor Uno', dee: '2026-09-15', mc: '2026-09', $: 24900, co: 18000 }),
  // Hoy miercoles 16: uno entregado sin cobrar, y un Clubes que falta
  HP({ c: 'Beto Prueba', fex: '2026-09-16', $: 17000, co: 9000 }),
  P({ h: 'Clubes', es: 'Pendiente', c: 'Socio Club (Champagnat)', br: 'Champagnat', dee: '2026-09-16', mc: '2026-09', $: 26000, co: 18000 }),
  // Viernes 18: dos para entregar, uno pagado. Y un cancelado que no aparece.
  HP({ c: 'Dani Prueba', es: 'Pendiente', dee: '2026-09-18', $: 50000, co: 30000 }),
  HP({ c: 'Eli Prueba', es: 'Pendiente', dee: '2026-09-18', $: 20000, co: 12000, ep: 'Cobrado', fc: '16/09', fp: 'Efectivo', ef: 20000 }),
  HP({ c: 'Cancelado Prueba', es: 'Cancelado', dee: '2026-09-18', $: 88000, co: 40000 }),
  // La semana pasada: no entra en estas tarjetas
  HP({ c: 'Fede Prueba', fex: '2026-09-12', $: 40000, co: 30000 })
];
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [{ nombre: 'Home', pedidos: 5 }], light: true, saludSem: {}, saludMes: {}, ventasExtra: [] };
const CAJA = { ts: 1, caja: {}, saldoBase: {}, gastos: [], ingresos: [], movimientos: [], efMano: [] };
const TEND = { ok: true, meses: [{ m: '2026-09', facturado: 1000, nuevos: 1 }], base: { total: 1 } };

const RELOJ = `(function(){var AH=new Date(2026,8,16,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__err=[];
  window.__tx=function(e){if(!e)return null;var w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),a=[],x;while((x=w.nextNode())){var s=x.nodeValue.replace(/\\s+/g,' ').trim();if(s)a.push(s);}return a.join(' ');};
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  try{ localStorage.setItem('maleu_tab','inicio'); localStorage.removeItem('ma3'); localStorage.removeItem('maleu_seismeses'); }catch(e){}
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo=${JSON.stringify(CAJA)};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='tendencia') cuerpo=${JSON.stringify(TEND)};
      else if(a==='catalogo') cuerpo={ok:true,productos:{Prueba:[{a:'PPM',n:'Pack',dem:1,u:'u',dep:'ustariz'}]}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},150);});
    }
    return o.apply(this,arguments); }; })();`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    console.log('\n== Tarjeta del dia · ' + ANCHO + 'px · ' + APP + ' ==');
    if (!await esperar(cli, `typeof go==='function' && window.D && D.pedidos && D.pedidos.length===${PEDIDOS.length}`, 90000)) { console.log('  el ERP no cargo los pedidos stubbeados'); salir(1); }
    await ev(cli, `go('inicio')`);
    await ev(cli, `rtPer('sem')`);
    if (!await esperar(cli, `document.querySelectorAll('#hRetail .rt-dia').length===7`, 20000)) { console.log('  no se dibujaron los 7 dias de Ventas retail', JSON.stringify(await ev(cli, `[document.querySelectorAll('#hRetail .rt-dia').length, (document.getElementById('hRetail')||{}).textContent.slice(0,300), window.__err]`))); salir(1); }
    chk('ya no está el desplegable «📅 Sem N» de abajo', (await ev(cli, `!!document.getElementById('sem-body-actual')`)) === false);
    const abrir = async iso => { await ev(cli, `rtDiaVer('${iso}')`); await pausa(250); return await ev(cli, `window.__tx(document.querySelector('#hRetail .rt-dd'))`) || ''; };
    const cuadro = iso => ev(cli, `window.__tx([].filter.call(document.querySelectorAll('#hRetail .rt-dia'),function(b){return (b.getAttribute('onclick')||'').indexOf('${iso}')>-1;})[0])`);

    console.log('\n-- lunes 14: Carolina, reservada y pagada, sin entregar --');
    const lun = await abrir('2026-09-14');
    chk('cada día es un botón y abre su detalle', /^Lunes 14\/9/.test(lun), lun);
    chk('dice que no hubo entregas', /No hubo entregas este día/.test(lun), lun);
    chk('"Quedó sin marcar entregado · 1 pedido · $97.600" con Carolina y "ya cobrado"', /Quedó sin marcar entregado · 1 pedido · \$97\.600/.test(lun) && /· Carolina Prueba Pilara · #\d+ \$97\.600 ya cobrado/.test(lun), lun);

    console.log('\n-- martes 15: quiénes fueron --');
    const cMar = await cuadro('2026-09-15');
    const mar = await abrir('2026-09-15');
    const nMar = Number(((cMar || '').match(/mar 15 (\d+)/) || [])[1]);
    chk('el cuadrado y el detalle dicen lo mismo (' + nMar + ' entregas)', nMar > 0 && new RegExp('Entregas ' + nMar + ' Vendido \\$106\\.400').test(mar), { cMar, mar });
    chk('margen bruto del día con su %: $106.400 − $75.000 = $31.400 (30%)', /Margen bruto \$31\.400 30%/.test(mar), mar);
    chk('ticket promedio: $106.400 / 3 = $35.467', /Ticket promedio \$35\.467/.test(mar), mar);
    chk('cobrado: 0% · falta $40.000 (Red no cuenta: lo cobra Maleu al representante)', /Cobrado 0% falta \$40\.000/.test(mar), mar);
    chk('Ana: dos pedidos del mismo viaje, un renglón de $40.000, sin cobrar', /1 Ana Prueba Home · 19:00 h · 2 pedidos en un viaje · #\d+ #\d+ \$40\.000 sin cobrar/.test(mar), mar);
    chk('Red: un renglón por cliente del representante, sin "(Red: …)"', /Final Uno Red · Vendedor Uno · #\d+ \$41\.500/.test(mar) && /Final Dos Red · Vendedor Uno · #\d+ \$24\.900/.test(mar) && !/\(Red:/.test(mar), mar);
    chk('incluye el pedido elegido para el lunes y entregado el martes; nada que falte', !/entregar/.test(mar.replace('No suma a lo entregado', '')), mar);
    const nRen = await ev(cli, `document.querySelectorAll('#hRetail .rt-dd .rt-dd-f').length`);
    chk('3 renglones (Ana, Final Uno, Final Dos)', nRen === 3, nRen);
    const orden = await ev(cli, `[].map.call(document.querySelectorAll('#hRetail .rt-dd .rt-dd-f'),function(f){return f.querySelector('.rt-dd-o').textContent+' '+f.querySelector('.rt-dd-i b').textContent;}).join(' | ')`);
    chk('numeradas por hora: Ana (19:00) es la 1, las sin hora después por monto', orden === '1 Ana Prueba | 2 Final Uno | 3 Final Dos', orden);
    /* Tocar el renglón abre el PEDIDO (no la ficha del cliente); cada número abre el suyo. */
    const abreRen = await ev(cli, `(function(){var o=window.openOrdDetail,got=[];window.openOrdDetail=function(h,n,r){got.push(h+'#'+n);};
      var f=document.querySelector('#hRetail .rt-dd .rt-dd-f');f.click();
      [].forEach.call(f.querySelectorAll('.rt-dd-n'),function(b){b.click();});
      window.openOrdDetail=o;return got.join(',');})()`);
    chk('tocar el renglón abre el pedido, y cada número abre el suyo (sin abrir también el renglón)', /^Home#\d+,Home#\d+,Home#\d+$/.test(abreRen || '') && abreRen.split(',')[1] !== abreRen.split(',')[2], abreRen);

    console.log('\n-- hoy miércoles 16 --');
    const mie = await abrir('2026-09-16');
    chk('Beto entregado y sin cobrar', /Entregas 1 Vendido \$17\.000/.test(mie) && /1 Beto Prueba Home · #\d+ \$17\.000 sin cobrar/.test(mie), mie);
    chk('"Falta entregar hoy" el club, sin decir cobrado', /Falta entregar hoy · 1 pedido · \$26\.000/.test(mie) && /Socio Club \(Champagnat\) Club Champagnat · #\d+ \$26\.000/.test(mie) && !/ya cobrado/.test(mie), mie);

    console.log('\n-- viernes 18: lo que viene --');
    const vie = await abrir('2026-09-18');
    chk('"Para entregar · 2 pedidos · $70.000" (el cancelado no aparece)', /Para entregar · 2 pedidos · \$70\.000/.test(vie) && !/Cancelado/.test(vie), vie);
    chk('Eli "ya cobrado"', /Eli Prueba Home · #\d+ \$20\.000 ya cobrado/.test(vie), vie);
    await ev(cli, `rtDiaVer('2026-09-18')`); await pausa(200);
    chk('tocar de nuevo el mismo día lo cierra', (await ev(cli, `document.querySelectorAll('#hRetail .rt-dd').length`)) === 0);

    console.log('\n-- cierra con Ventas retail --');
    const k0 = await ev(cli, `window.__tx(document.querySelector('#hRetail .rt-k'))`);
    chk('"Esta semana" de Ventas retail = $123.400', /Facturado \$123\.400/.test(k0 || ''), k0);
    let suma = 0;
    for (const iso of ['2026-09-14', '2026-09-15', '2026-09-16']) { const t = await abrir(iso); const m = t.match(/Vendido \$([\d.]+)/); suma += m ? Number(m[1].replace(/\./g, '')) : 0; }
    chk('la suma de los detalles de cada día da $123.400', suma === 123400, suma);

    console.log('\n-- pantalla (abierto el martes) --');
    await abrir('2026-09-15');
    const geo = await ev(cli, `(function(){
      var o={desborde:document.documentElement.scrollWidth>window.innerWidth+1,pisados:[],filas:0,chicos:[]};
      [].forEach.call(document.querySelectorAll('#hRetail .rt-dd-f'),function(f){
        o.filas++;var a=f.children[0].getBoundingClientRect(),b=f.children[1].getBoundingClientRect();
        if(a.right>b.left+1&&a.bottom>b.top&&b.bottom>a.top)o.pisados.push(f.textContent.slice(0,40));
        if(f.scrollWidth>f.clientWidth+1)o.pisados.push('se sale: '+f.textContent.slice(0,40));
      });
      [].forEach.call(document.querySelectorAll('#hRetail .rt-dia, #hRetail .rt-dd-x'),function(x){var r=x.getBoundingClientRect();if(r.height<44)o.chicos.push(x.className+' '+Math.round(r.height));});
      return o;})()`);
    chk('sin desborde a lo ancho', geo && geo.desborde === false, geo);
    chk('ningún nombre pisa su monto (' + (geo && geo.filas) + ' renglones)', !!(geo && geo.filas === 3 && geo.pisados.length === 0), geo);
    chk('los días y la ✕ miden 44px o más', !!(geo && geo.chicos.length === 0), geo && geo.chicos);
    const err = await ev(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) {
    mal++; console.log('  MAL  la prueba se corto: ' + (e && e.message || e));
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
