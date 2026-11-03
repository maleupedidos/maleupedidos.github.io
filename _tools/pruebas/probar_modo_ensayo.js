/* EL MODO ENSAYO BLOQUEA TODO APPS SCRIPT (3/11/2026). node _tools/pruebas/probar_modo_ensayo.js <token>
   BASE_URL=http://localhost:8172/app.html para lo local. Contra la base de PRODUCCIÓN: solo lee (los POST van cortados por
   sesion_prep). Con localStorage maleu_ensayo = '1': un GET, un POST y sbToken a Apps Script no salen y quedan en
   window.__ensayoApps; sin la marca, el GET sale como siempre. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 300))); };
const ESPIA = `;(function(){var f=window.fetch;window.__aApps=[];window.fetch=function(u,x){var s=String(u&&u.url||u);try{if(/script\\.google(usercontent)?\\.com|\\/exec/.test(s))window.__aApps.push(s.slice(0,100));}catch(e){}return f.apply(this,arguments);};})();`;
const TRES = `(async function(){ window.__aApps=[]; window.__ensayoApps=[]; var o={};
  try{ await fetch(API+'?action=ver&t='+Date.now()); o.get='salio'; }catch(e){ o.get='cortado'; }
  try{ await fetch(API+'?action=sbToken&t='+Date.now()); o.sb='salio'; }catch(e){ o.sb='cortado'; }
  try{ await fetch(API,{method:'POST',body:JSON.stringify({action:'pruebaEnsayoNoExiste'})}); o.post='salio'; }catch(e){ o.post='cortado'; }
  o.apps=window.__aApps.length; o.anot=(window.__ensayoApps||[]).map(function(x){ return x.m+' '+x.a; }); return o; })()`;
(async () => {
  const cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ESPIA });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await cli.enviar('Page.navigate', { url: URL });
  let listo = false; for (let i = 0; i < 60 && !listo; i++) { await pausa(1000); try { listo = await cdp.evaluar(cli, `typeof go==='function'&&typeof API==='string'`); } catch (e) {} }
  chk('el ERP arranca', listo, '');
  await pausa(4000);
  console.log('\n== sin la marca ==');
  await cdp.evaluar(cli, `localStorage.removeItem('maleu_ensayo'); 1`);
  const a = await cdp.evaluar(cli, `(async function(){ window.__aApps=[]; try{ await fetch(API+'?action=ver&t='+Date.now()); return 'salio '+window.__aApps.length; }catch(e){ return 'cortado'; } })()`);
  chk('el GET sale como siempre', /^salio 1/.test(a), a);
  console.log('\n== con maleu_ensayo = 1 ==');
  await cdp.evaluar(cli, `localStorage.setItem('maleu_ensayo','1'); 1`);
  const b = await cdp.evaluar(cli, TRES);
  chk('GET, sbToken y POST no salen', b.get === 'cortado' && b.sb === 'cortado' && b.post === 'cortado' && b.apps === 0, b);
  chk('los tres quedan anotados con su acción', JSON.stringify(b.anot) === JSON.stringify(['GET ver', 'GET sbToken', 'POST pruebaEnsayoNoExiste']), b.anot);
  await cdp.evaluar(cli, `localStorage.removeItem('maleu_ensayo'); 1`);
  console.log('\n' + ok + ' ok · ' + mal + ' MAL');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('REVENTO', e); process.exit(2); });
