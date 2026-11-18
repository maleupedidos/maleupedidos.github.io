/* MI PORTAL VISTO POR UN REPRESENTANTE, EN EL CELULAR (18/11/2026, auditoría de Mi Portal).

   SBSES=<sesión de prueba del representante> USU=marcos NOMBRE="Marcos Bottcher" \
     node _tools/pruebas/portal_como_representante.js [base=http://localhost:8090] [carpeta de capturas]

   La sesión se arma con `estancias/scripts/migraciones/sesion_prueba.py crear <archivo> marcos vendedor`
   (usuario temporal de Auth, solo lectura por la guarda de sbses_guarda.js: ninguna escritura sale).
   Abre el ERP a 390×844 con touch, entra al portal como ese representante y en cada tab (Hoy, Pedidos,
   Clientes, Plata › Caja y Plata › Pagos):
     · cuenta palabras y controles con la MISMA cuenta de texto.js (se lee de ese archivo, no se copia);
     · saca la captura de la primera pantalla (lo que ve en 5 segundos) y la de la página entera.
   Sirve para el antes y el después: la cuenta tiene que ser la misma en las dos. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8090';
const OUT = process.argv[3] || '';
const USU = process.env.USU || 'marcos', NOMBRE = process.env.NOMBRE || 'Marcos Bottcher';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const src = fs.readFileSync(path.join(__dirname, 'texto.js'), 'utf8');
const m = /const CONTAR = `([\s\S]*?)`;\r?\n/.exec(src);
if (!m) { console.log('no encontré CONTAR en texto.js'); process.exit(1); }
const CONTAR = eval('`' + m[1] + '`');

(async () => {
  if (!process.env.SBSES) { console.log('Falta SBSES'); process.exit(1); }
  process.env.PREP_SESION = JSON.stringify({ usuario: USU, rol: 'vendedor', nombre: NOMBRE, ts: Date.now(), tabs: ['miportal'] });
  const red = JSON.stringify({ ok: true, nombre: NOMBRE, usuario: USU, wa: '', aliasMp: '', comision: 17, barrios: [], partido: '', localidad: '' });
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  const res = [];
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    const W = Number(process.env.ANCHO || 390), H = W > 800 ? 900 : 844;
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W > 800 ? 1 : 2, mobile: W <= 800 });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, USU)
      + `;try{localStorage.setItem('maleu_red_session',${JSON.stringify(red)});}catch(e){}`
      /* (18/11/2026) SIMLIQ=<archivo.json>: la respuesta de red_mi_liquidacion_pantalla (760) mientras no esté aplicada. */
      + (process.env.SIMLIQ ? `;(function(){var J=${JSON.stringify(fs.readFileSync(process.env.SIMLIQ, 'utf8'))};var f=window.fetch;window.fetch=function(u,x){
          if(/\\/rpc\\/red_mi_liquidacion_pantalla/.test(String(u&&u.url||u)))return Promise.resolve(new Response(J,{status:200,headers:{'Content-Type':'application/json'}}));
          return f.apply(this,arguments);};})();` : '')
      + ';window.confirm=function(){return false;};window.alert=function(){};window.prompt=function(){return null;};' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 150; i++) { try { if (await ev(`typeof go==='function'&&typeof SESSION!=='undefined'&&!!SESSION`)) break; } catch (e) {} await pausa(200); }
    await pausa(3000);
    try { await ev(`go('miportal'); 1`); } catch (e) {}
    for (let i = 0; i < 120; i++) { try { if (await ev(`typeof setMainTab==='function'&&!!document.querySelector('#pg-miportal #mview-inicio')&&(document.querySelector('#pg-miportal #mview-inicio').innerText||'').length>80`)) break; } catch (e) {} await pausa(500); }
    await pausa(4000);
    const foto = async (nombre) => {
      if (!OUT) return;
      fs.mkdirSync(OUT, { recursive: true });
      const a = await cli.enviar('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, nombre + '-pantalla.png'), Buffer.from(a.data, 'base64'));
      const h = await ev(`Math.min(document.documentElement.scrollHeight, 9000)`);
      const b = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: h, scale: 1 } });
      fs.writeFileSync(path.join(OUT, nombre + '-entera.png'), Buffer.from(b.data, 'base64'));
    };
    /* (18/11/2026) Desde el portal nuevo: Hoy · Clientes · Plata (una pantalla) y la ficha que se abre desde Hoy.
       Con NUEVO=0 mide las 5 pantallas de antes (Pedidos y Plata › Caja / Pagos). */
    const PANT = process.env.NUEVO === '0'
      ? [['hoy', `setMainTab('hoy')`], ['pedidos', `setMainTab('pedidos')`], ['clientes', `setMainTab('clientes')`],
         ['plata-caja', `setMainTab('plata');setPlataSub('caja')`], ['plata-pagos', `setMainTab('plata');setPlataSub('pagos')`]]
      : [['hoy', `setMainTab('hoy')`], ['clientes', `setMainTab('clientes')`], ['plata', `setMainTab('plata')`],
         ['ficha', `(function(){var b=document.querySelector('#pg-miportal .hy-q:not([disabled])');if(b)b.click();else setMainTab('pedidos');})()`]];
    for (const [n, js] of PANT) {
      try { await ev(js + '; window.scrollTo(0,0); 1'); } catch (e) { res.push({ donde: n, err: String(e.message) }); continue; }
      await pausa(3500);
      let c = null; for (let i = 0; i < 30; i++) { c = await ev(CONTAR); if (!c.carg) break; await pausa(500); }
      const extra = await ev(`(function(){var pg=document.querySelector('.pg.on');var t=(pg&&pg.innerText)||'';
        return {alto:document.documentElement.scrollHeight, pantallas:Math.round(document.documentElement.scrollHeight/844*10)/10,
          primera:t.replace(/\\s+/g,' ').slice(0,700),
          plegables:[].slice.call((pg||document).querySelectorAll('.cg-head, details > summary')).filter(function(h){return h.offsetParent;}).map(function(h){
            var t=h.querySelector('.cg-t')||h, cs=getComputedStyle(t), fl=h.querySelector('.cg-arrow, .red-chev');
            return (t.innerText||'').trim().slice(0,28)+' '+Math.round(h.getBoundingClientRect().height)+'px/'+cs.fontSize+'/'+cs.fontWeight+(fl?'/flecha':'/SIN flecha');})};})()`);
      res.push({ donde: n, ...c, ...extra });
      await foto(n);
    }
    /* (18/11/2026) «Entregado» con un TOQUE de verdad (Input.dispatchTouchEvent, no .click()): tiene que salir
       updatePedidoRed con entrega:true (la guarda lo corta: no escribe) y aparecer «Deshacer». */
    if (process.env.NUEVO !== '0') {
      await ev(`setMainTab('hoy'); window.scrollTo(0,0); 1`); await pausa(1200);
      const r = await ev(`(function(){var b=document.querySelector('#pg-miportal .hy-bt:not(.ok):not([disabled])');if(!b)return null;
        b.scrollIntoView({block:'center'});var q=b.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2,
        quien:(b.closest('.hy-fila').querySelector('.hy-n')||{}).textContent};})()`);
      if (!r) console.log('toque Entregado: no hay ningún pedido para marcar');
      else {
        const antes = (await ev('(window.__bloqueados||[]).length'));
        /* El aviso cambia dos veces (Deshacer, y después lo que contesta la guarda): se anota cada cambio, no una foto. */
        await ev(`(function(){var t=document.getElementById('redToastBox');window.__avisos=[];
          new MutationObserver(function(){ window.__avisos.push({txt:t.innerText, d:(t.querySelector('.hy-deshacer')||{}).getAttribute ? t.querySelector('.hy-deshacer').getAttribute('onclick') : ''}); })
            .observe(t,{childList:true,subtree:true,characterData:true}); return 1;})()`);
        await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
        await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await pausa(1500);
        /* La guarda recorta el cuerpo a 90 caracteres: se busca la acción y el pedido. */
        const ya = await ev(`(function(){var f=Array.from(document.querySelectorAll('#pg-miportal .hy-fila')).find(function(x){return (x.querySelector('.hy-n')||{}).textContent===${JSON.stringify(r.quien)};});
          var a=(window.__avisos||[]).find(function(x){return x.d;})||{};var m=/redDeshacerEntregado\\('([^']*)'/.exec(a.d||'');
          return {aviso:a.txt||((window.__avisos||[])[0]||{}).txt||'', deshacer:!!a.d, es:!f?'Entregado (salió de «Te falta marcar»)':(f.classList.contains('ok')?'Entregado':'sin marcar'), n:m?m[1]:''};})()`);
        const nuevos = (await ev('window.__bloqueados||[]')).slice(antes);
        const fue = nuevos.filter(x => /updatePedidoRed/.test(x) && x.indexOf('"pedidoId":"' + ya.n + '"') >= 0);
        console.log('toque Entregado en ' + r.quien + ' #' + ya.n + ': quedó ' + ya.es + ' · POST updatePedidoRed ' + (fue.length ? 'SÍ' : 'NO')
          + ' · aviso «' + ya.aviso.trim() + '» con Deshacer ' + (ya.deshacer ? 'SÍ' : 'NO'));
        await foto('toque');
      }
    }
    const bloq = await ev('window.__bloqueados||[]');
    const err = await ev('window.__err||[]');
    console.log('pantalla'.padEnd(16) + 'palabras controles  pantallas de alto');
    res.forEach(r => console.log('  ' + r.donde.padEnd(14) + String(r.n).padStart(8) + String(r.ctrl || 0).padStart(10) + String(r.pantallas).padStart(11) + (r.carg ? '  (sin cargar)' : '')
      + (r.plegables && r.plegables.length ? '\n      plegables: ' + r.plegables.join(' · ') : '')));
    console.log('  ' + 'TOTAL'.padEnd(14) + String(res.reduce((a, r) => a + (r.n || 0), 0)).padStart(8) + String(res.reduce((a, r) => a + (r.ctrl || 0), 0)).padStart(10));
    console.log('bloqueados (escrituras cortadas): ' + bloq.length + (bloq.length ? ' ' + JSON.stringify(bloq.slice(0, 5)) : ''));
    console.log('errores de consola: ' + err.length + (err.length ? ' ' + JSON.stringify(err.slice(0, 5)) : ''));
    if (OUT) fs.writeFileSync(path.join(OUT, 'cuenta.json'), JSON.stringify(res, null, 1));
  } finally { cli.matar ? cli.matar() : cli.cerrar(); }
})().catch(e => { console.error(e); process.exit(1); });
