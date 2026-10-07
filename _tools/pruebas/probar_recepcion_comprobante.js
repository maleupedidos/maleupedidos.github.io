/* EL COMPROBANTE DEL PROVEEDOR AL RECIBIR (7/10/2026) — paso 1 de la fase 4.
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_recepcion_comprobante.js [390|1440]
 *   APP=app_viejo_tmp.html ...                <- con el codigo de antes, rojo
 *
 * Lo que tiene que ser cierto:
 *   · con RECEPCION_PG apagada el panel de recibir NO muestra los campos, y el
 *     POST no lleva comprobante (el backend no lo guardaria);
 *   · prendida, los muestra, y lo cargado viaja: tipo, N° y el monto como
 *     numero («90.000» -> 90000, «1.234,50» -> 1234.5);
 *   · prendida y sin cargar nada, el POST no lleva comprobante.
 * La palanca se simula reemplazando `_palancaYa`, que es lo que lee la pantalla.
 * Todo el backend va stubbeado. No toca produccion ni necesita token.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 500) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
};

const BUSQ = {
  ts: 1, total: 1, semActual: 37, anioActual: 2026, stocksProductos: {}, cuentas: [{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' }],
  provs: [{ n: 'Prov Uno', costo: 90000, fProg: '', cats: [{ cat: 'Pack Pizzas', items: [{ v: 'Muzzarella', a: 'PPM', q: 10, qDep: 0, ct: 90000, sem: 37, anio: 2026 }] }] }],
  ocs: [{ oc: 'OC-501', r: 101, prov: 'Prov Uno', prod: 'Pack Pizzas — Muzzarella', abbr: 'PPM', q: 10, est: 'Pedido', canal: 'Clubes', cliente: 'Club Prueba', nped: '', semEnt: 37, vend: '', ent: false, ct: 90000 }],
  clientes: [], enPoderVend: [], deudas: []
};

const extra = palanca => `
  (function(){
    window.__posts=[]; window.__palRec=${palanca ? 'true' : 'false'};
    try{ localStorage.removeItem('maleu_busqueda'); localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_busqueda_tab','proveedores'); localStorage.setItem('maleu_busqueda_sem','actual'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        return Promise.resolve(new Response(JSON.stringify({ok:true,updated:1,avisos:[]}),{status:200,headers:{'Content-Type':'application/json'}}));
      }
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?';
      var cuerpo = a==='busqueda' ? ${JSON.stringify(BUSQ)} : a==='vendedores' ? {ts:1,vendedores:[]}
        : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true} : {ok:false,error:'stub'};
      return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(cuerpo),{status:200,headers:{'Content-Type':'application/json'}})); }, 60); });
    };
  })();
`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  let script = null;
  /* Abre BUSQUEDA de cero, con la palanca dada; devuelve el idx del panel de Prov Uno. */
  const abrirCon = async palanca => {
    if (script) await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
    script = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + extra(palanca) })).identifier;
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    if (!await esperar(cli, `typeof go==='function' && Array.isArray(window.__posts)`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    /* La palanca, como la lee la pantalla. */
    await evaluar(cli, `(function(){ var orig=window._palancaYa; window._palancaYa=function(n){ return n==='recepcionPg' ? window.__palRec : (orig?orig(n):false); }; })(); go('busqueda'); 1`);
    if (!await esperar(cli, `!!document.querySelector('#provList .prov-card .btn-recibir')`, 25000)) { console.log('  BUSQUEDA no pinto'); salir(1); }
    await pausa(600);
    return evaluar(cli, `(function(){ var b=document.querySelector('#provList .prov-card .btn-recibir'); var i=Number((b.getAttribute('onclick')||'').replace(/\\D/g,'')); toggleRecibir(i); return i; })()`);
  };
  const confirmar = async idx => {
    await evaluar(cli, `window.__posts=[]; (function(){ var b=document.querySelector('#recPanel_${idx} .btn-confirmar-recibir'); confirmarRecibir(${idx}, b); })(); 1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='recibirMercaderia'})`, 8000);
    return evaluar(cli, `window.__posts.filter(function(p){return p.action==='recibirMercaderia'})[0]||null`);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    console.log('\n== Recibir: el comprobante del proveedor · ' + ANCHO + 'px · ' + APP + ' ==');

    console.log('\n-- palanca apagada --');
    let idx = await abrirCon(false);
    chk('el panel NO muestra los campos', await evaluar(cli, `!document.getElementById('recCompTipo_${idx}')`));
    let p = await confirmar(idx);
    chk('la recepcion sale', !!p, p);
    chk('sin comprobante', !!p && !('comprobante' in p), p);

    console.log('\n-- palanca prendida, con datos --');
    idx = await abrirCon(true);
    const vis = await evaluar(cli, `(function(){ var e=document.getElementById('recCompNum_${idx}'); if(!e) return null; var r=e.getBoundingClientRect(); return { w: Math.round(r.width), visible: r.width>0&&r.height>0, dentro: r.right<=window.innerWidth }; })()`);
    chk('el panel muestra los campos, visibles y adentro de la pantalla', !!vis && vis.visible && vis.dentro, vis);
    await evaluar(cli, `document.getElementById('recCompTipo_${idx}').value='factura'; document.getElementById('recCompNum_${idx}').value=' A-0001-123 '; document.getElementById('recCompMonto_${idx}').value='90.000'; 1`);
    p = await confirmar(idx);
    const c = p && p.comprobante;
    chk('viaja tipo, N° (sin espacios) y monto como numero', !!c && c.tipo === 'factura' && c.numero === 'A-0001-123' && c.monto === 90000, p);

    console.log('\n-- palanca prendida, monto con decimales --');
    idx = await abrirCon(true);
    await evaluar(cli, `document.getElementById('recCompMonto_${idx}').value='1.234,50'; 1`);
    p = await confirmar(idx);
    chk('«1.234,50» viaja como 1234.5', !!p && p.comprobante && p.comprobante.monto === 1234.5, p);

    console.log('\n-- palanca prendida, sin cargar nada --');
    idx = await abrirCon(true);
    p = await confirmar(idx);
    chk('sin comprobante', !!p && !('comprobante' in p), p);
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
