/* LO COMUN DE LOS MOTORES (204 en adelante, 27/10/2026). _tools/copiar_motor.js lo pone ANTES del shim
   de cada motor nuevo: un reloj que se puede fijar, una hoja que contesta como Apps Script
   (`getRange`, `getValues`, `getDataRange`...) y los servicios que el codigo copiado toca sin necesitar
   (cache y propiedades vacias, ninguna escritura). Los de la 164 a la 203 tienen esto adentro. */

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

/* (5/11/2026, noche) FILAS NEGATIVAS: lo nacido en la base (pedidos de la tienda y el portal, parciales y rendiciones que
   escribe la base) no tiene fila de planilla y lleva una NEGATIVA. `_motPoner_` la perdía en silencio (un índice negativo no
   es una fila): Caja no veía esos cobros. Ahora se separan al poner, van al final de su hoja en una fila prestada, y
   `_motFilasReales_` les devuelve su número en lo que arma el motor (mismo arreglo que la 538 en el portal). */
var _MOT_FALSAS_ = {};
function _motFalsasReset_() { _MOT_FALSAS_ = {}; }
function _Hoja(nombre, filas) {
  if (filas && filas.__neg) {
    filas.__neg.forEach(function (z) { filas.push(z[1]); (_MOT_FALSAS_[nombre] = _MOT_FALSAS_[nombre] || {})[filas.length] = z[0]; });
    delete filas.__neg;
  }
  this.n = nombre; this.f = filas;
}
/* Las filas negativas que se pusieron DESPUÉS de crear la hoja (Caja crea la hoja y después la llena): al terminar de
   cargar, se agregan al final de su hoja. */
function _motNegCerrar_(H) {
  Object.keys(H || {}).forEach(function (n) {
    var f = H[n] && H[n].f;
    if (f && f.__neg) {
      f.__neg.forEach(function (z) { f.push(z[1]); (_MOT_FALSAS_[n] = _MOT_FALSAS_[n] || {})[f.length] = z[0]; });
      delete f.__neg;
    }
  });
}
function _motFilasReales_(o, hoja) {
  if (Array.isArray(o)) { o.forEach(function (x) { _motFilasReales_(x, hoja); }); return o; }
  if (o && typeof o === 'object') {
    var h = typeof o.h === 'string' ? o.h : (typeof o.hoja === 'string' ? o.hoja : hoja);
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if ((k === 'r' || k === 'row' || k === 'fila') && typeof v === 'number' && v > 1) {
        var real = null;
        if (h && _MOT_FALSAS_[h] && _MOT_FALSAS_[h][v] != null) real = _MOT_FALSAS_[h][v];
        /* sin hoja a la vista no se toca: una fila 5 de Gastos no es la fila prestada 5 de otra hoja */
        if (real != null) o[k] = real;
      } else _motFilasReales_(v, h);
    });
  }
  return o;
}
_Hoja.prototype.getName = function () { return this.n; };
_Hoja.prototype.getLastRow = function () { return this.f.length; };
_Hoja.prototype.getLastColumn = function () { var m = 0; this.f.forEach(function (x) { if (x.length > m) m = x.length; }); return m; };
_Hoja.prototype.getMaxColumns = function () { return this.getLastColumn(); };
_Hoja.prototype.getMaxRows = function () { return this.getLastRow(); };
_Hoja.prototype.getRange = function (r, c, nr, nc) {
  var f = this.f, out = [];
  nr = nr || 1; nc = nc || 1;
  for (var i = 0; i < nr; i++) { var fila = f[r - 1 + i] || [], o = []; for (var j = 0; j < nc; j++) { var v = fila[c - 1 + j]; o.push(v === undefined || v === null ? '' : v); } out.push(o); }
  var rg = { getValues: function () { return out; }, getValue: function () { return out[0][0]; }, getDisplayValues: function () { return out; },
    setValues: function () { return rg; }, setValue: function () { return rg; }, setFontWeight: function () { return rg; },
    setNumberFormat: function () { return rg; }, setBackground: function () { return rg; }, setFontColor: function () { return rg; } };
  return rg;
};
_Hoja.prototype.getDataRange = function () { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); };
_Hoja.prototype.appendRow = function () {};
_Hoja.prototype.setFrozenRows = function () {};
_Hoja.prototype.setColumnWidths = function () {};
var _HOJAS = {};
var SS = { getSheetByName: function (n) { return _HOJAS[n] || null; }, insertSheet: function (n) { return new _Hoja(n, []); } };
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
function _logError_() {}
/* Un texto «aaaa-mm-dd[ hh:mm:ss]» es una fecha de la hoja (Apps Script la entrega como Date); una celda
   cruda `{$d}` (186/191), tambien. */
function _motFecha_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s == null ? '' : String(s));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null;
}
function _motCelda_(v) {
  if (v && typeof v === 'object' && v.$d) return new Date(v.$d);
  if (typeof v === 'string') { var f = _motFecha_(v); if (f) return f; }
  return v == null ? '' : v;
}
function _motPoner_(filas, row, fila) {
  if (Number(row) < 0) { (filas.__neg = filas.__neg || []).push([Number(row), fila]); return; }   /* (noche) ver _Hoja */
  while (filas.length < row - 1) filas.push([]); filas[row - 1] = fila;
}
