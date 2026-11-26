/* ARMADO SIN «REPARTO DEL DÍA» (22/11/2026, Tadeo: «Esto de arriba no lo estamos usando»). Entra como el ROBOT (modo
   ensayo, todo POST que escribe se corta) y abre Ruta › Armado a 393 (WebKit, toque) y a 1440 (Chromium, cajón abierto):
     1. el bloque «Reparto del día» no está (ni el texto ni #rutCuadre con contenido);
     2. lo primero que se ve arriba son los cuadros de días (atrasados / hoy / próximos) y la lista;
     3. no se pide reparto_cuadre_pantalla (apagado tampoco lee);
     4. sin errores de JS ni respuestas 4xx/5xx de la base.
   Saca capturas armado_393.png y armado_1440.png en OUT.
     PW=<playwright-core> BASE=http://localhost:8155/app.html OUT=<dir> node probar_armado_sin_reparto.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8155/app.html', OUT = process.env.OUT || os.tmpdir();
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 500) : '')); } };
const CORTE = `try{localStorage.setItem('maleu_ensayo','1');}catch(e){} window.confirm=function(){return true;}; window.alert=function(){}; window.__rpc=[];
  (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s); if(r)window.__rpc.push(r[1]);
    if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/|login_pin/.test(s)&&(/script\\.google\\.com/.test(s)||(r&&/(_directo|cobrar|anotar|guardar|borrar|marcar|limpiar|aplicar|escribir|crear|alta|cerrar|resolver|descobr|deshacer|_set|salir|revisar)/.test(r[1]))||!r)){
      return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));}
    return f.apply(this,arguments);};})();`;
(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  for (const [modo, motor, vp] of [['393', 'webkit', { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['1440', 'chromium', { viewport: { width: 1440, height: 900 } }]]) {
    console.log('\n=== ' + modo + ' ===');
    const br = await pw[motor].launch();
    try {
      const ctx = await br.newContext(vp); await ctx.addInitScript(CORTE);
      const pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', (e) => errs.push('JS: ' + String(e.message).slice(0, 160)));
      pg.on('response', (r) => { if (r.status() >= 400 && /supabase\.co\/rest/.test(r.url())) errs.push('base ' + r.status() + ': ' + r.url().replace(/^.*\/rest\/v1\//, '').split('?')[0]); });
      await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => typeof panelDoLogin === 'function' && !!document.getElementById('loginUser'), null, { timeout: 90000 });
      await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
      await pg.waitForFunction(() => typeof D !== 'undefined' && D && Array.isArray(D.pedidos) && D.pedidos.length > 50, null, { timeout: 150000 });
      if (modo === '1440') await pg.evaluate(() => { if (!document.body.classList.contains('sb-open')) sbToggle(); });
      await pg.evaluate(() => go('ruta')); await T(1500);
      await pg.evaluate(() => { try { switchTab('armado'); } catch (e) {} }); await T(6000);
      const r = await pg.evaluate(() => {
        const v = document.getElementById('armadoView'), cu = document.getElementById('rutCuadre'), sum = document.getElementById('armadoSummary');
        const txt = v ? v.innerText : '';
        const primero = [].filter.call(v ? v.querySelectorAll('#rutCuadre, #armadoSummary, #armadoList') : [], (x) => x.getBoundingClientRect().height > 0).map((x) => x.id)[0] || '';
        return { visible: !!v && !v.classList.contains('hidden'), reparto: /Reparto del d[ií]a|Tildá las bolsas|lo que cargás/i.test(txt), cuadreHtml: cu ? cu.innerHTML.length : -1,
          primero, tiles: sum ? sum.querySelectorAll('.arm-res-t').length : 0, sumTxt: sum ? sum.innerText.replace(/\s+/g, ' ').slice(0, 120) : '', inicio: txt.replace(/\s+/g, ' ').slice(0, 90),
          pide: (window.__rpc || []).filter((x) => x === 'reparto_cuadre_pantalla').length };
      });
      console.log('       arriba: «' + r.inicio + '»');
      chk(modo + ': Armado a la vista', r.visible, r);
      chk(modo + ': no está «Reparto del día» (ni «Tildá las bolsas», ni «lo que cargás»)', !r.reparto && r.cuadreHtml === 0, r);
      /* Arriba: los cuadros de atrasados/hoy/próximos (si hay) o directo el primer día («Domingo 22/11 HOY …»). */
      chk(modo + ': arranca con los días («' + r.inicio.slice(0, 30) + '»)', /^(\d+ \S+ )?(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo|Atrasad)/i.test(r.inicio) || r.tiles > 0, r);
      chk(modo + ': no se pide reparto_cuadre_pantalla (' + r.pide + ' veces)', r.pide === 0, r);
      await pg.screenshot({ path: path.join(OUT, 'armado_' + modo + '.png') });
      chk(modo + ': sin errores de JS ni de la base', errs.length === 0, errs);
    } catch (e) { mal++; console.log('  MAL  reventó: ' + (e && e.stack || e)); }
    await br.close();
  }
  console.log('\n' + ok + ' ok · ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
