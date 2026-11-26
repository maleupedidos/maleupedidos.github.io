/**
 * "¿De dónde salió el efectivo?" en el pago a proveedor (Abastecimiento,
 * 5/10/2026). Chrome de verdad, POST interceptados, datos inventados.
 *
 *   BASE=http://localhost:8095 node probar_pago_lugar.js [ancho]
 *
 * Exige: con efectivo, la pregunta aparece con caja fuerte + billetera y sin
 * guardar de cada uno, NINGUNO elegido, y el boton no paga; elegido, el POST
 * lleva `lugar`; una transferencia pura no pregunta; sin personas (Apps Script
 * viejo) no pregunta y paga como antes.
 */
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const ANCHO = Number(process.argv[2]) || 390;
const BASE = (process.env.BASE || 'http://localhost:8080') + '/busqueda.html?standalone=1&prueba=1';
const T = 'Tadeo Ustariz', L = 'Lucas Moresco';
let ok = 0, mal = 0;
const chk = (c, t, d) => { if (c) { ok++; console.log('  ok    ' + t); } else { mal++; console.log('  MAL   ' + t + (d !== undefined ? '  -> ' + d : '')); } };
const dormir = ms => new Promise(r => setTimeout(r, ms));

const PREP = `
  window.__posts=[]; window.__err=[];
  window.addEventListener('error', function(e){ window.__err.push(String(e.message)); });
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    if (o && String(o.method||'').toUpperCase()==='POST'){ var b={}; try{b=JSON.parse(o.body)}catch(e){} window.__posts.push(b);
      return Promise.resolve(new Response(JSON.stringify({ok:true,total:1}),{status:200,headers:{'Content-Type':'application/json'}})); }
    var url=String((u&&u.url)||u||'');
    if (url.indexOf('script.google.com')>-1) return Promise.resolve(new Response(JSON.stringify({ok:false,error:'stub'}),{status:200,headers:{'Content-Type':'application/json'}}));
    return of.apply(this,arguments); }; })();`;

async function armar(cli, personas) {
  await evaluar(cli, `(function(){
    busqueda = busqueda || {};
    busqueda.deudas=[{n:'Proveedor Prueba'}];
    busqueda.cuentas=[{id:'efectivo',tipo:'efectivo'},{id:'mp',nombre:'MP Prueba',tipo:'digital',def:true}];
    busqueda.personasCaja=${JSON.stringify(personas)};
    var d=document.getElementById('__pp'); if(!d){ d=document.createElement('div'); d.id='__pp'; document.body.appendChild(d); }
    d.innerHTML=renderPagoForm('k1',0,'',100000);
    window.__posts=[];
    return 1; })()`);
}
const tipear = (cli, id, v) => evaluar(cli, `(function(){ var i=document.getElementById('${id}'); i.value='${v}'; updatePagoTotal('k1',100000); return 1; })()`);
const est = cli => evaluar(cli, `JSON.stringify({ ver: !!document.getElementById('pagoLug_k1') && !document.getElementById('pagoLug_k1').hidden,
  ops: [].slice.call(document.querySelectorAll('#pagoLug_k1 .aba-pago-lug-b')).map(function(b){return b.textContent+(b.classList.contains('on')?'*':'');}),
  btn: document.getElementById('btnPagar_k1').textContent, dis: document.getElementById('btnPagar_k1').disabled })`).then(JSON.parse);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    await cli.enviar('Page.navigate', { url: BASE });
    let listo = false;
    for (let i = 0; i < 150 && !listo; i++) { try { listo = await evaluar(cli, `typeof renderPagoForm==='function' && typeof confirmarPago==='function'`); } catch (e) {} if (!listo) await dormir(200); }
    if (!listo) { console.log('  Abastecimiento no arranco'); salir(1); }
    console.log('\n== Pago a proveedor: de dónde salió el efectivo · ' + ANCHO + 'px ==');

    await armar(cli, [T, L]);
    await tipear(cli, 'pagoEf_k1', '50000');
    let e = await est(cli);
    chk(e.ver && e.ops.length === 5 && !e.ops.some(o => /\*$/.test(o)), 'con efectivo pregunta: caja fuerte + billetera y sin guardar de cada uno, ninguno elegido', JSON.stringify(e.ops));
    chk(e.dis && /de dónde salió el efectivo/.test(e.btn), 'el boton no paga y dice que falta', e.btn);
    await evaluar(cli, `abaPagoLugar('k1','cf')`);
    e = await est(cli);
    chk(!e.dis && /Confirmar pago/.test(e.btn) && e.ops.some(o => /Caja fuerte\*$/.test(o)), 'elegida la caja fuerte, se destraba', JSON.stringify(e));
    await evaluar(cli, `confirmarPago('k1',0,'')`); await dormir(500);
    let p = JSON.parse(await evaluar(cli, `JSON.stringify(window.__posts.filter(function(x){return x.action==='pagarProveedor'}))`));
    chk(p.length === 1 && p[0].lugar === 'cf' && Number(p[0].efectivo) === 50000, 'pagarProveedor lleva lugar: cf', JSON.stringify(p[0] || {}));

    await armar(cli, [T, L]);
    await tipear(cli, 'pagoMp_k1', '50000');
    await evaluar(cli, `abaPagoCuenta('k1','mp')`);
    e = await est(cli);
    chk(!e.ver && !e.dis, 'transferencia pura: no pregunta y se puede pagar', JSON.stringify(e));

    await armar(cli, []);
    await tipear(cli, 'pagoEf_k1', '50000');
    e = await est(cli);
    chk(!e.ver && !e.dis, 'sin personas (Apps Script viejo): no pregunta y paga como antes', JSON.stringify(e));

    const err = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__err||[])'));
    chk(err.length === 0, 'sin errores de JS', JSON.stringify(err).slice(0, 200));
  } catch (x) { mal++; console.log('  REVENTO: ' + (x && x.stack || x)); }
  console.log('\n  ' + ok + ' ok · ' + mal + ' MAL\n');
  salir(mal ? 1 : 0);
})();
