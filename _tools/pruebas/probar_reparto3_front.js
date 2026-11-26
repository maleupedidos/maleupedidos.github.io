/* EL REPARTO EN 3 EN EL FRONT, CON LA SESIÓN REAL (26/11/2026, 863-868).

   SBSES=<sesión> QUIEN=lou|tadeo ANCHO=390|1440 SIM=<archivo.json> node _tools/pruebas/probar_reparto3_front.js [base] [carpeta]

   La sesión es de solo lectura (sbses_guarda.js): ninguna escritura sale, se anota en __bloqueados.
   SIM = {conseguidos:[...], ficha:{...}, casas:{...}}: las respuestas de `red_conseguidos_pantalla`,
   `conocio_ficha_pantalla` y `casas_origen_pantalla` sacadas de la base en seco (con un pedido del robot que
   después se deshace). Lo demás es la base real.
   · lou (representante, 390): la tarjeta «Clientes que conseguiste» con los dos montos y el corte, «Lo entrego yo»
     (con un toque: tiene que salir el POST red_que_lo_entregue_directo, y la guarda lo corta) y «cliente de X» en Hoy.
   · tadeo (admin, 1440 o 390): la ficha de un pedido con «Lo eligió el cliente» y «Cambiar quién lo consiguió» (abre el
     selector), y Tendencia › «Casas nuevas por origen» (con filas y vacía). */
'use strict';
const fs = require('fs'), path = require('path');
const { abrir, evaluar } = require('./cdp.js');
const sbses = require('./sbses_guarda.js');
const prep = require('./sesion_prep.js');
const BASE = process.argv[2] || 'http://localhost:8157';
const OUT = process.argv[3] || '';
const QUIEN = process.env.QUIEN || 'lou', W = Number(process.env.ANCHO || (QUIEN !== 'tadeo' ? 390 : 1440)), H = W > 800 ? 900 : 844;
const SIM = JSON.parse(fs.readFileSync(process.env.SIM, 'utf8'));
const pausa = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const lou = QUIEN !== 'tadeo';   // cualquier representante: QUIEN=<usuario> NOMBRE="<Nombre>"
  const usu = QUIEN, nombre = lou ? (process.env.NOMBRE || 'Lourdes Thomas') : 'Tadeo';
  if (lou) process.env.PREP_SESION = JSON.stringify({ usuario: usu, rol: 'vendedor', nombre, ts: Date.now(), tabs: ['miportal'] });
  const red = JSON.stringify({ ok: true, nombre, usuario: usu, wa: '', aliasMp: '', comision: 17, barrios: [], partido: '', localidad: '' });
  const sim = `;(function(){var S=${JSON.stringify(JSON.stringify(SIM))};S=JSON.parse(S);var f=window.fetch;window.__simLlamadas=[];
    window.fetch=function(u,x){var s=String(u&&u.url||u),r=/\\/rpc\\/(red_conseguidos_pantalla|conocio_ficha_pantalla|casas_origen_pantalla)$/.exec(s);
      if(r){window.__simLlamadas.push(r[1]);var d;
        if(r[1]==='red_conseguidos_pantalla')d={ok:true,yo:${JSON.stringify(nombre)},ahora:new Date().toISOString(),conseguidos:S.conseguidos||[],deOtros:window.__DEOTROS||[]};
        else if(r[1]==='conocio_ficha_pantalla'){var k=(JSON.parse(String(x&&x.body||'{}')).p||{}).key;d=Object.assign({},S.ficha,{key:k});}
        else d=window.__CASAS_VACIO?{ok:true,filas:[]}:S.casas;
        return Promise.resolve(new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}));}
      return f.apply(this,arguments);};})();`;
  const cli = await abrir(); const ev = e => evaluar(cli, e);
  const out = {};
  const foto = async (n) => {
    if (!OUT) return; fs.mkdirSync(OUT, { recursive: true });
    const a = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, QUIEN + '-' + W + '-' + n + '.png'), Buffer.from(a.data, 'base64'));
  };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W > 800 ? 1 : 2, mobile: W <= 800 });
    if (W <= 800) await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: prep('prueba') + sbses(process.env.SBSES, usu) + sim
      + (lou ? `;try{localStorage.setItem('maleu_red_session',${JSON.stringify(red)});}catch(e){}` : '')
      + ';window.confirm=function(){return false;};window.alert=function(){};window.prompt=function(){return null;};' });
    await cli.enviar('Page.navigate', { url: BASE + '/app.html' });
    for (let i = 0; i < 150; i++) { try { if (await ev(`typeof go==='function'&&typeof SESSION!=='undefined'&&!!SESSION`)) break; } catch (e) {} await pausa(200); }
    await pausa(3000);
    if (lou) {
      try { await ev(`go('miportal'); 1`); } catch (e) {}
      for (let i = 0; i < 120; i++) { try { if (await ev(`!!document.querySelector('#pg-miportal #mview-inicio')&&(document.querySelector('#pg-miportal #mview-inicio').innerText||'').length>80`)) break; } catch (e) {} await pausa(500); }
      await pausa(3000);
      try { await ev(`setMainTab('hoy'); window.scrollTo(0,0); 1`); } catch (e) {}
      await pausa(2500);
      // «cliente de X»: un pedido real de Hoy pasa a ser de un cliente de Rufino
      const nHoy = await ev(`(function(){var b=document.querySelector('#pg-miportal .hy-q[onclick]');var m=b&&/redIrAPedido\\('([^']*)'/.exec(b.getAttribute('onclick'));return m?m[1]:'';})()`);
      out.hoy_pedido = nHoy || '(Lou no tiene filas en Hoy)';
      if (nHoy) await ev(`window.__DEOTROS=[{n:${JSON.stringify(nHoy)},cons:'Rufino Ardanaz'}]; 1`);
      await ev(`(typeof renderConseguidos==='function'&&renderConseguidos(), 1)`);
      await pausa(2500);
      out.tarjeta = await ev(`(function(){var c=document.querySelector('#pg-miportal #cons-card');if(!c)return 'NO EXISTE #cons-card';
        var r=c.getBoundingClientRect();return {visible:!c.classList.contains('hidden')&&r.height>0, alto:Math.round(r.height), ancho:Math.round(r.width),
          texto:c.innerText.replace(/\\s+/g,' ').trim(), botones:[].map.call(c.querySelectorAll('button'),function(b){return b.textContent.trim();})};})()`);
      out.cliente_de = await ev(`[].map.call(document.querySelectorAll('#pg-miportal .hy-s'),function(s){return s.textContent;}).filter(function(t){return /cliente de/.test(t);})`);
      out.desborde = await ev(`document.documentElement.scrollWidth > window.innerWidth + 1`);
      await ev(`(function(){var c=document.querySelector('#pg-miportal #cons-card');if(c)c.scrollIntoView({block:'start'});return 1;})()`);
      await pausa(500); await foto('tarjeta');
      // Toque real en «Lo entrego yo»
      const r = await ev(`(function(){var b=[].filter.call(document.querySelectorAll('#pg-miportal #cons-card button'),function(x){return /Lo entrego yo/.test(x.textContent);})[0];
        if(!b)return null;b.scrollIntoView({block:'center'});var q=b.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};})()`);
      if (r) {
        const antes = await ev('(window.__bloqueados||[]).length');
        await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
        await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await pausa(2000);
        out.toque_lo_entrego_yo = { post: (await ev('window.__bloqueados||[]')).slice(antes).filter(x => /red_que_lo_entregue_directo/.test(x)),
          boton: await ev(`(function(){var b=document.querySelector('#pg-miportal #cons-card button[data-v]');return b?b.textContent.trim():'';})()`),
          aviso: await ev(`(document.getElementById('redToastBox')||{}).innerText||''`) };
      } else out.toque_lo_entrego_yo = 'NO HAY BOTÓN';
    } else {
      // La ficha de un pedido Red real, con la respuesta de la ficha simulada
      const ab = await ev(`(function(){try{go('pedidos');}catch(e){}return 1;})()`);
      await pausa(6000);
      const k = await ev(`(function(){var d=window.D||{};var l=(d.pedidos||d.pedidosLight||[]);var p=l.filter(function(x){return (x.h||x.canal)==='Red';})[0];return p?[(p.h||p.canal),String(p.n)]:null;})()`);
      out.pedido = k;
      const fn = await ev(`['openOrdDetail'].filter(function(n){return typeof window[n]==='function';})`);
      out.abridores = fn;
      if (k && fn.length) {
        await ev(`(function(){try{${fn[0]}(${JSON.stringify(k[0])},${JSON.stringify(k[1])});}catch(e){window.__errAbrir=String(e);}return 1;})()`);
        await pausa(3500);
        out.ficha = await ev(`(function(){var e=document.getElementById('ordConocio');if(!e)return 'NO EXISTE #ordConocio'+(window.__errAbrir?' '+window.__errAbrir:'');var r=e.getBoundingClientRect();
          return {visible:!e.hidden&&r.height>0, texto:e.innerText.replace(/\\s+/g,' ').trim(), boton:!!e.querySelector('button')};})()`);
        await ev(`(function(){var e=document.getElementById('ordConocio');if(e)e.scrollIntoView({block:'center'});return 1;})()`);
        await pausa(400); await foto('ficha');
        await ev(`(function(){var b=document.querySelector('#ordConocio button');if(b)b.click();return 1;})()`);
        await pausa(800);
        out.cambiar = await ev(`(function(){var o=document.getElementById('consOv');if(!o)return 'no abrió';var s=document.getElementById('consSel');
          return {abrio:true, opciones:s?[].map.call(s.options,function(x){return x.text;}):[], elegido:s?s.value:''};})()`);
        await foto('cambiar');
        await ev(`(function(){var o=document.getElementById('consOv');if(o)o.remove();return 1;})()`);
      }
      // Tendencia › Casas nuevas por origen
      await ev(`(function(){try{go('ventas');}catch(e){}return 1;})()`); await pausa(2500);
      const tend = await ev(`(function(){if(typeof vSwitchTab!=='function')return false;vSwitchTab('tendencia');return true;})()`);
      await pausa(4000);
      out.tendencia_boton = tend;
      out.casas = await ev(`(function(){var e=document.getElementById('vtOrigen');if(!e)return 'NO EXISTE #vtOrigen';var r=e.getBoundingClientRect();
        return {visible:!e.hidden&&r.height>0, ancho:Math.round(r.width), texto:e.innerText.replace(/\\s+/g,' ').trim().slice(0,400)};})()`);
      await ev(`(function(){var e=document.getElementById('vtOrigen');if(e)e.scrollIntoView({block:'center'});return 1;})()`);
      await pausa(400); await foto('casas');
      await ev(`window.__CASAS_VACIO=1; _vtOrigenTs=0; (typeof _vtOrigenPintar==='function'&&_vtOrigenPintar()); 1`);
      await pausa(1500);
      out.casas_vacio = await ev(`(document.getElementById('vtOrigen')||{}).innerText||''`);
      out.desborde = await ev(`document.documentElement.scrollWidth > window.innerWidth + 1`);
    }
    out.sim = await ev('window.__simLlamadas||[]');
    out.bloqueados = await ev('(window.__bloqueados||[]).length');
    out.errores = await ev('(window.__err||[]).slice(0,5)');
    console.log(JSON.stringify(out, null, 1));
  } finally { cli.matar ? cli.matar() : cli.cerrar(); }
})().catch(e => { console.error(e); process.exit(1); });
