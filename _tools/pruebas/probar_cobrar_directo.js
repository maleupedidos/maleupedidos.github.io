/* EL COBRO DIRECTO A LA BASE (257, 28/10/2026), sobre la cola de Ruta (processSyncQueue).
   node _tools/pruebas/probar_cobrar_directo.js <token>      BASE_URL=http://localhost:PUERTO/app.html
   Sesion real; sesion_prep intercepta todo POST que no es una lectura de la base (tambien pedido_cobrar_directo):
   NO se escribe nada. Una capa encima decide que contesta la base en cada caso. El cobro entra a la cola por
   localStorage (`maleu_ruta`) + `loadLocal()`, como uno que quedo guardado en el aparato. Sostiene:
     · con COBRAR_DIRECTO apagada, el cobro va a Apps Script y ni se llama a la base;
     · prendida: va a la base, NO a Apps Script, sin el token; se empuja el aplicador; el reenvio (mismo payload,
       mismo ts = mismo id) lo saca de la cola cuando la base dice que ya no esta pendiente;
     · `directo:false` → el POST de siempre a Apps Script, con el MISMO ts (el mismo id de orden);
     · un corte de red de la base → reintento con backoff y el MISMO ts. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (c, e) => Promise.race([cdp.evaluar(c, e), new Promise((_, no) => setTimeout(() => no(new Error('20 s')), 20000))]);
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(cli, e)) return true; } catch (x) {} await pausa(200); } return false; }
/* La base, simulada: `__base` es la secuencia de respuestas ('ok' = pendiente, 'aplicada', 'nodirecto', 'corte'). */
const capa = `;(function(){var o=window.fetch;window.__envios=[];window.__base=[];window.fetch=function(u,x){var s=String((u&&u.url)||u||''),b=x&&x.body?String(x.body):'';
  if(/pedido_cobrar_directo/.test(s)){var p=JSON.parse(b).p;window.__envios.push({a:'base',id:p.id,ts:p.ts,token:('token' in p),raro:Object.keys(p).filter(function(k){return k.indexOf('__')===0;})});var r=window.__base.shift()||'aplicada';
    if(r==='corte')return Promise.reject(new TypeError('Failed to fetch'));
    var d=r==='nodirecto'?{ok:false,directo:false,motivo:'fecha'}:{ok:true,aceptada:true,directo:true,orden:1,diferida:r==='ok',repetida:r==='aplicada'};
    return Promise.resolve(new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}));}
  if(b.indexOf('"marcarCobrado"')>=0){var q=JSON.parse(b);window.__envios.push({a:'apps',id:q.id,ts:q.ts});}
  if(b.indexOf('pedidosFuenteAplicar')>=0)window.__envios.push({a:'aplicar'});
  return o.apply(this,arguments);};})();
  window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){p[k]=window.__palForzar[k];});}catch(e){}},200);`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, capa) });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && !!window._sbPerm`, 60000), '');
  await ev(cli, `go('ruta'); 1`);
  chk('Ruta arranca (cola, loadLocal, saveLocal)', await esperar(cli, `typeof window.processSyncQueue==='function' && typeof window.loadLocal==='function' && typeof window.saveLocal==='function'`, 60000), '');
  await pausa(3000);
  /* La hora de ahora: un cobro de mas de 30 min `loadLocal` lo pasa a «No se pudo guardar» (y no se manda). */
  const T0 = Date.now();
  const limpiar = () => ev(cli, `window.saveLocal(); var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); var es=function(q){return q&&q.cliente==='PRUEBA 257';};
    d.syncQueue=(d.syncQueue||[]).filter(function(q){return !es(q);}); d.rutSyncRechazados=(d.rutSyncRechazados||[]).filter(function(r){return !es(r&&r.item);});
    localStorage.setItem('maleu_ruta',JSON.stringify(d)); window.loadLocal(); 1`);
  await limpiar();
  const cola =() => ev(cli, `window.saveLocal(); (JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).filter(function(q){return q.cliente==='PRUEBA 257';}).length`);
  /* Un cobro de mentira (N° que no existe) metido en la cola guardada, como uno que quedo en el aparato. */
  const meter = async (ts) => {
    await ev(cli, `window.__envios=[]; window.saveLocal(); var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); d.syncQueue=(d.syncQueue||[]).concat([{action:'marcarCobrado',quien:'Tadeo',fechaCobro:'',ajusteDec:'',hoja:'Home',id:'999257',row:0,
      formaPago:'Efectivo',cuenta:'',ef:100,tr:0,propina:0,propMet:'Efectivo',aFavor:0,aplicacion:0,cliente:'PRUEBA 257',recibidoEf:100,repartidor:'prueba',ts:${ts},token:'x'}]);
      localStorage.setItem('maleu_ruta',JSON.stringify(d)); window.loadLocal(); window.processSyncQueue(); 1`);
  };
  const envs = () => ev(cli, `window.__envios`);
  const vacia = () => esperar(cli, `(window.saveLocal(), (JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).every(function(q){return q.cliente!=='PRUEBA 257';}))`, 40000);
  /* 0. Palanca apagada: ni se llama a la base. */
  await ev(cli, `window.__palForzar.cobrarDirecto = false; 1`); await pausa(500);
  await meter(T0 + 1);
  chk('apagada: sale de la cola', await vacia(), await cola());
  let e = await envs();
  chk('con COBRAR_DIRECTO apagada: va a Apps Script y NO toca la base', e.some((x) => x.a === 'apps') && !e.some((x) => x.a === 'base'), e);
  /* 1. Prendida: base pendiente → aplicador → reenvio a la base (ya aplicada) → sale. */
  await ev(cli, `window.__palForzar.cobrarDirecto = true; window.__base=['ok','aplicada']; 1`); await pausa(500);
  await meter(T0 + 2);
  chk('prendida: sale de la cola', await vacia(), await cola());
  e = await envs();
  chk('   va a la base y NO a Apps Script', e.filter((x) => x.a === 'base').length === 2 && !e.some((x) => x.a === 'apps'), e);
  chk('   sin el token ni los __ de la cola', e.filter((x) => x.a === 'base').every((x) => !x.token && !x.raro.length), e);
  chk('   con la orden pendiente se empuja el aplicador, y el reenvio lleva el MISMO ts', e.some((x) => x.a === 'aplicar') && e.filter((x) => x.a === 'base').every((x) => x.ts === T0 + 2), e);
  /* 2. directo:false → Apps Script con el mismo ts. */
  await ev(cli, `window.__base=['nodirecto']; 1`);
  await meter(T0 + 3);
  chk('directo:false: sale de la cola', await vacia(), await cola());
  e = await envs();
  const b2 = e.find((x) => x.a === 'base'), a2 = e.find((x) => x.a === 'apps');
  chk('directo:false → el POST de siempre a Apps Script, con el MISMO ts', b2 && a2 && b2.ts === T0 + 3 && a2.ts === T0 + 3, e);
  /* 3. corte de red de la base → reintento con el mismo ts. */
  await ev(cli, `window.__base=['corte','aplicada']; 1`);
  await meter(T0 + 4);
  chk('un corte de la base → reintento y sale de la cola', await vacia(), await cola());
  e = await envs();
  chk('   dos envios a la base con el MISMO ts, ninguno a Apps Script', e.filter((x) => x.a === 'base').length === 2 && e.filter((x) => x.a === 'base').every((x) => x.ts === T0 + 4) && !e.some((x) => x.a === 'apps'), e);
  const err = await ev(cli, `(window.__err||[]).filter(function(x){ return !/favicon|ResizeObserver/.test(x); })`);
  chk('sin errores de JS', err.length === 0, err);
  chk('ningun cobro de prueba cayo en «No se pudo guardar»', await ev(cli, `window.saveLocal(); (JSON.parse(localStorage.getItem('maleu_ruta')||'{}').rutSyncRechazados||[]).every(function(r){return !(r&&r.item&&r.item.cliente==='PRUEBA 257');})`), '');
  await limpiar();
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (x) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
