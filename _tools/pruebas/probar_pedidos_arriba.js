/* La parte de arriba de la tab Pedidos (8/10/2026): orden de la pantalla, cajas
   en una linea, decisiones que responden en el toque, «Falta pedir» neutro y la
   lista que pinta solo lo que se ve.

   node probar_pedidos_arriba.js <token> [390|1440]        BASE=http://localhost:8131

   Sesion real para los pedidos (la lista de verdad, ~1.400). `redBandeja` va
   con datos INVENTADOS (este repo es publico, y no se puede forzar en
   produccion que haya algo esperando) y los POST van interceptados: contestan a
   los 2,5 s lo que diga `window.__postOk`. No escribe nada. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); }
  return false;
};
const AHORA = Date.now();
const VACIO = { ok: true, horas: 2, pendientes: [], vendedores: [{ nombre: 'Vendedor Uno', dias: ['Viernes'], tg: true }, { nombre: 'Vendedor Dos', dias: ['Sábado'], tg: false, link: 'x' }],
  recientes: [], decidir: [], reps: ['Repartidor Prueba'], tareas: null, provs: { PMu: 'Proveedor A', PPM: 'Proveedor A', ECaC: 'Proveedor B' },
  decididos: [
    { h: 'Home', n: '9001', row: 9001, c: 'Prueba Decidida', de: 'vie 9/10', por: 'tadeo', el: '08/10/2026 10:00', t: AHORA - 3600000, puede: true },
    { h: 'Home', n: '-', row: 9002, c: 'Prueba Cancelada', de: 'dom 11/10', por: 'tadeo', el: '08/10/2026 09:00', t: AHORA - 7200000, puede: false }] };
const CON = JSON.parse(JSON.stringify(VACIO));
CON.decidir = [{ h: 'Home', n: '9010', row: 9010, al: 'x', c: 'Prueba Por Decidir', b: 'Barrio', l: '1', de: 'vie 9/10', dia: 'Viernes', hor: '', prods: ['2 Pizza'], tot: 20000, env: 0, pago: 'Transferencia', cobrado: false, desde: AHORA - 600000, vs: [{ v: 'Vendedor Uno', ok: true, bloq: false, mot: '', tg: true }], sug: '', zona: '', cup: '', sale: AHORA + 3600000 }];
CON.pendientes = [{ n: '9020', row: 9020, c: 'Prueba Bandeja', tot: 15000, pago: 'Efectivo', b: 'Barrio', l: '2', de: 'vie 9/10', hor: '', desde: AHORA - 300000, sale: AHORA + 3600000, v: 'Vendedor Uno' }];
const EXTRA = `
  window.__posts=[]; window.__postOk=true; window.__rbFix=${JSON.stringify(VACIO)}; window.confirm=function(){return true;};
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(x && String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      return new Promise(function(res){ setTimeout(function(){
        var r=window.__postOk?{ok:true,vendedor:'Vendedor Uno',avisoOk:true,red:{n:'1'}}:{ok:false,err:'fallo de prueba'};
        res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); },2500); });
    }
    if(url.indexOf('action=redBandeja')>=0)
      return Promise.resolve(new Response(JSON.stringify(window.__rbFix),{status:200,headers:{'Content-Type':'application/json'}}));
    return o.apply(this,arguments);};})();
`;
const CAJAS = `(function(){
  var rb=document.getElementById('rbBox'), ds=[].slice.call(rb.children);
  return ds.map(function(d){return {t:(d.querySelector('summary span')||{}).textContent,n:(d.querySelector('.rb-n')||{}).textContent,
    abierta:!!d.open,alto:Math.round(d.getBoundingClientRect().height)};});})()`;
const TXT = `document.getElementById('rbBox').textContent`;

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    if (!await esperar(cli, `typeof D!=='undefined'&&D&&Array.isArray(D.pedidos)&&D.pedidos.length>0`)) throw new Error('no cargo');
    chk('el login no quedo tapando', await evaluar(cli, `(function(){var l=document.getElementById('loginScreen');return !l||getComputedStyle(l).display==='none';})()`));
    /* El cajon lateral ABIERTO, que es como lo usa Tadeo en la compu. */
    const cajon = await evaluar(cli, `(function(){
      var b=document.body, antes=document.getElementById('p-pedidos');
      var btn=document.querySelector('.hdr-burger,#hdrBurger,[onclick*="toggleDrawer"],[onclick*="drawerToggle"]');
      var ancho=function(){var m=document.querySelector('.drawer,#drawer,.sidebar,#sidebar,nav.side');return m?Math.round(m.getBoundingClientRect().width):-1;};
      var a0=ancho(); if(a0>=0&&a0<150&&btn)btn.click();
      return {antes:a0,despues:ancho()};})()`);
    if (ANCHO >= 1000) {
      await evaluar(cli, `document.body.classList.add('sb-open')`);
      await pausa(700);
      const sb = await evaluar(cli, `(function(){var n=document.querySelector('.snav');return n?Math.round(n.getBoundingClientRect().width):-1;})()`);
      chk('la compu se prueba con el cajon lateral ABIERTO (' + sb + 'px)', sb > 150, sb);
    }
    if (process.env.SHOT) setTimeout(async () => { try { const sh = await cli.enviar('Page.captureScreenshot', { format: 'png' }); require('fs').writeFileSync(process.env.SHOT, Buffer.from(sh.data, 'base64')); } catch (e) {} }, 9000);
    await evaluar(cli, `go('pedidos')`);
    await esperar(cli, `document.querySelectorAll('#pList .pc').length>0&&document.querySelectorAll('#rbBox details.rb-plg').length===2`, 60000);
    await pausa(600);

    console.log('\n== el orden de la pantalla ==');
    const pos = await evaluar(cli, `(function(){
      var pg=document.getElementById('p-pedidos').getBoundingClientRect();
      var y=function(id){var e=document.getElementById(id);return e?Math.round(e.getBoundingClientRect().top-pg.top):null;};
      var c=document.querySelector('#pList .pc');
      return {btn:y('btnReloadPed'),filtros:y('fRow'),cajas:y('rbBox'),falta:y('fpBox'),lista:y('pList'),primer:c?Math.round(c.getBoundingClientRect().top-pg.top):null,
        doc:document.documentElement.scrollWidth,win:window.innerWidth};})()`);
    console.log('   ' + JSON.stringify(pos));
    chk('los filtros van arriba de las cajas, y las cajas arriba de la lista', pos.filtros < pos.cajas && pos.cajas <= pos.falta && pos.falta <= pos.lista, pos);
    chk('sin nada esperando, el primer pedido queda a menos de 230px (antes 408 en el celular, 337 en la compu)', pos.primer !== null && pos.primer < 230, pos.primer);
    chk('sin desborde horizontal a ' + ANCHO, pos.doc <= pos.win + 1, pos);
    let cajas = await evaluar(cli, CAJAS);
    chk('«Por decidir» y «Bandeja de Red»: una linea cada una, cerradas, cuando no hay nada', cajas.length === 2 && cajas.every(c => !c.abierta && c.alto <= 50) && /Por decidir/.test(cajas[0].t) && /Bandeja de Red/.test(cajas[1].t), cajas);
    chk('la linea dice que no hay nada esperando y cuantos se pueden deshacer', /nada esperando/.test(cajas[0].n) && /1 recién decidido/.test(cajas[0].n), cajas[0]);
    chk('un pedido cancelado (numero "-") no aparece en Recién decididos', !/Prueba Cancelada/.test(await evaluar(cli, TXT)) && !/#-/.test(await evaluar(cli, TXT)));

    console.log('\n== se abren solas cuando hay algo ==');
    await evaluar(cli, `window.__rbFix=${JSON.stringify(CON)};rbPedir()`);
    await esperar(cli, `/Prueba Por Decidir/.test(${TXT})`, 8000);
    cajas = await evaluar(cli, CAJAS);
    chk('con un pedido por decidir y uno en la bandeja, las dos se abren', cajas.length === 2 && cajas.every(c => c.abierta && c.alto > 100), cajas);
    await evaluar(cli, `document.querySelectorAll('#rbBox details.rb-det summary')[0].click()`);
    await pausa(150);
    await evaluar(cli, `rbPedir()`);
    await pausa(600);
    chk('lo que abriste a mano (Recién decididos) sigue abierto despues de un refresco', await evaluar(cli, `document.querySelectorAll('#rbBox details.rb-det')[0].open`));

    console.log('\n== «Nosotros»: responde en el toque, confirma despues ==');
    await evaluar(cli, `window.__posts=[];window.__postOk=true;document.querySelector('#rbBox .pd-nos').click()`);
    let t0 = Date.now();
    await evaluar(cli, `document.querySelector('#rbBox .pd-reps button.sin').click()`);
    let r = await evaluar(cli, `({sug:document.querySelectorAll('#rbBox .pd-sug').length,txt:${TXT},posts:window.__posts.length,loader:(function(){var l=document.getElementById('loaderOverlay');return !!l&&getComputedStyle(l).display!=='none'&&l.classList.contains('show');})()})`);
    chk('el pedido sale de Por decidir en el toque (' + (Date.now() - t0) + ' ms, el servidor tarda 2.500)', r.sug === 0 && r.posts === 1 && Date.now() - t0 < 1500, r.txt.slice(0, 200));
    chk('pasa a Recién decididos como "guardando…" y sin Deshacer todavia', /Prueba Por Decidir/.test(r.txt) && /guardando…/.test(r.txt) && await evaluar(cli, `document.querySelectorAll('#rbBox .pd-mini[onclick*="9010"]').length`) === 0, r.txt.slice(0, 300));
    chk('la pantalla no queda tapada por un cartel de carga', !r.loader);
    /* Con la op en vuelo llega la copia vieja (que todavia lo tiene por decidir). */
    await evaluar(cli, `rbPintar(${JSON.stringify(CON)},{viejo:true,hace:'hace 1 min'})`);
    chk('una copia vieja que llega en el medio NO lo devuelve a Por decidir', await evaluar(cli, `document.querySelectorAll('#rbBox .pd-sug').length`) === 0);
    await pausa(2800);
    chk('cuando el servidor confirma, aparece el Deshacer', await evaluar(cli, `document.querySelectorAll('#rbBox .pd-mini[onclick*="9010"]').length`) === 1, await evaluar(cli, TXT));

    console.log('\n== si el servidor dice que no, vuelve y lo dice ==');
    await evaluar(cli, `_rbOps=[];window.__rbFix=${JSON.stringify(CON)};window.__postOk=false;rbPintar(${JSON.stringify(CON)},{});document.querySelector('#rbBox .pd-nos').click();document.querySelector('#rbBox .pd-reps button.sin').click()`);
    chk('sale en el toque', await evaluar(cli, `document.querySelectorAll('#rbBox .pd-sug').length`) === 0);
    await pausa(2400);
    await esperar(cli, `document.querySelectorAll('#rbBox .pd-sug').length===1`, 6000);
    r = await evaluar(cli, `({sug:document.querySelectorAll('#rbBox .pd-sug').length,txt:${TXT},err:(document.getElementById('pde-Home-9010')||{}).textContent||'',toast:document.getElementById('toast').textContent})`);
    chk('a los 2,5 s vuelve a Por decidir, con el motivo en la fila y en el aviso', r.sug === 1 && /fallo de prueba/.test(r.err) && /fallo de prueba/.test(r.toast), r);

    console.log('\n== «Deshacer» y «Confirmar» ==');
    await evaluar(cli, `_rbOps=[];window.__postOk=true;window.__posts=[];rbPintar(${JSON.stringify(CON)},{});document.querySelector('#rbBox .pd-mini[onclick*="9001"]').click()`);
    r = await evaluar(cli, `({des:document.querySelectorAll('#rbBox .pd-mini[onclick*="9001"]').length,txt:${TXT},posts:window.__posts.map(function(b){return b.action+':'+b.decision;})})`);
    chk('Deshacer: sale de Recién decididos y aparece "Volviendo a Por decidir…" en el toque', r.des === 0 && /Volviendo a Por decidir/.test(r.txt) && r.posts[0] === 'pedidoDecidir:volver', r);
    await evaluar(cli, `window.__posts=[];document.querySelector('#rbBox .rb-ok').click()`);
    r = await evaluar(cli, `({filas:document.querySelectorAll('#rbBox .rb-ok').length,posts:window.__posts.map(function(b){return b.action;})})`);
    chk('Confirmar de la Bandeja: la fila sale en el toque y el POST viaja', r.filas === 0 && r.posts[0] === 'redConfirmar', r);
    await pausa(2800);

    console.log('\n== «Falta pedir» ==');
    await evaluar(cli, `(function(){
      window._fpLista=[{h:'Home',n:'9101',c:'Prueba Uno',o:'Orden de Compra',p:[{a:'PMu',q:2},{a:'ECaC',q:1}]},
                       {h:'Pilar',n:'9102',c:'Prueba Dos',o:'Mixto',oDet:JSON.stringify({PPM:'OC',ECaC:'D'}),p:[{a:'PPM',q:1},{a:'ECaC',q:3}]}];
      fpPintar(); return 1;})()`);
    r = await evaluar(cli, `(function(){
      var b=document.getElementById('fpBox'), d=b.querySelector('details'), s=b.querySelector('summary'), cs=getComputedStyle(d), ss=getComputedStyle(s);
      return {txt:s.textContent.trim(),abierta:d.open,alto:Math.round(d.getBoundingClientRect().height),fondo:cs.backgroundColor,borde:cs.borderTopColor,color:ss.color,
        rojo:getComputedStyle(document.documentElement).getPropertyValue('--r').trim(),todo:b.textContent};})()`);
    chk('una linea neutra: «Falta pedir: 2 pedidos · 2 proveedores»', /Falta pedir: 2 pedidos · 2 proveedores/.test(r.txt) && !r.abierta && r.alto <= 50, r);
    chk('no es una alerta: ni fondo rojo, ni la palabra "sin OC generada", ni el signo de advertencia', r.fondo === 'rgb(255, 255, 255)' && !/sin OC generada|⚠/.test(r.todo), r);
    await evaluar(cli, `document.querySelector('#fpBox summary').click()`);
    await pausa(150);
    r = await evaluar(cli, `(function(){var b=document.getElementById('fpBox');
      return {provs:[].slice.call(b.querySelectorAll('.fp-prov')).map(function(e){return e.textContent.trim();}),
        peds:[].slice.call(b.querySelectorAll('.fp-ped')).map(function(e){return e.textContent.trim();}),
        ir:(b.querySelector('.fp-ir')||{}).textContent,altoMin:Math.min.apply(null,[].slice.call(b.querySelectorAll('button')).map(function(e){return Math.round(e.getBoundingClientRect().height);}))};})()`);
    chk('se despliega agrupada por proveedor', r.provs.length === 2 && /Proveedor A\s*2 pedidos/.test(r.provs[0]) && /Proveedor B\s*1 pedido/.test(r.provs[1]), r.provs);
    chk('el Mixto lista solo lo que va por OC (la empanada del deposito no)', r.peds.some(x => /Pilar #9102/.test(x) && /Pack/.test(x) && !/Empanada/i.test(x)) || r.peds.some(x => /Pilar #9102/.test(x) && !/3x/.test(x)), r.peds);
    chk('lleva a Abastecimiento, con botones de 44px', /Abastecimiento/.test(r.ir || '') && r.altoMin >= 44, r);
    await evaluar(cli, `(function(){window._fpLista=[];fpPintar();return 1;})()`);
    chk('sin nada que pedir, la linea no existe', await evaluar(cli, `document.getElementById('fpBox').innerHTML`) === '');

    console.log('\n== la lista pinta solo lo que se ve ==');
    await evaluar(cli, `(function(){fC='Todos';fE='Todos';rPedidos();return 1;})()`);
    await pausa(700);
    r = await evaluar(cli, `(function(){
      var tot=D.pedidos.filter(function(p){return !p.hist&&p.c&&p.c.trim()&&p.$;}).length;
      return {tot:tot,enDom:document.querySelectorAll('#pList .pc').length,mas:(document.querySelector('#pList .pc-mas button')||{}).textContent||''};})()`);
    console.log('   ' + JSON.stringify(r));
    chk('de ' + r.tot + ' pedidos se dibujan ' + r.enDom + ' al entrar (antes: todos)', r.tot > 200 && r.enDom >= 40 && r.enDom <= 160, r);
    chk('queda un «Ver más pedidos (N)» con lo que falta', /Ver más pedidos \(\d+\)/.test(r.mas), r.mas);
    const antes = r.enDom;
    await evaluar(cli, `document.querySelector('#pList .pc-mas').scrollIntoView()`);
    await pausa(900);
    const desp = await evaluar(cli, `document.querySelectorAll('#pList .pc').length`);
    chk('al llegar al final se dibujan mas solas (' + antes + ' → ' + desp + ')', desp > antes, [antes, desp]);
    r = await evaluar(cli, `(function(){
      var fl=D.pedidos.filter(function(p){return !p.hist&&p.c&&p.c.trim()&&p.$;}), viejo=null;
      for(var i=0;i<fl.length;i++){var k=_pcKey(fl[i]); if(k&&!document.querySelector('.pc[data-pc-key="'+k+'"]')){viejo=k;}}
      if(!viejo)return {viejo:null};
      var okH=_rpHasta.pList(viejo);
      return {viejo:viejo,ok:okH,esta:!!document.querySelector('.pc[data-pc-key="'+viejo+'"]')};})()`);
    chk('saltar a un pedido que no estaba dibujado lo dibuja (' + r.viejo + ')', !!r.viejo && r.ok && r.esta, r);
    const tf = await evaluar(cli, `(function(){var t0=performance.now();document.querySelectorAll('#fRow .pill')[2].click();var js=performance.now()-t0;
      return {js:Math.round(js),enDom:document.querySelectorAll('#pList .pc').length};})()`);
    chk('un filtro dibuja ' + tf.enDom + ' tarjetas en ' + tf.js + ' ms y no sigue trabajando despues', tf.enDom <= 40 && tf.js < 400, tf);
    const errs = await evaluar(cli, `window.__err`);
    chk('sin errores de consola', errs.length === 0, errs);
  } catch (e) { mal++; console.log('  MAL  revento: ' + e.message); }
  cli.matar();
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal  (' + ANCHO + 'px)\n');
  process.exit(mal ? 1 : 0);
})();
