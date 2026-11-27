/* + PEDIDO: «SALE DE» A LA VISTA, SIN «FAMILIA» NI «POR ENCARGO», Y TATU EN «LO CONSIGUIÓ». (27/11/2026)
 *
 *   node _tools/servir.js --puerto 8155        (en otra terminal; o BASE=...)
 *   BASE=http://localhost:8155 node _tools/pruebas/probar_autopedido_sale_de.js
 *
 * ruta.html suelto (?standalone=1) a 390 de ancho. NINGÚN fetch sale: se cortan todos y se anotan, así que no toca
 * producción. Lo que se prueba son las DECISIONES:
 *   · Tatu (equipo, un solo freezer posible): «Sale de: Deposito Ustariz» escrito, sin botones, y se guarda.
 *   · Lucas (admin con freezer propio): dos botones SIN nada marcado, «el tuyo» en Moresco, y GUARDAR frena sin alta.
 *   · Tadeo (admin sin otro freezer): dos botones con Ustariz marcado.
 *   · Elegir Moresco y guardar: el alta lleva deposito=moresco y, cuando entra, sale `pedidoDeposito` con su número;
 *     cargado ya entregado sale `pedido_salida_corregir_directo`; con Ustariz no sale nada más.
 *   · «Sale de» está en el pie fijo, a la vista sin scrollear, y debajo del dedo hay un botón.
 *   · No hay selector «Familia» ni bloque «Por encargo»; un producto «soloPilar» está en su categoría en Home.
 *   · Tatu se ve a sí mismo en «Lo consiguió» con un cliente nuevo.
 * Probado al revés: con el `if(npDepFalta())` sacado de npGuardar, el chequeo «GUARDAR frena» da MAL. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const BASE = process.env.BASE || 'http://localhost:8155';
let ok = 0, mal = 0;
const chk = (t, c, d) => { if (c) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  MAL  ' + t); if (d !== undefined) console.log('         ' + JSON.stringify(d).slice(0, 500)); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };

const DEPS = [{ id: 'ustariz', nombre: 'Deposito Ustariz', user: 'tadeo' }, { id: 'moresco', nombre: 'Deposito Moresco', user: 'luqui' }];
const STOCK = { PMu: { f: 9, p: 9, dep: 'ustariz', pd: { ustariz: 9, moresco: 0 } }, SCo: { f: 16, p: 16, dep: 'ustariz', pd: { ustariz: 16, moresco: 0 } },
  ECaC: { f: 12, p: 12, dep: 'ustariz', pd: { ustariz: 6, moresco: 6 } }, SQB: { f: 3, p: 3, dep: 'ustariz', pd: { ustariz: 3, moresco: 0 } }, _deps: DEPS };

const SINRED = `(function(){ window.__fetches=[];
  window.fetch=function(u,i){ var url=(typeof u==='string')?u:((u&&u.url)||''); var post=!!(i&&String(i.method||'').toUpperCase()==='POST');
    var b=null; if(post){ try{ b=JSON.parse(i.body); }catch(e){ b=String(i.body||''); } } window.__fetches.push({url:url,post:post,body:b});
    return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve({ok:true,n:9999,row:2});},text:function(){return Promise.resolve('{"ok":true}');}}); };
  window.__ordenes=[]; window._ordenPost=function(b){ window.__ordenes.push(b); return Promise.resolve({json:function(){return Promise.resolve({ok:true});}}); };
  window._baseRpc=function(rpc,a){ window.__ordenes.push({rpc:rpc,args:a}); return Promise.resolve({ok:true}); };
  /* Un confirm/alert sin cerrar bloquea la página entera: se contestan solos y se anotan. */
  window.__dialogos=[]; window.confirm=function(m){ window.__dialogos.push(String(m).slice(0,80)); return true; }; window.alert=function(m){ window.__dialogos.push(String(m).slice(0,80)); };
  /* Suelto, ruta.html no trae los helpers del panel que usa el total. */
  if(typeof window.numAR!=='function')window.numAR=function(s){ return Number(String(s==null?'':s).replace(/\\./g,'').replace(',','.'))||0; };
})();`;
const sesion = (u, rol, nombre) => `try{ localStorage.setItem('maleu_panel_session', JSON.stringify({usuario:${JSON.stringify(u)},rol:${JSON.stringify(rol)},nombre:${JSON.stringify(nombre)},ts:Date.now()}));
  localStorage.setItem('maleu_rut_midep', JSON.stringify({u:${JSON.stringify(u)},d:{ok:true,deposito:'ustariz',principal:'ustariz',otro:${u === 'luqui' ? "'moresco'" : 'null'},otroN:0}}));
  localStorage.removeItem('maleu_np_cola'); localStorage.setItem('maleu_np_footer_collapsed','0'); }catch(e){}
  window.SESSION={usuario:${JSON.stringify(u)},rol:${JSON.stringify(rol)},nombre:${JSON.stringify(nombre)}};`;

async function con(cli, u, rol, nombre) {
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: SINRED + sesion(u, rol, nombre) });
  await cli.enviar('Page.navigate', { url: BASE + '/ruta.html?standalone=1' });
  if (!await esperar(cli, `typeof npDepRender==='function'&&!!document.getElementById('npDepWrap')&&typeof NP_CAT_FLAT!=='undefined'`)) throw new Error('ruta.html no arrancó');
  await evaluar(cli, `(function(){ try{ if(typeof rutShowTab==='function')rutShowTab('nuevo'); }catch(e){} try{ var b=document.querySelector('[data-tab="nuevo"]'); if(b)b.click(); }catch(e){}
    window.NP_STOCK=${JSON.stringify(STOCK)}; NP_STOCK_TS=Date.now(); NP_STOCK_COPIA=0; npSetZona('Home'); npDepRender(); npRenderCatalogo(); return 1; })()`);
  await pausa(300);
}
const DEP = `(function(){ var w=document.getElementById('npDepWrap'); var bs=[].slice.call(w.querySelectorAll('.np-dep-op'));
  var r=w.getBoundingClientRect(); return { visible:!w.classList.contains('hidden')&&w.checkVisibility()&&r.height>0, top:r.top, bottom:r.bottom, vh:innerHeight,
  txt:w.innerText.replace(/\\s+/g,' ').trim(), botones:bs.map(function(b){return b.innerText.replace(/\\s+/g,' ').trim();}), on:bs.filter(function(b){return b.classList.contains('on');}).map(function(b){return b.getAttribute('data-dep');}),
  elegido:npDepElegido(), falta:npDepFalta() }; })()`;
const CARGAR = `(function(){ document.getElementById('npNombre').value='PRUEBA Robot'; document.getElementById('npTel').value='';
  var p=NP_CAT_FLAT.filter(function(x){return x.abbr==='PMu';})[0]; npCart={}; npCart[p.id]=1;
  var f=document.querySelector('#npFechas [onclick]'); if(f)f.click(); npUpdateTotal(); return !!npFechaSel; })()`;
const ALTAS = `window.__fetches.filter(function(f){return f.post&&f.body&&f.body.canal;}).length`;

(async () => {
  const cli = await abrir();
  const errores = [];
  cli.escuchar((m, p) => { if (m === 'Runtime.exceptionThrown') errores.push((((p || {}).exceptionDetails || {}).exception || {}).description || 'exc'); });
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

    console.log('\n== Tatu (equipo) ==');
    await con(cli, 'santos', 'equipo', 'Santos Bullrich');
    let v = await evaluar(cli, DEP);
    chk('«Sale de: Deposito Ustariz» escrito, sin botones', v.visible && /Sale de: Deposito Ustariz/.test(v.txt) && v.botones.length === 0, v);
    chk('elegido ustariz, no falta', v.elegido === 'ustariz' && !v.falta, v);
    chk('a la vista sin scrollear (pie fijo)', v.top >= 0 && v.bottom <= v.vh, v);
    v = await evaluar(cli, `(function(){ _npClientesCache=[]; for(var i=0;i<60;i++)_npClientesCache.push({nombre:'X'+i,_st:'54911000000'+('0'+i).slice(-2)}); _npFetchingClientes=false;
      _npCapts=['Agustin Carpinacci','Alfonso','Santos Bullrich']; document.getElementById('npTel').value='11 5555 1234'; npCliElegido=false; npCaptManual=false; npCaptPintar();
      var w=document.getElementById('npCaptWrap'), s=document.getElementById('npCaptado'); return {hidden:w.hidden, val:s.value, ops:[].map.call(s.options,function(o){return o.text;})}; })()`);
    chk('Tatu se ve en «Lo consiguió» y queda precargado con un cliente nuevo', !v.hidden && v.val === 'Santos Bullrich', v);

    console.log('\n== Lucas (admin con freezer propio) ==');
    await con(cli, 'luqui', 'admin', 'Lucas Moresco');
    v = await evaluar(cli, DEP);
    chk('dos botones, nada marcado, Moresco dice «el tuyo»', v.botones.length === 2 && v.on.length === 0 && v.botones.some(b => /Moresco.*el tuyo/.test(b)), v);
    chk('falta elegir', v.falta === true && v.elegido === '', v);
    chk('a la vista sin scrollear', v.top >= 0 && v.bottom <= v.vh, v);
    chk('carrito y fecha cargados', await evaluar(cli, CARGAR));
    await evaluar(cli, `npGuardar(); 1`); await pausa(400);
    v = await evaluar(cli, `({altas:${ALTAS}, err:(document.querySelector('.np-err[data-de="npDepWrap"]')||{}).textContent||''})`);
    chk('GUARDAR frena sin depósito: no sale el alta y lo dice', v.altas === 0 && /depósito/.test(v.err), v);
    /* El toque de verdad: debajo del dedo tiene que estar el botón. */
    const pt = await evaluar(cli, `(function(){ var b=document.querySelector('.np-dep-op[data-dep="moresco"]'); var r=b.getBoundingClientRect(); var x=r.left+r.width/2,y=r.top+r.height/2;
      var e=document.elementFromPoint(x,y); return {x:x,y:y,es:!!(e&&e.closest&&e.closest('.np-dep-op')===b), h:r.height}; })()`);
    chk('debajo del dedo está el botón Moresco (alto ≥ 40)', pt.es && pt.h >= 40, pt);
    await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y }] });
    await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cli.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await cli.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
    await pausa(200);
    v = await evaluar(cli, DEP);
    chk('tocar Moresco lo marca', v.on.join() === 'moresco' && v.elegido === 'moresco' && !v.falta, v);
    await evaluar(cli, `window.__ordenes=[]; npGuardar(); 1`);
    await esperar(cli, `window.__ordenes.length>0`, 8000);
    v = await evaluar(cli, `({alta:window.__fetches.filter(function(f){return f.post&&f.body&&f.body.canal;}).map(function(f){return f.body.deposito;}), ord:window.__ordenes})`);
    chk('el alta lleva deposito=moresco', v.alta.length === 1 && v.alta[0] === 'moresco', v);
    chk('al entrar sale pedidoDeposito con el número', v.ord.length === 1 && v.ord[0].action === 'pedidoDeposito' && v.ord[0].id === '9999' && v.ord[0].deposito === 'moresco' && v.ord[0].hoja === 'Home', v);
    v = await evaluar(cli, `(function(){ window.__ordenes=[]; _npDepDespues({coid:'x1',nom:'PRUEBA',d:{canal:'Home',deposito:'moresco',estadoEntrega:'Entregado'}},{ok:true,n:9998});
      _npDepDespues({coid:'x2',nom:'PRUEBA',d:{canal:'Home',deposito:'ustariz',estadoEntrega:'Pendiente'}},{ok:true,n:9997}); return new Promise(function(r){ setTimeout(function(){ r(window.__ordenes); },300); }); })()`);
    chk('cargado ya entregado: pedido_salida_corregir_directo; con Ustariz nada', v.length === 1 && v[0].rpc === 'pedido_salida_corregir_directo' && v[0].args.p.key === 'Home|9998' && v[0].args.p.dep === 'moresco', v);

    console.log('\n== Tadeo (admin sin otro freezer) ==');
    await con(cli, 'tadeo', 'admin', 'Tadeo Ustariz');
    v = await evaluar(cli, DEP);
    chk('dos botones con Ustariz marcado', v.botones.length === 2 && v.on.join() === 'ustariz' && !v.falta, v);

    v = await evaluar(cli, `(function(){ NP_STOCK._deps=${JSON.stringify(DEPS)}.concat([{id:'prueba',nombre:'Deposito prueba'}]); npDepTocado=false; npDepRender();
      return [].map.call(document.querySelectorAll('.np-dep-op'),function(b){return b.getAttribute('data-dep');}); })()`);
    chk('a un admin no se le ofrece el depósito «prueba»', v.indexOf('prueba') < 0 && v.length === 2, v);

    console.log('\n== El robot ==');
    await con(cli, 'robot', 'robot', 'Robot de pruebas');
    v = await evaluar(cli, `(function(){ NP_STOCK._deps=${JSON.stringify(DEPS)}.concat([{id:'prueba',nombre:'Deposito prueba'}]); npDepTocado=false; npDepRender(); return ${DEP}; })()`);
    chk('el robot ve «prueba», sin nada marcado (auditoria_flujos lo toca)', v.botones.length === 3 && v.on.length === 0 && v.falta, v);
    await evaluar(cli, `npDepElegir('prueba'); 1`);
    chk('y elegido queda prueba', (await evaluar(cli, `npDepElegido()`)) === 'prueba');

    console.log('\n== Sin «Familia» ni «Por encargo» ==');
    v = await evaluar(cli, `(function(){ var q=NP_CAT_FLAT.filter(function(x){return x.abbr==='SQB';})[0]; var card=q&&document.getElementById('npProd_'+q.id);
      return { fam:!!document.querySelector('.np-fam-sel,#npFam'), enc:!!document.querySelector('.np-encargo'), txt:/Por encargo/.test(document.getElementById('npProductos').innerText),
               brie:!!card, brieEnEnc:!!(card&&card.closest('.np-encargo')) }; })()`);
    chk('no hay selector Familia', !v.fam, v);
    chk('no hay bloque Por encargo', !v.enc && !v.txt, v);
    chk('Queso Brie (soloPilar) está en el catálogo de Home, fuera de un bloque aparte', v.brie && !v.brieEnEnc, v);

    chk('cero errores de JavaScript', errores.length === 0, errores);
  } catch (e) { mal++; console.log('  MAL  la prueba reventó: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
