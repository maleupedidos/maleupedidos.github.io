/* EL CONTEO DIRECTO A LA BASE (252, 28/10/2026), sobre la cola de v747.
   node _tools/pruebas/probar_contar_directo.js <token>      BASE_URL=http://localhost:PUERTO/app.html
   Sesion real; sesion_prep intercepta todo POST que no es una lectura de la base (tambien stock_contar_directo):
   NO se escribe nada. Una capa encima decide que contesta la base en cada caso. Sostiene:
     · con CONTAR_DIRECTO en «si» (puesta en la memoria de esta ventana), el envio va a la base y NO a Apps Script;
     · `directo:false` → el POST de siempre a Apps Script, con el MISMO clientOpId;
     · `acomodando` → avisa y se reintenta solo; despues entra;
     · un corte de red de la base → reintento con el MISMO clientOpId;
     · con la palanca apagada, ni se la llama. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (c, e) => Promise.race([cdp.evaluar(c, e), new Promise((_, no) => setTimeout(() => no(new Error('20 s')), 20000))]);
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
async function esperar(cli, e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(cli, e)) return true; } catch (x) {} await pausa(200); } return false; }
/* La base, simulada: `__base` dice la secuencia de respuestas ('ok', 'nodirecto', 'acomodando', 'corte'). */
const capa = `;(function(){var o=window.fetch;window.__envios=[];window.__base=[];window.fetch=function(u,x){var s=String((u&&u.url)||u||''),b=x&&x.body?String(x.body):'';
  if(/stock_contar_directo/.test(s)){var p=JSON.parse(b).p;window.__envios.push({a:'base',id:p.clientOpId,abbr:p.abbr,cv:p.cv});var r=window.__base.shift()||'ok';
    if(r==='corte')return Promise.reject(new TypeError('Failed to fetch'));
    var d=r==='nodirecto'?{ok:false,directo:false,motivo:'producto'}:r==='acomodando'?{ok:false,acomodando:true,error:p.abbr+' se esta acomodando (prueba)'}:{ok:true,aceptada:true,diferida:true,directo:true,orden:1,abbr:p.abbr,deposito:p.deposito,ahora:p.cantidad};
    return Promise.resolve(new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}));}
  if(b.indexOf('"stockContar"')>=0){var q=JSON.parse(b);window.__envios.push({a:'apps',id:q.clientOpId,abbr:q.abbr});}
  if(b.indexOf('pedidosFuenteAplicar')>=0)window.__envios.push({a:'aplicar'});
  return o.apply(this,arguments);};})();
  window.__palForzar={};setInterval(function(){try{var p=window._sbPerm&&window._sbPerm.pal;if(!p)return;Object.keys(window.__palForzar).forEach(function(k){p[k]=window.__palForzar[k];});}catch(e){}},200);`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, capa) });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _stcEncolar==='function' && !!window._sbPerm`, 60000), '');
  await ev(cli, `localStorage.removeItem('maleu_stcCola'); go('stock'); try{ stSwitchTab('contar'); }catch(e){} 1`);
  chk('Contar pinta', await esperar(cli, `ST_TAB==='contar' && document.querySelectorAll('#stContar .stc-row .stc-ok:not(.ok)').length>=4`, 60000), '');
  const filas = await ev(cli, `Array.prototype.map.call(document.querySelectorAll('#stContar .stc-row .stc-ok:not(.ok)'),function(b){return b.closest('.stc-row').id.replace('stcR_','');}).slice(0,5)`);
  const contar = async (abbr) => { await ev(cli, `window.__envios=[]; stContarOk('${abbr}'); 1`); };
  const listo = (abbr) => esperar(cli, `window.__stcUlt && window.__stcUlt.abbr==='${abbr}' && window.__stcUlt.hizo==='guardado'`, 60000);
  const envs = () => ev(cli, `window.__envios`);
  /* 0. Palanca apagada: ni se llama a la base. */
  await ev(cli, `window.__palForzar.contarDirecto = false; 1`); await pausa(500);
  await contar(filas[0]); await listo(filas[0]);
  let e = await envs();
  chk('con CONTAR_DIRECTO apagada: va a Apps Script y NO toca la base', e.some((x) => x.a === 'apps') && !e.some((x) => x.a === 'base'), e);
  /* 1. Prendida: a la base, no a Apps Script, y se empuja el aplicador. */
  await ev(cli, `window.__palForzar.contarDirecto = true; 1`); await pausa(500);
  await contar(filas[1]); await listo(filas[1]);
  e = await envs();
  chk('con CONTAR_DIRECTO en «si»: va a la base y NO a Apps Script', e.some((x) => x.a === 'base') && !e.some((x) => x.a === 'apps'), e);
  chk('   y se empuja el aplicador (pedidosFuenteAplicar) sin esperarlo', await esperar(cli, `window.__envios.some(function(x){return x.a==='aplicar';})`, 10000), e);
  chk('   con la version del aparato (cv)', e.filter((x) => x.a === 'base').every((x) => /\|(ios|android|pc)-(app|web)$/.test(x.cv || '')), e);
  /* 2. directo:false → Apps Script con el mismo id. */
  await ev(cli, `window.__base=['nodirecto']; 1`);
  await contar(filas[2]); await listo(filas[2]);
  e = await envs();
  const b2 = e.find((x) => x.a === 'base'), a2 = e.find((x) => x.a === 'apps');
  chk('directo:false → el POST de siempre a Apps Script, con el MISMO clientOpId', b2 && a2 && b2.id === a2.id, e);
  /* 3. acomodando → avisa y reintenta solo. */
  await ev(cli, `window.__base=['acomodando']; 1`);
  await contar(filas[3]);
  chk('acomodando → la fila sigue «contado» y se reintenta solo', await esperar(cli, `window.__stcUlt && window.__stcUlt.abbr==='${filas[3]}' && window.__stcUlt.hizo==='reintento' && !!document.querySelector('#stcR_${filas[3]} .stc-ok.ok')`, 15000), await ev(cli, `window.__stcUlt`));
  chk('   y despues entra', await listo(filas[3]), await ev(cli, `window.__stcUlt`));
  e = await envs();
  chk('   los dos envios con el MISMO clientOpId', e.filter((x) => x.a === 'base').length === 2 && new Set(e.filter((x) => x.a === 'base').map((x) => x.id)).size === 1, e);
  /* 4. corte de red de la base → reintento con el mismo id. */
  await ev(cli, `window.__base=['corte']; 1`);
  await contar(filas[4]);
  chk('un corte de la base → reintento y entra', await listo(filas[4]), await ev(cli, `window.__stcUlt`));
  e = await envs();
  chk('   con el MISMO clientOpId', e.filter((x) => x.a === 'base').length === 2 && new Set(e.filter((x) => x.a === 'base').map((x) => x.id)).size === 1, e);
  const err = await ev(cli, `(window.__err||[]).filter(function(x){ return !/favicon|ResizeObserver/.test(x); })`);
  chk('sin errores de JS', err.length === 0, err);
  await ev(cli, `localStorage.removeItem('maleu_stcCola'); 1`);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (x) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
