/* STOCK, PROVEEDORES Y CATERING EN VIVO (28/10/2026).
   node _tools/pruebas/probar_vivo_stock_prov_cat.js <token> [minutos-esperando-señal-real]
   BASE_URL=http://localhost:8163/app.html para probarlo local antes de publicar (el backend es producción).
   UNA ventana con la sesion real (los POST van interceptados por sesion_prep: no escribe nada).
   Por pantalla: la abre, la anota en sus canales (con la palanca en «si» lo hace sola; local, sin el backend
   nuevo, la prueba la prende a mano), dispara una señal y sostiene que relee DE LA BASE, que pinta y que en
   esa relectura no sale ningun pedido a Apps Script. Con minutos > 0 espera además una señal REAL de cada canal. */
'use strict';
const cdp = require('./cdp.js'), abrir = cdp.abrir;
const evaluar = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('evaluar: 20 s sin respuesta')), 20000))]);
const prep = require('./sesion_prep.js');
const [TOKEN, MIN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
async function esperar(cli, expr, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); } return false; }
const PANT = [
  { tab: 'stock', nota: '__stockVivo', bien: 'stock de la base', prender: '_stVivoPrender', estado: '_stVivo', senal: '_stVivoSenal',
    canales: ['erp:stock'], pintado: `!!(D && Array.isArray(D.stock) && D.stock.length && D.stockFuente==='pg' && document.querySelector('#p-stock').innerText.length > 200)` },
  { tab: 'proveedores', nota: '__provVivo', bien: 'proveedores de la base', interno: true,
    canales: ['erp:compras', 'erp:pedidos', 'erp:stock', 'erp:pagos', 'erp:fotos'], pintado: `document.querySelector('#pvProv') && document.querySelector('#pvProv').options.length > 1` },
  { tab: 'catering', nota: '__cateringVivo', bien: 'catering de la base', prender: '_catVivoPrender', estado: '_catVivo', senal: '_catVivoSenal',
    canales: ['erp:catering'], pintado: `Array.isArray(_catEventos) && _catEventos.length > 0 && !!document.querySelector('#catApp .cat-event')` },
];
(async () => {
  const cli = await abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u){try{var s=String(u&&u.url||u);if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push({t:Date.now(),u:s.slice(0,160),cola:/_bombear/.test(String(new Error().stack))});}catch(e){}return f.apply(this,arguments);};})();` });
  await cli.enviar('Page.enable', {});
  cli.escuchar((metodo, p) => { if (metodo === 'Page.javascriptDialogOpening') { console.log('  DIALOGO: ' + String(p && p.message).slice(0, 200)); cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); } });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _enVivoEscuchar==='function'`, 60000), '');
  chk('la conexion en vivo queda «vivo»', await esperar(cli, `window.__enVivo && window.__enVivo.estado==='vivo'`, 60000), await evaluar(cli, `window.__enVivo||null`));
  for (const P of PANT) {
    console.log('\n== ' + P.tab + ' ==');
    await evaluar(cli, `go('${P.tab}'); 1`);
    if (P.tab === 'stock') await evaluar(cli, `try{ if(typeof stShowSub==='function')stShowSub('productos'); }catch(e){} 1`);
    chk('la tab pinta', await esperar(cli, P.pintado, 60000), '');
    /* Anotarse: con la palanca en si se anota sola; si no (local, sin el backend nuevo), a mano. */
    const sola = await esperar(cli, P.canales.map((c) => `!!(_ENV.canales['${c}'] && _ENV.canales['${c}'].oyentes.length)`).join(' && ') + (P.interno ? '' : ` && ${P.estado}.prendido`), 8000);
    if (!sola && !P.interno) await evaluar(cli, `_sbPermiso(true).then(function(sb){ sb.pal.${P.tab === 'stock' ? 'stockEnVivo' : 'cateringEnVivo'} = true; ${P.prender}(); }); 1`);
    if (!sola && P.interno) await evaluar(cli, `_sbPermiso(true).then(function(sb){ sb.pal.provEnVivo = true; window.dispatchEvent(new Event('maleu:palancas')); }); 1`);
    console.log('  (palanca ' + (sola ? 'del backend' : 'prendida a mano por la prueba') + ')');
    chk('se anota en ' + P.canales.join(', '), await esperar(cli, P.canales.map((c) => `!!(_ENV.canales['${c}'] && _ENV.canales['${c}'].oyentes.length)`).join(' && '), 20000),
      await evaluar(cli, `Object.keys(_ENV.canales).map(function(k){return k+':'+_ENV.canales[k].oyentes.length;})`));
    if (P.tab === 'proveedores') chk('   sin sacar a Pedidos de erp:pedidos', await evaluar(cli, `_ENV.canales['erp:pedidos'].oyentes.some(function(o){return o.alCambio===_pedVivoSenal;})`), '');
    /* Una señal: la manda el repartidor del canal, como si llegara de la base. */
    await evaluar(cli, `window.${P.nota} = null; window.__aApps = []; 1`);
    const c0 = P.canales[0];
    await evaluar(cli, `(function(){ var c=_ENV.canales['${c0}']; c.oyentes.forEach(function(o){ try{ o.alCambio({tabla:'prueba',op:'update',n:1,ids:[]}); }catch(e){} }); })(); 1`);
    chk('con una señal relee DE LA BASE', await esperar(cli, `window.${P.nota} && window.${P.nota}.hizo==='${P.bien}'`, 45000), await evaluar(cli, `window.${P.nota}||null`));
    chk('   y sigue pintada', await evaluar(cli, P.pintado), '');
    const aa = (await evaluar(cli, `window.__aApps`)).filter((x) => /action=(stockTab|analisisProveedor|catering)/.test(x.u) && !x.cola);
    chk('   y en la relectura no fue a Apps Script (stockTab / analisisProveedor / catering)', aa.length === 0, aa);
    /* Con la tab NO a la vista, una señal no hace nada. */
    await evaluar(cli, `go('inicio'); window.${P.nota}=null; ${P.interno ? `_ENV.canales['erp:pagos']` : `_ENV.canales['${c0}']`}.oyentes.forEach(function(o){ try{ o.alCambio({}); }catch(e){} }); 1`);
    chk('con otra tab a la vista, la señal no relee', await esperar(cli, `window.${P.nota} && /^nada:/.test(window.${P.nota}.hizo)`, 45000), await evaluar(cli, `window.${P.nota}||null`));
  }
  const fin = Date.now() + (Number(MIN) || 0) * 60000;
  if (Number(MIN) > 0) {
    console.log('\n== esperando señales REALES ' + MIN + ' min (Stock a la vista) ==');
    await evaluar(cli, `go('stock'); try{ stShowSub('productos'); }catch(e){} window.__stockVivo=null; window.__senReal=[]; ['erp:stock','erp:catering','erp:pagos'].forEach(function(c){ _enVivoEscuchar(c, function(p){ window.__senReal.push({c:c,p:p,t:Date.now()}); }, function(){}); }); 1`);
    let vio = false;
    while (Date.now() < fin) {
      await pausa(15000);
      let v = null, s = []; try { v = await evaluar(cli, `window.__stockVivo||null`); s = await evaluar(cli, `window.__senReal.map(function(x){return x.c+' '+JSON.stringify(x.p).slice(0,90);})`); } catch (e) { continue; }
      console.log('  ' + new Date().toTimeString().slice(0, 8) + ' señales ' + s.length + ' · __stockVivo ' + JSON.stringify(v));
      if (v && v.hizo === 'stock de la base') { vio = true; break; }
    }
    chk('con una señal REAL de erp:stock, Stock releyó de la base y repintó solo', vio, '');
  }
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  try { await cli.cerrar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + (e && e.stack || e)); process.exit(1); });
