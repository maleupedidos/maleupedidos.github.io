/* La mudanza de Productos: el catalogo dejo Clientes y vive en la tab Productos.
   Prueba que las dos pantallas siguen abriendo y que nada quedo colgado. */
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 220) : '')); } };

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html?prueba=1' });
    for (let i = 0; i < 90; i++) { try { if (await evaluar(cli, `typeof stSwitchTab==='function'`)) break; } catch (e) {} await pausa(250); }
    await pausa(800);

    console.log('\n== La mudanza de Productos ==');

    const est = await evaluar(cli, `(function(){
      return {
        catEnStock: !!document.querySelector('#p-stock #stCatalogo'),
        catEnBbdd: !!document.querySelector('#p-bbdd #stCatalogo'),
        viejo: !!document.getElementById('bbdd-productos'),
        botones: [].map.call(document.querySelectorAll('#p-stock .v-tab'),function(b){return b.textContent.trim();}),
        subsBbdd: document.querySelectorAll('#p-bbdd .bbdd-tab').length,
        cliVisible: !!(document.getElementById('bbdd-clientes')||{}).classList
                     && document.getElementById('bbdd-clientes').classList.contains('on'),
        puente: typeof window.stCatalogoPedir
      };
    })()`);
    chk('el catálogo vive en la tab Productos', est.catEnStock === true, est);
    chk('   y ya no está en Clientes', est.catEnBbdd === false && est.viejo === false, est);
    chk('Clientes se quedó sin sub-tabs', est.subsBbdd === 0, { subs: est.subsBbdd });
    chk('   y su lista nace visible (no hay botón que la prenda)', est.cliVisible === true, est);
    chk('las sub-tabs de Productos, sin emojis', JSON.stringify(est.botones) === JSON.stringify(['STOCK', 'CATÁLOGO', 'CONTAR', 'MOVER', 'RECIBIR CARNE']), est.botones);
    chk('el CRM expone el puente stCatalogoPedir', est.puente === 'function', { tipo: est.puente });

    /* Abrir la sub-tab: lo que importa es que se vea y no explote. */
    await evaluar(cli, `go('stock'); 1`); await pausa(400);
    const r = await evaluar(cli, `(function(){
      try{ stSwitchTab('catalogo'); }catch(e){ return {err:e.message}; }
      var c=document.getElementById('stCatalogo');
      var st=document.getElementById('stProductos');
      return { visible: !!(c&&c.classList.contains('on')),
               stockOculto: !!(st&&st.style.display==='none'),
               tieneBuscador: !!document.getElementById('crmProdSearch'),
               marcado: (document.querySelector('#p-stock .v-tab.on')||{}).textContent };
    })()`);
    chk('al tocar CATÁLOGO se muestra', r.visible === true, r);
    chk('   y STOCK se esconde', r.stockOculto === true, r);
    chk('   con su buscador adentro', r.tieneBuscador === true, r);
    chk('   y el botón queda marcado', /CAT/.test(r.marcado || ''), r);

    await evaluar(cli, `stSwitchTab('productos'); 1`); await pausa(300);
    const v = await evaluar(cli, `(function(){
      var c=document.getElementById('stCatalogo');
      return { catOculto: !!(c&&!c.classList.contains('on')),
               stockVisible: (document.getElementById('stProductos')||{}).style.display!=='none' };
    })()`);
    chk('volver a STOCK esconde el catálogo', v.catOculto === true, v);
    chk('   y muestra el stock', v.stockVisible === true, v);

    const err = await evaluar(cli, `(window.__err||[]).length`);
    chk('sin errores de consola', err === 0, { errores: err });

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
