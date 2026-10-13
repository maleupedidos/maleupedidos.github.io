/**
 * "¿Cuándo cobraste?" en el cuadro de cobro de Ruta (13/10/2026).
 *
 * Chrome de verdad, TODOS los POST interceptados, datos inventados.
 *
 * Lo que exige:
 *   · el campo esta en el cuadro, arranca en HOY y no deja elegir futuro;
 *   · sin tocarlo, marcarCobrado NO manda fecha (el backend fecha ahora);
 *   · eligiendo ayer, marcarCobrado y cobrarParcial llevan `fechaCobro`
 *     en dd/mm/aaaa, y queda en la cola (no se recalcula al sincronizar);
 *   · al volver a abrir el cuadro, arranca otra vez en hoy;
 *   · si el backend rechaza la fecha, el pedido deja de figurar cobrado;
 *   · el campo entra en el ancho del cuadro.
 *
 *   BASE=http://localhost:8097 node probar_cobro_fecha_elegida.js [ancho]
 */
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));

const ANCHO = Number(process.argv[2]) || 390;
const BASE = (process.env.BASE || 'http://localhost:8080') + '/ruta.html?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chequear = (cond, txt, det) => {
  if (cond) { ok++; console.log('  ok    ' + txt); }
  else { mal++; console.log('  MAL   ' + txt + (det !== undefined ? '  -> ' + det : '')); }
};
const COBROS = [
  { h: 'Home', id: '9001', r: 900, c: 'Prueba Uno', t: '', $: 50000, totalOriginal: 50000, fp: 'Transferencia', dir: 'Golf · Lote 1' },
  { h: 'Home', id: '9002', r: 901, c: 'Prueba Dos', t: '', $: 30000, totalOriginal: 30000, fp: 'Transferencia', dir: 'Golf · Lote 2' }
];
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, def: true, inv: true }
];
const BIL = { activo: false, personas: [], bil: {} };
const p2 = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const dmy = d => p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear();
const HOY = new Date(), AYER = new Date(Date.now() - 86400000), MAN = new Date(Date.now() + 86400000);

function prep() {
  return `
    window.__posts = []; window.__errores = []; window.__rechazar = false;
    window.addEventListener('error', function(e){ window.__errores.push(String(e.message)); });
    (function(){
      var of = window.fetch, BIL = ${JSON.stringify(BIL)};
      var res = function(o){ return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })); };
      window.fetch = function(u, o){
        var url = String((u && u.url) || u || '');
        if (o && String(o.method || '').toUpperCase() === 'POST') {
          var b = o.body; try { b = (typeof b === 'string') ? JSON.parse(b) : b; } catch(e){}
          window.__posts.push(b);
          if (window.__rechazar) return res({ ok: false, sinReintento: true, fechaInvalida: true, err: 'El pedido se cargó el 12/10/2026: no se puede cobrar antes de ese día' });
          return res({ ok: true, n: 999, restante: 20000, cerrado: false, aFavor: 0, aplicacion: 0, cambioMP: 0, cambioEf: 0, cuenta: '' });
        }
        if (url.indexOf('action=cobrosPendientes') > -1) return res({ ts: Date.now(), cobros: ${JSON.stringify(COBROS)}, billetera: 0, billeteras: BIL, sinCerrar: [], cuentas: ${JSON.stringify(CUENTAS)} });
        if (url.indexOf('action=billetera') > -1) return res({ ok: true, billetera: 0, billeteras: BIL });
        if (url.indexOf('action=entregas') > -1) return res({ ts: Date.now(), e: [], cuentas: ${JSON.stringify(CUENTAS)} });
        return of.apply(this, arguments);
      };
      window.alert = function(){}; window.confirm = function(){ return true; };
    })();`;
}
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function esperar(cli, expr, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) { if (await evaluar(cli, expr)) return true; await dormir(200); }
  return false;
}
let _prepId = null;
async function arrancar(cli) {
  if (_prepId) { try { await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: _prepId }); } catch (e) {} }
  const r = await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'try{localStorage.clear()}catch(e){}\n' + prep() });
  _prepId = r && r.identifier;
  await cli.enviar('Page.navigate', { url: BASE });
  await dormir(3000);
  if (!await esperar(cli, 'typeof window.switchTab === "function"')) throw new Error('la sub-app no arranco');
  await evaluar(cli, 'switchTab("cobros")');
  if (!await esperar(cli, '(function(){try{return pendientesCobro && pendientesCobro.length===2}catch(e){return false}})()')) throw new Error('los pedidos de prueba no llegaron');
  await dormir(1200);
}
async function abrirCuadro(cli, id) {
  const i = await evaluar(cli, '(function(){for(var i=0;i<pendientesCobro.length;i++)if(String(pendientesCobro[i].id)==="' + id + '")return i;return -1})()');
  await evaluar(cli, 'abrirCobroPendiente(' + i + ')');
  if (!await esperar(cli, '!!_cobroRutaState', 8000)) throw new Error('el cuadro de ' + id + ' no abrio');
  await dormir(600);
}
/* Lo que se mando o quedo en la cola, sin repetir. */
async function posts(cli, accion, ms) {
  const t0 = Date.now(); let out = [];
  while (Date.now() - t0 < (ms || 8000)) {
    out = JSON.parse(await evaluar(cli, '(function(){var a=(window.__posts||[]).filter(function(p){return p&&p.action==="' + accion + '"});if(!a.length){try{a=(syncQueue||[]).filter(function(q){return q&&q.action==="' + accion + '"})}catch(e){}}return JSON.stringify(a)})()'));
    if (out.length) break; await dormir(200);
  }
  return out;
}
const campo = cli => evaluar(cli, `(function(){
  var el=document.getElementById('cobroFecha'), tx=document.getElementById('cobroFechaTxt'), sec=document.getElementById('cobroFechaSection');
  if(!el||!sec) return JSON.stringify({hay:false});
  var r=sec.getBoundingClientRect(), ri=el.getBoundingClientRect(), cs=getComputedStyle(sec);
  return JSON.stringify({hay:true, v:el.value, max:el.max, txt:(tx||{}).textContent||'', ver:cs.display!=='none'&&r.width>0&&r.height>0,
    izq:Math.round(ri.left), der:Math.round(ri.right), alto:Math.round(ri.height), ancho:window.innerWidth, lbl:(sec.querySelector('label')||{}).innerText||''});
})()`).then(JSON.parse);
const elegir = (cli, v) => evaluar(cli, `(function(){var el=document.getElementById('cobroFecha'); el.value=${JSON.stringify(v)}; _cobroFechaCambio();})()`);
const pagar = cli => evaluar(cli, '_setCobroFp("Transferencia"); _setMoneyInput("cobroRecMP", _cobroRutaState.total); _recalcCobroRuta();');

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== ¿Cuándo cobraste? · Ruta · ' + ANCHO + 'px ==');

    /* 1. Sin tocarlo */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    let c = await campo(cli);
    chequear(c.hay && c.ver, 'el campo esta en el cuadro y se ve', JSON.stringify(c));
    chequear(/cu[aá]ndo cobraste/i.test(c.lbl), 'pregunta «¿Cuándo cobraste?»', c.lbl);
    chequear(c.v === iso(HOY) && c.max === iso(HOY), 'arranca en hoy y el tope es hoy', c.v + ' / max ' + c.max);
    chequear(c.txt.indexOf('Hoy') === 0 && c.txt.indexOf(dmy(HOY)) > 0, 'dice «Hoy» con la fecha en dd/mm/aaaa', c.txt);
    chequear(c.izq >= 0 && c.der <= c.ancho && c.alto >= 40, 'entra en el ancho de la pantalla y se puede tocar (' + c.alto + ' px de alto)', JSON.stringify(c));
    await pagar(cli); await dormir(300);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()');
    let p = await posts(cli, 'marcarCobrado');
    chequear(p.length === 1 && !p[0].fechaCobro, 'sin tocarlo: marcarCobrado NO manda fecha', JSON.stringify(p[0] || {}).slice(0, 220));

    /* 2. Ayer */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    await elegir(cli, iso(AYER)); await dormir(200);
    c = await campo(cli);
    chequear(c.v === iso(AYER) && c.txt.indexOf(dmy(AYER)) === 0 && /ayer/.test(c.txt), 'eligiendo ayer lo dice en dd/mm/aaaa', c.txt);
    await pagar(cli); await dormir(300);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()');
    p = await posts(cli, 'marcarCobrado');
    chequear(p.length === 1 && p[0].fechaCobro === dmy(AYER), 'marcarCobrado lleva fechaCobro = ayer, dd/mm/aaaa', JSON.stringify(p[0] || {}).slice(0, 220));

    /* 3. Vuelve a hoy al reabrir, y no acepta futuro */
    await abrirCuadro(cli, '9002');
    c = await campo(cli);
    chequear(c.v === iso(HOY), 'al abrir otro cobro arranca otra vez en hoy', c.v);
    await elegir(cli, iso(MAN)); await dormir(200);
    c = await campo(cli);
    chequear(c.v === iso(HOY), 'una fecha futura vuelve a hoy', c.v);

    /* 4. Un parcial de ayer */
    await elegir(cli, iso(AYER));
    await evaluar(cli, '_toggleCobroParcial(null); _setCobroFp("Transferencia"); _setMoneyInput("cobroRecMP", 10000); _cobroRecTocado(); _recalcCobroRuta();'); await dormir(400);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()');
    p = await posts(cli, 'cobrarParcial');
    chequear(p.length === 1 && p[0].fechaCobro === dmy(AYER) && Number(p[0].monto) === 10000, 'cobrarParcial lleva fechaCobro = ayer', JSON.stringify(p[0] || {}).slice(0, 240));

    /* 5. El backend rechaza la fecha: el pedido no queda cobrado en la pantalla */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    await elegir(cli, iso(AYER));
    await pagar(cli); await dormir(300);
    await evaluar(cli, 'window.__rechazar=true; window.__posts=[]; confirmarCobroRuta()');
    await esperar(cli, '(window.__posts||[]).some(function(p){return p&&p.action==="marcarCobrado"})', 8000);
    await dormir(1500);
    const tras = JSON.parse(await evaluar(cli, 'JSON.stringify({cob:!!cobrados["Home|9001"], cola:(syncQueue||[]).filter(function(q){return q&&q.action==="marcarCobrado"}).length})'));
    chequear(tras.cob === false && tras.cola === 0, 'rechazado por la fecha: sale de la cola y deja de figurar cobrado', JSON.stringify(tras));

    const errs = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__errores||[])'));
    chequear(errs.length === 0, 'sin errores de JS', JSON.stringify(errs).slice(0, 200));
  } catch (e) {
    mal++; console.log('  REVENTO: ' + (e && e.stack || e));
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
  salir(mal ? 1 : 0);
})();
