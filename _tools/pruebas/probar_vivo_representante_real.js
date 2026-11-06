/* TIEMPO REAL DE PUNTA A PUNTA, CONTRA PRODUCCIÓN, con un rol que Realtime deja escuchar (5/11/2026).
   node _tools/pruebas/probar_vivo_representante_real.js
   Entra como el representante de prueba (pruebarobot, rol vendedor: su canal erp:red:pruebarobot está permitido), abre
   Mi Portal y, desde la base (como si fuera otro aparato), le carga un autopedido PRUEBA. Mide si el portal se entera SOLO
   (socket → permiso → señal de la base → recarga de la pantalla). Al final cancela ese pedido. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const j = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const USU = j.repUsuario || 'pruebarobot', PIN = String(j.pinRep || '');
const sql = async (q) => (await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs')).sql(q);
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c || d === undefined ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
(async () => {
  if (!PIN) { console.log('falta pinRep en ~/.maleu/robot.json'); process.exit(2); }
  const cli = await cdp.abrir();
  const ev = (expr, ms) => Promise.race([cdp.evaluar(cli, expr), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 20000))]);
  const esperar = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(expr, 10000); if (v) return v; } catch (e) {} await pausa(200); } return null; };
  let n = null, fila = null;
  try {
    await cli.enviar('Page.navigate', { url: URL_APP });
    await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000);
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(USU)}; document.getElementById('loginPin').value=${JSON.stringify(PIN)}; panelDoLogin(); 1`);
    chk('entró como ' + USU, !!await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario==='${USU}'`, 60000));
    await ev(`go('miportal'); 1`);
    const esc = await esperar(`window.__portalVivo&&window.__portalVivo.hizo==='escuchando'?window.__portalVivo.canal:''`, 45000);
    chk('Mi Portal escucha su canal en vivo (' + (esc || '—') + ')', !!esc, await ev(`JSON.stringify(window.__portalVivo||null)`).catch(() => ''));
    const unido = await esperar(`(function(){try{var c=_ENV&&_ENV.canales&&_ENV.canales['erp:red:${USU}'];return c&&(c.unido||c.estado==='unido'||c.ok)?'si':'';}catch(e){return '';}})()`, 20000);
    console.log('  (estado del canal: ' + (await ev(`(function(){try{return JSON.stringify(Object.assign({},_ENV.canales['erp:red:${USU}'],{oyentes:undefined,fs:undefined}));}catch(e){return '?';}})()`).catch(() => '?')).slice(0, 200) + ')');
    await pausa(3000);
    // Desde «otro aparato»: un autopedido del representante de prueba para el primer viernes que permite el corte.
    const t0 = Date.now();
    const r = await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"${USU}","rol":"vendedor"}}',true),
      red_autopedido_directo(jsonb_build_object('action','redAutopedido','clientOrderId','np-red-vivo-'||floor(extract(epoch from now()))::text,'canal','Red',
        'nombre','PRUEBA Robot','telefono','5490000000001','barrioPrivado','PRUEBA','lote','','dia','Viernes',
        'fechaEntrega',to_char(_red_primer_viernes_autopedido(now() AT TIME ZONE 'America/Argentina/Buenos_Aires'),'YYYY-MM-DD'),
        'horario','A coordinar','pago','Transferencia','envio',0,'items',jsonb_build_array(jsonb_build_object('id',1,'qty',1)),'total',1)) r`);
    const res = r[r.length - 1].r; n = res && (res.n || (res.ref || '').replace(/\D/g, ''));
    chk('autopedido de prueba cargado desde la base (Red #' + n + ')', !!(res && res.ok), res);
    if (n) fila = (await sql(`SELECT source_row r FROM sales_order WHERE order_key='Red|${n}'`))[0].r;
    const recargo = await esperar(`window.__portalVivo&&window.__portalVivo.t>${t0}&&/portal de la base|pendiente|Mi Portal no/.test(window.__portalVivo.hizo)?JSON.stringify(window.__portalVivo):''`, 40000);
    chk('el portal se enteró SOLO y releyó de la base en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s', !!recargo && /portal de la base/.test(recargo), recargo || await ev(`JSON.stringify(window.__portalVivo||null)`).catch(() => ''));
  } catch (e) { mal++; console.log('  MAL ' + e.message); }
  finally {
    if (n && fila !== null) await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true), pedido_cancelar_directo('{"action":"cancelarPedido","hoja":"Red","id":"${n}","row":${fila},"clientOpId":"robot-vivo-cancel-${n}"}'::jsonb)`).then(() => console.log('  (Red #' + n + ' cancelado)')).catch((e) => console.log('  NO SE CANCELÓ Red #' + n + ': ' + e.message));
    cli.matar();
  }
  console.log((mal ? 'MAL' : 'OK') + ' — ' + ok + ' bien, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
