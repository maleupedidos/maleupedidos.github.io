/* El PDF de una semana con los DATOS REALES, sin descargar nada (14/9/2026).

   node ver_pdf_semanal_real.js <token> [lunes aaaa-mm-dd] [carpeta para las capturas]

   Abre el ERP local (npm run dev) con la sesion real y los POST interceptados,
   trae lo que el PDF pide fresco (`_rsPreparar`: los nombres de los clientes y el
   plan de ventas), arma el documento con `_rsArmar` + `_rsRender` y muestra lo que
   dice: contra el plan, economico, financiero, por cobrar al cierre, nuevos, los
   que volvieron y la carne. Si se le pasa una carpeta, pinta el documento a 800px
   (el ancho con el que se captura el PDF) y guarda una captura por pagina.

   Es para mirar con los ojos, no un test: `probar_pdf_semanal.js` es el que
   sostiene las reglas con datos inventados. Esto dice si con los de verdad cierra.
   Usa la sesion real contra produccion: de a una prueba por vez. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const LUNES = process.argv[3] || '';
const CAPTURAS = process.argv[4] || '';
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.log('uso: node ver_pdf_semanal_real.js <token> [aaaa-mm-dd] [carpeta]'); process.exit(1); }
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(cli, expr) === true) return true; await pausa(500); } return false; }
const $ = n => '$' + Math.round(n || 0).toLocaleString('es-AR');

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, `typeof window._rsArmar==='function' && window.D && Array.isArray(D.pedidos) && D.pedidos.length>0 && !!D.saludSem && Array.isArray(D.gastos)`, 240000)) throw new Error('no llegaron los pedidos y la caja');
    await ev(cli, `_tendCargarCatalogo()`);
    await esperar(cli, `!!_tendCat`, 60000);
    const lun = LUNES || await ev(cli, `(function(){var d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)-7);return _rtIso(d);})()`);
    await ev(cli, `new Promise(function(r){window._rsPreparar(${JSON.stringify(lun)},r);})`);
    const R = await ev(cli, `(function(){var R=_rsArmar(${JSON.stringify(lun)});return {semN:R.semN,d:R.d,h:R.h,f:R.g.tot.f,ent:R.g.tot.ent,
      eco:R.eco,fin:R.fin,ing:R.ing.tot,cob:R.cob,plan:R.plan,pendTot:R.pendTot,pendYa:R.pendYa,pend:R.pend,redSin:R.redSin,
      carne:{cli:R.carne.cli,solo:R.carne.solo,ambos:R.carne.ambos,siempre:R.carne.siempre,sinDato:R.carne.sinDato,lista:R.carne.lista.map(function(o){return {c:o.c,h:o.h,kg:o.kg,est:o.est,ademas:o.ademas};})},
      nuevos:R.nuevos,volvieron:R.volvieron,cl:R.cl&&{total:R.cl.total,nuevos:R.cl.nuevos,recompra:R.cl.recompra,react:R.cl.react}};})()`);
    if (!R || R.__err) throw new Error('armar: ' + JSON.stringify(R));
    console.log(`\nSemana ${R.semN} (${R.d} a ${R.h}) · facturado ${$(R.f)} · ${R.ent} entregas`);
    if (R.plan) console.log(`\nPlan: objetivo ${$(R.plan.m)} / ${R.plan.p} pedidos · entregado ${$(R.plan.realM)} / ${R.plan.realP}` + (R.plan.mes ? ` · mes ${$(R.plan.mes.real)} de ${$(R.plan.mes.meta)}` : '') + (R.plan.falta.length ? ' · FALTA ' + R.plan.falta.join(', ') : ''));
    const E = R.eco;
    console.log(`\nEconomico: margen ${$(E.mb)} − bolsas ${$(E.bolsas)} (${E.pedPack} × ${$(E.costoPack)}) − campañas ${$(E.camp)} [${E.campD.join(' · ')}] − delivery ${$(E.deliv)} = contribucion ${$(E.contrib)}`);
    console.log(`  − fijos ${$(E.fijos)} (${E.fijosMes.map(x => x.dias + '/' + x.diasMes + ' de ' + $(x.total)).join(' + ')}) + ingresos ${$(R.ing)} = resultado ${$(E.res)}`);
    console.log(`Financiero: entro ${$(R.fin.entro)} · salio ${$(R.fin.pagos)} · flujo ${$(R.fin.flujo)} · vueltos ${$(R.fin.vueltos)}`);
    Object.keys(R.fin.porLinea).forEach(k => console.log(`  ${k}: ${$(R.fin.porLinea[k])}`));
    console.log(`\nPor cobrar al cierre: ${$(R.pendTot)} (ya entro ${$(R.pendYa)})`);
    R.pend.forEach(o => console.log(`  ${o.c} · ${o.h} · ${$(o.f)} · ${o.cob ? 'cobrado ' + o.cob : 'sin cobrar'}`));
    console.log('Red sin rendir:', R.redSin.map(o => `${o.v} ${o.n} ${$(o.f)}`).join(' · ') || '—');
    if (R.cl) console.log(`\nClientes: ${R.cl.total} · ${R.cl.nuevos} nuevos · ${R.cl.recompra} recompra · ${R.cl.react} reactivados`);
    (R.nuevos || []).forEach(o => console.log(`  🆕 ${o.c} · ${o.donde} · ${o.det} · ${$(o.f)} · volvio ${o.luego}${o.ok ? '' : ' · SIN PEDIDO'}`));
    (R.volvieron || []).forEach(o => console.log(`  ⏰ ${o.c} · ${o.donde} · ${o.sem} sem · ${o.det} · ${$(o.f)}${o.ok ? '' : ' · SIN PEDIDO'}`));
    const c = R.carne;
    console.log(`\nCarne: ${c.cli} clientes · solo carne ${c.solo} · carne y algo mas ${c.ambos} · sin carne ${c.siempre} · sin dato ${c.sinDato}`);
    c.lista.forEach(o => console.log(`  ${o.c} · ${o.h} · ${o.est && o.est.t}${o.est && o.est.sem ? ' ' + o.est.sem : ''} · ${Math.round(o.kg * 1000) / 1000} kg · ${o.ademas || '—'}`));

    const txt = await ev(cli, `(function(){var w=document.getElementById('rsHiddenWrap');w.innerHTML=_rsRender(_rsArmar(${JSON.stringify(lun)}));var t=w.textContent;w.innerHTML='';return t;})()`);
    console.log('\nsin undefined/NaN:', typeof txt === 'string' && !/undefined|NaN|\[object/.test(txt));

    if (CAPTURAS) {
      fs.mkdirSync(CAPTURAS, { recursive: true });
      const alto = await ev(cli, `(function(){var w=document.getElementById('rsHiddenWrap');w.style.left='0px';w.style.zIndex='99999';w.style.background='#fff';
        w.innerHTML=_rsRender(_rsArmar(${JSON.stringify(lun)}));window.scrollTo(0,0);return Math.ceil(w.getBoundingClientRect().height);})()`);
      await pausa(800);
      const pag = 1100;
      for (let y = 0, i = 1; y < alto; y += pag, i++) {
        const shot = await cli.enviar('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: y, width: 800, height: Math.min(pag, alto - y), scale: 1 }, captureBeyondViewport: true });
        const f = path.join(CAPTURAS, `pdf_${R.semN}_${i}.png`);
        fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
        console.log('captura', f);
      }
    }
    const err = await ev(cli, 'window.__err');
    console.log('errores de JS:', Array.isArray(err) ? err.length : err, Array.isArray(err) ? err.slice(0, 5) : '');
  } catch (e) {
    console.log('se corto: ' + (e && e.message || e));
  }
  try { cli.matar(); } catch (e) {}
  process.exit(0);
})();
