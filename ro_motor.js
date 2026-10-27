/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor de Mi Portal › Objetivos del equipo (190). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
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


var _authCtx = null;    // { usuario, rol } de la request en curso

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

function _escalaRedCuentaNivel_(fila, cT) {
  return !(cT && String(fila[cT - 1] || '').trim() === 'Maleu');
}

function _colsRedOrigen_(sh, crear) {
  if (!sh) return { trajo: 0, tel: 0, cod: 0 };
  if (_COLSRED_) return _COLSRED_;
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
  if (out.trajo && out.tel && out.cod) _COLSRED_ = out;
  return out;
}

function _jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

var RB_COLS_ = ['Estado Red', 'Bandeja desde', 'Confirmado por', 'Confirmado el', 'Horario', 'Aviso vendedor'];

var RB_KEYS_ = ['estado', 'desde', 'por', 'el', 'horario', 'aviso'];

var RB_TZ_ = 'America/Argentina/Buenos_Aires';

function _rbCols_(sh, crear) {
  var out = { estado: 0, desde: 0, por: 0, el: 0, horario: 0, aviso: 0 };
  if (!sh) return out;
  /* CACHEADO (1/10/2026, de noche): el portal y la bandeja lo piden en cada
     carga, y son dos llamadas a la hoja (ancho + encabezado) para un dato que
     cambia solo cuando ESTE codigo agrega las columnas. En Apps Script pesan
     las llamadas, no las celdas. Solo se cachea si ya estan las seis. */
  if (!crear) {
    try {
      var _c = CacheService.getScriptCache().get('rb_cols_v1');
      if (_c) return JSON.parse(_c);
    } catch (eC) {}
  }
  var ancho = sh.getLastColumn();
  var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
  var idx = {};
  for (var i = 0; i < cab.length; i++) {
    var h = String(cab[i] == null ? '' : cab[i]).trim();
    if (h && !idx[h]) idx[h] = i + 1;
  }
  var faltan = [];
  for (var k = 0; k < RB_COLS_.length; k++) {
    out[RB_KEYS_[k]] = idx[RB_COLS_[k]] || 0;
    if (!out[RB_KEYS_[k]]) faltan.push(k);
  }
  if (crear && faltan.length) {
    var c = ancho;
    for (var f = 0; f < faltan.length; f++) {
      c++;
      sh.getRange(1, c).setValue(RB_COLS_[faltan[f]]).setFontWeight('bold');
      /* TEXTO: "Bandeja desde" es un ISO y una columna sin formato lo
         convertiria en fecha a su manera. */
      sh.getRange(2, c, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
      out[RB_KEYS_[faltan[f]]] = c;
    }
    SpreadsheetApp.flush();
  }
  if (out.estado && out.desde && out.por && out.el && out.horario && out.aviso) {
    try { CacheService.getScriptCache().put('rb_cols_v1', JSON.stringify(out), 600); } catch (eP) {}
  }
  return out;
}

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

function _rbVendedores_(fresco) {
  /* CACHEADO 5 min (1/10/2026, de noche): lo piden el portal de cada vendedor y
     la bandeja en cada carga. `fresco` lo lee de la hoja: lo usa quien va a
     ESCRIBIR (vincular un Telegram), que ademas borra esta copia. */
  if (!fresco) {
    try {
      var _c = CacheService.getScriptCache().get('rb_vend_v2');
      if (_c) { var _r = JSON.parse(_c); _r.sh = null; return _r; }
    } catch (eC) {}
  }
  var res = { lista: [], sh: null, colDias: 0, colTg: 0 };
  var sh = SS.getSheetByName('Vendedores');
  res.sh = sh;
  if (!sh || sh.getLastRow() <= 1) return res;
  var d = sh.getDataRange().getValues();
  var cab = d[0];
  for (var c = 0; c < cab.length; c++) {
    var h = String(cab[c] == null ? '' : cab[c]).trim().toLowerCase();
    if (h === 'días' || h === 'dias') res.colDias = c + 1;
    if (h === 'telegram') res.colTg = c + 1;
  }
  for (var r = 1; r < d.length; r++) {
    var nombre = String(d[r][0] || '').trim();
    if (!nombre) continue;
    var dias = res.colDias ? _rbDiasParse_(d[r][res.colDias - 1]) : [];
    res.lista.push({
      nombre: nombre,
      usuario: String(d[r][7] || '').trim().toLowerCase(),
      pin: String(d[r][8] || '').trim(),
      activo: String(d[r][6] || '').trim() === 'Activo',
      dias: dias.length ? dias : ['Viernes'],
      diasDefault: !dias.length,
      chat: res.colTg ? String(d[r][res.colTg - 1] || '').trim() : '',
      /* Los barrios que reparte (col D), para sugerirlo en Por decidir (5/10/2026). */
      barrios: String(d[r][3] || '').trim(),
      /* El alias para transferirle (col C), lo muestra la liquidacion (16/10/2026). */
      alias: String(d[r][2] || '').trim(),
      fila: r + 1
    });
  }
  try {
    CacheService.getScriptCache().put('rb_vend_v2', JSON.stringify(
      { lista: res.lista, colDias: res.colDias, colTg: res.colTg }), 300);
  } catch (eP) {}
  return res;
}

function _rtSemanaKey_(d) {
  var w = _isoWeek(d);
  /* El año ISO es el del jueves de esa semana. */
  var j = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  j.setDate(j.getDate() + 4 - (j.getDay() || 7));
  return j.getFullYear() + '-W' + (w < 10 ? '0' + w : w);
}

var RO_HOJA_ = 'Objetivos Red';

var RO_CAB_ = ['Semana', 'Vendedor', 'Objetivo', 'Acciones', 'Actualizado', 'Aplausos', 'Cumplió'];

function _roHoja_(crear) {
  var sh = SS.getSheetByName(RO_HOJA_);
  if (sh || !crear) return sh;
  sh = SS.insertSheet(RO_HOJA_);
  if (!sh) return null;
  sh.getRange(1, 1, 1, RO_CAB_.length).setValues([RO_CAB_]).setFontWeight('bold');
  /* Texto: la semana '2026-W41' y el JSON no se tienen que convertir en nada. */
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), RO_CAB_.length).setNumberFormat('@');
  return sh;
}

function _roJson_(cel) {
  try { var x = JSON.parse(String(cel || '[]')); return Array.isArray(x) ? x : []; } catch (e) { return []; }
}

function _roLeerTodo_() {
  var out = {};
  var sh = _roHoja_(false);
  if (!sh || sh.getLastRow() <= 1) return out;
  var d = sh.getRange(2, 1, sh.getLastRow() - 1, RO_CAB_.length).getValues();
  for (var i = 0; i < d.length; i++) {
    var k = String(d[i][0]).trim(), v = String(d[i][1]).trim();
    if (!k || !v) continue;
    var meta = Number(d[i][2]);
    (out[k] = out[k] || {})[v] = { row: i + 2, meta: meta > 0 ? Math.round(meta) : null,
      acciones: _roJson_(d[i][3]), aplausos: _roJson_(d[i][5]), cumplio: String(d[i][6] || '').trim() };
  }
  return out;
}

function _roIso_(cel) {
  if (cel instanceof Date) return Utilities.formatDate(cel, RB_TZ_, 'yyyy-MM-dd');
  var m = String(cel == null ? '' : cel).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}

function _roSemanaRango_(hoy) {
  var l = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  var d = new Date(l); d.setDate(d.getDate() + 6);
  var f = function (x) { return Utilities.formatDate(x, RB_TZ_, 'yyyy-MM-dd'); };
  return { lun: f(l), dom: f(d) };
}

function _roVentasSemana_(data, cols, rango) {
  return _roVentasEntre_(data, cols, rango.lun, rango.dom);
}

function _roVentasEntre_(data, cols, desde, hasta) {
  var out = {}, vistos = {};
  if (!data) return out;
  for (var r = 0; r < data.length; r++) {
    var v = String(data[r][7] || '').trim();
    if (!v) continue;
    if (cols.estRed) {
      var er = String(data[r][cols.estRed - 1] || '').trim();
      if (er === 'Por confirmar' || er === 'Anulado') continue;
    }
    var es = String(data[r][11] || '').trim();
    if (es === 'Cancelado') continue;
    var c = String(data[r][8] || '').trim();
    if (!c || c.toLowerCase() === v.toLowerCase()) continue;   // su compra de mercaderia
    var fe = _roIso_(data[r][10]);
    if (!fe || fe < desde || fe > hasta) continue;
    var deMaleu = !_escalaRedCuentaNivel_(data[r], cols.trajo);
    var k = v + '|' + c.toLowerCase() + '|' + fe;               // mismo cliente, mismo dia = una venta
    if (!out[v]) out[v] = { lleva: 0, pasadas: 0, ventas: [] };
    if (vistos[k]) {
      /* Si alguna de las partes es de Maleu, la venta entera es de Maleu. */
      if (deMaleu && !vistos[k].m) { vistos[k].m = true; out[v].lleva--; out[v].pasadas++; }
      continue;
    }
    vistos[k] = { c: c, fe: fe, es: es, m: deMaleu };
    out[v].ventas.push(vistos[k]);
    if (deMaleu) out[v].pasadas++; else out[v].lleva++;
  }
  return out;
}

function _roLunesDe_(iso) {
  var p = String(iso).split('-');
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Utilities.formatDate(d, RB_TZ_, 'yyyy-MM-dd');
}

function _roVentasPorSemana_(data, cols) {
  var todas = _roVentasEntre_(data, cols, '0000-00-00', '9999-99-99'), out = {};
  Object.keys(todas).forEach(function (v) {
    var m = out[v] = {};
    todas[v].ventas.forEach(function (x) { if (!x.m) { var l = _roLunesDe_(x.fe); m[l] = (m[l] || 0) + 1; } });
  });
  return out;
}

function _roHistoria_(nombre, porSemana, todo, hoy, metaHoy, llevaHoy) {
  var mias = porSemana[nombre] || {};
  var l0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  l0.setDate(l0.getDate() - ((l0.getDay() + 6) % 7));
  var semana = function (i) {
    var d = new Date(l0); d.setDate(d.getDate() - 7 * i);
    var f = (todo[_rtSemanaKey_(d)] || {})[nombre];
    return { lun: Utilities.formatDate(d, RB_TZ_, 'yyyy-MM-dd'), meta: f ? f.meta : null, f: f };
  };
  var hist = [], cumplidas = 0, conMeta = 0;
  for (var i = 8; i >= 1; i--) {
    var s = semana(i);
    var n = mias[s.lun] || 0;
    hist.push({ lun: s.lun, meta: s.meta, lleva: n });
    if (s.meta) { conMeta++; if (n >= s.meta) cumplidas++; }
  }
  var racha = 0;
  for (var j = 1; j <= 52; j++) {
    var w = semana(j);
    if (!w.meta || (mias[w.lun] || 0) < w.meta) break;
    racha++;
  }
  if (metaHoy && llevaHoy >= metaHoy) racha++;
  var record = 0;
  Object.keys(mias).forEach(function (k) { if (mias[k] > record) record = mias[k]; });
  /* El último aplauso: el de esta semana, o el de la pasada si no hay. */
  var ap = null;
  for (var a = 0; a <= 1 && !ap; a++) {
    var fa = a === 0 ? ((todo[_rtSemanaKey_(hoy)] || {})[nombre]) : semana(1).f;
    var L = (fa && fa.aplausos) || [];
    if (L.length) ap = { por: L[L.length - 1].por || '', txt: L[L.length - 1].txt || '', f: L[L.length - 1].f || '', pasada: a === 1 };
  }
  return { hist: hist, racha: racha, record: record, cumplidas: cumplidas, conMeta: conMeta, aplauso: ap };
}

var RO_TODOS_ = '*';

function _roFoco_(filas) {
  var f = filas && filas[RO_TODOS_];
  var a = f && f.acciones && f.acciones[0];
  return (a && a.txt) ? { txt: String(a.txt), por: String(a.por || '') } : null;
}

function _doGetRedObjetivosEquipo() {
  if (String((_authCtx && _authCtx.rol) || '') !== 'admin') return _jsonOut_({ ok: false, forbidden: true, err: 'Solo admin' });
  var E = _roEquipo_(new Date(new Date().toLocaleString('en-US', { timeZone: RB_TZ_ })));
  return _jsonOut_({ ok: true, sem: E.sem, lun: E.lun, dom: E.dom, vendedores: E.vendedores, foco: E.foco });
}

function _roEquipo_(hoy) {
  var semKey = _rtSemanaKey_(hoy);
  var rango = _roSemanaRango_(hoy);
  var todo = _roLeerTodo_();
  var filas = todo[semKey] || {};
  var data = null, cols = { estRed: 0, trajo: 0 };
  var sh = SS.getSheetByName('Red');
  if (sh && sh.getLastRow() > 1) {
    try { cols.estRed = _rbCols_(sh, false).estado || 0; } catch (e1) {}
    try { cols.trajo = _colsRedOrigen_(sh, false).trajo || 0; } catch (e2) {}
    data = sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(12, cols.estRed, cols.trajo)).getValues();
  }
  var ventas = _roVentasSemana_(data, cols, rango);
  var porSemana = _roVentasPorSemana_(data, cols);
  var props = {};
  try { props = PropertiesService.getScriptProperties().getProperties(); } catch (eP) {}
  var V = _rbVendedores_();
  var lista = V.lista.filter(function (v) { return v.activo; }).map(function (v) {
    var f = filas[v.nombre] || { meta: null, acciones: [], aplausos: [] };
    var s = ventas[v.nombre] || { lleva: 0, pasadas: 0 };
    var h = _roHistoria_(v.nombre, porSemana, todo, hoy, f.meta, s.lleva);
    return { nombre: v.nombre, meta: f.meta, lleva: s.lleva, pasadas: s.pasadas, acciones: f.acciones,
      aplausos: f.aplausos || [], racha: h.racha, hist: h.hist, cumplidas: h.cumplidas, conMeta: h.conMeta,
      porVenta: Number(props['ro_pv_' + v.nombre]) || null, abrio: props['ro_abrio_' + v.nombre] || '',
      tg: !!v.chat, chat: v.chat || '' };
  }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  var vis = lista.map(function (x) { var y = {}; for (var k in x) if (k !== 'chat') y[k] = x[k]; return y; });
  return { sem: semKey, lun: rango.lun, dom: rango.dom, vendedores: vis, conChat: lista, foco: _roFoco_(filas) };
}

function _isoWeek(date) {
  const d      = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}


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

})(typeof window !== "undefined" ? window : globalThis);
