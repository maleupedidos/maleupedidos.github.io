/* MOVER ENTRE CUENTAS Y LOS 4 BOTONES DE CAJA (17/11/2026, v1241). Sesión real con la guarda de solo lectura (sbses_guarda:
   toda RPC «directo» se corta y queda en window.__bloqueados), así que NO escribe nada.
     SBSES=<ses.json> BASE_URL=http://localhost:8163/app.html node _tools/pruebas/probar_caja_entre.js <token> <ancho>
   Mide: los 4 botones arriba (≥ 44 px, visibles sin scroll, a un toque), y la tarea «ayer pasé $X de MP a Galicia» a
   toques reales: qué manda (payload) y cuántos toques hicieron falta. Con el cajón abierto en la compu. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : '';
const SIN_APPS = ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}";
let ok = 0, mal = 0;
const _ayer = () => { const d = new Date(Date.now() - 864e5); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + SIN_APPS + CAJON });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  for (let i = 0; i < 6; i++) {
    await evaluar(cli, `try{go('caja')}catch(e){}`); await T(i ? 3000 : 7000);
    const on = await evaluar(cli, `(document.querySelector('.pg.on')||{}).id||''`).catch(() => '');
    if (on === 'p-caja') break;
  }
  // Esperar a que lleguen las cuentas.
  for (let i = 0; i < 30; i++) { const n = await evaluar(cli, `((typeof _cajaCuentas==='function'&&_cajaCuentas())||[]).length`); if (n > 1) break; await T(1000); }
  await evaluar(cli, 'window.scrollTo(0,0)'); await T(500);
  const B = JSON.parse(await evaluar(cli, `JSON.stringify([].map.call(document.querySelectorAll('#cjAcc .cj-b'),function(b){var r=b.getBoundingClientRect();return {t:b.textContent.trim(),h:Math.round(r.height),w:Math.round(r.width),top:Math.round(r.top),vis:r.top>=0&&r.bottom<=innerHeight}}))`));
  console.log('botones:', JSON.stringify(B));
  chk(B.length === 4, '4 botones arriba (' + B.length + ')');
  chk(B.every((b) => b.h >= 44), 'todos ≥ 44 px de alto (' + B.map((b) => b.h).join(', ') + ')');
  chk(B.every((b) => b.vis), 'los 4 visibles sin scrollear al abrir Caja');
  chk(B.map((b) => b.t).join('|') === 'Mover entre cuentas|Cargar gasto|Cargar ingreso|Contar y ajustar', 'textos: ' + B.map((b) => b.t).join(' | '));
  // Cada botón abre su formulario con UN toque.
  const abre = { 'cjBEntre': 'entreForm', 'tGasto': 'formGasto', 'tIngreso': 'formIngreso', 'cjBContar': 'ajusteForm' };
  for (const id of Object.keys(abre)) {
    await evaluar(cli, `document.getElementById('${id}').click()`); await T(700);
    const vis = await evaluar(cli, `!document.getElementById('${abre[id]}').classList.contains('hidden')`);
    chk(vis, id + ' abre ' + abre[id] + ' con 1 toque');
  }
  // La tarea: «ayer 16/11 pasé $X de MP a Galicia».
  let toques = 0;
  const tocar = async (sel) => { toques++; return evaluar(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true})()`); };
  await evaluar(cli, `document.getElementById('entreForm').classList.add('hidden')`);
  await tocar('#cjBEntre'); await T(500);
  const nada = await evaluar(cli, `document.querySelectorAll('#entreForm .lug-chip.on').length`);
  chk(nada === 0, 'nada preseleccionado al abrir');
  const btn0 = await evaluar(cli, `document.getElementById('ecBtn').disabled+'|'+document.getElementById('ecBtn').textContent`);
  chk(btn0.startsWith('true|Elegí de qué cuenta sale'), 'botón trabado diciendo qué falta: ' + btn0);
  chk(await tocar('#ecDesde .lug-chip[data-l="mp"]'), 'toca Mercado Pago'); await T(200);
  const sinMp = await evaluar(cli, `!document.querySelector('#ecHacia .lug-chip[data-l="mp"]')`);
  chk(sinMp, 'en «Entra a» no aparece la misma cuenta');
  chk(await tocar('#ecHacia .lug-chip[data-l="galicia"]'), 'toca Galicia'); await T(200);
  toques++; await evaluar(cli, `(function(){var i=document.getElementById('ecMonto');i.focus();i.value='150.000,50';i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await tocar('.fecha-chip[data-target="ecFecha"][data-offset="-1"]'); await T(300);
  const est = JSON.parse(await evaluar(cli, `JSON.stringify({f:document.getElementById('ecFecha').value,b:document.getElementById('ecBtn').textContent,d:document.getElementById('ecBtn').disabled,h:document.getElementById('ecHint').textContent})`));
  console.log('formulario:', JSON.stringify(est));
  chk(!est.d && /^Mover \$150\.00[01]$/.test(est.b), 'botón listo (f$ redondea a pesos): ' + est.b);
  chk(est.f === _ayer(), 'la fecha quedó en ayer: ' + est.f);
  await evaluar(cli, `window.__bloqueados=[]`);
  await tocar('#ecBtn'); await T(2500);
  const bl = JSON.parse(await evaluar(cli, `JSON.stringify(window.__bloqueados||[])`));
  const env = bl.filter((x) => /caja_entre_cuentas_directo/.test(JSON.stringify(x)));
  console.log('bloqueado:', JSON.stringify(env).slice(0, 400));
  const cuerpo = env.length ? JSON.stringify(env[0]) : '';
  chk(env.length === 1, 'mandó UNA vez a caja_entre_cuentas_directo (cortado por la guarda)');
  chk(/\\"desde\\":\\"mp\\"/.test(cuerpo) && /\\"hacia\\":\\"galicia\\"/.test(cuerpo) && /\\"monto\\":150000.5/.test(cuerpo), 'payload desde mp, hacia galicia, monto 150000.5');
  chk(/\\"fecha\\":\\"20/.test(cuerpo), 'payload con fecha (no vacía = no es hoy)');
  console.log('toques para «ayer pasé $X de MP a Galicia»:', toques, '(abrir, origen, destino, monto, Ayer, Mover)');
  const err = await evaluar(cli, `JSON.stringify((window.__errs||window.__err||[]).slice?((window.__errs||window.__err||[]).slice(0,5)):[])`).catch(() => '[]');
  console.log('errores de consola:', err);
  console.log(mal ? '\n' + mal + ' MAL, ' + ok + ' ok' : '\nTODO OK (' + ok + ')');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
