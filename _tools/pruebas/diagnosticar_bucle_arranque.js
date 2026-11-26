/* ¿QUIÉN RELEE PEDIDOS Y CAJA CADA 1,5 s DESPUÉS DE ARRANCAR? (30/10/2026)
     node _tools/pruebas/diagnosticar_bucle_arranque.js <token> [url] [--tibio]
   medir_arranque_red.js vio, en frío, pedidos_light_pantalla ×2 + erp_screen_snapshot + caja_light + caja_resto cada
   ~1,5 s durante 120 s. Esto anota, por 25 s después de tener datos, la pila de cada lectura de esas y cada mensaje en
   vivo que llega (canal y evento). Solo lee: sesion_prep corta los POST que escriben. */
'use strict';
const cdp = require('./cdp.js'), prep = require('./sesion_prep.js');
const [TOKEN, URL0] = process.argv.slice(2);
const URL = (URL0 && /^http/.test(URL0)) ? URL0 : 'https://app.maleu.com.ar/app.html';
const TIBIO = process.argv.includes('--tibio');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const ESPIA = `;(function(){
  window.__lec=[]; window.__msg=[];
  var o=window.fetch; window.fetch=function(u,x){
    var s=String((u&&u.url)||u||''); var m=s.match(/rpc\\/(pedidos_light_pantalla|caja_light_pantalla|caja_resto_pantalla)|(erp_screen_snapshot)/);
    if(m){ var st=(new Error().stack||'').split('\\n').slice(2,9).map(function(l){return l.trim().replace(/\\(https?:[^)]*app\\.html/,'(').replace(/^at /,'')}).join(' < ');
      __lec.push({t:Math.round(performance.now()), q:m[1]||m[2], st:st}); }
    return o.apply(this,arguments); };
  var WS=window.WebSocket; window.WebSocket=function(a,b){ var w=b?new WS(a,b):new WS(a);
    w.addEventListener('message',function(ev){ try{ var d=JSON.parse(ev.data); if(d.event==='phx_reply'||d.event==='heartbeat'||d.event==='presence_state')return;
      __msg.push({t:Math.round(performance.now()), topic:d.topic, ev:d.event+' jr='+d.join_ref+' r='+d.ref, p:JSON.stringify(d.payload||{}).slice(0,160)}); }catch(e){} });
    var sd=w.send; w.send=function(x){ try{ var d=JSON.parse(x); if(d.event==='phx_join'&&/erp:pedidos$/.test(d.topic)) __msg.push({t:Math.round(performance.now()), topic:d.topic, ev:'>> JOIN r='+d.ref, p:''}); }catch(e){} return sd.apply(w,arguments); };
    return w; }; window.WebSocket.prototype=WS.prototype; ['CONNECTING','OPEN','CLOSING','CLOSED'].forEach(function(k){window.WebSocket[k]=WS[k];});
})();`;
(async () => {
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.enable');
    cli.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') cli.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ESPIA });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const ir = async () => {
      await cli.enviar('Page.navigate', { url: URL });
      for (let i = 0; i < 300; i++) { await pausa(200); try { if (await cdp.evaluar(cli, `!!(window.D&&Array.isArray(D.pedidos)&&D.pedidos.length&&window._sbPerm)`)) break; } catch (e) {} }
    };
    await ir();
    if (TIBIO) { await pausa(5000); await ir(); }
    const t0 = await cdp.evaluar(cli, 'Math.round(performance.now())');
    await pausa(25000);
    const r = await cdp.evaluar(cli, `({lec:__lec.filter(function(x){return x.t>=${t0}}), msg:__msg.filter(function(x){return x.t>=${t0}-2000}), cur:cur, vivo:window.__cajaVivo||null})`);
    console.log('tab ' + r.cur + ' · __cajaVivo ' + JSON.stringify(r.vivo));
    console.log('\n── mensajes en vivo (desde 2 s antes) : ' + r.msg.length);
    r.msg.slice(0, 40).forEach((m) => console.log('  ' + String(m.t - t0).padStart(6) + '  ' + m.topic + ' · ' + m.ev + ' · ' + m.p));
    console.log('\n── lecturas en 25 s: ' + r.lec.length);
    const pilas = new Map(); r.lec.forEach((l) => { const k = l.q + '  ⇐  ' + l.st; pilas.set(k, (pilas.get(k) || 0) + 1); });
    [...pilas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, n]) => console.log('  ×' + n + '  ' + k.slice(0, 600)));
  } finally { cli.matar(); }
})().catch((e) => { console.error(e); process.exit(1); });
