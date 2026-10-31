/* CUÁNTO TARDA CADA TOQUE DE RUTA EN VERSE (31/10/2026).
     BASE=http://localhost:<puerto> node _tools/pruebas/medir_toques_ruta.js <token> [390|1440] [--sin-freno]
   Sesión real con las entregas INVENTADAS de probar_flujo_ruta.js (el repo es público) y todo POST demorado 3 s, como
   un servidor lento. Por defecto 390 px y CPU ×4 (su iPhone). Cada acción se dispara EN la página y se cuenta, ahí
   mismo, hasta el cuadro pintado en que la pantalla ya muestra el cambio (rAF después del cambio). Mide también si el
   loader tapó la pantalla. «Guardado» no se mide acá: sale de lo real, `medir_guardado.py`. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390, SIN_FRENO = process.argv.includes('--sin-freno');
const BASE = process.env.BASE || 'http://localhost:8080', DEMORA = 3000;
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][hoyAR.getDay()];
const base = (o) => Object.assign({ oD: {}, oc: [], hr: '10:30', f: dmy(hoyAR), de: DIA, fe: iso(hoyAR), es: 'Pendiente',
  d: '', t: '1156000000', ep: 'No Cobrado', fp: 'Efectivo', o: 'Orden de Compra', b: 'Estancias del Pilar' }, o);
const ENT = [
  base({ id: 9201, h: 'Home', r: 9201, c: 'Toque Entregar', sb: 'Champagnat Alto', l: '11', $: 12000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9202, h: 'Home', r: 9202, c: 'Toque Cobrar', sb: 'Golf', l: '22', $: 25000, p: [{ a: 'PMu', q: 2 }] }),
  base({ id: 9203, h: 'Home', r: 9203, c: 'Toque Reservar', sb: 'La Pionera', l: '33', $: 18000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9204, h: 'Home', r: 9204, c: 'Toque Cancelar', sb: 'El Recuerdo', l: '44', $: 9000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9205, h: 'Home', r: 9205, c: 'Toque Ultima', sb: 'Santa Elena', l: '55', $: 7000, p: [{ a: 'PMu', q: 1 }] })
];
const EXTRA = `window.__posts=[];
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||'');
    if(x&&String(x.method||'').toUpperCase()==='POST'){ var b={}; try{b=JSON.parse(x.body);}catch(e){} window.__posts.push(b);
      return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}})); }, ${DEMORA}); }); }
    if(url.indexOf('action=entregas')>-1) return Promise.resolve(new Response(JSON.stringify({ts:Date.now()-60000,e:${JSON.stringify(ENT)}}),{status:200,headers:{'Content-Type':'application/json'}}));
    if(url.indexOf('action=pendientesGuardarStock')>-1) return Promise.resolve(new Response('{"ok":true,"items":[]}',{status:200,headers:{'Content-Type':'application/json'}}));
    return o.apply(this,arguments); }; })();
  window.confirm=function(){return true;};
  try{ localStorage.removeItem('maleu_ruta'); }catch(e){}`;
/* Dispara `accion` y cuenta hasta el primer cuadro en que `listo` da true (y uno más: el pintado). */
const TOQUE = (accion, listo) => `new Promise(function(fin){
  var tap=0, t0=performance.now(), el=document.getElementById('rutLoaderOverlay');
  var iv=setInterval(function(){ if(el&&el.classList.contains('visible'))tap=performance.now()-t0; },16);
  try{ ${accion}; }catch(e){ clearInterval(iv); fin({err:String(e)}); return; }
  (function mira(){ var ok=false; try{ ok=!!(${listo}); }catch(e){}
    if(ok){ requestAnimationFrame(function(){ var ms=performance.now()-t0; setTimeout(function(){ clearInterval(iv); fin({ms:Math.round(ms),tapa:Math.round(tap)}); },${DEMORA + 800}); }); return; }
    if(performance.now()-t0>15000){ clearInterval(iv); fin({ms:-1,tapa:Math.round(tap)}); return; }
    requestAnimationFrame(mira); })();
})`;
const TIENE = n => `getSorted().some(function(x){return /${n}/.test(JSON.stringify(x));})`;
const K = { e: 'Home|R9201', c: 'Home|R9202', r: 'Home|R9203', x: 'Home|R9204' };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  if (!SIN_FRENO) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("ruta")');
  if (!await esperar(cli, '(function(){try{return getPendientes().length===5}catch(e){return false}})()', 90000)) { console.log('no llegaron las entregas'); process.exit(1); }
  await evaluar(cli, 'switchTab("ruta")'); await pausa(1500);
  const filas = [];
  const med = async (boton, accion, listo) => { const r = await evaluar(cli, TOQUE(accion, listo)); filas.push([boton, r]); };
  await med('Entregado', 'marcarEntregado(' + JSON.stringify(K.e) + ')', '!' + TIENE('Toque Entregar'));
  await evaluar(cli, 'abrirCobroRuta(' + JSON.stringify(K.c) + ')'); await pausa(800);
  await evaluar(cli, `(function(){var c=document.getElementById('cobroYaEntregado');if(c){c.checked=false;c.onchange({target:c});}return 1})()`); await pausa(300);
  await med('Cobrar (confirmar el cuadro)', 'confirmarCobroRuta()', `document.getElementById('cobroRutaOverlay').classList.contains('hidden')&&/Cobrado/.test(JSON.stringify(findByKey(${JSON.stringify(K.c)})||{}))`);
  await med('Reservar', 'cambiarEstadoRuta(' + JSON.stringify(K.r) + ',"Reservado")', '(findByKey(' + JSON.stringify(K.r) + ')||{}).es==="Reservado"');
  await med('Cancelar', 'cancelarRuta(' + JSON.stringify(K.x) + ')', '!' + TIENE('Toque Cancelar'));
  console.log('\n=== RUTA · toque → pantalla · ' + ANCHO + ' px' + (SIN_FRENO ? '' : ' · CPU ×4') + ' · POST a ' + DEMORA / 1000 + ' s ===');
  filas.forEach(([b, r]) => console.log('  ' + b.padEnd(30) + (r.err ? 'ERROR ' + r.err : (r.ms < 0 ? 'NO CAMBIÓ en 15 s' : r.ms + ' ms') + (r.tapa ? '  · tapó ' + r.tapa + ' ms' : ''))));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
