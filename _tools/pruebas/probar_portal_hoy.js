/* PORTAL NUEVO, PARTE 4 (5/10/2026): el objetivo de la semana en Hoy.

     node _tools/pruebas/probar_portal_hoy.js [puerto]      (default 8095)

   Mismo metodo que probar_portal_fase0.js: fetch falso ANTES del ERP, datos
   INVENTADOS (repo publico). Los POST los contesta el falso: ninguno sale.

   Sostiene:
   · sin objetivo, Hoy pregunta «¿cuántas ventas vas a hacer esta semana?»;
   · el formulario: + y − de 56 px, la plata como dato, sugeridas que se
     eligen de un toque, acciones escritas por el, y «Arrancar la semana»
     manda el POST con lo elegido;
   · con objetivo: «Llevás 2 de 6», «si llegás ganás», las entregas que trajo
     Maleu aparte y sin sumar, la barra del equipo sin nombres;
   · el toque de una accion manda su resultado, y si el backend lo rechaza
     vuelve atras;
   · los llamados sugeridos ya no se repiten en la tarjeta de tareas;
   · que abra con lo guardado: el objetivo esta en la copia;
   · todo lo que se toca mide 44 px, sin scroll horizontal, a 390 y a 1440.
*/
'use strict';
const { abrir, evaluar } = require('C:/Tadeo Ustariz/Trabajo/Grupo Matriz/Maleu/maleupedidos.github.io/_tools/pruebas/cdp.js');
const T = ms => new Promise(r => setTimeout(r, ms));
const PUERTO = Number(process.argv[2] || 8095);
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };

const Z = { facturado: 0, pedidos: 0, comision: 0, envio: 0, ganancia: 0 };
const OBJ_BASE = {
  sem: '2026-W41', lun: '2026-10-05', dom: '2026-10-11', meta: null, lleva: 2, pasadas: 1, ventas: [],
  acciones: [], porVenta: 15000, siLlega: null, equipo: { meta: 10, lleva: 3, conMeta: 2 },
  resultados: ['Compró', 'No contesta', 'No quiere', 'Reprogramó', 'Hecho'],
  sugeridas: [
    { tipo: 'reponer', clave: 'Cliente Repone', t: '1155550003', txt: 'Ofrecerle reponer a Cliente Repone', det: 'Barrio · te compra cada ~14 días' },
    { tipo: 'segunda', clave: 'Cliente Segunda', t: '-', txt: 'Volver a Cliente Segunda', det: 'compró una sola vez, hace 10 días' },
  ],
};
const DASH = (obj) => ({
  ok: true,
  stats: { semana: Object.assign({ n: 41, lun: '05/10', dom: '11/10' }, Z), mes: Object.assign({ nombre: 'Octubre', semanas: [] }, Z),
    mesesAnt: [], total: Object.assign({}, Z), comision: 0, ganancia: 0, viernes: { total: 0, entregados: 0, dias: [] }, pendCobrar: 0, pendLiquidar: 0 },
  pedidos: [], clientes: [], liqBySem: {}, cuentas: [], tg: { vinculado: true, link: '' },
  tareas: { modo: 'vender', semana: '2026-W41', resultados: ['Compró', 'No contesta'], lista: [
    { id: 'recompra', clase: 'blanda', titulo: 'Llamá a 1 cliente que no te compra hace rato', items: [{ c: 'Cliente Viejo', clave: 'Cliente Viejo', t: '1155550009', det: '' }] }] },
  objetivo: obj,
});

function prep(dash, opts) {
  opts = opts || {};
  const ses = { usuario: 'uno', rol: 'vendedor', nombre: 'Vendedor Uno', ts: Date.now(), tabs: ['miportal'] };
  const ls = { maleu_token: 'token-de-prueba', maleu_panel_session: JSON.stringify(ses), maleu_red_main_tab: 'hoy',
    maleu_red_session: JSON.stringify({ ok: true, nombre: 'Vendedor Uno', usuario: 'uno', wa: '' }),
    'maleu_red_dash_Vendedor Uno': JSON.stringify({ ts: Date.now() - 600000, data: dash }) };
  return `(function(){
    try{ if(!sessionStorage.getItem('__prep')){ localStorage.clear(); var L=${JSON.stringify(ls)}; for(var k in L) localStorage.setItem(k,L[k]); sessionStorage.setItem('__prep','1'); } }catch(e){}
    window.__err=[]; window.__posts=[]; window.__rechazar=false;
    window.addEventListener('error',function(e){window.__err.push(String(e.message));});
    window.confirm=function(){return true;}; window.alert=function(){};
    var DASH=${JSON.stringify(dash)}, DEMORA=${opts.demoraDash || 300};
    var orig=window.fetch.bind(window);
    function resp(o,ms){ return new Promise(function(r){ setTimeout(function(){ r(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||30); }); }
    window.fetch=function(u,x){
      var url=String(u&&u.url||u);
      if(url.indexOf('script.google.com/macros')<0) return orig(u,x);
      if(x&&String(x.method||'').toUpperCase()==='POST'){
        var b={}; try{ b=JSON.parse(x.body); }catch(e){}
        window.__posts.push(b);
        if(window.__rechazar) return resp({ok:false, err:'rechazado a proposito'}, 200);
        if(b.action==='redObjetivoSet') return resp({ok:true, meta:b.meta, acciones:(b.acciones||[]).map(function(a,i){ return Object.assign({id:'a'+i,res:'',fr:''},a); })}, 200);
        if(b.action==='redObjetivoAccion') return resp({ok:true, accion:{id:b.id,res:b.resultado,fr:'05/10/2026 10:00'}}, 200);
        return resp({ok:true});
      }
      var a=(url.match(/action=([A-Za-z]+)/)||[])[1]||'';
      if(a==='dashboardVendedor') return resp(DASH, DEMORA);
      if(a==='resolverVendedor') return resp({ok:true,nombre:'Vendedor Uno',usuario:'uno'}, 300);
      if(a==='miSesion') return resp({ok:true,usuario:'uno',rol:'vendedor',tabs:['miportal']});
      return resp({ok:true});
    };
  })();`;
}
const VISIBLE = sel => `(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; for(var n=e;n&&n!==document.body;n=n.parentElement){var cs=getComputedStyle(n); if(cs.display==='none'||cs.visibility==='hidden') return false;} return e.getBoundingClientRect().height>0;})()`;
let _prepId = null;
async function cargar(cli, src, esperar) {
  if (_prepId) await cli.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: _prepId });
  _prepId = (await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  await cli.enviar('Runtime.evaluate', { expression: 'try{sessionStorage.clear()}catch(e){}' }).catch(() => {});
  await cli.enviar('Page.navigate', { url: 'http://localhost:' + PUERTO + '/app.html' });
  for (let i = 0; i < 80; i++) { await T(150); try { if (await evaluar(cli, VISIBLE('#obj-card'))) break; } catch (e) {} }
  await T(esperar == null ? 900 : esperar);
}
const tocar = (cli, sel, i) => evaluar(cli, `(function(){var e=document.querySelectorAll(${JSON.stringify(sel)})[${i || 0}]; if(!e) return 'no existe';
  e.scrollIntoView({block:'center'}); var b=e.getBoundingClientRect(); var top=document.elementFromPoint(b.left+b.width/2, b.top+b.height/2);
  if(!top||!(e===top||e.contains(top))) return 'tapado por '+(top?(top.id||top.className||top.tagName):'nada');
  top.click(); return true;})()`);
const txt = cli => evaluar(cli, `(document.getElementById('obj-card').innerText||'').replace(/\\s+/g,' ')`);
const chicos = cli => evaluar(cli, `[].filter.call(document.querySelectorAll('#obj-card button, #obj-card a, #obj-card input'),function(b){var r=b.getBoundingClientRect(); return r.height>0 && (r.height<44 || r.width<44);}).map(function(b){return (b.innerText||b.placeholder||'').slice(0,20)+':'+Math.round(b.getBoundingClientRect().width)+'x'+Math.round(b.getBoundingClientRect().height);})`);

(async () => {
  const cli = await abrir();
  const salir = c => { try { cli.matar(); } catch (e) {} process.exit(c); };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

    console.log('\n== Lunes, sin objetivo ==');
    await cargar(cli, prep(DASH(Object.assign({}, OBJ_BASE)), { demoraDash: 8000 }), 400);
    let t = await txt(cli);
    chk('abre con lo guardado: la tarjeta aparece antes que el backend', /¿Cuántas ventas vas a hacer esta semana\?/.test(t), t);
    chk('dice lo que lleva y lo que le pasamos aparte', /Llevás 2 ventas/.test(t) && /Entregas que te pasamos: 1/.test(t) && /no suman/.test(t), t);
    chk('la tarjeta va antes que los vencidos, el nivel y las tareas', await evaluar(cli, `(function(){var o=document.getElementById('obj-card');
      return ['venc-card','escala-card','tareas-card'].every(function(id){ return !!(o.compareDocumentPosition(document.getElementById(id)) & Node.DOCUMENT_POSITION_FOLLOWING); });})()`));
    const tk = await evaluar(cli, `({vis:${VISIBLE('#tareas-card')}, txt:(document.getElementById('tareas-card').innerText||'')})`);
    chk('los llamados sugeridos no se repiten en la tarjeta de tareas', !/Cliente Viejo/.test(tk.txt), tk);

    await cargar(cli, prep(DASH(Object.assign({}, OBJ_BASE))));
    let r = await tocar(cli, '#obj-card .ob-btn');
    chk('«Poner mi objetivo» abre el formulario', r === true && /Arrancar la semana/.test(await txt(cli)), r);
    t = await txt(cli);
    chk('arranca en 5 y dice la plata como dato (5 × $15.000)', /\b5\b/.test(t) && /\$75\.000/.test(t), t);
    await tocar(cli, '#obj-card .ob-step', 1); await T(100);
    t = await txt(cli);
    chk('el + sube a 6 y la plata se recalcula', /\$90\.000/.test(t) && (await evaluar(cli, `document.querySelector('#obj-card .ob-num').textContent`)) === '6', t);
    chk('las sugeridas dicen por qué (le toca reponer, segunda compra)', /Le toca reponer/.test(t) && /Segunda compra/.test(t), t);
    r = await tocar(cli, '#obj-card .ob-sug', 0); await T(100);
    chk('una sugerida se elige de un toque', r === true && (await evaluar(cli, `document.querySelectorAll('#obj-card .ob-sug.on').length`)) === 1, r);
    await evaluar(cli, `document.getElementById('ob-libre-in').value='Degustación en el club'; 1`);
    r = await tocar(cli, '#obj-card .ob-add button'); await T(100);
    chk('escribe su propia acción', r === true && /Degustación en el club/.test(await txt(cli)), r);
    let ch = await chicos(cli);
    chk('todo lo que se toca en el formulario mide 44 px', ch.length === 0, ch);
    chk('sin scroll horizontal a 390', (await evaluar(cli, 'document.documentElement.scrollWidth')) <= 390);

    await evaluar(cli, 'window.__posts=[]; 1');
    r = await tocar(cli, '#ob-guardar'); await T(700);
    const posts = await evaluar(cli, 'window.__posts');
    const ps = posts.find(p => p.action === 'redObjetivoSet');
    chk('«Arrancar la semana» manda la meta y las dos acciones', !!ps && ps.meta === 6 && ps.acciones.length === 2
      && ps.acciones[0].tipo === 'reponer' && ps.acciones[0].clave === 'Cliente Repone' && ps.acciones[1].tipo === 'libre', posts);
    t = await txt(cli);
    chk('queda «Llevás 2 de 6 ventas» con la barra', /Llevás 2 de 6 ventas/.test(t) && (await evaluar(cli, VISIBLE('#obj-card .ob-bar-fill'))), t);
    chk('«Si llegás, ganás unos $90.000»', /Si llegás, ganás unos \$90\.000/.test(t), t);
    chk('el equipo sumado, sin nombres (3 de 10)', /El equipo: 3 de 10 ventas/.test(t) && !/Vendedor/.test(t), t);
    /* Se mide en la pantalla: lastDashboardData vive adentro de la sub-app
       fusionada y desde afuera no se ve. */
    await tocar(cli, '#obj-card .ob-btn.ghost'); await T(150);
    const rep = await evaluar(cli, `[].map.call(document.querySelectorAll('#obj-card .ob-sug'),function(b){return {t:b.innerText.replace(/\\s+/g,' '), on:b.classList.contains('on')};}).filter(function(x){return /Cliente Repone/.test(x.t);})`);
    chk('al reabrir, la elegida aparece UNA vez y marcada (no repetida como sugerida)', rep.length === 1 && rep[0].on === true, rep);
    await tocar(cli, '#obj-card .ob-form-btns .ob-btn.ghost'); await T(150);
    const copia = await evaluar(cli, `(JSON.parse(localStorage.getItem('maleu_red_dash_Vendedor Uno'))||{data:{}}).data.objetivo`);
    chk('lo guardado ya trae el objetivo (abre con lo guardado)', copia && copia.meta === 6 && copia.acciones.length === 2, copia);

    console.log('\n== El toque de una acción ==');
    const nBtn = await evaluar(cli, `document.querySelectorAll('#obj-card .ob-acc')[1].querySelectorAll('.ob-res button').length`);
    chk('la acción escrita por él solo tiene «Hecho»', nBtn === 1, nBtn);
    ch = await chicos(cli);
    chk('todo lo que se toca mide 44 px (resultados, 📞)', ch.length === 0, ch);
    await evaluar(cli, 'window.__posts=[]; 1');
    r = await tocar(cli, '#obj-card .ob-acc .ob-res button', 0); await T(500);
    const pa = (await evaluar(cli, 'window.__posts')).find(p => p.action === 'redObjetivoAccion');
    t = await txt(cli);
    chk('manda el resultado y la muestra hecha', r === true && !!pa && pa.resultado === 'Compró' && /✓ Compró/.test(t) && /Tus acciones 1 de 2/.test(t), { pa, t });
    await evaluar(cli, 'window.__rechazar=true; 1');
    r = await tocar(cli, '#obj-card .ob-acc .ob-res button', 0); await T(600);
    t = await txt(cli);
    chk('si el backend lo rechaza, vuelve atrás', !/✓ Hecho/.test(t) && /Tus acciones 1 de 2/.test(t), t);
    await evaluar(cli, 'window.__rechazar=false; 1');
    chk('sin errores de JS', (await evaluar(cli, 'window.__err')).length === 0, await evaluar(cli, 'window.__err'));

    console.log('\n== Llegó al objetivo ==');
    await cargar(cli, prep(DASH(Object.assign({}, OBJ_BASE, { meta: 2, lleva: 3, pasadas: 0, acciones: [] }))));
    t = await txt(cli);
    chk('festeja y dice lo que gana con lo que lleva (3 × $15.000)', /¡Llegaste!/.test(t) && /Llevás 3 de 2 ventas/.test(t) && /\$45\.000/.test(t), t);
    chk('sin entregas pasadas, no muestra la línea', !/Entregas que te pasamos/.test(t), t);

    console.log('\n== 1440 px ==');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cargar(cli, prep(DASH(Object.assign({}, OBJ_BASE))));
    r = await tocar(cli, '#obj-card .ob-btn');
    chk('a 1440 se abre el formulario y nada lo tapa', r === true, r);
    chk('sin scroll horizontal a 1440', (await evaluar(cli, 'document.documentElement.scrollWidth')) <= 1440);
    if (process.env.CAPTURA) {
      const img = await cli.enviar('Page.captureScreenshot', { format: 'png' });
      require('fs').writeFileSync(require('path').join(process.env.CAPTURA, 'portal-hoy-1440.png'), Buffer.from(img.data, 'base64'));
      await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      for (const [nom, obj] of [['form', null], ['semana', Object.assign({}, OBJ_BASE, { meta: 6, acciones: [
        { id: 'a0', tipo: 'reponer', clave: 'Cliente Repone', t: '1155550003', txt: 'Ofrecerle reponer a Cliente Repone', res: 'Compró', fr: '' },
        { id: 'a1', tipo: 'segunda', clave: 'Cliente Segunda', t: '1155550004', txt: 'Volver a Cliente Segunda', res: '', fr: '' },
        { id: 'a2', tipo: 'libre', clave: 'Degustación', txt: 'Degustación en el club', res: '', fr: '' }] })]]) {
        await cargar(cli, prep(DASH(obj || Object.assign({}, OBJ_BASE))));
        if (!obj) { await tocar(cli, '#obj-card .ob-btn'); await tocar(cli, '#obj-card .ob-sug', 0); await T(200); }
        await evaluar(cli, `window.scrollTo(0,0); 1`); await T(200);
        const img = await cli.enviar('Page.captureScreenshot', { format: 'png' });
        require('fs').writeFileSync(require('path').join(process.env.CAPTURA, 'portal-hoy-' + nom + '.png'), Buffer.from(img.data, 'base64'));
      }
    }
  } catch (e) { mal++; console.log('  MAL  excepcion: ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  salir(mal ? 1 : 0);
})();
