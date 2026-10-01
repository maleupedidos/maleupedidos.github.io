/* El candado entre el envio y el cobro de Red. (1/10/2026)
 *
 * Por que existe: `rutaToggleCobrado` manda {cobroCliente:true} SIN el monto, asi
 * que el backend lo calcula leyendo la planilla. Si se cobra mientras el envio se
 * esta guardando, se registra el total CON envio ($23.000) y la pantalla mostro
 * $20.000: $3.000 de menos en la rendicion del vendedor.
 *
 * Codex encontro tres cosas en dos pasadas, y las tres se prueban aca:
 *   1. que Cobrado quede bloqueado mientras el POST esta en vuelo;
 *   2. que NO se suelte al arrancar la verificacion, sino al terminarla — y que
 *      si la verificacion falla siga bloqueado;
 *   3. que el cobro MIXTO tambien lo respete, que era la puerta que faltaba.
 *
 * Corre con:  node _tools/pruebas/probar_candado_envio.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', '..', 'red.html');
const txt = fs.readFileSync(SRC, 'utf8');

let ok = 0, mal = 0;
function chk(nombre, cond) {
  if (cond) { ok++; console.log('  ok   ' + nombre); }
  else { mal++; console.log('  MAL  ' + nombre); }
}

/* ── Se saca la mecanica del candado y se EJECUTA, no se lee ───────────── */
function sacar(nombre) {
  const re = new RegExp('function\\s+' + nombre + '\\s*\\([^)]*\\)\\s*\\{');
  const m = txt.match(re);
  if (!m) throw new Error('no encontre la funcion ' + nombre + ' en red.html');
  let i = txt.indexOf('{', m.index), prof = 0, fin = -1;
  for (let j = i; j < txt.length; j++) {
    if (txt[j] === '{') prof++;
    else if (txt[j] === '}') { prof--; if (prof === 0) { fin = j + 1; break; } }
  }
  if (fin < 0) throw new Error('no pude cerrar ' + nombre);
  return txt.slice(m.index, fin);
}

const ctx = {
  redEnvioEnVuelo: '',
  redEnvioSinVerificar: '',
  _normN: (n) => String(n == null ? '' : n).trim().toUpperCase(),
};
vm.createContext(ctx);
vm.runInContext(sacar('_envioTrabado') + '\n' + sacar('_envioTrabadoMsg'), ctx);

console.log('== Sin nada en vuelo, cobrar se puede ==');
ctx.redEnvioEnVuelo = ''; ctx.redEnvioSinVerificar = '';
chk('un pedido cualquiera no esta trabado', ctx._envioTrabado({ n: '1234' }) === false);
chk('y sin pedido tampoco revienta', ctx._envioTrabado(null) === false);

console.log('== Con el POST en vuelo, SOLO ese pedido queda trabado ==');
ctx.redEnvioEnVuelo = '1234';
chk('el pedido del envio en vuelo esta trabado', ctx._envioTrabado({ n: '1234' }) === true);
chk('otro pedido NO se traba de rebote', ctx._envioTrabado({ n: '9999' }) === false);
chk('el N° se compara normalizado, no crudo', ctx._envioTrabado({ n: ' 1234 ' }) === true);
chk('el mensaje dice que espere', /Esperá/.test(ctx._envioTrabadoMsg({ n: '1234' })));

console.log('== Si la verificacion quedo sin respuesta, SIGUE trabado ==');
/* Es el bug 2: el finally soltaba el candado al ARRANCAR loadDashboard(). */
ctx.redEnvioEnVuelo = '';            // el fetch ya termino
ctx.redEnvioSinVerificar = '1234';   // pero no sabemos si llego
chk('el pedido sigue trabado aunque el fetch termino', ctx._envioTrabado({ n: '1234' }) === true);
chk('y el mensaje manda a refrescar, no a esperar',
    /Actualizado/.test(ctx._envioTrabadoMsg({ n: '1234' })));
chk('otro pedido sigue libre', ctx._envioTrabado({ n: '9999' }) === false);

console.log('== Cuando entra dato fresco, se suelta ==');
ctx.redEnvioSinVerificar = '';
chk('ya se puede cobrar', ctx._envioTrabado({ n: '1234' }) === false);

console.log('== Las CUATRO puertas que cobran consultan el candado ==');
/* Ejecutar cada puerta pide media app. Lo que se verifica aca es que ninguna
   quede sin el freno, que es justo lo que paso con el Mixto: el bug no era la
   logica del candado, era una puerta que no preguntaba. */
const PUERTAS = ['rutaToggleCobrado', 'rutaConfirmarMixto', '_rutaCommitMixto', 'rutaEnvioAnular'];
PUERTAS.forEach((fn) => {
  const cuerpo = sacar(fn);
  chk(fn + ' llama a _envioTrabado', /_envioTrabado\s*\(/.test(cuerpo));
  chk(fn + ' corta con return al estar trabado',
      /_envioTrabado\s*\([^)]*\)\s*\)\s*\{[^}]*return/.test(cuerpo));
});

console.log('== El catch NO suelta el candado, y el ↻ SI ==');
const anular = sacar('rutaEnvioAnular');
chk('el catch pasa a redEnvioSinVerificar', /redEnvioSinVerificar\s*=\s*_normN/.test(anular));
chk('y solo lo limpia si la verificacion dio ok',
    /if\s*\(ok\)\s*redEnvioSinVerificar\s*=\s*''/.test(anular));
chk('loadDashboard limpia el sin-verificar cuando llega dato fresco',
    /redEnvioSinVerificar\s*=\s*'';\s*\n\s*renderDashboard/.test(txt));
chk('el catch NO revierte a ciegas (no quedo un aplicar(antes) ahi)',
    !/catch\s*\(\s*\)\s*=>\s*\{[^}]*aplicar\(antes\)/.test(anular));

console.log('');
console.log(ok + ' ok, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
