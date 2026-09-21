/* El buscador de comandos llama a cada tab como la llama su encabezado (21/9/2026).

   El nombre de una tab estaba escrito en DOS lugares: MOD_META (que pinta el
   encabezado y el menu lateral) y CMD_NAV (que pinta el buscador de comandos).
   Se desincronizaron solos. El 20/9/2026 el catalogo de productos se mudo de
   BBDD a Stock; el 21/9 MOD_META ya decia "Clientes" y "Productos", pero el
   buscador seguia ofreciendo "BBDD · Clientes · Productos":

     - prometia una pantalla que ya no estaba ahi, y
     - si tipeabas "Clientes" no encontraba la tab, porque para el se llamaba BBDD.

   Esto NO se puede probar comparando `cmdNav()` contra `MOD_META`: cmdNav SALE
   de MOD_META, asi que siempre darian iguales — un control circular no prueba
   nada. Lo que se compara aca son dos caminos de dibujo distintos:

     el <b> que el BUSCADOR pinta   vs   el #hdrTitle que pinta NAVEGAR a la tab

   Si alguien vuelve a escribir el nombre a mano en CMD_NAV, los dos dejan de
   coincidir y este test se pone rojo.

   No necesita token ni backend: con ?prueba=1 alcanza, porque solo mira el
   armazon de la UI. No toca produccion.

   node probar_menu_nombres.js
*/
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(c, e)) return true; } catch (x) {} await pausa(300); } return false; };

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, "typeof cmdNav==='function' && typeof go==='function'")) {
      console.log('  el ERP no arranco (o cmdNav no existe)'); process.exit(1);
    }
    console.log('\n== El buscador de comandos y el encabezado dicen lo mismo ==\n');

    /* ── 1) Cada item del buscador == el encabezado de esa tab ───────────── */
    const filas = await evaluar(cli, `(function(){
      var out = [];
      cmdOpen();                       /* lo dibuja de verdad, con su HTML */
      var items = document.querySelectorAll('#cmdList .cmd-item');
      var nav = cmdNav();
      for (var i = 0; i < nav.length && i < items.length; i++){
        out.push({ k: nav[i].k,
                   bTxt: (items[i].querySelector('b')||{}).textContent || '',
                   sTxt: (items[i].querySelector('small')||{}).textContent || '' });
      }
      cmdClose();
      return out;
    })()`);
    chk('el buscador dibuja las 10 tabs', Array.isArray(filas) && filas.length === 10, filas && filas.length);

    /* Navegar a cada una y leer el encabezado que pinta go(). */
    const cruce = [];
    for (const f of (filas || [])) {
      await evaluar(cli, `go(${JSON.stringify(f.k)})`);
      await pausa(250);
      const hdr = await evaluar(cli, `(function(){
        return { t: (document.getElementById('hdrTitle')||{}).textContent || '',
                 bc: (document.getElementById('hdrBc')||{}).textContent || '' };
      })()`);
      cruce.push({ k: f.k, buscador: f.bTxt, encabezado: hdr.t, subBus: f.sTxt, subEnc: hdr.bc });
    }
    const distintos = cruce.filter(x => x.buscador !== x.encabezado);
    chk('ninguna tab se llama distinto en el buscador que en su encabezado', distintos.length === 0, distintos);
    const subDistintos = cruce.filter(x => x.subBus !== x.subEnc);
    chk('ningun subtitulo difiere del encabezado', subDistintos.length === 0, subDistintos);

    /* ── 2) Las dos que se renombraron, por nombre ───────────────────────── */
    const bbdd = cruce.filter(x => x.k === 'bbdd')[0] || {};
    const stock = cruce.filter(x => x.k === 'stock')[0] || {};
    chk('la tab de clientes ya no se llama "BBDD" en el buscador', bbdd.buscador === 'Clientes', bbdd);
    chk('la de stock se llama "Productos"', stock.buscador === 'Productos', stock);

    /* El bug original: prometia Productos adentro de Clientes. */
    chk('el item de Clientes ya no promete Productos', (bbdd.subBus || '').toLowerCase().indexOf('producto') < 0, bbdd.subBus);

    /* ── 3) Los nombres VIEJOS siguen llevando a la tab ──────────────────── */
    /* Tadeo tiene "BBDD" y "Stock" en la cabeza: si dejaran de encontrar nada,
       el renombre le habria roto el buscador. Para eso esta el campo `al`. */
    const buscar = async q => await evaluar(cli, `(function(){
      var i = document.getElementById('cmdInput');
      cmdOpen(); i.value = ${JSON.stringify(q)}; cmdRender();
      var r = [].map.call(document.querySelectorAll('#cmdList .cmd-item b'), function(b){ return b.textContent; });
      cmdClose(); return r;
    })()`);
    const porBbdd = await buscar('bbdd');
    chk('buscar "bbdd" sigue llevando a Clientes', (porBbdd || []).indexOf('Clientes') >= 0, porBbdd);
    const porStock = await buscar('stock');
    chk('buscar "stock" sigue llevando a Productos', (porStock || []).indexOf('Productos') >= 0, porStock);
    const porCli = await buscar('clientes');
    chk('buscar "clientes" encuentra la tab (antes no)', (porCli || []).indexOf('Clientes') >= 0, porCli);
    /* ── 3b) Sin acentos, que es como escribe Tadeo ──────────────────────── */
    /* La mitad de los subtitulos del menu llevan tilde (Catalogo, Analisis,
       Gestion, Facturacion). Con un indexOf crudo, tipear la palabra sin acento
       no encontraba NADA — y Tadeo dicta por voz y escribe sin acentos. */
    const porProd = await buscar('catalogo');
    chk('buscar "catalogo" (sin tilde) lleva a Productos', (porProd || []).indexOf('Productos') >= 0, porProd);
    const porAnal = await buscar('analisis');
    chk('buscar "analisis" (sin tilde) lleva a Ventas', (porAnal || []).indexOf('Ventas') >= 0, porAnal);
    const porGest = await buscar('gestion');
    chk('buscar "gestion" (sin tilde) lleva a Pedidos', (porGest || []).indexOf('Pedidos') >= 0, porGest);
    /* Y al reves: escribirlo CON tilde tiene que seguir andando. */
    const porTilde = await buscar('catálogo');
    chk('buscar "catálogo" (con tilde) sigue andando', (porTilde || []).indexOf('Productos') >= 0, porTilde);

    /* ── 3c) Los PEDIDOS, que es donde estan los nombres con enie ────────── */
    /* Normalizar solo el lado de la consulta habria ROTO esto: "iñaki" se
       aplana a "inaki" y no habria matcheado el nombre crudo. Sin backend, los
       pedidos se ponen a mano: lo que se prueba es el filtro, no la carga. */
    const pedBusca = async q => await evaluar(cli, `(function(){
      D = D || {};
      D.pedidos = [{cliente:'I\\u00f1aki Ustariz', n:'901', h:'Home', total:1000},
                   {cliente:'Mart\\u00edn Gomez',  n:'902', h:'Home', total:2000}];
      var i = document.getElementById('cmdInput');
      cmdOpen(); i.value = ${JSON.stringify(q)}; cmdRender();
      var r = [].map.call(document.querySelectorAll('#cmdList .cmd-item b'), function(b){ return b.textContent; });
      cmdClose(); return r;
    })()`);
    const pInaki = await pedBusca('inaki');
    chk('buscar "inaki" encuentra el pedido de Iñaki', (pInaki || []).join('|').indexOf('aki Ustariz') >= 0, pInaki);
    const pEnie = await pedBusca('iñaki');
    chk('buscar "iñaki" con enie tambien lo encuentra', (pEnie || []).join('|').indexOf('aki Ustariz') >= 0, pEnie);
    const pMartin = await pedBusca('martin');
    chk('buscar "martin" encuentra a "Martín"', (pMartin || []).join('|').indexOf('Gomez') >= 0, pMartin);
    const pNro = await pedBusca('902');
    chk('buscar por numero de pedido sigue andando', (pNro || []).join('|').indexOf('902') >= 0, pNro);

    /* ── 4) Que el fallback exista, por si MOD_META pierde una clave ─────── */
    const sinMeta = await evaluar(cli, `(function(){
      var g = MOD_META.bbdd; delete MOD_META.bbdd;
      var r = cmdNav().filter(function(x){ return x.k === 'bbdd'; })[0];
      MOD_META.bbdd = g;
      return r ? { t: r.t, tieneIco: !!r.ic, tieneKbd: !!r.kbd } : null;
    })()`);
    chk('si MOD_META no conoce la clave, la tab no desaparece del buscador',
        !!sinMeta && !!sinMeta.t && sinMeta.tieneIco === true && sinMeta.tieneKbd === true, sinMeta);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);

    console.log('\n  tabla del cruce:');
    cruce.forEach(x => console.log('    ' + x.k.padEnd(10) + ' buscador=' + String(x.buscador).padEnd(16) + ' encabezado=' + x.encabezado));
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
