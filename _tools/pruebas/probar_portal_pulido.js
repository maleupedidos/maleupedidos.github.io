/* MI PORTAL, PULIDO (7/10/2026): simple y motivador desde el celular.

     node _tools/pruebas/probar_portal_pulido.js [puerto]      (default 8097)

   Lo que se recorrio el 7/10 entrando como los cuatro vendedores, a 390 px:
   · Arriba decia «S41 · Semana actual» y abajo «Semana 40»: numeros ISO.
   · El objetivo era una pregunta y un boton enorme; el formulario no entraba
     en una pantalla y «Arrancar la semana» quedaba fuera de la vista.
   · Lo vencido (4 pedidos de Marcos) quedaba debajo del objetivo.
   · Sin objetivos previos: «— todavia sin semanas con objetivo», todo gris.
   · El nivel en pesos en una tarjeta y en pedidos en otra.
   · Cuatro tarjetas de plata en Hoy; el desglose con semanas futuras en $0.
   · Pedidos decia «Tu ruta de esta semana» con los pendientes del 2/10.

   Backend simulado y datos INVENTADOS (repo publico). Sesion de VENDEDOR, no
   «Ver como»: el formulario del objetivo solo existe para el vendedor.
   Contra el red.html anterior tiene que dar ROJOS. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = ms => new Promise(r => setTimeout(r, ms));
const PUERTO = Number(process.argv[2] || 8097);
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };

const hoyAr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = n => { const d = new Date(hoyAr); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const lunOff = -((hoyAr.getDay() + 6) % 7);           // lunes de esta semana
const dm = n => { const p = iso(n).split('-'); return p[2] + '/' + p[1]; };
const P = (n, c, fe, es, ep, $, row) => ({ n, c, f: '01/01', de: 'Viernes', $, com: 1000, env: 0, gan: 1000, aPg: $ - 1000, es, fp: 'Transferencia', ep,
  ef: 0, tr: 0, pEf: 0, pTr: 0, fpm: '', epm: 'Pendiente', fpmF: '', b: 'Barrio Prueba', l: String(row), t: '1155550000',
  prods: [{ a: 'PMu', q: 1 }], vi: false, row, envAnu: '', fe, cn: true, _y: 2026, _sem: 1 });
const FE_VIEJA = iso(lunOff - 3);                      // el viernes pasado
const PEDIDOS = [P('301', 'Cliente Uno', FE_VIEJA, 'Pendiente', 'No Cobrado', 100000, 10), P('302', 'Cliente Dos', FE_VIEJA, 'Pendiente', 'No Cobrado', 50000, 11)];
const Z = { facturado: 0, pedidos: 0, comision: 0, envio: 0, ganancia: 0 };
const SEM = (k, ped) => Object.assign({}, Z, { n: 40 + k, lun: dm(lunOff + 7 * k), dom: dm(lunOff + 7 * k + 6), pedidos: ped, facturado: ped * 50000, ganancia: ped * 9000 });
const SUG = ['Ana', 'Bea', 'Caro', 'Dani', 'Eli', 'Flor', 'Gabi'].map((c, i) => ({ tipo: i < 3 ? 'reponer' : 'dormido', clave: c, txt: 'Ofrecerle reponer a ' + c, t: '115555000' + i, det: 'hace ' + (20 + i) + ' días' }));
const HIST = [2, 2, 0, 0, 3, 2, 1, 3].map((n, i) => ({ lun: iso(lunOff - 7 * (8 - i)), meta: 0, lleva: n }));
const OBJ = { sem: '2026-W41', lun: iso(lunOff), dom: iso(lunOff + 6), meta: 0, lleva: 0, porVenta: 15000, record: 5, hist: HIST, conMeta: 0, cumplidas: 0, racha: 0,
  sugeridas: SUG, acciones: [], resultados: ['Compró', 'No contesta'], ventas: [], pasadas: 0, equipo: {} };
const DASH = {
  ok: true,
  stats: { semana: Object.assign({ n: 41, lun: dm(lunOff), dom: dm(lunOff + 6) }, Z, { ganancia: 9000 }),
    mes: Object.assign({ nombre: 'Octubre', semanas: [SEM(-1, 4), SEM(0, 0), SEM(1, 0), SEM(2, 0)] }, Z, { pedidos: 4, ganancia: 66100 }),
    mesesAnt: [{ n: 'Septiembre', y: 2026, semanas: [SEM(-5, 1), SEM(-4, 0)], facturado: 50000, pedidos: 1, comision: 9000, ganancia: 9000 }],
    total: Object.assign({}, Z, { pedidos: 5 }), comision: 0, ganancia: 0, viernes: { total: 0, entregados: 0, dias: [] }, pendCobrar: 0, pendLiquidar: 0,
    escala: { nivel: 'inicial', facturado: 62500, bandas: [{ nivel: 'inicial', desde: 0 }, { nivel: 'intermedio', desde: 1000000 }], siguiente: { nivel: 'intermedio', desde: 1000000, falta: 937500 } } },
  pedidos: PEDIDOS, clientes: [], liqBySem: {}, cuentas: [], tg: { vinculado: true, link: '' },
  tareas: { modo: 'vender', semana: '2026-W41', resultados: ['Compró'], lista: [
    { id: 'escalon', clase: 'dato', titulo: 'Te faltan 12 pedidos para el nivel intermedio', sub: 'Al subir, se te recalcula TODO el mes con el valor nuevo.', items: [] }] },
  objetivo: OBJ,
};

function prep(dash) {
  const ses = { usuario: 'marcos', rol: 'vendedor', nombre: 'Marcos Bottcher', ts: Date.now(), tabs: ['miportal'] };
  const ls = { maleu_token: 'token-de-prueba', maleu_panel_session: JSON.stringify(ses), maleu_red_session: JSON.stringify({ ok: true, nombre: 'Marcos Bottcher', usuario: 'marcos', wa: '' }) };
  return `(function(){
    try{ localStorage.clear(); var L=${JSON.stringify(ls)}; for(var k in L) localStorage.setItem(k,L[k]); }catch(e){}
    window.__err=[]; window.__posts=[];
    window.addEventListener('error',function(e){window.__err.push(String(e.message));});
    window.confirm=function(){return true;}; window.alert=function(){};
    var DASH=${JSON.stringify(dash)};
    var orig=window.fetch.bind(window);
    function resp(o,ms){ return new Promise(function(r){ setTimeout(function(){ r(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||30); }); }
    window.fetch=function(u,x){
      var url=String(u&&u.url||u);
      if(url.indexOf('script.google.com/macros')<0) return orig(u,x);
      if(x&&String(x.method||'').toUpperCase()==='POST'){ try{window.__posts.push(JSON.parse(x.body));}catch(e){} return resp({ok:true}); }
      var a=(url.match(/action=([A-Za-z]+)/)||[])[1]||'';
      if(a==='dashboardVendedor') return resp(DASH, 200);
      if(a==='resolverVendedor') return resp({ok:true,nombre:'Marcos Bottcher',usuario:'marcos'});
      if(a==='miSesion') return resp({ok:true,usuario:'marcos',rol:'vendedor',tabs:['miportal']});
      return resp({ok:true});
    };
  })();`;
}
let _prepId = null;
async function cargar(cli, dash, ancho) {
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: ancho < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: ancho < 600 });
  if (_prepId) await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: _prepId });
  _prepId = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(dash) })).identifier;
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
  for (let i = 0; i < 100; i++) { await T(200); try { if (await evaluar(cli, `!!document.querySelector('#obj-card .ob-head') && document.getElementById('gan-sem') && document.getElementById('gan-sem').textContent !== '$0'`)) break; } catch (e) {} }
  await T(800);
}
const TXT = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)}); return e?(e.innerText||'').replace(/\\s+/g,' '):'';})()`;

async function pasada(cli, ancho) {
  console.log('\n######## ' + ancho + ' px');
  await cargar(cli, DASH, ancho);

  console.log('\n== 1-2. Sin numeros de semana, con la fecha ==');
  const hoy = await evaluar(cli, TXT('#mview-inicio'));
  chk('no hay «S41» ni «Semana actual»', !/\bS\d{1,2}\b/.test(hoy) && !/semana actual/i.test(hoy), hoy.slice(0, 200));
  chk('no hay «Semana 40»', !/Semana \d/.test(hoy), (hoy.match(/Semana \d+/) || [])[0]);
  const tit = await evaluar(cli, TXT('#obj-card .ob-t'));
  const a = iso(lunOff).split('-'), b = iso(lunOff + 6).split('-');
  const esperado = 'Semana del ' + Number(a[2]) + (a[1] === b[1] ? '' : '/' + Number(a[1])) + ' al ' + Number(b[2]) + '/' + Number(b[1]);
  chk('el objetivo dice «' + esperado + '»', tit.indexOf(esperado) >= 0, tit);
  const greet = await evaluar(cli, `Math.round(document.getElementById('venc-card').getBoundingClientRect().top + scrollY)`);
  chk('lo primero arranca arriba (< 260 px)', greet < 260, greet);

  console.log('\n== 3. Lo vencido, antes que el objetivo ==');
  const orden = await evaluar(cli, `(function(){var v=document.getElementById('venc-card'),o=document.getElementById('obj-card'); return {venc:!v.classList.contains('hidden'), arriba: v.getBoundingClientRect().top < o.getBoundingClientRect().top};})()`);
  chk('la tarjeta de vencidos esta y va primero', orden.venc === true && orden.arriba === true, orden);

  console.log('\n== 4. El objetivo en una pantalla ==');
  const f = await evaluar(cli, `(function(){var c=document.getElementById('obj-card'); var g=document.getElementById('ob-guardar');
    var nav=document.querySelector('.main-tabs'); var navH=nav?nav.getBoundingClientRect().height:0;
    var top=c.getBoundingClientRect().top; window.scrollTo(0, top + scrollY - 60);
    var r=g?g.getBoundingClientRect():null;
    return {hayForm:!!g, txt:g?g.textContent:'', sug:c.querySelectorAll('.ob-sug').length, on:c.querySelectorAll('.ob-sug.on').length,
      alto: r ? Math.round(r.bottom - c.getBoundingClientRect().top) : 0, disp: Math.round(innerHeight - navH - 60),
      btnVisible: r ? (r.top >= 0 && r.bottom <= innerHeight - navH + 1) : false, mas:(c.querySelector('.ob-mas')||{}).textContent||'',
      input: !!document.getElementById('ob-libre-in'), poner: /Poner mi objetivo/.test(c.innerText)};})()`);
  chk('el vendedor ve el formulario directo (sin el boton «Poner mi objetivo»)', f.hayForm === true && f.poner === false && /Arrancar la semana/.test(f.txt), f);
  chk('3 acciones a la vista y ya tildadas', f.sug === 3 && f.on === 3, f);
  chk('el resto, detras de «Ver 4 más»', /Ver 4 más/.test(f.mas), f.mas);
  chk('el texto libre no ocupa lugar hasta que lo pide', f.input === false, f);
  chk('del titulo al boton entra en una pantalla (' + f.alto + ' de ' + f.disp + ' px)', f.alto > 0 && f.alto <= f.disp, f);
  chk('«Arrancar la semana» se ve sin scrollear', f.btnVisible === true, f);
  await evaluar(cli, `redObjMas(); 1`); await T(200);
  const mas = await evaluar(cli, `({sug:document.querySelectorAll('#obj-card .ob-sug').length, btn:(function(){var r=document.getElementById('ob-guardar').getBoundingClientRect(); var n=document.querySelector('.main-tabs'); return r.bottom <= innerHeight - (n?n.getBoundingClientRect().height:0) + 1 && r.top >= 0;})()})`);
  chk('«Ver más» muestra las 7 y el boton sigue a la vista (pegado al pie)', mas.sug === 7 && mas.btn === true, mas);
  await evaluar(cli, `redObjToggle(0); redObjEscribir(); 1`); await T(200);
  const ed = await evaluar(cli, `({on:document.querySelectorAll('#obj-card .ob-sug.on').length, input:!!document.getElementById('ob-libre-in')})`);
  chk('destildar no la vuelve a tildar, y «Escribir otra» abre el campo', ed.on === 2 && ed.input === true, ed);
  await evaluar(cli, `window.__posts=[]; redObjGuardar(); 1`); await T(600);
  const post = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='redObjetivoSet';})[0]||null`);
  chk('guardar manda las 2 tildadas', !!post && post.acciones.length === 2 && post.meta === 5, post);

  console.log('\n== 5. Sin objetivos previos: nada de «sin cumplir» ==');
  await cargar(cli, DASH, ancho);
  await evaluar(cli, `redObjCerrar && 1`);
  /* el tablero de logros se ve con objetivo puesto: se simula uno guardado */
  const D2 = JSON.parse(JSON.stringify(DASH)); D2.objetivo.meta = 4; D2.objetivo.lleva = 1;
  await cargar(cli, D2, ancho);
  const lg = await evaluar(cli, TXT('#obj-card'));
  chk('no dice «todavía sin semanas con objetivo»', !/sin semanas con objetivo/.test(lg), lg.slice(0, 300));
  chk('no pinta «sin cumplir» sin haber tenido objetivo', !/sin cumplir/.test(lg), lg.slice(-200));
  chk('dice su mejor semana en una frase', /Tu mejor semana: 5 ventas/.test(lg), lg.slice(0, 300));
  const fechas = await evaluar(cli, `[].map.call(document.querySelectorAll('#obj-card .mk-hist > div > small:last-child'),function(s){return s.textContent;})`);
  chk('cada barra lleva su fecha', fechas.length === 8 && fechas.every(x => /^\d{1,2}\/\d{1,2}$/.test(x)), fechas);
  const D3 = JSON.parse(JSON.stringify(D2)); D3.objetivo.conMeta = 2; D3.objetivo.cumplidas = 1; D3.objetivo.hist[6].meta = 3; D3.objetivo.hist[7].meta = 2;
  await cargar(cli, D3, ancho);
  const lg3 = await evaluar(cli, `({t:${TXT('#obj-card .mk-logros')}, ley:${TXT('#obj-card .mk-ley')}, no:document.querySelectorAll('#obj-card .mk-col.no').length, ok:document.querySelectorAll('#obj-card .mk-col.ok').length})`);
  chk('con objetivos: cuadros y leyenda con lo que hay', /1\/2/.test(lg3.t) && /sin cumplir/.test(lg3.ley) && /sin objetivo/.test(lg3.ley) && lg3.no === 1 && lg3.ok === 1, lg3);

  console.log('\n== 6. El nivel, una sola vez ==');
  await cargar(cli, DASH, ancho);
  const niv = await evaluar(cli, `({esc:${TXT('#escala-card .ec-falta')}, tareas:${TXT('#tareas-card')}, hoy:${TXT('#mview-inicio')}})`);
  chk('la tarjeta del nivel dice pesos y pedidos juntos', /937\.500/.test(niv.esc) && /unos 12 pedidos/.test(niv.esc), niv.esc);
  chk('no hay otra tarjeta con «Te faltan 12 pedidos»', (niv.hoy.match(/Te faltan/g) || []).length === 1, niv.tareas);

  console.log('\n== 7. La plata en Hoy, en chico ==');
  const pl = await evaluar(cli, `({hoyCards:document.querySelectorAll('#mview-inicio .period-card, #mview-inicio .stats-grid, #mview-inicio .prev-months, #mview-inicio .stats-ops').length,
    gan:${TXT('#gan-card')}, enPlata:document.querySelectorAll('#mview-plata .period-card').length, pm:!!document.querySelector('#mview-plata #prev-months')})`);
  chk('Hoy no tiene las tarjetas de montos', pl.hoyCards === 0, pl);
  chk('Hoy muestra la ganancia de la semana y del mes', /9\.000/.test(pl.gan) && /66\.100/.test(pl.gan) && /Octubre/.test(pl.gan), pl.gan);
  chk('el detalle esta en Plata', pl.enPlata === 2 && pl.pm === true, pl);
  await evaluar(cli, `document.getElementById('gan-card').click(); 1`); await T(400);
  chk('tocar la ganancia lleva a Plata', await evaluar(cli, `!document.getElementById('mview-plata').classList.contains('hidden')`) === true);

  console.log('\n== 8. El desglose, solo semanas con pedidos ==');
  await evaluar(cli, `toggleWeeks('actual'); togglePrevMonths(); 1`); await T(300);
  const wk = await evaluar(cli, `[].map.call(document.querySelectorAll('#plata-numeros .week-row'),function(e){return (e.innerText||'').replace(/\\s+/g,' ');})`);
  chk('octubre: 1 semana (las de $0 no)', wk.filter(x => /pedidos?/.test(x)).length >= 1 && !wk.some(x => /\b0 pedidos/.test(x)), wk);
  chk('las semanas dicen la fecha, no el numero', wk.length > 0 && wk.every(x => /Semana del /.test(x) && !/Semana \d/.test(x)), wk);
  await evaluar(cli, `setPlataSub('pagos'); 1`); await T(400);
  const pg = await evaluar(cli, TXT('#mview-plata'));
  chk('Pagos a Maleu: «Semana del …», sin «Semana 40»', /Semana del /.test(pg) && !/Semana \d/.test(pg), pg.slice(0, 300));
  chk('«Tus números» no repite «Por liquidar a Maleu» (lo dice Caja, regla del 7/10)', !/Por liquidar a Maleu/.test(pg) && (await evaluar(cli, `!document.getElementById('stats-ops')`)) === true, pg.slice(-200));
  await evaluar(cli, `setPlataSub('caja'); 1`);
  await evaluar(cli, `setMainTab('hoy'); 1`);

  console.log('\n== 9. Pedidos dice de cuando son ==');
  await evaluar(cli, `setMainTab('pedidos'); 1`); await T(400);
  const rt = await evaluar(cli, TXT('#ruta-title'));
  chk('«Pendientes del ' + Number(FE_VIEJA.slice(8)) + '/' + Number(FE_VIEJA.slice(5, 7)) + '», no «de esta semana»', rt.indexOf('Pendientes del ' + Number(FE_VIEJA.slice(8)) + '/' + Number(FE_VIEJA.slice(5, 7))) >= 0, rt);
  await evaluar(cli, `setMainTab('hoy'); 1`);

  const errs = await evaluar(cli, 'window.__err');
  chk('sin errores de JS', errs.length === 0, errs);
}

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    for (const w of [390, 1440]) await pasada(cli, w);
  } catch (e) { mal++; console.log('  MAL  revento: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
