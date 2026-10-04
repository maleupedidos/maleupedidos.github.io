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

   El mes en curso NO tiene plan en la hoja el dia que se escribio esto, asi que
   el `planMes` de ese mes se reemplaza por uno armado aca (5 areas, 4 acciones). */
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
    { id: 'A-904', desc: 'Una suelta, sin objetivo', objetivo: '', responsable: 'Ambos', fechaObjetivo: '', estado: 'Pendiente' }
  ]
};
/* El planMes del mes en curso es el armado; el resto va al servidor. Los POST
   (ya interceptados por sesion_prep) se anotan para poder leerlos. */
const EXTRA = '(function(){var FALSO=' + JSON.stringify(FALSO) + ';window.__posts=[];var o=window.fetch;window.fetch=function(u,x){'
  + 'if(x&&String(x.method||"").toUpperCase()==="POST"){try{window.__posts.push(JSON.parse(x.body));}catch(e){}}'
  + 'if(String(u).indexOf("action=planMes")>=0&&String(u).indexOf(encodeURIComponent(FALSO.mes))>=0)return Promise.resolve(new Response(JSON.stringify(FALSO),{status:200,headers:{"Content-Type":"application/json"}}));'
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

  /* 5. Septiembre, contra lo medido en el diagnostico */
  await evaluar(cli, "planMesShift(-2),1");
  for (let i = 0; i < 60; i++) { if (await evaluar(cli, "/septiembre/i.test((document.querySelector('#planTotal .plan-tot-l')||{}).textContent||'')&&!!document.querySelector('#planAreas .plan-obj')")) break; await sleep(500); }
  const s = await evaluar(cli, `({t:(document.querySelector('#planTotal .plan-tot-v')||{}).textContent, mb:(document.querySelector('#planTotal .plan-tot-mb')||{}).textContent,
     otros:document.querySelectorAll('#planAreas .plan-obj').length, sueltas:document.querySelectorAll('#planAreas .plan-accs.sueltas .plan-acc').length,
     venc:(document.querySelector('#planAreas').innerText.match(/venció/g)||[]).length,
     casas:_planIndicadorMes('casas',2026,8,30), nuevas:_planIndicadorMes('casas_nuevas',2026,8,30),
     cel:[].map.call(document.querySelectorAll('#planTotal .plan-tot-c-v'),function(x){return x.textContent}),
     eerr:(eerrKpisMes(9,2026)||{}).totFact, inicio:(function(g){return g.tot.f+g.cat.f})(_rtSumar('2026-09-01','2026-09-30'))})`);
  const sT = pesos((s.t || '').split(' de ')[0]);
  chk(sT === 19392829, 'septiembre: $19.392.829 con catering (el titulo viejo decia $18.840.829)', s.t);
  /* Septiembre SI tuvo catering ($552.000): es el mes que prueba que el titulo,
     las tarjetas, Inicio y el EERR dicen lo mismo con el catering adentro. */
  chk(sT === s.cel.reduce((a, x) => a + pesos(x), 0) && s.cel.length === 4, 'septiembre: el titulo es la suma de sus 4 tarjetas (con Catering)', s.cel);
  chk(sT === Math.round(s.inicio) && Math.abs(sT - s.eerr) < 1, 'septiembre: = Inicio › Total Maleu = EERR', [sT, s.inicio, s.eerr]);
  chk(/27,7%/.test(s.mb), 'septiembre: margen bruto 27,7%', s.mb);
  chk(s.casas === 148 && s.nuevas === 57, 'septiembre: 148 casas y 57 nuevas, lo medido en el diagnostico', [s.casas, s.nuevas]);
  chk(s.otros >= 6 && s.sueltas === 7 && s.venc >= 7, 'septiembre: los objetivos del tablero y las 7 acciones vencidas siguen ahi (para el cierre)', [s.otros, s.sueltas, s.venc]);

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
