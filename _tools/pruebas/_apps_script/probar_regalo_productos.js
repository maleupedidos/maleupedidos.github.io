/* AUTOPEDIDO: PRODUCTOS DE REGALO (24/10/2026).
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_regalo_productos.js [390|1440]
 *
 * Lo que tiene que ser cierto:
 *   · regalar N unidades de un producto del carrito las descuenta a su precio,
 *     sin pasarse de lo cargado; el % al pedido va solo sobre lo que se paga;
 *   · el cuadro «Regalar productos» aparece con el carrito y entra en la pantalla;
 *   · el resumen de WhatsApp dice qué se regala;
 *   · al guardar viajan los productos enteros (salen del freezer), el descuento
 *     autoritativo con el regalo adentro y la receta con `rg`;
 *   · la cuenta del backend (_calcDescuentoReceta) da el mismo descuento.
 * Todo el backend va stubbeado. No toca produccion ni necesita token.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); } return false; };

/* La cuenta del backend, sacada de Code.js tal cual. */
const CODE = path.join(__dirname, '..', '..', '..', 'estancias', '.clasp-src', 'Code.js');
function backendCalc() {
  const src = fs.readFileSync(CODE, 'utf8');
  const de = (ini) => { const a = src.indexOf(ini); const b = src.indexOf('\n}\n', a) + 3; return src.slice(a, b); };
  const m = src.indexOf('var DESC_CAT_OF_ABBR = {'); const m2 = src.indexOf('};', m) + 2;
  return new Function(src.slice(m, m2) + '\n' + de('function _calcDescuentoReceta(') + '\n' + de('function _recetaActiva(') + '; return {calc:_calcDescuentoReceta, activa:_recetaActiva};')();
}

const EXTRA = `
(function(){
  window.__posts=[];
  try{
    localStorage.clear();
    localStorage.setItem('maleu_token','x');
    localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
    localStorage.setItem('maleu_tab','inicio');
    localStorage.setItem('maleu_ruta_purge_v58','1');
  }catch(e){}
  window.confirm=function(){return true;};
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    if(x&&String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      return Promise.resolve(new Response(JSON.stringify({ok:true,orderNum:'9999',n:'9999'}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    var c={ok:true,ts:Date.now(),pedidos:[],lista:[],datos:[],items:[],v:[],cobros:[],caja:{cuentas:[]},movimientos:[],oc:{lista:[]}};
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}})); },60); });
  };
})();
`;

(async () => {
  const be = backendCalc();
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== AUTOPEDIDO: productos de regalo · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(1500);
    await evaluar(cli, `try{ go('ruta'); }catch(e){} 1`);
    if (!await esperar(cli, `typeof window.npRegaloQty==='function' && typeof window.switchTab==='function'`, 30000)) { chk('Ruta arranco con la funcion nueva', false); salir(1); }
    await pausa(1200);
    await evaluar(cli, `switchTab('nuevo'); npSetZona('Home'); 1`);
    await pausa(800);

    /* Franui (F) y un pack de pizzas: los ids salen del catalogo. */
    const ids = await evaluar(cli, `(function(){var r={};NP_CAT_FLAT.forEach(function(p){if(p.abbr==='F')r.F=p.id;if(p.abbr==='PPJyQ')r.P=p.id;});
      r.pF=NP_PRECIOS.F.p; r.pP=NP_PRECIOS.PPJyQ.p; return r;})()`);
    chk('el catalogo tiene Franui y Pack J&Q con precio', !!(ids && ids.F && ids.P && ids.pF > 0 && ids.pP > 0), ids);

    console.log('\n-- regalar --');
    chk('sin carrito no hay cuadro de regalo', await evaluar(cli, `document.getElementById('npRegaloProd').style.display==='none'`));
    await evaluar(cli, `npQty(${ids.F},2); npQty(${ids.P},3); 1`);
    chk('con carrito aparece el cuadro', await evaluar(cli, `document.getElementById('npRegaloProd').style.display!=='none' && /Regalar productos/.test(document.getElementById('npRegaloProd').textContent)`));
    await evaluar(cli, `npRegaloQty(${ids.F},1); npRegaloQty(${ids.F},1); npRegaloQty(${ids.F},1); 1`);
    let info = await evaluar(cli, `JSON.parse(JSON.stringify(npDiscountInfo()))`);
    const sub = 2 * ids.pF + 3 * ids.pP;
    chk('no se puede regalar más de lo cargado (3 toques, quedan 2)', info.rg && info.rg.F === 2, info.rg);
    chk('el regalo vale 2 Franui a precio de lista', info.regProd === 2 * ids.pF, info);
    chk('el total es el subtotal menos el regalo', info.sub === sub && info.total === sub - 2 * ids.pF, info);
    chk('cuenta como descuento autoritativo', info.authoritative === true);
    const tot = await evaluar(cli, `document.getElementById('npTotalValue').textContent+' | '+document.getElementById('npTotalLabel').textContent`);
    chk('el total de la pantalla lo muestra', tot.indexOf((sub - 2 * ids.pF).toLocaleString('es-AR')) >= 0 && /productos de regalo/.test(tot), tot);

    console.log('\n-- con un % al pedido --');
    await evaluar(cli, `document.getElementById('npGlobalPct').value='10'; npSetGlobalPct(); 1`);
    info = await evaluar(cli, `JSON.parse(JSON.stringify(npDiscountInfo()))`);
    const g = Math.round((sub - 2 * ids.pF) * 0.10);
    chk('el 10% va solo sobre lo que se paga', info.globalDiscP === g && info.total === sub - 2 * ids.pF - g, info);

    console.log('\n-- WhatsApp --');
    const wa = await evaluar(cli, `npResumenTextoWA()`);
    chk('el resumen dice qué se regala', /Regalo 🎁 2× /.test(wa) && /de regalo 🎁/.test(wa), wa);

    console.log('\n-- bajar del carrito --');
    await evaluar(cli, `npQty(${ids.F},-1); 1`);
    info = await evaluar(cli, `JSON.parse(JSON.stringify(npDiscountInfo()))`);
    chk('si saco un Franui, el regalo baja a 1', info.rg && info.rg.F === 1 && info.regProd === ids.pF, info);
    await evaluar(cli, `npQty(${ids.F},1); npRegaloQty(${ids.F},1); 1`);

    const caja = await evaluar(cli, `(function(){var b=document.getElementById('npRegaloProd').getBoundingClientRect();return {l:b.left,r:b.right,w:window.innerWidth,sw:document.documentElement.scrollWidth};})()`);
    chk('el cuadro entra en la pantalla', caja.l >= 0 && caja.r <= caja.w && caja.sw <= caja.w, caja);
    if (process.env.SHOT) {   /* SHOT=archivo.png: captura del cuadro para mirarlo */
      await evaluar(cli, `document.getElementById('npRegaloProd').scrollIntoView({block:'start'}); window.scrollBy(0,-60); 1`);
      await pausa(400);
      const s = await cli.enviar('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(process.env.SHOT, Buffer.from(s.data, 'base64'));
    }

    console.log('\n-- guardar --');
    /* El confirm lo contesta servir.js (false por defecto): se prende con la pagina cargada. */
    await evaluar(cli, `window.__posts=[]; window.__confirmDevuelve=true; window.__confirms=[];
      var s=function(id,v){var e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input'));}};
      s('npNombre','PRUEBA regalo'); s('npLote','999'); s('npTel','1100000000');
      var _m=new Date(Date.now()+86400000); npSetFecha(npIsoDe(_m));
      window.__toasts=[]; var _st=window.showToast; window.showToast=function(t){window.__toasts.push(t);};
      try{ npGuardar(); }catch(e){ window.__errGuardar=String(e); } 1`);
    await esperar(cli, `window.__posts.some(function(p){return p&&p.canal==='Home'})`, 15000);
    const post = await evaluar(cli, `window.__posts.filter(function(p){return p&&p.canal==='Home'})[0]||{err:window.__errGuardar||null,toasts:window.__toasts,posts:window.__posts.map(function(p){return p&&p.action;})}`);
    const its = (post.items || []).reduce((m, x) => { m[x.id] = x.qty; return m; }, {});
    chk('viajan los productos enteros (2 Franui, 3 packs)', its[ids.F] === 2 && its[ids.P] === 3, post.items || post);
    chk('la receta lleva los regalos', !!(post.descuentoReceta && post.descuentoReceta.rg && post.descuentoReceta.rg.F === 2), post.descuentoReceta);
    chk('el descuento es autoritativo y trae el regalo', post.descuentoManualEsAutoridad === true && post.descuento === 2 * ids.pF + g, { d: post.descuento, a: post.descuentoManualEsAutoridad });
    chk('el total que viaja cuadra', post.total === sub - 2 * ids.pF - g, post.total);

    console.log('\n-- la misma cuenta en el backend --');
    const lineas = [{ abbr: 'F', qty: 2, precio: ids.pF }, { abbr: 'PPJyQ', qty: 3, precio: ids.pP }];
    chk('la receta queda activa', be.activa(post.descuentoReceta) === true);
    const dB = be.calc(post.descuentoReceta, lineas, 'Efectivo', false);
    chk('_calcDescuentoReceta da el mismo descuento que el AUTOPEDIDO', dB === post.descuento + (post.descuentoManual || 0), { backend: dB, front: post.descuento });
    chk('una receta sin rg sigue dando lo de siempre', be.calc({ g: 10, c: {}, r: 0, auto10: false }, lineas, 'Efectivo', false) === Math.round(sub * 0.10));

    chk('sin errores de JS', !errores.length, errores.slice(0, 3));
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
