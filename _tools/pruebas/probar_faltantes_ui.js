/* Faltan para entregar, en BUSQUEDA (7/10/2026, Diagnóstico ERP #8).

   node probar_faltantes_ui.js [390|1440]
   APP=app_viejo_tmp.html node probar_faltantes_ui.js 390     ← la direccion contraria
   BASE=http://localhost:8133 node probar_faltantes_ui.js 390

   Todo el backend va STUBBEADO con datos inventados (el repo es publico). Sin token.
   Sostiene:
   · el bloque se ve arriba de BUSQUEDA aunque no haya ninguna OC (que es cuando
     un pedido sin OC no lo ve nadie), con el producto, cuanto falta, el pedido
     y la cuenta (disponible / en camino), y sobre cuantos pedidos miro;
   · «Agregar a la compra de Prov Uno» lleva a + NUEVO con Tadeo — Stock, Prov
     Uno elegido y lo que falta cargado (redondeado para arriba);
   · la carne no tiene boton: va en el pedido de carne;
   · en ARMADO no aparece;
   · sin faltantes dice «No falta nada» Y sobre cuantos pedidos;
   · con el servidor caido y nada guardado NO dice «no falta nada»;
   · el nombre del cliente no se ejecuta; nada se sale del ancho. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
const CEL = ANCHO <= 560;

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
};

const XSS = 'Cliente <img src=x onerror="window.__xss=1">';
const BUSQ = { ts: 1, total: 0, semActual: 41, anioActual: 2026, stocksProductos: {}, cuentas: [], provs: [], clientes: [], deudas: [], ocs: [] };
const CAT = {
  ts: 1, proveedores: ['Prov Uno', 'Caco'],
  deps: [{ id: 'ustariz', nombre: 'Depósito Ustariz', dueno: 'Tadeo' }],
  productos: {
    'Prov Uno': [
      { a: 'PPM', n: 'Pack Pizzas — Muzzarella', cat: 'Pack Pizzas', c: 9000, s: 0, u: 'u', dem: 10, wk: [9, 10, 11], dep: 'ustariz', pd: { ustariz: 0 } },
      { a: 'PPJyQ', n: 'Pack Pizzas — Jamón y Queso', cat: 'Pack Pizzas', c: 9000, s: 2, u: 'u', dem: 4, wk: [4, 4, 4], dep: 'ustariz', pd: { ustariz: 2 } }],
    'Caco': [{ a: 'CVa', n: 'Carnes — Vacío', cat: 'Carnes', c: 20000, s: 2, u: 'kg', dem: 16, wk: [16, 16, 16], dep: 'moresco', pd: { ustariz: 2 } }]
  }
};
const FALT = {
  ok: true, generado: '2026-10-07T16:00:00Z', examinados: { pedidos: 7, lineas: 9, productos: 3 },
  faltan: [
    { a: 'PPM', n: 'Pack Muzzarella x2', u: 'u', falta: 3, disponible: 0, repo: 0, sinCubrir: 3, delFreezer: 0,
      pedidos: [{ hoja: 'Home', n: '10', cli: XSS, q: 3, por: 'Orden de Compra' }] },
    { a: 'PPJyQ', n: 'Pack Jamón y Queso x2', u: 'u', falta: 4.5, disponible: 2, repo: 1, sinCubrir: 0, delFreezer: 7.5,
      pedidos: [{ hoja: 'Pilar', n: '20', cli: 'Otro', q: 7.5, por: 'freezer' }] },
    { a: 'CVa', n: 'Vacío', u: 'kg', falta: 1.5, disponible: 2, repo: 0, sinCubrir: 0, delFreezer: 3.5,
      pedidos: [{ hoja: 'Red', n: '31', cli: 'Carne Red', q: 3.5, por: 'freezer' }] }]
};
const VACIO = { ok: true, generado: '2026-10-07T16:00:00Z', examinados: { pedidos: 4, lineas: 6, productos: 3 }, faltan: [] };

const EXTRA = `
  (function(){
    var fase=(location.search.match(/fase=([a-z])/)||[])[1]||'a';
    window.__fase=fase; window.__gets=[];
    try{ localStorage.removeItem('maleu_busqueda'); localStorage.removeItem('maleu_faltantes'); localStorage.setItem('maleu_tab','inicio'); localStorage.setItem('maleu_busqueda_tab','proveedores'); localStorage.setItem('maleu_busqueda_sem','actual'); }catch(e){}
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      if(url.indexOf('script.google.com')<0) return o.apply(this,arguments);
      if(x&&String(x.method||'').toUpperCase()==='POST') return Promise.resolve(new Response('{"ok":true}',{status:200}));
      var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
      if(a==='faltantes' && fase==='c') return new Promise(function(res,rej){ setTimeout(function(){ rej(new TypeError('Failed to fetch')); },80); });
      var cuerpo = a==='faltantes' ? (fase==='b' ? ${JSON.stringify(VACIO)} : ${JSON.stringify(FALT)})
        : a==='busqueda' ? ${JSON.stringify(BUSQ)} : a==='catalogo' ? ${JSON.stringify(CAT)} : a==='vendedores' ? {ts:1,vendedores:[]}
        : a==='pedidosLight' ? {ts:1,pedidos:[],canales:[],light:true} : {ok:false,error:'stub'};
      var txt=JSON.stringify(cuerpo);
      return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); }, 80); });
    };
  })();
`;

const TXT = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent.replace(/\\s+/g,' '):'';})()`;
const VIS = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';})()`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async fase => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&fase=' + fase });
    if (!await esperar(cli, `typeof go==='function' && window.__fase===${JSON.stringify(fase)}`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('busqueda'); 1`);
    if (!await esperar(cli, `typeof abaSwitchTab==='function'`, 20000)) { console.log('  la tab no arranco'); salir(1); }
    await esperar(cli, `window.__gets.indexOf('busqueda')>=0 && window.__gets.indexOf('catalogo')>=0`, 15000);
    await pausa(700);
    /* El panel puede terminar de arrancar DESPUES del go() y volver a su tab:
       sin la pagina a la vista, todo mide 0 px y la prueba miente. */
    await evaluar(cli, `go('busqueda'); 1`);
    if (!await esperar(cli, `getComputedStyle(document.getElementById('p-busqueda')).display!=='none'`, 10000)) { console.log('  la pagina de Abastecimiento no se ve'); salir(1); }
    await pausa(300);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: CEL ? 844 : 900, deviceScaleFactor: 1, mobile: CEL });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== Faltan para entregar · ' + ANCHO + 'px · ' + APP + ' ==');

    /* ═════════ A: hay faltantes, BUSQUEDA sin OC ═════════ */
    await ir('a');
    const llego = await esperar(cli, `/Faltan para entregar/.test(${TXT('#abaFaltBox')})`, 15000);
    const t = await evaluar(cli, TXT('#abaFaltBox'));
    chk('pide faltantes al backend', await evaluar(cli, `window.__gets.indexOf('faltantes')>=0`) === true);
    chk('el bloque se ve en BUSQUEDA aunque no haya ninguna OC', llego && await evaluar(cli, VIS('#abaFaltBox')) === true, t);
    chk('dice cuantos productos y sobre cuantos pedidos miro', /3 productos/.test(t) && /7 pedidos abiertos/.test(t), t);
    chk('cada producto con cuanto falta, el pedido y por que', /Pack Muzzarella x2/.test(t) && /Home #10/.test(t) && /OC sin generar/.test(t) && /Pilar #20/.test(t) && /del freezer/.test(t), t);
    chk('la cuenta: disponible y lo que esta en camino', /Disponible 2/.test(t) && /en camino 1/.test(t), t);
    chk('el nombre del cliente se muestra como texto y no se ejecuta', await evaluar(cli, `!window.__xss && !document.querySelector('#abaFaltBox img')`) === true);
    const btns = await evaluar(cli, `[].map.call(document.querySelectorAll('#abaFaltBox .aba-falt-btn'),function(b){return b.textContent})`);
    chk('un boton por producto que se compra (PPM y PPJyQ, la carne no)', btns.length === 2 && btns.every(b => /Agregar a la compra de Prov Uno/.test(b)), btns);
    chk('la carne dice que va en el pedido de carne', /La carne no se compra desde acá/.test(t), t);
    const anchos = await evaluar(cli, `(function(){var b=document.getElementById('abaFaltBox'); var r=b.getBoundingClientRect(); var malos=[].filter.call(b.querySelectorAll('*'),function(e){var q=e.getBoundingClientRect(); return q.width>0 && (q.right>r.right+1||q.left<r.left-1);}).length; return {malos:malos, ancho:r.width, doc:document.documentElement.scrollWidth, vw:innerWidth};})()`);
    chk('nada se sale del bloque ni de la pantalla', anchos.malos === 0 && anchos.doc <= anchos.vw, anchos);
    if (CEL) {
      const alto = await evaluar(cli, `Math.min.apply(null,[].map.call(document.querySelectorAll('#abaFaltBox .aba-falt-btn'),function(b){return b.getBoundingClientRect().height}))`);
      chk('el boton se puede tocar (≥ 40 px)', alto >= 40, alto);
    }

    /* el boton: + NUEVO con todo cargado */
    await evaluar(cli, `[].filter.call(document.querySelectorAll('#abaFaltBox .aba-falt-btn'),function(b){return /PPJyQ/.test(b.getAttribute('onclick'))})[0].click(); 1`);
    await pausa(500);
    const nuevo = await evaluar(cli, `({tab:((document.querySelector("#pg-abast .tab.active")||{}).getAttribute||function(){return null}).call(document.querySelector("#pg-abast .tab.active"),"data-tab"), vis:${VIS('#abaNuevoView')}, vend:document.getElementById('npVendedor').value, prov:document.getElementById('npProv').value,
      q:(document.getElementById('npq_PPJyQ')||{}).value, qs:(document.getElementById('npSummary')||{}).textContent||'', conf:(document.getElementById('npConfirm')||{}).disabled, falt:${VIS('#abaFaltBox')}})`);
    chk('lleva a + NUEVO', nuevo.tab === 'nuevo' && nuevo.vis === true, nuevo);
    chk('con Tadeo — Stock y el proveedor del producto elegidos', nuevo.vend === 'Tadeo — Stock' && nuevo.prov === 'Prov Uno', nuevo);
    chk('y lo que falta cargado, redondeado para arriba (4,5 → 5)', String(nuevo.q) === '5' && /5 × Pack Pizzas — Jamón y Queso/.test(nuevo.qs) && nuevo.conf === false, nuevo);
    chk('el bloque no se ve fuera de BUSQUEDA', nuevo.falt === false, nuevo);
    await evaluar(cli, `abaSwitchTab('pedidos'); 1`); await pausa(200);
    chk('en ARMADO tampoco', await evaluar(cli, VIS('#abaFaltBox')) === false);

    /* ═════════ B: no falta nada ═════════ */
    await ir('b');
    await esperar(cli, `/No falta nada/.test(${TXT('#abaFaltBox')})`, 15000);
    const tb = await evaluar(cli, TXT('#abaFaltBox'));
    chk('sin faltantes dice «No falta nada» y sobre cuantos pedidos miro', /No falta nada/.test(tb) && /4 pedidos abiertos/.test(tb), tb);

    /* ═════════ C: servidor caido, nada guardado ═════════ */
    await ir('c');
    await esperar(cli, `/No pude/.test(${TXT('#abaFaltBox')})`, 15000);
    const tc = await evaluar(cli, TXT('#abaFaltBox'));
    chk('caido: dice que no pudo, nunca «no falta nada»', /No pude calcular/.test(tc) && !/No falta nada/.test(tc), tc);

    chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
  } catch (e) { console.log('  revento: ' + (e && e.stack || e)); mal++; }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
