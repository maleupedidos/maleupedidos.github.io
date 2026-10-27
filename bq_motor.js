/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor de Abastecimiento (200). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
/* EL «MINI APPS SCRIPT» DEL MOTOR DE ABASTECIMIENTO (200, 27/10/2026). Mismo modelo que el de los
   objetivos (ro_motor_shim.js, 190): _tools/copiar_motor.js pone donde dice MOTOR (entre
   barra-asterisco) `_doGetBusqueda` y todo lo que llama, copiado de Code.js. Lo de abajo presenta
   los datos de `busqueda_pantalla` (200) como las hojas que esas funciones leen, en las mismas
   columnas y en la misma fila (la fila de la hoja viaja: `r + 1` es parte de la respuesta).
   Los pagos a proveedores salen de la base por el camino que Apps Script ya tiene para eso
   (`_pagosProvDesdePg_`, palanca PAGOS_PROV_DESDE_PG): aca la consulta de PostgREST la contesta
   `datos.pagos`. Lo que avisa (Telegram, mail, Alertas Tecnicas) no corre: no hace nada. */

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
  var rg = { getValues: function () { return out; }, getDisplayValues: function () { return out; },
    setValues: function () { return rg; }, setValue: function () { return rg; }, setFontWeight: function () { return rg; } };
  return rg;
};
_Hoja.prototype.getDataRange = function () { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); };
_Hoja.prototype.appendRow = function () {};
_Hoja.prototype.setFrozenRows = function () {};
var _HOJAS = {}, _PAGOS = [];
var SS = { getSheetByName: function (n) { return _HOJAS[n] || null; },
  insertSheet: function (n) { return (_HOJAS[n] = new _Hoja(n, [])); } };
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
/* La consulta de `_pagosProvDesdePg_` a PostgREST: la contesta `datos.pagos`. */
var UrlFetchApp = { fetch: function () {
  return { getResponseCode: function () { return 200; }, getContentText: function () { return JSON.stringify(_PAGOS); } };
} };
var Session = { getEffectiveUser: function () { return { getEmail: function () { return ''; } }; } };
/* Lo que Apps Script hace por afuera: aca nada. */
function _crmPgConfig_() { return { enabled: true, url: 'base', key: 'base' }; }
function _uf_(quien, url, opt) { return UrlFetchApp.fetch(url, opt); }
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

function _pagosProv_(shPagos) {
  var filasHoja = (shPagos && shPagos.getLastRow() > 1) ? shPagos.getLastRow() - 1 : 0;
  if (!_cfgSiNo_('PAGOS_PROV_DESDE_PG', false)) {
    var apagado = _pagosProvDeHoja_(shPagos);
    apagado.fuente = 'hoja'; apagado.nota = '';
    return apagado;
  }
  var pg = _pagosProvDesdePg_(filasHoja);
  if (pg.ok) {
    return { imputados: pg.imputados, libres: pg.libres, fuente: 'postgres', nota: '' };
  }
  var h = _pagosProvDeHoja_(shPagos);
  h.fuente = 'hoja'; h.nota = pg.porQue || 'postgres no contesto';
  return h;
}

function _pagosProvDeHoja_(shPagos) {
  var pagosImputados = {};
  var pagosLibres = {};
    var shPagos = SS.getSheetByName('Pagos Proveedores');
    if (shPagos && shPagos.getLastRow() > 1) {
      var pagosCols = Math.max(8, shPagos.getLastColumn());
      var pagosData = shPagos.getRange(1, 1, shPagos.getLastRow(), pagosCols).getValues();
      for (var rp = 1; rp < pagosData.length; rp++) {
        var pp = String(pagosData[rp][1]).trim();
        if (!pp) continue;
        var ef = Number(pagosData[rp][2]) || 0;
        var mp = Number(pagosData[rp][3]) || 0;
        var bonif = Number(pagosData[rp][7]) || 0; // col H Bonificación
        var tot = Number(pagosData[rp][4]) || (ef + mp + bonif);
        if (tot <= 0) continue;
        var semImp = String(pagosData[rp][5] || '').trim();
        var notas = String(pagosData[rp][6] || '').trim();
        var fechaRaw = pagosData[rp][0];
        // Prefijo de dia (Lun/Mar/Mié/Jue/Vie/Sáb/Dom) ayuda a ubicar el pago rapido.
        var fechaStr;
        if (fechaRaw instanceof Date) {
          var diasCortos = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
          var diaCorto = diasCortos[fechaRaw.getDay()];
          fechaStr = diaCorto + ' ' + Utilities.formatDate(fechaRaw, 'America/Argentina/Buenos_Aires', 'dd/MM HH:mm');
        } else {
          fechaStr = String(fechaRaw || '').trim();
        }
        // cta: de que cuenta salio la parte digital (col I, 13/9/2026). Vacia = la digital por defecto.
        var pagoObj = { fecha: fechaStr, ef: ef, mp: mp, bonif: bonif, tot: tot, notas: notas, cta: String(pagosData[rp][8] || '').trim(),
                        ts: (fechaRaw instanceof Date) ? fechaRaw.getTime() : 0 };
        if (semImp) {
          if (!pagosImputados[pp]) pagosImputados[pp] = {};
          if (!pagosImputados[pp][semImp]) pagosImputados[pp][semImp] = [];
          pagosImputados[pp][semImp].push(pagoObj);
        } else {
          if (!pagosLibres[pp]) pagosLibres[pp] = [];
          pagosLibres[pp].push(pagoObj);
        }
      }
    }
  return { imputados: pagosImputados, libres: pagosLibres };
}

function _pagosProvDesdePg_(filasHoja) {
  try {
    var cfg = _crmPgConfig_();
    if (!cfg.enabled) return { ok: false, porQue: 'PG no configurado' };

    /* `deleted_at=is.null` va ESCRITO, y no es redundante con la 027: esa
       migracion puso el filtro en la policy, pero la policy corre para
       `authenticated` y el backend entra con la Secret Key (`service_role`),
       que **bypasea RLS por diseno**. Sin esta linea un pago dado de baja
       contaria como pagado y la deuda del proveedor saldria MAS BAJA de lo que
       es — y un numero mas bajo no llama la atencion de nadie. */
    var u = cfg.url + '/rest/v1/supplier_payment'
          + '?select=payment_key,supplier_name,paid_at,imputed_week,bonus_amount,note'
          + ',supplier_payment_line(account_key,amount)'
          + '&deleted_at=is.null&order=paid_at.asc&limit=5000';
    var r = _uf_('pagosProvPg', u, {
      headers: { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key },
      muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) {
      return { ok: false, porQue: 'HTTP ' + r.getResponseCode() };
    }
    var filas = JSON.parse(r.getContentText());
    if (!filas || !filas.length) return { ok: false, porQue: 'PG devolvio 0 pagos' };

    /* CONTROL DE COMPLETITUD, y es el que decide si se usa o no.
       La replica SALTEA el pago cuyo `Total` no cuadra con
       Efectivo+MP+Bonificacion: `_cajaPgProveedores_` hace `continue` y la fila
       no sube. Asi que PostgreSQL puede tener MENOS pagos que la hoja sin que
       nada avise, y un pago de menos hace que la deuda salga MAS ALTA.
       `getLastRow()` no trae valores —cuesta O(1)—, asi que el control no se
       come lo que la lectura ahorra. */
    if (filasHoja && filas.length !== filasHoja) {
      return { ok: false, porQue: 'PG tiene ' + filas.length + ' pagos y la hoja ' + filasHoja };
    }

    var imputados = {}, libres = {};
    var TZ = 'America/Argentina/Buenos_Aires';
    for (var i = 0; i < filas.length; i++) {
      var f = filas[i], prov = String(f.supplier_name || '').trim();
      if (!prov) continue;

      /* `account_key` es el MISMO id de cuenta que el front ya usa en
         `_abaNomCuenta` (lo verifica `_cajaPgCuenta_`, que devuelve la clave de
         la cuenta). Medido contra la base el 2/10: existen tres, `efectivo`,
         `mp` y `brubank`. Todo lo que no es `efectivo` es digital — escrito asi
         y no con una lista de cuentas digitales, para que una cuenta nueva
         entre sola en vez de contarse como cero. */
      var ef = 0, dig = 0, ctaDig = '';
      var ls = f.supplier_payment_line || [];
      for (var k = 0; k < ls.length; k++) {
        var monto = Number(ls[k].amount) || 0, cta = String(ls[k].account_key || '');
        if (cta === 'efectivo') { ef += monto; }
        else { dig += monto; if (!ctaDig) ctaDig = cta; }
      }
      var bonif = Number(f.bonus_amount) || 0;
      /* El `Total` declarado de la hoja NO se replica: la replica lo usa de
         control y saltea la fila si no cuadra. Entonces aca la suma ES el
         total, y no hay un segundo numero con el que pueda discrepar. */
      var tot = ef + dig + bonif;
      if (tot <= 0) continue;  // misma regla que la hoja

      /* La fecha, en hora de Argentina. PostgREST las devuelve en UTC
         (`2026-09-25T21:36:00+00:00` son las 18:36 de aca), asi que formatear
         sin pedir la zona adelantaria el pago tres horas y un pago de la noche
         se mostraria al dia siguiente.
         El dia de la semana se saca de la fecha YA pasada a AR y no de
         `getDay()` sobre el instante: asi no depende de la zona del script. */
      var fechaStr = '';
      if (f.paid_at) {
        var d = new Date(f.paid_at);
        var ymd = Utilities.formatDate(d, TZ, 'yyyy-MM-dd').split('-');
        var dow = new Date(Number(ymd[0]), Number(ymd[1]) - 1, Number(ymd[2])).getDay();
        var diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        fechaStr = diasCortos[dow] + ' ' + Utilities.formatDate(d, TZ, 'dd/MM HH:mm');
      }

      /* `cta` va con la cuenta REAL, siempre, y no vacia cuando es la digital por
         defecto —que es como la deja la hoja cuando nadie llena la columna I—.
         Los dos se leen igual en pantalla hoy (`_abaNomCuenta('')` devuelve el
         nombre de la cuenta con `def`, que es `mp`), pero no significan lo mismo:
         vacio quiere decir «la que sea la default AHORA», asi que el dia que la
         default cambie, un pago viejo hecho por Mercado Pago empezaria a decir el
         nombre de la cuenta nueva. Mandar `mp` dice de que cuenta salio la plata
         de verdad y no reescribe el pasado.
         Medido: de los 69 pagos que se compararon contra la hoja, 66 ya venian
         con la cuenta escrita y 3 la tenian vacia; en los tres la pantalla
         mostraba igual «Mercado Pago Tadeo». */
      var pagoObj = { fecha: fechaStr, ef: ef, mp: dig, bonif: bonif, tot: tot,
                      notas: String(f.note || '').trim(), cta: ctaDig,
                      ts: f.paid_at ? new Date(f.paid_at).getTime() : 0 };

      var semImp = (f.imputed_week === null || f.imputed_week === undefined)
                 ? '' : String(f.imputed_week).trim();
      if (semImp) {
        if (!imputados[prov]) imputados[prov] = {};
        if (!imputados[prov][semImp]) imputados[prov][semImp] = [];
        imputados[prov][semImp].push(pagoObj);
      } else {
        if (!libres[prov]) libres[prov] = [];
        libres[prov].push(pagoObj);
      }
    }
    return { ok: true, imputados: imputados, libres: libres, filas: filas.length };
  } catch (e) {
    return { ok: false, porQue: String((e && e.message) || e).slice(0, 120) };
  }
}

function _doGetBusqueda() {
  var shOC = SS.getSheetByName('Orden de Compra');
  if (!shOC || shOC.getLastRow() <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ ts: Date.now(), provs: [], clientes: [], total: 0 }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Parser robusto: acepta números crudos o strings "$8.000". Antes de este parche,
  // Number("$8.000") → NaN → 0 y costoT se calculaba como 0 para esas filas (bug 03/06/26).
  function _toMoney(v) {
    if (typeof v === 'number') return v;
    var s = String(v == null ? '' : v).replace(/[$\s]/g, '').replace(/\./g, '').replace(/,/g, '.');
    var n = Number(s);
    return isFinite(n) ? n : 0;
  }

  // Una sola lectura del rango usado (sin getDataRange que sobre-lee columnas vacías)
  var lastRow = shOC.getLastRow();
  var data = shOC.getRange(1, 1, lastRow, shOC.getLastColumn()).getValues();

  // Mapa de display: nombres unificados para el WhatsApp del proveedor y las cards.
  // Hay variantes históricas en el Sheets ("Pack Pizza", "Pack Pizzas", "Pack Pizzas x2"
  // todas son lo mismo). Las agrupamos bajo "Pack Pizzas". Las pizzas individuales
  // de Bernardo Pisano van como "Pizzas".
  var CAT_DISPLAY = {
    'Tartas Gourmet': 'Tartas',
    'Tartas': 'Tartas',
    'Pizza Premium': 'Pizzas Individuales',
    'Pizzas Premium': 'Pizzas Individuales',
    'Pizza Individual': 'Pizzas Individuales',
    'Pizzas Individuales': 'Pizzas Individuales',
    'Pack Pizza': 'Pack Pizzas',
    'Pack Pizzas': 'Pack Pizzas',
    'Pack Pizzas x2': 'Pack Pizzas',
    'Packs Pizza': 'Pack Pizzas',
    'Pack Pizza x2': 'Pack Pizzas'
  };
  function splitProducto(nombre) {
    var parts = nombre.split(' — ');
    var catRaw = (parts[0] || nombre).trim();
    var cat = CAT_DISPLAY[catRaw] || catRaw;
    return { cat: cat, var: (parts[1] || '').trim() };
  }
  // Renombrar el `prod` completo para que tambien el detalle por OC se vea bien
  // ("Pack Pizza — Muzzarella" → "Pizzas — Muzzarella"). Se usa al guardar items
  // en porCliente/deudas/rows.
  function _renameProd(nombre) {
    var idx = nombre.indexOf(' — ');
    if (idx < 0) return nombre;
    var catRaw = nombre.substring(0, idx).trim();
    var sabor = nombre.substring(idx + 3);
    var cat = CAT_DISPLAY[catRaw] || catRaw;
    return cat + ' — ' + sabor;
  }

  // Semana ISO actual (lun-dom) en zona horaria AR — para filtrar OCs vivas
  var _nowArg = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  var semanaActualBusq = _isoWeek(_nowArg);
  var anioActualBusq = _nowArg.getFullYear();

  // ── Pre-loop: leer Home/Pilar/Clubes/Red para mapear cada pedido a su Estado de Entrega
  // y semana ISO de entrega. Tadeo cuenta una venta por su fecha de entrega; agrupar
  // BUSQUEDA y ARMADO por la semana de entrega evita mezclar ciclos (ej: hoy ya recibido +
  // pedido nuevo para la semana siguiente).
  // Parser robusto: las cols pueden venir como Date o como texto "22/5/2026" / "22/05/2026".
  function _parseFechaCualquiera(raw) {
    if (raw instanceof Date) return raw;
    var s = String(raw || '').trim();
    if (!s) return null;
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return null;
  }
  var estadosEntrega = {}; // { 'Home|3': { est: 'Entregado', semEnt: 20, anioEnt: 2026 } }
  var enPoderVend = [];    // Red: ya se lo llevo el vendedor, todavia no llego al cliente final
  // colEntVend (Red): "Entregado a Vendedor" (col 57, idx 56). En Red, lo que importa
  // para que un pedido salga de ARMADO es que Maleu YA le entregó la mercadería al
  // vendedor (Marcos), NO que el cliente final la haya recibido (eso lo hace el vendedor).
  var hojasCanal = [
    /* colFElegido (13/9/2026): en Home y Pilar la col 50/53 es el SELLO de la
       entrega, que esta vacio mientras el pedido no se entrego — y ahi caia a la
       fecha de CREACION. Un pedido cargado el sabado para el viernes siguiente
       aparecia en "Esta semana" de BUSQUEDA y ARMADO. Clubes y Red ya usaban el
       dia elegido; ahora las cuatro: sello -> dia elegido -> creacion. */
    { name: 'Home',   colId: 2, colEst: 11, colFEnt: 50, colFElegido: 10 }, // Home: AX = Fecha Entrega (col 50), J = Dia de Entrega Elegido
    { name: 'Pilar',  colId: 2, colEst: 11, colFEnt: 53, colFElegido: 10 }, // Pilar: BA = Fecha Entrega (col 53), J = Dia de Entrega Elegido
    { name: 'Clubes', colId: 2, colEst: 14, colFEnt: 13 }, // Clubes: M = Dia de Entrega Elegido (col 13, idx 12)
    /* colAPagar (13/9/2026): la banda "Ya lo tiene el vendedor" mostraba el
       Facturado (lo que pago el cliente final) y en el ERP la plata de Red es
       NETA del 17%: Inicio decia $177.703 por los mismos 4 pedidos que aca
       sumaban $214.100. */
    { name: 'Red',    colId: 2, colEst: 12, colFEnt: 11, colEntVend: 57, colVend: 8, colCli: 9, colFact: 21, colAPagar: 49 }  // Red: K=Dia Entrega, BE(57)=Entregado a Vendedor, H(8)=Vendedor, I(9)=Cliente, U(21)=Facturado, AW(49)=A Pagar
  ];
  hojasCanal.forEach(function(h) {
    var shCanal = SS.getSheetByName(h.name);
    if (!shCanal || shCanal.getLastRow() <= 1) return;
    var nCols = Math.max(h.colId, h.colEst, h.colFEnt, h.colEntVend || 0, h.colFElegido || 0, h.colAPagar || 0, h.colFact || 0, h.colCli || 0);
    var dataCanal = shCanal.getRange(2, 1, shCanal.getLastRow() - 1, nCols).getValues();
    for (var ri = 0; ri < dataCanal.length; ri++) {
      var idPed = String(dataCanal[ri][h.colId - 1] || '').trim();
      if (!idPed) continue;
      var estEnt = String(dataCanal[ri][h.colEst - 1] || '').trim();
      var entVend = h.colEntVend ? String(dataCanal[ri][h.colEntVend - 1] || '').trim() : '';
      // Red: capturar el vendedor (col H) para que ARMADO agrupe por vendedor real
      // (Marcos/Fini/Rufino) en vez de caer al default 'Marcos Bottcher' en el frontend.
      var vendPed = h.colVend ? String(dataCanal[ri][h.colVend - 1] || '').trim() : '';
      // Fecha entrega: parsear el campo correspondiente. Si esta vacio o no parsea,
      // caer a col D (fecha pedido = creacion).
      var fEntDate = _parseFechaCualquiera(dataCanal[ri][h.colFEnt - 1]);
      if (!fEntDate && h.colFElegido) fEntDate = _parseFechaCualquiera(dataCanal[ri][h.colFElegido - 1]);
      if (!fEntDate) fEntDate = _parseFechaCualquiera(dataCanal[ri][3]);
      var semEnt = 0, anioEnt = 0;
      if (fEntDate instanceof Date) {
        semEnt = _isoWeek(fEntDate);
        anioEnt = fEntDate.getFullYear();
      }
      estadosEntrega[h.name + '|' + idPed] = { est: estEnt, entVend: entVend, semEnt: semEnt, anioEnt: anioEnt, vendedor: vendPed };

      /* Ya se lo llevo el vendedor y todavia no lo entrego al cliente final.
         Sale de ARMADO a proposito (no hay que volver a armarlo), pero hasta el
         3/9/2026 no aparecia en NINGUNA pantalla de Abastecimiento — y eso es un
         problema real: si la mercaderia sigue en el deposito de Tadeo (porque el
         vendedor no paso a buscarla, o la devolvio), al cargar el auto no hay
         nada que se lo recuerde. Es el caso de Rufino con los packs de la sem 35. */
      if (h.name === 'Red' && entVend === 'Entregado' &&
          estEnt !== 'Entregado' && estEnt !== 'Cancelado') {
        enPoderVend.push({
          n: idPed,
          vend: vendPed,
          cli: h.colCli ? String(dataCanal[ri][h.colCli - 1] || '').trim() : '',
          sem: semEnt, anio: anioEnt,
          monto: h.colAPagar ? _toMoney(dataCanal[ri][h.colAPagar - 1]) : 0,
          fact: h.colFact ? _toMoney(dataCanal[ri][h.colFact - 1]) : 0
        });
      }
    }
  });

  // Primer pago registrado en la hoja "Pagos Proveedores". Todo lo comprado antes
  // se pago fuera del ledger y no puede figurar como deuda. Ver el comentario largo
  // mas abajo, en el calculo de `deudas`.
  // ── Lo que se pago FUERA del ledger "Pagos Proveedores" (4/9/2026) ──
  // El ledger arranca el 27/4/2026. Lo anterior se pago por otro lado y quedo
  // marcado en la col X "Pagado Proveedor" = "Si": 23 lineas del 17 al 23/4,
  // $569.800. Esa columna se borro de la hoja el 1/9/2026, asi que la lista vive
  // aca. Es un conjunto CERRADO — la columna ya no existe, nada nuevo entra.
  //
  // Del 31/8 al 4/9 esto fue un CORTE POR FECHA ("todo lo creado antes del 27/4
  // ya estaba saldado"). Era un proxy, y demasiado ancho: tambien se llevaba
  // puestas las OC de abril que SI se pagaron por el ledger. Y ahi estaba el bug:
  // borraba la deuda pero NO los pagos que la cancelaban, asi que esos pagos
  // quedaban sueltos y el FIFO los arrastraba hasta la semana en curso como si
  // fueran de ahora. Sevuchitas mostraba $477.400 cuando debia $997.400.
  //
  // Ojo con "arreglarlo" sacando el filtro entero: eso inventa $569.800 de deuda
  // vieja falsa (Le Unike sem 27 y 28, Bernardo Pisano sem 28). Medido.
  var OC_PAGADAS_FUERA_LEDGER = {
    'OC-196': 1, 'OC-197': 1, 'OC-198': 1, 'OC-201': 1, 'OC-202': 1, 'OC-203': 1,
    'OC-204': 1, 'OC-205': 1, 'OC-206': 1, 'OC-207': 1, 'OC-208': 1, 'OC-209': 1,
    'OC-210': 1, 'OC-216': 1, 'OC-225': 1, 'OC-226': 1, 'OC-227': 1, 'OC-228': 1,
    'OC-229': 1, 'OC-230': 1, 'OC-231': 1,
    'OC-REC-LEUN-16': 1, 'OC-REC-SEVU-16': 1
  };

  var porProv = {};
  var porCliente = {};
  var totalGeneral = 0;
  var ocRows = [];
  var deudas = {};
  // Desde que fecha la semana de la deuda sale de la OC y no de "Fecha Recibido" (ver abajo).
  var DEUDA_SEM_OC_DESDE = new Date(2026, 8, 7);

  // ── 1 SOLA PASADA: clasifica cada fila como "OC viva" o "deuda" o ambas ──
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var estado = String(row[20]).trim();
    if (estado !== 'Pendiente' && estado !== 'Pedido' && estado !== 'Recibido') continue;
    var origen = String(row[19]).trim();
    var esDeposito = origen.indexOf('Dep') === 0;
    var esRecibido = (estado === 'Recibido');

    var prov = String(row[9]).trim();
    var qty = Number(row[12]) || 0;
    if (!prov || qty === 0) continue;

    var costoT = _toMoney(row[13]) * qty;

    // Datos del cliente/canal para esta OC (los necesitamos antes del calculo
    // de deudas, porque la semana de la deuda DEBE ser la semana de entrega
    // del pedido al cliente, no la semana de creacion de la OC. Ejemplo del
    // bug: pedido Red creado sab 16/05 (sem 20) para entregar vie 22/05 (sem 21)
    // — la OC contra Sevuchitas debe sumar a la semana 21, no 20.)
    var producto = String(row[10]).trim();
    var abbr = String(row[11]).trim();
    var precioV = Number(row[15]) || 0;
    var ingresoT = precioV * qty;
    var cliente = String(row[6]).trim();
    var canal = String(row[4]).trim();
    var dir = String(row[8]).trim();
    var tel = String(row[7]).trim();
    var nPedido = String(row[5]).trim();
    var ocNum = String(row[0]).trim();

    // ── Normalizar canal Deposito ──
    // El Sheets tiene mezcla historica: canal 'Deposito' (sin tilde, viejo) y 'Depósito' (con tilde, actual),
    // y cliente 'Reposicion stock' vs 'Tadeo — Stock'. Los unificamos para que aparezcan como UNA sola card
    // en ARMADO/BUSQUEDA, agrupada por semana.
    var _canalLower = canal.toLowerCase();
    var esDepCanal = (_canalLower === 'deposito' || _canalLower === 'depósito');
    if (esDepCanal) {
      canal = 'Depósito';
      cliente = 'Depósito Maleu';
      nPedido = '';
    }

    // Lookup semana de entrega del pedido cliente. Si no la encontramos, fallback
    // a la semana de creacion de la OC (col C).
    var entKey = canal + '|' + nPedido;
    var entInfo = estadosEntrega[entKey];
    var semEntPed, anioEntPed;
    if (esDepCanal) {
      // Para Depósito no hay pedido cliente; usar siempre la semana/año de la OC.
      semEntPed = Number(row[2]) || semanaActualBusq;
      var fCreDep = row[1];
      anioEntPed = (fCreDep instanceof Date) ? fCreDep.getFullYear() : anioActualBusq;
    } else {
      semEntPed = (entInfo && entInfo.semEnt) ? entInfo.semEnt : (Number(row[2]) || semanaActualBusq);
      anioEntPed = (entInfo && entInfo.anioEnt) ? entInfo.anioEnt : anioActualBusq;
    }

    // ── DEUDAS: Recibido + Pagado != Sí ──
    // OJO: `esDeposito` mira la col T (Origen), que en las OC de reposición dice
    // "Orden de Compra", NO la col E (Canal) que dice "Depósito". O sea que el
    // filtro !esDeposito NO excluye las compras de depósito, y ESO ES LO CORRECTO:
    // Tadeo le paga al proveedor el TOTAL de lo que le pidió (pedidos de clientes
    // + reposición de stock) desde Abastecimiento → PAGOS. Confirmado 07/08/2026.
    // NO "arreglar" esto para que use `esDepCanal`: rompería el número de la tarjeta,
    // que hoy es el que se usa para pagar. (El 63% de la deuda es reposición.)
    // La semana de la deuda es la de la OC (col C "Semana") desde las OC del
    // 7/9/2026; antes, la semana en que se marco recibida (col W "Fecha Recibido",
    // con fallback a la col C). NO usamos semEntPed porque el pedido cliente
    // puede tener Día de Entrega muy viejo (zombi) y arruinar la imputación.
    if (esRecibido && !esDeposito) {
      // Solo se descuenta lo que se pago FUERA del ledger (ver la lista arriba).
      // Todo lo demas cuenta como deuda y se cancela con los pagos del ledger:
      // asi la deuda y los pagos usan UN criterio y no dos, que es lo que causo
      // que $520.000 pagados en abril se contaran como pago de la semana en curso.
      var _pagadoFuera = OC_PAGADAS_FUERA_LEDGER[ocNum] === 1;
      if (!_pagadoFuera && costoT > 0) {
        /* Desde las OC creadas el 7/9/2026 la semana de la deuda es la de la OC
           (col C), no la del dia en que alguien toco "Recibido" (col W). El 15/9
           Sevuchitas debia $1.200.200 de UNA sola orden (la de la semana 37, pedida
           al proveedor el 10/9) y el ERP la partia en semana 37 ($496.300, marcado
           recibido el viernes 11) y semana 38 ($703.900, marcado el lunes 14).
           Bernardo Pisano igual ($168.100 a la 38). Medido sobre las 851 filas:
           la col C coincide SIEMPRE con la semana de la Fecha Pedido Prov (col V).
           Lo anterior sigue con la col W A PROPOSITO: los pagos viejos se imputaron
           a esas semanas, y pasarlos a la col C inventa deuda (Cuverry $960.000,
           Le Unike $53.200, Bernardo $31.600 — simulado). */
        var semD;
        var fCreOC = _parseFechaCualquiera(row[1]);
        if (fCreOC instanceof Date && fCreOC >= DEUDA_SEM_OC_DESDE && String(row[2] || '').trim()) {
          semD = String(row[2]).trim();
        } else {
          var semRec = 0;
          var fRecRaw = row[22]; // col W "Fecha Recibido"
          var fRecDate = _parseFechaCualquiera(fRecRaw);
          if (fRecDate instanceof Date) semRec = _isoWeek(fRecDate);
          semD = String(semRec || row[2] || '').trim();
        }
        if (!deudas[prov]) deudas[prov] = { total: 0, semanas: {}, rows: [] };
        deudas[prov].total += costoT;
        if (!deudas[prov].semanas[semD]) deudas[prov].semanas[semD] = 0;
        deudas[prov].semanas[semD] += costoT;
        // Detalle por OC: canal/cliente/nped para que el cliente pueda mostrar
        // un breakdown legible ("Red / Marína Donati #24 — Empanadas CaC x1 $14.700").
        deudas[prov].rows.push({
          r: r + 1, prod: _renameProd(producto), abbr: abbr, q: qty,
          costoU: _toMoney(row[13]), costo: costoT,
          sem: semD, canal: canal, cliente: cliente, nped: nPedido
        });
      }
    }

    // ── Filas activas para porProv/porCliente/ocRows: solo no-Depósito ──
    if (esDeposito) continue;

    // Filtrar OCs cuya entrega NO sea esta semana ni la proxima.
    // Para canales con cliente real: atrasados se incluyen como "Esta semana" para no perderlos.
    // Para Depósito: NO traer atrasados RECIBIDOS — son cosas que Tadeo ya guardó.
    // PERO sí traer atrasados Pendiente/Pedido — son compras viejas que aún no fue a buscar.
    var diffSem = (anioEntPed - anioActualBusq) * 53 + (semEntPed - semanaActualBusq);
    if (diffSem > 1) continue;
    if (esDepCanal && diffSem < 0 && esRecibido) continue;

    // Pedidos entregados ya: no incluir en ARMADO (cliente). Sigue contando para BUSQUEDA si la OC esta Pendiente/Pedida.
    // Un pedido sale de ARMADO cuando ya fue entregado. Para Red la entrega
    // relevante es "Entregado a Vendedor" (Maleu → Marcos), NO el Estado de Entrega
    // al cliente final (eso lo gestiona el vendedor después). Para el resto de
    // canales, el Estado de Entrega del pedido es lo que vale.
    var yaEntregado;
    if (canal === 'Red') {
      yaEntregado = entInfo && (entInfo.entVend === 'Entregado' || entInfo.est === 'Entregado');
    } else {
      yaEntregado = entInfo && entInfo.est === 'Entregado';
    }

    // Proveedor agrupado (solo Pendiente/Pedido). Agrupacion incluye semana
    // de entrega: un proveedor con OCs para 2 semanas distintas tiene items separados.
    // qDep = cuántas unidades del item son para reposición de Depósito (cliente
    // "Tadeo — Stock"). Permite al usuario ver "17 × Muzz (10 cli + 7 depo)".
    if (!esRecibido) {
      if (!porProv[prov]) porProv[prov] = { costo: 0, cats: {}, semsEnt: {}, qDepTotal: 0 };
      var sp = splitProducto(producto);
      var arr = porProv[prov].cats[sp.cat] || (porProv[prov].cats[sp.cat] = []);
      var qDepThis = esDepCanal ? qty : 0;
      var found = false;
      for (var v = 0; v < arr.length; v++) {
        if (arr[v].v === sp.var && arr[v].sem === semEntPed && arr[v].anio === anioEntPed) {
          arr[v].q += qty; arr[v].ct += costoT; arr[v].qDep += qDepThis; found = true; break;
        }
      }
      // a: la abreviatura, para decir la cantidad con su unidad (13/9/2026): la carne es kilos.
      if (!found) arr.push({ v: sp.var, a: abbr, q: qty, qDep: qDepThis, ct: costoT, sem: semEntPed, anio: anioEntPed });
      porProv[prov].costo += costoT;
      porProv[prov].qDepTotal += qDepThis;
      porProv[prov].semsEnt[semEntPed] = anioEntPed; // tracking de semanas activas
      totalGeneral += costoT;
    }

    // Cliente agrupado (solo si NO entregado: no debe aparecer en ARMADO).
    // Para Depósito agregamos la semana al cKey: cada semana tiene su propia card.
    if (!yaEntregado) {
      var cKey = cliente + '|' + nPedido + (esDepCanal ? ('|sem' + semEntPed + '-' + anioEntPed) : '');
      if (!porCliente[cKey]) porCliente[cKey] = { n: cliente, canal: canal, dir: dir, tel: tel, ped: nPedido, items: [], ing: 0, semEnt: semEntPed, anioEnt: anioEntPed, vendedor: (canal === 'Red' && entInfo ? (entInfo.vendedor || '') : '') };
      porCliente[cKey].items.push({ prod: _renameProd(producto), abbr: abbr, q: qty, pv: ingresoT, est: estado });
      porCliente[cKey].ing += ingresoT;
    }

    // _renameProd unifica variantes "Pack Pizza" / "Pack Pizzas" / "Pack Pizzas x2"
    // bajo un solo nombre, así el panel "Recibir mercadería" agrupa correctamente
    // por sabor en vez de tener múltiples entradas por la misma cosa.
    // vend: vendedor Red dueño de este pedido (Marcos/Rufino/Fini). Lo necesita la
    // vista "Por Proveedor" de ARMADO para rotular cada split con el vendedor REAL.
    // Antes no se mandaba y el frontend hardcodeaba "Marcos Bottcher": los pedidos
    // de Rufino y Fini aparecían a nombre de Marcos. (Tadeo 07/08/2026)
    /* Las recibidas de semanas anteriores no las usa ninguna pantalla (13/9/2026):
       la vista Por Proveedor mira solo esta semana y la proxima, y el resto filtra
       las recibidas. Eran 466 de 541 filas y 96 KB en cada respuesta — y el ERP
       guarda esta respuesta entera en el celular dos veces. */
    if (!(esRecibido && diffSem < 0)) {
      ocRows.push({ oc: ocNum, r: r + 1, prov: prov, prod: _renameProd(producto), abbr: abbr, q: qty, est: estado, canal: canal, cliente: cliente, nped: nPedido, semEnt: semEntPed,
                    vend: (canal === 'Red' && entInfo ? (entInfo.vendedor || '') : ''),
                    /* El pedido que la pidio ya salio (Red: se le dio al vendedor). Si
                       la OC sigue "Pedido", la mercaderia llego y nadie marco Recibir:
                       no esta en la deuda y BUSQUEDA la sigue mostrando por buscar. */
                    ent: !!yaEntregado,
                    ct: costoT });
    }
  }

  // Programaciones de búsqueda por proveedor (hoja "Programaciones Búsqueda")
  var fProgMap = {};
  var shProg = SS.getSheetByName('Programaciones Búsqueda');
  if (shProg && shProg.getLastRow() > 1) {
    var progData = shProg.getRange(2, 1, shProg.getLastRow() - 1, 2).getValues();
    for (var rpg = 0; rpg < progData.length; rpg++) {
      var pName = String(progData[rpg][0]).trim();
      var pFec = progData[rpg][1];
      if (!pName) continue;
      if (pFec instanceof Date) {
        fProgMap[pName] = Utilities.formatDate(pFec, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
      } else {
        fProgMap[pName] = String(pFec || '').trim();
      }
    }
  }

  // Armar provsArr. Cada prov lleva tambien semsEnt (lista de semanas en las que
  // tiene OCs activas) — el cliente lo usa para mostrarlo solo en la pestaña
  // semanal correspondiente.
  var provsArr = [];
  Object.keys(porProv).forEach(function(prov) {
    var d = porProv[prov];
    var catsArr = [];
    Object.keys(d.cats).forEach(function(cat) { catsArr.push({ cat: cat, items: d.cats[cat] }); });
    var waLines = ['Hola! Te paso el pedido de esta semana:', ''];
    catsArr.forEach(function(c) {
      waLines.push(c.cat + ':');
      c.items.forEach(function(it) { waLines.push('  ' + it.q + ' × ' + (it.v || c.cat)); });
      waLines.push('');
    });
    waLines.push('Total: $' + d.costo.toLocaleString('es-AR'));
    waLines.push('');
    waLines.push('Gracias!');
    var semsEntArr = Object.keys(d.semsEnt).map(function(s){ return Number(s); }).sort(function(a,b){return a-b;});
    provsArr.push({ n: prov, costo: d.costo, cats: catsArr, wa: waLines.join('\n'), fProg: fProgMap[prov] || '', semsEnt: semsEntArr, qDepTotal: d.qDepTotal || 0 });
  });

  // clientesArr: ya esta filtrado en el loop (no incluye entregados).
  var clientesArr = Object.keys(porCliente).map(function(k) { return porCliente[k]; });

  /* ── Compras de carne (15/9/2026) ──
     La factura del proveedor de carne no es una OC (ver CCARNE_HOJA): suma a la
     deuda por su cuenta, a la semana de su fecha, y se paga en PAGOS igual que
     cualquier otra. "Fuera del libro" son las que se pagaron por Egresos antes de
     que este libro existiera: no suman. Si la hoja no se puede leer NO se calla
     —la deuda de la carne faltaria del total sin que nadie lo sepa—: sale
     `ccError` y PAGOS lo dice. */
  var ccError = '';
  try {
    _ccLeer_().forEach(function (c) {
      /* Un PEDIDO todavia no llego: no se debe (21/9/2026). */
      if (c.estado === 'Anulada' || c.estado === CCARNE_PEDIDA || c.fuera || !(c.total > 0) || !c.prov || !c.sem) return;
      var semC = String(c.sem);
      if (!deudas[c.prov]) deudas[c.prov] = { total: 0, semanas: {}, rows: [] };
      if (!deudas[c.prov].semanas[semC]) deudas[c.prov].semanas[semC] = 0;
      c.lineas.forEach(function (l) {
        deudas[c.prov].total += l.total;
        deudas[c.prov].semanas[semC] += l.total;
        deudas[c.prov].rows.push({
          r: 0, prod: 'Carnes — ' + _ccNombreCorte_(l.corte, l.abbr) + (l.det ? ' ' + l.det : ''),
          abbr: l.abbr, q: l.kg, costoU: l.precio, costo: l.total, sem: semC,
          canal: 'Compra de carne', cliente: c.id + ' del ' + c.fecha.slice(0, 5), nped: '', cc: c.id
        });
      });
    });
  } catch (eCC) {
    ccError = String((eCC && eCC.message) || eCC);
  }

  // ── Pagos Proveedores (ledger) ──
  /* DOS FUENTES, UNA ESTRUCTURA. La palanca `PAGOS_PROV_DESDE_PG` de
     Config_Maleu elige de donde salen los pagos; si PostgreSQL no contesta, no
     cuadra, o la palanca esta apagada, se lee la hoja igual que siempre.
     El FIFO de mas abajo no se entera: recibe `pagosImputados` y `pagosLibres`
     armados igual por los dos caminos. Que la estructura sea una sola es lo que
     hace comparables las dos fuentes — y lo que evita tener el calculo de la
     deuda escrito dos veces, que es como se separan. */
  var shPagos = SS.getSheetByName('Pagos Proveedores');
  var _tPagos = Date.now();
  var _pagos = _pagosProv_(shPagos);
  var pagosImputados = _pagos.imputados;
  var pagosLibres = _pagos.libres;
  var pagosFuente = _pagos.fuente;
  var pagosNota = _pagos.nota;
  var pagosMs = Date.now() - _tPagos;

  /* «ES REDONDEO, NO LO CUENTES» (14/10/2026). Lo que se le pago de mas a un
     proveedor por redondear (LM Carnes: $1.620.100 por una compra de $1.620.091)
     se suma al costo de la compra de ESA semana: deja de ser un sobrante a cuenta,
     no se descuenta de la proxima compra y va a Mercaderia en el EERR. */
  var _redVig = [];
  try { _redVig = _redondeosLeer_().filter(function (x) { return x.estado === 'Vigente'; }); } catch (eRd) {}
  _redVig.forEach(function (x) {
    if (!deudas[x.prov]) deudas[x.prov] = { total: 0, semanas: {}, rows: [] };
    var dR = deudas[x.prov];
    dR.semanas[x.sem] = (dR.semanas[x.sem] || 0) + x.monto;
    dR.total += x.monto;
    dR.rows.push({ r: 0, prod: 'Redondeo (pagaste de más)', abbr: '', q: 1, costoU: x.monto, costo: x.monto, sem: x.sem,
                   canal: 'Redondeo', cliente: x.id + ' del ' + x.fecha, nped: '', redondeo: x.id });
  });
  var SALDO_FAVOR_DESDE_TS = new Date('2026-10-02T00:00:00-03:00').getTime();
  /* Notas de credito vigentes (20/10/2026): ver NC_HOJA_. */
  var _ncPorProv = {};
  _ncVigentes_().forEach(function (x) { (_ncPorProv[x.prov] = _ncPorProv[x.prov] || []).push(x); });
  var deudasArr = [];
  var allProvs = {};
  Object.keys(deudas).forEach(function(p) { allProvs[p] = true; });
  Object.keys(_ncPorProv).forEach(function(p) { allProvs[p] = true; });
  Object.keys(pagosImputados).forEach(function(p) { allProvs[p] = true; });
  Object.keys(pagosLibres).forEach(function(p) { allProvs[p] = true; });

  Object.keys(allProvs).forEach(function(prov) {
    var d = deudas[prov] || { total: 0, semanas: {}, rows: [] };
    var libres = pagosLibres[prov] || [];
    var imp = pagosImputados[prov] || {};
    var saldoLibre = libres.reduce(function(a, p) { return a + p.tot; }, 0);

    var semSet = {};
    Object.keys(d.semanas).forEach(function(s) { semSet[s] = true; });
    Object.keys(imp).forEach(function(s) { semSet[s] = true; });
    var semKeys = Object.keys(semSet).sort();

    // Indexar los items detallados por semana — el cliente los muestra en el
    // breakdown de cada card (qué fue lo que se pidió esa semana).
    var rowsBySem = {};
    (d.rows || []).forEach(function(rw){
      var sk = String(rw.sem || '').trim();
      if (!sk) return;
      if (!rowsBySem[sk]) rowsBySem[sk] = [];
      rowsBySem[sk].push(rw);
    });

    var semsArr = [];
    var totalOriginal = 0;
    var totalPagado = 0;
    var totalPendiente = 0;
    /* EL SALDO A FAVOR (2/10/2026). Hasta hoy, lo pagado de mas en una semana
       se perdia: `residuo` es MAX(0, ...) y el excedente no iba a ningun lado.
       Paso con Le Unike: se le pagaron $446.800 en efectivo por un pedido que
       incluia un paquete de langostinos que no tenia, y lo recibido fue
       $429.700. Esos $17.100 nos los debe el proveedor.
       Ahora el excedente pasa a ser CREDITO y se descuenta solo de las semanas
       que vienen, como un pago a cuenta. Va en su propia bolsa y no en la de
       los pagos libres: el sobrante de un pago libre es una ALARMA (el bug del
       4/9), y un credito por mercaderia que no vino es un dato.
       Solo pagos desde SALDO_FAVOR_DESDE_TS: antes de esto el excedente se
       daba por saldado (Caco +$3.420 en la 37, Le Unike +$200 en la 39) y
       resucitarlo inventaria creditos que ya se arreglaron de palabra. */
    var aFavor = 0, aFavorDe = [];
    var ncLista = _ncPorProv[prov] || [];
    var ncSaldo = ncLista.reduce(function (a, x) { return a + x.monto; }, 0), ncAplicadoTot = 0;
    for (var i = 0; i < semKeys.length; i++) {
      var s = semKeys[i];
      var bruto = d.semanas[s] || 0;
      var pagosSem = imp[s] || [];
      var pagadoImp = pagosSem.reduce(function(a, p) { return a + p.tot; }, 0);
      var residuo = Math.max(0, bruto - pagadoImp);
      var aplicarLibre = Math.min(saldoLibre, residuo);
      saldoLibre -= aplicarLibre;
      var aplicarFavor = Math.min(aFavor, residuo - aplicarLibre);
      aFavor -= aplicarFavor;
      var aplicarNC = Math.min(ncSaldo, Math.max(0, residuo - aplicarLibre - aplicarFavor));
      ncSaldo -= aplicarNC; ncAplicadoTot += aplicarNC;
      var pagadoTotalSem = pagadoImp + aplicarLibre + aplicarFavor + aplicarNC;
      var pendiente = Math.max(0, bruto - pagadoTotalSem);
      var sobra = pagadoImp - bruto;
      var sobraCuenta = sobra > 0.01 && pagosSem.some(function(p) { return (Number(p.ts) || 0) >= SALDO_FAVOR_DESDE_TS; });
      if (sobraCuenta) { aFavor += sobra; aFavorDe.push({ sem: s, monto: sobra }); }
      semsArr.push({
        sem: s, original: bruto, pagado: pagadoTotalSem, pendiente: pendiente,
        pagosImp: pagosSem, pagadoFifo: aplicarLibre,
        aFavorAplicado: aplicarFavor, aFavorGenerado: sobraCuenta ? sobra : 0, ncAplicado: aplicarNC,
        items: rowsBySem[s] || [] // detalle de OCs imputadas a esta semana
      });
      totalOriginal += bruto;
      totalPagado += pagadoTotalSem;
      totalPendiente += pendiente;
    }

    /* Tambien el que no debe nada pero tiene plata a cuenta que SOBRA (13/9/2026):
       ese sobrante es justo el sintoma del bug del 4/9, y la pantalla tiene su
       alerta — que no podia salir nunca, porque si sobra, no hay deuda, y el
       proveedor no entraba a la lista. `rows` se dejo de mandar: era una segunda
       copia de semanas[].items que no leia nadie (117 KB). */
    /* `total` sigue siendo lo que se le debe (>= 0): lo leen otros (la
       replica, el exportador). El neto que puede quedar NEGATIVO es `neto`:
       deuda menos lo que el proveedor nos debe. */
    /* Con un redondeo marcado en los ultimos 30 dias sigue en la lista aunque
       quede saldado: es donde esta el «Deshacer» (14/10/2026). */
    var _redRec = _redVig.some(function (x) { return x.prov === prov && x.fDate && (Date.now() - x.fDate.getTime()) < 30 * 86400000; });
    if (totalPendiente > 0.0001 || saldoLibre > 0.01 || aFavor > 0.01 || _redRec || ncLista.length) {
      deudasArr.push({
        n: prov,
        total: totalPendiente,
        original: totalOriginal,
        pagado: totalPagado,
        semanas: semsArr,
        pagosLibres: libres,
        saldoLibreSobrante: saldoLibre,
        aFavor: aFavor,
        aFavorDe: aFavorDe,
        /* La NC que todavia no compenso nada sigue siendo plata que nos deben. */
        ncSaldo: ncSaldo,
        ncAplicado: ncAplicadoTot,
        notasCredito: ncLista.map(function (x) { return { id: x.id, fecha: x.fecha, monto: x.monto, motivo: x.motivo, detalle: x.detalle }; }),
        neto: totalPendiente - aFavor - ncSaldo,
        redondeos: _redVig.filter(function (x) { return x.prov === prov; })
      });
    }
  });

  // Stocks por abreviatura (físico actual). Permite mostrar en ARMADO/Depósito
  // "14 × Muzz (8 actual + 14 = 22 final)" para que Tadeo vea cómo queda el freezer.
  var stocksProductos = {};
  var hProdSt = SS.getSheetByName('Productos');
  if (hProdSt && hProdSt.getLastRow() > 1) {
    var stData = hProdSt.getRange(2, 1, hProdSt.getLastRow() - 1, 8).getValues();
    for (var rs = 0; rs < stData.length; rs++) {
      var abr = String(stData[rs][2] || '').trim();
      if (!abr) continue;
      stocksProductos[abr] = Number(stData[rs][5]) || 0; // col F = Stock Físico
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      ts: Date.now(),
      provs: provsArr,
      clientes: clientesArr,
      total: totalGeneral,
      ocs: ocRows,
      deudas: deudasArr,
      redondeoMax: _redondeoMax_(),
      semActual: semanaActualBusq,
      anioActual: anioActualBusq,
      stocksProductos: stocksProductos,
      enPoderVend: enPoderVend,
      /* No se pudo leer Compras Carne: la deuda de la carne NO esta en `deudas`. */
      ccError: ccError,
      /* De que cuenta sale un pago a proveedor (13/9/2026). */
      cuentas: _cuentasParaPanel_(),
      /* Quienes tienen billetera y cobrado propio (5/10/2026): un pago en
         efectivo pregunta de que lugar salio. */
      personasCaja: (function () { try { return _lugaresCfg_().personas; } catch (e) { return []; } })(),
      /* De donde salieron los pagos y cuanto costo traerlos (2/10/2026). Va en la
         respuesta para que la palanca se pueda medir sin publicar un medidor
         aparte, y para que un fallback silencioso no exista: si `pagosFuente`
         dice `hoja` con la palanca prendida, `pagosNota` dice por que. */
      pagosFuente: pagosFuente,
      pagosNota: pagosNota,
      pagosMs: pagosMs
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

var CCARNE_HOJA = 'Compras Carne';

var CCARNE_COLS = ['ID', 'Fecha', 'Semana', 'Proveedor', 'Abreviatura', 'Corte', 'Detalle',
                   'Kg', 'Precio kg', 'Total', 'Estado', 'Libro', 'Nota', 'Cargo', 'Cargado',
                   'Kg pedidos', 'Cajas', 'Recibio', 'Kg a reservar'];

var CCARNE_FUERA = 'Fuera del libro';

var CCARNE_PEDIDA = 'Pedida';

function _ccCajas_(v) {
  var xs = Array.isArray(v) ? v : String(v == null ? '' : v).split(/[;|]/);
  var out = [];
  xs.forEach(function (x) {
    var n = Number(String(x == null ? '' : x).replace(',', '.').trim());
    if (isFinite(n) && n > 0) out.push(Math.round(n * 1000) / 1000);
  });
  return out;
}

function _ccHoja_(crear) {
  var sh = SS.getSheetByName(CCARNE_HOJA);
  if (sh || !crear) return sh;
  sh = SS.insertSheet(CCARNE_HOJA);
  sh.getRange(1, 1, 1, CCARNE_COLS.length).setValues([CCARNE_COLS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

function _ccNombreCorte_(corte, abbr) {
  var s = String(corte || abbr || '').trim();
  return s.replace(/^carne\s+/i, '') || s;
}

function _ccFecha_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
  var s = String(v || '').trim(), m, y, mo, d;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else return null;
  var f = new Date(y, mo - 1, d);
  return (f.getFullYear() === y && f.getMonth() === mo - 1 && f.getDate() === d) ? f : null;
}

function _ccLeer_() {
  var sh = _ccHoja_(false);
  if (!sh || sh.getLastRow() < 2) return [];
  /* Hasta las columnas que la hoja TIENE: pedir mas de las que existen es un error de
     Apps Script, y las 3 ultimas (Kg pedidos, Cajas, Recibio) nacieron el 21/9/2026. */
  var d = sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(CCARNE_COLS.length, sh.getMaxColumns())).getValues();
  var TZ = 'America/Argentina/Buenos_Aires';
  var porId = {}, orden = [];
  for (var r = 0; r < d.length; r++) {
    var id = String(d[r][0] || '').trim();
    if (!id) continue;
    var c = porId[id];
    if (!c) {
      var f = _ccFecha_(d[r][1]);
      var cargado = d[r][14];
      c = porId[id] = {
        id: id,
        fecha: f ? Utilities.formatDate(f, TZ, 'dd/MM/yyyy') : '',
        t: f ? f.getTime() : 0,
        sem: Number(d[r][2]) || (f ? _isoWeek(f) : 0),
        prov: String(d[r][3] || '').trim(),
        estado: String(d[r][10] || '').trim() || 'Recibida',
        fuera: String(d[r][11] || '').trim() === CCARNE_FUERA,
        nota: String(d[r][12] || '').trim(),
        cargo: String(d[r][13] || '').trim(),
        cargado: (cargado instanceof Date) ? Utilities.formatDate(cargado, TZ, 'dd/MM/yyyy HH:mm') : String(cargado || ''),
        recibio: String(d[r][17] || '').trim(),
        lineas: [], kg: 0, total: 0, kgPed: 0, kgRes: 0, filas: []
      };
      orden.push(c);
    }
    var kg = Math.round((Number(d[r][7]) || 0) * 1000) / 1000;
    var precio = Math.round(Number(d[r][8]) || 0);
    var tot = Math.round(Number(d[r][9]) || (kg * precio));
    var kgPed = (d[r][15] === '' || d[r][15] == null) ? null : Math.round((Number(d[r][15]) || 0) * 1000) / 1000;
    /* Vacia es 0: no reservar nada es el default, y el que no complete la celda
       no promete. Ver el comentario de CCARNE_RESERVA_MIN_KG. */
    var kgRes = Math.round((Number(d[r][18]) || 0) * 1000) / 1000;
    if (!(kgRes > 0)) kgRes = 0;
    c.lineas.push({ abbr: String(d[r][4] || '').trim(), corte: String(d[r][5] || '').trim(),
                    det: String(d[r][6] || '').trim(), kg: kg, precio: precio, total: tot,
                    kgPed: kgPed, cajas: _ccCajas_(d[r][16]), kgRes: kgRes });
    c.kg = Math.round((c.kg + kg) * 1000) / 1000;
    if (kgPed !== null) c.kgPed = Math.round((c.kgPed + kgPed) * 1000) / 1000;
    c.kgRes = Math.round((c.kgRes + kgRes) * 1000) / 1000;
    c.total += tot;
    c.filas.push(r + 2);
  }
  return orden;
}

var REDONDEO_HOJA_ = 'Redondeos Proveedores';

var REDONDEO_CAB_ = ['ID', 'Registrado', 'Proveedor', 'Semana', 'Monto', 'Quién', 'Estado', 'Anulado el', 'Anulado por'];

function _redondeoMax_() {
  var v = Number(String(_cfgTexto_('REDONDEO_PROV_MAX', '500') || '500').replace(/[^\d.]/g, ''));
  return v > 0 ? v : 500;
}

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

var NC_HOJA_ = 'Notas Credito Proveedores';

var NC_CAB_ = ['ID', 'Registrado', 'Proveedor', 'Monto', 'Motivo', 'Detalle', 'Quién', 'Estado', 'Anulado el', 'Anulado por'];

function _ncHoja_(crear) {
  var sh = SS.getSheetByName(NC_HOJA_);
  if (!sh && crear) {
    sh = SS.insertSheet(NC_HOJA_);
    sh.getRange(1, 1, 1, NC_CAB_.length).setValues([NC_CAB_]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function _ncLeer_() {
  var sh = _ncHoja_(false), out = [];
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, NC_CAB_.length).getValues().forEach(function (f, i) {
    var id = String(f[0] || '').trim(); if (!id) return;
    var fe = f[1] instanceof Date ? f[1] : _mcFecha_(f[1]);
    out.push({ id: id, row: i + 2, fecha: fe ? Utilities.formatDate(fe, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy') : String(f[1] || ''),
               prov: String(f[2] || '').trim(), monto: Math.round((Number(f[3]) || 0) * 100) / 100,
               motivo: String(f[4] || '').trim(), detalle: String(f[5] || '').trim(),
               quien: String(f[6] || '').trim(), estado: String(f[7] || '').trim() || 'Vigente' });
  });
  return out;
}

function _ncVigentes_() {
  try { return _ncLeer_().filter(function (x) { return x.estado === 'Vigente' && x.prov && x.monto > 0; }); } catch (e) { return []; }
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


/* Un texto «aaaa-mm-dd[ hh:mm:ss]» es una fecha de la hoja: Apps Script la entrega como Date. */
function _bqmFecha_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s == null ? '' : String(s));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null;
}
function _bqmCelda_(v) {
  if (v && typeof v === 'object' && v.$d) return new Date(v.$d);   // celda cruda de Red (191)
  if (typeof v === 'string') { var f = _bqmFecha_(v); if (f) return f; }
  return v == null ? '' : v;
}
function _bqmPoner_(filas, row, fila) { while (filas.length < row - 1) filas.push([]); filas[row - 1] = fila; }
var _BQM_OC_CAB_ = ['N° Orden', 'Fecha Creación', 'Semana', 'Mes', 'Canal', 'N° Pedido Origen', 'Cliente', 'Teléfono', 'Dirección',
  'Proveedor', 'Producto', 'Abreviatura', 'Cantidad', 'Costo Unitario', 'Costo Total', 'Precio Venta Unit.', 'Ingreso Total',
  'Margen Bruto ($)', 'Margen (%)', 'Origen', 'Estado OC', 'Fecha Pedido Prov', 'Fecha Recibido'];
/* Las hojas chicas sin `_cab`: su encabezado, en orden. */
var _BQM_CAB_ = {
  'Programaciones Búsqueda': ['Proveedor', 'Fecha Programada', 'Actualizado'],
  'Redondeos Proveedores': ['ID', 'Registrado', 'Proveedor', 'Semana', 'Monto', 'Quién', 'Estado', 'Anulado el', 'Anulado por'],
  'Cuentas': ['id', 'Nombre', 'Tipo', 'Col en Saldo Base', 'Activo', 'Alias', 'Banco'],
  'Config_Maleu': ['Parámetro', 'Valor', 'Activo desde', 'Notas']
};
/* Las columnas (desde 1) que lee el pre-loop de cada hoja de pedidos: las de `hojasCanal`. */
var _BQM_PED_ = {
  Home: { n: 2, est: 11, fent: 50, fel: 10, f: 4 },
  Pilar: { n: 2, est: 11, fent: 53, fel: 10, f: 4 },
  Clubes: { n: 2, est: 14, fel: 13, f: 4 },
  Red: { n: 2, est: 12, fel: 11, f: 4, ev: 57, vend: 8, cli: 9, fact: 21, ap: 49 }
};
function _bqmCargar_(d) {
  var H = {};
  var oc = [_BQM_OC_CAB_.slice()];
  (d.oc || []).forEach(function (x) {
    var f = []; for (var i = 0; i < 23; i++) f.push('');
    f[0] = x.n; f[1] = _bqmFecha_(x.fc) || ''; f[2] = x.sem; f[4] = x.canal; f[5] = x.np; f[6] = x.cli; f[7] = x.tel; f[8] = x.dir;
    f[9] = x.prov; f[10] = x.prod; f[11] = x.abbr; f[12] = x.q == null ? '' : x.q; f[13] = x.cu == null ? '' : x.cu;
    f[15] = x.pv == null ? '' : x.pv; f[19] = x.org; f[20] = x.est; f[22] = _bqmFecha_(x.fr) || '';
    _bqmPoner_(oc, x.row, f);
  });
  H['Orden de Compra'] = new _Hoja('Orden de Compra', oc);
  ['Home', 'Pilar', 'Clubes', 'Red'].forEach(function (h) { H[h] = new _Hoja(h, [['N° Pedido']]); });
  (d.ped || []).forEach(function (x) {
    var c = _BQM_PED_[x.h], f;
    if (!c) return;
    if (x.raw && x.raw.length) f = x.raw.map(_bqmCelda_);
    else {
      f = []; for (var i = 0; i < 57; i++) f.push('');
      f[c.n - 1] = x.n; f[c.est - 1] = x.est; f[c.f - 1] = _bqmFecha_(x.f) || '';
      if (c.fel) f[c.fel - 1] = _bqmFecha_(x.fel) || '';
      if (c.fent) f[c.fent - 1] = _bqmFecha_(x.fent) || '';
      if (c.ev) { f[c.ev - 1] = x.ev; f[c.vend - 1] = x.vend; f[c.cli - 1] = x.cli; f[c.fact - 1] = x.fact == null ? '' : x.fact; f[c.ap - 1] = x.ap == null ? '' : x.ap; }
    }
    _bqmPoner_(H[x.h].f, x.row, f);
  });
  var hj = d.hojas || {};
  Object.keys(hj).forEach(function (n) {
    var filas = hj[n] || [], cab = _BQM_CAB_[n] || ((filas[0] && filas[0].d && filas[0].d._cab) || []), out = [cab.slice()];
    filas.forEach(function (x) { _bqmPoner_(out, x.row, cab.map(function (k) { return _bqmCelda_(x.d[k]); })); });
    H[n] = new _Hoja(n, out);
  });
  /* Los pagos salen de la base (ver arriba): la palanca va prendida para el motor. */
  var cm = H.Config_Maleu || (H.Config_Maleu = new _Hoja('Config_Maleu', [_BQM_CAB_.Config_Maleu.slice()]));
  cm.f.splice(1, 0, ['PAGOS_PROV_DESDE_PG', 'si', '', '']);
  var cc = [CCARNE_COLS.slice()];
  (d.cc || []).forEach(function (x) {
    _bqmPoner_(cc, x.row, [x.id, _bqmFecha_(x.f) || '', x.sem == null ? '' : x.sem, x.prov, x.abbr, x.corte, x.det,
      x.kg == null ? '' : x.kg, x.precio == null ? '' : x.precio, x.total == null ? '' : x.total, x.est, x.libro, x.nota, x.cargo,
      _bqmFecha_(x.cargado) || x.cargado || '', x.kgped == null ? '' : x.kgped, x.cajas, x.recibio, x.kgres == null ? '' : x.kgres]);
  });
  H[CCARNE_HOJA] = new _Hoja(CCARNE_HOJA, cc);
  H[NC_HOJA_] = new _Hoja(NC_HOJA_, [NC_CAB_.slice()].concat((d.nc || []).map(function (x) {
    return [x.id, _bqmFecha_(x.f) || '', x.prov, Number(x.monto) || 0, x.motivo, x.det, x.quien, x.est, '', ''];
  })));
  _PAGOS = d.pagos || [];
  var pg = [['Fecha']]; _PAGOS.forEach(function () { pg.push(['x']); });
  H['Pagos Proveedores'] = new _Hoja('Pagos Proveedores', pg);
  H.Productos = new _Hoja('Productos', [['N°', 'Producto', 'Abreviatura']].concat((d.prod || []).map(function (x, i) {
    return [i + 1, x.n, x.a, '', '', Number(x.fis) || 0, '', ''];
  })));
  _HOJAS = H;
}

/* datos: lo que devuelve busqueda_pantalla. opts.ahora: fijar el reloj (la prueba). Devuelve lo
   mismo que `?action=busqueda`. */
G.BQ_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _bqmCargar_(datos || {});
      _CFG_MEMO_ = null; _LUG_CFG_ = null;
      var o = JSON.parse(_doGetBusqueda().getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _HOJAS = {}; _PAGOS = []; }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
