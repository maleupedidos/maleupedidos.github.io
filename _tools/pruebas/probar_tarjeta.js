/* LA TARJETA ES UNA DEUDA (17/11/2026, 752). Sesión del dueño con la guarda de solo lectura (no se escribe nada).
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_tarjeta.js <token> [ancho] [carpeta de capturas]
   1) Caja: la cuenta «Tarjeta MP» llega marcada de deuda y, sin consumos, dice «Al día».
   2) Con un consumo de $5.000 inyectado en la copia (sin tocar la base): su tarjeta dice «Debés $5.000», arriba aparece
      «Debés en la tarjeta: $5.000» y la plata disponible NO cambia.
   3) El arqueo no tiene campo para la tarjeta; el formulario de gasto sí; Mover entre cuentas la ofrece.
   4) Categorías: «Percepciones a recuperar» está y queda fuera del resultado; «Tarjeta de crédito» ya no se ofrece.
   5) Resultados › Libre hoy resta la tarjeta. Consola sin errores. */
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
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" + CAJON
    + ";window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(String(e.message).slice(0,160))});" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: ANCHO < 700 ? 2 : 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(8000);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(typeof SESSION!=='undefined'&&SESSION&&SESSION.dueno)`)) break; await T(500); }
  for (let i = 0; i < 6; i++) { await evaluar(cli, `try{go('caja')}catch(e){}`); await T(i ? 2000 : 4000); if ((await evaluar(cli, `(document.querySelector('.pg.on')||{}).id||''`)) === 'p-caja') break; }
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!((_cajaCuentas()||[]).filter(function(c){return c.id==='tarjeta_mp'})[0]&&document.querySelector('#cBal .cj-ct'))`)) break; await T(700); }
  const A = JSON.parse(await evaluar(cli, `(function(){var t=(_cajaCuentas()||[]).filter(function(c){return c.id==='tarjeta_mp'})[0]||{},
    card=[].filter.call(document.querySelectorAll('#cBal .cj-ct'),function(x){return /tarjeta mp/i.test(x.innerText)})[0];
    return JSON.stringify({deuda:t.deuda,saldo:t.saldo,card:card?card.innerText.replace(/\\s+/g,' '):'',total:(document.querySelector('#cBal .cj-total b')||{}).textContent,
      deu:D.caja.deudaCuentas,sl:_saldoLiquido().total})})()`));
  console.log('   antes:', JSON.stringify(A));
  chk(A.deuda === true && Array.isArray(A.deu) && A.deu.indexOf('tarjeta_mp') >= 0, '1) Tarjeta MP llega marcada de deuda');
  chk(/tarjeta mp/i.test(A.card) && (A.saldo < -0.5 ? /debés/i.test(A.card) : /al día/i.test(A.card)), '   su tarjeta en Caja: «' + A.card.slice(0, 80) + '»');
  // 2) Un consumo de $5.000 inyectado en la copia.
  await evaluar(cli, `(function(){var g=D.caja.gastosPorCuenta=D.caja.gastosPorCuenta||{};g.tarjeta_mp=(Number(g.tarjeta_mp)||0)+5000;rCaja();})()`);
  await T(400);
  const B = JSON.parse(await evaluar(cli, `(function(){var card=[].filter.call(document.querySelectorAll('#cBal .cj-ct'),function(x){return /tarjeta mp/i.test(x.innerText)})[0];
    return JSON.stringify({card:card?card.innerText.replace(/\\s+/g,' '):'',debe:(document.querySelector('#cBal .cj-debe')||{}).innerText||'',total:(document.querySelector('#cBal .cj-total b')||{}).textContent,
      sl:_saldoLiquido()})})()`));
  console.log('   con $5.000:', JSON.stringify({ card: B.card, debe: B.debe, total: B.total, deuda: B.sl.deuda }));
  const deudaEsp = Math.max(0, -A.saldo) + 5000;
  chk(/Debés \$\s?5\.000|Debés \$5\.000/.test(B.card) || (A.saldo < -0.5 && /Debés/.test(B.card)), '2) la tarjeta dice cuánto se debe: «' + B.card.slice(0, 60) + '»');
  chk(/Debés en la tarjeta/.test(B.debe) && Math.abs(B.sl.deuda - deudaEsp) < 1, '   arriba: «' + B.debe + '» (deuda ' + B.sl.deuda + ')');
  chk(B.total === A.total && Math.abs(B.sl.total - A.sl) < 1, '   y la plata disponible no cambia (' + A.total + ' → ' + B.total + ')');
  chk(!(B.sl.cuentas || []).some((c) => c.id === 'tarjeta_mp'), '   ni entra en las cuentas de la plata líquida');
  await foto(cli, 'tarjeta_caja.png');
  // 3) Arqueo, gasto, mover entre cuentas.
  const C = JSON.parse(await evaluar(cli, `(function(){try{toggleAjuste()}catch(e){} var aj=!!document.getElementById('ajCta_tarjeta_mp'); try{toggleAjuste()}catch(e){}
    try{_movPintarExtras('g')}catch(e){} var g=!!document.getElementById('gCta_tarjeta_mp');
    var ec=_ecOpciones().map(function(o){return o.id});
    var cats=[].map.call(document.querySelectorAll('#gCat option'),function(o){return o.textContent});
    return JSON.stringify({aj:aj,g:g,ec:ec,cats:cats,lin:_gastoLinea({cat:'Percepciones a recuperar',con:'Percepción IVA'}),
      vctas:(_vCtasLista()||[]).map(function(c){return c.id})})})()`));
  console.log('   formularios:', JSON.stringify({ aj: C.aj, g: C.g, ec: C.ec, lin: C.lin, vctas: C.vctas }));
  chk(!C.aj, '3) el arqueo no tiene campo para la tarjeta');
  chk(C.g, '   el formulario de gasto sí (un consumo se carga contra la tarjeta)');
  chk(C.ec.indexOf('tarjeta_mp') >= 0 && C.ec.indexOf('mp') >= 0, '   Mover entre cuentas la ofrece (pagar el resumen: MP → Tarjeta MP)');
  chk(C.vctas.indexOf('tarjeta_mp') < 0, '   y las cuentas de cobro de Ventas no');
  chk(C.cats.indexOf('Percepciones a recuperar') >= 0 && C.cats.indexOf('Tarjeta de crédito') < 0, '4) categorías: «Percepciones a recuperar» sí, «Tarjeta de crédito» no');
  chk(C.lin && C.lin.tipo === 'fuera' && C.lin.linea === 'percepciones', '   una percepción queda fuera del resultado (' + JSON.stringify(C.lin) + ')');
  const errs = JSON.parse(await evaluar(cli, `JSON.stringify(window.__errs||[])`));
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
