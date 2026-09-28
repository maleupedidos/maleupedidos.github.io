/* Una foto de la tabla de Productos con las columnas por freezer. (28/9/2026)
 *
 *   node _tools/servir.js                    (en otra terminal)
 *   node _tools/pruebas/ver_cols_freezer.js [390|1440] [salida.png]
 *
 * Es para MIRAR, no para medir: lo que sostiene el cambio son los chequeos de
 * `probar_stock_productos.js`. Por eso no reusa aquel stub —copiarlo por texto
 * salia fragil— sino que arma el `D` minimo y llama a `rStock()` directo.
 *
 * Los datos son inventados: este repo es publico.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const SALIDA = process.argv[3] || path.join(process.env.TEMP || '.', 'stock_freezer_' + ANCHO + '.png');

const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const P = (n, a, i, c, v, f, r, u, pd) => ({ n, a, i, c, v, f, r,
  d: Math.round((f - r) * 1000) / 1000, u: u || 'u', p: 1000, co: 500,
  iv: Math.max(0, f) * 500, pd, pz: u === 'kg' ? 1 : 0 });

const D = {
  ts: Date.now(), pedidos: [], canales: [], totales: {}, oc: { lista: [] }, caja: { cuentas: [] },
  stockDeps: [{ id: 'ustariz', nombre: 'Deposito Ustariz' }, { id: 'moresco', nombre: 'Deposito Moresco' }],
  stockCierre: new Date().toISOString(),
  stock: [
    P('Pizza Muzzarella', 'PMu', 9, 0, 0, 9, 0, 'u', { ustariz: 3, moresco: 6 }),
    P('Pizza Margarita', 'PMa', 17, 0, 0, 17, 0, 'u', { ustariz: 7, moresco: 10 }),
    P('Pack Muzzarella x2', 'PPM', 10, 0, 0, 10, 0, 'u', { ustariz: 0, moresco: 10 }),
    P('Sorrentinos Cordero al Malbec', 'SCo', 16, 0, 0, 16, 0, 'u', { ustariz: 16, moresco: 0 }),
    P('Carne Lomo', 'CLo', 12.027, 0, 0, 12.027, 0, 'kg', { ustariz: 12.027, moresco: 0 })
  ]
};

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride',
      { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 2, mobile: ANCHO <= 560 });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && typeof rStock==='function'`))
      throw new Error('el ERP no arranco');
    await evaluar(cli, `go('stock'); 1`);
    await pausa(500);
    await evaluar(cli, `window.D=${JSON.stringify(D)}; try{ stSwitchTab('productos'); }catch(e){} rStock(); 1`);
    if (!await esperar(cli, `document.querySelectorAll('#sList .si').length===${D.stock.length}`, 20000))
      throw new Error('la tabla no pinto');
    await pausa(600);
    const { data } = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(SALIDA, Buffer.from(data, 'base64'));
    console.log('foto: ' + SALIDA);
    console.log('cab:  ' + await evaluar(cli,
      `[].map.call(document.querySelectorAll('#sList .st-cab > div'),function(c){var s=c.querySelector('.st-lg');return (s||c).textContent.trim();}).join(' | ')`));
    cli.matar(); process.exit(0);
  } catch (e) {
    console.log('revento: ' + (e && e.stack || e));
    try { cli.matar(); } catch (x) {}
    process.exit(1);
  }
})();
