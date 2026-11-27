/* NINGÚN LOGOUT GLOBAL DE SUPABASE (26/11/2026, pedido del Organizador). `POST /auth/v1/logout` sin `?scope=local`
   cierra TODAS las sesiones del usuario, en todos sus aparatos: el 12/11 una prueba se las borró a Lou. Este chequeo
   recorre el ERP (las cuatro fuentes), las pruebas y el robot, y corta el deploy si aparece un logout sin scope=local.
     node _tools/sin_logout_global.js      → sale con 1 si encuentra uno */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const lugares = ['_src/panel.src.html', 'ruta.html', 'red.html', 'busqueda.html', '_tools/pruebas', '_tools/robot'];
const archivos = [];
for (const l of lugares) {
  const p = path.join(R, l);
  if (!fs.existsSync(p)) continue;
  if (fs.statSync(p).isDirectory()) fs.readdirSync(p).filter((f) => /\.(js|mjs|py|html)$/.test(f)).forEach((f) => archivos.push(path.join(p, f)));
  else archivos.push(p);
}
const malos = [];
for (const f of archivos) {
  if (path.resolve(f) === path.resolve(__filename)) continue;
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((linea, i) => {
    if (/auth\/v1\/logout|\.signOut\s*\(/.test(linea) && !/scope=local|scope:\s*['"]local['"]/.test(linea)) malos.push(path.relative(R, f) + ':' + (i + 1) + '  ' + linea.trim().slice(0, 120));
  });
}
if (malos.length) {
  console.log('Logout de Supabase sin scope=local (cierra la sesión en TODOS los aparatos del usuario):');
  malos.forEach((m) => console.log('  ' + m));
  process.exit(1);
}
console.log('OK: ningún logout global de Supabase (' + archivos.length + ' archivos)');
