/* Ruta > COBROS: juntar pedidos en un evento desde el cuadro del cliente (10/11/2026).

     BASE=http://localhost:8080 node _tools/pruebas/probar_cobros_juntar.js [ancho] [archivo]
     ... probar_cobros_juntar.js 390 ruta_viejo_tmp.html   <- la contraria, rojo

   Tadeo: «estos 2 pedidos (la carne y el Franui) son de un mismo asado: unir pedidos y ponerles un
   título, y ver el total para pasarle la división a los comensales».

   Sostiene:
   · el cuadro de un cliente con varios pedidos ofrece «🎉 Juntar lo tildado en un evento»;
   · sin nombre no junta (ni un POST); con nombre manda UN `pedidoGrupal` por pedido tildado, con ese
     nombre, y la tarjeta pasa a ser la del evento (🎉 título, el total de los dos);
   · «¿Entre cuántos?» 8 → $168.552 / 8 = $21.069 → $21.100 cada uno (para arriba, a los $100);
   · «Copiar para el grupo» lleva el título, el total, cuánto pone cada uno y el alias;
   · «Separar» manda `pedidoGrupal` con '' a todos y vuelve la tarjeta del cliente;
   · si la base rechaza uno, lo dice con su número y no lo da por juntado;
   · nada se sale de la pantalla y los botones miden ≥ 44 px.

   Nombres inventados: este repo es público. Los POST se interceptan (`_ordenPost` simulado). */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = Number(process.argv[2]) || 390;
const ARCH = process.argv[3] || 'ruta.html';
const BASE = (process.env.BASE || 'http://localhost:8080') + '/' + ARCH + '?standalone=1&prueba=1';

let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 700) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

const c = o => Object.assign({ totalOriginal: o.$, cobradoParcial: 0, parciales: [], es: 'Entregado', env: 0, desc: 0, sub: o.$, fp: 'Transferencia',
  de: 'Sábado', fe: '07/11/2026', fePed: '07/11/2026', r: Number(o.id), ck: 'c:barrio prueba|sub|101', t: '1150000101', c: 'Anfitrion Prueba', cn: 'Anfitrion Prueba' }, o);
const COBROS = [
  c({ key: 'Home|7301', h: 'Home', id: '7301', $: 141552, p: [{ a: 'PPM', q: 3 }] }),
  c({ key: 'Home|7302', h: 'Home', id: '7302', $: 27000, p: [{ a: 'F', q: 3 }] }),
  c({ key: 'Home|7303', h: 'Home', id: '7303', c: 'Otra Prueba', cn: 'Otra Prueba', ck: 'c:barrio prueba|sub|102', t: '1150000102', $: 18000, p: [{ a: 'F', q: 2 }] })
];
const CUENTAS = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', col: 2, alias: '', banco: '', def: false, inv: false },
  { id: 'mp', nombre: 'Cuenta Prueba', tipo: 'digital', col: 3, alias: 'aliasprueba', banco: 'Banco', def: true, inv: true }
];
const PRECIOS = { PPM: { p: 47184, c: 30000 }, F: { p: 9000, c: 5000 } };
const PREP = `
  window.__ops=[]; window.__errores=[]; window.__toasts=[]; window.__rechazar={};
  window.addEventListener('error',function(e){window.__errores.push(String(e.message));});
  window.addEventListener('unhandledrejection',function(e){window.__errores.push('promesa: '+String(e.reason&&e.reason.stack||e.reason));});
  try{localStorage.clear();}catch(e){}
  window.confirm=function(){return true;};
  window._pfId=function(){return 'pf_prueba_'+window.__ops.length;};
  /* La base, simulada: contesta como pedido_grupal_directo. Con window.__rechazar[id] contesta ok:false. */
  window._ordenPost=function(b){ window.__ops.push(JSON.parse(JSON.stringify(b)));
    var r=window.__rechazar[String(b.id)]?{ok:false,err:'fila'}:{ok:true,directo:true};
    if(r.ok)(window.__cobros||[]).forEach(function(p){if(p.h===b.hoja&&String(p.id)===String(b.id))p.grp=b.valor;});
    return new Promise(function(res){setTimeout(function(){res(new Response(JSON.stringify(r),{status:200}));},60);}); };
  window.__cobros=${JSON.stringify(COBROS)};
  (function(){ var of=window.fetch; window.fetch=function(u,o){
    var url=String((u&&u.url)||u||'');
    var J=function(x){return Promise.resolve(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}}));};
    if(o&&String(o.method||'').toUpperCase()==='POST') return J({ok:true});
    if(url.indexOf('action=entregas')>-1) return J({ts:Date.now(),e:[],cuentas:${JSON.stringify(CUENTAS)},arm:{},rep:{},hechas:[]});
    if(url.indexOf('action=cobrosPendientes')>-1) return J({ts:Date.now(),cobros:window.__cobros,billetera:0,sinCerrar:[],cuentas:${JSON.stringify(CUENTAS)},
      prods:{PPM:{n:'Carne Prueba',u:'u'},F:{n:'Franui Leche',u:'u'}}});
    if(url.indexOf('action=precios')>-1) return J(${JSON.stringify(PRECIOS)});
    if(url.indexOf('action=')>-1) return J({ok:true});
    return of.apply(this,arguments);};})();`;

const CARD = `[].slice.call(document.querySelectorAll('#cobrosContent .cobro-card')).filter(function(x){return /#7301/.test(x.textContent);})[0]`;
const LEER = `(function(){
  var k=${CARD}; if(!k)return {sin:true};
  var r=k.getBoundingClientRect();
  var bs=[].slice.call(k.querySelectorAll('button,input')).filter(function(b){return b.getBoundingClientRect().width>0;});
  return { txt:k.textContent.replace(/\\s+/g,' '), nom:(k.querySelector('.cg-nom')||{}).textContent||'',
    abrir:(function(b){return b?{dis:!!b.disabled,txt:b.textContent.trim()}:null;})(k.querySelector('.cg-junt-abrir button')),
    panel:!!k.querySelector('.cg-junt-in'), div:!!k.querySelector('.cg-div-in input'),
    ids:[].map.call(k.querySelectorAll('.cg-row'),function(x){return (x.textContent.match(/#(\\d+)/)||[])[1];}),
    afuera: bs.filter(function(b){var q=b.getBoundingClientRect();return q.right>r.right+1||q.left<r.left-1;}).map(function(b){return b.textContent.trim().slice(0,30);}),
    chicos: [].slice.call(k.querySelectorAll('.cg-junt-abrir button,.cg-junt-acc button,.cg-div-in input')).filter(function(b){return b.getBoundingClientRect().height>0&&b.getBoundingClientRect().height<36;}).map(function(b){return (b.textContent||b.placeholder).trim().slice(0,20)+' '+Math.round(b.getBoundingClientRect().height);}),
    sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth };
})()`;
const EN = sel => `(function(){var k=${CARD};var b=k&&k.querySelector(${JSON.stringify(sel)});if(b&&!b.disabled)b.click();return !!b;})()`;
const ESCRIBIR = (sel, v) => `(function(){var k=${CARD};var i=k&&k.querySelector(${JSON.stringify(sel)});if(!i)return false;i.value=${JSON.stringify(v)};i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`;

async function abrirLista(cli) {
  await ev(cli, `window.__vieja=1`);
  await cli.enviar('Page.navigate', { url: BASE });
  if (!await esperar(cli, "!window.__vieja && typeof switchTab==='function'")) throw new Error('la sub-app no arranco');
  await pausa(600);
  await ev(cli, `window.confirm=function(){return true;};window.rutCopiarTexto=function(t){window.__copia=t;}; var _st=window.showToast; window.showToast=function(m){window.__toasts.push(String(m)); if(_st)try{_st.apply(this,arguments);}catch(e){}};`);
  await ev(cli, `switchTab('cobros')`);
  if (!await esperar(cli, `/#7301/.test((document.getElementById('cobrosContent')||{}).textContent||'')`, 20000)) throw new Error('COBROS no pinto');
  await pausa(700);
}

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.enable');
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP });
    console.log('\n== Juntar en un evento · ' + ANCHO + 'px · ' + ARCH + ' ==');
    await abrirLista(cli);

    console.log('\n-- el cuadro del cliente, con sus dos pedidos --');
    let L = await ev(cli, LEER);
    chk('una tarjeta con #7301 y #7302 (y #7303, de otra casa, aparte)', !L.sin && L.ids.join() === '7301,7302' && !/#7303/.test(L.txt), L);
    chk('ofrece «🎉 Juntar lo tildado en un evento», prendido', !!(L.abrir && !L.abrir.dis && /Juntar lo tildado en un evento/.test(L.abrir.txt)), L.abrir);

    await ev(cli, EN('.cg-junt-abrir button')); await pausa(300);
    L = await ev(cli, LEER);
    chk('abre el nombre del evento', L.panel === true, L);
    chk('dice que es una etiqueta y que cada pedido se cobra igual', /Es una etiqueta: cada pedido se cobra y se cuenta igual que ahora/.test(L.txt), L.txt);
    chk('el botón dice cuánto suma lo tildado: Juntar · $168.552', /Juntar · \$168\.552/.test(L.txt), L.txt);

    console.log('\n-- sin nombre no junta --');
    await ev(cli, EN('.cg-junt-ok')); await pausa(400);
    chk('ni un POST, y avisa', (await ev(cli, 'window.__ops.length')) === 0 && /Ponele un nombre/.test((await ev(cli, 'window.__toasts.join("|")')) || ''), await ev(cli, 'window.__toasts'));

    console.log('\n-- con nombre --');
    await ev(cli, ESCRIBIR('.cg-junt-in', '  Asado   Prueba 7/11 '));
    await ev(cli, EN('.cg-junt-ok'));
    await esperar(cli, 'window.__ops.length>=2', 8000); await pausa(1500);
    const ops = await ev(cli, 'window.__ops');
    chk('un `pedidoGrupal` por pedido, con el nombre limpio', Array.isArray(ops) && ops.length === 2 && ops.every(o => o.action === 'pedidoGrupal' && o.hoja === 'Home' && o.valor === 'Asado Prueba 7/11' && o.clientOpId) && ops.map(o => o.id).join() === '7301,7302', ops);
    L = await ev(cli, LEER);
    chk('la tarjeta pasa a ser la del evento: 🎉 Asado Prueba 7/11', /🎉\s*Asado Prueba 7\/11/.test(L.nom || ''), L.nom);
    chk('con los dos pedidos y el total $168.552', L.ids && L.ids.join() === '7301,7302' && /Debe\s*\$168\.552/.test(L.txt), L.txt);
    chk('el de la otra casa no se tocó', !/#7303/.test(L.txt));

    console.log('\n-- dividir entre los comensales --');
    chk('pregunta entre cuántos', L.div === true, L);
    await ev(cli, ESCRIBIR('.cg-div-in input', '8')); await pausa(200);
    L = await ev(cli, LEER);
    chk('8 → $21.100 cada uno ($168.552 / 8 = $21.069, para arriba a los $100)', /\$21\.100 cada uno/.test(L.txt), L.txt);
    await ev(cli, EN('.cg-junt-acc .cobro-btn-copiar')); await pausa(300);
    const cp = (await ev(cli, 'window.__copia')) || '';
    console.log('     ' + String(cp).replace(/\n/g, ' ⏎ ').slice(0, 400));
    chk('el mensaje arranca con el título', /^🎉 Asado Prueba 7\/11/.test(cp), cp);
    chk('lleva el total, cuánto pone cada uno y el alias', /💳 Total: \$168\.552/.test(cp) && /👥 Son 8: \$21\.100 cada uno/.test(cp) && /aliasprueba/.test(cp), cp);
    chk('y habla en plural («cada uno transfiere su parte»)', /cada uno transfiere su parte/.test(cp) && !/me transferís/.test(cp), cp);
    chk('la división sobrevive a que la pantalla se repinte', await (async () => { await ev(cli, `_cobGrpRepintar()`); await pausa(400); return /\$21\.100 cada uno/.test((await ev(cli, LEER)).txt); })());

    console.log('\n-- pantalla --');
    L = await ev(cli, LEER);
    chk('nada se sale de la tarjeta ni de la pantalla', L.afuera.length === 0 && L.sw <= L.vw + 1, L);
    chk('los botones nuevos miden ≥ 36 px (los de acción 44)', L.chicos.length === 0, L.chicos);

    console.log('\n-- separar --');
    await ev(cli, `window.__ops=[]`);
    await ev(cli, EN('.cg-junt-sep'));
    await esperar(cli, 'window.__ops.length>=2', 8000); await pausa(1500);
    const op2 = await ev(cli, 'window.__ops');
    chk('`pedidoGrupal` con \'\' a los dos', Array.isArray(op2) && op2.length === 2 && op2.every(o => o.valor === ''), op2);
    L = await ev(cli, LEER);
    chk('vuelve la tarjeta del cliente', /Anfitrion Prueba/.test(L.nom || '') && !/🎉/.test(L.nom || ''), L.nom);

    console.log('\n-- si la base rechaza uno --');
    await ev(cli, `window.__ops=[];window.__toasts=[];window.__rechazar={'7302':1}`);
    await ev(cli, EN('.cg-junt-abrir button')); await pausa(300);
    await ev(cli, ESCRIBIR('.cg-junt-in', 'Asado Prueba 7/11'));
    await ev(cli, EN('.cg-junt-ok'));
    await esperar(cli, 'window.__ops.length>=2', 8000); await pausa(1500);
    const t3 = (await ev(cli, 'window.__toasts.join("|")')) || '';
    chk('lo dice con su número: «No pude juntar #7302 (los otros 1 sí)»', /No pude juntar #7302 \(los otros 1 sí\)/.test(t3), t3);
    L = await ev(cli, LEER);
    chk('y #7302 no quedó adentro del evento', L.ids && L.ids.join() === '7301', L.ids);

    const err = await ev(cli, 'window.__errores');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL  la prueba se cortó: ' + (e && e.message || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
