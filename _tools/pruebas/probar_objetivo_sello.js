/* OBJETIVO: qué pide el botón ↻, y qué dice cuando algo falla.
 *
 *   node probar_objetivo_sello.js [390|1440]
 *
 * Backend STUBBEADO. No toca producción.
 *
 * Dos cosas distintas se miden acá, las dos del 23/9/2026 y las dos reportadas
 * por Tadeo en el mismo día:
 *
 * 1. QUÉ PIDE. La tab pedía `action=admin` —el volcado entero, 924 KB— y de
 *    todo eso usa nada más que `D.pedidos` y `D.ventasExtra`. Peor: el volcado
 *    completo no tiene cache del lado del servidor (su clave es `null`) y el
 *    calentador tampoco lo alcanza, así que se recalculaba entero, ~28 s, cada
 *    vez. `pedidosLight` trae lo mismo que esta tab necesita, está cacheado y
 *    el backend lo anota en ~3 s.
 *
 * 2. QUÉ DICE. La rama tragaba los dos errores posibles —un `catch` que
 *    devolvía `null`, y cargas que RESUELVEN `{ok:false}` en vez de rechazar—
 *    y terminaba siempre en `done(true)`: si los objetivos no llegaban, el
 *    botón estampaba la hora igual y decía "recién" con los números de antes.
 *    Mentir en verde es lo único que un ↻ no puede hacer.
 *
 * Se mide EL CARTEL y LOS PEDIDOS AL SERVIDOR, que es lo único que se ve.
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

/* Un pedido entregado HOY, para que el renglón HOY tenga de dónde agarrarse.
   La fecha la pone el propio navegador: acá no interesa el número, interesa
   que se vuelva a dibujar con los pedidos nuevos. */
const hoyIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
/* La forma COMPACTA, que es la que manda el backend y la que lee `_rtSumar`:
   `c` cliente, `$` total, `h` canal, `fex` fecha de entrega, `dee` la estimada.
   Con los nombres largos de la planilla el motor de plata no lo cuenta y el
   renglón HOY dice "$0 entregado" para siempre. */
const ped = (n, tot) => ({ n: String(n), c: 'Cliente ' + n, h: 'Home', es: 'Entregado',
  ep: 'Cobrado', fp: 'Efectivo', co: 0, bar: 'Estancias del Pilar', o: 'Deposito',
  p: [{ a: 'PPM', q: 1 }], $: tot, fex: hoyIso(), dee: hoyIso(),
  mc: hoyIso().slice(0, 7), f: hoyIso().slice(8, 10) + '/' + hoyIso().slice(5, 7) });
const PLAN = { ok: true, mes: 'Septiembre 2026', yyyy: 2026, mm: 9, diasMes: 30, diasTrans: 23,
  metas: { 'Total|': { canal: 'Total', barrio: '', metaFact: 22000000, metaPedidos: 0, metaTicket: 0, metaClientes: 0, metaCasas: 0, semanales: '', semanalesM: '', semanalesP: '', notas: '' } },
  objetivos: [], real: {}, acciones: [], origen: [], barriosHome: ['Estancias del Pilar'], canalesPrincipales: ['Venta Directa'] };

/* `window.__romper` se cambia DESDE la prueba, ya con la app arriba: romper
   `pedidosLight` desde el arranque dejaría al ERP sin cargar nunca y la prueba
   mediría eso en vez de lo que quiere medir. */
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
      else if(a==='crmLeads') cuerpo={ok:true,ts:1,leads:[]};
      else if(a==='catering') cuerpo={ok:true,events:[]};
      else if(a==='planMes') cuerpo=${JSON.stringify(PLAN)};
      else if(a==='admin') cuerpo={ok:true,pedidos:window.__peds,canales:[],config:[],oc:{lista:[]}};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},120);});
    }
    return o.apply(this,arguments); }; })();`;

const CARTEL = `(document.getElementById('hdrRefreshTime')||{}).textContent`;
const SELLO = `JSON.stringify({ok:_fresco.ok,err:_fresco.err,err_planMes:_frescoErr('planMes'),err_pedidos:_frescoErr('pedidos')})`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + STUB });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?tab=inicio&t=' + Date.now() });
    if (!await esperar(cli, `typeof go==='function' && typeof refreshContextual==='function'`, 90000)) throw new Error('el ERP no arrancó');
    await ev(cli, `go('planificacion')`);
    await pausa(1500);
    console.log('\n== Objetivo · qué pide el ↻ y qué dice · ' + ANCHO + 'px ==');

    async function tocar(romper) {
      await ev(cli, `window.__romper=${JSON.stringify(romper || '')}; window.__gets=[]; refreshContextual();`);
      if (!await esperar(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`, 60000)) throw new Error('el ↻ quedó girando');
      await pausa(400);
      return JSON.parse(await ev(cli, `JSON.stringify(window.__gets||[])`));
    }

    /* ── 1. Qué le pide al servidor ───────────────────────────────── */
    console.log('\n-- qué pide --');
    let g = await tocar('');
    chk('NO pide el volcado entero: de 924 KB sin cache usaba sólo los pedidos',
      g.indexOf('admin') < 0, g);
    chk('pide los pedidos livianos, que están cacheados del lado del servidor',
      g.indexOf('pedidosLight') >= 0, g);
    chk('y pide los objetivos SIN esperar a los pedidos',
      g.indexOf('planMes') >= 0 && g.indexOf('planMes') < g.indexOf('pedidosLight'), g);
    chk('el sello mira las dos fuentes de esta tab',
      (await ev(cli, `JSON.stringify(_fuentesDeTab('planificacion'))`)) === '["pedidos","planMes"]',
      await ev(cli, `JSON.stringify(_fuentesDeTab('planificacion'))`));

    /* ── 2. Se repinta con los pedidos que acaban de llegar ────────
       Las dos cargas van en paralelo: si `planLoad` vuelve primero, el renglón
       HOY quedaba dibujado con los pedidos de antes. */
    console.log('\n-- se repinta con lo que acaba de llegar --');
    const antes = await ev(cli, `(document.getElementById('planHoy')||{}).textContent||''`);
    await ev(cli, `window.__peds=[${JSON.stringify(ped(1, 100000))},${JSON.stringify(ped(2, 777000))}];`);
    await tocar('');
    const despues = await ev(cli, `(document.getElementById('planHoy')||{}).textContent||''`);
    chk('el renglón HOY se vuelve a dibujar con los pedidos nuevos',
      typeof despues === 'string' && despues !== antes && /877\.000|entregado/.test(despues), { antes: String(antes).slice(0, 90), despues: String(despues).slice(0, 90) });

    /* El camino AUTOMATICO: el vigía trae pedidos nuevos y el panel avisa a la
       tab por `_SECCION.planificacion` → `planRepintarPorD`. Esa función
       repintaba el total, los objetivos, las acciones y el origen, pero NO el
       renglón HOY ni el fin de semana — que son los dos que se calculan sobre
       los pedidos, o sea los únicos que de verdad cambian. Entraba una venta,
       el resto de la tab se movía y "entregado hoy" seguía igual. (23/9/2026) */
    const hoyAntes = await ev(cli, `(document.getElementById('planHoy')||{}).textContent||''`);
    await ev(cli, `D.pedidos = D.pedidos.concat([${JSON.stringify(ped(3, 333000))}]); window.planRepintarPorD();`);
    await pausa(300);
    const hoyDespues = await ev(cli, `(document.getElementById('planHoy')||{}).textContent||''`);
    chk('cuando llegan pedidos solos, HOY también se repinta (no sólo el resto de la tab)',
      typeof hoyDespues === 'string' && hoyDespues !== hoyAntes,
      { antes: String(hoyAntes).slice(0, 90), despues: String(hoyDespues).slice(0, 90) });

    /* ── 3. Qué dice cuando algo falla ────────────────────────────── */
    console.log('\n-- se corta la red al pedir los objetivos --');
    await tocar('planMes');
    let c = await ev(cli, CARTEL);
    chk('si los objetivos no llegan, el botón NO dice que está al día', c !== 'recién', { cartel: c, sello: await ev(cli, SELLO) });
    chk('y lo dice con todas las letras', c === 'No se pudo', { cartel: c });

    console.log('\n-- se corta la red al pedir los pedidos --');
    await tocar('pedidosLight');
    c = await ev(cli, CARTEL);
    chk('si la plata no llega, el botón NO dice que está al día', c !== 'recién', { cartel: c, sello: await ev(cli, SELLO) });

    /* ── 4. Y vuelve a verde cuando sale bien ──────────────────────
       De paso queda medido que una marca de error NO se queda pegada: si el
       botón dice "No se pudo", algo está fallando AHORA. */
    console.log('\n-- vuelve a andar --');
    await tocar('');
    c = await ev(cli, CARTEL);
    chk('una actualización que sale bien limpia el error anterior', c === 'recién', { cartel: c, sello: await ev(cli, SELLO) });

    chk('ni un error en consola', JSON.parse(await ev(cli, `JSON.stringify(window.__err||[])`)).length === 0, await ev(cli, `JSON.stringify(window.__err||[])`));
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('\n  EXPLOTÓ: ' + (e && e.message || e) + '\n'); salir(1); }
})();
