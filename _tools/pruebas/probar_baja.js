/* EQUIPO › DAR DE BAJA / REACTIVAR (17/11/2026, 750). Sesión del dueño con la guarda de solo lectura: la baja de verdad no
   sale (la escritura la prueba `estancias/scripts/migraciones/vivo750.py`); acá se mide la pantalla.
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_baja.js <token> [ancho] [carpeta de capturas]
   1) Marcos (liquidación y bolsas abiertas): «Dar de baja» muestra lo pendiente, cada cosa con su acción, y no deja confirmar.
   2) Fini (nada abierto): el formulario pide el motivo; con motivo, «Dar de baja» se habilita; el envío lo corta la guarda.
   3) Alguien dado de baja (inyectado en la copia de la pantalla, sin tocar la base): va a «Inactivos», plegado, y su ficha
      muestra cuándo y por qué, el historial y «Reactivar».
   44 px, sin cortes, consola sin errores. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S, DIR] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : '';
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
async function foto(cli, n) { if (!DIR) return; const r = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(DIR, n), Buffer.from(r.data, 'base64')); }
async function clic(cli, sel) {
  const r = JSON.parse(await evaluar(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'null';e.scrollIntoView({block:'center'});var b=e.getBoundingClientRect();return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2});})()`));
  if (!r) return false;
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
  return true;
}
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" + CAJON
    + ";window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(String(e.message).slice(0,160))});" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: ANCHO < 700 ? 2 : 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(8000);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(typeof SESSION!=='undefined'&&SESSION&&SESSION.dueno)`)) break; await T(500); }
  await evaluar(cli, `try{go('equipo')}catch(e){}`);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(EQ.d&&!EQ.vuelo&&!EQ.viejo&&document.querySelector('#eqBody .eq-row'))`)) break; await T(500); }
  // 1) Marcos: frena
  await evaluar(cli, `eqAbrir('Marcos Bottcher')`); await T(500);
  chk(await clic(cli, '#eqFicha .eqf-baja-b'), 'Marcos: el botón «Dar de baja» está');
  for (let i = 0; i < 20; i++) { if (await evaluar(cli, `!!(EQ.baja&&!EQ.baja.cargando)`)) break; await T(400); }
  await T(300);
  const F = JSON.parse(await evaluar(cli, `JSON.stringify({frena:(document.querySelector('#eqFicha .eqb-frena')||{}).textContent||'',
    items:[].map.call(document.querySelectorAll('#eqFicha .eqb-it'),function(it){var b=it.querySelector('button'),r=b.getBoundingClientRect();return {t:it.querySelector('.eqf-dn').textContent,acc:b.textContent,h:Math.round(r.height)}}),
    confirmar:!!document.getElementById('eqbBtn')})`));
  console.log('   Marcos:', JSON.stringify(F));
  chk(/Antes de darlo de baja/.test(F.frena) && F.items.length >= 1, 'Marcos: frena con ' + F.items.length + ' pendientes');
  chk(F.items.some((x) => /Liquidación/.test(x.t) && x.acc === 'Pagar'), 'liquidación sin pagar → «Pagar»');
  chk(F.items.some((x) => /Bolsa|Pedido/.test(x.t) && x.acc === 'Ver pedido'), 'bolsa o pedido → «Ver pedido»');
  chk(!F.confirmar, 'no hay botón para confirmar mientras haya algo abierto');
  if (ANCHO < 700) chk(F.items.every((x) => x.h >= 44), 'acciones ≥ 44 px');
  await foto(cli, 'baja_frena.png');
  // 2) Fini: el formulario
  await evaluar(cli, `eqCerrar()`); await T(300);
  await evaluar(cli, `eqAbrir('Fini Mihailovitch')`); await T(500);
  await clic(cli, '#eqFicha .eqf-baja-b');
  for (let i = 0; i < 20; i++) { if (await evaluar(cli, `!!(EQ.baja&&!EQ.baja.cargando)`)) break; await T(400); }
  await T(300);
  const b0 = JSON.parse(await evaluar(cli, `JSON.stringify({t:(document.getElementById('eqbBtn')||{}).textContent,d:(document.getElementById('eqbBtn')||{}).disabled,hoy:[].map.call(document.querySelectorAll('#eqFicha .eqp-op.dia.on'),function(b){return b.textContent}).join()})`));
  chk(b0.t === 'Escribí el motivo' && b0.d && b0.hoy === 'Hoy', 'Fini: sin motivo no deja (' + b0.t + ', fecha ' + b0.hoy + ')');
  await clic(cli, '#eqbMotivo'); await T(150);
  await cli.enviar('Input.insertText', { text: 'Ya no vende' }); await T(300);
  const b1 = JSON.parse(await evaluar(cli, `JSON.stringify({t:document.getElementById('eqbBtn').textContent,d:document.getElementById('eqbBtn').disabled})`));
  chk(b1.t === 'Dar de baja' && !b1.d, 'con motivo: «Dar de baja» habilitado');
  await foto(cli, 'baja_form.png');
  await clic(cli, '#eqbBtn'); await T(1500);
  const bl = JSON.parse(await evaluar(cli, `JSON.stringify(window.__bloqueados||[])`));
  chk(bl.some((x) => /equipo_baja_directo/.test(x)), 'el envío salió a equipo_baja_directo (y la guarda lo cortó: no se escribió nada)');
  // 3) Inactivos (inyectado en la copia de la pantalla)
  await evaluar(cli, `(function(){ eqCerrar(); var p=JSON.parse(JSON.stringify(_eqDe('Fini Mihailovitch'))); p.persona='PRUEBA Baja'; p.grupo='inactivos'; p.baja={fecha:'2026-11-17',motivo:'Ya no vende'}; EQ.d.personas.push(p); eqPintar(); })()`);
  await T(300);
  const L = JSON.parse(await evaluar(cli, `JSON.stringify({sec:!!document.querySelector('#eqBody .eq-inac'),abierta:!!document.querySelector('#eqBody .eq-inac[open]'),
    enLista:!![].filter.call(document.querySelectorAll('#eqBody > .eq-lista .eq-row'),function(r){return r.dataset.p==='PRUEBA Baja'}).length})`));
  chk(L.sec && !L.abierta && !L.enLista, 'va a «Inactivos», plegado, y no a la lista');
  await clic(cli, '#eqBody .eq-inac > summary'); await T(300);
  await clic(cli, '.eq-row-inac[data-p="PRUEBA Baja"]'); await T(500);
  const R = JSON.parse(await evaluar(cli, `JSON.stringify({b:(document.querySelector('#eqFicha .eqf-bajado')||{}).innerText||'',re:(document.getElementById('eqReactBtn')||{}).textContent||'',hist:!!document.querySelector('#eqFicha .eqf-tl, #eqFicha .eq-vacio')})`));
  chk(/Dado de baja el 17\/11\/2026/.test(R.b) && /Ya no vende/.test(R.b), 'la ficha dice cuándo y por qué: ' + R.b.replace(/\s+/g, ' '));
  chk(R.re === 'Reactivar' && R.hist, '«Reactivar» y el historial');
  await foto(cli, 'baja_inactivo.png');
  const errs = JSON.parse(await evaluar(cli, `JSON.stringify(window.__errs||[])`));
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
