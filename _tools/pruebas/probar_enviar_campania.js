/* 🎯 Segmentos ahora MANDA la campaña (20/9/2026).

   Hasta hoy la pantalla armaba la audiencia y te dejaba copiando teléfonos: el
   envío era a mano en WATI. Medido ese día: UNA campaña en tres meses.

   Los POST los corta el PREP, así que **este test no manda un solo mensaje**.
   Lo que se mide es la DECISIÓN: a quiénes le mandaría, a quiénes deja de
   control, y que el payload sea el correcto.

   El control NO es circular: el texto del preview se compara contra lo que
   devuelve la API de WATI, leída por fuera del ERP.

     node probar_enviar_campania.js <token> [ancho] [base]            */
'use strict';
const P = 'c:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/';
const { abrir, evaluar } = require(P + 'cdp.js');
const prep = require(P + 'sesion_prep.js');
const https = require('https');

const TOKEN = process.argv[2];
const ANCHO = Number(process.argv[3] || 1440);
const BASE = process.argv[4] || 'http://localhost:8080';
let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 300) : '')); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 180000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(500); }
  return false;
};

/* El control independiente: los templates leídos de WATI, no del ERP. */
function watiTemplates() {
  const TK = 'wati_6cac1b8c-07cc-4946-b954-5f52df8ba948.iRUrSg_H28yY_zWU3jyMYFu96ErdgwhsnhNA-1_yHN5simg3-rUejn_ROEAGRhIOp2ulVLp4t-7g5VCyD2mMwXqqWGYn0_SahlRTLVoPczz3xwIH8bXV5NkyJob-dPKn';
  return new Promise((res, rej) => {
    https.get({
      host: 'live-mt-server.wati.io',
      path: '/1034656/api/v1/getMessageTemplates?pageSize=200&pageNumber=1',
      headers: { Authorization: 'Bearer ' + TK }
    }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => { try { res(JSON.parse(b).messageTemplates || []); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

/* Guarda los POST ANTES de que el PREP los corte. El PREP ya reemplazó fetch,
   así que este wrapper va encima y delega. */
const ESPIA = '(function(){var f=window.fetch;window.__posts=[];'
  + 'window.fetch=function(u,x){'
  + 'if(x&&String(x.method||"").toUpperCase()==="POST"){'
  + 'try{window.__posts.push(JSON.parse(x.body));}catch(e){window.__posts.push({crudo:String(x.body).slice(0,200)});}}'
  + 'return f.apply(this,arguments);};})();';

(async () => {
  if (!TOKEN) { console.log('Falta el token: node probar_enviar_campania.js <token>'); process.exit(1); }
  const tpls = await watiTemplates();
  const porNombre = {};
  tpls.forEach(t => { porNombre[String(t.elementName || '')] = t; });
  console.log('\n(control) WATI devolvió ' + tpls.length + ' templates\n');

  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride',
      { width: ANCHO, height: 950, deviceScaleFactor: 1, mobile: false });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, ESPIA) });
    /* SIN `?prueba=1`: esa bandera sirve para mirar layout sin backend, y acá hace
       falta el CRM de verdad — con ella la pantalla se queda en "Armando
       segmentos..." para siempre (probado el 20/9/2026). */
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });

    console.log('== 🎯 Segmentos · enviar ==');
    if (!await esperar(cli, `typeof window.segEnviarAbrir==='function'`)) {
      chk('el ERP cargó con el botón nuevo', false, 'no apareció segEnviarAbrir'); salir(1);
    }
    await evaluar(cli, `go('estancias'); 1`);
    /* `crmClientesCargados` NO EXISTE — es un intento, no una garantía. Cortar
       acá hacía que el test dijera "el CRM no cargó" sobre un ERP que estaba
       perfecto (me pasó el 20/9/2026, y el control fue correr probar_seg_carne).
       Quien manda es que las tarjetas pinten. */
    await esperar(cli, `!!(window.crmClientesCargados||document.querySelector("#est-hoy .hoy-row,#est-hoy .hoy-empty"))`, 200000);
    await evaluar(cli, `estSwitch('segmentos'); 1`);
    if (!await esperar(cli, `document.querySelectorAll('#est-segmentos .seg-card').length>0`, 200000)) {
      chk('las tarjetas de segmento pintaron', false, 'no pintó ninguna'); salir(1);
    }
    await pausa(1200);   // que llegue action=watiTemplates

    // ── 1. El botón está donde tiene que estar, y NO donde no ──
    const cards = await evaluar(cli, `(function(){
      return [].map.call(document.querySelectorAll('#est-segmentos .seg-card'), function(c){
        var tpl=(c.querySelector('.seg-card-tpl')||{}).textContent||'';
        return {t:((c.querySelector('.seg-card-t')||{}).textContent||'').trim(),
                tpl:tpl.replace('Template WATI:','').trim(),
                send:!!c.querySelector('.seg-send'),
                n:parseInt(((c.querySelector('.seg-card-n')||{}).textContent||'0'),10)||0};
      });
    })()`);
    console.log('  ' + JSON.stringify(cards).slice(0, 400));
    const conTpl = cards.filter(c => c.tpl.indexOf('(') === -1);
    const sinTpl = cards.filter(c => c.tpl.indexOf('(') > -1);
    chk('hay tarjetas con template real', conTpl.length > 0, cards.length);
    chk('todas las que tienen template muestran Enviar',
      conTpl.every(c => c.send), conTpl.filter(c => !c.send));
    chk('las que NO tienen template no lo muestran',
      sinTpl.every(c => !c.send), sinTpl.filter(c => c.send));

    // ── 2. El modal abre y dice qué template es ──
    const elegida = conTpl.sort((a, b) => b.n - a.n)[0];
    console.log('\n  -> abro "' + elegida.t + '" (' + elegida.tpl + ', ' + elegida.n + ' personas)');
    const idSeg = await evaluar(cli, `(function(){
      var cs=document.querySelectorAll('#est-segmentos .seg-card');
      for(var i=0;i<cs.length;i++){
        var t=((cs[i].querySelector('.seg-card-t')||{}).textContent||'').trim();
        if(t===${JSON.stringify(elegida.t)}){ var b=cs[i].querySelector('.seg-send'); if(b){b.click(); return true;} }
      }
      return false;
    })()`);
    chk('el botón Enviar abre algo', idSeg === true);
    /* El modal abre al toque, pero el PREVIEW viaja a Apps Script. Con una pausa
       fija el test medía el modal antes de que llegara el texto. */
    await esperar(cli, `(function(){var b=document.getElementById('segEnvBox');
      return !!(b&&b.classList.contains('on')&&b.querySelector('.env-prev-b'));})()`, 60000);
    const modal = await evaluar(cli, `(function(){
      var b=document.getElementById('segEnvBox');
      if(!b||!b.classList.contains('on'))return null;
      return {txt:(b.innerText||''),
              prev:(b.querySelector('.env-prev-b')||{}).innerText||'',
              titulo:(b.querySelector('.env-prev-t')||{}).innerText||'',
              chips:b.querySelectorAll('.env-pcts .hoy-thresh-chip').length,
              goDisabled:(document.getElementById('segEnvGo')||{}).disabled};
    })()`);
    chk('el modal está abierto', !!modal, modal);
    chk('dice qué template manda', !!modal && modal.txt.indexOf(elegida.tpl) > -1);

    // ── 3. El preview es el TEXTO REAL de WATI (control independiente) ──
    const real = porNombre[elegida.tpl];
    if (real) {
      /* El trozo se toma DESPUES de la variable, nunca del renglon que la
         tiene: el ERP rellena {{1}} con el nombre real (bien) y el test lo
         borraba (mal), asi que con un template que arranca en "Hola {{1}}!"
         comparaba "Hola !" contra "Hola Lucia!" y daba rojo sobre un ERP
         correcto. Paso el 20/9/2026 al cambiar la vista por defecto. */
      const partes = String(real.body || '').replace(/\*/g, '').split(/\{\{\d+\}\}/);
      const trozo = partes.map(function(p){ return p.replace(/\s+/g, ' ').trim(); })
                          .sort(function(a, b){ return b.length - a.length; })[0].slice(0, 28);
      chk('el preview muestra el cuerpo real del template (contra la API de WATI)',
        !!modal && trozo.length > 6 && modal.prev.replace(/\s+/g, ' ').indexOf(trozo.replace(/\s+/g, ' ').slice(0, 20)) > -1,
        { esperaba: trozo, vi: (modal && modal.prev || '').slice(0, 120) });
      const hdr = (real.header && real.header.text) ? String(real.header.text).trim() : '';
      if (hdr) {
        chk('y el título del template', !!modal && modal.titulo.trim() === hdr,
          { esperaba: hdr, vi: modal && modal.titulo });
      }
    } else {
      chk('el template de la tarjeta existe en WATI', false, elegida.tpl);
    }

    // ── 4. El reparto: manda + control = todos, y nadie en los dos ──
    const rep = await evaluar(cli, `(function(){
      var b=document.getElementById('segEnvBox');
      var m=(b.innerText||'').match(/Le llega a\\s+(\\d+)/);
      var c=(b.innerText||'').match(/(\\d+)\\s+no reciben nada/);
      return {manda:m?+m[1]:null, control:c?+c[1]:0, total:${elegida.n}};
    })()`);
    console.log('  ' + JSON.stringify(rep));
    chk('el default deja un grupo de control', rep.control > 0, rep);
    chk('manda + control = la audiencia entera',
      rep.manda !== null && (rep.manda + rep.control) === rep.total, rep);
    chk('el control es el 15% (redondeado para abajo)',
      rep.control === Math.max(1, Math.floor(rep.total * 0.15)), rep);

    // ── 5. El botón no se habilita hasta escribir el número exacto ──
    chk('Enviar arranca deshabilitado', modal.goDisabled === true, modal);
    await evaluar(cli, `(function(){var i=document.getElementById('segEnvNum');
      i.value='${rep.manda - 1}'; segEnvChk(); return 1;})()`);
    chk('con el número equivocado sigue deshabilitado',
      await evaluar(cli, `document.getElementById('segEnvGo').disabled`) === true);
    await evaluar(cli, `(function(){var i=document.getElementById('segEnvNum');
      i.value='${rep.manda}'; segEnvChk(); return 1;})()`);
    chk('con el número exacto se habilita',
      await evaluar(cli, `document.getElementById('segEnvGo').disabled`) === false);

    // ── 6. Sin control, va a todos ──
    await evaluar(cli, `segEnvPct(0); 1`); await pausa(300);
    const sinCtrl = await evaluar(cli, `(function(){
      var b=document.getElementById('segEnvBox');
      var m=(b.innerText||'').match(/Le llega a\\s+(\\d+)/);
      return {manda:m?+m[1]:null, dice:(b.innerText||'').indexOf('todos reciben')>-1};
    })()`);
    chk('sin control le llega a todos', sinCtrl.manda === rep.total, { sinCtrl, total: rep.total });
    chk('y lo dice', sinCtrl.dice === true, sinCtrl);
    await evaluar(cli, `segEnvPct(15); var i=document.getElementById('segEnvNum');
      i.value=String(${rep.manda}); segEnvChk(); 1`);
    await pausa(300);

    // ── 7. El payload: lo que SALDRÍA (el POST lo corta el PREP) ──
    await evaluar(cli, `window.__posts=[]; 1`);
    const nAhora = await evaluar(cli, `(function(){
      var b=document.getElementById('segEnvBox');
      var m=(b.innerText||'').match(/Le llega a\\s+(\\d+)/); return m?+m[1]:0;})()`);
    await evaluar(cli, `(function(){var i=document.getElementById('segEnvNum');
      i.value=String(${nAhora}); segEnvChk(); document.getElementById('segEnvGo').click(); return 1;})()`);
    await pausa(900);
    const posts = await evaluar(cli, `window.__posts||[]`);
    const env = posts.filter(p => p && p.action === 'crmEnviarCampania');
    chk('salió UN solo POST de envío', env.length === 1, posts.map(p => p && p.action));
    if (env.length === 1) {
      const p = env[0];
      chk('lleva el template de la tarjeta', p.template === elegida.tpl, p.template);
      chk('items = los que reciben', (p.items || []).length === nAhora, { items: (p.items || []).length, esperaba: nAhora });
      chk('control = los que no', (p.control || []).length === rep.total - nAhora,
        { control: (p.control || []).length, esperaba: rep.total - nAhora });
      chk('todos los items tienen teléfono',
        (p.items || []).every(i => i.tel && String(i.tel).replace(/\D/g, '').length >= 8),
        (p.items || []).filter(i => !i.tel).slice(0, 3));
      const tels = {};
      let choque = 0;
      (p.items || []).forEach(i => { tels[i.tel] = 1; });
      (p.control || []).forEach(i => { if (tels[i.tel]) choque++; });
      chk('nadie está en los dos grupos a la vez', choque === 0, { choque });
      chk('no manda la prueba por error', p.prueba !== true, p.prueba);
    }

    const err = await evaluar(cli, `(window.__err||[]).length`);
    const errs = await evaluar(cli, `(window.__err||[]).slice(0,4)`);
    chk('sin errores de consola', err === 0, errs);

    console.log('\n' + ok + ' ok, ' + mal + ' mal');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  EXPLOTO: ' + (e && e.message)); salir(1); }
})();
