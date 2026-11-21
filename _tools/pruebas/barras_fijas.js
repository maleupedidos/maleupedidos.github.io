/* LAS BARRAS FIJAS DE ABAJO, PEGADAS AL BORDE DE VERDAD (21/11/2026). WebKit 390×844 (el iPhone de Tadeo).
 *
 *   PW=<playwright-core> SES=<sesion.json> BASE=http://localhost:8155/app.html [OUT=<carpeta>] [PREFIJO=nuevo] [SOLO=ruta,ficha]
 *     node _tools/pruebas/barras_fijas.js
 *
 * Tadeo, 17:54: «al scrollear hacia abajo, la barra fija de COBRAR + Entregado queda pegada en la MITAD de la pantalla,
 * abajo una franja beige vacía y el contenido pasa por debajo». Lo mismo en la ficha del pedido.
 * Para cada barra: se scrollea su contenedor a 0, 25, 50, 75 y 100% (pasos chicos, como el dedo) y en cada punto
 *   · el borde de abajo de la barra coincide con el de abajo visible (visualViewport.height, ±2 px; en el emulador el
 *     área segura es 0);
 *   · debajo de la barra no se ve nada (elementFromPoint 3 px más abajo, si queda lugar, no puede ser contenido).
 * Saca una captura a la mitad (50%). Sesión real en SOLO LECTURA: toda escritura se corta.
 */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || '.', PREF = process.env.PREFIJO || 'barra';
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
/* [nombre, js que abre la pantalla (devuelve true cuando la barra existe), selector de la barra, selector del que scrollea (null = la página)] */
const BARRAS = [
  ['ruta_tarjeta', `(function(){ if(!window.__a){ window.__a=1; go('ruta'); setTimeout(function(){ try{ switchTab('ruta'); }catch(e){} try{ rutQuien('todas'); }catch(e){} },2500); }
      var b=document.getElementById('rutaActions');
      /* Sin bolsas armadas Ruta no dibuja la tarjeta (y armar es escribir). La barra se ubica por el CSS y sus contenedores, no
         por los datos: se llena la tarjeta con un cuerpo largo y la barra «COBRAR + Entregado», como la de Elena. */
      var bd=document.getElementById('rutaBody');
      if(b&&!b.children.length&&bd&&/Falta armar|Ir a ARMADO|No hay/.test(bd.innerText||'')&&window.__a<3){ window.__a=9;
        bd.innerHTML=Array.from({length:40},function(_,i){return '<div style="padding:14px 16px;border-bottom:1px solid #eee">Renglón '+(i+1)+' de la tarjeta (Cobro, Contacto…)</div>';}).join('');
        b.innerHTML='<div class="rtc-bar"><button class="rtc-cta" style="background:#E65100">COBRAR $72.000</button><button class="rtc-cta" style="background:#2E7D32">Entregado</button></div>'; }
      return !!(b&&b.children.length&&b.getBoundingClientRect().height>0); })()`, '#rutaActions', null],
  ['ficha_pedido', `(function(){ if(!window.__a){ window.__a=1; go('pedidos'); var p=(D.pedidos||[]).filter(function(x){return (x.h==='Home'||x.h==='Pilar')&&x.es!=='Cancelado'&&x.ep!=='Cobrado'&&Number(x.$)>0;})[0]||(D.pedidos||[])[0];
      setTimeout(function(){ openOrdDetail(p.h,String(p.n),Number(p.r)||0); },1200); }
      var b=document.querySelector('#ordDrawer.open .ord-actions')||document.querySelector('.ord-drawer.open .ord-actions'); return !!(b&&b.offsetParent); })()`, '.ord-drawer.open .ord-actions', '.ord-drawer.open .ord-body'],
  ['mas_pedido', `(function(){ if(!window.__a){ window.__a=1; go('ruta'); setTimeout(function(){ try{ switchTab('nuevo'); }catch(e){} },2500); }
      var b=document.querySelector('.np-footer'); return !!(b&&b.getBoundingClientRect().height>0); })()`, '.np-footer', null],
  ['miportal_tabs', `(function(){ if(!window.__a){ window.__a=1; go('miportal'); }
      var b=document.querySelector('#pg-miportal .main-tabs'); return !!(b&&b.getBoundingClientRect().height>0); })()`, '#pg-miportal .main-tabs', null],
];
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const br = await pw.webkit.launch();
  let mal = 0, ok = 0;
  const res = [];
  for (const [nom, abrir, selB, selS] of BARRAS) {
    if (SOLO && !SOLO.some((s) => nom.indexOf(s) >= 0)) continue;
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await ctx.addInitScript(`try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
      localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
      window.confirm=function(){return false;}; window.alert=function(){};
      (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
        if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^tienda_cuentas$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))
          return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
        return f.apply(this,arguments);};})();`);
    const pg = await ctx.newPage();
    await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => typeof window.go === 'function' && window.D && Array.isArray(D.pedidos) && D.pedidos.length > 1000, null, { timeout: 150000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    const hay = await pg.waitForFunction(abrir, null, { timeout: 40000, polling: 500 }).then(() => true).catch(() => false);
    if (!hay && process.env.DIAG) console.log('  [diag] ' + await pg.evaluate(() => { const g = (id) => { const e = document.getElementById(id); return e ? (e.innerText || '').replace(/\s+/g, ' ').slice(0, 220) : '(no está)'; };
      return 'tab=' + (typeof cur !== 'undefined' ? cur : '?') + ' · resumen: ' + g('rutaResumen') + ' · header: ' + g('rutaHeader') + ' · body: ' + g('rutaBody'); }));
    if (!hay) { console.log('  --   ' + nom + ': la barra no apareció (sin datos para abrirla)'); res.push([nom, selB, 'sin datos']); await ctx.close(); continue; }
    await pg.waitForTimeout(1200);
    const puntos = [];
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      /* Pasos chicos hasta el punto (el dedo), no un salto. */
      await pg.evaluate(async ([selS, f]) => {
        /* El que de verdad scrollea: el indicado, o la página si se mueve, o el contenedor con más recorrido. */
        let sc = selS ? document.querySelector(selS) : null;
        if (!sc) { const d = document.scrollingElement || document.documentElement;
          if (d.scrollHeight > d.clientHeight + 10) sc = d;
          else { let best = null, bh = 0; document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (/auto|scroll/.test(cs.overflowY) && e.scrollHeight - e.clientHeight > bh && e.getBoundingClientRect().height > 200) { best = e; bh = e.scrollHeight - e.clientHeight; } }); sc = best || d; } }
        window.__sc = sc;
        const top = Math.round((sc.scrollHeight - sc.clientHeight) * f);
        for (let i = 0; i < 12; i++) { const cur = sc.scrollTop; if (Math.abs(cur - top) < 2) break; sc.scrollTop = cur + (top - cur) / 2; await new Promise((r) => setTimeout(r, 40)); }
        sc.scrollTop = top; window.dispatchEvent(new Event('scroll'));
      }, [selS, f]);
      await pg.waitForTimeout(350);
      const m = await pg.evaluate((selB) => {
        const b = document.querySelector(selB); if (!b) return { falta: true };
        const r = b.getBoundingClientRect(), vh = (window.visualViewport ? visualViewport.height : innerHeight);
        let debajo = '';
        if (r.bottom < vh - 4) { const t = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(Math.min(vh - 2, r.bottom + 3))); debajo = t ? (t.id ? '#' + t.id : '') + '.' + String(t.className || t.tagName).split(' ')[0] : '(nada)'; }
        /* Un ancestro con transform/filter/backdrop-filter/contain/will-change ancla un position:fixed a ÉL y no a la
           pantalla: en el iPhone, con el contenido corriéndose, eso deja la barra a media pantalla. */
        const anc = []; for (let x = b.parentElement; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x);
          if ((cs.transform && cs.transform !== 'none') || (cs.filter && cs.filter !== 'none') || ((cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none') || /paint|layout|strict|content/.test(cs.contain || '') || /transform|filter/.test(cs.willChange || '')) anc.push((x.id ? '#' + x.id : x.tagName.toLowerCase()) + '.' + String(x.className || '').split(' ')[0]); }
        const sc = window.__sc;
        return { bottom: Math.round(r.bottom), top: Math.round(r.top), vh: Math.round(vh), debajo, st: sc ? Math.round(sc.scrollTop) : -1, sh: sc ? sc.scrollHeight - sc.clientHeight : -1, sc: sc ? (sc.id || sc.className || sc.tagName) : '', anc: anc.join(',') };
      }, selB);
      puntos.push([f, m]);
      if (f === 0.5) {
        await pg.evaluate(() => Promise.all(['400', '600', '700', '800'].map((w) => document.fonts.load(w + ' 16px Montserrat'))).then(() => document.fonts.ready)).catch(() => {});
        const fo = path.join(OUT, PREF + '_' + nom + '_50.png'); await pg.screenshot({ path: fo }); console.log('  captura ' + fo);
      }
    }
    const malos = puntos.filter(([, m]) => m.falta || Math.abs(m.bottom - m.vh) > 2);
    const linea = puntos.map(([f, m]) => (f * 100) + '%: abajo ' + m.bottom + '/' + m.vh + ' scroll ' + m.st + '/' + m.sh + (m.debajo ? ' (debajo: ' + m.debajo + ')' : '')).join(' · ') + (puntos[0][1].anc ? '\n         ancla: ' + puntos[0][1].anc : '') + ' · scroller ' + puntos[0][1].sc;
    if (malos.length) { mal++; console.log('  MAL  ' + nom + ' (' + selB + ')\n         ' + linea); res.push([nom, selB, 'rojo']); }
    else { ok++; console.log('  ok   ' + nom + ' (' + selB + ')\n         ' + linea); res.push([nom, selB, 'verde']); }
    await ctx.close();
  }
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
