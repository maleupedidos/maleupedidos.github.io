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

/*MOTOR*/

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
