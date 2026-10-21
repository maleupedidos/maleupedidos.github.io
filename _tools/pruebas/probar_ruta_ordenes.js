/* RUTA CON LAS ÓRDENES DE PEDIDO (Pedidos 4d, 14/10/2026).

     BASE=http://localhost:8133 node _tools/pruebas/probar_ruta_ordenes.js [390|1440]

   Sin token y con Apps Script SIMULADO adentro de la página (no toca producción).
   Se deja un «Entregado» en la cola de Ruta (`maleu_ruta.syncQueue`) antes de
   arrancar y se mira qué sale:
   · prendida (la base contesta `diferida`): marcarEntregado → pedidosFuenteAplicar
     → marcarEntregado OTRA VEZ con el mismo ts (ya aplicada, sin `diferida`) → la
     cola queda vacía. Sin esto la sincronización leería la planilla vieja;
   · si la base sigue diciendo `diferida`, a las 3 vueltas se da por hecha (no se
     queda trabada);
   · apagada (sin `diferida`): un solo POST, como hoy. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8133';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));

const STUB = modo => `(function(){
  window.__posts=[]; var modo=${JSON.stringify(modo)}, vueltas=0;
  try{ var L=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); L._v='v2-row-keyed'; window.__ts=Date.now()-60000; L.syncQueue=[{action:'marcarEntregado',hoja:'Home',id:'9001',row:5,ts:window.__ts}];
       localStorage.setItem('maleu_ruta',JSON.stringify(L));
       /* La purga de una sola vez (v58) se comeria la cola en un perfil nuevo: en un celular de verdad ya paso. */
       localStorage.setItem('maleu_ruta_purge_v58', String(Date.now())); }catch(e){}
  function resp(o){ return Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }
  /* El POST puede llegar como (url, opciones) o como un Request (la cola de GETs
     del panel envuelve los fetch): se lee el metodo y el cuerpo de las dos formas. */
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    var metodo=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
    if(metodo!=='POST') return resp({ok:true,entregas:[],pedidos:[],cobros:[],pendientes:[]});
    var cuerpo=(x&&typeof x.body==='string')?Promise.resolve(x.body):((u&&u.clone)?u.clone().text():Promise.resolve(''));
    return cuerpo.then(function(t){
      var b={}; try{ b=JSON.parse(t); }catch(e){}
      window.__posts.push(b.action+(b.ts?'@'+b.ts:''));
      if(b.action==='pedidosFuenteAplicar') return resp({ok:true,hechas:1,quedan:0});
      if(b.action==='marcarEntregado'){
        vueltas++;
        if(modo==='no') return resp({ok:true});
        if(modo==='trabada') return resp({ok:true,aceptada:true,diferida:true,orden:7});
        return resp(vueltas===1?{ok:true,aceptada:true,diferida:true,orden:7}:{ok:true,aceptada:true,repetida:true,orden:7});
      }
      return resp({ok:true});
    });
  };
})();`;

async function correr(modo) {
  const cli = await abrir();
  await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB(modo) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "typeof go==='function'")) break; await pausa(250); }
  await evaluar(cli, 'go("ruta"); 1');
  /* La cola se manda despues del primer refresh, que con el backend simulado no
     trae entregas: se dispara por el evento `online`, que tambien la manda. */
  await pausa(4000);
  await evaluar(cli, 'window.dispatchEvent(new Event("online")); 1');
  const COLA = "(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).length";
  for (let i = 0; i < 160; i++) { if (await evaluar(cli, COLA + '===0 && window.__posts.length>0')) break; await pausa(250); }
  await pausa(1500);
  const r = await evaluar(cli, `({ posts: window.__posts.map(function(p){return p.replace(String(window.__ts),'TS');}), cola: ${COLA}, err: (window.__err||[]).slice(0,5) })`);
  cli.matar();
  return r;
}

(async () => {
  console.log('\n== Ruta con las órdenes de pedido (' + ANCHO + ' px) ==\n');
  let r = await correr('si');
  chk('prendida: orden → aplicador → la misma orden otra vez (mismo ts)',
    JSON.stringify(r.posts) === JSON.stringify(['marcarEntregado@TS', 'pedidosFuenteAplicar', 'marcarEntregado@TS']), r.posts);
  chk('prendida: la cola queda vacía', r.cola === 0, r);
  r = await correr('trabada');
  chk('si la base sigue diciendo diferida: 3 aplicadores y se da por hecha (no se traba)',
    r.cola === 0 && r.posts.filter((x) => x === 'pedidosFuenteAplicar').length === 3, r.posts);
  r = await correr('no');
  chk('apagada: un solo POST, como hoy', JSON.stringify(r.posts) === JSON.stringify(['marcarEntregado@TS']) && r.cola === 0, r);
  chk('sin errores de consola', JSON.stringify(r.err) === '[]', r.err);
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
