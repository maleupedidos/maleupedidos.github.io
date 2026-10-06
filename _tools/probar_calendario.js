// El calendario de Maleu (6/10/2026): corre la funcion del PANEL y su espejo de
// Code.js sobre los mismos bordes reales, y corta si alguna da otra cosa.
//   node _tools/probar_calendario.js
// Lee ../estancias/.clasp-src/Code.js (los dos repos son hermanos, en la
// original y en las copias).
'use strict';
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const panel = fs.readFileSync(path.join(raiz, '_src/panel.src.html'), 'utf8');
const code = fs.readFileSync(path.join(raiz, '../estancias/.clasp-src/Code.js'), 'utf8');

// Saca `function nombre(...){...}` contando llaves (no hay llaves en strings ahi).
function sacar(src, nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) throw new Error('no esta ' + nombre);
  let j = src.indexOf('{', i), n = 0;
  for (; j < src.length; j++) { if (src[j] === '{') n++; else if (src[j] === '}' && --n === 0) break; }
  return src.slice(i, j + 1);
}
const F = new Function(
  ['_rtIso', '_rtDia', '_rtDeIso', 'calMesCorto', '_calSem', 'calSemanasMes', 'calSemanaDe', 'calSemanaPorClave', 'calMover', 'calPesosDias', 'calMetaSemana', 'calFraccionMes']
    .map(n => sacar(panel, n)).join('\n') +
  '\nreturn {calSemanasMes, calSemanaDe, calSemanaPorClave, calMover, calPesosDias, calMetaSemana, calFraccionMes};')();
const B = new Function(
  sacar(code, '_calSemanasMes_') + '\n' + sacar(code, '_calSemanaDe_') +
  '\nreturn {_calSemanasMes_, _calSemanaDe_};')();

let fallas = 0, chequeos = 0;
function ok(cond, msg) { chequeos++; if (!cond) { fallas++; console.log('  MAL  ' + msg); } }
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const D = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

function sem(fecha, k, desde, hasta, dias, tit) {
  const f = F.calSemanaDe(fecha), b = B._calSemanaDe_(D(fecha));
  const got = f && [f.k, f.d, f.h, f.dias].join(' ');
  const want = [k, desde, hasta, dias].join(' ');
  ok(got === want, `panel ${fecha}: ${got} ≠ ${want}`);
  const gb = b && [b.k, iso(b.desde), iso(b.hasta), b.dias].join(' ');
  ok(gb === want, `Code.js ${fecha}: ${gb} ≠ ${want}`);
  if (tit) ok(f.tit === tit, `titulo ${fecha}: «${f.tit}» ≠ «${tit}»`);
}

console.log('Bordes reales');
// 28/9–4/10/2026: 3 dias de septiembre + 4 de octubre, NO una semana
sem('2026-09-28', '2026-09-5', '2026-09-28', '2026-09-30', 3, 'Sem 5 · 28–30 sep · 3 días');
sem('2026-09-30', '2026-09-5', '2026-09-28', '2026-09-30', 3);
sem('2026-10-01', '2026-10-1', '2026-10-01', '2026-10-04', 4, 'Sem 1 · 1–4 oct · 4 días');
sem('2026-10-04', '2026-10-1', '2026-10-01', '2026-10-04', 4);
sem('2026-10-06', '2026-10-2', '2026-10-05', '2026-10-11', 7, 'Sem 2 · 5–11 oct · 7 días');  // hoy martes
// 31/10 sabado → 1/11 domingo solo
sem('2026-10-31', '2026-10-5', '2026-10-26', '2026-10-31', 6);
sem('2026-11-01', '2026-11-1', '2026-11-01', '2026-11-01', 1, 'Sem 1 · 1 nov · 1 día');
sem('2026-11-02', '2026-11-2', '2026-11-02', '2026-11-08', 7);
// cambio de año: lun 28/12/2026 → dom 3/1/2027
sem('2026-12-31', '2026-12-5', '2026-12-28', '2026-12-31', 4);
sem('2027-01-01', '2027-01-1', '2027-01-01', '2027-01-03', 3);
sem('2027-01-04', '2027-01-2', '2027-01-04', '2027-01-10', 7);
// un mes que arranca en lunes: la sem 1 es entera
sem('2027-02-01', '2027-02-1', '2027-02-01', '2027-02-07', 7);
// bisiesto
sem('2028-02-29', '2028-02-5', '2028-02-28', '2028-02-29', 2);

console.log('Cada mes de 2026-2028 se parte entero, sin huecos ni dias repetidos');
for (let y = 2026; y <= 2028; y++) for (let m = 0; m < 12; m++) {
  const ss = F.calSemanasMes(y, m), sb = B._calSemanasMes_(y, m);
  const total = ss.reduce((a, s) => a + s.dias, 0);
  ok(total === new Date(y, m + 1, 0).getDate(), `${y}-${m + 1}: suma ${total} dias`);
  ok(ss.length === sb.length && ss.every((s, i) => s.k === sb[i].k && s.d === iso(sb[i].desde) && s.h === iso(sb[i].hasta)), `${y}-${m + 1}: panel y Code.js difieren`);
  ss.forEach((s, i) => {
    if (i > 0) ok(s.desde.getDay() === 1, `${s.k} no arranca en lunes`);
    if (i < ss.length - 1) ok(s.hasta.getDay() === 0, `${s.k} no termina en domingo`);
  });
}

console.log('Moverse y claves');
ok(F.calMover(F.calSemanaDe('2026-10-01'), -1).k === '2026-09-5', 'atras de sem 1 oct');
ok(F.calMover(F.calSemanaDe('2026-12-31'), 1).k === '2027-01-1', 'adelante de sem 5 dic');
ok(F.calMover(F.calSemanaDe('2027-01-01'), -2).k === '2026-12-4', 'dos atras cruzando el año');
ok(F.calSemanaPorClave('2026-11-1').d === '2026-11-01', 'clave 2026-11-1');
ok(F.calSemanaPorClave('2026-10-9') === null, 'clave inexistente');

console.log('La meta se reparte por el peso de los dias, no parejo');
// historia: todo vie y sab
const pesos = F.calPesosDias([{ d: '2026-09-25', f: 600 }, { d: '2026-09-26', f: 400 }]);
ok(Math.abs(pesos[5] - 0.6) < 1e-9 && Math.abs(pesos[6] - 0.4) < 1e-9 && pesos[1] === 0, 'pesos vie/sab');
const s1 = F.calSemanaDe('2026-10-01');                 // jue-dom: 1 vie + 1 sab de los 5+5 del mes
ok(Math.abs(F.calMetaSemana(1000, s1, pesos) - 200) < 1e-6, 'sem 1 oct se lleva 1/5 = 200, no 4/31 = 129');
ok(Math.abs(F.calMetaSemana(1000, F.calSemanaDe('2026-11-01'), pesos)) < 1e-9, 'sem 1 nov (solo domingo) se lleva 0');
const parejo = F.calPesosDias([]);
ok(Math.abs(F.calMetaSemana(310, s1, parejo) - 40) < 1e-6, 'sin historia: parejo, 4/31');
const sumaOct = F.calSemanasMes(2026, 9).reduce((a, s) => a + F.calMetaSemana(1000, s, pesos), 0);
ok(Math.abs(sumaOct - 1000) < 1e-6, 'las semanas de octubre suman la meta del mes');
// El "tendria que ir" del Plan: al cierre del jueves 1 de octubre, 0 (no hubo vie/sab);
// al cierre del domingo 4, 1/5 (un vie y un sab de los cinco); el ultimo dia, todo.
ok(F.calFraccionMes(2026, 9, 1, pesos) === 0, 'jue 1/10: nada de la meta todavia');
ok(Math.abs(F.calFraccionMes(2026, 9, 4, pesos) - 0.2) < 1e-9, 'dom 4/10: 20% de la meta');
ok(Math.abs(F.calFraccionMes(2026, 9, 31, pesos) - 1) < 1e-9, 'sab 31/10: el 100%');
ok(Math.abs(F.calFraccionMes(2026, 9, 4, parejo) - 4 / 31) < 1e-9, 'sin historia: parejo, 4/31');

console.log(`\n${chequeos - fallas}/${chequeos} chequeos OK`);
process.exit(fallas ? 1 : 0);
