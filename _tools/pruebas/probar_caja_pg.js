/* LA CAJA DESDE SUPABASE, EN LA CARGA COMPLETA (6/10/2026, rama supabase).

     TOKEN=$(python _tools/pruebas/leer_sesion.py) BASE=http://localhost:8113 node _tools/pruebas/probar_caja_pg.js

   Lo que encontro Back 1 con PEDIDOS_DESDE_PG prendida: la tab Pedidos tardaba
   4,9 s igual, porque la carga completa esperaba `cobrosPendientes` y
   `cajaLight` de Apps Script. Con `CAJA_DESDE_PG`, esas dos salen de sus fotos.

   CASI SIN CARGAR APPS SCRIPT: al arrancar se le piden TRES cosas de verdad
   (`sbToken`, `cajaLight`, `cobrosPendientes`), una vez, para armar las fotos de
   la caja con datos reales (esas fotos no existen en produccion hasta publicar).
   La foto de pedidos y el permiso de Supabase son los de produccion. Todo lo
   demas que el ERP le pide a Apps Script se contesta en la pagina, sin red.

   Sostiene:
   · «ok» (las dos palancas): la carga completa NO le pide a Apps Script ni
     pedidos, ni OCs, ni caja, ni cobros; caja y cobros son los de la foto; el
     sello de la caja es la hora del latido;
   · «sincaja» (solo PEDIDOS_DESDE_PG): pedidos de la base, caja y cobros de Apps
     Script — que es lo que vio Back 1;
   · «porpantalla»: la confirmacion global tiene 20 min pero la de caja y cobros
     es de hace 2 → la caja sale de la base (una cara no frena a las otras);
   · «unafalla»: la de cobros falta y la global es vieja → caja Y cobros a Apps
     Script (es plata: no se mezclan dos horas);
   · «otro»: alguien escribio despues del latido → todo a Apps Script, y lo dice. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const { execFileSync } = require('child_process');
const BASE = process.env.BASE || 'http://localhost:8080';
if (!process.env.TOKEN) { console.error('falta TOKEN'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const API = 'https://script.google.com/macros/s/AKfycbxmrG5YVSshcYezk8lXFx_uxb7NFGcb9EfTXc7dsIN4rZyj73CET4mk_aKPFPDY2wNi/exec';
const get = a => JSON.parse(execFileSync('curl', ['-sL', '--max-time', '150',
  API + '?action=' + a + '&token=' + encodeURIComponent(process.env.TOKEN) + '&t=' + Date.now()]).toString('utf8'));
/* En memoria, nunca a disco. */
const SB = get('sbToken').sb;
if (!SB || !SB.token) { console.error('sbToken no dio permiso'); process.exit(2); }
const CAJA = get('cajaLight'), COB = get('cobrosPendientes');
if (!CAJA || !Array.isArray(CAJA.movimientos) || !COB || !Array.isArray(COB.cobros)) { console.error('no vinieron caja y cobros'); process.exit(2); }

const STUB = esc => `(function(){
  var esc=${JSON.stringify(esc)}, SB=${JSON.stringify(SB)}, CAJA=${JSON.stringify(CAJA)}, COB=${JSON.stringify(COB)};
  window.__gets=[]; window.__verT = esc==='otro' ? Date.now()-60e3 : Date.now()-10*60e3;
  var ahora=Date.now(), fresco=new Date(ahora-2*60e3).toISOString(), viejo=new Date(ahora-20*60e3).toISOString();
  var estado = [{domain:'foto',confirmed_at: (esc==='porpantalla'||esc==='unafalla')?viejo:fresco}];
  if(esc==='porpantalla'){ estado.push({domain:'foto:cajaLight',confirmed_at:fresco},{domain:'foto:cobrosPendientes',confirmed_at:fresco},{domain:'foto:pedidos',confirmed_at:fresco},{domain:'foto:ocLight',confirmed_at:fresco}); }
  if(esc==='unafalla'){ estado.push({domain:'foto:cajaLight',confirmed_at:fresco},{domain:'foto:pedidos',confirmed_at:fresco},{domain:'foto:ocLight',confirmed_at:fresco}); }
  try{
    ['maleu_ult_post','ma3','mc_sbtok_no','mc_cajaTs'].forEach(function(k){ localStorage.removeItem(k); });
    var sb=JSON.parse(JSON.stringify(SB)); sb.pal={pedidosPg:true, cajaPg: esc!=='sincaja'};
    localStorage.setItem('mc_sbtok', JSON.stringify({u:'tadeo', sb:sb, hasta:Date.now()+50*60e3}));
  }catch(e){}
  function resp(txt,st){ return Promise.resolve(new Response(txt,{status:st||200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase.co')>-1){
      var q=decodeURIComponent(url.split('/rest/v1/')[1]||url);
      if(q.indexOf('replica_status')===0){
        var pide=(q.match(/domain=in\\.\\(([^)]*)\\)/)||[])[1]||'foto';
        return resp(JSON.stringify(estado.filter(function(e){ return pide.indexOf('"'+e.domain+'"')>-1 || pide===e.domain; })));
      }
      if(q.indexOf('erp_screen_snapshot')===0&&/cajaLight|cobrosPendientes/.test(q)){
        /* La foto real de pedidos (si se pidio), mas caja y cobros reales. */
        var real=/pedidos|ocLight/.test(q)?o.apply(this,arguments).then(function(r){ return r.json(); }):Promise.resolve([]);
        return real.then(function(filas){
          filas=(filas||[]).filter(function(f){ return f.screen!=='cajaLight'&&f.screen!=='cobrosPendientes'; });
          if(q.indexOf('cajaLight')>-1)filas.push({screen:'cajaLight',payload:CAJA,computed_at:new Date(ahora-3*60e3).toISOString()});
          if(q.indexOf('cobrosPendientes')>-1)filas.push({screen:'cobrosPendientes',payload:COB,computed_at:new Date(ahora-3*60e3).toISOString()});
          return new Response(JSON.stringify(filas),{status:200,headers:{'Content-Type':'application/json'}});
        });
      }
      return o.apply(this,arguments);
    }
    if(url.indexOf('script.google.com')>-1){
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
      if(a==='lote'){ ((url.match(/acciones=([^&]+)/)||[])[1]||'').split(',').forEach(function(z){ window.__gets.push(z); }); }
      else window.__gets.push(a);
      if(a==='ver')return resp(JSON.stringify({ok:true,ver:String(window.__verT)+'abcd',t:Date.now()}));
      if(a==='sbToken')return resp(JSON.stringify({ok:true,sb:SB,palancas:{pedidosPg:true,cajaPg:esc!=='sincaja'}}));
      return resp('{"ok":false,"error":"sin Apps Script en esta prueba"}');
    }
    return o.apply(this,arguments);
  };
})();`;

async function abrirErp(esc) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(process.env.TOKEN) + ';' + STUB(esc) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'&&typeof loadRapido==='function'")) break; await pausa(250); }
  /* La carga COMPLETA, la que esperaba a cobros y caja. */
  await evaluar(cli, 'window.__gets=[]; window.__fin=0; loadRapido().then(function(){ window.__fin=Date.now(); }); 1');
  for (let i = 0; i < 160; i++) { if (await evaluar(cli, 'window.__fin>0')) break; await pausa(250); }
  return cli;
}
const LEER = `({ gets: window.__gets.slice(), ped: window.__pedFuente||null, caja: window.__cajaFuente||null,
  cobros: (D&&Array.isArray(D.cobrosPendientes))?D.cobrosPendientes.length:-1, movs: (D&&Array.isArray(D.movimientos))?D.movimientos.length:-1,
  cajaTs: _cajaTs, err: (window.__err||[]).slice(0,5) })`;

(async () => {
  console.log('\n== La caja desde la base, en la carga completa (casi sin cargar Apps Script) ==\n');
  for (const esc of (process.env.CASO ? process.env.CASO.split(',') : ['ok', 'sincaja', 'porpantalla', 'unafalla', 'otro'])) {
    console.log('-- ' + esc);
    const cli = await abrirErp(esc);
    const r = await evaluar(cli, LEER);
    const pidio = a => r.gets.indexOf(a) > -1;
    const cajaBase = !!r.caja && r.caja.de === 'pg';
    if (esc === 'ok' || esc === 'porpantalla') {
      chk(esc + ': ni pedidos, ni OCs, ni caja, ni cobros a Apps Script',
        !pidio('pedidosLight') && !pidio('ocLight') && !pidio('cajaLight') && !pidio('cobrosPendientes'), r.gets);
      chk(esc + ': caja y cobros son los de la foto (' + r.movs + ' movimientos, ' + r.cobros + ' cobros)',
        cajaBase && r.movs === CAJA.movimientos.length && r.cobros === COB.cobros.length, r);
      chk(esc + ': el sello de la caja es la hora del latido', cajaBase && Math.abs(r.cajaTs - r.caja.t) < 1000, { cajaTs: r.cajaTs, caja: r.caja });
    } else if (esc === 'sincaja') {
      chk('sincaja: pedidos de la base', !!r.ped && r.ped.de === 'pg' && !pidio('pedidosLight'), r);
      chk('sincaja: caja y cobros a Apps Script (lo que vio Back 1)', pidio('cajaLight') && pidio('cobrosPendientes') && r.caja === null, r);
    } else if (esc === 'unafalla') {
      chk('unafalla: caja Y cobros a Apps Script (no se mezclan dos horas)', pidio('cajaLight') && pidio('cobrosPendientes') && !cajaBase, r);
      chk('unafalla: y dice cuál falta', !!r.caja && /cobrosPendientes/.test(r.caja.porque || ''), r.caja);
    } else if (esc === 'otro') {
      chk('otro: todo a Apps Script', pidio('pedidosLight') && pidio('cajaLight') && pidio('cobrosPendientes'), r.gets);
      chk('otro: y dice que se escribió después', !!r.caja && /se escribió algo/.test(r.caja.porque || '') && /se escribió algo/.test((r.ped || {}).porque || ''), { ped: r.ped, caja: r.caja });
    }
    chk(esc + ': sin errores de consola', r.err.length === 0, r.err);
    cli.matar();
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
