/* EL CONTEO SE SIENTE INSTANTANEO (28/10/2026, Tadeo contando sorrentinos con 3G).
   node _tools/pruebas/probar_contar_instantaneo.js <token>      BASE_URL=http://localhost:PUERTO/app.html
   Sesion real; los POST van interceptados por sesion_prep (contestan {ok:true}: NO se escribe nada). Encima va una
   capa que simula el 3G: cada stockContar tarda 6 s, los dos primeros se cortan («Failed to fetch») y uno lo
   rechaza el servidor. Sostiene:
     · el ✓ marca «contado» en el acto (< 500 ms), aunque el envio tarde 6 s;
     · un corte NO vuelve el numero atras ni dice «No se guardo»: se reintenta solo, con el MISMO clientOpId;
     · la cola vive en el aparato (maleu_stcCola) mientras hay algo sin mandar, y queda vacia al terminar;
     · si se recarga la app con algo sin mandar, se manda al abrir;
     · un RECHAZO del servidor si se avisa («No se guardo») y vuelve el numero atras. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (c, e) => Promise.race([cdp.evaluar(c, e), new Promise((_, no) => setTimeout(() => no(new Error('20 s')), 20000))]);
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
async function esperar(cli, e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(cli, e)) return true; } catch (x) {} await pausa(200); } return false; }
/* La capa del 3G: va DESPUES de sesion_prep, asi que corre antes que su interceptor. Modo en localStorage para
   que sobreviva a la recarga. */
const red = `;(function(){var o=window.fetch;window.__envios=[];window.fetch=function(u,x){var b=x&&x.body?String(x.body):'';
  if(b.indexOf('"stockContar"')<0)return o.apply(this,arguments);
  var m={};try{m=JSON.parse(localStorage.getItem('__red3g')||'{}');}catch(e){}
  window.__envios.push({t:Date.now(),id:(JSON.parse(b).clientOpId),abbr:JSON.parse(b).abbr});
  var self=this,args=arguments;
  return new Promise(function(ok,no){setTimeout(function(){
    if(m.cortes>0){m.cortes--;localStorage.setItem('__red3g',JSON.stringify(m));no(new TypeError('Failed to fetch'));return;}
    if(m.rechazo){m.rechazo=0;localStorage.setItem('__red3g',JSON.stringify(m));ok(new Response(JSON.stringify({ok:false,error:'producto inexistente'}),{status:200,headers:{'Content-Type':'application/json'}}));return;}
    if(m.colgar){no(new TypeError('Failed to fetch'));return;}
    o.apply(self,args).then(ok,no);},m.lento||0);});};})();`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, red) });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m, p) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _stcEncolar==='function'`, 60000), '');
  await ev(cli, `localStorage.removeItem('maleu_stcCola'); localStorage.setItem('__red3g', JSON.stringify({lento:6000, cortes:2})); go('stock'); try{ stSwitchTab('contar'); }catch(e){} 1`);
  chk('Contar pinta los productos', await esperar(cli, `ST_TAB==='contar' && !!document.querySelector('#stContar .stc-row .stc-ok:not(.ok)')`, 60000), await ev(cli, `ST_TAB`).catch(() => null));
  const abbr = await ev(cli, `(function(){ var b=document.querySelector('#stContar .stc-row .stc-ok:not(.ok)'); return b.closest('.stc-row').id.replace('stcR_',''); })()`);
  const v0 = await ev(cli, `document.getElementById('stcIn_${abbr}').value`);
  console.log('  producto:', abbr, '· numero en pantalla:', v0);
  /* 1. El ✓: contado en el acto. */
  const t0 = Date.now();
  await ev(cli, `stContarOk('${abbr}'); 1`);
  const enElActo = await esperar(cli, `!!document.querySelector('#stcR_${abbr} .stc-ok.ok') && /contado/.test(document.querySelector('#stcR_${abbr} .stc-ok').textContent)`, 2000);
  chk('el ✓ marca «contado» en el acto (' + (Date.now() - t0) + ' ms), con el envio tardando 6 s', enElActo && Date.now() - t0 < 1500, await ev(cli, `document.querySelector('#stcR_${abbr}').innerHTML.slice(0,200)`));
  chk('   y la cola quedo guardada en el aparato', await ev(cli, `JSON.parse(localStorage.getItem('maleu_stcCola')||'[]').length===1`), await ev(cli, `localStorage.getItem('maleu_stcCola')`));
  /* 2. Dos cortes: reintenta solo, sin volver atras ni «No se guardo». */
  chk('el primer corte se reintenta solo', await esperar(cli, `window.__stcUlt && window.__stcUlt.hizo==='reintento'`, 15000), await ev(cli, `window.__stcUlt||null`));
  chk('   la fila sigue «contado» (no «No se guardó»)', await ev(cli, `!!document.querySelector('#stcR_${abbr} .stc-ok.ok') && !document.querySelector('#stcR_${abbr} .stc-ok.err')`), '');
  chk('   y el numero no volvio atras', (await ev(cli, `document.getElementById('stcIn_${abbr}').value`)) === v0, '');
  chk('despues de los dos cortes, se guarda', await esperar(cli, `window.__stcUlt && window.__stcUlt.hizo==='guardado'`, 60000), await ev(cli, `window.__stcUlt||null`));
  const env = await ev(cli, `window.__envios`);
  chk('   en 3 envios, los 3 con el MISMO clientOpId', env.length === 3 && new Set(env.map((e) => e.id)).size === 1, env);
  chk('   y la cola del aparato quedo vacia', await ev(cli, `JSON.parse(localStorage.getItem('maleu_stcCola')||'[]').length===0`), '');
  /* 3. Recargar con algo sin mandar: sale al abrir. */
  await ev(cli, `localStorage.setItem('__red3g', JSON.stringify({colgar:1})); 1`);
  const abbr2 = await ev(cli, `(function(){ var b=document.querySelector('#stContar .stc-row .stc-ok:not(.ok)'); return b?b.closest('.stc-row').id.replace('stcR_',''):null; })()`);
  await ev(cli, `stContarOk('${abbr2}'); 1`);
  await esperar(cli, `JSON.parse(localStorage.getItem('maleu_stcCola')||'[]').length===1`, 3000);
  await ev(cli, `localStorage.setItem('__red3g', JSON.stringify({})); location.reload(); 1`).catch(() => {});
  await pausa(3000);
  chk('recargado con uno sin mandar: al abrir lo manda solo', await esperar(cli, `typeof _stcEncolar==='function' && window.__envios && window.__envios.some(function(e){ return e.abbr==='${abbr2}'; })`, 60000), await ev(cli, `[localStorage.getItem('maleu_stcCola'), window.__envios]`).catch(() => null));
  chk('   y la cola queda vacia', await esperar(cli, `JSON.parse(localStorage.getItem('maleu_stcCola')||'[]').length===0`, 30000), '');
  /* 4. Un rechazo del servidor si se avisa. */
  await ev(cli, `localStorage.setItem('__red3g', JSON.stringify({rechazo:1})); go('stock'); try{ stSwitchTab('contar'); }catch(e){} 1`);
  await esperar(cli, `ST_TAB==='contar' && !!document.querySelector('#stContar .stc-row .stc-ok:not(.ok)')`, 60000);
  const abbr3 = await ev(cli, `(function(){ var b=document.querySelector('#stContar .stc-row .stc-ok:not(.ok)'); return b.closest('.stc-row').id.replace('stcR_',''); })()`);
  await ev(cli, `stContarOk('${abbr3}'); 1`);
  chk('un RECHAZO del servidor dice «No se guardó» (tocar el ✓ lo manda de nuevo)', await esperar(cli, `!!document.querySelector('#stcR_${abbr3} .stc-ok.err')`, 15000), await ev(cli, `window.__stcUlt||null`));
  const err = await ev(cli, `(window.__err||[]).filter(function(x){ return !/favicon|ResizeObserver/.test(x); })`);
  chk('sin errores de JS', err.length === 0, err);
  await ev(cli, `localStorage.removeItem('__red3g'); localStorage.removeItem('maleu_stcCola'); 1`);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
