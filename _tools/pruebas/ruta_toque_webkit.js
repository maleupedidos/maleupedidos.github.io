/* RUTA CON EL DEDO, EN WEBKIT 390 (21/11/2026): Cobranza con el selector de cuenta y Armado. Sesión real, SOLO LECTURA.
   PW=<playwright-core> SES=<sesion.json> BASE=http://localhost:8155/app.html [FOTO=<carpeta>] node ruta_toque_webkit.js
   Siembra la copia vieja `maleu_ruta_ctas` (MP con `def`, Brubank, sin Galicia ni `cli`) que tenían los celulares:
     · Cobranza: abrir el cobro de un pedido con toques de verdad; el selector de cuenta no puede ofrecer la copia vieja
       (sin cuentas frescas no se dibuja y el cobro va a la cuenta por defecto de la base, Galicia);
     · Armado: tocar una tarjeta y que la página siga contestando, sin errores. */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const SB = 'https://xhaxmyvhygxynwjqrarm.supabase.co', PUB = 'sb_publishable_IVIVgOV-t_ugcQz1zQNwsw_U-4yOMZG';
const BASE = process.env.BASE || 'http://localhost:8155/app.html';
let ok = 0, mal = 0; const chk = (n, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n + (c || d === undefined ? '' : '\n         ' + JSON.stringify(d))); };
const VIEJAS = JSON.stringify([{ id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo' }, { id: 'mp', nombre: 'Mercado Pago', tipo: 'digital', alias: 'maleump', banco: 'Mercado Pago', def: true }, { id: 'brubank', nombre: 'Brubank', tipo: 'digital', alias: 'maleubru', banco: 'Brubank' }]);
(async () => {
  const ses = JSON.parse(fs.readFileSync(process.env.SES, 'utf8'));
  const br = await pw.webkit.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(`try{localStorage.setItem('maleu_ruta_ctas',${JSON.stringify(VIEJAS)});
    localStorage.setItem('maleu_panel_session',JSON.stringify({usuario:'tadeo',rol:'admin',nombre:'Tadeo Ustariz',ts:Date.now()}));
    localStorage.setItem('mc_sbses',${JSON.stringify(JSON.stringify({ u: 'tadeo', url: SB, key: PUB, access: ses.access_token, refresh: ses.refresh_token, hasta: Date.now() + 50 * 60e3, modo: 'si', todos: true }))});}catch(e){}
    window.confirm=function(){return false;}; window.alert=function(){};
    (function(){var f=window.fetch;window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();var r=/\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/.exec(s);
      if(m!=='GET'&&m!=='HEAD'&&!/auth\\/v1\\/token/.test(s)&&(/script\\.google\\.com/.test(s)||!r||!/_(pantalla|datos|base)$|^permiso_base$|^tienda_cuentas$|^catalogo_(red|ruta)$|^tienda_vendedores$/.test(r[1])))
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'cortado por la prueba'}),{status:200,headers:{'Content-Type':'application/json'}}));
      return f.apply(this,arguments);};})();`);
  const pg = await ctx.newPage();
  const errores = []; pg.on('pageerror', (e) => errores.push(String(e.message).slice(0, 160)));
  console.log('\n=== Ruta con el dedo · ' + BASE.split('/').pop() + ' ===');
  await pg.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.go === 'function' && window.D && (D.pedidos || []).length > 1000, null, { timeout: 150000 }).catch(() => {});
  const tap = async (sel, txt) => { const r = await pg.evaluate(([sel, txt]) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => x.getBoundingClientRect().height > 0 && (!txt || x.textContent.indexOf(txt) >= 0))[0]; if (!e) return null; e.scrollIntoView({ block: 'center' }); return true; }, [sel, txt]);
    if (!r) return false; await pg.waitForTimeout(400);
    const p = await pg.evaluate(([sel, txt]) => { const e = [].slice.call(document.querySelectorAll(sel)).filter((x) => x.getBoundingClientRect().height > 0 && (!txt || x.textContent.indexOf(txt) >= 0))[0]; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, [sel, txt]);
    await pg.touchscreen.tap(p.x, p.y); return true; };
  /* La copia vieja se descarta al arrancar Ruta. */
  await pg.evaluate(() => go('ruta')); await pg.waitForFunction(() => typeof switchTab === 'function', null, { timeout: 30000 }); await pg.waitForTimeout(1500);
  chk('la copia vieja de cuentas (sin `cli`) se borró al abrir Ruta', await pg.evaluate(() => localStorage.getItem('maleu_ruta_ctas') === null || /"cli"/.test(localStorage.getItem('maleu_ruta_ctas'))), await pg.evaluate(() => localStorage.getItem('maleu_ruta_ctas')));
  /* Cobranza: abrir el primer cobro con el dedo. */
  await pg.evaluate(() => switchTab('cobros')); await pg.waitForTimeout(6000);
  const abrio = await tap('#cobrosContent [onclick*="abrirCobroPendiente"], #cobrosContent .cobro-btn-cobrado, #cobrosContent button', 'Cobrar');
  await pg.waitForTimeout(1500);
  const cu = await pg.evaluate(() => { const t = (document.body.innerText || ''); const m = []; ['Mercado Pago', 'Brubank', 'Galicia', 'maleump', 'maleubru'].forEach((w) => { if (t.indexOf(w) >= 0) m.push(w); }); return { m, ctas: (typeof _ctasDigitales === 'function' ? _ctasDigitales() : []).map((c) => c.id + (c.def ? '*' : '') + (c.cli !== undefined ? '(cli=' + c.cli + ')' : '(sin cli)')), ls: (localStorage.getItem('maleu_ruta_ctas') || '').slice(0, 300), cv: (localStorage.getItem('maleu_ruta_clivend') || '').indexOf('"cuentas"') >= 0 }; });
  console.log('  cobro abierto con el dedo: ' + abrio + ' · cuentas que conoce Ruta: ' + JSON.stringify(cu.ctas) + ' · nombres en pantalla: ' + JSON.stringify(cu.m));
  chk('el selector no ofrece las cuentas viejas (MP/Brubank de la copia)', !cu.ctas.some((c) => /^mp|^brubank/.test(c)) || cu.ctas.some((c) => /galicia/.test(c)), cu);
  if (process.env.FOTO) { fs.mkdirSync(process.env.FOTO, { recursive: true }); await pg.screenshot({ path: path.join(process.env.FOTO, 'ruta_cobro.png') }); }
  /* Armado: tocar una tarjeta. */
  await pg.evaluate(() => { try { if (typeof closeCobroModal === 'function') closeCobroModal(); } catch (e) {} switchTab('armado'); }); await pg.waitForTimeout(3000);
  const toco = await tap('#armadoView .armado-card, #armadoView [onclick*="toggleArmado"], .armado-card');
  await pg.waitForTimeout(1200);
  let vivo = true; try { await Promise.race([pg.evaluate(() => 1), new Promise((_, r) => setTimeout(() => r(new Error('x')), 4000))]); } catch (e) { vivo = false; }
  chk('Armado: un toque en una tarjeta y la página sigue contestando', vivo, { toco });
  if (process.env.FOTO) await pg.screenshot({ path: path.join(process.env.FOTO, 'ruta_armado.png') });
  chk('sin errores de JS', errores.filter((e) => !/cortado/.test(e)).length === 0, errores.slice(0, 4));
  await br.close();
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
