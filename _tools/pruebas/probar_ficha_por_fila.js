/* LA FICHA SE ABRE POR LA FILA, NO POR EL N° (14/10/2026).

     node _tools/pruebas/probar_ficha_por_fila.js <token> [puerto] [ancho]

   Con la sesion REAL (lee produccion; todos los POST interceptados, no escribe
   nada). Un cancelado lleva «-» en la columna N°: buscar la ficha por
   (hoja, N°) devolvia el PRIMER «-» de la hoja. Bug de Tadeo del 14/10: la
   tarjeta «Pasado a Red #115 (Fini)» (Emilia Arbeletche) abria la de Gonzalo
   Latugaye, un cancelado del 05/06.

   Sostiene, con los datos de verdad:
   · cada tarjeta de Pedidos con N° repetido (los «-» y cualquier N° que se repita
     en una hoja) abre SU ficha (el cliente de la ficha es el de la tarjeta);
   · en particular, las violetas «Pasado a Red»;
   · pedir la ficha por un N° repetido SIN fila no adivina: avisa y no abre nada.
   Contra el panel anterior, las violetas abren la ficha de otro: ROJO. */
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const prep = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/sesion_prep.js');
const T = ms => new Promise(r => setTimeout(r, ms));
const TOKEN = process.argv[2];
const PUERTO = Number(process.argv[3] || 8095);
const ANCHO = Number(process.argv[4] || 1440);
if (!TOKEN) { console.log('uso: node probar_ficha_por_fila.js <token> [puerto] [ancho]'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 600) : '')); } };

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, 'try{localStorage.setItem("maleu_tab","pedidos")}catch(e){}') });
    await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
    let n = 0;
    for (let i = 0; i < 200; i++) { await T(500); n = await evaluar(cli, `(typeof D!=='undefined'&&D&&D.pedidos)?D.pedidos.length:0`).catch(() => 0); if (n > 100) break; }
    console.log('  pedidos en D: ' + n);
    if (n < 100) { chk('llegaron los pedidos de producción', false, n); salir(1); }

    /* Los repetidos dentro de una hoja, con su fila y su cliente. */
    const rep = await evaluar(cli, `(function(){var c={},out=[];D.pedidos.forEach(function(p){var k=p.h+'|'+p.n;(c[k]=c[k]||[]).push(p);});
      Object.keys(c).forEach(function(k){if(c[k].length>1)c[k].forEach(function(p){out.push({h:p.h,n:String(p.n),r:p.r,c:p.c,pas:p.pas||'',es:p.es});});});return out;})()`);
    console.log('  pedidos con N° repetido en su hoja: ' + rep.length + ' (' + rep.filter(x => x.n === '-').length + ' con «-»)');
    const violetas = rep.filter(x => /Pasado a Red/.test(x.pas));
    console.log('  violetas «Pasado a Red» entre ellos: ' + violetas.map(v => v.h + ' fila ' + v.r + ' ' + v.c + ' (' + v.pas + ')').join(' · '));

    /* Cada uno, como lo abre la tarjeta: openOrdDetail(h, n, r). */
    const malos = [];
    for (const x of rep) {
      const got = await evaluar(cli, `(function(){try{closeOrdDetail()}catch(e){} openOrdDetail(${JSON.stringify(x.h)},${JSON.stringify(x.n)},${Number(x.r) || 0});
        var b=document.getElementById('ordBody'); return {abierto:document.getElementById('ordDrawer').classList.contains('open'), txt:b?b.innerText.slice(0,400):''};})()`);
      if (!got.abierto || got.txt.indexOf(String(x.c).trim().split(' ')[0]) < 0) malos.push({ x, got: got.txt.slice(0, 80) });
    }
    chk('cada pedido con N° repetido abre SU ficha (' + rep.length + ' mirados)', rep.length > 0 && malos.length === 0, malos.slice(0, 4));
    for (const v of violetas) {
      const got = await evaluar(cli, `(function(){try{closeOrdDetail()}catch(e){} openOrdDetail(${JSON.stringify(v.h)},${JSON.stringify(v.n)},${Number(v.r) || 0}); return document.getElementById('ordBody').innerText.slice(0,160).replace(/\\s+/g,' ');})()`);
      console.log('     «' + v.pas + '» (' + v.h + ' fila ' + v.r + ') → ' + got.slice(0, 110));
      chk('  «' + v.pas + '» abre la ficha de ' + v.c, got.indexOf(String(v.c).trim().split(' ')[0]) >= 0, got.slice(0, 120));
    }

    /* La tarjeta de la lista lleva la fila en su onclick. */
    const tarj = await evaluar(cli, `(function(){var L=[].slice.call(document.querySelectorAll('.pc .ord-link'));return {n:L.length, conFila:L.filter(function(e){return /openOrdDetail\\('[^']*','[^']*',\\d+\\)/.test(e.getAttribute('onclick')||'');}).length};})()`);
    chk('las tarjetas de Pedidos pintadas llevan la fila (' + tarj.conFila + ' de ' + tarj.n + ')', tarj.n > 0 && tarj.conFila === tarj.n, tarj);

    /* Sin fila y con un N° repetido: no adivina. */
    const x = rep.find(y => y.n === '-') || rep[0];
    const amb = await evaluar(cli, `(function(){try{closeOrdDetail()}catch(e){} var t=document.getElementById('toast'); openOrdDetail(${JSON.stringify(x.h)},${JSON.stringify(x.n)});
      return {abierto:document.getElementById('ordDrawer').classList.contains('open'), toast:t?t.innerText:''};})()`);
    chk('sin fila y con N° repetido no abre ninguna ficha, avisa', amb.abierto === false && /pedidos #/.test(amb.toast), amb);
    /* RED: «Total a cobrar» y la tarjeta dicen lo que paga el cliente (subtotal +
       envío), no el A Pagar. Para cada Red de los ultimos 14 dias. */
    const reds = await evaluar(cli, `(function(){var lim=Date.now()-14*864e5;return D.pedidos.filter(function(p){return p.h==='Red'&&p.es!=='Cancelado'&&p.dee&&new Date(p.dee).getTime()>lim;})
      .map(function(p){return {n:String(p.n),r:p.r,c:p.c,cli:(Number(p.subt)||((Number(p.$)||0)+(Number(p.com)||0)))-(Number(p.desc)||0)+(Number(p.env)||0),ap:Number(p.$)||0,com:Number(p.com)||0,env:Number(p.env)||0};});})()`);
    console.log('  Red de los últimos 14 días: ' + reds.length);
    const malR = [];
    for (const x of reds) {
      const got = await evaluar(cli, `(function(){try{closeOrdDetail()}catch(e){} openOrdDetail('Red',${JSON.stringify(x.n)},${Number(x.r) || 0});
        var rows=[].map.call(document.querySelectorAll('#ordBody .ord-money-row'),function(e){return e.innerText.replace(/\\s+/g,' ').trim();});
        var card=[].filter.call(document.querySelectorAll('.pc'),function(c){return c.getAttribute('data-pc-key')==='Red|'+${JSON.stringify(x.n)};})[0];
        return {rows:rows, card: card&&card.querySelector('.pc-\\\\$')?card.querySelector('.pc-\\\\$').innerText:null};})()`);
      const tot = (got.rows.find(t => /^Total a cobrar/.test(t)) || '').replace(/\D/g, '');
      const maleu = (got.rows.find(t => /^Para Maleu/.test(t)) || '').replace(/\D/g, '');
      if (x.n === '114' || x.n === '115') console.log('     Red #' + x.n + ' (' + x.c + '): ' + got.rows.filter(t => /Total a cobrar|Para /.test(t)).join(' · ') + (got.card != null ? ' · tarjeta ' + got.card : ''));
      if (Number(tot) !== Math.round(x.cli) || Number(maleu) !== Math.round(x.ap) || (got.card != null && Number(got.card.replace(/\D/g, '')) !== Math.round(x.cli))) malR.push({ x, got });
    }
    chk('Red: «Total a cobrar» y la tarjeta = lo que paga el cliente; «Para Maleu» = el A Pagar (' + reds.length + ' mirados)', reds.length > 0 && malR.length === 0, malR.slice(0, 3));
    const errs = await evaluar(cli, 'window.__err');
    chk('sin errores de JS', errs.length === 0, errs);
  } catch (e) { mal++; console.log('  MAL  excepcion: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
