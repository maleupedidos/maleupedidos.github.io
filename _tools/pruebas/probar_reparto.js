/**
 * La card "Donde esta" de Stock > PRODUCTOS no suma unidades con KILOS.
 *
 * Sumaba `porDep` de los 34 productos sin mirar la unidad y lo mostraba con
 * `stFmt(tot,'u')` bajo el rotulo "unidades en cada deposito": al 11/9/2026,
 * 168 unidades + 46,155 kg de carne salian como **"Ustariz 214"**.
 *
 * Intercepta `action=depositos` con datos INVENTADOS para no depender de lo que
 * haya hoy en el freezer, y prueba los dos casos: con carne y sin carne.
 *
 *   node probar_reparto.js <token> [390|1440]
 */
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')(process.argv[2]);

const ANCHO = Number(process.argv[3] || 1440);
let ok = 0, mal = 0;
const chk = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (x ? '   ' + x : '')); } };

const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz', dueno: 'Tadeo', col: 18 },
              { id: 'moresco', nombre: 'Deposito Moresco', dueno: 'Lucas', col: 19 }];
/* 168 unidades y 46,155 kg en Ustariz; en Moresco solo 2 unidades. */
const PRODS = [
  { a: 'PPM', n: 'Pack Muzzarella x2', u: 'u', f: 100, dep: 'ustariz', porDep: { ustariz: 100, moresco: 0 }, pz: 0, pzDep: {} },
  { a: 'PPJ', n: 'Pack J&Q', u: 'u', f: 70, dep: 'ustariz', porDep: { ustariz: 68, moresco: 2 }, pz: 0, pzDep: {} },
  { a: 'CCo', n: 'Carne Colita', u: 'kg', f: 4.991, dep: 'moresco', porDep: { ustariz: 4.991, moresco: 0 }, pz: 4, pzDep: { ustariz: 4, moresco: 0 } },
  { a: 'CLo', n: 'Carne Lomo', u: 'kg', f: 16.381, dep: 'moresco', porDep: { ustariz: 16.381, moresco: 0 }, pz: 9, pzDep: { ustariz: 9, moresco: 0 } },
  { a: 'CVa', n: 'Carne Vacio', u: 'kg', f: 24.783, dep: 'moresco', porDep: { ustariz: 24.783, moresco: 0 }, pz: 8, pzDep: { ustariz: 8, moresco: 0 } },
];

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + `
    window.__DEPS = { deps: ${JSON.stringify(DEPS)}, productos: ${JSON.stringify(PRODS)} };
    (function(){ var o = window.fetch; window.fetch = function (u, x) {
      var url = String(u || '');
      if (url.indexOf('action=depositos') >= 0) {
        return Promise.resolve(new Response(JSON.stringify(window.__DEPS),
          { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return o.apply(this, arguments); }; })();
  ` });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
  await new Promise(r => setTimeout(r, 2500));

  const listo = await evaluar(cli, `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      if (typeof window.go === 'function' && typeof window.stSwitchTab === 'function'
          && typeof window.rStockReparto === 'function') return 'listo';
      await new Promise(r => setTimeout(r, 200));
    }
    return 'el ERP no arranco (o rStockReparto no esta en window)';
  })()`);
  if (listo !== 'listo') { console.log('  MAL  ' + listo); process.exit(1); }

  console.log('\n== "Donde esta": unidades y kilos no se suman · ' + ANCHO + 'px ==\n');

  /* La card la pinta `rStockReparto`, que corre cuando llega `action=depositos`.
     Hay que ESPERARLA: medir antes da una card vacia y "0 problemas". */
  const card = await evaluar(cli, `(async () => {
    go('stock'); stSwitchTab('contar'); stSwitchTab('productos');
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      const c = document.getElementById('sKpiDep');
      if (c && c.innerText && /Ustariz/.test(c.innerText)) {
        return { txt: c.innerText.replace(/\\s+/g, ' ').trim(),
                 val: (c.querySelector('.kv') || {}).textContent || '',
                 pie: (c.querySelector('.ks') || {}).textContent || '' };
      }
      await new Promise(r => setTimeout(r, 250));
    }
    return null;
  })()`);
  chk(!!card, 'la card se pinta', JSON.stringify(card));
  if (!card) { console.log('\n  sin card no hay nada que medir\n'); process.exit(1); }
  console.log('     -> ' + card.val);

  chk(!/\b214\b/.test(card.val), 'NO suma las unidades con los kilos (no dice 214)', card.val);
  chk(/168 u/.test(card.val), 'dice las unidades de Ustariz (168)', card.val);
  chk(/46,155 kg/.test(card.val), 'y los kilos aparte, al gramo (46,155 kg)', card.val);
  chk(!/46\.155/.test(card.val), '  con coma, no con el punto ingles', card.val);
  chk(/Moresco 2 u/.test(card.val), 'Moresco muestra sus 2 unidades', card.val);
  chk(!/Moresco[^·]*kg/.test(card.val), '  y sin kilos, porque no tiene', card.val);
  chk(/lo que hay en cada/.test(card.pie), 'el pie ya no dice solo "unidades"', card.pie);

  console.log('\n-- sin carne en ningun deposito: el pie vuelve a "unidades" --');
  const sinKg = await evaluar(cli, `(async () => {
    window.__DEPS = { deps: ${JSON.stringify(DEPS)}, productos: ${JSON.stringify(PRODS.filter(p => p.u !== 'kg'))} };
    stDepPedir(true);
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const c = document.getElementById('sKpiDep');
      if (c && /Ustariz/.test(c.innerText) && !/kg/.test(c.innerText)) {
        return { val: (c.querySelector('.kv') || {}).textContent || '',
                 pie: (c.querySelector('.ks') || {}).textContent || '' };
      }
      await new Promise(r => setTimeout(r, 250));
    }
    const c = document.getElementById('sKpiDep');
    return { val: c ? (c.querySelector('.kv') || {}).textContent : '(sin card)',
             pie: c ? (c.querySelector('.ks') || {}).textContent : '' };
  })()`);
  chk(!/kg/.test(sinKg.val), 'sin kilos no dibuja ningun kg', sinKg.val);
  chk(/168 u/.test(sinKg.val), '  y las unidades siguen', sinKg.val);
  chk(/unidades en cada/.test(sinKg.pie), '  el pie dice "unidades en cada deposito"', sinKg.pie);

  console.log('\n' + (mal ? '  ' + ok + ' ok · ' + mal + ' MAL' : '  ' + ok + ' ok, todo bien') + '\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('revento el test:', e); process.exit(2); });
