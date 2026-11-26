/* La ficha del cliente desde cualquier pantalla (28/10/2026).
     node _tools/pruebas/probar_ficha_desde_pantallas.js <token> [nombre]    BASE_URL=http://localhost:PUERTO/app.html
   Sesión real (sesion_prep intercepta los POST: no se escribe nada). Con un cliente que tenga ventas (por defecto
   «achaval»). Sostiene:
   · Ventas: tocar el nombre abre SU ficha del CRM (el cajón, con su nombre) y NO abre el detalle de la venta;
   · Pedidos: el nombre sigue abriendo el pedido y el 👤 abre la ficha del cliente;
   · Caja: el nombre de un cobro abre la ficha y el «#N» el pedido;
   · la ficha se busca por TELÉFONO (la clave del cajón es el teléfono normalizado);
   · a 390 px, el 👤 se puede tocar (≥ 32 px) y no se sale de la tarjeta. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN, NOM] = process.argv.slice(2);
const QUIEN = (NOM || 'achaval').toLowerCase();
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 600))); };
(async () => {
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 860, deviceScaleFactor: 1, mobile: true });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) });
    await cli.enviar('Page.navigate', { url: URL });
    const ev = (e) => cdp.evaluar(cli, e);
    const esperar = async (e, ms = 90000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch (x) {} await pausa(500); } return false; };
    if (!await esperar("typeof go==='function' && typeof window.verFichaCliente==='function'")) throw new Error('el ERP no arrancó');
    await esperar("window.D && D.pedidos && D.pedidos.length>50", 90000); await pausa(2000);
    const cajon = () => ev("(function(){var d=document.getElementById('crmDrawer');return {on:d&&d.classList.contains('on'),t:(document.getElementById('crmDrawerTitle')||{}).textContent||'',pid:window.__fichaArg||null};})()");
    await ev("(function(){var o=window.crmOpenCliente;window.crmOpenCliente=function(k){window.__fichaArg=decodeURIComponent(k);return o.apply(this,arguments);};return 1;})()");
    const cerrar = () => ev("(function(){try{crmCloseDrawer()}catch(e){};try{closeOrdDetail()}catch(e){};return 1;})()");
    /* Ventas */
    await ev("go('ventas')");
    if (!await esperar(`[].slice.call(document.querySelectorAll('.vt-cli-ficha')).some(function(x){return /${QUIEN}/i.test(x.textContent);})`, 60000)) throw new Error('Ventas no pintó al cliente');
    const vt = await ev(`(function(){var x=[].slice.call(document.querySelectorAll('.vt-cli-ficha')).filter(function(x){return /${QUIEN}/i.test(x.textContent);})[0];var p=(D.pedidos||[]).filter(function(q){return q.h===x.getAttribute('data-h')&&String(q.n)===x.getAttribute('data-n');})[0];
      x.click();return {h:x.getAttribute('data-h'),n:x.getAttribute('data-n'),tel:p&&(p.tel||p.t),abierta:!!x.closest('.vt.abierta')};})()`);
    await pausa(1500);
    let c = await cajon();
    chk('Ventas: tocar el nombre abre el cajón con SU ficha', c.on && new RegExp(QUIEN, 'i').test(c.t), c);
    chk('   buscada por teléfono (la clave es el teléfono normalizado)', !!vt.tel && c.pid === (await ev(`window._fichaClave(${JSON.stringify(vt.tel)})`)), { vt, pid: c.pid });
    chk('   y no abre el detalle de la venta', vt.abierta === false && !(await ev("!!document.querySelector('.vt.abierta')")), vt);
    await cerrar();
    /* Pedidos */
    await ev("go('pedidos')"); await pausa(3000);
    await ev(`(function(){var s=document.getElementById('pedSearch')||document.querySelector('#p-pedidos input[type=search],#p-pedidos input[type=text]');if(s){s.value=${JSON.stringify(QUIEN)};s.dispatchEvent(new Event('input',{bubbles:true}));}return 1;})()`);
    await esperar(`[].slice.call(document.querySelectorAll('.pc .pc-c')).some(function(x){return /${QUIEN}/i.test(x.textContent);})`, 30000); await pausa(800);
    const pc = await ev(`(function(){var c=[].slice.call(document.querySelectorAll('.pc .pc-c')).filter(function(x){return /${QUIEN}/i.test(x.textContent)&&x.querySelector('.cli-ficha-btn');})[0];if(!c)return null;var b=c.querySelector('.cli-ficha-btn'),r=b.getBoundingClientRect(),k=c.closest('.pc').getBoundingClientRect();
      return {w:Math.round(r.width),h:Math.round(r.height),dentro:r.right<=k.right+1&&r.left>=k.left-1};})()`);
    chk('Pedidos: el 👤 está y se puede tocar (≥ 32 px, dentro de la tarjeta)', pc && pc.w >= 32 && pc.h >= 32 && pc.dentro, pc);
    await ev(`(function(){var c=[].slice.call(document.querySelectorAll('.pc .pc-c')).filter(function(x){return /${QUIEN}/i.test(x.textContent)&&x.querySelector('.cli-ficha-btn');})[0];c.querySelector('.cli-ficha-btn').click();return 1;})()`);
    await pausa(1500); c = await cajon();
    chk('   el 👤 abre su ficha', c.on && new RegExp(QUIEN, 'i').test(c.t), c);
    await cerrar(); await pausa(500);
    await ev(`(function(){var c=[].slice.call(document.querySelectorAll('.pc .pc-c')).filter(function(x){return /${QUIEN}/i.test(x.textContent);})[0];c.querySelector('.ord-link').click();return 1;})()`);
    await pausa(1500);
    const od = await ev("(function(){var o=document.querySelector('.ord-cli-name');return o?o.textContent:null;})()");
    chk('   y el nombre sigue abriendo el pedido', od && new RegExp(QUIEN, 'i').test(od), od);
    await ev("(function(){var b=document.querySelector('.ord-cli-name .cli-ficha-btn');if(b)b.click();return !!b;})()"); await pausa(1500);
    c = await cajon();
    chk('   y desde la ficha del pedido, el 👤 abre la del cliente', c.on && new RegExp(QUIEN, 'i').test(c.t), c);
    await cerrar();
    /* Caja: el cobro «Nombre #N» se parte en dos enlaces. */
    await ev("go('caja')");
    await esperar("[].slice.call(document.querySelectorAll('.cj-r .ord-link')).some(function(x){return /verFichaDePedido/.test(x.getAttribute('onclick')||'');})", 60000);
    const cj = await ev(`(function(){var l=[].slice.call(document.querySelectorAll('.cj-r .ord-link')).filter(function(x){return /verFichaDePedido/.test(x.getAttribute('onclick')||'');})[0];if(!l)return null;
      var sig=l.nextElementSibling;var o={nom:l.textContent,num:sig&&sig.textContent,numAbre:sig&&/openOrdDetail/.test(sig.getAttribute('onclick')||'')};l.click();return o;})()`);
    await pausa(1500); c = await cajon();
    chk('Caja: el nombre de un cobro abre la ficha y el «#N» sigue abriendo el pedido', cj && /^#/.test(cj.num || '') && cj.numAbre && c.on && c.t.toLowerCase().indexOf(String(cj.nom).toLowerCase().split(' ')[0]) >= 0, { cj, c });
    await cerrar();
    const err = await ev('window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL se cortó: ' + (e.stack || e)); }
  console.log(`\n${ok} ok · ${mal} MAL`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
