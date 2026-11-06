/* Diagnóstico (5/11/2026): ¿llega la señal en vivo de un pedido nuevo y qué hace la pantalla con ella? Producción, usuario robot.
   node _tools/pruebas/diagnosticar_vivo_pedidos.js   (crea un «PRUEBA Robot» y lo cancela al final) */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const sql = async (q) => (await import('file:///C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/copia-supabase/estancias/_tools/sql_base.mjs')).sql(q);
(async () => {
  const cli = await cdp.abrir();
  const ev = (expr, ms) => Promise.race([cdp.evaluar(cli, expr), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms || 30000))]);
  const esperar = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(expr, 10000); if (v) return v; } catch (e) {} await pausa(250); } return null; };
  let n = null, fila = null;
  try {
    await cli.enviar('Page.navigate', { url: URL_APP });
    await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000);
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))}; panelDoLogin(); 1`);
    await esperar(`typeof SESSION!=='undefined'&&SESSION&&!!SESSION.usuario`, 60000);
    await ev(`go('pedidos'); 1`);
    await esperar(`(document.getElementById('pedEnVivo')||{}).textContent&&/●\s*en vivo/.test(document.getElementById('pedEnVivo').textContent)`, 45000);
    console.log('sesion', await ev(`JSON.stringify({u:SESSION.usuario,rol:SESSION.rol,arma:_palancaVal('pedidosArma'),sello:(document.getElementById('pedEnVivo')||{}).textContent,canales:Object.keys((_ENV&&_ENV.canales)||{})})`));
    await ev(`(function(){window.__s=[];var f=_pedVivoSenal;window._pedVivoSenal=function(p){window.__s.push({t:Date.now(),p:p});return f.apply(this,arguments);};
      var g=_pedVivoAplicar;window._pedVivoAplicar=function(l,d){window.__s.push({t:Date.now(),aplicar:(l||[]).map(function(q){return q&&(q.h+'|'+q.n+'|'+q.c);})});return g.apply(this,arguments);};
      var h=_enVivoRepartir;window._enVivoRepartir=function(){window.__s.push({t:Date.now(),repartir:[].slice.call(arguments).map(function(x){return typeof x==='string'?x:JSON.stringify(x).slice(0,200);})});return h.apply(this,arguments);};
      return 1;})()`);
    const alta = await sql(`SELECT set_config('request.jwt.claims','{"role":"anon"}',true), pedido_alta_directo('{"canal":"Home","nombre":"PRUEBA Robot","telefono":"5490000000001","barrioPrivado":"Estancias del Pilar","subBarrio":"","lote":"1","pago":"Efectivo","envio":0,"dia":"Sábado","fechaEntrega":"2026-11-07","horario":"19 a 21 hs","items":[{"id":1,"qty":1}],"total":11500,"clientOrderId":"co_${Date.now()}_diag${Date.now().toString(36)}"}'::jsonb) r`);
    n = String(alta[alta.length - 1].r.n); fila = (await sql(`SELECT source_row r FROM sales_order WHERE order_key='Home|${n}'`))[0].r;
    console.log('alta Home #' + n);
    await pausa(15000);
    console.log('señales', await ev(`JSON.stringify(window.__s)`));
    console.log('en D.pedidos', await ev(`(D&&D.pedidos||[]).filter(function(p){return p&&p.h==='Home'&&String(p.n)==='${n}';}).map(function(p){return {c:p.c,es:p.es,r:p.r,deSupa:p._deSupabase};})`));
    console.log('lectura directa', await ev(`_sbPedidosClaves(['Home|${n}']).then(function(l){return JSON.stringify(l);})`));
    console.log('se dibuja', await ev(`document.body.innerHTML.indexOf('#${n}')>-1||document.body.innerText.indexOf('${n}')>-1`));
  } catch (e) { console.log('MAL', e.message); }
  finally {
    if (n) await sql(`SELECT set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"usuario":"tadeo","rol":"admin"}}',true), pedido_cancelar_directo('{"action":"cancelarPedido","hoja":"Home","id":"${n}","row":${fila},"clientOpId":"diag-cancel-${n}"}'::jsonb)`).catch((e) => console.log('NO SE CANCELÓ', n, e.message));
    cli.matar();
  }
})();
