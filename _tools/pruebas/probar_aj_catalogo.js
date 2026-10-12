/* Ajustes › réplica: el renglón del catálogo de productos (12/10/2026).
   `catalogoMedir` guardaba su resultado donde nadie lo podía leer. Sin navegador:
   saca `ajCatalogoHtml` de la fuente y la corre con lo que manda el backend.

     node _tools/pruebas/probar_aj_catalogo.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', '..', '_src', 'panel.src.html'), 'utf8');
const i = src.indexOf('function ajCatalogoHtml(c){');
let ok = 0, mal = 0;
const chk = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (x !== undefined ? '\n         -> ' + String(x).slice(0, 500) : '')); } };
if (i < 0) { chk(false, 'existe ajCatalogoHtml'); process.exit(1); }
const j = src.indexOf('\nfunction ajReplicaPintar(d){', i);
const sb = { ajEsc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'), _hace: () => 'hace 12 min', Number, String };
vm.createContext(sb); vm.runInContext(src.slice(i, j), sb);
const h = c => vm.runInContext('ajCatalogoHtml(' + JSON.stringify(c) + ')', sb);

chk(h(undefined) === '', 'un backend viejo no manda `catalogo`: no pinta nada');
let t = h({ modo: 'si', origen: 'base', medida: { ts: 1, igual: true, filas: 94, dif: [], difTotal: 0 } });
chk(/sale de la base/.test(t) && /comparado hace 12 min/.test(t) && /coincide<\/b> \(94 ids\)/.test(t) && !/class="mal"/.test(t), '«si» y verde: sale de la base, cuándo se comparó y que coincide', t);
t = h({ modo: 'si', origen: 'codigo', medida: { ts: 1, igual: true, filas: 94 } });
chk(/class="mal"/.test(t) && /respaldo/.test(t), '«si» pero cayó al respaldo: lo dice en rojo', t);
t = h({ modo: 'si', origen: 'base', medida: { ts: 1, igual: false, filas: 94, dif: ['Red 41: la base dice XX y el codigo YY', 'Home: <b>'], difTotal: 14 } });
chk(/14 diferencias/.test(t) && /Red 41: la base dice XX/.test(t) && /y 12 más/.test(t) && /&lt;b>/.test(t) && !/<b>'/.test(t), 'con diferencias: cuántas, cuáles, cuántas más, y el texto escapado', t);
t = h({ modo: 'si', origen: 'base', medida: { ts: 1, igual: false, filas: 94, dif: ['una sola'], difTotal: 1 } });
chk(/1 diferencia</.test(t) && !/más\./.test(t), 'una sola: en singular y sin «y N más»', t);
t = h({ modo: 'medir', origen: 'codigo', medida: null });
chk(/sale del código/.test(t) && /todavía no manda/.test(t) && /todavía no se comparó/.test(t), '«medir» sin medida: sale del código y todavía no se comparó', t);
t = h({ modo: 'no', origen: 'codigo', medida: null });
chk(/apagada/.test(t) && !/todavía no se comparó/.test(t), '«no»: dice que la comparación está apagada', t);

console.log('\n' + ok + ' ok, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
