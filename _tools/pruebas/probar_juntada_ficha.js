/* La ficha del pedido: «¿Es de una juntada?» (28/10/2026).
     BASE_URL=http://localhost:PUERTO/app.html?prueba=1 node _tools/pruebas/probar_juntada_ficha.js [ancho]
   Sin backend (?prueba=1): se arma `D.pedidos` con datos inventados (repo público) y se interceptan los POST.
   Sostiene: · el recuadro ofrece las juntadas de los últimos 21 días, una por nombre (sin mayúsculas ni acentos), con
   cuántos pedidos y quiénes; la vieja de hace un mes y la marca «Sí» no aparecen; · elegir una manda `pedidoGrupal` con
   el MISMO texto; · «Crear» manda lo tipeado; · marcado dice «Es de la juntada X» y «Sacar» manda vacío; · la chapita
   dice «Juntada»; · en Red el recuadro NO aparece sin JUNTADA_RED, y sí con ella; · nada se sale a 390 px. */
'use strict';
const cdp = require('./cdp.js');
const ANCHO = Number(process.argv[2]) || 390;
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html?prueba=1';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 700))); };
const hoy = new Date(), dd = (n) => { const d = new Date(hoy.getTime() - n * 86400000); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
const P = (o) => Object.assign({ h: 'Home', es: 'Pendiente', ep: 'No Cobrado', fp: 'Efectivo', $: 10000, p: [], o: 'Tienda', grp: '' }, o);
const PEDS = [
  P({ n: '9001', r: 11, c: 'Ana Prueba', f: dd(1) }),
  P({ n: '9002', r: 12, c: 'Beto Prueba', f: dd(3), grp: 'Asado del Sábado' }),
  P({ n: '9003', r: 13, c: 'Caro Prueba', f: dd(2), grp: 'asado del sabado' }),
  P({ n: '9004', r: 14, c: 'Dani Prueba', f: dd(5), grp: 'Cumple de Eli' }),
  P({ n: '9005', r: 15, c: 'Fede Prueba', f: dd(40), grp: 'Asado viejo' }),
  P({ n: '9006', r: 16, c: 'Gabi Prueba', f: dd(2), grp: 'Sí' }),
  P({ n: '9007', r: 17, c: 'Hugo Prueba', f: dd(1), h: 'Red' }),
];
(async () => {
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__posts=[];window.__err=[];window.addEventListener("error",function(e){window.__err.push(String(e.message));});'
      + '(function(){var o=window.fetch;window.fetch=function(u,x){if(x&&String(x.method||"").toUpperCase()==="POST"){var b={};try{b=JSON.parse(x.body);}catch(e){}window.__posts.push(b);return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{"Content-Type":"application/json"}}));}return o.apply(this,arguments);};})();' });
    await cli.enviar('Page.navigate', { url: URL });
    const esperar = async (e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await cdp.evaluar(cli, e)) return true; } catch (x) {} await pausa(300); } return false; };
    if (!await esperar("typeof window.openOrdDetail==='function' && typeof window._ordJuntadasRecientes==='function'")) throw new Error('no arrancó');
    await pausa(1500);
    await cdp.evaluar(cli, `(function(){window.D=window.D||{};D.pedidos=${JSON.stringify(PEDS)};window._ordenPost=function(b){window.__posts.push(b);return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200}));};window._pfAplicar=function(){return Promise.resolve();};window._recargarPedidos=function(){};return 1;})()`);
    const abrir = async (h, n, r) => { await cdp.evaluar(cli, `(function(){try{closeOrdDetail()}catch(e){};D.pedidos=${JSON.stringify(PEDS)};window.openOrdDetail(${JSON.stringify(h)},${JSON.stringify(n)},${r});return 1;})()`); await pausa(900); };
    const LEER = `(function(){var bx=[].slice.call(document.querySelectorAll('.ord-trajo')).filter(function(x){return /juntada/i.test(x.textContent);})[0];
      var vw=document.documentElement.clientWidth;
      return {hay:!!bx,txt:bx?bx.textContent.replace(/\\s+/g,' '):'',ops:bx?[].slice.call(bx.querySelectorAll('.ord-junt-op')).map(function(b){return b.textContent.replace(/\\s+/g,' ').trim();}):[],
        afuera:bx?[].slice.call(bx.querySelectorAll('button,input')).filter(function(b){var q=b.getBoundingClientRect();return q.width>0&&q.right>vw+1;}).length:0,
        tag:[].slice.call(document.querySelectorAll('.ord-tag')).map(function(t){return t.textContent;}).join('|')};})()`;
    await abrir('Home', '9001', 11);
    let L = await cdp.evaluar(cli, LEER);
    chk('la ficha pregunta «¿Es de una juntada?»', L.hay && /¿Es de una juntada\?/.test(L.txt), L.txt.slice(0, 200));
    chk('ofrece 2 juntadas recientes (las dos «asado del sábado» son UNA), la más nueva arriba', L.ops.length === 2 && /Asado del Sábado/i.test(L.ops[0]) && /2 pedidos/.test(L.ops[0]) && /Beto Prueba/.test(L.ops[0]) && /Caro Prueba/.test(L.ops[0]) && /Cumple de Eli/.test(L.ops[1]), L.ops);
    chk('no ofrece la de hace 40 días ni la marca vieja «Sí»', !L.ops.some((t) => /viejo|^Sí/.test(t)), L.ops);
    chk('nada se sale de la pantalla', L.afuera === 0, L.afuera);
    await cdp.evaluar(cli, "window.__posts=[];document.querySelector('.ord-junt-op').click();1"); await pausa(500);
    let ps = await cdp.evaluar(cli, 'window.__posts');
    const g1 = (ps || []).filter((x) => x.action === 'pedidoGrupal')[0];
    chk('elegir una manda pedidoGrupal con el MISMO texto que sus pedidos', g1 && g1.hoja === 'Home' && g1.row === 11 && g1.id === '9001' && g1.valor === 'Asado del Sábado', ps);
    await abrir('Home', '9001', 11);
    await cdp.evaluar(cli, "window.__posts=[];document.getElementById('ordGrupalQue').value='Cumple de Ana';[].slice.call(document.querySelectorAll('.ord-trajo-op')).filter(function(b){return b.textContent==='Crear';})[0].click();1"); await pausa(500);
    ps = await cdp.evaluar(cli, 'window.__posts');
    chk('«Crear» manda la juntada nueva', (ps || []).some((x) => x.action === 'pedidoGrupal' && x.valor === 'Cumple de Ana'), ps);
    await abrir('Home', '9002', 12);
    L = await cdp.evaluar(cli, LEER);
    chk('marcado: dice «Es de la juntada …» y la chapita dice Juntada', /Es de la juntada Asado del Sábado/.test(L.txt) && /🎉 Juntada/.test(L.tag) && !/Grupal/.test(L.tag), { t: L.txt.slice(0, 160), tag: L.tag });
    await cdp.evaluar(cli, "window.__posts=[];[].slice.call(document.querySelectorAll('.ord-trajo-op')).filter(function(b){return /Sacar de la juntada/.test(b.textContent);})[0].click();1"); await pausa(500);
    ps = await cdp.evaluar(cli, 'window.__posts');
    chk('«Sacar de la juntada» manda vacío', (ps || []).some((x) => x.action === 'pedidoGrupal' && x.valor === '' && x.id === '9002'), ps);
    await cdp.evaluar(cli, "window._sbPerm=null;1");
    await abrir('Red', '9007', 17);
    L = await cdp.evaluar(cli, LEER);
    chk('en Red, sin JUNTADA_RED, no aparece', !L.hay, L.txt.slice(0, 100));
    await cdp.evaluar(cli, "window._sbPerm={pal:{juntadaRed:true}};1");
    await abrir('Red', '9007', 17);
    L = await cdp.evaluar(cli, LEER);
    chk('en Red, con JUNTADA_RED, aparece', L.hay && L.ops.length === 2, L);
    const err = await cdp.evaluar(cli, 'window.__err');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL se cortó: ' + (e.stack || e)); }
  console.log(`\n${ok} ok · ${mal} MAL`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
