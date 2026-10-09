/* EL AUTOPEDIDO DE UN ADMIN PUEDE ELEGIR UN DIA QUE YA PASO. (9/10/2026)
 *
 *   node _tools/servir.js 8097                 (en otra terminal)
 *   BASE=http://localhost:8097 node _tools/pruebas/probar_autopedido_fecha_pasada.js
 *
 * Tadeo saco un paquete de empanadas del freezer el 8/10 a la noche y lo anoto
 * el 9/10 como Home #1126 con fecha 9/10: el selector solo ofrecia de hoy en
 * adelante.
 *
 * Se abre ruta.html standalone y **ningun fetch sale de esta maquina** (igual
 * que `probar_autopedido_deposito.js`).
 *
 * Lo que se prueba son las DECISIONES:
 *   · un admin ve el boton y, al abrirlo, los 7 dias anteriores a hoy;
 *   · elegir uno pasa el estado a Entregado y la pantalla dice que dia queda;
 *   · el POST lleva ESE dia y Entregado;
 *   · con el estado cambiado a mano a Pendiente, no guarda;
 *   · quien no es admin no ve el boton, y en Clubes tampoco.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');

const BASE = process.env.BASE || 'http://localhost:8080';
const APP = process.env.APP || 'ruta.html';

let ok = 0, mal = 0;
const chk = (t, c, d) => {
  if (c) { ok++; console.log('  ok   ' + t); }
  else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); }
};
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 40000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); }
  return false;
};

const SINRED = `
(function(){
  window.__fetches = [];
  window.fetch = function(u, i){
    var url = (typeof u === 'string') ? u : ((u && u.url) || '');
    var post = !!(i && String(i.method||'').toUpperCase() === 'POST');
    var cuerpo = null;
    if (post) { try { cuerpo = JSON.parse(i.body); } catch(e) { cuerpo = String(i.body||''); } }
    window.__fetches.push({ url: url, post: post, body: cuerpo });
    return Promise.resolve({ ok: true, status: 200,
      json: function(){ return Promise.resolve({ ok: true, n: 9999, row: 2 }); },
      text: function(){ return Promise.resolve('{"ok":true}'); } });
  };
})();
`;
const sesion = rol => `
try{ localStorage.setItem('maleu_panel_session', JSON.stringify(
  { usuario: 'tadeo', rol: ${JSON.stringify(rol)}, nombre: 'Prueba', ts: Date.now() })); }catch(e){}
`;
const STOCK = { EJyQ: { f: 10, p: 10, dep: 'ustariz', pd: { ustariz: 10 } }, _deps: [{ id: 'ustariz', nombre: 'Deposito Ustariz', user: 'tadeo' }] };

async function conRol(cli, rol) {
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SINRED + sesion(rol) });
  await cli.enviar('Page.navigate', { url: BASE + '/' + APP + '?standalone=1' });
  if (!await esperar(cli, `typeof npRenderFechas==='function' && !!document.getElementById('npFechas')`))
    throw new Error('ruta.html no arranco');
  await evaluar(cli, `window.NP_STOCK=${JSON.stringify(STOCK)}; NP_STOCK_TS=Date.now(); NP_STOCK_COPIA=0; npZona='Home'; npRenderFechas(); 1`);
}
const ISO = dias => `(function(){var h=new Date();var d=new Date(h.getFullYear(),h.getMonth(),h.getDate()-${dias});return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);})()`;
const BOTONES = `Array.prototype.map.call(document.querySelectorAll('#npFechas .np-fecha-btn[data-iso]'),function(b){return b.dataset.iso;})`;
const POSTS = `(window.__fetches||[]).filter(function(f){return f.post && f.body && f.body.items})`;

(async () => {
  const cli = await abrir();
  const errores = [], dialogos = [];
  cli.escuchar((m, p) => {
    if (m === 'Runtime.exceptionThrown')
      errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'exc');
    /* Un alert/confirm nativo sin atender bloquea la pagina y la prueba se cuelga. */
    if (m === 'Page.javascriptDialogOpening') {
      dialogos.push(String((p || {}).message || '').slice(0, 160));
      cli.enviar('Page.handleJavaScriptDialog', { accept: true });
    }
  });
  await cli.enviar('Page.enable');
  await cli.enviar('Runtime.enable');
  const salir = c => { try { (cli.matar || cli.cerrar)(); } catch (e) {} process.exit(c); };
  try {
    console.log('\n== AUTOPEDIDO CON UN DIA QUE YA PASO ==\n   ' + BASE + '/' + APP + '\n');

    /* 1. ADMIN */
    await conRol(cli, 'admin');
    const hoy = await evaluar(cli, ISO(0)), ayer = await evaluar(cli, ISO(1)), hace7 = await evaluar(cli, ISO(7)), hace8 = await evaluar(cli, ISO(8));
    chk('la pantalla tiene la funcion (si no, es el codigo de antes)', await evaluar(cli, `typeof npTogglePasados==='function'`));
    let bts = await evaluar(cli, BOTONES);
    chk('cerrado, no ofrece ningun dia pasado', bts.length > 0 && bts.every(b => b >= hoy), bts);
    chk('y arranca en el primer dia de siempre', await evaluar(cli, `npFechaSel`) === bts[0], bts[0]);
    chk('un admin ve el boton para ir a un dia anterior', await evaluar(cli, `!!document.getElementById('npFechaAntes')`),
        await evaluar(cli, `({ rol: typeof _RUTA_ROL==='undefined'?'(no existe)':_RUTA_ROL, zona: npZona, html: document.getElementById('npFechas').innerHTML.slice(0, 160) })`));

    await evaluar(cli, `typeof npTogglePasados==='function' && npTogglePasados(); 1`);
    bts = await evaluar(cli, BOTONES);
    const pasados = bts.filter(b => b < hoy);
    chk('abierto, ofrece los 7 dias anteriores y ni uno mas', pasados.length === 7 && pasados[0] === hace7 && pasados[6] === ayer && bts.indexOf(hace8) < 0, pasados);
    chk('los de hoy en adelante siguen estando', bts.filter(b => b >= hoy).length >= 1);
    chk('abrirlo no cambia el dia elegido', await evaluar(cli, `npFechaSel`) >= hoy);

    await evaluar(cli, `npSetFecha(${JSON.stringify(ayer)}); 1`);
    await pausa(150);
    let v = await evaluar(cli, `({ f: npFechaSel, est: document.getElementById('npEstadoEntrega').value,
      nota: (document.getElementById('npFechaNota')||{}).textContent||'',
      activo: (document.querySelector('#npFechas .np-fecha-btn.active[data-iso]')||{dataset:{}}).dataset.iso||'' })`);
    chk('elegir ayer lo deja elegido', v.f === ayer && v.activo === ayer, v);
    chk('y pasa el estado a Entregado solo', v.est === 'Entregado', v.est);
    chk('la pantalla dice que se guarda como entregado ese dia', /ya pas/.test(v.nota) && /entregado/.test(v.nota), v.nota);
    await evaluar(cli, `npRenderFechas(); 1`);
    chk('un redibujo no pierde el dia pasado elegido', await evaluar(cli, `npFechaSel`) === ayer);

    /* 2. El POST lleva ese dia. */
    const idE = await evaluar(cli, `(function(){for(var i=0;i<NP_CAT_FLAT.length;i++)if(NP_CAT_FLAT[i].abbr==='EJyQ')return NP_CAT_FLAT[i].id;return 0;})()`);
    chk('el catalogo tiene el producto de prueba (EJyQ)', !!idE, idE);
    await evaluar(cli, `npCart={}; npCart[${idE}]=1; document.getElementById('npNombre').value='Prueba Fecha';
      document.getElementById('npOrigen').value='Deposito'; npOrigenTocado=true; npPreciosConfirmados=true;
      window.confirm=function(){return true}; window.__toasts=[]; var _st=showToast; showToast=function(m){window.__toasts.push(String(m)); try{_st.apply(this,arguments)}catch(e){}}; 1`);

    /* 2a. Con el estado vuelto a Pendiente a mano, NO guarda. */
    await evaluar(cli, `document.getElementById('npEstadoEntrega').value='Pendiente'; npGuardar(); 1`);
    await pausa(600);
    v = await evaluar(cli, `({ n: ${POSTS}.length, t: window.__toasts.slice(-1)[0]||'' })`);
    chk('un dia pasado con Estado: Pendiente no se guarda', v.n === 0, v);
    chk('y dice por que', /Entregado/.test(v.t), v.t);

    /* 2b. Entregado: sale. */
    await evaluar(cli, `document.getElementById('npEstadoEntrega').value='Entregado'; npSaving=false; npGuardar(); 1`);
    await esperar(cli, `${POSTS}.length>0`, 8000);
    const post = await evaluar(cli, `(function(){var L=${POSTS};return L.length?L[L.length-1].body:null;})()`);
    chk('el POST lleva el dia pasado', post && post.fechaEntrega === ayer, post && post.fechaEntrega);
    chk('y Estado: Entregado', post && post.estadoEntrega === 'Entregado', post && post.estadoEntrega);
    chk('con el nombre de ESE dia', post && post.dia === await evaluar(cli, `NP_DIA_NOMBRE[new Date(Date.now()-86400000).getDay()]`), post && post.dia);

    /* 3. Cerrar los pasados con uno elegido vuelve a un dia de siempre. */
    await conRol(cli, 'admin');
    await evaluar(cli, `npTogglePasados(); npSetFecha(${JSON.stringify(ayer)}); npTogglePasados(); 1`);
    await pausa(150);
    v = await evaluar(cli, `({ f: npFechaSel, nota: (document.getElementById('npFechaNota')||{}).textContent||'', bts: ${BOTONES} })`);
    chk('al ocultarlos, el dia elegido vuelve a ser de hoy en adelante', v.f >= hoy && v.bts.every(b => b >= hoy), v);
    chk('y la nota se va', v.nota === '', v.nota);

    /* 4. En Clubes no se ofrece (no fecha la entrega al nacer). */
    await evaluar(cli, `npZona='Clubes'; npRenderFechas(); 1`);
    chk('en Clubes no hay boton', await evaluar(cli, `!document.getElementById('npFechaAntes')`));
    await evaluar(cli, `npZona='Pilar'; npRenderFechas(); 1`);
    chk('en Pilar si', await evaluar(cli, `!!document.getElementById('npFechaAntes')`));

    /* 5. Quien no es admin no lo ve. */
    for (const rol of ['vendedor', 'empleado', '']) {
      await conRol(cli, rol);
      v = await evaluar(cli, `({ btn: !!document.getElementById('npFechaAntes'), bts: ${BOTONES} })`);
      chk('rol «' + (rol || 'sin rol') + '»: sin boton y sin dias pasados', v.btn === false && v.bts.length > 0 && v.bts.every(b => b >= hoy), v);
    }
    /* y si igual llegara con un dia pasado puesto, no guarda */
    await evaluar(cli, `npCart={}; npCart[${idE}]=1; document.getElementById('npNombre').value='Prueba Fecha';
      npFechaSel=${JSON.stringify(ayer)}; document.getElementById('npEstadoEntrega').value='Entregado'; npPreciosConfirmados=true;
      window.confirm=function(){return true}; npGuardar(); 1`);
    await pausa(600);
    chk('sin ser admin, un dia pasado puesto a la fuerza no se guarda', await evaluar(cli, `${POSTS}.length`) === 0);

    const propios = errores.filter(e => !/favicon|manifest|sw-|ServiceWorker/i.test(String(e)));
    chk('ni un error en la consola', propios.length === 0, propios.slice(0, 3));

    console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) {
    console.log('  revento la prueba: ' + e);
    salir(1);
  }
})();
