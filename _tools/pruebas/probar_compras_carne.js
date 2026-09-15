/* Abastecimiento → 🥩 CARNE: las compras a los proveedores de carne (15/9/2026).

   node probar_compras_carne.js [390|1440]
   APP=app_viejo_tmp.html node probar_compras_carne.js 390    ← la direccion contraria

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). Sin token.
   Sostiene:
   · la sub-tab existe y entra en la barra sin desbordar;
   · arriba dice lo que se debe de carne, sacado de la MISMA deuda que PAGOS;
   · cada compra dice su estado: debe (con la semana), pagada antes del libro, anulada;
   · el cruce con las piezas pesadas dice el % contra la factura;
   · el formulario trae la lista de precios del proveedor (y la variante "entero"),
     deja tipear kilos con coma sin perder el foco, suma, y ofrece actualizar el
     costo de Productos cuando cambio;
   · con el formulario tocado, el ERP sabe que se esta editando (no repinta encima);
   · el POST lleva lo tipeado y un clientOpId, y al guardar el formulario se cierra;
   · sin precio no manda nada y lo dice;
   · anular manda el id;
   · si el libro no llega, dice que no pudo (no "no hay compras");
   · PAGOS avisa si el servidor no pudo leer las compras, y el detalle dice "cortes";
   · minimo tactil y sin errores de JS. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 500) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const hoyAR = (() => { const o = {}; new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(new Date()).forEach(x => { o[x.type] = x.value; }); return o.day + '/' + o.month + '/' + o.year; })();

const L = (abbr, corte, det, kg, precio) => ({ abbr, corte, det, kg, precio, total: Math.round(kg * precio) });
const lin6 = [L('CLo', 'Carne Lomo', '', 24.3, 28500), L('CCo', 'Carne Colita de Cuadril', '', 17.02, 19000), L('CEn', 'Carne Entraña', '', 13.4, 31000),
  L('CVa', 'Carne Vacío', '', 10.2, 18200), L('CVa', 'Carne Vacío', 'entero', 5, 18500)];
const suma = ls => ls.reduce((a, l) => a + l.total, 0);
const COMPRAS = {
  ok: true, ts: Date.now(), pzError: '',
  compras: [
    { id: 'CC-0006', fecha: '11/09/2026', t: 1, sem: 37, prov: 'Caco', estado: 'Recibida', fuera: false, nota: 'lista nueva', cargo: 'Lucas', cargado: '15/09/2026 12:00',
      lineas: lin6, kg: 69.92, total: suma(lin6), piezas: { n: 49, kg: 71.414, porCorte: { CLo: { n: 14, kg: 25.025 }, CCo: { n: 15, kg: 17.358 }, CEn: { n: 13, kg: 13.768 }, CVa: { n: 7, kg: 15.263 } } } },
    { id: 'CC-0007', fecha: '14/09/2026', t: 2, sem: 38, prov: 'Caco', estado: 'Anulada', fuera: false, nota: '', cargo: 'Tadeo',
      lineas: [L('CLo', 'Carne Lomo', '', 1, 1)], kg: 1, total: 1, piezas: { n: 0, kg: 0, porCorte: {} } },
    { id: 'CC-0005', fecha: '01/09/2026', t: 0, sem: 36, prov: 'Caco', estado: 'Recibida', fuera: true, nota: '', cargo: 'Tadeo',
      lineas: [L('CCo', 'Carne Colita de Cuadril', '', 13.86, 18800)], kg: 13.86, total: 260568, piezas: { n: 0, kg: 0, porCorte: {} } }
  ],
  cortes: [{ abbr: 'CCo', nombre: 'Carne Colita de Cuadril', costo: 18800, prov: 'Caco' }, { abbr: 'CEn', nombre: 'Carne Entraña', costo: 30000, prov: 'Caco' },
    { abbr: 'CLo', nombre: 'Carne Lomo', costo: 28500, prov: 'Caco' }, { abbr: 'CPi', nombre: 'Carne Picaña', costo: 17500, prov: 'Caco' }, { abbr: 'CVa', nombre: 'Carne Vacío', costo: 18200, prov: 'Caco' }],
  provs: ['Caco', 'Grupo Tresnal'],
  precios: { 'Caco|CLo|': { precio: 28500, fecha: '11/09/2026' }, 'Caco|CCo|': { precio: 19000, fecha: '11/09/2026' }, 'Caco|CEn|': { precio: 31000, fecha: '11/09/2026' },
    'Caco|CVa|': { precio: 18200, fecha: '11/09/2026' }, 'Caco|CVa|entero': { precio: 18500, fecha: '11/09/2026' }, 'Grupo Tresnal|CLo|': { precio: 28500, fecha: '20/08/2026' } }
};
COMPRAS.compras.sort((a, b) => b.t - a.t);
const itemsCaco = lin6.map(l => ({ r: 0, prod: 'Carnes — ' + l.corte.replace(/^Carne /, '') + (l.det ? ' ' + l.det : ''), abbr: l.abbr, q: l.kg, costoU: l.precio, costo: l.total, sem: '37', canal: 'Compra de carne', cliente: 'CC-0006 del 11/09', nped: '', cc: 'CC-0006' }));
const BUSQ = (ccError) => ({ ts: Date.now() + 60000, provs: [], clientes: [], total: 0, ocs: [], semActual: 38, anioActual: 2026, stocksProductos: {}, enPoderVend: [], ccError: ccError || '',
  deudas: [{ n: 'Caco', total: 1709470, original: 1709470, pagado: 0, pagosLibres: [], saldoLibreSobrante: 0,
    semanas: [{ sem: '37', original: 1709470, pagado: 0, pendiente: 1709470, pagosImp: [], pagadoFifo: 0, items: itemsCaco }] },
  { n: 'Prov Uno', total: 50000, original: 50000, pagado: 0, pagosLibres: [], saldoLibreSobrante: 0, semanas: [{ sem: '37', original: 50000, pagado: 0, pendiente: 50000, pagosImp: [], pagadoFifo: 0, items: [] }] }],
  cuentas: [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' }, { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital', def: true }] });
const LIGHT = { ts: 1, pedidos: [], canales: [], light: true };

const EXTRA = `
  (function(){
    var fase=(location.search.match(/fase=([a-z])/)||[])[1]||'a';
    window.__fase=fase; window.__gets=[]; window.__posts=[];
    try{ localStorage.removeItem('maleu_busqueda'); localStorage.removeItem('maleu_compras_carne'); localStorage.setItem('maleu_busqueda_tab','proveedores'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')>-1&&post){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){ b={crudo:String(x.body)}; } window.__posts.push(b);
        var r = b.action==='compraCarneGuardar' ? {ok:true,id:b.id||'CC-0008',editada:!!b.id,fuera:false,total:(b.lineas||[]).reduce(function(a,l){return a+Math.round(l.kg*l.precio);},0),kg:1,lineas:(b.lineas||[]).length,costos:(b.costos||[]).map(function(c){return {abbr:c.abbr,antes:1,ahora:c.precio};})}
          : b.action==='compraCarneAnular' ? {ok:true,id:b.id,total:1} : {ok:true};
        return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); },300); });
      }
      if(url.indexOf('script.google.com')>-1){
        var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
        var cuerpo = a==='comprasCarne' ? (fase==='e' ? {ok:false,error:'stub caido'} : ${JSON.stringify(COMPRAS)})
          : a==='busqueda' ? (fase==='p' ? ${JSON.stringify(BUSQ('Service Spreadsheets timed out'))} : ${JSON.stringify(BUSQ(''))})
          : a==='pedidosLight' ? ${JSON.stringify(LIGHT)}
          : a==='admin' ? Object.assign({}, ${JSON.stringify(LIGHT)}, {oc:{lista:[]}, stock:[]})
          : a==='catalogo' ? {proveedores:[],productos:{}}
          : a==='ocLight' ? {ok:true,oc:{lista:[]}} : a==='cobrosPendientes' ? {ok:true,cobros:[]}
          : {ok:false,error:'stub'};
        var txt=JSON.stringify(cuerpo);
        return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); },150); });
      }
      return o.apply(this,arguments); };
  })();
`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async fase => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&fase=' + fase });
    if (!await esperar(cli, `typeof go==='function' && window.__fase===${JSON.stringify(fase)}`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
  };
  const aCarne = async () => {
    await evaluar(cli, `go('busqueda'); 1`);
    await esperar(cli, `typeof abaSwitchTab==='function'`, 30000);
    await evaluar(cli, `abaSwitchTab('carne'); 1`);
  };
  const tipear = async (sel, txt) => {
    await evaluar(cli, `(function(){ var e=document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select && e.select(); return 1; })()`);
    for (const ch of txt) { await cli.enviar('Input.insertText', { text: ch }); await pausa(40); }
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Abastecimiento → CARNE · ' + ANCHO + 'px · ' + APP + ' ==');

    await ir('a');
    await aCarne();
    const pinto = await esperar(cli, `document.querySelectorAll('#abaCcListBox .cc-card').length===3 && !!document.querySelector('#abaCcTop .cc-deuda-prov')`, 30000);
    chk('la sub-tab CARNE dibuja las 3 compras y la deuda (sin esto lo de abajo no mide nada)', pinto);
    if (!pinto) { chk('sin errores de JS', errores.length === 0, errores.slice(0, 3)); throw new Error('no pinto'); }

    /* ── La barra de sub-tabs ── */
    const tabs = await evaluar(cli, `(function(){ var ts=[].slice.call(document.querySelectorAll('#pg-abast .tabs .tab, .tabs .tab')).filter(function(t){return t.getBoundingClientRect().width>0;});
      var bar=ts[0]&&ts[0].parentElement; return { n: ts.length, txt: ts.map(function(t){return t.textContent.trim();}),
        corta: ts.filter(function(t){ return t.scrollWidth>t.clientWidth+1 || t.getBoundingClientRect().height>60; }).map(function(t){return t.textContent+' '+t.scrollWidth+'/'+t.clientWidth+' h'+Math.round(t.getBoundingClientRect().height);}),
        barDesb: bar ? bar.scrollWidth>bar.clientWidth+1 : null, activa: (document.querySelector('.tabs .tab.active')||{}).textContent }; })()`);
    chk('hay 6 sub-tabs y la sexta es 🥩 CARNE', tabs.n === 6 && /CARNE/.test(tabs.txt[5]), tabs.txt);
    chk('ninguna se corta ni se parte en dos renglones', tabs.corta.length === 0 && tabs.barDesb === false, tabs);
    chk('CARNE queda marcada', /CARNE/.test(tabs.activa || ''), tabs.activa);

    /* ── Arriba: lo que se debe ── */
    const top = await evaluar(cli, `(function(){ var t=document.getElementById('abaCcTop'); return { txt:t.textContent.replace(/\\s+/g,' '), provs:[].map.call(t.querySelectorAll('.cc-deuda-prov'),function(x){return x.textContent.replace(/\\s+/g,' ');}),
      pagar: !!t.querySelector('.cc-b-pagar'), nueva: !!t.querySelector('.cc-nueva') }; })()`);
    chk('la deuda de carne: Caco $1.709.470, semana 37 (y no Prov Uno, que no es de carne)', top.provs.length === 1 && /Caco/.test(top.provs[0]) && /1\.709\.470/.test(top.provs[0]) && /semana 37/.test(top.txt) && !/Prov Uno/.test(top.txt), top);
    chk('con el boton para ir a pagar y el de cargar compra', top.pagar && top.nueva, top);

    /* ── Las tarjetas ── */
    const cards = await evaluar(cli, `[].map.call(document.querySelectorAll('#abaCcListBox .cc-card'),function(c){ return { txt:c.textContent.replace(/\\s+/g,' '),
      est:(c.querySelector('.cc-estado')||{}).textContent, filas:c.querySelectorAll('.cc-tabla tbody tr').length, anu:c.classList.contains('cc-anulada'),
      botones:[].map.call(c.querySelectorAll('.cc-acc button'),function(b){return b.textContent;}), cruce:(c.querySelector('.cc-cruce')||{}).textContent||'' }; })`);
    const c6 = cards.find(c => /CC-0006/.test(c.txt)) || {}, c7 = cards.find(c => /CC-0007/.test(c.txt)) || {}, c5 = cards.find(c => /CC-0005/.test(c.txt)) || {};
    chk('la mas nueva que vale primero, y la anulada (aunque sea del 14/9) al final', /CC-0006/.test((cards[0] || {}).txt || '') && /CC-0007/.test((cards[2] || {}).txt || ''), cards.map(c => c.txt.slice(0, 30)));
    chk('la del 11/9: "Vie 11/09 · Caco", $1.709.470, 5 cortes', /Vie 11\/09 · Caco/.test(c6.txt) && /1\.709\.470/.test(c6.txt) && c6.filas === 5, c6);
    chk('dice que se debe, con la semana', /Debés \$1\.709\.470 · semana 37/.test(c6.est || ''), c6.est);
    chk('el cruce con las piezas: 71,414 kg en 49 piezas, +2,1% (balanza)', /71,414 kg/.test(c6.cruce) && /49 piezas/.test(c6.cruce) && /\+2,1%/.test(c6.cruce) && /balanza/.test(c6.cruce), c6.cruce);
    chk('el vacío entero es su propia fila y lo pesado del vacío se muestra una vez', /Vacío entero/.test(c6.txt) && (c6.txt.match(/pesaste 15,263 kg/g) || []).length === 1, c6.txt);
    chk('la anulada lo dice y no tiene botones', /Anulada/.test(c7.est || '') && c7.anu && c7.botones.length === 0, c7);
    chk('la vieja dice que se pagó antes del libro (Egresos)', /Pagada antes de este libro/.test(c5.est || '') && !/piezas pesadas/.test(c5.cruce), c5);

    /* ── El formulario ── */
    await evaluar(cli, `document.querySelector('#abaCcTop .cc-nueva').click(); 1`);
    const abrio = await esperar(cli, `!!document.getElementById('abaCcFormIn')`, 5000);
    chk('+ Cargar compra abre el formulario', abrio);
    let fm = await evaluar(cli, `(function(){ var f=document.getElementById('abaCcFormIn'); return { prov:document.getElementById('abaCcProv').value, fecha:document.getElementById('abaCcFecha').value,
      tipoFecha:document.getElementById('abaCcFecha').type, lins:[].map.call(f.querySelectorAll('.cc-lin'),function(l,i){ return { n:l.querySelector('.cc-lin-n').textContent.trim(), pr:document.getElementById('abaCcPre'+i).value }; }),
      nuevaVisible: !!document.querySelector('#abaCcTop .cc-nueva') }; })()`);
    chk('proveedor Caco y la fecha de hoy, en texto dd/mm/aaaa (nunca type=date)', fm.prov === 'Caco' && fm.fecha === hoyAR && fm.tipoFecha === 'text', fm);
    chk('una linea por corte mas la variante "entero" que Caco ya facturó', fm.lins.length === 6 && fm.lins.some(l => /Vacío\s*entero/.test(l.n)), fm.lins);
    const pr = n => (fm.lins.find(l => l.n.replace(/\s+/g, ' ') === n) || {}).pr;
    chk('los precios vienen de la última compra (Colita 19000, entero 18500) y la Picaña del costo (17500)', pr('Colita de Cuadril') === '19000' && pr('Vacío entero') === '18500' && pr('Picaña') === '17500', fm.lins);
    chk('con el formulario abierto no se ofrece otro', !fm.nuevaVisible);
    chk('abierto y sin tocar NO cuenta como editando (si no, el ERP deja de repintar)', await evaluar(cli, `abaHayEditor()===false`));

    const idx = n => fm.lins.findIndex(l => l.n.replace(/\s+/g, ' ') === n);
    const iLo = idx('Lomo'), iCo = idx('Colita de Cuadril');
    await tipear('#abaCcKg' + iLo, '24,3');
    let st = await evaluar(cli, `({ v:document.getElementById('abaCcKg${iLo}').value, foco:document.activeElement===document.getElementById('abaCcKg${iLo}'),
      sub:document.getElementById('abaCcSub${iLo}').textContent, tot:document.getElementById('abaCcTotal').textContent, btn:document.getElementById('abaCcGuardar').textContent,
      editando: (typeof abaHayEditor==='function') && abaHayEditor(), costos:document.getElementById('abaCcCostos').textContent })`);
    chk('tecla por tecla queda "24,3" y no pierde el foco', st.v === '24,3' && st.foco, st);
    chk('la línea suma: 24,3 kg × $28.500 = $692.550', /24,3 kg × \$28\.500 = \$692\.550/.test(st.sub), st.sub);
    chk('el total y el botón dicen $692.550', /\$692\.550/.test(st.tot) && /692\.550/.test(st.btn), st);
    chk('el ERP sabe que se está editando (no repinta encima)', st.editando === true);
    chk('el Lomo al mismo costo no ofrece cambiar nada', st.costos === '', st.costos);
    await tipear('#abaCcKg' + iCo, '17.02');
    st = await evaluar(cli, `({ costos:document.getElementById('abaCcCostos').textContent.replace(/\\s+/g,' '), marcado:(document.querySelector('#abaCcCostos input[type=checkbox]')||{}).checked })`);
    chk('la Colita a $19.000 ofrece actualizar el costo ($18.800 → $19.000), tildado por ser la más nueva', /Colita de Cuadril: \$18\.800 → \$19\.000/.test(st.costos) && st.marcado === true, st);

    /* sin precio no manda */
    const iPi = idx('Picaña');
    await tipear('#abaCcKg' + iPi, '2');
    await evaluar(cli, `(function(){ var e=document.getElementById('abaCcPre${iPi}'); e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
    await evaluar(cli, `window.__posts=[]; document.getElementById('abaCcGuardar').click(); 1`);
    await pausa(500);
    st = await evaluar(cli, `({ err:document.getElementById('abaCcErr').textContent, posts:window.__posts.length, abierto:!!document.getElementById('abaCcFormIn') })`);
    chk('sin precio no manda nada y dice cuál falta', st.posts === 0 && /Falta el precio por kilo de Picaña/.test(st.err) && st.abierto, st);
    await tipear('#abaCcKg' + iPi, '');
    await evaluar(cli, `(function(){ var e=document.getElementById('abaCcKg${iPi}'); e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);

    /* tamaños, con el formulario abierto */
    const tam = await evaluar(cli, `(function(){ var chicos=[].slice.call(document.querySelectorAll('#carneView input:not([type=checkbox]), #carneView button, #carneView select')).filter(function(e){ var r=e.getBoundingClientRect(); return r.width>0 && r.height<40; })
      .map(function(e){return (e.id||e.className)+' '+Math.round(e.getBoundingClientRect().height);});
      var fuera=[].slice.call(document.querySelectorAll('#carneView *')).filter(function(e){ var r=e.getBoundingClientRect(); return r.width>0 && r.right>window.innerWidth+1; }).map(function(e){return e.id||e.className;}).slice(0,5);
      return { chicos:chicos, fuera:fuera, desb: document.documentElement.scrollWidth>window.innerWidth+1 }; })()`);
    if (ANCHO <= 560) chk('campos y botones miden 40px o más', tam.chicos.length === 0, tam.chicos);
    chk('nada se sale de la pantalla a lo ancho', tam.fuera.length === 0 && !tam.desb, tam);

    await evaluar(cli, `window.__posts=[]; document.getElementById('abaCcGuardar').click(); 1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='compraCarneGuardar';})`, 8000);
    const post = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='compraCarneGuardar';})[0]||null`);
    chk('el POST lleva Caco, la fecha, sólo las líneas con kilos (en número) y un clientOpId', !!post && post.proveedor === 'Caco' && post.fecha === hoyAR && post.id === '' &&
      post.lineas.length === 2 && post.lineas.some(l => l.abbr === 'CLo' && l.kg === 24.3 && l.precio === 28500 && l.det === '') && post.lineas.some(l => l.abbr === 'CCo' && l.kg === 17.02 && l.precio === 19000) &&
      /^cc_/.test(post.clientOpId || ''), post);
    chk('y el costo a actualizar: sólo la Colita', !!post && JSON.stringify(post.costos) === JSON.stringify([{ abbr: 'CCo', precio: 19000 }]), post && post.costos);
    const cerro = await esperar(cli, `!document.getElementById('abaCcFormIn') && !abaHayEditor()`, 8000);
    chk('al guardar el formulario se cierra y el ERP deja de estar "editando"', cerro);
    chk('y vuelve a pedir el libro y la deuda', await esperar(cli, `window.__gets.filter(function(a){return a==='comprasCarne';}).length>=2 && window.__gets.indexOf('busqueda')>=0`, 8000), await evaluar(cli, `window.__gets.slice(-6)`));

    /* ── Corregir trae la compra ── */
    await esperar(cli, `document.querySelectorAll('#abaCcListBox .cc-card').length===3`, 8000);
    await evaluar(cli, `[].slice.call(document.querySelectorAll('#abaCcListBox .cc-card')).filter(function(c){return /CC-0006/.test(c.textContent);})[0].querySelector('.cc-acc button').click(); 1`);
    await esperar(cli, `!!document.getElementById('abaCcFormIn')`, 5000);
    fm = await evaluar(cli, `(function(){ var f=document.getElementById('abaCcFormIn'); return { tit:f.querySelector('.pago-form-title').textContent, fecha:document.getElementById('abaCcFecha').value,
      kgs:[].map.call(f.querySelectorAll('.cc-lin'),function(l,i){ return l.querySelector('.cc-lin-n').textContent.replace(/\\s+/g,' ').trim()+'='+document.getElementById('abaCcKg'+i).value; }) }; })()`);
    chk('Corregir abre la CC-0006 con su fecha y sus kilos', /CC-0006/.test(fm.tit) && fm.fecha === '11/09/2026' && fm.kgs.indexOf('Entraña=13,4') >= 0 && fm.kgs.indexOf('Vacío entero=5') >= 0, fm);
    await evaluar(cli, `window.confirm=function(){return true;}; abaCcCerrar(); 1`);

    /* ── Anular ── */
    await evaluar(cli, `window.__posts=[]; window.confirm=function(){return true;}; [].slice.call(document.querySelectorAll('#abaCcListBox .cc-card')).filter(function(c){return /CC-0006/.test(c.textContent);})[0].querySelector('.cc-b-x').click(); 1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='compraCarneAnular';})`, 8000);
    const pa = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='compraCarneAnular';})[0]||null`);
    chk('Anular manda el id de la compra', !!pa && pa.id === 'CC-0006', pa);

    /* ── PAGOS: el detalle de una compra de carne ── */
    await evaluar(cli, `abaSwitchTab('pagos'); 1`);
    await esperar(cli, `!!document.querySelector('#pagosList .deuda-card')`, 10000);
    const pg = await evaluar(cli, `(function(){ var c=[].slice.call(document.querySelectorAll('#pagosList .deuda-card')).filter(function(x){return /Caco/.test(x.textContent);})[0]; return { hay:!!c, det: c ? (c.querySelector('.sem-items-acc summary')||{}).textContent : '' }; })()`);
    chk('en PAGOS Caco tiene su semana y el detalle dice "5 cortes" (no "OCs")', pg.hay && /Ver detalle \(5 cortes\)/.test(pg.det || ''), pg);
    chk('sin error del servidor no hay aviso de carne', await evaluar(cli, `!/compras de carne/.test(document.getElementById('pagosList').textContent)`));

    chk('sin errores de JS (fase a)', errores.length === 0, errores.slice(0, 3));

    /* ── Si el servidor no pudo leer las compras ── */
    await ir('p');
    await evaluar(cli, `go('busqueda'); 1`);
    await esperar(cli, `typeof abaSwitchTab==='function'`, 30000);
    await evaluar(cli, `abaSwitchTab('pagos'); 1`);
    await esperar(cli, `!!document.querySelector('#pagosList .deuda-card')`, 10000);
    chk('PAGOS avisa que la deuda de la carne no está en el total', await evaluar(cli, `/No se pudieron leer las compras de carne/.test(document.getElementById('pagosList').textContent)`));
    await evaluar(cli, `abaSwitchTab('carne'); 1`);
    await esperar(cli, `document.querySelectorAll('#abaCcListBox .cc-card').length===3`, 10000);
    const tp = await evaluar(cli, `({ top:document.getElementById('abaCcTop').textContent, est:(document.querySelector('#abaCcListBox .cc-card .cc-estado')||{}).textContent })`);
    chk('y CARNE no dice "al día": dice que no se pudo calcular', /No se pudo calcular/.test(tp.top) && !/Al día/.test(tp.top), tp);

    /* ── Si el libro no llega ── */
    await ir('e');
    await aCarne();
    await esperar(cli, `/No pude traer las compras de carne/.test((document.getElementById('abaCcTop')||{}).textContent||'')`, 15000);
    const fe = await evaluar(cli, `({ top:document.getElementById('abaCcTop').textContent, lista:document.getElementById('abaCcListBox').textContent, boton:!!document.querySelector('#abaCcTop .aba-reintentar') })`);
    chk('si el libro no llega dice que no pudo, con Reintentar, y no "no hay compras"', /No pude traer las compras de carne/.test(fe.top) && fe.boton && !/Todavía no hay/.test(fe.lista), fe);

    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
  } catch (e) {
    console.log('  REVENTO: ' + (e && e.message || e)); mal++;
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  salir(mal ? 1 : 0);
})();
