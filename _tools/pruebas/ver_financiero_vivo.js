/* EL FINANCIERO EN VIVO, SOLO LECTURA (15/11/2026).
 *
 *   SESION=<archivo de sesion_prueba.py> [BASE=https://app.maleu.com.ar/app.html] [ANCHO=390] node ver_financiero_vivo.js
 *
 * Abre Resultados › Financiero con datos reales y dice lo que ve Tadeo: «Si todo sigue igual, el DD/MM vas a tener $X en
 * caja · Tu mínimo es $Y · el día que baja», los renglones de Monotributo de la proyección y la de Gastos. Toda escritura
 * se corta (solo pasan *_pantalla, *_datos, *_base). Deja una captura en el temporal.
 */
'use strict';
const fs = require('fs');
const cdp = require('./cdp.js');
const S = process.env.SESION, BASE = process.env.BASE || 'https://app.maleu.com.ar/app.html', ANCHO = Number(process.env.ANCHO || 390);
if (!S || !fs.existsSync(S)) { console.log('falta SESION=<archivo de sesion_prueba.py>'); process.exit(1); }
const ses = JSON.parse(fs.readFileSync(S, 'utf8'));
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const usuario = ses.usuario || 'tadeo';
const PREP = `try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:${JSON.stringify(usuario)},rol:'admin',ts:Date.now()}));
  localStorage.setItem('maleu_res_v','fin');
  localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: usuario, url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
  (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
    var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
    if(m==='POST'&&(/script\\.google\\.com/.test(s)||(r&&!/_(pantalla|datos|base)$|^permiso_base$|^demanda_por_deposito$/.test(r[1]))))return Promise.resolve(new Response('{"ok":false,"err":"cortado"}',{status:200,headers:{'Content-Type':'application/json'}}));
    return f.apply(this,arguments);};})();`;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now() });
    for (let i = 0; i < 120; i++) { try { if (await cdp.evaluar(cli, "typeof go==='function'&&!!window.D&&Array.isArray(D.gastos)&&D.gastos.length>0")) break; } catch (e) {} await pausa(500); }
    await cdp.evaluar(cli, "go('resultados'); 1");
    let r = null, ultimo = '', quieto = 0;
    for (let i = 0; i < 120; i++) {
      r = await cdp.evaluar(cli, `(function(){ var h=document.getElementById('proyHero'); if(!h)return null;
        var P=_proyArmar(), mono=P.con.concat(P.sin).filter(function(x){return /Monotributo/.test(x.lbl);}).map(function(x){return {f:x.f?_proyDm(x.f):'sin fecha',m:Math.round(x.$),org:x.org};});
        return {version:(typeof CN!=='undefined'?CN:''), texto:h.innerText.replace(/\\s+/g,' ').trim(), caja:Math.round(P.caja), hasta:_proyDm(P.hasta), mono:mono,
          provNov:eerrProvisiones(11,2026).filter(function(p){return p.cat==='impuesto_monotributo';}).map(function(p){return p.concepto+' '+p.monto;}),
          monoNovAlDia:Math.round(_eerrMesGastosAlDia(11,2026).L.mono||0), monoOct:Math.round(_eerrMesGastos(10,2026).L.mono||0),
          scroll:document.documentElement.scrollWidth>innerWidth+1}; })()`);
      /* La proyección se repinta a medida que llegan la deuda de proveedores y la Red: se lee recién cuando el número
         quedó quieto 8 s seguidos (la primera vez se leyó a mitad de camino: $10,9M contra $5,0M). */
      if (r && !/…|calculando/.test(r.texto)) { if (r.texto === ultimo) { if (++quieto >= 8) break; } else { ultimo = r.texto; quieto = 0; console.log('  …', r.texto); } }
      await pausa(1000);
    }
    console.log(JSON.stringify(r, null, 1));
    if (process.env.DETALLE) console.log(JSON.stringify(await cdp.evaluar(cli, `(function(){ var P=_proyArmar(), g={};
      P.con.forEach(function(x){ var k=(x.tipo==='in'?'+ ':'- ')+String(x.lbl).split(' · ')[0].replace(/#.*$/,'').trim(); g[k]=(g[k]||0)+Math.round(x.$); });
      return {caja:Math.round(P.caja), grupos:g, sinFecha:P.sin.map(function(x){return (x.tipo==='in'?'+ ':'- ')+x.lbl+' '+Math.round(x.$);}).slice(0,12)}; })()`), null, 1));
    await cdp.evaluar(cli, "var e=document.getElementById('proyHero'); if(e)e.scrollIntoView({block:'center'}); 1"); await pausa(400);
    const shot = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    const out = require('os').tmpdir() + '/financiero_vivo_' + ANCHO + '.png'; fs.writeFileSync(out, Buffer.from(shot.data, 'base64')); console.log('captura: ' + out);
    if (process.env.DEPOSITOS) {
      await cdp.evaluar(cli, "go('ajustes'); ajGo('depositos'); 1");
      for (let i = 0; i < 30; i++) { if (await cdp.evaluar(cli, "document.querySelectorAll('#ajBody .st-frz-f').length>0")) break; await pausa(1000); }
      console.log('Depósitos:', JSON.stringify(await cdp.evaluar(cli, "Array.from(document.querySelectorAll('#ajBody .st-frz')).map(function(c){return c.innerText.replace(/\\s+/g,' ').trim();})")));
    }
  } finally { try { cli.matar(); } catch (e) {} }
})();
