/* BBDD > Clientes (14/9/2026, /auditoria).

   node probar_bbdd_clientes.js [390|1440]
   APP=app_viejo_tmp.html node probar_bbdd_clientes.js 390    ← la direccion contraria

   Sin token: el backend va STUBBEADO con clientes y pedidos INVENTADOS (el repo es
   publico). Los POST se interceptan y se guardan para mirar que mandan.

   Sostiene:
   · FASE a — la lista se dibuja de a 80 y "Ver mas" suma; los montos van sin
     centavos; los numeros de los filtros cuentan lo que queda con el barrio puesto;
     el buscador ignora acentos y encuentra por telefono; un nombre no se ejecuta
     como HTML; una tarjeta con apostrofe en la key abre; en el celular el texto no
     queda debajo de los botones; entrar a BBDD no pide el volcado ni le apaga la
     sub-tab a Estancias; el ↻ espera los datos y dice de cuando son.
     La FICHA: el historial sale de los pedidos del cliente por referencia (Red y
     Clubes incluidos, sin mezclar a otro con el mismo nombre) y cierra con el KPI;
     si no cierra le pide el historial al servidor; la respuesta que llega tarde no
     le pisa el formulario de "Editar ficha"; guardar la ficha no congela lo
     detectado ni des-oculta nombres; la carne dice kilos y su nombre.
   · FASE b — el servidor falla sin copia: la pantalla lo dice y tiene Reintentar.
   · FASE c — copia vieja y servidor lento: dice de cuando es lo que se ve, y si
     falla, que no se pudo.
   · FASE d — la bitacora contesta un error: no se borra la guardada. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 400) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(150); }
  return false;
};

/* ── LOS DATOS INVENTADOS ── */
const BARRIOS = ['Estancias del Pilar', 'Pilara', 'Los Alcanfores'];
const SUBS = ['Golf', 'La Pionera', 'Champagnat Alto', 'El Recuerdo'];
const ESTADOS = ['Activo', 'Dormido', 'Inactivo', 'Nuevo'];
const CLIS = [], PEDS = [];
let nPed = 1;
function pedido(h, c, extra) {
  const n = nPed++;
  const p = Object.assign({ n: String(n), h, r: n + 1, c, f: '10/09', fe: '10/09', dee: '2026-09-10', fex: '2026-09-10', de: 'Jueves', es: 'Entregado', ep: 'Cobrado', $: 20000, p: [{ a: 'PPM', q: 1 }] }, extra || {});
  PEDS.push(p);
  return h + '|' + n + '|' + p.r;
}
for (let i = 0; i < 300; i++) {
  const tel = '1100' + String(100000 + i * 37).slice(-6);
  const c = { key: tel, tel, telDisplay: tel, nombre: 'Cliente ' + (i + 1), nombresAlt: [], barrio: BARRIOS[i % 3], subBarrio: i % 3 === 0 ? SUBS[i % 4] : '',
    lote: i % 3 === 0 ? String(10 + i) : '', club: '', canalDom: i % 7 === 0 ? 'Pilar' : 'Home', canales: ['Home'], canalesExtra: [],
    pedidos: 1, entregados: 1, ventas: 1, facturado: 20000 + i * 111.37, cobrado: 20000, deuda: i % 17 === 0 ? 15000 : 0, ticket: 20000, frecuencia: 0,
    diasUltima: i % 60, ultimaFecha: '10/09/2026', primeraFecha: '01/01/2026', estado: ESTADOS[i % 4], vip: i % 10 === 0, cumple: '', notas: '', tags: '',
    nombreCanonico: '', nombresOcultos: [], subBarrioMapa: '', loteMapa: '', barrioMapa: '', canalMapa: '', sinUbicacion: false, residencia: '', refs: [] };
  c.refs.push(pedido('Home', c.nombre));
  CLIS.push(c);
}
// casos con nombre
const X = CLIS[3]; X.nombre = 'Casa <img src=x onerror="window.__xss=1">';
const JOSE = CLIS[4]; JOSE.nombre = 'José Iñiguez';
const APOS = CLIS[5]; APOS.key = "NOMBRE:d'agostino"; APOS.tel = ''; APOS.telDisplay = ''; APOS.nombre = "D'Agostino";
const DEC = CLIS[0]; DEC.facturado = 1226197.222;
// Casa Doble: un pedido de Home, uno de Red y uno de Clubes (el volcado les pone sufijo al nombre)
const DOBLE = CLIS[6]; DOBLE.nombre = 'Casa Doble'; DOBLE.refs = [];
DOBLE.refs.push(pedido('Home', 'Casa Doble', { p: [{ a: 'CLo', q: 1.5 }, { a: 'PPM', q: 2 }], $: 83500 }));
DOBLE.refs.push(pedido('Red', 'Casa Doble (Red: Vende Uno)', { $: 41500, dee: '2026-09-11', fex: '' }));
DOBLE.refs.push(pedido('Clubes', 'Casa Doble (Champagnat)', { $: 26000, dee: '2026-09-12', fex: '' }));
DOBLE.pedidos = 3; DOBLE.entregados = 3; DOBLE.ventas = 3;
// el mismo nombre en OTRO cliente: su pedido no puede aparecer en la ficha de Casa Doble
const HOMO = CLIS[7]; HOMO.nombre = 'Casa Doble'; HOMO.refs = [pedido('Home', 'Casa Doble', { $: 99999 })];
// uno cuya lista no cierra con el volcado: tiene que pedirle el historial al servidor
const RARO = CLIS[8]; RARO.nombre = 'Cliente Raro'; RARO.pedidos = 2; RARO.refs = [RARO.refs[0], 'Home|9999|9999'];
// uno con un nombre oculto y sin correcciones de mapa
const OCUL = CLIS[9]; OCUL.nombre = 'Con Oculto'; OCUL.nombresOcultos = ['Alias Viejo']; OCUL.nombresAlt = ['Otro Tipeo']; OCUL.subBarrio = 'Golf'; OCUL.lote = '77'; OCUL.barrio = 'Estancias del Pilar';
const RESP = { ts: 1, clientes: CLIS, lite: false, kg: ['CLo'], nombres: { CLo: 'Carne Lomo', PPM: 'Pack Muzzarella x2' } };
const FICHA_RARO = { ts: 1, cliente: { key: RARO.key, tel: RARO.tel, nombre: 'Cliente Raro', nombresVariantes: { 'Cliente Raro': 2 }, telefonos: {}, barrios: {}, subBarrios: {}, domicilios: {}, clubes: {}, canales: { Home: 2 },
  pedidos: [{ canal: 'Home', nPed: '1', fecha: '10/09/2026', total: 20000, estado: 'Entregado', pago: 'Cobrado', productos: [{ a: 'CLo', q: 2 }] }], topProductos: [{ abrev: 'CLo', u: 'kg', cant: 2, monto: 66000 }],
  totalFacturado: 40000, totalCobrado: 40000, deuda: 0, countPedidos: 2, countEntregados: 2, kpis: { ventas: 2, ticket: 20000, frecuencia: 0, diasUltima: 1, estado: 'Activo', vip: false }, meta: null } };
const INTER = { interacciones: [{ id: 'i1', fecha: '01/09/2026 10:00', key: CLIS[10].key, tel: CLIS[10].tel, nombre: 'Cliente 11', resultado: 'Pidio', nota: '' }] };

const EXTRA = `
  (function(){
    var fase=(location.search.match(/fase=([a-z])/)||[])[1]||'a';
    window.__fase=fase; window.__gets=[]; window.__posts=[]; window.__RESP=${JSON.stringify(RESP)}; window.__FICHA=${JSON.stringify(FICHA_RARO)}; window.__INTER=${JSON.stringify(INTER)};
    try{
      localStorage.setItem('maleu_tab','bbdd');
      localStorage.removeItem('ma3');
      if(fase!=='c'){ localStorage.removeItem('maleu_crm_clientes_v1'); localStorage.removeItem('maleu_crm_clientes_ts'); }
      else if(!sessionStorage.getItem('__sembrado')){ localStorage.setItem('maleu_crm_clientes_v1', JSON.stringify(window.__RESP.clientes)); localStorage.setItem('maleu_crm_clientes_ts', String(Date.now()-3*3600*1000)); sessionStorage.setItem('__sembrado','1'); }
      if(fase==='d' && !sessionStorage.getItem('__sembradoI')){ localStorage.setItem('maleu_crm_inter_v1', JSON.stringify([{id:'guardada',fecha:'02/09/2026 11:00',key:'x',tel:'x',nombre:'x',resultado:'Pidio'}])); sessionStorage.setItem('__sembradoI','1'); }
    }catch(e){}
    function resp(txt,ms){ return new Promise(function(res){ setTimeout(function(){ res(new Response(txt,{status:200,headers:{'Content-Type':'application/json'}})); },ms); }); }
    var o=window.fetch; window.fetch=function(u,x){
      var url=String((u&&u.url)||u||'');
      var post=x&&String(x.method||'').toUpperCase()==='POST';
      if(url.indexOf('script.google.com')>-1&&post){ try{ window.__posts.push(JSON.parse(x.body)); }catch(e){} return resp('{"ok":true}',50); }
      if(url.indexOf('script.google.com')>-1){
        var m=url.match(/action=([a-zA-Z_]+)/); var a=m?m[1]:'?'; window.__gets.push(a);
        if(a==='crmClientes'){
          if(fase==='b' && !window.__clientesOk) return resp('{"ok":false,"error":"stub"}',150);
          if(fase==='c') return resp(window.__clientesOk?JSON.stringify(window.__RESP):'{"ok":false,"error":"stub"}',6000);
          return resp(JSON.stringify(window.__RESP), window.__lento?2500:150);
        }
        if(a==='crmInteracciones') return resp(fase==='d'?'{"ok":false,"error":"stub"}':JSON.stringify(window.__INTER),120);
        if(a==='crmCliente'){
          var km=url.match(/[?&]key=([^&]+)/), kk=km?decodeURIComponent(km[1]):'';
          return resp(kk===window.__FICHA.cliente.key?JSON.stringify(window.__FICHA):'{"ok":false,"error":"no encontrado"}', window.__fichaLenta?1800:150);
        }
        return resp('{"ok":false,"error":"stub"}',100);
      }
      return o.apply(this,arguments); };
  })();
`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((met, p) => { if (met === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'excepcion'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  const ir = async fase => {
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?prueba=1&fase=' + fase });
    if (!await esperar(cli, `typeof go==='function' && window.__fase===${JSON.stringify(fase)}`, 60000)) { console.log('  el ERP no arranco'); salir(1); }
    await evaluar(cli, `go('bbdd');1`);
  };
  const toca = sel => evaluar(cli, `(function(){ var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true; })()`);
  const tarjeta = nom => `[].slice.call(document.querySelectorAll('#crmCliList .crm-card')).filter(function(x){ var n=x.querySelector('.crm-card-name'); return n && n.firstChild && n.firstChild.textContent.trim()===${JSON.stringify(nom)}; })[0]`;
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO <= 560 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + EXTRA });
    console.log('\n== BBDD > Clientes · ' + ANCHO + 'px · ' + APP + ' · ' + CLIS.length + ' clientes inventados ==');
    const FASES = process.env.FASES || 'abcd';

    if (FASES.indexOf('a') >= 0) {
      await ir('a');
      const pinto = await esperar(cli, `document.querySelectorAll('#crmCliList .crm-card').length>0`, 20000);
      chk('la lista se dibuja', pinto);
      if (!pinto) salir(1);
      await pausa(400);
      chk('dibuja 80 tarjetas y no las 300 de un saque', await evaluar(cli, `document.querySelectorAll('#crmCliList .crm-card').length`) === 80);
      chk('"Ver más" suma 100', await toca('#crmCliMas button') && (await pausa(200), await evaluar(cli, `document.querySelectorAll('#crmCliList .crm-card').length`)) === 180);
      chk('los montos van sin centavos (lista y total)', await evaluar(cli, `!/\\$[\\d.]+,\\d/.test(document.getElementById('crmCliList').textContent + document.getElementById('crmCliStats').textContent)`),
        await evaluar(cli, `(document.getElementById('crmCliStats').textContent)`));
      chk('entrar a BBDD no pide el volcado', await evaluar(cli, `window.__gets.indexOf('admin')<0`), await evaluar(cli, 'window.__gets'));
      chk('el nombre de un cliente no se ejecuta como HTML', await evaluar(cli, `window.__xss===undefined`));

      // filtros: con un barrio elegido, los numeros cuentan lo que queda
      await evaluar(cli, `(function(){ var s=document.getElementById('crmCliBarrio'); s.value='Pilara'; s.dispatchEvent(new Event('change')); })()`);
      await pausa(250);
      const nPilara = CLIS.filter(c => c.barrio === 'Pilara').length;
      chk('con "Pilara" elegido, Todos cuenta los de Pilara (' + nPilara + ')', await evaluar(cli, `(document.querySelector('#crmCliFilters [data-f="todos"] .bbdd-pill-n')||{}).textContent`) === String(nPilara),
        await evaluar(cli, `(document.querySelector('#crmCliFilters [data-f="todos"] .bbdd-pill-n')||{}).textContent`));
      chk('... y Activos los activos de Pilara', await evaluar(cli, `(document.querySelector('#crmCliFilters [data-f="activo"] .bbdd-pill-n')||{}).textContent`) === String(CLIS.filter(c => c.barrio === 'Pilara' && c.estado === 'Activo').length));
      await evaluar(cli, `(function(){ var s=document.getElementById('crmCliBarrio'); s.value='todos'; s.dispatchEvent(new Event('change')); })()`);

      // buscador
      await evaluar(cli, `(function(){ var i=document.getElementById('crmCliSearch'); i.value='jose iniguez'; i.dispatchEvent(new Event('input')); })()`);
      await pausa(500);
      chk('"jose iniguez" encuentra a José Iñiguez (sin acentos)', await evaluar(cli, `document.querySelectorAll('#crmCliList .crm-card').length===1 && /Iñiguez/.test(document.getElementById('crmCliList').textContent)`));
      await evaluar(cli, `(function(){ var i=document.getElementById('crmCliSearch'); i.value='${CLIS[20].tel.slice(-6)}'; i.dispatchEvent(new Event('input')); })()`);
      await pausa(500);
      chk('seis digitos del telefono encuentran al cliente', await evaluar(cli, `/Cliente 21(?!\\d)/.test(document.getElementById('crmCliList').textContent)`),
        await evaluar(cli, `document.getElementById('crmCliList').textContent.slice(0,200)+' | '+document.getElementById('crmCliSearch').value`));
      await evaluar(cli, `(function(){ var i=document.getElementById('crmCliSearch'); i.value=''; i.dispatchEvent(new Event('input')); })()`);
      await pausa(500);

      if (ANCHO <= 560) {
        chk('el buscador y los filtros van a 16px (Safari no hace zoom)', await evaluar(cli, `getComputedStyle(document.getElementById('crmCliSearch')).fontSize==='16px' && getComputedStyle(document.getElementById('crmCliBarrio')).fontSize==='16px'`));
      }
      // nada pisado: el texto de la tarjeta contra sus botones
      const pisado = await evaluar(cli, `(function(){ var n=0, ex=0; [].slice.call(document.querySelectorAll('#crmCliList .crm-card')).slice(0,40).forEach(function(c){
          var bs=[].slice.call(c.querySelectorAll('.crm-card-ico')).map(function(b){return b.getBoundingClientRect();});
          c.querySelectorAll('.crm-card-meta span, .crm-card-name, .crm-cli-fact, .crm-cli-act, .crm-card-est').forEach(function(t){ var r=t.getBoundingClientRect(); if(!r.width) return; bs.forEach(function(b){ ex++; if(r.left<b.right-1&&r.right>b.left+1&&r.top<b.bottom-1&&r.bottom>b.top+1) n++; }); }); });
        return {n:n, ex:ex}; })()`);
      chk('ningun texto de la tarjeta queda debajo de sus botones (' + pisado.ex + ' pares examinados)', pisado.ex > 40 && pisado.n === 0, pisado);
      if (ANCHO >= 900) {
        chk('en la compu la plata queda a menos de 700px del nombre', await evaluar(cli, `(function(){ var c=document.querySelector('#crmCliList .crm-card'); var a=c.querySelector('.crm-card-name').getBoundingClientRect(), b=c.querySelector('.crm-cli-fact'); if(!b) return false; b=b.getBoundingClientRect(); return b.left-a.left<700; })()`));
      }
      chk('ningun desborde horizontal', await evaluar(cli, `document.documentElement.scrollWidth<=document.documentElement.clientWidth`));

      // Estancias no pierde su sub-tab marcada
      chk('entrar a BBDD no le apaga la sub-tab a Estancias', await evaluar(cli, `(function(){ var t=document.querySelector('#p-estancias .bbdd-tab[data-esub="hogares"]'); if(!t) return 'sin estancias'; document.querySelectorAll('#p-estancias .bbdd-tab').forEach(function(b){b.classList.toggle('on',b===t);}); bbddSwitch('clientes'); return t.classList.contains('on'); })()`) === true);

      // la tarjeta con apostrofe abre
      await evaluar(cli, `(function(){ var i=document.getElementById('crmCliSearch'); i.value='agostino'; i.dispatchEvent(new Event('input')); })()`);
      await pausa(500);
      await evaluar(cli, `(function(){ var c=${tarjeta("D'Agostino")}; if(c) c.click(); })()`);
      await pausa(400);
      chk('tocar un cliente con apostrofe abre su ficha', await evaluar(cli, `/D'Agostino/.test((document.querySelector('#crmDrawer.on .crm-ficha-name')||{}).textContent||'')`),
        await evaluar(cli, `document.getElementById('crmCliList').textContent.slice(0,150)+' | drawer:'+document.getElementById('crmDrawer').className+' | '+(document.getElementById('crmDrawerBody').textContent||'').slice(0,80)`));
      await evaluar(cli, `crmCloseDrawer(); (function(){ var i=document.getElementById('crmCliSearch'); i.value=''; i.dispatchEvent(new Event('input')); })()`);
      await pausa(400);

      // La ficha: historial por referencia
      await evaluar(cli, `D = ${JSON.stringify({ pedidos: PEDS, stock: [] })}; 1`);
      const g0 = await evaluar(cli, 'window.__gets.length');
      await evaluar(cli, `(function(){ var i=document.getElementById('crmCliSearch'); i.value='casa doble'; i.dispatchEvent(new Event('input')); })()`);
      await pausa(500);
      await evaluar(cli, `(function(){ var c=[].slice.call(document.querySelectorAll('#crmCliList .crm-card')).filter(function(x){ return /Casa Doble/.test(x.textContent) && /3 pedidos/.test(x.textContent); })[0]; if(c) c.click(); })()`);
      await pausa(600);
      const fic = await evaluar(cli, `(function(){ var b=document.getElementById('crmDrawerBody'); return { h:[].map.call(b.querySelectorAll('.crm-section-h'),function(x){return x.textContent.trim();}), t:b.textContent }; })()`);
      chk('la ficha de Casa Doble dice Historial (3), igual que sus 3 pedidos', fic.h.indexOf('Historial (3)') >= 0, fic.h);
      chk('... con el pedido de Red y el de Clubes (el volcado les pone sufijo al nombre)', /Red #/.test(fic.t) && /Clubes #/.test(fic.t), fic.t.slice(0, 300));
      chk('... sin el pedido del OTRO cliente con el mismo nombre', !/99\.999/.test(fic.t));
      chk('... la carne dice su nombre y kilos ("Carne Lomo 1,5 kg")', /Carne Lomo 1,5 kg/.test(fic.t) && !/CLo/.test(fic.t), fic.t.slice(0, 400));
      chk('... y no le pidio el historial al servidor', await evaluar(cli, `window.__gets.slice(${g0}).indexOf('crmCliente')<0`));
      await evaluar(cli, 'crmCloseDrawer(); 1');

      // si no cierra, se lo pide al servidor
      await evaluar(cli, `(function(){ var i=document.getElementById('crmCliSearch'); i.value='cliente raro'; i.dispatchEvent(new Event('input')); })()`);
      await pausa(500);
      const g1 = await evaluar(cli, 'window.__gets.length');
      await evaluar(cli, `window.__fichaLenta=true; (function(){ var c=${tarjeta('Cliente Raro')}; if(c) c.click(); })()`);
      await pausa(300);
      chk('si el volcado no tiene todos sus pedidos, le pide el historial al servidor', await evaluar(cli, `window.__gets.slice(${g1}).indexOf('crmCliente')>=0`));
      // y la respuesta que llega tarde no pisa el formulario
      await evaluar(cli, 'crmEditarMeta(); 1');
      await pausa(2300);
      chk('la ficha que llega tarde NO le pisa el formulario de "Editar ficha"', await evaluar(cli, `!!document.getElementById('metaNombre')`));
      await evaluar(cli, 'crmCloseDrawer(); window.__fichaLenta=false; 1');

      // Editar ficha: no congela lo detectado ni des-oculta
      await evaluar(cli, `(function(){ var i=document.getElementById('crmCliSearch'); i.value='con oculto'; i.dispatchEvent(new Event('input')); })()`);
      await pausa(500);
      await evaluar(cli, `(function(){ var c=${tarjeta('Con Oculto')}; if(c) c.click(); })()`);
      await pausa(500);
      await evaluar(cli, 'crmEditarMeta(); 1');
      await pausa(200);
      chk('el nombre oculto aparece en el formulario, tildado', await evaluar(cli, `!!document.querySelector('.metaAltChk[data-n="Alias Viejo"]:checked')`));
      const p0 = await evaluar(cli, 'window.__posts.length');
      await evaluar(cli, `document.getElementById('metaNotas').value='una nota'; crmGuardarMeta(); 1`);
      await pausa(400);
      const body = await evaluar(cli, `window.__posts.slice(${p0}).filter(function(b){return b.action==='crmUpdateClienteMeta';})[0]||null`);
      chk('guardar solo una nota NO fija sub-barrio, lote, barrio ni canal', !!body && body.subBarrioMapa === '' && body.loteMapa === '' && body.barrioMapa === '' && body.canalMapa === '', body);
      chk('... y el nombre oculto sigue oculto', !!body && (body.nombresOcultos || []).indexOf('Alias Viejo') >= 0, body && body.nombresOcultos);
      chk('... y la nota viaja', !!body && body.notas === 'una nota');
      await evaluar(cli, 'crmCloseDrawer(); 1');
      await evaluar(cli, `(function(){ var i=document.getElementById('crmCliSearch'); i.value=''; i.dispatchEvent(new Event('input')); })()`);
      await pausa(400);

      // La residencia elegida desde la ficha queda en la lista (window.crmClientes no existe)
      const res = await evaluar(cli, `(function(){ if(typeof estCliResidencia!=='function') return {est:false};
          estCliResidencia(${JSON.stringify(OCUL.tel)}, 'Con%20Oculto', 'finde');
          return { lista: typeof crmClientesPorTel==='function' && (crmClientesPorTel(${JSON.stringify(OCUL.tel)})[0]||{}).residencia, copia: /"residencia":"finde"/.test(localStorage.getItem('maleu_crm_clientes_v1')||'') }; })()`);
      chk('elegir la residencia desde la ficha queda en la lista y en la copia', res.lista === 'finde' && res.copia === true, res);
      /* El servidor simulado no sabe del POST: si algo vuelve a pedir la lista en
         el medio (Estancias lo hacia), la residencia se pierde — como en produccion
         cuando la lectura llega antes que el POST. */
      await pausa(900);
      chk('... y no la borra una lectura que llega antes que el POST', await evaluar(cli, `typeof crmClientesPorTel==='function' && (crmClientesPorTel(${JSON.stringify(OCUL.tel)})[0]||{}).residencia==='finde'`));

      // El ↻: espera los datos y dice de cuando son
      chk('el reloj de arriba mira la lista de clientes', await evaluar(cli, `JSON.stringify(_fuentesDeTab('bbdd'))`) === '["crmClientes"]');
      await pausa(1500);
      await evaluar(cli, `window.__lento=true; refreshContextual(); 1`);
      await pausa(900);
      chk('el ↻ sigue girando mientras la lista viaja (no la da por buena antes)', await evaluar(cli, `document.getElementById('hdrRefresh').classList.contains('spinning')`));
      await esperar(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`, 8000);
      chk('... y termina cuando llega', await evaluar(cli, `!document.getElementById('hdrRefresh').classList.contains('spinning')`));
      await evaluar(cli, 'window.__lento=false; 1');
      chk('sin errores de JS', errores.length === 0, errores.slice(0, 3));
    }

    if (FASES.indexOf('b') >= 0) {
      await ir('b');
      const dice = await esperar(cli, `/No pude traer los clientes/.test((document.getElementById('crmCliEstado')||{}).textContent||'')`, 12000);
      chk('B · sin copia y con el servidor fallando, lo DICE (no queda "Cargando")', dice, await evaluar(cli, `(document.getElementById('crmCliList')||{}).textContent`));
      chk('B · y tiene Reintentar', await evaluar(cli, `!!document.querySelector('#crmCliEstado button')`));
      await evaluar(cli, `window.__clientesOk=true; (function(b){ if(b) b.click(); })(document.querySelector('#crmCliEstado button')); 1`);
      chk('B · al reintentar bien aparece la lista', await esperar(cli, `document.querySelectorAll('#crmCliList .crm-card').length>0`, 8000));
      chk('B · y el aviso se va', await evaluar(cli, `document.getElementById('crmCliEstado').hidden===true`));
    }

    if (FASES.indexOf('c') >= 0) {
      await ir('c');
      chk('C · con copia, la lista sale al instante', await esperar(cli, `document.querySelectorAll('#crmCliList .crm-card').length>0`, 4000));
      chk('C · y dice que es lo guardado y de cuando', await esperar(cli, `/Mostrando lo guardado/.test((document.getElementById('crmCliEstado')||{}).textContent||'')`, 3000),
        await evaluar(cli, `(document.getElementById('crmCliEstado')||{}).textContent`));
      chk('C · si el servidor falla, dice que no se pudo y que se ve lo guardado', await esperar(cli, `/No se pudo actualizar/.test((document.getElementById('crmCliEstado')||{}).textContent||'')`, 12000));
      chk('C · la lista guardada sigue a la vista', await evaluar(cli, `document.querySelectorAll('#crmCliList .crm-card').length>0`));
    }

    if (FASES.indexOf('d') >= 0) {
      await ir('d');
      await esperar(cli, `window.__gets.indexOf('crmInteracciones')>=0`, 10000);
      await pausa(800);
      chk('D · una respuesta de error de la bitacora no borra la guardada', await evaluar(cli, `/guardada/.test(localStorage.getItem('maleu_crm_inter_v1')||'')`));
    }
  } catch (e) {
    console.log('  EXCEPCION ' + (e && e.message || e)); mal++;
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
