/* RUTA: repartir las entregas entre DOS celulares (12/9/2026).

   node probar_reparto.js <token> [390|1440]

   Tadeo: "podamos dividirnos las entregas por su barrio... seleccionar los
   clientes que queramos para hacer una ruta mucho mas eficiente". Tadeo y Lucas
   salen a la vez, cada uno con su auto.

   Abre DOS Chrome (A = Tadeo, B = Lucas) contra UN backend simulado que vive en
   este proceso (CDP `Fetch`): lo que reparte un celular lo lee el otro, igual que
   en la planilla. Ningun POST llega a produccion.

   Lo que sostiene:
     · A reparte un barrio entero de un toque, y una parada suelta;
     · tocar de nuevo la saca; un barrio repartido entre dos dice "Varios";
     · B lo ve SOLO (sin tocar ↻) y en "Mías" ve SOLO lo suyo;
     · lo que B saca, A lo pierde;
     · ARMADO dice en que auto va la bolsa;
     · lo que nadie se lleva no desaparece: "N sin repartir";
     · un backend sin el campo `rep` no le borra el reparto a nadie.

   Los datos son INVENTADOS: este repo es publico. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

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
async function esperar(cli, expr, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return Date.now() - t0; } catch (e) {} await pausa(250); }
  return -1;
}

const hoyAR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dmy = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/* ── EL BACKEND COMPARTIDO ─────────────────────────────────────────────── */
/* 100% Orden de Compra para entrar a RUTA sin ARMADO, salvo la bolsa de
   "Con Bolsa", que sale del freezer y esta armada: es la que prueba la marca
   de ARMADO. */
const base = o => Object.assign({ oD: {}, oc: [], hr: '10:30', f: dmy(hoyAR), de: DIAS[hoyAR.getDay()], fe: iso(hoyAR),
  es: 'Pendiente', d: '', ep: 'No Cobrado', fp: 'Efectivo', o: 'Orden de Compra', b: 'Estancias del Pilar', p: [{ a: 'PMu', q: 1 }] }, o);
let ENT = [
  base({ id: 9701, h: 'Home', r: 9701, c: 'Golf Uno', t: '1158000001', sb: 'Golf', l: '10', $: 12000 }),
  base({ id: 9702, h: 'Home', r: 9702, c: 'Golf Dos', t: '1158000002', sb: 'Golf', l: '20', $: 13000 }),
  base({ id: 9703, h: 'Home', r: 9703, c: 'Alto Uno', t: '1158000003', sb: 'Champagnat Alto', l: '30', $: 14000 }),
  base({ id: 9704, h: 'Home', r: 9704, c: 'Con Bolsa', t: '1158000004', sb: 'Champagnat Alto', l: '40', $: 15000, o: 'Deposito' }),
  base({ id: 9705, h: 'Home', r: 9705, c: 'Combo Pionera', t: '1158000005', sb: 'La Pionera', l: '50', $: 9000 }),
  base({ id: 9706, h: 'Home', r: 9706, c: 'Combo Pionera', t: '1158000005', sb: 'La Pionera', l: '50', $: 7000 }),
  base({ id: 9707, h: 'Pilar', r: 9707, c: 'Pilara Uno', t: '1158000007', b: 'Pilar', sb: 'Pilara', l: '70', $: 16000 })
];
const REPS = ['Tadeo Ustariz', 'Lucas Moresco', 'Santos Bullrich'];
const clave = p => p.h + '|' + p.id + '|' + String(p.c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const armado = { [clave(ENT[3])]: { u: 'Tadeo Ustariz', hr: '18:00' } };
const reparto = {};                      // clave -> {q, u}
const posts = [];
const SRV = { demoraGet: 900, demoraPost: 700, sinRep: false };
function mapa(src) { const out = {}; ENT.forEach(e => { const x = src[clave(e)]; if (x) out[e.h + '|R' + e.r] = x; }); return out; }
function b64(o) { return Buffer.from(JSON.stringify(o)).toString('base64'); }
async function responder(cli, id, obj, demora) {
  if (demora) await pausa(demora);
  try {
    await cli.enviar('Fetch.fulfillRequest', { requestId: id, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
      body: b64(obj) });
  } catch (e) {}
}
function engancharBackend(cli, quien) {
  cli.escuchar(async (metodo, p) => {
    if (metodo !== 'Fetch.requestPaused') return;
    const url = p.request.url, id = p.requestId;
    if (p.request.method === 'POST') {
      let b = {}; try { b = JSON.parse(p.request.postData || '{}'); } catch (e) {}
      /* Sin el token: si un chequeo falla, imprime el POST entero. */
      posts.push(Object.assign({ _de: quien, _t: Date.now() }, b, { token: undefined }));
      await pausa(SRV.demoraPost);
      if (b.action === 'asignarReparto') {
        (b.pedidos || []).forEach(x => { const k = clave(x); if (b.quien) reparto[k] = { q: b.quien, u: quien === 'A' ? 'Tadeo Ustariz' : 'Lucas Moresco', hr: '18:30' }; else delete reparto[k]; });
      } else if (b.action === 'marcarArmado') {
        (b.pedidos || []).forEach(x => { const k = clave(x); if (b.armado) armado[k] = { u: 'x', hr: '18:30' }; else delete armado[k]; });
      }
      return responder(cli, id, { ok: true, n: (b.pedidos || []).length, escritos: (b.pedidos || []).length });
    }
    if (/action=entregas/.test(url)) {
      const foto = { ts: Date.now(), e: JSON.parse(JSON.stringify(ENT)), cuentas: [], saldos: {}, arm: mapa(armado), hechas: [] };
      if (!SRV.sinRep) { foto.rep = mapa(reparto); foto.reps = REPS; }
      return responder(cli, id, foto, SRV.demoraGet);
    }
    if (/action=(pendientesGuardarStock)/.test(url)) return responder(cli, id, { ok: true, items: [] });
    if (/action=cobrosPendientes/.test(url)) return responder(cli, id, { ok: true, ts: Date.now(), cobros: [], sinCerrar: [], billetera: 0, cuentas: [], saldos: {} }, SRV.demoraGet);
    try { await cli.enviar('Fetch.continueRequest', { requestId: id }); } catch (e) {}
  });
}
function prep(nombre, usuario) {
  return 'try{if(!sessionStorage.getItem("__repSemb")){'
    + 'localStorage.clear();'
    + 'localStorage.setItem("maleu_token","' + TOKEN + '");'
    + 'localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:"' + usuario + '",rol:"admin",nombre:"' + nombre + '",ts:Date.now()}));'
    + 'sessionStorage.setItem("__repSemb","1");}}catch(e){}'
    + 'window.__err=[];window.addEventListener("error",function(e){window.__err.push(String(e.message));});'
    + 'window.__confirmDevuelve=true;window.confirm=function(){return true;};';
}
async function celular(quien, nombre, usuario) {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await cli.enviar('Fetch.enable', { patterns: [{ urlPattern: '*script.google.com*', requestStage: 'Request' }] });
  engancharBackend(cli, quien);
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(nombre, usuario) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (await esperar(cli, 'typeof window.go==="function"', 60000) < 0) throw new Error(quien + ': el ERP no arranco');
  await evaluar(cli, 'go("ruta")');
  if (await esperar(cli, '(function(){try{return getPendientes().length>=' + ENT.length + '}catch(e){return false}})()', 90000) < 0)
    throw new Error(quien + ': no llegaron las entregas');
  return cli;
}

/* Lo guardado: RUT_REP vive en el IIFE de la sub-app, desde afuera se leeria una copia. */
const REP = `(function(){try{var d=JSON.parse(localStorage.getItem('maleu_ruta_reparto')||'{}');return {rep:d.rep||{},reps:d.reps||[],quien:d.quien||''};}catch(e){return {ERROR:String(e.message)};}})()`;
const repDe = k => `(function(){try{var d=JSON.parse(localStorage.getItem('maleu_ruta_reparto')||'{}');var x=(d.rep||{})[${JSON.stringify(k)}];return x?x.q:'';}catch(e){return null;}})()`;
const PANTALLA = `(function(){
  var gs=[].slice.call(document.querySelectorAll('#rutaBody .rep-grupo')).map(function(g){
    var h=g.querySelector('.rep-grupo-h');
    return {z:(h.querySelector('b')||{}).textContent, tag:(h.querySelector('.rep-tag')||{}).textContent,
      filas:[].slice.call(g.querySelectorAll('.rep-fila')).map(function(f){return {c:f.querySelector('b').textContent,tag:f.querySelector('.rep-tag').textContent,alto:Math.round(f.getBoundingClientRect().height)};}),
      alto:Math.round(h.getBoundingClientRect().height)};
  });
  var ps=[].slice.call(document.querySelectorAll('#rutaBody .rep-persona')).map(function(b){return {t:b.textContent.replace(/\\s+/g,' ').trim(),on:b.classList.contains('on'),alto:Math.round(b.getBoundingClientRect().height),der:Math.round(b.getBoundingClientRect().right)};});
  return {titulo:(document.querySelector('#rutaHeader .rtc-stop-n')||{}).textContent||'', sig:(document.querySelector('#rutaHeader .rtc-stop-sig')||{}).textContent||'', grupos:gs, personas:ps};
})()`;
const CHIPS = `[].slice.call(document.querySelectorAll('#rutaResumen .rtc-chip')).map(function(b){return b.textContent.replace(/\\s+/g,' ').trim()+(b.classList.contains('on')?'*':'');})`;
const tocarZona = z => `(function(){var h=[].slice.call(document.querySelectorAll('#rutaBody .rep-grupo-h')).find(function(x){return (x.querySelector('b')||{}).textContent===${JSON.stringify(z)};});if(!h)return false;h.click();return true;})()`;
const tocarFila = c => `(function(){var f=[].slice.call(document.querySelectorAll('#rutaBody .rep-fila')).find(function(x){return x.querySelector('b').textContent===${JSON.stringify(c)};});if(!f)return false;f.click();return true;})()`;
const tocarPersona = n => `(function(){var b=[].slice.call(document.querySelectorAll('#rutaBody .rep-persona')).find(function(x){return x.textContent.indexOf(${JSON.stringify(n)})===0;});if(!b)return false;b.click();return true;})()`;
const VISTA = `_rutaVista().filter(function(e){return !e._redAgg&&!e._depAgg;}).map(function(e){return e.c;})`;

(async () => {
  console.log('\n=== RUTA · repartir entre dos celulares · ' + ANCHO + 'px ===');
  let A, B;
  try {
    A = await celular('A', 'Tadeo Ustariz', 'tadeo');
    B = await celular('B', 'Lucas Moresco', 'luqui');
    await evaluar(A, 'switchTab("ruta")'); await evaluar(B, 'switchTab("ruta")');
    await pausa(1500);
    const N = await evaluar(A, VISTA);
    if (!Array.isArray(N) || N.length !== 6) { console.log('el escenario no armo las 6 paradas: ' + JSON.stringify(N)); process.exit(1); }

    console.log('\n-- 0. antes de repartir');
    let ch = await evaluar(A, CHIPS);
    chk('RUTA ofrece "Repartir"', ch.some(t => /Repartir/.test(t)), ch);
    chk('  y todavia no hay Mías / Todos', !ch.some(t => /^Mías/.test(t)), ch);
    chk('los dos celulares ven las 6 paradas', (await evaluar(B, VISTA)).length === 6);

    console.log('\n-- 1. A abre REPARTIR');
    await evaluar(A, 'rutRepartirAbrir()'); await pausa(400);
    let pa = await evaluar(A, PANTALLA);
    chk('la pantalla se llama "Repartir la ruta"', /Repartir la ruta/.test(pa.titulo), pa.titulo);
    chk('  dice 6 paradas y 6 sin repartir', /6 paradas · 6 sin repartir/.test(pa.sig), pa.sig);
    chk('  ofrece a los 3 que tienen la tab Ruta', pa.personas.length === 3, pa.personas);
    chk('  arranca elegido uno mismo (Tadeo, "vos")', pa.personas[0].on && /Tadeo vos/.test(pa.personas[0].t), pa.personas);
    chk('  agrupa por barrio, en el orden de la ruta', JSON.stringify(pa.grupos.map(g => g.z)) === JSON.stringify(['Champagnat Alto', 'Golf', 'La Pionera', 'Pilara']), pa.grupos.map(g => g.z));
    chk('  el combo es UNA parada', (pa.grupos.find(g => g.z === 'La Pionera') || { filas: [] }).filas.length === 1);
    chk('  todo dice "Sin repartir"', pa.grupos.every(g => g.filas.every(f => f.tag === 'Sin repartir')), pa.grupos);
    chk('  los botones se tocan manejando (personas 44px, filas 50px)',
      pa.personas.every(p => p.alto >= 44) && pa.grupos.every(g => g.alto >= 50 && g.filas.every(f => f.alto >= 50)), pa);
    chk('  y nada se sale del ancho', pa.personas.every(p => p.der <= ANCHO) && (await evaluar(A, 'document.documentElement.scrollWidth-window.innerWidth')) <= 1);

    console.log('\n-- 2. un barrio entero de un toque');
    await evaluar(A, tocarZona('Golf')); await pausa(300);
    pa = await evaluar(A, PANTALLA);
    const golf = pa.grupos.find(g => g.z === 'Golf');
    chk('Golf entero pasa a Tadeo al instante', golf.tag === 'Tadeo' && golf.filas.every(f => f.tag === 'Tadeo'), golf);
    await pausa(SRV.demoraPost + 600);
    let pr = posts.filter(p => p.action === 'asignarReparto');
    chk('salio UN POST con los 2 pedidos de Golf para Tadeo', pr.length === 1 && pr[0].quien === 'Tadeo Ustariz' && pr[0].pedidos.length === 2 && pr[0].pedidos.every(x => /Golf/.test(x.c)), pr);

    console.log('\n-- 3. para Lucas: un barrio y una parada suelta');
    await evaluar(A, tocarPersona('Lucas')); await pausa(200);
    await evaluar(A, tocarZona('Champagnat Alto')); await pausa(200);
    await evaluar(A, tocarFila('Combo Pionera')); await pausa(300);
    pa = await evaluar(A, PANTALLA);
    chk('Champagnat Alto va con Lucas', pa.grupos.find(g => g.z === 'Champagnat Alto').tag === 'Lucas');
    chk('  y el combo de La Pionera tambien', pa.grupos.find(g => g.z === 'La Pionera').filas[0].tag === 'Lucas');
    chk('  Pilara sigue sin repartir', pa.grupos.find(g => g.z === 'Pilara').tag === 'Sin repartir');
    chk('  el contador dice 1 sin repartir', /1 sin repartir/.test(pa.sig), pa.sig);
    chk('  y el boton de Lucas cuenta sus 3 paradas (Alto son 2, mas el combo)', pa.personas.some(p => /^Lucas/.test(p.t) && / 3$/.test(p.t) && p.on), pa.personas);
    await pausa(SRV.demoraPost * 3 + 1500);
    pr = posts.filter(p => p.action === 'asignarReparto' && p.quien === 'Lucas Moresco');
    chk('el combo manda sus DOS pedidos', pr.some(p => p.pedidos.length === 2 && p.pedidos.every(x => x.c === 'Combo Pionera')), pr);

    console.log('\n-- 4. mezclar y sacar');
    await evaluar(A, tocarFila('Golf Dos')); await pausa(300);
    pa = await evaluar(A, PANTALLA);
    chk('una parada de Golf a Lucas: el barrio dice "Varios"', pa.grupos.find(g => g.z === 'Golf').tag === 'Varios', pa.grupos.find(g => g.z === 'Golf'));
    await evaluar(A, tocarFila('Golf Dos')); await pausa(300);
    pa = await evaluar(A, PANTALLA);
    chk('tocarla de nuevo la saca: "Sin repartir"', pa.grupos.find(g => g.z === 'Golf').filas.find(f => f.c === 'Golf Dos').tag === 'Sin repartir');
    const antes = posts.length;
    await evaluar(A, tocarPersona('Tadeo')); await pausa(200);
    await evaluar(A, tocarZona('Golf')); await pausa(200);                 // Golf Dos vuelve a Tadeo
    await pausa(SRV.demoraPost + 900);
    /* La cola procesa de a uno: el POST que saco a Golf Dos puede llegar despues
       de `antes`. Se mira el que lo devuelve a Tadeo. */
    const ult = posts.slice(antes).filter(p => p.action === 'asignarReparto' && p.quien === 'Tadeo Ustariz');
    chk('re-tocar el barrio manda SOLO lo que cambia (1 pedido, no 2)', ult.length === 1 && ult[0].pedidos.length === 1 && ult[0].pedidos[0].c === 'Golf Dos', ult);

    console.log('\n-- 5. A termina: ve lo suyo');
    await evaluar(A, 'rutRepartirCerrar()'); await pausa(500);
    ch = await evaluar(A, CHIPS);
    chk('al tocar Listo, A pasa a "Mías"', ch.some(t => /^Mías 2\*$/.test(t)), ch);
    chk('  "Todos" dice 6', ch.some(t => /^Todos 6$/.test(t)), ch);
    chk('  y avisa "1 sin repartir"', ch.some(t => /1 sin repartir/.test(t)), ch);
    let vA = await evaluar(A, VISTA);
    chk('el recorrido de A son SUS 2 paradas de Golf', JSON.stringify(vA.slice().sort()) === JSON.stringify(['Golf Dos', 'Golf Uno']), vA);

    console.log('\n-- 6. B lo ve solo, sin tocar ↻');
    const tB = await esperar(B, repDe('Home|R9705') + '==="Lucas Moresco"', 40000);
    chk('B recibe el reparto por la sincronizacion', tB >= 0, tB);
    if (tB >= 0) console.log('         (a los ' + (tB / 1000).toFixed(1) + ' s)');
    await pausa(800);
    ch = await evaluar(B, CHIPS);
    chk('B ve Mías 3 y Todos 6 (todavia en Todos: es SU eleccion)', ch.some(t => /^Mías 3$/.test(t)) && ch.some(t => /^Todos 6\*$/.test(t)), ch);
    await evaluar(B, 'rutQuien("mias")'); await pausa(400);
    const vB = await evaluar(B, VISTA);
    chk('en "Mías", B ve SOLO lo de Lucas', JSON.stringify(vB.slice().sort()) === JSON.stringify(['Alto Uno', 'Combo Pionera', 'Con Bolsa']), vB);
    await evaluar(B, 'toggleRutaListaModo()'); await pausa(400);
    const lista = await evaluar(B, `[].slice.call(document.querySelectorAll('#rutaBody .rtc-fila small')).map(function(x){return x.textContent;})`);
    chk('  la lista del recorrido dice "con Lucas"', lista.length === 3 && lista.every(t => /con Lucas/.test(t)), lista);
    await evaluar(B, 'toggleRutaListaModo()'); await pausa(200);

    console.log('\n-- 7. ARMADO dice en que auto va');
    await evaluar(B, 'switchTab("armado")'); await pausa(600);
    /* Los dias arrancan plegados: se abren antes de mirar, como haria una persona. */
    await evaluar(B, `(function(){[].slice.call(document.querySelectorAll('#armadoView .armado-day-header.collapsed')).forEach(function(h){h.click();});return true;})()`);
    await pausa(600);
    const tag = await evaluar(B, `(function(){var c=[].slice.call(document.querySelectorAll('#armadoView .armado-card')).find(function(x){return x.textContent.indexOf('Con Bolsa')>-1;});var t=c&&c.querySelector('.armado-rep');return t?t.textContent:'';})()`);
    chk('la bolsa de "Con Bolsa" dice "Va con Lucas"', /Va con Lucas/.test(tag), tag);
    await evaluar(B, 'switchTab("ruta")'); await pausa(400);

    console.log('\n-- 8. B saca una parada, A la pierde');
    await evaluar(B, 'rutRepartirAbrir()'); await pausa(300);
    await evaluar(B, tocarFila('Alto Uno')); await pausa(300);        // pincel = Lucas (vos): la saca
    chk('B la saca de Lucas al instante', await evaluar(B, repDe('Home|R9703') + '===""'));
    await evaluar(B, 'rutRepartirCerrar()');
    const tA = await esperar(A, repDe('Home|R9703') + '===""', 40000);
    chk('A lo ve solo', tA >= 0, tA);
    await pausa(600);
    ch = await evaluar(A, CHIPS);
    chk('  y ahora le avisa "2 sin repartir"', ch.some(t => /2 sin repartir/.test(t)), ch);

    console.log('\n-- 9. un backend sin `rep` no borra nada');
    SRV.sinRep = true;
    const r0 = await evaluar(A, REP);
    await evaluar(A, 'refresh(true,true)'); await pausa(SRV.demoraGet + 1200);
    const r1 = await evaluar(A, REP);
    chk('A conserva el reparto', JSON.stringify(r0.rep) === JSON.stringify(r1.rep) && Object.keys(r1.rep).length >= 4, { antes: r0.rep, despues: r1.rep });
    chk('  y su recorrido sigue siendo el suyo', (await evaluar(A, VISTA)).length === 2);
    SRV.sinRep = false;

    console.log('\n-- 10. nada roto');
    for (const [n, c] of [['A', A], ['B', B]]) {
      chk(n + ': no desborda a lo ancho', (await evaluar(c, 'Math.max(0,document.documentElement.scrollWidth-window.innerWidth)')) <= 1);
      const e = await evaluar(c, 'window.__err');
      chk(n + ': sin errores de JS', e.length === 0, e);
    }
  } finally { try { A && A.matar(); } catch (e) {} try { B && B.matar(); } catch (e) {} }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTÓ: ' + e.message); process.exit(1); });
