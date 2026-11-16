/* EL % DE TOTAL MALEU MIENTRAS CARGA (16/11/2026). Abre el ERP como Tadeo y anota, segundo a segundo, la pastilla de
   Facturación de Total Maleu, cuántos pedidos tiene `D` y desde qué día. Sirve para ver si el % se calcula contra una
   historia que todavía no llegó (el +96% del celular contra el −23% de la compu, 16/11).
     SBSES=<ses.json> node _tools/pruebas/medir_total_maleu.js <token> [ancho=390] [segundos=45]
   Con la guarda de solo lectura de sbses_guarda.js. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S, SEG_S] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390), SEG = Number(SEG_S || 45);
const URL = process.env.BASE_URL || 'https://app.maleu.com.ar/app.html';
const PREP = require('./sesion_prep.js')(TOKEN || 'x');
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + (process.env.CON_APPS ? '' : ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}") });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  const t0 = Date.now();
  await cli.enviar('Page.navigate', { url: URL });
  let ult = '';
  while (Date.now() - t0 < SEG * 1000) {
    await T(1000);
    const v = await evaluar(cli, `(function(){try{var b=document.getElementById('hRetail');var k=b&&b.querySelector('.mt-k');var pill=k?(k.innerText||'').replace(/\\s+/g,' ').slice(0,90):'';
      var ps=(typeof D!=='undefined'&&D&&D.pedidos)||[];var rg=(typeof _rtRangoDatos==='function')?_rtRangoDatos():null;
      return pill+' | hR '+(b?(b.innerText||'').replace(/s+/g,' ').slice(0,120):'sin hRetail')+' | err '+JSON.stringify((window.__err||[]).slice(0,3)).slice(0,300)+' | pedidos '+ps.length+' | desde '+(rg&&rg.min||'-')+' | fuente '+JSON.stringify(window.__pedFuente||null).slice(0,140)+' | bloq '+JSON.stringify((window.__bloqueados||[]).map(function(x){return x.slice(0,50)})).slice(0,300);}catch(e){return 'err '+e.message}})()`).catch(() => 'sin respuesta');
    if (v !== ult) { console.log(((Date.now() - t0) / 1000).toFixed(0) + 's  ' + v); ult = v; }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
