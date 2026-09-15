/* Abastecimiento → + NUEVO → proveedor de carne: la factura de la carne (15/9/2026).

   node probar_compras_carne.js [390|1440]
   APP=app_viejo_tmp.html node probar_compras_carne.js 390    ← la direccion contraria

   A la mañana del 15/9 fue una sub-tab propia (🥩 CARNE); a la tarde se metio adentro
   de + NUEVO, que es donde ya se elegia a Caco y se veia cuanta carne falta.

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). Sin token.
   Sostiene:
   · vuelven a ser 5 sub-tabs, sin achicar la letra, y quien tenia guardada CARNE cae
     en + NUEVO;
   · la factura aparece SOLO con un proveedor de carne elegido: arriba el boton de cargar
     (sin la deuda ni "Pagar en PAGOS": se paga en PAGOS); abajo de los cortes, las facturas;
   · cada compra dice su estado: debe (con la semana), pagada antes del libro, anulada;
   · el cruce con las piezas pesadas dice el % contra la factura;
   · el formulario trae el proveedor elegido en + NUEVO; para el proveedor del corte el
     precio sugerido es el costo de Productos (la picaña a 18.000 aunque la ultima
     factura diga 17.500), y para otro proveedor su ultima factura;
   · deja tipear kilos con coma sin perder el foco, suma, y ofrece actualizar el costo
     cuando el precio cambia;
   · con el formulario tocado el ERP sabe que se esta editando; cambiar de proveedor
     pregunta antes de descartarlo (y si no, vuelve al proveedor de antes);
   · el POST lleva lo tipeado y un clientOpId; al guardar se cierra y el aviso dice
     cuantos pedidos se corrigieron;
   · sin precio no manda nada y lo dice; anular manda el id;
   · la lista de precios: "Cambiar" manda compraCarneCosto, y un dato que llega mientras
     se tipea no borra lo tipeado;
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
      lineas: [L('CCo', 'Carne Colita de Cuadril', '', 13.86, 18800), L('CPi', 'Carne Picaña', '', 9.8, 17500)], kg: 23.66, total: 432068, piezas: { n: 0, kg: 0, porCorte: {} } }
  ],
  /* Los costos de hoy: la factura del 11/9 ya los movio, y la picaña se cambio a mano. */
  cortes: [{ abbr: 'CCo', nombre: 'Carne Colita de Cuadril', costo: 19000, prov: 'Caco' }, { abbr: 'CEn', nombre: 'Carne Entraña', costo: 31000, prov: 'Caco' },
    { abbr: 'CLo', nombre: 'Carne Lomo', costo: 28500, prov: 'Caco' }, { abbr: 'CPi', nombre: 'Carne Picaña', costo: 18000, prov: 'Caco' }, { abbr: 'CVa', nombre: 'Carne Vacío', costo: 18200, prov: 'Caco' }],
  provs: ['Caco', 'Grupo Tresnal'],
  precios: { 'Caco|CLo|': { precio: 28500, fecha: '11/09/2026' }, 'Caco|CCo|': { precio: 19000, fecha: '11/09/2026' }, 'Caco|CEn|': { precio: 31000, fecha: '11/09/2026' },
    'Caco|CVa|': { precio: 18200, fecha: '11/09/2026' }, 'Caco|CVa|entero': { precio: 18500, fecha: '11/09/2026' }, 'Caco|CPi|': { precio: 17500, fecha: '01/09/2026' },
    'Grupo Tresnal|CLo|': { precio: 28000, fecha: '20/08/2026' } }
};
COMPRAS.compras.sort((a, b) => b.t - a.t);
const corte = (a, n, c) => ({ a, n: 'Carnes — ' + n, cat: 'Carnes', c, s: 2, u: 'kg', dem: 10, wk: [9, 10, 11], dep: 'ustariz', pd: { ustariz: 2, moresco: 0 } });
const CAT = {
  ts: 1, proveedores: ['Prov Uno', 'Caco'],
  deps: [{ id: 'ustariz', nombre: 'Depósito Ustariz', dueno: 'Tadeo' }, { id: 'moresco', nombre: 'Depósito Moresco', dueno: 'Lucas' }],
  productos: {
    'Prov Uno': [{ a: 'PPM', n: 'Pack Pizzas — Muzzarella', cat: 'Pack Pizzas', c: 9000, s: 0, u: 'u', dem: 10, wk: [9, 10, 11], dep: 'ustariz', pd: { ustariz: 0, moresco: 0 } }],
    'Caco': [corte('CCo', 'Colita de Cuadril', 19000), corte('CEn', 'Entraña', 31000), corte('CLo', 'Lomo', 28500), corte('CPi', 'Picaña', 18000), corte('CVa', 'Vacío', 18200)]
  }
};
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
    try{ localStorage.removeItem('maleu_busqueda'); localStorage.removeItem('maleu_compras_carne'); localStorage.setItem('maleu_busqueda_tab', fase==='p' ? 'carne' : 'proveedores'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')>-1&&post){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){ b={crudo:String(x.body)}; } window.__posts.push(b);
        var r = b.action==='compraCarneGuardar' ? {ok:true,id:b.id||'CC-0008',editada:!!b.id,fuera:false,total:(b.lineas||[]).reduce(function(a,l){return a+Math.round(l.kg*l.precio);},0),kg:1,lineas:(b.lineas||[]).length,costos:(b.costos||[]).map(function(c){return {abbr:c.abbr,antes:1,ahora:c.precio};}),
                costeo:{piezas:35,pedidos:[{ref:'Home #934',antes:17747.2,ahora:17936},{ref:'Pilar #60',antes:167824,ahora:169120}],error:''}}
          : b.action==='compraCarneAnular' ? {ok:true,id:b.id,total:1}
          : b.action==='compraCarneCosto' ? {ok:true,abbr:b.abbr,antes:18000,ahora:b.precio,cambio:true} : {ok:true};
        return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); },300); });
      }
      if(url.indexOf('script.google.com')>-1){
        var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
        var cuerpo = a==='comprasCarne' ? (fase==='e' ? {ok:false,error:'stub caido'} : ${JSON.stringify(COMPRAS)})
          : a==='busqueda' ? (fase==='p' ? ${JSON.stringify(BUSQ('Service Spreadsheets timed out'))} : ${JSON.stringify(BUSQ(''))})
          : a==='pedidosLight' ? ${JSON.stringify(LIGHT)}
          : a==='admin' ? Object.assign({}, ${JSON.stringify(LIGHT)}, {oc:{lista:[]}, stock:[]})
          : a==='catalogo' ? ${JSON.stringify(CAT)}
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
  const elegirProv = async prov => evaluar(cli, `(function(){ var s=document.getElementById('npProv'); s.value=${JSON.stringify(prov)}; s.dispatchEvent(new Event('change',{bubbles:true})); return s.value; })()`);
  const aNuevo = async () => {
    await evaluar(cli, `go('busqueda'); 1`);
    await esperar(cli, `typeof abaSwitchTab==='function'`, 30000);
    await evaluar(cli, `abaSwitchTab('nuevo'); 1`);
    await esperar(cli, `[].some.call(document.querySelectorAll('#npProv option'),function(o){return o.value==='Caco';})`, 15000);
  };
  const oculto = id => `(function(){ var e=document.getElementById(${JSON.stringify(id)}); return !e || e.classList.contains('hidden') || e.getBoundingClientRect().height===0; })()`;
  const tipear = async (sel, txt) => {
    await evaluar(cli, `(function(){ var e=document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select && e.select(); return 1; })()`);
    for (const ch of txt) { await cli.enviar('Input.insertText', { text: ch }); await pausa(40); }
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Abastecimiento → + NUEVO → factura de la carne · ' + ANCHO + 'px · ' + APP + ' ==');

    await ir('a');
    await aNuevo();

    /* ── La barra de sub-tabs ── */
    const tabs = await evaluar(cli, `(function(){ var ts=[].slice.call(document.querySelectorAll('#pg-abast .tabs .tab, .tabs .tab')).filter(function(t){return t.getBoundingClientRect().width>0;});
      var bar=ts[0]&&ts[0].parentElement; return { n: ts.length, txt: ts.map(function(t){return t.textContent.trim();}),
        letra: ts[0] ? parseFloat(getComputedStyle(ts[0]).fontSize) : 0,
        corta: ts.filter(function(t){ return t.scrollWidth>t.clientWidth+1 || t.getBoundingClientRect().height>60; }).map(function(t){return t.textContent+' '+t.scrollWidth+'/'+t.clientWidth+' h'+Math.round(t.getBoundingClientRect().height);}),
        barDesb: bar ? bar.scrollWidth>bar.clientWidth+1 : null, activa: (document.querySelector('.tabs .tab.active')||{}).textContent }; })()`);
    chk('vuelven a ser 5 sub-tabs, ninguna es CARNE', tabs.n === 5 && !tabs.txt.some(t => /CARNE/.test(t)), tabs.txt);
    chk('sin achicar la letra (el 11,5 px era por la sexta)', tabs.letra >= 12, tabs.letra);
    chk('ninguna se corta ni se parte en dos renglones', tabs.corta.length === 0 && tabs.barDesb === false, tabs);

    /* ── Solo con un proveedor de carne ── */
    chk('sin proveedor elegido no hay factura de carne', await evaluar(cli, oculto('abaCcArriba') + ' && ' + oculto('abaCcAbajo')));
    await elegirProv('Prov Uno');
    await esperar(cli, `!!document.querySelector('#npProductsList .np-prod-card')`, 5000);
    chk('con un proveedor que no es de carne tampoco', await evaluar(cli, oculto('abaCcArriba') + ' && ' + oculto('abaCcAbajo')));
    await elegirProv('Caco');
    const pinto = await esperar(cli, `document.querySelectorAll('#abaCcListBox .cc-card').length===3 && !!document.querySelector('#abaCcTop .cc-nueva')`, 30000);
    chk('eligiendo a Caco aparecen las 3 facturas y el botón de cargar (sin esto lo de abajo no mide nada)', pinto);
    if (!pinto) { chk('sin errores de JS', errores.length === 0, errores.slice(0, 3)); throw new Error('no pinto'); }
    const orden = await evaluar(cli, `(function(){ var y=function(id){ var e=document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().top + window.scrollY) : -1; };
      return { arriba:y('abaCcArriba'), cortes:y('npProductsList'), abajo:y('abaCcAbajo'), nota:/factura se carga acá arriba/.test(document.getElementById('npProductsList').textContent) }; })()`);
    chk('el botón arriba de los cortes, las facturas abajo', orden.arriba >= 0 && orden.arriba < orden.cortes && orden.cortes < orden.abajo, orden);
    chk('el aviso de los cortes dice que la factura se carga ahí arriba', orden.nota, orden);

    /* ── Arriba: solo cargar. La deuda se ve en cada factura y se paga en PAGOS ── */
    const top = await evaluar(cli, `(function(){ var t=document.getElementById('abaCcTop'); return { txt:t.textContent.replace(/\s+/g,' '),
      pagar: /Pagar en PAGOS/.test(t.textContent), nueva: (t.querySelector('.cc-nueva')||{}).textContent||'' }; })()`);
    chk('arriba solo el botón de cargar la factura: sin la deuda ni "Pagar en PAGOS" (no se paga desde acá)', /Cargar la factura de la carne/.test(top.nueva) && !top.pagar && !/se le debe|1\.709\.470/.test(top.txt), top);
    chk('en + NUEVO no hay ningún botón que pague', await evaluar(cli, `!/Pagar/.test(document.getElementById('abaNuevoView').textContent)`));

    /* ── Las tarjetas ── */
    const cards = await evaluar(cli, `[].map.call(document.querySelectorAll('#abaCcListBox .cc-card'),function(c){ return { txt:c.textContent.replace(/\\s+/g,' '),
      est:(c.querySelector('.cc-estado')||{}).textContent, filas:c.querySelectorAll('.cc-tabla tbody tr').length, anu:c.classList.contains('cc-anulada'),
      botones:[].map.call(c.querySelectorAll('.cc-acc button'),function(b){return b.textContent;}), cruce:(c.querySelector('.cc-cruce')||{}).textContent||'' }; })`);
    const c6 = cards.find(c => /CC-0006/.test(c.txt)) || {}, c7 = cards.find(c => /CC-0007/.test(c.txt)) || {}, c5 = cards.find(c => /CC-0005/.test(c.txt)) || {};
    chk('la más nueva que vale primero, y la anulada (aunque sea del 14/9) al final', /CC-0006/.test((cards[0] || {}).txt || '') && /CC-0007/.test((cards[2] || {}).txt || ''), cards.map(c => c.txt.slice(0, 30)));
    chk('la del 11/9: "Vie 11/09 · Caco", $1.709.470, 5 cortes', /Vie 11\/09 · Caco/.test(c6.txt) && /1\.709\.470/.test(c6.txt) && c6.filas === 5, c6);
    chk('dice que se debe, con la semana', /Debés \$1\.709\.470 · semana 37/.test(c6.est || ''), c6.est);
    chk('el cruce con las piezas: 71,414 kg en 49 piezas, +2,1% (balanza)', /71,414 kg/.test(c6.cruce) && /49 piezas/.test(c6.cruce) && /\+2,1%/.test(c6.cruce) && /balanza/.test(c6.cruce), c6.cruce);
    chk('el vacío entero es su propia fila y lo pesado del vacío se muestra una vez', /Vacío entero/.test(c6.txt) && (c6.txt.match(/pesaste 15,263 kg/g) || []).length === 1, c6.txt);
    chk('la anulada lo dice y no tiene botones', /Anulada/.test(c7.est || '') && c7.anu && c7.botones.length === 0, c7);
    chk('la vieja dice que se pagó antes del libro (Egresos)', /Pagada antes de este libro/.test(c5.est || '') && !/piezas pesadas/.test(c5.cruce), c5);

    /* ── La lista de precios ── */
    const lp = await evaluar(cli, `(function(){ var d=document.querySelector('#abaCcListBox .cc-precios'); if(!d) return null; d.open=true;
      return [].map.call(d.querySelectorAll('.cc-pr-fila'),function(f){ return f.textContent.replace(/\\s+/g,' ').trim(); }); })()`);
    const fPi = (lp || []).find(t => /^Picaña/.test(t)) || '';
    chk('la lista de precios dice el costo de hoy y la última factura: Picaña $18.000/kg, última $17.500 (Caco, 01/09)', /\$18\.000\/kg/.test(fPi) && /última factura \$17\.500 \(Caco, 01\/09\)/.test(fPi), lp);
    chk('y la variante entero con su precio de la última factura', (lp || []).some(t => /Vacío entero/.test(t) && /\$18\.500\/kg/.test(t)), lp);

    /* ── El formulario ── */
    await evaluar(cli, `document.querySelector('#abaCcTop .cc-nueva').click(); 1`);
    const abrio = await esperar(cli, `!!document.getElementById('abaCcFormIn')`, 5000);
    chk('+ Cargar la factura abre el formulario', abrio);
    const leerForm = `(function(){ var f=document.getElementById('abaCcFormIn'); return { prov:document.getElementById('abaCcProv').value, fecha:document.getElementById('abaCcFecha').value,
      tipoFecha:document.getElementById('abaCcFecha').type, lins:[].map.call(f.querySelectorAll('.cc-lin'),function(l,i){ return { n:l.querySelector('.cc-lin-n').textContent.replace(/\\s+/g,' ').trim(), pr:document.getElementById('abaCcPre'+i).value }; }),
      nuevaVisible: !!document.querySelector('#abaCcTop .cc-nueva') }; })()`;
    let fm = await evaluar(cli, leerForm);
    chk('proveedor Caco (el elegido en + NUEVO) y la fecha de hoy, en texto dd/mm/aaaa (nunca type=date)', fm.prov === 'Caco' && fm.fecha === hoyAR && fm.tipoFecha === 'text', fm);
    chk('una línea por corte más la variante "entero" que Caco ya facturó', fm.lins.length === 6 && fm.lins.some(l => /Vacío entero/.test(l.n)), fm.lins);
    let pr = n => (fm.lins.find(l => l.n === n) || {}).pr;
    chk('los precios: Colita 19000, entero 18500 (su última factura)', pr('Colita de Cuadril') === '19000' && pr('Vacío entero') === '18500', fm.lins);
    chk('la Picaña sugiere el costo de hoy (18000), no los 17500 de su última factura', pr('Picaña') === '18000', fm.lins);
    chk('con el formulario abierto no se ofrece otro', !fm.nuevaVisible);
    chk('abierto y sin tocar NO cuenta como editando (si no, el ERP deja de repintar)', await evaluar(cli, `abaHayEditor()===false`));
    await evaluar(cli, `(function(){ var s=document.getElementById('abaCcProv'); s.value='Grupo Tresnal'; s.dispatchEvent(new Event('change',{bubbles:true})); return 1; })()`);
    await esperar(cli, `document.getElementById('abaCcProv').value==='Grupo Tresnal'`, 3000);
    fm = await evaluar(cli, leerForm);
    chk('para otro proveedor el Lomo sugiere SU última factura (28000), no el costo de Caco', pr('Lomo') === '28000', fm.lins);
    await evaluar(cli, `(function(){ var s=document.getElementById('abaCcProv'); s.value='Caco'; s.dispatchEvent(new Event('change',{bubbles:true})); return 1; })()`);
    await esperar(cli, `document.getElementById('abaCcProv').value==='Caco'`, 3000);
    fm = await evaluar(cli, leerForm);

    const idx = n => fm.lins.findIndex(l => l.n === n);
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
    await tipear('#abaCcPre' + iCo, '19500');
    st = await evaluar(cli, `({ costos:document.getElementById('abaCcCostos').textContent.replace(/\\s+/g,' '), marcado:(document.querySelector('#abaCcCostos input[type=checkbox]')||{}).checked })`);
    chk('la Colita a $19.500 ofrece actualizar el costo ($19.000 → $19.500), tildado por ser la más nueva', /Colita de Cuadril: \$19\.000 → \$19\.500/.test(st.costos) && st.marcado === true, st);
    chk('y avisa que los pedidos que ya se llevaron piezas se corrigen solos', /se corrigen solos/.test(st.costos), st.costos);

    /* cambiar de proveedor en + NUEVO con la factura a medio cargar */
    await evaluar(cli, `window.confirm=function(){return false;}; 1`);
    await elegirProv('Prov Uno');
    st = await evaluar(cli, `({ prov:document.getElementById('npProv').value, form:!!document.getElementById('abaCcFormIn'), kg:(document.getElementById('abaCcKg${iLo}')||{}).value, visible:!(${oculto('abaCcArriba')}) })`);
    chk('cambiar de proveedor con la factura a medio cargar pregunta, y si no se descarta vuelve a Caco con lo tipeado', st.prov === 'Caco' && st.form && st.kg === '24,3' && st.visible, st);

    /* sin precio no manda */
    const iPi = idx('Picaña');
    await tipear('#abaCcKg' + iPi, '2');
    await evaluar(cli, `(function(){ var e=document.getElementById('abaCcPre${iPi}'); e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
    await evaluar(cli, `window.__posts=[]; document.getElementById('abaCcGuardar').click(); 1`);
    await pausa(500);
    st = await evaluar(cli, `({ err:document.getElementById('abaCcErr').textContent, posts:window.__posts.length, abierto:!!document.getElementById('abaCcFormIn') })`);
    chk('sin precio no manda nada y dice cuál falta', st.posts === 0 && /Falta el precio por kilo de Picaña/.test(st.err) && st.abierto, st);
    await evaluar(cli, `(function(){ var e=document.getElementById('abaCcKg${iPi}'); e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);

    /* tamaños, con el formulario abierto */
    const tam = await evaluar(cli, `(function(){ var sel='#abaCcArriba input:not([type=checkbox]), #abaCcArriba button, #abaCcArriba select, #abaCcAbajo button';
      var chicos=[].slice.call(document.querySelectorAll(sel)).filter(function(e){ var r=e.getBoundingClientRect(); return r.width>0 && r.height<36; })
      .map(function(e){return (e.id||e.className)+' '+Math.round(e.getBoundingClientRect().height);});
      var fuera=[].slice.call(document.querySelectorAll('#abaCcArriba *, #abaCcAbajo *')).filter(function(e){ var r=e.getBoundingClientRect(); return r.width>0 && r.right>window.innerWidth+1; }).map(function(e){return e.id||e.className;}).slice(0,5);
      return { chicos:chicos, fuera:fuera, desb: document.documentElement.scrollWidth>window.innerWidth+1 }; })()`);
    if (ANCHO <= 560) chk('campos y botones miden 36px o más', tam.chicos.length === 0, tam.chicos);
    chk('nada se sale de la pantalla a lo ancho', tam.fuera.length === 0 && !tam.desb, tam);

    await evaluar(cli, `window.__posts=[]; document.getElementById('abaCcGuardar').click(); 1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='compraCarneGuardar';})`, 8000);
    const post = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='compraCarneGuardar';})[0]||null`);
    chk('el POST lleva Caco, la fecha, sólo las líneas con kilos (en número) y un clientOpId', !!post && post.proveedor === 'Caco' && post.fecha === hoyAR && post.id === '' &&
      post.lineas.length === 2 && post.lineas.some(l => l.abbr === 'CLo' && l.kg === 24.3 && l.precio === 28500 && l.det === '') && post.lineas.some(l => l.abbr === 'CCo' && l.kg === 17.02 && l.precio === 19500) &&
      /^cc_/.test(post.clientOpId || ''), post);
    chk('y el costo a actualizar: sólo la Colita', !!post && JSON.stringify(post.costos) === JSON.stringify([{ abbr: 'CCo', precio: 19500 }]), post && post.costos);
    const cerro = await esperar(cli, `!document.getElementById('abaCcFormIn') && !abaHayEditor()`, 8000);
    chk('al guardar el formulario se cierra y el ERP deja de estar "editando"', cerro);
    const toast = await evaluar(cli, `document.getElementById('abaToast').textContent`);
    chk('el aviso dice cuántos pedidos se corrigieron y cuánto (+$1.485)', /corregí el costo de 2 pedidos que ya se la llevaron \(\+\$1\.485\)/.test(toast), toast);
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

    /* ── Cambiar el costo de un corte (lista nueva) ── */
    await esperar(cli, `!!document.querySelector('#abaCcListBox .cc-precios') && !document.getElementById('abaLoaderOverlay').classList.contains('show')`, 8000);
    await pausa(800);
    await evaluar(cli, `(function(){ var f=[].slice.call(document.querySelectorAll('#abaCcListBox .cc-pr-fila')).filter(function(x){return /^Picaña/.test(x.textContent.trim());})[0]; f.querySelector('button').click(); return 1; })()`);
    const abrioCosto = await esperar(cli, `!!document.getElementById('abaCcCostoIn')`, 3000);
    chk('Cambiar abre el campo con el costo de hoy (18000)', abrioCosto && await evaluar(cli, `document.getElementById('abaCcCostoIn').value==='18000'`));
    await tipear('#abaCcCostoIn', '18500');
    await evaluar(cli, `abaCcCargar(true); 1`);
    await esperar(cli, `abaCc.estado==='ok'`, 5000);
    await pausa(300);
    /* El valor solo no alcanza: se guarda en el estado y un repintado lo vuelve a poner.
       Lo que se pierde es el FOCO, y en el celular se cierra el teclado a mitad del numero. */
    chk('un dato que llega mientras se tipea no borra lo tipeado ni saca el foco', await evaluar(cli, `!!document.getElementById('abaCcCostoIn') && document.getElementById('abaCcCostoIn').value==='18500' && document.activeElement===document.getElementById('abaCcCostoIn')`),
      await evaluar(cli, `({ v:(document.getElementById('abaCcCostoIn')||{}).value, foco:(document.activeElement||{}).id })`));
    await evaluar(cli, `window.__posts=[]; document.getElementById('abaCcCostoOk').click(); 1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='compraCarneCosto';})`, 5000);
    const pc = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='compraCarneCosto';})[0]||null`);
    chk('Guardar manda compraCarneCosto con la Picaña a 18500 y un clientOpId', !!pc && pc.abbr === 'CPi' && pc.precio === 18500 && /^ccc_/.test(pc.clientOpId || ''), pc);
    const tc = await esperar(cli, `!document.getElementById('abaCcCostoIn') && /Picaña: \\$18\\.000 → \\$18\\.500 por kilo/.test(document.getElementById('abaToast').textContent)`, 5000);
    chk('al guardar se cierra y el aviso dice el antes y el ahora', tc, await evaluar(cli, `document.getElementById('abaToast').textContent`));

    /* ── PAGOS: el detalle de una compra de carne ── */
    await evaluar(cli, `abaSwitchTab('pagos'); 1`);
    await esperar(cli, `!!document.querySelector('#pagosList .deuda-card')`, 10000);
    const pg = await evaluar(cli, `(function(){ var c=[].slice.call(document.querySelectorAll('#pagosList .deuda-card')).filter(function(x){return /Caco/.test(x.textContent);})[0]; return { hay:!!c, det: c ? (c.querySelector('.sem-items-acc summary')||{}).textContent : '' }; })()`);
    chk('en PAGOS Caco tiene su semana y el detalle dice "5 cortes" (no "OCs")', pg.hay && /Ver detalle \(5 cortes\)/.test(pg.det || ''), pg);
    chk('sin error del servidor no hay aviso de carne', await evaluar(cli, `!/compras de carne/.test(document.getElementById('pagosList').textContent)`));

    /* ── Descartar la factura al cambiar de proveedor ── */
    await evaluar(cli, `abaSwitchTab('nuevo'); 1`);
    await esperar(cli, `!(${oculto('abaCcArriba')})`, 5000);
    await evaluar(cli, `abaCcAbrir(); 1`);
    await esperar(cli, `!!document.getElementById('abaCcKg0')`, 3000);
    await tipear('#abaCcKg0', '3');
    await evaluar(cli, `window.confirm=function(){return true;}; 1`);
    await elegirProv('Prov Uno');
    st = await evaluar(cli, `({ prov:document.getElementById('npProv').value, form:!!document.getElementById('abaCcFormIn'), editando:abaHayEditor(), oculta:${oculto('abaCcArriba')} })`);
    chk('si se descarta: otro proveedor, sin formulario, sin "editando" y sin la caja de la carne', st.prov === 'Prov Uno' && !st.form && st.editando === false && st.oculta, st);

    chk('sin errores de JS (fase a)', errores.length === 0, errores.slice(0, 3));

    /* ── Si el servidor no pudo leer las compras (y la tab guardada era CARNE) ── */
    await ir('p');
    await evaluar(cli, `go('busqueda'); 1`);
    await esperar(cli, `typeof abaSwitchTab==='function'`, 30000);
    chk('quien tenía guardada la sub-tab CARNE cae en + NUEVO', await evaluar(cli, `abaCurrentTab==='nuevo'`), await evaluar(cli, `abaCurrentTab`));
    await evaluar(cli, `abaSwitchTab('pagos'); 1`);
    await esperar(cli, `!!document.querySelector('#pagosList .deuda-card')`, 10000);
    chk('PAGOS avisa que la deuda de la carne no está en el total', await evaluar(cli, `/No se pudieron leer las compras de carne/.test(document.getElementById('pagosList').textContent)`));
    await aNuevo();
    await elegirProv('Caco');
    await esperar(cli, `document.querySelectorAll('#abaCcListBox .cc-card').length===3`, 10000);
    const tp = await evaluar(cli, `({ est:(document.querySelector('#abaCcListBox .cc-card .cc-estado')||{}).textContent })`);
    chk('y la factura de la carne no dice "pagada": dice que no se pudo calcular la deuda', /No se pudo calcular la deuda/.test(tp.est || ''), tp);

    /* ── Si el libro no llega ── */
    await ir('e');
    await aNuevo();
    await elegirProv('Caco');
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
