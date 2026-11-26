/* CAJA › GASTO EN UNA CUENTA QUE NO ES LA PRINCIPAL (21/11/2026). Sesión real, NADA SE ESCRIBE.
   SBSES=<sbses.json> BASE=http://localhost:8155 [APP=app.html] node probar_gasto_por_cuenta.js
   Tadeo, 19:11: gasto de $34.089,54 en «Mercado Pago Tadeo» (Galicia en 0) → «No se guardó el gasto: monto vacio».
   Con la cuenta por defecto en Galicia, MP es un campo extra; el formato viejo mandaba montoMp = el campo de Galicia (0).
   Llena el formulario como una persona (cuenta, monto con coma), toca Guardar y lee lo que SALDRÍA a la base
   (caja_gasto_directo, cortado): tiene que llevar el monto en esa cuenta. Para MP («34089,54» y «34.089,54»), Brubank,
   la Tarjeta MP y Galicia. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
/* La directa del gasto se corta y contesta como la base cuando no hay monto; se anota el cuerpo. */
const STUB = `window.__gastos=[];(function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||'');
  if(/rpc\\/caja_gasto_directo|action=gasto/.test(s)||(/script\\.google/.test(s)&&/"action":"gasto"/.test(String((x&&x.body)||'')))){var b={};try{b=JSON.parse(x.body);b=b.p||b;}catch(e){} window.__gastos.push(b);
    return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
  return o.apply(this,arguments);};})();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', sbses(process.env.SBSES, 'tadeo') + STUB) });
  console.log('\n=== Gasto por cuenta · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, `go('caja')`); await esperar(cli, `!!document.getElementById('gCat')&&typeof guardarGasto==='function'&&typeof _cajaCuentas==='function'&&!!_cajaCuentas()`, 60000); await pausa(2500);
  try { await evaluar(cli, `_movPintarExtras('g')`); } catch (e) {}
  const campos = JSON.parse(await evaluar(cli, `JSON.stringify({principal:(document.getElementById('gMPLbl')||{}).textContent||'',extras:[].slice.call(document.querySelectorAll('#gExtras input')).map(function(i){return i.id;})})`));
  console.log('  campos: principal «' + campos.principal + '» · extras ' + JSON.stringify(campos.extras));
  const casos = [['gCta_mp', '34089,54', 'mp', 34089.54], ['gCta_mp', '34.089,54', 'mp', 34089.54], ['gCta_brubank', '1500,5', 'brubank', 1500.5], ['gCta_tarjeta_mp', '2.000', 'tarjeta_mp', 2000], ['gMP', '129930,65', null, 129930.65]];
  for (const [id, txt, cta, esperado] of casos) {
    const hay = await evaluar(cli, `!!document.getElementById(${JSON.stringify(id)})`);
    if (!hay) { console.log('  --   no hay campo ' + id); continue; }
    await evaluar(cli, `(function(){ ['gEf','gMP'].concat([].slice.call(document.querySelectorAll('#gExtras input')).map(function(i){return i.id;})).forEach(function(k){var e=document.getElementById(k);if(e)e.value='';});
      var f=document.getElementById('gFecha'); if(f&&!f.value){var d=new Date();f.value=('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();}
      document.getElementById('gCat').value='Herramienta'; document.getElementById('gCon').value='PRUEBA gasto por cuenta';
      document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(txt)}; window.__gastos=[]; })()`);
    await evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){return /Guardar gasto/.test(x.textContent)&&x.offsetParent;})[0]; if(b){b.disabled=false;b.click();} else guardarGasto({preventDefault:function(){}}); })()`);
    await esperar(cli, `window.__gastos.length>0`, 6000);
    const g = JSON.parse(await evaluar(cli, `JSON.stringify(window.__gastos[0]||null)`));
    const enCta = g ? (g.montos ? g.montos[cta || Object.keys(g.montos)[0]] : (cta === 'mp' ? g.montoMp : null)) : null;
    const n = typeof enCta === 'number' ? enCta : (enCta != null ? Number(String(enCta).replace(',', '.')) : 0);
    chk('«' + txt + '» en ' + (cta || 'el campo principal') + ' → sale con ' + esperado, g && Math.abs(n - esperado) < 0.005 && !(g.montos == null && cta && cta !== 'mp'),
      g ? { montos: g.montos, montoMp: g.montoMp, montoEf: g.montoEf } : 'no salió nada');
    await pausa(800);
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
