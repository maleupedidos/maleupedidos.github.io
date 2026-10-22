/* Abastecimiento EN VIVO (22/10/2026, tiempo real paso 2, rama supabase).

   node _tools/pruebas/probar_aba_en_vivo.js [390|1440]
   BASE=http://localhost:8150 node _tools/pruebas/probar_aba_en_vivo.js 390
   APAGADA=1 …   → con la palanca en «no»: la pantalla tiene que quedar como siempre

   Sin producción: Apps Script va stubbeado en el navegador y Supabase lo hace un
   servidor falso de acá mismo (REST + el WebSocket de Realtime, con el mismo
   protocolo de Phoenix que se probó contra el proyecto real el 22/10). Datos
   inventados: el repo es público.

   Sostiene:
   · la tab entra al canal privado erp:compras y erp:fotos con el token;
   · una señal de compras con una OC que la lista no trae → aparece al toque en la
     tarjeta de su proveedor como «Cargada recién» (y un proveedor sin tarjeta
     tiene la suya), SIN pedirle nada a Apps Script;
   · la lectura pide solo columnas permitidas (nada de costo);
   · una compra «Guardando…» del mismo proveedor y producto se confirma con la
     señal (sale el «Guardando…»);
   · una OC cancelada o del depósito no se pinta;
   · con «Recibir mercadería» abierto NO se repinta (no se borra lo tipeado), y se
     pinta cuando se cierra;
   · la señal de foto nueva reemplaza la lista y lo «recién cargado» sale solo;
   · el encabezado dice «en vivo», y cortado dice «sin conexión en vivo»;
   · al volver la conexión se relee la foto;
   · con la palanca apagada: no hay conexión y la pantalla es la de siempre. */
'use strict';
const http = require('http');
const crypto = require('crypto');
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APAGADA = process.env.APAGADA === '1';
const CEL = ANCHO <= 560;
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

/* ── Los datos (inventados) ── */
const oc = (id, prov, prod, abbr, q, est) => ({ oc: id, r: 100, prov, prod, abbr, q, est, canal: 'Home', cliente: 'Cliente Prueba', nped: '1', semEnt: 37, vend: '', ent: false, ct: q * 1000 });
const provCard = (n, abbr, v, q) => ({ n, costo: q * 1000, fProg: '', cats: [{ cat: 'Tartas', items: [{ v, a: abbr, q, qDep: 0, ct: q * 1000, sem: 37, anio: 2026 }] }] });
const BUSQ1 = { ts: 1, total: 1, semActual: 37, anioActual: 2026, stocksProductos: {}, cuentas: [], clientes: [], enPoderVend: [], deudas: [],
  provs: [provCard('Prov Uno', 'TV', 'Verdura', 3)], ocs: [oc('OC-901', 'Prov Uno', 'Tartas — Verdura', 'TV', 3, 'Pendiente')] };
const BUSQ2 = Object.assign({}, BUSQ1, {
  provs: [provCard('Prov Uno', 'TV', 'Verdura', 5), provCard('Prov Dos', 'TJ', 'Jamón', 4)],
  ocs: BUSQ1.ocs.concat([oc('OC-902', 'Prov Uno', 'Tartas — Verdura', 'TV', 2, 'Pendiente'), oc('OC-903', 'Prov Dos', 'Tartas — Jamón', 'TJ', 4, 'Pendiente'),
    oc('OC-906', 'Prov Uno', 'Tartas — Verdura', 'TV', 2, 'Pendiente'), oc('OC-907', 'Prov Dos', 'Tartas — Jamón', 'TJ', 1, 'Pendiente')]) });
const FILAS = {
  'OC-902': { order_no: 'OC-902', supplier: 'Prov Uno', product_name: 'Tartas — Verdura', product_abbr: 'TV', quantity: 2, state: 'Pendiente', source_type: 'Orden de Compra', channel: 'Depósito', customer_name: 'Tadeo — Stock', created_at_source: '2026-10-22T13:00:00+00:00' },
  'OC-903': { order_no: 'OC-903', supplier: 'Prov Dos', product_name: 'Tartas — Jamón', product_abbr: 'TJ', quantity: 4, state: 'Pendiente', source_type: 'Orden de Compra', channel: 'Depósito', customer_name: 'Tadeo — Stock', created_at_source: '2026-10-22T13:00:00+00:00' },
  'OC-904': { order_no: 'OC-904', supplier: 'Prov Uno', product_name: 'Tartas — Verdura', product_abbr: 'TV', quantity: 9, state: 'Cancelado', source_type: 'Orden de Compra', channel: 'Home', customer_name: 'X', created_at_source: '2026-10-22T13:00:00+00:00' },
  'OC-906': { order_no: 'OC-906', supplier: 'Prov Uno', product_name: 'Tartas — Verdura', product_abbr: 'TV', quantity: 2, state: 'Pendiente', source_type: 'Orden de Compra', channel: 'Depósito', customer_name: 'Tadeo — Stock', created_at_source: '2026-10-22T13:00:00+00:00' },
  'OC-907': { order_no: 'OC-907', supplier: 'Prov Dos', product_name: 'Tartas — Jamón', product_abbr: 'TJ', quantity: 1, state: 'Pendiente', source_type: 'Orden de Compra', channel: 'Depósito', customer_name: 'Tadeo — Stock', created_at_source: '2026-10-22T13:00:00+00:00' },
  'OC-905': { order_no: 'OC-905', supplier: 'Prov Uno', product_name: 'Tartas — Verdura', product_abbr: 'TV', quantity: 7, state: 'Recibido', source_type: 'Depósito', channel: 'Depósito', customer_name: 'X', created_at_source: '2026-10-22T13:00:00+00:00' }
};

/* ── El Supabase falso ── */
/* Las horas, relativas a cuando corre la prueba: una fija se vuelve «vieja» a la tarde (22/10). */
const haceMin = (m) => new Date(Date.now() - m * 60000).toISOString();
const S = { foto: { payload: BUSQ1, computed_at: haceMin(10) }, rest: [], joins: [], tokens: [], socks: new Set(), rechazar: false };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const srv = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const u = new URL(req.url, 'http://x');
  S.rest.push({ path: u.pathname, q: u.search, auth: req.headers.authorization || '' });
  let cuerpo = [];
  if (u.pathname === '/rest/v1/erp_screen_snapshot') cuerpo = [{ payload: S.foto.payload, computed_at: S.foto.computed_at, warning: '', source: 'prueba' }];
  else if (u.pathname === '/rest/v1/purchase_order_line') {
    const m = /order_no=in\.\(([^)]*)\)/.exec(decodeURIComponent(u.search));
    const ids = m ? m[1].split(',').map(x => x.replace(/"/g, '')) : [];
    cuerpo = ids.map(i => FILAS[i]).filter(Boolean);
  }
  res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, CORS));
  res.end(JSON.stringify(cuerpo));
});
/* WebSocket mínimo (RFC 6455): texto, sin fragmentar. Alcanza para Phoenix. */
function wsMandar(sock, obj) {
  const b = Buffer.from(JSON.stringify(obj));
  const h = b.length < 126 ? Buffer.from([0x81, b.length]) : Buffer.from([0x81, 126, b.length >> 8, b.length & 255]);
  try { sock.write(Buffer.concat([h, b])); } catch (e) {}
}
srv.on('upgrade', (req, sock) => {
  const k = req.headers['sec-websocket-key'];
  const acc = crypto.createHash('sha1').update(k + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  S.socks.add(sock);
  let buf = Buffer.alloc(0);
  sock.on('data', (d) => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= 2) {
      const op = buf[0] & 15; let len = buf[1] & 127, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (buf.length < off + 4 + len) return;
      const mask = buf.slice(off, off + 4), data = Buffer.from(buf.slice(off + 4, off + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
      buf = buf.slice(off + 4 + len);
      if (op === 8) { try { sock.end(); } catch (e) {} S.socks.delete(sock); return; }
      if (op !== 1) continue;
      let m; try { m = JSON.parse(data.toString()); } catch (e) { continue; }
      if (m.event === 'phx_join') {
        S.joins.push({ topic: m.topic, privado: !!(m.payload && m.payload.config && m.payload.config.private), token: m.payload && m.payload.access_token });
        wsMandar(sock, { topic: m.topic, event: 'phx_reply', ref: m.ref, payload: S.rechazar
          ? { status: 'error', response: { reason: 'Unauthorized: You do not have permissions to read from this Channel topic: ' + m.topic.replace('realtime:', '') } }
          : { status: 'ok', response: { postgres_changes: [] } } });
      } else if (m.event === 'heartbeat') wsMandar(sock, { topic: 'phoenix', event: 'phx_reply', ref: m.ref, payload: { status: 'ok', response: {} } });
      else if (m.event === 'access_token') S.tokens.push(m.payload && m.payload.access_token);
    }
  });
  sock.on('close', () => S.socks.delete(sock));
  sock.on('error', () => S.socks.delete(sock));
});
const senal = (canal, payload) => S.socks.forEach(s => wsMandar(s, { topic: 'realtime:' + canal, event: 'broadcast', ref: null, payload: { type: 'broadcast', event: 'cambio', payload } }));
const cortar = () => S.socks.forEach(s => { try { s.destroy(); } catch (e) {} });

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const SB = 'http://127.0.0.1:' + srv.address().port;
  const EXTRA = `
  (function(){
    window.__fase='a'; window.__gets=[];
    try{ localStorage.removeItem('maleu_busqueda'); localStorage.removeItem('maleu_aba_recien'); localStorage.removeItem('maleu_aba_guardando');
         localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_busqueda_tab','proveedores'); localStorage.setItem('maleu_busqueda_sem','actual'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      window.__gets.push(a);
      var cuerpo = a==='sbToken' ? {sb:{token:'tok-1',url:${JSON.stringify(SB)},key:'pub-prueba',seg:43200}, palancas:{abaEnVivo:${APAGADA ? 'false' : 'true'}}}
        : a==='busqueda' ? window.__busq || ${JSON.stringify(BUSQ1)}
        : a==='catalogo' ? {ts:1,proveedores:['Prov Uno'],deps:[],productos:{'Prov Uno':[]}} : a==='vendedores' ? {ts:1,vendedores:[]}
        : a==='faltantes' ? {ok:true,faltan:[]} : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true} : {ok:false,error:'stub'};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(res){ setTimeout(function(){ res(new Response(t,{status:200,headers:{'Content-Type':'application/json'}})); }, 60); });
    };
  })();`;
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} try { srv.close(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: 1, mobile: CEL });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Abastecimiento en vivo · ' + ANCHO + 'px' + (APAGADA ? ' · PALANCA APAGADA' : '') + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + (process.env.APP || 'app.html') + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && window.__fase==='a'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    /* El permiso: el panel lo pide por atrás a los segundos; acá se pide ya. */
    await evaluar(cli, `_sbPermiso().then(function(){return 1})`);
    await evaluar(cli, `go('busqueda'); 1`);
    if (!await esperar(cli, `!!document.querySelector('#provList .prov-card')`, 25000)) { console.log('  BUSQUEDA no pinto'); salir(1); }
    const card = (n) => `[].filter.call(document.querySelectorAll('#provList .prov-card'),function(x){var e=x.querySelector('.prov-name');return e&&e.textContent.indexOf(${JSON.stringify(n)})>=0})[0]`;
    const recienDe = (n) => evaluar(cli, `(function(){var c=${card(n)}; var r=c&&c.querySelector('.aba-recien'); return r?r.textContent:null})()`);

    if (APAGADA) {
      await pausa(3000);
      chk('con la palanca apagada no abre ninguna conexión', S.joins.length === 0 && S.socks.size === 0, { joins: S.joins.length, socks: S.socks.size });
      chk('y el encabezado no dice nada de «en vivo»', (await evaluar(cli, `(document.getElementById('abaEnVivo')||{}).textContent||''`)) === '');
      const g0 = (await evaluar(cli, `window.__gets.slice()`)).length;
      senal('erp:compras', { tabla: 'oc', op: 'insert', n: 1, ids: ['OC-902'] });
      await pausa(1500);
      chk('una señal (si llegara) no cambia nada', (await recienDe('Prov Uno')) === null);
      const errs = await evaluar(cli, `window.__err.slice()`);
      chk('sin errores en la consola', errs.length === 0, errs);
      console.log('\n' + ok + ' ok · ' + mal + ' MAL'); salir(mal ? 1 : 0); return;
    }

    console.log('\n-- se conecta --');
    await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 10000);
    const topics = S.joins.map(j => j.topic).sort();
    chk('entra a erp:compras y erp:fotos', JSON.stringify(topics) === '["realtime:erp:compras","realtime:erp:fotos"]', topics);
    chk('los dos canales son privados y con el token', S.joins.every(j => j.privado && j.token === 'tok-1'), S.joins);
    chk('el encabezado dice «en vivo»', (await evaluar(cli, `(document.getElementById('abaEnVivo')||{}).textContent||''`)).indexOf('en vivo') >= 0);

    console.log('\n-- una compra que cargó otro --');
    await evaluar(cli, `window.__gets=[]; 1`);
    S.rest = [];
    senal('erp:compras', { tabla: 'oc', op: 'insert', n: 2, ids: ['OC-902', 'OC-903'] });
    const t0 = Date.now();
    const llego = await esperar(cli, `!!(${card('Prov Dos')}) && !!(${card('Prov Uno')}).querySelector('.aba-recien')`, 5000);
    const ms = Date.now() - t0;
    chk('aparece en su tarjeta como «Cargada recién» (en ' + ms + ' ms)', llego && ms < 2000, ms);
    chk('dice el N° de OC', String(await recienDe('Prov Uno')).indexOf('OC-902') >= 0, await recienDe('Prov Uno'));
    chk('el proveedor sin tarjeta tiene la suya', String(await recienDe('Prov Dos')).indexOf('OC-903') >= 0, await recienDe('Prov Dos'));
    const gets = await evaluar(cli, `window.__gets.filter(function(a){return a==='busqueda'})`);
    chk('sin pedirle la lista a Apps Script', gets.length === 0, gets);
    const lect = S.rest.filter(r => r.path === '/rest/v1/purchase_order_line');
    chk('la lectura va con el token de la pantalla', lect.length >= 1 && lect.every(r => r.auth === 'Bearer tok-1'), lect);
    chk('y no pide el costo', lect.length >= 1 && lect.every(r => !/cost|revenue|margin|customer_key/.test(r.q)), lect.map(r => r.q));

    console.log('\n-- cancelada y del depósito no se pintan --');
    senal('erp:compras', { tabla: 'oc', op: 'update', n: 2, ids: ['OC-904', 'OC-905'] });
    await pausa(1200);
    const tx = String(await recienDe('Prov Uno'));
    chk('la cancelada (OC-904) no aparece', tx.indexOf('OC-904') < 0, tx);
    chk('la del depósito ya recibida (OC-905) no aparece', tx.indexOf('OC-905') < 0, tx);

    console.log('\n-- el «Guardando…» se confirma con la señal --');
    /* Por las funciones de adentro: las globales de la sub-app en window son copias. */
    await evaluar(cli, `_abaGuardandoAgregar({clientOpId:'op-1',proveedor:'Prov Uno',items:[{abbr:'TV',nombre:'Verdura',qty:2,costo:1000,origen:'Orden de Compra'}]}); abaRender(); 1`);
    chk('arranca «Guardando…»', !!(await evaluar(cli, `!!(${card('Prov Uno')}).querySelector('.aba-guardando')`)));
    senal('erp:compras', { tabla: 'oc', op: 'insert', n: 1, ids: ['OC-906'] });
    const conf = await esperar(cli, `!(${card('Prov Uno')}).querySelector('.aba-guardando') && String((${card('Prov Uno')}).querySelector('.aba-recien').textContent).indexOf('OC-906')>=0`, 4000);
    chk('con la señal pasa de «Guardando…» a «Cargada recién»', conf);

    console.log('\n-- no se repinta con «Recibir» abierto --');
    await evaluar(cli, `(function(){ var c=${card('Prov Uno')}; var b=c.querySelector('.btn-recibir'); return 1; })()`);
    /* Prov Uno no tiene Recibir (está Pendiente): se simula un panel abierto en la lista. */
    await evaluar(cli, `(function(){ var d=document.createElement('div'); d.className='recibir-panel open'; d.id='__panelFalso'; d.innerHTML='<input id="__tipeo" value="3">'; document.getElementById('provView').appendChild(d); })(); 1`);
    senal('erp:compras', { tabla: 'oc', op: 'insert', n: 1, ids: ['OC-907'] });
    await pausa(1500);
    chk('con el panel abierto no se repinta (lo tipeado sigue)', !!(await evaluar(cli, `!!document.getElementById('__tipeo')`)));
    chk('y queda pendiente', !!(await evaluar(cli, `_abaVivo.pintarPend===true`)));
    await evaluar(cli, `document.getElementById('__panelFalso').remove(); 1`);
    chk('al cerrarlo se pinta solo', await esperar(cli, `_abaVivo.pintarPend===false && String((${card('Prov Dos')}||{}).textContent||'').indexOf('OC-907')>=0`, 8000));

    console.log('\n-- la foto nueva reemplaza la lista --');
    S.foto = { payload: BUSQ2, computed_at: haceMin(-1) };
    senal('erp:fotos', { screen: 'busqueda', computed_at: S.foto.computed_at });
    const rem = await esperar(cli, `!document.querySelector('#provList .aba-recien') && String((${card('Prov Uno')}||{}).textContent||'').indexOf('5')>=0`, 5000);
    chk('con la foto, lo «recién cargado» sale y queda la lista de verdad', rem, await evaluar(cli, `String((${card('Prov Uno')}||{}).textContent||'').slice(0,300)+' || recien: '+document.querySelectorAll('#provList .aba-recien').length`));
    const viejo = S.rest.length;
    senal('erp:fotos', { screen: 'busqueda', computed_at: haceMin(30) });
    senal('erp:fotos', { screen: 'pedidos', computed_at: haceMin(-5) });
    await pausa(800);
    chk('una foto más vieja, o de otra pantalla, no se lee', S.rest.length === viejo, S.rest.slice(viejo));

    console.log('\n-- se corta y vuelve --');
    S.joins = []; S.rest = [];
    cortar();
    chk('cortado dice «sin conexión en vivo»', await esperar(cli, `String((document.getElementById('abaEnVivo')||{}).textContent||'').indexOf('sin conexión en vivo')>=0`, 3000),
      await evaluar(cli, `(document.getElementById('abaEnVivo')||{}).textContent`));
    chk('se reconecta solo', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 8000) && S.joins.length === 2, S.joins);
    chk('y al volver relee la foto', await (async () => { const t = Date.now(); while (Date.now() - t < 4000) { if (S.rest.some(r => r.path === '/rest/v1/erp_screen_snapshot')) return true; await pausa(150); } return false; })(), S.rest);

    console.log('\n-- rechazado (sin la 100) --');
    S.rechazar = true; S.joins = [];
    cortar();
    await esperar(cli, `window.__enVivo && window.__enVivo.estado==='rechazado'`, 8000);
    const st = await evaluar(cli, `window.__enVivo`);
    chk('un rechazo queda como «rechazado» con el motivo', st && st.estado === 'rechazado' && /Unauthorized/.test(st.motivo), st);
    await pausa(4000);
    chk('y no reintenta en loop', S.joins.length <= 2, S.joins.length);
    chk('la lista sigue en pantalla', !!(await evaluar(cli, `!!document.querySelector('#provList .prov-card')`)));

    const errs = await evaluar(cli, `window.__err.slice()`);
    chk('sin errores en la consola', errs.length === 0, errs);
  } catch (e) { console.log('  ERROR ' + (e && e.stack || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  salir(mal ? 1 : 0);
})();
