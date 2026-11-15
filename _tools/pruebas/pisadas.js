/* PISADAS: el ERP tiene que verse bien en el iPhone igual que en la compu (15/11/2026).
 *
 * Tadeo: «Lo que hace Backend, desde el celular pone mal los tamaños y se pisa todo. Todo ajuste se tiene que poder ver
 * VISUALMENTE desde el iPhone como desde la computadora». No a ojo: un detector.
 *
 *   PW=<playwright-core> SES_ADMIN=<ses.json> [SES_REPARTIDOR=..] [SES_VENDEDOR=..] node _tools/pruebas/pisadas.js
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

const ROLES = [['admin', process.env.SES_ADMIN, 'tadeo'], ['repartidor', process.env.SES_REPARTIDOR, 'santos'], ['vendedor', process.env.SES_VENDEDOR, 'marcos']]
  .filter((r) => r[1] && fs.existsSync(r[1]));
if (!ROLES.length) { console.log('falta SES_ADMIN=<archivo de sesion_prueba.py>'); process.exit(1); }

/* La medición, adentro de la página. */
const MEDIR = String(function (movil) {
  var vis = function (e) {
    if (!e || !e.getClientRects().length) return false;
    if (e.checkVisibility) return e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    var cs = getComputedStyle(e); return cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
  };
  var nombre = function (e) {
    var c = (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/).slice(0, 2).join('.');
    return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (c ? '.' + c : '');
  };
  var fijo = function (e) { for (var n = e; n && n !== document.body; n = n.parentElement) { var p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return n; } return null; };
  /* El recorte de los contenedores con overflow distinto de visible. */
  var clip = function (e) {
    var r = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
    for (var n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { var b = n.getBoundingClientRect(); r = { l: Math.max(r.l, b.left), t: Math.max(r.t, b.top), r: Math.min(r.r, b.right), b: Math.min(r.b, b.bottom) }; }
    }
    return r;
  };
  var cajas = [], tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nd, rg = document.createRange(), vistos = new Map();
  while ((nd = tw.nextNode())) {
    if (!nd.nodeValue || !nd.nodeValue.trim()) continue;
    var el = nd.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(el.tagName)) continue;
    var v = vistos.get(el); if (v === undefined) { v = vis(el) ? { f: fijo(el), c: clip(el) } : null; vistos.set(el, v); }
    if (!v) continue;
    rg.selectNodeContents(nd);
    var rs = rg.getClientRects();
    for (var i = 0; i < rs.length; i++) {
      var q = rs[i]; if (q.width < 2 || q.height < 2) continue;
      var x = { l: Math.max(q.left, v.c.l), t: Math.max(q.top, v.c.t), r: Math.min(q.right, v.c.r), b: Math.min(q.bottom, v.c.b) };
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
    if (directo && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis') {
      var k1 = 'c' + nombre(e); if (!ks.has(k1)) { ks.add(k1); cort.push({ el: nombre(e), t: (e.textContent || '').trim().slice(0, 40), sobra: e.scrollWidth - e.clientWidth }); }
    }
    if (movil && (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || (e.tagName === 'A' && e.getAttribute('onclick')) || (e.tagName === 'INPUT' && /button|submit/.test(e.type)))) {
      var hh = e.getBoundingClientRect().height;
      if (hh < 43.5 && hh > 0 && !fijo(e) || (hh < 43.5 && hh > 0 && fijo(e))) { var k2 = 'b' + nombre(e); if (!ks.has(k2)) { ks.add(k2); bot.push({ el: nombre(e), t: (e.textContent || '').trim().slice(0, 30), h: Math.round(hh) }); } }
    }
    if (directo && parseFloat(cs.fontSize) < 11.95) { var k3 = 'l' + nombre(e); if (!ks.has(k3)) { ks.add(k3); let_.push({ el: nombre(e), t: (e.textContent || '').trim().slice(0, 30), px: parseFloat(cs.fontSize) }); } }
  });
  var de = document.documentElement;
  return { pisadas: pis, cortados: cort, scroll: Math.max(0, de.scrollWidth - de.clientWidth), botones: bot, letra: let_ };
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
      const ctx = await br.newContext(movil
        ? { viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
        : { viewport: { width: ancho, height: alto } });
      await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:${JSON.stringify(usuario)},rol:${JSON.stringify(rol)},ts:Date.now()}));
        localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: usuario, url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
        window.confirm=function(){return false;}; window.alert=function(){}; window.prompt=function(){return null;};
        (function(){var f=window.fetch;window.__cortados=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
          var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
          if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$/.test(r[1]))){window.__cortados.push((r&&r[1])||s.slice(0,60));return Promise.resolve(new Response('{"ok":false,"err":"cortado por la prueba"}',{status:200,headers:{'Content-Type':'application/json'}}));}
          return f.apply(this,arguments);};})();`);
      const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message || e).slice(0, 160)));
      await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => typeof window.go === 'function' && typeof SESSION !== 'undefined' && !!SESSION, null, { timeout: 90000 }).catch(() => {});
      await pg.waitForTimeout(4000);
      let tabs = await pg.evaluate(() => Array.from(document.querySelectorAll('.pg')).map((p) => p.id.replace(/^p-/, '')).filter((t) => {
        const T = (SESSION && SESSION.tabs) || []; return T.indexOf('*') >= 0 || T.indexOf(t) >= 0 || (SESSION.rol === 'admin');
      }));
      if (SOLO) tabs = tabs.filter((t) => SOLO.indexOf(t) >= 0);
      const medir = async (donde) => {
        await pg.waitForTimeout(700);
        let m = null;
        try { m = await pg.evaluate(`(${MEDIR})(${movil})`); } catch (e) { m = { error: String(e.message).slice(0, 120) }; }
        let foto = '';
        if (m && ((m.pisadas || []).length || m.scroll)) {
          foto = path.join(OUT, (medida + '_' + rol + '_' + donde).replace(/[^a-z0-9_.-]+/gi, '_').slice(0, 90) + '.png');
          try {
            await pg.evaluate(() => { const y = (document.documentElement.scrollHeight - innerHeight) / 2; window.scrollTo(0, Math.max(0, y)); });
            await pg.waitForTimeout(250); await pg.screenshot({ path: foto }); await pg.evaluate(() => window.scrollTo(0, 0));
          } catch (e) { foto = ''; }
        }
        const r = Object.assign({ medida, rol, donde, foto }, m);
        informe.push(r);
        const n = (x) => (x || []).length;
        console.log((n(m.pisadas) || m.scroll ? 'MAL ' : 'ok  ') + medida.padEnd(6) + rol.padEnd(11) + donde.padEnd(40).slice(0, 40)
          + ' pisadas ' + n(m.pisadas) + ' · scroll ' + (m.scroll || 0) + ' · cortados ' + n(m.cortados) + ' · botones<44 ' + n(m.botones) + ' · letra<12 ' + n(m.letra) + (m.error ? ' · ERROR ' + m.error : ''));
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
            ventas: [['venta abierta', `go('ventas'); try{ vSwitchTab('ventas'); }catch(e){} var L=[].slice.call(document.querySelectorAll('#vList .vt')), e=L.filter(function(x){ var v=x.__venta; return v&&(v.h==='Home'||v.h==='Pilar')&&v.n; })[0]||L[0]; if(e){ vtToggle(e); e.scrollIntoView({block:'start'}); } !!e`]],
            pedidos: [['ficha del pedido', `var p=(D.pedidos||[]).filter(function(x){return x.es==='Entregado'&&x.h==='Home';})[0]; if(p){ openOrdDetail(p.h,p.n,p.r||0); } !!p`]],
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
            await pg.evaluate(() => { ['pinOv', 'entFechaOv', 'rutAyerOv'].forEach((i) => { const o = document.getElementById(i); if (o) o.remove(); }); try { closeOrdDetail(); } catch (e) {} try { cerrarCobroRuta(); } catch (e) {} try { stFrzEditar(null, null); } catch (e) {} try { if (typeof fichaCerrar === 'function') fichaCerrar(); } catch (e) {} });
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
  const pis = tot('pisadas'), scr = informe.filter((x) => x.scroll > 0).length;
  console.log('\nPANTALLAS ' + informe.length + ' · pisadas ' + pis + ' · con scroll de costado ' + scr + ' · cortados ' + tot('cortados') + ' · botones<44 ' + tot('botones') + ' · letra<12 ' + tot('letra'));
  console.log('informe: ' + path.join(OUT, 'informe.json'));
  process.exitCode = (pis || scr) ? 1 : 0;
})();
