/* LA FICHA DEL CLIENTE DESDE LA BASE (14/10/2026, rama supabase, FICHA_DESDE_PG).

     TOKEN=$(python _tools/pruebas/leer_sesion.py) BASE=http://localhost:8133 node _tools/pruebas/probar_ficha_base.js [390|1440]

   Con DATOS REALES: la foto `pedidos` y la lista de clientes son las de
   produccion, y los POST van interceptados por el PREP (no escribe nada). Lo
   simulado: la palanca `fichaPg` (se prende en `_sbPerm.pal` adentro de la
   pagina, porque el backend publicado todavia no la manda) y `D.pedidos`
   vacio — el caso que hoy cae a Apps Script: se abrio CRM sin haber cargado
   Pedidos.

   Tres pasadas:
   · prendida, latido REAL: si la base esta al dia, la ficha sale de ella; si no
     (el 14/10 a las 13 h el latido tenia 34 min), va al servidor y DICE POR QUE;
   · prendida, latido FRESCO (el latido y el sello de escritura simulados al
     dia; los datos, reales): la ficha TIENE que salir de la base, sin pedir
     `crmCliente`, y el historial cerrar con el numero de la lista;
   · apagada: como hoy, `crmCliente` a Apps Script (una sola ficha contra
     produccion por corrida).

   OJO: el 8080/8095/8097 suelen ser de otras sesiones. Levanta el tuyo en un
   puerto libre (`node _tools/servir.js 8133`) y chequea que sirva tu codigo. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8133';
const ANCHO = Number(process.argv[2]) || 390;
if (!process.env.TOKEN) { console.error('falta TOKEN'); process.exit(2); }
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

/* `fresco`: el latido de las fotos (`replica_status`) y el sello de la ultima
   escritura (`action=ver`) simulados como si la base estuviera al dia. */
const ESPIA = modo => `(function(){ window.__gets=[]; var fresco=${JSON.stringify(modo === 'fresco')}; var o=window.fetch;
  function resp(t){ return Promise.resolve(new Response(t,{status:200,headers:{'Content-Type':'application/json'}})); }
  window.fetch=function(u,x){
    var url=String((u&&u.url)||u||''); var m=url.match(/[?&]action=([A-Za-z]+)/); if(m) window.__gets.push(m[1]);
    if(fresco && url.indexOf('/rest/v1/replica_status')>-1){
      var ds=(decodeURIComponent(url).match(/"([^"]+)"/g)||[]).map(function(s){ return s.slice(1,-1); });
      return resp(JSON.stringify(ds.map(function(d){ return {domain:d, confirmed_at:new Date(Date.now()-2*60e3).toISOString()}; })));
    }
    if(fresco && m && m[1]==='ver') return resp(JSON.stringify({ok:true, ver:String(Date.now()-10*60e3)+'abcd', t:Date.now()}));
    return o.apply(this, arguments); }; })();`;

async function abrirCrm(modo) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(process.env.TOKEN) + ';' + ESPIA(modo) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  /* El permiso de Supabase: se espera a tenerlo (en el uso real ya esta guardado). */
  await evaluar(cli, '_sbPermiso(); 1');
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, '!!(_sbPerm && _sbPerm.token)')) break; await pausa(250); }
  /* `estSwitch` se define cuando la tab abre por primera vez. */
  await evaluar(cli, 'go("estancias"); 1');
  for (let i = 0; i < 80; i++) { if (await evaluar(cli, "typeof window.estSwitch==='function'")) break; await pausa(250); }
  await evaluar(cli, 'estSwitch("clientes"); 1');
  /* La primera vez que arranca Chrome tarda mas: hasta 2 min. */
  for (let i = 0; i < 480; i++) { if (await evaluar(cli, '((window.estClientesSync && window.estClientesSync()) || []).length > 100')) break; await pausa(250); }
  return cli;
}

/* El cliente con mas pedidos de la lista: el historial mas largo para comparar. */
const ELEGIR = `(function(){ var l=window.estClientesSync()||[]; l=l.filter(function(c){return c.pedidos>=3 && Array.isArray(c.refs);}).sort(function(a,b){return b.pedidos-a.pedidos;});
  return l[0] ? {key:l[0].key, n:l[0].pedidos} : null; })()`;
const LEER = `({ de: window.__fichaDe||'', nota: (window.__crmFotos||{}).ficha||'', gets: window.__gets.slice(),
  hist: ((document.querySelector('#crmDrawerBody') || {}).innerText || '').match(/Historial \\((\\d+)\\)/i),
  peds: document.querySelectorAll('#crmDrawerBody .crm-ped').length, err: (window.__err||[]).slice(0,5) })`;
const PRENDER = on => '_sbPerm.pal = _sbPerm.pal || {}; _sbPerm.pal.fichaPg = ' + on + '; D.pedidos = null; window.__fichaDe = ""; window.__gets = []; 1';

(async () => {
  console.log('\n== La ficha del cliente desde la base (' + ANCHO + ' px) ==');
  let c = null;
  for (const modo of ['real', 'fresco']) {
    console.log('\n-- prendida, latido ' + modo + ' --');
    const cli = await abrirCrm(modo);
    console.log('     (lista: ' + await evaluar(cli, '((window.estClientesSync && window.estClientesSync()) || []).length') + ' clientes)');
    c = c || await evaluar(cli, ELEGIR);
    chk('hay un cliente para mirar (' + (c && c.n) + ' pedidos)', !!c, c);
    if (!c) { cli.matar(); break; }
    await evaluar(cli, PRENDER(true));
    const t0 = Date.now();
    await evaluar(cli, 'crmOpenCliente(' + JSON.stringify(encodeURIComponent(c.key)) + '); 1');
    for (let i = 0; i < 120; i++) { if (await evaluar(cli, '!!window.__fichaDe')) break; await pausa(100); }
    const ms = Date.now() - t0;
    /* Un crmCliente sale por la cola de GETs del ERP, que lo suelta despues: se
       espera 5 s para que, si hubiera salido, se vea. */
    await pausa(5000);
    const r = await evaluar(cli, LEER);
    if (r.de === 'base') {
      chk('la ficha sale de la base en ' + ms + ' ms', r.nota === 'base', r);
      chk('NO se le pide crmCliente a Apps Script', r.gets.indexOf('crmCliente') < 0, r.gets);
      chk('el historial cierra con la lista (' + c.n + ' pedidos, ' + r.peds + ' a la vista)',
        !!r.hist && Number(r.hist[1]) === c.n && r.peds === Math.min(25, c.n), { hist: r.hist && r.hist[1], peds: r.peds, lista: c.n });
      chk('no se tocaron los pedidos de la tab Pedidos (D.pedidos sigue vacío)', await evaluar(cli, 'D.pedidos === null'));
    } else if (modo === 'fresco') {
      chk('con el latido al día TIENE que salir de la base', false, r);
    } else {
      chk('si la base no sirve, va al servidor y dice por qué', r.de === 'servidor' && /^planilla: /.test(r.nota), r);
      console.log('     (la base no sirvió: ' + r.nota + ')');
    }
    chk('sin errores de consola', JSON.stringify(r.err) === '[]', r.err);
    cli.matar();
  }

  if (c) {
    console.log('\n-- apagada (como hoy): una ficha por Apps Script --');
    const cli = await abrirCrm('real');
    await evaluar(cli, PRENDER(false));
    await evaluar(cli, 'crmOpenCliente(' + JSON.stringify(encodeURIComponent(c.key)) + '); 1');
    for (let i = 0; i < 240; i++) { if (await evaluar(cli, "window.__gets.indexOf('crmCliente')>-1")) break; await pausa(250); }
    const r = await evaluar(cli, LEER);
    chk('apagada: va al servidor (crmCliente), sin mirar la base', r.de === 'servidor' && r.gets.indexOf('crmCliente') > -1 && r.nota === 'sin palanca', r);
    cli.matar();
  }

  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
