/* COMPRAS › PAGAR: LA FECHA Y DE DÓNDE SALE EL EFECTIVO (17/11/2026, 743). Sesión real con la guarda de solo lectura (el pago se
   corta antes de salir; además se guarda el cuerpo ENTERO de lo que se mandó).
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_pagar_fecha_lugar.js <token> [ancho] [proveedor]
   Abre «Pagar semana N» del proveedor (por defecto Sevuchitas), toca Efectivo y mide: fecha en hoy por defecto; ningún lugar
   marcado y cada uno con su saldo; un lugar que no alcanza traba el botón con «No alcanza: hay $X»; la caja fuerte lo destraba;
   «Ayer» cambia la fecha; y lo que se manda lleva fecha de ayer y lugar cf. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S, PROV] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390), PROVEEDOR = PROV || 'Sevuchitas';
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
const dmy = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}"
    + ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  // Caja primero: los saldos de cada lugar salen de ahí.
  await evaluar(cli, `try{go('caja')}catch(e){}`); await T(6000);
  for (let i = 0; i < 30; i++) { if (await evaluar(cli, `!!(typeof _lugAct==='function'&&_lugAct())`)) break; await T(1000); }
  await evaluar(cli, `try{go('busqueda')}catch(e){}`); await T(8000);
  await evaluar(cli, `try{abaSwitchTab('pagos')}catch(e){}`); await T(5000);
  // Un registro del cuerpo ENTERO de cada POST (la guarda lo recorta a 90 caracteres).
  await evaluar(cli, `(function(){var f=window.fetch;window.__cuerpos=[];window.fetch=function(u,x){try{if(x&&x.body)window.__cuerpos.push(String(u&&u.url||u)+' '+String(x.body));}catch(e){}return f.apply(this,arguments);};})()`);
  const abierto = await evaluar(cli, `(function(){var bs=[].filter.call(document.querySelectorAll('#pg-abast button'),function(b){return /^Pagar semana/.test(b.textContent.trim())&&b.offsetParent;});
    var b=bs.filter(function(x){var c=x.closest('[class*="deuda"],[class*="prov"],.card,div');for(var i=0;i<8&&c;i++){if(c.textContent.indexOf(${JSON.stringify(PROVEEDOR)})===0)return true;c=c.parentElement;}return false;})[0]||null;
    if(!b){bs=[].filter.call(document.querySelectorAll('#pg-abast button'),function(x){var c=x;for(var i=0;i<10&&c;i++){c=c.parentElement;if(c&&c.textContent.indexOf(${JSON.stringify(PROVEEDOR)})>=0&&c.textContent.length<4000)return /^Pagar semana/.test(x.textContent.trim());}return false;});b=bs[bs.length-1];}
    if(!b)return '';b.click();return b.textContent.trim();})()`);
  console.log('abrió:', abierto);
  chk(!!abierto, 'abre «Pagar semana» de ' + PROVEEDOR);
  await T(800);
  const key = await evaluar(cli, `(function(){var f=document.querySelector('.pago-form.open');return f?f.id.replace('pagoForm_',''):'';})()`);
  chk(!!key, 'formulario abierto (' + key + ')');
  const hoy = new Date(), ayer = new Date(Date.now() - 864e5);
  const f0 = JSON.parse(await evaluar(cli, `JSON.stringify({f:document.getElementById('pagoFecha_${key}').value,on:[].map.call(document.querySelectorAll('.aba-pago-dia.on[data-key="${key}"]'),function(b){return b.textContent})})`));
  chk(f0.f === dmy(hoy) && f0.on.join() === 'Hoy', 'fecha en hoy por defecto (' + f0.f + ', ' + f0.on.join() + ')');
  /* (17/11) El campo se escondía: la clase terminaba en «-i» y la regla de los íconos vacíos ([class$="-i"]:empty) lo apagaba. */
  const fv = JSON.parse(await evaluar(cli, `(function(r){return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height)})})(document.getElementById('pagoFecha_${key}').getBoundingClientRect())`));
  chk(fv.w > 80 && fv.h >= 44, 'el campo dd/mm/aaaa se ve (' + fv.w + '×' + fv.h + ')');
  await evaluar(cli, `[].filter.call(document.querySelectorAll('.pago-fp-pill[data-key="${key}"]'),function(b){return b.textContent.trim()==='Efectivo'})[0].click()`); await T(300);
  const L = JSON.parse(await evaluar(cli, `JSON.stringify([].map.call(document.querySelectorAll('.aba-pago-lug-b[data-key="${key}"]'),function(b){var r=b.getBoundingClientRect();return {id:b.getAttribute('data-lug'),t:b.innerText.replace(/\\s+/g,' '),on:b.classList.contains('on'),h:Math.round(r.height)}}))`));
  console.log('lugares:', JSON.stringify(L));
  chk(L.length >= 3, L.length + ' lugares');
  chk(L.every((x) => !x.on), 'ninguno marcado');
  chk(L.every((x) => /\$\d/.test(x.t)), 'cada uno con su saldo');
  chk(L.every((x) => x.h >= 44), 'botones ≥ 44 px');
  const ef = await evaluar(cli, `document.getElementById('pagoEf_${key}').value`);
  const b0 = await evaluar(cli, `document.getElementById('btnPagar_${key}').textContent`);
  chk(/Elegí de dónde salió/.test(b0), 'sin lugar, el botón lo pide: ' + b0 + ' (efectivo ' + ef + ')');
  await evaluar(cli, `document.querySelector('.aba-pago-lug-b[data-key="${key}"][data-lug="cob:Lucas Moresco"]').click()`); await T(300);
  const b1 = JSON.parse(await evaluar(cli, `JSON.stringify({t:document.getElementById('btnPagar_${key}').textContent,d:document.getElementById('btnPagar_${key}').disabled})`));
  chk(b1.d && /^No alcanza: hay \$0$/.test(b1.t), 'lo sin guardar de Lucas no alcanza: ' + b1.t);
  await evaluar(cli, `document.querySelector('.aba-pago-lug-b[data-key="${key}"][data-lug="cf"]').click()`); await T(300);
  const b2 = JSON.parse(await evaluar(cli, `JSON.stringify({t:document.getElementById('btnPagar_${key}').textContent,d:document.getElementById('btnPagar_${key}').disabled})`));
  chk(!b2.d && b2.t === 'Confirmar pago', 'la caja fuerte alcanza: ' + b2.t);
  await evaluar(cli, `document.querySelector('.aba-pago-dia[data-key="${key}"][data-off="-1"]').click()`); await T(300);
  const f1 = await evaluar(cli, `document.getElementById('pagoFecha_${key}').value`);
  chk(f1 === dmy(ayer), '«Ayer» pone ' + f1);
  await evaluar(cli, `(function(i){i.value='31/12/2099';i.dispatchEvent(new Event('input',{bubbles:true}))})(document.getElementById('pagoFecha_${key}'))`); await T(200);
  const b3 = await evaluar(cli, `document.getElementById('btnPagar_${key}').textContent`);
  chk(b3 === 'La fecha es de un día que no llegó', 'un día futuro traba: ' + b3);
  await evaluar(cli, `document.querySelector('.aba-pago-dia[data-key="${key}"][data-off="-1"]').click()`); await T(200);
  await evaluar(cli, `window.__cuerpos=[];document.getElementById('btnPagar_${key}').click()`); await T(3000);
  const cs = JSON.parse(await evaluar(cli, `JSON.stringify(window.__cuerpos||[])`)).filter((c) => /pagarProveedor/.test(c));
  console.log('mandó:', cs.map((c) => c.slice(0, 330)).join('\n       '));
  const iso = ayer.getFullYear() + '-' + String(ayer.getMonth() + 1).padStart(2, '0') + '-' + String(ayer.getDate()).padStart(2, '0');
  chk(cs.length >= 1 && cs.every((c) => c.indexOf('"fecha":"' + iso + '"') >= 0 && c.indexOf('"lugar":"cf"') >= 0), 'el pago va con fecha ' + iso + ' y lugar cf');
  const bl = JSON.parse(await evaluar(cli, `JSON.stringify(window.__bloqueados||[])`));
  chk(bl.some((x) => /caja_pago_directo|pagarProveedor/.test(x)), 'y la guarda lo cortó (no se escribió nada)');
  console.log(mal ? '\n' + mal + ' MAL, ' + ok + ' ok' : '\nTODO OK (' + ok + ')');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
