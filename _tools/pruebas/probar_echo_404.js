/* El 404 del echo de Google (15/9/2026).

   Un pedido a Apps Script son dos saltos: /exec corre el script y contesta 302,
   y el navegador busca la respuesta en script.googleusercontent.com/macros/echo.
   Ese 15/9 el segundo salto devolvia 404 a los 20-30 s aunque el script habia
   corrido, y pedir la MISMA url del echo otra vez andaba. El envoltorio de fetch
   del panel (`_pedir`) ahora reintenta solo el echo.

   Corre el envoltorio REAL —el bloque AUTH entero, sacado del archivo— en un
   Chrome headless, con los dos saltos simulados por CDP (Fetch). Nada sale a
   produccion.

     node probar_echo_404.js                    (lee ../../_src/panel.src.html)
     node probar_echo_404.js <otro.html>        (ej. la version de HEAD: tiene que dar rojo)

   Sostiene:
   1. GET con el echo en 404 una vez -> llega el JSON; /exec se pidio UNA vez.
   2. POST con el echo en 404 una vez -> llega; el POST salio UNA vez (no escribe dos).
   3. echo en 404 siempre -> se rinde (devuelve el 404) sin loop: 3 echos, 1 exec.
   4. echo bien de entrada -> un solo echo (no agrega pedidos cuando anda).
   5. un 404 que NO es del echo -> no se reintenta. */
const fs = require('fs'); const path = require('path');
const { abrir, evaluar } = require('./cdp');

const archivo = process.argv[2] || path.join(__dirname, '..', '..', '_src', 'panel.src.html');
const src = fs.readFileSync(archivo, 'utf8');
const iMarca = src.indexOf('if (window.__maleuAuth) return;');
if (iMarca < 0) { console.error('no encontre el bloque AUTH en ' + archivo); process.exit(2); }
const iIni = src.lastIndexOf('(function(){', iMarca);
const iCola = src.indexOf('window.__colaGet', iMarca);
const iFin = src.indexOf('})();', iCola) + 5;
if (iIni < 0 || iCola < 0 || iFin < 5) { console.error('no pude recortar el bloque AUTH'); process.exit(2); }
const bloque = src.slice(iIni, iFin);

const PAGINA = 'http://maleu.test/p.html';
const HTML = '<!doctype html><meta charset="utf-8"><script>var toast=function(){};</script><script>' + bloque + '</script>';
const b64 = s => Buffer.from(s, 'utf8').toString('base64');

let esc = {};                 /* escenario: echo -> lista de codigos por intento */
let cuenta = { exec: [], echo: 0 };
let clave = 0;

async function main(){
  const cli = await abrir();
  let ok = 0, mal = 0;
  const chk = (c, t) => { if (c) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };
  try {
    await cli.enviar('Fetch.enable', { patterns: [
      { urlPattern: 'http://maleu.test/*', requestStage: 'Request' },
      { urlPattern: '*script.google.com/macros*', requestStage: 'Request' },
      { urlPattern: '*script.googleusercontent.com*', requestStage: 'Request' }] });
    cli.escuchar(async (m, p) => {
      if (m !== 'Fetch.requestPaused') return;
      const u = p.request.url, id = p.requestId;
      const cors = [{ name: 'Access-Control-Allow-Origin', value: '*' }];
      try {
        if (u.startsWith('http://maleu.test/')) {
          await cli.enviar('Fetch.fulfillRequest', { requestId: id, responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: b64(HTML) });
        } else if (u.includes('script.google.com/macros')) {
          cuenta.exec.push(p.request.method);
          if (esc.execCodigo) {
            await cli.enviar('Fetch.fulfillRequest', { requestId: id, responseCode: esc.execCodigo,
              responseHeaders: cors.concat([{ name: 'Content-Type', value: 'text/html' }]), body: b64('<html>no</html>') });
            return;
          }
          const k = 'K' + (++clave);
          await cli.enviar('Fetch.fulfillRequest', { requestId: id, responseCode: 302,
            responseHeaders: cors.concat([{ name: 'Location', value: 'https://script.googleusercontent.com/macros/echo?user_content_key=' + k }]),
            body: '' });
        } else {
          const n = cuenta.echo++;
          const cod = esc.echo[Math.min(n, esc.echo.length - 1)];
          const body = cod === 200 ? '{"ok":true,"dato":42}' : '<html><body>No se encontro la pagina</body></html>';
          await cli.enviar('Fetch.fulfillRequest', { requestId: id, responseCode: cod,
            responseHeaders: cors.concat([{ name: 'Content-Type', value: cod === 200 ? 'application/json' : 'text/html' }]),
            body: b64(body) });
        }
      } catch (e) { console.error('fulfill', e.message); }
    });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.navigate', { url: PAGINA });
    for (let i = 0; i < 40; i++) {
      const listo = await evaluar(cli, 'typeof window.__maleuAuth').catch(() => 'x');
      if (listo === 'boolean') break;
      await new Promise(r => setTimeout(r, 150));
    }
    const API = 'https://script.google.com/macros/s/PRUEBA/exec';
    async function correr(nombre, e, expr){
      esc = e; cuenta = { exec: [], echo: 0 };
      const t0 = Date.now();
      const r = await evaluar(cli, expr);
      return Object.assign({ ms: Date.now() - t0, exec: cuenta.exec.slice(), echo: cuenta.echo }, r);
    }
    const GET = `fetch('${API}?action=ocLight').then(r=>r.text().then(t=>({st:r.status,t:t,e:window.__echo?{c:window.__echo.cuatrocientos,s:window.__echo.salvados}:null})))`;
    const POST = `fetch('${API}',{method:'POST',body:JSON.stringify({action:'x'})}).then(r=>r.text().then(t=>({st:r.status,t:t})))`;

    console.log('1. GET, echo 404 y despues 200');
    let r = await correr('1', { echo: [404, 200] }, GET);
    chk(r.st === 200 && r.t.indexOf('"dato":42') > -1, `llega el JSON (status ${r.st})`);
    chk(r.exec.length === 1, `el script corrio UNA vez (exec: ${r.exec.length})`);
    chk(r.echo === 2, `dos pedidos al echo (${r.echo})`);
    chk(r.e && r.e.c === 1 && r.e.s === 1, `window.__echo cuenta 1 y 1 (${JSON.stringify(r.e)})`);

    console.log('2. POST, echo 404 y despues 200');
    r = await correr('2', { echo: [404, 200] }, POST);
    chk(r.st === 200 && r.t.indexOf('"dato":42') > -1, `llega la respuesta (status ${r.st})`);
    chk(r.exec.filter(x => x === 'POST').length === 1, `el POST salio UNA vez (${r.exec.join(',')})`);

    console.log('3. echo 404 siempre');
    r = await correr('3', { echo: [404] }, GET);
    chk(r.st === 404, `se rinde y devuelve el 404 (status ${r.st})`);
    chk(r.echo === 3 && r.exec.length === 1, `3 echos y 1 exec (echo ${r.echo}, exec ${r.exec.length})`);
    chk(r.ms < 10000, `sin loop: ${r.ms} ms`);

    console.log('4. echo bien de entrada');
    r = await correr('4', { echo: [200] }, GET);
    chk(r.st === 200 && r.echo === 1 && r.exec.length === 1, `un solo echo (echo ${r.echo}, exec ${r.exec.length})`);

    console.log('5. 404 que no es del echo');
    r = await correr('5', { echo: [200], execCodigo: 404 }, GET);
    chk(r.st === 404 && r.exec.length === 1 && r.echo === 0, `no reintenta (exec ${r.exec.length}, echo ${r.echo})`);
  } finally { cli.matar(); }
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
