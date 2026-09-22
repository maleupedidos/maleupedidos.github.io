/* Catering › el cotizador (22/9/2026).

   node probar_cotizador.js [390|1440]

   Backend STUBBEADO con datos inventados (repo publico). No hace falta token.

   Lo que se mide es LA CUENTA, que vive una sola vez en el front y es la misma
   que viaja a la base. La referencia de la reunion del 21/9: 35 personas premium
   = $805.000. Con los parametros por defecto los insumos dan $288.700, asi que
   el margen ANTES de sueldos es $516.300 (64%).

   Y lo que mas importa: LOS SUELDOS VAN SEPARADOS DEL MARGEN DE MALEU. Con la
   tarifa por hora en cero (como esta hoy) la pantalla tiene que AVISAR que el
   margen es de antes de pagarlos; con tarifa cargada, tiene que mostrar los dos
   numeros distintos. Un cotizador que dice 64% cuando en realidad deja 42% es
   peor que no tener cotizador. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 900) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(cli, expr) === true) return true; await pausa(250); } return false; };
const txt = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent.replace(/\\s+/g,' ').trim():null;})()`;

/* Los eventos inventados. `created_at` decide el contador de la semana: hoy es
   el martes 22/9, asi que la semana arranca el lunes 21. */
const EVENTOS = [
  { id: 'aaaaaaaa-1111-4222-8333-444455556666', event_code: 'COT-260925-ABCD', status: 'quoted', client_name: 'Laurita Prueba', event_name: 'Cumple 35', event_date: '2026-09-25', guests_expected: 35, revenue_budget: 805000, cost_budget: 288700, revenue_actual: 0, cost_actual: 0, cash_received: 0, created_at: '2026-09-21T14:00:00Z' },
  { id: 'bbbbbbbb-1111-4222-8333-444455556666', event_code: 'COT-261010-EFGH', status: 'lead', client_name: 'Otro Prueba', event_name: 'Casamiento', event_date: '2026-10-10', guests_expected: 80, revenue_budget: 1840000, cost_budget: 700000, revenue_actual: 0, cost_actual: 0, cash_received: 0, created_at: '2026-09-22T09:00:00Z' },
  { id: 'cccccccc-1111-4222-8333-444455556666', event_code: 'COT-260801-IJKL', status: 'completed', client_name: 'Viejo Prueba', event_name: 'Evento de agosto', event_date: '2026-08-01', guests_expected: 20, revenue_budget: 400000, cost_budget: 200000, revenue_actual: 420000, cost_actual: 210000, cash_received: 420000, created_at: '2026-08-01T10:00:00Z' }
];
/* Los parametros por defecto del backend (Config_Maleu vacia). */
const COTIZ_DEF = { PRECIO_CLASICO: 20000, PRECIO_PREMIUM: 23000, PIZZAS_POR_PERSONA: 0.6, PIZZAS_RESERVA: 3,
  COSTO_PIZZA: 3500, COSTO_TOPPINGS: 1800, COSTO_QUESOS: 1200, COSTO_JAMON: 900, COSTO_VERDULERIA: 600,
  COSTO_CARBON: 25000, COSTO_ACEITE: 12000, COSTO_NAFTA: 30000, TARIFA_HORA: 0, HORAS_EVENTO: 6, EQUIPO_PERSONAS: 2,
  EXTRA_BEBIDAS: 2500, EXTRA_BEBIDAS_COSTO: 1200, EXTRA_PICADA: 3500, EXTRA_PICADA_COSTO: 1800, EXTRA_POSTRE: 2800, EXTRA_POSTRE_COSTO: 1300, deHoja: 0 };

function escena(cotiz) {
  const RELOJ = `(function(){var AH=new Date(2026,8,22,15,0,0).getTime();var _D=Date;
    function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
    FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
  const STUB = `
    window.__posts=[];
    if(window.top===window){ try{ localStorage.setItem('maleu_tab','catering');
      Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0) localStorage.removeItem(k); }); }catch(e){} }
    (function(){ var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')>-1){
        if(x&&String(x.method||'').toUpperCase()==='POST'){
          var b={}; try{ b=JSON.parse(x.body); }catch(e){}
          window.__posts.push(b);
          return Promise.resolve(new Response(JSON.stringify({ok:true,id:'dddddddd-1111-4222-8333-444455556666',eventCode:'COT-261212-WXYZ',lineas:(b.lines||[]).length}),{status:200,headers:{'Content-Type':'application/json'}}));
        }
        var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?';
        var cuerpo={ok:false,err:'stub'};
        if(a==='catering') cuerpo={ok:true,events:${JSON.stringify(EVENTOS)},cotiz:${JSON.stringify(cotiz)}};
        else if(a==='cateringDetail') cuerpo={ok:true,event:${JSON.stringify(EVENTOS[0])},menu:[],lines:[],payments:[],crew:[],tasks:[]};
        else if(a==='pedidosLight') cuerpo={ts:1,pedidos:[],canales:[],light:true,saludSem:{},saludMes:{},ventasExtra:[]};
        else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
        else if(a==='admin') cuerpo={ok:false,forbidden:true};
        var t=JSON.stringify(cuerpo);
        return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},120);});
      }
      return o.apply(this,arguments); }; })();`;
  /* El fetch del PREP contesta todo POST con {ok:true} y se comeria el cuerpo:
     por eso el STUB va DESPUES y lo envuelve. */
  return RELOJ + prep('x') + STUB;
}

/* Pone un valor en un campo y dispara el evento que el ERP escucha. Poner
   `.value` a mano NO dispara `oninput`: la cuenta no se recalcularia y la
   prueba mediria la pantalla anterior. */
const poner = (id, v) => `(function(){var e=document.getElementById(${JSON.stringify(id)});if(!e)return 'no existe '+${JSON.stringify(id)};e.value=${JSON.stringify(String(v))};e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true;})()`;
const tildar = (id, v) => `(function(){var e=document.getElementById(${JSON.stringify(id)});if(!e)return 'no existe '+${JSON.stringify(id)};e.checked=${v ? 'true' : 'false'};e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`;
const calc = 'JSON.stringify(_catCotizCalc(_catCotizLeer()))';

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  let script = null;
  async function abrirEscena(cotiz) {
    if (script) await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
    script = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: escena(cotiz) })).identifier;
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?tab=catering&t=' + Date.now() });
    if (!await esperar(cli, `typeof go==='function' && typeof rCatering==='function'`, 90000)) throw new Error('el ERP no cargó');
    await ev(cli, `go('catering')`);
    if (!await esperar(cli, `!!document.querySelector('#catApp .cat-event')`, 30000)) throw new Error('no se dibujó la lista de Catering');
    await pausa(300);
  }
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Catering › el cotizador · ' + ANCHO + 'px ==');

    /* ── 1. La tab, antes de cotizar ─────────────────────────────── */
    console.log('\n-- la tab de Catering --');
    await abrirEscena(COTIZ_DEF);
    const kpis = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#catApp .cat-kpi'),function(k){return k.textContent.replace(/\\s+/g,' ').trim();}))`);
    const K = JSON.parse(typeof kpis === 'string' ? kpis : '[]');
    chk('cuenta las cotizaciones de ESTA semana: 2 (la del lunes 21 y la de hoy), no la de agosto',
      K.some(x => /^2\s*Cotizaciones esta semana/.test(x)), K);
    chk('el botón para cotizar está en la cabecera', await ev(cli, `!!document.querySelector('#catApp .cat-acc button')`) === true);

    /* ── 2. La cuenta de la reunión ──────────────────────────────── */
    console.log('\n-- la referencia de la reunión: 35 personas premium --');
    await ev(cli, `catCotizar()`);
    chk('se abre el cotizador', await esperar(cli, `!!document.getElementById('cotResumen') && !!document.getElementById('cotPersonas')`, 10000) === true);
    let c = JSON.parse(await ev(cli, calc));
    chk('arranca en 35 personas y plan premium', c.personas === 35 && c.premium === true, { n: c.personas, p: c.premium });
    chk('venta $805.000, que es exactamente lo que dijo Tadeo en la mesa', c.vT === 805000, c.vT);
    chk('24 pizzas: 35 × 0,6 = 21, redondeado para arriba, más 3 de reserva', c.pizzas === 24, c.pizzas);
    chk('insumos $288.700', c.cT === 288700, { cT: c.cT, lineas: c.costo.map(l => l.d + ' ' + l.t) });
    chk('sin tarifa por hora cargada, los sueldos son $0', c.sT === 0, c.sT);
    chk('margen antes de sueldos $516.300 (64%)', c.antes === 516300 && Math.round(c.antesPct) === 64, { a: c.antes, p: c.antesPct });
    chk('$23.000 por persona', c.porPersona === 23000, c.porPersona);

    const R = await ev(cli, txt('#cotResumen'));
    chk('la pantalla muestra los mismos números que la cuenta', /\$805\.000/.test(R || '') && /\$288\.700/.test(R || '') && /\$516\.300/.test(R || ''), R);
    chk('AVISA que el margen es de antes de pagar sueldos, porque falta la tarifa',
      /tarifa por hora no está cargada/i.test(R || '') && /antes de pagar sueldos/i.test(R || '') && /CATERING_TARIFA_HORA/.test(R || ''), R);
    chk('los sueldos tienen su propio bloque, separados de los insumos', await ev(cli, `!!document.querySelector('#cotResumen .cot-bloque.sueldos')`) === true);
    chk('dice las pizzas y el precio por persona', /24 pizzas/.test(R || '') && /\$23\.000 por persona/.test(R || ''), R);

    /* ── 3. El plan clásico ──────────────────────────────────────── */
    console.log('\n-- el plan clásico --');
    await ev(cli, poner('cotPlan', 'clasico')); await pausa(150);
    c = JSON.parse(await ev(cli, calc));
    chk('clásico: 35 × $20.000 = $700.000', c.vT === 700000, c.vT);
    chk('y sin jamón crudo, que es lo que separa premium de clásico', !c.costo.some(l => /Jamón/.test(l.d)) && c.cT === 288700 - 31500, { cT: c.cT });
    await ev(cli, poner('cotPlan', 'premium')); await pausa(150);

    /* ── 4. Los extras suman a los dos lados ─────────────────────── */
    console.log('\n-- los extras --');
    await ev(cli, tildar('cot_bebidas', true)); await pausa(150);
    c = JSON.parse(await ev(cli, calc));
    chk('las bebidas suman $87.500 a la venta (35 × $2.500)', c.vT === 805000 + 87500, c.vT);
    chk('y su costo también entra: $42.000 (35 × $1.200)', c.cT === 288700 + 42000, c.cT);
    chk('un extra sube el precio por persona', c.porPersona === 25500, c.porPersona);
    await ev(cli, tildar('cot_bebidas', false)); await pausa(150);

    /* ── 5. Los sueldos, con tarifa cargada ──────────────────────── */
    console.log('\n-- los sueldos, cuando la tarifa existe --');
    await abrirEscena(Object.assign({}, COTIZ_DEF, { TARIFA_HORA: 9500, deHoja: 1 }));
    await ev(cli, `catCotizar()`);
    await esperar(cli, `!!document.getElementById('cotResumen')`, 10000); await pausa(300);
    c = JSON.parse(await ev(cli, calc));
    chk('2 personas × 6 horas × $9.500 = $114.000 de sueldos', c.sT === 114000 && c.horas === 12, { s: c.sT, h: c.horas });
    chk('el margen de Maleu baja a $402.300 (50%), que es la referencia de la reunión',
      c.margen === 402300 && Math.round(c.margenPct) === 50, { m: c.margen, p: c.margenPct });
    chk('y el de antes de sueldos sigue siendo otro número ($516.300, 64%)', c.antes === 516300 && Math.round(c.antesPct) === 64, c.antes);
    const R2 = await ev(cli, txt('#cotResumen'));
    chk('la pantalla muestra LOS DOS: "Margen antes de sueldos" y "Margen de Maleu"',
      /Margen antes de sueldos/.test(R2 || '') && /Margen de Maleu/.test(R2 || '') && /\$402\.300/.test(R2 || '') && /\$516\.300/.test(R2 || ''), R2);
    chk('ya no avisa por la tarifa, porque está cargada', !/tarifa por hora no está cargada/i.test(R2 || ''), R2);
    chk('los sueldos se ven como 12 horas × $9.500', /12 hora × \$9\.500/.test(R2 || ''), R2);

    /* ── 6. Que la cuenta use los parámetros de la planilla ──────── */
    console.log('\n-- los parámetros salen de Config_Maleu, no del código --');
    await abrirEscena(Object.assign({}, COTIZ_DEF, { PRECIO_PREMIUM: 25000, PIZZAS_POR_PERSONA: 1, PIZZAS_RESERVA: 0, deHoja: 3 }));
    await ev(cli, `catCotizar()`);
    await esperar(cli, `!!document.getElementById('cotResumen')`, 10000); await pausa(300);
    c = JSON.parse(await ev(cli, calc));
    chk('con el premium a $25.000, la venta es $875.000', c.vT === 875000, c.vT);
    chk('con una pizza por persona y sin reserva, son 35 pizzas', c.pizzas === 35, c.pizzas);
    chk('el selector muestra el precio nuevo', /\$25\.000 por persona/.test(await ev(cli, txt('#cotPlan')) || ''), await ev(cli, txt('#cotPlan')));

    /* ── 7. Guardar ──────────────────────────────────────────────── */
    console.log('\n-- guardar la cotización --');
    await abrirEscena(Object.assign({}, COTIZ_DEF, { TARIFA_HORA: 9500 }));
    await ev(cli, `catCotizar()`);
    await esperar(cli, `!!document.getElementById('cotGuardar')`, 10000); await pausa(200);

    await ev(cli, `document.getElementById('cotGuardar').click()`); await pausa(400);
    chk('sin cliente no guarda, y lo dice', await ev(cli, `(window.__posts||[]).length===0`) === true && /Falta el nombre del cliente/.test(await ev(cli, txt('#toast')) || ''), await ev(cli, txt('#toast')));

    await ev(cli, poner('cotCliente', 'Laurita Prueba'));
    await ev(cli, `document.getElementById('cotGuardar').click()`); await pausa(400);
    chk('sin fecha tampoco', await ev(cli, `(window.__posts||[]).length===0`) === true && /dd\/mm\/aaaa/.test(await ev(cli, txt('#toast')) || ''), await ev(cli, txt('#toast')));

    await ev(cli, poner('cotFecha', '25/9/2026'));
    chk('una fecha mal tipeada no pasa', await ev(cli, `_catCotizFecha('31/13/2026')`) === '' && await ev(cli, `_catCotizFecha('25-09-2026')`) === '');
    chk('dd/mm/aaaa se traduce a lo que entiende la base', await ev(cli, `_catCotizFecha('25/9/2026')`) === '2026-09-25');

    await ev(cli, poner('cotTel', '11 5555-0001'));
    await ev(cli, poner('cotNombre', 'Cumpleaños de 35'));
    await ev(cli, poner('cotLugar', 'Los Robles'));
    await ev(cli, `document.getElementById('cotGuardar').click()`);
    chk('con cliente y fecha, sale el POST', await esperar(cli, `(window.__posts||[]).length===1`, 10000) === true);
    const P = JSON.parse(await ev(cli, `JSON.stringify((window.__posts||[])[0]||{})`));
    chk('va a cateringCotizar, no a cateringSave (no crea un pedido)', P.action === 'cateringCotizar', P.action);
    chk('el evento nace COTIZADO, con la fecha en formato de la base', P.record && P.record.status === 'quoted' && P.record.event_date === '2026-09-25', P.record);
    chk('lleva el cliente, el teléfono, el lugar y los 35 invitados',
      P.record.client_name === 'Laurita Prueba' && P.record.client_phone === '11 5555-0001' && P.record.venue_name === 'Los Robles' && P.record.guests_expected === 35, P.record);
    chk('manda un clientOpId, así tocar Guardar dos veces no deja dos cotizaciones', typeof P.clientOpId === 'string' && P.clientOpId.length > 8, P.clientOpId);
    const LN = P.lines || [];
    chk('todas las líneas son de presupuesto', LN.length > 5 && LN.every(l => l.stage === 'budget'), LN.length);
    chk('la línea de venta dice 35 personas × $23.000 = $805.000',
      LN.some(l => l.line_kind === 'revenue' && l.quantity === 35 && l.unit_amount === 23000 && l.total_amount === 805000), LN.filter(l => l.line_kind === 'revenue'));
    chk('los sueldos van como categoría labor, $114.000',
      LN.some(l => l.category === 'labor' && l.total_amount === 114000 && l.unit === 'hora'), LN.filter(l => l.category === 'labor'));
    chk('las pizzas, el carbón, el aceite y la nafta están cada uno en su línea',
      ['Pizzas', 'Carbón', 'Aceite', 'Nafta'].every(d => LN.some(l => l.description.indexOf(d) === 0)), LN.map(l => l.description));
    chk('lo que manda el POST suma lo mismo que muestra la pantalla',
      LN.filter(l => l.line_kind === 'revenue').reduce((a, l) => a + l.total_amount, 0) === 805000 &&
      LN.filter(l => l.line_kind === 'cost').reduce((a, l) => a + l.total_amount, 0) === 288700 + 114000,
      LN.map(l => l.line_kind + ':' + l.total_amount));
    chk('después de guardar avisa con el código del evento', /Cotización guardada: COT-261212-WXYZ/.test(await ev(cli, txt('#toast')) || ''), await ev(cli, txt('#toast')));

    /* ── 8. Sin errores en consola ───────────────────────────────── */
    console.log('\n-- la consola --');
    const errs = JSON.parse(await ev(cli, `JSON.stringify(window.__err||['SIN __err'])`));
    chk('ni un error en consola', Array.isArray(errs) && errs.length === 0, errs);

    console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.log('\n  EXPLOTÓ: ' + (e && e.message || e) + '\n');
    salir(1);
  }
})();
