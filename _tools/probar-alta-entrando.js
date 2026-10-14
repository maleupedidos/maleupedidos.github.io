/* La banda «Entrando» de la tab Pedidos (13/10/2026) — ALTA_PG.

     node _tools/probar-alta-entrando.js

   Saca el bloque de _src/panel.src.html y lo corre con la base simulada.
   Lo que tiene que ser cierto:
   · con la palanca apagada no le pregunta nada a la base ni dibuja nada;
   · prendida, dibuja cada pedido sin fila con su número, cliente, qué lleva y total;
   · NO tiene ningún botón (sin fila no hay nada que armar, cobrar ni entregar);
   · empuja al aplicador una sola vez;
   · un apartado se ve en rojo y dice que hay que cargarlo a mano;
   · cuando un pedido deja de estar entrando, busca los pedidos de nuevo;
   · el nombre del cliente no puede meter HTML. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', '_src', 'panel.src.html'), 'utf8');
const ini = src.indexOf('var AP={items:[]'), fin = src.indexOf('function fpPintar(){');
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 300) : '')); } };
if (ini < 0 || fin < ini) { console.log('  MAL  no encuentro el bloque de la banda en panel.src.html\n\n0 ok · 1 mal'); process.exit(1); }

const T0 = Date.parse('2026-10-20T13:00:00Z');
let PALANCA = false, FILAS = [], pedidos = [], posts = [], actualizo = 0, timers = [];
const caja = { innerHTML: '' };
const sb = {
  console, JSON, Math, String, Number, Array, Object, Promise,
  Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(T0); } static now() { return T0; } },
  $: id => (id === 'apBox' ? caja : null),
  API: 'https://script/exec', cur: 'pedidos',
  _palancaYa: n => n === 'altaPg' && PALANCA,
  _sbPermiso: () => Promise.resolve({ url: 'https://x.supabase.co', key: 'k', token: 't' }),
  actualizarPedidos: () => { actualizo++; },
  setTimeout: (f, ms) => { timers.push(ms); return timers.length; }, clearTimeout() {},
  fetch: (url, opt) => {
    if (/fast_order/.test(url)) { pedidos.push(url); return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(JSON.stringify(FILAS))) }); }
    posts.push(JSON.parse(opt.body)); return Promise.resolve({ json: () => Promise.resolve({ ok: true, hechas: 1, quedan: 0 }) });
  }
};
vm.createContext(sb);
vm.runInContext(src.slice(ini, fin), sb);
const esperar = () => new Promise(r => setImmediate(() => setImmediate(() => setImmediate(() => setImmediate(r)))));
const fila = (n, nombre, extra) => Object.assign({ seq: n, channel: 'Home', order_number: n, customer_name: nombre, total_amount: 34000,
  items_summary: 'PMu x2 · PPM x1', pieces_taken: [], status: 'pendiente', received_at: new Date(T0 - 60000).toISOString() }, extra || {});

(async () => {
  console.log('\n== Apagada ==');
  FILAS = [fila(1168, 'Clienta Prueba')];
  vm.runInContext('apPedir(true)', sb); await esperar();
  chk('no le pregunta nada a la base y no dibuja', pedidos.length === 0 && caja.innerHTML === '', { pedidos, html: caja.innerHTML });

  console.log('\n== Prendida, con un pedido entrando ==');
  PALANCA = true;
  vm.runInContext('apPedir(true)', sb); await esperar();
  chk('le pregunta a la base solo por los que no están aplicados', pedidos.length >= 1 && /status=neq\.aplicado/.test(pedidos[0]), pedidos);
  chk('no pide el pedido entero (ahí están el teléfono y la dirección)', !/payload|select=\*/.test(pedidos[0]), pedidos[0]);
  const h = caja.innerHTML;
  chk('dibuja el número, el cliente, qué lleva y el total', /Home #1168/.test(h) && /Clienta Prueba/.test(h) && /PMu x2/.test(h) && /34\.000/.test(h), h);
  chk('dice que todavía no se puede armar ni cobrar', /no se puede armar ni cobrar/.test(h), h);
  chk('NO tiene ningún botón ni nada que se pueda apretar', !/<button|onclick|href=/.test(h), h);
  chk('empujó al aplicador, una vez', posts.length === 1 && posts[0].action === 'altaPgAplicar', posts);
  chk('y se queda mirando (vuelve a preguntar en unos segundos)', timers.length >= 1 && timers[timers.length - 1] <= 10000, timers);
  vm.runInContext('apPedir(true)', sb); await esperar();
  chk('no empuja de nuevo enseguida', posts.length === 1, posts.length);

  console.log('\n== La fila apareció ==');
  FILAS = []; actualizo = 0;
  vm.runInContext('apPedir(true)', sb); await esperar();
  chk('la banda se vacía', caja.innerHTML === '', caja.innerHTML);
  chk('y busca los pedidos de nuevo, para que aparezca en la lista', actualizo === 1, actualizo);

  console.log('\n== Tarde, apartado, piezas y un nombre con HTML ==');
  FILAS = [fila(1169, 'Espera Mucho', { received_at: new Date(T0 - 9 * 60000).toISOString() }),
    fila(1170, 'No Entro', { status: 'apartado' }),
    fila(1171, '<img src=x onerror=alert(1)>', { pieces_taken: [{ piece_id: 'PZ-1', held_by: 'Home #1100' }] })];
  vm.runInContext('apPedir(true)', sb); await esperar();
  const h2 = caja.innerHTML;
  chk('el que lleva 9 minutos lo dice', /hace 9 min y todavía sin entrar/.test(h2), h2);
  chk('el apartado dice que hay que cargarlo a mano', /NO entró a la planilla: hay que cargarlo a mano/.test(h2), h2);
  chk('la pieza que era de otro pedido se avisa', /1 pieza de carne ya era de otro pedido/.test(h2), h2);
  chk('el nombre del cliente no mete HTML', !/<img/.test(h2) && /&lt;img/.test(h2), h2);

  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
