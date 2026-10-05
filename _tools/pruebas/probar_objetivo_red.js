/* EL OBJETIVO SEMANAL DEL VENDEDOR (portal nuevo, parte 3, 5/10/2026).
   Corre las funciones del Code.js REAL con la hoja `Objetivos Red` simulada y
   filas de la hoja Red inventadas (este repo es publico).

     node probar_objetivo_red.js [Code.js]

   Sostiene:
   · una venta = mismo cliente y mismo dia acordado; dos pedidos ese dia son UNA;
   · lo que trajo Maleu NO suma al objetivo: va aparte, como «pasadas»;
   · no cuentan cancelados, lo que espera la bandeja, otra semana, ni la compra
     de mercaderia del vendedor;
   · el objetivo lo pone SOLO el vendedor (el admin en «Ver como» no puede);
   · cambiar el objetivo conserva el resultado de las acciones que ya marco;
   · el toque de una accion guarda su resultado, y uno desconocido se rechaza;
   · las sugeridas (reponer, segunda, dormido) no repiten a los ya elegidos ni
     a los que dijeron que no quieren;
   · el equipo se suma sin nombres, y «si llegás ganás» sale de su historia.
   Las fechas son relativas a HOY: la prueba no envejece.
*/
'use strict';
const fs = require('fs'), vm = require('vm');
const ARCHIVO = process.argv[2] || 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/estancias/.clasp-src/Code.js';
let ok = 0, mal = 0;
function chk(t, c, d) { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 400) : '')); } }

/* ── fechas relativas a hoy (hora local de la maquina, que es Argentina) ── */
const pad = n => String(n).padStart(2, '0');
const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
const dia = n => { const d = new Date(lunes); d.setDate(d.getDate() + n); return d; };          // n dias desde el lunes
const ddmm = d => pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
const isoDe = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const haceIso = n => { const d = new Date(hoy); d.setDate(d.getDate() - n); return isoDe(d); };

/* ── la hoja Objetivos Red, simulada ── */
let filasObj;
const hojaObj = {
  getLastRow: () => filasObj.length + 1,
  getMaxRows: () => filasObj.length + 50,
  getRange(f, c, nf, nc) {
    return {
      getValues() { const o = []; for (let i = 0; i < (nf || 1); i++) o.push((filasObj[f - 2 + i] || []).slice(c - 1, c - 1 + (nc || 1))); return o; },
      setValues(v) { v.forEach((r, i) => { if (f - 2 + i < 0) return; const fila = filasObj[f - 2 + i] || (filasObj[f - 2 + i] = []); r.forEach((x, j) => { fila[c - 1 + j] = x; }); }); return this; },
      setNumberFormat() { return this; }, setFontWeight() { return this; },
    };
  },
  appendRow(r) { filasObj.push(r.slice()); },
};
let hojaObjExiste = false;
const SS_SIM = {
  getSheetByName: n => (n === 'Objetivos Red' && hojaObjExiste ? hojaObj : null),
  insertSheet: n => { if (n === 'Objetivos Red') { hojaObjExiste = true; return hojaObj; } return null; },
};
function comodin(n) {
  const f = function () { return comodin(n); };
  return new Proxy(f, { get(_t, p) { if (p === Symbol.toPrimitive) return () => ''; if (p === 'then') return undefined; if (p === 'toString') return () => ''; return comodin(n + '.' + String(p)); }, apply() { return comodin(n + '()'); }, construct() { return comodin('new ' + n); } });
}
let uuid = 0;
const sandbox = {
  console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error,
  isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, setTimeout, Proxy, Symbol,
  SpreadsheetApp: { getActiveSpreadsheet: () => SS_SIM, openById: () => SS_SIM, flush() {} },
  LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
  Utilities: {
    formatDate: (d, tz, f) => f.replace('yyyy', d.getFullYear()).replace('MM', pad(d.getMonth() + 1)).replace('dd', pad(d.getDate()))
      .replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())).replace('ss', pad(d.getSeconds())),
    getUuid: () => 'id-' + (++uuid) + '-xxxxxxxxxxxx',
  },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {}, removeAll() {} }) },
};
['PropertiesService', 'ScriptApp', 'ContentService', 'HtmlService', 'UrlFetchApp',
  'MailApp', 'GmailApp', 'DriveApp', 'Session', 'Logger', 'CalendarApp'].forEach(s => { sandbox[s] = comodin(s); });
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(ARCHIVO, 'utf8'), sandbox, { filename: 'Code.js' });
const existe = n => { try { return typeof vm.runInContext(n, sandbox) === 'function'; } catch (e) { return false; } };
if (!existe('_roObjetivoPortal_')) { console.log('\n  MAL  el Code.js no tiene el objetivo semanal (_roObjetivoPortal_)\n\n0 ok · 1 mal'); process.exit(1); }
/* Lo de afuera de lo que se prueba: quien es el de la sesion, y la respuesta. */
vm.runInContext(`
  _jsonOut_ = function (o) { return o; };
  _vendedorDeUsuario_ = function (u) { return ({ uno: 'Vendedor Uno', dos: 'Vendedor Dos' })[u] || ''; };
  _rtDeclarado_ = function () { return { semana: {}, noQuiere: { 'Cliente NoQuiere': 1 }, mostradas: null }; };
`, sandbox);
const sesion = (usuario, rol) => vm.runInContext(`_authCtx = ${JSON.stringify({ usuario, rol })};`, sandbox);
const llamar = (fn, arg) => { sandbox.__arg = JSON.parse(JSON.stringify(arg)); return vm.runInContext(fn + '(__arg)', sandbox); };

/* ── filas de la hoja Red (inventadas). idx: 7 vendedor · 8 cliente · 10 dia K · 11 estado.
   Col 70 = estado de la bandeja, col 72 = Trajo el Cliente. ── */
const COL_EST = 70, COL_TRAJO = 72;
const fila = (v, c, d, es, extra) => { const r = new Array(80).fill(''); r[7] = v; r[8] = c; r[10] = d; r[11] = es || 'Pendiente';
  if (extra && extra.trajo) r[COL_TRAJO - 1] = extra.trajo; if (extra && extra.band) r[COL_EST - 1] = extra.band; return r; };
const DATA = [
  fila('Vendedor Uno', 'Cliente A', dia(1)),                       // venta 1
  fila('Vendedor Uno', 'cliente a', ddmm(dia(1))),                 // mismo cliente y dia (como texto): la misma venta
  fila('Vendedor Uno', 'Cliente B', dia(4), 'Entregado'),          // venta 2
  fila('Vendedor Uno', 'Cliente C', dia(4), 'Pendiente', { trajo: 'Maleu' }),   // la trajo Maleu: pasada
  fila('Vendedor Uno', 'Cliente D', dia(2), 'Cancelado'),          // no
  fila('Vendedor Uno', 'Cliente E', dia(9)),                       // la semana que viene: no
  fila('Vendedor Uno', 'Cliente F', dia(-3)),                      // la semana pasada: no
  fila('Vendedor Uno', 'Vendedor Uno', dia(2)),                    // su compra de mercaderia: no
  fila('Vendedor Uno', 'Cliente G', dia(3), 'Pendiente', { band: 'Por confirmar' }),   // espera la bandeja: no
  fila('Vendedor Uno', 'Cliente H', dia(5)),                       // sabado: seria la 3, pero...
  fila('Vendedor Uno', 'Cliente H', dia(5), 'Pendiente', { trajo: 'Maleu' }),   // mismo viaje con una parte de Maleu: pasa a pasada
  fila('Vendedor Dos', 'Cliente X', dia(4)),
  fila('Vendedor Dos', 'Cliente Y', dia(4)),
];
const CTX = cm => ({ nombre: 'Vendedor Uno', hoy, data: DATA, cols: { estRed: COL_EST, trajo: COL_TRAJO },
  pedidos: [
    /* historia para «si llegás ganás»: 2 ventas propias de $10.000 y $20.000, y una de Maleu ($0) que no entra */
    { c: 'Cliente A', fe: haceIso(14), es: 'Entregado', cn: true, com: 8000, env: 2000, _y: 2026, _sem: 1 },
    { c: 'Cliente B', fe: haceIso(14), es: 'Entregado', cn: true, com: 18000, env: 2000, _y: 2026, _sem: 1 },
    { c: 'Cliente C', fe: haceIso(7), es: 'Entregado', cn: false, com: 0, env: 5000, _y: 2026, _sem: 2 },
    { c: 'Cliente D', fe: haceIso(7), es: 'Cancelado', cn: true, com: 99000, env: 0, _y: 2026, _sem: 2 },
  ],
  clientesMap: cm || {} });

console.log('\n== Qué cuenta como una venta ==');
filasObj = []; hojaObjExiste = false;
let o = vm.runInContext('_roObjetivoPortal_', sandbox)(CTX());
chk('lleva 2 ventas propias (A y B; H va aparte)', o.lleva === 2, { lleva: o.lleva, ventas: o.ventas });
chk('dos pedidos del mismo cliente el mismo dia son UNA venta', o.ventas.filter(v => /cliente a/i.test(v.c)).length === 1, o.ventas);
chk('lo que trajo Maleu va aparte: 2 pasadas (C, y H que tenia una parte de Maleu)', o.pasadas === 2, { pasadas: o.pasadas });
chk('no entran cancelado, otra semana, su compra ni lo que espera la bandeja',
  !o.ventas.some(v => /Cliente (D|E|F|G)|Vendedor Uno/.test(v.c)), o.ventas.map(v => v.c));
chk('sin objetivo puesto: meta null', o.meta === null, o.meta);
chk('su ganancia por venta sale de su historia, sin Maleu ni cancelados ($15.000)', o.porVenta === 15000, o.porVenta);
chk('sin meta no hay «si llegás»', o.siLlega === null, o.siLlega);

console.log('\n== Poner el objetivo ==');
sesion('tadeo', 'admin');
let r = llamar('_doPostRedObjetivoSet', { meta: 6, acciones: [] });
chk('el admin («Ver como») no puede ponerlo', r.ok === false, r);
sesion('uno', 'vendedor');
r = llamar('_doPostRedObjetivoSet', { meta: 0 });
chk('un objetivo de 0 se rechaza', r.ok === false, r);
r = llamar('_doPostRedObjetivoSet', { meta: 6, acciones: [
  { tipo: 'dormido', clave: 'Cliente Dormido', txt: 'Llamar a Cliente Dormido', t: '1155550001' },
  { tipo: 'libre', txt: 'Degustación en el club' },
  { tipo: 'libre', txt: 'Degustación en el club' },     // repetida: entra una sola
] });
chk('el vendedor lo pone', r.ok === true && r.meta === 6 && r.acciones.length === 2, r);
chk('se guarda una fila con la semana, el vendedor y el JSON', filasObj.length === 1 && filasObj[0][1] === 'Vendedor Uno' && filasObj[0][2] === 6
  && /^\d{4}-W\d{2}$/.test(filasObj[0][0]) && JSON.parse(filasObj[0][3]).length === 2, filasObj);

console.log('\n== El toque de una accion ==');
const idDorm = r.acciones[0].id;
r = llamar('_doPostRedObjetivoAccion', { id: idDorm, resultado: 'Lo que sea' });
chk('un resultado desconocido se rechaza', r.ok === false, r);
r = llamar('_doPostRedObjetivoAccion', { id: idDorm, resultado: 'Compró' });
chk('marca «Compró» con su hora', r.ok === true && r.accion.res === 'Compró' && !!r.accion.fr, r);
r = llamar('_doPostRedObjetivoAccion', { id: 'no-existe', resultado: 'Hecho' });
chk('una accion que no es de su semana se rechaza', r.ok === false, r);
sesion('dos', 'vendedor');
r = llamar('_doPostRedObjetivoAccion', { id: idDorm, resultado: 'Hecho' });
chk('otro vendedor no puede marcar la accion de el', r.ok === false, r);
sesion('uno', 'vendedor');

console.log('\n== Cambiar el objetivo conserva lo marcado ==');
r = llamar('_doPostRedObjetivoSet', { meta: 8, acciones: [
  { tipo: 'dormido', clave: 'Cliente Dormido', txt: 'Llamar a Cliente Dormido' },
  { tipo: 'segunda', clave: 'Cliente Nuevo', txt: 'Volver a Cliente Nuevo' },
] });
chk('sigue siendo UNA fila', filasObj.length === 1, filasObj.length);
chk('el dormido conserva su «Compró» y su id', r.acciones[0].res === 'Compró' && r.acciones[0].id === idDorm, r.acciones);
chk('la nueva entra sin resultado; la libre que saco ya no esta', r.acciones[1].res === '' && r.acciones.length === 2, r.acciones);

console.log('\n== El portal con el objetivo puesto, y el equipo ==');
sesion('dos', 'vendedor');
llamar('_doPostRedObjetivoSet', { meta: 4, acciones: [] });
const cm = {
  dormido: { n: 'Cliente Dormido', count: 4, total: 200000, ultIso: haceIso(60), primIso: haceIso(120), t: '1', b: 'B1' },     // ya elegido
  dorm2: { n: 'Cliente Dormido Dos', count: 3, total: 90000, ultIso: haceIso(50), primIso: haceIso(90), t: '2', b: 'B1' },     // cada 20, hace 50: dormido
  repo: { n: 'Cliente Repone', count: 3, total: 50000, ultIso: haceIso(16), primIso: haceIso(44), t: '3', b: 'B2' },           // cada 14, hace 16: le toca
  seg: { n: 'Cliente Segunda', count: 1, total: 20000, ultIso: haceIso(10), primIso: haceIso(10), t: '4', b: 'B3' },
  noq: { n: 'Cliente NoQuiere', count: 1, total: 20000, ultIso: haceIso(10), primIso: haceIso(10), t: '5', b: 'B3' },
  alDia: { n: 'Cliente AlDia', count: 3, total: 50000, ultIso: haceIso(3), primIso: haceIso(31), t: '6', b: 'B2' },            // cada 14, hace 3: nada
};
o = vm.runInContext('_roObjetivoPortal_', sandbox)(CTX(cm));
chk('trae su meta (8) y lo que lleva (2)', o.meta === 8 && o.lleva === 2, { meta: o.meta, lleva: o.lleva });
chk('«si llegás ganás» = 8 × $15.000', o.siLlega === 120000, o.siLlega);
chk('el equipo suma metas y ventas, sin nombres (8+4, 2+2)', o.equipo.meta === 12 && o.equipo.lleva === 4 && o.equipo.conMeta === 2
  && !JSON.stringify(o.equipo).includes('Vendedor'), o.equipo);
const sug = o.sugeridas.map(s => s.tipo + ':' + s.clave);
chk('sugiere reponer, segunda y dormido', sug.includes('reponer:Cliente Repone') && sug.includes('segunda:Cliente Segunda') && sug.includes('dormido:Cliente Dormido Dos'), sug);
chk('no repite al que ya eligio', !sug.some(s => s.endsWith(':Cliente Dormido')), sug);
chk('no sugiere al que dijo que no quiere', !sug.some(s => s.includes('NoQuiere')), sug);
chk('no sugiere al que esta al dia', !sug.some(s => s.includes('AlDia')), sug);
chk('cada sugerida trae texto, detalle y telefono', o.sugeridas.every(s => s.txt && s.det && 't' in s), o.sugeridas);
chk('trae la lista de resultados para los botones', Array.isArray(o.resultados) && o.resultados.includes('Hecho'), o.resultados);

console.log('\n' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
