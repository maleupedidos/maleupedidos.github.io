/* Ruta > ARMADO: un cliente con el lote tipeado distinto es UNA parada.

     node probar_agrupar_parada.js
     APP=app_viejo_tmp.html node probar_agrupar_parada.js   ← la contraria

   Tadeo, 19/9/2026: en ARMADO el mismo cliente aparecía dos veces, una bajo
   "Lote Refugio 4D" y otra bajo "Lote Refugios 4D". *"son la misma persona...
   ¿por qué no lo reconoce y no lo junta?"*

   Verificado contra producción ese día: mismo nombre, **mismo teléfono**, mismo
   día, mismo barrio y sub-barrio. Lo único distinto era esa "s".

   Por qué alcanzaba una letra: `_lugares` compara la dirección como texto crudo.
   Con dos direcciones distintas marca `varios:true`, y entonces `_claveCombo`
   le agrega el lote a la clave del combo → dos paradas.

   Sostiene:
   · el plural no parte al cliente (ni con teléfono ni sin él);
   · los acentos y la puntuación tampoco;
   · pero un lote REALMENTE distinto sí sigue separando —si no, juntaríamos dos
     casas de verdad—, y un número distinto también ("Refugio 4" ≠ "Refugio 40").

   Nombres inventados: este repo es público. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

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
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(250); }
  return false;
};

/* Cuántas paradas quedan al agrupar esta lista. */
const CUANTAS = `function(ps){
  var r = _agruparPedidos(ps);
  return { paradas: r.length, combos: r.filter(function(x){return x && x._combo;}).length };
}`;

/* `r` (la fila de la planilla) es OBLIGATORIO en el fixture: `eKey()` la usa
   para identificar al pedido, y sin ella dos pedidos distintos comparten clave
   dentro de `_lugares`. La primera versión de este test no la ponía y los dos
   casos de "no juntes casas distintas" daban falso rojo: parecía que el ERP
   fusionaba de más cuando el que fusionaba era el fixture. */
let _fila = 100;
const ped = (o) => Object.assign({
  id: 'p' + (++_fila), r: _fila, h: 'Home', c: 'Cliente Prueba', t: '1150000001',
  b: 'Barrio Uno', sb: 'Barrio Uno', l: 'Lote 1', fe: '2026-09-19', de: 'Sábado',
  es: 'Reservado', $: 10000, p: [{ a: 'X', q: 1 }]
}, o);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    console.log('\n== Ruta > ARMADO: una parada por cliente · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof abrirRuta==='function'||typeof go==='function'`, 60000)) {
      console.log('  el ERP no arranco'); salir(1);
    }
    /* Ruta se compila adentro pero arranca la primera vez que se abre su tab. */
    await evaluar(cli, `try{go('ruta')}catch(e){}; 1`);
    if (!await esperar(cli, `typeof _agruparPedidos==='function'`, 30000)) {
      console.log('  _agruparPedidos no quedo disponible (¿arranco Ruta?)'); salir(1);
    }
    await pausa(400);
    const contar = async (ps) => evaluar(cli, `(${CUANTAS})(${JSON.stringify(ps)})`);

    /* 1) EL CASO DE TADEO: misma persona, mismo tel, el lote con una "s". */
    const caso = [
      ped({ l: 'Refugio 4D', $: 177523 }),
      ped({ l: 'Refugios 4D', $: 88450 })
    ];
    const r1 = await contar(caso);
    chk('el plural del lote NO parte al cliente: 1 parada', r1.paradas === 1, r1);
    chk('   y queda como combo de los dos pedidos', r1.combos === 1, r1);

    /* 2) Lo mismo SIN telefono (ahi la clave se arma con nombre+lote). */
    const sinTel = [
      ped({ t: '', l: 'Refugio 4D' }),
      ped({ t: '', l: 'Refugios 4D' })
    ];
    const r2 = await contar(sinTel);
    chk('sin telefono tampoco lo parte', r2.paradas === 1, r2);

    /* 3) Acentos y puntuacion. */
    const acentos = [
      ped({ sb: 'Estancias del Río', l: 'Refugio 4-D' }),
      ped({ sb: 'Estancias del Rio', l: 'Refugio 4 D' })
    ];
    const r3 = await contar(acentos);
    chk('los acentos y los guiones tampoco', r3.paradas === 1, r3);

    /* 4) PERO dos casas de verdad siguen separadas. */
    const distintos = [
      ped({ l: 'Refugio 4D' }),
      ped({ l: 'Golf 238' })
    ];
    const r4 = await contar(distintos);
    chk('dos lotes distintos de verdad SIGUEN siendo 2 paradas', r4.paradas === 2, r4);

    /* 5) Y un numero distinto no se colapsa: "4" no es "40". */
    const numeros = [
      ped({ l: 'Refugio 4' }),
      ped({ l: 'Refugio 40' })
    ];
    const r5 = await contar(numeros);
    chk('"Refugio 4" y "Refugio 40" NO se juntan', r5.paradas === 2, r5);

    /* 6) Y clientes distintos nunca se juntan, aunque compartan lote. */
    const otros = [
      ped({ c: 'Persona Una', t: '1150000001', l: 'Refugio 4D' }),
      ped({ c: 'Persona Dos', t: '1150000002', l: 'Refugios 4D' })
    ];
    const r6 = await contar(otros);
    chk('dos personas distintas en el mismo lote siguen separadas', r6.paradas === 2, r6);

    /* 7) Y dias distintos tampoco se mezclan. */
    const dias = [
      ped({ l: 'Refugio 4D', fe: '2026-09-19' }),
      ped({ l: 'Refugios 4D', fe: '2026-09-20' })
    ];
    const r7 = await contar(dias);
    chk('dos dias distintos siguen separados', r7.paradas === 2, r7);

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
