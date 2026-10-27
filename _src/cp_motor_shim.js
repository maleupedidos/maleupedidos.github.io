/* EL «MINI APPS SCRIPT» DEL MOTOR DE COBROS (203, 27/10/2026). Mismo modelo que el de Abastecimiento
   (bq_motor_shim.js, 200): _tools/copiar_motor.js pone donde dice MOTOR (entre barra-asterisco)
   `_doGetCobrosPendientes` y todo lo que llama, copiado de Code.js. Lo de abajo presenta los datos de
   `cobros_pendientes_pantalla` (203) como las hojas que esas funciones leen, en las mismas columnas y
   filas: Home, Pilar y Clubes (enteras las sin cobrar; de las demas lo que arma las casas), Red cruda,
   Cobros Parciales, Pagos Red Liq, Saldos Clientes, Productos y las hojas chicas. Las billeteras, las
   fusiones, las piezas y el mapa de columnas los da la base resueltos. No escribe ni avisa. */

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
_Hoja.prototype.getRange = function (r, c, nr, nc) {
  var f = this.f, out = [];
  nr = nr || 1; nc = nc || 1;
  for (var i = 0; i < nr; i++) { var fila = f[r - 1 + i] || [], o = []; for (var j = 0; j < nc; j++) { var v = fila[c - 1 + j]; o.push(v === undefined || v === null ? '' : v); } out.push(o); }
  var rg = { getValues: function () { return out; }, getValue: function () { return out[0][0]; }, getDisplayValues: function () { return out; },
    setValues: function () { return rg; }, setValue: function () { return rg; }, setFontWeight: function () { return rg; } };
  return rg;
};
_Hoja.prototype.getDataRange = function () { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); };
_Hoja.prototype.appendRow = function () {};
var _HOJAS = {}, _CP = {};
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
/* Lo que la base da resuelto. */
function _crmPgConfig_() { return { enabled: false, url: '', key: '' }; }
function _uf_() { throw new Error('el motor no sale a la red'); }
function _entregasVer_() { return ''; }
function _colsAbbr_(hoja) { var m = {}; ((_CP.colmap || {})[hoja] || []).forEach(function (x) { m[x[0]] = x[1]; }); return m; }
function _piezasLeer_() { return (_CP.piezas || []).map(function (x) { return { id: x[0], abbr: x[1], peso: Number(x[2]) || 0, estado: x[3], pedido: x[4] }; }); }
function _billeterasVivas_() { var b = (_CP.bil || {}).billeteras || {}; return { activo: !!b.activo, personas: b.personas || [], bil: b.bil || {}, corte: b.corte || '' }; }
function _crmGetMergeMap() { var m = {}; (_CP.merge || []).forEach(function (x) { var a = String(x[0] || '').trim(), b = String(x[1] || '').trim(); if (a && b && a !== b) m[a] = b; }); return m; }
function _alertaTecnica_() { return ''; }
function _avisar_() { return ''; }
function _avisarPedido_() { return ''; }
function _avisarNegocio_() { return ''; }
function _avisarCanal_() { return ''; }
function _avisarFallo_() { return ''; }
function _mlAvisar_() { return ''; }
function _logError_() {}

/*MOTOR*/

function _cpmFecha_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s == null ? '' : String(s));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null;
}
function _cpmCelda_(v) {
  if (v && typeof v === 'object' && v.$d) return new Date(v.$d);   // celda cruda (186/191)
  if (typeof v === 'string') { var f = _cpmFecha_(v); if (f) return f; }
  return v == null ? '' : v;
}
function _cpmPoner_(filas, row, fila) { while (filas.length < row - 1) filas.push([]); filas[row - 1] = fila; }
/* Lo que se lee de cada hoja de pedidos aunque la fila no venga cruda: N°, cliente, estado, pago,
   telefono (columnas de `_doGetCobrosPendientes`, desde 0) y barrio, sub barrio y lote por encabezado. */
var _CPM_PED_ = { Home: { est: 10, pago: 12, tel: 46 }, Pilar: { est: 10, pago: 12, tel: 49 }, Clubes: { est: 13, pago: 15, tel: null } };
var _CPM_CAB_ = {
  Cuentas: ['id', 'Nombre', 'Tipo', 'Col en Saldo Base', 'Activo', 'Alias', 'Banco'],
  Vendedores: ['Nombre', 'WhatsApp', 'Alias MP', 'Barrios (separados por coma)', 'Partido', 'Localidad', 'Estado',
    'Usuario', 'PIN', 'Comisión %', 'Notas', 'Días', 'Telegram'],
  Config_Maleu: ['Parámetro', 'Valor', 'Activo desde', 'Notas']
};
function _cpmCargar_(d) {
  var H = {}, cab = d.cab || {};
  Object.keys(_CPM_PED_).forEach(function (h) {
    var c = (cab[h] || []).slice(), cc = _CPM_PED_[h], filas = [c];
    var ix = function (n) { return c.indexOf(n); };
    (d.ped || []).forEach(function (x) {
      if (x.h !== h) return;
      var f;
      if (x.raw && x.raw.length) f = x.raw.map(_cpmCelda_);
      else {
        f = []; for (var i = 0; i < Math.max(c.length, 64); i++) f.push('');
        f[1] = x.n; f[7] = x.cli; f[cc.est] = x.est; f[cc.pago] = x.pago;
        if (cc.tel != null) f[cc.tel] = x.tel;
        if (ix('Barrio') >= 0) f[ix('Barrio')] = x.b;
        if (ix('Sub Barrio') >= 0) f[ix('Sub Barrio')] = x.sb;
        if (ix('Domicilio - Lote') >= 0) f[ix('Domicilio - Lote')] = x.l;
      }
      _cpmPoner_(filas, x.row, f);
    });
    H[h] = new _Hoja(h, filas);
  });
  var red = [(cab.Red || []).slice()];
  (d.red || []).forEach(function (x) { _cpmPoner_(red, x[0], (x[1] || []).map(_cpmCelda_)); });
  H.Red = new _Hoja('Red', red);
  H['Cobros Parciales'] = new _Hoja('Cobros Parciales', [['Fecha/Hora', 'Hoja', 'N° Pedido', 'Cliente', 'Forma Pago', 'Monto']].concat(
    (d.parciales || []).map(function (x) { var k = String(x.k || ''), i = k.indexOf('|');
      return [_cpmFecha_(x.f) || '', k.slice(0, i), k.slice(i + 1), '', x.fp, Number(x.monto) || 0]; })));
  H['Pagos Red Liq'] = new _Hoja('Pagos Red Liq', [['Timestamp', 'Fecha', 'Vendedor', 'Año', 'Semana', 'Efectivo', 'Transferencia', 'Total']].concat(
    (d.liq || []).map(function (x) { return ['', '', x[0], x[1], x[2], Number(x[3]) || 0, Number(x[4]) || 0, '']; })));
  H['Saldos Clientes'] = new _Hoja('Saldos Clientes', [['Fecha', 'Cliente', 'Telefono', 'Tipo', 'Monto']].concat(
    (d.saldos || []).map(function (x) { return ['', x[0], '', x[1], Number(x[2]) || 0]; })));
  H.Productos = new _Hoja('Productos', [['N°', 'Producto', 'Abreviatura']].concat((d.prod || []).map(function (x, k) {
    var f = []; for (var j = 0; j < 17; j++) f.push(''); f[0] = k + 1; f[1] = x[1]; f[2] = x[0]; f[16] = x[2]; return f; })));
  /* Saldo Base: solo la col D de la ultima fila (la billetera de Ruta), que la base da en `bil`. */
  H['Saldo Base'] = new _Hoja('Saldo Base', [['Fecha', 'Efectivo', 'Mercado Pago', 'Billetera'], ['', '', '', Number((d.bil || {}).billetera) || 0]]);
  var hj = d.hojas || {};
  Object.keys(_CPM_CAB_).forEach(function (n) {
    var c = _CPM_CAB_[n], out = [c.slice()];
    (hj[n] || []).forEach(function (x) { _cpmPoner_(out, x.row, c.map(function (k) { return _cpmCelda_(x.d[k]); })); });
    H[n] = new _Hoja(n, out);
  });
  _HOJAS = H; _CP = d;
}

/* datos: lo que devuelve cobros_pendientes_pantalla. opts.ahora: fijar el reloj (la prueba). Devuelve
   lo mismo que `?action=cobrosPendientes`. */
G.CP_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _cpmCargar_(datos || {});
      _CFG_MEMO_ = null; _CUENTAS_MEMO_ = null; _SALDOS_MEMO_ = null; _comPctCache = null;
      var o = JSON.parse(_doGetCobrosPendientes({ parameter: { fresh: '1' } }).getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _CP = {}; }
  }
};
