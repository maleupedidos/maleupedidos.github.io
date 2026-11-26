/* LOS COMBOS EN MI PORTAL (11/11/2026, migración 655; caso Fede D'Andrea).
     BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_portal_combos.js [ancho]
   Entra por la pantalla de login como el representante de prueba (PRUEBA Robot, ~/.maleu/robot.json › pinRep), como el
   robot. Toda escritura a la base se corta en el navegador antes de salir: el pedido queda en la cola del celular y se
   lee de ahí. No se crea nada.
   Sostiene:
     · el portal muestra los 5 combos de la tienda con el precio de la base (Noche en Casa $23.900);
     · armar Noche en Casa (Pack Muzarella x2 + Franui) y agregarlo: el resumen dice el combo y $23.900;
     · el pedido que se guarda lleva los productos a precio de lista en `items`, el combo en `combos` y el total cerrado;
     · con un Pack Muzarella x2 suelto además, el renglón se suma (el alta no acepta un producto repetido). */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const fs = require('fs'), os = require('os');
const RJ = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
const REP = { usuario: RJ.repUsuario || 'pruebarobot', pin: String(RJ.pinRep || '') };
if (!REP.pin) { console.error('falta pinRep en ~/.maleu/robot.json'); process.exit(2); }
/* Corta toda escritura a la base (POST a rpc/* que no sea de lectura ni de login): el pedido no sale. */
const CORTE = `(function(){var of=window.fetch;window.__cortadas=[];window.fetch=function(u,o){var url=String((u&&u.url)||u||'');
  if(o&&String(o.method||'').toUpperCase()==='POST'&&/supabase\\.co\\/rest\\/v1\\/rpc\\//.test(url)&&!/(_pantalla|login_pin|mi_sesion|palancas|permiso|_base\\b|lectura)/.test(url)){
    window.__cortadas.push(url.split('/rpc/')[1]);return Promise.reject(new TypeError('cortado por la prueba'));}
  if(o&&String(o.method||'').toUpperCase()==='POST'&&/script\.google/.test(url)){window.__cortadas.push('apps');return Promise.reject(new TypeError('cortado'));}
  return of.apply(this,arguments);};})();`;
let ok = 0, mal = 0;
const chk = (c, m, x) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, x !== undefined ? JSON.stringify(x).slice(0, 700) : ''); } };
(async () => {
  const cli = await abrir();
  const ev = (e) => evaluar(cli, e);
  try {
    await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.removeItem('maleu_red_ap_cola')}catch(e){}" });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 60 && !(await ev("typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')")); i++) await T(500);
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(REP.usuario)};document.getElementById('loginPin').value=${JSON.stringify(REP.pin)};panelDoLogin();1`);
    for (let i = 0; i < 60 && !(await ev("typeof SESSION!=='undefined'&&SESSION&&SESSION.rol==='vendedor'")); i++) await T(500);
    chk(await ev("SESSION&&SESSION.rol==='vendedor'"), 'entró el representante de prueba');
    await ev(CORTE);
    await T(6000);
    await ev("go('miportal')");
    for (let i = 0; i < 30 && !(await ev("typeof window.renderCombos==='function'")); i++) await T(500);
    await ev("try{showScreen('nuevo')}catch(e){}"); await T(1500);
    for (let i = 0; i < 20 && !(await ev("window.RED_COMBOS&&RED_COMBOS.filter(function(c){return c.id==='cmb_noche_casa'})[0].precio===23900&&!!document.querySelector('#red-combos .red-cmb')")); i++) await T(500);
    const lista = JSON.parse(await ev(`JSON.stringify([].map.call(document.querySelectorAll('#red-combos .red-cmb'),function(r){return r.innerText.replace(/\\s+/g,' ');}))`));
    chk(lista.length === 5, `el portal muestra ${lista.length} combos`, lista);
    chk(lista.some((t) => /Noche en Casa/.test(t) && /23\.900/.test(t)), 'Noche en Casa a $23.900 (el precio de la base)', lista);
    // Armar Noche en Casa con Pack Muzarella x2 (id 5) + Franui (id 13).
    await ev("redComboArmar('cmb_noche_casa')"); await T(300);
    const sels = JSON.parse(await ev("JSON.stringify([].map.call(document.querySelectorAll('#red-cmb-form select'),function(s){return [].map.call(s.options,function(o){return o.value})}))"));
    chk(sels.length === 2 && sels[0].indexOf('5') >= 0 && sels[1].join() === '13', 'se elige el pack de pizzas y el Franui', sels);
    await ev("(function(){var s=document.querySelectorAll('#red-cmb-form select');s[0].value='5';s[1].value='13';redComboAgregar('cmb_noche_casa');})()"); await T(400);
    const res = await ev("document.getElementById('summary').innerText.replace(/\\s+/g,' ')");
    chk(/Noche en Casa/.test(res) && /23\.900/.test(res), 'el resumen dice el combo y $23.900', res);
    // Uno suelto del mismo pack, para que el renglón se sume.
    await ev("changeQty(5,1)"); await T(200);
    // El formulario y guardar: el pedido va a la cola del celular (la guarda no deja escribir en la base).
    await ev(`(function(){var v=function(id,x){var e=document.getElementById(id);e.value=x;e.dispatchEvent(new Event('input',{bubbles:true}));};
      v('f-cliente','PRUEBA Combo Portal');v('f-telefono','1100006551');v('f-barrio','PRUEBA');v('f-lote','655');
      v('f-dia',redProxViernesISO());var o=document.querySelector('.pago-opt[data-val="Transferencia"]')||document.querySelector('.pago-opt');o.click();enviar();})()`);
    await T(1500);
    const cola = JSON.parse(await ev("localStorage.getItem('maleu_red_ap_cola')||'[]'"));
    if (!cola.length) console.log('   (sin cola: ' + await ev(`JSON.stringify({inval:[].map.call(document.querySelectorAll('.invalid'),function(e){return e.id}),toast:(document.getElementById('redToastBox')||document.querySelector('[id*=oast]')||{}).textContent||'',btn:(document.getElementById('btn-enviar')||{}).textContent,dia:(document.getElementById('f-dia')||{}).value,pago:typeof pago!=='undefined'?pago:'?'})`) + ')');
    const pd = (cola[0] && cola[0].d) || {};
    const its = pd.items || [], cmb = pd.combos || [];
    const env = Number(pd.envio) || 0;
    chk(cola.length === 1, 'el pedido quedó para guardar (en la cola del celular)', cola.length);
    chk(cmb.length === 1 && cmb[0].id === 'cmb_noche_casa' && cmb[0].precio === 23900 && cmb[0].items.length === 2, 'viaja el combo en `combos`', cmb);
    const p5 = its.filter((x) => x.id === 5), p13 = its.filter((x) => x.id === 13);
    chk(p5.length === 1 && p5[0].qty === 2 && p13.length === 1 && p13[0].qty === 1, 'items: Pack Muzarella x2 sumado (1 del combo + 1 suelto) y el Franui, sin repetir', its);
    chk(Number(pd.total) === 23900 + 17000 + env, `total = combo $23.900 + suelto $17.000 + envío $${env} = $${23900 + 17000 + env}`, pd.total);
    chk(typeof pd.comboDetalle === 'string' && /cmb_noche_casa/.test(pd.comboDetalle), 'y el detalle del combo en texto (comboDetalle), como la tienda');
    const errs = JSON.parse(await ev('JSON.stringify(window.__errores||[])') || '[]');
    chk(!errs.length, 'sin errores de JS', errs);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
