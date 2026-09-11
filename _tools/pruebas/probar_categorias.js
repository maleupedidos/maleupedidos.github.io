/* Saca _catPorAbbr_ / _prodCategoria / _prodSubcat del Code.js REAL y las corre
   con la hoja Proveedores simulada. No reimplementa nada: si el archivo cambia,
   este test corre el codigo nuevo.

   node probar_categorias.js            -> el codigo de ahora
   node probar_categorias.js --viejo    -> reinyecta el mapa de prefijos     */
'use strict';
const fs = require('fs');
const vm = require('vm');

const SRC = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/estancias/.clasp-src/Code.js';
const src = fs.readFileSync(SRC, 'utf8');
const viejo = process.argv.indexOf('--viejo') >= 0;

/* Las 4 piezas, cortadas por sus anclas. Si alguna no matchea, el test corta:
   un test que se saltea una funcion da verde sin haber mirado nada. */
function saca(desde, hasta) {
  const i = src.indexOf(desde);
  if (i < 0) { console.error('NO ENCONTRE: ' + desde.slice(0, 60)); process.exit(2); }
  const j = src.indexOf(hasta, i);
  if (j < 0) { console.error('NO ENCONTRE EL CIERRE de: ' + desde.slice(0, 60)); process.exit(2); }
  return src.slice(i, j + hasta.length);
}
const fnCat  = saca('function _catPorAbbr_() {', '\n}');
const fnNorm = saca('var PROD_CAT_NORM = {', '\n};');
const fnPCat = saca('function _prodCategoria(abrev, catMap) {', '\n}');
const fnSub  = saca('function _prodSubcat(abrev, catMap) {', '\n}');

/* La hoja Proveedores como esta de verdad (10/9/2026): col B el producto base,
   col E la abreviatura, y la col B VACIA cuando la fila hereda de la de arriba
   -asi se ve en la planilla, con las celdas combinadas-. */
const PROV = [
  ['prov', 'producto', 'proveedor', 'gusto', 'abrev'],
  ['', 'Pack Pizzas x2',      'Sevuchitas',        'Muzzarella',      'PPM'],
  ['', '',                    '',                  'Jamon y Queso',   'PPJyQ'],
  ['', '',                    '',                  'Cebolla y Queso', 'PPCyQ'],
  ['', 'Empanadas',           '',                  'Carne',           'ECaC'],
  ['', '',                    '',                  'Jamon y Queso',   'EJyQ'],
  ['', '',                    '',                  'Cebolla',         'ECyQ'],
  ['', '',                    '',                  'Verdura',         'EV'],
  ['', 'Sorrentinos',         'Le Unike',          'Queso Brie',      'SQB'],
  ['', '',                    '',                  'Langostinos',     'SL'],
  ['', '',                    '',                  'Cordero',         'SCo'],
  ['', '',                    '',                  'Pollo y Puerro',  'SPyP'],
  ['', '',                    '',                  'Jamon y Queso',   'SJyQ'],
  ['', '',                    '',                  'Espinaca',        'SE'],
  ['', '',                    '',                  'Calabaza',        'SCa'],
  ['', 'Tortas',              'Cuverry',           'Golosa',          'TG'],
  ['', '',                    '',                  'Lemon Crumble',   'TLC'],
  ['', '',                    '',                  'Coco',            'TC'],
  ['', 'Franuis',             'Claudia Benedetti', 'Leche',           'F'],
  ['', 'Pizzas Individuales', 'Bernardo Pisano',   'Muzzarella',      'PMu'],
  ['', '',                    '',                  'Margarita',       'PMa'],
  ['', '',                    '',                  'Jamon y Queso',   'PJyQ'],
  ['', '',                    '',                  'Cebolla Caram.',  'PCC'],
  ['', '',                    '',                  'Jamon y Morron',  'PJyM'],
  ['', 'Tartas',              'Claudia Polito',    'Pollo',           'TP'],
  ['', '',                    '',                  'Jamon y Queso',   'TJyQ'],
  ['', '',                    '',                  'Calabaza',        'TCa'],
  ['', '',                    '',                  'Verdura',         'TV'],
  ['', 'Wraps',               '',                  'Carne',           'RC'],
  ['', '',                    '',                  'Pollo',           'RP'],
  ['', 'Carnes',              'Caco',              'Colita',          'CCo'],
  ['', '',                    '',                  'Entrana',         'CEn'],
  ['', '',                    '',                  'Lomo',            'CLo'],
  ['', '',                    '',                  'Picana',          'CPi'],
  ['', '',                    '',                  'Vacio',           'CVa']
];

function hoja(filas) {
  return {
    getLastRow: () => filas.length,
    getDataRange: () => ({ getValues: () => filas })
  };
}

function armar(filasProv) {
  const cache = {};
  const ctx = {
    console,
    JSON,
    String, Number, Object, Math, Date,
    CacheService: {
      getScriptCache: () => ({
        get: k => (k in cache ? cache[k] : null),
        put: (k, v) => { cache[k] = v; }
      })
    },
    SS: {
      getSheetByName: n => (n === 'Proveedores' && filasProv ? hoja(filasProv) : null)
    }
  };
  let code = fnCat + '\n' + fnNorm + '\n' + fnPCat + '\n' + fnSub + '\n';
  if (viejo) {
    /* La direccion contraria: el mapa de prefijos de antes del 10/9/2026, que
       manda Carnes y Wraps a "Otro". Si el test pasa con esto puesto, no prueba
       nada. */
    code += `
      _prodCategoria = function(abrev){
        if (!abrev) return 'Otro';
        var a = String(abrev).trim();
        if (a.indexOf('PP') === 0) return 'Pizzas';
        if (a.indexOf('P') === 0 && a !== 'PP') return 'Pizzas';
        if (a.indexOf('S') === 0) return 'Sorrentinos';
        if (a.indexOf('E') === 0) return 'Empanadas';
        if (a === 'TG' || a === 'TLC' || a === 'TC') return 'Tortas';
        if (a === 'TP' || a === 'TJyQ' || a === 'TCa' || a === 'TV') return 'Tartas';
        if (a === 'F') return 'Postres';
        return 'Otro';
      };`;
  }
  code += '\n;({cat:_catPorAbbr_, pc:_prodCategoria, sub:_prodSubcat})';
  return vm.runInNewContext(code, ctx);
}

let ok = 0, mal = 0;
function chk(nom, got, esp) {
  const g = JSON.stringify(got), e = JSON.stringify(esp);
  if (g === e) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + '\n         esperaba ' + e + '\n         dio      ' + g); }
}

console.log('\n=== 1. los 34 productos reales ===');
const F = armar(PROV);
const ESP = {
  PPM: 'Pizzas', PPJyQ: 'Pizzas', PPCyQ: 'Pizzas',
  PMu: 'Pizzas', PMa: 'Pizzas', PJyQ: 'Pizzas', PCC: 'Pizzas', PJyM: 'Pizzas',
  ECaC: 'Empanadas', EJyQ: 'Empanadas', ECyQ: 'Empanadas', EV: 'Empanadas',
  SQB: 'Sorrentinos', SL: 'Sorrentinos', SCo: 'Sorrentinos', SPyP: 'Sorrentinos',
  SJyQ: 'Sorrentinos', SE: 'Sorrentinos', SCa: 'Sorrentinos',
  TG: 'Tortas', TLC: 'Tortas', TC: 'Tortas',
  TP: 'Tartas', TJyQ: 'Tartas', TCa: 'Tartas', TV: 'Tartas',
  F: 'Postres',
  RC: 'Wraps', RP: 'Wraps',
  CCo: 'Carnes', CEn: 'Carnes', CLo: 'Carnes', CPi: 'Carnes', CVa: 'Carnes'
};
let difer = [];
Object.keys(ESP).forEach(ab => { if (F.pc(ab) !== ESP[ab]) difer.push(ab + ': ' + F.pc(ab) + ' (esperaba ' + ESP[ab] + ')'); });
chk('los 34 caen en su categoria', difer, []);

console.log('\n=== 2. lo que ANTES se clasificaba bien no se movio ===');
/* 27 de los 34. Si alguno cambiara, el Mix, la Comparativa y el BCG de la
   pantalla mostrarian otra cosa sin que nadie lo haya pedido. */
const YA_ESTABAN = ['PPM','PPJyQ','PPCyQ','PMu','PMa','PJyQ','PCC','PJyM',
  'ECaC','EJyQ','ECyQ','EV','SQB','SL','SCo','SPyP','SJyQ','SE','SCa',
  'TG','TLC','TC','TP','TJyQ','TCa','TV','F'];
chk('los 27 de siempre, intactos',
    YA_ESTABAN.filter(a => F.pc(a) !== ESP[a]), []);
chk('son 27', YA_ESTABAN.length, 27);

console.log('\n=== 3. los 7 que caian en "Otro" ===');
['RC','RP'].forEach(a => chk(a + ' -> Wraps', F.pc(a), 'Wraps'));
['CCo','CEn','CLo','CPi','CVa'].forEach(a => chk(a + ' -> Carnes', F.pc(a), 'Carnes'));

console.log('\n=== 4. subcat: el valor exacto que leen pizzasDetalle y el panel ===');
chk('PPM  -> Pack Pizzas',         F.sub('PPM'), 'Pack Pizzas');
chk('PMu  -> Pizzas Individuales', F.sub('PMu'), 'Pizzas Individuales');
chk('CLo  -> sin subcat',          F.sub('CLo'), '');
chk('SCo  -> sin subcat',          F.sub('SCo'), '');
chk('RC   -> sin subcat',          F.sub('RC'),  '');

console.log('\n=== 5. la col B vacia hereda de la fila de arriba ===');
chk('CVa (5 filas despues de "Carnes") es Carnes', F.pc('CVa'), 'Carnes');
chk('TV  (4 filas despues de "Tartas") es Tartas', F.pc('TV'),  'Tartas');

console.log('\n=== 6. bordes: nada de esto puede reventar ===');
chk('abreviatura que no esta en Proveedores', F.pc('XXX'), 'Otro');
chk('abreviatura vacia',                      F.pc(''),    'Otro');
chk('null',                                   F.pc(null),  'Otro');
chk('undefined',                              F.pc(undefined), 'Otro');
chk('subcat de algo que no existe',           F.sub('XXX'), '');

const SIN_HOJA = armar(null);
chk('sin hoja Proveedores: mapa vacio', SIN_HOJA.cat(), {});
chk('sin hoja Proveedores: todo Otro',  SIN_HOJA.pc('CLo'), 'Otro');
chk('sin hoja Proveedores: sin subcat', SIN_HOJA.sub('PPM'), '');

const SOLO_CAB = armar([PROV[0]]);
chk('hoja con solo encabezado: mapa vacio', SOLO_CAB.cat(), {});

console.log('\n=== 7. una abreviatura repetida no se pisa ===');
/* Si la misma abrev apareciera dos veces bajo productos distintos, gana la
   PRIMERA: asi el resultado no depende del orden en que alguien agregue filas. */
const REPE = armar(PROV.concat([['', 'Otra cosa', 'Proveedor X', 'raro', 'CLo']]));
chk('CLo sigue siendo Carnes', REPE.pc('CLo'), 'Carnes');

console.log('\n=== 8. una categoria NUEVA entra sola, sin tocar codigo ===');
const NUEVA = armar(PROV.concat([['', 'Bebidas', 'Proveedor Y', 'Agua', 'BAg']]));
chk('BAg -> Bebidas', NUEVA.pc('BAg'), 'Bebidas');
chk('y no se lleva a nadie puesto', NUEVA.pc('CLo'), 'Carnes');

console.log('\n=== 9. la cache no cambia el resultado ===');
const C1 = armar(PROV);
const a1 = C1.pc('CLo'), a2 = C1.pc('CLo'), a3 = C1.pc('CLo');
chk('tres llamadas seguidas dan lo mismo', [a1, a2, a3], ['Carnes', 'Carnes', 'Carnes']);

console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal'
            + (viejo ? '   [con el mapa de prefijos VIEJO reinyectado]' : ''));
process.exit(mal ? 1 : 0);
