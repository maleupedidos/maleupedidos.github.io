/* LOS FLUJOS DE TODOS LOS DÍAS, SIN PERDER LO CARGADO (8/11/2026).
     node _tools/pruebas/probar_flujos_ux.js <token> [390|1440]
   Sesión real con entregas INVENTADAS y todo POST cortado (no sale nada). Sostiene:
   A. el cuadro de cobro: tocar el FONDO sin haber tocado nada lo cierra; después de tipear, NO (avisa); la × cierra.
   B. el billete escrito antes de «Di vuelto»: el aviso del sobrante ofrece «Le di vuelto» y calcula el vuelto.
   C. + PEDIDO sin productos: avisa «Agrega al menos un producto» SIN pasar por ningún confirm «¿guardar igual?».
   D. el pedido a medio cargar sobrevive a recargar la app: ofrece «Recuperarlo» y vuelve con el nombre y el carrito;
      guardar/empezar de cero (npReset) lo borra.
   Contra la versión anterior falla en A, B, C y D. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); } return false; };
const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][hoyAR.getDay()];
const ent = (id, c, $) => ({ oD: {}, oc: [], hr: '10:30', f: dmy(hoyAR), de: DIA, fe: iso(hoyAR), es: 'Pendiente', d: '', t: '1156000000',
  ep: 'No Cobrado', fp: 'Efectivo', o: 'Orden de Compra', b: 'Estancias del Pilar', id, h: 'Home', r: id, c, sb: 'Golf', l: String(id).slice(-2), $, p: [{ a: 'PMu', q: 1 }] });
const ENT = [ent(9301, 'UX Cobro', 25000), ent(9302, 'UX Vuelto', 25000)];
const EXTRA = `window.__posts=[]; window.__conf=0;
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||'');
    if(x&&String(x.method||'').toUpperCase()==='POST'){ var b={}; try{b=JSON.parse(x.body);}catch(e){} window.__posts.push(b);
      return Promise.resolve(new Response('{"ok":false,"err":"cortado por la prueba"}',{status:200,headers:{'Content-Type':'application/json'}})); }
    if(url.indexOf('action=entregas')>-1) return Promise.resolve(new Response(JSON.stringify({ts:Date.now()-60000,e:${JSON.stringify(ENT)}}),{status:200,headers:{'Content-Type':'application/json'}}));
    return o.apply(this,arguments); }; })();
  window.confirm=function(){ window.__conf++; return false; };
  try{ localStorage.removeItem('maleu_ruta'); }catch(e){}`;
const res = [];
const ok = (n, c, det) => { res.push([n, !!c, det]); };
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  const arrancar = async () => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + (process.env.APP || 'app.html') });
    if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arrancó'); process.exit(1); }
    await evaluar(cli, 'go("ruta")');
    if (!await esperar(cli, '(function(){try{return getPendientes().length>=2}catch(e){return false}})()')) return false;
    /* El arranque termina con su propio go() y puede llevar a Inicio DESPUÉS del nuestro: se espera a que Ruta
       quede visible 3 s seguidos (si no, todo lo de Ruta mide 0 px y la prueba miente). */
    let firme = 0;
    for (let i = 0; i < 60 && firme < 10; i++) {
      const vis = await evaluar(cli, `(function(){ var p=document.getElementById('p-ruta'); var v=p&&getComputedStyle(p).display!=='none'; if(!v)go('ruta'); return v; })()`);
      firme = vis ? firme + 1 : 0; await pausa(300);
    }
    return firme >= 10;
  };
  if (!await arrancar()) { console.log('no llegaron las entregas'); process.exit(1); }
  await evaluar(cli, 'try{localStorage.removeItem("maleu_np_borrador")}catch(e){} 1');
  const ov = `document.getElementById('cobroRutaOverlay')`;
  const fondo = `(function(){ var o=${ov}; o.dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1; })()`;
  const abierto = `!${ov}.classList.contains('hidden')`;

  /* A */
  await evaluar(cli, 'abrirCobroRuta("Home|R9301")'); await pausa(600);
  await evaluar(cli, fondo); await pausa(200);
  ok('A1 fondo sin tocar nada cierra', !(await evaluar(cli, abierto)));
  await evaluar(cli, 'abrirCobroRuta("Home|R9301")'); await pausa(600);
  await evaluar(cli, `(function(){ var i=document.getElementById('cobroRecEf'); i.value='20000'; i.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await pausa(200); await evaluar(cli, fondo); await pausa(200);
  ok('A2 fondo después de tipear NO cierra', await evaluar(cli, abierto));
  await evaluar(cli, `document.querySelector('#cobroRutaOverlay .cobro-ruta-close').click(); 1`); await pausa(200);
  ok('A3 la × cierra', !(await evaluar(cli, abierto)));

  /* B */
  await evaluar(cli, 'abrirCobroRuta("Home|R9302")'); await pausa(600);
  await evaluar(cli, `(function(){ var i=document.getElementById('cobroRecEf'); i.value='30000'; i.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  await pausa(400);
  const b1 = await evaluar(cli, `(function(){ var b=[].find.call(document.querySelectorAll('#cobroRutaOverlay button'),function(x){return /Le di vuelto/.test(x.textContent)&&x.offsetParent!==null;});
    if(!b){ var o=[].find.call(document.querySelectorAll('#cobroRutaOverlay button'),function(x){return /Le di vuelto/.test(x.textContent);}); var ch=[];
      for(var e=o;e;e=e.parentElement){ ch.push((e.id||String(e.className).slice(0,20)||e.tagName)+':'+getComputedStyle(e).display); }
      return {hay:false, escondido:ch.join(' < '), err:(document.getElementById('cobroRutaErr')||{}).innerText}; }
    var h=Math.round(b.getBoundingClientRect().height); b.click(); return {hay:true,h:h}; })()`);
  await pausa(400);
  const cam = await evaluar(cli, `(function(){ var i=document.getElementById('cobroCamEf'); return i?String(i.value):''; })()`);
  ok('B1 el aviso ofrece «Le di vuelto» (44 px)', b1.hay && b1.h >= 44, JSON.stringify(b1));
  ok('B2 el vuelto queda calculado ($5.000)', /5\.?000/.test(cam), 'cobroCamEf=' + cam);
  await evaluar(cli, `document.querySelector('#cobroRutaOverlay .cobro-ruta-close').click(); 1`);

  /* C */
  await evaluar(cli, 'switchTab("nuevo")'); await pausa(1500);
  await evaluar(cli, `(function(){ npReset(); var n=document.getElementById('npNombre'); n.value='UX Sin productos'; window.__conf=0; window.__posts=[]; npGuardar(); return 1; })()`);
  await pausa(500);
  const c1 = await evaluar(cli, `({conf:window.__conf, posts:window.__posts.length})`);
  ok('C1 sin productos: ningún confirm ni POST', c1.conf === 0 && c1.posts === 0, JSON.stringify(c1));

  /* D */
  const idProd = await evaluar(cli, `(function(){ var b=[].find.call(document.querySelectorAll('#npProductos [onclick*="npQty("]'),function(x){return /,\\s*1\\)/.test(x.getAttribute('onclick'));}); if(!b) return null;
    var m=/npQty\\(\\s*'?(\\d+)/.exec(b.getAttribute('onclick')); return m?m[1]:null; })()`);
  await evaluar(cli, `(function(){ npReset(); var n=document.getElementById('npNombre'); n.value='UX Borrador'; n.dispatchEvent(new Event('input',{bubbles:true}));
    npQty(${JSON.stringify(idProd)},1); npQty(${JSON.stringify(idProd)},1); document.getElementById('npProductos').dispatchEvent(new MouseEvent('click',{bubbles:true})); return 1; })()`);
  await pausa(900);
  const guardado = await evaluar(cli, `localStorage.getItem('maleu_np_borrador')`);
  ok('D1 queda una copia en el celular (con el carrito)', guardado && /UX Borrador/.test(guardado) && /"cart":\{"[^"]+":2/.test(guardado),
    'id=' + idProd + ' · ' + String(guardado).replace(/.*("cart":[^}]*\}).*/, '$1'));
  if (!await arrancar()) { console.log('no volvió'); process.exit(1); }
  await evaluar(cli, 'switchTab("nuevo")'); await pausa(1500);
  const ofrece = await evaluar(cli, `(function(){ var b=document.getElementById('npBorrador'); return b&&!b.hidden?b.innerText.replace(/\\s+/g,' '):''; })()`);
  ok('D2 al volver ofrece recuperarlo', /UX Borrador/.test(ofrece) && /Recuperarlo/.test(ofrece), ofrece.slice(0, 120));
  await evaluar(cli, `(function(){ var b=document.querySelector('#npBorrador .np-borr-si'); if(b)b.click(); return 1; })()`); await pausa(600);
  /* `npCart` NO se lee de window: npReset lo reemplaza por un objeto nuevo y la copia publicada queda vieja. Se mira
     la cantidad en pantalla del producto y la copia que se vuelve a guardar al recuperar. */
  const vuelve = await evaluar(cli, `(function(){ var b=[].find.call(document.querySelectorAll('#npProductos [onclick*="npQty(${idProd},"]'),function(x){return true;});
    var fila=b&&b.parentElement, txt=fila?fila.innerText.replace(/\\s+/g,' '):'';
    var g=localStorage.getItem('maleu_np_borrador')||''; var m=/"cart":(\\{[^}]*\\})/.exec(g);
    return {nom:document.getElementById('npNombre').value, cart:m?m[1]:'', fila:txt}; })()`);
  ok("D3 vuelve con el nombre y el carrito", vuelve.nom === "UX Borrador" && /:2/.test(vuelve.cart) && /(^|\D)2(\D|$)/.test(vuelve.fila), JSON.stringify(vuelve));
  await evaluar(cli, 'npReset(); 1'); await pausa(200);
  ok('D4 npReset lo borra', !(await evaluar(cli, `localStorage.getItem('maleu_np_borrador')`)));
  const posts = await evaluar(cli, 'window.__posts.length');
  ok('no salió ningún POST', posts === 0, 'posts=' + posts);

  console.log('\n=== flujos UX · ' + ANCHO + ' px ===');
  res.forEach(([n, b, d]) => console.log('  ' + (b ? 'ok ' : 'MAL') + ' ' + n + (b || !d ? '' : '  → ' + d)));
  const mal = res.filter(r => !r[1]).length;
  console.log(mal ? '\n' + mal + ' MAL' : '\nTODO OK'); cli.matar(); process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
