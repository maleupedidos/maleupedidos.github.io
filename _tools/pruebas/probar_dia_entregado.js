/* Inicio > Resumen: la tarjeta de cada dia de la semana en curso (14/9/2026).

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
    if (!await esperar(cli, `!!document.getElementById('sem-body-actual')`, 20000)) { console.log('  no se dibujo la semana en curso'); salir(1); }
    await ev(cli, `(function(){var b=document.getElementById('sem-body-actual');if(b&&b.classList.contains('hidden'))toggleSem('actual');})()`);
    await pausa(500);
    const dias = await ev(cli, `[].map.call(document.querySelectorAll('#sem-body-actual > .card'),function(c){return window.__tx(c);})`);
    const D7 = Array.isArray(dias) ? dias : [];
    chk('se examinan las 7 tarjetas de la semana', D7.length === 7, D7.length);
    const dia = re => D7.find(x => re.test(x)) || '';
    const lun = dia(/^Lun 14\/09/), mar = dia(/^Mar 15\/09/), mie = dia(/^Mi[eé] 16\/09/), vie = dia(/^Vie 18\/09/);

    console.log('\n-- lunes 14: Carolina, reservada y pagada, sin entregar --');
    chk('no dice "1 entrega": dice "1 por entregar"', /^Lun 14\/09 1 por entregar/.test(lun), lun);
    chk('no dice "Entregado ese día"', !/Entregado ese d/.test(lun), lun);
    chk('dice "Quedó sin marcar entregado · Pilar 1 $97.600" (ya pasó)', /Quedó sin marcar entregado · Pilar 1 \$97\.600/.test(lun), lun);
    chk('dice que ya está cobrado y que no suma hasta que se marque', /No suma a lo entregado hasta que se marque · ya está cobrado/.test(lun), lun);
    chk('el Cobrado del día no se toca: $97.600', /Cobrado ese d[ií]a \$97\.600/.test(lun), lun);

    console.log('\n-- martes 15: lo que se entrego --');
    chk('2 entregas (Ana en un viaje con dos pedidos, Red una bolsa)', /^Mar 15\/09 2 entregas/.test(mar), mar);
    chk('por canal: Home 1 · Red 1', /Home 1 · Red 1/.test(mar), mar);
    chk('Entregado ese día $106.400 (incluye el pedido elegido para el lunes)', /Entregado ese d[ií]a \$106\.400/.test(mar), mar);
    chk('nada que falte el martes', !/entregar/.test(mar), mar);

    console.log('\n-- hoy miercoles 16 --');
    chk('1 entrega', /^Mi[eé] 16\/09 · HOY 1 entrega/.test(mie), mie);
    chk('Entregado $17.000 y "de esas entregas, $17.000 todavía sin cobrar"', /Entregado ese d[ií]a \$17\.000/.test(mie) && /de esas entregas, \$17\.000 todav[ií]a sin cobrar/.test(mie), mie);
    chk('"Falta entregar hoy · Clubes 1 $26.000", sin decir cobrado', /Falta entregar hoy · Clubes 1 \$26\.000/.test(mie) && /hasta que se marque$|hasta que se marque Cobrado/.test(mie) && !/ya est[aá] cobrado|ya cobrado/.test(mie), mie);

    console.log('\n-- viernes 18: lo que viene --');
    chk('"2 por entregar"', /^Vie 18\/09 2 por entregar/.test(vie), vie);
    chk('"Para entregar · Home 2 $70.000" (el cancelado no aparece)', /Para entregar · Home 2 \$70\.000/.test(vie), vie);
    chk('"$20.000 ya cobrado"', /\$20\.000 ya cobrado/.test(vie), vie);

    console.log('\n-- cierra con Ventas retail --');
    await ev(cli, `rtPer('sem')`); await pausa(300);
    const k0 = await ev(cli, `window.__tx(document.querySelector('#hRetail .rt-k'))`);
    chk('"Esta semana" de Ventas retail = la suma de lo entregado de los días ($123.400)', /Facturado \$123\.400/.test(k0 || ''), k0);
    const sumaDias = D7.reduce((s, x) => { const m = x.match(/Entregado ese d[ií]a \$([\d.]+)/); return s + (m ? Number(m[1].replace(/\./g, '')) : 0); }, 0);
    chk('la suma de las tarjetas da $123.400', sumaDias === 123400, sumaDias);

    console.log('\n-- pantalla --');
    const geo = await ev(cli, `(function(){
      var o={desborde:document.documentElement.scrollWidth>window.innerWidth+1,pisados:[],filas:0};
      [].forEach.call(document.querySelectorAll('#sem-body-actual .dia-falta'),function(f){
        o.filas++;var a=f.children[0].getBoundingClientRect(),b=f.children[1].getBoundingClientRect();
        if(a.right>b.left+1&&a.bottom>b.top&&b.bottom>a.top)o.pisados.push(f.textContent.slice(0,40));
        if(f.scrollWidth>f.clientWidth+1)o.pisados.push('se sale: '+f.textContent.slice(0,40));
      });
      return o;})()`);
    chk('sin desborde a lo ancho', geo && geo.desborde === false, geo);
    chk('el renglón de lo que falta no pisa su monto (' + (geo && geo.filas) + ' renglones)', !!(geo && geo.filas === 3 && geo.pisados.length === 0), geo);
    const err = await ev(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) {
    mal++; console.log('  MAL  la prueba se corto: ' + (e && e.message || e));
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
