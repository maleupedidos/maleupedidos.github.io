/* ¿El test de las cards del Resumen caza los bugs? (21/9/2026)

   Mete bugs en `_src/panel.src.html`, reconstruye y exige que
   probar_resumen_cards.js se ponga ROJO con cada uno. El test salio verde a la
   primera, y un verde a la primera no prueba nada hasta que se lo rompe.

   node probar_resumen_cards_reinyectar.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const FUENTE = path.join(RAIZ, '_src', 'panel.src.html');
const APP = path.join(RAIZ, 'app.html');
const TEST = path.join(__dirname, 'probar_resumen_cards.js');

const BUGS = [
  /* El que mas importa: sin las casas aparte, una bolsa de Red hace creer que
     la gente compra la mitad. */
  { n: 'la card del ticket deja de mostrar las casas aparte',
    de: 'if(g.dom.ent>0&&g.inst.ent>0){', a: 'if(false){',
    espera: /casas aparte|variacion real/ },

  /* Dividir el facturado de TODO por las entregas de las casas infla el ticket. */
  { n: 'el ticket divide el facturado total por las entregas de las casas',
    de: 'var tkT=tk(t),tkC=tk(gc.tot);', a: 'var tkT=Math.round(t.f/(g.dom.ent||1)),tkC=tk(gc.tot);',
    espera: /facturado ÷ entregas/ },

  /* Comparar contra el periodo equivocado: el delta mentiria. */
  { n: 'el ticket se compara contra si mismo en vez de contra el periodo anterior',
    de: 'var tkT=tk(t),tkC=tk(gc.tot);', a: 'var tkT=tk(t),tkC=tk(t);',
    espera: /variacion contra la semana anterior/ },

  /* Las casas comparadas contra el total del periodo anterior, no contra casas. */
  { n: 'el ticket de las casas se compara contra el total, no contra las casas',
    de: 'var a1=tk(g.dom),b1=tk(gc.dom)', a: 'var a1=tk(g.dom),b1=tk(gc.tot)',
    espera: /variacion real/ },

  /* El costo desaparece al sacar su card. */
  { n: 'el costo se pierde al sacar la card',
    de: "+'<div class=\"rt-ks\">costo $'+f$(t.c)+'</div></div>'", a: "+'</div>'",
    espera: /costo en pesos/ },

  /* Con solo casas, dice el mismo numero dos veces. */
  { n: 'sin institucional repite el ticket en una segunda linea',
    de: 'if(g.dom.ent>0&&g.inst.ent>0){', a: 'if(g.dom.ent>0){',
    espera: /no repite el mismo ticket/ },
];

const original = fs.readFileSync(FUENTE, 'utf8');
const appAntes = fs.readFileSync(APP, 'utf8');
const build = () => execSync('npm run build', { cwd: RAIZ, stdio: 'pipe' });
function correrTest() {
  try { execFileSync(process.execPath, [TEST], { cwd: __dirname, stdio: 'pipe', timeout: 300000 });
        return { verde: true, salida: '' }; }
  catch (e) { return { verde: false, salida: String((e.stdout || '') + (e.stderr || '')) }; }
}

let cazados = 0; const escapados = [];
try {
  console.log('\n== ¿El test de las cards caza los bugs que deberia? ==\n');
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
  try { build(); } catch (e) { console.log('\n  ATENCION: no pude reconstruir. Corre `npm run build`.'); }
  const igual = fs.readFileSync(FUENTE, 'utf8') === original && fs.readFileSync(APP, 'utf8') === appAntes;
  console.log(igual ? '\n  el arbol quedo byte por byte como estaba' : '\n  ATENCION: el arbol NO quedo igual');
}
console.log('\n  ' + cazados + ' de ' + BUGS.length + ' bugs cazados');
if (escapados.length) { console.log('  SE ESCAPARON:'); escapados.forEach(e => console.log('    · ' + e)); }
console.log('');
process.exit(escapados.length ? 1 : 0);
