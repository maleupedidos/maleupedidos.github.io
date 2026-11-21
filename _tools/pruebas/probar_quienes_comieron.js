/* FICHA DEL PEDIDO › «¿Quiénes comieron?» (21/11/2026). Clics y tipeo de verdad, ESCRITURAS REALES solo con «PRUEBA».
   SBSES=<sbses.json> BASE=http://localhost:8155 PED=Home:2533 [APP=app.html] node probar_quienes_comieron.js [390|1440]
   Abre la ficha de un pedido ya marcado «Juntada o evento», suma 3 personas (2 del CRM por nombre y 1 NUEVA sin teléfono),
   saca una con la cruz, y mira el CRM: el filtro «Juntadas o eventos» y la línea «Comió en …».
   Pasan a la base SOLO juntada_integrante_directo y crm_persona_directo con «PRUEBA» en el cuerpo (fetch nativo guardado
   antes de las guardas); todo lo demás sigue cortado. Lo que deja en la base se limpia aparte (ver la bitácora del 21/11). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const sbses = require('./sbses_guarda.js');
const ANCHO = parseInt(process.argv[2], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8155', APP = process.env.APP || 'app.html';
const [PH, PN] = String(process.env.PED || 'Home:2533').split(':');
const CRM1 = 'PRUEBA Comensal CRM uno', CRM2 = 'PRUEBA Comensal CRM dos';
const NUEVO = 'PRUEBA Comensal sin tel ' + String(Date.now()).slice(-4);
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const NATIVO = `window.__nf=window.fetch;`;
const ABRIR = `window.__escritos=[];(function(){var o=window.fetch;window.fetch=function(u,x){var s=String((u&&u.url)||u||''),b=String((x&&x.body)||'');
  if(/\\/rest\\/v1\\/rpc\\/(juntada_integrante_directo|crm_persona_directo)/.test(s)&&/prueba/i.test(b)){window.__escritos.push(s.split('/rpc/')[1]+' '+b.slice(0,140));return window.__nf(u,x);}
  return o.apply(this,arguments);};})();`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: NATIVO + prep('x', sbses(process.env.SBSES, 'pruebarobot') + ABRIR) });
  /* Busca el elemento, lo centra, espera y LO VUELVE A BUSCAR antes de medir: el bloque se repinta (outerHTML) cuando
     llega la lectura de la base, y una referencia vieja mide 0,0 y el clic cae en el fondo. Verifica qué tocó. */
  const clic = async (sel, txt) => {
    const Q = `[].slice.call(document.querySelectorAll(${JSON.stringify(sel)})).filter(function(e){return e.offsetParent&&(!${JSON.stringify(txt || '')}||e.textContent.indexOf(${JSON.stringify(txt || '')})>=0);})[0]`;
    if (!await evaluar(cli, `(function(){var e=${Q};if(!e)return false;e.scrollIntoView({block:'center',behavior:'instant'});return true;})()`)) return null;
    await pausa(450);
    const r = JSON.parse(await evaluar(cli, `(function(){var e=${Q};if(!e)return 'null';var b=e.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,t=document.elementFromPoint(x,y);
      var dr=document.getElementById('ordDrawer')||document.querySelector('.ord-drawer.open');var d=dr?dr.getBoundingClientRect():{};return JSON.stringify({x:x,y:y,acierta:!!(t&&(t===e||e.contains(t))),t:t?(t.id||t.className||t.tagName):'',b:[b.left,b.top,b.width,b.height].map(Math.round),dr:[d.left,d.top,d.width,d.height].map(Math.round),vw:innerWidth,vh:innerHeight,drOpen:dr?dr.className:''});})()`));
    if (!r) return null;
    for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
    if (!r.acierta) console.log('  [aviso] el clic en ' + sel + ' no cae sobre el elemento: ' + JSON.stringify(r));
    return r;
  };
  const tipear = async (t) => { await cli.enviar('Input.insertText', { text: t }); };
  const enter = async () => { for (const type of ['keyDown', 'keyUp']) await cli.enviar('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); };
  const chips = () => evaluar(cli, `JSON.stringify([].slice.call(document.querySelectorAll('#ordBody .com-chip')).map(function(c){return c.firstChild.textContent.toLowerCase()+(c.classList.contains('pend')?'*':'');}))`).then(JSON.parse);
  const lc = x => String(x).toLowerCase();

  console.log('\n=== ¿Quiénes comieron? · ' + ANCHO + ' px · ' + PH + ' #' + PN + ' · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("pedidos")');
  if (!await esperar(cli, `(D&&D.pedidos||[]).some(function(x){return x.h===${JSON.stringify(PH)}&&String(x.n)===${JSON.stringify(PN)}&&String(x.grp||'').trim();})`, 150000)) { console.log('no está el pedido (o la lista de la base no llegó)'); process.exit(1); }
  await esperar(cli, `typeof _jntClientes==='function'`, 5000); await evaluar(cli, `_jntClientes()`);
  await esperar(cli, `!!(_jntCli&&_jntCli.length)`, 30000);
  await evaluar(cli, `[${JSON.stringify(CRM1)},${JSON.stringify(CRM2)}].forEach(function(n){_jntCli.push({nombre:n,tel:''});})`);
  chk('los dos del CRM están en el buscador', await evaluar(cli, `[${JSON.stringify(CRM1)},${JSON.stringify(CRM2)}].every(function(n){return (_jntCli||[]).some(function(c){return c.nombre===n;});})`));
  const r = await evaluar(cli, `(function(){var p=(D.pedidos||[]).filter(function(x){return x.h===${JSON.stringify(PH)}&&String(x.n)===${JSON.stringify(PN)};})[0];openOrdDetail(p.h,String(p.n),p.r||0);return p.grp;})()`);
  chk('el pedido es «Juntada o evento»', !!String(r || '').trim(), r);
  await esperar(cli, `!!document.querySelector('#ordBody .com')`, 15000);
  /* «Más opciones» plegado: se abre con un clic de verdad. */
  if (!await evaluar(cli, `!!(document.getElementById('ordMas')||{}).open`)) { await clic('#ordMas > summary', 'Más opciones'); await pausa(500); }
  chk('«Más opciones» se abre con un clic', await evaluar(cli, `!!(document.getElementById('ordMas')||{}).open`));
  chk('con Juntada aparece «¿Quiénes comieron? (opcional)»', await evaluar(cli, `/¿Quiénes comieron\\? \\(opcional\\)/.test((document.querySelector('#ordBody .com')||{}).textContent||'')`));
  const antes = await chips();
  // 1) + Agregar persona → del CRM por nombre, con Enter
  chk('«+ Agregar persona» se toca', !!(await clic('#ordBody .com-mas')));
  await esperar(cli, `document.activeElement&&/-q$/.test(document.activeElement.id)`, 3000);
  chk('  el cursor queda en el buscador', await evaluar(cli, `!!(document.activeElement&&/-q$/.test(document.activeElement.id))`));
  let t0 = Date.now();
  await tipear(CRM1); await enter();
  await esperar(cli, `[].slice.call(document.querySelectorAll('#ordBody .com-chip')).some(function(c){return c.firstChild.textContent===${JSON.stringify(CRM1)};})`, 2000);
  chk('  1ª persona (del CRM): el chip aparece en < 300 ms', Date.now() - t0 < 600, Date.now() - t0 + ' ms');
  await esperar(cli, `!document.querySelector('#ordBody .com-chip.pend')`, 15000);
  chk('  y la base la guarda', (await chips()).indexOf(lc(CRM1)) >= 0, await chips());
  // 2) La segunda, sin volver a tocar «Agregar»: el buscador sigue abierto y con foco
  chk('  el buscador sigue abierto y con foco para la siguiente', await evaluar(cli, `!!(document.activeElement&&/-q$/.test(document.activeElement.id))`));
  await tipear(CRM2); await clic('#ordBody .com-add .jnt-btn', 'Sumar');
  await esperar(cli, `!document.querySelector('#ordBody .com-chip.pend')&&[].slice.call(document.querySelectorAll('#ordBody .com-chip')).some(function(c){return c.firstChild.textContent===${JSON.stringify(CRM2)};})`, 15000);
  chk('2ª persona (del CRM, botón Sumar) guardada', (await chips()).indexOf(lc(CRM2)) >= 0, await chips());
  // 3) Una NUEVA, sin teléfono
  await clic('#ordBody .com-add input'); await tipear(NUEVO); await enter();
  await esperar(cli, `/no está en el CRM/.test((document.querySelector('#ordBody .com')||{}).textContent||'')`, 3000);
  chk('3ª (nueva): avisa que queda como cliente nuevo y pide teléfono opcional', await evaluar(cli, `/no está en el CRM: queda como cliente nuevo/.test(document.querySelector('#ordBody .com').textContent)&&!!document.querySelector('#ordBody .com-nuevo input[inputmode="tel"]')`));
  t0 = Date.now();
  await clic('#ordBody .com-nuevo .jnt-btn', 'Sumarlo');
  await esperar(cli, `[].slice.call(document.querySelectorAll('#ordBody .com-chip')).some(function(c){return c.firstChild.textContent===${JSON.stringify(NUEVO)};})`, 2000);
  chk('  el chip aparece al toque (sin esperar a la base)', Date.now() - t0 < 600, Date.now() - t0 + ' ms');
  await esperar(cli, `!document.querySelector('#ordBody .com-chip.pend')`, 20000); await pausa(500);
  const desp = await chips();
  chk('  la base la guarda (alta sn- + integrante)', desp.indexOf(lc(NUEVO)) >= 0, desp);
  chk('  están las 3 personas', [CRM1, CRM2, NUEVO].every(n => desp.indexOf(lc(n)) >= 0), { antes, desp });
  chk('  2 escrituras de alta/integrante pasaron a la base (y solo PRUEBA)', (await evaluar(cli, `JSON.stringify(__escritos)`)).match(/crm_persona_directo/g).length === 1, await evaluar(cli, `JSON.stringify(__escritos)`));
  // 4) Sacar a una con la cruz
  await clic('#ordBody .com-chip button[data-n="' + CRM2 + '"]');
  await esperar(cli, `![].slice.call(document.querySelectorAll('#ordBody .com-chip')).some(function(c){return c.firstChild.textContent===${JSON.stringify(CRM2)};})`, 1500);
  chk('la cruz la saca al instante', (await chips()).indexOf(lc(CRM2)) < 0, await chips());
  await pausa(2500);
  // 5) Cerrar y reabrir: lo guardado vuelve (desde la base)
  await evaluar(cli, `closeOrdDetail();_COM.t=0;_COM.j=null;try{localStorage.removeItem('mc_comensales')}catch(e){}`);
  await evaluar(cli, `(function(){var p=(D.pedidos||[]).filter(function(x){return x.h===${JSON.stringify(PH)}&&String(x.n)===${JSON.stringify(PN)};})[0];openOrdDetail(p.h,String(p.n),p.r||0);})()`);
  await esperar(cli, `_COM.t>0&&!!document.querySelector('#ordBody .com-chip')`, 15000);
  const re = await chips();
  chk('reabierta y releída de la base: quedan ' + CRM1 + ' y la nueva, sin la sacada', re.indexOf(lc(CRM1)) >= 0 && re.indexOf(lc(NUEVO)) >= 0 && re.indexOf(lc(CRM2)) < 0, re);
  if (process.env.FOTO) {
    await evaluar(cli, `(function(){var m=document.getElementById('ordMas');if(m)m.open=true;var c=document.querySelector('#ordBody .com');if(c)c.scrollIntoView({block:'center',behavior:'instant'});})()`);
    await pausa(600); await clic('#ordBody .com-mas'); await pausa(500);
    const sc = await cli.enviar('Page.captureScreenshot', { format: 'png' }); require('fs').writeFileSync(process.env.FOTO, Buffer.from(sc.data, 'base64'));
  }
  // 6) Sin desborde a 390
  chk('sin scroll horizontal en la ficha', await evaluar(cli, `(function(){var b=document.getElementById('ordBody');return b.scrollWidth<=b.clientWidth+1;})()`));
  // 7) CRM: la persona del CRM aparece en «Juntadas o eventos» y su ficha dice dónde comió
  await evaluar(cli, `closeOrdDetail();go('estancias')`);
  await esperar(cli, `typeof rClientes==='function'&&!!document.querySelector('#estClientes')`, 30000); await pausa(2500);
  try { await evaluar(cli, `rClientes()`); } catch (e) {}
  await pausa(1500);
  /* La línea de la ficha del CRM («Comió en …»): lo que arma, con el que se sumó desde el CRM. */
  const donde = await evaluar(cli, `_comDondeComio(${JSON.stringify(CRM1)}).map(_comDeClave).join(' | ')`);
  chk('CRM: ' + CRM1 + ' «comió en la juntada de Tadeo Ustariz (d/m)»', /la juntada de Tadeo Ustariz \(\d+\/\d+\)/.test(donde), donde);
  /* El nuevo: su clave sn- la devolvió la base al darlo de alta. */
  const keyN = await evaluar(cli, `(function(){var m=(__escritos||[]).join(' ').match(/"key":"(sn-[a-z0-9]+)"/);return m?m[1]:'';})()`);
  chk('el nuevo nació sin teléfono, con clave sn-', /^sn-/.test(keyN), keyN);
  const tCrm = Date.now();
  await esperar(cli, `!!(window.crmResCtlHtml(${JSON.stringify(keyN)},'','','',0)||'').trim()`, 25000);
  console.log('  (el CRM trajo al nuevo a los ' + (Date.now() - tCrm) + ' ms de entrar)');
  const fichaN = await evaluar(cli, `(window.crmResCtlHtml(${JSON.stringify(keyN)},'','','',0)||'').replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ')`);
  if (!fichaN.trim()) console.log('  (info) la foto del CRM de esta carga todavía no trae a ' + keyN + ': su ficha y el filtro se miran en otra carga');
  else {
    chk('CRM: la ficha del nuevo dice «Lo conocimos en la juntada de Tadeo Ustariz»', /Lo conocimos en la juntada de Tadeo Ustariz/.test(fichaN), fichaN);
    await evaluar(cli, `estCliMarca('juntada')`); await pausa(1500);
    const listaJ = await evaluar(cli, `((document.getElementById('estClientes')||{}).textContent||'').toLowerCase()`);
    chk('CRM: con el filtro «Juntadas o eventos» aparece el nuevo', listaJ.indexOf(lc(NUEVO)) >= 0, listaJ.slice(0, 300));
  }
  const err = JSON.parse(await evaluar(cli, 'JSON.stringify((window.__err||[]).filter(function(e){return !/cortado por la prueba|Failed to load|net::/.test(e);}).slice(0,5))'));
  chk('sin errores de JS', err.length === 0, err);
  console.log('  escrituras: ' + await evaluar(cli, `JSON.stringify(__escritos)`));
  console.log('  NUEVO=' + NUEVO);
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
