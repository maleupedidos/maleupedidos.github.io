// probar_caja_contado.js (21/10/2026) — la Caja con los datos REALES de cajaLight del 21/10 (backend simulado, POST interceptados).
// Uso: node probar_caja_contado.js <puerto> <caja.json> [ancho]   (caja.json = respuesta de ?action=cajaLight, al scratchpad: tiene nombres)
// Contado de verdad por cuenta, lo copiado del ERP no cuenta, rendimientos en dos toques, categorias nuevas. APP=<otro.html> para la direccion contraria.
const fs = require('fs');
const { abrir, evaluar } = require('./cdp.js');
const PUERTO = process.argv[2], CAJA = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), ANCHO = Number(process.argv[4] || 390);
// Como lo va a mandar el backend nuevo antes del primer conteo con la lista: nada contado.
CAJA.saldoBase.contado = {}; CAJA.saldoBase.contadoDesde = '';
const STUB = `
  window.__maleuAuth = true; window.__posts = []; window.__confirms = [];
  window.confirm = function (m) { window.__confirms.push(m); return true; };
  var _f = window.fetch;
  window.fetch = function (url, o) {
    url = String(url);
    if (url.indexOf('script.google.com') < 0) return _f.apply(this, arguments);
    if (o && o.method === 'POST') {
      var b = JSON.parse(o.body); window.__posts.push(b);
      var r = { ok: true };
      if (b.action === 'ajusteSaldo') r = { ok: true, ef: b.efectivo, mp: b.mp, bil: b.billetera, sob: b.sobres, inv: b.inversiones,
        porCuenta: { efectivo: b.efectivo, mp: b.mp, brubank: b.cta_brubank } };
      return Promise.resolve(new Response(JSON.stringify(r)));
    }
    return new Promise(function () {});
  };`;
const _hoy = new Date(), HOY = String(_hoy.getDate()).padStart(2, '0') + '/' + String(_hoy.getMonth() + 1).padStart(2, '0');
const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][_hoy.getMonth()];
let ok = 0, mal = 0;
const t = (n, c, extra) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); } };
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 1000, deviceScaleFactor: 1, mobile: ANCHO < 600 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
    await cli.enviar('Page.navigate', { url: 'http://127.0.0.1:' + PUERTO + '/' + (process.env.APP || 'app.html') + '?prueba=1' });
    for (let i = 0; i < 80 && !(await evaluar(cli, 'typeof _cajaAplicar==="function"&&document.readyState==="complete"')); i++) await espera(250);
    await evaluar(cli, `D = D || {}; _cajaAplicar(${JSON.stringify(CAJA)}); go('caja'); rCaja(); true`);
    await espera(500);
    const ver = () => evaluar(cli, `(function(){var c=document.querySelector('#cBal .cj-cnt');var b=document.querySelector('#cBal .cj-rend');
      return {cnt:c?c.textContent:'', rend:b?b.textContent:'', vis:!!(b&&b.offsetParent)};})()`);

    console.log('\n== Caja, antes del primer conteo con la lista ==');
    let v = await ver();
    t('dice que el ERP lo anota desde hoy y que antes no se sabe', /sin registro/.test(v.cnt) && /desde el 21\/10\/2026/.test(v.cnt), v.cnt);
    t('el botón de rendimientos dice el último cargado: 21/07', /Cargar rendimientos MP/.test(v.rend) && /21\/07/.test(v.rend) && v.vis, v);

    console.log('\n== Contar: solo Mercado Pago, el Brubank con «tocá para usar» ==');
    await evaluar(cli, `cjAccion('contar'); true`);
    const hints = await evaluar(cli, `(function(){return {mp:($('ajMpHint')||{}).textContent, ef:($('ajCFHint')||{}).textContent, br:($('ajCtaHint_brubank')||{}).textContent};})()`);
    t('cada campo dice si su cuenta se contó de verdad', /Sin conteo registrado/.test(hints.mp) && /Sin conteo registrado/.test(hints.ef) && /Sin conteo registrado/.test(hints.br || ''), hints);
    await evaluar(cli, `$('ajMP').focus(); true`);
    await cli.enviar('Input.insertText', { text: '6364711,39' });
    await evaluar(cli, `$('ajCtaHint_brubank').click(); true`);
    const calc = await evaluar(cli, `Math.round((_calcSaldo().porCuenta||{}).brubank||0)`);
    await evaluar(cli, `guardarAjuste(); true`);
    await espera(800);
    const post = await evaluar(cli, `(window.__posts.filter(function(p){return p.action==='ajusteSaldo';})[0])||null`);
    t('el POST lleva contadas = [mp] (el Brubank copiado del ERP no cuenta)', !!post && JSON.stringify(post.contadas) === '["mp"]', post && post.contadas);
    t('MP va con lo tipeado: $6.364.711,39', !!post && Math.abs(post.mp - 6364711.39) < 0.01, post && post.mp);
    t('el Brubank va con el número del ERP', !!post && post.cta_brubank === calc, post && [post.cta_brubank, calc]);
    v = await ver();
    t('después de guardar: MP contado hoy, efectivo y Brubank sin registro', new RegExp('MP\\s+' + HOY.replace('/', '\\/')).test(v.cnt.replace(/\u00a0/g, ' ')) && (v.cnt.match(/sin registro/g) || []).length === 2, v.cnt);

    console.log('\n== Copiar el efectivo del ERP (caja fuerte y billetera) no es contarlo ==');
    await evaluar(cli, `window.__posts=[]; if($('ajusteForm').classList.contains('hidden'))cjAccion('contar'); true`);
    const hayLug = await evaluar(cli, `!!$('ajLbH0')`);
    await evaluar(cli, `$('ajCFHint').click(); if($('ajLbH0'))$('ajLbH0').click(); $('ajMP').focus(); true`);
    await cli.enviar('Input.insertText', { text: '6364711,39' });
    await evaluar(cli, `guardarAjuste(); true`); await espera(600);
    const p3 = await evaluar(cli, `(window.__posts.filter(function(p){return p.action==='ajusteSaldo';})[0])||null`);
    t('caja fuerte' + (hayLug ? ' y billetera' : '') + ' copiadas: contadas = [mp], sin efectivo', !!p3 && JSON.stringify(p3.contadas) === '["mp"]', p3 && p3.contadas);
    const h2 = await evaluar(cli, `(function(){if($('ajusteForm').classList.contains('hidden'))cjAccion('contar');return ($('ajCFHint')||{}).textContent;})()`);
    t('con las billeteras prendidas, la caja fuerte también dice su conteo', /Sin conteo registrado|Contado de verdad/.test(h2), h2);
    if (await evaluar(cli, `!$('ajusteForm').classList.contains('hidden')`)) await evaluar(cli, `cjAccion('contar'); true`);

    console.log('\n== Tipear sobre lo copiado sí cuenta ==');
    await evaluar(cli, `window.__posts=[]; cjAccion('contar'); if($('ajusteForm').classList.contains('hidden'))cjAccion('contar'); true`);
    await evaluar(cli, `$('ajCtaHint_brubank').click(); $('ajCta_brubank').focus(); true`);
    await cli.enviar('Input.insertText', { text: '5' });
    await evaluar(cli, `guardarAjuste(); true`); await espera(600);
    const p2 = await evaluar(cli, `(window.__posts.filter(function(p){return p.action==='ajusteSaldo';})[0])||null`);
    t('copiado + tecleado = contado (contadas = [brubank])', !!p2 && JSON.stringify(p2.contadas) === '["brubank"]', p2 && p2.contadas);

    console.log('\n== Rendimientos en dos toques ==');
    await evaluar(cli, `cjRendimientos(); true`); await espera(300);
    const rf = await evaluar(cli, `({abierto:!$('formIngreso').classList.contains('hidden'), cat:$('iCat').value, con:$('iCon').value, foco:document.activeElement&&document.activeElement.id})`);
    t('abre el Ingreso con Rendimientos, «Rendimientos MP Octubre» y el cursor en el monto de MP', rf.abierto && rf.cat === 'Rendimientos' && rf.con === 'Rendimientos MP ' + MES && rf.foco === 'iMP', rf);
    await evaluar(cli, `cjRendimientos(); true`);
    const rf2 = await evaluar(cli, `!$('formIngreso').classList.contains('hidden')`);
    t('tocarlo dos veces no lo cierra', rf2 === true);

    console.log('\n== Las categorías nuevas ==');
    const cats = await evaluar(cli, `[].map.call($('gCat').options,function(o){return o.value;})`);
    t('Egreso tiene «Tarjeta de crédito» y «Retiro de rendimientos»', cats.indexOf('Tarjeta de crédito') >= 0 && cats.indexOf('Retiro de rendimientos') >= 0, cats);
    const av = await evaluar(cli, `(function(){var s=$('gCat');s.value='Retiro de rendimientos';s.dispatchEvent(new Event('change'));var a=$('gCatAviso');var r1={h:a.hidden,t:a.textContent};
      s.value='Tarjeta de crédito';s.dispatchEvent(new Event('change'));var r2={h:a.hidden,t:a.textContent};s.value='Nafta';s.dispatchEvent(new Event('change'));return [r1,r2,a.hidden];})()`);
    t('el retiro avisa que no es sueldo ni gasto', av[0].h === false && /No es sueldo ni gasto/.test(av[0].t), av[0]);
    t('la tarjeta pide el detalle en el concepto', av[1].h === false && /qué pagó la tarjeta/.test(av[1].t), av[1]);
    t('y con otra categoría el aviso se va', av[2] === true);
    const errs = await evaluar(cli, `(window.__errores||window.__err||[]).length||0`);
    const anchoOk = await evaluar(cli, 'document.documentElement.scrollWidth <= window.innerWidth');
    t('sin scroll horizontal a ' + ANCHO + 'px', anchoOk);
    await evaluar(cli, `cjAccion('ingreso'); if(!$('formIngreso').classList.contains('hidden'))cjAccion('ingreso'); go('caja'); rCaja(); window.scrollTo(0,0); true`);
    await espera(400);
    const shot = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(require('os').tmpdir() + '/caja_' + ANCHO + '.png', Buffer.from(shot.data, 'base64'));
  } finally { cli.matar(); }
  console.log('\n' + ok + ' ok, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})().catch(e => { console.log('REVENTO', e.message); process.exit(2); });
