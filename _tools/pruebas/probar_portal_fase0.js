/* MI PORTAL, FASE 0 (5/10/2026): que abra rapido, lo vencido arriba, el
   telefono, los 44 px, sin WhatsApp al guardar, y «Ver como» para el admin.

     node _tools/pruebas/probar_portal_fase0.js [puerto]      (default 8095)

   Sin backend: el `fetch` de abajo de todo esta reemplazado ANTES de que
   arranque el ERP, asi el envoltorio del panel —donde vive el corte del
   vendedor— envuelve al falso y se prueba de verdad. Datos INVENTADOS: este
   repo es publico. Ningun POST sale de la maquina.

   CASOS REALES DETRAS:
   · Marcos, 5/10: 4 pedidos del viernes 2/10 sin marcar, y Inicio decia
     "Esta semana 0 pedidos" y su nivel "$62.500".
   · Abrir el portal en frio tardaba 14,4 s: cinco pedidos de admin que el
     backend le niega hacian fila delante del suyo.
   · La copia guardada tardaba 4,8 s en aparecer: esperaba a que venciera el
     reloj de 5 s de `resolverVendedor`.

   Contra el red.html / panel anteriores tiene que dar ROJOS.
*/
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const T = ms => new Promise(r => setTimeout(r, ms));
const PUERTO = Number(process.argv[2] || 8095);
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); } };

/* Fechas relativas a HOY (Argentina), para que la prueba no envejezca. */
const hoyAr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
const iso = n => { const d = new Date(hoyAr); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const P = (n, c, fe, es, ep, $, row, t) => ({ n, c, f: '01/01', de: 'Viernes', $, com: 1000, env: 0, gan: 1000, aPg: $ - 1000, es, fp: 'Transferencia', ep,
  ef: 0, tr: 0, pEf: 0, pTr: 0, fpm: '', epm: 'Pendiente', fpmF: '', b: 'Barrio Prueba', l: String(row), t: t || '1155550000',
  prods: [{ a: 'PMu', q: 1 }], vi: false, row, envAnu: '', fe, cn: true, _y: 2026, _sem: 1 });
const PEDIDOS = [
  P('301', 'Cliente Uno', iso(-3), 'Pendiente', 'No Cobrado', 100000, 10),   // vencido: falta la entrega
  P('302', 'Cliente Dos', iso(-3), 'Entregado', 'No Cobrado', 50000, 11),    // vencido: falta el cobro
  P('303', 'Cliente Tres', iso(0), 'Pendiente', 'No Cobrado', 70000, 12),    // es hoy: no vencido
  P('304', 'Cliente Cuatro', iso(4), 'Pendiente', 'No Cobrado', 80000, 13),  // futuro
  P('305', 'Cliente Cinco', iso(-3), 'Cancelado', 'No Cobrado', 60000, 14),  // cancelado
  Object.assign(P('306', 'Cliente Seis', '', 'Pendiente', 'No Cobrado', 40000, 15), { fe: undefined }), // copia vieja sin fe
  P('307', 'Cliente Siete', iso(-10), 'Entregado', 'Cobrado', 90000, 16),    // cerrado
];
const BANDAS = [{ nivel: 'inicial', desde: 0 }, { nivel: 'intermedio', desde: 1000000 }, { nivel: 'top', desde: 2500000 }];
const Z = { facturado: 0, pedidos: 0, comision: 0, envio: 0, ganancia: 0 };
const DASH = {
  ok: true,
  stats: { semana: Object.assign({ n: 41, lun: '05/10', dom: '11/10' }, Z), mes: Object.assign({ nombre: 'Octubre', semanas: [] }, Z),
    mesesAnt: [], total: Object.assign({}, Z), comision: 0, ganancia: 0, viernes: { total: 0, entregados: 0, dias: [] }, pendCobrar: 0, pendLiquidar: 0,
    escala: { nivel: 'inicial', facturado: 900000, bandas: BANDAS, siguiente: { nivel: 'intermedio', desde: 1000000, falta: 100000 },
      pendiente: { monto: 100000, n: 1, facturado: 1000000, nivel: 'intermedio' } } },
  pedidos: PEDIDOS, clientes: [], liqBySem: {}, cuentas: [],
  tg: { vinculado: false, link: '' },
  tareas: { modo: 'vender', semana: '2026-W41', resultados: ['Compró', 'No contesta'], lista: [
    { id: 'recompra', clase: 'blanda', titulo: 'Llamá a 2 clientes', sub: '', items: [
      { c: 'Sin Telefono', clave: 'Sin Telefono', t: '-', det: 'hace 60 días' },
      { c: 'Con Telefono', clave: 'Con Telefono', t: '1155550002', det: 'hace 90 días' }] }] },
};

/* El fetch falso, instalado antes que el ERP. `resolverVendedor` tarda 6 s y
   `dashboardVendedor` 3 s, a proposito: la copia tiene que aparecer antes de
   los dos. */
function prep(sesPanel, sesRed, conCopia) {
  const ls = { maleu_token: 'token-de-prueba', maleu_panel_session: JSON.stringify(sesPanel) };
  if (sesRed) ls.maleu_red_session = JSON.stringify(sesRed);
  if (conCopia) ls['maleu_red_dash_' + sesRed.nombre] = JSON.stringify({ ts: Date.now() - 600000, data: DASH });
  return `(function(){
    try{ if(!sessionStorage.getItem('__prep')){ localStorage.clear(); var L=${JSON.stringify(ls)}; for(var k in L) localStorage.setItem(k,L[k]); sessionStorage.setItem('__prep','1'); } }catch(e){}
    window.__t0=Date.now(); window.__gets=[]; window.__posts=[]; window.__err=[];
    window.addEventListener('error',function(e){window.__err.push(String(e.message));});
    window.confirm=function(){return true;}; window.alert=function(){};
    var DASH=${JSON.stringify(DASH)};
    var orig=window.fetch.bind(window);
    function resp(o,ms){ return new Promise(function(r){ setTimeout(function(){ r(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||30); }); }
    window.fetch=function(u,x){
      var url=String(u&&u.url||u);
      if(url.indexOf('script.google.com/macros')<0) return orig(u,x);
      if(x&&String(x.method||'').toUpperCase()==='POST'){ try{window.__posts.push(JSON.parse(x.body));}catch(e){} return resp({ok:true,applied:['prueba']}); }
      var a=(url.match(/action=([A-Za-z]+)/)||[])[1]||'';
      window.__gets.push(a + (a==='dashboardVendedor' ? ':' + decodeURIComponent((url.match(/nombre=([^&]*)/)||[])[1]||'') : ''));
      if(a==='vendedores') return resp({vendedores:[{nombre:'Marcos Bottcher',partido:'Pilar'},{nombre:'Fini Mihailovitch',partido:'Pilar'}]});
      if(a==='dashboardVendedor') return resp(DASH, 3000);
      if(a==='resolverVendedor') return resp({ok:true,nombre:'Marcos Bottcher',usuario:'marcos'}, 6000);
      if(a==='miSesion') return resp({ok:true,usuario:${JSON.stringify(sesPanel.usuario)},rol:${JSON.stringify(sesPanel.rol)},tabs:${JSON.stringify(sesPanel.tabs)}});
      return resp({ok:true});
    };
  })();`;
}

const VISIBLE = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; for(var n=e;n&&n!==document.body;n=n.parentElement){var cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden') return false;} return e.getBoundingClientRect().height>0;})()`;

let _prepId = null;
async function cargar(cli, src) {
  /* Un solo PREP por vez: CDP acumula los scripts, y el de la carga anterior
     corria primero y le ganaba al nuevo. */
  if (_prepId) await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: _prepId });
  _prepId = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

    /* ════════ 1. EL VENDEDOR ════════ */
    console.log('\n== El vendedor abre su portal (con copia guardada) ==');
    const sesV = { usuario: 'marcos', rol: 'vendedor', nombre: 'Marcos Bottcher', ts: Date.now(), tabs: ['miportal'] };
    await cargar(cli, prep(sesV, { ok: true, nombre: 'Marcos Bottcher', usuario: 'marcos', wa: '' }, true));
    let tCopia = null;
    for (let i = 0; i < 80; i++) { await T(100); try { if (await evaluar(cli, VISIBLE('#dash-content'))) { tCopia = await evaluar(cli, 'Date.now()-window.__t0'); break; } } catch (e) {} }
    chk('la copia guardada aparece antes de que conteste el backend (< 2,5 s)', tCopia !== null && tCopia < 2500, { tCopia });
    await T(3500);   // que llegue el dashboard fresco (3 s)

    const gets = await evaluar(cli, 'window.__gets');
    const PROHIBIDOS = ['sbToken', 'lote', 'pedidosLight', 'cobrosPendientes', 'cajaLight', 'ocLight', 'admin', 'ventas', 'tendencia'];
    const viajaron = gets.filter(g => PROHIBIDOS.indexOf(g) >= 0);
    chk('no viaja ningun pedido de admin', viajaron.length === 0, { viajaron, gets });
    chk('su dashboard si viaja', gets.some(g => g === 'dashboardVendedor:Marcos Bottcher'), gets);
    const corte = await evaluar(cli, `(function(){ return fetch('https://script.google.com/macros/s/x/exec?action=lote&t=1').then(function(r){return r.json();}).then(function(d){return {d:d, viajo: window.__gets.indexOf('lote')>=0};}); })()`, true).catch(e => ({ err: String(e) }));
    chk('un pedido de admin se contesta "sin permiso" sin viajar', corte && corte.d && corte.d.forbidden === true && corte.viajo === false, corte);

    console.log('\n== Lo vencido, arriba ==');
    const venc = await evaluar(cli, `(function(){var b=document.getElementById('venc-card'); if(!b) return {existe:false};
      return {existe:true, oculta:b.classList.contains('hidden'), filas:b.querySelectorAll('.vc-row').length, txt:(b.innerText||'').replace(/\\s+/g,' '),
              arriba: b.getBoundingClientRect().top < document.getElementById('escala-card').getBoundingClientRect().top,
              alto: Math.min.apply(null,[].map.call(b.querySelectorAll('.vc-row'),function(x){return x.getBoundingClientRect().height;}))};})()`);
    chk('la tarjeta aparece', venc.existe === true && venc.oculta === false, venc);
    chk('trae los 2 vencidos (no lo de hoy, ni lo futuro, ni cancelado, ni cerrado, ni sin fecha)', venc.filas === 2, venc);
    chk('dice cuantos y cuanta plata', /2 pedidos quedaron sin marcar/.test(venc.txt) && /150\.000/.test(venc.txt), venc.txt);
    chk('dice que falta en cada uno', /falta marcar la entrega/.test(venc.txt) && /falta marcar el cobro/.test(venc.txt), venc.txt);
    chk('va antes que el nivel', venc.arriba === true, venc);
    chk('cada fila se toca con el pulgar (>= 44 px)', venc.alto >= 44, venc.alto);
    chk('no habla de cobrar ni rendir por el vendedor', !/cobr[aá]s|rend[ií]s|le rend/i.test(venc.txt), venc.txt);

    const esc = await evaluar(cli, `(function(){var e=document.querySelector('#escala-card .ec-pend'); return e?(e.innerText||'').replace(/\\s+/g,' '):'';})()`);
    chk('el nivel dice lo que llevaria si marca', /1 pedido sin marcar entregado/.test(esc) && /1\.000\.000/.test(esc), esc);
    chk('y el nivel al que pasa', /intermedio/i.test(esc), esc);
    const escFact = await evaluar(cli, `(document.querySelector('#escala-card .ec-fact')||{}).textContent||''`);
    chk('el numero grande sigue siendo lo entregado', /900\.000/.test(escFact), escFact);

    console.log('\n== El telefono y los 44 px de las tareas ==');
    const tk = await evaluar(cli, `(function(){var c=document.getElementById('tareas-card');
      var tels=[].map.call(c.querySelectorAll('.tk-tel'),function(a){var b=a.getBoundingClientRect();return {href:a.getAttribute('href'),h:Math.round(b.height),w:Math.round(b.width)};});
      var res=[].map.call(c.querySelectorAll('.tk-res button'),function(x){return Math.round(x.getBoundingClientRect().height);});
      return {tels:tels,res:res};})()`);
    chk('sin telefono no hay boton de llamar', tk.tels.length === 1 && tk.tels[0].href === 'tel:1155550002', tk.tels);
    chk('el boton de llamar mide 44 px', tk.tels.length === 1 && tk.tels[0].h >= 44 && tk.tels[0].w >= 44, tk.tels);
    chk('los resultados miden 44 px', tk.res.length > 0 && tk.res.every(h => h >= 44), tk.res);

    console.log('\n== Tocar un vencido lleva a su parada ==');
    await evaluar(cli, `document.querySelector('#venc-card .vc-row').click(); 1`);
    await T(400);
    const ruta = await evaluar(cli, `({vis:${VISIBLE('#mview-ruta')}, txt:(document.getElementById('ruta-content').innerText||'').slice(0,200)})`);
    chk('abre Ruta en el pedido que se toco', ruta.vis === true && /Cliente Uno/.test(ruta.txt), ruta);

    console.log('\n== Guardar un pedido nuevo no abre WhatsApp ==');
    await evaluar(cli, `validateNuevo=function(){return true;}; sendOrderWithRetry=function(){return Promise.resolve({ok:true});};
      try{ cart[PRODUCTOS[0].id]=1; }catch(e){} try{ showNuevoPedido(); }catch(e){}
      document.getElementById('f-cliente').value='Prueba'; document.getElementById('f-telefono').value='1155550003';
      document.getElementById('f-lote').value='1'; enviar(); 1`);
    await T(2500);
    const dondeEstoy = await evaluar(cli, 'location.href').catch(() => 'navego');
    chk('sigue en el ERP (no salto a wa.me)', /^http:\/\/localhost/.test(dondeEstoy), dondeEstoy);
    const btnTxt = await evaluar(cli, `(document.getElementById('btn-enviar')||{}).textContent||''`).catch(() => '');
    chk('el boton ya no promete WhatsApp', !/whatsapp/i.test(btnTxt), btnTxt);

    /* ════════ 2. EL ADMIN, «VER COMO» ════════ */
    console.log('\n== El admin: «Ver como» ==');
    await cli.enviar('Runtime.evaluate', { expression: 'sessionStorage.clear()' });
    const sesA = { usuario: 'tadeo', rol: 'admin', nombre: 'Tadeo', ts: Date.now(), tabs: ['inicio', 'miportal'] };
    /* Con una sesion de vendedor vieja guardada, a proposito: el admin igual
       tiene que caer en la lista, no adentro del portal de esa prueba vieja. */
    await cargar(cli, prep(sesA, { ok: true, nombre: 'Fini Mihailovitch', usuario: 'fini', wa: '' }, false));
    for (let i = 0; i < 60; i++) { await T(200); try { if (await evaluar(cli, `typeof go==='function'`)) break; } catch (e) {} }
    await T(1500);
    await evaluar(cli, `go('miportal'); 1`);
    for (let i = 0; i < 40; i++) { await T(200); try { if (await evaluar(cli, `document.querySelectorAll('#vercomo-box .vc-lista button').length>0`)) break; } catch (e) {} }
    const lista = await evaluar(cli, `({box:${VISIBLE('#vercomo-box')}, login:${VISIBLE('#screen-login')}, n:document.querySelectorAll('#vercomo-box .vc-lista button').length})`);
    chk('el admin ve la lista de vendedores', lista.box === true && lista.n === 2, lista);
    chk('  ...y no el login de vendedor', lista.login === false, lista);

    await evaluar(cli, `document.querySelector('#vercomo-box .vc-lista button').click(); 1`);
    await T(3800);
    const vc = await evaluar(cli, `({bar:${VISIBLE('#vercomo-bar')}, txt:(document.getElementById('vercomo-txt')||{}).textContent||'', dash:${VISIBLE('#dash-content')},
      venc:document.querySelectorAll('#venc-card .vc-row').length, gets:window.__gets.filter(function(g){return g.indexOf('dashboardVendedor')===0;})})`);
    chk('entra al portal de Marcos con la barra a la vista', vc.bar === true && /Marcos Bottcher/.test(vc.txt) && vc.dash === true, vc);
    chk('pide el dashboard de Marcos', vc.gets.indexOf('dashboardVendedor:Marcos Bottcher') >= 0, vc.gets);
    chk('ve lo mismo que el vendedor (sus vencidos)', vc.venc === 2, vc.venc);

    await evaluar(cli, `redIrAPedido('301',10); 1`); await T(300);
    await evaluar(cli, `window.__posts=[]; rutaToggleEntrega(); 1`); await T(600);
    const posts = await evaluar(cli, 'window.__posts');
    const pu = posts.find(p => p.action === 'updatePedidoRed');
    chk('marca entregado por el vendedor (POST con su nombre)', !!pu && pu.vendedor === 'Marcos Bottcher' && pu.updates && pu.updates.entrega === true, posts);

    await evaluar(cli, `liqOpen(2026,40,1000,1); 1`); await T(200);
    chk('desde «Ver como» no se liquida la semana del vendedor', (await evaluar(cli, VISIBLE('#liq-modal'))) === false);
    await evaluar(cli, `window.__posts=[]; var b=document.querySelector('#tareas-card .tk-res button'); if(b) b.click(); 1`); await T(300);
    chk('ni se cuenta una tarea como si fuera suya', (await evaluar(cli, 'window.__posts.length')) === 0);

    await evaluar(cli, `doLogout(); 1`); await T(400);
    const fuera = await evaluar(cli, `({box:${VISIBLE('#vercomo-box')}, bar:${VISIBLE('#vercomo-bar')}, token:!!localStorage.getItem('maleu_token'),
      red:localStorage.getItem('maleu_red_session')})`);
    chk('Salir vuelve a la lista', fuera.box === true && fuera.bar === false, fuera);
    chk('  ...sin cerrarle la sesion del ERP al admin', fuera.token === true, fuera);
    chk('  ...y sin dejar guardado "logueado como Marcos"', !/Marcos/.test(String(fuera.red || '')), fuera.red);

    const corteA = await evaluar(cli, `(function(){ window.__gets=[]; return fetch('https://script.google.com/macros/s/x/exec?action=lote&t=2').then(function(){ return window.__gets.indexOf('lote')>=0; }); })()`, true).catch(e => String(e));
    chk('al admin NO se le corta nada: lo suyo viaja', corteA === true, corteA);

    const errs = await evaluar(cli, 'window.__err');
    chk('sin errores de JS', errs.length === 0, errs);
  } catch (e) { mal++; console.log('  MAL  revento: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
