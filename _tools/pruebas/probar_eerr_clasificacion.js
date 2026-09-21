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
  ['la luz de otra categoria sigue en servicios',       'Otro', 'Luz Edenor', '',             'estructura', 'servicios'],

  // ── Lo que se corrigio antes el 21/9 ──
  ['Imprenta/Diseño ya no cae en "otros": folletos',    'Imprenta/Diseño', '100 Folletos Flyer', '', 'variable', 'campanas'],
  ['Imprenta/Diseño: stickers impresos',                'Imprenta/Diseño', 'Imprenta · 30 planchas de Stickers', '', 'variable', 'campanas'],
  ['el manual de marca es extraordinario',              'Marketing', 'Diseñadora - Manual de Marca', '', 'extra', 'extra'],
  ['el diseño de una pieza es extraordinario',          'Marketing', 'Diseñadora · Diseño Folletos', '', 'extra', 'extra'],
  ['"Saque $X" es ajuste de caja, no gasto',            'Otro', 'Saque $20 pesos', '',       'fuera', 'ajuste'],
  ['un gasto ficticio para acomodar la caja: fuera',    'Otro', 'Gasto ficticio para acomodar caja', '', 'fuera', 'ajuste'],

  // ── Lo que NO se tenia que mover ──
  ['la IMPRESION de marketing sigue en campañas',       'Marketing', 'Imprenta · Stickers Maleu', '', 'variable', 'campanas'],
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
    chk('el pago anual queda aparte, en otras herramientas', bloques && bloques.software === 48000, bloques);
    chk('los planes cuentan en los fijos (estructura = planes + otras, sin ajustes)',
      bloques && bloques.estr === 228000 && bloques.otros === 0, bloques);
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
    chk('el pago anual se dibuja aparte, en "Otras herramientas"', dib && dib.otras.indexOf('-$48.000') >= 0, dib);
    chk('sin luz ni agua no aparece un renglon de Servicios en $0', dib && dib.servicios === false, dib);
    chk('ya no quedan los renglones viejos (Comerciales, Apps/Herramientas/IA)', dib && !dib.comerciales && !dib.apps, dib);

    /* ── Y lo financiero ("A dónde fue la plata") ──
       Tiene su propia clasificacion. Hasta el 21/9/2026 mandaba Movistar a
       Servicios y el resto a Software: los planes quedaban partidos en dos. */
    const fin = await evaluar(cli, `(function(){
      var div = document.createElement('div'); rEERR_financiero(div);
      var t = div.textContent.split(String.fromCharCode(160)).join(' ');
      function tras(lbl){ var i = t.indexOf(lbl); return i < 0 ? '' : t.slice(i + lbl.length, i + lbl.length + 30); }
      return { planes: tras('Planes mensuales'), otras: tras('Otras herramientas') };
    })()`);
    chk('lo financiero junta los planes: $180k', fin && fin.planes.indexOf('$180k') >= 0, fin);
    chk('y el pago anual aparte: $48k', fin && fin.otras.indexOf('$48k') >= 0, fin);

    const err = await evaluar(cli, 'JSON.stringify((window.__err||[]).slice(0,5))');
    chk('sin errores de consola', err === '[]', err);
    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  } finally { try { cli.matar(); } catch (e) {} }
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(1); });
