/**
 * probar_por_decidir_ui.js — la tarjeta «Por decidir» de la tab Pedidos (5/10/2026).
 *
 * Tadeo: "la tab Pedidos como el lugar donde Lucas y yo recibimos los pedidos
 * de clientes y decidimos en un toque". Se prueba lo que ve y toca Lucas en el
 * celular: la tarjeta con cliente, barrio, productos, total, dia y horario; los
 * dos botones; la lista de vendedores (primero los que reparten ahi y ese dia,
 * los demas en gris con el motivo, el que no reparte ese dia sin poder tocarse);
 * y deshacer desde «Recién decididos».
 *
 * Los toques son de VERDAD (Input.dispatchMouseEvent en el centro del boton,
 * despues de chequear con elementFromPoint que no hay nada encima): `.click()`
 * pasa aunque una capa tape el boton.
 *
 * NO toca produccion: el backend esta interceptado en la pagina y se anota cada
 * POST. Corre en 390 y 1440 px.
 *
 *   node _tools/pruebas/probar_por_decidir_ui.js
 *
 * Necesita `npm run dev` (o ERP=<url>).
 */
const { abrir, evaluar } = require('./cdp.js');

const URL_ERP = process.env.ERP || 'http://localhost:8080/app.html?prueba=1';
const RED = '\x1b[31m', VER = '\x1b[32m', RST = '\x1b[0m';

const BANDEJA = {
  ok: true, horas: 2, pendientes: [], tareas: null,
  vendedores: [
    { nombre: 'Marcos Bottcher', dias: ['Viernes'], tg: true },
    { nombre: 'Fini Mihailovitch', dias: ['Viernes'], tg: false },
    { nombre: "Federico D'Andrea", dias: ['Viernes', 'Sábado'], tg: true },
  ],
  decidir: [
    { h: 'Pilar', n: '98', row: 100, c: 'Clara Tortugas', b: 'Tortugas Country', l: '77', de: 'Viernes 09/10', dia: 'Viernes',
      hor: '10 a 13 hs', prods: ['2 Pizza Jamón y Queso', '1 Pastel de papa'], tot: 31000, env: 3000, pago: 'Efectivo', cobrado: false,
      desde: Date.now() - 6 * 60000,
      vs: [{ v: 'Marcos Bottcher', ok: true, bloq: false, mot: '', tg: true },
           { v: "Federico D'Andrea", ok: false, bloq: false, mot: 'no reparte en Tortugas Country', tg: true },
           { v: 'Fini Mihailovitch', ok: false, bloq: false, mot: 'no reparte en Tortugas Country', tg: false }] },
    { h: 'Home', n: '1120', row: 1121, c: 'Hugo Home', b: 'El Recuerdo', l: '12', de: 'Sábado 10/10', dia: 'Sábado',
      hor: '', prods: ['3 Pizza Muzzarella'], tot: 24000, env: 0, pago: 'Transferencia', cobrado: false, desde: Date.now() - 60000,
      vs: [{ v: "Federico D'Andrea", ok: false, bloq: false, mot: 'no reparte en El Recuerdo', tg: true },
           { v: 'Fini Mihailovitch', ok: false, bloq: true, mot: 'no reparte en El Recuerdo · no reparte el sábado', tg: false },
           { v: 'Marcos Bottcher', ok: false, bloq: true, mot: 'no reparte en El Recuerdo · no reparte el sábado', tg: true }] },
  ],
  decididos: [{ h: 'Home', n: '1119', row: 1120, c: 'Nora Nosotros', de: 'Viernes 09/10', por: 'luqui', el: '05/10/2026 13:10', t: Date.now() - 600000, puede: true }],
  recientes: [{ n: '120', c: 'Rita Red', v: 'Marcos Bottcher', de: 'Viernes 09/10', dia: 'Viernes', por: 'tadeo · era Pilar #95', el: '05/10/2026 13:00', aviso: 'Telegram a Marcos', row: 121, puede: true, tEl: Date.now() - 1200000 }],
};

function preparar() {
  return `(function(){
  window.__maleuAuth = true;
  window.confirm = function(){ return true; };
  window.__posts = [];
  var B = ${JSON.stringify(BANDEJA)};
  try { if (!sessionStorage.getItem('__l')) { localStorage.clear(); sessionStorage.setItem('__l','1'); } } catch (e) {}
  function resp(o, ms) { return new Promise(function (ok) { setTimeout(function () {
    ok(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })); }, ms || 30); }); }
  var _f = window.fetch;
  window.fetch = function (u, o) {
    var url = String((u && u.url) || u || '');
    if (o && o.method === 'POST' && (url.indexOf('/exec') >= 0 || url.indexOf('script.google') >= 0 || url === API)) {
      var b = {}; try { b = JSON.parse(o.body); } catch (e) {}
      window.__posts.push(b);
      if (b.action === 'pasarAVendedor') return resp({ ok: true, red: { n: 130, row: 131 }, vendedor: b.vendedor, trajo: b.trajo, ocMovidas: 0, piezasMovidas: 0 });
      if (b.action === 'pedidoDecidir') return resp({ ok: true, hoja: b.hoja, id: b.id, decision: b.decision });
      if (b.action === 'redCambiarVendedor') return resp({ ok: true, vendedor: b.vendedor, avisoOk: true, aviso: 'ok', antes: 'Marcos Bottcher', avisoAntes: 'avisado' });
      return resp({ ok: true });
    }
    if (url.indexOf('action=redBandeja') >= 0) return resp(B, 50);
    if (url.indexOf('supabase') >= 0) return resp([], 20);
    if (url.indexOf('/exec') >= 0 || url.indexOf('script.google') >= 0) return resp({ ok: false }, 20);
    return _f.apply(this, arguments);
  };
})();`;
}

async function tocar(cli, sel) {
  const r = JSON.parse(await evaluar(cli, `(function(){
    var e = document.querySelector(${JSON.stringify(sel)}); if (!e) return JSON.stringify({ no: 'no existe' });
    e.scrollIntoView({ block: 'center' });
    var q = e.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2;
    var arriba = document.elementFromPoint(x, y);
    return JSON.stringify({ x: x, y: y, h: q.height, libre: !!arriba && (arriba === e || e.contains(arriba)), arriba: arriba ? (arriba.id || arriba.className || arriba.tagName) : null });
  })()`));
  if (r.no || !r.libre) return r;
  await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await new Promise((res) => setTimeout(res, 400));
  return r;
}

async function escenario(ancho, ok) {
  const cli = await abrir();
  const errores = [];
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    cli.escuchar((m, p) => { if (m === 'Runtime.exceptionThrown') { const d = p.exceptionDetails || {}; errores.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 160)); } });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: ancho < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: ancho < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: preparar() });
    await cli.enviar('Page.navigate', { url: URL_ERP });
    for (let i = 0; i < 100; i++) {
      if (await evaluar(cli, "typeof go==='function' && document.readyState!=='loading' && !!document.querySelector('.pg.on')")) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    /* servir.js con ?prueba=1 cambia confirm por uno que anota y dice que NO. */
    await evaluar(cli, "window.__confirmDevuelve = true, 1");
    await evaluar(cli, "go('pedidos'), 1");
    for (let i = 0; i < 50; i++) {
      if (await evaluar(cli, "document.querySelectorAll('.pd-p').length >= 2")) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const v = JSON.parse(await evaluar(cli, `(function(){
      var c = document.querySelector('.pd-card'), ps = document.querySelectorAll('.pd-p');
      var t = ps[0] ? ps[0].innerText : '';
      var btns = Array.prototype.slice.call(document.querySelectorAll('.pd-acc button')).map(function(b){ return Math.round(b.getBoundingClientRect().height); });
      var box = document.getElementById('rbBox');
      return JSON.stringify({ hay: !!c, n: ps.length, t: t, btns: btns,
        desborda: c ? c.scrollWidth > c.clientWidth + 1 : null, pagina: document.documentElement.scrollWidth > window.innerWidth + 1,
        arriba: box && box.firstElementChild === c });
    })()`));
    ok(v.hay && v.n === 2, ancho + 'px: la tarjeta «Por decidir» con los 2 pedidos (' + v.n + ')');
    ok(v.arriba, ancho + 'px: va arriba de todo, antes de la bandeja de Red');
    ok(/Clara Tortugas/.test(v.t) && /Tortugas Country/.test(v.t) && /2 Pizza Jamón y Queso/.test(v.t) && /\$31\.000/.test(v.t) && /Viernes 09\/10/.test(v.t) && /10 a 13 hs/.test(v.t),
      ancho + 'px: cliente, barrio, productos, total, día y horario');
    ok(v.btns.length >= 4 && v.btns.every((h) => h >= 44), ancho + 'px: botones de un dedo (≥44 px): ' + v.btns.join(','));
    ok(v.desborda === false && v.pagina === false, ancho + 'px: nada se sale de la pantalla');

    /* Pasar a vendedor: se abre la lista */
    let r = await tocar(cli, '#pd-Pilar-98 .pd-pas');
    ok(r.libre, ancho + 'px: «Pasar a vendedor» se puede tocar' + (r.libre ? '' : ' (lo tapa ' + r.arriba + ')'));
    const l = JSON.parse(await evaluar(cli, `(function(){
      var bs = Array.prototype.slice.call(document.querySelectorAll('#pdv-Pilar-98 .pd-v'));
      return JSON.stringify(bs.map(function(b){ return { t: b.innerText.replace(/\\s+/g,' '), ok: b.classList.contains('ok'), dis: b.disabled, fondo: getComputedStyle(b).backgroundColor }; }));
    })()`));
    ok(l.length === 3 && /Marcos/.test(l[0].t) && l[0].ok && /reparte acá/.test(l[0].t), ancho + 'px: primero Marcos, «reparte acá ese día»');
    ok(l[1] && !l[1].ok && /no reparte en Tortugas Country/.test(l[1].t) && l[1].fondo !== l[0].fondo, ancho + 'px: los demás en gris con el motivo');
    r = await tocar(cli, '#pdv-Pilar-98 .pd-v.ok');
    ok(r.libre, ancho + 'px: el botón de Marcos se puede tocar');
    await new Promise((res) => setTimeout(res, 500));
    let P = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__posts)'));
    const pas = P.filter((x) => x.action === 'pasarAVendedor');
    ok(pas.length === 1 && pas[0].vendedor === 'Marcos Bottcher' && pas[0].trajo === 'Maleu' && pas[0].hoja === 'Pilar' && pas[0].id === '98' && /^pav_/.test(pas[0].clientOpId || ''),
      ancho + 'px: manda pasarAVendedor a Marcos con trajo Maleu y un id para no duplicar');
    ok(await evaluar(cli, "!document.getElementById('pd-Pilar-98')"), ancho + 'px: el pedido sale de la lista');
    const cf = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__confirms || [])'));
    ok(cf.some((m) => /Marcos Bottcher/.test(m) && /cobra solo el envío/.test(m) && /Telegram/.test(m)), ancho + 'px: antes de pasar avisa: Telegram, portal y que cobra solo el envío');

    /* El de sabado: Marcos y Fini no se pueden tocar */
    await tocar(cli, '#pd-Home-1120 .pd-pas');
    const s = JSON.parse(await evaluar(cli, `JSON.stringify(Array.prototype.slice.call(document.querySelectorAll('#pdv-Home-1120 .pd-v')).map(function(b){ return { t: b.innerText, dis: b.disabled }; }))`));
    ok(s.filter((x) => x.dis).length === 2 && s.filter((x) => x.dis).every((x) => /no reparte el sábado/.test(x.t)), ancho + 'px: sábado: los que no reparten ese día, deshabilitados y con el motivo');
    ok(/Nadie reparte El Recuerdo/.test(await evaluar(cli, "document.querySelector('#pdv-Home-1120 .pd-vt').innerText")), ancho + 'px: dice que nadie reparte ese barrio');

    /* Lo entregamos nosotros */
    r = await tocar(cli, '#pdn-Home-1120');
    ok(r.libre, ancho + 'px: «Lo entregamos nosotros» se puede tocar');
    await new Promise((res) => setTimeout(res, 400));
    P = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__posts)'));
    ok(P.some((x) => x.action === 'pedidoDecidir' && x.decision === 'nosotros' && x.hoja === 'Home' && x.id === '1120'), ancho + 'px: manda «nosotros» para Home #1120');

    /* Deshacer: Recién decididos */
    await evaluar(cli, "(function(){ var d = document.querySelector('.pd-card details'); if (d) d.open = true; return 1; })()");
    const dd = await evaluar(cli, "(function(){ var d = document.querySelector('.pd-card details'); return d ? d.innerText : ''; })()");
    ok(/Nora Nosotros/.test(dd) && /Rita Red/.test(dd), ancho + 'px: «Recién decididos» trae el de nosotros y el de Red');
    r = await tocar(cli, '.pd-card details .pd-r button.pd-mini');
    await new Promise((res) => setTimeout(res, 400));
    P = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__posts)'));
    ok(P.some((x) => x.action === 'pedidoDecidir' && x.decision === 'volver' && x.id === '1119'), ancho + 'px: «Deshacer» devuelve Home #1119 a Por decidir');
    await evaluar(cli, "(function(){ var d = document.querySelector('.pd-card details'); if (d) d.open = true; var s = document.getElementById('pdc-r121'); s.value = \"Federico D'Andrea\"; return 1; })()");
    const opts = JSON.parse(await evaluar(cli, "JSON.stringify(Array.prototype.slice.call(document.querySelectorAll('#pdc-r121 option')).map(function(o){return [o.value,o.disabled];}))"));
    ok(!opts.some((o) => o[0] === 'Marcos Bottcher'), ancho + 'px: el vendedor actual no se ofrece');
    r = await tocar(cli, '#pdc-r121 + button');
    await new Promise((res) => setTimeout(res, 400));
    P = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__posts)'));
    ok(P.some((x) => x.action === 'redCambiarVendedor' && x.n === '120' && x.vendedor === "Federico D'Andrea"), ancho + 'px: «Cambiar» pasa Red #120 a Fede');
    ok(errores.length === 0, ancho + 'px: sin errores en consola' + (errores.length ? ': ' + errores[0] : ''));
  } finally { cli.matar(); }
}

(async () => {
  let fallas = 0;
  const ok = (b, msg) => { console.log((b ? VER + '  ok  ' : RED + '  MAL ') + RST + msg); if (!b) fallas++; };
  for (const w of [390, 1440]) { console.log('\n' + w + ' px'); await escenario(w, ok); }
  console.log();
  console.log(fallas === 0 ? VER + 'Por decidir: todo verde' + RST : RED + fallas + ' control(es) en rojo' + RST);
  process.exit(fallas === 0 ? 0 : 1);
})().catch((e) => { console.error(RED + 'la prueba falló: ' + e.message + RST); process.exit(3); });
