/* El fusionador de duplicados, desde CRM > Personas (21/9/2026).

   Al unificar la tab Clientes dentro del CRM, el banner de duplicados quedo en
   la tab BBDD vieja — que dejo de tener boton en el menu. O sea que fusionar dos
   fichas de la misma persona se volvio inalcanzable sin saber la URL. Esto mide
   que volvio, y que ABRE algo con contenido (un boton que abre una pantalla
   vacia es peor que no tener boton).

   TOKEN=... node probar_duplicados_personas.js
*/
'use strict';
const T = 'C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(T + 'cdp.js');
const prep = require(T + 'sesion_prep.js');
const TOKEN = process.env.TOKEN;
const BASE = 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};


/* Hoy no hay duplicados en la base (medido: 0). Un test que solo comprueba que
   el chip NO esta da verde por ausencia y no prueba el camino: seguiria verde si
   yo hubiera roto el chip. Asi que se le INYECTA uno a la respuesta del backend:
   un clon del primer cliente con telefono, con otra key y sin telefono, que es
   exactamente la forma que `_crmDetectDuplicados` busca. */
const INYECTOR = `
(function(){
  try{ localStorage.removeItem('maleu_crm_clientes_v1'); }catch(e){}
  var o = window.fetch;
  window.fetch = function(u, x){
    var url = String((u && u.url) || u || '');
    var esLista = url.indexOf('action=crmClientes') >= 0 && !(x && String(x.method||'').toUpperCase()==='POST');
    var r = o.apply(this, arguments);
    if (!esLista) return r;
    return r.then(function(resp){
      return resp.clone().json().then(function(d){
        var l = d && d.clientes;
        if (l && l.length){
          var base = null;
          for (var i=0;i<l.length;i++){ if (l[i].tel && l[i].nombre){ base = l[i]; break; } }
          if (base){
            var clon = JSON.parse(JSON.stringify(base));
            clon.key = 'NOMBRE:' + base.nombre; clon.tel = ''; clon.telDisplay = '';
            clon.pedidos = 1; clon.facturado = 1234; clon.entregados = 1;
            l.push(clon);
            window.__inyectado = base.nombre;
          }
        }
        return new Response(JSON.stringify(d), {status:200, headers:{'Content-Type':'application/json'}});
      }).catch(function(){ return resp; });
    });
  };
})();`;

(async () => {
  const p = prep(TOKEN).replace(/\(function\(\)\{var o=window\.fetch;[\s\S]*?\}\)\(\);/, '');
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: p + INYECTOR });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, "typeof go==='function'", 60000)) { console.log('  el ERP no arranco'); process.exit(1); }
    await evaluar(cli, 'go("estancias")');
    await pausa(1500);
    await evaluar(cli, 'window.estSwitch && estSwitch("clientes")');
    if (!await esperar(cli, "document.querySelectorAll('#estCliList [onclick*=\"crmOpenCliente\"]').length > 5")) {
      console.log('  la lista no dibujo'); process.exit(1);
    }
    console.log('\n== CRM > Personas: fusionar duplicados · datos reales ==\n');

    const n = await evaluar(cli, 'window.crmDuplicadosN ? crmDuplicadosN() : -1');
    chk('crmDuplicadosN existe y contesta', typeof n === 'number' && n >= 0, n);
    console.log('       duplicados detectados: ' + n);

    const chip = await evaluar(cli, `(function(){
      var b = document.querySelector('#estClientes .est-chip-dup');
      return b ? b.textContent.trim() : null;
    })()`);
    const quien = await evaluar(cli, 'window.__inyectado || null');
    chk('el duplicado de prueba se inyecto', !!quien, quien);
    console.log('       inyectado: una segunda ficha de "' + quien + '" sin telefono');
    chk('el detector lo encuentra', n >= 1, n);

    chk('el chip de duplicados esta en Personas', !!chip, chip);
    chk('el chip dice cuantos son', !!chip && chip.indexOf(String(n)) >= 0, chip);
    await evaluar(cli, "document.querySelector('#estClientes .est-chip-dup').click()");
    await pausa(900);
    const drawer = await evaluar(cli, `(function(){
      var t = document.getElementById('crmDrawerTitle');
      var b = document.getElementById('crmDrawerBody');
      var vis = document.getElementById('crmDrawer');
      return { titulo: t?t.textContent.trim():'', opciones: b?b.querySelectorAll('.crm-dup-opt').length:0,
               abierto: vis ? vis.classList.contains('on') : false,
               /* SIN regex: dentro de un template literal de Node, \\s pierde la
                  barra y queda /s+/g — se comio todas las "s" del texto y el
                  assert dio rojo por el test, no por el ERP. */
               muestra: b ? b.textContent.split('\\n').join(' ').trim().slice(0,200) : '',
               todo: b ? b.textContent : '' };
    })()`);
    chk('el cajon se abre de verdad (no queda detras de la tab)', drawer.abierto === true, drawer);
    chk('el titulo es el del fusionador', drawer.titulo === 'Posibles duplicados', drawer.titulo);
    chk('deja elegir cual ficha queda', drawer.opciones >= 2, drawer.opciones);
    /* El nombre va DESPUES de la intro de 200 caracteres: se busca en el texto
       entero del cajon, no en el recorte que se imprime. */
    chk('nombra al cliente duplicado', !!quien && drawer.todo.indexOf(quien) >= 0, drawer.muestra);
    console.log('\n  lo que muestra: ' + drawer.muestra + '\n');

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
