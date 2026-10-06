/* LA TAB PEDIDOS DESDE SUPABASE, CON PALANCA (6/10/2026, rama supabase).

     TOKEN=$(python _tools/pruebas/leer_sesion.py) BASE=http://localhost:8113 node _tools/pruebas/probar_pedidos_pg.js

   Con DATOS REALES: la foto de `pedidos` es la de produccion, el permiso de
   Supabase es uno de verdad (pedido UNA vez al arrancar, como lo guarda el ERP)
   y la planilla es la de produccion (los POST van interceptados: no escribe
   nada). Se simulan tres cosas que no existen hasta publicar el backend:
     · la palanca `pedidosPg` en el permiso;
     · el latido `replica_status('foto')`;
     · la foto `ocLight`, armada con la respuesta real de `ocLight`.

   Sostiene:
   · «no»: pedidos y OCs van a Apps Script, igual que hoy;
   · «si» con latido fresco: NI pedidosLight NI ocLight van a Apps Script, la
     lista es la de la foto (mismo largo), las OCs tambien, y el sello de
     frescura es la hora del latido; el ↻ (`dePlanilla`) SI va a Apps Script;
   · vuelve SOLA a Apps Script, y dice por que, si: el latido tiene 20 min ·
     no hay latido · la base da 500 · la base no contesta en 6 s · escribiste
     algo desde este aparato despues del latido.

   OTRO APARATO ESCRIBE (6/10/2026). `action=ver` (el sello de la ultima
   escritura del backend) tambien va simulado, con la hora en `window.__verT`:
   · «otro»: alguien escribio DESPUES del latido → no usa la foto, va a Apps
     Script y lo dice;
   · «vigia»: abre con la foto; despues otro aparato escribe y el vigia se
     entera → el refresco que dispara va a Apps Script, no a la misma foto;
   · «sinsello»: no se puede saber el sello → Apps Script. */
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
const get = a => JSON.parse(execFileSync('curl', ['-sL', '--max-time', '120',
  API + '?action=' + a + '&token=' + encodeURIComponent(process.env.TOKEN) + '&t=' + Date.now()]).toString('utf8'));

/* En memoria, nunca a disco. */
const SB = get('sbToken').sb;
if (!SB || !SB.token) { console.error('sbToken no dio permiso'); process.exit(2); }
const OC = get('ocLight');

const STUB = esc => `(function(){
  var esc=${JSON.stringify(esc)}, SB=${JSON.stringify(SB)}, OC=${JSON.stringify(OC)};
  window.__lotes=[]; window.__fotoN=0;
  try{
    ['maleu_ult_post','ma3','mc_sbtok_no'].forEach(function(k){ localStorage.removeItem(k); });
    var sb=JSON.parse(JSON.stringify(SB)); sb.pal={pedidosPg:esc!=='off'};
    localStorage.setItem('mc_sbtok', JSON.stringify({u:'tadeo', sb:sb, hasta:Date.now()+50*60e3}));
    if(esc==='post')localStorage.setItem('maleu_ult_post', String(Date.now()-60e3));
  }catch(e){}
  var latido = esc==='vieja' ? Date.now()-20*60e3 : Date.now()-2*60e3;
  /* La ultima escritura del backend: antes del latido, salvo en «otro». */
  window.__verT = esc==='otro' ? Date.now()-60e3 : Date.now()-10*60e3;
  function resp(txt,st){ return Promise.resolve(new Response(txt,{status:st||200,headers:{'Content-Type':'application/json'}})); }
  function colgar(x){ return new Promise(function(ok,no){ var s=x&&x.signal; if(s)s.addEventListener('abort',function(){ var e=new Error('aborted'); e.name='AbortError'; no(e); }); }); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase.co')>-1){
      var q=url.split('/rest/v1/')[1]||url;
      if(q.indexOf('replica_status')===0)
        return resp(esc==='sinlatido'?'[]':JSON.stringify([{domain:'foto',confirmed_at:new Date(latido).toISOString()}]));
      if(q.indexOf('erp_screen_snapshot')===0&&q.indexOf('ocLight')>-1){
        if(esc==='e500')return resp('{"message":"boom"}',500);
        if(esc==='colgada')return colgar(x);
        /* La foto real de pedidos, mas la de OCs armada con la respuesta real. */
        return o.apply(this,arguments).then(function(r){ return r.json(); }).then(function(filas){
          filas=(filas||[]).filter(function(f){ return f.screen==='pedidos'; });
          if(filas[0])window.__fotoN=filas[0].payload.pedidos.length;
          filas.push({screen:'ocLight',payload:OC,computed_at:new Date(Date.now()-3*60e3).toISOString()});
          return new Response(JSON.stringify(filas),{status:200,headers:{'Content-Type':'application/json'}});
        });
      }
    }
    if(url.indexOf('script.google.com')>-1){
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
      if(a==='lote'){ var ac=(url.match(/acciones=([^&]+)/)||[])[1]||''; ac.split(',').forEach(function(z){ window.__lotes.push(z); }); }
      else window.__lotes.push(a);
      if(a==='ver'){
        if(esc==='sinsello')return resp('{"ok":false}',500);
        return resp(JSON.stringify({ok:true,ver:String(window.__verT)+'abcd',t:Date.now()}));
      }
      if(a==='sbToken')return o.apply(this,arguments).then(function(r){ return r.json().then(function(d){
        d=d||{}; d.palancas=d.palancas||{}; d.palancas.pedidosPg=(esc!=='off');
        return new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}); }); });
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
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  await evaluar(cli, 'go("pedidos"); 1');
  /* Listo cuando hay pedidos en memoria y la carga de pedidos termino. */
  for (let i = 0; i < 360; i++) {
    if (await evaluar(cli, "typeof D==='object'&&D&&Array.isArray(D.pedidos)&&D.pedidos.length>100&&!_rapidoEnVuelo.completo&&!_rapidoEnVuelo.soloPedidos")) break;
    await pausa(250);
  }
  await pausa(1500);
  return cli;
}
const LEER = `({ lotes: window.__lotes.slice(), fuente: window.__pedFuente||null, n: (D&&D.pedidos||[]).length,
  fotoN: window.__fotoN, oc: (D&&D.oc&&D.oc.lista||[]).length, ocFrescas: !!_ocFrescas,
  sello: (_fresco&&_fresco.ok&&_fresco.ok.pedidos)||0, err: (window.__err||[]).slice(0,5) })`;

(async () => {
  console.log('\n== La tab Pedidos desde la base (datos reales) ==\n');
  const casos = ['off', 'ok', 'vieja', 'sinlatido', 'e500', 'colgada', 'post', 'otro', 'sinsello', 'vigia'];
  const solo = process.env.CASO ? process.env.CASO.split(',') : casos;
  const ocN = ((OC && OC.oc && OC.oc.lista) || []).length;
  for (const esc of solo) {
    console.log('-- ' + esc);
    const cli = await abrirErp(esc);
    const r = await evaluar(cli, LEER);
    const pidioPed = r.lotes.indexOf('pedidosLight') > -1, pidioOc = r.lotes.indexOf('ocLight') > -1;
    if (esc === 'off') {
      chk('off: pedidos y OCs van a Apps Script, como hoy', pidioPed && pidioOc && r.n > 100, r);
      chk('off: no se mira la base como fuente', r.fuente === null, r.fuente);
    } else if (esc === 'ok') {
      chk('ok: NI pedidosLight NI ocLight van a Apps Script', !pidioPed && !pidioOc, r.lotes);
      chk('ok: la lista es la de la foto, entera (' + r.n + ' de ' + r.fotoN + ')', r.n > 100 && r.n === r.fotoN, r);
      chk('ok: las OCs también, y habilitan el aviso (' + r.oc + ' de ' + ocN + ')', r.oc === ocN && r.ocFrescas, r);
      chk('ok: el sello es la hora del latido, no la de ahora', !!r.fuente && Math.abs(r.sello - r.fuente.t) < 1000, { sello: r.sello, fuente: r.fuente });
      await evaluar(cli, 'window.__lotes=[]; window.__rf=0; loadRapido({soloPedidos:true,dePlanilla:true}).then(function(){ window.__rf=1; }); 1');
      for (let i = 0; i < 240; i++) { if (await evaluar(cli, 'window.__rf===1')) break; await pausa(250); }
      const r2 = await evaluar(cli, LEER);
      chk('ok: el ↻ va a Apps Script (lo de este minuto)', r2.lotes.indexOf('pedidosLight') > -1 && r2.n > 100, r2.lotes);
    } else if (esc === 'vigia') {
      chk('vigia: abre con la foto, sin pedirle pedidos a Apps Script', !pidioPed && !!r.fuente && r.fuente.de === 'pg', r.lotes);
      /* Otro aparato escribe AHORA; el vigia pregunta y se entera. */
      /* En dos pasos: el vigia compara contra lo que vio la vez anterior, asi que
         primero mira con el sello viejo y recien despues ve el cambio. */
      await evaluar(cli, 'window.__t0vig=Date.now(); window._vigiaArranqueListo&&window._vigiaArranqueListo(); window._vigiaAcelerar&&window._vigiaAcelerar(0); 1');
      for (let i = 0; i < 80; i++) { if (await evaluar(cli, "!!(window.__verBackend&&window.__verBackend.t>window.__t0vig)")) break; await pausa(250); }
      await pausa(300);
      await evaluar(cli, 'window.__verT=Date.now(); window.__lotes=[]; window._vigiaAcelerar&&window._vigiaAcelerar(0); 1');
      for (let i = 0; i < 240; i++) { if (await evaluar(cli, "window.__lotes.indexOf('pedidosLight')>-1 && !_rapidoEnVuelo.completo")) break; await pausa(250); }
      const v = await evaluar(cli, LEER);
      chk('vigia: el refresco que dispara va a Apps Script', v.lotes.indexOf('pedidosLight') > -1, v.lotes);
      chk('vigia: y dice que se escribió después del latido', !!v.fuente && v.fuente.de === 'planilla' && /se escribió algo/.test(v.fuente.porque), v.fuente);
    } else {
      const porque = { vieja: /confirmó las fotos hace/, sinlatido: /no confirma/, e500: /contestó 500/,
        colgada: /no contestó en 6 s/, post: /cambiaste algo/, otro: /se escribió algo/,
        sinsello: /no se pudo saber/ }[esc];
      chk(esc + ': vuelve a Apps Script', pidioPed && pidioOc && r.n > 100, r.lotes);
      chk(esc + ': y dice por qué', !!r.fuente && r.fuente.de === 'planilla' && porque.test(r.fuente.porque), r.fuente);
    }
    chk(esc + ': sin errores de consola', r.err.length === 0, r.err);
    cli.matar();
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
