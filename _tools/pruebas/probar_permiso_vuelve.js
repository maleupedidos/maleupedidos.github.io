/* AJUSTES › Permisos: el tilde no vuelve atrás con una relectura atrasada (21/11/2026).
   SBSES=<sbses.json> BASE=http://localhost:8155 [APP=app.html] node probar_permiso_vuelve.js
   permiso_set_directo se corta y contesta OK. Después se fuerza ajReload(): lectura REAL que, por estar cortada la escritura,
   trae el permiso de antes (en producción la base lo escribe en el acto: esto simula una lectura que ya estaba en viaje). Nada se escribe. */
'use strict';
const P = './';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const STUB = `window.__posts=[];(function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||'');
  if(/\\/rest\\/v1\\/rpc\\/permiso_set_directo/.test(s)){window.__posts.push(1);return new Promise(function(res){setTimeout(function(){res(new Response(JSON.stringify({ok:true,aceptada:true,diferida:true,directo:true,orden:1}),{status:200,headers:{'Content-Type':'application/json'}}));},400);});}
  return o.apply(this,arguments);};})();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x', sbses(process.env.SBSES, 'tadeo') + STUB) });
  console.log('\n=== Permiso que no vuelve atrás · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("ajustes")');
  if (!await esperar(cli, `!!(AJ_DATA&&AJ_DATA.permisos&&Object.keys(AJ_DATA.permisos).length)`, 60000)) { console.log('Ajustes no cargó'); process.exit(1); }
  await pausa(2000);
  const s = await evaluar(cli, `(function(){var r=Object.keys(AJ_DATA.permisos).filter(function(k){return k!=='admin';})[0];var t=(AJ_DATA.tabsMeta||[]).map(function(x){return x.id;}).filter(function(id){return AJ_DATA.permisos[r].indexOf(id)<0;})[0];return JSON.stringify({r:r,t:t});})()`);
  const X = JSON.parse(s);
  console.log('  rol', X.r, '· tab', X.t, '(hoy sin acceso)');
  const TIENE = `(AJ_DATA.permisos[${JSON.stringify(X.r)}]||[]).indexOf(${JSON.stringify(X.t)})>=0`;
  await evaluar(cli, `ajPermisoSet(${JSON.stringify(X.r)},${JSON.stringify(X.t)},true)`);
  await esperar(cli, `__posts.length>0&&${TIENE}`, 5000);
  chk('con la respuesta queda con acceso', await evaluar(cli, TIENE));
  await evaluar(cli, `ajReload()`);
  await esperar(cli, `!AJ_PEDIDO&&!!AJ_DATA`, 20000); await pausa(1500);
  chk('una relectura real (con el permiso de antes) no le saca el acceso', await evaluar(cli, TIENE));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
