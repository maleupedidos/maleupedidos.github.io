/* (6/11/2026) ¿Se conecta el EN VIVO de un admin? Tadeo y Lucas ven «conectando…» y Ruta tarda 15 s (el reloj, no la
   señal). El robot no es admin: se le da una policy TEMPORAL igual a la de admin (la crea y la borra el que corre esto)
   y en la página se le dice al front que es admin (`_enVivoPuede`), así pide los mismos canales que Tadeo.
   Mira cada join: cuánto tarda, si lo rechaza, y el estado del socket a lo largo de 90 s. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const cli = await cdp.abrir(); const ev = (e) => cdp.evaluar(cli, e);
  const t0 = Date.now(), ws = [];
  await cli.enviar('Network.enable', {}); await cli.enviar('Page.enable', {});
  cli.escuchar((m, p) => {
    if (m === 'Network.webSocketFrameReceived' || m === 'Network.webSocketFrameSent') {
      const d = String(p.response && p.response.payloadData || '');
      if (/phx_join|phx_reply|phx_close|phx_error|"broadcast"/.test(d) && !/heartbeat/.test(d)) ws.push(((Date.now() - t0) / 1000).toFixed(1) + 's ' + (m.endsWith('Sent') ? '→ ' : '← ') + d.replace(/"access_token":"[^"]+"/, '"access_token":"…"').slice(0, 170));
    }
    if (m === 'Network.webSocketClosed') ws.push(((Date.now() - t0) / 1000).toFixed(1) + 's SOCKET CERRADO');
    if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
  });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('maleu_ensayo','1')}catch(e){}" });
  await cli.enviar('Page.navigate', { url: URL_APP });
  for (let i = 0; i < 120; i++) { try { if (await ev(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`)) break; } catch (e) {} await pausa(500); }
  await ev(`window._enVivoPuede=function(){return true;};document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)};document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))};panelDoLogin();1`);
  for (let i = 0; i < 80; i++) { try { if (await ev(`typeof SESSION!=='undefined'&&!!(SESSION&&SESSION.usuario)`)) break; } catch (e) {} await pausa(500); }
  await ev(`try{SESSION.rol='admin';}catch(e){} try{_enVivoPuede=function(){return true;};}catch(e){} go('ruta'); 1`);
  if (process.env.MEDIR_RUTA) {
    for (let i = 0; i < 40; i++) { try { if (await ev(`_enVivoEstado().estado==='vivo'&&typeof rutSincronizar==='function'`)) break; } catch (e) {} await pausa(500); }
    await ev(`try{rutSwitchTab&&rutSwitchTab('armado');}catch(e){} window.__rutaVivo=null; 1`);
    await pausa(3000);
    const tD = Date.now();
    const { sql } = await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs');
    const fe = new Date(Date.now() + 2 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
    const alta = await sql(`SELECT set_config('request.jwt.claims','{"role":"anon"}',true), pedido_alta_directo(jsonb_build_object('canal','Home','nombre','PRUEBA Robot','telefono','5490000000001','barrioPrivado','PRUEBA','subBarrio','','lote','PRUEBA','pago','Transferencia','envio',0,'dia','','fechaEntrega','${fe}','horario','','items',jsonb_build_array(jsonb_build_object('id',1,'qty',1)),'total',1000,'clientOrderId','robot-medirvivo-'||floor(extract(epoch from clock_timestamp())*1000)::text)) r`);
    const nAlta = alta[alta.length - 1].r && alta[alta.length - 1].r.n;
    global.__nAlta = nAlta;
    let v = null;
    for (let i = 0; i < 60; i++) { v = await ev(`JSON.stringify(window.__rutaVivo||null)`); if (v && /sincronizo/.test(v)) break; await pausa(250); }
    console.log('Ruta se actualizó por la señal a los', Date.now() - tD, 'ms →', v);
    if (nAlta) { await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true), pedido_cancelar_directo(jsonb_build_object('action','cancelarPedido','hoja','Home','id','${nAlta}','row',-${nAlta},'clientOpId','robot-medirvivo-cancelar-${nAlta}','ts',1))`); console.log('pedido PRUEBA Home #' + nAlta + ' cancelado'); }
  }
  const est = [];
  for (let i = 0; i < (process.env.MEDIR_RUTA ? 1 : 18); i++) { await pausa(5000); est.push(((Date.now() - t0) / 1000).toFixed(0) + 's ' + await ev(`(function(){try{var s=_enVivoEstado();return s.estado+(s.motivo?' ('+s.motivo+')':'');}catch(e){return 'err';}})()`)); }
  console.log('ESTADO del en vivo cada 5 s:\n  ' + est.join('\n  '));
  console.log('canales pedidos:', await ev(`(function(){try{return Object.keys(_ENV.canales).length+' · '+Object.keys(_ENV.canales).join(', ');}catch(e){return 'err '+e.message;}})()`));
  console.log('\nTRAFICO del socket (joins y respuestas):'); ws.slice(process.env.MEDIR_RUTA ? -8 : 0, 70).forEach((x) => console.log('  ' + x));
  cli.matar ? cli.matar() : cli.cerrar(); process.exit(0);
})().catch((e) => { console.log('FALLÓ', e.message); process.exit(1); });
