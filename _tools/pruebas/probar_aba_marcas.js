/* LAS MARCAS DE ABASTECIMIENTO SOBREVIVEN A LA LECTURA (2/11/2026).

   node _tools/pruebas/probar_aba_marcas.js [archivo]      (busqueda.html por defecto)

   «Marcar como pedido» y «Recibir» dejan una marca (`marcadosPedido` / `marcadosRecibido`) que dibuja el boton como
   hecho. `_abaAplicarBusqueda` las vaciaba en cada lectura: si la lista todavia no traia el cambio (replica de Orden
   de Compra), el boton volvia. Saca _abaMarcasPodar y _abaAplicarBusqueda tal cual y sostiene:
   · una marca recien puesta sigue despues de una lectura;
   · una de hace mas de 6 min se suelta;
   · una marca vieja (`true`, de antes de esto, guardada en el celular) se suelta.
   Con el busqueda.html de antes la primera da MAL. */
'use strict';
const fs = require('fs'), path = require('path');
const ARCH = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'busqueda.html'));
const src = fs.readFileSync(ARCH, 'utf8');
function sacar(nombre) {
  const i = src.indexOf('function ' + nombre + '(');
  if (i < 0) return '';
  let j = src.indexOf('{', i), n = 0;
  for (; j < src.length; j++) { if (src[j] === '{') n++; else if (src[j] === '}' && --n === 0) break; }
  return src.slice(i, j + 1);
}
let ok = 0, mal = 0;
const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + t + (c ? '' : '  -> ' + JSON.stringify(d))); };
let reloj = Date.parse('2026-11-02T23:30:00-03:00');
const m = new Function('reloj', 'Date_', `
  var Date = { now: function () { return reloj(); } };
  var busqueda = null, marcadosPedido = {}, marcadosRecibido = {}, waCopied = {}, ABA_MARCA_MS = 6 * 60 * 1000;
  function _abaRecienPodar() {} function _abaGuardandoPodar() {} function _semActual() { return 45; } function _abaPodarArmado() {} function abaSaveLocal() {}
  ${sacar('_abaMarcasPodar')}
  ${sacar('_abaAplicarBusqueda')}
  return { aplicar: _abaAplicarBusqueda, mp: function () { return marcadosPedido; }, mr: function () { return marcadosRecibido; } };
`)(() => reloj, Date);
m.mp()['Claudia Polito|s45'] = reloj;
m.mr()['LM Carnes|s45'] = reloj;
m.mp()['Vieja|s45'] = true;
reloj += 20000;
m.aplicar({ provs: [{ n: 'Claudia Polito' }, { n: 'LM Carnes' }] });
chk('«Pedido enviado» recien marcado sigue despues de una lectura', !!m.mp()['Claudia Polito|s45'], m.mp());
chk('«Recibido» recien marcado sigue despues de una lectura', !!m.mr()['LM Carnes|s45'], m.mr());
chk('una marca vieja (true, de antes) se suelta', !('Vieja|s45' in m.mp()), m.mp());
reloj += 7 * 60000;
m.aplicar({ provs: [{ n: 'Claudia Polito' }, { n: 'LM Carnes' }] });
chk('pasados 6 min se suelta (la lista ya lo trae)', !m.mp()['Claudia Polito|s45'] && !m.mr()['LM Carnes|s45'], { mp: m.mp(), mr: m.mr() });
console.log('\n' + ok + ' ok · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
