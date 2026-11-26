/* INICIO › TOTAL MALEU dice qué cuenta (21/11/2026, v1304). Sesión real, SOLO LECTURA.
   SBSES=<sbses.json> BASE=http://localhost:8155 [APP=app.html] [FOTO=x.png] node probar_total_maleu_entregado.js [390|1440]
   «Entregado del 1 al N de <mes>», el renglón «Por entregar este mes: $X (N pedidos)» (de `_rtComprometido`, que no suma)
   y «Las flechas comparan con <mes anterior> del 1 al N». Mide que el título no quede cortado con «…». */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', sbses(process.env.SBSES, 'tadeo')) });
  console.log('\n=== Total Maleu: entregado y por entregar · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  /* La lista entera de la base (la del adelanto son 400 y la pastilla no sale sin la historia). */
  await esperar(cli, `(D&&D.pedidos||[]).length>1000`, 150000);
  await evaluar(cli, `go('inicio')`); await pausa(1500); try { await evaluar(cli, `rRetail()`); } catch (e) {}
  await esperar(cli, `!!document.querySelector('#hRetail .mt .mt-kpis')`, 30000); await pausa(800);
  const T = JSON.parse(await evaluar(cli, `(function(){var c=document.querySelector('#hRetail .mt');var l=c.querySelector('.k-per-l');
    return JSON.stringify({tit:l?l.textContent:'',cortado:l?l.scrollWidth>l.clientWidth+1:null,pend:(c.querySelector('.mt-pend')||{}).textContent||'',vs:(c.querySelector('.mt-vs')||{}).textContent||'',
      fac:(c.querySelector('.mt-k .mt-kv')||{}).textContent||'',pill:(c.querySelector('.mt-k .kpi-pill')||{}).textContent||'',ancho:document.documentElement.scrollWidth});})()`));
  console.log('  ' + JSON.stringify(T));
  const hoy = new Date(); const MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  chk('el título dice «Entregado del 1 al ' + hoy.getDate() + ' de ' + MES[hoy.getMonth()] + '»', T.tit === 'Entregado del 1 al ' + hoy.getDate() + ' de ' + MES[hoy.getMonth()], T.tit);
  chk('  y entra entero (sin «…»)', T.cortado === false, T);
  const cp = JSON.parse(await evaluar(cli, `(function(){var P=_rtPeriodo('m:'+new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'),new Date());var c=_rtComprometido(P,new Date());return JSON.stringify({f:Math.round(c.f),ped:c.ped});})()`));
  chk('«Por entregar este mes» = la cuenta de pendientes del ERP ($' + cp.f + ', ' + cp.ped + ')', cp.ped > 0 ? T.pend.replace(/\s+/g, ' ').indexOf('$' + cp.f.toLocaleString('es-AR')) >= 0 && T.pend.indexOf('(' + cp.ped + ' pedido') >= 0 : T.pend === '', { pend: T.pend, cp });
  const fac = Number(T.fac.replace(/\D/g, ''));
  const g = JSON.parse(await evaluar(cli, `(function(){var P=_rtPeriodo('m:'+new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'),new Date());var s=_rtSumar(P.d,P.h);return JSON.stringify({f:Math.round(s.tot.f+s.cat.f)});})()`));
  chk('  y NO suma a la facturación ($' + fac + ' = solo lo entregado)', fac === g.f, { fac, g });
  const ant = MES[(hoy.getMonth() + 11) % 12];
  chk('la flecha dice contra qué: «Las flechas comparan con ' + ant + ' del 1 al ' + hoy.getDate() + '»', T.pill ? T.vs === 'Las flechas comparan con ' + ant + ' del 1 al ' + Math.min(hoy.getDate(), new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate()) + '.' : true, T);
  chk('sin scroll horizontal', T.ancho <= ANCHO + 1, T.ancho);
  /* Un mes cerrado: «Entregado en octubre 2026», sin renglón de pendientes, y la flecha contra el mes entero. */
  await evaluar(cli, `mtMover(-1)`); await pausa(800);
  const C = JSON.parse(await evaluar(cli, `(function(){var c=document.querySelector('#hRetail .mt');return JSON.stringify({tit:(c.querySelector('.k-per-l')||{}).textContent||'',pend:!!c.querySelector('.mt-pend'),vs:(c.querySelector('.mt-vs')||{}).textContent||''});})()`));
  chk('mes cerrado: «Entregado en ' + ant + ' ' + hoy.getFullYear() + '», sin «Por entregar»', C.tit === 'Entregado en ' + ant + ' ' + hoy.getFullYear() + '' && !C.pend, C);
  chk('  y la flecha contra ' + MES[(hoy.getMonth() + 10) % 12] + ' entero', C.vs === '' || C.vs === 'Las flechas comparan con ' + MES[(hoy.getMonth() + 10) % 12] + ' entero.', C);
  await evaluar(cli, `mtMover(1)`); await pausa(600);
  if (process.env.FOTO) { await evaluar(cli, `document.querySelector('#hRetail .mt').scrollIntoView({block:'start'})`); await pausa(400);
    const sc = await cli.enviar('Page.captureScreenshot', { format: 'png' }); require('fs').writeFileSync(process.env.FOTO, Buffer.from(sc.data, 'base64')); }
  const err = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__err||[]).filter(function(e){return !/cortado por la prueba|Failed to load|net::/.test(e);}).slice(0,5))'));
  chk('sin errores de JS', err.length === 0, err);
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
