/* EL «MINI APPS SCRIPT» DEL PORTAL DEL VENDEDOR (191, 27/10/2026). Mismo modelo que el de las
   jugadas (164) y el de objetivos (190): _tools/copiar_motor.js pone donde dice MOTOR (entre
   barra-asterisco) `_doGetDashboardVendedor` y todo lo que llama, copiado de Code.js, MENOS lo que
   este shim reemplaza (abajo). Los datos son los de `dashboard_vendedor_pantalla` (191).
   El motor arma los NUMEROS (stats, pedidos, clientes, lo rendido por semana, cuentas). Lo que
   abrir el portal HACE y lo que sale de esos calculos (tareas, objetivo, Telegram, escala,
   liquidaciones) lo trae `dashboardVendedorEfectos` de Apps Script: aca va vacio. */

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
_Hoja.prototype.getRange = function (r, c, nr, nc) {
  var f = this.f, out = [];
  nr = nr || 1; nc = nc || 1;
  for (var i = 0; i < nr; i++) { var fila = f[r - 1 + i] || [], o = []; for (var j = 0; j < nc; j++) { var v = fila[c - 1 + j]; o.push(v === undefined || v === null ? '' : v); } out.push(o); }
  return { getValues: function () { return out; }, getDisplayValues: function () { return out; } };
};
_Hoja.prototype.getDataRange = function () { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); };
var _HOJAS = {}, _DV = null;
var SS = { getSheetByName: function (n) { return _HOJAS[n] || null; } };
var CacheService = { getScriptCache: function () { return { get: function () { return null; }, put: function () {} }; } };
var PropertiesService = { getScriptProperties: function () { return { getProperties: function () { return {}; },
  getProperty: function () { return null; }, setProperty: function () {} }; } };
var ContentService = { MimeType: { JSON: 'json' },
  createTextOutput: function (s) { return { setMimeType: function () { return this; }, getContent: function () { return s; } }; } };
var Utilities = { formatDate: function (d, tz, fmt) {
  var dos = function (n) { return (n < 10 ? '0' : '') + n; };
  return String(fmt).replace(/yyyy|yy|MM|dd|HH|mm|ss/g, function (t) {
    return t === 'yyyy' ? d.getFullYear() : t === 'yy' ? dos(d.getFullYear() % 100) : t === 'MM' ? dos(d.getMonth() + 1)
      : t === 'dd' ? dos(d.getDate()) : t === 'HH' ? dos(d.getHours()) : t === 'mm' ? dos(d.getMinutes()) : dos(d.getSeconds());
  });
} };

/*MOTOR*/

/* Una celda de fecha como la da `getValues`. String() de una fecha en Apps Script (la planilla en
   español, hora de Argentina) da «Fri Oct 09 2026 18:37:20 GMT-0300 (hora estándar de Argentina)»,
   y el portal lo muestra (`fpmF`): el navegador lo escribiria a su manera, asi que se fija igual. */
var _DV_DIAS_ = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var _DV_MESES_ = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function _dvFechaTxt_() {
  var d = this, dos = function (n) { return (n < 10 ? '0' : '') + n; };
  return _DV_DIAS_[d.getDay()] + ' ' + _DV_MESES_[d.getMonth()] + ' ' + dos(d.getDate()) + ' ' + d.getFullYear() + ' ' +
    dos(d.getHours()) + ':' + dos(d.getMinutes()) + ':' + dos(d.getSeconds()) + ' GMT-0300 (hora estándar de Argentina)';
}
function _dvCelda_(v) {
  if (v && typeof v === 'object' && v.$d) { var d = new Date(v.$d); d.toString = _dvFechaTxt_; return d; }
  return v == null ? '' : v;
}
function _dvCargar_(d) {
  _DV = d;
  var H = {}, cab = d.cab || [], filas = [cab];
  /* Las filas de ESTE vendedor en su numero de fila de la hoja (el portal lo usa como pista para
     anular un envio); las de los demas no viajan y quedan vacias. */
  (d.filas || []).forEach(function (x) { filas[x[0] - 1] = (x[1] || []).map(_dvCelda_); });
  for (var i = 0; i < filas.length; i++) if (!filas[i]) filas[i] = [];
  H.Red = new _Hoja('Red', filas);
  H['Pagos Red Liq'] = new _Hoja('Pagos Red Liq', [['Timestamp', 'Fecha', 'Vendedor', 'Año', 'Semana', 'Efectivo', 'Transferencia']].concat(
    (d.liqs || []).map(function (x) { return ['', x[0], d.nombre, x[1], x[2], x[3], x[4]]; })));
  _HOJAS = H;
  _COLMAPS_ = {}; _LIQ_RED_IDX_ = null; _COLSRED_ = null;
}
/* Lo que la base ya da resuelto: el mapa de columnas de productos, las piezas de SUS pedidos, su
   comision, las cuentas y la palanca de la liquidacion. */
function _colsAbbr_(hoja) { var m = {}; (_DV.colmap || []).forEach(function (x) { m[x[0]] = x[1]; }); return m; }
function _piezasLeer_() { return (_DV.piezas || []).map(function (x) { return { abbr: x[0], peso: Number(x[1]) || 0, estado: x[2], pedido: x[3] }; }); }
function _comisionPct(nombre) { var pct = Number(_DV.comPct); return (pct > 0 && pct < 100) ? pct : 17; }
function _cuentas_() { return (_DV.cuentas || []).map(function (c) { return { id: c.id, nombre: c.nombre, tipo: c.tipo, col: c.col, alias: c.alias || '', banco: c.banco || '' }; }); }
function _liqRedActiva_() { return !!_DV.liq; }
/* Lo que trae `dashboardVendedorEfectos` (Apps Script): aca, vacio. */
function _rtTareas_() { return null; }
function _roObjetivoPortal_() { return null; }
function _escalaPortal_() { return null; }
function _roVendedorDeSesion_() { return ''; }
function _rbVendedores_() { return { lista: [], sh: null, colDias: 0, colTg: 0 }; }
function _rbVendedorPorNombre_() { return null; }
function _liqRedDeVendedor_() { return []; }
function _liqRedProxDeVendedor_() { return null; }
function _logError_() {}

/* datos: lo que devuelve dashboard_vendedor_pantalla. opts.ahora: fijar el reloj (la prueba).
   Devuelve lo mismo que `?action=dashboardVendedor`, con tareas/objetivo/tg/escala/liqs vacios. */
G.DV_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _dvCargar_(datos || {});
      _authCtx = null;
      var o = JSON.parse(_doGetDashboardVendedor({ parameter: { nombre: datos.nombre } }).getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _DV = null; }
  }
};
