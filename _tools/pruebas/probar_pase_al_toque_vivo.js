/* PASAR A UN REPRESENTANTE AL TOQUE, Y VUELVE SI FALLA (2/11/2026). Copia de probar_origen_al_toque_vivo.

   BASE_URL=http://localhost:8157/app.html node _tools/pruebas/probar_pase_al_toque_vivo.js <token>

   Con un pedido real en «Pendiente»: arma su caja de origen (todo del Deposito) y llama a `confirmarOrigen` como el
   boton. El POST lo corta sesion_prep. Sostiene:
   · el origen pasa a «Deposito» en el mismo toque (antes de la respuesta; antes esperaba 4 s de mediana);
   · con un `_ordenPost` que falla, el origen vuelve a «Pendiente» y avisa.
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
    const armar = `(function(uid){
      var p=D.pedidos.filter(function(x){return x&&(x.h==='Home'||x.h==='Pilar')&&x.n&&x.n!=='-'&&x.es!=='Cancelado';})[0];
      if(!p)return null;
      window.__pP=p; window.__esAntes=p.es; window.__pasAntes=p.pas||'';
      var box=document.createElement('div'); box.id=uid; box.dataset.h=p.h; box.dataset.n=p.n; box.dataset.r=p.r||0; box.dataset.c='prueba';
      box.innerHTML='<input data-role="v" value="Vend Prueba"><input data-role="t" value="Maleu">';
      document.body.appendChild(box); window.confirm=function(){return true;};
      return {h:p.h,n:p.n,es:p.es};
    })`;
    const a = await cdp.evaluar(cli, armar + '("pvA")');
    if (!a) throw new Error('no hay pedidos de Home o Pilar');
    const r1 = await cdp.evaluar(cli, '(function(){ pasarVendGuardar("pvA"); return {es:window.__pP.es, pas:window.__pP.pas}; })()');
    chk('pasar a un representante: ' + a.h + ' #' + a.n + ' queda Cancelado y «Pasado a Red» en el mismo toque', r1.es === 'Cancelado' && /Pasado a Red/.test(r1.pas || ''), r1);
    await pausa(2500);
    await cdp.evaluar(cli, '(function(){window.__pP.es=window.__esAntes;window.__pP.pas=window.__pasAntes;return true;})()');
    await cdp.evaluar(cli, armar + '("pvB")');
    const r2 = await cdp.evaluar(cli, `(function(){
      var orig=_ordenPost; _ordenPost=function(){ return Promise.reject(new Error('sin red (prueba)')); };
      pasarVendGuardar("pvB"); var en=window.__pP.es;
      return new Promise(function(res){ setTimeout(function(){ _ordenPost=orig; res({en:en, despues:window.__pP.es, antes:window.__esAntes}); },800); });
    })()`);
    chk('con un envio que falla: al toque Cancelado y despues vuelve a ' + r2.antes, r2.en === 'Cancelado' && r2.despues === r2.antes, r2);
    await cdp.evaluar(cli, '(function(){window.__pP.es=window.__esAntes;window.__pP.pas=window.__pasAntes;return true;})()');
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores en la consola', !err.filter(function (x) { return !/sin red \(prueba\)/.test(x); }).length, err.slice(0, 5));
  } catch (e) { chk('la prueba corrio', false, String(e.message)); }
  finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
