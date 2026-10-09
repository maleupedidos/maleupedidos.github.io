/* Tab Vendedores: ¿a qué cuenta de Maleu entró la transferencia? (9/10/2026)

     node _tools/pruebas/probar_vendedores_cuenta.js <puerto> [390|1440]

   Backend STUBBEADO entero (datos inventados; ningun pedido sale a produccion).
   Con RED_COBRO_A_CAJA prendida, `redPedidosAbiertos` manda `cobroACaja` y las
   cuentas digitales. Sostiene:
   · «Cobrado · transf. a Maleu» en un pedido de la regla del 5/10 pregunta la
     cuenta, sin ninguna elegida, y tocarla manda cobro + cuenta en UN pedido;
   · un pedido que el vendedor ya marco cobrado por transferencia muestra «falta
     decir a qué cuenta» y manda solo la cuenta;
   · un pedido anterior al 5/10 sigue con el «¿seguro?» de siempre, sin cuenta;
   · con la palanca apagada nada de esto aparece. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const PUERTO = Number(process.argv[2] || 8080), W = Number(process.argv[3] || 390);
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const T = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr) === true) return true; } catch (e) {} await T(300); } return false; };

const P = (n, c, o) => Object.assign({ n: n, row: 10, c: c, dia: '06/10', es: 'Entregado', ep: 'No Cobrado', fp: 'Transferencia', cobro: 87600, nueva: true, debe: 0, leDebe: 16350, epm: 'Pendiente', entVend: '', marcadoPor: '' }, o || {});
const AB = (activa) => ({ ok: true, ts: Date.now(), cobroACaja: activa || undefined,
  cuentas: activa ? [{ id: 'mp', nombre: 'Mercado Pago Uno', tipo: 'digital', def: true }, { id: 'brubank', nombre: 'Brubank Dos', tipo: 'digital' }] : undefined,
  vendedores: [{ nombre: "Tres D'Prueba", maleuLeDebe: 0, pedidos: [
    P('901', 'Cliente Uno'),
    P('902', 'Cliente Dos', { ep: 'Cobrado', sinCta: activa || undefined, trDir: activa ? 42600 : undefined, cobro: 42600 }),
    P('903', 'Cliente Tres', { nueva: false, dia: '02/10', debe: 39600, cobro: 39600 })] }] });
const stub = (activa) => `window.__posts=[];window.__AB=${JSON.stringify(AB(activa))};
  (function(){var o=window.fetch;window.fetch=function(u,x){var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0)return o.apply(this,arguments);
    var R=function(c){return Promise.resolve(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(x&&String(x.method||'').toUpperCase()==='POST'){try{window.__posts.push(JSON.parse(x.body));}catch(e){}return R({ok:true});}
    if(/action=redPedidosAbiertos/.test(url))return R(window.__AB);
    return R({ok:false,error:'stub'});};})();`;
const CARD = (n) => `(function(){var c=[].filter.call(document.querySelectorAll('#va-box .va-p'),function(x){return x.innerText.indexOf('#${n}')>=0;})[0];if(!c)return null;
  return {txt:c.innerText.replace(/\\s+/g,' '),btns:[].map.call(c.querySelectorAll('button'),function(b){return b.innerText.trim();})};})()`;
const CLICK = (n, txt) => `(function(){var c=[].filter.call(document.querySelectorAll('#va-box .va-p'),function(x){return x.innerText.indexOf('#${n}')>=0;})[0];
  var b=c&&[].filter.call(c.querySelectorAll('button'),function(x){return x.innerText.trim().indexOf(${JSON.stringify(txt)})===0;})[0];if(b)b.click();return !!b;})()`;

async function abrirTab(cli, activa, dialogos) {
  const id = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('token-de-prueba', stub(activa)) })).identifier;
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
  await esperar(cli, `typeof go==='function' && document.readyState==='complete' && !document.getElementById('boot')`);
  await T(1200);
  await evaluar(cli, 'setTimeout(function(){go("miportal")},0),1');
  const listo = await esperar(cli, `document.querySelectorAll('#va-box .va-p').length===3`, 60000);
  await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: id });
  dialogos.length = 0;
  return listo;
}
setTimeout(() => { console.log('TIMEOUT global'); process.exit(2); }, 240000);
(async () => {
  const cli = await abrir();
  const dialogos = [];
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((m, pa) => { if (m === 'Page.javascriptDialogOpening') { dialogos.push(pa.message); cli.enviar('Page.handleJavaScriptDialog', { accept: pa.type === 'confirm' }); } });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 800 });

    console.log('\n== Tab Vendedores · cuenta de la transferencia · ' + W + 'px ==');
    console.log('Palanca apagada');
    chk('la tab pinta los 3 pedidos', await abrirTab(cli, false, dialogos));
    let c2 = await evaluar(cli, CARD('902'));
    chk('ningún pedido pide cuenta', !/qué cuenta/.test(c2.txt) && c2.btns.every(b => !/cuenta/i.test(b)), c2);
    await evaluar(cli, CLICK('901', 'Cobrado · transf. a Maleu')); await T(500);
    let posts = await evaluar(cli, 'window.__posts');
    chk('«Cobrado · transf. a Maleu» pregunta «¿seguro?» y manda el cobro SIN cuenta, como hoy', dialogos.length === 1 && posts.length === 1 && posts[0].updates.cobroCliente === true && !('cuentaCobro' in posts[0].updates), [dialogos, posts]);

    console.log('Palanca prendida');
    chk('la tab pinta los 3 pedidos', await abrirTab(cli, true, dialogos));
    c2 = await evaluar(cli, CARD('902'));
    chk('el que ya estaba cobrado dice que falta la cuenta, con el monto', /Transfirió \$42\.600 a Maleu · falta decir a qué cuenta/.test(c2.txt) && c2.btns.indexOf('¿A qué cuenta entró?') >= 0, c2);
    await evaluar(cli, CLICK('901', 'Cobrado · transf. a Maleu')); await T(400);
    let c1 = await evaluar(cli, CARD('901'));
    chk('en uno del 5/10 en adelante, «transf. a Maleu» pregunta la cuenta (sin «¿seguro?»)', dialogos.length === 0 && /¿A qué cuenta de Maleu entraron los \$87\.600\?/.test(c1.txt), [dialogos, c1]);
    chk('ofrece las dos cuentas y Cancelar, ninguna elegida de antemano', c1.btns.join('|') === 'Mercado Pago Uno|Brubank Dos|Cancelar', c1.btns);
    chk('todavía no se mandó nada', (await evaluar(cli, 'window.__posts.length')) === 0);
    await evaluar(cli, CLICK('901', 'Cancelar')); await T(300);
    c1 = await evaluar(cli, CARD('901'));
    chk('Cancelar vuelve a los botones de siempre, sin mandar nada', c1.btns.indexOf('Cobrado · transf. a Maleu') >= 0 && (await evaluar(cli, 'window.__posts.length')) === 0, c1.btns);
    await evaluar(cli, CLICK('901', 'Cobrado · transf. a Maleu')); await T(300);
    const med = await evaluar(cli, `(function(){var vw=document.documentElement.clientWidth;var bs=[].slice.call(document.querySelectorAll('#va-box .va-cta button'));return {n:bs.length,h:bs.map(function(b){return Math.round(b.getBoundingClientRect().height);}),fuera:bs.filter(function(b){var r=b.getBoundingClientRect();return r.right>vw+1||r.left<-1;}).length};})()`);
    chk('los 3 botones del selector miden 44 px o más y entran en la pantalla', med.n === 3 && med.h.every(x => x >= 44) && med.fuera === 0, med);
    await evaluar(cli, CLICK('901', 'Brubank Dos')); await T(600);
    posts = await evaluar(cli, 'window.__posts');
    chk('tocar la cuenta manda cobro + cuenta juntos, con el monto visto', posts.length === 1 && posts[0].action === 'updatePedidoRed' && posts[0].pedidoId === '901' && posts[0].vendedor === "Tres D'Prueba"
      && posts[0].updates.cobroCliente === true && posts[0].updates.formaPagoCliente === 'Transferencia' && posts[0].updates.montoVisto === 87600 && posts[0].updates.cuentaCobro === 'brubank', posts);
    await esperar(cli, `document.querySelectorAll('#va-box .va-p').length===3 && !document.querySelector('#va-box .va-cta')`, 8000);
    await evaluar(cli, CLICK('902', '¿A qué cuenta entró?')); await T(400);
    c2 = await evaluar(cli, CARD('902'));
    chk('el ya cobrado pregunta por sus $42.600', /entraron los \$42\.600\?/.test(c2.txt), c2);
    await evaluar(cli, CLICK('902', 'Mercado Pago Uno')); await T(600);
    posts = await evaluar(cli, 'window.__posts');
    chk('y manda SOLO la cuenta (no lo vuelve a cobrar)', posts.length === 2 && JSON.stringify(posts[1].updates) === JSON.stringify({ cuentaCobro: 'mp' }), posts[1]);
    await esperar(cli, `document.querySelectorAll('#va-box .va-p').length===3 && !document.querySelector('#va-box .va-cta')`, 8000);
    await evaluar(cli, CLICK('903', 'Cobrado · transf. a Maleu')); await T(500);
    posts = await evaluar(cli, 'window.__posts');
    chk('un pedido anterior al 5/10 sigue con «¿seguro?» y sin cuenta', dialogos.length === 1 && posts.length === 3 && !('cuentaCobro' in posts[2].updates), [dialogos, posts[2]]);
    const err = await evaluar(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
    console.log('\n' + ok + ' ok · ' + mal + ' MAL');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('ERROR ' + (e && e.stack || e)); salir(2); }
})();
