// node probar_vendedores_admin.js <token> [390|1440] [puerto|URL] <abiertos.json>
// La tab «Vendedores» de Tadeo y Lucas (6/10/2026): los pedidos abiertos de TODOS
// los vendedores a la vez, con Entregado / Cobrado / Pagado a Maleu, sin «Ver como».
// Sesión real; `redPedidosAbiertos` se contesta con <abiertos.json> (la salida del
// backend nuevo corrida sobre una foto real, en el scratchpad: tiene clientes) y
// TODOS los POST se interceptan y se anotan: no sale ninguno a producción.
// Contra producción (v533, sin la tab) da rojo.
const fs = require('fs');
const { abrir, evaluar } = require(__dirname + '/cdp.js');
const TOKEN = process.argv[2], W = Number(process.argv[3] || 390);
const URL = /^http/.test(process.argv[4] || '') ? process.argv[4] : 'http://localhost:' + (process.argv[4] || 8117) + '/app.html';
const AB = fs.readFileSync(process.argv[5], 'utf8');
const EXTRA = 'window.__posts=[];(function(){var o=window.fetch;window.fetch=function(u,x){'
  + 'if(x&&String(x.method||"").toUpperCase()==="POST"){try{window.__posts.push(JSON.parse(x.body));}catch(e){}return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{"Content-Type":"application/json"}}));}'
  + 'if(/action=redPedidosAbiertos/.test(String(u)))return Promise.resolve(new Response(' + JSON.stringify(AB) + ',{status:200,headers:{"Content-Type":"application/json"}}));'
  + 'return o.apply(this,arguments);};})();';
const PREP = require(__dirname + '/sesion_prep.js')(TOKEN, EXTRA);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return Date.now() - t0; } catch (e) {} await sleep(400); } return -1; }
setTimeout(() => { console.log('TIMEOUT global'); process.exit(2); }, 200000);
(async () => {
  const cli = await abrir();
  const dialogos = [];
  try {
    await cli.enviar('Page.enable');
    cli.escuchar((m, pa) => { if (m === 'Page.javascriptDialogOpening') { dialogos.push(pa.message); cli.enviar('Page.handleJavaScriptDialog', { accept: pa.type === 'confirm' }); } });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: 844, deviceScaleFactor: 1, mobile: W < 800 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: URL });
    await esperar(cli, 'typeof go==="function"&&document.readyState==="complete"', 30000);
    console.log('La tab Vendedores (' + W + 'px)');
    await sleep(1500);
    const lbl = await evaluar(cli, '(function(){var b=document.querySelector(\'.bn[data-p="miportal"]\');return b?{l:b.querySelector(".bn-lbl").textContent,tip:b.getAttribute("data-tip")}:null})()');
    chk('para el admin la tab se llama «Vendedores»', lbl && lbl.l === 'Vendedores' && lbl.tip === 'Vendedores', lbl);
    await evaluar(cli, 'setTimeout(function(){go("miportal")},0),1');
    const t = await esperar(cli, '!!document.querySelector("#va-box .va-p")', 60000);
    console.log('   pedidos pintados en ' + t + ' ms');
    const hdr = await evaluar(cli, '(document.getElementById("hdrTitle")||{}).textContent');
    chk('el encabezado dice «Vendedores»', hdr === 'Vendedores', hdr);
    const v = await evaluar(cli, `(function(){var b=document.getElementById('va-box');return {vend:[].map.call(b.querySelectorAll('.va-vend > b'),function(x){return x.textContent}),
      peds:b.querySelectorAll('.va-p').length, fede:([].filter.call(b.querySelectorAll('.va-p'),function(x){return /#112/.test(x.textContent)})[0]||{}).textContent,
      chicos:[].filter.call(b.querySelectorAll('button'),function(x){var r=x.getBoundingClientRect();return r.height<44}).length, botones:b.querySelectorAll('button').length,
      ancho:document.documentElement.scrollWidth}})()`);
    console.log('   ' + v.vend.join(' | '));
    chk('los 4 vendedores en una sola pantalla', v.vend.length === 4, v.vend);
    chk('los 6 pedidos abiertos (Marcos 4, Rufino 1, Fede 1)', v.peds === 6, v.peds);
    chk('Fede #112: debe la liquidación vieja y ofrece «Pagado a Maleu»', /Debe a Maleu \$965\.420 \(regla vieja\)/.test(v.fede || '') && /Pagado a Maleu/.test(v.fede || ''), v.fede);
    chk('botones de 44 px o más (' + v.botones + ')', v.botones > 0 && v.chicos === 0, v.chicos);
    chk('sin scroll horizontal', v.ancho <= W, v.ancho);
    // Marcar entregado un pedido de Marcos, sin entrar con «Ver como»
    await evaluar(cli, `(function(){var c=[].filter.call(document.querySelectorAll('#va-box .va-p'),function(x){return /#108/.test(x.textContent)})[0];c.querySelector('button.prim').click();return 1})()`);
    await sleep(800);
    let posts = await evaluar(cli, 'window.__posts');
    const p1 = posts.find((x) => x.action === 'updatePedidoRed');
    chk('Entregado manda updatePedidoRed con el vendedor del pedido', p1 && p1.pedidoId === '108' && p1.vendedor === 'Marcos Bottcher' && p1.updates.entrega === true, p1);
    chk('pidió confirmación antes', dialogos.some((m) => /Marcos entregó el pedido #108/.test(m)), dialogos);
    // Cobrado en efectivo de Rufino: manda forma de pago y el monto que vio
    await evaluar(cli, `(function(){var c=[].filter.call(document.querySelectorAll('#va-box .va-p'),function(x){return /#107/.test(x.textContent)})[0];[].filter.call(c.querySelectorAll('button'),function(b){return /efectivo/.test(b.textContent)})[0].click();return 1})()`);
    await sleep(800);
    posts = await evaluar(cli, 'window.__posts');
    const p2 = posts.filter((x) => x.action === 'updatePedidoRed').find((x) => x.pedidoId === '107');
    chk('Cobrado · efectivo: forma Efectivo, cobroCliente y montoVisto $39.600 + envío', p2 && p2.updates.formaPagoCliente === 'Efectivo' && p2.updates.cobroCliente === true && p2.updates.montoVisto > 0, p2);
    // Pagado a Maleu de Fede
    await evaluar(cli, `(function(){var c=[].filter.call(document.querySelectorAll('#va-box .va-p'),function(x){return /#112/.test(x.textContent)})[0];[].filter.call(c.querySelectorAll('button'),function(b){return /Pagado a Maleu/.test(b.textContent)})[0].click();return 1})()`);
    await sleep(800);
    posts = await evaluar(cli, 'window.__posts');
    const p3 = posts.filter((x) => x.action === 'updatePedidoRed').find((x) => x.pedidoId === '112');
    chk("Pagado a Maleu: estadoPagoMaleu para Federico D'Andrea", p3 && p3.vendedor === "Federico D'Andrea" && p3.updates.estadoPagoMaleu === true, p3);
    chk('avisa que la plata se registra en Ruta › Cobros › Recibí', dialogos.some((m) => /Ruta › Cobros › Recibí/.test(m)));
    const err = await evaluar(cli, 'window.__err');
    chk('sin errores de JS', !err.length, err);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  process.exit(mal ? 1 : 0);
})();
