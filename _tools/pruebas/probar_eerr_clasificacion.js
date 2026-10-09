/* EERR: en que renglon cae cada gasto (21/9/2026).

   Tadeo escaneo el EERR y encontro renglones mal. Se reviso la regla contra los
   316 asientos reales de Egresos y cambiaron 13 ($973.929). Ese mismo dia, mas
   tarde, pidio que TODOS los planes mensuales vayan juntos en un solo renglon
   (`planes`): cambiaron otros 40 ($2.420.779), con el total del año igual. Este
   test fija cada caso con un concepto como el que esta cargado en la planilla
   —sin nombres de personas: este repo es publico—.

   Lo que MAS importa probar es lo que NO se tiene que mover: la regla es una
   cadena de `if` con palabras clave, y agregar una arriba puede robarle asientos
   a otra de abajo sin que nadie lo note. Por eso la mitad de los casos son
   gastos que ya estaban bien y tienen que seguir igual.

   Sin backend, con ?prueba=1. Llama a la `_gastoLinea` REAL del ERP.

   node probar_eerr_clasificacion.js
*/
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 260) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (c, e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluar(c, e)) return true; } catch (x) {} await pausa(300); } return false; };

/* [nombre del caso, categoria, concepto, notas, tipo esperado, linea esperada] */
const CASOS = [
  // ── Todos los PLANES MENSUALES juntos (21/9/2026) ──
  ['la suscripcion mensual de WATI es un plan',         'Herramienta', 'WATI · Mensual', '',  'estructura', 'planes'],
  ['"WATI" a secas es la suscripcion: plan',            'Herramienta', 'WATI', '',            'estructura', 'planes'],
  ['Claude es un plan',                                 'Herramienta', 'Claude · Mensual', '', 'estructura', 'planes'],
  ['"Claude AI", como se cargaba en marzo, tambien',    'Herramienta', 'Claude AI', '',       'estructura', 'planes'],
  ['Chat GPT Pro es un plan',                           'Herramienta', 'Chat GPT Pro', '',    'estructura', 'planes'],
  ['Movistar deja Servicios: es un plan',               'Herramienta', 'Movistar · Mensual', '', 'estructura', 'planes'],
  ['Movistar sin "mensual" tambien',                    'Herramienta', 'Movistar', '',        'estructura', 'planes'],
  ['Supabase es un plan',                               'Herramienta', 'Supabase · Mensual', '', 'estructura', 'planes'],
  ['la extension de WhatsApp es un plan',               'Herramienta', 'Extensión WA Bulk Sender', '', 'estructura', 'planes'],
  ['N8N es un plan',                                    'Herramienta', 'N8N', '',             'estructura', 'planes'],
  ['Canva con "diseño" es un plan, NO extraordinario',  'Herramienta', 'Canva', 'diseño de posteos', 'estructura', 'planes'],
  ['cualquier "X · Mensual" nuevo es un plan',          'Herramienta', 'Lovable · Mensual', '', 'estructura', 'planes'],

  // ── Lo que NO es un plan ──
  ['los "Créditos" sueltos son de WATI: campañas',      'Herramienta', 'Créditos', '',        'variable', 'campanas'],
  ['"Créditos · Campañas" tambien',                     'Herramienta', 'Créditos', 'Campañas', 'variable', 'campanas'],
  ['los creditos de Openrouter NO son de WATI',         'Herramienta', 'Openrouter · Créditos', '', 'estructura', 'software'],
  ['un pago anual no es un plan mensual',               'Herramienta', 'Microsoft · Anual', '', 'estructura', 'software'],
  ['los CREDITOS de WATI siguen variables',             'Herramienta', 'WATI · Créditos', '', 'variable', 'campanas'],
  ['una recarga de WATI es credito: variable',          'Herramienta', 'WATI · Recarga', '',  'variable', 'campanas'],
  ['lo cargado en DolarApp es pauta de Meta: campañas', 'Herramienta', 'DolarApp · Créditos', '', 'variable', 'campanas'],
  ['"Dolar App" separado y en otra categoria tambien',  'Otro', 'Dolar App · Recarga', '',    'variable', 'campanas'],
  ['un plan pagado DESDE DolarApp sigue siendo un plan', 'Herramienta', 'Claude · Mensual', 'pagado con DolarApp', 'estructura', 'planes'],
  ['una muestra para probar es extraordinaria, aunque sea Proveedor', 'Proveedor', 'Muestra de productos - Tartas', '', 'extra', 'extra'],
  ['la seña de una muestra tambien',                   'Proveedor', 'Muestra de productos - Seña', 'proveedor nuevo', 'extra', 'extra'],
  ['la luz de otra categoria sigue en servicios',       'Otro', 'Luz Edenor', '',             'estructura', 'servicios'],

  // ── Lo que se corrigio antes el 21/9 ──
  ['Imprenta/Diseño ya no cae en "otros": folletos',    'Imprenta/Diseño', '100 Folletos Flyer', '', 'variable', 'campanas'],
  ['Imprenta/Diseño: folletos siguen en campañas',      'Imprenta/Diseño', 'Imprenta · 200 Folletos', '', 'variable', 'campanas'],

  // ── Los STICKERS son packaging (8/10/2026) ──
  // Ya se cobran por pedido en COSTO_PACKAGING_PEDIDO ($850 = bolsa + sticker).
  ['stickers en la NOTA, Imprenta (Egresos 208, jul)',  'Imprenta/Diseño', 'Imprenta', '30 planchas de Stickers', 'variable', 'bolsas'],
  ['stickers en el CONCEPTO, Marketing (Egresos 90-91)','Marketing', 'Imprenta — Stickers Maleu', '', 'variable', 'bolsas'],
  ['"Sticker" en singular y otra categoria tambien',    'Otro', 'Sticker logo', '',           'variable', 'bolsas'],
  ['una muestra de stickers sigue extraordinaria',      'Marketing', 'Muestra de stickers', '', 'extra', 'extra'],
  ['un proveedor de stickers sigue siendo costo',       'Proveedor', 'Stickers', '',          'cmv', 'proveedor'],
  ['imanes y folletos (sin sticker) siguen en campañas','Marketing', 'Imprenta', 'Folletos, Sobres, Imanes', 'variable', 'campanas'],
  ['las bolsas siguen en bolsas',                       'Bolsas', 'Papelera', 'Bolsas y biromes', 'variable', 'bolsas'],
  ['el manual de marca es extraordinario',              'Marketing', 'Diseñadora - Manual de Marca', '', 'extra', 'extra'],
  ['el diseño de una pieza es extraordinario',          'Marketing', 'Diseñadora · Diseño Folletos', '', 'extra', 'extra'],
  ['"Saque $X" es ajuste de caja, no gasto',            'Otro', 'Saque $20 pesos', '',       'fuera', 'ajuste'],
  ['un gasto ficticio para acomodar la caja: fuera',    'Otro', 'Gasto ficticio para acomodar caja', '', 'fuera', 'ajuste'],

  // ── Lo que NO se tenia que mover ──
  ['la IMPRESION de marketing sigue en campañas',       'Marketing', 'Imprenta · Volantes Maleu', '', 'variable', 'campanas'],
  ['la pauta sigue en campañas',                        'Marketing', 'Pauta Publicitaria', '', 'variable', 'campanas'],
  ['un proveedor sigue en el costo',                    'Proveedor', 'Carne', '',             'cmv', 'proveedor'],
  ['un vuelto sigue fuera',                             'Cambio cruzado', 'Cambio cruzado', '(Home #901)', 'fuera', 'vuelto'],
  ['un giro de sueldo sigue en sueldo',                 'Sueldo', 'Titular', '',              'estructura', 'sueldo'],
  ['la nafta sigue en vehiculo',                        'Nafta', 'Shell', '',                 'estructura', 'vehiculo'],
  ['una perdida sigue siendo extraordinaria',           'Otro', 'Mercadería perdida', '',     'extra', 'perdida'],
  ['el delivery sigue variable',                        'Repartidor', 'Reparto', '',          'variable', 'delivery'],
  ['el monotributo sigue en impuestos',                 'Impuesto', 'Monotributo', '',        'impuesto', 'mono'],
];

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, "typeof _gastoLinea==='function' && typeof _eerrMesGastos==='function'")) { console.log('  el ERP no arranco'); process.exit(1); }
    /* Desde el 8/10/2026 la tabla arranca plegada: aca se lee el dibujo entero. */
    await evaluar(cli, 'window.__eerrTodo=true');
    console.log('\n== EERR: en que renglon cae cada gasto ==\n');

    const res = await evaluar(cli, `(function(){
      var C = ${JSON.stringify(CASOS)};
      return C.map(function(c){ var r = _gastoLinea({cat:c[1], con:c[2], not:c[3]}); return {tipo:r.tipo, linea:r.linea}; });
    })()`);
    CASOS.forEach((c, i) => {
      const r = res[i] || {};
      chk(c[0], r.tipo === c[4] && r.linea === c[5], { esperado: c[4] + '/' + c[5], salio: r.tipo + '/' + r.linea });
    });

    /* ── Que cada renglon SUME donde tiene que sumar ──
       La regla dice el renglon, pero cada pantalla arma sus bloques a mano. Si una
       no conoce 'planes' o 'ajuste', lo manda al default o lo pierde: el gasto
       desaparece de los fijos o vuelve a aparecer por la puerta de atras. */
    const bloques = await evaluar(cli, `(function(){
      D = D || {};
      D.provisiones = []; D.config = [];
      D.gastos = [
        {mes:'Mayo', f:'10/5/2026', cat:'Otro', con:'Saque $20 pesos', not:'', $:20},
        {mes:'Mayo', f:'11/5/2026', cat:'Otro', con:'Gasto ficticio para acomodar caja', not:'', $:5000},
        {mes:'Mayo', f:'12/5/2026', cat:'Herramienta', con:'Claude · Mensual', not:'', $:150000},
        {mes:'Mayo', f:'13/5/2026', cat:'Herramienta', con:'Movistar', not:'', $:30000},
        {mes:'Mayo', f:'14/5/2026', cat:'Herramienta', con:'Microsoft · Anual', not:'', $:48000},
        {mes:'Mayo', f:'15/5/2026', cat:'Herramienta', con:'Créditos', not:'', $:75000}
      ];
      var G = _eerrMesGastos(5, 2026);
      /* Sin hoja de provisiones el EERR usa las de fabrica (sueldo y alquiler
         imputado): se descuentan para mirar solo lo que viene de Egresos. */
      return { estr: G.estr - (G.L.sueldo || 0) - (G.L.ocupacion || 0), camp: G.camp,
               planes: G.L.planes || 0, otros: G.L.otros || 0,
               software: G.L.software || 0, servicios: G.L.servicios || 0 };
    })()`);
    chk('Claude y Movistar suman JUNTOS en planes', bloques && bloques.planes === 180000 && bloques.servicios === 0, bloques);
    chk('el pago anual queda aparte, en otras herramientas, y en su mes cuenta 1/12', bloques && bloques.software === 4000, bloques);
    chk('los planes cuentan en los fijos (estructura = planes + otras, sin ajustes)',
      bloques && bloques.estr === 184000 && bloques.otros === 0, bloques);
    chk('los "Créditos" sueltos suman en campañas, no en los fijos', bloques && bloques.camp === 75000, bloques);

    /* ── Que el EERR lo DIBUJE junto ──
       _eerrMesGastos es la cuenta de los KPIs; el EERR que ve Tadeo arma sus
       renglones aparte (rEERR_dual). Si ese no conoce 'planes', los planes se
       caen del dibujo aunque los KPIs esten bien. */
    const dib = await evaluar(cli, `(function(){
      D.gastos = [
        {mes:'Mayo', f:'12/5/2026', cat:'Herramienta', con:'Claude · Mensual', not:'', $:150000},
        {mes:'Mayo', f:'13/5/2026', cat:'Herramienta', con:'Movistar', not:'', $:30000},
        {mes:'Mayo', f:'14/5/2026', cat:'Herramienta', con:'Microsoft · Anual', not:'', $:48000}
      ];
      D.ingresos = []; VD = []; eerrMes = new Date(2026, 4, 1);
      var div = document.createElement('div'); rEERR_dual(div);
      var t = div.textContent.split(String.fromCharCode(160)).join(' ');
      function tras(lbl){ var i = t.indexOf(lbl); return i < 0 ? '' : t.slice(i + lbl.length, i + lbl.length + 14); }
      return { planes: tras('Planes mensuales'), claude: tras('Claude'), movistar: tras('Movistar'),
               otras: tras('Otras herramientas'), servicios: t.indexOf('Servicios (') >= 0,
               comerciales: t.indexOf('Comerciales ·') >= 0, apps: t.indexOf('Apps/Herramientas/IA') >= 0 };
    })()`);
    chk('el EERR dibuja "Planes mensuales" con Claude + Movistar juntos', dib && dib.planes.indexOf('-$180.000') >= 0, dib);
    chk('y abajo, uno por uno: Claude y Movistar',
      dib && dib.claude.indexOf('-$150.000') >= 0 && dib.movistar.indexOf('-$30.000') >= 0, dib);
    chk('el pago anual se dibuja aparte, en "Otras herramientas", con la cuota', dib && dib.otras.indexOf('-$4.000') >= 0, dib);
    chk('sin luz ni agua no aparece un renglon de Servicios en $0', dib && dib.servicios === false, dib);
    chk('ya no quedan los renglones viejos (Comerciales, Apps/Herramientas/IA)', dib && !dib.comerciales && !dib.apps, dib);

    /* ── Y lo financiero ("A dónde fue la plata") ──
       Tiene su propia clasificacion. Hasta el 21/9/2026 mandaba Movistar a
       Servicios y el resto a Software: los planes quedaban partidos en dos. */
    const fin = await evaluar(cli, `(function(){
      var div = document.createElement('div'); rEERR_financiero(div);
      /* Solo la tabla del mes: el puente de abajo tambien nombra los planes (8/10/2026). */
      var t = div.querySelector('#eerrMesTbl').textContent.split(String.fromCharCode(160)).join(' ');
      function tras(lbl){ var i = t.indexOf(lbl); return i < 0 ? '' : t.slice(i + lbl.length, i + lbl.length + 30); }
      return { planes: tras('Planes mensuales'), otras: tras('Otras herramientas') };
    })()`);
    chk('lo financiero junta los planes: $180.000', fin && fin.planes.indexOf('-$180.000') >= 0, fin);
    chk('y el pago anual aparte, ENTERO el dia que salio: $48.000', fin && fin.otras.indexOf('-$48.000') >= 0, fin);

    /* ── Pagos anuales (6/10/2026) ──
       "Microsoft · Anual" $49.040 pagado el 21/07/2026: el economico lo reparte
       en 12 cuotas desde julio (jul-2026 a jun-2027), el financiero lo ve entero
       en julio, y el puente economico → caja explica la diferencia. */
    const an = await evaluar(cli, `(function(){
      D.gastos = [
        {mes:'Julio', f:'21/07/2026 10:00', cat:'Herramienta', con:'Microsoft · Anual', not:'', $:49040},
        {mes:'Julio', f:'22/07/2026', cat:'Herramienta', con:'Claude · Mensual', not:'', $:150000},
        {mes:'Julio', f:'23/07/2026', cat:'Herramienta', con:'Microsoft', not:'renovacion anual', $:1000},
        {mes:'Octubre', f:'05/10/2026', cat:'Nafta', con:'Shell', not:'', $:1000}
      ];
      function sw(mn, an){ return Math.round((_eerrMesGastos(mn, an).L.software || 0) * 100) / 100; }
      var cuotas = 0; for(var k = 0; k < 14; k++){ var mn = (6 + k) % 12 + 1, a = 2026 + Math.floor((6 + k) / 12); cuotas += _eerrGastosEcon(mn, a).filter(function(g){ return g.anual; }).reduce(function(s, g){ return s + g.$; }, 0); }
      eerrMes = new Date(2026, 6, 1);
      var d1 = document.createElement('div'); rEERR_dual(d1);
      var t1 = d1.textContent.split(String.fromCharCode(160)).join(' ');
      var d2 = document.createElement('div'); rEERR_financiero(d2);
      var t2 = d2.textContent.split(String.fromCharCode(160)).join(' ');
      eerrMes = new Date(2026, 9, 1);
      var d3 = document.createElement('div'); rEERR_financiero(d3);
      var t3 = d3.textContent.split(String.fromCharCode(160)).join(' ');
      function tras(t, lbl, n){ var i = t.indexOf(lbl); return i < 0 ? '' : t.slice(i + lbl.length, i + lbl.length + (n || 40)); }
      return { jun: sw(6, 2026), jul: sw(7, 2026), oct: sw(10, 2026), jun27: sw(6, 2027), jul27: _eerrGastosEcon(7, 2027).filter(function(g){ return g.anual; }).length, cuotas: Math.round(cuotas * 100) / 100,
               dual: tras(t1, 'Otras herramientas'), cuotaTxt: t1.indexOf('cuota 1 de 12') >= 0,
               finJul: tras(t2, 'Otras herramientas', 30), puenteJul: tras(t2, 'Pagos anuales por adelantado', 160),
               puenteOct: tras(t3, 'Cuotas de pagos anuales de meses anteriores', 160) };
    })()`);
    chk('julio: la cuota $4.086,67 + "Microsoft" a secas $1.000 (sin "· Anual" no se reparte)', an && an.jul === 5086.67, an);
    chk('junio (antes de pagarlo): nada', an && an.jun === 0, an);
    chk('octubre: la cuota', an && an.oct === 4086.67, an);
    chk('junio 2027: la ultima cuota; julio 2027: ninguna cuota', an && an.jun27 === 4086.67 && an.jul27 === 0, an);
    chk('las 12 cuotas suman lo pagado, ni un peso mas', an && an.cuotas === 49040, an);
    chk('el EERR economico de julio dibuja la cuota y dice que es la 1 de 12', an && an.dual.indexOf('-$5.087') >= 0 && an.cuotaTxt, an);
    chk('el financiero de julio lo ve entero ($50.040 con el de $1.000)', an && an.finJul.indexOf('-$50.040') >= 0, an);
    chk('el puente de julio resta lo pagado por adelantado ($44.953)', an && an.puenteJul.indexOf('44.953') >= 0, an);
    chk('el puente de octubre suma la cuota de julio ($4.087)', an && an.puenteOct.indexOf('4.087') >= 0, an);

    /* ── La mercaderia regalada (7/10/2026, decision de Tadeo) ──
       Un pedido Entregado con facturado $0 (la ruleta del QR) suma su costo a
       Campanas, con su renglon de detalle. La tab y los KPIs usan la MISMA
       `_eerrRegaladosMes`: se mide que las dos digan lo mismo. */
    const rg = await evaluar(cli, `(function(){
      D.gastos = [{mes:'Septiembre', f:'10/9/2026', cat:'Herramienta', con:'WATI · Créditos', not:'', $:1000}];
      D.pedidos = [
        {n:'1024', h:'Home', es:'Entregado', $:0, co:53200, mc:'2026-09', dee:'2026-09-24', c:'Cliente QR'},
        {n:'1030', h:'Home', es:'Pendiente', $:0, co:9000, mc:'2026-09', dee:'2026-09-28'}
      ];
      D.ingresos = []; VD = []; eerrMes = new Date(2026, 8, 1);
      var div = document.createElement('div'); rEERR_dual(div);
      var t = div.textContent.split(String.fromCharCode(160)).join(' ');
      function tras(lbl, n){ var i = t.indexOf(lbl); return i < 0 ? '' : t.slice(i + lbl.length, i + lbl.length + (n || 14)); }
      return { camp: tras('Campañas y mensajería'), det: tras('mercadería regalada: pedido 1024', 40),
               otro: t.indexOf('pedido 1030') >= 0, kpi: _eerrMesGastos(9, 2026).camp };
    })()`);
    chk('el EERR dibuja Campañas con el regalo: $1.000 + $53.200', rg && rg.camp.indexOf('-$54.200') >= 0, rg);
    chk('y el renglon «mercadería regalada: pedido 1024» con $53.200', rg && rg.det.indexOf('53.200') >= 0, rg);
    chk('un pedido en $0 que no se entrego no aparece', rg && rg.otro === false, rg);
    chk('la tab y los KPIs dicen lo mismo', rg && rg.kpi === 54200, rg);

    /* ── Los stickers no se cuentan dos veces (8/10/2026) ──
       Abril: Egresos 90-91 «Pilar Gráfico — Stickers Maleu» $50.000 + $40.000.
       Ya estan en el packaging imputado por pedido: Campañas no los suma, quedan
       como memo de compras de packaging, y lo financiero los ve en Packaging. */
    const st = await evaluar(cli, `(function(){
      D.pedidos = []; D.ingresos = []; VD = [];
      D.gastos = [
        {mes:'Abril', f:'17/4/2026', cat:'Marketing', con:'Pilar Gráfico — Stickers Maleu', not:'', $:50000},
        {mes:'Abril', f:'17/4/2026', cat:'Marketing', con:'Pilar Gráfico — Stickers Maleu', not:'', $:40000},
        {mes:'Abril', f:'20/4/2026', cat:'Marketing', con:'Pilar Gráfico', not:'Folletos', $:10000}
      ];
      var G = _eerrMesGastos(4, 2026);
      eerrMes = new Date(2026, 3, 1);
      var d = document.createElement('div'); rEERR_financiero(d);
      var t = d.textContent.split(String.fromCharCode(160)).join(' ');
      var i = t.indexOf('Packaging');
      return { camp: G.camp, bolsas: G.L.bolsas || 0, pack: i < 0 ? '' : t.slice(i, i + 40) };
    })()`);
    chk('abril: Campañas sólo con los folletos ($10.000), sin los $90.000 de stickers', st && st.camp === 10000, st);
    chk('los stickers quedan como memo de compras de packaging ($90.000)', st && st.bolsas === 90000, st);
    chk('lo financiero los ve en Packaging ($90.000)', st && st.pack.indexOf('-$90.000') >= 0, st);

    /* ── El respaldo de provisiones = la hoja, y avisa (8/10/2026) ── */
    const pv = await evaluar(cli, `(function(){
      D.gastos = []; D.provisiones = [];
      function suma(mn, cat){ return eerrProvisiones(mn, 2026).filter(function(p){ return p.cat === cat; }).reduce(function(s, p){ return s + Number(p.monto); }, 0); }
      eerrMes = new Date(2026, 9, 1);
      var d1 = document.createElement('div'); rEERR_dual(d1);
      D.provisiones = [{concepto:'Sueldo Tadeo', cat:'sueldo', monto:1, desde:'2026-01', hasta:null}];
      var d2 = document.createElement('div'); rEERR_dual(d2);
      D.provisiones = [];
      return { sueOct: suma(10, 'sueldo'), sueAgo: suma(8, 'sueldo'), monoJul: suma(7, 'impuesto_monotributo'),
               monoAgo: suma(8, 'impuesto_monotributo'), monoOct: suma(10, 'impuesto_monotributo'),
               avisoSin: !!d1.querySelector('#eerrProvRespaldoAviso'), avisoCon: !!d2.querySelector('#eerrProvRespaldoAviso') };
    })()`);
    chk('respaldo: sueldos de octubre $1.200.000 + $1.200.000', pv && pv.sueOct === 2400000, pv);
    chk('respaldo: agosto sólo Tadeo $1.200.000', pv && pv.sueAgo === 1200000, pv);
    chk('respaldo: monotributo $42.386,74 hasta julio y $49.527,20 desde agosto, sin pisarse',
      pv && pv.monoJul === 42386.74 && pv.monoAgo === 49527.2 && pv.monoOct === 49527.2, pv);
    chk('sin la hoja, el EERR avisa que usa el respaldo', pv && pv.avisoSin === true, pv);
    chk('con la hoja, no hay aviso', pv && pv.avisoCon === false, pv);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
