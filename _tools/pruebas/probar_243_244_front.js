/* 243 Y 244 EN EL FRONT (28/10/2026): la marca de los proveedores (`_provMarcaCargar`) y la ficha de un evento de
   catering (`catAbrir`) pasan por LEC_ARMA. Sin la palanca van a Apps Script como siempre; con «si» (puesta a mano en
   `sb.pal.lecArma`) salen de la base y NO llaman a Apps Script.
   node _tools/pruebas/probar_243_244_front.js <token> <id-evento>   (BASE_URL=http://localhost:PUERTO/app.html)
   La base tiene que tener la 243 y la 244; sin ellas, la parte «si» cae a Apps Script y da MAL (es lo esperado). */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN, EVENTO] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (cli, e) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('20 s')), 20000))]);
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
async function esperar(cli, e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(cli, e)) return true; } catch (x) {} await pausa(500); } return false; }
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u){try{var s=String(u&&u.url||u);if(/script\\.google(usercontent)?\\.com|\\/exec\\?/.test(s))window.__aApps.push(s.slice(0,140));}catch(e){}return f.apply(this,arguments);};})();` });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  chk('el ERP arranca', await esperar(cli, `typeof go==='function' && typeof _provMarcaCargar==='function' && typeof catAbrir==='function'`, 60000), '');
  for (const modo of ['no', 'si']) {
    console.log(`\n== palanca: ${modo} ==`);
    await ev(cli, `_sbPermiso(true).then(function(sb){ if(sb&&sb.pal){ sb.pal.lecArma = sb.pal.lecArma || {}; ['proveedoresMarca','cateringDetail'].forEach(function(k){ if(typeof sb.pal.lecArma==='string') return; sb.pal.lecArma[k] = '${modo}'; }); } window.__palOk = _lecModo('cateringDetail'); }); 1`);
    await esperar(cli, `window.__palOk !== undefined`, 10000);
    const lm = await ev(cli, `[_lecModo('proveedoresMarca'), _lecModo('cateringDetail')]`);
    chk(`_lecModo dice ${modo}`, modo === 'no' ? (!lm[0] && !lm[1]) || (lm[0] === 'no' && lm[1] === 'no') : (lm[0] === modo && lm[1] === modo), lm);   // sin fila = null, que vale «no»
    const antes = await ev(cli, `window.__aApps.length`);
    await ev(cli, `_PROV_MARCA = null; _provMarcaPedida = false; try{ localStorage.removeItem('mc_provMarca'); }catch(e){} _provMarcaCargar(); 1`);
    chk('el mapa de marcas llega', await esperar(cli, `_PROV_MARCA && Object.keys(_PROV_MARCA).length > 5`, 30000), await ev(cli, `_PROV_MARCA && Object.keys(_PROV_MARCA).length`));
    await ev(cli, `go('catering'); 1`); await esperar(cli, `!!document.getElementById('catApp')`, 20000);
    await ev(cli, `_catDetalle = null; catAbrir(${JSON.stringify(EVENTO)}); 1`);
    chk('la ficha del evento se abre', await esperar(cli, `_catDetalle && _catDetalle.ok && _catDetalle.event && _catDetalle.event.id === ${JSON.stringify(EVENTO)}`, 30000), await ev(cli, `_catDetalle && Object.keys(_catDetalle)`));
    const ap = (await ev(cli, `window.__aApps.slice(${antes})`)).filter((u) => /action=(proveedoresMarca|cateringDetail)/.test(u));
    chk(modo === 'si' ? 'con «si», ninguna de las dos va a Apps Script' : 'con «no», las dos van a Apps Script (como antes)', modo === 'si' ? ap.length === 0 : ap.length === 2, ap);
  }
  console.log(`\n${ok} ok · ${mal} MAL`); cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.log('ERROR ' + e.message); process.exit(2); });
