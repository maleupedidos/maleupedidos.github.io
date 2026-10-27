/* EL MOTOR DE «DESCARGAR EL AUTO» (205, 27/10/2026). Va despues de motor_comun_shim.js;
   _tools/copiar_motor.js pone donde dice MOTOR (entre barra-asterisco) `_doGetPendientesGuardarStock` y
   lo que llama, copiado de Code.js. Lo de abajo presenta los datos de `pendientes_guardar_pantalla`
   (205) como «Orden de Compra» (en su fila y sus columnas) y «Programaciones Búsqueda». */

/*MOTOR*/

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
