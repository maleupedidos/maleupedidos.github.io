/* LA CUENTA POR DEFECTO ES GALICIA (17/11/2026, 753). Sesión del dueño con la guarda de solo lectura: no se escribe nada.
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_def_galicia.js <token> [ancho]
   1) La caja: la por defecto es Galicia (la dice la base) y las Inversiones siguen en MP.
   2) Contar y ajustar: el campo de MP es MP (rótulo, «Panel calcula» = el saldo de MP) y Galicia tiene su campo aparte.
   3) Gasto: el campo principal es Galicia y va por cuenta (`montos`, si no la base lo anota como «Mercado Pago»); MP es un
      campo aparte y, solo, sigue yendo como `montoMp`. Consola sin errores. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}"
    + ";window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(String(e.message).slice(0,160))});" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: ANCHO < 700 ? 2 : 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(8000);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(typeof SESSION!=='undefined'&&SESSION&&SESSION.dueno)`)) break; await T(500); }
  for (let i = 0; i < 6; i++) { await evaluar(cli, `try{go('caja')}catch(e){}`); await T(i ? 2000 : 4000); if ((await evaluar(cli, `(document.querySelector('.pg.on')||{}).id||''`)) === 'p-caja') break; }
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(D&&D.caja&&D.caja.defCuenta&&(_cajaCuentas()||[]).length)`)) break; await T(700); }
  const A = JSON.parse(await evaluar(cli, `(function(){var c=_cajaCuentas()||[],m={};c.forEach(function(x){m[x.id]={def:x.def,inv:x.inv,saldo:Math.round(x.saldo)}});
    return JSON.stringify({defB:D.caja.defCuenta,m:m,inv:(_ctaInv(c)||{}).id,mpId:_ctaMPid(c),calcMp:Math.round(_calcSaldo().mp)})})()`));
  console.log('   cuentas:', JSON.stringify(A));
  chk(A.defB === 'galicia' && A.m.galicia && A.m.galicia.def && !A.m.mp.def, '1) la por defecto es Galicia');
  chk(A.inv === 'mp' && A.m.mp.inv, '   las Inversiones siguen en MP');
  chk(A.mpId === 'mp' && A.calcMp === A.m.mp.saldo, '   el «mp» del arqueo es la cuenta MP ($' + A.calcMp + ')');
  // 2) Contar y ajustar.
  const B = JSON.parse(await evaluar(cli, `(function(){try{toggleAjuste()}catch(e){}
    var r={lbl:($('ajMpLbl')||{}).textContent,hint:($('ajMpHint')||{}).textContent,gal:!!$('ajCta_galicia'),mp:!!$('ajCta_mp'),galLbl:''};
    var g=$('ajCta_galicia');if(g)r.galLbl=g.parentNode.querySelector('label').textContent;try{toggleAjuste()}catch(e){}return JSON.stringify(r)})()`));
  console.log('   arqueo:', JSON.stringify(B));
  chk(/Mercado Pago/.test(B.lbl) && B.hint.replace(/\D/g, '').indexOf(String(Math.abs(A.m.mp.saldo))) >= 0, '2) contar: el campo de MP es MP («' + B.lbl + '», ' + B.hint.split('·')[0].trim() + ')');
  chk(B.gal && !B.mp && /Galicia/.test(B.galLbl), '   Galicia con su campo aparte («' + B.galLbl + '»), MP no repetido');
  // 3) Gasto.
  const C = JSON.parse(await evaluar(cli, `(function(){_movPintarExtras('g');var r={lbl:($('gMPLbl')||{}).textContent,mp:!!$('gCta_mp'),gal:!!$('gCta_galicia')};
    $('gEf').value='';$('gMP').value='1000';var a=_movMontos('g');
    $('gMP').value='';$('gCta_mp').value='500';var b=_movMontos('g');$('gCta_mp').value='';
    r.a={porCta:a.porCta,extra:a.extra};r.b={porCta:b.porCta,extra:b.extra};return JSON.stringify(r)})()`));
  console.log('   gasto:', JSON.stringify(C));
  chk(/Galicia/.test(C.lbl) && C.mp && !C.gal, '3) gasto: el campo principal es Galicia («' + C.lbl + '») y MP va aparte');
  chk(C.a.porCta.galicia === 1000 && C.a.extra === true, '   $1.000 en el principal → Galicia, por cuenta (montos)');
  chk(C.b.porCta.mp === 500 && C.b.extra === false, '   $500 solo en MP → MP, como siempre (montoMp)');
  const errs = JSON.parse(await evaluar(cli, `JSON.stringify(window.__errs||[])`));
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
