/* ¿El test del alta de Los Alcanfores caza los bugs? (21/9/2026)

   Mete bugs en `ruta.html`, reconstruye y exige que
   probar_alta_alcanfores.js se ponga ROJO con cada uno. El test salio verde a
   la primera, y un verde a la primera no prueba nada hasta que se lo rompe.

   node probar_alta_alcanfores_reinyectar.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const FUENTE = path.join(RAIZ, 'ruta.html');
const TEST = path.join(__dirname, 'probar_alta_alcanfores.js');

const BUGS = [
  /* Home vuelve a ofrecer Los Alcanfores. */
  { n: 'Home vuelve a ofrecer Los Alcanfores',
    de: '<option value="Estancias del R&iacute;o">Estancias del R&iacute;o</option>',
    a: '<option value="Los Alcanfores">Los Alcanfores</option><option value="Estancias del R&iacute;o">Estancias del R&iacute;o</option>',
    espera: /Home ofrece solo/ },
  /* Elegir un cliente de Los Alcanfores desde Home lo deja en Home. */
  { n: 'un cliente de Los Alcanfores se queda en Home',
    de: "if(npZona==='Home'&&/alcanfor/i.test(String(c.barrio||'')))npSetZona('Pilar');", a: '',
    espera: /pasa solo a Pilar/ },
  /* Los Alcanfores pierde el envio gratis. */
  { n: 'Los Alcanfores paga envio',
    de: "return zona==='Pilar'?(npBarrioExHome()?0:5000):0;", a: "return zona==='Pilar'?5000:0;",
    espera: /sin cobrarle env/ },
  /* El oninput vuelve a leer la copia congelada de npZona. */
  { n: 'el barrio de Pilar lee la zona congelada de window',
    de: 'oninput="npPilarBarrioInput()"', a: 'oninput="npEnvioUI(npZona);npUpdateTotal()"',
    espera: /casilla de regalarlo/ },
];

const original = fs.readFileSync(FUENTE, 'utf8');
const build = () => execSync('npm run build', { cwd: RAIZ, stdio: 'pipe' });
function correrTest() {
  try { execFileSync(process.execPath, [TEST], { cwd: __dirname, stdio: 'pipe', timeout: 300000 });
        return { verde: true, salida: '' }; }
  catch (e) { return { verde: false, salida: String((e.stdout || '') + (e.stderr || '')) }; }
}

let cazados = 0; const escapados = [];
try {
  console.log('\n== ¿El test del alta caza los bugs que deberia? ==\n');
  build();
  if (!correrTest().verde) { console.log('  El test ya esta ROJO sin bugs. Arreglalo primero.'); process.exit(1); }
  console.log('  ok   en limpio da verde\n');
  BUGS.forEach(function (b, i) {
    const n = original.split(b.de).length - 1;
    if (n !== 1) { console.log('  MAL  bug ' + (i + 1) + ': el ancla aparece ' + n + ' veces'); escapados.push(b.n + ' (ancla)'); return; }
    fs.writeFileSync(FUENTE, original.replace(b.de, b.a), 'utf8');
    build();
    const r = correrTest();
    if (r.verde) { console.log('  MAL  se ESCAPO: ' + b.n); escapados.push(b.n); }
    else {
      const rojos = r.salida.split('\n').filter(l => /MAL/.test(l)).map(l => l.trim());
      if (rojos.some(l => b.espera.test(l))) { cazados++; console.log('  ok   cazado: ' + b.n + '\n         → ' + (rojos[0] || '').slice(0, 90)); }
      else { console.log('  MAL  rojo por otra cosa: ' + b.n + '\n         salio: ' + rojos.slice(0, 2).join(' / ').slice(0, 160)); escapados.push(b.n + ' (otro assert)'); }
    }
    fs.writeFileSync(FUENTE, original, 'utf8');
  });
} finally {
  fs.writeFileSync(FUENTE, original, 'utf8');
  build();
}
console.log('\n  ' + cazados + '/' + BUGS.length + ' cazados' + (escapados.length ? ' · se escaparon: ' + escapados.join(', ') : '') + '\n');
process.exit(escapados.length ? 1 : 0);
