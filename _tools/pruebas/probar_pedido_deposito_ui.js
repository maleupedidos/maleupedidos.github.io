/* LA FICHA DEL PEDIDO DICE DE QUE FREEZER SALE. (28/9/2026)

     node probar_pedido_deposito_ui.js
     APP=app_viejo_tmp.html node probar_pedido_deposito_ui.js   <- la contraria

   Tadeo: *"es importante actualizar la tab pedidos porque ahora hay dos tipos
   de deposito y para cada pedido dice deposito y orden de compra, pero ahora
   hay dos depositos"*.

   El backend guarda el deposito en la fila desde el 27/9 y NINGUNA pantalla lo
   leia. Lo que tiene que ser cierto:

     · la ficha dice de que freezer sale, con el nombre de la hoja Depositos;
     · un pedido sin elegir lo dice como lo que es —"el default de cada
       producto"— y no como una falta;
     · se puede cambiar mientras no se entrego;
     · ya entregado NO se ofrece, y explica por que (la mercaderia ya salio:
       cambiar la etiqueta haria que la devolucion entre al otro freezer);
     · en RED la salida es "Entregado a Vendedor", no el estado del pedido;
     · un pedido que va entero a OC no lo muestra: no toca el freezer;
     · con UN solo deposito la pantalla queda como estaba;
     · y el POST manda hoja, fila y deposito.

   Los nombres son inventados a proposito: este repo es publico. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 320) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};
/* Con guarda: contra el ERP anterior `_pedDepHTML` no existe y el test tiene
   que dar ROJO, no explotar en la primera linea. */
const pintar = (cli, p, homeOnly) =>
  evaluar(cli, `(function(){try{return _pedDepHTML(${JSON.stringify(p)},${homeOnly ? 'true' : 'false'});}catch(e){return null;}})()`);

const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz' }, { id: 'moresco', nombre: 'Deposito Moresco' }];

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    console.log('\n== La ficha del pedido y los dos freezers · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof rPedidos==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(700);
    await evaluar(cli, `window.D=window.D||{}; D.stockDeps=${JSON.stringify(DEPS)}; 1`);

    /* ── 1. Un pedido con freezer elegido ── */
    const h1 = await pintar(cli, { h: 'Home', n: '900', r: 120, o: 'Deposito', es: 'Pendiente', dep: 'moresco' });
    chk('dibuja el bloque del freezer', typeof h1 === 'string' && h1.indexOf('ped-dep') >= 0, h1 && h1.slice(0, 120));
    chk('   con el nombre de la hoja, sin el "Depósito " de adelante',
        !!h1 && h1.indexOf('>Moresco<') >= 0, h1 && h1.slice(0, 300));
    chk('   y marca cuál está elegido', !!h1 && /ped-dep-x on[^>]*>Moresco/.test(h1.replace(/"/g, '')), h1);
    chk('   ofrece los dos freezers', !!h1 && h1.indexOf('Ustariz') >= 0 && h1.indexOf('Moresco') >= 0, h1);
    chk('   y la opción de volver al default', !!h1 && h1.indexOf('Por defecto') >= 0, h1);
    chk('el POST lleva hoja, fila y depósito',
        !!h1 && h1.indexOf("pedDep('Home',120,'ustariz')") >= 0, h1);

    /* ── 2. Sin elegir: no es una falta ── */
    const h2 = await pintar(cli, { h: 'Home', n: '901', r: 121, o: 'Deposito', es: 'Pendiente', dep: '' });
    chk('sin elegir, dice qué significa en vez de marcarlo como falta',
        !!h2 && h2.indexOf('Sin elegir') >= 0 && h2.indexOf('por defecto de cada producto') >= 0, h2 && h2.slice(0, 300));
    chk('   y "Por defecto" queda marcado', !!h2 && /ped-dep-x on[^>]*>Por defecto/.test(h2.replace(/"/g, '')), h2);

    /* ── 3. Ya entregado: no se toca ── */
    const h3 = await pintar(cli, { h: 'Home', n: '902', r: 122, o: 'Deposito', es: 'Entregado', dep: 'ustariz' });
    chk('entregado: sigue diciendo de dónde salió', !!h3 && h3.indexOf('Ustariz') >= 0, h3 && h3.slice(0, 200));
    chk('   pero NO ofrece cambiarlo', !!h3 && h3.indexOf('pedDep(') < 0, h3);
    chk('   y explica por qué, con la salida (el traspaso)',
        !!h3 && h3.indexOf('traspaso') >= 0, h3 && h3.slice(-220));

    /* ── 4. RED: la salida es la bolsa al vendedor ──
       Su "Estado de Entrega" es la entrega DEL VENDEDOR a su cliente y puede
       tardar dias; del freezer de Maleu sale cuando se le da la bolsa. */
    const h4 = await pintar(cli, { h: 'Red', n: '50', r: 60, o: 'Deposito', es: 'Pendiente', ev: 'Entregado', dep: 'ustariz' });
    chk('en Red, entregada la bolsa al vendedor, ya no se cambia',
        !!h4 && h4.indexOf('pedDep(') < 0, h4 && h4.slice(0, 200));
    const h5 = await pintar(cli, { h: 'Red', n: '51', r: 61, o: 'Deposito', es: 'Pendiente', ev: '', dep: 'ustariz' });
    chk('   y si todavía está en el freezer, sí', !!h5 && h5.indexOf('pedDep(') >= 0, h5 && h5.slice(0, 200));

    /* ── 5. Lo que NO toca el freezer ── */
    const h6 = await pintar(cli, { h: 'Home', n: '903', r: 123, o: 'Orden de Compra', es: 'Pendiente', dep: '' });
    chk('un pedido que va entero a OC no lo muestra', h6 === '', { h: h6 });
    const h7 = await pintar(cli, { h: 'Home', n: '904', r: 124, o: 'Pendiente', es: 'Pendiente', dep: '' });
    chk('   pero con el origen sin decidir SÍ: es el momento de elegirlo',
        !!h7 && h7.indexOf('ped-dep') >= 0, { h: h7 });

    /* ── 6. Con un solo freezer, la pantalla de antes ── */
    await evaluar(cli, `D.stockDeps=[{id:'ustariz',nombre:'Deposito Ustariz'}]; 1`);
    const h8 = await pintar(cli, { h: 'Home', n: '905', r: 125, o: 'Deposito', es: 'Pendiente', dep: '' });
    chk('con UN solo depósito no pregunta nada', h8 === '', { h: h8 });
    await evaluar(cli, `D.stockDeps=${JSON.stringify(DEPS)}; 1`);

    /* ── 7. El repartidor no decide de qué freezer sale ── */
    const h9 = await pintar(cli, { h: 'Home', n: '906', r: 126, o: 'Deposito', es: 'Pendiente', dep: '' }, true);
    chk('el repartidor no lo ve: no es su decisión', h9 === '', { h: h9 });

    /* ── 8. Supabase: el campo llega del atajo ── */
    const sb = await evaluar(cli, `(function(){try{
      return _sbAPedido({channel:'Home',order_number:'907',warehouse:'MORESCO ',customer_name:'X'}).dep;
    }catch(e){return null;}})()`);
    chk('el atajo de Supabase trae el freezer, normalizado', sb === 'moresco', { dep: sb });
    const sbv = await evaluar(cli, `(function(){try{
      return _sbAPedido({channel:'Home',order_number:'908',customer_name:'X'}).dep;
    }catch(e){return null;}})()`);
    chk('   y sin la columna (migración sin aplicar) queda vacío, no undefined', sbv === '', { dep: sbv });

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
