#!/usr/bin/env node
/* Verifica el caso que motivó este arreglo: una promesa GET que no termina no
 * puede conservar el rótulo "Actualizando…" para siempre. */
'use strict';
const fs = require('fs'), vm = require('vm');
const source = fs.readFileSync('_src/panel.src.html', 'utf8');
const from = source.indexOf('var _frescoVuelo=');
const to = source.indexOf('/* Un tilde verde', from);
if (from < 0 || to < 0) throw new Error('No encontré el bloque de vuelos de refresco');
let now = 1_000;
const ctx = {
  Date: { now: () => now },
  localStorage: { setItem() {} },
  _FRESCO_EN_VOLCADO: {},
  _fresco: { ok: {}, err: {} },
  _pintarFresco() {},
  console
};
vm.createContext(ctx);
vm.runInContext(source.slice(from, to), ctx);
const check = (condition, label) => { if (!condition) throw new Error(label); console.log('  OK  ' + label); };
ctx._frescoEnVuelo(['ventas'], 1);
check(ctx._frescoVolando('ventas') === true, 'una consulta recién iniciada se muestra en vuelo');
now += 85_000;
check(ctx._frescoVolando('ventas') === false, 'una consulta colgada deja de mostrar Actualizando');
ctx._frescoEnVuelo(['ventas'], 1);
check(ctx._frescoVolando('ventas') === true, 'un nuevo intento recupera el estado visual');
ctx._frescoEnVuelo(['ventas'], -1);
check(ctx._frescoVolando('ventas') === true, 'el cierre tardío del intento viejo no borra el nuevo');
console.log('REFRESCO COLGADO OK');
