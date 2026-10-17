/* UN BILLETE PARA VARIOS PEDIDOS: el aviso de Caja no lo marca como error (17/10/2026).
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_billete_varios_pedidos.js
 *   APP=app_viejo_tmp.html ...                <- con el codigo de antes, rojo
 *
 * Vicky pago #1120, #1123 y #1170 con $220.000 (el billete queda anotado en el
 * primero) y Caja decia «sobran $144.459». Catu, lo mismo con #1118, #1124 y
 * #1185. Los montos son los del viernes 16/10; nombres y telefonos inventados
 * (el repo es publico). Lo que tiene que ser cierto:
 *   · un billete que cierra con todos los pedidos de esa casa ese dia no avisa;
 *   · uno que tampoco cierra junto, avisa con el grupo entero;
 *   · sin telefono, fila por fila como siempre.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const EXTRA = `(function(){try{localStorage.clear();localStorage.setItem('maleu_token','x');
localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));}catch(e){}
var o=window.fetch;window.fetch=function(u,x){var url=String((u&&u.url)||u||'');if(url.indexOf('script.google.com')<0)return o.apply(this,arguments);
return Promise.resolve(new Response(JSON.stringify({ok:true,ts:Date.now()}),{status:200,headers:{'Content-Type':'application/json'}}));};})();`;

const fila = (c, id, cobro, rec, t, q) => ({ c: c, id: String(id), h: 'Home', cobro: cobro, vto: 0, tipo: '', q: q || 'Tadeo Ustariz', rec: rec, t: t });
const VICKY = [fila('Cliente A', 1120, 75541.5, 220000, '1100000001'), fila('Cliente A bis', 1123, 43213.5, 0, '1100000001'), fila('cliente a', 1170, 101245, 0, '1100000001')];
const CATU = [fila('Cliente B', 1118, 137400, 220000, '1100000002', 'Lucas Moresco'), fila('Cliente B', 1124, 30600, 0, '1100000002', 'Lucas Moresco'), fila('cliente b', 1185, 52000, 0, '1100000002', 'Lucas Moresco')];

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    for (let i = 0; i < 300; i++) { if (await evaluar(cli, `typeof _efAvisosHtml==='function'`)) break; await pausa(200); }
    const aviso = det => evaluar(cli, `(function(){var d=document.createElement('div');d.innerHTML=_efAvisosHtml({det:${JSON.stringify(det)}},true);var a=d.querySelector('.efm-alerta');return a?a.textContent:'';})()`);
    console.log('\n== un billete para varios pedidos · ' + APP + ' ==');
    let a = await aviso(VICKY.concat(CATU));
    chk('Vicky y Catu (billete = suma de sus pedidos): sin aviso', !/no cierra/.test(a), a);
    a = await aviso([fila('Cliente C', 2001, 47790, 50000, '1100000003'), fila('Cliente C', 2002, 1000, 0, '1100000003')]);
    chk('billete de $50.000 para $48.790: avisa «sobran $1.210» con los dos pedidos', /1 cobro no cierra/.test(a) && /2 pedidos/.test(a) && /#2001/.test(a) && /#2002/.test(a) && /sobran \$1\.210/.test(a), a);
    a = await aviso([fila('Cliente D', 3001, 9000, 10000, ''), fila('Cliente D', 3002, 1000, 0, '')]);
    chk('sin teléfono, fila por fila (sobran $1.000 del #3001)', /1 cobro no cierra/.test(a) && /sobran \$1\.000/.test(a) && !/pedidos/.test(a), a);
    a = await aviso([fila('Cliente E', 4001, 30000, 30000, '1100000005'), fila('Cliente E', 4002, 5000, 0, '1100000005')]);
    chk('un billete que cierra solo no arrastra a la otra fila de la casa', !/no cierra/.test(a), a);
    a = await aviso([fila('Cliente F', 5001, 20000, 50000, '1100000006', 'Tadeo Ustariz'), fila('Cliente F', 5002, 30000, 0, '1100000006', 'Lucas Moresco')]);
    chk('lo que cobró OTRA persona no se junta (avisa)', /1 cobro no cierra/.test(a), a);
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
