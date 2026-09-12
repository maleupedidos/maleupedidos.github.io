/**
 * DIAGNOSTICO de la tab RUTA — mide y NO toca nada.
 *
 * Tadeo (11/9/2026): "hay muchisimo para mejorar en el sistema de entregas, de
 * reparto, de ruta... NO TOQUES RUTA que la seguimos usando".
 *
 * Asi que esto solo MIDE, con la sesion real y TODOS los POST interceptados:
 * no escribe un solo dato y no modifica un solo archivo. La idea es tener el
 * diagnostico con numeros para cuando se pueda tocar.
 *
 *   node diagnosticar_ruta.js <token> [390|1440]
 */
const R = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(R + 'cdp.js');
const PREP = require(R + 'sesion_prep.js')(process.argv[2]);

const ANCHO = Number(process.argv[3] || 390);
const PISO = ANCHO <= 560 ? 38 : 26;

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  /* Los POST ya los corta el PREP. Se agrega un guard extra que ADEMAS los
     anota, para poder afirmar al final que no salio ninguno. */
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + `
    window.__postsVistos = [];
    (function(){ var o = window.fetch; window.fetch = function (u, x) {
      if (x && String(x.method || '').toUpperCase() === 'POST') {
        try { window.__postsVistos.push(JSON.parse(x.body)); } catch (e) { window.__postsVistos.push({crudo:1}); }
      }
      return o.apply(this, arguments); }; })();
  ` });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
  await new Promise(r => setTimeout(r, 2500));

  const listo = await evaluar(cli, `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      if (typeof window.go === 'function') return 'listo';
      await new Promise(r => setTimeout(r, 200));
    }
    return 'el ERP no arranco';
  })()`);
  if (listo !== 'listo') { console.log(listo); process.exit(1); }

  console.log('\n╔══ DIAGNOSTICO de RUTA · ' + ANCHO + 'px · solo lectura ══╗\n');

  const t0 = Date.now();
  const arranque = await evaluar(cli, `(async () => {
    go('ruta');
    const t0 = Date.now();
    const hitos = [];
    while (Date.now() - t0 < 90000) {
      const s = Math.round((Date.now() - t0) / 1000);
      const c = document.getElementById('pg-ruta') || document.getElementById('p-ruta');
      if (typeof window.getPendientes === 'function' && !hitos.some(h => h.k === 'motor'))
        hitos.push({ k: 'motor', s });
      if (c && c.innerText.trim().length > 200 && !hitos.some(h => h.k === 'pinto'))
        hitos.push({ k: 'pinto', s });
      try {
        if (typeof getPendientes === 'function' && getPendientes().length && !hitos.some(h => h.k === 'datos'))
          hitos.push({ k: 'datos', s, n: getPendientes().length });
      } catch (e) {}
      if (hitos.length >= 3) break;
      await new Promise(r => setTimeout(r, 300));
    }
    return { hitos, seg: Math.round((Date.now() - t0) / 1000) };
  })()`);
  console.log('1) ARRANQUE');
  arranque.hitos.forEach(h => console.log('   ' + h.k.padEnd(7) + h.s + 's' + (h.n ? '  (' + h.n + ' entregas)' : '')));
  if (arranque.hitos.length < 3) console.log('   (faltaron hitos tras ' + arranque.seg + 's)');

  const sub = await evaluar(cli, `(() => {
    const tabs = [...document.querySelectorAll('#pg-ruta .tab, #pg-ruta [data-tab], #pg-ruta .rut-tab')];
    return { n: tabs.length, ids: tabs.map(t => (t.textContent || '').trim().slice(0, 14)) };
  })()`);
  console.log('\n2) SUB-TABS: ' + sub.n + ' -> ' + JSON.stringify(sub.ids));

  /* Recorrer las sub-tabs y medir cada una. `switchTab` es la funcion de la
     sub-app; se la llama por window porque el build la publica. */
  const SUBS = ['armado', 'ruta', 'cobros', 'nuevo'];
  console.log('\n3) CADA SUB-TAB (controles chicos, desborde, texto cortado)');
  for (const t of SUBS) {
    const r = await evaluar(cli, `(async () => {
      try { switchTab('${t}'); } catch (e) { return { err: String(e.message || e) }; }
      await new Promise(r2 => setTimeout(r2, 1800));
      const c = document.getElementById('pg-ruta') || document.body;
      const vis = (e) => { const s = getComputedStyle(e); if (s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0) return false;
                           const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const ctrl = [...c.querySelectorAll('button, input, select, a[onclick], [role=button]')].filter(vis);
      const chicos = ctrl.filter(e => e.getBoundingClientRect().height < ${PISO})
        .map(e => ((e.textContent || e.className || e.tagName) + '').trim().slice(0, 26) + ' ' + Math.round(e.getBoundingClientRect().height));
      /* Texto que no entra en su caja (solo nodos de texto, padres visibles) */
      const cortados = [];
      const it = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = it.nextNode())) {
        const p = n.parentElement;
        if (!p || !vis(p)) continue;
        const txt = String(n.nodeValue || '').trim();
        if (!txt || txt.length > 120) continue;
        const s = getComputedStyle(p);
        if (s.textOverflow === 'ellipsis' || s.overflow === 'auto' || s.overflow === 'scroll') continue;
        if (p.scrollWidth > p.clientWidth + 2 && p.clientWidth > 0) cortados.push(txt.slice(0, 40));
      }
      return {
        chars: c.innerText.trim().length,
        ctrl: ctrl.length,
        chicos: [...new Set(chicos)].slice(0, 10),
        cortados: [...new Set(cortados)].slice(0, 6),
        desborde: document.documentElement.scrollWidth - window.innerWidth,
        alto: c.scrollHeight,
      };
    })()`);
    if (r.err) { console.log('   ' + t.padEnd(9) + 'no se pudo abrir: ' + r.err); continue; }
    console.log('   ' + t.padEnd(9) + String(r.chars).padStart(6) + ' chars · ' + String(r.ctrl).padStart(3)
      + ' controles · chicos:' + String(r.chicos.length).padStart(2)
      + ' · cortados:' + String(r.cortados.length).padStart(2)
      + ' · desb:' + String(r.desborde).padStart(3) + ' · alto ' + r.alto + 'px');
    if (r.chicos.length) console.log('              chicos: ' + JSON.stringify(r.chicos));
    if (r.cortados.length) console.log('              cortados: ' + JSON.stringify(r.cortados));
  }

  console.log('\n4) CONSOLA Y POST');
  const fin = await evaluar(cli, `(() => ({
    err: (window.__err || []).slice(0, 8),
    posts: (window.__postsVistos || []).map(p => p && p.action).filter(Boolean),
  }))()`);
  console.log('   errores de consola: ' + (fin.err.length ? JSON.stringify(fin.err) : 'ninguno'));
  console.log('   POST salidos:       ' + (fin.posts.length ? JSON.stringify(fin.posts) : 'ninguno (interceptados)'));
  console.log('\n   total: ' + Math.round((Date.now() - t0) / 1000) + 's\n');
  process.exit(0);
})().catch(e => { console.error('revento:', e); process.exit(2); });
