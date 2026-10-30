/* EL AUTOPEDIDO DE RUTA: «CARGADO» AL INSTANTE Y REGISTRADO ATRÁS (30/10/2026).
     node _tools/pruebas/probar_autopedido_cola.js [base]      (default http://localhost:8163)
   Ruta suelta (?standalone=1) con un servidor SIMULADO: ningún pedido sale de la máquina. Sostiene:
   · con el servidor tardando 4 s, GUARDAR dice «✓ Pedido cargado» en < 300 ms, el formulario queda vacío y libre;
   · el aviso «Registrando…» mientras viaja; cuando contesta, el cartel dice el número y la Orden de Compra, y sale
     de la cola;
   · un corte de red: pregunta si entró y, si entró, no lo vuelve a mandar;
   · tres errores del servidor: queda en rojo con «Volver a cargarlo», que repone cliente, zona y productos;
   · la cola sobrevive a recargar la app y se retoma con el MISMO id.
   Reemplaza a probar_autopedido_loader.js y probar_autopedido_reloj.js (medían el loader que ya no existe). */
'use strict';
const { abrir, evaluar } = require('./cdp');
const BASE = process.argv[2] || process.env.BASE || 'http://localhost:8163';
const T = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, mal = 0;
const chk = (n, c, d) => { if (c === true) { ok++; console.log('  ok   ' + n); } else { mal++; console.log('  MAL  ' + n + (d !== undefined ? '\n         ' + JSON.stringify(d).slice(0, 400) : '')); } };
const STUB = `(function(){
  if(!sessionStorage.getItem('__prep')){ try{ localStorage.clear(); }catch(e){} sessionStorage.setItem('__prep','1'); }
  window.__posts=[]; window.__resp=[]; window.__delay=30; window.__entro=false; window.__gets=[];
  window.confirm=function(){return true;}; window.alert=function(){};
  function resp(o,ms){ return new Promise(function(r){ setTimeout(function(){ r(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}})); }, ms||30); }); }
  window.fetch=function(u,x){
    var url=String(u&&u.url||u);
    if(x&&String(x.method||'').toUpperCase()==='POST'){ var b={}; try{b=JSON.parse(x.body)}catch(e){}
      if(!b.action){ window.__posts.push(b); var r=window.__resp.length?window.__resp.shift():{ok:true,n:9999,ref:'Home #9999',oc:'creada'};
        if(r==='red') return Promise.reject(new TypeError('Failed to fetch'));
        return resp(r, window.__delay); }
      return resp({ok:true}); }
    var a=(url.match(/action=([A-Za-z]+)/)||[])[1]||''; window.__gets.push(a);
    if(a==='pedidoEntro') return resp({ok:true,entro:window.__entro,ref:'Home #9998'});
    return resp({});
  };
})();`;
const ARMAR = (nombre) => `(function(){npSetZona('Home');npSetPago('Efectivo');npCart={1:1};NP_PRECIOS.PPM={p:17000};
  npFechaSel=new Date(Date.now()+86400000).toISOString().slice(0,10);
  document.getElementById('npNombre').value=${JSON.stringify(nombre)};document.getElementById('npSubBarrio').value='Prueba';document.getElementById('npLote').value='7';
  return true;})()`;
const cola = `JSON.parse(localStorage.getItem('maleu_np_cola')||'[]')`;

(async () => {
  const c = await abrir();
  try {
    await c.enviar('Page.enable');
    c.escuchar((m) => { if (m === 'Page.javascriptDialogOpening') c.enviar('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
    await c.enviar('Page.addScriptToEvaluateOnNewDocument', { source: STUB + 'NP_ENTRO_MS=600;NP_ENTRO_CADA=200;' });
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    const cargar = async () => {
      await c.enviar('Page.navigate', { url: BASE + '/ruta.html?standalone=1' });
      for (let i = 0; i < 100; i++) { if (await evaluar(c, "typeof npGuardar==='function'&&typeof _npColaProcesar==='function'")) break; await T(100); }
      await T(1800);
      await evaluar(c, `NP_ENTRO_MS=600;NP_ENTRO_CADA=200;1`);
    };
    await cargar();

    /* 1. Cargado al instante con el servidor tardando 4 s */
    await evaluar(c, ARMAR('Cliente Uno'));
    await evaluar(c, `window.__delay=4000;1`);
    const t0 = Date.now();
    await evaluar(c, `npGuardar();1`);
    let tCargado = null;
    for (let i = 0; i < 40; i++) { if (await evaluar(c, `/Pedido cargado/.test((document.getElementById('npSuccess')||{}).innerText||'')`)) { tCargado = Date.now() - t0; break; } await T(15); }
    const e1 = await evaluar(c, `({cola:${cola}.length, cart:Object.keys(npCart).length, nombre:document.getElementById('npNombre').value, aviso:(document.getElementById('npColaBox')||{}).innerText||'', estado:(document.getElementById('npOkEstado')||{}).innerText||'', saving:npSaving, inert:!!(document.getElementById('nuevoView')||{}).inert})`);
    console.log('     tocar → «cargado»: ' + tCargado + ' ms (servidor simulado: 4000 ms)');
    chk('con el servidor tardando 4 s, «✓ Pedido cargado» en menos de 300 ms', tCargado !== null && tCargado < 300, tCargado);
    chk('  ...el formulario queda vacío y libre para el siguiente', e1.cart === 0 && e1.nombre === '' && e1.saving === false && e1.inert === false, e1);
    chk('  ...«Registrando el pedido de Cliente Uno» mientras viaja', e1.cola === 1 && /Registrando el pedido de Cliente Uno/.test(e1.aviso) && /Registrándolo/.test(e1.estado), e1);
    await T(4600);
    const e2 = await evaluar(c, `({cola:${cola}.length, ok:(document.getElementById('npSuccess')||{}).innerText||'', oculto:document.getElementById('npColaBox').hidden, n:window.__posts.length})`);
    chk('cuando contesta: el cartel dice el número y la Orden de Compra, y sale de la cola', e2.cola === 0 && e2.oculto === true && /Registrado como Home #9999/.test(e2.ok) && /Orden de Compra/.test(e2.ok) && e2.n === 1, e2);

    /* 2. Corte de red: pregunta si entró; si entró, no se reenvía */
    await evaluar(c, `npListo&&clearTimeout(_npSaltoT);window.__posts=[];window.__delay=30;window.__resp=['red'];window.__entro=true;1`);
    await evaluar(c, ARMAR('Cliente Dos')); await evaluar(c, `npGuardar();1`);
    await T(2500);
    const e3 = await evaluar(c, `({cola:${cola}.length, posts:window.__posts.length, entro:window.__gets.filter(function(a){return a==='pedidoEntro'}).length})`);
    chk('un corte de red: pregunta si entró y, como entró, no lo manda de nuevo', e3.cola === 0 && e3.posts === 1 && e3.entro >= 1, e3);

    /* 2b. (de probar_autopedido_duplicado) Se corta y NO entró: lo vuelve a mandar con el MISMO id hasta que entra */
    await evaluar(c, `window.__posts=[];window.__resp=['red','red'];window.__entro=false;1`);
    await evaluar(c, ARMAR('Cliente Corte')); await evaluar(c, `npGuardar();1`);
    for (let i = 0; i < 60; i++) { await T(250); if (await evaluar(c, `${cola}.length===0`)) break; }
    const e3b = await evaluar(c, `({cola:${cola}.length, ids:window.__posts.map(function(p){return p.clientOrderId})})`);
    chk('se corta y no entró: lo reenvía con el MISMO id hasta que entra (3 envíos, 1 id)', e3b.cola === 0 && e3b.ids.length === 3 && new Set(e3b.ids).size === 1, e3b);

    /* 2c. (de probar_autopedido_duplicado) Después de uno CONFIRMADO, el mismo pedido es otro pedido: id nuevo */
    await evaluar(c, `window.__posts=[];1`);
    await evaluar(c, ARMAR('Cliente Corte')); await evaluar(c, `npGuardar();1`); await T(600);
    const e3c = await evaluar(c, `window.__posts.map(function(p){return p.clientOrderId})`);
    chk('después de uno confirmado, el mismo pedido otra vez lleva id NUEVO (no se tira como repetido)', e3c.length === 1 && e3c[0] !== e3b.ids[0], { antes: e3b.ids[0], ahora: e3c });

    /* 2d. El mismo pedido cargado mientras el primero sigue en la cola: es otro pedido, id nuevo */
    await evaluar(c, `window.__posts=[];window.__delay=1500;1`);
    await evaluar(c, ARMAR('Cliente Doble')); await evaluar(c, `npGuardar();1`); await T(100);
    await evaluar(c, ARMAR('Cliente Doble')); await evaluar(c, `npGuardar();1`);
    for (let i = 0; i < 40; i++) { await T(250); if (await evaluar(c, `${cola}.length===0`)) break; }
    const e3d = await evaluar(c, `window.__posts.map(function(p){return p.clientOrderId})`);
    chk('el mismo pedido cargado dos veces seguidas (el primero en la cola): dos ids distintos', e3d.length === 2 && e3d[0] !== e3d[1], e3d);
    await evaluar(c, `window.__delay=30;1`);

    /* 3. Tres errores del servidor: rojo con «Volver a cargarlo» */
    await evaluar(c, `window.__posts=[];window.__entro=false;window.__resp=[{ok:false,error:'Lock timeout'},{ok:false,error:'Lock timeout'},{ok:false,error:'Lock timeout'}];1`);
    await evaluar(c, ARMAR('Cliente Tres')); await evaluar(c, `npGuardar();1`);
    for (let i = 0; i < 60; i++) { await T(250); if (await evaluar(c, `${cola}.some(function(x){return x.est==='error'})`)) break; }
    const e4 = await evaluar(c, `({cola:${cola}, aviso:(document.getElementById('npColaBox')||{}).innerText||'', posts:window.__posts.map(function(p){return p.clientOrderId})})`);
    chk('tres errores del servidor: queda en rojo con «Volver a cargarlo», siempre con el mismo id', e4.cola.length === 1 && e4.cola[0].est === 'error' && /Volver a cargarlo/.test(e4.aviso) && e4.posts.length === 3 && new Set(e4.posts).size === 1, e4);
    await evaluar(c, `npColaRecargar(${JSON.stringify((e4.cola[0] || {}).coid || '')});1`); await T(400);
    const e5 = await evaluar(c, `({cola:${cola}.length, nombre:document.getElementById('npNombre').value, lote:document.getElementById('npLote').value, zona:npZona, cart:JSON.stringify(npCart)})`);
    chk('«Volver a cargarlo» repone cliente, zona, lote y productos', e5.cola === 0 && e5.nombre === 'Cliente Tres' && e5.lote === '7' && e5.zona === 'Home' && e5.cart === '{"1":1}', e5);

    /* 4. Cerrar la app con un pedido viajando: se retoma con el MISMO id */
    await evaluar(c, `npReset();window.__delay=600000;1`);
    await evaluar(c, ARMAR('Cliente Cuatro')); await evaluar(c, `npGuardar();1`); await T(300);
    const coid = await evaluar(c, `(${cola}[0]||{}).coid||''`);
    await c.enviar('Page.reload');
    for (let i = 0; i < 100; i++) { await T(100); try { if (await evaluar(c, "typeof _npColaProcesar==='function'")) break; } catch (e) {} }
    await T(2600);
    const e6 = await evaluar(c, `({cola:${cola}.length, posts:window.__posts.map(function(p){return p.clientOrderId})})`);
    chk('al volver a abrir, retoma el pedido pendiente con el mismo id y lo registra', !!coid && e6.posts.length === 1 && e6.posts[0] === coid && e6.cola === 0, { coid, e6 });
  } finally { c.matar(); }
  console.log('\n' + ok + ' ok · ' + mal + ' mal');
  process.exitCode = mal ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; });
