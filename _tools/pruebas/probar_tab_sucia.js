/* LA TAB DE AL LADO NO QUEDA VIEJA (21/11/2026).
   SBSES=<sbses.json> BASE=http://localhost:8155 [APP=app.html] node probar_tab_sucia.js [390|1440]
   Sesión real de la base en solo lectura. Sostiene:
     · volver a una tab antes de 90 s SIN que nadie escriba no relee (el freno de siempre sigue);
     · después de una escritura confirmada (en otra tab), entrar a Ventas / Inicio / Clientes / Equipo la relee;
     · lo mismo con una señal de la base («erp:pedidos») que llega con la tab escondida.
   Cuenta las lecturas a la base (rpc *_pantalla / *_datos / *_base) en los 4 s después de entrar. */
'use strict';
const P = './';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const CONTAR = `window.__lect=[];(function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||'');var m=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
  if(m&&/_(pantalla|datos|base)$/.test(m[1]))window.__lect.push({f:m[1],t:Date.now()});
  if(/\\/rest\\/v1\\/[a-z_]+\\?/.test(s)&&!m)window.__lect.push({f:'rest:'+s.split('/rest/v1/')[1].split('?')[0],t:Date.now()});
  return o.apply(this,arguments);};})();`;
async function entrarYContar(cli, tab) {
  await evaluar(cli, `window.__lect=[];go(${JSON.stringify(tab)})`);
  await pausa(4000);
  return JSON.parse(await evaluar(cli, `JSON.stringify(window.__lect.map(function(x){return x.f;}))`));
}
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', sbses(process.env.SBSES, 'tadeo') + CONTAR) });
  console.log('\n=== La tab de al lado no queda vieja · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await pausa(4000);
  const TABS = ['ventas', 'estancias', 'equipo', 'inicio'];
  // Primera pasada: que cada tab cargue lo suyo (y quede sellada como recién leída).
  for (const t of TABS) { await evaluar(cli, `go(${JSON.stringify(t)})`); await pausa(5000); }
  await evaluar(cli, `go('caja')`); await pausa(3000);
  // Sin escrituras: volver antes de 90 s no relee.
  for (const t of TABS.slice(0, 2)) {
    /* Hoy hay operación: si la base avisó un cambio de verdad mientras tanto, releer es lo correcto. */
    const real = await evaluar(cli, `!!((window.__tabSucia||{})[${JSON.stringify(t)}])`);
    const l = await entrarYContar(cli, t);
    if (real) chk('sin escritura propia pero con una señal REAL de la base: entrar a ' + t + ' relee (' + l.length + ')', l.length > 0, l);
    else chk('sin escritura, volver a ' + t + ' antes de 90 s NO relee (' + l.length + ')', l.length === 0, l);
    await evaluar(cli, `go('caja')`); await pausa(1500);
  }
  // Una escritura confirmada estando en Caja.
  for (const t of TABS) {
    await evaluar(cli, `go('caja')`); await pausa(1500);
    await evaluar(cli, `_ordenConfirmada({action:'gasto'},{ok:true,aceptada:true})`);
    const l = await entrarYContar(cli, t);
    chk('después de una escritura en Caja, entrar a ' + t + ' relee (' + l.length + ': ' + l.slice(0, 3).join(', ') + ')', l.length > 0, l);
  }
  // Una señal de la base con la tab escondida.
  await evaluar(cli, `go('caja')`); await pausa(1500);
  await evaluar(cli, `_ordenSenalPendiente('erp:pedidos')`);
  const l2 = await entrarYContar(cli, 'ventas');
  chk('una señal de la base con Ventas escondida: al entrar relee (' + l2.length + ')', l2.length > 0, l2);
  // Y al releer deja de estar sucia: volver de nuevo no relee.
  await evaluar(cli, `go('caja')`); await pausa(1500);
  const l3 = await entrarYContar(cli, 'ventas');
  chk('releída, volver otra vez (sin escritura) ya no relee (' + l3.length + ')', l3.length === 0, l3);
  const err = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__err||[]).filter(function(e){return !/cortado por la prueba|Failed to load|net::/.test(e);}).slice(0,5))'));
  chk('sin errores de JS', err.length === 0, err);
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
