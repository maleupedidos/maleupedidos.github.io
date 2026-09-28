/* EL EDITOR DE PEDIDOS Y LOS DOS FREEZERS. (27/9/2026)
 *
 *   node _tools/servir.js          (en otra terminal)
 *   node probar_editor_depositos.js
 *   APP=app_viejo_tmp.html node probar_editor_depositos.js   <- la contraria
 *
 * Tadeo quiere empezar a operar los dos depositos. Escaneando la tab Productos
 * aparecio que el problema mas grave no esta en la tabla: esta **cargando el
 * pedido**.
 *
 * `_stockDisponible(abbr)` devuelve `D.stock[].d`, que es **la suma de los dos
 * freezers**, y el editor lo usa de tope. Medido ese dia contra produccion:
 *
 *     Pack Muzzarella x2            el editor deja cargar 10  ->  Tadeo tiene 0
 *     Empanadas Carne a Cuchillo    deja cargar 15            ->  Tadeo tiene 3
 *
 * O sea que el ERP deja prometerle a un cliente mercaderia que esta en otra
 * casa, sin decir nada.
 *
 * **El tope NO se baja, y eso tambien se prueba acá.** Tadeo PUEDE vender algo
 * que esta en lo de Lucas: va, lo busca y lo entrega. Bloquearlo le romperia
 * una venta real. Lo que se arregla es que no se entere.
 *
 * Se prueban las DECISIONES (`_stockPropio`, `_stockEnOtro`, `_stockOtroNom`,
 * `_stockDisponible`), no el HTML: abrir un pedido de verdad pide media tab de
 * Pedidos con datos, y lo que falla aca es la cuenta.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';

let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

/* Los tres casos que importan, con los numeros REALES del 27/9/2026. */
const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz' },
              { id: 'moresco', nombre: 'Deposito Moresco' }];
const STOCK = [
  /* repartido: 3 tuyos, 6 en la otra casa */
  { a: 'PMu', n: 'Pizza Muzzarella', u: 'u', f: 9, r: 0, d: 9, pd: { ustariz: 3, moresco: 6 } },
  /* entero en la otra casa: el que mas engania */
  { a: 'PPM', n: 'Pack Muzzarella x2', u: 'u', f: 10, r: 0, d: 10, pd: { ustariz: 0, moresco: 10 } },
  /* todo tuyo: tiene que comportarse como siempre */
  { a: 'SCo', n: 'Sorrentinos Calabresa', u: 'u', f: 16, r: 0, d: 16, pd: { ustariz: 16, moresco: 0 } },
  /* reservado: lo propio no puede dar negativo */
  { a: 'EJyQ', n: 'Empanadas JyQ', u: 'u', f: 4, r: 3, d: 1, pd: { ustariz: 0, moresco: 4 } }
];

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((m, p) => {
    if (m === 'Runtime.exceptionThrown')
      errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'exc');
  });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };

  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof _stockDisponible==='function' && typeof _stockPropio==='function'`, 60000)) {
      console.log('  el ERP no arranco (o falta _stockPropio)'); salir(1);
    }
    await evaluar(cli, `window.D=window.D||{}; D.stock=${JSON.stringify(STOCK)}; D.stockDeps=${JSON.stringify(DEPS)}; 1`);

    console.log('\n== El editor de pedidos con dos freezers ==\n');

    /* 1. La cuenta. */
    const v = await evaluar(cli, `({
      dispPMu: _stockDisponible('PMu'), propPMu: _stockPropio('PMu'), otroPMu: _stockEnOtro('PMu'),
      dispPPM: _stockDisponible('PPM'), propPPM: _stockPropio('PPM'), otroPPM: _stockEnOtro('PPM'),
      dispSCo: _stockDisponible('SCo'), propSCo: _stockPropio('SCo'), otroSCo: _stockEnOtro('SCo'),
      propEJ: _stockPropio('EJyQ'), otroEJ: _stockEnOtro('EJyQ'),
      nom: _stockOtroNom()
    })`);
    chk('repartido: 9 en total, 3 tuyos, 6 en la otra casa',
        v.dispPMu === 9 && v.propPMu === 3 && v.otroPMu === 6, v);
    chk('el que engania: 10 en total y CERO tuyos',
        v.dispPPM === 10 && v.propPPM === 0 && v.otroPPM === 10, v);
    chk('lo que esta todo en tu freezer no cambia',
        v.dispSCo === 16 && v.propSCo === 16 && v.otroSCo === 0, v);
    chk('con mas reservado que stock propio, lo tuyo da 0 y no negativo',
        v.propEJ === 0 && v.otroEJ === 4, v);
    chk('y el aviso nombra al freezer, no dice "el otro"', v.nom === 'Moresco', v.nom);

    /* 2. EL TOPE NO BAJA. Es la mitad del disenio: Tadeo puede ir a buscarla. */
    chk('el tope sigue siendo el total: se puede vender lo que esta en la otra casa',
        v.dispPMu === 9 && v.dispPPM === 10, v);

    /* 3. Sin el segundo deposito, todo se comporta como antes. */
    await evaluar(cli, `D.stockDeps=[{id:'ustariz',nombre:'Deposito Ustariz'}]; 1`);
    const u = await evaluar(cli, `({ disp:_stockDisponible('PMu'), prop:_stockPropio('PMu'), otro:_stockEnOtro('PMu') })`);
    chk('con UN solo deposito, lo propio es todo el disponible',
        u.disp === 9 && u.prop === 9 && u.otro === 0, u);

    /* 4. Y sin reparto en el volcado (un backend viejo) tampoco revienta. */
    await evaluar(cli, `D.stockDeps=${JSON.stringify(DEPS)}; D.stock=D.stock.map(function(s){var x=Object.assign({},s); delete x.pd; return x;}); 1`);
    const sp = await evaluar(cli, `({ disp:_stockDisponible('PMu'), prop:_stockPropio('PMu'), otro:_stockEnOtro('PMu') })`);
    chk('sin reparto por deposito, lo propio cae al disponible entero',
        sp.disp === 9 && sp.prop === 9 && sp.otro === 0, sp);

    /* 5. Un producto que no existe no rompe nada. */
    const nx = await evaluar(cli, `({ d:_stockDisponible('NOEXISTE'), p:_stockPropio('NOEXISTE'), o:_stockEnOtro('NOEXISTE') })`);
    chk('un abbr desconocido da 0 en las tres', nx.d === 0 && nx.p === 0 && nx.o === 0, nx);

    const propios = errores.filter(e => !/favicon|manifest/i.test(String(e)));
    chk('ni un error en la consola', propios.length === 0, propios.slice(0, 3));

    console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.log('  revento la prueba: ' + e);
    salir(1);
  }
})();
