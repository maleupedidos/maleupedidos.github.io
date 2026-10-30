/* node _tools/pruebas/probar_merma_boton.js <token> <url> [390|1440]  (30/10/2026)
   El × de una pieza en Productos › Carne: elige merma o corrección, exige motivo en la merma y manda «Merma: …».
   Sesion real con sesion_prep: el POST lo intercepta el prep (no se da de baja nada). Toques reales de CDP. */
const R = './';
const cdp = require(R + 'cdp.js'), prep = require(R + 'sesion_prep.js');
const [TK, URL, ANCHO] = process.argv.slice(2);
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0; const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + '  ' + JSON.stringify(d).slice(0, 300)); } };
async function tocar(c, sel) {
  const p = await cdp.evaluar(c, `(function(){var e=${sel};if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (!p) return false; await T(150);
  for (const type of ['mousePressed', 'mouseReleased']) await c.enviar('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
  return true;
}
(async () => {
  const c = await cdp.abrir();
  const w = Number(ANCHO || 390);
  try {
    await c.enviar('Page.enable');
    await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep(TK, `;window.__bajas=[];(function(){var o=window.fetch;window.fetch=function(u,x){try{var b=JSON.parse(x&&x.body||'{}');if(b.action==='piezasBaja')window.__bajas.push(b);}catch(e){}return o.apply(this,arguments);};})();`) });
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: w, height: w < 600 ? 844 : 900, deviceScaleFactor: 1, mobile: w < 600 });
    await c.enviar('Page.navigate', { url: URL });
    for (let i = 0; i < 150; i++) { await T(300); if (await cdp.evaluar(c, `typeof go==='function'&&!!window.D&&document.documentElement.classList.contains('listo')`).catch(() => false)) break; }
    await cdp.evaluar(c, `go('stock');stSwitchTab('carne');1`);
    for (let i = 0; i < 60; i++) { await T(500); if (await cdp.evaluar(c, `!!document.querySelector('.stcar-pz button')`)) break; }
    const X = `[].slice.call(document.querySelectorAll('.stcar-pz:not(.pedida) button')).filter(function(b){return b.getBoundingClientRect().height>0})[0]`;
    chk('hay piezas con su ×', await tocar(c, X), null);
    await T(400);
    const ov = await cdp.evaluar(c, `(function(){var o=document.getElementById('stMermaOv');return o&&!o.hidden?o.innerText.replace(/\\s+/g,' '):null})()`);
    chk('el × abre «Merma» y «Corrección», con el costo que va a pérdida', !!ov && /Merma/.test(ov) && /Corrección/.test(ov) && /pérdida/.test(ov), ov);
    await tocar(c, `document.querySelector('.stmerma-b.merma')`); await T(400);
    chk('Merma sin motivo: no manda nada y lo pide', (await cdp.evaluar(c, 'window.__bajas.length')) === 0 && (await cdp.evaluar(c, `!document.getElementById('stMermaOv').hidden`)), null);
    await cdp.evaluar(c, `document.getElementById('stMermaMot').value='olor raro al abrir';1`);
    await tocar(c, `document.querySelector('.stmerma-b.merma')`); await T(800);
    const b = await cdp.evaluar(c, 'window.__bajas');
    chk('Merma con motivo: manda piezasBaja con «Merma: olor raro al abrir (quién, fecha)» y cierra', b.length === 1 && /^Merma: olor raro al abrir \(.+, \d{1,2}\/\d{1,2}\/\d{4}\)$/.test(b[0].motivo) && (await cdp.evaluar(c, `document.getElementById('stMermaOv').hidden`)), b);
    const sw = await cdp.evaluar(c, 'document.documentElement.scrollWidth');
    chk('sin scroll horizontal a ' + w, sw <= w, sw);
    chk('sin errores de JS', (await cdp.evaluar(c, 'window.__err.length')) === 0, await cdp.evaluar(c, 'window.__err'));
  } finally { c.matar(); }
  console.log(ok + ' ok · ' + mal + ' mal');
})().catch((e) => { console.error(e); process.exit(1); });
