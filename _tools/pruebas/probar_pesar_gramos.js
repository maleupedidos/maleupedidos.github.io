/* PESAR EN GRAMOS (27/11/2026, Tadeo 16:00: «pesar sin coma»). Recibir › Carne a 390, con el dedo, en WebKit. Solo arma
   la cola local (no toca «Guardar la tanda»): no escribe nada en la base. Entra con el ROBOT, proveedor y depósito PRUEBA.
     1. El campo pide teclado numérico y dice «gramos».
     2. «1104» → en vivo «= 1,104 kg»; + Agregar → la pieza entra a la cola con 1,104 kg.
     3. «804» → 0,804 kg.  4. «1,5» (con coma) se respeta como kilos → 1,5 kg.
     5. «30» → avisa «¿Menos de 50 g?»; el 1er toque NO agrega, el 2º sí.  6. «25000» → avisa más de 20 kg.
   Al final vacía la cola que armó.
   PW=<playwright-core 1.62.1> BASE=http://localhost:8177/app.html OUT=<dir> node probar_pesar_gramos.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const BASE = process.env.BASE || 'http://localhost:8177/app.html', OUT = process.env.OUT || os.tmpdir();
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let bien = 0, mal = 0; const chk = (t, ok, x) => { ok ? bien++ : mal++; console.log((ok ? '  BIEN ' : '  MAL  ') + t + (x ? ' · ' + x : '')); return ok; };
(async () => {
  const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.maleu', 'robot.json'), 'utf8'));
  const br = await pw[process.env.MOTOR || 'webkit'].launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_ensayo','1');}catch(e){} window.alert=function(){};`);
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  await pg.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof panelDoLogin === 'function' && (!!document.getElementById('loginUser') || (typeof SESSION !== 'undefined' && SESSION && SESSION.usuario)), null, { timeout: 90000 });
  if (!(await pg.evaluate(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario)))
    await pg.evaluate(([u, p]) => { document.getElementById('loginUser').value = u; document.getElementById('loginPin').value = p; panelDoLogin(); }, [cred.usuario, String(cred.pin)]);
  await pg.waitForFunction(() => typeof SESSION !== 'undefined' && SESSION && SESSION.usuario && typeof renderStCarne === 'function', null, { timeout: 150000 });
  for (let i = 0; i < 30; i++) {
    if (await pg.evaluate(() => (document.querySelector('.pg.on') || {}).id === 'p-busqueda')) break;
    await pg.evaluate(() => { try { go('busqueda'); } catch (e) {} }); await T(1500);
  }
  await pg.waitForFunction(() => typeof abaRecibirCarne === 'function', null, { timeout: 60000 });
  for (let i = 0; i < 20; i++) {
    if (await pg.evaluate(() => { const c = document.getElementById('stCarne'); return !!c && !!c.offsetParent; })) break;
    await pg.evaluate(() => { try { abaRecibirCarne(); } catch (e) {} }); await T(1500);
  }
  await pg.waitForFunction(() => { const c = document.getElementById('stCarne'); return !!c && !!c.offsetParent && typeof CARNE_DATA !== 'undefined' && !!CARNE_DATA; }, null, { timeout: 60000 });
  const ini = await pg.evaluate(() => { CARNE_VISTA = 'recibir'; stCarneProv('PRUEBA'); try { stCarneDep('prueba'); } catch (e) {} renderStCarne(); return { cola: CARNE_COLA.length, corte: CARNE_CORTE }; });
  await T(800);
  const n0 = ini.cola;
  const campo = await pg.evaluate(() => { const i = document.getElementById('stcarPeso'); return i ? { im: i.getAttribute('inputmode'), ph: i.placeholder, kg: (document.querySelector('.stcar-kg') || {}).textContent } : null; });
  chk('1. teclado numérico y «gramos»', !!campo && campo.im === 'numeric' && /gramos/.test(campo.kg), JSON.stringify(campo));
  const tap = async (sel) => { const b = await pg.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); if (!b) return false; await T(200); await pg.touchscreen.tap(b.x, b.y); await T(350); return true; };
  const escribir = async (txt) => { await tap('#stcarPeso'); await pg.keyboard.type(txt, { delay: 40 }); await T(200); return pg.evaluate(() => (document.getElementById('stcarEq') || {}).innerText || ''); };
  const ultima = () => pg.evaluate(() => { const p = CARNE_COLA[CARNE_COLA.length - 1]; return { n: CARNE_COLA.length, peso: p && p.peso }; });

  let eq = await escribir('1104');
  chk('2. «1104» en vivo dice «= 1,104 kg»', /= 1,104 kg/.test(eq), eq);
  await pg.screenshot({ path: path.join(OUT, 'pg_1104.png') });
  await tap('.stcar-add'); let u = await ultima();
  chk('   + Agregar → la cola suma una pieza de 1,104 kg', u.n === n0 + 1 && u.peso === 1.104, JSON.stringify(u));
  eq = await escribir('804'); await tap('.stcar-add'); u = await ultima();
  chk('3. «804» → 0,804 kg', /= 0,804 kg/.test(eq) && u.n === n0 + 2 && u.peso === 0.804, eq + ' ' + JSON.stringify(u));
  eq = await escribir('1,5'); await tap('.stcar-add'); u = await ultima();
  chk('4. «1,5» con coma se respeta como kilos', /= 1,5 kg/.test(eq) && u.n === n0 + 3 && u.peso === 1.5, eq + ' ' + JSON.stringify(u));
  eq = await escribir('30');
  chk('5. «30» avisa «¿Menos de 50 g?»', /Menos de 50 g/.test(eq), eq);
  await pg.screenshot({ path: path.join(OUT, 'pg_30.png') });
  await tap('.stcar-add'); u = await ultima();
  chk('   el 1er toque NO agrega', u.n === n0 + 3, JSON.stringify(u));
  await tap('.stcar-add'); u = await ultima();
  chk('   el 2º toque sí (0,03 kg)', u.n === n0 + 4 && u.peso === 0.03, JSON.stringify(u));
  eq = await escribir('25000');
  chk('6. «25000» avisa «¿Más de 20 kg?»', /= 25 kg/.test(eq) && /Más de 20 kg/.test(eq), eq);
  const anchoOk = await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  chk('a 390 sin scroll horizontal', anchoOk);
  await pg.evaluate((n0) => { CARNE_COLA.splice(n0); _carneColaGuardar(); renderStCarne(); }, n0);
  chk('sin errores de página', !errs.length, errs.join(' | '));
  console.log('\n' + bien + ' bien · ' + mal + ' mal');
  await br.close(); process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
