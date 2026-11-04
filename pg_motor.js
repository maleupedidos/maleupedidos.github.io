/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor de Descargar el auto (205). Ver el encabezado de _tools/copiar_motor.js. */
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

/* EL MOTOR DE «DESCARGAR EL AUTO» (205, 27/10/2026). Va despues de motor_comun_shim.js;
   _tools/copiar_motor.js pone donde dice MOTOR (entre barra-asterisco) `_doGetPendientesGuardarStock` y
   lo que llama, copiado de Code.js. Lo de abajo presenta los datos de `pendientes_guardar_pantalla`
   (205) como «Orden de Compra» (en su fila y sus columnas) y «Programaciones Búsqueda». */


function _esCanalDeposito_(canal) {
  var c = String(canal || '').trim().toLowerCase();
  return c === 'deposito' || c === 'depósito';
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

function _normNombre(s) {
  s = String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return s;
}

function _ocCol(nombre, shOC) {
  var k = 'occol_' + nombre;
  try {
    var c = CacheService.getScriptCache().get(k);
    if (c) return Number(c);
  } catch (err) {}
  var sh = shOC || SS.getSheetByName('Orden de Compra');
  if (!sh) return 0;
  var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var idx = 0;
  for (var i = 0; i < hdr.length; i++) {
    if (String(hdr[i]).trim() === nombre) { idx = i + 1; break; }
  }
  try { if (idx) CacheService.getScriptCache().put(k, String(idx), 300); } catch (err) {}
  return idx;
}

function _isClienteTadeoStock(cliente) {
  var s = String(cliente || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return s.indexOf('tadeo') === 0 && s.indexOf('stock') !== -1;
}

var OC_DESCARGA_DIAS = 14;

var OC_BUSQ_HIST_DIAS = 60;

function _isoUtcMs_(iso) { var p = String(iso).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
function _isoSumarDias_(iso, n) {
  var d = new Date(_isoUtcMs_(iso) + n * 86400000);
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}

function _isoSumarDias_(iso, n) {
  var d = new Date(_isoUtcMs_(iso) + n * 86400000);
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}

function _isoDow_(iso) { return new Date(_isoUtcMs_(iso)).getUTCDay(); }

/* Una fecha de la hoja a 'aaaa-mm-dd'. La col V la escribe un Date (marcarOC) o
   un texto dd/mm/aaaa (el onEdit): las dos formas valen. */
function _ocFechaIso_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  var s = String(v || '').trim(), m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1] + '-' + m[2] + '-' + m[3];
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function _ocFechaIso_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  var s = String(v || '').trim(), m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1] + '-' + m[2] + '-' + m[3];
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function _ocDiaHabitual_(filas, hoyIso) {
  var desde = _isoSumarDias_(hoyIso, -OC_BUSQ_HIST_DIAS);
  var visto = {}, cnt = {};
  for (var i = 0; i < filas.length; i++) {
    var pv = _normNombre(String(filas[i][9] || '').trim());
    var w = _ocFechaIso_(filas[i][22]);   // W Fecha Recibido
    if (!pv || !w || w < desde || w > hoyIso || visto[pv + '|' + w]) continue;
    visto[pv + '|' + w] = 1;
    if (!cnt[pv]) cnt[pv] = { n: 0, d: [0, 0, 0, 0, 0, 0, 0] };
    cnt[pv].n++; cnt[pv].d[_isoDow_(w)]++;
  }
  var out = {};
  Object.keys(cnt).forEach(function (pv) {
    var c = cnt[pv], best = 0;
    for (var d = 1; d < 7; d++) if (c.d[d] > c.d[best]) best = d;
    if (c.n >= 3 && c.d[best] / c.n >= 0.6) out[pv] = best;
  });
  return out;
}

function _ocLeerProgBusqueda_() {
  var pb = {};
  try {
    var sh = SS.getSheetByName('Programaciones Búsqueda');
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (f) {
        var pn = String(f[0] || '').trim(), fp = _ocFechaIso_(f[1]);
        if (pn && fp) pb[_normNombre(pn)] = fp;
      });
    }
  } catch (e) {}
  return pb;
}

function _ocFechaBusqueda_(prov, pedidoIso, progBusq, habitual) {
  var k = _normNombre(String(prov || '').trim());
  var fp = progBusq[k];
  if (fp && (!pedidoIso || fp >= pedidoIso)) return { fecha: fp, de: 'programada' };
  if (pedidoIso && habitual[k] !== undefined) {
    return { fecha: _isoSumarDias_(pedidoIso, (habitual[k] - _isoDow_(pedidoIso) + 7) % 7), de: 'habitual' };
  }
  return { fecha: '', de: '' };
}

function _ocYaGuardado_(v) {
  if (v instanceof Date) return true;
  var s = String(v == null ? '' : v).trim();
  if (!s) return false;
  return !/^(no|false|0)$/i.test(s);
}

function _ocMueveStock_(fila) {
  return _esCanalDeposito_(String(fila[4] || '')) && String(fila[19] || '').trim() === 'Orden de Compra';
}

var OC_GUARDADO_DESDE = new Date(2026, 8, 1);   // 1/9/2026

function _doGetPendientesGuardarStock() {
  /* OJO CON ESTE CACHE: medido, NO baja el tiempo.
     25/9/2026 contra produccion, 5 corridas sin cache y 6 con cache:
     mediana 3151 ms contra 3092 ms, con un ruido de 1100 ms entre el minimo y
     el maximo. O sea que los 3 segundos NO son leer las 979 filas: son el piso
     de un GET a Apps Script, que no se optimiza desde aca.
     Se deja igual por una sola razon: cuando la hoja crezca, la lectura va a
     empezar a pesar y esto ya va a estar. Lo que hace que la pantalla abra
     rapido NO es esto, es que el front pinta la copia guardada al instante
     (ruta.html, `_pgsCache`).
     La foto se tira en las mismas dos puertas que el resto (`doPost` y
     `onEditHandler`, via CACHES_VOLCADO), asi que descargar el auto la invalida
     sola y nunca se sirve una lista vieja despues de guardar. */
  /* La foto vale solo para el dia en que se saco (2/10/2026): la busqueda
     programada de un proveedor cambia lo que se muestra al cambiar el dia, sin
     que nadie escriba nada. La clave sigue siendo la misma porque es la que
     tiran doPost y onEditHandler (CACHES_VOLCADO). */
  var _hoyIsoDA = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  var _cacheado = _cacheLeerGrande_('descarga_auto_v4');
  if (_cacheado) {
    var _diaFoto = '';
    try { _diaFoto = JSON.parse(_cacheado).dia || ''; } catch (eDF) {}
    if (_diaFoto === _hoyIsoDA) return ContentService.createTextOutput(_cacheado).setMimeType(ContentService.MimeType.JSON);
  }

  var vacio = { ok: true, deposito: [], items: [], pedidos: [], totalRows: 0, sinRecibir: 0 };
  var sh = SS.getSheetByName('Orden de Compra');
  if (!sh || sh.getLastRow() <= 1) {
    return ContentService.createTextOutput(JSON.stringify(vacio)).setMimeType(ContentService.MimeType.JSON);
  }
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  // Cols: B(2)=Fecha Creacion, E(5)=Canal, F(6)=N° Pedido Origen, G(7)=Cliente,
  //       I(9)=Direccion, J(10)=Proveedor, K(11)=Producto, L(12)=Abreviatura,
  //       M(13)=Cantidad, U(21)=Estado OC. "Guardado en Stock" se busca por
  //       nombre (_ocCol): era la Y=25 y al borrar la col muerta paso a la X=24.
  var _idxGuardado = _ocCol('Guardado en Stock', sh) || 24;

  var hoy = new Date();
  var corte = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - OC_DESCARGA_DIAS);

  /* LA BUSQUEDA PROGRAMADA DE CADA PROVEEDOR (2/10/2026). Una OC "Pedido" a
     Cuverry del 24/9 aparecia en la descarga del viernes 2/10, y las tortas se
     buscan el SABADO 3/10 — Abastecimiento ya lo tenia anotado en "Programaciones
     Busqueda". Lo que todavia no se recibio, de un proveedor que se busca un dia
     que todavia no llego, no puede estar en el auto. Lo Recibido entra siempre:
     ya esta adentro. Si la hoja no se puede leer, no se esconde nada. */
  /* 15/10/2026: el dia sale de _ocFechaBusqueda_ (programada vigente o el dia
     habitual del proveedor), y lo que no tiene dia, o es "Pendiente", ya no
     entra: va a la nota de abajo de la card. */
  var progBusq = _ocLeerProgBusqueda_();
  var habitual = _ocDiaHabitual_(data, _hoyIsoDA);
  var masTarde = {};   // proveedor -> {fecha, unidades}: lo que se busca otro dia
  var sinDia = {};     // proveedor -> {unidades}: "Pedido" sin dia de busqueda
  var sinPedir = {};   // proveedor -> {unidades}: "Pendiente", no se le pidio todavia
  var sinEntregar = {}; // proveedor -> {fecha, unidades}: en la card y sin recibir

  var byProd = {};          // reposicion, agregada por abreviatura
  var byCliente = {};       // pedidos con dueño, agregados por cliente+pedido
  var totalRows = 0, sinRecibir = 0;
  /* Reposicion que quedo del otro lado de la ventana de 14 dias y sigue sin
     guardar. La pantalla no la puede mostrar —abriria con meses de filas— pero
     TIENE que decir que existe: esa ceguera es la que dejo pasar 19 semanas. */
  var atrasRows = 0, atrasQty = 0, atrasDesde = null;

  for (var i = 0; i < data.length; i++) {
    var estado = String(data[i][20] || '').trim();
    /* 'Cancelado' y cualquier estado raro quedan afuera; 'Pendiente' entra
       porque el proveedor entrega todo junto aunque el ERP todavia no tenga
       esa OC marcada como pedida. */
    if (estado !== 'Pendiente' && estado !== 'Pedido' && estado !== 'Recibido') continue;
    if (_ocYaGuardado_(data[i][_idxGuardado - 1])) continue;

    var fCre = data[i][1];
    if (!(fCre instanceof Date) || fCre < corte) {
      /* Vieja y sin guardar. Si es REPOSICION y nacio despues del hueco
         cerrado, es mercaderia que entro al freezer y el ERP nunca conto: se
         suma al aviso en vez de desaparecer. Lo anterior al hueco no se cuenta
         a proposito — ver OC_GUARDADO_DESDE. */
      if (fCre instanceof Date && fCre >= OC_GUARDADO_DESDE
          && (_isClienteTadeoStock(String(data[i][6] || '')) || _esCanalDeposito_(String(data[i][4] || '')))
          && (Number(data[i][12]) || 0) > 0) {
        atrasRows++;
        atrasQty += Number(data[i][12]) || 0;
        if (!atrasDesde || fCre < atrasDesde) atrasDesde = fCre;
      }
      continue;
    }

    var abbr = String(data[i][11] || '').trim();
    var prod = String(data[i][10] || '').trim();
    var qty = Number(data[i][12]) || 0;
    var prov = String(data[i][9] || '').trim();
    if (!abbr || qty <= 0) continue;
    /* Lo "Pendiente" nunca esta en el auto: no se le pidio al proveedor
       (15/10/2026, Tadeo). Antes entraba desde el jueves 12 h de su ciclo. */
    if (estado === 'Pendiente') {
      if (!sinPedir[prov]) sinPedir[prov] = { proveedor: prov, unidades: 0 };
      sinPedir[prov].unidades += qty;
      continue;
    }
    if (estado === 'Pedido') {
      var _fb = _ocFechaBusqueda_(prov, _ocFechaIso_(data[i][21]) || _ocFechaIso_(fCre), progBusq, habitual);
      if (!_fb.fecha) {
        if (!sinDia[prov]) sinDia[prov] = { proveedor: prov, unidades: 0 };
        sinDia[prov].unidades += qty;
        continue;
      }
      if (_fb.fecha > _hoyIsoDA) {
        if (!masTarde[prov]) masTarde[prov] = { proveedor: prov, fecha: _fb.fecha, unidades: 0 };
        if (_fb.fecha < masTarde[prov].fecha) masTarde[prov].fecha = _fb.fecha;
        masTarde[prov].unidades += qty;
        continue;
      }
      /* Su dia es hoy (o ya paso): puede estar en el auto, pero el ERP no lo
         vio entrar. El confirm lo dice en rojo. */
      if (!sinEntregar[prov]) sinEntregar[prov] = { proveedor: prov, fecha: _fb.fecha, unidades: 0 };
      if (_fb.fecha < sinEntregar[prov].fecha) sinEntregar[prov].fecha = _fb.fecha;
      sinEntregar[prov].unidades += qty;
    }

    var rowReal = i + 2;
    var falta = (estado !== 'Recibido') ? 1 : 0;
    var esDep = _isClienteTadeoStock(String(data[i][6] || '')) || _esCanalDeposito_(String(data[i][4] || ''));

    /* Lo de un cliente que YA esta recibido no se separa acá: ya entro al
       circuito y la bolsa se arma en ARMADO, que es la pantalla que existe para
       eso. Medido el 25/9/2026 sobre la hoja real: de 89 unidades de clientes en
       la ventana, 66 estaban recibidas —pedidos de dias anteriores, varios ya
       entregados— y 23 sin recibir. Sin este filtro la pantalla abre con cuatro
       veces mas de lo que hay en el auto y deja de servir para descargarlo.
       El freezer no lleva este filtro a proposito: la reposicion puede haberse
       marcado recibida desde Abastecimiento y seguir sin guardar.
       Va ANTES de contar, o `totalRows` contaria lo que la pantalla no muestra. */
    if (!esDep && !falta) continue;

    totalRows++;
    sinRecibir += falta;

    if (esDep) {
      if (!byProd[abbr]) byProd[abbr] = { abbr: abbr, prod: prod, qty: 0, rows: [], qtys: [], recs: [], fRecs: [], mueve: [], proveedor: prov, sinRecibir: 0 };
      byProd[abbr].qty += qty;
      byProd[abbr].rows.push(rowReal);
      /* La cantidad de CADA fila, en paralelo a `rows`. Un producto puede venir
         en dos OC (27 empanadas = 15 + 12) y la pantalla muestra el total: sin
         esto, corregir el total a 25 no sabria de cual de las dos descontar. */
      byProd[abbr].qtys.push(qty);
      byProd[abbr].sinRecibir += falta;
      /* Lo que el confirm necesita para decir la verdad (4/10/2026), tambien en
         paralelo a `rows`: si la fila ya esta recibida (su stock YA entro, el
         POST no lo vuelve a sumar), desde cuando, y si mueve el freezer. Sin
         esto el confirm decia "suma el stock" siempre, aunque sumara cero. */
      var _fRec = data[i][22];
      byProd[abbr].recs.push(falta ? 0 : 1);
      byProd[abbr].fRecs.push(_fRec instanceof Date
        ? Utilities.formatDate(_fRec, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd') : '');
      byProd[abbr].mueve.push(_ocMueveStock_(data[i]) ? 1 : 0);
      continue;
    }

    /* Un cliente puede tener dos pedidos abiertos en la misma semana, asi que
       la clave lleva el numero de pedido: si no, los dos montones se mezclan
       en uno y al separar las cajas no se sabe cual es cual. */
    var canal = String(data[i][4] || '').trim();
    var nPed = String(data[i][5] || '').trim();
    var cKey = canal + '|' + nPed + '|' + String(data[i][6] || '').trim();
    if (!byCliente[cKey]) {
      byCliente[cKey] = {
        cliente: String(data[i][6] || '').trim(), canal: canal, nPedido: nPed,
        dir: String(data[i][8] || '').trim(), qty: 0, sinRecibir: 0, items: []
      };
    }
    var grupo = byCliente[cKey];
    grupo.qty += qty;
    grupo.sinRecibir += falta;
    var yaEsta = null;
    for (var k = 0; k < grupo.items.length; k++) if (grupo.items[k].abbr === abbr) { yaEsta = grupo.items[k]; break; }
    if (!yaEsta) { yaEsta = { abbr: abbr, prod: prod, qty: 0, rows: [], proveedor: prov }; grupo.items.push(yaEsta); }
    yaEsta.qty += qty;
    yaEsta.rows.push(rowReal);
  }

  var porProd = function(a, b) { return a.prod.localeCompare(b.prod); };
  var deposito = Object.keys(byProd).map(function(k) { return byProd[k]; }).sort(porProd);
  var pedidos = Object.keys(byCliente).map(function(k) { return byCliente[k]; });
  pedidos.forEach(function(p) { p.items.sort(porProd); });
  pedidos.sort(function(a, b) { return a.cliente.localeCompare(b.cliente); });

  var _out = JSON.stringify({
    ok: true, deposito: deposito, items: deposito, pedidos: pedidos,
    totalRows: totalRows, sinRecibir: sinRecibir,
    desde: Utilities.formatDate(corte, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy'),
    dia: _hoyIsoDA,
    /* Lo que se busca OTRO dia (Programaciones Busqueda): no esta en el auto. */
    masTarde: Object.keys(masTarde).map(function (k) { return masTarde[k]; }),
    /* 15/10/2026. sinDia y sinPedir: tampoco estan en el auto, la card los
       nombra. sinEntregar: lo que SI esta en la card y el proveedor todavia no
       figura entregado; el confirm lo dice en rojo. */
    sinDia: Object.keys(sinDia).map(function (k) { return sinDia[k]; }),
    sinPedir: Object.keys(sinPedir).map(function (k) { return sinPedir[k]; }),
    sinEntregar: Object.keys(sinEntregar).map(function (k) { return sinEntregar[k]; }),
    /* Lo que quedo atras. `unidades` en 0 es el estado sano y la pantalla no
       muestra nada; cualquier otro numero es mercaderia en el freezer que el
       ERP no esta contando. */
    atrasado: {
      filas: atrasRows, unidades: atrasQty,
      desde: atrasDesde ? Utilities.formatDate(atrasDesde, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy') : ''
    }
  });
  _cacheGuardarGrande_('descarga_auto_v4', _out, VOLCADO_CACHE_SEG);
  return ContentService.createTextOutput(_out).setMimeType(ContentService.MimeType.JSON);
}


var _PGM_OC_CAB_ = ['N° Orden', 'Fecha Creación', 'Semana', 'Mes', 'Canal', 'N° Pedido Origen', 'Cliente', 'Teléfono', 'Dirección',
  'Proveedor', 'Producto', 'Abreviatura', 'Cantidad', 'Costo Unitario', 'Costo Total', 'Precio Venta Unit.', 'Ingreso Total',
  'Margen Bruto ($)', 'Margen (%)', 'Origen', 'Estado OC', 'Fecha Pedido Prov', 'Fecha Recibido', 'Guardado en Stock'];
function _pgmCargar_(d) {
  var H = {}, oc = [_PGM_OC_CAB_.slice()];
  (d.oc || []).forEach(function (x) {
    var f = []; for (var i = 0; i < 24; i++) f.push('');
    f[0] = x.n; f[1] = _motFecha_(x.fc) || ''; f[4] = x.canal; f[5] = x.np; f[6] = x.cli; f[8] = x.dir; f[9] = x.prov;
    f[10] = x.prod; f[11] = x.abbr; f[12] = x.q == null ? '' : x.q; f[19] = x.org; f[20] = x.est;
    f[21] = _motFecha_(x.fp) || ''; f[22] = _motFecha_(x.fr) || ''; f[23] = x.g ? 'Sí' : '';
    _motPoner_(oc, x.row, f);
  });
  H['Orden de Compra'] = new _Hoja('Orden de Compra', oc);
  var pb = [['Proveedor', 'Fecha Programada', 'Actualizado']];
  (d.prog || []).forEach(function (x) { _motPoner_(pb, x.row, ['Proveedor', 'Fecha Programada', 'Actualizado'].map(function (k) { return _motCelda_(x.d[k]); })); });
  H['Programaciones Búsqueda'] = new _Hoja('Programaciones Búsqueda', pb);
  _HOJAS = H;
}

/* datos: lo que devuelve pendientes_guardar_pantalla. opts.ahora: fijar el reloj (la prueba). */
G.PG_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _pgmCargar_(datos || {});
      var o = JSON.parse(_doGetPendientesGuardarStock().getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
