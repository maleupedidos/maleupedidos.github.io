/* La card "Descargar el auto", en un navegador de verdad (25/9/2026).

   node _tools/pruebas/ver_descarga_auto.js

   Todo lo demas de esta pantalla se prueba sin navegador: la logica del backend
   en `estancias/_tools/probar_descarga_auto.js` y el reparto del conteo en
   `probar_conteo_descarga.js`. Lo que NINGUNO de los dos contesta es si la card
   SE DIBUJA: un error de runtime al renderizar deja la parada en blanco sin que
   se caiga nada mas, y eso ya paso en este ERP (los 14 ids repetidos, 26/8).

   NO toca produccion y no necesita sesion: corre contra `npm run dev` con
   `?prueba=1` —que saltea el login— y los fetch del backend STUBBEADOS con datos
   inventados. Este repo es publico, asi que los nombres son de mentira a
   proposito.

   Deja una captura en el scratchpad para poder MIRARLA, no solo afirmar que
   anda. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const fs = require('fs');
const path = require('path');

/* Va contra `npm run dev` y con `?prueba=1`, que es lo que inyecta
   `window.__maleuAuth` y saltea el login. Por `file://` el ERP abre en la
   pantalla de INICIAR SESIÓN y no se dibuja ninguna tab: se pierde un rato
   buscando el bug en otro lado hasta que se mira la captura. */
const BASE = process.env.BASE || 'http://localhost:8080';
const SALIDA = process.env.SALIDA || path.join(require('os').tmpdir(), 'descarga_auto.png');
let ok = 0, mal = 0;
const VER = '\x1b[32m', ROJO = '\x1b[31m', GRIS = '\x1b[90m', RST = '\x1b[0m';
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ' + VER + 'ok ' + RST + t); }
  else { mal++; console.log('  ' + ROJO + 'MAL' + RST + ' ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 220) : '')); }
};

/* Lo que devolveria el backend con el auto cargado. Dos OC del mismo producto
   (15 + 12) porque ese es el caso que obliga a repartir el conteo. */
const RESP = {
  ok: true, desde: '11/09/2026', totalRows: 6, sinRecibir: 5,
  deposito: [
    { abbr: 'ECaC', prod: 'Empanadas — Carne a Cuchillo', qty: 27, rows: [10, 20], qtys: [15, 12], proveedor: 'Proveedor A' },
    { abbr: 'PMa', prod: 'Pizzas Individuales — Margarita', qty: 17, rows: [30], qtys: [17], proveedor: 'Proveedor B' },
    { abbr: 'TG', prod: 'Tortas — Golosa', qty: 15, rows: [40], qtys: [15], proveedor: 'Proveedor C' },
  ],
  pedidos: [
    { cliente: 'Cliente Uno', canal: 'Clubes', nPedido: '85', qty: 13, items: [
      { abbr: 'PPM', prod: 'Pack Pizzas x2 — Muzzarella', qty: 6, rows: [50], proveedor: 'Proveedor A' },
      { abbr: 'PPJyQ', prod: 'Pack Pizzas x2 — Jamón y Queso', qty: 7, rows: [60], proveedor: 'Proveedor A' } ] },
    { cliente: 'Cliente Dos', canal: 'Pilar', nPedido: '73', qty: 1, items: [
      { abbr: 'PMa', prod: 'Pizzas Individuales — Margarita', qty: 1, rows: [70], proveedor: 'Proveedor B' } ] },
  ],
};

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable');
  await cli.enviar('Page.enable');

  const errores = [];
  cli.escuchar((m, p) => {
    if (m === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails || {};
      errores.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
    }
  });

  /* El stub va ANTES de que arranque la app: `addScriptToEvaluateOnNewDocument`
     acumula, asi que se inyecta UNA sola vez (dos envuelven el fetch dos veces
     y la sub-app no arranca). */
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__RESP = ${JSON.stringify(RESP)};
    window.__posts = [];
    (function(){
      var real = window.fetch;
      window.fetch = function(u, o){
        var s = String(u);
        if (o && o.method === 'POST') {
          try { window.__posts.push(JSON.parse(o.body)); } catch(e) { window.__posts.push({crudo:String(o.body)}); }
          /* Descargado = el auto quedo vacio. A partir de aca el stub devuelve
             listas vacias, como haria el backend de verdad con las filas ya
             selladas. Sin esto, el ERP vuelve a pedir la lista justo despues de
             guardar, el stub le devuelve lo mismo y la card "revive": el test
             daba rojo en la limpieza sobre un front que hace lo correcto. */
          window.__descargado = true;
          return Promise.resolve(new Response(JSON.stringify({ok:true,n:7,recibidos:6,ajustados:1}),
            {headers:{'Content-Type':'application/json'}}));
        }
        if (s.indexOf('pendientesGuardarStock') >= 0) {
          var cuerpo = window.__descargado
            ? {ok:true, deposito:[], items:[], pedidos:[], totalRows:0, sinRecibir:0}
            : window.__RESP;
          return Promise.resolve(new Response(JSON.stringify(cuerpo),
            {headers:{'Content-Type':'application/json'}}));
        }
        if (s.indexOf('script.google.com') >= 0) {
          return Promise.resolve(new Response(JSON.stringify({ok:true,rows:[],pedidos:[],items:[]}),
            {headers:{'Content-Type':'application/json'}}));
        }
        return real.apply(this, arguments);
      };
      /* El confirm del navegador headless devuelve false y cortaria la prueba
         justo en el paso que se quiere medir. */
      window.confirm = function(m){ window.__confirm = m; return true; };
      window.prompt  = function(m, d){ window.__prompt = m; return window.__respPrompt; };
    })();
  ` });

  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });

  /* Se espera a que la sub-app este REGISTRADA y despues se la arranca a mano,
     que es lo mismo que hace `_tools/humo.js`. Dos cosas que costaron una hora:
     · un respiro fijo no alcanza —son 2 MB y 28.000 lineas—, hay que esperar la
       señal de que el ultimo <script> corrio;
     · `switchTab` NO es una global: llamarla da "is not defined" y parece que el
       ERP estuviera roto. Las tabs se cargan perezosamente y las funciones de
       RUTA recien existen despues de `_SUBAPP_ruta()`. */
  const SENAL = "typeof window._SUBAPP_ruta==='function'";
  let arrancado = false;
  for (let i = 0; i < 90 && !arrancado; i++) {
    await new Promise((r) => setTimeout(r, 300));
    arrancado = await evaluar(cli, SENAL).catch(() => false);
  }

  console.log('\n══ La card «Descargar el auto», dibujada ══\n');
  chk('el ERP termino de cargar y registro la sub-app RUTA', arrancado === true);

  /* Se entra tocando la tab del PANEL, que es `go('ruta')`, como entra Tadeo.
     OJO con `switchTab('ruta')`: existe, pero es otra cosa — son las SUB-TABS de
     adentro de Ruta (ruta / armado / cobros / nuevo) y vive dentro de la sub-app,
     asi que antes de arrancarla tira "switchTab is not defined" y parece que el
     ERP estuviera roto. Se perdio un rato largo ahi. */
  const entro = await evaluar(cli, `(function(){
    if (typeof go === 'function') { go('ruta'); return 'ok'; }
    var b = document.querySelector('[data-p="ruta"]');
    if (!b) return 'no encontre la tab RUTA del panel';
    b.click();
    return 'ok';
  })()`);
  chk('se puede entrar a RUTA tocando su tab', entro === 'ok', entro);

  /* Y se la arranca tambien a mano. Las dos cosas, porque hacen cosas
     distintas: el click deja la pantalla de RUTA VISIBLE (sin el, la card se
     dibuja en una tab que nadie mira), y `_SUBAPP_ruta()` es lo que define sus
     funciones. En el navegador de Tadeo las dispara el mismo toque; en headless
     el arranque perezoso no siempre llega, y esperarlo con un respiro fijo daba
     "rdepContar is not defined" sobre codigo sano. */
  let listas = false;
  for (let i = 0; i < 40 && !listas; i++) {
    await new Promise((r) => setTimeout(r, 300));
    listas = await evaluar(cli, `typeof rdepContar==='function'`).catch(() => false);
    if (!listas && i === 6) await evaluar(cli, `window._SUBAPP_ruta && window._SUBAPP_ruta()`).catch(() => {});
  }
  chk('las funciones de la descarga existen despues de abrir RUTA', listas === true);
  chk('y la pantalla de RUTA quedo visible, no otra tab',
    await evaluar(cli, `(function(){var e=document.getElementById('p-ruta');return !!e && getComputedStyle(e).display!=='none';})()`) === true);
  if (!listas) {
    cli.matar();
    console.log(ROJO + '\ncorto aca: sin la sub-app no hay nada que medir\n' + RST);
    process.exit(1);
  }

  /* Y AHORA si la sub-tab: la card de la descarga vive adentro de RUTA > ruta,
     y `rutRender` la dibuja solo si `rutCurrentTab` es esa. Con la sub-tab en
     otra —armado, cobros— todo funciona y no se ve nada. */
  await evaluar(cli, `switchTab('ruta')`).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));

  await evaluar(cli, `typeof fetchPendientesGuardarStock==='function' && fetchPendientesGuardarStock(true)`).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  await evaluar(cli, `typeof rutRender==='function' && rutRender()`).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));

  /* Se mide por la COPIA GUARDADA y por el DOM, no por
     `window.pendientesGuardarStock`: el fusionador publica las globales de la
     sub-app UNA vez al final, asi que esa referencia es una foto vieja y
     reasignar la variable interna no la cambia. Leerla daria 0 sobre una
     pantalla que esta perfecta. */
  const datos = await evaluar(cli, `(localStorage.getItem('maleu_pgs_v1')||'')`);
  const c = datos ? JSON.parse(datos) : null;
  chk('el front recibio los dos bloques y guardo la copia',
    !!c && (c.deposito||[]).length === 3 && (c.pedidos||[]).length === 2,
    c && { dep: (c.deposito||[]).length, ped: (c.pedidos||[]).length });

  /* Se mide sobre el HTML y no sobre el innerText: los grupos de productos
     arrancan COLAPSADOS —se despliegan al tocarlos, que es como Tadeo los va
     tildando— asi que el texto visible no los incluye. Medir por innerText daba
     rojo sobre una card perfectamente dibujada. */
  const html = await evaluar(cli, `document.body.innerHTML`);
  const texto = await evaluar(cli, `(document.body.innerText||'')`);
  chk('la card se dibuja y dice «Descargar el auto»', texto.indexOf('Descargar el auto') >= 0);
  chk('muestra el bloque del freezer', html.indexOf('Al freezer') >= 0);
  chk('y el de lo que hay que separar', /ya tienen due/i.test(html));
  chk('nombra al cliente y su pedido', html.indexOf('Cliente Uno') >= 0 && html.indexOf('#85') >= 0);
  chk('muestra los productos del freezer', html.indexOf('Carne a Cuchillo') >= 0);
  chk('y dice cuantas unidades hay que bajar en total', /73 unidades/.test(texto),
    (texto.match(/\d+ unidades/) || ['no lo encontre'])[0]);

  const btns = await evaluar(cli, `document.querySelectorAll('.rdep-qb').length`);
  chk('cada producto del freezer tiene su numero tocable', btns >= 3, btns);

  // Contar distinto: 27 → 25.
  await evaluar(cli, `window.__respPrompt='25'; window.prompt=function(m){window.__prompt=m;return '25';}; rdepContar('ECaC',27)`);
  await new Promise((r) => setTimeout(r, 600));
  const trasContar = await evaluar(cli, `JSON.stringify({
    conteo: window._rdepConteo,
    ajustes: window._rdepAjustes(),
    dif: document.querySelectorAll('.rdep-qb.dif').length,
    txt: (document.body.innerText.match(/pediste 27/)||[''])[0]
  })`);
  const t = JSON.parse(trasContar);
  chk('el conteo queda guardado', t.conteo && t.conteo.ECaC === 25, t.conteo);
  chk('el numero se marca en rojo', t.dif === 1, t.dif);
  chk('y la pantalla recuerda lo que habias pedido', t.txt === 'pediste 27', t.txt);
  chk('reparte: la OC vieja intacta, descuenta la nueva',
    t.ajustes.length === 1 && t.ajustes[0].r === 20 && t.ajustes[0].qty === 10, t.ajustes);

  /* Confirmar la descarga EJECUTANDO el onclick del boton, no con `.click()`.
     El click sintetico no llega al handler en este ERP —hay manejadores de
     touch de por medio— y el test quedaba en "0 posts" sobre un boton que
     funciona. Ejecutar su atributo prueba lo mismo que importa: que el boton
     este cableado a la funcion correcta y con los argumentos correctos. */
  const apretado = await evaluar(cli, `(function(){
    /* El confirm se vuelve a poner JUSTO ACA: \`servir.js\` instala el suyo para
       que el ERP no se trabe en desarrollo, y pisa al que se inyecto antes de
       cargar la pagina. Sin esto el test medía "0 posts" sobre un botón sano. */
    window.__confirm = '';
    window.confirm = function(m){ window.__confirm = m; return true; };
    var b = Array.prototype.slice.call(document.querySelectorAll('button'))
      .filter(function(x){ return /Descargu/i.test(x.textContent||''); })[0];
    if (!b) return 'no encontre el boton';
    var onc = b.getAttribute('onclick') || '';
    if (onc.indexOf('confirmarGuardadoStock') < 0) return 'el boton no llama a confirmarGuardadoStock: ' + onc.slice(0,60);
    try { (0, eval)(onc); } catch(e) { return 'reventó: ' + e.message; }
    return 'ok';
  })()`);
  chk('el boton esta cableado a la descarga y corre', apretado === 'ok', apretado);
  await new Promise((r) => setTimeout(r, 2500));

  const post = await evaluar(cli, `JSON.stringify({
    conf: window.__confirm||'',
    posts: (window.__posts||[]).filter(function(p){return p.action==='marcarGuardadoEnStock'}),
    /* Lo que importa no es que la clave desaparezca sino que no quede NADA
       pendiente: al confirmar se borra la copia y el refresco posterior la
       reescribe vacia. Exigir que no exista daba rojo sobre lo correcto. */
    cacheDespues: (function(){
      var c = localStorage.getItem('maleu_pgs_v1');
      if (!c) return 0;
      try { var d = JSON.parse(c); return (d.deposito||[]).length + (d.pedidos||[]).length; }
      catch(e) { return -1; }
    })(),
    /* De localStorage y no de window._rdepConteo: esa referencia es la foto que
       publico el fusionador y no refleja la variable interna de la sub-app. */
    conteoDespues: Object.keys(JSON.parse(localStorage.getItem('maleu_rdep_conteo')||'{}')).length
  })`);
  const P = JSON.parse(post);
  chk('el confirm avisa que marca recibido y habilita el pago',
    /habilita el pago/i.test(P.conf), P.conf.slice(0, 120));
  chk('y nombra lo que contaste distinto', /pediste 27, contaste 25/.test(P.conf), P.conf);
  chk('manda UN post de descarga', P.posts.length === 1, P.posts.length);
  if (P.posts.length === 1) {
    const b = P.posts[0];
    chk('con las 7 filas (freezer + pedidos)', (b.rows || []).length === 7, (b.rows || []).length);
    chk('y con el ajuste del conteo adentro',
      (b.ajustes || []).length === 1 && b.ajustes[0].qty === 10, b.ajustes);
  }
  chk('despues de descargar no queda nada pendiente en la copia local', P.cacheDespues === 0, P.cacheDespues);
  chk('y el conteo tambien, o corregiria la compra de la semana que viene',
    P.conteoDespues === 0, P.conteoDespues);

  chk('no hubo un solo error de JS en toda la corrida', errores.length === 0, errores.slice(0, 2));

  // La captura, para poder MIRAR la pantalla y no solo afirmar que anda.
  try {
    const img = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(SALIDA, Buffer.from(img.data, 'base64'));
    console.log(GRIS + '\n  captura: ' + SALIDA + RST);
  } catch (e) { console.log(GRIS + '  (sin captura: ' + e.message + ')' + RST); }

  cli.matar();
  console.log('\n' + (mal === 0 ? VER + 'TODO EN VERDE' : ROJO + mal + ' MAL') + RST +
    GRIS + '   (' + ok + ' ok)' + RST + '\n');
  process.exit(mal === 0 ? 0 : 1);
})().catch((e) => { console.error(ROJO + 'reventó: ' + RST + e.message); process.exit(1); });
