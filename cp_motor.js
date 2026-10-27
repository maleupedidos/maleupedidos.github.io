/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor de Ruta › Cobros (203). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
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

function _cuentasParaPanel_() {
  var cs = _cuentas_(), def = _cuentaDigitalDefault_(), out = [];
  for (var i = 0; i < cs.length; i++) {
    out.push({ id: cs[i].id, nombre: cs[i].nombre, tipo: cs[i].tipo, col: cs[i].col,
               alias: cs[i].alias || '', banco: cs[i].banco || '',
               def: (cs[i].id === def), inv: (cs[i].id === def) });
  }
  return out;
}

function _cobroTextoNorm_(s) {
  return _crmNormNombre(s).replace(/[^a-z0-9]+/g, ' ').trim();
}

function _cobroClaveCasa_(barrio, sub, lote) {
  var l = _cobroTextoNorm_(lote).replace(/^lote /, '').replace(/^0+(?=\d)/, '');
  var sb = _cobroTextoNorm_(sub);
  if (!l || !sb) return '';
  return 'c:' + _cobroTextoNorm_(barrio) + '|' + sb + '|' + l;
}

function _cobroCasasDeHoja_(data, colCliente, colTel, merge, acc) {
  var cab = (data[0] || []).map(function (x) { return String(x || '').trim(); });
  var ix = { b: cab.indexOf('Barrio'), sb: cab.indexOf('Sub Barrio'), l: cab.indexOf('Domicilio - Lote') };
  var claves = [];
  for (var r = 1; r < data.length; r++) {
    var tk = colTel !== null ? _crmNormTel(data[r][colTel]) : '';
    if (tk && merge[tk]) tk = merge[tk];
    var casa = (ix.sb >= 0 && ix.l >= 0)
      ? _cobroClaveCasa_(ix.b >= 0 ? data[r][ix.b] : '', data[r][ix.sb], data[r][ix.l]) : '';
    if (tk && casa) acc.casaDeTel[tk] = casa;
    claves[r] = { casa: casa, tk: tk };
  }
  for (var r2 = 1; r2 < data.length; r2++) {
    var k = claves[r2].casa || (claves[r2].tk ? (acc.casaDeTel[claves[r2].tk] || 't:' + claves[r2].tk) : '');
    var kn = claves[r2].tk ? 't:' + claves[r2].tk : k;
    claves[r2] = { k: k, kn: kn };
    var nom = String(data[r2][colCliente] || '').trim();
    if (!kn || !nom) continue;
    if (!acc.nombres[kn]) acc.nombres[kn] = {};
    acc.nombres[kn][nom] = (acc.nombres[kn][nom] || 0) + 1;
  }
  return claves;
}

function _doGetCobrosPendientes(e) {
  /* Versionado igual que `entregas` (12/9/2026): antes vivia 30 s y ningun POST
     lo tiraba, asi que lo que cobraba Lucas tardaba en aparecer en COBROS de
     Tadeo. Ahora cualquier escritura cambia la version. */
  var _verC = _entregasVer_();
  var _ck = 'cobros_pendientes_v3_' + _verC;
  var _fresh = !!(e && e.parameter && e.parameter.fresh);
  if (!_fresh && _verC) {
    try {
      var _c = CacheService.getScriptCache();
      var _h = _c.get(_ck);
      if (_h) return ContentService.createTextOutput(_h).setMimeType(ContentService.MimeType.JSON);
    } catch (_e) { /* sin cache no rompe */ }
  }
  // colSub/colEnv/colDesc: necesarios para recalcular el total al cambiar forma de pago
  // (aplicar/quitar 10% OFF Efectivo). Home/Pilar v2: N(13)=Subtotal, O(14)=Envío, P(15)=Descuento.
  // Clubes no tiene descuento efectivo.
  var hojas = [
    {name:'Home', colCliente:7, colEst:10, colPago:12, colTotal:21, colTel:46, colFp:11, colDia:9, colFecha:3, colSub:13, colEnv:14, colDesc:15},
    {name:'Pilar', colCliente:7, colEst:10, colPago:12, colTotal:21, colTel:49, colFp:11, colDia:9, colFecha:3, colSub:13, colEnv:14, colDesc:15},
    {name:'Clubes', colCliente:7, colEst:13, colPago:15, colTotal:16, colTel:null, colFp:14, colDia:12, colFecha:3, colSub:null, colEnv:null, colDesc:null}
  ];
  // ── Cargar parciales acumulados por pedido (clave: hoja|id) ──
  var parcialesPorPed = {}; // { 'Clubes|33': { total: 1170983, items: [{fp,monto,fecha}, ...] } }
  var shCP = SS.getSheetByName('Cobros Parciales');
  if (shCP && shCP.getLastRow() > 1) {
    var cpData = shCP.getDataRange().getValues();
    for (var rcp = 1; rcp < cpData.length; rcp++) {
      var cpHoja = String(cpData[rcp][1] || '').trim();
      var cpId   = String(cpData[rcp][2] || '').trim();
      if (!cpHoja || !cpId) continue;
      var cpFp = String(cpData[rcp][4] || '').trim();
      var cpMonto = Number(cpData[rcp][5]) || 0;
      var cpFecha = cpData[rcp][0];
      var cpFechaStr = (cpFecha instanceof Date)
        ? Utilities.formatDate(cpFecha, 'America/Argentina/Buenos_Aires', 'dd/MM HH:mm')
        : String(cpFecha || '');
      var k = cpHoja + '|' + cpId;
      if (!parcialesPorPed[k]) parcialesPorPed[k] = { total: 0, items: [] };
      parcialesPorPed[k].total += cpMonto;
      parcialesPorPed[k].items.push({ fp: cpFp, monto: cpMonto, fecha: cpFechaStr });
    }
  }

  /* Productos del pedido, para el cuadro de Cobros (PRODUCTOS_COBRO_POR_MAPA).
     Hasta el 14/9/2026 eran tres listas escritas a mano con offsets fijos: la de
     Home tenia 19 productos y ninguna conocia la carne ni los sorrentinos premium
     de Home. El cuadro de cobro de PMO (dos pedidos de carne) salia sin un solo
     producto. Es la sexta lista del mismo dato que se despega: ahora se recorre el
     mapa canonico de cada hoja, que es el que ya usan el stock y el volcado. */
  function _prodsDelCobro(row, hojaName) {
    var mapa = (hojaName === 'Home') ? _colsAbbr_('Home')
             : (hojaName === 'Pilar') ? _colsAbbr_('Pilar')
             : (hojaName === 'Clubes') ? _colsAbbr_('Clubes') : null;
    var res = [];
    if (!mapa) return res;
    Object.keys(mapa).map(Number).sort(function (a, b) { return a - b; }).forEach(function (col) {
      var q = Number(row[col - 1]) || 0;
      if (q > 0) res.push({ a: mapa[col], q: q });
    });
    return res;
  }
  var out = [];
  /* Pedidos Red que el vendedor ya rindio y siguen sin marcar. Se llena dentro
     del recorrido de la hoja Red, mas abajo. */
  var sinCerrarRed = [];
  var _casas = { casaDeTel: {}, nombres: {} }, _mergeCob = {};
  try { _mergeCob = _crmGetMergeMap(); } catch (_eMg) { _mergeCob = {}; }
  hojas.forEach(function(cfg) {
    var sh = SS.getSheetByName(cfg.name);
    if (!sh || sh.getLastRow() <= 1) return;
    var data = sh.getDataRange().getValues();
    /* Clubes no tiene lote ni telefono: sigue por nombre, en el front. */
    var _clavesFila = cfg.colTel !== null ? _cobroCasasDeHoja_(data, cfg.colCliente, cfg.colTel, _mergeCob, _casas) : [];
    var _ixGrp = (data[0] || []).map(function (x) { return String(x || '').trim(); }).indexOf(GRUPAL_COL_);
    for (var r = 1; r < data.length; r++) {
      var estado = String(data[r][cfg.colEst] || '').trim();
      var pago = String(data[r][cfg.colPago] || '').trim();
      if (estado === 'Cancelado') continue;
      if (pago === 'Cobrado') continue;
      var id = data[r][1];
      if (!id || String(id).trim() === '-') continue;
      var DIAS_COB = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      // Fecha del pedido (col D) — solo para fallback si no hay fecha entrega
      var fecha = data[r][cfg.colFecha];
      var fechaPedStr = '';
      if (fecha instanceof Date) fechaPedStr = Utilities.formatDate(fecha, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
      else fechaPedStr = String(fecha || '').trim();
      // Día de Entrega Elegido (col J Home/Pilar, col M Clubes) — fuente de orden
      // Puede venir como Date, como texto "dd/MM/yyyy", o como nombre del día (pedidos viejos)
      var diaRawCob = data[r][cfg.colDia];
      var diaCob = '', feEntStr = '';
      if (diaRawCob instanceof Date) {
        diaCob = DIAS_COB[diaRawCob.getDay()];
        feEntStr = Utilities.formatDate(diaRawCob, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
      } else {
        var raw = String(diaRawCob || '').trim();
        var mCob = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mCob) {
          var dCob = new Date(Number(mCob[3]), Number(mCob[2]) - 1, Number(mCob[1]));
          diaCob = DIAS_COB[dCob.getDay()];
          feEntStr = raw;
        } else {
          // Solo tenemos nombre del día (ej. "Viernes") — dejamos feEntStr vacío
          diaCob = raw;
        }
      }
      // fe = fecha usada para ORDENAR/AGRUPAR en el frontend. Preferencia: día de
      // entrega elegido; fallback: fecha de pedido (pedidos viejos sin col J).
      var feSort = feEntStr || fechaPedStr;
      var totalPed = Number(data[r][cfg.colTotal]) || 0;
      var keyPed = cfg.name + '|' + id;
      var parc = parcialesPorPed[keyPed];
      var parcialTotal = parc ? parc.total : 0;
      var restantePed = parcialTotal > 0 ? Math.max(0, Math.round(totalPed - parcialTotal)) : totalPed;
      // Si los parciales ya cubren el total, el pedido debería estar Cobrado.
      // Lo dejamos pasar al frontend para que se cierre vía cobrar (defensivo).
      if (restantePed <= 0) continue;

      out.push({
        key: cfg.name + '|' + id,
        h: cfg.name,
        id: String(id),
        r: r + 1,
        /* El dia en que se cargo (col «Fecha»): tope hacia atras de «¿Cuándo cobraste?» (13/10/2026). */
        fc: (data[r][3] instanceof Date) ? Utilities.formatDate(data[r][3], 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy') : '',
        c: String(data[r][cfg.colCliente] || '').trim(),
        t: cfg.colTel !== null ? String(data[r][cfg.colTel] || '').trim() : '',
        ck: (_clavesFila[r] && _clavesFila[r].k) || '',   // la casa (o el telefono): agrupa las tarjetas
        cn: (_clavesFila[r] && _clavesFila[r].kn) || '',  // por ahora la clave del nombre; se resuelve al final
        '$': restantePed,                 // saldo pendiente real
        totalOriginal: totalPed,           // total facturado del pedido
        cobradoParcial: parcialTotal,      // ya cobrado en parciales
        parciales: parc ? parc.items : [], // detalle
        fp: String(data[r][cfg.colFp] || '').trim(),
        de: diaCob,
        fe: feSort,
        fePed: fechaPedStr,
        feEnt: feEntStr,
        es: estado,
        // Datos para recalcular total si cambia la forma de pago (aplicar/quitar 10% Efectivo)
        sub: cfg.colSub !== null ? (Number(data[r][cfg.colSub]) || 0) : 0,
        env: cfg.colEnv !== null ? (Number(data[r][cfg.colEnv]) || 0) : 0,
        desc: cfg.colDesc !== null ? (Number(data[r][cfg.colDesc]) || 0) : 0,
        // Saldo a favor ya aplicado (BI/BL negativo, de la tienda): el cuadro lo
        // resta al recalcular sub+env-desc, o le cobraba el saldo de nuevo (6/10/2026).
        sAp: (cfg.name === 'Clubes') ? 0 : Math.max(0, -(Number(data[r][cfg.name === 'Pilar' ? 63 : 60]) || 0)),
        /* El evento (columna «Grupal», 26/10/2026): Cobros junta los pedidos del
           mismo evento aunque sean de otra casa, ver `_claveCliente` en Ruta. */
        grp: _ixGrp >= 0 ? _grupalValor_(data[r][_ixGrp]) : '',
        p: _prodsDelCobro(data[r], cfg.name)   // productos del pedido (para el cuadro de Cobros)
      });
    }
  });

  // Red: agrupar por Vendedor. Lo que Tadeo le cobra al vendedor es lo que el
  // vendedor ya cobró (o adeuda) al cliente — el filtro correcto es por
  // "Estado Pago a Maleu" (BB, idx 53), NO por "Estado de Pago" al cliente
  // (col N, idx 13). Un pedido con Cliente=Cobrado pero Maleu=Pendiente
  // significa que Marcos cobró pero todavía no rindió a Maleu, y debe
  // aparecer en cobros pendientes igual.
  // Comisión: sale de _comisionPct() (hoja Vendedores col J). Antes esta función
  // se armaba su propio mapa leyendo la hoja aparte; ahora hay una sola fuente.
  var shRed = SS.getSheetByName('Red');
  if (shRed && shRed.getLastRow() > 1) {
    var dRed = shRed.getDataRange().getValues();
    // Ubicar columnas por header (Red puede crecer en columnas)
    var hdrRed = dRed[0];
    var idxEstPagoMaleu = -1, idxFpMaleu = -1, idxEntVend = -1;
    for (var hh = 0; hh < hdrRed.length; hh++) {
      var nm = String(hdrRed[hh]).trim();
      if (nm === 'Estado Pago a Maleu') idxEstPagoMaleu = hh;
      else if (nm === 'Forma Pago a Maleu') idxFpMaleu = hh;
      else if (nm === 'Entregado a Vendedor') idxEntVend = hh;
    }
    // Index de "A Pagar" (col real en Sheets): es lo que el vendedor le debe a
    // Maleu por pedido — ya tiene aplicada la comisión que corresponda. Se prefiere
    // esto al cálculo 17%-plano porque algunos pedidos (familia del vendedor,
    // ajustes manuales) tienen comisión 0 hardcodeada. Caso 30/06/2026: Marcos
    // R-45 y R-46 a Juan Cruz Bottcher con comisión $0 — el Panel cobraba $11.900
    // de más al aplicar 17% al bruto total.
    var idxAPagar = -1;
    for (var hhA = 0; hhA < hdrRed.length; hhA++) {
      if (String(hdrRed[hhA]).trim() === 'A Pagar') { idxAPagar = hhA; break; }
    }
    // Pagos parciales ya registrados (hoja "Pagos Red Liq"), indexados por
    // vendedor+año+semana. Sin esto, un vendedor que ya rindió parte desde SU panel
    // seguía figurando en Ruta por el importe COMPLETO de la semana (las filas
    // recién se marcan "Pagado" cuando la semana se cubre entera). Tadeo le cobraba
    // de más. Misma fuente que usa el panel del vendedor en _yaPagado(). (07/08/2026)
    var liqPrevias = {};
    var shLiqPrev = SS.getSheetByName('Pagos Red Liq');
    if (shLiqPrev && shLiqPrev.getLastRow() > 1) {
      var dLiqPrev = shLiqPrev.getRange(2, 1, shLiqPrev.getLastRow() - 1, 8).getValues();
      for (var rlp = 0; rlp < dLiqPrev.length; rlp++) {
        var vLp = String(dLiqPrev[rlp][2] || '').trim();
        if (!vLp) continue;
        var kLp = vLp + '|' + (Number(dLiqPrev[rlp][3]) || 0) + '|' + (Number(dLiqPrev[rlp][4]) || 0);
        if (!liqPrevias[kLp]) liqPrevias[kLp] = { ef: 0, tr: 0 };
        liqPrevias[kLp].ef += Number(dLiqPrev[rlp][5]) || 0;
        liqPrevias[kLp].tr += Number(dLiqPrev[rlp][6]) || 0;
      }
    }

    // Lo que las liquidaciones de cada semana YA consumieron cerrando pedidos.
    // Clave: vendedor|año|semana → suma de "A Pagar" de los pedidos de esa semana
    // que ya están marcados "Pagado a Maleu".
    //
    // Sin esto, un pago se descontaba DOS VECES. Caso Fini, semana 34 (31/08/2026):
    // rindió $88.976, que cerraron exactamente los pedidos que cubría. Quedó abierto
    // el #90 (Valentina Llanos, $114.540) porque la clienta todavía no le pagó. Como
    // liqPrevias tiene los $88.976 de la semana pero v.sems solo suma los pedidos
    // PENDIENTES, el saldo salía $114.540 − $88.976 = $25.564. Tadeo le iba a cobrar
    // $88.976 de menos.
    var pagadoCerradoSem = {};
    var porVendedor = {};
    for (var r = 1; r < dRed.length; r++) {
      var estado = String(dRed[r][11] || '').trim(); // col 12 Estado Entrega
      if (estado === 'Cancelado') continue;
      // Solo contamos pedidos que Tadeo YA le entregó al vendedor (col BE).
      // Si Tadeo todavía no le pasó la mercadería (entrega futura), el vendedor
      // no podría haber cobrado nada — no debe aparecer en su saldo a Maleu.
      // Reportado por Tadeo (17/05/2026): Marcos sumaba pedidos de la semana
      // siguiente que aún no había recibido de Tadeo.
      var entVend = idxEntVend >= 0 ? String(dRed[r][idxEntVend] || '').trim() : '';
      if (entVend !== 'Entregado') continue;
      var vendedor = String(dRed[r][7] || '').trim(); // col 8 Vendedor
      if (!vendedor) continue;
      var pedId = dRed[r][1];
      if (!pedId) continue;
      var total = Number(dRed[r][14]) || 0; // col 15 Total
      // A Pagar real por pedido (col 49). Fallback al cálculo 83%-plano si la
      // columna no existe o está vacía (pedidos viejos sin la col).
      var aPagarPed = idxAPagar >= 0 ? (Number(dRed[r][idxAPagar]) || 0) : 0;
      /* Desde el 5/10/2026 el vendedor solo debe el efectivo que cobro, entero
         (ver _redDebeAMaleu_). Una transferencia no le deja nada que entregar. */
      var _deb = _redDebeAMaleu_(dRed[r], idxAPagar);
      /* Desde el 7/10/2026 tambien lo de la regla vieja: el Facturado entero
         (lo cerrado antes de esa fecha conserva el A Pagar con que se cerro). */
      aPagarPed = _deb.debe;
      var semPed0 = Number(dRed[r][5]) || 0;
      var anioPed0 = Number(dRed[r][6]) || 0;
      // Un pedido ya rendido sale del saldo, pero antes hay que anotar CUÁNTO de
      // la liquidación de su semana se fue en él.
      var estPagoMaleu = idxEstPagoMaleu >= 0 ? String(dRed[r][idxEstPagoMaleu] || '').trim() : '';
      if (estPagoMaleu === 'Pagado' || estPagoMaleu === 'Sí' || estPagoMaleu === 'Si') {
        var kCerr = vendedor + '|' + anioPed0 + '|' + semPed0;
        var aPagarCerr = (aPagarPed > 0 || _deb.nueva)
          ? aPagarPed
          : Math.round(total * (100 - _comisionPct(vendedor)) / 100);
        pagadoCerradoSem[kCerr] = (pagadoCerradoSem[kCerr] || 0) + aPagarCerr;
        /* RENDIDO PERO SIN CERRAR. El vendedor ya le pago a Maleu — y nadie paga
           mercaderia que no entrego — pero el pedido sigue diciendo "Pendiente"
           o "No Cobrado" porque los vendedores no usan el ERP y nadie lo marca.
           Se detecta ACA, en el mismo recorrido que ya los descarta del saldo:
           un segundo barrido seria una segunda definicion de "rendido".
           El 6/9/2026 habia 13 asi, acumulados desde julio, y nada los avisaba. */
        var _estPagoCli = String(dRed[r][13] || '').trim();   // col 14 Estado de Pago
        if (estado !== 'Entregado' || _estPagoCli !== 'Cobrado') {
          var _faltaC = [];
          if (estado !== 'Entregado') _faltaC.push('entrega');
          if (_estPagoCli !== 'Cobrado') _faltaC.push('cobro');
          sinCerrarRed.push({
            row: r + 1, id: String(pedId), vendedor: vendedor,
            cliente: String(dRed[r][8] || '').trim(),
            dia: _fechaCorta_(dRed[r][10]),                    // col 11 Dia de Entrega
            /* Facturado (col 21), NO "Total ($)" (col 15, que lleva el envio):
               es la misma cifra con la que miden Ventas y el EERR. */
            total: Number(dRed[r][20]) || 0, falta: _faltaC
          });
        }
        continue;
      }
      if (_deb.nueva && !(_deb.debe > 0)) continue;   // le pago a Maleu: no debe nada
      /* LOS REPRESENTANTES NO COBRAN (27/10/2026, Tadeo): el efectivo que un representante
         "te tiene que entregar" es solo el que YA cobro (lo tiene en la mano). Lo que el cliente
         todavia no pago lo cobra Maleu: va a la lista de clientes de Cobros, no a el. */
      if (_deb.nueva && String(dRed[r][13] || '').trim() !== 'Cobrado') continue;
      var fechaV = dRed[r][3];
      var fechaStr = fechaV instanceof Date
        ? Utilities.formatDate(fechaV, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy')
        : String(fechaV || '').trim();
      if (!porVendedor[vendedor]) {
        porVendedor[vendedor] = {
          vendedor: vendedor,
          ids: [],
          totalBruto: 0,
          totalAPagar: 0,
          fechas: [],
          tel: '',
          fps: {},
          sems: {},
          efNuevo: 0, nNuevo: 0, leDebe: 0, leDebePend: 0
        };
      }
      var v = porVendedor[vendedor];
      v.ids.push(String(pedId));
      if (_deb.nueva) {
        v.efNuevo += aPagarPed; v.nNuevo++;
        /* Pedido por pedido (24/10/2026): la card decia «efectivo que le dieron»
           por un pedido que el cliente todavia no habia pagado (Fede #2023). */
        (v.efPeds = v.efPeds || []).push({ n: String(pedId), c: String(dRed[r][8] || '').trim(),
          dia: _fechaCorta_(dRed[r][10]), ef: aPagarPed,
          cob: String(dRed[r][13] || '').trim() === 'Cobrado', ent: estado === 'Entregado' });
      }
      else {
        v.totalBruto += aPagarPed; v.totalAPagar += aPagarPed;
        /* La comision se liquida SOLO de lo entregado y cobrado (regla del
           5/10/2026, la misma de la tab Vendedores y del portal). Hasta el
           8/10 aca se sumaba la de todo lo abierto: Marcos figuraba con «Maleu
           le debe $54.100» por 4 pedidos sin marcar, y la tab Vendedores no le
           mostraba nada. Lo de los sin marcar va aparte: se le debe cuando los
           marque. */
        if (estado === 'Entregado' && String(dRed[r][13] || '').trim() === 'Cobrado') v.leDebe += _deb.leDebe || 0;
        else v.leDebePend += _deb.leDebe || 0;
      }
      v.fechas.push(fechaStr);
      // Desglose por semana ISO (cols F=Semana, G=Año). El cobro a vendedor se
      // liquida SEMANA POR SEMANA igual que en el portal del vendedor, así que
      // Ruta necesita ver el mismo corte para poder cobrar parcial.
      var semPed = Number(dRed[r][5]) || 0;
      var anioPed = Number(dRed[r][6]) || 0;
      var skPed = anioPed + '|' + semPed;
      if (!v.sems[skPed]) v.sems[skPed] = { year: anioPed, sem: semPed, n: 0, bruto: 0, aPagar: 0, fd: '', fh: '' };
      v.sems[skPed].n++;
      /* De cuando son los pedidos de esa semana (8/10/2026): las pantallas de
         admin la nombran con el calendario de Maleu («Sem 1 · oct»), no con el
         numero ISO. Por el DIA DE ENTREGA (col K): en Red la venta se fecha por
         el dia acordado. La semana ISO sigue siendo la unidad de la rendicion. */
      var _fK = dRed[r][10];
      var _fn = _redFechaNum_(_fK);
      if (_fn) {
        var _fKs = _fK instanceof Date ? Utilities.formatDate(_fK, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy') : String(_fK).trim();
        var _fs = v.sems[skPed];
        if (!_fs.fd || _fn < _redFechaNum_(_fs.fd)) _fs.fd = _fKs;
        if (!_fs.fh || _fn > _redFechaNum_(_fs.fh)) _fs.fh = _fKs;
      }
      if (!_deb.nueva) v.sems[skPed].bruto += aPagarPed;
      else v.sems[skPed].efNuevo = (v.sems[skPed].efNuevo || 0) + aPagarPed;
      v.sems[skPed].aPagar += aPagarPed;
      // Forma Pago: priorizar "Forma Pago a Maleu" (BA) si está; fallback a Forma Pago al cliente (M)
      var fpRed = idxFpMaleu >= 0 ? String(dRed[r][idxFpMaleu] || '').trim() : '';
      if (!fpRed) fpRed = String(dRed[r][12] || '').trim();
      if (fpRed) v.fps[fpRed] = (v.fps[fpRed] || 0) + 1;
    }
    // Convertir en cobros (uno por vendedor)
    Object.keys(porVendedor).forEach(function(vName) {
      var v = porVendedor[vName];
      var comPct = _comisionPct(vName);
      // Si todos los pedidos del vendedor tienen "A Pagar" cargado, usar la suma
      // real. Si no, fallback al cálculo plano por % de comisión.
      var neto, comision;
      if (v.totalAPagar > 0) {
        neto = v.totalAPagar;
        /* Ya no se descuenta (7/10/2026): es lo que MALEU le debe, y se le paga
           en la quincena. Se manda para que la card lo diga. */
        comision = v.leDebe;
      } else {
        comision = v.leDebe;
        neto = v.totalBruto;
      }
      neto += v.efNuevo;   // el efectivo de la regla nueva va entero
      // Fecha mas vieja
      var fechasValidas = v.fechas.filter(Boolean).sort(function(a,b){
        var pa=a.split('/'),pb=b.split('/');
        var ta=new Date(+pa[2],+pa[1]-1,+pa[0]).getTime();
        var tb=new Date(+pb[2],+pb[1]-1,+pb[0]).getTime();
        return ta-tb;
      });
      var fpDom = Object.keys(v.fps).sort(function(a,b){return v.fps[b]-v.fps[a]})[0] || 'Transferencia';
      // Desglose por semana + descuento de lo ya rendido. Cada semana se liquida
      // sola: un excedente en una semana NO se compensa contra otra (por eso el
      // Math.max(0,...) y el Math.min(...) en vez de un neteo global).
      var semsArr = [];
      var yaPagadoTotal = 0, netoPendiente = 0;
      Object.keys(v.sems).forEach(function(sk) {
        var s = v.sems[sk];
        // Fallback plano por si los pedidos viejos no tienen la col "A Pagar".
        var aPagarSem = s.aPagar > 0 ? s.aPagar : Math.round(s.bruto * (100 - comPct) / 100);        var lp = liqPrevias[vName + '|' + s.year + '|' + s.sem] || { ef: 0, tr: 0 };
        var ya = lp.ef + lp.tr;
        // Del total rendido en la semana, la parte que ya se consumió cerrando
        // pedidos NO puede volver a descontarse contra los que siguen abiertos.
        // Solo el excedente (lo rendido por encima de lo que cerró) es un pago
        // a cuenta de los pendientes. Ver el comentario de pagadoCerradoSem.
        var yaCerrado = pagadoCerradoSem[vName + '|' + s.year + '|' + s.sem] || 0;
        var yaLibre = Math.max(0, ya - yaCerrado);
        var saldoSem = Math.max(0, aPagarSem - yaLibre);
        yaPagadoTotal += Math.min(yaLibre, aPagarSem);
        netoPendiente += saldoSem;
        semsArr.push({ year: s.year, sem: s.sem, n: s.n, bruto: s.bruto,
                       aPagar: aPagarSem, yaPagado: yaLibre, saldo: saldoSem, fd: s.fd || '', fh: s.fh || '' });
      });
      semsArr.sort(function(a, b) { return (a.year - b.year) || (a.sem - b.sem); });
      out.push({
        key: 'Red|vendedor:' + vName,
        h: 'Red',
        id: v.ids.join(','),
        c: vName + ' (Vendedor Red)',
        t: '',
        // $ = lo que REALMENTE falta cobrar (neto menos lo ya rendido en parciales).
        '$': netoPendiente,
        fp: fpDom,
        de: '',
        fe: fechasValidas[0] || '',
        isVendedor: true,
        pedidosIds: v.ids,
        totalBruto: v.totalBruto,
        comision: comision,
        comisionPct: comPct,
        aPagarTotal: neto,        // neto completo, antes de descontar parciales
        /* Partido por regla (6/10/2026): `efNuevo` = efectivo que cobro desde el
           5/10 y entrega entero; lo demas es la liquidacion vieja (bruto − comision). */
        efNuevo: v.efNuevo, nNuevo: v.nNuevo, nViejo: v.ids.length - v.nNuevo, efPeds: v.efPeds || [],
        leDebeViejo: v.leDebe,   // comision de lo viejo que Maleu le paga en la quincena (7/10/2026)
        leDebeSinMarcar: v.leDebePend,   // la de los pedidos que todavia no marco entregado y cobrado (8/10/2026)
        yaPagado: yaPagadoTotal,  // lo ya rendido (desde el portal del vendedor)
        sems: semsArr
      });
    });
  }

  // Billetera (fondo de cambio): la PWA Ruta la muestra en el cuadro de Cobros para
  // saber cuánto tenés para dar vuelto y descontarla al devolver cambio.
  var _bilRuta = 0;
  try {
    var _shSBb = SS.getSheetByName('Saldo Base');
    if (_shSBb && _shSBb.getLastRow() > 1 && _shSBb.getLastColumn() >= 4) {
      _bilRuta = Number(_shSBb.getRange(_shSBb.getLastRow(), 4).getValue()) || 0;
    }
  } catch (_eb) { /* nada */ }
  /* Agrupado por vendedor: la pantalla muestra una fila por vendedor, no 13
     pedidos sueltos — la accion es "Fini rindio, cerrale todo". */
  var _sinCerrarPorVend = {};
  sinCerrarRed.forEach(function(p) {
    if (!_sinCerrarPorVend[p.vendedor]) {
      _sinCerrarPorVend[p.vendedor] = { vendedor: p.vendedor, n: 0, total: 0, peds: [] };
    }
    var g = _sinCerrarPorVend[p.vendedor];
    g.n++; g.total += p.total; g.peds.push(p);
  });
  var _sinCerrar = Object.keys(_sinCerrarPorVend).map(function(k) { return _sinCerrarPorVend[k]; })
    .sort(function(a, b) { return b.total - a.total; });

  /* Las cuentas de cobro, para que el cuadro pueda preguntar a donde entro la
     transferencia. Van con las marcas `def`/`inv` que ya calcula el backend:
     derivarlas del otro lado seria una segunda definicion de cual es la cuenta
     por defecto. */
  /* La carne del cobro (14/9/2026): que pieza se llevo, y el nombre y la unidad
     de cada producto — sin `prods` la carne salia "0.668x CEn". */
  try { _entregasConPiezas_(out, true); } catch (_ePz) {}
  var _bilVivas = null;
  try { _bilVivas = _billeterasVivas_(); } catch (_eBv) { /* el aviso no es parte del cobro */ }
  /* El nombre del cliente: el mas repetido de su telefono en toda su historia. */
  out.forEach(function (o) { if (o.cn) o.cn = _crmTopValue(_casas.nombres[o.cn]) || ''; });
  var _resp = JSON.stringify({ts: Date.now(), cobros: out, billetera: _bilRuta, billeteras: _bilVivas,
                              sinCerrar: _sinCerrar, saldos: _saldosPorCliente_(),
                              cuentas: _cuentasParaPanel_(), prods: _nombresYUnidades_(),
                              redEf: _cobroRedondeoOn_()});   /* redondeo del efectivo (19/10/2026) */
  if (_verC) { try { CacheService.getScriptCache().put(_ck, _resp, ENTREGAS_CACHE_SEG); } catch (_e) { /* nada */ } }
  return ContentService.createTextOutput(_resp).setMimeType(ContentService.MimeType.JSON);
}

var ENTREGAS_CACHE_SEG = 120;

function _entregasConPiezas_(entregas, conEntregadas) {
  if (!entregas || !entregas.length) return;
  var piezas = _piezasLeer_();
  if (!piezas.length) return;
  var porRef = {};
  for (var i = 0; i < piezas.length; i++) {
    var p = piezas[i];
    var est = String(p.estado || '').trim().toLowerCase();
    /* COBROS pasa `conEntregadas`: un pedido que se cobra casi siempre ya se
       entrego, y su pieza ya salio del freezer (14/9/2026). */
    if (!p.abbr || !p.pedido || !(est === 'asignada' || (conEntregadas && est === 'entregada'))) continue;
    (porRef[p.pedido] = porRef[p.pedido] || []).push({ a: p.abbr, id: p.id, kg: p.peso });
  }
  entregas.forEach(function (e) {
    var l = porRef[e.h + ' #' + e.id];
    if (!l) return;
    e.pz = l.slice().sort(function (x, y) { return (x.a < y.a ? -1 : (x.a > y.a ? 1 : 0)) || (x.kg - y.kg); });
  });
}

function _nombresYUnidades_() {
  try {
    var raw = CacheService.getScriptCache().get('prod_nom_uni_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  var out = {};
  try {
    var hp = SS.getSheetByName('Productos');
    if (!hp || hp.getLastRow() < 2) return out;
    var d = hp.getDataRange().getValues();
    for (var r = 1; r < d.length; r++) {
      var ab = String(d[r][2] || '').trim();
      if (!ab) continue;
      out[ab] = { n: String(d[r][1] || '').trim(), u: _uniValida_(d[r][16]) };
    }
    try { CacheService.getScriptCache().put('prod_nom_uni_v1', JSON.stringify(out), 300); } catch (e2) {}
  } catch (e3) { return {}; }
  return out;
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

function _uniValida_(v) {
  var s = String(v || '').trim().toLowerCase();
  return (s === 'kg' || s === 'u') ? s : 'u';
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

function _cobroRedondeoOn_() {
  var m = String(_cfgTexto_('COBRO_REDONDEO', 'no') || '').trim().toLowerCase();
  return m === 'si' || m === 'sí';
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

function _crmTopValue(map) {
  var top = '', max = 0;
  Object.keys(map || {}).forEach(function(k) {
    if (map[k] > max) { max = map[k]; top = k; }
  });
  return top;
}

var GRUPAL_COL_ = 'Grupal';

function _grupalValor_(v) {
  if (v === true || v === 'true') return 'Sí';
  var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return s.length > 80 ? s.slice(0, 80) : s;
}

function _fechaCorta_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
  return String(v || '').trim().split(' ')[0];
}

function _saldoSumar_(acc, key, tipo, monto) {
  if (!key) return;
  var t = String(tipo || '').trim();
  var m = Number(monto) || 0;
  if (t === 'Crédito' || t === 'Credito') acc[key] = (acc[key] || 0) + m;
  else if (t === 'Aplicación' || t === 'Aplicacion') acc[key] = (acc[key] || 0) - m;
}

var _SALDOS_MEMO_ = null;

function _saldosPorCliente_() {
  if (_SALDOS_MEMO_) return _SALDOS_MEMO_;
  var res = {};
  try {
    var sh = SS.getSheetByName('Saldos Clientes');
    if (sh && sh.getLastRow() > 1) {
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues();
      var acc = {};
      for (var i = 0; i < data.length; i++)
        _saldoSumar_(acc, String(data[i][1] || '').toLowerCase().trim(), data[i][3], data[i][4]);
      Object.keys(acc).forEach(function (k) {
        var v = Math.max(0, Math.round(acc[k]));
        if (v > 0) res[k] = v;
      });
    }
  } catch (e) { /* la hoja puede no existir: un cartel de menos, nunca un error */ }
  _SALDOS_MEMO_ = res;
  return res;
}


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

})(typeof window !== "undefined" ? window : globalThis);
