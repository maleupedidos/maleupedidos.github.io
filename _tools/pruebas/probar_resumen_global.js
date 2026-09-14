/* Inicio > Resumen global: Ventas retail (14/9/2026).

   node probar_resumen_global.js [390|1440]
   APP=app_viejo_tmp.html node probar_resumen_global.js 390    ← la direccion contraria

   Tadeo y Lucas: el Resumen tiene que decir cuanto facturamos de retail, costo y
   margen, con el desglose Venta Mercado Domiciliario (Home = Estancias del Pilar y
   Estancias del Rio · Otras zonas) y Venta Mercado Institucional (Clubes, Red,
   B2B). Y "Semana 37 · Clientes Home" decia 9 en un celular y 42 en otro.

   Backend STUBBEADO con datos inventados (repo publico) y el reloj congelado en el
   lunes 14/9/2026 15:00, asi el resultado no depende del dia. No hace falta token.

   Sostiene:
   · un lunes arranca en la semana que cerro; los numeros de cada rama, contados
     por ENTREGA (dos pedidos del mismo viaje son una; Red, una bolsa por vendedor
     por dia), por el dia de la venta (el sello de entrega en Home/Pilar), sin
     pendientes ni cancelados;
   · Home y Otras zonas los decide el BARRIO (Estancias del Rio sin tilde es Home,
     Los Alcanfores de la hoja Home es Otras zonas);
   · B2B entra al total; Catering se dice aparte y no suma;
   · los cuatro periodos, cada uno contra el suyo;
   · la tarjeta de cada semana dice Entregado y Cobrado con su nombre, y los
     clientes salen de `saludSem` — si el servidor no mando esa semana, NO se
     recalculan por nombre;
   · la carga rapida guarda `saludSem` (antes pedidosLight lo traia y se perdia);
   · ya no estan "Como fue la semana", "Semana actual" ni "Por canal";
   · celular: sin desborde, chips de 38px o mas, nombre y monto sin pisarse;
     compu: el arbol en dos columnas. */
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

/* ── Pedidos inventados ── */
let n = 100;
const P = o => Object.assign({ n: String(n++), f: '10/09/2026', de: 'Viernes', o: 'Deposito', ep: 'No Cobrado', fp: 'Transferencia', co: 0, p: [{ a: 'PPM', q: 1 }], r: n }, o);
/* Como el volcado real: `fe` y `f` en "dd/MM", que es con lo que el panel viejo
   recalculaba los clientes por nombre (sin esto la direccion contraria no lo ejercita). */
const dm = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const H = o => P(Object.assign({ h: 'Home', es: 'Entregado' }, o, { dee: o.dee || o.fex, mc: String(o.fex || o.dee).slice(0, 7), fe: dm(o.fex), f: dm(o.fex || o.dee) }));
const PEDIDOS = [
  // Semana 37 (lun 7/9 a dom 13/9)
  H({ c: 'Ana Prueba', bar: 'Estancias del Pilar', fex: '2026-09-12', he: '19:00', $: 30000, co: 20000, ep: 'Cobrado', fc: '12/09', fp: 'Efectivo', ef: 30000 }),
  H({ c: 'Ana Prueba', bar: 'Estancias del Pilar', fex: '2026-09-12', he: '19:20', $: 10000, co: 7000 }),
  H({ c: 'Beto Prueba', bar: 'Estancias del Pilar', fex: '2026-09-11', he: '12:00', $: 50000, co: 35000 }),
  H({ c: 'Carla Prueba', bar: 'Estancias del Rio', fex: '2026-09-10', $: 20000, co: 14000 }),
  // pedido para el 15 y entregado el 13: cuenta en la 37 (manda el sello)
  H({ c: 'Dani Prueba', bar: 'Estancias del Pilar', fex: '2026-09-13', dee: '2026-09-15', $: 5000, co: 3000 }),
  H({ c: 'Eli Prueba', bar: 'Los Alcanfores', fex: '2026-09-09', $: 15000, co: 12000 }),
  P({ h: 'Pilar', es: 'Entregado', c: 'Fede Prueba', bar: 'Pilara', fex: '2026-09-12', dee: '2026-09-12', mc: '2026-09', $: 40000, co: 30000 }),
  P({ h: 'Pilar', es: 'Entregado', c: 'Gabi Prueba', bar: 'La Escondida', fex: '2026-09-13', dee: '2026-09-13', mc: '2026-09', $: 25000, co: 20000 }),
  // no cuentan
  H({ c: 'Pendiente Prueba', bar: 'Estancias del Pilar', es: 'Pendiente', fex: '', dee: '2026-09-12', $: 99000, co: 50000 }),
  H({ c: 'Cancelado Prueba', bar: 'Estancias del Pilar', es: 'Cancelado', fex: '2026-09-12', $: 88000, co: 40000 }),
  // Clubes: el mismo socio dos veces el mismo dia = una entrega
  P({ h: 'Clubes', es: 'Entregado', c: 'Socio Club (Champagnat)', br: 'Champagnat', dee: '2026-09-12', mc: '2026-09', $: 26000, co: 18000 }),
  P({ h: 'Clubes', es: 'Entregado', c: 'Socio Club (Champagnat)', br: 'Champagnat', dee: '2026-09-12', mc: '2026-09', $: 13000, co: 9000 }),
  // Red: dos clientes finales del mismo vendedor el mismo dia = una bolsa
  P({ h: 'Red', es: 'Entregado', c: 'Final Uno (Red: Vendedor Uno)', br: 'Vendedor Uno', dee: '2026-09-11', mc: '2026-09', $: 41500, co: 30000 }),
  P({ h: 'Red', es: 'Entregado', c: 'Final Dos (Red: Vendedor Uno)', br: 'Vendedor Uno', dee: '2026-09-11', mc: '2026-09', $: 24900, co: 18000 }),
  // Semana 36: para comparar
  H({ c: 'Ana Prueba', bar: 'Estancias del Pilar', fex: '2026-09-03', $: 100000, co: 70000, ep: 'Cobrado', fc: '03/09', fp: 'Efectivo', ef: 100000 }),
  // Esta semana (hoy lunes 14)
  H({ c: 'Hoy Prueba', bar: 'Estancias del Pilar', fex: '2026-09-14', $: 17000, co: 9000 }),
  // Agosto
  H({ c: 'Agosto Uno', bar: 'Estancias del Pilar', fex: '2026-08-10', $: 50000, co: 40000 }),
  H({ c: 'Agosto Dos', bar: 'Estancias del Pilar', fex: '2026-08-25', $: 30000, co: 20000 })
];
const EXTRA = [
  { h: 'B2B', c: 'Empresa Prueba', fx: '2026-09-10', $: 192000, co: 140800 },
  { h: 'Catering', c: 'Evento Prueba', fx: '2026-09-08', $: 300000, co: 200000 }
];
/* Solo la 37: la 36 NO viene, a proposito — no se tiene que inventar por nombre. */
const SALUD = { '2026-38': { total: 1, nuevos: 0, recompra: 1, react: 0 }, '2026-37': { total: 9, nuevos: 2, recompra: 5, react: 2 } };
/* Por mes (14/9/2026, a la tarde): septiembre viene, agosto NO — tampoco se inventa. */
const SALUD_MES = { '2026-09': { total: 12, nuevos: 3, recompra: 7, react: 2 } };
const LIGHT = { ts: 1, pedidos: PEDIDOS, canales: [{ nombre: 'Home', pedidos: 10 }], light: true, saludSem: SALUD, saludMes: SALUD_MES, ventasExtra: EXTRA };
const CAJA = { ts: 1, caja: {}, saldoBase: {}, gastos: [], ingresos: [], movimientos: [], efMano: [] };
const TEND = { ok: true, meses: [{ m: '2026-09', facturado: 1000, nuevos: 1 }], base: { total: 1 } };

const RELOJ = `(function(){var AH=new Date(2026,8,14,15,0,0).getTime();var _D=Date;
  function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();
    if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
  FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
const STUB = `
  window.__gets=[]; window.__err=[];
  /* el texto con un espacio entre nodos: textContent los pega ('Facturado$492.400') */
  window.__tx=function(e){if(!e)return null;var w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),a=[],x;while((x=w.nextNode())){var s=x.nodeValue.replace(/\\s+/g,' ').trim();if(s)a.push(s);}return a.join(' ');};
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  try{ localStorage.setItem('maleu_tab','inicio'); localStorage.removeItem('ma3'); localStorage.removeItem('maleu_seismeses'); }catch(e){}
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=window.__LIGHT;
      else if(a==='cajaLight') cuerpo=${JSON.stringify(CAJA)};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='tendencia') cuerpo=${JSON.stringify(TEND)};
      else if(a==='catalogo') cuerpo={ok:true,productos:{Prueba:[{a:'PPM',n:'Pack',dem:1,u:'u',dep:'ustariz'}]}};
      /* el volcado contesta error: todo lo nuevo tiene que llegar por la carga rapida */
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},150);});
    }
    return o.apply(this,arguments); }; })();
  window.__LIGHT=${JSON.stringify(LIGHT)};`;

const txt = (cli, sel) => ev(cli, `window.__tx(document.querySelector(${JSON.stringify(sel)}))`);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: RELOJ + prep('x') + STUB });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    console.log('\n== Resumen global · ' + ANCHO + 'px · ' + APP + ' ==');
    if (!await esperar(cli, `typeof go==='function' && window.D && D.pedidos && D.pedidos.length===${PEDIDOS.length}`, 90000)) { console.log('  el ERP no cargo los pedidos stubbeados'); salir(1); }
    await ev(cli, `go('inicio')`);
    const hay = await esperar(cli, `!!document.querySelector('#hRetail .rt-kpis')`, 20000);
    chk('el bloque Ventas retail se dibuja', hay === true);
    await pausa(800);

    console.log('\n-- un lunes: la semana que cerro --');
    const sub = await txt(cli, '#hRetail .rt-sub') || '';
    chk('arranca en "Semana pasada": Semana 37 · lun 7/9 → dom 13/9 · cerrada', /Semana 37 · lun 7\/9 → dom 13\/9 · cerrada/.test(sub) && await ev(cli, `(document.querySelector('#hRetail .rt-chip.on')||{}).textContent`) === 'Semana pasada', sub);
    const K = await ev(cli, `[].map.call(document.querySelectorAll('#hRetail .rt-k'),function(k){return window.__tx(k);})`);
    const k = Array.isArray(K) ? K : [];
    chk('Facturado $492.400 (Home + Otras zonas + Clubes + Red + B2B)', /^Facturado \$492\.400/.test(k[0] || ''), k);
    chk('Costo $356.800', /Costo \$356\.800/.test(k[1] || ''), k[1]);
    chk('Margen $135.600 · 28%', /Margen \$135\.600 28%/.test(k[2] || ''), k[2]);
    chk('Entregas 10 (Ana 1 viaje, Clubes 1, Red 1 bolsa, B2B 1)', /Entregas 10/.test(k[3] || ''), k[3]);
    chk('contra la semana 36: ▲ +392% facturado y ▲ +9 entregas', /▲ \+392%/.test(k[0] || '') && /▲ \+9/.test(k[3] || ''), [k[0], k[3]]);

    const filas = await ev(cli, `[].map.call(document.querySelectorAll('#hRetail .rt-fila'),function(f){return window.__tx(f);})`);
    const F = Array.isArray(filas) ? filas : [];
    const fila = re => F.find(x => re.test(x)) || '';
    chk('Domiciliario $195.000 · 7 entregas', /Domiciliario \$195\.000/.test(fila(/Domiciliario/)) && /7 entregas/.test(fila(/Domiciliario/)), fila(/Domiciliario/));
    chk('Home $115.000 · 4 entregas (Estancias del Rio sin tilde es Home; manda el sello de entrega)', /^Home \$115\.000/.test(fila(/^Home/)) && /4 entregas/.test(fila(/^Home/)), fila(/^Home/));
    chk('Otras zonas $80.000 · 3 entregas, y dice que zonas (Los Alcanfores incluido)', /Otras zonas \$80\.000/.test(fila(/Otras zonas/)) && /3 entregas/.test(fila(/Otras zonas/)) && /Los Alcanfores 1/.test(fila(/Otras zonas/)) && /Pilara 1/.test(fila(/Otras zonas/)), fila(/Otras zonas/));
    chk('Institucional $297.400', /Institucional \$297\.400/.test(fila(/Institucional/)), fila(/Institucional/));
    chk('Clubes $39.000 · 1 entrega (el mismo socio el mismo dia)', /Clubes \$39\.000/.test(fila(/^Clubes/)) && /1 entrega\b/.test(fila(/^Clubes/)) && /Champagnat 1/.test(fila(/^Clubes/)), fila(/^Clubes/));
    chk('Red $66.400 · 1 entrega, neto de la comision', /Red \$66\.400/.test(fila(/^Red/)) && /neto de la comisión/.test(fila(/^Red/)) && /1 entrega\b/.test(fila(/^Red/)), fila(/^Red/));
    chk('B2B $192.000', /B2B \$192\.000/.test(fila(/^B2B/)), fila(/^B2B/));
    const cat = await txt(cli, '#hRetail .rt-cat') || '';
    chk('Catering se dice aparte y no suma', /Catering \$300\.000/.test(cat) && /no es retail/.test(cat), cat);
    const copia = await ev(cli, `decodeURIComponent((document.querySelector('#hRetail .rt-copy')||{getAttribute:function(){return ''}}).getAttribute('data-copy')||'')`);
    chk('"Copiar" arma el resumen con los mismos numeros', /Facturado \$492\.400/.test(copia || '') && /Home \$115\.000 · Otras zonas \$80\.000/.test(copia || ''), copia);
    /* 14/9/2026, a la tarde: Lucas abrio el Resumen el lunes y el cuadro de clientes no
       estaba — vivia en la semana EN CURSO, que recien arrancaba. Ahora va adentro del
       bloque y sigue al periodo elegido. */
    const cl37 = await txt(cli, '#hRetail .rt-cl') || '';
    chk('los clientes de la semana que cerro, adentro de Domiciliario: 9 · 2 nuevos · 5 recompra · 2 reactivados', /9 clientes domiciliarios 2 🆕 Nuevos 5 🔁 Recompra 2 ⏰ Reactivados/.test(cl37), cl37);
    chk('y "Copiar" los dice', /👥 9 clientes: 2 nuevos · 5 recompra · 2 reactivados/.test(copia || ''), copia);

    console.log('\n-- los otros periodos --');
    await ev(cli, `rtPer('mes')`); await pausa(300);
    let k2 = await ev(cli, `window.__tx(document.querySelector('#hRetail .rt-k'))`);
    chk('Este mes: Septiembre 2026 · del 1 al 14 · $609.400, contra agosto hasta el 14 ($50.000)', /Septiembre 2026 · del 1 al 14/.test(await txt(cli, '#hRetail .rt-sub') || '') && /\$609\.400/.test(k2 || '') && /▲ \+1119%/.test(k2 || ''), k2);
    const clMes = await txt(cli, '#hRetail .rt-cl') || '';
    chk('Este mes: los clientes del MES (12 · 3 · 7 · 2), no la suma de semanas', /12 clientes domiciliarios 3 🆕 Nuevos 7 🔁 Recompra 2 ⏰ Reactivados/.test(clMes), clMes);
    await ev(cli, `rtPer('mesAnt')`); await pausa(300);
    k2 = await ev(cli, `window.__tx(document.querySelector('#hRetail .rt-k'))`);
    chk('Mes pasado: Agosto 2026 · cerrado · $80.000', /Agosto 2026 · cerrado/.test(await txt(cli, '#hRetail .rt-sub') || '') && /\$80\.000/.test(k2 || ''), k2);
    chk('agosto no vino del servidor: el cuadro de clientes no se dibuja (no se inventa)', await ev(cli, `!document.querySelector('#hRetail .rt-cl')`) === true);
    await ev(cli, `rtPer('sem')`); await pausa(300);
    k2 = await ev(cli, `window.__tx(document.querySelector('#hRetail .rt-k'))`);
    chk('Esta semana: $17.000, y sin nada que comparar el lunes pasado lo dice', /\$17\.000/.test(k2 || '') && /sin datos para comparar/.test(k2 || ''), k2);
    chk('Esta semana: los clientes de la 38 (1 · recompra)', /1 cliente domiciliario 0 🆕 Nuevos 1 🔁 Recompra 0 ⏰ Reactivados/.test(await txt(cli, '#hRetail .rt-cl') || ''), await txt(cli, '#hRetail .rt-cl'));
    await ev(cli, `rtPer('semAnt')`); await pausa(300);
    chk('volviendo a la semana pasada, el cuadro vuelve', await ev(cli, `!!document.querySelector('#hRetail .rt-cl')`) === true);
    chk('y ya no hay un cuadro de clientes suelto en la semana en curso (el lunes se iba solo)', await ev(cli, `[].filter.call(document.querySelectorAll('#p-inicio-resumen .rt-cli'),function(e){return !e.closest('#sem-body-prev');}).length`) === 0);

    console.log('\n-- las tarjetas de cada semana --');
    const s37 = await ev(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#sem-body-prev .card')).filter(function(x){return /Semana 37/.test(x.textContent);})[0];return c?window.__tx(c):null;})()`);
    chk('la semana 37 dice lo ENTREGADO: $492.400 · 10 entregas', /Entregado en la semana \$492\.400 10 entregas/.test(s37 || ''), s37);
    chk('y lo COBRADO, con su nombre (ya no "Facturación total")', /Cobrado en la semana \$30\.000/.test(s37 || '') && !/Facturaci/.test(s37 || ''), s37);
    chk('los clientes salen del servidor: domiciliarios 9 · 2 · 5 · 2', /Clientes domiciliarios · 9 2 🆕 Nuevos 5 🔁 Recompra 2 ⏰ Reactivados/.test(s37 || ''), s37);
    chk('sin la línea de Estancias del Pilar', !/Estancias del Pilar/.test(s37 || ''), s37);
    const s36 = await ev(cli, `(function(){var c=[].slice.call(document.querySelectorAll('#sem-body-prev .card')).filter(function(x){return /Semana 36/.test(x.textContent);})[0];return c?window.__tx(c):null;})()`);
    chk('la semana 36 existe (tiene un cobro)', !!s36, s36);
    chk('pero el servidor no mando sus clientes: NO se recalculan por nombre', !!s36 && !/Clientes/.test(s36), s36);
    chk('la carga rapida guardo saludSem, saludMes y ventasExtra (el volcado contesto error)', await ev(cli, `!!(D.saludSem&&D.saludSem['2026-37']&&D.saludMes&&D.saludMes['2026-09']&&Array.isArray(D.ventasExtra))`) === true);

    console.log('\n-- lo que salio --');
    const fuera = await ev(cli, `({kpi:!!document.getElementById('hKpi'),can:!!document.getElementById('hCanales'),como:/C[oó]mo (fue|va) la semana/.test(document.getElementById('p-inicio-resumen').textContent),porCanal:/Por canal/.test(document.getElementById('p-inicio-resumen').textContent)})`);
    chk('ya no estan "Como fue la semana", "Semana actual" ni "Por canal"', fuera && !fuera.kpi && !fuera.can && !fuera.como && !fuera.porCanal, fuera);

    console.log('\n-- pantalla --');
    const geo = await ev(cli, `(function(){
      var box=document.getElementById('hRetail'), o={desborde:document.documentElement.scrollWidth>window.innerWidth+1, chips:[], pisados:[], cols:0};
      [].forEach.call(box.querySelectorAll('.rt-chip'),function(b){o.chips.push(Math.round(b.getBoundingClientRect().height));});
      [].forEach.call(box.querySelectorAll('.rt-fila-a'),function(f){
        var a=f.querySelector('.rt-fila-n').getBoundingClientRect(), b=f.querySelector('.rt-fila-f').getBoundingClientRect();
        if(a.right>b.left+1&&a.bottom>b.top&&b.bottom>a.top)o.pisados.push(f.textContent.slice(0,40));
      });
      var ar=box.querySelector('.rt-arbol'); if(ar)o.cols=getComputedStyle(ar).gridTemplateColumns.split(' ').length;
      o.filas=box.querySelectorAll('.rt-fila-a').length;
      return o;})()`);
    chk('sin desborde a lo ancho', geo && geo.desborde === false, geo);
    chk('los chips se tocan bien (38px en el celular; en la compu, el piso del ERP)', !!(geo && geo.chips && geo.chips.length === 4 && geo.chips.every(h => h >= (ANCHO <= 560 ? 38 : 30))), geo && geo.chips);
    chk('el nombre y el monto no se pisan (' + (geo && geo.filas) + ' filas)', !!(geo && geo.filas === 7 && geo.pisados && geo.pisados.length === 0), geo);
    if (ANCHO >= 1000) chk('en la compu el arbol va en dos columnas', geo && geo.cols === 2, geo && geo.cols);
    else chk('en el celular el arbol va en una columna', geo && geo.cols === 1, geo && geo.cols);
    const err = await ev(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) {
    mal++; console.log('  MAL  la prueba se corto: ' + (e && e.message || e));
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
