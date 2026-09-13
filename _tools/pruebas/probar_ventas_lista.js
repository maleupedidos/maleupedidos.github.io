/* La tab Ventas: la lista de VENTAS y COBROS (13/9/2026, /auditoria).

   node probar_ventas_lista.js [390|1440]
   APP=app_viejo_tmp.html node probar_ventas_lista.js 390    ← la direccion contraria

   Sin token: el backend va STUBBEADO con ventas INVENTADAS (el repo es publico).
   Los esperados no se copian de la pantalla: se calculan aca, en Node, con la
   definicion del negocio escrita de nuevo, y se comparan con lo que dibuja el ERP.

   Sostiene:
   · FASE a — la lista se dibuja paginada (80) y "Ver mas" suma; el periodo, el
     dia de la semana, el barrio, el año, el mes y la semana filtran con AÑO y los
     KPIs dan lo mismo que la cuenta de aca; lo elegido se ve como cartel y se
     saca de un toque; "Por cliente" junta por telefono; en COBROS el mes es el
     del COBRO; las ventas se cuentan como ENTREGAS; el nombre no se ejecuta
     como HTML; los filtros de VENTAS no aparecen encima de TENDENCIA cuando
     llegan las ventas; controles de 38px y nada desbordado.
   · FASE b — con el almacenamiento LLENO la lista se dibuja igual (era la foto
     de Tadeo: 1175 ventas en memoria y 0 filas).
   · FASE c — si el servidor falla y no hay copia, la pantalla lo DICE y tiene
     Reintentar; al reintentar bien, aparece la lista.
   · FASE d — con copia guardada y el servidor lento, la lista sale al instante y
     dice que es lo guardado. */
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
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
};

/* ── LAS VENTAS INVENTADAS, relativas a HOY ── */
const p2 = n => String(n).padStart(2, '0');
const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const H = new Date(hoyAR.getFullYear(), hoyAR.getMonth(), hoyAR.getDate());
const dmy = d => p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear();
const mas = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const CLIS = [];
for (let i = 0; i < 30; i++) CLIS.push({ c: 'Cliente ' + (i + 1), tel: i % 9 === 8 ? '' : '54911' + String(40000000 + i * 7919).slice(0, 8) });
CLIS[3].c = 'Casa <img src=x onerror="window.__xss=1">';
const SUBS = ['Golf', 'La Pionera', 'Champagnat Alto', 'El Recuerdo'];
const V = [];
let n = 1;
function venta(d, cli, o) {
  const cob = o.cob !== false;
  const monto = o.$ || (20000 + (n * 3700) % 90000);
  const v = Object.assign({
    canal: 'Venta Directa', zona: 'Home', fecha: dmy(d), fCob: cob ? dmy(o.fc || d) : '', mes: '', sem: 0,
    cliente: cli.c, estado: 'Entregado', fp: 'Transferencia', ep: cob ? 'Cobrado' : 'No Cobrado',
    $: monto, ef: 0, tr: monto, pEf: 0, pTr: 0, costo: Math.round(monto * 0.6), margen: Math.round(monto * 0.4),
    barrio: 'Estancias del Pilar', subBarrio: SUBS[n % SUBS.length], h: 'Home', n: String(n), tel: cli.tel,
    dir: SUBS[n % SUBS.length] + ' · Lote ' + (n % 300), cta: n % 3 ? 'mp' : 'brubank', he: o.he || ('1' + (n % 9) + ':' + p2(n % 60))
  }, o.extra || {});
  if (n % 4 === 0 && v.canal === 'Venta Directa') { v.ef = monto; v.tr = 0; delete v.cta; v.fp = 'Efectivo'; }
  n++;
  V.push(v);
  return v;
}
// ~260 dias hacia atras, dos años si hoy es temprano en el año
for (let i = 0; i < 260; i++) {
  const d = mas(H, -i);
  const cli = CLIS[i % CLIS.length];
  const v = venta(d, cli, { cob: i > 4 || i % 2 === 0, fc: i % 17 === 0 ? mas(d, 4) : null });
  if (i % 11 === 0) venta(d, CLIS[(i + 5) % CLIS.length], { extra: { barrio: 'Estancias del Rio', subBarrio: '', dir: 'Townhouses 4' } });
  if (i % 13 === 0) venta(d, CLIS[(i + 7) % CLIS.length], { extra: { zona: 'Pilar', h: 'Pilar', barrio: 'Pilara', subBarrio: '', dir: 'Pilara' } });
  if (i % 19 === 0) venta(d, CLIS[(i + 2) % CLIS.length], { extra: { canal: 'Clubes', zona: 'Champagnat', h: 'Clubes', barrio: '', subBarrio: '', dir: 'Champagnat', cliente: 'Socio ' + i + ' (Champagnat)' } });
  if (i % 23 === 0) {
    // Red: dos pedidos del mismo vendedor el mismo dia = UNA entrega; uno rendido mixto
    const r1 = venta(d, { c: 'Final ' + i, tel: '' }, { extra: { canal: 'Red', zona: 'Vendedor Uno', h: 'Red', barrio: '', subBarrio: '', dir: '', ef: 0 } });
    const r2 = venta(d, { c: 'Final b' + i, tel: '' }, { extra: { canal: 'Red', zona: 'Vendedor Uno', h: 'Red', barrio: '', subBarrio: '', dir: '' } });
    delete r1.cta; delete r2.cta; r2.tr = 0; r2.mx = r2.$;
  }
}
// El mismo cliente el mismo dia: 19:00 y 19:20 = 1 venta; 12:00 y 21:00 = 2
const dCombo = mas(H, -9);
venta(dCombo, CLIS[0], { he: '19:00' }); venta(dCombo, CLIS[0], { he: '19:20' });
venta(dCombo, CLIS[1], { he: '12:00' }); venta(dCombo, CLIS[1], { he: '21:00' });
// y un año anterior, para el filtro de año
for (let i = 0; i < 12; i++) venta(new Date(H.getFullYear() - 1, 11, 1 + i * 2), CLIS[i], {});
const CUENTAS = [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' }, { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', def: true }, { id: 'brubank', nombre: 'Brubank Lucas', tipo: 'digital' }];
const RESP = { ts: 1, v: V, cuentas: CUENTAS };

/* ── LA CUENTA DE ACA (independiente del ERP) ── */
const partes = f => { const m = String(f || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return { d, y: +m[3], m: +m[2], dow: d.getDay(), iso: m[3] + '-' + m[2] + '-' + m[1] }; };
const fechaDe = (v, cara) => cara === 'cobros' ? (v.fCob || v.fecha) : v.fecha;
const cobradoDe = v => v.ep !== 'Cobrado' ? 0 : v.ef + v.tr + (v.mx || 0) + Math.max(0, v.pEf) + Math.max(0, v.pTr);
function entregas(lista, cara) {
  const red = new Set(), grupos = {};
  lista.forEach(v => {
    const p = partes(fechaDe(v, cara));
    if (v.canal === 'Red') { red.add(v.zona + '|' + p.iso); return; }
    let t = String(v.tel || '').replace(/\D/g, ''); if (t.length > 10) t = t.slice(-10);
    const k = (t || String(v.cliente).toLowerCase().trim().replace(/\s+/g, ' ')) + '|' + fechaDe(v, cara);
    (grupos[k] = grupos[k] || []).push(v);
  });
  let nEnt = red.size;
  Object.values(grupos).forEach(g => {
    const min = h => { const m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
    const con = g.filter(v => min(v.he) !== null).sort((a, b) => min(a.he) - min(b.he));
    if (g.length > con.length) nEnt++;
    if (!con.length) return;
    let tramos = 1;
    for (let i = 1; i < con.length; i++) if (min(con[i].he) - min(con[i - 1].he) > 60) tramos++;
    nEnt += tramos;
  });
  return nEnt;
}
const cliKey = v => { let t = String(v.tel || '').replace(/\D/g, ''); if (t.length > 10) t = t.slice(-10); return t.length >= 8 ? 't' + t : 'n' + String(v.cliente).toLowerCase(); };
const suma = (l, f) => l.reduce((a, v) => a + f(v), 0);

const EXTRA = `
  (function(){
    var fase=(location.search.match(/fase=([a-z])/)||[])[1]||'a';
    window.__fase=fase; window.__gets=[]; window.__nVentas=0; window.__RESP=${JSON.stringify(RESP)};
    try{
      localStorage.setItem('maleu_tab','ventas');
      localStorage.removeItem('ma3'); localStorage.removeItem('maleu_v_filtros'); localStorage.removeItem('maleu_v_vista');
      if(fase!=='d'){ localStorage.removeItem('ma3v3'); localStorage.removeItem('ma3v2'); }
    }catch(e){}
    if(fase==='b'){
      /* el almacenamiento LLENO: todo setItem de las ventas revienta */
      var set=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){ if(k==='ma3v3'||k==='ma3v2'){ var e=new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e; } return set.apply(this,arguments); };
    }
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')>-1&&post) return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}}));
      if(url.indexOf('script.google.com')>-1){
        var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
        if(a==='ventas'){
          window.__nVentas++;
          var falla = fase==='c' && !window.__ventasOk;
          var txt = falla ? '{"ok":false,"error":"stub"}' : JSON.stringify(window.__RESP);
          var demora = fase==='d' ? 9000 : 120;
          return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); },demora); });
        }
        return new Promise(function(res){ setTimeout(function(){ res(new Response('{"ok":false,"error":"stub"}',{status:200,headers:{'Content-Type':'application/json'}})); },100); });
      }
      return o.apply(this,arguments); };
  })();
`;
const KPI = `(()=>{ var o={}; document.querySelectorAll('#vSum .v-kpi, #vSum .vs-pr').forEach(function(c){ var l=c.querySelector('.v-kpi-l'),v=c.querySelector('.v-kpi-v');
  if(l)o[l.textContent.trim()]=v?v.textContent.trim():''; }); return o; })()`;
const num = t => Number(String(t || '').replace(/[^\d]/g, '')) || 0;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async fase => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&fase=' + fase });
    if (!await esperar(cli, `typeof go==='function' && window.__fase===${JSON.stringify(fase)}`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('ventas');1`);
  };
  const kpis = () => evaluar(cli, KPI);
  const toca = sel => evaluar(cli, `(function(){ var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true; })()`);
  const tocaOp = (k, v) => evaluar(cli, `(function(){ var e=document.querySelector('#vfPanel [data-acc="op"][data-k="${k}"][data-v="${v}"]'); if(!e) return false; e.click(); return true; })()`);
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Ventas · la lista · ' + ANCHO + 'px · ' + APP + ' · ' + V.length + ' ventas inventadas ==');

    const FASES = process.env.FASES || 'adbc';
    if (FASES.indexOf('a') >= 0) {
    // ════ FASE a ════
    await ir('a');
    const pinto = await esperar(cli, `document.querySelectorAll('#vList .vt').length>0`, 20000);
    chk('la lista se dibuja', pinto);
    if (pinto) {
    await pausa(300);
    chk('dibuja 80 filas y no las ' + V.length + ' de un saque', await evaluar(cli, `document.querySelectorAll('#vList .vt').length`) === 80);
    chk('ofrece ver mas', await evaluar(cli, `!!document.querySelector('#vList [data-acc="mas"]')`));
    await toca('#vList [data-acc="mas"]'); await pausa(200);
    chk('"Ver mas" suma 100', await evaluar(cli, `document.querySelectorAll('#vList .vt').length`) === 180);
    chk('8 periodos, y "Todo" prendido al entrar', await evaluar(cli, `document.querySelectorAll('#vfPer .vf-pc').length===8 && document.querySelector('#vfPer .vf-pc.on').getAttribute('data-v')==='todo'`));
    chk('el estado de carga no queda a la vista', await evaluar(cli, `(function(e){return !!e&&e.hidden===true;})(document.getElementById('vEstado'))`));

    let k = await kpis();
    chk('Facturado de todo = la cuenta de aca', num(k['Facturado']) === suma(V, v => v.$), [k['Facturado'], suma(V, v => v.$)]);
    chk('Ventas cuenta ENTREGAS (el mismo viaje es una, Red por vendedor y dia)', num(k['Ventas']) === entregas(V, 'ventas'), [k['Ventas'], entregas(V, 'ventas'), V.length]);
    chk('Clientes = personas distintas por telefono', num(k['Clientes']) === new Set(V.map(cliKey)).size, [k['Clientes'], new Set(V.map(cliKey)).size]);
    chk('Cobrado incluye lo de Red rendido mixto (en mx) sin inventar reparto', num(k['Cobrado']) === suma(V, cobradoDe), [k['Cobrado'], suma(V, cobradoDe)]);
    chk('Sin cobrar = el facturado de lo no cobrado', num(k['Sin cobrar']) === suma(V.filter(v => v.ep !== 'Cobrado'), v => v.$), [k['Sin cobrar']]);
    chk('el nombre de un cliente no se ejecuta como HTML', await evaluar(cli, `window.__xss===undefined`));

    // El panel de filtros: cerrado en el celular, abierto en la compu
    const abierto = await evaluar(cli, `(function(e){return !!e&&!e.hidden;})(document.getElementById('vfPanel'))`);
    chk('el panel de filtros arranca cerrado (abierto tapaba la lista, tambien en la compu)', abierto === false);
    if (!abierto) await toca('#vfBtn');
    chk('el panel se abre', await evaluar(cli, `(function(e){return !!e&&!e.hidden;})(document.getElementById('vfPanel'))`));
    chk('hay filtro de DIA DE LA SEMANA, de lunes a domingo', await evaluar(cli, `(function(){ var s=[].map.call(document.querySelectorAll('#vfPanel [data-k="dow"]'),function(b){return b.getAttribute('data-v');}); return s.join(',')==='1,2,3,4,5,6,0'; })()`));
    chk('hay filtro de AÑO (hay ventas de dos años)', await evaluar(cli, `document.querySelectorAll('#vfPanel [data-k="anio"]').length===2`));

    // Este año + domingo + Estancias del Pilar
    await toca('#vfPer [data-v="anio"]'); await pausa(150);
    const anio = H.getFullYear();
    const esteAnio = V.filter(v => partes(v.fecha).y === anio);
    k = await kpis();
    chk('"Este año" filtra por año (no por el nombre del mes)', num(k['Facturado']) === suma(esteAnio, v => v.$), [k['Facturado'], suma(esteAnio, v => v.$)]);
    chk('elegir un dia de la semana', await tocaOp('dow', '0'));
    await pausa(150);
    chk('elegir un barrio', await tocaOp('barrio', 'Estancias del Pilar'));
    await pausa(200);
    const dom = esteAnio.filter(v => partes(v.fecha).dow === 0 && /^estancias del pilar/i.test(v.barrio) && v.canal === 'Venta Directa');
    k = await kpis();
    chk('"quienes de Estancias me compraron este año los domingos": Facturado', num(k['Facturado']) === suma(dom, v => v.$), [k['Facturado'], suma(dom, v => v.$), dom.length]);
    chk('... Ventas', num(k['Ventas']) === entregas(dom, 'ventas'), [k['Ventas'], entregas(dom, 'ventas')]);
    chk('... Clientes', num(k['Clientes']) === new Set(dom.map(cliKey)).size, [k['Clientes'], new Set(dom.map(cliKey)).size]);
    chk('todos los dias de la lista son domingo', await evaluar(cli, `(function(){ var d=[].map.call(document.querySelectorAll('#vList .vl-dia-f'),function(x){return x.textContent;}); return d.length>0 && d.every(function(x){return /^Domingo /.test(x);}); })()`));
    chk('lo elegido se ve como cartel arriba (dia y barrio)', await evaluar(cli, `(function(){ var t=[].map.call(document.querySelectorAll('#vfActivos .vf-pill'),function(x){return x.textContent;}).join('|'); return /Domingo/.test(t)&&/Estancias del Pilar/.test(t); })()`));
    chk('el boton de filtros cuenta 3 (el año, el dia y el barrio)', await evaluar(cli, `/3/.test(document.querySelector('#vfBtn .vf-cnt').textContent)`));

    // Por cliente
    await toca('#vlHead [data-acc="vista"][data-v="cliente"]'); await pausa(200);
    const porCli = {};
    dom.forEach(v => { const kk = cliKey(v); (porCli[kk] = porCli[kk] || []).push(v); });
    const cls = Object.values(porCli).map(l => ({ $: suma(l, v => v.$), n: l.length })).sort((a, b) => b.$ - a.$);
    chk('"Por cliente": una fila por persona', await evaluar(cli, `document.querySelectorAll('#vList .vc').length`) === Math.min(80, cls.length), [await evaluar(cli, `document.querySelectorAll('#vList .vc').length`), cls.length]);
    chk('"Por cliente": el primero es el que mas compro', num(await evaluar(cli, `document.querySelector('#vList .vc .vc-m').textContent`)) === cls[0].$);
    await toca('#vList .vc'); await pausa(150);
    chk('tocar un cliente muestra sus pedidos', await evaluar(cli, `document.querySelectorAll('#vList .vc.abierta .vc-l').length`) === cls[0].n);
    await toca('#vlHead [data-acc="vista"][data-v="venta"]'); await pausa(150);

    // Sacar el dia desde el cartel
    await evaluar(cli, `(function(){ var e=[].filter.call(document.querySelectorAll('#vfActivos .vf-pill'),function(x){return /Domingo/.test(x.textContent);})[0]; if(e) e.click(); return !!e; })()`);
    await pausa(150);
    chk('la × del cartel saca ese filtro', await evaluar(cli, `vFilt.dow.length===0 && vFilt.barrio.length===1`));

    // Buscar por sub-barrio (dir lleva el sub-barrio; el barrio tambien se busca)
    await evaluar(cli, `vClearAll();1`);
    await evaluar(cli, `(function(){ var i=document.getElementById('vBusq'); i.value='rio'; vBuscar('rio'); return 1; })()`);
    await pausa(400);
    const rio = V.filter(v => /estancias del rio/i.test(v.barrio));
    k = await kpis();
    chk('buscar "rio" encuentra el barrio aunque la direccion no lo diga', num(k['Facturado']) === suma(rio, v => v.$), [k['Facturado'], suma(rio, v => v.$)]);
    await evaluar(cli, `vBuscar('',1);1`); await pausa(200);

    // COBROS: el mes es el del cobro
    await evaluar(cli, `vSwitchTab('cobros');1`); await pausa(250);
    const cruza = V.find(v => v.ep === 'Cobrado' && v.fCob && v.fCob.slice(3) !== v.fecha.slice(3));
    chk('hay un cobro en otro mes que su entrega (el caso)', !!cruza);
    if (cruza) {
      const pc = partes(cruza.fCob), ym = pc.y + '-' + p2(pc.m);
      if (await evaluar(cli, `(function(e){return !e||e.hidden;})(document.getElementById('vfPanel'))`)) await toca('#vfBtn');
      chk('en COBROS se elige el mes del cobro', await tocaOp('mes', ym));
      await pausa(200);
      const delMes = V.filter(v => v.ep === 'Cobrado' && (v.fCob || v.fecha).slice(3) === p2(pc.m) + '/' + pc.y);
      k = await kpis();
      chk('COBROS por mes = lo cobrado ESE mes, entregado cuando sea', num(k['Cobrado']) === suma(delMes, cobradoDe), [k['Cobrado'], suma(delMes, cobradoDe)]);
      chk('... y aparece el cobro de una entrega del mes anterior', await evaluar(cli, `[].some.call(document.querySelectorAll('#vList .vt-sub'),function(x){return /entregado/.test(x.textContent);})`));
    }
    await evaluar(cli, `vClearAll();vSwitchTab('ventas');1`); await pausa(200);

    // Rango de fechas escrito a mano (el mes pasado)
    if (await evaluar(cli, `(function(e){return !e||e.hidden;})(document.getElementById('vfPanel'))`)) await toca('#vfBtn');
    const ini = new Date(H.getFullYear(), H.getMonth() - 1, 1), fin = new Date(H.getFullYear(), H.getMonth(), 0);
    await evaluar(cli, `(function(){ var d=document.getElementById('vfDesde'),h=document.getElementById('vfHasta'); d.value=''; h.value='';
      '${p2(ini.getDate())}${p2(ini.getMonth() + 1)}${ini.getFullYear()}'.split('').forEach(function(c){ d.value+=c; vfMascara(d); });
      h.value='${dmy(fin)}'; vfMascara(h); return 1; })()`);
    chk('la fecha se escribe sola con las barras', await evaluar(cli, `document.getElementById('vfDesde').value`) === dmy(ini));
    await toca('#vfPanel [data-acc="rango"]'); await pausa(200);
    const rango = V.filter(v => { const p = partes(v.fecha); return p.d >= ini && p.d <= fin; });
    k = await kpis();
    chk('entre dos fechas dd/mm/aaaa', num(k['Facturado']) === suma(rango, v => v.$), [k['Facturado'], suma(rango, v => v.$)]);
    chk('el rango escrito queda como cartel', await evaluar(cli, `/→/.test(document.getElementById('vfActivos').textContent)`));
    await evaluar(cli, `vClearAll();1`); await pausa(150);
    chk('al limpiar, las fechas escritas no quedan en los campos', await evaluar(cli, `(function(){ var d=document.getElementById('vfDesde'); return !d || d.value===''; })()`));

    // Medidas
    const med = await evaluar(cli, `(function(){
      var chicos=[]; [].forEach.call(document.querySelectorAll('#vLista button, #vLista input'),function(b){ var r=b.getBoundingClientRect(); if(r.width&&r.height&&r.height<38) chicos.push((b.className||b.id)+':'+Math.round(r.height)); });
      return { chicos:chicos, desborde: document.documentElement.scrollWidth-window.innerWidth };
    })()`);
    if (ANCHO <= 560) chk('en el celular ningun control de la lista mide menos de 38px', med.chicos.length === 0, med.chicos.slice(0, 8));
    chk('nada desborda a lo ancho', med.desborde <= 0, med.desborde);

    // Las ventas llegan estando en TENDENCIA: los filtros no aparecen encima
    await evaluar(cli, `vSwitchTab('tendencia');1`); await pausa(150);
    await evaluar(cli, `loadVentas();1`);
    await esperar(cli, `!_vPidiendo`, 5000); await pausa(200);
    chk('en TENDENCIA la lista y sus filtros siguen escondidos cuando llegan las ventas', await evaluar(cli, `(function(){ var e=document.getElementById('vLista'); return !!e && getComputedStyle(e).display==='none'; })()`));
    await evaluar(cli, `vSwitchTab('ventas');1`);
    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
    }
    }

    if (FASES.indexOf('d') >= 0) {
    // ════ FASE d: con copia guardada y el servidor lento ════
    await ir('d');
    const tCopia = await esperar(cli, `document.querySelectorAll('#vList .vt').length>0`, 4000);
    chk('con copia guardada la lista sale al instante (el servidor tarda 9 s)', tCopia);
    chk('... y dice que es lo guardado', await evaluar(cli, `/guardado/.test(((document.getElementById('vEstado')||{}).textContent||''))`));
    await esperar(cli, `(function(e){return !!e&&e.hidden===true;})(document.getElementById('vEstado'))`, 15000);
    chk('cuando llega lo de ahora, el aviso se va', await evaluar(cli, `(function(e){return !!e&&e.hidden===true;})(document.getElementById('vEstado'))`));

    }
    if (FASES.indexOf('b') >= 0) {
    // ════ FASE b: el almacenamiento lleno ════
    await ir('b');
    const lleno = await esperar(cli, `document.querySelectorAll('#vList .vt').length>0`, 8000);
    chk('con el almacenamiento LLENO la lista se dibuja igual', lleno);
    chk('... y no avisa un error que no fue', await evaluar(cli, `(function(e){return !!e&&e.hidden===true;})(document.getElementById('vEstado'))`));

    }
    if (FASES.indexOf('c') >= 0) {
    // ════ FASE c: el servidor falla y no hay copia ════
    await ir('c');
    await esperar(cli, `/No pude traer las ventas/.test(((document.getElementById('vEstado')||{}).textContent||''))`, 8000);
    chk('si falla sin copia, lo dice', await evaluar(cli, `/No pude traer las ventas/.test(((document.getElementById('vEstado')||{}).textContent||''))`));
    chk('... con un boton Reintentar', await evaluar(cli, `!!document.querySelector('#vEstado [data-acc="reintentar"]')`));
    const antes = await evaluar(cli, `window.__nVentas`);
    await evaluar(cli, `window.__ventasOk=true;1`);
    await toca('#vEstado [data-acc="reintentar"]');
    chk('Reintentar vuelve a pedir y aparece la lista', await esperar(cli, `document.querySelectorAll('#vList .vt').length>0`, 8000) && await evaluar(cli, `window.__nVentas`) > antes);
    chk('... y el aviso se va', await evaluar(cli, `(function(e){return !!e&&e.hidden===true;})(document.getElementById('vEstado'))`));
    }
  } catch (e) {
    console.log('  EXCEPCION ' + (e && e.stack || e)); mal++;
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
