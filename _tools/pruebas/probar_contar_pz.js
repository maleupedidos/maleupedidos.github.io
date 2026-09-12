/**
 * CONTAR no ofrece un campo de kilos en un producto que se lleva POR PIEZA
 * (11/9/2026).
 *
 * El backend lo rechaza (`_contarPiezas_`), pero un control que siempre devuelve
 * error es peor que no tenerlo: se lee como que el ERP esta roto. La fila tiene
 * que decir cuantas piezas hay y mandar a RECIBIR CARNE.
 *
 * Intercepta `action=depositos` con datos INVENTADOS —un corte con piezas, un
 * corte por kilo SIN piezas (un granel) y un producto por unidad— asi el test no
 * depende de lo que haya hoy en el freezer, que cambia con cada entrega.
 *
 *   node probar_contar_pz.js <token> [390|1440] [--viejo]
 *
 * Con `--viejo` simula el payload de un Apps Script anterior (sin `pz`): el
 * campo tiene que volver, que es el comportamiento de siempre.
 */
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')(process.argv[2]);

const ANCHO = Number(process.argv[3] || 390);
const VIEJO = process.argv.indexOf('--viejo') >= 0;
const PISO = ANCHO <= 560 ? 38 : 26;
let ok = 0, mal = 0;
const chk = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (x ? '   ' + x : '')); } };

/* Los productos que ve la pantalla. `pz` = cuantas piezas tiene cargadas el
   producto en toda su historia (>0 = se lleva por pieza); `pzDep` = cuantas hay
   en el freezer de cada deposito. Es lo que manda `_doGetDepositos`. */
const PRODS = [
  { a: 'CCo', n: 'Carne Colita de Cuadril', u: 'kg', f: 4.991, dep: 'ustariz',
    porDep: { ustariz: 4.991, moresco: 0 }, pz: 4, pzDep: { ustariz: 3, moresco: 0 } },
  { a: 'CLo', n: 'Carne Lomo', u: 'kg', f: 1.5, dep: 'moresco',
    porDep: { ustariz: 0, moresco: 1.5 }, pz: 1, pzDep: { ustariz: 0, moresco: 1 } },
  { a: 'CGr', n: 'Granel de prueba', u: 'kg', f: 3, dep: 'ustariz',
    porDep: { ustariz: 3, moresco: 0 }, pz: 0, pzDep: { ustariz: 0, moresco: 0 } },
  { a: 'PPM', n: 'Pack Muzzarella x2', u: 'u', f: 18, dep: 'ustariz',
    porDep: { ustariz: 18, moresco: 0 }, pz: 0, pzDep: { ustariz: 0, moresco: 0 } },
];
const PAYLOAD = {
  deps: [{ id: 'ustariz', nombre: 'Deposito Ustariz', dueno: 'Tadeo', col: 18 },
         { id: 'moresco', nombre: 'Deposito Moresco', dueno: 'Lucas', col: 19 }],
  productos: PRODS.map(p => {
    const q = JSON.parse(JSON.stringify(p));
    if (VIEJO) { delete q.pz; delete q.pzDep; }   // un Apps Script anterior
    return q;
  }),
};

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });

  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + `
    window.__posts = [];
    window.__DEPS = ${JSON.stringify(PAYLOAD)};
    (function(){ var o = window.fetch; window.fetch = function (u, x) {
      var url = String(u || '');
      if (x && String(x.method || '').toUpperCase() === 'POST') {
        var b = null; try { b = JSON.parse(x.body); } catch (e) { b = { crudo: String(x.body) }; }
        window.__posts.push(b);
        if (b && b.action === 'stockContar') {
          return Promise.resolve(new Response(JSON.stringify({ ok: true, abbr: b.abbr,
            deposito: b.deposito, antes: 0, ahora: b.cantidad, delta: 0, total: b.cantidad }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
      }
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
      if (typeof window.go === 'function' && typeof window.stSwitchTab === 'function') return 'listo';
      await new Promise(r => setTimeout(r, 200));
    }
    return 'el ERP no arranco';
  })()`);
  if (listo !== 'listo') { console.log('  MAL  ' + listo); process.exit(1); }

  console.log('\n== CONTAR: un corte por pieza no se cuenta por kilo · ' + ANCHO + 'px'
    + (VIEJO ? ' · SIN pz (Apps Script viejo)' : '') + ' ==\n');

  // Entrar a Stock > CONTAR y esperar a que pinte de verdad.
  const pinto = await evaluar(cli, `(async () => {
    go('stock'); stSwitchTab('contar');
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const c = document.getElementById('stContar');
      if (c && c.querySelectorAll('.stc-row').length) return c.querySelectorAll('.stc-row').length;
      await new Promise(r => setTimeout(r, 200));
    }
    return 0;
  })()`);
  chk(pinto === PRODS.length, 'la pantalla pinta los ' + PRODS.length + ' productos', 'dibujo ' + pinto);
  if (!pinto) { console.log('\n  sin filas no hay nada que medir\n'); process.exit(1); }

  const fila = async (abbr) => await evaluar(cli, `(() => {
    const r = document.getElementById('stcR_${abbr}');
    if (!r) return null;
    const inp = r.querySelector('input');
    const btn = r.querySelector('button');
    return {
      pz: r.classList.contains('stc-pz'),
      tieneInput: !!inp,
      sub: (r.querySelector('.stc-sub') || {}).textContent || '',
      btn: btn ? { txt: btn.textContent, h: Math.round(btn.getBoundingClientRect().height),
                   onclick: btn.getAttribute('onclick') || '' } : null,
    };
  })()`);

  const cco = await fila('CCo');
  if (VIEJO) {
    chk(cco && cco.tieneInput, 'sin `pz` vuelve el campo de kilos: el comportamiento de siempre');
    chk(cco && !cco.pz, '  y la fila no se marca como por-pieza');
    const prog0 = await evaluar(cli, `(document.querySelector('#stContar .stc-prog')||{}).textContent||''`);
    chk(!/por pieza/.test(prog0), '  ni el contador habla de piezas', prog0);
    console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
    process.exit(mal ? 1 : 0);
  }

  console.log('-- el corte con piezas en ESTE deposito --');
  chk(cco && cco.pz, 'la fila se marca como por-pieza');
  chk(cco && !cco.tieneInput, '  y NO ofrece el campo de kilos que el backend rechaza');
  chk(cco && /3 piezas/.test(cco.sub), '  dice cuantas piezas hay aca', cco && cco.sub);
  chk(cco && /4,991/.test(cco.sub), '  y cuantos kilos suman', cco && cco.sub);
  chk(cco && cco.btn, '  tiene el boton que manda a donde se resuelve');
  chk(cco && cco.btn && /pieza/i.test(cco.btn.txt), '  el boton dice por que', cco && cco.btn && cco.btn.txt);
  chk(cco && cco.btn && /carne/.test(cco.btn.onclick), '  y lleva a RECIBIR CARNE', cco && cco.btn && cco.btn.onclick);
  chk(cco && cco.btn && cco.btn.h >= PISO, '  llega al minimo tactil (' + PISO + 'px)', cco && cco.btn && cco.btn.h + 'px');

  console.log('\n-- el corte con sus piezas en el OTRO deposito --');
  const clo = await fila('CLo');
  chk(clo && clo.pz && !clo.tieneInput, 'tampoco se cuenta por kilo aca');
  chk(clo && /sin piezas/.test(clo.sub), '  dice que no hay piezas en este freezer', clo && clo.sub);
  chk(clo && /1,5 kg en el otro/.test(clo.sub), '  y cuanto hay en el otro', clo && clo.sub);

  console.log('\n-- lo que NO tiene que cambiar --');
  const gr = await fila('CGr');
  chk(gr && !gr.pz && gr.tieneInput, 'un granel por kilo SIN piezas sigue contandose por kilo');
  const ppm = await fila('PPM');
  chk(ppm && !ppm.pz && ppm.tieneInput, 'un producto por unidad sigue igual');

  const prog = await evaluar(cli, `(document.querySelector('#stContar .stc-prog')||{}).textContent||''`);
  chk(/^2 productos/.test(prog.trim()), 'el contador cuenta solo los contables aca (2, no 4)', prog);
  chk(/2 se cuentan por pieza/.test(prog), '  y dice cuantos van por pieza', prog);

  console.log('\n-- contar de verdad el que si se puede --');
  const post = await evaluar(cli, `(async () => {
    const r = document.getElementById('stcR_PPM');
    const inp = r.querySelector('input');
    inp.value = '16';
    inp.dispatchEvent(new Event('blur'));
    const t0 = Date.now();
    while (Date.now() - t0 < 8000) {
      const p = (window.__posts || []).filter(x => x && x.action === 'stockContar');
      if (p.length) return p[p.length - 1];
      await new Promise(r2 => setTimeout(r2, 150));
    }
    return null;
  })()`);
  chk(post && post.abbr === 'PPM', 'manda el POST del producto por unidad', JSON.stringify(post));
  chk(post && post.cantidad === 16, '  con lo contado', JSON.stringify(post));

  const pzPosts = await evaluar(cli, `(async () => {
    const r = document.getElementById('stcR_CCo');
    const b = r.querySelector('button');
    // tocar el boton del corte NO puede mandar un stockContar
    const antes = (window.__posts || []).length;
    b.click();
    await new Promise(r2 => setTimeout(r2, 600));
    return { nuevos: (window.__posts || []).length - antes,
             tab: (document.querySelector('#p-stock .v-tab.on') || {}).getAttribute
                  ? document.querySelector('#p-stock .v-tab.on').getAttribute('data-stt') : '' };
  })()`);
  chk(pzPosts && pzPosts.nuevos === 0, 'tocar el boton del corte no manda ningun POST de conteo', JSON.stringify(pzPosts));
  chk(pzPosts && pzPosts.tab === 'carne', '  y cambia a RECIBIR CARNE', JSON.stringify(pzPosts));

  console.log('\n-- la pantalla en ' + ANCHO + 'px --');
  const geo = await evaluar(cli, `(() => {
    const c = document.getElementById('stContar');
    const ctrl = [...c.querySelectorAll('button, input')];
    const chicos = ctrl.filter(e => {
      const r = e.getBoundingClientRect();
      return r.height > 0 && r.height < ${PISO};
    }).map(e => (e.textContent || e.className).slice(0, 28) + ' ' + Math.round(e.getBoundingClientRect().height));
    return { n: ctrl.length, chicos: chicos,
             desborde: document.documentElement.scrollWidth - window.innerWidth };
  })()`);
  chk(geo.n >= 4, 'examino los controles de la pantalla (' + geo.n + ')');
  chk(!geo.chicos.length, 'ningun control por debajo de ' + PISO + 'px', JSON.stringify(geo.chicos));
  chk(geo.desborde <= 1, 'no desborda a lo ancho', 'desborda ' + geo.desborde + 'px');

  console.log('\n' + (mal ? '  ' + ok + ' ok · ' + mal + ' MAL' : '  ' + ok + ' ok, todo bien') + '\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('revento el test:', e); process.exit(2); });
