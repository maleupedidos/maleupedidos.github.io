/* DOS APARATOS A LA VEZ, CONTRA PRODUCCIÓN (5/11/2026, pedido de Tadeo: «ver en dos usuarios a la vez si funciona en tiempo real»).
   OJO (5/11): el robot tiene rol «robot» y Realtime solo abre los canales a admin, representante o repartidor: con el robot el
   sello dice «en vivo no disponible» y esta prueba FALLA por diseño. Sirve con un usuario admin (ROBOT_JSON apuntando a otro).
   node _tools/pruebas/probar_dos_aparatos_vivo.js
   Abre DOS Chrome independientes (perfiles distintos = dos celulares) con el usuario robot (~/.maleu/robot.json), los dos en
   Pedidos. Desde la base (como si fuera un tercer aparato) entra un pedido «PRUEBA Robot» (teléfono del robot: no sale ningún
   mensaje, el robot lo limpia a la mañana), se arma y se cancela. Mide cuánto tarda cada pantalla en enterarse SOLA, sin ↻.
   No toca pedidos reales. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
let sqlMod = null;
const sql = async (q) => { if (!sqlMod) sqlMod = await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs'); return sqlMod.sql(q); };
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c || d === undefined ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };

async function aparato(nombre) {
  const cli = await cdp.abrir();
  const ev = (expr, ms) => Promise.race([cdp.evaluar(cli, expr), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 30000))]);
  const esperar = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(expr, 10000); if (v) return v; } catch (e) {} await pausa(250); } return null; };
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Page.navigate', { url: URL_APP });
  if (!await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000)) throw new Error(nombre + ': no apareció el login');
  await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))}; document.getElementById('loginRemember').checked=true; panelDoLogin(); 1`);
  if (!await esperar(`typeof SESSION!=='undefined'&&SESSION&&!!SESSION.usuario&&!document.getElementById('reentrada')`, 60000)) throw new Error(nombre + ': no entró');
  await ev(`go('pedidos'); 1`);
  return { nombre, cli, ev, esperar };
}

(async () => {
  console.log('Dos aparatos a la vez · ' + URL_APP + ' · usuario ' + cred.usuario);
  const [A, B] = await Promise.all([aparato('A'), aparato('B')]);
  try {
    for (const x of [A, B]) {
      const v = await x.esperar(`(function(){var e=document.getElementById('pedEnVivo');return e&&/●\s*en vivo/.test(e.textContent)?e.textContent:'';})()`, 45000);
      chk(x.nombre + ': Pedidos dice «en vivo»', !!v, await x.ev(`(document.getElementById('pedEnVivo')||{}).textContent||'sin sello'`));
    }
    // 1) Entra un pedido desde «otro aparato» (la tienda).
    const sufijo = Date.now().toString(36);
    const t0 = Date.now();
    const alta = await sql(`SELECT set_config('request.jwt.claims','{"role":"anon"}',true), pedido_alta_directo('{"canal":"Home","nombre":"PRUEBA Robot","telefono":"5490000000001","barrioPrivado":"Estancias del Pilar","subBarrio":"","lote":"1","pago":"Efectivo","envio":0,"dia":"Sábado","fechaEntrega":"2026-11-07","horario":"19 a 21 hs","items":[{"id":1,"qty":1}],"total":11500,"clientOrderId":"co_${Date.now()}_vivo${sufijo}"}'::jsonb) r`);
    const r = alta[alta.length - 1].r; const n = String(r.n);
    chk('el pedido de prueba entró (Home #' + n + ')', r.ok === true, r);
    for (const x of [A, B]) {
      const vio = await x.esperar(`(D&&D.pedidos||[]).some(function(p){return p&&p.h==='Home'&&String(p.n)==='${n}';})`, 40000);
      chk(x.nombre + ': lo ve solo, sin ↻, en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s', !!vio);
    }
    // 2) Otro aparato lo arma: la Ruta de A y B tiene que mostrarlo armado (550).
    const fila = (await sql(`SELECT source_row r FROM sales_order WHERE order_key='Home|${n}'`))[0].r;
    await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true), ruta_armado_directo('{"action":"marcarArmado","pedidos":[{"h":"Home","id":"${n}","r":${fila},"c":"PRUEBA Robot"}],"armado":true,"usuario":"tadeo","ts":1,"clientOpId":"vivo-arm-${sufijo}"}'::jsonb)`);
    const t1 = Date.now();
    for (const x of [A, B]) {
      await x.ev(`go('ruta'); 1`);
      const arm = await x.esperar(`(function(){try{var d=typeof armadoDone!=='undefined'?armadoDone:(window.armadoDone||{});var k='Home|R${fila}';return d[k]&&d[k].u?d[k].u+' '+(d[k].hr||''):'';}catch(e){return '';}})()`, 45000);
      chk(x.nombre + ': Ruta lo muestra armado por otro (' + (arm || '—') + ') en ' + ((Date.now() - t1) / 1000).toFixed(1) + ' s', !!arm);
    }
    // 3) Otro aparato lo cancela: los dos lo ven cancelado.
    for (const x of [A, B]) await x.ev(`go('pedidos'); 1`);
    const t2 = Date.now();
    await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true), pedido_cancelar_directo('{"action":"cancelarPedido","hoja":"Home","id":"${n}","row":${fila},"clientOpId":"vivo-cancel-${sufijo}"}'::jsonb)`);
    for (const x of [A, B]) {
      const can = await x.esperar(`(D&&D.pedidos||[]).some(function(p){return p&&p.h==='Home'&&String(p.n)==='${n}'&&p.es==='Cancelado';})`, 40000);
      chk(x.nombre + ': lo ve cancelado solo, en ' + ((Date.now() - t2) / 1000).toFixed(1) + ' s', !!can);
    }
    for (const x of [A, B]) {
      const errs = await x.ev(`(window.__erroresVistos||[]).length`).catch(() => 0);
      chk(x.nombre + ': sin errores de JavaScript registrados', !errs, errs);
    }
  } catch (e) { mal++; console.log('  MAL ' + e.message); }
  finally { A.cli.matar(); B.cli.matar(); }
  console.log((mal ? 'MAL' : 'OK') + ' — ' + ok + ' bien, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('MAL ' + e.message); process.exit(1); });
