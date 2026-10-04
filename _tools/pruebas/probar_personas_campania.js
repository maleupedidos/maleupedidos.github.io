/* CRM > Personas para armar campañas (2/10/2026): filtros que se combinan, la
   tabla ordenable, la vista previa con tildes y el registro de la lista.

   Datos reales del CRM; los POST se cortan (sesion_prep) y ademas se ANOTAN en
   window.__posts para comprobar que se registra lo que tiene que registrarse.
   No escribe nada en la planilla.

   TOKEN=... ANCHO=390 node probar_personas_campania.js
*/
'use strict';
const T = 'C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(T + 'cdp.js');
const prep = require(T + 'sesion_prep.js');
const TOKEN = process.env.TOKEN;
const ANCHO = Number(process.env.ANCHO || 1440);
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};
// Va DESPUES del prep: anota el cuerpo del POST y se lo pasa al prep, que lo corta.
const ANOTADOR = `
(function(){
  window.__posts = [];
  var o = window.fetch;
  window.fetch = function(u, x){
    if (x && String(x.method||'').toUpperCase()==='POST'){ try{ window.__posts.push(JSON.parse(x.body)); }catch(e){ window.__posts.push(String(x.body)); } }
    return o.apply(this, arguments);
  };
})();`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN) + ANOTADOR });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, "typeof go==='function'", 60000)) { console.log('  el ERP no arranco'); process.exit(1); }
    /* El arranque puede devolver la pantalla a Inicio despues del primer go()
       (4/10/2026: la prueba quedaba mirando una pantalla oculta). Se insiste hasta
       que CRM este a la vista. */
    for (let i = 0; i < 20; i++) {
      await evaluar(cli, 'go("estancias")'); await pausa(1500);
      await evaluar(cli, 'window.estSwitch && estSwitch("clientes")'); await pausa(500);
      if (await evaluar(cli, "!!(document.getElementById('estClientes')||{}).offsetParent")) break;
    }
    await evaluar(cli, "window.estCliVista && estCliVista('tabla')");
    if (!await esperar(cli, "document.querySelectorAll('#estCliList tbody tr').length > 5")) {
      console.log('  la tabla no dibujo'); process.exit(1);
    }
    console.log('\n== CRM > Personas: campañas · ' + ANCHO + ' px · datos reales ==\n');

    const filas = () => evaluar(cli, "document.querySelectorAll('#estCliList tbody tr').length");
    const cuenta = () => evaluar(cli, "Number((document.querySelector('#estCliCount b')||{}).textContent)");
    const total = await cuenta();
    chk('arranca en tabla y dice cuantas personas quedan', total > 50 && (await filas()) === Math.min(total, 400), { total, filas: await filas() });

    // 1) Barrios combinados: dos barrios = la suma de cada uno solo.
    const barrios = await evaluar(cli, `[].slice.call(document.querySelectorAll('#estClientes .est-chip[data-b]')).map(function(b){return b.dataset.b;}).filter(function(b){return b && b!=='(otros)' && b!=='(sin)';}).slice(0,2)`);
    const nDe = async (bs) => {
      await evaluar(cli, 'estCliBarrio("")');
      for (const b of bs) await evaluar(cli, 'estCliBarrio(' + JSON.stringify(b) + ')');
      await pausa(300); return cuenta();
    };
    const n1 = await nDe([barrios[0]]), n2 = await nDe([barrios[1]]), n12 = await nDe(barrios);
    chk('dos barrios a la vez suman los dos (' + barrios.join(' + ') + ')', n12 === n1 + n2 && n1 > 0 && n2 > 0, { n1, n2, n12 });
    const on = await evaluar(cli, "document.querySelectorAll('#estClientes .est-chip[data-b].on').length");
    chk('los dos chips quedan prendidos', on === 2, on);
    await evaluar(cli, 'estCliBarrio("")'); await pausa(300);

    // 2) Estados combinados.
    const e = async (arr) => { await evaluar(cli, 'estCliEstado("")'); for (const x of arr) await evaluar(cli, 'estCliEstado(' + JSON.stringify(x) + ')'); await pausa(200); return cuenta(); };
    const nd = await e(['dormido']), ni = await e(['inactivo']), ndi = await e(['dormido', 'inactivo']);
    chk('dormidos + inactivos = la suma', ndi === nd + ni && nd > 0, { nd, ni, ndi });
    await e([]);

    // 3) Filtro numerico: dias desde la ultima compra, verificado fila por fila.
    await evaluar(cli, 'estCliFiltro("diasMin","30");estCliFiltro("diasMax","90")'); await pausa(500);
    const fueraDeRango = await evaluar(cli, `(function(){ var malos=[]; [].slice.call(document.querySelectorAll('#estCliList tbody tr')).forEach(function(tr){ var t=tr.children[2].textContent; var d=parseInt(t,10); if(!(d>=30&&d<=90)) malos.push(t); }); return {n:document.querySelectorAll('#estCliList tbody tr').length, malos:malos.slice(0,5)}; })()`);
    chk('ultima compra entre 30 y 90 dias: todas las filas cumplen', fueraDeRango.n > 0 && fueraDeRango.malos.length === 0, fueraDeRango);
    await evaluar(cli, 'estCliFiltro("comprasMin","3")'); await pausa(500);
    const compras = await evaluar(cli, `[].slice.call(document.querySelectorAll('#estCliList tbody tr')).map(function(tr){return parseInt(tr.children[3].textContent,10);})`);
    chk('+ compras >= 3: se combina con lo anterior', compras.length > 0 && compras.length < fueraDeRango.n && compras.every(x => x >= 3), compras.slice(0, 10));
    await evaluar(cli, 'estCliLimpiar()');
    await esperar(cli, "document.querySelectorAll('#estCliList tbody tr').length > 5", 20000);
    chk('limpiar vuelve al total', (await cuenta()) === total, await cuenta());

    // 4) Ordenar por columna, y al revés con el segundo toque.
    await evaluar(cli, 'estCliSort("ticket")'); await pausa(300);
    const tk = () => evaluar(cli, `[].slice.call(document.querySelectorAll('#estCliList tbody tr')).slice(0,30).map(function(tr){return Number(tr.children[4].textContent.replace(/[^0-9]/g,''))||0;})`);
    const desc = await tk();
    chk('ordena por ticket de mayor a menor', desc.every((x, i) => i === 0 || desc[i - 1] >= x), desc.slice(0, 8));
    await evaluar(cli, 'estCliSort("ticket")'); await pausa(300);
    const asc = await tk();
    chk('segundo toque: de menor a mayor', asc.every((x, i) => i === 0 || asc[i - 1] <= x) && asc[0] <= desc[0], asc.slice(0, 8));
    await evaluar(cli, 'estCliSort("ultima")'); await pausa(300);

    // Que no haya scroll horizontal de PAGINA (la tabla scrollea adentro de su caja).
    const anchoPag = await evaluar(cli, 'document.documentElement.scrollWidth - document.documentElement.clientWidth');
    chk('sin scroll horizontal de la pagina', anchoPag <= 1, anchoPag);
    const fija = await evaluar(cli, "getComputedStyle(document.querySelector('#estCliList tbody td')).position");
    chk('la columna Persona queda fija al deslizar', fija === 'sticky', fija);

    // 5) Vista previa: sacar a mano, atajo por compra reciente, control y registro.
    await nDe([barrios[0]]);
    const nLista = await cuenta();
    await evaluar(cli, 'estCliDescargarCSV()'); await pausa(400);
    const filasPrev = await evaluar(cli, "document.querySelectorAll('#cliDlList .cli-dl-row').length");
    chk('la vista previa muestra a todos los que tienen telefono', filasPrev > 0 && filasPrev <= nLista, { filasPrev, nLista });
    await evaluar(cli, "document.querySelectorAll('#cliDlList .cli-dl-row input')[0].click()"); await pausa(150);
    const off1 = await evaluar(cli, "document.querySelectorAll('#cliDlList .cli-dl-row.off').length");
    chk('un tilde saca a una persona', off1 === 1, off1);
    await evaluar(cli, "document.getElementById('cliDlN1').value='30'; estCliDlSacar('compra')"); await pausa(200);
    const off2 = await evaluar(cli, "document.querySelectorAll('#cliDlList .cli-dl-row.off').length");
    chk('el atajo "compraron en los ultimos 30 dias" saca a mas', off2 > off1, { off1, off2 });
    const res = await evaluar(cli, "document.getElementById('cliDlRes').textContent");
    // Sin nombre no descarga.
    await evaluar(cli, 'estCliDlConfirmar()'); await pausa(200);
    chk('sin nombre de campaña no descarga ni registra', (await evaluar(cli, 'window.__posts.length')) === 0 && (await evaluar(cli, "!!document.getElementById('cliDlModal')")), await evaluar(cli, 'window.__posts.length'));
    await evaluar(cli, "estCliDlSet('nombre','prueba-claude'); estCliDlConfirmar()");
    await esperar(cli, 'window.__posts.length>=1', 8000);
    await pausa(800);
    /* Desde el 4/10/2026: UNA llamada con los tres grupos, los destinatarios
       como lista pendiente, y el control sorteado por CASA. */
    const posts = await evaluar(cli, 'window.__posts');
    const p0 = posts[0] || {}, g = p0.grupos || {};
    const nV = (g.destinatarios || []).length, nC = (g.control || []).length, nX = (g.excluidos || []).length;
    chk('una sola llamada, crmLogCampania, como lista pendiente y con lote', posts.length === 1 && p0.action === 'crmLogCampania'
        && p0.template === 'prueba-claude' && p0.pendiente === true && /^\d{13}$/.test(p0.lote), posts.map(x => ({a: x.action, p: x.pendiente, l: x.lote})));
    chk('los sacados van como excluidos', nX === off2, { nX, off2 });
    chk('van + control = los tildados', nV + nC === filasPrev - off2, { nV, nC, nIncl: filasPrev - off2 });
    const casas = await evaluar(cli, `(function(g){
      var porKey={}; (window.estClientesSync()||[]).forEach(function(c){ porKey[c.key]=c; });
      var casa=function(it){ var c=porKey[it.key]; return c ? window.crmCasaDe(c) : 'key|'+it.key; };
      var v={}, k={}; (g.destinatarios||[]).forEach(function(it){ v[casa(it)]=1; }); (g.control||[]).forEach(function(it){ k[casa(it)]=1; });
      var ambas=Object.keys(k).filter(function(x){ return v[x]; });
      return {casasV:Object.keys(v).length, casasK:Object.keys(k).length, partidas:ambas, conocidas:Object.keys(porKey).length};
    })(${JSON.stringify(g)})`);
    chk('ninguna casa queda partida entre campaña y control', casas.conocidas > 0 && casas.partidas.length === 0, casas);
    const nCasas = casas.casasV + casas.casasK;
    chk('control del 15% de las CASAS si son 20 o mas', nCasas >= 20 ? casas.casasK === Math.round(nCasas * 0.15) : nC === 0, casas);
    chk('ningun vendedor en la lista', await evaluar(cli, `(function(g){ var L=(g.destinatarios||[]).concat(g.control||[]);
      var porKey={}; (window.estClientesSync()||[]).forEach(function(c){ porKey[c.key]=c; });
      return L.every(function(it){ return !(porKey[it.key]||{}).esVendedor; }); })(${JSON.stringify(g)})`));
    console.log('       resumen de la vista previa: ' + res);

    // El aviso de la lista sin confirmar y sus dos botones.
    await evaluar(cli, `window.crmInterAgregar([{id:'E1791130000000-0', fecha:'04/10/2026 12:00', key:'x', tel:'1140000001', nombre:'X',
      resultado:'📋 Lista bajada, sin confirmar', prox:'', nota:'Campaña: prueba-aviso', origen:'lista', usuario:'Tadeo'}]); rClientes();`);
    const hayAviso = await esperar(cli, "/prueba-aviso/.test((document.getElementById('cliListas')||{}).textContent||'')", 8000);
    chk('arriba de Personas aparece la lista que espera «Ya la mandé»', hayAviso, await evaluar(cli, "(document.getElementById('cliListas')||{}).textContent"));
    await evaluar(cli, 'window.__posts.length=0; document.querySelector("#cliListas .est-chip.on").click()');
    await esperar(cli, 'window.__posts.length>=1', 5000);
    const pc = await evaluar(cli, 'window.__posts[0]');
    chk('«Ya la mandé» pide confirmar ESE lote como mandado', pc && pc.action === 'crmCampaniaConfirmar' && pc.lote === '1791130000000' && pc.mandada === true, pc);
    const enCampania = await evaluar(cli, "window.crmCampaniasDe('x','1140000001')");
    chk('mientras es lista, esa persona NO figura como que recibio una campaña', Array.isArray(enCampania) && enCampania.length === 0, enCampania);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
