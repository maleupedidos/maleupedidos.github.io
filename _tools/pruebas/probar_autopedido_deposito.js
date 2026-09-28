/* EL AUTOPEDIDO ELIGE DE QUE FREEZER SALE. (27/9/2026)
 *
 *   node _tools/servir.js                      (en otra terminal)
 *   node _tools/pruebas/probar_autopedido_deposito.js
 *   APP=app_viejo_tmp.html node ...            <- la contraria
 *
 * Tadeo: *"en autopedido la idea es poder hacer autopedidos tanto para el
 * deposito Ustariz como el deposito Moresco"*.
 *
 * Se abre **ruta.html standalone**, no app.html: la tab «+» vive ahi, y
 * fusionada dentro del ERP haria falta loguearse y abrir Ruta para que sus
 * globales existan. El markup y el JS son los mismos bytes — el build no
 * renombra nada desde el 26/8/2026.
 *
 * **Ningun fetch sale de esta maquina.** Se interceptan todos: ruta.html le
 * pega al Apps Script de PRODUCCION aunque el HTML sea local, y una prueba que
 * se come dos cupos del backend le frena el ERP a quien lo este usando.
 *
 * Lo que se prueba son las DECISIONES:
 *   · en que freezer arranca el selector, segun quien esta cargando;
 *   · que con un solo deposito no aparece y manda '' (lo de siempre);
 *   · que el aviso compara contra el freezer ELEGIDO y no contra el principal;
 *   · que el `deposito` viaja en el POST.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'ruta.html';

let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 40000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

/* El renglon de reparto de la card de un producto. '' si no esta, null si el
   producto no esta en el catalogo (que es un rojo distinto: la prueba no midio
   nada). */
const REPARTO = abbr => `(function(){
  for(var i=0;i<NP_CAT_FLAT.length;i++) if(NP_CAT_FLAT[i].abbr===${JSON.stringify(abbr)}){
    var el=document.getElementById('npProd_'+NP_CAT_FLAT[i].id);
    if(!el)return null;
    var r=el.querySelector('.np-dep-rep');
    return r?r.textContent.replace(/\\s+/g,' ').trim():'';
  }
  return null;
})()`;

/* Los dos freezers como los manda `stock_full` desde el 27/9/2026. */
const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz', user: 'tadeo' },
              { id: 'moresco', nombre: 'Deposito Moresco', user: 'luqui' }];

/* Stock con los numeros reales de ese dia: la mayoria del catalogo en lo de
   Tadeo (por eso `npDepPrincipal` da `ustariz`) y la carne en lo de Lucas. */
const STOCK = {
  PMu:  { f: 9,  p: 9,  dep: 'ustariz', pd: { ustariz: 3, moresco: 6 } },
  PPM:  { f: 10, p: 10, dep: 'ustariz', pd: { ustariz: 0, moresco: 10 } },
  SCo:  { f: 16, p: 16, dep: 'ustariz', pd: { ustariz: 16, moresco: 0 } },
  ECaC: { f: 12, p: 12, dep: 'ustariz', pd: { ustariz: 12, moresco: 0 } },
  _deps: DEPS
};

/* Corta TODO fetch antes de que salga. Devuelve algo valido para que la app no
   se quede en un estado raro, pero no toca la red. */
const SINRED = `
(function(){
  window.__fetches = [];
  window.fetch = function(u, i){
    var url = (typeof u === 'string') ? u : ((u && u.url) || '');
    var post = !!(i && String(i.method||'').toUpperCase() === 'POST');
    var cuerpo = null;
    if (post) { try { cuerpo = JSON.parse(i.body); } catch(e) { cuerpo = String(i.body||''); } }
    window.__fetches.push({ url: url, post: post, body: cuerpo });
    return Promise.resolve({ ok: true, status: 200,
      json: function(){ return Promise.resolve({ ok: true, n: 9999, row: 2 }); },
      text: function(){ return Promise.resolve('{"ok":true}'); } });
  };
})();
`;

const sembrarSesion = usuario => `
try{ localStorage.setItem('maleu_panel_session', JSON.stringify(
  { usuario: ${JSON.stringify(usuario)}, rol: 'admin', nombre: 'Prueba', ts: Date.now() })); }catch(e){}
`;

/* Una corrida completa con un usuario dado. Se recarga la pagina entera porque
   `_RUTA_USER_ID` se lee UNA sola vez al cargar — igual que en el celular. */
async function conUsuario(cli, usuario, stock) {
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SINRED + sembrarSesion(usuario) });
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?standalone=1' });
  if (!await esperar(cli, `typeof npDepRender==='function' && !!document.getElementById('npDepWrap')`))
    throw new Error('ruta.html no arranco (o falta npDepRender/npDepWrap)');
  await evaluar(cli, `window.NP_STOCK=${JSON.stringify(stock)}; NP_STOCK_TS=Date.now(); NP_STOCK_COPIA=0; npDepRender(); 1`);
  return true;
}

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((m, p) => {
    if (m === 'Runtime.exceptionThrown')
      errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'exc');
  });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };

  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');

    console.log('\n== El autopedido y los dos freezers ==\n');

    /* 1. TADEO: arranca en su freezer. */
    await conUsuario(cli, 'tadeo', STOCK);
    let v = await evaluar(cli, `({
      eleg: npDepElegido(), def: npDepPorDefecto(),
      visible: !/hidden/.test(document.getElementById('npDepWrap').className),
      opciones: Array.prototype.map.call(document.getElementById('npDeposito').options, function(o){return o.value+'|'+o.textContent}),
      nom: npDepNombre('moresco'), nomU: npDepNombre('ustariz'),
      principal: npDepPrincipal()
    })`);
    chk('con el usuario tadeo, el pedido sale de su freezer', v.eleg === 'ustariz', v);
    chk('el selector se ve cuando hay dos freezers', v.visible === true, v);
    chk('y ofrece los dos, con el nombre de la hoja',
        v.opciones.length === 2 && v.opciones[0] === 'ustariz|Sale de: Deposito Ustariz'
        && v.opciones[1] === 'moresco|Sale de: Deposito Moresco', v.opciones);
    chk('el nombre corto sale de la hoja, sin el "Deposito "',
        v.nom === 'Moresco' && v.nomU === 'Ustariz', v);

    /* 1b. LA CARD DICE EN QUE FREEZER ESTA CADA COSA. (28/9/2026)

       Hasta hoy decia "quedan 9" y esos 9 podian ser 3 suyos y 6 de Lucas — o
       los 10 del Pack Muzzarella, que estan ENTEROS en lo de Lucas y en el
       freezer de Tadeo hay cero. El numero era cierto como total de Maleu y no
       alcanzaba para decidir si lo podia entregar el mismo. */
    await evaluar(cli, `npRenderCatalogo(); 1`);
    const repMu = await evaluar(cli, REPARTO('PMu'));
    chk('la card del producto existe (sin esto lo de abajo no mide nada)', repMu !== null, repMu);
    chk('mirando Tadeo, la Pizza Muzzarella dice 3 acá y 6 en lo de Lucas',
        repMu === '3 ac\u00e1 \u00b7 6 Moresco', repMu);
    const repPPM = await evaluar(cli, REPARTO('PPM'));
    chk('el que esta ENTERO en la otra casa lo dice, con el cero adelante',
        repPPM === '0 ac\u00e1 \u00b7 10 Moresco', repPPM);
    /* El tope sigue siendo el TOTAL: cualquiera puede vender de cualquier
       freezer (Tadeo, 27/9) y al entregar `_moverFisico_` derrama al otro si el
       primero no alcanza. Bajarlo al freezer propio prohibiria una venta que el
       ERP sabe resolver.

       La fecha de entrega se fija en AYER porque es el unico modo que mira el
       fisico ('real'): con una fecha futura `npStockMode()` puede dar
       'ilimitado' y `npCap()` devolver null —correcto— y entonces el chequeo
       diria rojo por el dia de la semana en que se corrio. */
    const topePPM = await evaluar(cli, `(function(){
      var previo=npFechaSel;
      var d=new Date(Date.now()-86400000);
      npFechaSel=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
      var r={modo:npStockMode(), cap:npCap('PPM')};
      npFechaSel=previo;
      return r;
    })()`);
    chk('el numero grande NO baja: se puede vender de cualquier freezer',
        topePPM.modo === 'real' && topePPM.cap === 10, topePPM);
    const repSCo = await evaluar(cli, REPARTO('SCo'));
    chk('y el que esta todo en casa tambien se dice entero',
        repSCo === '16 ac\u00e1 \u00b7 0 Moresco', repSCo);

    /* 2. Elegirlo a mano manda al otro, y el POST lo lleva. */
    await evaluar(cli, `document.getElementById('npDeposito').value='moresco'; npDepManual(); 1`);
    chk('elegido a mano, el pedido sale del otro freezer',
        await evaluar(cli, `npDepElegido()`) === 'moresco');

    /* 3. EL AVISO COMPARA CONTRA EL ELEGIDO. Es la mitad del arreglo: hasta hoy
       comparaba contra el deposito principal, asi que con el pedido saliendo de
       lo de Lucas marcaba como "anda a buscarlo" lo que estaba al lado. */
    await evaluar(cli, `npCart={}; 1`);
    const idSCo = await evaluar(cli, `(function(){for(var i=0;i<NP_CAT_FLAT.length;i++)if(NP_CAT_FLAT[i].abbr==='SCo')return NP_CAT_FLAT[i].id;return 0;})()`);
    chk('el catalogo tiene el producto de prueba (SCo)', !!idSCo, idSCo);
    if (idSCo) {
      await evaluar(cli, `npCart[${idSCo}]=2; document.getElementById('npOrigen').value='Deposito'; npOrigenTocado=true; npAvisoEncargoRender(); 1`);
      const avisoMo = await evaluar(cli, `(document.getElementById('npAvisoEncargo')||{}).textContent||''`);
      chk('saliendo de Moresco, avisa que los Sorrentinos estan en lo de Ustariz',
          /Ustariz/.test(avisoMo), avisoMo.slice(0, 140));

      await evaluar(cli, `document.getElementById('npDeposito').value='ustariz'; npDepManual(); 1`);
      const avisoUs = await evaluar(cli, `(function(){var b=document.getElementById('npAvisoEncargo');return {t:b.textContent||'',h:/hidden/.test(b.className)};})()`);
      chk('saliendo de Ustariz, donde SI estan, no avisa nada',
          avisoUs.h === true || !/Ustariz|Moresco/.test(avisoUs.t), avisoUs);
    }

    /* 4. El freezer viaja en el POST. */
    await evaluar(cli, `document.getElementById('npDeposito').value='moresco'; npDepManual();
      document.getElementById('npNombre').value='Prueba Deposito';
      npFechaSel=(function(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})();
      npPreciosConfirmados=true; 1`);
    await evaluar(cli, `window.confirm=function(){return true}; npGuardar(); 1`);
    await esperar(cli, `(window.__fetches||[]).filter(function(f){return f.post}).length>0`, 8000);
    const post = await evaluar(cli, `(function(){var L=(window.__fetches||[]).filter(function(f){return f.post});return L.length?L[L.length-1].body:null;})()`);
    chk('el POST del pedido lleva el freezer elegido', post && post.deposito === 'moresco',
        post ? { deposito: post.deposito, canal: post.canal } : null);

    /* 5. LUQUI: la misma pantalla arranca en el otro freezer, sin tocar nada.
       Es el default lo que hace que esto se use: elegirlo pedido por pedido se
       deja de hacer en una semana. */
    await conUsuario(cli, 'luqui', STOCK);
    v = await evaluar(cli, `({ eleg: npDepElegido(), sel: document.getElementById('npDeposito').value })`);
    chk('con el usuario luqui, el pedido sale del freezer de Lucas',
        v.eleg === 'moresco' && v.sel === 'moresco', v);
    /* "acá" es de quien MIRA, no del selector: la card dice donde ESTA la
       mercaderia y el selector de donde SALE el pedido. Son dos preguntas. */
    await evaluar(cli, `npRenderCatalogo(); 1`);
    chk('mirando Lucas, la misma pizza dice 3 Ustariz y 6 acá',
        await evaluar(cli, REPARTO('PMu')) === '3 Ustariz \u00b7 6 ac\u00e1');

    /* 6. Sin el mapeo en la hoja, cae al principal: lo de antes del cambio. */
    const SIN_USER = JSON.parse(JSON.stringify(STOCK));
    SIN_USER._deps = DEPS.map(d => ({ id: d.id, nombre: d.nombre }));
    await conUsuario(cli, 'luqui', SIN_USER);
    chk('sin la columna Usuario ERP, cae al deposito principal del catalogo',
        await evaluar(cli, `npDepElegido()`) === 'ustariz');
    await evaluar(cli, `npRenderCatalogo(); 1`);
    chk('y sin saber cual es el tuyo, el reparto se dice igual con los dos nombres',
        await evaluar(cli, REPARTO('PMu')) === '3 Ustariz \u00b7 6 Moresco');

    /* 7. Un solo freezer: ni selector ni `deposito`. El backend entiende '' como
       "el default del producto", que es como venia funcionando. */
    const UNO = JSON.parse(JSON.stringify(STOCK));
    UNO._deps = [DEPS[0]];
    await conUsuario(cli, 'tadeo', UNO);
    v = await evaluar(cli, `({ eleg: npDepElegido(), oculto: /hidden/.test(document.getElementById('npDepWrap').className) })`);
    chk('con UN solo freezer no se pregunta nada y manda vacio',
        v.eleg === '' && v.oculto === true, v);
    await evaluar(cli, `npRenderCatalogo(); 1`);
    chk('y la card no dice un reparto de uno solo', await evaluar(cli, REPARTO('PMu')) === '');

    /* 8. Un Apps Script viejo (sin `_deps`) tampoco rompe. */
    const VIEJO = JSON.parse(JSON.stringify(STOCK));
    delete VIEJO._deps;
    await conUsuario(cli, 'tadeo', VIEJO);
    v = await evaluar(cli, `({ eleg: npDepElegido(), oculto: /hidden/.test(document.getElementById('npDepWrap').className), lista: npDepLista().length })`);
    chk('con un backend anterior al cambio, se comporta como antes',
        v.eleg === '' && v.oculto === true && v.lista === 0, v);
    await evaluar(cli, `npRenderCatalogo(); 1`);
    chk('y la card tampoco inventa un reparto', await evaluar(cli, REPARTO('PMu')) === '');

    const propios = errores.filter(e => !/favicon|manifest|sw-|ServiceWorker/i.test(String(e)));
    chk('ni un error en la consola', propios.length === 0, propios.slice(0, 3));

    console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.log('  revento la prueba: ' + e);
    salir(1);
  }
})();
