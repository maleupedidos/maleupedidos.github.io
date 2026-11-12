/* CATERING, auditoría del 12/11/2026.
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_catering.js [ancho]
   Sostiene, contra la base de verdad (solo lectura: toda escritura POST se corta en el navegador):
     · la lista tiene Próximos, Realizados y (si hay) Cancelados, en ese orden;
     · Realizados = los pedidos canal Catering de la base, y el total cruza con la base:
         venta = Σ billed_amount; costo = Σ cost_amount + Σ egresos `out|catering` (como el EERR);
       (al 12/11/2026: 5 eventos, $3.051.000 de venta, $1.593.363 + $581.869,67 de costo);
     · el bautismo de Belu Pascual (26/9, no se hizo) está en Cancelados y no en Próximos;
     · 4 KPIs, Cotizar primario y Cumpleaños secundario, sin ↻;
     · sin símbolos, sin códigos (ni en inglés), nada se sale; también en la ficha y en el cotizador. */
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
const VENTA = Number(process.env.VENTA || 3051000), COSTO = Number(process.env.COSTO || 1593363 + 581869.67), N = Number(process.env.N || 5);
let ok = 0, mal = 0;
const chk = (c, m, x) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, x !== undefined ? JSON.stringify(x).slice(0, 700) : ''); } };
const LIMPIO = `function(t){return {sim:(t.match(/[\\u2190\\u2192\\u25C0\\u25B6\\u25BE\\u25B4\\u270E\\u21BB\\u2713\\u2715\\u2717\\u2605\\u26a0]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/g)||[]),
  cod:(t.match(/\\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{3,}\\b|\\b(CONFIRMED|QUOTED|CANCELLED|COMPLETED|confirmed|quoted|cancelled|completed|in_production|budget|revenue|deposit|expected|received)\\b/g)||[])};}`;
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
    await ev(`(function(){var of=window.fetch;window.fetch=function(u,o){var url=String((u&&u.url)||u||'');if(o&&String(o.method||'').toUpperCase()==='POST'&&!/rpc\\/(catering_pantalla|catering_detalle_pantalla|mi_sesion|palancas|permiso|.*_pantalla|lectura)/.test(url)&&!/auth\\/v1/.test(url))return Promise.reject(new TypeError('cortado por la prueba'));return of.apply(this,arguments);};})()`);
    await ev("go('catering')");
    for (let i = 0; i < 60 && !(await ev("!!document.querySelector('#catApp .cat-sec')")); i++) await T(500);
    await T(1500);
    const r = JSON.parse(await ev(`JSON.stringify((function(){var a=document.getElementById('catApp'),t=a.innerText,L=(${LIMPIO})(t);
      var secs=[].map.call(a.querySelectorAll('.cat-sec>h3,.cat-canc>summary'),function(h){return h.innerText.replace(/\\s+\\d+$/,'').trim();});
      var sec=function(nom){return [].filter.call(a.querySelectorAll('.cat-sec'),function(s){var h=s.querySelector('h3,summary');return h&&h.innerText.indexOf(nom)===0;})[0];};
      var real=sec('Realizados'),prox=sec('Próximos'),canc=sec('Cancelados');
      var btns=[].map.call(a.querySelectorAll('.cat-head button'),function(b){return b.className+'|'+b.innerText.trim();});
      return {secs:secs,nReal:real?real.querySelectorAll('.pc').length:-1,tot:real&&real.querySelector('.cat-tot')?real.querySelector('.cat-tot').innerText:'',
        proxTxt:prox?prox.innerText:'',cancTxt:canc?canc.textContent:'',kpis:a.querySelectorAll('.cat-kpi').length,btns:btns,
        venta:(window._catRealizadosArmar?_catRealizadosArmar():[]).reduce(function(n,x){return n+x.v;},0),
        costo:(window._catRealizadosArmar?_catRealizadosArmar():[]).reduce(function(n,x){return n+x.co+x.g;},0),
        sim:L.sim,cod:L.cod,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
        chicos:[].filter.call(a.querySelectorAll('button,summary'),function(b){var q=b.getBoundingClientRect();return q.width>0&&q.height<31.5;}).map(function(b){return b.innerText.slice(0,20)+' '+Math.round(b.getBoundingClientRect().height);})};})())`));
    console.log('   secciones: ' + r.secs.join(' / ') + ' · ' + r.tot.replace(/\s+/g, ' '));
    chk(r.secs[0] === 'Próximos' && r.secs.indexOf('Realizados') > 0, 'Próximos arriba y Realizados abajo', r.secs);
    chk(r.nReal === N, `Realizados tiene los ${N} pedidos canal Catering de la base`, r.nReal);
    chk(Math.round(r.venta) === Math.round(VENTA), `venta de los realizados = base al peso ($${VENTA})`, r.venta);
    chk(Math.abs(r.costo - COSTO) < 0.01, `costo = costo de los pedidos + egresos de Catering, al centavo (${COSTO})`, r.costo);
    chk(r.tot.indexOf('$' + Math.round(VENTA).toLocaleString('es-AR')) >= 0, 'el total impreso dice la venta de la base', r.tot);
    chk(!/Belu Pascual/.test(r.proxTxt) && /Belu Pascual/.test(r.cancTxt), 'el bautismo de Belu Pascual está en Cancelados, no en Próximos', { prox: r.proxTxt.slice(0, 200), canc: r.cancTxt.slice(0, 200) });
    chk(r.kpis === 4, '4 KPIs', r.kpis);
    chk(r.btns.length === 2 && /btn-primary\|Cotizar/.test(r.btns[0]) && /btn-reload-caja\|Cumpleaños/.test(r.btns[1]), 'Cotizar primario, Cumpleaños secundario, sin Actualizar', r.btns);
    chk(!r.sim.length && !r.cod.length, 'lista: sin símbolos ni códigos', { sim: r.sim, cod: r.cod });
    chk(r.sw <= r.cw + 1, `lista: nada se sale a ${ANCHO} px`, { sw: r.sw, cw: r.cw });
    chk(!r.chicos.length, 'lista: botones de ≥ 32 px', r.chicos);
    // La ficha del evento cancelado.
    await ev(`(function(){var c=document.querySelector('#catApp .cat-canc');if(c)c.open=true;var p=c&&c.querySelector('.pc');if(p)p.click();})()`);
    for (let i = 0; i < 40 && !(await ev("!!document.querySelector('#catApp select[name=status]')")); i++) await T(500);
    const f = JSON.parse(await ev(`JSON.stringify((function(){var a=document.getElementById('catApp'),s=a.querySelector('select[name=status]'),L=(${LIMPIO})(a.innerText);
      return {abierta:!!s,estado:s?s.options[s.selectedIndex].text:'',valor:s?s.value:'',sim:L.sim,cod:L.cod,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};})())`));
    chk(f.abierta && f.estado === 'Cancelado' && f.valor === 'cancelled', 'la ficha abre con el estado en castellano (el valor sigue siendo el código)', f);
    chk(!f.sim.length && !f.cod.length, 'ficha: sin símbolos ni códigos', f);
    chk(f.sw <= f.cw + 1, 'ficha: nada se sale', f);
    // El cotizador.
    await ev("_catDetalle=null;catCotizar()"); await T(800);
    const c = JSON.parse(await ev(`JSON.stringify((function(){var a=document.getElementById('catApp'),L=(${LIMPIO})(a.innerText);
      return {res:(document.getElementById('cotResumen')||{}).innerText||'',sub:!!a.querySelector('.cat-sub'),sim:L.sim,cod:L.cod,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};})())`));
    chk(/Margen de Maleu/.test(c.res), 'el cotizador calcula (35 personas por defecto)', c.res.slice(0, 120));
    chk(!c.sub && !c.sim.length && !c.cod.length, 'cotizador: sin subtítulo, sin símbolos, sin códigos', c);
    chk(c.sw <= c.cw + 1, 'cotizador: nada se sale', c);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
