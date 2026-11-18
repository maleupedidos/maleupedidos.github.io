/* PISADAS: el ERP tiene que verse bien en el iPhone igual que en la compu (15/11/2026).
 *
 * Tadeo: «Lo que hace Backend, desde el celular pone mal los tamaños y se pisa todo. Todo ajuste se tiene que poder ver
 * VISUALMENTE desde el iPhone como desde la computadora». No a ojo: un detector.
 *
 *   PW=<playwright-core> SES_ADMIN=<ses.json> [SES_EQUIPO=..] [SES_REPARTIDOR=..] [SES_VENDEDOR=..] node _tools/pruebas/pisadas.js
 *   Opcionales: BASE (http://localhost:8080/app.html) · MEDIDAS=w390,w375,c1440 · SOLO=ventas,ajustes (tabs) ·
 *               OUT=<carpeta> (informe.json + capturas a la mitad del scroll) · SIN_SUB=1 · SIN_DET=1
 *   (las sesiones las arma estancias/scripts/migraciones/sesion_prueba.py crear <ses.json> <usuario> <rol>)
 *
 * Recorre cada tab, cada sub-tab (solo botones de NAVEGACIÓN, la lista de recorrer_subtabs.js) y los detalles que se abren
 * (venta, ficha del pedido, ficha del cliente, cuadro de cobro, freezer, PIN), por rol. Por pantalla mide:
 *   · PISADAS: renglones de texto visibles de dos elementos distintos que se cruzan (no cuenta lo fijo contra lo que pasa
 *     por debajo, ni lo recortado por un contenedor);
 *   · CORTADOS: texto que no entra (scrollWidth > clientWidth) en un contenedor que lo esconde sin «…» a propósito;
 *   · SCROLL de costado del body;
 *   · BOTONES de menos de 44 px de alto (solo en el celular);
 *   · LETRA de menos de 12 px.
 * Toda escritura se corta: solo pasan las lecturas (*_pantalla, *_datos, *_base, permiso_base). Sale con código 1 si hay
 * alguna pisada o scroll de costado (lo que cierra la regla); lo demás se informa.
 */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8080/app.html';
const OUT = process.env.OUT || path.join(os.tmpdir(), 'pisadas');
const SOLO = process.env.SOLO ? process.env.SOLO.split(',').map((x) => x.trim()).filter(Boolean) : null;
const MEDIDAS = (process.env.MEDIDAS || 'w390,w375,c1440').split(',');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter((p) => fs.existsSync(p))[0];
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const NAV = /^(?:estSwitch|ajGo|setCrmProdPeriodo|switchTab|stSwitchTab|vSwitchTab|abaSwitchTab|setMainTab|stVista|setRutaFiltro|segSwitchVista|goSubInicio|setPlataSub|mrShowSub|estRecSub|estCliVista|eerrSetModo|setCobrosFiltro|showViernesTab|redVista|mpGo|cobModoElegir|resVer|crmVer|crmTab|bbddTab|pvTab|vfTab)\(/;
fs.mkdirSync(OUT, { recursive: true });

/* (15/11/2026, 722) «equipo» = Tatu (santos): corrige pedidos, sin costos ni historial. El repartidor de prueba pasa a ser alfonso. */
const ROLES = [['admin', process.env.SES_ADMIN, 'tadeo'], ['equipo', process.env.SES_EQUIPO, 'santos'], ['repartidor', process.env.SES_REPARTIDOR, 'alfonso'], ['vendedor', process.env.SES_VENDEDOR, 'marcos']]
  .filter((r) => r[1] && fs.existsSync(r[1]));
if (!ROLES.length) { console.log('falta SES_ADMIN=<archivo de sesion_prueba.py>'); process.exit(1); }

/* La medición, adentro de la página. */
const MEDIR = String(function (movil) {
  var vis = function (e) {
    if (!e || !e.getClientRects().length) return false;
    var bx = e.getBoundingClientRect(); if (bx.right <= 1 || bx.left >= innerWidth - 1) return false;   // fuera de la pantalla (el menú lateral cerrado)
    /* contentVisibilityAuto: lo que el navegador no dibuja porque está fuera de pantalla (Pedidos usa content-visibility:auto)
       tiene medidas estimadas: no se cuenta. */
    if (e.checkVisibility) return e.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });
    var cs = getComputedStyle(e); return cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
  };
  var nombre = function (e) {
    var c = (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/).slice(0, 2).join('.');
    return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (c ? '.' + c : '');
  };
  var fijo = function (e) { for (var n = e; n && n !== document.body; n = n.parentElement) { var p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return n; } return null; };
  /* El recorte de los contenedores con overflow distinto de visible. */
  var clip = function (e) {
    var r = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 }; var desliza = false;
    for (var n = e; n && n !== document.documentElement; n = n.parentElement) {   // el propio elemento también recorta (un «…»)
      var cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { var b = n.getBoundingClientRect(); r = { l: Math.max(r.l, b.left), t: Math.max(r.t, b.top), r: Math.min(r.r, b.right), b: Math.min(r.b, b.bottom) }; }
      /* Lo que corta de COSTADO sin dejar deslizar (hidden/clip, no auto/scroll): ahí un texto que se pasa queda mocho. */
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') desliza = true;   // de ahí para arriba, lo que se pasa se desliza: no queda mocho
      if (!desliza && (cs.overflowX === 'hidden' || cs.overflowX === 'clip')) { var b2 = n.getBoundingClientRect(); r.hl = Math.max(r.hl === undefined ? -1e9 : r.hl, b2.left); r.hr = Math.min(r.hr === undefined ? 1e9 : r.hr, b2.right); }
    }
    return r;
  };
  var mochos = new Set(), mochosL = [];
  /* El «…» puede estar en el elemento o en el contenedor que corta (.cj-con con un .ord-link adentro). */
  /* (15/11) Un monto o un número cortado con «…» («$80…») es un error: el «…» a propósito vale para nombres, no para plata. */
  /* Monto = con «$», o un número solo («25», «1,6M»); «Home #2505 · La Pioner…» es una dirección, no un monto. */
  var esMonto = function (s) { s = String(s || '').trim(); return /\$\s?[\d.,]/.test(s) || /^[\d.,]+\s?[kKM%]?$/.test(s); };
  var conPuntos = function (e) { for (var n = e, i = 0; n && i < 5; n = n.parentElement, i++) if (getComputedStyle(n).textOverflow === 'ellipsis') return true; return false; };
  var cajas = [], tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nd, rg = document.createRange(), vistos = new Map();
  while ((nd = tw.nextNode())) {
    if (!nd.nodeValue || !nd.nodeValue.trim()) continue;
    var el = nd.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(el.tagName)) continue;
    /* El contenido de un <details> cerrado no se ve, aunque su padre (el details) sí: solo cuenta lo de su <summary>. */
    if (el.closest('details:not([open])') && !el.closest('summary')) continue;
    var v = vistos.get(el); if (v === undefined) { v = vis(el) ? { f: fijo(el), c: clip(el) } : null; vistos.set(el, v); }
    if (!v) continue;
    rg.selectNodeContents(nd);
    var rs = rg.getClientRects();
    for (var i = 0; i < rs.length; i++) {
      var q = rs[i]; if (q.width < 2 || q.height < 2) continue;
      var x = { l: Math.max(q.left, v.c.l), t: Math.max(q.top, v.c.t), r: Math.min(q.right, v.c.r), b: Math.min(q.bottom, v.c.b) };
      /* Se ve, pero con la punta cortada de costado (y sin «…» a propósito): «30 d en el freeze». */
      if (v.c.hr !== undefined && (q.right > v.c.hr + 2 || q.left < v.c.hl - 2) && q.bottom > v.c.t && q.top < v.c.b && (!conPuntos(el) || esMonto(nd.nodeValue))) {
        var kc = nombre(el); if (!mochos.has(kc)) { mochos.add(kc); mochosL.push({ el: kc, t: nd.nodeValue.trim().slice(0, 40), sobra: Math.round(Math.max(q.right - v.c.hr, v.c.hl - q.left)) }); }
      }
      if (x.r - x.l < 2 || x.b - x.t < 2) continue;   // recortado por su contenedor: no se ve
      cajas.push({ x: x, el: el, f: v.f, t: nd.nodeValue.trim().slice(0, 40) });
    }
  }
  cajas.sort(function (a, b) { return a.x.t - b.x.t; });
  var pis = [], ya = new Set();
  for (var a = 0; a < cajas.length; a++) {
    var A = cajas[a];
    for (var b2 = a + 1; b2 < cajas.length; b2++) {
      var B = cajas[b2]; if (B.x.t >= A.x.b) break;
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
      if (A.f !== B.f) continue;   // lo fijo contra lo que pasa por debajo no es una pisada
      var w = Math.min(A.x.r, B.x.r) - Math.max(A.x.l, B.x.l), h = Math.min(A.x.b, B.x.b) - Math.max(A.x.t, B.x.t);
      if (w < 3 || h < 3) continue;
      var amin = Math.min((A.x.r - A.x.l) * (A.x.b - A.x.t), (B.x.r - B.x.l) * (B.x.b - B.x.t));
      if (w * h < amin * 0.15) continue;
      var k = nombre(A.el) + '|' + nombre(B.el); if (ya.has(k)) continue; ya.add(k);
      pis.push({ a: nombre(A.el), ta: A.t, b: nombre(B.el), tb: B.t, y: Math.round(A.x.t + window.scrollY) });
    }
  }
  var cort = [], bot = [], let_ = [], ks = new Set();
  document.querySelectorAll('body *').forEach(function (e) {
    if (!vis(e)) return;
    var directo = false; for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.nodeValue.trim()) { directo = true; break; }
    var cs = getComputedStyle(e);
    /* Lo que es solo para el lector de pantalla (1 px, recortado: .k-sr) no se ve: no está «cortado». */
    if (directo && e.clientWidth > 2 && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && (cs.textOverflow !== 'ellipsis' || esMonto(e.textContent))) {
      var k1 = 'c' + nombre(e); if (!ks.has(k1)) { ks.add(k1); cort.push({ el: nombre(e), t: (e.textContent || '').trim().slice(0, 40), sobra: e.scrollWidth - e.clientWidth }); }
    }
    if (movil && (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || (e.tagName === 'A' && e.getAttribute('onclick')) || (e.tagName === 'INPUT' && /button|submit/.test(e.type)))) {
      var hh = e.getBoundingClientRect().height;
      if (hh < 43.5 && hh > 0 && !fijo(e) || (hh < 43.5 && hh > 0 && fijo(e))) { var k2 = 'b' + nombre(e); if (!ks.has(k2)) { ks.add(k2); bot.push({ el: nombre(e), t: (e.textContent || '').trim().slice(0, 30), h: Math.round(hh) }); } }
    }
    /* 0 = escondido a propósito; el texto de un SVG escala con el dibujo. */
    if (directo && parseFloat(cs.fontSize) < 11.95 && parseFloat(cs.fontSize) > 0 && !e.closest('svg')) { var k3 = 'l' + nombre(e); if (!ks.has(k3)) { ks.add(k3); let_.push({ el: nombre(e), t: (e.textContent || '').trim().slice(0, 30), px: parseFloat(cs.fontSize) }); } }
  });
  /* (15/11) DESBORDES ENTRE HERMANOS: «mar 1(mié 1)jue 12». Cada etiqueta desborda su celda (overflow visible) y se mete
     en la vecina: los dos textos casi no se cruzan entre sí, pero el de una celda queda encima del borde de la otra. Para
     cada renglón de texto, su celda es el ancestro que no es inline; si el texto se sale de costado y esa parte cae sobre
     la caja de un hermano de la celda, es una pisada. */
  var vistosC = new Set();
  cajas.forEach(function (A) {
    var cel = A.el; while (cel && cel !== document.body && getComputedStyle(cel).display === 'inline') cel = cel.parentElement;
    if (!cel || cel === document.body || !cel.parentElement) return;
    /* Sube mientras el texto también se salga del padre: la etiqueta es un bloque dentro de la celda, y las vecinas son
       hermanas de la CELDA, no de la etiqueta. */
    var sale = function (n) { var b = n.getBoundingClientRect(); return A.x.r > b.right + 2 || A.x.l < b.left - 2; };
    for (var sub = 0; sub < 5 && cel.parentElement && cel.parentElement !== document.body && sale(cel.parentElement) && getComputedStyle(cel.parentElement).overflowX === 'visible'; sub++) cel = cel.parentElement;
    var cb = cel.getBoundingClientRect(), fuera = null;
    if (A.x.r > cb.right + 2) fuera = { l: Math.max(cb.right, A.x.l), r: A.x.r };
    else if (A.x.l < cb.left - 2) fuera = { l: A.x.l, r: Math.min(cb.left, A.x.r) };
    if (!fuera) return;
    var hs = cel.parentElement.children;
    for (var i = 0; i < hs.length; i++) {
      var h2 = hs[i]; if (h2 === cel || !h2.getClientRects().length) continue;
      var hb = h2.getBoundingClientRect();
      /* Cuenta si lo que se sale cae sobre TEXTO de la vecina (lo que el ojo ve encimado), no sobre su caja vacía
         (dos ⓘ cerradas una abajo de la otra en Jugadas daban un falso positivo). */
      var tocaTexto = cajas.some(function (B) { return h2.contains(B.el) && B.x.r > fuera.l + 1 && B.x.l < fuera.r - 1 && B.x.b > A.x.t + 1 && B.x.t < A.x.b - 1; });
      if (tocaTexto && fuera.r > hb.left + 1 && fuera.l < hb.right - 1 && A.x.b > hb.top + 1 && A.x.t < hb.bottom - 1) {
        var kk = nombre(cel) + '>' + nombre(h2); if (vistosC.has(kk)) return; vistosC.add(kk);
        pis.push({ a: nombre(cel), ta: A.t, b: nombre(h2) + ' (se mete en la celda de al lado)', tb: (h2.textContent || '').trim().slice(0, 30), y: Math.round(A.x.t + window.scrollY) });
        return;
      }
    }
  });
  /* (15/11/2026) LOS PLACEHOLDERS CORTADOS TAMBIÉN CUENTAN: «O una nueva. E…» en la juntada de la ficha. Un campo vacío y
     visible cuyo placeholder, medido con la letra del campo, no entra en su ancho útil (sin el relleno ni el borde). */
  var _cv = document.createElement('canvas').getContext('2d');
  document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(function (inp) {
    if (inp.value || !inp.placeholder || !inp.getClientRects().length) return;
    var r = inp.getBoundingClientRect(); if (r.width < 2 || r.bottom < 0 || r.right < 0 || r.left > innerWidth) return;
    if (inp.closest && inp.closest('details:not([open])')) return;
    var cs = getComputedStyle(inp); if (cs.visibility === 'hidden') return;
    _cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var util = inp.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    var ancho = _cv.measureText(inp.placeholder).width;
    if (inp.tagName === 'TEXTAREA') return;   /* el textarea parte el renglón: no corta */
    if (ancho > util + 1) { var k2 = 'p' + nombre(inp); if (!ks.has(k2)) { ks.add(k2); cort.push({ el: nombre(inp) + ' (placeholder)', t: inp.placeholder.slice(0, 40), sobra: Math.round(ancho - util) }); } }
  });
  var de = document.documentElement;
  cort = cort.concat(mochosL);
  /* (15/11/2026) TARJETAS HERMANAS DESPAREJAS. No es una pisada, es desprolijidad: en Inicio › Total Maleu la de Costo tenía
     etiqueta y monto en la misma línea y el chip pegado al ícono, y las otras dos no. En un grupo de tarjetas hermanas (mismo
     padre, misma clase), cada parte que tienen TODAS —el ícono (::after), la etiqueta, el número, el chip— tiene que estar en
     la misma posición relativa a su tarjeta y el ícono del mismo tamaño (±2 px). */
  var desp = [];
  document.querySelectorAll('[class*="kpis"],.vs-top,.vs-plata,.res-ks,.mt-kpis,.rt-kpis').forEach(function (cont) {
    if (!cont.getClientRects().length) return;
    var porClase = {};
    [].forEach.call(cont.children, function (c) { if (!c.getClientRects().length || !c.className || typeof c.className !== 'string') return; var kc = c.className.trim().split(/\s+/)[0] + ' (' + Math.round(c.getBoundingClientRect().width / 4) * 4 + 'px)'; (porClase[kc] = porClase[kc] || []).push(c); });   /* la primera clase y el mismo ancho: una tarjeta a todo el ancho (Proyectado) no es hermana de las de media */
    Object.keys(porClase).forEach(function (cl) {
      var L = porClase[cl]; if (L.length < 2 || L.length > 12) return;
      var partes = { 'ícono': null, 'etiqueta': '[class*="kl"],[class*="-l"]:not(label),.v-kpi-l', 'número': '[class*="kv"],.v-kpi-v,[class*="-v"]:not(.vs-pr)', 'chip': '.kpi-cmp,.kpi-pill,[class*="kd"]' };
      Object.keys(partes).forEach(function (pt) {
        var med = L.map(function (c) {
          var rc = c.getBoundingClientRect();
          if (pt === 'ícono') {
            var a = getComputedStyle(c, '::after');
            if (!a || a.content === 'none' || a.content === 'normal' || !(parseFloat(a.width) > 4)) return null;
            return { x: rc.right - c.clientLeft - (parseFloat(a.right) || 0) - parseFloat(a.width) - rc.left, y: parseFloat(a.top) || 0, w: parseFloat(a.width), h: parseFloat(a.height) };
          }
          var e = c.querySelector(partes[pt]); if (!e || !e.getClientRects().length) return null;
          var r = e.getBoundingClientRect();
          return { x: r.left - rc.left, y: pt === 'chip' ? null : r.top - rc.top, w: null, h: null, ry: (r.top - rc.top) / Math.max(1, rc.height) };
        });
        if (med.some(function (m) { return !m; })) return;
        ['x', 'y', 'w', 'h'].forEach(function (k) {
          var v = med.map(function (m) { return m[k]; }).filter(function (z) { return z !== null && z !== undefined; });
          if (v.length < 2) return;
          var dif = Math.max.apply(null, v) - Math.min.apply(null, v);
          if (dif > 2) desp.push({ grupo: nombre(cont) + ' > .' + cl.split(' ')[0], parte: pt, eje: k, dif: Math.round(dif) });
        });
      });
    });
  });
  /* (16/11/2026) ESPACIADO DESPAREJO ENTRE SECCIONES (Organizador, por Tadeo: «un solo espaciado vertical entre secciones y uno
     solo entre tarjetas»). Las secciones de la pantalla son las cajas anchas (≥ 60 % del ancho de la pantalla, con borde,
     fondo o sombra) y las filas de tarjetas (un contenedor ancho sin caja con ≥ 2 cajas en el mismo renglón); no se baja
     adentro de una caja. Se mide el aire vertical entre cada par vecino; el par con un título en el medio no cuenta (el título
     va pegado a lo suyo). Se permiten DOS medidas (±2 px): la de entre secciones y la de entre tarjetas de un mismo grupo. */
  var espaciado = [];
  (function () {
    var pg = document.querySelector('.pg.on'); if (!pg || !pg.getClientRects().length) return;
    var W = pg.getBoundingClientRect().width;
    var caja = function (e) { var cs = getComputedStyle(e); var bg = cs.backgroundColor; return (parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || (cs.boxShadow && cs.boxShadow !== 'none')); };
    var ancho = function (e) { return e.getBoundingClientRect().width >= W * 0.6; };
    var visto = function (e) { return e.getClientRects().length && e.getBoundingClientRect().height > 4 && getComputedStyle(e).position !== 'fixed' && getComputedStyle(e).position !== 'absolute'; };
    var fila = function (e) { var hs = [].filter.call(e.children, function (c) { return visto(c) && caja(c); }); if (hs.length < 2) return false; var t0 = hs[0].getBoundingClientRect().top; return hs.filter(function (c) { return Math.abs(c.getBoundingClientRect().top - t0) < 3; }).length >= 2; };
    var secs = [], tits = [];
    var bajar = function (el, d) {
      if (d > 8) return;
      [].forEach.call(el.children, function (c) {
        if (!visto(c) || !ancho(c)) return;
        if (/^(BUTTON|INPUT|SELECT|TEXTAREA|LABEL|A)$/.test(c.tagName)) return;   // un control no es una sección
        /* Un encabezado (≤ 48 px de alto, con texto: «Domingo 15/11 · 3 ventas», «Pizzas») es un título aunque tenga caja:
           va pegado a lo suyo y con aire antes del grupo que sigue, y eso es ritmo, no desprolijidad. */
        if (!fila(c) && c.getBoundingClientRect().height <= 48 && (c.textContent || '').trim()) { tits.push(c.getBoundingClientRect()); return; }
        if (caja(c) || fila(c)) { secs.push(c); return; }
        var txt = false; for (var n = c.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) { txt = true; break; }
        if (txt && !c.children.length) { tits.push(c.getBoundingClientRect()); return; }
        bajar(c, d + 1);
      });
    };
    bajar(pg, 0);
    secs.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
    /* Una LISTA es una sola sección: los hermanos seguidos con el mismo padre y la misma clase (los pedidos, los
       movimientos de caja) se juntan en un bloque; su aire interno es el de la lista, no el de la pantalla. */
    var blq = [];
    secs.forEach(function (e) {
      var r = e.getBoundingClientRect(), u = blq[blq.length - 1];
      var c1 = (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/)[0];   // la primera clase: .cj-r.t-cobro y .cj-r.t-gasto son la misma lista
      if (u && u.par === e.parentElement && u.cls === c1) { u.bottom = Math.max(u.bottom, r.bottom); return; }
      blq.push({ par: e.parentElement, cls: c1, top: r.top, bottom: r.bottom, n: nombre(e) });
    });
    var gaps = [];
    for (var i = 1; i < blq.length; i++) {
      var A = blq[i - 1], B = blq[i];
      if (B.top < A.bottom - 1) continue;   // se encima (columnas): no es una pila
      var g = Math.round(B.top - A.bottom);
      if (tits.some(function (t) { return t.top >= A.bottom - 1 && t.bottom <= B.top + 1; })) continue;
      gaps.push({ g: g, a: A.n, b: B.n });
    }
    var vals = []; gaps.forEach(function (x) { if (!vals.some(function (v) { return Math.abs(v - x.g) <= 2; })) vals.push(x.g); });
    if (vals.length > 2) espaciado = gaps.map(function (x) { return x.a + ' ↕ ' + x.g + 'px ↕ ' + x.b; });
  })();
  /* (18/11/2026) Cuánto texto se ve en la pantalla activa. Mi Portal como vendedor salía EN BLANCO (sin su sesión del portal)
     y daba «pisadas 0»: medir una pantalla vacía es un verde sin mirar nada. Con menos de 30 letras, la pantalla es «vacía». */
  var _pgOn = document.querySelector('.pg.on') || document.body;
  var txtLen = String(_pgOn.innerText || '').replace(/\s+/g, ' ').trim().length;
  return { pisadas: pis, cortados: cort, scroll: Math.max(0, de.scrollWidth - de.clientWidth), botones: bot, letra: let_, desparejos: desp, espaciado: espaciado, txt: txtLen, vacia: txtLen < 30 };
});

const esperarCarga = (pg) => pg.waitForFunction(() => {
  const p = document.querySelector('.pg.on'); if (!p) return false;
  const t = (p.innerText || '').slice(0, 500);
  return p.querySelectorAll('*').length > 30 && !(/Cargando|Buscando…|Trayendo/.test(t) && t.length < 600);
}, null, { timeout: 25000 }).catch(() => {});

(async () => {
  const informe = [];
  for (const medida of MEDIDAS) {
    const movil = medida[0] === 'w', ancho = Number(medida.slice(1)), alto = ancho === 375 ? 667 : (movil ? 844 : 900);
    const br = medida[0] === 'w' ? await pw.webkit.launch() : await pw.chromium.launch(CHROME ? { executablePath: CHROME } : {});
    for (const [rol, sesF, usuario] of ROLES) {
      const ses = JSON.parse(fs.readFileSync(sesF, 'utf8'));
      let extra = '', uReal = usuario, sesPanel = { usuario, rol, ts: Date.now() };
      /* SIN_SESION_PORTAL=1 reproduce lo de antes del 18/11 (el portal sin su sesión, en blanco): para comprobar que «vacía» lo agarra. */
      if (rol === 'vendedor' && !process.env.SIN_SESION_PORTAL) {
        try {
          const r = await fetch(SB + '/rest/v1/rpc/mi_sesion_pantalla', { method: 'POST', headers: { apikey: PUB, Authorization: 'Bearer ' + ses.access_token, 'Content-Type': 'application/json' }, body: '{}' });
          const s0 = await r.json();
          if (s0 && s0.ok) {
            uReal = String(s0.usuario || usuario);
            sesPanel = { usuario: uReal, rol, nombre: s0.nombre || usuario, ts: Date.now(), tabs: Array.isArray(s0.tabs) ? s0.tabs : ['miportal'] };
            extra = `try{localStorage.setItem('maleu_red_session',${JSON.stringify(JSON.stringify({ ok: true, nombre: s0.nombre || '', usuario: uReal, wa: s0.wa || '', aliasMp: s0.aliasMp || '',
              comision: s0.comision || 17, barrios: s0.barrios || [], partido: s0.partido || '', localidad: s0.localidad || '' }))});}catch(e){}`;
          } else console.log('  (vendedor: mi_sesion_pantalla no devolvió la sesión; el portal puede quedar vacío)');
        } catch (e) { console.log('  (vendedor: no pude leer mi_sesion_pantalla: ' + e.message + ')'); }
      }
      const ctx = await br.newContext(movil
        ? { viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
        : { viewport: { width: ancho, height: alto } });
      /* (16/11/2026) CAJON=0 cerrado · CAJON=1 abierto (en la compu); sin la variable, lo que el ERP tenga por default. */
      if (process.env.CAJON === '0' || process.env.CAJON === '1') await ctx.addInitScript(`try{localStorage.setItem('maleu_sb_open','${process.env.CAJON}')}catch(e){}`);
      if (extra) await ctx.addInitScript(extra);
      await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',${JSON.stringify(JSON.stringify(sesPanel))});
        localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: uReal, url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
        window.confirm=function(){return false;}; window.alert=function(){}; window.prompt=function(){return null;};
        (function(){var f=window.fetch;window.__cortados=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
          var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
          if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1]))){window.__cortados.push((r&&r[1])||s.slice(0,60));return Promise.resolve(new Response('{"ok":false,"err":"cortado por la prueba"}',{status:200,headers:{'Content-Type':'application/json'}}));}
          return f.apply(this,arguments);};})();`);
      const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message || e).slice(0, 160)));
      await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 });
      await pg.waitForFunction(() => typeof window.go === 'function' && typeof SESSION !== 'undefined' && !!SESSION, null, { timeout: 90000 }).catch(() => {});
      await pg.waitForTimeout(4000);
      /* Las pantallas de este rol: las de SESSION.tabs (admin: todas), la que abre al entrar y las que el menú ofrece. */
      let tabs = await pg.evaluate(() => {
        const T = (SESSION && SESSION.tabs) || [], ids = Array.from(document.querySelectorAll('.pg')).map((p) => p.id.replace(/^p-/, ''));
        const menu = new Set();
        document.querySelectorAll('[onclick]').forEach((e) => { const m = /\bgo\('([a-z]+)'\)/.exec(e.getAttribute('onclick') || ''); if (m && e.getClientRects().length) menu.add(m[1]); });
        const on = ((document.querySelector('.pg.on') || {}).id || '').replace(/^p-/, '');
        return ids.filter((t) => SESSION.rol === 'admin' || T.indexOf('*') >= 0 || T.indexOf(t) >= 0 || menu.has(t) || t === on);
      });
      if (SOLO) tabs = tabs.filter((t) => SOLO.indexOf(t) >= 0);
      const medir = async (donde) => {
        await pg.waitForTimeout(700);
        let m = null;
        try { m = await pg.evaluate(`(${MEDIR})(${movil})`); } catch (e) { m = { error: String(e.message).slice(0, 120) }; }
        let foto = '';
        if (m && (process.env.CAPTURAS || (m.pisadas || []).length || m.scroll)) {   // CAPTURAS=1: una por pantalla (deploy.sh)
          foto = path.join(OUT, (medida + '_' + rol + '_' + donde).replace(/[^a-z0-9_.-]+/gi, '_').slice(0, 90) + '.png');
          try {
            /* Con una pisada, la foto es AHÍ (a un tercio de la pantalla); si no, a la mitad del scroll. */
            const yP = (m.pisadas && m.pisadas[0]) ? m.pisadas[0].y : null;
            await pg.evaluate((yp) => { const y = yp !== null ? yp - innerHeight / 3 : (document.documentElement.scrollHeight - innerHeight) / 2; window.scrollTo(0, Math.max(0, y)); }, yP);
            await pg.waitForTimeout(250); await pg.screenshot({ path: foto }); await pg.evaluate(() => window.scrollTo(0, 0));
          } catch (e) { foto = ''; }
        }
        const r = Object.assign({ medida, rol, donde, foto }, m);
        informe.push(r);
        const n = (x) => (x || []).length;
        console.log((n(m.pisadas) || m.scroll || m.vacia ? 'MAL ' : 'ok  ') + medida.padEnd(6) + rol.padEnd(11) + donde.padEnd(40).slice(0, 40)
          + (m.vacia ? ' VACÍA (' + (m.txt || 0) + ' letras a la vista: no se midió nada) ·' : '')
          + ' pisadas ' + n(m.pisadas) + ' · scroll ' + (m.scroll || 0) + ' · cortados ' + n(m.cortados) + ' · botones<44 ' + n(m.botones) + ' · letra<12 ' + n(m.letra) + ' · desparejas ' + n(m.desparejos) + ' · espaciado ' + (n(m.espaciado) ? 'DESPAREJO' : 'ok') + (m.error ? ' · ERROR ' + m.error : ''));
        if (n(m.espaciado) && process.env.VER_ESPACIADO) m.espaciado.forEach((x) => console.log('      ' + x));
        return m;
      };
      for (const t of tabs) {
        try { await pg.evaluate((x) => go(x), t); } catch (e) { continue; }
        await esperarCarga(pg);
        await medir(t);
        if (!process.env.SIN_SUB) {
          const subs = await pg.evaluate((re) => {
            const R = new RegExp(re), p = document.querySelector('.pg.on'); if (!p) return [];
            const out = [], ya = new Set();
            p.querySelectorAll('[onclick]').forEach((e) => { const o = (e.getAttribute('onclick') || '').trim(); if (R.test(o) && !ya.has(o) && e.getClientRects().length) { ya.add(o); out.push(o); } });
            return out.slice(0, 14);
          }, NAV.source);
          for (const o of subs) {
            try { await pg.evaluate((x) => { (0, eval)(x); }, o); } catch (e) { continue; }
            await esperarCarga(pg);
            await medir(t + ' › ' + o.replace(/\(.*$/, '') + '(' + (o.match(/\(['"]?([^'",)]*)/) || [])[1] + ')');
          }
          try { await pg.evaluate((x) => go(x), t); } catch (e) {}
        }
        if (!process.env.SIN_DET) {
          /* Los detalles: lo que se abre adentro de cada pantalla. */
          const DET = {
            ventas: [['venta abierta', `go('ventas'); try{ vSwitchTab('ventas'); }catch(e){} var L=[].slice.call(document.querySelectorAll('#vList .vt')), e=L.filter(function(x){ var v=x.__venta; return v&&(v.h==='Home'||v.h==='Pilar')&&v.n; })[0]||L[0]; if(e){ vtToggle(e); e.scrollIntoView({block:'start'}); } !!e`],
                     ['hoja de filtros', `go('ventas'); try{ vSwitchTab('ventas'); }catch(e){} window.scrollTo(0,0); if(typeof vfAbrirFiltros!=='function')false; else { vfAbrirFiltros(); true; }`],
                     ['hoja de fechas', `go('ventas'); try{ vSwitchTab('ventas'); }catch(e){} window.scrollTo(0,0); if(typeof vfAbrirFechas!=='function')false; else { vfAbrirFechas(); true; }`]],
            pedidos: [['ficha del pedido', `var p=(D.pedidos||[]).filter(function(x){return x.es==='Entregado'&&x.h==='Home';})[0]; if(p){ openOrdDetail(p.h,p.n,p.r||0); } !!p`],
                      ['ficha › más opciones', `var p=(D.pedidos||[]).filter(function(x){return x.es==='Entregado'&&x.ep==='Cobrado'&&x.h==='Home';}).slice(-1)[0]; if(p){ openOrdDetail(p.h,p.n,p.r||0); setTimeout(function(){ var d=document.getElementById('ordMas'); if(d){ d.open=true; d.scrollIntoView({block:'start'}); } },600); } !!p`]],
            crm: [['ficha del cliente', `var p=(D.pedidos||[]).filter(function(x){return x.h==='Home';})[0]; if(p&&typeof verFichaDePedido==='function'){ verFichaDePedido(p.h,p.n); } !!p`]],
            ajustes: [['freezer', `go('ajustes'); ajGo('depositos'); setTimeout(function(){ try{ stFrzEditar('nuevo','ustariz'); }catch(e){} },800); true`],
                      ['PIN', `go('ajustes'); ajGo('usuarios'); setTimeout(function(){ try{ ajPinGenerar('robot','Robot de pruebas'); }catch(e){} },800); true`]],
            ruta: [['cuadro de cobro', `try{ switchTab('cobros'); }catch(e){} setTimeout(function(){ try{ abrirCobroPendiente(0); }catch(e){} },1500); true`]],
          };
          for (const [nom, js] of (DET[t] || [])) {
            let ok = false; try { ok = await pg.evaluate(js); } catch (e) {}
            if (!ok) continue;
            await pg.waitForTimeout(2500);
            await medir(t + ' › ' + nom);
            await pg.evaluate(() => { ['pinOv', 'entFechaOv', 'rutAyerOv'].forEach((i) => { const o = document.getElementById(i); if (o) o.remove(); }); try { closeOrdDetail(); } catch (e) {} try { vfCerrarHoja(); } catch (e) {} try { cerrarCobroRuta(); } catch (e) {} try { stFrzEditar(null, null); } catch (e) {} try { if (typeof fichaCerrar === 'function') fichaCerrar(); } catch (e) {} });
          }
        }
      }
      const cort = await pg.evaluate(() => (window.__cortados || []).slice(0, 10));
      if (errs.length) console.log('  errores de la página (' + rol + ' ' + medida + '): ' + errs.slice(0, 4).join(' | '));
      if (cort.length) console.log('  escrituras cortadas (no salieron): ' + cort.join(', '));
      await ctx.close();
    }
    await br.close();
  }
  fs.writeFileSync(path.join(OUT, 'informe.json'), JSON.stringify(informe, null, 1));
  const tot = (k) => informe.reduce((a, x) => a + ((x[k] || []).length || 0), 0);
  const pis = tot('pisadas'), scr = informe.filter((x) => x.scroll > 0).length, vac = informe.filter((x) => x.vacia).length;
  console.log('\nPANTALLAS ' + informe.length + ' · pisadas ' + pis + ' · con scroll de costado ' + scr + ' · cortados ' + tot('cortados') + ' · botones<44 ' + tot('botones') + ' · letra<12 ' + tot('letra') + ' · tarjetas desparejas ' + tot('desparejos') + ' · espaciado desparejo ' + informe.filter((x) => (x.espaciado || []).length).length);
  if (vac) console.log('PANTALLAS VACÍAS ' + vac + ': ' + informe.filter((x) => x.vacia).map((x) => x.medida + ' ' + x.rol + ' ' + x.donde).join(', '));
  console.log('informe: ' + path.join(OUT, 'informe.json'));
  process.exitCode = (pis || scr || vac) ? 1 : 0;
})();
