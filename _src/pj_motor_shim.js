/* EL «MINI APPS SCRIPT» DEL MOTOR DE LAS JUGADAS (164, 27/10/2026). Lo usa _tools/copiar_motor.js:
   donde dice MOTOR (entre barra-asterisco) entra el codigo de las jugadas copiado de Code.js. Lo de
   abajo de eso REEMPLAZA a las funciones que en Apps Script leen afuera (la ultima declaracion
   gana). Los datos son los de `crm_jugadas_pantalla` (164): se presentan como las hojas que el
   motor lee con SS.getSheetByName, en las mismas columnas. */

/* `Date` con un reloj que se puede fijar: la prueba compara contra Apps Script parado en la hora
   en que contesto. En la pantalla nadie lo fija y es el reloj de siempre. */
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
var _HOJAS = {}, _DATOS = null, _TPLS = null;
var SS = { getSheetByName: function (n) { return _HOJAS[n] || null; } };
var CacheService = { getScriptCache: function () { return { get: function () { return null; }, put: function () {} }; } };
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

/* Un 'aaaa-mm-dd' a las 00:00 de aca, como _crmToDate de una celda de fecha. */
function _pjmDia_(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function _pjmMapa_(pares) { var o = {}; (pares || []).forEach(function (x) { o[x[0]] = (o[x[0]] || 0) + x[1]; }); return o; }
function _pjmCargar_(d) {
  _DATOS = d;
  var H = {};
  H.Config_Maleu = new _Hoja('Config_Maleu', [['Parámetro', 'Valor']].concat(d.config || []));
  H.Productos = new _Hoja('Productos', [['', 'Producto', 'Abreviatura']].concat((d.productos || []).map(function (p) {
    return ['', p[0], p[1], '', '', '', '', p[2], p[3]]; })));
  H.Proveedores = new _Hoja('Proveedores', [['', 'Producto', '', '', 'Abreviatura']].concat((d.proveedores || []).map(function (p) {
    return ['', p[0], '', '', p[1]]; })));
  H.Cupones = new _Hoja('Cupones', [['Codigo', 'Tipo', 'Valor', 'Scope', 'Vence', 'UsosMax', 'UsosActuales', 'Segmento', 'Mensaje', 'Activo']].concat(
    (d.cupones || []).map(function (c) { return [c[0], c[1], c[2], c[3], _pjmDia_(c[4]) || '', '', '', '', '', c[5]]; })));
  H['Interacciones CRM'] = new _Hoja('Interacciones CRM', [['ID', 'Fecha', 'Cliente Key', 'Tel', 'Nombre', 'Resultado', 'Próxima Acción', 'Nota', 'Origen', 'Usuario', 'Entrega', 'Entrega mirada']].concat(
    (d.inter || []).map(function (i) { return [i[0], new Date(i[1]), i[2], i[3], i[4], '', '', i[5], i[6], '', i[7], '']; })));
  var fh = function (ms) { return ms ? new Date(ms) : ''; };
  H['Respuestas Jugadas'] = new _Hoja('Respuestas Jugadas', [PJ_RESP_COLS_.concat(PJ_RESP_ATENDIDO_)].concat(
    (d.resp || []).map(function (r) { return [r[0], r[1], fh(r[2]), fh(r[3]), r[4], fh(r[5]), r[6] ? 'Sí' : '', r[7], r[8]]; })));
  /* La copia de las hojas chicas guarda una fecha como '2026-10-29 13:46:00'; en la hoja es el
     texto '29/10/2026 13:46' (se escribe con formato @), y asi la muestra la pantalla. */
  var iso = function (v) { var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::\d{2})?$/.exec(String(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : v; };
  H[PJ_PROG_HOJA] = new _Hoja(PJ_PROG_HOJA, [PJ_PROG_COLS_].concat((d.prog || []).map(function (x) {
    return PJ_PROG_COLS_.map(function (h) { return x[h] == null ? '' : iso(x[h]); }); })));
  _HOJAS = H;
  _CFG_MEMO_ = null; _FMT_AR_OK_ = null; _PROD_VALS_ = null;
}
/* `_crmBuildClientesIndex`: los clientes ya vienen agrupados y en orden; aca se arman los
   pedidos con las mismas funciones de Code.js (la hora, el cupon). */
function _crmBuildClientesIndex() {
  var tv = {}; (_DATOS.vend || []).forEach(function (t) { tv[t] = 1; }); _CRM_TEL_VEND_ = tv;
  var index = {};
  (_DATOS.index || []).forEach(function (c) {
    index[c.k] = { tel: c.tel, nombres: _pjmMapa_(c.n), barrios: _pjmMapa_(c.b), subBarrios: _pjmMapa_(c.s), domicilios: _pjmMapa_(c.d),
      countEntregados: c.ent, pend: c.pend,
      pedidos: (c.p || []).map(function (q) {
        var f = _pjmDia_(q[2]), fv = _pjmDia_(q[3]), fs = f ? f.getTime() : 0;
        return { canal: q[0], estado: q[1], fechaSort: fs, ventaSort: fv ? fv.getTime() : fs, ventaTotal: q[4], total: q[5],
                 he: _pjHoraMin_(q[6]), hp: _pjHoraMin_(q[7]), cup: _pjUsoCupon_(q[8], q[9]), cam: '', grp: q[10],
                 productos: (q[11] || []).map(function (x) { return { a: x[0], q: x[1] }; }) };
      }) };
  });
  return index;
}
function _crmGetClientesMeta() {
  var m = {};
  (_DATOS.meta || []).forEach(function (x) {
    m[x[0]] = { tel: x[0], nombreCanonico: x[1], apodo: x[2], barrioMapa: x[3], sinUbicacion: !!x[4], loteMapa: x[5], subBarrioMapa: x[6], visitante: !!x[7] };
  });
  return m;
}
function _pjTemplates_() { return _TPLS; }

/* datos: lo que devuelve crm_jugadas_pantalla. opts.tpls: los templates de WATI (de Apps Script);
   opts.ahora: fijar el reloj (la prueba). Devuelve lo mismo que `?action=crmJugadas`. */
G.PJ_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _pjmCargar_(datos || {});
      _TPLS = opts.tpls || null;
      var o = JSON.parse(_doGetCrmJugadas({ parameter: {} }).getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _DATOS = null; _HOJAS = {}; }
  }
};
