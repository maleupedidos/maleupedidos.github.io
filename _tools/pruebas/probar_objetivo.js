/* La tab Objetivo, rearmada el 4/10/2026: probada en un Chrome de verdad, con
   la sesion real y los POST interceptados (no escribe nada en la planilla).

     node _tools/pruebas/probar_objetivo.js <token> [ancho] [puerto]

   Mide lo que importa de la tab:
   1. EL NUMERO DEL MES ES UNO SOLO: el titulo = la suma de sus tarjetas = Inicio
      › Total Maleu = el EERR (`eerrKpisMes().totFact`). Hasta el 4/10/2026 el
      titulo dejaba afuera el catering que listaba abajo ($18,84M contra $19,39M).
   2. Los indicadores de cada area salen del ERP: casas, casas nuevas, margen.
   3. Un objetivo por area con sus acciones; el estado de una accion cambia de
      un toque y manda el POST correcto; lo vencido se ve.
   4. «Planificar el mes» en un mes vacio trae la propuesta y guarda 6 cosas
      (la facturacion y los 5 objetivos) con area e indicador.
   5. En el celular entra en ~2 pantallas, sin scroll horizontal ni errores.

   NINGUN MES FIJO (4/10/2026). Los tres meses que mira la prueba se arman aca y
   se calculan desde hoy: el en curso (5 areas, 4 acciones), el que viene (vacio,
   para planificarlo) y EL ANTERIOR, que es el que se cierra (sin cerrar, con 6
   objetivos y 7 acciones vencidas). Hasta ese dia el cierre se probaba sobre
   septiembre real, y el 4/10 a las 20:15 se cerro de verdad: 7 chequeos en rojo
   sobre codigo sano. Lo que se mide del ERP (facturacion, casas, margen) se
   compara contra el mismo ERP, no contra numeros escritos. */
const R = __dirname + '/';
const { abrir, evaluar } = require(R + 'cdp.js');
const prep = require(R + 'sesion_prep.js');
const [tok, anchoS, puertoS] = process.argv.slice(2);
if (!tok) { console.error('falta el token: python _tools/pruebas/leer_sesion.py'); process.exit(2); }
const ancho = Number(anchoS) || 1440, puerto = Number(puertoS) || 8095;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (c, t, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '  -> ' + JSON.stringify(d).slice(0, 400) : '')); } };

const AR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const MSA = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const Y = AR.getFullYear(), M0 = AR.getMonth(), HOY = AR.getDate();
const LBL = MSA[M0] + ' ' + Y;
const ayer = new Date(Y, M0, HOY - 3), dmy = d => ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
const FALSO = {
  ok: true, mes: LBL, yyyy: Y, mm: M0 + 1, diasMes: new Date(Y, M0 + 1, 0).getDate(), diasTrans: HOY,
  metas: { 'Total|': { metaFact: 22000000 } }, real: {}, origen: [],
  objetivos: [
    { id: 'O-901', periodo: 'Mes', objetivo: 'Que compren 160 casas en el mes', area: 'Comercial', indicador: 'casas', meta: 160, unidad: 'casas', responsable: 'Lucas', estado: 'En curso', avance: 0 },
    { id: 'O-902', periodo: 'Mes', objetivo: 'Margen bruto de 28% o más', area: 'Operaciones', indicador: 'margen_bruto', meta: 28, unidad: '%', responsable: 'Tadeo', estado: 'En curso', avance: 0 },
    { id: 'O-903', periodo: 'Mes', objetivo: 'Resultado neto de $2.000.000', area: 'Finanzas', indicador: 'resultado_neto', meta: 2000000, unidad: '$', responsable: 'Tadeo', estado: 'En curso', avance: 0 },
    { id: 'O-904', periodo: 'Mes', objetivo: '60 casas nuevas en el mes', area: 'Marca', indicador: 'casas_nuevas', meta: 60, unidad: 'casas', responsable: 'Tadeo', estado: 'En curso', avance: 0 },
    { id: 'O-905', periodo: 'Mes', objetivo: 'Terminar la unificación', area: 'Tecnología', indicador: 'manual', meta: 100, unidad: '%', responsable: 'Tadeo', estado: 'En curso', avance: 60 }
  ],
  acciones: [
    { id: 'A-901', desc: 'Llamar a los leads de septiembre', objetivo: 'O-901', responsable: 'Lucas', fechaObjetivo: dmy(ayer), estado: 'Pendiente' },
    { id: 'A-902', desc: 'Folleto en La Pionera', objetivo: 'O-904', responsable: 'Tadeo', fechaObjetivo: '30/' + ('0' + (M0 + 1)).slice(-2) + '/' + Y, estado: 'En curso' },
    { id: 'A-903', desc: 'Renegociar el precio de la carne', objetivo: 'O-902', responsable: 'Tadeo', fechaObjetivo: '', estado: 'Hecho' },
    { id: 'A-904', desc: 'Una suelta, sin objetivo', objetivo: '', responsable: 'Ambos', fechaObjetivo: '', estado: 'Pendiente', vieneDe: 'Septiembre 2026' }
  ]
};
/* EL MES ANTERIOR, el que se cierra: sin cierre, con su objetivo de facturacion,
   seis objetivos sin area (como los del tablero de septiembre) y siete acciones
   abiertas y vencidas. O-801 es de leads con meta 1: la prueba le inyecta UN lead
   del mes a la copia guardada, asi no depende de cuantos se cargaron de verdad. */
const PM0 = (M0 + 11) % 12, PY = M0 === 0 ? Y - 1 : Y, PLBL = MSA[PM0] + ' ' + PY, PDIAS = new Date(PY, PM0 + 1, 0).getDate();
const NM0 = (M0 + 1) % 12, NY = M0 === 11 ? Y + 1 : Y, NLBL = MSA[NM0] + ' ' + NY;
const pdmy = d => ('0' + d).slice(-2) + '/' + ('0' + (PM0 + 1)).slice(-2) + '/' + PY;
const PISO = PY + '-' + ('0' + (PM0 + 1)).slice(-2);
const META_ANT = 20000000;
const obj = (id, t, meta, unidad, resp, avance) => ({ id: id, periodo: 'Mes', objetivo: t, area: '', indicador: '', meta: meta, unidad: unidad, responsable: resp, estado: 'En curso', avance: avance });
const ANTERIOR = {
  ok: true, mes: PLBL, yyyy: PY, mm: PM0 + 1, diasMes: PDIAS, diasTrans: PDIAS, metas: { 'Total|': { metaFact: META_ANT } }, real: {}, origen: [], cierre: null,
  objetivos: [obj('O-801', 'Generar leads nuevos', 1, 'leads', 'Lucas', 0), obj('O-802', 'Unificar el ERP y la tienda', 100, '%', 'Tadeo', 60),
    obj('O-803', 'Nuevo esquema de vendedores', 100, '%', 'Joaco', 0), obj('O-804', 'Catalogo unico', 100, '%', 'Tadeo', 100),
    obj('O-805', 'Fichas de vendedores', 100, '%', 'Joaco', 40), obj('O-806', 'Folletos', 100, '%', 'Lucas', 0)],
  acciones: [1, 2, 3, 4, 5, 6, 7].map(i => ({ id: 'A-80' + i, desc: 'Accion abierta ' + i, objetivo: '', responsable: 'Tadeo', fechaObjetivo: pdmy(i + 2), estado: 'Pendiente' }))
};
const VACIO = { ok: true, mes: NLBL, yyyy: NY, mm: NM0 + 1, diasMes: new Date(NY, NM0 + 1, 0).getDate(), diasTrans: 0, metas: {}, real: {}, origen: [], objetivos: [], acciones: [], cierre: null };
/* Los tres planMes son los armados; el resto va al servidor. Los POST (ya
   interceptados por sesion_prep) se anotan para poder leerlos. `__antCierre`
   convierte al anterior en un mes ya cerrado. */
const EXTRA = '(function(){var F={};[' + [FALSO, ANTERIOR, VACIO].map(x => JSON.stringify(x)).join(',') + '].forEach(function(x){F[encodeURIComponent(x.mes)]=x;});'
  + 'window.__posts=[];var o=window.fetch;window.fetch=function(u,x){'
  + 'if(x&&String(x.method||"").toUpperCase()==="POST"){try{window.__posts.push(JSON.parse(x.body));}catch(e){}}'
  + 'if(String(u).indexOf("action=planMes")>=0){for(var k in F){if(String(u).indexOf(k)>=0){var d=JSON.parse(JSON.stringify(F[k]));if(window.__antCierre&&d.mes===window.__antCierre.mes)d.cierre=window.__antCierre;'
  + 'return Promise.resolve(new Response(JSON.stringify(d),{status:200,headers:{"Content-Type":"application/json"}}));}}}'
  + 'return o.apply(this,arguments);};})();'
  + 'try{Object.keys(localStorage).forEach(function(k){if(k.indexOf("maleu_plan_cache_")===0)localStorage.removeItem(k);});}catch(e){}';

const pesos = s => Number(String(s || '').replace(/[^\d]/g, '')) || 0;

(async () => {
  const cli = await abrir();
  await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: ancho < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: ancho < 600 });
  /* sesion_prep pisa fetch para los POST: lo nuestro va DESPUES, asi ve el body. */
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(tok) + EXTRA });
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + puerto + '/app.html' });
  console.log('\n== Objetivo · ' + ancho + 'px ==\n');
  let listo = false;
  for (let i = 0; i < 150 && !listo; i++) { listo = await evaluar(cli, "!!(window.D&&D.pedidos&&D.pedidos.length&&window.VD&&D.gastos)"); if (!listo) await sleep(1000); }
  chk(listo, 'el ERP cargo pedidos, ventas y gastos (si no, no hay contra que comparar)');
  await evaluar(cli, "go('planificacion'),1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "document.querySelectorAll('#planAreas .plan-area').length===5")) break; await sleep(500); }
  await sleep(800);

  /* 1. El numero del mes, en cuatro lugares */
  const n = await evaluar(cli, `(function(){
    var t=document.querySelector('#planTotal .plan-tot-v'); var cel=[].map.call(document.querySelectorAll('#planTotal .plan-tot-c-v'),function(x){return x.textContent});
    var hoy=_rtIso(new Date()), d1=hoy.slice(0,8)+'01', g=_rtSumar(d1,hoy);
    var K=eerrKpisMes(${M0 + 1},${Y});
    return {titulo:t?t.textContent:'', cel:cel, inicio:g.tot.f+g.cat.f, eerr:K?K.totFact:null, mb:(document.querySelector('#planTotal .plan-tot-mb')||{}).textContent||'', mbK:K?K.mbPct:null};
  })()`);
  const tit = pesos((n.titulo.match(/\$[\d.]+/) || [''])[0]);
  const sumCel = n.cel.reduce((s, x) => s + pesos(x), 0);
  chk(tit > 0 && tit === sumCel, 'el titulo es la suma de sus tarjetas (retail + clubes + red + catering)', { tit, sumCel, cel: n.cel });
  chk(tit === Math.round(n.inicio), 'el titulo es el de Inicio › Total Maleu (tot + catering)', { tit, inicio: n.inicio });
  chk(n.eerr !== null && Math.abs(tit - n.eerr) < 1, 'y el del EERR', { tit, eerr: n.eerr });
  chk(n.mbK !== null && n.mb.indexOf((Math.round(n.mbK * 10) / 10).toLocaleString('es-AR') + '%') >= 0, 'el margen bruto es el del EERR', { mb: n.mb, mbK: n.mbK });

  /* 2-3. Las areas y sus acciones */
  const a = await evaluar(cli, `(function(){
    var A=[].map.call(document.querySelectorAll('#planAreas .plan-area'),function(x){return {k:(x.querySelector('.plan-area-k')||{}).textContent,v:(x.querySelector('.plan-area-v')||{}).textContent||'',cls:x.className,acc:x.querySelectorAll('.plan-acc').length,txt:x.innerText}});
    var y=${Y},m=${M0},hoy=${HOY};
    return {A:A, casas:_planIndicadorMes('casas',y,m,hoy), nuevas:_planIndicadorMes('casas_nuevas',y,m,hoy),
      sueltas:document.querySelectorAll('#planAreas .plan-accs.sueltas .plan-acc').length, vacio:!!document.querySelector('#planAreas .plan-vacio')};
  })()`);
  const area = k => a.A.filter(x => x.k === k)[0] || {};
  chk(a.A.map(x => x.k).join(',') === 'Comercial,Operaciones,Finanzas,Marca,Tecnología', 'las 5 areas, en orden', a.A.map(x => x.k));
  chk(a.casas > 0 && area('Comercial').v.indexOf(String(a.casas)) === 0 && area('Comercial').v.indexOf('/ 160') > 0, 'Comercial: las casas que compraron, contadas por el ERP, sobre 160', [area('Comercial').v, a.casas]);
  chk(area('Marca').v.indexOf(String(a.nuevas)) === 0 && a.nuevas <= a.casas, 'Marca: las casas nuevas (nunca mas que las casas)', [area('Marca').v, a.nuevas, a.casas]);
  chk(/%/.test(area('Operaciones').v) && /28%/.test(area('Operaciones').v), 'Operaciones: el margen bruto en % sobre 28%', area('Operaciones').v);
  chk(/a mano/.test(area('Tecnología').txt) && /^60%/.test(area('Tecnología').v), 'Tecnologia: a mano, con su avance de la hoja (60%)', [area('Tecnología').v]);
  chk(a.sueltas === 1, 'la accion sin objetivo va aparte, no se pierde', a.sueltas);
  chk(await evaluar(cli, "/viene de septiembre 2026/.test(document.querySelector('#planAreas .plan-accs.sueltas').textContent)"), 'la que paso de mes dice de donde viene');
  if (ancho >= 900) {
    chk(area('Comercial').acc === 1 && /venció/.test(area('Comercial').txt), 'en compu las acciones se ven abiertas, y la vencida lo dice', area('Comercial').txt);
  } else {
    chk(area('Comercial').acc === 0 && /1 vencida/.test(area('Comercial').txt), 'en el celular las acciones arrancan plegadas, pero la vencida se cuenta', area('Comercial').txt);
    await evaluar(cli, "planAreaToggle('Comercial'),1"); await sleep(200);
  }
  await evaluar(cli, "window.__posts=[],1");
  await evaluar(cli, "document.querySelector('#planAreas .plan-area .plan-acc-est').click(),1");
  await sleep(600);
  const t1 = await evaluar(cli, "({est:document.querySelector('#planAreas .plan-area .plan-acc-est').textContent,posts:window.__posts})");
  chk(t1.est === 'En curso' && t1.posts.length === 1 && t1.posts[0].action === 'planAccionUpdate' && t1.posts[0].id === 'A-901' && t1.posts[0].estado === 'En curso',
    'un toque pasa la accion de Pendiente a En curso y manda SOLO el estado', t1);
  /* De vuelta como arranca: en el celular las areas plegadas (el alto se mide asi). */
  if (ancho < 900) { await evaluar(cli, "planAreaToggle('Comercial'),1"); }

  /* 4. Planificar un mes vacio (el que viene) */
  await evaluar(cli, "planMesShift(1),1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "!!document.querySelector('#planAreas .plan-vacio')")) break; await sleep(500); }
  chk(await evaluar(cli, "!!document.querySelector('#planAreas .plan-vacio')"), 'un mes sin plan lo dice y ofrece planificarlo');
  await evaluar(cli, "planPlanificarMes(),1"); await sleep(300);
  const d = await evaluar(cli, `({prop:!!document.querySelector('#planMetaBody .plan-prop'), total:document.getElementById('ppTotal').value,
    com:document.getElementById('ppObj0').value, base:document.getElementById('ppBase0').textContent, resp:(document.querySelector('#ppResp0 .on')||{}).textContent})`);
  chk(d.prop && d.total === '22.000.000' && /160 casas/.test(d.com) && d.resp === 'Lucas', 'el editor arranca con la propuesta (22M, 160 casas, Lucas)', d);
  chk(new RegExp('^' + MSA[M0] + ': \\d').test(d.base), 'y al lado, el numero del mes anterior medido', d.base);
  await evaluar(cli, "window.__posts=[],document.getElementById('ppGuardar').click(),1");
  for (let i = 0; i < 30; i++) { if ((await evaluar(cli, 'window.__posts.length')) >= 6) break; await sleep(300); }
  const ps = await evaluar(cli, 'window.__posts');
  const objs = ps.filter(p => p.action === 'planObjetivoSet');
  chk(ps.length === 6 && ps[0].action === 'planMetaSet' && ps[0].canal === 'Total' && ps[0].metaFact === 22000000, 'guarda la facturacion (Total, 22M) primero', ps[0]);
  chk(objs.length === 5 && objs.every(p => p.area && p.indicador && p.periodo === 'Mes' && !p.id) && objs[0].responsable === 'Lucas' && objs[2].meta === 2000000 && objs[2].unidad === '$',
    'y los 5 objetivos nuevos, cada uno con area, indicador, meta y responsable', objs.map(p => [p.area, p.indicador, p.meta, p.responsable]));
  await sleep(1500);

  /* 5. EL MES ANTERIOR (el que se cierra): lo de pantalla contra el mismo ERP */
  await evaluar(cli, "planMesShift(-2),1");
  const pRe = PLBL.split(' ')[0].toLowerCase();
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "new RegExp('" + pRe + "','i').test((document.querySelector('#planTotal .plan-tot-l')||{}).textContent||'')&&!!document.querySelector('#planAreas .plan-obj')&&!!document.querySelector('#planTotal .plan-tot-v')")) break; await sleep(500); }
  const s = await evaluar(cli, `({t:(document.querySelector('#planTotal .plan-tot-v')||{}).textContent, mb:(document.querySelector('#planTotal .plan-tot-mb')||{}).textContent,
     otros:document.querySelectorAll('#planAreas .plan-obj').length, sueltas:document.querySelectorAll('#planAreas .plan-accs.sueltas .plan-acc').length,
     venc:(document.querySelector('#planAreas').innerText.match(/venció/g)||[]).length,
     casas:_planIndicadorMes('casas',${PY},${PM0},${PDIAS}), nuevas:_planIndicadorMes('casas_nuevas',${PY},${PM0},${PDIAS}),
     cel:[].map.call(document.querySelectorAll('#planTotal .plan-tot-c-v'),function(x){return x.textContent}),
     K:eerrKpisMes(${PM0 + 1},${PY}), inicio:(function(g){return g.tot.f+g.cat.f})(_rtSumar('${PISO}-01','${PISO}-${PDIAS}'))})`);
  const sT = pesos((s.t || '').split(' de ')[0]);
  chk(sT > 0 && sT === Math.round(s.inicio), PLBL + ': el titulo es Inicio › Total Maleu con catering', [s.t, s.inicio]);
  chk(!!s.K && Math.abs(sT - s.K.totFact) < 1, PLBL + ': = el EERR del mes', [sT, s.K && s.K.totFact]);
  chk(s.cel.length >= 3 && sT === s.cel.reduce((a, x) => a + pesos(x), 0), PLBL + ': el titulo es la suma de sus tarjetas', s.cel);
  chk(!!s.K && s.mb.indexOf((Math.round(s.K.mbPct * 10) / 10).toLocaleString('es-AR') + '%') >= 0, PLBL + ': el margen bruto es el del EERR', [s.mb, s.K && s.K.mbPct]);
  chk(s.casas > 0 && s.nuevas >= 0 && s.nuevas <= s.casas, PLBL + ': casas y casas nuevas medidas (nunca mas nuevas que casas)', [s.casas, s.nuevas]);
  chk(s.otros === 6 && s.sueltas === 7 && s.venc >= 7, PLBL + ': los 6 objetivos y las 7 acciones vencidas se ven (para el cierre)', [s.otros, s.sueltas, s.venc]);

  /* 5b. La foto de cada domingo y el cierre */
  await evaluar(cli, "planSemToggle&&(document.querySelector('#planSemanas .plan-sem-t')||planSemToggle()),1"); await sleep(300);
  const sem = await evaluar(cli, `({th:[].map.call(document.querySelectorAll('#planSemanas thead th'),function(x){return x.textContent}),
    filas:[].map.call(document.querySelectorAll('#planSemanas tbody tr'),function(tr){return [].map.call(tr.children,function(c){return c.textContent})})})`);
  const domingos = []; for (let d = 1; d < PDIAS; d++) if (new Date(PY, PM0, d).getDay() === 0) domingos.push('dom ' + d + '/' + (PM0 + 1));
  chk(sem.th.slice(1).join('|') === domingos.concat(['cierre ' + PDIAS + '/' + (PM0 + 1)]).join('|'), PLBL + ': la foto de cada domingo y el cierre del ' + PDIAS, sem.th);
  const ult = sem.th.length - 1;
  const fFac = (sem.filas.filter(f => /^Facturaci/.test(f[0]))[0] || []), fCas = (sem.filas.filter(f => /^Casas(?! nuevas)/.test(f[0]))[0] || []), fNue = (sem.filas.filter(f => /^Casas nuevas/.test(f[0]))[0] || []);
  const compacto = (Math.round(sT / 1e4) / 100).toLocaleString('es-AR') + 'M';
  chk((fFac[ult] || '').indexOf(compacto) >= 0 && new RegExp('^' + s.casas + '\\b').test(fCas[ult] || '') && new RegExp('^' + s.nuevas + '\\b').test(fNue[ult] || ''),
    'el cierre de la tabla da lo mismo que arriba: ' + compacto + ', ' + s.casas + ' casas, ' + s.nuevas + ' nuevas', [fFac[ult], fCas[ult], fNue[ult]]);
  const num = x => parseFloat(String(x || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  chk(fFac.slice(1, ult + 1).every((x, i, a) => i === 0 || num(x) >= num(a[i - 1])), 'la facturacion va creciendo domingo a domingo (es acumulada)', fFac);
  const ci = await evaluar(cli, `({txt:(document.getElementById('planCierre')||{}).innerText||'', acc:document.querySelectorAll('#planCierre .plan-cierre-a input:checked').length,
     obj:document.querySelectorAll('#planCierre .plan-cierre-o').length, btn:!!document.getElementById('planCierreBtn')})`);
  const fm = n => '$' + Math.round(n).toLocaleString('es-AR');
  const pctAnt = Math.round(sT / META_ANT * 100) + '%';
  chk(ci.btn && ci.acc === 7 && ci.txt.indexOf(fm(sT) + ' de ' + fm(META_ANT)) >= 0 && ci.txt.indexOf(pctAnt) >= 0,
    PLBL + ' terminó: el cierre ofrece pasar sus 7 acciones abiertas, con la facturacion ' + pctAnt + ' del objetivo', [ci.acc, ci.txt.slice(0, 160)]);
  /* 4 (Codex): se cierra recien DESDE el dia siguiente al ultimo. Funcion pura: fechas fijas a proposito. */
  const cer = await evaluar(cli, "[_planMesCerrable(2026,9,new Date(2026,8,30,23,30)), _planMesCerrable(2026,9,new Date(2026,9,1,0,1)), _planMesCerrable(2026,12,new Date(2026,11,31,22,0)), _planMesCerrable(2026,12,new Date(2027,0,1,8,0))]");
  chk(JSON.stringify(cer) === '[false,true,false,true]', 'el ultimo dia a las 23:30 el mes NO se puede cerrar; el 1 del siguiente sí (y diciembre recién el 1/1)', cer);
  /* Sin las ventas en el telefono NO se puede cerrar: mandaba facturacion $0 (4/10/2026). */
  const sinD = await evaluar(cli, "(function(){var p=D.pedidos;D.pedidos=[];planRepintarPorD();var b=document.getElementById('planCierreBtn');var r={dis:!!(b&&b.disabled),t:b?b.textContent:''};D.pedidos=p;planRepintarPorD();return r;})()");
  chk(sinD.dis && /Esperando las ventas/.test(sinD.t), 'sin las ventas del mes el boton de cerrar queda trabado y dice que espera (no cierra con $0)', sinD);
  /* Y si llegan sin que nadie avise, la tab se redibuja sola (se quedaba en "Esperando…"). */
  await evaluar(cli, "window.__pp=D.pedidos;D.pedidos=[];planRepintarPorD();setTimeout(function(){D.pedidos=window.__pp;},300);1");
  await sleep(3500);
  chk(await evaluar(cli, "(document.querySelector('#planTotal .plan-tot-v')||{}).textContent.indexOf('" + fm(sT) + "')===0&&!(document.getElementById('planCierreBtn')||{}).disabled"),
    'si los pedidos vuelven sin aviso, la tab se redibuja sola en segundos (no se queda en «Esperando»)');
  for (let i = 0; i < 90; i++) { if (await evaluar(cli, "!(document.getElementById('planCierreBtn')||{}).disabled")) break; await sleep(500); }
  const btnC = await evaluar(cli, "(function(){var b=document.getElementById('planCierreBtn');return {dis:!!(b&&b.disabled),t:b?b.textContent:''}})()");
  chk(!btnC.dis && btnC.t === 'Cerrar ' + pRe, 'con todo medido (ventas y leads) el boton de cerrar se habilita', btnC);
  /* 3 (Codex): la propuesta se recalcula si llegan datos nuevos, salvo lo cambiado
     a mano. Con UN lead del mes inyectado en la copia, O-801 (meta 1) se cumple;
     sacandole todos los del mes, deja de cumplirse. */
  const estO1 = () => evaluar(cli, "(function(){var b=[].filter.call(document.querySelectorAll('#planCierre .plan-cierre-o'),function(x){return /O-801/.test(x.textContent)})[0];return b?(b.querySelector('.plan-cierre-e')||{}).textContent:''})()");
  await evaluar(cli, "(function(){var g=_swrLeer('crmLeads');window.__leadsOk=g&&g.d;var L=((g&&g.d&&g.d.leads)||[]).concat([{id:'L-PRUEBA',nombre:'Prueba',iso:'" + PISO + "-15',yaCliente:false}]);_swrGuardar('crmLeads',{ok:true,ts:Date.now(),leads:L});planRepintarPorD();})(),1");
  await sleep(300);
  const e0 = await estO1();
  await evaluar(cli, "(function(){var g=_swrLeer('crmLeads');var L=g.d.leads.filter(function(l){return String(l.iso).slice(0,7)!=='" + PISO + "';});_swrGuardar('crmLeads',{ok:true,ts:Date.now(),leads:L});planRepintarPorD();})(),1");
  await sleep(300);
  const e1 = await estO1();
  chk(e0 === 'Cumplido' && e1 === 'No cumplido', 'si cambia la medicion (leads de menos), la propuesta de O-801 cambia sola', [e0, e1]);
  await evaluar(cli, "planCierreObj('O-801'),1"); await sleep(200);
  const e2 = await estO1();
  await evaluar(cli, "planRepintarPorD(),1"); await sleep(300);
  const e3 = await estO1();
  chk(e2 === 'Cumplido' && e3 === 'Cumplido', 'lo que se cambia a mano NO lo pisa un repintado', [e2, e3]);
  await evaluar(cli, "if(window.__leadsOk)_swrGuardar('crmLeads',window.__leadsOk);1");
  await evaluar(cli, "window.confirm=function(){return true};window.__posts=[];planCerrarMes();1");
  for (let i = 0; i < 20; i++) { if ((await evaluar(cli, 'window.__posts.length')) >= 1) break; await sleep(200); }
  const pc = (await evaluar(cli, 'window.__posts'))[0] || {};
  chk(pc.action === 'planCerrarMes' && pc.mes === PLBL && pc.siguiente === LBL && (pc.mover || []).length === 7 && !('facturacion' in pc) && !('meta' in pc) && (pc.objetivos || []).length === ci.obj,
    'cerrar ' + pRe + ' manda UNA llamada: las 7 acciones y como termino cada objetivo, SIN facturacion ni meta (las pone el backend)', pc);
  if (process.env.PREVIA) require('fs').writeFileSync(process.env.PREVIA, JSON.stringify(pc, null, 1));
  await sleep(2500);
  /* Un mes ya cerrado muestra el registro, sin boton */
  for (let i = 0; i < 120; i++) { if (await evaluar(cli, "(document.getElementById('planRefreshBadge')||{style:{}}).style.display==='none'")) break; await sleep(500); }
  const proxMin = MSA[M0].toLowerCase() + ' ' + Y;
  await evaluar(cli, "window.__antCierre={mes:'" + PLBL + "',cerradoEl:'02/" + ('0' + (M0 + 1)).slice(-2) + '/' + Y + " 19:30',por:'Tadeo',facturacion:" + sT + ",meta:" + META_ANT + ",objetivos:'O-801 Cumplido',acciones:'A-801, A-802',a:'" + LBL + "'};try{localStorage.removeItem('maleu_plan_cache_" + PLBL + "')}catch(e){};planLoad();1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "!!document.querySelector('#planCierre .plan-cierre.hecho')")) break; await sleep(300); }
  const ch = await evaluar(cli, "({t:(document.getElementById('planCierre')||{}).textContent||'', btn:!!document.getElementById('planCierreBtn')})");
  chk(!ch.btn && ch.t.indexOf('cerrado el 02/' + ('0' + (M0 + 1)).slice(-2) + '/' + Y + ' por Tadeo') >= 0 && ch.t.indexOf(pctAnt) >= 0 && ch.t.indexOf('Pasaron a ' + proxMin + ': A-801, A-802') >= 0,
    'un mes cerrado muestra su registro y no deja volver a cerrarlo', ch);
  await evaluar(cli, "window.__antCierre=null;1");

  /* 6. Layout y errores, de vuelta en el mes en curso */
  await evaluar(cli, "planMesShift(1),1");
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, "document.querySelectorAll('#planAreas .plan-area').length===5")) break; await sleep(500); }
  await sleep(500);
  const L = await evaluar(cli, `({alto:document.getElementById('p-planificacion').scrollHeight, docW:document.documentElement.scrollWidth, vw:innerWidth, err:window.__err||[]})`);
  if (ancho < 600) chk(L.alto <= 844 * 2.1, 'en el celular la tab entra en ~2 pantallas (antes 8.274 px)', L.alto + ' px');
  chk(L.docW <= L.vw, 'sin scroll horizontal', [L.docW, L.vw]);
  chk(L.err.length === 0, 'sin errores de JS', L.err);
  /* SHOT=archivo.png: la tab entera, para mirarla. */
  if (process.env.SHOT) {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: L.alto + 140, deviceScaleFactor: 1, mobile: ancho < 600 });
    await sleep(800);
    const shot = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    require('fs').writeFileSync(process.env.SHOT, Buffer.from(shot.data, 'base64'));
  }
  console.log('\n  alto de la tab: ' + L.alto + ' px\n  ' + ok + ' ok · ' + mal + ' mal\n');
  cli.matar(); process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
