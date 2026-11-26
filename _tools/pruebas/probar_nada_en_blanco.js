/* NADA EN BLANCO (17/11/2026, pasada de terminación). La segunda apertura, que es la de todo el día: con la copia guardada,
   cada pantalla tiene que mostrar algo a los 300 ms de entrar (la copia, o un esqueleto), nunca un blanco ni un «Cargando»
   solo. Sesión de la base con la guarda de solo lectura.
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_nada_en_blanco.js [ancho]
   1) Primera visita: entra a Inicio, Pedidos, Ruta, Caja y Equipo y espera a que carguen (deja la copia guardada).
   2) Recarga la app y entra a cada una: a los 300 ms mide cuánto texto visible hay y si es solo «Cargando». */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
/* El PREP se reinyecta en cada carga: sin `dueno` en la sesión guardada, la recarga arranca como no-dueño y Equipo se ve
   en blanco hasta que la base contesta. En el celular de Tadeo la marca queda guardada (`maleu_panel_session`). */
if (!process.env.PREP_SESION) process.env.PREP_SESION = '{usuario:"tadeo",rol:"admin",nombre:"Tadeo Ustariz",ts:Date.now(),dueno:true}';
const PREP = require('./sesion_prep.js')('x');
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const TABS = (process.env.TABS || 'inicio,pedidos,ruta,caja,equipo').split(',');
const VIS = `(function(){var pg=document.querySelector('.pg.on');if(!pg)return JSON.stringify({id:'',n:0,t:''});
  var w=document.createTreeWalker(pg,NodeFilter.SHOW_TEXT),s='',n;
  while((n=w.nextNode())){var t=String(n.nodeValue||'').trim();if(!t)continue;var e=n.parentElement,ok=true;
    for(var x=e;x&&x!==document.body;x=x.parentElement){var cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05){ok=false;break;}}
    if(ok){var r=e.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight&&r.width>0)s+=t+' ';}}
  var esq=pg.querySelectorAll('.k-esq,.esq,[class*="esq"],[class*="-sk"],.skeleton').length;
  return JSON.stringify({id:pg.id,n:s.length,t:s.slice(0,90),esq:esq});})()`;
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
async function irA(cli, tab) { await evaluar(cli, `try{go('${tab}')}catch(e){}`); }
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: ANCHO < 700 ? 2 : 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(9000);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(typeof SESSION!=='undefined'&&SESSION&&SESSION.dueno)`)) break; await T(500); }
  for (const t of TABS) { await irA(cli, t); await T(9000); }
  console.log('   primera visita hecha; recargo (la copia queda guardada)');
  await cli.enviar('Page.reload', {});
  await T(2500);
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `typeof go==='function'`)) break; await T(250); }
  for (const t of TABS) {
    await irA(cli, t); await T(300);
    const v = JSON.parse(await evaluar(cli, VIS));
    const soloCargando = /^\s*(Cargando|cargando)[^]{0,30}$/.test(v.t);
    chk(v.id === 'p-' + t && (v.n > 40 || v.esq > 0) && !soloCargando, `${t} a los 300 ms: ${v.n} caracteres${v.esq ? ', ' + v.esq + ' esqueletos' : ''} · «${v.t.slice(0, 70)}»`);
    await T(1500);
  }
  /* La consola de todo el recorrido (el PREP junta errores, rechazos y console.error en window.__err). «ResizeObserver loop»
     es un aviso del navegador (un observador que reacomoda en su propio cuadro), no una excepción: no se ve ni corta nada. */
  const errs = JSON.parse(await evaluar(cli, `JSON.stringify((window.__err||[]).filter(function(e){return !/cortado por la prueba|solo lectura|ResizeObserver loop/i.test(e)}))`));
  chk(!errs.length, 'consola sin errores en las ' + TABS.length + ' pantallas' + (errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
