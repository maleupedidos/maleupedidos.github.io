/* Ruta > COBROS: los pedidos de un EVENTO, item por item y con quien paga. (26/10/2026)

     node _tools/servir.js <puerto>     (en otra terminal)
     BASE=http://localhost:<puerto> node _tools/pruebas/probar_cobros_evento.js [ancho] [archivo]
     ... probar_cobros_evento.js 390 ruta_viejo_tmp.html   <- la contraria, rojo

   El caso real: un asado del 24/10. Lo pagaba quien invitaba, que no es el cliente
   de ninguno de los pedidos: el suyo (una casa) entero y, del pedido de una
   invitada (otra casa), solo la torta; lo demas lo paga ella.

   Sostiene:
   · los pedidos del mismo evento («Grupal») van en UNA tarjeta, aunque sean de dos
     casas; el de la misma casa que NO es del evento queda aparte;
   · cada pedido del evento se puede abrir y tildar renglon por renglon, con su
     precio; el boton cobra lo tildado y dice lo que queda a nombre de quien lo pidio;
   · «¿Quién paga?» llega al cuadro y a cada cobro de la operacion («Pagó»);
   · el cuadro cobra entero el pedido entero (`marcarCobrado`) y la parte como un
     pago a cuenta (`cobrarParcial`) con sus items escritos, los dos con el MISMO
     `opCobro`; el billete va una sola vez;
   · lo no tildado sigue pendiente, a nombre de la invitada;
   · solo items, sin pedido entero: el billete va en la parte;
   · nada se sale de la pantalla y los renglones se pueden tocar (≥ 44 px).

   Nombres inventados: este repo es público. Los POST se interceptan. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'ruta.html';
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 600) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

const EV = 'Asado Prueba 24/10';
const c = o => Object.assign({ totalOriginal: o.$, cobradoParcial: 0, parciales: [], es: 'Entregado', env: 0, desc: 0, sub: o.$, fp: 'Efectivo',
  de: 'Sábado', fe: '24/10/2026', fePed: '24/10/2026', r: Number(o.id) }, o);
const COBROS = [
  c({ key: 'Home|7201', h: 'Home', id: '7201', c: 'Anfitrion Prueba', cn: 'Anfitrion Prueba', $: 40000, p: [{ a: 'PPM', q: 2 }],
      ck: 'c:barrio prueba|sub alto|289', t: '1150000289', grp: EV }),
  c({ key: 'Home|7202', h: 'Home', id: '7202', c: 'Invitada Prueba', cn: 'Invitada Prueba', $: 44000, p: [{ a: 'TLC', q: 1 }, { a: 'F', q: 2 }],
      ck: 'c:barrio prueba|sub alto|290', t: '1150000290', grp: EV }),
  /* Misma casa que el anfitrion, pero otra compra: NO va en el evento. */
  c({ key: 'Home|7203', h: 'Home', id: '7203', c: 'Hijo Prueba', cn: 'Anfitrion Prueba', $: 28000, p: [{ a: 'PPM', q: 1 }],
      ck: 'c:barrio prueba|sub alto|289', t: '1150000999', de: 'Domingo', fe: '25/10/2026', fePed: '25/10/2026' })
];
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Cuenta Prueba', tipo: 'digital', col: 3, alias: 'aliasprueba', banco: 'Banco', def: true, inv: true }
];
const PRECIOS = { PPM: { p: 20000, c: 11000 }, TLC: { p: 26000, c: 15000 }, F: { p: 9000, c: 5000 } };
const PREP = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  try{localStorage.clear();}catch(e){}
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST'){ var bd={}; try{bd=JSON.parse(o.body);}catch(e){} window.__posts.push(bd);
      return J(bd.action==='cobrarParcial'?{ok:true,restante:18000,cerrado:false}:{ok:true}); }
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:[],cuentas:${JSON.stringify(CUENTAS)},arm:{},rep:{},hechas:[]});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:window.__cobros||${JSON.stringify(COBROS)},billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)},
      prods:{PPM:{n:'Pack Prueba',u:'u'},TLC:{n:'Torta Lemon Crumble',u:'u'},F:{n:'Franui Leche',u:'u'}}});
    if(url.indexOf('action=precios')>-1) return J(${JSON.stringify(PRECIOS)});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();`;

const CARD = `[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter(function(x){return /#7201/.test(x.textContent);})[0]`;
const LEER = `(function(){
  var k=${CARD}; if(!k)return {n:document.querySelectorAll('#cobrosContent .cobro-card').length};
  var vw=document.documentElement.clientWidth, r=k.getBoundingClientRect();
  var rows=[].slice.call(k.querySelectorAll('.cg-row'));
  var itms=[].slice.call(k.querySelectorAll('.cg-itm-r'));
  var bs=[].slice.call(k.querySelectorAll('button,input')).filter(function(b){return b.getBoundingClientRect().width>0;});
  var cob=bs.filter(function(b){return /cobGrpCobrar/.test(b.getAttribute('onclick')||'');})[0];
  return { n:document.querySelectorAll('#cobrosContent .cobro-card').length, txt:k.textContent.replace(/\\s+/g,' '),
    nom:(k.querySelector('.cg-nom')||{}).textContent||'',
    ids: rows.map(function(x){return (x.textContent.match(/#(\\d+)/)||[])[1];}),
    itms: itms.map(function(x){return {t:x.textContent.replace(/\\s+/g,' ').trim(),on:x.getAttribute('aria-checked')==='true',h:Math.round(x.getBoundingClientRect().height)};}),
    pagador: !!k.querySelector('input[oninput*="cobPagadorInput"]'),
    boton: cob?{txt:cob.textContent.trim(),dis:!!cob.disabled}:null,
    resto: (k.querySelector('.cg-resto')||{}).textContent||'',
    afuera: bs.filter(function(b){var q=b.getBoundingClientRect();return q.right>r.right+1||q.left<r.left-1;}).length,
    der: Math.round(r.right), vw: vw, sw: document.documentElement.scrollWidth };
})()`;
const CLICK = sel => `(function(){var k=${CARD};var b=k&&k.querySelector(${JSON.stringify(sel)});if(b)b.click();return !!b;})()`;
const ITEM = a => `(function(){var k=${CARD};var b=k&&k.querySelector('.cg-itm-r[data-a="${a}"]');if(b)b.click();return !!b;})()`;
const PAGADOR = n => `(function(){var k=${CARD};var i=k&&k.querySelector('input[oninput*="cobPagadorInput"]');if(!i)return false;i.value=${JSON.stringify(n)};i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`;
const ESTADO = `(function(){try{var s=_cobroRutaState;if(!s)return null;
  return {combo:!!s.combo,ids:(s.pedidos||[]).map(function(p){return String(p.id);}),parc:(s.parcItems||[]).map(function(x){return {id:String(x.p.id),m:x.monto,t:x.txt};}),
    pagador:s.pagador||'',total:s.total,fp:s.fp||'',titulo:(document.getElementById('cobroRutaTitle')||{}).textContent||'',
    sub:(document.getElementById('cobroRutaSub')||{}).textContent||'',prods:((document.getElementById('cobroRutaProds')||{}).textContent||'').replace(/\\s+/g,' '),
    ef:(document.getElementById('cobroRecEf')||{}).value||''};}catch(e){return {err:String(e)};}})()`;
const pesos = n => '$' + Math.round(n).toLocaleString('es-AR');

async function abrirLista(cli) {
  /* La marca se va con la pagina vieja: sin esto, la segunda vuelta seguia sobre la
     pagina del caso anterior (su cuadro, su estado) mientras la nueva cargaba. */
  await ev(cli, `window.__vieja=1`);
  await cli.enviar('Page.navigate', { url: BASE });
  if (!await esperar(cli, "!window.__vieja && typeof switchTab==='function' && typeof abrirCobroComboCobros==='function'")) throw new Error('la sub-app no arranco');
  await pausa(600);
  await ev(cli, `switchTab('cobros')`);
  if (!await esperar(cli, `/#7201/.test((document.getElementById('cobrosContent')||{}).textContent||'')`, 20000)) throw new Error('COBROS no pinto el evento');
  await pausa(700);
}
async function confirmar(cli) {
  await ev(cli, `(function(){_setMoneyInput('cobroRecEf',66000);_setMoneyInput('cobroRecMP',0);_recalcCobroRuta();return 1;})()`);
  await pausa(300);
  const b = await ev(cli, `(function(){var b=document.getElementById('btnCobroRutaOk');return {dis:b.disabled,txt:b.textContent};})()`);
  await ev(cli, `confirmarCobroRuta()`);
  await esperar(cli, `window.__posts.filter(function(p){return /marcarCobrado|cobrarParcial/.test(p.action);}).length>0`, 15000);
  await pausa(1500);
  return b;
}

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    console.log('\n== Ruta > COBROS: un evento · ' + ARCH + ' · ' + ANCHO + 'px ==');
    await abrirLista(cli);

    console.log('\n-- la tarjeta del evento --');
    let L = await ev(cli, LEER);
    chk('una tarjeta con el nombre del evento', /Asado Prueba 24\/10/.test(L.nom || ''), L.nom);
    chk('con los 2 pedidos del evento, de 2 casas', JSON.stringify((L.ids || []).slice().sort()) === '["7201","7202"]', L.ids);
    chk('el de la misma casa que no es del evento va aparte', !/#7203/.test(L.txt || '') && L.n === 2, { n: L.n });
    chk('pregunta quién paga', L.pagador === true);
    chk('dice a nombre de quién está cada pedido', /a nombre de Invitada Prueba/.test(L.txt || '') && /a nombre de Anfitrion Prueba/.test(L.txt || ''), (L.txt || '').slice(0, 300));
    chk('el botón ofrece cobrar los 2', !!L.boton && /Cobrar los 2/.test(L.boton.txt) && L.boton.txt.indexOf(pesos(84000)) >= 0, L.boton);

    console.log('\n-- item por item --');
    const abrio = await ev(cli, `(function(){var k=${CARD};var b=[].slice.call(k.querySelectorAll('.cg-itm-abrir button')).filter(function(x){return x.getAttribute('data-k')==='Home|7202';})[0];if(b)b.click();return !!b;})()`);
    chk('«Pagar solo algunos ítems» en el pedido de la invitada', abrio === true, abrio);
    L = await ev(cli, LEER);
    chk('aparecen sus 2 renglones, con precio y tildados', (L.itms || []).length === 2 && L.itms.every(x => x.on) && /Torta Lemon/.test(L.itms[0].t + L.itms[1].t) && /\$26\.000/.test(L.itms.map(x => x.t).join(' ')) && /\$18\.000/.test(L.itms.map(x => x.t).join(' ')), L.itms);
    chk('los renglones se pueden tocar (≥ 44 px)', (L.itms || []).every(x => x.h >= 44), (L.itms || []).map(x => x.h));
    await ev(cli, ITEM('F'));
    L = await ev(cli, LEER);
    chk('destildar los Franui: cobra el pedido entero + la torta', !!L.boton && /Cobrar lo tildado/.test(L.boton.txt) && L.boton.txt.indexOf(pesos(66000)) >= 0, L.boton);
    chk('y dice que lo demás queda a nombre de quien lo pidió', L.resto.indexOf(pesos(18000)) >= 0 && /a nombre de quien lo pidió/.test(L.resto), L.resto);
    chk('nada se sale de la tarjeta ni de la pantalla', L.afuera === 0 && L.der <= L.vw + 1 && L.sw <= L.vw + 1, { a: L.afuera, der: L.der, vw: L.vw, sw: L.sw });
    await ev(cli, PAGADOR('Padrino Prueba'));
    await ev(cli, `(function(){var el=document.getElementById('cobrosContent');el.__sig=null;renderCobrosFromServer();return 1;})()`);
    await pausa(400);
    L = await ev(cli, LEER);
    chk('lo tildado y quién paga sobreviven al repintado', L.boton && L.boton.txt.indexOf(pesos(66000)) >= 0 && (L.itms || []).length === 2 && !L.itms.filter(x => /Franui/.test(x.t))[0].on, L.itms);

    console.log('\n-- el cuadro --');
    await ev(cli, CLICK('.cg-cobrar'));
    await pausa(800);
    let S = await ev(cli, ESTADO);
    chk('abre el cuadro combinado: el pedido entero y la parte', S && S.combo && JSON.stringify(S.ids) === '["7201"]' && S.parc.length === 1 && S.parc[0].id === '7202' && S.parc[0].m === 26000, S);
    chk('el total es lo tildado', S && Math.round(S.total) === 66000, S && S.total);
    chk('el título dice quién paga', /Padrino Prueba/.test(S.titulo || ''), S.titulo);
    chk('el encabezado nombra la parte', /parte de #7202/.test(S.sub || ''), S.sub);
    chk('el detalle trae la torta y no los Franui', /Torta Lemon/.test(S.prods || '') && !/Franui/.test(S.prods || ''), S.prods);
    const bt = await confirmar(cli);
    const P = await ev(cli, `window.__posts.filter(function(p){return /marcarCobrado|cobrarParcial/.test(p.action);})`);
    const mc = (P || []).filter(p => p.action === 'marcarCobrado'), cp = (P || []).filter(p => p.action === 'cobrarParcial');
    chk('un marcarCobrado del pedido entero y un cobrarParcial de la torta', mc.length === 1 && mc[0].id === '7201' && cp.length === 1 && cp[0].id === '7202', { bt: bt, P: P });
    chk('la parte es $26.000 con sus ítems escritos', cp[0] && cp[0].monto === 26000 && /Torta Lemon/.test(cp[0].itemsTxt || '') && !/Franui/.test(cp[0].itemsTxt || ''), cp[0]);
    chk('los dos con el MISMO opCobro', mc[0] && cp[0] && !!mc[0].opCobro && mc[0].opCobro === cp[0].opCobro, { a: mc[0] && mc[0].opCobro, b: cp[0] && cp[0].opCobro });
    chk('los dos dicen quién pagó', mc[0] && cp[0] && mc[0].pagador === 'Padrino Prueba' && cp[0].pagador === 'Padrino Prueba');
    chk('el billete va una sola vez', mc[0] && cp[0] && mc[0].recibidoEf === 66000 && !(cp[0].recibidoEf > 0), { mc: mc[0] && mc[0].recibidoEf, cp: cp[0] && cp[0].recibidoEf });
    chk('el parcial tiene clientOpId (el backend no lo duplica)', cp[0] && /^cp-Home-7202-26000-/.test(cp[0].clientOpId || ''), cp[0] && cp[0].clientOpId);
    /* Lo que queda: la lista del servidor ya sin el 7201 y el 7202 a cuenta. */
    await ev(cli, `(function(){window.__cobros=${JSON.stringify(COBROS)}.filter(function(x){return x.id!=='7201';}).map(function(x){if(x.id==='7202'){x.$=18000;x.cobradoParcial=26000;}return x;});return 1;})()`);
    await ev(cli, `fetchCobrosPendientes(true)`);
    await pausa(1200);
    const txt = await ev(cli, `((document.getElementById('cobrosContent')||{}).textContent||'').replace(/\\s+/g,' ')`);
    chk('queda la invitada con $18.000, a su nombre', /#7202/.test(txt) && txt.indexOf(pesos(18000)) >= 0 && /Invitada Prueba/.test(txt) && /ya pagó \$26\.000 a cuenta/.test(txt), txt.slice(0, 400));

    console.log('\n-- solo ítems, sin pedido entero --');
    await abrirLista(cli);
    await ev(cli, `window.__posts=[]`);
    await ev(cli, `(function(){var k=${CARD};var r=[].slice.call(k.querySelectorAll('.cg-row')).filter(function(x){return /#7201/.test(x.textContent);})[0];r.click();return 1;})()`);
    await pausa(300);
    await ev(cli, `(function(){var k=${CARD};var b=[].slice.call(k.querySelectorAll('.cg-itm-abrir button')).filter(function(x){return x.getAttribute('data-k')==='Home|7202';})[0];if(b)b.click();return !!b;})()`);
    await pausa(300);
    await ev(cli, ITEM('F'));
    await ev(cli, PAGADOR('Padrino Prueba'));
    L = await ev(cli, LEER);
    chk('el botón cobra solo la torta', L.boton && L.boton.txt.indexOf(pesos(26000)) >= 0, L.boton);
    await ev(cli, CLICK('.cg-cobrar'));
    await pausa(800);
    S = await ev(cli, ESTADO);
    chk('el cuadro abre sin pedidos enteros', S && S.ids.length === 0 && S.parc.length === 1 && Math.round(S.total) === 26000, S);
    await ev(cli, `(function(){_setMoneyInput('cobroRecEf',26000);_setMoneyInput('cobroRecMP',0);_recalcCobroRuta();return 1;})()`);
    await pausa(300);
    await ev(cli, `confirmarCobroRuta()`);
    await esperar(cli, `window.__posts.filter(function(p){return p.action==='cobrarParcial';}).length>0`, 15000);
    await pausa(800);
    const P2 = await ev(cli, `window.__posts.filter(function(p){return /marcarCobrado|cobrarParcial/.test(p.action);})`);
    chk('un solo cobrarParcial, con el billete', (P2 || []).length === 1 && P2[0].action === 'cobrarParcial' && P2[0].recibidoEf === 26000 && P2[0].monto === 26000 && !!P2[0].opCobro, P2);

    const errs = await ev(cli, `window.__errores`);
    chk('sin errores de JS', Array.isArray(errs) && errs.length === 0, errs);
  } catch (e) { mal++; console.log('  MAL  se cortó: ' + (e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
