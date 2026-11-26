/* NINGUN TOQUE TAPA LA PANTALLA (2/11/2026).

   BASE_URL=http://localhost:8157/app.html node _tools/pruebas/probar_sin_loader_vivo.js <token>

   `showLoader` ya no prende el overlay de pantalla completa: muestra la pildora chica de abajo, y el boton que se toco
   queda «guardando» (un segundo toque encima no pasa) hasta `hideLoader`. Con un boton de prueba en la pantalla real:
   · el overlay #loaderOverlay NO se prende, la pildora si (a los 400 ms, como antes el overlay);
   · un segundo toque sobre el mismo boton no llega a su onclick; otro boton si;
   · `hideLoader` lo suelta todo y el boton vuelve a andar.
   No escribe nada. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], URL = process.env.BASE_URL || 'http://localhost:8157/app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const cli = await cdp.abrir();
  let ok = 0, mal = 0;
  const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 90; i++) { await pausa(1000); if (await cdp.evaluar(cli, 'typeof go==="function"&&!!(window.D&&D.pedidos&&D.pedidos.length)')) break; }
    await cdp.evaluar(cli, `(function(){
      window.__n1=0; window.__n2=0;
      var a=document.createElement('button'); a.id='__b1'; a.textContent='uno'; a.setAttribute('onclick','window.__n1++; showLoader("Probando…")');
      var b=document.createElement('button'); b.id='__b2'; b.textContent='dos'; b.setAttribute('onclick','window.__n2++');
      document.body.appendChild(a); document.body.appendChild(b); return true;
    })()`);
    const pos = await cdp.evaluar(cli, '(function(){var r=document.getElementById("__b1").getBoundingClientRect(),q=document.getElementById("__b2").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,x2:q.x+q.width/2,y2:q.y+q.height/2};})()');
    const tocar = async (x, y) => { for (const t of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', clickCount: 1 }); };
    await cdp.evaluar(cli, 'document.getElementById("__b1").scrollIntoView();true');
    const p2 = await cdp.evaluar(cli, '(function(){var r=document.getElementById("__b1").getBoundingClientRect(),q=document.getElementById("__b2").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,x2:q.x+q.width/2,y2:q.y+q.height/2};})()');
    await tocar(p2.x, p2.y);
    await pausa(600);
    const e1 = await cdp.evaluar(cli, '({n1:window.__n1, overlay:(document.getElementById("loaderOverlay")||{classList:{contains:function(){return false;}}}).classList.contains("visible"), pill:(document.getElementById("guardandoPill")||{style:{}}).style.display, marca:document.getElementById("__b1").dataset.guardando})');
    chk('el toque corre una vez', e1.n1 === 1, e1);
    chk('   el overlay de pantalla completa NO se prende', !e1.overlay, e1);
    chk('   y la pildora chica si', e1.pill === 'block', e1);
    chk('   y el boton queda «guardando»', e1.marca === '1', e1);
    await tocar(p2.x, p2.y);
    await tocar(p2.x2, p2.y2);
    const e2 = await cdp.evaluar(cli, '({n1:window.__n1, n2:window.__n2})');
    chk('un segundo toque sobre el mismo boton no pasa', e2.n1 === 1, e2);
    chk('   y otro boton si anda', e2.n2 === 1, e2);
    await cdp.evaluar(cli, 'hideLoader();true');
    const e3 = await cdp.evaluar(cli, '({pill:document.getElementById("guardandoPill").style.display, marca:document.getElementById("__b1").dataset.guardando||""})');
    chk('hideLoader suelta todo (pildora fuera, boton libre)', e3.pill === 'none' && !e3.marca, e3);
    await tocar(p2.x, p2.y);
    chk('   y el boton vuelve a andar', (await cdp.evaluar(cli, 'window.__n1')) === 2, await cdp.evaluar(cli, 'window.__n1'));
    await cdp.evaluar(cli, 'hideLoader(true);true');
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores en la consola', !err.length, err.slice(0, 5));
  } catch (e) { chk('la prueba corrio', false, String(e.message)); }
  finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
