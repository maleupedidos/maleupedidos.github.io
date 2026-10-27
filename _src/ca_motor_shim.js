/* EL MOTOR DEL RESTO DE LA CAJA (208 en adelante, 27/10/2026). Va despues de motor_comun_shim.js;
   _tools/copiar_motor.js pone donde dice MOTOR (entre barra-asterisco) `_doGetAdmin` y todo lo que llama,
   copiado de Code.js, y el motor lo corre con `{mode: 'caja'}`. Lo de abajo presenta los datos de
   `caja_resto_pantalla` como las hojas que lee. Va POR TANDAS: cada tanda suma hojas aca y en la base, y
   el panel toma del motor solo los datos de las tandas probadas (CAJA_RESTO_BASE). Lo que todavia no
   tiene sus hojas sale vacio o mal, y por eso no se usa.
   Tanda 1 (208): Saldo Base, Cuentas, Config_Maleu, Redondeos Proveedores, Proveedores, Movimientos
   Plata y Provisiones_Fijas. */
function _alertaTecnica_() { return ''; }
function _avisar_() { return ''; }
function _avisarCanal_() { return ''; }
function _avisarFallo_() { return ''; }
function _mlAvisar_() { return ''; }
function _crmPgConfig_() { return { enabled: false, url: '', key: '' }; }
function _uf_() { throw new Error('el motor no sale a la red'); }

/*MOTOR*/

/* Las hojas chicas sin `_cab`: su encabezado, en orden (Saldo Base lo trae en `_cab`). */
var _CAM_CAB_ = {
  'Cuentas': ['id', 'Nombre', 'Tipo', 'Col en Saldo Base', 'Activo', 'Alias', 'Banco'],
  'Config_Maleu': ['Parámetro', 'Valor', 'Activo desde', 'Notas'],
  'Redondeos Proveedores': ['ID', 'Registrado', 'Proveedor', 'Semana', 'Monto', 'Quién', 'Estado', 'Anulado el', 'Anulado por'],
  'Proveedores': ['N° de Productos', 'Producto', 'Proveedor', 'Gustos', 'Abreviatura', 'Info Relevante', 'Canal de Venta', 'Costo', 'Venta Directa', 'Clubes'],
  'Movimientos Plata': ['Fecha', 'Desde', 'Hacia', 'Monto', 'Quién', 'Nota', 'Op']
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
  _HOJAS = H;
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
