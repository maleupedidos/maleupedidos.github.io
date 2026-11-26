/* LOS TEXTOS QUE CAMBIA TADEO (18/11/2026, 754). WebKit con perfil de iPhone (390×844, táctil) y la sesión del dueño.
   Toda escritura cortada MENOS las dos de textos (texto_set_directo y texto_volver_directo): la prueba cambia un texto de
   verdad y lo vuelve al original al final.
     PW=<playwright-core> SES_ADMIN=<ses.json> BASE=<url app.html> [ANCHO=390] node _tools/pruebas/probar_textos.js
   1) El lápiz aparece (dueño), se prende con un toque, y en la ficha de Equipo «Sueldo fijo» queda marcado; el nombre y los
      montos, no.
   2) Un toque sobre «Sueldo fijo» abre el cuadro (y no hace lo que haría el toque); se cambia «solo en Equipo».
   3) Se ve cambiado en la ficha y en la lista de Equipo; «Sueldos fijos» (otra frase) no se toca.
   4) OTRO dispositivo (sin la copia): entra y lo ve cambiado.
   5) Ajustes › Textos cambiados lo lista; «Volver al original» lo devuelve en los dos.
   Consola sin errores. */
'use strict';
const fs = require('fs');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8080/app.html';
const ANCHO = Number(process.env.ANCHO || 390), MOVIL = ANCHO < 700;
const NUEVO = 'Sueldo base prueba';
let ok = 0, mal = 0;
const chk = (c, t) => { if (c) { ok++; console.log('  ok  ', t); } else { mal++; console.log('  MAL ', t); } };
function init(ses) {
  return `try{localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',ts:Date.now(),dueno:true}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase(); var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^mi_deposito$|^demanda_por_deposito$|^catalogo_(red|ruta)$|^tienda_vendedores$|^texto_(set|volver)_directo$/.test(r[1])))
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();
    window.__errs=[];window.addEventListener('error',function(e){if(!/ResizeObserver/.test(e.message))window.__errs.push(String(e.message).slice(0,160));});`;
}
async function abrirEquipo(pg) {
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && SESSION && SESSION.dueno, null, { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(3000);
  await pg.evaluate(() => go('equipo'));
  await pg.waitForFunction(() => typeof EQ !== 'undefined' && EQ.d && document.querySelector('#eqBody .eq-row'), null, { timeout: 40000 }).catch(() => {});
  await pg.waitForTimeout(3500);   // los textos de la base llegan a los 2,5 s
}
const textoEn = (sel) => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.innerText.replace(/\\s+/g,' '):'';})()`;
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES_ADMIN, 'utf8'));
  const br = await pw.webkit.launch();
  const opc = { viewport: { width: ANCHO, height: MOVIL ? 844 : 900 }, deviceScaleFactor: MOVIL ? 3 : 1, isMobile: MOVIL, hasTouch: MOVIL };
  const ctx = await br.newContext(opc); await ctx.addInitScript(init(ses));
  const pg = await ctx.newPage();
  const tocar = async (x, y) => { if (MOVIL) await pg.touchscreen.tap(x, y); else await pg.mouse.click(x, y); };
  await abrirEquipo(pg);
  // Que no quede nada de una corrida anterior.
  await pg.evaluate(() => Promise.all((TXO.l || []).filter((x) => x.original === 'Sueldo fijo').map((x) => _baseRpcCrudo('texto_volver_directo', { p: { id: x.id } }))).then(() => txoCargar()));
  // 1) El lápiz (antes de abrir la ficha, que en el celular tapa el encabezado) y lo marcado.
  const b = await pg.evaluate(() => { const e = document.getElementById('txoBtn'); const r = e && e.getBoundingClientRect(); return e && !e.hidden && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; });
  chk(!!b, '1) el lápiz está en el encabezado (dueño)');
  if (b) await tocar(b.x, b.y);
  await pg.waitForTimeout(800);
  /* Con el modo prendido, tocar la fila (un nombre: no se puede cambiar) abre la ficha como siempre. */
  const fila = await pg.evaluate(() => { const e = document.querySelector('#eqBody .eq-row[data-p="Tadeo Ustariz"] .eq-nom'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (fila) await tocar(fila.x, fila.y);
  await pg.waitForTimeout(1500);
  chk(await pg.evaluate(() => !!document.querySelector('#eqFicha.on') && EQ.abierto === 'Tadeo Ustariz'), '   con el modo prendido, tocar el nombre abre la ficha como siempre');
  const M = await pg.evaluate(() => {
    const h = window.CSS && CSS.highlights && CSS.highlights.get('txo'), tx = [];
    if (h) h.forEach((r) => tx.push(String(r.startContainer.nodeValue || '').trim()));
    return { modo: document.body.classList.contains('txo-editar'), n: tx.length, sueldo: tx.indexOf('Sueldo fijo') >= 0, nombre: tx.indexOf('Tadeo Ustariz') >= 0, plata: tx.some((t) => /\$|\d/.test(t)) };
  });
  console.log('   marcados:', JSON.stringify(M));
  chk(M.modo && M.n > 0, '   modo textos prendido, ' + M.n + ' textos marcados');
  chk(M.sueldo && !M.nombre && !M.plata, '   «Sueldo fijo» marcado; el nombre y los montos, no');
  // 2) Tocar «Sueldo fijo» en la ficha.
  const s = await pg.evaluate(() => { const w = document.createTreeWalker(document.getElementById('eqFicha'), NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) if (n.nodeValue.trim() === 'Sueldo fijo') { const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; } return null; });
  chk(!!s, '2) «Sueldo fijo» está en la ficha');
  if (process.env.DEBUG && s) console.log('   dbg antes', await pg.evaluate((p) => { window.__dbg = []; ['pointerdown', 'touchend', 'click'].forEach((n) => window.addEventListener(n, (e) => window.__dbg.push(n + ':' + (e.target.className || e.target.tagName) + (e.defaultPrevented ? ' prev' : '')), true));
    const r = document.caretRangeFromPoint(p.x, p.y); const el = document.elementFromPoint(p.x, p.y); return JSON.stringify({ caret: r ? (r.startContainer.nodeType + ':' + String(r.startContainer.nodeValue || r.startContainer.className).slice(0, 30)) : null, el: el && (el.className || el.tagName), cur: getComputedStyle(el).cursor }); }, s));
  if (s) await tocar(s.x, s.y);
  await pg.waitForTimeout(600);
  if (process.env.DEBUG) console.log('   dbg', await pg.evaluate(() => JSON.stringify(window.__dbg)));
  const P = await pg.evaluate(() => ({ pop: !!document.querySelector('.txo-pop'), h: (document.querySelector('.txo-pop-h') || {}).textContent || '', ficha: !!document.querySelector('#eqFicha.on') }));
  chk(P.pop && /Sueldo fijo/.test(P.h) && P.ficha, '   el toque abre el cuadro («' + P.h + '») y la ficha sigue abierta');
  await pg.fill('#txoIn', NUEVO);
  const bb = await pg.evaluate(() => { const e = document.querySelector('.txo-pop .txo-b1'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: e.textContent }; });
  chk(/Solo en/.test(bb.t), '   pregunta: «' + bb.t + '» o «En todo el ERP»');
  await tocar(bb.x, bb.y);
  await pg.waitForTimeout(2500);
  // 3) Cambiado en Equipo; otra frase no.
  const C = await pg.evaluate((nv) => ({ ficha: document.getElementById('eqFicha').innerText.indexOf(nv) >= 0, viejo: /(^|\n)Sueldo fijo(\n|$)/.test(document.getElementById('eqFicha').innerText),
    lista: [].some.call(document.querySelectorAll('#eqBody .eq-cobra'), (e) => e.textContent.trim() === nv), pop: !!document.querySelector('.txo-pop') }), NUEVO);
  chk(C.ficha && !C.pop, '3) en la ficha dice «' + NUEVO + '»');
  chk(C.lista, '   y en la lista de Equipo también (misma pantalla)');
  const parte = await pg.evaluate(() => { const d = document.createElement('span'); d.id = 'txoPrueba'; d.textContent = 'Sueldos fijos'; const d2 = document.createElement('span'); d2.id = 'txoPrueba2'; d2.textContent = 'Sueldo fijo mensual';
    document.getElementById('eqBody').appendChild(d); document.getElementById('eqBody').appendChild(d2);
    return new Promise((ok) => setTimeout(() => { ok([d.textContent, d2.textContent]); d.remove(); d2.remove(); }, 200)); });
  chk(parte[0] === 'Sueldos fijos' && parte[1] === 'Sueldo fijo mensual', '   «Sueldos fijos» y «Sueldo fijo mensual» no se tocan (solo el texto entero)');
  // 4) Otro dispositivo, sin copia.
  const ctx2 = await br.newContext(opc); await ctx2.addInitScript(init(ses));
  const pg2 = await ctx2.newPage();
  await abrirEquipo(pg2);
  const otro = await pg2.evaluate((nv) => [].some.call(document.querySelectorAll('#eqBody .eq-cobra'), (e) => e.textContent.trim() === nv), NUEVO);
  chk(otro, '4) en OTRO dispositivo, Equipo dice «' + NUEVO + '»');
  // 5) Ajustes › Textos cambiados › Volver al original.
  await pg.evaluate(() => { txoModo(false); eqCerrar(); go('ajustes'); ajGo('textos'); }); await pg.waitForTimeout(2500);
  const A = await pg.evaluate(() => ({ t: (document.querySelector('#ajBody .txo-lista') || {}).innerText || '' }));
  chk(/Sueldo fijo/.test(A.t) && /Sueldo base prueba/.test(A.t), '5) Ajustes › Textos cambiados lo lista: «' + A.t.replace(/\s+/g, ' ').slice(0, 90) + '»');
  const v = await pg.evaluate(() => { const e = [].filter.call(document.querySelectorAll('#ajBody .txo-fila'), (f) => /Sueldo base prueba/.test(f.innerText))[0]; const b = e && e.querySelector('button'); const r = b && b.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height } : null; });
  if (MOVIL) chk(v && v.h >= 44, '   «Volver al original» mide ' + (v && Math.round(v.h)) + ' px');
  if (v) await tocar(v.x, v.y);
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => go('equipo')); await pg.waitForTimeout(1500);
  const vuelto = await pg.evaluate(() => [].some.call(document.querySelectorAll('#eqBody .eq-cobra'), (e) => e.textContent.trim() === 'Sueldo fijo'));
  chk(vuelto, '   volvió al original en este dispositivo');
  await pg2.reload({ waitUntil: 'domcontentloaded' }); await pg2.waitForTimeout(3000);
  await pg2.evaluate(() => go('equipo')); await pg2.waitForTimeout(5000);
  const vuelto2 = await pg2.evaluate(() => [].some.call(document.querySelectorAll('#eqBody .eq-cobra'), (e) => e.textContent.trim() === 'Sueldo fijo'));
  chk(vuelto2, '   y en el otro');
  const errs = (await pg.evaluate(() => window.__errs)).concat(await pg2.evaluate(() => window.__errs));
  chk(!errs.length, 'consola sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`\n${ok} ok, ${mal} mal`);
  await br.close();
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
