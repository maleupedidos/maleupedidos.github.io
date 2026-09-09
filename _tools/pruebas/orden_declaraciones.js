// Variables de nivel superior de una sub-app usadas ANTES de su linea de declaracion.
// Con `var` la declaracion sube por hoisting pero la ASIGNACION no: hasta esa
// linea vale undefined, y `undefined.map(...)` revienta con TypeError.
const fs = require('fs');
const file = process.argv[2];
const L = fs.readFileSync(file, 'utf8').split('\n');

const decl = {};                                   // nombre -> linea de la asignacion
L.forEach((ln, i) => {
  const m = ln.match(/^var\s+([A-Za-z_$][\w$]*)\s*=/);   // sin indentacion = nivel superior
  if (m && decl[m[1]] === undefined) decl[m[1]] = i + 1;
});

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sosp = [];
Object.keys(decl).forEach(n => {
  const dl = decl[n];
  // uso "peligroso": llamar un metodo sobre la variable, o indexarla
  const re = new RegExp('(?<![\\w$.])' + esc(n) + '\\s*(?:\\.\\s*(\\w+)\\s*\\(|\\[)');
  for (let i = 0; i < dl - 1; i++) {
    const ln = L[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(ln)) continue;
    const m = ln.match(re);
    if (m) { sosp.push({ n, uso: i + 1, decl: dl, metodo: m[1] || '[ ]', txt: ln.trim().slice(0, 100) }); break; }
  }
});

console.log('archivo:', file.split(/[\\/]/).pop(), '· vars de nivel superior:', Object.keys(decl).length);
console.log('USADAS ANTES DE DECLARARSE (' + sosp.length + '):\n');
sosp.sort((a, b) => (b.decl - b.uso) - (a.decl - a.uso)).forEach(s => {
  console.log('  ' + s.n.padEnd(22) + ' uso L' + String(s.uso).padStart(5) + '  →  decl L' + String(s.decl).padStart(5) +
    '   (' + (s.decl - s.uso) + ' lineas de hueco, .' + s.metodo + ')');
  console.log('      ' + s.txt);
});
