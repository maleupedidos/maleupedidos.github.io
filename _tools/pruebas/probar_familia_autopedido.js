/* Los atajos de familia del AUTOPEDIDO, despues de sacarles los datos duros.

   Hasta el 21/9/2026 `NP_FAMILIA` traia el telefono, el lote y el sub-barrio
   escritos adentro de ruta.html — o sea, en un repo que es PUBLICO por GitHub
   Pages. Ahora guarda solo el nombre y el resto sale de `_npClientesCache`, la
   misma lista que usa el autocompletado.

   Esto sostiene que el atajo siga cargando lo mismo que cargaba antes, y que
   cuando la lista no bajo lo DIGA en vez de mandar un pedido sin direccion.

   TOKEN=... node probar_familia_autopedido.js
*/
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 120000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(300); } return false; };

(async () => {
  // Sin stub de POST: el cache de clientes baja por GET y hace falta de verdad.
  const p = prep(process.env.TOKEN).replace(/\(function\(\)\{var o=window\.fetch;[\s\S]*?\}\)\(\);/, '');
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: p });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, "typeof go==='function'", 60000)) { console.log('  el ERP no arranco'); process.exit(1); }
    await evaluar(cli, 'go("ruta")');
    if (!await esperar(cli, "typeof npFamilia==='function'", 60000)) { console.log('  Ruta no arranco'); process.exit(1); }
    /* Los botones de familia viven DENTRO del autopedido, y es `renderNuevo()`
       quien pide la lista de clientes. Llamar a npFamilia sin abrirlo probaria
       un camino que en la app no existe. */
    await evaluar(cli, 'window.renderNuevo ? (renderNuevo(),1) : (switchTab("nuevo"),1)');
    await pausa(800);
    console.log('\n== AUTOPEDIDO > atajos de familia · datos reales ==\n');

    // ── 1) El HTML ya no guarda telefonos ni direcciones ─────────────────
    const forma = await evaluar(cli, `(function(){
      var k = Object.keys(NP_FAMILIA);
      return { n: k.length, tipos: k.map(function(x){ return typeof NP_FAMILIA[x]; }),
               crudo: JSON.stringify(NP_FAMILIA) };
    })()`);
    chk('siguen los 4 atajos', forma.n === 4, forma.n);
    chk('cada uno es solo un nombre, no un objeto con datos',
      forma.tipos.every(t => t === 'string'), forma.tipos);
    chk('no quedo ningun telefono adentro', !/\+?549?\d{8,}/.test(forma.crudo), forma.crudo.slice(0, 120));
    chk('no quedo ningun lote ni sub-barrio', !/lote|Champagnat/i.test(forma.crudo), forma.crudo.slice(0, 120));

    // ── 2) Con el cache cargado, el atajo llena todo igual que antes ─────
    /* OJO: `window._npClientesCache` es una COPIA que la sub-app publica al
       fusionarse, y NO se actualiza. La variable que las funciones leen vive en
       el closure de la sub-app. Por eso este test no mira esa copia ni le
       escribe: preguntarle a window daba "vacia" con la lista llena, y ponerla
       en null no cambiaba nada del otro lado. Se mide por el resultado. */
    /* En un Chrome virgen no hay localStorage, asi que la lista sale del rebuild
       del backend y tarda (medido: pasa los 90 s). En el telefono de todos los
       dias la hidrata localStorage al instante. Se le pregunta a la FUNCION, que
       lee la variable del closure. */
    const listo = await esperar(cli, "_npFichaFamilia('Tadeo Ustariz')._falta===false", 240000);
    chk('la lista de clientes bajo', listo === true);

    const r = await evaluar(cli, `(function(){
      npFamilia('tadeo');
      var v = function(i){ var e=document.getElementById(i); return e ? e.value : '(sin campo)'; };
      return { nombre:v('npNombre'), tel:v('npTel'), lote:v('npLote'), sb:v('npSubBarrio'),
               tipo:v('npTipo'), barrio:v('npBarrioPrivado') };
    })()`);
    chk('carga el nombre', !!r.nombre && r.nombre.length > 3, r.nombre);
    chk('resuelve el TELEFONO desde la lista', /\d{8,}/.test(String(r.tel)), r.tel ? 'llego uno de ' + String(r.tel).replace(/\d/g, '#').length + ' caracteres' : '(vacio)');
    chk('resuelve el LOTE desde la lista', !!String(r.lote).trim(), r.lote ? 'si' : '(vacio)');
    chk('resuelve el SUB-BARRIO desde la lista', !!String(r.sb).trim(), r.sb ? 'si' : '(vacio)');
    chk('lo deja al costo', r.tipo === 'costo', r.tipo);
    chk('fuerza Estancias del Pilar', r.barrio === 'Estancias del Pilar', r.barrio);

    // Los otros tres tambien resuelven.
    const todos = await evaluar(cli, `(function(){
      var out = {};
      ['alejandra','rodrigo','inaki'].forEach(function(k){
        npFamilia(k);
        var v = function(i){ var e=document.getElementById(i); return e ? String(e.value||'') : ''; };
        out[k] = { nom: !!v('npNombre'), tel: /\\d{8,}/.test(v('npTel')), lote: !!v('npLote').trim() };
      });
      return out;
    })()`);
    Object.keys(todos).forEach(k => {
      chk('el atajo "' + k + '" resuelve nombre, tel y lote',
        todos[k].nom && todos[k].tel && todos[k].lote, todos[k]);
    });

    // ── 3) Un nombre que la lista NO tiene: avisa, no inventa ───────────
    /* Misma rama que cuando la lista todavia no bajo, pero probada por el camino
       real en vez de peleando con el scope de la sub-app. */
    const sin = await evaluar(cli, `_npFichaFamilia('Zzqx Noexiste Nadie')`);
    chk('un nombre que no esta: devuelve el nombre igual', sin.nombre === 'Zzqx Noexiste Nadie', sin.nombre);
    chk('un nombre que no esta: avisa que falta y no inventa un telefono',
      sin._falta === true && !sin.tel, { falta: sin._falta, tel: sin.tel ? 'INVENTO UNO' : '(vacio)' });

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
