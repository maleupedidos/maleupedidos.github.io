/* CONFIRMAR ORIGEN AL TOQUE, Y VUELVE SI FALLA (2/11/2026).

   BASE_URL=http://localhost:8157/app.html node _tools/pruebas/probar_origen_al_toque_vivo.js <token>

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
      var p=D.pedidos.filter(function(x){return x&&(x.h==='Home'||x.h==='Pilar')&&x.n&&x.n!=='-'&&x.es!=='Cancelado'&&Array.isArray(x.p)&&x.p.length;})[0];
      if(!p)return null;
      window.__pP=p; window.__oAntes=p.o; p.o='Pendiente';
      var box=document.createElement('div'); box.id='orig-'+uid;
      p.p.forEach(function(l){ var r=document.createElement('div'); r.className='origen-prod'; r.dataset.a=l.a; r.dataset.q=l.q;
        r.innerHTML='<input data-role="d" value="'+l.q+'"><input data-role="oc" value="0">'; box.appendChild(r); });
      var b=document.createElement('button'); b.dataset.h=p.h; b.dataset.n=p.n; b.dataset.r=p.r||0; b.dataset.uid=uid; b.textContent='CONFIRMAR ORIGEN';
      document.body.appendChild(box); document.body.appendChild(b); window.__bO=b; window.confirm=function(){return true;};
      return {h:p.h,n:p.n};
    })`;
    const a = await cdp.evaluar(cli, armar + '("pruebaA")');
    if (!a) throw new Error('no hay un pedido abierto de Home o Pilar con productos');
    const r1 = await cdp.evaluar(cli, '(function(){ confirmarOrigen(window.__bO); return window.__pP.o; })()');
    chk('el origen de ' + a.h + ' #' + a.n + ' pasa a Deposito en el mismo toque', r1 === 'Deposito', r1);
    await pausa(2500);
    await cdp.evaluar(cli, armar + '("pruebaB")');
    const r2 = await cdp.evaluar(cli, `(function(){
      var orig=_ordenPost; _ordenPost=function(){ return Promise.reject(new Error('sin red (prueba)')); };
      confirmarOrigen(window.__bO); var en=window.__pP.o;
      return new Promise(function(res){ setTimeout(function(){ _ordenPost=orig; res({en:en, despues:window.__pP.o}); },800); });
    })()`);
    chk('con un envio que falla: al toque Deposito y despues vuelve a Pendiente', r2.en === 'Deposito' && r2.despues === 'Pendiente', r2);
    await cdp.evaluar(cli, 'window.__pP.o=window.__oAntes;true');
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores en la consola', !err.filter(function (x) { return !/sin red \(prueba\)/.test(x); }).length, err.slice(0, 5));
  } catch (e) { chk('la prueba corrio', false, String(e.message)); }
  finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
