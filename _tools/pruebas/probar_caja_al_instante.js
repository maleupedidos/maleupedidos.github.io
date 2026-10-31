/* CAJA: el gasto y el ingreso de hoy AL INSTANTE (31/10/2026).
     BASE=http://localhost:<puerto> [APP=app_viejo_tmp.html] node _tools/pruebas/probar_caja_al_instante.js <token> [390|1440]
   Sesión real: la caja se lee de verdad (las lecturas de la base pasan) y SOLO las escrituras se cortan: contestan a
   los 3 s, aceptadas o rechazadas a propósito. No se escribe nada. Sostiene que el gasto aparece al toque en el libro
   diario con «Guardando…» y sin loader, que el formulario queda limpio, que sale UN POST con su id, y que si la base
   lo rechaza el movimiento se va y el formulario vuelve con lo tipeado. Lo mismo con un ingreso. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const TOKEN = process.argv[2], ANCHO = parseInt(process.argv[3], 10) || 390;
const BASE = process.env.BASE || 'http://localhost:8080', APP = process.env.APP || 'app.html', DEMORA = 3000;
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(250); } return false; };
const EXTRA = `window.__posts=[]; window.__rechazar=false; window.__alertas=[]; window.confirm=function(){return true;}; window.alert=function(m){window.__alertas.push(String(m));};
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||'');
    if(x&&String(x.method||'').toUpperCase()==='POST'&&!/\\/rest\\/v1\\/rpc\\/[a-z0-9_]+_(pantalla|datos|base)(\\?|$)/.test(url)){
      var b={}; try{b=JSON.parse(x.body);}catch(e){} var a=b.action||(b.p&&b.p.action)||'';
      if(a==='gasto'||a==='ingreso'||a==='borrarMovimientoCaja'||a==='descobrar'){ window.__posts.push({a:a,id:b.clientOpId||(b.p&&b.p.clientOpId)||''});
        var r=window.__rechazar?{ok:false,err:'rechazado a propósito'}:{ok:true};
        return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r),{status:200,headers:{'Content-Type':'application/json'}})); }, ${DEMORA}); }); }
    }
    return o.apply(this,arguments); }; })();`;
const FILA = (txt) => `[].slice.call(document.querySelectorAll('.cj-r')).filter(function(e){return e.textContent.indexOf(${JSON.stringify(txt)})>=0;})[0]||null`;
/* Llena el formulario (Mercado Pago, así no pide de dónde sale el efectivo), toca Guardar y cuenta hasta que la fila
   aparece con «Guardando…». */
const MOV = (pref, con, monto) => `new Promise(function(fin){
  toggleCajaForm(${JSON.stringify(pref === 'g' ? 'gasto' : 'ingreso')});
  setTimeout(function(){
    var c=document.getElementById('${pref}Cat'); if(c&&c.tagName==='SELECT'&&c.options.length>1)c.value=c.options[c.options.length-1].value;
    document.getElementById('${pref}Con').value=${JSON.stringify(con)};
    document.getElementById('${pref}MP').value=${JSON.stringify(String(monto))};
    var tap=0,t0=performance.now(),el=document.getElementById('loaderOverlay');
    var iv=setInterval(function(){ if(el&&el.classList.contains('visible'))tap=performance.now()-t0; },16);
    ${pref === 'g' ? 'guardarGasto' : 'guardarIngreso'}({preventDefault:function(){}});
    (function mira(){ var f=${FILA(con)};
      if(f&&/Guardando/.test(f.textContent)){ requestAnimationFrame(function(){ var ms=performance.now()-t0; setTimeout(function(){clearInterval(iv);fin({ms:Math.round(ms),tapa:Math.round(tap)});},300); }); return; }
      if(performance.now()-t0>${DEMORA + 4000}){ clearInterval(iv); fin({ms:-1,tapa:Math.round(tap)}); return; }
      requestAnimationFrame(mira); })();
  },500);
})`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 500 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  if (ANCHO < 500) await cli.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TOKEN, EXTRA) });
  console.log('\n=== CAJA · gasto e ingreso al instante · ' + ANCHO + ' px · ' + APP + ' ===');
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP });
  if (!await esperar(cli, `typeof go==='function'&&document.documentElement.classList.contains('listo')`, 120000)) { console.log('el ERP no arrancó'); process.exit(1); }
  await evaluar(cli, 'go("caja")');
  chk('la caja real carga el libro diario', await esperar(cli, `document.querySelectorAll('.cj-r').length>0`, 60000));
  const marca = 'Prueba toque ' + Date.now().toString(36);
  let r = await evaluar(cli, MOV('g', marca, 1234));
  chk('GASTO: aparece al toque con «Guardando…» (' + r.ms + ' ms, tope 300)', r.ms >= 0 && r.ms <= 300, r);
  chk('  sin loader', r.tapa === 0, r);
  chk('  y el formulario queda limpio', (await evaluar(cli, `document.getElementById('gCon').value`)) === '');
  await pausa(DEMORA + 2500);
  const p1 = await evaluar(cli, `JSON.stringify(__posts)`);
  chk('  salió UN POST de gasto, con su id', /^\[\{"a":"gasto","id":"[^"]+"\}\]$/.test(p1), p1);
  chk('  con la respuesta, ya no dice «Guardando…»', !(await evaluar(cli, `(function(){var f=${FILA(marca)};return !!(f&&/Guardando/.test(f.textContent));})()`)));
  // Rechazo.
  await evaluar(cli, '__rechazar=true');
  const marca2 = 'Prueba rechazo ' + Date.now().toString(36);
  r = await evaluar(cli, MOV('g', marca2, 4321));
  chk('GASTO rechazado: aparece al toque igual', r.ms >= 0 && r.ms <= 300, r);
  chk('  cuando la base lo rechaza, el movimiento se va', await esperar(cli, `!(${FILA(marca2)})`, DEMORA + 15000));
  chk('  y el formulario vuelve con lo tipeado', (await evaluar(cli, `document.getElementById('gCon').value`)) === marca2, await evaluar(cli, `document.getElementById('gCon').value`));
  await evaluar(cli, `__rechazar=false;document.getElementById('gCon').value='';document.getElementById('gMP').value='';`);
  // Ingreso.
  const marca3 = 'Prueba ingreso ' + Date.now().toString(36);
  r = await evaluar(cli, MOV('i', marca3, 777));
  chk('INGRESO: aparece al toque con «Guardando…» (' + r.ms + ' ms)', r.ms >= 0 && r.ms <= 300 && !r.tapa, r);
  // Borrar: un gasto REAL (el POST se corta: no se borra nada).
  await esperar(cli, `!document.querySelector('.cj-guardando')`, 20000);
  const fila = await evaluar(cli, `(function(){var m=(D.movimientos||[]).filter(function(x){return x.tipo==='gasto'&&Number(x.r)>1&&!x.noBorrar;})[0];return m?Number(m.r):0;})()`);
  const BOTON = `([].slice.call(document.querySelectorAll('.gl-x')).filter(function(b){var o=b.getAttribute('onclick')||'';return o.indexOf('borrarMovCaja(')>=0&&o.indexOf('gasto')>=0&&o.indexOf(','+${fila}+')')>=0;})[0]||null)`;
  if (!fila) chk('hay un gasto real para borrar', false);
  else {
    await evaluar(cli, `__rechazar=false`);
    r = await evaluar(cli, `new Promise(function(fin){ var t0=performance.now(),tap=0,el=document.getElementById('loaderOverlay');
      var iv=setInterval(function(){ if(el&&el.classList.contains('visible'))tap=performance.now()-t0; },16);
      borrarMovCaja('gasto',${fila});
      (function mira(){ if(!(${BOTON})){ requestAnimationFrame(function(){ var ms=performance.now()-t0; setTimeout(function(){clearInterval(iv);fin({ms:Math.round(ms),tapa:Math.round(tap)});},300); }); return; }
        if(performance.now()-t0>${DEMORA + 3000}){ clearInterval(iv); fin({ms:-1,tapa:Math.round(tap)}); return; } requestAnimationFrame(mira); })(); })`);
    chk('BORRAR: la fila se va al toque (' + r.ms + ' ms) y sin loader', r.ms >= 0 && r.ms <= 300 && !r.tapa, r);
    await pausa(DEMORA + 3000);
    await evaluar(cli, `__rechazar=true;__alertas=[]`);
    await esperar(cli, `!!(${BOTON})`, 20000);
    await evaluar(cli, `borrarMovCaja('gasto',${fila})`);
    chk('  rechazado: se va al toque', !(await evaluar(cli, `!!(${BOTON})`)));
    chk('  y cuando la base lo rechaza, vuelve y avisa', await esperar(cli, `!!(${BOTON})&&__alertas.length>0`, DEMORA + 15000), await evaluar(cli, `JSON.stringify(__alertas)`));
  }
  // Deshacer un cobro: un pedido REAL cobrado (el POST se corta: no cambia nada).
  const ped = await evaluar(cli, `(function(){var p=(D.pedidos||[]).filter(function(x){return x.ep==='Cobrado'&&x.h==='Home';})[0];return p?JSON.stringify({h:p.h,n:String(p.n),r:p.r||0}):'';})()`);
  if (!ped) chk('hay un pedido cobrado para deshacer', false);
  else {
    const P = JSON.parse(ped), EP = `((D.pedidos||[]).filter(function(x){return x.h===${JSON.stringify(P.h)}&&String(x.n)===${JSON.stringify(P.n)};})[0]||{}).ep`;
    await evaluar(cli, `__rechazar=true;deshacerCobro(${JSON.stringify(P.h)},${JSON.stringify(P.n)},${P.r})`);
    chk('DESHACER COBRO: al toque queda «No Cobrado», sin loader', (await evaluar(cli, EP)) === 'No Cobrado' && !(await evaluar(cli, `document.getElementById('loaderOverlay').classList.contains('visible')`)), await evaluar(cli, EP));
    chk('  y si la base lo rechaza vuelve a «Cobrado»', await esperar(cli, `${EP}==='Cobrado'`, DEMORA + 10000), await evaluar(cli, EP));
  }
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
