/* «LE PAGASTE» ES LA SUMA DE LOS PAGOS (2/11/2026).

   node _tools/pruebas/probar_le_pagaste.js [archivo]      (busqueda.html por defecto)

   Saca `_abaPagadoReal` de busqueda.html, tal cual, y la corre con datos inventados con la forma que arma el
   backend (`pagado` = suma por semana de lo imputado + libre aplicado + a favor aplicado + NC aplicada).
   Sostiene:
   · un pago doble ($112.000 dos veces a una semana de $112.000) dice $224.000 pagados, no $336.000 (el bug de
     Claudia Polito: la cuenta vieja le sumaba el «a favor» encima);
   · el «a favor» descontado en una semana posterior no se cuenta dos veces;
   · lo compensado con nota de credito no es plata pagada;
   · un pago a cuenta que sobra si es plata pagada.
   Contra la cuenta vieja (pag - nc + sobra + favor) el caso 1 da MAL. */
'use strict';
const fs = require('fs');
const path = require('path');
const ARCH = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'busqueda.html'));
const src = fs.readFileSync(ARCH, 'utf8');
const i = src.indexOf('function _abaPagadoReal(');
if (i < 0) { console.log('  MAL  este archivo no tiene _abaPagadoReal\n\n0 ok · 1 mal'); process.exit(1); }
let j = src.indexOf('{', i), n = 0;
for (; j < src.length; j++) { if (src[j] === '{') n++; else if (src[j] === '}' && --n === 0) break; }
const _abaPagadoReal = new Function(src.slice(i, j + 1) + '\nreturn _abaPagadoReal;')();
let ok = 0, mal = 0;
const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };

// 1. Pago doble: semana 43 de $112.000 pagada dos veces. Antes, $4.099.000 pagados en otras semanas.
let d = { pagado: 4099000 + 224000, aFavor: 112000, saldoLibreSobrante: 0, ncAplicado: 0,
          semanas: [{ sem: 42, aFavorAplicado: 0 }, { sem: 43, aFavorAplicado: 0 }] };
chk('pago doble: dice lo pagado de verdad ($4.323.000), no el triple ($4.435.000)', _abaPagadoReal(d) === 4323000, _abaPagadoReal(d));

// 2. El «a favor» se descuenta en la semana siguiente: 150 por una de 100, y 30 + 50 a favor por una de 80.
d = { pagado: 150 + 80, aFavor: 0, saldoLibreSobrante: 0, ncAplicado: 0,
      semanas: [{ sem: 10, aFavorAplicado: 0 }, { sem: 11, aFavorAplicado: 50 }] };
chk('el «a favor» aplicado despues no se cuenta dos veces (180)', _abaPagadoReal(d) === 180, _abaPagadoReal(d));

// 3. Nota de credito: una semana de 100, 60 pagados y 40 compensados con NC.
d = { pagado: 100, ncAplicado: 40, saldoLibreSobrante: 0, semanas: [{ sem: 12, aFavorAplicado: 0 }] };
chk('lo compensado con nota de credito no es plata pagada (60)', _abaPagadoReal(d) === 60, _abaPagadoReal(d));

// 4. Pago a cuenta que sobra: todo saldado con 500 y quedan 9 a cuenta.
d = { pagado: 500, ncAplicado: 0, saldoLibreSobrante: 9, semanas: [{ sem: 13 }] };
chk('un pago a cuenta que sobra si es plata pagada (509)', _abaPagadoReal(d) === 509, _abaPagadoReal(d));

// 5. Sin datos no revienta.
chk('sin semanas ni campos: 0', _abaPagadoReal({}) === 0, _abaPagadoReal({}));

// La direccion contraria: la cuenta vieja sobre el caso 1.
const vieja = (x) => (x.pagado || 0) - (x.ncAplicado || 0) + (x.saldoLibreSobrante || 0) + (x.aFavor || 0);
chk('control: la cuenta vieja da el triple sobre el caso 1 (este test la agarra)', vieja({ pagado: 4323000, aFavor: 112000 }) === 4435000);

console.log('\n' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
