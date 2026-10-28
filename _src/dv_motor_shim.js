/* EL «MINI APPS SCRIPT» DEL PORTAL DEL VENDEDOR (191, 27/10/2026). Mismo modelo que el de las
   jugadas (164) y el de objetivos (190): _tools/copiar_motor.js pone donde dice MOTOR (entre
   barra-asterisco) `_doGetDashboardVendedor` y todo lo que llama, copiado de Code.js, MENOS lo que
   este shim reemplaza (abajo). Los datos son los de `dashboard_vendedor_pantalla` (191).
   El motor arma los NUMEROS (stats, pedidos, clientes, lo rendido por semana, cuentas) y, desde la 242,
   tareas, objetivo, Telegram, escala y liquidaciones. Lo que abrir el portal HACE sigue en
   `dashboardVendedorEfectos` de Apps Script, que el portal larga sin esperar. */

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
  /* (242) Las hojas de `ef`, en el orden en que las leen las reglas (por posicion o por nombre). */
  var ef = d.ef || {};
  var conCab = function (cab, filas2) {
    var out = [cab.slice()];
    (filas2 || []).forEach(function (x) { var f = cab.map(function (k) { return _dvTexto_(x.d ? x.d[k] : ''); }); while (out.length < x.row - 1) out.push([]); out[x.row - 1] = f; });
    for (var i = 0; i < out.length; i++) if (!out[i]) out[i] = [];
    return out;
  };
  H['Tareas Red'] = new _Hoja('Tareas Red', conCab(RT_CAB_, ef.tareas));
  H['Objetivos Red'] = new _Hoja('Objetivos Red', conCab(RO_CAB_, ef.obj));
  H['Liquidaciones Red'] = new _Hoja('Liquidaciones Red', conCab(_DV_LIQ_CAB_, ef.liqr));
  H.Vendedores = new _Hoja('Vendedores', conCab(_DV_VEND_CAB_, ef.vend ? [ef.vend] : []));
  H.Proveedores = new _Hoja('Proveedores', conCab(['N° de Productos', 'Producto', 'Proveedor', 'Gustos', 'Abreviatura'], ef.prov));
  H.Config_Maleu = new _Hoja('Config_Maleu', conCab(['Parámetro', 'Valor', 'Activo desde', 'Notas'], ef.cfg));
  /* Productos: las columnas que se leen por posicion (B nombre, C abreviatura, I precio, Q unidad) y por nombre
     (Abreviatura, Precio, Unidad y las tres «Com Red», Y:AA). La J (Costo) NO: no viaja al telefono. */
  var cabP = []; for (var i = 0; i < 27; i++) cabP.push('');
  cabP[0] = 'N°'; cabP[1] = 'Producto'; cabP[2] = 'Abreviatura'; cabP[8] = 'Precio'; cabP[16] = 'Unidad';
  cabP[24] = 'Com Red Inicial'; cabP[25] = 'Com Red Intermedio'; cabP[26] = 'Com Red Top';
  var vv = function (x) { return x == null ? '' : x; };
  H.Productos = new _Hoja('Productos', [cabP].concat(((ef.esc || {}).prod || []).map(function (x, k) {
    var f = []; for (var j = 0; j < 27; j++) f.push('');
    f[0] = k + 1; f[1] = x.n; f[2] = x.a; f[8] = vv(x.precio); f[16] = x.u; f[24] = vv(x.ri); f[25] = vv(x.rm); f[26] = vv(x.rt);
    return f;
  })));
  _HOJAS = H;
  _COLMAPS_ = {}; _LIQ_RED_IDX_ = null; _COLSRED_ = null;
}
var _DV_LIQ_CAB_ = ['ID', 'Registrado', 'Fecha Pago', 'Vendedor', 'Quincena', 'Desde', 'Hasta', 'Comisión', 'Envíos', 'Total',
  'Cuenta', 'Pagó', 'Pedidos', '# Pedidos', 'Estado', 'Anulada el', 'Anulada por', 'Detalle'];
var _DV_VEND_CAB_ = ['Nombre', 'WhatsApp', 'Alias MP', 'Barrios (separados por coma)', 'Partido', 'Localidad', 'Estado',
  'Usuario', 'PIN', 'Comisión %', 'Notas', 'Días', 'Telegram'];
/* Una celda de una hoja chica como la da `getValues`: la copia guarda las fechas como «aaaa-mm-dd hh:mm:ss». */
function _dvTexto_(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(v == null ? '' : String(v));
  if (m) { var d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)); d.toString = _dvFechaTxt_; return d; }
  return v == null ? '' : v;
}
/* Lo que la base ya da resuelto: el mapa de columnas de productos, las piezas de SUS pedidos, su
   comision, las cuentas y la palanca de la liquidacion. */
function _colsAbbr_(hoja) { var m = {}; (_DV.colmap || []).forEach(function (x) { m[x[0]] = x[1]; }); return m; }
function _piezasLeer_() { return (_DV.piezas || []).map(function (x) { return { abbr: x[0], peso: Number(x[1]) || 0, estado: x[2], pedido: x[3] }; }); }
function _comisionPct(nombre) { var pct = Number(_DV.comPct); return (pct > 0 && pct < 100) ? pct : 17; }
function _cuentas_() { return (_DV.cuentas || []).map(function (c) { return { id: c.id, nombre: c.nombre, tipo: c.tipo, col: c.col, alias: c.alias || '', banco: c.banco || '' }; }); }
function _liqRedActiva_() { return !!_DV.liq; }
/* (242) Tareas, objetivo, escala, liquidaciones y Telegram los arma el motor con `ef` (242): solo lo del
   vendedor, la escala sin costo y el equipo como total. Lo que HACE abrir el portal (anotar las tareas mostradas,
   las props, el Telegram de «cumpliste», vigilar la escala) no corre aca: `_SIN_EFECTOS_` y estos vacios. */
function _roVendedorDeSesion_() { return (_DV && _DV.ef && _DV.ef.esSuyo) ? String(_DV.nombre || '') : ''; }
/* El link sale del PIN, que no viaja: es el `_tg_link` que la replica deriva con la MISMA `_rbTgLink_`. */
function _rbTgLink_() { return String((_DV && _DV.ef && _DV.ef.vend && _DV.ef.vend.d && _DV.ef.vend.d._tg_link) || ''); }
function _roAvisarCumplio_() {}
function _escalaRedVigilar_() {}
function _alertaTecnica_() { return ''; }
function _avisar_() { return ''; }
function _avisarCanal_() { return ''; }
function _avisarFallo_() { return ''; }
function _mlAvisar_() { return ''; }
function _hojaBaseMarcar_() {}
function _uf_() { throw new Error('el motor no sale a internet'); }
/* Las consultas de la escala a la base: las contesta `ef.esc` (de la vista, solo sku, nivel y monto). */
function _crmPgConfig_() { return { enabled: true, url: 'base', key: 'base' }; }
function _crmPgFetch_(cfg, method, path) {
  var t = String(path || '').split('?')[0], e = (_DV && _DV.ef && _DV.ef.esc) || {};
  if (t === 'seller_level_band') return e.bandas || [];
  if (t === 'seller_commission_rate') return e.tabla || [];
  if (t === 'seller_commission_rate_calc') return e.vista || [];
  return [];
}
function _logError_() {}

/* datos: lo que devuelve dashboard_vendedor_pantalla. opts.ahora: fijar el reloj (la prueba).
   Devuelve lo mismo que `?action=dashboardVendedor`, con tareas/objetivo/tg/escala/liqs vacios. */
G.DV_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _dvCargar_(datos || {});
      _authCtx = null; _SIN_EFECTOS_ = true; _SECO_ = true; _CFG_MEMO_ = null; _PROD_VALORES_ = null;
      var o = JSON.parse(_doGetDashboardVendedor({ parameter: { nombre: datos.nombre } }).getContent());
      /* (242) El equipo es un TOTAL de la base: el motor solo tiene las filas de este vendedor. */
      if (o.objetivo && datos.ef && datos.ef.eq) o.objetivo.equipo = datos.ef.eq;
      /* `base: 'ef'` = tareas/objetivo/escala/liquidaciones/Telegram salieron del motor (con la 242): el portal
         ya no los pide a Apps Script, solo larga los efectos. Sin `ef` (base sin la 242), como antes. */
      o.base = (datos && datos.ef) ? 'ef' : true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _DV = null; }
  }
};
