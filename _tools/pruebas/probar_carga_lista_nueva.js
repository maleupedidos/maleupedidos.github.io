/* Stock › CARGA con la LISTA NUEVA de un proveedor (28/10/2026).
     node _tools/pruebas/probar_carga_lista_nueva.js <token>    BASE_URL=http://localhost:PUERTO/app.html
   Claudia pasó las tartas de $7.000 a $8.000: Productos J (el costo de hoy, con el que está valuado el freezer)
   sigue en $7.000 y Proveedores H (la lista) dice $8.000. Sesión real, NADA se guarda (sesion_prep intercepta los
   POST). Sostiene:
   · sin tocar nada, la tarta no manda precio (no se mueve un costo por mirar);
   · con «Llegó 1», la factura arranca en la lista ($8.000), marcada, y la carga la manda (`_stgFila().precio`);
   · lo que no tiene lista distinta (un Wrap) no manda precio aunque llegue;
   · tipear otro precio gana sobre la lista;
   · el campo dice «lista $8.000». */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN] = process.argv.slice(2);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 600))); };
(async () => {
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: URL });
    const esperar = async (expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await cdp.evaluar(cli, expr)) return true; } catch (e) {} await pausa(400); } return false; };
    if (!await esperar("typeof go==='function' && typeof stSwitchTab==='function'")) throw new Error('el ERP no arrancó');
    await pausa(1500);
    await cdp.evaluar(cli, "go('stock')"); await pausa(1200);
    await cdp.evaluar(cli, "stSwitchTab('carga')");
    if (!await esperar("typeof CG_DATA!=='undefined' && CG_DATA && _stgProvs().length>0", 90000)) throw new Error('la carga no trajo proveedores');
    const prov = await cdp.evaluar(cli, "(function(){var p=_stgProvs().filter(function(x){return /claudia polito/i.test(x.nombre);})[0];return p?p.nombre:null;})()");
    chk('está Claudia Polito en la carga', !!prov, prov);
    await cdp.evaluar(cli, 'stgProvElegir(' + JSON.stringify(prov) + ')'); await pausa(800);
    const L = (a) => cdp.evaluar(cli, '(function(){var p=_stgNom(' + JSON.stringify(a) + ');if(!p)return null;var f=_stgFila(p);'
      + 'var i=document.querySelector("#stgR_' + a + ' .stg-c-pre .stg-in"), l=document.querySelector("#stgR_' + a + ' .stg-lista");'
      + 'return {c:p.c,cp:p.cp,fila:f,marcada:!!(i&&i.classList.contains("stg-cambio")),ph:i&&i.placeholder,lista:l&&l.textContent};})()');
    const conPre = await cdp.evaluar(cli, '_stgConPrecio()');
    chk('la carga tiene el precio de factura (CARGA_PRECIO_FACTURA)', conPre === true, conPre);
    let t = await L('TP');
    chk('la tarta: costo de hoy $7.000 y lista $8.000', t && t.c === 7000 && t.cp === 8000, t);
    chk('sin tocar nada no manda precio', t && t.fila === null, t);
    chk('el campo dice «lista $8.000» y propone $8.000', t && /8\.000/.test(t.lista || '') && /8\.000/.test(t.ph || ''), t);
    await cdp.evaluar(cli, "(function(){var i=document.querySelector('#stgR_TP .stg-c:not(.stg-c-pre) .stg-in');i.value='1';i.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()"); await pausa(300);
    t = await L('TP');
    chk('con «Llegó 1» la factura va a la lista ($8.000) y queda marcada', t && t.fila && t.fila.precio === 8000 && t.marcada, t);
    await cdp.evaluar(cli, "(function(){var i=document.querySelector('#stgR_TP .stg-c-pre .stg-in');i.value='7500';i.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()"); await pausa(300);
    t = await L('TP');
    chk('tipear otro precio gana sobre la lista', t && t.fila && t.fila.precio === 7500, t);
    const w = await cdp.evaluar(cli, "(function(){var x=_stgProv().productos.filter(function(p){return Math.round(p.cp)===Math.round(p.c)&&p.u!=='kg';})[0];return x?x.a:null;})()");
    if (w) {
      await cdp.evaluar(cli, `(function(){var i=document.querySelector('#stgR_${w} .stg-c:not(.stg-c-pre) .stg-in');i.value='1';i.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()`); await pausa(300);
      const ww = await L(w);
      chk('lo que no tiene lista distinta (' + w + ') llega sin mandar precio', ww && ww.fila && ww.fila.precio === undefined && !ww.marcada && !ww.lista, ww);
    } else chk('hay un producto de Claudia sin lista distinta para comparar', false, w);
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL se cortó: ' + (e.stack || e)); }
  console.log(`\n${ok} ok · ${mal} MAL`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
