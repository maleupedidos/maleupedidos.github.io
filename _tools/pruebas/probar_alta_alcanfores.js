/* Los Alcanfores sale de Home en el alta de pedidos (21/9/2026).

   Tadeo: "Home es Estancias del Pilar + Estancias del Rio; lo demas queda como
   Pilar". La tienda ya lo hacia desde el 10/8, pero el alta del ERP seguia
   ofreciendo Los Alcanfores adentro de Home: tres pedidos de septiembre
   ($109.000) quedaron en la hoja Home y contaron como Home en el EERR.

   Sostiene:
   · Home ofrece solo Estancias del Pilar y Estancias del Rio;
   · un cliente de Los Alcanfores elegido desde Home se pasa solo a Pilar, con
     su barrio y su lote;
   · en Pilar, Los Alcanfores conserva el envio gratis (como en la tienda) y el
     resto de Pilar sigue pagando envio;
   · un cliente de Estancias del Rio sigue en Home.

   Sin backend, con ?prueba=1. Clientes inventados: este repo es publico.

   node probar_alta_alcanfores.js
*/
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(c, e)) return true; } catch (x) {} await pausa(300); } return false; };

/* El estado del alta como lo ve quien carga: la zona prendida, los campos y el envio. */
const ESTADO = `(function(){
  var v=function(i){var e=document.getElementById(i);return e?e.value:null;};
  var chip=document.querySelector('#npZonaChips .np-chip.active');
  var ew=document.getElementById('npEnvioWrap');
  return { zona: chip?chip.dataset.zona:null, pilarBarrio: v('npPilarBarrio'), pilarLote: v('npPilarLote'),
           barrioHome: v('npBarrioPrivado'), envio: npEnvioBase(chip?chip.dataset.zona:''),
           envioVisible: !!ew && ew.style.display!=='none' };
})()`;
const ELEGIR = c => `(function(){
  var dd=document.getElementById('npClientesDropdown'); dd.__matches=[${JSON.stringify(c)}]; npSelectCliente(0); return 1;
})()`;
const LIMPIAR = `(function(){ ['npNombre','npTel','npPilarBarrio','npPilarLote','npLote'].forEach(function(i){var e=document.getElementById(i);if(e)e.value='';}); return 1; })()`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, "typeof go==='function'")) { console.log('  el ERP no arranco'); process.exit(1); }
    await evaluar(cli, 'go("ruta")');
    if (!await esperar(cli, "typeof npSelectCliente==='function' && typeof npSetZona==='function'")) { console.log('  Ruta no arranco'); process.exit(1); }
    await evaluar(cli, 'window.renderNuevo ? (renderNuevo(),1) : (switchTab("nuevo"),1)');
    await pausa(600);
    console.log('\n== Alta de pedidos: Los Alcanfores va en Pilar ==\n');

    const ops = await evaluar(cli, `[].map.call(document.querySelectorAll('#npBarrioPrivado option'),function(o){return o.value;})`);
    chk('Home ofrece solo Estancias del Pilar y Estancias del Río', JSON.stringify(ops) === JSON.stringify(['Estancias del Pilar', 'Estancias del Río']), ops);

    // Un cliente de Los Alcanfores elegido desde Home
    await evaluar(cli, 'npSetZona("Home")'); await evaluar(cli, LIMPIAR);
    await evaluar(cli, ELEGIR({ nombre: 'Cliente Inventado Uno', barrio: 'Los Alcanfores', lote: '7', tel: '' }));
    const a = await evaluar(cli, ESTADO);
    chk('un cliente de Los Alcanfores elegido en Home pasa solo a Pilar', a.zona === 'Pilar', a);
    chk('con su barrio y su lote', a.pilarBarrio === 'Los Alcanfores' && a.pilarLote === '7', a);
    chk('y sin cobrarle envío (lo conserva gratis, como en la tienda)', a.envio === 0 && a.envioVisible === false, a);

    // El resto de Pilar sigue pagando envio, y tipear el barrio recalcula
    await evaluar(cli, `(function(){var e=document.getElementById('npPilarBarrio');e.value='Pilara';e.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()`);
    const b = await evaluar(cli, ESTADO);
    chk('otro barrio de Pilar sigue pagando envío, y aparece la casilla de regalarlo', b.envio === 5000 && b.envioVisible === true, b);
    await evaluar(cli, `(function(){var e=document.getElementById('npPilarBarrio');e.value='los alcanfores';e.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()`);
    const c = await evaluar(cli, ESTADO);
    chk('tipear "los alcanfores" a mano en Pilar también lo deja sin envío', c.envio === 0 && c.envioVisible === false, c);

    // Un cliente de Estancias del Rio sigue en Home
    await evaluar(cli, 'npSetZona("Home")'); await evaluar(cli, LIMPIAR);
    await evaluar(cli, ELEGIR({ nombre: 'Cliente Inventado Dos', barrio: 'Estancias del Río', lote: '3', tel: '' }));
    const d = await evaluar(cli, ESTADO);
    chk('un cliente de Estancias del Río sigue en Home, con su barrio', d.zona === 'Home' && d.barrioHome === 'Estancias del Río', d);

    // Y uno de Estancias del Pilar, igual que siempre
    await evaluar(cli, 'npSetZona("Home")'); await evaluar(cli, LIMPIAR);
    await evaluar(cli, ELEGIR({ nombre: 'Cliente Inventado Tres', barrio: 'Estancias del Pilar', lote: '12', tel: '' }));
    const e = await evaluar(cli, ESTADO);
    chk('un cliente de Estancias del Pilar sigue en Home', e.zona === 'Home' && e.barrioHome === 'Estancias del Pilar' && e.envio === 0, e);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
