/* COBRAR DESDE LA FICHA DEL PEDIDO (17/11/2026). Chrome headless como el ROBOT (~/.maleu/robot.json, modo ensayo: nada a
   Apps Script), con clics de mouse reales.

     BASE_URL=http://localhost:8150/app.html [PEDIDO=Home|2509] [OUT=<carpeta>] [SIN_COBRO=1] node _tools/pruebas/probar_ficha_cobrar.js

   PARTE 1 — SIN ESCRIBIR, sobre un pedido real entregado y sin cobrar (PEDIDO, #2509 de Bautista Panelo):
     · el renglón del producto NO dice «Falta decidir de dónde sale» (está entregado: lo que salió lo dice el Kardex);
     · la botonera trae «Cobrar $X» como acción principal;
     · tocarlo abre EL cuadro de COBRANZA (#cobroRutaOverlay) encima de la ficha: el centro del cuadro es el cuadro
       (hit-test), sin nada marcado en «¿Quién cobró?» ni en la cuenta; «Cancelar» lo cierra y suelta `cob-suelto`.
     Capturas a 390, 375 y 1440 (cajón abierto) en OUT.
   PARTE 2 — ESCRITURA REAL SOLO SOBRE PRUEBA (SIN_COBRO=1 la saltea): alta «PRUEBA Robot» en Pilar por la directa, armado y
     entregado, la ficha → Cobrar → Transferencia → cuenta «prueba» → Confirmar cobro. Mide: la ficha dice «Cobrado» y ya no
     ofrece Cobrar sin recargar, el pedido local quedó Cobrado, la base lo tiene (robot_verificar: cuenta y cobrador), y al
     final lo deshace (descobrar) y borra lo de la corrida (robot_limpiar). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const cdp = require('./cdp.js');
const URL_APP = process.env.BASE_URL || 'http://localhost:8150/app.html';
const PEDIDO = (process.env.PEDIDO || 'Home|2509').split('|');
const OUT = process.env.OUT || os.tmpdir();
const CORRIDA = 'ficha' + Date.now().toString(36), PREFIJO = 'robot-' + CORRIDA + '-';
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let cli, ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const ev = (e, ms) => Promise.race([cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('sin respuesta')), ms || 30000))]);
async function esperar(e, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(e, 10000); if (v) return v; } catch (x) {} await T(250); } return null; }
const rpc = (fn, p) => ev(`(async function(){ var sb=await _sbPermiso(true); if(!sb)return {ok:false,error:'sin permiso'};
  var r=await fetch(sb.url+'/rest/v1/rpc/${fn}',{method:'POST',headers:{apikey:sb.key,Authorization:'Bearer '+sb.token,'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(p || {}))}});
  var t=await r.text(); try{ return Object.assign({http:r.status},JSON.parse(t)); }catch(e){ return {http:r.status,texto:t.slice(0,200)}; } })()`);
const directa = (accion, body) => ev(`(async function(){ var b=${JSON.stringify(body)}; if(!b.ts)b.ts=Date.now();
  try{ var d=await _ordenDirecta(b,null,${JSON.stringify(accion)}); return d?{d:d}:{fueApps:b._noDirecto||'?'}; }catch(e){ return {error:String(e&&e.message||e)}; } })()`);
async function clic(sel) {   /* mouse real sobre el centro VISIBLE del elemento; devuelve qué había en ese punto */
  const b = await ev(`(function(){ var l=[].slice.call(document.querySelectorAll(${JSON.stringify(sel)})).filter(function(x){ var r=x.getBoundingClientRect(); return r.width>0&&r.height>0; });
    var e=l[0]; if(!e)return null; e.scrollIntoView({block:'center'}); var r=e.getBoundingClientRect(); var x=r.left+r.width/2, y=r.top+r.height/2, h=document.elementFromPoint(x,y);
    return {x:x,y:y,mismo:!!h&&(h===e||e.contains(h))}; })()`);
  if (!b) return null;
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
  return b;
}
async function medida(w, h, movil) { await cli.enviar('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: movil ? 2 : 1, mobile: !!movil }); await T(600); }
async function foto(nom) { const r = await cli.enviar('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, nom + '.png'); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); console.log('       ' + f); }
const FICHA = `(function(){ var d=document.getElementById('ordDrawer'); if(!d||!d.classList.contains('open'))return null; var t=d.innerText;
  return { falta:/Falta decidir de d[oó]nde sale/.test(t), salio:(t.match(/Sali[oó] de [^\\n]+/)||[''])[0], pills:[].map.call(d.querySelectorAll('.ofx-pill'),function(x){return x.textContent.trim();}),
    btns:[].map.call(d.querySelectorAll('.ord-btn'),function(x){return x.textContent.trim()+(x.classList.contains('primary')?' [P]':'');}) }; })()`;
const CUADRO = `(function(){ var o=document.getElementById('cobroRutaOverlay'); if(!o)return {existe:false}; var b=o.querySelector('.cobro-ruta-box'), r=b?b.getBoundingClientRect():{width:0,height:0};
  var h=b&&r.width?document.elementFromPoint(r.left+r.width/2,r.top+Math.min(r.height/2,120)):null;
  return { existe:true, visible:!o.classList.contains('hidden')&&r.width>0&&r.height>0, arriba:!!h&&b.contains(h), titulo:(document.getElementById('cobroRutaTitle')||{}).textContent||'',
    sub:(document.getElementById('cobroRutaSub')||{}).textContent||'', suelto:document.documentElement.classList.contains('cob-suelto'),
    quienOn:[].filter.call(document.querySelectorAll('#cobroQuien .on, #cobroQuien [aria-checked="true"]'),function(x){return x.getClientRects().length;}).length,
    ctaOn:[].filter.call(document.querySelectorAll('#cobroRutaFp [data-cta].on, #cobroRutaCta .on'),function(x){return x.getClientRects().length;}).length,
    ctas:[].map.call(document.querySelectorAll('#cobroRutaFp [data-cta]'),function(x){return x.textContent.trim();}) }; })()`;

(async () => {
  const f = path.join(os.homedir(), '.maleu', 'robot.json'); const cred = JSON.parse(fs.readFileSync(f, 'utf8'));
  cli = await cdp.abrir();
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `;try{localStorage.setItem('maleu_ensayo','1');localStorage.setItem('maleu_sb_open','1');}catch(e){}` });
  await cli.enviar('Page.enable', {});
  cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: false }).catch(() => {}); });
  await medida(390, 844, true);
  await cli.enviar('Page.navigate', { url: URL_APP });
  try {
    if (!await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000)) throw new Error('no apareció el login');
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))}; panelDoLogin(); 1`);
    if (!await esperar(`typeof SESSION!=='undefined'&&SESSION&&SESSION.usuario&&window.D&&Array.isArray(D.pedidos)&&D.pedidos.length>50`, 90000)) throw new Error('no entró o no cargó los pedidos');
    await T(2000);

    console.log('\n== PARTE 1: ' + PEDIDO.join(' #') + ', sin escribir ==');
    const p = await ev(`(function(){ var p=D.pedidos.find(function(x){return x.h===${JSON.stringify(PEDIDO[0])}&&String(x.n)===${JSON.stringify(PEDIDO[1])};}); return p?{r:p.r||0,c:p.c,es:p.es,ep:p.ep,o:p.o}:null; })()`);
    chk('el pedido está en la pantalla (' + JSON.stringify(p) + ')', !!p && p.es === 'Entregado' && p.ep !== 'Cobrado', p);
    if (p) {
      await ev(`go('inicio'); openOrdDetail(${JSON.stringify(PEDIDO[0])},${JSON.stringify(PEDIDO[1])},${p.r}); 1`); await T(1500);
      let fi = await ev(FICHA);
      chk('entregado: el renglón NO dice «Falta decidir de dónde sale»' + (fi && fi.salio ? ' (y abajo: «' + fi.salio + '»)' : ''), fi && !fi.falta, fi);
      const bc = fi && fi.btns.find((x) => /^Cobrar \$/.test(x));
      chk('la botonera trae «Cobrar $…» como principal (' + bc + ')', !!bc && /\[P\]$/.test(bc), fi && fi.btns);
      for (const [w, h, m, nom] of [[390, 844, true, 'w390'], [375, 667, true, 'w375'], [1440, 900, false, 'c1440']]) {
        await medida(w, h, m);
        await ev(`openOrdDetail(${JSON.stringify(PEDIDO[0])},${JSON.stringify(PEDIDO[1])},${p.r}); 1`); await T(1200);
        await foto('ficha_cobrar_' + nom);
        const t = await clic('#ordDrawer .ofx-cobrar');
        chk(nom + ': el toque cae sobre el botón Cobrar', !!t && t.mismo, t);
        const c = await esperar(`(function(){ var c=${CUADRO}; return c.visible?c:null; })()`, 15000);
        chk(nom + ': abre el cuadro de COBRANZA encima de la ficha (' + (c && c.titulo) + ' · ' + (c && c.sub) + ')', !!c && c.arriba && c.suelto && /#?2509|Panelo/.test(c.titulo + c.sub), c || await ev(CUADRO));
        chk(nom + ': nada marcado en «¿Quién cobró?» ni en la cuenta', !!c && c.quienOn === 0 && c.ctaOn === 0, c);
        await foto('ficha_cuadro_' + nom);
        await clic('#cobroRutaOverlay .cobro-ruta-btn-no'); await T(600);
        const c2 = await ev(CUADRO);
        chk(nom + ': Cancelar lo cierra y suelta cob-suelto', !c2.visible && !c2.suelto, c2);
      }
      await medida(390, 844, true);
    }

    if (process.env.SIN_COBRO) { console.log('\n(SIN_COBRO: parte 2 salteada)'); return; }
    console.log('\n== PARTE 2: cobro real sobre PRUEBA (corrida ' + CORRIDA + ') ==');
    const E = await rpc('robot_entidades_pantalla', {});
    if (!E || !E.ok || (E.faltan || []).length) throw new Error('sin las entidades PRUEBA: ' + JSON.stringify(E).slice(0, 200));
    const CLI = E.cliente || 'PRUEBA Robot', TEL = String(E.telefono || '5490000000001'), CTA = E.cuenta || 'prueba';
    const prod = await ev(`(function(){ var p=(D.stock||[]).find(function(x){return String(x.a||'').trim()===${JSON.stringify(E.producto || 'PRUEBA')};}); return p?{precio:Number(p.p)||1}:null; })()`);
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
    const al = await directa('altaPedido', { canal: 'Pilar', fecha: new Date().toLocaleString('es-AR'), fechaEntrega: hoy, dia: '', horario: '', nombre: CLI, telefono: TEL,
      pago: 'Transferencia', envio: 0, items: [{ id: E.producto_id, qty: 1 }], repartidor: '', total: (prod && prod.precio) || 1, subtotalSinDescuento: (prod && prod.precio) || 1,
      descuento: 0, descuentoManual: 0, descuentoGlobalPct: 0, descuentoReceta: null, propina: 0, tipoPedido: '', deposito: E.deposito || 'prueba',
      barrio: 'PRUEBA', direccion: 'PRUEBA', lote: '', origen: 'Pendiente', estadoEntrega: 'Pendiente', estadoPago: 'No Cobrado', clientOrderId: PREFIJO + 'alta' });
    if (!(al && al.d && al.d.ok)) throw new Error('alta PRUEBA: ' + JSON.stringify(al).slice(0, 200));
    const n = String(al.d.n || al.d.ref);
    await ev(`_recargarPedidos(); 1`).catch(() => 0);
    let P = await esperar(`(function(){ var p=(D.pedidos||[]).find(function(x){return String(x.n)===${JSON.stringify(n)}&&String(x.c||'').indexOf('PRUEBA Robot')>=0;}); return p?{h:p.h,n:p.n,r:p.r||0}:null; })()`, 15000);
    if (!P) throw new Error('el alta ' + n + ' no apareció');
    const base = { hoja: P.h, id: String(P.n), row: P.r };
    await directa('marcarArmado', { action: 'marcarArmado', pedidos: [{ h: P.h, id: String(P.n), r: P.r, c: CLI }], armado: true, usuario: 'robot', clientOpId: PREFIJO + 'armar' });
    const en = await directa('marcarEntregado', Object.assign({ action: 'marcarEntregado', cobrado: false, propina: 0, repartidor: '', clientOpId: PREFIJO + 'entregar' }, base));
    if (!(en && en.d && en.d.ok)) throw new Error('entregar: ' + JSON.stringify(en).slice(0, 200));
    await ev(`_recargarPedidos(); 1`).catch(() => 0);
    await esperar(`(function(){ var p=(D.pedidos||[]).find(function(x){return x.h===${JSON.stringify(P.h)}&&String(x.n)===${JSON.stringify(n)};}); return p&&p.es==='Entregado'; })()`, 15000);
    let cobrado = false;
    try {
      await ev(`go('inicio'); openOrdDetail(${JSON.stringify(P.h)},${JSON.stringify(n)},${P.r}); 1`); await T(1200);
      const t = await clic('#ordDrawer .ofx-cobrar');
      chk('PRUEBA ' + P.h + ' #' + n + ': hay botón Cobrar y el toque cae ahí', !!t && t.mismo, t);
      const c = await esperar(`(function(){ var c=${CUADRO}; return c.visible?c:null; })()`, 15000);
      chk('se abre el cuadro de cobro', !!c, await ev(CUADRO));
      /* Las cuentas digitales son botones de «¿Cómo te pagó?» (#cobroRutaFp, `_setCobroFpCta`). La del robot no viene en la
         lista que ve (`RUT_CTAS`): se suma ahí para que el cobro PRUEBA no toque Mercado Pago ni Brubank, y se toca con el mouse. */
      /* Por `_ctasDe` (de Ruta): `RUT_CTAS` en window es una COPIA de la global de la sub-app; pisarla no llega. */
      await ev(`(function(){ var l=[]; try{ l=JSON.parse(localStorage.getItem('maleu_ruta_ctas')||'[]'); }catch(e){}
        if(!l.some(function(c){return c.id===${JSON.stringify(CTA)};}))l.push({id:${JSON.stringify(CTA)},nombre:'PRUEBA',tipo:'digital'}); _ctasDe({cuentas:l}); _pintarCobroCtas(); return 1; })()`);
      const cta = await clic('#cobroRutaFp [data-cta="' + CTA + '"]');
      await T(300);
      chk('elegida la cuenta PRUEBA con el mouse', !!cta && cta.mismo && !!(await ev(`!!document.querySelector('#cobroRutaFp [data-cta="${CTA}"].on')`)), cta);
      await foto('ficha_prueba_cuadro_w390');
      const antes = Date.now();
      await clic('#btnCobroRutaOk'); await T(400);
      const err = await ev(`(document.getElementById('cobroRutaErr')||{}).textContent||''`);
      const fi = await esperar(`(function(){ var f=${FICHA}; return f&&f.pills.some(function(x){return /^Cobrado/.test(x);})?f:null; })()`, 5000);
      const ms = Date.now() - antes;
      chk('la ficha dice «Cobrado» sin recargar (' + ms + ' ms)' + (err ? ' · error del cuadro: ' + err : ''), !!fi && ms < 3000, fi || await ev(FICHA));
      chk('…y ya no ofrece Cobrar', !!fi && !fi.btns.some((x) => /^Cobrar \$/.test(x)), fi);
      chk('el cuadro se cerró y soltó cob-suelto', !(await ev(CUADRO)).visible && !(await ev(CUADRO)).suelto);
      await foto('ficha_prueba_cobrada_w390');
      let vp = null; for (let k = 0; k < 10; k++) { const v = await rpc('robot_verificar', { p: { pedido: P.h + '|' + n } }).catch(() => null); vp = v && v.pedido; if (vp && vp.cobrador && vp.cuenta) break; await T(1500); }
      cobrado = !!(vp && vp.cobrador);
      chk('la base lo tiene cobrado (' + JSON.stringify(vp) + ')', !!vp && !!vp.cuenta && !!vp.cobrador && Number(vp.transferencia) > 0, vp);
    } finally {
      const d = await directa('descobrar', Object.assign({ action: 'descobrar', motivo: 'prueba de cobrar desde la ficha', clientOpId: PREFIJO + 'descobrar' }, base)).catch((e) => ({ error: e.message }));
      console.log('       deshacer el cobro: ' + JSON.stringify(d && (d.d || d)).slice(0, 120) + (cobrado ? '' : ' (no hacía falta)'));
      const li = await rpc('robot_limpiar', { p_corrida: CORRIDA }).catch((e) => ({ error: e.message }));
      console.log('       robot_limpiar: ' + JSON.stringify(li).slice(0, 200));
    }
  } catch (e) { mal++; console.log('  MAL  reventó: ' + e.message); }
  finally {
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    try { cli.matar(); } catch (e) {}
    process.exit(mal ? 1 : 0);
  }
})();
