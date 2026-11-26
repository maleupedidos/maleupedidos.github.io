/* LA TAB PEDIDOS SIN SOBREINFORMACIÓN (11/11/2026): buscador arriba, filtros como en Dux, la Bandeja de Red en
   Representantes, sin «Actualizar pedidos».
     SBSES=<sbses.json> node _tools/pruebas/probar_pedidos_tab.js <token> [ancho]
     BASE_URL=https://app.maleu.com.ar/app.html  ← contra lo publicado (la v1058 da rojos)
   Con clics y teclas reales. Sostiene:
     · no está «Actualizar pedidos» y el «en vivo» sí, al lado del buscador;
     · dos grupos segmentados (canal y estado) con su cantidad, y el número que dice un botón es el de tarjetas que
       quedan al tocarlo (se mide con Pendiente, que son pocas);
     · el orden es un selector;
     · el buscador filtra mientras se tipea: por nombre, por N° de pedido y por teléfono;
     · Pedidos no muestra un bloque que diga «nada esperando», ni la Bandeja de Red; la Bandeja está en Representantes;
     · a 390 px: nada desborda y cada grupo entra en UNA fila. */
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
const sinT = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const chk = (c, m, extra) => { if (c === true) { ok++; console.log('  ok  ', m); } else { mal++; console.log('  MAL ', m, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };

(async () => {
  const cli = await abrir();
  await cli.enviar('Runtime.enable'); await cli.enviar('Page.enable');
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: PREP + SBSES });
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ANCHO < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: ANCHO < 700 });
  await cli.enviar('Page.navigate', { url: URL });
  await T(12000);
  await evaluar(cli, "fC='Todos';fE='Todos';go('pedidos')"); await T(9000);
  const tocar = async (expr) => {
    const c = await evaluar(cli, `(function(){var e=${expr};if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return r.width?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`);
    if (!c) return false;
    for (const type of ['mousePressed', 'mouseReleased']) await cli.enviar('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: 'left', clickCount: 1 });
    await T(700); return true;
  };
  const estado = () => evaluar(cli, `(function(){var pg=document.getElementById('p-pedidos');
    var segs=[].slice.call(pg.querySelectorAll('#fRow .ped-seg')).map(function(g){return [].slice.call(g.querySelectorAll('button')).map(function(b){var r=b.getBoundingClientRect();
      return {t:b.firstChild.textContent.trim(),n:+(b.querySelector('.ped-seg-n')||{}).textContent,on:b.classList.contains('on'),y:Math.round(r.top),h:Math.round(r.height)};});});
    var cards=[].slice.call(pg.querySelectorAll('#pList .pc')).filter(function(c){return c.getBoundingClientRect().height>0});
    return {reload:!!pg.querySelector('#btnReloadPed'),vivo:!!pg.querySelector('.ped-top #pedEnVivo'),busq:!!pg.querySelector('#pedBusq')&&!pg.querySelector('#pedBusqBox').hidden,
      segs:segs,orden:!!pg.querySelector('#fRow select.ped-orden'),cards:cards.length,nombres:cards.slice(0,6).map(function(c){return (c.querySelector('.pc-c')||c).textContent.trim().slice(0,30)}),
      nada:/nada esperando/i.test(pg.innerText),bandeja:/Bandeja de Red/.test(pg.innerText),desb:document.documentElement.scrollWidth-document.documentElement.clientWidth};})()`);

  let e = await estado();
  chk(e.reload === false && e.vivo === true, 'sin «Actualizar pedidos»; el «en vivo» al lado del buscador', e);
  chk(e.busq === true, 'el buscador de cliente está arriba (admin)');
  chk(e.segs.length === 2 && e.segs[0].map((b) => b.t).join(',') === 'Todos,Home,Pilar,Clubes,Red' && e.segs[1].map((b) => b.t).join(',') === 'Pendiente,Entregado,Cancelado', 'dos grupos: canal y estado', e.segs);
  chk(e.segs.flat().every((b) => Number.isFinite(b.n)), 'cada botón dice su cantidad');
  chk(e.orden === true, 'el orden es un selector');
  chk(e.nada === false && e.bandeja === false, 'Pedidos no muestra «nada esperando» ni la Bandeja de Red', { nada: e.nada, bandeja: e.bandeja });
  chk(e.segs.every((g) => g.every((b) => b.y === g[0].y)) && e.segs.flat().every((b) => b.h <= 40), `cada grupo entra en una fila a ${ANCHO}px`, e.segs);
  chk(e.desb <= 0, `nada desborda a ${ANCHO}px (${e.desb})`);

  /* El número del botón = las tarjetas que quedan. */
  const nPend = e.segs[1][0].n;
  await tocar("[].slice.call(document.querySelectorAll('#fRow .ped-seg')[1].querySelectorAll('button'))[0]");
  e = await estado();
  chk(e.segs[1][0].on === true && e.cards === nPend, `«Pendiente ${nPend}» deja ${e.cards} tarjetas`, e.nombres);
  await tocar("[].slice.call(document.querySelectorAll('#fRow .ped-seg')[1].querySelectorAll('button'))[0]");
  e = await estado();
  chk(e.segs[1][0].on === false, 'tocar Pendiente de nuevo lo suelta');

  /* El buscador, tipeando. */
  const tipear = async (t) => {
    await evaluar(cli, "(function(){var i=document.getElementById('pedBusq');i.value='';i.focus();pedBuscar('',true);})()"); await T(300);
    await cli.enviar('Input.insertText', { text: t }); await T(700);
  };
  const ref = await evaluar(cli, "(function(){var p=(D.pedidos||[]).filter(function(x){return x.c&&x.$>0&&!x.hist&&String(x.tel||'').replace(/\\D/g,'').length>=8})[0];return p?{c:p.c,n:String(p.n),tel:String(p.tel).replace(/\\D/g,'')}:null})()");
  await tipear(ref.c.split(' ')[0].toLowerCase());
  e = await estado();
  chk(e.cards > 0 && e.nombres.every((x) => sinT(x).indexOf(sinT(ref.c.split(' ')[0])) >= 0), `por nombre «${ref.c.split(' ')[0]}»: ${e.cards} tarjetas, todas de ese nombre`, e.nombres);
  await tipear(ref.n);
  e = await estado();
  chk(e.cards >= 1 && e.nombres.some((x) => x.indexOf(ref.c.slice(0, 12)) >= 0), `por N° «${ref.n}»: aparece ${ref.c}`, e.nombres);
  await tipear(ref.tel.slice(-7));
  e = await estado();
  chk(e.cards >= 1 && e.nombres.some((x) => x.indexOf(ref.c.slice(0, 12)) >= 0), `por teléfono «…${ref.tel.slice(-7)}»: aparece ${ref.c}`, e.nombres);
  await tipear('zzqx nadie');
  e = await estado();
  chk(e.cards === 0, 'sin coincidencias, la lista queda vacía y lo dice');
  await evaluar(cli, "pedBuscar('',true)"); await T(500);

  /* La Bandeja de Red, en Representantes. */
  await evaluar(cli, "go('miportal')");
  let red = false; for (let i = 0; i < 20 && !red; i++) { await T(700); red = await evaluar(cli, "/Bandeja de Red/.test((document.getElementById('rbBoxRed')||{}).innerText||'')"); }
  chk(red === true, 'la Bandeja de Red está en Representantes');

  const err = (await evaluar(cli, 'window.__err||[]')).filter((x) => !/ResizeObserver loop/.test(x));
  chk(!err.length, 'sin errores en la consola', err);
  console.log(`\n${ok} ok · ${mal} mal`);
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
