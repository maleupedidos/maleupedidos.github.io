/* Editar ficha › los casilleros de canal, con TOQUES de verdad a 390 px (11/11/2026, caso Josefina Del Bono).
     python ../estancias/scripts/migraciones/sesion_prueba.py crear <scratch>/sbses.json
     SBSES=<scratch>/sbses.json node _tools/pruebas/probar_ficha_canales_toque.js [tel]
     BASE_URL=http://localhost:PUERTO/app.html  (por defecto, el publicado)
   Sesión de la base con la guarda de solo lectura (sbses_guarda.js) y sesion_prep: no se escribe nada. Abre la ficha, toca «Editar ficha» y toca
   con Input.dispatchTouchEvent (no .click(), que ignora lo que tapa) cada casillero y su texto. Sostiene:
   · lo que hay en el centro de cada casillero es el casillero o su etiqueta (nada lo tapa);
   · un toque lo tilda y otro lo destilda;
   · el área táctil de cada fila mide al menos 40 px de alto. */
'use strict';
const path = require('path');
const cdp = require(path.join(__dirname, 'cdp.js')), prep = require(path.join(__dirname, 'sesion_prep.js'));
const TOKEN = process.env.TOKEN, TEL = process.argv[2] || '1170155566';
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 500))); };
(async () => {
  const SBSES = require(path.join(__dirname, 'sbses_guarda.js'))(process.env.SBSES, process.env.USUARIO || 'tadeo');
  if (!SBSES) { console.log('falta SBSES=<archivo de sesion_prueba.py>'); process.exit(2); }
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN || 'x') + SBSES });
    await cli.enviar('Page.navigate', { url: URL });
    const ev = (e) => cdp.evaluar(cli, e);
    await pausa(2500);
    if (!(await require(path.join(__dirname, 'sbses_guarda.js')).verificarGuarda(cli, cdp.evaluar))) throw new Error('la guarda de solo lectura no corta');
    const esperar = async (e, ms = 90000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch (x) {} await pausa(400); } return false; };
    if (!await esperar("typeof go==='function' && typeof window.verFichaCliente==='function'")) throw new Error('el ERP no arrancó');
    await esperar("typeof crmClientes!=='undefined' && crmClientes && crmClientes.length>50", 90000);
    await ev(`window.verFichaCliente(${JSON.stringify(TEL)})`);
    if (!await esperar("!!document.querySelector('#crmDrawerBody .crm-ficha-name')", 30000)) throw new Error('la ficha no abrió');
    await ev('crmEditarMeta()');
    if (!await esperar("document.querySelectorAll('.metaCanalExtra').length===6", 10000)) throw new Error('el editor no abrió');
    await pausa(500);
    const toque = async (x, y) => {
      await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: 8, radiusY: 8, force: 1 }] });
      await pausa(60);
      await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await pausa(350);
    };
    for (const c of ['Home', 'Clubes', 'B2B']) {
      const sel = `.metaCanalExtra[data-c="${c}"]`;
      await ev(`document.querySelector('${sel}').scrollIntoView({block:'center'})`); await pausa(300);
      const g = JSON.parse(await ev(`(function(){var i=document.querySelector('${sel}'),l=i.closest('label'),r=i.getBoundingClientRect(),rl=l.getBoundingClientRect();
        var cx=r.left+r.width/2,cy=r.top+r.height/2,top=document.elementFromPoint(cx,cy);
        var tx=rl.left+rl.width-30,ty=cy,topT=document.elementFromPoint(tx,ty);
        return JSON.stringify({cx:cx,cy:cy,tx:tx,ty:ty,w:r.width,h:r.height,hl:rl.height,ck:i.checked,
          top:top?(top.tagName+'.'+(top.className||'')+'#'+(top.id||'')):null, enLabel:!!(top&&(top===i||l.contains(top))),
          topT:topT?(topT.tagName+'.'+(topT.className||'')):null, enLabelT:!!(topT&&l.contains(topT))});})()`));
      chk(`${c}: en el centro del casillero está el casillero (no lo tapa nada)`, g.enLabel, g);
      chk(`${c}: la fila mide ≥ 40 px de alto para el dedo`, g.hl >= 40, { alto: g.hl, casillero: [g.w, g.h] });
      const antes = g.ck;
      await toque(g.cx, g.cy);
      const d1 = await ev(`document.querySelector('${sel}').checked`);
      chk(`${c}: un toque en el casillero lo ${antes ? 'destilda' : 'tilda'}`, d1 === !antes, { antes, despues: d1 });
      await toque(g.tx, g.ty);
      const d2 = await ev(`document.querySelector('${sel}').checked`);
      chk(`${c}: un toque en su texto lo vuelve`, d2 === antes, { antes, despues: d2, topT: g.topT });
    }
    const posts = JSON.parse(await ev('JSON.stringify((window.__posts||[]).length)') || '0');
    console.log('  (POST interceptados: ' + posts + ')');
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
