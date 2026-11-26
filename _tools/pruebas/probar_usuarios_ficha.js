/* AJUSTES › USUARIOS COMO LISTA CON FICHA (18/11/2026, 780). Sesión real, de solo lectura: toda escritura se corta.
     SBSES=<sbses.json> node _tools/pruebas/probar_usuarios_ficha.js <token> [390|1440] [puerto] [--foto carpeta]
   Sostiene:
   · la lista: un renglón por persona (equipo + representantes, sin el robot), nada cortado, sin scroll horizontal;
   · la ficha: Guardar apagado hasta que algo cambie, y otra vez apagado si se vuelve a lo de antes;
   · Guardar manda el Nombre (la clave con Equipo) y las Notas TAL COMO ESTABAN, y no manda teléfono ni beneficio;
   · el usuario se normaliza (minúscula) y uno inválido no deja guardar;
   · el rol cambia «Qué ve» en el momento;
   · «Borrar acceso» pide confirmación y, si se cancela, no manda nada;
   · en el celular, ningún control de la ficha mide menos de 44 px de alto (las pastillas, 40);
   · con la 780 aplicada (`usuarios_personas_pantalla`), el nombre que se ve es el de Equipo («Alfonso Amadeo»).
   Salida 1 si algo falla. */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const a = process.argv.slice(2), TOKEN = a[0], ANCHO = Number(a[1] || 390), PUERTO = Number(a[2] || 8080);
const FOTO = a.includes('--foto') ? a[a.indexOf('--foto') + 1] : '';
if (!TOKEN) { console.error('uso: probar_usuarios_ficha.js <token> [390|1440] [puerto]'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, 'tadeo');
const SIN_APPS = process.env.SBSES ? ";try{localStorage.removeItem('maleu_apps_prueba')}catch(e){}" : '';
const CAJON = ANCHO >= 769 ? ";try{localStorage.setItem('maleu_sb_open','1')}catch(e){}" : '';
/* Encima de la guarda: lo que va a una directa de Usuarios se anota entero y contesta ok (para seguir el flujo). */
const ESPIA = `;(function(){var f=window.fetch;window.__directas=[];window.fetch=function(u,x){var s=String(u&&u.url||u),m=String((x&&x.method)||'GET').toUpperCase();
  var r=s.match(/\\/rpc\\/(usuario_set_directo|usuario_delete_directo|usuario_deposito_directo|equipo_dato_directo|config_maleu_set_directo)/);
  if(m==='POST'&&r){var b={};try{b=JSON.parse(x.body||'{}')}catch(e){}window.__directas.push({rpc:r[1],p:b.p||b});
    return Promise.resolve(new Response(JSON.stringify({ok:true,directo:true,deposito:(b.p||{}).deposito||''}),{status:200,headers:{'Content-Type':'application/json'}}));}
  return f.apply(this,arguments);};})();`;
const mal = [], ok = [];
const chk = (c, m) => (c ? ok : mal).push(m);
(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + SIN_APPS + CAJON + ESPIA });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: `http://localhost:${PUERTO}/app.html` });
  await T(12000);
  const E = (js) => evaluar(cli, js);
  for (let i = 0; i < 6; i++) { await E(`try{go('ajustes')}catch(e){}`); await T(i ? 3000 : 6000); if (await E(`(document.querySelector('.pg.on')||{}).id`) === 'p-ajustes') break; }
  await E(`ajGo('usuarios')`);
  /* Esperar la lista Y la respuesta de usuarios_personas_pantalla (con o sin la 780). */
  for (let i = 0; i < 80; i++) { await T(500); if (await E(`!!(document.querySelectorAll('#ajBody .aju-r').length&&typeof _AJ_UPER!=='undefined'&&_AJ_UPER)`)) break; }
  await T(800);
  const con780 = await E(`!!(_AJ_UPER&&_AJ_UPER.gente&&Object.keys(_AJ_UPER.gente).length)`);
  const L = await E(`(function(){var rs=[].slice.call(document.querySelectorAll('#ajBody .aju-r'));
    var cort=[].slice.call(document.querySelectorAll('#ajBody .aju-n,#ajBody .aju-m')).filter(function(e){return e.scrollWidth>e.clientWidth+1;}).map(function(e){return e.textContent;});
    return {n:rs.length,noms:rs.map(function(r){return r.querySelector('.aju-n').textContent}),cort:cort,
      hs:document.documentElement.scrollWidth>window.innerWidth+1,ancho:(document.querySelector('#ajBody .aju')||{}).offsetWidth,
      altos:rs.map(function(r){return r.offsetHeight}).filter(function(h){return h<44})}})()`);
  chk(L.n >= 10, `lista: ${L.n} renglones (equipo + representantes)`);
  chk(!L.noms.some((n) => /robot|prueba/i.test(n)), 'lista: sin el robot de pruebas');
  chk(!L.cort.length, `lista: nada cortado${L.cort.length ? ' — ' + L.cort.join(' | ') : ''}`);
  chk(!L.hs, 'lista: sin scroll horizontal');
  chk(ANCHO < 760 || L.ancho <= 722, `lista: columna de ${L.ancho} px (≤ 720 en la compu)`);
  chk(!L.altos.length, 'lista: renglones de 44 px o más');
  if (con780) chk(L.noms.includes('Alfonso Amadeo'), 'con la 780: «Alfonso Amadeo» (el nombre de Equipo)');
  else chk(L.noms.includes('Alfonso'), 'sin la 780: el nombre de la hoja («Alfonso»), sin romperse');
  if (FOTO) { const r = await cli.enviar('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(FOTO, `usuarios_lista_${ANCHO}.png`), Buffer.from(r.data, 'base64')); }

  /* La ficha de Santos. Antes, que la sesión sepa que es el dueño (llega con permiso_base, después del arranque). */
  for (let i = 0; i < 60 && !(await E(`_esDueno()`)); i++) await T(500);
  await E(`ajUAbrir('santos')`); await T(1200);
  const F = await E(`(function(){var b=document.getElementById('ajUFok'),e=document.getElementById('ajUFest');
    var ctl=[].slice.call(document.querySelectorAll('#ajUF input,#ajUF select,#ajUF button')).filter(function(x){return x.offsetParent&&!x.closest('.k-menu');});
    var bajos=ctl.filter(function(x){var h=x.getBoundingClientRect().height, min=x.classList.contains('aj-pill')?40:(x.type==='checkbox'?0:44);
      if(x.type==='checkbox'){var l=x.closest('label');h=l?l.getBoundingClientRect().height:h;min=44;}return h<min-0.5;}).map(function(x){return (x.textContent||x.id||x.type).trim().slice(0,20)});
    var cort=[].slice.call(document.querySelectorAll('#ajUF .aju-fn,#ajUF .aju-fs,#ajUF .aju-ve,#ajUF label')).filter(function(e){return e.scrollWidth>e.clientWidth+1;}).map(function(e){return e.textContent.slice(0,30)});
    return {nom:(document.querySelector('#ajUF .aju-fn')||{}).textContent,dis:b&&b.disabled,est:e&&e.textContent,bajos:bajos,cort:cort,
      ve:(document.querySelector('#ajUF .aju-s .aju-ve')||{}).textContent,arma:document.querySelectorAll('#ajUF .aju-seg .aj-pill').length,
      pin:!!document.querySelector('#ajUF .aj-pin-acc'),dueno:_esDueno(),pinTxt:((document.querySelector('#ajUF .aju-pin')||{}).textContent||'').slice(0,60),hs:document.documentElement.scrollWidth>window.innerWidth+1}})()`);
  chk(F.nom === 'Santos Bullrich', `ficha: «${F.nom}»`);
  chk(F.dis === true && F.est === 'Sin cambios', `ficha: Guardar apagado y «${F.est}» al abrir`);
  chk(F.arma >= 2, `ficha: Arma desde con ${F.arma} opciones (Santos es «equipo»)`);
  chk(F.pin, 'ficha: el PIN con su «…» (dueño '+F.dueno+', «'+F.pinTxt+'»)');
  chk(!F.cort.length, `ficha: nada cortado${F.cort.length ? ' — ' + F.cort.join(' | ') : ''}`);
  chk(!F.hs, 'ficha: sin scroll horizontal');
  chk(ANCHO >= 760 || !F.bajos.length, `ficha (celular): controles de 44 px${F.bajos.length ? ' — bajos: ' + F.bajos.join(', ') : ''}`);
  if (FOTO) { const r = await cli.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(FOTO, `usuarios_ficha_${ANCHO}.png`), Buffer.from(r.data, 'base64')); }

  /* El rol: «Qué ve» cambia, Guardar se prende; volver al de antes lo apaga. */
  const R = await E(`(function(){var s=document.getElementById('ajUFrol'),antes=s.value,ve0=document.querySelector('#ajUF .aju-s .aju-ve').textContent;
    s.value='repartidor';s.dispatchEvent(new Event('change',{bubbles:true}));
    var ve1=document.querySelector('#ajUF .aju-s .aju-ve').textContent,on=!document.getElementById('ajUFok').disabled;
    var s2=document.getElementById('ajUFrol');s2.value=antes;s2.dispatchEvent(new Event('change',{bubbles:true}));
    return {cambia:ve0!==ve1,on:on,off:document.getElementById('ajUFok').disabled,antes:antes}})()`);
  chk(R.cambia, 'rol: «Qué ve» cambia en el momento');
  chk(R.on && R.off, 'rol: Guardar se prende con el cambio y se apaga al volver');

  /* El usuario: inválido no deja; mayúscula se baja. */
  const U = await E(`(function(){var i=document.getElementById('ajUFusr');i.value='san tos';i.dispatchEvent(new Event('input',{bubbles:true}));
    var r={dis:document.getElementById('ajUFok').disabled,est:document.getElementById('ajUFest').textContent};
    i.value='Santos';i.dispatchEvent(new Event('input',{bubbles:true}));r.norm=AJ_UF.val.usuario;r.dis2=document.getElementById('ajUFok').disabled;return r})()`);
  chk(U.dis && /min/.test(U.est), `usuario inválido: no deja guardar («${U.est}»)`);
  chk(U.norm === 'santos' && U.dis2, 'usuario en mayúscula: se baja y queda «Sin cambios»');

  /* Guardar un cambio de rol: qué viaja. */
  const G0 = await E(`(function(){var u=AJ_UF.u;return {nombre:u.nombre,notas:u.notas,rol:u.rol}})()`);
  await E(`(function(){var s=document.getElementById('ajUFrol');s.value='repartidor';s.dispatchEvent(new Event('change',{bubbles:true}));ajUGuardar();})()`);
  await T(2500);
  const G = await E(`window.__directas.filter(function(d){return d.rpc==='usuario_set_directo'})`);
  const p = (G[0] || {}).p || {};
  chk(G.length === 1, `guardar: una sola llamada a usuario_set_directo (${G.length})`);
  chk(p.rol === 'repartidor' && p.usuario === 'santos' && p.origUsuario === 'santos', 'guardar: manda usuario, origUsuario y el rol nuevo');
  chk(p.nombre === G0.nombre && (p.notas || '') === (G0.notas || ''), `guardar: Nombre «${p.nombre}» y Notas como estaban`);
  chk(!('telefono' in p) && !('beneficio' in p) && !('pin' in p), 'guardar: no manda teléfono, beneficio ni PIN');

  /* Borrar acceso, cancelado: no manda nada. */
  for (let i = 0; i < 40; i++) { await T(500); if (await E(`!!(AJ_DATA&&document.getElementById('ajUF'))`)) break; }
  await E(`window.__directas=[];window.confirm=function(){return false};ajUBorrar()`); await T(800);
  const B = await E(`window.__directas.length`);
  chk(B === 0, 'borrar cancelado: no manda nada');

  /* Volver a la lista */
  await E(`window.confirm=function(){return true};ajUCerrar()`); await T(600);
  chk(await E(`!document.getElementById('ajUF')&&document.querySelectorAll('#ajBody .aju-r').length>0`), '‹ Usuarios vuelve a la lista');
  const errs = await E(`(window.__err||[]).filter(function(e){return !/cortado por la prueba/.test(e)}).slice(0,5)`).catch(() => []);
  chk(!errs || !errs.length, `sin errores de JS${errs && errs.length ? ' — ' + errs.join(' | ') : ''}`);

  console.log(`\nAjustes › Usuarios a ${ANCHO} px (${con780 ? 'con' : 'sin'} la 780): ${ok.length} bien, ${mal.length} mal`);
  ok.forEach((m) => console.log('  ok  ' + m)); mal.forEach((m) => console.log('  MAL ' + m));
  process.exit(mal.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
