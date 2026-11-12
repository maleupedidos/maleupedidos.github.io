/* La ficha de Josefina Del Bono (11/11/2026): barrio con autocompletar, domicilio a lo no entregado, y el mapa al dedo.
     python ../estancias/scripts/migraciones/sesion_prueba.py crear <scratch>/sbses.json
     SBSES=<scratch>/sbses.json BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_ficha_josefina.js
   Sesión de la base con la guarda de solo lectura: no se escribe nada (Guardar no se toca; el domicilio se prueba con
   pedidos inventados en memoria). A 390 px con pantalla táctil. Sostiene:
   · (2) escribir «golf» en Barrio sugiere «Golf · Estancias del Pilar» (botones de ≥ 44 px) y tocarla llena barrio y
     sub-barrio; un barrio que no existe pide confirmación antes de guardarse;
   · (3) `_fichaDomicilioAPedidos` cambia el domicilio de lo NO entregado de ese teléfono y deja lo entregado;
   · (4) en el mapa, un toque a 15 px de una casa sola la abre; un toque entre casas pegadas abre la lista. */
'use strict';
const path = require('path');
const cdp = require(path.join(__dirname, 'cdp.js')), prep = require(path.join(__dirname, 'sesion_prep.js'));
const guarda = require(path.join(__dirname, 'sbses_guarda.js'));
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html', TEL = '1170155566';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 500))); };
(async () => {
  const SB = guarda(process.env.SBSES, 'tadeo');
  if (!SB) { console.log('falta SBSES'); process.exit(2); }
  const cli = await cdp.abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + SB });
    await cli.enviar('Page.navigate', { url: URL });
    const ev = (e) => cdp.evaluar(cli, e);
    await pausa(2500);
    if (!(await guarda.verificarGuarda(cli, cdp.evaluar))) throw new Error('la guarda de solo lectura no corta');
    const esperar = async (e, ms = 90000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch (x) {} await pausa(400); } return false; };
    if (!await esperar("typeof go==='function' && typeof window.verFichaCliente==='function'")) throw new Error('el ERP no arrancó');
    await esperar("typeof crmClientes!=='undefined' && crmClientes && crmClientes.length>50", 90000);
    const toque = async (x, y) => {
      await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: 8, radiusY: 8, force: 1 }] });
      await pausa(60); await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pausa(400);
    };
    const centro = async (sel) => JSON.parse(await ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'null';e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,h:r.height});})()`));

    /* (2) Barrio con autocompletar */
    await ev(`window.verFichaCliente(${JSON.stringify(TEL)})`);
    if (!await esperar("!!document.querySelector('#crmDrawerBody .crm-ficha-name')", 30000)) throw new Error('la ficha no abrió');
    await ev('crmEditarMeta()'); await esperar("!!document.getElementById('metaBarrioMapa')", 10000); await pausa(300);
    await ev("(function(){var i=document.getElementById('metaBarrioMapa');i.focus();i.value='golf';i.dispatchEvent(new Event('input',{bubbles:true}));})()");
    await pausa(300);
    const sug = JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('#metaBarrioSug .meta-bar-op'),function(b){return {t:b.textContent,h:b.getBoundingClientRect().height};}))"));
    chk('(2) «golf» sugiere Golf · Estancias del Pilar', sug.some((s) => /^Golf · Estancias del Pilar$/.test(s.t)), sug);
    chk('(2) cada sugerencia mide ≥ 44 px', sug.length > 0 && sug.every((s) => s.h >= 43.5), sug.map((s) => s.h));
    const c1 = await centro('#metaBarrioSug .meta-bar-op[data-s="Golf"][data-b="Estancias del Pilar"]');
    await toque(c1.x, c1.y);
    const v = JSON.parse(await ev("JSON.stringify({b:document.getElementById('metaBarrioMapa').value,s:document.getElementById('metaSubMapa').value,abierta:!document.getElementById('metaBarrioSug').hidden})"));
    chk('(2) tocarla llena barrio y sub-barrio y cierra la lista', v.b === 'Estancias del Pilar' && v.s === 'Golf' && !v.abierta, v);
    chk('(2) un barrio que no existe NO pasa sin preguntar', await ev("!window._metaBarrioExiste('Barrio Inventado 123') && window._metaBarrioExiste('estancias del pilar')"));
    await ev("(function(){window.__conf=[];window.confirm=function(m){window.__conf.push(m);return false;};document.getElementById('metaBarrioMapa').value='Barrio Inventado 123';window.__posts=[];crmGuardarMeta();})()");
    await pausa(500);
    const cf = JSON.parse(await ev("JSON.stringify({c:window.__conf,p:(window.__posts||[]).length})"));
    chk('(2) al guardar un barrio nuevo pregunta, y con «no» no manda nada', cf.c.length === 1 && /no es ningún barrio/.test(cf.c[0]) && cf.p === 0, cf);

    /* (3) El domicilio de la ficha va a lo no entregado (en memoria) */
    const r3 = JSON.parse(await ev(`(function(){var bak=D.pedidos;D.pedidos=[
      {h:'Home',n:'9101',tel:'5491170155566',estado:'Pendiente',barrio:'Estancias del Pilar',subBarrio:'Champagnat Alto',dir:'Champagnat Alto'},
      {h:'Home',n:'9102',tel:'1170155566',estado:'Entregado',barrio:'Estancias del Pilar',subBarrio:'Champagnat Alto',dir:'Champagnat Alto'},
      {h:'Home',n:'9103',tel:'1199999999',estado:'Pendiente',barrio:'Estancias del Pilar',subBarrio:'La Pionera',dir:'La Pionera · Lote 3'}];
      var n=window._fichaDomicilioAPedidos({tel:'1170155566'},{barrioMapa:'Estancias del Pilar',subBarrioMapa:'Golf',loteMapa:'151'});
      var out=JSON.stringify({n:n,p:D.pedidos.map(function(p){return p.n+':'+p.dir;})});D.pedidos=bak;return out;})()`));
    chk('(3) el pendiente toma Golf · Lote 151; el entregado y el de otro teléfono no cambian',
      r3.n === 1 && r3.p.join('|') === '9101:Golf · Lote 151|9102:Champagnat Alto|9103:La Pionera · Lote 3', r3);

    /* (4) El mapa al dedo */
    await ev("try{crmCloseDrawer()}catch(e){}");
    await ev("go('estancias')"); await pausa(800);
    await ev("try{estSwitch('mapa')}catch(e){initMapaEstancias()}");
    if (!await esperar("(function(){try{return window._mapaPuntosPantalla&&window._mapaPuntosPantalla().length>100}catch(e){return false}})()", 60000)) throw new Error('el mapa no cargó');
    await pausa(1500);
    for (let i = 0; i < Number(process.env.ZOOM || 1); i++) { await ev("document.querySelector('#mapaMap .leaflet-control-zoom-in').click()"); await pausa(700); } await pausa(2500);
    chk('(4) la pantalla cuenta como táctil', await ev("window.matchMedia('(pointer:coarse)').matches"));
    // Una casa sola (sin vecinas a 44 px) y un par pegado, medidos en pantalla.
    const geo = JSON.parse(await ev(`(function(){var mp=document.getElementById('mapaMap').getBoundingClientRect();
      var todas=window._mapaPuntosPantalla();
      var ps=todas.filter(function(p){return p.x>mp.left+40&&p.x<mp.right-40&&p.y>mp.top+60&&p.y<mp.bottom-60;});
      var sola=null,par=null,dirs=[[12,0],[-12,0],[0,12],[0,-12]];
      /* Contra TODAS las casas, no solo las de adentro de los márgenes: si no, una vecina del borde no cuenta. */
      var enRadio=function(x,y){return todas.filter(function(q){return Math.hypot(q.x-x,q.y-y)<=22;}).length;};
      var exacta=null,dist=function(a,b){return Math.hypot(a.x-b.x,a.y-b.y);};
      for(var i=0;i<ps.length&&(!sola||!par||!exacta);i++){
        /* Un toque a 12 px de esta casa (fuera del círculo de 5) con NINGUNA otra a 22 px: tiene que abrirla. */
        for(var k=0;k<dirs.length&&!sola;k++){var tx=ps[i].x+dirs[k][0],ty=ps[i].y+dirs[k][1];if(enRadio(tx,ty)===1)sola={x:tx,y:ty,n:ps[i].n};}
        var cerca=todas.filter(function(q){return q!==ps[i]&&dist(q,ps[i])<=20;});
        /* Arriba de una casa con vecinas pegadas: se abre ESA, sin lista. */
        if(!exacta&&cerca.length>=1&&cerca.every(function(q){return dist(q,ps[i])>=11;}))exacta={x:ps[i].x,y:ps[i].y,n:ps[i].n};
        /* Justo en el medio de dos pegadas: ambiguo, lista. */
        if(!par&&cerca.length>=1){var q=cerca[0],mx=(q.x+ps[i].x)/2,my=(q.y+ps[i].y)/2,ds=todas.map(function(z){return Math.hypot(z.x-mx,z.y-my);}).sort(function(a,b){return a-b;});
          if(ds[1]-ds[0]<10&&ds[0]>7)par={x:mx,y:my};}}
      return JSON.stringify({n:ps.length,sola:sola,par:par,exacta:exacta});})()`));
    await ev("window.__lote=null;window.crmOpenLote=function(lo){window.__lote=lo&&lo.n;};");
    if (geo.sola) {
      await toque(geo.sola.x, geo.sola.y);
      const lote1 = await ev('window.__lote');
      chk('(4) un toque a 12 px de una casa (fuera del círculo, sin otra cerca) la abre', String(lote1) === String(geo.sola.n), { geo: geo.sola, lote: lote1, toque: await ev('JSON.stringify(window.__mapaUltimoToque||null)') });
    } else console.log('  (a este zoom no hay casa con 22 px libres alrededor)');
    if (!geo.exacta) console.log('  (a este zoom no hay casas pegadas: probalo con ZOOM=1)');
    if (!geo.sola && !geo.exacta) chk('(4) hay algo para medir en el mapa', false, geo);
    if (geo.exacta) {
      await ev('window.__lote=null;try{_mapaElegirCerrar()}catch(e){}');
      await toque(geo.exacta.x, geo.exacta.y);
      const l2 = await ev('window.__lote'), lista = await ev("!!document.getElementById('mapaElegir')&&!document.getElementById('mapaElegir').hidden");
      chk('(4) tocar justo una casa con vecinas pegadas abre ESA, sin lista', String(l2) === String(geo.exacta.n) && !lista, { geo: geo.exacta, l2, lista, toque: await ev('JSON.stringify(window.__mapaUltimoToque||null)') });
    }
    if (geo.par) {
      await ev('window.__lote=null;try{_mapaElegirCerrar()}catch(e){}');
      await toque(geo.par.x, geo.par.y);
      const el = JSON.parse(await ev("JSON.stringify({ver:!!document.getElementById('mapaElegir')&&!document.getElementById('mapaElegir').hidden,n:document.querySelectorAll('#mapaElegir .mapa-elegir-op:not(.mapa-elegir-no)').length,lote:window.__lote,h:[].map.call(document.querySelectorAll('#mapaElegir .mapa-elegir-op'),function(b){return b.getBoundingClientRect().height;})})"));
      chk('(4) un toque entre casas pegadas abre la lista para elegir (sin abrir ninguna)', el.ver && el.n >= 2 && !el.lote, el);
      chk('(4) cada opción de la lista mide ≥ 44 px', el.h.length > 0 && el.h.every((h) => h >= 43.5), el.h);
    } else console.log('  (no hay casas pegadas en pantalla: la lista no se pudo medir)');
    const errs = JSON.parse(await ev("JSON.stringify(window.__errores||[])") || '[]');
    chk('sin errores de JS', !errs.length, errs);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
