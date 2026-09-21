/* ¿El test del menu de verdad caza los bugs? (21/9/2026)

   Mete bugs REALES en `_src/panel.src.html`, reconstruye, corre
   probar_menu_nombres.js y exige que se ponga ROJO con cada uno. Sin esto, un
   test al que le comentaron los asserts sigue diciendo "19 ok" para siempre.

   Se inyecta en la FUENTE y se reconstruye, no en `window`: parchear la global
   desde el navegador probaria el parche, no el archivo que se publica.

   El original se guarda antes de tocar nada y se restaura en el `finally`,
   pasara lo que pasara. Al terminar verifica contra git que el arbol quedo
   igual que antes de empezar — si no, lo dice bien fuerte.

   node probar_menu_nombres_reinyectar.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const FUENTE = path.join(RAIZ, '_src', 'panel.src.html');
const TEST = path.join(__dirname, 'probar_menu_nombres.js');

/* Cada bug: qué se rompe, y qué assert TIENE que quedar rojo. */
const BUGS = [
  { n: 'el nombre vuelve a salir de CMD_NAV y no del encabezado',
    de: 't:d.t||x.t', a: 't:x.t||d.t',
    espera: /se llama distinto|no se llama "BBDD"/ },

  { n: 'el subtitulo vuelve a salir de CMD_NAV',
    de: 's:d.bc||x.s', a: 's:x.s||d.bc',
    espera: /subtitulo difiere|promete Productos/ },

  { n: 'el buscador vuelve a comparar CON acentos',
    de: "return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,''); }catch(e){ return s; }",
    a: "return s; }catch(e){ return s; }",
    espera: /catalogo|analisis|gestion/ },

  { n: 'se normaliza la consulta pero NO el nombre del cliente',
    de: 'var c=_cmdPlano(p.cliente||p.c||p.Cliente);',
    a: "var c=String(p.cliente||p.c||p.Cliente||'').toLowerCase();",
    espera: /sin enie|CON enie/ },

  { n: 'el alias (los nombres viejos) deja de buscarse',
    de: "||_cmdPlano(x.al).indexOf(q)>=0", a: "",
    espera: /"bbdd"|"stock"/ },

  /* Este no deja ningun assert rojo: revienta antes, al dibujar el buscador con
     un null en la lista. Un test que EXPLOTA tambien frena el deploy, que es lo
     que importa — pero se declara aparte para no confundirlo con un assert que
     realmente se evaluo. */
  { n: 'una tab sin ficha en MOD_META desaparece del buscador',
    de: 'var d=m&&m[x.k]; if(!d)return x;', a: 'var d=m&&m[x.k]; if(!d)return null;',
    espera: 'EXPLOTA' },

  { n: 'el buscador deja de mirar el subtitulo',
    de: '||_cmdPlano(x.s).indexOf(q)>=0', a: '',
    espera: /catalogo|analisis|gestion|clientes/ }
];

const APP = path.join(RAIZ, 'app.html');
const original = fs.readFileSync(FUENTE, 'utf8');
const appAntes = fs.readFileSync(APP, 'utf8');
const build = () => execSync('npm run build', { cwd: RAIZ, stdio: 'pipe' });
function correrTest() {
  try { execFileSync(process.execPath, [TEST], { cwd: __dirname, stdio: 'pipe', timeout: 300000 });
        return { verde: true, salida: '' }; }
  catch (e) { return { verde: false, salida: String((e.stdout || '') + (e.stderr || '')) }; }
}

let cazados = 0, escapados = [];
try {
  console.log('\n== ¿El test caza los bugs que deberia? ==\n');

  /* Antes de nada: en limpio tiene que estar VERDE. Si no, lo que venga
     despues no significa nada. */
  build();
  const base = correrTest();
  if (!base.verde) {
    console.log('  El test ya esta ROJO sin ningun bug inyectado. Arreglalo primero.');
    console.log(base.salida.split('\n').filter(l => /MAL/.test(l)).join('\n'));
    process.exit(1);
  }
  console.log('  ok   en limpio da verde (si no, nada de lo de abajo valdria)\n');

  BUGS.forEach(function (b, i) {
    if (original.indexOf(b.de) < 0) {
      console.log('  MAL  bug ' + (i + 1) + ' no se pudo inyectar: no encontre «' + b.de.slice(0, 50) + '»');
      escapados.push(b.n + ' (no se pudo inyectar)');
      return;
    }
    if (original.split(b.de).length - 1 !== 1) {
      console.log('  MAL  bug ' + (i + 1) + ': «' + b.de.slice(0, 40) + '» aparece mas de una vez');
      escapados.push(b.n + ' (ancla ambigua)');
      return;
    }
    fs.writeFileSync(FUENTE, original.replace(b.de, b.a), 'utf8');
    build();
    const r = correrTest();
    if (r.verde) {
      console.log('  MAL  se ESCAPO: ' + b.n);
      escapados.push(b.n);
    } else {
      const rojos = r.salida.split('\n').filter(l => /MAL/.test(l)).map(l => l.trim());
      const correcto = (b.espera === 'EXPLOTA')
        ? (rojos.length === 0 && /EXPLOTO|Error|undefined|null/i.test(r.salida))
        : rojos.some(l => b.espera.test(l));
      if (correcto) { cazados++; console.log('  ok   cazado: ' + b.n + '\n         → ' + (rojos[0] || 'el test EXPLOTO (rojo igual: frena el deploy)').slice(0, 90)); }
      else {
        console.log('  MAL  se puso rojo, pero por otra cosa: ' + b.n);
        console.log('         esperaba ' + b.espera + ', salio: ' + rojos.slice(0, 2).join(' / ').slice(0, 160));
        escapados.push(b.n + ' (rojo por otro assert)');
      }
    }
    fs.writeFileSync(FUENTE, original, 'utf8');
  });
} finally {
  fs.writeFileSync(FUENTE, original, 'utf8');
  try { build(); } catch (e) { console.log('\n  ATENCION: no pude reconstruir al restaurar. Corre `npm run build`.'); }
  /* Contra el estado de ANTES de empezar, no contra git HEAD: es normal estar
     trabajando con cambios sin commitear, y compararlo con git diria "sucio"
     siempre sin probar nada. */
  const vuelve = fs.readFileSync(FUENTE, 'utf8') === original;
  const appIgual = fs.readFileSync(APP, 'utf8') === appAntes;
  console.log(vuelve && appIgual
    ? '\n  el arbol quedo byte por byte como estaba (fuente y app.html)'
    : '\n  ATENCION: no quedo igual que antes — fuente ' + (vuelve ? 'ok' : 'DISTINTA') +
      ', app.html ' + (appIgual ? 'ok' : 'DISTINTO'));
}

console.log('\n  ' + cazados + ' de ' + BUGS.length + ' bugs cazados');
if (escapados.length) { console.log('  SE ESCAPARON:'); escapados.forEach(e => console.log('    · ' + e)); }
console.log('');
process.exit(escapados.length ? 1 : 0);
