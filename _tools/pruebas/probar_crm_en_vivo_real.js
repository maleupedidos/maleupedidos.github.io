/* EL CRM Y ABASTECIMIENTO EN VIVO A LA VEZ, CONTRA PRODUCCION (27/10/2026).
   node _tools/pruebas/probar_crm_en_vivo_real.js <token> [minutos]
   UNA sola ventana con la sesion real (los POST van interceptados por sesion_prep: no escribe nada). Abre
   Abastecimiento y despues el CRM (Segmentos), y espera las señales REALES de erp:fotos que manda la base
   cuando el ERP rehace una foto. Sostiene:
   · las dos pantallas quedan anotadas en erp:fotos (antes la segunda pisaba a la primera);
   · cada señal que llega le llega a LAS DOS;
   · con una señal de crmClientes/crmInteracciones el CRM relee DE LA BASE y repinta, sin pedirle nada a
     Apps Script;
   · el cartel del CRM dice «en vivo». */
'use strict';
const cdp = require('./cdp.js'), abrir = cdp.abrir;
/* Con tope: una pagina trabada (un alert) dejaba la prueba colgada para siempre. */
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN, MIN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; }
(async () => {
  const cli = await abrir();
  /* Un espia de los GET a Apps Script desde que el CRM esta a la vista: tiene que quedar en 0. */
  const ESPIA = `(function(){ window.__gas = []; var f = window.fetch; window.fetch = function(u){ try { var s = String(u && u.url || u);
    if (/script\\.google\\.com/.test(s) && window.__contarGas) window.__gas.push(s.replace(/token=[^&]+/, 'token=…').slice(0, 160)); } catch(e){} return f.apply(this, arguments); }; })();`;
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ESPIA });
  /* Antes de navegar: un alert sin cerrar bloquea el hilo y todo lo que sigue queda sin respuesta. */
  await cli.enviar('Page.enable', {});
  cli.escuchar((metodo, p) => { if (metodo === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _enVivoEscuchar==='function'`, 60000), '');
  chk('la conexion en vivo queda «vivo»', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 60000), await evaluar(cli, `window.__enVivo||null`));
  await evaluar(cli, `go('busqueda'); 1`);
  chk('Abastecimiento se anota en erp:fotos', await esperar(cli, `!!(_ENV.canales['erp:fotos'] && _ENV.canales['erp:fotos'].oyentes.some(function(o){return o.alCambio===_abaVivoFoto;}))`, 60000), await evaluar(cli, `Object.keys(_ENV.canales)`));
  await evaluar(cli, `go('estancias'); estSwitch('segmentos'); 1`);
  chk('el CRM se anota en erp:fotos', await esperar(cli, `!!(_ENV.canales['erp:fotos'] && _ENV.canales['erp:fotos'].oyentes.length>=2)`, 30000), await evaluar(cli, `_ENV.canales['erp:fotos'] && _ENV.canales['erp:fotos'].oyentes.length`));
  chk('   y Abastecimiento SIGUE anotado (no lo piso)', await evaluar(cli, `_ENV.canales['erp:fotos'].oyentes.some(function(o){return o.alCambio===_abaVivoFoto;})`), '');
  chk('el cartel del CRM dice «en vivo»', await esperar(cli, `(document.getElementById('crmEnVivo')||{}).textContent==='\\u25cf en vivo'`, 20000), await evaluar(cli, `(document.getElementById('crmEnVivo')||{}).outerHTML`));
  /* Cada oyente cuenta lo que le llega. */
  await evaluar(cli, `window.__llega = {}; _ENV.canales['erp:fotos'].oyentes.forEach(function(o, i){ var f = o.alCambio, n = f===_abaVivoFoto ? 'aba' : 'crm';
    o.alCambio = function(d){ (window.__llega[n] = window.__llega[n] || []).push(d.screen + '@' + new Date().toISOString().slice(11,19)); return f(d); }; }); window.__contarGas = 1; 1`);
  const fin = Date.now() + (Number(MIN) || 12) * 60000;
  let vioCrm = false;
  while (Date.now() < fin) {
    await pausa(15000);
    const l = await evaluar(cli, `window.__llega`), v = await evaluar(cli, `window.__crmVivo||null`);
    console.log('  ' + new Date().toTimeString().slice(0, 8) + ' llegaron: aba ' + ((l.aba || []).length) + ' · crm ' + ((l.crm || []).length) + ' · __crmVivo ' + JSON.stringify(v));
    if (v && /de la base|bitacora de la base/.test(v.hizo || '')) { vioCrm = true; await pausa(3000); break; }
  }
  const l = await evaluar(cli, `window.__llega`);
  chk('llegaron señales reales de erp:fotos', (l.aba || []).length > 0, l);
  chk('cada señal le llego a LAS DOS pantallas', JSON.stringify((l.aba || []).map((x) => x.split('@')[0])) === JSON.stringify((l.crm || []).map((x) => x.split('@')[0])), l);
  chk('con su foto, el CRM releyo DE LA BASE y repinto', vioCrm, await evaluar(cli, `window.__crmVivo||null`));
  chk('   sin pedirle nada a Apps Script mientras tanto', (await evaluar(cli, `window.__gas.length`)) === 0, await evaluar(cli, `window.__gas`));
  chk('la lista de Segmentos sigue pintada', await evaluar(cli, `!!(document.getElementById('segList') && document.getElementById('segList').textContent.length > 50)`), '');
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
