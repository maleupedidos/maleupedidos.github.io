/* LA LISTA DE PEDIDOS DESDE SUPABASE (23/9/2026).
 *
 *     node _tools/pruebas/probar_sb_pedidos.js
 *
 * Saca del `panel.src.html` REAL las funciones del adelanto de Supabase y las
 * corre con un `fetch` simulado. Lo que cuida:
 *
 * · **Las fechas salen EXACTAMENTE como las manda el volcado.** Si `f` no sale
 *   'dd/MM' o `dee` no sale en ISO, al llegar el paquete de Google la lista
 *   entera parpadea con otro formato — y el usuario lee eso como un error.
 * · **El adelanto no pisa datos más frescos.** Si `D.pedidos` ya tiene algo, no
 *   toca nada. Pisar una respuesta de Google con una foto de la réplica sería
 *   mentir en verde.
 * · **Si algo falla, se sale en silencio** y la pantalla espera a Google como
 *   siempre. Una optimización invisible no puede romper la pantalla.
 * · **No repinta encima de alguien que está tipeando.**
 * · **Un "no" se recuerda**: hoy sólo Tadeo recibe permiso, así que para el
 *   resto del equipo esto tiene que costar CERO llamadas repetidas.
 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, '..', '..', '_src', 'panel.src.html');
const src = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } };

function sacar(nombre) {
  const i = src.indexOf('\nfunction ' + nombre + '(');
  if (i < 0) throw new Error('no encuentro ' + nombre + ' en panel.src.html');
  let j = src.indexOf('{', i), n = 0, k = j;
  for (; k < src.length; k++) { if (src[k] === '{') n++; else if (src[k] === '}') { n--; if (n === 0) break; } }
  return src.slice(i + 1, k + 1);
}

/* El fetch simulado. Cada prueba lo reconfigura. */
let escena, llamadas;
function reset(o) {
  escena = Object.assign({ permiso: true, filas: null, fallaSb: false, fallaTok: false }, o || {});
  llamadas = [];
}
const FILAS = [
  { channel: 'Home', order_number: '1023', customer_name: 'Sofía M', customer_key: '1156669294',
    order_state: 'Entregado', payment_state: 'Cobrado', payment_method: 'Efectivo', source_type: 'Deposito',
    ordered_at: '2026-09-23T14:05:00+00:00', planned_delivery_at: '2026-09-23',
    delivered_at: '2026-09-23T19:30:00+00:00', billed_amount: '58000.00',
    cash_amount: '58000.00', transfer_amount: '0.00', source_row: 1002,
    source_updated_at: '2026-09-23T14:05:00+00:00',
    sales_order_item: [{ product_sku: 'ECaC', quantity: '2' }, { product_sku: 'EJyQ', quantity: '1' }] },
  { channel: 'Red', order_number: '-', customer_name: 'Cancelado X', customer_key: '1155550003',
    order_state: 'Cancelado', payment_state: 'No Cobrado', payment_method: '', source_type: '',
    ordered_at: '2026-09-01T10:00:00+00:00', planned_delivery_at: '2026-09-02',
    delivered_at: null, billed_amount: '0.00', cash_amount: '0', transfer_amount: '0', source_row: 55,
    source_updated_at: '2026-09-01T10:00:00+00:00' },
];

const ctx = {
  console, JSON, Math, Date, String, Number, Boolean, Array, Object, isNaN, Promise, Error,
  API: 'https://script.google.com/macros/s/X/exec',
  D: null, _pendingLoadRender: false, _renders: 0, _editorAbierto: false,
  render() { ctx._renders++; },
  _hayEditorAbierto() { return ctx._editorAbierto; },
  localStorage: { getItem: () => '', setItem() {} },
  fetch(url, init) {
    llamadas.push(url);
    if (url.indexOf('action=sbToken') >= 0) {
      if (escena.fallaTok) return Promise.reject(new Error('sin red'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true,
        sb: escena.permiso ? { token: 'TOK', seg: 3600, url: 'https://p.supabase.co', key: 'sb_publishable_x' } : null }) });
    }
    if (escena.fallaSb) return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve(null) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(escena.filas || FILAS) });
  }
};
vm.createContext(ctx);
vm.runInContext([
  'var _sbPerm=null,_sbPermHasta=0,_sbPidiendo=null;',
  sacar('_sbPermiso'),
  (src.match(/\nvar _SB_DIAS=\[[^\]]*\];/) || [''])[0],
  sacar('_sbDia'), sacar('_sbDdMm'), sacar('_sbAPedido'), sacar('_sbPedidos'), sacar('_sbAdelanto'),
  'var _sbCambioLocal=0;',
  (src.match(/\nvar _SB_ESPERA_TRAS_CAMBIO=[^;]*;/) || [''])[0],
  sacar('_sbPuedePisar'), sacar('_sbEdad'), sacar('_sbCompletar'), sacar('_sbRefrescoPedidos'),
].join('\n'), ctx);

const tocarAhora = ms => vm.runInContext('_sbCambioLocal=' + ms + ';', ctx);

const limpiar = () => vm.runInContext('_sbPerm=null;_sbPermHasta=0;_sbPidiendo=null;', ctx);

(async function () {
  console.log('\n== La lista de Pedidos desde Supabase ==\n');

  /* ── Las fechas, que es donde se nota si está mal ── */
  console.log('-- el mapeo de una fila --');
  const p = ctx._sbAPedido(FILAS[0]);
  chk("la fecha del pedido sale 'dd/MM', igual que el volcado", p.f === '23/09', p.f);
  chk('el día de entrega sale en ISO', p.dee === '2026-09-23', p.dee);
  chk('y con el nombre del día, como lo manda Google', p.de === 'Miércoles', p.de);
  chk('el facturado llega como número, no como texto', p.$ === 58000 && typeof p.$ === 'number', p.$);
  chk('canal, número, cliente y estados', p.h === 'Home' && p.n === '1023' && p.es === 'Entregado' && p.ep === 'Cobrado');
  chk('la fila de la planilla viaja, para poder abrir el pedido', p.r === 1002);
  chk('queda marcado que viene de Supabase', p._deSupabase === 1);
  /* SIN ESTO LA PANTALLA REVIENTA. `rPedidos` hace p.p.map / .length / .forEach,
     y un undefined ahi tira un TypeError que no se ve: la lista se queda como
     estaba y Tadeo sigue esperando. Medido en Chrome real el 23/9 a la noche. */
  chk('los productos vienen como {a, q}, que es lo que dibuja la lista',
    Array.isArray(p.p) && p.p.length === 2 && p.p[0].a === 'ECaC' && p.p[0].q === 2,
    p.p);
  chk('y si la consulta no los trajo, es un array vacío y NO undefined',
    Array.isArray(ctx._sbAPedido({ order_number: '1' }).p), ctx._sbAPedido({ order_number: '1' }).p);

  const c = ctx._sbAPedido(FILAS[1]);
  chk('un cancelado sin número queda MARCADO, no con un guión suelto',
    c._sinNum === true && c.n === '-', { n: c.n, _sinNum: c._sinNum });
  chk('y una entrega sin fecha no inventa nada', c.fe === '' && c.fex === '', { fe: c.fe, fex: c.fex });
  chk('un importe en cero es 0, no NaN', c.$ === 0);

  /* ── El adelanto ── */
  console.log('\n-- el adelanto --');
  limpiar(); reset(); ctx.D = null; ctx._renders = 0;
  chk('con la pantalla vacía, trae la lista y repinta',
    (await ctx._sbAdelanto()) === true && ctx.D.pedidos.length === 2 && ctx._renders === 1,
    { n: ctx.D && ctx.D.pedidos && ctx.D.pedidos.length, renders: ctx._renders });
  chk('y queda anotado que esa foto es de Supabase', ctx.D._pedidosDeSupabase === 1);
  /* Lo que render() recorre y Supabase no trae. Un undefined acá tira un
     TypeError que el try/catch del render se traga: la pantalla se queda como
     estaba y parece que el adelanto no hizo nada. Costó dos publicaciones. */
  chk('deja listo lo que render() recorre: canales, OCs y cobros',
    Array.isArray(ctx.D.canales) && ctx.D.oc && Array.isArray(ctx.D.oc.lista)
    && Array.isArray(ctx.D.cobros),
    { canales: ctx.D.canales, oc: ctx.D.oc, cobros: ctx.D.cobros });

  limpiar(); reset(); ctx.D = { pedidos: [{ n: '999' }] }; ctx._renders = 0;
  chk('si YA hay pedidos en pantalla, no toca nada (no pisa lo más fresco)',
    (await ctx._sbAdelanto()) === false && ctx.D.pedidos[0].n === '999' && ctx._renders === 0, ctx.D.pedidos);
  chk('y ni siquiera le pide permiso al ERP', llamadas.length === 0, llamadas);

  limpiar(); reset(); ctx.D = null; ctx._renders = 0; ctx._editorAbierto = true;
  await ctx._sbAdelanto();
  chk('con un editor abierto NO repinta: se le borraría lo que está tipeando',
    ctx._renders === 0 && ctx._pendingLoadRender === true, { renders: ctx._renders });
  ctx._editorAbierto = false; ctx._pendingLoadRender = false;

  /* ── Si algo falla, silencio ── */
  console.log('\n-- si falla, se sale en silencio --');
  limpiar(); reset({ permiso: false }); ctx.D = null; ctx._renders = 0;
  chk('sin permiso (cualquiera que no sea Tadeo) -> no pasa nada',
    (await ctx._sbAdelanto()) === false && ctx.D === null && ctx._renders === 0);

  reset({ permiso: false });
  await ctx._sbAdelanto();
  chk('y el "no" se recuerda: no vuelve a preguntar en cada pantalla',
    llamadas.length === 0, llamadas);

  limpiar(); reset({ fallaTok: true }); ctx.D = null;
  chk('sin red al pedir permiso -> false, no una excepción', (await ctx._sbAdelanto()) === false);

  limpiar(); reset({ fallaSb: true }); ctx.D = null;
  chk('si Supabase contesta mal -> false, y la pantalla espera a Google',
    (await ctx._sbAdelanto()) === false && ctx.D === null);

  limpiar(); reset({ filas: [] }); ctx.D = null; ctx._renders = 0;
  chk('una lista vacía no se pinta como si fuera la verdad',
    (await ctx._sbAdelanto()) === false && ctx._renders === 0);

  /* ── El permiso se reusa ── */
  console.log('\n-- el permiso se reusa --');
  limpiar(); reset(); ctx.D = null;
  await ctx._sbAdelanto();
  const n1 = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  ctx.D = null;
  await ctx._sbAdelanto();
  const n2 = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  chk('el permiso se pide UNA vez y se reusa una hora', n1 === 1 && n2 === 1, { n1, n2 });

  /* ══ EL REFRESCO: LOS CUATRO FRENOS ════════════════════════════════════
     Esto pisa la lista que ya está en pantalla, así que acá es donde un error
     se lleva plata de la vista sin avisar. Cada freno tiene su assert. */
  console.log('\n-- el refresco pisa la lista, con frenos --');

  limpiar(); reset(); tocarAhora(0);
  ctx.D = { pedidos: [{ n: 'VIEJO' }] }; ctx._renders = 0;
  chk('SÍ reemplaza una lista que ya estaba (esto es lo nuevo)',
    (await ctx._sbRefrescoPedidos({ llego: false })) === true
    && ctx.D.pedidos.length === 2 && ctx.D.pedidos[0].n === '1023' && ctx._renders === 1,
    ctx.D.pedidos.map(p => p.n));

  /* FRENO 1 — un cobro recién hecho. La réplica tarda hasta 5 min en tenerlo. */
  limpiar(); reset(); tocarAhora(Date.now());
  ctx.D = { pedidos: [{ n: 'COBRADO_RECIEN' }] }; ctx._renders = 0;
  chk('NO pisa si acabás de tocar algo: la réplica todavía no lo tiene',
    (await ctx._sbRefrescoPedidos({ llego: false })) === false
    && ctx.D.pedidos[0].n === 'COBRADO_RECIEN' && ctx._renders === 0, ctx.D.pedidos);
  chk('y ni le pide permiso al ERP: se corta antes de salir', llamadas.length === 0, llamadas);

  limpiar(); reset(); tocarAhora(Date.now() - 7 * 60 * 1000);
  ctx.D = { pedidos: [{ n: 'VIEJO' }] };
  chk('pasados los 6 minutos sí pisa: la réplica ya lo alcanzó',
    (await ctx._sbRefrescoPedidos({ llego: false })) === true && ctx.D.pedidos[0].n === '1023');

  /* FRENO 2 — Google ya llegó. Su dato sale de la planilla, que manda. */
  limpiar(); reset(); tocarAhora(0);
  ctx.D = { pedidos: [{ n: 'DE_GOOGLE' }] }; ctx._renders = 0;
  chk('NO pisa si el paquete de Google ya llegó en este mismo refresco',
    (await ctx._sbRefrescoPedidos({ llego: true })) === false
    && ctx.D.pedidos[0].n === 'DE_GOOGLE' && ctx._renders === 0);

  /* FRENO 3 — tocaste algo MIENTRAS la respuesta viajaba. */
  limpiar(); reset(); tocarAhora(0);
  ctx.D = { pedidos: [{ n: 'ANTES' }] };
  const fetchOrig = ctx.fetch;
  ctx.fetch = function (u, i) {
    if (u.indexOf('sales_order') >= 0) tocarAhora(Date.now());   // cobra justo ahora
    return fetchOrig.call(ctx, u, i);
  };
  chk('NO pisa si tocaste algo mientras la respuesta venía en camino',
    (await ctx._sbRefrescoPedidos({ llego: false })) === false && ctx.D.pedidos[0].n === 'ANTES');
  ctx.fetch = fetchOrig;

  /* FRENO 4 — el editor abierto. */
  limpiar(); reset(); tocarAhora(0);
  ctx.D = { pedidos: [{ n: 'VIEJO' }] }; ctx._renders = 0; ctx._editorAbierto = true;
  await ctx._sbRefrescoPedidos({ llego: false });
  chk('con un editor abierto no repinta, pero deja el dato listo',
    ctx._renders === 0 && ctx._pendingLoadRender === true && ctx.D.pedidos[0].n === '1023');
  ctx._editorAbierto = false; ctx._pendingLoadRender = false;

  /* ══ EL SELLO NO PUEDE MENTIR ═════════════════════════════════════════ */
  console.log('\n-- el sello dice la edad de verdad --');
  const AYER = '2026-09-22T18:00:00+00:00';
  chk('la edad de la foto es el sello MÁS NUEVO de las filas',
    ctx._sbEdad([{ _ts: AYER }, { _ts: '2026-09-23T20:00:00+00:00' }])
      === Date.parse('2026-09-23T20:00:00+00:00'));
  chk('sin ningún sello devuelve 0, y entonces NO se sella nada',
    ctx._sbEdad([{ _ts: '' }, {}]) === 0);
  chk('un sello ilegible no se toma por bueno', ctx._sbEdad([{ _ts: 'cualquier cosa' }]) === 0);

  limpiar(); reset(); tocarAhora(0);
  ctx.D = null; ctx._sellos = [];
  ctx._marcarFresco = function (f, ts) { ctx._sellos.push({ f: f, ts: ts }); };
  await ctx._sbRefrescoPedidos({ llego: false });
  const sello = ctx._sellos[0];
  chk('sella "pedidos" con la edad de la réplica, NO con la hora de ahora',
    !!(sello && sello.f[0] === 'pedidos' && sello.ts === Date.parse(FILAS[0].ordered_at)),
    sello);
  chk('y esa hora es anterior a ahora: no dice "recién" sobre algo que no lo es',
    !!(sello && sello.ts < Date.now()));

  limpiar(); reset({ filas: [Object.assign({}, FILAS[0], { source_updated_at: null })] });
  tocarAhora(0); ctx.D = null; ctx._sellos = [];
  await ctx._sbRefrescoPedidos({ llego: false });
  chk('si la réplica no dice de cuándo es, no se sella nada (mejor el cartel viejo que uno inventado)',
    ctx._sellos.length === 0, ctx._sellos);

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})();
