/* Diagnóstico del socket de Realtime (5/11/2026): qué mensajes llegan de verdad por el WebSocket. Producción.
   node _tools/pruebas/diagnosticar_socket_vivo.js   (entra como el representante de prueba; dispara un cambio y lo deshace) */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const j = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const USU = j.repUsuario || 'pruebarobot', PIN = String(j.pinRep || '');
const sql = async (q) => (await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs')).sql(q);
(async () => {
  const cli = await cdp.abrir();
  const ev = (expr, ms) => Promise.race([cdp.evaluar(cli, expr), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 20000))]);
  const esperar = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(expr, 10000); if (v) return v; } catch (e) {} await pausa(200); } return null; };
  const frames = [];
  cli.escuchar((m, p) => {
    if (m === 'Network.webSocketFrameReceived' || m === 'Network.webSocketFrameSent') {
      const d = String(p.response && p.response.payloadData || '');
      if (/heartbeat/.test(d) && /phoenix/.test(d)) return;
      frames.push({ t: Date.now(), dir: m.endsWith('Sent') ? '→' : '←', d: d.replace(/"access_token":"[^"]+"/g, '"access_token":"…"').slice(0, 260) });
    } else if (m === 'Network.webSocketClosed' || m === 'Network.webSocketCreated') frames.push({ t: Date.now(), dir: '··', d: m + ' ' + (p.url || '').replace(/apikey=[^&]+/, 'apikey=…') });
  });
  await cli.enviar('Network.enable');
  let n = null, fila = null;
  try {
    await cli.enviar('Page.navigate', { url: URL_APP });
    await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000);
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(USU)}; document.getElementById('loginPin').value=${JSON.stringify(PIN)}; panelDoLogin(); 1`);
    await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario==='${USU}'`, 60000);
    await ev(`go('miportal'); 1`);
    await esperar(`window.__portalVivo&&window.__portalVivo.hizo==='escuchando'`, 45000);
    await pausa(4000);
    const tDisp = Date.now();
    const r = await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"${USU}","rol":"vendedor"}}',true),
      red_autopedido_directo(jsonb_build_object('action','redAutopedido','clientOrderId','np-red-sock-'||floor(extract(epoch from now()))::text,'canal','Red',
        'nombre','PRUEBA Robot','telefono','5490000000001','barrioPrivado','PRUEBA','lote','','dia','Viernes',
        'fechaEntrega',to_char(_red_primer_viernes_autopedido(now() AT TIME ZONE 'America/Argentina/Buenos_Aires'),'YYYY-MM-DD'),
        'horario','A coordinar','pago','Transferencia','envio',0,'items',jsonb_build_array(jsonb_build_object('id',1,'qty',1)),'total',1)) r`);
    const res = r[r.length - 1].r; n = res && res.n;
    if (n) fila = (await sql(`SELECT source_row r FROM sales_order WHERE order_key='Red|${n}'`))[0].r;
    console.log('disparo: Red #' + n);
    await pausa(Number(process.env.ESPERA_MS || 15000));
    console.log('--- frames (relativos al disparo, ms) ---');
    frames.forEach((f) => console.log(String(f.t - tDisp).padStart(7), f.dir, f.d));
  } catch (e) { console.log('MAL', e.message); }
  finally {
    if (n && fila !== null) await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true), pedido_cancelar_directo('{"action":"cancelarPedido","hoja":"Red","id":"${n}","row":${fila},"clientOpId":"robot-sock-cancel-${n}"}'::jsonb)`).catch(() => {});
    cli.matar();
  }
})();
