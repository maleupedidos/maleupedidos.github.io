/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor de los reclamos de la bandeja de Red (246). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
/* EL «MINI APPS SCRIPT» DE LOS RECLAMOS DE LA BANDEJA DE RED (246, 28/10/2026). Copia del de la escala
   (re_motor_shim.js, 201): _tools/copiar_motor.js pone donde dice MOTOR (entre barra-asterisco)
   `_redReclamosListar_` y todo lo que llama, copiado de Code.js. Los datos son los de
   `red_bandeja_extra_pantalla` (246 = `red_escala_datos` de la 201 + los links): las filas crudas de Red,
   Productos, la escala y las hojas chicas, presentados como las hojas que esas funciones leen. La comisión
   que le tocaría a un reclamo se recalcula con la MISMA regla de Apps Script (`_escalaRedDeFila_`). Solo
   admin: la base no le da estos datos a otro rol. No escribe nada. */

/* `Date` con un reloj que se puede fijar (la prueba compara contra Apps Script parado en su hora). */
var _D = G.Date, _ahora = null;
var Date = (function (D) {
  function F() {
    if (!(this instanceof F)) return D();
    var a = [].slice.call(arguments);
    if (!a.length) return new D(_ahora != null ? _ahora : D.now());
    return new (Function.prototype.bind.apply(D, [null].concat(a)))();
  }
  F.prototype = D.prototype; F.UTC = D.UTC; F.parse = D.parse;
  F.now = function () { return _ahora != null ? _ahora : D.now(); };
  return F;
})(_D);

function _Hoja(nombre, filas) { this.n = nombre; this.f = filas; }
_Hoja.prototype.getName = function () { return this.n; };
_Hoja.prototype.getLastRow = function () { return this.f.length; };
_Hoja.prototype.getLastColumn = function () { var m = 0; this.f.forEach(function (x) { if (x.length > m) m = x.length; }); return m; };
_Hoja.prototype.getMaxColumns = function () { return this.getLastColumn(); };
_Hoja.prototype.getMaxRows = function () { return this.getLastRow(); };
_Hoja.prototype.getRange = function (r, c, nr, nc) {
  var f = this.f, out = [];
  nr = nr || 1; nc = nc || 1;
  for (var i = 0; i < nr; i++) { var fila = f[r - 1 + i] || [], o = []; for (var j = 0; j < nc; j++) { var v = fila[c - 1 + j]; o.push(v === undefined || v === null ? '' : v); } out.push(o); }
  var rg = { getValues: function () { return out; }, getDisplayValues: function () { return out; },
    getValue: function () { return out[0][0]; },   /* (246) `_redExcDeFila_` lee una celda */
    setValues: function () { return rg; }, setValue: function () { return rg; }, setNumberFormat: function () { return rg; } };
  return rg;
};
_Hoja.prototype.getDataRange = function () { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); };
var _HOJAS = {}, _RE = {};
var SS = { getSheetByName: function (n) { return _HOJAS[n] || null; }, insertSheet: function (n) { return (_HOJAS[n] = new _Hoja(n, [])); } };
var CacheService = { getScriptCache: function () { return { get: function () { return null; }, put: function () {}, remove: function () {} }; } };
var PropertiesService = { getScriptProperties: function () { return { getProperties: function () { return {}; },
  getProperty: function () { return null; }, setProperty: function () {}, deleteProperty: function () {} }; } };
var ContentService = { MimeType: { JSON: 'json' },
  createTextOutput: function (s) { return { setMimeType: function () { return this; }, getContent: function () { return s; } }; } };
var Utilities = { formatDate: function (d, tz, fmt) {
  var dos = function (n) { return (n < 10 ? '0' : '') + n; };
  return String(fmt).replace(/yyyy|yy|MM|dd|HH|mm|ss/g, function (t) {
    return t === 'yyyy' ? d.getFullYear() : t === 'yy' ? dos(d.getFullYear() % 100) : t === 'MM' ? dos(d.getMonth() + 1)
      : t === 'dd' ? dos(d.getDate()) : t === 'HH' ? dos(d.getHours()) : t === 'mm' ? dos(d.getMinutes()) : dos(d.getSeconds());
  });
} };
var Session = { getEffectiveUser: function () { return { getEmail: function () { return ''; } }; } };
/* Las consultas a la base de la escala: las contesta lo que trajo `red_escala_pantalla`. */
function _crmPgConfig_() { return { enabled: true, url: 'base', key: 'base' }; }
function _crmPgFetch_(cfg, method, path) {
  var t = String(path || '').split('?')[0];
  if (t === 'seller_level_band') return _RE.bandas || [];
  if (t === 'seller_commission_rate') return _RE.tabla || [];
  if (t === 'seller_commission_rate_calc') return _RE.vista || [];
  return [];
}
function _colsAbbr_(hoja) { var m = {}; (_RE.colmap || []).forEach(function (x) { m[x[0]] = x[1]; }); return m; }
function _alertaTecnica_() { return ''; }
function _avisar_() { return ''; }
function _avisarCanal_() { return ''; }
function _avisarFallo_() { return ''; }
function _mlAvisar_() { return ''; }
function _escalaRedVigilar_() {}   /* (246) vigilar los cambios de la escala es un efecto: sigue en Apps Script */
function _logError_() {}


var _COLSRED_ = null;

var _COLSRED_HDR_ = [
  ['trajo', 'Trajo el Cliente'],
  ['tel',   'Teléfono Cliente'],
  /* 28/9/2026: QUE vendedor, no solo que fue "un vendedor". El cliente del
     barrio de Rufo que compra con MARCOS10 entra igual a la hoja de Rufo —la
     tienda rutea por barrio—, asi que sin esta columna el hecho de que lo
     trajo Marcos no queda escrito en ningun lado. A quien se le paga lo decide
     Tadeo; el dato se guarda igual, porque a fin de mes no se reconstruye. */
  ['cod',   'Vendedor que Trajo']
];

var ESCALA_RED_CACHE_SEG = 6 * 3600;          // 6 h: la escala casi nunca cambia

var ESCALA_RED_PROP = 'ESCALA_RED_COPIA';     // la ultima que se pudo leer

var ESCALA_RED_VISTA_SEL = 'seller_commission_rate_calc?select=product_sku,product_name,level,amount,rule_amount,source,sale_price,unit_cost';

function _escalaRedFuente_() {
  var m = String(_cfgTexto_('ESCALA_RED_FUENTE', 'tabla') || '').trim().toLowerCase();
  return (m === 'medir' || m === 'productos') ? m : 'tabla';
}

var CARNE_FIJA_DESDE = '2026-10-16';

var CARNE_FIJA_COLS = ['Com Red Inicial', 'Com Red Intermedio', 'Com Red Top'];

var CARNE_FIJA_NIVELES = ['inicial', 'intermedio', 'top'];

var CARNE_FIJA_PCT = [5, 6, 7];

function _carneFijaR50_(precio, pct) {
  return Math.round((Number(precio) || 0) * pct / 5000) * 50;
}

function _carneFijaDeFilas_(vals) {
  if (!vals || !vals.length) return null;
  var h = vals[0].map(function (x) { return String(x || '').trim(); });
  var cA = h.indexOf('Abreviatura'), cP = h.indexOf('Precio'), cU = h.indexOf('Unidad');
  var cM = CARNE_FIJA_COLS.map(function (n) { return h.indexOf(n); });
  if (cA < 0 || cP < 0 || cU < 0 || cM.some(function (c) { return c < 0; })) return null;
  var montos = {}, escribir = [];
  for (var i = 1; i < vals.length; i++) {
    var f = vals[i], sku = String(f[cA] || '').trim();
    if (!sku || String(f[cU] || '').trim().toLowerCase() !== 'kg') continue;
    var m = {}, nuevos = null;
    for (var k = 0; k < 3; k++) {
      var v = f[cM[k]];
      if (v === '' || v === null || v === undefined || isNaN(Number(v))) {
        var precio = Number(f[cP]) || 0;
        if (!(precio > 0)) { m = null; break; }   // sin precio no se inventa un monto
        v = _carneFijaR50_(precio, CARNE_FIJA_PCT[k]);
        nuevos = nuevos || {};
        nuevos[k] = v;
      }
      m[CARNE_FIJA_NIVELES[k]] = Number(v);
    }
    if (!m) continue;
    montos[sku] = m;
    if (nuevos) escribir.push({ fila: i + 1, cols: cM.map(function (c) { return c + 1; }), valores: [m.inicial, m.intermedio, m.top] });
  }
  return { montos: montos, escribir: escribir };
}

var _PROD_VALORES_ = null;

function _carneFijaLeer_() {
  var sh = SS.getSheetByName('Productos');
  if (!sh) throw new Error('no esta la hoja Productos');
  var r = _carneFijaDeFilas_(_PROD_VALORES_ || sh.getDataRange().getValues());
  if (!r) throw new Error('faltan en Productos las columnas ' + CARNE_FIJA_COLS.join(' / '));
  if (r.escribir.length && !_SECO_) {
    r.escribir.forEach(function (w) {
      w.cols.forEach(function (c, k) { sh.getRange(w.fila, c).setValue(w.valores[k]); });
    });
  }
  return r.montos;
}

function _escalaRedConCarne_(esc, carne) {
  if (!esc || !carne) return esc;
  esc.carneAntes = {};
  Object.keys(carne).forEach(function (sku) {
    esc.carneAntes[sku] = esc.montos[sku] || null;
    esc.montos[sku] = carne[sku];
  });
  esc.carneDesde = CARNE_FIJA_DESDE;
  return esc;
}

function _carneFijaDiaFila_(fila) {
  var d = fila && fila[10];
  if (d instanceof Date && !isNaN(d.getTime())) return new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(d || '').trim());
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  m = /^(\d{4}-\d{2}-\d{2})/.exec(String(d || '').trim());
  return m ? m[1] : '';
}

function _escalaRedMontos_(cfg, sinSkus) {
  var fuente = _escalaRedFuente_();
  var tabla = fuente === 'productos' ? null : _crmPgFetch_(cfg, 'get', 'seller_commission_rate?select=product_sku,level,amount');
  if (fuente === 'tabla') return tabla;
  var vista = null;
  try { vista = _crmPgFetch_(cfg, 'get', ESCALA_RED_VISTA_SEL); } catch (eV) { vista = null; }
  if (!vista || !vista.length) {
    /* Una vez por lectura de la base (la copia dura 6 h): no es ruido. */
    _alertaTecnica_('escala Red', 'La escala desde Productos no contestó: se paga con la tabla', [
      'ESCALA_RED_FUENTE está en «' + fuente + '» pero la vista seller_commission_rate_calc no devolvió nada (¿falta pegar la 052?).',
      'No se pierde nada: los montos salen de seller_commission_rate, como antes de la palanca.']);
    return tabla || _crmPgFetch_(cfg, 'get', 'seller_commission_rate?select=product_sku,level,amount');
  }
  var _fuera = function (x) { return !(sinSkus && sinSkus[x.product_sku]); };
  try { _escalaRedVigilar_(vista.filter(_fuera), fuente === 'medir' && tabla ? tabla.filter(_fuera) : null); } catch (eW) { try { _logError_('escala Red vigilar: ' + (eW && eW.message || eW)); } catch (e2) {} }
  return fuente === 'productos' ? vista : tabla;
}

function _escalaRedLeer_() {
  var cache = null;
  try {
    cache = CacheService.getScriptCache();
    var crudo = cache.get('escala_red');
    if (crudo) return JSON.parse(crudo);
  } catch (eC) {}

  var props = PropertiesService.getScriptProperties();
  var esc = null;
  try {
    var cfg = _crmPgConfig_();
    if (cfg.enabled) {
      var bandas = _crmPgFetch_(cfg, 'get',
        'seller_level_band?select=level,min_monthly_sales&order=min_monthly_sales.asc');
      /* La carne primero: si Productos no se puede leer, tira y se usa la copia. */
      var carne = _carneFijaLeer_();
      var montos = _escalaRedMontos_(cfg, carne);
      /* Las dos tienen que venir con filas. Una escala a medias liquidaria
         algunos productos y otros no, que es peor que no liquidar ninguno. */
      if (bandas && bandas.length && montos && montos.length) {
        /* `leida`: cuando se leyo de la base. La pantalla de la escala lo
           muestra para que se sepa de cuando son los montos (la copia dura 6 h). */
        esc = { bandas: [], montos: {}, leida: Date.now() };
        for (var i = 0; i < bandas.length; i++) {
          esc.bandas.push({ nivel: String(bandas[i].level || ''),
                            desde: Number(bandas[i].min_monthly_sales) || 0 });
        }
        for (var j = 0; j < montos.length; j++) {
          var sku = String(montos[j].product_sku || '');
          if (!sku) continue;
          if (!esc.montos[sku]) esc.montos[sku] = {};
          esc.montos[sku][String(montos[j].level || '')] = Number(montos[j].amount) || 0;
        }
        _escalaRedConCarne_(esc, carne);
      }
    }
  } catch (eF) { esc = null; }

  if (esc && esc.bandas.length) {
    try { cache.put('escala_red', JSON.stringify(esc), ESCALA_RED_CACHE_SEG); } catch (e1) {}
    try { props.setProperty(ESCALA_RED_PROP, JSON.stringify(esc)); } catch (e2) {}
    return esc;
  }
  /* La base no contesto. La copia de la ultima vez es vieja pero es CIERTA:
     estos numeros cambian cada varios meses, no cada dia. */
  try {
    var guardada = props.getProperty(ESCALA_RED_PROP);
    if (guardada) return JSON.parse(guardada);
  } catch (e3) {}
  return null;
}

var ESCALA_RED_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

var ESCALA_RED_COL_VEND = 8;    // Vendedor

var ESCALA_RED_COL_FACT = 21;   // Facturado (= Total - Envio)

var ESCALA_RED_COL_COM  = 47;   // Comision

var ESCALA_RED_COL_MES  = 69;   // Mes Entrega  ("Octubre", sin año)

var ESCALA_RED_COL_ANIO = 71;   // Año Entrega

function _escalaRedMesHoy_() {
  var d = new Date(new Date().toLocaleString('en-US',
    { timeZone: 'America/Argentina/Buenos_Aires' }));
  return { mes: ESCALA_RED_MESES[d.getMonth()], anio: d.getFullYear() };
}

function _escalaRedCuentaNivel_(fila, cT) {
  return !(cT && String(fila[cT - 1] || '').trim() === 'Maleu');
}

function _escalaRedFacturadoMes_(sh, vendedor, mes, anio) {
  var v = String(vendedor || '').trim().toLowerCase();
  if (!v) return 0;
  var t = _escalaRedFacturadoMesTodos_(sh, mes, anio)[v];
  return t ? t.total : 0;
}

function _escalaRedFacturadoMesTodos_(sh, mes, anio) {
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  var cT = 0;
  try { cT = _colsRedOrigen_(sh, false).trajo || 0; } catch (eT) { cT = 0; }
  var ancho = Math.max(ESCALA_RED_COL_ANIO, ESCALA_RED_COL_FACT, cT);
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, ancho).getValues();
  for (var i = 0; i < vals.length; i++) {
    var nom = String(vals[i][ESCALA_RED_COL_VEND - 1] || '').trim();
    if (!nom) continue;
    if (String(vals[i][ESCALA_RED_COL_MES - 1] || '').trim() !== mes) continue;
    if (String(vals[i][ESCALA_RED_COL_ANIO - 1] || '').trim() !== String(anio)) continue;
    if (!_escalaRedCuentaNivel_(vals[i], cT)) continue;
    var k = nom.toLowerCase();
    if (!out[k]) out[k] = { nombre: nom, total: 0 };
    out[k].total += Number(vals[i][ESCALA_RED_COL_FACT - 1]) || 0;
  }
  return out;
}

function _escalaRedNivelVendedor_(sh, esc, vendedor, mes, anio) {
  var clave = 'escnv_' + String(vendedor || '').trim().toLowerCase() + '_' + mes + anio;
  try {
    var c = CacheService.getScriptCache(), hit = c.get(clave);
    if (hit) return hit;
  } catch (e) {}
  var nivel = _escalaRedNivel_(esc, _escalaRedFacturadoMes_(sh, vendedor, mes, anio));
  try { CacheService.getScriptCache().put(clave, nivel, 600); } catch (e2) {}
  return nivel;
}

function _escalaRedNivel_(esc, facturado) {
  if (!esc || !esc.bandas || !esc.bandas.length) return '';
  var f = Number(facturado) || 0, nivel = esc.bandas[0].nivel;
  // Vienen ordenadas de menor a mayor: gana el ultimo corte que alcanza.
  for (var i = 0; i < esc.bandas.length; i++) {
    if (f >= esc.bandas[i].desde) nivel = esc.bandas[i].nivel;
  }
  return nivel;
}

var ESCALA_RED_DESDE_YM = 202610;   // octubre de 2026

function _escalaRedYmFila_(fila) {
  var mes = String(fila[ESCALA_RED_COL_MES - 1] || '').trim();
  var anio = Number(String(fila[ESCALA_RED_COL_ANIO - 1] || '').trim()) || 0;
  if (!mes || !anio) return 0;
  var i = ESCALA_RED_MESES.indexOf(mes);
  if (i < 0) return 0;
  return anio * 100 + (i + 1);
}

function _escalaRedComisionFila_(esc, nivel, fila) {
  if (!esc || !nivel || !fila) return null;
  var total = 0, faltantes = [];
  var cols = Object.keys(_colsAbbr_('Red'));
  for (var i = 0; i < cols.length; i++) {
    var col = Number(cols[i]);
    var q = Number(fila[col - 1]) || 0;
    if (!q) continue;
    var abbr = _colsAbbr_('Red')[col];
    var m = esc.montos[abbr];
    /* La carne de un pedido de antes del 16/10: el monto de antes. */
    if (esc.carneAntes && Object.prototype.hasOwnProperty.call(esc.carneAntes, abbr)) {
      var _dia = _carneFijaDiaFila_(fila);
      if (_dia && _dia < (esc.carneDesde || CARNE_FIJA_DESDE)) m = esc.carneAntes[abbr];
    }
    if (!m || typeof m[nivel] !== 'number') { faltantes.push(abbr); continue; }
    total += q * m[nivel];
  }
  return { total: total, faltantes: faltantes };
}

function _escalaRedDeFila_(sh, row, vendedor, fila, esc) {
  var ym = _escalaRedYmFila_(fila);
  if (ym && ym < ESCALA_RED_DESDE_YM) return { aplica: false };

  /* Una comision FUERA DE ESCALA gana siempre (2/10/2026), y va antes que la
     escala: si la base no contesta, el monto que se acordo con el vendedor
     sigue siendo ese, no el 17% de respaldo. */
  var _exc = _redExcDeFila_(sh, row);
  if (_exc) return { aplica: true, ok: true, total: _exc.monto, nivel: '', excepcion: true,
                     motivoExc: _exc.motivo, provisorio: false, faltantes: [] };

  if (!esc) return { aplica: true, ok: false, motivo: 'no pude leer la escala' };

  /* El cliente que trajimos nosotros no paga comision. Ya era asi con el 17% y
     no cambia: lo unico que cambia es cuanto se le paga al que SI lo trajo. */
  try {
    var cT = _colsRedOrigen_(sh, false).trajo;
    if (cT && String(fila[cT - 1] || '').trim() === 'Maleu') {
      return { aplica: true, ok: true, total: 0, nivel: '', provisorio: false, faltantes: [] };
    }
  } catch (eT) {}

  var mes, anio, provisorio = false;
  if (ym) {
    mes = String(fila[ESCALA_RED_COL_MES - 1] || '').trim();
    anio = Number(String(fila[ESCALA_RED_COL_ANIO - 1] || '').trim()) || 0;
  } else {
    var hoy = _escalaRedMesHoy_();
    mes = hoy.mes; anio = hoy.anio; provisorio = true;
  }

  var nivel = _escalaRedNivelVendedor_(sh, esc, vendedor, mes, anio);
  if (!nivel) return { aplica: true, ok: false, motivo: 'la escala vino sin niveles' };

  var r = _escalaRedComisionFila_(esc, nivel, fila);
  if (!r) return { aplica: true, ok: false, motivo: 'no pude calcular la fila' };
  return { aplica: true, ok: true, total: r.total, nivel: nivel,
           provisorio: provisorio, faltantes: r.faltantes };
}

var RED_EXC_HDR = { monto: 'Comisión Excepción', motivo: 'Motivo Excepción' };

var _REDEXC_COLS_ = null;

function _redExcCols_(sh, crear) {
  if (!crear && _REDEXC_COLS_) return _REDEXC_COLS_;
  var out = { monto: 0, motivo: 0 };
  if (!sh) return out;
  /* Entre ejecuciones (28/10/2026), como `_rbCols_`: la escala lo pide despues de escribir Red. Solo con
     las dos: nada que crear, tambien con `crear`. */
  try { var _ce = CacheService.getScriptCache().get('red_exc_cols_v1'); if (_ce) { _REDEXC_COLS_ = JSON.parse(_ce); return _REDEXC_COLS_; } } catch (eCe) {}
  var lc = sh.getLastColumn();
  var hdr = sh.getRange(1, 1, 1, lc).getValues()[0];
  for (var i = 0; i < hdr.length; i++) {
    var nm = String(hdr[i]).trim();
    if (nm === RED_EXC_HDR.monto) out.monto = i + 1;
    else if (nm === RED_EXC_HDR.motivo) out.motivo = i + 1;
  }
  if (crear) {
    var c = lc;
    if (!out.monto) { c++; sh.getRange(1, c).setValue(RED_EXC_HDR.monto); out.monto = c;
      sh.getRange(2, c, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('#,##0'); }
    if (!out.motivo) { c++; sh.getRange(1, c).setValue(RED_EXC_HDR.motivo); out.motivo = c;
      sh.getRange(2, c, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@'); }
  }
  _REDEXC_COLS_ = out;
  if (out.monto && out.motivo) { try { CacheService.getScriptCache().put('red_exc_cols_v1', JSON.stringify(out), 600); } catch (ePe) {} }
  return out;
}

function _redExcMonto_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = Number(v);
  return (isFinite(n) && n >= 0) ? Math.round(n) : null;
}

function _redExcDeFila_(sh, row) {
  if (!sh || !(row > 1)) return null;
  var cols = _redExcCols_(sh, false);
  if (!cols.monto) return null;
  var m = _redExcMonto_(sh.getRange(row, cols.monto).getValue());
  if (m === null) return null;
  return { monto: m, motivo: cols.motivo ? String(sh.getRange(row, cols.motivo).getValue() || '').trim() : '' };
}

function _colsRedOrigen_(sh, crear) {
  if (!sh) return { trajo: 0, tel: 0, cod: 0 };
  if (_COLSRED_) return _COLSRED_;
  /* Entre ejecuciones tambien (28/10/2026), como `_rbCols_`: el alta de Red lo pedia justo despues del
     appendRow, y leer el encabezado ahi hace recalcular la planilla. Solo con las tres: nada que crear. */
  try { var _cr = CacheService.getScriptCache().get('red_cols_origen_v1'); if (_cr) { _COLSRED_ = JSON.parse(_cr); return _COLSRED_; } } catch (eCr) {}
  var lc = sh.getLastColumn();
  var hdr = sh.getRange(1, 1, 1, lc).getValues()[0];
  var out = { trajo: 0, tel: 0, cod: 0 };
  for (var i = 0; i < hdr.length; i++) {
    var nm = String(hdr[i]).trim();
    for (var h = 0; h < _COLSRED_HDR_.length; h++) {
      if (nm === _COLSRED_HDR_[h][1]) out[_COLSRED_HDR_[h][0]] = i + 1;
    }
  }
  var faltan = _COLSRED_HDR_.filter(function (h) { return !out[h[0]]; });
  if (crear && faltan.length) {
    var c = lc;
    faltan.forEach(function (h) { c++; sh.getRange(1, c).setValue(h[1]); out[h[0]] = c; });
    /* La columna ENTERA en formato texto, no solo el encabezado: es lo que
       evita el 1899 de las celdas vacias. */
    _COLSRED_HDR_.forEach(function (h) {
      if (out[h[0]]) sh.getRange(1, out[h[0]], sh.getMaxRows(), 1).setNumberFormat('@');
    });
  }
  if (out.trajo && out.tel && out.cod) { _COLSRED_ = out; try { CacheService.getScriptCache().put('red_cols_origen_v1', JSON.stringify(out), 600); } catch (ePr) {} }
  return out;
}

var RED_RECLAMO_COL = 'Reclamo Cliente';

function _colReclamo_(sh, crear) {
  if (!sh) return 0;
  var ancho = sh.getLastColumn();
  var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
  for (var i = 0; i < cab.length; i++) {
    if (String(cab[i] == null ? '' : cab[i]).trim() === RED_RECLAMO_COL) return i + 1;
  }
  if (!crear) return 0;
  var c = ancho + 1;
  if (c > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), c - sh.getMaxColumns());
  sh.getRange(1, c).setValue(RED_RECLAMO_COL).setFontWeight('bold');
  sh.getRange(2, c, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
  SpreadsheetApp.flush();
  return c;
}

function _reclamoLeer_(sello) {
  var p = String(sello == null ? '' : sello).split('|').map(function (x) { return x.trim(); });
  var e = p[0] || '';
  if (e !== 'Pendiente' && e !== 'Aprobado' && e !== 'Rechazado') e = '';
  return { estado: e, quien: e ? (p[1] || '') : '', el: e ? (p[2] || '') : '' };
}

function _redReclamosListar_() {
  var out = { pendientes: [], decididos: [] };
  var sh = SS.getSheetByName('Red');
  if (!sh || sh.getLastRow() < 2) return out;
  var colR = _colReclamo_(sh, false);
  if (!colR) return out;
  var lr = sh.getLastRow();
  var sellos = sh.getRange(2, colR, lr - 1, 1).getValues();
  var cT = _colsRedOrigen_(sh, false).trajo;
  var iLq = _liqRedIdx_();
  var lim = Date.now() - 7 * 86400000;
  var esc = null, escLeida = false;
  for (var i = 0; i < sellos.length; i++) {
    var rc = _reclamoLeer_(sellos[i][0]);
    if (!rc.estado) continue;
    var row = i + 2;
    if (rc.estado !== 'Pendiente') {
      var m = rc.el.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
      var t = m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime() : 0;
      if (t && t < lim) continue;
    }
    var f = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    var it = { row: row, n: String(f[1]).trim(), c: String(f[8] || '').trim(), v: String(f[7] || '').trim(),
               de: _rbDiaEntrega_(f[10]).txt, tot: Number(f[14]) || 0, env: Number(f[15]) || 0,
               fac: Number(f[20]) || 0, com: Number(f[ESCALA_RED_COL_COM - 1]) || 0,
               es: String(f[11] || '').trim(), ep: String(f[13] || '').trim(),
               liq: (iLq >= 0 && iLq < f.length) ? String(f[iLq] || '').trim() : '', rc: rc };
    if (rc.estado === 'Pendiente') {
      if (!escLeida) { escLeida = true; try { esc = _escalaRedLeer_(); } catch (eE) { esc = null; } }
      try {
        var g = f.slice();
        if (cT) g[cT - 1] = '';
        var r = _escalaRedDeFila_(sh, row, it.v, g, esc);
        it.comNueva = (r && r.aplica && r.ok) ? Math.round(r.total) : null;
        if (r && !r.aplica) it.comNuevaNota = 'pedido de antes de la escala';
        else if (r && !r.ok) it.comNuevaNota = r.motivo || 'no se pudo calcular';
      } catch (eC) { it.comNueva = null; it.comNuevaNota = String(eC && eC.message || eC); }
      out.pendientes.push(it);
    } else out.decididos.push(it);
  }
  out.decididos.sort(function (a, b) { return b.row - a.row; });
  return out;
}

var LIQ_RED_COL = 'Comisión Liquidada';

var _LIQ_RED_IDX_ = null;

function _liqRedActiva_() { return _cfgSiNo_('LIQUIDACION_RED', false); }

/** Indice (0-based) de «Comisión Liquidada» en la hoja Red, o -1. Una lectura
 *  del encabezado por ejecucion, y ninguna con la palanca apagada. */
function _liqRedIdx_() {
  if (_LIQ_RED_IDX_ != null) return _LIQ_RED_IDX_;
  var i = -1;
  try {
    if (_liqRedActiva_()) {
      var sh = SS.getSheetByName('Red');
      if (sh) i = _liqRedCol_(sh, false) - 1;
    }
  } catch (e) { i = -1; }
  _LIQ_RED_IDX_ = i;
  return i;
}

function _liqRedIdx_() {
  if (_LIQ_RED_IDX_ != null) return _LIQ_RED_IDX_;
  var i = -1;
  try {
    if (_liqRedActiva_()) {
      var sh = SS.getSheetByName('Red');
      if (sh) i = _liqRedCol_(sh, false) - 1;
    }
  } catch (e) { i = -1; }
  _LIQ_RED_IDX_ = i;
  return i;
}

function _liqRedCol_(sh, crear) {
  if (!sh) return 0;
  var ancho = sh.getLastColumn();
  var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
  for (var i = 0; i < cab.length; i++) {
    if (String(cab[i] == null ? '' : cab[i]).trim() === LIQ_RED_COL) return i + 1;
  }
  if (!crear) return 0;
  var c = ancho + 1;
  if (c > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), c - sh.getMaxColumns());
  sh.getRange(1, c).setValue(LIQ_RED_COL).setFontWeight('bold');
  sh.getRange(2, c, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
  SpreadsheetApp.flush();
  _LIQ_RED_IDX_ = null;
  return c;
}

var RB_DIAS_ = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function _rbDiasParse_(s) {
  var MAP = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', 'miércoles': 'Miércoles',
              jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', 'sábado': 'Sábado',
              domingo: 'Domingo' };
  var out = [];
  String(s == null ? '' : s).split(/[,;\/]|\sy\s/).forEach(function (p) {
    var k = String(p).trim().toLowerCase();
    if (MAP[k] && out.indexOf(MAP[k]) < 0) out.push(MAP[k]);
  });
  return out;
}

function _rbDiaEntrega_(cel) {
  var f = null;
  if (cel instanceof Date) f = cel;
  else {
    var m = String(cel == null ? '' : cel).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) f = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  if (f) {
    var dd = ('0' + f.getDate()).slice(-2), mm = ('0' + (f.getMonth() + 1)).slice(-2);
    return { fecha: f, dia: RB_DIAS_[f.getDay()], txt: RB_DIAS_[f.getDay()] + ' ' + dd + '/' + mm };
  }
  var s = String(cel == null ? '' : cel).trim();
  var d = _rbDiasParse_(s);
  return { fecha: null, dia: d.length ? d[0] : '', txt: s };
}

var _SECO_ = false;

function _cfgSiNo_(clave, porDefecto) {
  try {
    var ck = 'cfgsn_' + clave;
    if (_CFG_MEMO_ && _CFG_MEMO_[ck]) return _CFG_MEMO_[ck] === 'si';   /* ver `_cfgPrimar_` */
    var c = CacheService.getScriptCache().get(ck);
    if (c) { if (_CFG_MEMO_) _CFG_MEMO_[ck] = c; return c === 'si'; }
    var v = porDefecto ? 'si' : 'no';
    var cfgF = _cfgFilasConfig_();
    if (cfgF.length > 1) {
      var rows = cfgF;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toUpperCase() === clave) {
          var x = String(rows[i][1]).trim().toLowerCase();
          v = (x === 'si' || x === 'sí' || x === 'on' || x === 'true') ? 'si' : 'no';
          break;
        }
      }
    }
    CacheService.getScriptCache().put(ck, v, 300);
    if (_CFG_MEMO_) _CFG_MEMO_[ck] = v;
    return v === 'si';
  } catch (err) { return !!porDefecto; }
}

var manana = new Date();

var dd = String(manana.getDate()).padStart(2,'0');

var mm = String(manana.getMonth()+1).padStart(2,'0');

function _cfgFilasConfig_() {
  var c = null, j = null;
  try { c = CacheService.getScriptCache(); j = JSON.parse(c.get('cfg_filas') || 'null'); } catch (e) { j = null; }
  if (!j || !j.f) {
    var sh = SS.getSheetByName('Config_Maleu'), f = [];
    if (sh && sh.getLastRow() > 1) f = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
    j = { t: Date.now(), f: f };
    try { if (c && f.length) c.put('cfg_filas', JSON.stringify(j), 300); } catch (e2) {}
  }
  return j.f;
}

var _CFG_MEMO_ = null;

function _cfgTexto_(clave, porDefecto) {
  try {
    var ck = 'cfgtx_' + clave;
    if (_CFG_MEMO_ && _CFG_MEMO_[ck] != null) return _CFG_MEMO_[ck];
    var c = CacheService.getScriptCache(), v = c.get(ck);
    if (v != null) { if (_CFG_MEMO_) _CFG_MEMO_[ck] = v; return v; }
    v = porDefecto;
    var cfgF = _cfgFilasConfig_();
    if (cfgF.length > 1) {
      var rows = cfgF;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toUpperCase() === clave) { v = String(rows[i][1]).trim().toLowerCase() || porDefecto; break; }
      }
    }
    c.put(ck, v, 300);
    if (_CFG_MEMO_ && v != null) _CFG_MEMO_[ck] = v;
    return v;
  } catch (e) { return porDefecto; }
}


function _remFecha_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s == null ? '' : String(s));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null;
}
function _remCelda_(v) {
  if (v && typeof v === 'object' && v.$d) return new Date(v.$d);   // celda cruda de Red (191)
  if (typeof v === 'string') { var f = _remFecha_(v); if (f) return f; }
  return v == null ? '' : v;
}
function _remPoner_(filas, row, fila) { while (filas.length < row - 1) filas.push([]); filas[row - 1] = fila; }
/* Las hojas chicas: su encabezado, en orden (se leen por posicion). */
var _REM_CAB_ = {
  Vendedores: ['Nombre', 'WhatsApp', 'Alias MP', 'Barrios (separados por coma)', 'Partido', 'Localidad', 'Estado',
    'Usuario', 'PIN', 'Comisión %', 'Notas', 'Días', 'Telegram'],
  Proveedores: ['N° de Productos', 'Producto', 'Proveedor', 'Gustos', 'Abreviatura', 'Info Relevante', 'Canal de Venta', 'Costo',
    'Venta Directa', 'Clubes'],
  Config_Maleu: ['Parámetro', 'Valor', 'Activo desde', 'Notas']
};
/* Productos: las columnas que se leen por posicion (B nombre, C abreviatura, I precio, J costo,
   Q unidad) y por nombre (Abreviatura, Precio, Unidad y las tres «Com Red», Y:AA). */
function _remCargar_(d) {
  var H = {}, cabP = [];
  for (var i = 0; i < 27; i++) cabP.push('');
  cabP[0] = 'N°'; cabP[1] = 'Producto'; cabP[2] = 'Abreviatura'; cabP[8] = 'Precio'; cabP[9] = 'Costo'; cabP[16] = 'Unidad';
  cabP[24] = 'Com Red Inicial'; cabP[25] = 'Com Red Intermedio'; cabP[26] = 'Com Red Top';
  var v = function (x) { return x == null ? '' : x; };
  H.Productos = new _Hoja('Productos', [cabP].concat((d.prod || []).map(function (x, k) {
    var f = []; for (var j = 0; j < 27; j++) f.push('');
    f[0] = k + 1; f[1] = x.n; f[2] = x.a; f[8] = v(x.precio); f[9] = v(x.costo); f[16] = x.u; f[24] = v(x.ri); f[25] = v(x.rm); f[26] = v(x.rt);
    return f;
  })));
  var red = [(d.cab || []).slice()];
  (d.red || []).forEach(function (x) { _remPoner_(red, x[0], (x[1] || []).map(_remCelda_)); });
  H.Red = new _Hoja('Red', red);
  var hj = d.hojas || {};
  Object.keys(_REM_CAB_).forEach(function (n) {
    var cab = _REM_CAB_[n], out = [cab.slice()];
    (hj[n] || []).forEach(function (x) { _remPoner_(out, x.row, cab.map(function (k) { return _remCelda_(x.d[k]); })); });
    H[n] = new _Hoja(n, out);
  });
  _HOJAS = H; _RE = d;
}

/* datos: lo que devuelve red_bandeja_extra_pantalla (246). opts.ahora: fijar el reloj (la prueba). Devuelve lo
   mismo que `?action=redBandejaExtra` de un admin: {ok, links, reclamos: {pendientes, decididos}}. */
G.RX_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _remCargar_(datos || {});
      _CFG_MEMO_ = null; _COLSRED_ = null; _PROD_VALORES_ = null; _SECO_ = true; _LIQ_RED_IDX_ = null;
      var o = { ok: true, links: (datos && datos.links) || {} };
      if (datos && datos.red) {
        try { o.reclamos = _redReclamosListar_(); } catch (e) { o.reclamosErr = String(e && e.message || e); }
      }
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _RE = {}; }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
