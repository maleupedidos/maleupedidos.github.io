/* Cargar el envío de un Red que nació sin envío (8/11/2026, 596). node probar_envio_cargar.js [red.html] */
'use strict';
const fs = require('fs'), vm = require('vm');
const txt = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', '..', 'red.html'), 'utf8');
function sacar(nombre) {
  const m = txt.match(new RegExp('function\\s+' + nombre + '\\s*\\([^)]*\\)\\s*\\{'));
  if (!m) throw new Error('no encontre ' + nombre);
  let i = txt.indexOf('{', m.index), prof = 0;
  for (let j = i; j < txt.length; j++) { if (txt[j] === '{') prof++; else if (txt[j] === '}' && --prof === 0) return txt.slice(m.index, j + 1); }
}
let ok = 0, mal = 0; const chk = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ok   ' : '  MAL  ') + n); };
function correr(p, args, confirma) {
  const posts = [], toasts = [], confs = [];
  const ctx = { session: { nombre: 'Marcos Bottcher' }, lastDashboardData: null, redEnvioEnVuelo: new Set(), redEnvioSinVerificar: new Set(),
    _rutaCurrent: () => p, _envioTrabado: () => false, _envioTrabadoMsg: () => '', ars: n => '$' + n, _normN: n => String(n),
    _envioMontoSello: s => { const m = String(s || '').match(/^(\d+)/); return m ? Number(m[1]) : 0; },
    renderRuta() {}, updateMainBadges() {}, savedInd() {}, redToast: t => toasts.push(t), confirm: m => { confs.push(m); return confirma; },
    loadDashboard() {}, APPS_SCRIPT_URL: 'x', console,
    fetch: (u, x) => { posts.push(JSON.parse(x.body)); return Promise.resolve({ json: async () => ({ ok: true, envio: 3000 }) }); } };
  vm.createContext(ctx);
  vm.runInContext((txt.match(/var ENVIO_RED_MONTO = \d+;/) || ['var ENVIO_RED_MONTO;'])[0] + sacar('rutaEnvioAnular'), ctx);
  ctx.rutaEnvioAnular.apply(null, args);
  return new Promise(r => setTimeout(() => r({ posts, toasts, confs, p }), 50));
}
(async () => {
  let r = await correr({ n: '9', row: -9, c: 'Vero', env: 0, envAnu: '', ep: 'No Cobrado' }, [false, 3000], true);
  chk('sin envío: manda monto 3000 y anular false', r.posts.length === 1 && r.posts[0].monto === 3000 && r.posts[0].anular === false);
  chk('el cartel dice que es suyo', /es tuyo/.test(r.confs[0] || ''));
  chk('la pantalla lo muestra al toque (env 3000)', r.p.env === 3000);
  chk('avisa «Envío de $3000 cargado»', r.toasts.some(t => /cargado/.test(t)));
  r = await correr({ n: '9', row: -9, c: 'Vero', env: 3000, envAnu: '', ep: 'No Cobrado' }, [false, 3000], true);
  chk('si ya tiene envío no manda monto (no lo suma dos veces)', !(r.posts[0] && r.posts[0].monto));
  r = await correr({ n: '9', row: -9, c: 'Vero', env: 0, envAnu: '', ep: 'Cobrado' }, [false, 3000], true);
  chk('cobrado: no manda nada', r.posts.length === 0);
  r = await correr({ n: '9', row: -9, c: 'Vero', env: 0, envAnu: '', ep: 'No Cobrado' }, [false, 3000], false);
  chk('si dice que no, no manda nada', r.posts.length === 0 && r.p.env === 0);
  r = await correr({ n: '9', row: -9, c: 'Vero', env: 0, envAnu: '3000 | Marcos | hoy', ep: 'No Cobrado' }, [false], true);
  chk('«Volver a cobrarlo» sigue igual (sin monto)', r.posts.length === 1 && r.posts[0].monto === undefined);
  r = await correr({ n: '9', row: -9, c: 'Vero', env: 3000, envAnu: '', ep: 'No Cobrado' }, [true], true);
  chk('«No se lo cobro» sigue igual', r.posts.length === 1 && r.posts[0].anular === true && r.p.env === 0);
  const btn = /Sin envío' \+ _envBtn\('false, ' \+ ENVIO_RED_MONTO/.test(txt);
  chk('el botón se dibuja cuando no hay envío', btn);
  console.log(mal ? 'MAL (' + mal + ')' : 'TODO OK (' + ok + ')'); process.exit(mal ? 1 : 0);
})();
