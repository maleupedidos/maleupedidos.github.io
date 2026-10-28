/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor del portal del vendedor (191). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
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


var _authCtx = null;    // { usuario, rol } de la request en curso

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

var ESCALA_RED_CACHE_SEG = 6 * 3600;          // 6 h: la escala casi nunca cambia

var ESCALA_RED_PROP = 'ESCALA_RED_COPIA';     // la ultima que se pudo leer

var ESCALA_RED_VISTA_SEL = 'seller_commission_rate_calc?select=product_sku,product_name,level,amount,rule_amount,source,sale_price,unit_cost';

function _escalaRedFuente_() {
  var m = String(_cfgTexto_('ESCALA_RED_FUENTE', 'tabla') || '').trim().toLowerCase();
  return (m === 'medir' || m === 'productos') ? m : 'tabla';
}

var CARNE_FIJA_DESDE = '2026-10-16';

var CARNE_FIJA_COLS = ['Com Red Inicial', 'Com Red Intermedio', 'Com Red Top'];

var CARNE_FIJA_NIVELES = ['inicial', 'intermedio', 'top'];

var CARNE_FIJA_PCT = [5, 6, 7];

function _carneFijaR50_(precio, pct) {
  return Math.round((Number(precio) || 0) * pct / 5000) * 50;
}

function _carneFijaDeFilas_(vals) {
  if (!vals || !vals.length) return null;
  var h = vals[0].map(function (x) { return String(x || '').trim(); });
  var cA = h.indexOf('Abreviatura'), cP = h.indexOf('Precio'), cU = h.indexOf('Unidad');
  var cM = CARNE_FIJA_COLS.map(function (n) { return h.indexOf(n); });
  if (cA < 0 || cP < 0 || cU < 0 || cM.some(function (c) { return c < 0; })) return null;
  var montos = {}, escribir = [];
  for (var i = 1; i < vals.length; i++) {
    var f = vals[i], sku = String(f[cA] || '').trim();
    if (!sku || String(f[cU] || '').trim().toLowerCase() !== 'kg') continue;
    var m = {}, nuevos = null;
    for (var k = 0; k < 3; k++) {
      var v = f[cM[k]];
      if (v === '' || v === null || v === undefined || isNaN(Number(v))) {
        var precio = Number(f[cP]) || 0;
        if (!(precio > 0)) { m = null; break; }   // sin precio no se inventa un monto
        v = _carneFijaR50_(precio, CARNE_FIJA_PCT[k]);
        nuevos = nuevos || {};
        nuevos[k] = v;
      }
      m[CARNE_FIJA_NIVELES[k]] = Number(v);
    }
    if (!m) continue;
    montos[sku] = m;
    if (nuevos) escribir.push({ fila: i + 1, cols: cM.map(function (c) { return c + 1; }), valores: [m.inicial, m.intermedio, m.top] });
  }
  return { montos: montos, escribir: escribir };
}

var _PROD_VALORES_ = null;

function _carneFijaLeer_() {
  var sh = SS.getSheetByName('Productos');
  if (!sh) throw new Error('no esta la hoja Productos');
  var r = _carneFijaDeFilas_(_PROD_VALORES_ || sh.getDataRange().getValues());
  if (!r) throw new Error('faltan en Productos las columnas ' + CARNE_FIJA_COLS.join(' / '));
  if (r.escribir.length && !_SECO_) {
    r.escribir.forEach(function (w) {
      w.cols.forEach(function (c, k) { sh.getRange(w.fila, c).setValue(w.valores[k]); });
    });
  }
  return r.montos;
}

function _escalaRedConCarne_(esc, carne) {
  if (!esc || !carne) return esc;
  esc.carneAntes = {};
  Object.keys(carne).forEach(function (sku) {
    esc.carneAntes[sku] = esc.montos[sku] || null;
    esc.montos[sku] = carne[sku];
  });
  esc.carneDesde = CARNE_FIJA_DESDE;
  return esc;
}

function _escalaRedMontos_(cfg, sinSkus) {
  var fuente = _escalaRedFuente_();
  var tabla = fuente === 'productos' ? null : _crmPgFetch_(cfg, 'get', 'seller_commission_rate?select=product_sku,level,amount');
  if (fuente === 'tabla') return tabla;
  var vista = null;
  try { vista = _crmPgFetch_(cfg, 'get', ESCALA_RED_VISTA_SEL); } catch (eV) { vista = null; }
  if (!vista || !vista.length) {
    /* Una vez por lectura de la base (la copia dura 6 h): no es ruido. */
    _alertaTecnica_('escala Red', 'La escala desde Productos no contestó: se paga con la tabla', [
      'ESCALA_RED_FUENTE está en «' + fuente + '» pero la vista seller_commission_rate_calc no devolvió nada (¿falta pegar la 052?).',
      'No se pierde nada: los montos salen de seller_commission_rate, como antes de la palanca.']);
    return tabla || _crmPgFetch_(cfg, 'get', 'seller_commission_rate?select=product_sku,level,amount');
  }
  var _fuera = function (x) { return !(sinSkus && sinSkus[x.product_sku]); };
  try { _escalaRedVigilar_(vista.filter(_fuera), fuente === 'medir' && tabla ? tabla.filter(_fuera) : null); } catch (eW) { try { _logError_('escala Red vigilar: ' + (eW && eW.message || eW)); } catch (e2) {} }
  return fuente === 'productos' ? vista : tabla;
}

function _escalaRedLeer_() {
  var cache = null;
  try {
    cache = CacheService.getScriptCache();
    var crudo = cache.get('escala_red');
    if (crudo) return JSON.parse(crudo);
  } catch (eC) {}

  var props = PropertiesService.getScriptProperties();
  var esc = null;
  try {
    var cfg = _crmPgConfig_();
    if (cfg.enabled) {
      var bandas = _crmPgFetch_(cfg, 'get',
        'seller_level_band?select=level,min_monthly_sales&order=min_monthly_sales.asc');
      /* La carne primero: si Productos no se puede leer, tira y se usa la copia. */
      var carne = _carneFijaLeer_();
      var montos = _escalaRedMontos_(cfg, carne);
      /* Las dos tienen que venir con filas. Una escala a medias liquidaria
         algunos productos y otros no, que es peor que no liquidar ninguno. */
      if (bandas && bandas.length && montos && montos.length) {
        /* `leida`: cuando se leyo de la base. La pantalla de la escala lo
           muestra para que se sepa de cuando son los montos (la copia dura 6 h). */
        esc = { bandas: [], montos: {}, leida: Date.now() };
        for (var i = 0; i < bandas.length; i++) {
          esc.bandas.push({ nivel: String(bandas[i].level || ''),
                            desde: Number(bandas[i].min_monthly_sales) || 0 });
        }
        for (var j = 0; j < montos.length; j++) {
          var sku = String(montos[j].product_sku || '');
          if (!sku) continue;
          if (!esc.montos[sku]) esc.montos[sku] = {};
          esc.montos[sku][String(montos[j].level || '')] = Number(montos[j].amount) || 0;
        }
        _escalaRedConCarne_(esc, carne);
      }
    }
  } catch (eF) { esc = null; }

  if (esc && esc.bandas.length) {
    try { cache.put('escala_red', JSON.stringify(esc), ESCALA_RED_CACHE_SEG); } catch (e1) {}
    try { props.setProperty(ESCALA_RED_PROP, JSON.stringify(esc)); } catch (e2) {}
    return esc;
  }
  /* La base no contesto. La copia de la ultima vez es vieja pero es CIERTA:
     estos numeros cambian cada varios meses, no cada dia. */
  try {
    var guardada = props.getProperty(ESCALA_RED_PROP);
    if (guardada) return JSON.parse(guardada);
  } catch (e3) {}
  return null;
}

function _escalaRedCuentaNivel_(fila, cT) {
  return !(cT && String(fila[cT - 1] || '').trim() === 'Maleu');
}

function _escalaRedNivel_(esc, facturado) {
  if (!esc || !esc.bandas || !esc.bandas.length) return '';
  var f = Number(facturado) || 0, nivel = esc.bandas[0].nivel;
  // Vienen ordenadas de menor a mayor: gana el ultimo corte que alcanza.
  for (var i = 0; i < esc.bandas.length; i++) {
    if (f >= esc.bandas[i].desde) nivel = esc.bandas[i].nivel;
  }
  return nivel;
}

var ESCALA_RED_DESDE_YM = 202610;   // octubre de 2026

function _colsRedOrigen_(sh, crear) {
  if (!sh) return { trajo: 0, tel: 0, cod: 0 };
  if (_COLSRED_) return _COLSRED_;
  /* Entre ejecuciones tambien (28/10/2026), como `_rbCols_`: el alta de Red lo pedia justo despues del
     appendRow, y leer el encabezado ahi hace recalcular la planilla. Solo con las tres: nada que crear. */
  try { var _cr = CacheService.getScriptCache().get('red_cols_origen_v1'); if (_cr) { _COLSRED_ = JSON.parse(_cr); return _COLSRED_; } } catch (eCr) {}
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
  if (out.trajo && out.tel && out.cod) { _COLSRED_ = out; try { CacheService.getScriptCache().put('red_cols_origen_v1', JSON.stringify(out), 600); } catch (ePr) {} }
  return out;
}

function _cuentasDigitalesParaVendedor_() {
  var cs = _cuentas_(), def = _cuentaDigitalDefault_(), out = [];
  for (var i = 0; i < cs.length; i++) {
    if (cs[i].tipo !== 'digital') continue;
    out.push({ id: cs[i].id, nombre: cs[i].nombre, tipo: 'digital',
               alias: cs[i].alias || '', banco: cs[i].banco || '',
               def: (cs[i].id === def) });
  }
  return out;
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

var RED_RECLAMO_COL = 'Reclamo Cliente';

function _colReclamo_(sh, crear) {
  if (!sh) return 0;
  var ancho = sh.getLastColumn();
  var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
  for (var i = 0; i < cab.length; i++) {
    if (String(cab[i] == null ? '' : cab[i]).trim() === RED_RECLAMO_COL) return i + 1;
  }
  if (!crear) return 0;
  var c = ancho + 1;
  if (c > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), c - sh.getMaxColumns());
  sh.getRange(1, c).setValue(RED_RECLAMO_COL).setFontWeight('bold');
  sh.getRange(2, c, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
  SpreadsheetApp.flush();
  return c;
}

function _reclamoLeer_(sello) {
  var p = String(sello == null ? '' : sello).split('|').map(function (x) { return x.trim(); });
  var e = p[0] || '';
  if (e !== 'Pendiente' && e !== 'Aprobado' && e !== 'Rechazado') e = '';
  return { estado: e, quien: e ? (p[1] || '') : '', el: e ? (p[2] || '') : '' };
}

var RED_ENVIO_ANU_COL = 'Envío Anulado';

function _colEnvioAnulado_(sh, crear) {
  if (!sh) return 0;
  var ancho = sh.getLastColumn();
  var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
  for (var i = 0; i < cab.length; i++) {
    var h = String(cab[i] == null ? '' : cab[i]).trim();
    if (h === RED_ENVIO_ANU_COL || h === 'Envio Anulado') return i + 1;
  }
  if (!crear) return 0;
  var c = ancho + 1;
  /* Formato TEXTO: el sello arranca con un numero y una columna sin formato
     convierte cualquier cosa que se le parezca. Ya paso con otras columnas. */
  sh.getRange(1, c).setValue(RED_ENVIO_ANU_COL).setFontWeight('bold');
  sh.getRange(2, c, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
  SpreadsheetApp.flush();
  return c;
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

var LIQ_RED_HOJA = 'Liquidaciones Red';

var LIQ_RED_COL = 'Comisión Liquidada';

var _LIQ_RED_IDX_ = null;

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

function _liqRed2_(n) { return (n < 10 ? '0' : '') + n; }
function _liqRedHoyNum_() {
  return Number(Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyyMMdd'));
}

function _liqRedHoyNum_() {
  return Number(Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyyMMdd'));
}

function _liqRedQuincena_(num) {
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  num = Number(num) || 0;
  if (!num) return { key: 'sin-fecha', lbl: 'Sin día de entrega', desde: '', hasta: '', pagaEl: '', pagaNum: 0 };
  var y = Math.floor(num / 10000), m = Math.floor(num / 100) % 100, d = num % 100;
  var q = d <= 15 ? 1 : 2;
  var ult = new Date(y, m, 0).getDate();
  var pago = q === 1 ? new Date(y, m - 1, 16) : new Date(y, m, 1);
  if (pago.getDay() === 6) pago.setDate(pago.getDate() + 2);
  else if (pago.getDay() === 0) pago.setDate(pago.getDate() + 1);
  var d1 = q === 1 ? 1 : 16, d2 = q === 1 ? 15 : ult;
  return {
    key: y + '-' + _liqRed2_(m) + '-Q' + q,
    lbl: d1 + ' al ' + d2 + ' de ' + MES[m - 1],
    desde: _liqRed2_(d1) + '/' + _liqRed2_(m) + '/' + y,
    hasta: _liqRed2_(d2) + '/' + _liqRed2_(m) + '/' + y,
    pagaEl: _liqRed2_(pago.getDate()) + '/' + _liqRed2_(pago.getMonth() + 1) + '/' + pago.getFullYear(),
    pagaNum: pago.getFullYear() * 10000 + (pago.getMonth() + 1) * 100 + pago.getDate()
  };
}

function _liqRedCalc_() {
  var out = {};
  var sh = SS.getSheetByName('Red');
  if (!sh || sh.getLastRow() < 2) return out;
  var d = sh.getDataRange().getValues(), h = d[0], ix = {};
  for (var c = 0; c < h.length; c++) ix[String(h[c]).trim()] = c;
  var iAP = ix['A Pagar'] != null ? ix['A Pagar'] : 48;
  var iEPM = ix['Estado Pago a Maleu'] != null ? ix['Estado Pago a Maleu'] : 53;
  var hoy = _liqRedHoyNum_();
  var qs = {};
  for (var r = 1; r < d.length; r++) {
    var f = d[r], vend = String(f[7] || '').trim(), id = String(f[1] || '').trim();
    if (!vend || !id) continue;
    var es = String(f[11] || '').trim();
    if (es === 'Cancelado') continue;
    var deb = _redDebeAMaleu_(f, iAP);
    if (deb.cerroViejo) continue;
    var V = out[vend] || (out[vend] = { nombre: vend, quincenas: [], sinMarcar: [], sinMarcarTotal: 0, debeEntregar: 0 });
    var epm = String(f[iEPM] || '').trim();
    var pagado = epm === 'Pagado' || epm === 'Sí' || epm === 'Si';
    if (es === 'Entregado' && !pagado && deb.debe > 0) V.debeEntregar += Math.round(deb.debe);
    if (deb.liq) continue;
    var tot = (deb.com || 0) + (deb.env || 0);
    if (!(tot > 0)) continue;
    var Q = _liqRedQuincena_(_redFechaNum_(f[10]));
    var item = { n: id, row: r + 1, c: String(f[8] || '').trim(), dia: _fechaCorta_(f[10]),
                 com: deb.com || 0, env: deb.env || 0, tot: tot };
    if (es === 'Entregado' && String(f[13] || '').trim() === 'Cobrado') {
      var k = vend + '|' + Q.key;
      if (!qs[k]) {
        qs[k] = { key: Q.key, lbl: Q.lbl, desde: Q.desde, hasta: Q.hasta, pagaEl: Q.pagaEl, pagaNum: Q.pagaNum,
                  vencida: !Q.pagaNum || Q.pagaNum <= hoy, com: 0, env: 0, total: 0, pedidos: [] };
        V.quincenas.push(qs[k]);
      }
      qs[k].pedidos.push(item); qs[k].com += item.com; qs[k].env += item.env; qs[k].total += tot;
    } else {
      item.falta = es !== 'Entregado' ? 'entregar' : 'cobrar';
      item.q = Q.lbl; item.pagaEl = Q.pagaEl;
      V.sinMarcar.push(item); V.sinMarcarTotal += tot;
    }
  }
  Object.keys(out).forEach(function (k2) {
    out[k2].quincenas.sort(function (a, b) { return a.key < b.key ? -1 : (a.key > b.key ? 1 : 0); });
  });
  return out;
}

function _liqRedFecha_(v, conHora) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Argentina/Buenos_Aires', conHora ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
  return String(v == null ? '' : v).trim();
}

function _liqRedLeer_() {
  var sh = SS.getSheetByName(LIQ_RED_HOJA), out = [];
  if (!sh || sh.getLastRow() < 2) return out;
  var d = sh.getDataRange().getValues(), h = d[0], ix = {};
  for (var c = 0; c < h.length; c++) ix[String(h[c]).trim()] = c;
  function _lqCelda(f, nombre) { return ix[nombre] != null ? f[ix[nombre]] : ''; }
  for (var r = 1; r < d.length; r++) {
    var id = String(_lqCelda(d[r], 'ID') || '').trim();
    if (!id) continue;
    out.push({
      id: id, row: r + 1, registrado: _liqRedFecha_(_lqCelda(d[r], 'Registrado'), true),
      fecha: _liqRedFecha_(_lqCelda(d[r], 'Fecha Pago')), vendedor: String(_lqCelda(d[r], 'Vendedor') || '').trim(),
      quincena: String(_lqCelda(d[r], 'Quincena') || '').trim(),
      desde: _liqRedFecha_(_lqCelda(d[r], 'Desde')), hasta: _liqRedFecha_(_lqCelda(d[r], 'Hasta')),
      com: Number(_lqCelda(d[r], 'Comisión')) || 0, env: Number(_lqCelda(d[r], 'Envíos')) || 0, total: Number(_lqCelda(d[r], 'Total')) || 0,
      cuenta: String(_lqCelda(d[r], 'Cuenta') || '').trim(), pago: String(_lqCelda(d[r], 'Pagó') || '').trim(),
      pedidos: String(_lqCelda(d[r], 'Pedidos') || '').trim(), n: Number(_lqCelda(d[r], '# Pedidos')) || 0,
      estado: String(_lqCelda(d[r], 'Estado') || '').trim() || 'Pagada',
      anuladaEl: _liqRedFecha_(_lqCelda(d[r], 'Anulada el'), true), anuladaPor: String(_lqCelda(d[r], 'Anulada por') || '').trim()
    });
  }
  return out;
}

function _liqRedDeVendedor_(nombre) {
  if (!_liqRedActiva_()) return [];
  var nm = String(nombre || '').trim();
  return _liqRedLeer_().filter(function (l) { return l.vendedor === nm && l.estado !== 'Anulada'; })
    .map(function (l) {
      var Q = _liqRedQuincenaDeClave_(l.quincena);
      return { id: l.id, f: l.fecha, total: l.total, com: l.com, env: l.env, n: l.n, q: Q || l.quincena };
    }).reverse();
}

function _liqRedQuincenaDeClave_(key) {
  var m = String(key || '').match(/^(\d{4})-(\d{2})-Q([12])$/);
  if (!m) return '';
  return _liqRedQuincena_(Number(m[1]) * 10000 + Number(m[2]) * 100 + (m[3] === '1' ? 1 : 16)).lbl;
}

function _liqRedProxDeVendedor_(nombre) {
  if (!_liqRedActiva_()) return null;
  var hoy = _liqRedHoyNum_();
  var V = _liqRedCalc_()[String(nombre || '').trim()] || { quincenas: [], sinMarcar: [], sinMarcarTotal: 0 };
  /* El pago de la quincena de hoy y el de la anterior: el menor que no paso.
     Hoy 16/10 → el 16/10 (la del 1 al 15); el 17/10 → el 2/11. */
  var a = _liqRedQuincena_(hoy), b = _liqRedQuincena_(_liqRedNumDia_(hoy, -15));
  var prox = [a, b].filter(function (q) { return q.pagaNum >= hoy; })
    .sort(function (x, y) { return x.pagaNum - y.pagaNum; })[0] || a;
  return { hoy: hoy, proxPago: prox.pagaEl, proxPagoNum: prox.pagaNum,
           quincenas: V.quincenas, sinMarcar: V.sinMarcar, sinMarcarTotal: V.sinMarcarTotal };
}

function _liqRedNumDia_(num, delta) {
  var y = Math.floor(num / 10000), m = Math.floor(num / 100) % 100, d = num % 100;
  var t = new Date(y, m - 1, d + delta);
  return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
}

function _escalaPortal_(facturadoMes, pendiente, pendienteN) {
  try {
    var esc = _escalaRedLeer_();
    if (!esc || !esc.bandas || !esc.bandas.length) return null;
    var f = Math.round(Number(facturadoMes) || 0);
    var pend = Math.round(Number(pendiente) || 0);
    var sig = null;
    for (var i = 0; i < esc.bandas.length; i++) {
      var b = esc.bandas[i];
      if (b.desde > f && (!sig || b.desde < sig.desde)) sig = b;
    }
    return {
      nivel: _escalaRedNivel_(esc, f),
      facturado: f,
      /* El mes de ENTREGA, que es el que define el escalon. Se dice para que
         el vendedor pueda cruzarlo con el otro numero del portal sin creer
         que uno de los dos esta mal. */
      desde: ESCALA_RED_DESDE_YM,
      siguiente: sig ? { nivel: sig.nivel, desde: sig.desde, falta: Math.round(sig.desde - f) } : null,
      /* Lo vencido sin marcar entregado (5/10/2026): NO entra en `facturado`
         ni en `nivel`, que son lo que se liquida. Es lo que llevaria si lo
         marca, y el nivel que eso le daria. */
      pendiente: pend > 0 ? { monto: pend, n: Number(pendienteN) || 0, facturado: f + pend,
                              nivel: _escalaRedNivel_(esc, f + pend) } : null,
      bandas: esc.bandas
    };
  } catch (e) { return null; }
}

function _escalaProductosVendedor_(esc) {
  if (!esc || !esc.montos) return [];
  var prod = {};
  var hProd = SS.getSheetByName('Productos');
  if (hProd && hProd.getLastRow() > 1) {
    var pd = hProd.getRange(1, 1, hProd.getLastRow(), 17).getValues();
    for (var r = 1; r < pd.length; r++) {
      var ab = String(pd[r][2] || '').trim();
      if (!ab) continue;
      prod[ab] = { n: String(pd[r][1] || '').trim(), precio: _numCelda_(pd[r][8]), u: _uniValida_(pd[r][16]) };
    }
  }
  var cat = _catPorAbbr_(), mapa = _colsAbbr_('Red'), out = [], visto = {};
  Object.keys(mapa).map(Number).sort(function (a, b) { return a - b; }).forEach(function (c) {
    var s = mapa[c];
    if (!s || visto[s]) return;
    visto[s] = true;
    var p = prod[s] || null, m = esc.montos[s] || null;
    var num = function (x) { return (m && typeof m[x] === 'number') ? m[x] : null; };
    out.push({ a: s, n: p ? p.n : s, cat: cat[s] || 'Otros', u: p ? p.u : 'u',
               p: p ? p.precio : null, ini: num('inicial'), int: num('intermedio'), top: num('top') });
  });
  return out;
}

function _doGetDashboardVendedor(e) {
  var nombre = String(e && e.parameter && e.parameter.nombre || '').trim();
  var comPctV = _comisionPct(nombre);   // % de ESTE vendedor (hoja Vendedores col J)
  if (!nombre) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, err: 'nombre requerido' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  /* UN VENDEDOR VE SU PORTAL, NO EL DE OTRO (2/10/2026). `nombre` viene en la
     URL y el permiso solo pedia la tab `miportal`: cualquier vendedor logueado
     podia pedir el portal de otro y llevarse sus clientes, telefonos y
     direcciones. Si la sesion es de un vendedor, tiene que ser ESE vendedor.
     El admin y los usuarios que no son vendedores siguen como estaban.
     `forbidden`, nunca `authRequired`: el front trata authRequired como sesion
     vencida y lo echaria de la app (ver "403 y 401 no son lo mismo"). */
  try {
    var _rolDV = String((_authCtx && _authCtx.rol) || '');
    var _uDV = String((_authCtx && _authCtx.usuario) || '').trim().toLowerCase();
    if (_authCtx && _rolDV !== 'admin' && _uDV) {
      var _VDV = _rbVendedores_();
      var _yoDV = null;
      for (var _iDV = 0; _iDV < _VDV.lista.length; _iDV++) {
        if (_VDV.lista[_iDV].usuario === _uDV) { _yoDV = _VDV.lista[_iDV]; break; }
      }
      if (_yoDV && _yoDV.nombre !== nombre) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, forbidden: true, err: 'ese portal no es tuyo' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  } catch (eDV) { /* si no se puede chequear, se sigue como antes */ }

  // Leer hoja Red (operativa)
  var sh = SS.getSheetByName('Red');
  var pedidos = [];
  var clientesMap = {}; // {nombre: {count, total, ultFecha}}

  // Fecha actual Argentina
  var ahora = new Date();
  var argDate = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  var semanaActual = _isoWeek(argDate);
  var mesActual    = argDate.getMonth() + 1; // 1-12
  var yearActual   = argDate.getFullYear();
  var MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var nombreMesActual = MESES[mesActual - 1];

  var semanaFacturado = 0, semanaPedidos = 0;
  /* LA COMISION SE SUMA DE LA COL AU, NO SE CALCULA (1/10/2026). Desde octubre
     la col AU tiene el monto de la escala (fijo por producto y nivel) y el 17%
     ya no existe: recalcular `facturado * %` le mostraba al vendedor una
     ganancia que no es la suya. Cada pedido aporta su `comision` (la de la col
     AU, o el 17% solo si la fila no tiene un numero ahi) y los totales son la
     suma. */
  var semanaCom = 0, mesCom = 0, totalCom = 0;
  var mesFacturado = 0, mesPedidos = 0;
  var totalFacturado = 0, totalPedidos = 0;
  // Envío = 100% del vendedor. Su ganancia total = comisión 17% + envío.
  var semanaEnvio = 0, mesEnvio = 0, totalEnvio = 0;
  // Stats operativas viernes
  var viernesHoy = 0, viernesEntregados = 0; // el reparto de ESTA SEMANA (ver abajo)
  var _diasRepSem = {};                      // que dias cae, para poder nombrarlo
  var escFacturado = 0;                      // la base del escalon: solo lo ENTREGADO este mes
  var escPendiente = 0, escPendienteN = 0;   // vencido sin marcar entregado (no suma: se informa)
  var _hoyIniDash = new Date(argDate.getFullYear(), argDate.getMonth(), argDate.getDate()).getTime();  // vencido = dia de entrega ANTES de hoy
  var pendCobrar = 0;       // plata sin cobrar al cliente
  var pendLiquidar = 0;     // plata cobrada pero no liquidada a Maleu
  // pendLiquidar NO se puede sumar pedido por pedido: hay que cruzarlo contra lo que
  // el vendedor ya rindio de esa semana, y eso se lee mas abajo (liqBySem). Por eso
  // aca solo se acumula por semana y la resta se hace al final.
  //
  // Sin esto se contaba el pedido ENTERO aunque ya estuviera rendido a medias: una
  // rendicion parcial no marca los pedidos como "Pagado a Maleu" (eso pasa recien
  // cuando la semana se cubre entera), asi que el vendedor veia una deuda mayor a la
  // real. Es el espejo del bug que le hacia cobrar de MENOS a Tadeo (Fini, 31/8/2026).
  var pendPorSem = {};      // 'YYYY-WW' -> a pagar de los pedidos cobrados y NO rendidos
  var cerradoPorSem = {};   // 'YYYY-WW' -> a pagar de los pedidos que la rendicion YA cerro
  // Breakdown por (año, mes) para desglose de meses anteriores
  var mesesMap = {}; // key: 'YYYY-MM' -> {n, y, m, facturado, pedidos}
  // Breakdown por (año, semana ISO) para desglose semanal
  var semanasMap = {}; // key: 'YYYY-WW' -> {y, w, facturado, pedidos}

  if (sh && sh.getLastRow() > 1) {
    // Leer cols A-BC (55): todo lo que el portal necesita
    var numRows = sh.getLastRow() - 1;
    /* LA FILA ENTERA, EN UNA SOLA LLAMADA (1/10/2026).
       Leia 63 columnas (hasta BK) y despues pedia aparte el sello de "envio
       anulado" (col 82). Ahora el portal necesita ademas `Mes Entrega` (69) y
       `Año Entrega` (71) para el escalon, asi que serian TRES llamadas. En
       Apps Script pesan las llamadas, no las celdas: una sola de 82 columnas
       cuesta menos que tres recortadas. */
    var _ancho = Math.max(63, sh.getLastColumn());
    var data = sh.getRange(2, 1, numRows, _ancho).getValues();
    var _colAnu = 0;
    try { _colAnu = _colEnvioAnulado_(sh, false); } catch (eCA) { _colAnu = 0; }
    /* La bandeja (1/10/2026): lo que espera confirmacion NO es del vendedor
       todavia. Vacio = pedido de antes de la bandeja = suyo. */
    var _colEstRed = 0;
    try { _colEstRed = _rbCols_(sh, false).estado; } catch (eER) { _colEstRed = 0; }
    var _colTrajo = 0;
    try { _colTrajo = _colsRedOrigen_(sh, false).trajo || 0; } catch (eCT) { _colTrajo = 0; }
    /* «Este cliente es mío» (15/10/2026): el portal necesita saber quien lo
       trajo y en que esta el reclamo. */
    var _colRec = 0;
    try { _colRec = _colReclamo_(sh, false); } catch (eCR) { _colRec = 0; }
    for (var r = 0; r < data.length; r++) {
      var vendedor = String(data[r][7] || '').trim();
      if (vendedor !== nombre) continue;
      if (_colEstRed) {
        var _estRed = String(data[r][_colEstRed - 1] || '').trim();
        if (_estRed === 'Por confirmar' || _estRed === 'Anulado') continue;
      }

      var nPedido      = String(data[r][1] || '').trim();
      var fechaCell    = data[r][3];
      var cliente      = String(data[r][8] || '').trim();
      var estado       = String(data[r][11] || '').trim();
      // Día de Entrega (col K = idx 10): parseamos a Date y de ahí sacamos año/mes/semana.
      // Si no hay día de entrega válido, caemos a las cols E/F/G (mes/sem/año creación) como fallback.
      var diaRawDash = data[r][10];
      var fechaEntrega = null;
      var DIAS_DASH = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      if (diaRawDash instanceof Date) {
        fechaEntrega = diaRawDash;
      } else {
        var mDash = String(diaRawDash || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mDash) {
          fechaEntrega = new Date(Number(mDash[3]), Number(mDash[2]) - 1, Number(mDash[1]));
        }
      }
      var MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      var diaEntrega, mes, semana, year;
      if (fechaEntrega) {
        diaEntrega = DIAS_DASH[fechaEntrega.getDay()];
        mes        = MESES_FULL[fechaEntrega.getMonth()];
        semana     = _isoWeek(fechaEntrega);
        year       = fechaEntrega.getFullYear();
      } else {
        // Fallback a fecha de creación
        diaEntrega = '';
        mes        = String(data[r][4] || '').trim();
        semana     = Number(data[r][5]) || 0;
        year       = Number(data[r][6]) || 0;
      }
      var formaPago    = String(data[r][12] || '').trim();
      var estadoPago   = String(data[r][13] || '').trim();
      var total        = Number(data[r][14]) || 0;
      var envio        = Number(data[r][15]) || 0; // P = Envío (100% del vendedor)
      var efectivoMonto = Number(data[r][16]) || 0; // Q = Efectivo
      var transferMonto = Number(data[r][17]) || 0; // R = Transferencia
      var propinaEf    = Number(data[r][18]) || 0;
      var propinaTr    = Number(data[r][19]) || 0;
      var facturado    = Number(data[r][20]) || total;
      /* typeof y no `||`: una comision de $0 (el cliente lo trajo Maleu) es un
         dato, y con `||` caia al 17%. Y un '#ERROR!' en la celda no es un
         numero: ahi si va el 17%, que es lo que la planilla tendria. */
      var _comCel = data[r][46], _aPgCel = data[r][48];
      var comision     = (typeof _comCel === 'number' && isFinite(_comCel))
        ? Math.round(_comCel) : Math.round(facturado * comPctV / 100);
      var aPagarMaleu  = (typeof _aPgCel === 'number' && isFinite(_aPgCel))
        ? Math.round(_aPgCel) : (facturado - comision); // AW (49) = A Pagar
      /* Lo que le debe a Maleu sale de la misma regla que Cobros y Recibi
         (7/10/2026): el Facturado entero (o, desde el 5/10, el efectivo que
         cobro), y lo que Maleu le debe a el (`mDebe`) se le paga en la quincena. */
      var _debV = _redDebeAMaleu_(data[r], 48);
      aPagarMaleu = Math.round(_debV.debe);
      // Cols reales (1-based / 0-based): AX Barrio=50/49, AY Lote=51/50, AZ Teléfono=52/51,
      // BA Forma Pago Maleu=53/52, BB Estado Pago Maleu=54/53, BC Fecha Pago Maleu=55/54
      var barrio       = String(data[r][49] || '').trim();
      var lote         = String(data[r][50] || '').trim();
      var telefono     = String(data[r][51] || '').trim();
      var formaPagoMaleu  = String(data[r][52] || '').trim();
      var estadoPagoMaleu = String(data[r][53] || '').trim();
      var fechaPagoMaleu  = String(data[r][54] || '').trim();

      var fechaStr = '';
      if (fechaCell instanceof Date) {
        fechaStr = Utilities.formatDate(fechaCell, 'America/Argentina/Buenos_Aires', 'dd/MM');
      } else fechaStr = String(fechaCell || '');

      // Stats semana/mes/total (solo pedidos no cancelados)
      if (estado !== 'Cancelado') {
        totalFacturado += facturado; totalPedidos++; totalEnvio += envio; totalCom += comision;
        if (year === yearActual && semana === semanaActual) {
          semanaFacturado += facturado; semanaPedidos++; semanaEnvio += envio; semanaCom += comision;
          /* ── EL REPARTO DE LA SEMANA, NO "EL VIERNES" (1/10/2026) ──
             Hasta hoy esto contaba solo `diaEntrega === 'Viernes'`, porque los
             tres vendedores de Pilar reparten ese dia. **Fede reparte viernes
             Y sabados** (Tigre, arranca el 2/10/2026): la mitad de su jornada
             no iba a aparecer ni en el banner ni en la barra de avance, y el
             portal le iba a decir que no tiene nada que entregar un sabado a
             la mañana con el auto cargado.
             Se cuenta TODO lo de la semana y se dice que dias son, en vez de
             guardar una lista de dias por vendedor que alguien tendria que
             mantener cada vez que entra uno nuevo. */
          viernesHoy++;
          if (estado === 'Entregado') viernesEntregados++;
          if (diaEntrega) _diasRepSem[diaEntrega] = (_diasRepSem[diaEntrega] || 0) + 1;
        }
        if (year === yearActual && mes === nombreMesActual) {
          mesFacturado += facturado; mesPedidos++; mesEnvio += envio; mesCom += comision;
        }
        /* LA BASE DEL ESCALON ES OTRO NUMERO, Y NO SE PUEDEN MEZCLAR.
           `mesFacturado` va por el dia ACORDADO de entrega (col K). El escalon
           sale de `Mes Entrega` (69) y `Año Entrega` (71), que se sellan recien
           cuando se entrega de verdad — el mismo criterio que usa
           `_escalaRedFacturadoMes_` al liquidar. En Red hay hasta 27 dias
           entre un dia y el otro, asi que mostrarle al vendedor el primero
           diciendole que es lo que define su comision seria mentirle. */
        if (String(data[r][68] || '').trim() === nombreMesActual
            && String(data[r][70] || '').trim() === String(yearActual)
            && _escalaRedCuentaNivel_(data[r], _colTrajo)) {   /* lo que trajo Maleu no suma (5/10/2026) */
          escFacturado += facturado;
        }
        /* LO QUE YA PASO Y NADIE MARCO (5/10/2026). El 5/10 Marcos tenia 4
           pedidos del viernes 2/10 sin marcar ($336.200) y el portal le decia
           "$62.500 entregado, te faltan $937.500". No se suma al nivel —el
           nivel es lo entregado y asi se liquida—, pero se le dice aparte
           cuanto llevaria si los marca. Mismo filtro que el nivel: lo que
           trajo Maleu no suma. */
        if (estado !== 'Entregado' && fechaEntrega && fechaEntrega.getTime() < _hoyIniDash
            && _escalaRedCuentaNivel_(data[r], _colTrajo)) {
          escPendiente += facturado; escPendienteN++;
        }
        // Acumulado por (año, mes) para desglose. Solo si tenemos fechaEntrega válida.
        if (fechaEntrega && mes) {
          var mNum = fechaEntrega.getMonth() + 1; // 1-12
          var mKey = year + '-' + (mNum < 10 ? '0' + mNum : mNum);
          if (!mesesMap[mKey]) mesesMap[mKey] = { n: mes, y: year, m: mNum, facturado: 0, pedidos: 0, envio: 0, comision: 0 };
          mesesMap[mKey].facturado += facturado;
          mesesMap[mKey].comision += comision;
          mesesMap[mKey].pedidos++;
          mesesMap[mKey].envio += envio;
        }
        // Acumulado por (año, semana ISO) para desglose semanal
        if (fechaEntrega && semana) {
          var wKey = year + '-' + (semana < 10 ? '0' + semana : semana);
          if (!semanasMap[wKey]) semanasMap[wKey] = { y: year, w: semana, facturado: 0, pedidos: 0, envio: 0, comision: 0 };
          semanasMap[wKey].facturado += facturado;
          semanasMap[wKey].comision += comision;
          semanasMap[wKey].pedidos++;
          semanasMap[wKey].envio += envio;
        }
        // Plata pendiente de cobrar al cliente (entregado pero no cobrado).
        // El cliente paga productos + envío ($3.000, del vendedor), así que la
        // "plata por cobrar" real incluye el envío. Facturado (col U) = solo productos.
        if (estado === 'Entregado' && estadoPago !== 'Cobrado') {
          pendCobrar += facturado + envio;
        }
        // Plata cobrada pero no liquidada a Maleu (cobrado y no pagado a Maleu)
        // Marcos se queda con comisión 17%, el resto (83%) es para Maleu
        // Acepta "Pagado" (nuevo) o "Sí" (formato viejo) como liquidado
        var liquidado = (estadoPagoMaleu === 'Pagado' || estadoPagoMaleu === 'Sí' || estadoPagoMaleu === 'Si');
        var kSem = year + '-' + (semana < 10 ? '0' + semana : semana);
        if (liquidado) {
          // Ya rendido: sale del saldo, pero antes hay que anotar CUANTO de la
          // liquidacion de su semana se fue en cerrarlo.
          cerradoPorSem[kSem] = (cerradoPorSem[kSem] || 0) + aPagarMaleu;
        } else if (estadoPago === 'Cobrado') {
          pendPorSem[kSem] = (pendPorSem[kSem] || 0) + aPagarMaleu;
        }
      }

      // Productos del pedido (cols V-AR = idx 21-43)
      /* Toda columna del mapa, en orden (9/10/2026). El tramo de carne era fijo
         (75-79): un pedido con cortes de LM Carnes (91-97) le llegaba al
         vendedor sin esos productos. Los kilos, con tres decimales. */
      var prods = _prodsDeFila_('Red', data[r], true);

      /* "Es de mi reparto de esta semana". Hasta el 1/10/2026 exigia ademas
         que el dia fuera Viernes — ver el bloque del reparto, arriba. */
      var esViernesActual = (year === yearActual && semana === semanaActual);

      pedidos.push({
        n: nPedido, c: cliente, f: fechaStr, de: diaEntrega,
        $: facturado, com: comision, env: envio, gan: comision + envio, aPg: aPagarMaleu, es: estado,
        /* Con la `comision` de aca (que cae al 17% si la celda trae #ERROR!),
           no la de la celda cruda: es la misma que el portal ya le muestra. */
        mDebe: (_debV.cerroViejo || _debV.liq) ? 0 : (comision + (_debV.nueva ? envio : 0)), nueva: !!_debV.nueva, cv: !!_debV.cerroViejo,
        liq: _debV.liq || '',   // id de la liquidacion que pago su comision (9/10/2026)
        fp: formaPago,       // Efectivo/Transferencia/Mixto
        ep: estadoPago,      // Cobrado/No Cobrado
        ef: efectivoMonto, tr: transferMonto, // cobrado al cliente (para Mixto)
        pEf: propinaEf, pTr: propinaTr,
        fpm: formaPagoMaleu, // Forma Pago a Maleu
        epm: estadoPagoMaleu,// Pagado/Pendiente
        fpmF: fechaPagoMaleu,// Fecha Pago a Maleu
        b: barrio, l: lote, t: telefono,
        prods: prods,
        vi: esViernesActual, // flag "es este viernes"
        /* Para anular (o devolver) el envio desde el portal. `row` es una
           PISTA: el backend la verifica contra el N° de pedido antes de
           escribir, porque el portal guarda su copia y una pista vieja
           escribiria la fila de otro cliente. */
        row: r + 2,
        envAnu: _colAnu ? String(data[r][_colAnu - 1] || '').trim() : '',
        /* LO VENCIDO, EN INICIO (5/10/2026). `de` es solo el nombre del dia y
           `f` la fecha de CREACION: con eso el portal no podia saber que un
           pedido del viernes pasado sigue sin marcar. `fe` es el dia acordado
           de entrega en ISO; `cn`, si la venta suma para el nivel (lo que trajo
           Maleu no suma, @789). */
        fe: fechaEntrega ? Utilities.formatDate(fechaEntrega, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd') : '',
        cn: _escalaRedCuentaNivel_(data[r], _colTrajo),
        tc: _colTrajo ? String(data[r][_colTrajo - 1] || '').trim() : '',
        rc: _colRec ? _reclamoLeer_(data[r][_colRec - 1]) : null,
        _y: year,            // para sort
        _sem: semana         // para sort
      });

      // Clientes agrupados (enriquecido con barrio/teléfono del último pedido)
      if (cliente && estado !== 'Cancelado') {
        if (!clientesMap[cliente]) clientesMap[cliente] = { n: cliente, count: 0, total: 0, ult: fechaStr, b: barrio, t: telefono, ultIso: '', primIso: '' };
        clientesMap[cliente].count++;
        clientesMap[cliente].total += facturado;
        /* «Últ» es el ultimo DIA DE ENTREGA (8/10/2026): en Red la venta se
           fecha por el dia acordado, y Hoy y Pedidos ya decian «vie 02/10» de
           un pedido que Clientes mostraba «Últ: 01/10» (el dia que se cargo).
           Y el mas reciente, no el ultimo que aparece en la hoja. Sin dia de
           entrega queda el de carga, como antes. */
        var _ultK = fechaEntrega ? Utilities.formatDate(fechaEntrega, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd') : (_rtIso_(fechaCell) || '');
        if (!clientesMap[cliente]._ultK || _ultK >= clientesMap[cliente]._ultK) {
          clientesMap[cliente]._ultK = _ultK;
          clientesMap[cliente].ult = fechaEntrega ? Utilities.formatDate(fechaEntrega, 'America/Argentina/Buenos_Aires', 'dd/MM') : fechaStr;
        }
        /* `ult` es dd/MM SIN anio: un 15/12 puede ser de este anio o del pasado.
           Las tareas necesitan "hace cuantos dias", asi que viaja tambien en ISO. */
        var _iso = _rtIso_(fechaCell);
        if (_iso) {
          if (!clientesMap[cliente].ultIso || _iso > clientesMap[cliente].ultIso) clientesMap[cliente].ultIso = _iso;
          if (!clientesMap[cliente].primIso || _iso < clientesMap[cliente].primIso) clientesMap[cliente].primIso = _iso;
        }
        if (barrio)   clientesMap[cliente].b = barrio;
        if (telefono) clientesMap[cliente].t = telefono;
      }
    }
  }

  // Sort pedidos por año + semana ISO + N° desc (más recientes primero)
  pedidos.sort(function(a, b) {
    if (a._y !== b._y) return b._y - a._y;
    if (a._sem !== b._sem) return b._sem - a._sem;
    var na = Number(a.n) || 0, nb = Number(b.n) || 0;
    return nb - na;
  });
  // Slicing: nunca podar pedidos abiertos. Un pedido es "abierto" si no está
  // Cancelado y todavía falta entregarlo o cobrarlo (al cliente). Esos
  // siempre van al payload — para que el portal no pierda los deudores al
  // cambiar de semana. Cerrados: top 20 más recientes.
  var _abierto = function(p) {
    return p.es !== 'Cancelado' && (p.es !== 'Entregado' || p.ep !== 'Cobrado');
  };
  var _pedidosTodos = pedidos.slice();
  var pAbiertos = pedidos.filter(_abierto);
  var pCerrados = pedidos.filter(function(p) { return !_abierto(p); });
  pedidos = pAbiertos.concat(pCerrados.slice(0, 20));
  /* Las piezas de carne de cada pedido, como en la ficha del ERP (23/10/2026). */
  try { _pedidosConPiezas_(pedidos, 'Red'); } catch (ePzR) {}

  // Clientes: convertir map a array, sort por count desc
  var clientes = Object.keys(clientesMap).map(function(k) { return clientesMap[k]; });
  clientes.sort(function(a, b) { return b.count - a.count; });

  // Rango de la semana ISO actual (lunes a domingo) en formato dd/MM
  var diaSem = argDate.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  var offsetALun = (diaSem === 0) ? -6 : (1 - diaSem);
  var lunes = new Date(argDate);
  lunes.setDate(argDate.getDate() + offsetALun);
  var domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  var fmt = function(d) {
    return Utilities.formatDate(d, 'America/Argentina/Buenos_Aires', 'dd/MM');
  };

  // Helper: semanas ISO cuyo jueves cae en (year, month). month 1-12.
  // Devuelve array de {n, y, lun, dom, facturado, pedidos, comision}
  function _semanasDelMes(y, mm) {
    var res = [];
    var d = new Date(y, mm - 1, 1);
    var lastDay = new Date(y, mm, 0);
    // Ir al primer jueves del mes (getDay: 0=Dom..4=Jue..6=Sab)
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
    while (d <= lastDay) {
      var mon = new Date(d); mon.setDate(d.getDate() - 3);
      var dom = new Date(d); dom.setDate(d.getDate() + 3);
      var wNum = _isoWeek(d);
      var wYear = d.getFullYear(); // jueves está en este año — ISO year == calendar year en los jueves
      var key = wYear + '-' + (wNum < 10 ? '0' + wNum : wNum);
      var bucket = semanasMap[key] || { facturado: 0, pedidos: 0, envio: 0, comision: 0 };
      res.push({
        n: wNum, y: wYear,
        lun: fmt(mon), dom: fmt(dom),
        facturado: bucket.facturado,
        pedidos: bucket.pedidos,
        comision: bucket.comision || 0,
        envio: bucket.envio || 0,
        ganancia: (bucket.comision || 0) + (bucket.envio || 0)
      });
      d.setDate(d.getDate() + 7);
    }
    return res;
  }

  // Meses anteriores (excluye el mes actual), ordenados desc por (año, mes), cada uno con desglose semanal
  var mesesAnt = [];
  Object.keys(mesesMap).forEach(function(k) {
    var row = mesesMap[k];
    if (row.y === yearActual && row.m === mesActual) return; // skip mes actual
    mesesAnt.push({
      n: row.n, y: row.y, m: row.m,
      facturado: row.facturado, pedidos: row.pedidos,
      comision: row.comision || 0,
      envio: row.envio || 0,
      ganancia: (row.comision || 0) + (row.envio || 0),
      semanas: _semanasDelMes(row.y, row.m)
    });
  });
  mesesAnt.sort(function(a, b) {
    if (a.y !== b.y) return b.y - a.y;
    return b.m - a.m;
  });

  // Índice de pagos parciales del vendedor por (año, semana): { "YYYY-WW": { ef, tr, total, pagos:[{f,ef,tr}] } }
  var liqBySem = {};
  var shLiqD = SS.getSheetByName('Pagos Red Liq');
  if (shLiqD && shLiqD.getLastRow() > 1) {
    var dLiqD = shLiqD.getDataRange().getValues();
    for (var rL = 1; rL < dLiqD.length; rL++) {
      if (String(dLiqD[rL][2]).trim() !== nombre) continue;
      var yL = Number(dLiqD[rL][3]) || 0;
      var wL = Number(dLiqD[rL][4]) || 0;
      if (!yL || !wL) continue;
      var kL = yL + '-' + (wL < 10 ? '0' + wL : wL);
      if (!liqBySem[kL]) liqBySem[kL] = { ef: 0, tr: 0, total: 0, pagos: [] };
      var efL = Number(dLiqD[rL][5]) || 0;
      var trL = Number(dLiqD[rL][6]) || 0;
      liqBySem[kL].ef += efL;
      liqBySem[kL].tr += trL;
      liqBySem[kL].total += (efL + trL);
      var fRaw = dLiqD[rL][1];
      var fStr = '';
      if (fRaw instanceof Date) {
        fStr = Utilities.formatDate(fRaw, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
      } else {
        fStr = String(fRaw || '').trim();
      }
      liqBySem[kL].pagos.push({ f: fStr, ef: efL, tr: trL });
    }
  }

  // Ahora si: el saldo a Maleu, semana por semana, descontando SOLO el excedente
  // de lo rendido por encima de lo que esa misma rendicion ya cerro. Restar `rendido`
  // a secas contaria dos veces el mismo pago (ver el comentario de pendPorSem).
  pendLiquidar = 0;
  Object.keys(pendPorSem).forEach(function (k) {
    var rendido = (liqBySem[k] && liqBySem[k].total) || 0;
    var libre = Math.max(0, rendido - (cerradoPorSem[k] || 0));
    pendLiquidar += Math.max(0, pendPorSem[k] - libre);
  });

  var _escalaV = _escalaPortal_(escFacturado, escPendiente, escPendienteN);
  /* La tabla de comision por producto. Si falla, el portal sigue sin ella. */
  if (_escalaV) { try { _escalaV.productos = _escalaProductosVendedor_(_escalaRedLeer_()); } catch (_eEp) { _escalaV.productos = []; } }
  /* Las tareas de la semana (1/10/2026). Nunca rompen el portal: si fallan, va
     null y el portal no dibuja la tarjeta. */
  var _tareas = null;
  try {
    _tareas = _rtTareas_({ nombre: nombre, hoy: argDate, pedidos: _pedidosTodos, clientesMap: clientesMap,
      escala: _escalaV, mes: { facturado: mesFacturado, pedidos: mesPedidos }, semanasMap: semanasMap,
      cerradoPorSem: cerradoPorSem, liqBySem: liqBySem, semanaActual: semanaActual, yearActual: yearActual });
  } catch (eTar) { try { _logError_('tareas red ' + nombre + ': ' + eTar); } catch (_e) {} }
  /* El objetivo semanal (portal nuevo, 5/10/2026). Usa las mismas filas ya
     leidas: no suma una lectura de la hoja Red. Si falla, va null. */
  var _objetivo = null;
  try {
    _objetivo = _roObjetivoPortal_({ nombre: nombre, hoy: argDate, data: data, pedidos: _pedidosTodos,
      clientesMap: clientesMap, cols: { estRed: _colEstRed || 0, trajo: _colTrajo || 0 },
      esSuyo: _roVendedorDeSesion_() === nombre });
  } catch (eObj) { try { _logError_('objetivo red ' + nombre + ': ' + eObj); } catch (_e) {} }
  /* Su Telegram: si ya esta vinculado, o el link para vincularlo. */
  var _tg = null;
  try {
    var _vTg = _rbVendedorPorNombre_(_rbVendedores_(), nombre);
    /* EL LINK SALE DE LA SESION, NO DE LA URL (2/10/2026, lo encontro Codex).
       `nombre` viene en la URL: con el link de otro, un vendedor vinculaba SU
       chat como si fuera el otro y se quedaba con sus pedidos — nombres,
       telefonos y direcciones de clientes. Solo se le da al vendedor cuyo
       Usuario es el de la sesion. El admin lo tiene en la bandeja. */
    var _uSes = String((_authCtx && _authCtx.usuario) || '').trim().toLowerCase();
    var _esSuyo = !!(_vTg && _uSes && _vTg.usuario === _uSes);
    if (_vTg) _tg = { vinculado: !!_vTg.chat, link: (!_vTg.chat && _esSuyo) ? _rbTgLink_(_vTg) : '' };
  } catch (eTg) { _tg = null; }

  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    tareas: _tareas,
    objetivo: _objetivo,
    tg: _tg,
    stats: {
      semana:   { n: semanaActual, lun: fmt(lunes), dom: fmt(domingo),
                  facturado: semanaFacturado, pedidos: semanaPedidos,
                  comision: semanaCom,
                  envio: semanaEnvio,
                  ganancia: semanaCom + semanaEnvio },
      mes:      { facturado: mesFacturado, pedidos: mesPedidos, nombre: nombreMesActual,
                  y: yearActual, m: mesActual,
                  comision: mesCom,
                  envio: mesEnvio,
                  ganancia: mesCom + mesEnvio,
                  semanas: _semanasDelMes(yearActual, mesActual) },
      mesesAnt: mesesAnt,
      total:    { facturado: totalFacturado,  pedidos: totalPedidos, envio: totalEnvio },
      comision: totalCom,
      ganancia: totalCom + totalEnvio,
      /* La clave se sigue llamando `viernes` para no romper un portal que
         todavia no se actualizo; lo que cambio es QUE cuenta (toda la semana)
         y que ahora dice en `dias` que dias son, en orden. */
      viernes:      { total: viernesHoy, entregados: viernesEntregados,
                      dias: (function () {
                        var O = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                        var out = [];
                        for (var i = 0; i < O.length; i++) if (_diasRepSem[O[i]]) out.push(O[i]);
                        for (var k in _diasRepSem) if (O.indexOf(k) < 0) out.push(k);
                        return out;
                      })() },
      pendCobrar:   pendCobrar,
      pendLiquidar: pendLiquidar,
      /* ── EL ESCALON, DICHO AL QUE LO TIENE QUE ALCANZAR (1/10/2026) ──
         Desde hoy la comision de Red no es un 17% parejo: es un monto por
         producto que depende del nivel, y el nivel depende de lo que el
         vendedor facturo ESTE MES. Hasta ahora eso vivia entero del lado de
         Maleu — el vendedor no veia en que nivel estaba ni cuanto le faltaba.
         Un incentivo que no se ve no incentiva.
         Medido el 1/10 sobre todo 2026: **nadie llego nunca al nivel top**, y
         dos de los tres nunca pasaron la mitad del corte intermedio. Razon de
         mas para mostrarlo: si el numero esta lejos, que se vea cuan lejos.
         Si la escala no se puede leer, esto va `null` y el portal no dibuja la
         tarjeta — jamas se inventa un nivel. */
      escala: _escalaV
    },
    pedidos: pedidos,
    clientes: clientes,
    liqBySem: liqBySem,
    /* «Te pagamos $X el dd/mm»: una por liquidacion quincenal (9/10/2026).
       Vacio con la palanca LIQUIDACION_RED apagada. */
    liqs: _liqRedDeVendedor_(nombre),
    /* «Lo que vas a cobrar», arriba de Hoy (16/10/2026): la misma cuenta que
       Ventas › RED › Liquidación, solo lo de este vendedor. */
    liqProx: (function () { try { return _liqRedProxDeVendedor_(nombre); } catch (eLp) { return null; } })(),
    /* Para que el vendedor pueda declarar a qué cuenta transfirió cuando registra
       un pago desde su portal. Viaja pegado acá —el endpoint que el portal ya
       pide— y no en un `action=cuentas` aparte: el piso de un GET a Apps Script
       son 3,4 s y esto son ~150 bytes. */
    cuentas: _cuentasDigitalesParaVendedor_()
  })).setMimeType(ContentService.MimeType.JSON);
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
     las llamadas, no las celdas. Solo se cachea si ya estan las seis.
     CON `crear` TAMBIEN (28/10/2026): si el cache esta, estan las seis y no hay nada que crear. El pase a
     un vendedor y `_rbAlEntrar_` lo pedian con `crear` justo despues de escribir Red, y esa lectura del
     encabezado obligaba a la planilla a recalcular Productos (un par de segundos con el candado, cada una). */
  try {
    var _c = CacheService.getScriptCache().get('rb_cols_v1');
    if (_c) return JSON.parse(_c);
  } catch (eC) {}
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

function _rbAhoraTxt_() {
  return Utilities.formatDate(new Date(), RB_TZ_, 'dd/MM/yyyy HH:mm');
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

function _rbVendedorPorNombre_(V, nombre) {
  var n = String(nombre || '').trim();
  for (var i = 0; i < V.lista.length; i++) if (V.lista[i].nombre === n) return V.lista[i];
  return null;
}

var RT_HOJA_ = 'Tareas Red';

var RT_CAB_ = ['Fecha', 'Semana', 'Vendedor', 'Tipo', 'Clave', 'Resultado', 'Nota'];

var RT_RESULTADOS_ = ['Compró', 'No contesta', 'No quiere', 'Reprogramó'];

var RT_MAX_TAREAS_ = 4;

var RT_MAX_LLAMADOS_ = 4;

function _rtHoja_(crear) {
  var sh = SS.getSheetByName(RT_HOJA_);
  if (sh || !crear) return sh;
  sh = SS.insertSheet(RT_HOJA_);
  if (!sh) return null;
  sh.getRange(1, 1, 1, RT_CAB_.length).setValues([RT_CAB_]).setFontWeight('bold');
  sh.getRange(2, 2, Math.max(1, sh.getMaxRows() - 1), 4).setNumberFormat('@');
  return sh;
}

function _rtSemanaKey_(d) {
  var w = _isoWeek(d);
  /* El año ISO es el del jueves de esa semana. */
  var j = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  j.setDate(j.getDate() + 4 - (j.getDay() || 7));
  return j.getFullYear() + '-W' + (w < 10 ? '0' + w : w);
}

function _rtIso_(cel) {
  if (cel instanceof Date) return Utilities.formatDate(cel, RB_TZ_, 'yyyy-MM-dd');
  var m = String(cel == null ? '' : cel).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}

function _rtDiasEntre_(isoA, hoy) {
  var p = String(isoA).split('-');
  if (p.length !== 3) return NaN;
  var a = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  var h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((h - a) / 86400000);
}

function _rtDeclarado_(nombre, semKey, hoy) {
  var out = { semana: {}, noQuiere: {}, mostradas: null };
  /* "No quiere" tambien desde Objetivos Red (5/10/2026, hallazgo de Codex P2).
     El portal nuevo guarda el resultado de cada accion ahi, y la exclusion de 90
     dias solo miraba las tareas viejas: a la semana siguiente le volvia a sugerir
     el mismo cliente que acababa de decir que no. */
  try { out.noQuiere = _roNoQuiere_(nombre, hoy); } catch (eRo) {}
  var sh = _rtHoja_(false);
  if (!sh || sh.getLastRow() <= 1) return out;
  var d = sh.getRange(2, 1, sh.getLastRow() - 1, RT_CAB_.length).getValues();
  for (var i = 0; i < d.length; i++) {
    if (String(d[i][2]).trim() !== nombre) continue;
    var tipo = String(d[i][3]).trim(), clave = String(d[i][4]).trim(), res = String(d[i][5]).trim();
    if (tipo === 'mostradas') {
      if (clave === semKey) out.mostradas = { row: i + 2, val: res };
      continue;
    }
    if (String(d[i][1]).trim() === semKey) out.semana[tipo + '|' + clave] = res;
    if (res === 'No quiere') {
      var dias = _rtDiasEntre_(_rtIso_(d[i][0]), hoy);
      if (!(dias > 90)) out.noQuiere[clave] = 1;
    }
  }
  return out;
}

function _rtTareas_(ctx) {
  var hoy = ctx.hoy, dow = hoy.getDay();
  var modo = (dow >= 1 && dow <= 4) ? 'vender' : 'cerrar';
  var semKey = _rtSemanaKey_(hoy);
  var decl = _rtDeclarado_(ctx.nombre, semKey, hoy);
  var $ = function (n) { return '$' + Math.round(Number(n) || 0).toLocaleString('es-AR'); };
  var T = [];

  if (modo === 'cerrar') {
    // 1. Entregar lo de la semana
    var pendEnt = ctx.pedidos.filter(function (p) { return p.vi && p.es !== 'Entregado' && p.es !== 'Cancelado'; });
    if (pendEnt.length) {
      T.push({ id: 'entregar', clase: 'dato',
        titulo: 'Entregá ' + pendEnt.length + (pendEnt.length === 1 ? ' pedido' : ' pedidos') + ' de tu reparto',
        sub: 'Se tilda solo cuando lo marcás Entregado.',
        items: pendEnt.slice(0, 12).map(function (p) { return { c: p.c, det: (p.b || '') + (p.de ? ' · ' + p.de : ''), n: p.n }; }) });
    }
    // 2. Cobrar lo entregado, cliente por cliente
    var aCobrar = ctx.pedidos.filter(function (p) { return p.es === 'Entregado' && p.ep !== 'Cobrado'; });
    if (aCobrar.length) {
      var sumC = 0; aCobrar.forEach(function (p) { sumC += (p.$ || 0) + (p.env || 0); });
      T.push({ id: 'cobrar', clase: 'dato',
        titulo: 'Cobrá ' + $(sumC) + ' de ' + aCobrar.length + (aCobrar.length === 1 ? ' pedido entregado' : ' pedidos entregados'),
        sub: 'Se tilda solo cuando lo marcás Cobrado.',
        items: aCobrar.slice(0, 12).map(function (p) { return { c: p.c, det: $((p.$ || 0) + (p.env || 0)) + (p.fp ? ' · ' + p.fp : ''), n: p.n }; }) });
    }
    // 3. Rendir a Maleu SOLO lo cobrado en efectivo (desde el 30/9 la
    //    transferencia va directo a Maleu: pedirle esa plata seria pedirle algo
    //    que Maleu ya tiene).
    var porSem = {};
    ctx.pedidos.forEach(function (p) {
      if (p.es === 'Cancelado' || p.ep !== 'Cobrado') return;
      if (p.epm === 'Pagado' || p.epm === 'Sí' || p.epm === 'Si') return;
      /* Mixto (2/10/2026, Codex): lo transferido YA entro a Maleu, asi que se
         descuenta de lo que Maleu tiene que recibir. Caso: A Pagar $80.000,
         $50.000 efectivo + $53.000 transferencia -> rinde $27.000 (antes
         decia $50.000). Y nunca mas que el efectivo que tiene en la mano. */
      /* 7/10/2026: `aPg` ya ES lo que debe, por la regla unica
         (_redDebeAMaleu_): el efectivo desde el 5/10, el Facturado entero en lo
         de antes que sigue abierto (aunque haya sido transferencia a SU cuenta,
         como Fede #112). Recalcularlo aca por forma de pago lo dejaba en $0. */
      var debe = p.aPg || 0;
      if (debe <= 0) return;
      var k = p._y + '-' + (p._sem < 10 ? '0' + p._sem : p._sem);
      porSem[k] = (porSem[k] || 0) + debe;
    });
    var rendir = 0;
    Object.keys(porSem).forEach(function (k) {
      var rendido = (ctx.liqBySem[k] && ctx.liqBySem[k].total) || 0;
      var libre = Math.max(0, rendido - (ctx.cerradoPorSem[k] || 0));
      rendir += Math.max(0, porSem[k] - libre);
    });
    if (rendir > 0) {
      T.push({ id: 'rendir', clase: 'dato', titulo: 'Rendí ' + $(rendir) + ' a Maleu',
        sub: 'Es lo que te pagaron los clientes, entero: tu comisión te la paga Maleu en la quincena. Se tilda solo cuando se registra la rendición.', items: [] });
    }
    // 4. Envios en cero de las ultimas dos semanas: "deci que paso", no "cobralo"
    var envCero = ctx.pedidos.filter(function (p) {
      if (p.es !== 'Entregado' || (p.env || 0) > 0 || p.envAnu) return false;
      var dw = (ctx.yearActual - p._y) * 53 + (ctx.semanaActual - p._sem);
      return dw >= 0 && dw <= 1;
    });
    if (envCero.length) {
      T.push({ id: 'envio', clase: 'dato',
        titulo: 'Decí qué pasó con ' + envCero.length + (envCero.length === 1 ? ' envío' : ' envíos') + ' en $0',
        sub: 'El envío es 100% tuyo. Si lo cobraste, cargalo; si lo regalaste, marcá "No le cobro el envío".',
        items: envCero.slice(0, 8).map(function (p) { return { c: p.c, det: '#' + p.n, n: p.n }; }) });
    }
  } else {
    // 6 y 7: los llamados. Juntos nunca pasan de RT_MAX_LLAMADOS_.
    var hoyD = hoy;
    var dorm = [], seg = [];
    Object.keys(ctx.clientesMap).forEach(function (k) {
      var c = ctx.clientesMap[k];
      if (!c.ultIso || decl.noQuiere[c.n]) return;
      var dUlt = _rtDiasEntre_(c.ultIso, hoyD);
      if (!isFinite(dUlt)) return;
      if (c.count >= 2 && c.primIso) {
        if (decl.semana['recompra|' + c.n]) return;
        var inter = _rtDiasEntre_(c.primIso, hoyD) - dUlt;
        inter = inter / (c.count - 1);
        if (!(inter >= 7)) inter = 7;
        /* Dormido: paso una vez y media su ritmo. Y no perdido: mas de 6 meses
           ya no es un llamado de esta semana. */
        if (dUlt > inter * 1.5 && dUlt <= 180) dorm.push({ c: c, d: dUlt, inter: Math.round(inter) });
      } else if (c.count === 1) {
        if (decl.semana['segunda|' + c.n]) return;
        if (dUlt >= 7 && dUlt < 60) seg.push({ c: c, d: dUlt });
      }
    });
    dorm.sort(function (a, b) { return (b.c.total || 0) - (a.c.total || 0); });
    seg.sort(function (a, b) { return b.d - a.d; });   // al que menos le queda, primero
    var nSeg = Math.min(seg.length, dorm.length ? 1 : RT_MAX_LLAMADOS_);
    var nDorm = Math.min(dorm.length, RT_MAX_LLAMADOS_ - nSeg);
    nSeg = Math.min(seg.length, RT_MAX_LLAMADOS_ - nDorm);
    if (nDorm) {
      T.push({ id: 'recompra', clase: 'blanda',
        titulo: 'Llamá a ' + nDorm + (nDorm === 1 ? ' cliente que no te compra' : ' clientes que no te compran') + ' hace rato',
        sub: 'Ya te compraron más de una vez. Contanos cómo te fue (opcional).',
        items: dorm.slice(0, nDorm).map(function (x) {
          return { c: x.c.n, clave: x.c.n, t: x.c.t || '', det: (x.c.b ? x.c.b + ' · ' : '') + 'hace ' + x.d + ' días (te compraba cada ~' + x.inter + ')' };
        }) });
    }
    if (nSeg) {
      T.push({ id: 'segunda', clase: 'blanda',
        titulo: 'Volvé a ' + nSeg + (nSeg === 1 ? ' cliente que te compró una sola vez' : ' clientes que te compraron una sola vez'),
        sub: 'La segunda compra es la que lo hace cliente. Contanos cómo te fue (opcional).',
        items: seg.slice(0, nSeg).map(function (x) {
          return { c: x.c.n, clave: x.c.n, t: x.c.t || '', det: (x.c.b ? x.c.b + ' · ' : '') + 'compró hace ' + x.d + ' días · le quedan ' + (60 - x.d) };
        }) });
    }
    // 5. El escalon, en PEDIDOS, y solo si el mes alcanza.
    var esc = ctx.escala;
    if (esc && esc.siguiente && esc.siguiente.falta > 0) {
      var ticket = ctx.mes.pedidos ? ctx.mes.facturado / ctx.mes.pedidos : 0;
      if (!(ticket > 0)) {
        var tf = 0, tp = 0;
        Object.keys(ctx.semanasMap).forEach(function (k) { tf += ctx.semanasMap[k].facturado || 0; tp += ctx.semanasMap[k].pedidos || 0; });
        ticket = tp ? tf / tp : 0;
      }
      if (ticket > 0) {
        var faltan = Math.ceil(esc.siguiente.falta / ticket);
        // Ritmo: pedidos por semana de las ultimas 8 con movimiento.
        var ks = Object.keys(ctx.semanasMap).sort().slice(-8), sp = 0;
        ks.forEach(function (k) { sp += ctx.semanasMap[k].pedidos || 0; });
        var ritmo = ks.length ? sp / ks.length : 0;
        var finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        var semRest = Math.max(1, Math.ceil((finMes - hoy) / (7 * 86400000)));
        if (faltan <= Math.ceil(ritmo * semRest * 1.3)) {
          T.push({ id: 'escalon', clase: 'dato',
            titulo: 'Te faltan ' + faltan + (faltan === 1 ? ' pedido' : ' pedidos') + ' para el nivel ' + esc.siguiente.nivel,
            sub: 'Al subir, se te recalcula TODO el mes con el valor nuevo.', items: [] });
        }
      }
    }
  }

  T = T.slice(0, RT_MAX_TAREAS_);

  /* El denominador del experimento: que se le mostro esta semana. Una fila por
     semana y vendedor; se reescribe solo si aparecio algo nuevo. */
  try {
    var cuenta = {};
    if (decl.mostradas && decl.mostradas.val) {
      decl.mostradas.val.split(' · ').forEach(function (p) {
        var kv = p.split(':'); if (kv.length === 2) cuenta[kv[0]] = Number(kv[1]) || 0;
      });
    }
    var antes = JSON.stringify(cuenta);
    T.forEach(function (t) { cuenta[t.id] = Math.max(cuenta[t.id] || 0, (t.items && t.items.length) || 1); });
    /* `_SIN_EFECTOS_` (27/10/2026): el medidor de lecturas arma el portal para compararlo, y
       ningun vendedor vio esas tareas: no se anotan como mostradas. */
    if (!_SIN_EFECTOS_ && JSON.stringify(cuenta) !== antes && T.length) {
      var val = Object.keys(cuenta).sort().map(function (k) { return k + ':' + cuenta[k]; }).join(' · ');
      var shT = _rtHoja_(true);
      if (shT) {
        if (decl.mostradas) shT.getRange(decl.mostradas.row, 6).setValue(val);
        else shT.appendRow([_rbAhoraTxt_(), semKey, ctx.nombre, 'mostradas', semKey, val, '']);
        try { _hojaBaseMarcar_('Tareas Red', 'mostradas'); } catch (eHb) {}
      }
    }
  } catch (eM) { try { _logError_('tareas red (mostradas): ' + eM); } catch (_e) {} }

  return { modo: modo, semana: semKey, lista: T, resultados: RT_RESULTADOS_ };
}

var RO_HOJA_ = 'Objetivos Red';

var RO_CAB_ = ['Semana', 'Vendedor', 'Objetivo', 'Acciones', 'Actualizado', 'Aplausos', 'Cumplió'];

var RO_RESULTADOS_ = ['Compró', 'No contesta', 'No quiere', 'Reprogramó', 'Hecho'];

var RO_MAX_SUGERIDAS_ = 4;   // por tipo

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

function _roNoQuiere_(nombre, hoy) {
  var out = {};
  var sh = _roHoja_(false);
  if (!sh || sh.getLastRow() <= 1) return out;
  var d = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  for (var i = 0; i < d.length; i++) {
    if (String(d[i][1]).trim() !== nombre) continue;
    var acc = [];
    try { acc = JSON.parse(String(d[i][3] || '[]')) || []; } catch (eJ) { acc = []; }
    if (!Array.isArray(acc)) continue;
    acc.forEach(function (a) {
      if (!a || a.res !== 'No quiere' || !a.clave) return;
      var iso = _rtIso_(a.fr) || _roLunesDeSemana_(String(d[i][0]).trim());
      var dias = _rtDiasEntre_(iso, hoy);
      if (!(dias > 90)) out[a.clave] = 1;
    });
  }
  return out;
}

function _roLunesDeSemana_(semKey) {
  var m = /^(\d{4})-W(\d{1,2})$/.exec(semKey);
  if (!m) return '';
  var y = Number(m[1]), w = Number(m[2]);
  var e = new Date(y, 0, 4);                      // el 4 de enero siempre cae en la semana 1
  var lun = new Date(e); lun.setDate(e.getDate() - ((e.getDay() + 6) % 7) + (w - 1) * 7);
  return Utilities.formatDate(lun, RB_TZ_, 'yyyy-MM-dd');
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

function _roGananciaPorVenta_(pedidos) {
  var porSem = {}, porVenta = {};
  (pedidos || []).forEach(function (p) {
    if (p.es === 'Cancelado' || p.cn === false || !p.fe) return;
    var k = p.c.toLowerCase() + '|' + p.fe;
    porVenta[k] = (porVenta[k] || 0) + (Number(p.com) || 0) + (Number(p.env) || 0);
    var sk = p._y + '-' + ('0' + p._sem).slice(-2);
    if (!porSem[sk]) porSem[sk] = {};
    porSem[sk][k] = 1;
  });
  var sems = Object.keys(porSem).sort().slice(-8);
  var n = 0, tot = 0;
  sems.forEach(function (s) { Object.keys(porSem[s]).forEach(function (k) { n++; tot += porVenta[k] || 0; }); });
  return n ? Math.round(tot / n) : null;
}

function _roSugeridas_(clientesMap, hoy, elegidas, noQuiere) {
  var dorm = [], seg = [], rep = [];
  Object.keys(clientesMap || {}).forEach(function (k) {
    var c = clientesMap[k];
    if (!c || !c.ultIso || noQuiere[c.n] || elegidas[c.n]) return;
    var dUlt = _rtDiasEntre_(c.ultIso, hoy);
    if (!isFinite(dUlt)) return;
    var det = c.b ? c.b + ' · ' : '';
    if (c.count >= 2 && c.primIso) {
      var inter = (_rtDiasEntre_(c.primIso, hoy) - dUlt) / (c.count - 1);
      if (!(inter >= 7)) inter = 7;
      inter = Math.round(inter);
      if (dUlt > inter * 1.5 && dUlt <= 180) dorm.push({ tipo: 'dormido', clave: c.n, t: c.t || '', txt: 'Llamar a ' + c.n, det: det + 'hace ' + dUlt + ' días (te compraba cada ~' + inter + ')', _o: -(c.total || 0) });
      else if (dUlt >= inter && dUlt <= inter * 1.5) rep.push({ tipo: 'reponer', clave: c.n, t: c.t || '', txt: 'Ofrecerle reponer a ' + c.n, det: det + 'te compra cada ~' + inter + ' días, la última hace ' + dUlt, _o: -dUlt });
    } else if (c.count === 1 && dUlt >= 7 && dUlt < 60) {
      seg.push({ tipo: 'segunda', clave: c.n, t: c.t || '', txt: 'Volver a ' + c.n, det: det + 'compró una sola vez, hace ' + dUlt + ' días', _o: -dUlt });
    }
  });
  var corta = function (L) {
    L.sort(function (a, b) { return a._o - b._o; });
    return L.slice(0, RO_MAX_SUGERIDAS_).map(function (x) { delete x._o; return x; });
  };
  return corta(rep).concat(corta(seg), corta(dorm));
}

function _roObjetivoPortal_(ctx) {
  var hoy = ctx.hoy;
  var semKey = _rtSemanaKey_(hoy);
  var rango = _roSemanaRango_(hoy);
  var todo = _roLeerTodo_();
  var filas = todo[semKey] || {};
  var ventas = _roVentasSemana_(ctx.data, ctx.cols, rango);
  var mia = filas[ctx.nombre] || { meta: null, acciones: [] };
  var yo = ventas[ctx.nombre] || { lleva: 0, pasadas: 0, ventas: [] };
  var elegidas = {};
  mia.acciones.forEach(function (a) { if (a && a.clave) elegidas[a.clave] = 1; });
  var noQuiere = {};
  try { noQuiere = _rtDeclarado_(ctx.nombre, semKey, hoy).noQuiere || {}; } catch (eD) { noQuiere = {}; }
  /* El equipo: la suma de los que se pusieron objetivo, sin nombres. */
  var eq = { meta: 0, lleva: 0, conMeta: 0 };
  Object.keys(filas).forEach(function (v) {
    if (!filas[v].meta) return;
    eq.conMeta++; eq.meta += filas[v].meta; eq.lleva += (ventas[v] ? ventas[v].lleva : 0);
  });
  var porVenta = _roGananciaPorVenta_(ctx.pedidos);
  var his = _roHistoria_(ctx.nombre, _roVentasPorSemana_(ctx.data, ctx.cols), todo, hoy, mia.meta, yo.lleva);
  /* Efectos de abrir el portal (Marcador, 5/10/2026). Ninguno rompe el portal.
     Con `_SIN_EFECTOS_` (el medidor de lecturas, 27/10/2026) no corre ninguno. */
  if (!_SIN_EFECTOS_) try {
    var props = PropertiesService.getScriptProperties();
    /* Lo que gana por venta, para los Telegram del lunes y del viernes, que no
       arman el portal entero. Se escribe solo si cambió. */
    /* (239, 28/10/2026) Lo que cambia se escribe TAMBIEN en `seller_portal_state`, de donde lo lee
       `red_objetivos_props_pantalla`. Solo las columnas que cambiaron (el upsert no pisa la otra). */
    var _sps = {};
    if (porVenta && props.getProperty('ro_pv_' + ctx.nombre) !== String(porVenta)) { props.setProperty('ro_pv_' + ctx.nombre, String(porVenta)); _sps.per_sale = String(porVenta); }
    /* Cuándo lo abrió él (no el admin en «Ver como»): lo ven Tadeo y Lucas. */
    if (ctx.esSuyo) {
      var cc = CacheService.getScriptCache();
      if (!cc.get('ro_abrio_' + ctx.nombre)) { var _abrio = _rbAhoraTxt_(); props.setProperty('ro_abrio_' + ctx.nombre, _abrio); cc.put('ro_abrio_' + ctx.nombre, '1', 1800); _sps.opened_at = _abrio; }
    }
    if (_sps.per_sale || _sps.opened_at) try {
      var _cfgSps = _crmPgConfig_();
      if (_cfgSps.enabled) { _sps.seller_name = ctx.nombre; _sps.updated_at = new Date().toISOString();
        _crmPgFetch_(_cfgSps, 'post', 'seller_portal_state?on_conflict=seller_name', [_sps]); }
    } catch (eSps) { try { _logError_('seller_portal_state: ' + eSps); } catch (_e) {} }
  } catch (eP) {}
  if (!_SIN_EFECTOS_) try { _roAvisarCumplio_(ctx.nombre, semKey, filas[ctx.nombre], yo.lleva); } catch (eC) {}
  return {
    sem: semKey, lun: rango.lun, dom: rango.dom,
    meta: mia.meta, lleva: yo.lleva, pasadas: yo.pasadas,
    ventas: yo.ventas.slice(0, 40),
    acciones: mia.acciones,
    sugeridas: _roSugeridas_(ctx.clientesMap, hoy, elegidas, noQuiere),
    porVenta: porVenta,
    siLlega: (mia.meta && porVenta) ? porVenta * mia.meta : null,
    equipo: eq,
    foco: _roFoco_(filas),
    resultados: RO_RESULTADOS_,
    hist: his.hist, racha: his.racha, record: his.record,
    cumplidas: his.cumplidas, conMeta: his.conMeta, aplauso: his.aplauso
  };
}

var RO_TODOS_ = '*';

function _roFoco_(filas) {
  var f = filas && filas[RO_TODOS_];
  var a = f && f.acciones && f.acciones[0];
  return (a && a.txt) ? { txt: String(a.txt), por: String(a.por || '') } : null;
}

function _uniValida_(v) {
  var s = String(v || '').trim().toLowerCase();
  return (s === 'kg' || s === 'u') ? s : 'u';
}

var _SECO_ = false;

function _isoWeek(date) {
  const d      = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

var manana = new Date();

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

var _COLMAPS_ = {};

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

var _SIN_EFECTOS_ = false;

function _fechaCorta_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
  return String(v || '').trim().split(' ')[0];
}

function _catPorAbbr_() {
  try {
    var raw = CacheService.getScriptCache().get('prodcat_abbr_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  var out = {};
  try {
    var hp = SS.getSheetByName('Proveedores');
    if (!hp || hp.getLastRow() < 2) return out;
    var d = hp.getDataRange().getValues();
    var lastProd = '';
    for (var r = 1; r < d.length; r++) {
      if (d[r][1] && String(d[r][1]).trim()) lastProd = String(d[r][1]).trim();
      var ab = String(d[r][4] || '').trim();
      if (ab && lastProd && !out[ab]) out[ab] = lastProd;
    }
    try { CacheService.getScriptCache().put('prodcat_abbr_v1', JSON.stringify(out), 300); } catch (e2) {}
  } catch (e3) { return {}; }
  return out;
}


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

})(typeof window !== "undefined" ? window : globalThis);
