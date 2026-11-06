/* Abastecimiento abre con la copia guardada y PAGOS como ultima sub-tab (6/11/2026).

   node probar_abast_arranque_pagos.js
   APP=app_viejo_tmp.html node probar_abast_arranque_pagos.js   ← tiene que dar MAL

   El bug: el arranque de busqueda.html pintaba la copia (abaRender) antes de que corriera
   `var abaPagoCta = {}` (y otras de mas abajo); con PAGOS abierta cada tarjeta de
   proveedor salia «No pude armar el detalle» (ui_medicion error-pagos, Lucas y Tadeo).
   El backend va stubbeado y NUNCA contesta busqueda: lo que se ve es solo la copia.
   Datos inventados (el repo es publico). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8173';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); } return false; };

const BUSQ = { ts: Date.now(), total: 0, semActual: 45, anioActual: 2026, provs: [{ n: 'Prov Uno', costo: 1000, cats: [] }], ocs: [], clientes: [],
  cuentas: [{ id: 'mp', nombre: 'MP', tipo: 'digital', def: true }, { id: 'bb', nombre: 'Brubank', tipo: 'digital' }],
  deudas: [
    { n: 'Prov Uno', total: 50000, original: 50000, pagado: 0, pagosLibres: [], saldoLibreSobrante: 0, semanas: [
      { sem: '45', original: 50000, pagado: 0, pendiente: 50000, pagadoFifo: 0, pagosImp: [],
        items: [{ r: 1, prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 5, costoU: 10000, costo: 50000, sem: '45', canal: 'Home', cliente: 'X', nped: '1' }] }] },
    { n: 'Prov Dos', total: 20000, original: 20000, pagado: 0, pagosLibres: [], saldoLibreSobrante: 0, semanas: [
      { sem: '45', original: 20000, pagado: 0, pendiente: 20000, pagadoFifo: 0, pagosImp: [],
        items: [{ r: 2, prod: 'Tartas — Verdura', abbr: 'TV', q: 2, costoU: 10000, costo: 20000, sem: '45', canal: 'Home', cliente: 'Y', nped: '2' }] }] }
  ] };

const EXTRA = `
  (function(){
    try{
      localStorage.setItem('maleu_busqueda', JSON.stringify({ busqueda: ${JSON.stringify(BUSQ)}, ts: Date.now() }));
      localStorage.setItem('maleu_busqueda_tab','pagos'); localStorage.setItem('maleu_tab','inicio');
    }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0 && url.indexOf('supabase')<0) return o.apply(this,arguments);
      return new Promise(function(){});   /* nunca contesta: se ve solo la copia */
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Abastecimiento abre en PAGOS desde la copia · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); process.exit(1); }
    await evaluar(cli, `go('busqueda'); 1`);
    const pinto = await esperar(cli, `!!document.querySelector('#pagosList .deuda-card')`, 20000);
    chk('PAGOS pinto las tarjetas de la copia', pinto);
    const r = await evaluar(cli, `(function(){var l=document.getElementById('pagosList');if(!l)return null;
      return { cards: l.querySelectorAll('.deuda-card').length, rotas: (l.textContent.match(/No pude armar el detalle/g)||[]).length,
        botones: l.querySelectorAll('.btn-pago-libre').length };})()`);
    chk('examine tarjetas (no es un verde sobre 0)', !!r && r.cards === 2, r);
    chk('ninguna tarjeta dice «No pude armar el detalle»', !!r && r.rotas === 0, r);
    chk('cada tarjeta tiene su «+ Pago a cuenta»', !!r && r.botones === 2, r);
    const med = await evaluar(cli, `(function(){try{return JSON.stringify((window.__med||[]).filter(function(m){return /error-pagos/.test(JSON.stringify(m));}));}catch(e){return '';}})()`);
    console.log('  errores de pagina:', errores.length ? errores.slice(0, 3) : 'ninguno');
  } catch (e) { console.log('  EXCEPCION', e && e.message); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
