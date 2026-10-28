/* LAS DIRECTAS A LA BASE (257-265, 28/10/2026): el panel (`_ordenPost`) y la cola de Ruta (`processSyncQueue`).
   node _tools/pruebas/probar_directas.js <token>      BASE_URL=http://localhost:PUERTO/app.html
   Sesion real; sesion_prep intercepta todo POST que no es una lectura de la base (tambien las RPC directas): NO se
   escribe nada. Una capa encima decide que contesta la base en cada caso. Sostiene:
   PANEL  · con la palanca de la accion apagada, va a Apps Script y ni se llama a la base;
          · prendida: cada una de las 7 del panel va a SU RPC, NO a Apps Script, sin token, y la pantalla recibe
            la respuesta de la base como si fuera la de Apps Script (ok, diferida);
          · `directo:false`, un 404 (migracion sin aplicar) o un 500/corte de la base → Apps Script con el MISMO id;
          · prender una no prende otra.
   RUTA   · la entrega por la cola va a la base con ENTREGAR_DIRECTO, con el mismo ts; el cobro sigue con su palanca. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (c, e) => Promise.race([cdp.evaluar(c, e), new Promise((_, no) => setTimeout(() => no(new Error('20 s')), 20000))]);
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(cli, e)) return true; } catch (x) {} await pausa(200); } return false; }
/* La base, simulada: `__base` es la secuencia de respuestas ('ok' = pendiente, 'aplicada', 'nodirecto', 'corte', '500', '404'). */
const capa = `;(function(){var o=window.fetch;window.__envios=[];window.__base=[];window.fetch=function(u,x){var s=String((u&&u.url)||u||''),b=x&&x.body?String(x.body):'';
  var m=/\\/rpc\\/((?:pedido|caja|ruta)_[a-z_]+_directo)/.exec(s);
  if(m){var p=JSON.parse(b).p;window.__envios.push({a:'base',fn:m[1],acc:p.action,id:p.clientOpId||'',ts:p.ts||0,token:('token' in p)});var r=window.__base.shift()||'ok';
    if(r==='corte')return Promise.reject(new TypeError('Failed to fetch'));
    if(r==='500'||r==='404')return Promise.resolve(new Response('{}',{status:Number(r)}));
    var d=r==='nodirecto'?{ok:false,directo:false,motivo:'datos'}:r==='freno'?{ok:false,necesitaPlata:true,sinReintento:true,cobrado:1500,err:'El pedido está cobrado'}
      :{ok:true,aceptada:true,directo:true,orden:1,diferida:r==='ok',repetida:r==='aplicada'};
    return Promise.resolve(new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}));}
  if(/"action":"(marcarCobrado|marcarEntregado|pedidoGrupal|descobrar|updateDiaEntrega|pedidoDeposito|deshacerOrigen|deshacerEntrega|cambiarEstadoEntrega|cancelarPedido|updatePedidoRed|pasarAVendedor|gasto|ingreso|marcarArmado)"/.test(b)){var q=JSON.parse(b);window.__envios.push({a:'apps',acc:q.action,id:q.clientOpId||'',ts:q.ts||0});}
  if(b.indexOf('pedidosFuenteAplicar')>=0)window.__envios.push({a:'aplicar'});
  return o.apply(this,arguments);};})();
  window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){p[k]=window.__palForzar[k];});}catch(e){}},200);`;
const PANEL = {
  updateDiaEntrega: ['pedido_dia_directo', { hoja: 'Home', id: '999258', row: 0, fecha: '2026-10-30' }],
  pedidoGrupal: ['pedido_grupal_directo', { hoja: 'Home', row: 0, id: '999258', valor: 'Prueba' }],
  descobrar: ['pedido_descobrar_directo', { hoja: 'Home', id: '999258', row: 0, ts: 1 }],
  pedidoDeposito: ['pedido_deposito_directo', { hoja: 'Home', row: 0, deposito: 'ustariz' }],
  deshacerOrigen: ['pedido_deshacer_origen_directo', { hoja: 'Home', id: '999258', row: 0 }],
  deshacerEntrega: ['pedido_deshacer_entrega_directo', { hoja: 'Home', id: '999258', row: 0 }],
  cambiarEstadoEntrega: ['pedido_estado_directo', { hoja: 'Home', id: '999258', row: 0, estado: 'Pendiente' }],
  /* Tanda 2 (266, 267). */
  cancelarPedido: ['pedido_cancelar_directo', { hoja: 'Home', id: '999258', row: 0 }],
  updatePedidoRed: ['pedido_portal_directo', { pedidoId: '999258', row: 0, vendedor: 'Prueba', updates: { entrega: true } }],
  /* Tanda 3 (269). */
  pasarAVendedor: ['pedido_pase_directo', { hoja: 'Home', id: '999258', row: 0, al: '28/10 10:00', vendedor: 'Prueba', trajo: 'Maleu', igual: true }],
  /* Tanda 4 (272, 273): la caja. */
  gasto: ['caja_gasto_directo', { fecha: '', hora: '', categoria: 'Prueba', concepto: 'Prueba', notas: '', montoEf: 1, montoMp: 0, metodo: 'Efectivo', monto: 1 }],
  ingreso: ['caja_ingreso_directo', { fecha: '', hora: '', categoria: 'Prueba', concepto: 'Prueba', notas: '', montoEf: 1, montoMp: 0, metodo: 'Efectivo', monto: 1 }],
  marcarArmado: ['ruta_armado_directo', { armado: true, usuario: 'Prueba', pedidos: [{ h: 'Home', id: '999258', c: 'Prueba', r: 0 }] }] };
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, capa) });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _ordenPost==='function' && !!window._sbPerm`, 60000), '');
  const envs = () => ev(cli, `window.__envios`);
  const pal = (o) => ev(cli, `window.__palForzar.directas=${JSON.stringify(o)}; 1`).then(() => pausa(500));
  /* Lo que la pantalla recibe, como la recibe: Response → json. */
  const post = (a, extra) => ev(cli, `window.__envios=[]; _ordenPost(Object.assign({action:'${a}',clientOpId:'pr_${a}_'+Date.now()},${JSON.stringify(PANEL[a][1])},${JSON.stringify(extra || {})}))
    .then(function(r){return r.json();}).then(function(d){window.__res=d;return 1;},function(e){window.__res={tiro:String(e)};return 1;})`).then(() => ev(cli, `window.__res`));
  /* ── PANEL ── */
  await pal({});
  await post('updateDiaEntrega'); let e = await envs();
  chk('panel, palanca apagada: Apps Script y NO la base', e.some((x) => x.a === 'apps') && !e.some((x) => x.a === 'base'), e);
  for (const [a, [fn]] of Object.entries(PANEL)) {
    await pal({ [a]: true }); await ev(cli, `window.__base=['ok']; 1`);
    const r = await post(a); e = await envs();
    chk(`panel ${a} prendida: va a ${fn}, NO a Apps Script, sin token; la pantalla recibe ok+diferida`,
      e.length === 1 && e[0].a === 'base' && e[0].fn === fn && e[0].acc === a && !e[0].token && r && r.ok === true && r.diferida === true, { e, r });
  }
  await pal({ updateDiaEntrega: true });
  for (const caso of ['nodirecto', '404', '500', 'corte']) {
    await ev(cli, `window.__base=['${caso}']; 1`); await post('updateDiaEntrega'); e = await envs();
    const b = e.find((x) => x.a === 'base'), ap = e.find((x) => x.a === 'apps');
    chk(`panel, la base contesta ${caso}: Apps Script con el MISMO id`, b && ap && b.id && b.id === ap.id, e);
  }
  await ev(cli, `window.__base=['ok']; 1`); await post('pedidoGrupal'); e = await envs();
  chk('panel, prender el día NO prende el grupal', e.some((x) => x.a === 'apps') && !e.some((x) => x.a === 'base'), e);
  /* (266) Cuando la base FRENA (cobrado sin decidir la plata), esa respuesta llega a la pantalla: no se pregunta a Apps Script. */
  await pal({ cancelarPedido: true }); await ev(cli, `window.__base=['freno']; 1`);
  const rf = await post('cancelarPedido'); e = await envs();
  chk('panel, cancelar un cobrado: la pantalla recibe el freno de la BASE (necesitaPlata, $1.500) y NO se pregunta a Apps Script',
    rf && rf.ok === false && rf.necesitaPlata === true && Number(rf.cobrado) === 1500 && e.length === 1 && e[0].a === 'base', { rf, e });
  /* ── RUTA ── */
  await ev(cli, `go('ruta'); 1`);
  chk('Ruta arranca', await esperar(cli, `typeof window.processSyncQueue==='function' && typeof window.loadLocal==='function'`, 60000), '');
  await pausa(3000);
  const T0 = Date.now();
  const limpiar = () => ev(cli, `window.saveLocal(); var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); var es=function(q){return q&&q.repartidor==='prueba 258';};
    d.syncQueue=(d.syncQueue||[]).filter(function(q){return !es(q);}); d.rutSyncRechazados=(d.rutSyncRechazados||[]).filter(function(r){return !es(r&&r.item);});
    localStorage.setItem('maleu_ruta',JSON.stringify(d)); window.loadLocal(); 1`);
  await limpiar();
  const meter = (it) => ev(cli, `window.__envios=[]; window.saveLocal(); var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); d.syncQueue=(d.syncQueue||[]).concat([${JSON.stringify(it)}]);
    localStorage.setItem('maleu_ruta',JSON.stringify(d)); window.loadLocal(); window.processSyncQueue(); 1`);
  const vacia = () => esperar(cli, `(window.saveLocal(), (JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).every(function(q){return q.repartidor!=='prueba 258';}))`, 40000);
  await pal({ marcarEntregado: true }); await ev(cli, `window.__base=['ok','aplicada']; 1`);
  await meter({ action: 'marcarEntregado', hoja: 'Home', id: '999258', row: 0, cobrado: false, propina: 0, repartidor: 'prueba 258', ts: T0 + 1 });
  chk('Ruta: la entrega sale de la cola', await vacia(), '');
  e = await envs();
  chk('   fue a pedido_entregar_directo (dos veces: pendiente y aplicada), con el MISMO ts, y NO a Apps Script',
    e.filter((x) => x.a === 'base' && x.fn === 'pedido_entregar_directo' && x.ts === T0 + 1).length === 2 && !e.some((x) => x.a === 'apps') && e.some((x) => x.a === 'aplicar'), e);
  await pal({}); await ev(cli, `window.__palForzar.cobrarDirecto=true; window.__base=['aplicada']; 1`); await pausa(500);
  await meter({ action: 'marcarCobrado', hoja: 'Home', id: '999258', row: 0, fechaCobro: '', formaPago: 'Efectivo', ef: 1, tr: 0, repartidor: 'prueba 258', ts: T0 + 2 });
  chk('Ruta: el cobro sigue yendo directo con COBRAR_DIRECTO (la palanca de la 257)', await vacia() && (await envs()).some((x) => x.a === 'base' && x.fn === 'pedido_cobrar_directo'), await envs());
  await ev(cli, `window.__palForzar.cobrarDirecto=false; 1`); await pausa(500);
  await meter({ action: 'marcarEntregado', hoja: 'Home', id: '999258', row: 0, repartidor: 'prueba 258', ts: T0 + 3 });
  chk('Ruta: con todo apagado la entrega va a Apps Script', await vacia() && (await envs()).some((x) => x.a === 'apps') && !(await envs()).some((x) => x.a === 'base'), await envs());
  const err = await ev(cli, `(window.__err||[]).filter(function(x){ return !/favicon|ResizeObserver/.test(x); })`);
  chk('sin errores de JS', err.length === 0, err);
  chk('ninguna de prueba cayó en «No se pudo guardar»', await ev(cli, `window.saveLocal(); (JSON.parse(localStorage.getItem('maleu_ruta')||'{}').rutSyncRechazados||[]).every(function(r){return !(r&&r.item&&r.item.repartidor==='prueba 258');})`), '');
  await limpiar();
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (x) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
