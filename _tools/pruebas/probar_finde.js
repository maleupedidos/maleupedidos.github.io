/* Planificacion › la meta del fin de semana (22/9/2026).

   node probar_finde.js [390|1440]

   Backend STUBBEADO con datos inventados (repo publico). No hace falta token.

   Fede, reunion del 21/9: "si para el viernes teniamos que tener el 40% y tenemos
   el 30%, el sabado hay que compensar". La historia inventada reparte cada fin de
   semana 40% viernes / 35% sabado / 25% domingo ($400.000 / $350.000 / $250.000 en
   4 + 5 + 5 entregas) y un miercoles de $100.000, durante 8 semanas. Objetivo del
   mes: $5.400.000.

   · LUNES 21/9 15 h (antes del fin de semana): vendido del 1 al 20 = $3.300.000,
     faltan $2.100.000 "si no se vende nada mas hasta el jueves"; el ticket de los
     ultimos 4 fines de semana es $71.429 -> 30 pedidos; uno normal trae 14 -> faltan
     16 mas; el corte: viernes 40%, sabado 75%, domingo 100%; ya hay cargado.
   · SABADO 26/9 13 h: al jueves $3.400.000 -> el finde tiene que traer $2.000.000;
     el viernes tenia que llegar a $800.000 y llego a $700.000 -> "$100.000 atras: el
     sabado hay que compensar"; hoy van $1.000.000 de $1.500.000; lo cargado de hoy y
     de mañana.
   · Con OBJETIVO_CON_CATERING: el evento confirmado del viernes (modulo nuevo)
     suma al total y al viernes. */
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

const iso = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
const dm = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
let n = 1000, cli9 = 0;
const H = o => Object.assign({ n: String(n++), h: 'Home', es: 'Entregado', de: 'Viernes', o: 'Deposito', ep: 'Cobrado', fp: 'Efectivo', co: 0, p: [{ a: 'PPM', q: 1 }], bar: 'Estancias del Pilar', tel: '11' + String(40000000 + (cli9++)) },
  o, { dee: o.dee || o.fex, mc: String(o.fex || o.dee).slice(0, 7), f: dm(o.fex || o.dee) });
/* La historia: 8 semanas (lunes 27/7 a domingo 20/9) + lo de la semana del 21 hasta `hasta`. */
function pedidos(hasta) {
  const out = [];
  const venta = (d, k, monto) => { for (let i = 0; i < k; i++) out.push(H({ c: 'Cliente ' + n, fex: iso(d), $: monto })); };
  for (let w = 0; w < 8; w++) {
    const lun = new Date(2026, 6, 27 + 7 * w);
    venta(new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 2), 1, 100000);   // miercoles
    venta(new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 4), 4, 100000);   // viernes  $400.000
    venta(new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 5), 5, 70000);    // sabado   $350.000
    venta(new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + 6), 5, 50000);    // domingo  $250.000
  }
  if (hasta >= '2026-09-23') venta(new Date(2026, 8, 23), 1, 100000);
  if (hasta >= '2026-09-25') venta(new Date(2026, 8, 25), 7, 100000);                  // viernes 25: $700.000
  if (hasta >= '2026-09-26') venta(new Date(2026, 8, 26), 3, 100000);                  // sabado 26 a las 13: $300.000
  /* Lo cargado sin entregar */
  if (hasta < '2026-09-25') out.push(H({ c: 'Precarga Viernes', es: 'Pendiente', fex: '', dee: '2026-09-25', $: 100000 }));
  if (hasta >= '2026-09-26') { out.push(H({ c: 'Pend Sab 1', es: 'Pendiente', fex: '', dee: '2026-09-26', $: 80000 }), H({ c: 'Pend Sab 2', es: 'Pendiente', fex: '', dee: '2026-09-26', $: 80000 })); }
  out.push(H({ c: 'Pend Dom', es: 'Pendiente', fex: '', dee: '2026-09-27', $: 90000 }));
  return out;
}
const plan = (diasTrans, conCat) => ({ ok: true, mes: 'Septiembre 2026', yyyy: 2026, mm: 9, diasMes: 30, diasTrans: diasTrans, conCatering: !!conCat,
  metas: { 'Total|': { canal: 'Total', barrio: '', metaFact: 5400000, metaPedidos: 0, metaTicket: 0, metaClientes: 0, metaCasas: 0, semanales: '', semanalesM: '', semanalesP: '', notas: '' } },
  objetivos: [], real: {}, acciones: [], origen: [], barriosHome: ['Estancias del Pilar'], canalesPrincipales: ['Venta Directa'] });
const CATERING = { ok: true, events: [
  { id: 'e1', status: 'confirmed', client_name: 'Cliente Evento', event_date: '2026-09-25', revenue_budget: 805000, cost_budget: 400000, revenue_actual: 0 },
  { id: 'e2', status: 'quoted', client_name: 'Solo cotizado', event_date: '2026-09-26', revenue_budget: 999000, revenue_actual: 0 } ] };

function escena(reloj, hasta, diasTrans, conCat) {
  const P = pedidos(hasta);
  const RELOJ = `(function(){var AH=new Date(${reloj.join(',')}).getTime();var _D=Date;
    function FD(){var a=[].slice.call(arguments);if(!(this instanceof FD))return new _D(AH).toString();if(a.length===0)return new _D(AH);return new (Function.prototype.bind.apply(_D,[null].concat(a)))();}
    FD.prototype=_D.prototype;FD.now=function(){return AH;};FD.UTC=_D.UTC;FD.parse=_D.parse;window.Date=FD;})();`;
  const STUB = `
    window.__gets=[]; window.__err=[];
    window.addEventListener('error',function(e){window.__err.push(String(e.message));});
    if(window.top===window){ try{ localStorage.setItem('maleu_tab','inicio');
      Object.keys(localStorage).forEach(function(k){ if(k.indexOf('maleu_plan_cache_')===0||k.indexOf('mc_')===0) localStorage.removeItem(k); }); }catch(e){} }
    (function(){ var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')>-1){
        if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
        var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
        var cuerpo={ok:false,error:'stub'};
        if(a==='pedidosLight') cuerpo=${JSON.stringify({ ts: 1, pedidos: P, canales: [], light: true, saludSem: {}, saludMes: {}, ventasExtra: [] })};
        else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
        else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
        else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
        else if(a==='planMes') cuerpo=${JSON.stringify(plan(diasTrans, conCat))};
        else if(a==='catering') cuerpo=${JSON.stringify(CATERING)};
        else if(a==='crmLeads') cuerpo={ok:true,ts:1,leads:[]};
        else if(a==='admin') cuerpo={ok:false,forbidden:true};
        var t=JSON.stringify(cuerpo);
        return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},120);});
      }
      return o.apply(this,arguments); }; })();`;
  return { src: RELOJ + prep('x') + STUB, n: P.length };
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  let script = null;
  async function abrirEscena(e) {
    if (script) await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
    script = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: e.src })).identifier;
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?tab=inicio&t=' + Date.now() });
    if (!await esperar(cli, `typeof go==='function' && window.D && D.pedidos && D.pedidos.length===${e.n}`, 90000)) throw new Error('el ERP no cargo los pedidos stubbeados');
    await ev(cli, `go('planificacion')`);
    if (!await esperar(cli, `!!document.querySelector('#planFinde .plan-finde-tabla') || /objetivo del mes ya/.test((document.getElementById('planFinde')||{}).textContent||'')`, 30000)) throw new Error('no se dibujo la meta del fin de semana');
    await pausa(600);
  }
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Planificación › fin de semana · ' + ANCHO + 'px ==');

    console.log('\n-- lunes 21/9, 15 h --');
    await abrirEscena(escena([2026, 8, 21, 15, 0, 0], '2026-09-21', 21, false));
    /* HOY (22/9/2026). El lunes 21 a las 15 h: faltan $2.100.000 al cierre del
       domingo 20 y quedan 10 días (del 21 al 30), así que hoy tienen que entrar
       $210.000. Entregado hoy: nada. Cargado sin entregar para hoy: nada. */
    const HOY = await ev(cli, txt('#planHoy'));
    chk('HOY dice qué día es y cuánto tiene que entrar hoy para no perder el ritmo',
      /Hoylunes 21 de septiembre/.test(HOY || '') && /\$210\.000tiene que entrar hoy para no perder el ritmo/.test(HOY || ''), HOY);
    chk('dice cuánto se entregó hoy y que no hay nada cargado', /\$0 entregado · nada cargado todavía/.test(HOY || ''), HOY);
    chk('y cuánto falta conseguir hoy', /quedan \$210\.000 por conseguir hoy/.test(HOY || ''), HOY);
    chk('la tab se llama Objetivo, no Planificación', (await ev(cli, `(document.querySelector('[data-p="planificacion"] .bn-lbl')||{}).textContent`)) === 'Objetivo');

    const L = await ev(cli, txt('#planFinde'));
    chk('el título: el fin de semana del 25 al 27/09, el último del mes', /Fin de semana del 25\/09 al 27\/09 · el último del mes/.test(L || ''), L);
    chk('tiene que traer $2.100.000: lo que falta si no se vende nada más hasta el jueves', /Tiene que traer \$2\.100\.000: lo que falta para el objetivo si no se vende nada más hasta el jueves/.test(L || '') && /se recalcula solo/.test(L || ''), L);
    chk('son unos 30 pedidos con el ticket de los últimos 4 fines de semana ($71.429); uno normal trae 14 entregas ($1.000.000): faltan unos 16 más',
      /Son unos 30 pedidos con el ticket de los últimos 4 fines de semana \(\$71\.429\)/.test(L || '') && /trae 14 entregas \(\$1\.000\.000\): faltan unos 16 pedidos más/.test(L || ''), L);
    const filasL = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#planFinde .plan-finde-fila:not(.cab)'),function(f){return f.textContent.replace(/\\s+/g,' ').trim();}))`);
    const FL = JSON.parse(typeof filasL === 'string' ? filasL : '[]');
    chk('el corte: viernes $840.000 (40%), sábado $1.575.000 (75%), domingo $2.100.000 (100%)',
      FL.length === 3 && /Viernes 25\/09\s*\$840\.000 \(40% del finde\)/.test(FL[0]) && /Sábado 26\/09\s*\$1\.575\.000 \(75% del finde\)/.test(FL[1]) && /Domingo 27\/09\s*\$2\.100\.000 \(100% del finde\)/.test(FL[2]), FL);
    chk('lo ya cargado para el finde: $100.000 el viernes y $90.000 el domingo', /\$100\.000 \(1 pedido\)/.test(FL[0] || '') && /\$90\.000 \(1 pedido\)/.test(FL[2] || '') && /——$/.test(FL[1] || ''), FL);
    chk('la nota dice de dónde sale el corte y que el Catering no suma', /viernes 40% · sábado 35% · domingo 25%/.test(L || '') && /Sin Catering: no suma al objetivo/.test(L || ''), L);

    console.log('\n-- sábado 26/9, 13 h --');
    await abrirEscena(escena([2026, 8, 26, 13, 0, 0], '2026-09-26', 26, false));
    const S = await ev(cli, txt('#planFinde'));
    chk('tiene que traer $2.000.000: lo que faltaba al cierre del jueves', /Tiene que traer \$2\.000\.000: lo que falta para el objetivo al cierre del jueves/.test(S || '') && !/se recalcula solo/.test(S || ''), S);
    const filasS = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#planFinde .plan-finde-fila:not(.cab)'),function(f){return {t:f.textContent.replace(/\\s+/g,' ').trim(),hoy:f.classList.contains('hoy')};}))`);
    const FS = JSON.parse(typeof filasS === 'string' ? filasS : '[]');
    chk('el viernes tenía que llegar a $800.000 y llegó a $700.000: $100.000 atrás, el sábado hay que compensar',
      !!FS[0] && /\$800\.000 \(40% del finde\)/.test(FS[0].t) && /\$700\.000/.test(FS[0].t) && /\$100\.000 atrás: el sábado hay que compensar/.test(FS[0].t), FS[0]);
    chk('hoy (sábado, marcado): van $1.000.000 y faltan $500.000 para el corte de $1.500.000, con $160.000 cargados en 2 pedidos',
      !!FS[1] && FS[1].hoy && /\$1\.500\.000 \(75% del finde\)/.test(FS[1].t) && /hoy van \$1\.000\.000 · faltan \$500\.000 para el corte/.test(FS[1].t) && /\$160\.000 \(2 pedidos\)/.test(FS[1].t), FS[1]);
    chk('el domingo todavía no "va" nada: su corte y lo cargado', !!FS[2] && /\$2\.000\.000 \(100% del finde\)/.test(FS[2].t) && /—/.test(FS[2].t) && /\$90\.000 \(1 pedido\)/.test(FS[2].t), FS[2]);
    const tot = await ev(cli, txt('#planTotal .plan-tot-v'));
    chk('arriba, la facturación del mes sigue sin Catering: $4.400.000 de $5.400.000', /\$4\.400\.000\s*de \$5\.400\.000/.test(tot || ''), tot);
    const geo = await ev(cli, `(function(){var b=document.getElementById('planFinde').getBoundingClientRect();return JSON.stringify({w:Math.round(b.width),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth});})()`);
    const G = JSON.parse(typeof geo === 'string' ? geo : '{}');
    chk('sin scroll de costado', G.sw <= G.cw + 1, G);

    console.log('\n-- con OBJETIVO_CON_CATERING --');
    await abrirEscena(escena([2026, 8, 26, 13, 0, 0], '2026-09-26', 26, true));
    await esperar(cli, `/1\\.505\\.000/.test((document.getElementById('planFinde')||{}).textContent||'')`, 8000);
    const C = await ev(cli, txt('#planFinde'));
    const tC = await ev(cli, txt('#planTotal'));
    chk('el total del mes suma el evento confirmado del viernes ($805.000) y no el solo cotizado: $5.205.000, "y Catering"',
      /\$5\.205\.000\s*de \$5\.400\.000/.test(tC || '') && /todos los canales y Catering/.test(tC || ''), tC);
    chk('y el viernes del fin de semana va $1.505.000: adelante', /\$1\.505\.000/.test(C || '') && /\$705\.000 adelante/.test(C || '') && /Incluye Catering/.test(C || ''), C);

    const errs = await ev(cli, 'JSON.stringify(window.__err||[])');
    chk('sin errores de JS', errs === '[]', errs);
  } catch (e) {
    mal++; console.log('  ERROR ' + e.message);
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
