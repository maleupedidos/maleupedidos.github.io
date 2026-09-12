/* Prueba de la sub-tab Inicio > Resumen despues de los 4 cambios del 8/9/2026.
   Chrome de verdad, sesion REAL y POST interceptados (la planilla no se toca).
   Uso:  node probar_resumen.js <token> [ancho]                                */
const path = require('path');
const RAIZ = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas';
const { abrir, evaluar } = require(path.join(RAIZ, 'cdp.js'));
const prep = require(path.join(RAIZ, 'sesion_prep.js'));

const TOKEN = process.argv[2];
const ANCHO = Number(process.argv[3] || 1440);
if (!TOKEN) { console.error('falta el token'); process.exit(1); }

let ok = 0, mal = 0;
const chk = (c, t, extra) => { if (c) { ok++; console.log('  \x1b[32mok\x1b[0m  ' + t); }
  else { mal++; console.log('  \x1b[31mMAL\x1b[0m ' + t + (extra ? '  → ' + extra : '')); } };

/* Espera activa: devuelve false si se agota, y el test TIENE que mirarlo — un
   esperar() cuyo retorno no se chequea se agota en silencio. */
async function esperar(cli, expr, ms = 60000, cada = 400) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evaluar(cli, expr)) return true; } catch (e) {}
    await new Promise(r => setTimeout(r, cada));
  }
  return false;
}

/* `demStub` null = catalogo real. Si no, un mapa {abbr: dem} que reemplaza la
   respuesta de `action=catalogo` para ejercitar la direccion contraria. */
async function correr(cli, demStub) {
  let extra = '';
  if (demStub) {
    extra = '(function(){var o=window.fetch;window.fetch=function(u,x){'
      + 'if(String(u).indexOf("action=catalogo")>=0){'
      + 'var m=' + JSON.stringify(demStub) + ';var prods={p:[]};'
      + 'Object.keys(m).forEach(function(a){prods.p.push({a:a,n:a,cat:"x",dem:m[a],s:0});});'
      + 'return Promise.resolve(new Response(JSON.stringify({ts:Date.now(),proveedores:["p"],productos:prods}),'
      + '{status:200,headers:{"Content-Type":"application/json"}}));}'
      + 'return o.apply(this,arguments);};})();'
      + 'try{localStorage.removeItem("mc_semprepDem");}catch(e){}';
  }
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, extra) });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
  return await esperar(cli, 'typeof D!=="undefined" && D && D.pedidos && D.pedidos.length>0', 90000);
}

/* Abre la lista de productos del bloque del jueves si esta plegada. El estado
   lo decide la URGENCIA: a mas de 48 h del cutoff arranca cerrada, asi que un
   test que mida chips tiene que abrirla o no mide nada.

   ESPERA a que el bloque exista antes de tocarlo: `rSemanaPrep` vive de
   `D.stock`, que llega con el volcado (21-27 s), y `correr()` recarga la
   pagina. Sin la espera esto corria sobre un `#hSemana` vacio, devolvia "sin
   bloque" y los chequeos de abajo median 0 chips igual que antes. */
async function abrirDetalle(cli) {
  const hay = await esperar(cli,
    'document.querySelector(\'#hSemana [data-semprep="jueves"]\')!==null', 90000);
  if (!hay) return 'el bloque del jueves no se dibujo';
  try {
    return await evaluar(cli, `(function(){
      var box=document.querySelector('#hSemana [data-semprep="jueves"]');
      if(box.getAttribute('data-abierto')==='1') return 'ya estaba abierto';
      if(typeof _semprepTog!=='function') return 'no hay toggle';
      _semprepTog('jueves');
      var b2=document.querySelector('#hSemana [data-semprep="jueves"]');
      return (b2 && b2.getAttribute('data-abierto')==='1') ? 'abierto' : 'no se abrio';
    })()`);
  } catch (e) { return 'fallo: ' + e.message; }
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride',
    { width: ANCHO, height: ANCHO < 560 ? 844 : 950, deviceScaleFactor: 1, mobile: ANCHO < 560 });

  console.log('\n=== Inicio > Resumen a ' + ANCHO + 'px ===\n');

  // ───────────────────────── escenario real ─────────────────────────
  if (!await correr(cli, null)) { console.error('el volcado no llego'); cli.matar(); process.exit(1); }
  const llegoDem = await esperar(cli, 'SEMPREP_DEM && Object.keys(SEMPREP_DEM).length>0', 60000);
  chk(llegoDem, 'la demanda Home llega desde action=catalogo');
  /* Desde v290 (10/9/2026) la lista de productos arranca PLEGADA cuando el
     cutoff esta lejos: con 6 dias por delante `.semprep-lst` no se dibuja y los
     chips dan 0. Se abre el detalle antes de medir -es lo que hace un toque en
     "Ver que falta"-, y si no hay nada plegado el toggle no existe y la lista
     ya esta. Sin esto el test daba 4 "mal" que eran suyos, no del ERP. */
  const _det = await abrirDetalle(cli);
  console.log('     (detalle del bloque del jueves: ' + _det + ')');
  await esperar(cli, 'document.querySelector("#hSemana .semprep-lst")!==null', 20000);

  // ── PUNTO 1: el bloque del jueves ──
  console.log('\n1) El bloque de la orden de compra');
  const b1 = await evaluar(cli, `(function(){
    var box=document.querySelector('#hSemana .semprep'); if(!box)return null;
    var filas=[].map.call(box.querySelectorAll('.semprep-row'),function(r){
      return {cls:r.className, t:(r.querySelector('.semprep-t')||{}).textContent||'',
              d:(r.querySelector('.semprep-d')||{}).textContent||''};});
    var prods=[].map.call(box.querySelectorAll('.semprep-p:not(.mas)'),function(p){return p.textContent.trim();});
    var stock={}; (D.stock||[]).forEach(function(s){stock[s.a]={n:s.n,d:s.d};});
    return {filas:filas, prods:prods, pie:(box.querySelector('.semprep-pie')||{}).textContent||'',
            head:(box.querySelector('.semprep-h')||{}).textContent||'', stock:stock,
            dem:SEMPREP_DEM};
  })()`);
  chk(!!b1, 'el bloque se dibuja');
  if (b1) {
    const roja = b1.filas.find(f => /semprep-row r/.test(f.cls));
    chk(!!roja, 'hay una fila de "no llegan al viernes"');
    chk(/no llega/.test((roja || {}).t || ''), 'el titulo dice que no llegan al viernes', (roja || {}).t);
    chk(b1.prods.length > 0, 'lista productos, uno por uno', b1.prods.length + ' productos');
    chk(/Pack Muzzarella x2/.test(b1.prods[0] || ''), 'el PRIMERO es el que mas se mueve (Pack Muzzarella x2)', b1.prods[0]);
    chk(b1.prods.every(p => /\/sem/.test(p)), 'cada producto dice cuanto se vende por semana');
    chk(b1.prods.every(p => /quedan |queda 1|sin stock/.test(p)), 'cada producto dice cuanto queda');
    // ordenado por demanda descendente
    const nums = b1.prods.map(p => { const m = p.match(/([\d,]+)\/sem/); return m ? Number(m[1].replace(',', '.')) : -1; });
    chk(nums.every((v, i) => i === 0 || nums[i - 1] >= v), 'estan ordenados por lo que mas se mueve', JSON.stringify(nums));
    // los premium de Pilar NO estan en la lista roja
    const prem = ['Queso Brie', 'Langostinos'];
    chk(prem.every(n => !b1.prods.some(p => p.indexOf(n) >= 0)),
      'los sorrentinos que NO se venden en Estancias no estan en la lista roja');
    /* La fila de "por encargo" tiene DOS formas y las dos son correctas: gris
       cuando nadie pidio esos productos, AMBAR cuando hay un pedido vivo que los
       necesita. Exigir una hacia depender el test del dato del dia. */
    const gris = b1.filas.find(f => /por encargo/.test(f.t));
    if (gris) {
      chk(/no se stockean/.test(gris.d), 'la fila de "por encargo" explica que no se stockean', gris.d);
      const conPedido = /hay que comprarlas para ese pedido/.test(gris.d);
      chk(conPedido || /hoy nadie los pidi/.test(gris.d),
        conPedido ? '  y dice que hay un pedido vivo esperandolas' : '  y dice que hoy nadie los pidio', gris.d);
      /* Los premium de Pilar estan aca SOLO si hoy estan en cero: si alguno tiene
         stock no aparece, y eso no es una falla. Se exige que los que aparezcan
         esten NOMBRADOS, no que aparezcan todos. */
      const enCero = prem.filter(n => (b1.stock[({ 'Queso Brie': 'SQB', 'Langostinos': 'SL' })[n]] || {}).d <= 0);
      if (enCero.length) chk(enCero.every(n => gris.d.indexOf(n) >= 0),
        '  y nombra los que estan en cero (' + enCero.join(', ') + ')', gris.d);
    } else {
      chk(!Object.keys(b1.stock).some(a => (b1.stock[a].d || 0) <= 0 && (b1.dem[a] || 0) === 0),
        'no hay fila de "por encargo" porque no hay ningun producto de esos en cero');
    }
    // el caso que el corte viejo (<=2) no veia
    const sjyq = b1.stock['SJyQ'];
    if (sjyq && b1.dem['SJyQ'] > sjyq.d) {
      chk(b1.prods.some(p => p.indexOf('Jam') >= 0 && p.indexOf('Sorrentinos') >= 0),
        'agarra Sorrentinos J&Q (4 en stock, vende ' + b1.dem['SJyQ'] + '/sem) que el corte viejo no veia');
    }
    chk(/pedidos ya cargados|Todav/.test(b1.pie), 'el pie da el denominador de pedidos');
    chk(/cierra el jueves/.test(b1.head), 'el encabezado dice cuando cierra la orden');
  }

  // ── PUNTO 2: el grafico ──
  console.log('\n2) El grafico de los 6 meses');
  /* `action=tendencia` va en prioridad 0 y sale detras del volcado: medido el
     11/9/2026, el grafico y la banda de abajo llegan a los 28 s. Sin esperarlos,
     `b2` y `b3` vienen null y el test dice que la pantalla esta rota. */
  const llegoGraf = await esperar(cli, `!!document.querySelector('.tend-graf svg.vt-svg')`, 90000);
  chk(llegoGraf, 'el grafico llego (action=tendencia tarda ~28 s)');
  const b2 = await evaluar(cli, `(function(){
    var g=document.querySelector('.tend-graf'); if(!g)return null;
    var svg=g.querySelector('svg.vt-svg'); if(!svg)return {svg:false};
    var r=svg.getBoundingClientRect();
    var vb=svg.getAttribute('viewBox').split(' ');
    var meses=[].map.call(svg.querySelectorAll('.m6-mes'),function(t){return t.textContent;});
    var nuevos=[].map.call(svg.querySelectorAll('.m6-new'),function(t){return t.textContent;});
    var vals=[].map.call(svg.querySelectorAll('.vt-val'),function(t){return t.textContent;});
    var textos=[].map.call(svg.querySelectorAll('text'),function(t){
      var b=t.getBoundingClientRect();
      return {txt:t.textContent,x0:b.left,x1:b.right,y0:b.top,y1:b.bottom};});
    return {svg:true, w:r.width, vbW:Number(vb[2]),
      barras:g.querySelectorAll('.tend-b,.tend-bt,.tend-col').length,
      meses:meses, nuevos:nuevos, vals:vals, textos:textos,
      curso:svg.querySelectorAll('.vt-line.m6-curso').length,
      linea:svg.querySelectorAll('.vt-line').length,
      ejeY:svg.querySelectorAll('.vt-ytick').length,
      caja:g.getBoundingClientRect().right};
  })()`);
  chk(b2 && b2.svg, 'ahora es un SVG de linea, no barras');
  if (b2 && b2.svg) {
    chk(b2.barras === 0, 'no queda ni un elemento de las barras viejas', String(b2.barras));
    chk(b2.ejeY >= 3, 'tiene eje Y con grilla (las barras no tenian escala)', b2.ejeY + ' marcas');
    chk(b2.meses.length === 7, 'rotula los 7 meses', b2.meses.join(' '));
    chk(b2.nuevos.length === 7, 'y los clientes nuevos de cada uno', b2.nuevos.join(' · '));
    chk(b2.vals.length >= 5, 'rotula los montos que entran', b2.vals.length + ' de 7');
    chk(b2.curso === 1, 'el tramo del mes en curso va punteado', String(b2.curso));
    chk(Math.abs(b2.w - b2.vbW) <= 2, 'el SVG no esta escalado (' + Math.round(b2.w) + ' vs viewBox ' + b2.vbW + ')');
    let choques = 0, cortados = 0;
    for (let i = 0; i < b2.textos.length; i++) {
      const a = b2.textos[i];
      if (a.x1 > b2.caja + 1) cortados++;
      for (let j = i + 1; j < b2.textos.length; j++) {
        const c = b2.textos[j];
        if (a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1) choques++;
      }
    }
    chk(b2.textos.length >= 15, 'hay texto de verdad que medir', b2.textos.length + ' textos');
    chk(choques === 0, 'ningun texto se choca con otro', String(choques));
    chk(cortados === 0, 'ningun texto se sale del lienzo', String(cortados));
  }

  // ── PUNTO 3: la base de clientes ──
  console.log('\n3) Mi base de clientes');
  const llegoBase = await esperar(cli, `!!document.querySelector('.tend-base')`, 90000);
  chk(llegoBase, 'la banda llego (sale del mismo endpoint que el grafico)');
  const b3 = await evaluar(cli, `(function(){
    var b=document.querySelector('.tend-base'); if(!b)return null;
    var btn=b.querySelector('.tend-base-acc button');
    return {h:(b.querySelector('.tend-base-h')||{}).textContent||'',
            q:(b.querySelector('.tend-base-q')||{}).textContent||'',
            chips:[].map.call(b.querySelectorAll('.tend-chip-e'),function(e){return e.textContent;}),
            btn:btn?btn.textContent.trim():'', btnH:btn?btn.getBoundingClientRect().height:0,
            base:(M6&&M6.base)||null};
  })()`);
  chk(!!b3, 'la banda existe');
  if (b3) {
    chk(/de todos los canales/.test(b3.h), 'el encabezado dice de que universo habla', b3.h);
    chk(b3.q.length > 0, 'hay una linea que dice de quienes son esas personas', b3.q);
    chk(/Estancias del Pilar/.test(b3.q), 'nombra Estancias del Pilar');
    chk(/Red/.test(b3.q) && /no les escrib/.test(b3.q), 'aclara que los de Red no son suyos', b3.q);
    if (b3.base && b3.base.estancias) chk(b3.q.indexOf(String(b3.base.estancias)) >= 0,
      'el numero de Estancias es el del backend (' + b3.base.estancias + ')', b3.q);
    chk(b3.chips.length === 4, 'los 4 estados siguen', b3.chips.join('/'));
    chk(/Segmentos/.test(b3.btn), 'hay un boton que lleva a trabajarlos', b3.btn);
    if (ANCHO < 560) chk(b3.btnH >= 44, 'el boton llega a 44px en el celular', b3.btnH + 'px');
  }
  const salto = await evaluar(cli, `(function(){try{_m6IrASegmentos();
    var p=document.querySelector('#p-estancias'); var s=document.querySelector('#est-segmentos');
    return {tab:!!(p&&p.classList.contains('on')), sub:!!(s&&s.classList.contains('on'))};
  }catch(e){return {err:String(e)};}})()`);
  chk(salto && salto.tab && salto.sub, 'el boton abre Estancias > Segmentos', JSON.stringify(salto));
  await evaluar(cli, "go('inicio')");

  // ── PUNTO 4: el hero ──
  console.log('\n4) El encabezado');
  const b4 = await evaluar(cli, `(function(){
    var hb=document.getElementById('heroBox'); if(!hb)return null;
    var subs=[].map.call(hb.querySelectorAll('.hero-sub'),function(e){return e.textContent;});
    // el KPI de Facturado del mes, para comparar criterios
    var kpi=''; [].forEach.call(document.querySelectorAll('#hSnap *'),function(e){
      if(/FACTURADO MES/i.test(e.textContent||'') && e.children.length<=3 && !kpi){
        var v=e.parentElement?e.parentElement.textContent:''; kpi=v;}});
    return {subs:subs, txt:hb.textContent, kpi:kpi,
            cols:hb.firstElementChild?hb.firstElementChild.children.length:0};
  })()`);
  chk(!!b4, 'el hero existe');
  if (b4) {
    chk(b4.subs.some(s => /^HOY$/.test(s.trim())), 'la primera tarjeta se llama HOY', b4.subs.join(' | '));
    chk(/entregas? por \$|Sin entregas cargadas/.test(b4.txt), 'dice que se entrega HOY', b4.txt.slice(0, 160));
    chk(/semana \d+ \(lun \d+\/\d+ → dom \d+\/\d+\)/.test(b4.txt), 'dice el rango de la semana');
    chk(!/\d+ ventas · \$/.test(b4.txt), 'ya NO repite las ventas de la semana (viven en el bloque de abajo)');
    chk(b4.cols === 2, 'quedan 2 tarjetas, no 3', String(b4.cols));
    chk(/MARGEN BRUTO DEL MES/.test(b4.txt) && /percibido:/.test(b4.txt),
      'el margen es una sola tarjeta con el percibido adentro');
  }
  // el facturado del hero tiene que ser el MISMO que el del KPI de arriba
  const cuad = await evaluar(cli, `(function(){
    var now=new Date(), ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    var a=0,b=0;
    (D.pedidos||[]).forEach(function(p){
      if(!p.c||!p.c.trim()||!(p.$>0))return;
      if(p.es!=='Entregado'||p.hist)return;
      if(_mesDePedido(p)===ym)a+=p.$;
      var f=p.fe||p.f; if(f){var pp=String(f).split('/');
        if(pp.length>=2&&Number(pp[1])===now.getMonth()+1)b+=p.$;}
    });
    return {nuevo:a, viejo:b};
  })()`);
  chk(cuad.nuevo > 0, 'el facturado del mes del hero da un numero', '$' + cuad.nuevo);
  chk(!/MARGEN BRUTO MES<|MARGEN BRUTO FINANCIERO<\/div>/.test(b4 ? b4.txt : ''), 'no quedaron las dos tarjetas viejas');
  console.log('     (mes contable $' + cuad.nuevo + ' vs criterio viejo $' + cuad.viejo +
    ' → ' + (cuad.nuevo === cuad.viejo ? 'iguales hoy, como estaba medido' : 'DIFIEREN') + ')');

  // ── consola limpia ──
  const errs = await evaluar(cli, 'JSON.stringify((window.__err||[]).filter(function(e){return !/favicon|sw-panel|ServiceWorker/i.test(e);}))');
  chk(JSON.parse(errs).length === 0, 'sin errores en consola', errs.slice(0, 240));

  // ───────── direccion contraria: si el premium SE vende, sube a la lista ─────────
  console.log('\n5) La direccion contraria');
  if (!await correr(cli, { SQB: 9, PPM: 0.1, SL: 0, PPCyQ: 0 })) { console.error('no cargo'); }
  await esperar(cli, 'SEMPREP_DEM && SEMPREP_DEM.SQB===9', 40000);
  /* Desde v290 (10/9/2026) la lista de productos arranca PLEGADA cuando el
     cutoff esta lejos: con 6 dias por delante `.semprep-lst` no se dibuja y los
     chips dan 0. Se abre el detalle antes de medir -es lo que hace un toque en
     "Ver que falta"-, y si no hay nada plegado el toggle no existe y la lista
     ya esta. Sin esto el test daba 4 "mal" que eran suyos, no del ERP. */
  const _det2 = await abrirDetalle(cli);
  console.log('     (detalle del bloque del jueves: ' + _det2 + ')');
  await esperar(cli, 'document.querySelector("#hSemana .semprep-lst")!==null', 20000);
  const b5 = await evaluar(cli, `(function(){
    var box=document.querySelector('#hSemana .semprep'); if(!box)return null;
    return {prods:[].map.call(box.querySelectorAll('.semprep-p:not(.mas)'),function(p){return p.textContent.trim();}),
            gris:(function(){var r=[].filter.call(box.querySelectorAll('.semprep-row'),function(x){return /por encargo/.test(x.textContent);})[0];return r?r.textContent:'';})()};
  })()`);
  chk(!!b5 && b5.prods.some(p => /Queso Brie/.test(p)),
    'con demanda 9/sem, Queso Brie SI aparece en la lista de reponer', b5 && b5.prods.join(' | ').slice(0, 200));
  /* Langostinos cae en la fila de "por encargo" SOLO si hoy esta en cero: con
     stock no aparece, y eso es lo correcto. El test pregunta por el stock real
     antes de exigirlo — hardcodear que un producto esta en cero se rompe solo a
     los dos dias, que es justo lo que le paso al chequeo de PPM de abajo. */
  const slEnCero = await evaluar(cli, `(function(){
    var s=((window.D&&D.stock)||[]).filter(function(x){return x.a==='SL';})[0];
    return s ? (Number(s.d||0) <= 0) : null;
  })()`);
  if (slEnCero === true) {
    chk(!!b5 && /Langostinos/.test(b5.gris), 'y Langostinos (demanda 0, en cero) esta en la fila de por encargo',
        b5 && b5.gris.slice(0, 140));
  } else {
    chk(!!b5 && !/Langostinos/.test(b5.prods.join(' ')),
        'Langostinos (demanda 0) NO entra en la lista de reponer' +
        (slEnCero === false ? ' — hoy tiene stock, asi que tampoco va en la de por encargo' : ''),
        b5 && b5.prods.join(' | ').slice(0, 160));
  }
  /* Este chequeo prueba la REGLA -se marca lo que no llega a la proxima
     reposicion, o sea menos de una semana de venta en el freezer-, no un stock
     escrito a mano. Cuando se escribio, PPM tenia 2 unidades; el 11/9/2026
     tiene 0, y con 0 en stock y 0,1/sem APARECER es lo correcto. Un test que
     hardcodea el stock de un producto se rompe solo a los dos dias. */
  const ppm = await evaluar(cli, `(function(){
    var s=(D.stock||[]).filter(function(x){return x.a==='PPM';})[0];
    return s ? {disp:Number(s.d)||0, dem:Number((SEMPREP_DEM||{}).PPM)||0} : null;})()`);
  const apareceEsperado = !!ppm && ppm.disp < ppm.dem;
  const aparece = !!b5 && b5.prods.some(p => /Muzzarella x2/.test(p));
  chk(!!ppm && aparece === apareceEsperado,
    'Pack Muzzarella con 0,1/sem: ' + (apareceEsperado ? 'aparece' : 'NO aparece')
      + ' (tiene ' + (ppm ? ppm.disp : '?') + ' en stock, cubre '
      + (ppm && ppm.dem ? (ppm.disp / ppm.dem).toFixed(0) : '?') + ' semanas)',
    'esperaba ' + apareceEsperado + ', dio ' + aparece);

  console.log('\n' + (mal ? '\x1b[31m' : '\x1b[32m') + ok + ' ok · ' + mal + ' mal\x1b[0m\n');
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('REVENTO:', e); process.exit(1); });
