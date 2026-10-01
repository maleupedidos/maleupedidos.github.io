/* LA TAB RESUMEN, SOLA Y CRONOMETRADA. (1/10/2026)

     node _tools/pruebas/ver_resumen_solo.js <token> [390|1440]

   El escaneo general la dio en 45,4 s y PANTALLA VACIA (0 chars). Pero el
   escaneo abre diecisiete tabs una atras de otra, y nueve GET seguidos saturan
   Apps Script —ya medido: el siguiente tardo 169 s—. Asi que ese numero puede
   ser de la medicion y no de la pantalla.

   Esto abre UNA sola tab, con sesion real, y mira cada segundo que hay en
   pantalla: si se queda en el loader, si pinta tarde, o si no pinta nunca.
   Tambien anota los pedidos al backend y los errores de consola.

   No es un test: no afirma nada. Imprime lo que pasa.
*/
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const pausa = ms => new Promise(r => setTimeout(r, ms));
const TOKEN = process.argv[2];
const ANCHO = Number(process.argv[3] || 1440);
const TAB = process.argv[4] || 'resumen';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);

/* Igual que el escaneo: solo cuenta lo que SE VE. Un loader con opacity:0
   sigue estando en innerText y haria parecer que la pantalla dice algo. */
const MEDIR = `(function(){
  var pg=document.querySelector('.pg.on'); if(!pg) return {err:'sin pagina activa'};
  var partes=[];
  (function rec(n){
    if(n.nodeType===3){ var s=String(n.nodeValue||'').trim(); if(s) partes.push(s); return; }
    if(n.nodeType!==1) return;
    var cs=getComputedStyle(n);
    if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05) return;
    for(var i=0;i<n.childNodes.length;i++) rec(n.childNodes[i]);
  })(pg);
  var txt=partes.join(' ').replace(/\\s+/g,' ').trim();
  return { id:pg.id, chars:txt.length, cabeza:txt.slice(0,110),
           cargando:/cargando|calculando|generando/i.test(txt),
           err:(window.__err||[]).length };
})()`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Runtime.enable');
    await cli.enviar('Network.enable');

    /* Que endpoints pide y cuanto tarda cada uno: si la pantalla queda vacia,
       lo primero es saber si esta esperando al backend o si ya le contesto. */
    const pedidos = new Map();
    cli.escuchar((metodo, p) => {
      if (metodo === 'Network.requestWillBeSent') {
        const u = String((p.request && p.request.url) || '');
        if (u.indexOf('script.google.com') < 0) return;
        const m = u.match(/action=([a-zA-Z0-9_]+)/);
        pedidos.set(p.requestId, { a: m ? m[1] : (p.request.method === 'POST' ? 'POST' : '?'), t: Date.now() });
      } else if (metodo === 'Network.loadingFinished') {
        const r = pedidos.get(p.requestId);
        if (r && r.ms === undefined) { r.ms = Date.now() - r.t; r.bytes = p.encodedDataLength; }
      }
    });

    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 950, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    const t0 = Date.now();
    await cli.enviar('Page.navigate', { url: 'http://localhost:8080/app.html' });

    for (let i = 0; i < 120; i++) { try { if (await evaluar(cli, `typeof go==='function'`)) break; } catch (e) {} await pausa(250); }
    console.log('  app lista en ' + (Date.now() - t0) + ' ms');

    await evaluar(cli, `go('${TAB}'); 1`);
    const tTab = Date.now();
    console.log('\n  segundo | chars | estado');
    let primerContenido = 0;
    for (let s = 1; s <= 90; s++) {
      await pausa(1000);
      let v;
      try { v = await evaluar(cli, MEDIR); } catch (e) { v = { err: String(e.message) }; }
      const chars = v.chars || 0;
      if (!primerContenido && chars > 200 && !v.cargando) primerContenido = Date.now() - tTab;
      if (s <= 10 || s % 10 === 0 || (primerContenido && s <= 3)) {
        console.log('  ' + String(s).padStart(7) + ' | ' + String(chars).padStart(5) + ' | ' +
                    (v.cargando ? 'cargando…' : (chars > 200 ? 'con contenido' : 'vacia')) +
                    (v.cabeza ? '  ' + v.cabeza.slice(0, 60) : ''));
      }
      if (primerContenido && s >= 5) break;
    }

    console.log('\n  primer contenido: ' + (primerContenido ? primerContenido + ' ms' : 'NUNCA en 90 s'));
    const fin = await evaluar(cli, MEDIR);
    console.log('  al final: ' + (fin.chars || 0) + ' chars · ' + (fin.cabeza || '').slice(0, 100));

    console.log('\n  pedidos al backend:');
    const arr = [...pedidos.values()].filter(r => r.ms !== undefined);
    if (!arr.length) console.log('    (ninguno termino)');
    arr.sort((a, b) => b.ms - a.ms).slice(0, 12).forEach(r =>
      console.log('    ' + String(r.ms).padStart(7) + ' ms  ' + r.a + '  (' + (r.bytes || 0) + ' bytes)'));
    const colgados = [...pedidos.values()].filter(r => r.ms === undefined);
    if (colgados.length) console.log('    SIN TERMINAR: ' + colgados.map(r => r.a).join(', '));

    const errs = await evaluar(cli, `JSON.stringify((window.__err||[]).slice(0,5))`);
    console.log('\n  errores de consola: ' + errs);
    salir(0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
