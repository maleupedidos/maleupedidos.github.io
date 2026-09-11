/**
 * La tab STOCK entera: PRODUCTOS / CONTAR / MOVER / RECIBIR CARNE.
 *
 * Tadeo (10/9/2026): "¿anda todo correctamente? Tanto para compu como para
 * celular? Cada boton tiene que funcionar. Y rapido."
 *
 * Mide TRES cosas por sub-tab: que pinte, CUANTO TARDA en pintar, y que cada
 * control se pueda tocar (38px en el celular). Y verifica el payload de RECIBIR
 * CARNE sin escribir nada — los POST van interceptados.
 *
 *   node probar_stock.js <token> [390|1440]
 */
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')(process.argv[2]);

const ANCHO = Number(process.argv[3] || 390);
const PISO = ANCHO <= 560 ? 38 : 26;   // el piso tactil del celular es 38, no 44
let ok = 0, mal = 0;

function chk(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { mal++; console.log('  MAL  ' + txt + (extra ? '   ' + extra : '')); }
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ANCHO <= 560 ? 844 : 900,
    deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  // El PREP intercepta los POST devolviendo {ok:true} pelado. Aca hace falta
  // GUARDAR el payload y contestar algo realista: un {ok:true} sin `agregadas`
  // ni `piezas` hace fallar codigo que anda.
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + `
    window.__posts = [];
    (function(){ var o = window.fetch; window.fetch = function (u, x) {
      if (x && String(x.method || '').toUpperCase() === 'POST') {
        var b = null; try { b = JSON.parse(x.body); } catch (e) { b = { crudo: String(x.body) }; }
        window.__posts.push(b);
        if (b && b.action === 'piezasRecibir') {
          var pz = (b.piezas || []).map(function (p, i) {
            return { id: 'P-TEST' + i, abbr: p.abbr, peso: p.peso, dep: 'moresco' }; });
          return Promise.resolve(new Response(JSON.stringify({ ok: true, agregadas: pz.length,
            piezas: pz, malas: [], stock: [], deposito: '(el de cada producto)' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
      }
      return o.apply(this, arguments); }; })();
  ` });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });
  await new Promise(r => setTimeout(r, 2500));

  // esperar a que el ERP este usable
  await evaluar(cli, `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      if (typeof window.go === 'function' && typeof window.stSwitchTab === 'function') return 'listo';
      await new Promise(r => setTimeout(r, 200));
    }
    return 'timeout';
  })()`);

  const login = await evaluar(cli, `(() => {
    const l = document.getElementById('loginScreen');
    return l ? getComputedStyle(l).display : '(no existe)';
  })()`);
  if (login !== 'none' && login !== '(no existe)') {
    console.log('ABORTO: el login quedo visible (' + login + '): nada de lo de abajo mediria el ERP.');
    process.exit(1);
  }

  console.log('\n=== La tab Stock abre (ancho ' + ANCHO + ') ===');
  const abre = await evaluar(cli, `(async () => {
    const t0 = Date.now();
    window.go('stock');
    // esperar a que la sub-tab PRODUCTOS tenga contenido
    while (Date.now() - t0 < 75000) {
      const p = document.getElementById('stProductos');
      if (p && p.innerText.trim().length > 80) break;
      await new Promise(r => setTimeout(r, 150));
    }
    const pg = document.getElementById('p-stock');
    return {
      ms: Date.now() - t0,
      visible: pg ? getComputedStyle(pg).display !== 'none' : false,
      subtabs: [...document.querySelectorAll('#p-stock .v-tab')].map(b => ({
        t: (b.textContent || '').trim(), stt: b.getAttribute('data-stt'),
        alto: Math.round(b.getBoundingClientRect().height),
        ancho: Math.round(b.getBoundingClientRect().width), on: b.classList.contains('on')
      })),
      largoProductos: (document.getElementById('stProductos') || {}).innerText ?
        document.getElementById('stProductos').innerText.trim().length : 0
    };
  })()`);
  chk(abre.visible, 'la tab Stock se ve');
  chk(abre.subtabs.length === 4, 'estan las 4 sub-tabs', JSON.stringify(abre.subtabs.map(s => s.stt)));
  chk(['productos', 'contar', 'mover', 'carne'].every(s => abre.subtabs.some(x => x.stt === s)),
    'son PRODUCTOS, CONTAR, MOVER y RECIBIR CARNE');
  chk(abre.subtabs.every(s => s.alto >= PISO), 'las 4 sub-tabs se pueden tocar (>=' + PISO + 'px)',
    JSON.stringify(abre.subtabs.map(s => s.stt + ':' + s.alto)));
  chk(abre.largoProductos > 300, 'PRODUCTOS pinto la tabla de stock', abre.largoProductos + ' chars');
  console.log('       PRODUCTOS pinto en ' + abre.ms + ' ms');
  /* El umbral es 60 s y NO es generoso: este es el PEOR caso —sesion nueva, sin
     nada guardado, entrando a Stock en el mismo segundo en que el ERP arranca—.
     El volcado son 21-27 s por si solo y ahi hay 9 endpoints mas peleando por 2
     cupos. Antes de darle prioridad a `admin` esto medía **128 s**. El caso de
     todos los dias se mide abajo. */
  chk(abre.ms < 60000, 'PRODUCTOS pinta en menos de 60 s en frio', abre.ms + ' ms');

  // ── Cada sub-tab: que pinte, cuanto tarda, y sus controles ──
  for (const sub of ['contar', 'mover', 'carne']) {
    const id = { contar: 'stContar', mover: 'stMover', carne: 'stCarne' }[sub];
    console.log('\n=== Sub-tab ' + sub.toUpperCase() + ' ===');
    const r = await evaluar(cli, `(async () => {
      const t0 = Date.now();
      window.stSwitchTab('${sub}');
      const el = document.getElementById('${id}');
      let listo = false;
      while (Date.now() - t0 < 50000) {
        const t = el ? el.innerText.trim() : '';
        // "Buscando los cortes..." / "cargando" no cuentan como pintado
        if (t.length > 120 && !/Buscando los cortes|Cargando|cargando/i.test(t.slice(0, 200))) { listo = true; break; }
        await new Promise(r => setTimeout(r, 150));
      }
      const vis = getComputedStyle(el).display !== 'none';
      const otras = ['stProductos','stContar','stMover','stCarne'].filter(x => x !== '${id}')
        .filter(x => { const e = document.getElementById(x); return e && getComputedStyle(e).display !== 'none'; });
      // controles de ESTA sub-tab
      const ctrl = [...el.querySelectorAll('button,input,select,a[onclick]')].map(e => {
        const b = e.getBoundingClientRect();
        return { tag: e.tagName, cls: (e.className || '').toString().slice(0, 24),
                 txt: (e.textContent || e.placeholder || e.id || '').trim().slice(0, 26),
                 alto: Math.round(b.height), ancho: Math.round(b.width),
                 vis: b.height > 0 && b.width > 0 };
      });
      // desborde horizontal
      const desborde = el.scrollWidth - el.clientWidth;
      return { ms: Date.now() - t0, listo, vis, otras, ctrl, desborde,
               txt: el.innerText.trim().slice(0, 260),
               scrollTrampa: (getComputedStyle(el).overflowY === 'auto' && el.scrollHeight <= el.clientHeight) };
    })()`);
    chk(r.vis, sub + ': la sub-tab se ve');
    chk(r.otras.length === 0, sub + ': las otras tres quedaron ocultas', JSON.stringify(r.otras));
    chk(r.listo, sub + ': pinto contenido de verdad (no un "cargando")', r.txt.slice(0, 90));
    console.log('       pinto en ' + r.ms + ' ms  ·  ' + r.ctrl.length + ' controles');
    chk(r.ms < 30000, sub + ': pinta en menos de 30 s', r.ms + ' ms');
    const chicos = r.ctrl.filter(c => c.vis && c.alto < PISO);
    chk(chicos.length === 0, sub + ': ningun control por debajo de ' + PISO + 'px',
      JSON.stringify(chicos.slice(0, 6)));
    chk(r.desborde <= 2, sub + ': no desborda a lo ancho', r.desborde + 'px');
    chk(!r.scrollTrampa, sub + ': sin trampa de scroll');
  }

  // ── RECIBIR CARNE: el flujo de pesar, y el payload ──
  console.log('\n=== RECIBIR CARNE: pesar y confirmar ===');
  const carne = await evaluar(cli, `(async () => {
    window.stSwitchTab('carne');
    await new Promise(r => setTimeout(r, 1200));
    const out = {};
    // los cortes que ofrece
    const cortes = [...document.querySelectorAll('#stCarne .stcar-corte')];
    out.cortes = cortes.map(b => (b.textContent || '').trim().slice(0, 28));
    out.nCortes = cortes.length;
    // elegir el 3ro (para no quedarse siempre en el default)
    if (cortes[2]) cortes[2].click();
    await new Promise(r => setTimeout(r, 400));
    out.elegido = window.CARNE_CORTE || '(?)';
    // pesar con COMA y con PUNTO: el teclado del celular da uno u otro
    const inp = document.getElementById('stcarPeso');
    out.hayInput = !!inp;
    out.inputAlto = inp ? Math.round(inp.getBoundingClientRect().height) : 0;
    if (inp) {
      inp.value = '1,234';
      window.stCarneAgregar();
      await new Promise(r => setTimeout(r, 350));
      const i2 = document.getElementById('stcarPeso');
      if (i2) { i2.value = '0.842'; window.stCarneAgregar(); }
      await new Promise(r => setTimeout(r, 350));
      const i3 = document.getElementById('stcarPeso');
      if (i3) { i3.value = 'no es un numero'; window.stCarneAgregar(); }
      await new Promise(r => setTimeout(r, 350));
    }
    out.cola = (window.CARNE_COLA || []).map(p => ({ abbr: p.abbr, peso: p.peso }));
    // sobrevive a recargar? (la cola vive en localStorage)
    out.enLS = localStorage.getItem('mc_carneCola');
    // el texto que muestra
    out.txt = document.getElementById('stCarne').innerText;
    // quitar una
    const equis = [...document.querySelectorAll('#stCarne .stcar-pz button')];
    out.hayQuitar = equis.length;
    if (equis[0]) { equis[0].click(); await new Promise(r => setTimeout(r, 350)); }
    out.colaTrasQuitar = (window.CARNE_COLA || []).length;
    return out;
  })()`);
  chk(carne.nCortes === 5, 'ofrece los 5 cortes por kilo', JSON.stringify(carne.cortes));
  chk(carne.hayInput, 'tiene el campo para escribir el peso');
  chk(carne.inputAlto >= PISO, 'el campo del peso se puede tocar (' + carne.inputAlto + 'px)');
  chk(carne.cola.length === 2, 'acepto la coma Y el punto, y rechazo el texto',
    JSON.stringify(carne.cola));
  chk(carne.cola.some(p => Math.abs(p.peso - 1.234) < 0.0005), '"1,234" se leyo como 1,234 kg',
    JSON.stringify(carne.cola));
  chk(carne.cola.some(p => Math.abs(p.peso - 0.842) < 0.0005), '"0.842" se leyo como 0,842 kg',
    JSON.stringify(carne.cola));
  chk(!!carne.enLS && /1\.234|1,234/.test(carne.enLS),
    'lo pesado vive en localStorage: sobrevive a cerrar la app', String(carne.enLS).slice(0, 90));
  chk(carne.hayQuitar >= 2, 'cada pieza pesada se puede quitar', carne.hayQuitar + ' botones');
  chk(carne.colaTrasQuitar === 1, 'quitar una saca UNA, no todas', String(carne.colaTrasQuitar));
  chk(/sin guardar/i.test(carne.txt), 'dice que lo pesado todavia NO esta guardado');

  // el payload del confirmar
  console.log('\n=== El payload que se manda (POST interceptado) ===');
  const pay = await evaluar(cli, `(async () => {
    window.__posts = [];
    document.getElementById('stcarProv') && (document.getElementById('stcarProv').value = 'Caco');
    window.stCarneProv && window.stCarneProv('Caco');
    const inp = document.getElementById('stcarPeso');
    if (inp) { inp.value = '2,5'; window.stCarneAgregar(); await new Promise(r => setTimeout(r, 300)); }
    window.__confirmDevuelve = true;
    /* Desde el 11/9/2026 la tanda pregunta a que deposito entra, y sin elegirlo
       NO se guarda: cualquier producto puede estar en cualquiera de los dos. */
    const info = {};
    const depbs = [...document.querySelectorAll('#stCarne .stcar-depb')];
    info.nDeps = depbs.length;
    info.depAlto = depbs.length ? Math.min(...depbs.map(b => Math.round(b.getBoundingClientRect().height))) : 0;
    info.depOnAntes = document.querySelectorAll('#stCarne .stcar-depb.on').length;
    const b0 = document.getElementById('stcarGuardar');
    info.sinDepDisabled = !!(b0 && b0.disabled);
    info.sinDepTxt = b0 ? b0.textContent.trim() : '';
    if (b0) { b0.disabled = false; b0.click(); await new Promise(r => setTimeout(r, 600)); }
    info.postsSinDep = (window.__posts || []).length;
    // elegir Ustariz
    const ust = [...document.querySelectorAll('#stCarne .stcar-depb')].find(b => /ustariz/i.test(b.textContent));
    info.hayUst = !!ust;
    if (ust) { ust.click(); await new Promise(r => setTimeout(r, 300)); }
    info.depOn = [...document.querySelectorAll('#stCarne .stcar-depb.on')].map(b => b.textContent.trim());
    const btn = document.getElementById('stcarGuardar');
    info.hayBoton = !!btn; info.txtBoton = btn ? btn.textContent.trim().slice(0, 80) : '';
    info.altoBoton = btn ? Math.round(btn.getBoundingClientRect().height) : 0;
    info.conDepDisabled = !!(btn && btn.disabled);
    if (btn) { btn.click(); await new Promise(r => setTimeout(r, 1500)); }
    info.depOnDespues = document.querySelectorAll('#stCarne .stcar-depb.on').length;
    info.grupos = [...document.querySelectorAll('#stCarne .stcar-depgrp')].map(g => g.textContent.trim());
    /* __posts guarda el body YA parseado. Volver a parsearlo daba
       {crudo:"undefined"} y 1 rojo que era del test, no del ERP. */
    info.posts = window.__posts || [];
    return info;
  })()`);
  chk(pay.nDeps >= 2, 'pregunta a que deposito entra (un boton por deposito)', String(pay.nDeps));
  chk(pay.depAlto >= 44, 'los botones del deposito se tocan con el dedo (' + pay.depAlto + 'px)');
  chk(pay.depOnAntes === 0, 'arranca SIN deposito elegido (no se hereda de nada)', String(pay.depOnAntes));
  chk(pay.sinDepDisabled, 'sin deposito, el boton de guardar esta apagado', pay.sinDepTxt);
  chk(/eleg/i.test(pay.sinDepTxt), 'y dice que falta elegirlo', pay.sinDepTxt);
  chk(pay.postsSinDep === 0, 'aunque se fuerce el toque, sin deposito NO manda nada', String(pay.postsSinDep));
  chk(pay.hayUst && pay.depOn.length === 1, 'se elige Ustariz', JSON.stringify(pay.depOn));
  chk(!pay.conDepDisabled, 'con deposito elegido, el boton se prende');
  chk(/ustariz/i.test(pay.txtBoton), 'el boton dice a que deposito van', pay.txtBoton);
  chk(pay.hayBoton, 'hay boton de guardar', pay.txtBoton);
  chk(pay.altoBoton >= PISO, 'el boton de guardar se puede tocar (' + pay.altoBoton + 'px)');
  const post = (pay.posts || []).find(p => p.action === 'piezasRecibir');
  chk(!!post, 'manda action=piezasRecibir', JSON.stringify(pay.posts).slice(0, 200));
  if (post) {
    chk(Array.isArray(post.piezas) && post.piezas.length >= 2,
      'manda las piezas en UNA sola tanda', JSON.stringify(post.piezas));
    chk(post.piezas.every(p => p.abbr && p.peso > 0), 'cada pieza va con su corte y su peso',
      JSON.stringify(post.piezas));
    chk(post.proveedor === 'Caco', 'manda el proveedor que se escribio', String(post.proveedor));
    chk(post.deposito === 'ustariz', 'manda el deposito ELEGIDO (ustariz)',
      'manda ' + JSON.stringify(post.deposito));
    chk(!!post.token, 'manda el token de sesion');
  }
  chk(pay.depOnDespues === 0, 'despues de guardar, la proxima tanda se vuelve a elegir',
    String(pay.depOnDespues));
  chk(pay.grupos.length >= 1 && pay.grupos.every(g => /^En /.test(g)),
    'lo que ya hay se lista POR DEPOSITO', JSON.stringify(pay.grupos));

  console.log('\n=== Volver a Stock con el volcado YA cargado (el caso de todos los dias) ===');
  const otra = await evaluar(cli, `(async () => {
    window.go('inicio');
    await new Promise(r => setTimeout(r, 700));
    const t0 = Date.now();
    window.go('stock');
    window.stSwitchTab('productos');
    while (Date.now() - t0 < 20000) {
      const p = document.getElementById('stProductos');
      if (p && p.innerText.trim().length > 300 && getComputedStyle(p).display !== 'none') break;
      await new Promise(r => setTimeout(r, 30));
    }
    const p = document.getElementById('stProductos');
    return { ms: Date.now() - t0, chars: p ? p.innerText.trim().length : 0,
             hayStock: !!(window.D && window.D.stock) };
  })()`);
  console.log('       volvio a pintar en ' + otra.ms + ' ms');
  chk(otra.hayStock, 'el volcado sigue en memoria');
  chk(otra.ms < 1500, 'con el volcado cargado, PRODUCTOS pinta al instante', otra.ms + ' ms');
  chk(otra.chars > 300, 'y pinta la tabla completa', otra.chars + ' chars');

  const errs = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,6))');
  chk(JSON.parse(errs || '[]').length === 0, 'ni un error de consola propio del ERP', errs);

  console.log('\n' + ok + ' ok - ' + mal + ' mal   (ancho ' + ANCHO + ')');
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('REVENTO:', e); process.exit(2); });
