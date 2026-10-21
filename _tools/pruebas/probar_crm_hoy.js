/* CRM > Hoy: las jugadas del día (12/10/2026).

   node probar_crm_hoy.js [390|1440]
   BASE=http://localhost:8141 node probar_crm_hoy.js 390        ← tu propio servidor
   DATOS=<crmJugadas.json> FOTOS=<carpeta> node probar_crm_hoy.js 390   ← solo capturas

   Backend STUBBEADO con datos inventados (repo público), sin token: no toca
   producción y NO manda un mensaje (los POST se cortan y se anotan).

   Sostiene:
   · apagado, un admin ve la sub-tab primera y el "Hoy" de siempre pasa a
     llamarse "Pendientes"; quien no es admin no la ve y no cambia nada;
   · EL MENSAJE QUE SE VE ES EL QUE SALE: el cuerpo del template de WATI de la
     versión de esa casa (A o B), con sus variables, letra por letra; si WATI no
     se pudo leer no se muestra ningún texto;
   · cada jugada dice cuántas casas, cuántas con A y con B, la plata en juego y
     contra qué se mide;
   · arriba dice cuántas casas se pierden por el tope y por qué campaña;
   · la lista muestra a quién va, quién queda de control y por qué se frena cada
     una de las otras; los nombres que no sirven salen en su lista para corregir;
   · APAGADO no hay botón de mandar, y no sale ni un POST;
   · prendido: con los templates en revisión de Meta tampoco; aprobados hacen
     falta DOS toques y sale UN POST con las casas elegidas (sin teléfonos ni
     texto: eso lo arma el servidor);
   · "Qué trajo cada jugada" compara contra el control, A contra B y los pedidos
     que entraron por el botón;
   · la ventana de campaña general aparta el control de la semana y ya no deja
     elegir "Sin control";
   · "Ya le contesté" lo anota el servidor (es de los dos que atienden el WhatsApp),
     no el dispositivo;
   · sacar una casa pregunta cómo: solo este envío, o no escribirle más (pide el
     motivo); la que está frenada así lo dice en la lista y se habilita desde la ficha;
   · la línea de perfil de la ficha sale de los mismos datos;
   · la segunda vez abre de la copia guardada, sin esperar al servidor;
   · nada desborda a lo ancho y los botones llegan al piso táctil (44 px).

   Con DATOS y FOTOS no prueba nada: dibuja ese payload y guarda las capturas
   (son datos de clientes: la carpeta va al scratchpad, nunca al repo). */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'app.html';
const FOTOS = process.env.FOTOS || '';

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 700) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(200); }
  return false;
};

/* Los diez textos, como los cargó la sesión Wati el 12/10/2026 (bitácora). Acá
   hacen de WATI: lo que se prueba es que la pantalla muestre ESTOS, no otros. */
const TEXTOS = {
  jug_reposicion_a: ['name producto cuando', 'Hola {{name}}! ¿Te llevamos {{producto}} de siempre? Repartimos {{cuando}} y te dejamos el pedido en la puerta de tu casa.'],
  jug_reposicion_b: ['name cuando producto', 'Hola {{name}}! Repartimos {{cuando}}. ¿Reponemos {{producto}} así tenés la semana resuelta?'],
  jug_nuevo_a: ['name producto familia descuento', 'Hola {{name}}! ¿Te llevamos {{producto}} de siempre? Y de paso conocé {{familia}}: esta semana tenés {{descuento}} para probar algo nuevo.'],
  jug_nuevo_b: ['name familia descuento producto', 'Hola {{name}}! Esta semana te proponemos algo distinto: sumá {{familia}} a tu pedido con {{descuento}}. Y si querés, te llevamos también {{producto}} de siempre.'],
  jug_segunda_a: ['name producto', 'Hola {{name}}! ¿Qué tal estuvo tu primer pedido? Si te gustó, lo repetimos cuando quieras: te llevamos {{producto}} o lo que tengas ganas de probar esta vez.'],
  jug_segunda_b: ['name producto', 'Hola {{name}}! La primera vez uno prueba; la segunda ya sabe lo que quiere. ¿Armamos tu segundo pedido? Podés repetir {{producto}} o elegir algo nuevo de la tienda.'],
  jug_ocasion_a: ['producto ocasion name cuando', '¿Qué mejor que {{producto}} para {{ocasion}}, {{name}}? Repartimos {{cuando}} y te dejamos el pedido en la puerta de tu casa.'],
  jug_ocasion_b: ['name ocasion producto cuando', 'Hola {{name}}! Para {{ocasion}} ya sabemos qué no puede faltar en tu casa: {{producto}}. Repartimos {{cuando}}, ¿te anotamos?'],
  jug_volve_a: ['name producto', 'Hola {{name}}! Hace un tiempo que no te llevamos nada y queríamos saludarte. Si tenés ganas, esta semana te acercamos {{producto}} de siempre o lo que quieras de la tienda.'],
  jug_volve_b: ['name descuento producto', 'Hola {{name}}! Hace rato que no pasamos por tu casa. Para que vuelvas a tener la comida resuelta, tenés {{descuento}} en tu próximo pedido. ¿Te llevamos {{producto}} de siempre?']
};
const tpls = (estado) => { const o = {}; Object.keys(TEXTOS).forEach((n) => { o[n] = { estado: estado, cuerpo: TEXTOS[n][1], pie: 'Maleu · Pedí fácil, comé rico.', params: TEXTOS[n][0].split(' ') }; }); return o; };

const P = (o) => Object.assign({ n: 5, fam: 'Sorrentinos', famPct: 80, g: 'SJyQ', gPct: 100, sp: 1, r: 21, rOk: 1, d: 24, toca: -3, dia: 5, diaOk: 1,
  fj: 'm', fjOk: 1, tk: 40000, nu: ['Tartas', 'Wraps'], prob: ['Sorrentinos'], cup: 0, cupBase: 0, est: 'Activo', can: 'Home', pideDia: 4, pideHora: 'noche', ab: 0,
  /* la escalera (13/10/2026): probó 3 de 41 y el próximo es la tarta de verdura */
  diaCl: 0, pn: 3, pm: 41, sig: 'TV' }, o || {});
const FRASE = 'Compra sorrentinos de jamón y queso cada 3 semanas, los viernes. Nunca probó tartas ni wraps. Le toca esta semana.';
const casa = (lote, nom, j, ver, extra) => Object.assign({ k: 'casa:la paz|' + lote, casa: 1, nom: nom, tel: '11500000' + lote, key: '11500000' + lote, keys: ['11500000' + lote],
  bar: 'Estancias del Pilar', sub: 'La Paz', lote: String(lote), fr: FRASE, j: j, js: j ? [j] : [], ex: '', exPor: '', ctl: 0, cs: 0, nm: 0, nmPor: '', crudo: nom,
  sale: new Date(2026, 9, 16).getTime(), ver: ver || '', listo: j ? 2 : 0,
  v: j ? { name: nom.split(' ')[0], producto: 'los sorrentinos de jamón y queso', cuando: 'este viernes de 19 a 21' } : null, p: P() }, extra || {});
const J = (id, tag, nombre, o) => Object.assign({ id: id, tag: tag, nombre: nombre, tpl: { a: 'jug_' + tag + '_a', b: 'jug_' + tag + '_b' }, caen: 0, n: 0, listas: 0, a: 0, b: 0, control: 0, frenadas: 0, plata: 0, ej: null }, o);
const FIX = {
  ok: true, ts: 1, hoy: '12/10/2026', palanca: false, ocasion: null, cuponVolve: null,
  reglas: { tope: 7, sinCompra: 7, control: 10, ventana: 14, segundaDesde: 10, segundaHasta: 36, volveDesde: 45, repetir: 14 },
  tpls: null,
  jugadas: [
    J('segunda', 'segunda', 'Segunda compra', { caen: 2, n: 1, listas: 1, a: 0, b: 1, frenadas: 1, plata: 6400, ej: 'casa:la paz|20' }),
    J('volve', 'volve', 'Volvé', {}),
    J('ocasion', 'ocasion', 'Ocasión', {}),
    J('repo', 'reposicion', 'Reposición', { caen: 7, n: 2, listas: 2, a: 1, b: 1, control: 1, frenadas: 4, plata: 43200, ej: 'casa:la paz|10' }),
    J('nuevo', 'nuevo', 'Probá algo nuevo', { caen: 1, n: 1, listas: 1, a: 1, b: 0, plata: 17200, ej: 'casa:la paz|30' })
  ],
  casas: [
    casa(10, 'Martín Prueba', 'repo', 'a'),
    casa(11, 'Ana Prueba', 'repo', 'b'),
    casa(12, 'Carla Prueba', 'repo', 'a', { ctl: 1, cs: 1 }),
    casa(13, 'Mario Prueba', 'repo', 'a', { ex: 'tope', exPor: 'domingo_11_octubre (11/10)' }),
    casa(14, 'Elena Prueba', 'repo', 'b', { ex: 'abierto' }),
    casa(15, 'PMO', 'repo', 'a', { ex: 'nombre', nm: 1, nmPor: 'parece una sigla', crudo: 'PMO', listo: 0, v: { name: '', producto: 'los sorrentinos de jamón y queso', cuando: 'este viernes de 19 a 21' } }),
    casa(16, 'Hugo Prueba', 'repo', 'a', { ex: 'no-escribir', ne: { motivo: 'Pidió que no le escribamos', por: 'Tadeo Ustariz', fecha: '10/10/2026 09:00' } }),
    casa(20, 'Sofía Prueba', 'segunda', 'b', { fr: 'Compró una sola vez, hace 12 días: lomo.', v: { name: 'Sofía', producto: 'el lomo', cuando: 'este viernes de 19 a 21' }, p: P({ n: 1 }) }),
    casa(21, 'Zorro Prueba', 'segunda', 'a', { ex: 'tope', exPor: 'viernes 9 del 10 (09/10)', nm: 1, nmPor: 'no lo reconozco como nombre', crudo: 'Zorro Prueba', listo: 0, p: P({ n: 1 }) }),
    casa(30, 'Diego Prueba', 'nuevo', 'a', { v: { name: 'Diego', producto: 'las pizzas de muzzarella', cuando: 'este viernes de 19 a 21', familia: 'las tartas', descuento: '20% off con el cupón TARTA20' } }),
    casa(40, 'Quieta Prueba', '', '', { p: P({ pn: 41, pm: 41, sig: '' }) })
  ],
  frenos: { tope: 2, abierto: 1, nombre: 1 },
  tope: [{ camp: 'domingo_11_octubre (11/10)', n: 1 }, { camp: 'viernes 9 del 10 (09/10)', n: 1 }],
  historia: { segunda: { n: 231, compraron: 38, plata: 1, casas: 231 }, volve: { n: 232, compraron: 41, plata: 1, casas: 193 },
              repo: { n: 255, compraron: 137, plata: 1, casas: 94 }, nuevo: { n: 253, compraron: 109, plata: 1, casas: 109 } },
  base: { segunda: 0.16, volve: 0.18, ocasion: null, repo: 0.54, nuevo: 0.43 },
  resultados: {}, cupones: { Tartas: { cod: 'TARTA20', pct: 20 } }, nombres: { TV: 'Tarta Verdura' }
};
const RES = { repo: { env: 40, mirados: 30, resp: 12, envCompro: 26, envPlata: 1560000, ctl: 5, ctlCompro: 2, ctlPlata: 90000, enCurso: 12, boton: 9, botonPlata: 400000,
  a: { env: 21, resp: 8, compro: 15, plata: 900000, boton: 6, botonPlata: 300000 }, b: { env: 19, resp: 4, compro: 11, plata: 660000, boton: 3, botonPlata: 100000 } } };
/* Dos casas que contestaron: una hace 2 horas, otra ayer (y ya compró). */
const RESPUESTAS = [
  { id: 'E1-0', k: 'casa:la paz|10', key: '1150000010', nom: 'Martín Prueba', jugada: 'repo', jugadaNom: 'Reposición', ver: 'a', horas: 2, txt: 'Dale, mandame 2', compro: 0 },
  { id: 'E1-1', k: 'casa:la paz|11', key: '1150000011', nom: 'Ana Prueba', jugada: 'repo', jugadaNom: 'Reposición', ver: 'b', horas: 26, txt: '(mandó un audio)', compro: 1 }
];
const DATOS = process.env.DATOS ? JSON.parse(fs.readFileSync(process.env.DATOS, 'utf8')) : FIX;
if (process.env.DATOS && !DATOS.tpls) DATOS.tpls = tpls('PENDING');   // la planilla espía no llega a WATI: los textos son los de la bitácora

/* fase: off (apagado; templates en revisión) · sinwati (apagado; WATI no se pudo leer) · on (prendido, aprobados)
         · pend (prendido, en revisión) · res (con resultados) · lento (crmJugadas tarda 6 s) */
const STUB = (datos) => `
  window.__gets=[]; window.__posts=[];
  var __fase=(location.search.match(/fase=(\\w+)/)||[])[1]||'off';
  if(window.top===window){ try{
    localStorage.setItem('maleu_est_sub','jugadas');
    if(__fase!=='lento'){ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0) localStorage.removeItem(k); }); localStorage.removeItem('maleu_jug_on'); }
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase')>-1) return Promise.reject(new Error('sin base en la prueba'));
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        /* El backend de mentira RECUERDA a quién se frenó, como el de verdad: si no, la
           recarga de después devuelve a la casa a la lista y la prueba mide otra cosa. */
        window.__ne=window.__ne||{};
        if(b.action==='crmNoEscribir'){ if(b.habilitar) window.__ne[b.k]=null; else window.__ne[b.k]={motivo:b.motivo,por:'Tadeo Ustariz',fecha:'12/10/2026 18:40'}; }
        if(b.action==='crmProgramarJugada') return Promise.resolve(new Response(JSON.stringify({ok:true,id:'JP-2',sale:b.sale,n:(b.casas||[]).length,por:'Tadeo Ustariz'}),{status:200}));
        if(b.action==='crmCancelarJugadaProg') return Promise.resolve(new Response(JSON.stringify({ok:true,id:b.id,por:'Tadeo Ustariz'}),{status:200}));
        return Promise.resolve(new Response(JSON.stringify(b.action==='crmEnviarJugada'?{ok:true,enviados:(b.casas||[1]).length,control:1,caidas:0,sacadas:(b.sacadas||[]).length,porVersion:{a:1,b:0}}
          :(b.action==='crmJugadasRespuestas'?{ok:true,mirados:0,nuevas:0,faltan:0}
          :(b.action==='crmJugadaRespAtendida'?{ok:true,por:'Tadeo Ustariz',el:'12/10/2026 18:40'}
          :(b.action==='crmNoEscribir'?(b.habilitar?{ok:true,habilitadas:1,por:'Tadeo Ustariz'}:{ok:true,motivo:b.motivo,por:'Tadeo Ustariz',fecha:'12/10/2026 18:40'}):{ok:true})))),{status:200}));
      }
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'}, demora=120;
      if(a==='crmJugadas'){
        cuerpo=${JSON.stringify(datos)};
        if(${process.env.DATOS ? 'false' : 'true'}){
          cuerpo.palanca=(__fase==='on'||__fase==='pend'||__fase==='prog');
          /* Programadas (14/10/2026): una esperando su hora (Reposición) y una que ya salió (Segunda). */
          if(__fase==='prog') cuerpo.programadas=[
            {id:'JP-1',jugada:'repo',sale:Date.now()+90*60000,saleTxt:'',n:2,prueba:false,por:'Lucas Moresco',el:'',estado:'programada',res:'',salio:'',cancelo:''},
            {id:'JP-0',jugada:'segunda',sale:Date.now()-3600000,saleTxt:'',n:4,prueba:false,por:'Tadeo Ustariz',el:'',estado:'enviada',res:'salieron 3 (A 2 · B 1) · salteadas 1 (1 compró en el medio)',salio:'14/10/2026 09:03',cancelo:''}];
          cuerpo.tpls=(__fase==='sinwati')?null:(__fase==='on'||__fase==='lento'||__fase==='res'||__fase==='prog'?${JSON.stringify(tpls('APPROVED'))}:${JSON.stringify(tpls('PENDING'))});
          if(__fase==='off'||__fase==='pend'||__fase==='sinwati'){ cuerpo.casas.forEach(function(c){ if(c.listo===2) c.listo=(__fase==='sinwati'?0:1); }); cuerpo.jugadas.forEach(function(j){ j.listas=0; }); }
          if(__fase==='res'){ cuerpo.resultados=${JSON.stringify(RES)}; cuerpo.respHoras=48;
            /* Envios de hoy (14/10/2026): uno que llego entero y uno con 3 que fallaron. */
            cuerpo.envios=[{lote:'1',camp:'jug_segunda_a',hora:'11:58',n:7,llegaron:7,leidos:2,fallaron:0,sinDato:0,sinMirar:0},
                           {lote:'2',camp:'jug_volve_a',hora:'12:44',n:5,llegaron:2,leidos:0,fallaron:3,sinDato:0,sinMirar:0}];
            cuerpo.respuestas=${JSON.stringify(RESPUESTAS)}.map(function(x){ x.cuando=Date.now()-x.horas*3600000; return x; }); }
        }
        if(__fase==='lento') demora=6000;
        Object.keys(window.__ne||{}).forEach(function(k){ cuerpo.casas.forEach(function(c){ if(c.k!==k) return;
          if(window.__ne[k]){ c.ex='no-escribir'; c.ne=window.__ne[k]; } else { c.ne=null; if(c.ex==='no-escribir') c.ex=''; } }); });
      }
      else if(a==='pedidosLight') cuerpo={ts:1,pedidos:[],canales:[],light:true,saludSem:{},saludMes:{}};
      else if(a==='crmClientes') cuerpo={ts:1,clientes:[],lite:false,kg:[],nombres:{}};
      else if(a==='crmInteracciones') cuerpo={ts:1,interacciones:[]};
      else if(a==='watiTemplates') cuerpo={ok:true,templates:{general_lunes:{estado:'APPROVED',cuerpo:'Hola {{name}}!',param:'name',params:['name']}}};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      var t=JSON.stringify(cuerpo);
      return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},demora);});
    }
    return o.apply(this,arguments); }; })();`;

const T = sel => `((document.querySelector(${JSON.stringify(sel)})||{}).textContent||'').replace(/\\s+/g,' ').trim()`;
const pintado = `document.querySelectorAll('#jugCuerpo .jg-card').length===5`;
const foto = async (cli, nombre) => {
  if (!FOTOS) return;
  const alto = await ev(cli, 'Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: Math.min(Number(alto) || 900, 7000), deviceScaleFactor: ANCHO <= 560 ? 2 : 1, mobile: ANCHO <= 560 });
  await pausa(400);
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(FOTOS, { recursive: true });
  fs.writeFileSync(path.join(FOTOS, nombre + '-' + ANCHO + '.png'), Buffer.from(r.data, 'base64'));
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
  console.log('     captura: ' + path.join(FOTOS, nombre + '-' + ANCHO + '.png'));
};
/* El ERP arranca en Inicio: se espera a que exista `go` y se entra a la tab CRM, que restaura la sub-tab guardada. */
const ir = async (cli, fase) => {
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?fase=' + fase });
  await esperar(cli, `typeof go==='function'&&typeof jugRender==='function'&&document.readyState==='complete'&&location.search.indexOf('fase=${fase}')>=0`, 30000);
  await ev(cli, `go('estancias');1`);
};
const abrirLista = (cli, id) => ev(cli, `document.querySelector('#jugCuerpo .jg-card[data-jug="${id}"] .jg-btn').click();1`);

async function apagado(cli) {
  console.log('\n-- apagado, entra un admin (los templates están en revisión de Meta) --');
  await ir(cli, 'off');
  chk('la sub-tab pinta sus 5 jugadas', await esperar(cli, pintado), await ev(cli, T('#jugCuerpo')));
  await pausa(600);
  const tabs = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#p-estancias .bbdd-tab'),function(b){return b.textContent.trim()+(b.style.display==='none'?'(oculta)':'')+(b.classList.contains('on')?'*':'');}))`);
  console.log('     sub-tabs: ' + tabs);
  const tb = JSON.parse(typeof tabs === 'string' ? tabs : '[]');
  chk('"Hoy" es la primera y está prendida', tb[0] === 'Hoy*', tb);
  chk('el "Hoy" de siempre pasa a llamarse Pendientes, y no se perdió ninguna sub-tab', tb.indexOf('Pendientes') === 2 && tb.length === 11 && tb.filter(x => /oculta/.test(x)).length === 0, tb);
  chk('dice que está apagado', /Apagado: se ve, no manda/.test(await ev(cli, T('#jugCuerpo .jg-chip'))));
  chk('el resumen suma las que quedan para mandar (1 + 2 + 1 = 4)', /^4 casas para escribirles hoy/.test(await ev(cli, T('#jugCuerpo .jg-resumen'))), await ev(cli, T('#jugCuerpo .jg-resumen')));
  const tope = await ev(cli, T('#jugCuerpo .jg-tope'));
  console.log('     tope: ' + JSON.stringify(tope));
  chk('dice cuántas casas se pierden por el tope y por qué campaña', /^2 casas tenían una jugada hoy y no la reciben/.test(tope) && /1 por «domingo_11_octubre \(11\/10\)» · 1 por «viernes 9 del 10 \(09\/10\)»/.test(tope), tope);
  const ordenCards = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#jugCuerpo .jg-card'),function(c){return c.getAttribute('data-jug')+(c.classList.contains('vacia')?'-':'');}))`);
  chk('las jugadas con casas van primero, las vacías al final', ordenCards === '["segunda","repo","nuevo","volve-","ocasion-"]', ordenCards);
  const repo = await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"]'));
  console.log('     Reposición: ' + JSON.stringify(repo).slice(0, 520));
  chk('Reposición: 2 casas, plata en juego, A y B, control y frenadas', /Reposición\s*2\s*casas/.test(repo) && /\$43\.200 en juego · 1 con la versión A · 1 con la B · 1 de control · 4 frenadas/.test(repo), repo);
  chk('dice contra qué se mide: 54 de cada 100 compran igual', /Sin mensaje, 54 de cada 100 compran igual en 14 días/.test(repo), repo);
  const msg = await ev(cli, `(document.querySelector('#jugCuerpo .jg-card[data-jug="repo"] .jg-msg').firstChild||{}).textContent`);
  chk('EL MENSAJE ES EL DEL TEMPLATE DE WATI, letra por letra, con los datos del cliente (versión A)',
    msg === 'Hola Martín! ¿Te llevamos los sorrentinos de jamón y queso de siempre? Repartimos este viernes de 19 a 21 y te dejamos el pedido en la puerta de tu casa.', msg);
  chk('con el pie del template', (await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-msg-pie'))) === 'Maleu · Pedí fácil, comé rico.');
  chk('y dice qué versión es, qué template y que está en revisión', (await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-ver'))) === 'Versión A jug_reposicion_a · en revisión de Meta', await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-ver')));
  chk('abajo dice a quién y su perfil', /Así le llega a Martín Prueba\. Compra sorrentinos de jamón y queso cada 3 semanas/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-msg-de'))));
  chk('Segunda compra muestra la versión B, la de esa casa', (await ev(cli, `(document.querySelector('#jugCuerpo .jg-card[data-jug="segunda"] .jg-msg').firstChild||{}).textContent`)) ===
    'Hola Sofía! La primera vez uno prueba; la segunda ya sabe lo que quiere. ¿Armamos tu segundo pedido? Podés repetir el lomo o elegir algo nuevo de la tienda.');
  chk('Probá algo nuevo: la familia y el descuento con el cupón adentro', (await ev(cli, `(document.querySelector('#jugCuerpo .jg-card[data-jug="nuevo"] .jg-msg').firstChild||{}).textContent`)) ===
    'Hola Diego! ¿Te llevamos las pizzas de muzzarella de siempre? Y de paso conocé las tartas: esta semana tenés 20% off con el cupón TARTA20 para probar algo nuevo.');
  chk('ningún mensaje de la pantalla tiene un {{hueco}}', (await ev(cli, `/\\{\\{/.test(document.getElementById('jugCuerpo').textContent)`)) === false);
  chk('Segunda compra dice su ventana nueva (10 a 36 días)', /hace 10 a 36 días/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="segunda"] .jg-por'))));
  chk('Volvé avisa que la versión B no tiene cupón cargado', /versión B ofrece un descuento y no hay cupón cargado/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="volve"]'))));
  chk('Ocasión sin día especial lo dice', /no hay ningún reparto especial cargado/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="ocasion"]'))));
  chk('sin jugadas enviadas muestra la vara del historial', /Todavía no salió ninguna/.test(await ev(cli, T('#jugCuerpo'))) && /Reposición\s*255\s*137\s*54%/.test(await ev(cli, T('#jugCuerpo .jg-tabla'))), await ev(cli, T('#jugCuerpo .jg-tabla')));
  const nm = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#jugCuerpo .jg-fila-nm'),function(f){return f.textContent.replace(/\\s+/g,' ').trim();}))`);
  console.log('     nombres: ' + nm);
  chk('los nombres que no sirven salen en su lista, con el motivo y la ficha a un toque (también la frenada por otra cosa)', nm ===
    '["«PMO» La Paz · Lote 15Parece una sigla.Abrir la ficha","«Zorro Prueba» La Paz · Lote 21No lo reconozco como nombre.Abrir la ficha"]' &&
    /^Revisar el nombre 2 casas/.test(await ev(cli, `[].filter.call(document.querySelectorAll('#jugCuerpo .jg-sec'),function(s){return /nombre/.test(s.textContent);})[0].textContent.replace(/\\s+/g,' ').trim()`)), nm);
  await foto(cli, 'hoy');

  await abrirLista(cli, 'repo');
  await pausa(500);
  const filas = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-lista .jg-fila'),function(f){return (f.classList.contains('jg-fila-va')?'[x] ':'')+f.textContent.replace(/\\s+/g,' ').trim().slice(0,600);}))`);
  console.log('     lista: ' + String(filas).slice(0, 900));
  const fl = JSON.parse(typeof filas === 'string' ? filas : '[]');
  chk('la lista: 2 que reciben (cada una con su botón Sacar), 1 de control, 4 frenadas', fl.length === 7 && fl.filter(x => /^\[x\]/.test(x)).length === 2 && fl.some(x => /^control ?Carla Prueba/.test(x)) && fl.filter(x => /^\[x\].*Sacar$/.test(x)).length === 2, fl.map(x => x.slice(0, 40) + '…' + x.slice(-12)));
  chk('cada casa muestra SU mensaje con SU versión (Ana va con la B)', fl.some(x => /Ana Prueba.*Hola Ana! Repartimos este viernes de 19 a 21\. ¿Reponemos los sorrentinos de jamón y queso así tenés la semana resuelta\?Versión B jug_reposicion_b/.test(x)), fl[1]);
  chk('abrir "Hoy" apagado y sin jugadas enviadas no le pide nada a WATI', (await ev(cli, `window.__posts.filter(function(p){return p.action==='crmJugadasRespuestas';}).length`)) === 0);
  chk('cada casa dice cuántos productos probó y cuál es el próximo (la escalera)', fl.some(x => /Martín Prueba.*Probó 3 de 41 productos · el próximo: Tarta Verdura/.test(x)), fl[0]);
  const fichaDe = (tel) => ev(cli, `(function(){var d=document.createElement('div');d.innerHTML=crmPerfilHtml('cliente','${tel}');return d.textContent;})()`);
  chk('…y la ficha también', /Probó 3 de 41 productos · el próximo: Tarta Verdura/.test(await fichaDe('1150000010')), await fichaDe('1150000010'));
  chk('la que los probó todos lo dice, sin próximo', /Probó 41 de 41 productos: los probó todos/.test(await fichaDe('1150000040')) && !/el próximo/.test(await fichaDe('1150000040')), await fichaDe('1150000040'));
  chk('la frenada por el tope dice por qué campaña', fl.some(x => /Mario Prueba.*ya recibió «domingo_11_octubre \(11\/10\)» en los últimos 7 días/.test(x)), fl[3]);
  chk('la del pedido abierto y la del nombre dicen su motivo', fl.some(x => /Elena Prueba.*tiene un pedido abierto/.test(x)) && fl.some(x => /PMO.*hay que revisar el nombre \(«PMO»: parece una sigla\)/.test(x)), fl.slice(4));
  chk('la que alguien marcó "no escribirle más" dice el motivo, quién y que se habilita desde la ficha',
    fl.some(x => /Hugo Prueba.*No se le manda: no hay que escribirle: «Pidió que no le escribamos» \(lo marcó Tadeo Ustariz el 10\/10\)\. Se habilita desde su ficha\./.test(x)), fl[6]);
  chk('y en su ficha se ve, con el botón para volver a habilitarla', (await ev(cli, `(function(){var d=document.createElement('div');d.innerHTML=crmPerfilHtml('cliente','1150000016');return d.textContent.replace(/\\s+/g,' ').trim();})()`)) ===
    FRASE + 'Probó 3 de 41 productos · el próximo: Tarta Verdura' + 'No escribirle. Pidió que no le escribamos Lo marcó Tadeo Ustariz el 10/10/2026 Volver a habilitar');
  chk('APAGADO: no hay botón de mandar ni de prueba', (await ev(cli, `!document.getElementById('jugGo')&&!document.getElementById('jugTelPrueba')`)) === true);
  chk('y explica por qué', /Apagado\. Todavía no se manda nada desde acá/.test(await ev(cli, T('#jugCuerpo .jg-pie'))));
  chk('llamar a mandar a mano tampoco hace nada', (await ev(cli, `jugMandar('repo');jugMandar('repo');jugPrueba('repo','a');window.__posts.length`)) === 0);
  await foto(cli, 'hoy-lista');

  const medidas = await ev(cli, `JSON.stringify({desborde:document.documentElement.scrollWidth-window.innerWidth,
    chicos:[].filter.call(document.querySelectorAll('#jugCuerpo .jg-btn, #jugCuerpo .jg-fila-nm .crm-edit-btn, #jugCuerpo .jg-sacar'),function(b){return b.getBoundingClientRect().height<44;}).length,
    botones:document.querySelectorAll('#jugCuerpo .jg-btn, #jugCuerpo .jg-fila-nm .crm-edit-btn, #jugCuerpo .jg-sacar').length,
    sale:[].filter.call(document.querySelectorAll('#jugCuerpo .jg-card, #jugCuerpo .jg-tope, #jugCuerpo .jg-fila-nm'),function(c){var r=c.getBoundingClientRect();return r.right>window.innerWidth+1||r.left<-1;}).length,
    cols:(function(){var t={};[].forEach.call(document.querySelectorAll('#jugCuerpo .jg-card:not(.abierta)'),function(c){t[Math.round(c.getBoundingClientRect().left)]=1;});return Object.keys(t).length;})()})`);
  console.log('     medidas: ' + medidas);
  const md = JSON.parse(typeof medidas === 'string' ? medidas : '{}');
  chk('nada desborda a lo ancho (' + md.botones + ' botones medidos)', md.desborde <= 0 && md.sale === 0 && md.botones >= 7, md);
  chk('todos los botones llegan a 44 px', md.chicos === 0, md);
  chk(ANCHO <= 560 ? 'en el celular va en una columna' : 'en escritorio las tarjetas van en más de una columna', ANCHO <= 560 ? md.cols === 1 : md.cols >= 2, md);

  chk('la ficha dice el perfil arriba, con la jugada de hoy', (await ev(cli, `(function(){var d=document.createElement('div');d.innerHTML=crmPerfilHtml('cliente','1150000010');return d.textContent;})()`)) === FRASE + ' Hoy: Reposición' + 'Probó 3 de 41 productos · el próximo: Tarta Verdura');
  chk('la ficha de la CASA también (por sub-barrio y lote)', /^Compra sorrentinos/.test(await ev(cli, `(function(){var d=document.createElement('div');d.innerHTML=crmPerfilHtml('casa','La Paz|010');return d.textContent;})()`)));
  chk('a la frenada no le dice "Hoy:"', !/Hoy:/.test(await ev(cli, `(function(){var d=document.createElement('div');d.innerHTML=crmPerfilHtml('cliente','1150000013');return d.textContent;})()`)));

  console.log('\n-- la ventana de campaña general --');
  const per = (lote, nom) => `{key:'11500000${lote}',tel:'11500000${lote}',telDisplay:'11500000${lote}',nombre:'${nom}',barrio:'Estancias del Pilar',subBarrio:'La Paz',lote:'${lote}',diasUltima:20,entregados:3,pendientes:0}`;
  await ev(cli, `crmCampaniaAbrir({titulo:'General de prueba',personas:[${per(10, 'Martín Prueba')},${per(11, 'Ana Prueba')},${per(12, 'Carla Prueba')}]});1`);
  await pausa(700);
  const modal = await ev(cli, T('#cmpModal'));
  console.log('     ventana: ' + JSON.stringify(modal).slice(0, 330));
  chk('aparta sola la casa que esta semana es de control (2 reciben, 1 de control)', /^.*2 reciben · 3 casas · 1 casas de control \(1 personas\)/.test(modal), modal.slice(0, 200));
  chk('ya no deja elegir "Sin control": dice que lo aparta el sistema', !/Sin control/.test(modal) && /1 de cada 10, las mismas que en las jugadas de Hoy/.test(await ev(cli, T('#cmpCtlTxt'))), await ev(cli, T('#cmpCtlTxt')));
  await ev(cli, `cmpCerrar();1`);
  chk('en toda la fase no salió ni un POST', (await ev(cli, 'window.__posts.length')) === 0, await ev(cli, 'JSON.stringify(window.__posts)'));

  console.log('\n-- apagado, entra alguien que no es admin --');
  const noAdmin = await ev(cli, `(function(){SESSION.rol='ventas';var v=jugTabs();var r={ve:v,boton:document.getElementById('jugTabBtn').style.display,viejo:document.getElementById('estTabHoyViejo').textContent,
    perfil:crmPerfilHtml('cliente','1150000010')};estSwitch('jugadas');r.sub=(document.querySelector('#p-estancias .est-sub.on')||{}).id;SESSION.rol='admin';jugTabs();return JSON.stringify(r);})()`);
  console.log('     ' + noAdmin);
  chk('no ve la sub-tab, el "Hoy" de siempre se llama Hoy, y la ficha no cambia', noAdmin === '{"ve":false,"boton":"none","viejo":"Hoy","perfil":"","sub":"est-pulso"}', noAdmin);
  console.log('\n-- al ENTRAR a CRM, un admin cae en Hoy y no en la última sub-tab --');
  const entra = await ev(cli, `(function(){var sub=function(){return (document.querySelector('#p-estancias .est-sub.on')||{}).id;};var r={};
    estSwitch('segmentos');go('inicio');go('estancias');r.admin=sub();
    estSwitch('segmentos');rEstancias();r.repinta=sub();
    SESSION.rol='ventas';go('inicio');go('estancias');r.otro=sub();
    SESSION.rol='admin';jugTabs();return JSON.stringify(r);})()`);
  console.log('     ' + entra);
  chk('admin: venía de Segmentos, sale y vuelve a entrar: cae en Hoy', /"admin":"est-jugadas"/.test(entra), entra);
  chk('un repintado NO lo saca de la sub-tab donde está trabajando', /"repinta":"est-segmentos"/.test(entra), entra);
  chk('quien no es admin vuelve a su última sub-tab, como siempre', /"otro":"est-segmentos"/.test(entra), entra);
  chk('sin errores en consola', (await ev(cli, 'JSON.stringify(window.__err||[])')) === '[]', await ev(cli, 'JSON.stringify(window.__err||[])'));

  console.log('\n-- WATI no se pudo leer --');
  await ir(cli, 'sinwati');
  chk('pinta', await esperar(cli, pintado));
  await pausa(400);
  chk('NO muestra ningún texto de mensaje: avisa que no pudo leer los templates', (await ev(cli, `document.querySelectorAll('#jugCuerpo .jg-msg').length`)) === 0 &&
    /No pude leer los templates de WATI, así que no muestro el mensaje/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-nota'))), await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"]')));
}

async function prendido(cli) {
  console.log('\n-- prendido, pero Meta todavía no aprobó los templates --');
  await ir(cli, 'pend');
  chk('pinta', await esperar(cli, pintado));
  await pausa(400);
  await abrirLista(cli, 'repo');
  chk('dice que todavía no se puede mandar y no ofrece el botón', await esperar(cli, `/Todavía no se puede mandar\\./.test((document.querySelector('#jugCuerpo .jg-pie')||{}).textContent||'')&&!document.getElementById('jugGo')`, 8000), await ev(cli, T('#jugCuerpo .jg-pie')));
  chk('y forzarlo a mano no manda', (await ev(cli, `jugMandar('repo');jugMandar('repo');window.__posts.length`)) === 0);

  console.log('\n-- prendido, con los templates aprobados --');
  await ir(cli, 'on');
  chk('pinta', await esperar(cli, pintado));
  await pausa(500);
  chk('ya no dice apagado', (await ev(cli, `!document.querySelector('#jugCuerpo .jg-chip')`)) === true);
  chk('el template figura aprobado', /aprobado por Meta/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-ver'))));
  await abrirLista(cli, 'repo');
  chk('aparece el botón de mandar, con la cuenta', await esperar(cli, `!!document.getElementById('jugGo')&&/^Mandar a 2 casas$/.test(document.getElementById('jugGo').textContent.trim())`, 8000), await ev(cli, T('#jugCuerpo .jg-pie')));
  chk('se puede probar la A y la B por separado', (await ev(cli, T('#jugCuerpo .jg-prueba'))) === 'Probar la AProbar la B');
  /* No escribirle más: pide el motivo, y lo anota el servidor. */
  await ev(cli, `document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-fila-va > .jg-sacar')[1].click();1`);
  await pausa(200);
  chk('"Sacar" pregunta cómo: solo este envío, o no escribirle más', (await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-sacar-op'))) === 'Solo este envíoNo escribirle más…Cancelar', await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-sacar-op')));
  await ev(cli, `document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-sacar-op .jg-sacar')[1].click();1`);
  await pausa(200);
  await ev(cli, `document.querySelector('#jugCuerpo .jg-card.abierta .jg-sacar-op .jg-sacar-no').click();1`);
  await pausa(200);
  chk('sin motivo no anota nada', (await ev(cli, `window.__posts.filter(function(p){return p.action==='crmNoEscribir';}).length`)) === 0 && /Escribí el motivo/.test(await ev(cli, T('#toast'))), await ev(cli, T('#toast')));
  await ev(cli, `(function(){var i=document.getElementById('jugMotivo');i.value='Pidió que no';document.querySelector('#jugCuerpo .jg-card.abierta .jg-sacar-op .jg-sacar-no').click();})();1`);
  chk('con motivo, pasa a frenada al toque y dice por qué', await esperar(cli, `[].some.call(document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-fila.no'),function(f){return /Ana Prueba.*no hay que escribirle: «Pidió que no» \\(lo marcó Tadeo Ustariz el 12\\/10\\)/.test(f.textContent.replace(/\\s+/g,' '));})`, 5000),
    await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-lista')));
  const pne = await ev(cli, `JSON.stringify(window.__posts.filter(function(p){return p.action==='crmNoEscribir';}))`);
  const pn = JSON.parse(typeof pne === 'string' ? pne : '[]');
  chk('le manda al servidor la casa, a quién y el motivo', pn.length === 1 && pn[0].k === 'casa:la paz|11' && pn[0].key === '1150000011' && pn[0].motivo === 'Pidió que no' && pn[0].nombre === 'Ana Prueba' && !pn[0].habilitar, pn);
  await pausa(900);   // vuelve a traer las jugadas (en la prueba, las mismas de antes)
  await ev(cli, `jugHabilitar(encodeURIComponent('casa:la paz|11'));1`);
  await pausa(500);
  chk('"Volver a habilitar" le avisa al servidor', (await ev(cli, `JSON.stringify(window.__posts.filter(function(p){return p.action==='crmNoEscribir'&&p.habilitar===true;}).map(function(p){return p.k;}))`)) === '["casa:la paz|11"]');
  await ev(cli, `window.__posts.length=0;1`);
  await esperar(cli, `!!document.getElementById('jugGo')&&/^Mandar a 2 casas$/.test(document.getElementById('jugGo').textContent.trim())`, 8000);
  await ev(cli, `document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-fila-va > .jg-sacar')[1].click();1`);
  await pausa(200);
  await ev(cli, `document.querySelector('#jugCuerpo .jg-card.abierta .jg-sacar-op .jg-sacar').click();1`);
  await pausa(300);
  chk('"Solo este envío" la deja abajo como sacada, con cómo volver a ponerla', (await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-fila-sac'))) ===
    'sacadaAna Prueba La Paz · Lote 11La sacaste vos: no recibe esta jugada. Queda anotado a tu nombre cuando mandes.Volver a poner', await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-fila-sac')));
  await ev(cli, `document.querySelector('#jugCuerpo .jg-card.abierta .jg-fila-sac .jg-sacar').click();1`);
  await pausa(250);
  chk('"Volver a poner" la devuelve a la lista', (await ev(cli, T('#jugGo'))) === 'Mandar a 2 casas' && (await ev(cli, `document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-fila-sac').length`)) === 0);
  await ev(cli, `document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-fila-va > .jg-sacar')[1].click();1`);
  await pausa(200);
  await ev(cli, `document.querySelector('#jugCuerpo .jg-card.abierta .jg-sacar-op .jg-sacar').click();1`);
  await pausa(250);
  chk('sacar una casa la saca de la cuenta', (await ev(cli, T('#jugGo'))) === 'Mandar a 1 casa', await ev(cli, T('#jugGo')));
  await ev(cli, `document.getElementById('jugGo').click();1`);
  await pausa(300);
  chk('el primer toque NO manda: pide el segundo', (await ev(cli, 'window.__posts.length')) === 0 && /^Tocá de nuevo: sale 1 mensaje por WhatsApp$/.test(await ev(cli, T('#jugGo'))), await ev(cli, T('#jugGo')));
  await ev(cli, `document.getElementById('jugGo').click();1`);
  await pausa(800);
  const posts = await ev(cli, 'JSON.stringify(window.__posts)');
  console.log('     POST: ' + posts);
  const ps = JSON.parse(typeof posts === 'string' ? posts : '[]');
  chk('el segundo manda UN POST, con la jugada y solo la casa que quedó tildada', ps.length === 1 && ps[0].action === 'crmEnviarJugada' && ps[0].jugada === 'repo' && JSON.stringify(ps[0].casas) === '["casa:la paz|10"]', ps);
  chk('…y la versión que se le mostró a esa casa (A)', JSON.stringify(ps[0].versiones) === '{"casa:la paz|10":"a"}', ps[0] && ps[0].versiones);
  chk('…y la casa que sacó, para que quede anotado quién la sacó', JSON.stringify(ps[0].sacadas) === '["casa:la paz|11"]', ps[0] && ps[0].sacadas);
  chk('el POST no lleva teléfonos, texto ni nombre de template: eso lo arma el servidor', !/1150000|sorrentinos|jug_/i.test(posts), posts);
  chk('y avisa lo que salió, por versión', /1 mensaje enviado \(A 1 · B 0\) · 1 de control · 1 sacada por vos/.test(await ev(cli, T('#toast'))), await ev(cli, T('#toast')));
  chk('sin errores en consola', (await ev(cli, 'JSON.stringify(window.__err||[])')) === '[]', await ev(cli, 'JSON.stringify(window.__err||[])'));

  console.log('\n-- con jugadas ya enviadas --');
  await ir(cli, 'res');
  chk('pinta', await esperar(cli, pintado));
  await pausa(400);
  const res = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#jugCuerpo .jg-tabla tr[data-res="repo"] td'),function(t){return t.textContent.replace(/\\s+/g,' ').trim();}))`);
  console.log('     resultados: ' + res);
  const envs = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#jugCuerpo .jg-env-f'),function(f){return {t:f.textContent.replace(/\\s+/g,' ').trim(), rojo:[].map.call(f.querySelectorAll('.jg-env-mal'),function(x){return x.textContent+'|'+getComputedStyle(x).color;})};}))`);
  console.log('     envíos de hoy: ' + envs);
  const E = JSON.parse(envs);
  chk('«Envíos de hoy»: 7 enviados · 7 llegaron · 2 leídos', E.length === 2 && E[0].t === '11:58 · jug_segunda_a7 enviados · 7 llegaron · 2 leídos' && !E[0].rojo.length, E[0]);
  chk('…y en rojo los que no llegaron', /5 enviados · 2 llegaron · 3 no llegaron$/.test(E[1].t) && E[1].rojo.length === 1 && /^3 no llegaron\|rgb\(179, 38, 30\)$/.test(E[1].rojo[0]), E[1]);
  chk('compara contra el control, A contra B y los pedidos por el botón', res ===
    '["Reposición 12 todavía en los 14 días","40","12 40% de 30 mirados","26 65%","$1.560.000","2 de 5 40%","15 de 21 71% · 8 resp.","11 de 19 58% · 4 resp.","9 A 6 · B 3"]', res);
  const ct = await ev(cli, T('#jugCuerpo .jg-contesta'));
  console.log('     te contestaron: ' + JSON.stringify(ct).slice(0, 420));
  chk('arriba dice "Te contestaron 2 casas", con quién, de qué jugada, cuándo y qué dijo', /^Te contestaron 2 casas/.test(ct) && /Martín Prueba Reposición · hace 2 horasDale, mandame 2/.test(ct) &&
    /Ana Prueba Reposición · (de ayer|hace 26 horas) · ya compró\(mandó un audio\)/.test(ct), ct);
  chk('es lo PRIMERO de la pantalla: arriba del aviso del tope y de las jugadas', (await ev(cli, `(function(){var a=document.querySelector('#jugCuerpo .jg-contesta').getBoundingClientRect().top,b=document.querySelector('#jugCuerpo .jg-tope').getBoundingClientRect().top,c=document.querySelector('#jugCuerpo .jg-grid').getBoundingClientRect().top;return a<b&&b<c;})()`)) === true);
  chk('al abrir, le pidió una vez al servidor que mire las respuestas en WATI', (await ev(cli, `window.__posts.filter(function(p){return p.action==='crmJugadasRespuestas';}).length`)) === 1, await ev(cli, 'JSON.stringify(window.__posts)'));
  await ev(cli, `document.querySelectorAll('#jugCuerpo .jg-contesta .jg-resp-b .crm-edit-btn')[1].click();1`);
  await pausa(250);
  chk('"Ya le contesté" lo anota el SERVIDOR (es de los dos), no este dispositivo', (await ev(cli, `JSON.stringify(window.__posts.filter(function(p){return p.action==='crmJugadaRespAtendida';}).map(function(p){return p.id;}))+'|'+localStorage.getItem('maleu_jug_resp_vistas')`)) === '["E1-0"]|null');
  chk('"Ya le contesté" la saca de la vista y baja la cuenta', /^Te contestó 1 casa/.test(await ev(cli, T('#jugCuerpo .jg-contesta'))) && !/Martín Prueba/.test(await ev(cli, T('#jugCuerpo .jg-contesta'))), await ev(cli, T('#jugCuerpo .jg-contesta')));
  chk('los botones de ese bloque llegan a 44 px y no desborda', (await ev(cli, `[].filter.call(document.querySelectorAll('#jugCuerpo .jg-contesta .crm-edit-btn'),function(b){return b.getBoundingClientRect().height<44;}).length+Math.max(0,document.documentElement.scrollWidth-window.innerWidth)`)) === 0);
  chk('la tabla ancha no desborda la página', (await ev(cli, 'document.documentElement.scrollWidth-window.innerWidth')) <= 0);
  await foto(cli, 'hoy-resultados');

  console.log('\n-- la segunda vez: el servidor tarda 6 s --');
  await ir(cli, 'lento');
  const t0 = Date.now();
  const rapido = await esperar(cli, pintado, 4000);
  console.log('     pintó en ' + (Date.now() - t0) + ' ms');
  chk('abre de la copia guardada, sin esperar al servidor', rapido === true);
  chk('y dice de cuándo es', /datos de (recién|hace)/.test(await ev(cli, T('#jugCuerpo .jg-top'))), await ev(cli, T('#jugCuerpo .jg-top')));

  console.log('\n-- programar (14/10/2026) --');
  await ir(cli, 'prog');
  chk('pinta', await esperar(cli, pintado));
  await esperar(cli, `!!document.querySelector('#jugCuerpo .jg-prog')`, 8000);
  const progR = await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-prog'));
  chk('la programada dice su hora, cuántas casas y quién la programó, con Cancelar', /^🕒 Programada para (hoy|\S+ \d+\/\d+) a las \d\d:\d\d · 2 casas · la programó Lucas Moresco\..*Cancelar$/.test(progR), progR);
  const progS = await ev(cli, T('#jugCuerpo .jg-card[data-jug="segunda"] .jg-prog'));
  chk('la que ya salió dice qué pasó (lo que escribió el trigger)', /^✅ La de .* \(corrió 09:03\): salieron 3 \(A 2 · B 1\) · salteadas 1 \(1 compró en el medio\)$/.test(progS), progS);
  const btns = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#jugCuerpo .jg-card[data-jug="nuevo"] .jg-btns .jg-btn'),function(b){return b.textContent.trim();}))`);
  chk('al lado de "Revisar la lista y mandar" está "Programar"', btns === '["Revisar la lista y mandar","Programar"]', btns);
  await ev(cli, `document.querySelector('#jugCuerpo .jg-card[data-jug="repo"] .jg-prog .crm-edit-btn').click();1`);
  await pausa(300);
  chk('Cancelar le avisa al servidor cuál', (await ev(cli, `JSON.stringify(window.__posts.filter(function(p){return p.action==='crmCancelarJugadaProg';}).map(function(p){return p.id;}))`)) === '["JP-1"]');
  await ev(cli, `document.querySelector('#jugCuerpo .jg-card[data-jug="nuevo"] .jg-prog-btn').click();1`);
  await pausa(300);
  const hora0 = await ev(cli, `(document.getElementById('jugHora')||{}).value||''`);
  const antesDeMedioDia = await ev(cli, `(function(){var d=new Date();d.setHours(12,0,0,0);return d.getTime()-Date.now()>=5*60000;})()`);
  chk('"Programar" abre la lista de esa jugada con la hora: por defecto las 12:00 de hoy', (await ev(cli, `!!document.querySelector('#jugCuerpo .jg-card.abierta[data-jug="nuevo"]')`)) === true &&
    (antesDeMedioDia ? hora0 === '12:00' : /^\d\d:\d\d$/.test(hora0)), hora0);
  chk('debajo de la hora aclara que sale hasta 15 min después', /^Sale hasta 15 min después de esa hora/.test(await ev(cli, T('#jugCuerpo .jg-hora-nota'))), await ev(cli, T('#jugCuerpo .jg-hora-nota')));
  await ev(cli, `document.getElementById('jugHora').value='00:05';jugProgramar('nuevo');1`);
  chk('una hora que ya pasó no se programa, y lo dice', (await ev(cli, `window.__posts.filter(function(p){return p.action==='crmProgramarJugada';}).length`)) === 0 && /Esa hora ya pasó/.test(await ev(cli, T('#toast'))), await ev(cli, T('#toast')));
  const hFut = await ev(cli, `(function(){var t=new Date(Date.now()+2*3600000),a=new Date();if(t.toDateString()!==a.toDateString())t=new Date(a.getFullYear(),a.getMonth(),a.getDate(),23,59);var p=function(n){return (n<10?'0':'')+n;};return p(t.getHours())+':'+p(t.getMinutes());})()`);
  await ev(cli, `document.getElementById('jugHora').value=${JSON.stringify(hFut)};document.getElementById('jugProgGo').click();1`);
  await pausa(400);
  const pp = JSON.parse(await ev(cli, `JSON.stringify(window.__posts.filter(function(p){return p.action==='crmProgramarJugada';}))`));
  const hm = hFut.split(':').map(Number);
  const saleEsp = await ev(cli, `(function(){var d=new Date();d.setHours(${hm[0]},${hm[1]},0,0);return d.getTime();})()`);
  chk('programa UN POST: la jugada, las casas, la versión de cada una, las sacadas y la hora elegida', pp.length === 1 && pp[0].jugada === 'nuevo' && JSON.stringify(pp[0].casas) === '["casa:la paz|30"]' &&
    JSON.stringify(pp[0].versiones) === '{"casa:la paz|30":"a"}' && JSON.stringify(pp[0].sacadas) === '[]' && pp[0].sale === saleEsp, pp);
  chk('…sin teléfonos ni texto', !/1150000|sorrentinos|jug_/i.test(JSON.stringify(pp)));
  chk('…y avisa para cuándo quedó, que sale hasta 15 min después y que se puede cancelar', new RegExp('Programada para las ' + hFut + ': 1 casa \\(sale hasta 15 min después\\)\\. Se puede cancelar').test(await ev(cli, T('#toast'))), await ev(cli, T('#toast')));
  chk('no mandó nada por WhatsApp', (await ev(cli, `window.__posts.filter(function(p){return p.action==='crmEnviarJugada';}).length`)) === 0);
  await ev(cli, `jugProgAbrir('repo');1`); await pausa(300);
  const mdP = JSON.parse(await ev(cli, `JSON.stringify({chicos:[].filter.call(document.querySelectorAll('#jugCuerpo .jg-prog .crm-edit-btn, #jugCuerpo .jg-prog-btn, #jugProgGo'),function(b){return b.offsetParent&&b.getBoundingClientRect().height<44;}).length,
    n:document.querySelectorAll('#jugCuerpo .jg-prog .crm-edit-btn, #jugCuerpo .jg-prog-btn, #jugProgGo').length, desborde:document.documentElement.scrollWidth-window.innerWidth})`));
  chk('los botones nuevos llegan a 44 px y nada desborda (' + mdP.n + ' botones)', mdP.chicos === 0 && mdP.desborde <= 0 && mdP.n >= 3, mdP);
  await foto(cli, 'hoy-programar');
  chk('sin errores en consola', (await ev(cli, 'JSON.stringify(window.__err||[])')) === '[]', await ev(cli, 'JSON.stringify(window.__err||[])'));
}

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + STUB(DATOS) });
    if (process.env.DATOS) {
      await ir(cli, 'off');
      await esperar(cli, pintado); await pausa(900);
      await foto(cli, 'hoy-real');
      const ej = await ev(cli, `(function(){var c=[].filter.call(document.querySelectorAll('#jugCuerpo .jg-card'),function(x){return !x.classList.contains('vacia');})[0];if(c){c.querySelector('.jg-btn').click();}return !!c;})()`);
      if (ej) { await pausa(600); await foto(cli, 'hoy-real-lista'); }
      return salir(0);
    }
    console.log('CRM > Hoy a ' + ANCHO + ' px');
    await apagado(cli);
    await prendido(cli);
  } catch (e) { mal++; console.log('  MAL  la prueba reventó: ' + (e && e.stack || e)); }
  console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
