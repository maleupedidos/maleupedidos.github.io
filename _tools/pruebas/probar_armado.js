/* ARMADO y RUTA: el nombre completo del producto, la cantidad con su unidad, y
   el boton para reprogramar un dia atrasado.

   node probar_armado.js <token> [390|1440]

   Los POST van interceptados por el PREP: la planilla no se toca.

   LA DIRECCION CONTRARIA va con `python reinyectar_armado.py bug` + build, NO
   con una bandera de este archivo. Lo intente asi y no probaba nada: `_cantTxt`
   y `PROD_UNI` viven en el IIFE de la sub-app, asi que asignarlos desde
   Runtime.evaluate crea OTRA variable en window y la de adentro sigue igual.
   Con el bug puesto en la fuente da 35 ok / 11 mal; con la bandera daba 11/5 y
   los tres chequeos del nombre pasaban en VERDE. */
'use strict';
const PRU = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(PRU + 'cdp.js');
const prep = require(PRU + 'sesion_prep.js');

const TOKEN = process.argv[2];
const ANCHO = parseInt(process.argv[3], 10) || 390;
const VIEJO = process.argv.indexOf('--viejo') >= 0;
const BASE = process.env.BASE || 'http://localhost:8080';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }

let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det ? '\n         ' + det : '')); }
}
const esperar = async (cli, expr, ms = 120000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evaluar(cli, expr)) return true; } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
};
const pausa = ms => new Promise(r => setTimeout(r, ms));

/* El interceptor de POST del PREP contesta {ok:true} pelado, y
   `_reprogAplicar` necesita `resultados` para mover los pedidos en la lista
   local. Un stub que contesta de menos hace fallar codigo que anda. */
const EXTRA = `
  window.__posts=[];
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    if(x && String(x.method||'').toUpperCase()==='POST'){
      var b={}; try{ b=JSON.parse(x.body); }catch(e){}
      window.__posts.push(b);
      var res={ok:true};
      if(b.action==='reprogramarEntrega'){
        res={ok:true, movidos:(b.pedidos||[]).length, fecha:b.fecha, fechaArg:'',
             resultados:(b.pedidos||[]).map(function(p){
               return {ok:true, hoja:p.hoja, id:p.id, cliente:'x', antes:'', ahora:''};})};
      }
      return Promise.resolve(new Response(JSON.stringify(res),
        {status:200, headers:{'Content-Type':'application/json'}}));
    }
    return o.apply(this,arguments);};})();
  window.__confirmDevuelve = true;
  window.__confirms=[];
  window.confirm=function(m){ window.__confirms.push(String(m)); return window.__confirmDevuelve; };
  window.__toasts=[];
  ${VIEJO ? `
  /* La direccion contraria: como estaba antes del 11/9/2026 -la cantidad con
     "x" siempre y el nombre cayendo a la abreviatura-. */
  window.__viejo=1;` : ''}
`;

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable');
  await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride',
    { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });

  console.log('\n=== ARMADO · ' + ANCHO + 'px' + (VIEJO ? '  [con el bug viejo]' : '') + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
  if (!await esperar(cli, 'typeof window.go==="function"')) { console.log('el ERP no arranco'); process.exit(1); }

  const login = await evaluar(cli, `(function(){var l=document.getElementById('loginScreen');
    return !!(l && getComputedStyle(l).display!=='none' && getComputedStyle(l).visibility!=='hidden');})()`);
  chk('el login NO quedo encima', !login);

  await evaluar(cli, 'go("ruta")');
  if (!await esperar(cli, 'typeof window.rutRender==="function"')) { console.log('Ruta no cargo'); process.exit(1); }

  if (VIEJO) {
    await evaluar(cli, `(function(){
      window._cantTxt=function(q,ab){ return (Number(q)||0)+'x'; };
      PROD_UNI={};
      ['CCo','CEn','CLo','CPi','CVa'].forEach(function(a){ delete PROD_NAMES[a]; });
      rutRender(); })()`);
    await pausa(400);
  }

  const pinto = await esperar(cli, `(function(){var a=document.getElementById('armadoView')||document.body;
    return /armado-day-header|armado-card|Todo armado/.test(a.innerHTML);})()`);
  chk('ARMADO pinta', pinto);
  if (!pinto) { console.log('sin datos no se puede medir'); cli.matar(); process.exit(1); }

  /* Los dias arrancan PLEGADOS en cada refresh (deliberado). Sin abrirlos se
     mide una pantalla vacia: la leccion del 4/9/2026. */
  await evaluar(cli, `[].forEach.call(document.querySelectorAll('.armado-day-header'),
    function(h){ var k=h.getAttribute('data-collapse-key'); if(k) toggleCollapse(k); })`);
  await pausa(600);

  const cards = await evaluar(cli, `[].map.call(document.querySelectorAll('.armado-card'),
    function(c){ return c.textContent.replace(/\\s+/g,' ').trim(); })`);
  chk('hay cards de armado (los dias se abrieron)', cards.length > 0, String(cards.length));
  if (!cards.length) { console.log('los dias no se abrieron: lo de abajo no mide nada'); cli.matar(); process.exit(1); }

  const todo = cards.join(' || ');

  // ══ 1. El nombre del producto ══
  console.log('\n--- 1. el nombre del producto (lo que pidio Tadeo) ---');
  chk('dice "Carne Colita de Cuadril"', /Carne Colita de Cuadril/.test(todo),
      todo.slice(0, 240));
  chk('dice "Carne Lomo"', /Carne Lomo/.test(todo), todo.slice(0, 240));
  chk('NO quedan abreviaturas sueltas de carne',
      !/\b(CCo|CLo|CEn|CPi|CVa)\b/.test(todo),
      (todo.match(/\b(CCo|CLo|CEn|CPi|CVa)\b/g) || []).join(', '));

  // ══ 2. La unidad ══
  console.log('\n--- 2. kilos, no "x" ---');
  chk('los kilos van con "kg"', /\d\s*kg\b/.test(todo), todo.slice(0, 240));
  chk('1,5 con COMA decimal, no 1.5', /1,5 kg/.test(todo) || !/1\.5/.test(todo),
      todo.slice(0, 240));
  chk('NO dice "1.5x" ni "3x CCo"', !/1\.5x/.test(todo) && !/\dx\s*(CCo|CLo)/.test(todo),
      todo.slice(0, 240));
  const uniOk = await evaluar(cli, `(function(){
    return {kgCLo:(typeof PROD_UNI!=='undefined'&&PROD_UNI.CLo)||'', kgPPM:(typeof PROD_UNI!=='undefined'&&PROD_UNI.PPM)||'',
            nCLo:(typeof PROD_NAMES!=='undefined'&&PROD_NAMES.CLo)||''};})()`);
  chk('el mapa del backend llego (CLo = kg)', uniOk.kgCLo === 'kg', JSON.stringify(uniOk));
  chk('y un producto por unidad sigue en u', uniOk.kgPPM === 'u', JSON.stringify(uniOk));
  chk('los nombres cortos de siempre NO se pisaron',
      await evaluar(cli, `PROD_NAMES.PPM === 'Pack Muzza x2'`),
      await evaluar(cli, 'PROD_NAMES.PPM'));
  // Los productos por unidad conservan la "x"
  chk('un producto por unidad sigue con "x"',
      await evaluar(cli, `_cantTxt(3,'PPM')==='3x'`),
      await evaluar(cli, `_cantTxt(3,'PPM')`));
  chk('y uno por kilo dice kg',
      await evaluar(cli, `_cantTxt(1.5,'CLo')==='1,5 kg'`),
      await evaluar(cli, `_cantTxt(1.5,'CLo')`));
  chk('un kilo redondo no dice ",0"',
      await evaluar(cli, `_cantTxt(3,'CLo')==='3 kg'`),
      await evaluar(cli, `_cantTxt(3,'CLo')`));
  chk('al gramo', await evaluar(cli, `_cantTxt(1.163,'CLo')==='1,163 kg'`),
      await evaluar(cli, `_cantTxt(1.163,'CLo')`));

  if (VIEJO) {
    console.log('\n(con el bug viejo el resto no aplica)');
    console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal');
    cli.matar(); process.exit(mal ? 0 : 1);   // con el bug puesto SE ESPERA que falle
  }

  // ══ 2b. El rediseño del 11/9/2026: nada pisado, y una sola cuenta ══
  console.log('\n--- 2b. nada se pisa y los tres numeros de hoy coinciden ---');
  const pisados = await evaluar(cli, `(function(){
    function R(e){return e.getBoundingClientRect();}
    var out=[], n=0;
    [].forEach.call(document.querySelectorAll('#armadoSummary, .armado-day-header, .armado-canal-header, .armado-oc-info'),function(z){
      if(!z.offsetParent) return;
      var hs=[].filter.call(z.querySelectorAll('*'),function(e){
        if(!e.offsetParent) return false;
        if(/^(BUTTON|INPUT)$/.test(e.tagName)) return true;
        return [].some.call(e.childNodes,function(x){return x.nodeType===3&&x.textContent.trim();});
      });
      for(var i=0;i<hs.length;i++)for(var j=i+1;j<hs.length;j++){
        if(hs[i].contains(hs[j])||hs[j].contains(hs[i])) continue;
        n++;
        var a=R(hs[i]), b=R(hs[j]);
        var x=Math.min(a.right,b.right)-Math.max(a.left,b.left), y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
        if(x>1&&y>1) out.push(hs[i].textContent.trim().slice(0,20)+' / '+hs[j].textContent.trim().slice(0,20));
      }
    });
    return {pares:n, pisados:out};})()`);
  chk('examino pares de verdad (' + pisados.pares + ')', pisados.pares > 10, String(pisados.pares));
  chk('NINGUN texto ni boton queda encima de otro', pisados.pisados.length === 0, pisados.pisados.join(' | '));
  const cuentas = await evaluar(cli, `(function(){
    var tile=document.querySelector('#armadoSummary .arm-res-t.hoy b');
    var tab=document.getElementById('tabArmadoCount');
    var h=document.querySelector('.armado-day-header[data-collapse-key="dia:'+getHoyISO()+'"] .day-count');
    var m=h ? h.textContent.match(/(\\d+)\\/(\\d+)/) : null;
    return { tile: tile ? tile.textContent.replace(/[^0-9]/g,'') : null,
             tab: tab ? tab.textContent.trim() : null,
             dia: m ? String((+m[2])-(+m[1])) : (h ? h.textContent : null),
             listo: !!(tile && /\\u2713/.test(tile.textContent)) };})()`);
  const hayHoy = cuentas.dia !== null;
  chk('el tile de hoy, la pestaña y el dia dicen lo mismo',
      !hayHoy || cuentas.listo || (cuentas.tile === cuentas.dia && (cuentas.tab || '0') === cuentas.tile),
      JSON.stringify(cuentas));
  const anim = await evaluar(cli, `[].map.call(document.querySelectorAll('.armado-day-header *'),function(e){return getComputedStyle(e).animationName;}).filter(function(a){return a&&a!=='none';})`);
  chk('ningun cartel titila (sin animacion infinita)', anim.length === 0, JSON.stringify(anim));

  // ══ 3. El boton de reprogramar ══
  console.log('\n--- 3. el boton de cambiar la fecha ---');
  /* Desde el 11/9/2026 el boton vive ADENTRO del dia, en el aviso rojo, y no en
     el encabezado: en 390px el encabezado no tenia lugar y el cartel "NO
     ENTREGADO" quedaba ENCIMA del boton (114x20 px pisados). */
  const btns = await evaluar(cli, `(function(){
    var out=[];
    [].forEach.call(document.querySelectorAll('.armado-day-header'),function(h){
      var k=h.getAttribute('data-collapse-key');
      var cont=document.querySelector('.armado-day-content[data-collapse-key="'+k+'"]');
      var b=cont && cont.querySelector('.armado-dia-aviso .day-btn-fecha');
      out.push({ atras:h.classList.contains('atrasado'),
        titulo:(h.querySelector('.day-title')||{}).textContent||'',
        btn: !!b, enHeader: !!h.querySelector('.day-btn-fecha'),
        alto: b ? Math.round(b.getBoundingClientRect().height) : 0 });
    });
    return out;})()`);
  const atrasados = btns.filter(b => b.atras);
  const alDia = btns.filter(b => !b.atras);
  chk('hay dias atrasados para probar', atrasados.length > 0, JSON.stringify(btns));
  chk('TODOS los atrasados tienen el boton', atrasados.every(b => b.btn),
      JSON.stringify(atrasados));
  chk('NINGUN dia al dia lo tiene', alDia.every(b => !b.btn), JSON.stringify(alDia));
  chk('el boton llega a 44px', atrasados.every(b => b.alto >= 44),
      JSON.stringify(atrasados.map(b => b.alto)));
  chk('y ya NO esta en el encabezado', btns.every(b => !b.enHeader), JSON.stringify(btns));

  // El boton NO puede colapsar el dia (stopPropagation)
  const dk = await evaluar(cli, `(function(){
    var h=document.querySelector('.armado-day-header.atrasado');
    return h ? h.getAttribute('data-collapse-key') : '';})()`);
  const abiertoAntes = await evaluar(cli, `(function(){
    var c=document.querySelector('.armado-day-content');
    return c ? !c.classList.contains('collapsed') : null;})()`);
  await evaluar(cli, `document.querySelector('.armado-day-content .armado-dia-aviso .day-btn-fecha').click()`);
  await pausa(500);
  const panel = await evaluar(cli, `(function(){
    var p=document.querySelector('.reprog');
    if(!p) return null;
    return { txt:p.textContent.replace(/\\s+/g,' ').trim(),
      dias:[].map.call(p.querySelectorAll('.reprog-dias button'),function(b){return b.textContent.trim();}),
      altos:[].map.call(p.querySelectorAll('button, input'),function(b){return Math.round(b.getBoundingClientRect().height);}),
      input: !!p.querySelector('#reprogOtra') };})()`);
  chk('el panel se abre', !!panel, 'no aparecio .reprog');
  if (panel) {
    chk('dice cuantos pedidos y de que dia', /Pasar \d+ pedido/.test(panel.txt), panel.txt.slice(0, 120));
    chk('ofrece Hoy', panel.dias.some(d => /Hoy/.test(d)), JSON.stringify(panel.dias));
    chk('ofrece Mañana', panel.dias.some(d => /Ma.ana/.test(d)), JSON.stringify(panel.dias));
    chk('ofrece un tercer dia', panel.dias.length === 3, JSON.stringify(panel.dias));
    chk('tiene el campo dd/mm/aaaa', panel.input);
    /* Contra el nombre REAL del cliente, sacado del DOM y no de `_reprogDe`
       -que vive en el IIFE de la sub-app y desde afuera no existe: la trampa ya
       anotada-. Y no contra un regex de "parece un nombre": el primero que
       escribi, /[A-Z][a-z]+ [A-Z]/, no matchea un apellido con particula
       ("Nombre de los Apellido") y el fallo era mio, no del panel. */
    const cliReal = await evaluar(cli, `(function(){
      var h=document.querySelector('.armado-day-header.atrasado');
      var c=h && h.nextElementSibling;
      /* La card del dia atrasado esta despues del panel, asi que se busca
         dentro del contenido de ese dia. */
      var cont=document.querySelector('.armado-day-content:not(.collapsed)');
      var n=cont && cont.querySelector('.armado-name');
      if(n){ var t=n.cloneNode(true);
        [].forEach.call(t.querySelectorAll('.armado-saldo'),function(x){x.remove();});
        return t.textContent.trim(); }
      return '';})()`);
    chk('nombra al cliente de ese dia (' + cliReal + ')',
        !!cliReal && panel.txt.indexOf(cliReal) >= 0,
        'cliente="' + cliReal + '"  panel: ' + panel.txt.slice(0, 160));
    chk('avisa que si ya se entrego NO hay que mover la fecha',
        /ya los entregaste/i.test(panel.txt), panel.txt.slice(-220));
    chk('dice por que importa la fecha', /mes cuenta la venta/i.test(panel.txt), panel.txt.slice(-220));
    chk('todos los controles llegan a 46px', panel.altos.every(a => a >= 46),
        JSON.stringify(panel.altos));
  }
  const abiertoDespues = await evaluar(cli, `(function(){
    var c=document.querySelector('.armado-day-content');
    return c ? !c.classList.contains('collapsed') : null;})()`);
  chk('el boton NO colapso el dia', abiertoAntes === abiertoDespues,
      abiertoAntes + ' -> ' + abiertoDespues);

  /* El plegado tenia un bug preexistente: `toggleCollapse` guardaba
     `!d[key]` con `d[key]` en undefined, o sea `true` (=plegado), mientras el
     DOM se abria. Estado y pantalla al reves, y el siguiente render plegaba el
     dia que acababas de abrir. */
  console.log('\n--- 3b. el plegado del dia no se despega de la pantalla ---');
  const plg = await evaluar(cli, `(function(){
    var k=document.querySelector('.armado-day-header').getAttribute('data-collapse-key');
    var el=function(){ return document.querySelector('.armado-day-header[data-collapse-key="'+k+'"]'); };
    var guardado=function(){ return !!getArmadoCollapse()[k]; };
    var out=[];
    for(var i=0;i<3;i++){
      toggleCollapse(k);
      out.push({dom: el().classList.contains('collapsed'), st: guardado()});
    }
    // Y que un render respete lo que se ve
    var domAntes=el().classList.contains('collapsed');
    rutRender();
    var domDespues=(el()||{classList:{contains:function(){return null;}}}).classList.contains('collapsed');
    return {pasos:out, sobrevive: domAntes===domDespues, domAntes:domAntes, domDespues:domDespues};
  })()`);
  chk('el estado guardado coincide con la pantalla en cada toque',
      plg.pasos.every(p => p.dom === p.st), JSON.stringify(plg.pasos));
  chk('y un repintado NO pliega el dia que abriste', plg.sobrevive === true,
      plg.domAntes + ' -> ' + plg.domDespues);
  // Dejarlo abierto para lo que sigue
  await evaluar(cli, `(function(){
    var h=document.querySelector('.armado-day-header');
    var k=h.getAttribute('data-collapse-key');
    if(h.classList.contains('collapsed')) toggleCollapse(k); })()`);
  await pausa(300);
  await evaluar(cli, `(function(){
    var b=document.querySelector('.armado-day-content .armado-dia-aviso .day-btn-fecha');
    if(b && !document.querySelector('.reprog')) b.click(); })()`);
  await pausa(500);

  // ══ 4. El payload ══
  console.log('\n--- 4. lo que manda ---');
  await evaluar(cli, 'window.__posts=[]');
  await evaluar(cli, `document.querySelector('.reprog-dias button').click()`);
  await pausa(900);
  const po = await evaluar(cli, '(window.__posts||[]).slice(-1)[0]||null');
  chk('sale el POST', !!po && po.action === 'reprogramarEntrega', JSON.stringify(po));
  if (po) {
    chk('la fecha va en aaaa-mm-dd', /^\d{4}-\d{2}-\d{2}$/.test(po.fecha || ''), String(po.fecha));
    chk('y es HOY', po.fecha === new Date().toISOString().slice(0, 10)
        || po.fecha === (() => { const h = new Date(); const m = h.getMonth() + 1, d = h.getDate();
          return h.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; })(),
        String(po.fecha));
    chk('manda los pedidos en UNA lista', Array.isArray(po.pedidos) && po.pedidos.length > 0,
        JSON.stringify(po.pedidos));
    chk('cada uno con hoja, id y fila',
        (po.pedidos || []).every(p => p.hoja && p.id && p.row),
        JSON.stringify(po.pedidos));
  }
  const conf = await evaluar(cli, '(window.__confirms||[]).slice(-1)[0]||""');
  chk('pregunta antes, nombrando los pedidos', /#/.test(conf), conf.slice(0, 200));
  chk('y avisa de marcar la entrega en vez de mover', /entrego/i.test(conf), conf.slice(-160));

  // El dia se cierra y los pedidos se mueven (optimista)
  await pausa(400);
  const cerro = await evaluar(cli, `!document.querySelector('.reprog')`);
  chk('el panel se cierra al aplicar', cerro);

  // ══ 5. El campo de fecha a mano ══
  console.log('\n--- 5. el campo dd/mm/aaaa ---');
  await evaluar(cli, `(function(){
    /* El boton vive adentro del dia: si el dia esta plegado, se abre primero. */
    var hd=document.querySelector('.armado-day-header.atrasado');
    if(!hd) return;
    var k=hd.getAttribute('data-collapse-key');
    if(hd.classList.contains('collapsed')) toggleCollapse(k);
    var c=document.querySelector('.armado-day-content[data-collapse-key="'+k+'"]');
    var h=c && c.querySelector('.armado-dia-aviso .day-btn-fecha');
    if(h)h.click();})()`);
  await pausa(500);
  const hayPanel2 = await evaluar(cli, `!!document.querySelector('#reprogOtra')`);
  if (hayPanel2) {
    await evaluar(cli, 'window.__posts=[]');
    await evaluar(cli, `(function(){ document.getElementById('reprogOtra').value='hola';
      document.querySelector('.reprog-otra button').click(); })()`);
    await pausa(400);
    chk('un texto que no es fecha no manda nada',
        (await evaluar(cli, '(window.__posts||[]).length')) === 0);
    await evaluar(cli, `(function(){ document.getElementById('reprogOtra').value='31/02/2026';
      document.querySelector('.reprog-otra button').click(); })()`);
    await pausa(400);
    chk('el 31 de febrero se rechaza (no se corre al 3 de marzo)',
        (await evaluar(cli, '(window.__posts||[]).length')) === 0);
    await evaluar(cli, `(function(){ document.getElementById('reprogOtra').value='15/09/2026';
      document.querySelector('.reprog-otra button').click(); })()`);
    await pausa(800);
    const po2 = await evaluar(cli, '(window.__posts||[]).slice(-1)[0]||null');
    chk('una fecha valida manda 2026-09-15', po2 && po2.fecha === '2026-09-15',
        JSON.stringify(po2 && po2.fecha));
  } else {
    chk('el panel se puede reabrir', false, 'no reabrio');
  }

  // ══ 6. La pantalla ══
  console.log('\n--- 6. la pantalla ---');
  const desb = await evaluar(cli,
    `({docW:document.documentElement.scrollWidth, winW:window.innerWidth})`);
  chk('no desborda a lo ancho', desb.docW <= desb.winW + 1, JSON.stringify(desb));
  const errs = await evaluar(cli, '(window.__err||[]).slice(0,6)');
  chk('0 errores de consola', errs.length === 0, JSON.stringify(errs));

  console.log('\n' + (mal ? 'ROJO' : 'VERDE') + ': ' + ok + ' ok · ' + mal + ' mal   (' + ANCHO + 'px)');
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error('EXPLOTO: ' + e.message); process.exit(2); });
