/* LA LETRA MÍNIMA EN EL CELULAR (15/11/2026). Tadeo: «Todo se tiene que poder ver desde el iPhone».
 *
 *   PW=<playwright-core> node _tools/letra_minima.js [http://localhost:8080/app.html?prueba=1]   → escribe entre las marcas LETRA_MINIMA de _src/panel.src.html
 *
 * El detector de pisadas encontró ~190 reglas con letra de menos de 12 px (8,5 a 11,5). Corregirlas una por una en las
 * cuatro fuentes es imposible de sostener: cualquier regla nueva vuelve a traer un 10,5. Esto abre el ERP en WebKit a 390 px,
 * recorre TODAS las reglas CSS que aplican en el celular (las de @media que no son de escritorio) y, para cada selector con
 * font-size en px menor a 12, escribe la misma regla en 12 px adentro de @media (max-width:700px), con el peso del kit
 * (`html:not(#_e1):not(#_e2):not(#_e3)`) para ganarle sin !important. En la compu no cambia nada.
 * Lo que queda afuera, a propósito: font-size:0 (texto escondido), el texto de los SVG (escala con el dibujo) y los estilos
 * en línea (esos se corrigen en la fuente; el detector los sigue marcando).
 */
'use strict';
const fs = require('fs'), path = require('path');
const pw = require(process.env.PW || 'playwright-core');
const URL = process.argv[2] || 'http://localhost:8080/app.html?prueba=1';
(async () => {
  const br = await pw.webkit.launch();
  const pg = await (await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  await pg.goto(URL, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(4000);
  const sels = await pg.evaluate(() => {
    const out = new Set();
    const escritorio = (m) => /min-width\s*:\s*(\d+)/.test(m) && Number(/min-width\s*:\s*(\d+)/.exec(m)[1]) > 500;
    const rec = (rules, media) => {
      for (const r of rules) {
        if (r.type === 4) { if (!escritorio(r.media.mediaText)) rec(r.cssRules, r.media.mediaText); continue; }   // @media
        if (r.type === 12 && r.cssRules) { rec(r.cssRules, media); continue; }   // @supports
        if (r.type !== 1 || !r.style) continue;
        const fsz = r.style.getPropertyValue('font-size');
        const m = /^([\d.]+)px$/.exec(String(fsz).trim());
        if (!m) continue;
        const px = Number(m[1]); if (!(px > 0 && px < 12)) continue;
        if (/(^|[\s>+~,(])(svg|text|tspan)\b/.test(r.selectorText)) continue;
        if (/::?(before|after|placeholder|-webkit)/.test(r.selectorText)) continue;
        /* Pedidos queda afuera a propósito (Organizador, 15/11): a 12 px cada tarjeta ganaba un renglón y la lista más usada
           pedía más scroll. Sus chips y su fecha se leían bien como estaban. */
        if (/#pList|#pListHome|\.pc-|\.pc\b/.test(r.selectorText)) continue;
        out.add(r.selectorText);
      }
    };
    for (const sh of document.styleSheets) { try { rec(sh.cssRules, ''); } catch (e) {} }
    return Array.from(out);
  });
  await br.close();
  /* Cada selector de la lista, con el prefijo del kit. Las comas de adentro de :is()/:not() no se cortan. */
  const partir = (s) => { const r = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { r.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) r.push(cur.trim()); return r; };
  const P = 'html:not(#_e1):not(#_e2):not(#_e3) ';
  const INLINE = [];
  ['8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5'].forEach((n) => { INLINE.push(n); INLINE.push(' ' + n); });
  const todos = new Set();
  sels.forEach((s) => partir(s).forEach((x) => {
    if (/^(html|:root)\b/.test(x)) x = x.replace(/^(html|:root)/, '').trim();
    /* Lo de adentro de las listas de Pedidos queda como estaba (ver arriba). */
    todos.add(P + x.replace(/^body\b/, 'body') + ':not(#pList *, #pListHome *)');
  }));
  const css = '/* GENERADO por _tools/letra_minima.js (' + new Date().toISOString().slice(0, 10) + '): en el celular ninguna letra baja de 12 px. No se edita a mano. */\n'
    /* Una regla por selector: en una lista, UN selector que el navegador no entiende tira la regla entera. */
    + '@media (max-width:700px){\n' + Array.from(todos).sort().map((x) => x + '{font-size:12px}').join('\n') + '\n}\n'
    /* Los estilos en línea (style="font-size:10px") solo se ganan con !important: de 8 a 11,5 px, en el celular, a 12. */
    + '@media (max-width:700px){\n' + INLINE.map((x) => 'html:not(#_e1):not(#_e2):not(#_e3) [style*="font-size:' + x + 'px"]:not(svg *)').join(',\n') + '{font-size:12px !important}\n}\n';
  /* Va adentro del panel, entre sus marcas (al final del kit): el build no necesita saber nada. */
  const dst = path.join(__dirname, '..', '_src', 'panel.src.html');
  const A = '/* LETRA_MINIMA:INICIO */', Z = '/* LETRA_MINIMA:FIN */';
  let src = fs.readFileSync(dst, 'utf8');
  if (src.indexOf(A) < 0 || src.indexOf(Z) < 0) throw new Error('faltan las marcas ' + A + ' / ' + Z + ' en panel.src.html');
  src = src.slice(0, src.indexOf(A) + A.length) + '\n' + css + src.slice(src.indexOf(Z));
  fs.writeFileSync(dst + '.tmp', src); fs.renameSync(dst + '.tmp', dst);
  console.log('reglas con letra < 12 px: ' + sels.length + ' · selectores: ' + todos.size + ' → panel.src.html (entre las marcas)');
})();
