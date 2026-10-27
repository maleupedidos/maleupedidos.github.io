/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor de Mi reparto (204). Ver el encabezado de _tools/copiar_motor.js. */
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

/* EL MOTOR DE «MI REPARTO» (204, 27/10/2026). Va despues de motor_comun_shim.js; _tools/copiar_motor.js
   pone donde dice MOTOR (entre barra-asterisco) `_doGetMiReparto` y lo que llama, copiado de Code.js. Lo
   de abajo presenta los datos de `mi_reparto_pantalla` (204) como las hojas que lee: Home (las entregas
   de ese dia de ese repartidor, en sus columnas por encabezado), Cambios Billetera y la col D de Saldo
   Base. Las billeteras de hoy las da la base (174). «Cierres Reparto» no esta: `cierreDia` null. */
var _MR = {};
function _billeterasVivas_() { var b = (_MR.bil || {}).billeteras || {}; return { activo: !!b.activo, personas: b.personas || [], bil: b.bil || {}, corte: b.corte || '' }; }


function _doGetMiReparto(e) {
  var usuario = String((e && e.parameter && e.parameter.usuario) || '').trim();
  var fechaISO = String((e && e.parameter && e.parameter.fecha) || '').trim();
  if (!usuario) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, err:'Falta usuario'})).setMimeType(ContentService.MimeType.JSON);
  }
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, err:'Fecha inválida (YYYY-MM-DD)'})).setMimeType(ContentService.MimeType.JSON);
  }

  var FIJO_DIA = 50000;

  // ── Saldo billetera (caja Maleu) ── desde último snapshot Saldo Base col D.
  // Tadeo lo edita en Panel→Caja→Ajustar. El repartidor ve este valor al refrescar.
  var saldoBilletera = 0;
  var shSB = SS.getSheetByName('Saldo Base');
  if (shSB && shSB.getLastRow() > 1 && shSB.getLastColumn() >= 4) {
    saldoBilletera = Number(shSB.getRange(shSB.getLastRow(), 4).getValue()) || 0;
  }
  /* LA BILLETERA DE CADA UNO (16/10/2026). Con billeteras por persona la col D es
     la SUMA de las dos (15/10: Tadeo 21.550 + Lucas 21.550 = 43.100) y Tadeo veia
     «Saliste con $43.100». Si quien consulta tiene billetera propia, es la suya de
     HOY (la misma cuenta que la caja); si no tiene (un repartidor), $0: ver _bilDeQuienConsulta_. */
  try {
    saldoBilletera = _bilDeQuienConsulta_(_billeterasVivas_(), usuario, saldoBilletera);
  } catch (eBv) { try { _logError_('miReparto billetera por persona: ' + eBv); } catch (e2) {} }

  // ── Reconstruir la billetera INICIAL del día + ajustes de efectivo en mano ──
  // El arqueo necesita la billetera con la que ARRANCASTE el día, no la actual: cada
  // vuelto de billetera bajó la col D, así que lo sumamos de vuelta. Además los cambios
  // cruzados mueven efectivo en mano sin pasar por el cobro (CruzadoEf resta, CambioMP suma).
  // Fuente: hoja "Cambios Billetera" (Fecha|Hoja|Pedido|Cliente|Monto|Repartidor|Tipo),
  // filtrada por la fecha de reparto y el repartidor (filas viejas sin repartidor cuentan).
  var vueltosBilletera = 0; // Σ vuelto de billetera de hoy → reconstruye la billetera inicial
  var cambioMPTot = 0;      // Σ CambioMP: efectivo extra que te quedó (devolviste por MP)
  var cruzadoEfTot = 0;     // Σ CruzadoEf: efectivo que diste de vuelto por un pago MP
  var usuarioLowBil = usuario.toLowerCase();
  var shCBil = SS.getSheetByName('Cambios Billetera');
  var vueltoPorPed = {}; // { pedidoId: vuelto efectivo dado en ese pedido } para el desglose
  if (shCBil && shCBil.getLastRow() > 1) {
    var cbVals = shCBil.getDataRange().getValues();
    for (var icb = 1; icb < cbVals.length; icb++) {
      var cbF = cbVals[icb][0];
      var cbISO = '';
      if (cbF instanceof Date) {
        cbISO = Utilities.formatDate(cbF, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
      } else if (cbF) {
        var sCB = String(cbF).trim().split(' ')[0];
        var mCB = sCB.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (mCB) cbISO = mCB[3] + '-' + (mCB[2].length === 1 ? '0' + mCB[2] : mCB[2]) + '-' + (mCB[1].length === 1 ? '0' + mCB[1] : mCB[1]);
        else if (/^\d{4}-\d{2}-\d{2}/.test(sCB)) cbISO = sCB.substring(0, 10);
      }
      if (cbISO !== fechaISO) continue;
      var cbRep = String(cbVals[icb][5] || '').trim().toLowerCase(); // col F (puede faltar en filas viejas)
      if (cbRep && cbRep !== usuarioLowBil) continue;
      var cbTipo = String(cbVals[icb][6] || 'Billetera').trim();     // col G
      var cbMonto = Number(cbVals[icb][4]) || 0;                      // col E
      if (cbTipo === 'CruzadoEf') cruzadoEfTot += cbMonto;
      else if (cbTipo === 'CambioMP') cambioMPTot += cbMonto;
      else vueltosBilletera += cbMonto; // 'Billetera' (default)
      // Vuelto en efectivo por pedido (billetera + cruzado; CambioMP es vuelto por MP, no efectivo).
      if (cbTipo !== 'CambioMP') {
        var cbPed = String(cbVals[icb][2] || '').trim();
        if (cbPed) vueltoPorPed[cbPed] = (vueltoPorPed[cbPed] || 0) + cbMonto;
      }
    }
  }
  var ajusteCruzado = cambioMPTot - cruzadoEfTot; // efectivo en mano que no quedó en el cobro
  var billeteraIni = saldoBilletera + vueltosBilletera;
  // Vuelto efectivo total dado en mano (de billetera + cruzados por pago MP).
  var vueltoEfDia = vueltosBilletera + cruzadoEfTot;

  // ── Cierre del día (si ya cerró). Hoja "Cierres Reparto": Fecha cierre, Usuario, Fecha reparto, Billetera ini, Cobrado Ef, Esperado, Real, Diferencia, Notas.
  var cierreDia = null;
  var shCR = SS.getSheetByName('Cierres Reparto');
  if (shCR && shCR.getLastRow() > 1) {
    var crVals = shCR.getRange(2, 1, shCR.getLastRow()-1, 9).getValues();
    for (var ic = crVals.length - 1; ic >= 0; ic--) {
      var uCR = String(crVals[ic][1] || '').trim().toLowerCase();
      var fRep = crVals[ic][2];
      var fRepISO = '';
      if (fRep instanceof Date) {
        fRepISO = Utilities.formatDate(fRep, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
      } else if (fRep) {
        var sFR = String(fRep).trim().split(' ')[0];
        var mFR = sFR.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (mFR) fRepISO = mFR[3]+'-'+(mFR[2].length===1?'0'+mFR[2]:mFR[2])+'-'+(mFR[1].length===1?'0'+mFR[1]:mFR[1]);
        else if (/^\d{4}-\d{2}-\d{2}/.test(sFR)) fRepISO = sFR.substring(0,10);
      }
      if (uCR === usuario.toLowerCase() && fRepISO === fechaISO) {
        cierreDia = {
          billeteraIni: Number(crVals[ic][3]) || 0,
          cobradoEf:    Number(crVals[ic][4]) || 0,
          esperado:     Number(crVals[ic][5]) || 0,
          real:         Number(crVals[ic][6]) || 0,
          diferencia:   Number(crVals[ic][7]) || 0,
          notas:        String(crVals[ic][8] || '')
        };
        break;
      }
    }
  }

  var sh = SS.getSheetByName('Home');
  if (!sh || sh.getLastRow() <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      ok:true, usuario:usuario, fecha:fechaISO, fijo:FIJO_DIA, propinas:0, total:FIJO_DIA,
      saldoBilletera:saldoBilletera, billeteraIni:billeteraIni, vueltosBilletera:vueltosBilletera,
      ajusteCruzado:ajusteCruzado, recibidoEf:cambioMPTot+vueltosBilletera, vueltoEf:vueltoEfDia,
      cobradoEfHoy:0, cobradoTrHoy:0,
      plataEnMano:billeteraIni+ajusteCruzado, cierreDia:cierreDia, entregas:[]
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  for (var h = 0; h < headers.length; h++) {
    idx[String(headers[h]).trim()] = h;
  }

  var iN          = idx['N° Pedido'] != null ? idx['N° Pedido'] : 1;
  var iCliente    = idx['Cliente'] != null ? idx['Cliente'] : 7;
  var iEstadoEnt  = idx['Estado de Entrega'] != null ? idx['Estado de Entrega'] : 10;
  var iEstadoPago = idx['Estado de Pago'] != null ? idx['Estado de Pago'] : 12;
  var iTotal      = idx['Total ($)'] != null ? idx['Total ($)'] : (idx['Total'] != null ? idx['Total'] : 13);
  var iEf         = idx['Efectivo'] != null ? idx['Efectivo'] : 15;
  var iTr         = idx['Transferencia'] != null ? idx['Transferencia'] : 16;
  var iPropEf     = idx['Propina Efectivo'] != null ? idx['Propina Efectivo'] : 19;
  var iPropTr     = idx['Propina Transferencia'] != null ? idx['Propina Transferencia'] : 20;
  var iRep        = idx['Repartidor'];
  var iSubBarrio  = idx['Sub Barrio'];
  var iDomLote    = idx['Domicilio-Lote'] != null ? idx['Domicilio-Lote'] : (idx['Domicilio'] != null ? idx['Domicilio'] : -1);
  // Buscar "Fecha Entrega" real (auto-llenada al marcar Entregado). Fallback "Fecha de Entrega".
  var iFEnt = -1;
  for (var hf = 0; hf < headers.length; hf++) {
    var hn = String(headers[hf]).trim();
    if (hn === 'Fecha Entrega' || hn === 'Fecha de Entrega') { iFEnt = hf; break; }
  }

  if (iRep == null) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, err:'Columna Repartidor no encontrada en hoja Home'})).setMimeType(ContentService.MimeType.JSON);
  }

  var data = sh.getDataRange().getValues();
  var usuarioLow = usuario.toLowerCase();
  var entregas = [];
  var sumPropEf = 0, sumPropTr = 0;
  var sumCobEf = 0, sumCobTr = 0;

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var estEnt = String(row[iEstadoEnt] || '').trim();
    if (estEnt !== 'Entregado') continue;
    var rep = String(row[iRep] || '').trim();
    if (!rep || rep.toLowerCase() !== usuarioLow) continue;

    // Comparar fecha entrega real con la pedida (ISO)
    var fRaw = (iFEnt >= 0) ? row[iFEnt] : null;
    var fISO = '';
    if (fRaw instanceof Date) {
      fISO = Utilities.formatDate(fRaw, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
    } else if (fRaw) {
      var s = String(fRaw).trim().split(' ')[0];
      var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) {
        fISO = m[3] + '-' + (m[2].length===1?'0'+m[2]:m[2]) + '-' + (m[1].length===1?'0'+m[1]:m[1]);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        fISO = s.substring(0,10);
      }
    }
    if (fISO !== fechaISO) continue;

    var nPed   = String(row[iN] || '').trim();
    var cliente= String(row[iCliente] || '').trim();
    var total  = Number(row[iTotal]) || 0;
    var propEf = Math.max(0, Number(row[iPropEf]) || 0);
    var propTr = Math.max(0, Number(row[iPropTr]) || 0);
    var ef     = Number(row[iEf]) || 0;
    var tr     = Number(row[iTr]) || 0;
    var subBarrio = (iSubBarrio != null) ? String(row[iSubBarrio] || '').trim() : '';
    var lote   = (iDomLote >= 0) ? String(row[iDomLote] || '').trim() : '';
    var estPag = String(row[iEstadoPago] || '').trim();
    var cobrado = (estPag === 'Cobrado');

    sumPropEf += propEf;
    sumPropTr += propTr;
    // Solo cuenta para la billetera lo cobrado en efectivo.
    // Propina ef se incluye aparte porque se suma al cobro físico que recibe el repartidor.
    if (cobrado) { sumCobEf += ef + propEf; sumCobTr += tr + propTr; }

    entregas.push({
      n: nPed, c: cliente, $: total,
      pEf: propEf, pTr: propTr,
      ef: ef, tr: tr,
      vto: vueltoPorPed[nPed] || 0,   // vuelto en efectivo dado en este pedido
      sb: subBarrio, l: lote,
      ep: estPag, cb: cobrado
    });
  }

  var propinasTot = sumPropEf + sumPropTr;
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    usuario: usuario,
    fecha: fechaISO,
    fijo: FIJO_DIA,
    propinasEf: sumPropEf,
    propinasTr: sumPropTr,
    propinas: propinasTot,
    total: FIJO_DIA + propinasTot,
    cantidad: entregas.length,
    saldoBilletera: saldoBilletera,        // billetera ACTUAL (la usa el modal de cobro)
    billeteraIni: billeteraIni,            // billetera INICIAL del día (la usa el arqueo)
    vueltosBilletera: vueltosBilletera,    // vueltos de billetera dados hoy
    ajusteCruzado: ajusteCruzado,          // +CambioMP −CruzadoEf (efectivo en mano fuera del cobro)
    recibidoEf: sumCobEf + cambioMPTot + vueltosBilletera, // efectivo BRUTO recibido de clientes
    vueltoEf: vueltoEfDia,                 // efectivo total devuelto de vuelto (billetera + cruzado)
    cobradoEfHoy: sumCobEf,
    cobradoTrHoy: sumCobTr,
    plataEnMano: billeteraIni + sumCobEf + ajusteCruzado,
    cierreDia: cierreDia,
    entregas: entregas
  })).setMimeType(ContentService.MimeType.JSON);
}

function _bilDeQuienConsulta_(bv, usuario, colD) {
  if (!bv || !bv.activo) return Number(colD) || 0;
  var ul = String(usuario || '').trim().toLowerCase(), p = null;
  (bv.personas || []).forEach(function (x) {
    var xl = String(x).toLowerCase();
    if (p === null && ul && (xl === ul || xl.split(' ')[0] === ul.split(' ')[0])) p = x;
  });
  return (p !== null && bv.bil) ? (Number(bv.bil[p]) || 0) : 0;
}


function _mrmCargar_(d) {
  var H = {}, cab = (d.cab || []).slice(), filas = [cab];
  var ix = function (n, def) { var i = cab.indexOf(n); return i >= 0 ? i : def; };
  var c = { n: ix('N° Pedido', 1), cli: ix('Cliente', 7), est: ix('Estado de Entrega', 10), pago: ix('Estado de Pago', 12),
    tot: ix('Total ($)', ix('Total', 13)), ef: ix('Efectivo', 15), tr: ix('Transferencia', 16), pef: ix('Propina Efectivo', 19),
    ptr: ix('Propina Transferencia', 20), rep: ix('Repartidor', -1), sb: ix('Sub Barrio', -1), fent: ix('Fecha Entrega', ix('Fecha de Entrega', -1)) };
  (d.home || []).forEach(function (x) {
    var f = []; for (var i = 0; i < Math.max(cab.length, 60); i++) f.push('');
    f[c.n] = x.n; f[c.cli] = x.cli; f[c.est] = x.est; f[c.pago] = x.pago; f[c.tot] = Number(x.sub) || 0;
    f[c.ef] = Number(x.ef) || 0; f[c.tr] = Number(x.tr) || 0; f[c.pef] = Number(x.pef) || 0; f[c.ptr] = Number(x.ptr) || 0;
    if (c.rep >= 0) f[c.rep] = x.rep;
    if (c.sb >= 0) f[c.sb] = x.sb;
    if (c.fent >= 0) f[c.fent] = _motFecha_(x.fent) || '';
    _motPoner_(filas, x.row, f);
  });
  /* Sin entregas ese dia la hoja igual tiene filas (en la planilla, siempre): si no, `_doGetMiReparto` corta por el camino de «Home vacia». */
  if (filas.length < 2) filas.push([]);
  H.Home = new _Hoja('Home', filas);
  H['Cambios Billetera'] = new _Hoja('Cambios Billetera', [['Fecha', 'Hoja', 'Pedido', 'Cliente', 'Monto', 'Repartidor', 'Tipo']].concat(
    (d.cambios || []).map(function (x) { return [_motFecha_(x[0]) || '', x[1], x[2], x[3], Number(x[4]) || 0, x[5], x[6]]; })));
  H['Saldo Base'] = new _Hoja('Saldo Base', [['Fecha', 'Efectivo', 'Mercado Pago', 'Billetera'], ['', '', '', Number((d.bil || {}).billetera) || 0]]);
  _HOJAS = H; _MR = d;
}

/* datos: lo que devuelve mi_reparto_pantalla. opts.ahora: fijar el reloj; opts.p: {usuario, fecha}
   (los mismos parametros de `?action=miReparto`). */
G.MR_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _mrmCargar_(datos || {});
      var o = JSON.parse(_doGetMiReparto({ parameter: opts.p || {} }).getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _MR = {}; }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
