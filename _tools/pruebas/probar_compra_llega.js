/* COMPRAS › + NUEVA COMPRA PIDE CUÁNDO LLEGA (26/11/2026, 871).

   SBSES=<sesión admin de solo lectura> USU=tadeo ANCHO=390|1440 [VIVO=1] node _tools/pruebas/probar_compra_llega.js [base]

   Una reposición de stock sin fecha de llegada ya no la guarda la base (871). Entra a + Nueva compra y prueba dos casos:
     A. Un proveedor CON propuesta (Bernardo Pisano): el campo «Cuándo llega» aparece con la fecha propuesta, el resumen
        dice «Llega el …», el botón dice «Ya se lo pedí — $X» y, tocado de verdad, la compra sale con `llegaEl`.
     B. Un proveedor SIN propuesta: el campo vacío, el botón «Elegí cuándo llega» y deshabilitado; al elegir la fecha
        se habilita.
   La propuesta sale de `prov_llegada_pantalla`. Sin VIVO=1 se simula (A con fecha, B sin): la prueba no depende de la
   hoja de programaciones. Con VIVO=1 la lee de la base de verdad (solo A). La guarda de solo lectura corta el envío:
   no se escribe nada. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8157';
const W = Number(process.env.ANCHO || 390), H = W > 800 ? 900 : 844, USU = process.env.USU || 'tadeo', VIVO = !!process.env.VIVO;
const PROV_A = process.env.PROV_A || 'Bernardo Pisano', PROV_B = process.env.PROV_B || 'Claudia Polito';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const hoy = new Date(Date.now() - 3 * 3600e3), dow = hoy.getUTCDay();
const VIE = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + ((5 - dow + 7) % 7))).toISOString().slice(0, 10);

(async () => {
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  const out = { ancho: W, vie: VIE, vivo: VIVO };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W > 800 ? 1 : 2, mobile: W <= 800 });
    if (W <= 800) await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, USU)
      + ';window.confirm=function(){return false;};window.alert=function(){};window.prompt=function(){return null;};' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 150; i++) { try { if (await ev(`typeof go==='function'&&typeof SESSION!=='undefined'&&!!SESSION`)) break; } catch (e) {} await pausa(200); }
    await pausa(2500);
    if (!VIVO) out.simulado = await ev(`(function(){var o=window._baseRpc;if(typeof o!=='function')return false;window.__llegaPed=[];
      window._baseRpc=function(rpc,a){if(rpc==='prov_llegada_pantalla'){var pv=a&&a.p&&a.p.proveedor;window.__llegaPed.push(pv);
        return Promise.resolve(pv===${JSON.stringify(PROV_A)}?{ok:true,fecha:${JSON.stringify(VIE)},por:'programado',texto:'el retiro programado (prueba)'}:{ok:true,fecha:null});}
        return o.apply(this,arguments);};return true;})()`);
    await ev(`go('busqueda'); 1`);
    for (let i = 0; i < 120; i++) { try { if (await ev(`typeof abaSwitchTab==='function'&&!!document.getElementById('npProv')&&document.getElementById('npProv').options.length>1`)) break; } catch (e) {} await pausa(500); }
    await ev(`abaSwitchTab('nuevo'); 1`); await pausa(1500);
    const elegir = async prov => {
      const r = await ev(`(function(){var s=document.getElementById('npProv');var o=[].filter.call(s.options,function(x){return x.value===${JSON.stringify(prov)};})[0];if(!o)return 'NO ESTÁ';s.value=o.value;s.dispatchEvent(new Event('change'));return o.value;})()`);
      await pausa(VIVO ? 3000 : 1200);
      await ev(`(function(){var i=document.querySelector('#npProductsList input[id^="npq_"]');if(!i)return 'sin productos';i.value='2';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return i.id;})()`);
      await pausa(800);
      return r;
    };
    const estado = () => ev(`(function(){var b=document.getElementById('npConfirm'),w=document.getElementById('npLlegaField'),i=document.getElementById('npLlegaEl'),h=document.getElementById('npLlegaHint'),s=document.getElementById('npSummary');
      var r=w&&w.getBoundingClientRect();return {campoVisible:!!w&&!w.hidden&&r.height>0,dentroDelAncho:!!r&&r.right<=innerWidth+1,fecha:i&&i.value,min:i&&i.min,texto:h&&h.textContent,boton:b.textContent.trim(),habilitado:!b.disabled,resumenLlega:(/Llega el [^\\n]*/.exec(s.innerText)||[''])[0]};})()`);

    /* A. Con propuesta */
    out.A_prov = await elegir(PROV_A);
    out.A = await estado();
    out.hook = await ev(`(function(){var o=window._ordenDirecta;if(typeof o!=='function')return false;window.__compraPay=null;window._ordenDirecta=function(p){if(p&&p.action==='compraManual')window.__compraPay=JSON.parse(JSON.stringify(p));return o.apply(this,arguments);};return true;})()`);
    const r = await ev(`(function(){var b=document.getElementById('npConfirm');b.scrollIntoView({block:'center'});var q=b.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};})()`);
    if (W <= 800) { await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [r] }); await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    else { await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); }
    await pausa(2500);
    const pay = await ev('window.__compraPay');
    out.A_payload = pay ? { proveedor: pay.proveedor, vendedor: pay.vendedor, llegaEl: pay.llegaEl || null, items: (pay.items || []).length } : 'no pasó por _ordenDirecta';

    /* B. Sin propuesta */
    if (!VIVO) {
      out.B_prov = await elegir(PROV_B);
      out.B_antes = await estado();
      await ev(`(function(){var i=document.getElementById('npLlegaEl');i.value=${JSON.stringify(VIE)};i.dispatchEvent(new Event('change',{bubbles:true}));return 1;})()`);
      await pausa(500);
      out.B_despues = await estado();
      out.pedidos = await ev('window.__llegaPed');
    }
    out.errores = await ev('(window.__err||[]).slice(0,5)');
    const A = out.A, B0 = out.B_antes, B1 = out.B_despues;
    out.VERDE = !!(A.campoVisible && A.dentroDelAncho && A.fecha === VIE && /^Ya se lo pedí — /.test(A.boton) && A.habilitado && A.resumenLlega
      && out.A_payload && out.A_payload.llegaEl === VIE
      && (VIVO || (B0.campoVisible && !B0.fecha && B0.boton === 'Elegí cuándo llega' && !B0.habilitado && B1.habilitado && /^Ya se lo pedí — /.test(B1.boton)))
      && !(out.errores || []).length);
    console.log(JSON.stringify(out, null, 1));
  } finally { cli.matar ? cli.matar() : cli.cerrar(); }
})().catch(e => { console.error(e); process.exit(1); });
