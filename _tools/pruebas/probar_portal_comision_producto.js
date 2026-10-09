/* MI PORTAL: CUÁNTO GANÁS POR PRODUCTO. (9/10/2026)

     node _tools/pruebas/probar_portal_comision_producto.js [390|1440]
     APP=app_viejo_tmp.html node ...   ← la contraria

   Lo pidió Fede D'Andrea. El portal decía «tu comisión es un monto fijo por
   producto y sube con el nivel» y no mostraba la tabla.

   Sin token: se llaman las funciones de render con datos inventados, igual que
   probar_portal_escalon.js.

   Sostiene:
   · la sección vive en Plata › «Tus números», cerrada por defecto;
   · abierta, lista cada producto por categoría con su precio y los tres montos;
   · la columna resaltada es la del nivel del vendedor logueado (y cambia con él);
   · la carne va por kilo, y dicho;
   · un producto de $0 dice «$0» y «no paga comisión»;
   · no aparece la palabra costo ni margen, ni se dibuja un campo que no viajó;
   · el buscador filtra sin perder el foco;
   · el link de la tarjeta de nivel lleva a Plata y la abre;
   · no se sale de la pantalla.

   Contra el red.html anterior tiene que dar ROJOS, no reventar. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };

const BANDAS = [{ nivel: 'inicial', desde: 0 }, { nivel: 'intermedio', desde: 1000000 }, { nivel: 'top', desde: 2500000 }];
/* El campo `costo` va A PROPÓSITO en el fixture: el backend no lo manda, pero
   si algún día viajara, la pantalla tampoco lo puede dibujar. */
const PRODUCTOS = [
  { a: 'PPM', n: 'Pack Prueba x2', cat: 'Pizzas', u: 'u', p: 17000, ini: 3450, int: 3750, top: 4300, costo: 9213 },
  { a: 'ECaC', n: 'Empanadas Prueba x8', cat: 'Empanadas', u: 'u', p: 20000, ini: 2350, int: 2550, top: 2900, costo: 14717 },
  { a: 'CLo', n: 'Carne Lomo', cat: 'Carnes', u: 'kg', p: 33000, ini: 3100, int: 3400, top: 3900, costo: 25923 },
  { a: 'CEn', n: 'Carne Entraña', cat: 'Carnes', u: 'kg', p: 34000, ini: 0, int: 0, top: 0, costo: 27219 }
];
const esc = (nivel) => ({ nivel, facturado: 689400, bandas: BANDAS, siguiente: nivel === 'top' ? null : { nivel: 'intermedio', desde: 1000000, falta: 310600 }, productos: PRODUCTOS });

const LEER = `(function(){
  var c=document.getElementById('redCgCard');
  if(!c) return {existe:false};
  var vw=document.documentElement.clientWidth, r=c.getBoundingClientRect();
  var filas=[].slice.call(c.querySelectorAll('.cg-row')).map(function(f){
    var mio=f.querySelectorAll('.cg-m.mio');
    return {sku:f.getAttribute('data-sku'), txt:f.textContent.replace(/\\s+/g,' ').trim(),
      mio:mio.length===1?mio[0].getAttribute('data-nivel'):('n='+mio.length), mioTxt:mio.length?mio[0].textContent:'',
      montos:[].map.call(f.querySelectorAll('.cg-m'),function(x){return x.textContent;}),
      der:Math.round(f.getBoundingClientRect().right)};
  });
  var mv=document.getElementById('plata-numeros');
  return {existe:true, oculta:c.classList.contains('hidden'), abierta:!!c.querySelector('.cg-body'),
    visible:r.width>0&&r.height>0, enPlata:!!(mv&&mv.contains(c)),
    txt:(c.textContent||'').replace(/\\s+/g,' ').trim(), filas:filas,
    cats:[].map.call(c.querySelectorAll('.cg-cat'),function(x){return x.textContent.trim();}),
    colMia:[].map.call(c.querySelectorAll('.cg-cols .mio'),function(x){return x.textContent.trim();}),
    vw:vw, izq:Math.round(r.left), der:Math.round(r.right),
    foco:document.activeElement&&document.activeElement.id};
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    console.log('\n== Mi Portal: cuánto ganás por producto · ' + APP + ' · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    for (let i = 0; i < 90; i++) { try { if (await evaluar(cli, `typeof go==='function'`)) break; } catch (e) {} await pausa(250); }
    await evaluar(cli, `go('miportal'); 1`);
    for (let i = 0; i < 60; i++) { try { if (await evaluar(cli, `typeof renderEscala==='function'`)) break; } catch (e) {} await pausa(250); }
    await pausa(400);
    const hay = await evaluar(cli, `typeof renderComisionProd==='function' && typeof redCgAbrir==='function'`);
    chk('la sección existe en el portal', hay === true, { hay });
    if (hay !== true) { console.log('\n  (red.html anterior al 9/10/2026)\n' + ok + ' ok, ' + mal + ' mal'); salir(1); }

    /* Sin login el portal entero queda oculto detrás de la tarjeta de ingreso:
       se destapan los contenedores de ARRIBA de la vista. La vista de Plata no
       se toca — que se vea o no lo decide setMainTab, que es lo que se prueba. */
    await evaluar(cli, `(function(){var e=document.getElementById('mview-plata').parentElement;while(e&&e!==document.body){e.classList.remove('hidden');if(getComputedStyle(e).display==='none')e.style.display='block';e=e.parentElement;}})(); 1`);
    await evaluar(cli, `setMainTab('plata'); renderEscala(${JSON.stringify(esc('inicial'))}, 'Octubre'); renderComisionProd(${JSON.stringify(esc('inicial'))}); 1`);
    await pausa(300);
    let v = await evaluar(cli, LEER);
    chk('está en Plata › Tus números y se ve', v.existe && v.enPlata && v.visible && !v.oculta, { enPlata: v.enPlata, visible: v.visible, oculta: v.oculta });
    chk('arranca CERRADA: sin filas', v.abierta === false && v.filas.length === 0, { abierta: v.abierta, n: v.filas.length });
    chk('el título dice de qué es', /Cuánto ganás por producto/.test(v.txt), v.txt.slice(0, 80));

    await evaluar(cli, `redCgToggle(); 1`); await pausa(200);
    v = await evaluar(cli, LEER);
    console.log('  (filas examinadas: ' + v.filas.length + ')');
    chk('abierta, lista los 4 productos', v.abierta === true && v.filas.length === 4, v.filas.length);
    chk('agrupados por categoría', v.cats.length === 3 && /Pizzas/.test(v.cats.join('|')) && /Carnes/.test(v.cats.join('|')), v.cats);
    chk('la carne va por kilo, y dicho', v.cats.some(x => /Carnes/.test(x) && /por kilo/.test(x)) && /el kilo/.test((v.filas.filter(f => f.sku === 'CLo')[0] || {}).txt || ''), v.cats);
    const pack = v.filas.filter(f => f.sku === 'PPM')[0] || {};
    chk('cada producto con su precio de venta', /17\.000/.test(pack.txt || ''), pack.txt);
    chk('   y los tres montos', (pack.montos || []).join('|') === '$3.450|$3.750|$4.300', pack.montos);
    chk('la columna resaltada es la de SU nivel (inicial) en todas las filas', v.filas.every(f => f.mio === 'inicial') && v.colMia.join() === 'Inicial', { filas: v.filas.map(f => f.mio), col: v.colMia });
    chk('   y el resaltado es el monto de ese nivel', pack.mioTxt === '$3.450', pack.mioTxt);
    const ent = v.filas.filter(f => f.sku === 'CEn')[0] || {};
    chk('el corte de $0 dice $0', (ent.montos || []).join('|') === '$0|$0|$0', ent.montos);
    chk('   y «no paga comisión»', /no paga comisión/.test(ent.txt || ''), ent.txt);
    chk('no aparece costo ni margen', !/costo|margen/i.test(v.txt), v.txt.slice(0, 200));
    chk('ni ningún número de costo, aunque viajara', ![9213, 14717, 25923, 27219].some(c => v.txt.replace(/\./g, '').indexOf(String(c)) >= 0));
    chk('no se sale de la pantalla', v.izq >= -1 && v.der <= v.vw + 1 && v.filas.every(f => f.der <= v.vw + 1), { vw: v.vw, der: v.der });

    /* El nivel resaltado sigue al vendedor logueado. */
    await evaluar(cli, `renderComisionProd(${JSON.stringify(esc('top'))}); 1`); await pausa(200);
    v = await evaluar(cli, LEER);
    const pack2 = v.filas.filter(f => f.sku === 'PPM')[0] || {};
    chk('con otro vendedor (top) el resaltado cambia a su nivel', v.filas.every(f => f.mio === 'top') && pack2.mioTxt === '$4.300', { mio: pack2.mio, t: pack2.mioTxt });

    /* El buscador. */
    await evaluar(cli, `(function(){var i=document.getElementById('redCgBusca'); i.focus(); i.value='empa'; i.dispatchEvent(new Event('input',{bubbles:true}));})(); 1`);
    await pausa(200);
    v = await evaluar(cli, LEER);
    chk('el buscador filtra', v.filas.length === 1 && v.filas[0].sku === 'ECaC', v.filas.map(f => f.sku));
    chk('   sin perder el foco', v.foco === 'redCgBusca', v.foco);
    await evaluar(cli, `renderComisionProd(${JSON.stringify(esc('top'))}); 1`); await pausa(150);
    v = await evaluar(cli, LEER);
    chk('   ni cuando llega el refresco de fondo', v.foco === 'redCgBusca' && v.filas.length === 1, { foco: v.foco, n: v.filas.length });
    await evaluar(cli, `(function(){var i=document.getElementById('redCgBusca'); i.value='zzz'; i.dispatchEvent(new Event('input',{bubbles:true}));})(); 1`);
    await pausa(150);
    v = await evaluar(cli, LEER);
    chk('sin resultados lo dice', v.filas.length === 0 && /Ningún producto/.test(v.txt), v.txt.slice(0, 120));

    /* El link de la tarjeta de nivel. */
    await evaluar(cli, `(function(){var i=document.getElementById('redCgBusca'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); i.blur(); redCgToggle(); setMainTab('hoy');})(); 1`);
    await pausa(250);
    const antes = await evaluar(cli, LEER);
    const link = await evaluar(cli, `(function(){var a=document.querySelector('#escala-card .ec-pie a'); if(!a) return false; a.click(); return true;})()`);
    await pausa(400);
    v = await evaluar(cli, LEER);
    chk('la frase de la tarjeta de nivel trae el link', link === true);
    chk('   que lleva a Plata y abre la sección', antes.abierta === false && v.abierta === true && v.visible === true && v.filas.length === 4, { antes: antes.abierta, ahora: v.abierta, visible: v.visible });

    /* Sin tabla no se dibuja nada. */
    await evaluar(cli, `renderComisionProd({nivel:'inicial',productos:[]}); 1`); await pausa(150);
    v = await evaluar(cli, LEER);
    chk('sin productos la sección no aparece', v.oculta === true, v.oculta);

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });
    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
