/* EL SOBRANTE DEL COBRO EN RUTA, COMO TATU (18/11/2026). Ruta suelta, 390 px con TOQUES de verdad, POST interceptados.
     SBSES=<ses.json de sesion_prueba.py crear … santos equipo> [ANCHO=390] [BASE=http://localhost:8090]
       node _tools/pruebas/probar_sobrante_ruta.js
   Cuando el cliente paga con un billete mayor al pedido, el ERP no guarda hasta que Tatu dice qué fue el sobrante:
   «Le di vuelto», «A favor del cliente» o «Es propina» (o repartido: parte vuelto, el resto propina). Nunca un sobrante mudo.
   Caso: pedido de $17.000 en efectivo (de prueba: no existe, el POST no sale), paga con $20.000 (#2492 y #2482 del 14/11).
     1. Con $20.000 y nada elegido: el botón no guarda y pide «Elegí qué hacer con el sobrante de $3.000», con las 3 opciones.
     2. «Es propina» (un toque): propina $3.000 y deja guardar; el POST manda propina 3.000, ef 17.000 y el billete 20.000.
     3. «Le di vuelto» (un toque) y $3.000 de vuelto: cierra justo, sin propina ni a favor.
     4. Repartido: vuelto $2.000 → queda $1.000 sin explicar → vuelve a pedir; «Es propina» → propina $1.000.
     5. «A favor del cliente»: $3.000 a favor, y el segundo POST (crearSaldoCliente) lleva Crédito $3.000. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js'), prep = require('./sesion_prep.js');
const W = Number(process.env.ANCHO || 390), BASE = process.env.BASE || 'http://localhost:8090';
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c || d === undefined ? '' : '  -> ' + JSON.stringify(d).slice(0, 400))); };
const GRAB = ';(function(){var o=window.fetch;window.fetch=function(u,x){if(x&&String(x.method||"").toUpperCase()==="POST"){(window.__posts=window.__posts||[]).push(String(x.body||""));}return o.apply(this,arguments);};})();';
/* Ruta suelta ya no cobra sola: `_parseMoneyInput` usa `numAR`, que vive en el panel (en producción Ruta corre adentro de
   app.html y lo tiene). Se le da la MISMA función, leída del panel, no una copia escrita a mano. */
const NUMAR = (function () {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '_src', 'panel.src.html'), 'utf8');
  const m = /window\.numAR=function\(v,dec\)\{[\s\S]*?\r?\n\};/.exec(src);
  if (!m) throw new Error('no encontré numAR en el panel');
  return ';' + m[0] + ';';
})();
(async () => {
  if (!process.env.SBSES) { console.log('Falta SBSES'); process.exit(2); }
  process.env.PREP_SESION = '{usuario:"santos",rol:"equipo",nombre:"Santos Bullrich",ts:Date.now()}';
  const cli = await abrir(); const ev = async e => { try { return await evaluar(cli, e); } catch (x) { return { __err: String(x.message) }; } };
  const toque = async (sel) => {
    const q = await ev(`(function(){var e=${sel};if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    if (!q || q.__err) return false;
    await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
    await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pausa(350); return true;
  };
  const poner = async (id, v) => ev(`(function(){var i=document.getElementById(${JSON.stringify(id)});i.value=${JSON.stringify(v)};i.dispatchEvent(new Event('input',{bubbles:true}));_recalcCobroRuta();return 1;})()`);
  const estado = () => ev(`(function(){var r=_recalcCobroRuta(),b=document.getElementById('btnCobroRutaOk'),e=document.getElementById('cobroRutaErr');
      return {errs:(r.errors||[]).map(function(x){return String(x).replace(/<[^>]+>/g,'');}),propina:r.propina,aFav:r.aFav,camEf:r.camEf,btn:b&&b.textContent,dis:b&&b.disabled,
              opciones:e?Array.from(e.querySelectorAll('button')).map(function(x){return x.textContent;}):[]};})()`);
  const abrirCobro = async (id) => {
    await ev(`(function(){document.querySelectorAll('[id$="Overlay"],.cobro-ruta-bg').forEach(function(){});try{cerrarCobroRuta();}catch(e){}
      entregas.push({h:'Home',id:'${id}',r:${id},c:'Prueba Sobrante',t:'',$:17000,sub:17000,env:0,desc:0,fp:'Efectivo',ep:'No Cobrado',es:'Pendiente',dia:'Viernes',p:[{a:'PMa',q:1}]});
      abrirCobroRuta(eKey(entregas[entregas.length-1]));return 1;})()`);
    await pausa(500);
    await poner('cobroRecEf', '20.000');
    await pausa(250);
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, 'santos') + NUMAR + GRAB
      + ';window.confirm=function(){return true;};window.alert=function(){};' });
    await cli.enviar('Page.navigate', { url: BASE + '/ruta.html?standalone=1' });
    for (let i = 0; i < 240; i++) { if ((await ev('typeof abrirCobroRuta==="function"&&typeof entregas!=="undefined"&&typeof _recalcCobroRuta==="function"')) === true) break; await pausa(500); }
    await pausa(1500);
    /* 1 */
    await abrirCobro(99991);
    let s = await estado(); if (!s || s.__err || !s.errs) { console.log("estado:", JSON.stringify(s), JSON.stringify(await ev("({cobro:typeof abrirCobroRuta,ent:typeof entregas,n:(typeof entregas!==\"undefined\"?entregas.length:-1),err:(window.__err||[]).slice(0,3),errId:!!document.getElementById(\"cobroRutaErr\"),btn:!!document.getElementById(\"btnCobroRutaOk\")})"))); }
    chk('1. con $20.000 por $17.000 y nada elegido, no deja guardar', s.errs.some(x => /sobrante de \$3\.000/.test(x)), s);
    chk('1. ofrece «Le di vuelto», «A favor del cliente» y «Es propina»', ['Le di vuelto', 'A favor del cliente', 'Es propina'].every(o => s.opciones.indexOf(o) >= 0), s.opciones);
    /* 2 */
    chk('2. «Es propina» se toca', await toque(`Array.from(document.querySelectorAll('#cobroRutaErr button')).find(function(b){return b.textContent==='Es propina';})`));
    s = await estado();
    chk('2. propina $3.000 y ya no pide nada del sobrante', Math.abs(s.propina - 3000) < 0.5 && !s.errs.some(x => /sobrante/.test(x)), s);
    await ev('window.__posts=[];');
    await ev("(function(){var b=document.querySelector('#cobroQuienChips button, .cobro-quien-chip, [data-quien]');if(b)b.click();})()");
    await ev('confirmarCobroRuta()'); await pausa(2500);
    const posts = (await ev('window.__posts')) || [];
    const mc = posts.map(p => { try { return JSON.parse(p); } catch (e) { return null; } }).filter(p => p && p.action === 'marcarCobrado' && String(p.id) === '99991')[0];
    chk('2. el POST lleva propina 3.000, ef 17.000 y el billete 20.000', !!mc && Number(mc.propina) === 3000 && Number(mc.ef) === 17000 && Number(mc.recibidoEf) === 20000 && !(Number(mc.aFavor) > 0), mc);
    /* 3 */
    await abrirCobro(99992);
    chk('3. «Le di vuelto» se toca', await toque(`Array.from(document.querySelectorAll('#cobroRutaErr button')).find(function(b){return b.textContent==='Le di vuelto';})`));
    await pausa(300); s = await estado();
    if (!(Math.abs(s.camEf - 3000) < 0.5)) { await poner('cobroCamEf', '3.000'); await pausa(200); s = await estado(); }
    chk('3. vuelto $3.000: cierra justo, sin propina ni a favor', Math.abs(s.camEf - 3000) < 0.5 && Math.abs(s.propina) < 0.5 && !(s.aFav > 0) && !s.errs.some(x => /sobrante/.test(x)), s);
    /* 4 */
    await abrirCobro(99993);
    await toque(`Array.from(document.querySelectorAll('#cobroRutaErr button')).find(function(b){return b.textContent==='Le di vuelto';})`);
    await poner('cobroCamEf', '2.000'); await pausa(250); s = await estado();
    chk('4. vuelto $2.000: quedan $1.000 y los vuelve a pedir', s.errs.some(x => /sobrante de \$1\.000/.test(x)), s);
    await toque(`Array.from(document.querySelectorAll('#cobroRutaErr button')).find(function(b){return b.textContent==='Es propina';})`);
    s = await estado();
    chk('4. «Es propina»: propina $1.000 (repartido: $2.000 vuelto + $1.000 propina)', Math.abs(s.propina - 1000) < 0.5 && Math.abs(s.camEf - 2000) < 0.5 && !s.errs.some(x => /sobrante/.test(x)), s);
    /* 5 */
    await abrirCobro(99994);
    await toque(`Array.from(document.querySelectorAll('#cobroRutaErr button')).find(function(b){return b.textContent==='A favor del cliente';})`);
    s = await estado();
    chk('5. «A favor del cliente»: $3.000 a favor, sin propina', Math.abs(s.aFav - 3000) < 0.5 && Math.abs(s.propina) < 0.5 && !s.errs.some(x => /sobrante/.test(x)), s);
    await ev('window.__posts=[];');
    await ev("(function(){var b=document.querySelector('#cobroQuienChips button, .cobro-quien-chip, [data-quien]');if(b)b.click();})()");
    if (process.env.DEBUG) console.log('antes de confirmar 5:', JSON.stringify(await estado()), JSON.stringify(await ev("(function(){var b=document.getElementById('btnCobroRutaOk');return {st:typeof _cobroRutaState!=='undefined'&&_cobroRutaState?{key:_cobroRutaState.key}:null,txt:b&&b.textContent,dis:b&&b.disabled};})()")));
    await ev('confirmarCobroRuta()');
    if (process.env.DEBUG) { await pausa(800); console.log('despues:', JSON.stringify(await ev("({toast:(document.getElementById('toast')||document.querySelector('.toast')||{}).textContent||'',err:(window.__err||[]).slice(-3)})"))); }
    /* La guarda corta los POST y la cola los reintenta: se busca el del pedido de ESTE caso (#99994), no el primero. */
    let p5 = [], sc = null, mc5 = null;
    for (let i = 0; i < 30 && !(sc && mc5); i++) {
      await pausa(500);
      /* Lo que salió (POST) y lo que quedó en la cola esperando turno (syncQueue): el cobro va por la cola. */
      p5 = ((await ev('window.__posts')) || []).map(p => { try { return JSON.parse(p); } catch (e) { return null; } }).filter(Boolean)
        .concat((await ev('(typeof syncQueue!=="undefined"&&Array.isArray(syncQueue))?JSON.parse(JSON.stringify(syncQueue)):[]')) || []);
      sc = p5.filter(p => p.action === 'crearSaldoCliente' && String(p.pedidoId) === '99994')[0];
      mc5 = p5.filter(p => p.action === 'marcarCobrado' && String(p.id) === '99994')[0];
    }
    chk('5. el cobro (POST o cola) lleva aFavor 3.000 y crearSaldoCliente un Crédito de $3.000', !!mc5 && Number(mc5.aFavor) === 3000 && !!sc && sc.tipo === 'Crédito' && Number(sc.monto) === 3000, { mc5, sc, acciones: p5.map(p => p.action) });
    const err = await ev('window.__err||[]');
    chk('consola sin errores', !err.length, err.slice(0, 4));
  } catch (e) { mal++; console.log('  MAL  ' + e.message); }
  finally { cli.matar ? cli.matar() : cli.cerrar(); }
  console.log('\n' + ok + ' ok, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
