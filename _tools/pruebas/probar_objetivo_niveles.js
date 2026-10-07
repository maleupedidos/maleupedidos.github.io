/* Metas por nivel en la tab Objetivo (4/10/2026): probado en un Chrome de verdad,
   con la sesion real y los POST interceptados (no escribe nada en la planilla).

     node _tools/pruebas/probar_objetivo_niveles.js <token> [ancho] [puerto]

   La prueba que pidio Tadeo y que faltaba cuando el total decia $18.840.829 y
   las tarjetas sumaban $19.392.829:
   1. CANALES = MERCADO = UNIDAD = TOTAL, al peso, en meta y en real (plata,
      costo y ventas), en el mes en curso y en septiembre.
   2. El TOTAL del arbol es el mismo numero de Inicio y del EERR. Septiembre da
      $19.392.829.
   3. El total cargado y la suma de los canales se muestran los dos, con la
      diferencia.
   4. «Planificar el mes» carga la meta POR CANAL (plata, ventas, margen) y el
      total con sus ventas y su margen.
   5. Sin scroll horizontal.

   El arbol NO se copia aca: se lee de `PLAN_ARBOL_` en Code.js (es la unica tabla
   de equivalencias). Los `planMes` de octubre y septiembre se arman o se
   completan con ese arbol, asi la prueba corre antes de publicar el backend. */
const R = __dirname + '/';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require(R + 'cdp.js');
const prep = require(R + 'sesion_prep.js');
const [tok, anchoS, puertoS] = process.argv.slice(2);
if (!tok) { console.error('falta el token: python _tools/pruebas/leer_sesion.py'); process.exit(2); }
const ancho = Number(anchoS) || 1440, puerto = Number(puertoS) || 8095;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (c, t, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 500) : '')); } };

const CODE = path.join(__dirname, '..', '..', '..', 'estancias', '.clasp-src', 'Code.js');
const mA = fs.readFileSync(CODE, 'utf8').match(/var PLAN_ARBOL_ = (\{[\s\S]*?\n\});/);
if (!mA) { console.error('no encuentro PLAN_ARBOL_ en Code.js'); process.exit(2); }
const ARBOL = eval('(' + mA[1] + ')');

const AR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const MSA = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const Y = AR.getFullYear(), M0 = AR.getMonth(), HOY = AR.getDate();
const LBL = MSA[M0] + ' ' + Y;
const fila = (canal, f, v, mg) => ({ canal: canal, barrio: '', metaFact: f, metaPedidos: v, metaTicket: Math.round(f / v), metaMargen: mg });
/* Octubre tal como quedo en la planilla el 4/10/2026: el BASE de `Objetivos
   Octubre 2026.md` con los $9.735 que faltaban sumados a Home, para que el total
   y los canales cierren al peso (276 ventas, margen 27,3% = el ponderado). */
const METAS = {
  'Total|': { canal: 'Total', barrio: '', metaFact: 23300000, metaPedidos: 276, metaMargen: 27.3 },
  'Home|': fila('Home', 14229322, 209, 27), 'Pilar|': fila('Pilar', 4966086, 44, 27),
  'Clubes|': fila('Clubes', 2050500, 12, 26.5), 'Red|': fila('Red', 1502092, 10, 26.5),
  'Catering|': fila('Catering', 552000, 1, 43)
};
const SUMA = 14229322 + 4966086 + 2050500 + 1502092 + 552000;   // 23.300.000
const FALSO = { ok: true, mes: LBL, yyyy: Y, mm: M0 + 1, diasMes: new Date(Y, M0 + 1, 0).getDate(), diasTrans: HOY,
  metas: METAS, real: {}, origen: [], objetivos: [], acciones: [], arbol: ARBOL };
const EXTRA = '(function(){var FALSO=' + JSON.stringify(FALSO) + ',ARBOL=' + JSON.stringify(ARBOL) + ';window.__posts=[];var o=window.fetch;window.fetch=function(u,x){'
  + 'if(x&&String(x.method||"").toUpperCase()==="POST"){try{window.__posts.push(JSON.parse(x.body));}catch(e){}}'
  + 'if(String(u).indexOf("action=planMes")>=0&&String(u).indexOf(encodeURIComponent(FALSO.mes))>=0)return Promise.resolve(new Response(JSON.stringify(FALSO),{status:200,headers:{"Content-Type":"application/json"}}));'
  + 'if(String(u).indexOf("action=planMes")>=0)return o.apply(this,arguments).then(function(r){return r.json();}).then(function(d){d.arbol=ARBOL;return new Response(JSON.stringify(d),{status:200,headers:{"Content-Type":"application/json"}});});'
  + 'return o.apply(this,arguments);};})();'
  + 'try{Object.keys(localStorage).forEach(function(k){if(k.indexOf("maleu_plan_cache_")===0)localStorage.removeItem(k);});}catch(e){}';

/* Cada nodo tiene que ser la suma exacta de sus hijos. Devuelve los que no. */
const CUADRA = `(function(T){
  var malos=[], n=0;
  (function rec(x){
    if(!x.hijos.length) return;
    n++;
    var s={mf:0,mv:0,mb:0,rf:0,rc:0,rv:0};
    x.hijos.forEach(function(h){ s.mf+=h.meta.f; s.mv+=h.meta.v; s.mb+=h.meta.mb; s.rf+=h.real.f; s.rc+=h.real.c; s.rv+=h.real.v; rec(h); });
    var d=[x.meta.f-s.mf, x.meta.v-s.mv, Math.round(x.meta.mb-s.mb), x.real.f-s.rf, x.real.c-s.rc, x.real.v-s.rv];
    if(d.some(function(v){ return Math.abs(v)>0.5; })) malos.push([x.id, d]);
  })(T);
  return {malos:malos, nodos:n};
})`;

async function arbolDe(cli) {
  return evaluar(cli, `(function(){ var T=_planNivelesMes(); if(!T) return null;
    var c=${CUADRA}(T), canales=[];
    (function rec(x){ if(x.canal) canales.push([x.id,x.real.f,x.meta.f]); x.hijos.forEach(rec); })(T);
    var hoja={}; T.hijos.forEach(function(u){ hoja[u.id]=u.real.f; (u.hijos||[]).forEach(function(m){ hoja[m.id]=m.real.f; }); });
    return {fact:T.fact, raiz:T.real.f, raizV:T.real.v, meta:T.meta.f, cuadra:c, canales:canales, niveles:hoja};
  })()`);
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: ancho < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: ancho < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(tok) + EXTRA });
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + puerto + '/app.html' });
  console.log('\n== Objetivo por nivel · ' + ancho + 'px ==\n');
  let listo = false;
  for (let i = 0; i < 150 && !listo; i++) { listo = await evaluar(cli, "!!(window.D&&D.pedidos&&D.pedidos.length&&window.VD&&D.gastos&&Array.isArray(D.ventasExtra))"); if (!listo) await sleep(1000); }
  chk(listo, 'el ERP cargo pedidos, catering/B2B, ventas y gastos');
  await evaluar(cli, "go('planificacion'),1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "!!document.querySelector('#planTotal .pn-row')")) break; await sleep(500); }
  await sleep(800);

  /* 1-2. El mes en curso */
  const A = await arbolDe(cli);
  chk(!!A && A.cuadra.nodos === 5 && A.cuadra.malos.length === 0, 'mes en curso: canales = mercado = unidad = total, al peso (meta, real, costo y ventas) en los 5 nodos con hijos', A && A.cuadra);
  chk(!!A && A.raiz === A.fact && A.fact > 0, 'el TOTAL real del arbol es el de Inicio y el EERR (_rtSumar con catering)', A && [A.raiz, A.fact]);
  chk(!!A && A.meta === SUMA, 'la meta del TOTAL del arbol es la suma de los canales ($23.300.000)', A && A.meta);
  const K = await evaluar(cli, `(function(){ var K=eerrKpisMes(${M0 + 1},${Y}); return K?K.totFact:null; })()`);
  chk(A && K !== null && Math.abs(A.raiz - K) < 1, 'y el del EERR del mes', [A && A.raiz, K]);

  /* 3. Lo que se ve */
  const V = await evaluar(cli, `(function(){
    var b=document.querySelector('#planTotal .pn'); if(!b) return null;
    var rows=[].map.call(b.querySelectorAll('.pn-row'),function(r){ return r.querySelector('.pn-n').textContent.trim()+' | '+r.querySelector('.pn-f').textContent.trim(); });
    return {dif:(b.querySelector('.pn-dif')||{}).textContent||'', rows:rows, cards:document.querySelectorAll('#planTotal .plan-tot-c').length,
      sw:document.documentElement.scrollWidth, iw:window.innerWidth};
  })()`);
  chk(!!V && /Objetivo cargado \$23\.300\.000 · 276 ventas · margen 27,3%/.test(V.dif), 'muestra el total cargado con ventas y margen', V && V.dif);
  chk(!!V && /Suma de los canales \$23\.300\.000 · 276 ventas · margen 27,3%/.test(V.dif), 'y la suma de los canales', V && V.dif);
  chk(!!V && /Diferencia: cierran al peso$/.test(V.dif.trim()), 'octubre cierra al peso: sin diferencia de plata, ventas ni margen', V && V.dif);
  /* Eran 11 hasta el 6/10/2026: Catering es unidad Y canal, y se dibujaba dos
     veces. La unidad con un solo canal del mismo nombre va una sola vez. */
  chk(!!V && V.rows.length === 10, 'diez filas: total, 2 unidades, 2 mercados, 5 canales de retail', V && V.rows);
  chk(!!V && V.rows.filter(r => /^Catering /.test(r)).length === 1, 'Catering aparece UNA vez', V && V.rows);
  chk(!!V && V.cards === 0, 'las tarjetas de canal se reemplazan (no dos versiones del mismo numero)', V && V.cards);
  const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
  chk(!!V && !!A && V.rows[0].indexOf(fmt(A.raiz)) >= 0 && V.rows[0].indexOf('de ' + fmt(SUMA)) >= 0, 'la fila TOTAL dice el real y la meta del arbol', V && V.rows[0]);
  chk(!!V && V.sw <= V.iw, 'sin scroll horizontal', V && [V.sw, V.iw]);

  /* 4. El editor */
  await evaluar(cli, "planPlanificarMes(),1"); await sleep(400);
  const E = await evaluar(cli, `({n:document.querySelectorAll('#planMetaBody .plan-ppc-r input[id^=ppCf]').length,
    home:document.getElementById('ppCf0').value, homeM:document.getElementById('ppCm0').value, totV:document.getElementById('ppTotV').value, totM:document.getElementById('ppTotM').value,
    suma:document.getElementById('ppSuma').textContent, sw:document.getElementById('planMetaBody').scrollWidth, cw:document.getElementById('planMetaBody').clientWidth})`);
  chk(E.n === 6, 'el editor tiene una fila por canal (Home, Pilar, Clubes, Red, B2B, Catering)', E.n);
  chk(E.home === '14.229.322' && E.homeM === '27' && E.totV === '276' && E.totM === '27,3', 'arranca con lo cargado', E);
  chk(/Suma de los canales \$23\.300\.000 · 276 ventas · margen 27,3%/.test(E.suma) && /cierran al peso$/.test(E.suma), 'y muestra la suma contra el total, en vivo', E.suma);
  chk(E.sw <= E.cw + 1, 'el editor entra sin scroll horizontal', [E.sw, E.cw]);
  await evaluar(cli, "var i=document.getElementById('ppCf3');i.value='1.600.000';i.dispatchEvent(new Event('input')),1");
  const s2 = await evaluar(cli, "document.getElementById('ppSuma').textContent");
  chk(/\$23\.397\.908/.test(s2) && /−\$97\.908/.test(s2), 'cambiar un canal recalcula la suma y la diferencia (Red 1.502.092 → 1.600.000)', s2);
  await evaluar(cli, "window.__posts=[],document.getElementById('ppGuardar').click(),1");
  for (let i = 0; i < 40; i++) { if ((await evaluar(cli, 'window.__posts.filter(function(p){return p.action==="planMetaSet"}).length')) >= 6) break; await sleep(300); }
  const ps = (await evaluar(cli, 'window.__posts')).filter(p => p.action === 'planMetaSet');
  const pc = c => ps.filter(p => p.canal === c)[0] || {};
  chk(pc('Total').metaFact === 23300000 && pc('Total').metaPedidos === 276 && pc('Total').metaMargen === 27.3, 'guarda el Total con sus ventas y su margen', pc('Total'));
  chk(pc('Red').metaFact === 1600000 && pc('Red').metaPedidos === 10 && pc('Red').metaMargen === 26.5 && pc('Red').barrio === '', 'y cada canal por su nombre de hoja, con plata, ventas y margen', pc('Red'));
  chk(ps.length === 6 && !pc('B2B').canal, 'B2B vacio y sin fila previa no se manda', ps.map(p => p.canal));
  await sleep(1500);

  /* 5. Septiembre: el criterio de aceptacion */
  await evaluar(cli,"document.getElementById('planMesSel').value='Septiembre 2026',planLoad(),1");
  for (let i = 0; i < 80; i++) { if (await evaluar(cli, "(function(){var T=_planNivelesMes();return !!(T&&document.getElementById('planMesSel').value==='Septiembre 2026'&&/meta vieja/.test(document.getElementById('planTotal').textContent))})()")) break; await sleep(500); }
  await sleep(600);
  const S = await arbolDe(cli);
  chk(!!S && Math.round(S.fact) === 19392829 && S.raiz === S.fact, 'septiembre da $19.392.829 (redondeado: Red neta trae centavos), el mismo de Inicio y del EERR', S && [S.fact, S.raiz]);
  chk(!!S && S.cuadra.malos.length === 0, 'septiembre: canales = mercado = unidad = total, al peso', S && S.cuadra);
  chk(!!S && S.niveles.retail + S.niveles.cat === S.raiz && S.niveles.dom + S.niveles.inst === S.niveles.retail, 'retail + catering = total y domiciliario + institucional = retail', S && S.niveles);
  const VS = await evaluar(cli, "[].map.call(document.querySelectorAll('#planTotal .pn-row'),function(r){return r.textContent.replace(/\\s+/g,' ').trim()})");
  chk(VS.some(r => /^Venta Directa .*meta vieja/.test(r) && /\$10\.400\.000/.test(r)), 'la meta vieja de Venta Directa (10,4M) cuelga de Domiciliario', VS.filter(r => /Venta Directa|Domiciliario/.test(r)));

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
