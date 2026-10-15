/* «Descargar el auto»: lo que el proveedor todavia no entrego, en rojo (15/10/2026).

   node _tools/pruebas/probar_descarga_sin_entregar.js [390|1440]

   El jueves 15/10 la card mostraba 65 unidades que se buscaban el viernes, y
   un toque de distraido en «Descargué todo» las daba por recibidas. El backend
   ya no las lista (estancias/_tools/probar_descarga_auto.js, bloque 12); esto
   mide el FRONT con la respuesta nueva:
     · la nota de abajo nombra lo de otro dia, lo pedido sin dia y lo sin pedir;
     · lo que SI esta en la card y el proveedor no figura entregado sale en rojo;
     · «Descargué todo» abre un cuadro con el bloque rojo y NO manda nada hasta
       el «Sí, las tengo»; «No» no manda nada;
     · sin nada sin entregar, sigue el confirm de siempre (control).

   Sin sesion ni produccion: `npm run dev` + `?prueba=1` + backend stubbeado.
   Repo publico: los nombres son inventados. */
'use strict';
const { abrir, evaluar } = require('./cdp.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = process.env.BASE || 'http://localhost:8080';
const ANCHO = Number(process.argv[2]) || 390;
let ok = 0, mal = 0;
const VER = '\x1b[32m', ROJO = '\x1b[31m', RST = '\x1b[0m';
const chk = (t, c, d) => {
  if (c === true) { ok++; console.log('  ' + VER + 'ok ' + RST + t); }
  else { mal++; console.log('  ' + ROJO + 'MAL' + RST + ' ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 220) : '')); }
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const hoy = new Date();
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const man = new Date(hoy.getTime() + 86400000);

function resp(conSinEntregar) {
  return {
    ok: true, desde: '01/10/2026', totalRows: 2, sinRecibir: 1, dia: iso(hoy),
    deposito: [
      { abbr: 'TG', prod: 'Tortas — Golosa', qty: 4, rows: [40], qtys: [4], proveedor: 'Proveedor C',
        recs: [conSinEntregar ? 0 : 1], fRecs: [conSinEntregar ? '' : iso(hoy)], mueve: [1], sinRecibir: conSinEntregar ? 1 : 0 },
      { abbr: 'PPM', prod: 'Pack Pizzas x2 — Muzzarella', qty: 3, rows: [44], qtys: [3], proveedor: 'Proveedor A',
        recs: [1], fRecs: [iso(hoy)], mueve: [1], sinRecibir: 0 },
    ],
    pedidos: [],
    masTarde: [{ proveedor: 'Proveedor A', fecha: iso(man), unidades: 30 }],
    sinDia: [{ proveedor: 'Proveedor B', unidades: 20 }],
    sinPedir: [{ proveedor: 'Proveedor D', unidades: 8 }],
    sinEntregar: conSinEntregar ? [{ proveedor: 'Proveedor C', fecha: iso(hoy), unidades: 4 }] : [],
    atrasado: { filas: 0, unidades: 0, desde: '' },
  };
}

async function correr(conSinEntregar) {
  const cli = await abrir();
  await cli.enviar('Runtime.enable');
  await cli.enviar('Page.enable');
  await cli.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 860, deviceScaleFactor: 1, mobile: ANCHO < 600 });
  const errores = [];
  cli.escuchar((m, p) => {
    if (m === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails || {};
      errores.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
    }
  });
  await cli.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__RESP = ${JSON.stringify(resp(conSinEntregar))};
    window.__posts = [];
    (function(){
      var real = window.fetch;
      window.fetch = function(u, o){
        var s = String(u);
        if (o && o.method === 'POST') {
          try { window.__posts.push(JSON.parse(o.body)); } catch(e) { window.__posts.push({crudo:String(o.body)}); }
          return Promise.resolve(new Response(JSON.stringify({ok:true,n:2}), {headers:{'Content-Type':'application/json'}}));
        }
        if (s.indexOf('pendientesGuardarStock') >= 0)
          return Promise.resolve(new Response(JSON.stringify(window.__RESP), {headers:{'Content-Type':'application/json'}}));
        if (s.indexOf('script.google.com') >= 0)
          return Promise.resolve(new Response(JSON.stringify({ok:true,rows:[],pedidos:[],items:[]}), {headers:{'Content-Type':'application/json'}}));
        return real.apply(this, arguments);
      };
      /* servir.js (?prueba=1) tambien pisa window.confirm, con uno que devuelve
         false salvo __confirmDevuelve, y anota en __confirms. Cual gana depende
         del orden de inyeccion: se cubren los dos. */
      window.__confirmDevuelve = true;
      window.confirm = function(m){ window.__confirm = m; return true; };
    })();
  ` });
  await cli.enviar('Page.navigate', { url: BASE + '/app.html?prueba=1' });
  let listo = false;
  for (let i = 0; i < 90 && !listo; i++) { await esperar(300); listo = await evaluar(cli, "typeof window._SUBAPP_ruta==='function'").catch(() => false); }
  await evaluar(cli, `typeof go==='function' && go('ruta')`).catch(() => {});
  let fn = false;
  for (let i = 0; i < 40 && !fn; i++) {
    await esperar(300);
    fn = await evaluar(cli, `typeof confirmarGuardadoStock==='function'`).catch(() => false);
    if (!fn && i === 6) await evaluar(cli, `window._SUBAPP_ruta && window._SUBAPP_ruta()`).catch(() => {});
  }
  await evaluar(cli, `switchTab('ruta')`).catch(() => {});
  await esperar(400);
  await evaluar(cli, `fetchPendientesGuardarStock(true)`).catch(() => {});
  await esperar(2000);
  await evaluar(cli, `rutRender()`).catch(() => {});
  await esperar(600);
  return { cli, errores };
}

(async () => {
  console.log('\n══ Descargar el auto: lo que el proveedor no entrego (' + ANCHO + 'px) ══\n');

  // ── 1. con algo sin entregar ──
  {
    const { cli, errores } = await correr(true);
    const texto = await evaluar(cli, `(document.getElementById('p-ruta')||document.body).innerText||''`);
    chk('la card se dibuja', texto.indexOf('Descargar el auto') >= 0, texto.slice(0, 200));
    chk('nombra lo que se busca otro dia (Proveedor A, 30 u)', /Se busca otro d[ií]a:[\s\S]*Proveedor A \(30 u/.test(texto));
    chk('nombra lo pedido sin dia (Proveedor B, 20 u)', /sin d[ií]a de b[uú]squeda[\s\S]*Proveedor B \(20 u\)/i.test(texto));
    chk('nombra lo sin pedir (Proveedor D, 8 u)', /sin pedir al proveedor:[\s\S]*Proveedor D \(8 u\)/i.test(texto));
    const rojo = await evaluar(cli, `(function(){var e=document.querySelector('.rtc-nota.rtc-rojo');if(!e)return null;
      var r=e.getBoundingClientRect();return {t:e.innerText,c:getComputedStyle(e).color,w:r.width,sw:e.scrollWidth,cw:e.clientWidth};})()`);
    chk('la card tiene el bloque rojo con lo sin entregar', !!rojo && /4 u todav[ií]a no figuran/.test(rojo.t) && /Proveedor C/.test(rojo.t), rojo);
    chk('y es rojo de verdad', !!rojo && rojo.c === 'rgb(198, 40, 40)', rojo && rojo.c);
    chk('y no desborda', !!rojo && rojo.sw <= rojo.cw + 1, rojo);

    // tocar "Descargué todo" con el dedo (el boton de verdad, no la funcion)
    const toco = await evaluar(cli, `(function(){var b=[].slice.call(document.querySelectorAll('.rtc-cta.dep')).filter(function(x){return x.offsetParent;})[0];
      if(!b)return 'sin boton';b.click();return 'ok';})()`);
    chk('se toca «Descargué todo»', toco === 'ok', toco);
    await esperar(300);
    const cuadro = await evaluar(cli, `(function(){var o=document.getElementById('confirmOverlay');if(!o||o.classList.contains('hidden'))return null;
      var r=o.querySelector('.rdep-rojo');var b=o.querySelector('.confirm-box').getBoundingClientRect();
      return {t:o.innerText, rojo:r?getComputedStyle(r).color:'', alto:b.height, top:b.top, bottom:b.bottom, vh:innerHeight};})()`);
    chk('abre el cuadro propio, no el confirm del navegador', !!cuadro, cuadro);
    chk('dice en rojo cuantas unidades son de un proveedor que no entrego',
      !!cuadro && cuadro.rojo === 'rgb(198, 40, 40)' && /4 unidades son de un proveedor que todav[ií]a no te entreg[oó]/.test(cuadro.t), cuadro);
    chk('y sigue diciendo que suma el stock y habilita el pago', !!cuadro && /habilita el pago/.test(cuadro.t), cuadro && cuadro.t);
    chk('el cuadro entra en la pantalla', !!cuadro && cuadro.top >= 0 && cuadro.bottom <= cuadro.vh + 1, cuadro);
    chk('todavia no mando nada', (await evaluar(cli, `window.__posts.length`)) === 0);
    chk('y no uso el confirm del navegador', (await evaluar(cli, `window.__confirm===undefined && !(window.__confirms||[]).length`)) === true);

    const shot = await cli.enviar('Page.captureScreenshot', { format: 'png' });
    const f = path.join(os.tmpdir(), 'descarga_sin_entregar_' + ANCHO + '.png');
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
    console.log('     captura: ' + f);

    await evaluar(cli, `document.querySelector('#confirmOverlay .btn-no').click()`);
    await esperar(300);
    chk('«No» cierra sin mandar nada', (await evaluar(cli, `window.__posts.length`)) === 0
      && (await evaluar(cli, `document.getElementById('confirmOverlay').classList.contains('hidden')`)) === true);

    await evaluar(cli, `[].slice.call(document.querySelectorAll('.rtc-cta.dep')).filter(function(x){return x.offsetParent;})[0].click()`);
    await esperar(300);
    await evaluar(cli, `document.querySelector('#confirmOverlay .btn-si').click()`);
    await esperar(1200);
    const posts = await evaluar(cli, `JSON.stringify(window.__posts)`);
    chk('«Sí, las tengo» manda la descarga con sus filas', /"action":"marcarGuardadoEnStock"/.test(posts) && /"rows":\[40,44\]/.test(posts), posts);
    chk('sin errores de JS', errores.length === 0, errores);
    cli.matar();
  }

  // ── 2. control: nada sin entregar → el confirm de siempre ──
  {
    const { cli, errores } = await correr(false);
    chk('sin nada sin entregar, no hay bloque rojo', (await evaluar(cli, `document.querySelectorAll('.rtc-nota.rtc-rojo').length`)) === 0);
    const toco2 = await evaluar(cli, `(function(){window.__confirmDevuelve=true;var b=[].slice.call(document.querySelectorAll('.rtc-cta.dep')).filter(function(x){return x.offsetParent;})[0];
      if(!b)return 'sin boton';b.click();return 'ok';})()`);
    await esperar(1200);
    const est = await evaluar(cli, `JSON.stringify({c:typeof (window.__confirm||(window.__confirms||[])[0]), p:window.__posts, o:!document.getElementById('confirmOverlay').classList.contains('hidden')})`);
    chk('usa el confirm de siempre y manda', toco2 === 'ok' && /"c":"string"/.test(est) && /marcarGuardadoEnStock/.test(est), { toco2: toco2, est: est });
    chk('sin errores de JS', errores.length === 0, errores);
    cli.matar();
  }

  console.log('\n' + (mal === 0 ? VER + 'TODO EN VERDE' : ROJO + mal + ' MAL') + RST + '   (' + ok + ' ok)\n');
  process.exit(mal === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
