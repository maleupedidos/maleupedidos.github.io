/* Version nueva sin recarga sola + borradores (3/11/2026). Tadeo perdio un alta de representante en Ajustes porque
   la v859 recargo la app sola. Sostiene:
     · con una version nueva NO se recarga (ni a los 12 s quieto): aparece el cartel «Hay una version nueva · Actualizar»;
     · tocar Actualizar con algo tipeado pregunta «Tenes cambios sin guardar» y, si decis que no, no recarga;
     · lo tipeado en un [data-borrador] queda en el celular (el PIN NO) y vuelve despues de recargar;
     · el alta de representante de Ajustes esta adentro de un borrador.
   Reemplaza a la del 13/9/2026 (v324, «se aplica sola»), que probaba justo lo que Tadeo pidio sacar: esta en git, 737abba.
   Uso (con el servidor local corriendo):  node _tools/pruebas/probar_version_nueva.js [puerto=8080] [ancho=390] */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const PUERTO = process.argv[2] || '8080', ANCHO = parseInt(process.argv[3], 10) || 390;
const pausa = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + '  -> ' + JSON.stringify(d)); } };
const FORM = `document.body.insertAdjacentHTML('beforeend','<div id="tForm" data-borrador="prueba" style="position:fixed;top:120px;left:10px;z-index:9999;background:#fff"><input data-k="nombre" id="tNom"><input data-k="pin" id="tPin"><button>Guardar</button></div>');1`;
(async () => {
  const cli = await abrir();
  const ev = (e) => evaluar(cli, e);
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 1, mobile: ANCHO < 500 });
  const cargar = async () => {
    for (let i = 0; i < 120; i++) { await pausa(500); try { if (await ev(`typeof _verCartel==='function'&&document.readyState==='complete'`)) return true; } catch (e) {} }
    return false;
  };
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html?prueba=1' });
  chk('el ERP abre', await cargar());
  await ev(`localStorage.removeItem('mc_borr');1`);
  await ev(FORM);
  await ev(`document.getElementById('tNom').focus();1`);
  await cli.enviar('Input.insertText', { text: 'Ana Gómez' });
  await ev(`document.getElementById('tPin').focus();1`);
  await cli.enviar('Input.insertText', { text: '123456' });
  await ev(`document.activeElement.blur();window.__marca=1;window.__conf=[];var _f=window.fetch;window.fetch=function(u,o){if(String(u).indexOf('/app.html?fresco=')>=0)return Promise.resolve(new Response("<script>var _APP_CN_PAGINA='maleu-panel-v999999';</script>",{status:200}));return _f.apply(this,arguments);};window.confirm=function(m){__conf.push(m);return false;};1`);
  await pausa(400);
  const bor = await ev(`localStorage.getItem('mc_borr')||''`);
  chk('el borrador guarda lo tipeado', bor.indexOf('Ana Gómez') >= 0, bor);
  chk('  y el PIN NO', bor.indexOf('123456') < 0, bor);
  chk('hay cambios sin guardar (sin foco)', await ev(`_hayCambiosSinGuardar()`));
  await ev(`try{D.pedidos=[{n:1}];}catch(e){};_aplicarVersionNueva([{k:'panel',v:'maleu-panel-v999999'}]);1`);
  await pausa(12000);
  chk('a los 12 s quieto NO se recargo', await ev(`window.__marca===1`));
  chk('  y el texto sigue', await ev(`document.getElementById('tNom').value`) === 'Ana Gómez');
  const r = await ev(`(function(){var b=document.getElementById('versionNueva');if(!b)return null;var q=b.getBoundingClientRect();return {t:b.innerText.replace(/\\s+/g,' '),top:q.top,bot:q.bottom,l:q.left,r:q.right,h:innerHeight,w:innerWidth};})()`);
  chk('aparece el cartel «Hay una versión nueva · Actualizar»', r && /Hay una versión nueva/.test(r.t) && /Actualizar/.test(r.t), r);
  chk('  adentro de la pantalla y arriba de la barra de estado', r && r.l >= 0 && r.r <= r.w && r.bot <= r.h - 22, r);
  await ev(`document.getElementById('versionNueva').click();1`);
  await pausa(800);
  const conf = await ev(`JSON.stringify(window.__conf)`);
  chk('tocar Actualizar con cambios pregunta «Tenés cambios sin guardar»', /Tenés cambios sin guardar/.test(conf), conf);
  chk('  y si decís que no, no recarga', await ev(`window.__marca===1`));
  /* Sin cambios: no pregunta; la version falsa no esta publicada, asi que tampoco recarga y el cartel queda. */
  await ev(`document.getElementById('tNom').value='';document.getElementById('tNom').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('tPin').value='';window.__conf=[];1`);
  chk('sin cambios no hay nada sin guardar', !(await ev(`_hayCambiosSinGuardar()`)));
  await ev(`document.getElementById('versionNueva').click();1`);
  await pausa(4000);
  chk('  tocar Actualizar no pregunta y recién ahí recarga (el HTML nuevo ya está)', await ev(`window.__marca===undefined`) && (await ev(`JSON.stringify(window.__conf||[])`)) === '[]');
  await cargar();
  await ev(FORM);
  /* El borrador vuelve despues de recargar. */
  await ev(`document.getElementById('tNom').value='Ana Gómez';document.getElementById('tNom').dispatchEvent(new Event('input',{bubbles:true}));1`);
  await pausa(500);
  await cli.enviar('Page.reload', { ignoreCache: true });
  await pausa(1500);
  chk('recarga', await cargar());
  await ev(FORM);
  await pausa(400);
  chk('al volver a aparecer el formulario, lo tipeado vuelve', await ev(`document.getElementById('tNom').value`) === 'Ana Gómez');
  chk('  el PIN no', await ev(`document.getElementById('tPin').value`) === '');
  chk('  y cuenta como sin guardar', await ev(`_hayCambiosSinGuardar()`));
  await ev(`_borradorLimpiar('prueba');1`);
  chk('_borradorLimpiar lo borra', !(await ev(`!!localStorage.getItem('mc_borr')`)));
  chk('el alta de representante está en un borrador', /data-borrador="vend:nuevo"/.test(await ev(`ajVendRow({nombre:'',usuario:''},true)`)));
  chk('  y el alta de usuario', /data-borrador="usr:nuevo"/.test(await ev(`ajUserRow({usuario:''},true)`)));
  cli.matar();
  console.log('\n' + ok + ' ok · ' + mal + ' MAL'); process.exit(mal ? 1 : 0);
})();
