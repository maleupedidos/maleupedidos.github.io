/* EVOLUCIÓN, auditoría del 11/11/2026.
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_evolucion.js [ancho]
   Entra a Evolución APENAS abre la app (como cuando se toca rápido) y mira a los 3, 15 y 40 s. Sostiene:
     · nunca queda «No se pudieron traer … volvé a entrar» por una falla del arranque (reintenta sola);
     · la semana recién arrancada no se proyecta (el martes decía «cierra en $26,6M, 507 % arriba»);
     · «casas nuevas» nunca muestra un número contado sin la historia: o «Contando…» o el número de la base
       (octubre 2026: 37 nuevas de 141 activas, medido en la base el 11/11);
     · sin símbolos, sin códigos, nada se sale. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const guarda = require(path.join(__dirname, 'sbses_guarda.js'));
const SBSES = guarda(process.env.SBSES, process.env.USUARIO || 'tadeo');
if (!SBSES) { console.error('falta SBSES'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (c, m, x) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };
(async () => {
  const cli = await abrir();
  const ev = (e) => evaluar(cli, e);
  try {
    await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 40 && !(await ev("typeof go==='function'")); i++) await T(250);
    await T(1500);
    await ev("go('evolucion')");
    const foto = () => ev(`JSON.stringify((function(){var b=document.getElementById('evuBody'),t=b?b.innerText:'';
      return {falla:/No se pudieron traer/.test(t), semana:(t.match(/Esta semana va[^\\n]*/)||[''])[0],
        nuevas:(t.match(/Van [0-9]+ casas nuevas[^\\n]*/)||[''])[0], contando:/Contando con todo el historial/.test(t),
        ped:((typeof D!=='undefined'&&D&&D.pedidos)||[]).length,
        sim:(t.match(/[\\u25C0\\u25B6\\u25BE\\u25B4\\u270E\\u21BB\\u2713\\u2715\\u2717\\u2605\\u26a0]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/g)||[]),
        cod:(t.match(/\\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{3,}\\b/g)||[]), sw:b?b.scrollWidth:0, cw:b?b.clientWidth:0};})())`).then(JSON.parse);
    const fotos = [];
    for (const s of [3, 15, 40]) { await T((s - (fotos.length ? [3, 15, 40][fotos.length - 1] : 0)) * 1000); fotos.push(await foto()); }
    console.log('   ' + fotos.map((f, i) => [3, 15, 40][i] + 's: ' + f.ped + ' pedidos · ' + (f.contando ? 'contando' : f.nuevas)).join(' | '));
    chk(!fotos[2].falla, 'a los 40 s no queda «No se pudieron traer» (reintentó solo)', fotos[2]);
    // La semana: con lo cerrado < 20 % no se proyecta. Lunes a jueves no proyecta; viernes a domingo, sí.
    const dow = Number(await ev('new Date().getDay()'));
    const temprano = dow >= 1 && dow <= 4;
    chk(temprano ? !/cierra en/.test(fotos[2].semana) : true, `semana recién arrancada: sin «cierra en» (${fotos[2].semana || 'sin frase'})`, fotos[2].semana);
    // Casas nuevas: en cada foto, o «Contando…» o el número de la base.
    const base = JSON.parse(await ev("JSON.stringify({oct:_planIndicadorMes('casas_nuevas',2026,9,31)})"));
    const bien = fotos.every((f) => f.contando || /octubre fueron 37/.test(f.nuevas) || !f.nuevas);
    chk(base.oct === 37 && bien, 'casas nuevas: nunca un número sin historia (o «Contando…», o 37 en octubre, como la base)', { base, fotos: fotos.map((f) => f.contando ? 'contando' : f.nuevas) });
    chk(!fotos[2].contando && /octubre fueron 37/.test(fotos[2].nuevas), 'con toda la historia, dice las de verdad', fotos[2].nuevas);
    chk(!fotos[2].sim.length && !fotos[2].cod.length, 'sin símbolos ni códigos', { sim: fotos[2].sim, cod: fotos[2].cod });
    chk(fotos[2].sw <= fotos[2].cw + 1, `a ${ANCHO} px nada se sale`, fotos[2]);
    const errs = JSON.parse(await ev('JSON.stringify(window.__errores||[])') || '[]');
    chk(!errs.length, 'sin errores de JS', errs);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
