/* Caja avisa de los vueltos cuyo pedido ya no existe (21/9/2026).

   El vuelto de un cobro no vive en el pedido: vive en la hoja "Cambios
   Billetera". Si alguien borra el pedido a mano en la planilla, esa fila queda
   sola y sigue sumando al efectivo en mano para siempre — no hay endpoint que se
   entere. Le paso a Tadeo ese dia con un pedido de prueba: borro el pedido y sus
   movimientos, y la tarjeta siguio marcando $4.000 que no eran de nadie.

   Hoy NO hay huerfanos en la base (Tadeo saco el suyo), asi que un test que solo
   mirara "no aparece el aviso" daria verde igual si el aviso estuviera roto. Por
   eso se INYECTA uno en la respuesta del backend y se prueba el camino entero;
   al final se saca y se comprueba que el aviso desaparece.

   Los POST van interceptados: no se borra ninguna fila de verdad.

   TOKEN=... node probar_vuelto_huerfano.js
*/
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (c, e, ms = 180000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(c, e)) return true; } catch (x) {} await pausa(400); } return false; };

/* Le agrega un huerfano a la respuesta de caja, fechado el MISMO dia que el
   primer dia de `efMano` — si no, el filtro por dia de la tarjeta lo esconderia
   con razon y el test probaria lo contrario de lo que cree. Y guarda los POST
   en vez de mandarlos. */
const INYECTOR = `
window.__posts = [];
window.__inyectar = true;
(function(){
  var o = window.fetch;
  window.fetch = function(u, x){
    if (x && String(x.method||'').toUpperCase() === 'POST'){
      try { window.__posts.push(JSON.parse(x.body)); } catch(e){ window.__posts.push({crudo:String(x.body).slice(0,300)}); }
      return Promise.resolve(new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}}));
    }
    var r = o.apply(this, arguments);
    return r.then(function(resp){
      if (!window.__inyectar) return resp;
      return resp.clone().json().then(function(d){
        if (!d || !Array.isArray(d.efMano) || !d.efMano.length) return resp;
        var dia = d.efMano[0].f || '';
        d.efHuerfanos = [{ fila: 999, h: 'Home', id: '9999', c: 'Prueba Huerfana',
                           $: 4000, q: 'Tadeo Ustariz', tipo: 'CambioMP',
                           f: dia + ' 10:17' }];
        window.__diaInyectado = dia;
        return new Response(JSON.stringify(d), {status:200, headers:{'Content-Type':'application/json'}});
      }).catch(function(){ return resp; });
    });
  };
})();`;

(async () => {
  const p = prep(process.env.TOKEN).replace(/\(function\(\)\{var o=window\.fetch;[\s\S]*?\}\)\(\);/, '');
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: p + INYECTOR });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, "typeof go==='function'", 60000)) { console.log('  el ERP no arranco'); process.exit(1); }
    await evaluar(cli, 'go("caja")');
    if (!await esperar(cli, "!!document.querySelector('#efManoCard .efm')")) { console.log('  la tarjeta de efectivo no dibujo'); process.exit(1); }
    await pausa(800);
    console.log('\n== Caja > vueltos sin pedido · datos reales · sin borrar nada ==\n');

    chk('el huerfano de prueba se inyecto', !!await evaluar(cli, 'window.__diaInyectado || null'));

    // ── 1) El aviso aparece, con el monto y de quien es ──────────────────
    const av = await evaluar(cli, `(function(){
      var b = document.querySelector('#efManoCard .efm-huerf');
      if(!b) return null;
      return { t: (b.querySelector('.efm-huerf-t')||{}).textContent || '',
               d: (b.querySelector('.efm-huerf-d')||{}).textContent || '',
               filas: b.querySelectorAll('.efm-huerf-f').length,
               txt: b.textContent };
    })()`);
    if(!av){
      const diag = await evaluar(cli, `(function(){
        var o = {};
        o.tieneD = typeof D !== 'undefined';
        o.efHuerfanos = (typeof D!=='undefined' && D) ? JSON.stringify(D.efHuerfanos||null) : '(sin D)';
        o.efManoF = (typeof D!=='undefined' && D && D.efMano && D.efMano[0]) ? D.efMano[0].f : '(sin efMano)';
        o.diaInyectado = window.__diaInyectado || '(ninguno)';
        o.hayFn = typeof _efHuerfanosHtml;
        o.tarjeta = !!document.querySelector('#efManoCard .efm');
        return o;
      })()`);
      console.log('       diagnostico:');
      Object.keys(diag).forEach(k => console.log('         ' + k.padEnd(14) + String(diag[k]).slice(0, 120)));
    }
    chk('el aviso aparece en la tarjeta', !!av, av);
    if (av) {
      chk('dice cuanta plata es', av.t.indexOf('4.000') >= 0, av.t);
      chk('nombra al cliente', av.txt.indexOf('Prueba Huerfana') >= 0);
      chk('dice de que pedido era', av.txt.indexOf('Home #9999') >= 0);
      chk('explica que esta sumando al total de arriba', /sumando/i.test(av.d), av.d);
      chk('hay un boton por cada uno', av.filas === 1, av.filas);
    }

    // ── 2) El boton manda el POST correcto ───────────────────────────────
    await evaluar(cli, `(function(){
      window.confirm = function(){ return true; };
      var b = document.querySelector('.efm-huerf-b'); if(b) b.click();
    })()`);
    await pausa(1200);
    const post = await evaluar(cli, "(window.__posts||[]).filter(function(p){return p.action==='borrarVueltoHuerfano';})[0] || null");
    chk('tocar "Sacarlo" dispara borrarVueltoHuerfano', !!post, post);
    if (post) {
      chk('manda la FILA de la hoja', Number(post.row) === 999, post.row);
      chk('manda hoja e id para que el backend reverifique', post.h === 'Home' && String(post.id) === '9999', post);
      chk('manda el monto para que el backend reverifique', Number(post.monto) === 4000, post.monto);
      /* Sin `clientOpId`, si Google pierde la respuesta y el panel repite, se
         borrarian DOS filas. Es la leccion del 17/9/2026. */
      chk('manda clientOpId (que repetir no borre dos filas)', !!post.clientOpId, post.clientOpId);
    }

    // ── 3) Sin huerfanos, no hay aviso ───────────────────────────────────
    await evaluar(cli, 'window.__inyectar = false; 1');
    await evaluar(cli, 'if(window._recargarCaja) _recargarCaja();');
    await pausa(1500);
    const sigue = await esperar(cli, "!document.querySelector('#efManoCard .efm-huerf')", 90000);
    chk('sin huerfanos el aviso no esta (no molesta todos los dias)', sigue === true);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
