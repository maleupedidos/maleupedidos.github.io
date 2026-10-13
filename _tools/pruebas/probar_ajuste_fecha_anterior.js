/**
 * Un cobro con fecha anterior al ultimo ajuste de caja (13/10/2026), en el
 * cuadro de cobro de Ruta. Chrome de verdad, TODOS los POST interceptados.
 *
 *   · con hoy no hay cartel; con una fecha anterior al ajuste el renglon lo
 *     avisa y al confirmar hay que elegir: «ya lo tenía» / «no lo tenía»,
 *     ninguna marcada; la decision viaja en `ajusteDec`;
 *   · con un ajuste mas viejo que la fecha elegida no avisa;
 *   · el campo no deja elegir antes del dia en que se cargo el pedido.
 *
 *   BASE=http://localhost:8097 node probar_ajuste_fecha_anterior.js [ancho]
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
const _p2 = n => String(n).padStart(2, '0'), _aa = new Date(Date.now() - 2 * 86400000);
const FC = _p2(_aa.getDate()) + '/' + _p2(_aa.getMonth() + 1) + '/' + _aa.getFullYear();   /* el 9001 se cargo anteayer */
const COBROS = [
  { fc: FC, h: 'Home', id: '9001', r: 900, c: 'Prueba Uno', t: '', $: 50000, totalOriginal: 50000, fp: 'Transferencia', dir: 'Golf · Lote 1' },
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
  return JSON.stringify({hay:true, v:el.value, max:el.max, min:el.min||'', txt:(tx||{}).textContent||'', ver:cs.display!=='none'&&r.width>0&&r.height>0,
    izq:Math.round(ri.left), der:Math.round(ri.right), alto:Math.round(ri.height), ancho:window.innerWidth, lbl:(sec.querySelector('label')||{}).innerText||''});
})()`).then(JSON.parse);
const elegir = (cli, v) => evaluar(cli, `(function(){var el=document.getElementById('cobroFecha'); el.value=${JSON.stringify(v)}; _cobroFechaCambio();})()`);
const pagar = cli => evaluar(cli, '_setCobroFp("Transferencia"); _setMoneyInput("cobroRecMP", _cobroRutaState.total); _recalcCobroRuta();');

const cartel = cli => evaluar(cli, `(function(){
  var ov=document.getElementById('rutAjOv'); if(!ov) return JSON.stringify({hay:false});
  var caja=ov.firstElementChild.getBoundingClientRect();
  var bs=[].slice.call(ov.querySelectorAll('button')).map(function(b){var r=b.getBoundingClientRect();return {t:b.innerText.split('\\n')[0], alto:Math.round(r.height), izq:Math.round(r.left), der:Math.round(r.right)};});
  var el=document.elementFromPoint(caja.left+caja.width/2, caja.top+20);
  return JSON.stringify({hay:true, txt:document.getElementById('rutAjOvTxt').innerText, bs:bs, izq:Math.round(caja.left), der:Math.round(caja.right), ancho:window.innerWidth,
    arriba:!!(el&&ov.contains(el)), foco:(document.activeElement||{}).id||''});
})()`).then(JSON.parse);
const tocar = (cli, id) => evaluar(cli, `(function(){var b=document.getElementById(${JSON.stringify(id)});var r=b.getBoundingClientRect();var e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);if(e&&(e===b||b.contains(e))){b.click();return true}return false})()`);
const setCorte = (cli, txt) => evaluar(cli, `_bilVivasRuta=Object.assign({}, _bilVivasRuta||{}, {corte:${JSON.stringify(txt)}}); _pintarCobroFecha();`);
const ANTEAYER = new Date(Date.now() - 2 * 86400000), HACE5 = new Date(Date.now() - 5 * 86400000);
const CORTE_HOY = dmy(HOY) + ' 00:01', CORTE_VIEJO = dmy(HACE5) + ' 20:00';

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Fecha anterior al ultimo ajuste · Ruta · ' + ANCHO + 'px ==');

    /* 1. Hoy: sin cartel */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    await setCorte(cli, CORTE_HOY);
    let c = await campo(cli);
    chequear(c.min === iso(ANTEAYER), 'el campo tiene tope hacia atras: el dia en que se cargo el pedido', 'min ' + c.min);
    await pagar(cli); await dormir(300);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()');
    let p = await posts(cli, 'marcarCobrado');
    let k = await cartel(cli);
    chequear(p.length === 1 && !p[0].ajusteDec && !k.hay, 'con la fecha de hoy: cobra sin cartel y sin decision', JSON.stringify(p[0] || {}).slice(0, 200));

    /* 2. Ayer, anterior al ajuste: avisa en el renglon y pide elegir */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    await setCorte(cli, CORTE_HOY);
    await elegir(cli, iso(AYER)); await dormir(200);
    c = await campo(cli);
    chequear(/anterior al último ajuste/.test(c.txt) && c.txt.indexOf(CORTE_HOY) > 0, 'el renglon de la fecha ya lo avisa, con dia y hora del ajuste', c.txt);
    await pagar(cli); await dormir(300);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()'); await dormir(500);
    k = await cartel(cli);
    p = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__posts||[]).filter(function(x){return x&&x.action==="marcarCobrado"}))'));
    chequear(k.hay && k.arriba && p.length === 0, 'al confirmar aparece el cartel, encima del cuadro, y todavia NO se cobro', JSON.stringify(k).slice(0, 200));
    chequear(k.hay && /no va a mover el saldo/.test(k.txt) && k.txt.indexOf(CORTE_HOY) > 0, 'dice que no va a mover el saldo, con la fecha y hora del ajuste', k.txt);
    chequear(k.hay && k.bs.length === 3 && /ya lo tenía/.test(k.bs[0].t) && /no lo tenía/.test(k.bs[1].t), 'dos salidas y volver', JSON.stringify(k.bs));
    chequear(k.hay && k.foco !== 'rutAjOvTenia' && k.foco !== 'rutAjOvNoTenia', 'ninguna de las dos viene marcada', k.foco);
    chequear(k.hay && k.izq >= 0 && k.der <= k.ancho && k.bs.every(b => b.alto >= 44 && b.izq >= 0 && b.der <= k.ancho), 'entra en la pantalla y los botones se pueden tocar', JSON.stringify(k).slice(0, 300));
    chequear(await tocar(cli, 'rutAjOvNoTenia'), 'el boton «no lo tenía» recibe el toque');
    p = await posts(cli, 'marcarCobrado');
    chequear(p.length === 1 && p[0].ajusteDec === 'notenia' && p[0].fechaCobro === dmy(AYER), '«no lo tenía»: marcarCobrado lleva ajusteDec = notenia y la fecha', JSON.stringify(p[0] || {}).slice(0, 240));

    /* 3. «Ya lo tenía» */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    await setCorte(cli, CORTE_HOY);
    await elegir(cli, iso(AYER)); await pagar(cli); await dormir(300);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()'); await dormir(500);
    await tocar(cli, 'rutAjOvTenia');
    p = await posts(cli, 'marcarCobrado');
    chequear(p.length === 1 && p[0].ajusteDec === 'tenia', '«ya lo tenía»: lleva ajusteDec = tenia', JSON.stringify(p[0] || {}).slice(0, 240));

    /* 4. Volver: no cobra */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    await setCorte(cli, CORTE_HOY);
    await elegir(cli, iso(AYER)); await pagar(cli); await dormir(300);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()'); await dormir(500);
    await tocar(cli, 'rutAjOvNo'); await dormir(600);
    p = JSON.parse(await evaluar(cli, 'JSON.stringify({n:(window.__posts||[]).length, cola:(syncQueue||[]).filter(function(q){return q&&q.action==="marcarCobrado"}).length, abierto:!!_cobroRutaState})'));
    chequear(p.n === 0 && p.cola === 0 && p.abierto, '«volver»: no cobra y el cuadro sigue abierto', JSON.stringify(p));

    /* 5. Un ajuste mas viejo que la fecha elegida: no avisa */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    await setCorte(cli, CORTE_VIEJO);
    await elegir(cli, iso(AYER)); await dormir(200);
    c = await campo(cli);
    await pagar(cli); await dormir(300);
    await evaluar(cli, 'window.__posts=[]; confirmarCobroRuta()');
    p = await posts(cli, 'marcarCobrado');
    k = await cartel(cli);
    chequear(!/ajuste/.test(c.txt) && !k.hay && p.length === 1 && !p[0].ajusteDec && p[0].fechaCobro === dmy(AYER), 'ayer con un ajuste de hace 5 dias: cobra sin cartel', c.txt + ' ' + JSON.stringify(p[0] || {}).slice(0, 160));

    /* 6. El tope hacia atras */
    await arrancar(cli);
    await abrirCuadro(cli, '9001');
    await elegir(cli, iso(HACE5)); await dormir(200);
    c = await campo(cli);
    chequear(c.v === iso(ANTEAYER), 'una fecha anterior a la carga del pedido vuelve al dia de la carga', c.v);

    const errs = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__errores||[])'));
    chequear(errs.length === 0, 'sin errores de JS', JSON.stringify(errs).slice(0, 200));
  } catch (e) {
    mal++; console.log('  REVENTO: ' + (e && e.stack || e));
  }
  console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
  salir(mal ? 1 : 0);
})();
