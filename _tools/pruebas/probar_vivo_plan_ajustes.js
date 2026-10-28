/* OBJETIVO Y AJUSTES EN VIVO (28/10/2026).
   node _tools/pruebas/probar_vivo_plan_ajustes.js <token>
   BASE_URL=http://localhost:8163/app.html para probarlo local antes de publicar (el backend es producción).
   UNA ventana con la sesion real (los POST interceptados por sesion_prep: no escribe nada). Por pantalla:
   con su lectura en «medir» una señal NO relee (no se muestra en vivo una copia sin probar); con la lectura
   en «si» (puesta en la memoria de esta ventana, la planilla no se toca) se anota en sus erp:hoja:<hoja>,
   una señal relee DE LA BASE y repinta, sin ir a Apps Script; con un cajon/editor abierto queda pendiente;
   con otra tab a la vista no relee. */
'use strict';
const cdp = require('./cdp.js'), abrir = cdp.abrir;
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; }
const PANT = [
  { tab: 'planificacion', nota: '__planVivo', bien: 'objetivo de la base', pal: 'planEnVivo', apps: /action=planMes\b/,
    hojas: ['plan_ventas', 'plan_acciones', 'objetivos', 'cierres_de_mes'],
    medir: `sb.pal.planArma = 'medir'`, si: `sb.pal.planArma = 'si'`,
    abrirEditor: `document.getElementById('planMetaDrawer').classList.add('on')`, cerrarEditor: `document.getElementById('planMetaDrawer').classList.remove('on')`,
    pintado: `!!(document.querySelector('#p-planificacion') && document.querySelector('#p-planificacion').innerText.length > 200)` },
  { tab: 'ajustes', nota: '__ajustesVivo', bien: 'ajustes de la base', pal: 'ajustesEnVivo', apps: /action=ajustesData\b/,
    hojas: ['usuarios', 'permisos', 'config_maleu', 'config', 'vendedores', 'provisiones_fijas'],
    medir: `sb.pal.lecArma = Object.assign({}, sb.pal.lecArma, { ajustesData: 'medir' })`, si: `sb.pal.lecArma = Object.assign({}, sb.pal.lecArma, { ajustesData: 'si' })`,
    abrirEditor: `(function(){ var i=document.createElement('input'); i.id='__pruebaInput'; document.getElementById('p-ajustes').appendChild(i); i.focus(); })()`,
    cerrarEditor: `(function(){ var i=document.getElementById('__pruebaInput'); if(i){ i.blur(); i.remove(); } })()`,
    pintado: `!!(AJ_DATA && AJ_DATA.ok && document.getElementById('ajBody') && document.getElementById('ajBody').innerText.length > 100)` },
];
const senal = (h) => `(function(){ var c=_ENV.canales['erp:hoja:${h}']; c.oyentes.forEach(function(o){ try{ o.alCambio({sheet:'prueba',op:'update',n:1}); }catch(e){} }); })(); 1`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u){try{var s=String(u&&u.url||u);if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push({t:Date.now(),u:s.slice(0,160),cola:/_bombear/.test(String(new Error().stack))});}catch(e){}return f.apply(this,arguments);};})();` });
  await cli.enviar('Page.enable', {});
  cli.escuchar((metodo, p) => { if (metodo === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _enVivoEscuchar==='function'`, 60000), '');
  chk('la conexion en vivo queda «vivo»', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 60000), await evaluar(cli, `window.__enVivo||null`));
  for (const P of PANT) {
    console.log('\n== ' + P.tab + ' ==');
    await evaluar(cli, `go('${P.tab}'); 1`);
    chk('la tab pinta', await esperar(cli, P.pintado, 60000), '');
    const sola = await esperar(cli, `!!(_ENV.canales['erp:hoja:${P.hojas[0]}'] && _ENV.canales['erp:hoja:${P.hojas[0]}'].oyentes.length)`, 8000);
    if (!sola) await evaluar(cli, `_sbPermiso(true).then(function(sb){ sb.pal.${P.pal} = true; window.dispatchEvent(new Event('maleu:palancas')); }); 1`);
    console.log('  (palanca ' + (sola ? 'del backend' : 'prendida a mano por la prueba') + ')');
    const anotada = P.hojas.map((h) => `!!(_ENV.canales['erp:hoja:${h}'] && _ENV.canales['erp:hoja:${h}'].oyentes.length)`).join(' && ');
    chk('se anota en erp:hoja: ' + P.hojas.join(', '), await esperar(cli, anotada, 20000), await evaluar(cli, `Object.keys(_ENV.canales)`));
    /* 1. Con la lectura en medir: la señal NO relee. */
    await evaluar(cli, `_sbPermiso(true).then(function(sb){ ${P.medir}; }); window.${P.nota} = null; 1`);
    await pausa(500); await evaluar(cli, senal(P.hojas[0]));
    chk('con la lectura en «medir», la señal NO relee', await esperar(cli, `window.${P.nota} && /no esta en si/.test(window.${P.nota}.hizo)`, 40000), await evaluar(cli, `window.${P.nota}||null`));
    /* 2. Con la lectura en si: relee de la base. Espera el minimo de 20 s entre relecturas. */
    await evaluar(cli, `_sbPermiso(true).then(function(sb){ ${P.si}; }); window.${P.nota} = null; window.__aApps = []; 1`);
    await pausa(500); await evaluar(cli, senal(P.hojas[P.hojas.length - 1]));
    chk('con «si», una señal (de ' + P.hojas[P.hojas.length - 1] + ') relee DE LA BASE', await esperar(cli, `window.${P.nota} && window.${P.nota}.hizo==='${P.bien}'`, 45000), await evaluar(cli, `window.${P.nota}||null`));
    chk('   y sigue pintada', await evaluar(cli, P.pintado), '');
    const aa = (await evaluar(cli, `window.__aApps`)).filter((x) => P.apps.test(x.u) && !x.cola);   /* lo de la cola de fondo (_bombear) no es de la relectura */
    chk('   y no fue a Apps Script', aa.length === 0, aa);
    /* 3. Con un editor abierto: pendiente. */
    await evaluar(cli, `${P.abrirEditor}; window.${P.nota} = null; 1`);
    await evaluar(cli, senal(P.hojas[1]));
    chk('con un editor abierto queda pendiente (no pisa lo que se escribe)', await esperar(cli, `window.${P.nota} && /^pendiente/.test(window.${P.nota}.hizo)`, 40000), await evaluar(cli, `window.${P.nota}||null`));
    await evaluar(cli, `${P.cerrarEditor}; 1`);
    /* 4. Con otra tab a la vista: nada. */
    await esperar(cli, `!window.${P.nota} || !/^pendiente/.test(window.${P.nota}.hizo) || false`, 1);
    await pausa(30000);   /* que termine la relectura pendiente */
    await evaluar(cli, `go('inicio'); window.${P.nota} = null; 1`);
    await evaluar(cli, senal(P.hojas[0]));
    chk('con otra tab a la vista, la señal no relee', await esperar(cli, `window.${P.nota} && /^nada:/.test(window.${P.nota}.hizo)`, 45000), await evaluar(cli, `window.${P.nota}||null`));
  }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
