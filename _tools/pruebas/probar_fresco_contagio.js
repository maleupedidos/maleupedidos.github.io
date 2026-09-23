/* EL ROJO NO SE CONTAGIA ENTRE TABS.
 *
 *   node probar_fresco_contagio.js [390|1440]
 *
 * Backend STUBBEADO. No toca producción.
 *
 * Tadeo, 23/9/2026: "voy de tab en tab y me dice no se pudo actualizar".
 *
 * El sello de frescura se guarda POR FUENTE (`_fresco.ok` / `_fresco.err` en
 * localStorage) pero se estampaba POR TAB: cuando un ↻ terminaba mal,
 * `done(false)` llamaba a `_marcarFallo(_fuentesDeTab(tab))` — TODAS las
 * fuentes de esa tab, hubieran llegado o no.
 *
 * Inicio declara tres fuentes: `pedidos`, `caja` y `ventas`. Y pide cinco cosas
 * al servidor, dos de las cuales no son ninguna de esas tres (`cobrosPendientes`
 * y `ocLight`). O sea que si fallaba SOLO los cobros pendientes:
 *
 *   · `loadRapido` marcaba bien: pedidos ok, caja ok (lo hace por fuente);
 *   · devolvía `{ok:false}` porque algo falló;
 *   · y un renglón después `done(false)` pisaba las dos con un error.
 *
 * Y como `pedidos` y `caja` son las fuentes de Pedidos, Caja, Pagos, Estancias
 * y Objetivo, el rojo aparecía en cinco tabs donde no había fallado nada. La
 * marca de error queda guardada hasta que esa fuente vuelva a llegar bien, así
 * que el cartel viaja con él de tab en tab.
 *
 * Lo que se mide acá es la DECISIÓN —qué fuente queda marcada como fallida—,
 * que es lo que después produce el cartel en cada tab.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (c, e) => { try { return await evaluar(c, e); } catch (x) { return { __err: String(x.message || x) }; } };
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(c, e) === true) return true; await pausa(150); } return false; };

const hoyIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
/* La forma COMPACTA, que es la que manda el backend. */
const ped = (n, tot) => ({ n: String(n), c: 'Cliente ' + n, h: 'Home', es: 'Entregado',
  ep: 'Cobrado', fp: 'Efectivo', co: 0, bar: 'Estancias del Pilar', o: 'Deposito',
  p: [{ a: 'PPM', q: 1 }], $: tot, fex: hoyIso(), dee: hoyIso(),
  mc: hoyIso().slice(0, 7), f: hoyIso().slice(8, 10) + '/' + hoyIso().slice(5, 7) });

/* `ventas` tiene que contestar bien: en Inicio se pide también, y si el stub la
   rompe siempre, `ventas` queda roja en todas las mediciones y la prueba no
   distinguiría el contagio de la falla real. */
const STUB = `
  window.__gets=[]; window.__err=[]; window.__romper='';
  window.__peds=${JSON.stringify([ped(1, 100000)])};
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('maleu_plan_cache_')===0||k.indexOf('mc_')===0) localStorage.removeItem(k); });
    localStorage.removeItem('maleu_fresco');
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      if(a===window.__romper) return Promise.reject(new Error('se corto la red'));
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo={ts:1,pedidos:window.__peds,canales:[],light:true,saludSem:{},saludMes:{},ventasExtra:[]};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='ventas') cuerpo={ok:true,v:[],cuentas:[]};
      else if(a==='crmLeads') cuerpo={ok:true,ts:1,leads:[]};
      else if(a==='catering') cuerpo={ok:true,events:[]};
      else if(a==='admin') cuerpo={ok:true,pedidos:window.__peds,canales:[],config:[],oc:{lista:[]}};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},120);});
    }
    return o.apply(this,arguments); }; })();`;

const SELLO = `JSON.stringify({ok:_fresco.ok,err:_fresco.err})`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + STUB });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?tab=inicio&t=' + Date.now() });
    if (!await esperar(cli, `typeof go==='function' && typeof refreshContextual==='function'`, 90000)) throw new Error('el ERP no arrancó');
    await ev(cli, `go('inicio')`);
    await pausa(1200);
    console.log('\n== El rojo no se contagia entre tabs · ' + ANCHO + 'px ==');

    /* El ↻ se toca SIEMPRE parado en Inicio: es la tab que se abre sola y la
       única que declara tres fuentes. */
    async function tocarEnInicio(romper) {
      await ev(cli, `go('inicio'); window.__romper=${JSON.stringify(romper || '')}; window.__gets=[];`);
      await pausa(300);
      await ev(cli, `refreshContextual();`);
      if (!await esperar(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`, 90000)) throw new Error('el ↻ quedó girando');
      await pausa(400);
      return JSON.parse(await ev(cli, `JSON.stringify(window.__gets||[])`));
    }
    const rojo = async f => await ev(cli, `_frescoErr(${JSON.stringify(f)})`);

    /* ── De qué vive cada tab ─────────────────────────────────────── */
    console.log('\n-- las fuentes que comparten las tabs --');
    const fsInicio = JSON.parse(await ev(cli, `JSON.stringify(_fuentesDeTab('inicio'))`));
    chk('Inicio declara pedidos, caja y ventas', fsInicio.indexOf('pedidos') >= 0 && fsInicio.indexOf('caja') >= 0 && fsInicio.indexOf('ventas') >= 0, fsInicio);
    chk('Pedidos y Estancias miran la MISMA fuente que Inicio',
      (await ev(cli, `JSON.stringify(_fuentesDeTab('pedidos'))`)) === '["pedidos"]' &&
      (await ev(cli, `JSON.stringify(_fuentesDeTab('estancias'))`)) === '["pedidos"]');
    chk('Caja y Pagos también', (await ev(cli, `JSON.stringify(_fuentesDeTab('caja'))`)) === '["caja"]' &&
      (await ev(cli, `JSON.stringify(_fuentesDeTab('egresos'))`)) === '["caja"]');

    /* ── 1. Falla algo que NINGUNA tab declara como fuente ─────────
       `cobrosPendientes` no está en el sello de nadie. Su caída no puede
       pintar de rojo a los pedidos, que llegaron bien en el mismo refresco. */
    console.log('\n-- se cortan los cobros pendientes (que no son fuente de ninguna tab) --');
    let g = await tocarEnInicio('cobrosPendientes');
    chk('el refresco de Inicio pide los cobros pendientes', g.indexOf('cobrosPendientes') >= 0, g);
    chk('los pedidos llegaron, así que NO quedan en rojo', await rojo('pedidos') === false, await ev(cli, SELLO));
    chk('la caja llegó, así que NO queda en roja', await rojo('caja') === false, await ev(cli, SELLO));
    chk('las ventas llegaron, así que NO quedan en rojo', await rojo('ventas') === false, await ev(cli, SELLO));

    /* ── 2. Falla UNA de las tres fuentes de Inicio ────────────────
       Ventas sí es fuente: tiene que quedar roja. Las otras dos no. */
    console.log('\n-- se cortan las ventas (que SÍ son fuente de Inicio) --');
    await tocarEnInicio('ventas');
    chk('Ventas queda en rojo, que es la que falló', await rojo('ventas') === true, await ev(cli, SELLO));
    chk('pero los pedidos NO: llegaron bien en el mismo ↻', await rojo('pedidos') === false, await ev(cli, SELLO));
    chk('y la caja tampoco', await rojo('caja') === false, await ev(cli, SELLO));

    /* Y eso es lo que se ve: el cartel de la tab Pedidos. */
    await ev(cli, `go('pedidos')`);
    await pausa(500);
    const cartelPed = await ev(cli, `(document.getElementById('hdrRefreshTime')||{}).textContent`);
    chk('parado en Pedidos el botón NO dice "No se pudo"', cartelPed !== 'No se pudo', { cartel: cartelPed, sello: await ev(cli, SELLO) });

    await ev(cli, `go('ventas')`);
    await pausa(500);
    const cartelVen = await ev(cli, `(document.getElementById('hdrRefreshTime')||{}).textContent`);
    chk('parado en Ventas SÍ lo dice: ahí es donde falló de verdad', cartelVen === 'No se pudo', { cartel: cartelVen });

    /* ── 3. Falla la caja ──────────────────────────────────────────
       El caso al revés: la que falla es la de otra tab. */
    console.log('\n-- se corta la caja --');
    await tocarEnInicio('cajaLight');
    chk('la caja queda en rojo', await rojo('caja') === true, await ev(cli, SELLO));
    chk('los pedidos no', await rojo('pedidos') === false, await ev(cli, SELLO));

    /* ── 4. Se cae todo ───────────────────────────────────────────
       El sello no puede volverse optimista: si de verdad no llegó nada, rojo. */
    console.log('\n-- se cortan los pedidos --');
    await tocarEnInicio('pedidosLight');
    chk('si los pedidos no llegan, SÍ quedan en rojo', await rojo('pedidos') === true, await ev(cli, SELLO));

    /* ── 5. Y vuelve a verde cuando sale bien ─────────────────────── */
    console.log('\n-- vuelve a andar --');
    await tocarEnInicio('');
    chk('un ↻ que sale bien limpia todos los errores anteriores',
      await rojo('pedidos') === false && await rojo('caja') === false && await rojo('ventas') === false, await ev(cli, SELLO));
    const cartelOk = await ev(cli, `(document.getElementById('hdrRefreshTime')||{}).textContent`);
    chk('y el botón dice que está al día', cartelOk === 'recién', { cartel: cartelOk });

    chk('ni un error en consola', JSON.parse(await ev(cli, `JSON.stringify(window.__err||[])`)).length === 0, await ev(cli, `JSON.stringify(window.__err||[])`));
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('\n  EXPLOTÓ: ' + (e && e.message || e) + '\n'); salir(1); }
})();
