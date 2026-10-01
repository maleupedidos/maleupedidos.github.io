/* MI PORTAL: EL COBRO MANDA EL MONTO QUE EL VENDEDOR VIO. (1/10/2026)
 *
 *   node _tools/servir.js                        (en otra terminal)
 *   node _tools/pruebas/probar_cobro_red_monto.js [red.html]
 *
 * El backend compara `montoVisto` contra la planilla y, si no coinciden, no
 * cobra (`montoDistinto`). Esta prueba sostiene la mitad del front:
 *
 *   - RUTA > Cobrado y el detalle > Cobrado mandan montoVisto = productos + envio.
 *   - El cartel del detalle dice ese mismo monto (antes decia solo productos).
 *   - Si el backend rechaza: la pantalla deja de decir Cobrado, avisa con los
 *     dos numeros y pide datos frescos.
 *   - Cambiar la forma de pago manda SOLO la forma de pago: antes mandaba un
 *     monto sin el envio y el backend marcaba el pedido Cobrado.
 *   - El Mixto del detalle no se guarda si no suma el total con envio.
 *
 * Corre sobre `red.html?standalone=1`, con la sesion y el pedido sembrados y
 * el backend simulado: ningun POST sale de la maquina. Datos inventados.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const ARCH = process.argv[2] || 'red.html';
const BASE = process.env.BASE || 'http://localhost:8080';

let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d).slice(0, 300)); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));

const PREP = `
(function(){
  try{
    localStorage.setItem('maleu_token','tok-prueba');
    localStorage.setItem('maleu_red_session',JSON.stringify({nombre:'Vend Prueba',wa:'',comision:17}));
  }catch(e){}
  window.__posts=[]; window.__gets=0; window.__alerts=[]; window.__confirms=[];
  window.__resp={ok:true}; window.__pend=[]; window.__diferir=false; window.__sinRed=false;
  window.alert=function(m){window.__alerts.push(String(m));};
  window.confirm=function(m){window.__confirms.push(String(m));return true;};
  window.fetch=function(u,i){
    var url=(typeof u==='string')?u:((u&&u.url)||'');
    if(i&&String(i.method||'').toUpperCase()==='POST'){
      var b=null; try{b=JSON.parse(i.body);}catch(e){}
      window.__posts.push(b);
      var resp=window.__resp;
      /* __diferir: el POST queda en vuelo hasta que la prueba lo suelte con
         __pend[i]({...}). __sinRed: el fetch falla como sin conexion. */
      if(window.__diferir&&b&&b.action==='redEnvioAnular'){
        return new Promise(function(res){window.__pend.push(function(r){
          res({ok:true,json:function(){return Promise.resolve(r);}});});});
      }
      if(window.__sinRed)return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve({ok:true,json:function(){return Promise.resolve(resp);}});
    }
    if(/dashboardVendedor/.test(url))window.__gets++;
    return new Promise(function(){});   // los GET no vuelven: no pisan lo sembrado
  };
})();`;

const PED = { n: 'R-101', c: 'Cliente Prueba', $: 20000, env: 3000, es: 'Entregado', ep: 'No Cobrado',
  fp: 'Efectivo', vi: true, b: 'Barrio', l: 1, prods: [{ a: 'PPM', q: 2 }], pEf: 0, pTr: 0 };
const SEMBRAR = `(function(){
  lastDashboardData={pedidos:[${JSON.stringify(PED)}],stats:{semana:{}}};
  session={nombre:'Vend Prueba',wa:'',comision:17};
  rutaIdx=0;
  /* Contra la version vieja son strings (let); desde el 1/10 son Set (const). */
  if(redEnvioEnVuelo&&redEnvioEnVuelo.clear)redEnvioEnVuelo.clear(); else redEnvioEnVuelo='';
  if(redEnvioSinVerificar&&redEnvioSinVerificar.clear)redEnvioSinVerificar.clear(); else redEnvioSinVerificar='';
  __posts.length=0; __alerts.length=0; __confirms.length=0; __gets=0; __resp={ok:true};
  __pend.length=0; __diferir=false; __sinRed=false;
  return true;})()`;
const EP = `lastDashboardData.pedidos[0].ep`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE + '/' + ARCH + '?standalone=1' });
    for (let i = 0; i < 60; i++) { try { if (await evaluar(cli, `typeof rutaToggleCobrado==='function'&&typeof updatePedido==='function'`) === true) break; } catch (e) {} await pausa(250); }
    await pausa(500);
    console.log('\n== Mi Portal: el cobro manda el monto que el vendedor vio ==');

    console.log('\n-- RUTA > Cobrado, el backend acepta --');
    await evaluar(cli, SEMBRAR);
    await evaluar(cli, 'rutaToggleCobrado()');
    await pausa(300);
    let posts = await evaluar(cli, '__posts');
    let u = (posts[0] || {}).updates || {};
    chk('manda montoVisto = productos + envio (23.000)', u.cobroCliente === true && u.montoVisto === 23000, u);
    chk('y queda Cobrado', await evaluar(cli, EP) === 'Cobrado');

    console.log('\n-- RUTA > Cobrado, el backend RECHAZA (la planilla dice otra cosa) --');
    await evaluar(cli, SEMBRAR);
    await evaluar(cli, `__resp={ok:false,montoDistinto:true,montoPlanilla:26000,montoVisto:23000,err:'x'}`);
    await evaluar(cli, 'rutaToggleCobrado()');
    await pausa(400);
    chk('la pantalla deja de decir Cobrado', await evaluar(cli, EP) === 'No Cobrado', await evaluar(cli, EP));
    let al = await evaluar(cli, '__alerts');
    chk('avisa con los dos numeros', al.length === 1 && /23\.000/.test(al[0]) && /26\.000/.test(al[0]), al);
    chk('y pide datos frescos', await evaluar(cli, '__gets') >= 1, await evaluar(cli, '__gets'));

    /* El DETALLE no se abre desde ningun lado (ni en v466): `showDetalle` solo se
       llama a si misma y revienta en #ctrl-pago-maleu, que no existe desde
       72b897b. Se prueban sus funciones igual, con `currentPedido` puesto a mano
       y el repintado anulado, por si alguien lo vuelve a enganchar. */
    await evaluar(cli, 'showDetalle=function(){}; true');
    console.log('\n-- el DETALLE > Cobrado (codigo muerto hoy) --');
    await evaluar(cli, SEMBRAR);
    await evaluar(cli, `currentPedido=lastDashboardData.pedidos[0]; true`);
    await pausa(200);
    await evaluar(cli, '__posts.length=0; toggleCobrado()');
    await pausa(300);
    const conf = await evaluar(cli, '__confirms');
    chk('el cartel dice lo que paga el cliente (23.000), no solo productos', conf.length === 1 && /23\.000/.test(conf[0]), conf);
    posts = await evaluar(cli, '__posts');
    u = (posts[0] || {}).updates || {};
    chk('y manda montoVisto 23.000', u.montoVisto === 23000, u);
    await evaluar(cli, `__resp={ok:false,montoDistinto:true,montoPlanilla:26000,montoVisto:23000}`);
    await evaluar(cli, `lastDashboardData.pedidos[0].ep='No Cobrado'; __alerts.length=0; toggleCobrado()`);
    await pausa(400);
    chk('rechazado desde el detalle: tambien vuelve a No Cobrado', await evaluar(cli, EP) === 'No Cobrado');
    chk('  y avisa', (await evaluar(cli, '__alerts')).length === 1);

    console.log('\n-- cambiar la forma de pago NO cobra --');
    await evaluar(cli, SEMBRAR);
    await evaluar(cli, `currentPedido=lastDashboardData.pedidos[0]; true`);
    await evaluar(cli, `__posts.length=0; setFormaPago('Transferencia')`);
    await pausa(300);
    posts = await evaluar(cli, '__posts');
    chk('manda solo la forma de pago', posts.length === 1 && JSON.stringify(Object.keys(posts[0].updates)) === '["formaPagoCliente"]', posts.map(p => p.updates));
    chk('y el pedido sigue sin cobrar', await evaluar(cli, EP) === 'No Cobrado');

    console.log('\n-- el Mixto del detalle tiene que sumar el total con envio --');
    await evaluar(cli, SEMBRAR);
    await evaluar(cli, `currentPedido=lastDashboardData.pedidos[0]; true`);
    const mix = async (ef, tr) => evaluar(cli, `(function(){
      document.getElementById('ctrl-mix-ef').value='${ef}'; document.getElementById('ctrl-mix-tr').value='${tr}';
      ctrlMixtoActualizar(); return document.getElementById('ctrl-mix-guardar').disabled;})()`);
    chk('20.000 + 0 (sin el envio): el boton queda apagado', await mix(20000, 0) === true);
    chk('20.000 + 3.000: se puede guardar', await mix(20000, 3000) === false);
    await evaluar(cli, `__posts.length=0; document.getElementById('ctrl-mix-ef').value='20000'; document.getElementById('ctrl-mix-tr').value='0'; ctrlMixtoGuardar()`);
    await pausa(200);
    chk('y aunque se llame igual, sin sumar el total no manda nada', (await evaluar(cli, '__posts')).length === 0, await evaluar(cli, '__posts'));

    /* ── Codex sobre 547be09 (1/10/2026) ─────────────────────────────────── */
    console.log('\n-- RUTA > Cobrado: un rechazo CONFIRMADO (LockTimeout) deshace --');
    await evaluar(cli, SEMBRAR);
    await evaluar(cli, `__resp={ok:false,error:'LockTimeout',retry:true}`);
    await evaluar(cli, 'rutaToggleCobrado()');
    await pausa(400);
    chk('la pantalla vuelve a No Cobrado: el backend no escribio nada', await evaluar(cli, EP) === 'No Cobrado', await evaluar(cli, EP));
    chk('  sin el alert del monto (no es una diferencia de plata)', (await evaluar(cli, '__alerts')).length === 0);

    await evaluar(cli, SEMBRAR);
    await evaluar(cli, `currentPedido=lastDashboardData.pedidos[0]; __resp={ok:false,error:'LockTimeout',retry:true}; toggleCobrado()`);
    await pausa(400);
    chk('updatePedido (detalle): el rechazo confirmado tambien deshace', await evaluar(cli, EP) === 'No Cobrado', await evaluar(cli, EP));

    console.log('\n-- RUTA > Cobrado: sin conexion NO deshace (no sabemos si llego) --');
    await evaluar(cli, SEMBRAR);
    await evaluar(cli, `__sinRed=true`);
    await evaluar(cli, 'rutaToggleCobrado()');
    await pausa(400);
    chk('sigue diciendo Cobrado', await evaluar(cli, EP) === 'Cobrado', await evaluar(cli, EP));

    console.log('\n-- dos envios anulados en vuelo: el candado es POR PEDIDO --');
    await evaluar(cli, SEMBRAR);
    await evaluar(cli, `(function(){
      var b=JSON.parse(JSON.stringify(lastDashboardData.pedidos[0])); b.n='R-102'; b.c='Cliente B'; b.l=2;
      lastDashboardData.pedidos.push(b); __diferir=true; return true;})()`);
    const idxDe = n => evaluar(cli, `_rutaList().findIndex(function(x){return x.n==='${n}';})`);
    const iA = await idxDe('R-101'), iB = await idxDe('R-102');
    chk('los dos pedidos estan en la ruta', iA >= 0 && iB >= 0, { iA, iB });
    await evaluar(cli, `rutaIdx=${iA}; rutaEnvioAnular(true)`);
    await evaluar(cli, `rutaIdx=${iB}; rutaEnvioAnular(true)`);
    await pausa(200);
    chk('salieron las dos anulaciones', (await evaluar(cli, '__pend.length')) === 2);
    // Vuelve SOLO la de B.
    await evaluar(cli, `__pend[1]({ok:true,sello:'3000 | Vend Prueba | hoy'})`);
    await pausa(300);
    const A = `_rutaList().find(function(x){return x.n==='R-101';})`;
    chk('A sigue trabado mientras su POST vuela', await evaluar(cli, `_envioTrabado(${A})`) === true);
    await evaluar(cli, `__posts.length=0; rutaIdx=_rutaList().findIndex(function(x){return x.n==='R-101';}); rutaToggleCobrado()`);
    await pausa(300);
    chk('y Cobrado sobre A no sale', (await evaluar(cli, `__posts.filter(function(p){return p.action==='updatePedidoRed';}).length`)) === 0,
      await evaluar(cli, '__posts'));
    chk('B (ya volvio) quedo libre', await evaluar(cli, `_envioTrabado(_rutaList().find(function(x){return x.n==='R-102';}))`) === false);
    await evaluar(cli, `__pend[0]({ok:true,sello:'3000 | Vend Prueba | hoy'})`);
    await pausa(300);
    chk('cuando vuelve la de A, A se suelta', await evaluar(cli, `_envioTrabado(${A})`) === false);
  } catch (e) {
    mal++; console.log('  MAL  la prueba revento: ' + (e && e.message));
  }
  console.log(`\n${ok} ok · ${mal} mal`);
  salir(mal ? 1 : 0);
})();
