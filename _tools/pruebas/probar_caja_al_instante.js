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
const EXTRA = `window.__posts=[]; window.__rechazar=false;
  (function(){ var o=window.fetch; window.fetch=function(u,x){ var url=String((u&&u.url)||u||'');
    if(x&&String(x.method||'').toUpperCase()==='POST'&&!/\\/rest\\/v1\\/rpc\\/[a-z0-9_]+_(pantalla|datos|base)(\\?|$)/.test(url)){
      var b={}; try{b=JSON.parse(x.body);}catch(e){} var a=b.action||(b.p&&b.p.action)||'';
      if(a==='gasto'||a==='ingreso'){ window.__posts.push({a:a,id:b.clientOpId||(b.p&&b.p.clientOpId)||''});
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
  chk('sin errores de JS', (await evaluar(cli, `JSON.stringify(window.__errores||[])`)) === '[]', await evaluar(cli, `JSON.stringify(window.__errores||[])`));
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
