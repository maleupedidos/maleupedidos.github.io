/* (874, 26/11/2026) CAJA › EFECTIVO CON LOS LUGARES NUEVOS, en un Chrome de verdad, con la sesión real de la base en
   SOLO LECTURA (sbses_guarda: toda escritura sale cortada y se anota).
     node _tools/pruebas/probar_caja_lugares_874.js <ancho> <puerto> [carpeta-capturas]
     con SBSES=<sesion_prueba.json> y PREP_SESION='{usuario:"luqui",rol:"admin",nombre:"Lucas Moresco",ts:Date.now()}'
   Sostiene: la tarjeta dice Caja fuerte · Casa de Lucas · (En camino) · billeteras · sin guardar, cada lugar con cuándo
   se contó; el botón dice «Sacar para pagar»; un En camino (puesto en la pantalla, no en la base) se ve con quién → proveedor
   (OC) y desde hace cuánto, con «Volvió»; el formulario de Sacar para pagar pide de dónde, quién lo lleva y el proveedor;
   «Volvió» trae todo lo que queda y el origen. Clics de mouse de verdad. Sale con 1 si algo no da. */
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const fs = require('fs'), path = require('path');
const ANCHO = Number(process.argv[2]) || 390, PUERTO = Number(process.argv[3]) || 8163, FOTOS = process.argv[4] || '';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let mal = 0;
const ok = (c, t) => { console.log((c ? '  ok  ' : '  MAL ') + t); if (!c) mal++; };

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    const prep = require('./sesion_prep.js')('x', sbses(process.env.SBSES, ''));
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep });
    await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
    let L = null;
    for (let i = 0; i < 90 && !L; i++) {
      await espera(1000);
      L = await evaluar(cli, 'typeof D!=="undefined"&&D&&D.lugares&&D.lugares.activo?{g:D.lugares.g,guardados:D.lugares.guardados,cf:D.lugares.cf,cfContado:D.lugares.cfContado,caminos:D.lugares.caminos}:null').catch(() => null);
      if (!L && i === 5) await evaluar(cli, 'try{go("caja")}catch(e){}').catch(() => {});
    }
    ok(!!L, 'la caja armó los lugares' + (L ? ' (cf $' + L.cf + ')' : ''));
    if (!L) throw new Error('sin lugares');
    ok(Array.isArray(L.guardados) && L.guardados.some((x) => x.nombre === 'Casa de Lucas'), 'llegó Casa de Lucas del motor: ' + JSON.stringify(L.guardados));
    await evaluar(cli, 'go("caja")');
    await espera(1500);
    /* Las cuentas arrancan plegadas en el celular: se abren como con el toque en «Cuentas». */
    await evaluar(cli, 'window._cjSalAbierto=true;rCaja()');
    await espera(500);
    const tarjeta = () => evaluar(cli, '(function(){var b=document.querySelector("#cBal .cj-ef");return b?b.innerText:""})()');
    let t = await tarjeta();
    for (let i = 0; i < 20 && !/Caja fuerte/.test(t); i++) { await espera(500); t = await tarjeta(); }
    const lineas = t.split('\n').map((s) => s.trim()).filter(Boolean);
    console.log('  tarjeta: ' + lineas.slice(0, 14).join(' | '));
    ok(/Caja fuerte/.test(t) && /Casa de Lucas/.test(t), 'la tarjeta dice Caja fuerte y Casa de Lucas');
    const iCf = lineas.findIndex((x) => /^Caja fuerte/.test(x)), iCl = lineas.findIndex((x) => /^Casa de Lucas/.test(x)), iBil = lineas.findIndex((x) => /^Lo m/i.test(x));
    ok(iCf >= 0 && iCf < iCl && iCl < iBil, 'el orden: caja fuerte, Casa de Lucas, lo de cada uno (' + [iCf, iCl, iBil] + ')');
    ok(/contado el|sin contar todavía/.test(t), 'cada lugar dice cuándo se contó');
    ok(/Sacar para pagar/.test(t) && !/camino:/.test(t), 'el botón dice «Sacar para pagar» y no hay nada técnico');
    /* Un En camino puesto en la pantalla (la base no tiene ninguno): cómo se ve y qué hace «Volvió». */
    await evaluar(cli, '(function(){window._cjSalAbierto=true;var L=D.lugares;L.caminos=[{id:"C-0e0e0e0e",lleva:"Lucas Moresco",desde:"cf",prov:"Carmín y Fuegos",oc:"CC-0018",monto:1756200,saldo:1756200,abierto:Date.now()-3*3600e3}];L.camino={"C-0e0e0e0e":1756200};rCaja();})()');
    await espera(400);
    t = await tarjeta();
    ok(/En camino · Lucas → Carmín y Fuegos \(CC-0018\)/.test(t), 'En camino dice quién → proveedor (OC)');
    ok(/salió hace 3 h de Caja fuerte/.test(t), 'y desde hace cuánto: ' + ((/salió[^\n]*/.exec(t) || [''])[0]));
    if (FOTOS) { fs.mkdirSync(FOTOS, { recursive: true }); await foto(cli, path.join(FOTOS, 'caja_' + ANCHO + '.png')); }
    /* Clic de mouse de verdad en un elemento (por su texto). */
    async function clic(sel, txt) {
      const r = await evaluar(cli, '(function(){var e=[].filter.call(document.querySelectorAll(' + JSON.stringify(sel) + '),function(x){return x.offsetParent&&(x.innerText||"").trim().indexOf(' + JSON.stringify(txt) + ')===0;})[0];if(!e)return null;e.scrollIntoView({block:"center"});var b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()');
      if (!r) return false;
      await espera(200);
      const r2 = await evaluar(cli, '(function(){var e=[].filter.call(document.querySelectorAll(' + JSON.stringify(sel) + '),function(x){return x.offsetParent&&(x.innerText||"").trim().indexOf(' + JSON.stringify(txt) + ')===0;})[0];var b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()');
      for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: r2.x, y: r2.y, button: 'left', clickCount: 1 });
      await espera(500);
      return true;
    }
    ok(await clic('#cBal .cj-sacar', 'Sacar para pagar'), 'toqué «Sacar para pagar»');
    const form = () => evaluar(cli, '({t:$("lugMvTitulo").textContent,vis:!$("lugMoverForm").classList.contains("hidden"),prov:!$("lugMvProvFg").classList.contains("hidden"),pagar:!$("lugMvPagarFg").classList.contains("hidden"),lleva:[].map.call(document.querySelectorAll("#lugMvLleva .lug-chip.on"),function(b){return b.innerText}),hacia:[].map.call(document.querySelectorAll("#lugMvHacia .lug-chip.on"),function(b){return b.innerText}),desde:[].map.call(document.querySelectorAll("#lugMvDesde .lug-chip.on"),function(b){return b.innerText}),btn:$("lugMvBtn").textContent,monto:$("lugMvMonto").value,ops:[].map.call(document.querySelectorAll("#lugMvDesde .lug-chip"),function(b){return b.innerText.split("\\n")[0]})})');
    let F = await form();
    console.log('  formulario: ' + JSON.stringify(F));
    ok(F.vis && F.t === 'Sacar para pagar' && F.prov && F.pagar, 'el formulario: título, proveedor, quién lo lleva y OC');
    ok(F.lleva.length === 1 && F.hacia.join() === 'Sacar para pagar', 'lo lleva quien está logueado (' + F.lleva + ') y el destino es «Sacar para pagar»');
    ok(F.btn === '¿De dónde sale?', 'pide de dónde sale: «' + F.btn + '»');
    ok(F.ops.indexOf('Caja fuerte') >= 0 && !F.ops.some((x) => /^En camino/.test(x)), 'de dónde: la caja fuerte sí, otro En camino no: ' + F.ops.join(' · '));
    await clic('#lugMvDesde .lug-chip', 'Caja fuerte');
    await evaluar(cli, '$("lugMvProv").value="Carmín y Fuegos";$("lugMvMonto").value="1756200";_lugChk()');
    F = await form();
    ok(/^Sacar \$1\.756\.200$/.test(F.btn), 'con todo, el botón dice «' + F.btn + '»');
    if (FOTOS) await foto(cli, path.join(FOTOS, 'sacar_' + ANCHO + '.png'));
    await evaluar(cli, 'cerrarMoverLug()');
    ok(await clic('#cBal .cj-volvio', 'Volvió sin pagar'), 'toqué «Volvió»');
    F = await form();
    console.log('  volvió: ' + JSON.stringify({ t: F.t, desde: F.desde, hacia: F.hacia, monto: F.monto, btn: F.btn }));
    ok(F.t === 'Volvió sin pagar' && /^En camino/.test(F.desde.join()) && /^Caja fuerte/.test(F.hacia.join()) && F.monto === '1756200', 'Volvió: sale todo lo que queda y vuelve a la caja fuerte');
    ok(/^Volvió \$1\.756\.200$/.test(F.btn), 'el botón dice «' + F.btn + '»');
    /* El ancho: nada se sale de la pantalla. */
    const ancho = await evaluar(cli, 'document.documentElement.scrollWidth');
    ok(ancho <= ANCHO + 1, 'sin scroll horizontal (' + ancho + ' px)');
    const err = await evaluar(cli, '(window.__err||[]).filter(function(e){return !/favicon|ResizeObserver/.test(e)})');
    ok(!err.length, 'sin errores de JS ' + (err.length ? JSON.stringify(err.slice(0, 3)) : ''));
    const blo = await evaluar(cli, 'window.__bloqueados||[]');
    console.log('  escrituras cortadas por la guarda: ' + blo.length);
  } catch (e) { console.log('  MAL ' + e.message); mal++; }
  finally { cli.matar(); }
  console.log(mal ? (mal + ' MAL') : 'OK');
  process.exit(mal ? 1 : 0);
})();
async function foto(cli, archivo) {
  const r = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(archivo, Buffer.from(r.data, 'base64'));
}
