/* GENERADO por _tools/copiar_motor.js desde _src/panel.src.html (bloque LEC-ARMA): NO SE EDITA.
   Lo baja el medidor de lecturas de Apps Script (medirLecturasBase). */
(function (G) {
/*LEC-ARMA-INI*/
/* LAS LECTURAS SUELTAS ARMADAS EN LA BASE (27/10/2026, 159 en adelante). Una sola pieza
   para todas: cada accion de Apps Script que ya arma la base tiene su fila en LEC_ARMA
   (la funcion de la base y, para cada lista de la respuesta, por que campo se identifica
   una fila). La palanca es UNA fila de Config_Maleu, `LECTURAS_BASE_ARMA`, con la lista
   «accion=modo» («crmLeads=medir; saludClientes=si»), que viaja en el permiso como
   `sb.pal.lecArma` = {accion: 'medir'|'si'}. Sin la accion en la lista = como siempre.
     medir  la pantalla sigue con Apps Script; cada PED_ARMA_MEDIR_MS, con una respuesta
            recien llegada, la compara contra la base y la anota en `pedidos_cruce`
            (`_pantalla: <accion>`), solo si nadie escribio desde que se pidio.
     si     la arma la base; si no contesta, Apps Script. */
var LEC_ARMA = {
  crmLeads: { rpc: 'crm_leads_pantalla', listas: { leads: ['id'] } },
  /* (160) Las listas de nuevos y reactivados van en el orden de Apps Script: se comparan por
     posicion (no estan en `listas`), asi un orden distinto tambien se ve. */
  saludClientes: { rpc: 'salud_clientes_pantalla', listas: {} },
  /* (161) Los combos y las semanas por su clave; las recientes por posicion (son las ultimas 25). */
  combosEval: { rpc: 'combos_eval_pantalla', listas: { combos: ['id'], semanas: ['anio', 'semana'] }, orden: true },
  /* (162) Los productos por su abreviatura y en el orden de la hoja; las alertas, los pares y
     los barrios por posicion (el orden es lo que se muestra). La base recibe los mismos
     parametros que la URL, en `p`. */
  productosAnalytics: { rpc: 'productos_analytics_pantalla', listas: { productos: ['abrev'] }, orden: true },
  /* (136, Backend ERP) Ajustes. Las listas por su clave y en el orden de la hoja; los permisos, por posicion. */
  ajustesData: { rpc: 'ajustes_data_pantalla', listas: { usuarios: ['usuario'], configMaleu: ['param', 'desde'], provisiones: ['concepto'],
    configNegocio: ['param'], contadores: ['param'], vendedores: ['nombre'] }, orden: true },
  /* (164) CRM > Hoy. La base da los DATOS y `motor` dice que la respuesta la arma el motor de
     las jugadas (pj_motor.js, copiado de Code.js) en el navegador. Las casas y las jugadas por
     su clave y en orden; lo demas por posicion. */
  crmJugadas: { rpc: 'crm_jugadas_pantalla', listas: { casas: ['k'], jugadas: ['id'] }, orden: true, motor: true },
  /* (165) Stock > Carne. Los cortes y los depositos por su clave y en orden; las piezas de
     cada corte, las diferencias, las salidas y los proveedores por posicion. */
  carnePiezas: { rpc: 'carne_piezas_pantalla', listas: { cortes: ['a'], deps: ['id'] }, orden: true },
  /* (166) El stock del AUTOPEDIDO (Ruta). Solo el ERP: la tienda sigue pidiendolo a Apps Script. */
  stock_full: { rpc: 'stock_full_pantalla', listas: { _deps: ['id'] }, orden: true },
  /* (167) Las piezas a la venta (Ruta y Red). Solo el ERP: la tienda sigue con Apps Script. Cada
     corte es una lista de piezas en orden de peso: se compara por posicion. */
  piezas_full: { rpc: 'piezas_full_pantalla', listas: {}, orden: true },
  /* (168) La grilla de la carga. Los proveedores por nombre y en orden; adentro, los productos por
     posicion (el orden de Productos es lo que se muestra). */
  cargaGrilla: { rpc: 'carga_grilla_pantalla', listas: { proveedores: ['nombre'], deps: ['id'] }, orden: true },
  /* (169) El margen de lista: los productos por su abreviatura y en el orden de Productos. */
  margenLista: { rpc: 'margen_lista_pantalla', listas: { productos: ['a'] }, orden: true },
  /* (138, Backend ERP) La lista de Catering: los eventos por su id (dos del mismo dia salen en
     cualquier orden por PostgREST, asi que el orden no se compara). */
  catering: { rpc: 'catering_pantalla', listas: { events: ['id'] } },
  /* (171) El catalogo: los depositos por su clave; los proveedores y los productos de cada uno por
     posicion (es el orden de la hoja Proveedores). */
  catalogo: { rpc: 'catalogo_pantalla', listas: { deps: ['id'] }, orden: true },
  /* (172) Las compras de carne por su id y en orden (la mas nueva primero); los cortes por abreviatura. */
  comprasCarne: { rpc: 'compras_carne_pantalla', listas: { compras: ['id'], cortes: ['abbr'] }, orden: true },
  /* (173) Faltan para entregar: los productos por abreviatura y en orden (de mayor a menor falta);
     los pedidos de cada uno por posicion. `generado` es la hora de cada respuesta. */
  faltantes: { rpc: 'faltantes_pantalla', listas: { faltan: ['a'] }, orden: true, ignorar: ['generado'] },
  /* (174) Las billeteras: las personas en el orden de Saldo Base (por posicion). */
  billetera: { rpc: 'billetera_pantalla', listas: {}, orden: true },
  /* (175) La liquidacion de Red: los vendedores por nombre y en orden; lo de adentro por posicion. */
  redLiquidacion: { rpc: 'red_liquidacion_pantalla', listas: { vendedores: ['nombre'] }, orden: true },
  /* (176) ocLight: las lineas de la lista y de stock por posicion (el orden de la hoja). */
  ocLight: { rpc: 'oc_light_pantalla', listas: {}, orden: true },
  /* (177) El historial de un pedido: los cambios por posicion (del mas nuevo al mas viejo). */
  pedidoCambios: { rpc: 'pedido_cambios_pantalla', listas: {}, orden: true },
  /* (178) La campanita: los avisos por id y en orden. */
  avisosErp: { rpc: 'avisos_erp_pantalla', listas: { avisos: ['id'] }, orden: true },
  /* (179) Los hogares fusionados, en orden (por posicion). */
  hogaresMerge: { rpc: 'hogares_merge_pantalla', listas: {}, orden: true },
  /* (180) El saldo a favor de un cliente (Ruta). */
  saldoCliente: { rpc: 'saldo_cliente_pantalla', listas: {} },
  /* (181) La ruleta del QR: solo la pide la tienda (tienda_ruleta, publica). La fila es para el comparador. */
  ruleta: { rpc: 'tienda_ruleta', listas: { premios: ['i'] }, orden: true },
  /* (182) Los vendedores activos (publica: la misma que la tienda), por nombre y en el orden de la hoja. */
  vendedores: { rpc: 'tienda_vendedores', listas: { vendedores: ['nombre'] }, orden: true },
  /* (183) La tabla de precios (con el costo: solo con sesion). Es un objeto por abreviatura. */
  precios: { rpc: 'precios_pantalla', listas: {} },
  /* (184) Si un pedido entro (publica). Ruta la usa solo para el SI: ver npPreguntarSiEntro. */
  pedidoEntro: { rpc: 'tienda_pedido_entro', listas: {} },
  /* (185) Validar un cupon (publica, la usa solo la tienda): por codigo, con los items del carrito. */
  validarCupon: { rpc: 'tienda_validar_cupon', listas: {} },
  /* (186) El seguimiento de un pedido (publica, la usa solo la tienda): por codigo co_...; las
     etapas van en orden. `ahora` es la hora de la respuesta: no se compara. */
  seguimiento: { rpc: 'tienda_seguimiento', listas: {}, ignorar: ['ahora'] },
  /* (187) Mi Portal: las piezas de un pedido de Red (por id, en el orden de la hoja) y el vendedor
     por usuario o WhatsApp. */
  redPiezasPedido: { rpc: 'red_piezas_pedido_pantalla', listas: { piezas: ['id'] }, orden: true },
  resolverVendedor: { rpc: 'resolver_vendedor_pantalla', listas: {} },
  /* (188) La ficha del cliente: los pedidos por canal y numero, del mas nuevo al mas viejo; los
     productos por abreviatura, de mas a menos plata. La fila de «Clientes Meta» no esta en la base. */
  crmCliente: { rpc: 'crm_cliente_pantalla', listas: { 'cliente.pedidos': ['canal', 'nPed'], 'cliente.topProductos': ['abrev'] }, orden: true,
    ignorar: ['cliente.meta._row'] },
  /* (189) La ficha del producto: los clientes por clave y los proveedores por nombre, en orden; las
     entregas y las compras recientes por posicion (de la mas nueva a la mas vieja). */
  crmProducto: { rpc: 'crm_producto_pantalla', listas: { topClientes: ['key'], proveedores: ['prov'] }, orden: true },
  /* (200) Abastecimiento. La base da los DATOS y la respuesta la arma bq_motor.js (copiado de
     Code.js). Los proveedores, las OC, los clientes y las deudas por su clave y en orden; lo de
     adentro por posicion. Los pagos salen de la base aunque Apps Script los lea de la hoja: de
     donde salieron, lo que tardaron y la cuenta que la hoja deja vacia (la base dice mp) no se comparan. */
  busqueda: { rpc: 'busqueda_pantalla', listas: { provs: ['n'], ocs: ['oc', 'r'], clientes: ['n', 'ped', 'canal'], deudas: ['n'] }, orden: true, motor: 'bq',
    ignorar: ['pagosFuente', 'pagosNota', 'pagosMs', 'deudas.semanas.pagosImp.cta', 'deudas.pagosLibres.cta'] },
  /* (201) La escala de Red. La base da los datos (la escala, Productos, Red) y la respuesta la arma
     re_motor.js (copiado de Code.js). Los productos por abreviatura y los vendedores por nombre, en
     orden. `leida` es cuando se leyo la escala: no se compara. */
  redEscala: { rpc: 'red_escala_pantalla', listas: { productos: ['a'], vendedores: ['nombre'] }, orden: true, motor: 're', ignorar: ['leida'] },
  /* (202) Lo que se esta acomodando (las cargas diferidas, con DIF_BASE en la base): por id y en
     orden. `ahora` es la hora de cada respuesta; `tarde` depende de ella. */
  diferidos: { rpc: 'diferidos_pantalla', listas: { items: ['id'] }, orden: true, ignorar: ['ahora', 'items.tarde'] },
  /* (203) Ruta › Cobros. La base da los DATOS y la respuesta la arma cp_motor.js (copiado de Code.js).
     Los cobros por clave y en orden (Home, Pilar, Clubes y los vendedores); lo sin cerrar de Red por
     vendedor; lo de adentro por posicion. */
  cobrosPendientes: { rpc: 'cobros_pendientes_pantalla', listas: { cobros: ['key'], sinCerrar: ['vendedor'] }, orden: true, motor: 'cp' },
  /* (204) Mi reparto: las entregas de ese dia en el orden de la hoja (por posicion). La base recibe
     {usuario, fecha} en `p` y el motor tambien. */
  miReparto: { rpc: 'mi_reparto_pantalla', listas: {}, orden: true, motor: 'mr' },
  /* (205) Descargar el auto: la reposicion por abreviatura y los pedidos por cliente y numero, en orden;
     las notas de cada proveedor por posicion. `dia` es el de la respuesta. */
  pendientesGuardarStock: { rpc: 'pendientes_guardar_pantalla', listas: { deposito: ['abbr'] }, orden: true, motor: 'pg' },
  /* (206) Catering › Cumpleaños: los clientes por telefono y en orden (los dias que faltan, el nombre). */
  cumplesCatering: { rpc: 'cumples_catering_pantalla', listas: { lista: ['tel'] }, orden: true },
  /* (139) Mi Portal › Vendedores (solo admin): los vendedores por nombre y en orden; sus pedidos
     por numero y en el orden de la hoja; las cuentas por id. */
  redPedidosAbiertos: { rpc: 'red_pedidos_abiertos_pantalla', listas: { vendedores: ['nombre'], pedidos: ['n'], cuentas: ['id'] }, orden: true },
  /* (190) Mi Portal › Objetivos del equipo (solo admin). La base da Red, Vendedores y Objetivos Red
     y la respuesta la arma ro_motor.js (copiado de Code.js); `porVenta` y `abrio` salen de las
     propiedades del script, que traen Apps Script (`_motorCtx`, `redObjetivosProps`). */
  redObjetivosEquipo: { rpc: 'red_objetivos_equipo_pantalla', listas: { vendedores: ['nombre'] }, orden: true, motor: 'ro' },
  /* (191) El portal del vendedor: la base da SUS filas de Red crudas y los numeros los arma
     dv_motor.js. Tareas, objetivo, Telegram, escala y liquidaciones salen de
     `dashboardVendedorEfectos` (Apps Script, que ademas hace los efectos): no se comparan. Los
     pedidos por numero y en orden; los clientes por nombre; los meses y las semanas por posicion. */
  dashboardVendedor: { rpc: 'dashboard_vendedor_pantalla', listas: { pedidos: ['n'], clientes: ['n'] }, orden: true, motor: 'dv',
    ignorar: ['tareas', 'objetivo', 'tg', 'liqs', 'liqProx', 'stats.escala'] }
};
function _lecArmaComparar(accion,a,b){
  var cfg=LEC_ARMA[accion]||{}, listas=cfg.listas||{}, fuera={ts:1,base:1}, det={}, n=0;
  (cfg.ignorar||[]).forEach(function(k){ fuera[k]=1; });
  var anotar=function(c,k){ n++; if(!det[c])det[c]={n:0,ej:k}; det[c].n++; };
  var vacio=function(x){ return x===undefined||x===null||x===''; };
  var cerca=function(x,y){ return Math.abs(x-y)<Math.max(1e-6,5e-6*Math.max(Math.abs(x),Math.abs(y))); };
  var comp=function(x,y,ruta,ej){
    if(vacio(x)&&vacio(y))return;
    if(typeof x==='number'&&typeof y==='number'){ if(!cerca(x,y))anotar(ruta,ej); return; }
    if(Array.isArray(x)&&Array.isArray(y)){
      var cl=listas[ruta];
      if(cl){
        var A={}, B={}, vez={}, clave=function(z){ var k=cl.map(function(c){ return String(z&&z[c]); }).join('|'); vez[k]=(vez[k]||0)+1; return k+'#'+vez[k]; };
        x.forEach(function(z){ A[clave(z)]=z; }); vez={}; y.forEach(function(z){ B[clave(z)]=z; });
        Object.keys(A).forEach(function(k){ if(!(k in B))anotar(ruta+'._solo_apps_script',k); else comp(A[k],B[k],ruta,k); });
        Object.keys(B).forEach(function(k){ if(!(k in A))anotar(ruta+'._solo_base',k); });
        if(cfg.orden&&x.map(function(z){ return cl.map(function(c){ return z[c]; }).join('|'); }).join(',')!==y.map(function(z){ return cl.map(function(c){ return z[c]; }).join('|'); }).join(','))anotar(ruta+'._orden','');
        return;
      }
      if(x.length!==y.length){ anotar(ruta+'._largo',ej); return; }
      x.forEach(function(z,i){ comp(z,y[i],ruta,ej); });
      return;
    }
    if(x&&y&&typeof x==='object'&&typeof y==='object'){
      var ks={}; Object.keys(x).concat(Object.keys(y)).forEach(function(k){ ks[k]=1; });
      Object.keys(ks).forEach(function(k){ var rk=ruta?ruta+'.'+k:k; if(fuera[rk])return; comp(x[k],y[k],rk,ej); });   /* `ignorar` acepta rutas: 'stats.escala' (191) */
      return;
    }
    if(String(x)!==String(y)||typeof x!==typeof y)anotar(ruta||'(raiz)',ej);
  };
  comp(a||{},b||{},'','');
  /* Una lista puede estar adentro de otro objeto ('cliente.pedidos', 188). */
  var en=function(o,r){ return r.split('.').reduce(function(x,k){ return x&&x[k]; },o); };
  var filas=0; Object.keys(listas).forEach(function(k){ filas+=(en(a,k)||[]).length; });
  det._pantalla={n:0,ej:accion};
  return {pedidos:filas,diferencias:n,detalle:det};
}
/* (190) Lo que un motor necesita y no esta en la base, sacado de la respuesta de Apps Script (al
   medir, y en la prueba): las jugadas, los templates de WATI; los objetivos del equipo, las
   propiedades ro_pv_/ro_abrio_ de cada vendedor (`porVenta` y `abrio`, que salen de ahi). */
function _motorCtx(accion,d){
  if(accion==='redObjetivosEquipo'){
    var p={};
    ((d&&d.vendedores)||[]).forEach(function(v){ if(v.porVenta!=null)p['ro_pv_'+v.nombre]=v.porVenta; if(v.abrio)p['ro_abrio_'+v.nombre]=v.abrio; });
    return {props:p};
  }
  return {tpls:d&&d.tpls};
}

G.LEC_ARMA = LEC_ARMA; G._lecArmaComparar = _lecArmaComparar; G._motorCtx = _motorCtx;
})(typeof window !== "undefined" ? window : globalThis);
