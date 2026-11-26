/* LA TAB VENTAS DESPUES DE /mejora (12/10/2026) — Tendencia, Comparar, Combos, Red.
 *
 *   node probar_ventas_mejora.js [390|1440]
 *   APP=app_viejo_tmp.html node probar_ventas_mejora.js     ← la direccion contraria
 *
 * Ventas y pedidos INVENTADOS, fechados respecto de hoy: no toca produccion.
 * Lo de la lista (periodo de arranque, margen, por canal, copiar) esta en
 * probar_ventas_lista.js.
 *
 *  · TENDENCIA — la tabla muestra la metrica elegida (decia Facturado al lado
 *    del % del ticket); el mes en curso se compara contra el anterior AL MISMO
 *    DIA (octubre con 12 dias salia -51% contra septiembre entero); la semana
 *    se nombra por sus fechas y no por el numero ISO.
 *  · COMPARAR — el total es retail + catering (septiembre daba $552.000 menos
 *    que Ventas y Tendencia); "Contra el año pasado" solo si hay ventas de hace
 *    un año.
 *  · COMBOS — dejo de ser sub-tab: es una seccion de POR PRODUCTO; un combo
 *    que cambio de precio es UNA fila.
 *  · RED — "De donde sale lo que se les paga" va plegada mientras casi ningun
 *    pedido tenga el dato.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (nom, cond, det) => {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 320) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, e, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, e)) return true; } catch (x) {} await pausa(200); } return false; };

const H = new Date();
const p2 = n => String(n).padStart(2, '0');
const dia = (mesAtras, d) => new Date(H.getFullYear(), H.getMonth() - mesAtras, d);
const iso = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const dmy = d => p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear();
const plata = n => '$' + Math.round(n).toLocaleString('es-AR');
const ULT_DIA = H.getDate() === new Date(H.getFullYear(), H.getMonth() + 1, 0).getDate();

/* Las cuatro ventas: hace dos meses, dos el mes pasado (dia 3 y dia 20) y una este mes (dia 1). */
const F = [
  { d: dia(2, 5), $: 200000, co: 100000, c: 'Casa Uno' },
  { d: dia(1, 3), $: 100000, co: 60000, c: 'Casa Dos' },
  { d: dia(1, 20), $: 300000, co: 150000, c: 'Casa Tres' },
  { d: dia(0, 1), $: 150000, co: 100000, c: 'Casa Cuatro' }
];
const VD = F.map((x, i) => ({ canal: 'Venta Directa', zona: 'Home', barrio: 'Estancias del Pilar', subBarrio: 'Golf', fecha: dmy(x.d), fCob: dmy(x.d),
  cliente: x.c, estado: 'Entregado', ep: 'Cobrado', fp: 'Transferencia', $: x.$, costo: x.co, ef: 0, tr: x.$, pEf: 0, pTr: 0, h: 'Home', n: String(i + 1), tel: '549114000000' + i, he: '19:00' }));
const PED = F.map((x, i) => ({ h: 'Home', n: String(i + 1), c: x.c, bar: 'Estancias del Pilar', es: 'Entregado', dee: iso(x.d), fex: iso(x.d), $: x.$, co: x.co, tel: '549114000000' + i, he: '19:00' }));
const CATERING = { h: 'Catering', fx: iso(dia(1, 10)), $: 500000, co: 300000, c: 'Evento Prueba' };
const COMBOS = { ok: true, totales: { unidades: 5, facturacion: 364500, pedidos: 4 }, recientes: [], descartadas: {},
  combos: [{ nombre: 'Freezer Lleno', unidades: 2, pedidos: 2, facturacion: 169800, ticket: 84900 },
           { nombre: 'Combo Mundialista', unidades: 2, pedidos: 1, facturacion: 139800, ticket: 69900 },
           { nombre: 'Combo Mundialista', unidades: 1, pedidos: 1, facturacion: 54900, ticket: 54900 }] };

const EXTRA = `
  (function(){
    try{ ['maleu_cmp_modo','maleu_v_per','maleu_tab'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
      var txt=(a==='combosEval')?${JSON.stringify(JSON.stringify(COMBOS))}:'{"ok":false,"error":"stub"}';
      return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); },80); });
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Ventas despues de /mejora · ' + ANCHO + 'px · ' + APP + ' ==');
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && typeof rTendencia==='function' && typeof rComparar==='function'`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await pausa(800);
    await evaluar(cli, `window.D={stock:[],pedidos:${JSON.stringify(PED)},ventasExtra:[${JSON.stringify(CATERING)}]}; window.M6=null; VD=${JSON.stringify(VD)}; go('ventas'); 1`);
    await pausa(300);

    // ════ TENDENCIA ════
    const tend = (dow, metric) => evaluar(cli, `(function(){
      vSwitchTab('tendencia');
      document.getElementById('vtSubcanal').selectedIndex=0; document.getElementById('vtDow').value=${JSON.stringify(dow)};
      document.getElementById('vtMetric').value=${JSON.stringify(metric)}; document.getElementById('vtWindow').value='0'; rTendencia();
      var rs=[].map.call(document.querySelectorAll('#vtTable .row'),function(r){return [].map.call(r.children,function(c){return c.textContent.trim();});});
      return {h:rs[0]||[], f:rs.slice(1), corte:!!document.querySelector('#vtTable .row:nth-child(2) .vt-corte')};
    })()`);
    let t = await tend('month', 'ticket');
    chk('Tendencia · con Ticket elegido, la columna dice Ticket (decia Facturado)', t.h[2] === 'Ticket', t.h);
    chk('   y muestra el ticket del mes, no el facturado', (t.f[0] || [])[2] === plata(150000) && (t.f[1] || [])[2] === plata(200000), t.f);
    t = await tend('month', 'mb');
    chk('Tendencia · con Margen elegido, la columna es el margen', t.h[2] === 'Margen' && (t.f[0] || [])[2] === plata(50000), [t.h, t.f[0]]);
    t = await tend('month', 'fact');
    chk('Tendencia · con Facturación la tabla no cambia', t.h[2] === 'Facturado' && (t.f[1] || [])[2] === plata(400000), [t.h, t.f[1]]);
    if (ULT_DIA || H.getDate() < 3) console.log('  --   hoy es dia ' + H.getDate() + ': el corte del mes en curso no se puede probar hoy');
    else {
      const prevP = 100000 + (H.getDate() >= 20 ? 300000 : 0), pct = Math.round((150000 - prevP) / prevP * 100);
      const esp = (pct >= 0 ? '+' : '') + pct + '%';
      chk('Tendencia · el mes en curso se compara contra el anterior AL DIA ' + H.getDate() + ' (' + esp + ')',
        t.corte === true && String((t.f[0] || [])[3]).indexOf(esp) >= 0 && /al día/.test((t.f[0] || [])[3]), t.f[0]);
    }
    t = await tend('week', 'fact');
    chk('Tendencia · la semana se nombra por sus fechas, sin numero ISO',
      t.f.length > 0 && t.f.every(r => /^\d\d\/\d\d al \d\d\/\d\d$/.test(r[0])), t.f.map(r => r[0]));

    // ════ COMPARAR ════
    const cmp = modo => evaluar(cli, `(function(){
      CMP={modo:${JSON.stringify(modo)},a:null,b:null}; vSwitchTab('ventas'); vSwitchTab('comparar'); rComparar();
      var b=document.getElementById('vComparar');
      return { fact:(b.querySelector('.cmp-k .cmp-kv')||{}).textContent||'', nota:!!document.getElementById('cmpNotaCat'),
        chips:[].map.call(b.querySelectorAll('.rt-per .rt-chip'),function(x){return x.textContent.trim();}),
        canales:[].map.call(b.querySelectorAll('.cmp-c'),function(x){return (x.querySelector('.cmp-c-n')||{}).textContent+'='+(x.querySelector('.cmp-c-f')||{}).textContent;}),
        ejes:[].map.call(b.querySelectorAll('svg text'),function(x){return x.textContent.trim();}), modo:CMP.modo };
    })()`);
    let c = await cmp('mesAnt');
    chk('Comparar · el Facturado del mes pasado es retail + catering ($900.000)', c.fact === plata(900000), c.fact);
    chk('   lo dice, y el catering tiene su renglon', c.nota === true && c.canales.some(x => /Catering=\$500\.000/.test(x)), c.canales);
    chk('Comparar · sin ventas de hace un año no ofrece "Contra el año pasado"', c.chips.length === 5 && c.chips.indexOf('Contra el año pasado') < 0, c.chips);
    c = await cmp('anio');
    chk('   y si habia quedado elegido, cae en "Este mes"', c.modo === 'mes', c.modo);
    chk('Comparar · el grafico rotula las semanas por fecha, sin "S42"', c.ejes.length > 0 && !c.ejes.some(x => /^S\d+$/.test(x)) && c.ejes.some(x => /^al \d+\/\d+$/.test(x)), c.ejes.slice(-6));
    const viejo = Object.assign({}, PED[0], { n: '99', c: 'Casa Vieja', dee: iso(dia(13, 5)), fex: iso(dia(13, 5)) });
    await evaluar(cli, `D.pedidos.push(${JSON.stringify(viejo)});1`);
    c = await cmp('mes');
    chk('   con una venta de hace 13 meses, el boton aparece', c.chips.indexOf('Contra el año pasado') >= 0, c.chips);

    // ════ COMBOS ════
    chk('Combos · ya no es una sub-tab', await evaluar(cli, `!document.querySelector('#p-ventas .v-tab[data-vt="combos"]') && document.querySelectorAll('#p-ventas .v-tab').length===6`));
    await evaluar(cli, `vSwitchTab('productos');1`);
    const hay = await esperar(cli, `document.querySelectorAll('#combosRank tbody tr').length>0`, 15000);
    chk('Combos · se ve adentro de POR PRODUCTO', hay && await evaluar(cli, `(function(){var c=document.getElementById('vCombos');return c.parentNode.id==='vProductos' && c.getBoundingClientRect().height>0;})()`));
    const rk = await evaluar(cli, `[].map.call(document.querySelectorAll('#combosRank tbody tr'),function(r){return [].slice.call(r.children,0,4).map(function(c){return c.textContent.trim();});})`);
    chk('Combos · un combo que cambio de precio es UNA fila (Mundialista: 3 u, $194.700)',
      rk.length === 2 && rk[0][0] === 'Combo Mundialista' && rk[0][1] === '3' && rk[0][3] === plata(194700), rk);
    chk('   el nombre viejo de la sub-tab sigue entrando (cae en POR PRODUCTO)', await evaluar(cli, `(function(){vSwitchTab('ventas');vSwitchTab('combos');return vTab==='productos' && document.getElementById('vProductos').style.display!=='none';})()`));

    // ════ POR PRODUCTO: el canal y los filtros ════
    await evaluar(cli, `vSwitchTab('productos');1`);
    chk('Por Producto · el canal se llama "Otras zonas", no "Pilar"', await evaluar(cli, `!!document.querySelector('.prod-canal-chip[data-c="Otras zonas"]') && !document.querySelector('.prod-canal-chip[data-c="Pilar"]')`));
    const tb = () => evaluar(cli, `(function(){var t=document.getElementById('prodToolbar'),b=document.getElementById('prodTbBtn');if(!t||!b)return null;
      var g=t.querySelector('.prod-tb-group');return {btn:b.getBoundingClientRect().height>0, grupos:g.getBoundingClientRect().height>0};})()`);
    let f = await tb();
    if (ANCHO <= 700) {
      chk('Por Producto · en el celular los filtros arrancan plegados detras de un boton', !!f && f.btn === true && f.grupos === false, f);
      await evaluar(cli, `prodFiltrosToggle();1`); f = await tb();
      chk('   y el boton los abre', !!f && f.grupos === true, f);
      await evaluar(cli, `prodFiltrosToggle();1`);
    } else {
      chk('Por Producto · en la compu los filtros estan a la vista y no hay boton', !!f && f.btn === false && f.grupos === true, f);
    }
    chk('Por Producto · el ranking tiene "Copiar para Excel"', await evaluar(cli, `!!document.getElementById('prodCopiarBtn') && typeof prodCopiarExcel==='function'`));

    // ════ LA FICHA DEL PRODUCTO ════
    chk('Ficha · sin "Sell-through" (comparaba lo vendido contra lo comprado en el periodo)', await evaluar(cli, `document.documentElement.innerHTML.indexOf("st('Sell-through'")<0`));

    chk('sin errores de JS', await evaluar(cli, `(window.__err||[]).filter(function(e){return !/stub|Failed to fetch|NetworkError/i.test(e);}).length===0`), await evaluar(cli, `window.__err`));
    console.log('\n' + ok + ' ok · ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('FALLO', e && e.message); salir(1); }
})();
