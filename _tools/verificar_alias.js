#!/usr/bin/env node
/*
 * verificar_alias.js — que ningún texto al cliente pueda salir con un alias que no sea «Para clientes». (21/11/2026)
 *
 *   node _tools/verificar_alias.js          (lo corre deploy.sh; sale con 1 si encuentra algo)
 *
 * Por qué existe. El 21/11/2026 le llegó «alias: *maleump*» a una clienta, un día después de dar por hecho que maleu26
 * estaba en todos lados. Cada pantalla armaba el alias con SU lista de cuentas y, sin la marca `cli`, caía a `def` (MP).
 * Desde ese día hay una sola fuente: `aliasClienteLista()` (panel), que sale de la RPC `tienda_cuentas`.
 *
 * Qué mira, en las cuatro fuentes y en el app.html generado (sin comentarios):
 *   1. «maleump» no aparece en código (solo puede estar en comentarios).
 *   2. Ninguna línea que arma un texto con un alias (`… alias …' + x.alias` o `x.alias + …`) puede estar cerca (12 líneas)
 *      de una elección por `.def`: eso es «la cuenta por defecto como alias del cliente», el bug.
 *   3. Las cuatro funciones que dan el alias al cliente (_aliasCliente, _ordAlias, _jntAlias, _redCtaCliente) llaman a
 *      aliasClienteLista, y aliasClienteLista lee `tienda_cuentas`.
 * Lo que NO es texto al cliente (elegir a qué cuenta entra un cobro, la liquidación del representante) va en PERMITIDOS,
 * con el porqué.
 */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const FUENTES = ['_src/panel.src.html', 'ruta.html', 'red.html', 'busqueda.html', 'app.html'];
/* Líneas que muestran un alias pero NO al cliente. La clave es un pedazo del texto de la línea. */
const PERMITIDOS = [
  /* Mi Portal › liquidación: el representante elige a qué cuenta de Maleu transfiere (botones con el alias de cada una). */
  "const al = String(c.alias || '').replace(/[<>&\"]/g, '');",
  "'|' + dig.map(c => c.alias || '').join(',')) : '0';",
];
function sinComentarios(s) {
  // quita /* … */ y // … (no dentro de comillas simples/dobles/backticks, aproximado pero suficiente para este código)
  let out = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (q) { out += c; if (c === '\\') { out += n || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && n === '*') { const j = s.indexOf('*/', i + 2); const blk = s.slice(i, j < 0 ? s.length : j + 2); out += blk.replace(/[^\n]/g, ' '); i = j < 0 ? s.length : j + 2; continue; }
    if (c === '/' && n === '/' && s[i - 1] !== ':' && s[i - 1] !== '\\') { const j = s.indexOf('\n', i); i = j < 0 ? s.length : j; continue; }
    out += c; i++;
  }
  return out;
}
let mal = 0;
const err = (f, n, msg, l) => { mal++; console.log('  MAL  ' + f + ':' + n + ' — ' + msg + (l ? '\n         ' + l.trim().slice(0, 160) : '')); };
for (const f of FUENTES) {
  const p = path.join(R, f); if (!fs.existsSync(p)) continue;
  const crudo = fs.readFileSync(p, 'utf8');
  /* Solo el JS: lo que está entre <script> y </script>. */
  /* Solo el JS (lo de adentro de <script>), conservando los saltos de línea para que los números de línea sirvan. */
  let js = '', pos = 0;
  const low = crudo.toLowerCase();
  while (true) {
    const a = low.indexOf('<script', pos); if (a < 0) { js += crudo.slice(pos).replace(/[^\n]/g, ''); break; }
    const b = low.indexOf('>', a); const c = low.indexOf('</script>', b); if (b < 0 || c < 0) { js += crudo.slice(pos).replace(/[^\n]/g, ''); break; }
    js += crudo.slice(pos, b + 1).replace(/[^\n]/g, '') + crudo.slice(b + 1, c);
    pos = c;
  }
  const lineas = sinComentarios(js).split('\n'), crudoL = js.split('\n');
  lineas.forEach((l, i) => {
    /* «maleump» entre comillas: un string del código. En un comentario, sin comillas, no cuenta. */
    if (/['"`][^'"`\n]*maleump[^'"`\n]*['"`]/i.test(crudoL[i] || '')) err(f, i + 1, '«maleump» en un string del código', crudoL[i]);
    const arma = /alias[^'"`]{0,40}['"`]\s*\+\s*[\w$.()[\]]+\.alias\b|\.alias\s*\+\s*['"`]|alias:\s*\*'\s*\+|['"`][^'"`]*alias[^'"`]*['"`]\s*\+\s*\w+\.alias/i.test(l);
    if (!arma || PERMITIDOS.some(x => l.indexOf(x) >= 0)) return;
    for (let k = Math.max(0, i - 12); k <= i; k++) {
      if (/\.def\b/.test(lineas[k])) { err(f, i + 1, 'arma un texto con un alias cerca de una elección por `.def` (línea ' + (k + 1) + ')', l); break; }
    }
  });
  if (f === '_src/panel.src.html' || f === 'app.html') {
    const t = sinComentarios(js);
    if (!/function aliasClienteLista\(/.test(t)) err(f, 0, 'falta aliasClienteLista');
    if (!/rpc\/tienda_cuentas/.test(t)) err(f, 0, 'aliasClienteLista no lee tienda_cuentas');
  }
  const deben = { '_src/panel.src.html': ['_ordAlias', '_jntAlias'], 'ruta.html': ['_aliasCliente'], 'red.html': ['_redCtaCliente'] }[f] || [];
  for (const fn of deben) {
    const m = new RegExp('function ' + fn + '\\s*\\(\\)\\s*\\{([\\s\\S]{0,600}?)\\n\\s*\\}').exec(sinComentarios(js));
    if (!m) err(f, 0, 'no encuentro ' + fn);
    else if (!/aliasClienteLista/.test(m[1])) err(f, 0, fn + ' no usa aliasClienteLista (la fuente única)');
  }
}
console.log(mal ? '\n' + mal + ' problemas: un texto al cliente puede salir con un alias que no es «Para clientes».' : 'alias al cliente: una sola fuente (tienda_cuentas), sin `def` ni «maleump» en código');
process.exit(mal ? 1 : 0);
