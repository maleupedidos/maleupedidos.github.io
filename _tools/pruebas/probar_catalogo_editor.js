/* Qué productos ofrece "Editar productos" de un pedido (17/9/2026).

   node probar_catalogo_editor.js
   APP=app_viejo_tmp.html node probar_catalogo_editor.js   ← la contraria

   Tadeo: "necesito que aparezcan todos los productos... no me aparece para
   poder agregar al pedido por ejemplo los sorrentinos espinaca, brie,
   langostino, pollo". Y era literal: la lista estaba escrita a mano en el
   código y `Home` no tenía esos cuatro, mientras que Pilar y Red sí.

   Sostiene:
   · lo que se puede agregar sale de la hoja Productos (`D.stock`), no de una
     lista escrita a mano — o sea que un producto nuevo aparece solo;
   · los cuatro sorrentinos que faltaban están, en Home y en Pilar;
   · lo que se vende por KILO no entra (este editor cuenta unidades, y una
     pieza no es un kilo: la carne va por su pesaje);
   · Clubes conserva su surtido acotado, porque tiene precios propios;
   · sin volcado no queda un desplegable vacío: cae a la lista de antes.

   Se prueba la DECISIÓN (`_catalogoDe`) y no el HTML: abrir un pedido real pide
   media tab de Pedidos con datos, y lo que falla acá es qué entra en la lista. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 300) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(200); }
  return false;
};

/* La hoja Productos como la manda el backend: `u` es la unidad y `pz` dice si
   el corte se lleva por piezas. Nombres inventados salvo las abreviaturas, que
   son las de verdad y son lo que se mide. */
const STOCK = [
  { a: 'PMu', n: 'Pizza Muzzarella', p: 11200, co: 6200, u: 'u' },
  { a: 'SQB', n: 'Sorrentinos Queso Brie', p: 22100, co: 17100, u: 'u' },
  { a: 'SL', n: 'Sorrentinos Langostinos', p: 22100, co: 17100, u: 'u' },
  { a: 'SPyP', n: 'Sorrentinos Pollo y Puerro', p: 18300, co: 13300, u: 'u' },
  { a: 'SE', n: 'Sorrentinos Espinaca', p: 17000, co: 12000, u: 'u' },
  { a: 'TG', n: 'Torta Golosa', p: 20000, co: 12000, u: 'u' },
  { a: 'PROD_NUEVO', n: 'Producto Nacido Hoy', p: 9999, co: 5000, u: 'u' },
  { a: 'CVa', n: 'Carne Vacio', p: 26000, co: 20000, u: 'kg', pz: 1 },
  { a: 'CLo', n: 'Carne Lomo', p: 26000, co: 20000, u: 'kg', pz: 1 }
];
const FALTABAN = ['SQB', 'SL', 'SPyP', 'SE'];

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') });
    console.log('\n== Catálogo del editor de un pedido · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    if (!await esperar(cli, `typeof _catalogoDe==='function'`, 5000)) {
      console.log('  no existe _catalogoDe: esta version decide la lista con el catalogo escrito a mano');
      chk('la lista sale de la hoja Productos (_catalogoDe)', false, 'no existe');
      console.log('\n' + ok + ' ok, ' + mal + ' mal'); salir(1);
    }
    await evaluar(cli, `window.D=window.D||{}; D.stock=${JSON.stringify(STOCK)}; 1`);

    const home = await evaluar(cli, `_catalogoDe('Home')`);
    const pilar = await evaluar(cli, `_catalogoDe('Pilar')`);
    const clubes = await evaluar(cli, `_catalogoDe('Clubes')`);

    chk('en Home están los cuatro sorrentinos que faltaban',
      FALTABAN.every(a => home.indexOf(a) > -1), { home });
    chk('en Pilar también', FALTABAN.every(a => pilar.indexOf(a) > -1), { pilar });
    chk('un producto nuevo de la hoja aparece solo (sin tocar código)',
      home.indexOf('PROD_NUEVO') > -1, { home });
    chk('lo que se vende por kilo NO entra (se agrega por su pesaje)',
      home.indexOf('CVa') < 0 && home.indexOf('CLo') < 0, { home });
    chk('Clubes conserva su surtido acotado (tiene precios propios)',
      clubes.indexOf('SQB') < 0 && clubes.indexOf('PMu') > -1, { clubes });

    /* Sin volcado: el desplegable no puede quedar vacío. */
    await evaluar(cli, `D.stock=[]; 1`);
    const sinD = await evaluar(cli, `_catalogoDe('Home')`);
    chk('sin volcado cae a la lista de antes, no a una vacía', sinD.length > 10, { n: sinD.length });

    /* Y que el editor USE esta decisión, no la lista escrita a mano. */
    const usa = await evaluar(cli, `String(renderEditor).indexOf('_catalogoDe')>-1`);
    chk('el editor arma el desplegable con _catalogoDe', usa === true);

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
