/* EL VIGIA: el "¿cambió algo?" que el ERP le pregunta al backend (22/9/2026).
 *
 *   node probar_vigia.js [390|1440]
 *
 * Backend STUBBEADO. No toca producción ni hace falta token real.
 *
 * Lo que se mide es LA DECISIÓN —cuánto pide esperar hasta el próximo control—,
 * no el efecto: esperar los minutos de verdad haría una prueba de media hora que
 * nadie va a correr. Se intercepta `setTimeout` y se anotan las esperas pedidas,
 * disparándolas al instante.
 *
 * Lo que importa: sin novedades el vigía TIENE que aflojar (si no, un ERP
 * abierto todo el día le mete 90 pedidos por hora a un Apps Script que atiende
 * de a uno, y eso es lo que hace lenta a la caja y al volcado); y apenas algo
 * cambia, o volvés a la app, tiene que volver a los 40 segundos.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return { __err: String(x.message || x) }; } };
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(c, e) === true) return true; await pausa(150); } return false; };

/* El tiempo comprimido. Solo se acortan las esperas del rango del vigía
   (20 s a 5 min): las demás quedan como están para no alterar el resto del ERP. */
const RELOJ = `
  window.__vis = 'visible';
  try{ Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){return window.__vis;}}); }catch(e){}
  window.__esperas = [];
  /* Se anotan SOLO las esperas del vigia, reconocidas por la funcion que
     programan: _vigiaMirar. Filtrar por rango de milisegundos traia los
     temporizadores de otras partes del ERP y la prueba media cualquier cosa. */
  (function(){ var st = window.setTimeout;
    window.setTimeout = function(fn, ms){
      if (typeof fn === 'function' && fn.name === '_vigiaMirar'){ window.__esperas.push(ms); return st(fn, 12); }
      return st.apply(this, arguments);
    };
  })();
  window.__vers = 0; window.__ver = 'v1';
  (function(){ var o = window.fetch; window.fetch = function(u, x){
    var url = String((u && u.url) || u || '');
    if (url.indexOf('script.google.com') < 0) return o.apply(this, arguments);
    if (x && String(x.method||'').toUpperCase() === 'POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
    var m = url.match(/action=([a-zA-Z_]+)/), a = m ? m[1] : '?';
    var cuerpo = {ok:false, err:'stub'};
    if (a === 'ver'){
      window.__vers++;
      window.__juntos = (window.__juntos||0) + 1;
      window.__maxJuntos = Math.max(window.__maxJuntos||0, window.__juntos);
      cuerpo = {ok:true, ver:window.__ver, t:Date.now()};
      return new Promise(function(res){ setTimeout(function(){ window.__juntos--; res(new Response(JSON.stringify(cuerpo),{status:200,headers:{'Content-Type':'application/json'}})); }, 40); });
    }
    else if (a === 'admin') cuerpo = {ok:false, forbidden:true};
    else if (a === 'pedidosLight') cuerpo = {ts:1, pedidos:[], canales:[], light:true, saludSem:{}, saludMes:{}, ventasExtra:[]};
    else if (a === 'cajaLight') cuerpo = {ts:1, caja:{}, saldoBase:{}, movimientos:[], efMano:[], gastos:[], ingresos:[]};
    return Promise.resolve(new Response(JSON.stringify(cuerpo), {status:200, headers:{'Content-Type':'application/json'}}));
  };})();`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + RELOJ });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?tab=inicio&t=' + Date.now() });
    if (!await esperar(cli, `typeof go==='function'`, 90000)) throw new Error('el ERP no arrancó');
    console.log('\n== El vigía · ' + ANCHO + 'px ==\n');

    /* ── 1. Sin novedades, afloja ─────────────────────────────────── */
    if (!await esperar(cli, `window.__vers >= 8`, 60000)) throw new Error('el vigía no llegó a 8 controles');
    /* El primer valor de la lista es el arranque de la app (6 s), no el ritmo:
       la escalera se mide desde el primer control de verdad. */
    const todas = JSON.parse(await ev(cli, `JSON.stringify(window.__esperas)`));
    const esp = todas.slice(todas.indexOf(40000));
    chk('el primer control se espera 40 segundos', todas.indexOf(40000) >= 0 && esp[0] === 40000, todas.slice(0, 8));
    chk('sin novedades va aflojando: 40 s → 60 → 90 → 135 → 202 → 300',
      esp[1] === 60000 && esp[2] === 90000 && esp[3] === 135000 && esp[4] === 202500 && esp[5] === 300000, esp.slice(0, 8));
    const tope = esp.indexOf(300000);
    chk('y ahí se planta: nunca espera más de 5 minutos',
      tope > 0 && esp.slice(tope).every(x => x === 300000), esp.slice(0, 10));

    /* ── 2. Algo cambió: vuelve a los 40 segundos ─────────────────── */
    await ev(cli, `window.__esperas=[]; window.__ver='v2';`);
    if (!await esperar(cli, `(window.__esperas||[]).length >= 3`, 60000)) throw new Error('no siguió mirando');
    const esp2 = JSON.parse(await ev(cli, `JSON.stringify(window.__esperas)`));
    /* El primero de la lista puede ser el control que ya estaba programado
       antes del cambio: lo que importa es que DESPUES del cambio aparezca el
       40000 y que la cuenta arranque de nuevo desde ahi. */
    const i40 = esp2.indexOf(40000);
    chk('cuando el backend dice que algo cambió, vuelve a los 40 segundos', i40 >= 0, esp2.slice(0, 4));
    chk('y si después no pasa nada más, vuelve a aflojar', i40 >= 0 && esp2[i40 + 1] === 60000, esp2.slice(0, 4));

    /* ── 3. Con la app en segundo plano, no pregunta nada ─────────── */
    const antes = await ev(cli, `window.__vers`);
    await ev(cli, `window.__vis='hidden'; document.dispatchEvent(new Event('visibilitychange'));`);
    await pausa(2500);
    const despues = await ev(cli, `window.__vers`);
    chk('con la app en segundo plano deja de preguntar', despues - antes <= 1, { antes, despues });

    /* ── 4. Al volver, mira enseguida y desde cero ────────────────── */
    await ev(cli, `window.__esperas=[]; window.__vis='visible'; document.dispatchEvent(new Event('visibilitychange'));`);
    const volvio = await esperar(cli, `window.__vers > ${despues}`, 20000);
    chk('al volver a la app pregunta enseguida, sin esperar los 5 minutos', volvio === true);
    const esp3 = JSON.parse(await ev(cli, `JSON.stringify(window.__esperas)`));
    chk('vuelve a mirar en menos de un segundo, no a los 5 minutos', esp3[0] <= 1000, esp3.slice(0, 3));
    chk('y arranca la cuenta de nuevo en 40 segundos, no donde había quedado',
      esp3.filter(x => x >= 40000)[0] === 60000, esp3.slice(0, 4));

    /* ── 5. Nunca dos controles encimados ─────────────────────────────
       Contar cuantas veces se pregunta no sirve: en esta prueba el tiempo esta
       comprimido, asi que preguntaria miles de veces igual. Lo que importa es
       que NUNCA haya dos pedidos en vuelo a la vez, que es lo que llenaria la
       fila del Apps Script. */
    await ev(cli, `(function(){ window.__vis='visible';
      for(var i=0;i<5;i++) document.dispatchEvent(new Event('visibilitychange')); })()`);
    await pausa(1500);
    const maxJuntos = await ev(cli, `window.__maxJuntos`);
    chk('nunca hay dos controles en vuelo a la vez, por más que se lo golpee', maxJuntos === 1, { maxJuntos });

    chk('ni un error en consola', JSON.parse(await ev(cli, `JSON.stringify(window.__err||[])`)).length === 0, await ev(cli, `JSON.stringify(window.__err||[])`));
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('\n  EXPLOTÓ: ' + (e && e.message || e) + '\n'); salir(1); }
})();
