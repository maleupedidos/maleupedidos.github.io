/* Productos › Margen: el margen de lista por familia y por producto (9/10/2026).

     node _tools/pruebas/probar_stock_margen.js <puerto> [390|1440]

   Backend simulado y productos INVENTADOS (este repo es publico). Los esperados
   no van escritos a mano: se calculan aca con la formula del encargo —siempre
   sobre el precio de venta— y se comparan con lo que dice la pantalla.

   Sostiene:
   · los chips Stock | Margen cambian de vista sin perder la de stock;
   · las familias van de mayor a menor margen y arrancan CERRADAS;
   · el numero de la familia es un rango solo si no es pareja;
   · producto: lista, efectivo, ganancia, fecha del costo;
   · la marca «bajo el objetivo» y el precio para llegar salen del objetivo que
     MANDA EL BACKEND: con otro objetivo cambian (no hay un 25% en el codigo);
   · en la carne todo dice /kg; la pantalla dice que es margen de lista;
   · nada se sale de la pantalla (a 1440 con el cajon lateral a la vista) y no
     hay errores de JS. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const PUERTO = Number(process.argv[2] || 8080), ANCHO = parseInt(process.argv[3], 10) || 1440;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 600) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(cli, expr) === true) return true; await pausa(200); } return false; };

const PRODS = [
  { a: 'XA1', n: 'Alfa Uno', cat: 'Pizzas Individuales', u: 'u', p: 11200, co: 6200, cf: '01/10/2026', cu: 6200, cp: 'Prov Uno' },
  { a: 'XA2', n: 'Alfa Dos', cat: 'Pizzas Individuales', u: 'u', p: 12000, co: 7000, cf: '01/10/2026', cu: 7000, cp: 'Prov Uno' },
  { a: 'XB1', n: 'Beta Uno', cat: 'Pack Pizzas x2', u: 'u', p: 17000, co: 9200, cf: '28/09/2026', cu: 9200, cp: 'Prov Dos' },
  { a: 'XT1', n: 'Gama Uno', cat: 'Tortas', u: 'u', p: 26000, co: 20800, cf: '24/09/2026', cu: 20800, cp: 'Prov Tres' },
  { a: 'XT2', n: 'Gama Dos', cat: 'Tortas', u: 'u', p: 26000, co: 20800, cf: '', cu: 0, cp: '' },
  { a: 'XS1', n: 'Delta Uno', cat: 'Sorrentinos', u: 'u', p: 18300, co: 13300, cf: '20/09/2026', cu: 13300, cp: 'Prov Cuatro' },
  { a: 'XC1', n: 'Corte Uno', cat: 'Carnes', u: 'kg', p: 20750, co: 16600, cf: '08/10/2026', cu: 16600, cp: 'Prov Cinco' },
  { a: 'XC2', n: 'Corte Dos', cat: 'Carnes', u: 'kg', p: 26000, co: 22600, cf: '02/10/2026', cu: 17800, cp: 'Prov Cinco' },
  { a: 'XF1', n: 'Franja Uno', cat: 'Franuis', u: 'u', p: 9000, co: 0, cf: '', cu: 0, cp: '' }
];
const RESP = (objetivo) => ({ ok: true, ts: Date.now(), objetivo: objetivo, descEf: 0.10, productos: PRODS });
const STUB = `
  window.__err=[]; window.__posts=[]; window.__MG=${JSON.stringify(RESP(0.25))}; window.__pedidos=0;
  window.confirm=function(){return true;}; window.alert=function(m){window.__err.push('alert: '+m);};
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  try{ localStorage.removeItem('mc_margenLista'); }catch(e){}
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var R=function(c){return new Promise(function(r){setTimeout(function(){r(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}}));},60);});};
    if(x&&String(x.method||'').toUpperCase()==='POST'){ window.__posts.push(1); return R({ok:true}); }
    var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
    if(a==='margenLista'){ window.__pedidos++; return R(window.__MG); }
    return R({ok:false,error:'stub'});
  }; })();`;

/* La formula del encargo, escrita aparte de la del ERP. */
const dec = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',') + '%';
const plata = (n) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const cuentas = (p, obj) => { const ef = p.p * 0.9; return { ml: dec((p.p - p.co) / p.p * 100), me: dec((ef - p.co) / ef * 100), g: plata(p.p - p.co), nec: plata(p.co / (1 - obj)), bajo: (p.p - p.co) / p.p < obj }; };

const VIS = `function vis(e){ if(!e) return false; var r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).display!=='none'; }`;
const FAMS = `(function(){${VIS} var sel=${ANCHO <= 760 ? "'#stMargen .rsc-cat-m'" : "'#stMargen tr.rsc-cat'"};
  return [].map.call(document.querySelectorAll(sel),function(e){return {cc:e.getAttribute('data-cc'),v:vis(e),cerr:e.classList.contains('rsc-cerr'),t:e.innerText.replace(/\\s+/g,' ').trim()};});})()`;
const FILAS = `(function(){${VIS} var sel=${ANCHO <= 760 ? "'#stMargen .rsc-c.rsc-f'" : "'#stMargen tr.rsc-f'"};
  return [].map.call(document.querySelectorAll(sel),function(e){return {c:e.getAttribute('data-c'),v:vis(e),bajo:e.classList.contains('rsc-bajo'),t:e.innerText.replace(/\\s+/g,' ').trim()};});})()`;
const CLICK_FAM = (txt) => `(function(){var sel=${ANCHO <= 760 ? "'#stMargen .rsc-cat-m'" : "'#stMargen tr.rsc-cat'"};
  var e=[].filter.call(document.querySelectorAll(sel),function(x){return x.innerText.toUpperCase().indexOf(${JSON.stringify(txt.toUpperCase())})>=0;})[0]; if(e)e.click(); return !!e;})()`;
const fila = (fs, nombre) => fs.filter(f => f.t.toUpperCase().indexOf(nombre.toUpperCase()) >= 0)[0];

setTimeout(() => { console.log('TIMEOUT global'); process.exit(2); }, 150000);
(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
    await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html?prueba=1' });
    if (!await esperar(cli, `typeof stVista==='function' && typeof go==='function'`, 40000)) throw new Error('el ERP no cargó (o no tiene stVista)');
    await esperar(cli, `document.documentElement.classList.contains('listo')`, 15000);
    await pausa(900);
    await ev(cli, `window.D=window.D||{}; D.pedidos=D.pedidos||[]; D.stock=D.stock||[]; if(${ANCHO}>760)document.body.classList.add('sb-open'); go('stock'); 1`);
    await pausa(500);
    console.log('\n== Productos › Margen · ' + ANCHO + 'px ==');

    console.log('Los chips');
    const chips = await ev(cli, `[].map.call(document.querySelectorAll('#stVistaBarra .rt-chip'),function(b){var r=b.getBoundingClientRect();return {t:b.innerText.trim(),on:b.classList.contains('on'),alto:Math.round(r.height),ancho:Math.round(r.width)};})`);
    chk('hay dos chips: Stock y Margen, con Stock prendido', Array.isArray(chips) && chips.length === 2 && chips[0].t === 'Stock' && chips[0].on && chips[1].t === 'Margen' && !chips[1].on, chips);
    chk('se pueden tocar (alto ≥ ' + (ANCHO <= 760 ? 38 : 32) + 'px)', Array.isArray(chips) && chips.every(c => c.alto >= (ANCHO <= 760 ? 38 : 32) && c.ancho > 40), chips);
    chk('antes de tocar Margen no se pidió nada', await ev(cli, `window.__pedidos`) === 0);
    await ev(cli, `document.querySelectorAll('#stVistaBarra .rt-chip')[1].click(); 1`);
    chk('al tocar Margen aparece el cuadro', await esperar(cli, `document.querySelectorAll('#stMargen .rsc-f').length>0`, 15000));
    chk('se ve Margen y se esconde Stock', await ev(cli, `(function(){${VIS} return vis(document.getElementById('stMargen'))&&!vis(document.getElementById('stVistaStock'));})()`) === true);
    chk('el chip prendido es Margen', await ev(cli, `document.querySelector('#stVistaBarra .rt-chip.on').innerText.trim()`) === 'Margen');
    chk('se pidió una sola vez', await ev(cli, `window.__pedidos`) === 1, await ev(cli, `window.__pedidos`));

    console.log('Qué dice que es');
    const txt = String(await ev(cli, `document.getElementById('stMargen').innerText.replace(/\\s+/g,' ')`));
    chk('dice que es margen de LISTA y que no es el del mes', /margen de lista/i.test(txt) && /no es el margen real del mes/i.test(txt), txt.slice(0, 300));
    chk('dice que en la carne es por kilo y el costo es el promedio de las piezas', /por kilo/i.test(txt) && /promedio de las piezas/i.test(txt));
    chk('muestra el objetivo que mandó el backend (25%)', /OBJETIVO\s*25%/i.test(txt), txt.slice(0, 200));
    chk('nunca dice markup', !/markup/i.test(txt));

    console.log('Las familias');
    let fams = await ev(cli, FAMS);
    chk('examino las familias (' + (fams && fams.length) + ')', Array.isArray(fams) && fams.length === 6 && fams.every(f => f.v), fams);
    const orden = (fams || []).map(f => ((f.t.replace(/^▾\s*/, '').match(/^[^\d]+/) || [''])[0]).trim().toUpperCase());
    chk('de mayor a menor margen: Packs, Pizzas, Sorrentinos, Tortas, Carne, y al final la que no tiene costo', JSON.stringify(orden) === JSON.stringify(['PACKS', 'PIZZAS', 'SORRENTINOS', 'TORTAS', 'CARNE', 'FRANUI']), orden);
    chk('arrancan todas cerradas', fams.every(f => f.cerr), fams.map(f => f.cerr));
    let filas = await ev(cli, FILAS);
    chk('y ningún producto a la vista (' + filas.length + ' examinados)', filas.length === PRODS.length && filas.every(f => !f.v), filas.filter(f => f.v).map(f => f.t.slice(0, 30)));
    const fPizza = fams.filter(f => /PIZZAS/i.test(f.t))[0], fTorta = fams.filter(f => /TORTAS/i.test(f.t))[0], fCarne = fams.filter(f => /CARNE/i.test(f.t))[0];
    chk('Pizzas no es pareja: muestra el rango 41,7–44,6% y 35,2–38,5%', !!fPizza && fPizza.t.indexOf('41,7–44,6%') >= 0 && fPizza.t.indexOf('35,2–38,5%') >= 0, fPizza);
    chk('Tortas es pareja: un solo número, 20,0% y 11,1%, y $5.200', !!fTorta && fTorta.t.indexOf('20,0%') >= 0 && fTorta.t.indexOf('11,1%') >= 0 && fTorta.t.indexOf('–') < 0 && fTorta.t.indexOf('$5.200') >= 0, fTorta);
    chk('Tortas queda marcada: 2 (todos) bajo el objetivo', !!fTorta && /2 \(todos\) bajo el objetivo/i.test(fTorta.t), fTorta);
    chk('Carne: por kilo, rango 13,1–20,0% y ganancia $3.400–$4.150 /kg', !!fCarne && /por kilo/i.test(fCarne.t) && fCarne.t.indexOf('13,1–20,0%') >= 0 && fCarne.t.indexOf('$3.400–$4.150 /kg') >= 0, fCarne);

    console.log('El detalle de una familia');
    await ev(cli, CLICK_FAM('Carne')); await pausa(250);
    filas = await ev(cli, FILAS);
    const visibles = filas.filter(f => f.v);
    chk('al tocar Carne se abren sus 2 productos y nada más', visibles.length === 2 && visibles.every(f => /Corte/.test(f.t)), visibles.map(f => f.t.slice(0, 40)));
    for (const p of [PRODS[6], PRODS[7]]) {
      const k = cuentas(p, 0.25), f = fila(filas, p.n);
      chk(p.n + ': ' + k.ml + ' de lista, ' + k.me + ' en efectivo, ' + k.g + ' por kg', !!f && f.t.indexOf(k.ml) >= 0 && f.t.indexOf(k.me) >= 0 && f.t.indexOf(k.g) >= 0 && f.t.indexOf('/kg') >= 0, f);
      chk(p.n + ': marcado bajo el objetivo, con el precio para llegar (' + k.nec + ')', !!f && f.bajo && /bajo el objetivo/i.test(f.t) && f.t.indexOf(k.nec) >= 0, f);
    }
    const fC2 = fila(filas, 'Corte Dos');
    chk('la carne dice de cuándo es el costo y que es el promedio de las piezas', !!fC2 && /promedio de las piezas/i.test(fC2.t) && fC2.t.indexOf('02/10') >= 0, fC2);
    chk('y cuando la última compra se pagó distinto, lo dice ($17.800)', !!fC2 && fC2.t.indexOf('$17.800') >= 0, fC2);
    await ev(cli, CLICK_FAM('Pizzas')); await pausa(250);
    filas = await ev(cli, FILAS);
    const kA = cuentas(PRODS[0], 0.25), fA = fila(filas, 'Alfa Uno');
    chk('Alfa Uno: ' + kA.ml + ' de lista, ' + kA.me + ' en efectivo, ' + kA.g + ', sin marca', !!fA && fA.v && fA.t.indexOf(kA.ml) >= 0 && fA.t.indexOf(kA.me) >= 0 && fA.t.indexOf(kA.g) >= 0 && !fA.bajo && !/bajo el objetivo/i.test(fA.t) && fA.t.indexOf('/kg') < 0, fA);
    chk('y la fecha del costo al lado (compra del 01/10)', !!fA && /compra del 01\/10/i.test(fA.t), fA);
    await ev(cli, CLICK_FAM('Carne')); await pausa(250);
    filas = await ev(cli, FILAS);
    chk('tocar Carne de nuevo la cierra y Pizzas sigue abierta', filas.filter(f => f.v).length === 2 && filas.filter(f => f.v).every(f => /Alfa/.test(f.t)), filas.filter(f => f.v).map(f => f.t.slice(0, 30)));
    await ev(cli, CLICK_FAM('Sorrentinos')); await ev(cli, CLICK_FAM('Tortas')); await ev(cli, CLICK_FAM('Franui')); await pausa(250);
    filas = await ev(cli, FILAS);
    const fS = fila(filas, 'Delta Uno'), fT2 = fila(filas, 'Gama Dos'), fF = fila(filas, 'Franja Uno');
    chk('Delta Uno (27,3% de lista, 19,2% en efectivo): abajo SOLO en efectivo', !!fS && !fS.bajo && /abajo en efectivo/i.test(fS.t) && fS.t.indexOf('27,3%') >= 0 && fS.t.indexOf('19,2%') >= 0, fS);
    chk('sin compra registrada lo dice, no inventa una fecha', !!fT2 && /sin compra registrada/i.test(fT2.t), fT2);
    chk('sin costo no calcula nada y lo marca', !!fF && /sin precio o sin costo/i.test(fF.t) && !/%/.test(fF.t.replace(/sin precio o sin costo/i, '')), fF);

    console.log('El buscador');
    await ev(cli, `(function(){var q=document.getElementById('stmgQ'); q.value='corte'; q.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`); await pausa(250);
    filas = await ev(cli, FILAS);
    chk('buscar «corte» muestra los 2 cortes aunque Carne estaba cerrada', filas.filter(f => f.v).length === 2 && filas.filter(f => f.v).every(f => /Corte/.test(f.t)), filas.filter(f => f.v).map(f => f.t.slice(0, 30)));
    chk('y solo queda a la vista la familia Carne', (await ev(cli, FAMS)).filter(f => f.v).length === 1);
    await ev(cli, `(function(){var q=document.getElementById('stmgQ'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`); await pausa(250);
    filas = await ev(cli, FILAS);
    chk('al borrar vuelve a como estaba (Carne cerrada, las otras cuatro abiertas)', filas.filter(f => f.v).length === 6 && !filas.filter(f => f.v).some(f => /Corte/.test(f.t)), filas.filter(f => f.v).length);

    console.log('La forma');
    const forma = await ev(cli, `(function(){${VIS} var b=document.querySelector('#stMargen .card').getBoundingClientRect(), sn=document.querySelector('.snav'), s=sn&&vis(sn)?sn.getBoundingClientRect():null;
      var fuera=[].filter.call(document.querySelectorAll('#stMargen *'),function(e){var r=e.getBoundingClientRect();return r.width>0&&r.right>window.innerWidth+1;}).length;
      return {tabla:vis(document.querySelector('#stMargen .rsc-t')),tarjetas:vis(document.querySelector('#stMargen .rsc-cards')),izq:Math.round(b.left),der:Math.round(b.right),vw:window.innerWidth,
        cajon:s?Math.round(s.right):0,desborde:document.documentElement.scrollWidth-window.innerWidth,fuera:fuera};})()`);
    if (ANCHO <= 760) chk('en el celular van tarjetas y no la tabla', forma.tarjetas === true && forma.tabla === false, forma);
    else {
      chk('en escritorio va la tabla y no las tarjetas', forma.tabla === true && forma.tarjetas === false, forma);
      chk('el cajón lateral está ABIERTO (208px) y el cuadro arranca a su derecha', forma.cajon >= 200 && forma.izq >= forma.cajon, forma);
    }
    chk('nada se sale de la pantalla', forma.desborde <= 0 && forma.fuera === 0 && forma.der <= forma.vw, forma);

    console.log('El objetivo lo manda el backend');
    await ev(cli, `window.__MG.objetivo=0.45; stmgAbrir(true); 1`);
    await esperar(cli, `/OBJETIVO\\s*45%/i.test(document.getElementById('stMargen').innerText.replace(/\\s+/g,' '))`, 10000);
    filas = await ev(cli, FILAS);
    const fA45 = fila(filas, 'Alfa Uno'), k45 = cuentas(PRODS[0], 0.45);
    chk('con el objetivo en 45%, Alfa Uno (44,6%) pasa a estar bajo el objetivo', !!fA45 && fA45.bajo && /bajo el objetivo/i.test(fA45.t), fA45);
    chk('y su precio para llegar es ' + k45.nec, !!fA45 && fA45.t.indexOf(k45.nec) >= 0, fA45);
    const fB45 = fila(filas, 'Beta Uno');
    chk('Beta Uno (45,9%) sigue sin marca de lista', !!fB45 && !fB45.bajo, fB45);
    chk('las familias abiertas siguen abiertas después de repintar', filas.filter(f => f.v).length === 6, filas.filter(f => f.v).length);

    console.log('Volver a Stock');
    await ev(cli, `document.querySelectorAll('#stVistaBarra .rt-chip')[0].click(); 1`); await pausa(300);
    chk('se ve Stock y se esconde Margen', await ev(cli, `(function(){${VIS} return !vis(document.getElementById('stMargen'))&&vis(document.getElementById('stVistaStock'));})()`) === true);
    await ev(cli, `go('ventas'); stIrMargen(); 1`); await pausa(500);
    chk('el botón de Ventas › POR PRODUCTO lleva a Productos › Margen', await ev(cli, `(function(){${VIS} return vis(document.getElementById('stMargen'))&&document.querySelector('#p-stock .v-tab.on').getAttribute('data-stt')==='productos';})()`) === true);
    chk('la tabla vieja de rentabilidad ya no existe', await ev(cli, `!document.getElementById('prodRentBody')&&typeof stIrMargen==='function'`) === true);

    const errs = await ev(cli, `window.__err`);
    chk('sin errores de JS ni alertas', Array.isArray(errs) && errs.length === 0, errs);
    chk('ningún POST', (await ev(cli, `window.__posts.length`)) === 0);
    console.log('\n' + ok + ' ok · ' + mal + ' MAL');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('REVENTO: ' + (e && e.message || e)); console.log('\n' + ok + ' ok · ' + mal + ' MAL'); salir(1); }
})();
