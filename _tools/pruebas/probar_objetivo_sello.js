/* EL SELLO DE FRESCURA DE OBJETIVO: qué dice el botón ↻ cuando algo falla.
 *
 *   node probar_objetivo_sello.js [390|1440]
 *
 * Backend STUBBEADO. No toca producción.
 *
 * Por qué existe (23/9/2026): Tadeo abrió Objetivo y el botón decía
 * "No se pudo". La rama de esta tab traga los dos errores posibles
 * (`.catch(() => null)` y un `load()` que RESUELVE `{ok:false}`), así que
 * siempre llamaba a `done(true)`. O sea que el botón no podía decir la verdad
 * en ninguna de las dos direcciones:
 *
 *   - si los objetivos o el volcado fallaban, estampaba la hora igual (mentía
 *     en verde: "recién", con los números de antes en pantalla);
 *   - y una marca de error vieja, guardada en localStorage de cuando esta tab
 *     todavía no declaraba `planMes` como fuente, se quedaba pegada sin que
 *     ningún refresco la pudiera limpiar.
 *
 * Lo que se mide es EL CARTEL, que es lo único que Tadeo ve.
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

const PED = [{ 'Nº': 1, Cliente: 'Uno', 'Estado de Entrega': 'Entregado',
  'Fecha Entregado': '2026-09-22', 'Fecha Estimada de Entrega': '2026-09-22',
  Total: 100000, Canal: 'Venta Directa', Barrio: 'Estancias del Pilar' }];
const PLAN = { ok: true, mes: 'Septiembre 2026', yyyy: 2026, mm: 9, diasMes: 30, diasTrans: 23,
  metas: { 'Total|': { canal: 'Total', barrio: '', metaFact: 22000000, metaPedidos: 0, metaTicket: 0, metaClientes: 0, metaCasas: 0, semanales: '', semanalesM: '', semanalesP: '', notas: '' } },
  objetivos: [], real: {}, acciones: [], origen: [], barriosHome: ['Estancias del Pilar'], canalesPrincipales: ['Venta Directa'] };

/* `modo` decide qué se rompe. `errViejo` siembra una marca de error guardada,
   como la que quedó en el teléfono de Tadeo antes de que la tab declarara
   `planMes` entre sus fuentes. */
function fuente(modo, errViejo) {
  return `
  window.__gets=[]; window.__err=[];
  window.addEventListener('error',function(e){window.__err.push(String(e.message));});
  if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('maleu_plan_cache_')===0||k.indexOf('mc_')===0) localStorage.removeItem(k); });
    ${errViejo ? `localStorage.setItem('maleu_fresco', JSON.stringify({ok:{volcado:Date.now()-3600000},err:{planMes:Date.now()-1800000}}));` : `localStorage.removeItem('maleu_fresco');`}
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      if(a==='planMes' && '${modo}'==='sinPlan') return Promise.reject(new Error('se corto la red'));
      var cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo={ts:1,pedidos:${JSON.stringify(PED)},canales:[],light:true,saludSem:{},saludMes:{},ventasExtra:[]};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='crmLeads') cuerpo={ok:true,ts:1,leads:[]};
      else if(a==='catering') cuerpo={ok:true,events:[]};
      else if(a==='planMes') cuerpo=${JSON.stringify(PLAN)};
      else if(a==='admin') cuerpo=('${modo}'==='sinVolcado') ? {ok:false,forbidden:true}
                                : {ok:true,pedidos:${JSON.stringify(PED)},canales:[],config:[],oc:{lista:[]}};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},120);});
    }
    return o.apply(this,arguments); }; })();`;
}

const CARTEL = `(document.getElementById('hdrRefreshTime')||{}).textContent`;
const SELLO = `JSON.stringify({ok:_fresco.ok,err:_fresco.err,err_planMes:_frescoErr('planMes'),err_volcado:_frescoErr('volcado')})`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  let script = null;
  async function escena(modo, errViejo) {
    if (script) await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
    script = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + fuente(modo, errViejo) })).identifier;
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?tab=inicio&t=' + Date.now() });
    if (!await esperar(cli, `typeof go==='function' && typeof refreshContextual==='function'`, 90000)) throw new Error('el ERP no arrancó');
    await ev(cli, `go('planificacion')`);
    await pausa(1200);
  }
  async function tocarActualizar() {
    await ev(cli, `window.__gets=[]; refreshContextual();`);
    if (!await esperar(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`, 60000)) throw new Error('el ↻ quedó girando');
    await pausa(400);
  }

  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Objetivo · qué dice el botón ↻ · ' + ANCHO + 'px ==');

    /* ── 1. Todo bien: tiene que decir una hora ───────────────────── */
    console.log('\n-- todo contesta bien --');
    await escena('ok', false);
    await tocarActualizar();
    let c = await ev(cli, CARTEL);
    chk('con todo bien el botón dice una hora, no un error', c === 'recién', { cartel: c, sello: await ev(cli, SELLO) });

    /* ── 2. Los objetivos no llegan ───────────────────────────────── */
    console.log('\n-- se corta la red al pedir los objetivos --');
    await escena('sinPlan', false);
    await tocarActualizar();
    c = await ev(cli, CARTEL);
    chk('si los objetivos no llegan, el botón NO dice que está al día', c !== 'recién', { cartel: c, sello: await ev(cli, SELLO) });
    chk('y lo dice con todas las letras', c === 'No se pudo', { cartel: c });

    /* ── 3. El volcado no llega ───────────────────────────────────── */
    console.log('\n-- el volcado vuelve vacío (sin permiso) --');
    await escena('sinVolcado', false);
    await tocarActualizar();
    c = await ev(cli, CARTEL);
    chk('si el volcado falla, el botón NO dice que está al día', c !== 'recién', { cartel: c, sello: await ev(cli, SELLO) });

    /* ── 4. Una marca de error vieja NO se queda pegada ─────────────
       Se intentó reproducir acá el caso "el botón arrastra un No se pudo de
       ayer": se siembra la marca de error en localStorage y se abre la tab.
       NO se puede: abrir Objetivo ya llama a `planLoad()`, y en cuanto esa
       vuelve bien el sello se limpia solo. Queda escrito porque es la
       conclusión, no un hueco de la prueba — si el botón dice "No se pudo",
       algo está fallando AHORA; no es basura guardada de antes. */
    console.log('\n-- arrastra una marca de error guardada de antes --');
    await escena('ok', true);
    await tocarActualizar();
    c = await ev(cli, CARTEL);
    chk('una marca de error vieja no sobrevive a una actualización que sale bien', c === 'recién', { cartel: c, sello: await ev(cli, SELLO) });

    chk('ni un error en consola', JSON.parse(await ev(cli, `JSON.stringify(window.__err||[])`)).length === 0, await ev(cli, `JSON.stringify(window.__err||[])`));
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('\n  EXPLOTÓ: ' + (e && e.message || e) + '\n'); salir(1); }
})();
