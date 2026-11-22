/* ESCÁNER DE CONSOLA DEL USO NORMAL (22/11/2026, hora de limpieza). Entra como el ROBOT por el login (modo ensayo), recorre
   las pantallas que más se usan —Inicio, Pedidos (y una ficha), Ruta › Armado / Ruta / Cobranza / + Pedido, Caja, Productos,
   Ventas— a 393 (WebKit, toque) y a 1440 (Chromium, cajón abierto), y junta TODO error de JS (pageerror y console.error)
   y las respuestas 4xx/5xx de la base. No escribe nada: todo POST que no sea una lectura se corta.
     PW=<playwright-core> BASE=http://localhost:8155/app.html node escanear_consola.js
   Sale con 1 si hubo algún error. Un error repetido se cuenta una vez, con en qué pantalla salió. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html';
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const CORTE = `try{localStorage.setItem('maleu_ensayo','1');}catch(e){}
  window.confirm=function(){return true;}; window.alert=function(){}; window.__cortado=[];
  (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
    if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/|login_pin/.test(s)&&(/script\\.google\\.com/.test(s)||(r&&/(_directo|cobrar|anotar|guardar|borrar|marcar|limpiar|aplicar|escribir|crear|alta|cerrar|resolver|descobr|deshacer|_set)/.test(r[1]))||!r)){
      window.__cortado.push((r&&r[1])||s.slice(0,60)); return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
    return f.apply(this,arguments);};})();`;
const PANTALLAS = [
  ['inicio', "go('inicio')"], ['pedidos', "go('pedidos')"],
  ['ficha de pedido', "(function(){ go('pedidos'); var p=(D.pedidos||[]).filter(function(x){return x.es!=='Cancelado';})[0]; if(p)openOrdDetail(p.h,String(p.n),Number(p.r)||0); })()"],
  ['cerrar ficha', "try{closeOrdDetail();}catch(e){}"],
  ['ruta › armado', "go('ruta'); setTimeout(function(){ try{switchTab('armado');}catch(e){} },800)"],
  ['ruta › ruta', "try{switchTab('ruta');}catch(e){}"], ['ruta › cobranza', "try{switchTab('cobros');}catch(e){}"],
  ['ruta › + pedido', "try{switchTab('nuevo');}catch(e){}"], ['caja', "go('caja')"], ['productos', "go('stock')"], ['ventas', "go('ventas')"]];
(async () => {
  const errores = {}; let n = 0;
  for (const [modo, motor, vp] of [['celu', 'webkit', { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['compu', 'chromium', { viewport: { width: 1440, height: 900 } }]]) {
    const br = await pw[motor].launch(); const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
    const ctx = await br.newContext(vp); await ctx.addInitScript(CORTE);
    const pg = await ctx.newPage(); let donde = 'arranque';
    const anotar = (t) => { t = String(t).slice(0, 220); if (/cortado por la prueba|Failed to load resource.*(script\.google|favicon)/.test(t)) return; const k = t.replace(/\d{3,}/g, 'N'); (errores[k] = errores[k] || { t, en: new Set() }).en.add(modo + ' · ' + donde); n++; };
    pg.on('pageerror', (e) => anotar('JS: ' + e.message));
    pg.on('console', (m) => { if (m.type() === 'error') anotar('consola: ' + m.text()); });
    pg.on('response', (r) => { if (r.status() >= 400 && /supabase\.co\/rest/.test(r.url())) anotar('base ' + r.status() + ': ' + r.url().replace(/^.*\/rest\/v1\//, '').split('?')[0]); });
    try {
      await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
      await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
      await pg.waitForFunction(() => typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
      if (modo === 'compu') await pg.evaluate(() => { if (!document.body.classList.contains('sb-open')) sbToggle(); });
      for (const [nom, js] of PANTALLAS) { donde = nom; await pg.evaluate(js).catch((e) => anotar('no pude abrir ' + nom + ': ' + e.message)); await T(nom.indexOf('ruta') === 0 ? 5000 : 3500); }
      console.log(modo + ': ' + PANTALLAS.length + ' pantallas, ' + (await pg.evaluate(() => window.__cortado.length)) + ' escrituras cortadas');
    } catch (e) { anotar('el escáner reventó: ' + e.message); }
    await br.close();
  }
  const l = Object.values(errores);
  console.log('\n' + l.length + ' errores distintos (' + n + ' en total)');
  l.forEach((e) => console.log('  · ' + e.t + '\n      en: ' + [...e.en].join(' | ')));
  process.exit(l.length ? 1 : 0);
})();
