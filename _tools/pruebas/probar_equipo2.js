/* EQUIPO, SEGUNDA TANDA (17/11/2026, 747): rendimiento, recibo, cumpleaños y «Agregar». Sesión del dueño con la guarda de
   solo lectura (no guarda nada).
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_equipo2.js <token> [ancho] [carpeta de capturas]
   Mide: Rendimiento se abre plegado, trae la serie de la base y la pinta como línea con el valor escrito en cada punto
   (solo períodos cerrados; el en curso aparte); Semanas/Meses y ‹ › cambian la serie; en Marcos, el escalón y cuánto le
   falta; el recibo arma una imagen PNG sin teléfono ni CBU; los datos vacíos dicen «Agregar» y al tocarlo aparece el campo;
   44 px en el celular; consola sin errores. Con carpeta: tatu_rend.png, marcos_rend.png y recibo.png. */
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
async function rend(cli, per, nom) {
  await evaluar(cli, `eqAbrir(${JSON.stringify(per)})`); await T(500);
  const ab0 = await evaluar(cli, `!!document.querySelector('#eqfRendD[open]')`);
  if (!ab0) await clic(cli, '#eqfRendD > summary');
  for (let i = 0; i < 30; i++) { if (await evaluar(cli, `!!document.querySelector('#eqfRend .eqr-svg, #eqfRend .eqr-vacio')`)) break; await T(400); }
  await T(300);
  const R = JSON.parse(await evaluar(cli, `JSON.stringify({num:(document.querySelector('#eqfRend .eqr-num')||{}).textContent,
    pts:document.querySelectorAll('#eqfRend .fm-pt').length,vals:[].map.call(document.querySelectorAll('#eqfRend .fm-val'),function(t){return t.textContent}),
    mets:[].map.call(document.querySelectorAll('#eqfRend .eqr-met'),function(b){var r=b.getBoundingClientRect();return {t:b.textContent,h:Math.round(r.height)}}),
    esc:(document.querySelector('#eqfRend .eqr-esc-p')||{}).textContent||'',per:(document.querySelector('#eqfRend .k-per-l')||{}).textContent||''})`));
  console.log('   ' + per + ':', JSON.stringify(R));
  chk(R.pts >= 2 && R.pts === R.vals.length, nom + ': línea con ' + R.pts + ' puntos y su valor escrito');
  chk(!!R.num, nom + ': el período en curso aparte (' + R.num + ')');
  if (ANCHO < 700) chk(R.mets.every((m) => m.h >= 44), nom + ': métricas ≥ 44 px');
  return R;
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
  // Tatu
  const t1 = await rend(cli, 'Santos Bullrich', 'Tatu');
  chk(t1.mets.map((m) => m.t).join() === 'Entregas,Clientes nuevos,Propinas', 'Tatu: Entregas · Clientes nuevos · Propinas');
  await clic(cli, '#eqfRend .eqr-met:nth-child(2)'); await T(300);
  const nv = await evaluar(cli, `(document.querySelector('#eqfRend .eqr-met.on')||{}).textContent`);
  chk(nv === 'Clientes nuevos', 'cambia de métrica: ' + nv);
  await clic(cli, '#eqfRend .eqr-met:nth-child(1)'); await T(300);
  await evaluar(cli, `document.querySelector('#eqFicha .eqf-cuerpo').scrollTop=document.getElementById('eqfRendD').offsetTop-80`); await T(300);
  await foto(cli, 'tatu_rend.png');
  // Meses
  await clic(cli, '#eqfRend .k-per-seg button:nth-child(2)');
  for (let i = 0; i < 20; i++) { if (await evaluar(cli, `/meses|Este mes/i.test((document.querySelector('#eqfRend .eqr-et')||{}).textContent||'')`)) break; await T(400); }
  const mes = await evaluar(cli, `(document.querySelector('#eqfRend .eqr-et')||{}).textContent`);
  chk(/Este mes/.test(mes), 'Meses: ' + mes);
  await clic(cli, '#eqfRend .k-per-b'); await T(1200);
  for (let i = 0; i < 20; i++) { if (await evaluar(cli, `!!document.querySelector('#eqfRend .eqr-svg')`)) break; await T(400); }
  const atras = await evaluar(cli, `(document.querySelector('#eqfRend .k-per-l')||{}).textContent`);
  chk(!!atras && !/Este mes/.test(await evaluar(cli, `(document.querySelector('#eqfRend .eqr-et')||{}).textContent`)), '‹ va para atrás: ' + atras);
  await evaluar(cli, `EQ.rend.gr='semana';EQ.rend.off=0`);
  // Datos vacíos: «Agregar»
  const ag = await evaluar(cli, `[].map.call(document.querySelectorAll('#eqFicha .eqf-dato .eqf-agregar'),function(b){return b.closest('.eqf-dato').querySelector('label').textContent}).join()`);
  console.log('   vacíos:', ag);
  chk(/Nacimiento/.test(ag), 'datos vacíos con «Agregar»: ' + ag);
  await clic(cli, '#eqFicha .eqf-dato .eqf-agregar'); await T(300);
  chk(await evaluar(cli, `!!(document.activeElement&&document.activeElement.closest('.eqf-dato')&&/INPUT|TEXTAREA/.test(document.activeElement.tagName))`), 'tocar «Agregar» abre el campo con el foco');
  await evaluar(cli, `document.activeElement.blur()`); await T(400);
  // Recibo de un pago de Tadeo (el último de su historial)
  await evaluar(cli, `eqAbrir('Tadeo Ustariz')`); await T(500);
  const hay = await evaluar(cli, `!!document.querySelector('#eqFicha .eqf-ev-x[onclick^="eqRecibo"]')`);
  chk(hay, 'el historial trae «Recibo»');
  const b64 = await evaluar(cli, `(function(){var p=_eqDe('Tadeo Ustariz'),x=(p.historial||[])[0];var lin=[['Sueldo',x.m]];
    return _eqReciboDibujar({persona:p.persona,rol:p.rol,periodo:'Quincena '+(_eqQCorto(x.q)||x.qLbl),lineas:lin,totQ:x.m,pago:x.m,fecha:_eqDMY(x.f),cuenta:x.cuenta,ref:''})
      .then(function(b){return new Promise(function(ok){var r=new FileReader();r.onload=function(){ok(String(r.result).split(',')[1])};r.readAsDataURL(b);});});})()`);
  chk(b64 && b64.length > 20000, 'el recibo es una imagen (' + Math.round((b64 || '').length * 0.75 / 1024) + ' KB)');
  if (DIR && b64) fs.writeFileSync(path.join(DIR, 'recibo.png'), Buffer.from(b64, 'base64'));
  const txt = await evaluar(cli, `JSON.stringify(window.eqReciboDatos)`);
  chk(!/\d{8,}/.test(txt), 'el recibo no lleva teléfonos ni CBU');
  // Marcos
  const m1 = await rend(cli, 'Marcos Bottcher', 'Marcos');
  chk(/^Le faltan \$[\d.]+ para \w+ · \d+ clientes activos$|^Está en el escalón más alto/.test(m1.esc), 'Marcos: ' + m1.esc);
  await evaluar(cli, `document.querySelector('#eqFicha .eqf-cuerpo').scrollTop=document.getElementById('eqfRendD').offsetTop-80`); await T(300);
  await foto(cli, 'marcos_rend.png');
  const errs = JSON.parse(await evaluar(cli, `JSON.stringify(window.__errs||[])`));
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
