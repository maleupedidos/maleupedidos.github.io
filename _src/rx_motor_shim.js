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

/*MOTOR*/

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
