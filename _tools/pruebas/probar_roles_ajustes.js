/* Roles dinámicos en Ajustes, la tab Clientes borrada y Planificación que dice
   cuando no pudo actualizar (21/9/2026).

   node probar_roles_ajustes.js [390|1440]

   Backend STUBBEADO con datos inventados (repo público). No hace falta token.

   Sostiene:
   · no hay botón "Clientes" en el menú y Alt+7 lleva a CRM;
   · Ajustes › Permisos muestra los roles que manda el backend (los cuatro y los
     nuevos), con "+ Nuevo rol" (manda rolCrear) y una ✕ solo en los nuevos;
   · Usuarios: un usuario con un rol nuevo lo conserva en el selector y al guardar
     (antes el navegador marcaba "admin" y guardar lo pasaba a admin);
   · la app relee su rol: si el backend dice otro rol con otras tabs, el menú se
     rearma solo (sin Ajustes) y avisa;
   · Planificación: si no puede actualizar, dice por qué y que está viendo una copia,
     con Reintentar;
   · el menú del usuario dice la versión instalada. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');

const ANCHO = parseInt(process.argv[2], 10) || 1440;
const BASE = process.env.BASE || 'http://localhost:8080';
let ok = 0, mal = 0;
function chk(nom, cond, det) {
  if (cond === true) { ok++; console.log('  ok   ' + nom); }
  else { mal++; console.log('  MAL  ' + nom + (det !== undefined ? '\n         ' + JSON.stringify(det).slice(0, 600) : '')); }
}
const pausa = ms => new Promise(r => setTimeout(r, ms));
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };
const esperar = async (cli, expr, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await ev(cli, expr); if (r === true) return true; await pausa(250); }
  return false;
};

const TABS = ['inicio', 'ventas', 'catering', 'planificacion', 'pedidos', 'caja', 'egresos', 'stock', 'ruta', 'busqueda', 'estancias', 'proveedores', 'miportal', 'pedidoshome', 'mireparto', 'ajustes'];
const META = TABS.map(t => ({ id: t, label: t }));
const AJ = { ok: true, tabsMeta: META, roles: ['admin', 'empleado', 'repartidor', 'vendedor', 'socio'],
  usuarios: [{ usuario: 'tadeo', pin: 'x', rol: 'admin', nombre: 'Tadeo Prueba', activo: true, notas: '' }, { usuario: 'luqui', pin: 'y', rol: 'socio', nombre: 'Lucas Prueba', activo: true, notas: '' }],
  permisos: { admin: TABS.slice(), socio: ['estancias'] }, configMaleu: [], provisiones: [], configNegocio: [], contadores: [], vendedores: [] };
const LIGHT = { ts: 1, pedidos: [], canales: [], light: true, saludSem: {}, saludMes: {}, ventasExtra: [] };
const PLAN_COPIA = { ok: true, mes: 'Septiembre 2026', yyyy: 2026, mm: 9, diasMes: 30, diasTrans: 21, metas: {}, objetivos: [], real: {}, acciones: [], origen: [],
  barriosHome: [], canalesPrincipales: [], _guardado: Date.now() - 3 * 3600 * 1000 };

const STUB = `
  window.__posts=[]; window.__toasts=[]; window.__rol='admin';
  window.prompt=function(){ return 'crecimiento'; }; window.confirm=function(){ return true; };
  if(window.top===window){ try{
    localStorage.setItem('maleu_tab','inicio');
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('maleu_plan_cache_')===0||k.indexOf('mc_')===0) localStorage.removeItem(k); });
    localStorage.setItem('maleu_plan_cache_Septiembre 2026', ${JSON.stringify(JSON.stringify(PLAN_COPIA))});
  }catch(e){} }
  (function(){ var o=window.fetch; window.fetch=function(u,x){
    var url=String((u&&u.url)||u||'');
    if(url.indexOf('script.google.com')>-1){
      var resp=function(c){var t=JSON.stringify(c);return new Promise(function(r){setTimeout(function(){r(new Response(t,{status:200,headers:{'Content-Type':'application/json'}}));},120);});};
      if(x&&String(x.method||'').toUpperCase()==='POST'){ var b={}; try{ b=JSON.parse(x.body); }catch(e){} var bb={}; Object.keys(b).forEach(function(k){ if(k!=='token') bb[k]=b[k]; }); window.__posts.push(bb); return resp({ok:true}); }
      var m=url.match(/action=([a-zA-Z_]+)/), a=m?m[1]:'?', cuerpo={ok:false,error:'stub'};
      if(a==='pedidosLight') cuerpo=${JSON.stringify(LIGHT)};
      else if(a==='cajaLight') cuerpo={ts:1,caja:{},saldoBase:{},movimientos:[],efMano:[],gastos:[],ingresos:[]};
      else if(a==='ocLight') cuerpo={ok:true,oc:{lista:[]}};
      else if(a==='cobrosPendientes') cuerpo={ts:1,cobros:[]};
      else if(a==='ajustesData') cuerpo=${JSON.stringify(AJ)};
      else if(a==='miSesion') cuerpo = window.__rol==='admin'
        ? {ok:true,usuario:'tadeo',rol:'admin',nombre:'Tadeo Prueba',activo:true,tabs:${JSON.stringify(TABS)}}
        : {ok:true,usuario:'tadeo',rol:'socio',nombre:'Tadeo Prueba',activo:true,tabs:['estancias','planificacion']};
      else if(a==='planMes') cuerpo={ok:false,error:'stub caído'};
      else if(a==='admin') cuerpo={ok:false,forbidden:true};
      return resp(cuerpo);
    }
    return o.apply(this,arguments); }; })();`;

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO <= 560 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') + STUB });
    console.log('\n== Roles, Clientes y Planificación · ' + ANCHO + 'px ==');
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?tab=inicio' });
    if (!await esperar(cli, `typeof go==='function' && typeof ajGo==='function' && typeof _refrescarMiSesion==='function'`, 90000)) throw new Error('el ERP no cargó');
    await ev(cli, `var _t=window.toast;window.toast=function(m){window.__toasts.push(String(m));return _t.apply(this,arguments);};1`);
    await esperar(cli, `Array.isArray(SESSION.tabs) && SESSION.tabs.length===16`, 15000);

    console.log('\n-- la tab Clientes no está --');
    chk('no hay botón "Clientes" en el menú, y sí el de CRM', await ev(cli, `!document.querySelector('.bn[data-p="bbdd"]') && !!document.querySelector('.bn[data-p="estancias"]') && !document.getElementById('p-bbdd')`) === true);
    await ev(cli, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'7',code:'Digit7',altKey:true,bubbles:true}));1`);
    await pausa(600);
    chk('Alt+7 lleva a CRM', await ev(cli, `cur`) === 'estancias', await ev(cli, `cur`));

    console.log('\n-- Ajustes: los roles --');
    await ev(cli, `window.__posts=[];go('ajustes')`);
    await esperar(cli, `!!AJ_DATA && AJ_DATA.roles && AJ_DATA.roles.length===5`, 20000);
    await ev(cli, `ajGo('permisos');1`);
    await esperar(cli, `!!document.querySelector('#p-ajustes table.aj-perm')`, 10000);
    const P = await ev(cli, `JSON.stringify({th:[].map.call(document.querySelectorAll('#p-ajustes table.aj-perm thead th'),function(t){return t.textContent.trim();}),
      x:[].map.call(document.querySelectorAll('#p-ajustes table.aj-perm thead .aj-rol-x'),function(b){return b.getAttribute('onclick');}),
      nuevo:!!Array.prototype.find.call(document.querySelectorAll('#p-ajustes button'),function(b){return /Nuevo rol/.test(b.textContent);}),
      marcadoSocioCRM:(function(){ var fila=[].filter.call(document.querySelectorAll('#p-ajustes table.aj-perm tbody tr'),function(r){return /^estancias$/.test(r.cells[0].textContent.trim());})[0]; return fila? fila.cells[5].querySelector('input').checked : null; })()})`);
    const Po = JSON.parse(typeof P === 'string' ? P : '{}');
    chk('la matriz tiene los 4 de siempre y el rol nuevo "socio"', JSON.stringify((Po.th || []).map(t => t.replace(/\s*✕$/, ''))) === JSON.stringify(['Tab', 'admin', 'empleado', 'repartidor', 'vendedor', 'socio']), Po.th);
    chk('solo el rol nuevo tiene ✕ para borrarlo', (Po.x || []).length === 1 && /ajBorrarRol\('socio'\)/.test(Po.x[0]), Po.x);
    chk('"socio" tiene tildado CRM (lo que dice la hoja)', Po.marcadoSocioCRM === true, Po);
    chk('hay un botón "+ Nuevo rol"', Po.nuevo === true);
    await ev(cli, `ajNuevoRol();1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='rolCrear';})`, 5000);
    const rc = await ev(cli, `window.__posts.filter(function(p){return p.action==='rolCrear';})[0]`);
    chk('+ Nuevo rol manda rolCrear con el nombre en minúscula', !!rc && rc.rol === 'crecimiento' && Object.keys(rc).length === 2, rc);

    console.log('\n-- Ajustes: el usuario con un rol nuevo --');
    await ev(cli, `ajGo('usuarios');1`);
    await esperar(cli, `document.querySelectorAll('#p-ajustes .aj-row.u').length>=2`, 10000);
    const U = await ev(cli, `JSON.stringify((function(){ var r=document.querySelector('#p-ajustes .aj-row.u[data-orig="luqui"]'); var s=r&&r.querySelector('[data-k="rol"]'); return {v:s&&s.value, ops:s?[].map.call(s.options,function(o){return o.value;}):[]}; })())`);
    const Uo = JSON.parse(typeof U === 'string' ? U : '{}');
    chk('Lucas con rol "socio": el selector lo muestra así (no vuelve a admin) y ofrece los roles del backend', Uo.v === 'socio' && Uo.ops.join() === 'admin,empleado,repartidor,vendedor,socio', Uo);
    await ev(cli, `window.__posts=[];ajSaveUser(document.querySelector('#p-ajustes .aj-row.u[data-orig="luqui"] [data-k="rol"]'));1`);
    await esperar(cli, `window.__posts.some(function(p){return p.action==='usuarioSet';})`, 5000);
    const us = await ev(cli, `window.__posts.filter(function(p){return p.action==='usuarioSet';})[0]`);
    chk('guardarlo manda rol "socio"', !!us && us.rol === 'socio' && us.usuario === 'luqui', us);

    console.log('\n-- Planificación: cuando no puede actualizar --');
    await ev(cli, `go('planificacion')`);
    await esperar(cli, `(function(){var b=document.getElementById('planEstado');return !!b&&!b.hidden;})()`, 20000);
    const E = await ev(cli, `(function(){var b=document.getElementById('planEstado');return {txt:b.textContent.replace(/\\s+/g,' ').trim(),boton:!!b.querySelector('button'),err:b.classList.contains('err')};})()`);
    chk('dice que no pudo, por qué, y que ve la copia de hace unas horas, con Reintentar', !!E && /No se pudo actualizar \(stub caído\)/.test(E.txt) && /copia de hace 3 horas/.test(E.txt) && E.boton && E.err, E);

    console.log('\n-- la versión instalada --');
    await ev(cli, `caches.open('maleu-panel-v999').then(function(){ _pintarVersion(); });1`);
    await esperar(cli, `document.getElementById('umVer').textContent==='Versión 999'`, 5000);
    chk('el menú del usuario dice la versión de este celular', await ev(cli, `document.getElementById('umVer').textContent`) === 'Versión 999');

    console.log('\n-- la app relee su rol --');
    await ev(cli, `window.__toasts=[];window.__rol='socio';_refrescarMiSesion(true);1`);
    await esperar(cli, `SESSION.rol==='socio'`, 10000);
    const R = await ev(cli, `JSON.stringify({rol:SESSION.rol,tabs:SESSION.tabs,aj:document.querySelector('.bn[data-p="ajustes"]').classList.contains('role-hidden'),
      crm:document.querySelector('.bn[data-p="estancias"]').classList.contains('role-hidden'),ini:document.querySelector('.bn[data-p="inicio"]').classList.contains('role-hidden'),
      pageAj:document.getElementById('p-ajustes').classList.contains('role-hidden'),toasts:window.__toasts,cur:cur})`);
    const Ro = JSON.parse(typeof R === 'string' ? R : '{}');
    chk('el backend dice otro rol: el menú se rearma solo, sin Ajustes ni Inicio, con CRM', Ro.rol === 'socio' && Ro.aj === true && Ro.pageAj === true && Ro.ini === true && Ro.crm === false, Ro);
    chk('y avisa que cambiaron los permisos', (Ro.toasts || []).some(t => /Se actualizaron tus permisos/.test(t)), Ro.toasts);
    await ev(cli, `window.__toasts=[];_refrescarMiSesion(true);1`);
    await pausa(1500);
    chk('si no cambió nada, no vuelve a avisar', (await ev(cli, `JSON.stringify(window.__toasts)`)) === '[]');

    const errs = await ev(cli, `JSON.stringify(window.__err||[])`);
    chk('ningún error de JavaScript', errs === '[]', errs);
  } catch (e) { mal++; console.log('  EXPLOTO ' + e.message); }
  console.log('\n  ' + ok + ' ok · ' + mal + ' mal\n');
  salir(mal ? 1 : 0);
})();
