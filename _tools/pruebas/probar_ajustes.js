/* AJUSTES, auditoría del 11/11/2026: Usuarios (rol en castellano, qué ve, buscador de pedidos) y Parámetros (nombres en
   castellano, lo frecuente arriba, las palancas técnicas aparte).
     python ../estancias/scripts/migraciones/sesion_prueba.py crear <scratch>/sbses.json
     SBSES=<scratch>/sbses.json BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_ajustes.js [ancho]
   Sesión de la base con la guarda de solo lectura; los guardados de Config_Maleu se interceptan (no se escribe nada). */
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
    await T(3000);
    if (!(await guarda.verificarGuarda(cli, evaluar))) throw new Error('la guarda de solo lectura no corta');
    await T(8000);
    await ev("window.__cfg=[];_cfgMaleuSet=function(b){window.__cfg.push(JSON.parse(JSON.stringify(b)));return Promise.resolve({ok:true,clave:b.param});};ajReload=function(){return Promise.resolve();};");
    await ev("go('ajustes')");
    for (let i = 0; i < 40 && !(await ev('!!(AJ_DATA&&AJ_DATA.usuarios)')); i++) await T(500);
    await ev("ajGo('usuarios')"); await T(600);

    /* ── Usuarios ── */
    const u = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#ajBody .aj-row.u[data-orig]'),function(r){
      var s=r.querySelector('select[data-k="rol"]'),i=r.querySelector('.aj-u-info'),b=r.querySelector('.aj-u-sw input');
      return {u:r.getAttribute('data-orig'),rol:s?s.options[s.selectedIndex].text:'',v:s?s.value:'',info:i?i.textContent:'',busca:b?b.checked:null};}))`));
    chk(u.length >= 8, `Usuarios: ${u.length} usuarios con su fila`, u.length);
    const de = (x) => u.find((r) => r.u === x) || {};
    chk(de('tadeo').rol === 'Administrador' && de('joaquin').rol === 'Gerente' && de('robot').rol === 'Robot de pruebas' && de('santos').rol === 'Repartidor',
      'el rol se lee en castellano (Administrador, Gerente, Repartidor, Robot de pruebas)', u.map((r) => r.u + '=' + r.rol));
    chk(de('tadeo').v === 'admin' && de('joaquin').v === 'joaquin', 'lo guardado sigue siendo el código del rol', [de('tadeo').v, de('joaquin').v]);
    chk(u.every((r) => / ve: /.test(r.info)), 'cada usuario dice qué pantallas ve', u.filter((r) => !/ ve: /.test(r.info)).map((r) => r.u));
    // Contra la base: qué ve un repartidor = las tabs tildadas en Permisos.
    const ve = JSON.parse(await ev(`JSON.stringify((function(){var p=(AJ_DATA.permisos||{}).repartidor||[];return (AJ_DATA.tabsMeta||[]).filter(function(t){return p.indexOf(t.id)>=0;}).map(function(t){return t.label;});})())`));
    chk(ve.length > 0 && ve.every((l) => de('santos').info.indexOf(l) >= 0), 'lo que ve el repartidor coincide con Permisos', { ve, info: de('santos').info });
    chk(/sí \(es administrador\)/.test(de('tadeo').info), 'un administrador tiene el buscador siempre');
    chk(de('santos').busca === true && de('carpi').busca === false, 'buscador: Tatu sí, Agustín no (lo de hoy)', [de('santos').busca, de('carpi').busca]);
    chk(de('robot').busca === null, 'el robot no tiene interruptor de buscador');
    await ev(`(function(){var r=document.querySelector('#ajBody .aj-row.u[data-orig="carpi"] .aj-u-sw input');r.checked=true;r.dispatchEvent(new Event('change'));})()`); await T(400);
    const cfg = JSON.parse(await ev('JSON.stringify(window.__cfg)'));
    chk(cfg.length === 1 && cfg[0].param === 'PED_BUSCA_USUARIOS' && cfg[0].valor.split(',').sort().join(',') === 'carpi,santos',
      'prender el buscador a Agustín guarda PED_BUSCA_USUARIOS = santos,carpi', cfg);
    chk(!(await ev("/[✕✓★⚠]/.test(document.getElementById('ajBody').textContent)")), 'sin símbolos (✕ ✓ ★ ⚠) en Usuarios');
    const anch = JSON.parse(await ev("JSON.stringify({sw:document.getElementById('ajBody').scrollWidth,cw:document.getElementById('ajBody').clientWidth})"));
    chk(anch.sw <= anch.cw + 1, `a ${ANCHO} px nada se sale de Usuarios`, anch);

    /* ── Parámetros (bloque 2) ── */
    if (process.env.PARAMS) {
      await ev("window.__cfg=[];ajGo('params')"); await T(800);
      const p = JSON.parse(await ev(`JSON.stringify({grupos:[].map.call(document.querySelectorAll('#ajBody .aj-pg h3'),function(h){return h.textContent;}),
        filas:[].map.call(document.querySelectorAll('#ajBody .aj-pr'),function(r){return {k:r.getAttribute('data-k'),n:(r.querySelector('.aj-pr-n')||{}).textContent||'',d:(r.querySelector('.aj-pr-d')||{}).textContent||''};}),
        tec:(document.querySelector('#ajBody details.aj-tec summary')||{}).textContent||'', tecAbierto:!!(document.querySelector('#ajBody details.aj-tec')||{}).open,
        visible:document.getElementById('ajBody').innerText})`));
      chk(p.filas.length >= 20, `Parámetros: ${p.filas.length} de negocio con nombre`, p.filas.length);
      chk(p.filas.every((f) => f.n && !/^[A-Z0-9_]+$/.test(f.n) && f.d.length > 10), 'cada uno con nombre en castellano y una línea de qué hace', p.filas.filter((f) => !f.n || /^[A-Z0-9_]+$/.test(f.n) || f.d.length <= 10));
      chk(/frecuente|seguido/i.test(p.grupos[0] || ''), 'el primer grupo es lo que se cambia seguido', p.grupos);
      chk(p.filas[0] && p.filas[0].k === 'TIENDA_CIERRE_HOY', 'arriba de todo: el cierre de la tienda', p.filas[0]);
      chk(!/TIENDA_CIERRE_HOY|KARDEX_SI_|_DIRECTO\b/.test(p.visible), 'ningún código a la vista (las palancas técnicas, plegadas)', (p.visible.match(/[A-Z]{3,}_[A-Z_]+/g) || []).slice(0, 5));
      chk(/palancas/i.test(p.tec) && !p.tecAbierto, 'las palancas técnicas van aparte y plegadas', p.tec);
      chk(!/Contadores de numeraci/.test(p.visible), 'sin la tarjeta de contadores (códigos que no se entendían)');
      // Guardar uno: viaja con el código de siempre.
      await ev(`(function(){var r=document.querySelector('#ajBody .aj-pr[data-k="TIENDA_CIERRE_HOY"]');r.querySelector('[data-k="valor"]').value='45';r.querySelector('button.aj-btn').click();})()`); await T(500);
      const c2 = JSON.parse(await ev('JSON.stringify(window.__cfg)'));
      chk(c2.length === 1 && c2[0].param === 'TIENDA_CIERRE_HOY' && c2[0].valor === '45', 'Guardar el cierre de la tienda manda TIENDA_CIERRE_HOY = 45', c2);
      // Los valores, contra la base (lo que trae AJ_DATA es la base: ajustes_data_pantalla).
      const vv = JSON.parse(await ev(`JSON.stringify((function(){var g=function(k){var r=document.querySelector('#ajBody .aj-pr[data-k="'+k+'"] [data-k="valor"]');return r?r.value:null;};
        var b=function(k){var f=null;(AJ_DATA.configMaleu||[]).forEach(function(c){if(c.param===k)f=c.valor;});return f;};
        return {mo:g('MARGEN_OBJETIVO'),moB:b('MARGEN_OBJETIVO'),cm:g('CAJA_MINIMA'),cmB:b('CAJA_MINIMA'),env:g('Envío fuera de Home ($)'),envB:((AJ_DATA.configNegocio||[]).filter(function(c){return /Env/.test(c.param);})[0]||{}).valor,canal:g('AVISOS_CANAL'),canalB:b('AVISOS_CANAL')};})())`));
      chk(Number(vv.mo.replace(',', '.')) / 100 === Number(vv.moB) && vv.cm.split('.').join('') === String(vv.cmB) && vv.env.split('.').join('') === String(vv.envB) && vv.canal === vv.canalB,
        `los valores coinciden con la base (margen ${vv.mo} % = ${vv.moB}, caja mínima ${vv.cm}, envío ${vv.env}, avisos ${vv.canal})`, vv);
      await ev(`window.__cfg=[];(function(){var r=document.querySelector('#ajBody .aj-pr[data-k="MARGEN_OBJETIVO"]');r.querySelector('[data-k="valor"]').value='30';r.querySelector('button.aj-btn').click();})()`); await T(500);
      const c3 = JSON.parse(await ev('JSON.stringify(window.__cfg)'));
      chk(c3.length === 1 && c3[0].valor === '0.3', 'un % se guarda como fracción (30 % → 0.3, como siempre)', c3);
      const a2 = JSON.parse(await ev("JSON.stringify({sw:document.getElementById('ajBody').scrollWidth,cw:document.getElementById('ajBody').clientWidth})"));
      chk(a2.sw <= a2.cw + 1, `a ${ANCHO} px nada se sale de Parámetros`, a2);
      const nav = JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('#p-ajustes .aj-nav .aj-pill'),function(b){return b.textContent;}))"));
      chk(nav[0] === 'Precios' && nav.indexOf('Config operativa') < 0, 'el menú arranca por lo que se cambia seguido (Precios) y sin «Config operativa»', nav);
    }
    /* ── Todas las sub-secciones: sin símbolos, sin códigos a la vista, nada que se salga ── */
    if (process.env.TODAS) {
      const secs = JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('#p-ajustes .aj-nav .aj-pill'),function(b){return b.getAttribute('data-sec');}))"));
      for (const s of secs) {
        await ev(`ajGo(${JSON.stringify(s)})`);
        for (let i = 0; i < 16; i++) { await T(500); if (!(await ev("/Cargando|Leyendo/.test(document.getElementById('ajBody').innerText)"))) break; }
        await T(400);
        const r = JSON.parse(await ev(`JSON.stringify((function(){var b=document.getElementById('ajBody'),t=b.innerText;
          return {n:t.length,sim:(t.match(/[\\u2715\\u2713\\u2717\\u2605\\u26a0\\u2197]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/g)||[]),
            cod:(t.match(/\\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{3,}\\b/g)||[]),sw:b.scrollWidth,cw:b.clientWidth};})())`));
        chk(r.n > 40 && !r.sim.length && !r.cod.length && r.sw <= r.cw + 1, `${s}: ${r.n} letras, sin símbolos ni códigos, nada se sale`, r);
      }
    }
    const errs = JSON.parse(await ev('JSON.stringify(window.__errores||[])') || '[]');
    chk(!errs.length, 'sin errores de JS', errs);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
