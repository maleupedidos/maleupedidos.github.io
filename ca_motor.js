/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor del resto de la Caja (208). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
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
function _motPoner_(filas, row, fila) { while (filas.length < row - 1) filas.push([]); filas[row - 1] = fila; }

/* EL MOTOR DEL RESTO DE LA CAJA (208 en adelante, 27/10/2026). Va despues de motor_comun_shim.js;
   _tools/copiar_motor.js pone donde dice MOTOR (entre barra-asterisco) `_doGetAdmin` y todo lo que llama,
   copiado de Code.js, y el motor lo corre con `{mode: 'caja'}`. Lo de abajo presenta los datos de
   `caja_resto_pantalla` como las hojas que lee. Va POR TANDAS: cada tanda suma hojas aca y en la base, y
   el panel toma del motor solo los datos de las tandas probadas (CAJA_RESTO_BASE). Lo que todavia no
   tiene sus hojas sale vacio o mal, y por eso no se usa.
   Tanda 1 (208): Saldo Base, Cuentas, Config_Maleu, Redondeos Proveedores, Proveedores, Movimientos
   Plata y Provisiones_Fijas.
   Tanda 2 (209): Cambios Billetera, Sobres y el N° de cada pedido de Home, Pilar y Clubes (col B).
   Tanda 3 (211): los cobrados de Home, Pilar y Clubes, Cobros Parciales, Pagos Red Liq, Ingresos,
   Egresos (lugares y efMano). Sin Red: su cobro directo es transferencia y no mueve ninguno de los dos. */
function _alertaTecnica_() { return ''; }
function _avisar_() { return ''; }
function _avisarCanal_() { return ''; }
function _avisarFallo_() { return ''; }
function _mlAvisar_() { return ''; }
function _crmPgConfig_() { return { enabled: false, url: '', key: '' }; }
function _uf_() { throw new Error('el motor no sale a la red'); }


function _parseDiaEntregaDate(v) {
  if (v instanceof Date) return v;
  var s = String(v == null ? '' : v).trim();
  if (!s) return null;
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) { var y = Number(m[3]); if (y < 100) y += 2000; return new Date(y, Number(m[2]) - 1, Number(m[1])); }
  return null;
}

function _fechaADiaSemana(v) {
  var d = _parseDiaEntregaDate(v);
  if (d) return DIAS_SEMANA_ES[d.getDay()];
  return String(v == null ? '' : v).trim();
}

function _fechaAISO(v) {
  var d = _parseDiaEntregaDate(v);
  if (!d) return '';
  var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

var _OC_AP_HDR_ = { dep: 'Depósito Recibido', ap: 'Apartado', sal: 'Salió' };

function _ocApModo_() {
  try {
    var c = CacheService.getScriptCache().get('cfg_oc_ap');
    if (c) return c;
    var v = 'no';
    var cfgF = _cfgFilasConfig_();
    if (cfgF.length > 1) {
      var rows = cfgF;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toUpperCase() !== 'STOCK_OC_AL_FREEZER') continue;
        var x = String(rows[i][1]).trim().toLowerCase();
        v = (x === 'si' || x === 'sí' || x === 'on' || x === 'true') ? 'si' : (x === 'salir' ? 'salir' : 'no');
        break;
      }
    }
    CacheService.getScriptCache().put('cfg_oc_ap', v, 300);
    return v;
  } catch (e) { return 'no'; }
}

var _OC_AP_COLS_ = null;

function _ocApCols_(shOC, crear) {
  if (!shOC) return null;
  if (_OC_AP_COLS_) return _OC_AP_COLS_;
  var hdr = shOC.getRange(1, 1, 1, shOC.getLastColumn()).getValues()[0];
  var out = { dep: 0, ap: 0, sal: 0 };
  for (var i = 0; i < hdr.length; i++) {
    var h = String(hdr[i] || '').trim();
    if (h === _OC_AP_HDR_.dep) out.dep = i + 1;
    else if (h === _OC_AP_HDR_.ap) out.ap = i + 1;
    else if (h === _OC_AP_HDR_.sal) out.sal = i + 1;
  }
  if (out.dep && out.ap && out.sal) return (_OC_AP_COLS_ = out);
  if (!crear) return null;
  var c = shOC.getLastColumn();
  ['dep', 'ap', 'sal'].forEach(function (k) {
    if (out[k]) return;
    c++;
    shOC.getRange(1, c).setValue(_OC_AP_HDR_[k]);
    out[k] = c;
  });
  return (_OC_AP_COLS_ = out);
}

function _semanaDeStockVigente_(fecha) {
  var hoyArg = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  var out = {
    vigente: true, semana: 0, anio: 0,
    semanaHoy: _isoWeek(hoyArg), anioHoy: hoyArg.getFullYear()
  };
  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return out;   // sin fecha: como siempre
  out.semana = _isoWeek(fecha);
  out.anio   = fecha.getFullYear();
  out.vigente = (out.semana === out.semanaHoy && out.anio === out.anioHoy);
  return out;
}

function _colNumero_(letras) {
  var s = String(letras || '').trim().toUpperCase();
  if (!s || s.length > 3) return 0;
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 65 || c > 90) return 0;
    n = n * 26 + (c - 64);
  }
  return n;
}

function _cobradoPorCuenta_(cobEf, cobDig, ctaDig) {
  var out = {};
  out[_cuentaEfectivo_()] = cobEf;
  var repartido = 0;
  if (ctaDig) {
    for (var id in ctaDig) {
      if (!Object.prototype.hasOwnProperty.call(ctaDig, id)) continue;
      var m = Number(ctaDig[id]) || 0;
      if (!m) continue;
      /* Se valida ACA aunque `_acumCobrado` ya valide al leer, porque esta es
         la ultima puerta antes del panel — y el panel IGNORA en silencio
         cualquier clave que no este en su lista de cuentas. El dia que alguien
         desactive una cuenta en la hoja, sus cobros historicos caen al default
         y se siguen viendo, en vez de que su plata desaparezca de la Posicion
         total sin un solo error. */
      var vid = _cuentaDigitalValida_(id);
      if (!vid) continue;              /* al default, por el resto de abajo */
      _sumarCuenta_(out, vid, m);
      repartido += m;
    }
  }
  /* El resto al default. Con el desglose completo da 0; con un llamador que no
     lo mande, es todo — o sea el comportamiento anterior al 10/9/2026.
     La clave se crea IGUAL cuando el resto es 0: la version vieja la tenia
     siempre, y cambiar la forma del payload sin necesidad es lo que rompe a un
     consumidor que uno no tenia en la cabeza. */
  var def = _cuentaDigitalDefault_();
  var resto = cobDig - repartido;
  if (out[def] === undefined) out[def] = 0;
  if (resto) _sumarCuenta_(out, def, resto);
  return out;
}

var _CUENTAS_MEMO_ = null;

function _cuentas_() {
  if (_CUENTAS_MEMO_) return _CUENTAS_MEMO_;
  try {
    /* v2 (11/9/2026): la lista trae alias y banco. La clave se sube para que
       una copia vieja sin esos campos no se sirva durante los 5 min del TTL. */
    var raw = CacheService.getScriptCache().get('cuentas_v2');
    if (raw) return (_CUENTAS_MEMO_ = JSON.parse(raw));
  } catch (e) {}
  var out = [];
  var sh = SS.getSheetByName('Cuentas');
  if (sh) {
    var d = sh.getDataRange().getValues();
    for (var r = 1; r < d.length; r++) {
      var id  = String(d[r][0] || '').trim().toLowerCase();
      var tip = String(d[r][2] || '').trim().toLowerCase();
      var col = _colNumero_(d[r][3]);
      var act = String(d[r][4] || '').trim().toLowerCase();
      if (!id || !col || act.charAt(0) !== 's') continue;
      /* F "Alias" y G "Banco" (11/9/2026): lo que se le pasa al cliente para
         que transfiera. Viven en la hoja y no escritos en el codigo por la
         misma razon que la lista: un alias que cambia es una celda, no un
         deploy. Opcionales: sin ellas la cuenta anda igual, solo que el
         mensaje al cliente no la puede nombrar. */
      out.push({ id: id, nombre: String(d[r][1] || id).trim(),
                 tipo: (tip.indexOf('efec') === 0 ? 'efectivo' : 'digital'),
                 col: col,
                 alias: String(d[r][5] || '').trim(),
                 banco: String(d[r][6] || '').trim() });
    }
  }
  /* Sin la hoja, o vacia, el ERP se comporta EXACTAMENTE como antes del
     10/9/2026: las dos cuentas de siempre en las columnas de siempre. Nunca se
     queda sin donde imputar un peso. */
  if (!out.length) {
    out = [{ id: 'efectivo', nombre: 'Efectivo',     tipo: 'efectivo', col: 2, alias: '',        banco: '' },
           { id: 'mp',       nombre: 'Mercado Pago', tipo: 'digital',  col: 3, alias: 'maleump', banco: 'Mercado Pago' }];
  }
  try { CacheService.getScriptCache().put('cuentas_v2', JSON.stringify(out), 300); } catch (e) {}
  _CUENTAS_MEMO_ = out;
  return out;
}

function _cuentaDigitalDefault_() {
  var cs = _cuentas_();
  for (var i = 0; i < cs.length; i++) {
    if (cs[i].tipo === 'digital' && cs[i].id === 'mp') return 'mp';
  }
  /* Sin `mp` (alguien la renombro o la desactivo) cae en la primera digital
     que haya: es preferible imputar a otra cuenta que perder el registro. */
  for (var j = 0; j < cs.length; j++) if (cs[j].tipo === 'digital') return cs[j].id;
  return 'mp';
}

function _cuentaEfectivo_() {
  var cs = _cuentas_();
  for (var i = 0; i < cs.length; i++) if (cs[i].tipo === 'efectivo') return cs[i].id;
  return 'efectivo';
}

function _cuentaDeMetodo_(metodo) {
  var m = String(metodo || '').trim().toLowerCase();
  if (!m) return _cuentaDigitalDefault_();
  if (m.indexOf('efectivo') > -1) return _cuentaEfectivo_();
  var cs = _cuentas_();
  for (var i = 0; i < cs.length; i++) {
    if (cs[i].tipo === 'efectivo') continue;
    if (m === cs[i].id) return cs[i].id;
    var n = String(cs[i].nombre || '').toLowerCase();
    if (n && m.indexOf(n) > -1) return cs[i].id;
    /* La primera palabra del nombre: "Mercado Pago Tadeo" tiene que reconocer
       un metodo que diga "Mercado Pago", y "Brubank Lucas" uno que diga
       "Brubank". Se exigen 5 letras a proposito: con el id corto ("mp") un
       `indexOf` daria falsos positivos — "compra" contiene "mp". */
    var prim = n.split(' ')[0];
    if (prim.length >= 5 && m.indexOf(prim) > -1) return cs[i].id;
  }
  return _cuentaDigitalDefault_();
}

function _metodoDeCuenta_(id) {
  var s = String(id || '').trim().toLowerCase();
  if (!s) return '';
  var cs = _cuentas_();
  for (var i = 0; i < cs.length; i++) {
    if (cs[i].id !== s) continue;
    if (s === 'efectivo') return 'Efectivo';
    if (s === 'mp') return 'Mercado Pago';
    return String(cs[i].nombre || '').trim();
  }
  return '';
}

function _cuentaDigitalValida_(id) {
  var s = String(id || '').trim().toLowerCase();
  if (!s) return '';
  var cs = _cuentas_();
  for (var i = 0; i < cs.length; i++) {
    if (cs[i].id === s && cs[i].tipo === 'digital') return s;
  }
  return '';
}

var COBRO_OP_COL_ = 'Operación Cobro', COBRO_PAGO_COL_ = 'Pagó';

function _cobroOpValida_(v) {
  var s = String(v == null ? '' : v).trim();
  return /^[A-Za-z0-9_.:-]{4,60}$/.test(s) ? s : '';
}

function _cobroPagadorValido_(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 80);
}

var RED_EXC_HDR = { monto: 'Comisión Excepción', motivo: 'Motivo Excepción' };

function _redExcMonto_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = Number(v);
  return (isFinite(n) && n >= 0) ? Math.round(n) : null;
}

function _cuentasParaPanel_() {
  var cs = _cuentas_(), def = _cuentaDigitalDefault_(), out = [];
  for (var i = 0; i < cs.length; i++) {
    out.push({ id: cs[i].id, nombre: cs[i].nombre, tipo: cs[i].tipo, col: cs[i].col,
               alias: cs[i].alias || '', banco: cs[i].banco || '',
               def: (cs[i].id === def), inv: (cs[i].id === def) });
  }
  return out;
}

function _sumarCuenta_(mapa, cuenta, monto) {
  if (!cuenta) return;
  mapa[cuenta] = (mapa[cuenta] || 0) + monto;
}

function _depositos_() {
  try {
    var raw = CacheService.getScriptCache().get('depositos_v2');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  var out = [];
  var sh = SS.getSheetByName('Depositos');
  if (sh) {
    var d = sh.getDataRange().getValues();
    for (var r = 1; r < d.length; r++) {
      var id  = String(d[r][0] || '').trim().toLowerCase();
      var col = _colNumero_(d[r][3]);
      var act = String(d[r][4] || '').trim().toLowerCase();
      if (!id || !col || act.charAt(0) !== 's') continue;
      /* `user` (col F) es el usuario del ERP duenio de ese freezer:
         `tadeo` en Deposito Ustariz, `luqui` en Deposito Moresco. Se agrego el
         27/9/2026 para que el AUTOPEDIDO arranque en el freezer de quien lo
         esta cargando. Es config de planilla: se cambia sin deploy, y vacia
         deja todo como estaba. No se deriva del nombre del duenio a proposito
         —"Lucas Moresco" no se parece a `luqui`— y adivinarlo mandaria la
         mercaderia al freezer de otro. */
      out.push({ id: id, nombre: String(d[r][1] || id).trim(),
                 dueno: String(d[r][2] || '').trim(), col: col,
                 user: String(d[r][5] || '').trim().toLowerCase() });
    }
  }
  try { CacheService.getScriptCache().put('depositos_v2', JSON.stringify(out), 300); } catch (e) {}
  return out;
}

function _ixDepPedido_(headers) {
  var h = headers || [];
  for (var i = 0; i < h.length; i++) {
    var n = String(h[i]).trim();
    if (n === 'Depósito' || n === 'Deposito') return i;
  }
  return -1;
}

var PIEZAS_HOJA = 'Piezas Carne';

var PIEZAS_COLS = ['ID', 'Abreviatura', 'Corte', 'Peso kg', 'Estado', 'Deposito',
                   'Recibida', 'Proveedor', 'Costo kg', 'Pedido', 'Salida', 'Nota'];

function _piezasHoja_(crear) {
  var sh = SS.getSheetByName(PIEZAS_HOJA);
  if (sh || !crear) return sh;
  sh = SS.insertSheet(PIEZAS_HOJA);
  sh.getRange(1, 1, 1, PIEZAS_COLS.length).setValues([PIEZAS_COLS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  /* Formato NUMERO al gramo. Si la columna hereda formato de fecha, las celdas
     vacias se leen como 1899 — ya paso al agregar columnas de producto. */
  sh.getRange(2, 4, sh.getMaxRows() - 1, 1).setNumberFormat('0.000');
  sh.getRange(2, 9, sh.getMaxRows() - 1, 1).setNumberFormat('0.00');
  return sh;
}

function _piezasLeer_() {
  var sh = _piezasHoja_(false);
  if (!sh || sh.getLastRow() < 2) return [];
  var d = sh.getRange(2, 1, sh.getLastRow() - 1, PIEZAS_COLS.length).getValues();
  var out = [];
  for (var r = 0; r < d.length; r++) {
    var id = String(d[r][0] || '').trim();
    if (!id) continue;
    out.push({
      id: id,
      abbr: String(d[r][1] || '').trim(),
      corte: String(d[r][2] || '').trim(),
      peso: Math.round((Number(d[r][3]) || 0) * 1000) / 1000,
      estado: String(d[r][4] || '').trim(),
      dep: String(d[r][5] || '').trim().toLowerCase(),
      recibida: _piezaFecha_(d[r][6]),
      recHora: _piezaHora_(d[r][6]),
      prov: String(d[r][7] || '').trim(),
      costo: Number(d[r][8]) || 0,
      pedido: String(d[r][9] || '').trim(),
      salida: _piezaFecha_(d[r][10]),
      nota: String(d[r][11] || '').trim(),
      fila: r + 2
    });
  }
  return out;
}

function _stockPiezasSemana_(piezas) {
  var out = { conPiezas: {}, recSem: {} };
  for (var i = 0; i < (piezas || []).length; i++) {
    var p = piezas[i];
    if (!p || !p.abbr) continue;
    out.conPiezas[p.abbr] = true;
    var f = _mcFecha_(p.recibida);
    if (!f || !_semanaDeStockVigente_(f).vigente) continue;
    out.recSem[p.abbr] = Math.round(((out.recSem[p.abbr] || 0) + (Number(p.peso) || 0)) * 1000) / 1000;
  }
  return out;
}

function _arPartes_(v) {
  var a = new Date(v.getTime() - 3 * 3600000), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return { f: p(a.getUTCDate()) + '/' + p(a.getUTCMonth() + 1) + '/' + a.getUTCFullYear(), h: p(a.getUTCHours()) + ':' + p(a.getUTCMinutes()) };
}

function _piezaFecha_(v) {
  if (v instanceof Date) return _arPartes_(v).f;
  return String(v || '').trim();
}

function _piezaHora_(v) {
  if (!(v instanceof Date)) {
    var m = String(v || '').match(/\b(\d{1,2}:\d{2})/);
    return m ? m[1] : '';
  }
  var h = _arPartes_(v).h;
  return h === '00:00' ? '' : h;
}

var DOMINIO_LECTURA = {
  crmClientes: 'crm', crmInteracciones: 'crm', crmProductos: 'crm',
  crmLotes: 'crm', crmZonas: 'crm', crmPuntos: 'crm', hogaresMerge: 'crm',
  saludClientes: 'crm', crmLeads: 'crm', crmJugadas: 'crm',
  /* EL SEGUNDO DOMINIO QUE SE SEPARA (27/9/2026). Un cobro, un gasto o un
     objetivo del mes no cambian cuantas pizzas hay en el freezer, y hasta hoy
     enfriaban estas siete fotos igual. Medido ese dia: con foto `stockTab`
     tarda 2-3,6 s; sin foto, 4-5,3 s. Tadeo cobra todo el dia.
     `precios` y `catalogo` NO estan aca a proposito: son del catalogo de
     productos, no del stock, y no estan clasificados todavia. */
  stock: 'stock', stock_full: 'stock', stockTab: 'stock', piezas_full: 'stock',
  depositos: 'stock', carnePiezas: 'stock', pendientesGuardarStock: 'stock',
  /* Y los otros dos, el mismo dia. Contar el freezer no cambia la caja, y
     cobrar no cambia lo que se le debe a Caco.
     `planMes` se queda en `operacion` a proposito: depende de lo ENTREGADO, o
     sea de casi cualquier escritura de pedidos. Separarlo daria poco y
     arriesgaria un numero que Tadeo mira todos los dias. */
  cajaLight: 'caja', cobrosPendientes: 'caja',
  ocLight: 'compras', comprasCarne: 'compras'
};

var VERSION_LECTURAS_OPERACION = 'lecturas_operacion_ver';

var VERSION_LECTURAS_CRM = 'lecturas_crm_ver';

var VERSION_LECTURAS_STOCK = 'lecturas_stock_ver';

var VERSION_LECTURAS_CAJA = 'lecturas_caja_ver';

var VERSION_LECTURAS_COMPRAS = 'lecturas_compras_ver';

function _cobroTextoNorm_(s) {
  return _crmNormNombre(s).replace(/[^a-z0-9]+/g, ' ').trim();
}

function _cobroClaveCasa_(barrio, sub, lote) {
  var l = _cobroTextoNorm_(lote).replace(/^lote /, '').replace(/^0+(?=\d)/, '');
  var sb = _cobroTextoNorm_(sub);
  if (!l || !sb) return '';
  return 'c:' + _cobroTextoNorm_(barrio) + '|' + sb + '|' + l;
}

function _lecturaDominio_(action) {
  return DOMINIO_LECTURA[action] || 'operacion';
}

function _volcadoVer_() { return _lecturaVer_('cajaLight') + '|' + _lecturaVer_('pedidosLight'); }
function _lecturaVer_(action) {
  try {
    var c = CacheService.getScriptCache();
    var _dom = _lecturaDominio_(action);
    var clave = _dom === 'crm' ? VERSION_LECTURAS_CRM
              : _dom === 'stock' ? VERSION_LECTURAS_STOCK
              : _dom === 'caja' ? VERSION_LECTURAS_CAJA
              : _dom === 'compras' ? VERSION_LECTURAS_COMPRAS
              : VERSION_LECTURAS_OPERACION;
    var v = c.get(clave);
    if (!v) { v = String(Date.now()) + Math.random().toString(36).slice(2, 6); c.put(clave, v, 21600); }
    return v;
  } catch (e) { return ''; }
}

function _lecturaVer_(action) {
  try {
    var c = CacheService.getScriptCache();
    var _dom = _lecturaDominio_(action);
    var clave = _dom === 'crm' ? VERSION_LECTURAS_CRM
              : _dom === 'stock' ? VERSION_LECTURAS_STOCK
              : _dom === 'caja' ? VERSION_LECTURAS_CAJA
              : _dom === 'compras' ? VERSION_LECTURAS_COMPRAS
              : VERSION_LECTURAS_OPERACION;
    var v = c.get(clave);
    if (!v) { v = String(Date.now()) + Math.random().toString(36).slice(2, 6); c.put(clave, v, 21600); }
    return v;
  } catch (e) { return ''; }
}

function _pedidosConPiezas_(pedidos, hoja) {
  if (!pedidos || !pedidos.length) return;
  var piezas = _piezasLeer_();
  if (!piezas.length) return;
  var porRef = {};
  for (var i = 0; i < piezas.length; i++) {
    var p = piezas[i];
    var est = String(p.estado || '').trim().toLowerCase();
    if (!p.abbr || !p.pedido || !(est === 'asignada' || est === 'entregada')) continue;
    (porRef[p.pedido] = porRef[p.pedido] || []).push({ a: p.abbr, kg: p.peso });
  }
  pedidos.forEach(function (e) {
    var l = porRef[(hoja || e.h) + ' #' + e.n];
    if (!l) return;
    e.pz = l.slice().sort(function (x, y) { return (x.a < y.a ? -1 : (x.a > y.a ? 1 : 0)) || (x.kg - y.kg); });
  });
}

function _direccionCorta_(barrio, subBarrio, lote) {
  function limpio(v) {
    var t = String(v == null ? '' : v).trim();
    if (!t) return '';
    // Lo que en la planilla significa "no tiene": guion, punto, s/n, 0.
    if (/^[-–—.]+$/.test(t)) return '';
    if (/^(s\/n|sn|sin|n\/a|na|0)$/i.test(t)) return '';
    return t;
  }
  var zona = limpio(subBarrio) || limpio(barrio);
  var lt = limpio(lote);
  if (lt && /^\d/.test(lt)) lt = 'Lote ' + lt;
  return [zona, lt].filter(Boolean).join(' · ');
}

var _comPctCache = null;

function _comisionPct(nombre) {
  if (!_comPctCache) {   // null en la 1a llamada; undefined si el var aun no se evaluo
    _comPctCache = {};
    var shV = SS.getSheetByName('Vendedores');
    if (shV && shV.getLastRow() > 1) {
      var dV = shV.getDataRange().getValues();
      for (var rv = 1; rv < dV.length; rv++) {
        var nm = String(dV[rv][0] || '').trim();
        if (!nm) continue;
        var pct = Number(dV[rv][9]);
        _comPctCache[nm] = (pct > 0 && pct < 100) ? pct : 17;
      }
    }
  }
  var v = _comPctCache[String(nombre || '').trim()];
  return (v > 0 && v < 100) ? v : 17;
}

var RED_COBRA_MALEU_DESDE = 20261005;   // aaaammdd

function _redReglaNueva_(diaEntrega) {
  var y, m, d;
  if (diaEntrega instanceof Date) {
    y = diaEntrega.getFullYear(); m = diaEntrega.getMonth() + 1; d = diaEntrega.getDate();
  } else {
    var p = String(diaEntrega || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!p) return false;   // sin fecha legible: regla vieja, como hasta hoy
    d = +p[1]; m = +p[2]; y = +p[3];
  }
  return (y * 10000 + m * 100 + d) >= RED_COBRA_MALEU_DESDE;
}

var RED_DEBE_TOTAL_DESDE = 20261007;   // aaaammdd: cierres desde aca = Facturado entero

function _redFechaNum_(v) {
  if (v instanceof Date) return v.getFullYear() * 10000 + (v.getMonth() + 1) * 100 + v.getDate();
  var p = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return p ? (+p[3]) * 10000 + (+p[2]) * 100 + (+p[1]) : 0;
}

function _redDebeAMaleu_(fila, iAPagar) {
  var o = _redDebeAMaleuBruto_(fila, iAPagar);
  /* LIQUIDACION QUINCENAL (9/10/2026). Un pedido cuya comision Maleu ya pago
     lleva el id de la liquidacion en la columna «Comisión Liquidada»: ahi Maleu
     no le debe nada. Se resuelve ACA para que los que suman `leDebe` (Cobros,
     tab Vendedores, portal) se corrijan todos juntos. `com` y `env` son lo que
     se pago o se va a pagar, partido; `leDebe` es lo que falta pagar.
     Con la palanca LIQUIDACION_RED apagada no se mira nada. */
  var iL = _liqRedIdx_();
  if (iL >= 0 && iL < fila.length) {
    var marca = String(fila[iL] == null ? '' : fila[iL]).trim();
    if (marca) { o.liq = marca; o.leDebe = 0; }
  }
  return o;
}

function _redDebeAMaleuBruto_(fila, iAPagar) {
  var com = (typeof fila[46] === 'number' && isFinite(fila[46])) ? fila[46] : null;   // col AU Comision
  if (!_redReglaNueva_(fila[10])) {
    var aP = Number(fila[iAPagar]) || 0;
    var epm = String(fila[53] || '').trim();                       // col BB Estado Pago a Maleu
    var cerroViejo = (epm === 'Pagado' || epm === 'Sí' || epm === 'Si')
      && _redFechaNum_(fila[54]) < RED_DEBE_TOTAL_DESDE;          // col BC Fecha Pago a Maleu
    if (cerroViejo) return { nueva: false, debe: aP, leDebe: 0, cerroViejo: true, com: 0, env: 0 };
    var fac = Number(fila[20]) || 0;                               // col U Facturado
    if (com == null) com = fac ? Math.max(0, fac - aP) : 0;
    if (!fac) fac = aP + com;
    return { nueva: false, debe: Math.round(fac), leDebe: Math.round(com), com: Math.round(com), env: 0 };
  }
  var ef = Number(fila[16]) || 0;                       // col Q Efectivo ($)
  var fp = String(fila[12] || '').trim().toLowerCase(); // col M Forma de Pago
  if (!ef && fp === 'efectivo') ef = Number(fila[14]) || 0;   // col O Total ($)
  var envN = Math.round(Number(fila[15]) || 0);                                              // col P Envio
  /* EL ENVIO COBRADO EN EFECTIVO TAMBIEN SE ENTREGA (24/10/2026). Las cols Q/R
     se cargan SIN el envio (Q+R+P = Total), asi que el vendedor que cobraba todo
     en efectivo entregaba Q y se quedaba con el envio en la mano, y la quincena
     se lo volvia a pagar en `leDebe`: el envio dos veces (Fede #2023 $3.000,
     Rufino #120 $5.000). Si el cliente pago solo en efectivo, el envio va con el
     resto. Lo ya cerrado (Estado Pago a Maleu) conserva su numero: las sumas de
     lo rendido por semana salen de aca. Mixto con transferencia: queda como estaba. */
  var trN = Number(fila[17]) || 0;                      // col R Transferencia ($)
  var epmN = String(fila[53] || '').trim();             // col BB Estado Pago a Maleu
  if (ef > 0 && !(trN > 0) && envN > 0 && !(epmN === 'Pagado' || epmN === 'Sí' || epmN === 'Si')) ef += envN;
  return { nueva: true, debe: ef, leDebe: Math.round((com || 0) + (Number(fila[15]) || 0)),
           com: Math.round(com || 0), env: envN };
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

var RED_FCOBRO_COL = 'Fecha de Cobro';

var RED_CCOBRO_COL = 'Cuenta Cobro';

var _RED_CD_IDX_ = null;

function _redCobroACajaActiva_() { return _cfgSiNo_('RED_COBRO_A_CAJA', false); }

/** Las columnas «Fecha de Cobro» y «Cuenta Cobro» de Red (1-based; 0 = no esta).
 *  Con `crear` las agrega al final, agrandando la grilla. */
function _redCobroCols_(sh, crear) {
  var out = { fecha: 0, cuenta: 0 };
  if (!sh) return out;
  var ancho = sh.getLastColumn();
  var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
  for (var i = 0; i < cab.length; i++) {
    var nm = String(cab[i] == null ? '' : cab[i]).trim();
    if (nm === RED_FCOBRO_COL) out.fecha = i + 1;
    if (nm === RED_CCOBRO_COL) out.cuenta = i + 1;
  }
  if (!crear || (out.fecha && out.cuenta)) return out;
  [['fecha', RED_FCOBRO_COL, 'dd/MM/yyyy HH:mm'], ['cuenta', RED_CCOBRO_COL, '@']].forEach(function (c) {
    if (out[c[0]]) return;
    ancho++;
    if (ancho > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), ancho - sh.getMaxColumns());
    sh.getRange(1, ancho).setValue(c[1]).setFontWeight('bold');
    sh.getRange(2, ancho, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat(c[2]);
    out[c[0]] = ancho;
  });
  SpreadsheetApp.flush();
  _RED_CD_IDX_ = null;
  return out;
}

function _redCobroCols_(sh, crear) {
  var out = { fecha: 0, cuenta: 0 };
  if (!sh) return out;
  var ancho = sh.getLastColumn();
  var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
  for (var i = 0; i < cab.length; i++) {
    var nm = String(cab[i] == null ? '' : cab[i]).trim();
    if (nm === RED_FCOBRO_COL) out.fecha = i + 1;
    if (nm === RED_CCOBRO_COL) out.cuenta = i + 1;
  }
  if (!crear || (out.fecha && out.cuenta)) return out;
  [['fecha', RED_FCOBRO_COL, 'dd/MM/yyyy HH:mm'], ['cuenta', RED_CCOBRO_COL, '@']].forEach(function (c) {
    if (out[c[0]]) return;
    ancho++;
    if (ancho > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), ancho - sh.getMaxColumns());
    sh.getRange(1, ancho).setValue(c[1]).setFontWeight('bold');
    sh.getRange(2, ancho, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat(c[2]);
    out[c[0]] = ancho;
  });
  SpreadsheetApp.flush();
  _RED_CD_IDX_ = null;
  return out;
}

function _redCobroIdx_() {
  if (_RED_CD_IDX_ != null) return _RED_CD_IDX_ || null;
  var o = false;
  try {
    if (_redCobroACajaActiva_()) {
      var c = _redCobroCols_(SS.getSheetByName('Red'), false);
      if (c.fecha && c.cuenta) o = { f: c.fecha - 1, c: c.cuenta - 1 };
    }
  } catch (e) { o = false; }
  _RED_CD_IDX_ = o;
  return o || null;
}

function _redDirecto_(fila) {
  var I = _redCobroIdx_();
  if (!I) return null;
  if (!_redReglaNueva_(fila[10])) return null;
  if (String(fila[11] || '').trim() === 'Cancelado') return null;
  if (String(fila[13] || '').trim() !== 'Cobrado') return null;
  var fp = String(fila[12] || '').trim().toLowerCase(), tr = 0;
  if (fp === 'transferencia') tr = (Number(fila[20]) || Number(fila[14]) || 0) + (Number(fila[15]) || 0);
  else if (fp === 'mixto') tr = Number(fila[17]) || 0;
  if (!(tr > 0)) return null;
  return { tr: Math.round(tr), fecha: I.f < fila.length ? fila[I.f] : '',
           cuenta: I.c < fila.length ? _cuentaDigitalValida_(fila[I.c]) : '' };
}

function _rbNumeroCliente_(origenDetalle, confirmadoPor) {
  var m = /^Pasando desde (Home|Pilar) #(\S+)/.exec(String(origenDetalle || '').trim())
       || /era (Home|Pilar) #(\S+)/.exec(String(confirmadoPor || ''));
  if (!m || m[2] === '-') return null;
  return { hoja: m[1], n: m[2].replace(/[)\s]+$/, '') };
}

var REDONDEO_HOJA_ = 'Redondeos Proveedores';

var REDONDEO_CAB_ = ['ID', 'Registrado', 'Proveedor', 'Semana', 'Monto', 'Quién', 'Estado', 'Anulado el', 'Anulado por'];

function _redondeosHoja_(crear) {
  var sh = SS.getSheetByName(REDONDEO_HOJA_);
  if (!sh && crear) {
    sh = SS.insertSheet(REDONDEO_HOJA_);
    sh.getRange(1, 1, 1, REDONDEO_CAB_.length).setValues([REDONDEO_CAB_]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function _redondeosLeer_() {
  var sh = _redondeosHoja_(false), out = [];
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, REDONDEO_CAB_.length).getValues().forEach(function (f, i) {
    var id = String(f[0] || '').trim(); if (!id) return;
    var fe = f[1] instanceof Date ? f[1] : _mcFecha_(f[1]);
    out.push({ id: id, row: i + 2, fecha: fe ? Utilities.formatDate(fe, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy') : String(f[1] || ''),
               fDate: fe, prov: String(f[2] || '').trim(), sem: String(f[3] || '').trim(), monto: Number(f[4]) || 0,
               quien: String(f[5] || '').trim(), estado: String(f[6] || '').trim() || 'Vigente' });
  });
  return out;
}

function _redondeosParaEerr_() {
  var MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  try {
    return _redondeosLeer_().filter(function (x) { return x.estado === 'Vigente' && x.fDate && x.monto > 0; }).map(function (x) {
      return { id: x.id, f: x.fecha, mes: MESES[x.fDate.getMonth()], anio: x.fDate.getFullYear(), $: x.monto,
               cat: 'Redondeo proveedor', con: 'Redondeo ' + x.prov + ' (semana ' + x.sem + ')' };
    });
  } catch (e) { return []; }
}

function _uniValida_(v) {
  var s = String(v || '').trim().toLowerCase();
  return (s === 'kg' || s === 'u') ? s : 'u';
}

function _isoWeek(date) {
  const d      = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

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

var proveedores = [];

var manana = new Date();

var dd = String(manana.getDate()).padStart(2,'0');

var mm = String(manana.getMonth()+1).padStart(2,'0');

function _numCelda_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var t = String(v == null ? '' : v).replace(/\$/g, '').replace(/\s/g, '');
  if (!t) return 0;
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  var n = parseFloat(t);
  return isFinite(n) ? n : 0;
}

function _ymCelda_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Argentina/Buenos_Aires', 'yyyy-MM');
  var t = String(v == null ? '' : v).trim();
  var m = t.match(/^(\d{4})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  m = t.match(/^\d{1,2}\/(\d{1,2})\/(\d{4})/);
  if (m) return m[2] + '-' + ('0' + m[1]).slice(-2);
  return t;
}

function _eerrParamsPanel_() {
  var prov = [], cfg = [];
  try {
    var shP = SS.getSheetByName('Provisiones_Fijas');
    if (shP && shP.getLastRow() > 1) {
      shP.getRange(2, 1, shP.getLastRow() - 1, 5).getValues().forEach(function (r) {
        var con = String(r[0] || '').trim(), cat = String(r[1] || '').trim().toLowerCase();
        if (!con || !cat) return;
        prov.push({ concepto: con, cat: cat, monto: _numCelda_(r[2]),
                    desde: _ymCelda_(r[3]), hasta: _ymCelda_(r[4]) || null });
      });
    }
  } catch (e) {}
  try {
    var shC = SS.getSheetByName('Config_Maleu');
    if (shC && shC.getLastRow() > 1) {
      shC.getRange(2, 1, shC.getLastRow() - 1, 3).getValues().forEach(function (r) {
        var p = String(r[0] || '').trim().toUpperCase();
        if (!p || p.indexOf('AVISOS_') === 0) return;
        var v = r[1];
        if (typeof v !== 'number' && !/^\s*-?\$?\s*[\d.,]+\s*$/.test(String(v == null ? '' : v))) return;
        cfg.push({ param: p, valor: _numCelda_(v), desde: _ymCelda_(r[2]) });
      });
    }
  } catch (e) {}
  return { provisiones: prov, config: cfg };
}

var _MESES_NOMBRE_ = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
                      'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function _mesNombreDe_(d) {
  return (d instanceof Date && !isNaN(d.getTime())) ? _MESES_NOMBRE_[d.getMonth()] : '';
}

function _mesContable_(fechaEntrega, fechaPedido) {
  var d = _mcFecha_(fechaEntrega) || _mcFecha_(fechaPedido);
  if (!d) return '';
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
}

function _mcFecha_(raw) {
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  var s = String(raw || '').trim();
  if (!s) return null;
  s = s.split(' ')[0];
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

function _leerColsRalas_(sh, idxs, modo) {
  var n = sh.getLastRow();
  // modo: solo para MEDIR desde afuera cual de las tres formas conviene.
  //   'todo'  = la hoja entera (como era antes)
  //   'uno'   = un solo rango, de la primera a la ultima columna que se usa
  //   default = dos bloques partiendo por el hueco mas grande
  if (modo === 'todo') {
    var _d = sh.getDataRange().getValues();
    return { n: _d.length, v: function (r, idx) { return (idx >= 0 && _d[r]) ? _d[r][idx] : ''; } };
  }
  var ord = idxs.filter(function (x) { return x >= 0; })
                .sort(function (a, b) { return a - b; });
  if (!ord.length) return { n: n, v: function () { return ''; } };
  var corte = -1, mayor = 0;
  for (var i = 1; i < ord.length; i++) {
    var hueco = ord[i] - ord[i - 1];
    if (hueco > mayor) { mayor = hueco; corte = i; }
  }
  // Umbral 8: partir cuesta una llamada mas, asi que solo conviene si el hueco
  // que se saltea es mas ancho que ese costo.
  var bloques = (corte > 0 && mayor > 8 && modo !== 'uno')
    ? [[ord[0], ord[corte - 1]], [ord[corte], ord[ord.length - 1]]]
    : [[ord[0], ord[ord.length - 1]]];
  var datos = bloques.map(function (b) {
    return sh.getRange(1, b[0] + 1, n, b[1] - b[0] + 1).getValues();
  });
  return {
    n: n,
    v: function (r, idx) {
      for (var k = 0; k < bloques.length; k++) {
        if (idx >= bloques[k][0] && idx <= bloques[k][1]) return datos[k][r][idx - bloques[k][0]];
      }
      return '';
    }
  };
}

var EF_MANO_DIAS_DETALLE = 10;

function _efectivoEnManoPorDia_(cobrosDetalle, parseFecha) {
  var dias = {};                       // 'dd/MM/yyyy' -> acumulador
  function dia(f) {
    if (!dias[f]) dias[f] = { f: f, cobrado: 0, bil: 0, cambioMP: 0, cruzado: 0, det: {}, pq: {} };
    return dias[f];
  }
  /* Lo mismo, abierto por QUIEN tiene la plata (13/9/2026). Es la MISMA formula
     aplicada a cada persona, asi que las partes suman el total por construccion:
     entro = cobrado + CambioMP + Billetera · salio = Billetera + CruzadoEf.
     Una fila sin persona va a '' ("sin asignar"): repartirla seria inventar. */
  function per(d, q) {
    q = String(q || '').trim();
    if (!d.pq[q]) d.pq[q] = { q: q, cobrado: 0, bil: 0, cambioMP: 0, cruzado: 0, ks: {} };
    return d.pq[q];
  }
  function soloFecha(s) { return String(s || '').trim().split(' ')[0]; }

  (cobrosDetalle || []).forEach(function (cd) {
    if (!(cd.efTotal > 0)) return;
    var d = dia(soloFecha(cd.f));
    d.cobrado += cd.efTotal;
    var k = (cd.h || '') + '|' + (cd.id || '');
    if (!d.det[k]) d.det[k] = { c: cd.c || '', id: cd.id || '', h: cd.h || '', cobro: 0, vto: 0, tipo: '', q: '', rec: 0, t: '' };
    d.det[k].cobro += cd.efTotal;
    if (!d.det[k].t && cd.t) d.det[k].t = String(cd.t);
    /* La operacion del cuadro, la casa y quien pago (26/10/2026): con eso Caja
       compara el billete contra todo lo cobrado en la misma operacion. */
    if (!d.det[k].op && cd.op) d.det[k].op = String(cd.op);
    if (!d.det[k].casa && cd.casa) d.det[k].casa = String(cd.casa);
    if (!d.det[k].pg && cd.pg) d.det[k].pg = String(cd.pg);
    /* El billete guardado, para que la card pueda COMPARAR en vez de afirmar
       una cuenta (28/9/2026). No entra en la formula del total a proposito:
       ver el comentario de esta funcion — dos criterios para el mismo numero
       es el error que este ERP ya pago cuatro veces. */
    if (Number(cd.recEf) > 0) d.det[k].rec = (d.det[k].rec || 0) + Number(cd.recEf);
    if (!d.det[k].q && cd.q) d.det[k].q = String(cd.q).trim();
    var p = per(d, cd.q);
    p.cobrado += cd.efTotal;
    p.ks[k] = 1;
  });

  var sh = SS.getSheetByName('Cambios Billetera');
  if (sh && sh.getLastRow() > 1) {
    var v = sh.getDataRange().getValues();
    for (var r = 1; r < v.length; r++) {
      var monto = Number(v[r][4]) || 0;
      if (monto <= 0) continue;
      var dt = parseFecha(v[r][0]);
      var f = dt ? Utilities.formatDate(dt, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy') : soloFecha(v[r][0]);
      var d = dia(f);
      var tipo = String(v[r][6] || 'Billetera').trim();
      if (tipo === 'CambioMP') d.cambioMP += monto;
      else if (tipo === 'CruzadoEf') d.cruzado += monto;
      else d.bil += monto;
      var k2 = String(v[r][1] || '') + '|' + String(v[r][2] || '').trim();
      var qv = String(v[r][5] || '').trim();       // col F "Repartidor": quien dio el vuelto
      if (!d.det[k2]) d.det[k2] = { c: String(v[r][3] || ''), id: String(v[r][2] || '').trim(), h: String(v[r][1] || ''), cobro: 0, vto: 0, tipo: '', q: '', rec: 0 };
      d.det[k2].vto += monto;
      d.det[k2].tipo = tipo;
      if (!d.det[k2].q && qv) d.det[k2].q = qv;
      var pv = per(d, qv);
      if (tipo === 'CambioMP') pv.cambioMP += monto;
      else if (tipo === 'CruzadoEf') pv.cruzado += monto;
      else pv.bil += monto;
      pv.ks[k2] = 1;
    }
  }

  var out = [];
  Object.keys(dias).forEach(function (f) {
    var d = dias[f];
    var entro = d.cobrado + d.cambioMP + d.bil;   // billetes que entraron a la mano
    var salio = d.bil + d.cruzado;                // efectivo que salio de la mano
    if (entro <= 0 && salio <= 0) return;
    /* Compacto a proposito (q, e, s, n): viaja para cada dia del historial. */
    var porQuien = Object.keys(d.pq).map(function (q) {
      var p = d.pq[q];
      return { q: p.q, e: p.cobrado + p.cambioMP + p.bil, s: p.bil + p.cruzado, n: Object.keys(p.ks).length };
    }).filter(function (p) { return p.e > 0 || p.s > 0; })
      .sort(function (a, b) {
        if (!a.q !== !b.q) return a.q ? -1 : 1;     // "sin asignar" siempre ultimo
        return (b.e - b.s) - (a.e - a.s);
      });
    out.push({ f: f, cobrado: d.cobrado, bil: d.bil, cambioMP: d.cambioMP,
               cruzado: d.cruzado, entro: entro, salio: salio, neto: entro - salio,
               porQuien: porQuien, _det: d.det });
  });
  // Mas reciente arriba, y el detalle por cliente solo en los ultimos dias: el
  // resto es historia y son seis numeros por dia contra una lista entera.
  out.sort(function (a, b) {
    var pa = a.f.split('/'), pb = b.f.split('/');
    return (pb[2] + pb[1] + pb[0] > pa[2] + pa[1] + pa[0]) ? 1 : -1;
  });
  out.forEach(function (d, i) {
    if (i < EF_MANO_DIAS_DETALLE) {
      d.det = Object.keys(d._det).map(function (k) { return d._det[k]; })
                    .filter(function (x) { return x.cobro > 0 || x.vto > 0; })
                    .sort(function (a, b) { return b.cobro - a.cobro; });
    }
    delete d._det;
  });
  return out;
}

var VOLCADO_CACHE_SEG = 900;

var _CACHE_TROZO_BYTES = 90000;

function _trozosPorBytes_(texto, maxBytes) {
  var out = [], ini = 0, b = 0;
  for (var i = 0; i < texto.length; i++) {
    var cc = texto.charCodeAt(i), w, par = false;
    if (cc < 0x80) w = 1;
    else if (cc < 0x800) w = 2;
    else if (cc >= 0xD800 && cc <= 0xDBFF && i + 1 < texto.length) { w = 4; par = true; }
    else w = 3;
    if (b + w > maxBytes && i > ini) { out.push(texto.substring(ini, i)); ini = i; b = 0; }
    b += w;
    if (par) i++;
  }
  if (ini < texto.length) out.push(texto.substring(ini));
  return out;
}

function _cacheGuardarGrande_(base, texto, seg) {
  try {
    var c = CacheService.getScriptCache(), obj = {}, n = 0;
    var trozos = _trozosPorBytes_(texto, _CACHE_TROZO_BYTES);
    for (var i = 0; i < trozos.length; i++) obj[base + '_' + (n++)] = trozos[i];
    if (n > 40) return;                       // absurdamente grande: no vale la pena
    obj[base + '_n'] = String(n);
    c.putAll(obj, seg);
  } catch (e) { /* sin cache no rompe el flujo */ }
}

function _cacheLeerGrande_(base) {
  try {
    var c = CacheService.getScriptCache();
    var n = Number(c.get(base + '_n'));
    if (!n || n < 1) return null;
    var claves = [];
    for (var i = 0; i < n; i++) claves.push(base + '_' + i);
    var partes = c.getAll(claves), out = '';
    for (var j = 0; j < n; j++) {
      if (partes[claves[j]] == null) return null;   // falta un trozo: no sirve nada
      out += partes[claves[j]];
    }
    return out;
  } catch (e) { return null; }
}

function _crmPgFetch_(cfg, method, path, body) {
  var opt = {method:method,headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},muteHttpExceptions:true};
  if (body != null) opt.payload = JSON.stringify(body);
  var res = _uf_('_crmPgFetch_', cfg.url + '/rest/v1/' + path, opt), code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Postgres ' + code + ': ' + res.getContentText().slice(0,300));
  return res.getContentText() ? JSON.parse(res.getContentText()) : [];
}

var PG_ERROR_MSG_TOPE = 400;

function _pgAnotarError_(pre, e) {
  var p = PropertiesService.getScriptProperties();
  p.setProperty(pre + '_SYNC_LAST_ERROR_AT', String(Date.now()));
  /* Se TRUNCA: una Script Property aguanta 9 KB, y un 400 de PostgREST puede
     traer el registro entero adentro del mensaje. En los primeros 400
     caracteres estan el codigo y el motivo, que es lo que se viene a leer. */
  var msg = String((e && e.message) || e || 'sin detalle').slice(0, PG_ERROR_MSG_TOPE);
  /* En su propio try: si guardar el mensaje fallara, el error DE VERDAD tiene
     que seguir subiendo igual. Anotar el motivo no puede tapar el motivo. */
  try { p.setProperty(pre + '_SYNC_LAST_ERROR_MSG', msg); } catch (eMsg) {}
  try { _pgFallasContar_(p, pre, msg); } catch (eF) {}
}

var PG_FALLAS_DOMINIOS_ = ['ORD_PG', 'CAJA_PG', 'OC_PG', 'INV_PG', 'CRM_PG', 'PLAN_PG', 'FOTO'];

var PG_FALLAS_NOMBRE_ = { ORD_PG: 'pedidos', CAJA_PG: 'caja', OC_PG: 'compras', INV_PG: 'inventario', CRM_PG: 'CRM', PLAN_PG: 'la meta del mes', FOTO: 'las fotos de pantalla' };

function _pgFallasContar_(p, pre, msg) {
  if (PG_FALLAS_DOMINIOS_.indexOf(pre) < 0) return;
  var vuelta = String(_VUELTA_INICIO_ || Math.floor(Date.now() / 300000));
  var st = {}; try { st = JSON.parse(p.getProperty('PG_FALLAS_' + pre) || '{}') || {}; } catch (e) { st = {}; }
  if (st.v === vuelta) return;                       /* la misma vuelta ya conto */
  st.n = (Number(st.n) || 0) + 1; st.v = vuelta; if (!st.desde) st.desde = Date.now();
  p.setProperty('PG_FALLAS_' + pre, JSON.stringify(st));
  if (st.n === 2) {
    _alertaTecnica_('replica ' + pre, 'La réplica de ' + (PG_FALLAS_NOMBRE_[pre] || pre) + ' falló dos vueltas seguidas: la base no se está poniendo al día',
      ['Desde: ' + Utilities.formatDate(new Date(st.desde), 'America/Argentina/Buenos_Aires', 'dd/MM HH:mm') + '.',
       'Último error: ' + String(msg || '').slice(0, 300)]);
  }
}

var _CATALOGO_ = null;

var CATALOGO_CACHE_ = 'catalogo_pg_v1';

function _catalogoFilasBase_(cfg) {
  var c = CacheService.getScriptCache(), raw = null;
  try { raw = c.get(CATALOGO_CACHE_); } catch (e) {}
  if (raw) { try { return JSON.parse(raw); } catch (eJ) {} }
  var filas = _crmPgFetch_(cfg, 'get', 'product_channel_code?select=channel,code,sku,active&limit=2000');
  try { c.put(CATALOGO_CACHE_, JSON.stringify(filas), 600); } catch (eP) {}
  return filas;
}

function _catalogoDesdeBase_(filas, escritos, cabRed) {
  var vivas = (filas || []).filter(function (f) { return f && f.active !== false; });
  var m = _catalogoMapas_(vivas, []);
  var motivo = '';
  [['paginaId', 'tienda'], ['clubesId', 'Clubes'], ['redId', 'Red']].forEach(function (par) {
    var a = escritos[par[0]] || {}, b = m[par[0]];
    Object.keys(a).forEach(function (k) {
      if (motivo) return;
      if (!(k in b)) motivo = par[1] + ' ' + k + ' (' + a[k] + ') esta en el codigo y no en la base';
      else if (String(b[k]) !== String(a[k])) motivo = par[1] + ' ' + k + ' es ' + a[k] + ' en el codigo y ' + b[k] + ' en la base: un id no cambia de producto';
    });
  });
  if (motivo) return { motivo: motivo };
  var out = { paginaId: m.paginaId, clubesId: m.clubesId, redId: m.redId, origen: 'base' }, col = null;
  Object.defineProperty(out, 'redCol', { enumerable: true, get: function () {
    if (col) return col;
    /* Un producto sin columna en el encabezado queda SIN entrada: el pedido de
       Red ya avisa de eso por su cuenta («tiene productos que la hoja no puede
       guardar») y no se cae. Reventar aca tumbaria el pedido entero. */
    col = _catalogoMapas_(vivas, cabRed()).redCol;
    return col;
  } });
  return { mapas: out };
}

function _catalogo_() {
  if (_CATALOGO_) return _CATALOGO_;
  var escritos = _catalogoEscritos_();
  escritos.origen = 'codigo';
  var modo = _cfgTexto_('CATALOGO_PG', 'no');
  if (modo !== 'si' && modo !== 'sí') return (_CATALOGO_ = escritos);
  try {
    var cfg = _crmPgConfig_();
    if (!cfg.enabled) throw new Error('la base no esta configurada');
    var r = _catalogoDesdeBase_(_catalogoFilasBase_(cfg), escritos, function () {
      var sh = SS.getSheetByName('Red');
      return (sh && sh.getLastColumn() > 0) ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    });
    if (!r.mapas) throw new Error(r.motivo);
    _CATALOGO_ = r.mapas;
  } catch (e) {
    try { _pgAnotarError_('CATALOGO_PG', e); } catch (e2) {}
    try { _catalogoAvisar_(String((e && e.message) || e)); } catch (e3) {}
    _CATALOGO_ = escritos;
  }
  return _CATALOGO_;
}

function _catalogoAvisar_(motivo) {
  var p = PropertiesService.getScriptProperties();
  var hoy = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  if (p.getProperty('CATALOGO_PG_RESPALDO') === hoy) return;
  _alertaTecnica_('_catalogo_', 'CATALOGO_PG en si pero se usaron los mapas del codigo', [motivo]);
  p.setProperty('CATALOGO_PG_RESPALDO', hoy);
}

function _catalogoMapas_(filas, cabRed) {
  var m = { paginaId: {}, clubesId: {}, redId: {}, redCol: {} };
  var cab = (cabRed || []).map(function (h) { return String(h == null ? '' : h).replace(/\s+/g, ' ').trim(); });
  (filas || []).forEach(function (f) {
    var code = String(f.code), sku = String(f.sku);
    if (f.channel === 'tienda') m.paginaId[code] = sku;
    else if (f.channel === 'clubes') m.clubesId[code] = sku;
    else if (f.channel === 'red') {
      m.redId[code] = sku;
      var i = cab.indexOf(sku);
      if (i >= 0) m.redCol[code] = i + 1;
    }
  });
  return m;
}

function _catalogoEscritos_() {
  return { paginaId: PAGE_ID_TO_ABBR, clubesId: CLUBES_ID_TO_ABBR, redId: RED_ID_TO_ABBR, redCol: RED_PRODUCT_COLS };
}

var _COLMAPS_ = {};

var COLMAP_BASE_ID_ = { Home: 1, Pilar: 1, Clubes: 0 };

function _colMapEscrito_(hoja, tipo) {
  if (tipo === 'id') return hoja === 'Home' ? HOME_PRODUCT_COLS : hoja === 'Pilar' ? PILAR_PRODUCT_COLS
    : hoja === 'Clubes' ? CLUBES_PRODUCT_COLS : null;
  return hoja === 'Home' ? HOME_COL_TO_ABBR : hoja === 'Pilar' ? PILAR_COL_TO_ABBR
    : hoja === 'Clubes' ? CLUBES_COL_TO_ABBR : hoja === 'Red' ? RED_COL_TO_ABBR : null;
}

function _colMapCab_(hoja) {
  var sh = SS.getSheetByName(hoja);
  if (!sh || sh.getLastColumn() < 1) return [];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

function _colMapsDesdeCab_(cab, skus, idASku, base) {
  var c = (cab || []).map(function (h) { return String(h == null ? '' : h).replace(/\s+/g, ' ').trim(); });
  var abbr = {}, id = {}, visto = {};
  c.forEach(function (h, i) { if (h && skus[h] && !visto[h]) { visto[h] = 1; abbr[i + 1] = h; } });
  Object.keys(idASku || {}).forEach(function (k) {
    var i = c.indexOf(String(idASku[k]));
    if (i >= 0) id[k] = i + (base || 0);
  });
  return { abbr: abbr, id: id };
}

function _colMapSkus_(cat) {
  var s = {};
  ['Home', 'Pilar', 'Clubes', 'Red'].forEach(function (h) {
    var m = _colMapEscrito_(h, 'abbr') || {};
    Object.keys(m).forEach(function (k) { s[m[k]] = 1; });
  });
  ['paginaId', 'clubesId', 'redId'].forEach(function (n) {
    var m = (cat && cat[n]) || {};
    Object.keys(m).forEach(function (k) { s[m[k]] = 1; });
  });
  return s;
}

function _colMapFalta_(der, escrito, tipo) {
  var falta = '';
  if (tipo === 'id') {
    Object.keys(escrito).forEach(function (k) { if (!falta && !(k in der)) falta = 'el id ' + k + ' no tiene columna en el encabezado'; });
  } else {
    var estan = {};
    Object.keys(der).forEach(function (k) { estan[der[k]] = 1; });
    Object.keys(escrito).forEach(function (k) { if (!falta && !estan[escrito[k]]) falta = 'la sigla ' + escrito[k] + ' no esta en el encabezado'; });
  }
  return falta;
}

function _colMap_(hoja, tipo) {
  var k = hoja + '|' + tipo;
  if (_COLMAPS_[k]) return _COLMAPS_[k];
  var escrito = _colMapEscrito_(hoja, tipo);
  if (!escrito) return null;
  var cat = _catalogo_();
  if (cat.origen !== 'base') return (_COLMAPS_[k] = escrito);
  try {
    var idASku = hoja === 'Clubes' ? cat.clubesId : hoja === 'Red' ? null : cat.paginaId;
    var der = _colMapsDesdeCab_(_colMapCab_(hoja), _colMapSkus_(cat), idASku, COLMAP_BASE_ID_[hoja]);
    /* Los dos tipos salen de la misma lectura: se guardan juntos. */
    ['abbr', 'id'].forEach(function (t) {
      var e = _colMapEscrito_(hoja, t);
      if (!e) return;
      var falta = _colMapFalta_(der[t], e, t);
      if (falta) throw new Error(hoja + ': ' + falta);
    });
    _COLMAPS_[hoja + '|abbr'] = der.abbr;
    if (_colMapEscrito_(hoja, 'id')) _COLMAPS_[hoja + '|id'] = der.id;
  } catch (e) {
    try { _pgAnotarError_('CATALOGO_PG', e); } catch (e2) {}
    try { _catalogoAvisar_(String((e && e.message) || e)); } catch (e3) {}
    _COLMAPS_[hoja + '|abbr'] = _colMapEscrito_(hoja, 'abbr');
    if (_colMapEscrito_(hoja, 'id')) _COLMAPS_[hoja + '|id'] = _colMapEscrito_(hoja, 'id');
  }
  return _COLMAPS_[k];
}

function _prodsDeFila_(hoja, fila, redondear) {
  var mapa = _colsAbbr_(hoja) || {}, k = hoja + '|orden';
  var orden = _COLMAPS_[k] || (_COLMAPS_[k] = Object.keys(mapa).map(Number).sort(function (a, b) { return a - b; }));
  var out = [];
  for (var i = 0; i < orden.length; i++) {
    var crudo = fila[orden[i] - 1], q = Number(crudo);
    if (isNaN(q)) q = Number(String(crudo == null ? '' : crudo).replace(',', '.'));
    q = q || 0;
    if (q > 0) out.push({ a: mapa[orden[i]], q: redondear ? Math.round(q * 1000) / 1000 : q });
  }
  return out;
}

function _colsAbbr_(hoja) { return _colMap_(hoja, 'abbr'); }
/** {id: columna} de Home, Pilar (desde 1) o Clubes (desde 0). */
function _colsId_(hoja) { return _colMap_(hoja, 'id'); }
/* Para `catalogoMedir`: que cambiaria si los siete mapas salieran HOY del
   encabezado. `filas` son las de `product_channel_code`; `cabDe` se pasa para
   poder probarla. */
function _colMapsComparar_(filas, cabDe) {
  var vivas = (filas || []).filter(function (f) { return f && f.active !== false; });
  var cat = _catalogoMapas_(vivas, []), skus = _colMapSkus_(cat), dif = [];
  ['Home', 'Pilar', 'Clubes', 'Red'].forEach(function (hoja) {
    var idASku = hoja === 'Clubes' ? cat.clubesId : hoja === 'Red' ? null : cat.paginaId;
    var der = _colMapsDesdeCab_((cabDe || _colMapCab_)(hoja), skus, idASku, COLMAP_BASE_ID_[hoja]);
    ['abbr', 'id'].forEach(function (t) {
      var a = _colMapEscrito_(hoja, t), b = der[t], nom = hoja + (t === 'id' ? ' por id' : ' por columna'), vistos = {};
      if (!a) return;
      Object.keys(a).forEach(function (k) {
        vistos[k] = 1;
        if (!(k in b)) dif.push(nom + ' ' + k + ': el codigo dice ' + a[k] + ' y el encabezado no lo tiene');
        else if (String(a[k]) !== String(b[k])) dif.push(nom + ' ' + k + ': el codigo dice ' + a[k] + ' y el encabezado ' + b[k]);
      });
      Object.keys(b).forEach(function (k) {
        if (!vistos[k]) dif.push(nom + ' ' + k + ': el encabezado dice ' + b[k] + ' y el codigo no lo tiene');
      });
    });
  });
  return dif;
}

function _colsId_(hoja) { return _colMap_(hoja, 'id'); }
/* Para `catalogoMedir`: que cambiaria si los siete mapas salieran HOY del
   encabezado. `filas` son las de `product_channel_code`; `cabDe` se pasa para
   poder probarla. */
function _colMapsComparar_(filas, cabDe) {
  var vivas = (filas || []).filter(function (f) { return f && f.active !== false; });
  var cat = _catalogoMapas_(vivas, []), skus = _colMapSkus_(cat), dif = [];
  ['Home', 'Pilar', 'Clubes', 'Red'].forEach(function (hoja) {
    var idASku = hoja === 'Clubes' ? cat.clubesId : hoja === 'Red' ? null : cat.paginaId;
    var der = _colMapsDesdeCab_((cabDe || _colMapCab_)(hoja), skus, idASku, COLMAP_BASE_ID_[hoja]);
    ['abbr', 'id'].forEach(function (t) {
      var a = _colMapEscrito_(hoja, t), b = der[t], nom = hoja + (t === 'id' ? ' por id' : ' por columna'), vistos = {};
      if (!a) return;
      Object.keys(a).forEach(function (k) {
        vistos[k] = 1;
        if (!(k in b)) dif.push(nom + ' ' + k + ': el codigo dice ' + a[k] + ' y el encabezado no lo tiene');
        else if (String(a[k]) !== String(b[k])) dif.push(nom + ' ' + k + ': el codigo dice ' + a[k] + ' y el encabezado ' + b[k]);
      });
      Object.keys(b).forEach(function (k) {
        if (!vistos[k]) dif.push(nom + ' ' + k + ': el encabezado dice ' + b[k] + ' y el codigo no lo tiene');
      });
    });
  });
  return dif;
}

function _colMapsComparar_(filas, cabDe) {
  var vivas = (filas || []).filter(function (f) { return f && f.active !== false; });
  var cat = _catalogoMapas_(vivas, []), skus = _colMapSkus_(cat), dif = [];
  ['Home', 'Pilar', 'Clubes', 'Red'].forEach(function (hoja) {
    var idASku = hoja === 'Clubes' ? cat.clubesId : hoja === 'Red' ? null : cat.paginaId;
    var der = _colMapsDesdeCab_((cabDe || _colMapCab_)(hoja), skus, idASku, COLMAP_BASE_ID_[hoja]);
    ['abbr', 'id'].forEach(function (t) {
      var a = _colMapEscrito_(hoja, t), b = der[t], nom = hoja + (t === 'id' ? ' por id' : ' por columna'), vistos = {};
      if (!a) return;
      Object.keys(a).forEach(function (k) {
        vistos[k] = 1;
        if (!(k in b)) dif.push(nom + ' ' + k + ': el codigo dice ' + a[k] + ' y el encabezado no lo tiene');
        else if (String(a[k]) !== String(b[k])) dif.push(nom + ' ' + k + ': el codigo dice ' + a[k] + ' y el encabezado ' + b[k]);
      });
      Object.keys(b).forEach(function (k) {
        if (!vistos[k]) dif.push(nom + ' ' + k + ': el encabezado dice ' + b[k] + ' y el codigo no lo tiene');
      });
    });
  });
  return dif;
}

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

var _VUELTA_INICIO_ = 0;

function _doGetAdmin(opt) {
  var _lightOnly = opt && opt.light === true;
  var _cajaMode = opt && opt.mode === 'caja';
  /* `ms=1` devuelve cuanto tardo cada bloque. Misma convencion que `entregas`
     y el CRM: no lee ni escribe el cache, porque una respuesta con `_ms`
     adentro no se le sirve a nadie. Existe porque el 25/9/2026 el volcado frio
     tardaba 23,4 s de servidor (medido: la bajada son 0,2 s, comprime a 157 KB)
     y no habia forma de saber en que, salvo adivinar. */
  var _conMs = !!(opt && opt.ms);
  var _lecModo = (opt && opt.lec) ? String(opt.lec) : '';
  // _tail: si > 0, leer solo las últimas N filas de cada hoja operativa. Optimización
  // del botón "Actualizar pedidos" — un pedido nuevo cae en las últimas filas, así
  // que pasamos de leer ~407 filas (Home 330 + Pilar + Clubes + Red) a leer ~40.
  // En modo tail, los stats por canal (canales[]) no son representativos → se devuelven
  // vacíos y el frontend conserva los anteriores.
  var _tail = (opt && opt.tail) ? Math.max(3, Math.min(50, opt.tail)) : 0;
  // Cache server-side para cajaLight y pedidosLight: la primera lectura sigue
  // tomando 10-14 s, pero el segundo toque es instantaneo. Dura
  // VOLCADO_CACHE_SEG y lo tira cualquier escritura (doPost / onEditHandler),
  // asi que un cobro nuevo nunca se sirve viejo.
  // En modo tail NO cacheamos: queremos data fresca en cada click del botón.
  var _cacheKey = (_tail || _lecModo || _conMs) ? null : (_cajaMode ? 'admin_caja_v1' : (_lightOnly ? 'admin_light_v1' : null));
  if (_cacheKey && !(opt && opt.fresh)) {
    var _cached = _cacheLeerGrande_(_cacheKey);
    if (_cached) {
      return ContentService.createTextOutput(_cached).setMimeType(ContentService.MimeType.JSON);
    }
  }
  /* LA VERSION DE CUANDO SE EMPEZO A LEER (15/10/2026). Un calculo que leyo
     las hojas ANTES de una escritura y termino DESPUES guardaba la foto vieja
     en admin_caja_v1 por 15 min — la escritura ya habia borrado la cache —, y
     cada lectura nueva la tomaba de aca y la volvia a guardar bajo la version
     nueva, 30 min mas. Paso el 15/10 09:42: el sueldo de Lucas y su ajuste de
     caja (Egresos 358-359) no aparecian en el Libro diario aunque se tocara
     Actualizar. Mismo candado que `_lecturaGuardar_`: si la version cambio
     mientras se calculaba, se contesta pero no se guarda. */
  var _verIni = _cacheKey ? _volcadoVer_() : '';
  var ahora = new Date();
  var argNow = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));

  /* Cronometro por bloque, solo en modo caja. Existe porque el 4/9/2026 hubo que
     medir "cuanto tarda cajaLight" desde afuera y adivinar en que se iba el
     tiempo: la unica forma era comparar endpoints entre si. Con esto el propio
     JSON dice donde se fueron los segundos. Cuesta nada y se lee con
     ?action=cajaLight en cualquier momento. */
  var _msT0 = Date.now(), _msPrev = _msT0, _ms = {};
  function _mk(nombre) {
    if (!_cajaMode && !_conMs) return;
    var n = Date.now();
    _ms[nombre] = n - _msPrev;
    _msPrev = n;
  }

  /* UNA hoja, UN viaje. (25/9/2026)
     Las cuatro hojas de pedidos se leian con cuatro llamadas cada una
     —getLastRow, getLastColumn, los encabezados y las filas—. En Apps Script
     se paga por LLAMADA (~250-300 ms), no por celda: medido ese dia, leer las
     cuatro costaba ~6 s de los 23 s del volcado frio.

     `getDataRange().getValues()` devuelve exactamente lo mismo —misma API, los
     Date siguen siendo Date— en un solo viaje.

     El modo `tail` (el boton "Actualizar pedidos", que mira solo las ultimas
     filas) conserva el camino de antes: ahi leer la hoja entera es justo lo que
     ese modo vino a evitar.

     Devuelve null si la hoja no existe o esta vacia, y `off` es lo que hay que
     sumarle al indice para saber la fila real del Sheet. */
  function _leerHojaPedidos(sh) {
    if (!sh) return null;
    if (!_tail) {
      var d = sh.getDataRange().getValues();
      return (d.length <= 1) ? null : { data: d, off: 1 };
    }
    var lr = sh.getLastRow();
    if (lr <= 1) return null;
    var lc = sh.getLastColumn();
    var desde = (lr > _tail + 1) ? (lr - _tail + 1) : 2;
    var out = [sh.getRange(1, 1, 1, lc).getValues()[0]];
    if (lr >= desde) out = out.concat(sh.getRange(desde, 1, lr - desde + 1, lc).getValues());
    return { data: out, off: desde - 1 };
  }

  // Helper: parsea Date o string "dd/MM/yyyy" o "dd/MM/yyyy HH:mm" → Date (o null)
  function _parseDateAny(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    var s = String(v).trim();
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    var yr = Number(m[3]), mo = Number(m[2]) - 1, dd = Number(m[1]);
    var hh = m[4] ? Number(m[4]) : 0;
    var mi = m[5] ? Number(m[5]) : 0;
    return new Date(yr, mo, dd, hh, mi);
  }

  // ── Saldo Base (último ajuste manual) — leído al principio para filtrar cobros/ingresos/gastos ──
  // En modo light skipeamos esto: Saldo Base solo se usa para los cálculos de
  // caja, no para armar pedidos[]. Ahorra una lectura.
  // bil = sub-saldo "Billetera" (lo que llevas encima para cambio). Es subconjunto
  // del Efectivo total — caja fuerte se deriva como ef - bil. Default 0 si la col
  // todavía no se llenó.
  // sob = sub-saldo "Sobres": efectivo apartado en sobres para pagar proveedores (no
  // está en la caja fuerte ni en la billetera). Caja fuerte = ef - bil - sob.
  // inv = "Inversiones" (col F): plata que salió de MP líquido hacia inversiones
  // (FCI de Mercado Pago, plazo fijo, etc). NO es MP líquido pero sí es de Maleu.
  var saldoBase = { ef: 0, mp: 0, bil: 0, sob: 0, inv: 0, fecha: '', fechaDate: null };
  /* El desglose por cuenta: los ef/mp de siempre se siguen calculando igual y
     estos mapas se suman EN PARALELO, asi que ningun bucle que mueve plata
     cambia de comportamiento.
     Van declarados ACA y no al lado de `cobradoEf` — que es donde parecian
     pertenecer — porque el bucle de gastos los usa 30 lineas ANTES. Con `var`
     el hoisting sube la declaracion pero NO la asignacion, asi que ahi valian
     `undefined` y `_sumarCuenta_` reventaba con "Cannot read properties of
     undefined". En Apps Script eso no rompe una funcion: **tumba el endpoint
     entero** — `cajaLight` devolvia la pagina de error de Google en vez de
     JSON, con los otros endpoints intactos. */
  var gastosPorCuenta = {}, ingresosPorCuenta = {};
  /* Lo que mueve efectivo despues del ultimo conteo, con su LUGAR (5/10/2026):
     de quien es cada cobro, de que billetera salio cada vuelto, de donde cada
     gasto. Declarado aca arriba por la misma razon que los mapas de arriba:
     el bucle de gastos corre antes que el de cobros. Ver _lugaresCalcular_. */
  var _lugIn = { cobEf: [], vueltos: [], ing: [], gas: [] };
  var shSaldoSnap = (!_lightOnly) ? SS.getSheetByName('Saldo Base') : null;
  if (shSaldoSnap && shSaldoSnap.getLastRow() > 1) {
    var lastRowSB = shSaldoSnap.getLastRow();
    saldoBase.ef = Number(shSaldoSnap.getRange(lastRowSB, 2).getValue()) || 0;
    saldoBase.mp = Number(shSaldoSnap.getRange(lastRowSB, 3).getValue()) || 0;
    // Lectura defensiva de col D/E/F: pueden no existir en hojas viejas
    if (shSaldoSnap.getLastColumn() >= 4) {
      saldoBase.bil = Number(shSaldoSnap.getRange(lastRowSB, 4).getValue()) || 0;
    }
    if (shSaldoSnap.getLastColumn() >= 5) {
      saldoBase.sob = Number(shSaldoSnap.getRange(lastRowSB, 5).getValue()) || 0;
    }
    if (shSaldoSnap.getLastColumn() >= 6) {
      saldoBase.inv = Number(shSaldoSnap.getRange(lastRowSB, 6).getValue()) || 0;
    }
    /* El saldo de CADA cuenta, por la columna que declara en la hoja `Cuentas`.
       `ef` y `mp` se dejan con el significado que siempre tuvieron para no
       romper nada que los lea; `porCuenta` es el desglose nuevo. Va de una sola
       lectura: pedir celda por celda eran N viajes a la planilla. */
    var _cts = _cuentas_(), _ultColSB = shSaldoSnap.getLastColumn(), _colMax = 0;
    for (var _i = 0; _i < _cts.length; _i++) if (_cts[_i].col > _colMax) _colMax = _cts[_i].col;
    var _anchoSB = Math.min(Math.max(_colMax, _ultColSB), shSaldoSnap.getMaxColumns());
    var _filaSB = shSaldoSnap.getRange(lastRowSB, 1, 1, _anchoSB).getValues()[0];
    saldoBase.porCuenta = {};
    /* Una celda VACIA y un cero de verdad no son lo mismo, y desde el panel son
       indistinguibles: `Number('') || 0` devuelve 0 igual que un 0 escrito a
       mano. Por eso viaja aparte la lista de las cuentas que NUNCA se contaron
       — asi la tarjeta puede decir "todavia no la contaste" en vez de un $0
       pelado, que en una cuenta nueva se lee como "esto no anda". */
    saldoBase.sinContar = [];
    for (var _j = 0; _j < _cts.length; _j++) {
      var _cel = _filaSB[_cts[_j].col - 1];
      saldoBase.porCuenta[_cts[_j].id] = Number(_cel) || 0;
      if (_cel === '' || _cel === null || _cel === undefined) saldoBase.sinContar.push(_cts[_j].id);
    }
    var fSB = shSaldoSnap.getRange(lastRowSB, 1).getValue();
    var fSBd = _parseDateAny(fSB);
    if (fSBd) {
      saldoBase.fechaDate = fSBd;
      saldoBase.fecha = Utilities.formatDate(fSBd, 'America/Argentina/Buenos_Aires', 'dd/MM HH:mm');
    }
    /* Cuando se conto DE VERDAD cada cuenta (21/10/2026), aparte de la fecha del
       ultimo ajuste, que arrastra las que no se contaron. Son ~60 filas: una lectura. */
    try {
      var _cntSB = _saldoContados_(shSaldoSnap.getRange(1, 1, lastRowSB, shSaldoSnap.getLastColumn()).getValues());
      var _fmtSB = function (d) { return Utilities.formatDate(d, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm'); };
      saldoBase.contado = {};
      Object.keys(_cntSB.contado).forEach(function (k) { saldoBase.contado[k] = _fmtSB(_cntSB.contado[k]); });
      saldoBase.contadoDesde = _cntSB.desde ? _fmtSB(_cntSB.desde) : '';
    } catch (eCnt) { saldoBase.contadoError = String(eCnt && eCnt.message || eCnt); }   // a la vista: un catch mudo ya escondio un bug aca
  }
  // Helper: movimiento cuenta solo si ocurrió DESPUÉS del último ajuste de saldo.
  // Si no hay ajuste previo, todo cuenta. Si la fecha es ilegible, se asume anterior (conservador).
  function _afterSaldo(v) {
    if (!saldoBase.fechaDate) return true;
    var d = _parseDateAny(v);
    if (!d) return false;
    return d > saldoBase.fechaDate;
  }
  /* El momento de una celda de fecha, en ms (0 si no se puede leer). Para el
     detalle de lo sin guardar (12/10/2026): no decide nada, solo ordena. */
  function _tsDe(v) { var d = _parseDateAny(v); return d ? d.getTime() : 0; }

  _mk('prepYSaldoBase');
  // ── Leer pedidos de las 4 hojas operativas ──
  var ABBRS_HOME = ['PPM','PPJyQ','PPCyQ','SCo','SJyQ','SCa','ECaC','EJyQ','ECyQ','EV',
                    'TG','TLC','TC','F','PMu','PMa','PJyQ','PCC','PJyM'];
  var ABBRS_CLUB = ['PMu','PMa','PJyQ','PCC','PJyM','PPM','PPJyQ','PPCyQ'];

  var canales = [];
  var pedidos = [];

  if (!_cajaMode) {

  // Home, Pilar
  ['Home', 'Pilar'].forEach(function(hoja) {
    var sh = SS.getSheetByName(hoja);
    var stats = { nombre: hoja, pedidos: 0, entregados: 0, pendientes: 0, cancelados: 0, reservados: 0, facturado: 0, cobrado: 0, noCobrado: 0 };
    // data sigue siendo [headers, ...filas] para no tocar el codigo de abajo;
    // `off` corrige el "r + 1" con el que se guarda la fila real del Sheet.
    var _lecH = _leerHojaPedidos(sh);
    if (!_lecH) { canales.push(stats); return; }
    var data = _lecH.data, _rOffH = _lecH.off;
    var headersH = data[0];   // se usa mas abajo para buscar columnas por nombre
    /* De que freezer sale cada pedido. Por ENCABEZADO y una sola vez: la
       columna la crea el ERP al final de la hoja, asi que su numero cambia. */
    var _iDepH = _ixDepPedido_(headersH);
    /* «Pasado a Red #113 (Fini)» (13/10/2026): la marca que deja el pase en la
       col Decisión. Sin esto el original se ve «Cancelado» a secas. */
    var _iDecH = -1;
    for (var _qd = 0; _qd < headersH.length; _qd++) if (String(headersH[_qd] || '').trim() === 'Decisión') { _iDecH = _qd; break; }

    // Índices comunes Home/Pilar v2 (abr/2026). Difieren solo en nº de productos y cols post-productos.
    var isPilarAdm = (hoja === 'Pilar');
    var IX = isPilarAdm
      ? { total:13, fact:21, ef:17, tr:18, pef:19, ptr:20, costo:45, margen:46,
          prodStart:22, prodCount:23, barrio:47, lote:48, tel:49, idxFechaEnt:52 }
      : { total:13, fact:21, ef:17, tr:18, pef:19, ptr:20, costo:41, margen:42,
          prodStart:22, prodCount:19, barrio:43, subBarrio:44, lote:45, tel:46, idxFechaEnt:49 };

    for (var r = 1; r < data.length; r++) {
      var estado = String(data[r][10]).trim();
      var estadoPago = String(data[r][12]).trim();
      var total = Number(data[r][IX.total]) || 0;
      var facturado = Number(data[r][IX.fact]) || total;
      var origen = String(data[r][8]).trim();
      var cliente = String(data[r][7]).trim();
      var nPedido = String(data[r][1]).trim();
      var diaEntrega = _fechaADiaSemana(data[r][9]);
      var diaEntregaISO = _fechaAISO(data[r][9]);
      var fecha = data[r][3];
      var fechaStr = '';
      if (fecha instanceof Date) {
        fechaStr = Utilities.formatDate(fecha, 'America/Argentina/Buenos_Aires', 'dd/MM');
      } else {
        fechaStr = String(fecha || '');
      }

      stats.pedidos++;
      if (estado === 'Entregado') stats.entregados++;
      else if (estado === 'Cancelado') stats.cancelados++;
      else if (estado === 'Reservado') stats.reservados++;
      else stats.pendientes++;

      stats.facturado += facturado;
      if (estadoPago === 'Cobrado') stats.cobrado += facturado;
      else stats.noCobrado += facturado;

      // Idem: del mapa, no de una lista paralela. Ver el comentario en el bloque
      // de entregas — el mapa es la unica fuente de que columna es que producto.
      var COL_MAP_A = isPilarAdm ? _colsAbbr_('Pilar') : _colsAbbr_('Home');
      var prods = [];
      Object.keys(COL_MAP_A).forEach(function (colStr) {
        var qty = Number(data[r][Number(colStr) - 1]) || 0;
        if (qty > 0) prods.push({ a: COL_MAP_A[colStr], q: qty });
      });

      var formaPago = String(data[r][11] || '').trim();
      var costoPed = Number(data[r][IX.costo]) || 0;
      var margenPed = Number(data[r][IX.margen]) || 0;
      // Sub-barrio / dirección: Home usa Sub Barrio (idx 42); Pilar usa "Barrio Privado/Dirección" (idx 47) + "Domicilio/Lote" (idx 48)
      // El lote tambien. En Home la columna "Domicilio - Lote" trae el numero
      // pelado ("289"), asi que lleva la palabra adelante; en Pilar ya viene
      // escrito. Mismo criterio que _doGetEntregas: la ficha del pedido decia
      // solo "Champagnat Alto" cuando el repartidor necesita el lote.
      // (Tadeo, 22/8/2026)
      var _loteAdm = String(data[r][IX.lote] || '').trim();
      var subBarrio = isPilarAdm
        ? _direccionCorta_('Pilar', String(data[r][IX.barrio] || '').trim(), _loteAdm)
        : _direccionCorta_(String(data[r][IX.barrio] || '').trim(), String(data[r][IX.subBarrio] || '').trim(), _loteAdm);
      var hora = data[r][0];
      var horaStr = hora instanceof Date ? Utilities.formatDate(hora, 'America/Argentina/Buenos_Aires', 'HH:mm') : String(hora || '');
      var diaPedido = String(data[r][2] || '').trim();

      var efR  = Number(data[r][IX.ef]) || 0;
      var trR  = Number(data[r][IX.tr]) || 0;
      var pefR = Number(data[r][IX.pef]) || 0;
      var ptrR = Number(data[r][IX.ptr]) || 0;

      var idxFechaEnt = IX.idxFechaEnt;
      var feRaw = data[r][idxFechaEnt];
      var feStr = '', feDiaStr = '';
      if (feRaw instanceof Date) {
        feStr = Utilities.formatDate(feRaw, 'America/Argentina/Buenos_Aires', 'dd/MM');
        var DIAS_FE = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        feDiaStr = DIAS_FE[feRaw.getDay()];
      } else if (feRaw) {
        var feParts = String(feRaw).split('/');
        if (feParts.length >= 2) feStr = String(feParts[0]).padStart(2,'0') + '/' + String(feParts[1]).padStart(2,'0');
      }

      // Fecha de Cobro (col nueva dinámica, buscar por header)
      var fcStr = '', fcDiaStr = '';
      for (var hh = 0; hh < headersH.length; hh++) {
        if (String(headersH[hh]).trim() === 'Fecha de Cobro') {
          var fcRaw = data[r][hh];
          if (fcRaw instanceof Date) {
            fcStr = Utilities.formatDate(fcRaw, 'America/Argentina/Buenos_Aires', 'dd/MM');
            var DIAS_FC = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
            fcDiaStr = DIAS_FC[fcRaw.getDay()];
          } else if (fcRaw) {
            var fcStr2 = String(fcRaw).split(' ')[0];
            var fcParts = fcStr2.split('/');
            if (fcParts.length >= 2) fcStr = String(fcParts[0]).padStart(2,'0') + '/' + String(fcParts[1]).padStart(2,'0');
          }
          break;
        }
      }

      // Origen Detalle: leer por header (col puede variar entre Home/Pilar)
      var oDetStr = '';
      for (var hd = 0; hd < headersH.length; hd++) {
        if (String(headersH[hd]).trim() === 'Origen Detalle') { oDetStr = String(data[r][hd] || '').trim(); break; }
      }

      // Descuento Detalle (receta JSON): para que el panel/editor muestren y ajusten el descuento
      var ddStr = '';
      for (var hdd = 0; hdd < headersH.length; hdd++) {
        if (String(headersH[hdd]).trim() === 'Descuento Detalle') { ddStr = String(data[r][hdd] || '').trim(); break; }
      }

      // Cruce con Diagonal Carnes: la marca de que ese pedido llevo tambien carne.
      var xdStr = '';
      for (var hxd = 0; hxd < headersH.length; hxd++) {
        if (String(headersH[hxd]).trim() === 'Cruce Diagonal') { xdStr = String(data[r][hxd] || '').trim(); break; }
      }

      // Pedido grupal (25/10/2026): de que fue, o vacio.
      var grStr = '';
      for (var hgr = 0; hgr < headersH.length; hgr++) {
        if (String(headersH[hgr]).trim() === GRUPAL_COL_) { grStr = String(data[r][hgr] || '').trim(); break; }
      }

      /* Pesaje (JSON {abbr:{ped,pes,ts}}): lo que el cliente PIDIO, contra lo que
         marco la balanza. La cantidad vigente vive en la columna del producto —es
         lo que se cobra—; esto es el detalle auditable, igual que Origen Detalle. */
      var pesStr = '';
      for (var hps = 0; hps < headersH.length; hps++) {
        if (String(headersH[hps]).trim() === 'Pesaje') { pesStr = String(data[r][hps] || '').trim(); break; }
      }

      // Combo Detalle (receta JSON de combos): para que el Panel muestre "2× Combo X"
      var cdStr = '';
      for (var hcd = 0; hcd < headersH.length; hcd++) {
        if (String(headersH[hcd]).trim() === 'Combo Detalle') { cdStr = String(data[r][hcd] || '').trim(); break; }
      }

      // Repartidor: Home col 56 (BD, idx 55), Pilar col 59 (idx 58). Leer por header para resiliencia.
      var repStr = '';
      for (var hr2 = 0; hr2 < headersH.length; hr2++) {
        if (String(headersH[hr2]).trim() === 'Repartidor') { repStr = String(data[r][hr2] || '').trim(); break; }
      }

      /* Hora de entrega. Es lo que separa dos pedidos del mismo cliente y el
         mismo dia en UNA venta o en DOS: si salieron en el mismo viaje es un
         solo hecho; si uno se entrego al mediodia y el otro a la noche, son dos.
         Se busca por encabezado, no por indice: Home la tiene en AV y Pilar en
         otra columna, y leer por posicion fija en estas hojas ya rompio cuatro
         veces. */
      var hEntStr = '';
      for (var hhe = 0; hhe < headersH.length; hhe++) {
        if (String(headersH[hhe]).replace(/\s+/g, ' ').trim() === 'Hora Entrega') {
          var _hv = data[r][hhe];
          if (_hv instanceof Date) {
            hEntStr = Utilities.formatDate(_hv, 'America/Argentina/Buenos_Aires', 'HH:mm');
          } else {
            hEntStr = String(_hv || '').trim().slice(0, 5);
          }
          break;
        }
      }

      // Barrio principal (Home: Estancias del Pilar / Los Alcanfores / Estancias del Río · Pilar: barrio privado).
      // Va en campo `bar` para que el panel pueda filtrar por barrio sin meterse con sub-barrios.
      var barStr = String(data[r][IX.barrio] || '').trim();

      // Layout v2 Home/Pilar: N(idx13)=Subtotal Producto · O(idx14)=Envío · P(idx15)=Descuento
      var subtProd = Number(data[r][13]) || 0;
      var envioPed = Number(data[r][14]) || 0;
      var descPed  = Number(data[r][15]) || 0;
      pedidos.push({
        n: nPedido, h: hoja, c: cliente, f: fechaStr, de: diaEntrega, dee: diaEntregaISO,
        es: estado, o: origen, ep: estadoPago, fp: formaPago,
        $: facturado, co: costoPed, mg: margenPed, br: subBarrio, bar: barStr, p: prods,
        subt: subtProd, env: envioPed, desc: descPed,
        hr: horaStr, dia: diaPedido,
        ef: efR, tr: trR, pef: pefR, ptr: ptrR,
        fe: feStr, fed: feDiaStr, he: hEntStr,
        /* La fecha de ENTREGA con año, 'aaaa-mm-dd' (13/9/2026). `fe` viaja como
           "dd/MM" y no alcanza para agrupar por semana ni por mes: las Unidades
           vendidas de Tendencia tenian que caer en la misma semana que Productos
           y que el EERR, que cuentan por este sello. Vacia si no hay sello. */
        fex: (feRaw instanceof Date) ? Utilities.formatDate(feRaw, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd') : '',
        mc: _mesContable_(feRaw, data[r][3]),
        fc: fcStr, fcd: fcDiaStr,
        oDet: oDetStr,
        dd: ddStr,
        cd: cdStr,
        pes: pesStr,
        crd: (xdStr !== '' && xdStr.toLowerCase() !== 'no') ? 1 : 0,
        grp: grStr,   // 'gr' ya es el grupo de Clubes
        rep: repStr,
        // El telefono. Faltaba: la ficha del pedido tenia el codigo para
        // mostrarlo pero el volcado nunca lo mandaba, asi que la fila del
        // telefono no se dibujaba para NADIE. (Tadeo, 22/8/2026)
        tel: String(data[r][IX.tel] || '').trim(),
        dep: (_iDepH >= 0 ? String(data[r][_iDepH] || '').trim().toLowerCase() : ''),
        pas: (_iDecH >= 0 && /^Pasado a Red #/.test(String(data[r][_iDecH] || '').trim())) ? String(data[r][_iDecH]).trim() : undefined,
        r: r + _rOffH
      });
    }
    canales.push(stats);
  });

  // Clubes (34 cols, estructura diferente)
  var shClubes = SS.getSheetByName('Clubes');
  var statsClubes = { nombre: 'Clubes', pedidos: 0, entregados: 0, pendientes: 0, cancelados: 0, reservados: 0, facturado: 0, cobrado: 0, noCobrado: 0 };
  var _lecC = _leerHojaPedidos(shClubes);
  if (_lecC) {
    var dataClubes = _lecC.data, _rOffC = _lecC.off;
    var headersClub = dataClubes[0];   // idem: se buscan columnas por nombre
    var _iDepC = _ixDepPedido_(headersClub);
    for (var rc = 1; rc < dataClubes.length; rc++) {
      var estadoC = String(dataClubes[rc][13]).trim();
      var estadoPagoC = String(dataClubes[rc][15]).trim();
      var totalC = Number(dataClubes[rc][16]) || 0;
      var facturadoC = Number(dataClubes[rc][22]) || totalC;
      var origenC = String(dataClubes[rc][11]).trim();
      var clienteC = String(dataClubes[rc][7]).trim();
      var clubC = String(dataClubes[rc][8]).trim();
      var nPedidoC = String(dataClubes[rc][1]).trim();
      var diaEntregaC = _fechaADiaSemana(dataClubes[rc][12]);
      var diaEntregaISOC = _fechaAISO(dataClubes[rc][12]);
      var fechaC = dataClubes[rc][3];
      var fechaStrC = '';
      if (fechaC instanceof Date) {
        fechaStrC = Utilities.formatDate(fechaC, 'America/Argentina/Buenos_Aires', 'dd/MM');
      } else {
        fechaStrC = String(fechaC || '');
      }

      statsClubes.pedidos++;
      if (estadoC === 'Entregado') statsClubes.entregados++;
      else if (estadoC === 'Cancelado') statsClubes.cancelados++;
      else if (estadoC === 'Reservado') statsClubes.reservados++;
      else statsClubes.pendientes++;

      statsClubes.facturado += facturadoC;
      if (estadoPagoC === 'Cobrado') statsClubes.cobrado += facturadoC;
      else statsClubes.noCobrado += facturadoC;

      // Productos Clubes
      var prodsC = _prodsDeFila_('Clubes', dataClubes[rc]);   /* por el mapa (9/10/2026) */

      var formaPagoC = String(dataClubes[rc][14] || '').trim();

      var costoCl = Number(dataClubes[rc][31]) || 0;
      var margenCl = Number(dataClubes[rc][32]) || 0;
      var horaC = dataClubes[rc][0];
      var horaStrC = horaC instanceof Date ? Utilities.formatDate(horaC, 'America/Argentina/Buenos_Aires', 'HH:mm') : String(horaC || '');
      var diaPedC = String(dataClubes[rc][2] || '').trim();

      var efC  = Number(dataClubes[rc][18]) || 0; // S = Efectivo
      var trC  = Number(dataClubes[rc][19]) || 0; // T = Transferencia
      var pefC = Number(dataClubes[rc][20]) || 0; // U = Propina Ef
      var ptrC = Number(dataClubes[rc][21]) || 0; // V = Propina Trans

      // Fecha de Cobro (col dinámica)
      var fcStrC = '', fcDiaStrC = '';
      for (var hhC = 0; hhC < headersClub.length; hhC++) {
        if (String(headersClub[hhC]).trim() === 'Fecha de Cobro') {
          var fcRawC = dataClubes[rc][hhC];
          if (fcRawC instanceof Date) {
            fcStrC = Utilities.formatDate(fcRawC, 'America/Argentina/Buenos_Aires', 'dd/MM');
            var DIAS_FCC = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
            fcDiaStrC = DIAS_FCC[fcRawC.getDay()];
          } else if (fcRawC) {
            var fcStr2C = String(fcRawC).split(' ')[0];
            var fcPartsC = fcStr2C.split('/');
            if (fcPartsC.length >= 2) fcStrC = String(fcPartsC[0]).padStart(2,'0') + '/' + String(fcPartsC[1]).padStart(2,'0');
          }
          break;
        }
      }

      var oDetStrC = '';
      for (var hdC = 0; hdC < headersClub.length; hdC++) {
        if (String(headersClub[hdC]).trim() === 'Origen Detalle') { oDetStrC = String(dataClubes[rc][hdC] || '').trim(); break; }
      }

      // Repartidor (Clubes col 37, idx 36). Leer por header para resiliencia.
      var repStrC = '';
      for (var hrC = 0; hrC < headersClub.length; hrC++) {
        if (String(headersClub[hrC]).trim() === 'Repartidor') { repStrC = String(dataClubes[rc][hrC] || '').trim(); break; }
      }

      // Clubes: R(idx17) = Envío. Sin descuento ni subtotal separados (subt = total - env).
      var envioClub = Number(dataClubes[rc][17]) || 0;
      pedidos.push({
        n: nPedidoC, h: 'Clubes',
        c: clienteC + (clubC ? ' (' + clubC + ')' : ''),
        f: fechaStrC, de: diaEntregaC, dee: diaEntregaISOC, es: estadoC, o: origenC,
        ep: estadoPagoC, fp: formaPagoC, $: facturadoC,
        co: costoCl, mg: margenCl, br: clubC, p: prodsC,
        env: envioClub, desc: 0, subt: Math.max(0, totalC - envioClub),
        hr: horaStrC, dia: diaPedC,
        ef: efC, tr: trC, pef: pefC, ptr: ptrC,
        mc: _mesContable_(dataClubes[rc][12], dataClubes[rc][3]),
        fc: fcStrC, fcd: fcDiaStrC,
        oDet: oDetStrC,
        rep: repStrC,
        dep: (_iDepC >= 0 ? String(dataClubes[rc][_iDepC] || '').trim().toLowerCase() : ''),
        /* gr: col K "Grupo" — "Plantel Superior Línea C", "Infantiles", "PUB".
           Dentro de un club no es lo mismo venderle a la Línea A que a los
           Infantiles: son equipos distintos, con gente distinta. Sin esto el
           panel solo podía decir "Champagnat 3" y no a cuál de los cuatro.
           (20/9/2026, pedido de Tadeo: "para saber a quién le entregué".)
           Ojo con el dato: en la planilla conviven "Linea" y "Línea" — el que
           lo muestre tiene que normalizarlo, acá va tal cual está escrito. */
        gr: String(dataClubes[rc][10] || '').trim(),
        dep: String(dataClubes[rc][9] || '').trim(),
        tel: String(dataClubes[rc][33] || '').trim(),
        r: rc + _rOffC
      });
    }
  }
  canales.push(statsClubes);

  // Red (55 cols, estructura propia). Layout V(22)→AR(44): debe coincidir con RED_COL_TO_ABBR.
  var ABBRS_RED_DASH = ['PPM','PPJyQ','PPCyQ','SQB','SL','SCo','SPyP','SJyQ','SE','SCa',
                        'ECaC','EJyQ','ECyQ','EV','TG','TLC','TC','F','PMu','PMa','PJyQ','PCC','PJyM'];
  var shRedDash = SS.getSheetByName('Red');
  var statsRed = { nombre: 'Red', pedidos: 0, entregados: 0, pendientes: 0, cancelados: 0, reservados: 0, facturado: 0, cobrado: 0, noCobrado: 0 };
  var _lecR = _leerHojaPedidos(shRedDash);
  if (_lecR) {
    var dataRed = _lecR.data, _rOffR = _lecR.off;
    /* Las dos columnas de "quien trajo al cliente" se miden por su ENCABEZADO
       y una sola vez, fuera del loop. Por numero fijo se romperian solas: son
       las ultimas de la hoja y cualquier columna nueva las corre. En una hoja
       que todavia no las tiene, el -1 deja el campo vacio y nada mas. */
    var _iTrajoR = -1, _iTelCliR = -1, _iExcR = -1, _iExcMR = -1, _iPorR = -1;
    var _iDepR = _ixDepPedido_(dataRed[0]);
    (function () {
      var _h0 = dataRed[0] || [];
      for (var _q = 0; _q < _h0.length; _q++) {
        var _nq = String(_h0[_q]).trim();
        if (_nq === 'Confirmado por') { _iPorR = _q; continue; }
        if (_nq === 'Trajo el Cliente') _iTrajoR = _q;
        else if (_nq === 'Teléfono Cliente') _iTelCliR = _q;
        else if (_nq === RED_EXC_HDR.monto) _iExcR = _q;
        else if (_nq === RED_EXC_HDR.motivo) _iExcMR = _q;
      }
    })();
    for (var rr = 1; rr < dataRed.length; rr++) {
      var estadoR = String(dataRed[rr][11]).trim(); // L = Estado Entrega
      var estadoPagoR = String(dataRed[rr][13]).trim(); // N = Estado Pago
      var totalR = Number(dataRed[rr][14]) || 0; // O = Total
      var facturadoR = Number(dataRed[rr][20]) || totalR; // U = Facturado (bruto)
      var vendedorR = String(dataRed[rr][7]).trim(); // H = Vendedor
      // AW = A Pagar a Maleu (neto post-comisión). Es lo que Maleu factura en Red.
      // Si la celda está vacía, el fallback usa la comisión REAL del vendedor.
      var aPagarR = Number(dataRed[rr][48]) ||
                    Math.round(facturadoR * (100 - _comisionPct(vendedorR)) / 100);
      var origenR = String(dataRed[rr][9]).trim(); // J = Origen
      var clienteR = String(dataRed[rr][8]).trim(); // I = Cliente
      var nPedidoR = String(dataRed[rr][1]).trim();
      var diaEntregaR = _fechaADiaSemana(dataRed[rr][10]); // K
      var diaEntregaISOR = _fechaAISO(dataRed[rr][10]);
      var fechaR = dataRed[rr][3];
      var fechaStrR = fechaR instanceof Date ? Utilities.formatDate(fechaR, 'America/Argentina/Buenos_Aires', 'dd/MM') : String(fechaR || '');

      statsRed.pedidos++;
      if (estadoR === 'Entregado') statsRed.entregados++;
      else if (estadoR === 'Cancelado') statsRed.cancelados++;
      else if (estadoR === 'Reservado') statsRed.reservados++;
      else statsRed.pendientes++;

      // Liquidación de Marcos a Maleu: cols BA/BB/BC (52/53/54). Es la plata
      // que efectivamente entra a la caja de Maleu, no lo que el cliente final
      // le paga a Marcos (cols 12-17). Para el resumen de cobros del panel
      // usamos estos valores como ep/fp/fc del pedido.
      var fpMaleuR     = String(dataRed[rr][52] || '').trim();
      var estadoMaleuR = String(dataRed[rr][53] || '').trim();
      var epMaleuR     = (estadoMaleuR === 'Pagado') ? 'Cobrado' : 'No Cobrado';
      var fcRawR       = dataRed[rr][54];
      var fcMaleuR     = '';
      if (fcRawR) {
        if (fcRawR instanceof Date) {
          fcMaleuR = Utilities.formatDate(fcRawR, 'America/Argentina/Buenos_Aires', 'dd/MM');
        } else {
          var mFc = String(fcRawR).match(/^(\d{1,2})\/(\d{1,2})/);
          if (mFc) fcMaleuR = ('0'+mFc[1]).slice(-2) + '/' + ('0'+mFc[2]).slice(-2);
        }
      }

      /* Transferencia directa a Maleu con cuenta dicha y nada que entregar
         (9/10/2026): para Maleu ESTA cobrado, el dia de la Fecha de Cobro. */
      var _dirR = _redDirecto_(dataRed[rr]), _dirEnteraR = false;
      if (_dirR && _dirR.cuenta && _dirR.fecha && !(_redDebeAMaleu_(dataRed[rr], 48).debe > 0)) {
        _dirEnteraR = true;
        epMaleuR = 'Cobrado';
        if (!fpMaleuR) fpMaleuR = 'Transferencia';
        if (_dirR.fecha instanceof Date) fcMaleuR = Utilities.formatDate(_dirR.fecha, 'America/Argentina/Buenos_Aires', 'dd/MM');
      }
      statsRed.facturado += aPagarR;
      if (epMaleuR === 'Cobrado') statsRed.cobrado += aPagarR;
      else statsRed.noCobrado += aPagarR;

      /* Toda columna del mapa, en orden (9/10/2026). El tramo de carne era fijo
         (75-79) y los 7 cortes de LM Carnes (91-97) no llegaban al panel: el
         mismo caso de los wraps de Alejo Acuna. NUNCA omitir productos. */
      var prodsR = _prodsDeFila_('Red', dataRed[rr]);

      var formaPagoR = String(dataRed[rr][12] || '').trim();
      var costoR = Number(dataRed[rr][44]) || 0;
      // Margen NETO (col AV/48, índice 47) = Margen Bruto − Comisión. Es el margen
      // real de Maleu en Red: el Facturado de la hoja es BRUTO, pero acá mandamos $ neto
      // (A Pagar, 83%), así que el margen también debe ser neto. Antes leía índice 45
      // (col AT Margen Bruto) e ignoraba la comisión → margen Red inflado ~$709k/año.
      var margenR = Number(dataRed[rr][47]) || 0;

      var efRd  = Number(dataRed[rr][16]) || 0; // Q = Efectivo
      var trRd  = Number(dataRed[rr][17]) || 0; // R = Transferencia
      var pefRd = Number(dataRed[rr][18]) || 0; // S = Propina Ef
      var ptrRd = Number(dataRed[rr][19]) || 0; // T = Propina Trans

      var horaRd = dataRed[rr][0]; // A = Hora
      var horaStrRd = horaRd instanceof Date ? Utilities.formatDate(horaRd, 'America/Argentina/Buenos_Aires', 'HH:mm') : String(horaRd || '');
      var diaPedRd = String(dataRed[rr][2] || '').trim(); // C = Día

      // Origen Detalle Red col idx 55 (BD)
      var oDetStrR = String(dataRed[rr][55] || '').trim();

      // Red: P(idx15) = Envío. Sin descuento (Red no lleva descuento). subt = totalR - env.
      var envioRed = Number(dataRed[rr][15]) || 0;
      /* EL FINANCIERO ES CAJA (Tadeo, 9/10/2026). `$` es el A Pagar, neto de
         comision: asi entra la venta de Red al economico, y no cambia. Pero
         cuando Maleu ya le pago la comision al vendedor (pedido con marca en
         «Comisión Liquidada»), esa comision sale de la caja como egreso el dia
         del pago: entonces la ENTRADA tiene que contarse entera, o el financiero
         la restaria dos veces. `lq` = lo liquidado de este pedido (comision +
         envio). Solo viaja si hay marca: sin liquidaciones el volcado es el de
         siempre, byte por byte. */
      var _lqR = 0;
      if (_liqRedIdx_() >= 0) {
        var _dqR = _redDebeAMaleu_(dataRed[rr], 48);
        if (_dqR.liq) _lqR = Math.round((_dqR.com || 0) + (_dqR.env || 0));
      }
      /* Si el cliente le transfirio todo a Maleu, la entrada fue entera desde el
         dia del cobro, se haya liquidado o no la comision. */
      if (_dirEnteraR) {
        var _dbR = _redDebeAMaleuBruto_(dataRed[rr], 48);
        _lqR = Math.round((_dbR.com || 0) + (_dbR.env || 0));
      }
      pedidos.push({
        n: nPedidoR, h: 'Red',
        c: clienteR + (vendedorR ? ' (Red: ' + vendedorR + ')' : ''),
        f: fechaStrR, de: diaEntregaR, dee: diaEntregaISOR, es: estadoR, o: origenR,
        // ep/fp/fc reflejan la liquidación de Marcos a Maleu (BA/BB/BC), no el
        // cobro del cliente final a Marcos. Es lo que entra a la caja de Maleu.
        ep: epMaleuR, fp: fpMaleuR || formaPagoR, fc: fcMaleuR, $: aPagarR,
        co: costoR, mg: margenR, br: vendedorR, p: prodsR,
        env: envioRed, desc: 0, subt: Math.max(0, totalR - envioRed),
        hr: horaStrRd, dia: diaPedRd,
        ef: efRd, tr: trRd, pef: pefRd, ptr: ptrRd,
        mc: _mesContable_(dataRed[rr][10], dataRed[rr][3]),
        oDet: oDetStrR,
        lq: _lqR || undefined,   // lo ya liquidado al vendedor: el financiero lo suma a la entrada
        // ev: col BE "Entregado a Vendedor". El panel lo necesita para saber si la
        // mercaderia ya salio del freezer y ofrecer el boton de devolucion.
        ev: String(dataRed[rr][56] || '').trim(),
        retira: vendedorR,
        dep: (_iDepR >= 0 ? String(dataRed[rr][_iDepR] || '').trim().toLowerCase() : ''),
        tel: String(dataRed[rr][51] || '').trim(),
        /* tc = quien trajo al cliente ('Vendedor' | 'Maleu' | ''), tcl = su
           telefono. VACIO ES VACIO: el panel no puede leerlo como "Vendedor". */
        /* El numero con que se le confirmo al cliente (13/10/2026): «Pilar #105». */
        era: (function () { var x = _rbNumeroCliente_('', _iPorR >= 0 ? dataRed[rr][_iPorR] : ''); return x ? (x.hoja + ' #' + x.n) : undefined; })(),
        tc: _iTrajoR >= 0 ? String(dataRed[rr][_iTrajoR] || '').trim() : '',
        tcl: _iTelCliR >= 0 ? String(dataRed[rr][_iTelCliR] || '').trim() : '',
        /* La comision del vendedor, y si es fuera de escala (2/10/2026). `cexm`
           es el motivo: solo viaja cuando hay excepcion. */
        com: Number(dataRed[rr][46]) || 0,
        cexm: (_iExcR >= 0 && _redExcMonto_(dataRed[rr][_iExcR]) !== null)
          ? (String(dataRed[rr][_iExcMR] || '').trim() || 'fuera de escala') : '',
        r: rr + _rOffR
      });
    }
  }
  canales.push(statsRed);

  } // fin if (!_cajaMode) — saltea el loop principal de pedidos en mode caja

  _mk('leerPedidos');
  /* LAS PIEZAS DE CADA PEDIDO (23/10/2026). La ficha decia «8.133×CLo»: solo los
     kilos, sin cuantas piezas ni de cuanto. Ruta ya las recibia (`entregas`);
     ahora cada pedido con carne lleva `pz: [{a, kg}]`, asignadas o ya entregadas. */
  try { _pedidosConPiezas_(pedidos); } catch (ePz) { try { Logger.log('pz pedidos: ' + ePz); } catch (_e) {} }
  // ── pedidosLight: short-circuit para refresh rápido del tab Pedidos ──
  // Devuelve solo lo que el frontend necesita para re-renderizar el tab Pedidos
  // (pedidos[] y canales[] para los pills de filtro). Skipea: vendedoresDeuda,
  // stock, OC, caja, ingresos, egresos, movimientos, pagos red, cobros parciales.
  // Bajamos de ~12s a ~3s en el endpoint.
  if (_lightOnly) {
    var _outObj = { ts: Date.now(), pedidos: pedidos, light: true };
    if (_tail > 0) {
      _outObj.tail = _tail;
      // canales[] queda fuera en modo tail (stats no representativos). El frontend mantiene los anteriores.
    } else {
      _outObj.canales = canales;
      // Salud de Clientes Home (identidad canónica del CRM). Solo en modo no-tail:
      // necesita el historial completo de Home, que el tail no trae.
      var _salud = _saludClientes_(argNow);
      _outObj.saludSem = _salud.sem;
      _outObj.saludSemM = _salud.semM;
      _outObj.saludMes = _salud.mes;
      _outObj.ventasExtra = _ventasExtraPanel_();
      /* LOS DOS QUE LE FALTABAN A INICIO (27/9/2026). Medido ese dia: Inicio
         lee 12 campos y solo tres no estaban en un liviano. Con estos dos mas
         `vueltos` (que va en `cajaLight`), la tab que ABRE la app deja de pedir
         el volcado — que ese mismo dia tardo 28 s con cache y devolvio 404 a
         los 55 y 70 s sin ella.
         `totales` es una suma de `canales`, que ya esta armado aca arriba: no
         cuesta una sola lectura. `vendedores` lee tres hojas chicas
         (Vendedores, Red, Pagos Red Liq).
         Van solo en modo no-tail, como `canales`: en tail las estadisticas no
         son representativas y el front conserva las anteriores. */
      _outObj.totales = _totalesDeCanales_(canales);
      _outObj.vendedores = _vendedoresRedArr_();
    }
    var _outLight = JSON.stringify(_outObj);
    /* Esto guardaba con un `put` pelado y 5 s de TTL. Son 613 KB contra el tope
       de 100 KB por valor de CacheService: el put fallaba y el try/catch se
       comia el error, asi que NUNCA hubo un acierto — el mismo bug que tenia la
       caja hasta el 4/9/2026. Medido el 8/9: 5 toques seguidos dieron 14,2 /
       13,8 / 12,5 / 11,7 / 10,5 s, sin una sola bajada.
       Va por trozos y con el mismo TTL que la caja, porque la frescura la
       garantizan las dos puertas por las que la planilla cambia (doPost y
       onEditHandler), que ya invalidan. */
    if (!_tail && _volcadoVer_() === _verIni) _cacheGuardarGrande_('admin_light_v1', _outLight, VOLCADO_CACHE_SEG);
    return ContentService.createTextOutput(_outLight).setMimeType(ContentService.MimeType.JSON);
  }

  // Defaults para mode='caja' — si no necesitamos vendedores/stock/OC, los
  // dejamos vacíos y saltamos los bloques pesados de abajo (vendedoresDeuda,
  // liquidaciones, totales, stock, OC). Las var-declaraciones internas son
  // function-scoped y no causan error si se redeclaran al volver a admin completo.
  var vendedoresArr = [];
  var totales = { pedidos: 0, entregados: 0, pendientes: 0, cancelados: 0, reservados: 0, facturado: 0, cobrado: 0, noCobrado: 0, ticket: 0 };
  var stock = [];
  var ocPend = 0, ocTotal = 0, ocLista = [];

  if (!_cajaMode) {

  _mk('armarPedidos');
  /* La deuda de los vendedores de Red la arma _vendedoresRedArr_(),
     compartida con `pedidosLight`. Estaba escrita aca adentro hasta el
     27/9/2026: al darle los tres campos que le faltaban a Inicio habia que
     elegir entre duplicarla o compartirla, y duplicada las dos copias se
     separan sin que nadie lo note. */
  var vendedoresArr = _vendedoresRedArr_();
  _mk('vendedoresRed');
  _mk('liquidaciones');
  // ── Totales ── (compartido con `pedidosLight` desde el 27/9/2026)
  var totales = _totalesDeCanales_(canales);

  _mk('totales');
  /* La tabla de Stock la arma _armarStock_(), compartida con
     `action=stockTab`. Estaba escrita aca adentro hasta el 27/9/2026: al
     darle endpoint propio a la tab habia que elegir entre duplicarla o
     compartirla, y duplicada las dos copias se separan sin que nadie lo
     note (la tabla diria una cosa y el volcado otra). */
  var stock = _armarStock_();
  _mk('stock');
  // ── OC pendientes + lista compacta ──
  // lista: usado por el Panel para mostrar el badge "✓ Listo" / "📦 N OC"
  // en cada pedido (saber si todas las OCs vinculadas ya están Recibidas).
  var ocPend = 0;
  var ocTotal = 0;
  var ocLista = [];
  var shOC = SS.getSheetByName('Orden de Compra');
  var _apCV = null;
  if (shOC && shOC.getLastRow() > 1) {
    var dataOC = shOC.getDataRange().getValues();
    _apCV = _ocApCols_(shOC, false);
    for (var ro = 1; ro < dataOC.length; ro++) {
      var estOC = String(dataOC[ro][20]).trim();
      if (estOC === 'Pendiente' || estOC === 'Pedido') {
        ocPend++;
        ocTotal += Number(dataOC[ro][14]) || 0;
      }
      // Filas válidas: con canal y pedido vinculado a un canal real
      var canalOC = String(dataOC[ro][4] || '').trim();
      var pedidoOC = String(dataOC[ro][5] || '').trim();
      if (canalOC && pedidoOC) {
        ocLista.push({
          canal: canalOC,
          pedido: pedidoOC,
          cliente: String(dataOC[ro][6] || '').trim(), // col G: fallback matching cuando N° pedido queda desalineado
          abbr: String(dataOC[ro][11] || '').trim(),
          q: Number(dataOC[ro][12]) || 0,
          proveedor: String(dataOC[ro][9] || '').trim(),
          estado: estOC,
          dep: _apCV ? String(dataOC[ro][_apCV.dep - 1] || '').trim() : '',   // ver _doGetOcLight
          ap: _apCV ? _numCelda_(dataOC[ro][_apCV.ap - 1]) : 0
        });
      }
    }
  }

  } // fin if (!_cajaMode)

  _mk('oc');
  // ── Egresos (gastos) ──
  // gastos[] y totalGastos incluyen TODO (para listados históricos/P&L).
  // gastosEf/gastosMP incluyen SOLO los posteriores al último Saldo Base (para el saldo vivo).
  var gastos = [];
  var totalGastos = 0;
  var gastosEf = 0;
  var gastosMP = 0;
  var shEgr = SS.getSheetByName('Egresos');
  if (shEgr && shEgr.getLastRow() > 1) {
    var dataEgr = shEgr.getDataRange().getValues();
    for (var re = 1; re < dataEgr.length; re++) {
      if (!dataEgr[re][0]) continue;
      var fechaE = dataEgr[re][0];
      var fechaStrE = '';
      if (fechaE instanceof Date) {
        fechaStrE = Utilities.formatDate(fechaE, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
      } else {
        fechaStrE = String(fechaE || '');
      }
      var montoE = Number(dataEgr[re][6]) || 0;
      var metodoE = String(dataEgr[re][5] || '').trim();
      totalGastos += montoE;
      if (_afterSaldo(fechaE)) {
        if (metodoE === 'Efectivo') { gastosEf += montoE; _lugIn.gas.push({ lugar: String(dataEgr[re][8] || '').trim(), m: montoE, ts: _tsDe(fechaE), con: String(dataEgr[re][4] || '').trim(), fila: re + 1 }); }
        else gastosMP += montoE;
        _sumarCuenta_(gastosPorCuenta, _cuentaDeMetodo_(metodoE), montoE);
      }
      // Timestamp completo (con hora si existe) para ordenar bien intra-día.
      var fDtE = _parseDateAny(fechaE);
      var tsE = fDtE ? fDtE.getTime() : 0;
      var fStrFullE = fDtE ? Utilities.formatDate(fDtE, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : fechaStrE;

      gastos.push({
        f: fechaStrE,
        fFull: fStrFullE,
        ts: tsE,
        /* La fila real de la hoja Egresos: es lo que le deja a Caja borrar el
           movimiento sin adivinar cual es (17/9/2026). El backend igual
           reverifica fecha, concepto, metodo y monto antes de borrar. */
        r: re + 1,
        sem: String(dataEgr[re][1] || ''),
        /* El mes sale de la FECHA, no de la columna Mes (13/9/2026): la fila 86
           de Egresos tiene la Semana y el Mes cruzados ("Abril" / 17), y un pago
           de $197.000 a Le Unike no caia en ningun mes. La columna queda de
           respaldo para una fecha que no se pueda leer. */
        mes: _mesNombreDe_(fDtE) || String(dataEgr[re][2] || ''),
        anio: fDtE ? fDtE.getFullYear() : 0,
        cat: String(dataEgr[re][3] || '').trim(),
        con: String(dataEgr[re][4] || '').trim(),
        met: metodoE,
        $: montoE,
        not: String(dataEgr[re][7] || '').trim(),
        lug: _lugarDeMov_(metodoE, dataEgr[re][8], fDtE)
      });
    }
  }

  _mk('egresos');
  // ── Cobrado por método de pago — SOLO registros posteriores al último Saldo Base ──
  // Usa la col "Facturado" (V en Home/Pilar, W en Clubes), repartida segun la Forma de Pago.
  // Facturado = Total a cobrar + propinas + A Favor/Aplicado, o sea TODO lo que entro.
  // Las cols R (Efectivo) y S (Transferencia) NO sirven para esto: guardan el Total a
  // cobrar SIN la propina (verificado el 13/9/2026 contra la planilla: con R/S el
  // efectivo daba $20.562 menos, exactamente las propinas en efectivo desde el conteo).
  // En Mixto se usan R/S solo como PROPORCION para repartir el Facturado.
  var cobradoEf = 0;
  var cobradoMP = 0;
  /* El desglose de lo digital, por cuenta. `cobradoMP` sigue siendo TODO lo
     digital —que es lo que significo siempre, porque el `else` del corte era
     "no efectivo"— y esto es su desglose. El panel usa uno o el otro, nunca
     los dos: con la hoja `Cuentas` cargada dibuja una tarjeta por cuenta, y
     sin ella cae al corte viejo. Asi que no hay doble conteo. */
  var cobradoCta = {};
  /* Un SOLO lugar acumula lo cobrado. Antes cada fuente le sumaba a mano a
     `cobradoEf` y a `cobradoMP` por su cuenta —los parciales, el cierre de
     Home/Pilar/Clubes y las liquidaciones de Red—, y por eso ninguna sabia de
     que cuenta hablaba. Con tres copias, ensenarle la cuenta a dos y olvidarse
     de la tercera es exactamente como este ERP ya se equivoco cuatro veces. */
  function _acumCobrado(ef, dig, cuentaId, q, det) {
    if (ef > 0) {
      cobradoEf += ef;
      /* `q` y `m` son lo unico que usa la cuenta (_lugaresCalcular_). Lo demas
         es para mostrar DE QUE cobros sale lo sin guardar (12/10/2026): el
         pedido, el cliente, la hora y, si el pago fue partido, cuanto fue por
         transferencia y a que cuenta. */
      var _ce = { q: q, m: ef };
      if (det) {
        _ce.ts = det.ts || 0; _ce.h = det.h || ''; _ce.id = det.id || ''; _ce.c = det.c || '';
        if (dig > 0) { _ce.mp = dig; _ce.cta = _cuentaDigitalValida_(cuentaId) || _cuentaDigitalDefault_(); }
      }
      _lugIn.cobEf.push(_ce);
    }
    if (dig > 0) {
      cobradoMP += dig;
      _sumarCuenta_(cobradoCta,
        _cuentaDigitalValida_(cuentaId) || _cuentaDigitalDefault_(), dig);
    }
  }
  // cobrosDetalle acumula TODOS los cobros (post-saldoBase en los que cuentan, + histórico
  // para el libro diario unificado en la tab Caja del Panel). Campos: f (fecha cobro string),
  // fTs (timestamp para sort), h (hoja), id, c (cliente), efTotal, mpTotal.
  var cobrosDetalle = [];

  // ── Cobros Parciales: cargar y sumar por separado ──
  // Cada parcial cuenta a caja viva inmediatamente (filtrado por saldoBase).
  // Cuando el pedido cierre como Cobrado, _sumarCobrado descuenta los parciales ya sumados
  // para no duplicar.
  var parcialesPorPed = {}; // { 'Hoja|id': { ef:0, mp:0, total:0 } }
  var shCP_caja = SS.getSheetByName('Cobros Parciales');
  if (shCP_caja && shCP_caja.getLastRow() > 1) {
    var dCP_caja = shCP_caja.getDataRange().getValues();
    for (var rcp_caja = 1; rcp_caja < dCP_caja.length; rcp_caja++) {
      var cpHoja = String(dCP_caja[rcp_caja][1] || '').trim();
      var cpId   = String(dCP_caja[rcp_caja][2] || '').trim();
      if (!cpHoja || !cpId) continue;
      var cpFp    = String(dCP_caja[rcp_caja][4] || '').trim();
      var cpMonto = Number(dCP_caja[rcp_caja][5]) || 0;
      var cpFecha = dCP_caja[rcp_caja][0];
      var cpCli   = String(dCP_caja[rcp_caja][3] || '').trim();
      var cpCta   = String(dCP_caja[rcp_caja][7] || '').trim();  // col H "Cuenta"
      if (cpMonto <= 0) continue;
      var keyCP = cpHoja + '|' + cpId;
      if (!parcialesPorPed[keyCP]) parcialesPorPed[keyCP] = { ef:0, mp:0, total:0 };
      if (cpFp === 'Efectivo') parcialesPorPed[keyCP].ef += cpMonto;
      else parcialesPorPed[keyCP].mp += cpMonto;
      parcialesPorPed[keyCP].total += cpMonto;

      var fDtCP = _parseDateAny(cpFecha);
      var fStrCP = fDtCP ? Utilities.formatDate(fDtCP, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : String(cpFecha || '');
      cobrosDetalle.push({
        f: fStrCP, fTs: fDtCP ? fDtCP.getTime() : 0,
        h: cpHoja, id: cpId + ' (parcial)', c: cpCli,
        efTotal: cpFp === 'Efectivo' ? cpMonto : 0,
        mpTotal: cpFp !== 'Efectivo' ? cpMonto : 0,
        cta: cpCta,
        q: String(dCP_caja[rcp_caja][8] || '').trim(),   // col I "Cobró" (13/9/2026)
        /* K «Pagó», L «Operación Cobro», N «Recibido Efectivo» (26/10/2026): una parte
           de un pedido pagada en el mismo cuadro que otros, ver _doPostCobrarParcial. */
        pg: _cobroPagadorValido_(dCP_caja[rcp_caja][10]),
        op: _cobroOpValida_(dCP_caja[rcp_caja][11]),
        recEf: Number(dCP_caja[rcp_caja][13]) || 0
      });

      // Sumar a caja viva sólo si es posterior al saldoBase
      if (saldoBase.fechaDate && !_afterSaldo(cpFecha)) continue;
      if (cpFp === 'Efectivo') _acumCobrado(cpMonto, 0, '', String(dCP_caja[rcp_caja][8] || '').trim(),
        { ts: fDtCP ? fDtCP.getTime() : 0, h: cpHoja, id: cpId + ' (parcial)', c: cpCli });
      else _acumCobrado(0, cpMonto, cpCta);
    }
  }
  function _sumarCobrado(hojaName, colsC) {
    var shC = SS.getSheetByName(hojaName);
    if (!shC || shC.getLastRow() <= 1) return;
    // Los encabezados solos: una fila, para ubicar las dos cols de fecha que no
    // tienen indice fijo (viven en la 49/54 de Home y en la 34/43 de Clubes).
    var hdrs = shC.getRange(1, 1, 1, shC.getLastColumn()).getValues()[0];
    var idxFc = -1;
    for (var hh = 0; hh < hdrs.length; hh++) {
      if (String(hdrs[hh]).trim() === 'Fecha de Cobro') { idxFc = hh; break; }
    }
    // Fecha entrega: col dinámica según hoja (fallback si fc vacío)
    var idxFeEnt = -1;
    for (var he = 0; he < hdrs.length; he++) {
      if (String(hdrs[he]).trim() === 'Fecha Entrega') { idxFeEnt = he; break; }
    }
    /* La cuenta donde entro la parte digital del cobro. Se busca por nombre y
       no por indice fijo: cae en la 77 de Home, la 76 de Pilar y la 48 de
       Clubes. Si la hoja no la tiene, queda en -1, no se lee nada y todo lo
       digital va al default — el comportamiento anterior al 10/9/2026. */
    var idxCta = -1;
    for (var hc = 0; hc < hdrs.length; hc++) {
      if (String(hdrs[hc]).trim() === 'Cuenta Cobro') { idxCta = hc; break; }
    }
    /* Quien tiene la plata (13/9/2026): "Cobró" si esta, y si no "Repartidor"
       (quien entrego), que es lo unico que hay para lo anterior. Ver _quienCobra_. */
    var idxCob = -1, idxRep = -1;
    for (var hq = 0; hq < hdrs.length; hq++) {
      var _hn = String(hdrs[hq]).trim();
      if (_hn === 'Cobró') idxCob = hq;
      else if (_hn === 'Repartidor') idxRep = hq;
    }
    /* EL BILLETE QUE DIO EL CLIENTE (28/9/2026). Vive al final, igual que
       "Cuenta Cobro" y "Cobró", asi que entra en la MISMA lectura. En -1 —los
       pedidos anteriores a hoy, y las hojas que todavia no la tienen— no se lee
       nada y la card sigue reconstruyendo el bruto, que es lo de siempre. */
    var idxRec = -1;
    for (var hr2 = 0; hr2 < hdrs.length; hr2++) {
      if (String(hdrs[hr2]).trim() === 'Recibido Efectivo') { idxRec = hr2; break; }
    }
    /* EL TELEFONO, para juntar los pedidos que se pagaron con UN billete
       (17/10/2026). Vicky pago #1120, #1123 y #1170 con $220.000: el billete queda
       anotado solo en el primero y Caja decia «sobran $144.459». El telefono es la
       casa (el nombre viene tipeado de tres formas). Vive a 8 columnas de «Fecha
       de Cobro» en Home: entra en el mismo bloque de la lectura. */
    var idxTel = -1;
    for (var ht = 0; ht < hdrs.length; ht++) {
      if (String(hdrs[ht]).trim() === 'Teléfono') { idxTel = ht; break; }
    }
    /* Solo estas columnas. Antes se traia la hoja entera: en Home, 70 cols para
       usar 10. Ver _leerColsRalas_ arriba. "Repartidor" va con este bloque porque
       vive pegada a "Fecha de Cobro" (una columna mas); "Cuenta Cobro" y "Cobró"
       van juntas al final, en UNA lectura: sumarlas a este bloque lo estiraria
       ~22 columnas por hoja, y en Apps Script eso cuesta mas que una llamada. */
    /* LA OPERACION DEL CUADRO Y LA CASA (26/10/2026). Rodrigo pago el asado de
       Tadeo (#2052) y la entrana de Aki (#2076) con un billete: el cuadro los
       junto por la CASA (lote 289) y el cartel los separaba por telefono. Ahora
       cada cobro trae su «Operación Cobro» (desde hoy) y su casa (barrio, sub
       barrio y lote, la misma clave que el cuadro: `_cobroClaveCasa_`), y Caja
       junta por operacion y, en lo anterior, por casa. «Pagó» dice quien puso la
       plata si no fue el cliente. */
    var _ixH = function (nom) { for (var i = 0; i < hdrs.length; i++) if (String(hdrs[i]).trim() === nom) return i; return -1; };
    var idxBar = _ixH('Barrio'), idxSub = _ixH('Sub Barrio'), idxLot = _ixH('Domicilio - Lote');
    var idxOp = _ixH(COBRO_OP_COL_), idxPg = _ixH(COBRO_PAGO_COL_);
    var _c = _leerColsRalas_(shC, [1, 3, colsC.cli, colsC.fp, colsC.ep,
                                   colsC.ef, colsC.tr, colsC.fac, idxFc, idxFeEnt, idxRep, idxTel, idxBar, idxSub, idxLot], _lecModo);
    var _fin = _leerColsRalas_(shC, [idxCta, idxCob, idxRec, idxOp, idxPg], _lecModo);
    var _cta = function (r) { return idxCta >= 0 ? _fin.v(r, idxCta) : ''; };
    var _quien = function (r) {
      return String((idxCob >= 0 ? _fin.v(r, idxCob) : '') || (idxRep >= 0 ? _c.v(r, idxRep) : '') || '').trim();
    };
    for (var rc2 = 1; rc2 < _c.n; rc2++) {
      if (String(_c.v(rc2, colsC.ep)).trim() !== 'Cobrado') continue;
      var ef = Number(_c.v(rc2, colsC.ef)) || 0;
      var tr = Number(_c.v(rc2, colsC.tr)) || 0;
      var facturado = Number(_c.v(rc2, colsC.fac)) || 0;
      var fpVal = String(_c.v(rc2, colsC.fp) || '').trim();
      // Fecha del cobro: fc → fe entrega → fecha pedido
      var fcRaw = idxFc >= 0 ? _c.v(rc2, idxFc) : '';
      var feEntRaw = idxFeEnt >= 0 ? _c.v(rc2, idxFeEnt) : '';
      var fPedRaw = _c.v(rc2, 3);
      var fUsar = fcRaw || feEntRaw || fPedRaw;
      var fDt = _parseDateAny(fUsar);
      var fStr = fDt ? Utilities.formatDate(fDt, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : String(fUsar || '');
      var cliente = String(_c.v(rc2, colsC.cli) || '').trim();
      var pedidoId = String(_c.v(rc2, 1) || '').trim();
      // Cobro = col Facturado (V en Home/Pilar, W en Clubes).
      // Se asigna al medio según Forma de Pago del pedido.
      // DESCONTAR parciales ya contabilizados para no duplicar.
      var parcAcum = parcialesPorPed[hojaName + '|' + pedidoId];
      var alreadyCounted = parcAcum ? (parcAcum.ef + parcAcum.mp) : 0;
      var netoCierre = facturado - alreadyCounted;
      var efTotal = 0, mpTotal = 0;
      if (netoCierre > 0) {
        if (fpVal === 'Efectivo') efTotal = netoCierre;
        else if (fpVal === 'Mixto') {
          // Bug Gonzalo 05/06: fp=Mixto mandaba TODO el facturado a MP en libro diario.
          // Usar la composición real de las cols Ef/Tr del pedido, escalando por si hubo parciales.
          /* MEDIO POR MEDIO (28/10/2026). Con parciales se restaba el total y lo que quedaba se
             repartia con la proporcion del pedido ENTERO: el #2056 (Ef 26.000 + Tr 18.000, parcial
             de 26.000 en efectivo) cerraba con $10.636 en efectivo que nadie cobro. Lo que falta de
             cada medio es su columna menos los parciales de ese medio (nunca negativo), escalado al
             neto por si hubo propina. Sin parciales da lo mismo que antes. */
          var efResta = Math.max(0, ef - (parcAcum ? parcAcum.ef : 0));
          var trResta = Math.max(0, tr - (parcAcum ? parcAcum.mp : 0));
          if (facturado > 0 && (efResta + trResta) > 0) {
            efTotal = Math.round(netoCierre * (efResta / (efResta + trResta)));
            mpTotal = netoCierre - efTotal;
          } else if (facturado > 0 && (ef + tr) > 0) {
            efTotal = Math.round(netoCierre * (ef / (ef + tr)));
            mpTotal = netoCierre - efTotal;
          } else {
            mpTotal = netoCierre;
          }
        } else {
          mpTotal = netoCierre;
        }
      }
      if (efTotal > 0 || mpTotal > 0) {
        cobrosDetalle.push({
          f: fStr, fTs: fDt ? fDt.getTime() : 0,
          h: hojaName, id: pedidoId, c: cliente,
          fila: rc2 + 1,   // el 📅 de Caja corrige ESTA fila: el N° se repite (14/10/2026)
          efTotal: efTotal, mpTotal: mpTotal,
          cta: String(_cta(rc2) || '').trim(),
          /* Lo que el cliente puso en la mano. 0 = no se guardo (un pedido
             anterior al 28/9/2026, o un cobro sin efectivo). */
          recEf: idxRec >= 0 ? (Number(_fin.v(rc2, idxRec)) || 0) : 0,
          t: idxTel >= 0 ? _crmNormTel(_c.v(rc2, idxTel)) : '',
          casa: (idxSub >= 0 && idxLot >= 0) ? _cobroClaveCasa_(idxBar >= 0 ? _c.v(rc2, idxBar) : '', _c.v(rc2, idxSub), _c.v(rc2, idxLot)) : '',
          op: idxOp >= 0 ? _cobroOpValida_(_fin.v(rc2, idxOp)) : '',
          pg: idxPg >= 0 ? _cobroPagadorValido_(_fin.v(rc2, idxPg)) : '',
          q: _quien(rc2)
        });
      }
      // Filtrar por saldoBase SOLO para sumar a caja viva.
      if (saldoBase.fechaDate) {
        if (idxFc < 0) continue;
        if (!_afterSaldo(fcRaw)) continue;
      }
      _acumCobrado(efTotal, mpTotal, String(_cta(rc2) || '').trim(), _quien(rc2),
        { ts: fDt ? fDt.getTime() : 0, h: hojaName, id: pedidoId, c: cliente });
    }
  }
  // Home/Pilar v2: L=11=FP, M=12=EP, R=17=Efectivo, S=18=Transferencia, V=21=Facturado, H=7=Cliente
  _sumarCobrado('Home',   { ep: 12, fp: 11, ef: 17, tr: 18, fac: 21, cli: 7 });
  _sumarCobrado('Pilar',  { ep: 12, fp: 11, ef: 17, tr: 18, fac: 21, cli: 7 });
  // Clubes: O=14=FP, P=15=EP, S=18=Efectivo, T=19=Transferencia, W=22=Facturado, H=7=Cliente
  _sumarCobrado('Clubes', { ep: 15, fp: 14, ef: 18, tr: 19, fac: 22, cli: 7 });
  // Red: NO se suma desde la hoja Red (esa plata está en el bolsillo del vendedor, no en caja Maleu).
  // La caja de Maleu se alimenta de "Pagos Red Liq" cuando el vendedor liquida (ver _sumarPagosRedLiq abajo).
  _sumarPagosRedLiq();
  _sumarRedDirecto();

  /* Lo que un cliente de Red le transfirio DIRECTO a Maleu (9/10/2026, palanca
     RED_COBRO_A_CAJA): entra como cobro del dia en que se cobro, en la cuenta que
     dijo un admin. Sin cuenta no suma: nadie confirmo donde esta esa plata. El
     efectivo de esos pedidos NO va aca: entra con «Recibí» (Pagos Red Liq). */
  function _sumarRedDirecto() {
    if (!_redCobroIdx_()) return;
    var shRD = SS.getSheetByName('Red');
    if (!shRD || shRD.getLastRow() < 2) return;
    var dRD = shRD.getDataRange().getValues();
    for (var rD = 1; rD < dRD.length; rD++) {
      var xD = _redDirecto_(dRD[rD]);
      if (!xD || !xD.cuenta || !xD.fecha) continue;
      var fDtD = _parseDateAny(xD.fecha);
      cobrosDetalle.push({
        f: fDtD ? Utilities.formatDate(fDtD, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : String(xD.fecha || ''),
        fTs: fDtD ? fDtD.getTime() : 0,
        h: 'Red', id: String(dRD[rD][1] || '').trim(),
        c: String(dRD[rD][8] || '').trim() + ' (Red: ' + String(dRD[rD][7] || '').trim() + ')',
        efTotal: 0, mpTotal: xD.tr, cta: xD.cuenta, q: ''
      });
      if (saldoBase.fechaDate && !_afterSaldo(xD.fecha)) continue;
      _acumCobrado(0, xD.tr, xD.cuenta, '');
    }
  }

  function _sumarPagosRedLiq() {
    var shL = SS.getSheetByName('Pagos Red Liq');
    if (!shL || shL.getLastRow() <= 1) return;
    var dL = shL.getDataRange().getValues();
    // Layout: A=Timestamp, B=Fecha, C=Vendedor, D=Año, E=Semana, F=Efectivo, G=Transferencia, H=Total, ...
    //         N=Cuenta (13, 0-based) — a que cuenta digital le transfirio el vendedor.
    for (var rL = 1; rL < dL.length; rL++) {
      var tsL = dL[rL][0];
      if (!tsL) continue;
      var efL = Number(dL[rL][5]) || 0;
      var mpL = Number(dL[rL][6]) || 0;
      // Siempre agregar al detalle (histórico), filtrar por saldoBase solo para sumar a caja viva.
      var fDtL = _parseDateAny(tsL);
      if (efL > 0 || mpL > 0) {
        cobrosDetalle.push({
          f: fDtL ? Utilities.formatDate(fDtL, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : String(tsL || ''),
          fTs: fDtL ? fDtL.getTime() : 0,
          h: 'Red', id: 'Liq', c: String(dL[rL][2] || 'Liquidación Red').trim(),
          efTotal: efL, mpTotal: mpL,
          cta: String(dL[rL][13] || '').trim(),
          q: String(dL[rL][14] || '').trim()   // col O "Recibió" (13/9/2026)
        });
      }
      if (saldoBase.fechaDate && !_afterSaldo(tsL)) continue;
      _acumCobrado(efL, mpL, String(dL[rL][13] || '').trim(), String(dL[rL][14] || '').trim(),
        { ts: fDtL ? fDtL.getTime() : 0, h: 'Red', id: 'Liq', c: 'Rendición de ' + String(dL[rL][2] || 'un vendedor').trim() });
    }
  }

  _mk('cobros');
  // ── Ingresos manuales ──
  // ingresos[] incluye TODO. ingresosEf/MP solo los posteriores al Saldo Base (para el saldo vivo).
  var ingresos = [];
  var ingresosEf = 0;
  var ingresosMP = 0;
  var shIng = SS.getSheetByName('Ingresos');
  if (shIng && shIng.getLastRow() > 1) {
    var dataIng = shIng.getDataRange().getValues();
    for (var ri = 1; ri < dataIng.length; ri++) {
      if (!dataIng[ri][0]) continue;
      var fechaI = dataIng[ri][0];
      var fechaStrI = fechaI instanceof Date ? Utilities.formatDate(fechaI, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy') : String(fechaI || '');
      var montoI = Number(dataIng[ri][6]) || 0;
      var metodoI = String(dataIng[ri][5] || '').trim();
      if (_afterSaldo(fechaI)) {
        if (metodoI === 'Efectivo') { ingresosEf += montoI; _lugIn.ing.push({ lugar: String(dataIng[ri][8] || '').trim(), m: montoI, ts: _tsDe(fechaI), con: String(dataIng[ri][4] || '').trim(), fila: ri + 1 }); }
        else ingresosMP += montoI;
        _sumarCuenta_(ingresosPorCuenta, _cuentaDeMetodo_(metodoI), montoI);
      }
      var fDtI = _parseDateAny(fechaI);
      var tsI = fDtI ? fDtI.getTime() : 0;
      var fStrFullI = fDtI ? Utilities.formatDate(fDtI, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : fechaStrI;
      ingresos.push({
        f: fechaStrI, fFull: fStrFullI, ts: tsI, r: ri + 1,
        /* Los ingresos NO traian el mes (13/9/2026), y el panel los filtra por
           mes: los rendimientos de Mercado Pago no aparecian nunca en "Intereses
           ganados" del EERR, ni en el flujo de Inicio. */
        mes: _mesNombreDe_(fDtI) || String(dataIng[ri][2] || ''),
        anio: fDtI ? fDtI.getFullYear() : 0,
        cat: String(dataIng[ri][3] || '').trim(),
        con: String(dataIng[ri][4] || '').trim(), met: metodoI,
        $: montoI, not: String(dataIng[ri][7] || '').trim(),
        lug: _lugarDeMov_(metodoI, dataIng[ri][8], fDtI)
      });
    }
  }

  // ── Vueltos desde la billetera (para el desglose por día del Resumen) ──
  // Permite explicar por qué el efectivo cobrado (neto) es menor a los billetes que
  // entraron en mano: EF neto + vuelto = recibido. Agrupado por día (dd/MM).
  var vueltos = [];
  var shCbV = SS.getSheetByName('Cambios Billetera');
  if (shCbV && shCbV.getLastRow() > 1) {
    var dCbV = shCbV.getDataRange().getValues();
    for (var rcb = 1; rcb < dCbV.length; rcb++) {
      var fCbRaw = dCbV[rcb][0];
      var mCb = Number(dCbV[rcb][4]) || 0;
      if (mCb <= 0) continue;
      var fCbDt = _parseDateAny(fCbRaw);
      vueltos.push({
        f: fCbDt ? Utilities.formatDate(fCbDt, 'America/Argentina/Buenos_Aires', 'dd/MM') : String(fCbRaw || ''),
        h: String(dCbV[rcb][1] || ''), c: String(dCbV[rcb][3] || ''), $: mCb,
        tipo: String(dCbV[rcb][6] || 'Billetera').trim()   // col G: Billetera | CambioMP | CruzadoEf
      });
      /* El vuelto desde la billetera, para los lugares: sale de la billetera de
         quien lo dio (col F) y entra a lo que cobro. Los cruzados no: esos ya
         son un Ingreso o un Egreso con su lugar. */
      if (String(dCbV[rcb][6] || 'Billetera').trim() === 'Billetera' && _afterSaldo(fCbRaw)) {
        _lugIn.vueltos.push({ q: String(dCbV[rcb][5] || '').trim(), m: mCb, ts: fCbDt ? fCbDt.getTime() : 0,
                               h: String(dCbV[rcb][1] || '').trim(), id: String(dCbV[rcb][2] || '').trim(), c: String(dCbV[rcb][3] || '').trim() });
      }
    }
  }

  // ── Sobres activos (detalle: a qué proveedor va cada sobre) ──
  var sobresLista = [];
  var shSobL = SS.getSheetByName('Sobres');
  if (shSobL && shSobL.getLastRow() > 1) {
    var dSobL = shSobL.getDataRange().getValues();
    for (var rsl = 1; rsl < dSobL.length; rsl++) {
      if (String(dSobL[rsl][3] || '').trim() !== 'Activo') continue;
      var mSob = Number(dSobL[rsl][2]) || 0;
      if (mSob <= 0) continue;
      sobresLista.push({ r: rsl + 1, prov: String(dSobL[rsl][1] || '').trim(), monto: mSob });
    }
  }

  /* ── Los lugares del efectivo (5/10/2026) ── Ver _lugaresCalcular_. Solo con
     las billeteras arrancadas; antes viaja `activo:false` para que Caja ofrezca
     el conteo de arranque. Un error aca NO tumba la caja (seria todo el
     endpoint): viaja como `error` y la pantalla lo muestra. */
  var lugares = null;
  try {
    var _cfgLug = _lugaresCfg_();
    if (_cfgLug.activo && saldoBase.fechaDate) {
      var _movsL = [];
      var _shMP = SS.getSheetByName('Movimientos Plata');
      if (_shMP && _shMP.getLastRow() > 1) {
        /* Las 4 primeras columnas son la cuenta. De la 5 a la 8 (Quien, Nota,
           Op, Cobros) sale el detalle: quien lo anoto y que cobros marco. */
        var _anchoMP = Math.max(4, Math.min(8, _shMP.getLastColumn()));
        var _dMP = _shMP.getRange(2, 1, _shMP.getLastRow() - 1, _anchoMP).getValues();
        for (var _im = 0; _im < _dMP.length; _im++) {
          if (!_afterSaldo(_dMP[_im][0])) continue;
          _movsL.push({ desde: String(_dMP[_im][1] || '').trim(), hacia: String(_dMP[_im][2] || '').trim(), m: Number(_dMP[_im][3]) || 0, fila: _im + 2, op: String(_dMP[_im][6] || '').trim(),
                        ts: (_dMP[_im][0] instanceof Date) ? _dMP[_im][0].getTime() : 0,
                        q: String(_dMP[_im][4] || '').trim(), nota: String(_dMP[_im][5] || '').trim(),
                        cobros: String(_dMP[_im][7] || '').trim() });
        }
      }
      lugares = _lugaresCalcular_({
        personas: _cfgLug.personas, base: _cfgLug.base,
        cobEf: _lugIn.cobEf, vueltos: _lugIn.vueltos, ing: _lugIn.ing, gas: _lugIn.gas,
        movs: _movsL, reservas: _reservasActivas_(),
        efVivo: saldoBase.ef + cobradoEf + ingresosEf - gastosEf
      });
      lugares.movsUlt = _movPlataUltimos_(15);
      /* LUGARES_PG (19/10/2026, 076): las MISMAS entradas, para que la base calcule
         el saldo de cada lugar. Va al cache y lo manda el reloj del minuto. */
      try { _lugaresPgGuardar_(_cfgLug, saldoBase.fechaDate, _lugIn, _movsL, lugares); } catch (_eLpg) { try { _pgAnotarError_('LUGARES', _eLpg); } catch (_e2) {} }
      /* De que sale lo sin guardar de cada uno. Aparte y con su propio try: es
         un desglose, y un error aca no puede dejar la caja sin lugares. */
      try {
        lugares.det = _lugaresDetalle_({
          personas: _cfgLug.personas, base: _cfgLug.base, baseTs: saldoBase.fechaDate.getTime(),
          cobEf: _lugIn.cobEf, vueltos: _lugIn.vueltos, ing: _lugIn.ing, gas: _lugIn.gas, movs: _movsL
        });
      } catch (_eDet) { lugares.det = {}; lugares.detError = String((_eDet && _eDet.message) || _eDet); }
    } else if (_cfgLug.personas.length && !_cfgLug.activo) {
      lugares = { activo: false, personas: _cfgLug.personas, sinAsignar: !!_cfgLug.colCob[''] };
    }
  } catch (_eLug) {
    lugares = { activo: !!(_LUG_CFG_ && _LUG_CFG_.activo), error: String((_eLug && _eLug.message) || _eLug) };
  }

  // ── Gastos por mes (para P&L) — fuente única: hoja Egresos ──
  var gastosHist = {};
  gastos.forEach(function(g) {
    var m = g.mes || '';
    if (m) { if (!gastosHist[m]) gastosHist[m] = 0; gastosHist[m] += g.$; }
  });

  /* Cada cronometro mide SU bloque. Hasta el 11/9/2026 no habia marca entre
     'cobros' y 'efectivoMano', asi que "efectivoMano" median los ingresos, los
     vueltos, los sobres Y el libro diario, y 'movimientos' quedaba despues y
     marcaba siempre 0. El numero culpaba a la funcion equivocada. */
  _mk('ingresos');

  // ── Libro diario unificado (vista derivada) ──
  // Combina: cobros de pedidos (Home/Pilar/Clubes + Liq Red) + ingresos + gastos.
  // El Panel → tab Caja → "Movimientos" lee esto. Sin duplicar datos en el Sheets.
  var movimientos = [];
  function _fechaStrToTs(f) {
    if (!f) return 0;
    var s = String(f).trim();
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m) return 0;
    var dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]),
                      m[4] ? Number(m[4]) : 0, m[5] ? Number(m[5]) : 0);
    return dt.getTime();
  }
  cobrosDetalle.forEach(function(cd) {
    // 1 entry por método (si mixto, se parten en 2 para no confundir)
    if (cd.efTotal > 0) {
      movimientos.push({
        tipo: 'cobro', f: cd.f, ts: cd.fTs || _fechaStrToTs(cd.f),
        cat: 'COBRO ' + cd.h, con: cd.c + (cd.id ? ' #' + cd.id : ''),
        /* Con estos nombres porque el Panel ya los esperaba: "si en el futuro
           el backend manda m.hoja y m.pedido directamente, los uso
           preferentemente" (rMovimientos). Hasta hoy los sacaba parseando
           'COBRO Home' y 'Cliente #1025', o sea adivinando una clave desde una
           etiqueta escrita para leerse. */
        hoja: cd.h, pedido: cd.id || '', fila: cd.fila || 0,
        met: 'Efectivo', cta: _cuentaEfectivo_(), $: cd.efTotal, not: '',
        /* Quien lo cobro: el libro dice de quien es lo cobrado (5/10/2026). */
        q: cd.q || ''
      });
    }
    if (cd.mpTotal > 0) {
      /* El metodo REAL de ese cobro, no "Mercado Pago" para todo lo digital:
         un cobro que entro al Brubank y en el libro diario dice Mercado Pago
         es la misma mentira que las tarjetas de la caja vinieron a sacar.
         Sin cuenta declarada cae al default, que para los ~600 cobros de antes
         del 10/9/2026 es la verdad: era la unica cuenta digital que habia. */
      var _ctaMov = _cuentaDigitalValida_(cd.cta) || _cuentaDigitalDefault_();
      movimientos.push({
        tipo: 'cobro', f: cd.f, ts: cd.fTs || _fechaStrToTs(cd.f),
        cat: 'COBRO ' + cd.h, con: cd.c + (cd.id ? ' #' + cd.id : ''),
        /* Con estos nombres porque el Panel ya los esperaba: "si en el futuro
           el backend manda m.hoja y m.pedido directamente, los uso
           preferentemente" (rMovimientos). Hasta hoy los sacaba parseando
           'COBRO Home' y 'Cliente #1025', o sea adivinando una clave desde una
           etiqueta escrita para leerse. */
        hoja: cd.h, pedido: cd.id || '', fila: cd.fila || 0,
        met: _metodoDeCuenta_(_ctaMov) || 'Mercado Pago', cta: _ctaMov,
        $: cd.mpTotal, not: ''
      });
    }
  });
  ingresos.forEach(function(i) {
    movimientos.push({
      tipo: 'ingreso', f: i.fFull || i.f, ts: i.ts || _fechaStrToTs(i.f), r: i.r || 0,
      /* `cta` sale de la MISMA traduccion con la que la caja suma este
         ingreso (`_cuentaDeMetodo_`): la pantalla filtra por cuenta sin tener
         que adivinar que "Brubank Lucas" es el Brubank. */
      cat: i.cat || 'Ingreso', con: i.con, met: i.met, cta: _cuentaDeMetodo_(i.met), lug: i.lug || '',
      $: i.$, not: i.not || ''
    });
  });
  gastos.forEach(function(g) {
    movimientos.push({
      tipo: 'gasto', f: g.fFull || g.f, ts: g.ts || _fechaStrToTs(g.f), r: g.r || 0,
      cat: g.cat || 'Gasto', con: g.con, met: g.met, cta: _cuentaDeMetodo_(g.met), lug: g.lug || '',
      $: g.$, not: g.not || '',
      /* Un pago a proveedor no se borra desde Caja: lo escribio `pagarProveedor`
         junto con su fila en Pagos Proveedores, y borrar solo el egreso deja la
         deuda del proveedor mintiendo. Se revierte desde Abastecimiento. */
      noBorrar: _MOV_NO_BORRABLE[String(g.cat || '').trim()] || ''
    });
  });
  // Orden: más reciente arriba.
  movimientos.sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });
  _mk('movimientos');

  // En mode='caja' devolvemos solo lo que el frontend necesita para renderizar
  // tab Caja (saldo, movimientos, gastos, ingresos). Sin pedidos[], canales[],
  // stock, OC, vendedores, proveedores. Skipea también la lectura de Proveedores.
  var _eerrParams = _eerrParamsPanel_();
  if (_cajaMode) {
    var _efMano = _efectivoEnManoPorDia_(cobrosDetalle, _parseDateAny);
    _mk('efectivoMano');
    _ms.lec = _lecModo || 'dos';
    _ms.total = Date.now() - _msT0;
    var _outCaja = JSON.stringify({
      ts: Date.now(),
      _ms: _ms,
      caja: { cobradoEf: cobradoEf, cobradoMP: cobradoMP, gastosEf: gastosEf, gastosMP: gastosMP, totalGastos: totalGastos, ingresosEf: ingresosEf, ingresosMP: ingresosMP,
              /* El desglose por cuenta. Los cobros de PEDIDOS van al
                 efectivo y a la digital por defecto: la Forma de Pago de un
                 pedido dice "Transferencia" y todavia no dice a que cuenta,
                 asi que atribuirlos a otra seria inventar. */
              cobradoPorCuenta: _cobradoPorCuenta_(cobradoEf, cobradoMP, cobradoCta),
              gastosPorCuenta: gastosPorCuenta,
              ingresosPorCuenta: ingresosPorCuenta,
              cuentas: _cuentasParaPanel_() },
      saldoBase: saldoBase,
      gastos: gastos,
      ingresos: ingresos,
      gastosHist: gastosHist,
      redondeosProv: _redondeosParaEerr_(),
      movimientos: movimientos,
      sobres: sobresLista,
      lugares: lugares,
      traspasos: _traspasosLibroSeguro_(),
      efMano: _efMano,
      /* Vueltos cuyo pedido ya no existe (21/9/2026). Van en la respuesta para
         que Caja pueda avisar en vez de sumar plata que nadie puede explicar:
         al borrar un pedido a mano en la planilla no se entera ningun endpoint,
         asi que su fila de "Cambios Billetera" queda sumando para siempre. */
      efHuerfanos: _vueltosHuerfanos_(),
      /* `vueltos` ya se calculaba aca (sale de la hoja `Cambios Billetera`)
         y no se mandaba. Lo pide Inicio para el desglose por dia del
         Resumen, y era uno de los tres campos que la obligaban a pedir el
         volcado entero. Agregarlo no cuesta una lectura mas. (27/9/2026) */
      vueltos: vueltos,
      /* El ultimo campo que quedaba solo en el volcado (27/9/2026). Lo usa
         la tab Proveedores; es una lectura de una hoja chica. Con esto,
         ninguna pantalla del ERP necesita ya `action=admin`. */
      proveedores: _proveedoresNombres_(),
      provisiones: _eerrParams.provisiones,
      config: _eerrParams.config,
      cajaMode: true
    });
    if (!_lecModo && _volcadoVer_() === _verIni) _cacheGuardarGrande_('admin_caja_v1', _outCaja, VOLCADO_CACHE_SEG);
    return ContentService.createTextOutput(_outCaja).setMimeType(ContentService.MimeType.JSON);
  }

  // Compartida con `cajaLight` desde el 27/9/2026 — ver _proveedoresNombres_.
  var proveedoresList = _proveedoresNombres_();

  var _saludAdm = _saludClientes_(argNow);
  return ContentService
    .createTextOutput(JSON.stringify({
      ts: Date.now(),
      canales: canales,
      totales: totales,
      pedidos: pedidos,
      stock: stock,
      /* Los depositos (id y nombre) para leer `stock[].pd`, y cuando corrio el
         ultimo cierre de semana: si el lunes no corrio, Inicial/Comprado/Vendidos
         son de la semana anterior y la pantalla lo tiene que decir. */
      stockDeps: _stockDepsPanel_(),
      stockCierre: _stockCierreTs_(),
      proveedores: proveedoresList,
      oc: { pendientes: ocPend, costo: ocTotal, lista: ocLista, alFreezer: _ocApModo_() },
      caja: { cobradoEf: cobradoEf, cobradoMP: cobradoMP, gastosEf: gastosEf, gastosMP: gastosMP, totalGastos: totalGastos, ingresosEf: ingresosEf, ingresosMP: ingresosMP,
              /* El desglose por cuenta. Los cobros de PEDIDOS van al
                 efectivo y a la digital por defecto: la Forma de Pago de un
                 pedido dice "Transferencia" y todavia no dice a que cuenta,
                 asi que atribuirlos a otra seria inventar. */
              cobradoPorCuenta: _cobradoPorCuenta_(cobradoEf, cobradoMP, cobradoCta),
              gastosPorCuenta: gastosPorCuenta,
              ingresosPorCuenta: ingresosPorCuenta,
              cuentas: _cuentasParaPanel_() },
      vendedores: vendedoresArr,
      saldoBase: saldoBase,
      gastos: gastos,
      ingresos: ingresos,
      gastosHist: gastosHist,
      redondeosProv: _redondeosParaEerr_(),
      movimientos: movimientos,
      vueltos: vueltos,
      sobres: sobresLista,
      lugares: lugares,
      traspasos: _traspasosLibroSeguro_(),
      saludSem: _saludAdm.sem,
      saludSemM: _saludAdm.semM,
      saludMes: _saludAdm.mes,
      ventasExtra: _ventasExtraPanel_(),
      provisiones: _eerrParams.provisiones,
      config: _eerrParams.config,
      /* Solo con ms=1. Va al final para no cambiar de lugar nada que ya se lea. */
      _ms: _conMs ? (function () { _ms.libroDiario = Date.now() - _msPrev; _ms.total = Date.now() - _msT0; return _ms; })() : undefined
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

var _MOV_NO_BORRABLE = { 'Proveedor': 'proveedor', 'Proveedores': 'proveedor', 'Comisión Red': 'liqred' };

function _vueltosHuerfanos_() {
  var out = [];
  var shCB = SS.getSheetByName('Cambios Billetera');
  if (!shCB || shCB.getLastRow() <= 1) return out;
  var HOJAS = ['Home', 'Pilar', 'Clubes'];
  var ids = {};
  HOJAS.forEach(function (h) {
    ids[h] = {};
    var sh = SS.getSheetByName(h);
    if (!sh || sh.getLastRow() <= 1) return;
    // Col B = N° de pedido en las tres hojas.
    sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().forEach(function (f) {
      var v = String(f[0] || '').trim();
      if (v) ids[h][v] = 1;
    });
  });
  var v = shCB.getDataRange().getValues();
  for (var r = 1; r < v.length; r++) {
    var monto = Number(v[r][4]) || 0;
    if (monto <= 0) continue;
    var h = String(v[r][1] || '').trim();
    if (HOJAS.indexOf(h) < 0) continue;      // no se puede verificar → no se opina
    var id = String(v[r][2] || '').trim();
    if (!id || ids[h][id]) continue;
    /* `_mcFecha_` y no un parser nuevo: es global, acepta Date y "dd/MM/yyyy", y
       dos criterios para la misma fecha es el error que este ERP ya pago varias
       veces. La hoja escribe un Date, asi que la hora llega entera. */
    var dt = _mcFecha_(v[r][0]);
    out.push({
      fila: r + 1, h: h, id: id,
      c: String(v[r][3] || '').trim(),
      $: monto,
      q: String(v[r][5] || '').trim(),
      tipo: String(v[r][6] || 'Billetera').trim(),
      f: dt ? Utilities.formatDate(dt, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : String(v[r][0] || '')
    });
  }
  return out;
}

var SALDO_COL_CONTADAS_ = 'Contadas';

function _saldoContados_(filas) {
  var out = { contado: {}, desde: null };
  if (!filas || filas.length < 2) return out;
  var col = -1;
  for (var i = 0; i < filas[0].length; i++) if (String(filas[0][i] || '').trim() === SALDO_COL_CONTADAS_) { col = i; break; }
  if (col < 0) return out;
  /* La fecha del conteo: Date (lo normal) o «dd/MM/yyyy HH:mm». `_parseDateAny` no
     sirve aca: vive adentro de _doGetAdmin. */
  var fecha = function (v) {
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(v || '').trim());
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0)) : null;
  };
  for (var r = 1; r < filas.length; r++) {
    var f = fecha(filas[r][0]);
    if (!f) continue;
    var v = filas[r][col];
    if (v === '' || v === null || v === undefined) continue;
    if (!out.desde) out.desde = f;
    String(v).split(',').forEach(function (id) {
      id = id.trim();
      if (id && (!out.contado[id] || f >= out.contado[id])) out.contado[id] = f;
    });
  }
  return out;
}

var _LUG_CFG_ = null;

function _lugaresCfg_() {
  if (_LUG_CFG_) return _LUG_CFG_;
  var cfg = { personas: [], colBil: {}, colCob: {}, activo: false, base: { ef: 0, bil: {}, cob: {} }, lastRow: 0 };
  var sh = SS.getSheetByName('Saldo Base');
  if (!sh || sh.getLastRow() < 1 || sh.getLastColumn() < 1) return (_LUG_CFG_ = cfg);
  var ancho = sh.getLastColumn();
  var hdr = sh.getRange(1, 1, 1, ancho).getValues()[0];
  for (var i = 0; i < hdr.length; i++) {
    var h = String(hdr[i] || '').trim(), m;
    if ((m = /^Billetera\s+(.+)$/.exec(h))) cfg.colBil[m[1].trim()] = i + 1;
    else if (h === 'Cobrado sin asignar') cfg.colCob[''] = i + 1;
    else if ((m = /^Cobrado\s+(.+)$/.exec(h))) cfg.colCob[m[1].trim()] = i + 1;
  }
  Object.keys(cfg.colBil).forEach(function (p) { if (cfg.colCob[p]) cfg.personas.push(p); });
  cfg.lastRow = sh.getLastRow();
  if (cfg.personas.length && cfg.lastRow > 1) {
    /* Toda la hoja (son pocas filas): la ultima da la base, y la PRIMERA con
       las billeteras llenas dice desde cuando el efectivo tiene lugar. Antes de
       esa fecha un gasto sin lugar no estaba "en la caja fuerte": no habia
       lugares, y el libro diario no lo puede decir (5/10/2026). */
    var todas = sh.getRange(2, 1, cfg.lastRow - 1, ancho).getValues();
    var fila = todas[todas.length - 1];
    var vacia = function (v) { return v === '' || v === null || v === undefined; };
    var llena = function (f) {
      return cfg.personas.every(function (p) { return !vacia(f[cfg.colBil[p] - 1]) && !vacia(f[cfg.colCob[p] - 1]); });
    };
    cfg.activo = llena(fila);
    /* «Desde cuando» es la primera fila con la billetera de ALGUIEN, no la de
       todos (24/10/2026): una persona que se suma despues (Santos, ese dia) tiene
       sus columnas vacias en las filas viejas, y con «todos» la fecha saltaba a
       la de su alta y cambiaba el libro diario de antes. */
    var alguna = function (f) {
      return cfg.personas.some(function (p) { return !vacia(f[cfg.colBil[p] - 1]) && !vacia(f[cfg.colCob[p] - 1]); });
    };
    for (var iq = 0; iq < todas.length; iq++) {
      if (alguna(todas[iq]) && todas[iq][0] instanceof Date) { cfg.desde = todas[iq][0]; break; }
    }
    cfg.base.ef = Number(fila[1]) || 0;
    cfg.personas.forEach(function (p) {
      cfg.base.bil[p] = Number(fila[cfg.colBil[p] - 1]) || 0;
      cfg.base.cob[p] = Number(fila[cfg.colCob[p] - 1]) || 0;
    });
    cfg.base.cob[''] = cfg.colCob[''] ? (Number(fila[cfg.colCob[''] - 1]) || 0) : 0;
  }
  return (_LUG_CFG_ = cfg);
}

function _lugarDeMov_(metodo, lugarCol, fecha) {
  if (String(metodo || '').trim() !== 'Efectivo') return '';
  var l = String(lugarCol || '').trim();
  if (l) return l;
  try {
    var d = _lugaresCfg_().desde;
    var f = (fecha instanceof Date) ? fecha : null;
    return (d && f && f.getTime() >= d.getTime()) ? 'cf' : '';
  } catch (e) { return ''; }
}

function _traspasosLibroSeguro_() {
  try { return _traspasosLibro_(); } catch (e) { return []; }
}

function _traspasosLibro_() {
  var sh = SS.getSheetByName('Movimientos Plata');
  if (!sh || sh.getLastRow() < 2) return [];
  var d = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  var out = [];
  for (var i = 0; i < d.length; i++) {
    var f = (d[i][0] instanceof Date) ? d[i][0] : null;
    var m = Number(d[i][3]) || 0;
    if (!f || !m) continue;
    out.push({ tipo: 'traspaso', ts: f.getTime(),
               f: Utilities.formatDate(f, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm'),
               desde: String(d[i][1] || '').trim(), hacia: String(d[i][2] || '').trim(),
               $: m, q: String(d[i][4] || '').trim(), not: String(d[i][5] || '').trim() });
  }
  return out;
}

var LUGARES_PG_CACHE_ = 'lugares_pg_v1';

function _lugaresPgModo_() {
  var m = String(_cfgTexto_('LUGARES_PG', 'no') || '').trim().toLowerCase();
  return (m === 'medir' || m === 'si' || m === 'sí') ? 'medir' : 'no';
}

function _lugaresPgPaquete_(cfg, corte, lugIn, movs, res) {
  var iso = function (ts) { return ts ? new Date(ts).toISOString() : null; };
  var n = function (x) { return Math.round((Number(x) || 0) * 100) / 100; };
  var ent = [], vistas = {};
  /* LA CLAVE ESTABLE (19/10/2026): la misma entrada tiene la misma clave en cada
     paquete, para que la base pueda escribir un traspaso ANTES que la planilla
     (LUGARES_PG = si) y el paquete lo confirme en vez de duplicarlo. Si dos
     entradas dieran la misma clave (un cobro partido en dos filas), la segunda
     lleva #2. */
  var clave = function (k) { vistas[k] = (vistas[k] || 0) + 1; return vistas[k] > 1 ? k + '#' + vistas[k] : k; };
  (lugIn.cobEf || []).forEach(function (c, i) {
    ent.push({ k: clave('cobro|' + (c.h ? c.h + '|' + c.id + '|' + (c.ts || 0) : 'n' + i)), kind: 'cobro', place: 'cob:' + String(c.q || '').trim(), amount: n(c.m), at: iso(c.ts),
               ref: (c.h ? c.h + ' #' + c.id : ''), by: String(c.q || '').trim(), note: String(c.c || '') });
  });
  (lugIn.vueltos || []).forEach(function (v, i) {
    ent.push({ k: clave('vuelto|' + (v.h ? v.h + '|' + v.id + '|' + (v.ts || 0) : 'n' + i)), kind: 'vuelto', place: '', amount: n(v.m), at: iso(v.ts),
               ref: (v.h ? v.h + ' #' + v.id : ''), by: String(v.q || '').trim(), note: String(v.c || '') });
  });
  (lugIn.ing || []).forEach(function (x, i) {
    ent.push({ k: clave('ingreso|' + (x.fila ? 'Ingresos fila ' + x.fila : 'n' + i)), kind: 'ingreso', place: String(x.lugar || ''), amount: n(x.m), at: iso(x.ts), ref: '', by: '', note: String(x.con || '') });
  });
  (lugIn.gas || []).forEach(function (x, i) {
    ent.push({ k: clave('gasto|' + (x.fila ? 'Egresos fila ' + x.fila : 'n' + i)), kind: 'gasto', place: String(x.lugar || ''), amount: n(x.m), at: iso(x.ts), ref: '', by: '', note: String(x.con || '') });
  });
  (movs || []).forEach(function (mv) {
    ent.push({ k: clave(_lugarTraspasoClave_(mv.op, mv.fila)), kind: 'traspaso', place: String(mv.desde || ''), place_to: String(mv.hacia || ''), amount: n(mv.m),
               at: iso(mv.ts), ref: 'Movimientos Plata fila ' + mv.fila, by: String(mv.q || ''), note: String(mv.nota || ''), cobros: String(mv.cobros || '') });
  });
  return {
    corte_at: corte instanceof Date ? corte.toISOString() : null,
    personas: (cfg.personas || []).slice(),
    conteo: { ef: n(cfg.base.ef), bil: cfg.base.bil, cob: cfg.base.cob },
    entries: ent,
    reservas: (res.reservas || []).map(function (r) { return { id: String(r.id || ''), prov: String(r.prov || ''), monto: n(r.monto) }; }),
    erp: { bil: res.bil, cob: res.cob, cf: n(res.cf), reservado: n(res.reservado), total: n(res.total) }
  };
}

function _lugarTraspasoClave_(op, fila) {
  op = String(op || '').trim();
  return op ? 'traspaso|op:' + op : 'traspaso|fila:' + fila;
}

function _lugaresPgGuardar_(cfg, corte, lugIn, movs, res) {
  if (_lugaresPgModo_() === 'no' || !res || !res.activo) return;
  var txt = JSON.stringify(_lugaresPgPaquete_(cfg, corte, lugIn, movs, res));
  if (txt.length < 95000) CacheService.getScriptCache().put(LUGARES_PG_CACHE_, txt, 21600);
  else _pgAnotarError_('LUGARES', new Error('el paquete pesa ' + txt.length + ' (tope del cache 100 KB)'));
}

function _lugaresCalcular_(e) {
  var P = e.personas || [], base = e.base || {};
  var num = function (x) { return Number(x) || 0; };
  var bil = {}, cob = { '': num((base.cob || {})['']) }, cf = num(base.ef);
  P.forEach(function (p) {
    bil[p] = num((base.bil || {})[p]);
    cob[p] = num((base.cob || {})[p]);
    cf -= bil[p] + cob[p];
  });
  cf -= cob[''];
  /* Lo que no es de una persona con billetera, o no dice lugar, va a la caja
     fuerte: es lo de antes, y asi ningun peso queda afuera de la suma. Una
     reserva es caja fuerte con nombre. */
  function sumar(lugar, m) {
    var x = /^(bil|cob):(.*)$/.exec(String(lugar || ''));
    if (x && x[1] === 'bil' && P.indexOf(x[2]) >= 0) bil[x[2]] += m;
    else if (x && x[1] === 'cob' && (x[2] === '' || P.indexOf(x[2]) >= 0)) cob[x[2]] += m;
    else cf += m;
  }
  (e.cobEf || []).forEach(function (c) {
    var q = String(c.q || '').trim();
    sumar('cob:' + (P.indexOf(q) >= 0 ? q : ''), num(c.m));
  });
  /* El vuelto de la billetera no cambia el total: el billete del cliente entra
     entero a lo cobrado y el vuelto sale de la billetera. Si quien lo dio no
     tiene billetera, las dos patas son de nadie y se cancelan. */
  (e.vueltos || []).forEach(function (v) {
    var q = String(v.q || '').trim();
    if (P.indexOf(q) < 0) return;
    bil[q] -= num(v.m);
    cob[q] += num(v.m);
  });
  (e.ing || []).forEach(function (i) { sumar(i.lugar, num(i.m)); });
  (e.gas || []).forEach(function (g) { sumar(g.lugar, -num(g.m)); });
  (e.movs || []).forEach(function (mv) { sumar(mv.desde, -num(mv.m)); sumar(mv.hacia, num(mv.m)); });
  var reservas = (e.reservas || []).filter(function (r) { return num(r.monto) > 0; });
  var reservado = reservas.reduce(function (a, r) { return a + num(r.monto); }, 0);
  var total = cf + cob[''];
  P.forEach(function (p) { total += bil[p] + cob[p]; });
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  return {
    activo: true, personas: P.slice(), bil: bil, cob: cob, cf: r2(cf),
    reservas: reservas, reservado: r2(reservado), cfLibre: r2(cf - reservado),
    total: r2(total), efVivo: r2(num(e.efVivo)), descuadre: r2(num(e.efVivo) - total)
  };
}

function _lugaresDetalle_(e) {
  var P = e.personas || [], base = e.base || {};
  var num = function (x) { return Number(x) || 0; };
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  var det = {};
  var de = function (k) { return det[k] || (det[k] = { filas: [] }); };
  var persona = function (q) { q = String(q || '').trim(); return P.indexOf(q) >= 0 ? q : ''; };
  /* La misma regla que `sumar` de _lugaresCalcular_: cob: de una persona con
     billetera, o cob: a secas. Cualquier otra cosa no es lo sin guardar. */
  var cobDe = function (lugar) {
    var x = /^cob:(.*)$/.exec(String(lugar || ''));
    return (x && (x[1] === '' || P.indexOf(x[1]) >= 0)) ? x[1] : null;
  };
  [''].concat(P).forEach(function (k) {
    var b = num((base.cob || {})[k]);
    if (b) de(k).filas.push({ t: 'base', ts: num(e.baseTs), m: b });
  });
  var porPedido = {};
  (e.cobEf || []).forEach(function (c) {
    if (!(num(c.m) > 0)) return;
    var k = persona(c.q);
    var f = { t: 'cobro', ts: num(c.ts), m: num(c.m), h: String(c.h || ''), id: String(c.id || ''), c: String(c.c || '') };
    if (num(c.mp) > 0) { f.mp = num(c.mp); f.cta = String(c.cta || ''); }
    f.k = f.h + '|' + f.id + '|' + f.ts;
    de(k).filas.push(f);
    var kp = k + '#' + f.h + '|' + f.id;
    if (f.h && f.id && !porPedido[kp]) porPedido[kp] = f;
  });
  /* El vuelto que salio de la billetera: el billete del cliente entro ENTERO a
     lo sin guardar. Si esta el cobro de ese pedido se le suma a su fila (`vu`);
     si no (se cobro antes del ultimo conteo), va como fila propia. */
  (e.vueltos || []).forEach(function (v) {
    var q = String(v.q || '').trim();
    if (P.indexOf(q) < 0 || !num(v.m)) return;
    var f = porPedido[q + '#' + String(v.h || '') + '|' + String(v.id || '')];
    if (f) { f.m += num(v.m); f.vu = (f.vu || 0) + num(v.m); }
    else de(q).filas.push({ t: 'vuelto', ts: num(v.ts), m: num(v.m), h: String(v.h || ''), id: String(v.id || ''), c: String(v.c || '') });
  });
  (e.ing || []).forEach(function (i) {
    var k = cobDe(i.lugar);
    if (k !== null && num(i.m)) de(k).filas.push({ t: 'ing', ts: num(i.ts), m: num(i.m), c: String(i.con || '') });
  });
  (e.gas || []).forEach(function (g) {
    var k = cobDe(g.lugar);
    if (k !== null && num(g.m)) de(k).filas.push({ t: 'gas', ts: num(g.ts), m: -num(g.m), c: String(g.con || '') });
  });
  (e.movs || []).forEach(function (mv) {
    var m = num(mv.m);
    if (!m) return;
    var d = cobDe(mv.desde), h = cobDe(mv.hacia);
    var q = String(mv.q || '').trim(), nota = String(mv.nota || '').trim();
    if (d !== null) {
      var fs = { t: 'sale', ts: num(mv.ts), m: -m, a: String(mv.hacia || ''), q: q };
      if (nota) fs.nota = nota;
      if (mv.cobros) fs.cobros = String(mv.cobros).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      de(d).filas.push(fs);
    }
    if (h !== null) {
      var fe = { t: 'entra', ts: num(mv.ts), m: m, de: String(mv.desde || ''), q: q };
      if (nota) fe.nota = nota;
      de(h).filas.push(fe);
    }
  });
  Object.keys(det).forEach(function (k) {
    var d = det[k], F = d.filas;
    F.sort(function (a, b) { return a.ts - b.ts; });
    var suma = 0;
    F.forEach(function (f) { suma += f.m; if (f.m > 0) f.queda = f.m; });
    var gastar = function (f, falta) {
      var x = Math.min(f.queda, falta);
      f.queda = r2(f.queda - x);
      return falta - x;
    };
    F.forEach(function (s) {
      if (!(s.m < 0)) return;
      var falta = -s.m;
      (s.cobros || []).forEach(function (kk) {
        F.forEach(function (f) { if (falta > 0 && f.queda > 0 && f.k === kk) falta = gastar(f, falta); });
      });
      F.forEach(function (f) { if (falta > 0 && f.queda > 0 && f.ts <= s.ts) falta = gastar(f, falta); });
      F.forEach(function (f) { if (falta > 0 && f.queda > 0) falta = gastar(f, falta); });
      delete s.cobros;
    });
    d.suma = r2(suma);
    d.desde = 0;
    F.forEach(function (f) { if (f.queda > 0.5 && (!d.desde || f.ts < d.desde)) d.desde = f.ts; });
  });
  return det;
}

function _reservasActivas_() {
  var sh = SS.getSheetByName('Sobres');
  if (!sh || sh.getLastRow() < 2) return [];
  var d = sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(8, sh.getMaxColumns())).getValues();
  var out = [];
  for (var i = 0; i < d.length; i++) {
    if (String(d[i][3] || '').trim() !== 'Activo') continue;
    var monto = Number(d[i][2]) || 0;
    if (monto <= 0) continue;
    out.push({ id: String(d[i][6] || '').trim(), prov: String(d[i][1] || '').trim(), monto: monto });
  }
  return out;
}

function _movPlataUltimos_(n) {
  var sh = SS.getSheetByName('Movimientos Plata');
  if (!sh || sh.getLastRow() < 2) return [];
  var desde = Math.max(2, sh.getLastRow() - (n || 20) + 1);
  var d = sh.getRange(desde, 1, sh.getLastRow() - desde + 1, 6).getValues();
  return d.reverse().map(function (r) {
    /* La fecha la escribe moverPlata, siempre un Date. `_parseDateAny` vive
       ADENTRO de _doGetAdmin: llamarla desde aca tiraba ReferenceError. */
    var f = (r[0] instanceof Date) ? r[0] : null;
    return { f: f ? Utilities.formatDate(f, 'America/Argentina/Buenos_Aires', 'dd/MM HH:mm') : String(r[0] || ''),
             desde: String(r[1] || ''), hacia: String(r[2] || ''), $: Number(r[3]) || 0,
             q: String(r[4] || ''), nota: String(r[5] || '') };
  });
}

function _ventasHojasManuales_() {
  var res = [];
  [
    { canal: 'B2B', cli: ['Persona-Empresa', 5], costo: ['Costo', 27], ef: ['Efectivo', 9], tr: ['Mercado Pago Tadeo Ustariz', 10], zona: null },
    { canal: 'Catering', cli: ['Persona', 5], costo: ['Costos Totales', 17], ef: ['Efectivo', 10], tr: ['Mercado Pago Tadeo Ustariz', 11], zona: 7 }
  ].forEach(function (cfg) {
    var sh = SS.getSheetByName(cfg.canal);
    if (!sh || sh.getLastRow() <= 1) return;
    var d = sh.getDataRange().getValues();
    var cab = d[0].map(function (x) { return String(x || '').replace(/\s+/g, ' ').trim(); });
    function col(par) { var i = cab.indexOf(par[0]); return i >= 0 ? i : par[1]; }
    var iCli = col(cfg.cli), iF = col(['Fecha', 1]), iMes = col(['Mes', 2]), iSem = col(['Semana', 3]),
        iFac = col(['Facturado', 8]), iCo = col(cfg.costo), iMg = col(['Margen Bruto', -1]),
        iEf = col(cfg.ef), iTr = col(cfg.tr);
    for (var r = 1; r < d.length; r++) {
      var cli = String(d[r][iCli] || '').trim();
      if (!cli) continue;
      var fac = Number(d[r][iFac]) || 0;
      if (fac === 0) continue;
      var costo = Number(d[r][iCo]) || 0;
      res.push({
        canal: cfg.canal, fila: r + 1, cliente: cli, fecha: d[r][iF],
        mes: String(d[r][iMes] || '').trim(), sem: Number(d[r][iSem]) || 0,
        fac: fac, costo: costo, margen: iMg >= 0 ? (Number(d[r][iMg]) || (fac - costo)) : (fac - costo),
        ef: Number(d[r][iEf]) || 0, tr: Number(d[r][iTr]) || 0,
        zona: cfg.zona !== null ? String(d[r][cfg.zona] || '').trim() : ''
      });
    }
  });
  return res;
}

function _ventasExtraPanel_() {
  /* En el lote de planMes (Lectura arma 4 meses seguidos) se leia B2B y Catering
     una vez por mes: dentro del lote se calcula una vez. Nadie modifica la lista
     que devuelve (verificado: el unico que la usa en el lote solo la recorre). */
  if (_PLAN_LOTE_ && _PLAN_LOTE_.__extra) return _PLAN_LOTE_.__extra;
  var out = [];
  try {
    _ventasHojasManuales_().forEach(function (x) {
      var f = x.fecha, dt = null;
      if (f instanceof Date) dt = f;
      else { var m = String(f || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); }
      if (!dt) return;
      out.push({ h: x.canal, c: x.cliente, fx: _fmtAR_(dt, 'yyyy-MM-dd'), $: x.fac, co: x.costo });
    });
  } catch (e) { return []; }
  if (_PLAN_LOTE_) _PLAN_LOTE_.__extra = out;
  return out;
}

function _crmNormTel(tel) {
  if (!tel) return '';
  var s = String(tel).replace(/\D/g, '');
  if (!s) return '';
  // Sacar prefijos comunes en Argentina
  if (s.length > 10 && s.indexOf('549') === 0) s = s.substring(3);
  else if (s.length > 10 && s.indexOf('54') === 0) s = s.substring(2);
  if (s.length > 10 && s.charAt(0) === '9') s = s.substring(1);
  if (s.length > 10 && s.charAt(0) === '0') s = s.substring(1);
  if (s.length > 10 && s.substring(0, 2) === '15') s = s.substring(2);
  // Tomar últimos 10
  if (s.length > 10) s = s.substring(s.length - 10);
  if (s.length < 8) return '';
  return s;
}

function _crmNormNombre(nombre) {
  if (!nombre) return '';
  var s = String(nombre).toLowerCase();
  if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

function _crmToDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function _crmGetMergeMap() {
  var sh = SS.getSheetByName('Clientes Merge');
  if (!sh) {
    sh = SS.insertSheet('Clientes Merge');
    sh.getRange(1, 1, 1, 3).setValues([['Alias Key', 'Canonical Key', 'Updated']])
      .setFontWeight('bold').setBackground('#331C1C').setFontColor('#F2E8C7');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, 3, 200);
    return {};
  }
  if (sh.getLastRow() <= 1) return {};
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  var map = {};
  for (var r = 0; r < data.length; r++) {
    var a = String(data[r][0] || '').trim();
    var b = String(data[r][1] || '').trim();
    if (a && b && a !== b) map[a] = b;
  }
  return map;
}

var SEMANAS_SALUD = 14;

function _calSemanasMes_(y, m0) {
  var out = [], d = new Date(y, m0, 1), fin = new Date(y, m0 + 1, 0);
  while (d <= fin) {
    var h = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - d.getDay()) % 7);
    if (h > fin) h = fin;
    var n = out.length + 1;
    out.push({ y: y, m0: m0, n: n, k: y + '-' + ('0' + (m0 + 1)).slice(-2) + '-' + n,
               desde: d, hasta: h, dias: Math.round((h - d) / 86400000) + 1 });
    d = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1);
  }
  return out;
}

function _calSemanaDe_(f) {
  var d = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  var ss = _calSemanasMes_(d.getFullYear(), d.getMonth());
  for (var i = 0; i < ss.length; i++) if (d <= ss[i].hasta) return ss[i];
  return null;
}

function _semanaIsoDe_(d) {
  var u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  var dn = u.getUTCDay() || 7;
  var lunes = new Date(u.getTime() - (dn - 1) * 86400000);
  var jue = new Date(u.getTime() + (4 - dn) * 86400000);
  var y = jue.getUTCFullYear();
  var w = Math.ceil((((jue - new Date(Date.UTC(y, 0, 1))) / 86400000) + 1) / 7);
  return { y: y, w: w, idx: Math.round((lunes.getTime() - Date.UTC(2020, 0, 6)) / (7 * 86400000)) };
}

var MESES_SALUD = 6;

function _saludClientes_(argNow) {
  var ahora = argNow || new Date();
  var sem = {}, mes = {}, semM = {};
  var hoy = _semanaIsoDe_(ahora);
  var mergeMap = _crmGetMergeMap();
  function resolve(key) {
    var k = key, seen = {}, depth = 10;
    while (mergeMap[k] && !seen[k] && depth-- > 0) { seen[k] = true; k = mergeMap[k]; }
    return k;
  }
  var entregasDe = {};  // cliente -> { aaaammdd: {idx, ym} }
  var claveDe = {};     // idx -> "aaaa-ss"
  /* La semana de Maleu (6/10/2026) se indexa por el dia en que ARRANCA, contado
     desde 1970: crece igual que `idx` y no choca entre meses. */
  var claveDeM = {};    // midx -> "aaaa-mm-n"
  [['Home', 49, 46], ['Pilar', 52, 49]].forEach(function (cfg) {
    var sh = SS.getSheetByName(cfg[0]);
    if (!sh || sh.getLastRow() <= 1) return;
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(cfg[1], cfg[2]) + 1).getValues();
    for (var r = 0; r < data.length; r++) {
      if (String(data[r][10] || '').trim() !== 'Entregado') continue;
      var nombre = String(data[r][7] || '').trim();
      if (!nombre) continue;
      var d = _crmToDate(data[r][cfg[1]]) || _crmToDate(data[r][3]);
      if (!d || d.getFullYear() < 2000 || d.getFullYear() > 2100) continue;
      var tel = _crmNormTel(data[r][cfg[2]]);
      var k = resolve(tel || ('NOMBRE:' + _crmNormNombre(nombre)));
      var s = _semanaIsoDe_(d);
      var sM = _calSemanaDe_(d);
      var midx = Math.round(Date.UTC(sM.desde.getFullYear(), sM.desde.getMonth(), sM.desde.getDate()) / 86400000);
      claveDeM[midx] = sM.k;
      var dia = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      var reg = (entregasDe[k] = entregasDe[k] || {});
      var eDia = reg[dia] || (reg[dia] = { idx: s.idx, t: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), ym: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2), c: nombre, r: [] });
      eDia.r.push(cfg[0] + '|' + String(data[r][1] || '').trim());
      eDia.midx = midx;
      claveDe[s.idx] = s.y + '-' + s.w;
    }
  });
  for (var i = 0; i < SEMANAS_SALUD; i++) {
    var idx = hoy.idx - i;
    var lun = new Date(Date.UTC(2020, 0, 6) + idx * 7 * 86400000);
    var sw = _semanaIsoDe_(new Date(lun.getUTCFullYear(), lun.getUTCMonth(), lun.getUTCDate()));
    sem[sw.y + '-' + sw.w] = { total: 0, nuevos: 0, recompra: 0, react: 0, nuevosL: [], reactL: [] };
  }
  var sMh = _calSemanaDe_(ahora);
  for (var iM = 0; iM < SEMANAS_SALUD && sMh; iM++) {
    semM[sMh.k] = { total: 0, nuevos: 0, recompra: 0, react: 0, nuevosL: [], reactL: [] };
    sMh = _calSemanaDe_(new Date(sMh.desde.getFullYear(), sMh.desde.getMonth(), sMh.desde.getDate() - 1));
  }
  for (var m = 0; m < MESES_SALUD; m++) {
    var pm = new Date(ahora.getFullYear(), ahora.getMonth() - m, 1);
    mes[pm.getFullYear() + '-' + ('0' + (pm.getMonth() + 1)).slice(-2)] = { total: 0, nuevos: 0, recompra: 0, react: 0 };
  }
  function asc(a, b) { return a - b; }
  function diasEntre(a, b) { return Math.round((a.t - b.t) / 86400000); }
  Object.keys(entregasDe).forEach(function (k) {
    var dias = Object.keys(entregasDe[k]).map(Number).sort(asc);
    /* De cada semana: su primera entrega y la ultima de ANTES de esa semana. El
       hueco entre las dos es lo que decide recompra o reactivado. */
    var idxs = [], primeraQ = {};
    dias.forEach(function (x, q) { var ix = entregasDe[k][x].idx; if (primeraQ[ix] === undefined) { primeraQ[ix] = q; idxs.push(ix); } });
    for (var j = 0; j < idxs.length; j++) {
      var o = sem[claveDe[idxs[j]]];
      if (!o) continue;
      o.total++;
      var qj = primeraQ[idxs[j]];
      var hueco = qj > 0 ? diasEntre(entregasDe[k][dias[qj]], entregasDe[k][dias[qj - 1]]) : 0;
      if (j === 0) {
        o.nuevos++;
        /* QUIENES son (14/9/2026, para el PDF de la semana): el nombre de su primera
           entrega y las referencias "Hoja|N°" de todo lo que se le entrego esa
           semana. El panel cruza por la referencia, no por el nombre.
           `luego`: en cuantas semanas posteriores volvio a recibir algo. */
        o.nuevosL.push(_saludQuien_(entregasDe[k], dias, idxs[j], { luego: idxs.length - 1 - j }));
      }
      else if (hueco <= CLI_DORMIDO_DIAS) o.recompra++;
      else {
        o.react++;
        /* Los que volvieron: `dias` sin recibir nada (mas de 60) y `sem`, las mismas en
           semanas corridas (lo que leia el panel antes del 14/9/2026). */
        o.reactL.push(_saludQuien_(entregasDe[k], dias, idxs[j], { dias: hueco, sem: idxs[j] - idxs[j - 1], luego: idxs.length - 1 - j }));
      }
    }
    /* Lo mismo por semana de Maleu (6/10/2026): misma regla, otra particion. Una
       semana corta es una semana: el que compro el 30/9 y el 2/10 cuenta en la
       sem 5 de septiembre Y en la sem 1 de octubre. */
    var midxs = [], primeraM = {};
    dias.forEach(function (x, q) { var ix = entregasDe[k][x].midx; if (primeraM[ix] === undefined) { primeraM[ix] = q; midxs.push(ix); } });
    for (var jm = 0; jm < midxs.length; jm++) {
      var oM = semM[claveDeM[midxs[jm]]];
      if (!oM) continue;
      oM.total++;
      var qm = primeraM[midxs[jm]];
      var huecoM = qm > 0 ? diasEntre(entregasDe[k][dias[qm]], entregasDe[k][dias[qm - 1]]) : 0;
      var quienM = function (extra) {
        var nom = '', refs = [];
        dias.forEach(function (x) { var en = entregasDe[k][x]; if (en.midx !== midxs[jm]) return; if (!nom) nom = en.c; refs = refs.concat(en.r); });
        var out = { c: nom, r: refs };
        Object.keys(extra).forEach(function (kx) { out[kx] = extra[kx]; });
        return out;
      };
      if (jm === 0) { oM.nuevos++; oM.nuevosL.push(quienM({ luego: midxs.length - 1 - jm })); }
      else if (huecoM <= CLI_DORMIDO_DIAS) oM.recompra++;
      else { oM.react++; oM.reactL.push(quienM({ dias: huecoM, luego: midxs.length - 1 - jm })); }
    }
    var yaMes = {};
    for (var q = 0; q < dias.length; q++) {
      var e = entregasDe[k][dias[q]];
      if (yaMes[e.ym]) continue;
      yaMes[e.ym] = true;
      var om = mes[e.ym];
      if (!om) continue;
      om.total++;
      if (q === 0) om.nuevos++;
      else if (diasEntre(e, entregasDe[k][dias[q - 1]]) <= CLI_DORMIDO_DIAS) om.recompra++;
      else om.react++;
    }
  });
  return { sem: sem, mes: mes, semM: semM };
}

function _saludQuien_(reg, dias, idx, extra) {
  var nom = '', refs = [];
  dias.forEach(function (x) {
    var en = reg[x];
    if (en.idx !== idx) return;
    if (!nom) nom = en.c;
    refs = refs.concat(en.r);
  });
  var out = { c: nom, r: refs };
  Object.keys(extra || {}).forEach(function (kx) { out[kx] = extra[kx]; });
  return out;
}

var _FMT_AR_OK_ = null, _CRM_VIEJO_ = false;

function _fmtAR_(d, fmt) {
  if (_FMT_AR_OK_ === null) {
    /* Dos horas, una a cada lado de la medianoche: con una sola, una zona al
       este (UTC) da el mismo dia a las 23:30 y una al oeste a las 00:30. */
    _FMT_AR_OK_ = [new Date(2026, 0, 5, 0, 30), new Date(2026, 0, 5, 23, 30)].every(function (x) {
      return _fmtDmyLocal_(x) === Utilities.formatDate(x, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
    }) && [new Date(1899, 11, 30, 19, 5), new Date(2026, 0, 5, 23, 30)].every(function (x) {
      /* Las celdas que son solo HORA llegan como fechas de 1899, cuando Argentina
         tenia otra hora oficial (LMT, -4:16:48). Si JS y el servicio no la
         resuelven igual, se usa el servicio para todo (8/10/2026, ventas). */
      return _dos_(x.getHours()) + ':' + _dos_(x.getMinutes()) === Utilities.formatDate(x, 'America/Argentina/Buenos_Aires', 'HH:mm');
    });
  }
  if (_CRM_VIEJO_ || !_FMT_AR_OK_ || isNaN(d.getTime()) ||
      (fmt !== 'dd/MM/yyyy' && fmt !== 'dd/MM/yyyy HH:mm' && fmt !== 'yyyy-MM-dd' && fmt !== 'HH:mm' &&
       fmt !== 'yyyy-MM-dd HH:mm' && fmt !== 'yyyy-MM')) {
    return Utilities.formatDate(d, 'America/Argentina/Buenos_Aires', fmt);
  }
  if (fmt === 'yyyy-MM') return d.getFullYear() + '-' + _dos_(d.getMonth() + 1);
  if (fmt === 'yyyy-MM-dd' || fmt === 'yyyy-MM-dd HH:mm') {
    var iso = d.getFullYear() + '-' + _dos_(d.getMonth() + 1) + '-' + _dos_(d.getDate());
    return fmt === 'yyyy-MM-dd' ? iso : iso + ' ' + _dos_(d.getHours()) + ':' + _dos_(d.getMinutes());
  }
  if (fmt === 'HH:mm') return _dos_(d.getHours()) + ':' + _dos_(d.getMinutes());
  var t = _fmtDmyLocal_(d);
  return fmt === 'dd/MM/yyyy HH:mm' ? t + ' ' + _dos_(d.getHours()) + ':' + _dos_(d.getMinutes()) : t;
}

function _dos_(n) { return (n < 10 ? '0' : '') + n; }
function _fmtDmyLocal_(d) {
  var dd = d.getDate(), mm = d.getMonth() + 1;
  return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + d.getFullYear();
}

function _fmtDmyLocal_(d) {
  var dd = d.getDate(), mm = d.getMonth() + 1;
  return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + d.getFullYear();
}

var GRUPAL_COL_ = 'Grupal';

function _proveedoresNombres_() {
  var out = [];
  var h = SS.getSheetByName('Proveedores');
  if (!h || h.getLastRow() <= 1) return out;
  var d = h.getDataRange().getValues();
  var seen = {}, ultimo = '';
  for (var i = 1; i < d.length; i++) {
    var nm = String(d[i][2] || '').trim();
    if (nm) ultimo = nm;
    if (ultimo && !seen[ultimo]) { seen[ultimo] = true; out.push(ultimo); }
  }
  return out;
}

function _vendedoresRedArr_() {
  // ── Vendedores Red: deuda pendiente a Maleu ──
  // Lee la hoja Red. Por cada pedido NO pagado a Maleu, acumula
  // deuda = Total × (1 - comision/100) según la comisión del vendedor.
  var vendedoresDeuda = {};
  var comisionPorVendedor = {};
  var waPorVendedor = {};
  var shVend = SS.getSheetByName('Vendedores');
  if (shVend && shVend.getLastRow() > 1) {
    var dV = shVend.getDataRange().getValues();
    for (var rv = 1; rv < dV.length; rv++) {
      var nombreV = String(dV[rv][0] || '').trim();
      if (!nombreV) continue;
      var waV = String(dV[rv][1] || '').trim();
      var comV = Number(dV[rv][9]) || 17;
      var estadoV = String(dV[rv][6] || '').trim();
      comisionPorVendedor[nombreV] = comV;
      waPorVendedor[nombreV] = waV;
      if (estadoV === 'Activo') {
        vendedoresDeuda[nombreV] = { nombre: nombreV, wa: waV, com: comV, estado: estadoV, deuda: 0, pedidos: [], deudaPorSemana: {}, liquidaciones: [] };
      }
    }
  }

  function _procesarRedPedidos(sh, origen) {
    if (!sh || sh.getLastRow() <= 1) return;
    var d = sh.getDataRange().getValues();
    var headersR = d[0];
    // Buscar índices por header (para ser robusto)
    var idxVendedor = -1, idxPedido = -1, idxFecha = -1, idxCliente = -1, idxTotal = -1;
    var idxEstadoPagoMaleu = -1, idxFechaPagoMaleu = -1, idxFormaPagoMaleu = -1;
    var idxSemana = -1, idxAnio = -1, idxAPagar = -1;
    for (var hx = 0; hx < headersR.length; hx++) {
      var nm = String(headersR[hx]).trim();
      if (nm === 'Vendedor') idxVendedor = hx;
      else if (nm === 'N° Pedido' || nm === 'N°') idxPedido = hx;
      else if (nm === 'Fecha') idxFecha = hx;
      else if (nm === 'Cliente') idxCliente = hx;
      else if (nm === 'Total ($)' || nm === 'Total') idxTotal = hx;
      else if (nm === 'Estado Pago a Maleu') idxEstadoPagoMaleu = hx;
      else if (nm === 'Fecha Pago a Maleu') idxFechaPagoMaleu = hx;
      else if (nm === 'Forma Pago a Maleu') idxFormaPagoMaleu = hx;
      else if (nm === 'Semana') idxSemana = hx;
      else if (nm === 'Año' || nm === 'Anio') idxAnio = hx;
      else if (nm === 'A Pagar') idxAPagar = hx;
    }
    if (idxVendedor < 0 || idxTotal < 0 || idxEstadoPagoMaleu < 0) return;

    for (var ri = 1; ri < d.length; ri++) {
      var row = d[ri];
      var vend = String(row[idxVendedor] || '').trim();
      if (!vend) continue;
      var estPagoM = String(row[idxEstadoPagoMaleu] || '').trim();
      if (estPagoM === 'Sí' || estPagoM === 'Si' || estPagoM === 'Pagado') continue;
      var totP = Number(row[idxTotal]) || 0;
      if (totP <= 0) continue;
      var comPct = comisionPorVendedor[vend] !== undefined ? comisionPorVendedor[vend] : 17;
      // Preferir "A Pagar" real por pedido — respeta comisiones por fila (caso
      // R-45/R-46 con comisión 0 a familia del vendedor). Fallback al cálculo
      // plano si la columna no existe o está vacía.
      var aPagarP = idxAPagar >= 0 ? (Number(row[idxAPagar]) || 0) : 0;
      var deudaP = aPagarP > 0 ? aPagarP : totP * (1 - comPct/100);
      if (!vendedoresDeuda[vend]) {
        vendedoresDeuda[vend] = { nombre: vend, wa: waPorVendedor[vend] || '', com: comPct, estado: 'Inactivo', deuda: 0, pedidos: [], deudaPorSemana: {}, liquidaciones: [] };
      }
      if (!vendedoresDeuda[vend].deudaPorSemana) vendedoresDeuda[vend].deudaPorSemana = {};
      vendedoresDeuda[vend].deuda += deudaP;
      var fR = row[idxFecha];
      var fechaStrR = '';
      if (fR instanceof Date) fechaStrR = Utilities.formatDate(fR, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
      else fechaStrR = String(fR || '');
      // Atribuir deuda a la semana del pedido (entrega ≈ misma semana en Red)
      var semP = idxSemana >= 0 ? (Number(row[idxSemana]) || 0) : 0;
      var anioP = idxAnio >= 0 ? (Number(row[idxAnio]) || 0) : 0;
      if (semP > 0) {
        var keySem = anioP > 0 ? (anioP + '-' + semP) : String(semP);
        vendedoresDeuda[vend].deudaPorSemana[keySem] = (vendedoresDeuda[vend].deudaPorSemana[keySem] || 0) + deudaP;
      }
      vendedoresDeuda[vend].pedidos.push({
        n: String(row[idxPedido] || '').trim(),
        f: fechaStrR,
        c: String(row[idxCliente] || '').trim(),
        total: totP,
        deuda: deudaP,
        sem: semP,
        anio: anioP,
        origen: origen,
        row: ri + 1
      });
    }
  }
  _procesarRedPedidos(SS.getSheetByName('Red'), 'Red');

  // ── Liquidaciones de "Pagos Red Liq" por vendedor (para mostrar "te acaba de pagar" en Inicio) ──
  var shLiqAdm = SS.getSheetByName('Pagos Red Liq');
  if (shLiqAdm && shLiqAdm.getLastRow() > 1) {
    var dLA = shLiqAdm.getDataRange().getValues();
    // Layout: A=Timestamp, B=Fecha, C=Vendedor, D=Año, E=Semana, F=Efectivo, G=Transferencia, H=Total
    var ahoraMs = Date.now();
    for (var rLA = 1; rLA < dLA.length; rLA++) {
      var tsLA = dLA[rLA][0];
      if (!tsLA) continue;
      var vendLA = String(dLA[rLA][2] || '').trim();
      if (!vendLA) continue;
      if (!vendedoresDeuda[vendLA]) {
        var comLA = comisionPorVendedor[vendLA] !== undefined ? comisionPorVendedor[vendLA] : 17;
        vendedoresDeuda[vendLA] = { nombre: vendLA, wa: waPorVendedor[vendLA] || '', com: comLA, estado: 'Inactivo', deuda: 0, pedidos: [], deudaPorSemana: {}, liquidaciones: [] };
      }
      if (!vendedoresDeuda[vendLA].liquidaciones) vendedoresDeuda[vendLA].liquidaciones = [];
      var dtLA = (tsLA instanceof Date) ? tsLA : new Date(tsLA);
      var tsMsLA = isNaN(dtLA.getTime()) ? 0 : dtLA.getTime();
      var efLA = Number(dLA[rLA][5]) || 0;
      var mpLA = Number(dLA[rLA][6]) || 0;
      var totLA = Number(dLA[rLA][7]) || (efLA + mpLA);
      vendedoresDeuda[vendLA].liquidaciones.push({
        ts: tsMsLA,
        f: tsMsLA ? Utilities.formatDate(dtLA, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm') : String(tsLA || ''),
        anio: Number(dLA[rLA][3]) || 0,
        sem: Number(dLA[rLA][4]) || 0,
        ef: efLA,
        mp: mpLA,
        tot: totLA,
        reciente: tsMsLA > 0 && (ahoraMs - tsMsLA) < (48 * 3600 * 1000)
      });
    }
    // Ordenar liquidaciones por ts desc (más reciente arriba)
    Object.keys(vendedoresDeuda).forEach(function(k){
      var arr = vendedoresDeuda[k].liquidaciones;
      if (arr && arr.length > 1) arr.sort(function(a, b){ return (b.ts || 0) - (a.ts || 0); });
    });
  }

  var vendedoresArr = Object.keys(vendedoresDeuda).map(function(k) {
    return vendedoresDeuda[k];
  }).sort(function(a, b) { return b.deuda - a.deuda; });
  return vendedoresArr;
}

function _totalesDeCanales_(canales) {
  var t = { pedidos: 0, entregados: 0, pendientes: 0, cancelados: 0,
            reservados: 0, facturado: 0, cobrado: 0, noCobrado: 0, ticket: 0 };
  (canales || []).forEach(function (c) {
    t.pedidos += c.pedidos;
    t.entregados += c.entregados;
    t.pendientes += c.pendientes;
    t.cancelados += c.cancelados;
    t.reservados += c.reservados;
    t.facturado += c.facturado;
    t.cobrado += c.cobrado;
    t.noCobrado += c.noCobrado;
  });
  if (t.pedidos > 0) t.ticket = Math.round(t.facturado / t.pedidos);
  return t;
}

function _armarStock_() {
  var stock = [];
  var shProd = SS.getSheetByName('Productos');
  if (shProd && shProd.getLastRow() > 1) {
    var dataProd = shProd.getDataRange().getValues();
    // Buscar columnas por header
    var hdr = dataProd[0];
    var colNombre = -1, colAbbr = -1, colFisico = -1, colReservado = -1, colDisp = -1;
    var colIni = -1, colVen = -1, colComp = -1, colInv = -1;
    for (var h = 0; h < hdr.length; h++) {
      var hv = String(hdr[h]).replace(/\n/g,' ').trim().toLowerCase();
      if (hv === 'producto' || hv === 'nombre') colNombre = h;
      if (hv === 'abreviatura') colAbbr = h;
      if (hv === 'stock físico' || hv === 'stock fisico') colFisico = h;
      if (hv === 'reservado') colReservado = h;
      if (hv === 'stock disponible' || hv === 'disponible') colDisp = h;
      if (hv === 'stock inicial semana' || hv === 'inicial semana') colIni = h;
      if (hv === 'vendidos semana') colVen = h;
      if (hv === 'comprado semana') colComp = h;
      if (hv === 'invertido') colInv = h;
    }
    /* El reparto por deposito viaja en el MISMO volcado que el total (13/9/2026).
       Hasta hoy la card "Donde esta" de Stock > PRODUCTOS lo pedia aparte
       (`action=depositos`, una vez por sesion): despues de un ↻, o de una venta,
       la tabla mostraba el fisico nuevo y la card el reparto de la mañana. Dos
       fotos de distinta hora en la misma pantalla. Aca la fila ya esta abierta. */
    var stDeps = [];
    try { stDeps = _depositos_(); } catch (eDp) {}
    /* La columna de "Reservado <Deposito>" de cada uno, por encabezado y no por
       un numero fijo (30/9/2026). Si todavia no existe queda en 0 y el front
       cae a lo de siempre: un ERP que estrena esta version antes de que corran
       las formulas tiene que seguir mostrando algo, no un hueco. */
    var colResDe = {};
    for (var dr = 0; dr < stDeps.length; dr++) {
      var tit = ('reservado ' + String(stDeps[dr].nombre || stDeps[dr].id)
                  .replace(/^Dep[oó]sito\s+/i, '')).toLowerCase();
      for (var hh = 0; hh < hdr.length; hh++) {
        if (String(hdr[hh]).replace(/\n/g, ' ').trim().toLowerCase() === tit) {
          colResDe[stDeps[dr].id] = hh; break;
        }
      }
    }
    var stPz = { conPiezas: {}, recSem: {} };
    try { stPz = _stockPiezasSemana_(_piezasLeer_()); } catch (ePz) {}
    for (var rp = 1; rp < dataProd.length; rp++) {
      var nombre = colNombre >= 0 ? String(dataProd[rp][colNombre]).trim() : '';
      var abbr = colAbbr >= 0 ? String(dataProd[rp][colAbbr]).trim() : '';
      if (!nombre && !abbr) continue;
      var fisico = colFisico >= 0 ? (Number(dataProd[rp][colFisico]) || 0) : 0;
      var reservado = colReservado >= 0 ? (Number(dataProd[rp][colReservado]) || 0) : 0;
      var disponible = colDisp >= 0 ? (Number(dataProd[rp][colDisp]) || 0) : fisico - reservado;
      var inicialSem = colIni >= 0 ? (Number(dataProd[rp][colIni]) || 0) : 0;
      var vendidosSem = colVen >= 0 ? (Number(dataProd[rp][colVen]) || 0) : 0;
      var compradoSem = colComp >= 0 ? (Number(dataProd[rp][colComp]) || 0) : 0;
      // Precio y costo (cols I=8, J=9 0-based) — usados por el editor de pedidos para defaults
      var precio = _numCelda_(dataProd[rp][8] || '');
      var costoU = _numCelda_(dataProd[rp][9] || '');
      /* El valor del stock es FISICO x COSTO, calculado aca (13/9/2026). Hasta ese
         dia se leia la columna "Invertido" de la hoja, y habia dos problemas:
         · se le sacaban los PUNTOS al numero como si fuera texto "$1.234". La
           celda ya viene como numero, asi que los 7,318 kg de vacio a $18.200
           —$133.187,6— llegaban como $1.331.876: diez veces. Eran $1.198.688 que
           no existen en "Stock al costo" y en la Posicion Neta de Inicio.
         · la columna es DISPONIBLE x costo: deja afuera lo reservado, que sigue
           en el freezer y no figura ni en las ventas ni en "A cobrar" hasta que
           se entrega. La Posicion Neta lo perdia.
         Las cinco pantallas que suman `iv` quedan con esta misma definicion. */
      var invertido = Math.max(0, fisico) * costoU;
      /* `u` va aca adentro y no en un fetch aparte porque este bucle YA tiene la
         fila abierta. Es lo que le permite al panel saber que un producto se pesa
         en vez de contarse — el editor y la ficha del pedido leen de `D.stock`. */
      var porDepSt = {}, porDepRes = {}, porDepDisp = {};
      for (var ds = 0; ds < stDeps.length; ds++) {
        var _id = stDeps[ds].id;
        porDepSt[_id] = Number(dataProd[rp][stDeps[ds].col - 1]) || 0;
        /* El reservado DE ESE freezer, no el total. Antes el front restaba el
           reservado global de cada deposito: con 9 en Ustariz y 1 reservado en
           Moresco, Ustariz figuraba con 8 libres teniendo 9. */
        var _cr = colResDe[_id];
        porDepRes[_id] = (_cr !== undefined) ? (Number(dataProd[rp][_cr]) || 0) : 0;
        // Nunca negativo: si alguien reserva mas de lo que hay, lo que sobra es
        // un problema del pedido, no un disponible en menos que confunda dos veces.
        porDepDisp[_id] = Math.max(0, Math.round((porDepSt[_id] - porDepRes[_id]) * 1000) / 1000);
      }
      /* "Comprado Semana" (col N) cuenta OCs de reposicion de deposito, y la carne
         no entra por OC: entra en PIEZAS por RECIBIR CARNE. Asi la fila de la
         carne decia comprado 0 y la cuenta de la semana no cerraba — medido el
         13/9/2026: faltaban exactamente los 78,187 kg recibidos, corte por corte.
         Para un producto que se lleva por pieza, lo comprado son los kilos de las
         piezas recibidas en la semana del stock. La hoja no se toca: su Check (L)
         sigue siendo el de las OCs. */
      if (stPz.conPiezas[abbr]) compradoSem = stPz.recSem[abbr] || 0;
      stock.push({ n: nombre, a: abbr, f: fisico, r: reservado, d: disponible, p: precio, co: costoU, i: inicialSem, v: vendidosSem, c: compradoSem, iv: invertido, u: _uniValida_(dataProd[rp][16]),
                   pd: porDepSt, pr: porDepRes, pdd: porDepDisp,
                   pz: stPz.conPiezas[abbr] ? 1 : 0 });
    }
  }
  return stock;
}

function _stockDepsPanel_() {
  var o = [];
  try {
    var dd = _depositos_();
    // `user` viaja para que el front pueda arrancar en el freezer de quien esta
    // logueado. El resto de la fila (la col en Productos, el duenio) no sale:
    // no le sirve a ninguna pantalla y seria contarle al front como esta
    // armada la hoja.
    for (var k = 0; k < dd.length; k++)
      o.push({ id: dd[k].id, nombre: dd[k].nombre, user: dd[k].user || '' });
  } catch (e) {}
  return o;
}

function _stockCierreTs_() {
  try { return PropertiesService.getScriptProperties().getProperty('corrio_resetStockSemanal') || ''; }
  catch (e) { return ''; }
}

var _PLAN_LOTE_ = null;


/* Las hojas chicas sin `_cab`: su encabezado, en orden (Saldo Base lo trae en `_cab`). */
var _CAM_CAB_ = {
  'Cuentas': ['id', 'Nombre', 'Tipo', 'Col en Saldo Base', 'Activo', 'Alias', 'Banco'],
  'Config_Maleu': ['Parámetro', 'Valor', 'Activo desde', 'Notas'],
  'Redondeos Proveedores': ['ID', 'Registrado', 'Proveedor', 'Semana', 'Monto', 'Quién', 'Estado', 'Anulado el', 'Anulado por'],
  'Proveedores': ['N° de Productos', 'Producto', 'Proveedor', 'Gustos', 'Abreviatura', 'Info Relevante', 'Canal de Venta', 'Costo', 'Venta Directa', 'Clubes'],
  'Movimientos Plata': ['Fecha', 'Desde', 'Hacia', 'Monto', 'Quién', 'Nota', 'Op'],
  'Sobres': ['Fecha', 'Proveedor', 'Monto', 'Estado', 'Fecha Pago', 'Notas', 'Id', 'Usado']   /* Id y Usado: las reservas (211) */
};
function _camCargar_(d) {
  var H = {}, hj = d.hojas || {};
  Object.keys(hj).forEach(function (n) {
    var filas = hj[n] || [], cab = _CAM_CAB_[n] || ((filas[0] && filas[0].d && filas[0].d._cab) || []), out = [cab.slice()];
    filas.forEach(function (x) { _motPoner_(out, x.row, cab.map(function (k) { return _motCelda_(x.d[k]); })); });
    H[n] = new _Hoja(n, out);
  });
  var pv = [['Concepto', 'Categoría EERR', 'Monto Mensual', 'Activa desde', 'Activa hasta', 'Notas']];
  (d.prov || []).forEach(function (x) { _motPoner_(pv, x[0], [x[1], x[2], x[3] == null ? '' : Number(x[3]), x[4] || '', x[5] || '', x[6] || '']); });
  H.Provisiones_Fijas = new _Hoja('Provisiones_Fijas', pv);
  /* Tanda 2 (209). */
  var cb = [['Fecha', 'Hoja', 'Pedido', 'Cliente', 'Monto', 'Repartidor', 'Tipo']];
  (d.cambios || []).forEach(function (x) { _motPoner_(cb, x[0], [_motFecha_(x[1]) || '', x[2], x[3], x[4], Number(x[5]) || 0, x[6], x[7]]); });
  H['Cambios Billetera'] = new _Hoja('Cambios Billetera', cb);
  ['Home', 'Pilar', 'Clubes'].forEach(function (h) { H[h] = new _Hoja(h, [_camCabPed_(h)]); });
  (d.ids || []).forEach(function (x) { if (H[x[0]]) _motPoner_(H[x[0]].f, x[1], ['', x[2]]); });
  /* Tanda 3 (211). Los cobrados de Home, Pilar y Clubes, en las columnas que lee `_sumarCobrado`. */
  (d.cob || []).forEach(function (x) {
    var h = x[0], cab = H[h] && H[h].f[0], c = _CAM_PED_[h]; if (!c) return;
    var f = []; for (var i = 0; i < cab.length; i++) f.push('');
    var put = function (nom, v) { var i = cab.indexOf(nom); if (i >= 0) f[i] = v; };
    var fc = _motFecha_(x[8]), caja = _motFecha_(x[9]);
    f[1] = x[2]; f[3] = caja || ''; f[7] = x[3]; f[c.fp] = x[4]; f[c.ep] = 'Cobrado';
    f[c.ef] = Number(x[5]) || 0; f[c.tr] = Number(x[6]) || 0; f[c.fac] = Number(x[7]) || 0;
    /* La fecha de la caja es la de cobro, si no la de entrega, si no la del pedido: sin la de
       cobro, la que resolvio la base va en «Fecha Entrega». */
    put('Fecha de Cobro', fc || ''); put('Fecha Entrega', fc ? '' : (caja || ''));
    put('Teléfono', x[10]); put('Barrio', x[11]); put('Sub Barrio', x[12]); put('Domicilio - Lote', x[13]);
    put('Cuenta Cobro', x[14]); put('Cobró', x[15]); put('Repartidor', x[16]);
    put('Recibido Efectivo', Number(x[17]) || ''); put('Operación Cobro', x[18]); put('Pagó', x[19]);
    _motPoner_(H[h].f, x[1], f);
  });
  H['Cobros Parciales'] = new _Hoja('Cobros Parciales', [['Fecha/Hora', 'Hoja', 'N° Pedido', 'Cliente', 'Forma Pago', 'Monto', 'Notas',
    'Cuenta', 'Cobró', 'Op', 'Pagó', 'Operación Cobro', 'Ítems', 'Recibido Efectivo']]);
  (d.parc || []).forEach(function (x) {
    var k = String(x[2] || ''), i = k.indexOf('|');
    _motPoner_(H['Cobros Parciales'].f, x[0], [_motFecha_(x[1]) || '', k.slice(0, i), k.slice(i + 1), x[3], x[4], Number(x[5]) || 0, '',
      x[6], x[7], '', x[8], x[9], '', Number(x[10]) || '']);
  });
  H['Pagos Red Liq'] = new _Hoja('Pagos Red Liq', [['Timestamp', 'Fecha', 'Vendedor', 'Año', 'Semana', 'Efectivo', 'Transferencia', 'Total',
    'A Pagar Esperado', 'Diferencia', 'Pedidos', '# Pedidos', 'Origen', 'Cuenta', 'Recibió']]);
  (d.liq || []).forEach(function (x) {
    _motPoner_(H['Pagos Red Liq'].f, x[0], [_motFecha_(x[1]) || '', '', x[2], '', '', Number(x[3]) || 0, Number(x[4]) || 0, '', '', '', '', '', '', x[5], x[6]]);
  });
  ['Ingresos', 'Egresos'].forEach(function (n) { H[n] = new _Hoja(n, [['Fecha', 'Semana', 'Mes', 'Categoría', 'Concepto', 'Método', 'Monto', 'Notas', 'Lugar']]); });
  (d.mov || []).forEach(function (x) {
    if (H[x[0]]) _motPoner_(H[x[0]].f, x[1], [_motFecha_(x[2]) || '', x[3], x[4], x[5], x[6], x[7], Number(x[8]) || 0, x[9], x[10]]);
  });
  _HOJAS = H;
}
/* Las columnas fijas de `_sumarCobrado` (desde 0) y un encabezado con los nombres que busca por nombre,
   despues de la ultima columna fija. Clubes no tiene barrio, sub barrio ni lote (como la replica). */
var _CAM_PED_ = { Home: { fp: 11, ep: 12, ef: 17, tr: 18, fac: 21 }, Pilar: { fp: 11, ep: 12, ef: 17, tr: 18, fac: 21 },
  Clubes: { fp: 14, ep: 15, ef: 18, tr: 19, fac: 22 } };
function _camCabPed_(h) {
  var cab = []; for (var i = 0; i < 30; i++) cab.push('');
  cab[1] = 'N° Pedido';
  return cab.concat(['Fecha de Cobro', 'Fecha Entrega', 'Repartidor', 'Teléfono', 'Cuenta Cobro', 'Cobró', 'Recibido Efectivo',
    'Operación Cobro', 'Pagó'], h === 'Clubes' ? [] : ['Barrio', 'Sub Barrio', 'Domicilio - Lote']);
}

/* datos: lo que devuelve caja_resto_pantalla. opts.ahora: fijar el reloj (la prueba). Devuelve lo mismo
   que `?action=cajaLight` en lo que la tanda ya tiene. */
G.CA_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _camCargar_(datos || {});
      _CFG_MEMO_ = null; _CUENTAS_MEMO_ = null; _LUG_CFG_ = null;
      var o = JSON.parse(_doGetAdmin({ mode: 'caja', fresh: true }).getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
