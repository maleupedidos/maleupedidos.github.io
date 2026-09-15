/* La sesion no se cierra por una sola respuesta (15/9/2026).

   Tadeo repartiendo folletos: el ERP lo echo 5 veces entre las 17:03 y las 17:33,
   y a Lucas a las 17:06 en otra compu. El backend contestaba authRequired tambien
   cuando NO PUDO LEER la hoja Sesiones, y el panel borraba el token con una sola
   respuesta. Ahora el backend distingue `sesionNoVerificada`, y el panel:
   · la reintenta y nunca cierra la sesion por eso;
   · ante authRequired pregunta una segunda vez antes de cerrar.

   Corre el bloque AUTH REAL, sacado del archivo, en un Chrome headless con el
   backend simulado por CDP (nada sale a produccion).
     node probar_sesion_no_se_cierra.js                 (../../_src/panel.src.html)
     node probar_sesion_no_se_cierra.js <otro.html>     (la version anterior: rojo) */
const fs = require('fs'); const path = require('path');
const { abrir, evaluar } = require('./cdp');

const archivo = process.argv[2] || path.join(__dirname, '..', '..', '_src', 'panel.src.html');
const src = fs.readFileSync(archivo, 'utf8');
const iMarca = src.indexOf('if (window.__maleuAuth) return;');
const iIni = src.lastIndexOf('(function(){', iMarca);
const iCola = src.indexOf('window.__colaGet', iMarca);
const iFin = src.indexOf('})();', iCola) + 5;
if (iMarca < 0 || iIni < 0 || iCola < 0) { console.error('no encontre el bloque AUTH'); process.exit(2); }
const bloque = src.slice(iIni, iFin);

const HTML = '<!doctype html><meta charset="utf-8"><script>var toast=function(m){(window.__toasts=window.__toasts||[]).push(String(m));};'
  + 'window.alert=function(m){(window.__alerts=window.__alerts||[]).push(String(m));};'
  + 'localStorage.setItem("maleu_token","tok");localStorage.setItem("maleu_panel_session","{}");'
  /* sin esto _sesionVencida recarga la pagina en medio de la medicion */
  + 'window.__maleuAuthAviso=false;</script><script>' + bloque + '</script>';
const b64 = s => Buffer.from(s, 'utf8').toString('base64');

let cuerpos = [], pedidos = [];
async function main() {
  const cli = await abrir();
  let ok = 0, mal = 0;
  const chk = (c, t, d) => { if (c) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
  try {
    await cli.enviar('Fetch.enable', { patterns: [{ urlPattern: 'http://maleu.test/*' }, { urlPattern: '*script.google.com/macros*' }, { urlPattern: '*script.googleusercontent.com*' }] });
    cli.escuchar(async (m, p) => {
      if (m !== 'Fetch.requestPaused') return;
      const u = p.request.url, id = p.requestId, cors = [{ name: 'Access-Control-Allow-Origin', value: '*' }];
      if (u.startsWith('http://maleu.test/')) {
        await cli.enviar('Fetch.fulfillRequest', { requestId: id, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: b64(HTML) });
      } else if (u.includes('script.google.com/macros')) {
        pedidos.push(p.request.method);
        const k = pedidos.length;
        await cli.enviar('Fetch.fulfillRequest', { requestId: id, responseCode: 302, responseHeaders: cors.concat([{ name: 'Location', value: 'https://script.googleusercontent.com/macros/echo?user_content_key=K' + k }]), body: '' });
      } else {
        const k = Number((u.match(/K(\d+)/) || [])[1]) || 1;
        const cuerpo = cuerpos[Math.min(k - 1, cuerpos.length - 1)];
        await cli.enviar('Fetch.fulfillRequest', { requestId: id, responseCode: 200, responseHeaders: cors.concat([{ name: 'Content-Type', value: 'application/json' }]), body: b64(cuerpo) });
      }
    });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.navigate', { url: 'http://maleu.test/p.html' });
    for (let i = 0; i < 40; i++) { if (await evaluar(cli, 'typeof window.__maleuAuth').catch(() => '') === 'boolean') break; await new Promise(r => setTimeout(r, 150)); }
    const API = 'https://script.google.com/macros/s/PRUEBA/exec';
    const BIEN = '{"ok":true,"dato":42}', NOVER = '{"ok":false,"sesionNoVerificada":true}', AUTH = '{"ok":false,"err":"No autorizado","authRequired":true}';
    async function correr(lista, post) {
      cuerpos = lista; pedidos = [];
      await evaluar(cli, `window.__alerts=[];window.__toasts=[];localStorage.setItem("maleu_token","tok");window.__maleuAuthAviso=true;`);
      const t0 = Date.now();
      const r = await evaluar(cli, (post ? `fetch('${API}',{method:'POST',body:JSON.stringify({action:'x'})})` : `fetch('${API}?action=ocLight')`)
        + `.then(r=>r.text()).then(t=>({t:t,tok:localStorage.getItem('maleu_token'),toasts:window.__toasts}))`);
      return Object.assign({ ms: Date.now() - t0, pedidos: pedidos.slice() }, r);
    }

    console.log('1. el backend no pudo leer Sesiones dos veces, a la tercera anda');
    let r = await correr([NOVER, NOVER, BIEN]);
    chk(r.t === BIEN, 'llegan los datos', r.t);
    chk(r.tok === 'tok', 'la sesion sigue abierta (el token no se borro)', r.tok);
    chk(r.pedidos.length === 3, '3 pedidos (2 reintentos)', r.pedidos);

    console.log('2. no verificada siempre');
    r = await correr([NOVER]);
    chk(r.tok === 'tok', 'NUNCA cierra la sesion por eso', r.tok);
    chk(r.pedidos.length === 4 && (r.toasts || []).some(x => /Seguís adentro/.test(x)), 'se rinde a los 4 pedidos y avisa que sigue adentro', [r.pedidos.length, r.toasts]);

    console.log('3. un authRequired suelto');
    r = await correr([AUTH, BIEN]);
    chk(r.t === BIEN && r.tok === 'tok', 'pregunta de nuevo, llegan los datos y la sesion sigue', [r.t, r.tok]);

    console.log('4. authRequired dos veces');
    r = await correr([AUTH, AUTH]);
    chk(r.tok === null, 'recien ahi cierra la sesion', r.tok);
    chk(r.pedidos.length === 2, 'con 2 pedidos, no mas', r.pedidos);

    console.log('5. un POST con authRequired suelto');
    r = await correr([AUTH, BIEN], true);
    chk(r.t === BIEN && r.tok === 'tok' && r.pedidos.filter(x => x === 'POST').length === 2, 'reintenta el POST (el backend no escribio nada) y sigue adentro', r);
  } finally { cli.matar(); }
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
