/* EL MOTOR DE LAS JUGADAS EN EL NAVEGADOR (164, 27/10/2026).
     node _tools/copiar_motor.js [<ruta a estancias>]      → escribe pj_motor.js
     node _tools/copiar_motor.js --chequear [<estancias>]  → sale con 1 si pj_motor.js quedó viejo
   CRM › Hoy (`crmJugadas`) sale de la base: la base arma los DATOS (`crm_jugadas_pantalla`, 164)
   y las REGLAS son las de Apps Script, copiadas de `estancias/.clasp-src/Code.js` tal cual. No hay
   una segunda copia escrita a mano: si Tadeo cambia una regla en Code.js, esto la vuelve a copiar.
   Se copia: el bloque de las jugadas (de `var PJ = {` al final de `_doGetCrmJugadas`) y, por
   nombre, lo que ese bloque llama de otras partes. Encima va `_src/pj_motor_shim.js`: un «mini
   Apps Script» (SS, CacheService, ContentService, Utilities) que presenta los datos de la base
   como si fueran las hojas, y reemplaza lo que lee de afuera (el índice de clientes, la meta,
   los templates de WATI). Sin datos personales: es código. */
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), chequear = args[0] === '--chequear';
const EST = (chequear ? args[1] : args[0]) || path.join(__dirname, '..', '..', 'estancias');
const CODE = path.join(EST, '.clasp-src', 'Code.js'), RAIZ = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'pj_motor.js'), SHIM = path.join(RAIZ, '_src', 'pj_motor_shim.js');

/* Lo que el bloque de las jugadas llama de otras partes de Code.js. */
const NOMBRES = ['PJ_PROG_HOJA', 'PJ_PROG_COLS_', 'PJ_PROG_TZ_', '_pjProgLeer_', '_pjProgLista_',
  'PJ_RESP_HORAS', 'PJ_RESP_TOPE', 'PJ_RESP_REMIRA_MIN', 'PJ_RESP_COLS_', 'PJ_RESP_ATENDIDO_', '_pjFechaHora_', '_pjRespLeer_',
  'PJ_NE_COLS_', '_pjNoEscribirLeer_', '_pjNoEscribirDe_', 'CAMP_ENT_COL_',
  '_cfgFilasConfig_', '_CFG_MEMO_', '_cfgSiNo_', '_cfgTexto_', '_catPorAbbr_', 'CROSS_CAT_NORM', '_getAbbrToPrecio', '_numCelda_',
  '_crmTopValue', '_crmNormNombre', '_crmNormTel', 'CLI_ACTIVO_DIAS', '_cliEstadoDias_', '_fmtDmyAR_', '_fmtAR_', '_FMT_AR_OK_', '_fmtDmyLocal_', '_dos_',
  '_PROD_VALS_', '_productosValores_', '_CRM_TEL_VEND_'];

function extraer(code) {
  const L = code.split(/\r?\n/);
  const ini = L.findIndex(l => l.startsWith('var PJ = {'));
  const fd = L.findIndex(l => l.startsWith('function _doGetCrmJugadas('));
  if (ini < 0 || fd < 0) throw new Error('no encontré el bloque de las jugadas en Code.js');
  const fin = L.findIndex((l, i) => i > fd && l === '}');
  const partes = [L.slice(ini, fin + 1).join('\n')];
  const tomada = {};
  for (const n of NOMBRES) {
    let i = L.findIndex(l => l.startsWith('function ' + n + '(') || new RegExp('^var (?:[\\w$]+ = [^,;]+, )*' + n.replace(/\$/g, '\\$') + '\\b').test(l));
    if (i < 0) throw new Error('no encontré ' + n + ' en Code.js');
    if (i >= ini && i <= fin) continue;                       // ya viene en el bloque
    if (tomada[i]) continue;
    tomada[i] = 1;
    let j = i;
    if (L[i].startsWith('function ')) { while (L[j] !== '}') j++; }
    else { let prof = 0; for (;; j++) { for (const ch of L[j].replace(/\/\/.*$/, '').replace(/'(?:[^'\\]|\\.)*'/g, '')) { if ('{[('.includes(ch)) prof++; if ('}])'.includes(ch)) prof--; } if (prof <= 0 && /;\s*(\/\/.*)?$/.test(L[j])) break; } }
    partes.push(L.slice(i, j + 1).join('\n'));
  }
  return partes.join('\n\n');
}

function generar() {
  const code = fs.readFileSync(CODE, 'utf8'), shim = fs.readFileSync(SHIM, 'utf8');
  const cuerpo = extraer(code);
  const out = '/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.\n' +
    '   El motor de CRM › Hoy (164). Ver el encabezado de _tools/copiar_motor.js. */\n' +
    '(function (G) {\n' + shim.split('/*MOTOR*/').join('\n' + cuerpo + '\n') + '\n})(typeof window !== "undefined" ? window : globalThis);\n';
  new Function(out);                                          // que parsee, o no se escribe
  return out;
}

const nuevo = generar();
if (chequear) {
  const viejo = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8') : '';
  /* git puede dejarlo con CRLF al hacer checkout: eso no es «viejo». */
  if (viejo.replace(/\r\n/g, '\n') !== nuevo) { console.error('✗ pj_motor.js quedó viejo contra Code.js: corré node _tools/copiar_motor.js'); process.exit(1); }
  console.log('✓ pj_motor.js al día con Code.js');
} else {
  fs.writeFileSync(SALIDA, nuevo);
  console.log('pj_motor.js: ' + (nuevo.length / 1024).toFixed(0) + ' KB');
}
