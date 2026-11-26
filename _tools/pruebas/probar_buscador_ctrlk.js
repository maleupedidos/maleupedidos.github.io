/* EL BUSCADOR CTRL K: PANTALLAS, SUB-TABS, ACCIONES RÁPIDAS, RECIENTES Y PERMISOS (11/11/2026).
     SBSES=<sbses.json> node _tools/pruebas/probar_buscador_ctrlk.js <token> [ancho]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado (la versión vieja da rojos)
   Sesión real, POST cortados. Todo por TECLADO (Ctrl K, tipear, flechas, Enter), que es como se usa.
   Sostiene:
     · vacío: «Acciones rápidas» y «Pantallas», y Pantallas = las tabs que el menú le muestra a este usuario;
     · cada fila tiene su ruta a la derecha («Productos › Conteo»);
     · «conteo» + Enter abre Productos en la sub-tab Conteo (lo mide en el DOM, no en una variable);
     · «nuevo pedido» + Enter abre Ruta en + Pedido (sub-app: la función aparece recién al abrirla);
     · después, «Recientes» arriba con lo último que se abrió;
     · ↓ mueve la selección;
     · PERMISOS: con Caja oculta para el rol, no aparece ni Caja ni «Guardé $X», «Nuevo gasto», «Arqueo». */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const [TOKEN, ANCHO_S] = process.argv.slice(2);
const ANCHO = Number(ANCHO_S || 1440);
const URL = process.env.BASE_URL || 'http://localhost:8080/app.html';
if (!TOKEN) { console.error('falta el token'); process.exit(2); }
const PREP = require('./sesion_prep.js')(TOKEN);
const SBSES = require('./sbses_guarda.js')(process.env.SBSES, process.env.USUARIO || 'tadeo');
let ok = 0, mal = 0;
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra) : ''); } };

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES + ";try{localStorage.removeItem('maleu_cmd_recientes')}catch(e){}" });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  const tecla = async (key, code, mods) => {
    const base = { key, code, windowsVirtualKeyCode: { Enter: 13, ArrowDown: 40, Escape: 27, k: 75 }[key] || 0, modifiers: mods || 0 };
    await cli.enviar('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, base));
    await cli.enviar('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
  };
  const tipear = async (txt) => { await evaluar(cli, `(function(){var i=document.getElementById('cmdInput');i.value='';i.dispatchEvent(new Event('input'))})()`); await cli.enviar('Input.insertText', { text: txt }); await T(250); };
  const abrirCtrlK = async () => { await evaluar(cli, 'document.activeElement&&document.activeElement.blur&&document.activeElement.blur()'); await tecla('k', 'KeyK', 2); await T(400); };
  const lista = () => evaluar(cli, `(function(){var out=[],sec='';[].slice.call(document.querySelectorAll('#cmdList > *')).forEach(function(e){
      if(e.classList.contains('cmd-section'))sec=e.textContent.trim();
      else if(e.classList.contains('cmd-item'))out.push({sec:sec,t:(e.querySelector('.cmd-item-l b')||{}).textContent,ruta:(e.querySelector('.cmd-ruta')||{}).textContent||'',sel:e.classList.contains('sel')});});return out;})()`);

  /* 1. Vacío */
  await abrirCtrlK();
  chk(await evaluar(cli, "document.getElementById('cmdBg').classList.contains('on')"), 'Ctrl K abre el buscador');
  let L = await lista();
  const tabsMenu = await evaluar(cli, "[].slice.call(document.querySelectorAll('.snav .bn[data-p]')).filter(function(b){return !b.classList.contains('role-hidden')}).length");
  const pant = L.filter((x) => x.sec === 'Pantallas');
  chk(pant.length === tabsMenu && tabsMenu > 9, `Pantallas = tabs del menú (${pant.length} de ${tabsMenu}; antes eran 9)`, pant.map((x) => x.t));
  chk(L.some((x) => x.sec === 'Acciones rápidas' && x.t === 'Nuevo pedido' && /Ruta\s*›\s*\+ Pedido/.test(x.ruta)), 'acción «Nuevo pedido» con su ruta «Ruta › + Pedido»', L.filter((x) => x.sec === 'Acciones rápidas'));
  chk(pant.every((x) => /›/.test(x.ruta)), 'cada pantalla dice su sección («Operaciones › Caja»)', pant.slice(0, 3));
  chk(!L.some((x) => x.sec === 'Recientes'), 'sin recientes la primera vez');

  /* 2. Flechas */
  const s0 = L.findIndex((x) => x.sel);
  await tecla('ArrowDown', 'ArrowDown'); await T(150);
  const s1 = (await lista()).findIndex((x) => x.sel);
  chk(s0 === 0 && s1 === 1, '↓ baja la selección', [s0, s1]);

  /* 3. Sub-tab por teclado */
  await tipear('conteo');
  L = await lista();
  chk(L[0] && L[0].sec === 'Secciones' && /Productos\s*›\s*Conteo/.test(L[0].ruta), '«conteo» encuentra Productos › Conteo', L.slice(0, 3));
  await tecla('Enter', 'Enter'); await T(3500);
  const enConteo = await evaluar(cli, `(function(){var pg=document.getElementById('p-stock');if(!pg||!pg.classList.contains('on'))return 'no esta en Productos';
     var b=[].slice.call(pg.querySelectorAll('button')).filter(function(x){return /stSwitchTab\\('contar'\\)/.test(x.getAttribute('onclick')||'')})[0];
     return b?(b.classList.contains('on')||b.classList.contains('active')||b.getAttribute('aria-selected')==='true'):'sin boton CONTEO'})()`);
  chk(enConteo === true, 'Enter abre Productos en la sub-tab CONTEO', enConteo);

  /* 4. Acción rápida en una sub-app */
  await abrirCtrlK(); await tipear('nuevo pedido');
  L = await lista();
  chk(L[0] && L[0].t === 'Nuevo pedido', '«nuevo pedido» trae la acción primero', L.slice(0, 2));
  await tecla('Enter', 'Enter'); await T(9000);
  const enNuevo = await evaluar(cli, `(function(){var pg=document.getElementById('p-ruta');if(!pg||!pg.classList.contains('on'))return 'no esta en Ruta';
     var v=document.getElementById('nuevoView')||pg.querySelector('[id$="uevoView"]');if(!v)return 'sin vista nuevo';
     var cs=getComputedStyle(v);return cs.display!=='none'&&v.getBoundingClientRect().height>50})()`);
  chk(enNuevo === true, 'Enter abre Ruta › + Pedido (la vista del pedido nuevo se ve)', enNuevo);

  /* 5. Recientes */
  await abrirCtrlK();
  L = await lista();
  const rec = L.filter((x) => x.sec === 'Recientes').map((x) => x.t);
  chk(rec[0] === 'Nuevo pedido' && rec[1] === 'Conteo', 'Recientes arriba, lo último primero', rec);
  chk(L[0] && L[0].sec === 'Recientes', 'Recientes es el primer bloque', L[0]);
  await tecla('Escape', 'Escape'); await T(200);
  chk(await evaluar(cli, "!document.getElementById('cmdBg').classList.contains('on')"), 'Esc cierra');

  /* 6. Permisos: Caja oculta para este rol */
  await evaluar(cli, "document.querySelector('.snav .bn[data-p=\"caja\"]').classList.add('role-hidden')");
  await abrirCtrlK(); await tipear('caja');
  L = await lista();
  chk(!L.some((x) => /^(Caja|Guardé|Nuevo gasto|Nuevo ingreso|Arqueo)/.test(x.t)), 'sin la tab Caja no aparece ni Caja ni sus acciones', L.map((x) => x.t));
  await tipear('');
  L = await lista();
  chk(!L.some((x) => x.t === 'Arqueo de caja') && L.some((x) => x.t === 'Nuevo pedido'), 'las acciones de las tabs que sí tiene siguen', L.filter((x) => x.sec === 'Acciones rápidas').map((x) => x.t));
  await evaluar(cli, "document.querySelector('.snav .bn[data-p=\"caja\"]').classList.remove('role-hidden')");

  /* 7. Ancho: la ruta no empuja el nombre fuera de la fila */
  await tipear('');
  const desb = await evaluar(cli, "[].slice.call(document.querySelectorAll('#cmdList .cmd-item')).filter(function(e){return e.scrollWidth>e.clientWidth+2}).length");
  chk(desb === 0, 'ninguna fila desborda a ' + ANCHO + 'px', desb);

  const errores = await evaluar(cli, 'window.__err||[]');
  chk(!errores || !errores.length, 'sin errores en la consola', errores);
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
