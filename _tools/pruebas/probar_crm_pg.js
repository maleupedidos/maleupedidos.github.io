/* LA TAB CRM DESDE SUPABASE, CON PALANCA (6/10/2026, rama supabase).

     TOKEN=$(python _tools/pruebas/leer_sesion.py) BASE=http://localhost:8095 node _tools/pruebas/probar_crm_pg.js

   Con DATOS REALES: la foto de `erp_screen_snapshot` es la de produccion y la
   planilla es la de produccion (los POST van interceptados por el PREP: no
   escribe nada). Se simulan solo dos cosas, porque todavia no existen en
   produccion hasta que se publique el backend:
     · la palanca `crmPg` en la respuesta de `sbToken`;
     · el latido `replica_status('foto')` (en «sinlatido» se deja pasar el real,
       que hoy no tiene esa fila).

   Sostiene:
   · palanca en «no»: la lista sale de Apps Script, no se consulta el latido y
     el cartel no dice nada nuevo;
   · palanca en «si» con latido fresco: NO se pide `crmClientes` a Apps Script,
     la lista es la de la base (mismo largo) y el cartel dice «De la base»;
     el ↻ tampoco va a Apps Script;
   · vuelve SOLA a la planilla, y dice por que, si: el latido es viejo · no hay
     latido · la base da 500 · la base no contesta en 6 s · escribiste algo
     desde este aparato despues del latido. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8080';
if (!process.env.TOKEN) { console.error('falta TOKEN'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const STUB = esc => `(function(){
  var esc=${JSON.stringify(esc)}; window.__gets=[]; window.__pg=[]; window.__pgN=0;
  try{ ['maleu_crm_clientes_v1','maleu_crm_clientes_ts','maleu_crm_cambio_ts','maleu_ult_post'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  var latido = esc==='vieja' ? Date.now()-40*60e3 : Date.now()-2*60e3;
  if(esc==='post'){ try{ localStorage.setItem('maleu_ult_post', String(Date.now()-60e3)); }catch(e){} }
  function resp(txt,st){ return Promise.resolve(new Response(txt,{status:st||200,headers:{'Content-Type':'application/json'}})); }
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase.co')>-1){
      var q=url.split('/rest/v1/')[1]||url;
      if(/erp_screen_snapshot|replica_status/.test(q))window.__pg.push(q.split('?')[0]+(q.indexOf('domain=eq.foto')>-1?':foto':''));
      if(q.indexOf('replica_status')===0&&q.indexOf('domain=eq.foto')>-1&&esc!=='sinlatido')
        return resp(JSON.stringify([{domain:'foto',confirmed_at:new Date(latido).toISOString()}]));
      if(q.indexOf('erp_screen_snapshot')===0&&q.indexOf('crmClientes')>-1){
        if(esc==='e500')return resp('{"message":"boom"}',500);
        if(esc==='colgada')return new Promise(function(ok,no){ var s=x&&x.signal; if(s)s.addEventListener('abort',function(){ var e=new Error('aborted'); e.name='AbortError'; no(e); }); });
        return o.apply(this,arguments).then(function(r){ r.clone().json().then(function(j){ try{ window.__pgN=j[0].payload.clientes.length; }catch(e){} }); return r; });
      }
    }
    if(url.indexOf('script.google.com')>-1){
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
      if(a==='sbToken')return o.apply(this,arguments).then(function(r){ return r.json().then(function(d){
        d=d||{}; d.palancas=d.palancas||{}; d.palancas.crmPg=(esc!=='off');
        return new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}); }); });
    }
    return o.apply(this,arguments);
  };
})();`;

async function abrirCrm(esc) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(process.env.TOKEN) + ';' + STUB(esc) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  /* El permiso de Supabase se pide a los ~12 s (en el uso real ya esta guardado). */
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "window.__gets.indexOf('sbToken')>-1 && !_sbPidiendo")) break; await pausa(250); }
  await evaluar(cli, 'window.__gets=[]; window.__pg=[]; window.__crmListo=0; go("estancias"); estSwitch("clientes"); 1');
  /* Listo cuando la lista termino de pedirse por el camino que sea. */
  for (let i = 0; i < 200; i++) {
    if (await evaluar(cli, "window.__crmListo>0")) break;
    await pausa(250);
  }
  return cli;
}
const LEER = `({ n:(window.estClientesSync()||[]).length, pgN:window.__pgN, gets:window.__gets.slice(), pg:window.__pg.slice(),
  fuente:window.__crmFuente||null, cartel:(function(b){ return b&&!b.hidden?b.textContent:''; })(document.getElementById('crmCliEstado')),
  err:(window.__err||[]).slice(0,5) })`;

(async () => {
  console.log('\n== La tab CRM desde la base (datos reales) ==\n');
  const casos = ['off', 'ok', 'vieja', 'sinlatido', 'e500', 'colgada', 'post'];
  const solo = process.env.CASO ? process.env.CASO.split(',') : casos;
  for (const esc of solo) {
    console.log('-- ' + esc);
    const cli = await abrirCrm(esc);
    const r = await evaluar(cli, LEER);
    const pidioPlanilla = r.gets.indexOf('crmClientes') > -1;
    if (esc === 'off') {
      chk('off: la lista sale de Apps Script', pidioPlanilla && r.n > 100, r);
      chk('off: no se consulta el latido', r.pg.indexOf('replica_status:foto') < 0, r.pg);
      chk('off: el cartel no dice nada nuevo', !/base|planilla/i.test(r.cartel), r.cartel);
    } else if (esc === 'ok') {
      chk('ok: NO se le pide crmClientes a Apps Script', !pidioPlanilla, r.gets);
      chk('ok: la lista es la de la base, entera (' + r.n + ' de ' + r.pgN + ')', r.n > 100 && r.n === r.pgN, r);
      chk('ok: el cartel dice que es de la base y de cuándo', /^De la base · al día /.test(r.cartel), r.cartel);
      await evaluar(cli, 'window.__gets=[]; window.__crmListo=0; crmCliReintentar(); 1');
      for (let i = 0; i < 100; i++) { if (await evaluar(cli, 'window.__crmListo>0')) break; await pausa(200); }
      const r2 = await evaluar(cli, LEER);
      chk('ok: el ↻ tampoco va a Apps Script', r2.gets.indexOf('crmClientes') < 0 && /^De la base/.test(r2.cartel), r2);
    } else {
      const porque = { vieja: /confirmó la foto hace/, sinlatido: /no confirma/, e500: /contestó 500/,
        colgada: /no contestó en 6 s/, post: /cambiaste algo/ }[esc];
      chk(esc + ': vuelve a la planilla', pidioPlanilla && r.n > 100, r.gets);
      chk(esc + ': y dice por qué', /^De la planilla/.test(r.cartel) && porque.test(r.cartel), r.cartel);
    }
    chk(esc + ': sin errores de consola', r.err.length === 0, r.err);
    cli.matar();
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
