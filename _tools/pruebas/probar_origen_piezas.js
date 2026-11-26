/* LA CARNE POR PIEZA EN EL ORIGEN (11/11/2026, 652).
     SBSES=<sbses.json> BASE_URL=http://localhost:PUERTO/app.html node _tools/pruebas/probar_origen_piezas.js [ancho] [Hoja|N]
   Abre la tarjeta de un pedido real con carne (por defecto Pilar|2444) y, con la base y el guardado INTERCEPTADOS
   (no se escribe nada):
     · el renglón del corte muestra sus piezas (libres y del pedido), de ≥ 44 px, con las del pedido marcadas;
     · tocar piezas suma sus kilos en el texto y llena el origen: del freezer lo que pesan (hasta lo pedido), el resto a OC;
     · un rato después manda a la base `pedido_piezas_marcar` con EXACTAMENTE las piezas marcadas, y después el origen
       (setOrigenProductos) con esos d / oc / w;
     · si la base dice que no, avisa y no guarda el origen. */
'use strict';
const path = require('path');
const { abrir, evaluar } = require(path.join(__dirname, 'cdp.js'));
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const a = process.argv.slice(2), ANCHO = Number(a[0] || 390), K = a[1] || 'Pilar|2444';
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require(path.join(__dirname, 'sesion_prep.js'))('x');
const guarda = require(path.join(__dirname, 'sbses_guarda.js'));
const SBSES = guarda(process.env.SBSES, process.env.USUARIO || 'tadeo');
if (!SBSES) { console.error('falta SBSES'); process.exit(2); }
const ATAJO = `(function(){
  window.__orPost=[]; window.__pzRpc=[]; window.__pzFalla=null;
  _ordenPost=function(b){ window.__orPost.push(JSON.parse(JSON.stringify(b)));
    return new Promise(function(ok){ setTimeout(function(){ ok({json:function(){return {ok:true};}}); },300); }); };
  _recargarPedidos=function(){ return Promise.resolve(); };
  _pfAplicar=function(){ return Promise.resolve(); };
  var _o=_baseRpc;
  _baseRpc=function(rpc,args){
    if(rpc!=='pedido_piezas_marcar')return _o.apply(this,arguments);
    window.__pzRpc.push(JSON.parse(JSON.stringify(args)));
    if(window.__pzFalla)return Promise.reject(new Error(window.__pzFalla));
    var c=CARNE_DATA.porCorte[args.p.a], ids=args.p.piezas, kg=0, l=[];
    (c.piezas||[]).forEach(function(z){ if(ids.indexOf(z.id)>=0){ kg+=Number(z.peso)||0; l.push({id:z.id,kg:Number(z.peso),dep:z.dep}); } });
    return Promise.resolve({ok:true,kg:Math.round(kg*1000)/1000,piezas:l});
  };
})()`;
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } };
const card = `document.querySelector('.pc[data-pc-key="${K}"]')`;
(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    if (ANCHO < 700) await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.navigate', { url: URL });
    await T(3000);
    if (!(await guarda.verificarGuarda(cli, evaluar))) throw new Error('la guarda de solo lectura no corta');
    await T(9000);
    await evaluar(cli, "fC='Todos';fE='Todos';go('pedidos')"); await T(8000);
    await evaluar(cli, ATAJO);
    /* SOLO_CARNE=Deposito|Pendiente: el pedido, EN MEMORIA, queda de solo carne con ese origen (no se escribe nada). Desde
       el 11/11 noche el selector de piezas también está en esos pedidos. */
    if (process.env.SOLO_CARNE) {
      const n = await evaluar(cli, `(function(){var k=${JSON.stringify(K)};var p=(D.pedidos||[]).filter(function(x){return x.h+'|'+x.n===k;})[0];if(!p)return -1;
        p.p=p.p.filter(function(r){return _esCarne(r.a);});p.o=${JSON.stringify(process.env.SOLO_CARNE)};render();return p.p.length;})()`);
      chk(n > 0, `${K} en memoria: solo carne (${n} cortes), origen ${process.env.SOLO_CARNE}`, n);
      chk(await evaluar(cli, `_origenEditable((D.pedidos||[]).filter(function(x){return x.h+'|'+x.n===${JSON.stringify(K)};})[0])`) === true, 'el editor de origen está (solo carne)');
      chk(await evaluar(cli, `_pedOrigenPendiente((D.pedidos||[]).filter(function(x){return x.h+'|'+x.n===${JSON.stringify(K)};})[0])`) === false, 'y no cuenta como «sin origen»');
    }
    await evaluar(cli, 'pedBuscar(' + JSON.stringify(K.split('|')[1]) + ',false)'); await T(900);
    await evaluar(cli, `(function(){var c=${card};if(c&&c.classList.contains('collapsed'))c.querySelector('.pc-summary').click();})()`); await T(1500);
    // Las piezas pueden tardar en llegar la primera vez (se piden al abrir).
    for (let i = 0; i < 20 && !(await evaluar(cli, `!!(${card}&&${card}.querySelector('.or-pz-b'))`)); i++) { await T(1000); await evaluar(cli, 'try{_orRender()}catch(e){}'); await evaluar(cli, `(function(){var c=${card};if(c&&c.classList.contains('collapsed'))c.querySelector('.pc-summary').click();})()`); }
    /* El corte con piezas LIBRES (si no, el primero con piezas): ahí se puede marcar y soltar. */
    const pz = JSON.parse(await evaluar(cli, `JSON.stringify((function(){var c=${card};var bs=c?[].slice.call(c.querySelectorAll('.or-pz')).filter(function(x){return x.querySelector('.or-pz-b');}):[];
      var b=bs.filter(function(x){return x.querySelector('.or-pz-b:not(.on)');})[0]||bs[0];if(!b)return null;
      return {a:b.dataset.a,q:+b.dataset.q,row:b.dataset.row,bot:[].map.call(b.querySelectorAll('.or-pz-b'),function(x){var r=x.getBoundingClientRect();return {id:x.dataset.id,kg:+x.dataset.kg,dep:x.dataset.dep,on:x.classList.contains('on'),h:r.height};})};})())`));
    chk(!!(pz && pz.bot.length), `${K}: el renglón de carne muestra sus piezas`, pz);
    if (!pz || !pz.bot.length) throw new Error('sin piezas para probar');
    chk(pz.bot.every((b) => b.h >= 43.5), 'cada pieza mide ≥ 44 px', pz.bot.map((b) => b.h));
    const libres = pz.bot.filter((b) => !b.on), mias = pz.bot.filter((b) => b.on);
    console.log('   ' + pz.a + ' · pedido ' + pz.q + ' kg · del pedido: ' + mias.map((b) => b.id + ' ' + b.kg).join(', ') + ' · libres: ' + libres.map((b) => b.id + ' ' + b.kg).join(', '));
    const tocar = async (id) => {
      const p = JSON.parse(await evaluar(cli, `(function(){var e=${card}.querySelector('.or-pz-b[data-id="${id}"]');e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()`));
      await T(250);
      if (ANCHO < 700) { await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] }); await T(50); await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
      await T(150);
    };
    // Cambiar de verdad, en toques seguidos: soltar las del pedido y marcar la primera libre (si no hay libres, soltar
    // todas menos la primera).
    const quedan = libres.length ? [libres[0]] : [mias[0]];
    if (libres.length) { for (const b of mias) await tocar(b.id); await tocar(libres[0].id); }
    else for (const b of mias.slice(1)) await tocar(b.id);
    if (!libres.length && mias.length < 2) throw new Error('ese corte no tiene nada que cambiar');
    const kg1 = quedan.reduce((s, b) => s + b.kg, 0), oc1 = Math.max(0, Math.round((pz.q - kg1) * 1000) / 1000);
    const celdas = JSON.parse(await evaluar(cli, `JSON.stringify({d:+document.querySelector('input[data-row="${pz.row}"][data-role="d"]').value,oc:+document.querySelector('input[data-row="${pz.row}"][data-role="oc"]').value,t:document.getElementById('orpzt-${pz.row}').textContent})`));
    chk(Math.abs(celdas.d - Math.min(kg1, pz.q)) < 0.0015 && Math.abs(celdas.oc - oc1) < 0.0015, `una pieza (${kg1} kg): del freezer ${Math.min(kg1, pz.q)}, a OC ${oc1}`, celdas);
    chk(/Marcadas/.test(celdas.t), 'el texto suma los kilos marcados', celdas.t);
    await T(2500);
    const env = JSON.parse(await evaluar(cli, 'JSON.stringify({rpc:window.__pzRpc,post:window.__orPost})'));
    const ult = env.rpc[env.rpc.length - 1];
    chk(env.rpc.length === 1, 'los toques seguidos son UN solo envío a la base', env.rpc.length);
    chk(!!ult && JSON.stringify(ult.p.piezas) === JSON.stringify(quedan.map((b) => b.id)) && ult.p.a === pz.a && ult.p.hoja + '|' + ult.p.id === K,
      'manda a pedido_piezas_marcar exactamente la pieza marcada', ult);
    const post = env.post[env.post.length - 1], pr = post && (post.productos || []).find((x) => x.a === pz.a);
    chk(!!pr && Math.abs(pr.d - Math.min(kg1, pz.q)) < 0.0015 && Math.abs(pr.oc - oc1) < 0.0015,
      'y después guarda el origen con esos kilos', post);
    if (pr && pr.w) chk(Math.abs(Object.values(pr.w).reduce((s, x) => s + x, 0) - pr.d) < 0.0015 && pr.w[quedan[0].dep] > 0, 'lo del freezer, en el freezer de la pieza', pr.w);
    // Si la base dice que no: aviso y sin guardar el origen.
    await evaluar(cli, "window.__pzFalla='la pieza P-X ya la tiene otro pedido';window.__orPost=[];window.__pzRpc=[]");
    const otra = pz.bot.find((b) => b.id !== quedan[0].id);
    if (otra) {
      await tocar(otra.id); await T(2500);
      const f = JSON.parse(await evaluar(cli, `JSON.stringify({post:window.__orPost.length,rpc:window.__pzRpc.length,est:(${card}.querySelector('.or-est')||{}).textContent||''})`));
      chk(f.rpc === 1 && f.post === 0 && /No se marcaron/.test(f.est), 'si la base dice que no: avisa y NO guarda el origen', f);
    }
    const errs = JSON.parse(await evaluar(cli, 'JSON.stringify(window.__errores||[])') || '[]');
    chk(!errs.length, 'sin errores de JS', errs);
  } catch (e) { mal++; console.log('  REVENTO: ' + (e && e.stack || e)); }
  console.log(`\n  ${ok} ok · ${mal} MAL\n`);
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
