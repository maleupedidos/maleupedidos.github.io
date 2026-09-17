#!/usr/bin/env node
/* Evita volver a publicar una tab que no sepa de qué datos depende ni cómo
 * actualizarse. El botón manual y el refresco automático deben cubrir la misma
 * pantalla, incluso cuando tiene sub-tabs con fuentes propias. */
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '_src', 'panel.src.html'), 'utf8');
const tabs = ['inicio','ventas','planificacion','pedidos','caja','egresos','stock','ruta','busqueda','bbdd','estancias','proveedores','ajustes','miportal','pedidoshome','mireparto'];
const definicionTabsConDatos = (src.match(/var _TABS_CON_DATOS=\[([\s\S]*?)\];/) || ['', ''])[1];
const usaVolcado = new Set((definicionTabsConDatos.match(/'[^']+'/g) || []).map(x => x.slice(1, -1)));
let mal = 0;
function ok(nombre, condicion) { console.log((condicion ? '  OK  ' : '  MAL ') + nombre); if (!condicion) mal++; }
console.log('\n== CONTRATO DE REFRESCO DEL ERP ==\n');
tabs.forEach(t => ok(t + ' tiene fuente o refresco propio',
  new RegExp("tab==='" + t + "'|_tab === '" + t + "'|active==='" + t + "'|p==='" + t + "'").test(src) ||
  (usaVolcado.has(t) && /return _tabUsaD\(tab\)\?\['volcado'\]/.test(src))));
ok('Inicio refresca ventas además de pedidos y caja', /_tab === 'inicio'[\s\S]*loadRapido\(\)[\s\S]*loadVentas/.test(src));
ok('Ventas respeta Productos, Combos y Cruce', /_vsubA==='productos'[\s\S]*loadProductosAnalytics[\s\S]*_vsubA==='combos'[\s\S]*loadCombosEval[\s\S]*_vsubA==='cruce'/.test(src));
ok('Mi Reparto evita la carga duplicada al entrar', /_refrescoAutoOcupado[\s\S]*loadMiReparto/.test(src));
ok('Ajustes comparte una única consulta en vuelo', /AJ_PEDIDO[\s\S]*if\(AJ_PEDIDO\)return AJ_PEDIDO/.test(src));
ok('una lectura colgada deja de mostrar Actualizando antes del tope manual',
  /FRESCO_MAX_VUELO_MS=85000/.test(src) &&
  /Date\.now\(\)-\(_frescoVueloDesde\[f\]\|\|0\)<FRESCO_MAX_VUELO_MS/.test(src) &&
  /Date\.now\(\)-\(_frescoVueloDesde\[f\]\|\|0\)>=FRESCO_MAX_VUELO_MS/.test(src));
ok('ningun reintento de lectura queda sin reloj',
  /CORTE_GET_FINAL_MS\s*=\s*45000/.test(src) &&
  /var esFinal = intento >= CORTE_GET_INTENTOS;/.test(src) &&
  /var limite = esFinal \? CORTE_GET_FINAL_MS : CORTE_GET_MS;/.test(src) &&
  /if \(esFinal\) throw new Error\('Google no entrego la lectura a tiempo'\);/.test(src));
ok('el fusible de la cola rechaza la promesa que esperaba la pantalla',
  /function terminar\(err, valor\)/.test(src) &&
  /terminar\(new Error\('La lectura excedio el tiempo maximo de espera'\)\);/.test(src) &&
  /if \(err\) it\.rej\(err\); else it\.res\(valor\);/.test(src));
console.log('\n  ' + (tabs.length + 7 - mal) + ' ok · ' + mal + ' mal\n');
process.exit(mal ? 1 : 0);
