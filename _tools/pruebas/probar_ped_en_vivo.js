/* Pedidos EN VIVO (25/10/2026, tiempo real paso 3, rama supabase).

   node _tools/pruebas/probar_ped_en_vivo.js [390|1440]
   APAGADA=1 …   → con la palanca en «no»: la pantalla tiene que quedar como siempre

   Sin producción: Apps Script va stubbeado en el navegador y Supabase lo hace un
   servidor falso de acá mismo (REST + el WebSocket de Realtime, el mismo de
   probar_aba_en_vivo.js). Datos inventados: el repo es público.

   Sostiene:
   · el panel entra al canal privado erp:pedidos con el token, y el cartel dice «en vivo»;
   · una señal con un pedido nuevo → aparece en la lista SIN pedirle nada a Apps Script,
     releyendo SOLO ese pedido de sales_order;
   · un cobro que llega por la señal cambia el pedido;
   · un pedido tocado ACÁ hace un momento no se pisa con lo de la base;
   · con un editor abierto no se repinta, y se pinta al cerrarlo;
   · 12 señales en el mismo segundo: UNA lectura; más de 50 en una: la lista entera;
   · con la palanca apagada: ni conexión ni cartel. */
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
const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const haceMin = (m) => new Date(Date.now() - m * 60000).toISOString();
const fila = (n, cliente, extra) => Object.assign({ channel: 'Home', order_number: String(n), customer_name: cliente, customer_key: '11300000' + n,
  order_state: 'Pendiente', payment_state: 'No Cobrado', payment_method: '', source_type: 'Stock', ordered_at: haceMin(60), planned_delivery_at: hoy,
  delivered_at: null, billed_amount: 10000, cash_amount: 0, transfer_amount: 0, source_row: n - 400, updated_at: haceMin(30), warehouse: '',
  sales_order_item: [{ product_sku: 'TV', quantity: 1 }] }, extra || {});
/* Lo que manda Apps Script, con la forma de `_sbAPedido`. */
const ped = (n, cliente) => ({ h: 'Home', n: String(n), c: cliente, tel: '11300000' + n, f: '', hr: '', de: '', dee: hoy, fe: '', fex: '', es: 'Pendiente',
  ep: 'No Cobrado', fp: '', o: 'Stock', dep: '', $: 10000, ef: 0, tr: 0, r: n - 400, p: [{ a: 'TV', q: 1 }] });
const FILAS = {
  'Home|501': fila(501, 'Cliente Uno'), 'Home|502': fila(502, 'Cliente Dos'),
  'Home|503': fila(503, 'Cliente Nuevo', { updated_at: haceMin(0) }),
  'Home|504': fila(504, 'Cliente Editor', { updated_at: haceMin(0) })
};

/* ── El Supabase falso ── */
const S = { rest: [], joins: [], socks: new Set() };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const srv = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const u = new URL(req.url, 'http://x');
  const q = decodeURIComponent(u.search);
  S.rest.push({ path: u.pathname, q, auth: req.headers.authorization || '' });
  let cuerpo = [];
  if (u.pathname === '/rest/v1/sales_order') {
    const m = /order_key=in\.\(([^)]*)\)/.exec(q);
    if (m) cuerpo = m[1].split(',').map(x => FILAS[x.replace(/"/g, '')]).filter(Boolean);
    else cuerpo = [FILAS['Home|501'], FILAS['Home|502']].map(f => Object.assign({}, f, { updated_at: haceMin(30) }));
  }
  res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, CORS));
  res.end(JSON.stringify(cuerpo));
});
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
        wsMandar(sock, { topic: m.topic, event: 'phx_reply', ref: m.ref, payload: { status: 'ok', response: { postgres_changes: [] } } });
      } else if (m.event === 'heartbeat') wsMandar(sock, { topic: 'phoenix', event: 'phx_reply', ref: m.ref, payload: { status: 'ok', response: {} } });
    }
  });
  sock.on('close', () => S.socks.delete(sock));
  sock.on('error', () => S.socks.delete(sock));
});
const senal = (payload) => S.socks.forEach(s => wsMandar(s, { topic: 'realtime:erp:pedidos', event: 'broadcast', ref: null, payload: { type: 'broadcast', event: 'cambio', payload } }));

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const SB = 'http://127.0.0.1:' + srv.address().port;
  const PAL = APAGADA ? '{pedEnVivo:false}' : '{pedEnVivo:true}';
  const LIGHT = { ts: 1, pedidos: [ped(501, 'Cliente Uno'), ped(502, 'Cliente Dos')], canales: [], light: true };
  const EXTRA = `
  (function(){
    window.__fase='p'; window.__gets=[];
    try{ localStorage.removeItem('ma3'); localStorage.setItem('maleu_tab','pedidos'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      window.__gets.push(a);
      var cuerpo = a==='sbToken' ? {sb:{token:'tok-1',url:${JSON.stringify(SB)},key:'pub-prueba',seg:43200}, palancas:${PAL}}
        : a==='miSesion' ? {ok:true,usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',activo:true,tabs:null,authModo:'estricto',rolesModo:'estricto',palancas:${PAL}}
        : a==='pedidosLight' ? ${JSON.stringify(LIGHT)}
        : a==='ocLight' ? {ts:1,ocs:[]} : {ok:false,error:'stub'};
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
    console.log('\n== Pedidos en vivo · ' + ANCHO + 'px' + (APAGADA ? ' · PALANCA APAGADA' : '') + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + (process.env.APP || 'app.html') + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && window.__fase==='p'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `_sbPermiso().then(function(){return 1})`);
    await evaluar(cli, `go('pedidos'); 1`);
    const enLista = (txt) => `String((document.getElementById('pList')||{}).textContent||'').indexOf(${JSON.stringify(txt)})>=0`;
    if (!await esperar(cli, enLista('Cliente Uno'), 25000)) { console.log('  PEDIDOS no pinto: ' + await evaluar(cli, `String((document.getElementById('pList')||{}).textContent||'').slice(0,200)`)); salir(1); }
    await pausa(2500);
    if (!await evaluar(cli, `getComputedStyle(document.getElementById('p-pedidos')).display!=='none'`)) { await evaluar(cli, `go('pedidos'); 1`); await pausa(800); }
    const ep = (n) => evaluar(cli, `(function(){var p=(D.pedidos||[]).filter(function(x){return x.h==='Home'&&String(x.n)==='${n}'})[0]; return p?p.ep:null})()`);

    if (APAGADA) {
      await pausa(2500);
      chk('con la palanca apagada no abre ninguna conexión', S.joins.length === 0 && S.socks.size === 0, { joins: S.joins, socks: S.socks.size });
      chk('y el cartel no se ve', await evaluar(cli, `(function(){var e=document.getElementById('pedEnVivo'); return !!e && e.hidden && e.getBoundingClientRect().height===0})()`));
      const errs = await evaluar(cli, `window.__err.slice()`);
      chk('sin errores en la consola', errs.length === 0, errs);
      console.log('\n' + ok + ' ok · ' + mal + ' MAL'); salir(mal ? 1 : 0); return;
    }

    console.log('\n-- se conecta --');
    chk('entra a erp:pedidos, privado y con el token', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 10000)
      && S.joins.some(j => j.topic === 'realtime:erp:pedidos' && j.privado && j.token === 'tok-1'), S.joins);
    const visto = await evaluar(cli, `(function(){var e=document.getElementById('pedEnVivo'); if(!e) return {v:false}; var r=e.getBoundingClientRect();
      var t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return {v: !e.hidden && r.width>0 && r.left>=0 && r.right<=innerWidth && !!t && (t===e||e.contains(t)), txt:e.textContent, rect:[r.left,r.top,r.width,r.height], scrollX: document.documentElement.scrollWidth>innerWidth}})()`);
    chk('el cartel dice «● en vivo» y se VE (sin scroll lateral)', visto.v === true && /en vivo/.test(visto.txt) && !visto.scrollX, visto);

    console.log('\n-- un pedido nuevo que cargó otro --');
    await evaluar(cli, `window.__gets=[]; 1`); S.rest = [];
    senal({ tabla: 'pedido', op: 'insert', n: 1, ids: ['Home|503'] });
    const t0 = Date.now();
    const llego = await esperar(cli, enLista('Cliente Nuevo'), 5000);
    const ms = Date.now() - t0;
    chk('aparece en la lista (en ' + ms + ' ms)', llego && ms < 2500, ms);
    chk('sin pedirle la lista a Apps Script', (await evaluar(cli, `window.__gets.filter(function(a){return a==='pedidosLight'})`)).length === 0, await evaluar(cli, `window.__gets.slice()`));
    const lect = S.rest.filter(r => r.path === '/rest/v1/sales_order');
    chk('releyendo SOLO ese pedido, con el token', lect.length === 1 && /order_key=in\.\("Home\|503"\)/.test(lect[0].q) && lect[0].auth === 'Bearer tok-1', lect);

    console.log('\n-- un cobro que llega por la señal --');
    FILAS['Home|501'] = fila(501, 'Cliente Uno', { payment_state: 'Cobrado', payment_method: 'Efectivo', cash_amount: 10000, updated_at: haceMin(0) });
    senal({ tabla: 'pedido', op: 'update', n: 1, ids: ['Home|501'] });
    chk('el pedido 501 pasa a Cobrado', await esperar(cli, `(D.pedidos||[]).some(function(x){return String(x.n)==='501'&&x.ep==='Cobrado'})`, 4000), await ep(501));

    console.log('\n-- lo tocado acá no se pisa --');
    await evaluar(cli, `_patchPedidoLocal('Home','502',{ep:'Cobrado'}); 1`);
    FILAS['Home|502'] = fila(502, 'Cliente Dos', { updated_at: haceMin(-1) });   // la base todavía dice No Cobrado
    senal({ tabla: 'pedido', op: 'update', n: 1, ids: ['Home|502'] });
    await pausa(1800);
    chk('el 502 cobrado acá sigue Cobrado aunque la base diga otra cosa', (await ep(502)) === 'Cobrado', await ep(502));

    console.log('\n-- con un editor abierto no se repinta --');
    await evaluar(cli, `window.__editorFalso=true; window.__hayEd=_hayEditorAbierto; _hayEditorAbierto=function(){return true}; 1`);
    senal({ tabla: 'pedido', op: 'insert', n: 1, ids: ['Home|504'] });
    await pausa(1800);
    chk('no se pinta con el editor abierto', !(await evaluar(cli, enLista('Cliente Editor'))) && await evaluar(cli, `_pendingLoadRender===true`), await evaluar(cli, `_pendingLoadRender`));
    chk('   pero el pedido ya está en memoria', await evaluar(cli, `(D.pedidos||[]).some(function(x){return String(x.n)==='504'})`));
    await evaluar(cli, `_hayEditorAbierto=window.__hayEd; render(); 1`);
    chk('   y aparece al cerrarlo', await esperar(cli, enLista('Cliente Editor'), 4000));

    console.log('\n-- 12 señales en el mismo segundo, y una de más de 50 --');
    S.rest = [];
    for (let i = 0; i < 12; i++) senal({ tabla: 'pedido', op: 'update', n: 1, ids: ['Home|' + (601 + i)] });
    await pausa(2000);
    { const l = S.rest.filter(r => r.path === '/rest/v1/sales_order');
      chk('una sola lectura, con las 12 claves', l.length === 1 && (l[0].q.match(/Home\|6\d\d/g) || []).length === 12, l.map(r => r.q.slice(0, 160))); }
    S.rest = [];
    senal({ tabla: 'pedido', op: 'update', n: 80, ids: Array.from({ length: 50 }, (_, i) => 'Home|' + (700 + i)) });
    await pausa(2000);
    { const l = S.rest.filter(r => r.path === '/rest/v1/sales_order');
      chk('más de 50: relee la lista entera (sin filtro de claves)', l.length === 1 && !/order_key=in/.test(l[0].q) && /order=ordered_at\.desc/.test(l[0].q), l.map(r => r.q.slice(0, 160))); }

    const errs = await evaluar(cli, `window.__err.slice()`);
    chk('sin errores en la consola', errs.length === 0, errs);
  } catch (e) { console.log('  ERROR ' + (e && e.stack || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  salir(mal ? 1 : 0);
})();
