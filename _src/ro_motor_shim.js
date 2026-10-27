/* EL «MINI APPS SCRIPT» DEL MOTOR DE OBJETIVOS DEL EQUIPO (190, 27/10/2026). Mismo modelo que el
   de las jugadas (pj_motor_shim.js, 164): _tools/copiar_motor.js pone donde dice MOTOR (entre
   barra-asterisco) `_doGetRedObjetivosEquipo` y todo lo que llama, copiado de Code.js. Lo de abajo
   presenta los datos de `red_objetivos_equipo_pantalla` (190) como las hojas que esas funciones
   leen (Red, Vendedores, Objetivos Red), en las mismas columnas.
   Lo que NO esta en la base: las propiedades del script `ro_pv_<vendedor>` (cuanto gana por venta)
   y `ro_abrio_<vendedor>` (cuando abrio el portal). Vienen de Apps Script en `opts.props`. */

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
var _HOJAS = {}, _PROPS = {};
var SS = { getSheetByName: function (n) { return _HOJAS[n] || null; } };
var CacheService = { getScriptCache: function () { return { get: function () { return null; }, put: function () {} }; } };
var PropertiesService = { getScriptProperties: function () { return { getProperties: function () { return _PROPS; },
  getProperty: function (k) { return _PROPS[k] == null ? null : _PROPS[k]; } }; } };
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

/* El orden de las columnas de Vendedores: `_rbVendedores_` lee Nombre, Alias, Barrios, Estado,
   Usuario y PIN por POSICION (A, C, D, G, H, I) y Días y Telegram por nombre. La copia de las hojas
   chicas guarda cada fila por encabezado y sin el PIN; si la hoja cambia de orden, esto se despega y
   el medidor lo muestra. */
var _ROM_VEND_CAB_ = ['Nombre', 'WhatsApp', 'Alias MP', 'Barrios (separados por coma)', 'Partido', 'Localidad', 'Estado',
  'Usuario', 'PIN', 'Comisión %', 'Notas', 'Días', 'Telegram'];
/* Red: las columnas A a L con su nombre (se leen por posicion: H vendedor, I cliente, K dia de
   entrega, L estado) y las dos que se buscan por nombre. */
var _ROM_RED_CAB_ = ['Hora', 'N° Pedido', 'Día', 'Fecha', 'Mes', 'Semana', 'Año', 'Vendedor', 'Cliente', 'Origen',
  'Día de Entrega', 'Estado de Entrega', 'Estado Red', 'Trajo el Cliente'];
function _romDia_(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : ''; }
function _romCargar_(d) {
  var H = {};
  H.Red = new _Hoja('Red', [_ROM_RED_CAB_].concat((d.red || []).map(function (x) {
    return ['', x[0], '', '', '', '', '', x[1], x[2], '', _romDia_(x[3]), x[4], x[5], x[6]]; })));
  H.Vendedores = new _Hoja('Vendedores', [_ROM_VEND_CAB_].concat((d.vend || []).map(function (o) {
    return _ROM_VEND_CAB_.map(function (h) { return o[h] == null ? '' : o[h]; }); })));
  H[RO_HOJA_] = new _Hoja(RO_HOJA_, [RO_CAB_].concat((d.obj || []).map(function (o) {
    return RO_CAB_.map(function (h) { return o[h] == null ? '' : o[h]; }); })));
  _HOJAS = H;
  _COLSRED_ = null;
}

/* datos: lo que devuelve red_objetivos_equipo_pantalla. opts.props: las propiedades ro_pv_/ro_abrio_
   (de Apps Script); opts.ahora: fijar el reloj (la prueba). Devuelve lo mismo que
   `?action=redObjetivosEquipo`. */
G.RO_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _romCargar_(datos || {});
      _PROPS = opts.props || {};
      _authCtx = { rol: 'admin' };
      var o = JSON.parse(_doGetRedObjetivosEquipo().getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _PROPS = {}; _authCtx = null; }
  }
};
