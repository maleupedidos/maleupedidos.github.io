/* CRM > Hoy: las jugadas del día (12/10/2026).

   node probar_crm_hoy.js [390|1440]
   BASE=http://localhost:8095 node probar_crm_hoy.js 390        ← tu propio servidor
   DATOS=<crmJugadas.json> FOTOS=<carpeta> node probar_crm_hoy.js 390   ← solo capturas

   Backend STUBBEADO con datos inventados (repo público), sin token: no toca
   producción y NO manda un mensaje (los POST se cortan y se anotan).

   Sostiene:
   · apagado, un admin ve la sub-tab primera y el "Hoy" de siempre pasa a
     llamarse "Pendientes"; quien no es admin no la ve y no cambia nada;
   · cada jugada dice cuántas casas, la plata en juego, el mensaje armado con un
     cliente (sin un {{hueco}}) y contra qué se mide;
   · la lista muestra a quién va, quién queda de control y por qué se frena cada
     una de las otras;
   · APAGADO no hay botón de mandar, y no sale ni un POST;
   · prendido: sin template aprobado tampoco hay botón; con template hacen falta
     DOS toques, sale UN POST con las casas elegidas (sin teléfonos ni texto: eso
     lo arma el servidor) y destildar una casa la saca;
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
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(200); }
  return false;
};

const P = (o) => Object.assign({ n: 5, fam: 'Sorrentinos', famPct: 80, g: 'SJyQ', gPct: 100, sp: 1, r: 21, rOk: 1, d: 24, toca: -3, dia: 5, diaOk: 1,
  fj: 'm', fjOk: 1, tk: 40000, nu: ['Tartas', 'Wraps'], prob: ['Sorrentinos'], cup: 0, cupBase: 0, est: 'Activo', can: 'Home', pideDia: 4, pideHora: 'noche', ab: 0 }, o || {});
const casa = (lote, nom, j, extra) => Object.assign({ k: 'casa:la paz|' + lote, casa: 1, nom: nom, tel: '11500000' + lote, key: '11500000' + lote, keys: ['11500000' + lote],
  bar: 'Estancias del Pilar', sub: 'La Paz', lote: String(lote), fr: 'Compra sorrentinos de jamón y queso cada 3 semanas, los viernes. Nunca probó tartas ni wraps. Le toca esta semana.',
  j: j, js: j ? [j] : [], ex: '', ctl: 0, sale: new Date(2026, 9, 16).getTime(),
  v: j ? { nombre: nom.split(' ')[0], producto_habitual: 'los sorrentinos de jamón y queso', dia_reparto: 'viernes' } : null, p: P() }, extra || {});
const FIX = {
  ok: true, ts: 1, hoy: '12/10/2026', palanca: false, ocasion: null,
  reglas: { tope: 7, sinCompra: 7, control: 10, ventana: 14 },
  jugadas: [
    { id: 'segunda', nombre: 'Segunda compra', template: 'jugada_segunda', vars: ['nombre', 'producto_habitual', 'dia_reparto'],
      msg: 'Hola {{nombre}}! ¿Cómo te fue con {{producto_habitual}}? Este {{dia_reparto}} repartimos de nuevo: ¿te llevamos otra vez?', caen: 1, n: 1, control: 0, frenadas: 0, plata: 6400, ej: 'casa:la paz|20' },
    { id: 'volve', nombre: 'Volvé', template: 'jugada_volve', vars: ['nombre', 'producto_habitual', 'dia_reparto'],
      msg: '{{nombre}}, hace rato que no te llevamos {{producto_habitual}}. Este {{dia_reparto}} repartimos: ¿te guardamos?', caen: 0, n: 0, control: 0, frenadas: 0, plata: 0, ej: null },
    { id: 'ocasion', nombre: 'Ocasión', template: 'jugada_ocasion', vars: ['nombre', 'producto_habitual', 'ocasion', 'horario_reparto'],
      msg: '¿Qué mejor que {{producto_habitual}} para {{ocasion}}, {{nombre}}? Hoy repartimos {{horario_reparto}}.', caen: 0, n: 0, control: 0, frenadas: 0, plata: 0, ej: null },
    { id: 'repo', nombre: 'Reposición', template: 'jugada_reposicion', vars: ['nombre', 'producto_habitual', 'dia_reparto'],
      msg: '¿Te llevamos {{producto_habitual}} este {{dia_reparto}}, {{nombre}}?', caen: 5, n: 2, control: 1, frenadas: 2, plata: 43200, ej: 'casa:la paz|10' },
    { id: 'nuevo', nombre: 'Probá algo nuevo', template: 'jugada_nuevo', vars: ['nombre', 'producto_habitual', 'familia_nueva', 'descuento', 'cupon'],
      msg: '¿Te llevamos {{producto_habitual}}, {{nombre}}? Aprovechá a conocer {{familia_nueva}} con {{descuento}}% off: poné el cupón {{cupon}} en la tienda.', caen: 1, n: 1, control: 0, frenadas: 0, plata: 17200, ej: 'casa:la paz|30' }
  ],
  casas: [
    casa(10, 'Pepito Prueba', 'repo'),
    casa(11, 'Ana Prueba', 'repo'),
    casa(12, 'Control Prueba', 'repo', { ctl: 1 }),
    casa(13, 'Tope Prueba', 'repo', { ex: 'tope' }),
    casa(14, 'Abierta Prueba', 'repo', { ex: 'abierto' }),
    casa(20, 'Segunda Prueba', 'segunda', { fr: 'Compró una sola vez, hace 12 días: lomo.', v: { nombre: 'Segunda', producto_habitual: 'el lomo', dia_reparto: 'viernes' }, p: P({ n: 1 }) }),
    casa(30, 'Nueva Prueba', 'nuevo', { v: { nombre: 'Nueva', producto_habitual: 'las pizzas de muzzarella', dia_reparto: 'viernes', familia_nueva: 'las tartas', descuento: '20', cupon: 'TARTA20' } }),
    casa(40, 'Quieta Prueba', '', {})
  ],
  frenos: { tope: 1, abierto: 1 },
  historia: { segunda: { n: 160, compraron: 25, plata: 1, casas: 160 }, volve: { n: 100, compraron: 32, plata: 1, casas: 85 },
              repo: { n: 255, compraron: 137, plata: 1, casas: 94 }, nuevo: { n: 253, compraron: 109, plata: 1, casas: 109 } },
  base: { segunda: 0.16, volve: 0.32, ocasion: null, repo: 0.54, nuevo: 0.43 },
  resultados: {}, cupones: { Tartas: { cod: 'TARTA20', pct: 20 } }, nombres: {}
};
const DATOS = process.env.DATOS ? JSON.parse(fs.readFileSync(process.env.DATOS, 'utf8')) : FIX;
const TPLS = (cuales) => { const o = {}; cuales.forEach((n) => { o[n] = { estado: 'APPROVED', cuerpo: 'TEMPLATE ¿Te llevamos {{producto_habitual}} este {{dia_reparto}}, {{nombre}}?', param: 'nombre', params: ['nombre', 'producto_habitual', 'dia_reparto'] }; }); return o; };

/* fase: off (palanca apagada) · on (prendida, con templates) · sintpl (prendida, sin el template) · lento (crmJugadas tarda 6 s) */
const STUB = (datos) => `
  window.__gets=[]; window.__posts=[];
  var __fase=(location.search.match(/fase=(\\w+)/)||[])[1]||'off';
  if(window.top===window){ try{
    localStorage.setItem('maleu_tab','estancias'); localStorage.setItem('maleu_est_sub','jugadas');
    if(__fase!=='lento'){ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('mc_')===0) localStorage.removeItem(k); }); localStorage.removeItem('maleu_jug_on'); }
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('supabase')>-1) return Promise.reject(new Error('sin base en la prueba'));
    if(url.indexOf('script.google.com')>-1){
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        return Promise.resolve(new Response(JSON.stringify(b.action==='crmEnviarJugada'?{ok:true,enviados:(b.casas||[1]).length,control:1,caidas:0}:{ok:true}),{status:200}));
      }
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?'; window.__gets.push(a);
      var cuerpo={ok:false,error:'stub'}, demora=120;
      if(a==='crmJugadas'){ cuerpo=${JSON.stringify(datos)}; cuerpo.palanca=(__fase==='on'||__fase==='sintpl'); if(__fase==='lento') demora=6000; }
      else if(a==='watiTemplates') cuerpo={ok:true,templates:(__fase==='sintpl'?${JSON.stringify(TPLS(['jugada_segunda']))}:${JSON.stringify(TPLS(['jugada_reposicion', 'jugada_segunda', 'jugada_nuevo']))})};
      else if(a==='pedidosLight') cuerpo={ts:1,pedidos:[],canales:[],light:true,saludSem:{},saludMes:{}};
      else if(a==='crmClientes') cuerpo={ts:1,clientes:[],lite:false,kg:[],nombres:{}};
      else if(a==='crmInteracciones') cuerpo={ts:1,interacciones:[]};
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
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: Math.min(Number(alto) || 900, 6000), deviceScaleFactor: ANCHO <= 560 ? 2 : 1, mobile: ANCHO <= 560 });
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

async function apagado(cli) {
  console.log('\n-- apagado, entra un admin --');
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
  const ordenCards = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#jugCuerpo .jg-card'),function(c){return c.getAttribute('data-jug')+(c.classList.contains('vacia')?'-':'');}))`);
  chk('las jugadas con casas van primero, las vacías al final', ordenCards === '["segunda","repo","nuevo","volve-","ocasion-"]', ordenCards);
  const repo = await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"]'));
  console.log('     Reposición: ' + JSON.stringify(repo).slice(0, 420));
  chk('Reposición: 2 casas, plata en juego, control y frenadas', /Reposición\s*2\s*casas/.test(repo) && /\$43\.200 en juego/.test(repo) && /1 de control/.test(repo) && /2 frenadas/.test(repo), repo);
  chk('dice contra qué se mide: 54 de cada 100 compran igual', /Sin mensaje, 54 de cada 100 compran igual en 14 días/.test(repo), repo);
  const msg = await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-msg'));
  chk('el mensaje sale armado con un cliente real de la lista, sin huecos', msg === '¿Te llevamos los sorrentinos de jamón y queso este viernes, Pepito?', msg);
  chk('y abajo dice a quién y su perfil', /Así le llegaría a Pepito Prueba\. Compra sorrentinos de jamón y queso cada 3 semanas/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="repo"] .jg-msg-de'))));
  chk('ningún mensaje de la pantalla tiene un {{hueco}}', (await ev(cli, `/\\{\\{/.test(document.getElementById('jugCuerpo').textContent)`)) === false);
  chk('Probá algo nuevo nombra UNA familia, el descuento y el cupón', /conocer las tartas con 20% off: poné el cupón TARTA20/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="nuevo"] .jg-msg'))));
  chk('Ocasión sin día especial lo dice', /no hay ningún reparto especial cargado/.test(await ev(cli, T('#jugCuerpo .jg-card[data-jug="ocasion"]'))));
  chk('sin jugadas enviadas muestra la vara del historial', /Todavía no salió ninguna/.test(await ev(cli, T('#jugCuerpo'))) && /Reposición\s*255\s*137\s*54%/.test(await ev(cli, T('#jugCuerpo .jg-tabla'))), await ev(cli, T('#jugCuerpo .jg-tabla')));
  await foto(cli, 'hoy');

  await ev(cli, `document.querySelector('#jugCuerpo .jg-card[data-jug="repo"] .jg-btn').click();1`);
  await pausa(500);
  const filas = await ev(cli, `JSON.stringify([].map.call(document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-fila'),function(f){return (f.querySelector('input')?'[x] ':'')+f.textContent.replace(/\\s+/g,' ').trim().slice(0,170);}))`);
  console.log('     lista: ' + filas);
  const fl = JSON.parse(typeof filas === 'string' ? filas : '[]');
  chk('la lista: 2 con tilde, 1 de control, 2 frenadas con su motivo', fl.length === 5 && fl.filter(x => /^\[x\]/.test(x)).length === 2 &&
    fl.some(x => /^control ?Control Prueba/.test(x)) && fl.some(x => /Tope Prueba.*ya recibió un mensaje en los últimos 7 días/.test(x)) && fl.some(x => /Abierta Prueba.*tiene un pedido abierto/.test(x)), fl);
  chk('cada casa de la lista muestra SU mensaje', (await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-fila:nth-child(2) .jg-fila-msg'))) === '¿Te llevamos los sorrentinos de jamón y queso este viernes, Ana?', await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-fila:nth-child(2) .jg-fila-msg')));
  chk('APAGADO: no hay botón de mandar ni de prueba', (await ev(cli, `!document.getElementById('jugGo')&&!document.getElementById('jugTelPrueba')`)) === true);
  chk('y explica por qué', /Apagado\. Todavía no se manda nada desde acá/.test(await ev(cli, T('#jugCuerpo .jg-pie'))));
  chk('llamar a mandar a mano tampoco hace nada', (await ev(cli, `jugMandar('repo');jugMandar('repo');jugPrueba('repo');window.__posts.length`)) === 0);
  await foto(cli, 'hoy-lista');

  const medidas = await ev(cli, `JSON.stringify({desborde:document.documentElement.scrollWidth-window.innerWidth,
    chicos:[].filter.call(document.querySelectorAll('#jugCuerpo .jg-btn'),function(b){return b.getBoundingClientRect().height<44;}).length,
    botones:document.querySelectorAll('#jugCuerpo .jg-btn').length,
    sale:[].filter.call(document.querySelectorAll('#jugCuerpo .jg-card'),function(c){var r=c.getBoundingClientRect();return r.right>window.innerWidth+1||r.left<-1;}).length,
    cols:(function(){var t={};[].forEach.call(document.querySelectorAll('#jugCuerpo .jg-card:not(.abierta)'),function(c){t[Math.round(c.getBoundingClientRect().left)]=1;});return Object.keys(t).length;})()})`);
  console.log('     medidas: ' + medidas);
  const md = JSON.parse(typeof medidas === 'string' ? medidas : '{}');
  chk('nada desborda a lo ancho (' + md.botones + ' botones medidos)', md.desborde <= 0 && md.sale === 0 && md.botones >= 3, md);
  chk('todos los botones llegan a 44 px', md.chicos === 0, md);
  chk(ANCHO <= 560 ? 'en el celular va en una columna' : 'en escritorio las tarjetas van en más de una columna', ANCHO <= 560 ? md.cols === 1 : md.cols >= 2, md);

  chk('la ficha dice el perfil arriba, con la jugada de hoy', (await ev(cli, `(function(){var d=document.createElement('div');d.innerHTML=crmPerfilHtml('cliente','1150000010');return d.textContent;})()`)) ===
    'Compra sorrentinos de jamón y queso cada 3 semanas, los viernes. Nunca probó tartas ni wraps. Le toca esta semana. Hoy: Reposición');
  chk('la ficha de la CASA también (por sub-barrio y lote)', /^Compra sorrentinos/.test(await ev(cli, `(function(){var d=document.createElement('div');d.innerHTML=crmPerfilHtml('casa','La Paz|010');return d.textContent;})()`)));
  chk('a la frenada no le dice "Hoy:"', !/Hoy:/.test(await ev(cli, `(function(){var d=document.createElement('div');d.innerHTML=crmPerfilHtml('cliente','1150000013');return d.textContent;})()`)));
  chk('en toda la fase no salió ni un POST', (await ev(cli, 'window.__posts.length')) === 0, await ev(cli, 'JSON.stringify(window.__posts)'));

  console.log('\n-- apagado, entra alguien que no es admin --');
  const noAdmin = await ev(cli, `(function(){SESSION.rol='ventas';var v=jugTabs();var r={ve:v,boton:document.getElementById('jugTabBtn').style.display,viejo:document.getElementById('estTabHoyViejo').textContent,
    perfil:crmPerfilHtml('cliente','1150000010')};estSwitch('jugadas');r.sub=(document.querySelector('#p-estancias .est-sub.on')||{}).id;SESSION.rol='admin';jugTabs();return JSON.stringify(r);})()`);
  console.log('     ' + noAdmin);
  chk('no ve la sub-tab, el "Hoy" de siempre se llama Hoy, y la ficha no cambia', noAdmin === '{"ve":false,"boton":"none","viejo":"Hoy","perfil":"","sub":"est-pulso"}', noAdmin);
  chk('sin errores en consola', (await ev(cli, 'JSON.stringify(window.__err||[])')) === '[]', await ev(cli, 'JSON.stringify(window.__err||[])'));
}

async function prendido(cli) {
  console.log('\n-- prendido, con los templates aprobados --');
  await ir(cli, 'on');
  chk('pinta', await esperar(cli, pintado));
  await pausa(500);
  chk('ya no dice apagado', (await ev(cli, `!document.querySelector('#jugCuerpo .jg-chip')`)) === true);
  await ev(cli, `document.querySelector('#jugCuerpo .jg-card[data-jug="repo"] .jg-btn').click();1`);
  chk('aparece el botón de mandar, con la cuenta', await esperar(cli, `!!document.getElementById('jugGo')&&/^Mandar a 2 casas$/.test(document.getElementById('jugGo').textContent.trim())`, 8000), await ev(cli, T('#jugCuerpo .jg-pie')));
  chk('el mensaje pasa a ser el del template aprobado', /^TEMPLATE ¿Te llevamos los sorrentinos de jamón y queso este viernes, Pepito\?$/.test(await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-msg'))), await ev(cli, T('#jugCuerpo .jg-card.abierta .jg-msg')));
  await ev(cli, `document.querySelectorAll('#jugCuerpo .jg-card.abierta .jg-fila input')[1].click();1`);
  await pausa(300);
  chk('destildar una casa la saca de la cuenta', (await ev(cli, T('#jugGo'))) === 'Mandar a 1 casa', await ev(cli, T('#jugGo')));
  await ev(cli, `document.getElementById('jugGo').click();1`);
  await pausa(300);
  chk('el primer toque NO manda: pide el segundo', (await ev(cli, 'window.__posts.length')) === 0 && /^Tocá de nuevo: sale 1 mensaje por WhatsApp$/.test(await ev(cli, T('#jugGo'))), await ev(cli, T('#jugGo')));
  await ev(cli, `document.getElementById('jugGo').click();1`);
  await pausa(800);
  const posts = await ev(cli, 'JSON.stringify(window.__posts)');
  console.log('     POST: ' + posts);
  const ps = JSON.parse(typeof posts === 'string' ? posts : '[]');
  chk('el segundo manda UN POST, con la jugada y solo la casa que quedó tildada', ps.length === 1 && ps[0].action === 'crmEnviarJugada' && ps[0].jugada === 'repo' && JSON.stringify(ps[0].casas) === '["casa:la paz|10"]', ps);
  chk('el POST no lleva teléfonos ni texto: eso lo arma el servidor', !/1150000|sorrentinos|template/i.test(posts), posts);
  chk('y avisa lo que salió', /1 mensaje enviado · 1 de control/.test(await ev(cli, T('#toast'))), await ev(cli, T('#toast')));

  console.log('\n-- prendido, pero falta el template de esa jugada --');
  await ir(cli, 'sintpl');
  chk('pinta', await esperar(cli, pintado));
  await pausa(400);
  await ev(cli, `document.querySelector('#jugCuerpo .jg-card[data-jug="repo"] .jg-btn').click();1`);
  chk('dice que falta el template y no ofrece mandar', await esperar(cli, `/Falta el template\\. «jugada_reposicion»/.test(document.querySelector('#jugCuerpo .jg-pie').textContent)&&!document.getElementById('jugGo')`, 8000), await ev(cli, T('#jugCuerpo .jg-pie')));
  chk('y forzarlo a mano no manda', (await ev(cli, `jugMandar('repo');jugMandar('repo');window.__posts.length`)) === 0);
  chk('sin errores en consola', (await ev(cli, 'JSON.stringify(window.__err||[])')) === '[]', await ev(cli, 'JSON.stringify(window.__err||[])'));

  console.log('\n-- la segunda vez: el servidor tarda 6 s --');
  await ir(cli, 'lento');
  const t0 = Date.now();
  const rapido = await esperar(cli, pintado, 4000);
  console.log('     pintó en ' + (Date.now() - t0) + ' ms');
  chk('abre de la copia guardada, sin esperar al servidor', rapido === true);
  chk('y dice de cuándo es', /datos de (recién|hace)/.test(await ev(cli, T('#jugCuerpo .jg-top'))), await ev(cli, T('#jugCuerpo .jg-top')));
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
