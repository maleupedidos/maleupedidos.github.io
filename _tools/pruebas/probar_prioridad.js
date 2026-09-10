/**
 * ¿La cola le da prioridad al volcado cuando la tab abierta es STOCK?
 *
 * DOS intentos anteriores dieron verde CON el bug adentro, y por el mismo
 * motivo cada vez: medían cuando la decisión ya estaba tomada.
 *   1. El tiempo total no sirve — Apps Script dio 24, 57 y 121 s para el mismo
 *      `admin`: la varianza es mas grande que el efecto.
 *   2. Un mock de 1,2 s tampoco: para cuando el test entra a Stock, la cola ya
 *      soltó cuatro pedidos y `admin` ya salió.
 *
 * Lo que sí es determinista: un mock **lento** (15 s) deja la fila quieta con
 * los 2 cupos ocupados. Se entra a Stock ahí, y cuando se libera el primer cupo
 * la cola tiene que elegir `admin` —prioridad 2— por encima de los livianos que
 * esa tab no usa. Sin `stock` en `_PINTA_TAB`, `admin` cae en `_CAROS` y sale
 * ULTIMO.
 *
 *   node probar_prioridad.js <token>
 */
const { abrir, evaluar } = require('./cdp.js');
const PREP = require('./sesion_prep.js')(process.argv[2]);

const DEMORA = 15000;
let ok = 0, mal = 0;
function chk(cond, txt, extra) {
  if (cond) { ok++; console.log('  ok   ' + txt); }
  else { mal++; console.log('  MAL  ' + txt + (extra ? '   ' + extra : '')); }
}

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride',
    { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + `
    window.__orden = [];
    (function(){ window.fetch = function (u, x) {
      var url = String((u && u.url) || u || '');
      if (url.indexOf('script.google.com') < 0) return Promise.resolve(new Response('{}', {status:200}));
      var a = (url.match(/action=([a-zA-Z_]+)/) || [])[1] || '(pedido)';
      window.__orden.push({ a: a, ms: Date.now() - window.__t0 });
      return new Promise(function (res) { setTimeout(function () {
        res(new Response(JSON.stringify({ ok: true, pedidos: [], stock: [], deps: [],
          cortes: [], v: [], oc: { lista: [] }, prov: [], caja: {} }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }, ${DEMORA}); });
    }; })();
    window.__t0 = Date.now();
  ` });
  await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });

  // Entrar a Stock MIENTRAS la fila esta quieta: los 2 cupos ocupados y el
  // resto esperando. Ahi es donde la prioridad decide algo.
  const r = await evaluar(cli, `(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      if (typeof window.go === 'function' && window.__colaGet && window.__colaGet().cola > 0) break;
      await new Promise(r => setTimeout(r, 50));
    }
    const filaAlEntrar = window.__colaGet ? window.__colaGet() : null;
    const yaSalieron = window.__orden.map(o => o.a);
    window.go('stock');
    const tabAbierta = (document.querySelector('.pg.on') || {}).id || '(?)';
    // esperar a que la fila se vacie: cada uno tarda ${DEMORA} ms
    await new Promise(r => setTimeout(r, ${DEMORA} * 5 + 3000));
    return { filaAlEntrar, yaSalieron, tabAbierta,
             orden: window.__orden.map(o => o.a + '@' + Math.round(o.ms / 100) / 10 + 's') };
  })()`);

  console.log('  tab abierta al decidir: ' + r.tabAbierta);
  console.log('  ya habian salido: ' + JSON.stringify(r.yaSalieron));
  console.log('  fila al entrar a Stock: ' + JSON.stringify(r.filaAlEntrar));
  console.log('  orden completo:');
  r.orden.forEach((a, i) => console.log('     ' + (i + 1) + '. ' + a));

  chk(r.tabAbierta === 'p-stock', 'la tab Stock quedo abierta', r.tabAbierta);
  chk((r.filaAlEntrar || {}).cola > 0, 'habia pedidos esperando en la fila',
    JSON.stringify(r.filaAlEntrar));

  const nombres = r.orden.map(s => s.split('@')[0]);
  const nuevos = nombres.slice(r.yaSalieron.length);
  console.log('  soltados DESPUES de entrar a Stock: ' + JSON.stringify(nuevos));
  chk(nuevos[0] === 'admin',
    'el volcado sale PRIMERO de la fila con Stock abierta',
    'salio primero ' + nuevos[0]);

  const iAdmin = nombres.indexOf('admin');
  ['cajaLight', 'ocLight', 'ventas', 'catalogo', 'tendencia'].forEach(a => {
    const i = nombres.indexOf(a);
    if (i >= 0) chk(iAdmin < i, 'y antes que ' + a + ' (que Stock no usa)',
      'admin ' + iAdmin + ' vs ' + a + ' ' + i);
  });

  console.log('\n' + ok + ' ok - ' + mal + ' mal');
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('REVENTO:', e); process.exit(2); });
