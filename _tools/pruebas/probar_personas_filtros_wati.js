/* CRM › Personas para la campaña por el panel de WATI (25/10/2026):
   · filtro por la campaña que recibio (o no) la CASA;
   · filtro por el dia de la semana en que pide (3 pedidos o mas, la mitad o mas ese dia);
   · «compraron en los ultimos N dias» ya no se lleva a los del pedido en curso: tienen su atajo;
   · el CSV sale con las 4 columnas de WATI, sin el control y anotado en el CRM.

   Datos reales del CRM (solo lectura). Los POST se cortan (sesion_prep) y se anotan
   en window.__posts; el CSV se atrapa antes de bajar.

   TOKEN=... BASE=http://localhost:8157 ANCHO=390 node _tools/pruebas/probar_personas_filtros_wati.js
*/
'use strict';
const T = 'C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(T + 'cdp.js');
const prep = require(T + 'sesion_prep.js');
const TOKEN = process.env.TOKEN;
const ANCHO = Number(process.env.ANCHO || 1440);
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};
const ANOTADOR = `
(function(){
  window.__posts = []; window.__csv = [];
  var o = window.fetch;
  window.fetch = function(u, x){
    if (x && String(x.method||'').toUpperCase()==='POST'){ try{ window.__posts.push(JSON.parse(x.body)); }catch(e){ window.__posts.push(String(x.body)); } }
    return o.apply(this, arguments);
  };
  var B = window.Blob;
  window.Blob = function(partes, op){ try{ if (op && /csv/.test(op.type||'')) window.__csv.push(partes.join('')); }catch(e){} return new B(partes, op); };
  HTMLAnchorElement.prototype.click = function(){};   // no baja nada a disco
})();`;
/* Lo que la pantalla tiene que mostrar, calculado aparte con la regla escrita. */
const PIDE = `function(c, dow){ var n=0,e=0; (c.fp||[]).forEach(function(f){ var m=String(f).match(/^(\\d{4})(\\d{2})(\\d{2})$/); if(!m) return; n++; if(new Date(+m[1],+m[2]-1,+m[3]).getDay()===dow) e++; }); return n>=3 && e/n>=0.5; }`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ANOTADOR });
    await cli.enviar('Page.navigate', { url: BASE + '/' + (process.env.APP || 'app.html') });
    if (!await esperar(cli, "typeof go==='function'", 60000)) { console.log('  el ERP no arranco'); process.exit(1); }
    for (let i = 0; i < 20; i++) {
      await evaluar(cli, 'go("estancias")'); await pausa(1500);
      await evaluar(cli, 'window.estSwitch && estSwitch("clientes")'); await pausa(500);
      if (await evaluar(cli, "!!(document.getElementById('estClientes')||{}).offsetParent")) break;
    }
    await evaluar(cli, "window.estCliVista && estCliVista('tabla')");
    if (!await esperar(cli, "document.querySelectorAll('#estCliList tbody tr').length > 5")) { console.log('  la tabla no dibujo'); process.exit(1); }
    console.log('\n== CRM › Personas para WATI · ' + ANCHO + ' px · datos reales ==\n');
    const cuenta = () => evaluar(cli, "Number((document.querySelector('#estCliCount b')||{}).textContent)");
    const total = await cuenta();

    // 1) Campaña por casa.
    const lleno = await esperar(cli, "document.querySelectorAll('#cliCampSel option').length > 1", 60000);
    chk('el desplegable trae las campañas de la bitácora', lleno, await evaluar(cli, "(document.getElementById('cliCampSel')||{}).innerHTML"));
    const camp = await evaluar(cli, "(function(){ var o=document.querySelectorAll('#cliCampSel option'); for (var i=1;i<o.length;i++) if (/\\((\\d+) casas\\)/.test(o[i].textContent) && +o[i].textContent.match(/\\((\\d+) casas\\)/)[1] > 3) return o[i].value; return o.length>1?o[1].value:''; })()");
    await evaluar(cli, 'estCliFiltro("campModo","si"); estCliFiltro("campNom",' + JSON.stringify(camp) + ')'); await pausa(600);
    const nSi = await cuenta();
    const chkSi = await evaluar(cli, `(function(nom){ var cc=window.crmCampaniasPorCasa(); var todos=window.estClientesSync()||[];
      var espera=todos.filter(function(c){ return !c.visitante && !!((cc.casas[window.crmCasaDe(c)]||{})[nom]); }).length;
      return espera; })(${JSON.stringify(camp)})`);
    chk('«la casa recibió ' + camp + '»: ' + nSi + ' personas, las que la regla dice', nSi > 0 && nSi === chkSi, { nSi, chkSi });
    await evaluar(cli, 'estCliFiltro("campModo","no")'); await pausa(600);
    const nNo = await cuenta();
    chk('«la recibió» + «NO la recibió» = el total', nSi + nNo === total, { nSi, nNo, total });
    const col = await evaluar(cli, "[].slice.call(document.querySelectorAll('#estCliList thead th')).map(function(t){return t.textContent;}).join('|')");
    chk('la tabla muestra la última campaña de la casa', /Última campaña/.test(col), col);
    await evaluar(cli, 'estCliFiltro("campNom",""); estCliFiltro("campModo","si")'); await pausa(500);

    // 2) Día de la semana: domingo.
    await evaluar(cli, 'estCliFiltro("diaSem","0")'); await pausa(600);
    const nDom = await cuenta();
    const espDom = await evaluar(cli, `(function(){ var f=${PIDE}; return (window.estClientesSync()||[]).filter(function(c){ return !c.visitante && f(c,0); }).length; })()`);
    chk('«pide los domingos»: ' + nDom + ' personas (3 pedidos o más, la mitad o más en domingo)', nDom === espDom, { nDom, espDom });
    await evaluar(cli, 'estCliFiltro("diaSem","")'); await pausa(400);

    // 3) Pedido en curso, aparte.
    await evaluar(cli, 'estCliFiltro("enCurso","con")'); await pausa(500); const nCon = await cuenta();
    await evaluar(cli, 'estCliFiltro("enCurso","sin")'); await pausa(500); const nSin = await cuenta();
    chk('con pedido en curso + sin = el total', nCon + nSin === total && nCon >= 0, { nCon, nSin, total });
    await evaluar(cli, 'estCliLimpiar()'); await esperar(cli, "document.querySelectorAll('#estCliList tbody tr').length > 5", 20000);

    // 4) La ventana: «compraron en N días» ya no saca al del pedido en curso.
    /* Un caso armado EN MEMORIA (no toca la planilla): una persona sola en su casa,
       con pedido en curso y la ultima compra hace 40 dias. Antes «compraron en 7
       dias» se la llevaba; ahora tiene que quedar, y salir con el atajo del en curso. */
    const caso = await evaluar(cli, `(function(){
      var L=window.estClientesSync()||[], casas={};
      L.forEach(function(c){ var k=window.crmCasaDe(c); casas[k]=(casas[k]||0)+1; });
      var c=L.filter(function(c){ return !c.esVendedor && !c.visitante && (c.entregados||0)>0 && casas[window.crmCasaDe(c)]===1 && String(c.tel||'').replace(/[^0-9]/g,'').length>=10 && (c.pendientes||0)===0; })[0];
      if(!c) return null; c.pendientes=1; c.diasUltima=40; return String(c.nombre||''); })()`);
    const filaCaso = "(function(n){ n=n.toLowerCase(); return [].slice.call(document.querySelectorAll('#cmpList .cli-dl-row')).filter(function(r){ return r.querySelector('.cli-dl-n b').textContent.toLowerCase()===n; })[0]||null; })";
    await evaluar(cli, 'estCliDescargarCSV()'); await pausa(500);
    await evaluar(cli, "cmpSet('uno', false)"); await pausa(150);
    await esperar(cli, "!/buscando el grupo de control/.test((document.getElementById('cmpRes')||{}).textContent||'')", 60000);
    await evaluar(cli, "document.getElementById('cmpN1').value='7'; cmpSacar('compra')"); await pausa(300);
    const res7 = await evaluar(cli, "document.getElementById('cmpRes').textContent");
    const filas = await evaluar(cli, "document.querySelectorAll('#cmpList .cli-dl-row').length");
    const off7 = await evaluar(cli, "document.querySelectorAll('#cmpList .cli-dl-row.off').length");
    // Contra la regla: casas con una ENTREGA en 7 dias; los «solo en curso» quedan.
    const esp = await evaluar(cli, `(function(){
      var casas={}; (window.estClientesSync()||[]).forEach(function(c){ var k=window.crmCasaDe(c); (casas[k]||(casas[k]=[])).push(c); });
      var dias=function(c){ return typeof c.diasUltima==='number'?c.diasUltima:-1; };
      var rows=[].slice.call(document.querySelectorAll('#cmpList .cli-dl-row'));
      var soloCurso=0, soloCursoAdentro=0;
      rows.forEach(function(r){
        var nom=r.querySelector('.cli-dl-n b').textContent; var off=r.classList.contains('off');
        var cur=/pedido en curso/.test(r.textContent);
        if (cur){ soloCurso++; if(!off) soloCursoAdentro++; }
      });
      return {soloCurso:soloCurso, adentro:soloCursoAdentro}; })()`);
    chk('«compraron en los últimos 7 días» saca a algunos (' + off7 + ' de ' + filas + ')', off7 > 0 && off7 < filas, { off7, filas, res7 });
    const casoEstado = await evaluar(cli, '(function(){ var r=' + filaCaso + '(' + JSON.stringify(String(caso || '')) + '); if(!r){ var n=' + JSON.stringify(String(caso||'').toLowerCase().split(/\s+/)[0]) + '; r=[].slice.call(document.querySelectorAll("#cmpList .cli-dl-row")).filter(function(x){ return x.textContent.toLowerCase().indexOf(n)>=0 && /pedido en curso/.test(x.textContent); })[0]; } return r ? (r.classList.contains("off") ? "afuera" : "adentro") : "no esta"; })()');
    chk('   y deja adentro al del pedido en curso que compró hace 40 días (' + caso + ')', !!caso && casoEstado === 'adentro', { caso, casoEstado });
    await evaluar(cli, "cmpSacar('curso')"); await pausa(300);
    const curAdentro = await evaluar(cli, "[].slice.call(document.querySelectorAll('#cmpList .cli-dl-row')).filter(function(r){ return /pedido en curso/.test(r.textContent) && !r.classList.contains('off'); }).length");
    chk('el atajo «pedido en curso» los saca a todos', curAdentro === 0, curAdentro);
    const casoEstado2 = await evaluar(cli, '(function(){ var n=' + JSON.stringify(String(caso||'').toLowerCase().split(/\s+/)[0]) + '; var r=[].slice.call(document.querySelectorAll("#cmpList .cli-dl-row")).filter(function(x){ return x.textContent.toLowerCase().indexOf(n)>=0 && /pedido en curso/.test(x.textContent); })[0]; return r ? (r.classList.contains("off") ? "afuera" : "adentro") : "no esta"; })()');
    chk('   incluido el caso armado', casoEstado2 === 'afuera', casoEstado2);

    // 5) El CSV de WATI.
    await evaluar(cli, "cmpSet('nombre','prueba-claude-wati'); cmpExcel()");
    await esperar(cli, "window.__csv.length>=1 && window.__posts.some(function(x){ return x && x.action==='crmLogCampania'; })", 8000);
    const csv = await evaluar(cli, 'window.__csv[0]||""');
    const lineas = csv.replace(/^\uFEFF/, '').split(/\r\n/).filter(Boolean);
    chk('el encabezado es el de WATI: Name,CountryCode,Phone,AllowCampaign', lineas[0] === 'Name,CountryCode,Phone,AllowCampaign', lineas[0]);
    chk('cada fila tiene 4 columnas, 54 y un teléfono 9 + 10 dígitos', lineas.slice(1).every(l => { const p = l.split(','); return p.length === 4 && p[1] === '54' && /^9\d{10}$/.test(p[2]) && p[3] === 'True'; }), lineas.slice(1, 4));
    const p0 = await evaluar(cli, "window.__posts.filter(function(x){ return x && x.action==='crmLogCampania'; })[0]||null");
    const g = (p0 && p0.grupos) || {};
    chk('queda anotada en el CRM como lista pendiente, con el control aparte', p0 && p0.action === 'crmLogCampania' && p0.pendiente === true && (g.control || []).length > 0, { a: p0 && p0.action, ctl: (g.control || []).length });
    const telsCsv = {}; lineas.slice(1).forEach(l => { telsCsv[l.split(',')[2].slice(-10)] = 1; });
    const ctlEnCsv = (g.control || []).filter(it => telsCsv[String(it.tel || '').replace(/\D/g, '').slice(-10)]).length;
    chk('ninguna persona de control va en el CSV', ctlEnCsv === 0, ctlEnCsv);
    chk('el CSV lleva a los destinatarios anotados', lineas.length - 1 === (g.destinatarios || []).length, { csv: lineas.length - 1, dest: (g.destinatarios || []).length });

    const anchoPag = await evaluar(cli, 'document.documentElement.scrollWidth - document.documentElement.clientWidth');
    chk('sin scroll horizontal de la página', anchoPag <= 1, anchoPag);
    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
