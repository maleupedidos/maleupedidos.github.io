/* LA TAB CRM Y LO QUE ESCRIBE OTRO APARATO (6/10/2026, rama supabase).

     TOKEN=$(python _tools/pruebas/leer_sesion.py) BASE=http://localhost:8113 node _tools/pruebas/probar_crm_sello.js

   SIN CARGAR APPS SCRIPT: se le pide UN `sbToken` al arrancar (para tener un
   permiso de Supabase de verdad) y despues todo lo que el ERP le pide a Apps
   Script se contesta en la pagina, sin red. Supabase es el real: la foto de los
   clientes y su permiso son los de produccion. Se simulan el latido y el sello
   de escritura (`action=ver`, con la hora en `window.__verT`).

   Sostiene, en Personas (Estancias › Personas) con `CRM_DESDE_PG`:
   · «base»: la ultima escritura es ANTERIOR al latido → la lista sale de la
     base y no se le pide `crmClientes` a Apps Script;
   · «otro»: alguien escribio DESPUES del latido → va a Apps Script y lo dice;
   · «vigia»: abre de la base; otro aparato escribe; el vigia se entera y su
     refresco va a Apps Script, no a la misma foto.

   Para el camino completo con la planilla de verdad: probar_crm_pg.js. */
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
/* El unico pedido a Apps Script de toda la prueba. En memoria, nunca a disco. */
const SB = JSON.parse(execFileSync('curl', ['-sL', '--max-time', '120',
  API + '?action=sbToken&token=' + encodeURIComponent(process.env.TOKEN) + '&t=' + Date.now()]).toString('utf8')).sb;
if (!SB || !SB.token) { console.error('sbToken no dio permiso'); process.exit(2); }

const STUB = esc => `(function(){
  var esc=${JSON.stringify(esc)}, SB=${JSON.stringify(SB)};
  window.__gets=[]; window.__verT = esc==='otro' ? Date.now()-60e3 : Date.now()-10*60e3;
  var latido=Date.now()-2*60e3;
  try{
    ['maleu_ult_post','maleu_crm_clientes_v1','maleu_crm_clientes_ts','maleu_crm_cambio_ts','mc_sbtok_no'].forEach(function(k){ localStorage.removeItem(k); });
    var sb=JSON.parse(JSON.stringify(SB)); sb.pal={crmPg:true};
    localStorage.setItem('mc_sbtok', JSON.stringify({u:'tadeo', sb:sb, hasta:Date.now()+50*60e3}));
  }catch(e){}
  function resp(txt,st){ return Promise.resolve(new Response(txt,{status:st||200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase.co')>-1){
      var q=url.split('/rest/v1/')[1]||url;
      if(q.indexOf('replica_status')===0)
        return resp(JSON.stringify([{domain:'foto',confirmed_at:new Date(latido).toISOString()}]));
      return o.apply(this,arguments);   /* las fotos, las de produccion */
    }
    if(url.indexOf('script.google.com')>-1){
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
      if(a==='lote'){ ((url.match(/acciones=([^&]+)/)||[])[1]||'').split(',').forEach(function(z){ window.__gets.push(z); }); }
      else window.__gets.push(a);
      if(a==='ver')return resp(JSON.stringify({ok:true,ver:String(window.__verT)+'abcd',t:Date.now()}));
      if(a==='sbToken')return resp(JSON.stringify({ok:true,sb:SB,palancas:{crmPg:true}}));
      /* Todo lo demas, sin red: Apps Script no recibe nada. */
      return resp('{"ok":false,"error":"sin Apps Script en esta prueba"}');
    }
    return o.apply(this,arguments);
  };
})();`;

async function abrirPersonas(esc) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(process.env.TOKEN) + ';' + STUB(esc) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'&&typeof estSwitch==='function'")) break; await pausa(250); }
  await evaluar(cli, 'window.__gets=[]; window.__crmListo=0; go("estancias"); estSwitch("clientes"); 1');
  for (let i = 0; i < 160; i++) { if (await evaluar(cli, 'window.__crmListo>0')) break; await pausa(250); }
  return cli;
}
const LEER = `({ gets: window.__gets.slice(), fuente: window.__crmFuente||null, err: (window.__err||[]).slice(0,5) })`;

(async () => {
  console.log('\n== La tab CRM y lo que escribe otro aparato (sin cargar Apps Script) ==\n');
  for (const esc of (process.env.CASO ? process.env.CASO.split(',') : ['base', 'otro', 'vigia'])) {
    console.log('-- ' + esc);
    const cli = await abrirPersonas(esc);
    const r = await evaluar(cli, LEER);
    const pidio = r.gets.indexOf('crmClientes') > -1;
    if (esc === 'base') {
      chk('base: escritura anterior al latido → la lista sale de la base', !!r.fuente && r.fuente.de === 'pg' && !pidio, r);
    } else if (esc === 'otro') {
      chk('otro: escribieron después del latido → va a Apps Script', pidio && !!r.fuente && r.fuente.de === 'planilla', r);
      chk('otro: y dice por qué', !!r.fuente && /se escribió algo/.test(r.fuente.porque || ''), r.fuente);
    } else {
      chk('vigia: abre de la base', !!r.fuente && r.fuente.de === 'pg' && !pidio, r);
      /* El vigia compara contra lo que vio la vez anterior: primero tiene que
         mirar una vez con el sello viejo, y recien despues ver el cambio. */
      await evaluar(cli, 'window.__t0vig=Date.now(); window.__gets=[]; window._vigiaArranqueListo&&window._vigiaArranqueListo(); window._vigiaAcelerar&&window._vigiaAcelerar(0); 1');
      /* Esperar a que la respuesta VUELVA y el vigia la anote (no a que salga). */
      for (let i = 0; i < 80; i++) { if (await evaluar(cli, "!!(window.__verBackend&&window.__verBackend.t>window.__t0vig)")) break; await pausa(250); }
      await pausa(300);
      await evaluar(cli, 'window.__verT=Date.now(); window.__gets=[]; window.__crmListo=0; window._vigiaAcelerar&&window._vigiaAcelerar(0); 1');
      for (let i = 0; i < 160; i++) { if (await evaluar(cli, "window.__gets.indexOf('crmClientes')>-1 && window.__crmListo>0")) break; await pausa(250); }
      const v = await evaluar(cli, LEER);
      chk('vigia: otro aparato escribe → el refresco va a Apps Script', v.gets.indexOf('crmClientes') > -1, v.gets);
      chk('vigia: y dice que se escribió después del latido', !!v.fuente && v.fuente.de === 'planilla' && /se escribió algo/.test(v.fuente.porque || ''), v.fuente);
    }
    cli.matar();
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
