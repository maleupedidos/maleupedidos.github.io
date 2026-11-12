/* EL KIT DE COMPONENTES (12/11/2026): sostiene que haya UNO de cada cosa.
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_kit.js [ancho]
   · desplegable: sin el control del sistema, con chevron, 44 px en el celular (letra 16) y 36 en la compu;
   · segmentado: Pedidos, Caja y Evolución con el mismo alto, radio y activo;
   · tabs: Productos, Clientes y Proveedores subrayadas, mismo alto y letra;
   · Escape cierra un modal abierto (se arma uno de prueba con la clase de un fondo real);
   · deshabilitado se ve deshabilitado. Solo lectura: los POST se cortan. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390), CEL = ANCHO < 769;
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const SBSES = require(path.join(__dirname, 'sbses_guarda.js'))(process.env.SBSES, process.env.USUARIO || 'tadeo');
if (!SBSES) { console.error('falta SBSES'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (c, m, x) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };
(async () => {
  const cli = await abrir(); const ev = (e) => evaluar(cli, e);
  try {
    await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: 1, mobile: CEL });
    await cli.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 40 && !(await ev("typeof go==='function'")); i++) await T(250);
    await T(3000);
    await ev(`(function(){var of=window.fetch;window.fetch=function(u,o){var url=String((u&&u.url)||u||'');if(o&&String(o.method||'').toUpperCase()==='POST'&&!/rpc\\/(.*_pantalla|.*_base|mi_sesion|palancas.*|permiso.*|lectura.*|ventas.*|admin.*|eerr.*)/.test(url)&&!/auth\\/v1/.test(url))return Promise.reject(new TypeError('cortado'));return of.apply(this,arguments);};})()`);
    const firma = (sel) => ev(`JSON.stringify([].filter.call(document.querySelectorAll(${JSON.stringify(sel)}),function(e){var r=e.getBoundingClientRect();return r.width>0&&r.height>0;}).map(function(e){var c=getComputedStyle(e),r=e.getBoundingClientRect();return {h:Math.round(r.height),fs:c.fontSize,ap:c.appearance||c.webkitAppearance,bg:c.backgroundImage!=='none',r:c.borderTopLeftRadius,bb:c.borderBottomWidth,fw:c.fontWeight};}))`).then(JSON.parse);
    await ev("go('pedidos')"); await T(4000);
    const sel = await firma('#p-pedidos select');
    chk(sel.length > 0 && sel.every((x) => x.ap === 'none' && x.bg && x.h === (CEL ? 44 : 36) && x.fs === (CEL ? '16px' : '13px')),
      `desplegables de Pedidos: componente propio, ${CEL ? '44 px y letra 16' : '36 px y letra 13'} (${sel.length})`, sel);
    const segs = [];
    for (const [t, q] of [['pedidos', '#p-pedidos .ped-seg>button'], ['caja', '#p-caja .cj-seg>button'], ['evolucion', '#p-evolucion .evu-seg>button']]) {
      await ev(`go('${t}')`); await T(3500);
      const f = await firma(q); if (f.length) segs.push({ t, h: f[0].h, r: f[0].r, fs: f[0].fs });
    }
    chk(segs.length >= 2 && segs.every((x) => x.h === segs[0].h && x.fs === segs[0].fs), `segmentados iguales en ${segs.map((x) => x.t).join(', ')}`, segs);
    const tabs = [];
    for (const [t, q] of [['stock', '#p-stock .v-tab'], ['estancias', '#p-estancias .bbdd-tab'], ['proveedores', '#p-proveedores .pv-tab']]) {
      await ev(`go('${t}')`); await T(3500);
      const f = await firma(q); if (f.length) tabs.push({ t, h: f[0].h, fs: f[0].fs, fw: f[0].fw, r: f[0].r });
    }
    const ref = tabs.filter((x) => x.t !== 'stock' || !CEL)[0];
    chk(tabs.length >= 2 && tabs.filter((x) => x.t !== 'stock' || !CEL).every((x) => x.h === ref.h && x.fs === ref.fs && x.fw === ref.fw && x.r === '0px'), 'tabs subrayadas, mismo alto y letra', tabs);
    // Escape cierra el modal de arriba.
    const esc = JSON.parse(await ev(`(function(){var b=document.createElement('div');b.className='cpl-bg';b.id='kitPrueba';b.onclick=function(e){if(e.target===b)b.remove();};
      b.innerHTML='<div class="cpl-box"><div class="cpl-tit">Prueba</div></div>';document.body.appendChild(b);
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return JSON.stringify({sigue:!!document.getElementById('kitPrueba')});})()`));
    chk(!esc.sigue, 'Escape cierra el modal abierto', esc);
    // Esqueleto: un «Cargando…» suelto se dibuja como barras; cuando llega el contenido, se ve el contenido.
    await ev(`(function(){var d=document.createElement('div');d.className='empty';d.id='esqPrueba';d.textContent='Cargando pedidos…';document.querySelector('.pg.on').appendChild(d);})()`);
    await T(300);
    const e1 = JSON.parse(await ev(`(function(){var d=document.getElementById('esqPrueba');return JSON.stringify({esq:d.classList.contains('k-esq'),barras:d.querySelectorAll('.k-esq-fila').length,txt:d.innerText.trim()});})()`));
    chk(e1.esq && e1.barras === 4 && /Cargando pedidos/.test(e1.txt), 'un «Cargando…» suelto se dibuja como esqueleto (y el texto sigue ahí)', e1);
    await ev(`document.getElementById('esqPrueba').textContent='No hay pedidos con estos filtros.'`); await T(300);
    const e2 = JSON.parse(await ev(`(function(){var d=document.getElementById('esqPrueba'),c=getComputedStyle(d).color;var r={esq:d.classList.contains('k-esq'),color:c};d.remove();return JSON.stringify(r);})()`));
    chk(!e2.esq && e2.color !== 'rgba(0, 0, 0, 0)', 'cuando llega el contenido, el esqueleto se va y el texto se ve', e2);
    // «¿Cómo funciona?»: el «?» del encabezado explica la pantalla abierta.
    await ev("go('caja')"); await T(1500); await ev('kbdHelp()'); await T(300);
    const ay = JSON.parse(await ev(`JSON.stringify({tit:(document.getElementById('ayudaTit')||{}).textContent,n:document.querySelectorAll('#ayudaPant p').length,on:document.getElementById('kbdBg').classList.contains('on'),bc:(document.getElementById('hdrBc')||{}).textContent})`));
    await ev('kbdClose()');
    chk(ay.on && ay.tit === 'Cómo funciona Caja' && ay.n >= 2, 'el «?» abre «Cómo funciona Caja»', ay);
    chk(/^[A-ZÁÉÍÓÚ][^·›]*\.$/.test(ay.bc || ''), 'la línea gris es una oración (sin «·» de lista)', ay.bc);
    // Caja como Dux: Disponibilidades y HOY arriba de todo; «+ Nuevo» con las 4 acciones, y cada una abre lo suyo.
    await ev("go('caja')"); for (let i = 0; i < 40 && !(await ev("!!document.querySelector('#cBal .cj-top')")); i++) await T(500);
    const cj = JSON.parse(await ev(`(function(){var c=document.getElementById('cBal'),p=c&&c.firstElementChild;var b=document.querySelector('#cjAcc .k-nuevo-b');kitMenu(b);
      var m=document.querySelector('#cjAcc .k-menu');var r={top:p&&p.className,disp:!!(p&&p.querySelector('.cj-total')),hoy:!!document.getElementById('cjHoy'),abierto:m&&!m.hidden,items:m?[].map.call(m.querySelectorAll('.k-menu-i'),function(x){return x.firstChild.textContent;}):[]};
      document.getElementById('tGasto').click();r.gasto=!document.getElementById('formGasto').classList.contains('hidden');r.cerrado=m.hidden;cjAccion('gasto');return JSON.stringify(r);})()`));
    chk(cj.top === 'cj-top' && cj.disp && cj.hoy, 'Caja: Disponibilidades y Hoy arriba de todo', cj);
    chk(cj.abierto && cj.items.join(',') === 'Gasto,Ingreso,Transferir,Arqueo', '«+ Nuevo» abre Gasto, Ingreso, Transferir y Arqueo', cj.items);
    chk(cj.gasto && cj.cerrado, 'elegir Gasto abre el formulario y cierra el menú', cj);
    const ct = JSON.parse(await ev(`(function(){var b=document.querySelector('#cBal .cj-ct-ver[data-q]');if(!b)return JSON.stringify({n:-1});var q=b.dataset.q;b.click();
      var t=(document.getElementById('cjSemBar')||{}).innerText||'';var m=t.replace(/\\./g,'').match(/(\\d+) movimiento/);var r={q:q,n:m?Number(m[1]):0,tarjetas:document.querySelectorAll('#cBal .cj-ct').length};
      var i=document.getElementById('cjBusq');if(i)i.value='';window._cjBusq='';rMovimientos();return JSON.stringify(r);})()`));
    chk(ct.tarjetas >= 2 && ct.n > 0, 'una tarjeta por cuenta, y «Ver movimientos» filtra el libro por esa cuenta', ct);
    // Portada de Ajustes: tarjetas por área y un buscador que lleva directo al parámetro.
    await ev("go('ajustes')"); for (let i = 0; i < 30 && !(await ev("!!document.querySelector('#ajBody .ajp-grid')")); i++) await T(500);
    const aj = JSON.parse(await ev(`(function(){var n=document.querySelectorAll('#ajBody .ajp-card').length;ajpBuscar('busqueda');var r=[].map.call(document.querySelectorAll('#ajpRes button b'),function(b){return b.textContent;});return JSON.stringify({n:n,res:r});})()`));
    chk(aj.n === 6 && aj.res.indexOf('Días de búsqueda a proveedores') >= 0, 'Ajustes: 6 áreas y el buscador encuentra «Días de búsqueda a proveedores»', aj);
    await ev("ajIrParam('PROV_DIAS_BUSQUEDA')");
    let marcado = false; for (let i = 0; i < 30 && !marcado; i++) { await T(300); marcado = await ev("!!document.querySelector('#p-ajustes .aj-pr.ajp-marca[data-k=\"PROV_DIAS_BUSQUEDA\"]')"); }
    chk(marcado, 'elegir el resultado abre Parámetros y marca ese parámetro');
    const dis = JSON.parse(await ev(`(function(){var b=document.createElement('button');b.className='btn-primary';b.disabled=true;b.textContent='x';document.querySelector('.pg.on').appendChild(b);var o=getComputedStyle(b).opacity;b.remove();return JSON.stringify({o:o});})()`));
    chk(Number(dis.o) < 0.6, 'un botón deshabilitado se ve deshabilitado', dis);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
