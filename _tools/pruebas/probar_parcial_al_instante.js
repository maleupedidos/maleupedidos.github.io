/* RUTA › COBROS: el cobro PARCIAL al instante (31/10/2026).
     BASE=http://localhost:<puerto> [APP=app_viejo_tmp.html] node _tools/pruebas/probar_parcial_al_instante.js <token> [390|1440]
   Pedidos INVENTADOS (el repo es público) y el POST demorado 3 s; el servidor simulado aplica el parcial recién cuando
   contesta, como el de verdad. Por el cuadro de cobro de verdad (tildar «Parcial», tipear, Confirmar). Sostiene que la
   card muestra al toque «Ya cobrado» con el parcial y «Guardando…» sin loader, que queda en la cola con su id, que un
   refresco con el POST en viaje no lo borra, que con la respuesta del servidor no se cuenta dos veces, y que si el servidor lo rechaza la card vuelve como estaba. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080', APP = process.env.APP || 'app.html', DEMORA = 3000;
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
const pc = (id, c, $) => ({ h: 'Home', id, r: id, c, $, totalOriginal: $, cobradoParcial: 0, fp: 'Efectivo', ep: 'No Cobrado', es: 'Entregado', t: '', p: [{ a: 'PMu', q: 1 }], fe: '', de: '' });
const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const HOYd = String(hoyAR.getDate()).padStart(2, '0') + '/' + String(hoyAR.getMonth() + 1).padStart(2, '0') + '/' + hoyAR.getFullYear();
const combo = (id, $) => Object.assign(pc(id, 'Combo Ana', $), { t: '1155550000', fe: HOYd, de: 'Hoy' });
const COBROS = [pc(9301, 'Parcial Uno', 20000), pc(9302, 'Parcial Rechazo', 15000), combo(9311, 10000), combo(9312, 8000)];
const EXTRA = `window.__posts=[]; window.__srv=${JSON.stringify(COBROS)};
  (function(){ var real; Object.defineProperty(window,'LEC_ARMA',{configurable:false,get:function(){ if(!real||typeof real!=='object')return real; var o=Object.assign({},real); delete o.cobrosPendientes; return o; },set:function(v){ real=v; }}); })();
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||'');
    if(x&&String(x.method||'').toUpperCase()==='POST'){ var b={}; try{b=JSON.parse(x.body);}catch(e){} window.__posts.push(b);
      return new Promise(function(res){ setTimeout(function(){ var r={ok:true};
        if(b.action==='cobrarParcial'){
          var p=__srv.filter(function(q){return String(q.id)===String(b.id);})[0];
          if(String(b.id)==='9302') r={ok:false,sinReintento:true,err:'rechazado a propósito'};
          else if(p){ p.cobradoParcial+=b.monto; p.$-=b.monto; if(p.$<=0)__srv=__srv.filter(function(q){return q!==p;}); r={ok:true,restante:Math.max(0,p.$),cerrado:p.$<=0}; }
        }
        res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); }, ${DEMORA}); }); }
    if(url.indexOf('action=cobrosPendientes')>-1) return Promise.resolve(new Response(JSON.stringify({ok:true,ts:Date.now(),cobros:JSON.parse(JSON.stringify(__srv))}),{status:200,headers:{'Content-Type':'application/json'}}));
    if(url.indexOf('action=entregas')>-1) return Promise.resolve(new Response(JSON.stringify({ts:Date.now(),e:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
    return o.apply(this,arguments); }; })();
  window.confirm=function(){return true;};
  try{ localStorage.removeItem('maleu_ruta'); }catch(e){}`;
const CARD = (n) => `(function(){var v=document.getElementById('cobrosView');return [].slice.call(v.querySelectorAll('.cobro-card')).filter(function(c){return c.textContent.indexOf(${JSON.stringify(n)})>=0;})[0]||null;})()`;
const TXT = (n) => `((${CARD(n)})||{}).textContent||''`;
/* Abre el cuadro de la card, tilda Parcial, tipea el monto y confirma; cuenta hasta que la card dice `listo`. */
const PARCIAL = (n, monto, listo) => `new Promise(function(fin){
  var card=${CARD(n)}; if(!card){fin({err:'sin card'});return;}
  card.querySelector('.cobro-btn-cobrado').click();
  setTimeout(function(){
    var b=[].slice.call(document.querySelectorAll('#cobroRutaOverlay button')).filter(function(x){return /parcial/i.test(x.textContent)&&/_toggleCobroParcial/.test(x.getAttribute('onclick')||'');})[0];
    if(!b){fin({err:'sin botón Parcial'});return;}
    b.click();
    var i=document.getElementById('cobroRecEf'); i.value=String(${monto}); i.dispatchEvent(new Event('input',{bubbles:true}));
    setTimeout(function(){
      var tap=0, t0=performance.now(), el=document.getElementById('rutLoaderOverlay');
      var iv=setInterval(function(){ if(el&&el.classList.contains('visible'))tap=performance.now()-t0; },16);
      confirmarCobroRuta();
      (function mira(){ var ok=false; try{ ok=!!(${listo}); }catch(e){}
        if(ok){ requestAnimationFrame(function(){ var ms=performance.now()-t0; clearInterval(iv); fin({ms:Math.round(ms),tapa:Math.round(tap)}); }); return; }
        if(performance.now()-t0>10000){ clearInterval(iv); fin({ms:-1,tapa:Math.round(tap)}); return; }
        requestAnimationFrame(mira); })();
    },400);
  },700);
})`;
const COLA = `JSON.stringify((JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).map(function(x){return x.action+':'+x.id+':'+(x.clientOpId?'id':'sin id');}))`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  if (ANCHO < 500) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== RUTA › COBROS · el parcial al instante · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, 'typeof window.go==="function"', 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("ruta")'); await pausa(1500); await evaluar(cli, 'switchTab("cobros")');
  chk('aparecen las dos cards', await esperar(cli, `!!(${CARD('Parcial Uno')})&&!!(${CARD('Parcial Rechazo')})`, 30000));
  let r = await evaluar(cli, PARCIAL('Parcial Uno', 8000, `/Ya cobrado: \\$\\s?8\\.000/.test(${TXT('Parcial Uno')})&&/Guardando/.test(${TXT('Parcial Uno')})`));
  chk('Parcial Uno: al toque dice «Ya cobrado $8.000 · Guardando…» (' + r.ms + ' ms, tope 300)', r.ms >= 0 && r.ms <= 300, r);
  chk('  sin tapar la pantalla', r.tapa === 0, r);
  chk('  y el saldo baja a $12.000', /\$\s?12\.000/.test(await evaluar(cli, TXT('Parcial Uno'))), await evaluar(cli, TXT('Parcial Uno')));
  chk('  queda en la cola con su id', /cobrarParcial:9301:id/.test(await evaluar(cli, COLA)), await evaluar(cli, COLA));
  chk('  el aviso de arriba dice «Guardando… Cobro parcial»', /Guardando… Cobro parcial/.test(await evaluar(cli, `document.getElementById('syncBanner').textContent`)));
  await evaluar(cli, 'fetchCobrosPendientes(true)'); await pausa(900);
  chk('un refresco con el POST en viaje no lo borra', /Ya cobrado: \$\s?8\.000/.test(await evaluar(cli, TXT('Parcial Uno'))), await evaluar(cli, TXT('Parcial Uno')));
  /* Hasta que la cola confirma (con CPU ×4 tarda más que el POST), y después un refresco. */
  await esperar(cli, `(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).length===0`, 20000);
  await evaluar(cli, '_cobFirma="";fetchCobrosPendientes(true)'); await pausa(1500);
  const t1 = await evaluar(cli, TXT('Parcial Uno'));
  chk('con la respuesta del servidor: $8.000 una sola vez, sin «Guardando…»', /Ya cobrado: \$\s?8\.000/.test(t1) && !/Guardando/.test(t1) && /\$\s?12\.000/.test(t1), t1);
  const n9301 = await evaluar(cli, `__posts.filter(function(b){return b.action==='cobrarParcial'&&String(b.id)==='9301';}).length`);
  chk('  y salió UN solo POST', n9301 === 1, n9301);
  r = await evaluar(cli, PARCIAL('Parcial Rechazo', 5000, `/Guardando/.test(${TXT('Parcial Rechazo')})`));
  chk('Parcial Rechazo: al toque dice «Guardando…»', r.ms >= 0 && r.ms <= 300, r);
  chk('  si el servidor lo rechaza, la card vuelve sin el parcial', await esperar(cli, `!/Ya cobrado/.test(${TXT('Parcial Rechazo')})&&/\\$\\s?15\\.000/.test(${TXT('Parcial Rechazo')})`, DEMORA * 4 + 6000), await evaluar(cli, TXT('Parcial Rechazo')));
  // El combo: $12.000 sobre $10.000 + $8.000 → el primero se cierra (sale) y el segundo queda con $2.000 a cuenta.
  const IDC = (id) => `(function(){var v=document.getElementById('cobrosView');return [].slice.call(v.querySelectorAll('.cobro-card')).filter(function(c){return c.textContent.indexOf('#${'${id}'}')>=0;})[0]||null;})()`;
  /* Dos pedidos del mismo cliente se cobran desde el GRUPO (casillas + «Cobrar»). Lo que queda de #9312 puede pintarse
     como fila del grupo («ya pagó … a cuenta») o, con #9311 ya afuera, como card suelta («Ya cobrado»). */
  const V = `document.getElementById('cobrosView')`;
  chk('Combo Ana: aparece el grupo con las dos filas', await esperar(cli, `[].slice.call(${V}.querySelectorAll('.cg-row')).filter(function(b){return /#931[12]/.test(b.textContent);}).length===2`, 10000));
  r = await evaluar(cli, `new Promise(function(fin){
    var filas=[].slice.call(${V}.querySelectorAll('.cg-row')).filter(function(b){return /#931[12]/.test(b.textContent);});
    filas.forEach(function(b){ if(!b.classList.contains('on'))b.click(); });
    setTimeout(function(){
      var f=[].slice.call(${V}.querySelectorAll('.cg-row')).filter(function(b){return /#9311/.test(b.textContent);})[0];
      var g=f; while(g&&!g.querySelector('.cg-cobrar'))g=g.parentElement;
      var bt=g&&g.querySelector('.cg-cobrar'); if(!bt){fin({err:'sin botón Cobrar del grupo'});return;} bt.click();
      setTimeout(function(){
        var b=[].slice.call(document.querySelectorAll('#cobroRutaOverlay button')).filter(function(x){return /_toggleCobroParcial/.test(x.getAttribute('onclick')||'');})[0];
        if(!b){fin({err:'sin botón Parcial'});return;} b.click();
        var i=document.getElementById('cobroRecEf'); i.value='12000'; i.dispatchEvent(new Event('input',{bubbles:true}));
        setTimeout(function(){
          var tap=0,t0=performance.now(),el=document.getElementById('rutLoaderOverlay');
          var iv=setInterval(function(){ if(el&&el.classList.contains('visible'))tap=performance.now()-t0; },16);
          confirmarCobroRuta();
          (function mira(){ var t=${V}.textContent, x=[].slice.call(${V}.querySelectorAll('.cg-row,.cobro-card')).filter(function(c){return /#9312/.test(c.textContent);})[0];
            var ok=!/#9311\\b/.test(t)&&x&&/(Ya cobrado: |ya pagó )\\$\\s?2\\.000/.test(x.textContent)&&/Guardando/.test(x.textContent);
            if(ok){ requestAnimationFrame(function(){ clearInterval(iv); fin({ms:Math.round(performance.now()-t0),tapa:Math.round(tap)}); }); return; }
            if(performance.now()-t0>10000){ clearInterval(iv); fin({ms:-1,tapa:Math.round(tap),x:x&&x.textContent.slice(0,160),hay9311:/#9311\b/.test(t)}); return; }
            requestAnimationFrame(mira); })();
        },400);
      },700);
    },400);
  })`);
  chk('  parcial de $12.000: #9311 sale y #9312 queda con $2.000 a cuenta · Guardando… al toque (' + r.ms + ' ms)', r.ms >= 0 && r.ms <= 300 && !r.tapa, r);
  await esperar(cli, `__posts.filter(function(x){return x.action==='cobrarParcial'&&/^931[12]$/.test(String(x.id));}).length>=2`, 20000);   // la cola manda de a una
  const pc2 = await evaluar(cli, `JSON.stringify(__posts.filter(function(x){return x.action==='cobrarParcial'&&/^931[12]$/.test(String(x.id));}).map(function(x){return x.id+':'+x.monto+':'+(x.clientOpId?'id':'sin id');}))`);
  chk('  y salen las dos partes por la cola, con su id (10.000 y 2.000)', /9311:10000:id/.test(pc2) && /9312:2000:id/.test(pc2), pc2);
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
