/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor del portal del vendedor (191). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
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

function _rtIso_(cel) {
  if (cel instanceof Date) return Utilities.formatDate(cel, RB_TZ_, 'yyyy-MM-dd');
  var m = String(cel == null ? '' : cel).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}

function _isoWeek(date) {
  const d      = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

var manana = new Date();

var mm = String(manana.getMonth()+1).padStart(2,'0');

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

})(typeof window !== "undefined" ? window : globalThis);
