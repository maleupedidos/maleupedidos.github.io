/* Ventas: el grafico de lineas de PRODUCTOS y las Unidades de TENDENCIA (13/9/2026).

   node probar_prod_evol.js <token> [390|1440]
   BASE=https://app.maleu.com.ar node probar_prod_evol.js <token> 390

   Sesion real y la respuesta VERDADERA del backend (los POST interceptados). Los
   esperados no van escritos a mano: salen de la misma respuesta de
   `productosAnalytics` que dibuja la pantalla, asi el test no envejece.

   Sostiene:
   · "Como viene, semana a semana": las 8 fechas reales, una linea por categoria
     sin filtro y por producto con filtro, la frase de arriba y la leyenda con los
     numeros de la respuesta, Plata/Kilos solo cuando corresponde, el cartel al
     tocar una semana, el SVG sin escalar y ningun rotulo pisado;
   · el CRUCE INDEPENDIENTE: las Unidades vendidas de TENDENCIA por semana (que
     salen del volcado de pedidos, en el navegador) dan lo mismo que las del
     backend de PRODUCTOS (otra fuente). Hasta el 13/9/2026 Tendencia sumaba
     tambien lo cargado sin entregar. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(400); }
  return false;
};
const EXTRA = `
  window.__pa = null;
  (function(){ var o = window.fetch; window.fetch = function(u, x){
    var url = String((u && u.url) || u || '');
    var p = o.apply(this, arguments);
    if (url.indexOf('action=productosAnalytics') > -1) p.then(function(r){ r.clone().json().then(function(d){ if (d && d.ok) window.__pa = d; }); });
    return p; }; })();
`;
const DIGITOS = s => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.')) || 0;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + EXTRA });
    await cli.enviar('Page.navigate', { url: BASE + '/' + (process.env.APP || 'app.html') });
    console.log('\n== Ventas: grafico de PRODUCTOS y Unidades de TENDENCIA · ' + ANCHO + 'px ==');
    if (!await esperar(cli, `typeof go==='function' && !(document.getElementById('loginScreen')&&document.getElementById('loginScreen').offsetParent)`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('ventas')`); await pausa(1500);
    await evaluar(cli, `vSwitchTab('productos')`);
    if (!await esperar(cli, `!!window.__pa && !!document.querySelector('#prodEvol .evo-leyenda, #prodEvol .evol-row')`, 240000)) {
      console.log('  no llego productosAnalytics: ' + await evaluar(cli, `JSON.stringify({pa:!!window.__pa})`));
      salir(1);
    }
    await pausa(800);
    /* Sin el grafico nuevo (una version anterior) se sigue igual: el cruce de
       Tendencia de abajo tiene que poder fallar tambien ahi. */
    const hayGrafico = await evaluar(cli, `!!document.querySelector('#prodEvol svg.evo-svg')`);
    chk('se dibuja el gráfico de líneas', hayGrafico === true);
    if (hayGrafico) {

    chk('la respuesta trae la plata por semana y las fechas', await evaluar(cli, `!!(__pa.evolSemanas && __pa.evolSemanas.length===8 && __pa.productos.some(function(p){return p.evol8semFact;}))`));
    chk('la tarjeta dice "Cómo viene, semana a semana"', await evaluar(cli, `/Cómo viene, semana a semana/.test(document.getElementById('prodEvolH').textContent)`));
    chk('arriba dice qué se cuenta: sólo lo entregado, sin envío ni propinas', await evaluar(cli, `/entregado/.test((document.querySelector('.prod-que-cuenta')||{}).textContent||'') && /sin envío ni propinas/.test(document.querySelector('.prod-que-cuenta').textContent)`));

    // ── las fechas del eje ──
    const ejes = await evaluar(cli, `(()=>{ var esp=__pa.evolSemanas.map(function(iso){var p=iso.split('-');return Number(p[2])+'/'+Number(p[1]);});
      var ten=[].map.call(document.querySelectorAll('#prodEvol .evo-xlbl'),function(t){return t.textContent;}); return {esp:esp, ten:ten}; })()`);
    chk('el eje dice las 8 fechas reales (el lunes de cada semana)', JSON.stringify(ejes.esp) === JSON.stringify(ejes.ten), ejes);
    chk('la semana en curso va resaltada', await evaluar(cli, `document.querySelectorAll('#prodEvol .evo-xlbl.cur').length===1 && document.querySelectorAll('#prodEvol .evo-xlbl')[7].classList.contains('cur')`));
    chk('la semana en curso va punteada', await evaluar(cli, `document.querySelectorAll('#prodEvol .evo-line.curso').length>0`));

    // ── sin filtro: una linea por categoria, con los numeros de la respuesta ──
    const todo = await evaluar(cli, `(()=>{
      var cats={}; __pa.productos.forEach(function(p){ var k=p.categoria||'Otro'; var c=cats[k]||(cats[k]={f:[0,0,0,0,0,0,0,0]}); for(var i=0;i<8;i++) c.f[i]+=Number((p.evol8semFact||[])[i])||0; });
      var lista=Object.keys(cats).map(function(k){return {k:k, tot:cats[k].f.reduce(function(a,x){return a+x;},0)};}).filter(function(x){return x.tot>0;}).sort(function(a,b){return b.tot-a.tot;});
      var cur=0, prev=0; Object.keys(cats).forEach(function(k){ cur+=cats[k].f[7]; prev+=cats[k].f[6]; });
      var ley=[].map.call(document.querySelectorAll('#prodEvol .evo-it'),function(it){return {n:it.querySelector('.evo-nom').textContent, t:it.querySelector('.evo-tot').textContent};});
      var tit=(document.querySelector('#prodEvol .evo-titular')||{}).textContent||'';
      return {lista:lista.slice(0,7), ley:ley, cur:Math.round(cur), prev:Math.round(prev), tit:tit, lineas:document.querySelectorAll('#prodEvol .evo-line:not(.curso)').length};
    })()`);
    const primeras = todo.lista.slice(0, todo.lista.length > 6 ? 5 : 6).map(x => x.k);
    chk('sin filtro: una línea por categoría, ordenadas por plata (máx. 6)', JSON.stringify(todo.ley.slice(0, primeras.length).map(x => x.n)) === JSON.stringify(primeras) && todo.ley.length <= 6 && todo.lineas === todo.ley.length, todo);
    chk('la leyenda de la primera categoría dice su plata de las 8 semanas', DIGITOS(todo.ley[0].t) === Math.round(todo.lista[0].tot), [todo.ley[0], todo.lista[0]]);
    chk('la frase de arriba: esta semana y la anterior, en plata', /Esta semana van/.test(todo.tit) && todo.tit.replace(/\D/g, '').indexOf(String(todo.cur)) > -1 && todo.tit.replace(/\D/g, '').indexOf(String(todo.prev)) > -1, todo);
    chk('sin filtro no ofrece Kilos (hay productos que se cuentan y que se pesan)', await evaluar(cli, `document.querySelectorAll('#prodEvol .evo-chip').length===0 && /En plata/.test(document.getElementById('prodEvol').textContent)`));

    // ── geometria ──
    const geo = await evaluar(cli, `(()=>{ var box=document.getElementById('prodEvol'), svg=box.querySelector('svg'); var cs=getComputedStyle(box);
      var util=Math.floor(box.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight));
      var sr=svg.getBoundingClientRect(); var txt=[].slice.call(svg.querySelectorAll('text')).map(function(t){return t.getBoundingClientRect();});
      var pis=0, pares=0, fuera=0;
      for(var i=0;i<txt.length;i++){ if(txt[i].left<sr.left-1||txt[i].right>sr.right+1) fuera++;
        for(var j=i+1;j<txt.length;j++){ pares++; var a=txt[i], b=txt[j]; if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) pis++; } }
      return {attr:Number(svg.getAttribute('width')), real:Math.round(sr.width), util:util, pis:pis, pares:pares, fuera:fuera,
              desborda: document.documentElement.scrollWidth > window.innerWidth + 1}; })()`);
    chk('el SVG se dibuja a su ancho real, sin escalar', Math.abs(geo.attr - geo.real) <= 1 && Math.abs(geo.attr - geo.util) <= 2, geo);
    chk('ningún rótulo pisa a otro (' + geo.pares + ' pares)', geo.pis === 0 && geo.pares > 10, geo);
    chk('ningún rótulo se sale del gráfico', geo.fuera === 0, geo);
    chk('la página no se desborda a lo ancho', geo.desborda === false, geo);

    // ── con filtro Carnes ──
    const hayCarne = await evaluar(cli, `__pa.productos.some(function(p){return p.categoria==='Carnes' && (p.evol8semFact||[]).some(function(x){return x>0;});})`);
    if (hayCarne) {
      await evaluar(cli, `prodSetCat('Carnes')`); await pausa(700);
      const car = await evaluar(cli, `(()=>{ var ps=__pa.productos.filter(function(p){return p.categoria==='Carnes' && (p.evol8semFact||[]).some(function(x){return x>0;});}).sort(function(a,b){return b.evol8semFact.reduce(function(s,x){return s+x;},0)-a.evol8semFact.reduce(function(s,x){return s+x;},0);});
        var ley=[].map.call(document.querySelectorAll('#prodEvol .evo-it .evo-nom'),function(n){return n.textContent;});
        var chips=[].map.call(document.querySelectorAll('#prodEvol .evo-chip'),function(b){return b.textContent+(b.classList.contains('on')?'*':'');});
        return {esp:ps.map(function(p){return p.nombre;}).slice(0,6), ley:ley, chips:chips, kg7:ps.reduce(function(a,p){return a+p.evol8sem[7];},0), kg6:ps.reduce(function(a,p){return a+p.evol8sem[6];},0),
          sub:document.getElementById('prodEvolSub').textContent}; })()`);
      chk('con Carnes: una línea por corte', JSON.stringify(car.esp) === JSON.stringify(car.ley) && /por producto/.test(car.sub), car);
      chk('con Carnes ofrece Plata y Kilos', JSON.stringify(car.chips) === JSON.stringify(['Plata*', 'Kilos']), car.chips);
      await evaluar(cli, `[].find.call(document.querySelectorAll('#prodEvol .evo-chip'),function(b){return b.textContent==='Kilos';}).click()`); await pausa(300);
      const kg = await evaluar(cli, `({tit:document.querySelector('#prodEvol .evo-titular').textContent, y:[].map.call(document.querySelectorAll('#prodEvol .evo-ylbl'),function(t){return t.textContent;}), on:(document.querySelector('#prodEvol .evo-chip.on')||{}).textContent})`);
      const kgTxt = v => Number(v.toFixed(3)).toLocaleString('es-AR', { maximumFractionDigits: 3 });
      chk('en Kilos la frase dice los kilos de esta semana y la anterior', kg.on === 'Kilos' && kg.tit.indexOf(kgTxt(car.kg7) + ' kg') > -1 && kg.tit.indexOf(kgTxt(car.kg6) + ' kg') > -1, [kg.tit, kgTxt(car.kg7), kgTxt(car.kg6)]);
      chk('y el eje Y va en kg', kg.y.length > 2 && kg.y.slice(1).every(t => / kg$/.test(t)), kg.y);

      // ── tocar la semana en curso ──
      const tip = await evaluar(cli, `(async()=>{ var r=document.querySelectorAll('#prodEvol .evo-hit')[7]; r.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        await new Promise(function(x){setTimeout(x,250);}); var t=document.querySelector('#prodEvol .evo-tip');
        var vals=[].map.call(t.querySelectorAll('.evo-tip-v'),function(v){return v.textContent;});
        var tr=t.getBoundingClientRect(), wr=document.getElementById('prodEvol').getBoundingClientRect();
        return {on:t.classList.contains('on'), txt:t.textContent, vals:vals, dentro: tr.left>=wr.left-1 && tr.right<=wr.right+1, guia:getComputedStyle(document.querySelector('#prodEvol .evo-guia')).display}; })()`);
      chk('tocar una semana abre el cartel con cada corte', tip.on === true && /en curso/.test(tip.txt) && tip.vals.length === car.ley.length, tip);
      chk('el cartel no se sale de la tarjeta', tip.dentro === true, tip);
      chk('y marca la semana con una guía', tip.guia !== 'none', tip.guia);
      await evaluar(cli, `document.querySelectorAll('#prodEvol .evo-hit')[7].dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
      chk('tocarla de nuevo lo cierra', await evaluar(cli, `!document.querySelector('#prodEvol .evo-tip').classList.contains('on')`));
      if (ANCHO <= 560) {
        const alt = await evaluar(cli, `[].map.call(document.querySelectorAll('#prodEvol .evo-chip'),function(b){return Math.round(b.getBoundingClientRect().height);})`);
        chk('los botones Plata/Kilos llegan al piso táctil (38px)', alt.length > 0 && alt.every(h => h >= 38), alt);
      }
      await evaluar(cli, `prodSetCat('all')`);
    } else console.log('  (sin carne en las ultimas 8 semanas: el bloque de filtro se saltea)');

    }  // hayGrafico

    // ── TENDENCIA contra PRODUCTOS: dos fuentes, el mismo criterio ──
    console.log('  -- Unidades de TENDENCIA contra PRODUCTOS --');
    if (!await esperar(cli, `window.D && D.pedidos && D.pedidos.length>200 && D.pedidos.some(function(p){return 'fex' in p;})`, 150000)) {
      chk('el volcado de pedidos trae fex (la fecha de entrega con año)', false, await evaluar(cli, `window.D&&D.pedidos?D.pedidos.length:null`));
    } else {
      await evaluar(cli, `vSwitchTab('tendencia')`); await pausa(1500);
      await esperar(cli, `document.getElementById('vtMetric') && document.getElementById('vtSubcanal').options.length>0`, 60000);
      /* El orden MALO a proposito: `pedidosLight` puede traer los pedidos antes de que el
         volcado traiga `D.stock`. La unidad de cada producto no puede depender de eso
         (13/9/2026: con el mapa vacio la carne se sumaba como unidades, a veces). */
      await evaluar(cli, `(()=>{ window.__stk=D.stock; D.stock=[]; return 1; })()`);
      await evaluar(cli, `(()=>{ function set(id,v){ var s=document.getElementById(id); if(s){ s.value=v; } }
        set('vtSubcanal','__all'); set('vtBarrio','__all'); set('vtDow','week'); set('vtWindow','12'); set('vtMetric','prod'); rTendencia();
        setTimeout(function(){ set('vtCat','__all'); if(typeof tendCatChange==='function') tendCatChange(); set('vtProd','__all'); rTendencia(); }, 1500); return 1; })()`);
      /* La tabla tiene que estar EN UNIDADES antes de leerla: con la metrica de
         antes (Facturacion) tambien tiene filas, y leerla daria un cruce falso. */
      const enUnid = await esperar(cli, `(()=>{ var h=document.querySelector('#vtTable .row.h'); if(!h||!/Unidades/.test(h.textContent)){ if(document.getElementById('vtMetric').value!=='prod'){ document.getElementById('vtMetric').value='prod'; rTendencia(); } return false; }
        return document.querySelectorAll('#vtTable .row:not(.h)').length>=6; })()`, 90000);
      if (!enUnid) console.log('     la tabla no llego a Unidades: ' + await evaluar(cli, `JSON.stringify({met:document.getElementById('vtMetric').value, head:(document.querySelector('#vtTable .row.h')||{}).textContent||null, chart:(document.getElementById('vtChart').textContent||'').slice(0,160), filas:document.querySelectorAll('#vtTable .row:not(.h)').length, VD:(typeof VD!=='undefined'&&VD)?VD.length:null})`));
      await pausa(1500);
      /* Los kilos NO se suman con las unidades (13/9/2026): con "todos los productos"
         Tendencia mide solo lo que va por unidad, asi que del backend se suma solo eso. */
      const CRUCE = (uni) => `(()=>{
        var back={}; __pa.evolSemanas.forEach(function(iso,i){ var p=iso.split('-'); var k=('0'+Number(p[2])).slice(-2)+'/'+('0'+Number(p[1])).slice(-2);
          back[k]=__pa.productos.reduce(function(a,q){ return ((q.uni||'u')===${JSON.stringify(uni)}) ? a+(Number(q.evol8sem[i])||0) : a; },0); });
        var front={}; [].forEach.call(document.querySelectorAll('#vtTable .row:not(.h)'),function(r){ var c=r.querySelectorAll('div'); var m=c[0].textContent.match(/\\((\\d{2}\\/\\d{2})-/); if(m) front[m[1]]=Number(String(c[1].textContent).replace(',','.'))||0; });
        var filas=[], dif=0; Object.keys(back).forEach(function(k){ if(!(k in front)&&back[k]===0) return; var a=Math.round(back[k]*1000)/1000, b=Math.round((front[k]||0)*1000)/1000; filas.push(k+' back '+a+' / tendencia '+b); if(Math.abs(a-b)>0.001) dif++; });
        return {filas:filas, dif:dif, n:filas.length}; })()`;
      const cruce = await evaluar(cli, CRUCE('u'));
      console.log('     ' + cruce.filas.join('\n     '));
      chk('Unidades por semana: TENDENCIA (volcado) = PRODUCTOS (backend), sin kilos, ' + cruce.n + ' semanas', cruce.dif === 0 && cruce.n >= 6, cruce);
      const tabla = await evaluar(cli, `[].map.call(document.querySelectorAll('#vtTable .row:not(.h)'),function(r){return r.querySelectorAll('div')[1].textContent;})`);
      chk('con todos los productos la columna Unidades es entera (no mezcla kilos)', tabla.length >= 6 && tabla.every(t => /^\d+$/.test(t.trim())), tabla);
      const hayKgBack = await evaluar(cli, `__pa.productos.some(function(q){return q.uni==='kg'&&q.evol8sem.some(function(x){return x>0;});})`);
      if (hayKgBack) {
        chk('el pie dice que la carne se pesa y no se suma', await evaluar(cli, `/La carne se pesa y no se suma/.test(document.getElementById('vTend').textContent)`));
        const rk = await evaluar(cli, `(()=>{ var sub=document.querySelector('#vTend .vt-rank-sub'); var qs=[].map.call(document.querySelectorAll('#vTend .vt-rank-q'),function(e){return e.childNodes[0].textContent;}); return {sub:!!sub, kg:qs.filter(function(t){return / kg$/.test(t);}).length, u:qs.filter(function(t){return /^\\d+$/.test(t);}).length, raros:qs.filter(function(t){return !/ kg$/.test(t)&&!/^\\d+$/.test(t);})}; })()`);
        chk('el ranking pone los kilos aparte y cada fila con su unidad', rk.raros.length === 0 && (rk.kg === 0 || rk.sub), rk);
        await evaluar(cli, `(()=>{ var s=document.getElementById('vtCat'); var o=[].find.call(s.options,function(x){return x.value==='Carnes';}); if(o){ s.value='Carnes'; tendCatChange(); } return !!o; })()`);
        const enKg = await esperar(cli, `(()=>{ var h=document.querySelector('#vtTable .row.h'); return !!h && /Kilos/i.test(h.textContent) && document.querySelectorAll('#vtTable .row:not(.h)').length>=3; })()`, 30000);
        chk('con la categoria Carnes la tabla pasa a Kilos', enKg, await evaluar(cli, `(document.querySelector('#vtTable .row.h')||{}).textContent||null`));
        if (enKg) {
          await pausa(800);
          const cruceK = await evaluar(cli, CRUCE('kg'));
          console.log('     ' + cruceK.filas.join('\n     '));
          chk('Kilos de carne por semana: TENDENCIA = PRODUCTOS, ' + cruceK.n + ' semanas', cruceK.dif === 0 && cruceK.n >= 3, cruceK);
          chk('el eje y los valores dicen kg', await evaluar(cli, `/ kg/.test(document.getElementById('vtKpis').textContent)`));
        }
        await evaluar(cli, `(()=>{ var s=document.getElementById('vtCat'); s.value='__all'; tendCatChange(); return 1; })()`);
      }
      await evaluar(cli, `(()=>{ if(window.__stk&&(!D.stock||!D.stock.length)) D.stock=window.__stk; return 1; })()`);
      chk('el pie de Tendencia dice que cuenta sólo lo entregado', await evaluar(cli, `/sólo lo entregado|sólo lo <b>entregado/i.test(document.getElementById('vTend').innerHTML) || /Cuenta sólo lo entregado/.test(document.getElementById('vTend').textContent)`));
    }

    const errs = await evaluar(cli, `(window.__err||[]).filter(function(e){return !/authRequired|Failed to fetch|NetworkError/.test(e);})`);
    chk('ningún error de consola', errs.length === 0, errs);
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.error(e); salir(1); }
})();
