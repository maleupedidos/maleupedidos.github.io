/* EQUIPO (17/11/2026, 744): la lista y la ficha, con la sesión del dueño y la guarda de solo lectura (no paga nada).
     SBSES=<ses.json> BASE_URL=<app.html> node _tools/pruebas/probar_equipo.js <token> [ancho] [carpeta de capturas]
   Mide: la lista llega sin «Cargando…» suelto; el total y cada fila son los de `equipo_pantalla` (lo que dice la base, no
   una cuenta del front); Al día en verde para $0; la ficha de Santos abre con un toque real del mouse, tiene la quincena
   1–15/11 con sus renglones y el detalle se despliega; «Pagar» trae el monto vencido, nada marcado en «De dónde sale», un
   lugar que no alcanza traba el botón; Esc cierra el cuadro y después la ficha; flecha → pasa de persona; nada se corta;
   botones ≥ 44 px en el celular; consola sin errores. Con carpeta, guarda lista.png, ficha.png y pagar.png. */
'use strict';
const fs = require('fs');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S, DIR] = process.argv.slice(2), ANCHO = Number(ANCHO_S || 390);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : '';
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
async function foto(cli, nombre) {
  if (!DIR) return;
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(require('path').join(DIR, nombre), Buffer.from(r.data, 'base64'));
}
async function clic(cli, sel) {
  const r = JSON.parse(await evaluar(cli, `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'null';e.scrollIntoView({block:'center'});var b=e.getBoundingClientRect();return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2});})()`));
  if (!r) return false;
  for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
  return true;
}
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  const errores = [];
  cli.escuchar((m, e) => m === 'Runtime.exceptionThrown' && errores.push(String(e.exceptionDetails && (e.exceptionDetails.exception && e.exceptionDetails.exception.description || e.exceptionDetails.text)).slice(0, 200)));
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" + CAJON
    + ";window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(String(e.message).slice(0,160))});" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: ANCHO < 700 ? 2 : 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(8000);
  /* La marca de dueño la trae `permiso_base` (SESSION.dueno): hasta que llega, la tab no se muestra. */
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(typeof SESSION!=='undefined'&&SESSION&&SESSION.dueno)`)) break; await T(500); }
  const menu = await evaluar(cli, `(function(){var b=document.querySelector('.bn[data-p="equipo"]');return b?(b.classList.contains('role-hidden')?'oculto':'visible'):'no existe'})()`);
  chk(menu === 'visible', 'Equipo en el menú del dueño: ' + menu);
  await evaluar(cli, `try{go('equipo')}catch(e){}`);
  const sk = await evaluar(cli, `(function(){var b=document.getElementById('eqBody');return b?(b.querySelector('.eq-sk')?'esqueleto':(b.querySelector('.eq-row')?'lista':b.innerText.slice(0,40))):'sin caja'})()`);
  console.log('  al entrar:', sk);
  chk(!/Cargando/.test(await evaluar(cli, `document.getElementById('eqBody').innerText`)), 'sin «Cargando…» suelto');
  for (let i = 0; i < 40; i++) { if (await evaluar(cli, `!!(EQ.d&&!EQ.vuelo&&!EQ.viejo&&document.querySelector('#eqBody .eq-row'))`)) break; await T(500); }
  await T(400);
  const L = JSON.parse(await evaluar(cli, `JSON.stringify({tot:(document.querySelector('.eq-res-m')||{}).textContent,
    sub:(document.querySelector('.eq-res-s')||{}).textContent,
    filas:[].map.call(document.querySelectorAll('#eqBody .eq-row'),function(r){var b=r.getBoundingClientRect(),h=r.querySelector('.eq-hoy'),a=r.querySelector('.eq-aldia'),n=r.querySelector('.eq-nom');
      return {p:r.dataset.p,hoy:h?h.textContent:'',aldia:!!a,h:Math.round(b.height),corta:n.scrollWidth>n.clientWidth+1||(h&&h.scrollWidth>h.clientWidth+1)};}),
    base:EQ.d.personas.map(function(p){return {p:p.persona,hoy:_eqP(p.hoy),cero:!(p.hoy>0.5),acc:p.grupo==='accionistas'}}), baseTot:_eqP(EQ.d.aPagarHoy),
    scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1})`));
  console.log('  ', L.tot, '·', L.sub);
  L.filas.forEach((f) => console.log('     ', f.p, '·', f.hoy || 'Al día'));
  chk(L.tot === L.baseTot, 'el total es el de la base: ' + L.tot);
  chk(L.filas.length === L.base.length && L.filas.length >= 8, L.filas.length + ' personas');
  chk(L.filas.every((f, i) => f.p === L.base[i].p && (L.base[i].acc ? !f.hoy && !f.aldia : (L.base[i].cero ? f.aldia : f.hoy === L.base[i].hoy))), 'cada fila dice lo de la base («Al día» en $0, los accionistas sin plata)');
  chk(L.filas.every((f) => f.h >= 44), 'filas ≥ 44 px');
  chk(!L.filas.some((f) => f.corta), 'ningún nombre ni monto cortado');
  chk(!L.scroll, 'sin scroll de costado');
  const quien = { tadeo: L.filas.find((f) => /^Tadeo/.test(f.p)), tatu: L.filas.find((f) => /^Santos/.test(f.p)), lucas: L.filas.find((f) => /^Lucas/.test(f.p)) };
  chk(quien.tadeo && quien.tadeo.hoy === '$600.000', 'Tadeo $600.000 hoy');
  chk(quien.tatu && quien.tatu.hoy === '$224.722,25', 'Tatu $224.722,25 hoy');
  chk(quien.lucas && quien.lucas.aldia, 'Lucas al día');
  await foto(cli, 'lista.png');
  /* Palabras (la regla de texto.js: sin números ni montos, sin nombres propios, sin lo de adentro de un botón corto). */
  await evaluar(cli, `window.__eqPalabras=function(raiz){var n=0;var w=document.createTreeWalker(raiz,NodeFilter.SHOW_TEXT);var t;
    while((t=w.nextNode())){var e=t.parentElement;if(!e||!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;
      var b=e.closest('button,a,summary,label,.eq-tag,.eqf-est');if(b&&b.innerText.trim().split(/\\s+/).length<=5)continue;
      var ws=t.textContent.trim().split(/\\s+/).filter(Boolean);ws.forEach(function(x,i){if(/[0-9$]/.test(x))return;if(i>0&&/^[A-ZÁÉÍÓÚÑ]/.test(x))return;if(/^[·–—-]$/.test(x))return;n++;});}
    return n;}`);
  const pl = await evaluar(cli, `__eqPalabras(document.getElementById('eqBody'))`);
  chk(pl > 5 && pl <= 120, 'la lista tiene ' + pl + ' palabras (≤ 120)');
  // Filtro Red
  await clic(cli, '.eq-chip[data-f="red"]'); await T(250);
  const nRed = await evaluar(cli, `document.querySelectorAll('#eqBody .eq-row').length`);
  const nRedB = await evaluar(cli, `EQ.d.personas.filter(function(p){return p.grupo==='red'}).length`);
  chk(nRed === nRedB && nRed >= 4, 'filtro Red: ' + nRed);
  await clic(cli, '.eq-chip[data-f="todos"]'); await T(250);
  // La ficha de Tatu con un toque real
  await clic(cli, '.eq-row[data-p="Santos Bullrich"]'); await T(450);
  const F = JSON.parse(await evaluar(cli, `(function(){var ov=document.getElementById('eqFicha'),p=ov&&ov.querySelector('.eqf-panel'),r=p&&p.getBoundingClientRect();
    var hit=r?document.elementFromPoint(r.left+r.width/2,r.top+120):null;
    return JSON.stringify({on:!!(ov&&ov.classList.contains('on')),nom:(document.getElementById('eqfNom')||{}).textContent,x:r?Math.round(r.left):-1,w:r?Math.round(r.width):0,
      encima:!!(hit&&hit.closest&&hit.closest('#eqFicha')),kpi:[].map.call(ov.querySelectorAll('.eqf-kpi b'),function(b){return b.textContent}),
      qs:[].map.call(ov.querySelectorAll('.eqf-q'),function(q){return q.querySelector('.eqf-q-h b').textContent+' '+q.querySelector('.eqf-est').textContent+' :: '+[].map.call(q.querySelectorAll('.eqf-l'),function(l){return l.querySelector('.eqf-c').textContent+'='+l.querySelector('.eqf-m').textContent}).join(' | ')}),
      pie:(ov.querySelector('.eqf-pagar')||{}).textContent})})()`));
  console.log('   ficha:', JSON.stringify(F));
  chk(F.on && F.nom === 'Santos Bullrich' && F.encima, 'la ficha de Tatu abre arriba de todo');
  chk(F.kpi[0] === '$224.722,25', 'A pagar hoy $224.722,25');
  chk(F.qs.some((q) => /^1–15\/11 Vencida :: Sueldo=\$175\.000 \| Premios · 2 clientes nuevos=\$30\.000 \| Propinas=\$19\.722,25/.test(q)), 'la 1–15/11 explicada renglón por renglón');
  chk(F.qs.some((q) => /^16–30\/11 En curso/.test(q)), 'la 16–30/11 en curso');
  chk(F.pie === 'Pagar $224.722,25', 'botón principal: ' + F.pie);
  await foto(cli, 'ficha.png');
  const pf = await evaluar(cli, `__eqPalabras(document.querySelector('#eqFicha .eqf-panel'))`);
  chk(pf > 10 && pf <= 120, 'la ficha tiene ' + pf + ' palabras (≤ 120)');
  const sim = await evaluar(cli, `(document.getElementById('eqBody').innerText+document.querySelector('#eqFicha .eqf-panel').innerText).match(/[\\u2190-\\u21FF\\u2600-\\u27BF\\u2713\\u2714\\u2715\\u2716\\u25B2-\\u25BF]|[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]/g)`);
  chk(!sim, 'sin símbolos ni emojis' + (sim ? ': ' + sim.join(' ') : ''));
  // Desplegar «Premios»
  await clic(cli, '#eqFicha .eqf-q details.eqf-l summary'); await T(300);
  const det = JSON.parse(await evaluar(cli, `JSON.stringify([].map.call(document.querySelectorAll('#eqFicha details.eqf-l[open] .eqf-d'),function(d){return d.innerText.replace(/\\s+/g,' ')}))`));
  console.log('   premios:', JSON.stringify(det));
  chk(det.length === 2 && det.every((x) => /#\d+/.test(x)), 'Premios → los 2 clientes con su pedido');
  const cortado = await evaluar(cli, `[].some.call(document.querySelectorAll('#eqFicha details.eqf-l[open] .eqf-d small'),function(s){return s.scrollWidth>s.clientWidth+1})`);
  chk(!cortado, 'el pedido y la fecha de cada cliente entran enteros');
  await foto(cli, 'ficha_detalle.png');
  // Pagar
  await clic(cli, '#eqFicha .eqf-pie .eqf-pagar'); await T(1500);
  for (let i = 0; i < 20; i++) { if (await evaluar(cli, `!!(_lugAct&&_lugAct())`)) break; await T(700); }
  await evaluar(cli, `_eqFichaRepintar(true)`); await T(200);
  const P = JSON.parse(await evaluar(cli, `JSON.stringify({m:(document.getElementById('eqpMonto')||{}).value,ops:[].map.call(document.querySelectorAll('#eqFicha .eqp-op:not(.dia)'),function(b){var r=b.getBoundingClientRect();return {t:b.innerText.replace(/\\s+/g,' '),on:b.classList.contains('on'),h:Math.round(r.height),o:b.dataset.o}}),
    dia:[].map.call(document.querySelectorAll('#eqFicha .eqp-op.dia.on'),function(b){return b.textContent}),btn:document.getElementById('eqpBtn').textContent})`));
  console.log('   pagar:', JSON.stringify(P));
  chk(P.m === '224722,25', 'monto por defecto: lo vencido (' + P.m + ')');
  chk(P.dia.join() === 'Hoy', 'fecha: hoy');
  chk(P.ops.length >= 3 && P.ops.every((o) => !o.on), P.ops.length + ' lugares, ninguno marcado');
  chk(P.ops.every((o) => /\$/.test(o.t)), 'cada lugar con su saldo');
  chk(/^Elegí de dónde sale$/.test(P.btn), 'sin lugar, el botón lo pide');
  if (ANCHO < 700) chk(P.ops.every((o) => o.h >= 44), 'lugares ≥ 44 px');
  const flaco = P.ops.filter((o) => /^bil:|^cob:/.test(o.o)).map((o) => ({ o: o.o, s: Number((o.t.match(/\$([\d.]+)/) || [0, '0'])[1].replace(/\./g, '')) })).sort((a, b) => a.s - b.s)[0];
  if (flaco) {
    await clic(cli, '#eqFicha .eqp-op[data-o="' + flaco.o + '"]'); await T(250);
    const b1 = JSON.parse(await evaluar(cli, `JSON.stringify({t:document.getElementById('eqpBtn').textContent,d:document.getElementById('eqpBtn').disabled})`));
    chk(b1.d && /^No alcanza: hay/.test(b1.t), 'un lugar que no alcanza traba: ' + b1.t);
  }
  await foto(cli, 'pagar.png');
  // Esc: primero el cuadro, después la ficha
  await cli.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await T(250);
  chk(await evaluar(cli, `!EQ.pago&&document.getElementById('eqFicha').classList.contains('on')`), 'Esc cierra el cuadro de pagar');
  await evaluar(cli, `document.activeElement&&document.activeElement.blur()`);
  await cli.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await T(250);
  const sig = await evaluar(cli, `EQ.abierto`);
  chk(sig && sig !== 'Santos Bullrich', 'flecha → pasa a ' + sig);
  await cli.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await T(300);
  chk(await evaluar(cli, `!document.getElementById('eqFicha').classList.contains('on')`), 'Esc cierra la ficha');
  /* (745) Un representante con efectivo sin rendir: aviso en la lista, sección en la ficha y el neto arriba de Pagar. */
  const sr = await evaluar(cli, `(EQ.d.personas.filter(function(p){return p.sinRendir>0.5})[0]||{}).persona||''`);
  if (sr) {
    const al = await evaluar(cli, `(function(){var r=document.querySelector('.eq-row[data-p="${sr}"] .eq-alerta');return r?r.textContent:''})()`);
    chk(/^Tiene \$[\d.]+ sin rendir$/.test(al), sr + ' en la lista: ' + al);
    await clic(cli, '.eq-row[data-p="' + sr + '"]'); await T(450);
    const R = JSON.parse(await evaluar(cli, `JSON.stringify({sec:[].map.call(document.querySelectorAll('#eqFicha .eqf-sr-d'),function(d){return d.innerText.replace(/\\s+/g,' ')}),
      neto:(document.querySelector('#eqFicha .eqf-neto')||{}).textContent||'',rec:(document.querySelector('#eqFicha .eqf-recibi')||{}).textContent||'',
      wa:(document.querySelector('#eqFicha a[href^="https://wa.me/"]')||{}).href||'',kpi:[].map.call(document.querySelectorAll('#eqFicha .eqf-kpi'),function(k){return Math.round(k.getBoundingClientRect().height)})})`));
    console.log('   ' + sr + ':', JSON.stringify(R));
    chk(R.sec.length >= 1 && R.sec.every((x) => /Red #\d+/.test(x)), 'sección «Efectivo sin rendir» con sus pedidos');
    chk(/^Le pagás \$[\d.]+ · te tiene que dar \$[\d.]+$/.test(R.neto), 'el neto arriba de Pagar: ' + R.neto);
    chk(/^Recibí el efectivo de /.test(R.rec), 'botón «' + R.rec + '»');
    chk(/^https:\/\/wa\.me\/549\d{10}$/.test(R.wa) || !R.wa, 'WhatsApp: ' + (R.wa || 'sin teléfono'));
    chk(R.kpi.length === 2 && R.kpi[0] === R.kpi[1], 'las dos tarjetas del mismo alto (' + R.kpi.join('/') + ')');
    await foto(cli, 'ficha_sin_rendir.png');
    await cli.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await T(300);
  }
  const errs = JSON.parse(await evaluar(cli, `JSON.stringify(window.__errs||[])`)).concat(errores);
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  const bl = JSON.parse(await evaluar(cli, `JSON.stringify(window.__bloqueados||[])`));
  console.log('   POST cortados por la guarda:', bl.length);
  console.log(`\n${ok} ok, ${mal} mal`);
  cli.matar();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
