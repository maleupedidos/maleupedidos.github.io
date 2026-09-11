/* RUTA > RUTA, la parada (11/9/2026): la card entera, botón por botón.

   node probar_ruta.js <token> [390|1440]

   Corre sobre el ERP FUSIONADO (app.html), con la sesión real, pero con
   `action=entregas` y `action=pendientesGuardarStock` STUBBEADOS: los casos que
   importan (un atrasado, un combo, un mixto con kilos, uno sin teléfono, un
   club con apostrofe, un vendedor Red con dos orígenes, el depósito) casi nunca
   están todos el mismo día en la planilla. Los datos son INVENTADOS a propósito:
   este repo es público (repo-web-nunca-datos-clientes).

   Los POST van interceptados: la planilla no se toca.

   Lo que mide y ningún otro instrumento mira:
   · que la barra de Cobrar/Entregado quede DENTRO de la pantalla sin scrollear,
     y arriba del statusbar en la compu;
   · que al final del scroll lo último de la card no quede tapado por la barra;
   · que ‹ y › recorran la zona filtrada (antes ‹ desde la primera no iba a la
     última);
   · que no haya ni un link wa.me (feedback_no_wa_directo);
   · que tocar el nombre del cliente abra la ficha — desde el 21/8/2026 no
     hacía nada, porque le mandaba un postMessage a una ventana padre que en el
     ERP fusionado no existe. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};

/* ── Las fechas, en hora argentina: el test tiene que dar lo mismo cualquier día ── */
const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const hace = n => { const d = new Date(hoyAR); d.setDate(d.getDate() - n); return d; };
const HOY = iso(hoyAR), HOYd = dmy(hoyAR), DIA = DIAS[hoyAR.getDay()];
const ATR = hace(2);

const base = (o) => Object.assign({ oD: {}, oc: [], hr: '10:30', f: HOYd, de: DIA, fe: HOY, es: 'Pendiente', d: '', t: '', ep: 'No Cobrado', fp: 'Transferencia' }, o);
const ENTREGAS = [
  // 1. De tu freezer, sin cobrar, en efectivo, con telefono
  base({ id: 9101, h: 'Home', r: 9001, c: 'Prueba Freezer', t: '1156381102', b: 'Estancias del Pilar', sb: 'Golf', l: '275', o: 'Deposito',
         fp: 'Efectivo', $: 45000, p: [{ a: 'PPM', q: 2 }, { a: 'EJyQ', q: 1 }] }),
  // 2. Atrasado, del proveedor, ya pagado y reservado
  base({ id: 9102, h: 'Home', r: 9002, c: 'Prueba Atrasado', t: '1144445555', b: 'Estancias del Pilar', sb: 'Champagnat Alto', l: '66',
         o: 'Orden de Compra', fe: iso(ATR), de: DIAS[ATR.getDay()], f: dmy(hace(3)), es: 'Reservado', ep: 'Cobrado', $: 30000, p: [{ a: 'SE', q: 3 }] }),
  // 3. Mixto, con kilos, lote de texto y SIN telefono
  base({ id: 9103, h: 'Home', r: 9003, c: 'Prueba Mixto', b: 'Estancias del Pilar', sb: 'La Pionera', l: 'Townhouses 4', o: 'Mixto',
         oD: { SE: { d: 0, oc: 2 } }, $: 70000, p: [{ a: 'PPM', q: 1 }, { a: 'CCo', q: 1.234 }, { a: 'SE', q: 2 }] }),
  // 4 y 5. Combo: mismo telefono, mismo dia, Pilar
  base({ id: 9104, h: 'Pilar', r: 9004, c: 'Prueba Combo', t: '1133332222', b: 'La Escondida', sb: 'La Escondida', l: '12', o: 'Orden de Compra', $: 20000, p: [{ a: 'PMu', q: 2 }] }),
  base({ id: 9105, h: 'Pilar', r: 9005, c: 'Prueba Combo', t: '1133332222', b: 'La Escondida', sb: 'La Escondida', l: '12', o: 'Orden de Compra', $: 11500, p: [{ a: 'PMa', q: 1 }], hr: '12:10' }),
  // 6. Club con apostrofe en el nombre (el onclick del filtro tiene que aguantarlo)
  base({ id: 9106, h: 'Clubes', r: 9006, c: "Prueba O'Club", t: '1122221111', d: "St. Brendan's · Rugby · M15", b: "St. Brendan's", sb: "St. Brendan's", l: '',
         o: 'Orden de Compra', $: 80400, p: [{ a: 'PMu', q: 2 }, { a: 'PJyQ', q: 2 }] }),
  // 7 y 8. Vendedor Red: un pedido del freezer (armado) y uno del proveedor
  base({ id: 9107, h: 'Red', r: 9007, c: 'Cliente Red Uno', retira: 'Vendedor Prueba', b: 'Pilara', sb: 'Pilara', l: '', o: 'Deposito', $: 30000, p: [{ a: 'PPM', q: 2 }] }),
  base({ id: 9108, h: 'Red', r: 9008, c: 'Cliente Red Dos', retira: 'Vendedor Prueba', b: 'Pilara', sb: 'Pilara', l: '', o: 'Orden de Compra', $: 22000, p: [{ a: 'SE', q: 2 }] }),
  // 9. Otra en Champagnat Alto: una zona con DOS paradas, para probar ‹ y › adentro del filtro
  base({ id: 9109, h: 'Home', r: 9009, c: 'Prueba Champa Dos', t: '1177778888', b: 'Estancias del Pilar', sb: 'Champagnat Alto', l: '70', o: 'Orden de Compra', $: 15000, p: [{ a: 'PMu', q: 1 }] })
];
const ARMAR = ['Home|R9001', 'Home|R9003', 'Red|R9007'];
const GUARDAR = { ok: true, items: [{ abbr: 'PPM', qty: 6, rows: [950, 951] }, { abbr: 'SE', qty: 4, rows: [952] }] };
const PRODS = { CCo: { n: 'Carne Colita de Cuadril', u: 'kg' }, SE: { n: 'Sorrentinos Espinaca', u: 'u' } };

const EXTRA = `
  window.__posts=[]; window.__errores=[]; window.__copiado=null;
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  try{ Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:function(t){window.__copiado=String(t);return Promise.resolve();}}}); }catch(e){}
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(x && String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      return Promise.resolve(new Response(JSON.stringify({ok:true,n:(b.rows||[]).length}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    if(url.indexOf('action=entregas')>-1){
      return Promise.resolve(new Response(JSON.stringify({ts:Date.now(), e:${JSON.stringify(ENTREGAS)}, prods:${JSON.stringify(PRODS)}}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    if(url.indexOf('action=pendientesGuardarStock')>-1){
      return Promise.resolve(new Response(JSON.stringify(${JSON.stringify(GUARDAR)}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    return o.apply(this,arguments);};})();
  window.__confirmDevuelve=true;
  window.__confirms=[];
  window.confirm=function(m){ window.__confirms.push(String(m)); return window.__confirmDevuelve; };
  try{ localStorage.removeItem('maleu_ruta'); localStorage.removeItem('maleu_ruta_orden_modo'); }catch(e){}
`;

/* Lo que se pisa adentro de la parada. La fila de filtros se desliza a lo
   ancho a propósito, así que ahí "se sale de su caja" no es un bug. */
const MEDIR = `(function(){
  function R(e){var r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height};}
  function cruza(a,b){var x=Math.min(a.r,b.r)-Math.max(a.l,b.l), y=Math.min(a.b,b.b)-Math.max(a.t,b.t); return (x>1&&y>1)?Math.round(x)+'x'+Math.round(y):'';}
  var out=[], pares=0, chicos=[];
  ['rutaHeader','rutaBody','rutaActions'].forEach(function(id){
    var z=document.getElementById(id); if(!z||!z.offsetParent) return;
    var hijos=[].slice.call(z.querySelectorAll('*')).filter(function(e){
      if(!e.offsetParent) return false;
      var cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.opacity==='0') return false;
      if(/^(BUTTON|INPUT|A)$/.test(e.tagName)) return true;
      return [].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim();});
    });
    for(var i=0;i<hijos.length;i++)for(var j=i+1;j<hijos.length;j++){
      if(hijos[i].contains(hijos[j])||hijos[j].contains(hijos[i])) continue;
      pares++; var c=cruza(R(hijos[i]),R(hijos[j]));
      if(c) out.push(id+': '+hijos[i].textContent.trim().slice(0,20)+' / '+hijos[j].textContent.trim().slice(0,20)+' '+c);
    }
    var zr=R(z);
    hijos.forEach(function(h){var r=R(h); if(r.r>zr.r+1||r.l<zr.l-1) out.push(id+': '+h.textContent.trim().slice(0,20)+' se sale '+Math.round(r.r-zr.r)+'px');});
  });
  [].forEach.call(document.querySelectorAll('#rutaView button, #rutaView a'),function(b){
    if(!b.offsetParent) return; var r=R(b); if(r.h>0 && r.h<40) chicos.push((b.textContent||b.getAttribute('aria-label')||'').trim().slice(0,22)+' '+Math.round(r.w)+'x'+Math.round(r.h));
  });
  return {cruces:out, pares:pares, chicos:chicos};})()`;

const cuerpo = `(document.getElementById('rutaBody').innerText||'')`;
const barra = `(document.getElementById('rutaHeader').innerText||'').replace(/\\s+/g,' ')`;
async function irA(cli, texto) {
  for (let i = 0; i < 12; i++) {
    if (await evaluar(cli, cuerpo + '.indexOf(' + JSON.stringify(texto) + ')>-1')) return true;
    await evaluar(cli, 'rutaNext()'); await pausa(150);
  }
  return false;
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  const ALTO = ANCHO < 500 ? 844 : 900;
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== RUTA · la parada · ' + ANCHO + 'px ===');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arranco'); process.exit(1); }
  await evaluar(cli, 'go("ruta")');
  /* `entregas` vive en el IIFE de la sub-app: desde aca se lee la COPIA que el
     build publica en window, que no se actualiza. Las funciones si ven lo de
     adentro, asi que se pregunta por getPendientes(). */
  if (!await esperar(cli, '(function(){try{return getPendientes().length===' + ENTREGAS.length + '}catch(e){return false}})()', 60000)) {
    console.log('no llegaron las entregas stubbeadas'); process.exit(1);
  }
  await evaluar(cli, 'window.__confirmDevuelve=true');
  for (const k of ARMAR) await evaluar(cli, 'confirmarArmado(' + JSON.stringify(k) + ')');
  await esperar(cli, '(function(){try{return getSorted().some(function(e){return e._depAgg})}catch(e){return false}})()', 30000);
  await evaluar(cli, 'switchTab("ruta")');
  await pausa(800);
  const N = await evaluar(cli, 'getSorted().length');
  // 6 clientes (el combo cuenta una) + 1 vendedor Red + el deposito = 8 paradas
  chk('8 paradas: 6 clientes (el combo es una), 1 vendedor Red y el depósito', N === 8, N);

  // ── La barra de la parada ──
  let t = await evaluar(cli, barra);
  chk('arriba dice "Parada 1 de 8"', /Parada 1 de 8/.test(t), t);
  chk('y cuál sigue', /Sigue: /.test(t), t);
  chk('la barra NO muestra una clave interna tipo #red-...', !/#red-|dep-stock/.test(await evaluar(cli, `document.getElementById('rutaView').innerText`)));
  chk('ni un link wa.me en toda la sub-tab', await evaluar(cli, `!document.querySelector('#rutaView a[href*="wa.me"], #rutaView a[href*="whatsapp"]')`));
  chk('el contador vacío de COBROS no se dibuja como una rayita', await evaluar(cli, `(function(){var c=document.getElementById('tabCobrosCount');return !c||c.textContent!==''||getComputedStyle(c).display==='none';})()`));

  // ── Parada: de tu freezer, en efectivo ──
  chk('llega a la parada de Prueba Freezer', await irA(cli, 'Prueba Freezer'));
  let b = await evaluar(cli, cuerpo);
  chk('dice el lote en grande', await evaluar(cli, `(function(){var l=document.querySelector('.rtc-lote b');return !!l&&l.textContent==='275'&&parseFloat(getComputedStyle(l).fontSize)>=40;})()`));
  chk('arriba el sub-barrio y el canal con el N°', /GOLF/.test(b) && /Home #9101/.test(b), b.slice(0, 120));
  chk('"Llevás" dice de dónde sale: la bolsa del freezer', /De tu freezer/.test(b) && !/Comprado al proveedor/.test(b), b);
  chk('cuenta las unidades', /3 unidades/.test(b), b);
  chk('el cobro: falta cobrar, paga en efectivo, $45.000', /Falta cobrar/.test(b) && /Paga en efectivo/.test(b) && /\$45\.000/.test(b), b);
  chk('el teléfono va como texto', /1156381102/.test(b));
  chk('"Llamar" es un tel: con +549', await evaluar(cli, `(function(){var a=[].find.call(document.querySelectorAll('#rutaBody a.rtc-mini'),function(x){return /Llamar/.test(x.textContent)});return a?a.getAttribute('href'):'';})()`) === 'tel:+5491156381102');
  await evaluar(cli, `[].find.call(document.querySelectorAll('#rutaBody button.rtc-mini'),function(x){return /Copiar/.test(x.textContent)}).click()`);
  await pausa(200);
  chk('"Copiar" copia el número', await evaluar(cli, 'window.__copiado') === '1156381102', await evaluar(cli, 'window.__copiado'));
  const cta = await evaluar(cli, `[].map.call(document.querySelectorAll('#rutaActions .rtc-cta'),function(x){return x.innerText.replace(/\\s+/g,' ').trim();})`);
  chk('abajo: Cobrar $45.000 y Entregado', cta.length === 2 && /Cobrar \$45\.000/i.test(cta[0]) && /Entregado/.test(cta[1]), cta);

  // La barra fija: sin scrollear, adentro de la pantalla
  await evaluar(cli, 'window.scrollTo(0,0)'); await pausa(200);
  const sb = ANCHO < 500 ? 0 : 22;
  let r = await evaluar(cli, `(function(){var a=document.getElementById('rutaActions').getBoundingClientRect();return {t:Math.round(a.top),b:Math.round(a.bottom),H:innerHeight};})()`);
  chk('la barra de Cobrar/Entregado se ve SIN scrollear' + (sb ? ' (y arriba del statusbar)' : ''), r.b <= r.H - sb + 1 && r.t > 0, r);
  chk('lo que se toca en la barra no queda tapado por nada', await evaluar(cli, `(function(){return [].every.call(document.querySelectorAll('#rutaActions .rtc-cta'),function(x){var q=x.getBoundingClientRect();var el=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return el&&x.contains(el);});})()`));
  await evaluar(cli, 'window.scrollTo(0,document.documentElement.scrollHeight)'); await pausa(300);
  r = await evaluar(cli, `(function(){var m=document.querySelector('#rutaBody .rtc-mas').getBoundingClientRect(),a=document.getElementById('rutaActions').getBoundingClientRect();return {mas:Math.round(m.bottom),barra:Math.round(a.top)};})()`);
  chk('al final del scroll, "Reservar / Cancelar" no queda debajo de la barra', r.mas <= r.barra + 1, r);
  await evaluar(cli, 'window.scrollTo(0,0)');

  // Entregado: el confirm dice que queda para cobrar, y el POST sale con su fila
  await evaluar(cli, `document.querySelector('#rutaActions .rtc-cta.entregar').click()`);
  await pausa(200);
  const conf = await evaluar(cli, `(document.getElementById('confirmOverlay').innerText||'').replace(/\\s+/g,' ')`);
  chk('el confirm pregunta a quién y avisa que queda en COBROS', /¿Entregado a Prueba Freezer\?/.test(conf) && /COBROS/.test(conf) && !/Sheets/.test(conf), conf);
  await evaluar(cli, `[].find.call(document.querySelectorAll('#confirmOverlay button'),function(x){return /Sí, entregado/.test(x.textContent)}).click()`);
  await pausa(900);
  const pE = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='marcarEntregado'})`);
  chk('sale marcarEntregado con hoja, N° y fila', pE.length === 1 && pE[0].hoja === 'Home' && String(pE[0].id) === '9101' && pE[0].row === 9001, pE);
  chk('y la parada sale de la ruta: quedan 7', await evaluar(cli, 'getSorted().length') === 7);

  // ── Parada: atrasada, ya pagada, reservada ──
  chk('llega a la parada atrasada', await irA(cli, 'Prueba Atrasado'));
  b = await evaluar(cli, cuerpo);
  const diaAtr = DIAS[ATR.getDay()].toLowerCase() + ' ' + ATR.getDate() + '/' + (ATR.getMonth() + 1);
  chk('avisa ATRASADO y dice para qué día era (' + diaAtr + ')', /Atrasado:/.test(b) && b.indexOf('era para el ' + diaAtr) > -1, b.slice(0, 160));
  chk('ya pagó: no ofrece Cobrar, solo Entregado', /Ya pagó/.test(b) && await evaluar(cli, `document.querySelectorAll('#rutaActions .rtc-cta').length===1 && !document.querySelector('#rutaActions .rtc-cta.cobrar')`));
  chk('dice que está reservada y ofrece quitar la reserva', /Reservado/.test(b) && /Quitar la reserva/.test(b), b);
  chk('del proveedor', /Comprado al proveedor/.test(b) && !/De tu freezer/.test(b));

  // ── Parada: mixto, kilos, sin telefono ──
  chk('llega a la parada mixta', await irA(cli, 'Prueba Mixto'));
  b = await evaluar(cli, cuerpo);
  chk('separa lo del freezer de lo del proveedor', /De tu freezer/.test(b) && /Comprado al proveedor/.test(b), b);
  chk('los kilos van con su unidad y el nombre completo', /Carne Colita de Cuadril/.test(b) && /1,234 kg/.test(b), b);
  chk('las cuentas no suman kilos con unidades: "3 unidades · 1,234 kg"', /3 unidades · 1,234 kg/.test(b), b);
  chk('un lote de texto no va en letra de 46px', await evaluar(cli, `!document.querySelector('#rutaBody .rtc-lote') && /Townhouses 4/.test(document.querySelector('#rutaBody .rtc-titulo').textContent)`));
  chk('sin teléfono lo dice, y no dibuja Copiar ni Llamar', /Sin teléfono cargado/.test(b) && await evaluar(cli, `!document.querySelector('#rutaBody .rtc-tel')`));

  // ── Parada: combo ──
  chk('llega al combo', await irA(cli, 'Prueba Combo'));
  b = await evaluar(cli, cuerpo);
  chk('el canal nombra los dos pedidos', /Pilar #9104 \+ #9105/.test(b), b.slice(0, 120));
  chk('el cobro desglosa los dos pedidos y suma $31.500', /2 pedidos del mismo cliente/.test(b) && /\$31\.500/.test(b) && /\$20\.000/.test(b) && /\$11\.500/.test(b), b);
  await evaluar(cli, `document.querySelector('#rutaActions .rtc-cta.entregar').click()`); await pausa(200);
  const confC = await evaluar(cli, `(document.getElementById('confirmOverlay').innerText||'').replace(/\\s+/g,' ')`);
  chk('el confirm del combo nombra los 2 pedidos', /¿Entregaste los 2 pedidos de Prueba Combo\?/.test(confC), confC);
  await evaluar(cli, 'cerrarConfirm()');
  await evaluar(cli, `document.querySelector('#rutaActions .rtc-cta.cobrar').click()`); await pausa(400);
  chk('Cobrar abre el cuadro de cobro', await evaluar(cli, `!document.getElementById('cobroRutaOverlay').classList.contains('hidden')`));
  await evaluar(cli, 'cerrarCobroRuta()'); await pausa(200);

  // ── Tocar el nombre abre la ficha (o dice por qué no) ──
  await evaluar(cli, `window.__toasts=[]; (function(){var t=document.getElementById('toast'); if(t) t.textContent='';})()`);
  await evaluar(cli, `document.querySelector('#rutaBody .rtc-cli').click()`); await pausa(400);
  const fich = await evaluar(cli, `(function(){var d=document.getElementById('ordDrawer');var t=document.getElementById('toast');return {abre:!!(d&&d.classList.contains('open')), toast:t?t.textContent:''};})()`);
  chk('tocar el nombre hace algo: abre la ficha o dice que no tiene ese pedido', fich.abre || /pedido/.test(fich.toast), fich);
  await evaluar(cli, `typeof closeOrdDetail==='function'&&closeOrdDetail()`);

  // ── Parada: club con apostrofe ──
  chk('llega al club', await irA(cli, "Prueba O'Club"));
  b = await evaluar(cli, cuerpo);
  chk("el club va de título y arriba el deporte y la categoría", await evaluar(cli, `document.querySelector('#rutaBody .rtc-titulo').textContent==="St. Brendan's"`) && /RUGBY · M15/.test(b), b.slice(0, 120));
  chk('Clubes va en azul', await evaluar(cli, `!!document.querySelector('#rutaBody .rtc-dest.cl')`));

  // ── Filtros por zona y ‹ › adentro de la zona ──
  const chips = await evaluar(cli, `[].map.call(document.querySelectorAll('#rutaResumen .rtc-chip'),function(x){return x.textContent.replace(/\\s+/g,' ').trim();})`);
  chk('los filtros arrancan en "Todas 7"', /^Todas 7$/.test(chips[0]), chips);
  await evaluar(cli, `[].find.call(document.querySelectorAll('#rutaResumen .rtc-chip'),function(x){return /Brendan/.test(x.textContent)}).click()`); await pausa(300);
  t = await evaluar(cli, barra);
  chk("el filtro con apóstrofe (St. Brendan's) anda", /Parada 1 de 1/.test(t) && (await evaluar(cli, cuerpo)).indexOf("Prueba O'Club") > -1, t);
  /* rutaIndex vive en el IIFE de la sub-app: asignarlo desde aca crea OTRA
     variable en window. setRutaFiltro lo pone en 0 adentro. */
  await evaluar(cli, `setRutaFiltro('Champagnat Alto')`); await pausa(200);
  t = await evaluar(cli, barra);
  chk('filtrando una zona de 2 paradas: "Parada 1 de 2"', /Parada 1 de 2/.test(t), t);
  await evaluar(cli, `document.querySelector('#rutaHeader .rtc-nav').click()`); await pausa(200);
  t = await evaluar(cli, barra);
  chk('‹ desde la primera de la zona va a la última DE LA ZONA (antes volvía a la 1)', /Parada 2 de 2/.test(t), t);
  await evaluar(cli, `setRutaFiltro(null)`); await pausa(200);
  await evaluar(cli, `document.querySelector('#rutaHeader .rtc-nav').click()`); await pausa(200);
  t = await evaluar(cli, barra);
  chk('sin filtro, ‹ desde la primera va a la última', /Parada 7 de 7/.test(t), t);

  // ── Vendedor Red ──
  chk('llega al vendedor Red', await irA(cli, 'Vendedor Prueba'));
  b = await evaluar(cli, cuerpo);
  chk('dice cuántos pedidos lleva la bolsa', /2 pedidos/.test(b), b.slice(0, 120));
  chk('con dos orígenes, cada línea dice freezer o proveedor', /freezer/.test(b) && /proveedor/.test(b) && await evaluar(cli, `document.querySelectorAll('#rutaBody .rtc-origen').length===2`), b);
  const ctaR = await evaluar(cli, `document.querySelector('#rutaActions .rtc-cta').innerText.replace(/\\s+/g,' ').trim()`);
  chk('el botón: "Le di la bolsa a Vendedor" (el nombre de pila)', /Le di la bolsa a Vendedor$/.test(ctaR), ctaR);
  await evaluar(cli, 'window.__posts.length=0');
  await evaluar(cli, `document.querySelector('#rutaActions .rtc-cta').click()`); await pausa(900);
  const pR = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='marcarEntregadoAVendedor'})`);
  chk('sale marcarEntregadoAVendedor con LAS DOS filas y sin día', pR.length === 1 && JSON.stringify((pR[0].rows || []).slice().sort()) === '[9007,9008]' && pR[0].dia === '', pR);

  // ── Deposito ──
  chk('llega al depósito', await irA(cli, 'Guardar en el freezer'));
  b = await evaluar(cli, cuerpo);
  chk('lista lo que hay que guardar, agrupado', /10 unidades/.test(b) && await evaluar(cli, `document.querySelectorAll('#rutaBody .rdep-grupo').length>=1`), b.slice(0, 200));
  chk('el botón dice "Guardado en el freezer"', /Guardado en el freezer/.test(await evaluar(cli, `document.getElementById('rutaActions').innerText`)));

  // ── La lista de paradas ──
  await evaluar(cli, `document.querySelector('#rutaHeader .rtc-stop').click()`); await pausa(300);
  t = await evaluar(cli, barra);
  const filas = await evaluar(cli, `document.querySelectorAll('#rutaBody .rtc-fila').length`);
  chk('tocar "Parada N de M" abre el recorrido con todas las paradas', /Tu recorrido/.test(t) && filas >= 5, { t, filas });
  chk('marca la parada en la que estás', await evaluar(cli, `!!document.querySelector('#rutaBody .rtc-fila.actual')`));
  /* Para esta altura la bolsa del vendedor ya se entrego: queda solo el deposito. */
  const sint = await evaluar(cli, 'getSorted().filter(function(e){return e._redAgg||e._depAgg}).length');
  chk('Red y el depósito no tienen flechas (van al final)', sint >= 1 && await evaluar(cli, `(function(){var f=[].slice.call(document.querySelectorAll('#rutaBody .rtc-fila'));return f.filter(function(x){return !x.querySelector('.rtc-fila-acc')}).length===` + sint + `;})()`), sint);
  chk('ordenar por Zona / Hora del pedido', /Zona/.test(await evaluar(cli, cuerpo)) && /Hora del pedido/.test(await evaluar(cli, cuerpo)));
  await evaluar(cli, `document.querySelectorAll('#rutaBody .rtc-fila-ir')[2].click()`); await pausa(300);
  t = await evaluar(cli, barra);
  chk('tocar la 3ª parada va a la 3ª', /Parada 3 de/.test(t), t);

  // ── Nada se pisa, nada chico, nada desborda ──
  let peor = { cruces: [], chicos: [], pares: 0 };
  for (let i = 0; i < 7; i++) {
    const m = await evaluar(cli, MEDIR);
    peor.pares += m.pares; peor.cruces = peor.cruces.concat(m.cruces); peor.chicos = peor.chicos.concat(m.chicos);
    await evaluar(cli, 'rutaNext()'); await pausa(120);
  }
  chk('nada se pisa en ninguna parada (' + peor.pares + ' pares mirados)', peor.pares > 200 && peor.cruces.length === 0, peor.cruces.slice(0, 6));
  chk('ningún botón por debajo de 40px', peor.chicos.length === 0, [...new Set(peor.chicos)].slice(0, 8));
  chk('la página no se desborda a lo ancho', await evaluar(cli, 'document.documentElement.scrollWidth-document.documentElement.clientWidth') <= 0);
  chk('sin errores de JS', (await evaluar(cli, 'window.__errores.length')) === 0, await evaluar(cli, 'window.__errores'));

  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
