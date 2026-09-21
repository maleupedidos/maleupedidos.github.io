/* ¿El test del selector de períodos de verdad caza los bugs? (21/9/2026)

   Mete bugs REALES en `_src/panel.src.html`, reconstruye, corre
   probar_resumen_periodos.js y exige que se ponga ROJO con cada uno.

   Los bugs elegidos son los que NO se ven mirando la pantalla: una semana ISO
   anclada mal, una comparacion que no se corta en el mismo dia, un rango que se
   compara contra cualquier cosa. Todos dejan numeros que parecen razonables, y
   esa es exactamente la razon de que haya un test.

   El original se guarda antes de tocar nada y se restaura en el `finally`.

   node probar_resumen_periodos_reinyectar.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const FUENTE = path.join(RAIZ, '_src', 'panel.src.html');
const APP = path.join(RAIZ, 'app.html');
const TEST = path.join(__dirname, 'probar_resumen_periodos.js');

const BUGS = [
  /* El clasico: anclar la semana ISO en el 1 de enero en vez del 4. Los años
     que arrancan jueves o viernes se corren una semana ENTERA y los numeros
     siguen pareciendo normales. */
  { n: 'la semana ISO se ancla en el 1/1 en vez del 4/1',
    de: 'var e=new Date(anio,0,4);', a: 'var e=new Date(anio,0,1);',
    espera: /vuelve a ser ella misma|semana 1 de 2026/ },

  /* Comparar una semana a medias contra una entera: siempre "caes". */
  { n: 'la semana en curso no corta la comparacion en el mismo dia',
    de: 'if(o.hasta>t){ o.hasta=t; o.cHasta=_rtDia(t,-7); o.enCurso=true; }',
    a: 'if(o.hasta>t){ o.hasta=t; o.enCurso=true; }',
    espera: /MISMO dia de la semana anterior/ },

  /* Un mes de 31 dias comparado contra uno de 28: el "hasta" se pasa de largo. */
  { n: 'el mes en curso le inventa dias al mes anterior',
    de: 'o.cHasta=new Date(y,mi-1,Math.min(t.getDate(),ultA));',
    a: 'o.cHasta=new Date(y,mi-1,t.getDate());',
    espera: /no le inventa a febrero|mismos dias de agosto/ },

  /* Un rango de 10 dias comparado contra un mes: la variacion no significa nada. */
  { n: 'el rango a medida no se compara contra su propio largo',
    de: 'o.cHasta=_rtDia(o.desde,-1);o.cDesde=_rtDia(o.cHasta,-(largo-1));',
    a: 'o.cHasta=_rtDia(o.desde,-1);o.cDesde=_rtDia(o.cHasta,-29);',
    espera: /10 anteriores/ },

  /* La flecha usa el año del lunes y no el del jueves: en el borde de año la
     semana 1 se vuelve la 53 del año anterior. */
  { n: 'la flecha arma la clave con el año del LUNES, no el del jueves',
    de: "return 'w:'+_rtDia(L,3).getFullYear()+'-'+getWeek(L);",
    a: "return 'w:'+L.getFullYear()+'-'+getWeek(L);",
    espera: /año del JUEVES|ultima de 2025/ },

  /* El cuadro de clientes inventado para un rango: numeros que nadie calculo. */
  { n: 'un rango a medida se inventa el cuadro de clientes',
    de: "if(P.tipo==='libre')return null;", a: "if(false)return null;",
    espera: /no lo dibuja en vez de inventarlo/ },

  /* El rango memoizado no se recalcula: las flechas se apagan donde no va. */
  { n: 'el rango de datos queda pegado en una constante',
    de: 'if(_rtRangoN===ps.length)return _rtRangoMemo;',
    a: 'if(_rtRangoMemo)return _rtRangoMemo;',
    espera: /el rango la sigue|meses nuevos, no los de antes/ },

  /* Lo elegido queda pegado de un dia para el otro. */
  { n: 'el periodo elegido sobrevive al cambio de dia',
    de: 'if(g&&g.k&&g.dia===_rtIso(hoy))return g.k;', a: 'if(g&&g.k)return g.k;',
    espera: /al otro dia vuelve el default/ },
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
  console.log('\n== ¿El test del selector caza los bugs que deberia? ==\n');
  build();
  const base = correrTest();
  if (!base.verde) {
    console.log('  El test ya esta ROJO sin ningun bug inyectado. Arreglalo primero.');
    console.log(base.salida.split('\n').filter(l => /MAL/.test(l)).join('\n'));
    process.exit(1);
  }
  console.log('  ok   en limpio da verde (si no, nada de lo de abajo valdria)\n');

  BUGS.forEach(function (b, i) {
    const n = original.split(b.de).length - 1;
    if (n !== 1) {
      console.log('  MAL  bug ' + (i + 1) + ': el ancla aparece ' + n + ' veces — «' + b.de.slice(0, 46) + '»');
      escapados.push(b.n + (n ? ' (ancla ambigua)' : ' (no se pudo inyectar)'));
      return;
    }
    fs.writeFileSync(FUENTE, original.replace(b.de, b.a), 'utf8');
    build();
    const r = correrTest();
    if (r.verde) { console.log('  MAL  se ESCAPO: ' + b.n); escapados.push(b.n); }
    else {
      const rojos = r.salida.split('\n').filter(l => /MAL/.test(l)).map(l => l.trim());
      if (rojos.some(l => b.espera.test(l))) {
        cazados++;
        console.log('  ok   cazado: ' + b.n + '\n         → ' + (rojos[0] || '').slice(0, 92));
      } else {
        console.log('  MAL  se puso rojo, pero por otra cosa: ' + b.n);
        console.log('         esperaba ' + b.espera + ' · salio: ' + rojos.slice(0, 2).join(' / ').slice(0, 170));
        escapados.push(b.n + ' (rojo por otro assert)');
      }
    }
    fs.writeFileSync(FUENTE, original, 'utf8');
  });
} finally {
  fs.writeFileSync(FUENTE, original, 'utf8');
  try { build(); } catch (e) { console.log('\n  ATENCION: no pude reconstruir al restaurar. Corre `npm run build`.'); }
  const vuelve = fs.readFileSync(FUENTE, 'utf8') === original;
  const appIgual = fs.readFileSync(APP, 'utf8') === appAntes;
  console.log(vuelve && appIgual
    ? '\n  el arbol quedo byte por byte como estaba (fuente y app.html)'
    : '\n  ATENCION: no quedo igual — fuente ' + (vuelve ? 'ok' : 'DISTINTA') + ', app.html ' + (appIgual ? 'ok' : 'DISTINTO'));
}

console.log('\n  ' + cazados + ' de ' + BUGS.length + ' bugs cazados');
if (escapados.length) { console.log('  SE ESCAPARON:'); escapados.forEach(e => console.log('    · ' + e)); }
console.log('');
process.exit(escapados.length ? 1 : 0);
