/* GENERADO por _tools/copiar_motor.js desde estancias/.clasp-src/Code.js: NO SE EDITA.
   El motor de CRM › Hoy (164). Ver el encabezado de _tools/copiar_motor.js. */
(function (G) {
/* EL «MINI APPS SCRIPT» DEL MOTOR DE LAS JUGADAS (164, 27/10/2026). Lo usa _tools/copiar_motor.js:
   donde dice MOTOR (entre barra-asterisco) entra el codigo de las jugadas copiado de Code.js. Lo de
   abajo de eso REEMPLAZA a las funciones que en Apps Script leen afuera (la ultima declaracion
   gana). Los datos son los de `crm_jugadas_pantalla` (164): se presentan como las hojas que el
   motor lee con SS.getSheetByName, en las mismas columnas. */

/* `Date` con un reloj que se puede fijar: la prueba compara contra Apps Script parado en la hora
   en que contesto. En la pantalla nadie lo fija y es el reloj de siempre. */
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
_Hoja.prototype.getRange = function (r, c, nr, nc) {
  var f = this.f, out = [];
  nr = nr || 1; nc = nc || 1;
  for (var i = 0; i < nr; i++) { var fila = f[r - 1 + i] || [], o = []; for (var j = 0; j < nc; j++) { var v = fila[c - 1 + j]; o.push(v === undefined || v === null ? '' : v); } out.push(o); }
  return { getValues: function () { return out; }, getDisplayValues: function () { return out; } };
};
_Hoja.prototype.getDataRange = function () { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); };
var _HOJAS = {}, _DATOS = null, _TPLS = null;
var SS = { getSheetByName: function (n) { return _HOJAS[n] || null; } };
var CacheService = { getScriptCache: function () { return { get: function () { return null; }, put: function () {} }; } };
var ContentService = { MimeType: { JSON: 'json' },
  createTextOutput: function (s) { return { setMimeType: function () { return this; }, getContent: function () { return s; } }; } };
var Utilities = { formatDate: function (d, tz, fmt) {
  var dos = function (n) { return (n < 10 ? '0' : '') + n; };
  return String(fmt).replace(/yyyy|yy|MM|dd|HH|mm|ss/g, function (t) {
    return t === 'yyyy' ? d.getFullYear() : t === 'yy' ? dos(d.getFullYear() % 100) : t === 'MM' ? dos(d.getMonth() + 1)
      : t === 'dd' ? dos(d.getDate()) : t === 'HH' ? dos(d.getHours()) : t === 'mm' ? dos(d.getMinutes()) : dos(d.getSeconds());
  });
} };


var PJ = {
  RITMO_MIN_VENTAS: 3,   // con 2 compras hay UN intervalo: no es un ritmo
  GUSTO_MIN: 2,          // "siempre elige": al menos 2 veces...
  GUSTO_PCT: 0.6,        // ...y en 6 de cada 10 compras de esa familia
  FIEL_PCT: 0.5,         // "compra siempre lo mismo": la familia pesa la mitad o mas
  DIA_MIN: 3, DIA_PCT: 0.5,
  /* EL DIA HABITUAL (13/10/2026). "Los viernes" de la frase alcanza con la mitad
     de las compras; para decidir QUE DIA se le escribe hace falta mas: 7 de cada
     10 entregas el mismo dia. Medido ese dia sobre 217 casas vivas (60 dias):
     con 50% son 86, con 70% son 28 (19 viernes, 7 sabado, 2 domingo). El 58% de
     TODAS las entregas es viernes o sabado: un 50% de viernes no dice nada. */
  DIAHAB_MIN: 3, DIAHAB_PCT: 0.7,
  FRANJA_MIN: 3, FRANJA_PCT: 0.6,
  REPO_DESDE: 0.85, REPO_HASTA: 1.6,   // ventana alrededor de su ritmo
  /* 10 a 36 dias (12/10/2026). Medido: parada sin haber vuelto, una casa de una
     sola compra vuelve en los 14 dias siguientes el 14% de las veces en el dia 10,
     el 14% en el 16, el 15% en el 23 y el 11% en el 30; en el 37 cae al 7% y desde
     el 45 al 5%. Cortar en 15 dejaba afuera justo el tramo donde todavia vuelve. */
  SEGUNDA_DESDE: 10, SEGUNDA_HASTA: 36,
  SEGUNDA_INTENTOS: 2,   // dos mensajes como mucho, separados por REPETIR_DIAS
  REPETIR_DIAS: 14,
  VOLVE_DESDE: 45,       // hasta CLI_DORMIDO_DIAS: antes de dormirse, no despues
  NUEVO_MAX_FAM: 2,      // nunca salio de una o dos familias
  SIN_COMPRA_DIAS: 7,    // nunca a quien compro hace menos de N dias
  TOPE_DIAS: 7,          // un mensaje por casa cada 7 dias
  CONTROL_CADA: 10,      // 1 de cada 10 no recibe, para medir
  VENTANA: 14,           // dias en los que se mira si compro
  HISTORIA_DESDE: '2026-03-01'
};
/* El nombre de un template de jugada: `jug_<tag>_<a|b>` o, desde el 15/10/2026,
   `jug_<tag>_cup_<a|b>` (el del boton con cupon). [1] = tag, [2] = version. */
var PJ_TPL_RE_ = /^jug_([a-z]+)_(?:cup_)?([ab])$/;
var PJ_DIAS_ = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
/* Dias y horarios de reparto en Estancias: los mismos que `horarios` de la
   tienda (tienda/app.js). Si cambian alla, cambian aca. */
var PJ_HORARIO_ = { 1: '18 a 19', 3: '19 a 21', 5: '19 a 21', 6: '19 a 21', 0: '11 a 13' };
/* El orden es la prioridad: una casa que cae en dos recibe la de mas arriba.
   Cada jugada tiene DOS templates de WATI (A y B), que escribio la sesion Wati y
   aprobo Tadeo el 12/10/2026: el texto que sale es el de ellos, aca no hay ninguna
   redaccion. `tag` es el nombre de la jugada en el template y en el link de
   origen (`?o=wati-<tag>-<a|b>`). Las variables se leen del template. */
var PJ_JUGADAS_ = [
  { id: 'segunda', tag: 'segunda', nombre: 'Segunda compra', tpl: { a: 'jug_segunda_a', b: 'jug_segunda_b' } },
  /* EL BOTON CON CUPON (15/10/2026). Volvé B y las dos de Probá algo nuevo pasan a
     los templates `_cup_`, aprobados por WATI ese dia: el boton abre
     `maleu.com.ar/?o=wati-<tag>-<a|b>&cupon=<codigo>` y la tienda lo deja
     aplicado. El codigo viaja en la variable "1" (`_pjVars_`). Los viejos
     (`jug_volve_b`, `jug_nuevo_a/b`) siguen en WATI y en la bitacora: el
     historial los sigue contando (PJ_TPL_RE_), solo se dejan de mandar. */
  { id: 'volve', tag: 'volve', nombre: 'Volvé', tpl: { a: 'jug_volve_a', b: 'jug_volve_cup_b' } },
  { id: 'ocasion', tag: 'ocasion', nombre: 'Ocasión', tpl: { a: 'jug_ocasion_a', b: 'jug_ocasion_b' } },
  /* TU DIA (13/10/2026, apagada: JUGADA_DIA). A la casa que recibe casi siempre el
     mismo dia se le escribe ESE dia, cuando ya le toca por su ritmo. Va antes
     que Reposicion y la reemplaza para esas casas. `pal` = la bandera de `cx`
     que la prende; sin ella la jugada no existe (ni cae nadie ni se dibuja). */
  { id: 'dia', tag: 'dia', nombre: 'Tu día', tpl: { a: 'jug_dia_a', b: 'jug_dia_b' }, pal: 'jDia' },
  { id: 'repo', tag: 'reposicion', nombre: 'Reposición', tpl: { a: 'jug_reposicion_a', b: 'jug_reposicion_b' } },
  { id: 'nuevo', tag: 'nuevo', nombre: 'Probá algo nuevo', tpl: { a: 'jug_nuevo_cup_a', b: 'jug_nuevo_cup_b' } },
  /* LA ESCALERA (13/10/2026, apagada: JUGADA_ESCALERA). El cliente ideal probo
     TODOS los productos: a cada casa se le propone el proximo que le falta
     (`_pjSiguiente_`). Va ultima: es la jugada de quien hoy no cae en ninguna. */
  { id: 'escalera', tag: 'escalera', nombre: 'El próximo producto', tpl: { a: 'jug_escalera_a', b: 'jug_escalera_b' }, pal: 'jEsc' }
];
/* EL NOMBRE DE PILA USABLE (12/10/2026). A un cliente le iba a salir "¿Te llevamos
   las pizzas de jamón y queso este viernes, Pmo?". El nombre con que se cargo un
   pedido no siempre es un nombre: hay siglas, apodos de carga ("Gordo", "Zorro") y
   dos palabras pegadas. Si no hay uno confiable NO se manda: la casa queda frenada
   con "revisar nombre" y se arregla cargandole el Apodo en la ficha.
   Vale: el Apodo de la ficha (lo cargo una persona), o el primer nombre si es un
   nombre conocido (esta lista) o lo llevan dos o mas clientes del CRM. */
var PJ_NOMBRES_ = ('adrian adriana agostina agustin agustina alan alberto aldana alejandra alejandro alejo alfonso alfredo alicia amalia amparo ana analia andrea andres angel angela angeles angie antonella antonio ariana ariel augusto aurelia aurora barbara bautista beatriz belen beltran benicio benjamin bernardo betina bianca borja brenda bruno camila candela candelaria carina carla carlos carlota carmela carmen carola carolina catalina cecilia celeste celina cesar christian clara claudia claudio constanza consuelo cristian cristina daniel daniela dario david debora delfina diego dimas dionisio dolores eduardo elena elisa eliana elvira emilia emiliano emilio enrique ernesto estanislao esteban estefania eugenia eugenio eva ezequiel fabian fabiana facundo fatima fausto federica federico felicitas felipe felix fermin fernanda fernando fiona flavia florencia francisca francisco franco gabriel gabriela gaston geronimo german gisela gisella giuseppe gloria gonzalo graciela guadalupe guido guillermina guillermo gustavo hector helen helena hernan horacio hugo ignacio ines inaki irene isabel isabella ivan jacinta javier jazmin jeronimo jessica jimena joaquin joaquina jorge jose josefina juan juana julia julian juliana julieta julio justina justo karina laura lautaro leandro leonardo leonel leonor leticia lidia liliana lino lisandro lola lorena lorenzo lourdes luca lucas lucia luciana luciano lucila lucio lucrecia luis luisa luján luz magdalena maia malena manuel manuela marc marcela marcelo marcos margarita maria mariana mariano mariel marina mario marta martin martina mateo matias matilde mauricio mauro maximiliano maximo melina mercedes micaela miguel milagros mirta monica nahuel natalia nazarena nicolas noelia nora norberto octavio olivia oscar pablo paloma pamela patricia patricio paula paulina pauline paz pedro peter pia pilar rafael ramiro ramon raul renata ricardo roberto rocio rodolfo rodrigo roman romina rosa rosario ruben salvador sandra santiago santino santos sara sebastian segundo sergio silvia silvina simon simona sofia sol soledad sophia susana tadeo tatiana teresa thiago tiago tobias tomas trinidad valentin valentina valeria vanesa veronica vicente victor victoria violeta virginia viviana walter ximena yanel yanina ' +
  /* como se nombran a si mismos: se usan tal cual */
  'agus ale bauti bel belu benja cami caro chiqui coco juampi juanma juanpi kike lalo paco pancho pepe pipe quique tato carme cata ceci clari dani dolo edu emi euge facu fede feli fer flor fran gabi gero gonza guada guille gus ine jime joaco jose josefa juanchi juancho juani juli lau lolo luchi luli lucho lucre lupe magui majo male manu maru martu mati maxi may mechi meli mica michi mili milu nacho nati nico nini oli pato patri pau pili rafa ro rochi rodri romi rufo salva santi sebas sofi su tade tere tino tomi tommy tomy toto trini vale vicky viki vir yani').split(' ');
var PJ_NOMBRES_SET_ = null;
var PJ_NO_NOMBRE_ = { casa: 1, lote: 1, familia: 1, flia: 1, sr: 1, sra: 1, senor: 1, senora: 1, don: 1, dona: 1, dr: 1, dra: 1,
  vecino: 1, vecina: 1, cliente: 1, clienta: 1, mama: 1, papa: 1, abuela: 1, abuelo: 1, tio: 1, tia: 1, club: 1, pedido: 1,
  sin: 1, nn: 1, prueba: 1, test: 1, consumo: 1, maleu: 1 };
function _pjSinTilde_(x) {
  x = String(x || '').toLowerCase();
  return x.normalize ? x.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : x;
}
/* {ok, nombre, crudo, por}. `m` es un integrante: {nombre, apodo, formas:[como
   aparece escrito en sus pedidos]}. `cx.nomFreq` = cuantos clientes del CRM llevan
   cada primer nombre. La tilde sale de como lo tenga escrito el CRM para ESA
   persona; no se inventa. */
function _pjNombre_(m, cx) {
  if (!PJ_NOMBRES_SET_) { PJ_NOMBRES_SET_ = {}; PJ_NOMBRES_.forEach(function (n) { PJ_NOMBRES_SET_[_pjSinTilde_(n)] = 1; }); }
  var ap = String((m && m.apodo) || '').trim().replace(/\s+/g, ' ');
  var crudo = ap || String((m && m.nombre) || '').trim();
  var mal = function (por) { return { ok: false, nombre: '', crudo: crudo, por: por }; };
  /* UN APODO CARGADO A MANO SE RESPETA (14/10/2026). Lo cargo Tadeo y es como
     saluda de verdad («PMO» a Pablo Montes de Oca): no se le aplica ni la sigla,
     ni el largo, ni las palabras pegadas, ni el diccionario, y sale con las
     mayusculas tal como se escribio. Solo se descarta si tiene numeros o signos. */
  if (ap) {
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(ap)) return mal('el apodo tiene signos o números');
    return { ok: true, nombre: ap, crudo: crudo, por: '' };
  }
  var t = crudo.split(/\s+/).filter(Boolean)[0] || '';
  if (!t) return mal('no tiene nombre');
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$/.test(t)) return mal('tiene signos o números');
  if (t.length < 3) return mal('es muy corto');
  if (!/[aeiouáéíóúü]/i.test(t)) return mal('parece una sigla');
  if (t === t.toUpperCase() && t.length <= 3) return mal('parece una sigla');
  if (/[a-záéíóúüñ][A-ZÁÉÍÓÚÑ]/.test(t)) return mal('son dos palabras pegadas');
  var base = _pjSinTilde_(t);
  if (PJ_NO_NOMBRE_[base]) return mal('no es un nombre');
  if (!PJ_NOMBRES_SET_[base] && !(((cx && cx.nomFreq) || {})[base] >= 2)) return mal('no lo reconozco como nombre');
  var out = t;
  ((m && m.formas) || []).concat([m.nombre]).forEach(function (f) {
    var x = String(f || '').trim().split(/\s+/)[0] || '';
    if (x && _pjSinTilde_(x) === base && x.toLowerCase() !== _pjSinTilde_(x) && /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$/.test(x)) out = x;
  });
  return { ok: true, nombre: out.charAt(0).toUpperCase() + out.slice(1).toLowerCase(), crudo: crudo, por: '' };
}
var PJ_FAM_TXT_ = { Pizzas: 'las pizzas', Sorrentinos: 'los sorrentinos', Empanadas: 'las empanadas',
  Postres: 'los postres', Tartas: 'las tartas', Wraps: 'los wraps', Carnes: 'la carne' };

function _pjHoraMin_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.getHours() * 60 + v.getMinutes();
  var m = String(v == null ? '' : v).match(/^\s*(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
/* 1 uso un cupon, 0 no uso, null no hay dato. El 10% del efectivo (`auto10`) y
   el saldo a favor (`r`) no son cupones. */
function _pjUsoCupon_(det, de) {
  if (String(de == null ? '' : de).trim()) return 1;
  var s = String(det == null ? '' : det).trim();
  if (!s) return null;
  try {
    var o = JSON.parse(s);
    return (Number(o.g) > 0 || (o.c && Object.keys(o.c).length > 0)) ? 1 : 0;
  } catch (e) { return null; }
}
function _pjDia0_(ms) { var d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
function _pjDiasEntre_(a, b) { return Math.round((_pjDia0_(b) - _pjDia0_(a)) / 86400000); }
function _pjMediana_(a) {
  if (!a.length) return 0;
  var s = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function _pjModa_(cuenta) {
  var k = '', mx = 0, tot = 0;
  Object.keys(cuenta).forEach(function (x) { tot += cuenta[x]; if (cuenta[x] > mx) { mx = cuenta[x]; k = x; } });
  return { k: k, n: mx, pct: tot ? mx / tot : 0, tot: tot };
}
function _pjHash_(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}
/* La misma normalizacion de lote que `_loteNorm` del panel: si se despegan, una
   casa del panel son dos aca. `probar_jugadas.js` las cruza. */
function _pjLoteNorm_(s) {
  s = String(s || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/^0+(?=\d)/, '');
  return s || '0';
}
/* Donde vive, con la MISMA regla que la lista de crmClientes (las correcciones
   de Clientes Meta mandan sobre lo que tipeo el cliente). */
function _pjUbicacion_(c, m) {
  var barrio = _crmTopValue(c.barrios), sub = _crmTopValue(c.subBarrios), lote = _crmTopValue(c.domicilios);
  if (m && m.barrioMapa) barrio = m.barrioMapa;
  if (m && m.sinUbicacion) { sub = ''; lote = ''; }
  else {
    if (m && m.loteMapa) lote = m.loteMapa;
    if (m && m.subBarrioMapa) sub = m.subBarrioMapa;
  }
  return { barrio: barrio, sub: sub, lote: lote, visita: !!(m && m.visitante) };
}
/* "Sorrentinos Jamón y Queso" → los · sorrentinos de jamón y queso. */
function _pjProdTxt_(nombre) {
  var s = String(nombre || '').replace(/\s+x\d+\s*$/i, '').replace(/\s+/g, ' ').trim();
  var m = s.match(/^(\S+)\s*(.*)$/);
  if (!m) return { art: '', txt: '' };
  var tipo = m[1].toLowerCase(), resto = m[2].toLowerCase(), de = resto ? ' de ' + resto : '';
  if (tipo === 'sorrentinos') return { art: 'los', txt: 'sorrentinos' + de };
  if (tipo === 'empanadas') return { art: 'las', txt: 'empanadas' + de };
  if (tipo === 'pizza') return { art: 'las', txt: 'pizzas' + de };
  if (tipo === 'pack') return { art: 'los', txt: 'packs de pizza' + de };
  if (tipo === 'tarta') return { art: 'las', txt: 'tartas' + de };
  if (tipo === 'wrap') return { art: 'los', txt: 'wraps' + de };
  if (tipo === 'torta') return { art: 'la', txt: 'torta' + (resto ? ' ' + resto : '') };
  if (tipo === 'franui') return { art: 'los', txt: 'franui' };
  if (tipo === 'carne') return { art: /^(entraña|picaña|colita)/.test(resto) ? 'la' : 'el', txt: resto || 'carne' };
  return { art: '', txt: s.toLowerCase() };
}
function _pjFamTxt_(fam) { return PJ_FAM_TXT_[fam] || String(fam || '').toLowerCase(); }
function _pjSinArt_(t) { return String(t || '').replace(/^(los|las|el|la)\s+/, ''); }
function _pjLista_(a) {
  if (!a.length) return '';
  if (a.length === 1) return a[0];
  return a.slice(0, -1).join(', ') + ' ni ' + a[a.length - 1];
}

/* A quien se le habla. La casa junta a todos los que piden desde ese lote; las
   visitas (pidieron a una casa ajena) y todo lo que no es Estancias va por
   persona. Los pedidos de una casa son los de TODOS sus canales. */
function _pjUnidades_(index, meta) {
  var U = {}, orden = [];
  Object.keys(index).forEach(function (key) {
    var c = index[key], m = c.tel ? meta[c.tel] : null;
    var ub = _pjUbicacion_(c, m);
    var esCasa = _crmNormNombre(ub.barrio) === 'estancias del pilar' && !!ub.lote && !!ub.sub && !ub.visita;
    var k = esCasa ? ('casa:' + _crmNormNombre(ub.sub) + '|' + _pjLoteNorm_(ub.lote)) : ('per:' + key);
    var u = U[k];
    if (!u) {
      u = U[k] = { k: k, casa: esCasa, barrio: ub.barrio, sub: ub.sub, lote: ub.lote, miembros: [], pedidos: [], pend: 0,
                   /* visita: la persona esta marcada Visita en Personas (pide a casa ajena). Nunca es una casa. */
                   visita: !esCasa && ub.visita };
      orden.push(k);
    }
    u.miembros.push({
      key: key, tel: c.tel || '',
      nombre: (m && m.nombreCanonico) || _crmTopValue(c.nombres),
      apodo: (m && m.apodo) || '',
      formas: Object.keys(c.nombres || {}),
      ent: c.countEntregados || 0,
      vend: !!(c.tel && _CRM_TEL_VEND_ && _CRM_TEL_VEND_[c.tel])
    });
    for (var i = 0; i < c.pedidos.length; i++) u.pedidos.push(c.pedidos[i]);
    u.pend += c.pend || 0;
  });
  return orden.map(function (k) { return U[k]; });
}

/* Las compras de una unidad, UNA POR DIA de entrega (dos pedidos del mismo dia
   son una compra: para el ritmo no importa si fueron dos viajes). Solo lo
   entregado, y solo lo anterior a `hasta` cuando se mira el pasado. */
function _pjVentas_(pedidos, hasta) {
  var por = {};
  for (var i = 0; i < pedidos.length; i++) {
    var p = pedidos[i];
    if (p.estado !== 'Entregado' || !p.ventaSort || p.grp) continue;   // grupal: no marca el ritmo de la casa
    var t = _pjDia0_(p.ventaSort);
    if (hasta && t >= hasta) continue;
    var v = por[t] || (por[t] = { t: t, total: 0, prods: {}, he: null, canal: p.canal, cup: null });
    v.total += Number(p.ventaTotal) || Number(p.total) || 0;
    (p.productos || []).forEach(function (x) { v.prods[x.a] = (v.prods[x.a] || 0) + x.q; });
    if (typeof p.he === 'number' && (v.he === null || p.he < v.he)) v.he = p.he;
    if (p.cup === 1) v.cup = 1; else if (p.cup === 0 && v.cup === null) v.cup = 0;
  }
  return Object.keys(por).map(function (k) { return por[k]; }).sort(function (a, b) { return a.t - b.t; });
}

/* El perfil de consumo, parado en `hoy0` (medianoche). `cx` trae lo que no es
   del cliente: {fam: abrev→familia, precio, nombres, fams: [familias en venta]}.
   Cada dato lleva al lado si alcanza (`rOk`, `diaOk`, `fjOk`, `sp`): un ritmo de
   una sola distancia o un dia con dos compras no se afirman. */
function _pjPerfil_(u, hoy0, cx, hasta) {
  var V = _pjVentas_(u.pedidos, hasta);
  var p = { n: V.length, vis: !!u.visita };
  if (!V.length) return p;
  var famPlata = {}, famVentas = {}, prodVentas = {}, plata = 0;
  var dows = {}, franjas = {}, canales = {}, totales = [], cup = 0, cupBase = 0;
  V.forEach(function (v) {
    var vistas = {};
    Object.keys(v.prods).forEach(function (ab) {
      var f = cx.fam[ab];
      if (!f) return;
      var val = v.prods[ab] * (Number(cx.precio[ab]) || 0) || v.prods[ab];
      famPlata[f] = (famPlata[f] || 0) + val; plata += val;
      if (!vistas[f]) { vistas[f] = 1; famVentas[f] = (famVentas[f] || 0) + 1; }
      prodVentas[ab] = (prodVentas[ab] || 0) + 1;
    });
    var dw = new Date(v.t).getDay();
    dows[dw] = (dows[dw] || 0) + 1;
    if (v.he !== null) { var fj = v.he < 15 * 60 ? 'm' : 't'; franjas[fj] = (franjas[fj] || 0) + 1; }
    canales[v.canal] = (canales[v.canal] || 0) + 1;
    if (v.total > 0) totales.push(v.total);
    if (v.cup !== null) { cupBase++; if (v.cup === 1) cup++; }
  });
  var fam = '', mx = -1;
  Object.keys(famPlata).forEach(function (f) { if (famPlata[f] > mx) { mx = famPlata[f]; fam = f; } });
  p.fam = fam; p.famPct = plata > 0 ? Math.round(100 * mx / plata) : 0;
  var g = '', gn = 0;
  Object.keys(prodVentas).forEach(function (ab) {
    if (cx.fam[ab] === fam && prodVentas[ab] > gn) { gn = prodVentas[ab]; g = ab; }
  });
  p.g = g; p.gN = gn;
  p.gPct = famVentas[fam] ? Math.round(100 * gn / famVentas[fam]) : 0;
  p.sp = gn >= PJ.GUSTO_MIN && gn / (famVentas[fam] || 1) >= PJ.GUSTO_PCT;
  p.prob = Object.keys(famVentas);
  p.nu = cx.fams.filter(function (f) { return !famVentas[f]; });
  var gaps = [];
  for (var i = 1; i < V.length; i++) gaps.push(Math.round((V[i].t - V[i - 1].t) / 86400000));
  p.r = gaps.length ? Math.max(1, Math.round(_pjMediana_(gaps))) : 0;
  p.rOk = V.length >= PJ.RITMO_MIN_VENTAS;
  p.pri = V[0].t; p.ult = V[V.length - 1].t;
  p.d = Math.round((hoy0 - p.ult) / 86400000);
  p.toca = p.r ? p.r - p.d : null;          // dias que faltan para que le toque (negativo: se paso)
  var md = _pjModa_(dows);
  p.dia = md.k === '' ? -1 : Number(md.k); p.diaPct = Math.round(100 * md.pct);
  p.diaOk = V.length >= PJ.DIA_MIN && md.pct >= PJ.DIA_PCT;
  /* diaCl: el dia es CLARO (alcanza para elegir que dia se le escribe). */
  p.diaCl = V.length >= PJ.DIAHAB_MIN && md.pct >= PJ.DIAHAB_PCT;
  /* pr: los productos del catalogo que ya probo (la escalera: "probo N de M"). */
  p.pr = Object.keys(prodVentas);
  var mf = _pjModa_(franjas);
  p.fj = mf.k; p.fjOk = mf.tot >= PJ.FRANJA_MIN && mf.pct >= PJ.FRANJA_PCT;
  p.tk = Math.round(_pjMediana_(totales));
  p.cup = cup; p.cupBase = cupBase;
  p.can = _pjModa_(canales).k;
  /* UN PEDIDO DE RED Y ES DEL VENDEDOR (18/10/2026). Con la moda, Francisco
     Bottcher (1 Home + 1 Red) caia en Home por empate y le salia «Probá algo
     nuevo» con EMPA20: Red va sin descuentos y el cliente es del vendedor. Paso
     desde que el 17/10 los pedidos de Red tienen «Teléfono Cliente» y se juntan
     con los Home de la misma persona. Ese dia: Verónica Artica (6 Pilar + 2 Red)
     y Maria Casabal (1 + 1), frenadas solo por el tope.
     LA REGLA, de Tadeo (18/10 12:19): manda la mayoria de los PEDIDOS no
     cancelados, y un empate entre Red y Home/Pilar queda afuera. Bottcher y
     Casabal (1 y 1) afuera; Artica (6 Pilar y 2 Red) adentro. (`_pjReglas_`) */
  var _nRed = 0, _nOtro = 0;
  u.pedidos.forEach(function (q) {
    if (q.estado === 'Cancelado') return;
    if (q.canal === 'Red') _nRed++; else _nOtro++;
  });
  p.red = _nRed > 0 && _nRed >= _nOtro;
  p.est = _cliEstadoDias_(p.d);
  /* Cuando PIDE (no cuando recibe): dia y momento en que carga el pedido. Es
     cuando tiene el telefono en la mano: sirve para elegir la hora del mensaje. */
  var pd = {}, ph = {}, np = 0;
  for (var j = 0; j < u.pedidos.length; j++) {
    var q = u.pedidos[j];
    if (!q.fechaSort || (hasta && q.fechaSort >= hasta) || q.grp) continue;
    np++;
    var w = new Date(q.fechaSort).getDay(); pd[w] = (pd[w] || 0) + 1;
    if (typeof q.hp === 'number') { var b = q.hp < 12 * 60 ? 'mañana' : (q.hp < 18 * 60 ? 'tarde' : 'noche'); ph[b] = (ph[b] || 0) + 1; }
  }
  var mpd = _pjModa_(pd), mph = _pjModa_(ph);
  p.pideDia = (np >= PJ.DIA_MIN && mpd.pct >= PJ.DIA_PCT) ? Number(mpd.k) : -1;
  p.pideHora = (mph.tot >= PJ.FRANJA_MIN && mph.pct >= PJ.FRANJA_PCT) ? mph.k : '';
  return p;
}

/* ¿Tiene un pedido abierto parado en ese dia? Hoy: lo que el indice ya cuenta
   como "en curso". En el pasado: un pedido cargado antes y entregado despues. */
function _pjAbierto_(u, hoy0, hasta) {
  if (!hasta) return (u.pend || 0) > 0;
  for (var i = 0; i < u.pedidos.length; i++) {
    var p = u.pedidos[i];
    if (p.estado === 'Entregado' && p.fechaSort && p.fechaSort < hasta && p.ventaSort && _pjDia0_(p.ventaSort) >= hasta) return true;
  }
  return false;
}

/* En que jugadas cae (todas las que le correspondan). `cx.ocasion` es el dia
   especial de hoy, si lo hay; `cx.cupon` las familias con cupon por categoria. */
var PJ_CANAL_FUERA_ = { Clubes: 1, Red: 1 };
/* LAS VISITAS, AFUERA DE SEGUNDA COMPRA Y VOLVE (14/10/2026, pedido de Tadeo). Quien
   esta marcado Visita en Personas pidio a una casa ajena: que no haya vuelto no es
   una casa que se enfrio, es alguien que se fue. Se sacan igual que los canales de
   afuera, pero quedan anotadas en `out.visita` para que la pantalla las muestre
   frenadas con el motivo «visita» (ver `_pjCalcular_`). Las otras jugadas siguen. */
var PJ_VISITA_FUERA_ = { segunda: 1, volve: 1 };
function _pjReglas_(p, cx) {
  var out = [];
  if (!p.n) return out;
  /* CLUBES Y RED, AFUERA (13/10/2026, decision de Tadeo). Los templates llevan el
     boton "Pedir ahora" a la tienda, que es solo retail: un club que entra por
     ahi queda cargado como Home a precio Home, y en Red el cliente es del
     vendedor. No caen en ninguna jugada (ni aparecen en la lista) hasta que haya
     templates sin boton. El canal es el de la mayoria de sus compras. */
  if (PJ_CANAL_FUERA_[p.can] || p.red) return out;
  if (p.n === 1 && p.d >= PJ.SEGUNDA_DESDE && p.d <= PJ.SEGUNDA_HASTA) out.push('segunda');
  /* Tambien la de UNA sola compra (12/10/2026): entre los 45 y los 60 dias es el
     ultimo intento antes de que se duerma. Hasta ese dia pedia 2 compras y esas
     casas no caian en nada desde el dia 16. */
  if (p.d >= PJ.VOLVE_DESDE && p.d <= CLI_DORMIDO_DIAS) out.push('volve');
  if (cx.ocasion && p.n >= 2 && p.d <= CLI_DORMIDO_DIAS && p.fjOk && p.fj === cx.ocasion.franja) out.push('ocasion');
  /* Tu dia: hoy es SU dia y ya le toca (desde el 85% de su ritmo, igual que
     Reposicion). No pide que sea fiel a un producto: el dato es el dia. */
  var suDia = !!(cx.jDia && p.diaCl);
  if (suDia && p.dia === cx.hoyDw && p.d <= CLI_DORMIDO_DIAS && p.d >= Math.round((p.r || 7) * PJ.REPO_DESDE)) out.push('dia');
  /* A la casa con dia claro Reposicion no le llega un dia cualquiera: la lleva Tu dia. */
  if (!suDia && p.rOk && (p.sp || p.famPct >= PJ.FIEL_PCT * 100) && p.d <= CLI_DORMIDO_DIAS &&
      p.d >= Math.round(p.r * PJ.REPO_DESDE) && p.d <= Math.round(p.r * PJ.REPO_HASTA)) out.push('repo');
  if (p.n >= 2 && p.d <= CLI_ACTIVO_DIAS && p.prob.length <= PJ.NUEVO_MAX_FAM && _pjFamNueva_(p, cx)) out.push('nuevo');
  if (cx.jEsc && p.d <= CLI_DORMIDO_DIAS && _pjSiguiente_(p, cx)) out.push('escalera');
  if (p.vis) {
    var fuera = out.filter(function (id) { return PJ_VISITA_FUERA_[id]; });
    out = out.filter(function (id) { return !PJ_VISITA_FUERA_[id]; });
    out.visita = fuera;
  }
  return out;
}
/* EL PROXIMO ESCALON: de los productos que la casa nunca probo y hoy tienen
   stock, el que mas eligen las casas que compran lo mismo que ella (se suman las
   casas que llevaron ese producto Y alguno de los suyos). Empate: el que mas
   casas probaron; despues, por abreviatura (que no dependa del orden de la hoja).
   Uno solo: cuando lo compra, el escalon siguiente sale de la misma cuenta. */
function _pjSiguiente_(p, cx) {
  if (!cx.co || !cx.cat || !p.pr || !p.pr.length) return '';
  var ya = {}; p.pr.forEach(function (a) { ya[a] = 1; });
  var mejor = '', ms = -1, mp = -1;
  cx.cat.forEach(function (b) {
    if (ya[b] || !(Number(cx.stock[b]) > 0)) return;
    var s = 0;
    p.pr.forEach(function (a) { s += (cx.co[a] && cx.co[a][b]) || 0; });
    var pp = cx.popProd[b] || 0;
    if (s > ms || (s === ms && pp > mp) || (s === ms && pp === mp && b < mejor)) { mejor = b; ms = s; mp = pp; }
  });
  return mejor;
}
/* Cuantos del catalogo probo: {n, m}. */
function _pjProbados_(p, cx) {
  var en = {}; (cx.cat || []).forEach(function (b) { en[b] = 1; });
  return { n: (p.pr || []).filter(function (a) { return en[a]; }).length, m: (cx.cat || []).length };
}
/* La familia que se le ofrece: de las que nunca probo y tienen cupon, la que
   mas casas compran. Una sola. */
function _pjFamNueva_(p, cx) {
  var f = '', mx = -1;
  (p.nu || []).forEach(function (x) {
    if (!cx.cupon[x]) return;
    var n = cx.popular[x] || 0;
    if (n > mx) { mx = n; f = x; }
  });
  return f;
}
/* El primero de la casa al que se le puede escribir: con telefono, que no sea
   de un vendedor de Red, el que mas compro. */
function _pjContacto_(u) {
  var c = u.miembros.filter(function (m) { return m.tel && !m.vend; });
  c.sort(function (a, b) { return b.ent - a.ent; });
  return c[0] || null;
}
function _pjPrimerNombre_(m) {
  var s = String((m && (m.apodo || m.nombre)) || '').trim().split(/\s+/)[0] || '';
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}
/* Por que NO se le escribe hoy ('' = se le puede escribir). `j` es la jugada que
   le toca: con ella se mira si ya la recibio y si el nombre sirve.
   · tope: cualquier campaña a cualquiera de la casa en los ultimos 7 dias.
   · repetida: la misma jugada no se repite hasta que vuelva a comprar. Segunda
     compra tiene un segundo intento, a los 14 dias del primero.
   · nombre: va ultimo a proposito; una casa frenada por otra cosa igual figura
     en la lista de nombres a revisar (`nm` en la casa). */
function _pjFreno_(u, p, hoy0, cx, hasta, j) {
  /* "No escribirle mas" va primero: es una decision de una persona. */
  if (!hasta && _pjNoEscribirDe_(u, cx.noEsc)) return 'no-escribir';
  var con = _pjContacto_(u);
  if (!con) return u.miembros.some(function (m) { return m.vend; }) ? 'vendedor' : 'sin-tel';
  if (_pjAbierto_(u, hoy0, hasta)) return 'abierto';
  if (p.d < PJ.SIN_COMPRA_DIAS) return 'reciente';
  if (hasta) return '';
  /* A quien tiene un dia claro se le escribe SU dia, sea la jugada que sea (la
     Ocasion no: es de hoy o no es). Y Tu dia no sale con el reparto ya empezado. */
  if (cx.jDia && j && j !== 'ocasion' && p.diaCl && p.dia !== cx.hoyDw) return 'su-dia';
  if (j === 'dia') {
    var hrD = u.casa ? PJ_HORARIO_[p.dia] : '';
    if (hrD && cx.hora >= parseInt(hrD, 10)) return 'tarde';
  }
  var um = _pjUltMsg_(u, cx);
  if (um && _pjDiasEntre_(um.t, hoy0) < PJ.TOPE_DIAS) return 'tope';
  if (j && cx.ultJug) {
    var ts = (cx.ultJug[j + '|' + u.k] || []).filter(function (t) { return t >= p.ult; });
    if (ts.length) {
      var ultima = Math.max.apply(null, ts);
      if (j !== 'segunda' || ts.length >= PJ.SEGUNDA_INTENTOS || _pjDiasEntre_(ultima, hoy0) < PJ.REPETIR_DIAS) return 'repetida';
    }
  }
  if (j && !_pjNombre_(con, cx).ok) return 'nombre';
  return '';
}
/* La ultima campaña que recibio alguien de la casa: {t, nom} o null. */
function _pjUltMsg_(u, cx) {
  /* Con TOPE_JUGADA_MANDA el tope de una jugada mira SOLO jugadas: la campaña
     general ya no la frena (es la general la que se corre, ver
     `_campaniaControlSemana_`). */
  var o = null, M = (cx && (cx.jMan ? cx.ultMsgJ : cx.ultMsg)) || {};
  u.miembros.forEach(function (m) {
    [m.key, m.tel].forEach(function (k) { var x = k && M[k]; if (x && (!o || x.t > o.t)) o = x; });
  });
  return o;
}
function _pjLunes_(hoy0) { var d = new Date(hoy0); return _pjDia0_(hoy0 - ((d.getDay() + 6) % 7) * 86400000); }
function _pjEsControl_(k, hoy0) { return _pjHash_(k + '|' + _pjLunes_(hoy0)) % PJ.CONTROL_CADA === 0; }
/* Cuando se le reparte: el proximo dia que le corresponde (el suyo si se reparte
   ese dia, si no el viernes), con el horario de ese dia en Estancias. Es la
   variable `cuando` de los templates: "este viernes de 19 a 21", "hoy de 11 a 13".
   Fuera de Estancias no hay horario fijo: va el dia solo. Si el reparto de hoy ya
   esta encima (faltan menos de 3 horas), es el de la semana que viene. */
function _pjCuando_(u, p, hoyMs) {
  var hoy0 = _pjDia0_(hoyMs), hoyDw = new Date(hoy0).getDay(), hora = new Date(hoyMs).getHours();
  var dw = (u.casa && p.diaOk && PJ_HORARIO_[p.dia]) ? p.dia : 5;
  var hor = u.casa ? PJ_HORARIO_[dw] : '';
  var falta = (dw - hoyDw + 7) % 7;
  if (falta === 0 && (!hor || hora > parseInt(hor, 10) - 3)) falta = 7;
  var txt = falta === 0 ? 'hoy' : (falta === 1 ? 'mañana' : (falta === 7 ? 'el ' + PJ_DIAS_[dw] + ' que viene' : 'este ' + PJ_DIAS_[dw]));
  return { dia: PJ_DIAS_[dw], t: hoy0 + falta * 86400000, txt: txt + (hor ? ' de ' + hor : '') };
}
/* Las variables de los templates para una casa, con los nombres que declaran
   (name, producto, cuando, familia, descuento, ocasion). Las que no aplican a su
   jugada no van; una vacia frena el envio (Meta rechaza un parametro vacio). */
function _pjVars_(j, u, p, cx, con, hoyMs) {
  var v = { name: con ? _pjNombre_(con, cx).nombre : '', producto: _pjProductoHabitual_(p, cx), cuando: _pjCuando_(u, p, hoyMs).txt };
  if (j === 'nuevo') {
    var fn = _pjFamNueva_(p, cx);
    v.familia = _pjFamTxt_(fn);
    v.descuento = cx.cupon[fn].pct + '% off con el cupón ' + cx.cupon[fn].cod;
    v['1'] = cx.cupon[fn].cod;   // el boton: maleu.com.ar/?...&cupon={{1}}
  }
  if (j === 'dia') {
    var hd = u.casa ? PJ_HORARIO_[p.dia] : '';
    v.cuando = 'hoy' + (hd ? ' de ' + hd : '');
    v.dias = _pjDiaPlural_(p.dia);
  }
  if (j === 'escalera') {
    var tn = _pjProdTxt_(cx.nombres[_pjSiguiente_(p, cx)]);
    v.nuevo = tn.txt ? (tn.art ? tn.art + ' ' : '') + tn.txt : '';
  }
  if (j === 'volve' && cx.cuponVolve) { v.descuento = cx.cuponVolve.pct + '% off con el cupón ' + cx.cuponVolve.cod; v['1'] = cx.cuponVolve.cod; }
  if (j === 'ocasion' && cx.ocasion) {
    v.ocasion = cx.ocasion.motivo;
    v.cuando = 'hoy de ' + String(cx.ocasion.horario).replace(/\s*hs\.?\s*$/i, '');
  }
  return v;
}
/* Que version le toca (A o B) y si se puede mandar. `pref` es la que le toco en
   el reparto mitad y mitad de su jugada (ver `_pjCalcular_`); sin `pref`, un hash
   de la casa. Si esa version no esta aprobada, o pide una variable que esta casa
   no tiene, va la otra. nivel: 2 aprobado · 1 existe (en revision) · 0 no sirve. */
function _pjVersion_(def, k, v, tpls, pref) {
  if (pref !== 'a' && pref !== 'b') pref = (_pjHash_(k + '|ab|' + def.id) % 2) ? 'b' : 'a';
  var otra = pref === 'a' ? 'b' : 'a';
  var nivel = function (x) {
    var t = tpls && tpls[def.tpl[x]];
    if (!t) return 0;
    var ps = (t.params && t.params.length) ? t.params : (t.param ? [t.param] : []);
    for (var i = 0; i < ps.length; i++) if (!String(v[ps[i]] == null ? '' : v[ps[i]]).trim()) return 0;
    return String(t.estado || '').toUpperCase() === 'APPROVED' ? 2 : 1;
  };
  var np = nivel(pref), no = nivel(otra);
  return (no > np) ? { ver: otra, nivel: no } : { ver: pref, nivel: np };
}
function _pjProductoHabitual_(p, cx) {
  /* Con una sola compra se nombra lo que llevo; con mas, solo si lo repite. */
  if ((p.sp || p.n === 1) && p.g) { var t = _pjProdTxt_(cx.nombres[p.g]); if (t.txt) return (t.art ? t.art + ' ' : '') + t.txt; }
  return _pjFamTxt_(p.fam);
}
function _pjDiaPlural_(dw) { var d = PJ_DIAS_[dw] || ''; return /s$/.test(d) ? d : d + 's'; }
function _pjCada_(r) {
  if (r <= 9) return 'todas las semanas';
  if (r <= 17) return 'cada 2 semanas';
  if (r <= 24) return 'cada 3 semanas';
  if (r <= 38) return 'una vez por mes';
  if (r <= 52) return 'cada mes y medio';
  return 'cada ' + Math.round(r / 30) + ' meses';
}
/* La linea de la ficha. "Compra sorrentinos de jamón y queso cada 3 semanas,
   los viernes. Nunca probó tartas ni wraps. Le toca esta semana." */
function _pjFrase_(p, cx, abierto) {
  if (!p.n) return '';
  var que = _pjSinArt_(_pjProductoHabitual_(p, cx));
  var s;
  /* Con una compra no hay "siempre": se nombra lo que llevo. */
  var uno = p.n === 1 ? (_pjProdTxt_(cx.nombres[p.g]).txt || que) : '';
  if (p.n === 1) s = 'Compró una sola vez, hace ' + p.d + (p.d === 1 ? ' día' : ' días') + ': ' + uno + '.';
  else if (!p.rOk) s = 'Compró 2 veces, con ' + p.r + ' días entre una y otra: ' + que + '.';
  else s = 'Compra ' + que + ' ' + _pjCada_(p.r) + (p.diaOk ? ', los ' + _pjDiaPlural_(p.dia) : '') + '.';
  var nu = (p.nu || []).map(function (f) { return _pjSinArt_(_pjFamTxt_(f)); });
  if (p.n === 1) { /* una compra no dice que "solo compra" eso */ }
  else if (nu.length && nu.length <= 3) s += ' Nunca probó ' + _pjLista_(nu) + '.';
  else if (nu.length > 3) s += ' Solo compra ' + _pjLista_(p.prob.map(function (f) { return _pjSinArt_(_pjFamTxt_(f)); })).replace(' ni ', ' y ') + '.';
  if (abierto) s += ' Tiene un pedido en camino.';
  else if (p.d > CLI_DORMIDO_DIAS) s += ' Hace ' + p.d + ' días que no compra.';
  else if (p.rOk && p.toca !== null) {
    if (p.toca > 52) s += ' Le toca en ' + Math.round(p.toca / 30) + ' meses.';
    else if (p.toca > 10) s += ' Le toca en ' + Math.round(p.toca / 7) + ' semanas.';
    else if (p.toca > 3) s += ' Le toca la semana que viene.';
    else if (p.toca >= -3) s += ' Le toca esta semana.';
    else s += ' Se le pasó su ritmo hace ' + (-p.toca) + ' días.';
  }
  return s;
}

/* Lo que no es de ningun cliente: familias, precios, nombres, cupones. */
function _pjContexto_() {
  var cat = _catPorAbbr_(), fam = {}, fams = {};
  Object.keys(cat).forEach(function (ab) { var f = CROSS_CAT_NORM[cat[ab]] || cat[ab]; fam[ab] = f; fams[f] = 1; });
  /* `stock` = Stock Disponible (col H de Productos): la escalera no ofrece lo que
     hoy no hay. `catL` = el catalogo: lo que tiene nombre en Productos y familia
     en Proveedores. Es el M de "probo N de M". */
  var nombres = {}, stock = {}, catL = [];
  (_productosValores_() || []).slice(1).forEach(function (f) {
    var ab = String(f[2] || '').trim(), nm = String(f[1] || '').trim();
    if (ab && nm) { nombres[ab] = nm; stock[ab] = Number(f[7]) || 0; if (fam[ab]) catL.push(ab); }
  });
  var jDia = false, jEsc = false, jMan = false;
  try { jDia = _cfgSiNo_('JUGADA_DIA', false); jEsc = _cfgSiNo_('JUGADA_ESCALERA', false); jMan = _cfgSiNo_('TOPE_JUGADA_MANDA', false); } catch (e5) { jDia = false; jEsc = false; jMan = false; }
  var precio = {};
  try { precio = _getAbbrToPrecio(); } catch (e) { precio = {}; }
  /* Cupon por CATEGORIA vigente, uno por familia (el de mayor descuento). El
     scope es la categoria de Proveedores ("Pizzas Individuales", "Tortas"), que
     se junta en la familia igual que los productos. */
  var cupon = {};
  try {
    var sh = SS.getSheetByName('Cupones');
    if (sh && sh.getLastRow() > 1) {
      var d = sh.getDataRange().getValues(), ahora = Date.now();
      for (var r = 1; r < d.length; r++) {
        var sc = String(d[r][3] || '').trim();
        if (sc.indexOf('CATEGORIA:') !== 0 || String(d[r][1] || '').trim().toUpperCase() !== 'PCT') continue;
        if (/^(no|false|0)$/i.test(String(d[r][9] == null ? '' : d[r][9]).trim())) continue;
        var vence = d[r][4];
        if (vence instanceof Date && vence.getTime() < ahora) continue;
        var cod = String(d[r][0] || '').trim(), pct = Number(d[r][2]) || 0;
        var c0 = sc.slice(10).trim(), f0 = CROSS_CAT_NORM[c0] || c0;
        if (!cod || !pct) continue;
        if (!cupon[f0] || pct > cupon[f0].pct) cupon[f0] = { cod: cod, pct: pct };
      }
    }
  } catch (e2) { cupon = {}; }
  /* El cupon GENERAL de Volvé (lo usa la version B, `jug_volve_b`). Es un
     descuento a quien se esta yendo: lo decide Tadeo. Se carga el CODIGO en
     Config_Maleu (JUGADA_VOLVE_CUPON) y tiene que existir en Cupones, tipo PCT,
     scope TODO y vigente. Sin eso, Volvé sale entera con la version A. */
  var cuponVolve = null;
  try {
    var cv = String(_cfgTexto_('JUGADA_VOLVE_CUPON', '') || '').trim().toUpperCase();
    var shc = cv ? SS.getSheetByName('Cupones') : null;
    if (shc && shc.getLastRow() > 1) {
      var dc = shc.getDataRange().getValues(), ah = Date.now();
      for (var rc = 1; rc < dc.length; rc++) {
        if (String(dc[rc][0] || '').trim().toUpperCase() !== cv) continue;
        if (String(dc[rc][1] || '').trim().toUpperCase() !== 'PCT' || String(dc[rc][3] || '').trim().toUpperCase() !== 'TODO') break;
        if (/^(no|false|0)$/i.test(String(dc[rc][9] == null ? '' : dc[rc][9]).trim())) break;
        if (dc[rc][4] instanceof Date && dc[rc][4].getTime() < ah) break;
        if (Number(dc[rc][2]) > 0) cuponVolve = { cod: cv, pct: Number(dc[rc][2]) };
        break;
      }
    }
  } catch (e4) { cuponVolve = null; }
  /* El dia especial: "12/10/2026 | 12 a 13 hs | el feriado de hoy". Lo carga una
     persona en Config_Maleu; un feriado no tiene reparto si nadie lo decide. */
  var ocasion = null;
  try {
    var raw = String(_cfgTexto_('JUGADA_OCASION', '') || '').split('|').map(function (x) { return x.trim(); });
    var mm = (raw[0] || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mm && raw[1]) {
      var h0 = Number((raw[1].match(/\d{1,2}/) || [])[0]);
      ocasion = { t: new Date(+mm[3], +mm[2] - 1, +mm[1]).getTime(), horario: raw[1],
                  motivo: raw[2] || 'hoy', franja: (h0 >= 0 && h0 < 15) ? 'm' : 't' };
    }
  } catch (e3) { ocasion = null; }
  return { fam: fam, fams: Object.keys(fams), nombres: nombres, precio: precio, cupon: cupon, cuponVolve: cuponVolve, ocasionCfg: ocasion,
           cat: catL, stock: stock, jDia: jDia, jEsc: jEsc, jMan: jMan };
}

/* Las mismas reglas, semana por semana sobre el historial. Una casa "cae" el
   primer lunes en que entra a la jugada (no se la cuenta de nuevo mientras siga
   adentro). `compraron` = compro en los 14 dias siguientes SIN que esta jugada
   existiera: es el piso contra el que hay que ganar. Ocasion no entra: depende
   de un dia que alguien declara. */
function _pjHistoria_(unidades, cx, hoy0) {
  var out = {}, ids = ['segunda', 'volve', 'repo', 'nuevo'];
  ids.forEach(function (id) { out[id] = { n: 0, compraron: 0, plata: 0, casas: 0 }; });
  var p0 = PJ.HISTORIA_DESDE.split('-');
  var desde = _pjLunes_(new Date(+p0[0], +p0[1] - 1, +p0[2]).getTime());
  var fin = hoy0 - PJ.VENTANA * 86400000;
  var cxh = { fam: cx.fam, fams: cx.fams, nombres: cx.nombres, precio: cx.precio, cupon: cx.cupon, popular: cx.popular, ocasion: null };
  unidades.forEach(function (u) {
    var V = _pjVentas_(u.pedidos, 0);
    if (!V.length) return;
    var antes = {}, vistas = {};
    for (var D = desde; D <= fin; D += 7 * 86400000) {
      D = _pjDia0_(D + 3600000);                      // por si un dia de 23 h corre la medianoche
      if (V[0].t >= D) { antes = {}; continue; }
      var p = _pjPerfil_(u, D, cxh, D);
      var reglas = _pjFreno_(u, p, D, cxh, D) ? [] : _pjReglas_(p, cxh);
      var ahora = {};
      reglas.forEach(function (id) {
        ahora[id] = 1;
        if (antes[id]) return;
        var o = out[id]; o.n++;
        if (!vistas[id]) { vistas[id] = 1; o.casas++; }
        var compro = 0, pl = 0;
        for (var i = 0; i < V.length; i++) {
          if (V[i].t >= D && V[i].t < D + PJ.VENTANA * 86400000) { compro = 1; pl += V[i].total; }
        }
        o.compraron += compro; o.plata += pl;
      });
      antes = ahora;
    }
  });
  return out;
}

/* Lo que dice la bitacora de campañas (`Interacciones CRM`):
   · `res`     que trajo cada jugada: los que recibieron contra el control de esa
               tanda, casa por casa, en los 14 dias siguientes; y A contra B.
   · `ultMsg`  la ultima campaña de cada telefono/cliente, con su nombre (el tope
               y cuanto cuesta cada campaña general).
   · `ultJug`  cuando recibio cada casa cada jugada (para no repetirla).
   · `ctlYa`   controles ya anotados esta semana (no se anotan dos veces).
   Y el BOTON: los pedidos que entraron por el link del template
   (`?o=wati-<jugada>-<a|b>`, columna Campaña del pedido). */
function _pjResultados_(unidades, hoy0) {
  var porKey = {};
  unidades.forEach(function (u) { u.miembros.forEach(function (m) { porKey[m.key] = u; if (m.tel) porKey[m.tel] = u; }); });
  var porKeyDe = function (u) { return (u.miembros[0] || {}).key || ''; };
  var res = {}, ultMsg = {}, ultMsgJ = {}, ultJug = {}, ctlYa = {}, porTag = {};
  PJ_JUGADAS_.forEach(function (j) { porTag[j.tag] = j.id; });
  var nuevo = function () {
    var z = function () { return { env: 0, resp: 0, compro: 0, plata: 0, boton: 0, botonPlata: 0 }; };
    /* `mirados`: a cuantos de los enviados ya se les miro el chat. Sin mirar no
       se sabe si respondieron: "0 respondieron" sobre 0 mirados no es un cero. */
    return { env: 0, mirados: 0, resp: 0, envCompro: 0, envPlata: 0, ctl: 0, ctlCompro: 0, ctlPlata: 0, enCurso: 0, boton: 0, botonPlata: 0, a: z(), b: z() };
  };
  var RESP = _pjRespLeer_(), respuestas = [], nombreJug = {};
  PJ_JUGADAS_.forEach(function (j) { nombreJug[j.id] = j.nombre; });
  var sh = SS.getSheetByName('Interacciones CRM');
  /* Hasta la col K (Entrega, 14/10/2026) si existe. */
  var _anchoI = sh ? Math.max(9, Math.min(CAMP_ENT_COL_, sh.getLastColumn())) : 9;
  var d = (sh && sh.getLastRow() > 1) ? sh.getRange(2, 1, sh.getLastRow() - 1, _anchoI).getValues() : [];
  var vistos = {}, envios = {};
  for (var r = 0; r < d.length; r++) {
    var org = String(d[r][8] || '').trim();
    if (org !== 'campaña' && org !== 'control') continue;
    var f = d[r][1], t = 0;
    if (f instanceof Date) t = f.getTime();
    else { var m = String(f || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) t = new Date(+m[3], +m[2] - 1, +m[1]).getTime(); }
    if (!t) continue;
    t = _pjDia0_(t);
    var key = String(d[r][2] || '').trim(), tel = _crmNormTel(d[r][3]);
    var camp = String(d[r][7] || '').replace(/^Campaña:\s*/, '').trim();
    var entrega = String(d[r][CAMP_ENT_COL_ - 1] || '').trim();
    /* Los envios de hoy, con su entrega (CRM › Hoy, «7 enviados · 7 llegaron»). */
    if (org === 'campaña' && t === hoy0) {
      var lt = String(d[r][0] || '').replace(/^[A-Z]/, '').split('-')[0] || camp;
      var ev = envios[lt] || (envios[lt] = { lote: lt, camp: camp, hora: (String(d[r][1] || '').match(/(\d{1,2}:\d{2})/) || [])[1] || '', n: 0, llegaron: 0, leidos: 0, fallaron: 0, sinDato: 0, sinMirar: 0, motivo: '' });
      ev.n++;
      if (entrega === 'leído') { ev.llegaron++; ev.leidos++; }
      else if (entrega === 'entregado') ev.llegaron++;
      else if (entrega === 'falló') ev.fallaron++;
      else if (entrega === 'sin dato') ev.sinDato++;
      else ev.sinMirar++;
    }
    /* LO QUE NO LLEGO NO CUENTA (14/10/2026). WATI acepta el envio y el mensaje
       puede fallar despues (sin creditos, numero dado de baja). Un mensaje que
       fallo no frena la casa por el tope, no cuenta como «ya recibio esta
       jugada» y no es un «Mensaje» en lo que trajo cada jugada. */
    if (org === 'campaña' && entrega === 'falló') continue;
    if (org === 'campaña') {
      if (key && (!ultMsg[key] || t > ultMsg[key].t)) ultMsg[key] = { t: t, nom: camp };
      if (tel && (!ultMsg[tel] || t > ultMsg[tel].t)) ultMsg[tel] = { t: t, nom: camp };
    }
    var mj = camp.match(PJ_TPL_RE_);
    if (!mj || !porTag[mj[1]]) continue;
    if (org === 'campaña') {
      if (key && (!ultMsgJ[key] || t > ultMsgJ[key].t)) ultMsgJ[key] = { t: t, nom: camp };
      if (tel && (!ultMsgJ[tel] || t > ultMsgJ[tel].t)) ultMsgJ[tel] = { t: t, nom: camp };
    }
    var id = porTag[mj[1]], ver = mj[2];
    var u = porKey[key] || porKey[tel];
    if (!u) continue;
    var lote = String(d[r][0] || '').replace(/^[A-Z]/, '').split('-')[0];
    var dk = id + '|' + lote + '|' + u.k;
    if (vistos[dk]) continue;
    vistos[dk] = 1;
    var o = res[id] || (res[id] = nuevo());
    var V = _pjVentas_(u.pedidos, 0), compro = 0, pl = 0;
    for (var i = 0; i < V.length; i++) if (V[i].t > t && V[i].t <= t + PJ.VENTANA * 86400000) { compro = 1; pl += V[i].total; }
    if (org === 'campaña') {
      (ultJug[id + '|' + u.k] || (ultJug[id + '|' + u.k] = [])).push(t);
      o.env++; o.envCompro += compro; o.envPlata += pl;
      o[ver].env++; o[ver].compro += compro; o[ver].plata += pl;
      if (hoy0 - t < PJ.VENTANA * 86400000) o.enCurso++;
      var rp = RESP[String(d[r][0] || '').trim()];
      if (rp) {
        o.mirados++;
        if (rp.resp) {
          o.resp++; o[ver].resp++;
          /* Arriba de "Hoy" van las de los ultimos 3 dias: es a quien hay que contestarle. */
          if (Date.now() - rp.resp < 3 * 86400000 && !rp.atendio) {
            respuestas.push({ id: String(d[r][0]), k: u.k, key: key || (porKeyDe(u)), nom: String(d[r][4] || '').trim(), jugada: id, jugadaNom: nombreJug[id], ver: ver,
                              cuando: rp.resp, txt: rp.txt, compro: compro });
          }
        }
      }
    } else {
      o.ctl++; o.ctlCompro += compro; o.ctlPlata += pl;
      ctlYa[id + '|' + u.k + '|' + _pjLunes_(t)] = 1;
    }
  }
  unidades.forEach(function (un) {
    for (var q = 0; q < un.pedidos.length; q++) {
      var mc = String(un.pedidos[q].cam || '').match(/^wati-([a-z]+)-([ab])$/);
      if (!mc || !porTag[mc[1]]) continue;
      var ob = res[porTag[mc[1]]] || (res[porTag[mc[1]]] = nuevo());
      var pla = Number(un.pedidos[q].ventaTotal) || Number(un.pedidos[q].total) || 0;
      ob.boton++; ob.botonPlata += pla; ob[mc[2]].boton++; ob[mc[2]].botonPlata += pla;
    }
  });
  respuestas.sort(function (a, b) { return b.cuando - a.cuando; });
  var _env = Object.keys(envios).map(function (k) { return envios[k]; }).sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });
  return { res: res, ultMsg: ultMsg, ultMsgJ: ultMsgJ, ultJug: ultJug, ctlYa: ctlYa, respuestas: respuestas, envios: _env };
}

/* TODO junto, parado en `hoyMs`.
   opts.sinHistoria  no corre el historial.
   opts.ocasion      fuerza un dia especial (para medir).
   opts.tpls         los templates de WATI ya leidos ({nombre: {estado, params, cuerpo}});
                     sin ellos se calcula igual y nada queda "listo para mandar".
   opts.versiones    {casa: 'a'|'b'}: la version que la pantalla le mostro a cada una. */
function _pjCalcular_(hoyMs, opts) {
  opts = opts || {};
  var hoy0 = _pjDia0_(hoyMs);
  var index = _crmBuildClientesIndex();
  var meta = _crmGetClientesMeta();
  var cx = _pjContexto_();
  var unidades = _pjUnidades_(index, meta);
  var tpls = opts.tpls || null;
  cx.ocasion = opts.ocasion || ((cx.ocasionCfg && cx.ocasionCfg.t === hoy0) ? cx.ocasionCfg : null);
  cx.popular = {}; cx.nomFreq = {};
  if (opts.jDia !== undefined) cx.jDia = !!opts.jDia;       // para medir y probar
  if (opts.jEsc !== undefined) cx.jEsc = !!opts.jEsc;
  if (opts.jMan !== undefined) cx.jMan = !!opts.jMan;
  cx.hoyDw = new Date(hoy0).getDay(); cx.hora = new Date(hoyMs).getHours();
  /* co[a][b] = casas que probaron a Y b; popProd[b] = casas que probaron b. */
  cx.co = {}; cx.popProd = {};
  var perfiles = unidades.map(function (u) {
    var p = _pjPerfil_(u, hoy0, cx, 0);
    (p.prob || []).forEach(function (f) { cx.popular[f] = (cx.popular[f] || 0) + 1; });
    (p.pr || []).forEach(function (a) {
      cx.popProd[a] = (cx.popProd[a] || 0) + 1;
      var fa = cx.co[a] || (cx.co[a] = {});
      p.pr.forEach(function (b) { if (b !== a) fa[b] = (fa[b] || 0) + 1; });
    });
    u.miembros.forEach(function (m) {
      var b = _pjSinTilde_(String(m.nombre || '').trim().split(/\s+/)[0] || '');
      if (b) cx.nomFreq[b] = (cx.nomFreq[b] || 0) + 1;
    });
    return p;
  });
  var rr = _pjResultados_(unidades, hoy0);
  cx.ultMsg = rr.ultMsg; cx.ultMsgJ = rr.ultMsgJ; cx.ultJug = rr.ultJug;
  cx.noEsc = _pjNoEscribirLeer_();
  var historia = opts.sinHistoria ? null : _pjHistoria_(unidades, cx, hoy0);
  var orden = PJ_JUGADAS_.map(function (j) { return j.id; });
  var frenos = {}, casas = [], J = {}, defs = {}, topes = {};
  PJ_JUGADAS_.forEach(function (j) {
    defs[j.id] = j;
    J[j.id] = { id: j.id, tag: j.tag, nombre: j.nombre, tpl: j.tpl, caen: 0, n: 0, listas: 0, a: 0, b: 0, control: 0, frenadas: 0, plata: 0, ej: null };
  });
  unidades.forEach(function (u, ix) {
    var p = perfiles[ix];
    if (!p.n) return;
    var abierto = _pjAbierto_(u, hoy0, 0);
    var reglas = _pjReglas_(p, cx);
    var con = _pjContacto_(u);
    var j = '';
    for (var i = 0; i < orden.length && !j; i++) if (reglas.indexOf(orden[i]) >= 0) j = orden[i];
    var freno = _pjFreno_(u, p, hoy0, cx, 0, j);
    /* Una visita que habria caido en Segunda compra o Volve (y en ninguna otra):
       figura frenada en esa jugada, con el motivo a la vista. */
    if (!j && reglas.visita && reglas.visita.length) { j = reglas.visita[0]; freno = 'visita'; J[j].caen++; }
    var cs = _pjEsControl_(u.k, hoy0);
    var ctl = !!j && !freno && cs;
    var nom = con ? _pjNombre_(con, cx) : { ok: false, nombre: '', crudo: '', por: '' };
    var v = null, vs = null, exPor = '';
    if (j) {
      v = _pjVars_(j, u, p, cx, con, hoyMs);
      vs = _pjVersion_(defs[j], u.k, v, tpls);
      if (freno === 'tope') {
        var um = _pjUltMsg_(u, cx);
        exPor = um.nom + ' (' + _fmtDmyAR_(new Date(um.t)).slice(0, 5) + ')';
        topes[exPor] = (topes[exPor] || 0) + 1;
      }
    }
    reglas.forEach(function (id) { J[id].caen++; });
    if (j) {
      if (freno) { J[j].frenadas++; frenos[freno] = (frenos[freno] || 0) + 1; }
      else if (ctl) J[j].control++;
      else J[j].n++;
    }
    var m0 = con || u.miembros.slice().sort(function (a, b) { return b.ent - a.ent; })[0];
    casas.push({
      k: u.k, casa: u.casa ? 1 : 0, nom: m0.nombre, tel: con ? con.tel : '', key: m0.key,
      keys: u.miembros.map(function (m) { return m.key; }),
      bar: u.barrio, sub: u.sub, lote: u.lote,
      fr: _pjFrase_(p, cx, abierto), j: j, js: reglas, ex: j ? freno : '', exPor: exPor, ctl: ctl ? 1 : 0, cs: cs ? 1 : 0,
      /* ne: no hay que escribirle (aunque hoy no caiga en ninguna jugada): {motivo, por, fecha}. */
      ne: (function () { var e = _pjNoEscribirDe_(u, cx.noEsc); return e ? { motivo: e.motivo, por: e.por, fecha: e.fecha } : null; })(),
      /* nm: el nombre no sirve para un mensaje (aunque este frenada por otra cosa). */
      nm: (j && con && !nom.ok) ? 1 : 0, nmPor: (j && con && !nom.ok) ? nom.por : '', crudo: nom.crudo || '',
      v: v, ver: vs ? vs.ver : '', listo: vs ? vs.nivel : 0,
      sale: j ? _pjCuando_(u, p, hoyMs).t : 0,
      p: { n: p.n, fam: p.fam, famPct: p.famPct, g: p.g, gPct: p.gPct, sp: p.sp ? 1 : 0, r: p.r, rOk: p.rOk ? 1 : 0, d: p.d,
           toca: p.toca, dia: p.dia, diaOk: p.diaOk ? 1 : 0, fj: p.fj, fjOk: p.fjOk ? 1 : 0, tk: p.tk, nu: p.nu, prob: p.prob,
           cup: p.cup, cupBase: p.cupBase, est: p.est, can: p.can, pideDia: p.pideDia, pideHora: p.pideHora, ab: abierto ? 1 : 0,
           /* La escalera: probo `pn` de `pm` productos; `sig` = el proximo que se
              le propondria (abreviatura; '' si ya los probo todos o no hay stock). */
           diaCl: p.diaCl ? 1 : 0, pn: _pjProbados_(p, cx).n, pm: cx.cat.length, sig: _pjSiguiente_(p, cx) }
    });
  });
  /* A Y B, MITAD Y MITAD DENTRO DE CADA JUGADA. Con un hash por casa, 4 casas
     podian salir las 4 con la B (paso el 12/10/2026 con Proba algo nuevo). Se
     ordenan las que reciben por un hash (un orden fijo y sin intencion) y se
     alternan; con numero impar, quien se lleva la de mas cambia con la semana.
     La pantalla manda de vuelta la version que mostro (`versiones` en
     crmEnviarJugada): si entre que se abrio y se mando se cayo una casa, a las
     demas no les cambia el mensaje que se reviso. */
  PJ_JUGADAS_.forEach(function (jd) {
    var L = casas.filter(function (c) { return c.j === jd.id && !c.ex && !c.ctl; });
    L.sort(function (a, b) { return _pjHash_(a.k + '|ab|' + jd.id) - _pjHash_(b.k + '|ab|' + jd.id) || (a.k < b.k ? -1 : 1); });
    var arranca = _pjHash_(jd.id + '|' + _pjLunes_(hoy0)) % 2;
    L.forEach(function (c, i) {
      var quiero = (opts.versiones && opts.versiones[c.k]) || (((i + arranca) % 2) ? 'b' : 'a');
      var vs = _pjVersion_(jd, c.k, c.v, tpls, quiero);
      c.ver = vs.ver; c.listo = vs.nivel;
      J[jd.id][vs.ver]++; if (vs.nivel === 2) J[jd.id].listas++;
    });
  });
  /* La plata esperada: el ticket habitual de cada casa por la proporcion que
     compro en 14 dias cuando cayo en esa jugada en el historial. NO es lo que
     trae el mensaje: es lo que hay en juego. Lo que trae se mide contra el control. */
  var base = {};
  PJ_JUGADAS_.forEach(function (j) {
    var h = historia && historia[j.id];
    base[j.id] = (h && h.n >= 20) ? h.compraron / h.n : null;
  });
  casas.forEach(function (c) {
    if (!c.j || c.ex || c.ctl) return;
    var jj = J[c.j];
    if (base[c.j] !== null) jj.plata += Math.round(c.p.tk * base[c.j]);
    if (!jj.ej && c.casa && c.p.sp) jj.ej = c.k;
  });
  casas.forEach(function (c) { if (c.j && !c.ex && !c.ctl && !J[c.j].ej) J[c.j].ej = c.k; });
  /* Cuanto cuesta el tope: las casas que hoy tenian una jugada y no la reciben
     porque les llego otra campaña en los ultimos 7 dias, por campaña. */
  var tope = Object.keys(topes).map(function (k) { return { camp: k, n: topes[k] }; }).sort(function (a, b) { return b.n - a.n; });
  return {
    hoy0: hoy0, cx: cx, casas: casas, frenos: frenos, historia: historia, base: base, resultados: rr.res, ctlYa: rr.ctlYa,
    respuestas: rr.respuestas, envios: rr.envios || [],
    tope: tope, tpls: tpls,
    jugadas: PJ_JUGADAS_.filter(function (j) { return !j.pal || cx[j.pal]; }).map(function (j) { return J[j.id]; })
  };
}
/* Los diez templates de las jugadas, como estan HOY en WATI ({nombre: {estado,
   cuerpo, pie, params}}), o null si no se pudieron leer. */
function _pjTemplates_() {
  var todos = _watiTemplates_(false);
  if (!todos) return null;
  var out = {};
  PJ_JUGADAS_.forEach(function (j) {
    ['a', 'b'].forEach(function (x) {
      var t = todos[j.tpl[x]];
      if (!t) return;
      var params = (t.params && t.params.length) ? t.params : (t.param ? [t.param] : []);
      out[j.tpl[x]] = { estado: t.estado, cuerpo: _pjCuerpoConNombres_(t.cuerpo, params), pie: t.pie, params: params };
    });
  });
  return out;
}
/* WATI devuelve el cuerpo con las variables NUMERADAS (`{{1}}`, `{{2}}`) y, en el
   mismo orden, la lista de sus nombres. La pantalla completa el mensaje por
   NOMBRE (`{{name}}`), igual que como se manda. Sin esta traduccion no
   completaba nada y decia "a esta casa le falta un dato" de todas las casas
   (12/10/2026: paso en produccion; la prueba usaba un WATI de mentira que ya
   venia con nombres). Un numero sin nombre queda como esta: ese si es un hueco. */
function _pjCuerpoConNombres_(cuerpo, params) {
  /* Una variable con nombre de NUMERO es la del boton (`"1"`, el cupon del link,
     15/10/2026), no del cuerpo: y WATI la puede listar primera
     (`jug_nuevo_cup_a` viene ["1","name",...]). Contandola, el {{1}} del cuerpo
     decia el codigo del cupon donde va el nombre. */
  params = (params || []).filter(function (p) { return !/^\d+$/.test(String(p)); });
  return String(cuerpo || '').replace(/\{\{\s*(\d+)\s*\}\}/g, function (m, n) {
    var nom = params[Number(n) - 1];
    return nom ? '{{' + nom + '}}' : m;
  });
}

/* GET crmJugadasTpls (164): SOLO los templates de las jugadas, como estan hoy en WATI. Cuando
   CRM > Hoy sale de la base, el motor corre en el navegador y la base no habla con WATI. */
function _doGetCrmJugadasTpls_() {
  var tpls = null;
  try { tpls = _pjTemplates_(); } catch (eT) { tpls = null; }
  return ContentService.createTextOutput(JSON.stringify({ ok: !!tpls, ts: Date.now(), tpls: tpls, error: tpls ? '' : 'no pude leer los templates de WATI' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* GET crmJugadas: lo que pinta CRM > Hoy y la linea de perfil de la ficha. */
function _doGetCrmJugadas(e) {
  _PROD_MEMO_ = true; _PROD_VALS_ = null;
  try {
    var tpls = null;
    try { tpls = _pjTemplates_(); } catch (eT) { tpls = null; }
    var r = _pjCalcular_(Date.now(), { tpls: tpls });
    return ContentService.createTextOutput(JSON.stringify({
      ok: true, ts: Date.now(), hoy: _fmtDmyAR_(new Date(r.hoy0)),
      palanca: _cfgSiNo_('CRM_JUGADAS', false),
      ocasion: r.cx.ocasion ? { horario: r.cx.ocasion.horario, motivo: r.cx.ocasion.motivo } : null,
      reglas: { tope: PJ.TOPE_DIAS, sinCompra: PJ.SIN_COMPRA_DIAS, control: PJ.CONTROL_CADA, ventana: PJ.VENTANA,
                segundaDesde: PJ.SEGUNDA_DESDE, segundaHasta: PJ.SEGUNDA_HASTA, volveDesde: PJ.VOLVE_DESDE, repetir: PJ.REPETIR_DIAS,
                diaPct: Math.round(PJ.DIAHAB_PCT * 100), diaMin: PJ.DIAHAB_MIN, jDia: !!r.cx.jDia, jEsc: !!r.cx.jEsc, jMan: !!r.cx.jMan },
      /* tpls null = no se pudo leer WATI: la pantalla no muestra ningun texto. */
      tpls: tpls, cuponVolve: r.cx.cuponVolve,
      /* Quien contesto un mensaje de jugada en los ultimos 3 dias (lo primero que
         hay que ver al abrir). Sale de la hoja Respuestas Jugadas, que llena
         `crmJugadasRespuestas` leyendo el chat de WATI. */
      respuestas: r.respuestas, respHoras: PJ_RESP_HORAS,
      /* Las jugadas programadas: las que esperan su hora y las que salieron en las
         ultimas 24 h (con lo que paso). Ver JUGADAS PROGRAMADAS. */
      programadas: _pjProgLista_(),
      jugadas: r.jugadas, casas: r.casas, frenos: r.frenos, tope: r.tope, historia: r.historia, base: r.base,
      resultados: r.resultados, cupones: r.cx.cupon, nombres: r.cx.nombres, envios: r.envios || []
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err && err.message || err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally { _PROD_MEMO_ = false; _PROD_VALS_ = null; }
}

var PJ_PROG_HOJA = 'Jugadas Programadas';

var PJ_PROG_COLS_ = ['ID', 'Jugada', 'Sale', 'Sale ms', 'Casas', 'Versiones', 'Sacadas', 'Prueba tel', 'Versión prueba',
                     'Programó', 'Usuario', 'Programada el', 'Estado', 'Resultado', 'Salió el', 'Canceló', 'Cancelada el'];

var PJ_PROG_TZ_ = 'America/Argentina/Buenos_Aires';

function _pjProgLeer_() {
  var sh = SS.getSheetByName(PJ_PROG_HOJA);
  if (!sh || sh.getLastRow() < 2) return [];
  var d = sh.getRange(2, 1, sh.getLastRow() - 1, PJ_PROG_COLS_.length).getValues();
  var js = function (x, def) { try { return JSON.parse(String(x || '')) || def; } catch (e) { return def; } };
  var out = [];
  for (var i = 0; i < d.length; i++) {
    var id = String(d[i][0] || '').trim();
    if (!id) continue;
    out.push({ fila: i + 2, id: id, jugada: String(d[i][1] || ''), saleTxt: String(d[i][2] || ''), sale: Number(d[i][3]) || 0,
      casas: js(d[i][4], []), versiones: js(d[i][5], {}), sacadas: js(d[i][6], []), tel: String(d[i][7] || '').trim(),
      ver: String(d[i][8] || '').trim(), por: String(d[i][9] || ''), usuario: String(d[i][10] || ''), el: String(d[i][11] || ''),
      estado: String(d[i][12] || '').trim(), res: String(d[i][13] || ''), salio: String(d[i][14] || ''), cancelo: String(d[i][15] || '') });
  }
  return out;
}

function _pjProgLista_() {
  try {
    var desde = Date.now() - 24 * 3600000;
    return _pjProgLeer_().filter(function (x) {
      return x.estado === 'programada' || x.estado === 'mandando' || x.sale >= desde;
    }).map(function (x) {
      return { id: x.id, jugada: x.jugada, sale: x.sale, saleTxt: x.saleTxt, n: x.casas.length, prueba: !!x.tel,
               por: x.por, el: x.el, estado: x.estado, res: x.res, salio: x.salio, cancelo: x.cancelo };
    });
  } catch (e) { return []; }
}

var PJ_RESP_HORAS = 48;

var PJ_RESP_TOPE = 40;        // chats por corrida: cada uno es un viaje a WATI

var PJ_RESP_REMIRA_MIN = 120; // un chat ya mirado no se vuelve a mirar antes (19/10/2026, cupo de WATI)

var PJ_RESP_COLS_ = ['ID', 'Tel', 'Enviado', 'Respondió', 'Texto', 'Revisado', 'Cerrado'];

var PJ_RESP_ATENDIDO_ = ['Atendido por', 'Atendido el'];

function _pjFechaHora_(v) {
  if (v instanceof Date) return v.getTime();
  var m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime() : 0;
}

function _pjRespLeer_() {
  var out = {};
  try {
    var sh = SS.getSheetByName('Respuestas Jugadas');
    if (!sh || sh.getLastRow() < 2) return out;
    var d = sh.getRange(2, 1, sh.getLastRow() - 1, PJ_RESP_COLS_.length + PJ_RESP_ATENDIDO_.length).getValues();
    for (var i = 0; i < d.length; i++) {
      var id = String(d[i][0] || '').trim();
      if (!id) continue;
      out[id] = { resp: _pjFechaHora_(d[i][3]), txt: String(d[i][4] || ''), mirado: _pjFechaHora_(d[i][5]), cerrado: /^s[ií]$/i.test(String(d[i][6] || '').trim()), fila: i + 2,
                  atendio: String(d[i][7] || '').trim(), atendidoEl: String(d[i][8] || '').trim() };
    }
  } catch (e) {}
  return out;
}

var PJ_NE_COLS_ = ['Clave', 'Cliente Key', 'Tel', 'Nombre', 'Motivo', 'Marcó', 'Fecha', 'Habilitó', 'Habilitado el'];

function _pjNoEscribirLeer_() {
  var out = {};
  try {
    var sh = SS.getSheetByName('No Escribir');
    if (!sh || sh.getLastRow() < 2) return out;
    var d = sh.getRange(2, 1, sh.getLastRow() - 1, PJ_NE_COLS_.length).getValues();
    for (var i = 0; i < d.length; i++) {
      if (String(d[i][8] || '').trim()) continue;                      // ya la habilitaron
      var e = { motivo: String(d[i][4] || '').trim(), por: String(d[i][5] || '').trim(), fecha: String(d[i][6] || '').trim(), fila: i + 2 };
      var tel = _crmNormTel(d[i][2]);
      [String(d[i][0] || '').trim(), String(d[i][1] || '').trim(), tel].forEach(function (k) { if (k) out[k] = e; });
    }
  } catch (e0) {}
  return out;
}

function _pjNoEscribirDe_(u, NE) {
  if (!NE) return null;
  if (NE[u.k]) return NE[u.k];
  for (var i = 0; i < u.miembros.length; i++) {
    var m = u.miembros[i];
    if (NE[m.key]) return NE[m.key];
    if (m.tel && NE[m.tel]) return NE[m.tel];
  }
  return null;
}

var CAMP_ENT_COL_ = 11;

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

var CROSS_CAT_NORM = {
  'Pack Pizzas x2': 'Pizzas',
  'Pizzas Individuales': 'Pizzas',
  'Franuis': 'Postres',
  'Tortas': 'Postres'
};

function _getAbbrToPrecio() {
  const data = _productosValores_();
  if (!data) return {};
  const map = {};
  for (let r = 1; r < data.length; r++) {
    const abbr = String(data[r][2]).trim(); // col C = Abreviatura
    const precio = _numCelda_(data[r][8]); // col I = Precio
    if (abbr) map[abbr] = precio;
  }
  return map;
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

function _crmTopValue(map) {
  var top = '', max = 0;
  Object.keys(map || {}).forEach(function(k) {
    if (map[k] > max) { max = map[k]; top = k; }
  });
  return top;
}

function _crmNormNombre(nombre) {
  if (!nombre) return '';
  var s = String(nombre).toLowerCase();
  if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return s.replace(/\s+/g, ' ').trim();
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

var CLI_ACTIVO_DIAS = 30, CLI_DORMIDO_DIAS = 60, CLI_INACTIVO_DIAS = 120;

function _cliEstadoDias_(d) {
  if (!(d >= 0)) return '';
  if (d <= CLI_ACTIVO_DIAS) return 'Activo';
  if (d <= CLI_DORMIDO_DIAS) return 'Enfriándose';
  if (d <= CLI_INACTIVO_DIAS) return 'Dormido';
  return 'Inactivo';
}

function _fmtDmyAR_(d) { return _fmtAR_(d, 'dd/MM/yyyy'); }
/* Los tres formatos que usan el CRM y planMes (8/10/2026: planMes hacia 118
   `formatDate` por armado de los 4 meses de Lectura). Mismo candado de zona. */
function _fmtAR_(d, fmt) {
  if (_FMT_AR_OK_ === null) {
    /* Dos horas, una a cada lado de la medianoche: con una sola, una zona al
       este (UTC) da el mismo dia a las 23:30 y una al oeste a las 00:30. */
    _FMT_AR_OK_ = [new Date(2026, 0, 5, 0, 30), new Date(2026, 0, 5, 23, 30)].every(function (x) {
      return _fmtDmyLocal_(x) === Utilities.formatDate(x, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
    }) && [new Date(1899, 11, 30, 19, 5), new Date(2026, 0, 5, 23, 30)].every(function (x) {
      /* Las celdas que son solo HORA llegan como fechas de 1899, cuando Argentina
         tenia otra hora oficial (LMT, -4:16:48). Si JS y el servicio no la
         resuelven igual, se usa el servicio para todo (8/10/2026, ventas). */
      return _dos_(x.getHours()) + ':' + _dos_(x.getMinutes()) === Utilities.formatDate(x, 'America/Argentina/Buenos_Aires', 'HH:mm');
    });
  }
  if (_CRM_VIEJO_ || !_FMT_AR_OK_ || isNaN(d.getTime()) ||
      (fmt !== 'dd/MM/yyyy' && fmt !== 'dd/MM/yyyy HH:mm' && fmt !== 'yyyy-MM-dd' && fmt !== 'HH:mm' &&
       fmt !== 'yyyy-MM-dd HH:mm' && fmt !== 'yyyy-MM')) {
    return Utilities.formatDate(d, 'America/Argentina/Buenos_Aires', fmt);
  }
  if (fmt === 'yyyy-MM') return d.getFullYear() + '-' + _dos_(d.getMonth() + 1);
  if (fmt === 'yyyy-MM-dd' || fmt === 'yyyy-MM-dd HH:mm') {
    var iso = d.getFullYear() + '-' + _dos_(d.getMonth() + 1) + '-' + _dos_(d.getDate());
    return fmt === 'yyyy-MM-dd' ? iso : iso + ' ' + _dos_(d.getHours()) + ':' + _dos_(d.getMinutes());
  }
  if (fmt === 'HH:mm') return _dos_(d.getHours()) + ':' + _dos_(d.getMinutes());
  var t = _fmtDmyLocal_(d);
  return fmt === 'dd/MM/yyyy HH:mm' ? t + ' ' + _dos_(d.getHours()) + ':' + _dos_(d.getMinutes()) : t;
}

function _fmtAR_(d, fmt) {
  if (_FMT_AR_OK_ === null) {
    /* Dos horas, una a cada lado de la medianoche: con una sola, una zona al
       este (UTC) da el mismo dia a las 23:30 y una al oeste a las 00:30. */
    _FMT_AR_OK_ = [new Date(2026, 0, 5, 0, 30), new Date(2026, 0, 5, 23, 30)].every(function (x) {
      return _fmtDmyLocal_(x) === Utilities.formatDate(x, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
    }) && [new Date(1899, 11, 30, 19, 5), new Date(2026, 0, 5, 23, 30)].every(function (x) {
      /* Las celdas que son solo HORA llegan como fechas de 1899, cuando Argentina
         tenia otra hora oficial (LMT, -4:16:48). Si JS y el servicio no la
         resuelven igual, se usa el servicio para todo (8/10/2026, ventas). */
      return _dos_(x.getHours()) + ':' + _dos_(x.getMinutes()) === Utilities.formatDate(x, 'America/Argentina/Buenos_Aires', 'HH:mm');
    });
  }
  if (_CRM_VIEJO_ || !_FMT_AR_OK_ || isNaN(d.getTime()) ||
      (fmt !== 'dd/MM/yyyy' && fmt !== 'dd/MM/yyyy HH:mm' && fmt !== 'yyyy-MM-dd' && fmt !== 'HH:mm' &&
       fmt !== 'yyyy-MM-dd HH:mm' && fmt !== 'yyyy-MM')) {
    return Utilities.formatDate(d, 'America/Argentina/Buenos_Aires', fmt);
  }
  if (fmt === 'yyyy-MM') return d.getFullYear() + '-' + _dos_(d.getMonth() + 1);
  if (fmt === 'yyyy-MM-dd' || fmt === 'yyyy-MM-dd HH:mm') {
    var iso = d.getFullYear() + '-' + _dos_(d.getMonth() + 1) + '-' + _dos_(d.getDate());
    return fmt === 'yyyy-MM-dd' ? iso : iso + ' ' + _dos_(d.getHours()) + ':' + _dos_(d.getMinutes());
  }
  if (fmt === 'HH:mm') return _dos_(d.getHours()) + ':' + _dos_(d.getMinutes());
  var t = _fmtDmyLocal_(d);
  return fmt === 'dd/MM/yyyy HH:mm' ? t + ' ' + _dos_(d.getHours()) + ':' + _dos_(d.getMinutes()) : t;
}

var _FMT_AR_OK_ = null, _CRM_VIEJO_ = false;

function _fmtDmyLocal_(d) {
  var dd = d.getDate(), mm = d.getMonth() + 1;
  return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + d.getFullYear();
}

function _dos_(n) { return (n < 10 ? '0' : '') + n; }
function _fmtDmyLocal_(d) {
  var dd = d.getDate(), mm = d.getMonth() + 1;
  return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + d.getFullYear();
}

var _PROD_VALS_ = null, _PROD_MEMO_ = false;

function _productosValores_() {
  if (_PROD_MEMO_ && _PROD_VALS_) return _PROD_VALS_;
  var h = SS.getSheetByName('Productos');
  var v = (h && h.getLastRow() > 1) ? h.getDataRange().getValues() : null;
  if (_PROD_MEMO_) _PROD_VALS_ = v;
  return v;
}

var _CRM_TEL_VEND_ = null;   // {tel10: vendedor}, lo llena _crmBuildClientesIndex


/* Un 'aaaa-mm-dd' a las 00:00 de aca, como _crmToDate de una celda de fecha. */
function _pjmDia_(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function _pjmMapa_(pares) { var o = {}; (pares || []).forEach(function (x) { o[x[0]] = (o[x[0]] || 0) + x[1]; }); return o; }
function _pjmCargar_(d) {
  _DATOS = d;
  var H = {};
  H.Config_Maleu = new _Hoja('Config_Maleu', [['Parámetro', 'Valor']].concat(d.config || []));
  H.Productos = new _Hoja('Productos', [['', 'Producto', 'Abreviatura']].concat((d.productos || []).map(function (p) {
    return ['', p[0], p[1], '', '', '', '', p[2], p[3]]; })));
  H.Proveedores = new _Hoja('Proveedores', [['', 'Producto', '', '', 'Abreviatura']].concat((d.proveedores || []).map(function (p) {
    return ['', p[0], '', '', p[1]]; })));
  H.Cupones = new _Hoja('Cupones', [['Codigo', 'Tipo', 'Valor', 'Scope', 'Vence', 'UsosMax', 'UsosActuales', 'Segmento', 'Mensaje', 'Activo']].concat(
    (d.cupones || []).map(function (c) { return [c[0], c[1], c[2], c[3], _pjmDia_(c[4]) || '', '', '', '', '', c[5]]; })));
  H['Interacciones CRM'] = new _Hoja('Interacciones CRM', [['ID', 'Fecha', 'Cliente Key', 'Tel', 'Nombre', 'Resultado', 'Próxima Acción', 'Nota', 'Origen', 'Usuario', 'Entrega', 'Entrega mirada']].concat(
    (d.inter || []).map(function (i) { return [i[0], new Date(i[1]), i[2], i[3], i[4], '', '', i[5], i[6], '', i[7], '']; })));
  var fh = function (ms) { return ms ? new Date(ms) : ''; };
  H['Respuestas Jugadas'] = new _Hoja('Respuestas Jugadas', [PJ_RESP_COLS_.concat(PJ_RESP_ATENDIDO_)].concat(
    (d.resp || []).map(function (r) { return [r[0], r[1], fh(r[2]), fh(r[3]), r[4], fh(r[5]), r[6] ? 'Sí' : '', r[7], r[8]]; })));
  /* La copia de las hojas chicas guarda una fecha como '2026-10-29 13:46:00'; en la hoja es el
     texto '29/10/2026 13:46' (se escribe con formato @), y asi la muestra la pantalla. */
  var iso = function (v) { var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::\d{2})?$/.exec(String(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : v; };
  H[PJ_PROG_HOJA] = new _Hoja(PJ_PROG_HOJA, [PJ_PROG_COLS_].concat((d.prog || []).map(function (x) {
    return PJ_PROG_COLS_.map(function (h) { return x[h] == null ? '' : iso(x[h]); }); })));
  _HOJAS = H;
  _CFG_MEMO_ = null; _FMT_AR_OK_ = null; _PROD_VALS_ = null;
}
/* `_crmBuildClientesIndex`: los clientes ya vienen agrupados y en orden; aca se arman los
   pedidos con las mismas funciones de Code.js (la hora, el cupon). */
function _crmBuildClientesIndex() {
  var tv = {}; (_DATOS.vend || []).forEach(function (t) { tv[t] = 1; }); _CRM_TEL_VEND_ = tv;
  var index = {};
  (_DATOS.index || []).forEach(function (c) {
    index[c.k] = { tel: c.tel, nombres: _pjmMapa_(c.n), barrios: _pjmMapa_(c.b), subBarrios: _pjmMapa_(c.s), domicilios: _pjmMapa_(c.d),
      countEntregados: c.ent, pend: c.pend,
      pedidos: (c.p || []).map(function (q) {
        var f = _pjmDia_(q[2]), fv = _pjmDia_(q[3]), fs = f ? f.getTime() : 0;
        return { canal: q[0], estado: q[1], fechaSort: fs, ventaSort: fv ? fv.getTime() : fs, ventaTotal: q[4], total: q[5],
                 he: _pjHoraMin_(q[6]), hp: _pjHoraMin_(q[7]), cup: _pjUsoCupon_(q[8], q[9]), cam: '', grp: q[10],
                 productos: (q[11] || []).map(function (x) { return { a: x[0], q: x[1] }; }) };
      }) };
  });
  return index;
}
function _crmGetClientesMeta() {
  var m = {};
  (_DATOS.meta || []).forEach(function (x) {
    m[x[0]] = { tel: x[0], nombreCanonico: x[1], apodo: x[2], barrioMapa: x[3], sinUbicacion: !!x[4], loteMapa: x[5], subBarrioMapa: x[6], visitante: !!x[7] };
  });
  return m;
}
function _pjTemplates_() { return _TPLS; }

/* datos: lo que devuelve crm_jugadas_pantalla. opts.tpls: los templates de WATI (de Apps Script);
   opts.ahora: fijar el reloj (la prueba). Devuelve lo mismo que `?action=crmJugadas`. */
G.PJ_MOTOR = {
  armar: function (datos, opts) {
    opts = opts || {};
    _ahora = opts.ahora != null ? Number(opts.ahora) : null;
    try {
      _pjmCargar_(datos || {});
      _TPLS = opts.tpls || null;
      var o = JSON.parse(_doGetCrmJugadas({ parameter: {} }).getContent());
      o.base = true;
      return o;
    } finally { _ahora = null; _DATOS = null; _HOJAS = {}; }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
