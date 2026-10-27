/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor de la escala de Red (201). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
/* EL «MINI APPS SCRIPT» DEL MOTOR DE LA ESCALA DE RED (201, 27/10/2026). Mismo modelo que el de
   Abastecimiento (bq_motor_shim.js, 200): _tools/copiar_motor.js pone donde dice MOTOR (entre
   barra-asterisco) `_doGetRedEscala` y todo lo que llama, copiado de Code.js. Lo de abajo presenta
   los datos de `red_escala_pantalla` (201) como las hojas que esas funciones leen (Productos, Red,
   Vendedores, Proveedores, Config_Maleu) y contesta las consultas a la base (`_crmPgFetch_`) con lo
   que trajo: las bandas, la tabla y la vista de la escala. No escribe la carne fija que falta en
   Productos ni avisa los cambios: eso sigue en Apps Script. */

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
  var rg = { getValues: function () { return out; }, getDisplayValues: function () { return out; },
    setValues: function () { return rg; }, setValue: function () { return rg; }, setNumberFormat: function () { return rg; } };
  return rg;
};
_Hoja.prototype.getDataRange = function () { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); };
var _HOJAS = {}, _RE = {};
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
/* Las consultas a la base de la escala: las contesta lo que trajo `red_escala_pantalla`. */
function _crmPgConfig_() { return { enabled: true, url: 'base', key: 'base' }; }
function _crmPgFetch_(cfg, method, path) {
  var t = String(path || '').split('?')[0];
  if (t === 'seller_level_band') return _RE.bandas || [];
  if (t === 'seller_commission_rate') return _RE.tabla || [];
  if (t === 'seller_commission_rate_calc') return _RE.vista || [];
  return [];
}
function _colsAbbr_(hoja) { var m = {}; (_RE.colmap || []).forEach(function (x) { m[x[0]] = x[1]; }); return m; }
function _alertaTecnica_() { return ''; }
function _avisar_() { return ''; }
function _avisarCanal_() { return ''; }
function _avisarFallo_() { return ''; }
function _mlAvisar_() { return ''; }
function _logError_() {}


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

var ESCALA_RED_VISTA_PROP = 'ESCALA_RED_VISTA_ULTIMA';

var ESCALA_RED_MEDIR_PROP = 'ESCALA_RED_MEDIR_FIRMA';

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

function _escalaRedCambios_(antes, vista) {
  var out = [];
  (vista || []).forEach(function (x) {
    var k = x.product_sku + '|' + x.level, a = antes && antes[k];
    if (!a || Number(a[0]) === Number(x.amount)) return;
    out.push({ sku: x.product_sku, nombre: x.product_name || x.product_sku, nivel: x.level, source: x.source,
      antes: Number(a[0]), ahora: Number(x.amount), costoAntes: Number(a[1]), costo: Number(x.unit_cost),
      precioAntes: Number(a[2]), precio: Number(x.sale_price) });
  });
  return out;
}

function _escalaRedCompacta_(vista) {
  var m = {};
  (vista || []).forEach(function (x) { m[x.product_sku + '|' + x.level] = [Number(x.amount), Number(x.unit_cost), Number(x.sale_price)]; });
  return m;
}

function _escalaRedDifTabla_(vista, tabla) {
  var t = {}, out = [];
  (tabla || []).forEach(function (x) { t[x.product_sku + '|' + x.level] = Number(x.amount); });
  (vista || []).forEach(function (x) {
    var k = x.product_sku + '|' + x.level;
    if (t[k] !== Number(x.amount)) out.push({ sku: x.product_sku, nombre: x.product_name || x.product_sku, nivel: x.level,
      tabla: t[k] === undefined ? null : t[k], vista: Number(x.amount), source: x.source });
  });
  return out;
}

function _escalaRedVigilar_(vista, tabla) {
  var p = PropertiesService.getScriptProperties();
  var antes = null;
  try { antes = JSON.parse(p.getProperty(ESCALA_RED_VISTA_PROP) || 'null'); } catch (eJ) { antes = null; }
  var cambios = antes ? _escalaRedCambios_(antes, vista) : [];
  p.setProperty(ESCALA_RED_VISTA_PROP, JSON.stringify(_escalaRedCompacta_(vista)));
  if (cambios.length) {
    var L = ['Cambió el Precio o el Costo en Productos, y con eso lo que se le paga al vendedor por unidad:', ''];
    cambios.forEach(function (c) {
      var por = [];
      if (c.costoAntes !== c.costo) por.push('costo ' + _parteMoney_(c.costoAntes) + ' → ' + _parteMoney_(c.costo));
      if (c.precioAntes !== c.precio) por.push('precio ' + _parteMoney_(c.precioAntes) + ' → ' + _parteMoney_(c.precio));
      L.push(c.nombre + ' (' + c.sku + ') · ' + c.nivel + ': ' + _parteMoney_(c.antes) + ' → ' + _parteMoney_(c.ahora) +
        (por.length ? ' · ' + por.join(', ') : '') + (c.source === 'excepcion' ? ' · (excepción)' : ''));
    });
    L.push('');
    L.push(_escalaRedFuente_() === 'productos'
      ? 'Ya se paga así en los pedidos que se den de alta, editen o entreguen desde ahora. Lo liquidado no se mueve.'
      : 'Todavía NO se paga así (ESCALA_RED_FUENTE = medir): se paga con la tabla.');
    L.push('Si un costo está mal tipeado en Productos, corregilo ahí y este aviso se repite con la vuelta.');
    _alertaTecnica_('escala Red', 'La comisión de ' + cambios.length + ' producto(s)/nivel(es) de la Red cambió sola', L);
  }
  if (tabla) {
    var dif = _escalaRedDifTabla_(vista, tabla);
    var firma = dif.map(function (d) { return d.sku + '|' + d.nivel + '|' + d.tabla + '>' + d.vista; }).join(',');
    if (firma !== (p.getProperty(ESCALA_RED_MEDIR_PROP) || '')) {
      p.setProperty(ESCALA_RED_MEDIR_PROP, firma);
      if (dif.length) _alertaTecnica_('escala Red', 'ESCALA_RED_FUENTE = medir: la escala desde Productos difiere de la tabla en ' + dif.length,
        dif.map(function (d) { return d.nombre + ' (' + d.sku + ') · ' + d.nivel + ': tabla ' + (d.tabla === null ? 'sin fila' : _parteMoney_(d.tabla)) +
          ' · desde Productos ' + _parteMoney_(d.vista) + (d.source === 'excepcion' ? ' (excepción)' : ''); }).concat(['',
          'Se sigue pagando con la tabla. Cuando esto dé vacío, se puede pasar a «productos».']));
    }
  }
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

var ESCALA_RED_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

var ESCALA_RED_COL_VEND = 8;    // Vendedor

var ESCALA_RED_COL_FACT = 21;   // Facturado (= Total - Envio)

var ESCALA_RED_COL_MES  = 69;   // Mes Entrega  ("Octubre", sin año)

var ESCALA_RED_COL_ANIO = 71;   // Año Entrega

function _escalaRedMesHoy_() {
  var d = new Date(new Date().toLocaleString('en-US',
    { timeZone: 'America/Argentina/Buenos_Aires' }));
  return { mes: ESCALA_RED_MESES[d.getMonth()], anio: d.getFullYear() };
}

function _escalaRedCuentaNivel_(fila, cT) {
  return !(cT && String(fila[cT - 1] || '').trim() === 'Maleu');
}

function _escalaRedFacturadoMesTodos_(sh, mes, anio) {
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  var cT = 0;
  try { cT = _colsRedOrigen_(sh, false).trajo || 0; } catch (eT) { cT = 0; }
  var ancho = Math.max(ESCALA_RED_COL_ANIO, ESCALA_RED_COL_FACT, cT);
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, ancho).getValues();
  for (var i = 0; i < vals.length; i++) {
    var nom = String(vals[i][ESCALA_RED_COL_VEND - 1] || '').trim();
    if (!nom) continue;
    if (String(vals[i][ESCALA_RED_COL_MES - 1] || '').trim() !== mes) continue;
    if (String(vals[i][ESCALA_RED_COL_ANIO - 1] || '').trim() !== String(anio)) continue;
    if (!_escalaRedCuentaNivel_(vals[i], cT)) continue;
    var k = nom.toLowerCase();
    if (!out[k]) out[k] = { nombre: nom, total: 0 };
    out[k].total += Number(vals[i][ESCALA_RED_COL_FACT - 1]) || 0;
  }
  return out;
}

var ESCALA_RED_REGLA = { inicial: 0.44, intermedio: 0.48, top: 0.55,
                         piso: 0.15, fondo: 0.02, redondeo: 50 };

function _doGetRedEscala(e) {
  try {
    if (String(e && e.parameter && e.parameter.releer || '') === '1') {
      try { CacheService.getScriptCache().remove('escala_red'); } catch (eC) {}
    }
    var esc = _escalaRedLeer_();
    if (!esc || !esc.bandas || !esc.bandas.length) {
      return _jsonOut_({ ok: false, err: 'No pude leer la escala de la base.' });
    }

    // Precio, costo, nombre y unidad: de la hoja Productos, por abreviatura.
    var prod = {};
    var hProd = SS.getSheetByName('Productos');
    if (hProd && hProd.getLastRow() > 1) {
      var pd = hProd.getRange(1, 1, hProd.getLastRow(), 17).getValues();
      for (var r = 1; r < pd.length; r++) {
        var ab = String(pd[r][2] || '').trim();
        if (!ab) continue;
        prod[ab] = { n: String(pd[r][1] || '').trim(), precio: _numCelda_(pd[r][8]),
                     costo: _numCelda_(pd[r][9]), u: _uniValida_(pd[r][16]) };
      }
    }
    var cat = _catPorAbbr_();

    var productos = [], visto = {}, filas = 0;
    var cols = Object.keys(_colsAbbr_('Red')).map(Number).sort(function (a, b) { return a - b; });
    var skus = cols.map(function (c) { return _colsAbbr_('Red')[c]; });
    var nRed = skus.length;   // de aca para arriba, la hoja Red no tiene columna
    /* Un SKU con monto en la base que la hoja Red no tiene columna para vender
       tambien se muestra: esconderlo seria decir que la escala tiene menos
       filas de las que tiene. */
    Object.keys(esc.montos).forEach(function (s) { if (skus.indexOf(s) < 0) skus.push(s); });
    Object.keys(esc.montos).forEach(function (s) { filas += Object.keys(esc.montos[s]).length; });
    for (var i = 0; i < skus.length; i++) {
      var s = skus[i];
      if (visto[s]) continue;
      visto[s] = true;
      var p = prod[s] || null, m = esc.montos[s] || null;
      var num = function (x) { return (m && typeof m[x] === 'number') ? m[x] : null; };
      productos.push({
        a: s, n: p ? p.n : s, cat: cat[s] || 'Sin categoría', u: p ? p.u : 'u',
        precio: p ? p.precio : null, costo: p ? p.costo : null,
        ini: num('inicial'), int: num('intermedio'), top: num('top'),
        enRed: i < nRed
      });
    }

    // Quien esta hoy en cada nivel, con lo ENTREGADO del mes (lo que liquida).
    var hoy = _escalaRedMesHoy_();
    var fact = _escalaRedFacturadoMesTodos_(SS.getSheetByName('Red'), hoy.mes, hoy.anio);
    var vend = {};
    try {
      var hv = SS.getSheetByName('Vendedores');
      if (hv && hv.getLastRow() > 1) {
        var vd = hv.getRange(1, 1, hv.getLastRow(), 7).getValues();
        for (var q = 1; q < vd.length; q++) {
          var nom = String(vd[q][0] || '').trim();
          if (nom && String(vd[q][6] || '').trim() === 'Activo') vend[nom.toLowerCase()] = { nombre: nom, total: 0 };
        }
      }
    } catch (eV) {}
    Object.keys(fact).forEach(function (k) { vend[k] = fact[k]; });
    var vendedores = Object.keys(vend).map(function (k) {
      var t = Math.round(vend[k].total || 0);
      return { nombre: vend[k].nombre, facturado: t, nivel: _escalaRedNivel_(esc, t) };
    }).sort(function (a, b) { return b.facturado - a.facturado; });

    return _jsonOut_({ ok: true, ts: Date.now(), leida: esc.leida || null, filas: filas,
                       mes: hoy.mes, anio: hoy.anio, bandas: esc.bandas, regla: ESCALA_RED_REGLA,
                       vendedores: vendedores, productos: productos });
  } catch (err) {
    return _jsonOut_({ ok: false, err: String((err && err.message) || err) });
  }
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

function _uniValida_(v) {
  var s = String(v || '').trim().toLowerCase();
  return (s === 'kg' || s === 'u') ? s : 'u';
}

var _SECO_ = false;

function _catPorAbbr_() {
  var ck = CacheService.getScriptCache(), k = 'cat_por_abbr_v1';
  try { var g = ck.get(k); if (g) return JSON.parse(g); } catch (e0) {}
  var out = {}, sh = SS.getSheetByName('Proveedores');
  if (sh && sh.getLastRow() > 1) {
    var d = sh.getRange(1, 1, sh.getLastRow(), 5).getValues(), ultimo = '';
    for (var i = 1; i < d.length; i++) {
      var pb = String(d[i][1] || '').trim(); if (pb) ultimo = pb;
      var ab = String(d[i][4] || '').trim();
      if (ab && ultimo) out[ab] = ultimo;
    }
  }
  try { ck.put(k, JSON.stringify(out), 600); } catch (e1) {}
  return out;
}

function _parteMoney_(n) {
  var x = Math.round(Number(n) || 0);
  return '$' + String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function _numCelda_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var t = String(v == null ? '' : v).replace(/\$/g, '').replace(/\s/g, '');
  if (!t) return 0;
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  var n = parseFloat(t);
  return isFinite(n) ? n : 0;
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


function _remFecha_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s == null ? '' : String(s));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null;
}
function _remCelda_(v) {
  if (v && typeof v === 'object' && v.$d) return new Date(v.$d);   // celda cruda de Red (191)
  if (typeof v === 'string') { var f = _remFecha_(v); if (f) return f; }
  return v == null ? '' : v;
}
function _remPoner_(filas, row, fila) { while (filas.length < row - 1) filas.push([]); filas[row - 1] = fila; }
/* Las hojas chicas: su encabezado, en orden (se leen por posicion). */
var _REM_CAB_ = {
  Vendedores: ['Nombre', 'WhatsApp', 'Alias MP', 'Barrios (separados por coma)', 'Partido', 'Localidad', 'Estado',
    'Usuario', 'PIN', 'Comisión %', 'Notas', 'Días', 'Telegram'],
  Proveedores: ['N° de Productos', 'Producto', 'Proveedor', 'Gustos', 'Abreviatura', 'Info Relevante', 'Canal de Venta', 'Costo',
    'Venta Directa', 'Clubes'],
  Config_Maleu: ['Parámetro', 'Valor', 'Activo desde', 'Notas']
};
/* Productos: las columnas que se leen por posicion (B nombre, C abreviatura, I precio, J costo,
   Q unidad) y por nombre (Abreviatura, Precio, Unidad y las tres «Com Red», Y:AA). */
function _remCargar_(d) {
  var H = {}, cabP = [];
  for (var i = 0; i < 27; i++) cabP.push('');
  cabP[0] = 'N°'; cabP[1] = 'Producto'; cabP[2] = 'Abreviatura'; cabP[8] = 'Precio'; cabP[9] = 'Costo'; cabP[16] = 'Unidad';
  cabP[24] = 'Com Red Inicial'; cabP[25] = 'Com Red Intermedio'; cabP[26] = 'Com Red Top';
  var v = function (x) { return x == null ? '' : x; };
  H.Productos = new _Hoja('Productos', [cabP].concat((d.prod || []).map(function (x, k) {
    var f = []; for (var j = 0; j < 27; j++) f.push('');
    f[0] = k + 1; f[1] = x.n; f[2] = x.a; f[8] = v(x.precio); f[9] = v(x.costo); f[16] = x.u; f[24] = v(x.ri); f[25] = v(x.rm); f[26] = v(x.rt);
    return f;
  })));
  var red = [(d.cab || []).slice()];
  (d.red || []).forEach(function (x) { _remPoner_(red, x[0], (x[1] || []).map(_remCelda_)); });
  H.Red = new _Hoja('Red', red);
  var hj = d.hojas || {};
  Object.keys(_REM_CAB_).forEach(function (n) {
    var cab = _REM_CAB_[n], out = [cab.slice()];
    (hj[n] || []).forEach(function (x) { _remPoner_(out, x.row, cab.map(function (k) { return _remCelda_(x.d[k]); })); });
    H[n] = new _Hoja(n, out);
  });
  _HOJAS = H; _RE = d;
}

/* datos: lo que devuelve red_escala_pantalla. opts.ahora: fijar el reloj (la prueba). Devuelve lo
   mismo que `?action=redEscala`. */
G.RE_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _remCargar_(datos || {});
      _CFG_MEMO_ = null; _COLSRED_ = null; _PROD_VALORES_ = null; _SECO_ = true;
      var o = JSON.parse(_doGetRedEscala({ parameter: {} }).getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _RE = {}; }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
