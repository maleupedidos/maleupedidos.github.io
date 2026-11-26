/* Recorre TODAS las tabs del ERP como el robot (login real por la base) y junta lo que se rompe (6/11/2026).

   node _tools/pruebas/recorrer_todo.js [ancho=390] [base=http://localhost:8173] [app=app.html]

   Solo navega: no toca botones ni manda nada (los POST salen bloqueados por si acaso). Por tab mide:
   excepciones, errores de consola, `js-error` del medidor, ms hasta que deja de decir «Cargando» y
   cuántos elementos pintó (un verde sobre 0 elementos no vale). Credenciales: ~/.maleu/robot.json. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = Number(process.argv[2] || 390);
const BASE = process.argv[3] || 'http://localhost:8173';
const APP = process.argv[4] || 'app.html';
const pausa = ms => new Promise(r => setTimeout(r, ms));
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));

(async () => {
  const cli = await abrir();
  const errores = [];
  let tabActual = '(arranque)';
  cli.escuchar((met, p) => {
    if (met === 'Runtime.exceptionThrown') { const d = (p || {}).exceptionDetails || {}; errores.push({ tab: tabActual, tipo: 'excepcion', msg: ((d.exception || {}).description || d.text || '').split('\n').slice(0, 2).join(' | ').slice(0, 220) }); }
    if (met === 'Runtime.consoleAPICalled' && p.type === 'error') errores.push({ tab: tabActual, tipo: 'console.error', msg: (p.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 220) });
  });
  const ev = e => evaluar(cli, e);
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    /* Nada sale: un recorrido no escribe. Los GET y las RPC de lectura de la base pasan. */
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `(function(){var o=window.fetch;window.fetch=function(u,x){var url=String((u&&u.url)||u||''),m=String((x&&x.method)||(u&&u.method)||'GET').toUpperCase();
      var lectura=!/rest.v1.rpc.[a-z_]*(directo|aplicar|crear|guardar|borrar|registrar|cobrar|marcar|editar|cancelar|alta|baja|mover|pasar|programar|vincular|enviar|confirmar|limpiar|resolver|poner)/i.test(url)||/ui_medicion_anotar|login_pin|permiso_base|_pantalla$|_pantalla[?]/.test(url);
      if(m==='POST'&&!lectura&&!/script\\.google/.test(url)){ (window.__bloqueados=window.__bloqueados||[]).push(url.slice(0,120)); return Promise.resolve(new Response('{"ok":false,"bloqueado":true}',{status:200,headers:{'Content-Type':'application/json'}})); }
      return o.apply(this,arguments);};})();` });
    await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
    for (let i = 0; i < 100; i++) { try { if (await ev(`!!document.getElementById('loginUser')&&typeof panelDoLogin==='function'`)) break; } catch (e) {} await pausa(200); }
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(cred.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(String(cred.pin))}; var r=document.getElementById('loginRemember'); if(r)r.checked=true; panelDoLogin(); 1`);
    let tabs = null;
    for (let i = 0; i < 150; i++) { try { tabs = await ev(`(typeof SESSION!=='undefined'&&SESSION&&SESSION.tabs)?SESSION.tabs:null`); if (tabs) break; } catch (e) {} await pausa(200); }
    if (!tabs) { console.log('no entró'); process.exit(1); }
    await pausa(4000);
    const vistas = (await ev(`Array.from(document.querySelectorAll('.pg')).map(function(p){return p.id.replace(/^p-/,'');})`)).filter(t => tabs.indexOf(t) >= 0 || tabs.indexOf('*') >= 0);
    const res = [];
    for (const t of (vistas.length ? vistas : tabs)) {
      tabActual = t;
      const t0 = Date.now();
      try { await ev(`go(${JSON.stringify(t)}); 1`); } catch (e) { errores.push({ tab: t, tipo: 'go', msg: String(e.message).slice(0, 200) }); continue; }
      let m = null;
      for (let i = 0; i < 80; i++) {
        m = await ev(`(function(){var pg=document.querySelector('.pg.on'); if(!pg)return {n:0,carg:true};
          /* Solo el texto VISIBLE: innerText lee los loaders con opacity:0 (Ruta daba «Cargando» 20 s pintada). */
          var partes=[]; (function rec(n){ if(n.nodeType===3){ var s=String(n.nodeValue||'').trim(); if(s)partes.push(s); return; }
            if(n.nodeType!==1)return; var cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05)return;
            for(var i=0;i<n.childNodes.length;i++)rec(n.childNodes[i]); })(pg);
          var txt=partes.join(' '); var carg=/Cargando|Buscando…|Trayendo/.test(txt.slice(0,400))&&txt.length<600;
          return {n:pg.querySelectorAll('*').length, carg:carg, len:txt.length, id:pg.id};})()`);
        if (m && !m.carg && m.n > 30) break;
        await pausa(250);
      }
      const ms = Date.now() - t0;
      const desborde = await ev(`(function(){var pg=document.querySelector('.pg.on'); if(!pg)return 0; return Math.max(0,pg.scrollWidth-pg.clientWidth);})()`);
      res.push({ tab: t, ms, elementos: m ? m.n : 0, texto: m ? m.len : 0, quedoCargando: !!(m && m.carg), desborde });
      await pausa(1500);
    }
    const med = await ev(`(window.__med||[]).filter(function(x){return x.boton==='js-error';}).map(function(x){return x.tab+': '+x.ref;})`);
    const bloq = await ev(`(window.__bloqueados||[]).slice(0,10)`);
    console.log('\n== Recorrido ' + ANCHO + 'px · ' + APP + ' · tabs ' + res.length);
    res.forEach(r => console.log((r.quedoCargando || r.elementos < 30 ? '  MAL ' : '  ok  ') + r.tab.padEnd(14) + String(r.ms).padStart(6) + ' ms  ' + String(r.elementos).padStart(5) + ' elem' + (r.desborde ? '  DESBORDA ' + r.desborde + 'px' : '')));
    console.log('\n== Errores (' + errores.length + ')'); errores.forEach(e => console.log('  [' + e.tab + '] ' + e.tipo + ': ' + e.msg));
    console.log('\n== js-error del medidor (' + med.length + ')'); med.forEach(x => console.log('  ' + x));
    if (bloq.length) { console.log('\n== POST bloqueados (no se escribió nada)'); bloq.forEach(b => console.log('  ' + b)); }
  } finally { cli.matar(); }
})();
