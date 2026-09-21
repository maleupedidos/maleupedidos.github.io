/* ¿El test del EERR caza los bugs? (21/9/2026)

   Mete bugs en `_src/panel.src.html`, reconstruye y exige que
   probar_eerr_clasificacion.js se ponga ROJO con cada uno. El test salio verde a
   la primera, y un verde a la primera no prueba nada hasta que se lo rompe.

   node probar_eerr_clasificacion_reinyectar.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const FUENTE = path.join(RAIZ, '_src', 'panel.src.html');
const TEST = path.join(__dirname, 'probar_eerr_clasificacion.js');

const BUGS = [
  /* El EERR que ve Tadeo no conoce el renglon nuevo: los planes se caen del
     dibujo aunque los KPIs esten bien. */
  { n: 'el EERR no suma los planes en su renglon',
    de: "case 'planes': f_planes+=m;", a: "case 'planes_': f_planes+=m;",
    espera: /Planes mensuales" con Claude/ },

  /* Los KPIs (Inicio, la copia de Lucas) dejan los planes afuera de los fijos. */
  { n: 'la estructura de los KPIs se olvida de los planes',
    de: "estr:v('vehiculo')+v('planes')+", a: "estr:v('vehiculo')+",
    espera: /cuentan en los fijos/ },

  /* Los "Creditos" sueltos vuelven a los fijos. */
  { n: 'los creditos sueltos dejan de ser de WATI',
    de: "if(cat==='herramienta'&&/^(creditos?|recargas?|saldo)\\b/", a: "if(false&&/^(creditos?|recargas?|saldo)\\b/",
    espera: /Créditos/ },

  /* Sin el ancla del principio, "Openrouter · Creditos" pasa por WATI. */
  { n: 'cualquier concepto con "creditos" se toma como WATI',
    de: "/^(creditos?|recargas?|saldo)\\b/.test(txt.trim())", a: "/(creditos?|recargas?|saldo)\\b/.test(txt.trim())",
    espera: /Openrouter/ },

  /* Movistar vuelve a quedar afuera de los planes. */
  { n: 'el telefono deja de contar como plan',
    de: "var esPlan=appCom||eerrEsServicio(txt)||", a: "var esPlan=appCom||",
    espera: /Movistar/ },

  /* Lo financiero vuelve a partir los planes. */
  { n: 'lo financiero no junta los planes',
    de: "if(_gastoLinea(g).linea==='planes'){pagPlanes+=m;", a: "if(_gastoLinea(g).linea==='planes_'){pagPlanes+=m;",
    espera: /lo financiero junta los planes/ },

  /* Un renglon de Servicios en $0 vuelve a aparecer. */
  { n: 'Servicios se dibuja aunque este en cero',
    de: "if(f_servicios>0){html+=leaf(eL('Servicios (luz, agua, internet)'", a: "if(true){html+=leaf(eL('Servicios (luz, agua, internet)'",
    espera: /Servicios en \$0/ },
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
  console.log('\n== ¿El test del EERR caza los bugs que deberia? ==\n');
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
