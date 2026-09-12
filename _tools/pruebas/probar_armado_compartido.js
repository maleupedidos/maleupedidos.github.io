/* RUTA con DOS celulares a la vez: el armado compartido y la sincronizacion
   automatica (12/9/2026).

   node probar_armado_compartido.js <token> [390|1440]

   El caso real que lo pidio: Tadeo y Lucas armaron juntos en el cuartito,
   tildando desde el celular de Tadeo. Lucas abrio la tab en el suyo y ARMADO no
   tenia nada armado — y como RUTA solo muestra lo armado, su recorrido tampoco.

   Abre DOS Chrome (A = Tadeo, B = Lucas) contra UN backend simulado que vive en
   este proceso: los GET de `entregas` y los POST de la sub-app se interceptan con
   CDP (`Fetch`), asi que lo que escribe un celular lo lee el otro, igual que en
   la planilla. Ningun POST llega a produccion. Los GET que no son de Ruta siguen
   al backend real (solo lectura) para que el panel arranque como en la calle.

   Lo que sostiene:
     · lo que tilda A lo ve B SOLO, sin tocar ↻, y dice quien lo armo;
     · lo que destilda B desaparece en A;
     · con un cuadro abierto en B, B no se repinta; al cerrarlo, si;
     · el tilde recien puesto no parpadea mientras su POST viaja;
     · si nada cambio, la pantalla no se toca (0 mutaciones);
     · en RUTA, B se queda en SU parada aunque A entregue una de antes;
     · un backend sin el campo `arm` no le borra lo tildado a nadie.

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
const base = o => Object.assign({ oD: {}, oc: [], hr: '10:30', f: dmy(hoyAR), de: DIAS[hoyAR.getDay()], fe: iso(hoyAR),
  es: 'Pendiente', d: '', ep: 'No Cobrado', fp: 'Efectivo', o: 'Deposito', b: 'Estancias del Pilar' }, o);
let ENT = [
  base({ id: 9501, h: 'Home', r: 9501, c: 'Primera Parada', t: '1157000001', sb: 'Champagnat Alto', l: '11', $: 12000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9502, h: 'Home', r: 9502, c: 'Segunda Parada', t: '1157000002', sb: 'Golf', l: '22', $: 25000, p: [{ a: 'PMu', q: 2 }] }),
  base({ id: 9503, h: 'Home', r: 9503, c: 'Tercera Parada', t: '1157000003', sb: 'La Pionera', l: '33', $: 18000, p: [{ a: 'PMa', q: 1 }] }),
  base({ id: 9504, h: 'Home', r: 9504, c: 'Combo Doble', t: '1157000004', sb: 'El Recuerdo', l: '44', $: 9000, p: [{ a: 'PMu', q: 1 }] }),
  base({ id: 9505, h: 'Home', r: 9505, c: 'Combo Doble', t: '1157000004', sb: 'El Recuerdo', l: '44', $: 7000, p: [{ a: 'PMa', q: 1 }] }),
];
const K = id => 'Home|R' + id;
const clave = p => p.h + '|' + p.id + '|' + String(p.c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const armado = {};                       // clave -> {u, hr}
const posts = [];                        // lo que llego al "servidor"
const SRV = { demoraGet: 1200, demoraPost: 900, sinArm: false, gets: 0, log: {} };
function armParaEnt() {
  const out = {};
  ENT.forEach(e => { const x = armado[clave(e)]; if (x) out[e.h + '|R' + e.r] = x; });
  return out;
}
function hhmm() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

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
      posts.push(Object.assign({ _de: quien, _t: Date.now() }, b));
      await pausa(SRV.demoraPost);
      if (b.action === 'marcarArmado') {
        (b.pedidos || []).forEach(x => { const k = clave(x); if (b.armado) armado[k] = { u: quien === 'A' ? 'Tadeo Ustariz' : 'Lucas Moresco', hr: hhmm() }; else delete armado[k]; });
      } else if (b.action === 'marcarEntregado') {
        ENT = ENT.filter(e => !(e.h === b.hoja && String(e.id) === String(b.id)));
      }
      return responder(cli, id, { ok: true });
    }
    if (/action=entregas/.test(url)) {
      SRV.gets++; (SRV.log[quien] = SRV.log[quien] || []).push(Date.now());
      const tsInicio = Date.now();           // el volcado se "arma" al empezar, como en Apps Script
      const foto = { ts: tsInicio, e: JSON.parse(JSON.stringify(ENT)), cuentas: [], saldos: {} };
      if (!SRV.sinArm) foto.arm = armParaEnt();
      return responder(cli, id, foto, SRV.demoraGet);
    }
    if (/action=(pendientesGuardarStock)/.test(url)) return responder(cli, id, { ok: true, items: [] });
    if (/action=cobrosPendientes/.test(url)) return responder(cli, id, { ok: true, cobros: [] });
    try { await cli.enviar('Fetch.continueRequest', { requestId: id }); } catch (e) {}
  });
}

/* El PREP sin el stub de POST del PREP compartido: aca los POST tienen que
   salir a la red para que el backend de este proceso los vea. */
function prep(nombre, usuario, sembrar) {
  return 'try{if(!sessionStorage.getItem("__armSemb")){'
    + 'localStorage.clear();'
    + 'localStorage.setItem("maleu_token","' + TOKEN + '");'
    + 'localStorage.setItem("maleu_panel_session",JSON.stringify({usuario:"' + usuario + '",rol:"admin",nombre:"' + nombre + '",ts:Date.now()}));'
    + (sembrar || '')
    + 'sessionStorage.setItem("__armSemb","1");}}catch(e){}'
    + 'window.__err=[];window.addEventListener("error",function(e){window.__err.push(String(e.message));});'
    + 'window.__confirmDevuelve=true;window.confirm=function(){return true;};';
}

const ESTADO = `(function(){ try{ var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}');
  return { arm:d.armadoDone||{}, cola:(d.syncQueue||[]).map(function(x){return x.action;}) };
}catch(e){ return {ERROR:String(e.message)}; } })()`;
const armadoEn = k => `(function(){ try{ var d=JSON.parse(localStorage.getItem('maleu_ruta')||'{}'); return !!(d.armadoDone||{})[${JSON.stringify(k)}]; }catch(e){ return null; } })()`;
const tildeVisible = nombre => `(function(){ var cs=[].slice.call(document.querySelectorAll('#armadoView .armado-card'));
  var c=cs.find(function(x){return x.textContent.indexOf(${JSON.stringify(nombre)})>-1;}); return !!(c && c.classList.contains('done')); })()`;

async function celular(quien, nombre, usuario, sembrar) {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await cli.enviar('Fetch.enable', { patterns: [{ urlPattern: '*script.google.com*', requestStage: 'Request' }] });
  engancharBackend(cli, quien);
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(nombre, usuario, sembrar) });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (await esperar(cli, 'typeof window.go==="function"', 60000) < 0) throw new Error(quien + ': el ERP no arranco');
  await evaluar(cli, 'go("ruta")');
  if (await esperar(cli, '(function(){try{return getPendientes().length>=' + ENT.length + '}catch(e){return false}})()', 90000) < 0)
    throw new Error(quien + ': no llegaron las entregas');
  return cli;
}

(async () => {
  console.log('\n=== RUTA · dos celulares a la vez · ' + ANCHO + 'px ===');
  global.T0 = Date.now();
  let A, B;
  try {
    A = await celular('A', 'Tadeo Ustariz', 'tadeo');
    B = await celular('B', 'Lucas Moresco', 'luqui');
    await evaluar(A, 'switchTab("armado")'); await evaluar(B, 'switchTab("armado")');
    await pausa(1500);
    chk('los dos arrancan con la tab a la vista (sin esto no sincroniza nada)',
      await evaluar(B, 'document.visibilityState==="visible" && _tabActual()==="ruta"'));

    // ── 1. Lo que tilda A lo ve B solo ─────────────────────────────────────
    console.log('\n-- 1. A tilda, B lo ve sin tocar nada');
    chk('al empezar, B no tiene nada armado', !(await evaluar(B, armadoEn(K(9501)))));
    const r0 = await evaluar(B, 'getSorted().length');
    await evaluar(A, 'confirmarArmado(' + JSON.stringify(K(9501)) + ')');
    await pausa(200);
    chk('A lo ve tildado al instante', await evaluar(A, tildeVisible('Primera Parada')));
    chk('  y no tapa la pantalla', !(await evaluar(A, '(function(){var l=document.getElementById("rutLoaderOverlay");return !!(l&&l.classList.contains("visible"))})()')));
    chk('  y dice quien lo armo', await evaluar(A, `(function(){var q=[].slice.call(document.querySelectorAll('#armadoView .armado-quien')).map(function(x){return x.textContent});return q.some(function(t){return /Armó Tadeo/.test(t)})})()`));
    await pausa(SRV.demoraPost + 500);
    const pA = posts.filter(p => p._de === 'A' && p.action === 'marcarArmado');
    chk('salio UN POST marcarArmado con N°, fila y cliente', pA.length === 1 && pA[0].armado === true && pA[0].pedidos[0].id === '9501' && pA[0].pedidos[0].c === 'Primera Parada', pA);
    const tB = await esperar(B, armadoEn(K(9501)), 40000);
    chk('B lo ve armado SOLO, sin tocar ↻', tB >= 0, tB);
    if (tB >= 0) console.log('         (B lo vio a los ' + (tB / 1000).toFixed(1) + ' s del POST)');
    chk('  en menos de 25 s', tB >= 0 && tB < 25000, tB);
    await pausa(600);
    chk('  la card de B esta tildada', await evaluar(B, tildeVisible('Primera Parada')));
    chk('  y dice que lo armo Tadeo', await evaluar(B, `(function(){return [].slice.call(document.querySelectorAll('#armadoView .armado-quien')).some(function(x){return /Armó Tadeo/.test(x.textContent)})})()`));
    chk('  y la parada entro al RUTA de B', (await evaluar(B, 'getSorted().length')) === r0 + 1, { antes: r0, ahora: await evaluar(B, 'getSorted().length') });

    // ── 2. B destilda, A lo pierde ─────────────────────────────────────────
    console.log('\n-- 2. B destilda, A lo ve');
    await evaluar(B, 'toggleArmado(' + JSON.stringify(K(9501)) + ')');
    chk('B lo destilda al instante', !(await evaluar(B, armadoEn(K(9501)))));
    const tA = await esperar(A, '!' + armadoEn(K(9501)), 40000);
    chk('A lo ve destildado solo', tA >= 0, tA);
    if (tA < 0) console.log('         GET de A: ' + JSON.stringify((SRV.log.A || []).map(t => Math.round((t - T0) / 1000))) + ' · cola A: ' + JSON.stringify(await evaluar(A, 'window.__colaGet&&window.__colaGet()')) + ' · estado A: ' + JSON.stringify(await evaluar(A, ESTADO)));

    // ── 3. El combo se tilda de una ────────────────────────────────────────
    console.log('\n-- 3. el combo');
    await evaluar(A, 'confirmarArmadoMasivo(' + JSON.stringify(K(9504) + ',' + K(9505)) + ')');
    const tC = await esperar(B, armadoEn(K(9504)) + '&&' + armadoEn(K(9505)), 40000);
    chk('B ve los DOS pedidos del combo armados', tC >= 0, tC);
    await pausa(600);
    chk('  y la bolsa combinada dice quien', await evaluar(B, `(function(){var c=[].slice.call(document.querySelectorAll('#armadoView .armado-card.done')).find(function(x){return x.textContent.indexOf('Combo Doble')>-1});return !!(c&&c.querySelector('.armado-quien'))})()`));

    // ── 4. Con un cuadro abierto, B no se repinta ──────────────────────────
    console.log('\n-- 4. cuadro abierto');
    await evaluar(B, 'toggleArmado(' + JSON.stringify(K(9502)) + ')');      // abre el "¿Pedido armado?"
    chk('B tiene el cuadro abierto', await evaluar(B, '!document.getElementById("confirmOverlay").classList.contains("hidden")'));
    await evaluar(A, 'confirmarArmado(' + JSON.stringify(K(9503)) + ')');
    await pausa(22000);
    chk('con el cuadro abierto B NO aplico el cambio (no se repinta debajo)', !(await evaluar(B, armadoEn(K(9503)))));
    chk('  y el cuadro sigue abierto', await evaluar(B, '!document.getElementById("confirmOverlay").classList.contains("hidden")'));
    await evaluar(B, 'cerrarConfirm()');
    const tD = await esperar(B, armadoEn(K(9503)), 25000);
    chk('al cerrarlo, B lo trae', tD >= 0, tD);

    // ── 5. El tilde no parpadea mientras su POST viaja ─────────────────────
    console.log('\n-- 5. sin parpadeo');
    SRV.demoraPost = 9000; SRV.demoraGet = 4000;
    await evaluar(A, 'confirmarArmado(' + JSON.stringify(K(9502)) + ')');
    let apagado = 0, muestras = 0;
    const t5 = Date.now();
    while (Date.now() - t5 < 32000) {
      if (!(await evaluar(A, armadoEn(K(9502))))) apagado++;
      muestras++; await pausa(500);
    }
    chk('el tilde recien puesto no se apago NI UNA vez en 32 s (' + muestras + ' muestras)', apagado === 0, apagado);
    SRV.demoraPost = 900; SRV.demoraGet = 1200;
    await esperar(B, armadoEn(K(9502)), 30000);

    // ── 6. Si nada cambio, la pantalla no se toca ──────────────────────────
    console.log('\n-- 6. sin cambios no repinta');
    await pausa(3000);
    await evaluar(B, `(function(){ window.__mut=0; var v=document.getElementById('armadoView');
      if(window.__mo)window.__mo.disconnect(); window.__mo=new MutationObserver(function(l){window.__mut+=l.length;});
      window.__mo.observe(v,{childList:true,subtree:true}); return true; })()`);
    const g0 = SRV.gets;
    await pausa(34000);
    const g1 = SRV.gets, mut = await evaluar(B, 'window.__mut');
    chk('siguio sincronizando (' + (g1 - g0) + ' GET en 34 s)', g1 - g0 >= 2, g1 - g0);
    chk('  y no toco la pantalla: 0 mutaciones', mut === 0, mut);

    // ── 7. RUTA: B se queda en su parada ───────────────────────────────────
    console.log('\n-- 7. la parada no se mueve');
    await evaluar(B, 'switchTab("ruta")'); await pausa(800);
    const paradas = await evaluar(B, 'getSorted().map(function(e){return e.c})');
    await evaluar(B, 'rutaNext()'); await pausa(500);
    const nombreB = await evaluar(B, '(function(){var s=_rutaVista();return (document.getElementById("rutaView").textContent.indexOf(s[1].c)>-1)?s[1].c:""})()');
    chk('B esta mirando la SEGUNDA parada', !!nombreB, { paradas, nombreB });
    const primera = paradas[0];
    const ePrim = await evaluar(A, '(function(){var e=getSorted()[0];return {k:(e._combo?e._key:eKey(e)),c:e.c,id:e.id,h:e.h}})()');
    chk('A tiene la misma primera parada', ePrim.c === primera, { ePrim, primera });
    await evaluar(A, 'marcarEntregado(' + JSON.stringify(ePrim.k) + ')');
    const tE = await esperar(B, '(function(){return getSorted().map(function(e){return e.c}).indexOf(' + JSON.stringify(primera) + ')===-1})()', 45000);
    chk('B ve que A entrego la primera', tE >= 0, tE);
    await pausa(800);
    chk('  y SIGUE en su parada (' + nombreB + '), no salto a otra', await evaluar(B, 'document.getElementById("rutaView").textContent.indexOf(' + JSON.stringify(nombreB) + ')>-1'));

    // ── 8. Backend sin `arm`: no borra nada ────────────────────────────────
    console.log('\n-- 8. backend viejo');
    await evaluar(B, 'switchTab("armado")');
    SRV.sinArm = true;
    const antes8 = Object.keys((await evaluar(B, ESTADO)).arm).length;
    await evaluar(A, 'confirmarArmado(' + JSON.stringify(K(9501)) + ')');   // cambia la foto: B tiene que repintar
    await pausa(25000);
    const desp8 = Object.keys((await evaluar(B, ESTADO)).arm).length;
    chk('una respuesta sin `arm` no le borra lo tildado a B', desp8 >= antes8 && antes8 > 0, { antes8, desp8 });
    SRV.sinArm = false;

    // ── 9. Layout y errores ────────────────────────────────────────────────
    console.log('\n-- 9. layout y errores');
    await esperar(B, armadoEn(K(9501)), 30000); await pausa(800);
    const lay = await evaluar(B, `(function(){ var q=[].slice.call(document.querySelectorAll('#armadoView .armado-quien'));
      return { n:q.length, sale:q.filter(function(x){return x.scrollWidth>x.clientWidth+1||x.getBoundingClientRect().right>innerWidth}).length,
               docW:document.documentElement.scrollWidth, vw:innerWidth }; })()`);
    chk('los renglones "Armó" se ven (' + lay.n + ')', lay.n >= 2, lay);
    chk('  sin salirse ni cortarse', lay.sale === 0, lay);
    chk('  sin desborde a lo ancho', lay.docW <= lay.vw + 1, lay);
    const errA = (await evaluar(A, 'window.__err')).filter(e => /ruta|arm|Sincron|rutaVista|getSorted/i.test(e));
    const errB = (await evaluar(B, 'window.__err')).filter(e => /ruta|arm|Sincron|rutaVista|getSorted/i.test(e));
    chk('sin errores de la sub-app en ninguno de los dos', errA.length + errB.length === 0, { errA, errB });
    const otros = posts.filter(p => p.action && ['marcarArmado', 'marcarEntregado'].indexOf(p.action) === -1);
    chk('ningun POST inesperado', otros.length === 0, otros.map(p => p.action));
  } catch (e) {
    mal++; console.log('  EXPLOTO: ' + e.message);
  } finally {
    try { A && A.matar(); } catch (e) {}
    try { B && B.matar(); } catch (e) {}
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})();
