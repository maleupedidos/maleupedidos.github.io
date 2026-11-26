/* MI PORTAL EN VIVO (240, 28/10/2026).
   node _tools/pruebas/probar_portal_en_vivo.js <token-admin> [minutos-esperando-señal-real]
   BASE_URL=http://localhost:8163/app.html para probarlo local antes de publicar (el backend es producción).
   UNA ventana con la sesion real (los POST van interceptados por sesion_prep: no escribe nada).
   Por cada vendedor real, en «Ver como»: el portal pinta, queda anotado en `erp:pedidos` (el admin no sabe el
   usuario del vendedor), una señal de un pedido de Home NO relee, una de Red SI: relee DE LA BASE, repinta y en
   esa relectura no sale ningun pedido a Apps Script (ni los efectos). Con minutos > 0 espera una señal REAL. */
'use strict';
const cdp = require('./cdp.js'), abrir = cdp.abrir;
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN, MIN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const VENDEDORES = ['Marcos Bottcher', 'Fini Mihailovitch', 'Rufino Ardanaz', "Federico D'Andrea"];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; }
(async () => {
  const cli = await abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u){try{var s=String(u&&u.url||u);if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push({t:Date.now(),u:s.slice(0,160)});}catch(e){}return f.apply(this,arguments);};})();` });
  await cli.enviar('Page.enable', {});
  cli.escuchar((metodo, p) => { if (metodo === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _enVivoEscuchar==='function'`, 60000), '');
  /* (28/10) sesion_prep no trae SESSION.tabs: cuando llega miSesion (~30 s) el ERP ve las tabs «cambiadas», vuelve a
     aplicar los roles y salta a la primera tab. Con un login de verdad no pasa. Se espera a que llegue, ANTES de ir. */
  await esperar(cli, `typeof SESSION!=='undefined' && SESSION && Array.isArray(SESSION.tabs) && SESSION.tabs.length>0`, 90000);
  await evaluar(cli, `go('miportal'); 1`);
  chk('Mi Portal arranca (Ver como disponible)', await esperar(cli, `typeof redVerComoEntrar==='function' && typeof redVivoPrender==='function'`, 60000), '');
  /* La palanca: con PORTAL_EN_VIVO en si se prende sola; si no (local, sin el backend nuevo), a mano. */
  await evaluar(cli, `_sbPermiso(true).then(function(sb){ if(sb&&sb.pal) sb.pal.portalEnVivo = true; }); 1`);
  for (const V of VENDEDORES) {
    console.log('\n== ' + V + ' ==');
    /* El arranque del ERP puede volver a Inicio DESPUES de que la prueba abrio Mi Portal (pasó el 28/10: la señal
       llegaba con la tab en «inicio» y no releia, que es lo correcto). Se vuelve a la tab y se la sostiene. */
    await evaluar(cli, `if (cur !== 'miportal') go('miportal'); 1`);
    chk('Mi Portal es la tab a la vista', await esperar(cli, `cur === 'miportal'`, 10000), await evaluar(cli, `cur`));
    await evaluar(cli, `redVerComoEntrar(${JSON.stringify(V)}); 1`);
    /* Adentro del ERP `session` y `renderDashboard` son de la sub-app: lo que se ve desde window es una copia.
       Por eso se mide el DOM: el cartel de «Ver como», el contenido visible y la ganancia de la semana. */
    const PINTO = `(document.querySelector('#vercomo-txt')||{}).textContent.indexOf(${JSON.stringify(V)})>=0 && document.querySelector('#dash-content') && !document.querySelector('#dash-content').classList.contains('hidden') && /\$/.test((document.querySelector('#gan-sem')||{}).textContent||'')`;
    chk('el portal pinta', await esperar(cli, PINTO, 60000),
      await evaluar(cli, `({vc: (document.querySelector('#vercomo-txt')||{}).textContent, g: (document.querySelector('#gan-sem')||{}).textContent})`));
    await esperar(cli, `window.__portalVivo && window.__portalVivo.hizo==='escuchando' || (_ENV.canales['erp:pedidos'] && _ENV.canales['erp:pedidos'].oyentes.length>0)`, 8000);
    chk('anotado en erp:pedidos', await evaluar(cli, `redVivoCanal()==='erp:pedidos' && !!(_ENV.canales['erp:pedidos'] && _ENV.canales['erp:pedidos'].oyentes.some(function(o){ return String(o.alCambio).indexOf('redVivoCanal')>=0; }))`), await evaluar(cli, `Object.keys(_ENV.canales)`));
    await esperar(cli, `!redVivo.vuelo && !redVivo.t`, 30000);
    await evaluar(cli, `redVivo.ult = 0; window.__portalVivo = null; 1`);
    /* En horario de trabajo llegan señales REALES de erp:pedidos (el admin en «Ver como» escucha ese canal): se mide
       en el mismo instante que la señal de Home no deja programada una relectura. */
    chk('una señal de Home no relee', await evaluar(cli, `(function(){ if (redVivo.t) { clearTimeout(redVivo.t); redVivo.t = null; } _ENV.canales['erp:pedidos'].alCambio({tabla:'pedido', op:'update', n:1, ids:['Home|999']}); return !redVivo.t; })()`), '');
    const antes = await evaluar(cli, `window.__aApps.length`);
    await esperar(cli, `!redVivo.vuelo`, 30000);
    await evaluar(cli, `document.querySelector('#gan-sem').textContent = 'CENTINELA'; if (redVivo.t) { clearTimeout(redVivo.t); redVivo.t = null; } redVivo.ult = 0; window.__portalVivo = null; _ENV.canales['erp:pedidos'].alCambio({tabla:'pedido', op:'update', n:1, ids:['Red|5']}); 1`);
    chk('una señal de Red relee de la base', await esperar(cli, `window.__portalVivo && window.__portalVivo.hizo==='portal de la base'`, 30000), await evaluar(cli, `window.__portalVivo`));
    chk('y repinta (el centinela se fue)', await esperar(cli, `document.querySelector('#gan-sem').textContent !== 'CENTINELA'`, 5000), await evaluar(cli, `document.querySelector('#gan-sem').textContent`));
    /* Solo las del portal: el refresco general del ERP (ventas, stockTab…) corre en segundo plano y no es de aca. */
    const ap = (await evaluar(cli, `window.__aApps.slice(${antes})`)).filter((x) => /action=(dashboardVendedor|resolverVendedor|precios|redPiezasPedido)/.test(x.u));
    chk('sin pedidos a Apps Script en la relectura (ni efectos)', ap.length === 0, ap);
    await evaluar(cli, `redVerComoSalir(); 1`);
  }
  if (Number(MIN) > 0) {
    console.log(`\n== esperando una señal REAL de Red hasta ${MIN} min ==`);
    await evaluar(cli, `redVerComoEntrar(${JSON.stringify(VENDEDORES[0])}); window.__portalVivo = null; 1`);
    chk('llegó y releyó', await esperar(cli, `window.__portalVivo && window.__portalVivo.hizo==='portal de la base'`, Number(MIN) * 60000), await evaluar(cli, `window.__portalVivo`));
  }
  console.log(`\n${ok} ok · ${mal} MAL`); cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + e.message); process.exit(2); });
