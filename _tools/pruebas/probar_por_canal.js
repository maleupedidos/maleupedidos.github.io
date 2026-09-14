/* Inicio > Resumen: las tarjetas del dia, y Estancias > Pulso.
   12/9/2026: "el detalle de cada pedido queda como un choclo enorme, podriamos
   agruparlo por sub barrios".

   "Por canal" y "Semana actual" salieron del Resumen el 14/9/2026: los reemplaza
   el bloque Ventas retail, que prueba `probar_resumen_global.js`. Aca queda:
   · Ningun monto con centavos en el Resumen (`f$` redondea).
   · Las tarjetas del dia dicen "N entregas" y cuentan entregas.
   · Pulso: la tabla de las ultimas 8 semanas, con el Total de cada fila igual a la
     suma de sus columnas, y los sub-barrios sin "Lote".

   Sesion REAL y POST interceptados. Los esperados NO van escritos a mano: se sacan
   de D.pedidos en el mismo navegador, asi el test no envejece con los datos.

   Uso:  node probar_por_canal.js <token> [ancho] [url]
         url por defecto http://localhost:8080/app.html — pasale la de produccion
         para la direccion contraria (con la version vieja tiene que fallar).     */
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const prep = require(path.join(__dirname, 'sesion_prep.js'));

const TOKEN = process.argv[2];
const ANCHO = Number(process.argv[3] || 390);
const URL_ERP = process.argv[4] || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(1); }

let ok = 0, mal = 0;
const chk = (c, t, extra) => { if (c) { ok++; console.log('  \x1b[32mok\x1b[0m  ' + t); }
  else { mal++; console.log('  \x1b[31mMAL\x1b[0m ' + t + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
const esp = ms => new Promise(r => setTimeout(r, ms));
async function esperar(cli, expr, ms = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await esp(500); }
  return false;
}

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, '') });
    await cli.enviar('Page.navigate', { url: URL_ERP });
    console.log('\n== ' + ANCHO + 'px · ' + URL_ERP);

    const hay = await esperar(cli, 'typeof D!=="undefined"&&D&&D.pedidos&&D.pedidos.length>0&&document.querySelector("#hRetail .rt-per")');
    chk(hay, 'Inicio pinto el Resumen con los datos');
    if (!hay) throw new Error('sin datos, no se puede medir');
    await esp(2500);
    const cent = await evaluar(cli, `(document.querySelector('#p-inicio-resumen').innerText.match(/\\$\\s?-?\\d{1,3}(\\.\\d{3})*,\\d+/g)||[]).slice(0,5)`);
    chk(cent.length === 0, 'ningun monto con centavos en el Resumen', cent);

    /* ── Tarjetas del dia de la semana en curso ── */
    const d = await evaluar(cli, `(function(){
      try{toggleSem('actual')}catch(e){}
      function lunes(d){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
      var now=new Date(), lun=lunes(now), dias=[], errores=[];
      var body=document.getElementById('sem-body-actual'); if(!body)return {sinBody:true};
      var cards=[].slice.call(body.querySelectorAll(':scope > .card'));
      cards.forEach(function(c,i){
        var f=new Date(lun.getFullYear(),lun.getMonth(),lun.getDate()+i);
        var iso=f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0');
        var peds=D.pedidos.filter(function(p){return p.c&&p.c.trim()&&p.$>0&&p.h!=='Red'&&p.es!=='Cancelado'&&!p.hist&&String(p.dee||'').slice(0,10)===iso;});
        /* el numero grande de la cabecera, no textContent entero: pega "07/09" con "0 entregas" y lee 90 */
        var cab=c.querySelector(':scope > div > span:last-child');
        var m=cab&&cab.textContent.match(/^\\s*(\\d+)\\s*entregas?/); var shown=m?Number(m[1]):null;
        var noRed=shown===null?null:shown - ((c.textContent.match(/Red\\s*(\\d+)/)||[0,0])[1]*1);
        var expN=peds.length?_contarVentas(peds):0;
        dias.push({iso:iso,shown:shown,noRed:noRed,expN:expN,filas:peds.length,estancias:/en Estancias/.test(c.textContent)});
      });
      return {dias:dias};
    })()`);
    if (d.sinBody) chk(false, 'no encontre la semana en curso');
    else {
      const malN = d.dias.filter(x => x.noRed !== null && x.noRed !== x.expN);
      const juntos = d.dias.filter(x => x.filas > x.expN).length;
      chk(malN.length === 0, 'cada dia: "N entregas" (sin Red) = entregas de sus pedidos (' + d.dias.length + ' dias, ' + juntos + ' con pedidos del mismo viaje)', malN);
      chk(d.dias.every(x => !x.estancias), 'las tarjetas del dia ya no hablan de Estancias (14/9/2026: el Resumen es global)', d.dias.filter(x => x.estancias));
    }

    /* ── Estancias > Pulso ── */
    await evaluar(cli, `try{go('estancias')}catch(e){}`);
    await esp(800);
    await evaluar(cli, `try{estSwitch('pulso')}catch(e){}`);
    const hayT = await esperar(cli, 'document.querySelector("#estPulso table.est-dt tbody tr")!==null', 60000);
    chk(hayT, 'Pulso dibuja la tabla de entregas por dia');
    if (hayT) {
      const t = await evaluar(cli, `(function(){
        var tb=document.querySelector('#estPulso table.est-dt');
        var cab=[].slice.call(tb.querySelectorAll('thead th')).map(function(x){return x.textContent.trim();});
        var filas=[].slice.call(tb.querySelectorAll('tbody tr')).map(function(tr){
          var tds=[].slice.call(tr.querySelectorAll('td')).map(function(td){var n=Number(td.textContent.trim());return isNaN(n)?0:n;});
          return {sem:tr.querySelector('th').textContent, cols:tds.slice(0,-1), tot:tds[tds.length-1]};
        });
        var wrap=document.querySelector('#estPulso .est-dt-wrap');
        var subs=[].slice.call(document.querySelectorAll('#estPulso .est-wk-l')).map(function(e){return e.textContent;});
        var cent=(document.querySelector('#estPulso').innerText.match(/\\$\\s?-?\\d{1,3}(\\.\\d{3})*,\\d+/g)||[]);
        var hero=document.querySelector('#estPulso .est-hero-t');
        return {cab:cab, filas:filas, desborda:wrap.scrollWidth>wrap.clientWidth+1, subsLote:subs.filter(function(s){return /\\bLote\\b/.test(s);}),
          nSubs:subs.length, cent:cent.slice(0,3), heroN:hero?Number((hero.textContent.match(/(\\d+)/)||[])[1]):null,
          tieneProm:!!tb.querySelector('tfoot tr')};
      })()`);
      chk(t.cab.join('|').toLowerCase().indexOf('vie') >= 0 && t.cab.join('|').toLowerCase().indexOf('sáb') >= 0, 'la tabla tiene columnas Vie y Sáb', t.cab);
      chk(t.filas.length >= 1 && t.filas.length <= 8, 'hasta 8 semanas', t.filas.length);
      const malSum = t.filas.filter(f => f.cols.reduce((a, b) => a + b, 0) !== f.tot);
      chk(malSum.length === 0, 'el Total de cada semana es la suma de sus dias', malSum);
      chk(t.heroN === (t.filas[0] ? t.filas[0].tot : null), 'la ultima semana de la tabla = el numero del hero del Pulso', [t.heroN, t.filas[0] && t.filas[0].tot]);
      chk(t.tieneProm, 'hay fila de promedio');
      chk(!t.desborda, 'la tabla entra sin scroll horizontal');
      chk(t.subsLote.length === 0, 'los sub-barrios del Pulso no dicen "Lote" (' + t.nSubs + ' filas)', t.subsLote);
      chk(t.cent.length === 0, 'ningun monto con centavos en el Pulso', t.cent);
    }

    const errs = await evaluar(cli, '(window.__err||[]).slice(0,5)').catch(() => []);
    chk(!errs || errs.length === 0, 'sin errores de consola', errs);
  } catch (e) {
    mal++; console.log('  \x1b[31mMAL\x1b[0m ' + e.message);
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
