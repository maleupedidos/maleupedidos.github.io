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

function envolver(cuerpo, shim, que) {
  const out = '/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.\n' +
    '   ' + que + '. Ver el encabezado de _tools/copiar_motor.js. */\n' +
    '(function (G) {\n' + shim.split('/*MOTOR*/').join('\n' + cuerpo + '\n') + '\n})(typeof window !== "undefined" ? window : globalThis);\n';
  new Function(out);                                          // que parsee, o no se escribe
  return out;
}
function generar() {
  const code = fs.readFileSync(CODE, 'utf8'), shim = fs.readFileSync(SHIM, 'utf8');
  return envolver(extraer(code), shim, 'El motor de CRM › Hoy (164)');
}

/* EL CIERRE DE LLAMADAS (190, 27/10/2026). Para los motores nuevos no hay lista a mano: se copia
   la funcion raiz y TODO lo que llama, recursivo (funciones y `var` de primer nivel de Code.js), en
   el orden en que estan en Code.js. Si una regla suma una funcion, entra sola en el proximo build.
   `fuera`: lo que el shim reemplaza y no hace falta copiar. */
function cierre(code, raiz, fuera) {
  const L = code.split(/\r?\n/), defs = Object.create(null);
  for (let i = 0; i < L.length; i++) {
    let m = /^function ([\w$]+)\(/.exec(L[i]);
    if (m) { let j = i; while (L[j] !== '}') j++; if (!defs[m[1]]) defs[m[1]] = [i, j]; continue; }
    m = /^var ([\w$]+)\s*=/.exec(L[i]);
    if (m && !defs[m[1]]) {
      let j = i, prof = 0;
      for (;; j++) {
        for (const ch of L[j].replace(/\/\/.*$/, '').replace(/'(?:[^'\\]|\\.)*'/g, '')) { if ('{[('.includes(ch)) prof++; if ('}])'.includes(ch)) prof--; }
        if (prof <= 0 && /;\s*(\/\/.*)?$/.test(L[j])) break;
      }
      defs[m[1]] = [i, j];
    }
  }
  if (!defs[raiz]) throw new Error('no encontré ' + raiz + ' en Code.js');
  const vistos = new Set(), cola = [raiz];
  while (cola.length) {
    const n = cola.pop();
    if (vistos.has(n) || fuera.has(n) || !defs[n]) continue;
    vistos.add(n);
    const [a, b] = defs[n];
    const txt = L.slice(a, b + 1).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
    for (const t of new Set(txt.match(/[A-Za-z_$][\w$]*/g))) if (defs[t] && t !== n) cola.push(t);
  }
  return [...vistos].map(n => defs[n]).sort((x, y) => x[0] - y[0]).map(([a, b]) => L.slice(a, b + 1).join('\n')).join('\n\n');
}
const MOTORES = [
  { salida: 'pj_motor.js', armar: generar },
  /* (190) Mi Portal › Objetivos del equipo (`redObjetivosEquipo`). */
  { salida: 'ro_motor.js', armar: () => envolver(
      cierre(fs.readFileSync(CODE, 'utf8'), '_doGetRedObjetivosEquipo', new Set(['_logError_'])),
      fs.readFileSync(path.join(RAIZ, '_src', 'ro_motor_shim.js'), 'utf8'), 'El motor de Mi Portal › Objetivos del equipo (190)') },
  /* (191) El portal del vendedor (`dashboardVendedor`): los numeros. Lo que hace efectos o sale de
     ellos (tareas, objetivo, Telegram, escala, liquidaciones) lo reemplaza el shim y lo trae
     `dashboardVendedorEfectos`; lo que la base da resuelto (mapa de productos, piezas, comision,
     cuentas, la palanca de la liquidacion), tambien. */
  { salida: 'dv_motor.js', armar: () => envolver(
      cierre(fs.readFileSync(CODE, 'utf8'), '_doGetDashboardVendedor', new Set(['_logError_', '_rtTareas_', '_roObjetivoPortal_',
        '_escalaPortal_', '_escalaProductosVendedor_', '_escalaRedLeer_', '_rbTgLink_', '_liqRedDeVendedor_', '_liqRedProxDeVendedor_',
        '_roVendedorDeSesion_', '_rbVendedores_', '_rbVendedorPorNombre_', '_colsAbbr_', '_piezasLeer_', '_comisionPct', '_cuentas_',
        '_liqRedActiva_'])),
      fs.readFileSync(path.join(RAIZ, '_src', 'dv_motor_shim.js'), 'utf8'), 'El motor del portal del vendedor (191)') },
  /* (27/10) El bloque LEC-ARMA de la pantalla (la config de cada lectura, `_lecArmaComparar` y
     `_motorCtx`), publicado aparte para el medidor de Apps Script: compara con el MISMO codigo que
     la pantalla. La pantalla no lo carga (lo tiene adentro). */
  { salida: 'lec_arma.js', armar: () => {
      const w = fs.readFileSync(path.join(RAIZ, '_src', 'panel.src.html'), 'utf8').replace(/\r\n/g, '\n');
      const i = w.indexOf('/*LEC-ARMA-INI*/'), j = w.indexOf('/*LEC-ARMA-FIN*/');
      if (i < 0 || j < i) throw new Error('no encontré el bloque LEC-ARMA en panel.src.html');
      const out = '/* GENERADO por _tools/copiar_motor.js desde _src/panel.src.html (bloque LEC-ARMA): NO SE EDITA.\n' +
        '   Lo baja el medidor de lecturas de Apps Script (medirLecturasBase). */\n(function (G) {\n' + w.slice(i, j) +
        '\nG.LEC_ARMA = LEC_ARMA; G._lecArmaComparar = _lecArmaComparar; G._motorCtx = _motorCtx;\n})(typeof window !== "undefined" ? window : globalThis);\n';
      new Function(out);
      return out;
    } }
];

/* git puede dejarlo con CRLF al hacer checkout: eso no es «viejo». Se normalizan LOS DOS lados:
   Code.js trae algún CRLF propio, y normalizar solo el archivo lo daba por viejo siempre (27/10). */
const lf = t => t.replace(/\r\n/g, '\n');
let viejos = 0;
for (const M of MOTORES) {
  const nuevo = M.armar(), arch = path.join(RAIZ, M.salida);
  if (chequear) {
    const viejo = fs.existsSync(arch) ? fs.readFileSync(arch, 'utf8') : '';
    if (lf(viejo) !== lf(nuevo)) { console.error('✗ ' + M.salida + ' quedó viejo contra Code.js: corré node _tools/copiar_motor.js'); viejos++; }
    else console.log('✓ ' + M.salida + ' al día con Code.js');
  } else {
    fs.writeFileSync(arch, nuevo);
    console.log(M.salida + ': ' + (nuevo.length / 1024).toFixed(0) + ' KB');
  }
}
if (viejos) process.exit(1);
