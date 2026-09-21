/* EERR: en que renglon cae cada gasto (21/9/2026).

   Tadeo escaneo el EERR y encontro renglones mal. Se reviso la regla contra los
   316 asientos reales de Egresos y cambiaron 13 ($973.929). Este test fija cada
   caso con un concepto como el que esta cargado en la planilla —sin nombres de
   personas: este repo es publico—.

   Lo que MAS importa probar es lo que NO se tiene que mover: la regla es una
   cadena de `if` con palabras clave, y agregar una arriba puede robarle asientos
   a otra de abajo sin que nadie lo note. Por eso la mitad de los casos son
   gastos que ya estaban bien y tienen que seguir igual.

   Sin backend, con ?prueba=1. Llama a la `_gastoLinea` REAL del ERP.

   node probar_eerr_clasificacion.js
*/
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 260) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(c, e)) return true; } catch (x) {} await pausa(300); } return false; };

/* [nombre del caso, categoria, concepto, notas, tipo esperado, linea esperada] */
const CASOS = [
  // ── Lo que se CORRIGIO el 21/9 ──
  ['la suscripcion mensual de WATI es FIJA',            'Herramienta', 'WATI · Mensual', '',  'estructura', 'software_com'],
  ['"WATI" a secas es la suscripcion: fija',            'Herramienta', 'WATI', '',            'estructura', 'software_com'],
  ['los CREDITOS de WATI siguen variables',             'Herramienta', 'WATI · Créditos', '', 'variable', 'campanas'],
  ['una recarga de WATI es credito: variable',          'Herramienta', 'WATI · Recarga', '',  'variable', 'campanas'],
  ['Imprenta/Diseño ya no cae en "otros": folletos',    'Imprenta/Diseño', '100 Folletos Flyer', '', 'variable', 'campanas'],
  ['Imprenta/Diseño: stickers impresos',                'Imprenta/Diseño', 'Imprenta · 30 planchas de Stickers', '', 'variable', 'campanas'],
  ['el manual de marca es extraordinario',              'Marketing', 'Diseñadora - Manual de Marca', '', 'extra', 'extra'],
  ['el diseño de una pieza es extraordinario',          'Marketing', 'Diseñadora · Diseño Folletos', '', 'extra', 'extra'],
  ['"Saque $X" es ajuste de caja, no gasto',            'Otro', 'Saque $20 pesos', '',       'fuera', 'ajuste'],
  ['un gasto ficticio para acomodar la caja: fuera',    'Otro', 'Gasto ficticio para acomodar caja', '', 'fuera', 'ajuste'],

  // ── Lo que NO se tenia que mover ──
  ['la IMPRESION de marketing sigue en campañas',       'Marketing', 'Imprenta · Stickers Maleu', '', 'variable', 'campanas'],
  ['la pauta sigue en campañas',                        'Marketing', 'Pauta Publicitaria', '', 'variable', 'campanas'],
  ['Canva con "diseño" NO se vuelve extraordinario',    'Herramienta', 'Canva', 'diseño de posteos', 'estructura', 'software'],
  ['Claude sigue en Apps/IA',                           'Herramienta', 'Claude', '',          'estructura', 'software_com'],
  ['N8N sigue en herramientas',                         'Herramienta', 'N8N', '',             'estructura', 'software'],
  ['un proveedor sigue en el costo',                    'Proveedor', 'Carne', '',             'cmv', 'proveedor'],
  ['un vuelto sigue fuera',                             'Cambio cruzado', 'Cambio cruzado', '(Home #901)', 'fuera', 'vuelto'],
  ['un giro de sueldo sigue en sueldo',                 'Sueldo', 'Titular', '',              'estructura', 'sueldo'],
  ['la nafta sigue en vehiculo',                        'Nafta', 'Shell', '',                 'estructura', 'vehiculo'],
  ['una perdida sigue siendo extraordinaria',           'Otro', 'Mercadería perdida', '',     'extra', 'perdida'],
  ['el delivery sigue variable',                        'Repartidor', 'Reparto', '',          'variable', 'delivery'],
  ['el monotributo sigue en impuestos',                 'Impuesto', 'Monotributo', '',        'impuesto', 'mono'],
];

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, "typeof _gastoLinea==='function' && typeof _eerrMesGastos==='function'")) { console.log('  el ERP no arranco'); process.exit(1); }
    console.log('\n== EERR: en que renglon cae cada gasto ==\n');

    const res = await evaluar(cli, `(function(){
      var C = ${JSON.stringify(CASOS)};
      return C.map(function(c){ var r = _gastoLinea({cat:c[1], con:c[2], not:c[3]}); return {tipo:r.tipo, linea:r.linea}; });
    })()`);
    CASOS.forEach((c, i) => {
      const r = res[i] || {};
      chk(c[0], r.tipo === c[4] && r.linea === c[5], { esperado: c[4] + '/' + c[5], salio: r.tipo + '/' + r.linea });
    });

    /* ── Que un ajuste no sume en NINGUNA pantalla ──
       La regla dice "fuera", pero son cuatro las que la usan y cada una arma sus
       bloques a mano. Si una no conoce 'ajuste', lo manda al default —"otros" de
       estructura— y el ajuste vuelve a aparecer como gasto por la puerta de atras. */
    const bloques = await evaluar(cli, `(function(){
      D = D || {};
      D.provisiones = []; D.config = [];
      D.gastos = [
        {mes:'Mayo', f:'10/5/2026', cat:'Otro', con:'Saque $20 pesos', not:'', $:20},
        {mes:'Mayo', f:'11/5/2026', cat:'Otro', con:'Gasto ficticio para acomodar caja', not:'', $:5000},
        {mes:'Mayo', f:'12/5/2026', cat:'Herramienta', con:'N8N', not:'', $:30000}
      ];
      var G = _eerrMesGastos(5, 2026);
      return { estr: G.estr, otros: G.L.otros || 0, software: G.L.software || 0 };
    })()`);
    chk('los ajustes de caja no suman a la estructura (solo cuenta el N8N)',
      bloques && bloques.software === 30000 && bloques.otros === 0, bloques);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
