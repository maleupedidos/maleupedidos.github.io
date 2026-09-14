/* El PDF de una semana con los DATOS REALES, sin descargar nada (14/9/2026).

   node ver_pdf_semanal_real.js <token> [lunes aaaa-mm-dd] [carpeta para las capturas]

   Abre el ERP local (npm run dev) con la sesion real y los POST interceptados,
   arma el documento de la semana con `_rsArmar` + `_rsRender` y muestra lo que
   dice: por cobrar al cierre, Red sin rendir, carne y lo de siempre, los nuevos.
   Si se le pasa una carpeta, pinta el documento a 800px (el ancho con el que
   html2canvas saca el PDF) y guarda una captura por pagina.

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

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, `typeof window._rsArmar==='function' && window.D && Array.isArray(D.pedidos) && D.pedidos.length>0 && !!D.saludSem`, 240000)) throw new Error('no llegaron los pedidos');
    await ev(cli, `_tendCargarCatalogo()`);
    await esperar(cli, `!!_tendCat`, 60000);
    const lun = LUNES || await ev(cli, `(function(){var d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)-7);return _rtIso(d);})()`);
    const R = await ev(cli, `(function(){var R=_rsArmar(${JSON.stringify(lun)});return {semN:R.semN,d:R.d,h:R.h,f:R.g.tot.f,ent:R.g.tot.ent,
      pendTot:R.pendTot,pendYa:R.pendYa,pend:R.pend,redSin:R.redSin,carne:R.carne,nuevos:R.nuevos,cl:R.cl&&{total:R.cl.total,nuevos:R.cl.nuevos}};})()`);
    if (!R || R.__err) throw new Error('armar: ' + JSON.stringify(R));
    console.log(`\nSemana ${R.semN} (${R.d} a ${R.h}) · facturado $${R.f.toLocaleString('es-AR')} · ${R.ent} entregas`);
    console.log(`\nPor cobrar al cierre: $${R.pendTot.toLocaleString('es-AR')} (ya entro $${R.pendYa.toLocaleString('es-AR')})`);
    R.pend.forEach(o => console.log(`  ${o.c} · ${o.h} · $${o.f.toLocaleString('es-AR')} · ${o.cob ? 'cobrado ' + o.cob : 'sin cobrar'}`));
    console.log('Red sin rendir:', R.redSin.map(o => `${o.v} ${o.n} $${o.f.toLocaleString('es-AR')}`).join(' · ') || '—');
    const c = R.carne;
    console.log(`\nCarne: ${c.cli} clientes · solo carne ${c.solo} · las dos ${c.ambos} · solo lo de siempre ${c.siempre} · sin dato ${c.sinDato}`);
    c.lista.forEach(o => console.log(`  ${o.ambos ? '🥩🍕' : '🥩  '} ${o.c} · ${o.h} · ${o.kg} kg · ${o.u} u ${Object.keys(o.cats).join(', ')}`));
    console.log(`\nNuevos (${R.cl && R.cl.nuevos}):`);
    (R.nuevos || []).forEach(o => console.log(`  ${o.c} · ${o.h} · $${o.f.toLocaleString('es-AR')} · ${o.kg} kg · ${o.u} u${o.ok ? '' : ' · SIN PEDIDO'}`));

    const txt = await ev(cli, `(function(){var w=document.getElementById('rsHiddenWrap');w.innerHTML=_rsRender(_rsArmar(${JSON.stringify(lun)}));var t=w.textContent;w.innerHTML='';return t;})()`);
    console.log('\nsin undefined/NaN:', typeof txt === 'string' && !/undefined|NaN|\[object/.test(txt));

    if (CAPTURAS) {
      fs.mkdirSync(CAPTURAS, { recursive: true });
      const alto = await ev(cli, `(function(){var c=document.createElement('div');c.id='__rsVer';c.style.cssText='position:absolute;left:0;top:0;width:800px;background:#fff;z-index:99999';
        c.innerHTML=_rsRender(_rsArmar(${JSON.stringify(lun)}));document.body.appendChild(c);window.scrollTo(0,0);return Math.ceil(c.getBoundingClientRect().height);})()`);
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
