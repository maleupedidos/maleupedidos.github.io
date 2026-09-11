/* Una PARADA: el mismo cliente, el mismo dia, el mismo lugar (11/9/2026).

   node probar_parada.js <token> [390|1440]

   Tadeo: "vicky fernandez aparece 2 veces para entregar hoy... deberiamos
   juntarlos como lo juntaste solo el de Tadeo Chiesa". Tenia dos pedidos para el
   mismo viernes y uno se habia cargado SIN direccion (sub-barrio = el barrio, sin
   lote). RUTA los juntaba por telefono, pero ARMADO arma una bolsa por
   sub-barrio: aparecia dos veces. Y la card de RUTA mostraba la direccion del que
   hubiera quedado primero.

   Corre sobre el ERP FUSIONADO con la sesion real y `action=entregas` STUBBEADO,
   con datos INVENTADOS (este repo es publico). Los POST van interceptados.

   Mide:
   · RUTA: una parada por cliente+dia+lugar; la del pedido sin direccion toma la
     direccion completa y se ORDENA por ella; dos direcciones completas del mismo
     cliente el mismo dia son DOS paradas; la clave del combo de siempre no cambia
     (ahi cuelgan las propinas y los cobros locales);
   · ARMADO: una bolsa por parada, en la seccion de su sub-barrio, y el contador
     del dia contando esas mismas bolsas. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(300); }
  return false;
};

const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOY = iso(hoyAR), HOYd = dmy(hoyAR), DIA = DIAS[hoyAR.getDay()];
const EP = 'Estancias del Pilar';
const base = (o) => Object.assign({ oD: {}, oc: [], hr: '10:30', f: HOYd, de: DIA, fe: HOY, es: 'Pendiente', t: '', ep: 'No Cobrado', fp: 'Transferencia', o: 'Deposito', b: EP }, o);
const dir = (sb, l) => (sb && sb !== EP ? sb : EP) + (l ? ' · Lote ' + l : '');

const TV = '1141440000', TC = '1123120000', TD = '1150500000';
const ENTREGAS = [
  // Vicky: el pedido SIN direccion va PRIMERO en la lista a proposito
  base({ id: 9202, h: 'Home', r: 9202, c: 'Prueba Vicky', t: TV, sb: EP, l: '', d: dir('', ''), hr: '17:11', $: 21240, p: [{ a: 'PPM', q: 1 }] }),
  base({ id: 9201, h: 'Home', r: 9201, c: 'Prueba Vicky', t: TV, sb: 'La Pionera', l: '72', d: dir('La Pionera', '72'), hr: '12:33', $: 84600, p: [{ a: 'PMu', q: 2 }] }),
  // Chiesa: la misma direccion dos veces (el caso que ya andaba)
  base({ id: 9203, h: 'Home', r: 9203, c: 'Prueba Chiesa', t: TC, sb: 'La Paz', l: '130', d: dir('La Paz', '130'), $: 228510, p: [{ a: 'PPM', q: 4 }] }),
  base({ id: 9204, h: 'Home', r: 9204, c: 'Prueba Chiesa', t: TC, sb: 'La Paz', l: '130', d: dir('La Paz', '130'), hr: '10:15', $: 17000, p: [{ a: 'PPJyQ', q: 1 }] }),
  // Dos casas: el mismo telefono, dos direcciones COMPLETAS -> dos paradas;
  // y un tercer pedido sin direccion, que va con la primera
  base({ id: 9205, h: 'Home', r: 9205, c: 'Prueba Dos Casas', t: TD, sb: 'Golf', l: '10', d: dir('Golf', '10'), $: 30000, p: [{ a: 'PMa', q: 1 }] }),
  base({ id: 9206, h: 'Home', r: 9206, c: 'Prueba Dos Casas', t: TD, sb: 'La Pionera', l: '20', d: dir('La Pionera', '20'), $: 25000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9207, h: 'Home', r: 9207, c: 'Prueba Dos Casas', t: TD, sb: EP, l: '', d: dir('', ''), $: 5000, p: [{ a: 'EJyQ', q: 1 }] }),
  // Sola: sin direccion y sin nadie con quien juntarse -> queda como esta
  base({ id: 9208, h: 'Home', r: 9208, c: 'Prueba Sola', t: '1160600000', sb: EP, l: '', d: dir('', ''), $: 11000, p: [{ a: 'PMa', q: 1 }] }),
  // Sin telefono: se junta por nombre
  base({ id: 9209, h: 'Home', r: 9209, c: 'Prueba Sin Tel', sb: 'Argentina 1', l: '5', d: dir('Argentina 1', '5'), $: 12000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9210, h: 'Home', r: 9210, c: 'Prueba Sin Tel', sb: EP, l: '', d: dir('', ''), $: 8000, p: [{ a: 'ECaC', q: 1 }] }),
];
const ARMAR = ENTREGAS.map(e => 'Home|R' + e.r);

const EXTRA = `
  window.__posts=[]; window.__errores=[];
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(x && String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    if(url.indexOf('action=entregas')>-1){
      return Promise.resolve(new Response(JSON.stringify({ts:Date.now(), e:${JSON.stringify(ENTREGAS)}}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    if(url.indexOf('action=pendientesGuardarStock')>-1){
      return Promise.resolve(new Response(JSON.stringify({ok:true,items:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    return o.apply(this,arguments);};})();
  window.__confirmDevuelve=true;
  window.confirm=function(){ return true; };
  try{ localStorage.removeItem('maleu_ruta'); localStorage.removeItem('maleu_ruta_orden_modo'); }catch(e){}
`;

/* Las bolsas de ARMADO del dia de hoy: por seccion de sub-barrio. */
const BOLSAS = `(function(){
  var dc=document.querySelector('.armado-day-content[data-collapse-key="dia:${HOY}"]');
  if(!dc) return null;
  var out=[];
  [].forEach.call(dc.querySelectorAll('.armado-cards'),function(box){
    var h=box.previousElementSibling, sb='_main';
    if(h&&h.classList.contains('armado-subbarrio')) sb=(h.firstChild&&h.firstChild.textContent||'').trim();
    [].forEach.call(box.querySelectorAll('.armado-card'),function(c){
      out.push({sb:sb, nom:((c.querySelector('.armado-name')||{}).firstChild||{}).textContent||'', lote:(c.querySelector('.armado-lote')||{}).textContent||''});
    });
  });
  var cnt=(document.querySelector('.armado-day-header[data-collapse-key="dia:${HOY}"] .day-count')||{}).textContent||'';
  return {bolsas:out, cnt:cnt};
})()`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== Una parada por cliente, dia y lugar · ' + ANCHO + 'px ===');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arranco'); process.exit(1); }
  await evaluar(cli, 'go("ruta")');
  if (!await esperar(cli, '(function(){try{return getPendientes().length===' + ENTREGAS.length + '}catch(e){return false}})()', 60000)) {
    console.log('no llegaron las entregas stubbeadas'); process.exit(1);
  }
  for (const k of ARMAR) await evaluar(cli, 'confirmarArmado(' + JSON.stringify(k) + ')');
  await pausa(500);

  // ── RUTA ──
  const S = await evaluar(cli, `getSorted().map(function(e){return {c:e.c, combo:!!e._combo, n:e._combo?e._pedidos.length:1, sb:e.sb, l:e.l, d:e.d, key:e._key||'', ids:String(e.id)};})`);
  const de = (nom) => S.filter(x => x.c === nom);
  chk('RUTA: 6 paradas (Vicky 1, Chiesa 1, Dos Casas 2, Sola 1, Sin Tel 1)', S.length === 6, S.map(x => x.c + ':' + x.n));
  const v = de('Prueba Vicky');
  chk('Vicky es UNA parada con sus 2 pedidos', v.length === 1 && v[0].combo && v[0].n === 2, v);
  chk('  y va a la direccion COMPLETA aunque el pedido sin direccion este primero: La Pionera 72', v[0] && v[0].sb === 'La Pionera' && v[0].l === '72' && /La Pionera/.test(v[0].d), v[0]);
  chk('  la clave del combo es la de siempre (tel|dia): no pierde propinas ni cobros locales', v[0] && v[0].key === 'combo|' + TV + '|' + HOY, v[0] && v[0].key);
  const c = de('Prueba Chiesa');
  chk('Chiesa sigue siendo UNA parada con 2 pedidos, con la clave de siempre', c.length === 1 && c[0].n === 2 && c[0].key === 'combo|' + TC + '|' + HOY, c);
  const d2 = de('Prueba Dos Casas');
  chk('Dos Casas: dos direcciones completas el mismo dia son DOS paradas', d2.length === 2, d2);
  const golf = d2.find(x => x.sb === 'Golf'), pio = d2.find(x => x.sb === 'La Pionera');
  chk('  Golf 10 junta al pedido sin direccion (2 pedidos)', golf && golf.n === 2 && golf.l === '10', golf);
  chk('  La Pionera 20 va sola', pio && pio.n === 1 && pio.l === '20', pio);
  chk('  cada una con su propia clave', golf && pio && golf.key !== pio.key, d2.map(x => x.key));
  const s1 = de('Prueba Sola');
  chk('Sola: sin direccion y sin nadie con quien juntarse, queda como esta', s1.length === 1 && s1[0].n === 1 && s1[0].sb === EP, s1);
  const st = de('Prueba Sin Tel');
  chk('Sin telefono: se junta por nombre y toma Argentina 1 lote 5', st.length === 1 && st[0].n === 2 && st[0].sb === 'Argentina 1' && st[0].l === '5', st);
  const orden = S.map(x => (x.sb || '') + ' ' + (x.l || ''));
  const esperado = ['Argentina 1 5', EP + ' ', 'Golf 10', 'La Paz 130', 'La Pionera 20', 'La Pionera 72'];
  chk('RUTA ordena por donde se ENTREGA: Vicky va con La Pionera, no al principio del barrio', JSON.stringify(orden) === JSON.stringify(esperado), orden);

  // La card de Vicky en RUTA
  let ir = false;
  for (let i = 0; i < 8; i++) {
    if (await evaluar(cli, `(document.getElementById('rutaBody').innerText||'').indexOf('Prueba Vicky')>-1`)) { ir = true; break; }
    await evaluar(cli, 'rutaNext()'); await pausa(150);
  }
  chk('se llega a la parada de Vicky', ir);
  const card = await evaluar(cli, `(function(){var b=document.getElementById('rutaBody');var l=b.querySelector('.rtc-lote b');return {txt:(b.innerText||'').replace(/\\s+/g,' '), lote:l?l.textContent:''};})()`);
  chk('  la card dice el lote 72 en grande y La Pionera', card.lote === '72' && /LA PIONERA|La Pionera/.test(card.txt), card.txt.slice(0, 160));
  chk('  y nombra los dos pedidos', /#9202/.test(card.txt) && /#9201/.test(card.txt), card.txt.slice(0, 200));

  // ── ARMADO ──
  await evaluar(cli, 'switchTab("armado")');
  await pausa(600);
  const A = await evaluar(cli, BOLSAS);
  chk('ARMADO pinta el dia de hoy', !!A && A.bolsas.length > 0, A);
  const bv = A.bolsas.filter(x => x.nom === 'Prueba Vicky');
  chk('ARMADO: Vicky es UNA bolsa', bv.length === 1, bv);
  chk('  en la seccion La Pionera, con "Lote 72 · 2 pedidos"', bv[0] && bv[0].sb === 'La Pionera' && /Lote 72/.test(bv[0].lote) && /2 pedidos/.test(bv[0].lote), bv[0]);
  chk('Chiesa: una bolsa con 2 pedidos', A.bolsas.filter(x => x.nom === 'Prueba Chiesa').length === 1, A.bolsas.filter(x => x.nom === 'Prueba Chiesa'));
  const bd = A.bolsas.filter(x => x.nom === 'Prueba Dos Casas');
  chk('Dos Casas: dos bolsas, una en Golf (2 pedidos) y una en La Pionera', bd.length === 2 && bd.some(x => x.sb === 'Golf' && /2 pedidos/.test(x.lote)) && bd.some(x => x.sb === 'La Pionera'), bd);
  chk('Sin Tel: una bolsa, en Argentina 1', A.bolsas.filter(x => x.nom === 'Prueba Sin Tel').length === 1 && A.bolsas.some(x => x.nom === 'Prueba Sin Tel' && x.sb === 'Argentina 1'), A.bolsas.filter(x => x.nom === 'Prueba Sin Tel'));
  chk('ARMADO tiene tantas bolsas como RUTA paradas (6)', A.bolsas.length === 6, A.bolsas.map(x => x.nom + '@' + x.sb));
  const cuenta = await evaluar(cli, `_armCuenta(getHoyPendientes())`);
  chk('el contador del dia cuenta esas mismas 6 bolsas', cuenta.bolsas === 6 && /6\/6/.test(A.cnt), { cuenta, cnt: A.cnt });
  chk('ni un error de JS', (await evaluar(cli, 'window.__errores')).length === 0, await evaluar(cli, 'window.__errores'));

  console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal');
  cli.cerrar && cli.cerrar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
