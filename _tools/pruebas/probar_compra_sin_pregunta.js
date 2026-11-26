/* COMPRAS › + NUEVA COMPRA SIN LA PREGUNTA DE LOS CLIENTES (26/11/2026, Lucas armando los pedidos a proveedores).

   SBSES=<sesión admin de solo lectura> USU=luqui ANCHO=390|1440 PROV="Bernardo Pisano" node _tools/pruebas/probar_compra_sin_pregunta.js [base]

   Entra como Lucas, arma una reposición a un proveedor que TIENE OC de clientes «Pendiente» (Bernardo Pisano: Le Unike),
   y toca el botón con un toque de verdad. Tiene que:
     · decir «Ya se lo pedí — $X» y la línea «Tocá el botón cuando ya se lo mandaste…»;
     · NO mostrar «¿También le pediste lo de los N clientes?» (la 801, sacada);
     · mandar la compra (la guarda de solo lectura la corta: no se escribe nada) SIN `marcarClientes`. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8157';
const W = Number(process.env.ANCHO || 390), H = W > 800 ? 900 : 844, USU = process.env.USU || 'luqui', PROV = process.env.PROV || 'Bernardo Pisano';
const pausa = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  const out = {};
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W > 800 ? 1 : 2, mobile: W <= 800 });
    if (W <= 800) await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, USU)
      + ';window.confirm=function(){return false;};window.alert=function(){};window.prompt=function(){return null;};' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 150; i++) { try { if (await ev(`typeof go==='function'&&typeof SESSION!=='undefined'&&!!SESSION`)) break; } catch (e) {} await pausa(200); }
    await pausa(2500);
    await ev(`go('busqueda'); 1`);
    for (let i = 0; i < 120; i++) { try { if (await ev(`typeof abaSwitchTab==='function'&&!!document.getElementById('npProv')&&document.getElementById('npProv').options.length>1`)) break; } catch (e) {} await pausa(500); }
    await ev(`abaSwitchTab('nuevo'); 1`); await pausa(1500);
    out.cliPendientes = await ev(`((window.busqueda&&busqueda.ocs)||[]).filter(function(o){return o.prov===${JSON.stringify(PROV)}&&o.est==='Pendiente'&&!/Stock/.test(o.cliente||'');}).length`);
    out.prov = await ev(`(function(){var s=document.getElementById('npProv');var o=[].filter.call(s.options,function(x){return x.value===${JSON.stringify(PROV)};})[0];if(!o)return 'NO ESTÁ';s.value=o.value;s.dispatchEvent(new Event('change'));return o.value;})()`);
    await pausa(1500);
    out.producto = await ev(`(function(){var i=document.querySelector('#npProductsList input[id^="npq_"]');if(!i)return 'sin productos';i.value='2';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return i.id;})()`);
    await pausa(800);
    out.antes = await ev(`(function(){var b=document.getElementById('npConfirm');var s=document.getElementById('npSummary');return {boton:b.textContent.trim(),habilitado:!b.disabled,linea:/cuando ya se lo mandaste/.test(s.innerText)};})()`);
    const r = await ev(`(function(){var b=document.getElementById('npConfirm');b.scrollIntoView({block:'center'});var q=b.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};})()`);
    /* La guarda recorta el cuerpo a 90 caracteres: el payload entero se mira en _ordenDirecta. */
    out.hook = await ev(`(function(){var o=window._ordenDirecta;if(typeof o!=='function')return false;window.__compraPay=null;window._ordenDirecta=function(p){if(p&&p.action==='compraManual')window.__compraPay=JSON.parse(JSON.stringify(p));return o.apply(this,arguments);};return true;})()`);
    const antes = await ev('(window.__bloqueados||[]).length');
    if (W <= 800) { await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [r] }); await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    else { await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); }
    await pausa(2500);
    out.pregunta = await ev(`!!document.getElementById('npCliPreg')||/También le pediste/.test(document.body.innerText)`);
    const env = (await ev('window.__bloqueados||[]')).slice(antes);
    out.envio = env.map(x => x.slice(0, 80));
    out.envio_compra = env.some(x => /compra/i.test(x));
    const pay = await ev('window.__compraPay');
    out.payload = pay ? { action: pay.action, proveedor: pay.proveedor, items: (pay.items || []).length, marcarClientes: 'marcarClientes' in pay } : 'no pasó por _ordenDirecta';
    out.errores = await ev('(window.__err||[]).slice(0,5)');
    console.log(JSON.stringify(out, null, 1));
  } finally { cli.matar ? cli.matar() : cli.cerrar(); }
})().catch(e => { console.error(e); process.exit(1); });
