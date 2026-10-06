/* LA TAB PEDIDOS DESDE LA BASE, EN PRODUCCION (6/10/2026).

     TOKEN=$(python _tools/pruebas/leer_sesion.py) node _tools/pruebas/verificar_pedidos_pg_vivo.js

   Sin simular nada: abre app.maleu.com.ar con una sesion real, el permiso de
   Supabase sale de Apps Script con la palanca de Config_Maleu tal cual esta, y
   la tab Pedidos decide sola de donde lee. Los POST van interceptados por el PREP
   (no escribe nada). Es UNA carga real: no lo corras en serie.
   Dice de donde salieron los pedidos (`__pedFuente`), cuantos y cuantas OCs. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'https://app.maleu.com.ar';
if (!process.env.TOKEN) { console.error('falta TOKEN'); process.exit(2); }
const pausa = ms => new Promise(r => setTimeout(r, ms));
/* La PRIMERA carga sale sin permiso guardado: lo pide de nuevo y trae la palanca
   de hoy. Sin permiso guardado la tab no espera y va a Apps Script (a proposito),
   asi que lo que se mide es la SEGUNDA, que es como abre un usuario de verdad. */
/* FORZAR=1: la palanca pedidosPg prendida SOLO en este navegador (para medir
   sin prenderla en Config_Maleu). Sin FORZAR, la palanca es la de la planilla. */
const FORZAR = process.env.FORZAR ? `(function(){ var o=window.fetch; window.fetch=function(u){ var url=String((u&&u.url)||u||'');
  if(url.indexOf('script.google.com')>-1&&url.indexOf('action=sbToken')>-1) return o.apply(this,arguments).then(function(r){ return r.json().then(function(d){
    d=d||{}; if(d.sb){ d.sb.pal=d.sb.pal||{}; d.sb.pal.pedidosPg=true; } d.palancas=d.palancas||{}; d.palancas.pedidosPg=true;
    return new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}); }); });
  return o.apply(this,arguments); }; })();` : '';
const LIMPIAR = `try{ if(!sessionStorage.getItem('__vivo')){ ['mc_sbtok','mc_sbtok_no'].forEach(function(k){ localStorage.removeItem(k); }); sessionStorage.setItem('__vivo','1'); } }catch(e){}`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(process.env.TOKEN) + ';' + LIMPIAR + ';' + FORZAR });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?x=' + Date.now() });
  for (let i = 0; i < 240; i++) { if (await evaluar(cli, "typeof go==='function'&&!!localStorage.getItem('mc_sbtok')")) break; await pausa(250); }
  console.log('permiso guardado:', await evaluar(cli, "!!localStorage.getItem('mc_sbtok')"));
  await cli.enviar('Page.reload', { ignoreCache: true });
  await pausa(1500);
  for (let i = 0; i < 240; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  const t0 = Date.now();
  await evaluar(cli, 'go("pedidos"); 1');
  for (let i = 0; i < 240; i++) {
    if (await evaluar(cli, "!!window.__pedFuente&&typeof D==='object'&&D&&Array.isArray(D.pedidos)&&D.pedidos.length>100")) break;
    await pausa(250);
  }
  /* Antes de la foto pinta el atajo de los 400 mas nuevos (_sbPedidos): se
     sigue la cuenta hasta que queda quieta, si no se mide un estado de paso. */
  const serie = [];
  /* Y no alcanza con que quede quieta: `loadRapido` vuelca la foto recien
     cuando vuelven TAMBIEN cobros y caja, que van a Apps Script (en frio
     despues de un deploy, 20-28 s). Se espera a que termine el lote entero. */
  for (let i = 0; i < 180; i++) {
    const n = await evaluar(cli, "(typeof D==='object'&&D&&D.pedidos||[]).length");
    if (!serie.length || serie[serie.length - 1][1] !== n) serie.push([((Date.now() - t0) / 1000).toFixed(1) + ' s', n]);
    if (await evaluar(cli, "typeof _rapidoEnVuelo==='object'&&!_rapidoEnVuelo.completo&&!_rapidoEnVuelo.soloPedidos&&!!D._lightTs")) break;
    await pausa(500);
  }
  console.log('pedidos en memoria (cuando cambia):', JSON.stringify(serie));
  const r = await evaluar(cli, `({ fuente: window.__pedFuente||null, n: (D&&D.pedidos||[]).length,
    oc: (D&&D.oc&&D.oc.lista||[]).length, pal: (function(){ try{ return JSON.parse(localStorage.getItem('mc_sbtok')||'{}').sb.pal||null; }catch(e){ return null; } })(),
    filas: document.querySelectorAll('#p-pedidos .ped-card, #p-pedidos [data-ped]').length,
    err: (window.__err||[]).slice(0,5) })`);
  r.ms = Date.now() - t0;
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.fuente && r.fuente.de === 'pg' ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
