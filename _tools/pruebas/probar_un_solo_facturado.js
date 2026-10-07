/* UN SOLO FACTURADO DEL MES en Inicio y Objetivo, con la sesion real (7/10/2026).
 *
 *   BASE=http://localhost:8132 node probar_un_solo_facturado.js <token> [ancho]
 *
 * Hasta el 7/10/2026 Inicio decia tres numeros para lo mismo: Total Maleu
 * $5.482.391, "Facturado mes" $5.167.391 (sin Red por bolsa, sin catering ni
 * B2B) y un aviso de Red que decia "no está en el facturado" debajo de una
 * tarjeta que si lo contaba. Esta prueba exige que Facturado mes = Total Maleu
 * = Objetivo, el mismo margen, y que el aviso no vuelva. Solo LEE: ningun POST.
 * Contra el codigo de antes da rojo (5.167.391 ≠ 5.482.391).
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.log('falta el token'); process.exit(1); }
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return '__ERR ' + x.message; } };
const esperar = async (c, e, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(c, e) === true) return true; await pausa(300); } return false; };
let fallas = 0;
const ok = (b, m) => { console.log((b ? '  OK    ' : '  FALLA ') + m); if (!b) fallas++; };
const num = t => Number(String(t || '').replace(/[^\d]/g, '')) || 0;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 1000, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?tab=inicio&t=' + Date.now() });
    if (!await esperar(cli, `typeof go==='function'`, 90000)) throw new Error('el ERP no arrancó');
    /* La carga COMPLETA (con catering): la rapida llega sin ventasExtra. */
    const pinto = await esperar(cli, `!!(window.D&&Array.isArray(D.ventasExtra)&&D.pedidos&&D.pedidos.length&&document.querySelector('#hSnap .snap-v')&&document.querySelector('.mt-kv'))`, 150000);
    ok(pinto, 'Inicio pintó con la carga completa');
    if (!pinto) throw new Error('sin datos no se mide nada');
    await pausa(2500);
    const r = JSON.parse(await ev(cli, `JSON.stringify((function(){
      function txt(e){return e?e.innerText.replace(/\\s+/g,' ').trim():'';}
      var snap=[].map.call(document.querySelectorAll('#hSnap .snap-c'),function(c){return {l:txt(c.querySelector('.snap-l')),v:txt(c.querySelector('.snap-v'))};});
      var mt=[].map.call(document.querySelectorAll('.mt-k'),function(c){return {l:txt(c.querySelector('.rt-kl')),v:txt(c.querySelector('.mt-kv'))};});
      return {snap:snap,mt:mt,hsnap:txt(document.getElementById('hSnap'))};
    })())`));
    const sv = re => (r.snap.find(x => re.test(x.l)) || {}).v;
    const fSnap = num(sv(/^facturado mes/i)), mSnap = num(sv(/^margen mes/i));
    const fTot = num((r.mt[0] || {}).v), mTot = num(String((r.mt[2] || {}).v || '').split(' ')[0]);
    console.log('  Facturado mes $' + fSnap.toLocaleString('es-AR') + ' · Total Maleu $' + fTot.toLocaleString('es-AR'));
    ok(fSnap > 0 && fSnap === fTot, 'Facturado mes = Total Maleu (' + fSnap + ' / ' + fTot + ')');
    ok(mSnap > 0 && mSnap === mTot, 'Margen mes = margen bruto de Total Maleu (' + mSnap + ' / ' + mTot + ')');
    ok(!/no está en el facturado/i.test(r.hsnap), 'no queda el aviso de Red que contradecía la tarjeta');
    const cortado = await ev(cli, `[].filter.call(document.querySelectorAll('#hSnap .snap-c'),function(c){return c.scrollWidth>c.clientWidth+1;}).length`);
    ok(cortado === 0, 'a ' + ANCHO + 'px ningún cuadro se sale de su caja (' + cortado + ')');

    await ev(cli, `go('planificacion')`);
    const plan = await esperar(cli, `!!document.querySelector('#p-planificacion .plan-tot-nota')`, 90000);
    ok(plan, 'Objetivo pintó su total');
    if (plan) {
      await pausa(2000);
      const tPlan = await ev(cli, `document.getElementById('p-planificacion').innerText`);
      const esperado = '$' + fTot.toLocaleString('es-AR');
      ok(String(tPlan).indexOf(esperado) >= 0, 'Objetivo muestra el mismo facturado ' + esperado);
    }
    console.log('  errores: ' + await ev(cli, `JSON.stringify((window.__err||[]).slice(0,5))`));
  } catch (e) { fallas++; console.log('EXPLOTÓ: ' + (e && e.message || e)); }
  try { cli.matar(); } catch (e) {}
  console.log(fallas ? '\n' + fallas + ' falla(s)' : '\nverde');
  process.exit(fallas ? 1 : 0);
})();
