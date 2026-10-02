/* EL ADELANTO DE SUPABASE SE PROTEGE POR PEDIDO, NO POR LA FILA MAS NUEVA (2/10/2026).
 *
 *     node _tools/pruebas/probar_adelanto_por_pedido.js              # el archivo de hoy
 *     node _tools/pruebas/probar_adelanto_por_pedido.js --ref ce5a645 # un commit (tiene que dar MAL)
 *
 * Lo marco Codex sobre `ce5a645`: `_sbRefrescoPedidos` autorizaba reemplazar las
 * 400 filas con `_sbEdad(lista)`, que es la fecha MAXIMA. La replica copia de a
 * una y puede cortar a la mitad: si copio el pedido A despues de un cobro hecho
 * aca en el B, pero corto antes de copiar el B, la fila nueva de A habilitaba
 * pisar al B con su fila vieja — y el cobro volvia a «No Cobrado».
 *
 * Saca del `panel.src.html` las funciones REALES y las corre con la lista de
 * Supabase simulada y un reloj fijo. No toca produccion.
 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), cp = require('child_process');
const RAIZ = path.join(__dirname, '..', '..');
const iRef = process.argv.indexOf('--ref');
const src = (iRef > 0
  ? cp.execSync('git show ' + process.argv[iRef + 1] + ':_src/panel.src.html', { cwd: RAIZ, maxBuffer: 64 << 20 }).toString()
  : fs.readFileSync(path.join(RAIZ, '_src', 'panel.src.html'), 'utf8')).replace(/\r\n/g, '\n');

let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d) : '')); } };

function sacar(nombre, opcional) {
  const i = src.indexOf('\nfunction ' + nombre + '(');
  if (i < 0) { if (opcional) return ''; throw new Error('no encuentro ' + nombre); }
  let n = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') n++; else if (src[k] === '}') { n--; if (n === 0) break; } }
  return src.slice(i + 1, k + 1);
}

const MIN = 60 * 1000;
const AHORA = Date.parse('2026-10-02T20:00:00Z');
const iso = ms => new Date(ms).toISOString();

function armar() {
  const ctx = {
    console, JSON, Math, String, Number, Boolean, Array, Object, isNaN, Promise, Error,
    Date: class extends Date { static now() { return ctx._now; } },
    _now: AHORA, D: null, _renders: 0, _sellos: [], _lista: [],
    _sbPedidos() { return Promise.resolve(ctx._lista.map(x => Object.assign({}, x))); },
    _sbCompletar() {}, render() { ctx._renders++; }, _hayEditorAbierto() { return false; },
    _sbGuardarCopia() { return true; }, _marcarFresco(f, t) { ctx._sellos.push(t); }, _apagarCartelUnaVez() {},
  };
  vm.createContext(ctx);
  vm.runInContext([
    'var _SB_ESPERA_TRAS_CAMBIO=6*60*1000; var _sbCambioLocal=0; var _sbCambiosPed={};',
    sacar('_sbPuedePisar'), sacar('_sbFotoPosterior'), sacar('_sbEdad'), sacar('_sbClavePedido'),
    sacar('_sbVistoTs', true), sacar('_sbFilaPisa', true), sacar('_sbFusionar'), sacar('_patchPedidoLocal'), sacar('_sbRefrescoPedidos'),
  ].join('\n'), ctx);
  return ctx;
}
const ped = (n, ep, extra) => Object.assign({ h: 'Home', n: String(n), ep: ep, $: 1000, r: 100 + n }, extra || {});

(async () => {
  console.log('\n1) La replica copio A y corto antes de B (cobrado aca hace 8 min)');
  {
    const c = armar();
    c.D = { pedidos: [ped(1, 'No Cobrado'), ped(2, 'No Cobrado'), ped(3, 'Cobrado')] };
    c._now = AHORA - 8 * MIN;
    c._patchPedidoLocal('Home', '2', { ep: 'Cobrado' });   // el cobro, hecho aca
    c._now = AHORA;
    const L = AHORA - 8 * MIN;
    c._lista = [
      ped(1, 'Cobrado', { _ts: iso(L + 2 * MIN) }),          // A: copiada DESPUES del cobro
      ped(2, 'No Cobrado', { _ts: iso(L - 20 * MIN) }),      // B: la replica no llego
      ped(3, 'Cobrado', { _ts: iso(L - 30 * MIN) }),
    ];
    await c._sbRefrescoPedidos(null);
    const b = c.D.pedidos.find(p => p.n === '2'), a = c.D.pedidos.find(p => p.n === '1');
    chk('B sigue Cobrado (la fila de A no habilita pisarlo)', b && b.ep === 'Cobrado', b && b.ep);
    chk('A si se actualiza con lo de la base', a && a.ep === 'Cobrado', a && a.ep);
  }

  console.log('\n2) Cuando la replica SI copia el cobro de B, pisa');
  {
    const c = armar();
    c.D = { pedidos: [ped(2, 'No Cobrado', { $: 1000 })] };
    c._now = AHORA - 8 * MIN;
    c._patchPedidoLocal('Home', '2', { ep: 'Cobrado' });
    c._now = AHORA;
    c._lista = [ped(2, 'Cobrado', { $: 1500, _ts: iso(AHORA - 1 * MIN) })];
    await c._sbRefrescoPedidos(null);
    const b = c.D.pedidos[0];
    chk('B toma la fila posterior al cobro (monto 1500)', b && b.$ === 1500, b);
  }

  console.log('\n3) Sin fecha en la fila y con cambio aca: no pisa');
  {
    const c = armar();
    c.D = { pedidos: [ped(2, 'No Cobrado')] };
    c._now = AHORA - 8 * MIN;
    c._patchPedidoLocal('Home', '2', { ep: 'Cobrado' });
    c._now = AHORA;
    c._lista = [ped(2, 'No Cobrado', { _ts: '' }), ped(9, 'Cobrado', { _ts: iso(AHORA - MIN) })];
    await c._sbRefrescoPedidos(null);
    chk('B sigue Cobrado', c.D.pedidos[0].ep === 'Cobrado', c.D.pedidos[0].ep);
  }

  console.log('\n4) Pedidos que no se tocaron aca se actualizan igual');
  {
    const c = armar();
    c.D = { pedidos: [ped(1, 'No Cobrado'), ped(2, 'No Cobrado')] };
    c._now = AHORA - 8 * MIN;
    c._patchPedidoLocal('Home', '2', { ep: 'Cobrado' });
    c._now = AHORA;
    c._lista = [ped(1, 'Cobrado', { _ts: iso(AHORA - 30 * MIN) }), ped(2, 'No Cobrado', { _ts: iso(AHORA - 30 * MIN) })];
    await c._sbRefrescoPedidos(null);
    chk('A (sin cambio aca) toma lo de la base', c.D.pedidos[0].ep === 'Cobrado', c.D.pedidos[0].ep);
    chk('B (cobrado aca, fila vieja) no se pisa', c.D.pedidos[1].ep === 'Cobrado', c.D.pedidos[1].ep);
  }

  console.log('\n5) El freno de 6 minutos sigue');
  {
    const c = armar();
    c.D = { pedidos: [ped(1, 'No Cobrado')] };
    c._now = AHORA - 2 * MIN;
    c._patchPedidoLocal('Home', '7', { ep: 'Cobrado' });
    c._now = AHORA;
    c._lista = [ped(1, 'Cobrado', { _ts: iso(AHORA - MIN) })];
    const r = await c._sbRefrescoPedidos(null);
    chk('a los 2 min de un cambio no pinta nada', r === false && c.D.pedidos[0].ep === 'No Cobrado', r);
  }

  console.log('\n' + ok + ' ok, ' + mal + ' MAL');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
