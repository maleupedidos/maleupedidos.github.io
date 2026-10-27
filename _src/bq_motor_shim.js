/* EL «MINI APPS SCRIPT» DEL MOTOR DE ABASTECIMIENTO (200, 27/10/2026). Mismo modelo que el de los
   objetivos (ro_motor_shim.js, 190): _tools/copiar_motor.js pone donde dice MOTOR (entre
   barra-asterisco) `_doGetBusqueda` y todo lo que llama, copiado de Code.js. Lo de abajo presenta
   los datos de `busqueda_pantalla` (200) como las hojas que esas funciones leen, en las mismas
   columnas y en la misma fila (la fila de la hoja viaja: `r + 1` es parte de la respuesta).
   Los pagos a proveedores salen de la base por el camino que Apps Script ya tiene para eso
   (`_pagosProvDesdePg_`, palanca PAGOS_PROV_DESDE_PG): aca la consulta de PostgREST la contesta
   `datos.pagos`. Lo que avisa (Telegram, mail, Alertas Tecnicas) no corre: no hace nada. */

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
  var rg = { getValues: function () { return out; }, getDisplayValues: function () { return out; },
    setValues: function () { return rg; }, setValue: function () { return rg; }, setFontWeight: function () { return rg; } };
  return rg;
};
_Hoja.prototype.getDataRange = function () { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); };
_Hoja.prototype.appendRow = function () {};
_Hoja.prototype.setFrozenRows = function () {};
var _HOJAS = {}, _PAGOS = [];
var SS = { getSheetByName: function (n) { return _HOJAS[n] || null; },
  insertSheet: function (n) { return (_HOJAS[n] = new _Hoja(n, [])); } };
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
/* La consulta de `_pagosProvDesdePg_` a PostgREST: la contesta `datos.pagos`. */
var UrlFetchApp = { fetch: function () {
  return { getResponseCode: function () { return 200; }, getContentText: function () { return JSON.stringify(_PAGOS); } };
} };
var Session = { getEffectiveUser: function () { return { getEmail: function () { return ''; } }; } };
/* Lo que Apps Script hace por afuera: aca nada. */
function _crmPgConfig_() { return { enabled: true, url: 'base', key: 'base' }; }
function _uf_(quien, url, opt) { return UrlFetchApp.fetch(url, opt); }
function _alertaTecnica_() { return ''; }
function _avisar_() { return ''; }
function _avisarPedido_() { return ''; }
function _avisarNegocio_() { return ''; }
function _avisarCanal_() { return ''; }
function _avisarFallo_() { return ''; }
function _mlAvisar_() { return ''; }
function _logError_() {}

/*MOTOR*/

/* Un texto «aaaa-mm-dd[ hh:mm:ss]» es una fecha de la hoja: Apps Script la entrega como Date. */
function _bqmFecha_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s == null ? '' : String(s));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null;
}
function _bqmCelda_(v) {
  if (v && typeof v === 'object' && v.$d) return new Date(v.$d);   // celda cruda de Red (191)
  if (typeof v === 'string') { var f = _bqmFecha_(v); if (f) return f; }
  return v == null ? '' : v;
}
function _bqmPoner_(filas, row, fila) { while (filas.length < row - 1) filas.push([]); filas[row - 1] = fila; }
var _BQM_OC_CAB_ = ['N° Orden', 'Fecha Creación', 'Semana', 'Mes', 'Canal', 'N° Pedido Origen', 'Cliente', 'Teléfono', 'Dirección',
  'Proveedor', 'Producto', 'Abreviatura', 'Cantidad', 'Costo Unitario', 'Costo Total', 'Precio Venta Unit.', 'Ingreso Total',
  'Margen Bruto ($)', 'Margen (%)', 'Origen', 'Estado OC', 'Fecha Pedido Prov', 'Fecha Recibido'];
/* Las hojas chicas sin `_cab`: su encabezado, en orden. */
var _BQM_CAB_ = {
  'Programaciones Búsqueda': ['Proveedor', 'Fecha Programada', 'Actualizado'],
  'Redondeos Proveedores': ['ID', 'Registrado', 'Proveedor', 'Semana', 'Monto', 'Quién', 'Estado', 'Anulado el', 'Anulado por'],
  'Cuentas': ['id', 'Nombre', 'Tipo', 'Col en Saldo Base', 'Activo', 'Alias', 'Banco'],
  'Config_Maleu': ['Parámetro', 'Valor', 'Activo desde', 'Notas']
};
/* Las columnas (desde 1) que lee el pre-loop de cada hoja de pedidos: las de `hojasCanal`. */
var _BQM_PED_ = {
  Home: { n: 2, est: 11, fent: 50, fel: 10, f: 4 },
  Pilar: { n: 2, est: 11, fent: 53, fel: 10, f: 4 },
  Clubes: { n: 2, est: 14, fel: 13, f: 4 },
  Red: { n: 2, est: 12, fel: 11, f: 4, ev: 57, vend: 8, cli: 9, fact: 21, ap: 49 }
};
function _bqmCargar_(d) {
  var H = {};
  var oc = [_BQM_OC_CAB_.slice()];
  (d.oc || []).forEach(function (x) {
    var f = []; for (var i = 0; i < 23; i++) f.push('');
    f[0] = x.n; f[1] = _bqmFecha_(x.fc) || ''; f[2] = x.sem; f[4] = x.canal; f[5] = x.np; f[6] = x.cli; f[7] = x.tel; f[8] = x.dir;
    f[9] = x.prov; f[10] = x.prod; f[11] = x.abbr; f[12] = x.q == null ? '' : x.q; f[13] = x.cu == null ? '' : x.cu;
    f[15] = x.pv == null ? '' : x.pv; f[19] = x.org; f[20] = x.est; f[22] = _bqmFecha_(x.fr) || '';
    _bqmPoner_(oc, x.row, f);
  });
  H['Orden de Compra'] = new _Hoja('Orden de Compra', oc);
  ['Home', 'Pilar', 'Clubes', 'Red'].forEach(function (h) { H[h] = new _Hoja(h, [['N° Pedido']]); });
  (d.ped || []).forEach(function (x) {
    var c = _BQM_PED_[x.h], f;
    if (!c) return;
    if (x.raw && x.raw.length) f = x.raw.map(_bqmCelda_);
    else {
      f = []; for (var i = 0; i < 57; i++) f.push('');
      f[c.n - 1] = x.n; f[c.est - 1] = x.est; f[c.f - 1] = _bqmFecha_(x.f) || '';
      if (c.fel) f[c.fel - 1] = _bqmFecha_(x.fel) || '';
      if (c.fent) f[c.fent - 1] = _bqmFecha_(x.fent) || '';
      if (c.ev) { f[c.ev - 1] = x.ev; f[c.vend - 1] = x.vend; f[c.cli - 1] = x.cli; f[c.fact - 1] = x.fact == null ? '' : x.fact; f[c.ap - 1] = x.ap == null ? '' : x.ap; }
    }
    _bqmPoner_(H[x.h].f, x.row, f);
  });
  var hj = d.hojas || {};
  Object.keys(hj).forEach(function (n) {
    var filas = hj[n] || [], cab = _BQM_CAB_[n] || ((filas[0] && filas[0].d && filas[0].d._cab) || []), out = [cab.slice()];
    filas.forEach(function (x) { _bqmPoner_(out, x.row, cab.map(function (k) { return _bqmCelda_(x.d[k]); })); });
    H[n] = new _Hoja(n, out);
  });
  /* Los pagos salen de la base (ver arriba): la palanca va prendida para el motor. */
  var cm = H.Config_Maleu || (H.Config_Maleu = new _Hoja('Config_Maleu', [_BQM_CAB_.Config_Maleu.slice()]));
  cm.f.splice(1, 0, ['PAGOS_PROV_DESDE_PG', 'si', '', '']);
  var cc = [CCARNE_COLS.slice()];
  (d.cc || []).forEach(function (x) {
    _bqmPoner_(cc, x.row, [x.id, _bqmFecha_(x.f) || '', x.sem == null ? '' : x.sem, x.prov, x.abbr, x.corte, x.det,
      x.kg == null ? '' : x.kg, x.precio == null ? '' : x.precio, x.total == null ? '' : x.total, x.est, x.libro, x.nota, x.cargo,
      _bqmFecha_(x.cargado) || x.cargado || '', x.kgped == null ? '' : x.kgped, x.cajas, x.recibio, x.kgres == null ? '' : x.kgres]);
  });
  H[CCARNE_HOJA] = new _Hoja(CCARNE_HOJA, cc);
  H[NC_HOJA_] = new _Hoja(NC_HOJA_, [NC_CAB_.slice()].concat((d.nc || []).map(function (x) {
    return [x.id, _bqmFecha_(x.f) || '', x.prov, Number(x.monto) || 0, x.motivo, x.det, x.quien, x.est, '', ''];
  })));
  _PAGOS = d.pagos || [];
  var pg = [['Fecha']]; _PAGOS.forEach(function () { pg.push(['x']); });
  H['Pagos Proveedores'] = new _Hoja('Pagos Proveedores', pg);
  H.Productos = new _Hoja('Productos', [['N°', 'Producto', 'Abreviatura']].concat((d.prod || []).map(function (x, i) {
    return [i + 1, x.n, x.a, '', '', Number(x.fis) || 0, '', ''];
  })));
  _HOJAS = H;
}

/* datos: lo que devuelve busqueda_pantalla. opts.ahora: fijar el reloj (la prueba). Devuelve lo
   mismo que `?action=busqueda`. */
G.BQ_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _bqmCargar_(datos || {});
      _CFG_MEMO_ = null; _LUG_CFG_ = null;
      var o = JSON.parse(_doGetBusqueda().getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _PAGOS = []; }
  }
};
