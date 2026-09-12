/**
 * ¿Que numeros se ven con el punto decimal INGLES en una pantalla en castellano?
 *
 * En es-AR el punto es separador de MILES (`$1.234` esta bien) y el decimal es
 * la coma. `toFixed()` siempre devuelve punto, asi que un `(n*100).toFixed(1)`
 * pinta "31.0%" donde tiene que decir "31,0%".
 *
 * POR QUE SE MIDE EN LA PANTALLA Y NO SE LEE EL CODIGO: en el panel hay 89
 * `toFixed`, y **varios van a atributos de SVG** (`x`, `y`, el `d` de un path),
 * donde el punto es obligatorio por sintaxis. Un reemplazo a ciegas rompe los
 * graficos sin dar un solo error. Esto reporta solo lo que una persona VE.
 *
 * Descarta lo que en castellano es correcto:
 *   · el separador de miles  -> `$1.234`, `1.234 casas` (3 digitos exactos detras)
 *   · una hora              -> `14.30`
 *   · una version o una ruta -> `v1.2`, `app.html`
 *
 *   node ver_decimales.js <token> [390|1440]
 */
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')(process.argv[2]);

const ANCHO = Number(process.argv[3] || 1440);
/* Las tabs que muestran numeros con decimales. Las sub-tabs se abren aparte
   porque conviven en el DOM y hay que pararse en cada una. */
const TABS = ['inicio', 'pedidos', 'caja', 'egresos', 'ventas', 'stock',
              'proveedores', 'estancias', 'planificacion', 'resumen'];

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
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
  if (listo !== 'listo') { console.log('  ' + listo); process.exit(1); }

  console.log('\n== Decimales con punto ingles · ' + ANCHO + 'px ==\n');

  /* El barrido vive en el navegador para poder mirar nodo por nodo. */
  const BARRER = `(() => {
    const malos = [];
    let examinados = 0;
    /* Un decimal de verdad: 1 o 2 digitos detras del punto. Con 3 exactos es el
       separador de miles del castellano y esta BIEN. */
    const RE = /\\d\\.\\d{1,2}(?!\\d)/;
    const OK = [
      /^\\s*v?\\d+\\.\\d+(\\.\\d+)?\\s*$/,      /* una version suelta */
      /\\.(html|js|json|css|py|md)\\b/,        /* un archivo */
      /\\d{1,2}\\.\\d{2}\\s*(hs|h)\\b/,        /* una hora: 14.30 hs */
    ];
    const vis = (e) => {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    /* Solo nodos de TEXTO, y solo si su padre se ve. Asi no se cuenta el mismo
       numero una vez por ancestro, ni se miran atributos de SVG (que tienen que
       llevar punto por sintaxis). */
    const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = it.nextNode())) {
      const t = String(n.nodeValue || '').trim();
      if (!t || t.length > 300) continue;
      const p = n.parentElement;
      if (!p || p.closest('script, style')) continue;
      if (!vis(p)) continue;
      examinados++;
      if (!RE.test(t)) continue;
      if (OK.some(r => r.test(t))) continue;
      malos.push({
        txt: t.slice(0, 90),
        donde: (p.className && typeof p.className === 'string' ? '.' + p.className.split(' ')[0] : p.tagName),
        tab: (document.querySelector('.pg.on') || {}).id || '?',
      });
    }
    return { examinados, malos };
  })()`;

  let totalEx = 0;
  const hallados = [];
  for (const tab of TABS) {
    const r = await evaluar(cli, `(async () => {
      try { go('${tab}'); } catch (e) { return { salteada: '${tab}', motivo: String(e.message || e) }; }
      /* Esperar a que la tab tenga contenido: medir una pantalla que no llego a
         pintar da "0 problemas" sin haber mirado nada. */
      const t0 = Date.now();
      while (Date.now() - t0 < 30000) {
        const c = document.querySelector('.pg.on');
        if (c && c.innerText && c.innerText.trim().length > 120) break;
        await new Promise(r2 => setTimeout(r2, 250));
      }
      return ${BARRER};
    })()`);
    if (r.salteada) { console.log('  -- ' + tab + ': no se pudo abrir (' + r.motivo + ')'); continue; }
    totalEx += r.examinados;
    const n = (r.malos || []).length;
    console.log('  ' + (n ? 'x ' : '  ') + tab.padEnd(14) + r.examinados + ' textos · ' + n + ' con punto decimal');
    (r.malos || []).forEach(m => hallados.push(Object.assign({ tab }, m)));
  }

  /* Las sub-tabs que tienen sus propios numeros. */
  const SUBS = [
    ['ventas', "vSwitchTab('productos')", 'ventas/PRODUCTOS'],
    ['ventas', "vSwitchTab('tendencia')", 'ventas/TENDENCIA'],
    ['ventas', "vSwitchTab('combos')", 'ventas/COMBOS'],
    ['inicio', "goSubInicio('eerr')", 'inicio/EERR'],
    ['inicio', "goSubInicio('cierre')", 'inicio/CIERRE'],
    ['stock', "stSwitchTab('productos')", 'stock/PRODUCTOS'],
  ];
  for (const [tab, fn, nombre] of SUBS) {
    const r = await evaluar(cli, `(async () => {
      try { go('${tab}'); ${fn}; } catch (e) { return { salteada: 1, motivo: String(e.message || e) }; }
      const t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        const c = document.querySelector('.pg.on');
        if (c && c.innerText && c.innerText.trim().length > 120) break;
        await new Promise(r2 => setTimeout(r2, 250));
      }
      await new Promise(r2 => setTimeout(r2, 1200));
      return ${BARRER};
    })()`);
    if (r.salteada) { console.log('  -- ' + nombre + ': no se pudo abrir (' + r.motivo + ')'); continue; }
    totalEx += r.examinados;
    const n = (r.malos || []).length;
    console.log('  ' + (n ? 'x ' : '  ') + nombre.padEnd(20) + r.examinados + ' textos · ' + n + ' con punto decimal');
    (r.malos || []).forEach(m => hallados.push(Object.assign({ tab: nombre }, m)));
  }

  console.log('\n  ' + totalEx + ' textos examinados · ' + hallados.length + ' con el punto ingles');
  if (!totalEx) { console.log('\n  0 sobre 0 examinados no prueba nada: la pantalla no pinto\n'); process.exit(2); }

  if (hallados.length) {
    console.log('');
    const vistos = {};
    hallados.forEach(h => {
      const k = h.tab + '|' + h.donde + '|' + h.txt;
      if (vistos[k]) return;
      vistos[k] = 1;
      console.log('  ' + h.tab.padEnd(20) + h.donde.padEnd(22) + h.txt);
    });
  }
  console.log('');
  process.exit(hallados.length ? 1 : 0);
})().catch(e => { console.error('revento:', e); process.exit(2); });
