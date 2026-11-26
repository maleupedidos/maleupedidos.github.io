/* CAPTURAS DEL IPHONE, EN EL LUGAR EXACTO (15/11/2026). WebKit 390×844, sesión temporal, toda escritura cortada.
 *
 *   PW=<playwright-core> SES_ADMIN=<ses.json> BASE=<url app.html> OUT=<carpeta> PREFIJO=antes [SOLO=venta,inicio] node _tools/pruebas/capturas_iphone.js
 *
 * Para mostrarle a Tadeo el antes y el después de una pantalla tal como la ve en el celular: con lo desplegable abierto y
 * la vista donde está lo que se tocó (no a la mitad de una página cualquiera).
 */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html', OUT = process.env.OUT || '.', PREF = process.env.PREFIJO || 'captura';
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
/* [nombre, js que deja la pantalla lista, selector a centrar (o null = arriba)] */
const PANTALLAS = [
  ['1_ventas_venta_abierta', `go('ventas'); try{ vSwitchTab('ventas'); }catch(e){} setTimeout(function(){ var L=[].slice.call(document.querySelectorAll('#vList .vt')), e=L.filter(function(x){ var v=x.__venta; return v&&(v.h==='Home'||v.h==='Pilar')&&v.n; })[0]; if(e)vtToggle(e); },1500); true`, '#vList .vt.abierta .vt-det'],
  ['2_inicio', `go('inicio'); true`, null],
  ['3_ruta_cuadro_de_cobro', `go('ruta'); setTimeout(function(){ try{ switchTab('cobros'); }catch(e){} setTimeout(function(){ try{ abrirCobroPendiente(0); }catch(e){} },2500); },2000); true`, null],
  ['4_ventas_red', `go('ventas'); setTimeout(function(){ try{ vSwitchTab('red'); }catch(e){} },1200); true`, null],
  ['5_crm_leads', `go('estancias'); setTimeout(function(){ try{ estSwitch('leads'); }catch(e){} },1200); true`, null],
  /* Las de uso diario (Organizador, 15/11): arriba (las barras de chips y sub-tabs) y a la mitad del scroll. */
  ['d1_inicio', `go('inicio'); true`, 'MITAD'],
  ['d2_ruta_armado', `go('ruta'); setTimeout(function(){ try{ switchTab('armado'); }catch(e){} },2000); true`, 'MITAD'],
  ['d3_ruta_cobranza', `go('ruta'); setTimeout(function(){ try{ switchTab('cobros'); }catch(e){} },2000); true`, 'MITAD'],
  ['d4_pedidos', `go('pedidos'); true`, 'MITAD'],
  ['d5_mas_pedido', `go('ruta'); setTimeout(function(){ try{ switchTab('nuevo'); }catch(e){} },2000); true`, 'MITAD'],
  ['d6_productos_stock', `go('stock'); setTimeout(function(){ try{ stSwitchTab('productos'); }catch(e){} },1200); true`, 'MITAD'],
  ['d7_caja', `go('caja'); true`, 'MITAD'],
  /* Inicio › Total Maleu: las tres tarjetas (Organizador, 15/11 22:32). */
  ['i1_total_maleu', `go('inicio'); true`, '.card.mt .mt-kpis'],
  ['i2_ganancia', `go('inicio'); true`, '#hResultado'],
  /* El menú lateral abierto (15/11, el orden por unidad de negocio): arriba y al final de la lista. */
  /* El cotizador de catering en Asado (725): Gran Asado, 20 personas, 2 menores. */
  ['c1_cotizador_asado', `go('catering'); (function w(n){ var listo=(typeof _catPidiendo==='undefined'||!_catPidiendo)&&document.querySelector('#catApp .cat-head'); if(!listo&&n<60){ setTimeout(function(){w(n+1);},500); return; } setTimeout(function(){ try{ catCotizar(); var s=document.getElementById('cotServicio'); s.value='asado'; catCotizServicio(); document.getElementById('cotPlan').value='gran'; document.getElementById('cotPersonas').value=20; document.getElementById('cotMenores').value=2; catCotizRecalc(); }catch(e){} },1500); })(0); true`, '#cotResumen'],
  ['m1_menu', `go('inicio'); setTimeout(function(){ try{ sbToggle(); }catch(e){} },1500); true`, 'MENU'],
  ['i3_tarjetas', `go('inicio'); true`, '#hSnap'],
  /* Ruta › + PEDIDO con un empleado con beneficio (724): el nombre cargado. */
  ['p1_mas_pedido_beneficio', `go('ruta'); setTimeout(function(){ try{ switchTab('nuevo'); }catch(e){} setTimeout(function(){ var n=document.getElementById('npNombre'); if(n){ n.value='Santos Bullrich'; n.dispatchEvent(new Event('input',{bubbles:true})); } var t=document.getElementById('npTel'); if(t){ t.value='1123883544'; t.dispatchEvent(new Event('input',{bubbles:true})); } },2500); },2000); true`, '#npBenef'],
  /* Ventas › VENTAS: el período y los filtros (Organizador, 15/11 20:26), cerrada y con los filtros abiertos. */
  ['v1_ventas_cerrada', `go('ventas'); try{ vSwitchTab('ventas'); }catch(e){} true`, null],
  ['v2_ventas_filtros', `go('ventas'); try{ vSwitchTab('ventas'); }catch(e){} setTimeout(function(){ if(typeof vfAbrirFiltros==='function'){ vfAbrirFiltros(); return; } try{ if(document.getElementById('vfPanel').hidden)vfPanelToggle(); }catch(e){} },2500); true`, null],
];
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES_ADMIN, 'utf8'));
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'${process.env.USUARIO || 'tadeo'}',rol:'${process.env.ROL || 'admin'}',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: process.env.USUARIO || 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(); var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))return Promise.resolve(new Response('{"ok":false}',{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`);
  for (const [nom, js, sel] of PANTALLAS) {
    if (SOLO && !SOLO.some((s) => nom.indexOf(s) >= 0)) continue;
    const pg = await ctx.newPage();
    await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.go === 'function' && window.D && Array.isArray(D.pedidos) && D.pedidos.length > 0, null, { timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(3000);
    await pg.evaluate(js);
    await pg.waitForTimeout(Number(process.env.ESPERA || 7000));
    /* Todas las variantes de la letra cargadas (Montserrat se baja por peso, a pedido: sin esto WebKit dibuja con la de
       reserva y la foto sale fina y clara, aunque la pantalla esté bien). */
    await pg.evaluate(() => Promise.all(['400', '500', '600', '700', '800'].map((w) => document.fonts.load(w + ' 16px Montserrat'))).then(() => document.fonts.ready)).catch(() => {});
    /* La foto, recién cuando no queda ninguna animación corriendo (un repintado en curso sale desvaído y engaña). */
    await pg.waitForFunction(() => document.getAnimations().filter((x) => x.playState === 'running').length === 0, null, { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    if (process.env.DIAG) console.log('  opacidad:', await pg.evaluate(() => { const out = []; document.querySelectorAll('body *').forEach((e) => { const o = Number(getComputedStyle(e).opacity); const r = e.getBoundingClientRect(); if (o < 1 && r.width > 200 && r.height > 200) out.push(e.tagName + '#' + e.id + '.' + String(e.className).split(' ').slice(0, 2).join('.') + '=' + o); }); const arriba = [[195, 400], [195, 600], [100, 300]].map(([x, y]) => { const e = document.elementFromPoint(x, y); if (!e) return '-'; const cs = getComputedStyle(e); return e.tagName + '#' + e.id + '.' + String(e.className).split(' ').slice(0, 2).join('.') + ' bg=' + cs.backgroundColor + ' z=' + cs.zIndex + ' pos=' + cs.position; });
      return out.slice(0, 6).join(' | ') + ' · body=' + document.body.className + ' · ARRIBA: ' + arriba.join(' || '); }));
    if (sel === 'MENU') {
      const f0 = path.join(OUT, PREF + '_' + nom + '_arriba.png'); await pg.screenshot({ path: f0 }); console.log(f0);
      await pg.evaluate(() => { const n = document.querySelector('nav.snav'); if (n) n.scrollTop = n.scrollHeight; });
      await pg.waitForTimeout(500);
      const f1 = path.join(OUT, PREF + '_' + nom + '_abajo.png'); await pg.screenshot({ path: f1 }); console.log(f1);
      await pg.close(); continue;
    }
    if (sel === 'MITAD') {
      const f0 = path.join(OUT, PREF + '_' + nom + '_arriba.png'); await pg.screenshot({ path: f0 }); console.log(f0);
      await pg.evaluate(() => window.scrollTo(0, Math.max(0, (document.documentElement.scrollHeight - innerHeight) / 2)));
      await pg.waitForTimeout(600);
      const f1 = path.join(OUT, PREF + '_' + nom + '_mitad.png'); await pg.screenshot({ path: f1 }); console.log(f1);
      await pg.close(); continue;
    }
    if (sel) await pg.evaluate((s) => { const e = document.querySelector(s); if (e) { const r = e.getBoundingClientRect(); window.scrollBy(0, r.top - 120); } }, sel);
    await pg.waitForTimeout(600);
    const f = path.join(OUT, PREF + '_' + nom + '.png');
    await pg.screenshot({ path: f });
    console.log(f);
    await pg.close();
  }
  await br.close();
})();
