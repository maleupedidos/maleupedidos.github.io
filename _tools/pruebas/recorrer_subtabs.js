/* Recorre cada tab Y CADA SUB-TAB del ERP como el robot, y junta lo que se rompe (7/11/2026).

   node _tools/pruebas/recorrer_subtabs.js [ancho=390] [base=http://localhost:8173] [app=app.html]

   `recorrer_todo.js` mira solo la tab principal. Esto además toca los botones de NAVEGACIÓN de cada tab
   (una lista blanca de funciones: switchTab, stSwitchTab, vSwitchTab, mpGo…), nunca una acción.
   Por las dudas: todo POST que no sea una lectura sale bloqueado (también los de Apps Script) y
   confirm/alert/prompt contestan «no». Por sub-tab: excepciones, console.error, js-error del medidor,
   si quedó «Cargando», cuántos elementos pintó y si la pantalla desborda a lo ancho. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = Number(process.argv[2] || 390);
const BASE = process.argv[3] || 'http://localhost:8173';
const APP = process.argv[4] || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const NAV = 'estSwitch|ajGo|setCrmProdPeriodo|switchTab|stSwitchTab|vSwitchTab|abaSwitchTab|setMainTab|stVista|setRutaFiltro|segSwitchVista|goSubInicio|setPlataSub|mrShowSub|estRecSub|estCliVista|eerrSetModo|setCobrosFiltro|showViernesTab|redVista|mpGo|toggleRutaListaModo|cobModoElegir';

(async () => {
  const cli = await abrir();
  const errores = [];
  let donde = '(arranque)';
  cli.escuchar((met, p) => {
    if (met === 'Runtime.exceptionThrown') { const d = (p || {}).exceptionDetails || {}; errores.push({ donde, tipo: 'excepcion', msg: ((d.exception || {}).description || d.text || '').split('\n').slice(0, 2).join(' | ').slice(0, 240) }); }
    if (met === 'Runtime.consoleAPICalled' && p.type === 'error') errores.push({ donde, tipo: 'console.error', msg: (p.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 240) });
  });
  const ev = e => evaluar(cli, e);
  const medir = async () => {
    let m = null;
    for (let i = 0; i < 60; i++) {
      m = await ev(`(function(){var pg=document.querySelector('.pg.on'); if(!pg)return {n:0,carg:true};
        var partes=[]; (function rec(n){ if(n.nodeType===3){ var s=String(n.nodeValue||'').trim(); if(s)partes.push(s); return; }
          if(n.nodeType!==1)return; var cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05)return;
          for(var i=0;i<n.childNodes.length;i++)rec(n.childNodes[i]); })(pg);
        var txt=partes.join(' '); var carg=/Cargando|Buscando…|Trayendo/.test(txt.slice(0,400))&&txt.length<600;
        var feo=(txt.match(/undefined|NaN|\\[object Object\\]|null null|Invalid Date/g)||[]);
        return {n:pg.querySelectorAll('*').length, carg:carg, feo:feo.slice(0,3), desb:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)};})()`);
      if (m && !m.carg && m.n > 30) break;
      await pausa(250);
    }
    return m || {};
  };
  /* ABRIR=1: en cada pantalla toca hasta 2 de cada «abrir un detalle» (la ficha del cliente, el pedido, la OC…), solo
     lectura, y mira si lo que se abre dice undefined/NaN o tira error. Nunca toca los toggles que escriben
     (toggleEntrega, toggleCobrado, toggleArmado…): la lista es blanca. */
  const ABRE = 'togglePc|lugDetToggle|cjLibro|vfPanelToggle|hoyQuienes|mrCalOpen|rtPer|pvSetPer|switchSemSel|redCgAbrir|crmOpenCliente|verFichaDePedido|openOrdDetail|prodOpenDetalle|estHogFicha|abaCcAbrir|cobItmAbrir|rutCliVendAbrir|tendVerProducto|stpzAbrir|toggleSem|toggleWeeks|toggleDiaPeds|toggleCollapse|_toggleCobroSec|planSemToggle|semTogglePlegada|togglePrevMonths|rutVerRendidos|rutVerRechazados|rtClVer|showDashboard|stApVer|redObjAbrir|toggleArmadoMasivo';
  const feosVistos = {}, res = [];
  const abrirDetalles = async (donde0) => {
    const lista = await ev(`(function(){var re=/^\\s*(${ABRE})\\(/; var vis=function(e){return !!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);};
      var porFn={}, l=[]; Array.from(document.querySelectorAll('.pg.on [onclick]')).forEach(function(e){ var oc=e.getAttribute('onclick')||''; var m=oc.match(re); if(!m||!vis(e))return;
        porFn[m[1]]=(porFn[m[1]]||0)+1; if(porFn[m[1]]<=2&&l.indexOf(oc)<0)l.push(oc); }); return l;})()`);
    for (const oc of lista) {
      donde = donde0 + ' » ' + oc.slice(0, 44);
      const ok = await ev(`(function(){var e=Array.from(document.querySelectorAll('.pg.on [onclick]')).find(function(x){return x.getAttribute('onclick')===${JSON.stringify(oc)};}); if(!e)return false; try{e.click();}catch(x){} return true;})()`);
      if (!ok) continue;
      await pausa(1500);
      const feo = await ev(`(function(){var partes=[]; (function rec(n){ if(n.nodeType===3){ var s=String(n.nodeValue||'').trim(); if(s)partes.push(s); return; }
          if(n.nodeType!==1)return; var cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05)return;
          for(var i=0;i<n.childNodes.length;i++)rec(n.childNodes[i]); })(document.body);
        var out=[]; partes.forEach(function(p,i){ if(/\\bundefined\\b|\\bNaN\\b|\\[object Object\\]|Invalid Date/.test(p))out.push((partes[i-1]||'').slice(-30)+' | '+p.slice(0,60)); }); return out.slice(0,4);})()`);
      const nuevos = feo.filter(f => !feosVistos[f]); nuevos.forEach(f => feosVistos[f] = 1);
      res.push({ donde, ms: null, n: 99, feo: nuevos });
      try { await cli.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); } catch (e) {}
      await pausa(300);
    }
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    if (process.env.CPU) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU) });   /* CPU=4 ≈ un celular */
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){window.confirm=function(){return false;};window.alert=function(){};window.prompt=function(){return null;};
      var o=window.fetch;window.fetch=function(u,x){var url=String((u&&u.url)||u||''),m=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
      var lectura=!/rest.v1.rpc|script\.google/.test(url)||/ui_medicion_anotar|login_pin|permiso_base|_pantalla$|_pantalla[?]|rest.v1.rpc.[a-z_]*_(base|light|leer|ver|lista|foto)$/.test(url)||(/rest.v1.rpc/.test(url)&&!/(directo|aplicar|crear|guardar|borrar|registrar|cobrar|marcar|editar|cancelar|alta|baja|mover|pasar|programar|vincular|enviar|confirmar|limpiar|resolver|poner|anotar|cargar|sumar|restar|cerrar|abrir_caja)/i.test(url));
      if(m==='POST'&&(!lectura||/script\\.google/.test(url))){ (window.__bloqueados=window.__bloqueados||[]).push(url.slice(0,90)+' '+String((x&&x.body)||'').replace(/("token":")[^"]*/g,'$1***').slice(0,70)); return Promise.resolve(new Response('{"ok":false,"bloqueado":true}',{status:200,headers:{'Content-Type':'application/json'}})); }
      return o.apply(this,arguments);};})();` });
    /* (8/11/2026) COMO ADMIN: SBSES=<archivo> TOKEN=<token> (estancias/scripts/migraciones/sesion_prueba.py). El robot
       no ve Egresos, Catering, Evolución, Objetivo ni CRM. Con la sesión de la base + la guarda de solo lectura de
       sbses_guarda.js, encima de la de arriba. */
    const COMO_ADMIN = !!(process.env.SBSES && process.env.TOKEN);
    if (COMO_ADMIN) await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: require('./sesion_prep.js')(process.env.TOKEN) + require('./sbses_guarda.js')(process.env.SBSES, 'tadeo') + ';try{localStorage.removeItem("maleu_apps_prueba");}catch(e){}' });   /* el recorrido mide el corte de verdad */
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    if (!COMO_ADMIN) for (let i = 0; i < 100; i++) { try { if (await ev(`!!document.getElementById('loginUser')&&typeof panelDoLogin==='function'`)) break; } catch (e) {} await pausa(200); }
    if (!COMO_ADMIN) await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))}; var r=document.getElementById('loginRemember'); if(r)r.checked=true; panelDoLogin(); 1`);
    let tabs = null;
    for (let i = 0; i < 150; i++) { try { tabs = await ev(`(typeof SESSION!=='undefined'&&SESSION&&SESSION.tabs)?SESSION.tabs:null`); if (tabs) break; } catch (e) {} await pausa(200); }
    if (!tabs) { console.log('no entró'); process.exit(1); }
    await pausa(4000);
    const vistas = (await ev(`Array.from(document.querySelectorAll('.pg')).map(function(p){return p.id.replace(/^p-/,'');})`)).filter(t => COMO_ADMIN ? t !== 'resumen' : tabs.indexOf(t) >= 0)
      .filter(t => !process.env.SOLO || process.env.SOLO.split(',').indexOf(t) >= 0);   /* (11/11/2026) SOLO=stock: una tab sola, para /auditoria */
    res.length = 0;
    for (const t of vistas) {
      donde = t;
      const tg = Date.now();
      try { await ev(`go(${JSON.stringify(t)}); 1`); } catch (e) { errores.push({ donde: t, tipo: 'go', msg: String(e.message).slice(0, 200) }); continue; }
      const m0 = await medir();
      res.push({ donde: t, ms: Date.now() - tg, ...m0 });
      await pausa(800);
      const navs = await ev(`(function(){var re=/^\\s*(${NAV})\\(/; var vis=function(e){return !!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);};
        var pg=document.querySelector('.pg.on'); var vistos={}, l=[];
        Array.from(pg.querySelectorAll('[onclick]')).forEach(function(e){ var oc=e.getAttribute('onclick')||''; if(re.test(oc)&&vis(e)&&!vistos[oc]){vistos[oc]=1;l.push(oc);} });
        return l;})()`);
      for (const oc of navs) {
        donde = t + ' › ' + oc.slice(0, 40);
        const t0 = Date.now();
        const ok = await ev(`(function(){var e=Array.from(document.querySelectorAll('.pg.on [onclick]')).find(function(x){return x.getAttribute('onclick')===${JSON.stringify(oc)};}); if(!e)return false; e.click(); return true;})()`);
        if (!ok) continue;
        await pausa(300);
        const m = await medir();
        res.push({ donde, ms: Date.now() - t0, ...m });
        await pausa(700);
        if (process.env.ABRIR) await abrirDetalles(donde);
      }
      if (process.env.ABRIR && !navs.length) await abrirDetalles(t);
    }
    const med = await ev(`(window.__med||[]).filter(function(x){return x.boton==='js-error';}).map(function(x){return x.tab+': '+x.ref;})`);
    const bloq = await ev(`(window.__bloqueados||[])`);
    console.log('\n== Sub-tabs ' + ANCHO + 'px · ' + res.length + ' pantallas');
    res.forEach(r => { const mal = r.carg || (r.n || 0) < 30 || (r.feo && r.feo.length) || r.desb; console.log((mal ? '  MAL ' : '  ok  ') + r.donde.padEnd(56) + String(r.n || 0).padStart(5) + ' elem' + String(r.ms == null ? '' : r.ms + ' ms').padStart(9) + (r.carg ? ' CARGANDO' : '') + (r.feo && r.feo.length ? ' FEO:' + r.feo.join(',') : '') + (r.desb ? ' DESBORDA ' + r.desb + 'px' : '')); });
    console.log('\n== Errores (' + errores.length + ')'); errores.forEach(e => console.log('  [' + e.donde + '] ' + e.tipo + ': ' + e.msg));
    console.log('\n== js-error del medidor (' + med.length + ')'); med.forEach(x => console.log('  ' + x));
    /* (8/11/2026) Lo que el ERP intentó mandar a Apps Script y cortó en su propia puerta (`_appsApagadoResp`). */
    const apag = await ev(`(window.__appsApagado||{})`);
    console.log('\n== Cortados por Apps Script apagado (' + Object.keys(apag).length + ')'); Object.keys(apag).forEach(k => console.log('  ' + k + ' ×' + apag[k]));
    console.log('\n== POST bloqueados (' + bloq.length + ')'); Array.from(new Set(bloq)).slice(0, 15).forEach(b => console.log('  ' + b));
  } finally { cli.matar(); }
})();
