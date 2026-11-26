'use strict';
// El dedo impaciente (global): un botón lento tocado dos veces seguidas = 1; dos veces con calma = 2; un «+» rápido dos veces seguidas = 2.
const pw = require(process.env.PW); const toqueCdp = require('./toque_cdp.js');
(async () => {
  const br = await pw.chromium.launch({ executablePath: process.env.CHROME });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); const cdp = await ctx.newCDPSession(pg);
  await pg.goto(process.env.BASE + '?prueba=1', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(6000);
  await pg.evaluate(() => {
    const mk = (id, top, code) => { const b = document.createElement('button'); b.id = id; b.textContent = id; b.style.cssText = 'position:fixed;left:20px;width:200px;height:60px;z-index:99999;top:' + top + 'px'; b.setAttribute('onclick', code); document.body.appendChild(b); };
    window.__lento = 0; window.__rapido = 0; var rp=document.getElementById('reentradaPin'); while(rp&&rp.parentElement&&getComputedStyle(rp).position!=='fixed')rp=rp.parentElement; if(rp)rp.remove();
    mk('zzLento', 300, 'window.__lento++;setTimeout(function(){var t=performance.now();while(performance.now()-t<600){}},0)');
    mk('zzRapido', 420, 'window.__rapido++');
  });
  const c = async (id) => pg.evaluate((i) => { const r = document.getElementById(i).getBoundingClientRect(); return { x: r.left + 50, y: r.top + 30 }; }, id);
  const L = await c('zzLento'), R = await c('zzRapido');
  const tap2 = toqueCdp(cdp); const tapSinEsperar = (p) => tap2(p.x, p.y);
  // lento, dos seguidas (la 2ª mientras corre la 1ª)
  await pg.evaluate(() => { window.__lg=[]; window.addEventListener('click', (e) => { var u=_TQ.ult; window.__lg.push({tr:e.isTrusted,resc:_TQ.ultRescate||0,dedo:Math.round(_TQ.dedo||0),arriba:Math.round(_TQ.arriba||0),ts:Math.round(e.timeStamp), now:Math.round(performance.now()), u: u?{f:u.f,ts:Math.round(u.ts),t0:Math.round(u.t0),visto:u.visto===Infinity?'inf':Math.round(u.visto),lento:u.lento}:null, f:_tqFirma(_tqBoton(e.target)).replace(/\d+/g,'#')}); }, true); });
  const a = tapSinEsperar(L); await pg.waitForTimeout(150); const b = tapSinEsperar(L); await Promise.all([a, b]); await pg.waitForTimeout(1200);
  const lentoSeguidas = await pg.evaluate(() => window.__lento);
  console.log(JSON.stringify(await pg.evaluate(() => window.__lg)));
  // lento, con calma
  await tapSinEsperar(L); await pg.waitForTimeout(1500); await tapSinEsperar(L); await pg.waitForTimeout(1200);
  const lentoCalma = await pg.evaluate(() => window.__lento) - lentoSeguidas;
  // rápido, dos seguidas
  await tapSinEsperar(R); await pg.waitForTimeout(120); await tapSinEsperar(R); await pg.waitForTimeout(600);
  const rapido = await pg.evaluate(() => window.__rapido);
  console.log(JSON.stringify({ lentoSeguidas, lentoCalma, rapido, esperado: { lentoSeguidas: 1, lentoCalma: 2, rapido: 2 } }));
  await br.close();
})().catch((e) => { console.error(e); process.exit(2); });
