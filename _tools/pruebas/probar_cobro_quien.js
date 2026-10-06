/**
 * "¿Quién cobró el efectivo?" en Ruta (5/10/2026, billeteras de cambio).
 *
 * Chrome de verdad, TODOS los POST interceptados, datos inventados.
 *
 * Lo que exige:
 *   · en el cuadro de cobro, con efectivo en juego, la pregunta aparece SIN
 *     nadie elegido y el cobro no se confirma hasta contestarla;
 *   · el aviso de la billetera es la de QUIEN cobro (y pide elegir antes);
 *   · el POST de marcarCobrado lleva `quien` (y el vuelto, `cambioBilletera`);
 *   · una transferencia pura no pregunta nada y no manda quien;
 *   · sin billeteras en la planilla (backend sin personas) no aparece: es lo de
 *     antes, y el backend usa el usuario logueado;
 *   · la rendicion de un vendedor con efectivo pregunta quien lo recibio;
 *   · el "Ya me pagó" del AUTOPEDIDO en efectivo pregunta quien lo cobro.
 *
 *   BASE=http://localhost:8095 node probar_cobro_quien.js [ancho]
 */
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));

const ANCHO = Number(process.argv[2]) || 390;
const BASE = (process.env.BASE || 'http://localhost:8080') + '/ruta.html?standalone=1&prueba=1';
const T = 'Tadeo Ustariz', L = 'Lucas Moresco';

let ok = 0, mal = 0;
const chequear = (cond, txt, det) => {
  if (cond) { ok++; console.log('  ok    ' + txt); }
  else { mal++; console.log('  MAL   ' + txt + (det !== undefined ? '  -> ' + det : '')); }
};
const COBROS = [
  { h: 'Home', id: '9001', r: 900, c: 'Prueba Uno', t: '', $: 50000, totalOriginal: 50000, fp: 'Transferencia', dir: 'Golf · Lote 1' },
  { h: 'Home', id: '9002', r: 901, c: 'Prueba Dos', t: '', $: 30000, totalOriginal: 30000, fp: 'Efectivo', dir: 'Golf · Lote 2' }
];
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, def: false, inv: false },
  { id: 'mp', nombre: 'Mercado Pago Tadeo', tipo: 'digital', col: 3, def: true, inv: true }
];
const BIL = { activo: true, personas: [T, L], bil: { [T]: 20000, [L]: 15000 } };

function prep(bil) {
  return `
    window.__posts = []; window.__errores = [];
    window.addEventListener('error', function(e){ window.__errores.push(String(e.message)); });
    (function(){
      var of = window.fetch, BIL = ${JSON.stringify(bil)};
      var res = function(o){ return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })); };
      window.fetch = function(u, o){
        var url = String((u && u.url) || u || '');
        if (o && String(o.method || '').toUpperCase() === 'POST') {
          var b = o.body; try { b = (typeof b === 'string') ? JSON.parse(b) : b; } catch(e){}
          window.__posts.push(b);
          return res({ ok: true, n: 999, restante: 0, cerrado: true, aFavor: 0, aplicacion: 0, cambioMP: 0, cambioEf: 0, cuenta: '' });
        }
        if (url.indexOf('action=cobrosPendientes') > -1) return res({ ts: Date.now(), cobros: ${JSON.stringify(COBROS)}, billetera: 35000, billeteras: BIL, sinCerrar: [], cuentas: ${JSON.stringify(CUENTAS)} });
        if (url.indexOf('action=billetera') > -1) return res({ ok: true, billetera: 35000, billeteras: BIL });
        if (url.indexOf('action=entregas') > -1) return res({ ts: Date.now(), e: [], cuentas: ${JSON.stringify(CUENTAS)} });
        return of.apply(this, arguments);
      };
      window.alert = function(){}; window.__confirmDevuelve = true; window.confirm = function(){ return window.__confirmDevuelve; };
    })();`;
}
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function esperar(cli, expr, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) { if (await evaluar(cli, expr)) return true; await dormir(200); }
  return false;
}
let _prepId = null;
async function arrancar(cli, bil) {
  if (_prepId) { try { await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: _prepId }); } catch (e) {} }
  const r = await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'try{localStorage.clear()}catch(e){}\n' + prep(bil) });
  _prepId = r && r.identifier;
  await cli.enviar('Page.navigate', { url: BASE });
  await dormir(3000);
  if (!await esperar(cli, 'typeof window.switchTab === "function"')) throw new Error('la sub-app no arranco');
  await evaluar(cli, 'window.__confirmDevuelve = true');
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
async function posts(cli, accion, ms) {
  const t0 = Date.now(); let out = [];
  while (Date.now() - t0 < (ms || 10000)) {
    out = JSON.parse(await evaluar(cli, '(function(){var a=(window.__posts||[]).filter(function(p){return p&&p.action==="' + accion + '"});var b=[];try{b=(syncQueue||[]).filter(function(q){return q&&q.action==="' + accion + '"})}catch(e){}return JSON.stringify(a.length?a:b)})()') || '[]');
    if (out.length) break; await dormir(200);
  }
  return out;
}
const estado = cli => evaluar(cli, `JSON.stringify({
  ver: document.getElementById('cobroQuienSection').style.display!=='none',
  pills: [].slice.call(document.querySelectorAll('#cobroQuien .cobro-pill')).map(function(b){return b.textContent+(b.classList.contains('on')?'*':'');}),
  err: (document.getElementById('cobroRutaErr')||{}).textContent||'',
  dis: document.getElementById('btnCobroRutaOk').disabled,
  bil: (document.getElementById('cobroBilleteraHint')||{}).textContent||'' })`).then(JSON.parse);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Quién cobró el efectivo · Ruta · ' + ANCHO + 'px ==');

    /* 1. Cobro en efectivo, con vuelto */
    await arrancar(cli, BIL);
    await abrirCuadro(cli, '9002');
    await evaluar(cli, '_setMoneyInput("cobroRecEf", 30000); _recalcCobroRuta();'); await dormir(300);
    let e = await estado(cli);
    chequear(e.ver && e.pills.length === 2 && !e.pills.some(p => /\*$/.test(p)), 'efectivo: la pregunta aparece con Tadeo y Lucas, ninguno elegido', JSON.stringify(e.pills));
    chequear(/Quién cobró el efectivo/.test(e.err), 'el error lo dice', e.err.slice(0, 120));
    chequear(/Elegí quién cobró/.test(e.bil), 'el aviso de la billetera pide elegir primero', e.bil);
    await evaluar(cli, `_setCobroQuien(${JSON.stringify(L)})`); await dormir(200);
    // El cliente da $35.000 por $30.000: vuelto de la billetera
    await evaluar(cli, `_toggleCobroSec('cobroCambioSection', document.getElementById('cobroToggleCambio')); _setMoneyInput("cobroRecEf", 35000); _cobroRecTocado(); _recalcCobroRuta();`); await dormir(400);
    e = await estado(cli);
    chequear(!/Quién cobró/.test(e.err), 'elegido Lucas, el error de quien se va', e.err.slice(0, 160));
    chequear(/Billetera de Lucas: \$15\.000/.test(e.bil) && /queda \$10\.000/.test(e.bil), 'el aviso es la billetera de LUCAS y descuenta el vuelto', e.bil);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()');
    let p = await posts(cli, 'marcarCobrado');
    chequear(p.length === 1 && p[0].quien === L, 'marcarCobrado lleva quien: Lucas', JSON.stringify(p[0] || {}).slice(0, 200));
    chequear(p.length === 1 && Number(p[0].cambioBilletera) === 5000, 'y el vuelto de la billetera ($5.000)', p[0] && p[0].cambioBilletera);

    /* 2. Transferencia pura: no pregunta */
    await arrancar(cli, BIL);
    await abrirCuadro(cli, '9001');
    await evaluar(cli, '_setCobroFp("Transferencia"); _setMoneyInput("cobroRecMP", _cobroRutaState.total); _recalcCobroRuta();'); await dormir(300);
    e = await estado(cli);
    chequear(!e.ver, 'transferencia pura: no pregunta quien cobro', JSON.stringify(e));
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()');
    p = await posts(cli, 'marcarCobrado');
    chequear(p.length === 1 && !p[0].quien, 'y no manda quien', JSON.stringify(p[0] || {}).slice(0, 160));

    /* 3. Sin billeteras en la planilla: lo de antes */
    await arrancar(cli, { activo: false, personas: [], bil: {} });
    await abrirCuadro(cli, '9002');
    await evaluar(cli, '_setMoneyInput("cobroRecEf", 30000); _recalcCobroRuta();'); await dormir(300);
    e = await estado(cli);
    chequear(!e.ver && !e.dis, 'sin billeteras: no pregunta y el cobro se puede confirmar', JSON.stringify(e));

    /* 4. Rendicion de un vendedor en efectivo */
    await arrancar(cli, BIL);
    await evaluar(cli, '_cobroVendReg["Prueba Vendedor"]={$:42000,totalBruto:50000,comision:8000,yaPagado:0,pedidosIds:["1"],sems:[{sem:41,y:2026,saldo:42000,n:1}]};confirmarCobroVendedor("Prueba Vendedor")');
    await dormir(300);
    await evaluar(cli, 'var i=document.getElementById("cvEf"); i.value="42000"; _cvSync();'); await dormir(200);
    const cv = await evaluar(cli, `JSON.stringify({ver:document.getElementById('cvQuienSec').style.display!=='none', n:document.querySelectorAll('#cvQuienBox button').length})`).then(JSON.parse);
    chequear(cv.ver && cv.n === 2, 'la rendicion en efectivo pregunta quien lo recibio', JSON.stringify(cv));
    await evaluar(cli, 'window.__posts=[]; _cvConfirm()'); await dormir(400);
    let n = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__posts||[]).filter(function(p){return p.action==="cobrarVendedorRed"}))'));
    chequear(n.length === 0, 'sin elegir, la rendicion NO se manda');
    await evaluar(cli, `_cvSetQuien(${JSON.stringify(T)}); _cvConfirm()`);
    p = await posts(cli, 'cobrarVendedorRed');
    chequear(p.length === 1 && p[0].quien === T && Number(p[0].ef) === 42000, 'con Tadeo elegido, cobrarVendedorRed lleva quien: Tadeo', JSON.stringify(p[0] || {}).slice(0, 200));
    chequear(p.length === 1 && /^cvr_/.test(p[0].clientOpId || ''), 'y lleva clientOpId: si la cola reintenta, el backend no la registra dos veces', p[0] && p[0].clientOpId);

    /* 5. "Ya me pagó" del AUTOPEDIDO en efectivo */
    await arrancar(cli, BIL);
    await evaluar(cli, 'switchTab("nuevo")'); await dormir(800);
    const hay = await evaluar(cli, 'typeof npGuardar==="function" && !!document.getElementById("npYaCobrado")');
    if (hay) {
      await evaluar(cli, 'try{npSetPago("Efectivo")}catch(e){}; var y=document.getElementById("npYaCobrado"); y.checked=true; npToggleYaCobrado();'); await dormir(300);
      const np = await evaluar(cli, `JSON.stringify({ver:!document.getElementById('npQuienWrap').classList.contains('hidden'), n:document.querySelectorAll('#npQuienChips .np-chip').length, on:document.querySelectorAll('#npQuienChips .np-chip.active').length})`).then(JSON.parse);
      chequear(np.ver && np.n === 2 && np.on === 0, '"Ya me pagó" en efectivo pregunta quien lo cobro, sin nadie elegido', JSON.stringify(np));
      chequear(await evaluar(cli, 'npFaltaQuien()') === true, 'y sin elegir, falta (npGuardar frena antes de mandar)');
      await evaluar(cli, `npSetQuien(${JSON.stringify(L)})`);
      chequear(await evaluar(cli, 'npFaltaQuien()') === false, 'elegido Lucas, ya no falta');
    } else {
      chequear(false, 'el AUTOPEDIDO no esta en esta pantalla (no se pudo medir)');
    }

    const errs = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__errores||[])'));
    chequear(errs.length === 0, 'sin errores de JS', JSON.stringify(errs).slice(0, 200));
  } catch (e) {
    mal++; console.log('  REVENTO: ' + (e && e.stack || e));
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
  salir(mal ? 1 : 0);
})();
