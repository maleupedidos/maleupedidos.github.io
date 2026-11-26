/* El cuadre del día en Ruta › ARMADO, con la sesión real (solo lectura): salir, volver, cerrado, palabras (texto.js) y toques.
   SBSES=<sesión de prueba> [BASE_URL=http://localhost:8080] node _tools/pruebas/probar_cuadre.js <ancho> <carpeta> */
'use strict';
const fs = require('fs');
const P = __dirname + '/';
const { abrir, evaluar } = require(P + 'cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const ANCHO = Number(process.argv[2] || 390), OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });   // la carpeta de salida puede no existir
const URL = (process.env.BASE_URL || 'http://localhost:8080') + '/app.html';   // BASE_URL sin /app.html
const PREP = require(P + 'sesion_prep.js')('x');
const SBSES = require(P + 'sbses_guarda.js')(process.env.SBSES, 'tadeo');
const PRE = ";try{localStorage.removeItem('maleu_apps_prueba');" + (ANCHO >= 769 ? "localStorage.setItem('maleu_sb_open','1');" : '') + "}catch(e){}";
const res = {};
async function foto(cli, nombre, alto) {
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: alto, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await T(900);
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + '/cuadre_' + nombre + '_' + ANCHO + '.png', Buffer.from(r.data, 'base64'));
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
}
async function tocar(cli, sel) {
  const r = await evaluar(cli, `(function(){var e=${sel};if(!e)return null;e.scrollIntoView({block:'center'});var b=e.getBoundingClientRect();if(b.top<120||b.bottom>innerHeight-60)scrollBy(0,b.top-innerHeight/2);b=e.getBoundingClientRect();var x=b.left+b.width/2,y=b.top+b.height/2,t=document.elementFromPoint(x,y);return {x:x,y:y,tapa:!(t===e||e.contains(t))}})()`);
  if (!r) return null;
  if (ANCHO < 700) { await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await T(60); await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  else { await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); }
  return r;
}
/* las palabras, con la MISMA cuenta de texto.js, acotada al cuadre */
const TX = fs.readFileSync(P + 'texto.js', 'utf8');
const CONTAR = TX.slice(TX.indexOf('const CONTAR = `') + 16, TX.indexOf('})()`;', TX.indexOf('const CONTAR = `')) + 4)
  .replace("document.querySelector('.pg.on')", "document.querySelector('#rutCuadre')").replace(/\\\\/g, '\\');
const medir = `({palabras:(${CONTAR}),renglones:document.querySelectorAll('#rutCuadre .rcu-r').length,
  aLaVista:Array.from(document.querySelectorAll('#rutCuadre .rcu-r')).filter(function(r){return r.getBoundingClientRect().height>0}).map(function(r){return r.innerText.replace(/\\s+/g,' ').slice(0,90)}),
  plegado:((document.querySelector('#rutCuadre .rcu-okl summary')||{}).innerText||''),
  alto:Math.round((document.querySelector('#rutCuadre .rcu')||{getBoundingClientRect:function(){return{height:0}}}).getBoundingClientRect().height),
  negativos:/(^|\\s)[−-]\\d/.test((document.querySelector('#rutCuadre')||{}).innerText||''),
  desborde:document.documentElement.scrollWidth-innerWidth,
  chicos:Array.from(document.querySelectorAll('#rutCuadre button,#rutCuadre .rcu-bol input')).filter(function(b){var r=b.getBoundingClientRect();return r.width&&r.height<(b.tagName==='INPUT'?22:40)}).length,
  botones:document.querySelectorAll('#rutCuadre button').length, filas:document.querySelectorAll('#rutCuadre .rcu-t tbody tr').length,
  estado:(document.querySelector('#rutCuadre .rcu-est')||{}).textContent||''})`;
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + PRE });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  if (ANCHO < 700) await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(14000);
  for (let i = 0; i < 6; i++) { await evaluar(cli, `try{go('ruta')}catch(e){}`); await T(i ? 2500 : 6000); if ((await evaluar(cli, `(document.querySelector('.pg.on')||{}).id||''`)) === 'p-ruta') break; }
  await T(9000);   // applyRoles vuelve a llamar a go (~22 s)
  await evaluar(cli, `try{switchTab('armado');rutCuadreRep('Santos Bullrich');rutCuadreDia('2026-11-14')}catch(e){window.__e=String(e)}`);
  let ok = '';
  for (let i = 0; i < 30 && !ok; i++) { await T(700); ok = await evaluar(cli, `(function(){var c=rutCuadreDatos().cu;return (c&&c.ok)?'ok':((c&&c.err)||'')})()`); }
  res.carga = ok;
  res.repartidor = await evaluar(cli, `rutCuadreDatos().cu.repartidor`);
  res.bolsas = await evaluar(cli, `(function(){var d=rutCuadreDatos();return Object.keys(d.bolsas||{}).length+' de '+((d.cu.cuenta&&d.cu.cuenta.libres)||[]).length})()`);
  res.antes = await evaluar(cli, medir);
  const tot0 = await evaluar(cli, `rutCuadreDatos().carga.reduce(function(a,l){return a+l.armado},0)`);
  await evaluar(cli, `window.scrollTo(0,0)`);
  await foto(cli, '1_salir', ANCHO < 700 ? 2200 : 1400);
  // destildar una bolsa con un toque de verdad: la carga baja
  const det = await evaluar(cli, `(function(){var d=document.querySelector('#rutCuadre details.rcu-bols');if(d)d.open=true;return !!d})()`);
  const t1 = await tocar(cli, `document.querySelector('#rutCuadre .rcu-bol.on input')`);
  await T(500);
  const tot1 = await evaluar(cli, `rutCuadreDatos().carga.reduce(function(a,l){return a+l.armado},0)`);
  res.toque_bolsa = { tapado: t1 && t1.tapa, carga_antes: tot0, carga_despues: tot1 };
  res.re_tildar = await evaluar(cli, `(function(){var i=document.querySelector('#rutCuadre .rcu-bol:not(.on) input');if(!i)return 'no había destildada';i.click();return 'ok'})()`);
  await T(400);
  // un + en «Llevo de más»
  const t2 = await tocar(cli, `document.querySelector('#rutCuadre .rcu-t button[aria-label="Uno más"]')`);
  await T(400);
  res.toque_mas = { tapado: t2 && t2.tapa, anexos: await evaluar(cli, `JSON.stringify(rutCuadreDatos().anexos)`) };
  // «Salgo con esto»: la guarda corta la escritura (no se escribe nada); se mide que mande las bolsas
  const t3 = await tocar(cli, `Array.from(document.querySelectorAll('#rutCuadre .rcu-acc button')).filter(function(b){return /Salgo/.test(b.textContent)})[0]`);
  await T(1500);
  res.salgo = { tapado: t3 && t3.tapa, mandado: await evaluar(cli, `(window.__bloqueados||[]).filter(function(s){return /reparto_cuadre_salir/.test(s)}).map(function(s){return s.slice(0,160)})`) };
  // AL VOLVER (simulado en el navegador: la guarda no deja escribir el «salió»)
  await evaluar(cli, `(function(){ var d=rutCuadreDatos(); d.cu.estado='salio'; d.cu.salio={bolsas:Object.keys(d.bolsas),anexos:d.anexos}; rutCuadrePintar(); })()`);
  res.volver = await evaluar(cli, medir);
  await evaluar(cli, `window.scrollTo(0,0)`);
  await foto(cli, '2_volver', ANCHO < 700 ? 1000 : 900);
  // un toque en el + del primero que sube: tiene que quedar arriba y marcar que no cuadra
  const t4 = await tocar(cli, `document.querySelector('#rutCuadre .rcu-r button[aria-label="Uno más"]')`);
  await T(400);
  res.toque_volvio = { tapado: t4 && t4.tapa, vuelta: await evaluar(cli, `JSON.stringify(rutCuadreDatos().vuelta)`) };
  // CERRADO con diferencia (simulado)
  await evaluar(cli, `(function(){ var C=rutCuadreDatos().cu; var L=(C.cuenta.lineas||[]).map(function(l){var x=JSON.parse(JSON.stringify(l));x.volvio=Math.max(0,x.debeVolver);x.diferencia=0;return x;});
    if(L[0]){L[0].volvio=Math.max(0,L[0].debeVolver)-1;L[0].diferencia=-1;}
    C.estado='cerrado'; C.cerrado={lineas:L,diferencia:1,revisado:false,por:'santos'}; rutCuadrePintar(); })()`);
  res.cerrado = await evaluar(cli, medir);
  await evaluar(cli, `window.scrollTo(0,0)`);
  await foto(cli, '3_cerrado', ANCHO < 700 ? 1300 : 1000);
  res.errores = await evaluar(cli, `window.__e||''`);
  console.log(JSON.stringify(res, null, 1));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
