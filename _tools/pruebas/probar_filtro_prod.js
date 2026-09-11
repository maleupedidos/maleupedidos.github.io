/* El filtro por categoria y producto de la sub-tab Ventas > PRODUCTOS, en un
   Chrome de verdad, con la sesion real y el backend PUBLICADO (@570).

   node probar_filtro_prod.js <token> [390|1440]
   BASE=https://app.maleu.com.ar node probar_filtro_prod.js <token>   (produccion)

   Todo se mide POR EL DOM: `prodState` y `prodVista` viven en el IIFE del bloque
   de PRODUCTOS y desde Runtime.evaluate no existen -la trampa ya anotada, "el
   estado de una tab no se puede tocar desde afuera"-. Y es mas fuerte asi:
   verifica lo que la persona ve.

   Y los numeros NO van hardcodeados: el test le pide al backend el mismo
   periodo que muestra la pantalla y compara. La primera corrida fallo justo por
   eso -puse los montos de dias=90 y la pantalla abre en dias=30-, y ademas un
   monto escrito a mano rompe el test solo al dia siguiente. */
'use strict';
const PRU = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(PRU + 'cdp.js');
const prep = require(PRU + 'sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det ? '\n         ' + det : '')); }
}
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evaluar(cli, expr)) return true; } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
};
const pausa = ms => new Promise(r => setTimeout(r, ms));

/* El ancla externa del test: se le pide al backend el MISMO periodo que muestra
   la pantalla y se compara. Hardcodear los montos hacia que el test se rompiera
   solo al dia siguiente -y la primera corrida fallo justo por eso: los numeros
   que puse eran de dias=90 y la pantalla abre en dias=30-. */
const API = 'https://script.google.com/macros/s/AKfycbxmrG5YVSshcYezk8lXFx_uxb7'
          + 'NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec';
async function backend(dias) {
  const r = await fetch(API + '?action=productosAnalytics&canal=all&dias=' + dias
                        + '&token=' + TOKEN + '&t=' + Date.now());
  const d = await r.json();
  if (!d.ok) throw new Error('el backend contesto ok=false');
  const cortes = d.productos.filter(p => p.uni === 'kg');
  return {
    kilos: cortes.reduce((s, p) => s + p.unidades, 0),
    fact: cortes.reduce((s, p) => s + p.facturado, 0),
    nCortes: cortes.length,
    lomo: d.productos.filter(p => p.abrev === 'CLo')[0],
    totalFact: d.totales.facturado,
    totalKilos: d.totales.kilos,
    nProd: d.productos.length
  };
}
/* Formatea como la pantalla, para poder buscar el texto exacto. */
const fmtPeso = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 3 });
const fmtPlata = n => Math.round(n).toLocaleString('es-AR');

/* Lee el ranking y los KPIs del DOM.

   DOS parsers, porque la pantalla usa dos formatos:
     · los montos van en formato argentino ($3.126.581 - el punto son miles);
     · los porcentajes salen de fmtPct, que usa toFixed y escribe el decimal con
       PUNTO ingles ("100.0%"). Con un solo parser, 100.0% se lee 1000.

   Y el comentario va ACA AFUERA: un backtick adentro de un template literal lo
   cierra, y eso rompio este mismo archivo hace cinco minutos. */
const LEER = `(function(){
  function num(t){ return Number(String(t||'').replace(/[^0-9,.\\-]/g,'').replace(/\\./g,'').replace(',','.'))||0; }
  function pct(t){ return Number(String(t||'').replace(/[^0-9.\\-]/g,''))||0; }
  var filas=[];
  [].forEach.call(document.querySelectorAll('#prodTablaBody tr'),function(tr){
    var c=tr.cells; if(!c||c.length<7) return;
    var cant=c[2].textContent.trim();
    filas.push({ nombre:c[0].textContent.trim(), cat:c[1].textContent.trim(),
      cant:num(cant), uni:/kg$/.test(cant)?'kg':'u', fact:num(c[3].textContent),
      mix:pct(c[4].textContent), margen:num(c[6].textContent) });
  });
  var k=document.getElementById('prodKpis');
  var vals=k.querySelectorAll('.prod-kpi-val');
  return { filas:filas, kpi:k.textContent.replace(/\\s+/g,' ').trim(),
    kpiFact:num((vals[1]||{}).textContent), kpiMargen:num((vals[2]||{}).textContent) };
})()`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable');
  await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride',
    { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });

  console.log('\n=== ' + BASE + '  ·  ' + ANCHO + 'px ===');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arranco'); process.exit(1); }

  /* La pantalla de login encima invalida todo lo que siga: .click() es
     programatico e ignora el hit-testing, asi que el test "pasaria" igual. */
  const login = await evaluar(cli, `(function(){var l=document.getElementById('loginScreen');
    return !!(l && getComputedStyle(l).display!=='none' && getComputedStyle(l).visibility!=='hidden');})()`);
  chk('el login NO quedo encima', !login);

  // Lo que el backend dice del mismo periodo que abre la pantalla (30 dias)
  const B = await backend(30);
  console.log('  el backend, dias=30: ' + fmtPeso(B.kilos) + ' kg de carne · $'
              + fmtPlata(B.fact) + ' · ' + B.nProd + ' productos');
  chk('el backend manda los 5 cortes en kg', B.nCortes === 5, String(B.nCortes));
  chk('y totales.kilos coincide con la suma de los cortes',
      Math.abs(B.totalKilos - B.kilos) < 0.001, B.totalKilos + ' vs ' + B.kilos);

  await evaluar(cli, 'go("ventas")');
  await pausa(600);
  await evaluar(cli, 'vSwitchTab("productos")');

  const pinto = await esperar(cli, `(function(){var t=document.getElementById('prodTablaBody');
    return !!(t && t.querySelectorAll('tr').length>3);})()`);
  chk('PRODUCTOS pinta el ranking', pinto);
  if (!pinto) { console.log('  sin datos no se puede medir nada mas'); cli.matar(); process.exit(1); }
  chk('la sub-tab esta visible',
      await evaluar(cli, `getComputedStyle(document.getElementById('vProductos')).display!=='none'`));

  // ══ 1. Los chips de categoria ══
  console.log('\n--- 1. los chips de categoria ---');
  const chips = await evaluar(cli, `[].map.call(document.querySelectorAll('#prodCatChips .prod-cat-chip'),
    function(b){return b.textContent.trim();})`);
  chk('hay chips de categoria', chips.length >= 8, JSON.stringify(chips));
  chk('el primero es "Todo"', chips[0] === 'Todo', chips[0]);
  chk('hay un chip de Carnes', chips.some(c => /Carnes/.test(c)), JSON.stringify(chips));
  chk('el de Carnes lleva el emoji', chips.some(c => /\u{1F969}/u.test(c)), JSON.stringify(chips));
  chk('hay un chip de Wraps', chips.some(c => /Wraps/.test(c)), JSON.stringify(chips));
  chk('NO hay un chip "Otro"', !chips.some(c => c.trim() === 'Otro'), JSON.stringify(chips));

  /* El Mix por categoria ya esta ordenado por facturacion: si los chips siguen
     el mismo orden, los dos salen del mismo criterio. */
  const ordenado = await evaluar(cli, `(function(){
    var mix=[].map.call(document.querySelectorAll('#prodMix .mix-row .mix-row-lbl'),
      function(e){ return (e.childNodes[0]&&e.childNodes[0].textContent||'').trim(); });
    var chips=[].map.call(document.querySelectorAll('#prodCatChips .prod-cat-chip'),
      function(b){ return b.textContent.trim().replace(/^[^A-Za-z]+/,''); }).slice(1);
    var k=Math.min(mix.length, chips.length);
    if(k < 5) return 'medi solo ' + k + ' categorias';
    return JSON.stringify(mix.slice(0,k))===JSON.stringify(chips.slice(0,k))
      ? '' : (JSON.stringify(mix)+' vs '+JSON.stringify(chips));
  })()`);
  chk('los chips siguen el mismo orden que el Mix (por facturacion)', ordenado === '', ordenado);

  // ══ 2. Sin filtro: los kilos no se suman con las unidades ══
  console.log('\n--- 2. sin filtro, los kilos van aparte ---');
  const L0 = await evaluar(cli, LEER);
  chk('el KPI dice unidades Y kilos', /u\b/.test(L0.kpi) && /kg/.test(L0.kpi), L0.kpi.slice(0, 160));
  chk('no muestra el numero mezclado (2.593)', !/2\.?593/.test(L0.kpi), L0.kpi.slice(0, 160));
  chk('los kilos del KPI son los que dice el backend',
      L0.kpi.indexOf(fmtPeso(B.kilos) + ' kg') >= 0,
      'esperaba "' + fmtPeso(B.kilos) + ' kg" en: ' + L0.kpi.slice(0, 160));
  chk('las unidades van sin decimales de kilo', /\d{1,3}(\.\d{3})* u\b/.test(L0.kpi), L0.kpi.slice(0, 160));
  chk('el margen dice que es DE LISTA', /de lista/i.test(L0.kpi), L0.kpi.slice(0, 320));
  chk('no promedia unidades con kilos', /no se promedian juntos/i.test(L0.kpi), L0.kpi.slice(0, 320));
  chk('sin filtro NO sale el aviso',
      await evaluar(cli, `getComputedStyle(document.getElementById('prodFiltroAviso')).display`) === 'none');
  chk('el ranking trae los 34', L0.filas.length === 34, String(L0.filas.length));

  const kgFilas = L0.filas.filter(f => f.uni === 'kg');
  chk('los 5 cortes muestran kg en el ranking', kgFilas.length === 5,
      JSON.stringify(kgFilas.map(f => f.nombre)));
  chk('los otros 29 muestran u', L0.filas.filter(f => f.uni === 'u').length === 29);
  chk('los cortes salen en la categoria Carnes', kgFilas.every(f => f.cat === 'Carnes'),
      JSON.stringify(kgFilas.map(f => f.cat)));
  chk('ninguna fila dice "Otro"', !L0.filas.some(f => f.cat === 'Otro'),
      JSON.stringify(L0.filas.filter(f => f.cat === 'Otro').map(f => f.nombre)));

  // ══ 3. El chip Carnes ══
  console.log('\n--- 3. el chip Carnes: lo que Lucas viene a ver ---');
  await evaluar(cli, 'prodSetCat("Carnes")');
  await pausa(400);

  const c1 = await evaluar(cli, `(function(){
    var av=document.getElementById('prodFiltroAviso');
    return {
      aviso: getComputedStyle(av).display!=='none' ? av.textContent.replace(/\\s+/g,' ').trim() : '',
      mixH: (document.getElementById('prodMixH')||{}).textContent||'',
      mix: document.getElementById('prodMix').textContent.replace(/\\s+/g,' ').trim(),
      top: document.querySelectorAll('#prodTop10 .top10-row').length,
      topTxt: document.getElementById('prodTop10').textContent.replace(/\\s+/g,' ').trim(),
      chipOn: [].filter.call(document.querySelectorAll('#prodCatChips .prod-cat-chip'),
                function(b){return b.classList.contains('on');}).map(function(b){return b.textContent.trim();})
    };})()`);
  const L1 = await evaluar(cli, LEER);

  chk('el chip de Carnes queda marcado', c1.chipOn.length === 1 && /Carnes/.test(c1.chipOn[0]),
      JSON.stringify(c1.chipOn));
  chk('el ranking queda en 5 filas', L1.filas.length === 5, String(L1.filas.length));
  chk('las 5 son de carne y en kg', L1.filas.every(f => f.cat === 'Carnes' && f.uni === 'kg'),
      JSON.stringify(L1.filas.map(f => f.cat + '/' + f.uni)));
  chk('el KPI muestra los kilos de carne del backend',
      L1.kpi.indexOf(fmtPeso(B.kilos) + ' kg') >= 0,
      'esperaba "' + fmtPeso(B.kilos) + ' kg": ' + L1.kpi.slice(0, 140));
  chk('el KPI NO dice unidades', !/\d+ u\b/.test(L1.kpi), L1.kpi.slice(0, 140));
  chk('el facturado de carne es el del backend',
      L1.kpi.indexOf('$' + fmtPlata(B.fact)) >= 0,
      'esperaba "$' + fmtPlata(B.fact) + '": ' + L1.kpi.slice(0, 220));
  chk('el ticket sale por kilo', /\/ kg/.test(L1.kpi), L1.kpi.slice(0, 320));
  chk('el aviso aparece y nombra Carnes', /Carnes/.test(c1.aviso), c1.aviso);
  chk('el aviso dice cuantos de cuantos', /5 de 34 productos/.test(c1.aviso), c1.aviso);
  chk('el aviso ofrece volver', /Ver todo/.test(c1.aviso), c1.aviso);
  chk('el Mix pasa a ser por PRODUCTO', /por producto/i.test(c1.mixH), c1.mixH);
  chk('el Mix nombra los cortes', /Lomo/.test(c1.mix) && /Vac/.test(c1.mix), c1.mix.slice(0, 220));
  chk('el Mix muestra kg', /kg/.test(c1.mix), c1.mix.slice(0, 220));
  chk('el Top queda en 5', c1.top === 5, String(c1.top));
  chk('el Top dice que ordena por facturacion', /facturaci/i.test(c1.topTxt), c1.topTxt.slice(-140));

  /* EL CONTROL QUE DECIDE que filtrar en el panel es seguro: el KPI tiene que
     ser EXACTAMENTE la suma de las filas que quedaron en el ranking. Todo leido
     del DOM, o sea de lo que la persona ve. */
  const sumF = L1.filas.reduce((s, f) => s + f.fact, 0);
  const sumK = L1.filas.reduce((s, f) => s + f.cant, 0);
  const sumM = L1.filas.reduce((s, f) => s + f.margen, 0);
  const sumMix = L1.filas.reduce((s, f) => s + f.mix, 0);
  chk('el KPI de facturado es la suma del ranking', Math.abs(sumF - L1.kpiFact) <= 1,
      'suma ' + sumF + '  KPI ' + L1.kpiFact);
  chk('los kilos son la suma del ranking', Math.abs(sumK - B.kilos) < 0.01,
      sumK + ' vs ' + B.kilos);
  chk('el margen del KPI es la suma del ranking', Math.abs(sumM - L1.kpiMargen) <= 2,
      'suma ' + sumM + '  KPI ' + L1.kpiMargen);
  chk('el % Mix del filtro suma 100', Math.abs(sumMix - 100) < 0.6, String(sumMix));

  // ══ 4. Un producto solo ══
  console.log('\n--- 4. un corte solo (Lomo) ---');
  const opts = await evaluar(cli, `[].map.call(document.getElementById('prodProd').options,
    function(o){return o.value+'|'+o.textContent;})`);
  chk('el select ofrece los 5 cortes + "Todo Carnes"', opts.length === 6, JSON.stringify(opts));
  chk('la opcion de un corte dice su peso', /kg/.test(opts.join(' ')), JSON.stringify(opts.slice(0, 3)));
  chk('la primera opcion dice "Todo Carnes"', /Todo Carnes/.test(opts[0]), opts[0]);

  await evaluar(cli, 'prodSetProd("CLo")');
  await pausa(400);
  const L2 = await evaluar(cli, LEER);
  const av2 = await evaluar(cli,
    `document.getElementById('prodFiltroAviso').textContent.replace(/\\s+/g,' ').trim()`);
  chk('una sola fila', L2.filas.length === 1, String(L2.filas.length));
  chk('los kilos del Lomo son los del backend',
      L2.kpi.indexOf(fmtPeso(B.lomo.unidades) + ' kg') >= 0,
      'esperaba "' + fmtPeso(B.lomo.unidades) + ' kg": ' + L2.kpi.slice(0, 140));
  chk('y su facturado tambien',
      L2.kpi.indexOf('$' + fmtPlata(B.lomo.facturado)) >= 0,
      'esperaba "$' + fmtPlata(B.lomo.facturado) + '": ' + L2.kpi.slice(0, 220));
  chk('la fila es el Lomo', /Lomo/.test(L2.filas[0].nombre), L2.filas[0].nombre);
  chk('el aviso nombra el producto', /Lomo/.test(av2), av2);
  chk('y dice 1 de 34', /1 de 34 productos/.test(av2), av2);
  chk('el % Mix de un solo producto es 100', Math.abs(L2.filas[0].mix - 100) < 0.2,
      String(L2.filas[0].mix));

  // ══ 5. Volver ══
  console.log('\n--- 5. volver a todo ---');
  await evaluar(cli, 'prodLimpiarFiltro()');
  await pausa(400);
  const L3 = await evaluar(cli, LEER);
  const c3 = await evaluar(cli, `(function(){
    return {av:getComputedStyle(document.getElementById('prodFiltroAviso')).display,
      mixH:(document.getElementById('prodMixH')||{}).textContent||'',
      on:[].filter.call(document.querySelectorAll('#prodCatChips .prod-cat-chip'),
           function(b){return b.classList.contains('on');}).map(function(b){return b.textContent.trim();})};})()`);
  chk('vuelven los 34', L3.filas.length === 34, String(L3.filas.length));
  chk('el aviso se va', c3.av === 'none', c3.av);
  chk('vuelve "Todo" marcado', c3.on.length === 1 && c3.on[0] === 'Todo', JSON.stringify(c3.on));
  chk('el Mix vuelve a ser por categoria', /categor/i.test(c3.mixH), c3.mixH);
  chk('el KPI vuelve a decir kg y u', /kg/.test(L3.kpi) && /u\b/.test(L3.kpi), L3.kpi.slice(0, 140));
  chk('el facturado vuelve al total', Math.abs(L3.kpiFact - L0.kpiFact) <= 1,
      L3.kpiFact + ' vs ' + L0.kpiFact);

  // Cambiar de categoria suelta el producto elegido
  await evaluar(cli, 'prodSetCat("Carnes")'); await pausa(250);
  await evaluar(cli, 'prodSetProd("CLo")');  await pausa(250);
  await evaluar(cli, 'prodSetCat("Pizzas")'); await pausa(400);
  const c4 = await evaluar(cli, `({sel:document.getElementById('prodProd').value,
    filas:document.querySelectorAll('#prodTablaBody tr').length,
    aviso:document.getElementById('prodFiltroAviso').textContent.replace(/\\s+/g,' ').trim()})`);
  chk('cambiar de categoria suelta el producto', c4.sel === 'all', JSON.stringify(c4));
  chk('Pizzas trae sus 8', c4.filas === 8, JSON.stringify(c4));
  chk('y el aviso ya habla de Pizzas', /Pizzas/.test(c4.aviso), c4.aviso);

  // Las pizzas siguen contando sus "pizzas fisicas" (pack x2 + individuales)
  const pz = await evaluar(cli,
    `document.getElementById('prodMix').textContent.replace(/\\s+/g,' ').trim()`);
  chk('el desglose de pizzas fisicas sobrevive al filtro', /Pack Pizzas/.test(pz) && /pizzas/i.test(pz),
      pz.slice(0, 220));

  await evaluar(cli, 'prodLimpiarFiltro()');
  await pausa(350);

  // ══ 6. La pantalla ══
  console.log('\n--- 6. la pantalla ---');
  /* Los controles NUEVOS (el grupo del filtro) tienen que llegar al piso en los
     dos anchos. El resto de la sub-tab tiene botones de 22px preexistentes -los
     15 "Marcar" de Renegociacion y el select de la meta-, y en escritorio eso es
     deliberado: el piso de 38px se exige en el celular. Medido antes de aflojar
     el chequeo: de los 16 chicos a 1440px, 0 son del filtro. */
  const chicoNuevo = await evaluar(cli, `(function(){
    var out=[];
    [].forEach.call(document.querySelectorAll('#prodCatGroup button, #prodCatGroup select'),
      function(b){ var r=b.getBoundingClientRect();
        if(r.height>0 && r.height < 34) out.push((b.className||b.tagName)+' '+Math.round(r.height)+'px'); });
    return out;})()`);
  chk('los controles del filtro llegan a 34px', chicoNuevo.length === 0, JSON.stringify(chicoNuevo));

  const chico = await evaluar(cli, `(function(){
    var min = ${ANCHO} < 500 ? 38 : 22, out=[];
    [].forEach.call(document.querySelectorAll('#vProductos button, #vProductos select'),
      function(b){ var r=b.getBoundingClientRect();
        if(r.height>0 && r.height < min) out.push((b.className||b.id||b.tagName)+' ['+b.textContent.trim().slice(0,14)+'] '+Math.round(r.height)+'px'); });
    return out.slice(0,8);})()`);
  chk('ningun control por debajo del piso de este ancho', chico.length === 0, JSON.stringify(chico));

  const desb = await evaluar(cli,
    `({docW:document.documentElement.scrollWidth, winW:window.innerWidth})`);
  chk('no desborda a lo ancho', desb.docW <= desb.winW + 1, JSON.stringify(desb));

  const errs = await evaluar(cli, '(window.__err||[]).slice(0,6)');
  chk('0 errores de consola', errs.length === 0, JSON.stringify(errs));

  // ══ 7. Una categoria que no existe se suelta sola ══
  console.log('\n--- 7. una categoria que no esta en el periodo ---');
  /* prodSetCat la acepta y prodFillCats ve que no existe: si se quedara pegada,
     la pantalla se veria vacia sin que se entienda por que. */
  await evaluar(cli, 'prodSetCat("Bebidas")');
  await pausa(400);
  const suelta = await evaluar(cli, `(function(){
    return {on:[].filter.call(document.querySelectorAll('#prodCatChips .prod-cat-chip'),
              function(b){return b.classList.contains('on');}).map(function(b){return b.textContent.trim();}),
            filas:document.querySelectorAll('#prodTablaBody tr').length,
            av:getComputedStyle(document.getElementById('prodFiltroAviso')).display};})()`);
  chk('la categoria inexistente se suelta sola', suelta.on.length === 1 && suelta.on[0] === 'Todo',
      JSON.stringify(suelta));
  chk('y la pantalla NO queda vacia', suelta.filas === 34, JSON.stringify(suelta));
  chk('sin aviso de filtro', suelta.av === 'none', suelta.av);

  console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal   (' + ANCHO + 'px)');
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(2); });
