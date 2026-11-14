/* CUÁNTA PALABRA HAY EN CADA PANTALLA (14/11/2026, auditoría de sobreinformación).

   node _tools/pruebas/texto.js [base=http://localhost:8080] [salida.json]
   SBSES=<sesión de prueba (estancias/scripts/migraciones/sesion_prueba.py)>  SOLO=resultados,inicio  (opcional)

   Recorre cada tab y cada sub-tab (los mismos botones de navegación que recorrer_subtabs.js) a 390 px, con la sesión de
   la base y la guarda de solo lectura (sbses_guarda.js: ninguna escritura sale). En cada pantalla cuenta las PALABRAS
   que no son números, montos, nombres propios ni etiquetas de botón:
     · se saltea lo que está adentro de un botón, link, select, summary, tab, chip o segmentado (si dice ≤ 5 palabras),
       y las celdas de una tabla (son datos);
     · un token con un dígito o un $ no cuenta (número, monto, fecha, %);
     · una palabra con Mayúscula inicial que NO arranca una oración es un nombre propio (cliente, producto, barrio);
     · de una LISTA (3 o más filas hermanas con la misma clase) cuenta solo la primera fila: las demás son datos cargados.
   (14/11, segunda vuelta) También cuenta los CONTROLES visibles (botones, desplegables, campos, chips, todo lo que se toca;
   de una lista, los de la primera fila) y lista los NÚMEROS CORTADOS (un monto que no entra en su caja).
   Saca el total y las «frases» (textos sueltos de 3 o más palabras contadas), que son lo que hay que mirar.
   No hace falta que la cuenta sea perfecta: hace falta que sea la MISMA antes y después. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8080';
const OUT = process.argv[3] || '';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const NAV = 'estSwitch|ajGo|switchTab|stSwitchTab|vSwitchTab|abaSwitchTab|setMainTab|stVista|segSwitchVista|setPlataSub|mrShowSub|estRecSub|estCliVista|redVista|mpGo|resVer|pickEgresos';

const CONTAR = `(function(){
  var pg=document.querySelector('.pg.on'); if(!pg)return {n:0,frases:[],carg:true};
  var BOT=/^(BUTTON|SELECT|OPTION|SUMMARY|A|INPUT|TEXTAREA|TD|TH)$/;
  function boton(e){
    for(var x=e;x&&x!==pg;x=x.parentElement){
      if(x.tagName==='TD'||x.tagName==='TH')return true;
      var corto=((x.innerText||'').trim().split(/\\s+/).length<=5);
      if(BOT.test(x.tagName)&&corto)return true;
      if(corto&&(x.getAttribute('role')==='button'||x.getAttribute('role')==='tab'||/(^|[ -])(tab|chip|pill|seg|btn|k-nuevo)([ -]|$)/.test(String(x.className))))return true;
    }
    return false;
  }
  function visible(e){
    /* lo de adentro de un desplegable cerrado no se ve (la ⓘ que se abre no cuenta) */
    var dt=e.closest&&e.closest('details:not([open])'); if(dt&&!(e.closest('summary')&&e.closest('summary').parentElement===dt))return false;
    for(var x=e;x&&x!==document.body;x=x.parentElement){var cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05)return false;}
    var r=e.getBoundingClientRect();return r.width>0&&r.height>0;
  }
  /* Una LISTA (filas hermanas con la misma clase, 3 o más) cuenta una sola fila: lo de las demás es dato cargado
     (conceptos, clientes, productos), no texto de la pantalla. La primera fila sí cuenta: ahí se ve el molde. */
  function filaRepetida(e){
    for(var x=e;x&&x!==pg;x=x.parentElement){
      var p=x.parentElement; if(!p||typeof x.className!=='string'||(!x.className&&x.tagName!=='TR'&&x.tagName!=='LI'))continue;
      /* misma etiqueta y misma PRIMERA clase: «stc-it» y «stc-it ok» son filas de la misma lista */
      var c0=function(e){return String(e.className||'').split(' ')[0];}, k0=c0(x), igual=0,ant=0,hs=p.children;
      for(var i=0;i<hs.length;i++){ if(hs[i].tagName===x.tagName&&c0(hs[i])===k0){ igual++; if(hs[i]===x)ant=igual-1; } }
      if(igual>=3&&ant>0)return true;
    }
    return false;
  }
  var n=0,frases=[],w=document.createTreeWalker(pg,NodeFilter.SHOW_TEXT,null),t;
  while((t=w.nextNode())){
    var s=String(t.nodeValue||'').replace(/\\s+/g,' ').trim(); if(!s)continue;
    var el=t.parentElement; if(!el||!visible(el)||boton(el)||filaRepetida(el))continue;
    var toks=s.split(' '),c=0,ini=true;
    for(var i=0;i<toks.length;i++){
      var k=toks[i], lim=k.replace(/^[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]+|[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]+$/g,'');
      var fin=/[.:!?·•|\\-–—]$/.test(k)||/^[·•|\\-–—]$/.test(k);
      if(!lim||/[0-9$%]/.test(k)){ini=ini||fin;continue;}
      var nombre=!ini&&/^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]/.test(lim);
      if(!nombre)c++;
      ini=fin;
    }
    n+=c; if(c>=3)frases.push(s.slice(0,140));
  }
  /* (14/11/2026, segunda vuelta) CONTROLES: botones, desplegables, campos, chips y todo lo que se toca, visibles.
     Un control adentro de otro cuenta una vez; de una lista, solo los de la primera fila. */
  var SELC='button,select,input:not([type=hidden]),textarea,summary,a[href],a[onclick],[role=button],[role=tab],[onclick]';
  var ctrl=0,ctrlL=[];
  [].slice.call(pg.querySelectorAll(SELC)).forEach(function(e){
    /* Una LISTA cuenta una fila: los controles adentro de filas repetidas, y las filas que son ellas mismas el control
       (más de 25 caracteres: un pedido, un día, un cliente). Los botones hermanos CORTOS (pestañas, chips, opciones)
       cuentan todos: cada uno es una opción a la vista. */
    var repe=(e.parentElement&&filaRepetida(e.parentElement))||((e.innerText||'').trim().length>25&&filaRepetida(e));
    if(!visible(e)||repe)return;
    var p=e.parentElement&&e.parentElement.closest(SELC); if(p&&pg.contains(p)&&p!==pg)return;
    ctrl++; ctrlL.push((e.innerText||e.value||e.getAttribute('aria-label')||e.tagName).trim().replace(/\\s+/g,' ').slice(0,24));
  });
  /* NÚMEROS CORTADOS: un monto o un número que no entra en su caja (scrollWidth > clientWidth) */
  var cortados=[];
  [].slice.call(pg.querySelectorAll('*')).forEach(function(e){
    if(e.children.length>2||!visible(e))return;
    var t=(e.innerText||'').trim(); if(!t||t.length>24||!/[0-9]/.test(t))return;
    var cs=getComputedStyle(e);
    if(e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&cs.overflow!=='visible'&&cs.overflowX!=='visible')cortados.push(String(e.className||e.tagName).split(' ')[0].slice(0,20)+' «'+t+'»');
    else{var r=e.getBoundingClientRect(),pr=e.parentElement&&e.parentElement.getBoundingClientRect();
      if(pr&&cs.whiteSpace==='nowrap'&&r.right>pr.right+1&&getComputedStyle(e.parentElement).overflow!=='visible')cortados.push(String(e.className||e.tagName).split(' ')[0].slice(0,20)+' «'+t+'» (sale)');}
  });
  var txt=(pg.innerText||'').slice(0,500);
  return {n:n,ctrl:ctrl,ctrlL:ctrlL.slice(0,80),cortados:cortados.slice(0,20),frases:frases.slice(0,60),carg:/Cargando|Trayendo/.test(txt)&&txt.length<300};
})()`;

(async () => {
  if (!process.env.SBSES) { console.log('Falta SBSES (la sesión de prueba)'); process.exit(1); }
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  const res = [];
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, 'tadeo')
      + ';window.confirm=function(){return false;};window.alert=function(){};window.prompt=function(){return null;};' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 150; i++) { try { if (await ev(`typeof go==='function'&&typeof SESSION!=='undefined'&&!!SESSION`)) break; } catch (e) {} await pausa(200); }
    await pausa(5000);
    const ORDEN = ['resultados', 'inicio', 'caja', 'egresos', 'busqueda', 'stock', 'pedidos', 'ventas', 'estancias', 'proveedores', 'ajustes', 'miportal', 'mireparto', 'ruta', 'catering', 'planificacion'];
    const tabs = ORDEN.filter(t => !process.env.SOLO || process.env.SOLO.split(',').indexOf(t) >= 0);
    const medir = async () => { let m = null; for (let i = 0; i < 40; i++) { m = await ev(CONTAR); if (!m.carg) break; await pausa(500); } return m; };
    for (const t of tabs) {
      try { await ev(`go(${JSON.stringify(t)}); 1`); } catch (e) { continue; }
      await pausa(6000);
      const navs = await ev(`(function(){var re=/^\\s*(${NAV})\\(/; var pg=document.querySelector('.pg.on'); if(!pg)return [];
        var vis=function(e){return !!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);}; var vistos={}, l=[];
        Array.from(pg.querySelectorAll('[onclick]')).forEach(function(e){ var oc=e.getAttribute('onclick')||''; if(re.test(oc)&&vis(e)&&!vistos[oc]){vistos[oc]=1;l.push([oc,(e.innerText||'').trim().slice(0,24)]);} });
        return l;})()`);
      if (!navs.length) { const m = await medir(); res.push({ donde: t, ...m }); continue; }
      for (const [oc, lab] of navs.slice(0, 14)) {
        const ok = await ev(`(function(){var e=Array.from(document.querySelectorAll('.pg.on [onclick]')).find(function(x){return x.getAttribute('onclick')===${JSON.stringify(oc)};}); if(!e)return false; e.click(); window.scrollTo(0,0); return true;})()`);
        if (!ok) continue;
        await pausa(3500);
        const m = await medir();
        res.push({ donde: t + ' › ' + (lab || oc.slice(0, 30)).replace(/\s+/g, ' '), ...m });
      }
    }
    const bloq = await ev('window.__bloqueados||[]');
    console.log('pantalla'.padEnd(46) + 'palabras  controles');
    res.forEach(r => console.log('  ' + r.donde.padEnd(44) + String(r.n).padStart(6) + String(r.ctrl || 0).padStart(11) + (r.carg ? '  (sin cargar)' : '')));
    console.log('  ' + 'TOTAL'.padEnd(44) + String(res.reduce((a, r) => a + (r.n || 0), 0)).padStart(6) + String(res.reduce((a, r) => a + (r.ctrl || 0), 0)).padStart(11));
    const cort = res.filter(r => r.cortados && r.cortados.length);
    if (cort.length) { console.log('números cortados:'); cort.forEach(r => console.log('  ' + r.donde + ': ' + r.cortados.join(' · '))); }
    console.log('escrituras cortadas: ' + bloq.length);
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  } finally { cli.matar(); }
})();
