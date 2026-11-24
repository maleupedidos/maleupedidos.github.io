/* MI PORTAL DE PUNTA A PUNTA, COMO EL REPRESENTANTE (24/11/2026, encargo de Tadeo por el Organizador).

   Lo que un representante tiene que poder hacer, cada cosa a 2 toques como mucho desde Hoy, con TOQUES REALES
   (Input.dispatchTouchEvent en el centro del botón, después de comprobar que nada lo tapa) en un celular de 393 px:
     1. ver qué tiene que entregar y marcarlo «Entregado»;
     2. «Me pagó en efectivo» (el cuadro de la 663) y «Me dijo que transfirió» (839), y que Maleu lo vea en Cobranza en
        menos de 2 s (se mide: desde el toque de Guardar hasta que el texto aparece en la Cobranza del robot admin);
     3. ver el efectivo que tiene de Maleu (y que Cobranza le pregunte a Maleu si lo recibió: NO se recibe de verdad,
        entraría a la billetera real de una persona; el «Recibí» lo prueba en seco «plata de Red en la base»);
     4. ver su liquidación;  5. abrir la carga de un pedido;  6. abrir la ficha de un cliente;  7. a quién escribirle.
   Usa el representante «PRUEBA Robot» (usuario y PIN del robot) y su autopedido PRUEBA; lo marcado se deshace al final
   y el pedido lo borra robot_limpiar. El navegador del representante va en MODO ENSAYO, como el del robot.
     const portalRep = require('./portal_rep.js');
     const r = await portalRep({ cdp, url, usuario, pin, admin: { ev, esperar }, n });   // → { ok, detalle, metricas, hechos } */
'use strict';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function portalRep(o) {
  const hechos = [], malos = [], met = {};
  const cli = await o.cdp.abrir();
  const ev = (e, ms) => Promise.race([o.cdp.evaluar(cli, e), new Promise((_, no) => setTimeout(() => no(new Error('el portal no contestó')), ms || 20000))]);
  const esperar = async (e, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await ev(e, 8000); if (v) return v; } catch (x) {} await pausa(150); } return null; };
  const A = o.admin;
  /* Un toque de verdad sobre el elemento que devuelve `sel` (expresión JS). Falla si no está o si algo lo tapa. */
  const tocar = async (sel, que) => {
    const r = await ev(`(function(){ var e=${sel}; if(!e)return null; e.scrollIntoView({block:'center'});
      var b=e.getBoundingClientRect(), x=b.left+b.width/2, y=b.top+b.height/2, h=document.elementFromPoint(x,y);
      return {x:x, y:y, alto:Math.round(b.height), ok:!!h&&(h===e||e.contains(h)), h:h?String(h.className||h.tagName).slice(0,40):''}; })()`);
    if (!r) throw new Error(que + ': no está en pantalla');
    if (!r.ok) throw new Error(que + ': lo tapa «' + r.h + '»');
    if (r.alto < 40) malos.push(que + ': mide ' + r.alto + ' px de alto (menos de 44)');
    await cli.enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y, radiusX: 2, radiusY: 2, force: 1, id: 1 }] });
    await pausa(40);
    await cli.enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pausa(250);
  };
  const filaDe = (cont, txt) => `[].slice.call(document.querySelectorAll('#pg-miportal ${cont}')).filter(function(f){ return (f.innerText||'').indexOf(${JSON.stringify(txt)})>=0; })[0]`;
  let N = String(o.n || '');
  const MARCADO = { ef: false, tr: false };
  /* La fila de cobro del pedido N (Hoy y la ficha la marcan con data-n). */
  const enFila = (cont, btn) => `(function(){ var f=document.querySelector('#pg-miportal ${cont}[data-n="${N}"]'); return f&&f.querySelector(${JSON.stringify(btn)}); })()`;
  /* La Cobranza del robot (admin): cuánto tarda en aparecer (o irse) un texto. */
  const cobranza = async (expr, tope) => { const t0 = Date.now(); const ok = await A.esperar(expr, tope || 6000); return ok ? Date.now() - t0 : null; };
  const enCob = (txt) => `(function(){ var c=document.getElementById('cobrosContent'); return !!c&&(c.innerText||'').indexOf(${JSON.stringify(txt)})>=0; })()`;
  const paso = async (nombre, fn) => { try { const d = await fn(); hechos.push(nombre + (d ? ' (' + d + ')' : '')); } catch (e) { malos.push(nombre + ': ' + e.message); } };
  try {
    await cli.enviar('Page.enable'); await cli.enviar('Runtime.enable');
    await cli.enviar('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 2, mobile: true });
    await cli.enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `;try{localStorage.setItem('maleu_ensayo','1');}catch(e){};window.confirm=function(){return true;};` });
    await cli.enviar('Page.navigate', { url: o.url });
    if (!(await esperar(`typeof panelDoLogin==='function'&&!!document.getElementById('loginUser')`, 60000))) throw new Error('no apareció el login');
    await ev(`document.getElementById('loginUser').value=${JSON.stringify(o.usuario)}; document.getElementById('loginPin').value=${JSON.stringify(o.pin)}; panelDoLogin(); 1`);
    if (!(await esperar(`typeof SESSION!=='undefined'&&!!SESSION&&SESSION.rol==='vendedor'&&typeof go==='function'`, 30000))) throw new Error('el representante no pudo entrar');
    await ev(`go('miportal'); 1`);
    if (!(await esperar(`typeof setMainTab==='function'&&typeof renderCobHoy==='function'&&!!document.querySelector('#pg-miportal #ent-card:not(.hidden)')`, 45000))) throw new Error('Mi Portal no pintó Hoy');
    hechos.push('entró como ' + o.usuario + ' a 393 px');
    await A.ev(`go('cobranza'); 1`);

    await paso('1 entregar', async () => {
      await ev(`setMainTab('hoy'); 1`);
      /* Un pedido PRUEBA del representante para entregar (el autopedido o el del pase): el número sale de su botón. */
      const BT = `(function(){ return [].slice.call(document.querySelectorAll('#pg-miportal .hy-fila')).filter(function(f){ return (f.innerText||'').indexOf('PRUEBA Robot')>=0&&f.querySelector('button.hy-bt'); }).map(function(f){ return f.querySelector('button.hy-bt'); })${N ? `.sort(function(a,b){ return (b.getAttribute('onclick').indexOf("'${N}'")>=0)-(a.getAttribute('onclick').indexOf("'${N}'")>=0); })` : ''}[0]; })()`;
      if (!(await esperar(BT, 15000))) throw new Error('no hay ningún pedido PRUEBA para entregar en Hoy');
      N = String((await ev(`(${BT}).getAttribute('onclick')`)).match(/'([^']+)'/)[1]);
      await tocar(BT, '«Entregado»');
      /* La base tiene que tenerlo entregado antes de cobrar (lo pide red_efectivo_directo). */
      const base = await esperar(`(async function(){ try{ var p=(await _fetchDashboardRetry(1)).pedidos||[]; var x=p.filter(function(y){return String(y.n)===${JSON.stringify(N)};})[0]; if(x&&x.es==='Entregado'){ renderDashboard(await _fetchDashboardRetry(1)); return true; } }catch(e){} return false; })()`, 20000);
      if (!base) throw new Error('la base no lo dio por entregado en 20 s');
      return '#' + N;
    });

    await paso('2 «Me pagó en efectivo» y Cobranza', async () => {
      await ev(`setMainTab('hoy'); renderCobHoy(); 1`);
      if (!(await esperar(enFila('.cb-fila', '.cb-bt:not(.sec)'), 10000))) {
        const dx = await ev(`JSON.stringify({deben:_redDeben().map(function(p){return p.n+':'+p.es+'/'+p.ep;}), palanca:_redEf.palanca, tarjeta:((document.querySelector('#pg-miportal #cb-card')||{}).innerText||'').replace(/\\s+/g,' ').slice(0,160)})`).catch((e) => e.message);
        throw new Error('el #' + N + ' no aparece en «Tus clientes que todavía no pagaron» · ' + dx);
      }
      await tocar(enFila('.cb-fila', '.cb-bt:not(.sec)'), '«Me pagó en efectivo»');
      if (!(await esperar(`!!document.getElementById('redCuadroOv')`, 4000))) throw new Error('no abrió el cuadro de cobro');
      await tocar(`document.querySelector('#redCuadroOv button[onclick^="redCuadroBil"]')`, 'billete «Justo»');
      await tocar(`document.getElementById('redCuadroOk')`, 'Guardar');
      MARCADO.ef = true;
      const ms = await cobranza(enCob('lo tiene PRUEBA'), 6000);
      met.portal_efectivo_en_cobranza_ms = ms;
      if (ms == null) {
        const dx = await ev(`JSON.stringify({aviso:((document.getElementById('redToastBox')||{}).innerText||'').slice(0,140), marcado:Object.keys(_redEf.mios)})`).catch((e) => e.message);
        await A.ev(`(typeof _rutManoSenal==='function'&&_rutManoSenal(), 1)`).catch(() => 0);
        const re = await cobranza(enCob('lo tiene PRUEBA'), 5000);
        throw new Error('Cobranza no lo mostró en 6 s (sin señal en vivo) · ' + (re != null ? 'releyendo a mano SÍ aparece: falta la señal' : 'ni releyendo a mano') + ' · portal: ' + dx);
      }
      if (ms > 2000) malos.push('«Me pagó en efectivo» tardó ' + ms + ' ms en verse en Cobranza (tope 2.000)');
      return 'en Cobranza en ' + ms + ' ms';
    });

    await paso('3 efectivo para Maleu', async () => {
      if (!(await esperar(`(function(){ var c=document.querySelector('#pg-miportal #cb-card'); return !!c&&(c.innerText||'').indexOf('Tenés de Maleu en efectivo')>=0; })()`, 5000))) throw new Error('Hoy no dice cuánto tiene de Maleu');
      if (!(await A.esperar(enCob('¿Recibiste los'), 4000))) throw new Error('Cobranza no le pregunta a Maleu si lo recibió');
      await tocar(enFila('.cb-fila', '.cb-des'), '«Deshacer» del efectivo');
      const ms = await cobranza(`!(${enCob('lo tiene PRUEBA')})`, 6000);
      if (ms == null) throw new Error('deshecho, pero Cobranza lo siguió mostrando 6 s');
      return 'Hoy lo muestra, Cobranza pregunta «¿Recibiste?», deshecho y se fue en ' + ms + ' ms';
    });

    await paso('2b «Me dijo que transfirió» y Cobranza', async () => {
      if (!(await esperar(enFila('.cb-fila', '.cb-bt.sec'), 8000))) throw new Error('no está el botón (¿falta la 839?)');
      await tocar(enFila('.cb-fila', '.cb-bt.sec'), '«Me dijo que transfirió»');
      MARCADO.tr = true;
      const ms = await cobranza(`(function(){ var c=document.getElementById('cobrosContent'); return !!c&&[].some.call(c.querySelectorAll('.cobro-red-avtr'),function(x){return x.closest('[data-cv]')&&(x.closest('[data-cv]').innerText||'').indexOf('PRUEBA')>=0;}); })()`, 6000);
      met.portal_aviso_tr_en_cobranza_ms = ms;
      if (ms == null) throw new Error('Cobranza no mostró el aviso en 6 s');
      if (ms > 2000) malos.push('«Me dijo que transfirió» tardó ' + ms + ' ms en verse en Cobranza (tope 2.000)');
      if (!(await esperar(enFila('.cb-fila', '.cb-des'), 5000))) throw new Error('el portal no lo muestra avisado');
      await tocar(enFila('.cb-fila', '.cb-des'), '«Deshacer» del aviso');
      return 'en Cobranza en ' + ms + ' ms, deshecho';
    });

    await paso('4 liquidación', async () => {
      await ev(`setMainTab('hoy'); window.scrollTo(0,0); 1`);
      const link = await ev(`!!document.querySelector('#pg-miportal #hoy-links .hy-link[onclick*="plata"]')`);
      await tocar(link ? `document.querySelector('#pg-miportal #hoy-links .hy-link[onclick*="plata"]')` : `document.querySelector('#pg-miportal .mtab[data-mtab="plata"]')`, link ? '«Tu liquidación»' : 'tab Plata');
      if (!(await esperar(`(function(){ var v=document.querySelector('#pg-miportal #mview-plata'); return !!v&&!v.classList.contains('hidden')&&(v.innerText||'').length>40; })()`, 5000))) throw new Error('Plata no se abrió');
      return link ? 'desde el renglón de Hoy' : 'sin liquidación: tab Plata';
    });

    await paso('5 cargar un pedido', async () => {
      await tocar(`document.querySelector('#pg-miportal .mtab-mas')`, '«+»');
      if (!(await esperar(`(function(){ var s=document.getElementById('redMasSheet'); return !!s&&s.style.display!=='none'; })()`, 3000))) throw new Error('el «+» no abrió nada');
      await tocar(`[].slice.call(document.querySelectorAll('#redMasSheet button')).filter(function(b){return /Lo cargo yo/.test(b.innerText);})[0]`, '«Lo cargo yo»');
      const ok = await esperar(`(function(){ var v=[].slice.call(document.querySelectorAll('#pg-miportal [id]')).filter(function(e){ return /nuevo/i.test(e.id)&&e.offsetParent&&(e.innerText||'').length>40; })[0]; return v?v.id:''; })()`, 5000);
      if (!ok) throw new Error('«Lo cargo yo» no abrió el formulario');
      /* No se carga de verdad (el autopedido lo prueba el paso anterior): se vuelve con «Volver». */
      await tocar(`document.querySelector('#pg-miportal #screen-nuevo .red-nuevo-volver')`, '«Volver» del pedido nuevo');
      if (!(await esperar(`(function(){ var d=document.querySelector('#pg-miportal #screen-dashboard'); return !!d&&!d.classList.contains('hidden'); })()`, 4000))) throw new Error('«Volver» no volvió al portal');
      return 'abrió el formulario y volvió';
    });

    await paso('6 ficha del cliente', async () => {
      await ev(`setMainTab('clientes'); 1`);
      await tocar(`[].slice.call(document.querySelectorAll('#pg-miportal #clientes-list .cliente-row')).filter(function(r){return (r.innerText||'').indexOf('PRUEBA Robot')>=0;})[0]`, 'cliente PRUEBA Robot');
      const t = await esperar(`(function(){ var o=document.getElementById('redCliOv'); return o&&(o.innerText||'').indexOf('Pedidos')>=0&&o.querySelector('.cf-est')?(o.innerText||'').replace(/\\s+/g,' ').slice(0,80):''; })()`, 4000);
      if (!t) throw new Error('tocar al cliente no abrió su ficha con pedidos y estado de pago');
      await tocar(`document.querySelector('#redCliOv .cf-cerrar')`, 'cerrar la ficha');
      return 'abrió con pedidos y estado de pago';
    });

    await paso('7 a quién escribirle', async () => {
      await ev(`setMainTab('hoy'); window.scrollTo(0,0); 1`);
      const link = await ev(`!!document.querySelector('#pg-miportal #hoy-links .hy-link[onclick*="clientes"]')`);
      await tocar(link ? `document.querySelector('#pg-miportal #hoy-links .hy-link[onclick*="clientes"]')` : `document.querySelector('#pg-miportal .mtab[data-mtab="clientes"]')`, link ? '«clientes para escribirles»' : 'tab Clientes');
      if (!(await esperar(`(function(){ var a=document.querySelector('#pg-miportal #obj-card'), b=document.querySelector('#pg-miportal #tareas-card'); return (!!a&&!a.classList.contains('hidden'))||(!!b&&!b.classList.contains('hidden')); })()`, 5000))) throw new Error('Clientes no muestra a quién escribirle');
      return link ? 'desde el renglón de Hoy' : 'tab Clientes';
    });
    const ancho = await ev(`document.documentElement.scrollWidth`).catch(() => 0);
    if (ancho > 393) malos.push('la página mide ' + ancho + ' px de ancho a 393 (scroll horizontal)');
  } catch (e) {
    malos.push(e.message);
  } finally {
    /* Lo que marcó se deshace SIEMPRE, aunque un paso haya cortado antes de su «Deshacer» (con la base, como él). */
    if (N && (MARCADO.ef || MARCADO.tr)) {
      try {
        const r = await ev(`(async function(){ var o={}; try{ o.ef=await _redEfRpc('red_efectivo_directo',{p:{action:'redEfectivoDeshacer',n:${JSON.stringify(N)}}}); }catch(e){ o.ef=String(e.message); }
          try{ o.tr=await _redEfRpc('red_aviso_tr_directo',{p:{action:'redTrAvisoDeshacer',n:${JSON.stringify(N)}}}); }catch(e){ o.tr=String(e.message); } return JSON.stringify(o); })()`, 15000);
        hechos.push('al final se deshizo lo marcado: ' + String(r).slice(0, 160));
      } catch (e) { malos.push('no se pudo deshacer lo marcado del #' + N + ': ' + e.message); }
    }
    try { cli.matar(); } catch (e) {}
  }
  return { ok: !malos.length, detalle: hechos.join(' · ') + (malos.length ? ' · MAL: ' + malos.join(' | ') : ''), metricas: met };
};
