/* La cuenta de la juntada (10/11/2026, 638).

     node _tools/pruebas/probar_juntada_cuenta.js [ancho]          (con `npm run dev` andando)

   Sin backend (?prueba=1): las RPC de la juntada y `_ordenPost` están simulados y anotan lo que mandarían. Datos
   inventados (repo público).

   La cuenta, sacada a mano:
     Maleu #1 Anfitrión, COBRADO, $141.552 · Maleu #2 Anfitrión, SIN COBRAR, $27.000 · Pan de Juan $8.000
     Total $176.552 entre 3 (Anfitrión, Juan, Pedro) → $58.851 · $58.851 · $58.850
     Anfitrión puso $141.552 → le deben $82.701 · Juan puso $8.000 → debe $50.851 · Pedro debe $58.850
     Pedro → Maleu $27.000 · Pedro → Anfitrión $31.850 · Juan → Anfitrión $50.851  (suman lo que se debe)
   Y la pantalla: arriba el total, cuántos y cuánto cada uno; sumar un gasto manda `juntada_gasto_directo`; sumar a uno
   del CRM manda su teléfono; uno nuevo con casa manda la juntada, la ficha del CRM (barrio y lote) y «vive»; los
   mensajes dicen lo de cada uno. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const ANCHO = Number(process.argv[2]) || 390;
const URL = (process.env.BASE || 'http://localhost:8080') + '/app.html?prueba=1';
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 700) : '')); } };
const pausa = ms => new Promise(r => setTimeout(r, ms));
const esperar = async (cli, expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evaluar(cli, expr)) return true; } catch (e) {} await pausa(200); } return false; };
const ev = async (cli, expr) => { try { return await evaluar(cli, expr); } catch (e) { return { __err: String(e.message || e) }; } };

const DATA = { ok: true, ck: 'g:asado prueba', titulo: 'Asado Prueba',
  pedidos: [
    { k: 'Home|9001', h: 'Home', n: '9001', c: 'Anfitrion Prueba', tel: '1100000001', total: 141552, cob: true, es: 'Entregado', fp: 'Transferencia', pago: '', aCuenta: 0, p: [{ a: 'CLo', q: 2.289 }] },
    { k: 'Home|9002', h: 'Home', n: '9002', c: 'Anfitrion Prueba', tel: '1100000001', total: 27000, cob: false, es: 'Entregado', fp: 'Transferencia', pago: '', aCuenta: 0, p: [{ a: 'F', q: 3 }] }],
  integrantes: [{ nombre: 'Juan Prueba', tel: '' }, { nombre: 'Pedro Prueba', tel: '' }],
  gastos: [{ id: '00000000-0000-0000-0000-000000000001', quien: 'Juan Prueba', que: 'Pan', monto: 8000, ts: '' }] };

(async () => {
  const cli = await abrir();
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__errs=[];window.addEventListener("error",function(e){if(!/ResizeObserver/.test(e.message))window.__errs.push(String(e.message))});' });
    await cli.enviar('Page.navigate', { url: URL });
    console.log('\n== La cuenta de la juntada · ' + ANCHO + 'px ==');
    if (!await esperar(cli, `typeof jntAbrir==='function'&&typeof _jntCuenta==='function'`, 60000)) throw new Error('el ERP no cargó');

    console.log('\n-- la cuenta --');
    const C = await ev(cli, `(function(){var C=_jntCuenta(${JSON.stringify(DATA)});return {total:C.total,n:C.n,pend:C.pendMaleu,per:C.personas.map(function(x){return [x.nombre,x.puso,x.toca,x.saldo];}),tr:C.trans.map(function(t){return t.de+'>'+t.a+':'+t.monto;})};})()`);
    chk('total $176.552 entre 3', C.total === 176552 && C.n === 3, C);
    chk('a cada uno le toca $58.851 · $58.851 · $58.850 (el resto de a $1)', JSON.stringify(C.per.map(p => p[2])) === '[58851,58851,58850]', C.per);
    chk('Anfitrión puso $141.552 (lo cobrado) y le deben $82.701', C.per[0][0] === 'Anfitrion Prueba' && C.per[0][1] === 141552 && C.per[0][3] === 82701, C.per[0]);
    chk('falta cobrar a Maleu $27.000 (el pedido sin cobrar)', C.pend === 27000, C.pend);
    chk('Pedro → Maleu $27.000 · Pedro → Anfitrión $31.850 · Juan → Anfitrión $50.851', JSON.stringify(C.tr) === JSON.stringify(['Pedro Prueba>Maleu:27000', 'Pedro Prueba>Anfitrion Prueba:31850', 'Juan Prueba>Anfitrion Prueba:50851']), C.tr);
    const C2 = await ev(cli, `(function(){var d=${JSON.stringify(DATA)};d.pedidos[0].pago='Pedro Prueba';var C=_jntCuenta(d);return C.personas.map(function(x){return [x.nombre,x.puso];});})()`);
    chk('si el cobro dice «pagó Pedro», lo puso Pedro', JSON.stringify(C2) === JSON.stringify([['Anfitrion Prueba', 0], ['Juan Prueba', 8000], ['Pedro Prueba', 141552]]), C2);
    const C3 = await ev(cli, `(function(){var d=${JSON.stringify(DATA)};d.pedidos[1].aCuenta=10000;var C=_jntCuenta(d);return {pend:C.pendMaleu,puso:C.personas[0].puso};})()`);
    chk('lo pagado a cuenta lo puso el que pidió y baja lo que falta a Maleu', C3.pend === 17000 && C3.puso === 151552, C3);

    console.log('\n-- la pantalla --');
    await ev(cli, `window.__rpc=[];window.__op=[];window.__d=${JSON.stringify(DATA)};
      _jntCli=[{nombre:'Maria Del Crm',tel:'1100000009'}];
      window._jntRpc=function(fn,p){window.__rpc.push({fn:fn,p:JSON.parse(JSON.stringify(p))});var d=window.__d;
        if(fn==='juntada_gasto_directo'&&!p.quitar)d.gastos.push({id:'00000000-0000-0000-0000-00000000000'+(d.gastos.length+1),quien:p.quien,que:p.que,monto:p.monto});
        if(fn==='juntada_integrante_directo'){if(!p.quitar)d.integrantes.push({nombre:p.nombre,tel:p.tel||''});return new Promise(function(r){setTimeout(function(){r({ok:true,integrantes:d.integrantes.map(function(x){return x.nombre;})});},80);});}
        return new Promise(function(r){setTimeout(function(){r(JSON.parse(JSON.stringify(d)));},80);});};
      window._ordenPost=function(b){window.__op.push(JSON.parse(JSON.stringify(b)));return Promise.resolve(new Response('{"ok":true}',{status:200}));};
      jntAbrir('Asado Prueba');1`);
    await esperar(cli, `!!document.querySelector('#jntBody .jnt-top')`, 8000);
    const top = await ev(cli, `document.querySelector('#jntBody .jnt-top').innerText.replace(/\\s+/g,' ')`);
    chk('arriba: Total $176.552 · Son 3 · Cada uno $58.851 · Falta a Maleu $27.000', /TOTAL \$176\.552 SON 3 CADA UNO \$58\.851 FALTA A MALEU \$27\.000/i.test(top), top);
    const tr = await ev(cli, `[].map.call(document.querySelectorAll('#jntBody .jnt-tr'),function(x){return x.innerText.replace(/\\s+/g,' ');})`);
    chk('«Quién le pasa a quién» con las tres', Array.isArray(tr) && tr.length === 3 && /Pedro Prueba → Maleu \$27\.000/.test(tr[0]), tr);

    console.log('\n-- sumar un gasto --');
    chk('sin elegir quién, el botón está apagado', (await ev(cli, `document.querySelector('#jntBody .jnt-addg .jnt-btn').disabled`)) === true);
    await ev(cli, `[].filter.call(document.querySelectorAll('#jntBody .jnt-addg .ofx-chip'),function(b){return b.textContent==='Pedro';})[0].click()`); await pausa(150);
    await ev(cli, `document.getElementById('jntGQue').value='Verduras';document.getElementById('jntGMonto').value='12.000';document.querySelector('#jntBody .jnt-addg .jnt-btn').click()`);
    await esperar(cli, `window.__rpc.some(function(x){return x.fn==='juntada_gasto_directo';})`, 5000); await pausa(400);
    const g = await ev(cli, `window.__rpc.filter(function(x){return x.fn==='juntada_gasto_directo';})[0]`);
    chk('manda `juntada_gasto_directo` {grp, Pedro, Verduras, 12000}', g && g.p.grp === 'Asado Prueba' && g.p.quien === 'Pedro Prueba' && g.p.que === 'Verduras' && g.p.monto === 12000, g);
    chk('y la pantalla se repinta con lo que contesta: Total $188.552', /\$188\.552/.test(await ev(cli, `document.querySelector('#jntBody .jnt-top').innerText`)));

    console.log('\n-- sumar gente --');
    await ev(cli, `document.getElementById('jntBuscar').value='Maria Del Crm';jntSumarPer()`);
    await esperar(cli, `window.__rpc.some(function(x){return x.fn==='juntada_integrante_directo';})`, 5000); await pausa(400);
    const m1 = await ev(cli, `window.__rpc.filter(function(x){return x.fn==='juntada_integrante_directo';})[0]`);
    chk('una del CRM va con su teléfono', m1 && m1.p.nombre === 'Maria Del Crm' && m1.p.tel === '1100000009' && m1.p.action === 'juntadaIntegrante', m1);
    await ev(cli, `document.getElementById('jntBuscar').value='Nuevo Invitado';jntSumarPer()`); await pausa(200);
    chk('uno que no está: pide el alta (teléfono, visita o casa)', (await ev(cli, `!!document.querySelector('#jntBody .jnt-nuevo')&&/Nuevo Invitado/.test(document.querySelector('#jntBody .jnt-nuevo').textContent)`)) === true);
    await ev(cli, `jntNuevoTipo('casa')`); await pausa(150);
    await ev(cli, `document.getElementById('jntNTel').value='11 5555-0001';document.getElementById('jntNBarrio').value='Golf';document.getElementById('jntNLote').value='74';jntNuevoOk()`);
    await esperar(cli, `window.__op.length>=2`, 6000); await pausa(300);
    const m2 = await ev(cli, `window.__rpc.filter(function(x){return x.fn==='juntada_integrante_directo';})[1]`);
    const ops = await ev(cli, 'window.__op');
    chk('se suma a la juntada con su teléfono', m2 && m2.p.nombre === 'Nuevo Invitado' && m2.p.tel === '1155550001', m2);
    chk('y queda en el CRM: ficha con barrio y lote, y «vive»', Array.isArray(ops) && ops.length === 2 && ops[0].action === 'crmUpdateClienteMeta' && ops[0].tel === '1155550001' && ops[0].nombreCanonico === 'Nuevo Invitado' && ops[0].barrioMapa === 'Golf' && ops[0].loteMapa === '74' && ops[1].action === 'crmSetResidencia' && ops[1].residencia === 'vive', ops);

    console.log('\n-- los mensajes --');
    await ev(cli, `jntCopiarGrupo()`); await pausa(200);
    const mg = await ev(cli, `document.getElementById('jntMsg').textContent`);
    chk('el del grupo: título, lo de Maleu, lo de afuera, total por persona y quién le pasa a quién', /^\*Asado Prueba\*/.test(mg) && /Maleu \(/.test(mg) && /Pan \(Juan\): \$8\.000/.test(mg) && !/[\u{1F300}-\u{1FAFF}]/u.test(mg) && /somos 5/.test(mg) && /Quién le pasa a quién:/.test(mg) && /alias \*maleump\*/.test(mg), mg);
    await ev(cli, `[].filter.call(document.querySelectorAll('#jntBody .jnt-copy'),function(b){return b.getAttribute('data-n')==='Pedro Prueba';})[0].click()`); await pausa(200);
    const mp = await ev(cli, `document.getElementById('jntMsg').textContent`);
    chk('el de Pedro: cuánto le toca, lo que puso y a quién le pasa', /^¡Hola Pedro!/.test(mp) && /te toca/.test(mp) && /Pusiste \$12\.000 \(Verduras\)/.test(mp) && /• A (Maleu|Anfitrion): \$/.test(mp), mp);

    console.log('\n-- pantalla --');
    const geo = await ev(cli, `(function(){var b=document.getElementById('jntBody');var o={chicos:[],afuera:b.scrollWidth>b.clientWidth+1};[].forEach.call(b.querySelectorAll('button,input'),function(x){var r=x.getBoundingClientRect();if(r.height&&r.height<36)o.chicos.push((x.textContent||x.placeholder).slice(0,18)+' '+Math.round(r.height));});return o;})()`);
    chk('nada se sale y los controles miden ≥ 36 px', geo && !geo.afuera && geo.chicos.length === 0, geo);
    if (process.env.SHOT) { const sh = await cli.enviar('Page.captureScreenshot', { format: 'png' }); require('fs').writeFileSync(process.env.SHOT, Buffer.from(sh.data, 'base64')); }
    const err = await ev(cli, 'window.__errs');
    chk('sin errores de JS', Array.isArray(err) && err.length === 0, err);
  } catch (e) { mal++; console.log('  MAL  la prueba se cortó: ' + (e && e.message || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  try { cli.matar(); } catch (e) {}
  process.exit(mal ? 1 : 0);
})();
