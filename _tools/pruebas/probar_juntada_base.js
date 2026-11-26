/* LOS INTEGRANTES DE UNA JUNTADA EN LA BASE (300, 29/10/2026): `_cobExtras` / `_cobExtraSumar` de Ruta, sacadas del
   app.html COMPILADO tal cual, con la base y el celular de mentira. Sin navegador y sin red.
   node _tools/pruebas/probar_juntada_base.js [--reinyectar]
   Sostiene:
     · con JUNTADA_INTEGRANTES_BASE apagada, como antes: solo el celular, y ni se llama a la base;
     · prendida: lee la base una vez (no en cada repintado), junta lo de la base con lo del celular sin repetir
       (sin acentos ni mayúsculas), y repinta cuando llega algo nuevo;
     · lo que el celular tenía de antes y la base no, lo sube (una vez por nombre);
     · sumar a alguien lo anota en el celular Y en la base, con su teléfono del CRM;
     · si la base no contesta, lo del celular sigue estando.
   --reinyectar: `_cobExtras` sin juntar lo de la base; la prueba lo tiene que agarrar. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let html = fs.readFileSync(path.join(__dirname, '..', '..', 'app.html'), 'utf8');
if (process.argv[2] === '--reinyectar') html = html.replace("(_cobExtraBase[ck]||[]).forEach(function(n){if(!out.some(", "([]).forEach(function(n){if(!out.some(");
let ok = 0, mal = 0; const chk = (t, c, d) => { c ? ok++ : mal++; console.log((c ? '  ok  ' : '  MAL ') + t + (c ? '' : '  -> ' + JSON.stringify(d).slice(0, 500))); };
const bloque = (pre) => { const i = html.indexOf(pre); if (i < 0) throw new Error('no está: ' + pre); let d = 0, j = html.indexOf('{', i); for (; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) break; } return html.slice(i, j + 1); };
const linea = (pre) => html.slice(html.indexOf(pre), html.indexOf('\n', html.indexOf(pre)));
const G = { JSON, Promise, Object, Date, Array, String, Math }; vm.createContext(G);
vm.runInContext(`var __ls = {}, __rpc = [], __base = {}, __caida = false, __repintes = 0, _sbPerm = { pal: {} }, _npClientesCache = [{ nombre: 'Ana Gómez', tel: '11 5555-1234' }];
  var localStorage = { getItem: function (k) { return k in __ls ? __ls[k] : null; }, setItem: function (k, v) { __ls[k] = String(v); } };
  function _sbPermiso() { return Promise.resolve({ url: 'https://b', key: 'k', token: 't' }); }
  function _cobGrpRepintar() { __repintes++; }
  function fetch(u, x) { var fn = /rpc\\/(\\w+)/.exec(u)[1], p = JSON.parse(x.body).p; __rpc.push({ fn: fn, p: p });
    if (__caida) return Promise.reject(new TypeError('Failed to fetch'));
    var d = fn === 'juntada_integrantes_pantalla' ? { ok: true, juntadas: __base } : { ok: true, ck: 'g:' + p.grp, integrantes: [p.nombre] };
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(JSON.parse(JSON.stringify(d))); } }); }
  var _COB_EXTRA_LS = 'maleu_juntada_extra';
  ${linea('function _cobNorm(')}
  ${linea('function _cobEsEvento(')}
  ${linea('function _cobExtrasLocal(')}
  ${linea('var _cobExtraBase=')}
  ${bloque('function _cobJuntadaBaseOn(')}
  ${bloque('function _cobJuntadaRpc(')}
  ${bloque('function _cobExtrasTraer(')}
  ${bloque('function _cobExtras(')}
  ${bloque('function _cobExtraSumar(')}`, G);
const esperar = () => new Promise((r) => setTimeout(r, 30));
const run = (s) => vm.runInContext(s, G);
(async () => {
  run(`__ls[_COB_EXTRA_LS] = JSON.stringify({ 'g:cumple de juan': ['Pedro'], 'n:otro|t:1': ['X'] });`);
  let x = run(`_cobExtras('g:cumple de juan')`); await esperar();
  chk('apagada: solo el celular, y ni se llama a la base', JSON.stringify(x) === '["Pedro"]' && run('__rpc.length') === 0, [x, run('__rpc')]);
  run(`_sbPerm.pal.juntadaBase = true; __base = { 'g:cumple de juan': ['Ana Gómez', 'pedro'] };`);
  run(`_cobExtras('g:cumple de juan')`); await esperar();
  x = run(`_cobExtras('g:cumple de juan')`); await esperar();
  const lecturas = run(`__rpc.filter(function (r) { return r.fn === 'juntada_integrantes_pantalla'; }).length`);
  chk('prendida: junta la base con el celular sin repetir (pedro = Pedro)', JSON.stringify(x) === '["Pedro","Ana Gómez"]', x);
  chk('lee la base UNA vez aunque se repinte, y repinta cuando llega', lecturas === 1 && run('__repintes') === 1, [lecturas, run('__repintes')]);
  chk('lo del celular que la base no tenía ya estaba (Pedro): no sube nada', run(`__rpc.filter(function (r) { return r.fn === 'juntada_integrante_directo'; }).length`) === 0, run('__rpc'));
  run(`__base = { }; _cobExtraBaseT = 0; __rpc = [];`);
  run(`_cobExtras('g:cumple de juan')`); await esperar();
  const subidas = run(`__rpc.filter(function (r) { return r.fn === 'juntada_integrante_directo'; })`);
  chk('lo que el celular tenía y la base no: lo sube (solo juntadas, no las casas)', subidas.length === 1 && subidas[0].p.grp === 'cumple de juan' && subidas[0].p.nombre === 'Pedro', subidas);
  run(`__rpc = [];`);
  run(`_cobExtraSumar('g:cumple de juan', 'Ana Gómez')`); await esperar();
  const s = run(`__rpc`);
  chk('sumar: al celular y a la base, con el teléfono del CRM', s.length === 1 && s[0].fn === 'juntada_integrante_directo' && s[0].p.tel === '11 5555-1234' && JSON.parse(run(`__ls[_COB_EXTRA_LS]`))['g:cumple de juan'].indexOf('Ana Gómez') >= 0, s);
  run(`__rpc = []; _cobExtraSumar('n:otro|t:1', 'Y')`); await esperar();
  chk('una casa (no juntada) no va a la base', run('__rpc.length') === 0);
  run(`__caida = true; _cobExtraBaseT = 0; _cobExtraBase = {};`);
  x = run(`_cobExtras('g:cumple de juan')`); await esperar();
  chk('la base caída: lo del celular sigue estando', JSON.stringify(x) === '["Pedro","Ana Gómez"]', x);
  console.log(`\n${ok} ok · ${mal} MAL`);
  process.exit(mal ? 1 : 0);
})();
