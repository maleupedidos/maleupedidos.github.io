/* LOS FREEZERS Y EL TOPE POR CAPACIDAD (15/11/2026, 714).
 *
 *   node _tools/servir.js                      (en otra terminal)
 *   node _tools/pruebas/probar_freezers_capacidad.js
 *
 * Tadeo: «configurar bien los tamaños y las medidas … para que quede todo guardado». Cada freezer tiene nombre, tipo,
 * marca, modelo y litros; si no sabe los litros, carga las medidas de adentro y el ERP los calcula. Cuando TODOS los
 * freezers de un depósito tienen litros, el reparto de NUEVA OC («Según la demanda») y el sugerido de Transferir no le
 * mandan a ese depósito más de lo que entra. Mientras falten litros, todo como antes: sin tope.
 *
 * Sin backend (?prueba=1): `_baseRpc` simulado, ningún POST sale. Se prueban las cuentas y la pantalla de verdad a 390 y
 * 1440 px. La parte de la base (litros por medidas, capacidad NULL si falta uno) se probó en seco con la 714.
 */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const prep = require('./sesion_prep.js');
const BASE = process.env.BASE || 'http://localhost:8080';

let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d)); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };

const FRZ = [{ id: 1, n: 'Vertical', l: null, tipo: 'vertical' }, { id: 2, n: 'Horizontal 1', l: null, tipo: 'horizontal' }, { id: 3, n: 'Horizontal 2', l: null, tipo: 'horizontal' }];
const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz', cap: null, lt: 60, frz: FRZ },
              { id: 'moresco', nombre: 'Deposito Moresco', cap: null, lt: 0, frz: [{ id: 4, n: 'Horizontal', l: null, tipo: 'horizontal' }] }];
const STOCK = [{ a: 'PMu', n: 'Pizza Muzzarella', u: 'u', lt: 2, f: 50, r: 0, d: 50, pd: { ustariz: 50, moresco: 0 }, pr: {} }];
const DEM = { ok: true, depositos: [{ id: 'ustariz', nombre: 'Deposito Ustariz' }, { id: 'moresco', nombre: 'Deposito Moresco' }],
  demanda: { PMu: { ustariz: { dem: 20, ideal: 30 }, moresco: { dem: 7, ideal: 10 } } } };

const MOCK = `(function(){
  window.__rpc=[];
  window._baseRpc=function(fn,args){
    window.__rpc.push({fn:fn,args:args});
    if(fn==='demanda_por_deposito')return Promise.resolve(${JSON.stringify(DEM)});
    if(fn==='freezer_guardar_directo'){
      var p=args.p, l=p.litros||((p.alto&&p.ancho&&p.prof)?Math.round(p.alto*p.ancho*p.prof/100)/10:null);
      var frz=D.stockDeps[0].frz.map(function(z){ return String(z.id)===String(p.id)?{id:z.id,n:p.nombre,l:l,tipo:p.tipo,marca:p.marca||null,modelo:p.modelo||null,alto:p.alto||null,ancho:p.ancho||null,prof:p.prof||null,lmed:!p.litros&&!!l}:z; });
      return Promise.resolve({ok:true,dep:p.dep,cap:null,frz:frz});
    }
    return Promise.reject(new Error('sin base en la prueba: '+fn));
  };
})(); 1`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((m, p) => { if (m === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'exc'); });
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('x') });
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
    if (!await esperar(cli, `typeof _depLibreL==='function'&&typeof _stmSugeridos==='function'&&typeof go==='function'`)) { console.log('  el ERP no arrancó'); salir(1); }
    await pausa(1500);
    await evaluar(cli, MOCK);
    await evaluar(cli, `window.D=window.D||{}; D.stock=${JSON.stringify(STOCK)}; D.stockDeps=${JSON.stringify(DEPS)}; 1`);

    console.log('\n== El lugar libre de cada depósito ==\n');
    let v = await evaluar(cli, `({u:_depLibreL('ustariz'), m:_depLibreL('moresco'), lpu:_skuLitros('PMu'), lpuX:_skuLitros('NOEXISTE')})`);
    chk('sin litros en los freezers: no se sabe el lugar (null), sin tope', v.u === null && v.m === null, v);
    chk('los litros por unidad salen de Productos; sin dato, 1', v.lpu === 2 && v.lpuX === 1, v);
    await evaluar(cli, `D.stockDeps[0].cap=100; 1`);
    v = await evaluar(cli, `_depLibreL('ustariz')`);
    chk('Ustariz con 100 L y 60 ocupados: quedan 40 L', v === 40, v);

    console.log('\n== NUEVA OC: el reparto «Según la demanda» ==\n');
    await evaluar(cli, `D.stockDeps[0].cap=null; 1`);
    await evaluar(cli, `abrirTab('abast'); 1`).catch(() => {});
    if (!await esperar(cli, `typeof window.npSugeridoPorDep==='function'`, 30000)) { chk('la sub-app de Abastecimiento arrancó', false); salir(1); }
    await evaluar(cli, `try{ _abaDemDepPedir(); }catch(e){} 1`);   /* lo pide al abrir NUEVA OC; acá, a mano */
    await esperar(cli, `!!(typeof abaDemDep==='function'&&abaDemDep())`, 15000);
    const IT = `{a:'PMu',pd:{ustariz:0,moresco:0},pr:{},caja:0}`;
    const rep = async (usado) => evaluar(cli, `(function(){ var r=npSugeridoPorDep(${IT},40${usado ? ',' + usado : ''}); return r?{u:r[0].q,m:r[1].q,no:r.noEntra}:null; })()`);
    v = await rep();
    chk('sin litros cargados: se reparte solo por la demanda (30 / 10), como hoy', v && v.u === 30 && v.m === 10 && !v.no, v);
    await evaluar(cli, `D.stockDeps[0].cap=100; 1`);   // Ustariz: 40 L libres = 20 pizzas
    v = await rep();
    chk('Ustariz con lugar para 20: le van 20 y el resto a Moresco (sin tope)', v && v.u === 20 && v.m === 20 && !v.no, v);
    await evaluar(cli, `D.stockDeps[1].cap=10; D.stockDeps[1].lt=0; 1`);   // Moresco: 10 L = 5 pizzas
    v = await rep();
    chk('no entra en ninguno: 20 + 5 entran, 15 van al principal y se avisa', v && v.u === 35 && v.m === 5 && v.no === 15, v);
    await evaluar(cli, `D.stockDeps[1].cap=null; 1`);
    v = await rep(`{ustariz:30}`);
    chk('lo ya asignado en la misma compra cuenta: con 30 L usados, a Ustariz solo 5', v && v.u === 5 && v.m === 35, v);
    await evaluar(cli, `D.stockDeps[0].cap=null; 1`);
    v = await rep(`{ustariz:30}`);
    chk('y sin capacidad, lo usado no importa (sin tope)', v && v.u === 30 && v.m === 10, v);

    console.log('\n== TRANSFERIR: el sugerido ==\n');
    await evaluar(cli, `STM_DEM={demanda:{PMu:{ustariz:{ideal:10},moresco:{ideal:30}}}}; _stmDemT=Date.now(); DEP_DATA={productos:[{a:'PMu',n:'Pizza Muzzarella',u:'u',porDep:{ustariz:50,moresco:0}}]}; DEP_DESDE='ustariz'; DEP_HACIA='moresco'; 1`);
    v = await evaluar(cli, `(_stmSugeridos()||[]).map(function(x){return x.q;})`);
    chk('sin litros en Moresco: sugiere 30 (lo que le falta), como hoy', JSON.stringify(v) === '[30]', v);
    await evaluar(cli, `D.stockDeps[1].cap=20; D.stockDeps[1].lt=0; 1`);
    v = await evaluar(cli, `(_stmSugeridos()||[]).map(function(x){return x.q;})`);
    chk('con 20 L libres en Moresco: sugiere 10 (lo que entra)', JSON.stringify(v) === '[10]', v);
    await evaluar(cli, `D.stockDeps[1].lt=20; 1`);
    v = await evaluar(cli, `(_stmSugeridos()||[]).length`);
    chk('Moresco lleno: no sugiere nada', v === 0, v);
    await evaluar(cli, `D.stockDeps[1].cap=null; D.stockDeps[1].lt=0; D.stockDeps[0].cap=null; 1`);

    for (const ancho of [390, 1440]) {
      console.log('\n== AJUSTES › DEPÓSITOS a ' + ancho + ' px ==\n');
      await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: 900, deviceScaleFactor: 1, mobile: ancho < 600 });
      await evaluar(cli, `D.stockDeps=${JSON.stringify(DEPS)}; ST_FRZ_ED=null; ST_FRZ_DEP=null; try{SESSION=Object.assign({},SESSION||{},{rol:'admin'});}catch(e){window.SESSION={rol:'admin'};} go('ajustes'); ajGo('depositos'); 1`);
      await esperar(cli, `document.querySelectorAll('#ajBody .st-frz').length>=2`, 10000);
      v = await evaluar(cli, `(function(){ var c=document.querySelectorAll('#ajBody .st-frz'); return {n:c.length, sinl:document.querySelectorAll('#ajBody .st-frz-sinl').length, cab:c[0]&&c[0].querySelector('.st-frz-tot').textContent, barra:document.querySelectorAll('#ajBody .st-frz-bar').length, cero:/\\b0 L\\b/.test(document.getElementById('ajBody').textContent)}; })()`);
      chk('los dos depósitos con sus 4 freezers, «Sin litros» en los 4', v.n === 2 && v.sinl === 4, v);
      chk('Ustariz dice «3 freezers · sin litros», sin barra ni «0 L»', v.cab === '3 freezers · sin litros' && v.barra === 0 && !v.cero, v);
      await evaluar(cli, `stFrzEditar('1','ustariz'); 1`);
      v = await evaluar(cli, `(function(){ var f=document.querySelector('#ajBody .st-frz-form'); return {hay:!!f, nom:(document.getElementById('stFrz_n')||{}).value, tipoOn:(f.querySelector('.ped-seg button.on')||{}).textContent, nota:/etiqueta de atrás o del costado/.test(f.textContent)}; })()`);
      chk('Cambiar abre el formulario con el nombre y el tipo de ese freezer', v.hay && v.nom === 'Vertical' && v.tipoOn === 'Vertical', v);
      chk('debajo de los litros: «Los litros están en la etiqueta de atrás o del costado»', v.nota, v);
      await evaluar(cli, `document.querySelector('#ajBody .fz-link').click(); 1`);
      await evaluar(cli, `[['al','80'],['an','100'],['pr','60']].forEach(function(x){ var e=document.getElementById('stFrz_'+x[0]); e.value=x[1]; e.dispatchEvent(new Event('input',{bubbles:true})); }); var m=document.getElementById('stFrz_ma'); m.value='Gafa'; m.dispatchEvent(new Event('input',{bubbles:true})); 1`);
      v = await evaluar(cli, `(document.getElementById('stFrzRes')||{}).textContent`);
      chk('con las medidas 80 × 100 × 60 el ERP calcula «Da ~480 L»', v === 'Da ~480 L', v);
      v = await evaluar(cli, `(function(){ var f=document.querySelector('#ajBody .st-frz-form'), r=f.getBoundingClientRect(), malos=[]; f.querySelectorAll('input,button').forEach(function(e){ var b=e.getBoundingClientRect(); if(b.right>r.right+1||b.left<r.left-1)malos.push(e.id||e.textContent); if(e.tagName==='INPUT'&&parseFloat(getComputedStyle(e).fontSize)<16)malos.push('letra '+e.id); }); return {malos:malos, scroll:document.documentElement.scrollWidth>innerWidth+1}; })()`);
      chk('nada se sale del formulario, inputs en 16 px y sin scroll de costado', !v.malos.length && !v.scroll, v);
      await evaluar(cli, `window.__rpc=[]; document.querySelector('#ajBody .st-frz-ok').click(); 1`);
      await esperar(cli, `!document.querySelector('#ajBody .st-frz-form')`, 5000);
      v = await evaluar(cli, `(function(){ var c=(__rpc.filter(function(x){return x.fn==='freezer_guardar_directo';})[0]||{}).args; var f=document.querySelector('#ajBody .st-frz-f'); return {p:c&&c.p, fila:f&&f.textContent}; })()`);
      chk('Guardar manda tipo, marca y las 3 medidas (sin litros: los calcula la base)',
          v.p && v.p.dep === 'ustariz' && String(v.p.id) === '1' && v.p.tipo === 'vertical' && v.p.marca === 'Gafa' && v.p.alto === 80 && v.p.ancho === 100 && v.p.prof === 60 && v.p.litros === undefined, v.p);
      chk('la fila queda «Vertical · Gafa · por medidas · 480 L»', /Vertical/.test(v.fila) && /Gafa/.test(v.fila) && /por medidas/.test(v.fila) && /480 L/.test(v.fila), v.fila);
      await evaluar(cli, `stFrzEditar('2','ustariz'); 1`);
      await evaluar(cli, `var n=document.getElementById('stFrz_n'); n.value=''; n.dispatchEvent(new Event('input',{bubbles:true})); window.__rpc=[]; document.querySelector('#ajBody .st-frz-ok').click(); 1`);
      v = await evaluar(cli, `__rpc.length`);
      chk('sin nombre no se guarda (ni sale el pedido a la base)', v === 0, v);
    }

    const propios = errores.filter(e => !/favicon|manifest|sin base en la prueba/i.test(String(e)));
    chk('ni un error en la consola', propios.length === 0, propios.slice(0, 3));
    console.log('\n' + ok + ' ok · ' + mal + ' mal\n');
    salir(mal ? 1 : 0);
  } catch (e) { console.log('  reventó la prueba: ' + (e && e.stack || e)); salir(1); }
})();
