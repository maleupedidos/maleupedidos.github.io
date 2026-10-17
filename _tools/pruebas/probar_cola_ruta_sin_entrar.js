/* RUTA: LA COLA SE MANDA AUNQUE NO ENTRES A RUTA (17/10/2026).
 *
 *   node _tools/servir.js <puerto libre>      (en otra terminal)
 *   BASE=http://localhost:<puerto> node _tools/pruebas/probar_cola_ruta_sin_entrar.js [390|1440]
 *   APP=app_viejo_tmp.html ...                <- con el codigo de antes, rojo
 *
 * Vicky Fernández, 16/10: tres cobros quedaron en la cola del iPhone de 18:32 a
 * 22:14 sin llegar al servidor. La cola vive adentro de Ruta, Ruta arranca
 * cuando abris su tab, y la app reabre siempre en Resumen. Lo que tiene que ser
 * cierto, SIN tocar la tab Ruta:
 *   · lo que quedo en la cola (de menos de 30 min) se manda solo al abrir;
 *   · lo de mas de 30 min NO se reenvia solo (purga v58), pero pasa a «No se
 *     pudo guardar», va a Log Errores y se avisa con un toast en Resumen;
 *   · con la cola vacia, Ruta no arranca de fondo (no gasta un pedido al servidor).
 * Todo el backend va stubbeado. No toca produccion ni necesita token.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c === true) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); } return false; };

/* `__siembra` la pone cada caso en sessionStorage antes de navegar. */
const EXTRA = `
(function(){
  window.__posts=[];
  try{
    localStorage.clear();
    localStorage.setItem('maleu_token','x');
    localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
    localStorage.setItem('maleu_tab','inicio');
    localStorage.setItem('maleu_ruta_purge_v58','1');
    var s=sessionStorage.getItem('__siembra');
    if(s) localStorage.setItem('maleu_ruta',s);
  }catch(e){}
  var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
    if(x&&String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      var r=b.action==='marcarCobrado'?{ok:true,already:true}:{ok:true};
      return Promise.resolve(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    window.__gets=(window.__gets||[]); window.__gets.push(url.replace(/^.*action=([^&]*).*$/,'$1'));
    var c={ok:true,ts:Date.now(),e:[],pedidos:[],lista:[],datos:[],items:[],v:[],cobros:[],caja:{cuentas:[]},movimientos:[],oc:{lista:[]}};
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(c),{status:200,headers:{'Content-Type':'application/json'}})); },60); });
  };
})();
`;

const cobro = (id, row, ts) => ({ action: 'marcarCobrado', quien: 'Tadeo Ustariz', hoja: 'Home', id: String(id), row: row,
  formaPago: 'Efectivo', ef: 1000, tr: 0, propina: 0, cliente: 'Vicky Fernández', repartidor: 'Tadeo Ustariz', ts: ts });

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const abrirCon = async (siembra) => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    await esperar(cli, `typeof go==='function'`, 60000);
    await evaluar(cli, `sessionStorage.setItem('__siembra',${JSON.stringify(JSON.stringify(siembra || {}))}); 1`);
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1' });
    return esperar(cli, `typeof go==='function'`, 60000);
  };
  const cobrosMandados = () => evaluar(cli, `window.__posts.filter(function(p){return p.action==='marcarCobrado'}).map(function(p){return p.id})`);
  const tab = () => evaluar(cli, `typeof cur!=='undefined'?cur:''`);
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Ruta: la cola sin entrar a Ruta · ' + ANCHO + 'px · ' + APP + ' ==');

    console.log('\n-- tres cobros de hace 2 min en la cola, la app abre en Resumen --');
    const hace2 = Date.now() - 2 * 60 * 1000;
    if (!await abrirCon({ _v: 'v2-row-keyed', syncQueue: [cobro(1120, 1102, hace2), cobro(1123, 1105, hace2), cobro(1170, 1152, hace2)] })) { chk('el ERP arranco', false); salir(1); }


    await esperar(cli, `window.__posts.filter(function(p){return p.action==='marcarCobrado'}).length>=3`, 20000);
    const t1 = await tab();
    chk('la tab abierta NO es Ruta (' + t1 + ')', t1 !== 'ruta', t1);
    const m = await cobrosMandados();
    chk('los tres cobros se mandan solos, en orden', JSON.stringify(m) === JSON.stringify(['1120', '1123', '1170']), m);
    await esperar(cli, `(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).length===0`, 8000);
    const qn = await evaluar(cli, `(JSON.parse(localStorage.getItem('maleu_ruta')||'{}').syncQueue||[]).length`);
    chk('y la cola del teléfono queda en cero', qn === 0, qn);

    console.log('\n-- un cobro de hace 1 h --');
    const hace60 = Date.now() - 60 * 60 * 1000;
    if (!await abrirCon({ _v: 'v2-row-keyed', syncQueue: [cobro(1170, 1152, hace60)] })) { chk('el ERP rearranco', false); salir(1); }
    await esperar(cli, `window.__posts.some(function(p){return p.action==='syncRechazado'})`, 15000);
    await pausa(3500);
    chk('no se reenvía solo', (await cobrosMandados()).length === 0, await cobrosMandados());
    const sr = await evaluar(cli, `window.__posts.filter(function(p){return p.action==='syncRechazado'}).map(function(p){return p.por+':'+(p.item&&p.item.id)})`);
    chk('va a Log Errores como «vieja»', JSON.stringify(sr) === JSON.stringify(['vieja:1170']), sr);
    const toastTxt = await evaluar(cli, `(document.getElementById('toast')||{}).textContent||''`);
    chk('y Resumen lo avisa (toast)', /no se pudo guardar/i.test(toastTxt) && /Ruta/.test(toastTxt), toastTxt);

    console.log('\n-- con la cola vacía --');
    if (!await abrirCon({})) { chk('el ERP rearranco', false); salir(1); }
    await pausa(6000);
    const vive = await evaluar(cli, `!!(typeof _subappsVivas!=='undefined'&&_subappsVivas.ruta)`);
    chk('Ruta no arranca de fondo', vive === false, vive);

    chk('sin errores de JS', !errores.length, errores.slice(0, 3));
  } catch (e) { console.log('  la prueba se corto: ' + (e && e.message || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
