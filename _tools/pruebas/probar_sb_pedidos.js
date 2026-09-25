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
    /* `updated_at` y no `source_updated_at`: esta ultima esta en null en las
       1.264 filas de produccion, porque la hoja de Pedidos no tiene columna
       "Updated" y el backend la escribe `null` a proposito. Un fixture que la
       llenaba era mas generoso que la realidad, y por eso este test estuvo
       verde sobre el bug del cartel. */
    updated_at: '2026-09-23T14:05:00+00:00',
    sales_order_item: [{ product_sku: 'ECaC', quantity: '2' }, { product_sku: 'EJyQ', quantity: '1' }] },
  { channel: 'Red', order_number: '-', customer_name: 'Cancelado X', customer_key: '1155550003',
    order_state: 'Cancelado', payment_state: 'No Cobrado', payment_method: '', source_type: '',
    ordered_at: '2026-09-01T10:00:00+00:00', planned_delivery_at: '2026-09-02',
    delivered_at: null, billed_amount: '0.00', cash_amount: '0', transfer_amount: '0', source_row: 55,
    updated_at: '2026-09-01T10:00:00+00:00' },
];

const ctx = {
  console, JSON, Math, Date, String, Number, Boolean, Array, Object, isNaN, Promise, Error,
  API: 'https://script.google.com/macros/s/X/exec',
  D: null, _pendingLoadRender: false, _renders: 0, _editorAbierto: false, _vuelo: [],
  _frescoEnVuelo(f, d) { ctx._vuelo.push({ f: f, d: d }); },
  render() { ctx._renders++; },
  _hayEditorAbierto() { return ctx._editorAbierto; },
  /* Guarda de verdad. Un localStorage que devuelve siempre '' no puede probar
     que el permiso sobreviva a cerrar la app — daria verde sin mirar nada. */
  _ls: {},
  localStorage: {
    getItem: k => (Object.prototype.hasOwnProperty.call(ctx._ls, k) ? ctx._ls[k] : null),
    setItem(k, v) { ctx._ls[k] = String(v); },
    removeItem(k) { delete ctx._ls[k]; }
  },
  SESSION: { usuario: 'tadeo' },
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
  (src.match(/\nvar _SB_TOK_LS=[^;]*;/) || [''])[0],
  sacar('_sbTokGuardar'), sacar('_sbTokLeer'), sacar('_sbTokBorrar'),
  sacar('_sbPermiso'),
  (src.match(/\nvar _SB_DIAS=\[[^\]]*\];/) || [''])[0],
  sacar('_sbDia'), sacar('_sbDdMm'), sacar('_sbAPedido'),
  /* `_sbEnVuelo` y `_sbPedidosAhora` son del 24/9/2026: una sola consulta a
     Supabase por vez. Van ANTES de `_sbPedidos`, que las usa. */
  'var _sbEnVuelo={};',
  sacar('_sbPedidosAhora'), sacar('_sbPedidos'),
  'var _sbCambioLocal=0;',
  (src.match(/\nvar _SB_ESPERA_TRAS_CAMBIO=[^;]*;/) || [''])[0],
  sacar('_sbPuedePisar'), sacar('_sbEdad'), sacar('_sbCompletar'),
  sacar('_sbClavePedido'), sacar('_sbFusionar'), sacar('_sbRefrescoPedidos'),
].join('\n'), ctx);

const tocarAhora = ms => vm.runInContext('_sbCambioLocal=' + ms + ';', ctx);

const limpiar = () => { ctx._ls = {}; vm.runInContext('_sbPerm=null;_sbPermHasta=0;_sbPidiendo=null;', ctx);
  vm.runInContext('_sbEnVuelo={};', ctx); };
/* EL PERMISO YA EN LA MANO, que es el estado normal (24/9/2026).

   Desde hoy el atajo no pide el permiso — lo pide `_sbPermisoTibio` a los 12 s
   del arranque, porque pedirlo en el camino critico atrasa todo 3,5 s. En la
   vida de Tadeo eso significa que el permiso **ya esta** cuando el atajo corre.
   Los casos que prueban el atajo tienen que arrancar de ese estado; los que
   prueban la ausencia de permiso, del otro. */
const conPermiso = async () => { await ctx._sbPermiso(); };
/* El permiso en memoria SIN pasar por la red. Es el estado en que el atajo
   corre de verdad —se lo dejo `_sbPermisoTibio` en la apertura anterior— y
   sembrarlo sin `fetch` deja limpio el contador de `llamadas`, del que dependen
   los asserts del bloque del permiso. */
const permisoAMano = () => vm.runInContext(
  "_sbPerm={token:'TOK',seg:3600,url:'https://p.supabase.co',key:'sb_publishable_x'};"
  + "_sbPermHasta=Date.now()+3500000;_sbEnVuelo={};", ctx);
/* Cerrar y volver a abrir la app: se pierde la memoria, NO el localStorage. */
const reabrir = () => vm.runInContext('_sbPerm=null;_sbPermHasta=0;_sbPidiendo=null;', ctx);

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
  limpiar(); reset(); await conPermiso(); ctx.D = null; ctx._renders = 0;
  chk('con la pantalla vacía, trae la lista y repinta',
    (await ctx._sbRefrescoPedidos()) === true && ctx.D.pedidos.length === 2 && ctx._renders === 1,
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
    (await ctx._sbRefrescoPedidos()) === false && ctx.D.pedidos[0].n === '999' && ctx._renders === 0, ctx.D.pedidos);
  chk('y ni siquiera le pide permiso al ERP', llamadas.length === 0, llamadas);

  limpiar(); reset(); await conPermiso(); ctx.D = null; ctx._renders = 0; ctx._editorAbierto = true;
  await ctx._sbRefrescoPedidos();
  chk('con un editor abierto NO repinta: se le borraría lo que está tipeando',
    ctx._renders === 0 && ctx._pendingLoadRender === true, { renders: ctx._renders });
  ctx._editorAbierto = false; ctx._pendingLoadRender = false;

  /* ── Si algo falla, silencio ── */
  console.log('\n-- si falla, se sale en silencio --');
  limpiar(); reset({ permiso: false }); ctx.D = null; ctx._renders = 0;
  chk('sin permiso (cualquiera que no sea Tadeo) -> no pasa nada',
    (await ctx._sbRefrescoPedidos()) === false && ctx.D === null && ctx._renders === 0);

  reset({ permiso: false });
  await ctx._sbRefrescoPedidos();
  chk('y el "no" se recuerda: no vuelve a preguntar en cada pantalla',
    llamadas.length === 0, llamadas);

  /* Sin red al pedir el permiso. El que lo pide es `_sbPermiso`, asi que se le
     pregunta a el; y el atajo, sin permiso, tiene que salir tranquilo. */
  limpiar(); reset({ fallaTok: true }); ctx.D = null;
  chk('sin red al pedir permiso -> null, no una excepción',
    (await ctx._sbPermiso()) === null);
  chk('y el atajo, sin permiso, devuelve false sin romper nada',
    (await ctx._sbRefrescoPedidos()) === false && ctx.D === null);

  limpiar(); reset(); await conPermiso(); reset({ fallaSb: true }); ctx.D = null;
  chk('si Supabase contesta mal -> false, y la pantalla espera a Google',
    (await ctx._sbRefrescoPedidos()) === false && ctx.D === null);

  limpiar(); reset(); await conPermiso(); reset({ filas: [] }); ctx.D = null; ctx._renders = 0;
  chk('una lista vacía no se pinta como si fuera la verdad',
    (await ctx._sbRefrescoPedidos()) === false && ctx._renders === 0);

  /* ── El permiso se reusa ── */
  console.log('\n-- el permiso se reusa --');
  limpiar(); reset(); ctx.D = null;
  await ctx._sbPermiso();
  const n1 = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  ctx.D = null;
  await ctx._sbPermiso(); await ctx._sbRefrescoPedidos();
  const n2 = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  chk('el permiso se pide UNA vez y se reusa una hora', n1 === 1 && n2 === 1, { n1, n2 });

  /* ── El permiso sobrevive a cerrar la app (24/9/2026) ──
     Vivía sólo en memoria: cada apertura lo pedía de cero, y medido en un
     Chrome real eso eran 7.572 ms de uno de los DOS cupos de la cola, justo
     en el arranque. `reabrir()` pierde la memoria pero NO el localStorage,
     que es exactamente lo que pasa al cerrar y abrir la PWA. */
  console.log('\n-- el permiso sobrevive a cerrar la app --');
  limpiar(); reset(); ctx.D = null;
  await ctx._sbPermiso();
  const _t1 = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  reabrir();                                  // cierra y abre: se va la memoria
  ctx.D = null;
  /* El ATAJO, no `_sbPermiso`: la gracia es que al reabrir el atajo encuentra
     el permiso guardado y corre SIN salir a la red. Si tuviera que pedirlo,
     estariamos de vuelta en los 3,5 s del arranque. */
  const _reab = await ctx._sbRefrescoPedidos();
  const _t2 = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  chk('al reabrir no se vuelve a pedir: sale del guardado', _t1 === 1 && _t2 === 1, { _t1, _t2 });
  chk('y el atajo corre igual, sin una sola llamada al ERP', _reab === true, _reab);

  /* Atado al usuario. Hoy sólo `tadeo` recibe permiso, así que reusar el de
     otro sería darle un acceso que el backend NO le dio. */
  reabrir(); ctx.SESSION = { usuario: 'luqui' }; ctx.D = null;
  /* Primero el atajo: con el permiso de Tadeo guardado, a luqui NO se le presta
     y —como el atajo ya no pide— ni siquiera sale a la red. Es mas fuerte que
     antes: el permiso de otro no se usa Y no se pide uno en su lugar. */
  const _luqui = await ctx._sbRefrescoPedidos();
  const _t3a = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  chk('el permiso de Tadeo NO se le presta a otro usuario',
    _luqui === false && ctx.D === null, { _luqui: _luqui, D: ctx.D });
  chk('y al atajo no le cuesta ni una llamada averiguarlo', _t3a === 1, { _t3a });
  /* Y cuando alguien SI lo pide para luqui, sale un pedido nuevo: el guardado
     de Tadeo no sirve para el. */
  await ctx._sbPermiso();
  const _t3 = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  chk('y si se le pide uno propio, es un pedido NUEVO', _t3 === 2, { _t3 });
  ctx.SESSION = { usuario: 'tadeo' };

  /* Vencido: no se usa. Un token de hace dos horas ya no vale contra Supabase,
     y usarlo sería pedir con un 401 garantizado en vez de renovarlo. */
  limpiar(); reset(); ctx.D = null;
  await ctx._sbPermiso();
  const _g = JSON.parse(ctx._ls['mc_sbtok']);
  ctx._ls['mc_sbtok'] = JSON.stringify(Object.assign({}, _g, { hasta: Date.now() - 1000 }));
  reabrir(); ctx.D = null;
  /* El atajo con un permiso vencido: no lo usa y tampoco pide uno. */
  const _venc = await ctx._sbRefrescoPedidos();
  chk('el atajo no usa un permiso vencido', _venc === false, _venc);
  await ctx._sbPermiso();
  const _t4 = llamadas.filter(u => u.indexOf('sbToken') >= 0).length;
  chk('un permiso vencido no se usa: se pide uno nuevo', _t4 === 2, { _t4 });

  /* Un "no" del backend borra lo guardado. Si le sacaron el permiso a este
     usuario, seguir con el de ayer sería pasar por arriba de esa decisión. */
  limpiar(); reset(); ctx.D = null;
  await ctx._sbPermiso();
  chk('con permiso, queda guardado', !!ctx._ls['mc_sbtok'], Object.keys(ctx._ls));
  reabrir(); reset({ permiso: false }); ctx._ls['mc_sbtok'] = JSON.stringify(
    { u: 'tadeo', sb: { token: 'VIEJO', url: 'https://p.supabase.co', key: 'k' }, hasta: 0 });
  ctx.D = null;
  await ctx._sbPermiso();
  chk('si el ERP le dice que no, se borra el guardado', !ctx._ls['mc_sbtok'], ctx._ls['mc_sbtok']);

  /* El almacenamiento puede fallar (ventana privada, sitio bloqueado). Eso NO
     puede romper la pantalla: se pide el permiso como siempre. */
  limpiar(); reset(); await conPermiso(); ctx.D = null;
  const _lsOrig = ctx.localStorage;
  ctx.localStorage = { getItem() { throw new Error('bloqueado'); },
                       setItem() { throw new Error('bloqueado'); },
                       removeItem() { throw new Error('bloqueado'); } };
  const _sinLs = await ctx._sbRefrescoPedidos();
  ctx.localStorage = _lsOrig;
  chk('sin poder guardar nada, el atajo funciona igual', _sinLs === true, _sinLs);

  /* ══ EL REFRESCO: LOS CUATRO FRENOS ════════════════════════════════════
     Esto pisa la lista que ya está en pantalla, así que acá es donde un error
     se lleva plata de la vista sin avisar. Cada freno tiene su assert. */
  console.log('\n-- el refresco FUSIONA sobre la lista, con frenos --');

  /* FUSIONAR, NO PISAR (24/9/2026). Supabase trae los 400 más nuevos y en la
     planilla hay 1.264: asignar la lista derecho borraba 864 pedidos de la
     pantalla y de todos los totales hasta que llegara Google. Se ve midiendo
     el botón en un Chrome real: la lista arrancaba en 400 y terminaba en 1.264.
     Acá está la forma chica del mismo problema — un pedido que Supabase NO
     trajo tiene que seguir estando. */
  limpiar(); permisoAMano(); reset(); tocarAhora(0);
  ctx.D = { pedidos: [{ h: 'Home', n: 'VIEJO' }] }; ctx._renders = 0;
  const _fus = (await ctx._sbRefrescoPedidos({ llego: false }));
  chk('fusiona: el que Supabase no trajo NO desaparece',
    _fus === true && ctx.D.pedidos.length === 3
    && ctx.D.pedidos.some(p => p.n === 'VIEJO') && ctx._renders === 1,
    ctx.D.pedidos.map(p => p.n));
  chk('y los que sí trajo están',
    ctx.D.pedidos.some(p => p.n === '1023') && ctx.D.pedidos.some(p => p.n === '-'),
    ctx.D.pedidos.map(p => p.n));

  /* El mismo pedido por las dos puntas: gana el de Supabase y NO se duplica.
     Si se duplicara, el conteo de "+N pedidos nuevos" del botón mentiría. */
  limpiar(); permisoAMano(); reset(); tocarAhora(0);
  ctx.D = { pedidos: [{ h: 'Home', n: '1023', c: 'NOMBRE VIEJO' }] };
  await ctx._sbRefrescoPedidos({ llego: false });
  chk('un pedido que viene por las dos puntas se actualiza, no se duplica',
    ctx.D.pedidos.filter(p => p.n === '1023').length === 1
    && ctx.D.pedidos.filter(p => p.n === '1023')[0].c === 'Sofía M',
    ctx.D.pedidos.map(p => p.n + ':' + (p.c || '')));

  /* LOS 14 CANCELADOS SIN NUMERO (24/9/2026). En la planilla traen '-' en la
     columna N°. Con la clave `h|n` se pisan entre ellos y queda uno por canal.
     Medido contra producción con los 1.264: las claves `(canal, número)` son
     **1.253** y las `(canal, fila)` son **1.264** — se pierden ONCE pedidos.

     **No son todos de Home: son Home 11, Clubes 2, Pilar 1.** Importa porque la
     tentación obvia es escribir un caso especial para Home, y entonces Clubes
     sigue perdiendo uno de $195.000. Por eso hay asserts de Clubes y de Pilar,
     no sólo de Home: un test que mira un canal no caza un bug que mira un canal. */
  chk('dos cancelados de CLUBES tampoco comparten clave',
    ctx._sbClavePedido({ h: 'Clubes', n: '-', r: 35 }) !== ctx._sbClavePedido({ h: 'Clubes', n: '-', r: 77 }),
    [ctx._sbClavePedido({ h: 'Clubes', n: '-', r: 35 }), ctx._sbClavePedido({ h: 'Clubes', n: '-', r: 77 })]);
  chk('y la misma fila en DOS canales distintos no se confunde',
    ctx._sbClavePedido({ h: 'Clubes', n: '-', r: 22 }) !== ctx._sbClavePedido({ h: 'Pilar', n: '-', r: 22 }));
  chk('dos cancelados sin número NO comparten clave: los separa la fila',
    ctx._sbClavePedido({ h: 'Home', n: '-', r: 268 }) !== ctx._sbClavePedido({ h: 'Home', n: '-', r: 271 }),
    [ctx._sbClavePedido({ h: 'Home', n: '-', r: 268 }), ctx._sbClavePedido({ h: 'Home', n: '-', r: 271 })]);
  chk('y el mismo cancelado, por las dos puntas, SÍ comparte clave',
    ctx._sbClavePedido({ h: 'Home', n: '-', r: 268 }) === ctx._sbClavePedido({ h: 'Home', n: '', r: 268 }));
  chk('sin número y sin fila no se inventa una clave',
    ctx._sbClavePedido({ h: 'Home', n: '-', r: 0 }) === '');

  /* El caso de verdad: los cancelados vienen POR LAS DOS PUNTAS. Con la clave
     rota, el que trae Supabase se mete en el índice compartido `Home|-` y pisa
     a OTRO cancelado distinto: queda uno repetido y desaparece un tercero.
     El primer intento de esta prueba ponía los tres solo en la lista previa, y
     la mutación se escapaba — el bug necesita las dos puntas para morder. */
  limpiar(); permisoAMano();
  reset({ filas: [{ channel: 'Home', order_number: '-', customer_name: 'Otro Cape (nuevo)',
    customer_key: '1', order_state: 'Cancelado', payment_state: 'No Cobrado', payment_method: '',
    source_type: '', ordered_at: '2026-09-10T10:00:00+00:00', planned_delivery_at: '2026-09-11',
    delivered_at: null, billed_amount: '0', cash_amount: '0', transfer_amount: '0',
    source_row: 271, source_updated_at: '2026-09-10T10:00:00+00:00' }] });
  tocarAhora(0);
  ctx.D = { pedidos: [
    { h: 'Home', n: '-', r: 268, c: 'Cape Brave' },
    { h: 'Home', n: '-', r: 271, c: 'Otro Cape' },
    { h: 'Home', n: '-', r: 276, c: 'Poako' } ] };
  await ctx._sbRefrescoPedidos({ llego: false });
  const _rs = ctx.D.pedidos.filter(p => p.n === '-' && p.h === 'Home').map(p => p.r).sort();
  chk('un cancelado de Supabase actualiza al SUYO, no a otro',
    _rs.length === 3 && _rs.join(',') === '268,271,276',
    ctx.D.pedidos.filter(p => p.n === '-').map(p => '#' + p.r + ':' + p.c));
  chk('y el que actualizó es el de la fila 271',
    (ctx.D.pedidos.filter(p => p.r === 271)[0] || {}).c === 'Otro Cape (nuevo)',
    ctx.D.pedidos.filter(p => p.n === '-').map(p => '#' + p.r + ':' + p.c));

  /* El mismo escenario en CLUBES, que es donde está la plata si alguien escribe
     el caso especial para Home. Supabase trae el de la fila 35 — a proposito el
     que NO es el ultimo del indice: con la clave rota, `Clubes|-` apunta al
     ultimo (el 77) y el 35 lo pisa, o sea que **desaparece Juampi Yofre y sus
     $195.000**. Traer el 77 no cazaria nada: se pisaria a si mismo. */
  limpiar();
  reset({ filas: [{ channel: 'Clubes', order_number: '-', customer_name: 'Catalina Trevisan',
    customer_key: '2', order_state: 'Cancelado', payment_state: 'No Cobrado', payment_method: '',
    source_type: '', ordered_at: '2026-04-30T10:00:00+00:00', planned_delivery_at: '2026-05-01',
    delivered_at: null, billed_amount: '77000', cash_amount: '0', transfer_amount: '0',
    source_row: 35, source_updated_at: '2026-04-30T10:00:00+00:00' }] });
  tocarAhora(0);
  ctx.D = { pedidos: [
    { h: 'Clubes', n: '-', r: 35, c: 'Catalina Trevisan', $: 77000 },
    { h: 'Clubes', n: '-', r: 77, c: 'Juampi Yofre', $: 195000 } ] };
  await ctx._sbRefrescoPedidos({ llego: false });
  const _cl = ctx.D.pedidos.filter(p => p.h === 'Clubes' && p.n === '-');
  chk('en Clubes tampoco se pierde el de $195.000',
    _cl.length === 2 && _cl.map(p => p.r).sort().join(',') === '35,77'
    && (_cl.filter(p => p.r === 77)[0] || {}).$ === 195000,
    _cl.map(p => '#' + p.r + ':$' + p.$));

  /* FRENO 1 — un cobro recién hecho. La réplica tarda hasta 5 min en tenerlo. */
  limpiar(); permisoAMano(); reset(); tocarAhora(Date.now());
  ctx.D = { pedidos: [{ n: 'COBRADO_RECIEN' }] }; ctx._renders = 0;
  chk('NO pisa si acabás de tocar algo: la réplica todavía no lo tiene',
    (await ctx._sbRefrescoPedidos({ llego: false })) === false
    && ctx.D.pedidos[0].n === 'COBRADO_RECIEN' && ctx._renders === 0, ctx.D.pedidos);
  chk('y ni le pide permiso al ERP: se corta antes de salir', llamadas.length === 0, llamadas);

  limpiar(); permisoAMano(); reset(); tocarAhora(Date.now() - 7 * 60 * 1000);
  ctx.D = { pedidos: [{ h: 'Home', n: 'VIEJO' }] };
  chk('pasados los 6 minutos sí entra: la réplica ya lo alcanzó',
    (await ctx._sbRefrescoPedidos({ llego: false })) === true
    && ctx.D.pedidos.some(p => p.n === '1023'), ctx.D.pedidos.map(p => p.n));

  /* FRENO 2 — Google ya llegó. Su dato sale de la planilla, que manda. */
  limpiar(); permisoAMano(); reset(); tocarAhora(0);
  ctx.D = { pedidos: [{ n: 'DE_GOOGLE' }] }; ctx._renders = 0;
  chk('NO pisa si el paquete de Google ya llegó en este mismo refresco',
    (await ctx._sbRefrescoPedidos({ llego: true })) === false
    && ctx.D.pedidos[0].n === 'DE_GOOGLE' && ctx._renders === 0);

  /* FRENO 3 — tocaste algo MIENTRAS la respuesta viajaba. */
  limpiar(); permisoAMano(); reset(); tocarAhora(0);
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
  limpiar(); permisoAMano(); reset(); tocarAhora(0);
  ctx.D = { pedidos: [{ h: 'Home', n: 'VIEJO' }] }; ctx._renders = 0; ctx._editorAbierto = true;
  await ctx._sbRefrescoPedidos({ llego: false });
  chk('con un editor abierto no repinta, pero deja el dato listo',
    ctx._renders === 0 && ctx._pendingLoadRender === true
    && ctx.D.pedidos.some(p => p.n === '1023'), ctx.D.pedidos.map(p => p.n));
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

  limpiar(); permisoAMano(); reset(); tocarAhora(0);
  ctx.D = null; ctx._sellos = []; ctx._vuelo = [];
  ctx._marcarFresco = function (f, ts) { ctx._sellos.push({ f: f, ts: ts }); };
  await ctx._sbRefrescoPedidos({ llego: false });
  const sello = ctx._sellos[0];
  chk('sella "pedidos" con la edad de la réplica, NO con la hora de ahora',
    !!(sello && sello.f[0] === 'pedidos' && sello.ts === Date.parse(FILAS[0].updated_at)),
    sello);
  chk('y esa hora es anterior a ahora: no dice "recién" sobre algo que no lo es',
    !!(sello && sello.ts < Date.now()));
  /* El cartel tiene que apagarse JUNTO con el sello. Sin esto el atajo anda y
     no se nota: los datos ya están pero "Actualizando…" sigue girando hasta
     que vuelve Google. Medido en Chrome real: 215 ms contra 10 s. */
  chk('y apaga el cartel "Actualizando…" al mismo tiempo',
    ctx._vuelo.some(v => v.f[0] === 'pedidos' && v.d === -1), ctx._vuelo);

  limpiar(); permisoAMano(); reset({ filas: [Object.assign({}, FILAS[0], { updated_at: null })] });
  tocarAhora(0); ctx.D = null; ctx._sellos = []; ctx._vuelo = [];
  await ctx._sbRefrescoPedidos({ llego: false });
  chk('si la réplica no dice de cuándo es, no se sella nada (mejor el cartel viejo que uno inventado)',
    ctx._sellos.length === 0, ctx._sellos);
  chk('y tampoco se apaga el cartel: seguimos esperando a Google, que es la verdad',
    !ctx._vuelo.some(v => v.d === -1), ctx._vuelo);

  /* ══ LA COLUMNA DEL SELLO, REINYECTADA ═════════════════════
     El bug del 24/9/2026: el front pedia `source_updated_at`, que el backend
     escribe null a proposito (la hoja de Pedidos no tiene columna "Updated").
     `_sbEdad` devolvia 0, el `if(edad)` no entraba nunca, y el atajo pintaba
     la lista sin apagar el cartel. Medido en Chrome real: la lista a los
     523 ms y "Actualizando..." girando hasta los 4.346 ms.

     Funcionaba y no se notaba, que es la peor forma de estar roto. */
  console.log('\n-- la columna del sello es la que existe de verdad --');

  /* Una fila EXACTAMENTE como viene de produccion. */
  limpiar(); permisoAMano();
  reset({ filas: [Object.assign({}, FILAS[0], {
    source_updated_at: null,                       // como en la base, siempre
    updated_at: '2026-09-24T21:15:00+00:00'        // el sello de la replica
  })] });
  tocarAhora(0); ctx.D = null; ctx._sellos = []; ctx._vuelo = [];
  await ctx._sbRefrescoPedidos({ llego: false });
  const selloProd = ctx._sellos[0];
  chk('una fila como las de produccion (source_updated_at null) SI sella',
    !!(selloProd && selloProd.ts === Date.parse('2026-09-24T21:15:00+00:00')), selloProd);
  chk('y apaga el cartel, que es lo que el bug no hacia',
    ctx._vuelo.some(v => v.f[0] === 'pedidos' && v.d === -1), ctx._vuelo);

  /* La consulta, mirada por su URL y no por el texto del archivo: si alguien
     saca la columna del select, PostgREST no la manda y el sello se apaga sin
     que nada avise. */
  limpiar(); permisoAMano(); reset(); tocarAhora(0); ctx.D = null;
  await ctx._sbPedidos(400);
  const consulta = llamadas.find(u => u.indexOf('/rest/v1/sales_order') >= 0) || '';
  chk('la consulta PIDE updated_at', /[?&,]updated_at/.test(consulta),
    consulta.slice(0, 200));
  chk('y NO pide source_updated_at, que volveria a estar en null',
    consulta.indexOf('source_updated_at') < 0, consulta.slice(0, 200));

  /* ══ EL PERMISO NO SE PIDE EN EL CAMINO CRITICO ═════════════════
     Medido en el arranque contra produccion: `sbToken` tarda 3,5 s y se queda
     con uno de los DOS cupos de Apps Script. Con esa cuenta, sin permiso
     guardado el atajo TARDA MAS que ir derecho a Google (4,1 s contra 3,5 s) y
     encima atrasa a `cobrosPendientes`, `cajaLight` y `ocLight`.

     Asi que el atajo usa el permiso si lo tiene y no lo pide si no lo tiene.
     Pedirlo es tarea de `_sbPermisoTibio`, a los 12 s, con la cola vacia. */
  console.log('\n-- el permiso no frena el arranque --');

  /* SIN permiso a mano, a proposito: es lo que este bloque viene a probar. */
  limpiar(); reset(); tocarAhora(0); ctx.D = null;
  const sinPermiso = await ctx._sbPedidos(400);
  chk('sin permiso guardado, el atajo devuelve null y no rompe nada',
    sinPermiso === null, sinPermiso);
  chk('y NO sale a pedir el permiso: cero llamadas a sbToken',
    llamadas.filter(u => u.indexOf('action=sbToken') >= 0).length === 0, llamadas);
  chk('ni consulta Supabase, claro',
    llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length === 0, llamadas);

  /* Pero alguien tiene que pedirlo, o el atajo no arranca nunca. */
  limpiar(); reset();
  const perm = await ctx._sbPermiso();
  chk('_sbPermiso() a secas SI lo pide — es lo que hace el pedido tibio',
    !!(perm && perm.token === 'TOK')
    && llamadas.filter(u => u.indexOf('action=sbToken') >= 0).length === 1, llamadas);

  /* ══ UNA SOLA CONSULTA EN VUELO ══════════════════════════
     En el arranque `SUPABASE sales_order` salia dos veces en el mismo
     milisegundo: `_sbAdelanto` y `_sbRefrescoPedidos` esperaban el mismo
     permiso y salian juntos al llegar. */
  console.log('\n-- la misma consulta no sale dos veces --');

  limpiar(); permisoAMano(); reset(); tocarAhora(0); ctx.D = null;
  const antes = llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length;
  /* Las dos SIN await en el medio: es el caso real, los dos caminos arrancan
     en el mismo tick. Con un await entre una y otra la primera ya termino y
     esto no probaria nada. */
  const dos = await Promise.all([ctx._sbPedidos(400), ctx._sbPedidos(400)]);
  const despues = llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length;
  chk('dos llamadas al mismo tiempo hacen UNA sola consulta',
    despues - antes === 1, { antes: antes, despues: despues });
  chk('y las dos reciben la misma lista',
    !!(dos[0] && dos[1] && dos[0].length === dos[1].length && dos[0].length > 0));

  /* Ya terminada, la siguiente vuelve a consultar: esto es compartir el vuelo,
     no cachear la respuesta. */
  const trasFin = llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length;
  await ctx._sbPedidos(400);
  chk('terminada la primera, la siguiente SI vuelve a consultar (no es un cache)',
    llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length - trasFin === 1);

  /* El candado se abre aunque la consulta falle. Sin esto, un error de red de
     un segundo dejaria el atajo apagado por el resto de la sesion. */
  limpiar(); permisoAMano(); reset({ fallaSb: true }); tocarAhora(0); ctx.D = null;
  const fallo = await ctx._sbPedidos(400);
  chk('una consulta que falla devuelve null, sin romper', fallo === null, fallo);
  reset({ fallaSb: false });
  ctx._ls = ctx._ls;                            // el permiso sigue en memoria
  const trasFallo = llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length;
  const despuesDelFallo = await ctx._sbPedidos(400);
  chk('y el vuelo queda LIBRE: la siguiente vuelve a intentar',
    llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length - trasFallo === 1);
  chk('y esa si trae la lista', !!(despuesDelFallo && despuesDelFallo.length > 0));

  /* El vuelo compartido va atado al USUARIO, no solo al limite. Una consulta
     en vuelo es el permiso de alguien en uso: si dos usuarios comparten el
     vuelo, el segundo se lleva la lista que pidio el primero.

     Lo destapo la reinyeccion del 24/9/2026 (romper la liberacion del vuelo
     puso rojo el caso de "no se le presta a otro usuario", que es de otro
     bloque). Hoy cambiar de usuario recarga la pagina, asi que no se puede dar
     en la practica — la regla no cuelga de ese accidente. */
  limpiar(); permisoAMano(); reset(); tocarAhora(0); ctx.D = null;
  const _cAntes = llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length;
  /* En el MISMO tick, o no comparten vuelo y el caso no prueba nada. */
  const _pTadeo = ctx._sbPedidos(400);
  ctx.SESSION = { usuario: 'luqui' };
  const _pLuqui = ctx._sbPedidos(400);
  await Promise.all([_pTadeo, _pLuqui]);
  ctx.SESSION = { usuario: 'tadeo' };
  chk('dos usuarios distintos NO comparten la consulta en vuelo',
    llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length - _cAntes === 2,
    llamadas.filter(u => u.indexOf('/rest/v1/') >= 0).length - _cAntes);

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})();
