/* Inicio > Resumen > Por canal, las tarjetas del dia, y Estancias > Pulso.
   12/9/2026: "el detalle de cada pedido queda como un choclo enorme, podriamos
   agruparlo por sub barrios".

   Lo que sostiene:
   · Por canal agrupa por SUB-BARRIO, no por direccion: ningun renglon dice "Lote".
     `p.br` trae la zona y el lote juntos desde el 22/8/2026 y salia un renglon por
     lote (31 para 9 sub-barrios).
   · La PLATA cierra en cada nivel: sub-barrios = barrio, barrios = hoja, hojas = total.
   · Cuenta ENTREGAS: el total de Venta Directa es `_contarVentas` de sus pedidos,
     calculado aca por separado desde D.pedidos.
   · Ningun monto con centavos en el Resumen (`f$` redondea).
   · Las tarjetas del dia dicen "N entregas" y cuentan entregas.
   · Pulso: la tabla de las ultimas 8 semanas, con el Total de cada fila igual a la
     suma de sus columnas, y los sub-barrios sin "Lote".
   · Nada se pisa ni desborda a lo ancho.

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

    const hay = await esperar(cli, 'typeof D!=="undefined"&&D&&D.pedidos&&D.pedidos.length>0&&document.querySelector("#hCanales")&&document.querySelector("#hCanales").innerText.length>30');
    chk(hay, 'Inicio pinto Por canal con los datos');
    if (!hay) throw new Error('sin datos, no se puede medir');
    await esp(2500);

    const r = await evaluar(cli, `(function(){
      function lunes(d){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
      var now=new Date(), lun=lunes(now), dom=new Date(lun.getFullYear(),lun.getMonth(),lun.getDate()+6);
      function enSem(p){var m=String(p.dee||'').match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})/);if(!m)return false;var d=new Date(+m[1],+m[2]-1,+m[3]);return d>=lun&&d<=dom;}
      var pv=D.pedidos.filter(function(p){return p.c&&p.c.trim()&&p.$>0&&p.h!=='Red'&&p.es!=='Cancelado'&&!p.hist&&enSem(p);});
      var vd=pv.filter(function(p){return p.h==='Home'||p.h==='Pilar';});
      var esperadoVD=vd.length?_contarVentas(vd):0, plataVD=vd.reduce(function(a,p){return a+(Number(p.$)||0);},0);
      var box=document.querySelector('#hCanales');
      var cards=[].slice.call(box.querySelectorAll('.cnl-card'));
      var num=function(t){var m=String(t||'').replace(/\\./g,'').match(/\\$\\s*(-?\\d+)/);return m?Number(m[1]):null;};
      var cnt=function(t){var m=String(t||'').match(/(\\d+)/);return m?Number(m[1]):null;};
      var vdCard=cards.filter(function(c){return /Venta Directa/.test(c.textContent);})[0];
      var out={cards:cards.length, lotes:0, filas:0, esperadoVD:esperadoVD, plataVD:plataVD, lotesEnDatos:0, subsEnDatos:0};
      if(vdCard){
        var hv=vdCard.querySelector('.cnl-hv');out.vdHeadN=cnt(hv&&hv.textContent);out.vdHeadPlata=num(hv&&hv.textContent);
        var textos=[].slice.call(vdCard.querySelectorAll('.cnl-sub-n,.cnl-bar>span:first-child,.cnl-hoja>span:first-child')).map(function(e){return e.textContent;});
        out.lotes=textos.filter(function(t){return /\\bLote\\b|\\bL\\d/.test(t);}).length;
        out.filas=vdCard.querySelectorAll('.cnl-sub').length;
        /* la plata cierra: cada .cnl-hoja contra sus barrios (.cnl-bar + filas sueltas), cada .cnl-bar contra su .cnl-subs */
        var errPlata=[];
        [].slice.call(vdCard.querySelectorAll('.cnl-bar')).forEach(function(b){
          var subs=b.nextElementSibling; if(!subs||!subs.classList.contains('cnl-subs'))return;
          var t=[].slice.call(subs.querySelectorAll('.cnl-v')).reduce(function(a,v){return a+num(v.textContent);},0);
          var e=num(b.querySelector('.cnl-v').textContent); if(Math.abs(t-e)>2)errPlata.push([b.firstChild.textContent,e,t]);
        });
        var hojas=[].slice.call(vdCard.querySelectorAll('.cnl-hoja'));
        var sumHojas=0;
        hojas.forEach(function(h,i){
          var e=num(h.querySelector('.cnl-v').textContent); sumHojas+=e;
          var t=0, x=h.nextElementSibling;
          while(x&&!x.classList.contains('cnl-hoja')){
            if(x.classList.contains('cnl-bar'))t+=num(x.querySelector('.cnl-v').textContent);
            else if(x.classList.contains('cnl-subs')&&!(x.previousElementSibling&&x.previousElementSibling.classList.contains('cnl-bar')))
              t+=[].slice.call(x.querySelectorAll('.cnl-v')).reduce(function(a,v){return a+num(v.textContent);},0);
            x=x.nextElementSibling;
          }
          if(Math.abs(t-e)>3)errPlata.push([h.firstChild.textContent,e,t]);
        });
        out.errPlata=errPlata; out.sumHojas=sumHojas;
        /* nada se pisa dentro de una fila: nombre, barra y valor */
        var pisadas=0, examinadas=0;
        [].slice.call(vdCard.querySelectorAll('.cnl-sub')).forEach(function(f){
          var a=[].slice.call(f.children).map(function(c){return c.getBoundingClientRect();});
          examinadas++;
          for(var i=0;i<a.length;i++)for(var j=i+1;j<a.length;j++){
            var A=a[i],B=a[j]; if(A.right-1>B.left&&B.right-1>A.left&&A.bottom-1>B.top&&B.bottom-1>A.top)pisadas++;
          }
        });
        out.pisadas=pisadas; out.examinadas=examinadas;
      }
      /* en los datos, cuantos lotes distintos y cuantos sub-barrios distintos hay (para decir si agrupo) */
      var lts={}, sbs={};
      vd.forEach(function(p){lts[p.h+'|'+p.br]=1; if(typeof _subBarrioDe==='function')sbs[p.h+'|'+(p.bar||'')+'|'+_subBarrioDe(p)]=1;});
      out.lotesEnDatos=Object.keys(lts).length; out.subsEnDatos=Object.keys(sbs).length;
      out.desborde=box.scrollWidth>box.clientWidth+1;
      /* centavos en cualquier monto del Resumen */
      var res=document.querySelector('#p-inicio-resumen');
      var cent=(res.innerText.match(/\\$\\s?-?\\d{1,3}(\\.\\d{3})*,\\d+/g)||[]);
      out.centavos=cent.slice(0,5); out.nCentavos=cent.length;
      /* KPI Ventas del bloque Semana actual */
      var kpi=document.querySelector('#hKpi .kv'); out.kpiVentas=kpi?Number(kpi.textContent):null;
      return out;
    })()`);

    chk(r.cards >= 1, 'hay cards de canal', r.cards);
    /* con 0 filas examinadas esto daria ok sobre la version vieja, que no tiene .cnl-sub */
    chk(r.filas > 0 && r.lotes === 0, 'ningun renglon de Venta Directa dice "Lote" (' + r.filas + ' filas examinadas)', r.lotes);
    chk(r.filas <= r.subsEnDatos, 'agrupa: ' + r.filas + ' filas de sub-barrio/barrio para ' + r.lotesEnDatos + ' direcciones distintas', { filas: r.filas, subsEnDatos: r.subsEnDatos });
    chk(r.vdHeadN === r.esperadoVD, 'Venta Directa cuenta ENTREGAS (' + r.esperadoVD + ' calculadas aparte desde D.pedidos)', r.vdHeadN);
    chk(Math.abs((r.vdHeadPlata || 0) - Math.round(r.plataVD)) <= 1, 'la plata de Venta Directa es la suma de sus pedidos', [r.vdHeadPlata, Math.round(r.plataVD)]);
    chk((r.errPlata || []).length === 0, 'la plata cierra en cada nivel (sub-barrios = barrio, barrios = hoja)', r.errPlata);
    chk(Math.abs((r.sumHojas || 0) - (r.vdHeadPlata || 0)) <= 2, 'las hojas suman el total de Venta Directa', [r.sumHojas, r.vdHeadPlata]);
    chk(r.examinadas > 0 && r.pisadas === 0, 'nombre, barra y valor no se pisan (' + r.examinadas + ' filas examinadas)', r.pisadas);
    chk(!r.desborde, 'Por canal no desborda a lo ancho');
    chk(r.nCentavos === 0, 'ningun monto con centavos en el Resumen', r.centavos);

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
        var est=peds.filter(function(p){return p.h==='Home'&&p.es==='Entregado'&&String(p.bar||'').toLowerCase()==='estancias del pilar';});
        /* el numero grande de la cabecera, no textContent entero: pega "07/09" con "0 entregas" y lee 90 */
        var cab=c.querySelector(':scope > div > span:last-child');
        var m=cab&&cab.textContent.match(/^\\s*(\\d+)\\s*entregas?/); var shown=m?Number(m[1]):null;
        var me=c.textContent.match(/(\\d+) entregadas? en Estancias/); var shownE=me?Number(me[1]):0;
        var noRed=shown===null?null:shown - ((c.textContent.match(/Red\\s*(\\d+)/)||[0,0])[1]*1);
        var expE=est.length?_contarVentas(est):0, expN=peds.length?_contarVentas(peds):0;
        dias.push({iso:iso,shown:shown,noRed:noRed,expN:expN,shownE:shownE,expE:expE,filas:peds.length});
      });
      return {dias:dias};
    })()`);
    if (d.sinBody) chk(false, 'no encontre la semana en curso');
    else {
      const malN = d.dias.filter(x => x.noRed !== null && x.noRed !== x.expN);
      const malE = d.dias.filter(x => x.shownE !== x.expE);
      const juntos = d.dias.filter(x => x.filas > x.expN).length;
      chk(malN.length === 0, 'cada dia: "N entregas" (sin Red) = entregas de sus pedidos (' + d.dias.length + ' dias, ' + juntos + ' con pedidos del mismo viaje)', malN);
      chk(malE.length === 0, 'cada dia: "N entregadas en Estancias" = entregas', malE);
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
