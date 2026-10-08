/* La parte de arriba de la tab Pedidos, boton por boton: cuanto tarda desde el
   toque hasta que la pantalla responde, y que espera al servidor (8/10/2026).

   node medir_pedidos_arriba.js <token> [390|1440] [celular]      BASE=http://localhost:8131

   Sesion real. `celular` = CPU 4x mas lenta y red de datos moviles (150 ms de
   latencia, 1,6 Mbps): es lo que separa "anda en la compu" de "anda en la mano".
   Los POST van INTERCEPTADOS y contestan a los 3 s: no escribe nada, y deja ver si
   la pantalla espera al servidor o responde antes.

   Por accion:
     js      lo que tardo el manejador del toque (pantalla congelada)
     pinta   toque -> primer cuadro pintado despues
     listo   toque -> la pantalla termino de cambiar
     red     pedidos al backend que disparo, con lo que tardaron */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const CEL = process.argv.includes('celular');
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};
const EXTRA = `
  window.__red=[]; window.confirm=function(){return true;};
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||''), m=url.match(/[?&]action=([A-Za-z_]+)/), post=x&&String(x.method||'').toUpperCase()==='POST';
    var reg={a:m?m[1]:(url.indexOf('supabase')>=0?'supabase':url.slice(0,40)),post:!!post,t0:performance.now(),t1:null};
    if(url.indexOf('script.google.com')>=0||url.indexOf('supabase')>=0)window.__red.push(reg);
    if(post){
      try{ reg.a=JSON.parse(x.body).action||reg.a; }catch(e){}
      return new Promise(function(res){ setTimeout(function(){ reg.t1=performance.now();
        res(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}})); },3000); });
    }
    return o.apply(this,arguments).then(function(r){reg.t1=performance.now();return r;},function(e){reg.t1=performance.now();throw e;});
  };})();
  /* Mide UNA accion. \`cambio\` devuelve una firma de lo que se mira: la accion
     esta lista cuando la firma cambio y lleva 250 ms quieta. */
  window.__med=function(accion,firma,tope){
    return new Promise(function(fin){
      var f0=firma(), r0=window.__red.length, t0=performance.now();
      accion();
      var js=performance.now()-t0, pinta=null, ult=f0, tCambio=null, tUlt=null;
      requestAnimationFrame(function(){requestAnimationFrame(function(){pinta=performance.now()-t0;});});
      var iv=setInterval(function(){
        var f=firma(), ah=performance.now();
        if(f!==ult){ult=f;tUlt=ah-t0;if(tCambio===null)tCambio=ah-t0;}
        var quieta=(tUlt!==null&&ah-t0-tUlt>250);
        var red=window.__red.slice(r0), enVuelo=red.some(function(x){return x.t1===null;});
        if((quieta&&!enVuelo)||ah-t0>(tope||40000)||(tUlt===null&&ah-t0>1500&&!enVuelo)){
          clearInterval(iv);
          fin({js:Math.round(js),pinta:pinta===null?null:Math.round(pinta),cambio:tCambio===null?null:Math.round(tCambio),
               listo:tUlt===null?null:Math.round(tUlt),
               red:red.map(function(x){return (x.post?'POST ':'')+x.a+' '+(x.t1===null?'(sin volver)':Math.round(x.t1-x.t0)+' ms');})});
        }
      },16);
    });
  };
  window.__fLista=function(){var l=document.getElementById('pList');return l?l.querySelectorAll('.pc').length+'|'+((l.querySelector('.pc .pc-c')||{}).textContent||''):'';};
  window.__fCaja=function(){var b=document.getElementById('rbBox');return b?b.textContent.length+'|'+b.querySelectorAll('button:disabled').length+'|'+b.querySelectorAll('details[open]').length:'';};
`;
const fila = (n, r) => console.log('  ' + n.padEnd(34) + ('js ' + r.js + ' ms').padEnd(12) + ('pinta ' + (r.pinta === null ? '-' : r.pinta + ' ms')).padEnd(16)
  + ('listo ' + (r.listo === null ? 'sin cambio' : r.listo + ' ms')).padEnd(20) + (r.red.length ? 'red: ' + r.red.join(', ') : 'no va al servidor'));

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Network.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, `typeof D!=='undefined'&&D&&Array.isArray(D.pedidos)&&D.pedidos.length>0`)) throw new Error('no cargo');
    await esperar(cli, `window.__red.length>0&&window.__red.every(function(x){return x.t1!==null;})`, 90000);
    await pausa(1500);
    if (CEL) {
      await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cli.enviar('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    }
    const M = (accion, firma, tope) => evaluar(cli, `window.__med(function(){${accion}},${firma},${tope || 40000})`);
    console.log('\n== tab Pedidos a ' + ANCHO + 'px' + (CEL ? ' · CPU x4 y datos moviles' : ' · compu') + ' · ' + await evaluar(cli, 'D.pedidos.length') + ' pedidos ==\n');

    fila('abrir la tab', await M(`go('pedidos')`, `function(){return __fLista()+'#'+__fCaja();}`));
    await pausa(800);
    const arriba = await evaluar(cli, `(function(){
      var pg=document.getElementById('p-pedidos').getBoundingClientRect(), c=document.querySelector('#pList .pc'), f=document.getElementById('fRow');
      var rb=document.getElementById('rbBox'), cards=[].slice.call(rb.querySelectorAll('.rb-card')).map(function(x){return (x.querySelector('.rb-h')||{}).textContent+': '+Math.round(x.getBoundingClientRect().height)+'px';});
      var ban=document.querySelector('#pList > div:not(.pc)');
      return {filtros:Math.round(f.getBoundingClientRect().top-pg.top),primerPedido:c?Math.round(c.getBoundingClientRect().top-pg.top):null,alto:window.innerHeight,
        cajas:cards,cartel:ban?ban.textContent.slice(0,70)+' · '+Math.round(ban.getBoundingClientRect().height)+'px':null,tarjetas:document.querySelectorAll('#pList .pc').length};})()`);
    console.log('\n  hasta los filtros: ' + arriba.filtros + 'px · hasta el primer pedido: ' + arriba.primerPedido + 'px (la pantalla mide ' + arriba.alto + 'px)');
    console.log('  cajas de arriba: ' + arriba.cajas.join(' · '));
    console.log('  cartel de la lista: ' + arriba.cartel + '\n');

    fila('«Actualizar pedidos»', await M(`document.getElementById('btnReloadPed').click()`, `function(){return __fLista()+'#'+__fCaja()+'#'+document.getElementById('btnReloadPed').textContent;}`, 60000));
    await pausa(1500);
    const pills = await evaluar(cli, `[].slice.call(document.querySelectorAll('#fRow .pill')).map(function(p){return p.textContent;})`);
    for (let i = 1; i < pills.length; i++) {
      fila('filtro ' + pills[i], await M(`document.querySelectorAll('#fRow .pill')[${i}].click()`, `__fLista`));
      await pausa(300);
      await M(`document.querySelectorAll('#fRow .pill')[${i}].click()`, `__fLista`);   // lo destilda
      await pausa(300);
    }
    fila('orden (' + pills[0] + ')', await M(`document.querySelectorAll('#fRow .pill')[0].click()`, `__fLista`));
    await pausa(300);
    await M(`document.querySelectorAll('#fRow .pill')[0].click()`, `__fLista`);
    await pausa(500);
    fila('abrir un pedido (la tarjeta)', await M(`document.querySelector('#pList .pc .pc-summary').click()`, `function(){return String(document.querySelectorAll('#pList .pc:not(.collapsed)').length)+document.querySelectorAll('#pList .pc-body').length;}`));
    fila('abrir un pedido (la ficha)', await M(`document.querySelector('#pList .pc .ord-link').click()`, `function(){var o=document.getElementById('ordBody');return o?String(o.textContent.length):'';}`));
    await evaluar(cli, `(function(){var c=document.querySelector('.ord-close,[onclick*="closeOrdDetail"]');if(c)c.click();return 1;})()`);
    await pausa(400);

    const det = await evaluar(cli, `[].slice.call(document.querySelectorAll('#rbBox details summary')).map(function(s){return s.textContent.slice(0,40);})`);
    for (let i = 0; i < det.length; i++) {
      fila('desplegar «' + det[i].slice(0, 22) + '»', await M(`document.querySelectorAll('#rbBox details summary')[${i}].click()`, `__fCaja`));
    }
    const hayDes = await evaluar(cli, `!!document.querySelector('#rbBox .pd-mini[onclick*="pdVolver"]')`);
    if (hayDes) fila('«Deshacer» de Por decidir', await M(`document.querySelector('#rbBox .pd-mini[onclick*="pdVolver"]').click()`, `__fCaja`, 30000));
    else console.log('  «Deshacer»: hoy no hay ninguno para deshacer');
    const hayNos = await evaluar(cli, `!!document.querySelector('#rbBox .pd-nos')`);
    if (hayNos) {
      await evaluar(cli, `document.querySelector('#rbBox .pd-nos').click()`);
      fila('«Nosotros» de Por decidir', await M(`document.querySelector('#rbBox .pd-reps button.sin').click()`, `__fCaja`, 30000));
    } else console.log('  «Nosotros»: hoy no hay nada por decidir');
  } catch (e) { console.log('  revento: ' + e.message); }
  cli.matar();
  process.exit(0);
})();
