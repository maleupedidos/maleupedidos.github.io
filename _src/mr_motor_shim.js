/* EL MOTOR DE «MI REPARTO» (204, 27/10/2026). Va despues de motor_comun_shim.js; _tools/copiar_motor.js
   pone donde dice MOTOR (entre barra-asterisco) `_doGetMiReparto` y lo que llama, copiado de Code.js. Lo
   de abajo presenta los datos de `mi_reparto_pantalla` (204) como las hojas que lee: Home (las entregas
   de ese dia de ese repartidor, en sus columnas por encabezado), Cambios Billetera y la col D de Saldo
   Base. Las billeteras de hoy las da la base (174). «Cierres Reparto» no esta: `cierreDia` null. */
var _MR = {};
function _billeterasVivas_() { var b = (_MR.bil || {}).billeteras || {}; return { activo: !!b.activo, personas: b.personas || [], bil: b.bil || {}, corte: b.corte || '' }; }

/*MOTOR*/

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
