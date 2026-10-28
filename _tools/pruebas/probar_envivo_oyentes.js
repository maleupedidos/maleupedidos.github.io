/* VARIOS OYENTES POR CANAL (27/10/2026). Saca del archivo las funciones del en vivo (_enVivoRepartir,
   _enVivoEscuchar) y las corre aisladas: dos pantallas en `erp:fotos` (Abastecimiento y el CRM) reciben
   las dos la señal; anotar dos veces la misma no la duplica; una que revienta no corta a la otra; y al
   volver de un corte se avisa a las dos. Uso: node _tools/pruebas/probar_envivo_oyentes.js [archivo] */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', '..', '_src', 'panel.src.html'), 'utf8');
const saca = (n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } };
const codigo = saca('_enVivoRepartir') + '\n' + saca('_enVivoEscuchar');
const ctx = { _ENV: { ws: null, canales: {} }, _enVivoConectar: () => {}, _enVivoUnir: () => {}, _enVivoPoner: () => {} };
new Function('ctx', 'with (ctx) { ' + codigo + '; ctx._enVivoEscuchar = _enVivoEscuchar; }')(ctx);
let ok = 0, mal = 0; const chk = (t, c) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t); };
const llegaron = [], volvieron = [];
const aba = (d) => llegaron.push('aba:' + d.screen), crm = (d) => llegaron.push('crm:' + d.screen), roto = () => { throw new Error('x'); };
ctx._enVivoEscuchar('erp:fotos', aba, () => volvieron.push('aba'));
ctx._enVivoEscuchar('erp:fotos', crm, () => volvieron.push('crm'));
ctx._enVivoEscuchar('erp:fotos', crm, () => volvieron.push('crm2'));   // la misma: no duplica, cambia su alVolver
ctx._enVivoEscuchar('erp:fotos', roto, null);
const c = ctx._ENV.canales['erp:fotos'];
try { c && typeof c.alCambio === 'function' && c.alCambio({ screen: 'crmClientes' }); } catch (e) {}
chk('las dos pantallas reciben la señal (antes el CRM le sacaba la escucha a Abastecimiento)', llegaron.includes('aba:crmClientes') && llegaron.includes('crm:crmClientes'));
chk('la misma funcion anotada dos veces no se duplica', llegaron.filter((x) => x === 'crm:crmClientes').length === 1);
chk('una que revienta no corta a las demas', llegaron.length === 2);
try { c && typeof c.alVolver === 'function' && c.alVolver(); } catch (e) {}
chk('al volver de un corte se avisa a las dos (con el alVolver nuevo del CRM)', volvieron.join(',') === 'aba,crm2');
console.log('\n' + ok + ' ok · ' + mal + ' MAL'); process.exit(mal ? 1 : 0);
